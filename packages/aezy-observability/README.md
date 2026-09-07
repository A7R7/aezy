# Aezy Logs & Debug / Usage

Out-of-tree Cordis plugin. Two sidebar entries above Settings reproduce the
bounded OpenCodex v2.33.0 Logs, Debug and Usage UI; attribution and exact source
revision are in `NOTICE` and `LICENSE.opencodex`. It neither connects to personal
OpenCodex nor imports its routing/runtime/account backend.

## Ownership and data

- DSH native: transparent public `llm/stream` observation, including auxiliary
  title/summary calls; DSH reports disjoint input/cache counts, normalized once
  for inclusive display input.
- Codex gateway: Aezy's existing authorized Responses transport supplies request
  completion, TTFT, usage, cancellation and one observed upstream attempt.
- Official Codex App Server: public `thread/tokenUsage/updated.last` supplies
  usage facts. `total` is only a dedup cursor. Entries are explicitly labelled
  usage notifications, not HTTP requests; no invented TTFT or retry traces.
  Unmetered/failing Turns remain visible, without counting the wrapper twice.
- Surfaces are registered by the actual producers, not a Claude/Codex/Grok enum.

This is a display projection, **not DSH billing or a new usage/agent kernel**.
It does not change requests, tools, approval, cancellation, Session events or
provider credentials. Missing usage/prices stay unavailable; measured zero is
distinct. Only observations made after installation appear. No historical
Session/rollout import or personal OpenCodex database import is performed.

DeepSeek estimates use a dated, attributed official peak/off-peak list-price
snapshot in `src/prices.js`, selected at request start. They are not invoices.
Models without a verified rate (including GPT/Astra) contribute measured tokens
and show unpriced coverage, not fabricated zero cost or subscription charges.
The plugin may be configured with `prices: { "provider/model": { input, output,
cacheRead, cacheWrite, date, reference } }`; rates are USD per million tokens.

## Privacy, retention and failures

Custom HTTP routes call DSH's public `connection.requestRejection` before
dispatch, then require a same-origin Aezy Web request. Cookie validation and
credentials stay DSH-owned; no OAuth is read. Endpoints are loopback-only and
`no-store`; debug mutations are bounded, JSON-only and strictly validated.

Allowlisted request metadata and token counts persist in
`DSH_HOME/aezy/observability/requests.jsonl` (0700 directory / 0600 file).
Conversation IDs are hashed. No prompt, reasoning, tool arguments, headers,
keys or raw provider errors are retained. Storage is bounded to 20,000 entries
with a 64 MiB cold-read ceiling; rotation and damaged-tail recovery are exposed
as incomplete coverage. Persistence failures are shown, never thrown into Turns.
This private derived projection is separate from, and cannot repair, DSH history.

Debug's four switches are off by default and process-local. Provider/usage/
composition streams retain at most 2,000 metadata entries combined; inbound
metadata retains 500. Reset clears flag overrides, not request history. Restart
clears debug buffers/switches but preserves request/usage observations.
Shadow Call interception is not implemented and its filter is explicitly disabled.

## UI and verification

Public `sidebar.footer.action` and `shell.overlay` slots preserve the mounted DSH
AppFrame/Session. `aezyView`/`aezyTab` query parameters support refresh/bookmark and
browser back/forward without changing DSH's own URL state. CSS is scoped, React
and ReactDOM are external; light/dark and narrow layouts are supported.

```bash
pnpm build:observability
pnpm test:observability
# Use a synchronized, explicitly isolated DSH_HOME/profile, never the working home.
AEZY_ALPHA_DSH_HOME=/tmp/aezy-observability-example/dsh \
AEZY_ALPHA_PROFILE=aezy-observability \
AEZY_OBSERVABILITY_REAL_PROOF=1 \
AEZY_OBSERVABILITY_BROWSER=1 \
pnpm test:observability:profile
```

The paid proof resolves DeepSeek through DSH's existing credential service in
memory. Browser proof needs `AEZY_PLAYWRIGHT_MODULE`, `AEZY_CHROMIUM` and any
platform library paths; defaults point to the retained local QA environment.
Private bootstrap receipts are deleted at exit. The verifier stops its Host,
restarts it and compares durable totals. Full evidence and limitations belong
to `doc/milestones/observability.md`.
