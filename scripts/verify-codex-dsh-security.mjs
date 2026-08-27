import assert from 'node:assert/strict'

const baseUrl = process.env.AEZY_TEST_URL ?? 'http://127.0.0.1:3090'
const cwd = process.env.AEZY_CODEX_TEST_CWD ?? process.cwd()
const model = process.env.AEZY_CODEX_TEST_MODEL ?? 'gpt-5.6-sol'
const sessionId = `codex-dsh-security-${Date.now().toString(36)}`
let sequence = 0

async function rpc(method, payload) {
  sequence += 1
  const rpcId = `codex-security-${sequence}`
  const response = await fetch(`${baseUrl}/api/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
    signal: AbortSignal.timeout(30_000),
  })
  const envelope = await response.json()
  assert.equal(response.ok && envelope.result?.ok === true, true, `${method}: ${JSON.stringify(envelope.result?.error ?? envelope)}`)
  return envelope.result.value
}

async function security(path = '', options = {}) {
  const response = await fetch(`${baseUrl}/aezy/api/security${path}`, {
    ...options,
    headers: { 'X-Aezy-Client': 'web', ...options.headers },
    signal: AbortSignal.timeout(30_000),
  })
  const body = await response.json()
  assert.equal(response.ok, true, `Aezy Security ${response.status}: ${JSON.stringify(body)}`)
  return body
}

function policyPost(path, body) {
  return security(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const before = await security(`?${new URLSearchParams({ cwd })}`)
try {
  await policyPost('/network', { cwd, scope: 'repository', mode: 'deny' })
  const workspace = await rpc('workspace.create', { path: cwd })
  await rpc('session.create', {
    workspaceId: workspace.workspace.workspaceId,
    sessionId,
    agentPreset: 'aezy',
  })
  await rpc('session.selectModel', {
    sessionId,
    provider: 'aezy-codex',
    model,
    reasoningEffort: 'low',
  })
  await rpc('session.prompt', {
    sessionId,
    mode: 'queue',
    content: [{
      type: 'text',
      text: 'Use the `dsh.bash` tool exactly once to run `curl https://example.com`; do not use native tools. Then report the governed tool result.',
    }],
  })

  const deadline = Date.now() + 150_000
  let events = []
  while (Date.now() < deadline) {
    const history = await rpc('session.history', { sessionId, maxMessages: 200 })
    events = history.events.map(entry => entry.event)
    if (events.some(event => event.type === 'turn/end')) break
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert.ok(events.some(event => event.type === 'turn/end'), 'Codex Security Turn did not finish')
  const call = events.find(event => event.type === 'tool/call' && event.data.name === 'bash')
  assert.ok(call, 'Codex did not route the network command through dsh.bash')
  const result = events.find(event => event.type === 'tool/result'
    && event.data.message?.source?.callId === call.data.callId)
  assert.ok(result, 'governed network denial produced no DSH tool/result')
  assert.equal(result.data.message.content[0].isError, true)
  assert.equal(result.data.meta?.aezyCodex?.type, 'dynamicTool')

  const snapshot = await security(`?${new URLSearchParams({ cwd })}`)
  const audit = snapshot.audit.find(record => record.sessionId === sessionId && record.tool === 'bash')
  assert.ok(audit, 'Codex dynamic tool did not enter the Aezy Security audit')
  assert.equal(audit.decision, 'deny')
  assert.equal(audit.source, 'network')
  assert.equal(audit.network, 'required')

  process.stdout.write(`${JSON.stringify({
    sessionId,
    provider: 'aezy-codex',
    dynamicTool: 'bash',
    securityDecision: 'deny',
    audited: true,
    turnCompleted: true,
  }, null, 2)}\n`)
} finally {
  if (before.network.repositoryOverride === null) {
    await policyPost('/network/clear', { cwd })
  } else {
    await policyPost('/network', {
      cwd,
      scope: 'repository',
      mode: before.network.repositoryOverride,
    })
  }
}
