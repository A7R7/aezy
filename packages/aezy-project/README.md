# @aezy/project

Aezy's first M1 vertical slice. The Node half discovers a Session directory's
Git repository and exposes bounded structured status/diff reads under
`/aezy/api/project/*`. The browser half contributes a `Changes` tab through
DSH's public client-module and `conversation.view` slot seams.

The HTTP boundary requires a non-simple `X-Aezy-Client: web` request header,
uses no shell interpolation, caps Git output, and validates every requested
file against the repository's current structured status. Write operations and
the turn-scoped ledger are deliberately not hidden behind this read slice;
they are the next M1 step.
