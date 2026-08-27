window.__ModuleLoader__.load({
	id: "@aezy/codex",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/index.tsx
		const ROUTE = "/aezy/api/codex";
		const palette = {
			text: "var(--dsw-alias-label-primary, #202124)",
			muted: "var(--dsw-alias-label-secondary, #737780)",
			surface: "var(--dsw-alias-bg-module-platform, #f7f7f8)",
			border: "var(--dsw-alias-border-subtle, rgba(127,127,127,.22))",
			accent: "var(--dsw-alias-state-info-primary, #4f6bed)",
			danger: "var(--dsw-alias-state-error-primary, #c73535)"
		};
		const buttonStyle = {
			minHeight: 34,
			padding: "0 12px",
			border: `1px solid ${palette.border}`,
			borderRadius: 8,
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
			if (!response.ok) throw new Error(value.error ?? `Codex account request failed (${response.status})`);
			return value;
		}
		function percent(window) {
			if (typeof window?.usedPercent === "number") return `${Math.round(window.usedPercent)}% used`;
			if (typeof window?.remainingPercent === "number") return `${Math.round(window.remainingPercent)}% remaining`;
			return "Unavailable";
		}
		function resetLabel(window) {
			if (typeof window?.resetsAt !== "number") return null;
			return (/* @__PURE__ */ new Date(window.resetsAt * 1e3)).toLocaleString();
		}
		function numberLabel(value) {
			return typeof value === "number" ? new Intl.NumberFormat().format(value) : "Unavailable";
		}
		function safeExternalUrl(value) {
			if (value === void 0) return null;
			try {
				const url = new URL(value);
				return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
			} catch {
				return null;
			}
		}
		function CodexSettingsSection(_props) {
			const [snapshot, setSnapshot] = (0, react.useState)(null);
			const [pending, setPending] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const refresh = (0, react.useCallback)(async () => {
				try {
					const next = await requestJson(ROUTE);
					setSnapshot(next);
					setError(next.error);
					if (next.account?.type === "chatgpt") setPending(null);
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				}
			}, []);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			(0, react.useEffect)(() => {
				if (pending === null) return;
				const interval = window.setInterval(() => {
					refresh();
				}, 3e3);
				return () => window.clearInterval(interval);
			}, [pending, refresh]);
			const startLogin = async (mode) => {
				setBusy(mode);
				setError(null);
				try {
					const login = await requestJson(`${ROUTE}/login/start`, {
						method: "POST",
						body: JSON.stringify({ mode })
					});
					setPending(login);
					const href = safeExternalUrl(login.authUrl ?? login.verificationUrl);
					if (href !== null) window.open(href, "_blank", "noopener,noreferrer");
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setBusy(null);
				}
			};
			const cancelLogin = async () => {
				if (pending === null) return;
				setBusy("cancel");
				setError(null);
				try {
					await requestJson(`${ROUTE}/login/cancel`, {
						method: "POST",
						body: JSON.stringify({ loginId: pending.loginId })
					});
					setPending(null);
					await refresh();
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setBusy(null);
				}
			};
			const logout = async () => {
				if (!window.confirm("Sign out of the shared Codex account on this machine?")) return;
				setBusy("logout");
				setError(null);
				try {
					await requestJson(`${ROUTE}/logout`, {
						method: "POST",
						body: "{}"
					});
					setPending(null);
					await refresh();
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setBusy(null);
				}
			};
			const account = snapshot?.account;
			const summary = snapshot?.usage?.summary ?? null;
			const externalHref = safeExternalUrl(pending?.authUrl ?? pending?.verificationUrl);
			const connected = snapshot?.connection.state === "connected";
			const primaryReset = resetLabel(snapshot?.rateLimits?.primary);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"data-aezy-codex-settings": true,
				style: {
					color: palette.text,
					maxWidth: 760,
					paddingBottom: 32
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: { marginBottom: 22 },
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						style: {
							fontSize: 20,
							margin: "0 0 6px"
						},
						children: "Codex account"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							color: palette.muted,
							margin: 0,
							lineHeight: 1.55
						},
						children: "Aezy uses the official Codex App Server and your machine's shared ChatGPT sign-in. Authentication opens in your external browser; Aezy never asks for or displays an OAuth token."
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "grid",
						gap: 12
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								padding: 16,
								border: `1px solid ${palette.border}`,
								borderRadius: 10,
								background: palette.surface
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									justifyContent: "space-between",
									gap: 16,
									alignItems: "center",
									flexWrap: "wrap"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: { fontWeight: 650 },
									children: "Connection"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										color: connected ? palette.accent : palette.muted,
										marginTop: 4
									},
									children: [snapshot?.connection.state ?? "Loading", account?.type === "chatgpt" ? ` · ChatGPT ${account.planType ?? "plan"}` : ""]
								})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy !== null,
									onClick: () => {
										refresh();
									},
									style: buttonStyle,
									children: "Refresh"
								})]
							})
						}),
						account?.type !== "chatgpt" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								padding: 16,
								border: `1px solid ${palette.border}`,
								borderRadius: 10
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontWeight: 650,
										marginBottom: 6
									},
									children: "Sign in with ChatGPT"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									style: {
										color: palette.muted,
										margin: "0 0 12px",
										lineHeight: 1.5
									},
									children: "Browser login is recommended. Device login is available when the browser callback cannot reach this machine."
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: 8,
										flexWrap: "wrap"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: !connected || busy !== null,
										onClick: () => {
											startLogin("browser");
										},
										style: buttonStyle,
										children: busy === "browser" ? "Starting…" : "Open browser login"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: !connected || busy !== null,
										onClick: () => {
											startLogin("device");
										},
										style: buttonStyle,
										children: busy === "device" ? "Starting…" : "Use device code"
									})]
								})
							]
						}),
						pending !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							role: "status",
							style: {
								padding: 16,
								border: `1px solid ${palette.border}`,
								borderRadius: 10
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: { fontWeight: 650 },
									children: "Waiting for browser sign-in"
								}),
								pending.userCode !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									style: {
										margin: "10px 0",
										color: palette.text
									},
									children: ["Device code: ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										style: {
											fontWeight: 700,
											letterSpacing: ".08em"
										},
										children: pending.userCode
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										gap: 8,
										flexWrap: "wrap",
										marginTop: 12
									},
									children: [externalHref !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										href: externalHref,
										target: "_blank",
										rel: "noreferrer",
										style: {
											...buttonStyle,
											display: "inline-flex",
											alignItems: "center",
											textDecoration: "none"
										},
										children: "Continue in external browser"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: busy !== null,
										onClick: () => {
											cancelLogin();
										},
										style: buttonStyle,
										children: "Cancel login"
									})]
								})
							]
						}),
						account?.type === "chatgpt" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									padding: 16,
									border: `1px solid ${palette.border}`,
									borderRadius: 10
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontWeight: 650,
										marginBottom: 10
									},
									children: "Plan and limits"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
									style: {
										display: "grid",
										gridTemplateColumns: "minmax(130px, 1fr) 2fr",
										gap: "8px 16px",
										margin: 0
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", {
											style: { color: palette.muted },
											children: "Plan"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											style: { margin: 0 },
											children: account.planType ?? "Unknown"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", {
											style: { color: palette.muted },
											children: "Primary window"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											style: { margin: 0 },
											children: percent(snapshot?.rateLimits?.primary)
										}),
										primaryReset !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", {
											style: { color: palette.muted },
											children: "Resets"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											style: { margin: 0 },
											children: primaryReset
										})] }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", {
											style: { color: palette.muted },
											children: "Lifetime tokens"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											style: { margin: 0 },
											children: numberLabel(summary?.lifetimeTokens)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", {
											style: { color: palette.muted },
											children: "Recent usage days"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
											style: { margin: 0 },
											children: snapshot?.usage?.dailyBucketCount ?? "Unavailable"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									padding: 16,
									border: `1px solid ${palette.border}`,
									borderRadius: 10
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontWeight: 650,
										marginBottom: 8
									},
									children: "Available models"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										color: palette.muted,
										lineHeight: 1.7
									},
									children: snapshot?.models.map((model) => `${model.displayName}${model.isDefault ? " (default)" : ""}`).join(" · ") || "Unavailable"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy !== null,
								onClick: () => {
									logout();
								},
								style: {
									...buttonStyle,
									color: palette.danger
								},
								children: busy === "logout" ? "Signing out…" : "Sign out on this machine"
							}) })
						] }),
						error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "alert",
							style: {
								color: palette.danger,
								margin: 0
							},
							children: error
						})
					]
				})]
			});
		}
		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "aezy-codex",
				order: 12,
				label: "Codex"
			}, CodexSettingsSection));
		}
		//#endregion
		exports.CodexSettingsSection = CodexSettingsSection;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map