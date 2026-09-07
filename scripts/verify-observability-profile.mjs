import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtemp, writeFile, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { alphaDshHome, alphaProfileDir, alphaProfileName, runAlphaDsh } from './lib/alpha-runtime.mjs'

if (!process.env.AEZY_ALPHA_DSH_HOME || (!alphaDshHome.startsWith('/tmp/aezy-') && !alphaDshHome.startsWith(resolve('.local') + '/'))) throw Error('Use an explicit isolated Aezy DSH_HOME/profile, never the working profile')
const real = process.env.AEZY_OBSERVABILITY_REAL_PROOF === '1'
const directory = await mkdtemp('/tmp/aezy-observability-proof-')
const bootstrapPath = join(directory, 'bootstrap.json')
let env = {}, child, url, output = '', cookie
if (real) {
  const source = process.env.AEZY_OPENCODEX_SOURCE_DSH_HOME ?? '/home/aaron/.aezy-alpha/dsh'
  assert.notEqual(source, alphaDshHome)
  const req = createRequire(join(alphaProfileDir, 'package.json')), dsh = createRequire(req.resolve('@deepseek-ai/dsh/package.json'))
  const load = name => import(pathToFileURL((name === '@deepseek-ai/cordis' ? dsh : req).resolve(name)).href)
  const [{ Context }, { default: Credentials }, { default: Settings }, { default: Llm }, DeepSeek] = await Promise.all(['@deepseek-ai/cordis', '@deepseek-ai/dsh-credentials-local', '@deepseek-ai/dsh-settings-file', '@deepseek-ai/dsh-llm', '@deepseek-ai/dsh-llm-deepseek'].map(load))
  const ctx = new Context()
  try {
    await ctx.plugin(Credentials, { path: join(source, '.credentials.yaml'), watch: false })
    await ctx.plugin(Settings, { path: join(source, 'settings.yaml'), watch: false })
    await ctx.plugin(Llm); await ctx.plugin(DeepSeek, {})
    const options = DeepSeek.resolveAdapterOptions(ctx.settings.get('llm-deepseek'))
    const credential = await ctx.credentials.resolve(options.apiKeyEnv)
    assert.ok(credential?.value)
    env.AEZY_OBSERVABILITY_PROOF_KEY = credential.value
    // Isolated proof configuration only; secret stays in memory/child env.
    await writeFile(join(alphaDshHome, 'settings.yaml'), JSON.stringify({ 'llm-deepseek': { apiKeyEnv: 'AEZY_OBSERVABILITY_PROOF_KEY', baseURL: options.baseURL, models: options.models.filter(m => !m.inputModalities?.includes('image')) } }), { mode: 0o600 })
  } finally { await ctx.fiber.dispose() }
}
const start = async () => {
  url = null; output = ''
  child = runAlphaDsh(['--profile', alphaProfileName, '--host', '127.0.0.1', '--port', process.env.AEZY_OBSERVABILITY_PORT ?? '3197', '--no-open'], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => {
    const text = data.toString(); url ||= text.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s)]+)/)?.[1]
    output = (output + text.replace(/([?&]token=)[^\s)]+/g, '$1[redacted]')).slice(-6000)
  })
  const deadline = Date.now() + 60000
  while (!url && child.exitCode === null && Date.now() < deadline) await new Promise(r => setTimeout(r, 150))
  assert.ok(url, output)
  const response = await fetch(url, { redirect: 'manual' }); assert.equal(response.status, 303)
  cookie = response.headers.get('set-cookie').split(';')[0]
  await writeFile(bootstrapPath, JSON.stringify({ url }), { mode: 0o600 })
}
const stop = async () => { if (!child || child.exitCode !== null) return; const stopped = new Promise(r => child.once('exit', r)); child.kill('SIGTERM'); await stopped }
const api = async (path, init = {}) => {
  const response = await fetch(new URL(url).origin + path, { ...init, headers: { Cookie: cookie, 'X-Aezy-Client': 'web', 'content-type': 'application/json', ...init.headers }, signal: AbortSignal.timeout(15000) })
  assert.equal(response.status, 200, path); return response.json()
}
const rpc = async (method, args) => { const envelope = await api('/api/' + method, { method: 'POST', body: JSON.stringify({ type: 'client-request', rpcId: crypto.randomUUID(), method, payload: { args } }) }); assert.equal(envelope.result?.ok, true, JSON.stringify(envelope.result?.error)); return envelope.result.value }
const sessions = []
try {
  await start()
  const initial = await api('/aezy/observability/api/usage?range=all')
  assert.equal((await fetch(new URL(url).origin + '/aezy/observability/api/logs', { headers: { 'X-Aezy-Client': 'web' } })).status, 401)
  assert.equal((await fetch(new URL(url).origin + '/aezy/observability/api/logs', { headers: { Cookie: cookie } })).status, 403)
  if (real) {
    await api('/aezy/observability/api/debug', { method: 'PUT', body: JSON.stringify({ debug: true, usage: true, injection: true, inbound: true }) })
    const workspace = await rpc('workspace/create', { request: { path: await mkdtemp('/tmp/aezy-observability-turn-') } })
    for (const preset of ['standard', 'codex-app-server']) {
      const sessionId = `aezy-observability-${preset}-${Date.now().toString(36)}`
      await rpc('session/create', { request: { sessionId, workspaceId: workspace.workspace.workspaceId, agentPreset: preset } })
      await rpc('session/selectModel', { request: { sessionId, provider: preset === 'standard' ? 'deepseek-official' : 'aezy-codex', model: preset === 'standard' ? 'deepseek-v4-flash' : 'deepseek/deepseek-v4-flash', reasoningEffort: 'low' } })
      await rpc('session/prompt', { request: { sessionId, requestId: sessionId, mode: 'queue', content: [{ type: 'text', text: 'Reply exactly AEZY_OBSERVABILITY_OK. Do not use tools or access files/network.' }] } })
      const deadline = Date.now() + 120000
      let summary
      while (Date.now() < deadline) {
        summary = (await rpc('session/list', { _request: {} })).items.find(s => s.sessionId === sessionId)
        if (summary?.running === false && summary.projections.values.sessionStats.turns >= 1) break
        await new Promise(r => setTimeout(r, 300))
      }
      assert.ok(summary?.running === false && summary.projections.values.sessionStats.turns >= 1)
      const history = await rpc('session/page', { request: { address: { kind: 'session', sessionId }, throughSeq: summary.projections.asOfSeq, maxMessages: 100 } })
      const events = history.records.filter(r => r.type === 'event').map(r => r.event)
      assert.equal(events.findLast(e => e.type === 'turn/end')?.data.reason?.kind, 'completed')
      assert.ok(events.filter(e => e.type === 'assistant/message').flatMap(e => e.data.message.content).some(c => c.type === 'text' && c.text.includes('AEZY_OBSERVABILITY_OK')))
      sessions.push(sessionId)
    }
  }
  const logs = await api('/aezy/observability/api/logs')
  let before = await api('/aezy/observability/api/usage?range=all')
  if (real) {
    assert.ok(before.summary.requests > initial.summary.requests)
    for (const surface of ['dsh-native', 'codex-gateway']) assert.ok(logs.logs.some(r => r.surface === surface && r.usage?.totalTokens > 0))
    assert.ok(before.summary.estimatedCostUsd > 0)
    assert.ok((await api('/aezy/observability/api/debug/usage-logs')).length > 0)
  }
  if (process.env.AEZY_OBSERVABILITY_BROWSER === '1') {
    const result = spawn(process.execPath, ['scripts/verify-observability-browser.mjs'], { stdio: 'inherit', env: { ...process.env, AEZY_OBSERVABILITY_BOOTSTRAP: bootstrapPath, AEZY_OBSERVABILITY_RECEIPTS: directory } })
    assert.equal(await new Promise(r => result.once('exit', r)), 0)
  }
  // Session title calls may complete after the main Turn. Snapshot at the
  // restart boundary, not before the browser work and its live refreshes.
  before = await api('/aezy/observability/api/usage?range=all')
  await stop(); await start()
  const after = await api('/aezy/observability/api/usage?range=all')
  assert.deepEqual(after.summary, before.summary)
  assert.equal((await api('/aezy/observability/api/debug')).enabled, false)
  const receipt = { timestamp: new Date().toISOString(), directory, realTurns: sessions, summary: after.summary, surfaces: after.surfaces, restartIdentical: true, privateWebAuth: true, oauthFilesRead: false }
  await writeFile(join(directory, 'profile.json'), JSON.stringify(receipt, null, 2) + '\n')
  console.log(JSON.stringify(receipt, null, 2))
} finally { await stop(); env = {}; await unlink(bootstrapPath).catch(() => {}) }
