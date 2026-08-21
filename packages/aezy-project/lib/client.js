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
					binary: file.binary === true
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
					fontFamily: "monospace"
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
		function TurnChangedFiles({ matched, cwd, sessionId, openFile }) {
			const [summary, setSummary] = (0, react.useState)(void 0);
			const [review, setReview] = (0, react.useState)(void 0);
			const [reviewOpen, setReviewOpen] = (0, react.useState)(false);
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
			const toggleReview = async () => {
				if (reviewOpen) {
					setReviewOpen(false);
					return;
				}
				setReviewOpen(true);
				if (review !== void 0) return;
				setError(null);
				try {
					setReview(await request("/aezy/api/project/turn-review", {
						cwd,
						sessionId,
						turn: String(summary.turn)
					}));
				} catch (reason) {
					setReview(void 0);
					setReviewOpen(false);
					setError(reason instanceof Error ? reason.message : String(reason));
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"data-aezy-turn-files": summary.turn,
				style: {
					marginTop: 14,
					maxWidth: 720,
					overflow: "hidden",
					border: `1px solid ${palette.border}`,
					borderRadius: 10,
					background: palette.elevated,
					color: palette.text,
					fontSize: 12
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 12,
							padding: "10px 12px 7px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", {
							style: {
								fontSize: 12,
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
								gap: 4
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
									borderRadius: 5,
									padding: "3px 7px",
									background: "transparent",
									color: canUndo ? palette.accent : palette.muted,
									cursor: canUndo && !mutating ? "pointer" : "not-allowed",
									font: "inherit"
								},
								children: mutating ? "Working…" : receiptId === null ? "Undo" : "Redo"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									toggleReview();
								},
								"aria-expanded": reviewOpen,
								style: {
									border: 0,
									borderRadius: 5,
									padding: "3px 7px",
									background: "transparent",
									color: palette.accent,
									cursor: "pointer",
									font: "inherit"
								},
								children: reviewOpen ? "Close review" : "Review"
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: "0 12px 8px",
							color: palette.muted
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffStats, {
								additions: summary.additions,
								deletions: summary.deletions
							}),
							!summary.statsComplete && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								title: "One or more files have unavailable line statistics",
								style: { marginLeft: 8 },
								children: "partial"
							}),
							summary.concurrent && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								title: "Another Session was active in this repository during the Turn",
								style: {
									marginLeft: 8,
									color: palette.warning
								},
								children: "concurrent"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { borderTop: `1px solid ${palette.border}` },
						children: summary.files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								minHeight: 30,
								display: "grid",
								gridTemplateColumns: "minmax(0, 1fr) auto",
								alignItems: "center",
								gap: 16,
								padding: "4px 12px",
								borderBottom: `1px solid ${palette.border}`
							},
							children: [file.afterFingerprint === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								title: `${file.path} (removed)`,
								style: {
									minWidth: 0,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									color: palette.muted,
									textDecoration: "line-through",
									fontFamily: "monospace"
								},
								children: file.path
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								title: file.path,
								onClick: () => openFile(file.openPath),
								style: {
									minWidth: 0,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									padding: 0,
									border: 0,
									background: "transparent",
									color: palette.text,
									cursor: "pointer",
									textAlign: "left",
									fontFamily: "monospace",
									fontSize: 12
								},
								children: file.path
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffStats, {
								additions: file.additions,
								deletions: file.deletions
							})]
						}, file.path))
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						title: error,
						style: {
							padding: "8px 12px",
							color: palette.error
						},
						children: error
					}),
					reviewOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: 12,
							background: palette.panel
						},
						children: [review === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: { color: palette.muted },
							children: "Loading Turn diff…"
						}), review?.files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							style: { marginTop: 10 },
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										justifyContent: "space-between",
										gap: 12,
										marginBottom: 6
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
										style: {
											minWidth: 0,
											overflowWrap: "anywhere",
											fontFamily: "monospace",
											fontWeight: 500
										},
										children: file.path
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffStats, {
										additions: file.additions,
										deletions: file.deletions
									})]
								}),
								file.binary ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: { color: palette.muted },
									children: "Binary or oversized file; textual review unavailable."
								}) : file.diff === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: { color: palette.muted },
									children: "No worktree line changes."
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
									style: {
										margin: 0,
										padding: 10,
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
									children: file.diff
								}),
								file.truncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										marginTop: 5,
										color: palette.warning
									},
									children: "Diff truncated at the Aezy review limit."
								})
							]
						}, file.path))]
					})
				]
			});
		}
		async function request(path, params) {
			const query = new URLSearchParams(params);
			const response = await fetch(`${path}?${query}`, {
				headers: { "X-Aezy-Client": "web" },
				cache: "no-store"
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
		function CodeDiff({ title, text }) {
			if (text === "") return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				style: { marginTop: 16 },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					style: {
						margin: "0 0 8px",
						fontSize: 12,
						color: palette.muted,
						textTransform: "uppercase",
						letterSpacing: ".08em"
					},
					children: title
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
					style: {
						margin: 0,
						padding: 14,
						overflow: "auto",
						fontSize: 12,
						lineHeight: 1.55,
						background: palette.code,
						border: `1px solid ${palette.border}`,
						borderRadius: 8,
						color: palette.text,
						whiteSpace: "pre"
					},
					children: text
				})]
			});
		}
		function ChangesView({ cwd, sessionId }) {
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
					setSelected((current) => current !== null && next.files.some((file) => file.path === current) ? current : next.files[0]?.path ?? null);
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
				let live = true;
				setDiff(null);
				request("/aezy/api/project/diff", {
					cwd,
					path: selected
				}).then((value) => {
					if (live) setDiff(value);
				}).catch((reason) => {
					if (live) setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					live = false;
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
										"Local · ",
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
								onClick: () => setSelected(file.path),
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
								diff === null && selected !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										padding: "24px 0",
										color: palette.muted
									},
									children: "Loading diff…"
								}),
								diff?.binary === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										padding: "24px 0",
										color: palette.muted
									},
									children: "Binary or oversized file; textual diff unavailable."
								}),
								diff?.truncated === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										marginTop: 10,
										color: palette.warning,
										fontSize: 12
									},
									children: "Diff truncated at the Aezy safety limit."
								}),
								diff !== null && !diff.binary && diff.staged === "" && diff.worktree === "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										padding: "24px 0",
										color: palette.muted
									},
									children: "No textual diff."
								}),
								diff !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CodeDiff, {
									title: "Staged",
									text: diff.staged
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CodeDiff, {
									title: diff.file.kind === "untracked" ? "Untracked" : "Working tree",
									text: diff.worktree
								})] })
							]
						})]
					})
				]
			});
		}
		const inject = ["slots", "sessions"];
		function apply(ctx) {
			ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({
				name: "conversation.chat.turnTail",
				priority: -10,
				select: (owner) => owner.turn.status === "closed" ? { turn: owner.turn.turn } : null,
				inject: (sessionId) => {
					const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd;
					if (cwd === void 0) throw new Error(`aezy-project: session "${sessionId}" has no working directory`);
					return {
						cwd,
						sessionId
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
						sessionId
					};
				}
			}, ChangesView));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map