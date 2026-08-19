# Aezy repository instructions

- `reference/deepseek-harness/` is a read-only snapshot of upstream DSH. Never edit, format, generate into, patch, or commit changes under that path.
- Implement Aezy behavior only through out-of-tree plugins, bundles, profile patches, adapters, or applications outside the reference tree.
- Consume DSH through its published package and extension interfaces. Do not import files from the reference tree by relative source path.
- Update the reference tree only as one reviewed upstream revision replacement, and record the revision in the root README and compatibility metadata.
- Prefer end-to-end proof through a real DSH profile over mocks, speculative abstractions, compatibility shims, or modifications to DSH internals.
- Disable nonessential DSH components through Aezy profile patches; do not delete or alter their source.
- Use configured proxy environment variables for network access, falling back to `http://127.0.0.1:7890`.
