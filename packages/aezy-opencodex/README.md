# @aezy/opencodex

Aezy-owned lifecycle/configuration adapter for the official
`@bitkyc08/opencodex@2.42.0` npm package. This is not an OpenCodex fork or a new
agent loop. The official Codex App Server remains the loop/Thread owner;
OpenCodex translates its Responses requests to the configured DeepSeek API.
Mutable tools still return to DSH approval, tools, Aezy Security and Journal.

## Instance and credentials

- One gateway per `DSH_HOME`, at `DSH_HOME/aezy/opencodex`, protected by an
  exclusive owner lock. Normal Host teardown stops only its owned children.
- The plugin reads `llm-deepseek` through DSH settings, normalizes it through
  the official DeepSeek adapter, and resolves its named API key through DSH
  credentials. No personal OpenCodex/Codex configuration or OAuth is imported.
- Provider credentials are passed to the child process, not written into the
  generated config or logs. Config stores an environment reference. OpenCodex
  may keep its own request/usage records inside this private instance directory.
- Codex has a different private home, `DSH_HOME/aezy/codex-runtime`. Catalog
  generation uses a third, temporary-purpose Codex integration home beneath the
  gateway directory, never the personal or running Codex home.
- OpenCodex's public `loadConfig/startServer` API and scoped `ocx sync` generate
  the official catalog data. Only configured text-only DeepSeek rows are passed
  to Codex. Vendor prompt templates are neither rewritten nor copied into Aezy.
- The provider's official `codexToolMode: shell` exposes direct function tools
  for the DSH dynamic-tool bridge. The default `code_mode_only` hides those
  declarations behind an orchestrator; emitting a direct `dsh__read` then
  correctly fails the vendor undeclared-tool guard. This is tool presentation,
  not a permission change: native writes/escalations remain forbidden.
- Bun's pinned official Linux x64 npm binary is used directly; its npm install
  script is explicitly disabled. Personal `bun`, `ocx` and `codex` commands are
  not used as fallbacks. Linux/WSL x64 is the currently supported platform.

The gateway binds an OS-assigned port on `127.0.0.2` (Linux loopback). This uses
OpenCodex 2.42.0's mandatory data-plane bearer authentication: its `127.0.0.1`
policy is unauthenticated even when a token is configured. Startup verifies
unauthenticated rejection and authenticated model discovery. Data and admin
tokens are different random per-boot values; only the data token reaches Codex.
This dependency on the vendor auth contract is covered by the real process test.

Missing credentials or failed startup leave Codex unavailable. They never select
a personal route. Restart the Host after changing DeepSeek settings/credentials;
this initial integration deliberately takes a per-Host configuration snapshot.
Native DSH models keep their own normal per-request credential resolution.

## Scope and recovery

OpenAI account pools, auto-start/shim restoration, global restart, history sync,
Claude/Grok integrations, sidecars, task recovery and OpenCodex subagent guidance
are disabled. Aezy never runs `ocx start`, `stop`, `install`, `restore`, service
commands, or `sync --restart-codex`.

Configuration ownership is not an OS sandbox. A same-UID process can still read
process environments, change files or kill processes. In particular, another
OpenCodex's explicit global restart may kill same-user Codex processes regardless
of their homes. Strong protection from that requires a separate OS identity or
container and is outside this slice. OpenCodex also uses its official per-user,
per-home-keyed coordinator under `/tmp`; Aezy does not replace that lock protocol.

After a crash/SIGKILL, `aezy-owner.lock` intentionally fails closed. Inspect the
recorded PID and verify no child belonging to that exact instance remains before
removing that exact lock. Never clear another profile's lock or kill by process
name. Temporary proofs can be removed as whole, explicitly identified directories
after all their processes have stopped; working DSH profiles are not disposable.

## Verification

`pnpm test:opencodex` runs contract tests. The opt-in real package process test
uses invalid credentials and makes no paid model request:

```sh
AEZY_OPENCODEX_PROCESS_TEST=1 node --test packages/aezy-opencodex/tests/process.test.mjs
```

Use `scripts/verify-opencodex-governed-development.mjs` only with an explicitly
authorized real provider and a separately synced `/tmp/aezy-opencodex-e2e-*`
profile. It reads only the existing DSH DeepSeek credential reference through the
official owner, passes the key in memory, and creates an isolated Git fixture.
The receipt excludes credentials, prompts and raw provider responses.
