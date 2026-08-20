import assert from 'node:assert/strict'
import { repoRoot } from './lib/profile.mjs'

const baseUrl = process.env.AEZY_TEST_URL ?? 'http://127.0.0.1:3090'
const sessionId = `m2-dogfood-${Date.now().toString(36)}`
let rpcSequence = 0

async function rpc(method, payload) {
  rpcSequence += 1
  const rpcId = `${sessionId}-${rpcSequence}`
  const response = await fetch(`${baseUrl}/api/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
    signal: AbortSignal.timeout(15000),
  })
  const envelope = await response.json()
  if (!response.ok || envelope.result?.ok !== true) {
    throw new Error(`${method} failed: ${JSON.stringify(envelope.result?.error ?? envelope)}`)
  }
  return envelope.result.value
}

async function security(path = '', options = {}) {
  const response = await fetch(`${baseUrl}/aezy/api/security${path}`, {
    ...options,
    headers: { 'X-Aezy-Client': 'web', ...options.headers },
    signal: AbortSignal.timeout(15000),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(`Aezy Security ${response.status}: ${body.error}`)
  return body
}

function policyPost(path, body) {
  return security(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const before = await security(`?${new URLSearchParams({ cwd: repoRoot })}`)
try {
  await policyPost('/network', { cwd: repoRoot, scope: 'repository', mode: 'deny' })
  await rpc('session.create', { cwd: repoRoot, sessionId, agentPreset: 'aezy' })
  await rpc('session.prompt', {
    sessionId,
    mode: 'queue',
    content: [{
      type: 'text',
      text: 'M2 dogfood only: use the bash tool exactly once to run `curl https://example.com`. Do not modify any files. Then briefly report the tool result.',
    }],
    clientTimeZone: 'Asia/Shanghai',
  })

  const deadline = Date.now() + 150_000
  let events = []
  while (Date.now() < deadline) {
    const history = await rpc('session.history', { sessionId, maxMessages: 50 })
    events = history.events.map(entry => entry.event)
    if (events.some(event => event.type === 'turn/end')) break
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  assert.equal(events.some(event => event.type === 'turn/end'), true, 'dogfood turn did not finish')
  const call = events.find(event => event.type === 'tool/call' && event.data.name === 'bash')
  assert.ok(call, 'real model did not issue the requested bash call')
  const result = events.find(event => event.type === 'tool/result' && event.data.message?.toolCallId === call.data.callId)
    ?? events.find(event => event.type === 'tool/result')
  assert.ok(result, 'denied bash call has no tool result')

  const snapshot = await security(`?${new URLSearchParams({ cwd: repoRoot })}`)
  const decision = snapshot.audit.find(record => record.sessionId === sessionId && record.tool === 'bash')
  assert.ok(decision, 'real tool call did not enter the Aezy audit')
  assert.equal(decision.decision, 'deny')
  assert.equal(decision.source, 'network')
  assert.equal(decision.network, 'required')
  assert.match(decision.commandPreview, /^curl https:\/\/example\.com/u)
  process.stdout.write(`M2 real-model dogfood passed (session ${sessionId}, audit ${decision.id}).\n`)
} finally {
  if (before.network.repositoryOverride === null) {
    await policyPost('/network/clear', { cwd: repoRoot })
  } else {
    await policyPost('/network', {
      cwd: repoRoot,
      scope: 'repository',
      mode: before.network.repositoryOverride,
    })
  }
}
