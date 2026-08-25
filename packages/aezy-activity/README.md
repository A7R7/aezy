# @aezy/activity

External Aezy Web dashboard for Activity, Status, provider Usage, and live Notifications.

The package owns no durable state. It reads DSH's `SessionRuntime` list, Job and Subagent
projections, pending interactions, completion reminders, durable session/token projections, and
the existing Session/cwd-fenced `@aezy/terminal` list endpoint. Its notification list is derived at
render time and has no independent read/dismiss lifecycle.

The dashboard dynamically occupies DSH's `details` slot while open and uses `shell.overlay` below
760 px. Closing it unregisters both occupants.
