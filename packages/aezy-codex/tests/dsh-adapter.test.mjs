import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { CodexBindingStore } from '../src/binding-store.js'
import { AezyCodexAdapter, CODEX_PROVIDER } from '../src/dsh-adapter.js'

class FakeClient extends EventEmitter {
  constructor({ nativeApproval = false, dynamic = false } = {}) {
    super()
    this.calls = []
    this.responses = []
    this.nativeApproval = nativeApproval
    this.dynamic = dynamic
  }

  async request(method, params) {
    this.calls.push({ method, params })
    if (method === 'model/list') return { data: [{
      id: 'gpt-5.6-sol', displayName: 'Sol', isDefault: true,
      defaultReasoningEffort: 'low', supportedReasoningEfforts: [{ reasoningEffort: 'low' }],
    }] }
    if (method === 'thread/start') return { thread: { id: 'thread-1' } }
    if (method === 'thread/resume') return { thread: { id: params.threadId } }
    if (method === 'turn/start') {
      setImmediate(() => {
        if (this.dynamic) {
          this.emit('serverRequest', {
            id: 92,
            method: 'item/tool/call',
            params: {
              threadId: params.threadId, turnId: 'turn-1', callId: 'dynamic-call-1',
              namespace: 'dsh', tool: 'bash', arguments: { command: 'pwd' },
            },
          })
          const finish = () => {
            if (!this.responses.some(response => response.id === 92)) {
              setImmediate(finish)
              return
            }
            this.emitCompleted(params.threadId)
          }
          setImmediate(finish)
          return
        }
        if (this.nativeApproval) this.emit('serverRequest', {
          id: 91,
          method: 'item/commandExecution/requestApproval',
          params: { threadId: params.threadId, turnId: 'turn-1', itemId: 'command-1', command: 'git status' },
        })
        this.emit('notification', {
          method: 'item/completed',
          params: { threadId: params.threadId, turnId: 'turn-1', item: {
            id: 'command-1', type: 'commandExecution', command: 'pwd', aggregatedOutput: '/workspace\n',
            exitCode: 0, status: 'completed',
          } },
        })
        this.emitCompleted(params.threadId)
      })
      return { turn: { id: 'turn-1' } }
    }
    if (method === 'turn/interrupt' || method === 'thread/unsubscribe') return {}
    throw new Error(`Unexpected fake request ${method}`)
  }

  respond(id, result) {
    this.responses.push({ id, result })
  }

  respondError(id, code, message) {
    this.responses.push({ id, error: { code, message } })
  }

  emitCompleted(threadId) {
    this.emit('notification', {
      method: 'item/agentMessage/delta',
      params: { threadId, turnId: 'turn-1', itemId: 'message-1', delta: 'Done.' },
    })
    this.emit('notification', {
      method: 'item/completed',
      params: { threadId, turnId: 'turn-1', item: {
        id: 'message-1', type: 'agentMessage', text: 'Done.',
      } },
    })
    this.emit('notification', {
      method: 'turn/completed',
      params: { threadId, turn: { id: 'turn-1', status: 'completed', items: [] } },
    })
  }
}

class FakeSession {
  constructor(agentPreset = undefined) {
    this.id = 'session-1'
    this.header = { cwd: '/workspace', ...(agentPreset === undefined ? {} : { agentPreset }) }
    this.events = [
      { type: 'turn/start', data: { turn: 1 }, seq: 0 },
      { type: 'step/start', data: { turn: 1, step: 1 }, seq: 1 },
    ]
  }

  append(type, data, options = {}) {
    const event = { type, data, ...options, seq: this.events.length }
    this.events.push(event)
    return event
  }

  snapshotEvents() {
    return Object.freeze([...this.events])
  }
}

async function setup({
  nativeApproval = false,
  dynamic = false,
  agentPreset = undefined,
  allowedAgentPresets = [],
  legacyAgentPresets = [],
} = {}) {
  const root = await mkdtemp(join('/tmp', 'aezy-codex-adapter-'))
  const client = new FakeClient({ nativeApproval, dynamic })
  const session = new FakeSession(agentPreset)
  const agent = { id: session.id, session }
  const approvals = []
  const audits = []
  const executions = []
  agent.ctx = { tools: { execute: async execution => {
    executions.push(execution)
    return { isError: false, value: null, content: [{ type: 'text', text: '/workspace\n' }], meta: { governed: true } }
  } } }
  const ctx = {
    agents: { get: id => id === session.id ? agent : undefined },
    approval: { request: async request => { approvals.push(request); return 'allowed-once' } },
    aezySecurity: {
      evaluate: () => ({ action: {}, verdict: { decision: 'allow', explanation: 'test policy' } }),
      auditUserAction: async record => { audits.push(record) },
    },
  }
  const bindings = new CodexBindingStore(join(root, 'codex-bindings.json'))
  const adapter = new AezyCodexAdapter({
    client,
    ready: Promise.resolve(),
    bindings,
    ctx,
    allowedAgentPresets,
    legacyAgentPresets,
  })
  return { adapter, bindings, client, session, approvals, audits, executions }
}

function options(signal = new AbortController().signal, withTools = false) {
  return {
    provider: CODEX_PROVIDER,
    model: 'gpt-5.6-sol',
    reasoningEffort: 'low',
    sessionId: 'session-1',
    signal,
    messages: [{ role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: 'Run pwd.' }] }],
    ...(withTools ? { tools: [{ name: 'bash', description: 'Run a command.', parameters: {
      type: 'object', properties: { command: { type: 'string' } }, required: ['command'], additionalProperties: false,
    } }] } : {}),
  }
}

test('adapter binds one DSH Session, streams text, and projects native activity without re-execution', async () => {
  const { adapter, bindings, client, session } = await setup()
  const chunks = []
  for await (const chunk of adapter.stream(options())) chunks.push(chunk)
  assert.deepEqual(bindings.get('session-1'), {
    threadId: 'thread-1', cwd: '/workspace', model: 'gpt-5.6-sol',
  })
  assert.equal(client.calls.filter(call => call.method === 'thread/start').length, 1)
  assert.equal(session.events.filter(event => event.type === 'tool/call').length, 1)
  assert.equal(session.events.filter(event => event.type === 'tool/result').length, 1)
  assert.equal(session.events.find(event => event.type === 'tool/call').data.name, 'bash')
  assert.equal(session.events.find(event => event.type === 'tool/result').data.meta.aezyCodex.threadId, 'thread-1')
  assert.ok(chunks.some(chunk => chunk.type === 'text-delta' && chunk.text === 'Done.'))
  assert.deepEqual(chunks.at(-1), {
    type: 'finish', reason: { kind: 'stop' }, replayState: { threadId: 'thread-1', turnId: 'turn-1' },
  })
  adapter.dispose()
})

test('persisted bindings resume the same official Thread instead of creating a replacement', async () => {
  const first = await setup()
  await first.bindings.set('session-1', { threadId: 'thread-existing', cwd: '/workspace', model: 'gpt-5.6-sol' })
  const chunks = []
  for await (const chunk of first.adapter.stream(options())) chunks.push(chunk)
  assert.equal(first.client.calls.some(call => call.method === 'thread/resume' && call.params.threadId === 'thread-existing'), true)
  assert.equal(first.client.calls.some(call => call.method === 'thread/start'), false)
  first.adapter.dispose()
})

test('dynamic tool calls execute through the owning DSH Agent tool registry', async () => {
  const { adapter, client, executions, session } = await setup({ dynamic: true })
  for await (const _chunk of adapter.stream(options(undefined, true))) { /* drain */ }
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(executions.length, 1)
  assert.equal(executions[0].name, 'bash')
  assert.equal(executions[0].callId, 'dynamic-call-1')
  assert.deepEqual(client.responses, [{ id: 92, result: {
    success: true, contentItems: [{ type: 'inputText', text: '/workspace\n' }],
  } }])
  assert.equal(session.events.find(event => event.type === 'tool/result').data.meta.governed, true)
  const started = client.calls.find(call => call.method === 'thread/start')
  assert.equal(started.params.permissions, ':read-only')
  assert.equal(started.params.dynamicTools[0].name, 'dsh')
  assert.equal(session.events.find(event => event.type === 'tool/result').data.meta.aezyCodex.type, 'dynamicTool')
  adapter.dispose()
})

test('native Codex escalation fails closed instead of bypassing DSH tools and Security', async () => {
  const { adapter, client, approvals, executions } = await setup({ nativeApproval: true })
  for await (const _chunk of adapter.stream(options())) { /* drain */ }
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(approvals.length, 0)
  assert.equal(executions.length, 0)
  assert.deepEqual(client.responses, [{ id: 91, result: { decision: 'decline' } }])
  adapter.dispose()
})

test('configured provider fence rejects Codex outside its owning Agent mode before App Server I/O', async () => {
  const { adapter, client } = await setup({
    agentPreset: 'standard',
    allowedAgentPresets: ['codex-app-server'],
    legacyAgentPresets: ['aezy'],
  })
  await assert.rejects(async () => {
    for await (const _chunk of adapter.stream(options())) { /* drain */ }
  }, /unavailable in Agent mode standard/)
  assert.deepEqual(client.calls, [])
  adapter.dispose()
})

test('configured provider fence allows codex-app-server and legacy aezy Sessions', async () => {
  for (const agentPreset of ['codex-app-server', 'aezy']) {
    const { adapter, client } = await setup({
      agentPreset,
      allowedAgentPresets: ['codex-app-server'],
      legacyAgentPresets: ['aezy'],
    })
    for await (const _chunk of adapter.stream(options())) { /* drain */ }
    assert.equal(client.calls.some(call => call.method === 'thread/start'), true)
    adapter.dispose()
  }
})
