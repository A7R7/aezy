window.__ModuleLoader__.load({
	id: "@aezy/activity",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperties(exports, {
			__esModule: { value: true },
			[Symbol.toStringTag]: { value: "Module" }
		});
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/index.tsx
		const LIMITS = {
			sessions: 24,
			notifications: 8,
			jobs: 8,
			subagents: 8
		};
		const palette = {
			page: "var(--dsw-alias-bg-base, #fff)",
			surface: "var(--dsw-alias-bg-module-platform, #f7f7f8)",
			text: "var(--dsw-alias-label-primary, #202124)",
			muted: "var(--dsw-alias-label-secondary, #737780)",
			border: "var(--dsw-alias-border-subtle, rgba(127,127,127,.22))",
			interactive: "var(--dsw-alias-bg-interactive-hover, rgba(127,127,127,.12))",
			selected: "var(--dsw-alias-bg-interactive-selected, rgba(88,113,255,.14))",
			accent: "var(--dsw-alias-state-info-primary, #4f6bed)",
			danger: "var(--dsw-alias-state-error-primary, #d33)",
			warning: "var(--dsw-alias-state-warning-primary, #9b6900)",
			success: "var(--dsw-alias-state-success-primary, #27864a)"
		};
		const cardStyle = {
			border: `1px solid ${palette.border}`,
			borderRadius: 10,
			background: palette.page,
			overflow: "hidden"
		};
		const sourceStyle = {
			marginTop: 10,
			color: palette.muted,
			fontSize: 10.5
		};
		var ActivityPanelController = class {
			target = null;
			listeners = /* @__PURE__ */ new Set();
			getSnapshot = () => this.target;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => this.listeners.delete(listener);
			};
			open(target) {
				this.target = target;
				this.emit();
			}
			close() {
				if (this.target === null) return;
				this.target = null;
				this.emit();
			}
			emit() {
				for (const listener of this.listeners) listener();
			}
		};
		function ActivityGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				"aria-hidden": "true",
				width: "15",
				height: "15",
				viewBox: "0 0 16 16",
				fill: "none",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M2 11.5h2.2l1.35-3.8 2.1 5.3 2.1-8 1.35 4H14",
					stroke: "currentColor",
					strokeWidth: "1.25",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		function attentionCount(state) {
			let count = 0;
			for (const id of state.ids) {
				const summary = state.byId[id];
				if (summary?.pendingInteraction !== void 0 || summary?.completed === true) count += 1;
				count += (state.jobsBySession[id] ?? []).filter((job) => job.status === "failed").length;
				if (count >= 99) return 99;
			}
			return count;
		}
		function ActivityHeaderAction({ openActivity, sessionId, useSessions }) {
			const attention = useSessions(attentionCount);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				"data-aezy-open-activity": true,
				title: "Open Activity and status",
				"aria-label": `Open Activity and status${attention > 0 ? `, ${attention} items need attention` : ""}`,
				onClick: () => openActivity(sessionId),
				style: {
					height: 28,
					display: "inline-flex",
					alignItems: "center",
					gap: 5,
					padding: "0 8px",
					border: `1px solid ${attention > 0 ? palette.warning : palette.border}`,
					borderRadius: 7,
					background: palette.surface,
					color: palette.text,
					cursor: "pointer",
					fontSize: 11
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActivityGlyph, {}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "Activity" }),
					attention > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"data-aezy-activity-badge": true,
						style: {
							minWidth: 16,
							height: 16,
							padding: "0 4px",
							borderRadius: 8,
							background: palette.warning,
							color: "#fff",
							fontSize: 10,
							lineHeight: "16px",
							textAlign: "center"
						},
						children: attention
					})
				]
			});
		}
		function projectionsOf(summary) {
			return summary?.projectionValues ?? {};
		}
		function tokenTotal(usage) {
			return usage.uncachedInputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
		}
		function compactNumber(value) {
			if (value < 1e3) return String(Math.round(value));
			if (value < 1e6) return `${Math.round(value / 100) / 10}K`;
			return `${Math.round(value / 1e5) / 10}M`;
		}
		function duration(value) {
			const seconds = Math.max(0, Math.round(value / 1e3));
			if (seconds < 60) return `${seconds}s`;
			const minutes = Math.floor(seconds / 60);
			if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
			return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
		}
		function relativeTime(value, now) {
			const elapsed = Math.max(0, now - value);
			if (elapsed < 6e4) return "just now";
			if (elapsed < 36e5) return `${Math.floor(elapsed / 6e4)}m ago`;
			if (elapsed < 864e5) return `${Math.floor(elapsed / 36e5)}h ago`;
			return `${Math.floor(elapsed / 864e5)}d ago`;
		}
		function interactionLabel(value) {
			if (value === "approval") return "Approval required";
			if (value === "plan-review") return "Plan review required";
			return "Answer required";
		}
		function sessionStatus(summary) {
			if (summary.pendingInteraction !== void 0) return {
				label: interactionLabel(summary.pendingInteraction),
				tone: palette.warning
			};
			if (summary.running) return {
				label: "Running",
				tone: palette.accent
			};
			if (summary.completed === true) return {
				label: "Completed · unseen",
				tone: palette.success
			};
			if (summary.blank) return {
				label: "Ready",
				tone: palette.muted
			};
			return {
				label: "Idle",
				tone: palette.muted
			};
		}
		function notificationsOf(state) {
			const rows = [];
			for (const sessionId of state.ids) {
				const summary = state.byId[sessionId];
				if (summary === void 0) continue;
				if (summary.pendingInteraction !== void 0) rows.push({
					key: `interaction:${sessionId}`,
					sessionId,
					title: interactionLabel(summary.pendingInteraction),
					detail: summary.displayTitle,
					tone: "warning"
				});
				if (summary.completed === true) rows.push({
					key: `completed:${sessionId}`,
					sessionId,
					title: "Session completed",
					detail: summary.displayTitle,
					tone: "success"
				});
				const failed = (state.jobsBySession[sessionId] ?? []).filter((job) => job.status === "failed").sort((left, right) => (right.finishedAt ?? right.startedAt) - (left.finishedAt ?? left.startedAt));
				for (const job of failed) rows.push({
					key: `job:${sessionId}:${job.id}`,
					sessionId,
					title: "Background job failed",
					detail: `${summary.displayTitle} · ${job.label}`,
					tone: "danger"
				});
			}
			return {
				rows: rows.slice(0, LIMITS.notifications),
				total: rows.length
			};
		}
		async function terminalList(sessionId, cwd, signal) {
			const query = new URLSearchParams({
				sessionId,
				cwd
			});
			const response = await fetch(`/aezy/api/terminal?${query}`, {
				headers: { "x-aezy-client": "web" },
				signal
			});
			const value = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(value.error ?? `Terminal status failed (${response.status})`);
			return value;
		}
		function useTerminalProjection(sessionId, cwd) {
			const [projection, setProjection] = (0, react.useState)(() => cwd === void 0 ? {
				kind: "unavailable",
				reason: "Session cwd is unavailable."
			} : { kind: "loading" });
			(0, react.useEffect)(() => {
				if (cwd === void 0) {
					setProjection({
						kind: "unavailable",
						reason: "Session cwd is unavailable."
					});
					return;
				}
				const controller = new AbortController();
				let timer;
				setProjection({ kind: "loading" });
				const poll = async () => {
					try {
						const value = await terminalList(sessionId, cwd, controller.signal);
						if (controller.signal.aborted) return;
						setProjection({
							kind: "available",
							backendAvailable: value.backendAvailable,
							total: value.terminals.length,
							running: value.terminals.filter((terminal) => terminal.status.kind === "running").length
						});
					} catch (error) {
						if (controller.signal.aborted) return;
						setProjection({
							kind: "unavailable",
							reason: error instanceof Error ? error.message : String(error)
						});
					}
					if (!controller.signal.aborted) timer = setTimeout(() => {
						poll();
					}, 2e3);
				};
				poll();
				return () => {
					controller.abort();
					if (timer !== void 0) clearTimeout(timer);
				};
			}, [cwd, sessionId]);
			return projection;
		}
		function Section({ title, children, marker }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"data-aezy-activity-section": marker ?? title.toLowerCase().replaceAll(" ", "-"),
				style: cardStyle,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
					style: {
						minHeight: 38,
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "0 12px",
						borderBottom: `1px solid ${palette.border}`,
						background: palette.surface
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
						style: { fontSize: 12.5 },
						children: title
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: { padding: 12 },
					children
				})]
			});
		}
		function Metric({ label, value, detail }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					minWidth: 0,
					padding: "9px 10px",
					border: `1px solid ${palette.border}`,
					borderRadius: 8,
					background: palette.surface
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: palette.muted,
							fontSize: 10.5
						},
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
						style: {
							display: "block",
							marginTop: 3,
							overflow: "hidden",
							textOverflow: "ellipsis",
							fontSize: 15
						},
						children: value
					}),
					detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						title: detail,
						style: {
							marginTop: 3,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							color: palette.muted,
							fontSize: 10
						},
						children: detail
					})
				]
			});
		}
		function CurrentStatus({ state, sessionId }) {
			const summary = state.byId[sessionId];
			const terminal = useTerminalProjection(sessionId, summary?.cwd);
			if (summary === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
				title: "Current Status",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: {
						margin: 0,
						color: palette.muted
					},
					children: "The selected Session is unavailable from the DSH list."
				})
			});
			const status = sessionStatus(summary);
			const jobs = state.jobsBySession[sessionId] ?? [];
			const liveJobs = jobs.filter((job) => job.status === "running" || job.status === "stopping").length;
			const catalog = state.subagentsByParent[sessionId];
			const children = catalog?.entries.filter((entry) => entry.kind === "child") ?? [];
			const projections = projectionsOf(summary);
			const usage = projections.tokenUsage;
			const pressure = projections.contextPressure;
			const stats = projections.sessionStats;
			const projected = pressure?.projectedTokens ?? pressure?.pressureTokens;
			const contextPercent = projected !== void 0 && pressure?.contextWindow !== void 0 && pressure.contextWindow > 0 ? Math.min(999, Math.round(projected / pressure.contextWindow * 100)) : void 0;
			const terminalValue = terminal.kind === "loading" ? "Loading…" : terminal.kind === "unavailable" ? "Unavailable" : terminal.backendAvailable ? `${terminal.running} running · ${terminal.total} total` : "Backend unavailable";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Section, {
				title: "Current Status",
				marker: "status",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "flex-start",
							gap: 9,
							marginBottom: 11
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							style: {
								flex: "0 0 auto",
								width: 8,
								height: 8,
								marginTop: 5,
								borderRadius: "50%",
								background: status.tone
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { minWidth: 0 },
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: {
										display: "block",
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
										fontSize: 13.5
									},
									children: summary.displayTitle
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										color: status.tone,
										fontSize: 11
									},
									children: status.label
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										marginLeft: 8,
										color: palette.muted,
										fontSize: 11
									},
									children: summary.agentPreset ?? "preset unavailable"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									title: summary.cwd,
									style: {
										marginTop: 3,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
										color: palette.muted,
										fontFamily: "var(--ds-font-family-code, monospace)",
										fontSize: 10.5
									},
									children: summary.cwd ?? "cwd unavailable"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
							gap: 7
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Metric, {
								label: "Background Jobs",
								value: `${liveJobs} live · ${jobs.length} total`
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Metric, {
								label: "Direct Subagents",
								value: catalog === void 0 ? "Unavailable" : `${children.filter((child) => child.activity === "running").length} running · ${children.length} known`,
								detail: catalog?.state
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Metric, {
								label: "Integrated Terminal",
								value: terminalValue,
								detail: terminal.kind === "unavailable" ? terminal.reason : "DSH PTY projection"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Metric, {
								label: "Provider Tokens",
								value: usage === void 0 ? "Unavailable" : compactNumber(tokenTotal(usage)),
								detail: usage === void 0 ? "No provider usage projection" : `${compactNumber(usage.uncachedInputTokens)} input · ${compactNumber(usage.outputTokens)} output`
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Metric, {
								label: "Context Pressure",
								value: contextPercent === void 0 ? "Unavailable" : `${contextPercent}%`,
								detail: projected === void 0 ? "No provider sample" : `${compactNumber(projected)}${pressure?.contextWindow === void 0 ? "" : ` / ${compactNumber(pressure.contextWindow)}`}`
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Metric, {
								label: "Trajectory",
								value: stats === void 0 ? "Unavailable" : `${stats.turns} turns · ${stats.steps} steps`,
								detail: stats === void 0 ? "No durable sessionStats projection" : `${duration(stats.llmMs)} model · ${duration(stats.toolMs)} tools`
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: sourceStyle,
						children: "Sources: DSH SessionRuntime, durable session/token projections, and the fenced Aezy Terminal list projection."
					})
				]
			});
		}
		function Notifications({ state, openSession }) {
			const notifications = (0, react.useMemo)(() => notificationsOf(state), [state]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Section, {
				title: "Notifications",
				marker: "notifications",
				children: [notifications.rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						color: palette.muted,
						fontSize: 12
					},
					children: "Nothing currently needs attention."
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "grid",
						gap: 6
					},
					children: [notifications.rows.map((row) => {
						const color = row.tone === "warning" ? palette.warning : row.tone === "danger" ? palette.danger : palette.success;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => openSession(row.sessionId),
							style: {
								display: "grid",
								gridTemplateColumns: "8px minmax(0,1fr)",
								gap: 9,
								alignItems: "start",
								width: "100%",
								padding: "8px 9px",
								border: `1px solid ${palette.border}`,
								borderRadius: 8,
								background: palette.page,
								color: palette.text,
								textAlign: "left",
								cursor: "pointer"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: {
									width: 8,
									height: 8,
									marginTop: 3,
									borderRadius: "50%",
									background: color
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: { minWidth: 0 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: {
										display: "block",
										fontSize: 11.5
									},
									children: row.title
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										display: "block",
										marginTop: 2,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
										color: palette.muted,
										fontSize: 10.5
									},
									children: row.detail
								})]
							})]
						}, row.key);
					}), notifications.total > notifications.rows.length && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							color: palette.muted,
							fontSize: 10.5
						},
						children: [
							"+",
							notifications.total - notifications.rows.length,
							" more attention items (bounded view)"
						]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: sourceStyle,
					children: "Live projection of DSH pending interactions, completion reminders, and failed Jobs. Aezy stores no notification inbox or read state."
				})]
			});
		}
		function BackgroundWork({ state, sessionId }) {
			const jobs = state.jobsBySession[sessionId] ?? [];
			const catalog = state.subagentsByParent[sessionId];
			const entries = catalog?.entries ?? [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Section, {
				title: "Background Work",
				marker: "background",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: palette.muted,
							fontSize: 10.5,
							fontWeight: 650,
							textTransform: "uppercase",
							letterSpacing: ".04em"
						},
						children: "Jobs"
					}),
					jobs.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: "7px 0 12px",
							color: palette.muted,
							fontSize: 11.5
						},
						children: "No DSH Jobs are visible for this Session."
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: 5,
							margin: "7px 0 13px"
						},
						children: [jobs.slice(0, LIMITS.jobs).map((job) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "8px minmax(0,1fr) auto",
								alignItems: "center",
								gap: 8,
								minWidth: 0,
								fontSize: 11
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									style: {
										width: 7,
										height: 7,
										borderRadius: "50%",
										background: job.status === "running" ? palette.accent : job.status === "failed" ? palette.danger : job.status === "stopping" || job.status === "killed" ? palette.warning : palette.success
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									title: job.label,
									style: {
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: job.label
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { color: palette.muted },
									children: job.status
								})
							]
						}, job.id)), jobs.length > LIMITS.jobs && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								color: palette.muted,
								fontSize: 10.5
							},
							children: [
								"+",
								jobs.length - LIMITS.jobs,
								" more Jobs"
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							color: palette.muted,
							fontSize: 10.5,
							fontWeight: 650,
							textTransform: "uppercase",
							letterSpacing: ".04em"
						},
						children: "Direct Subagents"
					}),
					catalog === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: "7px 0 0",
							color: palette.muted,
							fontSize: 11.5
						},
						children: "Subagent catalog unavailable."
					}) : entries.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: "7px 0 0",
							color: palette.muted,
							fontSize: 11.5
						},
						children: catalog.state === "loading" ? "Loading the DSH Subagent catalog…" : "No direct Subagents."
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: 5,
							marginTop: 7
						},
						children: [entries.slice(0, LIMITS.subagents).map((entry) => entry.kind === "child" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "8px minmax(0,1fr) auto",
								alignItems: "center",
								gap: 8,
								minWidth: 0,
								fontSize: 11
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									style: {
										width: 7,
										height: 7,
										borderRadius: "50%",
										background: entry.activity === "running" ? palette.accent : palette.muted
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									title: entry.label ?? entry.id,
									style: {
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: entry.label ?? entry.id
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: { color: palette.muted },
									children: [
										entry.mode,
										" · ",
										entry.activity
									]
								})
							]
						}, entry.id) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								color: palette.warning,
								fontSize: 11
							},
							children: [
								entry.id,
								" · ",
								entry.reason
							]
						}, entry.id)), entries.length > LIMITS.subagents && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								color: palette.muted,
								fontSize: 10.5
							},
							children: [
								"+",
								entries.length - LIMITS.subagents,
								" more Subagent rows"
							]
						})]
					}),
					catalog?.state === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: "alert",
						style: {
							marginTop: 7,
							color: palette.danger,
							fontSize: 10.5
						},
						children: catalog.error?.message ?? "Subagent catalog failed to load."
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: sourceStyle,
						children: "Sources: DSH `jobsBySession` mirror and authoritative Subagent catalog. Rows are display-only."
					})
				]
			});
		}
		function RecentActivity({ state, now, openSession }) {
			const ids = state.ids.slice(0, LIMITS.sessions);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Section, {
				title: "Recent Activity",
				marker: "recent",
				children: [state.phase === "pending" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						color: palette.muted,
						fontSize: 12
					},
					children: "DSH Session list is not ready yet."
				}) : ids.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						color: palette.muted,
						fontSize: 12
					},
					children: "No Sessions."
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "grid",
						gap: 5
					},
					children: [ids.map((id) => {
						const summary = state.byId[id];
						if (summary === void 0) return null;
						const status = sessionStatus(summary);
						const jobs = state.jobsBySession[id] ?? [];
						const childCount = Object.values(state.byId).filter((child) => child.origin === "subagent" && child.parentId === id).length;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							"data-aezy-activity-session": id,
							onClick: () => openSession(id),
							style: {
								display: "grid",
								gridTemplateColumns: "8px minmax(0,1fr) auto",
								alignItems: "center",
								gap: 9,
								width: "100%",
								padding: "8px 9px",
								border: `1px solid ${id === state.current ? palette.accent : palette.border}`,
								borderRadius: 8,
								background: id === state.current ? palette.selected : palette.page,
								color: palette.text,
								textAlign: "left",
								cursor: "pointer"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									style: {
										width: 8,
										height: 8,
										borderRadius: "50%",
										background: status.tone
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: { minWidth: 0 },
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
										style: {
											display: "block",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
											fontSize: 11.5
										},
										children: summary.displayTitle
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: {
											display: "block",
											marginTop: 2,
											color: palette.muted,
											fontSize: 10
										},
										children: [
											status.label,
											" · ",
											jobs.length,
											" Jobs · ",
											childCount,
											" Subagents"
										]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										color: palette.muted,
										fontSize: 10
									},
									children: relativeTime(summary.updatedAt, now)
								})
							]
						}, id);
					}), state.ids.length > LIMITS.sessions && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							color: palette.muted,
							fontSize: 10.5
						},
						children: [
							"+",
							state.ids.length - LIMITS.sessions,
							" older Sessions (bounded view)"
						]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: sourceStyle,
					children: "Source: DSH SessionRuntime list order and live status projections."
				})]
			});
		}
		function ActivityDashboard({ sessions, sessionId, openSession }) {
			const state = (0, react.useSyncExternalStore)(sessions.list.subscribe, sessions.list.getSnapshot);
			const [now, setNow] = (0, react.useState)(() => Date.now());
			(0, react.useEffect)(() => {
				const timer = setInterval(() => setNow(Date.now()), 3e4);
				return () => clearInterval(timer);
			}, []);
			(0, react.useEffect)(() => {
				sessions.refreshSubagents(sessionId).catch(() => {});
			}, [sessionId, sessions]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-aezy-activity-dashboard": true,
				"data-session-id": sessionId,
				style: {
					height: "100%",
					minHeight: 0,
					overflow: "auto",
					padding: 10,
					boxSizing: "border-box",
					background: palette.surface,
					color: palette.text
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "grid",
						gap: 9
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notifications, {
							state,
							openSession
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CurrentStatus, {
							state,
							sessionId
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BackgroundWork, {
							state,
							sessionId
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecentActivity, {
							state,
							now,
							openSession
						})
					]
				})
			});
		}
		function ActivityPanel({ panel, surface, sessions, closePanel, openSession, syncLayout }) {
			const target = (0, react.useSyncExternalStore)(panel.subscribe, panel.getSnapshot);
			const [viewport, setViewport] = (0, react.useState)(() => window.innerWidth);
			const narrow = viewport < 760;
			const visible = target !== null && surface === (narrow ? "overlay" : "details");
			(0, react.useEffect)(() => {
				const onResize = () => setViewport(window.innerWidth);
				window.addEventListener("resize", onResize);
				return () => window.removeEventListener("resize", onResize);
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
				const onKey = (event) => {
					if (event.key === "Escape") closePanel();
				};
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [closePanel, visible]);
			if (!visible || target === null) return null;
			const content = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				"aria-label": "Activity and status panel",
				"data-aezy-activity-panel": true,
				"data-session-id": target.sessionId,
				style: {
					width: "100%",
					height: "100%",
					minHeight: 0,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					background: palette.page,
					color: palette.text
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					style: {
						flex: "0 0 auto",
						minHeight: 49,
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 10,
						padding: "8px 11px 8px 13px",
						borderBottom: `1px solid ${palette.border}`,
						background: palette.page
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
						style: {
							display: "block",
							fontSize: 14
						},
						children: "Activity"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							display: "block",
							marginTop: 2,
							color: palette.muted,
							fontSize: 10.5
						},
						children: "Status · Usage · Notifications"
					})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Close Activity panel",
						onClick: closePanel,
						style: {
							border: 0,
							padding: 4,
							background: "transparent",
							color: palette.muted,
							cursor: "pointer",
							fontSize: 20,
							lineHeight: 1
						},
						children: "×"
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						flex: "1 1 auto",
						minHeight: 0
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActivityDashboard, {
						sessions,
						sessionId: target.sessionId,
						openSession
					})
				})]
			});
			return surface === "overlay" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-aezy-activity-panel-surface": "overlay",
				style: {
					position: "absolute",
					inset: 0,
					zIndex: 3,
					background: "var(--dsw-alias-bg-overlay, rgba(0,0,0,.36))"
				},
				children: content
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-aezy-activity-panel-surface": "details",
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
		function apply(ctx) {
			const panel = new ActivityPanelController();
			let disposePanelSlots = null;
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
			const openSession = (sessionId) => {
				closePanel();
				ctx.sessions.open(sessionId);
			};
			const mountPanel = () => {
				if (disposePanelSlots !== null) return;
				const injected = () => ({
					panel,
					sessions: ctx.sessions,
					closePanel,
					openSession,
					syncLayout
				});
				const disposeDetails = ctx.slots.register({
					name: "details",
					priority: -30,
					inject: () => ({
						...injected(),
						surface: "details"
					})
				}, ActivityPanel);
				const disposeOverlay = ctx.slots.register({
					name: "shell.overlay",
					id: "aezy-activity",
					order: 120,
					inject: () => ({
						...injected(),
						surface: "overlay"
					})
				}, ActivityPanel);
				disposePanelSlots = () => {
					disposeOverlay();
					disposeDetails();
				};
			};
			const openActivity = (sessionId) => {
				if (ctx.sessions.list.getSnapshot().byId[sessionId] === void 0) throw new Error(`aezy-activity: session "${sessionId}" is unavailable`);
				panel.open({ sessionId });
				mountPanel();
				syncLayout(window.innerWidth < 760);
			};
			ctx.effect(() => ctx.sessions.list.subscribe(() => {
				const target = panel.getSnapshot();
				if (target === null) return;
				const state = ctx.sessions.list.getSnapshot();
				if ((state.current ?? target.sessionId) !== target.sessionId || state.byId[target.sessionId] === void 0) closePanel();
			}), "aezy-activity: close panel on Session identity change");
			ctx.effect(() => () => {
				panel.close();
				unmountPanel();
			}, "aezy-activity: dispose dynamic side panel");
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "aezy-activity",
				order: 30,
				inject: () => ({ openActivity })
			}, ActivityHeaderAction));
		}
		var client_default = {
			inject,
			apply
		};
		//#endregion
		exports.apply = apply;
		exports.default = client_default;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map