import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

const dshHome = await mkdtemp('/tmp/aezy-m2-dsh-home-')
const repository = await mkdtemp('/tmp/aezy-m2-repository-')
process.env.DSH_HOME = dshHome
process.env.TMPDIR = '/tmp'
process.env.TMP = '/tmp'
process.env.TEMP = '/tmp'

const { profileName, spawnDsh } = await import('./lib/profile.mjs')
await import('./sync-profile.mjs')

const port = await new Promise((resolve, reject) => {
  const probe = createServer()
  probe.once('error', reject)
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address()
    const selected = typeof address === 'object' && address ? address.port : 0
    probe.close(error => error ? reject(error) : resolve(selected))
  })
})
const baseUrl = `http://127.0.0.1:${port}`

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'X-Aezy-Client': 'web', ...options.headers },
    signal: AbortSignal.timeout(10000),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(`${response.status}: ${body.error}`)
  return body
}

function post(path, body) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function start() {
  const child = spawnDsh(['--profile', profileName, '--host', '127.0.0.1', '--port', String(port), '--no-open'])
  let output = ''
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`M2 host startup timed out\n${output}`)), 120000)
    const append = chunk => {
      output += chunk.toString()
      if (output.includes('dsh web:')) {
        clearTimeout(timer)
        resolve()
      }
    }
    child.stdout.on('data', append)
    child.stderr.on('data', append)
    child.once('exit', code => {
      clearTimeout(timer)
      reject(new Error(`M2 host exited during startup with ${code}\n${output}`))
    })
  })
  return child
}

async function stop(child) {
  child.kill('SIGTERM')
  if (child.exitCode !== null) return
  await new Promise(resolve => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve() }, 10000)
    child.once('exit', () => { clearTimeout(timer); resolve() })
  })
}

let child
try {
  child = await start()
  const cwd = repository
  const initial = await request(`/aezy/api/security?${new URLSearchParams({ cwd })}`)
  assert.equal(initial.network.default, 'ask')
  assert.equal(initial.network.repositoryOverride, null)

  await post('/aezy/api/security/network', { cwd, scope: 'repository', mode: 'deny' })
  const deny = await post('/aezy/api/security/explain', {
    cwd, tool: 'bash', arguments: { command: 'curl https://example.com' },
  })
  assert.equal(deny.action.network, 'required')
  assert.equal(deny.verdict.decision, 'deny')

  const created = await post('/aezy/api/security/rules', {
    cwd, scope: 'repository', effect: 'allow', tool: 'bash', commandPrefix: 'curl',
  })
  const ruleId = created.rule.id
  assert.equal((await post('/aezy/api/security/explain', {
    cwd, tool: 'bash', arguments: { command: 'curl https://example.com' },
  })).verdict.decision, 'deny', 'Network deny must outrank an allow rule')

  await post('/aezy/api/security/network', { cwd, scope: 'repository', mode: 'ask' })
  assert.equal((await post('/aezy/api/security/explain', {
    cwd, tool: 'bash', arguments: { command: 'curl https://example.com' },
  })).verdict.decision, 'allow')
  assert.equal((await post('/aezy/api/security/explain', {
    cwd, tool: 'bash', arguments: { command: 'curl https://example.com && sh payload' },
  })).verdict.decision, 'ask', 'allow prefix must not authorize a shell chain')

  const fenced = await fetch(`${baseUrl}/aezy/api/security?${new URLSearchParams({ cwd })}`)
  assert.equal(fenced.status, 403)

  await stop(child)
  child = undefined
  child = await start()
  const resumed = await request(`/aezy/api/security?${new URLSearchParams({ cwd })}`)
  assert.equal(resumed.network.repositoryOverride, 'ask')
  assert.equal(resumed.rules.some(rule => rule.id === ruleId), true)

  await post('/aezy/api/security/rules/delete', { cwd, id: ruleId })
  await post('/aezy/api/security/network/clear', { cwd })
  const cleared = await request(`/aezy/api/security?${new URLSearchParams({ cwd })}`)
  assert.equal(cleared.network.repositoryOverride, null)
  assert.equal(cleared.rules.length, 0)

  const policyFile = join(dshHome, 'aezy', 'security.json')
  assert.equal(existsSync(policyFile), true)
  assert.equal((await stat(policyFile)).mode & 0o777, 0o600)
  const stored = JSON.parse(await readFile(policyFile, 'utf8'))
  assert.equal(stored.version, 1)
  process.stdout.write('M2 real rc.1 HTTP policy, precedence, request fence, and restart persistence passed.\n')
} finally {
  if (child !== undefined) await stop(child)
  await rm(dshHome, { recursive: true, force: true })
  await rm(repository, { recursive: true, force: true })
}
