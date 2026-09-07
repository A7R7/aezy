window.__ModuleLoader__.load({
	id: "@aezy/observability",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let react_dom = require("react-dom");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/vendor/aezy-api.ts
		const API_BASE = "/aezy/observability";
		function aezyFetch(input, init = {}) {
			const headers = new Headers(init.headers);
			headers.set("X-Aezy-Client", "web");
			return window.fetch(input, {
				...init,
				headers,
				credentials: "same-origin",
				signal: init.signal ?? AbortSignal.timeout(1e4)
			});
		}
		function useStableEvent(fn) {
			const ref = (0, react.useRef)(fn);
			(0, react.useLayoutEffect)(() => {
				ref.current = fn;
			});
			return (0, react.useCallback)(((...args) => ref.current(...args)), []);
		}
		function useSurfaces() {
			const [surfaces, setSurfaces] = (0, react.useState)([]);
			(0, react.useEffect)(() => {
				const c = new AbortController();
				const read = () => {
					aezyFetch("/aezy/observability/api/surfaces", { signal: AbortSignal.any([c.signal, AbortSignal.timeout(1e4)]) }).then((r) => {
						if (!r.ok) throw Error("surfaces unavailable");
						return r.json();
					}).then(setSurfaces).catch(() => {});
				};
				read();
				const timer = setInterval(read, 1e4);
				return () => {
					c.abort();
					clearInterval(timer);
				};
			}, []);
			return surfaces;
		}
		function surfaceLabel(id, surfaces) {
			return id === "all" ? "All" : surfaces.find((s) => s.id === id)?.label ?? id;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/@tanstack+virtual-core@3.13.12/node_modules/@tanstack/virtual-core/dist/esm/utils.js
		function memo(getDeps, fn, opts) {
			let deps = opts.initialDeps ?? [];
			let result;
			function memoizedFunction() {
				var _a, _b, _c, _d;
				let depTime;
				if (opts.key && ((_a = opts.debug) == null ? void 0 : _a.call(opts))) depTime = Date.now();
				const newDeps = getDeps();
				if (!(newDeps.length !== deps.length || newDeps.some((dep, index) => deps[index] !== dep))) return result;
				deps = newDeps;
				let resultTime;
				if (opts.key && ((_b = opts.debug) == null ? void 0 : _b.call(opts))) resultTime = Date.now();
				result = fn(...newDeps);
				if (opts.key && ((_c = opts.debug) == null ? void 0 : _c.call(opts))) {
					const depEndTime = Math.round((Date.now() - depTime) * 100) / 100;
					const resultEndTime = Math.round((Date.now() - resultTime) * 100) / 100;
					const resultFpsPercentage = resultEndTime / 16;
					const pad = (str, num) => {
						str = String(str);
						while (str.length < num) str = " " + str;
						return str;
					};
					console.info(`%c⏱ ${pad(resultEndTime, 5)} /${pad(depEndTime, 5)} ms`, `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0, Math.min(120 - 120 * resultFpsPercentage, 120))}deg 100% 31%);`, opts == null ? void 0 : opts.key);
				}
				(_d = opts == null ? void 0 : opts.onChange) == null || _d.call(opts, result);
				return result;
			}
			memoizedFunction.updateDeps = (newDeps) => {
				deps = newDeps;
			};
			return memoizedFunction;
		}
		function notUndefined(value, msg) {
			if (value === void 0) throw new Error(`Unexpected undefined${msg ? `: ${msg}` : ""}`);
			else return value;
		}
		const approxEqual = (a, b) => Math.abs(a - b) < 1.01;
		const debounce = (targetWindow, fn, ms) => {
			let timeoutId;
			return function(...args) {
				targetWindow.clearTimeout(timeoutId);
				timeoutId = targetWindow.setTimeout(() => fn.apply(this, args), ms);
			};
		};
		//#endregion
		//#region ../../node_modules/.pnpm/@tanstack+virtual-core@3.13.12/node_modules/@tanstack/virtual-core/dist/esm/index.js
		const getRect = (element) => {
			const { offsetWidth, offsetHeight } = element;
			return {
				width: offsetWidth,
				height: offsetHeight
			};
		};
		const defaultKeyExtractor = (index) => index;
		const defaultRangeExtractor = (range) => {
			const start = Math.max(range.startIndex - range.overscan, 0);
			const end = Math.min(range.endIndex + range.overscan, range.count - 1);
			const arr = [];
			for (let i = start; i <= end; i++) arr.push(i);
			return arr;
		};
		const observeElementRect = (instance, cb) => {
			const element = instance.scrollElement;
			if (!element) return;
			const targetWindow = instance.targetWindow;
			if (!targetWindow) return;
			const handler = (rect) => {
				const { width, height } = rect;
				cb({
					width: Math.round(width),
					height: Math.round(height)
				});
			};
			handler(getRect(element));
			if (!targetWindow.ResizeObserver) return () => {};
			const observer = new targetWindow.ResizeObserver((entries) => {
				const run = () => {
					const entry = entries[0];
					if (entry == null ? void 0 : entry.borderBoxSize) {
						const box = entry.borderBoxSize[0];
						if (box) {
							handler({
								width: box.inlineSize,
								height: box.blockSize
							});
							return;
						}
					}
					handler(getRect(element));
				};
				instance.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(run) : run();
			});
			observer.observe(element, { box: "border-box" });
			return () => {
				observer.unobserve(element);
			};
		};
		const addEventListenerOptions = { passive: true };
		const supportsScrollend = typeof window == "undefined" ? true : "onscrollend" in window;
		const observeElementOffset = (instance, cb) => {
			const element = instance.scrollElement;
			if (!element) return;
			const targetWindow = instance.targetWindow;
			if (!targetWindow) return;
			let offset = 0;
			const fallback = instance.options.useScrollendEvent && supportsScrollend ? () => void 0 : debounce(targetWindow, () => {
				cb(offset, false);
			}, instance.options.isScrollingResetDelay);
			const createHandler = (isScrolling) => () => {
				const { horizontal, isRtl } = instance.options;
				offset = horizontal ? element["scrollLeft"] * (isRtl && -1 || 1) : element["scrollTop"];
				fallback();
				cb(offset, isScrolling);
			};
			const handler = createHandler(true);
			const endHandler = createHandler(false);
			endHandler();
			element.addEventListener("scroll", handler, addEventListenerOptions);
			const registerScrollendEvent = instance.options.useScrollendEvent && supportsScrollend;
			if (registerScrollendEvent) element.addEventListener("scrollend", endHandler, addEventListenerOptions);
			return () => {
				element.removeEventListener("scroll", handler);
				if (registerScrollendEvent) element.removeEventListener("scrollend", endHandler);
			};
		};
		const measureElement = (element, entry, instance) => {
			if (entry == null ? void 0 : entry.borderBoxSize) {
				const box = entry.borderBoxSize[0];
				if (box) return Math.round(box[instance.options.horizontal ? "inlineSize" : "blockSize"]);
			}
			return element[instance.options.horizontal ? "offsetWidth" : "offsetHeight"];
		};
		const elementScroll = (offset, { adjustments = 0, behavior }, instance) => {
			var _a, _b;
			const toOffset = offset + adjustments;
			(_b = (_a = instance.scrollElement) == null ? void 0 : _a.scrollTo) == null || _b.call(_a, {
				[instance.options.horizontal ? "left" : "top"]: toOffset,
				behavior
			});
		};
		var Virtualizer = class {
			constructor(opts) {
				this.unsubs = [];
				this.scrollElement = null;
				this.targetWindow = null;
				this.isScrolling = false;
				this.measurementsCache = [];
				this.itemSizeCache = /* @__PURE__ */ new Map();
				this.pendingMeasuredCacheIndexes = [];
				this.scrollRect = null;
				this.scrollOffset = null;
				this.scrollDirection = null;
				this.scrollAdjustments = 0;
				this.elementsCache = /* @__PURE__ */ new Map();
				this.observer = /* @__PURE__ */ (() => {
					let _ro = null;
					const get = () => {
						if (_ro) return _ro;
						if (!this.targetWindow || !this.targetWindow.ResizeObserver) return null;
						return _ro = new this.targetWindow.ResizeObserver((entries) => {
							entries.forEach((entry) => {
								const run = () => {
									this._measureElement(entry.target, entry);
								};
								this.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(run) : run();
							});
						});
					};
					return {
						disconnect: () => {
							var _a;
							(_a = get()) == null || _a.disconnect();
							_ro = null;
						},
						observe: (target) => {
							var _a;
							return (_a = get()) == null ? void 0 : _a.observe(target, { box: "border-box" });
						},
						unobserve: (target) => {
							var _a;
							return (_a = get()) == null ? void 0 : _a.unobserve(target);
						}
					};
				})();
				this.range = null;
				this.setOptions = (opts2) => {
					Object.entries(opts2).forEach(([key, value]) => {
						if (typeof value === "undefined") delete opts2[key];
					});
					this.options = {
						debug: false,
						initialOffset: 0,
						overscan: 1,
						paddingStart: 0,
						paddingEnd: 0,
						scrollPaddingStart: 0,
						scrollPaddingEnd: 0,
						horizontal: false,
						getItemKey: defaultKeyExtractor,
						rangeExtractor: defaultRangeExtractor,
						onChange: () => {},
						measureElement,
						initialRect: {
							width: 0,
							height: 0
						},
						scrollMargin: 0,
						gap: 0,
						indexAttribute: "data-index",
						initialMeasurementsCache: [],
						lanes: 1,
						isScrollingResetDelay: 150,
						enabled: true,
						isRtl: false,
						useScrollendEvent: false,
						useAnimationFrameWithResizeObserver: false,
						...opts2
					};
				};
				this.notify = (sync) => {
					var _a, _b;
					(_b = (_a = this.options).onChange) == null || _b.call(_a, this, sync);
				};
				this.maybeNotify = memo(() => {
					this.calculateRange();
					return [
						this.isScrolling,
						this.range ? this.range.startIndex : null,
						this.range ? this.range.endIndex : null
					];
				}, (isScrolling) => {
					this.notify(isScrolling);
				}, {
					key: false,
					debug: () => this.options.debug,
					initialDeps: [
						this.isScrolling,
						this.range ? this.range.startIndex : null,
						this.range ? this.range.endIndex : null
					]
				});
				this.cleanup = () => {
					this.unsubs.filter(Boolean).forEach((d) => d());
					this.unsubs = [];
					this.observer.disconnect();
					this.scrollElement = null;
					this.targetWindow = null;
				};
				this._didMount = () => {
					return () => {
						this.cleanup();
					};
				};
				this._willUpdate = () => {
					var _a;
					const scrollElement = this.options.enabled ? this.options.getScrollElement() : null;
					if (this.scrollElement !== scrollElement) {
						this.cleanup();
						if (!scrollElement) {
							this.maybeNotify();
							return;
						}
						this.scrollElement = scrollElement;
						if (this.scrollElement && "ownerDocument" in this.scrollElement) this.targetWindow = this.scrollElement.ownerDocument.defaultView;
						else this.targetWindow = ((_a = this.scrollElement) == null ? void 0 : _a.window) ?? null;
						this.elementsCache.forEach((cached) => {
							this.observer.observe(cached);
						});
						this._scrollToOffset(this.getScrollOffset(), {
							adjustments: void 0,
							behavior: void 0
						});
						this.unsubs.push(this.options.observeElementRect(this, (rect) => {
							this.scrollRect = rect;
							this.maybeNotify();
						}));
						this.unsubs.push(this.options.observeElementOffset(this, (offset, isScrolling) => {
							this.scrollAdjustments = 0;
							this.scrollDirection = isScrolling ? this.getScrollOffset() < offset ? "forward" : "backward" : null;
							this.scrollOffset = offset;
							this.isScrolling = isScrolling;
							this.maybeNotify();
						}));
					}
				};
				this.getSize = () => {
					if (!this.options.enabled) {
						this.scrollRect = null;
						return 0;
					}
					this.scrollRect = this.scrollRect ?? this.options.initialRect;
					return this.scrollRect[this.options.horizontal ? "width" : "height"];
				};
				this.getScrollOffset = () => {
					if (!this.options.enabled) {
						this.scrollOffset = null;
						return 0;
					}
					this.scrollOffset = this.scrollOffset ?? (typeof this.options.initialOffset === "function" ? this.options.initialOffset() : this.options.initialOffset);
					return this.scrollOffset;
				};
				this.getFurthestMeasurement = (measurements, index) => {
					const furthestMeasurementsFound = /* @__PURE__ */ new Map();
					const furthestMeasurements = /* @__PURE__ */ new Map();
					for (let m = index - 1; m >= 0; m--) {
						const measurement = measurements[m];
						if (furthestMeasurementsFound.has(measurement.lane)) continue;
						const previousFurthestMeasurement = furthestMeasurements.get(measurement.lane);
						if (previousFurthestMeasurement == null || measurement.end > previousFurthestMeasurement.end) furthestMeasurements.set(measurement.lane, measurement);
						else if (measurement.end < previousFurthestMeasurement.end) furthestMeasurementsFound.set(measurement.lane, true);
						if (furthestMeasurementsFound.size === this.options.lanes) break;
					}
					return furthestMeasurements.size === this.options.lanes ? Array.from(furthestMeasurements.values()).sort((a, b) => {
						if (a.end === b.end) return a.index - b.index;
						return a.end - b.end;
					})[0] : void 0;
				};
				this.getMeasurementOptions = memo(() => [
					this.options.count,
					this.options.paddingStart,
					this.options.scrollMargin,
					this.options.getItemKey,
					this.options.enabled
				], (count, paddingStart, scrollMargin, getItemKey, enabled) => {
					this.pendingMeasuredCacheIndexes = [];
					return {
						count,
						paddingStart,
						scrollMargin,
						getItemKey,
						enabled
					};
				}, { key: false });
				this.getMeasurements = memo(() => [this.getMeasurementOptions(), this.itemSizeCache], ({ count, paddingStart, scrollMargin, getItemKey, enabled }, itemSizeCache) => {
					if (!enabled) {
						this.measurementsCache = [];
						this.itemSizeCache.clear();
						return [];
					}
					if (this.measurementsCache.length === 0) {
						this.measurementsCache = this.options.initialMeasurementsCache;
						this.measurementsCache.forEach((item) => {
							this.itemSizeCache.set(item.key, item.size);
						});
					}
					const min = this.pendingMeasuredCacheIndexes.length > 0 ? Math.min(...this.pendingMeasuredCacheIndexes) : 0;
					this.pendingMeasuredCacheIndexes = [];
					const measurements = this.measurementsCache.slice(0, min);
					for (let i = min; i < count; i++) {
						const key = getItemKey(i);
						const furthestMeasurement = this.options.lanes === 1 ? measurements[i - 1] : this.getFurthestMeasurement(measurements, i);
						const start = furthestMeasurement ? furthestMeasurement.end + this.options.gap : paddingStart + scrollMargin;
						const measuredSize = itemSizeCache.get(key);
						const size = typeof measuredSize === "number" ? measuredSize : this.options.estimateSize(i);
						const end = start + size;
						const lane = furthestMeasurement ? furthestMeasurement.lane : i % this.options.lanes;
						measurements[i] = {
							index: i,
							start,
							size,
							end,
							key,
							lane
						};
					}
					this.measurementsCache = measurements;
					return measurements;
				}, {
					key: false,
					debug: () => this.options.debug
				});
				this.calculateRange = memo(() => [
					this.getMeasurements(),
					this.getSize(),
					this.getScrollOffset(),
					this.options.lanes
				], (measurements, outerSize, scrollOffset, lanes) => {
					return this.range = measurements.length > 0 && outerSize > 0 ? calculateRange({
						measurements,
						outerSize,
						scrollOffset,
						lanes
					}) : null;
				}, {
					key: false,
					debug: () => this.options.debug
				});
				this.getVirtualIndexes = memo(() => {
					let startIndex = null;
					let endIndex = null;
					const range = this.calculateRange();
					if (range) {
						startIndex = range.startIndex;
						endIndex = range.endIndex;
					}
					this.maybeNotify.updateDeps([
						this.isScrolling,
						startIndex,
						endIndex
					]);
					return [
						this.options.rangeExtractor,
						this.options.overscan,
						this.options.count,
						startIndex,
						endIndex
					];
				}, (rangeExtractor, overscan, count, startIndex, endIndex) => {
					return startIndex === null || endIndex === null ? [] : rangeExtractor({
						startIndex,
						endIndex,
						overscan,
						count
					});
				}, {
					key: false,
					debug: () => this.options.debug
				});
				this.indexFromElement = (node) => {
					const attributeName = this.options.indexAttribute;
					const indexStr = node.getAttribute(attributeName);
					if (!indexStr) {
						console.warn(`Missing attribute name '${attributeName}={index}' on measured element.`);
						return -1;
					}
					return parseInt(indexStr, 10);
				};
				this._measureElement = (node, entry) => {
					const index = this.indexFromElement(node);
					const item = this.measurementsCache[index];
					if (!item) return;
					const key = item.key;
					const prevNode = this.elementsCache.get(key);
					if (prevNode !== node) {
						if (prevNode) this.observer.unobserve(prevNode);
						this.observer.observe(node);
						this.elementsCache.set(key, node);
					}
					if (node.isConnected) this.resizeItem(index, this.options.measureElement(node, entry, this));
				};
				this.resizeItem = (index, size) => {
					const item = this.measurementsCache[index];
					if (!item) return;
					const delta = size - (this.itemSizeCache.get(item.key) ?? item.size);
					if (delta !== 0) {
						if (this.shouldAdjustScrollPositionOnItemSizeChange !== void 0 ? this.shouldAdjustScrollPositionOnItemSizeChange(item, delta, this) : item.start < this.getScrollOffset() + this.scrollAdjustments) this._scrollToOffset(this.getScrollOffset(), {
							adjustments: this.scrollAdjustments += delta,
							behavior: void 0
						});
						this.pendingMeasuredCacheIndexes.push(item.index);
						this.itemSizeCache = new Map(this.itemSizeCache.set(item.key, size));
						this.notify(false);
					}
				};
				this.measureElement = (node) => {
					if (!node) {
						this.elementsCache.forEach((cached, key) => {
							if (!cached.isConnected) {
								this.observer.unobserve(cached);
								this.elementsCache.delete(key);
							}
						});
						return;
					}
					this._measureElement(node, void 0);
				};
				this.getVirtualItems = memo(() => [this.getVirtualIndexes(), this.getMeasurements()], (indexes, measurements) => {
					const virtualItems = [];
					for (let k = 0, len = indexes.length; k < len; k++) {
						const measurement = measurements[indexes[k]];
						virtualItems.push(measurement);
					}
					return virtualItems;
				}, {
					key: false,
					debug: () => this.options.debug
				});
				this.getVirtualItemForOffset = (offset) => {
					const measurements = this.getMeasurements();
					if (measurements.length === 0) return;
					return notUndefined(measurements[findNearestBinarySearch(0, measurements.length - 1, (index) => notUndefined(measurements[index]).start, offset)]);
				};
				this.getOffsetForAlignment = (toOffset, align, itemSize = 0) => {
					const size = this.getSize();
					const scrollOffset = this.getScrollOffset();
					if (align === "auto") align = toOffset >= scrollOffset + size ? "end" : "start";
					if (align === "center") toOffset += (itemSize - size) / 2;
					else if (align === "end") toOffset -= size;
					const maxOffset = this.getTotalSize() + this.options.scrollMargin - size;
					return Math.max(Math.min(maxOffset, toOffset), 0);
				};
				this.getOffsetForIndex = (index, align = "auto") => {
					index = Math.max(0, Math.min(index, this.options.count - 1));
					const item = this.measurementsCache[index];
					if (!item) return;
					const size = this.getSize();
					const scrollOffset = this.getScrollOffset();
					if (align === "auto") {
						if (item.end >= scrollOffset + size - this.options.scrollPaddingEnd) align = "end";
						else if (item.start <= scrollOffset + this.options.scrollPaddingStart) align = "start";
						else return [scrollOffset, align];
					}
					const toOffset = align === "end" ? item.end + this.options.scrollPaddingEnd : item.start - this.options.scrollPaddingStart;
					return [this.getOffsetForAlignment(toOffset, align, item.size), align];
				};
				this.isDynamicMode = () => this.elementsCache.size > 0;
				this.scrollToOffset = (toOffset, { align = "start", behavior } = {}) => {
					if (behavior === "smooth" && this.isDynamicMode()) console.warn("The `smooth` scroll behavior is not fully supported with dynamic size.");
					this._scrollToOffset(this.getOffsetForAlignment(toOffset, align), {
						adjustments: void 0,
						behavior
					});
				};
				this.scrollToIndex = (index, { align: initialAlign = "auto", behavior } = {}) => {
					if (behavior === "smooth" && this.isDynamicMode()) console.warn("The `smooth` scroll behavior is not fully supported with dynamic size.");
					index = Math.max(0, Math.min(index, this.options.count - 1));
					let attempts = 0;
					const maxAttempts = 10;
					const tryScroll = (currentAlign) => {
						if (!this.targetWindow) return;
						const offsetInfo = this.getOffsetForIndex(index, currentAlign);
						if (!offsetInfo) {
							console.warn("Failed to get offset for index:", index);
							return;
						}
						const [offset, align] = offsetInfo;
						this._scrollToOffset(offset, {
							adjustments: void 0,
							behavior
						});
						this.targetWindow.requestAnimationFrame(() => {
							const currentOffset = this.getScrollOffset();
							const afterInfo = this.getOffsetForIndex(index, align);
							if (!afterInfo) {
								console.warn("Failed to get offset for index:", index);
								return;
							}
							if (!approxEqual(afterInfo[0], currentOffset)) scheduleRetry(align);
						});
					};
					const scheduleRetry = (align) => {
						if (!this.targetWindow) return;
						attempts++;
						if (attempts < maxAttempts) this.targetWindow.requestAnimationFrame(() => tryScroll(align));
						else console.warn(`Failed to scroll to index ${index} after ${maxAttempts} attempts.`);
					};
					tryScroll(initialAlign);
				};
				this.scrollBy = (delta, { behavior } = {}) => {
					if (behavior === "smooth" && this.isDynamicMode()) console.warn("The `smooth` scroll behavior is not fully supported with dynamic size.");
					this._scrollToOffset(this.getScrollOffset() + delta, {
						adjustments: void 0,
						behavior
					});
				};
				this.getTotalSize = () => {
					var _a;
					const measurements = this.getMeasurements();
					let end;
					if (measurements.length === 0) end = this.options.paddingStart;
					else if (this.options.lanes === 1) end = ((_a = measurements[measurements.length - 1]) == null ? void 0 : _a.end) ?? 0;
					else {
						const endByLane = Array(this.options.lanes).fill(null);
						let endIndex = measurements.length - 1;
						while (endIndex >= 0 && endByLane.some((val) => val === null)) {
							const item = measurements[endIndex];
							if (endByLane[item.lane] === null) endByLane[item.lane] = item.end;
							endIndex--;
						}
						end = Math.max(...endByLane.filter((val) => val !== null));
					}
					return Math.max(end - this.options.scrollMargin + this.options.paddingEnd, 0);
				};
				this._scrollToOffset = (offset, { adjustments, behavior }) => {
					this.options.scrollToFn(offset, {
						behavior,
						adjustments
					}, this);
				};
				this.measure = () => {
					this.itemSizeCache = /* @__PURE__ */ new Map();
					this.notify(false);
				};
				this.setOptions(opts);
			}
		};
		const findNearestBinarySearch = (low, high, getCurrentValue, value) => {
			while (low <= high) {
				const middle = (low + high) / 2 | 0;
				const currentValue = getCurrentValue(middle);
				if (currentValue < value) low = middle + 1;
				else if (currentValue > value) high = middle - 1;
				else return middle;
			}
			if (low > 0) return low - 1;
			else return 0;
		};
		function calculateRange({ measurements, outerSize, scrollOffset, lanes }) {
			const lastIndex = measurements.length - 1;
			const getOffset = (index) => measurements[index].start;
			if (measurements.length <= lanes) return {
				startIndex: 0,
				endIndex: lastIndex
			};
			let startIndex = findNearestBinarySearch(0, lastIndex, getOffset, scrollOffset);
			let endIndex = startIndex;
			if (lanes === 1) while (endIndex < lastIndex && measurements[endIndex].end < scrollOffset + outerSize) endIndex++;
			else if (lanes > 1) {
				const endPerLane = Array(lanes).fill(0);
				while (endIndex < lastIndex && endPerLane.some((pos) => pos < scrollOffset + outerSize)) {
					const item = measurements[endIndex];
					endPerLane[item.lane] = item.end;
					endIndex++;
				}
				const startPerLane = Array(lanes).fill(scrollOffset + outerSize);
				while (startIndex >= 0 && startPerLane.some((pos) => pos >= scrollOffset)) {
					const item = measurements[startIndex];
					startPerLane[item.lane] = item.start;
					startIndex--;
				}
				startIndex = Math.max(0, startIndex - startIndex % lanes);
				endIndex = Math.min(lastIndex, endIndex + (lanes - 1 - endIndex % lanes));
			}
			return {
				startIndex,
				endIndex
			};
		}
		//#endregion
		//#region ../../node_modules/.pnpm/@tanstack+react-virtual@3.13.12_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/@tanstack/react-virtual/dist/esm/index.js
		const useIsomorphicLayoutEffect = typeof document !== "undefined" ? react.useLayoutEffect : react.useEffect;
		function useVirtualizerBase(options) {
			const rerender = react.useReducer(() => ({}), {})[1];
			const resolvedOptions = {
				...options,
				onChange: (instance2, sync) => {
					var _a;
					if (sync) (0, react_dom.flushSync)(rerender);
					else rerender();
					(_a = options.onChange) == null || _a.call(options, instance2, sync);
				}
			};
			const [instance] = react.useState(() => new Virtualizer(resolvedOptions));
			instance.setOptions(resolvedOptions);
			useIsomorphicLayoutEffect(() => {
				return instance._didMount();
			}, []);
			useIsomorphicLayoutEffect(() => {
				return instance._willUpdate();
			});
			return instance;
		}
		function useVirtualizer(options) {
			return useVirtualizerBase({
				observeElementRect,
				observeElementOffset,
				scrollToFn: elementScroll,
				...options
			});
		}
		//#endregion
		//#region src/client/vendor/i18n/en.ts
		const en = {
			"nav.logs": "Logs & Debug",
			"common.github": "GitHub",
			"common.save": "Save",
			"common.saving": "Saving…",
			"common.cancel": "Cancel",
			"common.discard": "Discard",
			"common.close": "Close",
			"common.ok": "OK",
			"common.remove": "Remove",
			"common.loading": "Loading…",
			"common.retry": "Retry",
			"provider.name.commandCodeAuth": "Command Code - Auth",
			"provider.name.commandCodeApi": "Command Code - API",
			"provider.name.volcengine": "Volcengine Ark",
			"provider.name.volcengineCodingPlan": "Volcengine Ark Coding Plan",
			"provider.name.volcengineAgentPlan": "Volcengine Ark Agent Plan",
			"logs.title": "Request Logs",
			"logs.tabLogs": "Logs",
			"logs.tabDebug": "Debug",
			"logs.subtitle": "Recent requests observed by Aezy, newest first. Private local metadata only.",
			"logs.autoRefresh": "Auto-refresh",
			"logs.noRequests": "No requests yet.",
			"logs.loadError": "Could not load request logs.",
			"logs.filter.surface.label": "Surface",
			"logs.filter.surface.all": "All",
			"logs.filter.surface.claude": "Claude",
			"logs.filter.surface.codex": "Codex",
			"logs.filter.surface.grok": "Grok",
			"logs.filter.interceptedHelpersOnly": "Intercepted helpers only",
			"logs.badge.interceptedHelper": "I · {model}",
			"logs.badge.interceptedHelperTitle": "Intercepted helper request",
			"logs.filter.conversation.label": "Conversation",
			"logs.filter.conversation.placeholder": "Paste conversation id",
			"logs.filter.conversation.clear": "Clear",
			"logs.filter.conversation.apply": "Filter logs",
			"logs.conversation.totals": "{requests} requests · {tokens} tokens · {cost}",
			"logs.conversation.scope": "Totals cover the currently loaded Logs ring only.",
			"logs.conversation.excluded": "({unpriced} unpriced, {unmetered} unmetered excluded from ~$)",
			"logs.cost.approximate": "~{amount}",
			"logs.cost.lowerBound": "≥{amount}",
			"logs.cost.unavailable": "—",
			"logs.detail.conversation": "Conversation",
			"logs.badge.claude": "Claude",
			"logs.badge.grok": "Grok",
			"logs.col.time": "Time",
			"logs.col.request": "Request",
			"logs.col.model": "Model",
			"logs.col.effort": "Effort",
			"logs.col.provider": "Provider",
			"logs.col.status": "Status",
			"logs.col.tokens": "Tokens",
			"logs.col.tokPerSec": "tok/s",
			"logs.col.estimatedCost": "~$",
			"logs.metric.tokPerSecTitle": "Output tokens per second over the full request duration",
			"logs.metric.estimatedCostTitle": "API list-price equivalent, not an actual charge; unmatched pricing is unavailable",
			"usage.cost.total": "API list-price equivalent (this range)",
			"usage.cost.disclaimer": "Not a billing receipt. Subscription usage or provider credits may apply instead.",
			"usage.cost.unpricedNote": "{count} requests excluded (no price or usage)",
			"logs.detail.section.basic": "Basic information",
			"logs.detail.route.section": "Route decision",
			"logs.detail.route.kind": "Route kind",
			"logs.detail.route.profile": "Profile",
			"logs.detail.route.selected": "Selected",
			"logs.detail.route.candidates": "Candidates",
			"logs.detail.route.unknown": "No route trace recorded for this request (pre-trace row).",
			"logs.detail.section.performance": "Performance",
			"logs.detail.section.cost": "API list-price equivalent",
			"logs.detail.section.attempts": "Combo attempts",
			"logs.detail.section.usage": "Raw usage",
			"logs.detail.ttft": "TTFT",
			"logs.detail.costTotal": "List-price equivalent",
			"logs.detail.totalTokens": "Total tokens",
			"logs.detail.matchedKey": "Matched price key",
			"logs.detail.priceSource": "Price source",
			"logs.detail.unavailableReason": "Unavailable reason",
			"logs.detail.copyRequestId": "Copy request ID",
			"logs.detail.copied": "Copied",
			"logs.detail.source.jawcode": "jawcode catalog",
			"logs.detail.source.expected": "Expected price overlay",
			"logs.detail.source.user": "Provider-configured price overlay",
			"logs.detail.verification.verified": "Verified",
			"logs.detail.verification.derived": "Derived from base model",
			"logs.detail.attempt.target": "Provider / model",
			"logs.detail.attempt.reason": "Result / reason",
			"logs.detail.attempt.completed": "Completed",
			"logs.detail.attempt.e2eNote": "Top-level tok/s is end-to-end; each attempt uses its own duration.",
			"logs.detail.attempt.recovery.transient5xx": "Transient 5xx",
			"logs.detail.attempt.recovery.connectionReset": "Connection reset",
			"logs.detail.attempt.recovery.oauth401": "OAuth re-authentication",
			"logs.detail.attempt.recovery.key429": "Key rate-limited (429)",
			"logs.detail.attempt.recovery.rateLimit429": "Rate-limited (429)",
			"logs.detail.attempt.recovery.anthropicOauth429": "Anthropic OAuth rate-limited (429)",
			"logs.detail.attempt.recovery.image413": "Image payload too large (413)",
			"logs.detail.attempt.recovery.emptyCompletion": "Empty completion retry",
			"logs.detail.attempt.recovery.unknown": "Unknown recovery reason",
			"logs.detail.reason.usage_missing": "Usage was not reported.",
			"logs.detail.reason.usage_unsupported": "This provider does not report usage.",
			"logs.detail.reason.output_missing": "No positive output token count was reported.",
			"logs.detail.reason.invalid_duration": "The request duration is not valid.",
			"logs.detail.reason.price_unmatched": "No matching price was found.",
			"logs.detail.reason.invalid_cache_breakdown": "Cache token details conflict with total input tokens.",
			"logs.detail.reason.invalid_usage": "Usage contains an invalid token value.",
			"logs.detail.reason.combo_attempt_unavailable": "At least one combo attempt could not be priced.",
			"logs.detail.estimate.usage_estimated": "Provider usage is estimated.",
			"logs.detail.estimate.cache_detail_missing": "Cache details were unavailable; input is an upper-bound estimate.",
			"logs.detail.estimate.expected_price_overlay": "A verified expected list price was used.",
			"logs.detail.estimate.provider_cost_overlay": "A provider-configured price overlay was used.",
			"logs.detail.estimate.priority_lower_bound": "The confirmed Priority price is unavailable; the displayed estimate is a known lower bound.",
			"logs.col.error": "Error",
			"logs.col.upstreamReason": "Upstream reason",
			"logs.col.duration": "Duration",
			"logs.modelTooltip.model": "model",
			"logs.modelTooltip.resolvedModel": "resolved model",
			"logs.modelTooltip.requestedTier": "requested tier",
			"logs.modelTooltip.configuredTier": "configured tier",
			"logs.modelTooltip.responseTier": "response tier",
			"logs.modelTooltip.supportsTier": "tier support",
			"logs.tokens.reported": "reported",
			"logs.tokens.unreported": "unreported",
			"logs.tokens.unsupported": "unsupported",
			"logs.tokens.estimated": "estimated",
			"logs.tokens.input": "input",
			"logs.tokens.output": "output",
			"logs.tokens.cacheRead": "cache read (c)",
			"logs.tokens.cacheWrite": "cache write (w)",
			"logs.tokens.reasoning": "reasoning",
			"logs.tokens.noCache": "no cache data",
			"logs.tokens.contextTotal": "active context",
			"logs.tokens.noCacheNote": "this provider does not report cache tokens",
			"logs.tokens.noCacheCursor": "Cursor cache detail unreported",
			"logs.tokens.noCacheCursorNote": "Cursor does not expose cache read/write token counts; this is unknown, not a confirmed cache miss",
			"logs.tokens.estimatedNote": "estimated (provider reports no exact usage)",
			"logs.details": "Details",
			"logs.detailTitle": "Request details",
			"logs.detailRaw": "Raw log entry",
			"debug.title": "Debug",
			"debug.subtitle": "Opt-in provider transport and usage-extraction diagnostics. Request errors and 502s stay on the Logs tab.",
			"debug.debug": "Provider debug",
			"debug.usage": "Usage extraction",
			"debug.injection": "Request composition",
			"debug.claude": "Claude inbound",
			"debug.claudeInbound.title": "Claude inbound requests",
			"debug.claudeInbound.sub": "What Claude Code/Desktop actually sends (thinking, effort, metadata) — no prompt text is stored.",
			"debug.claudeInbound.empty": "No requests captured yet. Send a message from Claude while this is on.",
			"debug.claudeInbound.time": "Time",
			"debug.claudeInbound.endpoint": "Endpoint",
			"debug.claudeInbound.model": "Model",
			"debug.claudeInbound.none": "none",
			"debug.reset": "Clear runtime overrides",
			"debug.refresh": "Refresh",
			"debug.follow": "Follow",
			"debug.streamProvider": "Provider",
			"debug.streamUsage": "Usage",
			"debug.streamInjection": "Composition",
			"debug.loading": "Loading debug settings…",
			"debug.loadFailed": "Could not load debug settings.",
			"debug.emptyTitle": "Debug logging is off",
			"debug.empty": "Turn on Provider debug or Usage extraction in the card above. Lines appear here after you send a request through the proxy.",
			"debug.noLinesTitle": "Waiting for lines",
			"debug.noLines.provider": "Provider debug is on, but it only records transport anomalies (dropped or malformed frames, and Cursor dial/retry events). A clean request through a provider like Anthropic can produce no lines.",
			"debug.noLines.usage": "Usage extraction is on but nothing has been captured yet. Send a chat/request through Codex and it appears here.",
			"debug.noLines.injection": "Injection log is on but nothing has been captured yet. It records multi-agent guidance injection and effort-cap decisions on collab and sub-agent turns.",
			"usage.title": "Usage",
			"usage.subtitle": "Local token accounting from Aezy owner observations. Missing usage is never shown as zero.",
			"usage.loading": "Loading usage data…",
			"usage.empty": "No usage recorded yet. Send a request through the proxy to see activity here.",
			"usage.loadError": "Could not load usage data.",
			"usage.range.all": "All",
			"usage.range.available": "Available history",
			"usage.historyTruncated": "Totals cover available history only because older usage was not loaded.",
			"usage.historyTruncatedWindow": "Loaded rows have request start times ranging from {start} to {end}. Earlier file entries were omitted by the read limit, so any selected range may be incomplete.",
			"usage.range.30d": "30d",
			"usage.range.7d": "7d",
			"usage.card.requests": "Requests",
			"usage.card.measured": "Measured",
			"usage.card.reported": "Reported",
			"usage.card.totalTokens": "Total tokens",
			"usage.card.cachedTokens": "Cache reads",
			"usage.card.cachedTokensHint": "Prompt tokens served from the provider cache (reads). Cache writes are shown below when present.",
			"usage.card.cacheWriteTokens": "cache writes",
			"usage.card.coverage": "Coverage",
			"usage.card.activeDays": "Active days",
			"usage.section.heatmap": "Daily activity",
			"usage.section.overview": "Overview",
			"usage.section.models": "Models",
			"usage.section.providers": "Providers",
			"usage.section.coverage": "Coverage breakdown",
			"usage.workspace.report": "Usage report",
			"usage.workspace.sections": "Usage sections",
			"usage.coverage.measured": "Measured",
			"usage.coverage.reported": "Provider reported",
			"usage.coverage.estimated": "Estimated",
			"usage.coverage.note": "Measured entries include provider-reported and estimated token counts. Unreported and unsupported requests are tracked but never inflated to zero tokens.",
			"usage.search.models": "Search models…",
			"usage.col.requests": "Requests",
			"usage.col.measured": "Measured",
			"usage.col.reported": "Reported",
			"usage.col.tokens": "Tokens",
			"usage.col.share": "Share",
			"usage.heatmap.less": "Less",
			"usage.heatmap.more": "More",
			"usage.dayMon": "Mon",
			"usage.dayWed": "Wed",
			"usage.dayFri": "Fri",
			"usage.heatmap.tooltipTokens": "{tokens} tokens",
			"usage.heatmap.tooltipRequests": "{requests} requests",
			"debug.inbound": "Inbound metadata",
			"debug.inbound.title": "Inbound request metadata",
			"debug.inbound.sub": "All Aezy surfaces. Metadata only; no prompts or credentials are retained.",
			"debug.sub": "Opt-in transport and usage-extraction diagnostics. Request failures stay on the Logs tab.",
			"debug.inbound.empty": "No inbound metadata yet. Enable the switch and send a new request.",
			"debug.inbound.time": "Time",
			"debug.inbound.endpoint": "Endpoint",
			"debug.inbound.model": "Model",
			"debug.inbound.none": "none"
		};
		//#endregion
		//#region src/client/vendor/i18n/shared.ts
		const LOCALES = [{
			code: "en",
			htmlLang: "en"
		}];
		function useI18n() {
			return {
				locale: "en",
				t: ((key, vars) => {
					let text = en[key] ?? key;
					for (const [k, v] of Object.entries(vars ?? {})) text = text.split("{" + k + "}").join(String(v));
					return text;
				})
			};
		}
		//#endregion
		//#region src/client/vendor/provider-icons.ts
		function formatProviderDisplayName(provider) {
			return provider === "openai" ? "OpenAI (Codex login)" : provider === "deepseek" ? "DeepSeek" : provider;
		}
		//#endregion
		//#region src/client/vendor/format-tokens.ts
		/**
		* Locale-aware token-count formatting, shared by Dashboard/Usage/Logs.
		*
		* Western locales use the K/M/B/T thousands scale; CJK locales (ko/zh/zh-TW) use the
		* myriad (1e4) scale — ko 만/억/조/경, zh 万/亿/兆/京, zh-TW 萬/億/兆/京 — which reads
		* naturally there.
		*/
		const CJK_UNITS = {
			ko: [
				{
					v: 0x2386f26fc10000,
					s: "경"
				},
				{
					v: 0xe8d4a51000,
					s: "조"
				},
				{
					v: 1e8,
					s: "억"
				},
				{
					v: 1e4,
					s: "만"
				}
			],
			zh: [
				{
					v: 0x2386f26fc10000,
					s: "京"
				},
				{
					v: 0xe8d4a51000,
					s: "兆"
				},
				{
					v: 1e8,
					s: "亿"
				},
				{
					v: 1e4,
					s: "万"
				}
			],
			"zh-TW": [
				{
					v: 0x2386f26fc10000,
					s: "京"
				},
				{
					v: 0xe8d4a51000,
					s: "兆"
				},
				{
					v: 1e8,
					s: "億"
				},
				{
					v: 1e4,
					s: "萬"
				}
			]
		};
		/** Trim a trailing ".0"/".00" so 12.00만 renders as 12만. */
		function trim(s) {
			return s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
		}
		function formatTokens(n, locale) {
			const units = CJK_UNITS[locale];
			if (units) {
				for (const u of units) if (n >= u.v) return `${trim((n / u.v).toFixed(1))}${u.s}`;
				return String(n);
			}
			if (n < 1e4) return String(n);
			if (n < 1e6) return `${trim((n / 1e3).toFixed(1))}K`;
			if (n < 1e9) return `${trim((n / 1e6).toFixed(1))}M`;
			if (n < 0xe8d4a51000) return `${trim((n / 1e9).toFixed(1))}B`;
			return `${trim((n / 0xe8d4a51000).toFixed(1))}T`;
		}
		//#endregion
		//#region src/client/vendor/log-conversation-id.ts
		/**
		* Client-side conversation filter matching for Logs (#330).
		* Mirrors src/server/request-log-conversation.matchesLogConversationId without Node crypto.
		*/
		const LOG_CONVERSATION_ID_LEN = 24;
		function toHex(bytes) {
			return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
		}
		function hasControlChars(value) {
			for (let i = 0; i < value.length; i++) {
				const code = value.charCodeAt(i);
				if (code <= 31 || code === 127) return true;
			}
			return false;
		}
		/** SHA-256 hex prefix used as the persisted conversation id. */
		async function hashLogConversationQuery(raw) {
			const trimmed = raw.trim();
			if (!trimmed) return void 0;
			if (hasControlChars(trimmed)) return void 0;
			if (trimmed.length > 4096) return void 0;
			return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(trimmed))).slice(0, LOG_CONVERSATION_ID_LEN);
		}
		function matchesLogConversationId(stored, query, queryHash) {
			if (!stored) return false;
			const trimmed = query.trim();
			if (!trimmed) return false;
			if (stored === trimmed) return true;
			return queryHash !== void 0 && stored === queryHash;
		}
		//#endregion
		//#region src/client/vendor/status-codes.ts
		const STATUS_CODES = {
			400: {
				en: {
					label: "Bad request",
					description: "The proxy could not understand the request. Check the model, message shape, headers, and JSON body before retrying."
				},
				fr: {
					label: "Requête incorrecte",
					description: "Le proxy n’a pas pu comprendre la requête. Vérifiez le modèle, la structure des messages, les en-têtes et le corps JSON avant de réessayer."
				},
				ko: {
					label: "잘못된 요청",
					description: "프록시가 요청을 이해할 수 없습니다. 재시도 전에 모델, 메시지 형식, 헤더, JSON 본문을 확인해야 합니다."
				},
				zh: {
					label: "错误请求",
					description: "代理无法理解该请求。重试前请检查模型、消息结构、标头和 JSON 正文。"
				},
				"zh-TW": {
					label: "錯誤請求",
					description: "代理無法理解該請求。重試前請檢查模型、訊息結構、標頭和 JSON 本文。"
				},
				de: {
					label: "Ungültige Anfrage",
					description: "Der Proxy konnte die Anfrage nicht verstehen. Prüfe Modell, Nachrichtenformat, Header und JSON-Body vor einem erneuten Versuch."
				},
				ru: {
					label: "Некорректный запрос",
					description: "Прокси не смог интерпретировать запрос. Перед повторной попыткой проверьте модель, формат сообщений, заголовки и тело JSON."
				},
				ja: {
					label: "不正なリクエスト",
					description: "プロキシがリクエストを解釈できませんでした。再試行前にモデル、メッセージ形式、ヘッダー、JSON 本文を確認してください。"
				},
				tr: {
					label: "Hatalı istek",
					description: "Proxy isteği anlayamadı. Yeniden denemeden önce modeli, mesaj yapısını, başlıkları ve JSON gövdesini kontrol edin."
				}
			},
			401: {
				en: {
					label: "Unauthorized",
					description: "Credentials are missing, expired, or invalid. Re-login or refresh the account/provider credentials used by opencodex."
				},
				fr: {
					label: "Non autorisé",
					description: "Les identifiants sont absents, expirés ou non valides. Reconnectez-vous ou actualisez les identifiants du compte ou du fournisseur utilisés par opencodex."
				},
				ko: {
					label: "인증 필요",
					description: "자격 증명이 없거나 만료되었거나 유효하지 않습니다. opencodex에서 사용하는 계정 또는 제공자 자격 증명을 다시 로그인하거나 갱신해야 합니다."
				},
				zh: {
					label: "未授权",
					description: "凭据缺失、已过期或无效。请重新登录，或刷新 opencodex 使用的账号/提供商凭据。"
				},
				"zh-TW": {
					label: "未授權",
					description: "憑證缺失、已過期或無效。請重新登入，或重新整理 opencodex 使用的帳號/供應商憑證。"
				},
				de: {
					label: "Nicht autorisiert",
					description: "Anmeldedaten fehlen, sind abgelaufen oder ungültig. Melde dich erneut an oder aktualisiere die von opencodex genutzten Konto-/Anbieter-Zugangsdaten."
				},
				ru: {
					label: "Не авторизован",
					description: "Учётные данные отсутствуют, истекли или недействительны. Войдите заново или обновите учётные данные аккаунта или провайдера, которые использует opencodex."
				},
				ja: {
					label: "認証が必要",
					description: "認証情報が不在・期限切れ・無効です。opencodex が使用するアカウントまたはプロバイダー認証情報を再ログインまたは更新してください。"
				},
				tr: {
					label: "Yetkisiz erişim",
					description: "Kimlik bilgileri eksik, süresi dolmuş veya geçersiz. opencodex tarafından kullanılan hesap veya sağlayıcı kimlik bilgilerini yeniden doğrulayın."
				}
			},
			402: {
				en: {
					label: "Payment required",
					description: "The upstream provider rejected the request because billing, credits, or plan access is not available. Add credits, update billing, or switch provider."
				},
				fr: {
					label: "Paiement requis",
					description: "Le fournisseur en amont a rejeté la requête, car la facturation, les crédits ou l’accès à l’offre ne sont pas disponibles. Ajoutez des crédits, mettez à jour la facturation ou changez de fournisseur."
				},
				ko: {
					label: "결제 필요",
					description: "청구, 크레딧, 플랜 접근 권한 문제로 업스트림 제공자가 요청을 거부했습니다. 크레딧 추가, 결제 정보 갱신, 제공자 전환이 필요합니다."
				},
				zh: {
					label: "需要付款",
					description: "上游提供商因账单、额度或套餐权限不可用而拒绝了请求。请充值、更新账单信息或切换提供商。"
				},
				"zh-TW": {
					label: "需要付款",
					description: "上游供應商因帳單、額度或方案許可權不可用而拒絕了請求。請儲值、更新帳單資訊或切換供應商。"
				},
				de: {
					label: "Zahlung erforderlich",
					description: "Der Upstream-Anbieter hat die Anfrage abgelehnt, weil Abrechnung, Guthaben oder Planzugriff nicht verfügbar ist. Guthaben aufladen, Abrechnung aktualisieren oder Anbieter wechseln."
				},
				ru: {
					label: "Требуется оплата",
					description: "Вышестоящий провайдер отклонил запрос из-за проблем с оплатой, кредитами или доступом по тарифному плану. Пополните баланс, обновите платёжные данные или переключитесь на другого провайдера."
				},
				ja: {
					label: "支払いが必要",
					description: "課金、クレジット、プランアクセスが利用できないため上流プロバイダーがリクエストを拒否しました。クレジット追加、支払い情報更新、プロバイダー切替が必要です。"
				},
				tr: {
					label: "Ödeme gerekli",
					description: "Yukarı akış sağlayıcısı faturalandırma, kredi veya plan erişimi bulunmadığından isteği reddetti. Kredi ekleyin, ödeme bilgilerini güncelleyin veya sağlayıcı değiştirin."
				}
			},
			403: {
				en: {
					label: "Forbidden",
					description: "The account is authenticated but not allowed to use this model or operation. Often a plan/subscription gate (e.g. Ollama Cloud Pro), org policy, or model permission — not necessarily a bad API key."
				},
				fr: {
					label: "Accès interdit",
					description: "Le compte est authentifié, mais n’est pas autorisé à utiliser ce modèle ou cette opération. Il s’agit souvent d’une restriction liée à l’offre ou à l’abonnement (p. ex. Ollama Cloud Pro), à la politique de l’organisation ou aux autorisations du modèle — pas nécessairement d’une clé API incorrecte."
				},
				ko: {
					label: "권한 없음",
					description: "계정 인증은 되었지만 이 모델 또는 작업을 사용할 권한이 없습니다. 플랜/구독 제한(예: Ollama Cloud Pro), 조직 정책, 모델 권한 문제인 경우가 많으며 API 키가 잘못된 것은 아닐 수 있습니다."
				},
				zh: {
					label: "禁止访问",
					description: "账号已认证，但无权使用此模型或操作。常见原因是套餐/订阅限制（例如 Ollama Cloud Pro）、组织策略或模型权限——不一定是 API 密钥无效。"
				},
				"zh-TW": {
					label: "禁止存取",
					description: "帳號已認證，但無權使用此模型或操作。常見原因是方案/訂閱限制（例如 Ollama Cloud Pro）、組織策略或模型許可權——不一定是 API 金鑰無效。"
				},
				de: {
					label: "Verboten",
					description: "Das Konto ist authentifiziert, darf dieses Modell oder diese Operation aber nicht nutzen. Oft Plan-/Abo-Sperre (z. B. Ollama Cloud Pro), Organisationsrichtlinie oder Modellrecht — nicht zwingend ein ungültiger API-Key."
				},
				ru: {
					label: "Доступ запрещён",
					description: "Аккаунт аутентифицирован, но не имеет права использовать эту модель или операцию. Часто причина — ограничение тарифа или подписки (например, Ollama Cloud Pro), политика организации или права доступа к модели, а не обязательно неверный API-ключ."
				},
				ja: {
					label: "アクセス禁止",
					description: "アカウントは認証済みですがこのモデルや操作の使用が許可されていません。多くはプラン/サブスクリプション制限（例: Ollama Cloud Pro）、組織ポリシー、モデル権限であり、API キーが不正とは限りません。"
				},
				tr: {
					label: "Erişim yasaklandı",
					description: "Hesabın kimliği doğrulandı ancak bu modeli veya işlemi kullanma izni yok. Genellikle plan/abonelik sınırı (örn. Ollama Cloud Pro), organizasyon politikası veya model izni kaynaklıdır."
				}
			},
			404: {
				en: {
					label: "Not found",
					description: "The requested route, model, account, or upstream resource was not found. Verify the model name and opencodex provider configuration."
				},
				fr: {
					label: "Introuvable",
					description: "La route, le modèle, le compte ou la ressource en amont demandés sont introuvables. Vérifiez le nom du modèle et la configuration du fournisseur opencodex."
				},
				ko: {
					label: "찾을 수 없음",
					description: "요청한 경로, 모델, 계정 또는 업스트림 리소스를 찾을 수 없습니다. 모델 이름과 opencodex 제공자 설정을 확인해야 합니다."
				},
				zh: {
					label: "未找到",
					description: "找不到请求的路由、模型、账号或上游资源。请确认模型名称和 opencodex 提供商配置。"
				},
				"zh-TW": {
					label: "未找到",
					description: "找不到請求的路由、模型、帳號或上游資源。請確認模型名稱和 opencodex 供應商配置。"
				},
				de: {
					label: "Nicht gefunden",
					description: "Die angeforderte Route, das Modell, das Konto oder die Upstream-Ressource wurde nicht gefunden. Prüfe Modellname und opencodex-Anbieterkonfiguration."
				},
				ru: {
					label: "Не найдено",
					description: "Запрошенный маршрут, модель, аккаунт или вышестоящий ресурс не найден. Проверьте имя модели и конфигурацию провайдера в opencodex."
				},
				ja: {
					label: "見つかりません",
					description: "要求されたルート、モデル、アカウント、上流リソースが見つかりませんでした。モデル名と opencodex プロバイダー設定を確認してください。"
				},
				tr: {
					label: "Bulunamadı",
					description: "İstenen rota, model, hesap veya yukarı akış kaynağı bulunamadı. Model adını ve opencodex sağlayıcı yapılandırmasını doğrulayın."
				}
			},
			408: {
				en: {
					label: "Request timeout",
					description: "The request took too long before the proxy or upstream provider could complete it. Retry with a smaller request or a different provider."
				},
				fr: {
					label: "Délai d’attente de la requête dépassé",
					description: "La requête a pris trop de temps pour que le proxy ou le fournisseur en amont puisse la traiter. Réessayez avec une requête plus petite ou un autre fournisseur."
				},
				ko: {
					label: "요청 시간 초과",
					description: "프록시 또는 업스트림 제공자가 요청을 완료하기 전에 시간이 초과되었습니다. 더 작은 요청으로 재시도하거나 다른 제공자로 전환해야 합니다."
				},
				zh: {
					label: "请求超时",
					description: "代理或上游提供商未能在限定时间内完成请求。请缩小请求后重试，或切换提供商。"
				},
				"zh-TW": {
					label: "請求逾時",
					description: "代理或上游供應商未能在限定時間內完成請求。請縮小請求後重試，或切換供應商。"
				},
				de: {
					label: "Anfrage-Timeout",
					description: "Die Anfrage dauerte zu lange, bevor Proxy oder Upstream-Anbieter sie abschließen konnten. Mit kleinerer Anfrage oder anderem Anbieter erneut versuchen."
				},
				ru: {
					label: "Тайм-аут запроса",
					description: "Обработка запроса заняла слишком много времени, и прокси или вышестоящий провайдер не успел её завершить. Повторите попытку с меньшим запросом или через другого провайдера."
				},
				ja: {
					label: "リクエストタイムアウト",
					description: "プロキシまたは上流プロバイダーがリクエストを完了する前に時間切れになりました。より小さいリクエストで再試行するか、別のプロバイダーに切り替えてください。"
				},
				tr: {
					label: "İstek zaman aşımı",
					description: "Proxy veya yukarı akış sağlayıcısı isteği tamamlayamadan zaman aşımına uğradı. Daha küçük bir istek veya farklı bir sağlayıcı ile tekrar deneyin."
				}
			},
			409: {
				en: {
					label: "Conflict",
					description: "The request conflicts with the current account, session, or provider state. Refresh the session or retry after the active operation finishes."
				},
				fr: {
					label: "Conflit",
					description: "La requête entre en conflit avec l’état actuel du compte, de la session ou du fournisseur. Actualisez la session ou réessayez une fois l’opération en cours terminée."
				},
				ko: {
					label: "상태 충돌",
					description: "요청이 현재 계정, 세션 또는 제공자 상태와 충돌합니다. 세션을 갱신하거나 진행 중인 작업이 끝난 뒤 재시도해야 합니다."
				},
				zh: {
					label: "状态冲突",
					description: "请求与当前账号、会话或提供商状态冲突。请刷新会话，或等待当前操作完成后重试。"
				},
				"zh-TW": {
					label: "狀態衝突",
					description: "請求與當前帳號、會話或供應商狀態衝突。請重新整理會話，或等待當前操作完成後重試。"
				},
				de: {
					label: "Konflikt",
					description: "Die Anfrage kollidiert mit dem aktuellen Konto-, Sitzungs- oder Anbieterstatus. Sitzung aktualisieren oder nach Abschluss der laufenden Operation erneut versuchen."
				},
				ru: {
					label: "Конфликт",
					description: "Запрос конфликтует с текущим состоянием аккаунта, сессии или провайдера. Обновите сессию или повторите попытку после завершения текущей операции."
				},
				ja: {
					label: "状態の衝突",
					description: "リクエストが現在のアカウント、セッション、プロバイダー状態と衝突しています。セッションを更新するか、進行中の操作が終わった後に再試行してください。"
				},
				tr: {
					label: "Durum çakışması",
					description: "İstek mevcut hesap, oturum veya sağlayıcı durumuyla çakışıyor. Oturumu yenileyin veya aktif işlem bittikten sonra tekrar deneyin."
				}
			},
			413: {
				en: {
					label: "Request too large",
					description: "The prompt, attachments, or generated payload exceeds a proxy or upstream limit. Reduce tokens, file size, or conversation history."
				},
				fr: {
					label: "Requête trop volumineuse",
					description: "L’invite, les pièces jointes ou la charge utile générée dépassent une limite du proxy ou du fournisseur en amont. Réduisez le nombre de jetons, la taille des fichiers ou l’historique de la conversation."
				},
				ko: {
					label: "요청 과대",
					description: "프롬프트, 첨부 파일 또는 생성 페이로드가 프록시나 업스트림 한도를 초과했습니다. 토큰, 파일 크기, 대화 기록을 줄여야 합니다."
				},
				zh: {
					label: "请求过大",
					description: "提示、附件或生成的负载超过了代理或上游限制。请减少 token、文件大小或对话历史。"
				},
				"zh-TW": {
					label: "請求過大",
					description: "提示、附件或生成的負載超過了代理或上游限制。請減少 token、檔案大小或對話歷史。"
				},
				de: {
					label: "Anfrage zu groß",
					description: "Prompt, Anhänge oder generierte Nutzlast überschreiten ein Proxy- oder Upstream-Limit. Tokens, Dateigröße oder Verlauf reduzieren."
				},
				ru: {
					label: "Слишком большой запрос",
					description: "Промпт, вложения или сформированная полезная нагрузка превышают лимит прокси или вышестоящего провайдера. Сократите количество токенов, размер файлов или историю диалога."
				},
				ja: {
					label: "リクエストが大きすぎます",
					description: "プロンプト、添付ファイル、生成ペイロードがプロキシまたは上流の制限を超えました。トークン、ファイルサイズ、会話履歴を減らしてください。"
				},
				tr: {
					label: "İstek çok büyük",
					description: "İstemi, ekler veya oluşturulan veri proxy ya da yukarı akış sınırını aşıyor. Jeton sayısını, dosya boyutunu veya sohbet geçmişini azaltın."
				}
			},
			422: {
				en: {
					label: "Invalid content",
					description: "The provider accepted the request format but rejected its contents. Check model options, tool definitions, message roles, and unsupported fields."
				},
				fr: {
					label: "Contenu non valide",
					description: "Le fournisseur a accepté le format de la requête, mais en a rejeté le contenu. Vérifiez les options du modèle, les définitions des outils, les rôles des messages et les champs non pris en charge."
				},
				ko: {
					label: "내용 검증 실패",
					description: "제공자가 요청 형식은 받았지만 내용을 거부했습니다. 모델 옵션, 도구 정의, 메시지 역할, 지원되지 않는 필드를 확인해야 합니다."
				},
				zh: {
					label: "内容无效",
					description: "提供商接受了请求格式，但拒绝了其中的内容。请检查模型选项、工具定义、消息角色和不支持的字段。"
				},
				"zh-TW": {
					label: "內容無效",
					description: "供應商接受了請求格式，但拒絕了其中的內容。請檢查模型選項、工具定義、訊息角色和不支援的欄位。"
				},
				de: {
					label: "Ungültiger Inhalt",
					description: "Der Anbieter akzeptierte das Anfrageformat, lehnte den Inhalt aber ab. Prüfe Modelloptionen, Tool-Definitionen, Nachrichtenrollen und nicht unterstützte Felder."
				},
				ru: {
					label: "Недопустимое содержимое",
					description: "Провайдер принял формат запроса, но отклонил его содержимое. Проверьте параметры модели, определения инструментов, роли сообщений и неподдерживаемые поля."
				},
				ja: {
					label: "内容の検証失敗",
					description: "プロバイダーはリクエスト形式を受け付けましたが内容を拒否しました。モデルオプション、ツール定義、メッセージロール、未サポートのフィールドを確認してください。"
				},
				tr: {
					label: "Geçersiz içerik",
					description: "Sağlayıcı istek formatını kabul etti ancak içeriğini reddetti. Model seçeneklerini, araç tanımlarını, mesaj rollerini ve desteklenmeyen alanları kontrol edin."
				}
			},
			424: {
				en: {
					label: "Provider dependency failed",
					description: "A required upstream dependency failed while opencodex was routing the request. Retry later or switch to another configured provider."
				},
				fr: {
					label: "Échec d’une dépendance du fournisseur",
					description: "Une dépendance en amont requise a échoué pendant le routage de la requête par opencodex. Réessayez plus tard ou sélectionnez un autre fournisseur configuré."
				},
				ko: {
					label: "제공자 의존성 실패",
					description: "opencodex가 요청을 라우팅하는 동안 필요한 업스트림 의존성이 실패했습니다. 나중에 재시도하거나 다른 설정된 제공자로 전환해야 합니다."
				},
				zh: {
					label: "提供商依赖失败",
					description: "opencodex 路由请求时，必需的上游依赖失败。请稍后重试，或切换到另一个已配置的提供商。"
				},
				"zh-TW": {
					label: "供應商依賴失敗",
					description: "opencodex 路由請求時，必需的上游依賴失敗。請稍後重試，或切換到另一個已配置的供應商。"
				},
				de: {
					label: "Anbieter-Abhängigkeit fehlgeschlagen",
					description: "Eine erforderliche Upstream-Abhängigkeit ist fehlgeschlagen, während opencodex die Anfrage geroutet hat. Später erneut versuchen oder zu einem anderen Anbieter wechseln."
				},
				ru: {
					label: "Сбой зависимости провайдера",
					description: "Необходимая вышестоящая зависимость дала сбой, пока opencodex маршрутизировал запрос. Повторите попытку позже или переключитесь на другого настроенного провайдера."
				},
				ja: {
					label: "プロバイダー依存の失敗",
					description: "opencodex がリクエストをルーティング中に必要な上流依存が失敗しました。後で再試行するか、別の設定済みプロバイダーに切り替えてください。"
				},
				tr: {
					label: "Sağlayıcı bağımlılığı başarısız",
					description: "opencodex isteği yönlendirirken gerekli bir yukarı akış bağımlılığı başarısız oldu. Daha sonra tekrar deneyin veya başka bir sağlayıcıya geçin."
				}
			},
			429: {
				en: {
					label: "Rate limited",
					description: "The upstream provider rate or quota limit has been reached. Wait for the quota window to reset or switch account/provider."
				},
				fr: {
					label: "Limite de débit atteinte",
					description: "La limite de débit ou de quota du fournisseur en amont a été atteinte. Attendez la réinitialisation de la fenêtre de quota ou changez de compte ou de fournisseur."
				},
				ko: {
					label: "한도 초과",
					description: "업스트림 제공자의 속도 또는 할당량 한도에 도달했습니다. 한도 창이 초기화될 때까지 기다리거나 계정/제공자를 전환해야 합니다."
				},
				zh: {
					label: "限流",
					description: "已达到上游提供商的速率或额度限制。请等待额度窗口重置，或切换账号/提供商。"
				},
				"zh-TW": {
					label: "限流",
					description: "已達到上游供應商的速率或額度限制。請等待額度視窗重設，或切換帳號/供應商。"
				},
				de: {
					label: "Ratenlimit erreicht",
					description: "Das Raten- oder Kontingentlimit des Upstream-Anbieters ist erreicht. Auf Reset des Kontingentfensters warten oder Konto/Anbieter wechseln."
				},
				ru: {
					label: "Превышен лимит запросов",
					description: "Достигнут лимит скорости или квота вышестоящего провайдера. Дождитесь сброса окна квоты или переключитесь на другой аккаунт или провайдера."
				},
				ja: {
					label: "レート制限",
					description: "上流プロバイダーのレートまたはクォータ制限に達しました。クォータウィンドウがリセットされるまで待つか、アカウント/プロバイダーを切り替えてください。"
				},
				tr: {
					label: "Oran sınırı aşıldı",
					description: "Yukarı akış sağlayıcısının hız veya kota sınırına ulaşıldı. Kota penceresinin sıfırlanmasını bekleyin ya da hesap/sağlayıcı değiştirin."
				}
			},
			499: {
				en: {
					label: "Client closed request",
					description: "The client disconnected or canceled the request before opencodex finished routing it. Retry if the cancellation was accidental."
				},
				fr: {
					label: "Requête fermée par le client",
					description: "Le client s’est déconnecté ou a annulé la requête avant la fin de son routage par opencodex. Réessayez si l’annulation était involontaire."
				},
				ko: {
					label: "클라이언트 취소",
					description: "opencodex가 라우팅을 끝내기 전에 클라이언트 연결이 끊기거나 요청이 취소되었습니다. 의도한 취소가 아니면 다시 시도해야 합니다."
				},
				zh: {
					label: "客户端已取消",
					description: "opencodex 完成路由前，客户端已断开连接或取消请求。如果不是有意取消，请重试。"
				},
				"zh-TW": {
					label: "客戶端已取消",
					description: "opencodex 完成路由前，客戶端已斷開連線或取消請求。如果不是有意取消，請重試。"
				},
				de: {
					label: "Client hat Anfrage geschlossen",
					description: "Der Client hat die Verbindung getrennt oder die Anfrage abgebrochen, bevor opencodex das Routing abgeschlossen hat. Bei versehentlichem Abbruch erneut versuchen."
				},
				ru: {
					label: "Запрос закрыт клиентом",
					description: "Клиент отключился или отменил запрос до того, как opencodex завершил его маршрутизацию. Если отмена была случайной, повторите попытку."
				},
				ja: {
					label: "クライアントがリクエストをクローズ",
					description: "opencodex がルーティングを終える前にクライアントが切断またはキャンセルしました。意図しないキャンセルなら再試行してください。"
				},
				tr: {
					label: "İstemci isteği kapattı",
					description: "opencodex yönlendirmeyi bitirmeden önce istemci bağlantıyı kesti veya isteği iptal etti. İptal kazara yapıldıysa tekrar deneyin."
				}
			},
			500: {
				en: {
					label: "Proxy error",
					description: "opencodex hit an internal error while handling the request. Retry once, then check proxy logs if it repeats."
				},
				fr: {
					label: "Erreur du proxy",
					description: "opencodex a rencontré une erreur interne lors du traitement de la requête. Réessayez une fois, puis consultez les journaux du proxy si l’erreur se reproduit."
				},
				ko: {
					label: "프록시 오류",
					description: "opencodex가 요청을 처리하는 동안 내부 오류가 발생했습니다. 한 번 재시도하고 반복되면 프록시 로그를 확인해야 합니다."
				},
				zh: {
					label: "代理错误",
					description: "opencodex 处理请求时发生内部错误。请先重试一次；如果重复出现，请检查代理日志。"
				},
				"zh-TW": {
					label: "代理錯誤",
					description: "opencodex 處理請求時發生內部錯誤。請先重試一次；如果重複出現，請檢查代理日誌。"
				},
				de: {
					label: "Proxy-Fehler",
					description: "opencodex ist bei der Anfragebearbeitung auf einen internen Fehler gestoßen. Einmal erneut versuchen, bei Wiederholung Proxy-Logs prüfen."
				},
				ru: {
					label: "Ошибка прокси",
					description: "В opencodex произошла внутренняя ошибка при обработке запроса. Повторите попытку один раз; если ошибка повторяется, проверьте логи прокси."
				},
				ja: {
					label: "プロキシエラー",
					description: "opencodex がリクエスト処理中に内部エラーに遭遇しました。1 回再試行し、繰り返す場合はプロキシログを確認してください。"
				},
				tr: {
					label: "Proxy hatası",
					description: "opencodex isteği işlerken dahili bir hatayla karşılaştı. Bir kez tekrar deneyin, tekrarlarsa proxy günlüklerini kontrol edin."
				}
			},
			502: {
				en: {
					label: "Bad upstream response",
					description: "The upstream provider returned an invalid or failed response through the proxy. Retry or route the request to another provider."
				},
				fr: {
					label: "Réponse incorrecte du fournisseur en amont",
					description: "Le fournisseur en amont a renvoyé une réponse non valide ou en échec par l’intermédiaire du proxy. Réessayez ou acheminez la requête vers un autre fournisseur."
				},
				ko: {
					label: "업스트림 응답 오류",
					description: "업스트림 제공자가 프록시를 통해 유효하지 않거나 실패한 응답을 반환했습니다. 재시도하거나 다른 제공자로 라우팅해야 합니다."
				},
				zh: {
					label: "上游响应错误",
					description: "上游提供商通过代理返回了无效或失败的响应。请重试，或将请求路由到其他提供商。"
				},
				"zh-TW": {
					label: "上游回應錯誤",
					description: "上游供應商透過代理返回了無效或失敗的回應。請重試，或將請求路由到其他供應商。"
				},
				de: {
					label: "Ungültige Upstream-Antwort",
					description: "Der Upstream-Anbieter lieferte über den Proxy eine ungültige oder fehlgeschlagene Antwort. Erneut versuchen oder zu einem anderen Anbieter routen."
				},
				ru: {
					label: "Некорректный ответ провайдера",
					description: "Вышестоящий провайдер вернул через прокси недействительный или ошибочный ответ. Повторите попытку или направьте запрос другому провайдеру."
				},
				ja: {
					label: "上流レスポンス不良",
					description: "上流プロバイダーがプロキシ経由で無効または失敗したレスポンスを返しました。再試行するか、リクエストを別のプロバイダーにルーティングしてください。"
				},
				tr: {
					label: "Kötü yukarı akış yanıtı",
					description: "Yukarı akış sağlayıcısı proxy üzerinden geçersiz veya başarısız bir yanıt döndürdü. Tekrar deneyin veya isteği başka bir sağlayıcıya yönlendirin."
				}
			},
			503: {
				en: {
					label: "Provider unavailable",
					description: "The proxy or upstream provider is temporarily unavailable or overloaded. Wait briefly, then retry or switch provider."
				},
				fr: {
					label: "Fournisseur indisponible",
					description: "Le proxy ou le fournisseur en amont est temporairement indisponible ou surchargé. Patientez un instant, puis réessayez ou changez de fournisseur."
				},
				ko: {
					label: "제공자 사용 불가",
					description: "프록시 또는 업스트림 제공자가 일시적으로 사용할 수 없거나 과부하 상태입니다. 잠시 기다린 뒤 재시도하거나 제공자를 전환해야 합니다."
				},
				zh: {
					label: "提供商不可用",
					description: "代理或上游提供商暂时不可用或过载。请稍后重试，或切换提供商。"
				},
				"zh-TW": {
					label: "供應商不可用",
					description: "代理或上游供應商暫時不可用或過載。請稍後重試，或切換供應商。"
				},
				de: {
					label: "Anbieter nicht verfügbar",
					description: "Proxy oder Upstream-Anbieter ist vorübergehend nicht verfügbar oder überlastet. Kurz warten, dann erneut versuchen oder Anbieter wechseln."
				},
				ru: {
					label: "Провайдер недоступен",
					description: "Прокси или вышестоящий провайдер временно недоступен или перегружен. Немного подождите, затем повторите попытку или смените провайдера."
				},
				ja: {
					label: "プロバイダー利用不可",
					description: "プロキシまたは上流プロバイダーが一時的に利用不可または過負荷です。少し待ってから再試行するか、プロバイダーを切り替えてください。"
				},
				tr: {
					label: "Sağlayıcı kullanılamıyor",
					description: "Proxy veya yukarı akış sağlayıcısı geçici olarak kullanılamıyor veya aşırı yüklü. Kısa bir süre bekleyip tekrar deneyin ya da sağlayıcı değiştirin."
				}
			},
			504: {
				en: {
					label: "Upstream timeout",
					description: "The upstream provider did not respond before the proxy timeout. Retry with a smaller request or choose a faster provider."
				},
				fr: {
					label: "Délai d’attente du fournisseur en amont dépassé",
					description: "Le fournisseur en amont n’a pas répondu avant l’expiration du délai du proxy. Réessayez avec une requête plus petite ou choisissez un fournisseur plus rapide."
				},
				ko: {
					label: "업스트림 시간 초과",
					description: "프록시 시간 제한 전에 업스트림 제공자가 응답하지 않았습니다. 더 작은 요청으로 재시도하거나 더 빠른 제공자를 선택해야 합니다."
				},
				zh: {
					label: "上游超时",
					description: "上游提供商未在代理超时前响应。请缩小请求后重试，或选择响应更快的提供商。"
				},
				"zh-TW": {
					label: "上游逾時",
					description: "上游供應商未在代理逾時前回應。請縮小請求後重試，或選擇回應更快的供應商。"
				},
				de: {
					label: "Upstream-Timeout",
					description: "Der Upstream-Anbieter antwortete nicht vor dem Proxy-Timeout. Mit kleinerer Anfrage erneut versuchen oder schnelleren Anbieter wählen."
				},
				ru: {
					label: "Тайм-аут вышестоящего провайдера",
					description: "Вышестоящий провайдер не ответил до истечения тайм-аута прокси. Повторите попытку с меньшим запросом или выберите более быстрого провайдера."
				},
				ja: {
					label: "上流タイムアウト",
					description: "上流プロバイダーがプロキシタイムアウト前に応答しませんでした。より小さいリクエストで再試行するか、より速いプロバイダーを選んでください。"
				},
				tr: {
					label: "Yukarı akış zaman aşımı",
					description: "Yukarı akış sağlayıcısı proxy zaman aşımı süresinden önce yanıt vermedi. Daha küçük bir istekle tekrar deneyin veya daha hızlı bir sağlayıcı seçin."
				}
			},
			529: {
				en: {
					label: "Provider overloaded",
					description: "The upstream provider is overloaded or capacity-limited. Wait and retry, or switch to another account/provider."
				},
				fr: {
					label: "Fournisseur surchargé",
					description: "Le fournisseur en amont est surchargé ou sa capacité est limitée. Patientez et réessayez, ou changez de compte ou de fournisseur."
				},
				ko: {
					label: "제공자 과부하",
					description: "업스트림 제공자가 과부하 상태이거나 처리 용량이 제한되었습니다. 기다렸다가 재시도하거나 다른 계정/제공자로 전환해야 합니다."
				},
				zh: {
					label: "提供商过载",
					description: "上游提供商过载或容量受限。请等待后重试，或切换到其他账号/提供商。"
				},
				"zh-TW": {
					label: "供應商過載",
					description: "上游供應商過載或容量受限。請等待後重試，或切換到其他帳號/供應商。"
				},
				de: {
					label: "Anbieter überlastet",
					description: "Der Upstream-Anbieter ist überlastet oder kapazitätsbegrenzt. Warten und erneut versuchen oder anderes Konto/Anbieter nutzen."
				},
				ru: {
					label: "Провайдер перегружен",
					description: "Вышестоящий провайдер перегружен или ограничен по мощности. Подождите и повторите попытку либо переключитесь на другой аккаунт или провайдера."
				},
				ja: {
					label: "プロバイダー過負荷",
					description: "上流プロバイダーが過負荷または容量制限されています。待ってから再試行するか、別のアカウント/プロバイダーに切り替えてください。"
				},
				tr: {
					label: "Sağlayıcı aşırı yüklü",
					description: "Yukarı akış sağlayıcısı aşırı yüklü veya kapasitesi sınırlı. Bekleyip tekrar deneyin veya başka bir hesap/sağlayıcıya geçin."
				}
			}
		};
		const GENERIC_STATUS = {
			client: {
				en: {
					label: "Request error",
					description: "The proxy or upstream provider rejected the request. Check the request shape, credentials, model name, and provider configuration."
				},
				fr: {
					label: "Erreur de requête",
					description: "Le proxy ou le fournisseur en amont a rejeté la requête. Vérifiez sa structure, les identifiants, le nom du modèle et la configuration du fournisseur."
				},
				ko: {
					label: "요청 오류",
					description: "프록시 또는 업스트림 제공자가 요청을 거부했습니다. 요청 형식, 자격 증명, 모델 이름, 제공자 설정을 확인해야 합니다."
				},
				zh: {
					label: "请求错误",
					description: "代理或上游提供商拒绝了该请求。请检查请求结构、凭据、模型名称和提供商配置。"
				},
				"zh-TW": {
					label: "請求錯誤",
					description: "代理或上游供應商拒絕了該請求。請檢查請求結構、憑證、模型名稱和供應商配置。"
				},
				de: {
					label: "Anfragefehler",
					description: "Der Proxy oder Upstream-Anbieter hat die Anfrage abgelehnt. Prüfe Anfrageformat, Anmeldedaten, Modellname und Anbieterkonfiguration."
				},
				ru: {
					label: "Ошибка запроса",
					description: "Прокси или вышестоящий провайдер отклонил запрос. Проверьте структуру запроса, учётные данные, имя модели и конфигурацию провайдера."
				},
				ja: {
					label: "リクエストエラー",
					description: "プロキシまたは上流プロバイダーがリクエストを拒否しました。リクエスト形式、認証情報、モデル名、プロバイダー設定を確認してください。"
				},
				tr: {
					label: "İstek hatası",
					description: "Proxy veya yukarı akış sağlayıcısı isteği reddetti. İstek yapısını, kimlik bilgilerini, model adını ve sağlayıcı yapılandırmasını kontrol edin."
				}
			},
			server: {
				en: {
					label: "Server or upstream error",
					description: "opencodex or an upstream provider failed while processing the request. Retry later or route the request to another provider."
				},
				fr: {
					label: "Erreur du serveur ou du fournisseur en amont",
					description: "opencodex ou un fournisseur en amont a échoué lors du traitement de la requête. Réessayez plus tard ou acheminez la requête vers un autre fournisseur."
				},
				ko: {
					label: "서버 또는 업스트림 오류",
					description: "opencodex 또는 업스트림 제공자가 요청 처리 중 실패했습니다. 나중에 재시도하거나 다른 제공자로 라우팅해야 합니다."
				},
				zh: {
					label: "服务器或上游错误",
					description: "opencodex 或上游提供商处理请求时失败。请稍后重试，或将请求路由到其他提供商。"
				},
				"zh-TW": {
					label: "伺服器或上游錯誤",
					description: "opencodex 或上游供應商處理請求時失敗。請稍後重試，或將請求路由到其他供應商。"
				},
				de: {
					label: "Server- oder Upstream-Fehler",
					description: "opencodex oder ein Upstream-Anbieter ist bei der Anfragebearbeitung fehlgeschlagen. Später erneut versuchen oder zu einem anderen Anbieter routen."
				},
				ru: {
					label: "Ошибка сервера или провайдера",
					description: "opencodex или вышестоящий провайдер завершил обработку запроса с ошибкой. Повторите попытку позже или направьте запрос другому провайдеру."
				},
				ja: {
					label: "サーバーまたは上流エラー",
					description: "opencodex または上流プロバイダーがリクエスト処理中に失敗しました。後で再試行するか、リクエストを別のプロバイダーにルーティングしてください。"
				},
				tr: {
					label: "Sunucu veya yukarı akış hatası",
					description: "opencodex veya bir yukarı akış sağlayıcısı isteği işlerken başarısız oldu. Daha sonra tekrar deneyin veya isteği başka bir sağlayıcıya yönlendirin."
				}
			}
		};
		function normalizeLocale(locale) {
			if (locale.toLowerCase().startsWith("fr")) return "fr";
			return locale === "de" || locale === "ko" || locale === "zh" || locale === "zh-TW" || locale === "ru" || locale === "ja" || locale === "tr" ? locale : "en";
		}
		function statusCodeInfo(code, locale) {
			if (code < 400) return null;
			const normalizedLocale = normalizeLocale(locale);
			return (STATUS_CODES[Math.trunc(code)] ?? (code < 500 ? GENERIC_STATUS.client : GENERIC_STATUS.server))[normalizedLocale];
		}
		//#endregion
		//#region src/client/vendor/icons.tsx
		const S = (props) => ({
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 2,
			strokeLinecap: "round",
			strokeLinejoin: "round",
			...props
		});
		const IconCheck = (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			...S(p),
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m20 6-11 11-5-5" })
		});
		const IconX = (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			...S(p),
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 6 6 18M6 6l12 12" })
		});
		const IconRefresh = (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			...S(p),
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 12a9 9 0 0 1-9 9 9.8 9.8 0 0 1-6.7-2.7L3 16M3 21v-5h5M3 12a9 9 0 0 1 9-9 9.8 9.8 0 0 1 6.7 2.7L21 8M21 3v5h-5" })
		});
		const IconAlert = (p) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			...S(p),
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 9v4M12 17h.01" })]
		});
		//#endregion
		//#region src/client/vendor/model-display.ts
		function modelLabel(model) {
			return model;
		}
		//#endregion
		//#region src/client/vendor/session-list-cache.ts
		/**
		* SessionStorage helpers for non-secret GUI list/summary shapes (SWR seeds).
		* Never store API keys, tokens, or credentials here — XSS can read sessionStorage.
		*/
		/** Envelope marker: distinguishes a timestamped entry from a legacy raw value. */
		const CACHED_AT_KEY = "__ocxCachedAt";
		function readSessionListCache(key) {
			try {
				const raw = sessionStorage.getItem(key);
				if (!raw) return null;
				const parsed = JSON.parse(raw);
				if (isEntryEnvelope(parsed)) return parsed.data;
				return parsed;
			} catch {
				return null;
			}
		}
		function isEntryEnvelope(value) {
			return typeof value === "object" && value !== null && typeof value[CACHED_AT_KEY] === "number" && "data" in value;
		}
		/**
		* Read a seed with its age. A legacy (untimestamped) value reads as `cachedAt: null`,
		* which every caller treats as stale — so an existing cache self-heals on first use
		* instead of pinning old data.
		*/
		function readSessionListCacheEntry(key) {
			try {
				const raw = sessionStorage.getItem(key);
				if (!raw) return null;
				const parsed = JSON.parse(raw);
				if (isEntryEnvelope(parsed)) return {
					data: parsed.data,
					cachedAt: parsed[CACHED_AT_KEY]
				};
				return {
					data: parsed,
					cachedAt: null
				};
			} catch {
				return null;
			}
		}
		/** Write a seed with its write time so a revisit can decide whether to revalidate. */
		function writeSessionListCacheEntry(key, data) {
			try {
				sessionStorage.setItem(key, JSON.stringify({
					[CACHED_AT_KEY]: Date.now(),
					data
				}));
			} catch {}
		}
		function writeSessionListCache(key, value) {
			try {
				sessionStorage.setItem(key, JSON.stringify(value));
			} catch {}
		}
		//#endregion
		//#region src/client/vendor/client-resource.ts
		/**
		* Module cache keyed by string. Call sites must not reuse the same key for
		* different resource types (no runtime check — keys are an API contract).
		*/
		const stores = /* @__PURE__ */ new Map();
		/**
		* Per-attempt deadline for every store fetch. Endpoints documented as slow finish in
		* ~5s; 30s leaves generous headroom. Without this a hung request wedges the store
		* forever: poll ticks skip while inflight and no abort ever fires on its own.
		*/
		const DEFAULT_REQUEST_DEADLINE_MS = 3e4;
		/** Abort-reason sentinel distinguishing the deadline from owner aborts (replace/unmount). */
		const RESOURCE_TIMEOUT = "aezy-observability-resource-deadline";
		const EMPTY_SNAPSHOT = {
			data: void 0,
			error: void 0,
			loading: false,
			refreshing: false,
			hasSucceeded: false,
			lastAttemptOk: false
		};
		function getStore(key) {
			let store = stores.get(key);
			if (!store) {
				store = {
					snapshot: {
						data: void 0,
						error: void 0,
						loading: false,
						refreshing: false,
						hasSucceeded: false,
						lastAttemptOk: false
					},
					listeners: /* @__PURE__ */ new Set(),
					pollByListener: /* @__PURE__ */ new Map(),
					pauseWhenHiddenByListener: /* @__PURE__ */ new Map(),
					fetcherByListener: /* @__PURE__ */ new Map(),
					deadlineByListener: /* @__PURE__ */ new Map(),
					subscriberCount: 0,
					pollIntervalMs: void 0,
					inflight: null,
					inflightOwner: null,
					generation: 0,
					seedNeedsRevalidate: false,
					lastSettledAt: void 0
				};
				stores.set(key, store);
			}
			return store;
		}
		function emit(store) {
			for (const listener of store.listeners) listener();
		}
		const pollBuckets = /* @__PURE__ */ new Map();
		/** True when any polling subscriber opted out of hidden pausing (e.g. restart watch). */
		function anyOptOut(store) {
			for (const [listener, ms] of store.pollByListener) if (typeof ms === "number" && ms > 0 && store.pauseWhenHiddenByListener.get(listener) === false) return true;
			return false;
		}
		/** A bucket may hold a timer only while some member store is eligible to tick. */
		function bucketShouldRun(bucket) {
			if (bucket.stores.size === 0) return false;
			if (!documentIsHidden()) return true;
			for (const store of bucket.stores) if (anyOptOut(store)) return true;
			return false;
		}
		function runBucketTick(bucket) {
			for (const store of bucket.stores) {
				const entry = pickPollEntry(store);
				if (!entry) continue;
				runFetch(store, entry.fetcher, {
					replaceInflight: false,
					owner: entry.owner,
					deadlineMs: entry.deadlineMs
				});
			}
		}
		/** Arm or disarm a bucket's single timer to match its current eligibility. */
		function syncBucketTimer(intervalMs, bucket) {
			const shouldRun = bucketShouldRun(bucket);
			if (shouldRun && bucket.timer === null) {
				bucket.timer = setInterval(() => runBucketTick(bucket), intervalMs);
				return;
			}
			if (!shouldRun && bucket.timer !== null) {
				clearInterval(bucket.timer);
				bucket.timer = null;
			}
			if (bucket.stores.size === 0) pollBuckets.delete(intervalMs);
		}
		/** Re-evaluate every bucket. Called on visibility transitions (one listener, not N). */
		function syncAllBuckets() {
			for (const [intervalMs, bucket] of [...pollBuckets]) syncBucketTimer(intervalMs, bucket);
		}
		function leavePollBucket(store) {
			const current = store.pollIntervalMs;
			if (current === void 0) return;
			const bucket = pollBuckets.get(current);
			store.pollIntervalMs = void 0;
			if (!bucket) return;
			bucket.stores.delete(store);
			syncBucketTimer(current, bucket);
		}
		function joinPollBucket(store, intervalMs) {
			let bucket = pollBuckets.get(intervalMs);
			if (!bucket) {
				bucket = {
					timer: null,
					stores: /* @__PURE__ */ new Set()
				};
				pollBuckets.set(intervalMs, bucket);
			}
			bucket.stores.add(store);
			store.pollIntervalMs = intervalMs;
			syncBucketTimer(intervalMs, bucket);
		}
		/** True when the document is currently hidden. Safe on non-browser runtimes. */
		function documentIsHidden() {
			return typeof document !== "undefined" && document.visibilityState === "hidden";
		}
		/**
		* Pick a subscriber whose poll may run right now.
		*
		* While the document is hidden only subscribers that opted out of pausing are eligible:
		* a background tab has no one reading the paint, but a restart-reconnect poll still has
		* to notice the server coming back. When nothing opted out, the tick is skipped entirely.
		*/
		function pickPollEntry(store) {
			if (!documentIsHidden()) return pickFetcherEntry(store);
			for (const [listener, ms] of store.pollByListener) {
				if (typeof ms !== "number" || ms <= 0) continue;
				if (store.pauseWhenHiddenByListener.get(listener) === false) {
					const fetcher = store.fetcherByListener.get(listener);
					if (fetcher) return {
						owner: listener,
						fetcher,
						deadlineMs: store.deadlineByListener.get(listener)
					};
				}
			}
			return null;
		}
		/** Prefer a polling subscriber's fetcher; otherwise any remaining subscriber. */
		function pickFetcherEntry(store) {
			for (const [listener, ms] of store.pollByListener) if (typeof ms === "number" && ms > 0) {
				const fetcher = store.fetcherByListener.get(listener);
				if (fetcher) return {
					owner: listener,
					fetcher,
					deadlineMs: store.deadlineByListener.get(listener)
				};
			}
			for (const [listener, fetcher] of store.fetcherByListener) return {
				owner: listener,
				fetcher,
				deadlineMs: store.deadlineByListener.get(listener)
			};
			return null;
		}
		/** Honor the most aggressive (smallest positive) poll interval among subscribers. */
		function recomputePoll(store) {
			let pollMs;
			for (const ms of store.pollByListener.values()) if (typeof ms === "number" && ms > 0) pollMs = pollMs === void 0 ? ms : Math.min(pollMs, ms);
			if (pollMs === void 0) {
				leavePollBucket(store);
				removeVisibilityListener(store);
				return;
			}
			if (pollMs === store.pollIntervalMs) {
				const bucket = pollBuckets.get(pollMs);
				if (bucket) syncBucketTimer(pollMs, bucket);
				ensureVisibilityListener(store);
				return;
			}
			leavePollBucket(store);
			joinPollBucket(store, pollMs);
			ensureVisibilityListener(store);
		}
		/**
		* ONE listener for the whole module, not one per store. Timers are shared by bucket,
		* so a visibility flip is a single global re-evaluation: hidden buckets with no
		* opt-out member drop their timers outright (zero wakeups), visible ones re-arm, and
		* every store that polls gets one quiet make-up fetch. A per-store listener would run
		* that same global sweep N times per flip.
		*
		* `replaceInflight: false` keeps this from cancelling work a visible-again mount just
		* started; if something is already loading, that request is the fresh answer.
		*/
		let moduleVisibilityListener = null;
		function ensureVisibilityListener(_store) {
			if (typeof document === "undefined" || moduleVisibilityListener) return;
			const onVisibility = () => {
				syncAllBuckets();
				if (documentIsHidden()) return;
				for (const bucket of pollBuckets.values()) for (const store of bucket.stores) {
					const entry = pickFetcherEntry(store);
					if (!entry) continue;
					runFetch(store, entry.fetcher, {
						replaceInflight: false,
						owner: entry.owner,
						deadlineMs: entry.deadlineMs
					});
				}
			};
			document.addEventListener("visibilitychange", onVisibility);
			moduleVisibilityListener = onVisibility;
		}
		/** Drop the shared listener once nothing polls at all. */
		function removeVisibilityListener(_store) {
			if (!moduleVisibilityListener) return;
			if (pollBuckets.size > 0) return;
			if (typeof document !== "undefined") document.removeEventListener("visibilitychange", moduleVisibilityListener);
			moduleVisibilityListener = null;
		}
		async function runFetch(store, fetcher, options) {
			const replaceInflight = options?.replaceInflight !== false;
			if (store.inflight && !replaceInflight) return;
			if (replaceInflight) store.inflight?.abort();
			const controller = new AbortController();
			store.inflight = controller;
			store.inflightOwner = options?.owner ?? null;
			const gen = ++store.generation;
			/**
			* Every attempt has a deadline, enforced two ways at once:
			* - the abort tells well-behaved fetchers to stop (with RESOURCE_TIMEOUT as the
			*   reason, so the settle guard can tell the deadline apart from an owner abort);
			* - the race settles the store even when a fetcher drops the signal entirely.
			* Without the flag, a fallback that aborts the guarded controller would make a
			* timeout indistinguishable from an owner abort and the store would never settle.
			*/
			const deadlineMs = options?.deadlineMs ?? DEFAULT_REQUEST_DEADLINE_MS;
			let timedOut = false;
			const deadlineTimer = setTimeout(() => {
				timedOut = true;
				controller.abort(RESOURCE_TIMEOUT);
			}, deadlineMs);
			const shouldShowLoading = store.snapshot.data === void 0 || options?.forceLoading === true;
			store.snapshot = {
				...store.snapshot,
				loading: shouldShowLoading ? true : store.snapshot.loading,
				refreshing: true
			};
			emit(store);
			try {
				const data = await Promise.race([fetcher(controller.signal), new Promise((resolve, reject) => {
					controller.signal.addEventListener("abort", () => {
						if (timedOut) reject(/* @__PURE__ */ new Error(`resource request timed out after ${deadlineMs}ms`));
						else resolve(null);
					}, { once: true });
				})]);
				if (gen !== store.generation || controller.signal.aborted) return;
				store.seedNeedsRevalidate = false;
				store.lastSettledAt = Date.now();
				store.snapshot = {
					data,
					error: void 0,
					loading: false,
					refreshing: false,
					hasSucceeded: true,
					lastAttemptOk: true
				};
			} catch (error) {
				if (gen !== store.generation) return;
				if (controller.signal.aborted && !timedOut) return;
				store.seedNeedsRevalidate = false;
				store.snapshot = {
					...store.snapshot,
					error: error === void 0 ? /* @__PURE__ */ new Error("resource load failed") : error,
					loading: false,
					refreshing: false,
					lastAttemptOk: false
				};
			} finally {
				clearTimeout(deadlineTimer);
				if (store.inflight === controller) {
					store.inflight = null;
					store.inflightOwner = null;
				}
				emit(store);
			}
		}
		function abortInflightOwnedBy(store, owner) {
			if (store.inflightOwner !== owner) return false;
			store.inflight?.abort();
			store.inflight = null;
			store.inflightOwner = null;
			store.generation++;
			if (store.snapshot.refreshing) {
				store.snapshot = {
					...store.snapshot,
					refreshing: false
				};
				emit(store);
			}
			return true;
		}
		/**
		* Drop the module cache only after a macrotask so React's subscribe teardown +
		* resubscribe (pollMs / enabled / key churn) can reattach in the same turn
		* without wiping cached data.
		*/
		function scheduleStoreEviction(key, store) {
			leavePollBucket(store);
			removeVisibilityListener(store);
			setTimeout(() => {
				if (store.subscriberCount !== 0) return;
				if (stores.get(key) !== store) return;
				store.inflight?.abort();
				store.inflight = null;
				store.inflightOwner = null;
				stores.delete(key);
			}, 0);
		}
		function subscribeResource(key, onStoreChange, registration) {
			const { fetcher, pollMs, pauseWhenHidden = true, deadlineMs, staleAfterMs } = registration;
			const store = getStore(key);
			store.listeners.add(onStoreChange);
			store.pollByListener.set(onStoreChange, pollMs);
			store.pauseWhenHiddenByListener.set(onStoreChange, pauseWhenHidden);
			store.fetcherByListener.set(onStoreChange, fetcher);
			store.deadlineByListener.set(onStoreChange, deadlineMs);
			store.subscriberCount++;
			if (store.subscriberCount === 1) {
				const stale = typeof staleAfterMs === "number" && store.lastSettledAt !== void 0 && Date.now() - store.lastSettledAt > staleAfterMs;
				if (store.snapshot.data === void 0 || store.seedNeedsRevalidate || stale) runFetch(store, fetcher, {
					replaceInflight: true,
					owner: onStoreChange,
					deadlineMs
				});
			}
			recomputePoll(store);
			return () => {
				store.listeners.delete(onStoreChange);
				store.pollByListener.delete(onStoreChange);
				store.pauseWhenHiddenByListener.delete(onStoreChange);
				store.fetcherByListener.delete(onStoreChange);
				store.deadlineByListener.delete(onStoreChange);
				store.subscriberCount--;
				const abortedOwned = abortInflightOwnedBy(store, onStoreChange);
				if (store.subscriberCount === 0) {
					scheduleStoreEviction(key, store);
					return;
				}
				if (abortedOwned) {
					const entry = pickFetcherEntry(store);
					if (entry) runFetch(store, entry.fetcher, {
						replaceInflight: true,
						owner: entry.owner,
						deadlineMs: entry.deadlineMs
					});
				}
				recomputePoll(store);
			};
		}
		/** Seed an empty, unsubscribed store. No-ops when data already exists or someone is listening. */
		function seedClientResourceIfEmpty(key, data, cachedAt, staleAfterMs) {
			const store = getStore(key);
			if (store.subscriberCount !== 0 || store.snapshot.data !== void 0) return;
			setClientResourceData(key, data);
			if (typeof staleAfterMs === "number" && typeof cachedAt === "number" && Date.now() - cachedAt < staleAfterMs) {
				store.seedNeedsRevalidate = false;
				store.lastSettledAt = cachedAt;
			}
		}
		function useClientResource(key, fetcher, options) {
			const enabled = options?.enabled !== false;
			const pollMs = options?.pollMs;
			const pauseWhenHidden = options?.pauseWhenHidden !== false;
			const deadlineMs = options?.deadlineMs;
			const staleAfterMs = options?.staleAfterMs;
			if (enabled && options?.initialData !== void 0) seedClientResourceIfEmpty(key, options.initialData, options.initialDataCachedAt, staleAfterMs);
			const fetcherRef = (0, react.useRef)(fetcher);
			(0, react.useLayoutEffect)(() => {
				fetcherRef.current = fetcher;
			});
			const stableFetcher = (0, react.useCallback)((signal) => fetcherRef.current(signal), []);
			const listenerRef = (0, react.useRef)(null);
			const subscribe = (0, react.useCallback)((onStoreChange) => {
				if (!enabled) return () => {};
				listenerRef.current = onStoreChange;
				return subscribeResource(key, onStoreChange, {
					fetcher: stableFetcher,
					pollMs,
					pauseWhenHidden,
					deadlineMs,
					staleAfterMs
				});
			}, [
				key,
				stableFetcher,
				pollMs,
				enabled,
				pauseWhenHidden,
				deadlineMs,
				staleAfterMs
			]);
			const getSnapshot = (0, react.useCallback)(() => {
				if (!enabled) return EMPTY_SNAPSHOT;
				return getStore(key).snapshot;
			}, [key, enabled]);
			const snapshot = (0, react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
			const refresh = (0, react.useCallback)((opts) => {
				if (!enabled) return;
				const store = getStore(key);
				runFetch(store, stableFetcher, {
					replaceInflight: true,
					owner: listenerRef.current,
					forceLoading: opts?.forceLoading,
					deadlineMs: listenerRef.current ? store.deadlineByListener.get(listenerRef.current) : deadlineMs
				});
			}, [
				key,
				stableFetcher,
				enabled,
				deadlineMs
			]);
			return {
				...snapshot,
				refresh
			};
		}
		function depsChanged(prev, next) {
			if (prev === null) return false;
			if (prev.length !== next.length) return true;
			for (let i = 0; i < prev.length; i++) if (!Object.is(prev[i], next[i])) return true;
			return false;
		}
		/**
		* Like `useClientResource`, but refetches when `deps` change (element-wise
		* `Object.is`), even if the cache `key` stays the same. Callers may allocate a
		* fresh deps array each render — identity of the array is ignored.
		* Deps changes force `loading: true` while retaining previous data until the
		* new response arrives (unlike quiet poll refreshes).
		*/
		function useKeyedClientResource(key, deps, load, options) {
			const resource = useClientResource(key, load, options);
			const prevDepsRef = (0, react.useRef)(null);
			const prevKeyRef = (0, react.useRef)(null);
			(0, react.useLayoutEffect)(() => {
				const prev = prevDepsRef.current;
				const prevKey = prevKeyRef.current;
				prevDepsRef.current = deps;
				prevKeyRef.current = key;
				if (!depsChanged(prev, deps)) return;
				if (prevKey !== null && prevKey !== key) return;
				resource.refresh({ forceLoading: true });
			});
			return resource;
		}
		/** Publish data for a key and invalidate any in-flight fetch so it cannot stomp this write. */
		function setClientResourceData(key, data) {
			const store = getStore(key);
			store.inflight?.abort();
			store.inflight = null;
			store.inflightOwner = null;
			store.generation++;
			store.snapshot = {
				data,
				error: void 0,
				loading: false,
				refreshing: false,
				hasSucceeded: true,
				lastAttemptOk: true
			};
			store.seedNeedsRevalidate = store.subscriberCount === 0;
			store.lastSettledAt = Date.now();
			emit(store);
		}
		//#endregion
		//#region src/client/vendor/data-surface.ts
		/**
		* Render-state classification for data surfaces (WP2 / 010_loading_contract.md).
		*
		* Request ownership stays in `client-resource`; this module only translates a store snapshot
		* into the three decisions a page actually makes: replace the content with a skeleton, show
		* progress next to existing content, or show a failure. Pages used to answer those questions
		* with per-page booleans, which is why a slow load could look identical to an empty result.
		*/
		/**
		* Ordering matters: an in-flight request outranks a settled failure so a slow retry keeps
		* showing progress instead of freezing on the previous error.
		*/
		function classifyDataSurface(snapshot, isEmpty, enabled) {
			if (!enabled) return {
				kind: "disabled",
				data: void 0,
				error: void 0,
				showSkeleton: false,
				refreshing: false,
				showError: false
			};
			const hasData = snapshot.data !== void 0;
			const failed = !snapshot.lastAttemptOk && snapshot.error !== void 0;
			if (snapshot.refreshing) {
				if (hasData) return {
					kind: "loading-with-stale-data",
					data: snapshot.data,
					error: snapshot.error,
					showSkeleton: false,
					refreshing: true,
					showError: failed
				};
				return {
					kind: failed ? "retrying-cold" : "cold",
					data: void 0,
					error: failed ? snapshot.error : void 0,
					showSkeleton: true,
					refreshing: true,
					showError: false
				};
			}
			if (failed) return hasData ? {
				kind: "failed-with-stale",
				data: snapshot.data,
				error: snapshot.error,
				showSkeleton: false,
				refreshing: false,
				showError: true
			} : {
				kind: "failed-cold",
				data: void 0,
				error: snapshot.error,
				showSkeleton: false,
				refreshing: false,
				showError: true
			};
			if (!hasData) return {
				kind: "cold",
				data: void 0,
				error: void 0,
				showSkeleton: true,
				refreshing: false,
				showError: false
			};
			return {
				kind: isEmpty(snapshot.data) ? "ready-empty" : "ready-populated",
				data: snapshot.data,
				error: void 0,
				showSkeleton: false,
				refreshing: false,
				showError: false
			};
		}
		/**
		* Thin adapter over `useKeyedClientResource`: no extra cache, fetch, effect, or timer. All
		* inputs come from the external store snapshot, so every subscriber classifies identically.
		*/
		function useDataSurface(key, deps, load, options) {
			const { isEmpty, sessionCacheKey, ...resourceOptions } = options;
			const cachedEntry = (0, react.useMemo)(() => sessionCacheKey ? readSessionListCacheEntry(sessionCacheKey) : null, [sessionCacheKey]);
			const resource = useKeyedClientResource(key, deps, (0, react.useCallback)(async (signal) => {
				const next = await load(signal);
				if (sessionCacheKey) writeSessionListCacheEntry(sessionCacheKey, next);
				return next;
			}, [load, sessionCacheKey]), {
				...resourceOptions,
				...sessionCacheKey ? {
					initialData: resourceOptions.initialData ?? cachedEntry?.data,
					initialDataCachedAt: resourceOptions.initialDataCachedAt ?? cachedEntry?.cachedAt ?? null
				} : {}
			});
			return {
				...resource,
				state: classifyDataSurface(resource, isEmpty, options.enabled !== false)
			};
		}
		//#endregion
		//#region src/client/vendor/components/data-surface.tsx
		/**
		* Lets a page mirror its ready geometry without exposing placeholder values to assistive
		* technology. The surrounding skeleton owns the single announced sentence.
		*/
		function DataSurfaceSkeletonBlock({ className, style }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"aria-hidden": "true",
				className: className ? `data-surface-skeleton__block ${className}` : "data-surface-skeleton__block",
				style
			});
		}
		/**
		* Keeps a cold surface non-empty from its first commit. This is the only live region for a cold
		* transition, so callers must not render a live status line beside it.
		*/
		function DataSurfaceSkeleton({ label, rows = 3, className }) {
			const count = Math.max(1, Math.floor(rows));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: className ? `data-surface-skeleton ${className}` : "data-surface-skeleton",
				role: "status",
				"aria-live": "polite",
				"aria-atomic": "true",
				"aria-busy": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "sr-only",
					children: label
				}), Array.from({ length: count }, (_, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "data-surface-skeleton__row",
					"aria-hidden": "true",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DataSurfaceSkeletonBlock, {})
				}, index))]
			});
		}
		//#endregion
		//#region src/client/vendor/ui.tsx
		function Switch({ on, mixed = false, onClick, disabled, label }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: `switch${on ? " on" : ""}`,
				onClick,
				disabled,
				"aria-pressed": mixed ? "mixed" : on,
				"aria-label": label,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "knob" })
			});
		}
		function Notice({ tone, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `notice notice-${tone}`,
				role: tone === "err" ? "alert" : "status",
				children: [tone === "ok" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconCheck, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconAlert, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children })]
			});
		}
		function EmptyState({ icon, title, children, className, style }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `empty ${className ?? ""}`,
				style,
				children: [
					icon,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "title",
						children: title
					}),
					children && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "sub",
						children
					})
				]
			});
		}
		//#endregion
		//#region src/client/vendor/bounded-fetch.ts
		function createBoundedFetch(ms) {
			const controller = new AbortController();
			if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function" && typeof AbortSignal.timeout === "function") return {
				controller,
				signal: AbortSignal.any([controller.signal, AbortSignal.timeout(ms)]),
				clear: () => void 0
			};
			const timeoutId = setTimeout(() => controller.abort(), ms);
			return {
				controller,
				signal: controller.signal,
				clear: () => clearTimeout(timeoutId)
			};
		}
		//#endregion
		//#region src/client/vendor/visibility-poll.ts
		function hiddenNow() {
			return typeof document !== "undefined" && document.visibilityState === "hidden";
		}
		/**
		* Schedule through `window` when it exists. Every migrated poller used
		* `window.setInterval`, and their tests intercept it there — the bare global binds
		* to a different timer scope than the code this helper replaced, which both hides
		* the poll from that instrumentation and changes its lifetime semantics.
		*/
		function scheduleInterval(fn, ms) {
			if (typeof window !== "undefined" && typeof window.setInterval === "function") return window.setInterval(fn, ms);
			return setInterval(fn, ms);
		}
		function cancelInterval(handle) {
			if (typeof window !== "undefined" && typeof window.clearInterval === "function") {
				window.clearInterval(handle);
				return;
			}
			clearInterval(handle);
		}
		/**
		* Start an interval that exists only while the tab is visible (unless opted out).
		* Returns stop(), which removes the timer and the visibility listener in any state.
		*/
		function startVisibilityPoll(callback, intervalMs, options) {
			const pauseWhenHidden = options?.pauseWhenHidden !== false;
			let timer = null;
			let stopped = false;
			const tick = () => {
				try {
					callback();
				} catch (error) {
					console.error("[visibility-poll]", error);
				}
			};
			const arm = () => {
				if (timer !== null || stopped) return;
				timer = scheduleInterval(tick, intervalMs);
			};
			const disarm = () => {
				if (timer === null) return;
				cancelInterval(timer);
				timer = null;
			};
			const onVisibility = () => {
				if (!pauseWhenHidden) return;
				if (hiddenNow()) {
					disarm();
					return;
				}
				tick();
				arm();
			};
			if (pauseWhenHidden && hiddenNow()) {} else arm();
			if (pauseWhenHidden && typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
			if (options?.immediate) tick();
			return () => {
				stopped = true;
				disarm();
				if (pauseWhenHidden && typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
			};
		}
		//#endregion
		//#region src/client/vendor/pages/debug-shared.ts
		const DEBUG_STREAMS = [
			"provider",
			"usage",
			"injection"
		];
		function formatLogTime(at) {
			return at > 0 ? `[${new Date(at).toLocaleTimeString()}] ` : "";
		}
		function formatInboundTime(at) {
			return new Date(at).toLocaleTimeString();
		}
		function isStreamEnabled(debug, stream) {
			return stream === "provider" ? !!debug?.enabled : stream === "usage" ? !!debug?.usage : !!debug?.injection;
		}
		function isDebugFlagEnabled(debug, flag) {
			return flag === "debug" ? debug.enabled : flag === "usage" ? debug.usage : flag === "injection" ? debug.injection : debug.inbound;
		}
		//#endregion
		//#region src/client/vendor/pages/debug-inbound-panel.tsx
		function DebugInboundPanel({ entries }) {
			const { t } = useI18n();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "card",
				style: {
					marginBottom: 16,
					padding: "12px 14px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "font-semibold",
						style: { marginBottom: 4 },
						children: t("debug.inbound.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "muted text-control",
						style: { marginBottom: 10 },
						children: t("debug.inbound.sub")
					}),
					entries.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "muted text-control",
						children: t("debug.inbound.empty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { overflowX: "auto" },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
							className: "table text-label",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("debug.inbound.time") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("debug.inbound.endpoint") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("debug.inbound.model") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "thinking" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "effort" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "beta" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "metadata" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "system" })
							] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "muted mono",
									children: formatInboundTime(entry.at)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "mono",
									children: entry.endpoint
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
									className: "mono",
									title: entry.resolvedModel,
									children: [entry.model, entry.resolvedModel && entry.resolvedModel !== entry.model && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "muted",
										children: [" → ", entry.resolvedModel]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
									className: "mono",
									children: [entry.thinkingType ?? "-", entry.thinkingBudgetTokens !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "muted",
										children: [
											" (",
											entry.thinkingBudgetTokens,
											")"
										]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "mono",
									children: entry.outputConfigEffort ?? "-"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "mono",
									title: entry.anthropicBeta,
									style: {
										maxWidth: 160,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: entry.anthropicBeta ?? "-"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "mono",
									title: entry.metadataKeys?.join(", "),
									children: entry.hasMetadataUserId ? `user_id ${entry.userIdTag ?? ""}` : t("debug.inbound.none")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: "mono",
									children: entry.hasSystem ? entry.systemTag ?? "yes" : t("debug.inbound.none")
								})
							] }, entry.id)) })]
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/vendor/pages/debug-log-viewer.tsx
		function DebugLogViewer({ debug, stream, streamEnabled, entries, scrollContainerRef, lineVirtualizer }) {
			const { t } = useI18n();
			if (!debug) return null;
			if (!streamEnabled) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "empty",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "font-semibold",
					style: { marginBottom: 6 },
					children: t("debug.emptyTitle")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "muted text-control",
					style: {
						maxWidth: 560,
						marginInline: "auto"
					},
					children: t("debug.empty")
				})]
			});
			if (entries.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "empty",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "font-semibold",
					style: { marginBottom: 6 },
					children: t("debug.noLinesTitle")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "muted text-control",
					style: {
						maxWidth: 560,
						marginInline: "auto"
					},
					children: t(`debug.noLines.${stream}`)
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: scrollContainerRef,
				className: "log-detail-json",
				style: {
					maxHeight: "calc(100vh - 280px)",
					overflow: "auto"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						position: "relative",
						height: lineVirtualizer.getTotalSize(),
						width: "100%"
					},
					children: lineVirtualizer.getVirtualItems().map((virtualRow) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: lineVirtualizer.measureElement,
						"data-index": virtualRow.index,
						style: {
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							transform: `translateY(${virtualRow.start}px)`
						},
						children: `${formatLogTime(entries[virtualRow.index].at)}${entries[virtualRow.index].line}`
					}, virtualRow.key))
				})
			});
		}
		//#endregion
		//#region src/client/vendor/pages/debug-settings-panel.tsx
		function DebugSettingsPanel({ debug, debugBusy, stream, onSetFlag, onReset, onStreamChange }) {
			const { t } = useI18n();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "card",
				style: {
					marginBottom: 16,
					padding: "12px 14px"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 12,
						flexWrap: "wrap"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							flexWrap: "wrap",
							gap: 16
						},
						children: [
							"debug",
							"usage",
							"injection",
							"inbound"
						].map((flag) => {
							const checked = isDebugFlagEnabled(debug, flag);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "inline-flex",
									alignItems: "center",
									gap: 10,
									minWidth: 220
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
									on: checked,
									disabled: debugBusy,
									label: t(`debug.${flag}`),
									onClick: () => onSetFlag(flag, !checked)
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "text-control",
									children: t(`debug.${flag}`)
								})]
							}, flag);
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn btn-ghost btn-sm",
						disabled: debugBusy,
						onClick: onReset,
						children: t("debug.reset")
					})]
				}), (debug.enabled || debug.usage || debug.injection) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "inline-flex",
						gap: 6,
						marginTop: 12
					},
					children: [
						debug.enabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: `btn btn-sm${stream === "provider" ? " btn-primary" : " btn-ghost"}`,
							onClick: () => onStreamChange("provider"),
							children: t("debug.streamProvider")
						}),
						debug.usage && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: `btn btn-sm${stream === "usage" ? " btn-primary" : " btn-ghost"}`,
							onClick: () => onStreamChange("usage"),
							children: t("debug.streamUsage")
						}),
						debug.injection && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: `btn btn-sm${stream === "injection" ? " btn-primary" : " btn-ghost"}`,
							onClick: () => onStreamChange("injection"),
							children: t("debug.streamInjection")
						})
					]
				})]
			});
		}
		function DebugPageHeader({ embedded, refreshing, streamEnabled, follow, onRefresh, onFollowChange }) {
			const { t } = useI18n();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: embedded ? "row" : "page-head",
				style: embedded ? {
					justifyContent: "flex-end",
					marginBottom: 4
				} : void 0,
				children: [!embedded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t("debug.title") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "inline-flex",
						alignItems: "center",
						gap: 12
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "btn btn-ghost btn-sm",
						disabled: refreshing || !streamEnabled,
						onClick: onRefresh,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconRefresh, {}),
							" ",
							t("debug.refresh")
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "muted text-control",
						style: {
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							gap: 6
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: follow,
							onChange: (e) => onFollowChange(e.target.checked)
						}), t("debug.follow")]
					})]
				})]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "page-sub",
				children: t("debug.subtitle")
			})] });
		}
		//#endregion
		//#region src/client/vendor/pages/Debug.tsx
		function debugSettingsKey(apiBase) {
			return `debug-settings:${apiBase}`;
		}
		function Debug({ apiBase, embedded, active = true }) {
			const { t } = useI18n();
			const settingsCacheKey = `aezy.observability.debug.settings.v1:${apiBase}`;
			const cachedSettings = readSessionListCache(settingsCacheKey);
			const debugResourceKey = debugSettingsKey(apiBase);
			const [debugBusy, setDebugBusy] = (0, react.useState)(false);
			const [operationError, setOperationError] = (0, react.useState)(null);
			const [stream, setStream] = (0, react.useState)("provider");
			const [entries, setEntries] = (0, react.useState)([]);
			const [follow, setFollow] = (0, react.useState)(true);
			const [refreshing, setRefreshing] = (0, react.useState)(false);
			const afterRef = (0, react.useRef)(0);
			const mutationGenerationRef = (0, react.useRef)(0);
			const logGenerationRef = (0, react.useRef)(0);
			const mutationQueueRef = (0, react.useRef)(null);
			const scrollContainerRef = (0, react.useRef)(null);
			const streamIdentityRef = (0, react.useRef)(null);
			const debugPoll = useDataSurface(debugResourceKey, [apiBase], async (signal) => {
				const res = await aezyFetch(`${apiBase}/api/debug`, { signal });
				if (!res.ok) throw new Error(String(res.status));
				const next = await res.json();
				writeSessionListCache(settingsCacheKey, next);
				return next;
			}, {
				pollMs: 2e3,
				enabled: active,
				isEmpty: () => false,
				initialData: cachedSettings ?? void 0
			});
			const debugState = debugPoll.state;
			const debug = debugPoll.data ?? cachedSettings ?? null;
			const inboundEntries = useKeyedClientResource(`debug-inbound-inbound:${apiBase}`, [apiBase, debug?.inbound], async (signal) => {
				const res = await aezyFetch(`${apiBase}/api/inbound-debug`, { signal });
				if (!res.ok) return [];
				const data = await res.json();
				return Array.isArray(data.entries) ? data.entries : [];
			}, {
				pollMs: 2e3,
				enabled: active && !!debug?.inbound
			}).data ?? [];
			const lineVirtualizer = useVirtualizer({
				count: entries.length,
				getScrollElement: () => scrollContainerRef.current,
				estimateSize: () => 20,
				overscan: 30,
				getItemKey: (index) => entries[index].seq
			});
			const streamIsOn = (0, react.useCallback)((candidate) => isStreamEnabled(debug, candidate), [debug]);
			(0, react.useEffect)(() => {
				if (!debug || streamIsOn(stream)) return;
				const next = DEBUG_STREAMS.find(streamIsOn);
				if (!next) return;
				const timeout = window.setTimeout(() => setStream(next), 0);
				return () => window.clearTimeout(timeout);
			}, [
				debug,
				stream,
				streamIsOn
			]);
			const streamEnabled = streamIsOn(stream);
			const logsPath = stream === "provider" ? `${apiBase}/api/debug/logs` : stream === "usage" ? `${apiBase}/api/debug/usage-logs` : `${apiBase}/api/debug/injection-logs`;
			const fetchLogs = (0, react.useCallback)(async (initial, signal) => {
				const generation = ++logGenerationRef.current;
				if (!streamEnabled) {
					if (generation === logGenerationRef.current) {
						setEntries([]);
						afterRef.current = 0;
					}
					return;
				}
				setRefreshing(true);
				try {
					const params = new URLSearchParams({ limit: "500" });
					if (!initial && afterRef.current > 0) params.set("after", String(afterRef.current));
					const res = await aezyFetch(`${logsPath}?${params}`, { signal });
					if (!res.ok) throw new Error("Diagnostics read failed; retry Refresh.");
					if (signal?.aborted || generation !== logGenerationRef.current) return;
					const next = await res.json();
					if (signal?.aborted || generation !== logGenerationRef.current) return;
					setOperationError(null);
					if (next.length === 0) {
						if (initial) setEntries([]);
						return;
					}
					setEntries((prev) => (initial ? next : [...prev, ...next]).slice(-2e3));
					afterRef.current = next[next.length - 1].seq;
				} catch {
					if (!signal?.aborted && generation === logGenerationRef.current) setOperationError("Diagnostics read failed. Previous lines are retained; retry Refresh.");
				} finally {
					if (generation === logGenerationRef.current) setRefreshing(false);
				}
			}, [logsPath, streamEnabled]);
			(0, react.useEffect)(() => {
				if (!active) return;
				const identity = `${apiBase}:${stream}:${streamEnabled}`;
				const changed = streamIdentityRef.current !== identity;
				streamIdentityRef.current = identity;
				if (!changed && entries.length > 0) return;
				afterRef.current = 0;
				const controller = new AbortController();
				const timeout = window.setTimeout(() => {
					if (changed) setEntries([]);
					fetchLogs(true, controller.signal);
				}, 0);
				return () => {
					window.clearTimeout(timeout);
					logGenerationRef.current += 1;
					controller.abort();
				};
			}, [
				active,
				apiBase,
				stream,
				streamEnabled
			]);
			const pollInFlightRef = (0, react.useRef)(false);
			const pollTick = useStableEvent(() => {
				if (pollInFlightRef.current) return;
				pollInFlightRef.current = true;
				const bounded = createBoundedFetch(1e4);
				fetchLogs(false, bounded.signal).finally(() => {
					bounded.clear();
					pollInFlightRef.current = false;
				});
			});
			(0, react.useEffect)(() => {
				if (!active || !follow || !streamEnabled) return;
				return startVisibilityPoll(() => pollTick(), 1e3);
			}, [
				active,
				follow,
				streamEnabled
			]);
			(0, react.useEffect)(() => {
				if (follow && entries.length > 0) lineVirtualizer.scrollToIndex(entries.length - 1, { align: "end" });
			}, [
				entries,
				follow,
				lineVirtualizer
			]);
			const runDebugMutation = async (body) => {
				const generation = ++mutationGenerationRef.current;
				setDebugBusy(true);
				const run = async () => {
					try {
						const res = await aezyFetch(`${apiBase}/api/debug`, {
							method: "PUT",
							headers: { "content-type": "application/json" },
							body: JSON.stringify(body)
						});
						if (!res.ok) throw new Error("Debug settings update failed");
						const next = await res.json();
						if (generation !== mutationGenerationRef.current) return;
						writeSessionListCache(settingsCacheKey, next);
						setClientResourceData(debugResourceKey, next);
						setOperationError(null);
					} catch {
						if (generation === mutationGenerationRef.current) setOperationError("Debug settings were not saved. Retry the change.");
					}
				};
				const queued = (mutationQueueRef.current ?? Promise.resolve()).then(run, run);
				mutationQueueRef.current = queued.then(() => void 0, () => void 0);
				try {
					await queued;
				} finally {
					if (generation === mutationGenerationRef.current) setDebugBusy(false);
				}
			};
			const setDebugFlag = async (flag, enabled) => {
				await runDebugMutation({ [flag]: enabled });
			};
			const resetDebug = async () => {
				await runDebugMutation({ reset: true });
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				operationError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, {
					tone: "err",
					children: operationError
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DebugPageHeader, {
					embedded,
					refreshing,
					streamEnabled,
					follow,
					onRefresh: () => void fetchLogs(true),
					onFollowChange: setFollow
				}),
				!debug && debugState.showError ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "notice notice-err",
					role: "alert",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("debug.loadFailed") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "btn btn-ghost btn-sm",
						onClick: () => debugPoll.refresh(),
						children: t("common.retry")
					})]
				}) : debugState.showSkeleton && !debug ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DataSurfaceSkeleton, {
					label: t("debug.loading"),
					rows: 3
				}) : !debug ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DebugSettingsPanel, {
					debug,
					debugBusy,
					stream,
					onSetFlag: (flag, enabled) => {
						setDebugFlag(flag, enabled);
					},
					onReset: () => {
						resetDebug();
					},
					onStreamChange: setStream
				}),
				debug && debugState.showError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, {
					tone: "err",
					children: t("debug.loadFailed")
				}),
				debug?.inbound && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DebugInboundPanel, { entries: inboundEntries }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DebugLogViewer, {
					debug: !!debug,
					stream,
					streamEnabled,
					entries,
					scrollContainerRef,
					lineVirtualizer
				})
			] });
		}
		//#endregion
		//#region src/client/vendor/pages/logs-tab-keydown.ts
		function readTabFromHash() {
			return new URL(window.location.href).searchParams.get("aezyTab") === "debug" ? "debug" : "logs";
		}
		function selectLogsTab(next) {
			const url = new URL(window.location.href);
			url.searchParams.set("aezyView", "logs");
			url.searchParams.set("aezyTab", next);
			window.history.pushState(null, "", url);
			window.dispatchEvent(new PopStateEvent("popstate"));
		}
		function logsTabKeyDown(e) {
			if (e.key === "ArrowLeft" || e.key === "Home") {
				e.preventDefault();
				selectLogsTab("logs");
				document.getElementById("logs-tab-logs")?.focus();
			} else if (e.key === "ArrowRight" || e.key === "End") {
				e.preventDefault();
				selectLogsTab("debug");
				document.getElementById("logs-tab-debug")?.focus();
			}
		}
		//#endregion
		//#region src/client/vendor/pages/logs-model-title.ts
		function modelTitle(log, t) {
			return [
				`${t("logs.modelTooltip.model")}=${log.model}`,
				log.resolvedModel ? `${t("logs.modelTooltip.resolvedModel")}=${log.resolvedModel}` : void 0,
				log.requestedServiceTier ? `${t("logs.modelTooltip.requestedTier")}=${log.requestedServiceTier}` : void 0,
				log.configuredServiceTier ? `${t("logs.modelTooltip.configuredTier")}=${log.configuredServiceTier}` : void 0,
				log.responseServiceTier ? `${t("logs.modelTooltip.responseTier")}=${log.responseServiceTier}` : void 0,
				log.modelSupportsServiceTier !== void 0 ? `${t("logs.modelTooltip.supportsTier")}=${log.modelSupportsServiceTier}` : void 0
			].filter(Boolean).join(" · ");
		}
		//#endregion
		//#region src/client/vendor/pages/logs-speed-label.ts
		/**
		* Speed-badge text for one request log row.
		*
		* The badge reports what THIS request asked for, never what the dashboard is
		* currently configured to ask for (#689).
		*
		* Codex represents Standard as the `default` sentinel and omits it from the
		* outbound request, so an absent `requestedSpeedLabel` means "this request did
		* not ask for Fast" — not "we don't know". Filling that gap with the global
		* configured label painted a Fast badge on Standard requests whenever Fast had
		* been selected in some other task, which is a guess wearing an observation's
		* clothes.
		*/
		function speedLabel(log) {
			return log.requestedSpeedLabel || void 0;
		}
		//#endregion
		//#region src/client/vendor/pages/logs-cost-format.ts
		function formatEstimatedUsdValue$1(value, t, localeTag, priorityLowerBound = false) {
			if (!Number.isFinite(value) || value < 0) return t("logs.cost.unavailable");
			const amount = new Intl.NumberFormat(localeTag, {
				style: "currency",
				currency: "USD",
				minimumFractionDigits: 4,
				maximumFractionDigits: 4
			}).format(value);
			return t(priorityLowerBound ? "logs.cost.lowerBound" : "logs.cost.approximate", { amount });
		}
		function formatEstimatedUsd(result, t, localeTag) {
			if (!result || result.kind === "unavailable") return t("logs.cost.unavailable");
			return formatEstimatedUsdValue$1(result.estimate.cost.total, t, localeTag, result.estimate.priorityLowerBound);
		}
		function summarizeEstimatedCosts(entries) {
			let estimatedCostUsd = 0;
			let everyPricedEstimateIsLowerBound = true;
			let pricedEstimates = 0;
			let unpricedRequests = 0;
			let unmeteredRequests = 0;
			for (const entry of entries) {
				if (entry.usageStatus === "unsupported") {
					unmeteredRequests += 1;
					continue;
				}
				const cost = entry.displayMetrics?.cost;
				if (cost?.kind === "value") {
					const total = cost.estimate.cost.total;
					if (Number.isFinite(total) && total >= 0) {
						estimatedCostUsd += total;
						pricedEstimates += 1;
						everyPricedEstimateIsLowerBound &&= cost.estimate.priorityLowerBound === true;
						continue;
					}
				}
				unpricedRequests += 1;
			}
			return {
				estimatedCostUsd,
				priorityLowerBound: pricedEstimates > 0 && everyPricedEstimateIsLowerBound,
				unpricedRequests,
				unmeteredRequests
			};
		}
		//#endregion
		//#region src/client/vendor/pages/logs-token-title.ts
		function isCursorUsageProvider(provider) {
			return provider === "cursor" || provider.startsWith("cursor-");
		}
		/** Cache read/write split; recovers reads from legacy rows that stored read+write combined. */
		function cacheSplit(log) {
			const u = log.usage;
			if (!u) return {};
			const write = typeof u.cacheCreationInputTokens === "number" ? u.cacheCreationInputTokens : void 0;
			return {
				read: typeof u.cacheReadInputTokens === "number" ? u.cacheReadInputTokens : typeof u.cachedInputTokens === "number" && write !== void 0 ? Math.max(0, u.cachedInputTokens - write) : u.cachedInputTokens,
				write
			};
		}
		function tokensTitle(log, t) {
			if (!log.usage) return void 0;
			const split = cacheSplit(log);
			const parts = [`${t("logs.tokens.input")}=${log.usage.inputTokens}`, `${t("logs.tokens.output")}=${log.usage.outputTokens}`];
			if (split.read !== void 0) parts.push(`${t("logs.tokens.cacheRead")}=${split.read}`);
			if (split.write !== void 0) parts.push(`${t("logs.tokens.cacheWrite")}=${split.write}`);
			if (typeof log.usage.contextTotalTokens === "number") parts.push(`${t("logs.tokens.contextTotal")}=${log.usage.contextTotalTokens}`);
			if (typeof log.usage.reasoningOutputTokens === "number") parts.push(`${t("logs.tokens.reasoning")}=${log.usage.reasoningOutputTokens}`);
			if (log.usageStatus === "estimated") parts.push(t("logs.tokens.estimatedNote"));
			if (log.usageStatus === "estimated" && split.read === void 0 && split.write === void 0) parts.push(t(isCursorUsageProvider(log.provider) ? "logs.tokens.noCacheCursorNote" : "logs.tokens.noCacheNote"));
			return parts.join(" · ");
		}
		//#endregion
		//#region src/client/vendor/pages/logs-surface-filter.ts
		function logMatchesSurface(log, filter) {
			return filter === "all" || log.surface === filter;
		}
		//#endregion
		//#region src/client/vendor/pages/log-route-decision.ts
		function isOptionalString(value) {
			return value === void 0 || typeof value === "string";
		}
		/** Session-cache / API entries are arbitrary JSON — reject shapes that would crash the detail panel. */
		function validCachedRouteDecision(routeDecision) {
			if (routeDecision === void 0) return true;
			if (!routeDecision || typeof routeDecision !== "object") return false;
			if (!isOptionalString(routeDecision.routeKind)) return false;
			if (routeDecision.profile !== void 0) {
				if (!routeDecision.profile || typeof routeDecision.profile !== "object") return false;
				if (!isOptionalString(routeDecision.profile.id)) return false;
				if (!isOptionalString(routeDecision.profile.revision)) return false;
			}
			if (routeDecision.selected !== void 0) {
				if (!routeDecision.selected || typeof routeDecision.selected !== "object") return false;
				if (!isOptionalString(routeDecision.selected.provider)) return false;
				if (!isOptionalString(routeDecision.selected.model)) return false;
				if (!isOptionalString(routeDecision.selected.reason)) return false;
			}
			if (routeDecision.candidates === void 0) return true;
			if (!Array.isArray(routeDecision.candidates)) return false;
			for (const candidate of routeDecision.candidates) {
				if (!candidate || typeof candidate !== "object") return false;
				if (!isOptionalString(candidate.provider)) return false;
				if (!isOptionalString(candidate.model)) return false;
				if (candidate.eligible !== void 0 && typeof candidate.eligible !== "boolean") return false;
				if (candidate.exclusions !== void 0) {
					if (!Array.isArray(candidate.exclusions)) return false;
					for (const exclusion of candidate.exclusions) {
						if (!exclusion || typeof exclusion !== "object") return false;
						if (!isOptionalString(exclusion.code)) return false;
					}
				}
			}
			return true;
		}
		function sanitizeLogEntryRouteDecision(entry) {
			if (entry.routeDecision === void 0) return entry;
			if (validCachedRouteDecision(entry.routeDecision)) return entry;
			const rest = { ...entry };
			delete rest.routeDecision;
			return rest;
		}
		//#endregion
		//#region src/client/vendor/pages/Logs.tsx
		function logsCacheKey(apiBase) {
			return `aezy.observability.logs.list.v1:${apiBase}`;
		}
		function validCachedLogs(cached) {
			if (!Array.isArray(cached)) return null;
			for (const entry of cached) if (!entry || typeof entry !== "object" || typeof entry.timestamp !== "number" || typeof entry.model !== "string" || typeof entry.provider !== "string" || typeof entry.status !== "number" || typeof entry.durationMs !== "number" || entry.shadowCallRewrittenFrom !== void 0 && typeof entry.shadowCallRewrittenFrom !== "string" || !validCachedRouteDecision(entry.routeDecision)) return null;
			return cached;
		}
		function displayTokenTotal(log) {
			if (!log.usage) return typeof log.totalTokens === "number" ? log.totalTokens : void 0;
			const baseTotal = log.usage.inputTokens + log.usage.outputTokens;
			const explicitTotal = log.usage.totalTokens ?? log.totalTokens;
			return typeof explicitTotal === "number" ? Math.max(explicitTotal, baseTotal) : baseTotal;
		}
		/**
		* Row/detail display total that also honors an absolute context checkpoint.
		*
		* Stateful providers (Kiro) report per-attempt usage only, so their per-request total stays
		* small while the real active context grows. `contextTotalTokens` is that absolute snapshot.
		*
		* NEVER SUM THIS ACROSS REQUESTS. A checkpoint is not a per-request delta: adding it up over
		* a conversation counts the same context once per request and inflates aggregates wildly.
		* Aggregate rollups must keep using `displayTokenTotal`.
		*/
		function displayContextTokenTotal(log) {
			const base = displayTokenTotal(log);
			const contextTotal = log.usage?.contextTotalTokens;
			if (typeof contextTotal !== "number") return base;
			return Math.max(base ?? 0, contextTotal) || void 0;
		}
		function effortLabel(log) {
			const requested = log.requestedEffort?.replace(/\s*->\s*/g, " → ");
			const effective = log.effectiveEffort;
			if (!requested) return effective ?? "-";
			if (!effective || requested === effective || requested.split(" → ").at(-1) === effective) return requested;
			return `${requested} → ${effective}`;
		}
		function reasoningWireLabel(log) {
			if (!log.reasoningWireField || log.reasoningWireValue === void 0) return void 0;
			return `${log.reasoningWireField}=${log.reasoningWireValue}`;
		}
		function formatTokPerSecond(result, localeTag) {
			if (!result || result.kind === "unavailable" || !Number.isFinite(result.value) || result.value <= 0) return "—";
			const digits = result.value >= 100 ? 0 : 1;
			const value = new Intl.NumberFormat(localeTag, {
				minimumFractionDigits: digits,
				maximumFractionDigits: digits
			}).format(result.value);
			return `${result.estimated ? "~" : ""}${value}`;
		}
		/** Consecutive failed polls before a stale table is called out. Two seconds each, so ~6s. */
		const STALE_POLL_FAILURE_LIMIT = 3;
		const METRIC_REASON_KEYS = {
			usage_missing: "logs.detail.reason.usage_missing",
			usage_unsupported: "logs.detail.reason.usage_unsupported",
			output_missing: "logs.detail.reason.output_missing",
			invalid_duration: "logs.detail.reason.invalid_duration",
			price_unmatched: "logs.detail.reason.price_unmatched",
			invalid_cache_breakdown: "logs.detail.reason.invalid_cache_breakdown",
			invalid_usage: "logs.detail.reason.invalid_usage",
			combo_attempt_unavailable: "logs.detail.reason.combo_attempt_unavailable"
		};
		const ESTIMATE_REASON_KEYS = {
			usage_estimated: "logs.detail.estimate.usage_estimated",
			cache_detail_missing: "logs.detail.estimate.cache_detail_missing",
			expected_price_overlay: "logs.detail.estimate.expected_price_overlay",
			provider_cost_overlay: "logs.detail.estimate.provider_cost_overlay",
			priority_lower_bound: "logs.detail.estimate.priority_lower_bound"
		};
		/**
		* i18n keys for every {@link AttemptRecoveryKind}, so the logs detail dialog renders a
		* localized label instead of the raw wire value (e.g. `rate-limit-429`).
		*/
		const RECOVERY_KIND_KEYS = {
			"transient-5xx": "logs.detail.attempt.recovery.transient5xx",
			"connection-reset": "logs.detail.attempt.recovery.connectionReset",
			"oauth-401": "logs.detail.attempt.recovery.oauth401",
			"key-429": "logs.detail.attempt.recovery.key429",
			"rate-limit-429": "logs.detail.attempt.recovery.rateLimit429",
			"anthropic-oauth-429": "logs.detail.attempt.recovery.anthropicOauth429",
			"image-413": "logs.detail.attempt.recovery.image413",
			"empty-completion": "logs.detail.attempt.recovery.emptyCompletion"
		};
		/** Map a metric-unavailable reason to its i18n key. */
		function metricReasonKey(reason) {
			return METRIC_REASON_KEYS[reason];
		}
		/** Map a cost-estimate reason to its i18n key. */
		function estimateReasonKey(reason) {
			return ESTIMATE_REASON_KEYS[reason];
		}
		/**
		* Map one attempt recovery kind to its i18n key for the logs detail dialog.
		*/
		function recoveryKindKey(kind) {
			return RECOVERY_KIND_KEYS[kind] ?? "logs.detail.attempt.recovery.unknown";
		}
		function verificationKey(status) {
			return status === "verified" ? "logs.detail.verification.verified" : "logs.detail.verification.derived";
		}
		function statusColor(status) {
			if (status >= 200 && status < 300) return "var(--green)";
			if (status >= 400) return "var(--red)";
			return "var(--amber)";
		}
		/** Date and time as separate locale strings (no joining comma) for stacked table cells. */
		function formatLogDateParts(ts, localeTag, timeZone) {
			const zone = timeZone ? { timeZone } : void 0;
			try {
				return {
					date: new Date(ts).toLocaleDateString(localeTag, zone),
					time: new Date(ts).toLocaleTimeString(localeTag, zone)
				};
			} catch {
				return {
					date: new Date(ts).toLocaleDateString(localeTag),
					time: new Date(ts).toLocaleTimeString(localeTag)
				};
			}
		}
		function formatLogDateTime(ts, localeTag, timeZone) {
			const { date, time } = formatLogDateParts(ts, localeTag, timeZone);
			return `${date} ${time}`;
		}
		function summarizeFilteredLogs(entries) {
			let totalTokens = 0;
			for (const entry of entries) {
				const tokens = displayTokenTotal(entry);
				if (tokens !== void 0) totalTokens += tokens;
			}
			return {
				requests: entries.length,
				totalTokens,
				...summarizeEstimatedCosts(entries)
			};
		}
		function Logs({ apiBase }) {
			const { t, locale } = useI18n();
			const surfaces = useSurfaces();
			const resourceKey = logsCacheKey(apiBase);
			const cachedLogs = validCachedLogs(readSessionListCache(resourceKey));
			const [autoRefresh, setAutoRefresh] = (0, react.useState)(true);
			const [storageError, setStorageError] = (0, react.useState)(false);
			const [detail, setDetail] = (0, react.useState)(null);
			const [surfaceFilter, setSurfaceFilter] = (0, react.useState)("all");
			const [interceptedHelpersOnly, setInterceptedHelpersOnly] = (0, react.useState)(false);
			const [conversationFilter, setConversationFilter] = (0, react.useState)("");
			const [conversationQueryHash, setConversationQueryHash] = (0, react.useState)();
			const scrollContainerRef = (0, react.useRef)(null);
			const localeTag = LOCALES.find((l) => l.code === locale)?.htmlLang;
			const [serverTimeZone, setServerTimeZone] = (0, react.useState)();
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				let cancelled = false;
				aezyFetch(`${apiBase}/api/settings`, { signal: controller.signal }).then((res) => res.ok ? res.json() : null).then((body) => {
					if (cancelled || !body) return;
					if (typeof body.timeZone === "string" && body.timeZone.trim()) setServerTimeZone(body.timeZone.trim());
				}).catch(() => {});
				return () => {
					cancelled = true;
					controller.abort();
				};
			}, [apiBase]);
			const [tab, setTab] = (0, react.useState)(readTabFromHash);
			const [debugMounted, setDebugMounted] = (0, react.useState)(() => readTabFromHash() === "debug");
			(0, react.useEffect)(() => {
				const onHash = () => setTab(readTabFromHash());
				window.addEventListener("popstate", onHash);
				return () => window.removeEventListener("popstate", onHash);
			}, []);
			(0, react.useEffect)(() => {
				if (tab === "debug") setDebugMounted(true);
			}, [tab]);
			const selectTab = selectLogsTab;
			const loadLogs = (0, react.useCallback)(async (signal) => {
				const res = await aezyFetch(`${apiBase}/api/logs?limit=2000`, { signal });
				if (!res.ok) throw new Error(`${res.status} ${res.statusText}`.trim());
				const body = await res.json();
				setStorageError(!Array.isArray(body) && (body.persistenceErrors ?? 0) > 0);
				const next = (Array.isArray(body) ? body : body.logs ?? []).map(sanitizeLogEntryRouteDecision);
				writeSessionListCache(resourceKey, next);
				return next;
			}, [apiBase, resourceKey]);
			const logsResource = useDataSurface(resourceKey, [apiBase], loadLogs, {
				isEmpty: (rows) => rows.length === 0,
				enabled: tab === "logs",
				pollMs: autoRefresh ? 2e3 : void 0,
				initialData: cachedLogs ?? void 0
			});
			const logsState = logsResource.state;
			const logs = logsState.data ?? cachedLogs ?? [];
			const fetchLogs = logsResource.refresh;
			const settledFailure = !logsResource.refreshing && logsState.showError;
			const settledSuccess = !logsResource.refreshing && !logsState.showError && logsState.data !== void 0;
			const [failureStreak, setFailureStreak] = (0, react.useState)({
				error: null,
				count: 0
			});
			if (settledSuccess && failureStreak.count !== 0) setFailureStreak({
				error: null,
				count: 0
			});
			else if (settledFailure && failureStreak.error !== logsState.error) setFailureStreak((previous) => ({
				error: logsState.error,
				count: previous.count + 1
			}));
			const pollFailing = failureStreak.count >= STALE_POLL_FAILURE_LIMIT || !autoRefresh && settledFailure;
			const detailInfo = detail ? statusCodeInfo(detail.status, locale) : null;
			const conversationQuery = conversationFilter.trim();
			(0, react.useEffect)(() => {
				let cancelled = false;
				if (!conversationQuery) {
					setConversationQueryHash(void 0);
					return;
				}
				hashLogConversationQuery(conversationQuery).then((hash) => {
					if (!cancelled) setConversationQueryHash(hash);
				});
				return () => {
					cancelled = true;
				};
			}, [conversationQuery]);
			const filteredLogs = logs.filter((log) => logMatchesSurface(log, surfaceFilter) && (!interceptedHelpersOnly || Boolean(log.shadowCallRewrittenFrom)) && (!conversationQuery || matchesLogConversationId(log.conversationId, conversationQuery, conversationQueryHash)));
			const conversationTotals = conversationQuery ? summarizeFilteredLogs(filteredLogs) : null;
			const rowVirtualizer = useVirtualizer({
				count: filteredLogs.length,
				getScrollElement: () => scrollContainerRef.current,
				estimateSize: () => 44,
				overscan: 15
			});
			const virtualRows = rowVirtualizer.getVirtualItems();
			const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
			const paddingBottom = virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "logs-page",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "page-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t("nav.logs") }), tab === "logs" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "muted text-control logs-auto-refresh",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: autoRefresh,
								onChange: (e) => setAutoRefresh(e.target.checked)
							}), t("logs.autoRefresh")]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "page-tabs",
						role: "tablist",
						"aria-label": t("nav.logs"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "tab",
							id: "logs-tab-logs",
							"aria-selected": tab === "logs",
							"aria-controls": "logs-panel-logs",
							tabIndex: tab === "logs" ? 0 : -1,
							className: `page-tab${tab === "logs" ? " page-tab--active" : ""}`,
							onClick: () => selectTab("logs"),
							onKeyDown: logsTabKeyDown,
							children: t("logs.tabLogs")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "tab",
							id: "logs-tab-debug",
							"aria-selected": tab === "debug",
							"aria-controls": "logs-panel-debug",
							tabIndex: tab === "debug" ? 0 : -1,
							className: `page-tab${tab === "debug" ? " page-tab--active" : ""}`,
							onClick: () => selectTab("debug"),
							onKeyDown: logsTabKeyDown,
							children: t("logs.tabDebug")
						})]
					}),
					storageError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, {
						tone: "err",
						children: "Some observations could not be persisted. This report may be incomplete; check the Aezy storage directory."
					}),
					debugMounted && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: "tabpanel",
						id: "logs-panel-debug",
						"aria-labelledby": "logs-tab-debug",
						hidden: tab !== "debug",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Debug, {
							apiBase,
							embedded: true,
							active: tab === "debug"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						role: "tabpanel",
						id: "logs-panel-logs",
						"aria-labelledby": "logs-tab-logs",
						hidden: tab !== "logs",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "page-sub",
								children: t("logs.subtitle")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "logs-toolbar",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "muted text-control",
										children: t("logs.filter.surface.label")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "segmented logs-segmented",
										role: "radiogroup",
										"aria-label": t("logs.filter.surface.label"),
										children: ["all", ...surfaces.map((s) => s.id)].map((surface) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											role: "radio",
											"aria-checked": surfaceFilter === surface,
											className: `btn btn-sm${surfaceFilter === surface ? " btn-primary" : " btn-ghost"}`,
											style: {
												background: surfaceFilter === surface ? void 0 : "transparent",
												color: surfaceFilter === surface ? void 0 : "var(--muted)"
											},
											onClick: () => setSurfaceFilter(surface),
											children: surfaceLabel(surface, surfaces)
										}, surface))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "muted text-control logs-filter-field",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: interceptedHelpersOnly,
												disabled: true,
												title: "Aezy has no Shadow Call interception. This capability is not enabled.",
												onChange: (event) => setInterceptedHelpersOnly(event.target.checked)
											}),
											t("logs.filter.interceptedHelpersOnly"),
											" (not enabled in Aezy)"
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "muted text-control logs-filter-field",
										children: [t("logs.filter.conversation.label"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "search",
											className: "input mono",
											value: conversationFilter,
											onChange: (e) => setConversationFilter(e.target.value),
											placeholder: t("logs.filter.conversation.placeholder"),
											"aria-label": t("logs.filter.conversation.label")
										})]
									}),
									conversationQuery && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "btn btn-ghost btn-sm",
										onClick: () => setConversationFilter(""),
										children: t("logs.filter.conversation.clear")
									})
								]
							}),
							conversationTotals && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "logs-conversation-totals",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Notice, {
									tone: "ok",
									children: [
										t("logs.conversation.totals", {
											requests: conversationTotals.requests,
											tokens: formatTokens(conversationTotals.totalTokens, localeTag ?? locale),
											cost: formatEstimatedUsdValue$1(conversationTotals.estimatedCostUsd, t, localeTag, conversationTotals.priorityLowerBound)
										}),
										" ",
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "muted",
											children: [t("logs.conversation.scope"), conversationTotals.unpricedRequests + conversationTotals.unmeteredRequests > 0 ? ` ${t("logs.conversation.excluded", {
												unpriced: conversationTotals.unpricedRequests,
												unmetered: conversationTotals.unmeteredRequests
											})}` : ""]
										})
									]
								})
							}),
							logsState.kind === "failed-cold" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Notice, {
								tone: "err",
								children: [
									logsState.error instanceof Error ? `${t("logs.loadError")} ${logsState.error.message}` : t("logs.loadError"),
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "btn btn-ghost btn-sm",
										onClick: () => fetchLogs({ forceLoading: true }),
										disabled: logsState.refreshing,
										children: t("common.retry")
									})
								]
							}),
							pollFailing && logs.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Notice, {
								tone: "err",
								children: [
									t("logs.loadError"),
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "btn btn-ghost btn-sm",
										onClick: () => fetchLogs({ forceLoading: true }),
										disabled: logsResource.refreshing,
										children: t("common.retry")
									})
								]
							}),
							logsState.kind === "failed-cold" ? null : logsState.showSkeleton && logs.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DataSurfaceSkeleton, {
								label: t("common.loading"),
								rows: 6
							}) : filteredLogs.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { title: t("logs.noRequests") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								ref: scrollContainerRef,
								className: "tbl-wrap logs-table-wrap",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
									className: "tbl logs-table",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("logs.col.time") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
											className: "num log-col-tokens",
											children: t("logs.col.tokens")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
											className: "num log-col-rate",
											title: t("logs.metric.tokPerSecTitle"),
											children: t("logs.col.tokPerSec")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
											className: "num log-col-cost",
											title: t("logs.metric.estimatedCostTitle"),
											children: t("logs.col.estimatedCost")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
											className: "log-col-model",
											children: t("logs.col.model")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("logs.col.effort") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("logs.col.provider") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("logs.col.status") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("logs.col.request") }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
											className: "num log-col-duration",
											children: t("logs.col.duration")
										})
									] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [
										paddingTop > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											colSpan: 10,
											className: "logs-virtual-spacer",
											style: { height: paddingTop }
										}) }),
										virtualRows.map((virtualRow) => {
											const log = filteredLogs[filteredLogs.length - 1 - virtualRow.index];
											const reasoningWire = reasoningWireLabel(log);
											const when = formatLogDateParts(log.timestamp, localeTag, serverTimeZone);
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
												"data-index": virtualRow.index,
												ref: rowVirtualizer.measureElement,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
														className: "muted mono log-col-time",
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: "logs-stack-start",
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: when.date }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: when.time })]
														})
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
														className: "num mono log-col-tokens",
														title: tokensTitle(log, t),
														children: (() => {
															const tokenTotal = displayContextTokenTotal(log);
															const { read, write } = cacheSplit(log);
															return tokenTotal !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																className: "logs-stack-end",
																children: [
																	/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [log.usageStatus === "estimated" ? "~" : "", formatTokens(tokenTotal, locale)] }),
																	read !== void 0 && read > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																		className: "muted text-caption leading-tight",
																		children: ["c ", formatTokens(read, locale)]
																	}),
																	write !== void 0 && write > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
																		className: "muted text-caption leading-tight",
																		children: ["w ", formatTokens(write, locale)]
																	}),
																	log.usageStatus === "estimated" && read === void 0 && write === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																		className: "muted text-caption leading-tight",
																		children: t(isCursorUsageProvider(log.provider) ? "logs.tokens.noCacheCursor" : "logs.tokens.noCache")
																	})
																]
															}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: "muted",
																children: t(`logs.tokens.${log.usageStatus ?? "unreported"}`)
															});
														})()
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
														className: "num mono log-col-rate",
														children: formatTokPerSecond(log.displayMetrics?.tokPerSecond, localeTag)
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
														className: "num mono log-col-cost",
														children: formatEstimatedUsd(log.displayMetrics?.cost, t, localeTag)
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
														className: "mono log-col-model",
														title: modelTitle(log, t),
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: "logs-model-cell",
															children: [
																/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: modelLabel(log.resolvedModel ?? log.model) }),
																log.shadowCallRewrittenFrom && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: "badge badge-muted",
																	style: { whiteSpace: "nowrap" },
																	title: t("logs.badge.interceptedHelperTitle"),
																	children: t("logs.badge.interceptedHelper", { model: log.shadowCallRewrittenFrom })
																}),
																log.surface && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: "badge badge-accent",
																	children: surfaceLabel(log.surface, surfaces)
																}),
																speedLabel(log) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																	className: "badge badge-amber",
																	children: speedLabel(log)
																})
															]
														})
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
														className: "mono log-reasoning-cell",
														title: reasoningWire,
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: "logs-stack-start",
															children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: effortLabel(log) }), reasoningWire && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: "muted text-caption leading-tight",
																children: reasoningWire
															})]
														})
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
														className: "muted",
														children: formatProviderDisplayName(log.provider, t)
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: "log-status-cell",
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: "mono font-semibold",
															style: { color: statusColor(log.status) },
															children: log.unit === "usage-notification" ? "Reported" : log.status
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: "log-detail-btn",
															onClick: () => setDetail(log),
															"aria-label": `${t("logs.details")}: ${log.requestId ?? log.status}`,
															children: t("logs.details")
														})]
													}) }),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
														className: "muted mono",
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: "log-reqid",
															title: log.requestId,
															children: log.requestId ?? "-"
														})
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
														className: "num log-col-duration",
														children: log.unit === "usage-notification" ? "—" : `${log.durationMs}ms`
													})
												]
											}, log.requestId ?? `${log.timestamp}-${virtualRow.index}`);
										}),
										paddingBottom > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
											colSpan: 10,
											className: "logs-virtual-spacer",
											style: { height: paddingBottom }
										}) })
									] })]
								})
							}) }),
							detail && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LogDetailDialog, {
								detail,
								detailInfo,
								localeCode: locale,
								localeTag,
								serverTimeZone,
								t,
								onClose: () => setDetail(null),
								onFilterConversation: (id) => {
									setConversationFilter(id);
									setDetail(null);
								}
							})
						]
					})
				]
			});
		}
		function useModalDialog(open) {
			const ref = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const el = ref.current;
				if (!el) return;
				if (open && !el.open) el.showModal();
				else if (!open && el.open) el.close();
			}, [open]);
			return ref;
		}
		function LogDetailDialog({ detail, detailInfo, localeCode, localeTag, serverTimeZone, t, onClose, onFilterConversation }) {
			const dialogRef = useModalDialog(true);
			const [copied, setCopied] = (0, react.useState)(false);
			const tokenSplit = cacheSplit(detail);
			const cost = detail.displayMetrics?.cost;
			const reasoningWire = reasoningWireLabel(detail);
			const copyRequestId = async () => {
				if (!detail.requestId) return;
				try {
					await navigator.clipboard.writeText(detail.requestId);
					setCopied(true);
					window.setTimeout(() => setCopied(false), 1200);
				} catch {}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dialog", {
				ref: dialogRef,
				className: "modal-overlay",
				"aria-labelledby": "log-detail-title",
				onCancel: (e) => {
					e.preventDefault();
					onClose();
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "modal-backdrop-dismiss",
					"aria-label": t("common.close"),
					tabIndex: -1,
					onClick: onClose
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "modal-card log-detail-card",
					onClick: (event) => event.stopPropagation(),
					role: "document",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "modal-head",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h3", {
								id: "log-detail-title",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mono",
									style: { color: statusColor(detail.status) },
									children: detail.unit === "usage-notification" ? "Usage reported" : detail.status
								}), detailInfo && detail.unit !== "usage-notification" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "logs-detail-info",
									children: detailInfo.label
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "btn btn-ghost btn-sm",
								onClick: onClose,
								"aria-label": t("common.cancel"),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconX, {})
							})]
						}),
						detailInfo && detail.unit !== "usage-notification" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "modal-desc",
							children: detailInfo.description
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "log-detail-section",
							"aria-labelledby": "log-detail-basic",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
								id: "log-detail-basic",
								className: "log-detail-section-title",
								children: t("logs.detail.section.basic")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "log-detail-grid",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "muted",
										children: t("logs.col.time")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mono",
										children: formatLogDateTime(detail.timestamp, localeTag, serverTimeZone)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "muted",
										children: t("logs.col.request")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "log-detail-request-row",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono log-detail-break",
											children: detail.requestId ?? "—"
										}), detail.requestId && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "btn btn-ghost btn-sm",
											onClick: () => void copyRequestId(),
											children: t(copied ? "logs.detail.copied" : "logs.detail.copyRequestId")
										})]
									}),
									detail.conversationId && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "muted",
										children: t("logs.detail.conversation")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "log-detail-request-row",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono log-detail-break",
											children: detail.conversationId
										}), onFilterConversation && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "btn btn-ghost btn-sm",
											onClick: () => onFilterConversation(detail.conversationId),
											children: t("logs.filter.conversation.apply")
										})]
									})] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "muted",
										children: t("logs.col.model")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mono",
										children: modelLabel(detail.resolvedModel ?? detail.model)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "muted",
										children: t("logs.col.provider")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatProviderDisplayName(detail.provider, t) }),
									(detail.requestedEffort || detail.effectiveEffort) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "muted",
										children: t("logs.col.effort")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "mono",
										children: [effortLabel(detail), reasoningWire ? ` (${reasoningWire})` : ""]
									})] }),
									detail.errorCode && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "muted",
										children: t("logs.col.error")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mono",
										children: detail.errorCode
									})] }),
									detail.upstreamError && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "muted",
										children: t("logs.col.upstreamReason")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mono log-detail-break",
										children: detail.upstreamError
									})] })
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "muted",
							children: [
								"Accounting unit: ",
								detail.unit ?? "request",
								". Official notifications have no HTTP status or transport timing. ",
								detail.accounting === false ? "Terminal diagnostic only; excluded from Usage to avoid duplicate accounting." : ""
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "log-detail-section",
							"aria-labelledby": "log-detail-route",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
								id: "log-detail-route",
								className: "log-detail-section-title",
								children: t("logs.detail.route.section")
							}), detail.routeDecision ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "log-detail-grid",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "muted",
										children: t("logs.detail.route.kind")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mono",
										children: detail.routeDecision.routeKind ?? "–"
									}),
									detail.routeDecision.profile?.id && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "muted",
										children: t("logs.detail.route.profile")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "mono",
										children: [
											detail.routeDecision.profile.id,
											" (",
											detail.routeDecision.profile.revision,
											")"
										]
									})] }),
									detail.routeDecision.selected?.provider && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "muted",
										children: t("logs.detail.route.selected")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "mono",
										children: [
											detail.routeDecision.selected.provider,
											"/",
											detail.routeDecision.selected.model,
											detail.routeDecision.selected.reason ? ` — ${detail.routeDecision.selected.reason}` : ""
										]
									})] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "muted",
										children: t("logs.detail.route.candidates")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mono",
										children: (detail.routeDecision.candidates ?? []).map((candidate) => {
											return `${typeof candidate.provider === "string" && candidate.provider.length > 0 ? candidate.provider : "–"}/${typeof candidate.model === "string" && candidate.model.length > 0 ? candidate.model : "–"}${candidate.eligible === true ? " ✓" : candidate.eligible === false ? " ✗" : " ?"}`;
										}).join("  ") || "–"
									})
								]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "log-detail-notes-line muted",
								children: t("logs.detail.route.unknown")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "log-detail-section",
							"aria-labelledby": "log-detail-performance",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
									id: "log-detail-performance",
									className: "log-detail-section-title",
									children: t("logs.detail.section.performance")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "log-detail-grid",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.col.duration")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: detail.unit === "usage-notification" ? "Unavailable" : `${detail.durationMs}ms`
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.col.tokPerSec")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: formatTokPerSecond(detail.displayMetrics?.tokPerSecond, localeTag)
										}),
										detail.firstOutputMs !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.detail.ttft")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "mono",
											children: [detail.firstOutputMs, "ms"]
										})] })
									]
								}),
								detail.displayMetrics?.tokPerSecond.kind === "unavailable" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "log-detail-notes-line muted",
									children: t(metricReasonKey(detail.displayMetrics.tokPerSecond.reason))
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "log-detail-section",
							"aria-labelledby": "log-detail-cost",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
									id: "log-detail-cost",
									className: "log-detail-section-title",
									children: t("logs.detail.section.cost")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "log-detail-notes-line muted",
									children: t("usage.cost.disclaimer")
								}),
								cost?.kind === "value" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "log-detail-grid",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.detail.costTotal")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: formatEstimatedUsdValue$1(cost.estimate.cost.total, t, localeTag, cost.estimate.priorityLowerBound)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.tokens.input")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: formatEstimatedUsdValue$1(cost.estimate.cost.input, t, localeTag, cost.estimate.priorityLowerBound)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.tokens.cacheRead")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: formatEstimatedUsdValue$1(cost.estimate.cost.cacheRead, t, localeTag, cost.estimate.priorityLowerBound)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.tokens.cacheWrite")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: formatEstimatedUsdValue$1(cost.estimate.cost.cacheWrite, t, localeTag, cost.estimate.priorityLowerBound)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.tokens.output")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: formatEstimatedUsdValue$1(cost.estimate.cost.output, t, localeTag, cost.estimate.priorityLowerBound)
										}),
										cost.estimate.price && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "muted",
												children: t("logs.detail.matchedKey")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: "mono log-detail-break",
												children: [
													cost.estimate.price.jawcodeProvider ?? cost.estimate.price.provider,
													"/",
													cost.estimate.price.modelId
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "muted",
												children: t("logs.detail.priceSource")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
												t(`logs.detail.source.${cost.estimate.price.source}`),
												" · ",
												t(verificationKey(cost.estimate.price.status))
											] }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "muted",
												children: "Price snapshot"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: "log-detail-break",
												children: [
													cost.estimate.price.verifiedAt ?? "Unspecified date",
													" · ",
													cost.estimate.price.sourceRef ?? "User configuration"
												]
											})
										] })
									]
								}), cost.estimateReasons.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: "log-detail-notes",
									children: cost.estimateReasons.map((reason) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t(estimateReasonKey(reason)) }, reason))
								})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "log-detail-grid",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.detail.costTotal")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: t("logs.cost.unavailable")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.detail.unavailableReason")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: cost?.kind === "unavailable" ? t(metricReasonKey(cost.reason)) : t("logs.detail.reason.usage_missing") })
									]
								})
							]
						}),
						detail.attempts?.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "log-detail-section",
							"aria-labelledby": "log-detail-attempts",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
									id: "log-detail-attempts",
									className: "log-detail-section-title",
									children: t("logs.detail.section.attempts")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "log-detail-notes-line muted",
									children: t("logs.detail.attempt.e2eNote")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "log-detail-attempts-wrap",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
										className: "tbl log-detail-attempts",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: "num",
												children: "#"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("logs.detail.attempt.target") }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: "num",
												children: t("logs.col.duration")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: "num",
												children: t("logs.col.tokPerSec")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												className: "num",
												children: t("logs.col.estimatedCost")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("logs.detail.attempt.reason") })
										] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: detail.attempts.toSorted((a, b) => a.ordinal - b.ordinal).map((attempt) => {
											const attemptCost = attempt.displayMetrics?.cost;
											const attemptReasoningWire = reasoningWireLabel(attempt);
											const matched = attemptCost?.kind === "value" ? attemptCost.estimate.price : void 0;
											const reason = attempt.errorCode ?? (attempt.recoveryKinds.length ? attempt.recoveryKinds.map((kind) => t(recoveryKindKey(kind))).join(", ") : void 0) ?? (attemptCost?.kind === "unavailable" ? t(metricReasonKey(attemptCost.reason)) : t("logs.detail.attempt.completed"));
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
													className: "num mono",
													children: attempt.ordinal
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatProviderDisplayName(attempt.provider, t) }),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: "mono muted log-detail-break",
														children: attempt.model
													}),
													(attempt.requestedEffort || attempt.effectiveEffort) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: "mono muted text-caption log-detail-break",
														children: [effortLabel(attempt), attemptReasoningWire ? ` (${attemptReasoningWire})` : ""]
													})] }),
													matched && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: "muted text-caption log-detail-break",
														children: [
															matched.jawcodeProvider ?? matched.provider,
															"/",
															matched.modelId,
															" · ",
															t(`logs.detail.source.${matched.source}`),
															" · ",
															t(verificationKey(matched.status))
														]
													})] })
												] }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
													className: "num mono",
													children: [attempt.durationMs, "ms"]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
													className: "num mono",
													children: formatTokPerSecond(attempt.displayMetrics?.tokPerSecond, localeTag)
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
													className: "num mono",
													children: formatEstimatedUsd(attemptCost, t, localeTag)
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
													className: "log-detail-break",
													children: reason
												})
											] }, `${attempt.ordinal}-${attempt.provider}-${attempt.model}`);
										}) })]
									})
								})
							]
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: "log-detail-section",
							"aria-labelledby": "log-detail-usage",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
									id: "log-detail-usage",
									className: "log-detail-section-title",
									children: t("logs.detail.section.usage")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "log-detail-grid",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.tokens.input")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: detail.usage ? formatTokens(detail.usage.inputTokens, localeCode) : "—"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.tokens.output")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: detail.usage ? formatTokens(detail.usage.outputTokens, localeCode) : "—"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.tokens.cacheRead")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: tokenSplit.read !== void 0 ? formatTokens(tokenSplit.read, localeCode) : "—"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.tokens.cacheWrite")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: tokenSplit.write !== void 0 ? formatTokens(tokenSplit.write, localeCode) : "—"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.tokens.reasoning")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: detail.usage?.reasoningOutputTokens !== void 0 ? formatTokens(detail.usage.reasoningOutputTokens, localeCode) : "—"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.detail.totalTokens")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: displayContextTokenTotal(detail) !== void 0 ? formatTokens(displayContextTokenTotal(detail), localeCode) : "—"
										}),
										detail.usage?.contextTotalTokens !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "muted",
											children: t("logs.tokens.contextTotal")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mono",
											children: formatTokens(detail.usage.contextTotalTokens, localeCode)
										})] })
									]
								}),
								detail.usageStatus === "estimated" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "log-detail-notes-line muted",
									children: t("logs.tokens.estimatedNote")
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
							className: "log-detail-raw",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("logs.detailRaw") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
								className: "log-detail-json",
								children: JSON.stringify(detail, null, 2)
							})]
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/vendor/intl-formatters.ts
		/** Cached Intl formatters — avoids reconstructing on every render/call. */
		const numberFormatters = /* @__PURE__ */ new Map();
		function cacheKey(locale, options) {
			return `${locale ?? ""}\0${JSON.stringify(options)}`;
		}
		function cachedNumberFormat(locale, options) {
			const key = cacheKey(locale, options ?? {});
			let fmt = numberFormatters.get(key);
			if (!fmt) {
				fmt = new Intl.NumberFormat(locale, options);
				numberFormatters.set(key, fmt);
			}
			return fmt;
		}
		/** Format a USD cost estimate for display. Returns "—" when unavailable. */
		function formatEstimatedUsdValue(value, locale) {
			if (!Number.isFinite(value) || value < 0) return "—";
			return `~${cachedNumberFormat(locale, {
				style: "currency",
				currency: "USD",
				minimumFractionDigits: 4,
				maximumFractionDigits: 4
			}).format(value)}`;
		}
		//#endregion
		//#region src/client/vendor/section-anchors.ts
		/**
		* Scroll-target ids for the sticky section strips (`SectionTabs`).
		*
		* Separate from the component so the strip file only exports components — the fast-refresh
		* lint rule requires it, and these are also useful to a page that renders anchors without
		* rendering the strip.
		*
		* Ids are built by joining parts rather than with an inline template so the i18n lint rule
		* does not read the glue as UI copy.
		*/
		const SECTION_PART = "section";
		/** Scroll-target id for one section within a page scope. */
		function sectionAnchorId(scope, id) {
			return [
				scope,
				SECTION_PART,
				id
			].join("-");
		}
		/** The prefix `sectionAnchorId` produces for a scope, used to read an id back off a node. */
		function sectionAnchorPrefix(scope) {
			return [
				scope,
				SECTION_PART,
				""
			].join("-");
		}
		/** Ignore scroll-spy updates briefly after a tab click while smooth scroll is in flight. */
		const SECTION_TAB_SCROLL_LOCK_MS = 1200;
		//#endregion
		//#region src/client/vendor/components/section-tabs.tsx
		/**
		* SectionTabs — a sticky strip of section links over a normally-scrolling page.
		*
		* These pages used to switch sections by swapping the panel, which meant only one section
		* existed at a time and the page could not be read by scrolling. Every section is rendered
		* here; the strip scrolls to one and stays pinned to the top so it is always reachable.
		*
		* The active tab follows the scroll position, so the strip reports where you are rather
		* than only where you last clicked.
		*/
		function SectionTabs({ scope, items, ariaLabel }) {
			const [active, setActive] = (0, react.useState)(items[0]?.id ?? "");
			/** While set, scroll-spy ignores intermediate sections during smooth scroll-to-click. */
			const scrollLockRef = (0, react.useRef)(null);
			const scrollLockTimerRef = (0, react.useRef)(null);
			const clearScrollLock = (0, react.useCallback)(() => {
				scrollLockRef.current = null;
				if (scrollLockTimerRef.current !== null) {
					clearTimeout(scrollLockTimerRef.current);
					scrollLockTimerRef.current = null;
				}
			}, []);
			/** Timeout path: drop the click lock and re-read the visible section. */
			const expireScrollLock = (0, react.useCallback)(() => {
				clearScrollLock();
				let bestId = null;
				let bestDistance = Number.POSITIVE_INFINITY;
				const readingLine = 72;
				for (const item of items) {
					const node = document.getElementById(sectionAnchorId(scope, item.id));
					if (!node) continue;
					const distance = Math.abs(node.getBoundingClientRect().top - readingLine);
					if (distance < bestDistance) {
						bestDistance = distance;
						bestId = item.id;
					}
				}
				if (bestId) setActive(bestId);
			}, [
				clearScrollLock,
				items,
				scope
			]);
			(0, react.useEffect)(() => () => clearScrollLock(), [clearScrollLock]);
			(0, react.useEffect)(() => {
				if (typeof IntersectionObserver === "undefined") return;
				const nodes = items.map((item) => document.getElementById(sectionAnchorId(scope, item.id))).filter((node) => node !== null);
				if (nodes.length === 0) return;
				const observer = new IntersectionObserver((entries) => {
					const locked = scrollLockRef.current;
					if (locked) {
						const lockedNode = document.getElementById(sectionAnchorId(scope, locked));
						if (entries.some((entry) => entry.isIntersecting && entry.target === lockedNode)) {
							clearScrollLock();
							setActive(locked);
						}
						return;
					}
					const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
					if (!visible) return;
					const id = visible.target.id.slice(sectionAnchorPrefix(scope).length);
					setActive((current) => current === id ? current : id);
				}, {
					rootMargin: "-72px 0px -60% 0px",
					threshold: 0
				});
				for (const node of nodes) observer.observe(node);
				return () => observer.disconnect();
			}, [
				clearScrollLock,
				items,
				scope
			]);
			const go = (id) => {
				const target = document.getElementById(sectionAnchorId(scope, id));
				if (!target) return;
				scrollLockRef.current = id;
				if (scrollLockTimerRef.current !== null) clearTimeout(scrollLockTimerRef.current);
				scrollLockTimerRef.current = setTimeout(expireScrollLock, SECTION_TAB_SCROLL_LOCK_MS);
				setActive(id);
				target.scrollIntoView({
					behavior: "smooth",
					block: "start"
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "page-tabs section-tabs",
				role: "tablist",
				"aria-label": ariaLabel,
				children: items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					role: "tab",
					"aria-selected": active === item.id,
					"aria-controls": sectionAnchorId(scope, item.id),
					tabIndex: active === item.id ? 0 : -1,
					className: `page-tab${active === item.id ? " page-tab--active" : ""}`,
					onClick: () => go(item.id),
					children: [item.label, item.meta ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "section-tab-meta",
						children: item.meta
					}) : null]
				}, item.id))
			});
		}
		//#endregion
		//#region src/client/vendor/pages/Usage.tsx
		function formatPct(ratio) {
			return `${Math.round(ratio * 100)}%`;
		}
		function modelColor(model, provider) {
			const key = `${provider}/${model}`;
			let h = 0;
			for (let i = 0; i < key.length; i++) h = h * 31 + key.charCodeAt(i) >>> 0;
			return `hsl(${h % 360} 55% 55%)`;
		}
		function lastSevenDays(days) {
			const byDate = new Map(days.map((d) => [d.date, d]));
			const out = [];
			const cursor = /* @__PURE__ */ new Date();
			cursor.setHours(0, 0, 0, 0);
			cursor.setDate(cursor.getDate() - 6);
			for (let i = 0; i < 7; i++) {
				const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
				const d = byDate.get(iso);
				out.push({
					date: iso,
					requests: d?.requests ?? 0,
					measuredRequests: d?.measuredRequests ?? 0,
					reportedRequests: d?.reportedRequests ?? 0,
					totalTokens: d?.totalTokens ?? 0,
					models: d?.models ?? []
				});
				cursor.setDate(cursor.getDate() + 1);
			}
			return out;
		}
		function quantileBuckets(values) {
			const positive = values.filter((v) => v > 0).sort((a, b) => a - b);
			if (positive.length === 0) return [
				0,
				0,
				0,
				0
			];
			const q = (p) => positive[Math.min(positive.length - 1, Math.floor(p * positive.length))];
			return [
				q(.25),
				q(.5),
				q(.75),
				q(.95)
			];
		}
		function bucketLevel(value, buckets) {
			if (value <= 0) return 0;
			if (value <= buckets[0]) return 1;
			if (value <= buckets[1]) return 2;
			if (value <= buckets[2]) return 3;
			return 4;
		}
		function buildHeatmap(days) {
			const buckets = quantileBuckets(days.map((d) => d.totalTokens));
			const dayMap = new Map(days.map((d) => [d.date, d]));
			const today = /* @__PURE__ */ new Date();
			today.setHours(0, 0, 0, 0);
			const start = new Date(today);
			start.setDate(start.getDate() - 364);
			start.setDate(start.getDate() - start.getDay());
			const weeks = [];
			const months = [];
			const monthNames = [
				"Jan",
				"Feb",
				"Mar",
				"Apr",
				"May",
				"Jun",
				"Jul",
				"Aug",
				"Sep",
				"Oct",
				"Nov",
				"Dec"
			];
			let lastMonthCol = -4;
			let prevMonthIdx = -1;
			let week = [];
			const cursor = new Date(start);
			while (cursor <= today) {
				const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
				const m = cursor.getMonth();
				if (cursor.getDay() === 0 && m !== prevMonthIdx && weeks.length - lastMonthCol >= 4) {
					months.push({
						label: monthNames[m],
						col: weeks.length
					});
					lastMonthCol = weeks.length;
					prevMonthIdx = m;
				}
				const d = dayMap.get(iso);
				week.push({
					date: iso,
					requests: d?.requests ?? 0,
					totalTokens: d?.totalTokens ?? 0,
					level: d ? bucketLevel(d.totalTokens, buckets) : 0,
					dayOfWeek: cursor.getDay()
				});
				if (cursor.getDay() === 6) {
					weeks.push(week);
					week = [];
				}
				cursor.setDate(cursor.getDate() + 1);
			}
			if (week.length > 0) {
				while (week.length < 7) week.push({
					date: "",
					requests: 0,
					totalTokens: 0,
					level: 0,
					dayOfWeek: week.length
				});
				weeks.push(week);
			}
			return {
				weeks,
				months,
				buckets
			};
		}
		function UsageFilters({ surface, range, onSurface, onRange, t }) {
			const surfaces = useSurfaces();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "usage-filters",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "usage-segmented",
					role: "group",
					"aria-label": t("logs.filter.surface.label"),
					children: ["all", ...surfaces.map((s) => s.id)].map((choice) => {
						const label = surfaceLabel(choice, surfaces);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: `usage-segmented-btn usage-source-btn${surface === choice ? " active" : ""}`,
							"aria-label": label,
							"aria-pressed": surface === choice,
							onClick: () => onSurface(choice),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "usage-source-label",
								children: label
							})
						}, choice);
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "usage-segmented",
					role: "group",
					"aria-label": t("usage.title"),
					children: [
						"all",
						"30d",
						"7d"
					].map((choice) => {
						const label = choice === "all" ? t("usage.range.available") : t(`usage.range.${choice}`);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: `usage-segmented-btn${range === choice ? " active" : ""}`,
							"aria-label": label,
							"aria-pressed": range === choice,
							onClick: () => onRange(choice),
							children: label
						}, choice);
					})
				})]
			});
		}
		function UsageSummaryCards({ summary, activeDays, locale, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "usage-cards usage-cards-3x2",
				role: "group",
				"aria-label": t("usage.title"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "stat",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "muted",
							children: t("usage.card.requests")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "stat-value",
							children: summary.requests
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "stat",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "muted",
							children: t("usage.card.measured")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "stat-value",
							children: summary.measuredRequests
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "stat",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "muted",
							children: t("usage.card.totalTokens")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "stat-value",
							children: formatTokens(summary.totalTokens, locale)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "stat",
						title: t("usage.card.cachedTokensHint"),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "muted",
								children: t("usage.card.cachedTokens")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "stat-value",
								children: formatTokens(summary.cacheReadInputTokens ?? summary.cachedInputTokens, locale)
							}),
							(summary.cacheCreationInputTokens ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "muted text-caption",
								children: [
									t("usage.card.cacheWriteTokens"),
									": ",
									formatTokens(summary.cacheCreationInputTokens ?? 0, locale)
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "stat",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "muted",
							children: t("usage.card.coverage")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "stat-value",
							children: formatPct(summary.coverageRatio)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "stat",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "muted",
							children: t("usage.card.activeDays")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "stat-value",
							children: activeDays
						})]
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "usage-cost-row",
				role: "note",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "muted",
						children: t("usage.cost.total")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "stat-value mono usage-cost-value",
						children: summary.estimatedCostUsd === void 0 ? "Unavailable — no matched price" : formatEstimatedUsdValue(summary.estimatedCostUsd, locale)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "muted text-caption",
						children: t("usage.cost.disclaimer")
					}),
					(summary.unpricedRequests ?? 0) + (summary.unmeteredRequests ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "muted text-caption",
						children: t("usage.cost.unpricedNote").replace("{count}", String((summary.unpricedRequests ?? 0) + (summary.unmeteredRequests ?? 0)))
					})
				]
			})] });
		}
		function WeekDayBars({ weekBars, locale, t }) {
			const [hoverDay, setHoverDay] = (0, react.useState)(null);
			const max = Math.max(1, ...weekBars.map((day) => day.totalTokens));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "daybars",
				role: "img",
				"aria-label": t("usage.section.heatmap"),
				children: weekBars.map((day) => {
					const percentage = Math.round(day.totalTokens / max * 100);
					const label = day.date.slice(5);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "daybar",
						onMouseEnter: () => setHoverDay(day.date),
						onMouseLeave: () => setHoverDay((current) => current === day.date ? null : current),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "daybar-track",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "daybar-stack",
									style: { ["--daybar-scale"]: String(Math.max(0, Math.min(1, percentage / 100))) },
									children: [day.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "daybar-seg",
										style: {
											flexGrow: model.totalTokens,
											background: modelColor(model.model, model.provider)
										}
									}, `${model.provider}/${model.model}`)), day.models.length === 0 && day.totalTokens > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "daybar-seg",
										style: {
											flexGrow: 1,
											background: "var(--green)"
										}
									})]
								})
							}),
							hoverDay === day.date && day.totalTokens > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "daybar-tip",
								role: "tooltip",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "daybar-tip-date",
									children: day.date
								}), day.models.slice(0, 8).map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "daybar-tip-row",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "daybar-tip-swatch",
											style: { background: modelColor(model.model, model.provider) }
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "daybar-tip-name",
											children: modelLabel(model.model)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "daybar-tip-val",
											children: formatTokens(model.totalTokens, locale)
										})
									]
								}, `${model.provider}/${model.model}`))]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "daybar-count",
								children: formatTokens(day.totalTokens, locale)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "daybar-label muted",
								children: label
							})
						]
					}, day.date);
				})
			});
		}
		function UsageHeatmapPanel({ range, heatmap, weekBars, locale, t }) {
			const heatmapRef = (0, react.useRef)(null);
			const [hoverCell, setHoverCell] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				const element = heatmapRef.current;
				if (!element) return;
				const pinRight = () => {
					element.scrollLeft = element.scrollWidth;
				};
				pinRight();
				const observer = new ResizeObserver(pinRight);
				observer.observe(element);
				return () => observer.disconnect();
			}, [heatmap, range]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "panel",
				style: { marginTop: 16 },
				"aria-labelledby": "usage-heatmap-title",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					id: "usage-heatmap-title",
					className: "panel-title",
					children: t("usage.section.heatmap")
				}), range === "7d" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WeekDayBars, {
					weekBars,
					locale,
					t
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "heatmap",
					ref: heatmapRef,
					role: "img",
					"aria-labelledby": "usage-heatmap-title",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "heatmap-months",
							style: { gridTemplateColumns: `28px repeat(${heatmap.weeks.length}, calc(var(--hm-cell) + var(--hm-gap)))` },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "heatmap-day-spacer" }), heatmap.months.map((month) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "heatmap-month",
								style: { gridColumn: month.col + 2 },
								children: month.label
							}, `${month.label}-${month.col}`))]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "heatmap-body",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "heatmap-days",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("usage.dayMon") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("usage.dayWed") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("usage.dayFri") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "heatmap-grid",
								style: { gridTemplateColumns: `repeat(${heatmap.weeks.length}, var(--hm-cell))` },
								children: heatmap.weeks.map((week, weekIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "heatmap-week",
									children: week.map((cell, dayIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: `heatmap-cell heatmap-cell-${cell.level}`,
										onMouseEnter: (event) => {
											if (!cell.date) return;
											const rect = event.currentTarget.getBoundingClientRect();
											setHoverCell({
												weekIndex,
												dayIndex,
												x: rect.left + rect.width / 2,
												y: rect.top
											});
										},
										onMouseLeave: () => setHoverCell((current) => current?.weekIndex === weekIndex && current.dayIndex === dayIndex ? null : current)
									}, cell.date || `pad-${weekIndex}-${dayIndex}`))
								}, week[0]?.date || `week-${weekIndex}`))
							})]
						}),
						hoverCell && (() => {
							const cell = heatmap.weeks[hoverCell.weekIndex]?.[hoverCell.dayIndex];
							if (!cell?.date) return null;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "heatmap-tip",
								role: "tooltip",
								style: {
									left: hoverCell.x,
									top: hoverCell.y
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "heatmap-tip-date",
										children: cell.date
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "heatmap-tip-val",
										children: t("usage.heatmap.tooltipTokens", { tokens: formatTokens(cell.totalTokens, locale) })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "heatmap-tip-req muted",
										children: t("usage.heatmap.tooltipRequests", { requests: cell.requests })
									})
								]
							});
						})(),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "heatmap-legend muted",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("usage.heatmap.less") }),
								[
									0,
									1,
									2,
									3,
									4
								].map((level) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: `heatmap-cell heatmap-cell-${level}` }, level)),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("usage.heatmap.more") })
							]
						})
					]
				})]
			});
		}
		function UsageWorkspaceSection({ title, titleId, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "usw-section",
				"aria-labelledby": titleId,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					id: titleId,
					className: "h-section",
					children: title
				}), children]
			});
		}
		function UsageModelsTable({ models, modelQuery, onModelQuery, locale, t, workspace = false }) {
			const searchLabel = t("usage.search.models");
			const sectionLabel = t("usage.section.models");
			const titleId = "usage-models-title";
			const searchInput = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				className: "input",
				"aria-label": searchLabel,
				placeholder: searchLabel,
				value: modelQuery,
				onChange: (event) => onModelQuery(event.target.value)
			});
			const table = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "tbl-wrap",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: "tbl",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("logs.col.model") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("logs.col.provider") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							className: "num",
							children: t("usage.col.requests")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							className: "num",
							children: t("usage.col.measured")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							className: "num",
							children: t("usage.col.tokens")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("usage.col.share") })
					] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: "mono",
							children: modelLabel(model.model)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: "muted",
							children: formatProviderDisplayName(model.provider, t)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: "num",
							children: model.requests
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: "num",
							children: model.measuredRequests
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: "num mono",
							children: formatTokens(model.totalTokens, locale)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "usage-bar",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "usage-bar-fill",
								style: { width: `${Math.round(model.shareRatio * 100)}%` }
							})
						}) })
					] }, `${model.provider}/${model.model}`)) })]
				})
			});
			if (workspace) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(UsageWorkspaceSection, {
				title: sectionLabel,
				titleId,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "usw-section-toolbar",
					children: searchInput
				}), table]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "panel",
				style: { marginTop: 16 },
				"aria-labelledby": titleId,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "panel-head",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						id: titleId,
						className: "panel-title",
						children: sectionLabel
					}), searchInput]
				}), table]
			});
		}
		function UsageProvidersTable({ providers, locale, t, workspace = false }) {
			const sectionLabel = t("usage.section.providers");
			const titleId = "usage-providers-title";
			const table = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "tbl-wrap",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
					className: "tbl",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("logs.col.provider") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							className: "num",
							children: t("usage.col.requests")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							className: "num",
							children: t("usage.col.measured")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
							className: "num",
							children: t("usage.col.tokens")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("usage.col.share") })
					] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: providers.map((provider) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: "mono",
							children: formatProviderDisplayName(provider.provider, t)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: "num",
							children: provider.requests
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: "num",
							children: provider.measuredRequests
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: "num mono",
							children: formatTokens(provider.totalTokens, locale)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "usage-bar",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "usage-bar-fill",
								style: { width: `${Math.round(provider.shareRatio * 100)}%` }
							})
						}) })
					] }, provider.provider)) })]
				})
			});
			if (workspace) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageWorkspaceSection, {
				title: sectionLabel,
				titleId,
				children: table
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "panel",
				style: { marginTop: 16 },
				"aria-labelledby": titleId,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					id: titleId,
					className: "panel-title",
					children: sectionLabel
				}), table]
			});
		}
		function UsageCoveragePanel({ summary, t, workspace = false }) {
			const sectionLabel = t("usage.section.coverage");
			const titleId = "usage-coverage-title";
			const body = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "usage-cards usage-cards-3x2",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "stat",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "muted",
							children: t("usage.coverage.measured")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "stat-value",
							children: summary.measuredRequests
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "stat",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "muted",
							children: t("usage.coverage.reported")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "stat-value",
							children: summary.reportedRequests
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "stat",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "muted",
							children: t("usage.coverage.estimated")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "stat-value",
							children: summary.estimatedRequests
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "stat",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "muted",
							children: t("logs.tokens.unreported")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "stat-value",
							children: summary.unreportedRequests
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "stat",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "muted",
							children: t("logs.tokens.unsupported")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "stat-value",
							children: summary.unsupportedRequests
						})]
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "muted text-control",
				style: { marginTop: 12 },
				children: t("usage.coverage.note")
			})] });
			if (workspace) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageWorkspaceSection, {
				title: sectionLabel,
				titleId,
				children: body
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "panel",
				style: { marginTop: 16 },
				"aria-labelledby": titleId,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					id: titleId,
					className: "panel-title",
					children: sectionLabel
				}), body]
			});
		}
		/**
		* Workspace layout for Usage: left rail picks one report section so Overview /
		* Models / Providers / Coverage do not stack into a long scroll.
		*/
		function UsageWorkspaceBody({ data, heatmap, weekBars, activeDays, filteredModels, modelQuery, onModelQuery, sortedProviders, range, locale, t }) {
			const empty = !!data && data.summary.requests === 0;
			const sections = [
				{
					id: "overview",
					label: t("usage.section.overview"),
					meta: data ? `${data.summary.requests}` : "—",
					body: data ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageSummaryCards, {
						summary: data.summary,
						activeDays,
						locale,
						t
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageHeatmapPanel, {
						range,
						heatmap,
						weekBars,
						locale,
						t
					})] }) : null
				},
				{
					id: "models",
					label: t("usage.section.models"),
					meta: data ? `${data.models.length}` : "—",
					body: data ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageModelsTable, {
						models: filteredModels,
						modelQuery,
						onModelQuery,
						locale,
						t,
						workspace: true
					}) : null
				},
				{
					id: "providers",
					label: t("usage.section.providers"),
					meta: data ? `${data.providers.length}` : "—",
					body: data ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageProvidersTable, {
						providers: sortedProviders,
						locale,
						t,
						workspace: true
					}) : null
				},
				{
					id: "coverage",
					label: t("usage.section.coverage"),
					meta: data ? formatPct(data.summary.coverageRatio) : "—",
					body: data ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageCoveragePanel, {
						summary: data.summary,
						t,
						workspace: true
					}) : null
				}
			];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "usage-workspace-shell",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "usage-workspace-root",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SectionTabs, {
						scope: "usage",
						ariaLabel: t("usage.workspace.sections"),
						items: sections.map((s) => ({
							id: s.id,
							label: s.label,
							meta: s.meta
						}))
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
						className: "usage-workspace-main",
						"aria-label": t("usage.workspace.report"),
						children: empty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { title: t("usage.empty") }) : sections.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							id: sectionAnchorId("usage", s.id),
							className: "usw-body usw-section-block",
							children: s.body
						}, s.id))
					})]
				})
			});
		}
		/** Held usage payloads so provider/surface tab switches skip a cold ~5s refetch. */
		const usageMemoryCache = /* @__PURE__ */ new Map();
		function usageCacheKey(apiBase, range, surface) {
			return `aezy.observability.usage.v1:${apiBase}:${range}:${surface}`;
		}
		function readHeldUsage(apiBase, range, surface) {
			const key = usageCacheKey(apiBase, range, surface);
			return usageMemoryCache.get(key) ?? readSessionListCache(key);
		}
		function writeHeldUsage(apiBase, range, surface, value) {
			const key = usageCacheKey(apiBase, range, surface);
			usageMemoryCache.set(key, value);
			writeSessionListCache(key, value);
		}
		function Usage({ apiBase }) {
			const { t, locale } = useI18n();
			const [range, setRange] = (0, react.useState)("30d");
			const [surface, setSurface] = (0, react.useState)("all");
			const [modelQuery, setModelQuery] = (0, react.useState)("");
			const loadUsage = (0, react.useCallback)(async (signal) => {
				const response = await aezyFetch(`${apiBase}/api/usage?range=${range}&surface=${surface}`, { signal });
				if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
				const next = await response.json();
				writeHeldUsage(apiBase, range, surface, next);
				return next;
			}, [
				apiBase,
				range,
				surface
			]);
			const resourceKey = usageCacheKey(apiBase, range, surface);
			const cached = readHeldUsage(apiBase, range, surface);
			const resource = useDataSurface(resourceKey, [
				apiBase,
				range,
				surface
			], loadUsage, {
				isEmpty: () => false,
				initialData: cached ?? void 0
			});
			const { state } = resource;
			const data = state.data ?? cached ?? null;
			const heatmap = (0, react.useMemo)(() => buildHeatmap(data?.days ?? []), [data?.days]);
			const weekBars = (0, react.useMemo)(() => lastSevenDays(data?.days ?? []), [data?.days]);
			const activeDays = (0, react.useMemo)(() => (data?.days ?? []).filter((d) => d.requests > 0).length, [data?.days]);
			const filteredModels = (0, react.useMemo)(() => {
				const q = modelQuery.trim().toLowerCase();
				const sorted = (data?.models ?? []).toSorted((a, b) => b.totalTokens - a.totalTokens);
				if (!q) return sorted.slice(0, 100);
				return sorted.filter((m) => m.model.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q) || (m.resolvedModel ?? "").toLowerCase().includes(q)).slice(0, 100);
			}, [data?.models, modelQuery]);
			const sortedProviders = (0, react.useMemo)(() => (data?.providers ?? []).toSorted((a, b) => b.totalTokens - a.totalTokens), [data?.providers]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "page-head usage-head",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						id: "usage-page-title",
						children: t("usage.title")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageFilters, {
						surface,
						range,
						onSurface: setSurface,
						onRange: setRange,
						t
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "page-sub",
					children: t("usage.subtitle")
				}),
				state.showSkeleton && !data ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DataSurfaceSkeleton, {
					label: t("usage.loading"),
					rows: 5
				}) : state.kind === "failed-cold" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Notice, {
					tone: "err",
					children: [
						state.error instanceof Error ? `${t("usage.loadError")} ${state.error.message}` : t("usage.loadError"),
						" ",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "btn btn-ghost btn-sm",
							onClick: () => resource.refresh(),
							children: t("common.retry")
						})
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					state.showError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, {
						tone: "err",
						children: t("usage.loadError")
					}),
					!!data?.persistenceErrors && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, {
						tone: "err",
						children: "Some observations could not be persisted. Usage is incomplete."
					}),
					data?.historyTruncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Notice, {
						tone: "warn",
						children: (() => {
							const start = renderableInstant(data.snapshotWindowStart);
							const end = renderableInstant(data.snapshotWindowEnd);
							return start !== null && end !== null ? t("usage.historyTruncatedWindow", {
								start,
								end
							}) : t("usage.historyTruncated");
						})()
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageWorkspaceBody, {
						data,
						heatmap,
						weekBars,
						activeDays,
						filteredModels,
						modelQuery,
						onModelQuery: setModelQuery,
						sortedProviders,
						range,
						locale,
						t
					})
				] })
			] });
		}
		function renderableInstant(value) {
			if (typeof value !== "number" || !Number.isFinite(value)) return null;
			const at = new Date(value);
			return Number.isFinite(at.getTime()) ? at.toLocaleString() : null;
		}
		//#endregion
		//#region src/client/vendor/styles.ts
		const styles = `@scope (.aezy-observability) {
:scope {
  color-scheme: light dark;

  --bg:           light-dark(#ffffff, #212121);
  --rail:         light-dark(#f9f9f9, #171717);
  --surface:      light-dark(#ffffff, #262626);
  --raised:       light-dark(#f4f4f4, #303030);
  --raised-hover: light-dark(#ececec, #3a3a3a);
  --border:       light-dark(#e6e6e6, #3d3d3d);
  --border-soft:  light-dark(#f0f0f0, #333333);
  --hover:        light-dark(rgba(13, 13, 13, 0.03), rgba(255, 255, 255, 0.03));

  --text:  light-dark(#0d0d0d, #ececec);
  --muted: light-dark(#6e6e6e, #a6a6a6);
  --faint: light-dark(#707070, #9a9a9a);
  --accent:       light-dark(#0d0d0d, #ececec);
  --accent-hover: light-dark(#3d3d3d, #ffffff);
  --accent-ink:   light-dark(#ffffff, #0d0d0d);
  --accent-soft:  light-dark(rgba(13, 13, 13, 0.06), rgba(255, 255, 255, 0.09));
  --accent-ring:  light-dark(rgba(0, 0, 0, 0.5), rgba(255, 255, 255, 0.38));

  --green:      light-dark(#0a7d5c, #4ecb9d);
  --green-soft: light-dark(rgba(16, 163, 127, 0.10), rgba(78, 203, 157, 0.13));
  --red:        light-dark(#b91c1c, #f87171);
  --red-soft:   light-dark(rgba(185, 28, 28, 0.09), rgba(248, 113, 113, 0.13));
  --amber:      light-dark(#9a4a08, #fbbf24);
  --amber-soft: light-dark(rgba(180, 83, 9, 0.10), rgba(251, 191, 36, 0.13));
  --blue:       light-dark(#1d4ed8, #7aa2ff);
  --blue-soft:  light-dark(rgba(29, 78, 216, 0.10), rgba(122, 162, 255, 0.16));
  --space-0-5: 2px;
  --space-1: 4px;
  --space-1-5: 6px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --prose-measure: 70ch;

  --radius-2xs: 4px;
  --radius: 12px;
  --radius-sm: 8px;
  --radius-xs: 6px;
  --radius-lg: 16px;
  --radius-round: 50%;
  --radius-pill: 999px;
  --font-ui: "OpenAI Sans", "Pretendard Variable", Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
  --font-code: ui-monospace, "SFMono-Regular", "Cascadia Code", "JetBrains Mono", "Noto Sans Mono CJK KR", Menlo, Consolas, monospace;
  --font: var(--font-ui);
  --mono: var(--font-code);

  --text-micro: 10px;
  --text-caption: 11px;
  --text-label: 12px;
  --text-control: 13px;
  --text-body: 14px;
  --text-subtitle: 16px;
  --text-title: 20px;
  --text-display: 24px;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  --leading-tight: 1.2;
  --leading-ui: 1.35;
  --leading-body: 1.5;
  --leading-relaxed: 1.6;
  --tracking-normal: 0;
  --tracking-wide: 0.04em;

  --control-sm: 28px;
  --control-md: 34px;
  --control-lg: 40px;
  --control-touch: 44px;

  --icon-sm: 14px;
  --icon-md: 16px;
  --icon-lg: 20px;

  --motion-fast: 120ms;
  --motion-normal: 180ms;
  --z-sticky: 20;
  --z-overlay: 30;
  --z-popover: 40;
  --z-modal: 50;

  --shadow: 0 1px 2px light-dark(rgba(16, 24, 40, 0.06), rgba(0, 0, 0, 0.5)), 0 10px 28px light-dark(rgba(16, 24, 40, 0.07), rgba(0, 0, 0, 0.30));
  --shadow-sm: 0 1px 2px light-dark(rgba(16, 24, 40, 0.06), rgba(0, 0, 0, 0.4));
  --toggle-w: 36px;
  --toggle-h: 20px;
  --toggle-dot: 14px;
  --toggle-off-bg: light-dark(#d4d4d4, #4a4a4a);
  --toggle-on-bg: light-dark(#0d0d0d, #4ecb9d);
  --toggle-dot-color: light-dark(#ffffff, #0d0d0d);
}
:scope[data-theme="light"] { color-scheme: light; }
:scope[data-theme="dark"]  { color-scheme: dark; }
:scope {
  --glass-rail:  light-dark(rgba(249, 249, 249, 0.66), rgba(23, 23, 23, 0.62));
  --glass-panel: light-dark(rgba(255, 255, 255, 0.78), rgba(38, 38, 38, 0.82));
  --glass-blur:  saturate(1.6) blur(22px);
}

* { box-sizing: border-box; }

:scope, :scope, #root { height: 100%; }

:scope { overflow-x: hidden; background: var(--bg); }

:scope {
  margin: 0;
  overflow-x: hidden;
  background: transparent;
  color: var(--text);
  font-family: var(--font-ui);
  font-size: var(--text-body);
  line-height: var(--leading-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

a { color: var(--text); text-decoration: underline; text-decoration-color: var(--faint); text-underline-offset: 2px; }
a:hover { text-decoration-color: var(--text); }

code { font-family: var(--font-code); font-size: var(--text-label); }
.mono { font-family: var(--font-code); font-variant-numeric: tabular-nums; }

h1, h2, h3, h4 { margin: 0; font-weight: var(--weight-semibold); letter-spacing: 0; line-height: var(--leading-tight); }
.text-micro { font-size: var(--text-micro) !important; line-height: var(--leading-ui); }
.text-caption { font-size: var(--text-caption) !important; line-height: var(--leading-ui); }
.text-label { font-size: var(--text-label) !important; line-height: var(--leading-ui); }
.text-control { font-size: var(--text-control) !important; line-height: var(--leading-ui); }
p.muted.text-label,
p.muted.text-control {
  max-width: var(--prose-measure);
}
.text-body { font-size: var(--text-body) !important; line-height: var(--leading-body); }
.text-subtitle { font-size: var(--text-subtitle) !important; line-height: var(--leading-tight); }
.text-title { font-size: var(--text-title) !important; line-height: var(--leading-tight); }
.text-display { font-size: var(--text-display) !important; line-height: var(--leading-tight); }
.font-regular { font-weight: var(--weight-regular) !important; }
.font-medium { font-weight: var(--weight-medium) !important; }
.font-semibold { font-weight: var(--weight-semibold) !important; }
.font-bold { font-weight: var(--weight-bold) !important; }
.leading-tight { line-height: var(--leading-tight) !important; }
.leading-ui { line-height: var(--leading-ui) !important; }
.leading-body { line-height: var(--leading-body) !important; }
.leading-relaxed { line-height: var(--leading-relaxed) !important; }
input[type="checkbox"], input[type="radio"] { accent-color: var(--accent); }
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-thumb { background: var(--border); border-radius: var(--radius-pill); border: 2px solid var(--bg); }
*::-webkit-scrollbar-thumb:hover { background: var(--faint); }
.main-inner.main-inner--combos > .page-head,
.main-inner.main-inner--combos > .page-tabs,
.main-inner.main-inner--combos > .codex-stale-banner,
.main-inner.main-inner--combos > .page-sub {
  flex-shrink: 0;
  padding-inline: 36px;
}
.main-inner.main-inner--combos > .page-sub { margin-bottom: 10px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 6px; }
.page-head h2 { font-size: var(--text-title); }
.page-head-actions { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
.page-sub { color: var(--muted); font-size: var(--text-body); margin: 4px 0 22px; max-width: var(--prose-measure); }
.page-tabs { display: flex; flex-wrap: wrap; gap: 2px; border-bottom: 1px solid var(--border); margin: 2px 0 14px; overflow: visible; }
.page-tab { flex: 0 0 auto; white-space: nowrap; appearance: none; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; padding: 8px 12px; color: var(--muted); cursor: pointer; font: inherit; font-size: var(--text-control); }
.page-tab:hover { color: var(--text); }
.page-tab--active { color: var(--text); border-bottom-color: var(--accent); font-weight: var(--weight-semibold); }
.page-tab:focus-visible { outline: 2px solid var(--accent-ring); outline-offset: -2px; }
.section-tabs {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--bg);
  padding-top: 6px;
  margin-top: 0;
}
.section-tab-meta {
  margin-left: 6px;
  color: var(--muted);
  font-size: var(--text-label);
  font-weight: var(--weight-regular);
  font-variant-numeric: tabular-nums;
}
.page-tab--active > .section-tab-meta { color: var(--text); }
.page-sub b { color: var(--text); font-weight: var(--weight-semibold); }
.api-page .page-sub code {
  font-size: var(--text-label);
  color: var(--text);
  background: var(--raised);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-xs);
  padding: 1px 4px;
}
.api-endpoints > div > .muted {
  flex: 0 0 auto;
  line-height: 1.3;
}
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 8px 16px; border-radius: var(--radius-pill);
  font: inherit; font-size: var(--text-control); font-weight: var(--weight-medium); line-height: var(--leading-ui); cursor: pointer;
  border: 1px solid transparent; transition: background var(--motion-fast), border-color var(--motion-fast), opacity var(--motion-fast); white-space: nowrap;
}
a.btn, a.btn:hover { text-decoration: none; }
.btn svg { width: 15px; height: 15px; }
.btn:disabled { opacity: 0.55; cursor: default; }
.btn-primary { background: var(--accent); color: var(--accent-ink); }
.btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn-ghost { background: var(--bg); color: var(--text); border-color: var(--border); }
.btn-ghost:hover:not(:disabled) { background: var(--raised); }
.btn-danger { background: transparent; color: var(--red); border-color: rgba(248, 113, 113, 0.3); }
.btn-danger:hover:not(:disabled) { background: var(--red-soft); }
.btn-sm { padding: 4px 12px; font-size: var(--text-label); border-radius: var(--radius-pill); }
.btn-icon {
  appearance: none;
  border: none;
  background: transparent;
  font: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--muted);
  border-radius: var(--radius-sm);
  transition: background var(--motion-fast), color var(--motion-fast);
}
.btn-icon:hover { background: var(--raised-hover); color: var(--text); }
.btn-icon:focus-visible { outline: 2px solid var(--accent-ring); outline-offset: 1px; }
.btn-icon svg { width: 16px; height: 16px; display: block; }
.btn.btn-ghost.btn-icon { width: 28px; height: 28px; padding: 0; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); min-width: 0; }
.panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; }
.panel-accent { border-color: color-mix(in srgb, var(--accent) 28%, var(--border)); background: color-mix(in srgb, var(--accent) 5%, var(--surface)); }
.api-panel .panel-title { margin: 0; }
.api-panel .muted { margin: 0; }
.api-panel-head .panel-title {
  min-width: 0;
}
.api-panel-head .muted {
  flex: 0 0 auto;
  text-align: right;
}
.api-form-row .input { flex: 1; min-width: 0; }
@keyframes sync-toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.spin-icon { animation: spin 0.9s linear infinite; }
.update-command .chip {
  max-width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-wrap: anywhere;
  line-height: 1.5;
}
.update-recheck .btn { flex: 0 0 auto; }

@media (max-width: 800px) {
  .injection-head > .badge { order: 1; margin-left: auto; }
}
.stat-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 28px; }
.stat-row > .stat { min-height: 80px; display: flex; flex-direction: column; justify-content: center; }
@container (max-width: 820px) { .stat-row { grid-template-columns: repeat(3, 1fr); } }
@container (max-width: 480px) { .stat-row { grid-template-columns: repeat(2, 1fr); } }
.stat { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; transition: border-color var(--motion-fast); }
.stat:hover { border-color: var(--faint); }
.stat .label { font-size: var(--text-label); color: var(--muted); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; font-weight: var(--weight-medium); }
.stat .label svg { width: 14px; height: 14px; }
.stat .value { font-size: var(--text-title); font-weight: var(--weight-semibold); letter-spacing: 0; line-height: var(--leading-tight); }
.stat .value.mono { font-family: var(--font-code); font-size: var(--text-subtitle); }
.mem-stats .stat-sub {
  font-size: var(--text-caption);
  color: var(--faint);
  margin-top: 4px;
}
.stat .value--warn { color: var(--amber); }
.stat .value--danger { color: var(--red); }

.dash-overview-head .stat-row {
  margin-bottom: 0;
}
.badge { display: inline-flex; align-items: center; gap: 5px; font-size: var(--text-caption); font-weight: var(--weight-semibold); line-height: var(--leading-ui); padding: 2px 8px; border-radius: var(--radius-pill); border: 1px solid transparent; font-family: var(--font-code); letter-spacing: 0; }
.badge-accent { background: var(--accent-soft); color: var(--text); }
.badge-green { background: var(--green-soft); color: var(--green); }
.badge-amber { background: var(--amber-soft); color: var(--amber); }
.badge-muted { background: var(--raised); color: var(--muted); border: 1px solid var(--border); }
.badge-clickable { cursor: pointer; transition: filter var(--motion-fast); appearance: none; }
.badge-clickable:hover { filter: brightness(1.1); }
.badge-disabled { opacity: 0.5; cursor: default; }
.card-badges { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.card-badges .badge { flex-shrink: 0; }
.tbl { width: 100%; border-collapse: collapse; font-size: var(--text-control); }
.tbl thead th { text-align: left; padding: 9px 12px; color: var(--muted); font-weight: var(--weight-medium); font-size: var(--text-label); border-bottom: 1px solid var(--border); }
.tbl tbody td { padding: 10px 12px; border-bottom: 1px solid var(--border-soft); }
.tbl tbody tr:last-child td { border-bottom: none; }
.tbl tbody tr:hover td { background: var(--hover); }

.checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.tbl .num { text-align: right; font-family: var(--font-code); font-variant-numeric: tabular-nums; }
.tbl-wrap {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow-x: auto;
  background: var(--surface);
  padding: var(--space-3);
}
.awi-overview-section .api-models-panel > .input,
.awi-overview-section .api-models-panel > .api-panel-head,
.awi-overview-section .api-models-panel > .muted {
  flex: 0 0 auto;
}
.input, textarea.input {
  width: 100%; padding: 8px 11px; border-radius: var(--radius-sm);
  background: var(--raised); border: 1px solid var(--border); color: var(--text);
  font: inherit; font-size: var(--text-control); line-height: var(--leading-ui); transition: border-color var(--motion-fast);
}
.input::placeholder { color: var(--faint); }
.input:focus { border-color: var(--faint); outline: none; box-shadow: 0 0 0 3px var(--accent-soft); }
textarea.input { resize: vertical; font-family: var(--font-code); line-height: var(--leading-relaxed); }
select.input { appearance: none; }
.switch {
  width: 34px;
  height: 20px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  cursor: pointer;
  background: var(--raised);
  display: inline-flex;
  align-items: center;
  padding: 2px;
  flex-shrink: 0;
  line-height: 0;
  vertical-align: middle;
  transition: background var(--motion-normal), border-color var(--motion-normal);
  appearance: none;
  -webkit-appearance: none;
}
.switch.on { background: var(--toggle-on-bg); border-color: var(--toggle-on-bg); }
.switch.mixed { background: var(--amber-soft); border-color: var(--amber); }
.switch:disabled { opacity: 0.6; cursor: default; }
.switch .knob {
  width: 14px;
  height: 14px;
  border-radius: var(--radius-round);
  background: light-dark(#ffffff, #ececec);
  box-shadow: 0 0 0 1px rgba(16, 24, 40, 0.08), 0 1px 1px rgba(16, 24, 40, 0.18);
  transform: translateX(0);
  transition: transform var(--motion-normal), background var(--motion-normal);
}
.switch.on .knob {
  transform: translateX(14px);
  background: var(--toggle-dot-color);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
}
.switch.mixed .knob { transform: translateX(7px); }
.muted { color: var(--muted); }
.chip { font-family: var(--font-code); font-size: var(--text-label); line-height: var(--leading-ui); background: var(--raised); border: 1px solid var(--border); padding: 1px 7px; border-radius: var(--radius-xs); color: var(--text); }

.empty { text-align: center; padding: 56px 20px; border: 1px dashed var(--border); border-radius: var(--radius); color: var(--muted); }
.empty svg { width: 30px; height: 30px; color: var(--faint); margin-bottom: 12px; }
.empty .title { color: var(--text); font-weight: var(--weight-semibold); margin-bottom: 6px; }

.notice { font-size: var(--text-control); line-height: var(--leading-body); padding: 9px 12px; border-radius: var(--radius-sm); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; max-width: var(--prose-measure); }
.notice svg { width: 15px; height: 15px; flex-shrink: 0; }
@keyframes toast-notice-in {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.notice-ok {
  background: light-dark(#ecfdf5, color-mix(in oklab, var(--green) 18%, var(--surface)));
  color: light-dark(#065f46, #d1fae5);
  border: 1px solid color-mix(in srgb, var(--green) 32%, transparent);
}
.notice-ok svg { color: var(--green); }
.notice-err {
  background: light-dark(#fef2f2, color-mix(in oklab, var(--red) 18%, var(--surface)));
  color: light-dark(#991b1b, #fee2e2);
  border: 1px solid color-mix(in srgb, var(--red) 32%, transparent);
}
.notice-err svg { color: var(--red); }

.spin { width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: var(--radius-round); display: inline-block; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .modal-card { background: var(--surface); }
}
@media (prefers-reduced-transparency: reduce) {
  .modal-card { background: var(--surface); backdrop-filter: none; -webkit-backdrop-filter: none; }
  .modal-overlay { backdrop-filter: none; -webkit-backdrop-filter: none; }
}
.modal-overlay { position: fixed; inset: 0; background: light-dark(rgba(17, 19, 28, 0.78), rgba(0, 0, 0, 0.82)); backdrop-filter: blur(40px) saturate(1.2); -webkit-backdrop-filter: blur(40px) saturate(1.2); display: flex; align-items: flex-start; justify-content: center; padding: 8vh 16px; z-index: var(--z-modal); }
dialog.modal-overlay {
  border: none;
  margin: 0;
  max-width: none;
  max-height: none;
  width: 100%;
  height: 100%;
  color: inherit;
}
dialog.modal-overlay::backdrop {
  background: transparent;
}
.modal-card {
  position: relative;
  z-index: 1;
  background: color-mix(in oklab, canvas 92%, transparent);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  width: 100%;
  max-width: 520px;
  box-shadow: var(--shadow-sm);
  max-height: 84vh;
  overflow-y: auto;
}
.modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.modal-head h3 { font-size: var(--text-subtitle); }
.card-head { display: flex; align-items: center; gap: 8px; padding: 10px 16px 4px; flex-wrap: wrap; min-width: 0; }
.card-head strong { min-width: 0; overflow-wrap: anywhere; }
.card-sub { font-size: var(--text-label); line-height: var(--leading-body); color: var(--muted); padding: 0 16px 8px; min-width: 0; overflow-wrap: anywhere; }
.card-active { border-color: var(--accent-ring); }
.card-right { margin-left: auto; display: flex; align-items: center; gap: 4px; font-size: var(--text-caption); color: var(--faint); }
.btn-icon-danger.card-right {
  appearance: none;
  background: transparent;
  border: 1px solid transparent;
  color: var(--red);
  cursor: pointer;
  justify-content: center;
}
.btn-icon-danger.card-right:hover { background: var(--red-soft); border-color: var(--red-soft); color: var(--red); }
.card-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; }
.badge-primary { background: var(--accent-soft); color: var(--accent-hover); }
.codex-auth-load-skeleton__main .card-sub {
  position: relative;
  min-height: calc(var(--leading-body) * 1em + 10px);
}
.codex-auto-switch-copy .card-sub { padding: 2px 0 0; }
.codex-request-user-input-copy .card-sub { padding: 2px 0 0; }
.codex-account-picker-copy .card-sub { padding: 4px 0 0; }
.codex-auto-switch-input-wrap .input,
.codex-auto-switch-input-wrap .codex-auto-switch-input {
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  height: auto;
  min-height: 0;
  align-self: stretch;
}
.codex-auto-switch-input-wrap .input:focus {
  border-color: transparent;
  box-shadow: none;
}
.codex-auth-action-btn.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
  border-color: transparent;
  color: var(--accent-ink);
}
@keyframes codex-auth-skeleton-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
.account-pool-strategy-card > .card-sub,
.account-pool-strategy-controls > .card-sub,
.account-pool-strategy-controls .field .card-sub,
.anthropic-pool-card__field .card-sub {
  margin: 0;
  padding: 0;
}
.notice-warn {
  font-size: var(--text-label);
  line-height: var(--leading-body);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: light-dark(#fffbeb, color-mix(in oklab, var(--amber) 20%, var(--surface)));
  color: light-dark(#92400e, #fef3c7);
  border: 1px solid color-mix(in srgb, var(--amber) 32%, transparent);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  max-width: var(--prose-measure);
}
.notice-warn svg { width: 14px; height: 14px; flex-shrink: 0; color: var(--amber); }
.codex-pool-strategy-card .card-sub { padding: 0; }
.notice.notice-warn.startup-page-notice {
  max-width: none;
  width: 100%;
  box-sizing: border-box;
}
.notice.notice-warn.startup-runtime-notice {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}
.startup-runtime-notice__fix .btn {
  flex: 0 0 auto;
}
.startup-actions .panel-head > svg { width: 18px; height: 18px; flex: 0 0 auto; }
.startup-detail-row span:not(.badge) { color: var(--muted); font-size: var(--text-label); line-height: var(--leading-body); }
.startup-actions > .muted { margin: -4px 0 14px; font-size: var(--text-control); max-width: var(--prose-measure); }
.modal-desc { font-size: var(--text-control); line-height: var(--leading-body); color: var(--muted); margin-bottom: 14px; max-width: var(--prose-measure); }
.modal-actions { display: flex; gap: 8px; margin-top: 16px; }
.modal-actions .btn { flex: 1; }
.log-reqid {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; word-break: break-all; max-width: 14ch;
}
.main-inner:has(.logs-page) {
  max-width: 1200px;
}
.log-col-model { max-width: 16ch; overflow-wrap: break-word; word-break: normal; }
.log-col-tokens { min-width: 10ch; }
.log-col-time {
  white-space: nowrap;
  vertical-align: middle;
}
.log-col-duration { white-space: nowrap; }
table.logs-table {
  width: 100%;
  min-width: 1100px;
}
.log-col-rate { min-width: 7ch; white-space: nowrap; }
.log-col-cost { min-width: 10ch; white-space: nowrap; }
.log-status-cell { display: inline-flex; flex-direction: column; align-items: flex-start; gap: var(--space-0-5); min-width: 7ch; line-height: var(--leading-tight); }
.log-detail-btn {
  background: none; border: none; padding: 0; cursor: pointer;
  color: var(--accent-hover); font: inherit; font-size: var(--text-caption); text-decoration: underline;
  white-space: nowrap;
}
.logs-auto-refresh {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.logs-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.logs-segmented {
  display: inline-flex;
  border-radius: var(--radius-pill);
  background: var(--surface-soft, var(--raised));
  padding: var(--space-1);
  gap: var(--space-1);
}

.logs-segmented .btn {
  border-radius: var(--radius-pill);
  min-width: 64px;
  padding: var(--space-1-5) var(--space-3);
  border: none;
}

.logs-filter-field {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.logs-filter-field .input {
  min-width: 220px;
  max-width: 360px;
}

.logs-conversation-totals {
  margin-bottom: var(--space-3);
}

.logs-table-wrap {
  overflow-y: auto;
  max-height: calc(100vh - 260px);
}

.logs-table thead {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--surface);
}

.logs-virtual-spacer {
  padding: 0;
  border: 0;
}

.logs-stack-end {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-0-5);
}

.logs-stack-start {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-0-5);
}

.logs-model-cell {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.logs-detail-info {
  margin-left: var(--space-2);
}

.log-detail-grid { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: var(--space-2) var(--space-3); font-size: var(--text-control); }
.log-detail-break { word-break: break-all; }
.log-detail-card { max-width: 760px; }
.log-detail-section { padding: 14px 0; border-top: 1px solid var(--border-soft); }
.log-detail-section:first-of-type { padding-top: 0; border-top: 0; }
.log-detail-section-title {
  margin: 0 0 10px; font-size: var(--text-label);
  font-weight: var(--weight-semibold); color: var(--text);
}
.log-detail-request-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
.log-detail-request-row > span { min-width: 0; }
.log-detail-notes { margin: 10px 0 0; padding-left: 18px; color: var(--muted); font-size: var(--text-label); }
.log-detail-notes-line { margin: 8px 0 0; font-size: var(--text-label); }
.log-detail-attempts-wrap { overflow-x: auto; border: 1px solid var(--border-soft); border-radius: var(--radius-sm); }
.log-detail-attempts { min-width: 680px; }
.log-detail-attempts th, .log-detail-attempts td { vertical-align: top; }
.log-detail-raw { margin-top: 14px; }
.log-detail-raw > summary { cursor: pointer; color: var(--muted); font-size: var(--text-label); }
.log-detail-raw[open] > summary { margin-bottom: 6px; }
.usage-cost-row {
  display: flex; align-items: baseline; gap: 10px;
  margin: 10px 0 4px; padding: 10px 14px;
  border: 1px solid var(--border-soft); border-radius: var(--radius-sm);
  background: var(--raised);
}
.usage-cost-value { font-size: var(--text-lg, 1.15em); }
@media (max-width: 760px) {
  .modal-overlay { padding: 16px 10px; }
  .log-detail-card { max-height: calc(100dvh - 32px); padding: 16px; }
  .log-detail-grid { grid-template-columns: minmax(7rem, max-content) minmax(0, 1fr); gap: 8px 10px; }
  .log-detail-request-row { align-items: flex-start; flex-direction: column; }
}
.log-detail-json {
  background: var(--raised); border: 1px solid var(--border-soft); border-radius: var(--radius-sm);
  padding: 10px 12px; font-family: var(--font-code); font-size: var(--text-caption); line-height: var(--leading-body);
  overflow: auto; max-height: 40vh; white-space: pre-wrap; word-break: break-all; margin: 0;
}
.list-row .title { font-weight: var(--weight-semibold); font-size: var(--text-body); }
.list-row .sub { font-size: var(--text-label); color: var(--muted); margin-top: 2px; }
.openai-mode-control .usage-segmented-btn { min-width: 76px; }
button.prov-account-row {
  text-align: left; background: none; border: none; color: var(--text); font: inherit;
  font-size: var(--text-control); line-height: var(--leading-ui); cursor: pointer;
}
button.prov-account-row:hover, .prov-account-row:hover { background: var(--raised); }
button.prov-account-row.active { cursor: default; }
.prov-account-row .badge { flex: 0 0 auto; }
.prov-account-keyform .input-sm { flex: 1 1 auto; min-width: 0; padding: 4px 8px; font-size: var(--text-label); height: var(--control-sm); }
.oauth-login-paste .input { flex: 1; min-width: 0; font-size: var(--text-label); padding: 6px 10px; }
@media (max-width: 760px) {
  .main-inner.main-inner--combos > .page-head,
  .main-inner.main-inner--combos > .page-tabs,
  .main-inner.main-inner--combos > .page-sub { padding-inline: 18px; }
  .api-form-row .btn { width: 100%; min-height: 40px; }
  .stat-row > .stat { min-width: 100px; }
  .tbl { min-width: 460px; }
  .usage-cards { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .prov-meta .chip ~ span:not(:last-child) { display: none; }
}

.usage-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 8px; }
.usage-cards .stat-value { font-size: var(--text-title); font-weight: var(--weight-semibold); margin-top: 4px; }
.usage-head { flex-wrap: wrap; align-items: flex-start; }
.usage-filters { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.usage-segmented { display: inline-flex; border: 1px solid var(--border); border-radius: var(--radius-pill); padding: 2px; gap: 2px; background: var(--surface); }
.usage-segmented-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: none; background: transparent; color: var(--muted); padding: 4px 12px; border-radius: var(--radius-pill); cursor: pointer; font: inherit; white-space: nowrap; }
.usage-segmented-btn.active { background: var(--raised); color: var(--text); font-weight: var(--weight-semibold); }
.usage-source-mark { width: var(--icon-sm); height: var(--icon-sm); flex: 0 0 auto; object-fit: contain; }
:scope[data-theme="dark"] .usage-source-mark--mono { filter: invert(1); }

@media (prefers-color-scheme: dark) {
  :scope:not([data-theme="light"]) .usage-source-mark--mono { filter: invert(1); }
}

@media (max-width: 760px) {
  .usage-segmented-btn { min-height: var(--control-touch); }
  .openai-mode-control .usage-segmented-btn { flex: 1 1 0; min-width: 0; }
}

@media (max-width: 640px) {
  .usage-source-btn .usage-source-label-collapsible { display: none; }
}

@media (max-width: 360px) {
  .usage-filters { width: 100%; flex-direction: column; align-items: stretch; }
  .usage-segmented { width: 100%; }
  .usage-segmented-btn { flex: 1 1 0; }
}
.panel-title { margin: 0 0 12px; font-size: var(--text-body); font-weight: var(--weight-semibold); color: var(--text); }
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.panel-head .panel-title { margin: 0; }
.panel-head .input { max-width: 220px; }
.heatmap { --hm-cell: 11px; --hm-gap: 3px; display: flex; flex-direction: column; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
.heatmap-months { display: grid; font-size: var(--text-caption); color: var(--muted); margin-bottom: -2px; width: max-content; }
.heatmap-day-spacer { grid-column: 1; }
.heatmap-month { white-space: nowrap; }
.heatmap-body { display: flex; gap: var(--hm-gap); width: max-content; }
.heatmap-days { display: grid; grid-template-rows: repeat(7, var(--hm-cell)); row-gap: var(--hm-gap); font-size: var(--text-micro); color: var(--muted); width: 25px; flex-shrink: 0; align-items: center; position: sticky; left: 0; background: var(--surface); z-index: 1; }
.heatmap-grid { display: grid; gap: var(--hm-gap); }
.heatmap-week { display: grid; grid-template-rows: repeat(7, var(--hm-cell)); gap: var(--hm-gap); }
.heatmap-cell { width: var(--hm-cell); height: var(--hm-cell); border-radius: var(--radius-2xs); background: var(--border); }
.heatmap-cell-0 { background: var(--border); }
.heatmap-cell-1 { background: color-mix(in oklch, var(--green) 25%, var(--surface)); }
.heatmap-cell-2 { background: color-mix(in oklch, var(--green) 50%, var(--surface)); }
.heatmap-cell-3 { background: color-mix(in oklch, var(--green) 75%, var(--surface)); }
.heatmap-cell-4 { background: var(--green); }
.heatmap-legend { display: inline-flex; align-items: center; gap: 4px; font-size: var(--text-label); align-self: flex-end; position: sticky; right: 0; }
.heatmap-legend .heatmap-cell { width: 10px; height: 10px; }
.heatmap-tip { position: fixed; z-index: 10; transform: translate(-50%, -100%) translateY(-8px); pointer-events: none;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 10px;
  box-shadow: var(--shadow-sm); white-space: nowrap; font-size: var(--text-label); }
.heatmap-tip-date { font-weight: var(--weight-semibold); color: var(--text); margin-bottom: 2px; }
.heatmap-tip-val { color: var(--text); font-variant-numeric: tabular-nums; }
.heatmap-tip-req { font-size: var(--text-caption); }
.usage-bar { width: 100%; height: 6px; background: var(--border); border-radius: var(--radius-pill); overflow: hidden; min-width: 60px; }
.usage-bar-fill { height: 100%; background: var(--green); border-radius: var(--radius-pill); }
.daybars { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; align-items: end; height: 180px; padding-top: 8px; }
.daybar { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
.daybar-track { width: 100%; max-width: 48px; flex: 1; display: flex; align-items: flex-end; background: var(--border); border-radius: var(--radius-xs); overflow: hidden; }
.daybar-stack {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column-reverse;
  border-radius: var(--radius-xs) var(--radius-xs) 0 0;
  overflow: hidden;
  min-height: 2px;
  transform: scaleY(var(--daybar-scale, 0));
  transform-origin: bottom center;
  transition: transform var(--motion-normal) ease;
}
.daybar-seg { width: 100%; min-height: 1px; }
.daybar-count { font-size: var(--text-label); font-weight: var(--weight-semibold); color: var(--text); }
.daybar-label { font-size: var(--text-caption); white-space: nowrap; }
.daybar:hover .daybar-track { outline: 1px solid var(--border); }
.daybar-tip { position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); z-index: 5;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px;
  min-width: 160px; box-shadow: var(--shadow-sm); pointer-events: none; }
.daybar-tip-date { font-size: var(--text-label); font-weight: var(--weight-semibold); color: var(--text); margin-bottom: 6px; white-space: nowrap; }
.daybar-tip-row { display: flex; align-items: center; gap: 8px; font-size: var(--text-label); line-height: var(--leading-relaxed); }
.daybar-tip-swatch { width: 10px; height: 10px; border-radius: var(--radius-2xs); flex-shrink: 0; }
.daybar-tip-name { color: var(--text); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
.daybar-tip-val { color: var(--muted); font-variant-numeric: tabular-nums; }
.setting-label .title { font-size: var(--text-body); font-weight: var(--weight-semibold); color: var(--text); }
@keyframes ocx-tooltip-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.modal-backdrop-dismiss {
  position: fixed;
  inset: 0;
  z-index: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.claude-page-intro .page-head { margin-bottom: 6px; }
.claude-page-intro .page-sub {
  margin: 4px 0 14px;
}
.claude-desktop-head .page-sub { margin-bottom: 0; }
.claude-move-row .input { min-width: 0; height: 34px; padding-block: 4px; }

@media (max-width: 760px) {
  .claude-profile-tools .btn { flex: 1; min-height: 44px; }
  .claude-save-actions .btn { flex: 1; min-height: 44px; }
  .claude-move-row .input, .claude-move-row .btn { min-height: 44px; }
}

.main-inner:has(.usage-workspace-shell) {
  max-width: 1200px;
}

.usage-workspace-shell {
  width: 100%;
  min-width: 0;
  container-type: inline-size;
  container-name: usage-workspace;
}

.usage-workspace-root {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
  width: 100%;
  max-width: 100%;
  min-height: 0;
}
.usw-section-block + .usw-section-block {
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}

.usage-workspace-rail {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  border-bottom: 1px solid var(--border);
  padding-bottom: var(--space-3);
  min-width: 0;
}

.usage-workspace-rail-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.usage-workspace-rail-title {
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
  color: var(--text);
}

.usage-workspace-rail-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
}

.usage-workspace-rail-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5);
  max-width: 100%;
  min-width: 0;
  min-height: 46px;
  appearance: none;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--space-1-5) var(--space-2);
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
  overflow: hidden;
}

.usage-workspace-rail-row:hover {
  background: var(--raised);
}

.usage-workspace-rail-row--selected {
  background: var(--raised);
  box-shadow: inset 0 0 0 1px var(--border);
}

.usage-workspace-rail-name {
  font-size: var(--text-body);
  font-weight: var(--weight-medium);
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.usage-workspace-rail-meta {
  font-size: var(--text-caption);
  color: var(--faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}

.usage-workspace-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.usw-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

.usw-section {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}

.usw-section .h-section {
  margin: 0 0 var(--space-3);
  font-size: var(--text-title);
  font-weight: var(--weight-semibold);
  line-height: 1.2;
  color: var(--text);
}

.usw-section-toolbar {
  margin: 0 0 var(--space-5);
  max-width: 220px;
}

.usw-section .tbl-wrap {
  min-width: 0;
  padding: var(--space-3);
  max-height: min(574px, 58vh);
  overflow-y: auto;
  overscroll-behavior: auto;
  scrollbar-gutter: stable;
}
.usw-section .tbl-wrap thead th {
  position: sticky;
  top: calc(-1 * var(--space-3));
  z-index: 1;
  background: var(--surface);
  border-bottom-color: transparent;
  box-shadow:
    0 calc(-1 * var(--space-3)) 0 var(--surface),
    inset 0 -1px 0 var(--border);
}

.usw-section .usage-cards {
  margin-top: 0;
}

@container usage-workspace (max-width: 720px) {
  .usage-workspace-root {
    min-height: auto;
  }
}

@media (max-width: 768px) {
  .usage-workspace-root {
    min-height: auto;
  }
}


}`;
		//#endregion
		//#region src/client/index.tsx
		const pageFromLocation = () => {
			const value = new URL(window.location.href).searchParams.get("aezyView");
			return value === "logs" || value === "usage" ? value : null;
		};
		var Navigation = class {
			page = pageFromLocation();
			listeners = /* @__PURE__ */ new Set();
			trigger = null;
			getSnapshot = () => this.page;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			open = (page, navigate = true) => {
				if (navigate && page !== pageFromLocation()) {
					const url = new URL(window.location.href);
					if (page) url.searchParams.set("aezyView", page);
					else {
						url.searchParams.delete("aezyView");
						url.searchParams.delete("aezyTab");
					}
					window.history.pushState(null, "", url);
				}
				this.page = page;
				for (const listener of this.listeners) listener();
			};
		};
		function Nav({ wide, navigation }) {
			const page = (0, react.useSyncExternalStore)(navigation.subscribe, navigation.getSnapshot);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
				"aria-label": "Observability",
				"data-aezy-observability-nav": true,
				style: {
					display: "grid",
					gap: 3,
					width: "100%"
				},
				children: ["logs", "usage"].map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					title: value === "logs" ? "Logs & Debug" : "Usage",
					"aria-label": value === "logs" ? "Logs & Debug" : "Usage",
					"aria-pressed": page === value,
					onClick: (event) => {
						navigation.trigger = event.currentTarget;
						navigation.open(value);
					},
					style: {
						display: "flex",
						alignItems: "center",
						gap: 10,
						minHeight: 36,
						width: "100%",
						border: 0,
						borderRadius: 8,
						padding: wide ? "7px 12px" : 7,
						background: page === value ? "var(--dsw-alias-bg-hover, #8882)" : "transparent",
						color: "inherit",
						font: "inherit",
						cursor: "pointer"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						viewBox: "0 0 24 24",
						width: "18",
						height: "18",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "1.7",
						"aria-hidden": "true",
						children: value === "logs" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 20V10m8 10V4m8 16v-7" })
					}), wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: value === "logs" ? "Logs & Debug" : "Usage" })]
				}, value))
			});
		}
		function Surface({ navigation }) {
			const page = (0, react.useSyncExternalStore)(navigation.subscribe, navigation.getSnapshot);
			const root = (0, react.useRef)(null);
			const [left, setLeft] = (0, react.useState)(0);
			const close = () => {
				navigation.open(null);
				navigation.trigger?.focus();
			};
			(0, react.useEffect)(() => {
				if (!page) return;
				const frame = document.querySelector("[data-app-frame]");
				const update = () => {
					const nav = document.querySelector("[data-aezy-observability-nav]");
					const sidebar = nav?.closest("aside");
					const width = sidebar?.getBoundingClientRect().right ?? nav?.getBoundingClientRect().right ?? 0;
					setLeft(window.innerWidth < 760 ? 0 : Math.round(width + (sidebar ? 0 : 12)));
				};
				update();
				const observer = new ResizeObserver(update);
				observer.observe(frame ?? document.body);
				window.addEventListener("resize", update);
				root.current?.focus();
				const key = (event) => {
					if (event.key === "Escape" && !document.querySelector("dialog[open]")) close();
				};
				document.addEventListener("keydown", key);
				return () => {
					observer.disconnect();
					window.removeEventListener("resize", update);
					document.removeEventListener("keydown", key);
				};
			}, [page]);
			if (!page) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "aezy-observability",
				ref: root,
				tabIndex: -1,
				"aria-label": page === "logs" ? "Logs & Debug workspace" : "Usage workspace",
				"data-aezy-observability-page": page,
				style: {
					position: "fixed",
					inset: `0 0 0 ${left}px`,
					pointerEvents: "auto",
					overflow: "auto",
					padding: "24px 30px",
					background: "var(--bg)",
					color: "var(--text)",
					zIndex: 4
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: styles }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: `.aezy-observability {font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.5;--font-code:ui-monospace,SFMono-Regular,monospace}
      .aezy-observability [hidden]{display:none!important}.aezy-observability .usage-filters{flex-wrap:wrap}
      .aezy-observability .usage-filters{min-width:0;max-width:100%;justify-content:flex-start}
      .aezy-observability .usage-segmented{max-width:100%;min-width:0;flex-wrap:wrap;justify-content:flex-start}
      body[data-ds-dark-theme] .aezy-observability{color-scheme:dark} body:not([data-ds-dark-theme]) .aezy-observability{color-scheme:light}
      .aezy-observability .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
      .aezy-observability .logs-table-wrap{max-height:calc(100vh - 290px)}.aezy-observability .modal-overlay{padding:0;color:var(--text)}
      .aezy-observability .aezy-page-tools{display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px}
      .aezy-observability .aezy-coverage-note{font-size:12px;color:var(--muted);margin:10px 0 18px;max-width:100ch}
      @media(max-width:760px){.aezy-observability{padding:14px!important}.aezy-observability .page-head{flex-wrap:wrap}}
    ` }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "aezy-page-tools",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "btn btn-ghost btn-sm",
							onClick: () => navigation.open(page === "logs" ? "usage" : "logs"),
							children: page === "logs" ? "Usage" : "Logs & Debug"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							className: "btn btn-ghost btn-sm",
							onClick: close,
							"aria-label": "Close observability",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconX, {}), " Back to session"]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: "aezy-coverage-note",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: "Data coverage · Aezy local observations · UTC" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "Native and gateway entries are model requests. Official App Server entries are usage notifications, or unmetered Turns when no usage arrives; not HTTP traces. Only measured tokens are summed. Pre-install history is not imported. No prompts or credentials are stored. Debug metadata is opt-in and process-local; usage records survive restart." })]
					}),
					page === "logs" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Logs, { apiBase: API_BASE }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Usage, { apiBase: API_BASE })
				]
			});
		}
		const inject = ["slots"];
		function apply(ctx) {
			const navigation = new Navigation();
			ctx.effect(() => {
				const onPop = () => navigation.open(pageFromLocation(), false);
				window.addEventListener("popstate", onPop);
				return () => window.removeEventListener("popstate", onPop);
			}, "aezy-observability: browser navigation without touching DSH URL state");
			ctx.inject(["sessions"], (bound) => {
				let current = bound.sessions.list.getSnapshot().current;
				bound.effect(() => bound.sessions.list.subscribe(() => {
					const next = bound.sessions.list.getSnapshot().current;
					if (next !== current) {
						const previous = current;
						current = next;
						if (previous != null) navigation.open(null);
					}
				}), "aezy-observability: return to selected Session");
			});
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "aezy-observability",
				order: -20,
				inject: () => ({ navigation })
			}, Nav));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "aezy-observability",
				order: 130,
				inject: () => ({ navigation })
			}, Surface));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map