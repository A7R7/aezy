window.__ModuleLoader__.load({
	id: "@aezy/inspector",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperties(exports, {
			__esModule: { value: true },
			[Symbol.toStringTag]: { value: "Module" }
		});
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/blueprints.js
		const DSH_REVISION = "dsh-v0.1.2-alpha.1@cd5ef8148158c3a752a658978873241fdf8e2bbc";
		const CODEX_SOURCE_REVISION = "rust-v0.149.0@758ef40f50c1a458425c7cfbf1eb12cbc07af0b0";
		const CODEX_PROTOCOL_REVISION = "@openai/codex@0.149.0";
		function ref(authority, owner, symbol, revision, path) {
			return Object.freeze({
				authority,
				owner,
				symbol,
				revision,
				path
			});
		}
		const DSH_LOOP = ref("upstream-source", "@deepseek-ai/dsh-agent-loop", "ReactLoopAgent", DSH_REVISION, "packages/core/agent-loop/src/agent.ts");
		const DSH_SCHEDULER = ref("upstream-source", "@deepseek-ai/dsh-agent-loop", "executeToolCalls / runGroup", DSH_REVISION, "packages/core/agent-loop/src/tool-calls.ts");
		const DSH_TOOLS = ref("upstream-source", "@deepseek-ai/dsh-tools", "ToolRuntime scheduler pipeline", DSH_REVISION, "packages/core/tools/src/index.ts");
		const DSH_APPROVAL = ref("upstream-source", "@deepseek-ai/dsh-user-approval", "ApprovalService.request", DSH_REVISION, "packages/interaction/user-approval/src/index.ts");
		const DSH_COMPACTION = ref("upstream-source", "@deepseek-ai/dsh-compaction", "CompactionEngine", DSH_REVISION, "packages/compaction/compaction/src/index.ts");
		const DSH_SUBAGENT = ref("upstream-source", "@deepseek-ai/dsh-subagent", "Subagent provider / continuation", DSH_REVISION, "packages/subagent/subagent/README.md");
		const CODEX_TURN = ref("upstream-source", "@openai/codex-core", "run_turn / run_sampling_request", CODEX_SOURCE_REVISION, "codex-rs/core/src/session/turn.rs");
		const CODEX_REGULAR_TASK = ref("upstream-source", "@openai/codex-core", "RegularTask::run", CODEX_SOURCE_REVISION, "codex-rs/core/src/tasks/regular.rs");
		const CODEX_TOOL_RUNTIME = ref("upstream-source", "@openai/codex-core", "ToolCallRuntime", CODEX_SOURCE_REVISION, "codex-rs/core/src/tools/parallel.rs");
		const CODEX_TOOL_ROUTER = ref("upstream-source", "@openai/codex-core", "ToolRouter", CODEX_SOURCE_REVISION, "codex-rs/core/src/tools/router.rs");
		const CODEX_COMPACTION = ref("upstream-source", "@openai/codex-core", "run_inline_auto_compact_task", CODEX_SOURCE_REVISION, "codex-rs/core/src/compact.rs");
		const CODEX_SUBAGENT = ref("upstream-source", "@openai/codex-core", "AgentControl::spawn_agent", CODEX_SOURCE_REVISION, "codex-rs/core/src/agent/control/spawn.rs");
		const CODEX_APP_SERVER = ref("upstream-source", "@openai/codex-app-server", "turn/item JSON-RPC bridge", CODEX_SOURCE_REVISION, "codex-rs/app-server/src/bespoke_event_handling.rs");
		const CODEX_PROTOCOL = ref("public-protocol", "@openai/codex", "App Server JSON-RPC", CODEX_PROTOCOL_REVISION, "codex-rs/app-server/README.md");
		const AEZY_CODEX = ref("adapter-source", "@aezy/codex", "AezyCodexAdapter", "workspace", "packages/aezy-codex/src/dsh-adapter.js");
		function lane(id, label, owner, y, height, sourceRefs) {
			return Object.freeze({
				id,
				label,
				owner,
				bounds: Object.freeze({
					x: 16,
					y,
					width: 1448,
					height
				}),
				sourceRefs: Object.freeze(sourceRefs)
			});
		}
		function node(id, laneId, kind, label, owner, description, x, y, sourceRefs, runtime = void 0, opaque = false) {
			return Object.freeze({
				id,
				laneId,
				kind,
				label,
				owner,
				description,
				position: Object.freeze({
					x,
					y
				}),
				sourceRefs: Object.freeze(sourceRefs),
				...runtime === void 0 ? {} : { runtime: Object.freeze({
					spanNodeIds: Object.freeze(runtime.spanNodeIds),
					...runtime.statuses === void 0 ? {} : { statuses: Object.freeze(runtime.statuses) }
				}) },
				...opaque ? { opaque: true } : {}
			});
		}
		function edge(id, from, to, kind, label, guard, sourceRefs) {
			return Object.freeze({
				id,
				from,
				to,
				kind,
				label,
				guard,
				sourceRefs: Object.freeze(sourceRefs)
			});
		}
		function blueprint(value) {
			return Object.freeze({
				...value,
				lanes: Object.freeze(value.lanes),
				nodes: Object.freeze(value.nodes),
				edges: Object.freeze(value.edges)
			});
		}
		const dshNative = blueprint({
			id: "dsh-native",
			revision: 3,
			title: "DSH native agent loop · full logic",
			description: "Pinned DSH control flow with explicit inbox, request, retry, compaction, concurrency, approval, tool finalization, Subagent, cancellation, and durable boundaries.",
			canvas: Object.freeze({
				width: 1480,
				height: 1220,
				nodeWidth: 184,
				nodeHeight: 70
			}),
			lanes: [
				lane("dsh-session", "Session / Inbox", "DSH Session + Agent Inbox", 16, 174, [DSH_LOOP]),
				lane("dsh-agent", "Turn / Step control", "DSH ReactLoopAgent", 202, 220, [DSH_LOOP]),
				lane("dsh-model", "Context / Model request", "DSH Agent + LLM adapter", 434, 220, [DSH_LOOP]),
				lane("dsh-tools", "Tool scheduler / execution pipeline", "DSH Agent scheduler + ToolRuntime", 666, 332, [DSH_SCHEDULER, DSH_TOOLS]),
				lane("dsh-services", "Recovery / child loop / durable convergence", "DSH composed services", 1010, 194, [
					DSH_COMPACTION,
					DSH_SUBAGENT,
					DSH_LOOP
				])
			],
			nodes: [
				node("dsh-session-idle", "dsh-session", "boundary", "Session idle / running", "DSH Agent", "One driver owns the Session phase; wakeups latch behind maintenance or an aborted activity.", 36, 72, [DSH_LOOP], { spanNodeIds: ["session"] }),
				node("dsh-inbox-route", "dsh-session", "decision", "Route input target", "DSH Agent Inbox", "Follow-up targets next-turn; steer/inject target next-step; waking input after abort is reclassified to next-turn.", 248, 72, [DSH_LOOP]),
				node("dsh-turn-start", "dsh-session", "boundary", "Append turn/start", "DSH Agent / Session", "Open exactly one durable Turn before claiming the first proposed step.", 460, 72, [DSH_LOOP], { spanNodeIds: ["turn"] }),
				node("dsh-step-start", "dsh-session", "boundary", "Append step/start", "DSH Agent / Session", "Commit the Step only after pre-step accepts non-empty work.", 672, 72, [DSH_LOOP], { spanNodeIds: ["agent-phase"] }),
				node("dsh-append-input", "dsh-session", "phase", "Append accepted input", "DSH Session", "Persist accepted user/context messages before deriving the model request.", 884, 72, [DSH_LOOP]),
				node("dsh-step-end", "dsh-session", "boundary", "Append step/end", "DSH Agent / Session", "Close every committed Step in a finally boundary before Turn convergence.", 1096, 72, [DSH_LOOP]),
				node("dsh-turn-end", "dsh-session", "boundary", "Append turn/end", "DSH Agent / Session", "Persist the structured completed, blocked, max-tokens, aborted, or error reason.", 1248, 72, [DSH_LOOP], {
					spanNodeIds: ["turn"],
					statuses: [
						"completed",
						"failed",
						"cancelled",
						"interrupted"
					]
				}),
				node("dsh-claim-input", "dsh-agent", "phase", "Claim inbox batch", "DSH Agent Inbox", "Atomically claim next-turn input at the Turn boundary or next-step input between Steps.", 36, 250, [DSH_LOOP]),
				node("dsh-assemble-context", "dsh-agent", "phase", "Assemble prompt sections", "DSH system prompt / runtime context", "Assemble system sections, render context, and project runtime context for this boundary.", 248, 250, [DSH_LOOP]),
				node("dsh-pre-step", "dsh-agent", "decision", "agent/pre-step waterfall", "DSH Agent events", "Extensions accept, replace, enrich, or reject the proposed Step; cancellation is rechecked after the waterfall.", 460, 250, [DSH_LOOP]),
				node("dsh-empty-step", "dsh-agent", "decision", "Empty initial work?", "DSH Agent", "A removed or rewritten-empty waking message owns its Turn boundary but spends no model call.", 672, 250, [DSH_LOOP]),
				node("dsh-next-step", "dsh-agent", "decision", "Continue same Turn?", "DSH Agent / Inbox", "A null step outcome or queued next-step context opens another Step; otherwise the Turn enters stopping hooks.", 884, 250, [DSH_LOOP]),
				node("dsh-stopping-hook", "dsh-agent", "phase", "agent/turn-stopping", "DSH Agent events", "Run the serial stopping hook only after a terminal step outcome and an empty next-step inbox.", 1096, 250, [DSH_LOOP]),
				node("dsh-turn-outcome", "dsh-agent", "finalize", "Select Turn outcome", "DSH Agent", "Preserve max-tokens, blocked, completed, aborted, or structured error as the authoritative end reason.", 1248, 250, [DSH_LOOP]),
				node("dsh-error-containment", "dsh-agent", "finalize", "Contain plugin / loop error", "DSH Agent driver", "Report agent/error, close the current Turn, and keep the long-lived driver available for later work.", 1096, 342, [DSH_LOOP]),
				node("dsh-request-config", "dsh-model", "phase", "Resolve request config", "DSH Agent / LLM registry", "Run agent/request, resolve exact provider/model defaults, and bind the prepared adapter call.", 36, 482, [DSH_LOOP]),
				node("dsh-request-header", "dsh-model", "phase", "Persist request header/context", "DSH Agent / Session", "Append initial/resume/change/series header and provider/model/context-window facts when they change.", 248, 482, [DSH_LOOP]),
				node("dsh-model-inference", "dsh-model", "opaque", "Model inference", "Selected model provider", "The model’s private inference and chain-of-thought are outside the Agent topology and never inspected.", 460, 482, [DSH_LOOP], void 0, true),
				node("dsh-model-stream", "dsh-model", "model", "Stream response blocks", "DSH LLM adapter / Agent", "Append public chunks, assemble blocks and usage, and preserve delivered text on cooperative interruption.", 672, 482, [DSH_LOOP], { spanNodeIds: ["model"] }),
				node("dsh-request-result", "dsh-model", "decision", "Classify stream finish", "DSH Agent", "Distinguish success, max-tokens, retryable error, terminal error, abort, and context-overflow recovery.", 884, 482, [DSH_LOOP]),
				node("dsh-assistant-anchor", "dsh-model", "phase", "Append assistant/message", "DSH Agent / Session", "Commit the assembled assistant message and exact known usage with source chunk references.", 1096, 482, [DSH_LOOP]),
				node("dsh-response-decision", "dsh-model", "decision", "Tool calls present?", "DSH Agent", "No tool call completes the Step; model-ordered tool calls enter the scheduler.", 1248, 482, [DSH_LOOP]),
				node("dsh-request-retry", "dsh-model", "retry", "request-error recovery", "DSH retry policy", "A handling listener returns retry and re-enters the same Step; an unhandled failure is terminal.", 672, 574, [DSH_LOOP], { spanNodeIds: ["retry"] }),
				node("dsh-parse-calls", "dsh-tools", "tool", "Parse model tool calls", "DSH Agent scheduler", "Parse each model call into an immutable execution identity while preserving model order.", 36, 714, [DSH_SCHEDULER]),
				node("dsh-classify-mode", "dsh-tools", "decision", "Classify live mode", "DSH ToolRuntime", "Unknown, invalid, throwing, or non-true classifiers fail closed to exclusive; safe calls may be parallel.", 248, 714, [DSH_SCHEDULER, DSH_TOOLS]),
				node("dsh-exclusive-barrier", "dsh-tools", "phase", "Exclusive barrier", "DSH Agent scheduler", "Drain the active pool and run one exclusive call alone before classifying later calls again.", 460, 714, [DSH_SCHEDULER]),
				node("dsh-parallel-pool", "dsh-tools", "phase", "Bounded rolling pool", "DSH Agent scheduler", "Start parallel-safe calls up to maxParallelToolCalls and stop replenishment on abort or scheduler failure.", 460, 806, [DSH_SCHEDULER]),
				node("dsh-prepare-call", "dsh-tools", "tool", "Append call + prepare", "DSH scheduler / ToolRuntime", "Append tool/call, materialize immutable input, and enter ordered pre-execute policy.", 672, 714, [DSH_SCHEDULER, DSH_TOOLS]),
				node("dsh-tool-policy", "dsh-tools", "approval", "tools/pre-execute", "DSH ToolRuntime + Aezy Security", "Extensible policy returns allow, deny, or ask without weakening later guards.", 884, 714, [DSH_TOOLS]),
				node("dsh-approval", "dsh-tools", "approval", "Resolve approval ask", "DSH ApprovalService", "Use the owning approval channel for a fail-closed human or durable-rule decision.", 1096, 714, [DSH_APPROVAL], { spanNodeIds: ["approval"] }),
				node("dsh-monotonic-guards", "dsh-tools", "approval", "Recheck guards + cancel", "DSH ToolRuntime", "Monotonic guards and caller cancellation run after extensible policy and cannot be bypassed by approval.", 1248, 714, [DSH_TOOLS]),
				node("dsh-tool-dispatch", "dsh-tools", "tool", "Dispatch tool body", "DSH ToolRuntime", "Run the around-execute waterfall and tool body with fused cooperative cancellation.", 672, 898, [DSH_TOOLS], { spanNodeIds: ["tool"] }),
				node("dsh-post-process", "dsh-tools", "tool", "Post-process + finalize", "DSH ToolRuntime", "Normalize errors, run post-execute when eligible, finalize content, materialize and freeze the outcome.", 884, 898, [DSH_TOOLS]),
				node("dsh-ordered-commit", "dsh-tools", "phase", "Commit result in model order", "DSH Agent scheduler / Session", "Wait for contiguous settled slots, append tool/result, and stage additional context in model order.", 1096, 898, [DSH_SCHEDULER, DSH_TOOLS]),
				node("dsh-tool-concludes", "dsh-tools", "decision", "Result concludes Turn?", "DSH Agent scheduler", "A committed result may conclude the Turn; otherwise the next Step sees its staged context.", 1248, 898, [DSH_SCHEDULER]),
				node("dsh-compaction-trigger", "dsh-services", "decision", "Compaction recovery?", "DSH request recovery", "Context pressure or overflow may select compaction instead of terminal failure.", 36, 1054, [DSH_LOOP, DSH_COMPACTION]),
				node("dsh-compaction-bracket", "dsh-services", "compaction", "Compact + rebuild context", "DSH CompactionEngine", "Create a durable balanced bracket, replace the selected surface range, and rebuild the request context.", 248, 1054, [DSH_COMPACTION], { spanNodeIds: ["compaction"] }),
				node("dsh-cancel-drain", "dsh-services", "cancel", "Abort + drain started calls", "DSH Agent scheduler", "Stop new starts, settle started work, and append synthetic aborted results for undispatched model calls.", 460, 1054, [DSH_LOOP, DSH_SCHEDULER]),
				node("dsh-subagent-child", "dsh-services", "subagent", "Create / resume child Session", "DSH Subagent", "A Subagent tool delegates to a separately owned child Session and returns only its settled outcome.", 672, 1054, [DSH_SUBAGENT, DSH_TOOLS], { spanNodeIds: ["subagent"] }),
				node("dsh-finalize-driver", "dsh-services", "finalize", "Converge driver state", "DSH Agent driver", "Return idle, replay a latched wake, or claim queued work with a fresh cancellation controller.", 1096, 1054, [DSH_LOOP])
			],
			edges: [
				edge("dsh-idle-input", "dsh-session-idle", "dsh-inbox-route", "normal", "send", "input is inserted", [DSH_LOOP]),
				edge("dsh-input-wakes", "dsh-inbox-route", "dsh-turn-start", "branch", "wakeup", "driver is idle or wake is latched", [DSH_LOOP]),
				edge("dsh-input-injects", "dsh-inbox-route", "dsh-claim-input", "branch", "next-step", "live Turn can claim injected work", [DSH_LOOP]),
				edge("dsh-turn-claims", "dsh-turn-start", "dsh-claim-input", "normal", "next-turn", "turn/start committed", [DSH_LOOP]),
				edge("dsh-claim-assembles", "dsh-claim-input", "dsh-assemble-context", "normal", "claimed batch", "inbox claim succeeds", [DSH_LOOP]),
				edge("dsh-assemble-prestep", "dsh-assemble-context", "dsh-pre-step", "normal", "proposal", "context assembly settles", [DSH_LOOP]),
				edge("dsh-prestep-blocks", "dsh-pre-step", "dsh-turn-outcome", "branch", "reject", "pre-step rejects", [DSH_LOOP]),
				edge("dsh-prestep-enters", "dsh-pre-step", "dsh-empty-step", "branch", "enter", "pre-step accepts", [DSH_LOOP]),
				edge("dsh-empty-completes", "dsh-empty-step", "dsh-turn-outcome", "branch", "empty initial", "first Step has no messages", [DSH_LOOP]),
				edge("dsh-work-opens-step", "dsh-empty-step", "dsh-step-start", "branch", "has work", "accepted messages are non-empty", [DSH_LOOP]),
				edge("dsh-step-appends", "dsh-step-start", "dsh-append-input", "normal", "durable input", "step/start committed", [DSH_LOOP]),
				edge("dsh-input-builds-request", "dsh-append-input", "dsh-request-config", "normal", "derive", "accepted input is durable", [DSH_LOOP]),
				edge("dsh-config-persists", "dsh-request-config", "dsh-request-header", "normal", "resolved route", "provider/model are valid", [DSH_LOOP]),
				edge("dsh-header-infers", "dsh-request-header", "dsh-model-inference", "normal", "request", "header and request context are current", [DSH_LOOP]),
				edge("dsh-inference-streams", "dsh-model-inference", "dsh-model-stream", "normal", "public stream", "provider emits response blocks", [DSH_LOOP]),
				edge("dsh-stream-classifies", "dsh-model-stream", "dsh-request-result", "normal", "finish", "stream settles", [DSH_LOOP]),
				edge("dsh-result-retries", "dsh-request-result", "dsh-request-retry", "retry", "retryable", "request-error returns retry", [DSH_LOOP]),
				edge("dsh-retry-request", "dsh-request-retry", "dsh-request-config", "loop-back", "same Step", "retry policy permits another request", [DSH_LOOP]),
				edge("dsh-result-compacts", "dsh-request-result", "dsh-compaction-trigger", "branch", "context overflow", "compaction recovery accepts", [DSH_LOOP, DSH_COMPACTION]),
				edge("dsh-compaction-runs", "dsh-compaction-trigger", "dsh-compaction-bracket", "branch", "compact", "recovery has an eligible range", [DSH_COMPACTION]),
				edge("dsh-compaction-rebuilds", "dsh-compaction-bracket", "dsh-assemble-context", "loop-back", "rebuild", "checkpoint commits", [DSH_COMPACTION]),
				edge("dsh-result-errors", "dsh-request-result", "dsh-error-containment", "branch", "terminal error", "retry/compaction do not handle failure", [DSH_LOOP]),
				edge("dsh-result-aborts", "dsh-request-result", "dsh-cancel-drain", "cancel", "abort", "shared signal is aborted", [DSH_LOOP, DSH_SCHEDULER]),
				edge("dsh-result-anchors", "dsh-request-result", "dsh-assistant-anchor", "branch", "success", "response is complete or max-tokens", [DSH_LOOP]),
				edge("dsh-anchor-decides", "dsh-assistant-anchor", "dsh-response-decision", "normal", "content", "assistant message commits", [DSH_LOOP]),
				edge("dsh-response-no-tools", "dsh-response-decision", "dsh-step-end", "branch", "no tools", "assistant response is terminal", [DSH_LOOP]),
				edge("dsh-response-tools", "dsh-response-decision", "dsh-parse-calls", "branch", "tool calls", "assistant message contains calls", [DSH_LOOP, DSH_SCHEDULER]),
				edge("dsh-calls-classify", "dsh-parse-calls", "dsh-classify-mode", "normal", "planned calls", "arguments are parsed", [DSH_SCHEDULER]),
				edge("dsh-mode-exclusive", "dsh-classify-mode", "dsh-exclusive-barrier", "branch", "exclusive", "call is not proven parallel-safe", [DSH_SCHEDULER, DSH_TOOLS]),
				edge("dsh-mode-parallel", "dsh-classify-mode", "dsh-parallel-pool", "branch", "parallel", "call opts into safe overlap", [DSH_SCHEDULER, DSH_TOOLS]),
				edge("dsh-barrier-prepares", "dsh-exclusive-barrier", "dsh-prepare-call", "normal", "alone", "prior pool is drained", [DSH_SCHEDULER]),
				edge("dsh-pool-prepares", "dsh-parallel-pool", "dsh-prepare-call", "normal", "pool slot", "capacity is available", [DSH_SCHEDULER]),
				edge("dsh-pool-barrier", "dsh-parallel-pool", "dsh-exclusive-barrier", "branch", "reclassified", "later live classifier becomes exclusive", [DSH_SCHEDULER]),
				edge("dsh-prepare-policy", "dsh-prepare-call", "dsh-tool-policy", "normal", "pre-execute", "tool/call commits", [DSH_TOOLS]),
				edge("dsh-policy-asks", "dsh-tool-policy", "dsh-approval", "branch", "ask", "policy requests a decision", [DSH_TOOLS, DSH_APPROVAL]),
				edge("dsh-policy-denies", "dsh-tool-policy", "dsh-ordered-commit", "branch", "deny", "policy returns fail-closed result", [DSH_TOOLS]),
				edge("dsh-policy-guards", "dsh-tool-policy", "dsh-monotonic-guards", "branch", "allow", "pre-execute allows", [DSH_TOOLS]),
				edge("dsh-approval-allows", "dsh-approval", "dsh-monotonic-guards", "branch", "allow", "approval grants this call", [DSH_APPROVAL, DSH_TOOLS]),
				edge("dsh-approval-denies", "dsh-approval", "dsh-ordered-commit", "branch", "deny / cancel", "approval resolves fail closed", [DSH_APPROVAL, DSH_TOOLS]),
				edge("dsh-guards-dispatch", "dsh-monotonic-guards", "dsh-tool-dispatch", "branch", "admit", "guards pass and signal is live", [DSH_TOOLS]),
				edge("dsh-guards-deny", "dsh-monotonic-guards", "dsh-ordered-commit", "branch", "deny / abort", "guard or cancellation blocks dispatch", [DSH_TOOLS]),
				edge("dsh-dispatch-subagent", "dsh-tool-dispatch", "dsh-subagent-child", "branch", "Subagent tool", "selected tool delegates", [DSH_SUBAGENT, DSH_TOOLS]),
				edge("dsh-subagent-settles", "dsh-subagent-child", "dsh-post-process", "normal", "child outcome", "child Session settles", [DSH_SUBAGENT, DSH_TOOLS]),
				edge("dsh-dispatch-post", "dsh-tool-dispatch", "dsh-post-process", "normal", "settled body", "dispatch produces a normalized outcome", [DSH_TOOLS]),
				edge("dsh-post-commits", "dsh-post-process", "dsh-ordered-commit", "normal", "frozen result", "finalization succeeds", [DSH_TOOLS, DSH_SCHEDULER]),
				edge("dsh-commit-next-call", "dsh-ordered-commit", "dsh-classify-mode", "loop-back", "next call", "unstarted model calls remain", [DSH_SCHEDULER]),
				edge("dsh-commit-concludes", "dsh-ordered-commit", "dsh-tool-concludes", "normal", "batch settled", "all calls commit in order", [DSH_SCHEDULER]),
				edge("dsh-tools-next-step", "dsh-tool-concludes", "dsh-step-end", "branch", "continue", "result does not conclude Turn", [DSH_LOOP, DSH_SCHEDULER]),
				edge("dsh-tools-end-turn", "dsh-tool-concludes", "dsh-step-end", "branch", "conclude", "a result concludes Turn", [DSH_LOOP, DSH_SCHEDULER]),
				edge("dsh-step-decides", "dsh-step-end", "dsh-next-step", "normal", "closed Step", "step/end commits", [DSH_LOOP]),
				edge("dsh-result-next-step", "dsh-next-step", "dsh-claim-input", "loop-back", "next Step", "next-step input exists or outcome is nonterminal", [DSH_LOOP]),
				edge("dsh-step-stops", "dsh-next-step", "dsh-stopping-hook", "branch", "stopping", "terminal outcome and next-step inbox empty", [DSH_LOOP]),
				edge("dsh-hook-outcome", "dsh-stopping-hook", "dsh-turn-outcome", "normal", "stop", "stopping hook settles", [DSH_LOOP]),
				edge("dsh-error-outcome", "dsh-error-containment", "dsh-turn-outcome", "normal", "structured error", "failure is contained", [DSH_LOOP]),
				edge("dsh-cancel-outcome", "dsh-cancel-drain", "dsh-turn-outcome", "normal", "aborted", "started calls reach quiescence", [DSH_LOOP, DSH_SCHEDULER]),
				edge("dsh-outcome-end", "dsh-turn-outcome", "dsh-turn-end", "normal", "end reason", "Turn converges", [DSH_LOOP]),
				edge("dsh-end-driver", "dsh-turn-end", "dsh-finalize-driver", "normal", "balanced log", "turn/end commits", [DSH_LOOP]),
				edge("dsh-driver-next-turn", "dsh-finalize-driver", "dsh-turn-start", "loop-back", "queued wake", "pending input remains", [DSH_LOOP]),
				edge("dsh-driver-idle", "dsh-finalize-driver", "dsh-session-idle", "normal", "idle", "no pending input remains", [DSH_LOOP])
			],
			digest: "sha256:dc8900a001b632d3015534063f6ce0fa25a930012515fdca2f9b63eb74839ae1"
		});
		const codexAppServer = blueprint({
			id: "codex-app-server",
			revision: 3,
			title: "Codex App Server through DSH · full logic",
			description: "Pinned Codex 0.149.0 source topology plus the public App Server and Aezy/DSH security bridge. Only model inference remains opaque.",
			canvas: Object.freeze({
				width: 1480,
				height: 1190,
				nodeWidth: 184,
				nodeHeight: 70
			}),
			lanes: [
				lane("codex-dsh", "DSH provider / durable Session", "DSH Agent + Session", 16, 174, [AEZY_CODEX, DSH_LOOP]),
				lane("codex-adapter", "Aezy App Server adapter", "@aezy/codex", 202, 196, [AEZY_CODEX, CODEX_PROTOCOL]),
				lane("codex-turn", "Official Codex Turn control", "@openai/codex-core", 410, 220, [CODEX_TURN, CODEX_REGULAR_TASK]),
				lane("codex-model", "Official sampling / response loop", "@openai/codex-core", 642, 210, [CODEX_TURN]),
				lane("codex-tools", "Tool / approval / compaction / child loop", "Codex core + DSH ToolRuntime", 864, 310, [
					CODEX_TOOL_RUNTIME,
					CODEX_TOOL_ROUTER,
					DSH_TOOLS
				])
			],
			nodes: [
				node("codex-dsh-turn", "codex-dsh", "boundary", "Open DSH Turn + Step", "DSH Agent / Session", "DSH owns the visible durable Turn, Step, request header and final assistant projection.", 36, 72, [DSH_LOOP, AEZY_CODEX], { spanNodeIds: ["turn", "agent-phase"] }),
				node("codex-provider-fence", "codex-dsh", "approval", "Preset / provider fence", "Aezy mode + Codex adapter", "Require codex-app-server or legacy aezy ownership before any App Server I/O.", 248, 72, [AEZY_CODEX]),
				node("codex-project-output", "codex-dsh", "phase", "Project public output", "Aezy adapter / DSH Session", "Translate public message blocks and allowlisted activity facts into the current DSH stream.", 1096, 72, [AEZY_CODEX, CODEX_PROTOCOL]),
				node("codex-dsh-finalize", "codex-dsh", "finalize", "Finalize DSH Turn", "DSH Agent / Session", "Close the provider stream and persist assistant, Step and Turn outcome without a second Session owner.", 1248, 72, [DSH_LOOP, AEZY_CODEX], {
					spanNodeIds: ["turn"],
					statuses: [
						"completed",
						"failed",
						"cancelled",
						"interrupted"
					]
				}),
				node("codex-thread-binding", "codex-adapter", "phase", "Resolve Session ↔ Thread", "Aezy Codex adapter", "Load the durable minimal binding and reject cwd mismatch instead of silently creating a replacement Thread.", 36, 244, [AEZY_CODEX]),
				node("codex-thread-ready", "codex-adapter", "decision", "Start or resume Thread", "Aezy adapter / App Server", "Resume when tool signature changed or start one persistent read-only Thread, then preserve the binding.", 248, 244, [AEZY_CODEX, CODEX_PROTOCOL]),
				node("codex-turn-rpc", "codex-adapter", "phase", "Send turn/start", "Aezy adapter / App Server", "Submit latest input, model, effort, read-only permissions and advertised dsh.* dynamic tools.", 460, 244, [AEZY_CODEX, CODEX_PROTOCOL]),
				node("codex-public-stream", "codex-adapter", "phase", "Consume public item stream", "Aezy Codex adapter", "Route notification deltas, item completions and Turn completion by exact Thread and Turn identity.", 672, 244, [AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ["codex-turn-stream"] }),
				node("codex-interaction-route", "codex-adapter", "decision", "Route server request", "Aezy Codex adapter", "Accept only current dsh.* dynamic-tool requests; decline native escalation and stale ownership fail closed.", 884, 244, [AEZY_CODEX, CODEX_PROTOCOL]),
				node("codex-interrupt", "codex-adapter", "cancel", "turn/interrupt", "Aezy adapter / App Server", "A DSH abort interrupts the exact active Codex Turn and closes its ActivityQueue.", 1096, 244, [AEZY_CODEX, CODEX_PROTOCOL]),
				node("codex-adapter-settle", "codex-adapter", "finalize", "Settle provider stream", "Aezy Codex adapter", "Emit stop/error/aborted finish, release listeners and remove the active ownership token.", 1248, 244, [AEZY_CODEX]),
				node("codex-turn-open", "codex-turn", "boundary", "Official TurnStarted", "Codex RegularTask", "Open the official Turn, capture trace/model context and reuse one turn-scoped model client session.", 36, 458, [CODEX_REGULAR_TASK, CODEX_TURN]),
				node("codex-precompact", "codex-turn", "compaction", "Pre-sampling compaction", "Codex core", "Check existing context pressure before recording new context and user input.", 248, 458, [CODEX_TURN, CODEX_COMPACTION]),
				node("codex-capture-step", "codex-turn", "phase", "Capture Step context", "Codex Session", "Freeze environment, model, advertised tools and required MCP servers for one sampling boundary.", 460, 458, [CODEX_TURN]),
				node("codex-record-context", "codex-turn", "phase", "Record context + hooks", "Codex Session / extensions", "Persist world-state changes, skills/plugins, pending input and session-start/turn hooks.", 672, 458, [CODEX_TURN]),
				node("codex-build-prompt", "codex-turn", "phase", "Build prompt + tool router", "Codex core", "Derive visible history, base instructions, output schema and the exact model-visible tool registry.", 884, 458, [CODEX_TURN, CODEX_TOOL_ROUTER]),
				node("codex-post-sampling", "codex-turn", "decision", "Collect post-sampling state", "Codex core", "Combine model follow-up, queued input, token pressure, async hook results and context-window requests.", 1096, 458, [CODEX_TURN]),
				node("codex-stop-hooks", "codex-turn", "decision", "Run Turn stop hooks", "Codex extensions", "Stop, continue with a hook prompt, or run the legacy after-agent hook before completing the Turn.", 1248, 458, [CODEX_TURN]),
				node("codex-turn-complete", "codex-turn", "finalize", "Complete official Turn", "Codex RegularTask", "Return the last public agent message or loop again if pending input arrived before idle.", 1248, 550, [CODEX_REGULAR_TASK, CODEX_TURN]),
				node("codex-model-request", "codex-model", "model", "Prepare Responses request", "Codex core / model client", "Reuse current history, attach pending executed-tool facts and construct a parallel-tool-capable prompt.", 36, 690, [CODEX_TURN]),
				node("codex-model-inference", "codex-model", "opaque", "Model inference", "Selected model provider", "The model’s private inference and chain-of-thought are not part of the inspectable Agent control flow.", 248, 690, [CODEX_TURN], void 0, true),
				node("codex-response-stream", "codex-model", "model", "Stream ResponseEvents", "Codex model client", "Consume public output deltas/items, token/rate facts and terminal response state.", 460, 690, [CODEX_TURN]),
				node("codex-stream-retry", "codex-model", "retry", "Retry response stream", "Codex responses retry", "Retry only classified retryable failures within the provider budget; terminal limits/errors escape.", 672, 690, [CODEX_TURN]),
				node("codex-item-classifier", "codex-model", "decision", "Classify completed item", "Codex core", "Separate assistant/reasoning, function/custom/search calls, hosted items and non-tool protocol facts.", 884, 690, [CODEX_TURN, CODEX_TOOL_ROUTER]),
				node("codex-assistant-item", "codex-model", "phase", "Record assistant item", "Codex Session", "Finalize safe public assistant content, record it, and derive the last-agent-message candidate.", 1096, 690, [CODEX_TURN]),
				node("codex-follow-up", "codex-model", "decision", "Needs another sampling?", "Codex core", "Tool output, pending input, stop-hook continuation or model state may require another sampling request.", 1248, 690, [CODEX_TURN]),
				node("codex-tool-build", "codex-tools", "tool", "Decode tool call", "Codex ToolRouter", "Build a typed call from function, custom or client tool-search output; invalid arguments become model-visible failure.", 36, 912, [CODEX_TOOL_ROUTER]),
				node("codex-parallel-gate", "codex-tools", "decision", "Parallel / exclusive gate", "Codex ToolCallRuntime", "Parallel-safe calls share a read lock; exclusive calls take the write lock and wait for overlap to drain.", 248, 912, [CODEX_TOOL_RUNTIME]),
				node("codex-tool-router", "codex-tools", "tool", "Dispatch official tool route", "Codex ToolRouter", "Route native, MCP, collaboration or dynamic tools and normalize fatal versus model-visible failures.", 460, 912, [CODEX_TOOL_RUNTIME, CODEX_TOOL_ROUTER]),
				node("codex-subagent", "codex-tools", "subagent", "Spawn / continue Subagent", "Codex AgentControl", "Collaboration tools may create a child Thread, propagate bounded context and later publish its settlement.", 460, 1004, [CODEX_SUBAGENT]),
				node("codex-native-request", "codex-tools", "approval", "Native permission request", "Codex App Server", "Command/file/permission escalation is emitted as a public server request.", 672, 912, [CODEX_APP_SERVER, CODEX_PROTOCOL]),
				node("codex-dynamic-request", "codex-tools", "tool", "Emit dsh.* dynamic request", "Codex App Server", "Start the public dynamicToolCall lifecycle and wait for the client JSON-RPC response.", 672, 1004, [CODEX_APP_SERVER, CODEX_PROTOCOL]),
				node("codex-native-decline", "codex-tools", "approval", "Decline native escalation", "Aezy Codex adapter", "Keep native permissions read-only and direct the model back through the DSH namespace.", 884, 912, [AEZY_CODEX, CODEX_PROTOCOL]),
				node("codex-dsh-validate", "codex-tools", "approval", "Validate active ownership", "Aezy Codex adapter", "Require current Thread/Turn, dsh namespace, advertised tool name and unchanged active token.", 884, 1004, [AEZY_CODEX], { spanNodeIds: ["dsh-tool-bridge"] }),
				node("codex-dsh-policy", "codex-tools", "approval", "DSH pre-execute + guards", "DSH ToolRuntime / Aezy Security", "Apply the existing DSH policy, cancellation and monotonic execution guards.", 1096, 912, [DSH_TOOLS, AEZY_CODEX]),
				node("codex-dsh-approval", "codex-tools", "approval", "DSH approval decision", "DSH ApprovalService", "Resolve ask through the existing DSH approval owner; deny and cancellation remain fail closed.", 1248, 912, [DSH_APPROVAL, AEZY_CODEX], { spanNodeIds: ["approval"] }),
				node("codex-dsh-execute", "codex-tools", "tool", "Execute + freeze DSH tool", "DSH ToolRuntime", "Run the existing DSH execution and result pipeline without introducing a Codex-owned duplicate runtime.", 1248, 1004, [DSH_TOOLS, AEZY_CODEX]),
				node("codex-return-result", "codex-tools", "phase", "Return JSON-RPC result", "Aezy adapter / App Server", "Append the allowlisted DSH tool result, revalidate ownership and answer the pending server request.", 1096, 1096, [AEZY_CODEX, CODEX_PROTOCOL]),
				node("codex-record-tool-output", "codex-tools", "phase", "Record tool output item", "Codex core / Session", "Convert the settled tool response into model input and mark the sampling result as needing follow-up.", 884, 1096, [CODEX_TURN, CODEX_TOOL_RUNTIME]),
				node("codex-token-pressure", "codex-tools", "decision", "Context limit reached?", "Codex context window", "Combine pending follow-up with token/window state to decide whether mid-Turn rollover is required.", 248, 1096, [CODEX_TURN]),
				node("codex-auto-compact", "codex-tools", "compaction", "Auto-compact + replace history", "Codex compaction", "Run pre/post hooks, compact locally or remotely, replace history, recompute usage and resume the Turn.", 36, 1096, [CODEX_COMPACTION, CODEX_TURN])
			],
			edges: [
				edge("codex-dsh-fence", "codex-dsh-turn", "codex-provider-fence", "normal", "provider request", "DSH Step selects aezy-codex", [DSH_LOOP, AEZY_CODEX]),
				edge("codex-fence-binding", "codex-provider-fence", "codex-thread-binding", "branch", "allowed preset", "mode/provider ownership passes", [AEZY_CODEX]),
				edge("codex-binding-ready", "codex-thread-binding", "codex-thread-ready", "normal", "binding facts", "cwd/model binding is valid", [AEZY_CODEX]),
				edge("codex-thread-start-turn", "codex-thread-ready", "codex-turn-rpc", "normal", "Thread ready", "start/resume succeeds", [AEZY_CODEX, CODEX_PROTOCOL]),
				edge("codex-rpc-opens-turn", "codex-turn-rpc", "codex-turn-open", "normal", "turn/start", "App Server accepts the Turn", [CODEX_PROTOCOL, CODEX_REGULAR_TASK]),
				edge("codex-turn-precompact", "codex-turn-open", "codex-precompact", "normal", "preflight", "TurnStarted commits", [CODEX_TURN]),
				edge("codex-precompact-step", "codex-precompact", "codex-capture-step", "normal", "context ready", "pre-Turn compaction succeeds or is unnecessary", [CODEX_TURN, CODEX_COMPACTION]),
				edge("codex-step-context", "codex-capture-step", "codex-record-context", "normal", "frozen Step", "required environments/tools resolve", [CODEX_TURN]),
				edge("codex-context-prompt", "codex-record-context", "codex-build-prompt", "normal", "durable context", "hooks accept the Turn", [CODEX_TURN]),
				edge("codex-prompt-request", "codex-build-prompt", "codex-model-request", "normal", "sampling input", "history and tool router are ready", [CODEX_TURN, CODEX_TOOL_ROUTER]),
				edge("codex-request-inference", "codex-model-request", "codex-model-inference", "normal", "Responses API", "request dispatches", [CODEX_TURN]),
				edge("codex-inference-stream", "codex-model-inference", "codex-response-stream", "normal", "public events", "provider emits ResponseEvents", [CODEX_TURN]),
				edge("codex-stream-retries", "codex-response-stream", "codex-stream-retry", "retry", "retryable error", "provider budget remains", [CODEX_TURN]),
				edge("codex-retry-request", "codex-stream-retry", "codex-model-request", "loop-back", "retry", "backoff completes", [CODEX_TURN]),
				edge("codex-stream-items", "codex-response-stream", "codex-item-classifier", "normal", "completed item", "output item settles", [CODEX_TURN]),
				edge("codex-item-assistant", "codex-item-classifier", "codex-assistant-item", "branch", "assistant", "item is public assistant output", [CODEX_TURN]),
				edge("codex-item-tool", "codex-item-classifier", "codex-tool-build", "branch", "tool call", "item contains a client-executed call", [CODEX_TURN, CODEX_TOOL_ROUTER]),
				edge("codex-assistant-followup", "codex-assistant-item", "codex-follow-up", "normal", "recorded", "assistant item finalizes", [CODEX_TURN]),
				edge("codex-tool-parallel", "codex-tool-build", "codex-parallel-gate", "normal", "typed call", "tool call is valid", [CODEX_TOOL_ROUTER, CODEX_TOOL_RUNTIME]),
				edge("codex-parallel-route", "codex-parallel-gate", "codex-tool-router", "normal", "admitted", "read/write gate admits execution", [CODEX_TOOL_RUNTIME]),
				edge("codex-route-subagent", "codex-tool-router", "codex-subagent", "branch", "collaboration", "tool targets AgentControl", [CODEX_SUBAGENT, CODEX_TOOL_ROUTER]),
				edge("codex-subagent-output", "codex-subagent", "codex-record-tool-output", "normal", "child settlement", "Subagent publishes an outcome", [CODEX_SUBAGENT, CODEX_TURN]),
				edge("codex-route-native", "codex-tool-router", "codex-native-request", "branch", "native action", "App Server requires client approval", [CODEX_APP_SERVER, CODEX_PROTOCOL]),
				edge("codex-route-dynamic", "codex-tool-router", "codex-dynamic-request", "branch", "dsh.* dynamic", "tool belongs to advertised DSH namespace", [CODEX_APP_SERVER, CODEX_PROTOCOL]),
				edge("codex-native-declines", "codex-native-request", "codex-interaction-route", "normal", "server request", "App Server asks its client for native permission", [AEZY_CODEX, CODEX_PROTOCOL]),
				edge("codex-decline-output", "codex-native-decline", "codex-record-tool-output", "normal", "declined result", "App Server receives denial", [AEZY_CODEX, CODEX_TURN]),
				edge("codex-dynamic-validates", "codex-dynamic-request", "codex-interaction-route", "normal", "server request", "App Server asks its client to execute dsh.*", [AEZY_CODEX, CODEX_PROTOCOL]),
				edge("codex-validate-policy", "codex-dsh-validate", "codex-dsh-policy", "branch", "valid", "ownership and namespace pass", [AEZY_CODEX, DSH_TOOLS]),
				edge("codex-validate-deny", "codex-dsh-validate", "codex-return-result", "branch", "stale / invalid", "ownership or advertised name fails", [AEZY_CODEX]),
				edge("codex-policy-approval", "codex-dsh-policy", "codex-dsh-approval", "branch", "ask", "DSH pre-execute requests approval", [DSH_TOOLS, DSH_APPROVAL]),
				edge("codex-policy-execute", "codex-dsh-policy", "codex-dsh-execute", "branch", "allow", "policy and guards permit action", [DSH_TOOLS]),
				edge("codex-policy-deny", "codex-dsh-policy", "codex-return-result", "branch", "deny / cancel", "policy returns fail-closed outcome", [DSH_TOOLS]),
				edge("codex-approval-execute", "codex-dsh-approval", "codex-dsh-execute", "branch", "allow", "approval grants this call", [DSH_APPROVAL, DSH_TOOLS]),
				edge("codex-approval-deny", "codex-dsh-approval", "codex-return-result", "branch", "deny / cancel", "approval resolves fail closed", [DSH_APPROVAL, DSH_TOOLS]),
				edge("codex-execute-return", "codex-dsh-execute", "codex-return-result", "normal", "frozen result", "DSH tool settles", [DSH_TOOLS, AEZY_CODEX]),
				edge("codex-return-record", "codex-return-result", "codex-record-tool-output", "normal", "JSON-RPC response", "active ownership is unchanged", [AEZY_CODEX, CODEX_TURN]),
				edge("codex-tool-followup", "codex-record-tool-output", "codex-follow-up", "normal", "model input", "tool output is recorded", [CODEX_TURN]),
				edge("codex-follow-post", "codex-follow-up", "codex-post-sampling", "normal", "sampling settled", "all output items settle", [CODEX_TURN]),
				edge("codex-post-token", "codex-post-sampling", "codex-token-pressure", "branch", "follow-up", "model/tool/pending input requires continuation", [CODEX_TURN]),
				edge("codex-post-stop", "codex-post-sampling", "codex-stop-hooks", "branch", "no follow-up", "model and inbox are terminal", [CODEX_TURN]),
				edge("codex-token-compact", "codex-token-pressure", "codex-auto-compact", "branch", "limit reached", "context rollover requested", [CODEX_TURN, CODEX_COMPACTION]),
				edge("codex-compact-step", "codex-auto-compact", "codex-capture-step", "loop-back", "resume", "replacement history commits", [CODEX_COMPACTION, CODEX_TURN]),
				edge("codex-token-step", "codex-token-pressure", "codex-capture-step", "loop-back", "next sampling", "context remains below limit", [CODEX_TURN]),
				edge("codex-stop-continues", "codex-stop-hooks", "codex-capture-step", "loop-back", "hook prompt", "stop hook blocks with continuation", [CODEX_TURN]),
				edge("codex-stop-completes", "codex-stop-hooks", "codex-turn-complete", "branch", "stop", "hooks accept completion", [CODEX_TURN, CODEX_REGULAR_TASK]),
				edge("codex-turn-public", "codex-turn-complete", "codex-public-stream", "normal", "turn/completed", "App Server emits completion", [CODEX_APP_SERVER, CODEX_PROTOCOL]),
				edge("codex-stream-output", "codex-public-stream", "codex-project-output", "branch", "message / completion", "public item is safe to project", [AEZY_CODEX, CODEX_PROTOCOL]),
				edge("codex-stream-failure", "codex-public-stream", "codex-adapter-settle", "branch", "failed / interrupted", "public Turn status closes the provider stream without projecting a successful completion", [AEZY_CODEX, CODEX_PROTOCOL]),
				edge("codex-route-native-request", "codex-interaction-route", "codex-native-decline", "branch", "native escalation", "request is not dsh.* dynamic tool", [AEZY_CODEX]),
				edge("codex-route-dynamic-request", "codex-interaction-route", "codex-dsh-validate", "branch", "dsh.* request", "namespace and active identity appear valid", [AEZY_CODEX]),
				edge("codex-output-settle", "codex-project-output", "codex-adapter-settle", "normal", "finish", "turn completion or error closes stream", [AEZY_CODEX]),
				edge("codex-adapter-dsh-final", "codex-adapter-settle", "codex-dsh-finalize", "normal", "provider finish", "DSH consumes finish reason", [AEZY_CODEX, DSH_LOOP]),
				edge("codex-dsh-interrupt", "codex-dsh-turn", "codex-interrupt", "cancel", "abort signal", "DSH Turn is cancelled", [DSH_LOOP, AEZY_CODEX]),
				edge("codex-interrupt-settle", "codex-interrupt", "codex-adapter-settle", "normal", "aborted", "interrupt is contained", [AEZY_CODEX, CODEX_PROTOCOL])
			],
			digest: "sha256:c3a0b8b2ebabf685fb97ced746ac515e37e9cbcf4a438506b5ea8cac07ec84e0"
		});
		const LOOP_BLUEPRINTS = Object.freeze({
			"dsh-native": dshNative,
			"codex-app-server": codexAppServer
		});
		const EVIDENCE = Object.freeze({
			authoritative: "authoritative",
			derived: "derived",
			inferred: "inferred"
		});
		const RECOGNIZED = /* @__PURE__ */ new Set([
			"turn/start",
			"turn/end",
			"step/start",
			"step/end",
			"request/header",
			"assistant/message",
			"tool/call",
			"tool/result",
			"approval/asked",
			"approval/decided",
			"tool/code-dispatch-start",
			"tool/code-dispatch",
			"compaction/start",
			"compaction/summary",
			"compaction/end",
			"llm/retry",
			"llm/retry-started",
			"subagent/descriptor",
			"tool-workflow/run-start",
			"tool-workflow/run-end",
			"tool-workflow/agent-start",
			"tool-workflow/agent-end"
		]);
		function record(value) {
			return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
		}
		function integer(value) {
			return Number.isSafeInteger(value) && value >= 0 ? value : null;
		}
		function safeIdentity(value, fallback = null) {
			if (typeof value !== "string" || !/^[A-Za-z0-9._:/-]{1,200}$/u.test(value)) return fallback;
			return value;
		}
		function stableKey(value) {
			const text = String(value ?? "");
			let hash = 2166136261;
			for (let index = 0; index < text.length; index += 1) {
				hash ^= text.charCodeAt(index);
				hash = Math.imul(hash, 16777619);
			}
			return (hash >>> 0).toString(16).padStart(8, "0");
		}
		function uniqueSources(sources) {
			const seen = /* @__PURE__ */ new Set();
			return sources.filter((source) => {
				const key = JSON.stringify(source);
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
		}
		function fact(value, evidence, sources) {
			return {
				value,
				evidence,
				sources: uniqueSources(sources)
			};
		}
		function sourceRef(event, sessionId, backend) {
			return {
				source: "dsh-session",
				backend,
				sessionId,
				eventType: event.type,
				...integer(event.seq) === null ? {} : { seq: event.seq },
				...integer(event.time) === null ? {} : { time: event.time }
			};
		}
		function codexSourceRef(event, sessionId, backend) {
			if (event.type !== "tool/result") return null;
			const codex = record(record(record(event.data)?.meta)?.aezyCodex);
			if (codex === null) return null;
			const threadId = safeIdentity(codex.threadId);
			const turnId = safeIdentity(codex.turnId);
			const itemId = safeIdentity(codex.itemId);
			if (threadId === null && turnId === null && itemId === null) return null;
			return {
				source: "codex-app-server",
				backend,
				sessionId,
				eventType: "item/completed",
				...safeIdentity(codex.type) === null ? {} : { itemType: codex.type },
				...threadId === null ? {} : { threadId },
				...turnId === null ? {} : { turnId },
				...itemId === null ? {} : { itemId }
			};
		}
		function entriesToEvents(entries) {
			if (!Array.isArray(entries)) return [];
			const events = [];
			for (const entry of entries) {
				const outer = record(entry);
				if (outer === null) continue;
				const event = outer.type === "event" ? record(outer.event) : outer;
				if (event === null || typeof event.type !== "string") continue;
				if (event.type.startsWith("chunkrow/")) continue;
				events.push(event);
			}
			return events;
		}
		function turnReasonStatus(reason) {
			const kind = record(reason)?.kind;
			if (kind === "completed") return "completed";
			if (kind === "aborted") return "cancelled";
			if (kind === "interrupted") return "interrupted";
			if (kind === "error" || kind === "blocked" || kind === "max-tokens") return "failed";
			return "unknown";
		}
		function resultIsError(data) {
			if (record(data)?.error !== void 0) return true;
			return record(record(data)?.message)?.isError === true;
		}
		function resultCallId(data) {
			const message = record(record(data)?.message);
			return typeof record(message?.source)?.callId === "string" ? record(message.source).callId : null;
		}
		function normalizedUsage(value) {
			const usage = record(value);
			if (usage === null) return null;
			const fields = [
				"inputTokens",
				"cacheReadTokens",
				"cacheWriteTokens",
				"outputTokens",
				"totalTokens"
			];
			const normalized = {};
			for (const field of fields) {
				const count = integer(usage[field]);
				if (count !== null) normalized[field] = count;
			}
			return Object.keys(normalized).length === 0 ? null : normalized;
		}
		function addUsage(left, right) {
			const total = { ...left };
			for (const [key, value] of Object.entries(right)) total[key] = (total[key] ?? 0) + value;
			return total;
		}
		function overlayStatus(spans) {
			for (const status of [
				"active",
				"failed",
				"cancelled",
				"interrupted",
				"completed",
				"unknown"
			]) if (spans.some((span) => span.status.value === status)) return status;
			return "pending";
		}
		function projectBlueprintOverlay(trace) {
			const nodeOverlays = {};
			for (const nodeValue of trace.blueprint.nodes) {
				const binding = nodeValue.runtime;
				const spans = binding === void 0 ? [] : trace.spans.filter((span) => span.blueprintNodeId !== void 0 && binding.spanNodeIds.includes(span.blueprintNodeId) && (binding.statuses === void 0 || binding.statuses.includes(span.status.value)));
				let usage = {};
				let durationMs = 0;
				let activeSince = null;
				const sources = [];
				for (const span of spans) {
					if (span.usage !== void 0) usage = addUsage(usage, span.usage.value);
					if (span.durationMs !== void 0) durationMs += span.durationMs.value;
					if (span.status.value === "active" && span.startedAt !== void 0) activeSince = activeSince === null ? span.startedAt.value : Math.min(activeSince, span.startedAt.value);
					sources.push(...span.sources);
				}
				nodeOverlays[nodeValue.id] = Object.freeze({
					nodeId: nodeValue.id,
					visited: spans.length > 0,
					active: spans.some((span) => span.status.value === "active"),
					visits: spans.length,
					status: overlayStatus(spans),
					durationMs,
					...activeSince === null ? {} : { activeSince },
					...Object.keys(usage).length === 0 ? {} : { usage: Object.freeze(usage) },
					sources: Object.freeze(uniqueSources(sources)),
					evidence: EVIDENCE.derived
				});
			}
			const edgeOverlays = {};
			for (const edgeValue of trace.blueprint.edges) {
				const from = nodeOverlays[edgeValue.from];
				const to = nodeOverlays[edgeValue.to];
				const loopRequiresRepeat = edgeValue.kind === "loop-back" && ![
					"dsh-retry-request",
					"dsh-compaction-rebuilds",
					"codex-retry-request",
					"codex-compact-step",
					"codex-token-step",
					"codex-stop-continues"
				].includes(edgeValue.id);
				const traversed = from?.visited === true && to?.visited === true && (!loopRequiresRepeat || to.visits > 1);
				edgeOverlays[edgeValue.id] = Object.freeze({
					edgeId: edgeValue.id,
					traversed,
					active: traversed && to.active,
					traversals: traversed ? Math.max(1, Math.min(from.visits, to.visits)) : 0,
					evidence: EVIDENCE.derived
				});
			}
			return Object.freeze({
				blueprintId: trace.blueprint.id,
				blueprintRevision: trace.blueprint.revision,
				nodes: Object.freeze(nodeOverlays),
				edges: Object.freeze(edgeOverlays)
			});
		}
		function createBuilder(sessionId, backend, diagnostics) {
			const spans = [];
			const byId = /* @__PURE__ */ new Map();
			const add = ({ spanId, parentSpanId, parentEvidence = EVIDENCE.derived, blueprintNodeId, kind, label, event }) => {
				const ref = sourceRef(event, sessionId, backend);
				const span = {
					spanId,
					...parentSpanId === void 0 ? {} : {
						parentSpanId,
						parentEvidence
					},
					...blueprintNodeId === void 0 ? {} : { blueprintNodeId },
					kind,
					label,
					status: fact("active", EVIDENCE.authoritative, [ref]),
					...integer(event.time) === null ? {} : { startedAt: fact(event.time, EVIDENCE.authoritative, [ref]) },
					sources: [ref]
				};
				spans.push(span);
				byId.set(spanId, span);
				return span;
			};
			const close = (span, event, status = "completed", sources = []) => {
				if (span === void 0) return;
				const ref = sourceRef(event, sessionId, backend);
				const all = uniqueSources([ref, ...sources]);
				span.status = fact(status, EVIDENCE.authoritative, all);
				if (integer(event.time) !== null) {
					span.endedAt = fact(event.time, EVIDENCE.authoritative, [ref]);
					if (span.startedAt !== void 0) span.durationMs = fact(Math.max(0, event.time - span.startedAt.value), EVIDENCE.derived, uniqueSources([...span.startedAt.sources, ref]));
				}
				span.sources = uniqueSources([
					...span.sources,
					ref,
					...sources
				]);
			};
			const diagnose = (code) => {
				if (!diagnostics.some((item) => item.code === code)) diagnostics.push({
					code,
					message: code
				});
			};
			return {
				spans,
				byId,
				add,
				close,
				diagnose
			};
		}
		function project(input) {
			const sessionId = safeIdentity(input.sessionId, `session-${stableKey(input.sessionId)}`);
			const events = entriesToEvents(input.entries);
			const diagnostics = [];
			let provider = null;
			let codexEvidence = input.mode === "codex-app-server";
			for (const event of events) {
				if (event.type === "request/header") {
					const nextProvider = safeIdentity(record(record(record(event.data)?.header)?.config)?.provider);
					if (nextProvider !== null) provider = nextProvider;
					if (nextProvider === "aezy-codex") codexEvidence = true;
				}
				if (codexSourceRef(event, sessionId, "codex-app-server") !== null) codexEvidence = true;
			}
			const backend = codexEvidence ? "codex-app-server" : "dsh-native";
			const blueprint = LOOP_BLUEPRINTS[backend];
			const builder = createBuilder(sessionId, backend, diagnostics);
			const sessionEvent = events[0] ?? {
				type: "session",
				seq: 0,
				time: 0,
				data: {}
			};
			const sessionSpan = builder.add({
				spanId: `session:${stableKey(sessionId)}`,
				blueprintNodeId: "session",
				kind: "session",
				label: backend === "codex-app-server" ? "Codex App Server Session" : "DSH Session",
				event: sessionEvent
			});
			const turns = /* @__PURE__ */ new Map();
			const steps = /* @__PURE__ */ new Map();
			const models = /* @__PURE__ */ new Map();
			const tools = /* @__PURE__ */ new Map();
			const approvals = /* @__PURE__ */ new Map();
			const compactions = /* @__PURE__ */ new Map();
			const retries = /* @__PURE__ */ new Map();
			const workflows = /* @__PURE__ */ new Map();
			const workflowMembers = /* @__PURE__ */ new Map();
			const usageSources = [];
			let sessionUsage = {};
			let currentTurn = null;
			let currentStep = null;
			const stepKey = (turn, step) => `${String(turn)}:${String(step)}`;
			const toolParent = (turn, step) => steps.get(stepKey(turn, step))?.spanId ?? turns.get(turn)?.spanId ?? sessionSpan.spanId;
			const currentParent = () => currentStep === null ? currentTurn === null ? sessionSpan.spanId : turns.get(currentTurn)?.spanId ?? sessionSpan.spanId : toolParent(currentTurn, currentStep);
			for (const event of events) {
				if (!RECOGNIZED.has(event.type)) continue;
				const data = record(event.data) ?? {};
				const turn = integer(data.turn);
				const step = integer(data.step);
				switch (event.type) {
					case "turn/start": {
						if (turn === null) {
							builder.diagnose("malformed-turn-start");
							break;
						}
						currentTurn = turn;
						currentStep = null;
						const span = builder.add({
							spanId: `turn:${String(turn)}`,
							parentSpanId: sessionSpan.spanId,
							blueprintNodeId: "turn",
							kind: "turn",
							label: `Turn ${String(turn)}`,
							event
						});
						turns.set(turn, span);
						break;
					}
					case "turn/end": {
						if (turn === null) {
							builder.diagnose("malformed-turn-end");
							break;
						}
						const status = turnReasonStatus(data.reason);
						const turnSpan = turns.get(turn);
						if (turnSpan === void 0) builder.diagnose("unmatched-turn-end");
						builder.close(turnSpan, event, status);
						for (const span of builder.spans) {
							if (span.status.value !== "active" || span.kind === "session" || span.kind === "turn") continue;
							if (!span.spanId.startsWith(`turn:${String(turn)}:`)) continue;
							builder.close(span, event, status === "completed" ? "unknown" : status);
						}
						if (currentTurn === turn) {
							currentTurn = null;
							currentStep = null;
						}
						break;
					}
					case "step/start": {
						if (turn === null || step === null) {
							builder.diagnose("malformed-step-start");
							break;
						}
						currentTurn = turn;
						currentStep = step;
						const parent = turns.get(turn)?.spanId ?? sessionSpan.spanId;
						const key = stepKey(turn, step);
						const span = builder.add({
							spanId: `turn:${String(turn)}:step:${String(step)}`,
							parentSpanId: parent,
							blueprintNodeId: "agent-phase",
							kind: "agent-phase",
							label: `Step ${String(step)}`,
							event
						});
						steps.set(key, span);
						const model = builder.add({
							spanId: `${span.spanId}:model`,
							parentSpanId: span.spanId,
							blueprintNodeId: backend === "codex-app-server" ? "codex-turn-stream" : "model",
							kind: "model",
							label: backend === "codex-app-server" ? "Codex model stream" : "Model request",
							event
						});
						models.set(key, model);
						break;
					}
					case "request/header": {
						const config = record(record(data.header)?.config);
						const model = safeIdentity(config?.model);
						const route = safeIdentity(config?.provider);
						const span = currentTurn === null || currentStep === null ? void 0 : models.get(stepKey(currentTurn, currentStep));
						if (span !== void 0) {
							span.safeFacts = {
								...route === null ? {} : { provider: fact(route, EVIDENCE.authoritative, [sourceRef(event, sessionId, backend)]) },
								...model === null ? {} : { model: fact(model, EVIDENCE.authoritative, [sourceRef(event, sessionId, backend)]) }
							};
							span.sources = uniqueSources([...span.sources, sourceRef(event, sessionId, backend)]);
						}
						break;
					}
					case "assistant/message": {
						if (turn === null || step === null) {
							builder.diagnose("malformed-assistant-message");
							break;
						}
						const model = models.get(stepKey(turn, step));
						builder.close(model, event, data.interrupted === true ? "interrupted" : "completed");
						const usage = normalizedUsage(data.usage);
						if (usage !== null && model !== void 0) {
							const ref = sourceRef(event, sessionId, backend);
							model.usage = fact(usage, EVIDENCE.authoritative, [ref]);
							sessionUsage = addUsage(sessionUsage, usage);
							usageSources.push(ref);
						}
						break;
					}
					case "step/end": {
						if (turn === null || step === null) {
							builder.diagnose("malformed-step-end");
							break;
						}
						const key = stepKey(turn, step);
						builder.close(steps.get(key), event, "completed");
						const model = models.get(key);
						if (model?.status.value === "active") builder.close(model, event, "unknown");
						if (currentTurn === turn && currentStep === step) currentStep = null;
						break;
					}
					case "tool/call": {
						if (turn === null || step === null || typeof data.callId !== "string") {
							builder.diagnose("malformed-tool-call");
							break;
						}
						const name = safeIdentity(data.name, "tool");
						const span = builder.add({
							spanId: `turn:${String(turn)}:step:${String(step)}:tool:${stableKey(data.callId)}`,
							parentSpanId: toolParent(turn, step),
							blueprintNodeId: backend === "codex-app-server" ? "dsh-tool-bridge" : "tool",
							kind: "tool",
							label: `Tool · ${name}`,
							event
						});
						span.safeFacts = { tool: fact(name, EVIDENCE.authoritative, [sourceRef(event, sessionId, backend)]) };
						tools.set(data.callId, span);
						break;
					}
					case "tool/result": {
						const callId = resultCallId(data);
						if (callId === null) {
							builder.diagnose("malformed-tool-result");
							break;
						}
						const appRef = codexSourceRef(event, sessionId, backend);
						const span = tools.get(callId);
						if (span === void 0) builder.diagnose("unmatched-tool-result");
						builder.close(span, event, resultIsError(data) ? "failed" : "completed", appRef === null ? [] : [appRef]);
						break;
					}
					case "approval/asked": {
						if (typeof data.id !== "string") {
							builder.diagnose("malformed-approval-asked");
							break;
						}
						const tool = typeof data.callId === "string" ? tools.get(data.callId) : void 0;
						const name = safeIdentity(data.toolName, "tool");
						const span = builder.add({
							spanId: `approval:${stableKey(data.id)}`,
							parentSpanId: tool?.spanId ?? currentParent(),
							parentEvidence: tool === void 0 ? EVIDENCE.inferred : EVIDENCE.derived,
							blueprintNodeId: "approval",
							kind: "approval",
							label: `Approval · ${name}`,
							event
						});
						span.safeFacts = { tool: fact(name, EVIDENCE.authoritative, [sourceRef(event, sessionId, backend)]) };
						approvals.set(data.id, span);
						break;
					}
					case "approval/decided": {
						if (typeof data.id !== "string") {
							builder.diagnose("malformed-approval-decided");
							break;
						}
						const span = approvals.get(data.id);
						const outcome = safeIdentity(data.outcome, "unavailable");
						const status = outcome === "allowed-once" ? "completed" : outcome === "cancelled" ? "cancelled" : "failed";
						builder.close(span, event, status);
						if (span === void 0) builder.diagnose("unmatched-approval-decision");
						else span.safeFacts = {
							...span.safeFacts,
							outcome: fact(outcome, EVIDENCE.authoritative, [sourceRef(event, sessionId, backend)])
						};
						break;
					}
					case "tool/code-dispatch-start": {
						if (typeof data.subCallId !== "string") {
							builder.diagnose("malformed-code-dispatch");
							break;
						}
						const parent = typeof data.parentCallId === "string" ? tools.get(data.parentCallId) : void 0;
						const name = safeIdentity(data.name, "tool");
						const span = builder.add({
							spanId: `ptc-tool:${stableKey(data.subCallId)}`,
							parentSpanId: parent?.spanId ?? currentParent(),
							parentEvidence: parent === void 0 ? EVIDENCE.inferred : EVIDENCE.derived,
							blueprintNodeId: "tool",
							kind: "tool",
							label: `PTC tool · ${name}`,
							event
						});
						span.safeFacts = { tool: fact(name, EVIDENCE.authoritative, [sourceRef(event, sessionId, backend)]) };
						tools.set(data.subCallId, span);
						break;
					}
					case "tool/code-dispatch":
						if (typeof data.subCallId !== "string") {
							builder.diagnose("malformed-code-dispatch-result");
							break;
						}
						builder.close(tools.get(data.subCallId), event, data.isError === true ? "failed" : "completed");
						break;
					case "compaction/start": {
						if (typeof data.compactionId !== "string") {
							builder.diagnose("malformed-compaction-start");
							break;
						}
						const parent = turn === null ? sessionSpan.spanId : turns.get(turn)?.spanId ?? sessionSpan.spanId;
						const span = builder.add({
							spanId: `compaction:${stableKey(data.compactionId)}`,
							parentSpanId: parent,
							blueprintNodeId: "compaction",
							kind: "compaction",
							label: "Compaction",
							event
						});
						compactions.set(data.compactionId, span);
						break;
					}
					case "compaction/summary": {
						if (typeof data.compactionId !== "string") break;
						const span = compactions.get(data.compactionId);
						const usage = normalizedUsage(data.usage);
						if (usage !== null && span !== void 0) {
							const ref = sourceRef(event, sessionId, backend);
							span.usage = fact(usage, EVIDENCE.authoritative, [ref]);
							sessionUsage = addUsage(sessionUsage, usage);
							usageSources.push(ref);
						}
						break;
					}
					case "compaction/end":
						if (typeof data.compactionId !== "string") {
							builder.diagnose("malformed-compaction-end");
							break;
						}
						builder.close(compactions.get(data.compactionId), event, data.error === void 0 ? "completed" : "failed");
						break;
					case "llm/retry": {
						if (typeof data.retryId !== "string") {
							builder.diagnose("malformed-retry");
							break;
						}
						const parent = turn === null || step === null ? currentParent() : models.get(stepKey(turn, step))?.spanId ?? currentParent();
						const span = builder.add({
							spanId: `retry:${stableKey(data.retryId)}:${String(integer(data.retry) ?? 0)}`,
							parentSpanId: parent,
							blueprintNodeId: "retry",
							kind: "retry",
							label: `Retry ${String(integer(data.retry) ?? 0)}`,
							event
						});
						retries.set(`${data.retryId}:${String(integer(data.retry) ?? 0)}`, span);
						break;
					}
					case "llm/retry-started":
						if (typeof data.retryId !== "string") {
							builder.diagnose("malformed-retry-started");
							break;
						}
						builder.close(retries.get(`${data.retryId}:${String(integer(data.retry) ?? 0)}`), event, "completed");
						break;
					case "subagent/descriptor": {
						const providerName = safeIdentity(data.provider, "subagent");
						const span = builder.add({
							spanId: `subagent:${stableKey(`${String(event.seq)}:${providerName}`)}`,
							parentSpanId: sessionSpan.spanId,
							parentEvidence: EVIDENCE.inferred,
							blueprintNodeId: "subagent",
							kind: "subagent",
							label: `Subagent · ${providerName}`,
							event
						});
						builder.close(span, event, "completed");
						break;
					}
					case "tool-workflow/run-start": {
						if (typeof data.runId !== "string") {
							builder.diagnose("malformed-workflow-start");
							break;
						}
						const name = safeIdentity(data.name, "workflow");
						const span = builder.add({
							spanId: `workflow:${stableKey(data.runId)}`,
							parentSpanId: currentParent(),
							parentEvidence: EVIDENCE.inferred,
							blueprintNodeId: "agent-phase",
							kind: "agent-phase",
							label: `Workflow · ${name}`,
							event
						});
						workflows.set(data.runId, span);
						break;
					}
					case "tool-workflow/run-end": {
						if (typeof data.runId !== "string") {
							builder.diagnose("malformed-workflow-end");
							break;
						}
						const reason = record(data.stopReason)?.kind ?? data.stopReason;
						builder.close(workflows.get(data.runId), event, reason === "completed" ? "completed" : "failed");
						break;
					}
					case "tool-workflow/agent-start": {
						if (typeof data.runId !== "string" || integer(data.seq) === null) {
							builder.diagnose("malformed-workflow-agent-start");
							break;
						}
						const label = safeIdentity(data.label, "agent");
						const span = builder.add({
							spanId: `workflow:${stableKey(data.runId)}:agent:${String(data.seq)}`,
							parentSpanId: workflows.get(data.runId)?.spanId ?? currentParent(),
							parentEvidence: workflows.has(data.runId) ? EVIDENCE.derived : EVIDENCE.inferred,
							blueprintNodeId: "subagent",
							kind: "subagent",
							label: `Agent · ${label}`,
							event
						});
						const childId = safeIdentity(data.childId);
						if (childId !== null) span.safeFacts = { childSessionId: fact(childId, EVIDENCE.authoritative, [sourceRef(event, sessionId, backend)]) };
						workflowMembers.set(`${data.runId}:${String(data.seq)}`, span);
						break;
					}
					case "tool-workflow/agent-end": {
						if (typeof data.runId !== "string" || integer(data.seq) === null) {
							builder.diagnose("malformed-workflow-agent-end");
							break;
						}
						const outcome = record(data.outcome)?.kind ?? data.outcome;
						builder.close(workflowMembers.get(`${data.runId}:${String(data.seq)}`), event, outcome === "completed" ? "completed" : outcome === "cancelled" ? "cancelled" : "failed");
						break;
					}
				}
			}
			const throughSeq = events.reduce((max, event) => Math.max(max, integer(event.seq) ?? -1), -1);
			const active = builder.spans.filter((span) => span.status.value === "active");
			const lastTurn = [...turns.values()].at(-1);
			const sessionStatus = active.some((span) => span.kind === "turn") || input.running === true ? "active" : lastTurn?.status.value ?? "unknown";
			const statusSources = lastTurn?.status.sources ?? sessionSpan.status.sources;
			sessionSpan.status = fact(sessionStatus, lastTurn === void 0 ? EVIDENCE.inferred : EVIDENCE.derived, statusSources);
			const lastEvent = events.at(-1);
			if (sessionStatus !== "active" && lastEvent !== void 0 && integer(lastEvent.time) !== null) {
				sessionSpan.endedAt = fact(lastEvent.time, EVIDENCE.derived, [sourceRef(lastEvent, sessionId, backend)]);
				if (sessionSpan.startedAt !== void 0) sessionSpan.durationMs = fact(Math.max(0, lastEvent.time - sessionSpan.startedAt.value), EVIDENCE.derived, uniqueSources([...sessionSpan.startedAt.sources, sourceRef(lastEvent, sessionId, backend)]));
			}
			if (Object.keys(sessionUsage).length > 0) sessionSpan.usage = fact(sessionUsage, EVIDENCE.derived, usageSources);
			if (provider !== null) sessionSpan.safeFacts = {
				...sessionSpan.safeFacts,
				provider: fact(provider, EVIDENCE.authoritative, events.filter((event) => event.type === "request/header").map((event) => sourceRef(event, sessionId, backend)))
			};
			if (input.hasMore === true) builder.diagnose("history-window-truncated");
			if (backend === "codex-app-server") {
				builder.diagnose("app-server-item-lifecycle-partial");
				if (Object.keys(sessionUsage).length === 0) builder.diagnose("app-server-usage-not-durable");
			}
			const incomplete = input.hasMore === true || diagnostics.some((item) => item.code.includes("malformed") || item.code.includes("unmatched")) || backend === "codex-app-server";
			const activeDepth = (span) => {
				let depth = 0;
				let cursor = span.parentSpanId;
				const seen = /* @__PURE__ */ new Set();
				while (cursor !== void 0 && !seen.has(cursor) && depth < 32) {
					seen.add(cursor);
					depth += 1;
					cursor = builder.byId.get(cursor)?.parentSpanId;
				}
				return depth;
			};
			const activeSpans = builder.spans.filter((span) => span.status.value === "active").sort((left, right) => {
				const time = (right.startedAt?.value ?? 0) - (left.startedAt?.value ?? 0);
				return time !== 0 ? time : activeDepth(right) - activeDepth(left);
			});
			return {
				schemaVersion: 1,
				traceId: `loop:${stableKey(sessionId)}:${backend}`,
				sessionId,
				backend,
				mode: safeIdentity(input.mode, null),
				blueprint,
				throughSeq,
				completeness: incomplete ? "partial" : events.length === 0 ? "unavailable" : "complete",
				spans: builder.spans,
				activeSpanIds: activeSpans.map((span) => span.spanId),
				currentSpanId: activeSpans[0]?.spanId ?? null,
				diagnostics
			};
		}
		/**
		* Pure, fail-soft projection from one authoritative DSH Session event window.
		* The returned value contains only allowlisted identity, lifecycle, duration,
		* usage, and outcome facts; event payload text never crosses the boundary.
		*/
		function projectLoopTrace(input = {}) {
			try {
				return project(record(input) ?? {});
			} catch {
				const sessionId = `session-${stableKey("unavailable")}`;
				return {
					schemaVersion: 1,
					traceId: `loop:${stableKey(sessionId)}:unavailable`,
					sessionId,
					backend: "unavailable",
					mode: null,
					blueprint: {
						id: "unavailable",
						revision: 0,
						digest: "unavailable"
					},
					throughSeq: -1,
					completeness: "unavailable",
					spans: [],
					activeSpanIds: [],
					currentSpanId: null,
					diagnostics: [{
						code: "projector-failed",
						message: "projector-failed"
					}]
				};
			}
		}
		//#endregion
		//#region src/client/index.tsx
		const colors = {
			page: "var(--dsw-alias-bg-page, #0f1115)",
			raised: "var(--dsw-alias-bg-raised, #171a20)",
			soft: "var(--dsw-alias-bg-layer-1, rgba(255,255,255,.045))",
			border: "var(--dsw-alias-border-subtle, rgba(255,255,255,.13))",
			text: "var(--dsw-alias-label-primary, #e9edf2)",
			muted: "var(--dsw-alias-label-secondary, #9aa4b2)",
			active: "var(--dsw-alias-brand-primary, #6ea8fe)",
			done: "var(--dsw-alias-status-success, #62c98d)",
			failed: "var(--dsw-alias-status-danger, #ef7373)",
			warning: "var(--dsw-alias-status-warning, #dfb15b)"
		};
		function modeFrom(list, sessionId) {
			const value = list.byId[sessionId]?.projectionValues?.agentPreset;
			return typeof value === "string" ? value : null;
		}
		function degraded(trace, code) {
			if (trace.diagnostics.some((item) => item.code === code)) return trace;
			return {
				...trace,
				completeness: trace.completeness === "unavailable" ? "unavailable" : "partial",
				diagnostics: [...trace.diagnostics, {
					code,
					message: code
				}]
			};
		}
		var LoopTraceController = class {
			sessionId;
			binding;
			list;
			listeners = /* @__PURE__ */ new Set();
			snapshot;
			historyProblem = null;
			loading = null;
			stops;
			constructor(sessionId, binding, list) {
				this.sessionId = sessionId;
				this.binding = binding;
				this.list = list;
				this.snapshot = this.project();
				const refresh = () => {
					this.snapshot = this.project();
					for (const listener of this.listeners) listener();
				};
				this.stops = [
					binding.eventSource.subscribe(refresh),
					binding.session.subscribe(refresh),
					list.subscribe(refresh)
				];
			}
			getSnapshot = () => this.snapshot;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			dispose() {
				for (const stop of this.stops) stop();
				this.listeners.clear();
			}
			ensureComplete() {
				if (this.loading !== null) return this.loading;
				this.loading = this.loadComplete().finally(() => {
					this.loading = null;
				});
				return this.loading;
			}
			project() {
				const window = this.binding.eventSource.getSnapshot();
				const trace = projectLoopTrace({
					sessionId: this.sessionId,
					mode: modeFrom(this.list.getSnapshot(), this.sessionId),
					entries: window.entries,
					hasMore: window.hasMore,
					running: this.binding.session.getSnapshot().running === true
				});
				return this.historyProblem === null ? trace : degraded(trace, this.historyProblem);
			}
			async loadComplete() {
				this.historyProblem = null;
				for (let page = 0; page < 256; page += 1) {
					const before = this.binding.eventSource.getSnapshot();
					if (!before.hasMore) return;
					try {
						await this.binding.session.loadOlder();
					} catch {
						this.historyProblem = "history-load-failed";
						this.snapshot = degraded(this.project(), this.historyProblem);
						this.publish();
						return;
					}
					const after = this.binding.eventSource.getSnapshot();
					if (after.hasMore && after.revision === before.revision) {
						this.historyProblem = "history-load-stalled";
						this.snapshot = degraded(this.project(), this.historyProblem);
						this.publish();
						return;
					}
				}
				if (this.binding.eventSource.getSnapshot().hasMore) {
					this.historyProblem = "history-page-limit";
					this.snapshot = degraded(this.project(), this.historyProblem);
					this.publish();
				}
			}
			publish() {
				for (const listener of this.listeners) listener();
			}
		};
		var InspectorPanelController = class {
			target = null;
			listeners = /* @__PURE__ */ new Set();
			getSnapshot = () => this.target;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			open(sessionId) {
				this.target = { sessionId };
				this.publish();
			}
			close() {
				this.target = null;
				this.publish();
			}
			publish() {
				for (const listener of this.listeners) listener();
			}
		};
		function currentSpan(trace) {
			return trace.currentSpanId === null ? void 0 : trace.spans.find((span) => span.spanId === trace.currentSpanId);
		}
		function usageTotal(usage) {
			if (usage === void 0) return null;
			if (usage.totalTokens !== void 0) return usage.totalTokens;
			const values = [
				usage.inputTokens,
				usage.cacheReadTokens,
				usage.cacheWriteTokens,
				usage.outputTokens
			].filter((value) => typeof value === "number");
			return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0);
		}
		function shortNumber(value) {
			if (value < 1e3) return String(value);
			if (value < 1e6) return `${(value / 1e3).toFixed(value < 1e4 ? 1 : 0)}k`;
			return `${(value / 1e6).toFixed(1)}m`;
		}
		function durationText(ms) {
			const seconds = Math.max(0, Math.floor(ms / 1e3));
			if (seconds < 60) return `${String(seconds)}s`;
			const minutes = Math.floor(seconds / 60);
			if (minutes < 60) return `${String(minutes)}m ${String(seconds % 60)}s`;
			return `${String(Math.floor(minutes / 60))}h ${String(minutes % 60)}m`;
		}
		function backendLabel(backend) {
			if (backend === "codex-app-server") return "Codex App Server";
			if (backend === "dsh-native") return "DSH native";
			return "Loop unavailable";
		}
		function InspectorHeaderAction({ sessionId, useLoopTrace, openInspector }) {
			const trace = useLoopTrace((value) => value);
			const span = currentSpan(trace);
			const usage = usageTotal(trace.spans[0]?.usage?.value);
			const active = trace.activeSpanIds.length > 0;
			const [now, setNow] = (0, react.useState)(() => Date.now());
			(0, react.useEffect)(() => {
				if (!active) return;
				const timer = setInterval(() => {
					setNow(Date.now());
				}, 1e3);
				return () => {
					clearInterval(timer);
				};
			}, [active]);
			const elapsed = span?.startedAt === void 0 ? null : Math.max(0, now - span.startedAt.value);
			const pieces = [trace.mode ?? backendLabel(trace.backend), span?.label ?? (active ? "Running" : "Idle")];
			if (elapsed !== null && active) pieces.push(durationText(elapsed));
			if (usage !== null) pieces.push(`${shortNumber(usage)} tok`);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				"data-aezy-loop-inspector": true,
				"data-completeness": trace.completeness,
				"aria-label": `Open Loop Inspector: ${pieces.join(", ")}`,
				title: `${backendLabel(trace.backend)} · ${trace.completeness}`,
				onClick: () => {
					openInspector(sessionId);
				},
				style: {
					display: "inline-flex",
					alignItems: "center",
					gap: 6,
					minHeight: 26,
					maxWidth: 360,
					padding: "3px 8px",
					border: `1px solid ${colors.border}`,
					borderRadius: 999,
					background: colors.soft,
					color: colors.text,
					cursor: "pointer",
					fontSize: 11
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					"aria-hidden": "true",
					style: {
						width: 7,
						height: 7,
						borderRadius: "50%",
						background: active ? colors.active : trace.completeness === "complete" ? colors.done : colors.warning
					}
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap"
					},
					children: pieces.join(" · ")
				})]
			});
		}
		function statusColor(status) {
			if (status === "active" || status === "pending") return colors.active;
			if (status === "completed") return colors.done;
			if (status === "failed") return colors.failed;
			if (status === "cancelled" || status === "interrupted") return colors.warning;
			return colors.muted;
		}
		function spanDepth(span, byId) {
			let depth = 0;
			let parent = span.parentSpanId;
			const seen = /* @__PURE__ */ new Set();
			while (parent !== void 0 && !seen.has(parent) && depth < 16) {
				seen.add(parent);
				depth += 1;
				parent = byId.get(parent)?.parentSpanId;
			}
			return depth;
		}
		function SourceRefs({ span }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
				style: { marginTop: 6 },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", {
					style: {
						cursor: "pointer",
						color: colors.muted,
						fontSize: 10
					},
					children: ["Evidence · ", span.status.evidence]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					style: {
						margin: "5px 0 0",
						paddingLeft: 16,
						color: colors.muted,
						fontSize: 10
					},
					children: span.sources.map((source, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
						source.source,
						" · ",
						source.eventType,
						source.seq === void 0 ? "" : ` · seq ${String(source.seq)}`,
						source.itemId === void 0 ? "" : ` · item ${source.itemId}`
					] }, `${source.source}:${source.seq ?? source.itemId ?? index}`))
				})]
			});
		}
		function Timeline({ trace, now }) {
			const byId = (0, react.useMemo)(() => new Map(trace.spans.map((span) => [span.spanId, span])), [trace.spans]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
				"data-aezy-loop-timeline": true,
				style: {
					listStyle: "none",
					margin: 0,
					padding: "8px 10px 18px"
				},
				children: trace.spans.map((span) => {
					const elapsed = span.durationMs?.value ?? (span.status.value === "active" && span.startedAt !== void 0 ? Math.max(0, now - span.startedAt.value) : null);
					const usage = usageTotal(span.usage?.value);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
						"data-span-status": span.status.value,
						style: {
							margin: "7px 0",
							marginLeft: Math.min(80, spanDepth(span, byId) * 14)
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
							style: {
								border: `1px solid ${colors.border}`,
								borderLeft: `3px solid ${statusColor(span.status.value)}`,
								borderRadius: 8,
								background: colors.soft,
								padding: "8px 9px"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										alignItems: "baseline",
										gap: 7
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
											style: { fontSize: 12 },
											children: span.label
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												color: statusColor(span.status.value),
												fontSize: 10
											},
											children: span.status.value
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												marginLeft: "auto",
												color: colors.muted,
												fontSize: 10
											},
											children: [elapsed === null ? "" : durationText(elapsed), usage === null ? "" : `${elapsed === null ? "" : " · "}${shortNumber(usage)} tok`]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										marginTop: 3,
										color: colors.muted,
										fontSize: 10
									},
									children: [
										span.blueprintNodeId ?? span.kind,
										" · ",
										span.status.evidence,
										span.parentEvidence === void 0 ? "" : ` · parent ${span.parentEvidence}`
									]
								}),
								span.safeFacts === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										marginTop: 4,
										color: colors.muted,
										fontSize: 10
									},
									children: Object.entries(span.safeFacts).map(([key, value]) => `${key}=${String(value.value)}`).join(" · ")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SourceRefs, { span })
							]
						})
					}, span.spanId);
				})
			});
		}
		function blueprintPath(edge, nodes, width, height) {
			const from = nodes.get(edge.from);
			const to = nodes.get(edge.to);
			if (from === void 0 || to === void 0) return "";
			const sx = from.position.x + width / 2;
			const sy = from.position.y + height / 2;
			const tx = to.position.x + width / 2;
			const ty = to.position.y + height / 2;
			if (edge.kind === "loop-back") {
				const bend = Math.max(70, Math.abs(ty - sy) * .35);
				return `M ${String(sx)} ${String(sy)} C ${String(sx)} ${String(sy + bend)}, ${String(tx)} ${String(ty - bend)}, ${String(tx)} ${String(ty)}`;
			}
			const middle = (sx + tx) / 2;
			return `M ${String(sx)} ${String(sy)} C ${String(middle)} ${String(sy)}, ${String(middle)} ${String(ty)}, ${String(tx)} ${String(ty)}`;
		}
		function BlueprintRefs({ refs }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				style: {
					margin: "6px 0 0",
					paddingLeft: 17,
					color: colors.muted,
					fontSize: 10
				},
				children: refs.map((source) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
					style: { marginTop: 3 },
					children: [
						source.owner,
						" · ",
						source.symbol,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: { opacity: .78 },
							children: [
								source.revision,
								" · ",
								source.path
							]
						})
					]
				}, `${source.authority}:${source.owner}:${source.symbol}`))
			});
		}
		function LogicGraph({ trace, now }) {
			const blueprint = trace.blueprint;
			const overlay = (0, react.useMemo)(() => projectBlueprintOverlay(trace), [trace]);
			const nodes = (0, react.useMemo)(() => new Map(blueprint.nodes.map((nodeValue) => [nodeValue.id, nodeValue])), [blueprint]);
			const [selection, setSelection] = (0, react.useState)(null);
			const [zoom, setZoom] = (0, react.useState)(.8);
			const [availableWidth, setAvailableWidth] = (0, react.useState)(blueprint.canvas.width);
			const frame = (0, react.useRef)(null);
			const { width, height, nodeWidth, nodeHeight } = blueprint.canvas;
			(0, react.useEffect)(() => {
				const element = frame.current;
				if (element === null || typeof ResizeObserver === "undefined") return;
				const update = () => {
					setAvailableWidth(Math.max(1, element.clientWidth));
				};
				const observer = new ResizeObserver(update);
				observer.observe(element);
				update();
				return () => {
					observer.disconnect();
				};
			}, [blueprint]);
			const scale = zoom === "fit" ? Math.min(1, availableWidth / width) : zoom;
			const laneById = (0, react.useMemo)(() => new Map(blueprint.lanes.map((laneValue) => [laneValue.id, laneValue])), [blueprint]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"data-aezy-loop-logic-graph": true,
				"data-blueprint": blueprint.id,
				"data-blueprint-revision": blueprint.revision,
				"data-blueprint-digest": blueprint.digest,
				style: { padding: 12 },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "flex-start",
							gap: 18,
							marginBottom: 10
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: {
								display: "block",
								fontSize: 13
							},
							children: blueprint.title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								display: "block",
								maxWidth: 760,
								marginTop: 3,
								color: colors.muted,
								fontSize: 10
							},
							children: blueprint.description
						})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								marginLeft: "auto",
								color: colors.muted,
								fontSize: 9,
								textAlign: "right"
							},
							children: [
								"Static blueprint v",
								String(blueprint.revision),
								" · ",
								String(blueprint.nodes.length),
								" nodes / ",
								String(blueprint.edges.length),
								" edges",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
								blueprint.digest.slice(0, 24),
								"…",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										display: "inline-flex",
										gap: 7,
										marginTop: 4
									},
									children: [
										["fit", "Fit"],
										[.8, "80%"],
										[1, "100%"]
									].map(([value, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											setZoom(value);
										},
										"aria-pressed": zoom === value,
										style: {
											padding: 0,
											border: 0,
											background: "transparent",
											color: zoom === value ? colors.active : colors.muted,
											cursor: "pointer",
											fontSize: 9
										},
										children: label
									}, label))
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 12,
							marginBottom: 8,
							color: colors.muted,
							fontSize: 9
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
								display: "inline-block",
								width: 8,
								height: 8,
								marginRight: 4,
								borderRadius: "50%",
								background: colors.active
							} }), "active"] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
								display: "inline-block",
								width: 8,
								height: 8,
								marginRight: 4,
								borderRadius: "50%",
								background: colors.done
							} }), "visited"] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "solid topology is static · highlights are durable trace overlay" })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: frame,
						style: {
							width: "100%",
							overflow: "auto"
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								position: "relative",
								width: width * scale,
								height: height * scale
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									position: "absolute",
									left: 0,
									top: 0,
									width,
									height,
									transform: `scale(${String(scale)})`,
									transformOrigin: "top left",
									border: `1px solid ${colors.border}`,
									borderRadius: 10,
									background: colors.raised,
									overflow: "hidden"
								},
								children: [
									blueprint.lanes.map((laneValue) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										"data-aezy-loop-blueprint-lane": laneValue.id,
										style: {
											position: "absolute",
											left: laneValue.bounds.x,
											top: laneValue.bounds.y,
											width: laneValue.bounds.width,
											height: laneValue.bounds.height,
											border: `1px solid color-mix(in srgb, ${colors.border} 76%, transparent)`,
											borderRadius: 10,
											background: `color-mix(in srgb, ${colors.soft} 42%, transparent)`
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												position: "absolute",
												left: 12,
												top: 7,
												color: colors.muted,
												fontSize: 9,
												letterSpacing: ".04em",
												textTransform: "uppercase"
											},
											children: [
												laneValue.label,
												" · ",
												laneValue.owner
											]
										})
									}, laneValue.id)),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
										"aria-label": `${blueprint.title} edges`,
										width,
										height,
										style: {
											position: "absolute",
											inset: 0
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("marker", {
											id: "aezy-loop-arrow",
											viewBox: "0 0 10 10",
											refX: "8",
											refY: "5",
											markerWidth: "5",
											markerHeight: "5",
											orient: "auto-start-reverse",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												d: "M 0 0 L 10 5 L 0 10 z",
												fill: "context-stroke"
											})
										}) }), blueprint.edges.map((edgeValue) => {
											const state = overlay.edges[edgeValue.id];
											const from = nodes.get(edgeValue.from);
											const to = nodes.get(edgeValue.to);
											if (from === void 0 || to === void 0) return null;
											const labelX = (from.position.x + to.position.x + nodeWidth) / 2;
											const labelY = (from.position.y + to.position.y + nodeHeight) / 2 - 5;
											const stroke = state.active ? colors.active : state.traversed ? colors.done : colors.muted;
											const path = blueprintPath(edgeValue, nodes, nodeWidth, nodeHeight);
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
												"data-aezy-loop-blueprint-edge": edgeValue.id,
												"data-edge-kind": edgeValue.kind,
												"data-traversed": String(state.traversed),
												role: "button",
												tabIndex: 0,
												"aria-label": `${edgeValue.label}; guard ${edgeValue.guard}`,
												onClick: () => {
													setSelection({
														kind: "edge",
														value: edgeValue
													});
												},
												onKeyDown: (event) => {
													if (event.key === "Enter" || event.key === " ") setSelection({
														kind: "edge",
														value: edgeValue
													});
												},
												style: { cursor: "pointer" },
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
														d: path,
														fill: "none",
														stroke: "transparent",
														strokeWidth: "12",
														pointerEvents: "stroke"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
														d: path,
														fill: "none",
														stroke,
														strokeOpacity: state.traversed ? .9 : .34,
														strokeWidth: state.active ? 2.4 : edgeValue.kind === "loop-back" ? 1.7 : 1.3,
														strokeDasharray: edgeValue.kind === "loop-back" || edgeValue.kind === "retry" ? "5 4" : void 0,
														markerEnd: "url(#aezy-loop-arrow)",
														pointerEvents: "none"
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
														x: labelX,
														y: labelY,
														textAnchor: "middle",
														fill: state.traversed ? colors.text : colors.muted,
														stroke: colors.raised,
														strokeWidth: "4",
														paintOrder: "stroke",
														fontSize: "9",
														pointerEvents: "none",
														children: edgeValue.label
													})
												]
											}, edgeValue.id);
										})]
									}),
									blueprint.nodes.map((nodeValue) => {
										const state = overlay.nodes[nodeValue.id];
										const activeDuration = state.activeSince === void 0 ? 0 : Math.max(0, now - state.activeSince);
										const elapsed = state.durationMs + activeDuration;
										const tokens = usageTotal(state.usage);
										const borderColor = state.active ? colors.active : state.visited ? colors.done : colors.border;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											"data-aezy-loop-blueprint-node": nodeValue.id,
											"data-node-kind": nodeValue.kind,
											"data-runtime-status": state.status,
											"aria-label": `${nodeValue.label}; owner ${nodeValue.owner}; ${state.visited ? `visited ${String(state.visits)} times` : "not visited in loaded Session history"}`,
											onClick: () => {
												setSelection({
													kind: "node",
													value: nodeValue
												});
											},
											style: {
												position: "absolute",
												left: nodeValue.position.x,
												top: nodeValue.position.y,
												width: nodeWidth,
												height: nodeHeight,
												padding: "8px 9px",
												textAlign: "left",
												overflow: "hidden",
												border: `${nodeValue.opaque ? "2px dashed" : "1px solid"} ${borderColor}`,
												boxShadow: state.active ? `0 0 0 2px color-mix(in srgb, ${colors.active} 28%, transparent)` : "none",
												borderRadius: 8,
												background: nodeValue.opaque ? `repeating-linear-gradient(135deg, ${colors.soft}, ${colors.soft} 7px, ${colors.raised} 7px, ${colors.raised} 14px)` : colors.soft,
												color: colors.text,
												cursor: "pointer",
												zIndex: 1
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: {
														display: "flex",
														alignItems: "center",
														gap: 6
													},
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
															"aria-hidden": "true",
															style: {
																width: 7,
																height: 7,
																flex: "0 0 auto",
																borderRadius: "50%",
																background: state.active ? colors.active : state.visited ? statusColor(state.status) : colors.muted
															}
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
															style: {
																minWidth: 0,
																overflow: "hidden",
																textOverflow: "ellipsis",
																whiteSpace: "nowrap",
																fontSize: 11
															},
															children: nodeValue.label
														}),
														nodeValue.opaque ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", {
															style: {
																marginLeft: "auto",
																color: colors.warning,
																fontSize: 8
															},
															children: "OPAQUE"
														}) : null
													]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: {
														display: "block",
														marginTop: 4,
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
														color: colors.muted,
														fontSize: 9
													},
													children: laneById.get(nodeValue.laneId)?.label ?? nodeValue.owner
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: {
														display: "block",
														marginTop: 7,
														color: state.visited ? colors.text : colors.muted,
														fontSize: 9
													},
													children: [
														state.visited ? `${String(state.visits)} visit${state.visits === 1 ? "" : "s"}` : "static",
														elapsed > 0 ? ` · ${durationText(elapsed)}` : "",
														tokens === null ? "" : ` · ${shortNumber(tokens)} tok`
													]
												})
											]
										}, nodeValue.id);
									})
								]
							})
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							marginTop: 10,
							minHeight: 76,
							padding: "9px 10px",
							border: `1px solid ${colors.border}`,
							borderRadius: 8,
							background: colors.soft
						},
						children: selection === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								color: colors.muted,
								fontSize: 10
							},
							children: "Select a node to inspect its static owner and source contract. Edge labels show the branch or loop guard."
						}) : selection.kind === "node" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: { fontSize: 11 },
								children: selection.value.label
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									marginLeft: 7,
									color: colors.muted,
									fontSize: 9
								},
								children: [
									selection.value.kind,
									" · ",
									selection.value.owner,
									" · ",
									laneById.get(selection.value.laneId)?.label ?? selection.value.laneId,
									selection.value.opaque ? " · opaque boundary" : ""
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: {
									margin: "5px 0 0",
									color: colors.muted,
									fontSize: 10
								},
								children: selection.value.description
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BlueprintRefs, { refs: selection.value.sourceRefs })
						] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: { fontSize: 11 },
								children: selection.value.label
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								style: {
									margin: "5px 0 0",
									color: colors.muted,
									fontSize: 10
								},
								children: ["Guard: ", selection.value.guard]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BlueprintRefs, { refs: selection.value.sourceRefs })
						] })
					})
				]
			});
		}
		function InspectorPanel({ panel, trace: source, surface, closePanel, syncLayout }) {
			const target = (0, react.useSyncExternalStore)(panel.subscribe, panel.getSnapshot);
			const trace = (0, react.useSyncExternalStore)(source.subscribe, source.getSnapshot);
			const [view, setView] = (0, react.useState)("logic");
			const [viewport, setViewport] = (0, react.useState)(() => window.innerWidth);
			const [now, setNow] = (0, react.useState)(() => Date.now());
			const narrow = viewport < 760;
			const visible = target !== null && surface === (narrow ? "overlay" : "details");
			(0, react.useEffect)(() => {
				const resize = () => {
					setViewport(window.innerWidth);
				};
				window.addEventListener("resize", resize);
				return () => {
					window.removeEventListener("resize", resize);
				};
			}, []);
			(0, react.useEffect)(() => {
				if (target !== null) syncLayout(narrow);
			}, [
				narrow,
				syncLayout,
				target
			]);
			(0, react.useEffect)(() => {
				if (!visible) return;
				source.ensureComplete();
				const key = (event) => {
					if (event.key === "Escape") closePanel();
				};
				window.addEventListener("keydown", key);
				return () => {
					window.removeEventListener("keydown", key);
				};
			}, [
				closePanel,
				source,
				visible
			]);
			(0, react.useEffect)(() => {
				if (!visible || trace.activeSpanIds.length === 0) return;
				const timer = setInterval(() => {
					setNow(Date.now());
				}, 1e3);
				return () => {
					clearInterval(timer);
				};
			}, [trace.activeSpanIds.length, visible]);
			if (!visible || target === null) return null;
			const content = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				"aria-label": "Loop Inspector",
				"data-aezy-loop-inspector-panel": true,
				"data-session-id": target.sessionId,
				style: {
					width: "100%",
					height: "100%",
					minHeight: 0,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					background: colors.page,
					color: colors.text
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						style: {
							flex: "0 0 auto",
							padding: "9px 11px",
							borderBottom: `1px solid ${colors.border}`,
							background: colors.raised
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: { minWidth: 0 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: {
										display: "block",
										fontSize: 14
									},
									children: "Loop Inspector"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										display: "block",
										marginTop: 2,
										color: colors.muted,
										fontSize: 10
									},
									children: [
										trace.mode ?? "unknown mode",
										" · ",
										backendLabel(trace.backend),
										" · ",
										trace.completeness
									]
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "Close Loop Inspector",
								onClick: closePanel,
								style: {
									marginLeft: "auto",
									border: 0,
									background: "transparent",
									color: colors.muted,
									cursor: "pointer",
									fontSize: 20
								},
								children: "×"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							role: "tablist",
							"aria-label": "Loop Inspector view",
							style: {
								display: "flex",
								gap: 5,
								marginTop: 9
							},
							children: ["logic", "timeline"].map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "tab",
								"aria-selected": view === id,
								onClick: () => {
									setView(id);
								},
								style: {
									border: `1px solid ${view === id ? colors.active : colors.border}`,
									borderRadius: 6,
									background: view === id ? colors.soft : "transparent",
									color: colors.text,
									padding: "4px 8px",
									cursor: "pointer",
									fontSize: 11
								},
								children: id === "logic" ? "Backend Logic" : "Timeline"
							}, id))
						})]
					}),
					trace.diagnostics.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						"data-aezy-loop-diagnostics": true,
						style: {
							flex: "0 0 auto",
							padding: "6px 10px",
							borderBottom: `1px solid ${colors.border}`,
							color: colors.warning,
							fontSize: 10
						},
						children: ["Visibility: ", trace.diagnostics.map((item) => item.code).join(" · ")]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							flex: "1 1 auto",
							minHeight: 0,
							overflow: "auto"
						},
						children: view === "logic" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LogicGraph, {
							trace,
							now
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Timeline, {
							trace,
							now
						})
					})
				]
			});
			return surface === "overlay" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-aezy-loop-inspector-surface": "overlay",
				style: {
					position: "absolute",
					inset: 0,
					zIndex: 3,
					background: "rgba(0,0,0,.36)"
				},
				children: content
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-aezy-loop-inspector-surface": "details",
				style: {
					width: "100%",
					height: "100%"
				},
				children: content
			});
		}
		const inject = [
			"slots",
			"sessions",
			"layout"
		];
		function apply(raw) {
			const ctx = raw;
			const traces = /* @__PURE__ */ new Map();
			const panel = new InspectorPanelController();
			let disposePanelSlots = null;
			const traceFor = (sessionId) => {
				const existing = traces.get(sessionId);
				if (existing !== void 0) return existing;
				const binding = ctx.sessions.binding(sessionId);
				if (binding === void 0) throw new Error(`aezy-inspector: no Session binding for ${sessionId}`);
				const trace = new LoopTraceController(sessionId, binding, ctx.sessions.list);
				traces.set(sessionId, trace);
				ctx.sessions.scope(sessionId)?.effect(() => () => {
					trace.dispose();
					traces.delete(sessionId);
				}, "aezy-inspector: dispose Session trace");
				return trace;
			};
			const syncLayout = (narrow) => {
				if (narrow) ctx.layout.closeDetails();
				else ctx.layout.openDetails();
			};
			const unmountPanel = () => {
				disposePanelSlots?.();
				disposePanelSlots = null;
			};
			const closePanel = () => {
				panel.close();
				ctx.layout.closeDetails();
				unmountPanel();
			};
			const mountPanel = (trace) => {
				unmountPanel();
				const disposeDetails = ctx.slots.register({
					name: "details",
					priority: -30,
					inject: () => ({
						panel,
						trace,
						surface: "details",
						closePanel,
						syncLayout
					})
				}, InspectorPanel);
				const disposeOverlay = ctx.slots.register({
					name: "shell.overlay",
					id: "aezy-loop-inspector",
					order: 120,
					inject: () => ({
						panel,
						trace,
						surface: "overlay",
						closePanel,
						syncLayout
					})
				}, InspectorPanel);
				disposePanelSlots = () => {
					disposeOverlay();
					disposeDetails();
				};
			};
			const openInspector = (sessionId) => {
				const trace = traceFor(sessionId);
				panel.open(sessionId);
				mountPanel(trace);
				syncLayout(window.innerWidth < 760);
				trace.ensureComplete();
			};
			ctx.effect(() => ctx.sessions.list.subscribe(() => {
				const target = panel.getSnapshot();
				if (target === null) return;
				const state = ctx.sessions.list.getSnapshot();
				if ((state.current ?? target.sessionId) !== target.sessionId || state.byId[target.sessionId] === void 0) closePanel();
			}), "aezy-inspector: close panel on Session identity change");
			ctx.effect(() => () => {
				panel.close();
				unmountPanel();
				for (const trace of traces.values()) trace.dispose();
				traces.clear();
			}, "aezy-inspector: dispose");
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "aezy-loop-inspector",
				order: 30,
				inject: (sessionId) => ({
					hooks: { loopTrace: traceFor(sessionId) },
					openInspector
				})
			}, InspectorHeaderAction));
		}
		var client_default = {
			inject,
			apply
		};
		//#endregion
		exports.InspectorHeaderAction = InspectorHeaderAction;
		exports.InspectorPanel = InspectorPanel;
		exports.LoopTraceController = LoopTraceController;
		exports.apply = apply;
		exports.default = client_default;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map