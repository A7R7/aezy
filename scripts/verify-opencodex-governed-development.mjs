import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { alphaDshHome, alphaProfileDir, alphaProfileName, runAlphaDsh } from './lib/alpha-runtime.mjs'
import { projectLoopTrace } from '../packages/aezy-inspector/src/trace.js'

// Real, paid provider test. Never run against the user's working profile.
if (process.env.AEZY_OPENCODEX_REAL_PROOF !== '1' || !alphaDshHome.startsWith('/tmp/aezy-opencodex-e2e-')) {
  throw new Error('Use AEZY_OPENCODEX_REAL_PROOF=1 and a synced /tmp/aezy-opencodex-e2e-* DSH_HOME')
}
const sourceHome = process.env.AEZY_OPENCODEX_SOURCE_DSH_HOME ?? '/home/aaron/.aezy-alpha/dsh'
assert.notEqual(sourceHome, alphaDshHome)
const requireFromProfile = createRequire(join(alphaProfileDir, 'package.json'))
const requireFromDsh = createRequire(requireFromProfile.resolve('@deepseek-ai/dsh/package.json'))
const load = name => import(pathToFileURL((name === '@deepseek-ai/cordis' ? requireFromDsh : requireFromProfile).resolve(name)).href)
const [{ Context }, { default: Credentials }, { default: Settings }, { default: Llm }, DeepSeek] = await Promise.all([
  '@deepseek-ai/cordis', '@deepseek-ai/dsh-credentials-local', '@deepseek-ai/dsh-settings-file',
  '@deepseek-ai/dsh-llm', '@deepseek-ai/dsh-llm-deepseek',
].map(load))
const wsModule = await import(pathToFileURL(createRequire(requireFromProfile.resolve('@deepseek-ai/dsh-api-gateway')).resolve('ws')).href)
const WebSocket = wsModule.WebSocket ?? wsModule.default

const ctx = new Context()
let providerKey
let credentialSource
try {
  await ctx.plugin(Credentials, { path: join(sourceHome, '.credentials.yaml'), watch: false })
  await ctx.plugin(Settings, { path: join(sourceHome, 'settings.yaml'), watch: false })
  await ctx.plugin(Llm)
  await ctx.plugin(DeepSeek, {})
  const source = DeepSeek.resolveAdapterOptions(ctx.settings.get('llm-deepseek'))
  const credential = await ctx.credentials.resolve(source.apiKeyEnv)
  assert.ok(credential?.value, 'Existing DSH DeepSeek credential is required')
  providerKey = credential.value
  credentialSource = credential.source
  // Copy only non-secret provider options. The key crosses to the proof Host
  // in memory, never as a credential document or OAuth record.
  await writeFile(join(alphaDshHome, 'settings.yaml'), JSON.stringify({ 'llm-deepseek': {
    apiKeyEnv: 'AEZY_OPENCODEX_PROOF_KEY', baseURL: source.baseURL,
    models: source.models.filter(model => !model.inputModalities?.includes('image')),
  } }), { mode: 0o600 })
} finally { await ctx.fiber.dispose() }

const fixture = await mkdtemp('/tmp/aezy-governed-project-')
const sessionId = `aezy-owned-deepseek-${Date.now().toString(36)}`
const model = 'deepseek/deepseek-v4-flash'
await writeFile(join(fixture, 'sum.mjs'), 'export function sum(a, b) { return a - b }\n')
await writeFile(join(fixture, 'sum.test.mjs'), "import assert from 'node:assert/strict'\nimport test from 'node:test'\nimport {sum} from './sum.mjs'\ntest('sum handles positive and negative integers', () => { assert.equal(sum(2, 3), 5); assert.equal(sum(-2, 3), 1) })\n")
execFileSync('git', ['init', '--quiet'], { cwd: fixture })
execFileSync('git', ['add', 'sum.mjs', 'sum.test.mjs'], { cwd: fixture })
execFileSync('git', ['-c', 'user.name=Aezy Proof', '-c', 'user.email=proof@localhost', 'commit', '--quiet', '-m', 'test: seed intentionally failing sum fixture'], { cwd: fixture })
let baselineFailed = false
try { execFileSync(process.execPath, ['--test', 'sum.test.mjs'], { cwd: fixture, stdio: 'pipe' }) } catch { baselineFailed = true }
assert.equal(baselineFailed, true)

let host, socket, baseUrl, cookie, sequence = 0, hostLogs = ''
const approvals = []
const sanitized = text => text.replaceAll(providerKey, '[provider-key]').replace(/([?&]token=)[^\s)]+/g, '$1[redacted]')
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function answerApproval(frame, clientId) {
  const entries = await records()
  const call = entries.find(row => row.event.type === 'tool/call' && row.event.data.callId === frame.request?.callId)?.event.data
  const args = call ? JSON.parse(call.arguments) : {}
  const target = typeof args.file_path === 'string' ? resolve(fixture, args.file_path) : null
  const allowed = (call?.name === 'write' && target === join(fixture, 'sum.mjs')
      && args.content === 'export function sum(a, b) { return a + b }\n')
    || (call?.name === 'read' && [join(fixture, 'sum.mjs'), join(fixture, 'sum.test.mjs')].includes(target))
    || (call?.name === 'bash' && args.command === 'node --test sum.test.mjs' && args.sandbox_permissions === undefined)
  await rpc('$events/result', { clientId, eventId: frame.eventId, outcome: { kind: 'result', value: allowed ? 'allowed-once' : 'rejected' } })
  if (!allowed) throw new Error('Proof refused a model action outside the exact fixture approval contract')
}
async function rpc(method, args) {
  const response = await fetch(`${baseUrl}/api/${method}`, {
    method: 'POST', headers: { Cookie: cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: `owned-${++sequence}`, method, payload: { args } }),
    signal: AbortSignal.timeout(30_000),
  })
  const body = await response.json()
  assert.equal(body.result?.ok, true, `${method}: ${JSON.stringify(body.result?.error ?? body)}`)
  return body.result.value
}
async function aezy(path, data) {
  const response = await fetch(`${baseUrl}/aezy/api/${path}`, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { Cookie: cookie, 'X-Aezy-Client': 'web', 'content-type': 'application/json' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }), signal: AbortSignal.timeout(30_000),
  })
  const value = await response.json()
  assert.equal(response.ok, true, `${path}: ${JSON.stringify(value)}`)
  return value
}
async function stopHost() {
  socket?.close()
  if (!host || host.exitCode !== null || host.signalCode !== null) return
  const exiting = new Promise(resolve => host.once('exit', resolve))
  host.kill('SIGTERM')
  const timer = setTimeout(() => host.kill('SIGKILL'), 15_000)
  await exiting
  clearTimeout(timer)
}
async function startHost() {
  hostLogs = ''
  host = runAlphaDsh(['--profile', alphaProfileName, '--host', '127.0.0.1', '--port', '0', '--no-open'], {
    stdio: ['ignore', 'pipe', 'pipe'], env: { AEZY_OPENCODEX_PROOF_KEY: providerKey },
  })
  let authenticatedUrl
  for (const stream of [host.stdout, host.stderr]) stream.on('data', data => {
    const text = data.toString()
    const match = text.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s)]+)/)
    if (match) authenticatedUrl = match[1]
    hostLogs = (hostLogs + sanitized(text)).slice(-20_000)
  })
  const deadline = Date.now() + 90_000
  while (!authenticatedUrl && Date.now() < deadline && host.exitCode === null) await pause(200)
  assert.ok(authenticatedUrl, `Proof Host did not start: ${hostLogs}`)
  baseUrl = new URL(authenticatedUrl).origin
  const response = await fetch(authenticatedUrl, { redirect: 'manual' })
  assert.equal(response.status, 303)
  cookie = response.headers.get('set-cookie').split(';', 1)[0]
  let snapshot
  while (Date.now() < deadline) {
    snapshot = await aezy('codex')
    if (snapshot.error) throw new Error(snapshot.error)
    if (snapshot.connection.state === 'connected') break
    await pause(300)
  }
  assert.equal(snapshot.connection.state, 'connected')
  assert.equal(snapshot.runtime.provider, 'aezy-opencodex')
  assert.equal(snapshot.models.every(item => item.id.startsWith('deepseek/')), true)
  const mux = new URL('/api/remote.mux', baseUrl); mux.protocol = 'ws:'
  socket = new WebSocket(mux, { headers: { Cookie: cookie } })
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject) })
  let clientId
  socket.on('message', data => {
    const message = JSON.parse(data.toString())
    if (message.type !== 'item' || message.streamId !== 'owned-proof-events') return
    const frame = message.value
    if (frame.type === 'ready') clientId = frame.clientId
    if (frame.type === 'waterfall' && frame.event === 'approval/request' && frame.agentId === sessionId) {
      approvals.push(frame.eventId)
      void answerApproval(frame, clientId).catch(error => { hostLogs += sanitized(error.message); void rpc('session/cancel', { request: { sessionId } }) })
    }
  })
  socket.send(JSON.stringify({ type: 'open', streamId: 'owned-proof-events', endpoint: '$events', payload: { args: {} } }))
  for (let n = 0; !clientId && n < 100; n++) await pause(100)
  assert.ok(clientId, 'Remote approval carrier did not become ready')
  return snapshot
}
async function summary() {
  return (await rpc('session/list', { _request: {} })).items.find(row => row.sessionId === sessionId)
}
async function records(maxMessages = 240) {
  const current = await summary()
  const result = []
  let beforeSeq
  do {
    const page = await rpc('session/page', { request: {
      address: { kind: 'session', sessionId }, throughSeq: current.projections.asOfSeq, maxMessages,
      ...(beforeSeq === undefined ? {} : { beforeSeq }),
    } })
    result.unshift(...page.records.filter(record => record.type === 'event'))
    if (!page.hasMore) break
    const first = page.records.find(record => record.type === 'event')?.event.seq
    assert.ok(Number.isInteger(first) && first !== beforeSeq, 'history pagination must advance')
    beforeSeq = first
  } while (true)
  return result
}
async function prompt(text, turn) {
  await rpc('session/prompt', { request: { requestId: `${sessionId}-${turn}`, sessionId, mode: 'queue', content: [{ type: 'text', text }], clientTimeZone: 'Asia/Shanghai' } })
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    const current = await summary()
    const entries = await records()
    if (entries.filter(row => row.event.type === 'tool/call' && row.event.data.turn === turn).length > 10) {
      await rpc('session/cancel', { request: { sessionId } })
      throw new Error('Proof tool-call budget exhausted')
    }
    if (current?.running === false && current.projections.values.sessionStats.turns >= turn) {
      const reason = entries.filter(row => row.event.type === 'turn/end').at(-1)?.event.data.reason
      assert.equal(reason?.kind, 'completed', `model turn failed: ${sanitized(JSON.stringify(reason))}`)
      return entries
    }
    await pause(500)
  }
  throw new Error('Real model turn timed out')
}

try {
  const firstRuntime = await startHost()
  console.log(JSON.stringify({ stage: 'owned-host-ready', baseUrl, provider: 'aezy-opencodex', model, credentialSource }))
  await aezy(`project?${new URLSearchParams({ cwd: fixture })}`)
  await aezy('security/rules', { cwd: fixture, effect: 'ask', scope: 'repository', tool: '*' })
  await aezy('security/network', { cwd: fixture, scope: 'repository', mode: 'ask' })
  const workspace = await rpc('workspace/create', { request: { path: fixture } })
  await rpc('session/create', { request: { workspaceId: workspace.workspace.workspaceId, sessionId, agentPreset: 'codex-app-server' } })
  await rpc('session/selectModel', { request: { sessionId, provider: 'aezy-codex', model, reasoningEffort: 'low' } })
  const entries = await prompt('In this repository, read sum.mjs and sum.test.mjs using dsh.read. Fix sum.mjs using dsh.write to contain exactly: export function sum(a, b) { return a + b } followed by a newline. Run exactly node --test sum.test.mjs using dsh.bash with default permissions. Use only dsh tools, not native Codex tools. Do not change the test, add files or use the network. If any tool is denied, stop immediately without retrying or bypassing it. Report the test result.', 1)
  const events = entries.map(row => row.event)
  assert.ok(events.some(event => event.type === 'tool/call' && event.data.name === 'read'))
  assert.ok(events.some(event => event.type === 'tool/call' && event.data.name === 'write'))
  const bash = events.find(event => event.type === 'tool/call' && event.data.name === 'bash')
  assert.ok(bash, 'model must run the test through DSH')
  const bashResult = events.find(event => event.type === 'tool/result' && event.data.message?.source?.callId === bash.data.callId)
  assert.ok(bashResult)
  assert.equal(bashResult.data.meta?.aezyCodex?.type, 'dynamicTool')
  assert.match(JSON.stringify(bashResult.data.message.content), /pass 1/)
  const testOutput = execFileSync(process.execPath, ['--test', 'sum.test.mjs'], { cwd: fixture, encoding: 'utf8' })
  assert.match(testOutput, /pass 1/)
  assert.deepEqual(execFileSync('git', ['diff', '--name-only'], { cwd: fixture, encoding: 'utf8' }).trim().split('\n'), ['sum.mjs'])
  assert.ok(approvals.length >= 1)
  const asked = events.find(event => event.type === 'approval/asked' && event.data.toolName === 'write')
  assert.ok(asked)
  assert.ok(events.some(event => event.type === 'approval/decided' && event.data.id === asked.data.id && event.data.outcome === 'allowed-once'))
  const ledger = await aezy(`project/ledger?${new URLSearchParams({ cwd: fixture, sessionId })}`)
  assert.ok(ledger.turns.find(turn => turn.turn === 1)?.files.some(file => file.path === 'sum.mjs'))
  const review = await aezy(`project/turn-review?${new URLSearchParams({ cwd: fixture, sessionId, turn: '1', path: 'sum.mjs' })}`)
  assert.equal(review.file.status, 'modified')
  console.log(JSON.stringify({ stage: 'governed-development-passed', sessionId, fixture, approvals: approvals.length, test: '1 passed', journal: true }))

  await aezy('security/network', { cwd: fixture, scope: 'repository', mode: 'deny' })
  await prompt('Use dsh.bash exactly once with command curl https://example.com. The repository network policy should deny it. Do not retry, bypass the policy or use any other tool. Report the denial.', 2)
  const security = await aezy(`security?${new URLSearchParams({ cwd: fixture })}`)
  assert.ok(security.audit.some(row => row.sessionId === sessionId && row.tool === 'bash' && row.source === 'network' && row.decision === 'deny'))
  const bindingFile = join(alphaDshHome, 'aezy', 'codex-bindings.json')
  const beforeBinding = JSON.parse(await readFile(bindingFile, 'utf8')).bindings[sessionId]
  const before = await records(2)
  const trace = projectLoopTrace({ sessionId, mode: 'codex-app-server', entries: before, hasMore: false, running: false })
  assert.equal(trace.backend, 'codex-app-server')
  assert.equal(trace.completeness, 'partial')
  await aezy('security/network', { cwd: fixture, scope: 'repository', mode: 'ask' })
  await stopHost()
  const restarted = await startHost()
  assert.equal(restarted.runtime.id, firstRuntime.runtime.id)
  assert.deepEqual(await records(2), before, 'DSH history must survive Host restart exactly')
  await prompt('Continue our existing task. Use dsh.read on sum.mjs, then dsh.bash to run node --test sum.test.mjs. Do not edit anything. Report that the repaired sum still passes.', 3)
  const afterBinding = JSON.parse(await readFile(bindingFile, 'utf8')).bindings[sessionId]
  assert.deepEqual(afterBinding, beforeBinding, 'continuation must resume the same owned Codex Thread')
  const receipt = {
    timestamp: new Date().toISOString(), sessionId, fixture,
    versions: { dsh: '0.1.2-rc.1', codex: '0.149.0', opencodex: '2.42.0', bun: '1.4.0' },
    provider: 'aezy-codex', model, credentialOrigin: `existing DSH credentials (${credentialSource})`,
    runtimeId: restarted.runtime.id, threadId: afterBinding.threadId,
    realDevelopment: { baselineFailed: true, changedFiles: ['sum.mjs'], testsPassed: 1, dshDynamicTools: ['read', 'write', 'bash'] },
    approval: 'allowed-once', networkDenial: true, journal: true, review: review.file.status,
    inspector: { backend: trace.backend, completeness: trace.completeness, spans: trace.spans.length },
    historyPagination: true, restart: { sameRuntime: true, sameThread: true, exactHistory: true, realContinuation: true },
    limitations: ['Inspector covers the DSH boundary, not all private Codex loop steps', 'Codex usage projection is not implemented in this adapter', 'same-UID OS process access is not a sandbox boundary'],
  }
  await writeFile(join(alphaDshHome, 'aezy', 'opencodex-proof.json'), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 })
  console.log(JSON.stringify(receipt, null, 2))
} catch (error) {
  console.error(sanitized(hostLogs))
  throw error
} finally { await stopHost() }
