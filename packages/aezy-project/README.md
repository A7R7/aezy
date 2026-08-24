# @aezy/project

Aezy's Project/Turn vertical slice. The Node half describes a Session workspace,
optionally discovers its Git repository, and exposes bounded structured status/diff reads under
`/aezy/api/project/*`. The browser half contributes a `Changes` tab through
DSH's public client-module and `conversation.view` slot seams.

The same browser module takes priority `-10` in the public
`conversation.chat.turnTail` chain. After a completed Turn it reads the
authoritative Turn ledger, waits for its asynchronous observer to settle, and
renders a Codex-style change card under the final assistant message. The card
shows total and per-file added/deleted line counts, opens a durable historical
Turn diff through Review, and provides conflict-safe whole-Turn Undo/Redo.
In Git repositories this includes shell-created, modified, and removed files
and suppresses files restored to their baseline within the same Turn.

Outside Git, the Host observes successful DSH `write` / `edit` executions through
the public `tools/execute` seam and persists their exact structured before/after
values under `DSH_HOME/aezy/turn-journal/<workspace-hash>/`. These historical
snapshots remain reviewable after a later `git init`; the current Turn never
receives a fabricated Git baseline or Git-safe Undo. A later Turn automatically
uses the normal Git enrichment. Potential shell/terminal side effects are
marked partial/unobserved instead of being presented as complete.

The HTTP boundary requires a non-simple `X-Aezy-Client: web` request header and
a loopback authority, uses no shell interpolation, caps Git output, and
validates every requested file against the repository's current structured
status.

The Host observes DSH's public `session/event` feed at `turn/start` and
`turn/end`. Git-enriched Turns retain their observational per-Session ledger
under the Git metadata directory: these are files whose exact repository state
changed during the Turn, not a claim that one specific Tool authored every
byte. Overlapping Sessions on one checkout are marked concurrent.

File and whole-Turn revert require every exact after-fingerprint to still
match. Whole-Turn Undo validates and backs up every file before changing any,
rolls the batch back if restoration fails, restores both worktree and index,
and writes a recoverable receipt first. Concurrent Turns never expose batch
Undo. Symlinks, non-files, conflicts, renames, and files larger than the
capture limit fail closed instead of taking a lossy path.

In the Aezy Web composition, M2's `aezySecurity` service is a required runtime
dependency. Successful user-confirmed Revert and Undo actions enter the shared
Security audit projection without adding a second approval prompt.

## M3 Worktree and Handoff

The same out-of-tree plugin now owns a repository-scoped Worktree lifecycle.
Creation accepts a short validated name and an exact commit id, derives branch
`aezy/<name>`, and derives its target only under the repository-specific
`DSH_HOME/aezy/worktrees/<identity>/` directory. It never accepts an arbitrary target path. A dirty Local source is
allowed only after explicit confirmation because its staged, unstaged, and
untracked state is intentionally not copied into the new Worktree.

The Web `Worktrees` view uses DSH's public Workspace and Session services to
register the created path, create or connect its blank Session, bind that
Session to the Worktree, and open it. The Host also observes public Session
lifecycle events, so Turn activity and disposal remain authoritative after a
reload. Each linked Worktree has its own Git metadata directory and therefore
its own Turn ledger, while lifecycle and handoff records live under the shared
Git common metadata directory.

A structured handoff records repository and Worktree ids, exact base/head,
branch, commits ahead/behind, status rows, changed files, validation results,
and bounded instructions. `Handoff to Local` generates a fresh record, uses
the existing DSH archive action, releases the Worktree binding, and opens a
Local Session. It does not merge, push, create a PR, or delete a branch.

Cleanup fails closed unless the path is still the exact Git-registered Aezy
Worktree, the branch has not drifted, no bound Session or Turn is active, the
worktree is clean, and the latest clean handoff matches current HEAD. Cleanup
calls ordinary `git worktree remove` without force and retains the branch and
commits. Create, bind, handoff, release, and cleanup enter M2's shared Security
audit as explicit user-confirmed actions.
