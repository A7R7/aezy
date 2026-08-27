# @aezy/codex

Out-of-tree Aezy adapter for the official Codex App Server. The package pins the official
`@openai/codex` runtime, never reads OAuth token files, and does not enable analytics by default.

The package also contributes a DSH Settings page and a loopback-only Aezy Web API for managed
ChatGPT browser/device login, logout, connection state, plan, rate limits, usage and model discovery.
It never accepts or returns access/refresh tokens, and browser authentication stays in the external
browser. DSH Session, tool, approval and journal integration must remain thin projections over the
official App Server and existing DSH seams.
