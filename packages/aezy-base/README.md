# @aezy/base

Aezy's out-of-tree policy layer over the published `@deepseek-ai/dsh-base`
bundle. It disables nonessential host-plane capabilities without deleting or
patching their DSH implementation.

On the alpha runtime it also activates DSH's installed `openai-codex` catalog
route through the existing dormant `@deepseek-ai/dsh-llm-pi-ai` row and mounts
the official `@deepseek-ai/dsh-authorization` service that provider's OAuth
flow consumes. DSH remains the owner of model transport, credential storage,
login and refresh; this bundle starts no login, reads no credential, and does
not change the default model.

The `presets/aezy` directory remains the legacy Session-recovery composition.
The isolated alpha runtime stages it beside DSH's package-owned system presets.
