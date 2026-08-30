export const LOOP_TRACE_SCHEMA_VERSION = 1

import { LOOP_BLUEPRINTS, canonicalBlueprint } from './blueprints.js'
export { LOOP_BLUEPRINTS, canonicalBlueprint }

export const EVIDENCE = Object.freeze({
  authoritative: 'authoritative',
  derived: 'derived',
  inferred: 'inferred',
})

const RECOGNIZED = new Set([
  'turn/start', 'turn/end', 'step/start', 'step/end', 'request/header',
  'assistant/message', 'tool/call', 'tool/result', 'approval/asked',
  'approval/decided', 'tool/code-dispatch-start', 'tool/code-dispatch',
  'compaction/start', 'compaction/summary', 'compaction/end',
  'llm/retry', 'llm/retry-started', 'subagent/descriptor',
  'tool-workflow/run-start', 'tool-workflow/run-end',
  'tool-workflow/agent-start', 'tool-workflow/agent-end',
])

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function integer(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null
}

function safeIdentity(value, fallback = null) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:/-]{1,200}$/u.test(value)) return fallback
  return value
}

function stableKey(value) {
  const text = String(value ?? '')
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function uniqueSources(sources) {
  const seen = new Set()
  return sources.filter(source => {
    const key = JSON.stringify(source)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function fact(value, evidence, sources) {
  return { value, evidence, sources: uniqueSources(sources) }
}

function sourceRef(event, sessionId, backend) {
  return {
    source: 'dsh-session',
    backend,
    sessionId,
    eventType: event.type,
    ...(integer(event.seq) === null ? {} : { seq: event.seq }),
    ...(integer(event.time) === null ? {} : { time: event.time }),
  }
}

function codexSourceRef(event, sessionId, backend) {
  if (event.type !== 'tool/result') return null
  const data = record(event.data)
  const meta = record(data?.meta)
  const codex = record(meta?.aezyCodex)
  if (codex === null) return null
  const threadId = safeIdentity(codex.threadId)
  const turnId = safeIdentity(codex.turnId)
  const itemId = safeIdentity(codex.itemId)
  if (threadId === null && turnId === null && itemId === null) return null
  return {
    source: 'codex-app-server',
    backend,
    sessionId,
    eventType: 'item/completed',
    ...(safeIdentity(codex.type) === null ? {} : { itemType: codex.type }),
    ...(threadId === null ? {} : { threadId }),
    ...(turnId === null ? {} : { turnId }),
    ...(itemId === null ? {} : { itemId }),
  }
}

function entriesToEvents(entries) {
  if (!Array.isArray(entries)) return []
  const events = []
  for (const entry of entries) {
    const outer = record(entry)
    if (outer === null) continue
    const event = outer.type === 'event' ? record(outer.event) : outer
    if (event === null || typeof event.type !== 'string') continue
    if (event.type.startsWith('chunkrow/')) continue
    events.push(event)
  }
  return events
}

function turnReasonStatus(reason) {
  const kind = record(reason)?.kind
  if (kind === 'completed') return 'completed'
  if (kind === 'aborted') return 'cancelled'
  if (kind === 'interrupted') return 'interrupted'
  if (kind === 'error' || kind === 'blocked' || kind === 'max-tokens') return 'failed'
  return 'unknown'
}

function resultIsError(data) {
  if (record(data)?.error !== undefined) return true
  const message = record(record(data)?.message)
  return message?.isError === true
}

function resultCallId(data) {
  const message = record(record(data)?.message)
  return typeof record(message?.source)?.callId === 'string'
    ? record(message.source).callId
    : null
}

function normalizedUsage(value) {
  const usage = record(value)
  if (usage === null) return null
  const fields = ['inputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'outputTokens', 'totalTokens']
  const normalized = {}
  for (const field of fields) {
    const count = integer(usage[field])
    if (count !== null) normalized[field] = count
  }
  return Object.keys(normalized).length === 0 ? null : normalized
}

function addUsage(left, right) {
  const total = { ...left }
  for (const [key, value] of Object.entries(right)) total[key] = (total[key] ?? 0) + value
  return total
}

function overlayStatus(spans) {
  for (const status of ['active', 'failed', 'cancelled', 'interrupted', 'completed', 'unknown']) {
    if (spans.some(span => span.status.value === status)) return status
  }
  return 'pending'
}

export function projectBlueprintOverlay(trace) {
  const nodeOverlays = {}
  for (const nodeValue of trace.blueprint.nodes) {
    const binding = nodeValue.runtime
    const spans = binding === undefined ? [] : trace.spans.filter(span =>
      span.blueprintNodeId !== undefined
      && binding.spanNodeIds.includes(span.blueprintNodeId)
      && (binding.statuses === undefined || binding.statuses.includes(span.status.value)),
    )
    let usage = {}
    let durationMs = 0
    let activeSince = null
    const sources = []
    for (const span of spans) {
      if (span.usage !== undefined) usage = addUsage(usage, span.usage.value)
      if (span.durationMs !== undefined) durationMs += span.durationMs.value
      if (span.status.value === 'active' && span.startedAt !== undefined) {
        activeSince = activeSince === null ? span.startedAt.value : Math.min(activeSince, span.startedAt.value)
      }
      sources.push(...span.sources)
    }
    nodeOverlays[nodeValue.id] = Object.freeze({
      nodeId: nodeValue.id,
      visited: spans.length > 0,
      active: spans.some(span => span.status.value === 'active'),
      visits: spans.length,
      status: overlayStatus(spans),
      durationMs,
      ...(activeSince === null ? {} : { activeSince }),
      ...(Object.keys(usage).length === 0 ? {} : { usage: Object.freeze(usage) }),
      sources: Object.freeze(uniqueSources(sources)),
      evidence: EVIDENCE.derived,
    })
  }
  const edgeOverlays = {}
  for (const edgeValue of trace.blueprint.edges) {
    const from = nodeOverlays[edgeValue.from]
    const to = nodeOverlays[edgeValue.to]
    const loopRequiresRepeat = edgeValue.kind === 'loop-back'
      && ![
        'dsh-retry-request', 'dsh-compaction-rebuilds',
        'codex-retry-request', 'codex-compact-step', 'codex-token-step', 'codex-stop-continues',
      ].includes(edgeValue.id)
    const traversed = from?.visited === true && to?.visited === true
      && (!loopRequiresRepeat || to.visits > 1)
    edgeOverlays[edgeValue.id] = Object.freeze({
      edgeId: edgeValue.id,
      traversed,
      active: traversed && to.active,
      traversals: traversed ? Math.max(1, Math.min(from.visits, to.visits)) : 0,
      evidence: EVIDENCE.derived,
    })
  }
  return Object.freeze({
    blueprintId: trace.blueprint.id,
    blueprintRevision: trace.blueprint.revision,
    nodes: Object.freeze(nodeOverlays),
    edges: Object.freeze(edgeOverlays),
  })
}

function createBuilder(sessionId, backend, diagnostics) {
  const spans = []
  const byId = new Map()
  const add = ({ spanId, parentSpanId, parentEvidence = EVIDENCE.derived, blueprintNodeId, kind, label, event }) => {
    const ref = sourceRef(event, sessionId, backend)
    const span = {
      spanId,
      ...(parentSpanId === undefined ? {} : { parentSpanId, parentEvidence }),
      ...(blueprintNodeId === undefined ? {} : { blueprintNodeId }),
      kind,
      label,
      status: fact('active', EVIDENCE.authoritative, [ref]),
      ...(integer(event.time) === null ? {} : { startedAt: fact(event.time, EVIDENCE.authoritative, [ref]) }),
      sources: [ref],
    }
    spans.push(span)
    byId.set(spanId, span)
    return span
  }
  const close = (span, event, status = 'completed', sources = []) => {
    if (span === undefined) return
    const ref = sourceRef(event, sessionId, backend)
    const all = uniqueSources([ref, ...sources])
    span.status = fact(status, EVIDENCE.authoritative, all)
    if (integer(event.time) !== null) {
      span.endedAt = fact(event.time, EVIDENCE.authoritative, [ref])
      if (span.startedAt !== undefined) {
        span.durationMs = fact(
          Math.max(0, event.time - span.startedAt.value),
          EVIDENCE.derived,
          uniqueSources([...span.startedAt.sources, ref]),
        )
      }
    }
    span.sources = uniqueSources([...span.sources, ref, ...sources])
  }
  const diagnose = (code) => {
    if (!diagnostics.some(item => item.code === code)) diagnostics.push({ code, message: code })
  }
  return { spans, byId, add, close, diagnose }
}

function project(input) {
  const sessionId = safeIdentity(input.sessionId, `session-${stableKey(input.sessionId)}`)
  const events = entriesToEvents(input.entries)
  const diagnostics = []
  let provider = null
  let codexEvidence = input.mode === 'codex-app-server'
  for (const event of events) {
    if (event.type === 'request/header') {
      const config = record(record(record(event.data)?.header)?.config)
      const nextProvider = safeIdentity(config?.provider)
      if (nextProvider !== null) provider = nextProvider
      if (nextProvider === 'aezy-codex') codexEvidence = true
    }
    if (codexSourceRef(event, sessionId, 'codex-app-server') !== null) codexEvidence = true
  }
  const backend = codexEvidence ? 'codex-app-server' : 'dsh-native'
  const blueprint = LOOP_BLUEPRINTS[backend]
  const builder = createBuilder(sessionId, backend, diagnostics)
  const sessionEvent = events[0] ?? { type: 'session', seq: 0, time: 0, data: {} }
  const sessionSpan = builder.add({
    spanId: `session:${stableKey(sessionId)}`,
    blueprintNodeId: 'session',
    kind: 'session',
    label: backend === 'codex-app-server' ? 'Codex App Server Session' : 'DSH Session',
    event: sessionEvent,
  })
  const turns = new Map()
  const steps = new Map()
  const models = new Map()
  const tools = new Map()
  const approvals = new Map()
  const compactions = new Map()
  const retries = new Map()
  const workflows = new Map()
  const workflowMembers = new Map()
  const usageSources = []
  let sessionUsage = {}
  let currentTurn = null
  let currentStep = null

  const stepKey = (turn, step) => `${String(turn)}:${String(step)}`
  const toolParent = (turn, step) => steps.get(stepKey(turn, step))?.spanId
    ?? turns.get(turn)?.spanId
    ?? sessionSpan.spanId
  const currentParent = () => currentStep === null
    ? (currentTurn === null ? sessionSpan.spanId : turns.get(currentTurn)?.spanId ?? sessionSpan.spanId)
    : toolParent(currentTurn, currentStep)

  for (const event of events) {
    if (!RECOGNIZED.has(event.type)) continue
    const data = record(event.data) ?? {}
    const turn = integer(data.turn)
    const step = integer(data.step)

    switch (event.type) {
      case 'turn/start': {
        if (turn === null) { builder.diagnose('malformed-turn-start'); break }
        currentTurn = turn
        currentStep = null
        const span = builder.add({
          spanId: `turn:${String(turn)}`,
          parentSpanId: sessionSpan.spanId,
          blueprintNodeId: 'turn', kind: 'turn', label: `Turn ${String(turn)}`, event,
        })
        turns.set(turn, span)
        break
      }
      case 'turn/end': {
        if (turn === null) { builder.diagnose('malformed-turn-end'); break }
        const status = turnReasonStatus(data.reason)
        const turnSpan = turns.get(turn)
        if (turnSpan === undefined) builder.diagnose('unmatched-turn-end')
        builder.close(turnSpan, event, status)
        for (const span of builder.spans) {
          if (span.status.value !== 'active' || span.kind === 'session' || span.kind === 'turn') continue
          if (!span.spanId.startsWith(`turn:${String(turn)}:`)) continue
          builder.close(span, event, status === 'completed' ? 'unknown' : status)
        }
        if (currentTurn === turn) { currentTurn = null; currentStep = null }
        break
      }
      case 'step/start': {
        if (turn === null || step === null) { builder.diagnose('malformed-step-start'); break }
        currentTurn = turn
        currentStep = step
        const parent = turns.get(turn)?.spanId ?? sessionSpan.spanId
        const key = stepKey(turn, step)
        const span = builder.add({
          spanId: `turn:${String(turn)}:step:${String(step)}`,
          parentSpanId: parent,
          blueprintNodeId: 'agent-phase', kind: 'agent-phase',
          label: `Step ${String(step)}`, event,
        })
        steps.set(key, span)
        const model = builder.add({
          spanId: `${span.spanId}:model`, parentSpanId: span.spanId,
          blueprintNodeId: backend === 'codex-app-server' ? 'codex-turn-stream' : 'model',
          kind: 'model', label: backend === 'codex-app-server' ? 'Codex model stream' : 'Model request', event,
        })
        models.set(key, model)
        break
      }
      case 'request/header': {
        const config = record(record(data.header)?.config)
        const model = safeIdentity(config?.model)
        const route = safeIdentity(config?.provider)
        const span = currentTurn === null || currentStep === null
          ? undefined : models.get(stepKey(currentTurn, currentStep))
        if (span !== undefined) {
          span.safeFacts = {
            ...(route === null ? {} : { provider: fact(route, EVIDENCE.authoritative, [sourceRef(event, sessionId, backend)]) }),
            ...(model === null ? {} : { model: fact(model, EVIDENCE.authoritative, [sourceRef(event, sessionId, backend)]) }),
          }
          span.sources = uniqueSources([...span.sources, sourceRef(event, sessionId, backend)])
        }
        break
      }
      case 'assistant/message': {
        if (turn === null || step === null) { builder.diagnose('malformed-assistant-message'); break }
        const model = models.get(stepKey(turn, step))
        builder.close(model, event, data.interrupted === true ? 'interrupted' : 'completed')
        const usage = normalizedUsage(data.usage)
        if (usage !== null && model !== undefined) {
          const ref = sourceRef(event, sessionId, backend)
          model.usage = fact(usage, EVIDENCE.authoritative, [ref])
          sessionUsage = addUsage(sessionUsage, usage)
          usageSources.push(ref)
        }
        break
      }
      case 'step/end': {
        if (turn === null || step === null) { builder.diagnose('malformed-step-end'); break }
        const key = stepKey(turn, step)
        builder.close(steps.get(key), event, 'completed')
        const model = models.get(key)
        if (model?.status.value === 'active') builder.close(model, event, 'unknown')
        if (currentTurn === turn && currentStep === step) currentStep = null
        break
      }
      case 'tool/call': {
        if (turn === null || step === null || typeof data.callId !== 'string') {
          builder.diagnose('malformed-tool-call'); break
        }
        const name = safeIdentity(data.name, 'tool')
        const span = builder.add({
          spanId: `turn:${String(turn)}:step:${String(step)}:tool:${stableKey(data.callId)}`,
          parentSpanId: toolParent(turn, step),
          blueprintNodeId: backend === 'codex-app-server' ? 'dsh-tool-bridge' : 'tool',
          kind: 'tool', label: `Tool · ${name}`, event,
        })
        span.safeFacts = { tool: fact(name, EVIDENCE.authoritative, [sourceRef(event, sessionId, backend)]) }
        tools.set(data.callId, span)
        break
      }
      case 'tool/result': {
        const callId = resultCallId(data)
        if (callId === null) { builder.diagnose('malformed-tool-result'); break }
        const appRef = codexSourceRef(event, sessionId, backend)
        const span = tools.get(callId)
        if (span === undefined) builder.diagnose('unmatched-tool-result')
        builder.close(span, event, resultIsError(data) ? 'failed' : 'completed', appRef === null ? [] : [appRef])
        break
      }
      case 'approval/asked': {
        if (typeof data.id !== 'string') { builder.diagnose('malformed-approval-asked'); break }
        const tool = typeof data.callId === 'string' ? tools.get(data.callId) : undefined
        const name = safeIdentity(data.toolName, 'tool')
        const span = builder.add({
          spanId: `approval:${stableKey(data.id)}`,
          parentSpanId: tool?.spanId ?? currentParent(),
          parentEvidence: tool === undefined ? EVIDENCE.inferred : EVIDENCE.derived,
          blueprintNodeId: 'approval', kind: 'approval', label: `Approval · ${name}`, event,
        })
        span.safeFacts = { tool: fact(name, EVIDENCE.authoritative, [sourceRef(event, sessionId, backend)]) }
        approvals.set(data.id, span)
        break
      }
      case 'approval/decided': {
        if (typeof data.id !== 'string') { builder.diagnose('malformed-approval-decided'); break }
        const span = approvals.get(data.id)
        const outcome = safeIdentity(data.outcome, 'unavailable')
        const status = outcome === 'allowed-once' ? 'completed'
          : outcome === 'cancelled' ? 'cancelled' : 'failed'
        builder.close(span, event, status)
        if (span === undefined) builder.diagnose('unmatched-approval-decision')
        else span.safeFacts = {
          ...span.safeFacts,
          outcome: fact(outcome, EVIDENCE.authoritative, [sourceRef(event, sessionId, backend)]),
        }
        break
      }
      case 'tool/code-dispatch-start': {
        if (typeof data.subCallId !== 'string') { builder.diagnose('malformed-code-dispatch'); break }
        const parent = typeof data.parentCallId === 'string' ? tools.get(data.parentCallId) : undefined
        const name = safeIdentity(data.name, 'tool')
        const span = builder.add({
          spanId: `ptc-tool:${stableKey(data.subCallId)}`,
          parentSpanId: parent?.spanId ?? currentParent(),
          parentEvidence: parent === undefined ? EVIDENCE.inferred : EVIDENCE.derived,
          blueprintNodeId: 'tool', kind: 'tool', label: `PTC tool · ${name}`, event,
        })
        span.safeFacts = { tool: fact(name, EVIDENCE.authoritative, [sourceRef(event, sessionId, backend)]) }
        tools.set(data.subCallId, span)
        break
      }
      case 'tool/code-dispatch': {
        if (typeof data.subCallId !== 'string') { builder.diagnose('malformed-code-dispatch-result'); break }
        builder.close(tools.get(data.subCallId), event, data.isError === true ? 'failed' : 'completed')
        break
      }
      case 'compaction/start': {
        if (typeof data.compactionId !== 'string') { builder.diagnose('malformed-compaction-start'); break }
        const parent = turn === null ? sessionSpan.spanId : turns.get(turn)?.spanId ?? sessionSpan.spanId
        const span = builder.add({
          spanId: `compaction:${stableKey(data.compactionId)}`, parentSpanId: parent,
          blueprintNodeId: 'compaction', kind: 'compaction', label: 'Compaction', event,
        })
        compactions.set(data.compactionId, span)
        break
      }
      case 'compaction/summary': {
        if (typeof data.compactionId !== 'string') break
        const span = compactions.get(data.compactionId)
        const usage = normalizedUsage(data.usage)
        if (usage !== null && span !== undefined) {
          const ref = sourceRef(event, sessionId, backend)
          span.usage = fact(usage, EVIDENCE.authoritative, [ref])
          sessionUsage = addUsage(sessionUsage, usage)
          usageSources.push(ref)
        }
        break
      }
      case 'compaction/end': {
        if (typeof data.compactionId !== 'string') { builder.diagnose('malformed-compaction-end'); break }
        builder.close(compactions.get(data.compactionId), event, data.error === undefined ? 'completed' : 'failed')
        break
      }
      case 'llm/retry': {
        if (typeof data.retryId !== 'string') { builder.diagnose('malformed-retry'); break }
        const parent = turn === null || step === null ? currentParent() : models.get(stepKey(turn, step))?.spanId ?? currentParent()
        const span = builder.add({
          spanId: `retry:${stableKey(data.retryId)}:${String(integer(data.retry) ?? 0)}`,
          parentSpanId: parent, blueprintNodeId: 'retry', kind: 'retry',
          label: `Retry ${String(integer(data.retry) ?? 0)}`, event,
        })
        retries.set(`${data.retryId}:${String(integer(data.retry) ?? 0)}`, span)
        break
      }
      case 'llm/retry-started': {
        if (typeof data.retryId !== 'string') { builder.diagnose('malformed-retry-started'); break }
        builder.close(retries.get(`${data.retryId}:${String(integer(data.retry) ?? 0)}`), event, 'completed')
        break
      }
      case 'subagent/descriptor': {
        const providerName = safeIdentity(data.provider, 'subagent')
        const span = builder.add({
          spanId: `subagent:${stableKey(`${String(event.seq)}:${providerName}`)}`,
          parentSpanId: sessionSpan.spanId, parentEvidence: EVIDENCE.inferred,
          blueprintNodeId: 'subagent', kind: 'subagent', label: `Subagent · ${providerName}`, event,
        })
        builder.close(span, event, 'completed')
        break
      }
      case 'tool-workflow/run-start': {
        if (typeof data.runId !== 'string') { builder.diagnose('malformed-workflow-start'); break }
        const name = safeIdentity(data.name, 'workflow')
        const span = builder.add({
          spanId: `workflow:${stableKey(data.runId)}`, parentSpanId: currentParent(),
          parentEvidence: EVIDENCE.inferred, blueprintNodeId: 'agent-phase',
          kind: 'agent-phase', label: `Workflow · ${name}`, event,
        })
        workflows.set(data.runId, span)
        break
      }
      case 'tool-workflow/run-end': {
        if (typeof data.runId !== 'string') { builder.diagnose('malformed-workflow-end'); break }
        const reason = record(data.stopReason)?.kind ?? data.stopReason
        builder.close(workflows.get(data.runId), event, reason === 'completed' ? 'completed' : 'failed')
        break
      }
      case 'tool-workflow/agent-start': {
        if (typeof data.runId !== 'string' || integer(data.seq) === null) {
          builder.diagnose('malformed-workflow-agent-start'); break
        }
        const label = safeIdentity(data.label, 'agent')
        const span = builder.add({
          spanId: `workflow:${stableKey(data.runId)}:agent:${String(data.seq)}`,
          parentSpanId: workflows.get(data.runId)?.spanId ?? currentParent(),
          parentEvidence: workflows.has(data.runId) ? EVIDENCE.derived : EVIDENCE.inferred,
          blueprintNodeId: 'subagent', kind: 'subagent', label: `Agent · ${label}`, event,
        })
        const childId = safeIdentity(data.childId)
        if (childId !== null) span.safeFacts = {
          childSessionId: fact(childId, EVIDENCE.authoritative, [sourceRef(event, sessionId, backend)]),
        }
        workflowMembers.set(`${data.runId}:${String(data.seq)}`, span)
        break
      }
      case 'tool-workflow/agent-end': {
        if (typeof data.runId !== 'string' || integer(data.seq) === null) {
          builder.diagnose('malformed-workflow-agent-end'); break
        }
        const outcome = record(data.outcome)?.kind ?? data.outcome
        builder.close(
          workflowMembers.get(`${data.runId}:${String(data.seq)}`),
          event,
          outcome === 'completed' ? 'completed' : outcome === 'cancelled' ? 'cancelled' : 'failed',
        )
        break
      }
    }
  }

  const throughSeq = events.reduce((max, event) => Math.max(max, integer(event.seq) ?? -1), -1)
  const active = builder.spans.filter(span => span.status.value === 'active')
  const lastTurn = [...turns.values()].at(-1)
  const sessionStatus = active.some(span => span.kind === 'turn') || input.running === true
    ? 'active'
    : lastTurn?.status.value ?? 'unknown'
  const statusSources = lastTurn?.status.sources ?? sessionSpan.status.sources
  sessionSpan.status = fact(sessionStatus, lastTurn === undefined ? EVIDENCE.inferred : EVIDENCE.derived, statusSources)
  const lastEvent = events.at(-1)
  if (sessionStatus !== 'active' && lastEvent !== undefined && integer(lastEvent.time) !== null) {
    sessionSpan.endedAt = fact(lastEvent.time, EVIDENCE.derived, [sourceRef(lastEvent, sessionId, backend)])
    if (sessionSpan.startedAt !== undefined) sessionSpan.durationMs = fact(
      Math.max(0, lastEvent.time - sessionSpan.startedAt.value),
      EVIDENCE.derived,
      uniqueSources([...sessionSpan.startedAt.sources, sourceRef(lastEvent, sessionId, backend)]),
    )
  }
  if (Object.keys(sessionUsage).length > 0) {
    sessionSpan.usage = fact(sessionUsage, EVIDENCE.derived, usageSources)
  }
  if (provider !== null) sessionSpan.safeFacts = {
    ...sessionSpan.safeFacts,
    provider: fact(provider, EVIDENCE.authoritative, events
      .filter(event => event.type === 'request/header')
      .map(event => sourceRef(event, sessionId, backend))),
  }

  if (input.hasMore === true) builder.diagnose('history-window-truncated')
  if (backend === 'codex-app-server') {
    builder.diagnose('app-server-item-lifecycle-partial')
    if (Object.keys(sessionUsage).length === 0) builder.diagnose('app-server-usage-not-durable')
  }
  const incomplete = input.hasMore === true
    || diagnostics.some(item => item.code.includes('malformed') || item.code.includes('unmatched'))
    || backend === 'codex-app-server'
  const activeDepth = (span) => {
    let depth = 0
    let cursor = span.parentSpanId
    const seen = new Set()
    while (cursor !== undefined && !seen.has(cursor) && depth < 32) {
      seen.add(cursor)
      depth += 1
      cursor = builder.byId.get(cursor)?.parentSpanId
    }
    return depth
  }
  const activeSpans = builder.spans
    .filter(span => span.status.value === 'active')
    .sort((left, right) => {
      const time = (right.startedAt?.value ?? 0) - (left.startedAt?.value ?? 0)
      return time !== 0 ? time : activeDepth(right) - activeDepth(left)
    })

  return {
    schemaVersion: LOOP_TRACE_SCHEMA_VERSION,
    traceId: `loop:${stableKey(sessionId)}:${backend}`,
    sessionId,
    backend,
    mode: safeIdentity(input.mode, null),
    blueprint,
    throughSeq,
    completeness: incomplete ? 'partial' : events.length === 0 ? 'unavailable' : 'complete',
    spans: builder.spans,
    activeSpanIds: activeSpans.map(span => span.spanId),
    currentSpanId: activeSpans[0]?.spanId ?? null,
    diagnostics,
  }
}

/**
 * Pure, fail-soft projection from one authoritative DSH Session event window.
 * The returned value contains only allowlisted identity, lifecycle, duration,
 * usage, and outcome facts; event payload text never crosses the boundary.
 */
export function projectLoopTrace(input = {}) {
  try {
    return project(record(input) ?? {})
  } catch {
    const sessionId = `session-${stableKey('unavailable')}`
    return {
      schemaVersion: LOOP_TRACE_SCHEMA_VERSION,
      traceId: `loop:${stableKey(sessionId)}:unavailable`,
      sessionId,
      backend: 'unavailable',
      mode: null,
      blueprint: { id: 'unavailable', revision: 0, digest: 'unavailable' },
      throughSeq: -1,
      completeness: 'unavailable',
      spans: [],
      activeSpanIds: [],
      currentSpanId: null,
      diagnostics: [{ code: 'projector-failed', message: 'projector-failed' }],
    }
  }
}
