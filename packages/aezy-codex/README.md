# @aezy/codex

Out-of-tree Aezy adapter for the official Codex App Server. The package pins the official
`@openai/codex` runtime, never reads OAuth token files, and does not enable analytics by default.

The current slice provides the process/protocol client only. DSH Session, tool, approval, journal and
UI integration must remain thin projections over official App Server and existing DSH seams.
