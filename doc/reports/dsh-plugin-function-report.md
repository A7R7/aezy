# DSH 内置与第一方插件功能报告

## 结论

DeepSeek Harness（DSH）不是“核心程序加若干插件”，而是由 vendored Cordis 装配出来的一棵插件树；模型适配器、Session 日志、Agent Loop、工具注册、权限、Web Host 和浏览器 UI 都是可替换插件。Aezy 应保留这种可组合结构，但把默认产品面收敛成一套明确的 Codex-like 编程 Harness，而不是继续把所有实验能力堆进默认 profile。

对 Aezy 最有价值的不是 219 个第一方包的数量，而是 DSH 已经具备的六条骨架：事件溯源 Session、可替换 Agent Loop、能力定义/提供者/消费者三角色、Agent 级作用域、由 Session 日志派生的 UI projection、由 bundle/profile 管理的可逆装配。它们足以承载完整编程 Agent，不需要另写第二套 transcript、任务数据库或工具总线。

当前 shipped composition 仍偏“研究平台”：默认 base 有 78 个配置行，Web 层又有 76 个 patch 操作；其中同时存在原生工具、Code Mode、workflow/Ralph、动态 Cordis 自修改、反馈、遥测、插件编辑器和多种未完成的产品入口。Aezy 的第一步应通过新的 profile/bundle 禁用非核心行，而不是删除 package；当端到端 coding loop 稳定后再逐项启用。

## 审计口径

本报告基于只读参考树中的官方上游 `dsh-v0.1.0-rc.7`（`99f6f02f`），交叉读取了 [架构说明](../../reference/deepseek-harness/docs/architecture.md)、[包分组](../../reference/deepseek-harness/packages/README.md)、[base bundle](../../reference/deepseek-harness/packages/bundle/base/cordis.patch.yml)、[Web bundle](../../reference/deepseek-harness/packages/bundle/web-app/cordis.patch.yml)、[headless bundle](../../reference/deepseek-harness/packages/bundle/headless/cordis.patch.yml)、package manifest、package README 和关键入口源码。

“包”“插件”“默认实例”必须分开：DSH 参考树有 219 个 `packages/*/*` workspace 包，全部依赖 Cordis，但其中包含运行时插件、浏览器插件、bundle、SDK/协议、纯 UI 组件、工具库、示例与测试支持。39 个包声明 `dsh.client`，3 个包声明 `dsh.bundle`；三个 shipped patch 直接引用 125 个不同的第一方包根。完整逐包清单见 [DSH 第一方包与插件逐项清单](dsh-first-party-package-inventory.md)。

本报告把“内置”定义为 shipped profile 通过 base、web-app 或 headless patch 直接挂载或覆盖的条目；把“第一方”定义为本仓库 `@deepseek-ai/dsh-*` workspace 包，包括默认未挂载的可选能力；`vendor/`、测试 fixture、示例 `cordis.yml` 和社区 marketplace 不计入逐插件判断。

## 装配模型

| 层 | 实际作用 | 审计结果 |
|---|---|---|
| `dsh-base` | 所有 profile 的共同 Agent/Session/模型/工具/权限/持久化层 | 78 个配置行、78 次包引用、74 个不同第一方包根，另有 Cordis timer/HMR；包含核心能力，也混入遥测、反馈、Ralph 和多种实验入口 |
| `dsh-web-app` | 在 base 上增加 Web Host、RPC、workspace、projection cache、浏览器插件 roster | 76 个 patch 操作，其中 51 个操作引入包名、50 个不同第一方包根；既有 UI 基础设施，也有动态插件、自定义 preset、反馈等非核心产品面 |
| `dsh-headless` | 在 base 上提供一次性运行器，并覆盖 Web/Code Mode 配置 | 5 个 patch 操作、3 次包引用、2 个不同第一方包根；profile 模板实际叠加 base + web-app + headless，再由 headless 禁用 Web 行 |
| profile/user patch | 按 id 覆盖整行 config 或插入新行 | 是 Aezy “先禁用、不删除”的首选机制；无需 fork 每个 package 才能收敛默认面 |

## 第一方能力族

### Agent 核心与上下文

`core/*` 提供 Session、Agent registry、Agent Loop、系统提示和工具执行管线；`context/*` 把 `AGENTS.md`/`CLAUDE.md`、时间、tmux 和跨 Session 引用变成可记录的模型上下文；`compaction/*` 提供 token 计量驱动的自动压缩、手动 `/compact` 和 tool-result pruning。这组是 Harness 的主脊柱，应整体保留。

关键优点是“model-visible means logged”：模型看到的输入必须能从 SessionEvent 日志重建，resume、fork、UI、projection 和 telemetry 都从同一事实源派生。Aezy 不应在 Web 层另建聊天状态或把关键 steering/approval 状态只放浏览器内存。

薄弱点是工具编辑能力仍以 `tool-str-replace-editor` 为主，缺少 Codex 级统一 patch 语义、行级 diff 回执和可恢复变更集合；compaction 有可靠后端和 UI marker，但没有面向用户的 context/token 预算控制面。

### 文件、Shell、进程、PTY、LSP 与执行环境

`fs/*`、`shell/*`、`subprocess/*`、`sandbox/*` 形成同一执行世界：文件操作、Bash/PowerShell、子进程树、输出保留和 sandbox policy 可以组合；`jobs/*` 把长命令提升为可查询/终止的后台 job；`terminal/*` 提供持久 PTY；`lsp/*` 提供 definition/reference/implementation/hover；`e2b/*` 提供远程 sandbox POC。

默认 profile 已挂载 sandboxed Bash/PowerShell、文件读写/搜索、job 控制和本地 subprocess，但 persistent terminal、LSP 和 E2B 都未默认挂载。这个默认选择基本正确：Aezy P0 保留本地文件、shell、后台 job 和 sandbox；PTY 在形成可靠的交互式命令生命周期后进入 P1；LSP 是有价值的可选增强；E2B 在 Cloud Mode 产品边界明确前继续禁用。

需要补强三点：统一 command/job/terminal 的生命周期和 UI；把 network 权限从 filesystem/sandbox 中独立出来；让每次文件修改和命令执行都能归属到 turn、展示结构化结果并支持精确撤销。

### Session、持久化、查询与工作区

`session/*` 提供 JSONL/SQLite persistence、checkpoint、projection/cache、标题、统计和 telemetry；`session-query/*` 提供跨 Session 精确读取、lineage、event trace 和 SQLite FTS；`workspace/*` 提供 durable workspace 实体；`attachment/*` 提供不可变内容寻址附件；`storage/*` 提供非 Session 的 JSON/SQLite domain storage。

DSH Web 已支持 Workspace 列表、Session 持久化、resume、fork、rename、archive、标题/工作区搜索、流式状态和跨 tab 同步。全文 Session 搜索后端虽然随 base 挂载，但 shipped 配置使用 `openAt: never`，所以 Web 默认只按标题与 workspace 搜索；模型侧 `tool-session-query` 也未默认挂载。

Aezy 应保留 JSONL 作为权威 Session 日志、保留 projection/cache 与 workspace 实体，并尽快启用有边界的 Session FTS。SQLite Session persistence 与通用 storage 可以先保留为可选 provider；telemetry backend 继续默认禁用。Workspace 目前只表示一个目录，尚不等价于 Codex 的多 repository project、Local/Worktree/Cloud execution binding，需要新建明确的 Project/Execution Environment 域。

### 权限、人机交互与运行控制

`interaction/*` 提供命令注册、ask-user、approval 和 permission preset；`plan/*`、`goal/*`、`todo/*` 提供计划模式、持久目标和模型任务列表；`feedback/*` 提供会话/消息反馈；`guard/*` 提供重复工具提醒和工具超时。

Web 已能在 composer 中接管 approval/question，显示 waiting 状态，并在 `read-only`、`workspace-write`、`danger-full-access` 之间切换。approval 目前只有 `allowed-once`、`rejected`、`cancelled`、`unavailable`，没有 allow-always、规则持久化、撤销或独立 network policy；这是与 Codex 级安全体验相比最明确的内核缺口之一。

Plan、Goal、Todo 都应保留，但收敛语义：Plan 是只读调查与用户审阅，Goal 是跨 turn 的 durable objective，Todo 是当前执行计划。反馈插件不影响编程闭环，Aezy 默认 profile 可先禁用；repeat reminder 和 timeout policy 应保留为低成本护栏。

### Subagent、Workflow、Schedule 与外部协议

`subagent/*` 已有同进程 spawn/fork、DSH SDK 子进程、ACP、Claude Code、Codex provider，以及 delegation/control/report 工具；`workflow/*` 提供 worker-thread JavaScript orchestration 和 Ralph loop；`schedule/*` 提供 Session-local durable reminder；`acp/*` 与 `sdk/*` 提供进程外控制协议。

Subagent seam、同进程 spawn/fork、continuation 和 Web 子会话导航属于 P0/P1 Harness 能力，应保留并统一到用户可见的 task topology。Workflow engine 能复用 subagent，但允许模型执行编排脚本，Ralph 又引入独立循环策略；两者都不是单 Agent coding 闭环的前置条件，默认禁用更安全。Schedule 只在原 Session 存活时准点运行，没有独立调度服务、通知或运行历史，不应被宣传为完整 Automations。

ACP/JSON-RPC SDK 是未来 CLI、IDE、远控和测试的重要稳定边界，应保留但不进入默认 Web 产品面。Claude Code/Codex subagent provider 与 hook bridge属于互操作能力，不是 Aezy 自身闭环所必需，继续 opt-in。

### 模型、Web、Skills、MCP 与扩展

`llm/*` 提供 provider-neutral stream、DeepSeek adapters、retry 和 token meter；`web/*` 提供 search/fetch seam 及 DeepSeek/Exa/Perplexity/HTTP providers；`skill/*` 提供 filesystem skill registry、catalog 和模型加载工具；`mcp/*` 把 MCP server tools 注册进 `ctx.tools`；`extensions/*` 允许 Agent 检查并挂载模型编写的 Cordis 插件。

模型 seam、retry、token meter、skills 和匿名 HTTP fetch/search 都应保留。MCP client 是完整 Harness 的重要扩展入口，但当前未默认装配，且还需要明确的 server lifecycle、authentication、resource/prompt 支持、tool-search 和权限 UI，适合作为 P1 集成而不是 P0 默认。

动态 Cordis 自修改能力让模型在运行中定义 Host/Client 双面插件，权限面和故障面远大于普通 coding tool。Aezy 默认禁用 `cordis-host-runner`、`cordis-client-runner`、`ui-cordis` 与 `tool-cordis`；保留源码作为高级实验能力，直到插件签名、隔离、审计、回滚和用户授权完整。

### Web Host 与浏览器 Client

`host/*` 提供 Web server、静态前端、API proxy、plugin inventory 和 directory picker；`client/*` 把 connection、session/workspace object layer、slot registry、conversation、sidebar、settings、model/permission/plan/goal/jobs/subagent/trajectory 等拆成独立浏览器插件。

Web 的模块化设计值得保留：Host 与 Client 通过 typed Remote 分离，浏览器业务组件只消费 props/store/hooks，UI feature 通过 slot 和 Conversation Node 组合。现状已覆盖会话导航、queue/steer、approval/question、model/permission、goal/plan/todo、jobs、subagents、trajectory、附件与交付文件链接。

Web 最大短板不是聊天页，而是项目工作台：没有 repository/file tree、文件预览、integrated terminal、Git status/diff/stage/revert/commit/branch/PR、worktree/environment 管理、浏览器验证、系统通知和多窗口。Aezy 应在现有 slot/object layer 上增加这些域，而不是换掉整个前端。

## Aezy 保留、补强与禁用建议

### P0：保留并整合为最小完整 Harness

- `core`、`llm`、`session`、`session-persistence-jsonl`、`session-projection`、`settings`、`credentials`、`workspace`、`attachment`、`token-meter`、`compaction`。
- `fs`、`shell`、`subprocess`、`sandbox`、`approval`、`permission-presets`、`jobs`、`tool-*` 基础 coding 工具和 guard。
- `agent-instructions`、skills、commands、ask-user、Plan、Goal、Todo、同进程 subagent spawn/fork/control/report。
- Web Host/Remote/Client runtime、conversation、workspace/session sidebar、queue/steer、trajectory、model/permission/settings 与基础 UI slot 系统。

### P0/P1：在现有 seam 上补强

- 新增 Codex-like patch/diff 工具与 turn-scoped file-change ledger，支持可视化、精确 revert 和验证回执。
- 增加 Project、Repository、Execution Environment 与 Worktree 域，把 cwd 从一个字符串提升为可管理执行上下文。
- 增加 Git read/write service 与 Web UI，先 status/diff/branch，再 stage/revert/commit，最后 push/PR/review。
- 统一 foreground command、background job、persistent terminal 和 dev server 生命周期，并给 Web 提供用户可交互终端。
- 扩充 approval 为一次允许、规则允许、拒绝与撤销；独立 filesystem/process/network/external-tool 权限。
- 让 Session FTS、context/token usage、task activity 和 subagent topology 成为默认可见控制面。
- 把 MCP 补成可管理、可鉴权、可审计的完整扩展入口。

### 默认禁用但保留源码

- `session-telemetry-otel`、`command-feedback`、`message-feedback` 和匿名 identity，直到 Aezy 有明确 opt-in、隐私说明与数据去向。
- 动态 Cordis self-modification 全套、Workflow script、Ralph、Schedule、E2B、外部 Claude/Codex subagent、hooks bridge。
- LSP、persistent PTY、ACP/SDK server、session-query model tools、额外 Web search provider，作为经过端到端验证后再启用的可选 bundle。
- `skill-badge`、示例/测试支持、generator 与发布基础设施不进入产品 profile，但保留给开发和验收。

## 实施边界

第一阶段不要删除 package、重写 Agent Loop 或建立第二套状态库。在参考树外创建 `aezy-base`/`aezy-web` bundle 与 patch 层，覆盖 shipped rows 的 `disabled` 与 config；先跑通“打开项目 → 发起任务 → 读改代码 → shell/build/test → approval → diff/review → 继续 thread”的真实链路。DSH 参考树保持原样，Aezy 不永久移除或修改其中的 package。

逐包事实以 [第一方清单](dsh-first-party-package-inventory.md) 和各 package README 为准；本报告的保留/禁用判断是 Aezy 产品决策，不是对上游 package 质量的排名。
