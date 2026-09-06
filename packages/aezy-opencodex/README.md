# Aezy built-in model gateway

This external DSH plugin now implements the gateway directly in the Node Host.
It does **not** depend on, load, start or synchronize OpenCodex/Bun. The existing
`@aezy/opencodex` package and `aezy-opencodex` Codex provider ID are composition
identifiers only; there is no old gateway fallback or dual implementation.

The pinned official Codex App Server owns the agent loop and Thread. This plugin
only translates Responses HTTP/SSE to DeepSeek Chat Completions. It never runs a
DSH Agent or executes tools: mutable operations still go through the existing
DSH tools/approval and Aezy Security/Journal/Review.

## Configuration and lifecycle

- DSH `llm-deepseek` settings and the public credentials resolver remain the
  source of endpoint/model/key configuration. The key stays in Host memory;
  neither Codex nor a generated configuration file receives it. No personal
  Codex/OpenCodex configuration, OAuth or history is read or imported.
- One authenticated Node HTTP listener per `DSH_HOME`, bound to a dynamic
  `127.0.0.1` port. Every request requires the per-start random bearer token.
  Browser-origin requests are rejected. There is no admin/global API.
- `DSH_HOME/aezy/model-gateway` holds only an owner lock, generated model catalog
  and a private 32-byte replay encryption key. The previous `aezy/opencodex`
  directory is left untouched and unused.
- Codex still uses `DSH_HOME/aezy/codex-runtime`. Aezy writes provider/catalog
  configuration and repeats it on the CLI/Thread boundary. Startup failure never
  selects a personal route. Restart the Host after provider/key changes.
- Host shutdown aborts pending upstream requests and closes the listener. There
  is no gateway child process, Bun runtime, CLI sync or global coordinator.
- Runtime identity includes the gateway implementation/catalog revision, endpoint
  configuration and credential reference, but not the dynamic port or rotating
  bearer. Old OpenCodex bindings are preserved and fail closed; create a new
  Codex App Server Session. New native-gateway Threads resume across Host restarts.

## Explicit protocol scope

Codex `0.149.0`, Node `24`, Linux/WSL x64; DeepSeek V4 Flash/Pro text only. Flash
has the real paid engineering proof; Pro is catalog/contract coverage only.
Aezy owns a short coding instruction and conservative 128k catalog operating
limit, not a vendor prompt replica. Reasoning levels are low/high/max.

- Full-input replay, text, namespaced function/custom tools, tool-result replay.
- Incremental UTF-8/SSE text, bounded buffering, complete-batch tool admission.
  Truncated/invalid arguments, duplicate IDs and undeclared tools fail closed.
  Output-token exhaustion is `incomplete`, never an executable partial tool.
- Provider reasoning is carried in an AES-256-GCM envelope bound to the official
  `thread-id` header and model, persisted only by Codex. No plaintext reasoning
  is logged or projected, and no gateway history/reasoning cache is maintained.
  Losing the replay key invalidates old envelopes; do not delete it as a cache.
- Cancellation propagates to actual upstream HTTP. Redirects are rejected and
  no automatic retry, account rotation, model fallback or tool execution occurs.
- The Codex adapter also forwards official interrupted/failed Turn notifications
  to the matching Thread's active transport, and disconnect aborts all owned
  requests. This covers early interrupts that do not immediately close Codex's
  idle HTTP stream; no extra Turn state or HTTP cancel/admin endpoint is added.
- Real usage is converted to Responses and produces official Codex token-usage
  notifications. Missing provider usage remains null. In-memory diagnostics count
  request outcomes and usage presence only, with no content or billing store.
  DSH per-Turn billing projection is still unavailable; it is not reported as zero.

Unsupported content and endpoints fail explicitly: image/search/hosted tools,
remote compaction, server-side response history/`previous_response_id`, non-stream
responses, other providers, and structured-output modes. No compaction or Subagent
kernel is added. The native read-only Codex permission boundary is unchanged.

## Recovery and verification

Configuration ownership is not an OS sandbox. Same-UID processes can still read
files or kill Codex processes. Separate OS identity/container isolation is out of
scope. After SIGKILL/crash, verify the exact recorded PID is gone before removing
that instance's `aezy-owner.lock`; never clear another profile's state.

```sh
pnpm test:opencodex
# Official Codex + local fixture provider; no paid requests or OAuth:
AEZY_OPENCODEX_PROCESS_TEST=1 node --test packages/aezy-opencodex/tests/process.test.mjs
# Starts the synced profile, performs no-model smoke, then stops its own Host:
pnpm test:opencodex:profile
```

The real paid gate `scripts/verify-opencodex-governed-development.mjs` requires
explicit authorization, a separately synced `/tmp/aezy-opencodex-e2e-*` profile,
and `AEZY_OPENCODEX_REAL_PROOF=1`. It uses only the existing DSH DeepSeek credential
reference, creates an isolated Git fixture, and verifies approved repair/test,
network denial, Journal/Review, pagination and restart continuation. Receipts omit
credentials, prompts and raw provider outputs. Canonical evidence is maintained
in `doc/milestones/codex.md`.
