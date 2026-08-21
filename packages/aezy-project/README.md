# @aezy/project

Aezy's first M1 vertical slice. The Node half discovers a Session directory's
Git repository and exposes bounded structured status/diff reads under
`/aezy/api/project/*`. The browser half contributes a `Changes` tab through
DSH's public client-module and `conversation.view` slot seams.

The same browser module takes priority `-10` in the public
`conversation.chat.turnTail` chain. After a completed Turn it reads the
authoritative Git ledger, waits for the asynchronous end scan to settle, and
renders a compact Changed files row under the final assistant message. Unlike
DSH's tool-location-derived Produced files row, this includes shell-created,
modified, and removed files and suppresses files restored to their baseline
within the same Turn.

The HTTP boundary requires a non-simple `X-Aezy-Client: web` request header and
a loopback authority, uses no shell interpolation, caps Git output, and
validates every requested file against the repository's current structured
status.

The Host observes DSH's public `session/event` feed at `turn/start` and
`turn/end`. It persists an observational per-Session ledger under the Git
metadata directory: these are files whose exact repository state changed
during the Turn, not a claim that one specific Tool authored every byte.
Overlapping Sessions on one checkout are marked concurrent.

File revert requires the ledger's exact after-fingerprint to still match. It
restores both worktree and index to the pre-Turn state, writes a recoverable
receipt first, and offers Undo only while the post-revert fingerprint still
matches. Symlinks, non-files, conflicts, renames, and files larger than the
capture limit fail closed instead of taking a lossy path.

In the Aezy Web composition, M2's `aezySecurity` service is a required runtime
dependency. Successful user-confirmed Revert and Undo actions enter the shared
Security audit projection without adding a second approval prompt.
