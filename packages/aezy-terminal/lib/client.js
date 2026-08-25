window.__ModuleLoader__.load({
	id: "@aezy/terminal",
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
		const palette = {
			page: "var(--dsw-alias-bg-base, #fff)",
			surface: "var(--dsw-alias-bg-module-platform, #f7f7f8)",
			terminal: "var(--dsw-alias-markdown-code-block, #f5f5f6)",
			terminalBanner: "var(--dsw-alias-markdown-code-block-banner, #ececef)",
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
		const buttonStyle = {
			minHeight: 30,
			border: `1px solid ${palette.border}`,
			borderRadius: 7,
			background: palette.surface,
			color: palette.text,
			cursor: "pointer"
		};
		async function requestJson(path, init = {}) {
			const headers = new Headers(init.headers);
			headers.set("x-aezy-client", "web");
			if (init.body !== void 0) headers.set("content-type", "application/json");
			const response = await fetch(path, {
				...init,
				headers
			});
			const value = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(value.error ?? `Integrated Terminal request failed (${response.status})`);
			return value;
		}
		function identityQuery(sessionId, cwd) {
			return `sessionId=${encodeURIComponent(sessionId)}&cwd=${encodeURIComponent(cwd)}`;
		}
		function upsert(tabs, next) {
			if (tabs.findIndex((tab) => tab.id === next.id) < 0) return [...tabs, next];
			return tabs.map((tab) => tab.id === next.id ? next : tab);
		}
		function statusLabel(status) {
			if (status.kind === "running") return "Running";
			if (status.exitCode !== null) return `Exited ${status.exitCode}`;
			return status.signal === null ? "Exited" : `Exited · ${status.signal}`;
		}
		function TerminalGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				"aria-hidden": "true",
				width: "15",
				height: "15",
				viewBox: "0 0 16 16",
				fill: "none",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "1.5",
					y: "2",
					width: "13",
					height: "11.5",
					rx: "2",
					stroke: "currentColor"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "m4 5 2.2 2L4 9M8 10h3.5",
					stroke: "currentColor",
					strokeWidth: "1.25",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})]
			});
		}
		function TerminalView({ sessionId, cwd }) {
			const [tabs, setTabs] = (0, react.useState)([]);
			const [activeId, setActiveId] = (0, react.useState)(null);
			const [outputs, setOutputs] = (0, react.useState)({});
			const [truncated, setTruncated] = (0, react.useState)({});
			const [inputs, setInputs] = (0, react.useState)({});
			const [histories, setHistories] = (0, react.useState)({});
			const [historyCursor, setHistoryCursor] = (0, react.useState)({});
			const [busyIds, setBusyIds] = (0, react.useState)([]);
			const [loading, setLoading] = (0, react.useState)(true);
			const [opening, setOpening] = (0, react.useState)(false);
			const [backendAvailable, setBackendAvailable] = (0, react.useState)(true);
			const [error, setError] = (0, react.useState)(null);
			const outputRef = (0, react.useRef)(null);
			const inputRef = (0, react.useRef)(null);
			const followOutput = (0, react.useRef)(true);
			const active = tabs.find((tab) => tab.id === activeId) ?? null;
			const input = activeId === null ? "" : inputs[activeId] ?? "";
			const busy = activeId !== null && busyIds.includes(activeId);
			const readTerminal = (0, react.useCallback)(async (terminalId, signal) => {
				const result = await requestJson(`/aezy/api/terminal/read?${identityQuery(sessionId, cwd)}&terminalId=${encodeURIComponent(terminalId)}`, { signal });
				setTabs((current) => upsert(current, result.terminal));
				setOutputs((current) => ({
					...current,
					[terminalId]: result.output
				}));
				setTruncated((current) => ({
					...current,
					[terminalId]: result.truncated
				}));
			}, [cwd, sessionId]);
			const openTerminal = (0, react.useCallback)(async (signal) => {
				setOpening(true);
				setError(null);
				try {
					const result = await requestJson("/aezy/api/terminal/open", {
						method: "POST",
						signal,
						body: JSON.stringify({
							sessionId,
							cwd
						})
					});
					setTabs((current) => upsert(current, result.terminal));
					setOutputs((current) => ({
						...current,
						[result.terminal.id]: result.output
					}));
					setActiveId(result.terminal.id);
					followOutput.current = true;
				} catch (caught) {
					if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : String(caught));
				} finally {
					if (signal?.aborted !== true) setOpening(false);
				}
			}, [cwd, sessionId]);
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				setTabs([]);
				setActiveId(null);
				setOutputs({});
				setTruncated({});
				setInputs({});
				setHistories({});
				setHistoryCursor({});
				setBusyIds([]);
				setLoading(true);
				setError(null);
				(async () => {
					try {
						const result = await requestJson(`/aezy/api/terminal?${identityQuery(sessionId, cwd)}`, { signal: controller.signal });
						if (controller.signal.aborted) return;
						setBackendAvailable(result.backendAvailable);
						setTabs(result.terminals);
						if (result.terminals[0] !== void 0) {
							setActiveId(result.terminals[0].id);
							await readTerminal(result.terminals[0].id, controller.signal);
						} else if (result.backendAvailable) await openTerminal(controller.signal);
					} catch (caught) {
						if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : String(caught));
					} finally {
						if (!controller.signal.aborted) setLoading(false);
					}
				})();
				return () => {
					controller.abort();
				};
			}, [
				cwd,
				openTerminal,
				readTerminal,
				sessionId
			]);
			(0, react.useEffect)(() => {
				if (activeId === null) return;
				const controller = new AbortController();
				let timer;
				const poll = async () => {
					try {
						await readTerminal(activeId, controller.signal);
					} catch (caught) {
						if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : String(caught));
					}
					if (!controller.signal.aborted) timer = setTimeout(() => {
						poll();
					}, 400);
				};
				poll();
				return () => {
					controller.abort();
					if (timer !== void 0) clearTimeout(timer);
				};
			}, [activeId, readTerminal]);
			(0, react.useEffect)(() => {
				if (!followOutput.current) return;
				const frame = requestAnimationFrame(() => {
					const node = outputRef.current;
					if (node !== null) node.scrollTop = node.scrollHeight;
				});
				return () => {
					cancelAnimationFrame(frame);
				};
			}, [activeId, outputs]);
			const submit = async () => {
				if (active === null || busy || active.status.kind !== "running") return;
				const text = input;
				setInputs((current) => ({
					...current,
					[active.id]: ""
				}));
				if (text.length > 0) {
					setHistories((current) => ({
						...current,
						[active.id]: [...current[active.id] ?? [], text]
					}));
					setHistoryCursor((current) => ({
						...current,
						[active.id]: (histories[active.id]?.length ?? 0) + 1
					}));
				}
				setBusyIds((current) => [.../* @__PURE__ */ new Set([...current, active.id])]);
				setError(null);
				followOutput.current = true;
				try {
					await requestJson("/aezy/api/terminal/send", {
						method: "POST",
						body: JSON.stringify({
							sessionId,
							cwd,
							terminalId: active.id,
							text
						})
					});
					await readTerminal(active.id);
				} catch (caught) {
					setError(caught instanceof Error ? caught.message : String(caught));
				} finally {
					setBusyIds((current) => current.filter((id) => id !== active.id));
					inputRef.current?.focus();
				}
			};
			const interrupt = async () => {
				if (active === null || active.status.kind !== "running") return;
				setError(null);
				try {
					await requestJson("/aezy/api/terminal/signal", {
						method: "POST",
						body: JSON.stringify({
							sessionId,
							cwd,
							terminalId: active.id,
							signal: "SIGINT"
						})
					});
					await readTerminal(active.id);
				} catch (caught) {
					setError(caught instanceof Error ? caught.message : String(caught));
				}
			};
			const closeTerminal = async (terminal) => {
				setError(null);
				try {
					await requestJson("/aezy/api/terminal/close", {
						method: "POST",
						body: JSON.stringify({
							sessionId,
							cwd,
							terminalId: terminal.id
						})
					});
					const remaining = tabs.filter((tab) => tab.id !== terminal.id);
					setTabs(remaining);
					setOutputs((current) => {
						const next = { ...current };
						delete next[terminal.id];
						return next;
					});
					if (activeId === terminal.id) {
						const oldIndex = tabs.findIndex((tab) => tab.id === terminal.id);
						setActiveId(remaining[Math.min(oldIndex, remaining.length - 1)]?.id ?? null);
					}
				} catch (caught) {
					setError(caught instanceof Error ? caught.message : String(caught));
				}
			};
			const browseHistory = (direction) => {
				if (activeId === null) return;
				const history = histories[activeId] ?? [];
				if (history.length === 0) return;
				const current = historyCursor[activeId] ?? history.length;
				const next = Math.max(0, Math.min(history.length, current + direction));
				setHistoryCursor((value) => ({
					...value,
					[activeId]: next
				}));
				setInputs((value) => ({
					...value,
					[activeId]: next === history.length ? "" : history[next] ?? ""
				}));
			};
			const onInputKeyDown = (event) => {
				if (event.key === "Enter" && !event.shiftKey) {
					event.preventDefault();
					submit();
					return;
				}
				if (event.key === "ArrowUp" && !input.includes("\n")) {
					event.preventDefault();
					browseHistory(-1);
				} else if (event.key === "ArrowDown" && !input.includes("\n")) {
					event.preventDefault();
					browseHistory(1);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"data-aezy-terminal-view": true,
				"data-session-id": sessionId,
				style: {
					height: "100%",
					minHeight: 0,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					background: palette.page,
					color: palette.text
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						"data-aezy-terminal-chrome": true,
						style: {
							minHeight: 43,
							display: "flex",
							alignItems: "center",
							gap: 6,
							padding: "6px 10px",
							overflowX: "auto",
							borderBottom: `1px solid ${palette.border}`,
							background: palette.surface
						},
						children: [
							tabs.map((tab) => {
								const selected = tab.id === activeId;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									"data-aezy-terminal-tab": tab.id,
									"data-active": selected || void 0,
									style: {
										height: 30,
										display: "inline-flex",
										alignItems: "center",
										flex: "0 0 auto",
										border: `1px solid ${selected ? palette.accent : palette.border}`,
										borderRadius: 7,
										background: selected ? palette.selected : palette.page,
										color: selected ? palette.text : palette.muted
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										role: "tab",
										"aria-selected": selected,
										onClick: () => {
											followOutput.current = true;
											setActiveId(tab.id);
										},
										style: {
											height: "100%",
											display: "inline-flex",
											alignItems: "center",
											gap: 6,
											padding: "0 7px",
											border: 0,
											background: "transparent",
											color: "inherit",
											cursor: "pointer",
											fontSize: 12
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TerminalGlyph, {}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tab.title }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												"aria-label": statusLabel(tab.status),
												title: statusLabel(tab.status),
												style: {
													width: 6,
													height: 6,
													borderRadius: "50%",
													background: tab.status.kind === "running" ? palette.success : palette.muted
												}
											})
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": `Close ${tab.title}`,
										title: `Close ${tab.title}`,
										onClick: () => {
											closeTerminal(tab);
										},
										style: {
											width: 24,
											height: 24,
											marginRight: 2,
											padding: 0,
											border: 0,
											borderRadius: 5,
											background: "transparent",
											color: palette.muted,
											cursor: "pointer",
											fontSize: 16,
											lineHeight: 1
										},
										children: "×"
									})]
								}, tab.id);
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								"data-aezy-terminal-new": true,
								onClick: () => {
									openTerminal();
								},
								disabled: opening || !backendAvailable || tabs.length >= 8,
								title: "New terminal",
								"aria-label": "New terminal",
								style: {
									...buttonStyle,
									minWidth: 30,
									padding: "0 8px",
									opacity: opening || tabs.length >= 8 ? .5 : 1,
									fontSize: 17
								},
								children: "+"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								title: cwd,
								style: {
									minWidth: 120,
									marginLeft: "auto",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									color: palette.muted,
									fontFamily: "var(--ds-font-family-code, monospace)",
									fontSize: 11
								},
								children: cwd
							})
						]
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: "alert",
						"data-aezy-terminal-error": true,
						style: {
							padding: "7px 11px",
							borderBottom: `1px solid ${palette.border}`,
							background: "var(--dsw-alias-state-error-secondary, rgba(211,51,51,.1))",
							color: palette.danger,
							fontSize: 12
						},
						children: error
					}),
					truncated[activeId ?? ""] && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"data-aezy-terminal-truncated": true,
						style: {
							padding: "6px 11px",
							borderBottom: `1px solid ${palette.border}`,
							color: palette.warning,
							fontSize: 11
						},
						children: "Older terminal output was truncated by the bounded DSH scrollback."
					}),
					active === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							flex: 1,
							display: "grid",
							placeItems: "center",
							padding: 24,
							color: palette.muted,
							textAlign: "center"
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TerminalGlyph, {}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: { marginTop: 10 },
								children: loading ? "Connecting to this Session runtime…" : backendAvailable ? "No terminal is open." : "The platform shell backend is unavailable."
							}),
							!loading && backendAvailable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									openTerminal();
								},
								disabled: opening,
								style: {
									...buttonStyle,
									marginTop: 12,
									padding: "0 12px"
								},
								children: "New terminal"
							})
						] })
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							ref: outputRef,
							"data-aezy-terminal-output": active.id,
							onScroll: (event) => {
								const node = event.currentTarget;
								followOutput.current = node.scrollHeight - node.scrollTop - node.clientHeight < 40;
							},
							onClick: () => {
								inputRef.current?.focus();
							},
							style: {
								flex: "1 1 auto",
								minHeight: 0,
								overflow: "auto",
								padding: "14px 16px",
								background: palette.terminal,
								color: palette.text,
								cursor: "text"
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
								style: {
									margin: 0,
									minHeight: "100%",
									whiteSpace: "pre-wrap",
									overflowWrap: "anywhere",
									fontFamily: "var(--ds-font-family-code, monospace)",
									fontSize: 12.5,
									lineHeight: 1.65
								},
								children: outputs[active.id] ?? ""
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							"data-aezy-terminal-input": true,
							style: {
								display: "grid",
								gridTemplateColumns: "auto minmax(0, 1fr) auto auto",
								alignItems: "end",
								gap: 8,
								padding: "9px 10px",
								borderTop: `1px solid ${palette.border}`,
								background: palette.terminalBanner
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									style: {
										padding: "7px 0",
										color: palette.accent,
										fontFamily: "var(--ds-font-family-code, monospace)",
										fontWeight: 700
									},
									children: ">"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									ref: inputRef,
									rows: 1,
									value: input,
									disabled: busy || active.status.kind !== "running",
									"aria-label": "Terminal input",
									placeholder: active.status.kind === "running" ? busy ? "Waiting for the foreground process…" : "Type a command or interactive reply" : statusLabel(active.status),
									onChange: (event) => {
										setInputs((current) => ({
											...current,
											[active.id]: event.target.value
										}));
									},
									onKeyDown: onInputKeyDown,
									style: {
										width: "100%",
										minHeight: 34,
										maxHeight: 120,
										boxSizing: "border-box",
										resize: "vertical",
										padding: "7px 9px",
										border: `1px solid ${palette.border}`,
										borderRadius: 7,
										outline: "none",
										background: palette.page,
										color: palette.text,
										fontFamily: "var(--ds-font-family-code, monospace)",
										fontSize: 12,
										lineHeight: 1.45
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										interrupt();
									},
									disabled: active.status.kind !== "running",
									title: "Interrupt foreground process (Ctrl-C)",
									style: {
										...buttonStyle,
										padding: "0 9px",
										color: palette.muted
									},
									children: "Ctrl-C"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										submit();
									},
									disabled: busy || active.status.kind !== "running",
									style: {
										...buttonStyle,
										padding: "0 12px",
										borderColor: palette.accent,
										color: palette.accent,
										opacity: busy ? .55 : 1
									},
									children: "Send"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							style: {
								minHeight: 25,
								display: "flex",
								alignItems: "center",
								gap: 8,
								padding: "0 11px",
								borderTop: `1px solid ${palette.border}`,
								background: palette.surface,
								color: palette.muted,
								fontSize: 10.5
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: statusLabel(active.status) }),
								active.pid !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["PID ", active.pid] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									"DSH ",
									active.type,
									" PTY"
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { marginLeft: "auto" },
									children: "Line terminal · Enter sends · Shift+Enter adds a line"
								})
							]
						})
					] })
				]
			});
		}
		const inject = ["slots", "sessions"];
		function apply(ctx) {
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "terminal",
				order: 40,
				label: () => "Terminal",
				inject: (sessionId) => {
					const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd;
					if (cwd === void 0) throw new Error(`aezy-terminal: session "${sessionId}" has no working directory`);
					return {
						sessionId,
						cwd
					};
				}
			}, TerminalView));
		}
		var client_default = {
			inject,
			apply
		};
		//#endregion
		exports.TerminalView = TerminalView;
		exports.apply = apply;
		exports.default = client_default;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map