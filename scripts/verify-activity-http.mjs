import assert from 'node:assert/strict'
import { resolve } from 'node:path'

const baseUrl = process.env.AEZY_TEST_URL ?? 'http://127.0.0.1:3090'
const cwd = resolve(process.env.AEZY_ACTIVITY_TEST_CWD ?? process.cwd())
const sessionId = `activity-http-${Date.now().toString(36)}`
let rpcSequence = 0

async function rpc(method, payload) {
  const rpcId = `activity-${++rpcSequence}`
  const response = await fetch(`${baseUrl}/api/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
    signal: AbortSignal.timeout(10_000),
  })
  assert.equal(response.status, 200, `${method} transport status`)
  const envelope = await response.json()
  assert.equal(envelope.rpcId, rpcId)
  assert.equal(envelope.result?.ok, true, JSON.stringify(envelope.result?.error))
  return envelope.result.value
}

const root = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(10_000) })
assert.equal(root.status, 200)
const html = await root.text()
assert.match(html, /"id":"@aezy\/activity"/)

const workspace = await rpc('workspace.create', { path: cwd })
const created = await rpc('session.create', {
  workspaceId: workspace.workspace.workspaceId,
  sessionId,
  agentPreset: 'aezy',
})
assert.equal(created.sessionId, sessionId)

const history = await rpc('session.history', { sessionId, maxMessages: 10 })
assert.equal(Number.isSafeInteger(history.projections?.asOfSeq), true)
assert.equal(history.projections.asOfSeq >= -1, true)
assert.deepEqual(history.projections?.values?.tokenUsage, {
  uncachedInputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
})
assert.deepEqual(history.projections?.values?.sessionStats, {
  turns: 0,
  steps: 0,
  llmMs: 0,
  toolMs: 0,
  ttftMs: 0,
  ttftSteps: 0,
  decodeMs: 0,
  decodeTokens: 0,
})
assert.equal(typeof history.projections?.values?.contextPressure, 'object')

const query = new URLSearchParams({ sessionId, cwd })
const terminalResponse = await fetch(`${baseUrl}/aezy/api/terminal?${query}`, {
  headers: { 'x-aezy-client': 'web' },
  signal: AbortSignal.timeout(10_000),
})
assert.equal(terminalResponse.status, 200)
const terminal = await terminalResponse.json()
assert.equal(terminal.sessionId, sessionId)
assert.equal(terminal.cwd, cwd)
assert.equal(terminal.backendAvailable, true)
assert.deepEqual(terminal.terminals, [])

process.stdout.write('Activity module, durable DSH usage/trajectory projections, and fenced Terminal status passed.\n')
