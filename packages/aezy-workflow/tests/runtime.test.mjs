import assert from 'node:assert/strict'
import test from 'node:test'
import {
  apply,
  CodexInspiredPolicyError,
  loopBudgetSnapshot,
  validateRuntimeConfig,
} from '../src/runtime.js'
import {
  CODEX_INSPIRED_LOOP,
  CODEX_INSPIRED_PRESET_ID,
} from '../src/system.js'

function config(overrides = {}) {
  return {
    enabled: true,
    definitionId: CODEX_INSPIRED_LOOP.body.id,
    revision: CODEX_INSPIRED_LOOP.revision,
    digest: CODEX_INSPIRED_LOOP.digest,
    presetId: CODEX_INSPIRED_PRESET_ID,
    budgets: structuredClone(CODEX_INSPIRED_LOOP.body.budgets),
    ...overrides,
  }
}

function harness(runtimeConfig = config()) {
  const handlers = new Map()
  const promptSections = []
  const disposers = []
  const ctx = {
    initiator: undefined,
    agents: {
      currentInitiator() { return ctx.initiator },
    },
    systemPrompt: {
      section(section) {
        promptSections.push(section)
        return () => {}
      },
    },
    effect(factory) {
      const dispose = factory()
      if (typeof dispose === 'function') disposers.push(dispose)
      return dispose
    },
    on(event, handler) {
      handlers.set(event, handler)
      return () => handlers.delete(event)
    },
  }
  apply(ctx, runtimeConfig)
  return { ctx, handlers, promptSections, dispose: () => disposers.reverse().forEach(dispose => dispose()) }
}

function event(seq, type, data, time = 1_000 + seq) {
  return { seq, type, data, time }
}

function agent(events = [], preset = CODEX_INSPIRED_PRESET_ID) {
  return {
    status: 'idle',
    session: { header: { agentPreset: preset }, snapshotEvents: () => events },
    cancelCause: null,
    cancel(cause) { this.cancelCause = cause },
  }
}

test('runtime config requires the exact definition, preset and immutable budgets', () => {
  const resolved = validateRuntimeConfig(config())
  assert.equal(resolved.resolution.executable, true)
  for (const patch of [
    { digest: '0'.repeat(64) },
    { revision: 2 },
    { presetId: 'codex-inspired' },
    { definitionId: 'other' },
    { budgets: { ...CODEX_INSPIRED_LOOP.body.budgets, maxIterations: 63 } },
  ]) {
    assert.throws(() => validateRuntimeConfig(config(patch)), CodexInspiredPolicyError)
  }
  assert.equal(validateRuntimeConfig(config({ enabled: false })).resolution.executable, false)
})

test('runtime compiles onto public DSH hooks and contributes a safe policy section', () => {
  const mounted = harness()
  assert.deepEqual([...mounted.handlers.keys()].sort(), [
    'agent/pre-step',
    'agent/request',
    'agent/status',
    'agent/turn-stopping',
    'llm/stream',
    'tools/pre-execute',
  ])
  assert.equal(mounted.promptSections.length, 1)
  assert.equal(mounted.promptSections[0].name, 'aezy:codex-inspired-loop')
  assert.doesNotMatch(mounted.promptSections[0].text, /token|credential|chain-of-thought/i)
  mounted.dispose()
})

test('budget fold uses only durable DSH Turn, usage and tool facts', () => {
  const events = [
    event(0, 'turn/start', { turn: 1 }, 1_000),
    event(1, 'step/start', { turn: 1, step: 1 }),
    event(2, 'assistant/message', { turn: 1, step: 1, message: { content: [] }, usage: { inputTokens: 10, outputTokens: 5 } }),
    event(3, 'tool/call', { turn: 1, step: 1, callId: 'c', name: 'read', arguments: '{}' }),
    event(4, 'turn/end', { turn: 1, reason: { kind: 'completed' } }),
    event(5, 'turn/start', { turn: 2 }, 2_000),
  ]
  const session = { snapshotEvents: () => events }
  assert.deepEqual(loopBudgetSnapshot(session, 1, 2_500), {
    turn: 1,
    startedAt: 1_000,
    elapsedMs: 1_500,
    tokens: 15,
    toolCalls: 1,
    iterations: 1,
  })
})

test('native model route is independent and the final stream fence rejects App Server', async () => {
  const mounted = harness()
  const subject = agent([
    event(0, 'turn/start', { turn: 1 }, Date.now()),
    event(1, 'assistant/message', { turn: 1, step: 1, message: { content: [] }, usage: { totalTokens: 100 } }),
  ])
  const request = mounted.handlers.get('agent/request')
  assert.deepEqual(
    await request({ agent: subject, turn: 1, step: 2 }, async () => ({ provider: 'openai-codex', model: 'gpt-5.6-sol', maxTokens: 300_000 })),
    { provider: 'openai-codex', model: 'gpt-5.6-sol', maxTokens: 249_900 },
  )
  mounted.ctx.initiator = subject
  const stream = mounted.handlers.get('llm/stream')
  const sentinel = { [Symbol.asyncIterator]: async function* () {} }
  assert.equal(stream({ provider: 'openai-codex', model: 'gpt-5.6-sol' }, () => sentinel), sentinel)
  assert.throws(
    () => stream({ provider: 'aezy-codex', model: 'gpt-5.6-sol' }, () => sentinel),
    /codex-inspired-requires-dsh-native-provider/,
  )
  mounted.dispose()
})

test('disabled or wrongly bound Sessions cannot reach model or tool execution', async () => {
  const disabled = harness(config({ enabled: false }))
  await assert.rejects(
    () => disabled.handlers.get('agent/pre-step')({ agent: agent(), turn: 1, step: 1 }, async () => ({ kind: 'enter', messages: [] })),
    /codex-inspired-dogfood-disabled/,
  )
  disabled.dispose()

  const mounted = harness()
  await assert.rejects(
    () => mounted.handlers.get('agent/request')({ agent: agent([], 'standard'), turn: 1, step: 1 }, async () => ({ provider: 'openai-codex', model: 'gpt-5.6-sol' })),
    /codex-inspired-preset-binding-mismatch/,
  )
  await assert.rejects(
    () => mounted.handlers.get('tools/pre-execute')({ agent: agent([], 'standard') }, async () => ({ kind: 'allow' })),
    /codex-inspired-preset-binding-mismatch/,
  )
  mounted.dispose()
})

test('tool budget denies before downstream dispatch while allowed calls preserve DSH policy', async () => {
  const mounted = harness()
  const allowedAgent = agent([
    event(0, 'turn/start', { turn: 1 }, Date.now()),
    event(1, 'tool/call', { turn: 1, step: 1, callId: 'c', name: 'read', arguments: '{}' }),
  ])
  let delegated = 0
  const allowed = await mounted.handlers.get('tools/pre-execute')(
    { agent: allowedAgent },
    async () => { delegated += 1; return { kind: 'ask' } },
  )
  assert.deepEqual(allowed, { kind: 'ask' })
  assert.equal(delegated, 1)

  const exhaustedEvents = [event(0, 'turn/start', { turn: 1 }, Date.now())]
  for (let index = 0; index <= CODEX_INSPIRED_LOOP.body.budgets.maxToolCalls; index += 1) {
    exhaustedEvents.push(event(index + 1, 'tool/call', { turn: 1, step: 1, callId: `c${String(index)}`, name: 'read', arguments: '{}' }))
  }
  const denied = await mounted.handlers.get('tools/pre-execute')(
    { agent: agent(exhaustedEvents) },
    async () => { delegated += 1; return { kind: 'allow' } },
  )
  assert.deepEqual(denied, { kind: 'deny', reason: 'codex-inspired tool-call budget exhausted' })
  assert.equal(delegated, 1)
  mounted.dispose()
})

test('iteration, token and wall-time limits fail closed at pre-step', async () => {
  const mounted = harness()
  const preStep = mounted.handlers.get('agent/pre-step')
  const next = async () => ({ kind: 'enter', messages: [] })
  const now = Date.now()
  await assert.rejects(
    () => preStep({ agent: agent([event(0, 'turn/start', { turn: 1 }, now)]), turn: 1, step: 65 }, next),
    /iteration-budget-exhausted/,
  )
  await assert.rejects(
    () => preStep({ agent: agent([
      event(0, 'turn/start', { turn: 1 }, now),
      event(1, 'assistant/message', { turn: 1, step: 1, message: { content: [] }, usage: { totalTokens: 250_000 } }),
    ]), turn: 1, step: 2 }, next),
    /token-budget-exhausted/,
  )
  await assert.rejects(
    () => preStep({ agent: agent([event(0, 'turn/start', { turn: 1 }, now - 3_600_001)]), turn: 1, step: 1 }, next),
    /wall-time-budget-exhausted/,
  )
  mounted.dispose()
})
