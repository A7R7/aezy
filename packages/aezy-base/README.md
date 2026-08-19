# @aezy/base

Aezy's out-of-tree policy layer over the published `@deepseek-ai/dsh-base`
bundle. It disables nonessential host-plane capabilities without deleting or
patching their DSH implementation.

The `presets/aezy` directory is the source for Aezy's default agent-plane
composition. `scripts/sync-profile.mjs` copies it into the profile's ordinary
user preset root because DSH rc.7 does not yet support package-relative static
preset roots in an installable bundle.
