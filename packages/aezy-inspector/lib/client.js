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
		const LOOP_BLUEPRINTS = Object.freeze({
			"dsh-native": Object.freeze({
				id: "dsh-native",
				revision: 1,
				nodes: Object.freeze([
					"session",
					"turn",
					"agent-phase",
					"model",
					"retry",
					"tool",
					"approval",
					"subagent",
					"compaction",
					"finalize"
				]),
				digest: "sha256:8b7f2e002d9e885fdf63781ba693eacd0d198cb1aa50fb4a29c036cf0cec0dc3"
			}),
			"codex-app-server": Object.freeze({
				id: "codex-app-server",
				revision: 1,
				nodes: Object.freeze([
					"session",
					"turn",
					"agent-phase",
					"codex-turn-stream",
					"retry",
					"dsh-tool-bridge",
					"approval",
					"subagent",
					"compaction",
					"finalize"
				]),
				digest: "sha256:16cd37c97f5c8b88962d73e8b8cb84d206144bd6ffd84dd8353dac3eacd87d6b"
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
		function GraphNode({ span, children, trace }) {
			const nested = children.get(span.spanId) ?? [];
			const active = trace.activeSpanIds.includes(span.spanId);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-aezy-loop-graph-node": span.blueprintNodeId ?? span.kind,
				"data-span-status": span.status.value,
				style: {
					minWidth: 145,
					maxWidth: 260,
					flex: "1 1 160px",
					padding: 8,
					border: `1px solid ${active ? colors.active : colors.border}`,
					boxShadow: active ? `0 0 0 1px ${colors.active}` : "none",
					borderRadius: 8,
					background: colors.soft
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 6,
							alignItems: "center"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							style: {
								width: 7,
								height: 7,
								borderRadius: "50%",
								background: statusColor(span.status.value)
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: { fontSize: 11 },
							children: span.label
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							marginTop: 3,
							color: colors.muted,
							fontSize: 9
						},
						children: span.blueprintNodeId ?? span.kind
					}),
					nested.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							marginTop: 9,
							paddingTop: 9,
							borderTop: `1px solid ${colors.border}`,
							display: "flex",
							alignItems: "stretch",
							gap: 7,
							flexWrap: "wrap"
						},
						children: nested.map((child) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GraphNode, {
							span: child,
							children,
							trace
						}, child.spanId))
					})
				]
			});
		}
		function Graph({ trace }) {
			const spans = trace.spans;
			const ids = new Set(spans.map((span) => span.spanId));
			const children = /* @__PURE__ */ new Map();
			const roots = [];
			for (const span of spans) if (span.parentSpanId === void 0 || !ids.has(span.parentSpanId)) roots.push(span);
			else children.set(span.parentSpanId, [...children.get(span.parentSpanId) ?? [], span]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-aezy-loop-graph": true,
				style: {
					padding: 12,
					display: "flex",
					flexDirection: "column",
					gap: 10
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						color: colors.muted,
						fontSize: 10
					},
					children: [
						"Blueprint ",
						trace.blueprint.id,
						"@",
						String(trace.blueprint.revision),
						" · ",
						trace.blueprint.digest.slice(0, 22),
						"…"
					]
				}), roots.map((span) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GraphNode, {
					span,
					children,
					trace
				}, span.spanId))]
			});
		}
		function InspectorPanel({ panel, trace: source, surface, closePanel, syncLayout }) {
			const target = (0, react.useSyncExternalStore)(panel.subscribe, panel.getSnapshot);
			const trace = (0, react.useSyncExternalStore)(source.subscribe, source.getSnapshot);
			const [view, setView] = (0, react.useState)("timeline");
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
							children: ["timeline", "graph"].map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
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
								children: id === "timeline" ? "Timeline" : "Graph"
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
						children: view === "timeline" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Timeline, {
							trace,
							now
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Graph, { trace })
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