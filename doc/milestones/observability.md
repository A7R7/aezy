# Logs & Debug / Usage — Isolated verified; deployment pending approval

Reference: local OpenCodex v2.33.0 (`ec51e42d745d2645bcb22cb67855fa053ba1778e`),
live dashboard `localhost:10100`, inspected 2026-09-08. MIT-attributed bounded UI
port; no dependency on its process, personal configuration, credentials or data.

## Acceptance matrix

- Logs: original ten-column virtual table, newest first, auto-refresh, dynamic
  surface selection, conversation search/clear, filtered totals, request dialog,
  copy request ID, filter from dialog, route/performance/cost/attempt evidence.
- Debug: opt-in flags, reset runtime overrides, refresh/follow, incremental
  bounded streams, inbound metadata view, explicit failed reads/writes.
- Usage: dynamic surfaces, available/30d/7d, six overview cards, list-price
  equivalent and exclusions, heatmap/week bars, section navigation, model search,
  provider shares and coverage breakdown, loading/error/empty/truncated states.
- Integration: two sidebar entries immediately above Settings, preserve DSH
  AppFrame/Session slots, keyboard/close/return, light/dark/narrow layouts.
- Data: only Aezy owner projections; native calls and gateway requests plus
  official App Server usage facts; no duplicate wrapper counting; unknown is
  not zero; allowlisted metadata, private bounded restart-persistent storage.
- Proof: store/hook/API/security tests; isolated real profile and browser;
  default profile sync/restart only after isolated proof.

No new agent loop, billing engine, retry/routing controls or personal OpenCodex
connection is introduced. Transport details not exposed by an owner are unknown.

## Implemented data and safety contract

`packages/aezy-observability/README.md` documents installation, producer seams,
storage, retention and test configuration. HTTP uses public
`connection.requestRejection` (DSH cookie/Host/Origin owner) plus Aezy same-origin
headers; unauthenticated requests with a forged Aezy header return 401. No new
authentication store is introduced. Usage and request metadata are 0700/0600,
bounded, restart-persistent projections; debug buffers/switches are process-local.

Native disjoint cache counts are normalized once. Gateway outer Agent Turns are
not counted alongside their model calls. Official `tokenUsage.last` is a reported
usage fact, with `total` used only to deduplicate. No HTTP retry trace or TTFT is
inferred from official notifications. Unmetered Turns and late failures remain
visible without adding tokens twice. Title/auxiliary calls are real calls and
are intentionally included, even when they complete after the main Turn.

DeepSeek estimates use the official 2026-09-08 pricing snapshot, including weekday
UTC peak/off-peak windows: <https://api-docs.deepseek.com/quick_start/pricing/>.
They are list-price equivalents, not bills. Unverified models (including GPT)
are unpriced, not zero-cost. Debug does not capture raw prompts, reasoning,
tool arguments, headers, OAuth or upstream error bodies. Inbound metadata and
request composition deliberately replace Claude-specific debug payload panels.
Shadow Call interception remains disabled and explicitly labelled not enabled.
Pre-install Session/rollout history is not imported; retention loss is disclosed.

## Verification receipts

- 179 automated tests passed, 0 failed/skipped, with both real Codex process flags
  enabled. Includes the 15 new storage/cache/price/security/hook/API tests.
- Isolated complete real proof: `2026-09-07T18:12:29.566Z`,
  `/tmp/aezy-observability-proof-yZ2ZSm/profile.json`, Node 24, DSH rc.1, Codex
  0.153.4, profile `aezy-model-fixes`, port 3197. Standard DeepSeek and gateway
  DeepSeek Turns both complete via owner credentials; no OAuth file was read.
  Across bounded QA runs, 24 real requests (including titles) reported 152,583
  total tokens and 95,360 cached input tokens. Summary was identical after cold
  restart, debug returned off, private Web authentication passed.
- Same receipt directory includes 23-check browser proof and screenshots:
  details, dynamic filters, conversation clear, debug flags/reset/follow/refresh,
  failed-write honesty, 7d bars/heatmap/model search/section navigation,
  refresh/bookmark/back/forward, light/dark, 420px no-overflow and close-to-Session.
  `browserErrors=[]`. Initial test issues (first-run notice, font injection after
  reload, snapshot taken before an auxiliary title finished) were fixed in QA,
  without suppressing owner calls or modifying DSH.

- Final no-paid browser/restart rerun after descending-order correction:
  `2026-09-07T18:14:57.480Z`, `/tmp/aezy-observability-proof-3krg8v/profile.json`.
  24 browser checks including actual clipboard request-ID copy passed; the same
  24 stored requests and totals survived restart exactly. Isolated profile
  artifact signature: `d42741ba9207abf1f4e35fd6aaab99ca2d458a0994785f56fb70c64e1b14dc9c`.

## Deployment gate

The security reviewer rejected SIGTERM of the live 3090 development Host because
this feature request did not explicitly authorize interrupting that service.
**No stop or production profile sync was executed.** The existing 3090 Host was
left running unchanged; all test Hosts on 3197 were stopped by their owners.

Pending explicit restart approval:

1. Recheck 3090 PID/profile and active Turns; stop only that verified Host normally.
2. `pnpm profile:sync` to the existing `aezy-alpha` profile, preserving credentials,
   Sessions and Codex homes. Do not remove locks or import personal OAuth.
3. `AEZY_ASTRA_REAL_PROOF=1 AEZY_OBSERVABILITY_PROOF=1
   AEZY_ASTRA_PROOF_RECEIPT=/tmp/aezy-observability-astra.json
   pnpm test:opencodex:profile` on 3091. The gate requires real usage rows whose
   hashed conversation matches the newly created Astra Session, and archives
   only that proof Session. This gate is implemented but **not yet run**.
4. Restore development Host on 3090 and verify both pages and persisted usage.

Official App Server usage is covered by unit/protocol projection tests, not yet
by a real Astra observation for this feature. This pending evidence is not an
excuse to read/copy OAuth or attach to personal OpenCodex.
