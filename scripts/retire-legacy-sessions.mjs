import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstat, mkdir, mkdtemp, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { alphaDshHome, alphaProfileName, runAlphaDsh } from './lib/alpha-runtime.mjs'
import { isRetiredPreset } from '../packages/aezy-mode/src/preset-policy.js'

// One-time retirement, not a Session storage implementation. Identify from
// durable preset facts, never titles/ID prefixes; move exact directories to a
// recoverable quarantine after the DSH owner archives them and stops.
export const retiredPreset = isRetiredPreset
export function sessionIdentity(records) {
  const header = records[0]
  assert.equal(header?.type, 'session')
  let preset = header.agentPreset
  for (const row of records) if (row.type === 'agent-preset/selected') preset = row.data.agentPreset
  return { sessionId: header.id, preset, cwd: header.cwd }
}
const digest = data => createHash('sha256').update(data).digest('hex')
export async function inventory(home) {
  const root = join(home, 'sessions'), rows = []
  for (const workspace of await readdir(root, { withFileTypes: true })) {
    if (!workspace.isDirectory()) continue
    for (const session of await readdir(join(root, workspace.name), { withFileTypes: true })) {
      if (!session.isDirectory()) continue
      const directory = join(root, workspace.name, session.name)
      const file = join(directory, 'session.jsonl.zstd')
      if (!(await lstat(file)).isFile()) throw new Error(`Non-regular Session record: ${file}`)
      const bytes = await readFile(file)
      const records = execFileSync('zstd', ['-dc', file], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 })
        .trim().split('\n').map(JSON.parse)
      const identity = sessionIdentity(records)
      assert.equal(identity.sessionId, session.name)
      rows.push({ ...identity, directory, file, digest: digest(bytes) })
    }
  }
  return rows
}
async function main() {
  const before = await inventory(alphaDshHome)
  const targets = before.filter(row => retiredPreset(row.preset))
  console.log(JSON.stringify({ home: alphaDshHome, total: before.length, targets }, null, 2))
  if (!process.argv.includes('--apply')) return
  assert.ok(targets.length, 'Nothing to retire')
  // Caller must stop the working Host first. The managed gateway owner lock
  // rejects overlap; this script never removes locks or kills other processes.
  const child = runAlphaDsh(['--profile', alphaProfileName, '--host', '127.0.0.1', '--port', '3091', '--no-open'], { stdio: ['ignore', 'pipe', 'pipe'] })
  const exited = new Promise(resolve => child.once('exit', resolve))
  let url, log = '', sequence = 0
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => {
    const text = data.toString()
    url ||= text.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s)]+)/)?.[1]
    log = (log + text.replace(/([?&]token=)[^\s)]+/g, '$1[redacted]')).slice(-4000)
  })
  try {
    const deadline = Date.now() + 60000
    while (!url && child.exitCode === null && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100))
    assert.ok(url, log)
    const response = await fetch(url, { redirect: 'manual' })
    assert.equal(response.status, 303)
    const cookie = response.headers.get('set-cookie').split(';', 1)[0]
    const rpc = async (method, args) => {
      const response = await fetch(`${new URL(url).origin}/api/${method}`, { method: 'POST',
        headers: { Cookie: cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId: `retire-${++sequence}`, method, payload: { args } }),
        signal: AbortSignal.timeout(30000) })
      const envelope = await response.json()
      assert.equal(envelope.result?.ok, true, JSON.stringify(envelope.result?.error))
      return envelope.result.value
    }
    const sessions = (await rpc('session/list', { _request: {} })).items
    for (const target of targets) {
      const current = sessions.find(row => row.sessionId === target.sessionId)
      assert.ok(current && !current.running, `Refusing active or missing Session ${target.sessionId}`)
      assert.equal(current.projections.values.agentPreset, target.preset)
    }
    for (const target of targets) {
      await rpc('workspace/archiveSession', { request: { sessionId: target.sessionId } })
    }
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM')
      const timer = setTimeout(() => child.kill('SIGKILL'), 15000)
      await exited
      clearTimeout(timer)
    }
  }
  // Check every target before moving anything. No wildcard deletes and no
  // changes to OAuth, workspace files, Codex homes or unrelated Sessions.
  for (const target of targets) assert.equal(digest(await readFile(target.file)), target.digest)
  const archiveRoot = join(alphaDshHome, 'aezy', 'retired-sessions')
  await mkdir(archiveRoot, { recursive: true, mode: 0o700 })
  const archive = await mkdtemp(join(archiveRoot, '2026-09-08-'))
  await writeFile(join(archive, 'manifest.json'), JSON.stringify({ home: alphaDshHome, targets }, null, 2), { mode: 0o600 })
  for (const target of targets) {
    await rename(target.directory, join(archive, target.sessionId))
    const cache = join(alphaDshHome, 'storages/session_projcache/sessions', `${target.sessionId}.json`)
    const info = await lstat(cache).catch(error => { if (error.code !== 'ENOENT') throw error })
    if (info) {
      assert.ok(info.isFile())
      await rename(cache, join(archive, `${target.sessionId}.projection.json`))
    }
  }
  const after = await inventory(alphaDshHome)
  assert.ok(after.every(row => !retiredPreset(row.preset)))
  assert.deepEqual(after.map(row => [row.sessionId, row.digest]).sort(),
    before.filter(row => !retiredPreset(row.preset)).map(row => [row.sessionId, row.digest]).sort())
  console.log(JSON.stringify({ retired: targets.length, retained: after.length, archive, unrelatedSessionBytesUnchanged: true }, null, 2))
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main()
