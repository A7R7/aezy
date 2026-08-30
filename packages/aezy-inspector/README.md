# @aezy/inspector

`@aezy/inspector` projects the authoritative DSH Session event window into a
safe, read-only `LoopTrace`. It does not write Session events, own usage or
history, drive an Agent loop, or retain a second event log.

The default Inspector view is a static, revisioned backend logic graph. Its
nodes, edges, guards, owners, and source references describe the backend even
when a Session is idle. Durable runtime spans only add active/visited/count/
usage/duration highlights; the Timeline remains the separate occurrence log.
The DSH-native blueprint follows the pinned upstream Agent and composed service
contracts. The Codex App Server blueprint deliberately renders the official
agent core as opaque and shows only public protocol plus the Aezy/DSH security
bridge.

The projector deliberately discards transcript text, reasoning, prompts,
credentials, raw tool arguments, tool results, approval reasons, and opaque
metadata. Codex App Server identities are included only when the existing
Aezy adapter already preserved protocol-safe `threadId`, `turnId`, or `itemId`
inside a durable DSH tool result.
