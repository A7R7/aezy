window.__ModuleLoader__.load({
	id: "@aezy/mode",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/index.tsx
		const CODEX_APP_SERVER_PRESET = "codex-app-server";
		const CODEX_PROVIDER = "aezy-codex";
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
				const result = await this.remote.modelCatalog();
				if (!result.ok) {
					this.store.update((state) => {
						state.status = "error";
						state.error = `${result.error.code}: ${result.error.message}`;
					});
					return;
				}
				this.catalog = result.value;
				this.sync();
				await this.ensureCodexDefault();
			}
			async select(selection) {
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
				if (!result.ok) {
					this.store.update((state) => {
						state.status = "error";
						state.error = `${result.error.code}: ${result.error.message}`;
					});
					throw new Error(result.error.message);
				}
				this.store.update((state) => {
					state.current = result.value.selected;
					state.status = "ready";
					state.error = null;
				});
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
						...model.reasoning?.defaultEffort === void 0 ? {} : { reasoningEffort: model.reasoning.defaultEffort }
					});
				} finally {
					this.selectingDefault = false;
				}
			}
		};
		function ModeModelSelect({ useModeModels, load, select }) {
			const state = useModeModels((value) => value);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			const entries = state.groups.flatMap((group) => group.models.map((model) => ({
				group,
				model
			})));
			const selectedIndex = entries.findIndex(({ group, model }) => state.current?.provider === group.id && state.current.model === model.id);
			const current = selectedIndex < 0 ? void 0 : entries[selectedIndex];
			const efforts = current?.model.reasoning?.efforts ?? [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				"data-aezy-mode-model": true,
				style: {
					display: "inline-flex",
					gap: 6,
					alignItems: "center"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					"aria-label": "Model",
					disabled: state.status === "loading" || state.status === "selecting" || entries.length === 0,
					value: selectedIndex < 0 ? "" : String(selectedIndex),
					title: state.error ?? `Mode: ${state.preset ?? "unknown"}`,
					onChange: (event) => {
						const entry = entries[Number(event.target.value)];
						if (entry === void 0) return;
						select({
							provider: entry.group.id,
							model: entry.model.id,
							...entry.model.reasoning?.defaultEffort === void 0 ? {} : { reasoningEffort: entry.model.reasoning.defaultEffort }
						});
					},
					style: {
						maxWidth: 220,
						minHeight: 30,
						borderRadius: 7
					},
					children: [selectedIndex < 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: "",
						children: "Select model"
					}), entries.map(({ group, model }, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
						value: String(index),
						children: [
							group.name,
							" · ",
							model.name
						]
					}, `${group.id}:${model.id}`))]
				}), efforts.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
					"aria-label": "Reasoning effort",
					value: state.current?.reasoningEffort ?? current?.model.reasoning?.defaultEffort ?? "",
					disabled: state.status === "selecting",
					onChange: (event) => {
						if (current === void 0) return;
						select({
							provider: current.group.id,
							model: current.model.id,
							reasoningEffort: event.target.value
						});
					},
					style: {
						minHeight: 30,
						borderRadius: 7
					},
					children: efforts.map((effort) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: effort.id,
						children: effort.name
					}, effort.id))
				})]
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
						await directory.select({
							provider,
							model
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