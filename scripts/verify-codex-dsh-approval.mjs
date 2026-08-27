import assert from 'node:assert/strict'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

const baseUrl = process.env.AEZY_TEST_URL ?? 'http://127.0.0.1:3090'
const cwd = process.env.AEZY_CODEX_TEST_CWD
if (!cwd) throw new Error('AEZY_CODEX_TEST_CWD must name a disposable Git fixture')
const model = process.env.AEZY_CODEX_TEST_MODEL ?? 'gpt-5.6-sol'
const sessionId = `codex-dsh-approval-${Date.now().toString(36)}`
const filename = `codex-approval-${Date.now().toString(36)}.txt`
const target = join(cwd, filename)
let sequence = 0

async function rpc(method, payload) {
  sequence += 1
  const rpcId = `codex-approval-${sequence}`
  const response = await fetch(`${baseUrl}/api/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
    signal: AbortSignal.timeout(30_000),
  })
  const envelope = await response.json()
  assert.equal(response.ok && envelope.result?.ok === true, true, `${method}: ${JSON.stringify(envelope.result?.error ?? envelope)}`)
  return envelope.result.value
}

async function aezy(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'X-Aezy-Client': 'web', ...options.headers },
    signal: options.signal ?? AbortSignal.timeout(30_000),
  })
  const body = await response.json()
  assert.equal(response.ok, true, `${path}: ${JSON.stringify(body)}`)
  return body
}

function post(path, body) {
  return aezy(path, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

async function respond(frame) {
  const response = await fetch(`${baseUrl}/api/respond`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-response',
      rpcId: frame.rpcId,
      result: {
        ok: true,
        value: {
          sessionId,
          approvalId: frame.payload.approvalId,
          outcome: 'allowed-once',
        },
      },
    }),
    signal: AbortSignal.timeout(30_000),
  })
  assert.deepEqual(await response.json(), { accepted: true })
}

const muxAbort = new AbortController()
let approvalFrame = null
let pumpFailure = null
const muxUrl = new URL('/api/events.mux', baseUrl)
muxUrl.protocol = muxUrl.protocol === 'https:' ? 'wss:' : 'ws:'
const socket = new WebSocket(muxUrl)
const pump = new Promise(resolve => {
  socket.addEventListener('message', event => {
    try {
      if (typeof event.data !== 'string') throw new Error('binary mux frame')
      const frame = JSON.parse(event.data)
      if (frame.method === 'approval/requested' && frame.payload?.sessionId === sessionId) {
        approvalFrame = frame
        void respond(frame).catch(error => { pumpFailure = error })
      }
    } catch (error) {
      pumpFailure = error
    }
  })
  socket.addEventListener('close', resolve, { once: true })
  socket.addEventListener('error', () => {
    if (!muxAbort.signal.aborted) pumpFailure = new Error('approval mux WebSocket failed')
  })
})
await new Promise((resolve, reject) => {
  if (socket.readyState === WebSocket.OPEN) return resolve()
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', () => reject(new Error('approval mux WebSocket did not open')), { once: true })
})
muxAbort.signal.addEventListener('abort', () => socket.close(), { once: true })

let ruleId
try {
  const createdRule = await post('/aezy/api/security/rules', {
    cwd,
    effect: 'ask',
    scope: 'repository',
    tool: 'write',
  })
  ruleId = createdRule.rule.id

  const workspace = await rpc('workspace.create', { path: cwd })
  await rpc('session.create', {
    workspaceId: workspace.workspace.workspaceId,
    sessionId,
    agentPreset: 'aezy',
  })
  await rpc('session.selectModel', {
    sessionId, provider: 'aezy-codex', model, reasoningEffort: 'low',
  })
  await rpc('session.prompt', {
    sessionId,
    mode: 'queue',
    content: [{
      type: 'text',
      text: `Use the \`dsh.write\` tool exactly once to create \`${filename}\` with exact content \`AEZY_APPROVAL_OK\\n\`. Do not use native tools or any other tool.`,
    }],
  })

  const deadline = Date.now() + 150_000
  let events = []
  while (Date.now() < deadline) {
    if (pumpFailure) throw pumpFailure
    const history = await rpc('session.history', { sessionId, maxMessages: 200 })
    events = history.events.map(entry => entry.event)
    if (events.some(event => event.type === 'turn/end')) break
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  assert.ok(approvalFrame, 'DSH approval/requested was not emitted for the Codex dynamic tool')
  assert.equal(await readFile(target, 'utf8'), 'AEZY_APPROVAL_OK\n')
  const asked = events.find(event => event.type === 'approval/asked')
  const decided = events.find(event => event.type === 'approval/decided' && event.data.id === asked?.data.id)
  assert.ok(asked, 'approval/asked was not persisted')
  assert.equal(asked.data.toolName, 'write')
  assert.equal(decided?.data.outcome, 'allowed-once')
  const call = events.find(event => event.type === 'tool/call' && event.data.name === 'write')
  const result = events.find(event => event.type === 'tool/result'
    && event.data.message?.source?.callId === call?.data.callId)
  assert.equal(result?.data.meta?.aezyCodex?.type, 'dynamicTool')

  process.stdout.write(`${JSON.stringify({
    sessionId,
    provider: 'aezy-codex',
    approvalRequested: true,
    outcome: 'allowed-once',
    governedWrite: true,
    turnCompleted: true,
  }, null, 2)}\n`)
} finally {
  muxAbort.abort()
  await pump
  if (ruleId) await post('/aezy/api/security/rules/delete', { id: ruleId, cwd })
  await rm(target, { force: true })
}
