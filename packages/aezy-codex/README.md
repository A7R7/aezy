# @aezy/codex

Out-of-tree Aezy adapter for the official Codex App Server. The package pins the official
`@openai/codex` runtime, never reads OAuth token files, and does not enable analytics by default.

The package contributes a DSH Settings page and a loopback-only Aezy Web API.
One `aezy-codex` provider offers two independent connections to the same pinned
official engine: `deepseek/*` uses the Aezy-native Node gateway and existing DSH
DeepSeek credentials; `gpt-*` uses official OpenAI routing and its own ChatGPT
browser/device login. Neither channel falls back to the other or to personal
configuration. A failed gateway does not prevent GPT startup or discovery.
The API defaults to the historical gateway snapshot; `?route=openai` and
`?route=gateway` explicitly select account operations. Gateway login/logout is
still refused. No OpenCodex/Bun runtime dependency or personal OAuth import exists.

The Host launches an Aezy-owned Codex home at `DSH_HOME/aezy/codex-runtime`, with an explicit
child environment and pinned routing configuration. GPT owns the separate
`DSH_HOME/aezy/codex-openai-runtime`. It does not inherit personal Codex/OpenCodex
homes, catalogs, credentials, or route overrides. Old bindings without this runtime identity are
preserved but cannot silently resume in a different home; start a new isolated Session instead.
This is configuration isolation, not an OS security boundary against other same-user processes.
Changing GPT/DeepSeek channels requires a new Session once a Thread is bound;
no history is silently forked, moved or replayed between homes. Model discovery
reads every official catalog page and projects reasoning metadata. GPT models
listed before login are not proof of account entitlement; paid GPT verification
requires an explicit login in Settings → Codex.
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
