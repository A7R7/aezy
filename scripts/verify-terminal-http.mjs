import assert from 'node:assert/strict'
import { resolve } from 'node:path'

const baseUrl = process.env.AEZY_TEST_URL ?? 'http://127.0.0.1:3095'
const cwd = resolve(process.env.AEZY_TERMINAL_TEST_CWD ?? process.cwd())
const sessionId = `terminal-http-${Date.now().toString(36)}`
let rpcSequence = 0
const opened = []

async function rpc(method, payload) {
  const rpcId = `terminal-${++rpcSequence}`
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

async function terminal(path, options = {}) {
  const response = await fetch(`${baseUrl}/aezy/api/terminal${path}`, {
    ...options,
    headers: {
      'x-aezy-client': 'web',
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...options.headers,
    },
    signal: options.signal ?? AbortSignal.timeout(40_000),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(`${response.status}: ${body.error}`)
  return body
}

const identity = { sessionId, cwd }
const query = new URLSearchParams(identity)

try {
  const workspace = await rpc('workspace.create', { path: cwd })
  const created = await rpc('session.create', {
    workspaceId: workspace.workspace.workspaceId,
    sessionId,
    agentPreset: 'aezy',
  })
  assert.equal(created.sessionId, sessionId)

  const initial = await terminal(`?${query}`)
  assert.equal(initial.backendAvailable, true)
  assert.deepEqual(initial.terminals, [])

  const first = await terminal('/open', { method: 'POST', body: JSON.stringify(identity) })
  opened.push(first.terminal.id)
  assert.equal(first.cwd, cwd)
  assert.match(first.output, /dsh> /)

  const sent = await terminal('/send', {
    method: 'POST',
    body: JSON.stringify({ ...identity, terminalId: first.terminal.id, text: "printf 'aezy-terminal-http\\n'; pwd" }),
  })
  assert.equal(sent.status.kind, 'running')
  const read = await terminal(`/read?${query}&terminalId=${encodeURIComponent(first.terminal.id)}`)
  assert.match(read.output, /aezy-terminal-http/)
  assert.match(read.output, new RegExp(cwd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.equal(read.truncated, false)

  await terminal('/send', {
    method: 'POST',
    body: JSON.stringify({ ...identity, terminalId: first.terminal.id, text: 'cd /tmp' }),
  })
  const moved = await terminal(`/read?${query}&terminalId=${encodeURIComponent(first.terminal.id)}`)
  assert.equal(moved.terminal.currentCwd, '/tmp')

  const second = await terminal('/open', { method: 'POST', body: JSON.stringify(identity) })
  opened.push(second.terminal.id)
  const listed = await terminal(`?${query}`)
  assert.equal(listed.terminals.length, 2)
  assert.notEqual(listed.terminals[0].id, listed.terminals[1].id)

  const wrongCwd = await fetch(`${baseUrl}/aezy/api/terminal?${new URLSearchParams({ sessionId, cwd: `${cwd}-drift` })}`, {
    headers: { 'x-aezy-client': 'web' },
  })
  assert.equal(wrongCwd.status, 409)
  const forbidden = await fetch(`${baseUrl}/aezy/api/terminal?${query}`)
  assert.equal(forbidden.status, 403)

  const longSend = terminal('/send', {
    method: 'POST',
    body: JSON.stringify({ ...identity, terminalId: second.terminal.id, text: 'sleep 30' }),
  })
  await new Promise(resolve => setTimeout(resolve, 400))
  const interrupted = await terminal('/signal', {
    method: 'POST',
    body: JSON.stringify({ ...identity, terminalId: second.terminal.id, signal: 'SIGINT' }),
  })
  assert.equal(interrupted.delivered, true)
  const settled = await longSend
  assert.equal(settled.status.kind, 'running')

  process.stdout.write('Integrated Terminal real DSH PTY open/send/read/multi-tab/SIGINT/Session-cwd fence passed.\n')
} finally {
  for (const terminalId of opened.reverse()) {
    await terminal('/close', {
      method: 'POST',
      body: JSON.stringify({ ...identity, terminalId }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => {})
  }
}
