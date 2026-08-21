# @aezy/project

Aezy's first M1 vertical slice. The Node half discovers a Session directory's
Git repository and exposes bounded structured status/diff reads under
`/aezy/api/project/*`. The browser half contributes a `Changes` tab through
DSH's public client-module and `conversation.view` slot seams.

The same browser module takes priority `-10` in the public
`conversation.chat.turnTail` chain. After a completed Turn it reads the
authoritative Git ledger, waits for the asynchronous end scan to settle, and
renders a Codex-style change card under the final assistant message. The card
shows total and per-file added/deleted line counts, opens a durable historical
Turn diff through Review, and provides conflict-safe whole-Turn Undo/Redo.
Unlike DSH's tool-location-derived Produced files row, this includes
shell-created, modified, and removed files and suppresses files restored to
their baseline within the same Turn.

The HTTP boundary requires a non-simple `X-Aezy-Client: web` request header and
a loopback authority, uses no shell interpolation, caps Git output, and
validates every requested file against the repository's current structured
status.

The Host observes DSH's public `session/event` feed at `turn/start` and
`turn/end`. It persists an observational per-Session ledger under the Git
metadata directory: these are files whose exact repository state changed
during the Turn, not a claim that one specific Tool authored every byte.
Overlapping Sessions on one checkout are marked concurrent.

File and whole-Turn revert require every exact after-fingerprint to still
match. Whole-Turn Undo validates and backs up every file before changing any,
rolls the batch back if restoration fails, restores both worktree and index,
and writes a recoverable receipt first. Concurrent Turns never expose batch
Undo. Symlinks, non-files, conflicts, renames, and files larger than the
capture limit fail closed instead of taking a lossy path.

In the Aezy Web composition, M2's `aezySecurity` service is a required runtime
dependency. Successful user-confirmed Revert and Undo actions enter the shared
Security audit projection without adding a second approval prompt.
