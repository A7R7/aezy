# @aezy/inspector

`@aezy/inspector` projects the authoritative DSH Session event window into a
safe, read-only `LoopTrace`. It does not write Session events, own usage or
history, drive an Agent loop, or retain a second event log.

The default Inspector view is a static, revisioned backend logic graph. Its
nodes, edges, guards, owners, and source references describe the backend even
when a Session is idle. Durable runtime spans only add active/visited/count/
usage/duration highlights; the Timeline remains the separate occurrence log.
Revision 3 renders five owner lanes for each backend. The DSH-native full graph
follows the pinned Agent, scheduler, ToolRuntime, approval, compaction, and
Subagent source contracts. The Codex graph follows official
`rust-v0.149.0@758ef40f` Turn, sampling, retry, tool, compaction, and Subagent
source plus the public App Server and Aezy/DSH bridge. Only private model
inference remains opaque; source topology never substitutes for runtime facts.

The projector deliberately discards transcript text, reasoning, prompts,
credentials, raw tool arguments, tool results, approval reasons, and opaque
metadata. Codex App Server identities are included only when the existing
Aezy adapter already preserved protocol-safe `threadId`, `turnId`, or `itemId`
inside a durable DSH tool result.
