# Codex-backed self-development milestone

> Status: **Complete**<br>
> Date: 2026-08-28<br>
> DSH runtime: `0.1.1-rc.2`<br>
> Codex runtime: `@openai/codex@0.149.0`

## Outcome

Aezy can use the official Codex App Server managed ChatGPT account path to run a real coding Turn
inside an Aezy-managed Worktree, execute mutable actions through existing DSH tools and approvals,
review the resulting durable Turn journal, restart the Host, and continue the same opaque Codex
Thread. This is the minimum Codex-backed Aezy self-development loop.

The first Aezy-authored change produced through that loop is commit `36871adfe5`: persisted Codex
Session bindings now validate loaded Session IDs with the same constraints used when writing them.
The change and its tests were generated in the managed Worktree, reviewed through Aezy, committed,
handed off, and fast-forwarded onto `main` without a product-specific merge-back implementation.

## Ownership boundary

| Fact or action | Authoritative owner |
| --- | --- |
| Managed ChatGPT login, credential storage/refresh | Official Codex App Server |
| Codex Thread and agent loop | Official Codex App Server |
| Workspace, Session, Turn events and transcript projection | DSH |
| Tool execution, Security policy and approval | DSH plus Aezy Security |
| File-change journal, Review, Worktree and Handoff | Existing Aezy Project surfaces |
| Session-to-Thread association | Minimal Aezy binding at `DSH_HOME/aezy/codex-bindings.json` |

The binding contains only Session ID, opaque Thread ID, cwd and selected model. Aezy does not read
Codex credential files, accept or return OAuth tokens, copy conversation history, or implement a
second Session/Task/Subagent/PTY/compaction/usage kernel.

## Adapter and security model

- `@aezy/codex` owns the out-of-tree App Server process/protocol client and account Host/client
  surface.
- The `aezy-codex` DSH provider maps one DSH Session to one opaque Codex Thread and projects streamed
  responses, activity, cancel and completion into ordinary DSH Turn facts.
- Codex native filesystem permissions are fixed to read-only, with empty mutable roots. Native
  escalation requests are declined.
- Mutable operations are exposed to Codex as namespaced App Server dynamic tools such as
  `dsh.bash`; execution returns through `agent.ctx.tools.execute()`. Existing DSH tool events,
  approval round-trips, Aezy Security audit and Turn journal therefore remain authoritative.
- Native read-only inspection can be projected as activity but cannot currently be pre-vetoed by an
  arbitrary Aezy Security rule. Mutations still fail closed through the DSH dynamic-tool path.

## Compatibility decision

`relay-dsh-plugin-codex@0.1.2` was evaluated in an isolated profile. Managed account/rate/usage,
conversation, restart resume and cancel worked, but real Luna/Sol Turns did not establish the
required structured DSH tool/call/result and approval facts. Relay is therefore not installed in
the Aezy profile. The narrow official adapter exists only for the missing hard constraints; it does
not fork Codex or DSH internals.

## Verification

| Gate | Result |
| --- | --- |
| Codex package tests | 18 passed, 0 failed |
| Official App Server structured command | Passed with the real managed account |
| Account/plan/rate-limit/usage projection | Passed without returning email or token |
| DSH Session/model/prompt/history path | Passed |
| Structured `dsh.bash` projection | Passed |
| Turn cancel and same-Session restart resume | Passed |
| Governed write into disposable Git fixture | Passed |
| Durable Journal and Historical Review | Passed; Git source, complete observation |
| Aezy Security network deny and audit | Passed |
| Real DSH approval requested/responded (`allowed-once`) | Passed |
| rc.2 M0 and 3090 M1/M2/M3/Terminal regressions | Passed |

## Self-development dogfood

1. Aezy created managed Worktree `a39c10e6-e75c-4d64-9c60-61120d5f5998` and bound Session
   `aezy-self-mtbu9b2u` to a Codex Thread using `gpt-5.6-sol`.
2. The agent used the namespaced DSH todo, edit and bash tools to modify only
   `packages/aezy-codex/src/binding-store.js` and its test.
3. The first test attempt failed genuinely because a fresh Git Worktree does not contain ignored
   `node_modules`. After the Host restart, the same Session/Thread continued, ran
   `pnpm install --offline` through an approved DSH tool call, and then passed all 18 Codex tests.
4. Turn 1 produced a complete Git-backed journal containing exactly the two changed files. Historical
   Review loaded the stored binding-file hunks rather than recomputing them from the later checkout.
5. The Worktree committed `36871adfe5fb88966dd1d8efd1aec40fad6e7cf8`; structured Handoff
   `9868261a-a66d-4816-93b3-d526f4e66369` reported a clean branch one commit ahead.
6. `main` was fast-forwarded to the same commit. After the main Host restarted, continuation on the
   same Session/Thread correctly recalled the exact code change, initial missing-dependency failure
   and offline recovery.
7. The Session was archived, its binding released, and the managed Worktree cleaned. The recoverable
   branch `aezy/codex-self-mtbu9b4o` remains; no merge-back product feature was introduced.

## Known limits and next decision

- Fresh managed Worktrees need an explicit dependency bootstrap when dependencies are ignored.
  Today the proven recovery is `pnpm install --offline`; a future Worktree bootstrap affordance may
  make this automatic without changing the agent-loop ownership.
- App Server is a version-pinned compatibility surface. Protocol changes must remain behind contract
  tests rather than leaking into M0-M4 or Terminal packages.
- The official account response on this machine reports `planType: prolite`; Aezy displays the
  authoritative value and does not reinterpret subscription names.
- A second DSH-native Codex-inspired backend is optional hardening, not required for the achieved
  self-development loop. If pursued, it must pass the same runtime contract without duplicating DSH
  state machines.
- Traffic Board, Task Board, Browser integration, Cloud/Remote/PR, Side Chat and merge-back remain
  separate deferred product slices.
