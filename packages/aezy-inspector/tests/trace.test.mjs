import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import {
  LOOP_BLUEPRINTS, canonicalBlueprint, projectBlueprintOverlay, projectLoopTrace,
} from '../src/trace.js'

function event(type, seq, time, data) {
  return { type: 'event', event: { type, seq, time, data } }
}

function dshFixture() {
  return [
    event('turn/start', 0, 100, { turn: 1 }),
    event('step/start', 1, 110, { turn: 1, step: 1 }),
    event('request/header', 2, 111, { header: { config: { provider: 'openai-codex', model: 'gpt-5.6-sol' }, system: 'SECRET PROMPT' } }),
    event('assistant/chunk', 3, 120, { turn: 1, step: 1, chunk: { type: 'reasoning-delta', text: 'PRIVATE REASONING' } }),
    event('assistant/message', 4, 130, { turn: 1, step: 1, message: { content: [{ type: 'reasoning', text: 'CHAIN OF THOUGHT' }] }, usage: { inputTokens: 10, cacheReadTokens: 5, outputTokens: 2, totalTokens: 17, reasoningTokens: 99 } }),
    event('tool/call', 5, 140, { turn: 1, step: 1, callId: 'call-a', name: 'write', arguments: '{"token":"RAW-TOOL-SECRET"}' }),
    event('tool/call', 6, 141, { turn: 1, step: 1, callId: 'call-b', name: 'bash', arguments: '{"command":"echo RAW-COMMAND-SECRET"}' }),
    event('approval/asked', 7, 142, { id: 'approval-a', callId: 'call-a', toolName: 'write', reason: 'APPROVAL-SECRET' }),
    event('approval/decided', 8, 145, { id: 'approval-a', outcome: 'allowed-once' }),
    event('tool/result', 9, 150, { message: { source: { callId: 'call-a' }, isError: false, content: [{ type: 'text', text: 'RESULT-SECRET' }] }, meta: { opaque: 'META-SECRET' } }),
    event('tool/result', 10, 155, { message: { source: { callId: 'call-b' }, isError: true, content: [{ type: 'text', text: 'FAILED-RESULT-SECRET' }] }, error: { code: 'FAILED', message: 'ERROR-SECRET' } }),
    event('step/end', 11, 160, { turn: 1, step: 1 }),
    event('turn/end', 12, 170, { turn: 1, reason: { kind: 'completed' } }),
  ]
}

test('backend blueprints carry the digest of their exact static topology', () => {
  for (const blueprint of Object.values(LOOP_BLUEPRINTS)) {
    const digest = `sha256:${createHash('sha256').update(canonicalBlueprint(blueprint)).digest('hex')}`
    assert.equal(blueprint.digest, digest)
    assert.equal(blueprint.revision, 2)
    assert.ok(blueprint.nodes.length >= 10)
    assert.ok(blueprint.edges.length >= 15)
    const ids = new Set(blueprint.nodes.map(node => node.id))
    assert.equal(ids.size, blueprint.nodes.length)
    for (const node of blueprint.nodes) {
      assert.ok(node.label.length > 0)
      assert.ok(node.owner.length > 0)
      assert.ok(node.description.length > 0)
      assert.ok(node.sourceRefs.length > 0)
      assert.equal(Number.isFinite(node.position.x) && Number.isFinite(node.position.y), true)
    }
    for (const edge of blueprint.edges) {
      assert.equal(ids.has(edge.from), true, edge.id)
      assert.equal(ids.has(edge.to), true, edge.id)
      assert.ok(edge.guard.length > 0)
      assert.ok(edge.sourceRefs.length > 0)
    }
  }
  const codex = LOOP_BLUEPRINTS['codex-app-server']
  assert.deepEqual(codex.nodes.filter(node => node.opaque).map(node => node.id), ['codex-agent-core'])
  assert.match(codex.nodes.find(node => node.id === 'codex-agent-core').description, /not exposed|not inferred/)
})

test('runtime trace is a derived overlay on static nodes and edges, not the graph topology', () => {
  const trace = projectLoopTrace({ sessionId: 'overlay', mode: 'standard', entries: dshFixture() })
  const overlay = projectBlueprintOverlay(trace)
  assert.equal(overlay.blueprintId, 'dsh-native')
  assert.equal(overlay.nodes['model-request'].visited, true)
  assert.equal(overlay.nodes['model-request'].visits, 1)
  assert.equal(overlay.nodes['approval-gate'].visited, true)
  assert.equal(overlay.nodes['tool-pipeline'].visits, 2)
  assert.equal(overlay.nodes.compaction.visited, false)
  assert.equal(overlay.edges['response-tools'].traversed, true)
  assert.equal(overlay.edges['scheduler-gates'].traversed, true)
  assert.equal(overlay.edges['result-loops-step'].traversed, false)
  assert.equal(Object.keys(overlay.nodes).length, trace.blueprint.nodes.length)
  assert.equal(Object.keys(overlay.edges).length, trace.blueprint.edges.length)
})

test('DSH-native projection is deterministic, nested, concurrent, and usage-exact', () => {
  const input = { sessionId: 'session-one', mode: 'standard', entries: dshFixture(), running: false }
  const first = projectLoopTrace(input)
  const second = projectLoopTrace(structuredClone(input))
  assert.deepEqual(first, second)
  assert.equal(first.backend, 'dsh-native')
  assert.equal(first.completeness, 'complete')
  assert.equal(first.throughSeq, 12)
  assert.deepEqual(first.spans[0].usage.value, {
    inputTokens: 10, cacheReadTokens: 5, outputTokens: 2, totalTokens: 17,
  })
  const tools = first.spans.filter(span => span.kind === 'tool')
  assert.equal(tools.length, 2)
  assert.equal(tools.find(span => span.label.endsWith('write')).status.value, 'completed')
  assert.equal(tools.find(span => span.label.endsWith('bash')).status.value, 'failed')
  const approval = first.spans.find(span => span.kind === 'approval')
  assert.equal(approval.parentSpanId, tools.find(span => span.label.endsWith('write')).spanId)
  assert.equal(approval.durationMs.value, 3)
  assert.equal(first.activeSpanIds.length, 0)
})

test('open calls remain multiple authoritative active spans', () => {
  const entries = dshFixture().slice(0, 7)
  const trace = projectLoopTrace({ sessionId: 'parallel', mode: 'standard', entries, running: true })
  const activeTools = trace.spans.filter(span => span.kind === 'tool' && span.status.value === 'active')
  assert.equal(activeTools.length, 2)
  assert.equal(trace.activeSpanIds.includes(activeTools[0].spanId), true)
  assert.equal(trace.activeSpanIds.includes(activeTools[1].spanId), true)
  assert.equal(trace.spans[0].status.value, 'active')
})

test('packed assistant chunk rows do not become false Session event gaps', () => {
  const entries = dshFixture().map(entry => structuredClone(entry))
  entries[3] = {
    type: 'chunks',
    event: { type: 'chunkrow/deltas', seq: 3, time: 120, data: { turn: 1, step: 1 } },
  }
  const trace = projectLoopTrace({ sessionId: 'packed', mode: 'standard', entries })
  assert.equal(trace.completeness, 'complete')
  assert.equal(trace.diagnostics.some(item => item.code === 'event-sequence-gap'), false)
})

test('App Server projection is coarse-partial and preserves only protocol-safe durable item identity', () => {
  const entries = dshFixture().map(entry => structuredClone(entry))
  entries[2].event.data.header.config.provider = 'aezy-codex'
  delete entries[4].event.data.usage
  entries[9].event.data.meta = {
    aezyCodex: {
      threadId: 'thread-1', turnId: 'turn-1', itemId: 'item-1', type: 'dynamicTool',
    },
    secret: 'APP-META-SECRET',
  }
  const trace = projectLoopTrace({ sessionId: 'codex-session', mode: 'codex-app-server', entries })
  assert.equal(trace.backend, 'codex-app-server')
  assert.equal(trace.completeness, 'partial')
  assert.equal(trace.diagnostics.some(item => item.code === 'app-server-item-lifecycle-partial'), true)
  assert.equal(trace.diagnostics.some(item => item.code === 'app-server-usage-not-durable'), true)
  assert.equal(trace.spans[0].usage, undefined)
  const tool = trace.spans.find(span => span.label.endsWith('write'))
  assert.equal(tool.sources.some(source => source.source === 'codex-app-server'
    && source.threadId === 'thread-1' && source.turnId === 'turn-1' && source.itemId === 'item-1'), true)
  const overlay = projectBlueprintOverlay(trace)
  assert.equal(overlay.nodes['codex-agent-core'].visited, true)
  assert.equal(trace.blueprint.nodes.find(node => node.id === 'codex-agent-core').opaque, true)
})

test('projection never leaks reasoning, prompts, credentials, raw arguments, results, reasons, or opaque meta', () => {
  const trace = projectLoopTrace({ sessionId: 'safe', mode: 'standard', entries: dshFixture() })
  const serialized = JSON.stringify(trace)
  for (const secret of [
    'SECRET PROMPT', 'PRIVATE REASONING', 'CHAIN OF THOUGHT', 'RAW-TOOL-SECRET',
    'RAW-COMMAND-SECRET', 'APPROVAL-SECRET', 'RESULT-SECRET', 'FAILED-RESULT-SECRET',
    'ERROR-SECRET', 'META-SECRET',
  ]) assert.equal(serialized.includes(secret), false, secret)
  assert.equal(serialized.includes('reasoningTokens'), false)
  assert.equal(serialized.includes('arguments'), false)
})

test('truncated, malformed, and hostile inputs degrade visibility without throwing', () => {
  const truncated = projectLoopTrace({ sessionId: 'partial', entries: dshFixture().slice(5), hasMore: true })
  assert.equal(truncated.completeness, 'partial')
  assert.equal(truncated.diagnostics.some(item => item.code === 'history-window-truncated'), true)
  const hostile = {}
  Object.defineProperty(hostile, 'sessionId', { get() { throw new Error('secret failure') } })
  const unavailable = projectLoopTrace(hostile)
  assert.equal(unavailable.completeness, 'unavailable')
  assert.deepEqual(unavailable.diagnostics, [{ code: 'projector-failed', message: 'projector-failed' }])
})
