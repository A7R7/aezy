import assert from 'node:assert/strict'
import { stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { alphaDshHome, alphaProfileName, runAlphaDsh } from './lib/alpha-runtime.mjs'
import { verifyAstraSelectionTurn } from './verify-astra-selection-turn.mjs'

// Default smoke makes no model Turn, credential read, or personal OpenCodex API
// request. An explicit opt-in verifies Astra via the already authenticated owner.
// DSH resolves the existing DeepSeek key for its own managed gateway.
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
  assert.equal(result.runtime.version, '0.153.4')
  assert.equal(result.runtime.provider, 'aezy-opencodex')
  assert.equal(result.runtime.gateway.version, 'aezy-responses-v1')
  assert.equal(new URL(result.runtime.gateway.endpoint).hostname, '127.0.0.1')
  assert.equal(result.account.requiresOpenaiAuth, false)
  assert.ok(result.models.some(row => row.id === 'deepseek/deepseek-v4-flash'))
  assert.ok(result.models.every(row => row.id.startsWith('deepseek/')))
  assert.notEqual(new URL(result.runtime.gateway.endpoint).port, '10100')
  let openai
  while (Date.now() < deadline) {
    openai = await (await fetch(`${base}/aezy/api/codex?route=openai`, { headers: { Cookie: cookie, 'X-Aezy-Client': 'web' } })).json()
    if (openai.error) throw new Error(openai.error)
    if (openai.connection.state === 'connected') break
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  assert.equal(openai.connection.state, 'connected')
  assert.equal(openai.runtime.provider, 'openai')
  assert.equal(openai.runtime.version, '0.153.4')
  assert.notEqual(openai.runtime.home, result.runtime.home)
  assert.equal(openai.account.requiresOpenaiAuth, true)
  assert.ok(openai.models.some(row => row.id.startsWith('gpt-')))
  assert.ok(openai.models.some(row => row.id === 'gpt-6-astra'))
  assert.ok(openai.models.every(row => !row.id.startsWith('deepseek/')))
  const catalogResponse = await fetch(`${base}/api/session/modelCatalog`, {
    method: 'POST', headers: { Cookie: cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'model-fixes-smoke', method: 'session/modelCatalog', payload: { args: {} } }),
  })
  const catalogEnvelope = await catalogResponse.json()
  assert.equal(catalogEnvelope.result?.ok, true)
  const nativeModels = catalogEnvelope.result.value.groups.find(group => group.id === 'openai-codex').models.map(model => model.id)
  assert.ok(nativeModels.includes('gpt-6-astra'))
  const codexModels = catalogEnvelope.result.value.groups.find(group => group.id === 'aezy-codex').models.map(model => model.id)
  assert.ok(codexModels.some(id => id.startsWith('gpt-')) && codexModels.some(id => id.startsWith('deepseek/')))
  assert.ok(codexModels.includes('gpt-6-astra'))
  let astraTurn = null
  if (process.env.AEZY_ASTRA_REAL_PROOF === '1') {
    assert.ok(openai.account.type, 'Aezy GPT must already be logged in; this proof does not import credentials')
    let sequence = 0
    const rpc = async (method, args) => {
      const response = await fetch(`${base}/api/${method}`, { method: 'POST',
        headers: { Cookie: cookie, 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId: `astra-${++sequence}`, method, payload: { args } }),
        signal: AbortSignal.timeout(30_000) })
      const envelope = await response.json()
      assert.equal(envelope.result?.ok, true, `${method}: ${JSON.stringify(envelope.result?.error)}`)
      return envelope.result.value
    }
    astraTurn = await verifyAstraSelectionTurn({ rpc, catalog: catalogEnvelope.result.value })
    if (process.env.AEZY_ASTRA_PROOF_RECEIPT) await writeFile(process.env.AEZY_ASTRA_PROOF_RECEIPT, `${JSON.stringify(astraTurn, null, 2)}\n`, { mode: 0o600 })
  }
  const after = await stat(credentialFile).catch(() => null)
  assert.equal(after?.mtimeMs, before?.mtimeMs, 'smoke must not modify the DSH credential document')
  console.log(JSON.stringify({ profile: alphaProfileName, dshHome: alphaDshHome, host: base, connection: result.connection.state, runtime: result.runtime, models: result.models.map(row => row.id),
    openai: { connection: openai.connection.state, runtime: openai.runtime, accountConfigured: Boolean(openai.account.type), models: openai.models.map(row => row.id) },
    nativeModels, codexModels, credentialFileUnchanged: true, web: true, astraTurn,
    ...(astraTurn ? { paidModelTurn: true } : { paidModelCalls: 0 }) }, null, 2))
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM')
    const timeout = setTimeout(() => child.kill('SIGKILL'), 15_000)
    await exited
    clearTimeout(timeout)
  }
}
