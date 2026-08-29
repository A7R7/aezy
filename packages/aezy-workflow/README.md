# @aezy/workflow

Internal declarative macro-workflow definitions for Aezy. Definitions are
strict JSON data, revisioned and content-addressed. They cannot contain code,
shell, prompt templates, imports, credentials, or permission grants.

This package does not run a workflow. DSH or a registered backend must retain
the model/tool/approval/result micro-loop and all Session, Security, usage,
cancel, compaction, Subagent, and persistence truth. Until DSH exposes a
durable exact-definition binding, capability resolution fails closed and no
definition is selectable.
