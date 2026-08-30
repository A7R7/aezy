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
		const EVIDENCE = Object.freeze({
			authoritative: "authoritative",
			derived: "derived",
			inferred: "inferred"
		});
		const DSH_REVISION = "dsh-v0.1.2-alpha.1@cd5ef8148158c3a752a658978873241fdf8e2bbc";
		const CODEX_REVISION = "@openai/codex@0.149.0";
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
		const DSH_TOOLS = ref("upstream-source", "@deepseek-ai/dsh-tools", "Tools execution pipeline", DSH_REVISION, "packages/core/tools/README.md");
		const DSH_APPROVAL = ref("upstream-source", "@deepseek-ai/dsh-user-approval", "UserApproval.request", DSH_REVISION, "packages/interaction/user-approval/src/index.ts");
		const DSH_RETRY = ref("upstream-source", "@deepseek-ai/dsh-llm-retry", "agent/request-error recovery", DSH_REVISION, "packages/llm/llm-retry/README.md");
		const DSH_COMPACTION = ref("upstream-source", "@deepseek-ai/dsh-compaction", "CompactionEngine", DSH_REVISION, "packages/compaction/compaction/README.md");
		const DSH_SUBAGENT = ref("upstream-source", "@deepseek-ai/dsh-subagent", "Subagent provider/continuation", DSH_REVISION, "packages/subagent/subagent/README.md");
		const CODEX_PROTOCOL = ref("public-protocol", "@openai/codex", "App Server JSON-RPC", CODEX_REVISION, "app-server");
		const AEZY_CODEX = ref("adapter-source", "@aezy/codex", "CodexDshAdapter", "workspace", "packages/aezy-codex/src/dsh-adapter.js");
		function node(id, kind, label, owner, description, x, y, sourceRefs, runtime = void 0, opaque = false) {
			return Object.freeze({
				id,
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
				nodes: Object.freeze(value.nodes),
				edges: Object.freeze(value.edges)
			});
		}
		const LOOP_BLUEPRINTS = Object.freeze({
			"dsh-native": blueprint({
				id: "dsh-native",
				revision: 2,
				title: "DSH native agent loop",
				description: "Static control flow owned by the DSH Agent and composed tool, retry, approval, compaction, and Subagent services.",
				canvas: Object.freeze({
					width: 1160,
					height: 790,
					nodeWidth: 180,
					nodeHeight: 86
				}),
				nodes: [
					node("inbox", "boundary", "Queued input", "DSH Agent / Inbox", "Follow-up and steering input waits in the Session-backed inbox.", 28, 32, [DSH_LOOP], { spanNodeIds: ["session"] }),
					node("turn-boundary", "boundary", "Open Turn", "DSH Agent", "A waking input opens one durable turn/start boundary.", 248, 32, [DSH_LOOP], { spanNodeIds: ["turn"] }),
					node("pre-step", "phase", "Claim + assemble context", "DSH Agent / system prompt", "Claim the target inbox, assemble prompt sections, and run the pre-step waterfall.", 468, 32, [DSH_LOOP], { spanNodeIds: ["agent-phase"] }),
					node("model-request", "model", "Build + stream model request", "DSH Agent / LLM adapter", "Resolve the provider route, append the request header, stream blocks, and durably append the assistant message.", 688, 32, [DSH_LOOP], { spanNodeIds: ["model"] }),
					node("response-decision", "decision", "Tool calls?", "DSH Agent", "A completed assistant message either ends the step or yields ordered tool calls.", 908, 32, [DSH_LOOP], {
						spanNodeIds: ["model"],
						statuses: ["completed"]
					}),
					node("model-retry", "retry", "Provider retry/backoff", "DSH LLM retry", "A retry decision records durable scheduling and re-enters the same model step.", 688, 188, [DSH_LOOP, DSH_RETRY], { spanNodeIds: ["retry"] }),
					node("tool-scheduler", "tool", "Schedule tool calls", "DSH Agent tool scheduler", "Exclusive calls form barriers; parallel calls run in a bounded rolling pool and commit in model order.", 908, 250, [DSH_LOOP, DSH_TOOLS], { spanNodeIds: ["tool"] }),
					node("approval-gate", "approval", "Security + approval gate", "DSH tools / approval", "Pre-execute policy and monotonic guards may deny or request a fail-closed human decision.", 688, 406, [DSH_TOOLS, DSH_APPROVAL], { spanNodeIds: ["approval"] }),
					node("tool-pipeline", "tool", "Execute + finalize tool", "DSH tools", "Dispatch through execute wrappers, post-process, finalize content, and freeze the result.", 908, 406, [DSH_TOOLS], { spanNodeIds: ["tool"] }),
					node("subagent", "subagent", "Subagent-owned child loop", "DSH Subagent", "A Subagent tool may create or resume a separately owned child Session and later return its result.", 688, 562, [DSH_SUBAGENT, DSH_TOOLS], { spanNodeIds: ["subagent"] }),
					node("result-context", "phase", "Commit result + next-step context", "DSH Agent / Session", "Append tool/result in model order and stage additional context for the next step.", 908, 562, [DSH_LOOP, DSH_TOOLS], {
						spanNodeIds: ["tool"],
						statuses: [
							"completed",
							"failed",
							"cancelled",
							"interrupted"
						]
					}),
					node("compaction", "compaction", "Compaction checkpoint", "DSH Compaction backend", "Pressure or context-overflow recovery replaces a balanced surface range under a durable bracket.", 468, 250, [DSH_COMPACTION], { spanNodeIds: ["compaction"] }),
					node("finalize", "finalize", "Finalize Turn", "DSH Agent", "No pending next-step input remains; run the stopping hook and choose the structured end reason.", 468, 650, [DSH_LOOP], {
						spanNodeIds: ["turn"],
						statuses: [
							"completed",
							"failed",
							"cancelled",
							"interrupted"
						]
					}),
					node("turn-end", "boundary", "Durable turn/end", "DSH Agent / Session", "Append turn/end, then return idle or claim queued work in a new Turn.", 248, 650, [DSH_LOOP], {
						spanNodeIds: ["turn"],
						statuses: [
							"completed",
							"failed",
							"cancelled",
							"interrupted"
						]
					})
				],
				edges: [
					edge("input-opens-turn", "inbox", "turn-boundary", "normal", "wakeup", "queued input is claimed", [DSH_LOOP]),
					edge("turn-enters-step", "turn-boundary", "pre-step", "normal", "next-turn", "turn is open", [DSH_LOOP]),
					edge("step-requests-model", "pre-step", "model-request", "normal", "enter", "pre-step accepts", [DSH_LOOP]),
					edge("step-blocked", "pre-step", "finalize", "branch", "blocked", "pre-step rejects", [DSH_LOOP]),
					edge("request-yields-response", "model-request", "response-decision", "normal", "assistant message", "stream completes", [DSH_LOOP]),
					edge("request-retries", "model-request", "model-retry", "retry", "retryable error", "request-error returns retry", [DSH_LOOP, DSH_RETRY]),
					edge("retry-model", "model-retry", "model-request", "loop-back", "same step", "backoff completes", [DSH_RETRY]),
					edge("context-overflow", "model-request", "compaction", "branch", "context overflow", "compaction recovery accepts", [DSH_COMPACTION]),
					edge("compaction-rebuilds", "compaction", "pre-step", "loop-back", "rebuild context", "checkpoint commits", [DSH_COMPACTION]),
					edge("response-final", "response-decision", "finalize", "branch", "no tool calls", "assistant response is terminal", [DSH_LOOP]),
					edge("response-tools", "response-decision", "tool-scheduler", "branch", "tool calls", "assistant response contains tool calls", [DSH_LOOP]),
					edge("scheduler-gates", "tool-scheduler", "approval-gate", "branch", "ask / guard", "tool policy requires decision", [DSH_TOOLS, DSH_APPROVAL]),
					edge("scheduler-executes", "tool-scheduler", "tool-pipeline", "branch", "allow", "no approval is required", [DSH_TOOLS]),
					edge("approval-executes", "approval-gate", "tool-pipeline", "branch", "allowed once", "approval grants this action", [DSH_APPROVAL, DSH_TOOLS]),
					edge("approval-denies", "approval-gate", "result-context", "branch", "deny / cancel", "gate returns a fail-closed tool outcome", [DSH_APPROVAL, DSH_TOOLS]),
					edge("tool-spawns-child", "tool-pipeline", "subagent", "branch", "Subagent tool", "selected tool delegates", [DSH_SUBAGENT, DSH_TOOLS]),
					edge("tool-commits-result", "tool-pipeline", "result-context", "normal", "result", "dispatch settles", [DSH_LOOP, DSH_TOOLS]),
					edge("child-commits-result", "subagent", "result-context", "normal", "settlement", "child publishes an outcome", [DSH_SUBAGENT]),
					edge("result-loops-step", "result-context", "pre-step", "loop-back", "next step", "tool does not conclude Turn", [DSH_LOOP]),
					edge("result-concludes", "result-context", "finalize", "branch", "concludes Turn", "tool result concludes Turn", [DSH_LOOP]),
					edge("finalize-ends", "finalize", "turn-end", "normal", "end reason", "Turn converges", [DSH_LOOP]),
					edge("next-turn", "turn-end", "turn-boundary", "loop-back", "queued follow-up", "inbox still has pending input", [DSH_LOOP])
				],
				digest: "sha256:33dfdb3bb1ef190eeaddb04045328a3e557c17703a5b5c7456eb83615c553d3a"
			}),
			"codex-app-server": blueprint({
				id: "codex-app-server",
				revision: 2,
				title: "Codex App Server through DSH",
				description: "Static public protocol and security bridge. The official Codex agent core remains intentionally opaque.",
				canvas: Object.freeze({
					width: 1160,
					height: 790,
					nodeWidth: 180,
					nodeHeight: 86
				}),
				nodes: [
					node("dsh-turn", "boundary", "DSH Turn + step", "DSH Agent / Session", "DSH owns the visible durable Turn, step, request header, and final assistant projection.", 28, 32, [DSH_LOOP, AEZY_CODEX], { spanNodeIds: ["turn", "agent-phase"] }),
					node("thread-binding", "phase", "Bind or resume Thread", "Aezy Codex adapter", "Resolve the durable Session-to-Thread binding, then call thread/start or thread/resume.", 248, 32, [AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ["agent-phase"] }),
					node("codex-turn-start", "phase", "Start Codex Turn", "Codex App Server protocol", "Call turn/start with the selected model, read-only native permissions, dynamic DSH tools, and DSH instructions.", 468, 32, [AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ["codex-turn-stream"] }),
					node("codex-agent-core", "opaque", "Official Codex agent core", "Codex App Server", "Private model/tool/compaction/subagent micro-loop is not exposed by the public protocol and is not inferred.", 688, 32, [CODEX_PROTOCOL], { spanNodeIds: ["codex-turn-stream"] }, true),
					node("public-item-stream", "decision", "Public item / request stream", "Codex App Server protocol", "Observe documented item deltas/completions, interaction requests, and turn completion.", 908, 32, [AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ["codex-turn-stream"] }),
					node("assistant-projection", "phase", "Project assistant output", "Aezy Codex adapter / DSH Session", "Translate public message/reasoning blocks into the current DSH stream without persisting private reasoning text in Inspector.", 908, 188, [AEZY_CODEX], {
						spanNodeIds: ["codex-turn-stream"],
						statuses: ["completed"]
					}),
					node("native-permission", "approval", "Decline native escalation", "Aezy Codex adapter", "Codex-native command/file/permission escalation stays read-only and is declined fail-closed.", 688, 250, [AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ["dsh-tool-bridge"] }),
					node("dsh-tool-bridge", "tool", "Map dsh.* dynamic tool", "Aezy Codex adapter", "Validate active Thread/Turn ownership and map the public dynamic-tool request to the current DSH tool registry.", 908, 344, [AEZY_CODEX, CODEX_PROTOCOL], { spanNodeIds: ["dsh-tool-bridge"] }),
					node("dsh-security-approval", "approval", "DSH Security + approval", "DSH tools / approval", "DSH policy, monotonic guards, and approval retain authority over mutable actions.", 688, 500, [
						DSH_TOOLS,
						DSH_APPROVAL,
						AEZY_CODEX
					], { spanNodeIds: ["approval"] }),
					node("dsh-tool-execution", "tool", "Execute DSH tool", "DSH tools", "Execute and finalize through the existing DSH tool pipeline; no second tool runtime is introduced.", 908, 500, [DSH_TOOLS, AEZY_CODEX], { spanNodeIds: ["dsh-tool-bridge"] }),
					node("codex-tool-result", "phase", "Return dynamic tool result", "Aezy Codex adapter / App Server", "Append the DSH tool result with allowlisted Codex identity, then answer the pending App Server request.", 908, 656, [AEZY_CODEX, CODEX_PROTOCOL], {
						spanNodeIds: ["dsh-tool-bridge"],
						statuses: [
							"completed",
							"failed",
							"cancelled",
							"interrupted"
						]
					}),
					node("interrupt", "boundary", "Interrupt Codex Turn", "Aezy Codex adapter / App Server", "A DSH abort calls turn/interrupt and closes the DSH stream as aborted.", 468, 500, [AEZY_CODEX, CODEX_PROTOCOL], {
						spanNodeIds: ["codex-turn-stream"],
						statuses: [
							"cancelled",
							"interrupted",
							"failed"
						]
					}),
					node("dsh-finalize", "finalize", "Finalize DSH Turn", "DSH Agent / Session", "turn/completed or interruption closes the provider stream; DSH appends its durable assistant/step/turn outcome.", 248, 656, [
						DSH_LOOP,
						AEZY_CODEX,
						CODEX_PROTOCOL
					], {
						spanNodeIds: ["turn"],
						statuses: [
							"completed",
							"failed",
							"cancelled",
							"interrupted"
						]
					})
				],
				edges: [
					edge("dsh-binds-thread", "dsh-turn", "thread-binding", "normal", "provider request", "preset and route gate pass", [DSH_LOOP, AEZY_CODEX]),
					edge("binding-starts-turn", "thread-binding", "codex-turn-start", "normal", "thread ready", "binding matches cwd/model", [AEZY_CODEX, CODEX_PROTOCOL]),
					edge("turn-enters-core", "codex-turn-start", "codex-agent-core", "normal", "turn/start", "App Server accepts Turn", [CODEX_PROTOCOL]),
					edge("core-emits-public", "codex-agent-core", "public-item-stream", "normal", "public events", "protocol emits an item or request", [CODEX_PROTOCOL]),
					edge("stream-projects-output", "public-item-stream", "assistant-projection", "branch", "message / completed", "public assistant item or turn completes", [AEZY_CODEX, CODEX_PROTOCOL]),
					edge("stream-requests-tool", "public-item-stream", "dsh-tool-bridge", "branch", "dsh.* dynamic tool", "request targets an advertised DSH tool", [AEZY_CODEX, CODEX_PROTOCOL]),
					edge("stream-requests-native", "public-item-stream", "native-permission", "branch", "native escalation", "request would leave the DSH boundary", [AEZY_CODEX, CODEX_PROTOCOL]),
					edge("native-declined", "native-permission", "codex-agent-core", "loop-back", "decline", "fail-closed response returns to Codex", [AEZY_CODEX, CODEX_PROTOCOL]),
					edge("bridge-enters-security", "dsh-tool-bridge", "dsh-security-approval", "normal", "pre-execute", "active ownership and namespace validate", [AEZY_CODEX, DSH_TOOLS]),
					edge("security-executes", "dsh-security-approval", "dsh-tool-execution", "branch", "allowed", "DSH gate permits action", [DSH_TOOLS, DSH_APPROVAL]),
					edge("security-denies", "dsh-security-approval", "codex-tool-result", "branch", "deny / cancel", "DSH returns fail-closed outcome", [DSH_TOOLS, DSH_APPROVAL]),
					edge("tool-returns-result", "dsh-tool-execution", "codex-tool-result", "normal", "frozen result", "DSH tool settles", [DSH_TOOLS, AEZY_CODEX]),
					edge("result-reenters-core", "codex-tool-result", "codex-agent-core", "loop-back", "JSON-RPC response", "adapter still owns active Thread/Turn", [AEZY_CODEX, CODEX_PROTOCOL]),
					edge("output-finalizes-dsh", "assistant-projection", "dsh-finalize", "normal", "turn/completed", "provider stream closes", [
						AEZY_CODEX,
						CODEX_PROTOCOL,
						DSH_LOOP
					]),
					edge("turn-interrupts", "codex-agent-core", "interrupt", "cancel", "abort", "DSH signal aborts", [AEZY_CODEX, CODEX_PROTOCOL]),
					edge("interrupt-finalizes", "interrupt", "dsh-finalize", "normal", "aborted", "interrupt response or containment completes", [AEZY_CODEX, DSH_LOOP])
				],
				digest: "sha256:78eb8734567de7cf00aa35899a817699a362fa327b329f98dd3c3317c6a9693b"
			})
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
					"retry-model",
					"compaction-rebuilds",
					"native-declined",
					"result-reenters-core"
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
			const [fit, setFit] = (0, react.useState)(true);
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
			const scale = fit ? Math.min(1, availableWidth / width) : 1;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"data-aezy-loop-logic-graph": true,
				"data-blueprint": blueprint.id,
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
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
								blueprint.digest.slice(0, 24),
								"…",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										setFit((value) => !value);
									},
									style: {
										marginTop: 4,
										padding: 0,
										border: 0,
										background: "transparent",
										color: colors.active,
										cursor: "pointer",
										fontSize: 9
									},
									children: fit ? "Open at 100%" : "Fit overview"
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
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
									"aria-label": `${blueprint.title} edges`,
									width,
									height,
									style: {
										position: "absolute",
										inset: 0,
										pointerEvents: "none"
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
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
											"data-aezy-loop-blueprint-edge": edgeValue.id,
											"data-edge-kind": edgeValue.kind,
											"data-traversed": String(state.traversed),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												d: blueprintPath(edgeValue, nodes, nodeWidth, nodeHeight),
												fill: "none",
												stroke,
												strokeOpacity: state.traversed ? .9 : .34,
												strokeWidth: state.active ? 2.4 : edgeValue.kind === "loop-back" ? 1.7 : 1.3,
												strokeDasharray: edgeValue.kind === "loop-back" || edgeValue.kind === "retry" ? "5 4" : void 0,
												markerEnd: "url(#aezy-loop-arrow)"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
												x: labelX,
												y: labelY,
												textAnchor: "middle",
												fill: state.traversed ? colors.text : colors.muted,
												stroke: colors.raised,
												strokeWidth: "4",
												paintOrder: "stroke",
												fontSize: "9",
												children: edgeValue.label
											})]
										}, edgeValue.id);
									})]
								}), blueprint.nodes.map((nodeValue) => {
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
												children: nodeValue.owner
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
								})]
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