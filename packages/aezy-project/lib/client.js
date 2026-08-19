window.__ModuleLoader__.load({
	id: "@aezy/project",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/index.tsx
		const palette = {
			panel: "var(--color-bg, #111827)",
			elevated: "var(--color-bg-elevated, #182233)",
			border: "var(--color-border, #334155)",
			text: "var(--color-text, #e5e7eb)",
			muted: "var(--color-text-secondary, #94a3b8)",
			accent: "var(--color-primary, #60a5fa)"
		};
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
						background: palette.elevated,
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
								background: palette.elevated,
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
							border: "1px solid #b45309",
							borderRadius: 7,
							color: "#fbbf24"
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
								background: palette.panel,
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
									background: selected === file.path ? palette.elevated : "transparent",
									color: palette.text,
									textAlign: "left",
									cursor: "pointer"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											color: file.conflict ? "#fb7185" : palette.accent,
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
											color: ledgerByPath.get(file.path)?.turn.concurrent ? "#fbbf24" : palette.muted,
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
											border: `1px solid ${canRevert ? "#b45309" : palette.border}`,
											background: palette.elevated,
											color: canRevert ? "#fbbf24" : palette.muted,
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
										color: "#fbbf24",
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