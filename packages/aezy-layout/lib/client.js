window.__ModuleLoader__.load({
	id: "@aezy/layout",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperties(exports, {
			__esModule: { value: true },
			[Symbol.toStringTag]: { value: "Module" }
		});
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/policy.js
		const CHAT_MIN_RATIO = .25;
		const DETAILS_MAX_RATIO = .75;
		function finite(value) {
			return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
		}
		/** Resolve proportional limits inside the conversation+details region, excluding the navigation sidebar. */
		function columnLimits(frameWidth, sidebarWidth) {
			const frame = finite(frameWidth);
			const sidebar = Math.min(frame, finite(sidebarWidth));
			const content = Math.max(0, frame - sidebar);
			const chatMin = Math.round(content * CHAT_MIN_RATIO);
			const detailsMax = Math.max(0, content - chatMin);
			return Object.freeze({
				frame,
				sidebar,
				content,
				chatMin,
				detailsMin: Math.min(300, detailsMax),
				detailsMax
			});
		}
		function clampDetailsWidth(requestedWidth, frameWidth, sidebarWidth) {
			const limits = columnLimits(frameWidth, sidebarWidth);
			const requested = Math.round(finite(requestedWidth));
			return Math.min(limits.detailsMax, Math.max(limits.detailsMin, requested));
		}
		/** Read the three pixel tracks emitted by DSH's public AppFrame DOM. */
		function parsePixelTracks(value) {
			if (typeof value !== "string") return null;
			const matches = [...value.matchAll(/(-?\d+(?:\.\d+)?)px/gu)].map((match) => Number(match[1]));
			if (matches.length !== 3 || matches.some((item) => !Number.isFinite(item))) return null;
			return Object.freeze({
				sidebar: matches[0],
				center: matches[1],
				details: matches[2]
			});
		}
		//#endregion
		//#region src/client/index.tsx
		function frameOf(anchor) {
			return anchor.closest("[data-shell-overlay]")?.parentElement ?? null;
		}
		function detailsHandle(frame) {
			return frame.querySelector("[data-side=\"details\"]");
		}
		function renderedTracks(frame) {
			return parsePixelTracks(getComputedStyle(frame).gridTemplateColumns);
		}
		/**
		* Narrow adapter over DSH's rendered AppFrame. DSH still owns open/close,
		* Session switching, responsive collapse, slots, and the actual panel tree;
		* Aezy only widens the existing details drag range while the panel is open.
		*/
		var ProportionalDetailsPolicy = class {
			frame;
			documentRoot;
			drag = null;
			desiredDetails = null;
			restoreGrid = null;
			restoreHandleLeft = null;
			restoreFrameTransition = null;
			restoreHandleTransition = null;
			applying = false;
			frameObserver = null;
			sizeObserver = null;
			constructor(frame, documentRoot = document) {
				this.frame = frame;
				this.documentRoot = documentRoot;
			}
			start() {
				this.frame.dataset.aezyLayoutPolicy = "proportional-details-v1";
				this.documentRoot.addEventListener("pointerdown", this.onPointerDown, true);
				this.documentRoot.addEventListener("pointermove", this.onPointerMove, true);
				this.documentRoot.addEventListener("pointerup", this.onPointerUp, true);
				this.documentRoot.addEventListener("pointercancel", this.onPointerUp, true);
				this.frameObserver = new MutationObserver(() => {
					this.reconcile();
				});
				this.frameObserver.observe(this.frame, {
					subtree: true,
					childList: true,
					attributes: true,
					attributeFilter: ["style", "data-details-collapsed"]
				});
				this.sizeObserver = new ResizeObserver(() => {
					this.reconcile();
				});
				this.sizeObserver.observe(this.frame);
				this.reconcile();
				return () => {
					this.dispose();
				};
			}
			onPointerDown = (event) => {
				const target = event.target;
				if (!(target instanceof Element)) return;
				const handle = target.closest("[data-side=\"details\"]");
				if (handle === null || !this.frame.contains(handle)) return;
				const frameWidth = this.frame.getBoundingClientRect().width;
				if (frameWidth < 760 || this.frame.hasAttribute("data-details-collapsed")) return;
				const tracks = renderedTracks(this.frame);
				if (tracks === null || tracks.details <= 0) return;
				this.restoreGrid = this.frame.style.gridTemplateColumns;
				this.restoreHandleLeft = handle.style.left;
				this.restoreFrameTransition = this.frame.style.transition;
				this.restoreHandleTransition = handle.style.transition;
				this.frame.style.transition = "none";
				handle.style.transition = "none";
				this.drag = {
					pointerId: event.pointerId,
					originX: event.clientX,
					baseDetails: tracks.details,
					sidebar: tracks.sidebar,
					frameWidth
				};
				this.desiredDetails = tracks.details;
				event.preventDefault();
				event.stopImmediatePropagation();
			};
			onPointerMove = (event) => {
				const drag = this.drag;
				if (drag === null || drag.pointerId !== event.pointerId) return;
				const requested = drag.baseDetails - (event.clientX - drag.originX);
				this.desiredDetails = clampDetailsWidth(requested, drag.frameWidth, drag.sidebar);
				this.apply(drag.sidebar);
				event.preventDefault();
				event.stopImmediatePropagation();
			};
			onPointerUp = (event) => {
				if (this.drag === null || this.drag.pointerId !== event.pointerId) return;
				this.onPointerMove(event);
				this.drag = null;
				this.restoreDragTransitions();
			};
			reconcile() {
				if (this.applying) return;
				if (this.frame.getBoundingClientRect().width < 760) {
					this.drag = null;
					this.desiredDetails = null;
					this.restoreGrid = null;
					this.restoreHandleLeft = null;
					this.restoreDragTransitions();
					this.clearFacts();
					return;
				}
				if (this.frame.hasAttribute("data-details-collapsed")) {
					this.desiredDetails = null;
					this.restoreGrid = null;
					this.restoreHandleLeft = null;
					this.restoreDragTransitions();
					this.clearFacts();
					return;
				}
				if (this.desiredDetails === null) {
					this.clearFacts();
					return;
				}
				const tracks = renderedTracks(this.frame);
				if (tracks !== null) this.apply(tracks.sidebar);
			}
			apply(sidebarWidth) {
				if (this.desiredDetails === null) return;
				const frameWidth = this.frame.getBoundingClientRect().width;
				const limits = columnLimits(frameWidth, sidebarWidth);
				const details = clampDetailsWidth(this.desiredDetails, frameWidth, sidebarWidth);
				this.desiredDetails = details;
				const grid = `${String(Math.round(limits.sidebar))}px minmax(0, 1fr) ${String(details)}px`;
				const handle = detailsHandle(this.frame);
				const left = `${String(Math.round(frameWidth - details))}px`;
				this.applying = true;
				try {
					if (this.frame.style.gridTemplateColumns !== grid) this.frame.style.gridTemplateColumns = grid;
					if (handle !== null && handle.style.left !== left) handle.style.left = left;
					this.frame.dataset.aezyChatMinRatio = String(CHAT_MIN_RATIO);
					this.frame.dataset.aezyDetailsMaxRatio = String(DETAILS_MAX_RATIO);
					this.frame.dataset.aezyChatMinPx = String(limits.chatMin);
					this.frame.dataset.aezyDetailsMaxPx = String(limits.detailsMax);
				} finally {
					this.applying = false;
				}
			}
			clearFacts() {
				delete this.frame.dataset.aezyChatMinRatio;
				delete this.frame.dataset.aezyDetailsMaxRatio;
				delete this.frame.dataset.aezyChatMinPx;
				delete this.frame.dataset.aezyDetailsMaxPx;
			}
			restoreDragTransitions() {
				const handle = detailsHandle(this.frame);
				if (this.restoreFrameTransition !== null) this.frame.style.transition = this.restoreFrameTransition;
				if (handle !== null && this.restoreHandleTransition !== null) handle.style.transition = this.restoreHandleTransition;
				this.restoreFrameTransition = null;
				this.restoreHandleTransition = null;
			}
			dispose() {
				this.documentRoot.removeEventListener("pointerdown", this.onPointerDown, true);
				this.documentRoot.removeEventListener("pointermove", this.onPointerMove, true);
				this.documentRoot.removeEventListener("pointerup", this.onPointerUp, true);
				this.documentRoot.removeEventListener("pointercancel", this.onPointerUp, true);
				this.frameObserver?.disconnect();
				this.sizeObserver?.disconnect();
				const handle = detailsHandle(this.frame);
				this.restoreDragTransitions();
				if (this.restoreGrid !== null) this.frame.style.gridTemplateColumns = this.restoreGrid;
				if (handle !== null && this.restoreHandleLeft !== null) handle.style.left = this.restoreHandleLeft;
				delete this.frame.dataset.aezyLayoutPolicy;
				this.clearFacts();
			}
		};
		function LayoutPolicyMount() {
			const anchor = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const element = anchor.current;
				const frame = element === null ? null : frameOf(element);
				if (frame === null) return;
				return new ProportionalDetailsPolicy(frame).start();
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				ref: anchor,
				hidden: true,
				"data-aezy-layout-policy-mount": true
			});
		}
		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "aezy-layout-policy",
				order: -100
			}, LayoutPolicyMount));
		}
		var client_default = {
			inject,
			apply
		};
		//#endregion
		exports.ProportionalDetailsPolicy = ProportionalDetailsPolicy;
		exports.apply = apply;
		exports.default = client_default;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map