# Codex Desktop / DSH 能力差距参考矩阵

> 长期参考矩阵，72 项上游判断以 rc.7 为原始基线，不随 Aezy 每个里程碑重写。
> rc.8 调研已[归档](../archive/research/dsh-rc8-impact.md)，当前增量见
> [rc.1 影响报告](dsh-0.1.1-rc1-impact.md)。Aezy 的当前交付状态以 milestone 和 roadmap 为准。

## 结论

DSH 已经有一套相当完整的 Agent runtime，但还不是一套完整的 Codex-like 编程工作台。它在 Session/Turn、streaming、queue/steer、文件与 shell 工具、sandbox/approval、compaction、Plan/Goal/Todo、subagent、workflow 和 trajectory 上有真实实现；缺口主要位于项目/执行环境、Git、文件与终端工作台、浏览器验证、统一任务控制面和桌面集成。

因此 Aezy 不应先重写 Agent Loop。最短路径是保留 DSH runtime，先建立最小外置 bundle/profile，再按 **Project/Repository/Local Environment + Git/Diff/change ledger/revert → Approval Rules + Network Policy → Worktree/Handoff** 的顺序补齐 Aezy 自有产品域。文件浏览、`@file`、用户 Integrated Terminal、Activity 和 Browser 改为按真实 dogfood 痛点推进；Cloud、Computer Use、远控、自动化和完整 Desktop Shell 不阻塞本地编程闭环。

DSH 已有 seam 或详细 proposed note 的 Task Surface、Side Session、Recallable Compaction、Subagent/Job 状态、PTY backend、MCP/ACP transport 与 profile/settings 最后一公里，不进入 Aezy 的近期重型内核计划。Aezy 只做当前 profile 所需的薄装配和状态透传，并在每个里程碑前重新检查 upstream。详细所有权与等待门槛见 [Aezy 上游等待边界与实施路线图](../roadmap/aezy-upstream-ownership-roadmap.md)。

## 评估口径

对比基线是 [Codex Desktop / Harness 主要功能表](codex-functions.md) 共 72 项；DSH 基线是 `dsh-v0.1.0-rc.7`（`99f6f02f`）的 shipped Web profile。状态含义如下：

- **已有**：Web 中有直接可用的产品入口，或作为 Agent coding loop 的默认能力端到端可用。
- **部分**：只有后端 seam/可选插件、只有 Agent 可通过 shell 间接完成、或 Web 只覆盖了功能的一部分。
- **缺失**：没有对应产品域或端到端入口；仓库中出现同名测试/POC/忽略目录不算实现。

优先级含义如下：

- **P0 必需**：本地完整编程 Harness 的正确性、安全性或基本闭环依赖它。
- **P1 重要**：达到 Codex 级日常效率、可观测性和多任务开发体验所需。
- **P2 增强**：显著扩展产品面，但不阻塞本地单机 coding loop。
- **P3 非核心**：桌面便利性、迁移或外围体验；可以长期保持可选。

“可以让模型运行 `git`/`ssh`/`gh`”不等于具备 Git、Remote Host 或 PR 产品能力。产品能力还要求受控参数、权限、状态模型、错误恢复、UI 和持久化。

矩阵中的 Aezy 行动全部指向参考树外的 plugin、bundle、profile patch、adapter 或应用；“部分”和“缺失”描述上游现状，不表示应直接修改 DSH package。

矩阵结果是 22 项已有、25 项部分、25 项缺失；按 Harness 重要性分为 21 项 P0、31 项 P1、16 项 P2 和 4 项 P3。数量不是路线图分值：一个 P0 域通常需要多个表中能力共同闭环，已有项也可能需要为 Aezy 收敛或补强。

## 72 项逐项矩阵

### 项目、Session 与 Turn

| # | 功能 | DSH Web | 优先级 | 证据与 Aezy 判断 |
|---:|---|---|---|---|
| 1 | 项目与工作区 | 部分 | P0 | 有 durable Workspace、目录选择、Workspace/Session 归属；没有多 repository Project，也没有执行环境绑定。新增 Project/Repository/Environment 域。 |
| 2 | Thread / Session | 已有 | P0 | 支持创建、持久化、resume、fork、archive、rename、搜索、并发 Session 和运行/等待状态；进程重启后的“继续运行”仍不成立。保留 SessionEvent 事实源。 |
| 3 | Turn 与实时执行 | 已有 | P0 | Agent Loop 记录 Turn/Step/Message/Tool/Error，Host stream 驱动 Web conversation 与 trajectory。保留并给新工具统一结构化事件。 |
| 4 | Stop | 已有 | P0 | Session/Agent 有取消路径，Web 可停止当前运行；已完成事件与文件副作用保留。补充 stop 后命令/child/job 的统一 quiescence 指示。 |
| 5 | Queue | 已有 | P0 | Web 展示 Host 权威的 `agent.inbox.nextTurn` 队列，可编辑、删除和批量 steer；地址化 subagent 队列仍只读。 |
| 6 | Steer | 已有 | P0 | busy Enter 可配置为 Queue/Steer，严格 steer 失败会安全退化到下一 turn 队列，durable user message 接管展示。 |
| 7 | Context 管理 | 部分 | P0 | 有自动/手动 compaction、tool-result pruning、history paging 和 token meter；缺少统一 context budget、token 压力和 compaction 策略 UI。 |

### Coding 工具与执行环境

| # | 功能 | DSH Web | 优先级 | 证据与 Aezy 判断 |
|---:|---|---|---|---|
| 8 | 文件读取 | 已有 | P0 | 默认 `tool-fs`、`tool-fs-search` 和 str-replace editor 提供 view/glob/grep；图片通过 attachment 能进入对话。 |
| 9 | 文件修改 | 部分 | P0 | 已有 create/replace/insert 和 filesystem seam，但缺 Codex 级统一 patch、批量变更 ledger、行级 diff 回执与精确 revert。优先补强。 |
| 10 | Shell | 已有 | P0 | 默认按平台挂载 sandboxed Bash 或 PowerShell，返回 stdout/stderr/exit；支持包管理、build/test/Git CLI。 |
| 11 | Background Jobs | 已有 | P0 | `jobs-local` 与 `job_output/list/kill` 已默认挂载，Bash 可转后台；Web header 有 Session job 列表。统一 job/command/terminal 状态。 |
| 12 | Local Mode | 已有 | P0 | cwd/workspace 指向真实本地目录，文件、shell 与 Git CLI 都在当前环境执行。 |
| 13 | Worktree Mode | 缺失 | P1 | 仓库只有开发流程里的 worktree 约定，没有产品 Worktree entity、创建/清理/分支绑定或 Session 环境隔离。 |
| 14 | Local / Worktree Handoff | 缺失 | P1 | Session 的 cwd/Workspace 不支持带 Git 状态迁移到另一个执行环境。需要 Environment binding 与可审计 handoff。 |
| 15 | Cloud Mode | 部分 | P2 | E2B 只有 filesystem/subprocess provider POC，不具备 repo checkout、环境准备、diff 持久化、继续会话、push/PR 的产品闭环。 |
| 16 | 文件浏览器 | 部分 | P1 | directory picker 能浏览/创建目录，但没有项目 file tree、打开文件、repo 搜索和“加入上下文”工作台。 |
| 17 | 文件预览 | 部分 | P1 | 对话能渲染 Markdown、图片、工具结果和 deliverable 链接；没有通用 code/PDF/spreadsheet/document/presentation preview。先做 code/Markdown/image/diff。 |
| 18 | `@` Context 引用 | 部分 | P1 | input trigger 已支持 skill、subagent 等来源；没有任意文件/目录、symbol、Git diff 等统一 context object registry。 |
| 19 | Integrated Terminal | 缺失 | P1 | DSH `terminal/*` 是可选模型 PTY，不带用户 Web UI；Aezy 已通过外置 `@aezy/terminal` 薄接入其 line-oriented registry/backend，多 tab、Session/cwd fence 与 SIGINT 已签收，raw TTY/resize 仍等待上游。 |

### Git 与代码审查

| # | 功能 | DSH Web | 优先级 | 证据与 Aezy 判断 |
|---:|---|---|---|---|
| 20 | Git Status | 缺失 | P0 | Agent 可运行 `git status`，但没有受控 Git service、状态 projection 或 Web UI。它是安全 diff/review/revert 的基础。 |
| 21 | Git Diff | 部分 | P0 | 工具修改可显示局部 diff-style 卡片，但没有 staged/unstaged/commit/branch/turn diff 的 Git 事实源。 |
| 22 | Git Stage / Unstage | 缺失 | P1 | 只能通过 shell 间接完成；需要明确 repository authority、文件/hunk 操作和错误恢复。 |
| 23 | Git Revert | 缺失 | P0 | 没有按 Agent turn/file/hunk 的安全撤销；这是允许自治修改后给用户控制权的必要能力。 |
| 24 | Commit / Push | 部分 | P1 | shell/`git`/`gh` 可以间接执行，但没有提交草稿、凭证、remote、保护分支和 push 结果 UI。先 commit，后 push。 |
| 25 | Branch | 部分 | P1 | shell 可查看/创建分支，Workspace/Session/Worktree 不感知 branch。应成为 Repository/Environment 状态。 |
| 26 | Code Review | 缺失 | P1 | 没有针对 working tree、staged、branch/base、PR 的专门 review workflow 与 finding 数据模型。 |
| 27 | Inline Review | 缺失 | P2 | 没有行级 finding/comment → Agent 修复闭环；需建立 diff location identity 后再做。 |
| 28 | GitHub / Pull Request | 部分 | P2 | 可通过 shell/`gh` 间接工作，没有 GitHub connector、PR read model、review thread、push-fix 工作流。 |

### 模式、模型与安全

| # | 功能 | DSH Web | 优先级 | 证据与 Aezy 判断 |
|---:|---|---|---|---|
| 29 | Plan Mode | 已有 | P1 | `plan-mode` 记录 mode、限制 mutation、提供 `/plan` 和用户审阅退出；Web 有 composer control。 |
| 30 | Goal Mode | 已有 | P1 | event-sourced same-session goal、round driver、命令/工具和 Web GoalBar 已默认装配。语义应与 Todo/Plan 保持清晰。 |
| 31 | Side Chat | 缺失 | P2 | fork 可作为替代，但没有不污染主线、又共享相关上下文的临时 side surface。 |
| 32 | Model Selection | 已有 | P0 | Web `/model`、session model directory、选择状态与 provider settings 已存在。 |
| 33 | Reasoning Effort | 部分 | P1 | provider profile 可承载模型参数，但没有统一、per-session 的 reasoning effort seam、持久事件与 Web selector。 |
| 34 | Fast Mode | 缺失 | P2 | 没有产品级 latency/cost/quality mode；不要把选择另一个模型误称为 Fast Mode。 |
| 35 | Personality / Communication Style | 部分 | P2 | 有 persona 和 agent preset 组合，但没有轻量、稳定的 per-session communication style。 |
| 36 | Sandbox | 已有 | P0 | local sandbox provider 覆盖 Linux/macOS/Windows，policy 有 read-only/workspace-write/danger-full-access，并把模式记录到 Session。 |
| 37 | Approval | 已有 | P0 | Web composer takeover 可做 one-shot allow/reject，service fail-closed 并写审计事件。 |
| 38 | Approval Rules | 缺失 | P0 | 只有 `allowed-once`，没有 allow-always、命令前缀规则、持久化、查看/撤销。完整自治必须补。 |
| 39 | Network Policy | 缺失 | P0 | network 没有独立于 filesystem/process 的 deny/ask/allow policy；Web provider、package manager 与任意 shell 网络应统一受控。 |
| 40 | Auto Review Approval | 缺失 | P2 | 没有 reviewer agent 评估 escalation 的机制。先完成明确规则与审计，再考虑自动 reviewer。 |

### Instructions、扩展与多 Agent

| # | 功能 | DSH Web | 优先级 | 证据与 Aezy 判断 |
|---:|---|---|---|---|
| 41 | `AGENTS.md` | 已有 | P0 | `agent-instructions` 默认加载 workspace 层级的 `AGENTS.md`/`CLAUDE.md` 并记录模型可见来源。 |
| 42 | `/init` | 缺失 | P2 | 没有为仓库生成初始 Agent instructions 的专门命令；可在核心闭环后作为 guided setup。 |
| 43 | Skills | 已有 | P1 | registry、filesystem provider、catalog/load tool 和 Web `@` 引用已默认装配；badge 示例默认禁用。 |
| 44 | Plugins | 部分 | P1 | 有 bundle/profile、`dsh plugin` CLI、Web inventory/settings 和动态 Cordis；安装、权限、版本兼容、启停与回滚没有统一安全 UX。 |
| 45 | MCP | 部分 | P1 | `mcp-client` 能把 MCP tools 注册到 `ctx.tools`，但未默认装配，缺 resources/prompts、auth、lifecycle、tool search 和管理 UI。 |
| 46 | Hooks | 部分 | P2 | 有 Claude Code/Codex hook bridge 与 wire protocol，但未默认装配；应作为兼容层，不是 Aezy 内部生命周期的唯一机制。 |
| 47 | Slash Commands | 已有 | P1 | commands registry 与 Web `/` discovery/dispatch 已覆盖 model、permission、plan、goal、compact、feedback、export 等插件命令。 |
| 48 | Subagents | 已有 | P1 | seam、spawn/fork、多种 provider、delegation/control/report tool 和 Web 导航均存在。保留同进程 provider 为默认。 |
| 49 | Subagent Thread | 部分 | P1 | child 是 durable Session，Web 可导航并显示子孙状态；缺统一可视 task tree、独立活动流和资源/权限视图。 |
| 50 | Parallel Subagents | 已有 | P1 | registry 和 continuable children 支持多个并行 child；需要全局 concurrency cap、冲突策略和 Workspace/Worktree 隔离。 |
| 51 | Delegation / Background Agent | 已有 | P1 | continuable background child 支持 send_message/interrupt/list；持久恢复和跨进程后台执行仍有限。 |
| 52 | Task / Activity 状态 | 部分 | P1 | Session summary 有 running/pending interaction/subagent counts，sidebar 有 state dot；没有统一 queued/needs-input/failed/completed 活动中心。 |
| 53 | Todo / Task Tracking | 已有 | P1 | `todo_write` 进入 event-sourced projection，Web TodoDock 展示状态计数与列表。 |

### 自动化、浏览器、远程与桌面

| # | 功能 | DSH Web | 优先级 | 证据与 Aezy 判断 |
|---:|---|---|---|---|
| 54 | Automations | 部分 | P2 | `schedule` 可选插件只有 Session-local after/at/fixed-rate reminder；Session 必须 live，没有独立 scheduler、project/environment/model 配置。 |
| 55 | Scheduled Task History | 缺失 | P2 | schedule change 记录在原 Session，但没有每次 run 的独立结果、状态、历史列表或新 thread。 |
| 56 | Browser | 缺失 | P1 | `web_search`/`web_fetch` 是模型网络工具，不是 localhost browser、tabs、screenshot 或渲染预览。前端开发闭环需要浏览器。 |
| 57 | Browser Agent Interaction | 缺失 | P1 | 没有 click/type/scroll/screenshot 的 browser automation/tool seam。 |
| 58 | Browser Annotation | 缺失 | P2 | 没有 DOM element selection、截图标注或结构化 UI feedback。 |
| 59 | Computer Use | 缺失 | P2 | 没有桌面 screenshot/mouse/keyboard/app switching；附件图片不是 Computer Use。 |
| 60 | Remote Host / SSH | 缺失 | P2 | SSH port forwarding 可让 Web 可达，但没有 RemoteHost entity、远程 filesystem/shell/Git/agent execution。 |
| 61 | Remote Control | 部分 | P2 | Web server 可配置 trusted host，浏览器理论上能远程连接；没有设备身份、通知、审批代理、断线后台服务和移动控制产品。 |
| 62 | Notifications | 缺失 | P1 | 没有浏览器/系统通知的完成、approval、input 或 background job 通道。 |
| 63 | Activity View | 部分 | P1 | sidebar、job list、subagent state 和 trajectory 分散存在，没有跨 Workspace/Session 的集中 activity queue。 |
| 64 | Status | 部分 | P1 | UI 有 session/model/permission/running 状态，缺 model/reasoning/cwd/repo/branch/sandbox/context/task 的统一诊断页或命令。 |
| 65 | Usage / Token 信息 | 部分 | P1 | token meter 和 session stats 有后端数据，Web 默认没有完整的 context pressure、provider/model/date usage、rate-limit/cost 视图。 |
| 66 | Execution / Trajectory 展示 | 已有 | P1 | `ui-trajectory` 已默认提供事件 ledger、请求/工具层级和 timing overview，是 DSH 最接近 Codex 的工作台能力之一。 |
| 67 | Search | 部分 | P1 | Web 有 Session 标题/Workspace 搜索，FTS 默认禁用；Agent 有 glob/grep；没有统一 project/file/repo/command/skill 搜索。 |
| 68 | Command Palette / Keyboard Shortcuts | 部分 | P2 | 有 `/` 菜单、`@` trigger 和 composer 快捷键；没有全局 palette、可发现快捷键和 project/thread/file/terminal 快切。 |
| 69 | 多窗口 | 缺失 | P3 | 浏览器可手动开多个 tab，但没有 Desktop window/session/project ownership。 |
| 70 | Desktop Shell | 缺失 | P3 | 没有原生应用、tray/menu、native notification、editor/terminal/WSL 设置、自动更新。 |
| 71 | Appshots | 缺失 | P3 | 能上传图片附件，但不能从其他应用捕获 screenshot/text 并携带来源加入 context。 |
| 72 | Import | 缺失 | P3 | 能直接读取 workspace instructions/skills，不能导入其他 Agent 的 projects、MCP、plugins、memories 或 chats。 |

## 优先级汇总

### P0：完整本地 Harness 的最低闭环

DSH 已满足 P0 的大部分 runtime 条件：Session/Turn、streaming、stop/queue/steer、文件读写、shell/job、Local Mode、模型选择、sandbox/approval、instructions。真正由 Aezy 立即拥有的 P0 新工作有四项：

1. 把 Workspace 扩展为 Project/Repository/Execution Environment，所有 Session、shell、Git 和 sandbox 都指向同一个权威环境。
2. 建立结构化 file-change ledger 和 patch/diff/revert 闭环，而不是只依赖工具文本与 shell。
3. 建立 Git status/diff/revert 的受控 service 与 UI；它是用户验证 Agent 修改的基础，不应被推迟到 PR 集成阶段。
4. 扩充 approval rules，并把 network policy 独立出来；否则自治执行要么频繁打断，要么只能给过宽权限。

Context/token 展示和统一 execution status 仍然重要，但 compaction、Session projection、Subagent/Job 与 PTY lifecycle 是 DSH 高概率继续完善的已有 seam。Aezy 在 M0-M3 只消费现有事实并做薄投影，不建立第二套内核；只有真实任务证明这些 seam 阻塞首批垂直切片时才重新评估。

### P1：达到 Codex 级日常开发效率

P1 包括 Worktree 与 handoff、file tree/preview/`@file`、Integrated Terminal、完整 Git stage/commit/branch、Code Review、Plan/Goal/Todo 收敛、Skills/Plugins/MCP、subagent topology、Activity/Status/Usage、Browser + browser interaction、notifications 和统一 Search。P1 是重要性集合，不等于同时开工的路线图：Worktree/Handoff 在 M3 由 Aezy 实现；文件树、用户终端、Activity 和 Browser 进入 dogfood 驱动队列；MCP transport、Subagent/Job 内核和 Task Surface 尽量等待上游。

其中 Worktree 与 Git 应早于 Parallel Subagent 大规模启用；否则多个 Agent 共享 checkout，会把冲突处理推给模型和用户。Browser 应在前端开发成为 Aezy 真实 dogfood 场景时进入同一阶段，而不是等 Desktop Shell。

### P2/P3：不阻塞第一版 Aezy

Cloud、Side Chat、Fast Mode、Auto-review approval、inline PR review、GitHub connector、Hooks 兼容、Automations、Computer Use、Remote Host/Control、Browser Annotation、global palette、多窗口、Desktop Shell、Appshots 和 Import 都有价值，但不应先于本地 coding loop。

Cloud Mode 不能用现有 E2B POC 贴标签；Automations 不能用 Session-local Schedule 贴标签；Remote Control 也不能用“Web 端口可以从别的设备打开”贴标签。这些产品面需要各自的身份、权限、持久化、恢复和运维设计。

## 推荐的 Aezy 实施顺序

1. **M0：外置 composition。** 在参考树外新建精简 `aezy-base` 与 `aezy-web` bundle/profile，只保留 P0 runtime/UI，其他行通过 patch 禁用；用它自身跑通 workspace、Session create/resume、queue/steer、读改代码、build/test、approval 和 trajectory。
2. **M1：Workspace & Changes。** 加入 Project/Repository/Local Environment、Git status/diff、turn-scoped change ledger 和安全 revert；以 Aezy 自身的一次真实跨文件改动、部分撤销和刷新恢复作为验收。
3. **M2：权限边界。** 加入 Approval Rules、规则查看/撤销、独立 Network Policy 和审计；在此之前不扩大无人值守执行时长。
4. **M3：隔离与 Handoff。** 加入 Worktree environment、Local/Worktree Handoff 和冲突拒绝；用两个并行真实任务验证 checkout 隔离，再扩大并行 Subagent 默认使用。
5. **M4：dogfood 驱动入口。** 根据可复现痛点逐个选择 file tree/preview、`@file`、用户 Integrated Terminal、Activity/Status/Usage/Notifications 或 Browser；不把它们捆成一次重写 Web 工作台。
6. **等待/薄集成轨。** Profile/settings、Subagent/Job、PTY backend、MCP/ACP、Compaction/Recall、Task Surface 和 Side Session 只做当前版本必要的薄装配；新 RC 到来或 seam 真实阻塞 M0-M3 时再评估。
7. **M5：本地闭环之后。** 再评估 Git stage/commit/branch、Code Review、MCP 管理、PR/Cloud/Remote/Automations/Computer Use/Desktop 等扩展产品面。

## 主要源码依据

- [DSH 架构与 Turn flow](../../.local/deepseek-harness/docs/architecture.md)
- [Agent lifecycle](../../.local/deepseek-harness/docs/agent-lifecycle.md)
- [Web Client package map](../../.local/deepseek-harness/packages/client/README.md)
- [Client runtime：Workspace/Session、queue、fork、model selection](../../.local/deepseek-harness/packages/client/runtime/README.md)
- [Conversation：queue/steer、approval、Todo、compaction](../../.local/deepseek-harness/packages/client/ui-conversation/README.md)
- [Workspace/Session sidebar](../../.local/deepseek-harness/packages/client/ui-workspace/README.md)
- [Session persistence/query](../../.local/deepseek-harness/packages/session/README.md)
- [Sandbox 与 approval](../../.local/deepseek-harness/packages/sandbox/README.md)
- [Subagent capability](../../.local/deepseek-harness/packages/subagent/README.md)
- [Schedule 的 Session-local 限制](../../.local/deepseek-harness/packages/schedule/schedule/README.md)
- [DSH package 架构与能力目录](dsh-package-catalog.md)
