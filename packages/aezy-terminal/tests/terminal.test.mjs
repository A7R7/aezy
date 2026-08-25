import assert from 'node:assert/strict'
import test from 'node:test'
import { TerminalBridge, TerminalRequestError, terminalLimits } from '../src/index.js'

function fixture() {
  const owner = { id: 'session-a', session: { id: 'session-a', header: { cwd: '/repo/a' } } }
  const other = { id: 'session-b', session: { id: 'session-b', header: { cwd: '/repo/b' } } }
  const byOwner = new Map([[owner, []], [other, [{ sessionId: 'pty-foreign', name: 'aezy-ui:x', type: 'shell', status: { kind: 'running' } }]]])
  let next = 0
  const terminals = {
    listBackends: () => ['shell'],
    list: agent => [...(byOwner.get(agent) ?? [])],
    async spawn(agent, request) {
      const snapshot = { sessionId: `pty-${++next}`, name: request.name, type: request.type, pid: 100 + next, status: { kind: 'running' } }
      byOwner.get(agent).push(snapshot)
      return { ...snapshot, motd: 'dsh> ' }
    },
    read(agent, id, request) {
      assert.equal(request.count, terminalLimits.readLines)
      assert.ok(byOwner.get(agent).some(item => item.sessionId === id))
      return { text: 'dsh> pwd\n/repo/a\ndsh> ', totalLines: 3, lineBegin: 0, lineEnd: 3, truncated: false }
    },
    startSend(agent, id, request) {
      assert.ok(byOwner.get(agent).some(item => item.sessionId === id))
      assert.equal(request.submit, true)
      return { done: Promise.resolve({ viewport: '', waitReason: 'stdin_read', sessionStatus: { kind: 'running' }, truncated: false }) }
    },
    async signal(agent, id, signal) {
      assert.ok(byOwner.get(agent).some(item => item.sessionId === id))
      assert.equal(signal, 'SIGINT')
      return { delivered: true, targetPgid: 22 }
    },
    async kill(agent, id) {
      const values = byOwner.get(agent)
      const index = values.findIndex(item => item.sessionId === id)
      values.splice(index, 1)
      return true
    },
  }
  const bridge = new TerminalBridge({
    agents: { get: id => id === owner.id ? owner : id === other.id ? other : undefined },
    terminals,
  })
  return { bridge, owner, other, byOwner, terminals }
}

test('binds open/list/read/send/signal/close to the exact Session and cwd', async () => {
  const { bridge } = fixture()
  const identity = { sessionId: 'session-a', cwd: '/repo/a' }
  assert.deepEqual((await bridge.list(identity)).terminals, [])
  const opened = await bridge.open(identity)
  assert.equal(opened.terminal.id, 'pty-1')
  assert.equal(opened.terminal.title, 'Terminal 1')
  assert.equal(opened.terminal.currentCwd, '/repo/a')
  assert.equal(opened.output, 'dsh> ')
  assert.equal((await bridge.list(identity)).terminals.length, 1)
  const read = await bridge.read({ ...identity, terminalId: 'pty-1' })
  assert.equal(read.terminal.currentCwd, '/repo/a')
  assert.match(read.output, /\/repo\/a/)
  assert.equal((await bridge.send({ ...identity, terminalId: 'pty-1', text: 'pwd' })).waitReason, 'stdin_read')
  assert.equal((await bridge.signal({ ...identity, terminalId: 'pty-1', signal: 'SIGINT' })).delivered, true)
  assert.equal((await bridge.close({ ...identity, terminalId: 'pty-1' })).closed, true)
  assert.deepEqual((await bridge.list(identity)).terminals, [])
})

test('fails closed for cold, cwd-drifted, foreign, and non-UI terminals', async () => {
  const { bridge, owner, byOwner } = fixture()
  await assert.rejects(() => bridge.open({ sessionId: 'cold', cwd: '/repo/a' }), error => error instanceof TerminalRequestError && error.status === 409)
  await assert.rejects(() => bridge.open({ sessionId: 'session-a', cwd: '/repo/b' }), /identity does not match/)
  byOwner.get(owner).push({ sessionId: 'pty-model', name: 'model-terminal', type: 'shell', status: { kind: 'running' } })
  assert.deepEqual((await bridge.list({ sessionId: 'session-a', cwd: '/repo/a' })).terminals, [])
  await assert.rejects(() => bridge.read({ sessionId: 'session-a', cwd: '/repo/a', terminalId: 'pty-foreign' }), error => error instanceof TerminalRequestError && error.status === 404)
})

test('bounds input and permits only the user interrupt signal', async () => {
  const { bridge } = fixture()
  const identity = { sessionId: 'session-a', cwd: '/repo/a' }
  const opened = await bridge.open(identity)
  await assert.rejects(() => bridge.send({ ...identity, terminalId: opened.terminal.id, text: 'x'.repeat(terminalLimits.maxInputBytes + 1) }), /exceeds/)
  await assert.rejects(() => bridge.send({ ...identity, terminalId: opened.terminal.id, text: 'bad\0input' }), /NUL/)
  await assert.rejects(() => bridge.signal({ ...identity, terminalId: opened.terminal.id, signal: 'SIGKILL' }), /only SIGINT/)
})

test('bounds the number of user terminals per Session', async () => {
  const { bridge } = fixture()
  const identity = { sessionId: 'session-a', cwd: '/repo/a' }
  for (let index = 0; index < terminalLimits.maxTerminals; index += 1) await bridge.open(identity)
  await assert.rejects(() => bridge.open(identity), error => error instanceof TerminalRequestError && error.status === 409)
})

test('marks a read window truncated when retained output exceeds the projected line bound', async () => {
  const { bridge, terminals } = fixture()
  const identity = { sessionId: 'session-a', cwd: '/repo/a' }
  const opened = await bridge.open(identity)
  terminals.read = () => ({ text: 'latest', totalLines: terminalLimits.readLines + 1, lineBegin: 0, lineEnd: 1, truncated: false })
  assert.equal((await bridge.read({ ...identity, terminalId: opened.terminal.id })).truncated, true)
})
