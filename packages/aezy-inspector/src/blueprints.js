const DSH_REVISION = 'dsh-v0.1.2-alpha.4@4e84901e6471b79ec0338099867ebb4606d12bb5'
const CODEX_SOURCE_REVISION = 'rust-v0.149.0@758ef40f50c1a458425c7cfbf1eb12cbc07af0b0'
const CODEX_PROTOCOL_REVISION = '@openai/codex@0.149.0'

function ref(authority, owner, symbol, revision, path) {
  return Object.freeze({ authority, owner, symbol, revision, path })
}

const DSH_LOOP = ref('upstream-source', '@deepseek-ai/dsh-agent-loop', 'ReactLoopAgent', DSH_REVISION, 'packages/core/agent-loop/src/agent.ts')
const DSH_SCHEDULER = ref('upstream-source', '@deepseek-ai/dsh-agent-loop', 'executeToolCalls / runGroup', DSH_REVISION, 'packages/core/agent-loop/src/tool-calls.ts')
const DSH_TOOLS = ref('upstream-source', '@deepseek-ai/dsh-tools', 'ToolRuntime scheduler pipeline', DSH_REVISION, 'packages/core/tools/src/index.ts')
const DSH_APPROVAL = ref('upstream-source', '@deepseek-ai/dsh-user-approval', 'ApprovalService.request', DSH_REVISION, 'packages/interaction/user-approval/src/index.ts')
const DSH_COMPACTION = ref('upstream-source', '@deepseek-ai/dsh-compaction', 'CompactionEngine', DSH_REVISION, 'packages/compaction/compaction/src/index.ts')
const DSH_SUBAGENT = ref('upstream-source', '@deepseek-ai/dsh-subagent', 'Subagent provider / continuation', DSH_REVISION, 'packages/subagent/subagent/README.md')

const CODEX_TURN = ref('upstream-source', '@openai/codex-core', 'run_turn / run_sampling_request', CODEX_SOURCE_REVISION, 'codex-rs/core/src/session/turn.rs')
const CODEX_REGULAR_TASK = ref('upstream-source', '@openai/codex-core', 'RegularTask::run', CODEX_SOURCE_REVISION, 'codex-rs/core/src/tasks/regular.rs')
const CODEX_TOOL_RUNTIME = ref('upstream-source', '@openai/codex-core', 'ToolCallRuntime', CODEX_SOURCE_REVISION, 'codex-rs/core/src/tools/parallel.rs')
const CODEX_TOOL_ROUTER = ref('upstream-source', '@openai/codex-core', 'ToolRouter', CODEX_SOURCE_REVISION, 'codex-rs/core/src/tools/router.rs')
const CODEX_COMPACTION = ref('upstream-source', '@openai/codex-core', 'run_inline_auto_compact_task', CODEX_SOURCE_REVISION, 'codex-rs/core/src/compact.rs')
const CODEX_SUBAGENT = ref('upstream-source', '@openai/codex-core', 'AgentControl::spawn_agent', CODEX_SOURCE_REVISION, 'codex-rs/core/src/agent/control/spawn.rs')
const CODEX_APP_SERVER = ref('upstream-source', '@openai/codex-app-server', 'turn/item JSON-RPC bridge', CODEX_SOURCE_REVISION, 'codex-rs/app-server/src/bespoke_event_handling.rs')
const CODEX_PROTOCOL = ref('public-protocol', '@openai/codex', 'App Server JSON-RPC', CODEX_PROTOCOL_REVISION, 'codex-rs/app-server/README.md')
const AEZY_CODEX = ref('adapter-source', '@aezy/codex', 'AezyCodexAdapter', 'workspace', 'packages/aezy-codex/src/dsh-adapter.js')

function lane(id, label, owner, y, height, sourceRefs) {
  return Object.freeze({ id, label, owner, bounds: Object.freeze({ x: 16, y, width: 1448, height }), sourceRefs: Object.freeze(sourceRefs) })
}

function node(id, laneId, kind, label, owner, description, x, y, sourceRefs, runtime = undefined, opaque = false) {
  return Object.freeze({
    id, laneId, kind, label, owner, description,
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
  return Object.freeze({
    ...value,
    lanes: Object.freeze(value.lanes),
    nodes: Object.freeze(value.nodes),
    edges: Object.freeze(value.edges),
  })
}

export function canonicalBlueprint(value) {
  return JSON.stringify({
    id: value.id,
    revision: value.revision,
    title: value.title,
    description: value.description,
    canvas: value.canvas,
    lanes: value.lanes,
    nodes: value.nodes,
    edges: value.edges,
  })
}

const dshNative = blueprint({
  id: 'dsh-native',
  revision: 3,
  title: 'DSH native agent loop · full logic',
  description: 'Pinned DSH control flow with explicit inbox, request, retry, compaction, concurrency, approval, tool finalization, Subagent, cancellation, and durable boundaries.',
  canvas: Object.freeze({ width: 1480, height: 1220, nodeWidth: 184, nodeHeight: 70 }),
  lanes: [
    lane('dsh-session', 'Session / Inbox', 'DSH Session + Agent Inbox', 16, 174, [DSH_LOOP]),
    lane('dsh-agent', 'Turn / Step control', 'DSH ReactLoopAgent', 202, 220, [DSH_LOOP]),
    lane('dsh-model', 'Context / Model request', 'DSH Agent + LLM adapter', 434, 220, [DSH_LOOP]),
    lane('dsh-tools', 'Tool scheduler / execution pipeline', 'DSH Agent scheduler + ToolRuntime', 666, 332, [DSH_SCHEDULER, DSH_TOOLS]),
    lane('dsh-services', 'Recovery / child loop / durable convergence', 'DSH composed services', 1010, 194, [DSH_COMPACTION, DSH_SUBAGENT, DSH_LOOP]),
  ],
  nodes: [
    node('dsh-session-idle', 'dsh-session', 'boundary', 'Session idle / running', 'DSH Agent', 'One driver owns the Session phase; wakeups latch behind maintenance or an aborted activity.', 36, 72, [DSH_LOOP], { spanNodeIds: ['session'] }),
    node('dsh-inbox-route', 'dsh-session', 'decision', 'Route input target', 'DSH Agent Inbox', 'Follow-up targets next-turn; steer/inject target next-step; waking input after abort is reclassified to next-turn.', 248, 72, [DSH_LOOP]),
    node('dsh-turn-start', 'dsh-session', 'boundary', 'Append turn/start', 'DSH Agent / Session', 'Open exactly one durable Turn before claiming the first proposed step.', 460, 72, [DSH_LOOP], { spanNodeIds: ['turn'] }),
    node('dsh-step-start', 'dsh-session', 'boundary', 'Append step/start', 'DSH Agent / Session', 'Commit the Step only after pre-step accepts non-empty work.', 672, 72, [DSH_LOOP], { spanNodeIds: ['agent-phase'] }),
    node('dsh-append-input', 'dsh-session', 'phase', 'Append accepted input', 'DSH Session', 'Persist accepted user/context messages before deriving the model request.', 884, 72, [DSH_LOOP]),
    node('dsh-step-end', 'dsh-session', 'boundary', 'Append step/end', 'DSH Agent / Session', 'Close every committed Step in a finally boundary before Turn convergence.', 1096, 72, [DSH_LOOP]),
    node('dsh-turn-end', 'dsh-session', 'boundary', 'Append turn/end', 'DSH Agent / Session', 'Persist the structured completed, blocked, max-tokens, aborted, or error reason.', 1248, 72, [DSH_LOOP], { spanNodeIds: ['turn'], statuses: ['completed', 'failed', 'cancelled', 'interrupted'] }),

    node('dsh-claim-input', 'dsh-agent', 'phase', 'Claim inbox batch', 'DSH Agent Inbox', 'Atomically claim next-turn input at the Turn boundary or next-step input between Steps.', 36, 250, [DSH_LOOP]),
    node('dsh-assemble-context', 'dsh-agent', 'phase', 'Assemble prompt sections', 'DSH system prompt / runtime context', 'Assemble system sections, render context, and project runtime context for this boundary.', 248, 250, [DSH_LOOP]),
    node('dsh-pre-step', 'dsh-agent', 'decision', 'agent/pre-step waterfall', 'DSH Agent events', 'Extensions accept, replace, enrich, or reject the proposed Step; cancellation is rechecked after the waterfall.', 460, 250, [DSH_LOOP]),
    node('dsh-empty-step', 'dsh-agent', 'decision', 'Empty initial work?', 'DSH Agent', 'A removed or rewritten-empty waking message owns its Turn boundary but spends no model call.', 672, 250, [DSH_LOOP]),
    node('dsh-next-step', 'dsh-agent', 'decision', 'Continue same Turn?', 'DSH Agent / Inbox', 'A null step outcome or queued next-step context opens another Step; otherwise the Turn enters stopping hooks.', 884, 250, [DSH_LOOP]),
    node('dsh-stopping-hook', 'dsh-agent', 'phase', 'agent/turn-stopping', 'DSH Agent events', 'Run the serial stopping hook only after a terminal step outcome and an empty next-step inbox.', 1096, 250, [DSH_LOOP]),
    node('dsh-turn-outcome', 'dsh-agent', 'finalize', 'Select Turn outcome', 'DSH Agent', 'Preserve max-tokens, blocked, completed, aborted, or structured error as the authoritative end reason.', 1248, 250, [DSH_LOOP]),
    node('dsh-error-containment', 'dsh-agent', 'finalize', 'Contain plugin / loop error', 'DSH Agent driver', 'Report agent/error, close the current Turn, and keep the long-lived driver available for later work.', 1096, 342, [DSH_LOOP]),

    node('dsh-request-config', 'dsh-model', 'phase', 'Resolve request config', 'DSH Agent / LLM registry', 'Run agent/request, resolve exact provider/model defaults, and bind the prepared adapter call.', 36, 482, [DSH_LOOP]),
    node('dsh-request-header', 'dsh-model', 'phase', 'Persist request header/context', 'DSH Agent / Session', 'Append initial/resume/change/series header and provider/model/context-window facts when they change.', 248, 482, [DSH_LOOP]),
    node('dsh-model-inference', 'dsh-model', 'opaque', 'Model inference', 'Selected model provider', 'The model’s private inference and chain-of-thought are outside the Agent topology and never inspected.', 460, 482, [DSH_LOOP], undefined, true),
    node('dsh-model-stream', 'dsh-model', 'model', 'Stream response blocks', 'DSH LLM adapter / Agent', 'Append public chunks, assemble blocks and usage, and preserve delivered text on cooperative interruption.', 672, 482, [DSH_LOOP], { spanNodeIds: ['model'] }),
    node('dsh-request-result', 'dsh-model', 'decision', 'Classify stream finish', 'DSH Agent', 'Distinguish success, max-tokens, retryable error, terminal error, abort, and context-overflow recovery.', 884, 482, [DSH_LOOP]),
    node('dsh-assistant-anchor', 'dsh-model', 'phase', 'Append assistant/message', 'DSH Agent / Session', 'Commit the assembled assistant message and exact known usage with source chunk references.', 1096, 482, [DSH_LOOP]),
    node('dsh-response-decision', 'dsh-model', 'decision', 'Tool calls present?', 'DSH Agent', 'No tool call completes the Step; model-ordered tool calls enter the scheduler.', 1248, 482, [DSH_LOOP]),
    node('dsh-request-retry', 'dsh-model', 'retry', 'request-error recovery', 'DSH retry policy', 'A handling listener returns retry and re-enters the same Step; an unhandled failure is terminal.', 672, 574, [DSH_LOOP], { spanNodeIds: ['retry'] }),

    node('dsh-parse-calls', 'dsh-tools', 'tool', 'Parse model tool calls', 'DSH Agent scheduler', 'Parse each model call into an immutable execution identity while preserving model order.', 36, 714, [DSH_SCHEDULER]),
    node('dsh-classify-mode', 'dsh-tools', 'decision', 'Classify live mode', 'DSH ToolRuntime', 'Unknown, invalid, throwing, or non-true classifiers fail closed to exclusive; safe calls may be parallel.', 248, 714, [DSH_SCHEDULER, DSH_TOOLS]),
    node('dsh-exclusive-barrier', 'dsh-tools', 'phase', 'Exclusive barrier', 'DSH Agent scheduler', 'Drain the active pool and run one exclusive call alone before classifying later calls again.', 460, 714, [DSH_SCHEDULER]),
    node('dsh-parallel-pool', 'dsh-tools', 'phase', 'Bounded rolling pool', 'DSH Agent scheduler', 'Start parallel-safe calls up to maxParallelToolCalls and stop replenishment on abort or scheduler failure.', 460, 806, [DSH_SCHEDULER]),
    node('dsh-prepare-call', 'dsh-tools', 'tool', 'Append call + prepare', 'DSH scheduler / ToolRuntime', 'Append tool/call, materialize immutable input, and enter ordered pre-execute policy.', 672, 714, [DSH_SCHEDULER, DSH_TOOLS]),
    node('dsh-tool-policy', 'dsh-tools', 'approval', 'tools/pre-execute', 'DSH ToolRuntime + Aezy Security', 'Extensible policy returns allow, deny, or ask without weakening later guards.', 884, 714, [DSH_TOOLS]),
    node('dsh-approval', 'dsh-tools', 'approval', 'Resolve approval ask', 'DSH ApprovalService', 'Use the owning approval channel for a fail-closed human or durable-rule decision.', 1096, 714, [DSH_APPROVAL], { spanNodeIds: ['approval'] }),
    node('dsh-monotonic-guards', 'dsh-tools', 'approval', 'Recheck guards + cancel', 'DSH ToolRuntime', 'Monotonic guards and caller cancellation run after extensible policy and cannot be bypassed by approval.', 1248, 714, [DSH_TOOLS]),
    node('dsh-tool-dispatch', 'dsh-tools', 'tool', 'Dispatch tool body', 'DSH ToolRuntime', 'Run the around-execute waterfall and tool body with fused cooperative cancellation.', 672, 898, [DSH_TOOLS], { spanNodeIds: ['tool'] }),
    node('dsh-post-process', 'dsh-tools', 'tool', 'Post-process + finalize', 'DSH ToolRuntime', 'Normalize errors, run post-execute when eligible, finalize content, materialize and freeze the outcome.', 884, 898, [DSH_TOOLS]),
    node('dsh-ordered-commit', 'dsh-tools', 'phase', 'Commit result in model order', 'DSH Agent scheduler / Session', 'Wait for contiguous settled slots, append tool/result, and stage additional context in model order.', 1096, 898, [DSH_SCHEDULER, DSH_TOOLS]),
    node('dsh-tool-concludes', 'dsh-tools', 'decision', 'Result concludes Turn?', 'DSH Agent scheduler', 'A committed result may conclude the Turn; otherwise the next Step sees its staged context.', 1248, 898, [DSH_SCHEDULER]),

    node('dsh-compaction-trigger', 'dsh-services', 'decision', 'Compaction recovery?', 'DSH request recovery', 'Context pressure or overflow may select compaction instead of terminal failure.', 36, 1054, [DSH_LOOP, DSH_COMPACTION]),
    node('dsh-compaction-bracket', 'dsh-services', 'compaction', 'Compact + rebuild context', 'DSH CompactionEngine', 'Create a durable balanced bracket, replace the selected surface range, and rebuild the request context.', 248, 1054, [DSH_COMPACTION], { spanNodeIds: ['compaction'] }),
    node('dsh-cancel-drain', 'dsh-services', 'cancel', 'Abort + drain started calls', 'DSH Agent scheduler', 'Stop new starts, settle started work, and append synthetic aborted results for undispatched model calls.', 460, 1054, [DSH_LOOP, DSH_SCHEDULER]),
    node('dsh-subagent-child', 'dsh-services', 'subagent', 'Create / resume child Session', 'DSH Subagent', 'A Subagent tool delegates to a separately owned child Session and returns only its settled outcome.', 672, 1054, [DSH_SUBAGENT, DSH_TOOLS], { spanNodeIds: ['subagent'] }),
    node('dsh-finalize-driver', 'dsh-services', 'finalize', 'Converge driver state', 'DSH Agent driver', 'Return idle, replay a latched wake, or claim queued work with a fresh cancellation controller.', 1096, 1054, [DSH_LOOP]),
  ],
  edges: [
    edge('dsh-idle-input', 'dsh-session-idle', 'dsh-inbox-route', 'normal', 'send', 'input is inserted', [DSH_LOOP]),
    edge('dsh-input-wakes', 'dsh-inbox-route', 'dsh-turn-start', 'branch', 'wakeup', 'driver is idle or wake is latched', [DSH_LOOP]),
    edge('dsh-input-injects', 'dsh-inbox-route', 'dsh-claim-input', 'branch', 'next-step', 'live Turn can claim injected work', [DSH_LOOP]),
    edge('dsh-turn-claims', 'dsh-turn-start', 'dsh-claim-input', 'normal', 'next-turn', 'turn/start committed', [DSH_LOOP]),
    edge('dsh-claim-assembles', 'dsh-claim-input', 'dsh-assemble-context', 'normal', 'claimed batch', 'inbox claim succeeds', [DSH_LOOP]),
    edge('dsh-assemble-prestep', 'dsh-assemble-context', 'dsh-pre-step', 'normal', 'proposal', 'context assembly settles', [DSH_LOOP]),
    edge('dsh-prestep-blocks', 'dsh-pre-step', 'dsh-turn-outcome', 'branch', 'reject', 'pre-step rejects', [DSH_LOOP]),
    edge('dsh-prestep-enters', 'dsh-pre-step', 'dsh-empty-step', 'branch', 'enter', 'pre-step accepts', [DSH_LOOP]),
    edge('dsh-empty-completes', 'dsh-empty-step', 'dsh-turn-outcome', 'branch', 'empty initial', 'first Step has no messages', [DSH_LOOP]),
    edge('dsh-work-opens-step', 'dsh-empty-step', 'dsh-step-start', 'branch', 'has work', 'accepted messages are non-empty', [DSH_LOOP]),
    edge('dsh-step-appends', 'dsh-step-start', 'dsh-append-input', 'normal', 'durable input', 'step/start committed', [DSH_LOOP]),
    edge('dsh-input-builds-request', 'dsh-append-input', 'dsh-request-config', 'normal', 'derive', 'accepted input is durable', [DSH_LOOP]),
    edge('dsh-config-persists', 'dsh-request-config', 'dsh-request-header', 'normal', 'resolved route', 'provider/model are valid', [DSH_LOOP]),
    edge('dsh-header-infers', 'dsh-request-header', 'dsh-model-inference', 'normal', 'request', 'header and request context are current', [DSH_LOOP]),
    edge('dsh-inference-streams', 'dsh-model-inference', 'dsh-model-stream', 'normal', 'public stream', 'provider emits response blocks', [DSH_LOOP]),
    edge('dsh-stream-classifies', 'dsh-model-stream', 'dsh-request-result', 'normal', 'finish', 'stream settles', [DSH_LOOP]),
    edge('dsh-result-retries', 'dsh-request-result', 'dsh-request-retry', 'retry', 'retryable', 'request-error returns retry', [DSH_LOOP]),
    edge('dsh-retry-request', 'dsh-request-retry', 'dsh-request-config', 'loop-back', 'same Step', 'retry policy permits another request', [DSH_LOOP]),
    edge('dsh-result-compacts', 'dsh-request-result', 'dsh-compaction-trigger', 'branch', 'context overflow', 'compaction recovery accepts', [DSH_LOOP, DSH_COMPACTION]),
    edge('dsh-compaction-runs', 'dsh-compaction-trigger', 'dsh-compaction-bracket', 'branch', 'compact', 'recovery has an eligible range', [DSH_COMPACTION]),
    edge('dsh-compaction-rebuilds', 'dsh-compaction-bracket', 'dsh-assemble-context', 'loop-back', 'rebuild', 'checkpoint commits', [DSH_COMPACTION]),
    edge('dsh-result-errors', 'dsh-request-result', 'dsh-error-containment', 'branch', 'terminal error', 'retry/compaction do not handle failure', [DSH_LOOP]),
    edge('dsh-result-aborts', 'dsh-request-result', 'dsh-cancel-drain', 'cancel', 'abort', 'shared signal is aborted', [DSH_LOOP, DSH_SCHEDULER]),
    edge('dsh-result-anchors', 'dsh-request-result', 'dsh-assistant-anchor', 'branch', 'success', 'response is complete or max-tokens', [DSH_LOOP]),
    edge('dsh-anchor-decides', 'dsh-assistant-anchor', 'dsh-response-decision', 'normal', 'content', 'assistant message commits', [DSH_LOOP]),
    edge('dsh-response-no-tools', 'dsh-response-decision', 'dsh-step-end', 'branch', 'no tools', 'assistant response is terminal', [DSH_LOOP]),
    edge('dsh-response-tools', 'dsh-response-decision', 'dsh-parse-calls', 'branch', 'tool calls', 'assistant message contains calls', [DSH_LOOP, DSH_SCHEDULER]),
    edge('dsh-calls-classify', 'dsh-parse-calls', 'dsh-classify-mode', 'normal', 'planned calls', 'arguments are parsed', [DSH_SCHEDULER]),
    edge('dsh-mode-exclusive', 'dsh-classify-mode', 'dsh-exclusive-barrier', 'branch', 'exclusive', 'call is not proven parallel-safe', [DSH_SCHEDULER, DSH_TOOLS]),
    edge('dsh-mode-parallel', 'dsh-classify-mode', 'dsh-parallel-pool', 'branch', 'parallel', 'call opts into safe overlap', [DSH_SCHEDULER, DSH_TOOLS]),
    edge('dsh-barrier-prepares', 'dsh-exclusive-barrier', 'dsh-prepare-call', 'normal', 'alone', 'prior pool is drained', [DSH_SCHEDULER]),
    edge('dsh-pool-prepares', 'dsh-parallel-pool', 'dsh-prepare-call', 'normal', 'pool slot', 'capacity is available', [DSH_SCHEDULER]),
    edge('dsh-pool-barrier', 'dsh-parallel-pool', 'dsh-exclusive-barrier', 'branch', 'reclassified', 'later live classifier becomes exclusive', [DSH_SCHEDULER]),
    edge('dsh-prepare-policy', 'dsh-prepare-call', 'dsh-tool-policy', 'normal', 'pre-execute', 'tool/call commits', [DSH_TOOLS]),
    edge('dsh-policy-asks', 'dsh-tool-policy', 'dsh-approval', 'branch', 'ask', 'policy requests a decision', [DSH_TOOLS, DSH_APPROVAL]),
    edge('dsh-policy-denies', 'dsh-tool-policy', 'dsh-ordered-commit', 'branch', 'deny', 'policy returns fail-closed result', [DSH_TOOLS]),
    edge('dsh-policy-guards', 'dsh-tool-policy', 'dsh-monotonic-guards', 'branch', 'allow', 'pre-execute allows', [DSH_TOOLS]),
    edge('dsh-approval-allows', 'dsh-approval', 'dsh-monotonic-guards', 'branch', 'allow', 'approval grants this call', [DSH_APPROVAL, DSH_TOOLS]),
    edge('dsh-approval-denies', 'dsh-approval', 'dsh-ordered-commit', 'branch', 'deny / cancel', 'approval resolves fail closed', [DSH_APPROVAL, DSH_TOOLS]),
    edge('dsh-guards-dispatch', 'dsh-monotonic-guards', 'dsh-tool-dispatch', 'branch', 'admit', 'guards pass and signal is live', [DSH_TOOLS]),
    edge('dsh-guards-deny', 'dsh-monotonic-guards', 'dsh-ordered-commit', 'branch', 'deny / abort', 'guard or cancellation blocks dispatch', [DSH_TOOLS]),
    edge('dsh-dispatch-subagent', 'dsh-tool-dispatch', 'dsh-subagent-child', 'branch', 'Subagent tool', 'selected tool delegates', [DSH_SUBAGENT, DSH_TOOLS]),
    edge('dsh-subagent-settles', 'dsh-subagent-child', 'dsh-post-process', 'normal', 'child outcome', 'child Session settles', [DSH_SUBAGENT, DSH_TOOLS]),
    edge('dsh-dispatch-post', 'dsh-tool-dispatch', 'dsh-post-process', 'normal', 'settled body', 'dispatch produces a normalized outcome', [DSH_TOOLS]),
    edge('dsh-post-commits', 'dsh-post-process', 'dsh-ordered-commit', 'normal', 'frozen result', 'finalization succeeds', [DSH_TOOLS, DSH_SCHEDULER]),
    edge('dsh-commit-next-call', 'dsh-ordered-commit', 'dsh-classify-mode', 'loop-back', 'next call', 'unstarted model calls remain', [DSH_SCHEDULER]),
    edge('dsh-commit-concludes', 'dsh-ordered-commit', 'dsh-tool-concludes', 'normal', 'batch settled', 'all calls commit in order', [DSH_SCHEDULER]),
    edge('dsh-tools-next-step', 'dsh-tool-concludes', 'dsh-step-end', 'branch', 'continue', 'result does not conclude Turn', [DSH_LOOP, DSH_SCHEDULER]),
    edge('dsh-tools-end-turn', 'dsh-tool-concludes', 'dsh-step-end', 'branch', 'conclude', 'a result concludes Turn', [DSH_LOOP, DSH_SCHEDULER]),
    edge('dsh-step-decides', 'dsh-step-end', 'dsh-next-step', 'normal', 'closed Step', 'step/end commits', [DSH_LOOP]),
    edge('dsh-result-next-step', 'dsh-next-step', 'dsh-claim-input', 'loop-back', 'next Step', 'next-step input exists or outcome is nonterminal', [DSH_LOOP]),
    edge('dsh-step-stops', 'dsh-next-step', 'dsh-stopping-hook', 'branch', 'stopping', 'terminal outcome and next-step inbox empty', [DSH_LOOP]),
    edge('dsh-hook-outcome', 'dsh-stopping-hook', 'dsh-turn-outcome', 'normal', 'stop', 'stopping hook settles', [DSH_LOOP]),
    edge('dsh-error-outcome', 'dsh-error-containment', 'dsh-turn-outcome', 'normal', 'structured error', 'failure is contained', [DSH_LOOP]),
    edge('dsh-cancel-outcome', 'dsh-cancel-drain', 'dsh-turn-outcome', 'normal', 'aborted', 'started calls reach quiescence', [DSH_LOOP, DSH_SCHEDULER]),
    edge('dsh-outcome-end', 'dsh-turn-outcome', 'dsh-turn-end', 'normal', 'end reason', 'Turn converges', [DSH_LOOP]),
    edge('dsh-end-driver', 'dsh-turn-end', 'dsh-finalize-driver', 'normal', 'balanced log', 'turn/end commits', [DSH_LOOP]),
    edge('dsh-driver-next-turn', 'dsh-finalize-driver', 'dsh-turn-start', 'loop-back', 'queued wake', 'pending input remains', [DSH_LOOP]),
    edge('dsh-driver-idle', 'dsh-finalize-driver', 'dsh-session-idle', 'normal', 'idle', 'no pending input remains', [DSH_LOOP]),
  ],
  digest: 'sha256:aa707d5b91bcbbfa94e25c4fff58fb588a85eab9c6922cfc801c5fb984ca83a6',
})

const codexAppServer = blueprint({
  id: 'codex-app-server',
  revision: 3,
  title: 'Codex App Server through DSH · full logic',
  description: 'Pinned Codex 0.149.0 source topology plus the public App Server and Aezy/DSH security bridge. Only model inference remains opaque.',
  canvas: Object.freeze({ width: 1480, height: 1190, nodeWidth: 184, nodeHeight: 70 }),
  lanes: [
    lane('codex-dsh', 'DSH provider / durable Session', 'DSH Agent + Session', 16, 174, [AEZY_CODEX, DSH_LOOP]),
    lane('codex-adapter', 'Aezy App Server adapter', '@aezy/codex', 202, 196, [AEZY_CODEX, CODEX_PROTOCOL]),
    lane('codex-turn', 'Official Codex Turn control', '@openai/codex-core', 410, 220, [CODEX_TURN, CODEX_REGULAR_TASK]),
    lane('codex-model', 'Official sampling / response loop', '@openai/codex-core', 642, 210, [CODEX_TURN]),
    lane('codex-tools', 'Tool / approval / compaction / child loop', 'Codex core + DSH ToolRuntime', 864, 310, [CODEX_TOOL_RUNTIME, CODEX_TOOL_ROUTER, DSH_TOOLS]),
  ],
  nodes: [
    node('codex-dsh-turn', 'codex-dsh', 'boundary', 'Open DSH Turn + Step', 'DSH Agent / Session', 'DSH owns the visible durable Turn, Step, request header and final assistant projection.', 36, 72, [DSH_LOOP, AEZY_CODEX], { spanNodeIds: ['turn', 'agent-phase'] }),
    node('codex-provider-fence', 'codex-dsh', 'approval', 'Preset / provider fence', 'Aezy mode + Codex adapter', 'Require codex-app-server or legacy aezy ownership before any App Server I/O.', 248, 72, [AEZY_CODEX]),
    node('codex-project-output', 'codex-dsh', 'phase', 'Project public output', 'Aezy adapter / DSH Session', 'Translate public message blocks and allowlisted activity facts into the current DSH stream.', 1096, 72, [AEZY_CODEX, CODEX_PROTOCOL]),
    node('codex-dsh-finalize', 'codex-dsh', 'finalize', 'Finalize DSH Turn', 'DSH Agent / Session', 'Close the provider stream and persist assistant, Step and Turn outcome without a second Session owner.', 1248, 72, [DSH_LOOP, AEZY_CODEX], { spanNodeIds: ['turn'], statuses: ['completed', 'failed', 'cancelled', 'interrupted'] }),

    node('codex-thread-binding', 'codex-adapter', 'phase', 'Resolve Session ↔ Thread', 'Aezy Codex adapter', 'Load the durable minimal binding and reject cwd mismatch instead of silently creating a replacement Thread.', 36, 244, [AEZY_CODEX]),
    node('codex-thread-ready', 'codex-adapter', 'decision', 'Start or resume Thread', 'Aezy adapter / App Server', 'Resume when tool signature changed or start one persistent read-only Thread, then preserve the binding.', 248, 244, [AEZY_CODEX, CODEX_PROTOCOL]),
    node('codex-turn-rpc', 'codex-adapter', 'phase', 'Send turn/start', 'Aezy adapter / App Server', 'Submit latest input, model, effort, read-only permissions and advertised dsh.* dynamic tools.', 460, 244, [AEZY_CODEX, CODEX_PROTOCOL]),
    node('codex-public-stream', 'codex-adapter', 'phase', 'Consume public item stream', 'Aezy Codex adapter', 'Route notification deltas, item completions and Turn completion by exact Thread and Turn identity.', 672, 244, [AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ['codex-turn-stream'] }),
    node('codex-interaction-route', 'codex-adapter', 'decision', 'Route server request', 'Aezy Codex adapter', 'Accept only current dsh.* dynamic-tool requests; decline native escalation and stale ownership fail closed.', 884, 244, [AEZY_CODEX, CODEX_PROTOCOL]),
    node('codex-interrupt', 'codex-adapter', 'cancel', 'turn/interrupt', 'Aezy adapter / App Server', 'A DSH abort interrupts the exact active Codex Turn and closes its ActivityQueue.', 1096, 244, [AEZY_CODEX, CODEX_PROTOCOL]),
    node('codex-adapter-settle', 'codex-adapter', 'finalize', 'Settle provider stream', 'Aezy Codex adapter', 'Emit stop/error/aborted finish, release listeners and remove the active ownership token.', 1248, 244, [AEZY_CODEX]),

    node('codex-turn-open', 'codex-turn', 'boundary', 'Official TurnStarted', 'Codex RegularTask', 'Open the official Turn, capture trace/model context and reuse one turn-scoped model client session.', 36, 458, [CODEX_REGULAR_TASK, CODEX_TURN]),
    node('codex-precompact', 'codex-turn', 'compaction', 'Pre-sampling compaction', 'Codex core', 'Check existing context pressure before recording new context and user input.', 248, 458, [CODEX_TURN, CODEX_COMPACTION]),
    node('codex-capture-step', 'codex-turn', 'phase', 'Capture Step context', 'Codex Session', 'Freeze environment, model, advertised tools and required MCP servers for one sampling boundary.', 460, 458, [CODEX_TURN]),
    node('codex-record-context', 'codex-turn', 'phase', 'Record context + hooks', 'Codex Session / extensions', 'Persist world-state changes, skills/plugins, pending input and session-start/turn hooks.', 672, 458, [CODEX_TURN]),
    node('codex-build-prompt', 'codex-turn', 'phase', 'Build prompt + tool router', 'Codex core', 'Derive visible history, base instructions, output schema and the exact model-visible tool registry.', 884, 458, [CODEX_TURN, CODEX_TOOL_ROUTER]),
    node('codex-post-sampling', 'codex-turn', 'decision', 'Collect post-sampling state', 'Codex core', 'Combine model follow-up, queued input, token pressure, async hook results and context-window requests.', 1096, 458, [CODEX_TURN]),
    node('codex-stop-hooks', 'codex-turn', 'decision', 'Run Turn stop hooks', 'Codex extensions', 'Stop, continue with a hook prompt, or run the legacy after-agent hook before completing the Turn.', 1248, 458, [CODEX_TURN]),
    node('codex-turn-complete', 'codex-turn', 'finalize', 'Complete official Turn', 'Codex RegularTask', 'Return the last public agent message or loop again if pending input arrived before idle.', 1248, 550, [CODEX_REGULAR_TASK, CODEX_TURN]),

    node('codex-model-request', 'codex-model', 'model', 'Prepare Responses request', 'Codex core / model client', 'Reuse current history, attach pending executed-tool facts and construct a parallel-tool-capable prompt.', 36, 690, [CODEX_TURN]),
    node('codex-model-inference', 'codex-model', 'opaque', 'Model inference', 'Selected model provider', 'The model’s private inference and chain-of-thought are not part of the inspectable Agent control flow.', 248, 690, [CODEX_TURN], undefined, true),
    node('codex-response-stream', 'codex-model', 'model', 'Stream ResponseEvents', 'Codex model client', 'Consume public output deltas/items, token/rate facts and terminal response state.', 460, 690, [CODEX_TURN]),
    node('codex-stream-retry', 'codex-model', 'retry', 'Retry response stream', 'Codex responses retry', 'Retry only classified retryable failures within the provider budget; terminal limits/errors escape.', 672, 690, [CODEX_TURN]),
    node('codex-item-classifier', 'codex-model', 'decision', 'Classify completed item', 'Codex core', 'Separate assistant/reasoning, function/custom/search calls, hosted items and non-tool protocol facts.', 884, 690, [CODEX_TURN, CODEX_TOOL_ROUTER]),
    node('codex-assistant-item', 'codex-model', 'phase', 'Record assistant item', 'Codex Session', 'Finalize safe public assistant content, record it, and derive the last-agent-message candidate.', 1096, 690, [CODEX_TURN]),
    node('codex-follow-up', 'codex-model', 'decision', 'Needs another sampling?', 'Codex core', 'Tool output, pending input, stop-hook continuation or model state may require another sampling request.', 1248, 690, [CODEX_TURN]),

    node('codex-tool-build', 'codex-tools', 'tool', 'Decode tool call', 'Codex ToolRouter', 'Build a typed call from function, custom or client tool-search output; invalid arguments become model-visible failure.', 36, 912, [CODEX_TOOL_ROUTER]),
    node('codex-parallel-gate', 'codex-tools', 'decision', 'Parallel / exclusive gate', 'Codex ToolCallRuntime', 'Parallel-safe calls share a read lock; exclusive calls take the write lock and wait for overlap to drain.', 248, 912, [CODEX_TOOL_RUNTIME]),
    node('codex-tool-router', 'codex-tools', 'tool', 'Dispatch official tool route', 'Codex ToolRouter', 'Route native, MCP, collaboration or dynamic tools and normalize fatal versus model-visible failures.', 460, 912, [CODEX_TOOL_RUNTIME, CODEX_TOOL_ROUTER]),
    node('codex-subagent', 'codex-tools', 'subagent', 'Spawn / continue Subagent', 'Codex AgentControl', 'Collaboration tools may create a child Thread, propagate bounded context and later publish its settlement.', 460, 1004, [CODEX_SUBAGENT]),
    node('codex-native-request', 'codex-tools', 'approval', 'Native permission request', 'Codex App Server', 'Command/file/permission escalation is emitted as a public server request.', 672, 912, [CODEX_APP_SERVER, CODEX_PROTOCOL]),
    node('codex-dynamic-request', 'codex-tools', 'tool', 'Emit dsh.* dynamic request', 'Codex App Server', 'Start the public dynamicToolCall lifecycle and wait for the client JSON-RPC response.', 672, 1004, [CODEX_APP_SERVER, CODEX_PROTOCOL]),
    node('codex-native-decline', 'codex-tools', 'approval', 'Decline native escalation', 'Aezy Codex adapter', 'Keep native permissions read-only and direct the model back through the DSH namespace.', 884, 912, [AEZY_CODEX, CODEX_PROTOCOL]),
    node('codex-dsh-validate', 'codex-tools', 'approval', 'Validate active ownership', 'Aezy Codex adapter', 'Require current Thread/Turn, dsh namespace, advertised tool name and unchanged active token.', 884, 1004, [AEZY_CODEX], { spanNodeIds: ['dsh-tool-bridge'] }),
    node('codex-dsh-policy', 'codex-tools', 'approval', 'DSH pre-execute + guards', 'DSH ToolRuntime / Aezy Security', 'Apply the existing DSH policy, cancellation and monotonic execution guards.', 1096, 912, [DSH_TOOLS, AEZY_CODEX]),
    node('codex-dsh-approval', 'codex-tools', 'approval', 'DSH approval decision', 'DSH ApprovalService', 'Resolve ask through the existing DSH approval owner; deny and cancellation remain fail closed.', 1248, 912, [DSH_APPROVAL, AEZY_CODEX], { spanNodeIds: ['approval'] }),
    node('codex-dsh-execute', 'codex-tools', 'tool', 'Execute + freeze DSH tool', 'DSH ToolRuntime', 'Run the existing DSH execution and result pipeline without introducing a Codex-owned duplicate runtime.', 1248, 1004, [DSH_TOOLS, AEZY_CODEX]),
    node('codex-return-result', 'codex-tools', 'phase', 'Return JSON-RPC result', 'Aezy adapter / App Server', 'Append the allowlisted DSH tool result, revalidate ownership and answer the pending server request.', 1096, 1096, [AEZY_CODEX, CODEX_PROTOCOL]),
    node('codex-record-tool-output', 'codex-tools', 'phase', 'Record tool output item', 'Codex core / Session', 'Convert the settled tool response into model input and mark the sampling result as needing follow-up.', 884, 1096, [CODEX_TURN, CODEX_TOOL_RUNTIME]),
    node('codex-token-pressure', 'codex-tools', 'decision', 'Context limit reached?', 'Codex context window', 'Combine pending follow-up with token/window state to decide whether mid-Turn rollover is required.', 248, 1096, [CODEX_TURN]),
    node('codex-auto-compact', 'codex-tools', 'compaction', 'Auto-compact + replace history', 'Codex compaction', 'Run pre/post hooks, compact locally or remotely, replace history, recompute usage and resume the Turn.', 36, 1096, [CODEX_COMPACTION, CODEX_TURN]),
  ],
  edges: [
    edge('codex-dsh-fence', 'codex-dsh-turn', 'codex-provider-fence', 'normal', 'provider request', 'DSH Step selects aezy-codex', [DSH_LOOP, AEZY_CODEX]),
    edge('codex-fence-binding', 'codex-provider-fence', 'codex-thread-binding', 'branch', 'allowed preset', 'mode/provider ownership passes', [AEZY_CODEX]),
    edge('codex-binding-ready', 'codex-thread-binding', 'codex-thread-ready', 'normal', 'binding facts', 'cwd/model binding is valid', [AEZY_CODEX]),
    edge('codex-thread-start-turn', 'codex-thread-ready', 'codex-turn-rpc', 'normal', 'Thread ready', 'start/resume succeeds', [AEZY_CODEX, CODEX_PROTOCOL]),
    edge('codex-rpc-opens-turn', 'codex-turn-rpc', 'codex-turn-open', 'normal', 'turn/start', 'App Server accepts the Turn', [CODEX_PROTOCOL, CODEX_REGULAR_TASK]),
    edge('codex-turn-precompact', 'codex-turn-open', 'codex-precompact', 'normal', 'preflight', 'TurnStarted commits', [CODEX_TURN]),
    edge('codex-precompact-step', 'codex-precompact', 'codex-capture-step', 'normal', 'context ready', 'pre-Turn compaction succeeds or is unnecessary', [CODEX_TURN, CODEX_COMPACTION]),
    edge('codex-step-context', 'codex-capture-step', 'codex-record-context', 'normal', 'frozen Step', 'required environments/tools resolve', [CODEX_TURN]),
    edge('codex-context-prompt', 'codex-record-context', 'codex-build-prompt', 'normal', 'durable context', 'hooks accept the Turn', [CODEX_TURN]),
    edge('codex-prompt-request', 'codex-build-prompt', 'codex-model-request', 'normal', 'sampling input', 'history and tool router are ready', [CODEX_TURN, CODEX_TOOL_ROUTER]),
    edge('codex-request-inference', 'codex-model-request', 'codex-model-inference', 'normal', 'Responses API', 'request dispatches', [CODEX_TURN]),
    edge('codex-inference-stream', 'codex-model-inference', 'codex-response-stream', 'normal', 'public events', 'provider emits ResponseEvents', [CODEX_TURN]),
    edge('codex-stream-retries', 'codex-response-stream', 'codex-stream-retry', 'retry', 'retryable error', 'provider budget remains', [CODEX_TURN]),
    edge('codex-retry-request', 'codex-stream-retry', 'codex-model-request', 'loop-back', 'retry', 'backoff completes', [CODEX_TURN]),
    edge('codex-stream-items', 'codex-response-stream', 'codex-item-classifier', 'normal', 'completed item', 'output item settles', [CODEX_TURN]),
    edge('codex-item-assistant', 'codex-item-classifier', 'codex-assistant-item', 'branch', 'assistant', 'item is public assistant output', [CODEX_TURN]),
    edge('codex-item-tool', 'codex-item-classifier', 'codex-tool-build', 'branch', 'tool call', 'item contains a client-executed call', [CODEX_TURN, CODEX_TOOL_ROUTER]),
    edge('codex-assistant-followup', 'codex-assistant-item', 'codex-follow-up', 'normal', 'recorded', 'assistant item finalizes', [CODEX_TURN]),
    edge('codex-tool-parallel', 'codex-tool-build', 'codex-parallel-gate', 'normal', 'typed call', 'tool call is valid', [CODEX_TOOL_ROUTER, CODEX_TOOL_RUNTIME]),
    edge('codex-parallel-route', 'codex-parallel-gate', 'codex-tool-router', 'normal', 'admitted', 'read/write gate admits execution', [CODEX_TOOL_RUNTIME]),
    edge('codex-route-subagent', 'codex-tool-router', 'codex-subagent', 'branch', 'collaboration', 'tool targets AgentControl', [CODEX_SUBAGENT, CODEX_TOOL_ROUTER]),
    edge('codex-subagent-output', 'codex-subagent', 'codex-record-tool-output', 'normal', 'child settlement', 'Subagent publishes an outcome', [CODEX_SUBAGENT, CODEX_TURN]),
    edge('codex-route-native', 'codex-tool-router', 'codex-native-request', 'branch', 'native action', 'App Server requires client approval', [CODEX_APP_SERVER, CODEX_PROTOCOL]),
    edge('codex-route-dynamic', 'codex-tool-router', 'codex-dynamic-request', 'branch', 'dsh.* dynamic', 'tool belongs to advertised DSH namespace', [CODEX_APP_SERVER, CODEX_PROTOCOL]),
    edge('codex-native-declines', 'codex-native-request', 'codex-interaction-route', 'normal', 'server request', 'App Server asks its client for native permission', [AEZY_CODEX, CODEX_PROTOCOL]),
    edge('codex-decline-output', 'codex-native-decline', 'codex-record-tool-output', 'normal', 'declined result', 'App Server receives denial', [AEZY_CODEX, CODEX_TURN]),
    edge('codex-dynamic-validates', 'codex-dynamic-request', 'codex-interaction-route', 'normal', 'server request', 'App Server asks its client to execute dsh.*', [AEZY_CODEX, CODEX_PROTOCOL]),
    edge('codex-validate-policy', 'codex-dsh-validate', 'codex-dsh-policy', 'branch', 'valid', 'ownership and namespace pass', [AEZY_CODEX, DSH_TOOLS]),
    edge('codex-validate-deny', 'codex-dsh-validate', 'codex-return-result', 'branch', 'stale / invalid', 'ownership or advertised name fails', [AEZY_CODEX]),
    edge('codex-policy-approval', 'codex-dsh-policy', 'codex-dsh-approval', 'branch', 'ask', 'DSH pre-execute requests approval', [DSH_TOOLS, DSH_APPROVAL]),
    edge('codex-policy-execute', 'codex-dsh-policy', 'codex-dsh-execute', 'branch', 'allow', 'policy and guards permit action', [DSH_TOOLS]),
    edge('codex-policy-deny', 'codex-dsh-policy', 'codex-return-result', 'branch', 'deny / cancel', 'policy returns fail-closed outcome', [DSH_TOOLS]),
    edge('codex-approval-execute', 'codex-dsh-approval', 'codex-dsh-execute', 'branch', 'allow', 'approval grants this call', [DSH_APPROVAL, DSH_TOOLS]),
    edge('codex-approval-deny', 'codex-dsh-approval', 'codex-return-result', 'branch', 'deny / cancel', 'approval resolves fail closed', [DSH_APPROVAL, DSH_TOOLS]),
    edge('codex-execute-return', 'codex-dsh-execute', 'codex-return-result', 'normal', 'frozen result', 'DSH tool settles', [DSH_TOOLS, AEZY_CODEX]),
    edge('codex-return-record', 'codex-return-result', 'codex-record-tool-output', 'normal', 'JSON-RPC response', 'active ownership is unchanged', [AEZY_CODEX, CODEX_TURN]),
    edge('codex-tool-followup', 'codex-record-tool-output', 'codex-follow-up', 'normal', 'model input', 'tool output is recorded', [CODEX_TURN]),
    edge('codex-follow-post', 'codex-follow-up', 'codex-post-sampling', 'normal', 'sampling settled', 'all output items settle', [CODEX_TURN]),
    edge('codex-post-token', 'codex-post-sampling', 'codex-token-pressure', 'branch', 'follow-up', 'model/tool/pending input requires continuation', [CODEX_TURN]),
    edge('codex-post-stop', 'codex-post-sampling', 'codex-stop-hooks', 'branch', 'no follow-up', 'model and inbox are terminal', [CODEX_TURN]),
    edge('codex-token-compact', 'codex-token-pressure', 'codex-auto-compact', 'branch', 'limit reached', 'context rollover requested', [CODEX_TURN, CODEX_COMPACTION]),
    edge('codex-compact-step', 'codex-auto-compact', 'codex-capture-step', 'loop-back', 'resume', 'replacement history commits', [CODEX_COMPACTION, CODEX_TURN]),
    edge('codex-token-step', 'codex-token-pressure', 'codex-capture-step', 'loop-back', 'next sampling', 'context remains below limit', [CODEX_TURN]),
    edge('codex-stop-continues', 'codex-stop-hooks', 'codex-capture-step', 'loop-back', 'hook prompt', 'stop hook blocks with continuation', [CODEX_TURN]),
    edge('codex-stop-completes', 'codex-stop-hooks', 'codex-turn-complete', 'branch', 'stop', 'hooks accept completion', [CODEX_TURN, CODEX_REGULAR_TASK]),
    edge('codex-turn-public', 'codex-turn-complete', 'codex-public-stream', 'normal', 'turn/completed', 'App Server emits completion', [CODEX_APP_SERVER, CODEX_PROTOCOL]),
    edge('codex-stream-output', 'codex-public-stream', 'codex-project-output', 'branch', 'message / completion', 'public item is safe to project', [AEZY_CODEX, CODEX_PROTOCOL]),
    edge('codex-stream-failure', 'codex-public-stream', 'codex-adapter-settle', 'branch', 'failed / interrupted', 'public Turn status closes the provider stream without projecting a successful completion', [AEZY_CODEX, CODEX_PROTOCOL]),
    edge('codex-route-native-request', 'codex-interaction-route', 'codex-native-decline', 'branch', 'native escalation', 'request is not dsh.* dynamic tool', [AEZY_CODEX]),
    edge('codex-route-dynamic-request', 'codex-interaction-route', 'codex-dsh-validate', 'branch', 'dsh.* request', 'namespace and active identity appear valid', [AEZY_CODEX]),
    edge('codex-output-settle', 'codex-project-output', 'codex-adapter-settle', 'normal', 'finish', 'turn completion or error closes stream', [AEZY_CODEX]),
    edge('codex-adapter-dsh-final', 'codex-adapter-settle', 'codex-dsh-finalize', 'normal', 'provider finish', 'DSH consumes finish reason', [AEZY_CODEX, DSH_LOOP]),
    edge('codex-dsh-interrupt', 'codex-dsh-turn', 'codex-interrupt', 'cancel', 'abort signal', 'DSH Turn is cancelled', [DSH_LOOP, AEZY_CODEX]),
    edge('codex-interrupt-settle', 'codex-interrupt', 'codex-adapter-settle', 'normal', 'aborted', 'interrupt is contained', [AEZY_CODEX, CODEX_PROTOCOL]),
  ],
  digest: 'sha256:af38cbbf6581adc43b6fda641780c350b1bc66200ddac9564f8dcdbe077851e7',
})

export const LOOP_BLUEPRINTS = Object.freeze({
  'dsh-native': dshNative,
  'codex-app-server': codexAppServer,
})
