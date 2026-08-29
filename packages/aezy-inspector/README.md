# @aezy/inspector

`@aezy/inspector` projects the authoritative DSH Session event window into a
safe, read-only `LoopTrace`. It does not write Session events, own usage or
history, drive an Agent loop, or retain a second event log.

The projector deliberately discards transcript text, reasoning, prompts,
credentials, raw tool arguments, tool results, approval reasons, and opaque
metadata. Codex App Server identities are included only when the existing
Aezy adapter already preserved protocol-safe `threadId`, `turnId`, or `itemId`
inside a durable DSH tool result.
