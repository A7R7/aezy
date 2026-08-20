# DSH 第一方包与插件逐项清单

> 自动生成的研究附录。数据源是只读参考树 `.local/deepseek-harness/packages/*/*/package.json` 与三个 shipped bundle patch；基线为 `dsh-v0.1.0-rc.7`（`99f6f02f`）。不要把“包”与“默认运行中的插件实例”混为一谈。

本清单只描述上游 DSH。Aezy 通过包的公开发布入口和扩展接口消费这些能力，不从参考树相对导入源码，也不在清单所指路径中实现修复。

共 219 个第一方 workspace 包，其中 39 个声明 `dsh.client`，3 个声明 `dsh.bundle`，125 个包根在 shipped patch 中被直接引用。

默认层标记：`B` = base patch，`W` = web-app patch，`H` = headless patch，`—` = 未被三个 shipped patch 直接按包名挂载。标记只说明 patch 引用；后续层仍可覆盖或禁用前层条目。

## acp

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-acp`](../../.local/deepseek-harness/packages/acp/acp/README.md) | Host/Cordis 能力包 | — | Automation-only Agent Client Protocol server for driving DeepSeek Harness agents over JSON-RPC stdio |

## api

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-api-gateway`](../../.local/deepseek-harness/packages/api/gateway/README.md) | Web Client 插件 | B | Typert Remote Host dispatcher and Client API endpoint |
| [`@deepseek-ai/dsh-api-remotes`](../../.local/deepseek-harness/packages/api/remotes/README.md) | Web Client 插件 | W | Remote BFF assembly and Host Agent/Session lookup policy |

## attachment

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-attachment`](../../.local/deepseek-harness/packages/attachment/attachment/README.md) | Host/Cordis 能力包 | — | Durable immutable attachment storage seam for the DeepSeek Harness |
| [`@deepseek-ai/dsh-attachment-local`](../../.local/deepseek-harness/packages/attachment/attachment-local/README.md) | Host/Cordis 能力包 | B | Private content-addressed DSH_HOME attachment storage |

## boot

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-app-boot`](../../.local/deepseek-harness/packages/boot/app-boot/README.md) | Host/Cordis 能力包 | — | Shared boot glue for the app bins: .env loading, fail-loud Loader guards, snapshot-aware config resolution, and the Loader boot sequence |
| [`@deepseek-ai/dsh-cmdline`](../../.local/deepseek-harness/packages/boot/cmdline/README.md) | Host/Cordis 能力包 | — | Immutable command-line handoff from a dsh launcher to any app plugin that injects cmdlineArgs |

## bundle

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-base`](../../.local/deepseek-harness/packages/bundle/base/README.md) | Bundle | — | The shared dsh core as a profile bundle: every profile's first patch layer, inserting the base plugin rows over the empty profile root |
| [`@deepseek-ai/dsh-headless`](../../.local/deepseek-harness/packages/bundle/headless/README.md) | Bundle | H | The dsh one-shot bundle: a direct core Agent/Session runner over dsh-base with no Host, HTTP, or browser layer |
| [`@deepseek-ai/dsh-web-app`](../../.local/deepseek-harness/packages/bundle/web-app/README.md) | Bundle | W | The dsh browser-surface bundle: the web patch layer over dsh-base plus the runtime glue plugin (frontend dist serving, web-surface prompt, bash runtime variables, URL line) |

## client

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-client-connection`](../../.local/deepseek-harness/packages/client/connection/README.md) | Web Client 插件 | W | Wire consumer layer: HTTP-up/WebSocket-down client, ConnectionController dual streams with reconnect, and fixture api |
| [`@deepseek-ai/dsh-client-hmr`](../../.local/deepseek-harness/packages/client/hmr/README.md) | Web Client 插件 | W | Dev-only hot-reload driver for script-loaded client entries: SSE rebuilt frames → invalidate/prefetch → fiber swap through the vendored Loader entry |
| [`@deepseek-ai/dsh-client-locale`](../../.local/deepseek-harness/packages/client/locale/README.md) | Web Client 插件 | W | Locale plugin: Host-backed zh/en preference, browser-derived fallback, locale snapshots, and typed namespace dictionaries |
| [`@deepseek-ai/dsh-client-modules`](../../.local/deepseek-harness/packages/client/modules/README.md) | Web Client 插件 | W | Client module system, dual-face: node half composes the __DSH_BOOT__ entry graph (incremental dsh.client scan, bundle route, index tap, webPlugins service); browser half is the lazy-CJS module table the vendored cordis Loader consumes as its internal seam |
| [`@deepseek-ai/dsh-client-runtime`](../../.local/deepseek-harness/packages/client/runtime/README.md) | Web Client 插件 | W | Client core services: SlotRegistry, SessionRuntime (scope tree + object layer) |
| [`@deepseek-ai/dsh-client-schema-form`](../../.local/deepseek-harness/packages/client/schema-form/README.md) | Web Client 基础库 | — | Schema/draft model layer for settings editors: rehydrates a serialized schemastery schema, validates drafts, and edits them immutably by path |
| [`@deepseek-ai/dsh-client-ui-agent-preset`](../../.local/deepseek-harness/packages/client/ui-agent-preset/README.md) | Web Client 插件 | W | Agent-preset surfaces: the default for later sessions, this session's seat, and the composition editor |
| [`@deepseek-ai/dsh-client-ui-attachment`](../../.local/deepseek-harness/packages/client/ui-attachment/README.md) | Web Client 基础库 | — | Pure React attachment atoms for the dsh web UI: draft-image rail, message image gallery, and original-image lightbox (zero cordis) |
| [`@deepseek-ai/dsh-client-ui-commands`](../../.local/deepseek-harness/packages/client/ui-commands/README.md) | Web Client 插件 | W | Client command surface: global directory cache, '/' source, three command UI kinds, popupSelect registry |
| [`@deepseek-ai/dsh-client-ui-conversation`](../../.local/deepseek-harness/packages/client/ui-conversation/README.md) | Web Client 插件 | W | Conversation domain: skeleton, ordered chat flow, composer with the Host-backed busy-Enter preference, and details host |
| [`@deepseek-ai/dsh-client-ui-deliverables`](../../.local/deepseek-harness/packages/client/ui-deliverables/README.md) | Web Client 插件 | W | Produced-files turn tail and clickable final-response file references for Web |
| [`@deepseek-ai/dsh-client-ui-directory-picker-browse`](../../.local/deepseek-harness/packages/client/ui-directory-picker-browse/README.md) | Web Client 插件 | — | In-app directory browsing surface: the workspace directory-flow owner rendering the host's listing and creation primitives |
| [`@deepseek-ai/dsh-client-ui-directory-picker-native`](../../.local/deepseek-harness/packages/client/ui-directory-picker-native/README.md) | Web Client 插件 | — | Native directory-picker surface: the renderless workspace directory-flow occupant driving the host's OS chooser |
| [`@deepseek-ai/dsh-client-ui-goal`](../../.local/deepseek-harness/packages/client/ui-goal/README.md) | Web Client 插件 | W | Session goal surface: GoalBar docked above the composer, read from the goal session projection |
| [`@deepseek-ai/dsh-client-ui-input-trigger`](../../.local/deepseek-harness/packages/client/ui-input-trigger/README.md) | Web Client 插件 | W | Input trigger pipeline: '/' and '@' detection, candidate menu, pick routing to registered sources |
| [`@deepseek-ai/dsh-client-ui-jobs`](../../.local/deepseek-harness/packages/client/ui-jobs/README.md) | Web Client 插件 | W | Session-header background-job list: live registry state mirrored from session/jobs frames |
| [`@deepseek-ai/dsh-client-ui-layout`](../../.local/deepseek-harness/packages/client/ui-layout/README.md) | Web Client 插件 | W | Shell plugin: three-column AppFrame with drag handles, ctx.layout viewing-state service (navigation + panels) |
| [`@deepseek-ai/dsh-client-ui-message-feedback`](../../.local/deepseek-harness/packages/client/ui-message-feedback/README.md) | Web Client 插件 | W | Per-message feedback controls contributed to the assistant-message action strip, backed by the messageFeedback Host Remote |
| [`@deepseek-ai/dsh-client-ui-model-selection`](../../.local/deepseek-harness/packages/client/ui-model-selection/README.md) | Web Client 插件 | W | Model selection: the /model popupSelect over session.models / session.selectModel |
| [`@deepseek-ai/dsh-client-ui-permission-presets`](../../.local/deepseek-harness/packages/client/ui-permission-presets/README.md) | Web Client 插件 | W | Permission surfaces: a new-session default in General settings and a current-session /permission popup over the permissions projection |
| [`@deepseek-ai/dsh-client-ui-plan`](../../.local/deepseek-harness/packages/client/ui-plan/README.md) | Web Client 插件 | W | Plan-mode composer control: the conversation.input.plan seat over the plan projection and the /plan command channel |
| [`@deepseek-ai/dsh-client-ui-primitives`](../../.local/deepseek-harness/packages/client/ui-primitives/README.md) | Web Client 基础库 | — | Pure React atoms for the dsh web UI: controls, icons, markdown, and JSON inspectors (zero cordis) |
| [`@deepseek-ai/dsh-client-ui-settings`](../../.local/deepseek-harness/packages/client/ui-settings/README.md) | Web Client 插件 | W | Settings domain base plugin: the settings-namespace scope service and the canonical settings slot-type contract |
| [`@deepseek-ai/dsh-client-ui-settings-general`](../../.local/deepseek-harness/packages/client/ui-settings-general/README.md) | Web Client 插件 | W | Settings ownerless-copy and product onboarding plugin: the General section, shell trigger/header chrome content, settings dictionaries, and the versioned welcome notice |
| [`@deepseek-ai/dsh-client-ui-settings-models`](../../.local/deepseek-harness/packages/client/ui-settings-models/README.md) | Web Client 插件 | W | Models settings and shared product-onboarding dialogs over existing settings and credential joins |
| [`@deepseek-ai/dsh-client-ui-settings-plugin-inventory`](../../.local/deepseek-harness/packages/client/ui-settings-plugin-inventory/README.md) | Web Client 插件 | W | Read-only Cordis Loader inventory tab in Web Plugins settings |
| [`@deepseek-ai/dsh-client-ui-settings-plugins`](../../.local/deepseek-harness/packages/client/ui-settings-plugins/README.md) | Web Client 插件 | W | Plugins settings section with feature-owned tabs and configurable host-plane plugin cards |
| [`@deepseek-ai/dsh-client-ui-sidebar`](../../.local/deepseek-harness/packages/client/ui-sidebar/README.md) | Web Client 插件 | W | Sidebar plugin: session multi-level tree, search, grouping, state dots |
| [`@deepseek-ai/dsh-client-ui-skill`](../../.local/deepseek-harness/packages/client/ui-skill/README.md) | Web Client 插件 | W | Web skill references and the dedicated skill tool row |
| [`@deepseek-ai/dsh-client-ui-slots`](../../.local/deepseek-harness/packages/client/ui-slots/README.md) | Web Client 基础库 | — | Slot registry pure core: SlotMap declaration merging, single register composition API, four-share props types, store-seat types, renderer install seam |
| [`@deepseek-ai/dsh-client-ui-subagent`](../../.local/deepseek-harness/packages/client/ui-subagent/README.md) | Web Client 插件 | W | Subagent conversation catalog, continuation routing UI, and '@' reference source |
| [`@deepseek-ai/dsh-client-ui-theme`](../../.local/deepseek-harness/packages/client/ui-theme/README.md) | Web Client 插件 | W | Theme plugin: Host bootstrap for the pre-plugin palette; DOM-free ThemeRuntime for light/dark/system state; --dsw-* token styles and Appearance settings row |
| [`@deepseek-ai/dsh-client-ui-tool`](../../.local/deepseek-harness/packages/client/ui-tool/README.md) | Web Client 插件 | W | Client Tool call-tree renderer and keyed per-tool presentation slot |
| [`@deepseek-ai/dsh-client-ui-trajectory`](../../.local/deepseek-harness/packages/client/ui-trajectory/README.md) | Web Client 插件 | W | Trajectory event ledger with an interactive timing overview: pure-consumer plugin registering into the conversation ViewMap (no service) |
| [`@deepseek-ai/dsh-client-ui-user-questions`](../../.local/deepseek-harness/packages/client/ui-user-questions/README.md) | Web Client 插件 | W | Web ask_user_question feature: host tool mount plus composer-takeover question UI |
| [`@deepseek-ai/dsh-client-ui-workflow-run`](../../.local/deepseek-harness/packages/client/ui-workflow-run/README.md) | Web Client 插件 | W | Durable workflow-run Conversation Node and nested member disclosure for dsh web |
| [`@deepseek-ai/dsh-client-ui-workspace`](../../.local/deepseek-harness/packages/client/ui-workspace/README.md) | Web Client 插件 | W | Workspace picker plugin: one WorkspacePicker registered into the sidebar and empty-state workspace slots |
| [`@deepseek-ai/dsh-client-web`](../../.local/deepseek-harness/packages/client/web/README.md) | Web Client 基础库 | — | Web shell kernel: bootWebShell (module system holding + seed table + two-stage boot + AppRoot gate + app-shell assembly entry), consumed by the apps/web vite entry |
| [`@deepseek-ai/dsh-client-web-react`](../../.local/deepseek-harness/packages/client/web-react/README.md) | Web Client 基础库 | — | Shell-side React glue: createSlotRenderer, SessionProvider, bindSnapshotSelector (uSES bridge), useInvoke |

## code-runtime

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-code-runtime`](../../.local/deepseek-harness/packages/code-runtime/code-runtime/README.md) | Host/Cordis 能力包 | — | Abstract code-execution seam (ctx.codeRuntime) for the DeepSeek Harness |
| [`@deepseek-ai/dsh-code-runtime-worker-thread`](../../.local/deepseek-harness/packages/code-runtime/code-runtime-worker-thread/README.md) | Host/Cordis 能力包 | H+W | Worker-thread implementation of the DeepSeek Harness code-execution seam |

## compaction

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-command-compact`](../../.local/deepseek-harness/packages/compaction/command-compact/README.md) | Host/Cordis 能力包 | B | Human-facing slash command for explicit session compaction |
| [`@deepseek-ai/dsh-compaction`](../../.local/deepseek-harness/packages/compaction/compaction/README.md) | Host/Cordis 能力包 | — | Abstract compaction service seam (ctx.compaction) for the DeepSeek Harness |
| [`@deepseek-ai/dsh-compaction-basic`](../../.local/deepseek-harness/packages/compaction/compaction-basic/README.md) | Host/Cordis 能力包 | B | Token-meter-driven compaction policy and LLM summarization backend for the DeepSeek Harness |
| [`@deepseek-ai/dsh-compaction-tool-result-pruner`](../../.local/deepseek-harness/packages/compaction/compaction-tool-result-pruner/README.md) | Host/Cordis 能力包 | B | Replay-safe model-free head/middle/tail pruning for tool-result surface nodes |

## context

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-agent-instructions`](../../.local/deepseek-harness/packages/context/agent-instructions/README.md) | Host/Cordis 能力包 | B | Workspace context loader for AGENTS.md/CLAUDE.md instruction files |
| [`@deepseek-ai/dsh-session-reference`](../../.local/deepseek-harness/packages/context/session-reference/README.md) | Host/Cordis 能力包 | — | Cross-session snapshot references and durable untrusted model context (ctx.sessionReferenceResolver) |
| [`@deepseek-ai/dsh-time-context`](../../.local/deepseek-harness/packages/context/time-context/README.md) | Host/Cordis 能力包 | — | Opt-in durable per-step context with the current time and elapsed time |
| [`@deepseek-ai/dsh-tmux-context`](../../.local/deepseek-harness/packages/context/tmux-context/README.md) | Host/Cordis 能力包 | — | Opt-in durable per-step context with this agent's tmux pane and window location |

## core

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-agent`](../../.local/deepseek-harness/packages/core/agent/README.md) | Host/Cordis 能力包 | B | Agent interface, registry, initiator scope, and event vocabulary for the DeepSeek Harness |
| [`@deepseek-ai/dsh-agent-default-model`](../../.local/deepseek-harness/packages/core/agent-default-model/README.md) | Host/Cordis 能力包 | B | Default model selection shared by Agent entry points |
| [`@deepseek-ai/dsh-agent-loop`](../../.local/deepseek-harness/packages/core/agent-loop/README.md) | Host/Cordis 能力包 | B | The concrete agent loop plugin for the DeepSeek Harness |
| [`@deepseek-ai/dsh-agent-tool-presentation`](../../.local/deepseek-harness/packages/core/agent-tool-presentation/README.md) | Host/Cordis 能力包 | — | Agent-plane presentation selector: composes one agent's tools as Code Mode, native, or both |
| [`@deepseek-ai/dsh-scope`](../../.local/deepseek-harness/packages/core/scope/README.md) | Host/Cordis 能力包 | — | Scoped-context registration primitive (scope tags, scope-filtered event dispatch) for the DeepSeek Harness |
| [`@deepseek-ai/dsh-session`](../../.local/deepseek-harness/packages/core/session/README.md) | Host/Cordis 能力包 | B | Event-sourced session store for the DeepSeek Harness |
| [`@deepseek-ai/dsh-system-prompt`](../../.local/deepseek-harness/packages/core/system-prompt/README.md) | Host/Cordis 能力包 | B | System prompt assembly registry for the DeepSeek Harness |
| [`@deepseek-ai/dsh-tools`](../../.local/deepseek-harness/packages/core/tools/README.md) | Host/Cordis 能力包 | B | Tool registry and execution pipeline for the DeepSeek Harness |

## credentials

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-credentials`](../../.local/deepseek-harness/packages/credentials/credentials/README.md) | Host/Cordis 能力包 | — | Abstract credential seam (ctx.credentials): settings carry references to secrets, providers own the values |
| [`@deepseek-ai/dsh-credentials-local`](../../.local/deepseek-harness/packages/credentials/credentials-local/README.md) | Host/Cordis 能力包 | B | File-backed credentials provider ($DSH_HOME/.env under the live process environment) for the DeepSeek Harness |

## e2b

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-e2b`](../../.local/deepseek-harness/packages/e2b/e2b/README.md) | Host/Cordis 能力包 | — | Shared E2B sandbox lifecycle for DeepSeek Harness provider adapters |
| [`@deepseek-ai/dsh-fs-e2b`](../../.local/deepseek-harness/packages/e2b/fs-e2b/README.md) | Host/Cordis 能力包 | — | E2B filesystem implementation for DeepSeek Harness |
| [`@deepseek-ai/dsh-subprocess-e2b`](../../.local/deepseek-harness/packages/e2b/subprocess-e2b/README.md) | Host/Cordis 能力包 | — | E2B subprocess implementation for DeepSeek Harness |

## examples

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-acp-demo`](../../.local/deepseek-harness/packages/examples/acp-demo/README.md) | 示例装配/应用 | — | ACP automation server app: agent spine + JSONL persistence + ACP transport, with a JSON-RPC stdio bin |
| [`@deepseek-ai/dsh-agent-spine-demo`](../../.local/deepseek-harness/packages/examples/agent-spine-demo/README.md) | 示例装配/应用 | — | The default executor-less/UI-less agent spine with fallback session titles, provider-routed retry, and optional persisted goals |
| [`@deepseek-ai/dsh-sdk-jsonrpc-demo`](../../.local/deepseek-harness/packages/examples/jsonrpc-demo/README.md) | 示例装配/应用 | — | Bin that boots an external Cordis config for the stdio JSON-RPC SDK runtime |

## extensions

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-client-ui-cordis`](../../.local/deepseek-harness/packages/extensions/ui-cordis/README.md) | Web Client 插件 | W | Cordis dynamic-plugin definition card: the keyed cordis_define tool row with its run/stop switch |
| [`@deepseek-ai/dsh-cordis-client-runner`](../../.local/deepseek-harness/packages/extensions/cordis-client-runner/README.md) | Web Client 插件 | W | Browser half of dynamic dual-half plugin packages: event subscription, closure evaluation, guard facade, and loader entries |
| [`@deepseek-ai/dsh-cordis-host-runner`](../../.local/deepseek-harness/packages/extensions/cordis-host-runner/README.md) | Host/Cordis 能力包 | W | Dynamic package definition registry, host-half sandbox lifecycle, and invoke handler table for model-mounted dual-half packages |
| [`@deepseek-ai/dsh-tool-cordis`](../../.local/deepseek-harness/packages/extensions/tool-cordis/README.md) | Host/Cordis 能力包 | — | Self-referential cordis toolset: inspect the live runtime, mount and dispose model-written plugins |

## feedback

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-command-feedback`](../../.local/deepseek-harness/packages/feedback/command-feedback/README.md) | Host/Cordis 能力包 | B | Log-only session feedback producer and human-facing slash command |
| [`@deepseek-ai/dsh-message-feedback`](../../.local/deepseek-harness/packages/feedback/message-feedback/README.md) | Host/Cordis 能力包 | W | Lifecycle-bound per-message rating and note sidecar for the DeepSeek Harness |

## fs

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-fs`](../../.local/deepseek-harness/packages/fs/fs/README.md) | Host/Cordis 能力包 | — | Abstract filesystem capability seam (ctx.fs) for the DeepSeek Harness — vocabulary types, the FileSystem service (text IO + optional version-guarded atomic mutations), and the fs/* policy event vocabulary |
| [`@deepseek-ai/dsh-fs-local`](../../.local/deepseek-harness/packages/fs/fs-local/README.md) | Host/Cordis 能力包 | — | Local-filesystem implementation of the DeepSeek Harness filesystem seam (ctx.fs) |
| [`@deepseek-ai/dsh-fs-observation-policy`](../../.local/deepseek-harness/packages/fs/fs-observation-policy/README.md) | Host/Cordis 能力包 | B | File-context policy plugin for the DeepSeek Harness — observed-state, read-before-edit, and version-guarded write/edit added over the ctx.fs provider seam through the fs/* event gate (no service API) |
| [`@deepseek-ai/dsh-fs-sandbox`](../../.local/deepseek-harness/packages/fs/fs-sandbox/README.md) | Host/Cordis 能力包 | B | Sandbox-enforcing implementation of the DeepSeek Harness filesystem seam: fences write/edit by the per-call sandbox mode (read-only denies mutation, workspace-write contains it to the workspace + temp roots) while reads pass through |
| [`@deepseek-ai/dsh-tool-fs`](../../.local/deepseek-harness/packages/fs/tool-fs/README.md) | Host/Cordis 能力包 | B | Model-facing filesystem tools (read, write, edit) over the DeepSeek Harness filesystem seam (ctx.fs) |
| [`@deepseek-ai/dsh-tool-fs-search`](../../.local/deepseek-harness/packages/fs/tool-fs-search/README.md) | Host/Cordis 能力包 | B | Model-facing filesystem discovery tools (glob, grep) backed by the packaged ripgrep binary (@vscode/ripgrep) |
| [`@deepseek-ai/dsh-tool-str-replace-editor`](../../.local/deepseek-harness/packages/fs/tool-str-replace-editor/README.md) | Host/Cordis 能力包 | B | Model-facing view, create, literal replace, and line insert tool over the Harness filesystem service |

## goal

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-command-goal`](../../.local/deepseek-harness/packages/goal/command-goal/README.md) | Host/Cordis 能力包 | B | Human-facing slash command for persisted same-session goals |
| [`@deepseek-ai/dsh-goal`](../../.local/deepseek-harness/packages/goal/goal/README.md) | Host/Cordis 能力包 | B | Event-sourced same-session goal state and lifecycle service for the DeepSeek Harness |
| [`@deepseek-ai/dsh-goal-round-driver`](../../.local/deepseek-harness/packages/goal/goal-round-driver/README.md) | Host/Cordis 能力包 | B | Race-fenced same-session goal-round driver |
| [`@deepseek-ai/dsh-tool-goal`](../../.local/deepseek-harness/packages/goal/tool-goal/README.md) | Host/Cordis 能力包 | B | Model-facing same-session goal tools with execution-time authority checks |

## guard

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-repeat-tool-reminder`](../../.local/deepseek-harness/packages/guard/repeat-tool-reminder/README.md) | Host/Cordis 能力包 | B | Repeat-tool-call guard plugin: advisory reminders when an agent loops on identical tool calls |
| [`@deepseek-ai/dsh-tool-call-timeout-policy`](../../.local/deepseek-harness/packages/guard/timeout-policy/README.md) | Host/Cordis 能力包 | B | Tool-call timeout policy: a tools/execute wrapper that arms a per-tool deadline on exec.signal and returns TOOL_TIMEOUT when it wins |

## hooks

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-hook-protocol`](../../.local/deepseek-harness/packages/hooks/hook-protocol/README.md) | 协议库 | — | Shared Claude Code / Codex hook wire protocol: matcher engine, stdin/exit-code/stdout codec, multi-hook merge, and hook/* session events |
| [`@deepseek-ai/dsh-hooks-claude-code`](../../.local/deepseek-harness/packages/hooks/hooks-claude-code/README.md) | Host/Cordis 能力包 | — | Bridge plugin: run a Claude Code hooks.json / settings hook config on the DeepSeek Harness interception seams |
| [`@deepseek-ai/dsh-hooks-codex`](../../.local/deepseek-harness/packages/hooks/hooks-codex/README.md) | Host/Cordis 能力包 | — | Bridge plugin: run a Codex hooks.json hook config on the DeepSeek Harness interception seams |

## host

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-host-apiproxy`](../../.local/deepseek-harness/packages/host/apiproxy/README.md) | Host/Cordis 能力包 | W | API gateway: the ApiProxy contract (api/), the fetch carrier pair (fetch/), and the host-side gateway plugin providing ctx.apiProxy |
| [`@deepseek-ai/dsh-host-directory-picker`](../../.local/deepseek-harness/packages/host/directory-picker/README.md) | Host/Cordis 能力包 | — | Abstract workspace-directory picking seam (ctx.directoryPicker) for the DeepSeek Harness web GUI host |
| [`@deepseek-ai/dsh-host-directory-picker-auto`](../../.local/deepseek-harness/packages/host/directory-picker-auto/README.md) | Host/Cordis 能力包 | W | Adaptive chooser of the directory-picker seam: resolves the host situation at boot and mounts the native or browse backend for the DeepSeek Harness web GUI host |
| [`@deepseek-ai/dsh-host-directory-picker-browse`](../../.local/deepseek-harness/packages/host/directory-picker-browse/README.md) | Host/Cordis 能力包 | — | In-app browsing backend of the directory-picker seam (listing/creation primitives over the host filesystem) |
| [`@deepseek-ai/dsh-host-directory-picker-native`](../../.local/deepseek-harness/packages/host/directory-picker-native/README.md) | Host/Cordis 能力包 | — | Native-OS-chooser backend of the directory-picker seam for the DeepSeek Harness web GUI host |
| [`@deepseek-ai/dsh-host-frontend-static`](../../.local/deepseek-harness/packages/host/frontend-static/README.md) | Host/Cordis 能力包 | — | SPA dist server for the Web shell: owns the webserver fallback seat, serving the built frontend with index-tap injection, traversal rejection, and SPA index fallback |
| [`@deepseek-ai/dsh-host-plugin-inventory`](../../.local/deepseek-harness/packages/host/plugin-inventory/README.md) | Host/Cordis 能力包 | W | Read-only Remote projection of current Cordis Loader plugin state |
| [`@deepseek-ai/dsh-host-webserver`](../../.local/deepseek-harness/packages/host/webserver/README.md) | Host/Cordis 能力包 | W | Web route-registration plugin: HTTP and upgrade routes, index transform taps, and static dist fallback; knows no harness concepts |

## identity

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-anonymous-user-id`](../../.local/deepseek-harness/packages/identity/anonymous-user-id/README.md) | Host/Cordis 能力包 | — | Shared anonymous user identity for DeepSeek Harness telemetry and feedback correlation |

## interaction

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-commands`](../../.local/deepseek-harness/packages/interaction/commands/README.md) | Host/Cordis 能力包 | B | Plugin-owned human command registry for DeepSeek Harness UIs |
| [`@deepseek-ai/dsh-permission-presets`](../../.local/deepseek-harness/packages/interaction/permission-presets/README.md) | Host/Cordis 能力包 | B | User-facing permission presets (ctx.permissionPresets) for the DeepSeek Harness: one product-level Permissions select bundling the sandbox-mode and approval-policy knobs, written through to their own session events |
| [`@deepseek-ai/dsh-tool-ask-user`](../../.local/deepseek-harness/packages/interaction/tool-ask-user/README.md) | Host/Cordis 能力包 | — | Model-facing ask_user_question tool over the ctx.userQuestions seam |
| [`@deepseek-ai/dsh-user-approval`](../../.local/deepseek-harness/packages/interaction/user-approval/README.md) | Host/Cordis 能力包 | B | User-approval seam (ctx.approval) for the DeepSeek Harness: one-shot permission decisions dispatched to composed answerers over the approval/request waterfall, fail-closed by default |
| [`@deepseek-ai/dsh-user-questions`](../../.local/deepseek-harness/packages/interaction/user-questions/README.md) | Host/Cordis 能力包 | B | Abstract user-questions seam (ctx.userQuestions) for asking the human during agent runs |

## jobs

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-jobs`](../../.local/deepseek-harness/packages/jobs/jobs/README.md) | Host/Cordis 能力包 | — | Background job registry (ctx.jobs) for the DeepSeek Harness — shared ids, owner isolation, polling, cancellation, and completion listeners for long-running tool work |
| [`@deepseek-ai/dsh-jobs-local`](../../.local/deepseek-harness/packages/jobs/jobs-local/README.md) | Host/Cordis 能力包 | B | Process-local implementation of the DeepSeek Harness background job registry seam |
| [`@deepseek-ai/dsh-tool-jobs`](../../.local/deepseek-harness/packages/jobs/tool-jobs/README.md) | Host/Cordis 能力包 | B | Model-facing background job control tools (job_output, job_list, job_kill) over the ctx.jobs registry |

## llm

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-llm`](../../.local/deepseek-harness/packages/llm/llm/README.md) | Host/Cordis 能力包 | B | Provider-neutral LLM service interface for the DeepSeek Harness |
| [`@deepseek-ai/dsh-llm-deepseek`](../../.local/deepseek-harness/packages/llm/llm-deepseek/README.md) | Host/Cordis 能力包 | B | DeepSeek chat-completions adapter for the DeepSeek Harness LLM seam |
| [`@deepseek-ai/dsh-llm-pi-ai`](../../.local/deepseek-harness/packages/llm/llm-pi-ai/README.md) | Host/Cordis 能力包 | B | pi-ai-backed DeepSeek adapter for the DeepSeek Harness LLM seam (design-verification twin of dsh-llm-deepseek) |
| [`@deepseek-ai/dsh-llm-retry`](../../.local/deepseek-harness/packages/llm/llm-retry/README.md) | Host/Cordis 能力包 | B | Provider-routed LLM request retry policy for the DeepSeek Harness |
| [`@deepseek-ai/dsh-token-meter`](../../.local/deepseek-harness/packages/llm/token-meter/README.md) | Host/Cordis 能力包 | B | Replay-aware token measurement service (ctx.tokenMeter) for the DeepSeek Harness |

## lsp

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-lsp`](../../.local/deepseek-harness/packages/lsp/lsp/README.md) | Host/Cordis 能力包 | — | Abstract LSP capability seam (ctx.lsp) for the DeepSeek Harness — language-server provider registry keyed by branded id and extension mapping, order-independent per-query selection, normalized definition/references/implementation/hover requests and results, and the LspError taxonomy |
| [`@deepseek-ai/dsh-lsp-stdio`](../../.local/deepseek-harness/packages/lsp/lsp-stdio/README.md) | Host/Cordis 能力包 | — | Generic stdio language-server provider for the DeepSeek Harness LSP capability seam (ctx.lsp) — spawns configured servers, translates JSON-RPC, and serves transient-open goToDefinition/findReferences/goToImplementation/hover queries in the host filesystem namespace |
| [`@deepseek-ai/dsh-tool-lsp`](../../.local/deepseek-harness/packages/lsp/tool-lsp/README.md) | Host/Cordis 能力包 | — | Model-facing lsp tool over the DeepSeek Harness LSP capability seam (ctx.lsp) — one read-only tool with goToDefinition/findReferences/goToImplementation/hover operations, one-based UTF-16 cursor coordinates, bounded location rendering, and hover normalization |

## mcp

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-mcp-client`](../../.local/deepseek-harness/packages/mcp/mcp-client/README.md) | Host/Cordis 能力包 | — | MCP client bridge: connects to MCP servers and registers their tools on ctx.tools |

## plan

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-plan-mode`](../../.local/deepseek-harness/packages/plan/plan-mode/README.md) | Host/Cordis 能力包 | B | Logged per-agent plan mode with deployment guidance, a direct slash command, and a user-reviewed exit |

## preset

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-agent-presets`](../../.local/deepseek-harness/packages/preset/agent-presets/README.md) | Host/Cordis 能力包 | W | Per-session agent composition from preset cordis.yml files for the DeepSeek Harness |
| [`@deepseek-ai/dsh-persona`](../../.local/deepseek-harness/packages/preset/persona/README.md) | Host/Cordis 能力包 | — | Composition-authored deployment persona section for the DeepSeek Harness |

## runtime-diagnostics

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-invariants`](../../.local/deepseek-harness/packages/runtime-diagnostics/invariants/README.md) | Host/Cordis 能力包 | — | Registry service for package-owned DeepSeek Harness runtime invariants |

## sandbox

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-sandbox`](../../.local/deepseek-harness/packages/sandbox/sandbox/README.md) | Host/Cordis 能力包 | — | Abstract process-sandbox seam (ctx.sandbox) for the DeepSeek Harness: same-world confinement vocabulary and the SandboxProvider contract |
| [`@deepseek-ai/dsh-sandbox-local`](../../.local/deepseek-harness/packages/sandbox/sandbox-local/README.md) | Host/Cordis 能力包 | B | Local process-sandbox backends for the DeepSeek Harness sandbox seam: bwrap, the npm-distributed landlock-run launcher, macOS Seatbelt, or the Windows ACL restricted-token runner — functionally probed, fail-closed |
| [`@deepseek-ai/dsh-sandbox-policy`](../../.local/deepseek-harness/packages/sandbox/sandbox-policy/README.md) | Host/Cordis 能力包 | B | Per-call sandbox policy resolver and current model context: deployment fallbacks plus each session's mode and workspace root, shared by every enforcing capability family |
| [`@deepseek-ai/dsh-sandbox-windows-acl`](../../.local/deepseek-harness/packages/sandbox/sandbox-windows-acl/README.md) | Host/Cordis 能力包 | — | Windows ACL write-restriction sandbox backend (restricted-token spawn with capability-SID write allowlist) for the DeepSeek Harness sandbox seam |

## schedule

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-schedule`](../../.local/deepseek-harness/packages/schedule/schedule/README.md) | Host/Cordis 能力包 | — | Agent-scoped durable after, at, and fixed-rate reminders over the session event log |

## sdk

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-sdk-client`](../../.local/deepseek-harness/packages/sdk/client/README.md) | SDK/协议 | — | TypeScript client SDK for driving a DeepSeek Harness runtime subprocess over stdio JSON-RPC: the DeepSeekHarness high-level turns API and the lower-level HarnessClient |
| [`@deepseek-ai/dsh-sdk-jsonrpc-server`](../../.local/deepseek-harness/packages/sdk/server/README.md) | SDK/协议 | — | Stdio JSON-RPC server plugin for out-of-process DeepSeek Harness SDK clients |
| [`@deepseek-ai/dsh-sdk-protocol`](../../.local/deepseek-harness/packages/sdk/protocol/README.md) | SDK/协议 | — | Shared wire protocol for the DeepSeek Harness SDK runtime: the newline-delimited JSON-RPC stdio transport and the named request, result, and notification types spoken between the runtime server and SDK clients |

## session

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-session-checkpoint-policy`](../../.local/deepseek-harness/packages/session/session-checkpoint-policy/README.md) | Host/Cordis 能力包 | B | Semantic session durability checkpoints before model requests and tool side effects |
| [`@deepseek-ai/dsh-session-persistence`](../../.local/deepseek-harness/packages/session/session-persistence/README.md) | Host/Cordis 能力包 | — | Abstract durable session persistence seam (ctx.sessionPersistence) for the DeepSeek Harness |
| [`@deepseek-ai/dsh-session-persistence-jsonl`](../../.local/deepseek-harness/packages/session/session-persistence-jsonl/README.md) | Host/Cordis 能力包 | B | JSONL durable session persistence backend for the DeepSeek Harness |
| [`@deepseek-ai/dsh-session-persistence-sqlite`](../../.local/deepseek-harness/packages/session/session-persistence-sqlite/README.md) | Host/Cordis 能力包 | — | SQLite durable session persistence backend for the DeepSeek Harness |
| [`@deepseek-ai/dsh-session-projection`](../../.local/deepseek-harness/packages/session/session-projection/README.md) | Host/Cordis 能力包 | B | Session-projection seam: the merge-extensible projection type table, the provider contract, and the ctx.sessionProjections registry serving whole current values of log-derived per-session state |
| [`@deepseek-ai/dsh-session-projection-cache`](../../.local/deepseek-harness/packages/session/session-projection-cache/README.md) | Host/Cordis 能力包 | W | Persisted projection cache (ctx.sessionProjectionCache): durable per-session projection checkpoints over the domain data form, throttled write-behind, and the cold-read ladder (cache row + persistence tail replay) |
| [`@deepseek-ai/dsh-session-stats`](../../.local/deepseek-harness/packages/session/session-stats/README.md) | Host/Cordis 能力包 | W | Whole-log conversation counts and wall times projection (sessionStats) for the DeepSeek Harness |
| [`@deepseek-ai/dsh-session-telemetry`](../../.local/deepseek-harness/packages/session/session-telemetry/README.md) | Host/Cordis 能力包 | — | SessionTelemetryBackend seam for the DeepSeek Harness: session-event capture, projection, redaction, and handoff to a reporting backend |
| [`@deepseek-ai/dsh-session-telemetry-otel`](../../.local/deepseek-harness/packages/session/session-telemetry-otel/README.md) | Host/Cordis 能力包 | B | OpenTelemetry backend for the DeepSeek Harness telemetry seam: hands captured session records to the OTel JS SDK's log pipeline |
| [`@deepseek-ai/dsh-session-title`](../../.local/deepseek-harness/packages/session/session-title/README.md) | Host/Cordis 能力包 | B | Log-backed session title service and provider registry for the DeepSeek Harness |
| [`@deepseek-ai/dsh-session-title-all-prompts-llm`](../../.local/deepseek-harness/packages/session/session-title-all-prompts-llm/README.md) | Host/Cordis 能力包 | — | All-user-messages LLM provider plugin for DeepSeek Harness session titles |
| [`@deepseek-ai/dsh-session-title-first-prompt-llm`](../../.local/deepseek-harness/packages/session/session-title-first-prompt-llm/README.md) | Host/Cordis 能力包 | B | First-message LLM provider plugin for DeepSeek Harness session titles |
| [`@deepseek-ai/dsh-session-title-llm`](../../.local/deepseek-harness/packages/session/session-title-llm/README.md) | Host/Cordis 能力包 | — | Shared LLM generation policy for DeepSeek Harness session-title providers |

## session-query

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-session-log-export`](../../.local/deepseek-harness/packages/session-query/session-log-export/README.md) | Web Client 插件 | W | Web Session-log export command and shared download dialog |
| [`@deepseek-ai/dsh-session-query`](../../.local/deepseek-harness/packages/session-query/session-query/README.md) | Host/Cordis 能力包 | — | Combined session query service contract with concrete reads, traces, and filters |
| [`@deepseek-ai/dsh-session-query-sqlite`](../../.local/deepseek-harness/packages/session-query/session-query-sqlite/README.md) | Host/Cordis 能力包 | B | Concrete ctx.sessionQuery backend with SQLite FTS5 search |
| [`@deepseek-ai/dsh-tool-session-query`](../../.local/deepseek-harness/packages/session-query/tool-session-query/README.md) | Host/Cordis 能力包 | — | Workspace-authorized model-facing session history search, trace, and event read tools |

## settings

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-settings`](../../.local/deepseek-harness/packages/settings/settings/README.md) | Host/Cordis 能力包 | — | Abstract user-settings seam (ctx.settings) for the DeepSeek Harness |
| [`@deepseek-ai/dsh-settings-file`](../../.local/deepseek-harness/packages/settings/settings-file/README.md) | Host/Cordis 能力包 | B | File-backed settings provider (settings.yaml) for the DeepSeek Harness |

## shell

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-bash-local`](../../.local/deepseek-harness/packages/shell/bash-local/README.md) | Host/Cordis 能力包 | — | Local-subprocess implementation of the DeepSeek Harness bash executor seam |
| [`@deepseek-ai/dsh-bash-sandbox`](../../.local/deepseek-harness/packages/shell/bash-sandbox/README.md) | Host/Cordis 能力包 | B | Sandbox-consuming implementation of the DeepSeek Harness bash executor seam (confines every command via ctx.sandbox, reports denial/enforcement result facts) |
| [`@deepseek-ai/dsh-pwsh-local`](../../.local/deepseek-harness/packages/shell/pwsh-local/README.md) | Host/Cordis 能力包 | — | Local PowerShell implementation of the DeepSeek Harness bash executor seam |
| [`@deepseek-ai/dsh-pwsh-sandbox`](../../.local/deepseek-harness/packages/shell/pwsh-sandbox/README.md) | Host/Cordis 能力包 | B | Sandbox-consuming implementation of the DeepSeek Harness PowerShell executor seam (confines every command via ctx.sandbox, reports denial/enforcement result facts) |
| [`@deepseek-ai/dsh-shell`](../../.local/deepseek-harness/packages/shell/shell/README.md) | Host/Cordis 能力包 | — | Abstract bash executor seam (ctx.shell) for the DeepSeek Harness |
| [`@deepseek-ai/dsh-shell-env`](../../.local/deepseek-harness/packages/shell/shell-env/README.md) | Host/Cordis 能力包 | B | Tool-independent managed DSH_* shell environment registry |
| [`@deepseek-ai/dsh-tool-bash`](../../.local/deepseek-harness/packages/shell/tool-bash/README.md) | Host/Cordis 能力包 | B | Model-facing bash tool with optional generic background-job and sandbox-escalation support |
| [`@deepseek-ai/dsh-tool-bash-persistent`](../../.local/deepseek-harness/packages/shell/tool-bash-persistent/README.md) | Host/Cordis 能力包 | — | Model-facing owner-scoped persistent Bash tool backed by the Harness PTY service |
| [`@deepseek-ai/dsh-tool-pwsh`](../../.local/deepseek-harness/packages/shell/tool-pwsh/README.md) | Host/Cordis 能力包 | B | Model-facing pwsh tool over the bash executor seam |

## skill

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-skill`](../../.local/deepseek-harness/packages/skill/skill/README.md) | Host/Cordis 能力包 | B | Agent skill provider registry for the DeepSeek Harness |
| [`@deepseek-ai/dsh-skill-badge`](../../.local/deepseek-harness/packages/skill/skill-badge/README.md) | Host/Cordis 能力包 | B | Bundled dsh badge skill provider for DeepSeek Harness |
| [`@deepseek-ai/dsh-skill-filesystem`](../../.local/deepseek-harness/packages/skill/skill-filesystem/README.md) | Host/Cordis 能力包 | B | Local filesystem skill provider for the DeepSeek Harness |
| [`@deepseek-ai/dsh-tool-skill`](../../.local/deepseek-harness/packages/skill/tool-skill/README.md) | Host/Cordis 能力包 | B | Model-facing skill loading tool for the DeepSeek Harness |

## spill

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-spill`](../../.local/deepseek-harness/packages/spill/spill/README.md) | Host/Cordis 能力包 | — | Abstract spill storage seam (ctx.spillStore) for the DeepSeek Harness — save oversized tool text and return a retrieval locator |
| [`@deepseek-ai/dsh-spill-local`](../../.local/deepseek-harness/packages/spill/spill-local/README.md) | Host/Cordis 能力包 | B | Local-filesystem implementation of the DeepSeek Harness spill storage seam (private session-scoped files) |
| [`@deepseek-ai/dsh-spill-policy`](../../.local/deepseek-harness/packages/spill/spill-policy/README.md) | Host/Cordis 能力包 | B | Tool-result spill policy for the DeepSeek Harness — replaces oversized plain-text tool results with a retained preview plus a spill-file path (no service API) |

## storage

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-storage`](../../.local/deepseek-harness/packages/storage/storage/README.md) | Host/Cordis 能力包 | W | Storage hub (ctx.storage): named backend registry plus mounted data-form facilities for the DeepSeek Harness |
| [`@deepseek-ai/dsh-storage-domain`](../../.local/deepseek-harness/packages/storage/storage-domain/README.md) | Host/Cordis 能力包 | W | Domain data form (ctx.storage.domain): schema-validated, event-emitting KV domains over storage backends for the DeepSeek Harness |
| [`@deepseek-ai/dsh-storage-json`](../../.local/deepseek-harness/packages/storage/storage-json/README.md) | Host/Cordis 能力包 | W | JSON file KV storage backend for the DeepSeek Harness storage hub |
| [`@deepseek-ai/dsh-storage-sqlite`](../../.local/deepseek-harness/packages/storage/storage-sqlite/README.md) | Host/Cordis 能力包 | — | SQLite storage backend (kv facet) for the DeepSeek Harness storage hub |

## subagent

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-subagent`](../../.local/deepseek-harness/packages/subagent/subagent/README.md) | Host/Cordis 能力包 | B | Abstract subagent seam (ctx.subagents): named-provider registry for delegating to child agents |
| [`@deepseek-ai/dsh-subagent-acp`](../../.local/deepseek-harness/packages/subagent/subagent-acp/README.md) | Host/Cordis 能力包 | — | Out-of-process ACP subagent backend: drives a child agent in a spawned subprocess over the Agent Client Protocol |
| [`@deepseek-ai/dsh-subagent-claude-code`](../../.local/deepseek-harness/packages/subagent/subagent-claude-code/README.md) | Host/Cordis 能力包 | — | One-shot Claude Code subagent provider over the official Agent SDK |
| [`@deepseek-ai/dsh-subagent-codex`](../../.local/deepseek-harness/packages/subagent/subagent-codex/README.md) | Host/Cordis 能力包 | — | One-shot Codex subagent provider over the official app-server protocol |
| [`@deepseek-ai/dsh-subagent-dsh-sdk`](../../.local/deepseek-harness/packages/subagent/subagent-dsh-sdk/README.md) | Host/Cordis 能力包 | — | Out-of-process SDK subagent backend: drives a child DeepSeek Harness runtime subprocess over stdio JSON-RPC through the TypeScript SDK client |
| [`@deepseek-ai/dsh-subagent-fork-in-process`](../../.local/deepseek-harness/packages/subagent/subagent-fork-in-process/README.md) | Host/Cordis 能力包 | B | In-process fork subagent backend: runs a child agent seeded with a prefix of the parent's log |
| [`@deepseek-ai/dsh-subagent-in-process-driver`](../../.local/deepseek-harness/packages/subagent/subagent-in-process-driver/README.md) | Host/Cordis 能力包 | — | Shared in-process subagent run driver: drives a child agent on ctx.agents (used by the spawn and fork backends) |
| [`@deepseek-ai/dsh-subagent-spawn-in-process`](../../.local/deepseek-harness/packages/subagent/subagent-spawn-in-process/README.md) | Host/Cordis 能力包 | B | In-process spawn subagent backend: runs a fresh child agent on ctx.agents |
| [`@deepseek-ai/dsh-tool-subagent`](../../.local/deepseek-harness/packages/subagent/tool-subagent/README.md) | Host/Cordis 能力包 | B | Model-facing subagent delegation tool over the ctx.subagents seam |
| [`@deepseek-ai/dsh-tool-subagent-control`](../../.local/deepseek-harness/packages/subagent/tool-subagent-control/README.md) | Host/Cordis 能力包 | B | Globally named send_message, interrupt_agent, and list_agents tools over ctx.subagents continuations |
| [`@deepseek-ai/dsh-tool-subagent-report`](../../.local/deepseek-harness/packages/subagent/tool-subagent-report/README.md) | Host/Cordis 能力包 | B | Child-scoped report tool over ctx.subagents continuations |

## subprocess

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-subprocess`](../../.local/deepseek-harness/packages/subprocess/subprocess/README.md) | Host/Cordis 能力包 | — | Subprocess seam (ctx.subprocess) for the DeepSeek Harness — managed process groups, bounded spill-backed output, and escalated kills behind one abstract service |
| [`@deepseek-ai/dsh-subprocess-local`](../../.local/deepseek-harness/packages/subprocess/subprocess-local/README.md) | Host/Cordis 能力包 | B | Local-subprocess implementation of the DeepSeek Harness subprocess seam |

## terminal

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-terminal`](../../.local/deepseek-harness/packages/terminal/terminal/README.md) | Host/Cordis 能力包 | — | Persistent PTY session seam for the DeepSeek Harness — owner-scoped ids, backend registry, interactive sends, reads, signals, and awaited cleanup |
| [`@deepseek-ai/dsh-terminal-bash`](../../.local/deepseek-harness/packages/terminal/terminal-bash/README.md) | Host/Cordis 能力包 | — | Persistent shell PTY backend over the DeepSeek Harness subprocess terminal primitive |
| [`@deepseek-ai/dsh-tool-terminal`](../../.local/deepseek-harness/packages/terminal/tool-terminal/README.md) | Host/Cordis 能力包 | — | Six model-facing persistent PTY tools with owner isolation and generic background-job integration |

## test-support

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-acp-snapshot`](../../.local/deepseek-harness/packages/test-support/acp-snapshot/README.md) | 测试支持 | — | ACP test kit: shared subprocess launcher, snapshot scenario harness, expected-output normalizers, and suite factory |
| [`@deepseek-ai/dsh-agent-loop-testkit`](../../.local/deepseek-harness/packages/test-support/agent-loop-testkit/README.md) | 测试支持 | — | Shared prerequisite mounting for tests that exercise the concrete agent loop |
| [`@deepseek-ai/dsh-client-test-runtime`](../../.local/deepseek-harness/packages/test-support/client-runtime/README.md) | 测试支持 | — | jsdom slot test runtime: real Cordis Context + SlotRegistry + web-react renderer with test-owned session/workspace doubles for feature specs |
| [`@deepseek-ai/dsh-llm-mock-server`](../../.local/deepseek-harness/packages/test-support/llm-mock-server/README.md) | 测试支持 | — | Scriptable OpenAI-compatible HTTP/SSE fault server for LLM recovery tests |
| [`@deepseek-ai/dsh-llm-replay`](../../.local/deepseek-harness/packages/test-support/llm-replay/README.md) | 测试支持 | — | Replay LLM plugin: short-circuits llm/stream with model chunks reconstructed from a recorded session JSONL (keyless snapshot tests) |
| [`@deepseek-ai/dsh-loader-smoke`](../../.local/deepseek-harness/packages/test-support/loader-smoke/README.md) | 测试支持 | — | Shared subprocess and direct-agent harness for keyless real-Loader example smoke tests |

## todo

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-tool-todo`](../../.local/deepseek-harness/packages/todo/tool-todo/README.md) | Host/Cordis 能力包 | B | Model-facing todo_write tool over the DeepSeek Harness event-sourced session log |

## typert

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-typert-generator`](../../.local/deepseek-harness/packages/typert/generator/README.md) | 生成器/协议 | — | TypeScript project analyzer and model-driven Typert artifact generator |
| [`@deepseek-ai/dsh-typert-loader`](../../.local/deepseek-harness/packages/typert/loader/README.md) | Host/Cordis 能力包 | B | Loader integration for generated Typert package contributions |
| [`@deepseek-ai/dsh-typert-protocol`](../../.local/deepseek-harness/packages/typert/protocol/README.md) | 生成器/协议 | — | Compiler-independent Remote metadata and Typert provider protocols |
| [`@deepseek-ai/dsh-typert-registry`](../../.local/deepseek-harness/packages/typert/registry/README.md) | Web Client 插件 | B | Runtime registry for generated package reflection and Zod schemas |

## util

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-atomic-write`](../../.local/deepseek-harness/packages/util/atomic-write/README.md) | 底层工具库 | — | Zero-dependency atomic file replacement: exclusive-create random-suffix temp + rename carrying the caller-stated permissions (writeFileAtomic) |
| [`@deepseek-ai/dsh-brand`](../../.local/deepseek-harness/packages/util/brand/README.md) | 底层工具库 | — | Type-only Branded<B> nominal-typing primitive for the DeepSeek Harness |
| [`@deepseek-ai/dsh-home-paths`](../../.local/deepseek-harness/packages/util/home-paths/README.md) | 底层工具库 | — | Shared filesystem path helpers for the DeepSeek Harness |
| [`@deepseek-ai/dsh-launch-environment`](../../.local/deepseek-harness/packages/util/launch-environment/README.md) | 底层工具库 | — | Immutable DeepSeek Harness launch environment that records which layer supplied each value |
| [`@deepseek-ai/dsh-native-command`](../../.local/deepseek-harness/packages/util/native-command/README.md) | 底层工具库 | — | Zero-dependency no-shell execFile runner for host-native OS integrations: utf8 stdio capture, abort propagation, Windows hide |
| [`@deepseek-ai/dsh-output-retention`](../../.local/deepseek-harness/packages/util/output-retention/README.md) | 底层工具库 | — | Zero-dependency bounded-retention primitive: ItemRetainer/TextRetainer + neutral notice helpers (what did we keep, what did we omit) |
| [`@deepseek-ai/dsh-timeout`](../../.local/deepseek-harness/packages/util/timeout/README.md) | 底层工具库 | — | Zero-dependency timeout/deadline primitive: clampTimeout, deadline, timeoutOf, TimeoutReason (timing + classification only, no termination) |

## web

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-tool-web`](../../.local/deepseek-harness/packages/web/tool-web/README.md) | Host/Cordis 能力包 | B | Model-facing web tools (web_search, web_fetch) over the DeepSeek Harness web capability seam (ctx.web) |
| [`@deepseek-ai/dsh-web`](../../.local/deepseek-harness/packages/web/web/README.md) | Host/Cordis 能力包 | B | Abstract web access capability seam (ctx.web) for the DeepSeek Harness — search/fetch provider registry, registration-order-independent selection, request/result vocabulary, and the WebError taxonomy |
| [`@deepseek-ai/dsh-web-fetch-http`](../../.local/deepseek-harness/packages/web/web-fetch-http/README.md) | Host/Cordis 能力包 | — | Anonymous public HTTP(S) fetch provider for the DeepSeek Harness web capability seam (ctx.web) |
| [`@deepseek-ai/dsh-web-search-deepseek`](../../.local/deepseek-harness/packages/web/web-search-deepseek/README.md) | Host/Cordis 能力包 | B | DeepSeek-backed search provider (native web_search via the Anthropic-compatible API) for the DeepSeek Harness web capability seam (ctx.web) |
| [`@deepseek-ai/dsh-web-search-exa`](../../.local/deepseek-harness/packages/web/web-search-exa/README.md) | Host/Cordis 能力包 | — | Exa-backed search provider for the DeepSeek Harness web capability seam (ctx.web) |
| [`@deepseek-ai/dsh-web-search-perplexity`](../../.local/deepseek-harness/packages/web/web-search-perplexity/README.md) | Host/Cordis 能力包 | — | Perplexity-backed search provider for the DeepSeek Harness web capability seam (ctx.web) |

## workflow

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-tool-ralph`](../../.local/deepseek-harness/packages/workflow/tool-ralph/README.md) | Host/Cordis 能力包 | B | Model-facing fresh-agent Ralph loop over the workflow and subagent seams |
| [`@deepseek-ai/dsh-tool-workflow`](../../.local/deepseek-harness/packages/workflow/tool-workflow/README.md) | Host/Cordis 能力包 | B | Model-facing workflow tool: run a JavaScript orchestration script over ctx.workflowEngine |
| [`@deepseek-ai/dsh-workflow`](../../.local/deepseek-harness/packages/workflow/workflow/README.md) | Host/Cordis 能力包 | — | Workflow capability seam: ctx.workflowEngine service, run vocabulary, and workflow/* events |
| [`@deepseek-ai/dsh-workflow-worker-thread`](../../.local/deepseek-harness/packages/workflow/workflow-worker-thread/README.md) | Host/Cordis 能力包 | B | worker-thread workflow engine: executes model-written orchestration scripts off the host event loop, bridging agent() calls back to ctx.subagents |

## workspace

| 包 | 形态 | 默认层 | 上游功能摘要 |
|---|---|---:|---|
| [`@deepseek-ai/dsh-workspace`](../../.local/deepseek-harness/packages/workspace/workspace/README.md) | Host/Cordis 能力包 | W | Workspace entity registry (ctx.workspaceRegistry): durable workspace records with validated session attachment over the domain data form for the DeepSeek Harness |
