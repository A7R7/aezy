// Selected, scoped OpenCodex v2.33.0 MIT design-system rules. See NOTICE.
export const styles = `@scope (.aezy-observability) {
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
