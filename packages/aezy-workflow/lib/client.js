window.__ModuleLoader__.load({
	id: "@aezy/workflow",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/index.tsx
		const ROUTE = "/aezy/api/workflows";
		const colors = {
			text: "var(--dsw-alias-label-primary,#202124)",
			muted: "var(--dsw-alias-label-secondary,#737780)",
			surface: "var(--dsw-alias-bg-module-platform,#f7f7f8)",
			border: "var(--dsw-alias-border-subtle,rgba(127,127,127,.22))",
			accent: "var(--dsw-alias-state-info-primary,#4f6bed)",
			danger: "var(--dsw-alias-state-error-primary,#c73535)"
		};
		const field = {
			minHeight: 34,
			border: `1px solid ${colors.border}`,
			borderRadius: 8,
			padding: "0 9px",
			color: colors.text,
			background: "transparent"
		};
		const button = {
			...field,
			cursor: "pointer",
			background: colors.surface,
			padding: "0 12px"
		};
		async function request(path, init = {}) {
			const headers = new Headers(init.headers);
			headers.set("x-aezy-client", "web");
			if (init.body !== void 0) headers.set("content-type", "application/json");
			const response = await fetch(path, {
				...init,
				headers
			});
			const value = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(value.error ?? `Workflow request failed (${response.status})`);
			return value;
		}
		function draftFor(template) {
			return {
				id: `my-${template.id}`,
				name: `My ${template.name}`,
				description: template.description,
				budgets: { ...template.budgets }
			};
		}
		function WorkflowSettingsSection(_props) {
			const [snapshot, setSnapshot] = (0, react.useState)(null);
			const [templateId, setTemplateId] = (0, react.useState)("");
			const [draft, setDraft] = (0, react.useState)(null);
			const [preview, setPreview] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const template = (0, react.useMemo)(() => snapshot?.templates.find((item) => item.id === templateId) ?? null, [snapshot, templateId]);
			const refresh = (0, react.useCallback)(async () => {
				try {
					const next = await request(ROUTE);
					setSnapshot(next);
					if (templateId === "" && next.templates[0] !== void 0) {
						setTemplateId(next.templates[0].id);
						setDraft(draftFor(next.templates[0]));
					}
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				}
			}, [templateId]);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			const changeTemplate = (id) => {
				const next = snapshot?.templates.find((item) => item.id === id);
				if (next === void 0) return;
				setTemplateId(id);
				setDraft(draftFor(next));
				setPreview(null);
				setError(null);
			};
			const previewDraft = async () => {
				if (draft === null) return;
				setBusy(true);
				setError(null);
				try {
					setPreview(await request(`${ROUTE}/preview`, {
						method: "POST",
						body: JSON.stringify({
							templateId,
							draft
						})
					}));
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setBusy(false);
				}
			};
			const publish = async () => {
				if (draft === null || preview === null) return;
				setBusy(true);
				setError(null);
				try {
					await request(`${ROUTE}/publish`, {
						method: "POST",
						body: JSON.stringify({
							templateId,
							draft,
							expectedRevision: preview.expectedRevision
						})
					});
					setPreview(null);
					await refresh();
				} catch (reason) {
					setError(reason instanceof Error ? reason.message : String(reason));
				} finally {
					setBusy(false);
				}
			};
			const setBudget = (key, value) => setDraft((current) => current === null ? null : {
				...current,
				budgets: {
					...current.budgets,
					[key]: Number(value)
				}
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"data-aezy-workflow-editor": true,
				style: {
					maxWidth: 820,
					color: colors.text,
					paddingBottom: 36
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						style: {
							margin: "0 0 6px",
							fontSize: 20
						},
						children: "Agent workflows"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							margin: "0 0 18px",
							color: colors.muted,
							lineHeight: 1.55
						},
						children: "Create immutable macro definitions from built-in templates. Publishing does not run a workflow or create a Session; execution remains unavailable until the backend can durably bind the exact revision and digest."
					}),
					template !== null && draft !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "grid",
							gap: 14
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
								"Template",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
									"aria-label": "Workflow template",
									value: templateId,
									onChange: (event) => changeTemplate(event.target.value),
									style: {
										...field,
										marginTop: 5,
										width: "100%"
									},
									children: snapshot?.templates.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: item.id,
										children: item.name
									}, item.id))
								})
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "grid",
									gridTemplateColumns: "minmax(180px,1fr) minmax(220px,2fr)",
									gap: 12
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
									"Definition id",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										value: draft.id,
										onChange: (event) => {
											setDraft({
												...draft,
												id: event.target.value
											});
											setPreview(null);
										},
										style: {
											...field,
											marginTop: 5,
											width: "100%",
											boxSizing: "border-box"
										}
									})
								] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
									"Name",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										value: draft.name,
										onChange: (event) => {
											setDraft({
												...draft,
												name: event.target.value
											});
											setPreview(null);
										},
										style: {
											...field,
											marginTop: 5,
											width: "100%",
											boxSizing: "border-box"
										}
									})
								] })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
								"Description",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									value: draft.description,
									onChange: (event) => {
										setDraft({
											...draft,
											description: event.target.value
										});
										setPreview(null);
									},
									rows: 3,
									style: {
										...field,
										padding: 9,
										marginTop: 5,
										width: "100%",
										boxSizing: "border-box",
										resize: "vertical"
									}
								})
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									display: "grid",
									gridTemplateColumns: "repeat(4,minmax(110px,1fr))",
									gap: 10
								},
								children: [
									["maxIterations", "Iterations"],
									["maxWallTimeMs", "Wall time ms"],
									["maxTokens", "Tokens"],
									["maxToolCalls", "Tool calls"]
								].map(([key, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [
									label,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "number",
										min: 1,
										value: draft.budgets[key],
										onChange: (event) => {
											setBudget(key, event.target.value);
											setPreview(null);
										},
										style: {
											...field,
											marginTop: 5,
											width: "100%",
											boxSizing: "border-box"
										}
									})
								] }, key))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									padding: 14,
									border: `1px solid ${colors.border}`,
									borderRadius: 10,
									background: colors.surface
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Template graph" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											color: colors.muted,
											marginTop: 7
										},
										children: template.nodes.map((node) => `${node.label} [${node.type}]`).join(" → ")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											color: colors.muted,
											marginTop: 6
										},
										children: [
											"Backend: ",
											template.backend.id,
											" · Template digest ",
											template.digest.slice(0, 12),
											"…"
										]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 8,
									flexWrap: "wrap"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy,
									onClick: () => {
										previewDraft();
									},
									style: button,
									children: "Validate preview"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: busy || preview === null,
									onClick: () => {
										publish();
									},
									style: button,
									children: "Publish immutable revision"
								})]
							}),
							preview !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								role: "status",
								style: {
									padding: 14,
									border: `1px solid ${colors.border}`,
									borderRadius: 10
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: [
										preview.published.body.id,
										"@",
										preview.published.body.revision
									] }),
									" · ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", { children: [preview.published.digest.slice(0, 16), "…"] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											color: colors.danger,
											marginTop: 7
										},
										children: ["Execution unavailable: ", preview.resolution.missing.join(", ") || preview.resolution.reason]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Published revisions" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									color: colors.muted,
									marginTop: 6
								},
								children: snapshot?.revisions.length === 0 ? "None" : snapshot?.revisions.map((item) => `${item.body.id}@${item.body.revision} (${item.digest.slice(0, 10)}…)`).join(" · ")
							})] }),
							error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								role: "alert",
								style: {
									color: colors.danger,
									margin: 0
								},
								children: error
							})
						]
					})
				]
			});
		}
		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "aezy-workflow",
				order: 14,
				label: "Workflows"
			}, WorkflowSettingsSection));
		}
		//#endregion
		exports.WorkflowSettingsSection = WorkflowSettingsSection;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map