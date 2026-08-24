window.__ModuleLoader__.load({
	id: "@aezy/project",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/summary.js
		/** Final, browser-safe projection of one authoritative ledger turn. */
		function summarizeTurn(ledger, turnNumber) {
			if (!Number.isSafeInteger(turnNumber) || turnNumber < 1) return null;
			const turn = ledger?.turns?.find((candidate) => candidate.turn === turnNumber);
			if (turn === void 0 || !Array.isArray(turn.files) || turn.files.length === 0) return null;
			return {
				turn: turn.turn,
				concurrent: turn.concurrent === true,
				additions: turn.additions ?? 0,
				deletions: turn.deletions ?? 0,
				statsComplete: turn.statsComplete === true,
				files: turn.files.map((file) => ({
					path: file.path,
					openPath: file.openPath,
					change: file.change,
					afterFingerprint: file.afterFingerprint,
					revertable: file.revertable === true,
					additions: file.additions ?? null,
					deletions: file.deletions ?? null,
					binary: file.binary === true,
					truncated: file.truncated === true,
					status: file.status ?? (file.binary === true ? "binary" : "modified"),
					oldPath: file.oldPath ?? null
				}))
			};
		}
		//#endregion
		//#region src/client/index.tsx
		const palette = {
			panel: "var(--dsw-alias-bg-base, #ffffff)",
			elevated: "var(--dsw-alias-bg-module-platform, #f9fafb)",
			interactive: "var(--dsw-alias-interactive-bg-hover, rgba(38, 49, 72, 0.06))",
			button: "var(--dsw-alias-button-elevated-fill, #ffffff)",
			code: "var(--dsw-alias-markdown-code-block, #f9fafb)",
			border: "var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1))",
			text: "var(--dsw-alias-label-primary, #0f1115)",
			muted: "var(--dsw-alias-label-tertiary, #81858c)",
			accent: "var(--dsw-alias-state-business-primary, #4d6bfe)",
			success: "var(--dsw-alias-state-success-primary, #1a7f37)",
			warning: "var(--dsw-alias-state-warn-label, #b45309)",
			error: "var(--dsw-alias-state-error-primary, #dc1313)"
		};
		var ReviewController = class {
			#target = null;
			#listeners = /* @__PURE__ */ new Set();
			getSnapshot = () => this.#target;
			subscribe = (listener) => {
				this.#listeners.add(listener);
				return () => {
					this.#listeners.delete(listener);
				};
			};
			open(target) {
				this.#target = target;
				for (const listener of this.#listeners) listener();
			}
			select(path) {
				if (this.#target === null || !this.#target.files.some((file) => file.path === path)) return;
				this.open({
					...this.#target,
					path
				});
			}
			close() {
				if (this.#target === null) return;
				this.#target = null;
				for (const listener of this.#listeners) listener();
			}
		};
		const ledgerRequests = /* @__PURE__ */ new Map();
		function loadLedger(cwd, sessionId) {
			const key = `${sessionId}\0${cwd}`;
			const cached = ledgerRequests.get(key);
			if (cached !== void 0 && Date.now() - cached.at < 1e3) return cached.promise;
			const promise = request("/aezy/api/project/ledger", {
				cwd,
				sessionId
			}).catch((error) => {
				ledgerRequests.delete(key);
				throw error;
			});
			ledgerRequests.set(key, {
				at: Date.now(),
				promise
			});
			return promise;
		}
		function DiffStats({ additions, deletions }) {
			if (additions === null || deletions === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				title: "Line statistics are unavailable for a binary, oversized, or legacy ledger entry",
				style: { color: palette.muted },
				children: "—"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				style: {
					display: "inline-flex",
					gap: 7,
					fontVariantNumeric: "tabular-nums",
					fontFamily: "var(--ds-font-family-code, monospace)"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: { color: palette.success },
					children: ["+", additions]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: { color: palette.error },
					children: ["-", deletions]
				})]
			});
		}
		function TurnChangedFiles({ matched, cwd, sessionId, openReview }) {
			const [summary, setSummary] = (0, react.useState)(void 0);
			const [receiptId, setReceiptId] = (0, react.useState)(null);
			const [mutating, setMutating] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				let live = true;
				setSummary(void 0);
				setError(null);
				loadLedger(cwd, sessionId).then((ledger) => {
					if (!live) return;
					setSummary(summarizeTurn(ledger, matched.turn));
					const latest = ledger.receipts.filter((receipt) => receipt.kind === "turn" && receipt.turn === matched.turn).sort((left, right) => right.createdAt - left.createdAt)[0];
					setReceiptId(latest?.status === "committed" ? latest.id : null);
				}).catch((reason) => {
					if (live) setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					live = false;
				};
			}, [
				cwd,
				matched.turn,
				sessionId
			]);
			if (error !== null && summary === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				title: error,
				style: {
					marginTop: 14,
					color: palette.error,
					fontSize: 12
				},
				children: "Changed files unavailable"
			});
			if (summary === void 0 || summary === null) return null;
			const canUndo = !summary.concurrent && summary.files.every((file) => file.revertable);
			const toggleUndo = async () => {
				if (!canUndo || mutating) return;
				setMutating(true);
				setError(null);
				try {
					if (receiptId === null) {
						const result = await mutate("/aezy/api/project/revert-turn", {
							cwd,
							sessionId,
							turn: summary.turn
						});
						setReceiptId(result.receiptId);
					} else {
						await mutate("/aezy/api/project/undo", {
							cwd,
							receiptId
						});
						setReceiptId(null);
					}
					ledgerRequests.delete(`${sessionId}\0${cwd}`);
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setMutating(false);
				}
			};
			const openTurnReview = (path = summary.files[0]?.path) => {
				if (path === void 0) return;
				openReview({
					source: "turn",
					cwd,
					sessionId,
					turn: summary.turn,
					path,
					files: summary.files.map((file) => ({
						path: file.path,
						oldPath: file.oldPath,
						additions: file.additions,
						deletions: file.deletions,
						binary: file.binary,
						truncated: file.truncated,
						status: file.status
					}))
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "md-code-block",
				"data-aezy-turn-files": summary.turn,
				style: {
					position: "relative",
					marginTop: 16,
					maxWidth: 720,
					overflow: "hidden",
					borderRadius: 12,
					background: "var(--dsw-alias-markdown-code-block)",
					color: "var(--dsw-alias-label-primary)"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						"data-aezy-turn-banner": true,
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 12,
							padding: "9px 14px",
							borderRadius: "12px 12px 0 0",
							background: "var(--dsw-alias-markdown-code-block-banner)",
							font: "var(--dsw-font-xs-13)"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", {
							style: {
								minWidth: 0,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
								fontFamily: "var(--ds-font-family-code)",
								fontSize: 12,
								lineHeight: "18px",
								fontWeight: 600
							},
							children: [
								"Edited ",
								summary.files.length,
								" ",
								summary.files.length === 1 ? "file" : "files"
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								display: "inline-flex",
								alignItems: "center",
								flexShrink: 0,
								gap: 12,
								color: "var(--dsw-alias-label-secondary)"
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: !canUndo || mutating,
								onClick: () => {
									toggleUndo();
								},
								title: summary.concurrent ? "Batch Undo is disabled because another Session overlapped this Turn" : canUndo ? receiptId === null ? "Restore every file to its state before this Turn" : "Reapply the files changed by this Turn" : "At least one file cannot be restored safely",
								style: {
									border: 0,
									padding: 0,
									margin: 0,
									background: "transparent",
									color: canUndo ? "inherit" : "var(--dsw-alias-label-tertiary)",
									cursor: canUndo && !mutating ? "pointer" : "not-allowed",
									font: "inherit"
								},
								children: mutating ? "Working…" : receiptId === null ? "Undo" : "Redo"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => openTurnReview(),
								style: {
									border: 0,
									padding: 0,
									margin: 0,
									background: "transparent",
									color: "inherit",
									cursor: "pointer",
									font: "inherit"
								},
								children: "Review changes"
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							padding: "12px 14px 8px",
							background: "var(--dsw-alias-markdown-code-block)",
							font: "var(--dsw-font-markdown-code-block)"
						},
						children: summary.files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								minHeight: 22,
								display: "grid",
								gridTemplateColumns: "minmax(0, 1fr) auto",
								alignItems: "baseline",
								gap: 16
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								title: file.path,
								onClick: () => openTurnReview(file.path),
								style: {
									minWidth: 0,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									padding: 0,
									border: 0,
									background: "transparent",
									color: file.afterFingerprint === null ? "var(--dsw-alias-label-tertiary)" : "var(--dsw-alias-label-primary)",
									cursor: "pointer",
									textAlign: "left",
									font: "inherit",
									textDecoration: file.afterFingerprint === null ? "line-through" : void 0
								},
								children: [
									file.oldPath && file.oldPath !== file.path ? `${file.oldPath} → ` : "",
									file.path,
									file.binary && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											marginLeft: 7,
											color: "var(--dsw-alias-label-tertiary)"
										},
										children: "binary"
									}),
									file.truncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											marginLeft: 7,
											color: palette.warning,
											fontFamily: "inherit"
										},
										children: "truncated"
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffStats, {
								additions: file.additions,
								deletions: file.deletions
							})]
						}, file.path))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
						style: {
							display: "flex",
							flexWrap: "wrap",
							alignItems: "center",
							gap: 7,
							padding: "0 14px 12px",
							background: "var(--dsw-alias-markdown-code-block)",
							color: "var(--dsw-alias-label-tertiary)",
							font: "var(--dsw-font-markdown-code-block)"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": true,
								children: "└"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffStats, {
								additions: summary.additions,
								deletions: summary.deletions
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								"· ",
								summary.files.length,
								" ",
								summary.files.length === 1 ? "file" : "files"
							] }),
							!summary.statsComplete && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								title: "One or more files have unavailable line statistics",
								children: "· partial"
							}),
							summary.concurrent && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								title: "Another Session was active in this repository during the Turn",
								style: { color: palette.warning },
								children: "· concurrent"
							})
						]
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						title: error,
						style: {
							padding: "0 14px 12px",
							background: "var(--dsw-alias-markdown-code-block)",
							color: palette.error,
							font: "var(--dsw-font-markdown-code-block)"
						},
						children: error
					})
				]
			});
		}
		async function request(path, params, signal) {
			const query = new URLSearchParams(params);
			const response = await fetch(`${path}?${query}`, {
				headers: { "X-Aezy-Client": "web" },
				cache: "no-store",
				signal
			});
			const body = await response.json();
			if (!response.ok) throw new Error(body.error ?? `Aezy Project request failed (${response.status})`);
			return body;
		}
		async function mutate(path, body) {
			const response = await fetch(path, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Aezy-Client": "web"
				},
				body: JSON.stringify(body)
			});
			const value = await response.json();
			if (!response.ok) throw new Error(value.error ?? `Aezy Project request failed (${response.status})`);
			return value;
		}
		function statusLabel(file) {
			if (file.conflict) return "UU";
			if (file.kind === "untracked") return "??";
			return `${file.indexStatus}${file.worktreeStatus}`;
		}
		function statusName(status) {
			return status[0].toUpperCase() + status.slice(1);
		}
		function StructuredPart({ part }) {
			const [rawOpen, setRawOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: { borderBottom: `1px solid ${palette.border}` },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							position: "sticky",
							top: 0,
							zIndex: 2,
							padding: "7px 12px",
							borderBottom: `1px solid ${palette.border}`,
							background: palette.elevated,
							color: palette.muted,
							fontSize: 11,
							fontWeight: 600,
							letterSpacing: ".06em",
							textTransform: "uppercase"
						},
						children: part.label
					}),
					part.state === "empty" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							padding: "28px 16px",
							color: palette.muted,
							textAlign: "center"
						},
						children: part.message ?? "No textual line changes."
					}),
					part.state === "fallback" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: { padding: 16 },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							role: "status",
							style: {
								padding: 12,
								border: `1px solid ${palette.warning}`,
								borderRadius: 8,
								color: palette.warning,
								background: palette.elevated
							},
							children: ["Structured review stopped safely. ", part.message]
						}), part.rawFallback !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { marginTop: 10 },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setRawOpen((value) => !value),
								style: {
									border: 0,
									padding: 0,
									background: "transparent",
									color: palette.accent,
									cursor: "pointer",
									font: "inherit"
								},
								children: [rawOpen ? "Hide" : "Show", " bounded raw fallback"]
							}), rawOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
								style: {
									margin: "10px 0 0",
									padding: 12,
									maxHeight: 360,
									overflow: "auto",
									border: `1px solid ${palette.border}`,
									borderRadius: 7,
									background: palette.code,
									color: palette.text,
									fontSize: 11,
									lineHeight: 1.5,
									whiteSpace: "pre"
								},
								children: part.rawFallback
							})]
						})]
					}),
					part.state === "structured" && part.hunks.map((hunk, hunkIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							position: "sticky",
							top: 27,
							zIndex: 1,
							padding: "6px 12px",
							borderBottom: `1px solid ${palette.border}`,
							background: "var(--dsw-alias-bg-layer-2, #f3f5f8)",
							color: palette.accent,
							fontFamily: "var(--ds-font-family-code, monospace)",
							fontSize: 11,
							whiteSpace: "pre",
							overflow: "hidden",
							textOverflow: "ellipsis"
						},
						children: hunk.header
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: "table",
						"aria-label": hunk.header,
						style: {
							minWidth: "max-content",
							width: "100%",
							fontFamily: "var(--ds-font-family-code, monospace)",
							fontSize: 11.5,
							lineHeight: 1.55
						},
						children: hunk.lines.map((line, lineIndex) => {
							const addition = line.kind === "addition";
							const deletion = line.kind === "deletion";
							const background = addition ? "color-mix(in srgb, var(--dsw-alias-state-success-primary, #1a7f37) 13%, transparent)" : deletion ? "color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc1313) 11%, transparent)" : "transparent";
							const marker = addition ? "+" : deletion ? "−" : line.kind === "meta" ? "·" : "";
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								role: "row",
								"data-line-kind": line.kind,
								style: {
									display: "grid",
									gridTemplateColumns: "46px 46px 24px minmax(max-content, 1fr)",
									minHeight: 20,
									background
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										role: "cell",
										style: {
											paddingRight: 8,
											borderRight: `1px solid ${palette.border}`,
											color: palette.muted,
											textAlign: "right",
											userSelect: "none"
										},
										children: line.oldLine ?? ""
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										role: "cell",
										style: {
											paddingRight: 8,
											borderRight: `1px solid ${palette.border}`,
											color: palette.muted,
											textAlign: "right",
											userSelect: "none"
										},
										children: line.newLine ?? ""
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										role: "cell",
										style: {
											color: addition ? palette.success : deletion ? palette.error : palette.muted,
											textAlign: "center",
											userSelect: "none"
										},
										children: marker
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										role: "cell",
										style: {
											paddingRight: 14,
											whiteSpace: "pre",
											color: line.kind === "meta" ? palette.muted : palette.text,
											fontStyle: line.kind === "meta" ? "italic" : void 0
										},
										children: line.text || " "
									})
								]
							}, lineIndex);
						})
					})] }, `${hunk.header}-${hunkIndex}`))
				]
			});
		}
		function ReviewPanel({ review, surface, closeReview, syncLayout, useSessions }) {
			const target = (0, react.useSyncExternalStore)(review.subscribe, review.getSnapshot);
			const currentSession = useSessions((state) => state.current);
			const currentCwd = useSessions((state) => state.current === void 0 ? void 0 : state.byId[state.current]?.cwd);
			const [document, setDocument] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [viewport, setViewport] = (0, react.useState)(() => window.innerWidth);
			const generation = (0, react.useRef)(0);
			const narrow = viewport < 760;
			const currentSurface = narrow ? "overlay" : "details";
			const matchesSession = target !== null && target.sessionId === currentSession && target.cwd === currentCwd;
			const visible = matchesSession && surface === currentSurface;
			(0, react.useEffect)(() => {
				const onResize = () => setViewport(window.innerWidth);
				window.addEventListener("resize", onResize);
				return () => window.removeEventListener("resize", onResize);
			}, []);
			(0, react.useEffect)(() => {
				if (target !== null && !matchesSession) closeReview();
			}, [
				closeReview,
				matchesSession,
				target
			]);
			(0, react.useEffect)(() => {
				if (target !== null && matchesSession) syncLayout(narrow);
			}, [
				matchesSession,
				narrow,
				syncLayout,
				target
			]);
			(0, react.useEffect)(() => {
				if (!visible || target === null) {
					setDocument(null);
					setError(null);
					return;
				}
				const controller = new AbortController();
				const requestGeneration = ++generation.current;
				setDocument(null);
				setError(null);
				request(target.source === "turn" ? "/aezy/api/project/turn-review" : "/aezy/api/project/diff", target.source === "turn" ? {
					cwd: target.cwd,
					sessionId: target.sessionId,
					turn: String(target.turn),
					path: target.path
				} : {
					cwd: target.cwd,
					path: target.path
				}, controller.signal).then((value) => {
					if (requestGeneration !== generation.current || review.getSnapshot() !== target) return;
					if (value.file.path !== target.path || value.source.kind !== target.source) throw new Error("Review response identity does not match the active selection.");
					setDocument(value);
				}).catch((reason) => {
					if (controller.signal.aborted || requestGeneration !== generation.current) return;
					setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					controller.abort();
				};
			}, [
				review,
				target,
				visible
			]);
			(0, react.useEffect)(() => {
				if (!visible) return;
				const onKey = (event) => {
					if (event.key === "Escape") closeReview();
				};
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [closeReview, visible]);
			if (!visible || target === null) return null;
			const panel = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				"aria-label": "Review changes",
				style: {
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					background: palette.panel,
					color: palette.text
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
					style: {
						flex: "0 0 auto",
						padding: "12px 14px 10px",
						borderBottom: `1px solid ${palette.border}`,
						background: palette.panel
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "flex-start",
							justifyContent: "space-between",
							gap: 12
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { minWidth: 0 },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								style: {
									display: "block",
									fontSize: 14
								},
								children: "Review changes"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									display: "inline-block",
									marginTop: 4,
									padding: "2px 7px",
									borderRadius: 999,
									background: palette.interactive,
									color: target.source === "turn" ? palette.accent : palette.warning,
									fontSize: 10.5,
									fontWeight: 600
								},
								children: target.source === "turn" ? `Historical Turn ${target.turn} snapshot` : "Current Working changes"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Close Review panel",
							onClick: closeReview,
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
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
					"aria-label": "Changed file navigation",
					style: {
						flex: "1 1 auto",
						minHeight: 0,
						overflow: "auto"
					},
					children: target.files.map((file) => {
						const expanded = file.path === target.path;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							style: { borderBottom: `1px solid ${palette.border}` },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => review.select(file.path),
								"aria-expanded": expanded,
								title: file.path,
								style: {
									width: "100%",
									minHeight: 42,
									display: "grid",
									gridTemplateColumns: "16px minmax(0, 1fr) auto",
									alignItems: "center",
									gap: 8,
									padding: "8px 12px",
									border: 0,
									background: expanded ? palette.interactive : palette.panel,
									color: expanded ? palette.accent : palette.text,
									cursor: "pointer",
									textAlign: "left"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										"aria-hidden": true,
										style: {
											color: palette.muted,
											fontSize: 10,
											transform: expanded ? "rotate(90deg)" : void 0,
											transition: "transform 120ms ease"
										},
										children: "▶"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: {
											minWidth: 0,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
											fontFamily: "var(--ds-font-family-code, monospace)",
											fontSize: 11.5
										},
										children: [file.oldPath && file.oldPath !== file.path ? `${file.oldPath} → ` : "", file.path]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffStats, {
										additions: expanded ? document?.file.additions ?? file.additions ?? null : file.additions ?? null,
										deletions: expanded ? document?.file.deletions ?? file.deletions ?? null : file.deletions ?? null
									})
								]
							}), expanded && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								"data-aezy-expanded-file": file.path,
								style: {
									overflowX: "auto",
									borderTop: `1px solid ${palette.border}`,
									background: palette.panel
								},
								children: [
									document === null && error === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											padding: 24,
											color: palette.muted,
											textAlign: "center"
										},
										children: "Loading this file…"
									}),
									error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										role: "alert",
										style: {
											margin: 12,
											padding: 12,
											border: `1px solid ${palette.error}`,
											borderRadius: 8,
											color: palette.error
										},
										children: ["Review unavailable: ", error]
									}),
									document !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "7px 12px",
												borderBottom: `1px solid ${palette.border}`,
												background: palette.panel,
												color: palette.muted,
												fontSize: 11
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: {
														color: document.file.binary ? palette.warning : palette.text,
														fontWeight: 600
													},
													children: statusName(document.file.status)
												}),
												document.file.oldPath !== null && document.file.newPath !== null && document.file.oldPath !== document.file.newPath && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													title: `${document.file.oldPath} → ${document.file.newPath}`,
													children: "rename"
												}),
												document.file.binary && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "binary" }),
												document.file.truncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: { color: palette.warning },
													children: "truncated"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: { marginLeft: "auto" },
													children: document.source.kind === "turn" ? `snapshot ${document.source.snapshotId?.slice(0, 8) ?? ""}` : `fingerprint ${document.source.fingerprint?.slice(0, 8) ?? ""}`
												})
											]
										}),
										document.file.binary && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												padding: "30px 16px",
												color: palette.muted,
												textAlign: "center"
											},
											children: "Binary file snapshot. Textual lines are not available."
										}),
										document.file.truncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												margin: 12,
												padding: 10,
												border: `1px solid ${palette.warning}`,
												borderRadius: 7,
												color: palette.warning
											},
											children: "This diff exceeded Aezy’s bounded review limit. Only a safe fallback may be available."
										}),
										!document.file.binary && document.parts.map((part) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StructuredPart, { part }, part.scope))
									] })
								]
							})]
						}, file.path);
					})
				})]
			});
			return surface === "overlay" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-aezy-review-panel": true,
				"data-surface": "overlay",
				"data-source": target.source,
				style: {
					position: "absolute",
					inset: 0,
					background: "var(--dsw-alias-bg-overlay, rgba(0,0,0,.36))"
				},
				children: panel
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-aezy-review-panel": true,
				"data-surface": "details",
				"data-source": target.source,
				style: {
					width: "100%",
					height: "100%"
				},
				children: panel
			});
		}
		function ChangesView({ cwd, sessionId, openReview }) {
			const [project, setProject] = (0, react.useState)(null);
			const [ledger, setLedger] = (0, react.useState)(null);
			const [selected, setSelected] = (0, react.useState)(null);
			const [diff, setDiff] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(false);
			const [mutating, setMutating] = (0, react.useState)(false);
			const [undoReceipt, setUndoReceipt] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const refresh = (0, react.useCallback)(async () => {
				setLoading(true);
				setError(null);
				try {
					const [next, nextLedger] = await Promise.all([request("/aezy/api/project", { cwd }), request("/aezy/api/project/ledger", {
						cwd,
						sessionId
					})]);
					setProject(next);
					setLedger(nextLedger);
					setUndoReceipt((current) => current ?? nextLedger.receipts.filter((receipt) => receipt.status === "committed").sort((left, right) => right.createdAt - left.createdAt)[0]?.id ?? null);
					setSelected((current) => current !== null && next.files.some((file) => file.path === current) ? current : null);
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setLoading(false);
				}
			}, [cwd, sessionId]);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			(0, react.useEffect)(() => {
				if (selected === null) {
					setDiff(null);
					return;
				}
				const controller = new AbortController();
				setDiff(null);
				request("/aezy/api/project/diff", {
					cwd,
					path: selected
				}, controller.signal).then((value) => {
					if (!controller.signal.aborted && value.file.path === selected) setDiff(value);
				}).catch((reason) => {
					if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					controller.abort();
				};
			}, [cwd, selected]);
			const branch = (0, react.useMemo)(() => {
				if (project === null) return "";
				const name = project.repository.branch ?? `detached@${project.repository.head ?? "unborn"}`;
				const movement = [project.repository.ahead > 0 ? `↑${project.repository.ahead}` : "", project.repository.behind > 0 ? `↓${project.repository.behind}` : ""].filter(Boolean).join(" ");
				return movement === "" ? name : `${name} ${movement}`;
			}, [project]);
			const ledgerByPath = (0, react.useMemo)(() => {
				const entries = /* @__PURE__ */ new Map();
				for (const turn of ledger?.turns ?? []) for (const file of turn.files) entries.set(file.path, {
					turn,
					file
				});
				return entries;
			}, [ledger]);
			const selectedLedger = selected === null ? void 0 : ledgerByPath.get(selected);
			const canRevert = diff !== null && selectedLedger?.file.revertable === true && selectedLedger.file.afterFingerprint === diff.fingerprint;
			const revertSelected = (0, react.useCallback)(async () => {
				if (diff === null || selectedLedger === void 0 || !canRevert) return;
				if (!window.confirm(`Revert ${diff.file.path} to its state before Turn ${selectedLedger.turn.turn}? You can undo this action until the file changes again.`)) return;
				setMutating(true);
				setError(null);
				try {
					const result = await mutate("/aezy/api/project/revert", {
						cwd,
						sessionId,
						turn: selectedLedger.turn.turn,
						path: diff.file.path,
						expectedFingerprint: diff.fingerprint
					});
					setUndoReceipt(result.receiptId);
					await refresh();
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setMutating(false);
				}
			}, [
				canRevert,
				cwd,
				diff,
				refresh,
				selectedLedger,
				sessionId
			]);
			const undoLastRevert = (0, react.useCallback)(async () => {
				if (undoReceipt === null) return;
				setMutating(true);
				setError(null);
				try {
					await mutate("/aezy/api/project/undo", {
						cwd,
						receiptId: undoReceipt
					});
					setUndoReceipt(null);
					await refresh();
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setMutating(false);
				}
			}, [
				cwd,
				refresh,
				undoReceipt
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					height: "100%",
					overflow: "auto",
					padding: "18px 22px",
					background: palette.panel,
					color: palette.text
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						style: {
							display: "flex",
							alignItems: "flex-start",
							justifyContent: "space-between",
							gap: 16,
							paddingBottom: 14,
							borderBottom: `1px solid ${palette.border}`
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { minWidth: 0 },
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										alignItems: "center",
										gap: 9,
										flexWrap: "wrap"
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
											style: { fontSize: 15 },
											children: project?.project.name ?? "Repository"
										}),
										project !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												color: palette.accent,
												fontFamily: "monospace",
												fontSize: 12
											},
											children: branch
										}),
										project !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												color: palette.muted,
												fontSize: 12
											},
											children: [project.files.length, " changed"]
										}),
										ledger !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												color: palette.muted,
												fontSize: 12
											},
											children: [ledger.turns.length, " recorded turns"]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									title: project?.project.root,
									style: {
										marginTop: 4,
										color: palette.muted,
										fontFamily: "monospace",
										fontSize: 11,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: project?.project.root ?? cwd
								}),
								project !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										marginTop: 5,
										color: palette.muted,
										fontSize: 11
									},
									children: [
										project.environment.kind === "worktree" ? "Worktree" : "Local",
										" · ",
										project.environment.platform,
										"/",
										project.environment.arch,
										" · ",
										project.environment.node,
										project.environment.packageManager ? ` · ${project.environment.packageManager}` : ""
									]
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => void refresh(),
							disabled: loading,
							style: {
								padding: "6px 10px",
								borderRadius: 6,
								border: `1px solid ${palette.border}`,
								background: palette.button,
								color: palette.text,
								cursor: loading ? "wait" : "pointer"
							},
							children: loading ? "Refreshing…" : "Refresh"
						})]
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: "alert",
						style: {
							marginTop: 14,
							padding: 10,
							border: `1px solid ${palette.error}`,
							borderRadius: 7,
							color: palette.error
						},
						children: error
					}),
					undoReceipt !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 12,
							marginTop: 14,
							padding: 10,
							border: `1px solid ${palette.border}`,
							borderRadius: 7,
							background: palette.elevated
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								color: palette.muted,
								fontSize: 12
							},
							children: "File reverted with a recoverable receipt."
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => void undoLastRevert(),
							disabled: mutating,
							style: {
								padding: "5px 9px",
								borderRadius: 6,
								border: `1px solid ${palette.border}`,
								background: palette.button,
								color: palette.text,
								cursor: mutating ? "wait" : "pointer"
							},
							children: "Undo"
						})]
					}),
					project?.repository.clean === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							padding: "44px 0",
							textAlign: "center",
							color: palette.muted
						},
						children: "Working tree clean"
					}),
					project !== null && project.files.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gridTemplateColumns: "minmax(210px, 30%) minmax(0, 1fr)",
							gap: 18,
							marginTop: 16,
							alignItems: "start"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
							"aria-label": "Changed files",
							style: {
								border: `1px solid ${palette.border}`,
								borderRadius: 8,
								overflow: "hidden"
							},
							children: project.files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									setSelected(file.path);
									openReview({
										source: "working",
										cwd,
										sessionId,
										path: file.path,
										files: project.files.map((item) => ({
											path: item.path,
											oldPath: item.originalPath ?? null
										}))
									});
								},
								style: {
									width: "100%",
									display: "grid",
									gridTemplateColumns: "30px minmax(0, 1fr) auto",
									gap: 8,
									padding: "9px 10px",
									border: 0,
									borderBottom: `1px solid ${palette.border}`,
									background: selected === file.path ? palette.interactive : "transparent",
									color: palette.text,
									textAlign: "left",
									cursor: "pointer"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											color: file.conflict ? palette.error : palette.accent,
											fontFamily: "monospace",
											fontSize: 11
										},
										children: statusLabel(file)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										title: file.path,
										style: {
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
											fontFamily: "monospace",
											fontSize: 12
										},
										children: file.path
									}),
									ledgerByPath.has(file.path) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										title: ledgerByPath.get(file.path)?.turn.concurrent ? "Observed while another Session was active in this repository" : "Latest observed Agent turn",
										style: {
											color: ledgerByPath.get(file.path)?.turn.concurrent ? palette.warning : palette.muted,
											fontSize: 10
										},
										children: ["T", ledgerByPath.get(file.path)?.turn.turn]
									})
								]
							}, file.path))
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("main", {
							style: { minWidth: 0 },
							children: [
								selected !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										gap: 12
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
										style: {
											margin: 0,
											fontFamily: "monospace",
											fontSize: 14,
											overflowWrap: "anywhere"
										},
										children: selected
									}), selectedLedger !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => void revertSelected(),
										disabled: !canRevert || mutating,
										title: canRevert ? `Restore the state before Turn ${selectedLedger.turn.turn}` : "The file changed after this ledger entry or the recorded state is unsupported",
										style: {
											padding: "5px 9px",
											flex: "0 0 auto",
											borderRadius: 6,
											border: `1px solid ${canRevert ? palette.warning : palette.border}`,
											background: palette.button,
											color: canRevert ? palette.warning : palette.muted,
											cursor: canRevert && !mutating ? "pointer" : "not-allowed"
										},
										children: ["Revert T", selectedLedger.turn.turn]
									})]
								}),
								selected === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										padding: "24px 0",
										color: palette.muted
									},
									children: "Select a file to open structured Review without changing this view or its scroll position."
								}),
								diff === null && selected !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										padding: "24px 0",
										color: palette.muted
									},
									children: "Loading file identity…"
								}),
								diff !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										marginTop: 14,
										padding: 12,
										border: `1px solid ${palette.border}`,
										borderRadius: 8,
										background: palette.elevated,
										color: palette.muted,
										fontSize: 12
									},
									children: [
										"Structured diff is open in the right Review panel. ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffStats, {
											additions: diff.file.additions,
											deletions: diff.file.deletions
										}),
										diff.file.binary && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: { marginLeft: 8 },
											children: "binary"
										}),
										diff.file.truncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												marginLeft: 8,
												color: palette.warning
											},
											children: "truncated"
										})
									]
								})
							]
						})]
					})
				]
			});
		}
		function shortCommit(value) {
			return value === null ? "unknown" : value.slice(0, 10);
		}
		function parseValidationLines(value) {
			if (value.trim() === "") return [];
			return value.split("\n").map((line, index) => {
				const [rawStatus, rawCommand, ...rawSummary] = line.split("|");
				const status = rawStatus?.trim();
				const command = rawCommand?.trim() ?? "";
				const summary = rawSummary.join("|").trim();
				if (status !== "passed" && status !== "failed" && status !== "skipped") throw new Error(`Validation line ${index + 1} must start with passed, failed, or skipped`);
				if (command === "") throw new Error(`Validation line ${index + 1} needs a command after "|"`);
				return {
					status,
					command,
					...summary === "" ? {} : { summary }
				};
			});
		}
		function WorktreesView({ cwd, sessionId, openWorktree, returnToLocal }) {
			const [project, setProject] = (0, react.useState)(null);
			const [registry, setRegistry] = (0, react.useState)(null);
			const [name, setName] = (0, react.useState)("");
			const [instructions, setInstructions] = (0, react.useState)("Review the recorded branch and continue from the exact handoff head.");
			const [validationText, setValidationText] = (0, react.useState)("");
			const [handoff, setHandoff] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(false);
			const [mutating, setMutating] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const refresh = (0, react.useCallback)(async () => {
				setLoading(true);
				setError(null);
				try {
					const [nextProject, nextRegistry] = await Promise.all([request("/aezy/api/project", { cwd }), request("/aezy/api/project/worktrees", { cwd })]);
					setProject(nextProject);
					setRegistry(nextRegistry);
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setLoading(false);
				}
			}, [cwd]);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			const current = registry?.worktrees.find((item) => item.id === registry.currentWorktreeId);
			const createWorktree = (0, react.useCallback)(async () => {
				if (project?.repository.head === null || name.trim() === "") return;
				let confirmDirty = false;
				if (!project.repository.clean) {
					confirmDirty = window.confirm("The Local repository is dirty. The Worktree will start from the displayed committed HEAD only; current staged, unstaged, and untracked changes stay in Local. Continue?");
					if (!confirmDirty) return;
				}
				if (!window.confirm(`Create aezy/${name.trim()} from ${shortCommit(project.repository.head)} in Aezy's repository-specific Worktree directory?`)) return;
				setMutating(true);
				setError(null);
				try {
					const created = await mutate("/aezy/api/project/worktrees/create", {
						cwd,
						name: name.trim(),
						base: project.repository.head,
						confirmDirty
					});
					await openWorktree(created.worktree.path, created.worktree.id);
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
					await refresh();
				} finally {
					setMutating(false);
				}
			}, [
				cwd,
				name,
				openWorktree,
				project,
				refresh
			]);
			const createHandoff = (0, react.useCallback)(async () => {
				const result = await mutate("/aezy/api/project/worktrees/handoff", {
					cwd,
					sessionId,
					instructions,
					validations: parseValidationLines(validationText)
				});
				setHandoff(result.handoff);
				await refresh();
				return result.handoff;
			}, [
				cwd,
				instructions,
				refresh,
				sessionId,
				validationText
			]);
			const generateHandoff = (0, react.useCallback)(async () => {
				setMutating(true);
				setError(null);
				try {
					await createHandoff();
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setMutating(false);
				}
			}, [createHandoff]);
			const handoffToLocal = (0, react.useCallback)(async () => {
				if (current === void 0 || registry === null) return;
				if (!window.confirm("Generate a fresh handoff, archive this Worktree Session, release its binding, and open a Local Session?")) return;
				setMutating(true);
				setError(null);
				try {
					await createHandoff();
					await returnToLocal(registry.repository.root, current.id, cwd, sessionId);
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setMutating(false);
				}
			}, [
				createHandoff,
				current,
				cwd,
				registry,
				returnToLocal,
				sessionId
			]);
			const loadHandoff = (0, react.useCallback)(async (item) => {
				if (item.latestHandoffId === null) return;
				setError(null);
				try {
					setHandoff(await request("/aezy/api/project/worktrees/handoff", {
						cwd,
						handoffId: item.latestHandoffId
					}));
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				}
			}, [cwd]);
			const cleanup = (0, react.useCallback)(async (item) => {
				if (!window.confirm(`Remove the clean Worktree directory for ${item.branch}? Aezy will retain the branch and its commits.`)) return;
				setMutating(true);
				setError(null);
				try {
					await mutate("/aezy/api/project/worktrees/cleanup", {
						cwd,
						worktreeId: item.id
					});
					await refresh();
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setMutating(false);
				}
			}, [cwd, refresh]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					height: "100%",
					overflow: "auto",
					padding: "18px 22px",
					background: palette.panel,
					color: palette.text
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						style: {
							display: "flex",
							alignItems: "flex-start",
							justifyContent: "space-between",
							gap: 16,
							paddingBottom: 14,
							borderBottom: `1px solid ${palette.border}`
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
							style: { fontSize: 15 },
							children: "Worktrees & Handoff"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							title: registry?.managedRoot,
							style: {
								marginTop: 4,
								color: palette.muted,
								fontFamily: "monospace",
								fontSize: 11
							},
							children: registry?.managedRoot ?? "Loading repository identity…"
						})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => void refresh(),
							disabled: loading,
							style: {
								padding: "6px 10px",
								borderRadius: 6,
								border: `1px solid ${palette.border}`,
								background: palette.button,
								color: palette.text
							},
							children: loading ? "Refreshing…" : "Refresh"
						})]
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: "alert",
						style: {
							marginTop: 14,
							padding: 10,
							border: `1px solid ${palette.error}`,
							borderRadius: 7,
							color: palette.error
						},
						children: error
					}),
					project?.environment.kind === "local" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						style: {
							marginTop: 16,
							padding: 14,
							border: `1px solid ${palette.border}`,
							borderRadius: 8,
							background: palette.elevated
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								style: {
									margin: "0 0 6px",
									fontSize: 14
								},
								children: "Create isolated Worktree Session"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									color: palette.muted,
									fontSize: 12
								},
								children: [
									"Exact base ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: project.repository.head ?? "unborn" }),
									". Local changes are never copied implicitly."
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 8,
									marginTop: 12
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											alignSelf: "center",
											color: palette.muted,
											fontFamily: "monospace",
											fontSize: 12
										},
										children: "aezy/"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										value: name,
										onChange: (event) => setName(event.target.value.toLowerCase()),
										placeholder: "task-name",
										"aria-label": "Worktree name",
										style: {
											flex: "1 1 240px",
											minWidth: 120,
											padding: "7px 9px",
											border: `1px solid ${palette.border}`,
											borderRadius: 6,
											background: palette.panel,
											color: palette.text
										}
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => void createWorktree(),
										disabled: mutating || name.trim() === "" || project.repository.head === null,
										style: {
											padding: "7px 11px",
											border: `1px solid ${palette.border}`,
											borderRadius: 6,
											background: palette.button,
											color: palette.text
										},
										children: mutating ? "Creating…" : "Create & open Session"
									})
								]
							}),
							!project.repository.clean && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									marginTop: 8,
									color: palette.warning,
									fontSize: 12
								},
								children: "Local is dirty; creation requires an explicit confirmation and uses committed HEAD only."
							})
						]
					}),
					project?.environment.kind === "worktree" && current === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							marginTop: 18,
							padding: 14,
							border: `1px solid ${palette.warning}`,
							borderRadius: 8,
							color: palette.warning
						},
						children: "This is a Git worktree, but it is not owned by Aezy's M3 registry. Lifecycle actions are disabled."
					}),
					current !== void 0 && registry !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						style: {
							marginTop: 16,
							padding: 14,
							border: `1px solid ${palette.border}`,
							borderRadius: 8,
							background: palette.elevated
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									justifyContent: "space-between",
									gap: 12,
									flexWrap: "wrap"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									style: {
										margin: 0,
										fontSize: 14
									},
									children: current.branch
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										marginTop: 4,
										color: palette.muted,
										fontFamily: "monospace",
										fontSize: 11
									},
									children: current.path
								})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										color: palette.accent,
										fontSize: 12
									},
									children: [
										current.state,
										" · ",
										shortCommit(current.head)
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									display: "block",
									marginTop: 14,
									color: palette.muted,
									fontSize: 12
								},
								children: ["Handoff instructions", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: instructions,
									onChange: (event) => setInstructions(event.target.value),
									rows: 4,
									style: {
										display: "block",
										boxSizing: "border-box",
										width: "100%",
										marginTop: 6,
										padding: 9,
										resize: "vertical",
										border: `1px solid ${palette.border}`,
										borderRadius: 6,
										background: palette.panel,
										color: palette.text
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									display: "block",
									marginTop: 12,
									color: palette.muted,
									fontSize: 12
								},
								children: [
									"Validation results — one per line: ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "passed | command | summary" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
										value: validationText,
										onChange: (event) => setValidationText(event.target.value),
										rows: 3,
										placeholder: "passed | pnpm test | 13 tests passed",
										style: {
											display: "block",
											boxSizing: "border-box",
											width: "100%",
											marginTop: 6,
											padding: 9,
											resize: "vertical",
											border: `1px solid ${palette.border}`,
											borderRadius: 6,
											background: palette.panel,
											color: palette.text,
											fontFamily: "monospace",
											fontSize: 12
										}
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 8,
									marginTop: 12,
									flexWrap: "wrap"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => void generateHandoff(),
									disabled: mutating || instructions.trim() === "",
									style: {
										padding: "7px 11px",
										border: `1px solid ${palette.border}`,
										borderRadius: 6,
										background: palette.button,
										color: palette.text
									},
									children: "Generate handoff"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => void handoffToLocal(),
									disabled: mutating || instructions.trim() === "",
									style: {
										padding: "7px 11px",
										border: `1px solid ${palette.accent}`,
										borderRadius: 6,
										background: palette.button,
										color: palette.accent
									},
									children: "Handoff to Local"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									marginTop: 9,
									color: palette.muted,
									fontSize: 11
								},
								children: "Handoff records exact base/head, status, changed files, validations, and instructions. Returning archives and releases this Session; it does not merge or delete the branch."
							})
						]
					}),
					registry !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						style: { marginTop: 18 },
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								style: {
									margin: "0 0 9px",
									fontSize: 14
								},
								children: "Managed lifecycle"
							}),
							registry.worktrees.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: { color: palette.muted },
								children: "No Aezy-managed worktrees."
							}),
							registry.worktrees.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "grid",
									gridTemplateColumns: "minmax(0, 1fr) auto",
									gap: 12,
									marginTop: 8,
									padding: 11,
									border: `1px solid ${palette.border}`,
									borderRadius: 7
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: { minWidth: 0 },
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
											style: {
												fontFamily: "monospace",
												fontSize: 12
											},
											children: item.branch
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												marginLeft: 8,
												color: item.state === "failed" ? palette.error : palette.muted,
												fontSize: 11
											},
											children: item.state
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											title: item.path,
											style: {
												marginTop: 3,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
												color: palette.muted,
												fontFamily: "monospace",
												fontSize: 11
											},
											children: item.path
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												marginTop: 3,
												color: palette.muted,
												fontSize: 11
											},
											children: [
												item.sessions.filter((binding) => binding.status === "active").length,
												" active Sessions · base ",
												shortCommit(item.base),
												" · head ",
												shortCommit(item.head)
											]
										}),
										item.error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												marginTop: 4,
												color: palette.error,
												fontSize: 11
											},
											children: item.error
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										alignItems: "center",
										gap: 6
									},
									children: [item.latestHandoffId !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => void loadHandoff(item),
										style: {
											padding: "5px 8px",
											border: `1px solid ${palette.border}`,
											borderRadius: 5,
											background: palette.button,
											color: palette.text
										},
										children: "View handoff"
									}), project?.environment.kind === "local" && item.state !== "cleaned" && item.state !== "failed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => void cleanup(item),
										disabled: mutating,
										style: {
											padding: "5px 8px",
											border: `1px solid ${palette.warning}`,
											borderRadius: 5,
											background: palette.button,
											color: palette.warning
										},
										children: "Clean up"
									})]
								})]
							}, item.id))
						]
					}),
					handoff !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						style: { marginTop: 18 },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: 10
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h2", {
								style: {
									margin: 0,
									fontSize: 14
								},
								children: ["Structured handoff ", handoff.id]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => void navigator.clipboard.writeText(JSON.stringify(handoff, null, 2)),
								style: {
									padding: "5px 8px",
									border: `1px solid ${palette.border}`,
									borderRadius: 5,
									background: palette.button,
									color: palette.text
								},
								children: "Copy JSON"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							style: {
								margin: "8px 0 0",
								padding: 12,
								maxHeight: 420,
								overflow: "auto",
								border: `1px solid ${palette.border}`,
								borderRadius: 7,
								background: palette.code,
								color: palette.text,
								fontSize: 11,
								lineHeight: 1.5
							},
							children: JSON.stringify(handoff, null, 2)
						})]
					})
				]
			});
		}
		const inject = [
			"slots",
			"sessions",
			"workspaces",
			"layout"
		];
		function apply(ctx) {
			const review = new ReviewController();
			const closeReview = () => {
				review.close();
				ctx.layout.closeDetails();
			};
			const syncLayout = (narrow) => {
				if (narrow) ctx.layout.closeDetails();
				else ctx.layout.openDetails();
			};
			const openReview = (target) => {
				review.open(target);
				syncLayout(window.innerWidth < 760);
			};
			ctx.slots.inject("details", () => ctx.slots.register({
				name: "details",
				priority: -10,
				inject: () => ({
					review,
					surface: "details",
					closeReview,
					syncLayout
				})
			}, ReviewPanel));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "aezy-review",
				order: 100,
				inject: () => ({
					review,
					surface: "overlay",
					closeReview,
					syncLayout
				})
			}, ReviewPanel));
			ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({
				name: "conversation.chat.turnTail",
				priority: -10,
				select: (owner) => owner.turn.status === "closed" ? { turn: owner.turn.turn } : null,
				inject: (sessionId) => {
					const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd;
					if (cwd === void 0) throw new Error(`aezy-project: session "${sessionId}" has no working directory`);
					return {
						cwd,
						sessionId,
						openReview
					};
				}
			}, TurnChangedFiles));
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "changes",
				order: 5,
				label: () => "Changes",
				inject: (sessionId) => {
					const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd;
					if (cwd === void 0) throw new Error(`aezy-project: session "${sessionId}" has no working directory`);
					return {
						cwd,
						sessionId,
						openReview
					};
				}
			}, ChangesView));
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "worktrees",
				order: 6,
				label: () => "Worktrees",
				inject: (sessionId) => {
					const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd;
					if (cwd === void 0) throw new Error(`aezy-project: session "${sessionId}" has no working directory`);
					return {
						cwd,
						sessionId
					};
				}
			}, (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorktreesView, {
				...props,
				openWorktree: async (path, worktreeId) => {
					const workspace = await ctx.workspaces.create({ path });
					const sessionId = await ctx.workspaces.connectWorkspace(workspace.workspaceId);
					await mutate("/aezy/api/project/worktrees/bind", {
						cwd: path,
						worktreeId,
						sessionId
					});
					ctx.sessions.open(sessionId);
				},
				returnToLocal: async (repositoryRoot, worktreeId, cwd, sessionId) => {
					const workspace = await ctx.workspaces.create({ path: repositoryRoot });
					const localSessionId = await ctx.workspaces.connectWorkspace(workspace.workspaceId);
					await ctx.workspaces.archiveSession(sessionId);
					await mutate("/aezy/api/project/worktrees/release", {
						cwd,
						worktreeId,
						sessionId
					});
					ctx.sessions.open(localSessionId);
				}
			})));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map