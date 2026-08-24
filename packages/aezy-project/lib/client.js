window.__ModuleLoader__.load({
	id: "@aezy/project",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/summary.js
		/** Final, browser-safe projection of one authoritative ledger turn. */
		function summarizeTurn(ledger, turnNumber) {
			if (!Number.isSafeInteger(turnNumber) || turnNumber < 1) return null;
			const turn = ledger?.turns?.find((candidate) => candidate.turn === turnNumber);
			if (turn === void 0 || !Array.isArray(turn.files) || turn.files.length === 0 && turn.partial !== true) return null;
			return {
				turn: turn.turn,
				concurrent: turn.concurrent === true,
				additions: turn.additions ?? 0,
				deletions: turn.deletions ?? 0,
				statsComplete: turn.statsComplete === true,
				source: turn.source ?? "git",
				partial: turn.partial === true,
				unobservedTools: Array.isArray(turn.unobservedTools) ? turn.unobservedTools : [],
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
		const changeSurfaceStyle = {
			overflow: "hidden",
			borderRadius: 12,
			background: "var(--dsw-alias-markdown-code-block)",
			color: "var(--dsw-alias-label-primary)"
		};
		const changeBannerStyle = {
			background: "var(--dsw-alias-markdown-code-block-banner)",
			font: "var(--dsw-font-xs-13)"
		};
		function ChangeSurface({ className, style, ...props }) {
			const classes = ["aezy-change-surface", className].filter(Boolean).join(" ");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
				...props,
				className: classes,
				style: {
					...changeSurfaceStyle,
					...style
				}
			});
		}
		function fileVisual(path) {
			const name = path.split("/").pop()?.toLowerCase() ?? path.toLowerCase();
			const extension = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
			if ([
				"ts",
				"tsx",
				"js",
				"jsx",
				"mjs",
				"cjs",
				"py",
				"go",
				"rs",
				"java",
				"kt",
				"kts",
				"c",
				"cc",
				"cpp",
				"h",
				"hpp",
				"rb",
				"php",
				"swift",
				"vue",
				"svelte"
			].includes(extension)) return "code";
			if ([
				"json",
				"jsonc",
				"json5",
				"yaml",
				"yml",
				"toml",
				"ini",
				"conf",
				"config",
				"xml"
			].includes(extension) || [
				"dockerfile",
				"makefile",
				".gitignore",
				".gitattributes",
				".editorconfig",
				".npmrc"
			].includes(name)) return "config";
			if ([
				"md",
				"mdx",
				"txt",
				"rst",
				"adoc",
				"pdf",
				"doc",
				"docx"
			].includes(extension)) return "document";
			if ([
				"png",
				"jpg",
				"jpeg",
				"gif",
				"webp",
				"svg",
				"ico",
				"avif",
				"bmp"
			].includes(extension)) return "image";
			if ([
				"css",
				"scss",
				"sass",
				"less",
				"styl"
			].includes(extension)) return "style";
			if ([
				"sh",
				"bash",
				"zsh",
				"fish",
				"ps1",
				"bat",
				"cmd"
			].includes(extension)) return "terminal";
			if ([
				"csv",
				"tsv",
				"sql",
				"db",
				"sqlite",
				"parquet"
			].includes(extension)) return "data";
			return "generic";
		}
		function FileTypeIcon({ path }) {
			const visual = fileVisual(path);
			const color = visual === "image" || visual === "style" ? palette.accent : visual === "terminal" || visual === "data" ? palette.success : visual === "config" ? palette.warning : visual === "code" ? "var(--dsw-alias-state-business-primary, #4d6bfe)" : palette.muted;
			const label = `${visual[0].toUpperCase()}${visual.slice(1)} file`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"data-aezy-file-icon": visual,
				role: "img",
				title: label,
				"aria-label": label,
				style: {
					width: 16,
					height: 16,
					display: "inline-flex",
					flex: "0 0 auto",
					color
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					viewBox: "0 0 16 16",
					width: "16",
					height: "16",
					fill: "none",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M3.25 1.75h5.2l4.3 4.3v8.2H3.25z",
							stroke: "currentColor",
							strokeWidth: "1.2",
							strokeLinejoin: "round"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M8.25 1.9v4.35h4.35",
							stroke: "currentColor",
							strokeWidth: "1.2",
							strokeLinejoin: "round"
						}),
						visual === "code" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "m6.15 8-1.4 1.25 1.4 1.25M9.85 8l1.4 1.25-1.4 1.25M8.7 7.65 7.35 10.9",
							stroke: "currentColor",
							strokeWidth: "1",
							strokeLinecap: "round",
							strokeLinejoin: "round"
						}),
						visual === "config" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M5.3 8.2h1.1M9.6 8.2h1.1M5.3 10.7h1.1M9.6 10.7h1.1M7.45 7.4l1.1 4.1",
							stroke: "currentColor",
							strokeWidth: "1",
							strokeLinecap: "round"
						}),
						visual === "document" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M5.2 8h5.6M5.2 10h5.6M5.2 12h3.8",
							stroke: "currentColor",
							strokeWidth: "1",
							strokeLinecap: "round"
						}),
						visual === "image" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							cx: "6",
							cy: "8",
							r: ".8",
							fill: "currentColor"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "m4.8 12 2.1-2.1 1.3 1.2 1.25-1.45L11.2 12",
							stroke: "currentColor",
							strokeWidth: "1",
							strokeLinecap: "round",
							strokeLinejoin: "round"
						})] }),
						visual === "style" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M5.1 8.1h5.8M5.1 10h4.3M5.1 11.9h2.8",
							stroke: "currentColor",
							strokeWidth: "1.2",
							strokeLinecap: "round"
						}),
						visual === "terminal" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "m5.25 8 1.55 1.4-1.55 1.4M8 11h2.7",
							stroke: "currentColor",
							strokeWidth: "1",
							strokeLinecap: "round",
							strokeLinejoin: "round"
						}),
						visual === "data" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M5 7.8h6v4.4H5zM5 9.25h6M7 7.8v4.4M9 7.8v4.4",
							stroke: "currentColor",
							strokeWidth: ".8"
						}),
						visual === "generic" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M5.2 8.2h5.6M5.2 10.2h5.6M5.2 12.2h3.5",
							stroke: "currentColor",
							strokeWidth: "1",
							strokeLinecap: "round"
						})
					]
				})
			});
		}
		var ProjectPanelController = class {
			#target = null;
			#revision = 0;
			#listeners = /* @__PURE__ */ new Set();
			getSnapshot = () => this.#target;
			subscribe = (listener) => {
				this.#listeners.add(listener);
				return () => {
					this.#listeners.delete(listener);
				};
			};
			openReview(target) {
				const current = this.#target;
				const available = new Set(target.files.map((file) => file.path));
				const sameScope = current?.sessionId === target.sessionId && current.cwd === target.cwd;
				const review = {
					...target,
					expandedPaths: [...new Set(target.expandedPaths.filter((path) => available.has(path)))],
					revision: ++this.#revision
				};
				this.#target = {
					sessionId: target.sessionId,
					cwd: target.cwd,
					mode: "review",
					review,
					files: sameScope ? current.files : {
						sessionId: target.sessionId,
						cwd: target.cwd,
						selectedPath: null,
						revision: ++this.#revision
					}
				};
				this.#emit();
			}
			openFiles(target) {
				const current = this.#target;
				const sameScope = current?.sessionId === target.sessionId && current.cwd === target.cwd;
				const selectedPath = target.path === void 0 ? sameScope ? current.files.selectedPath : null : target.path;
				this.#target = {
					sessionId: target.sessionId,
					cwd: target.cwd,
					mode: "files",
					review: sameScope ? current.review : null,
					files: {
						sessionId: target.sessionId,
						cwd: target.cwd,
						selectedPath,
						revision: ++this.#revision
					}
				};
				this.#emit();
			}
			show(mode) {
				if (this.#target === null || mode === "review" && this.#target.review === null || this.#target.mode === mode) return;
				this.#target = {
					...this.#target,
					mode
				};
				this.#emit();
			}
			selectFile(path) {
				if (this.#target === null || !path || path.includes("\0")) return;
				this.#target = {
					...this.#target,
					mode: "files",
					files: {
						...this.#target.files,
						selectedPath: path,
						revision: ++this.#revision
					}
				};
				this.#emit();
			}
			toggleReview(path) {
				const target = this.#target;
				if (target === null || target.review === null || !target.review.files.some((file) => file.path === path)) return;
				const review = target.review;
				const expandedPaths = review.expandedPaths.includes(path) ? review.expandedPaths.filter((candidate) => candidate !== path) : [...review.expandedPaths, path];
				this.#target = {
					...target,
					review: {
						...review,
						expandedPaths
					}
				};
				this.#emit();
			}
			#emit() {
				for (const listener of this.#listeners) listener();
			}
			close() {
				if (this.#target === null) return;
				this.#target = null;
				this.#emit();
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
		function TurnSummaryFileRow({ file, openReview, openFile }) {
			const [highlighted, setHighlighted] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-aezy-turn-file": file.path,
				onPointerEnter: () => setHighlighted(true),
				onPointerLeave: () => setHighlighted(false),
				onFocusCapture: () => setHighlighted(true),
				onBlurCapture: () => setHighlighted(false),
				style: {
					minHeight: 28,
					display: "grid",
					gridTemplateColumns: "16px minmax(0, 1fr) auto 18px",
					alignItems: "center",
					gap: 7,
					margin: "0 -6px",
					padding: "0 6px",
					borderRadius: 6,
					background: highlighted ? palette.interactive : "transparent",
					transition: "background 120ms ease"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileTypeIcon, { path: file.path }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						title: `${file.path} · Review changes`,
						onClick: openReview,
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
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffStats, {
						additions: file.additions,
						deletions: file.deletions
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": `Open ${file.path} preview`,
						title: "Open file preview",
						disabled: file.afterFingerprint === null,
						onClick: openFile,
						style: {
							width: 18,
							height: 18,
							padding: 0,
							border: 0,
							borderRadius: 4,
							background: "transparent",
							color: file.afterFingerprint === null ? palette.muted : palette.accent,
							cursor: file.afterFingerprint === null ? "not-allowed" : "pointer",
							fontSize: 12,
							lineHeight: "18px"
						},
						children: "↗"
					})
				]
			});
		}
		function TurnChangedFiles({ matched, cwd, sessionId, openReview, openFiles }) {
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
			const canUndo = summary.files.length > 0 && !summary.partial && !summary.concurrent && summary.files.every((file) => file.revertable);
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
					expandedPaths: [path],
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ChangeSurface, {
				className: "aezy-turn-changes",
				"data-aezy-turn-files": summary.turn,
				style: {
					position: "relative",
					marginTop: 16,
					maxWidth: 720
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						"data-aezy-turn-banner": true,
						style: {
							...changeBannerStyle,
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 12,
							padding: "9px 14px",
							borderRadius: "12px 12px 0 0"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
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
							children: summary.files.length > 0 ? `Edited ${summary.files.length} ${summary.files.length === 1 ? "file" : "files"}` : "File changes partially observed"
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
								title: summary.partial ? "Undo is disabled because this Turn was only partially observed" : summary.concurrent ? "Batch Undo is disabled because another Session overlapped this Turn" : canUndo ? receiptId === null ? "Restore every file to its state before this Turn" : "Reapply the files changed by this Turn" : "At least one file cannot be restored safely",
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
								disabled: summary.files.length === 0,
								onClick: () => openTurnReview(),
								style: {
									border: 0,
									padding: 0,
									margin: 0,
									background: "transparent",
									color: summary.files.length > 0 ? "inherit" : "var(--dsw-alias-label-tertiary)",
									cursor: summary.files.length > 0 ? "pointer" : "not-allowed",
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
						children: summary.files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TurnSummaryFileRow, {
							file,
							openReview: () => openTurnReview(file.path),
							openFile: () => openFiles({
								cwd,
								sessionId,
								path: file.path
							})
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
							summary.partial && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								title: summary.unobservedTools.length > 0 ? `Potentially unobserved tools: ${summary.unobservedTools.join(", ")}` : "The structured file journal could not prove complete coverage",
								style: { color: palette.warning },
								children: "· partially observed"
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
		function StructuredPart({ part }) {
			const [rawOpen, setRawOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"data-aezy-diff-part": part.scope,
				children: [
					part.scope !== "turn" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							padding: "5px 10px",
							borderBottom: `1px solid ${palette.border}`,
							background: palette.elevated,
							color: palette.muted,
							fontSize: 10,
							fontWeight: 600,
							letterSpacing: ".04em",
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
					part.state === "structured" && part.hunks.map((hunk, hunkIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", { children: [hunkIndex > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						"aria-hidden": "true",
						title: hunk.header,
						style: {
							height: 18,
							display: "flex",
							alignItems: "center",
							gap: 7,
							color: palette.muted
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
								flex: 1,
								borderTop: `1px dotted ${palette.border}`
							} }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontFamily: "var(--ds-font-family-code, monospace)",
									fontSize: 10
								},
								children: "···"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
								flex: 1,
								borderTop: `1px dotted ${palette.border}`
							} })
						]
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
		function ReviewFileCard({ panel, target, file, expanded }) {
			const [document, setDocument] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const generation = (0, react.useRef)(0);
			const revision = target.revision;
			(0, react.useEffect)(() => {
				if (!expanded) {
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
					path: file.path
				} : {
					cwd: target.cwd,
					path: file.path
				}, controller.signal).then((value) => {
					const active = panel.getSnapshot()?.review;
					if (requestGeneration !== generation.current || active?.revision !== revision || !active.expandedPaths.includes(file.path)) return;
					if (value.file.path !== file.path || value.source.kind !== target.source) throw new Error("Review response identity does not match the expanded file.");
					setDocument(value);
				}).catch((reason) => {
					const active = panel.getSnapshot()?.review;
					if (controller.signal.aborted || requestGeneration !== generation.current || active?.revision !== revision || !active.expandedPaths.includes(file.path)) return;
					setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					controller.abort();
				};
			}, [
				expanded,
				file.path,
				panel,
				revision,
				target.cwd,
				target.sessionId,
				target.source,
				target.turn
			]);
			const status = document?.file.status ?? file.status;
			const binary = document?.file.binary ?? file.binary;
			const truncated = document?.file.truncated ?? file.truncated;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ChangeSurface, {
				className: "aezy-review-file",
				"data-aezy-review-file": file.path,
				style: {
					marginBottom: 8,
					overflow: "visible"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => panel.toggleReview(file.path),
					"aria-expanded": expanded,
					title: `${file.path}${status === void 0 ? "" : ` · ${status}`}`,
					style: {
						...changeBannerStyle,
						position: expanded ? "sticky" : void 0,
						top: expanded ? 0 : void 0,
						zIndex: expanded ? 3 : void 0,
						width: "100%",
						minHeight: 32,
						display: "grid",
						gridTemplateColumns: "16px minmax(0, 1fr) auto 12px",
						alignItems: "center",
						gap: 7,
						padding: "5px 9px",
						border: 0,
						borderRadius: expanded ? "12px 12px 0 0" : 12,
						color: expanded ? palette.accent : palette.text,
						cursor: "pointer",
						textAlign: "left"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileTypeIcon, { path: file.path }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								minWidth: 0,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
								fontFamily: "var(--ds-font-family-code, monospace)",
								fontSize: 11
							},
							children: [file.oldPath && file.oldPath !== file.path ? `${file.oldPath} → ` : "", file.path]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								display: "inline-flex",
								alignItems: "center",
								gap: 6,
								fontSize: 9.5,
								color: palette.muted
							},
							children: [
								status !== void 0 && status !== "modified" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									title: status,
									children: status
								}),
								binary && status !== "binary" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "binary" }),
								truncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { color: palette.warning },
									children: "truncated"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffStats, {
									additions: document?.file.additions ?? file.additions ?? null,
									deletions: document?.file.deletions ?? file.deletions ?? null
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": true,
							style: {
								color: palette.muted,
								fontSize: 9,
								transform: expanded ? "rotate(90deg)" : void 0,
								transition: "transform 120ms ease"
							},
							children: "▶"
						})
					]
				}), expanded && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					"data-aezy-expanded-file": file.path,
					"data-aezy-review-request": file.path,
					style: {
						overflowX: "auto",
						borderRadius: "0 0 12px 12px",
						background: "var(--dsw-alias-markdown-code-block)"
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
			});
		}
		function FolderIcon({ open }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"aria-hidden": true,
				style: {
					width: 16,
					height: 16,
					display: "inline-flex",
					color: open ? palette.accent : palette.warning
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					viewBox: "0 0 16 16",
					width: "16",
					height: "16",
					fill: "none",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M1.75 3.5h4.4l1.2 1.35h6.9v7.65H1.75z",
						stroke: "currentColor",
						strokeWidth: "1.2",
						strokeLinejoin: "round"
					}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M2.1 6.35h11.55l-1.15 6.1H1.75z",
						fill: "var(--dsw-alias-bg-base)",
						stroke: "currentColor",
						strokeWidth: "1.2",
						strokeLinejoin: "round"
					})]
				})
			});
		}
		function parentDirectories(path) {
			if (path === null) return [];
			const parts = path.split("/").filter(Boolean);
			const parents = [];
			for (let index = 1; index < parts.length; index += 1) parents.push(parts.slice(0, index).join("/"));
			return parents;
		}
		function DirectoryBranch({ panel, target, directory, depth, expanded, toggle }) {
			const [document, setDocument] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const open = directory === "" || expanded.has(directory);
			(0, react.useEffect)(() => {
				if (!open) {
					setDocument(null);
					setError(null);
					return;
				}
				const controller = new AbortController();
				setDocument(null);
				setError(null);
				request("/aezy/api/project/tree", {
					cwd: target.cwd,
					path: directory
				}, controller.signal).then((value) => {
					const active = panel.getSnapshot();
					if (controller.signal.aborted || active?.sessionId !== target.sessionId || active.cwd !== target.cwd) return;
					if (value.directory !== directory) throw new Error("Directory response identity does not match the requested path.");
					setDocument(value);
				}).catch((reason) => {
					if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					controller.abort();
				};
			}, [
				directory,
				open,
				panel,
				target.cwd,
				target.sessionId
			]);
			if (!open) return null;
			if (error !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "alert",
				style: {
					padding: `5px 8px 5px ${10 + depth * 16}px`,
					color: palette.error,
					fontSize: 11
				},
				children: error
			});
			if (document === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					padding: `5px 8px 5px ${10 + depth * 16}px`,
					color: palette.muted,
					fontSize: 11
				},
				children: "Loading…"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				document.entries.map((entry) => {
					const directoryEntry = entry.kind === "directory";
					const entryOpen = directoryEntry && expanded.has(entry.path);
					const supported = directoryEntry || entry.kind === "file";
					const selected = target.files.selectedPath === entry.path;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						role: "treeitem",
						"aria-level": depth + 1,
						"aria-expanded": directoryEntry ? entryOpen : void 0,
						disabled: !supported,
						title: entry.kind === "symlink" ? `${entry.path} · symbolic links are not previewed` : entry.path,
						onClick: () => {
							if (directoryEntry) toggle(entry.path);
							else if (entry.kind === "file") panel.selectFile(entry.path);
						},
						style: {
							boxSizing: "border-box",
							width: "100%",
							minHeight: 26,
							display: "grid",
							gridTemplateColumns: "12px 16px minmax(0, 1fr)",
							alignItems: "center",
							gap: 5,
							padding: `3px 8px 3px ${8 + depth * 16}px`,
							border: 0,
							borderRadius: 5,
							background: selected ? palette.interactive : "transparent",
							color: supported ? palette.text : palette.muted,
							cursor: supported ? "pointer" : "not-allowed",
							textAlign: "left"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": true,
								style: {
									color: palette.muted,
									fontSize: 8,
									transform: entryOpen ? "rotate(90deg)" : void 0,
									visibility: directoryEntry ? "visible" : "hidden"
								},
								children: "▶"
							}),
							directoryEntry ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderIcon, { open: entryOpen }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileTypeIcon, { path: entry.path }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									minWidth: 0,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									fontFamily: "var(--ds-font-family-code, monospace)",
									fontSize: 11
								},
								children: entry.name
							})
						]
					}), directoryEntry && entryOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DirectoryBranch, {
						panel,
						target,
						directory: entry.path,
						depth: depth + 1,
						expanded,
						toggle
					})] }, entry.path);
				}),
				document.entries.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						padding: `5px 8px 5px ${10 + depth * 16}px`,
						color: palette.muted,
						fontSize: 11
					},
					children: "Empty directory"
				}),
				document.truncated && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						padding: `5px 8px 5px ${10 + depth * 16}px`,
						color: palette.warning,
						fontSize: 11
					},
					children: [
						"Showing ",
						document.entries.length,
						" of ",
						document.totalEntries,
						" entries."
					]
				})
			] });
		}
		function FilePreview({ panel, target }) {
			const path = target.files.selectedPath;
			const revision = target.files.revision;
			const [document, setDocument] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (path === null) {
					setDocument(null);
					setError(null);
					return;
				}
				const controller = new AbortController();
				setDocument(null);
				setError(null);
				request("/aezy/api/project/preview", {
					cwd: target.cwd,
					path
				}, controller.signal).then((value) => {
					const active = panel.getSnapshot();
					if (controller.signal.aborted || active?.mode !== "files" || active.sessionId !== target.sessionId || active.cwd !== target.cwd || active.files.revision !== revision || active.files.selectedPath !== path) return;
					if (value.path !== path) throw new Error("Preview response identity does not match the selected file.");
					setDocument(value);
				}).catch((reason) => {
					if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason));
				});
				return () => {
					controller.abort();
				};
			}, [
				panel,
				path,
				revision,
				target.cwd,
				target.sessionId
			]);
			if (path === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					display: "grid",
					minHeight: 160,
					placeItems: "center",
					padding: 24,
					color: palette.muted,
					textAlign: "center"
				},
				children: "Select a file from the workspace tree."
			});
			if (error !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				role: "alert",
				style: {
					margin: 12,
					padding: 12,
					border: `1px solid ${palette.error}`,
					borderRadius: 8,
					color: palette.error
				},
				children: ["Preview unavailable: ", error]
			});
			if (document === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					display: "grid",
					minHeight: 160,
					placeItems: "center",
					padding: 24,
					color: palette.muted
				},
				children: "Loading preview…"
			});
			const lines = (document.lines ?? []).map((text, index) => ({
				number: index + 1,
				text
			}));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-aezy-file-preview": document.path,
				"data-preview-kind": document.kind,
				style: {
					minWidth: 0,
					padding: 10
				},
				children: [
					document.truncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							marginBottom: 10,
							padding: 9,
							border: `1px solid ${palette.warning}`,
							borderRadius: 7,
							color: palette.warning,
							fontSize: 11
						},
						children: document.message ?? "Preview output was safely bounded."
					}),
					document.kind === "code" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.ReadBlock, {
						label: document.path,
						lines,
						totalLines: document.totalLines ?? Math.max(lines.length + 1, 1),
						lang: document.language ?? void 0,
						maxLines: 120
					}),
					document.kind === "markdown" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ChangeSurface, {
						className: "aezy-markdown-preview",
						style: { overflow: "visible" },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...changeBannerStyle,
								padding: "8px 11px",
								borderRadius: "12px 12px 0 0",
								fontFamily: "var(--ds-font-family-code, monospace)",
								fontSize: 11
							},
							children: document.path
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							"data-aezy-markdown-preview": true,
							style: {
								padding: "2px 14px 14px",
								overflowWrap: "anywhere"
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { text: document.content ?? "" })
						})]
					}),
					document.kind === "image" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ChangeSurface, {
						className: "aezy-image-preview",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...changeBannerStyle,
								padding: "8px 11px",
								fontFamily: "var(--ds-font-family-code, monospace)",
								fontSize: 11
							},
							children: document.path
						}), document.dataUrl === null || document.dataUrl === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								padding: 28,
								color: palette.muted,
								textAlign: "center"
							},
							children: document.message ?? "Image preview is unavailable."
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "grid",
								minHeight: 180,
								placeItems: "center",
								padding: 12,
								backgroundImage: "linear-gradient(45deg, rgba(127,127,127,.08) 25%, transparent 25%), linear-gradient(-45deg, rgba(127,127,127,.08) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(127,127,127,.08) 75%), linear-gradient(-45deg, transparent 75%, rgba(127,127,127,.08) 75%)",
								backgroundSize: "16px 16px",
								backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0"
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								src: document.dataUrl,
								alt: document.name,
								style: {
									display: "block",
									maxWidth: "100%",
									maxHeight: "65vh",
									objectFit: "contain"
								}
							})
						})]
					}),
					document.kind === "binary" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							padding: 30,
							border: `1px solid ${palette.border}`,
							borderRadius: 10,
							color: palette.muted,
							textAlign: "center"
						},
						children: document.message ?? "Binary preview is unavailable."
					})
				]
			});
		}
		function FilesPanel({ panel, target }) {
			const [expanded, setExpanded] = (0, react.useState)(() => new Set(parentDirectories(target.files.selectedPath)));
			(0, react.useEffect)(() => {
				setExpanded((current) => /* @__PURE__ */ new Set([...current, ...parentDirectories(target.files.selectedPath)]));
			}, [target.files.revision, target.files.selectedPath]);
			(0, react.useEffect)(() => {
				setExpanded(new Set(parentDirectories(target.files.selectedPath)));
			}, [target.cwd, target.sessionId]);
			const toggle = (0, react.useCallback)((path) => {
				setExpanded((current) => {
					const next = new Set(current);
					if (next.has(path)) next.delete(path);
					else next.add(path);
					return next;
				});
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-aezy-files-panel": true,
				style: {
					flex: "1 1 auto",
					minHeight: 0,
					display: "flex",
					flexDirection: "column"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
					"aria-label": "Workspace file tree",
					style: {
						flex: "0 1 38%",
						minHeight: 112,
						maxHeight: 320,
						overflow: "auto",
						padding: "7px 6px 9px",
						borderBottom: `1px solid ${palette.border}`
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: "tree",
						"aria-label": "Files",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DirectoryBranch, {
							panel,
							target,
							directory: "",
							depth: 0,
							expanded,
							toggle
						})
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
					"aria-label": "File preview",
					style: {
						flex: "1 1 62%",
						minHeight: 0,
						overflow: "auto",
						background: palette.panel
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FilePreview, {
						panel,
						target
					})
				})]
			});
		}
		function ProjectPanel({ panel: controller, surface, closePanel, syncLayout, useSessions }) {
			const target = (0, react.useSyncExternalStore)(controller.subscribe, controller.getSnapshot);
			const currentSession = useSessions((state) => state.current);
			const currentCwd = useSessions((state) => state.current === void 0 ? void 0 : state.byId[state.current]?.cwd);
			const [viewport, setViewport] = (0, react.useState)(() => window.innerWidth);
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
				if (target !== null && !matchesSession) closePanel();
			}, [
				closePanel,
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
				if (!visible) return;
				const onKey = (event) => {
					if (event.key === "Escape") closePanel();
				};
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [closePanel, visible]);
			if (!visible || target === null) return null;
			const review = target.review;
			const content = target.mode === "review" && review !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
				"aria-label": "Changed file navigation",
				style: {
					flex: "1 1 auto",
					minHeight: 0,
					overflow: "auto",
					padding: 10
				},
				children: review.files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ReviewFileCard, {
					panel: controller,
					target: review,
					file,
					expanded: review.expandedPaths.includes(file.path)
				}, file.path))
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FilesPanel, {
				panel: controller,
				target
			});
			const panel = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				"aria-label": "Project panel",
				style: {
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
					background: palette.panel,
					color: palette.text
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					style: {
						flex: "0 0 auto",
						padding: "12px 14px 10px",
						borderBottom: `1px solid ${palette.border}`,
						background: palette.panel
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
								children: target.mode === "review" ? "Review changes" : "Files & preview"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								title: target.cwd,
								style: {
									display: "block",
									maxWidth: 280,
									marginTop: 3,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									color: palette.muted,
									fontFamily: "var(--ds-font-family-code, monospace)",
									fontSize: 10.5
								},
								children: target.cwd
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Close Project panel",
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
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: "tablist",
						"aria-label": "Project panel views",
						style: {
							display: "flex",
							alignItems: "center",
							gap: 5,
							marginTop: 9
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "tab",
								"aria-selected": target.mode === "review",
								disabled: review === null,
								onClick: () => controller.show("review"),
								style: {
									padding: "3px 8px",
									border: 0,
									borderRadius: 6,
									background: target.mode === "review" ? palette.interactive : "transparent",
									color: review === null ? palette.muted : target.mode === "review" ? palette.accent : palette.text,
									cursor: review === null ? "not-allowed" : "pointer",
									fontSize: 11
								},
								children: "Review"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "tab",
								"aria-selected": target.mode === "files",
								onClick: () => controller.show("files"),
								style: {
									padding: "3px 8px",
									border: 0,
									borderRadius: 6,
									background: target.mode === "files" ? palette.interactive : "transparent",
									color: target.mode === "files" ? palette.accent : palette.text,
									cursor: "pointer",
									fontSize: 11
								},
								children: "Files"
							}),
							target.mode === "review" && review !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									marginLeft: 3,
									padding: "2px 7px",
									borderRadius: 999,
									background: palette.interactive,
									color: review.source === "turn" ? palette.accent : palette.warning,
									fontSize: 10,
									fontWeight: 600
								},
								children: review.source === "turn" ? `Historical · Turn ${review.turn}` : "Current · Working changes"
							})
						]
					})]
				}), content]
			});
			return surface === "overlay" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-aezy-project-panel": true,
				"data-aezy-review-panel": target.mode === "review" ? "" : void 0,
				"data-surface": "overlay",
				"data-mode": target.mode,
				style: {
					position: "absolute",
					inset: 0,
					background: "var(--dsw-alias-bg-overlay, rgba(0,0,0,.36))"
				},
				children: panel
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-aezy-project-panel": true,
				"data-aezy-review-panel": target.mode === "review" ? "" : void 0,
				"data-surface": "details",
				"data-mode": target.mode,
				style: {
					width: "100%",
					height: "100%"
				},
				children: panel
			});
		}
		function ChangesView({ cwd, sessionId, openReview, openFiles }) {
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
				if (project.repository.available === false) return "No Git repository";
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
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 7
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => openFiles({
									cwd,
									sessionId
								}),
								style: {
									padding: "6px 10px",
									borderRadius: 6,
									border: `1px solid ${palette.border}`,
									background: palette.button,
									color: palette.text,
									cursor: "pointer"
								},
								children: "Browse files"
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
					project?.repository.available === false && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							padding: "44px 0",
							textAlign: "center",
							color: palette.muted
						},
						children: "Git working changes are unavailable. Structured Turn file changes are still recorded."
					}),
					project?.repository.available !== false && project?.repository.clean === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
							children: project.files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									width: "100%",
									display: "grid",
									gridTemplateColumns: "30px minmax(0, 1fr) 22px auto",
									alignItems: "center",
									gap: 8,
									padding: "9px 10px",
									boxSizing: "border-box",
									borderBottom: `1px solid ${palette.border}`,
									background: selected === file.path ? palette.interactive : "transparent",
									color: palette.text
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
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										title: `${file.path} · Review working changes`,
										onClick: () => {
											setSelected(file.path);
											openReview({
												source: "working",
												cwd,
												sessionId,
												expandedPaths: [file.path],
												files: project.files.map((item) => ({
													path: item.path,
													oldPath: item.originalPath ?? null
												}))
											});
										},
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
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": `Open ${file.path} preview`,
										title: "Open file preview",
										onClick: () => openFiles({
											cwd,
											sessionId,
											path: file.path
										}),
										style: {
											width: 22,
											height: 22,
											padding: 0,
											border: 0,
											borderRadius: 5,
											background: "transparent",
											color: palette.accent,
											cursor: "pointer"
										},
										children: "↗"
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
		function handoffChangedFiles(handoff) {
			const files = /* @__PURE__ */ new Map();
			for (const file of handoff.git.committedFiles) files.set(file.path, {
				path: file.path,
				label: `committed · ${file.status}`,
				previousPath: file.previousPath
			});
			for (const file of handoff.git.workingFiles) {
				const label = `working · ${file.conflict ? "conflict" : `${file.indexStatus}${file.worktreeStatus}`}`;
				const previous = files.get(file.path);
				files.set(file.path, {
					path: file.path,
					label: previous === void 0 ? label : `${previous.label} · ${label}`,
					previousPath: previous?.previousPath
				});
			}
			return [...files.values()].sort((left, right) => left.path.localeCompare(right.path));
		}
		function WorktreesView({ cwd, sessionId, openFiles, openWorktree, returnToLocal }) {
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
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexWrap: "wrap",
									gap: 8,
									marginTop: 9,
									color: palette.muted,
									fontSize: 11
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: handoff.git.branch }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["base ", shortCommit(handoff.git.base)] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["head ", shortCommit(handoff.git.head)] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: handoff.git.clean ? "clean" : "working changes" })
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									marginTop: 10,
									padding: 10,
									border: `1px solid ${palette.border}`,
									borderRadius: 7,
									background: palette.elevated,
									color: palette.text,
									whiteSpace: "pre-wrap",
									fontSize: 12
								},
								children: handoff.instructions
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ChangeSurface, {
								className: "aezy-handoff-files",
								style: { marginTop: 10 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										...changeBannerStyle,
										padding: "8px 11px",
										fontWeight: 600
									},
									children: "Changed files"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: { padding: "7px 8px" },
									children: [handoffChangedFiles(handoff).map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => openFiles({
											cwd,
											sessionId,
											path: file.path
										}),
										title: `Preview ${file.path} in the current Session workspace`,
										style: {
											width: "100%",
											minHeight: 28,
											display: "grid",
											gridTemplateColumns: "16px minmax(0, 1fr) auto",
											alignItems: "center",
											gap: 7,
											padding: "3px 5px",
											border: 0,
											borderRadius: 5,
											background: "transparent",
											color: palette.text,
											cursor: "pointer",
											textAlign: "left"
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileTypeIcon, { path: file.path }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: {
													minWidth: 0,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
													fontFamily: "var(--ds-font-family-code, monospace)",
													fontSize: 11
												},
												children: [file.previousPath !== void 0 ? `${file.previousPath} → ` : "", file.path]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: {
													color: palette.muted,
													fontSize: 10
												},
												children: [file.label, " · ↗"]
											})
										]
									}, file.path)), handoffChangedFiles(handoff).length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											padding: 8,
											color: palette.muted,
											fontSize: 11
										},
										children: "No changed files recorded."
									})]
								})]
							}),
							handoff.validations.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									marginTop: 10,
									color: palette.muted,
									fontSize: 11
								},
								children: handoff.validations.map((validation, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
									validation.status,
									" · ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: validation.command }),
									validation.summary ? ` · ${validation.summary}` : ""
								] }, `${validation.command}-${index}`))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
								style: { marginTop: 10 },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
									style: {
										color: palette.muted,
										cursor: "pointer",
										fontSize: 11
									},
									children: "Raw handoff JSON"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
									style: {
										margin: "8px 0 0",
										padding: 12,
										maxHeight: 320,
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
			const panel = new ProjectPanelController();
			const closePanel = () => {
				panel.close();
				ctx.layout.closeDetails();
			};
			const syncLayout = (narrow) => {
				if (narrow) ctx.layout.closeDetails();
				else ctx.layout.openDetails();
			};
			const openReview = (target) => {
				panel.openReview(target);
				syncLayout(window.innerWidth < 760);
			};
			const openFiles = (target) => {
				panel.openFiles(target);
				syncLayout(window.innerWidth < 760);
			};
			ctx.slots.inject("details", () => ctx.slots.register({
				name: "details",
				priority: -10,
				inject: () => ({
					panel,
					surface: "details",
					closePanel,
					syncLayout
				})
			}, ProjectPanel));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "aezy-project",
				order: 100,
				inject: () => ({
					panel,
					surface: "overlay",
					closePanel,
					syncLayout
				})
			}, ProjectPanel));
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
						openReview,
						openFiles
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
						openReview,
						openFiles
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
						sessionId,
						openFiles
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