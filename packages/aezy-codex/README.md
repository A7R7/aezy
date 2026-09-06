# @aezy/codex

Out-of-tree Aezy adapter for the official Codex App Server. The package pins the official
`@openai/codex` runtime, never reads OAuth token files, and does not enable analytics by default.

The package also contributes a DSH Settings page and a loopback-only Aezy Web API. The current
profile uses the Aezy-native Node gateway in `@aezy/opencodex` and existing DSH DeepSeek credentials;
there is no OpenCodex/Bun runtime dependency. It shows the owned runtime,
credential source and model discovery independently of ChatGPT login. The managed gateway route rejects
login/logout RPCs. Historical account bridge tests remain, but personal OAuth is never imported.

The Host launches an Aezy-owned Codex home at `DSH_HOME/aezy/codex-runtime`, with an explicit
child environment and pinned routing configuration. It does not inherit personal Codex/OpenCodex
homes, catalogs, credentials, or route overrides. Old bindings without this runtime identity are
preserved but cannot silently resume in a different home; start a new isolated Session instead.
This is configuration isolation, not an OS security boundary against other same-user processes.
The adapter also forwards official interrupted/failed Turn notifications and process disconnect to
the owned gateway's in-memory transport cancellation. An early Codex interrupt need not close an
idle HTTP stream immediately; this bridge keeps no additional Turn state or cancel kernel.

The `aezy-codex` DSH provider binds each DSH Session to one opaque official Codex Thread. Codex owns
conversation history and its agent loop; DSH owns the visible Session/Turn log. The adapter streams
assistant output and projects official activity into the current DSH step without executing it twice.
The only durable adapter state is `DSH_HOME/aezy/codex-bindings.json` (Session id, Thread id, cwd and
model and runtime identity; never messages or credentials).

Codex native permissions stay read-only and every native escalation is declined. Mutable work is
advertised to Codex as `dsh.*` dynamic tools and executes through the current Agent's DSH tool
registry, preserving Aezy Security, DSH approval, tool cards and Turn Journal observations. This is
the security boundary: do not broaden native App Server permissions as a shortcut.
