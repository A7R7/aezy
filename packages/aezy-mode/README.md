# @aezy/mode

Alpha-only external policy for Agent modes. It restores DSH's native preset
surfaces, contributes the non-deletable `codex-app-server` preset, filters the
model selector by the current Session preset, and fences that preset to the
`aezy-codex` provider. It does not implement an Agent, Session, model, tool,
approval, or persistence runtime.

The package contains only preset metadata and a provider-fence overlay. The
isolated runtime selector appends the overlay to the installed DSH release's
authoritative `standard` composition, then stages the generated preset beside
legacy `aezy`. DSH therefore remains the owner of version-specific tool, plan,
compaction and subagent invariants; Aezy does not copy that composition.

The composer uses the published DSH `Menu` / `Button` primitives, including
theme tokens, a viewport-bounded portal, selected state, Escape/outside-click
dismissal and a refresh footer. It contains no native model/effort `<select>`.
Failed catalog/selection requests remain visible and retryable. `/model` and
the composer use the same mode-filtered directory and supported default effort.
