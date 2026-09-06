import assert from 'node:assert/strict'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { alphaDshHome, alphaProfileName, runAlphaDsh } from './lib/alpha-runtime.mjs'

// No model Turn, credential read, or personal OpenCodex API request. The normal
// DSH owner resolves the existing DeepSeek key for its own managed gateway.
const credentialFile = join(alphaDshHome, '.credentials.yaml')
const before = await stat(credentialFile).catch(() => null)
let url, output = ''
const child = runAlphaDsh(['--profile', alphaProfileName, '--host', '127.0.0.1', '--port', process.env.AEZY_OPENCODEX_SMOKE_PORT ?? '3091', '--no-open'], { stdio: ['ignore', 'pipe', 'pipe'] })
const exited = new Promise(resolve => child.once('exit', resolve))
const safe = text => text.replace(/([?&]token=)[^\s)]+/g, '$1[redacted]')
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => {
  const text = data.toString()
  url ||= text.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s)]+)/)?.[1]
  output = (output + safe(text)).slice(-8000)
})
try {
  const deadline = Date.now() + 90_000
  while (!url && Date.now() < deadline && child.exitCode === null) await new Promise(resolve => setTimeout(resolve, 200))
  assert.ok(url, `Host did not start: ${output}`)
  const bootstrap = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) })
  assert.equal(bootstrap.status, 303)
  const cookie = bootstrap.headers.get('set-cookie').split(';', 1)[0]
  const base = new URL(url).origin
  const index = await fetch(base, { headers: { Cookie: cookie } })
  assert.equal(index.status, 200)
  const html = await index.text()
  assert.ok(html.includes('"id":"@aezy/codex"'))
  let result
  while (Date.now() < deadline) {
    result = await (await fetch(`${base}/aezy/api/codex`, { headers: { Cookie: cookie, 'X-Aezy-Client': 'web' } })).json()
    if (result.error) throw new Error(result.error)
    if (result.connection.state === 'connected') break
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  assert.equal(result.connection.state, 'connected')
  assert.equal(result.runtime.owner, 'aezy')
  assert.equal(result.runtime.provider, 'aezy-opencodex')
  assert.equal(result.runtime.gateway.version, 'aezy-responses-v1')
  assert.equal(new URL(result.runtime.gateway.endpoint).hostname, '127.0.0.1')
  assert.equal(result.account.requiresOpenaiAuth, false)
  assert.ok(result.models.some(row => row.id === 'deepseek/deepseek-v4-flash'))
  assert.ok(result.models.every(row => row.id.startsWith('deepseek/')))
  assert.notEqual(new URL(result.runtime.gateway.endpoint).port, '10100')
  const after = await stat(credentialFile).catch(() => null)
  assert.equal(after?.mtimeMs, before?.mtimeMs, 'smoke must not modify the DSH credential document')
  console.log(JSON.stringify({ profile: alphaProfileName, dshHome: alphaDshHome, host: base, connection: result.connection.state, runtime: result.runtime, models: result.models.map(row => row.id), credentialFileUnchanged: true, web: true, paidModelCalls: 0 }, null, 2))
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM')
    const timeout = setTimeout(() => child.kill('SIGKILL'), 15_000)
    await exited
    clearTimeout(timeout)
  }
}
