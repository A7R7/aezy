window.__ModuleLoader__.load({
	id: "@aezy/brand",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/index.tsx
		/** Temporary typographic mark until Aezy has a deliberately designed logo. */
		function AezyBrandMark({ size, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className,
				"aria-hidden": "true",
				style: {
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					width: size,
					height: size,
					borderRadius: "28%",
					background: "var(--dsw-alias-brand-primary, #0f1115)",
					color: "var(--dsw-alias-label-primary-inverted, #ffffff)",
					fontFamily: "ui-sans-serif, system-ui, sans-serif",
					fontSize: Math.max(11, Math.round(size * .48)),
					fontWeight: 700,
					lineHeight: 1,
					letterSpacing: "-0.04em",
					userSelect: "none"
				},
				children: "A"
			});
		}
		/** Plain text name occupant; typography and layout remain owned by the host. */
		function AezyBrandName(_props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					color: "inherit",
					font: "inherit"
				},
				children: "Aezy"
			});
		}
		const inject = ["slots"];
		/** Fill the three generic rc.2 brand slots without replacing their hosts. */
		function apply(ctx) {
			ctx.slots.inject("sidebar.brand.mark", () => ctx.slots.inject("sidebar.brand.name", () => ctx.slots.inject("conversation.hero.brand.mark", function* () {
				yield ctx.slots.register({ name: "sidebar.brand.mark" }, AezyBrandMark);
				yield ctx.slots.register({ name: "sidebar.brand.name" }, AezyBrandName);
				yield ctx.slots.register({ name: "conversation.hero.brand.mark" }, AezyBrandMark);
			})));
		}
		//#endregion
		exports.AezyBrandMark = AezyBrandMark;
		exports.AezyBrandName = AezyBrandName;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map