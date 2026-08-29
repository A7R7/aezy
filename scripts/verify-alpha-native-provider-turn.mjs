import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { alphaProfileDir } from './lib/alpha-runtime.mjs'

const baseUrl = process.env.AEZY_ALPHA_GATE_URL ?? 'http://127.0.0.1:3091'
const launchToken = process.env.AEZY_ALPHA_GATE_TOKEN
if (!launchToken) throw new Error('AEZY_ALPHA_GATE_TOKEN is required for the authenticated 3091 gate')

const profileManifestPath = join(alphaProfileDir, 'package.json')
const requireFromProfile = createRequire(profileManifestPath)
const wsModule = await import(pathToFileURL(requireFromProfile.resolve('ws')).href)
const WebSocket = wsModule.WebSocket ?? wsModule.default
assert.equal(typeof WebSocket, 'function', 'the alpha profile ws package exports no constructor')

const bootstrap = await fetch(`${baseUrl}/?token=${encodeURIComponent(launchToken)}`, {
  redirect: 'manual',
  signal: AbortSignal.timeout(15_000),
})
assert.equal(bootstrap.status, 303)
const setCookie = bootstrap.headers.get('set-cookie')
assert.ok(setCookie, '3091 bootstrap returned no signed cookie')
const cookie = setCookie.split(';', 1)[0]

const fixture = await mkdtemp('/tmp/aezy-alpha-native-turn-')
const sessionId = `aezy-alpha-native-turn-${Date.now().toString(36)}`
const filename = 'native-provider-gate.txt'
const target = join(fixture, filename)
let rpcSequence = 0
let ruleId
let socket

function headers(extra = {}) {
  return { Cookie: cookie, ...extra }
}

async function rpc(method, args) {
  rpcSequence += 1
  const rpcId = `alpha-native-turn-${rpcSequence}`
  const response = await fetch(`${baseUrl}/api/${method}`, {
    method: 'POST',
    headers: headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload: { args } }),
    signal: AbortSignal.timeout(30_000),
  })
  const envelope = await response.json()
  assert.equal(response.ok && envelope.result?.ok === true, true,
    `${method}: ${JSON.stringify(envelope.result?.error ?? envelope)}`)
  return envelope.result.value
}

async function aezy(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: headers({ 'X-Aezy-Client': 'web', ...options.headers }),
    signal: options.signal ?? AbortSignal.timeout(30_000),
  })
  const body = await response.json()
  assert.equal(response.ok, true, `${path}: ${JSON.stringify(body)}`)
  return body
}

function post(path, body) {
  return aezy(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function respondApproval(frame, clientId) {
  await rpc('$events/result', {
    clientId,
    eventId: frame.eventId,
    outcome: { kind: 'result', value: 'allowed-once' },
  })
}

async function sessionSummary() {
  const listed = await rpc('session/list', { _request: {} })
  return listed.items.find(item => item.sessionId === sessionId)
}

async function sessionRecords(asOfSeq) {
  const page = await rpc('session/page', {
    request: {
      address: { kind: 'session', sessionId },
      throughSeq: asOfSeq,
      maxMessages: 240,
    },
  })
  return page.records.filter(record => record.type === 'event').map(record => record.event)
}

execFileSync('git', ['init', '--quiet'], { cwd: fixture })

let approvalFrame
let approvalFailure
let remoteEventClientId
const remoteReady = Promise.withResolvers()
const muxUrl = new URL('/api/remote.mux', baseUrl)
muxUrl.protocol = muxUrl.protocol === 'https:' ? 'wss:' : 'ws:'

try {
  socket = new WebSocket(muxUrl, { headers: { Cookie: cookie } })
  await new Promise((resolve, reject) => {
    socket.once('open', resolve)
    socket.once('error', reject)
  })
  socket.on('message', data => {
    try {
      const message = JSON.parse(data.toString())
      if (message.type !== 'item' || message.streamId !== 'alpha-native-events') return
      const frame = message.value
      if (frame?.type === 'ready') {
        remoteEventClientId = frame.clientId
        remoteReady.resolve()
        return
      }
      if (frame?.type === 'waterfall' && frame.event === 'approval/request'
        && frame.agentId === sessionId) {
        approvalFrame = frame
        void respondApproval(frame, remoteEventClientId).catch(error => { approvalFailure = error })
      }
    } catch (error) {
      approvalFailure = error
    }
  })
  socket.send(JSON.stringify({
    type: 'open',
    streamId: 'alpha-native-events',
    endpoint: '$events',
    payload: { args: {} },
  }))
  await Promise.race([
    remoteReady.promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Remote event stream did not become ready')), 15_000)),
  ])

  await aezy(`/aezy/api/project?${new URLSearchParams({ cwd: fixture })}`)
  const createdRule = await post('/aezy/api/security/rules', {
    cwd: fixture,
    effect: 'ask',
    scope: 'repository',
    tool: 'write',
  })
  ruleId = createdRule.rule.id
  const explanation = await post('/aezy/api/security/explain', {
    cwd: fixture,
    tool: 'write',
    arguments: { file_path: filename, content: 'AEZY_NATIVE_PROVIDER_OK\n' },
  })
  assert.equal(explanation.verdict.decision, 'ask')

  const workspace = await rpc('workspace/create', { request: { path: fixture } })
  await rpc('session/create', { request: {
    workspaceId: workspace.workspace.workspaceId,
    sessionId,
    agentPreset: 'standard',
  } })
  await rpc('session/selectModel', { request: {
    sessionId,
    provider: 'openai-codex',
    model: 'gpt-5.6-sol',
    reasoningEffort: 'low',
  } })
  await rpc('session/prompt', { request: {
    requestId: `${sessionId}-prompt`,
    sessionId,
    mode: 'queue',
    content: [{
      type: 'text',
      text: [
        `Use the write tool exactly once to create ${filename}.`,
        'Its exact content must be AEZY_NATIVE_PROVIDER_OK followed by one newline.',
        'Do not use shell, edit, or any other tool. Reply briefly after the write succeeds.',
      ].join(' '),
    }],
    clientTimeZone: 'Asia/Shanghai',
  } })

  const deadline = Date.now() + 240_000
  let summary
  while (Date.now() < deadline) {
    if (approvalFailure !== undefined) throw approvalFailure
    summary = await sessionSummary()
    if (summary?.running === false && summary.blank === false
      && (summary.projections?.values?.sessionStats?.turns ?? 0) >= 1) break
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert.ok(summary, 'native Turn Session disappeared')
  assert.equal(summary.running, false, 'native governed Turn did not settle')
  assert.equal(summary.projections.values.sessionStats.turns >= 1, true)

  const events = await sessionRecords(summary.projections.asOfSeq)
  const asked = events.find(event => event.type === 'approval/asked')
  const decided = events.find(event => event.type === 'approval/decided' && event.data.id === asked?.data.id)
  const call = events.find(event => event.type === 'tool/call' && event.data.name === 'write')
  const result = events.find(event => event.type === 'tool/result'
    && event.data.message?.source?.callId === call?.data.callId)
  assert.ok(approvalFrame, 'Remote approval/request waterfall was not emitted')
  assert.ok(asked, 'approval/asked was not persisted')
  assert.equal(asked.data.toolName, 'write')
  assert.equal(decided?.data.outcome, 'allowed-once')
  assert.ok(call, 'native model did not call DSH write')
  assert.ok(result, 'native DSH write produced no tool/result')
  assert.equal(events.some(event => event.type === 'turn/end'
    && event.data.reason?.kind === 'completed'), true)
  assert.equal(await readFile(target, 'utf8'), 'AEZY_NATIVE_PROVIDER_OK\n')

  const selection = summary.projections.values.modelSelection
  const usage = summary.projections.values.tokenUsage
  assert.equal(selection.lastUsed.provider, 'openai-codex')
  assert.equal(selection.lastUsed.model, 'gpt-5.6-sol')
  assert.equal((usage.uncachedInputTokens ?? 0) + (usage.cacheReadTokens ?? 0) > 0, true)
  assert.equal(usage.outputTokens > 0, true)

  const ledger = await aezy(`/aezy/api/project/ledger?${new URLSearchParams({
    cwd: fixture,
    sessionId,
  })}`)
  const turn = ledger.turns.find(candidate => candidate.turn === 1)
  assert.ok(turn, 'Journal did not publish the native provider Turn')
  assert.equal(turn.files.some(file => file.path === filename), true)
  const review = await aezy(`/aezy/api/project/turn-review?${new URLSearchParams({
    cwd: fixture,
    sessionId,
    turn: '1',
    path: filename,
  })}`)
  assert.equal(review.file.status, 'added')

  const security = await aezy(`/aezy/api/security?${new URLSearchParams({ cwd: fixture })}`)
  const audit = security.audit.find(record => record.sessionId === sessionId && record.tool === 'write')
  assert.ok(audit, 'governed native write did not enter the Security audit')
  assert.equal(audit.decision, 'ask')
  assert.equal(audit.outcome, 'allowed-once')

  process.stdout.write(`${JSON.stringify({
    sessionId,
    provider: selection.lastUsed.provider,
    model: selection.lastUsed.model,
    approval: decided.data.outcome,
    security: { decision: audit.decision, outcome: audit.outcome },
    journal: { turn: turn.turn, source: turn.source, file: filename },
    review: review.file.status,
    usage,
    turnCompleted: true,
  }, null, 2)}\n`)
} finally {
  socket?.close()
  if (ruleId !== undefined) {
    await post('/aezy/api/security/rules/delete', { cwd: fixture, id: ruleId }).catch(() => {})
  }
  await rm(fixture, { recursive: true, force: true })
}
