# @aezy/security

Aezy's out-of-tree M2 policy layer for DSH rc.1. It contributes a Security
conversation view and enforces durable Approval Rules plus Network Policy at
the public `tools/pre-execute` / `tools.guard()` boundary.

The default Network Policy is `ask`. Repository overrides take precedence over
the global default. Rule precedence is deny, ask, allow; Network `deny` cannot
be bypassed by an allow rule. DSH's existing approval service remains the sole
interactive, one-shot decision mechanism.

Policy is stored at `$DSH_HOME/aezy/security.json` with owner-only permissions.
Audit entries retain a redacted command preview and SHA-256 fingerprint, never
the unredacted command.

This boundary governs Agent-initiated tools, including shell tools and obvious
network providers. It does not intercept DSH's model-provider/control-plane
traffic and is not an OS-level egress sandbox. Since arbitrary shell programs
can open sockets, unknown shell commands are conservatively classified as
`possible` network access under Network `ask` or `deny`. Unknown out-of-tree
tools are classified the same way, so an MCP tool whose product name does not
advertise its transport cannot silently bypass the default policy.
