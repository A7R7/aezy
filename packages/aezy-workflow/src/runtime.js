import {
  CODEX_INSPIRED_CAPABILITIES,
  CODEX_INSPIRED_LOOP,
  CODEX_INSPIRED_PRESET_ID,
} from './system.js'
import { resolveLoopCapabilities } from './definition.js'

export const name = '@aezy/workflow'
export const inject = ['agents', 'systemPrompt']

const POLICY_SECTION = Object.freeze({
  name: 'aezy:codex-inspired-loop',
  order: 700,
  text: [
    'Codex-inspired execution policy:',
    '1. Bind the requested outcome, repository scope, and durable Session constraints before acting.',
    '2. Investigate repository and runtime facts with structured DSH tools before editing.',
    '3. Choose a proportionate plan and keep it aligned with evidence as the task changes.',
    '4. Implement the smallest coherent change while DSH remains owner of tools, approval, sandbox, and Security.',
    '5. Run proportionate verification, then inspect the diff, Journal, usage, and remaining risk.',
    '6. Finalize only when evidence supports completion; otherwise re-investigate and retry within the declared budgets.',
    'Work autonomously while safe relevant work remains. Report unresolved blockers truthfully.',
  ].join('\n'),
})

export class CodexInspiredPolicyError extends Error {
  constructor(code, message = code) {
    super(message)
    this.name = 'CodexInspiredPolicyError'
    this.code = code
  }
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new CodexInspiredPolicyError('invalid-runtime-config', `${field} must be a positive safe integer`)
  }
  return value
}

function usageTokens(usage) {
  if (usage === null || typeof usage !== 'object') return 0
  if (Number.isFinite(usage.totalTokens) && usage.totalTokens >= 0) return usage.totalTokens
  const input = Number.isFinite(usage.inputTokens) && usage.inputTokens > 0 ? usage.inputTokens : 0
  const output = Number.isFinite(usage.outputTokens) && usage.outputTokens > 0 ? usage.outputTokens : 0
  return input + output
}

function eventTurn(event) {
  return Number.isSafeInteger(event?.data?.turn) ? event.data.turn : undefined
}

export function loopBudgetSnapshot(session, turn, now = Date.now()) {
  const events = Array.isArray(session?.events) ? session.events : []
  let startedAt
  let tokens = 0
  let toolCalls = 0
  let iterations = 0
  for (const event of events) {
    if (eventTurn(event) !== turn) continue
    if (event.type === 'turn/start' && Number.isFinite(event.time)) startedAt = event.time
    if (event.type === 'assistant/message') tokens += usageTokens(event.data?.usage)
    if (event.type === 'tool/call') toolCalls += 1
    if (event.type === 'step/start') iterations += 1
  }
  return Object.freeze({
    turn,
    startedAt,
    elapsedMs: startedAt === undefined ? 0 : Math.max(0, now - startedAt),
    tokens,
    toolCalls,
    iterations,
  })
}

export function validateRuntimeConfig(config = {}) {
  if (config.definitionId !== CODEX_INSPIRED_LOOP.body.id
    || config.revision !== CODEX_INSPIRED_LOOP.revision
    || config.digest !== CODEX_INSPIRED_LOOP.digest
    || config.presetId !== CODEX_INSPIRED_PRESET_ID) {
    throw new CodexInspiredPolicyError('definition-binding-mismatch')
  }
  const declared = config.budgets ?? CODEX_INSPIRED_LOOP.body.budgets
  const expected = CODEX_INSPIRED_LOOP.body.budgets
  const budgets = Object.freeze({
    maxIterations: positiveInteger(declared.maxIterations, 'maxIterations'),
    maxWallTimeMs: positiveInteger(declared.maxWallTimeMs, 'maxWallTimeMs'),
    maxTokens: positiveInteger(declared.maxTokens, 'maxTokens'),
    maxToolCalls: positiveInteger(declared.maxToolCalls, 'maxToolCalls'),
  })
  for (const key of Object.keys(expected)) {
    if (budgets[key] !== expected[key]) throw new CodexInspiredPolicyError('definition-budget-mismatch')
  }
  const resolution = resolveLoopCapabilities(CODEX_INSPIRED_LOOP, CODEX_INSPIRED_CAPABILITIES, {
    enabled: config.enabled === true,
  })
  return Object.freeze({ enabled: config.enabled === true, budgets, resolution })
}

function assertBound(agent, runtime) {
  if (runtime.enabled !== true || runtime.resolution.executable !== true) {
    throw new CodexInspiredPolicyError('codex-inspired-dogfood-disabled')
  }
  if (agent?.session?.header?.agentPreset !== CODEX_INSPIRED_PRESET_ID) {
    throw new CodexInspiredPolicyError('codex-inspired-preset-binding-mismatch')
  }
}

function assertBudget(agent, turn, step, budgets, now = Date.now()) {
  const snapshot = loopBudgetSnapshot(agent.session, turn, now)
  if (Math.max(step, snapshot.iterations) > budgets.maxIterations) {
    throw new CodexInspiredPolicyError('iteration-budget-exhausted')
  }
  if (snapshot.elapsedMs >= budgets.maxWallTimeMs) throw new CodexInspiredPolicyError('wall-time-budget-exhausted')
  if (snapshot.tokens >= budgets.maxTokens) throw new CodexInspiredPolicyError('token-budget-exhausted')
  if (snapshot.toolCalls > budgets.maxToolCalls) throw new CodexInspiredPolicyError('tool-call-budget-exhausted')
  return snapshot
}

export function apply(ctx, config = {}) {
  const runtime = validateRuntimeConfig(config)
  const timers = new Map()

  const clearTimer = (agent) => {
    const timer = timers.get(agent)
    if (timer !== undefined) clearTimeout(timer)
    timers.delete(agent)
  }

  ctx.effect(() => ctx.systemPrompt.section(POLICY_SECTION), 'codexInspired.promptPolicy()')
  ctx.effect(() => () => {
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
  }, 'codexInspired.budgetTimers()')

  ctx.on('agent/status', ({ agent, status }) => {
    clearTimer(agent)
    if (status !== 'running') return
    try {
      assertBound(agent, runtime)
    } catch {
      return
    }
    const timer = setTimeout(() => {
      timers.delete(agent)
      if (agent.status === 'running') {
        agent.cancel({ kind: 'hook', reason: 'codex-inspired wall-time budget exhausted' })
      }
    }, runtime.budgets.maxWallTimeMs)
    timer.unref?.()
    timers.set(agent, timer)
  })

  ctx.on('agent/pre-step', async ({ agent, turn, step }, next) => {
    assertBound(agent, runtime)
    assertBudget(agent, turn, step, runtime.budgets)
    return next()
  })

  ctx.on('agent/request', async ({ agent, turn, step }, next) => {
    assertBound(agent, runtime)
    const snapshot = assertBudget(agent, turn, step, runtime.budgets)
    const request = await next()
    const remaining = runtime.budgets.maxTokens - snapshot.tokens
    if (request.maxTokens !== undefined && request.maxTokens > remaining) {
      return { ...request, maxTokens: remaining }
    }
    return request
  })

  ctx.on('llm/stream', (request, next) => {
    const agent = ctx.agents.currentInitiator()
    if (agent?.session?.header?.agentPreset !== CODEX_INSPIRED_PRESET_ID) return next()
    assertBound(agent, runtime)
    if (request.provider === 'aezy-codex') {
      throw new CodexInspiredPolicyError('codex-inspired-requires-dsh-native-provider')
    }
    if (typeof request.provider !== 'string' || request.provider === ''
      || typeof request.model !== 'string' || request.model === '') {
      throw new CodexInspiredPolicyError('codex-inspired-missing-model-route')
    }
    return next()
  })

  ctx.on('tools/pre-execute', async (exec, next) => {
    assertBound(exec.agent, runtime)
    const start = [...exec.agent.session.events].findLast(event => event.type === 'turn/start')
    const turn = start?.data?.turn
    if (!Number.isSafeInteger(turn)) return { kind: 'deny', reason: 'codex-inspired requires an active durable Turn' }
    const snapshot = loopBudgetSnapshot(exec.agent.session, turn)
    if (snapshot.toolCalls > runtime.budgets.maxToolCalls) {
      return { kind: 'deny', reason: 'codex-inspired tool-call budget exhausted' }
    }
    return next()
  })

  ctx.on('agent/turn-stopping', ({ agent, turn }) => {
    assertBound(agent, runtime)
    const snapshot = loopBudgetSnapshot(agent.session, turn)
    assertBudget(agent, turn, Math.max(1, snapshot.iterations), runtime.budgets)
  })
}

export default apply
