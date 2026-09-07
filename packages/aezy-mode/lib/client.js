window.__ModuleLoader__.load({
	id: "@aezy/mode",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		const CODEX_APP_SERVER_PRESET$1 = "codex-app-server";
		const engineForPreset = (preset, selected) => preset === "codex-app-server" || preset === "aezy" && selected?.provider === "aezy-codex" ? "codex" : "dsh";
		const engineForProvider = (provider) => provider === "aezy-codex" ? "codex" : "dsh";
		function modelIdentity(provider, model) {
			if (provider === "openai-codex" || provider === "aezy-codex" && model.startsWith("gpt-")) return `openai/${model}`;
			if (provider === "deepseek-official" && /^deepseek-v4-(flash|pro)$/.test(model)) return `deepseek/${model}`;
			if (provider === "aezy-codex" && /^deepseek\/deepseek-v4-(flash|pro)$/.test(model)) return model;
			return `provider:${provider}/${model}`;
		}
		function resolveModelDirectory(catalog, preset, selected) {
			const engine = engineForPreset(preset, selected);
			const identities = /* @__PURE__ */ new Map();
			for (const group of catalog.groups) for (const model of group.models) {
				const id = modelIdentity(group.id, model.id);
				const family = id.startsWith("openai/") ? "OpenAI" : id.startsWith("deepseek/") ? "DeepSeek" : group.name;
				let row = identities.get(id);
				if (!row) identities.set(id, row = {
					id,
					name: model.name,
					family,
					routes: []
				});
				if (group.id !== "aezy-codex") row.name = model.name;
				row.routes.push({
					provider: group.id,
					model: model.id,
					info: model,
					engine: engineForProvider(group.id),
					name: group.name
				});
			}
			const selectedId = selected && modelIdentity(selected.provider, selected.model);
			if (selectedId && !identities.has(selectedId)) identities.set(selectedId, {
				id: selectedId,
				name: selected.model,
				family: "Unavailable",
				routes: []
			});
			const groups = /* @__PURE__ */ new Map();
			for (const row of identities.values()) {
				const routes = row.routes.filter((route) => route.engine === engine);
				const route = routes.find((value) => value.provider === selected?.provider && value.model === selected?.model) ?? (routes.length === 1 ? routes[0] : null);
				const reason = route ? null : routes.length > 1 ? "Ambiguous channels in the current catalog; no automatic route selected" : `No ${engine === "codex" ? "Codex App Server" : "DSH"} channel in the current catalog`;
				const info = route?.info ?? row.routes[0]?.info;
				const model = {
					id: row.id,
					name: row.name,
					description: info?.description,
					reasoning: route?.info.reasoning,
					route: route ? {
						provider: route.provider,
						model: route.model
					} : null,
					channel: route ? `${engine === "codex" ? "Codex" : "DSH"} · ${route.provider === "aezy-codex" ? route.model.startsWith("deepseek/") ? "Aezy gateway / DeepSeek API" : "Aezy GPT / ChatGPT login" : route.name}` : reason,
					unavailableReason: reason
				};
				if (!groups.has(row.family)) groups.set(row.family, {
					id: row.family,
					name: row.family,
					models: []
				});
				groups.get(row.family).models.push(model);
			}
			return [...groups.values()];
		}
		function compatibleSelection(model, previous) {
			if (!model.route) throw new Error(model.unavailableReason);
			const efforts = model.reasoning?.efforts ?? [];
			const effort = efforts.some((value) => value.id === previous?.reasoningEffort) ? previous.reasoningEffort : model.reasoning?.defaultEffort ?? efforts[0]?.id;
			return {
				...model.route,
				...effort === void 0 ? {} : { reasoningEffort: effort }
			};
		}
		//#endregion
		//#region src/client/run-method.tsx
		function RunMethodMenu({ useAgentPresetSeat, load, select, introduced }) {
			const state = useAgentPresetSeat((value) => value);
			const [open, setOpen] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				load().catch((error) => setError(String(error)));
			}, [load]);
			(0, react.useEffect)(() => {
				if (state.introduce) introduced();
			}, [state.introduce, introduced]);
			if (!state.options.length) return null;
			const chosen = state.options.find((option) => option.id === state.current);
			const groups = [{
				id: "dsh",
				name: "DSH 工作预设",
				options: state.options.filter((option) => option.id !== CODEX_APP_SERVER_PRESET$1)
			}, {
				id: "codex",
				name: "Codex 执行引擎",
				options: state.options.filter((option) => option.id === CODEX_APP_SERVER_PRESET$1)
			}];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				"data-aezy-run-method": true,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					open,
					portal: true,
					side: "bottom",
					align: "start",
					anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "toolbar",
						size: "sm",
						"aria-label": "运行方式",
						"aria-haspopup": "menu",
						"aria-expanded": open,
						title: "运行方式：工作预设与执行引擎分组；开始运行后请新建会话切换",
						disabled: state.busy,
						onClick: () => setOpen(!open),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, {}),
							chosen?.name ?? state.current,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})
						]
					}),
					items: groups.filter((group) => group.options.length).flatMap((group) => [{
						type: "label",
						id: group.id,
						text: group.name
					}, ...group.options.map((option) => ({
						id: option.id,
						label: option.name ?? option.id
					}))]),
					selectedId: state.current,
					onClose: () => setOpen(false),
					onSelect: (id) => {
						setOpen(false);
						setError(null);
						select(id).then((result) => setError(result ?? null)).catch((error) => setError(String(error)));
					}
				}), (error || state.error) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					role: "alert",
					children: error || state.error
				})]
			});
		}
		function installRunMethodMenu(ctx) {
			ctx.slots.inject("conversation.hero.agentPreset", () => {
				let source;
				let remove;
				const update = () => {
					const next = ctx.slots.entries("conversation.hero.agentPreset").find((entry) => entry.locale === "settings.agentPreset" && entry.options.priority !== -10 && entry.inject);
					if (next === source) return;
					remove?.();
					remove = void 0;
					source = next;
					if (!next) return;
					remove = ctx.slots.register({
						name: "conversation.hero.agentPreset",
						priority: -10,
						inject: () => next.inject()
					}, RunMethodMenu);
				};
				const stop = ctx.slots.subscribe("conversation.hero.agentPreset", update);
				update();
				return () => {
					stop();
					remove?.();
				};
			});
		}
		//#endregion
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
			selecting = false;
			loadRevision = 0;
			acknowledged = null;
			stops;
			constructor(remote, sessionId, presetProjection, modelProjection) {
				this.remote = remote;
				this.sessionId = sessionId;
				this.presetProjection = presetProjection;
				this.modelProjection = modelProjection;
				this.stops = [presetProjection.subscribe(() => {
					this.sync();
					this.reconcile();
				}), modelProjection.subscribe(() => {
					this.sync();
					this.reconcile();
				})];
				this.sync();
			}
			async load() {
				if (this.disposed) return;
				const revision = ++this.loadRevision;
				this.store.update((state) => {
					state.status = "loading";
					state.error = null;
				});
				try {
					const result = await this.remote.modelCatalog();
					if (this.disposed || revision !== this.loadRevision) return;
					if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
					this.catalog = result.value;
					this.sync();
					await this.reconcile();
				} catch (error) {
					if (revision === this.loadRevision) this.reportError(error);
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
				if (this.selecting) throw new Error("Model selection is already in progress");
				const preset = projection(this.presetProjection) ?? null;
				try {
					const row = this.store.getSnapshot().groups.flatMap((group) => group.models).find((model) => model.id === modelIdentity(selection.provider, selection.model));
					if (engineForProvider(selection.provider) !== engineForPreset(preset, this.store.getSnapshot().current) || row?.route?.provider !== selection.provider || row?.route?.model !== selection.model) throw new Error("This model has no compatible channel for the selected run method; no fallback was used");
					this.selecting = true;
					const base = JSON.stringify(projection(this.modelProjection)?.next ?? null);
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
					this.acknowledged = {
						base,
						selected: result.value.selected
					};
					this.store.update((state) => {
						state.current = result.value.selected;
						state.status = "ready";
						state.error = null;
					});
				} catch (error) {
					this.reportError(error);
					throw error;
				} finally {
					this.selecting = false;
					if (preset !== (projection(this.presetProjection) ?? null)) {
						this.sync();
						this.reconcile();
					}
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
				const wire = JSON.stringify(projected?.next ?? null);
				if (this.acknowledged && wire !== this.acknowledged.base) this.acknowledged = null;
				const current = this.acknowledged?.selected ?? projected?.next ?? this.catalog?.default ?? null;
				const groups = this.catalog ? resolveModelDirectory(this.catalog, preset, current) : [];
				const selectedRow = groups.flatMap((group) => group.models).find((model) => current && model.id === modelIdentity(current.provider, current.model));
				this.store.set({
					preset,
					current,
					groups,
					status: this.selecting ? "selecting" : this.catalog === null ? "idle" : "ready",
					error: selectedRow?.unavailableReason ?? null
				});
			}
			async reconcile() {
				const state = this.store.getSnapshot();
				if (this.disposed || this.selecting || !state.current) return;
				const model = state.groups.flatMap((group) => group.models).find((model) => model.id === modelIdentity(state.current.provider, state.current.model));
				if (!model?.route || model.route.provider === state.current.provider && model.route.model === state.current.model) return;
				try {
					await this.select(compatibleSelection(model, state.current));
				} catch (error) {
					this.reportError(error);
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
			const selectedIndex = entries.findIndex(({ model }) => state.current && modelIdentity(state.current.provider, state.current.model) === model.id);
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
				id: model.id,
				disabled: !model.route,
				label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [model.name, model.unavailableReason && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", {
					style: {
						display: "block",
						maxWidth: 300,
						whiteSpace: "normal"
					},
					children: model.unavailableReason
				})] })
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
							title: current ? `${current.model.name} · ${current.model.channel}` : "Select model",
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
						selectedId: current?.model.id,
						onClose: () => setOpen(null),
						onSelect: (id) => {
							if (id === "refresh") {
								setOpen(null);
								load();
								return;
							}
							const entry = entries.find(({ model }) => model.id === id);
							if (!entry?.model.route) return;
							choose(compatibleSelection(entry.model, state.current));
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
							if (!current?.model.route) return;
							choose({
								...current.model.route,
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
			installRunMethodMenu(ctx);
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
				description: "Choose a model through a compatible execution channel",
				available: (session) => ctx.sessions.subagentAddress(session.sessionId) === void 0,
				ui: {
					kind: "popupSelect",
					options: async (session) => {
						const directory = directoryFor(String(session.sessionId));
						await directory.load();
						return directory.store.getSnapshot().groups.flatMap((group) => group.models.map((model) => ({
							id: model.id,
							label: model.name,
							detail: model.channel ?? group.name,
							active: Boolean(directory.store.getSnapshot().current && modelIdentity(directory.store.getSnapshot().current.provider, directory.store.getSnapshot().current.model) === model.id)
						})));
					},
					onSelect: async (option, session) => {
						const directory = directoryFor(String(session.sessionId));
						const entry = directory.store.getSnapshot().groups.flatMap((group) => group.models).find((item) => item.id === option.id);
						if (!entry) throw new Error("stale model option");
						await directory.select(compatibleSelection(entry, directory.store.getSnapshot().current));
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
		exports.installRunMethodMenu = installRunMethodMenu;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map