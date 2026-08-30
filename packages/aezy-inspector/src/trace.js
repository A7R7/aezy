export const LOOP_TRACE_SCHEMA_VERSION = 1

export const EVIDENCE = Object.freeze({
  authoritative: 'authoritative',
  derived: 'derived',
  inferred: 'inferred',
})

const DSH_REVISION = 'dsh-v0.1.2-alpha.1@cd5ef8148158c3a752a658978873241fdf8e2bbc'
const CODEX_REVISION = '@openai/codex@0.149.0'

function ref(authority, owner, symbol, revision, path) {
  return Object.freeze({ authority, owner, symbol, revision, path })
}

const DSH_LOOP = ref('upstream-source', '@deepseek-ai/dsh-agent-loop', 'ReactLoopAgent', DSH_REVISION, 'packages/core/agent-loop/src/agent.ts')
const DSH_TOOLS = ref('upstream-source', '@deepseek-ai/dsh-tools', 'Tools execution pipeline', DSH_REVISION, 'packages/core/tools/README.md')
const DSH_APPROVAL = ref('upstream-source', '@deepseek-ai/dsh-user-approval', 'UserApproval.request', DSH_REVISION, 'packages/interaction/user-approval/src/index.ts')
const DSH_RETRY = ref('upstream-source', '@deepseek-ai/dsh-llm-retry', 'agent/request-error recovery', DSH_REVISION, 'packages/llm/llm-retry/README.md')
const DSH_COMPACTION = ref('upstream-source', '@deepseek-ai/dsh-compaction', 'CompactionEngine', DSH_REVISION, 'packages/compaction/compaction/README.md')
const DSH_SUBAGENT = ref('upstream-source', '@deepseek-ai/dsh-subagent', 'Subagent provider/continuation', DSH_REVISION, 'packages/subagent/subagent/README.md')
const CODEX_PROTOCOL = ref('public-protocol', '@openai/codex', 'App Server JSON-RPC', CODEX_REVISION, 'app-server')
const AEZY_CODEX = ref('adapter-source', '@aezy/codex', 'CodexDshAdapter', 'workspace', 'packages/aezy-codex/src/dsh-adapter.js')

function node(id, kind, label, owner, description, x, y, sourceRefs, runtime = undefined, opaque = false) {
  return Object.freeze({
    id, kind, label, owner, description,
    position: Object.freeze({ x, y }),
    sourceRefs: Object.freeze(sourceRefs),
    ...(runtime === undefined ? {} : { runtime: Object.freeze({
      spanNodeIds: Object.freeze(runtime.spanNodeIds),
      ...(runtime.statuses === undefined ? {} : { statuses: Object.freeze(runtime.statuses) }),
    }) }),
    ...(opaque ? { opaque: true } : {}),
  })
}

function edge(id, from, to, kind, label, guard, sourceRefs) {
  return Object.freeze({ id, from, to, kind, label, guard, sourceRefs: Object.freeze(sourceRefs) })
}

function blueprint(value) {
  return Object.freeze({ ...value, nodes: Object.freeze(value.nodes), edges: Object.freeze(value.edges) })
}

export function canonicalBlueprint(blueprintValue) {
  return JSON.stringify({
    id: blueprintValue.id,
    revision: blueprintValue.revision,
    title: blueprintValue.title,
    description: blueprintValue.description,
    canvas: blueprintValue.canvas,
    nodes: blueprintValue.nodes,
    edges: blueprintValue.edges,
  })
}

export const LOOP_BLUEPRINTS = Object.freeze({
  'dsh-native': blueprint({
    id: 'dsh-native',
    revision: 2,
    title: 'DSH native agent loop',
    description: 'Static control flow owned by the DSH Agent and composed tool, retry, approval, compaction, and Subagent services.',
    canvas: Object.freeze({ width: 1160, height: 790, nodeWidth: 180, nodeHeight: 86 }),
    nodes: [
      node('inbox', 'boundary', 'Queued input', 'DSH Agent / Inbox', 'Follow-up and steering input waits in the Session-backed inbox.', 28, 32, [DSH_LOOP], { spanNodeIds: ['session'] }),
      node('turn-boundary', 'boundary', 'Open Turn', 'DSH Agent', 'A waking input opens one durable turn/start boundary.', 248, 32, [DSH_LOOP], { spanNodeIds: ['turn'] }),
      node('pre-step', 'phase', 'Claim + assemble context', 'DSH Agent / system prompt', 'Claim the target inbox, assemble prompt sections, and run the pre-step waterfall.', 468, 32, [DSH_LOOP], { spanNodeIds: ['agent-phase'] }),
      node('model-request', 'model', 'Build + stream model request', 'DSH Agent / LLM adapter', 'Resolve the provider route, append the request header, stream blocks, and durably append the assistant message.', 688, 32, [DSH_LOOP], { spanNodeIds: ['model'] }),
      node('response-decision', 'decision', 'Tool calls?', 'DSH Agent', 'A completed assistant message either ends the step or yields ordered tool calls.', 908, 32, [DSH_LOOP], { spanNodeIds: ['model'], statuses: ['completed'] }),
      node('model-retry', 'retry', 'Provider retry/backoff', 'DSH LLM retry', 'A retry decision records durable scheduling and re-enters the same model step.', 688, 188, [DSH_LOOP, DSH_RETRY], { spanNodeIds: ['retry'] }),
      node('tool-scheduler', 'tool', 'Schedule tool calls', 'DSH Agent tool scheduler', 'Exclusive calls form barriers; parallel calls run in a bounded rolling pool and commit in model order.', 908, 250, [DSH_LOOP, DSH_TOOLS], { spanNodeIds: ['tool'] }),
      node('approval-gate', 'approval', 'Security + approval gate', 'DSH tools / approval', 'Pre-execute policy and monotonic guards may deny or request a fail-closed human decision.', 688, 406, [DSH_TOOLS, DSH_APPROVAL], { spanNodeIds: ['approval'] }),
      node('tool-pipeline', 'tool', 'Execute + finalize tool', 'DSH tools', 'Dispatch through execute wrappers, post-process, finalize content, and freeze the result.', 908, 406, [DSH_TOOLS], { spanNodeIds: ['tool'] }),
      node('subagent', 'subagent', 'Subagent-owned child loop', 'DSH Subagent', 'A Subagent tool may create or resume a separately owned child Session and later return its result.', 688, 562, [DSH_SUBAGENT, DSH_TOOLS], { spanNodeIds: ['subagent'] }),
      node('result-context', 'phase', 'Commit result + next-step context', 'DSH Agent / Session', 'Append tool/result in model order and stage additional context for the next step.', 908, 562, [DSH_LOOP, DSH_TOOLS], { spanNodeIds: ['tool'], statuses: ['completed', 'failed', 'cancelled', 'interrupted'] }),
      node('compaction', 'compaction', 'Compaction checkpoint', 'DSH Compaction backend', 'Pressure or context-overflow recovery replaces a balanced surface range under a durable bracket.', 468, 250, [DSH_COMPACTION], { spanNodeIds: ['compaction'] }),
      node('finalize', 'finalize', 'Finalize Turn', 'DSH Agent', 'No pending next-step input remains; run the stopping hook and choose the structured end reason.', 468, 650, [DSH_LOOP], { spanNodeIds: ['turn'], statuses: ['completed', 'failed', 'cancelled', 'interrupted'] }),
      node('turn-end', 'boundary', 'Durable turn/end', 'DSH Agent / Session', 'Append turn/end, then return idle or claim queued work in a new Turn.', 248, 650, [DSH_LOOP], { spanNodeIds: ['turn'], statuses: ['completed', 'failed', 'cancelled', 'interrupted'] }),
    ],
    edges: [
      edge('input-opens-turn', 'inbox', 'turn-boundary', 'normal', 'wakeup', 'queued input is claimed', [DSH_LOOP]),
      edge('turn-enters-step', 'turn-boundary', 'pre-step', 'normal', 'next-turn', 'turn is open', [DSH_LOOP]),
      edge('step-requests-model', 'pre-step', 'model-request', 'normal', 'enter', 'pre-step accepts', [DSH_LOOP]),
      edge('step-blocked', 'pre-step', 'finalize', 'branch', 'blocked', 'pre-step rejects', [DSH_LOOP]),
      edge('request-yields-response', 'model-request', 'response-decision', 'normal', 'assistant message', 'stream completes', [DSH_LOOP]),
      edge('request-retries', 'model-request', 'model-retry', 'retry', 'retryable error', 'request-error returns retry', [DSH_LOOP, DSH_RETRY]),
      edge('retry-model', 'model-retry', 'model-request', 'loop-back', 'same step', 'backoff completes', [DSH_RETRY]),
      edge('context-overflow', 'model-request', 'compaction', 'branch', 'context overflow', 'compaction recovery accepts', [DSH_COMPACTION]),
      edge('compaction-rebuilds', 'compaction', 'pre-step', 'loop-back', 'rebuild context', 'checkpoint commits', [DSH_COMPACTION]),
      edge('response-final', 'response-decision', 'finalize', 'branch', 'no tool calls', 'assistant response is terminal', [DSH_LOOP]),
      edge('response-tools', 'response-decision', 'tool-scheduler', 'branch', 'tool calls', 'assistant response contains tool calls', [DSH_LOOP]),
      edge('scheduler-gates', 'tool-scheduler', 'approval-gate', 'branch', 'ask / guard', 'tool policy requires decision', [DSH_TOOLS, DSH_APPROVAL]),
      edge('scheduler-executes', 'tool-scheduler', 'tool-pipeline', 'branch', 'allow', 'no approval is required', [DSH_TOOLS]),
      edge('approval-executes', 'approval-gate', 'tool-pipeline', 'branch', 'allowed once', 'approval grants this action', [DSH_APPROVAL, DSH_TOOLS]),
      edge('approval-denies', 'approval-gate', 'result-context', 'branch', 'deny / cancel', 'gate returns a fail-closed tool outcome', [DSH_APPROVAL, DSH_TOOLS]),
      edge('tool-spawns-child', 'tool-pipeline', 'subagent', 'branch', 'Subagent tool', 'selected tool delegates', [DSH_SUBAGENT, DSH_TOOLS]),
      edge('tool-commits-result', 'tool-pipeline', 'result-context', 'normal', 'result', 'dispatch settles', [DSH_LOOP, DSH_TOOLS]),
      edge('child-commits-result', 'subagent', 'result-context', 'normal', 'settlement', 'child publishes an outcome', [DSH_SUBAGENT]),
      edge('result-loops-step', 'result-context', 'pre-step', 'loop-back', 'next step', 'tool does not conclude Turn', [DSH_LOOP]),
      edge('result-concludes', 'result-context', 'finalize', 'branch', 'concludes Turn', 'tool result concludes Turn', [DSH_LOOP]),
      edge('finalize-ends', 'finalize', 'turn-end', 'normal', 'end reason', 'Turn converges', [DSH_LOOP]),
      edge('next-turn', 'turn-end', 'turn-boundary', 'loop-back', 'queued follow-up', 'inbox still has pending input', [DSH_LOOP]),
    ],
    digest: 'sha256:33dfdb3bb1ef190eeaddb04045328a3e557c17703a5b5c7456eb83615c553d3a',
  }),
  'codex-app-server': blueprint({
    id: 'codex-app-server',
    revision: 2,
    title: 'Codex App Server through DSH',
    description: 'Static public protocol and security bridge. The official Codex agent core remains intentionally opaque.',
    canvas: Object.freeze({ width: 1160, height: 790, nodeWidth: 180, nodeHeight: 86 }),
    nodes: [
      node('dsh-turn', 'boundary', 'DSH Turn + step', 'DSH Agent / Session', 'DSH owns the visible durable Turn, step, request header, and final assistant projection.', 28, 32, [DSH_LOOP, AEZY_CODEX], { spanNodeIds: ['turn', 'agent-phase'] }),
      node('thread-binding', 'phase', 'Bind or resume Thread', 'Aezy Codex adapter', 'Resolve the durable Session-to-Thread binding, then call thread/start or thread/resume.', 248, 32, [AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ['agent-phase'] }),
      node('codex-turn-start', 'phase', 'Start Codex Turn', 'Codex App Server protocol', 'Call turn/start with the selected model, read-only native permissions, dynamic DSH tools, and DSH instructions.', 468, 32, [AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ['codex-turn-stream'] }),
      node('codex-agent-core', 'opaque', 'Official Codex agent core', 'Codex App Server', 'Private model/tool/compaction/subagent micro-loop is not exposed by the public protocol and is not inferred.', 688, 32, [CODEX_PROTOCOL], { spanNodeIds: ['codex-turn-stream'] }, true),
      node('public-item-stream', 'decision', 'Public item / request stream', 'Codex App Server protocol', 'Observe documented item deltas/completions, interaction requests, and turn completion.', 908, 32, [AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ['codex-turn-stream'] }),
      node('assistant-projection', 'phase', 'Project assistant output', 'Aezy Codex adapter / DSH Session', 'Translate public message/reasoning blocks into the current DSH stream without persisting private reasoning text in Inspector.', 908, 188, [AEZY_CODEX], { spanNodeIds: ['codex-turn-stream'], statuses: ['completed'] }),
      node('native-permission', 'approval', 'Decline native escalation', 'Aezy Codex adapter', 'Codex-native command/file/permission escalation stays read-only and is declined fail-closed.', 688, 250, [AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ['dsh-tool-bridge'] }),
      node('dsh-tool-bridge', 'tool', 'Map dsh.* dynamic tool', 'Aezy Codex adapter', 'Validate active Thread/Turn ownership and map the public dynamic-tool request to the current DSH tool registry.', 908, 344, [AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ['dsh-tool-bridge'] }),
      node('dsh-security-approval', 'approval', 'DSH Security + approval', 'DSH tools / approval', 'DSH policy, monotonic guards, and approval retain authority over mutable actions.', 688, 500, [DSH_TOOLS, DSH_APPROVAL, AEZY_CODEX], { spanNodeIds: ['approval'] }),
      node('dsh-tool-execution', 'tool', 'Execute DSH tool', 'DSH tools', 'Execute and finalize through the existing DSH tool pipeline; no second tool runtime is introduced.', 908, 500, [DSH_TOOLS, AEZY_CODEX], { spanNodeIds: ['dsh-tool-bridge'] }),
      node('codex-tool-result', 'phase', 'Return dynamic tool result', 'Aezy Codex adapter / App Server', 'Append the DSH tool result with allowlisted Codex identity, then answer the pending App Server request.', 908, 656, [AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ['dsh-tool-bridge'], statuses: ['completed', 'failed', 'cancelled', 'interrupted'] }),
      node('interrupt', 'boundary', 'Interrupt Codex Turn', 'Aezy Codex adapter / App Server', 'A DSH abort calls turn/interrupt and closes the DSH stream as aborted.', 468, 500, [AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ['codex-turn-stream'], statuses: ['cancelled', 'interrupted', 'failed'] }),
      node('dsh-finalize', 'finalize', 'Finalize DSH Turn', 'DSH Agent / Session', 'turn/completed or interruption closes the provider stream; DSH appends its durable assistant/step/turn outcome.', 248, 656, [DSH_LOOP, AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ['turn'], statuses: ['completed', 'failed', 'cancelled', 'interrupted'] }),
    ],
    edges: [
      edge('dsh-binds-thread', 'dsh-turn', 'thread-binding', 'normal', 'provider request', 'preset and route gate pass', [DSH_LOOP, AEZY_CODEX]),
      edge('binding-starts-turn', 'thread-binding', 'codex-turn-start', 'normal', 'thread ready', 'binding matches cwd/model', [AEZY_CODEX, CODEX_PROTOCOL]),
      edge('turn-enters-core', 'codex-turn-start', 'codex-agent-core', 'normal', 'turn/start', 'App Server accepts Turn', [CODEX_PROTOCOL]),
      edge('core-emits-public', 'codex-agent-core', 'public-item-stream', 'normal', 'public events', 'protocol emits an item or request', [CODEX_PROTOCOL]),
      edge('stream-projects-output', 'public-item-stream', 'assistant-projection', 'branch', 'message / completed', 'public assistant item or turn completes', [AEZY_CODEX, CODEX_PROTOCOL]),
      edge('stream-requests-tool', 'public-item-stream', 'dsh-tool-bridge', 'branch', 'dsh.* dynamic tool', 'request targets an advertised DSH tool', [AEZY_CODEX, CODEX_PROTOCOL]),
      edge('stream-requests-native', 'public-item-stream', 'native-permission', 'branch', 'native escalation', 'request would leave the DSH boundary', [AEZY_CODEX, CODEX_PROTOCOL]),
      edge('native-declined', 'native-permission', 'codex-agent-core', 'loop-back', 'decline', 'fail-closed response returns to Codex', [AEZY_CODEX, CODEX_PROTOCOL]),
      edge('bridge-enters-security', 'dsh-tool-bridge', 'dsh-security-approval', 'normal', 'pre-execute', 'active ownership and namespace validate', [AEZY_CODEX, DSH_TOOLS]),
      edge('security-executes', 'dsh-security-approval', 'dsh-tool-execution', 'branch', 'allowed', 'DSH gate permits action', [DSH_TOOLS, DSH_APPROVAL]),
      edge('security-denies', 'dsh-security-approval', 'codex-tool-result', 'branch', 'deny / cancel', 'DSH returns fail-closed outcome', [DSH_TOOLS, DSH_APPROVAL]),
      edge('tool-returns-result', 'dsh-tool-execution', 'codex-tool-result', 'normal', 'frozen result', 'DSH tool settles', [DSH_TOOLS, AEZY_CODEX]),
      edge('result-reenters-core', 'codex-tool-result', 'codex-agent-core', 'loop-back', 'JSON-RPC response', 'adapter still owns active Thread/Turn', [AEZY_CODEX, CODEX_PROTOCOL]),
      edge('output-finalizes-dsh', 'assistant-projection', 'dsh-finalize', 'normal', 'turn/completed', 'provider stream closes', [AEZY_CODEX, CODEX_PROTOCOL, DSH_LOOP]),
      edge('turn-interrupts', 'codex-agent-core', 'interrupt', 'cancel', 'abort', 'DSH signal aborts', [AEZY_CODEX, CODEX_PROTOCOL]),
      edge('interrupt-finalizes', 'interrupt', 'dsh-finalize', 'normal', 'aborted', 'interrupt response or containment completes', [AEZY_CODEX, DSH_LOOP]),
    ],
    digest: 'sha256:78eb8734567de7cf00aa35899a817699a362fa327b329f98dd3c3317c6a9693b',
  }),
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
      && !['retry-model', 'compaction-rebuilds', 'native-declined', 'result-reenters-core'].includes(edgeValue.id)
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
