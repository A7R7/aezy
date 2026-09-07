window.__ModuleLoader__.load({
	id: "@aezy/mode",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/index.tsx
		const CODEX_APP_SERVER_PRESET = "codex-app-server";
		const CODEX_PROVIDER = "aezy-codex";
		const defaultEffort = (model) => model.reasoning?.defaultEffort ?? model.reasoning?.efforts[0]?.id;
		function createSnapshotStore(initial) {
			let snapshot = initial;
			const listeners = /* @__PURE__ */ new Set();
			const publish = (value) => {
				snapshot = value;
				for (const listener of listeners) listener();
			};
			return {
				getSnapshot: () => snapshot,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				set: publish,
				update: (update) => {
					const next = { ...snapshot };
					update(next);
					publish(next);
				}
			};
		}
		function projection(face) {
			return face.getSnapshot();
		}
		var ModeModelDirectory = class {
			remote;
			sessionId;
			presetProjection;
			modelProjection;
			store = createSnapshotStore({
				preset: null,
				current: null,
				groups: [],
				status: "idle",
				error: null
			});
			catalog = null;
			disposed = false;
			selectingDefault = false;
			stops;
			constructor(remote, sessionId, presetProjection, modelProjection) {
				this.remote = remote;
				this.sessionId = sessionId;
				this.presetProjection = presetProjection;
				this.modelProjection = modelProjection;
				this.stops = [presetProjection.subscribe(() => {
					this.sync();
				}), modelProjection.subscribe(() => {
					this.sync();
				})];
				this.sync();
			}
			async load() {
				if (this.disposed) return;
				this.store.update((state) => {
					state.status = "loading";
					state.error = null;
				});
				try {
					const result = await this.remote.modelCatalog();
					if (this.disposed) return;
					if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
					this.catalog = result.value;
					this.sync();
					await this.ensureCodexDefault();
				} catch (error) {
					this.reportError(error);
				}
			}
			reportError(error) {
				if (this.disposed) return;
				this.store.update((state) => {
					state.status = "error";
					state.error = error instanceof Error ? error.message : String(error);
				});
			}
			async select(selection) {
				if (this.disposed) return;
				try {
					const preset = projection(this.presetProjection) ?? null;
					const codexMode = preset === CODEX_APP_SERVER_PRESET;
					if (selection.provider === "aezy-codex" !== codexMode) throw new Error(`provider ${selection.provider} is unavailable in preset ${preset ?? "(none)"}`);
					this.store.update((state) => {
						state.status = "selecting";
						state.error = null;
					});
					const result = await this.remote.selectModel({
						sessionId: this.sessionId,
						...selection
					});
					if (this.disposed) return;
					if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
					this.store.update((state) => {
						state.current = result.value.selected;
						state.status = "ready";
						state.error = null;
					});
				} catch (error) {
					this.reportError(error);
					throw error;
				}
			}
			dispose() {
				this.disposed = true;
				for (const stop of this.stops) stop();
			}
			sync() {
				if (this.disposed) return;
				const preset = projection(this.presetProjection) ?? null;
				const projected = projection(this.modelProjection);
				const codexMode = preset === CODEX_APP_SERVER_PRESET;
				const groups = (this.catalog?.groups ?? []).filter((group) => group.id === CODEX_PROVIDER === codexMode);
				const fallback = this.catalog?.default ?? null;
				const selected = projected?.next ?? fallback;
				const current = selected !== null && selected.provider === "aezy-codex" === codexMode ? selected : null;
				this.store.set({
					preset,
					current,
					groups,
					status: this.catalog === null ? "idle" : "ready",
					error: null
				});
			}
			async ensureCodexDefault() {
				const state = this.store.getSnapshot();
				if (state.preset !== "codex-app-server" || state.current?.provider === "aezy-codex") return;
				const model = state.groups[0]?.models[0];
				if (model === void 0 || this.selectingDefault) return;
				this.selectingDefault = true;
				try {
					await this.select({
						provider: CODEX_PROVIDER,
						model: model.id,
						...defaultEffort(model) === void 0 ? {} : { reasoningEffort: defaultEffort(model) }
					});
				} finally {
					this.selectingDefault = false;
				}
			}
		};
		function ModeModelSelect({ useModeModels, load, select }) {
			const state = useModeModels((value) => value);
			const [open, setOpen] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			(0, react.useEffect)(() => {
				setOpen(null);
			}, [state.preset]);
			const entries = state.groups.flatMap((group) => group.models.map((model) => ({
				group,
				model
			})));
			const selectedIndex = entries.findIndex(({ group, model }) => state.current?.provider === group.id && state.current.model === model.id);
			const current = selectedIndex < 0 ? void 0 : entries[selectedIndex];
			const efforts = current?.model.reasoning?.efforts ?? [];
			const busy = state.status === "loading" || state.status === "selecting";
			const choose = (selection) => {
				setOpen(null);
				select(selection).catch(() => {});
			};
			const items = state.groups.flatMap((group) => [{
				type: "label",
				id: `group:${group.id}`,
				text: group.name
			}, ...group.models.map((model) => ({
				id: `${group.id}\u0000${model.id}`,
				label: model.name
			}))]);
			const effort = state.current?.reasoningEffort ?? (current && defaultEffort(current.model));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				"data-aezy-mode-model": true,
				style: {
					display: "inline-flex",
					gap: 6,
					alignItems: "center"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
						open: open === "model",
						portal: true,
						side: "top",
						align: "end",
						compact: true,
						anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "toolbar",
							size: "sm",
							"aria-label": "Model",
							"aria-haspopup": "menu",
							"aria-expanded": open === "model",
							disabled: busy,
							title: current ? `${current.group.name} · ${current.model.name}` : "Select model",
							onClick: () => setOpen(open === "model" ? null : "model"),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									maxWidth: 210,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: busy ? "Loading…" : current?.model.name ?? "Select model"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: {
									display: "inline-flex",
									flexShrink: 0
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})
							})]
						}),
						items: items.length ? items : [{
							type: "label",
							id: "empty",
							text: "No models available"
						}],
						footer: [{
							id: "refresh",
							label: "Refresh models"
						}],
						selectedId: current ? `${current.group.id}\u0000${current.model.id}` : void 0,
						onClose: () => setOpen(null),
						onSelect: (id) => {
							if (id === "refresh") {
								setOpen(null);
								load();
								return;
							}
							const entry = entries.find(({ group, model }) => `${group.id}\u0000${model.id}` === id);
							if (entry === void 0) return;
							choose({
								provider: entry.group.id,
								model: entry.model.id,
								...defaultEffort(entry.model) === void 0 ? {} : { reasoningEffort: defaultEffort(entry.model) }
							});
						}
					}),
					efforts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
						open: open === "effort",
						portal: true,
						side: "top",
						align: "end",
						compact: true,
						anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "toolbar",
							size: "sm",
							"aria-label": "Reasoning effort",
							"aria-haspopup": "menu",
							"aria-expanded": open === "effort",
							disabled: busy,
							onClick: () => setOpen(open === "effort" ? null : "effort"),
							children: [efforts.find((item) => item.id === effort)?.name ?? "Reasoning", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: {
									display: "inline-flex",
									flexShrink: 0
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})
							})]
						}),
						items: efforts.map((item) => ({
							id: item.id,
							label: item.name
						})),
						selectedId: effort,
						onClose: () => setOpen(null),
						onSelect: (id) => {
							if (current === void 0) return;
							choose({
								provider: current.group.id,
								model: current.model.id,
								reasoningEffort: id
							});
						}
					}),
					state.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						role: "alert",
						style: {
							color: "var(--dsw-alias-state-error-primary, #d84848)",
							fontSize: 12,
							maxWidth: 280
						},
						children: state.error
					})
				]
			});
		}
		const inject = [
			"commandUi",
			"remote",
			"remote.session",
			"sessions",
			"slots"
		];
		function apply(ctx) {
			const directories = /* @__PURE__ */ new Map();
			const directoryFor = (sessionId) => {
				const existing = directories.get(sessionId);
				if (existing !== void 0) return existing;
				const scope = ctx.sessions.scope(sessionId);
				const binding = ctx.sessions.binding(sessionId);
				if (scope === void 0 || binding === void 0) throw new Error(`Aezy mode has no Session binding for ${sessionId}`);
				const directory = new ModeModelDirectory(ctx.remote.session, sessionId, binding.session.projections.faceOf("agentPreset"), binding.session.projections.faceOf("modelSelection"));
				directories.set(sessionId, directory);
				scope.effect(() => () => {
					directory.dispose();
					directories.delete(sessionId);
				}, "aezy-mode: model directory");
				return directory;
			};
			ctx.effect(() => ctx.commandUi.register({
				name: "model",
				description: "Choose a model allowed by this Session mode",
				available: (session) => ctx.sessions.subagentAddress(session.sessionId) === void 0,
				ui: {
					kind: "popupSelect",
					options: async (session) => {
						const directory = directoryFor(String(session.sessionId));
						await directory.load();
						return directory.store.getSnapshot().groups.flatMap((group) => group.models.map((model) => ({
							id: `${group.id}\u0000${model.id}`,
							label: model.name,
							detail: group.name,
							active: directory.store.getSnapshot().current?.provider === group.id && directory.store.getSnapshot().current?.model === model.id
						})));
					},
					onSelect: async (option, session) => {
						const directory = directoryFor(String(session.sessionId));
						const [provider, model] = option.id.split("\0", 2);
						if (provider === void 0 || model === void 0) throw new Error("stale model option");
						const entry = directory.store.getSnapshot().groups.find((group) => group.id === provider)?.models.find((item) => item.id === model);
						if (!entry) throw new Error("stale model option");
						await directory.select({
							provider,
							model,
							...defaultEffort(entry) === void 0 ? {} : { reasoningEffort: defaultEffort(entry) }
						});
					}
				}
			}), "aezy-mode: /model projection");
			ctx.slots.inject("conversation.input.model", () => ctx.slots.register({
				name: "conversation.input.model",
				id: "aezy-mode-model",
				inject: (sessionId) => {
					const directory = directoryFor(String(sessionId));
					return {
						hooks: { modeModels: directory.store },
						load: () => {
							directory.load();
						},
						select: (selection) => directory.select(selection)
					};
				}
			}, ModeModelSelect));
		}
		//#endregion
		exports.CODEX_APP_SERVER_PRESET = CODEX_APP_SERVER_PRESET;
		exports.CODEX_PROVIDER = CODEX_PROVIDER;
		exports.ModeModelDirectory = ModeModelDirectory;
		exports.ModeModelSelect = ModeModelSelect;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map