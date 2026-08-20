# DSH v0.1.0-rc.8 更新与 Aezy 影响报告

## 结论

`dsh-v0.1.0-rc.8` 不是小型修补版本。它相对 rc.7 包含 536 个 commit、1,604 个变更文件、54,064 行新增和 10,533 行删除；workspace 包从 219 个增加到 226 个。Aezy 已把只读参考树和发布包运行时一起升级到 rc.8，并通过真实 profile、Web Host、Workspace、Session、M1 Changes/ledger/revert/undo 验证。

此前关于“下一到两个 RC 最可能补已有 seam 的最后一公里”的判断总体正确：Profile Bundle、Subagent/Job、Windows PTY、Session 正确性与 Web settings/rendering 都出现了实质进展。Task Surface、Interactive Side Sessions、Recallable Compaction 仍是 proposed，没有落地。最大的低估是 `@file/@session`：它没有继续停留在后续工作台候选，而是在 rc.8 直接形成了完整 Host/Web seam。

rc.8 仍未提供 Aezy 最关键的 Project/Repository/Environment、结构化 Git、turn change ledger、安全 revert、Worktree/Handoff、持久 Approval Rules 或独立 Network Policy。因此 M1→M2→M3 的主路线不变；应删除或降级的只是 Aezy 自建 `@file`、PTY backend、Subagent 内核等计划。

## 版本与差异基线

| 项目 | rc.7 | rc.8 |
|---|---|---|
| Tag | `dsh-v0.1.0-rc.7` | `dsh-v0.1.0-rc.8` |
| Commit | `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca` | `141eb6fef83422698aef7a981029e843e8161534` |
| Git tree | `3bc8f89fe494a4755c188be354add4e8b1e7b188` | `24a3336d5c32b32ca7e01a84a08c757bd788c624` |
| Workspace packages | 219 | 226 |
| Published Aezy runtime dependency | `@deepseek-ai/dsh@0.1.0-rc.7` | `@deepseek-ai/dsh@0.1.0-rc.8` |
| Aezy lockfile 解析条目 | 649 | 571 |

官方依据：[rc.8 release notes](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.0-rc.8)、[rc.7...rc.8 compare](https://github.com/deepseek-ai/deepseek-harness/compare/dsh-v0.1.0-rc.7...dsh-v0.1.0-rc.8)。本报告的细节判断以 `.local/deepseek-harness/` 中两个 tag 的本地 Git diff 为准。

### Workspace 包增删

| 变化 | Package | 作用 |
|---|---|---|
| 新增 | `@deepseek-ai/dsh-client-ui-brand-official` | 官方 sidebar/conversation 品牌 slot occupants |
| 新增 | `@deepseek-ai/dsh-client-ui-reference` | Web `@file/@session` 引用 source |
| 新增 | `@deepseek-ai/dsh-client-ui-renderer` | 动态 React renderer、slot binding 与 app root |
| 新增 | `@deepseek-ai/dsh-code-runtime-python` | CPython subprocess code-runtime provider |
| 新增 | `@deepseek-ai/dsh-file-reference` | 文件引用发现契约与语法 |
| 新增 | `@deepseek-ai/dsh-file-reference-local` | 本地文件系统有界模糊索引 provider |
| 新增 | `@deepseek-ai/dsh-experimental-agent-team` | experimental roster、mailbox 与 task DAG |
| 新增 | `@deepseek-ai/dsh-experimental-tool-agent-team` | Agent Teams 的模型工具适配层 |
| 新增 | `@deepseek-ai/dsh-tool-pwsh-persistent` | Windows 持久 PowerShell 模型工具 |
| 移除 | `@deepseek-ai/dsh-client-schema-form` | schema 操作收敛进 `ui-settings` / `ui-settings-models` |
| 移除 | `@deepseek-ai/dsh-client-web-react` | React bindings 与 app root 收敛进动态 `ui-renderer` |

## 主要新增与变化

### 1. Web `@file` 与 `@session` 引用

rc.8 新增：

- `@deepseek-ai/dsh-file-reference`：文件引用发现契约和共享 `@file` 语法；
- `@deepseek-ai/dsh-file-reference-local`：Host 侧有界模糊文件索引；
- `@deepseek-ai/dsh-client-ui-reference`：Web 中统一的文件与 Session 引用菜单；
- Web bundle 中的 `session-reference`、`file-reference-local` 和 `ui-reference` 默认装配行。

文件选择只把稳定路径引用写入 prompt，不提前把文件内容塞进上下文；模型仍通过正常文件工具读取内容。Session 引用使用结构化 identity，在 `agent/pre-step` 捕获有界快照。浏览器不扫描 Host 文件系统，也没有把 label 当身份。

对 Aezy 的含义：不再自建 `@file` 基础设施，直接采用上游 seam；Aezy 后续仍拥有 file tree、preview、`@directory`、`@diff` 等产品入口。上游实现不是完整 IDE 文件树。

### 2. Product Subagent 与 Job 最后一公里

Claude Code 和 Codex provider 现在都携带 `dsh.bundle.patch`，可以作为可选 Profile Bundle 安装；它们不再进入 base 默认层。rc.8 同时增加：

- Profile 级非交互权限模式；
- 多个命名 provider 实例；
- 结构化、脱敏、有界的失败事实；
- Codex 进程结算与 stderr 诊断修复；
- `reportDelivery: next-step`，报告会在安全 step 边界唤醒 parent，并保持先于 child settlement 的因果顺序；
- 前台与后台 Job 对相同 subagent 失败事实的呈现。

对 Aezy 的含义：此前“不要另写 Subagent/Job 内核”的决定得到强化。M3 之前只做状态透传和 bundle 选择；这些产品 provider 的权限模式不是 Aezy 的通用 Approval Rules，也不是父 Harness 的 Network Policy。

### 3. Windows 持久 PowerShell PTY

rc.8 新增 `@deepseek-ai/dsh-tool-pwsh-persistent`，扩展 `subprocess-local` 的 Windows process inspection/signalling，并让 terminal backend 支持 `bash | pwsh` dialect。Minimal preset 在 Windows 上默认使用持久 PowerShell，在 POSIX 上继续使用持久 Bash。

对 Aezy 的含义：此前对 Windows ConPTY/persistent shell 的预测精确命中。Aezy 不实现第二套 Windows PTY backend；当前 Aezy preset 仍保留一次性 `pwsh`，后续应通过外置 preset patch 薄接入 rc.8 的平台门控持久栈，并在真实 Windows 上验证后再默认启用。它仍然是模型工具 backend，不是用户 Integrated Terminal UI。

### 4. 多模态与附件边界

DeepSeek adapter 可显式启用原生图片请求；`/goal`、`/plan` 等命令能消费图片提交信封。附件准入增加图片边长限制，请求构建会在累计图片 payload 超限时把旧图片卸载成文本占位，避免大图或长历史导致请求失败。

对 Aezy 的含义：图片输入和命令附件应等待并复用上游，不在 Aezy 建第二套附件协议。它与 Project/Git 工作台没有所有权冲突。

### 5. Session、fork 与持久化正确性

rc.8 会在取消流式生成时把已经展示的 assistant 前缀正式写入历史，使后续提问和 fork 不再丢失已见内容；大型历史 Session 的 fork 路径得到性能优化。

可选 SQLite provider 改为 schema 17 的 packed chunk rows 和 Zstandard 压缩，读写、fork 和体积均改善，但拒绝旧 schema，且预发布版本不提供迁移。DSH shipped composition 默认仍使用 JSONL，因此 Aezy 当前 `~/.aezy/dsh` 不受该破坏性格式变化影响；任何显式启用 SQLite 的部署必须新建数据库或自行导出/导入。

Recallable Compaction、`history_read`、`history_search` 没有落地，仍不应由 Aezy 重写。

### 6. Web renderer、settings 与品牌所有权

rc.8 将 React 根和 slot binding 从静态 Web shell 拆到动态 `@deepseek-ai/dsh-client-ui-renderer`，附件显示也改由 `ui-attachment` 通过 slot 占位。`conversation.view` 仍是公开 slot，Aezy M1 Changes view 无需迁移，真实 rc.8 build/boot 已证明兼容。

Settings 新增单一 `SettingsDescribeMirror`，把冷启动 `settings.describe` 从约 15 次降到 2 次；这符合“插件设置最后一公里”的预测。

新的 `@deepseek-ai/dsh-client-ui-brand-official` 占据 sidebar 和 conversation brand slots；上游同时明确 “DeepSeek Harness” 是注册商标。Aezy 应尽快用外置 `@aezy/brand` 插件占据这些 slot，并通过 `aezy-web` 禁用官方品牌 occupant，不修改 DSH 源码。这是 rc.8 后新增的近期产品身份任务。

### 7. Experimental Agent Teams

rc.8 新增未进入默认 bundle 的：

- `@deepseek-ai/dsh-experimental-agent-team`；
- `@deepseek-ai/dsh-experimental-tool-agent-team`。

它们提供 durable roster、peer mailbox 和共享 task DAG，是 Subagent 协调内核的强信号，但 README 明确限制为单进程、共享 checkout、advisory write scopes、没有文件锁、没有 Web controls、没有 worktree/merge。它不是 proposed Task Surface 的交付，也不能替代 Aezy M3 Worktree/Handoff。M3 之前保持禁用，只把它当作未来薄集成候选。

### 8. 其他发布变化

- `web_search` 接受有界并发 queries；
- 自定义 OpenAI-compatible gateway 的请求形态和 reasoning content 回传得到修复；
- Web 本地启动默认打开浏览器，可用 `--no-open` 禁止；Aezy 自动测试已固定使用 `--no-open`；
- Python SDK runtime 补齐四个内置 Agent preset、`rg`/glob 和 MCP stdio 所需依赖；
- 包安装闭包缩小，Aezy lockfile 的解析条目从 649 降至 571；
- 新增 Python code-runtime provider；
- locale 默认、侧栏搜索、模型批量选择、窄屏 composer、反馈与 workflow UI 有多项体验修复。

## 对既有预测的复盘

| 先前预测 | rc.8 实际结果 | 判断 |
|---|---|---|
| Profile bundle / 插件设置会补最后一公里 | Product subagent 变成 installable bundle；Settings describe mirror 落地 | **强命中** |
| Subagent + Job 状态和 UI 会继续完善 | 命名实例、非交互权限、失败事实、report/settlement 顺序和 parent 唤醒 | **强命中** |
| PTY/persistent shell 跨平台，尤其 Windows | Windows 持久 PowerShell + ConPTY 路径进入 Minimal preset | **精确命中** |
| MCP/ACP rich content 与重连 | Python runtime 补 MCP stdio 闭包，多模态/ACP 测试扩展；未见通用 reconnect 状态机交付 | **部分命中** |
| Session/projection/compaction 正确性 | 取消流前缀、fork 性能、SQLite、引用上下文均有改进；recallable compaction 未交付 | **部分命中** |
| Task Surface 可能上游实现但时间不确定 | 仍在 proposed；Experimental Agent Teams 有 task DAG，但没有 Web Task Surface | **等待判断正确，功能未交付** |
| Interactive Side Sessions / merge-back | `@session` 是引用快照，不是 side session 或 merge-back | **未交付** |
| Recallable Compaction/history tools | proposed 文件仍在，未进入实现 | **未交付** |
| Project/Repository/Git/ledger/revert 近期不会完整出现 | rc.8 没有这些产品域 | **命中** |
| Worktree/Handoff、Approval Rules、Network Policy 近期不会完整出现 | Agent Teams 明确共享 checkout；subagent 权限仅是 provider 配置；其余缺失 | **命中** |
| 文件树/`@file` 后续按 dogfood 推进 | `@file/@session` 提前由上游完整交付，只有文件树/preview 仍缺 | **低估上游速度** |
| 用户终端、Browser automation、Activity、Notifications 仍缺 | 新 PTY 是模型工具，自动打开 URL 不是 browser automation；其余仍缺 | **命中** |

整体评价：方向判断正确，尤其避免重写 Subagent、PTY、Session 内核是正确决策；对 `@file` 的时间判断偏保守。rc.8 进一步证明 Aezy 应把重型实现限定在 Project/Environment/Git、安全策略和 Worktree/Handoff。

## Aezy 重新排序后的行动

1. **立即完成 rc.8 基线和 Aezy 品牌 occupant。** 保持新版 renderer/reference/settings，外置覆盖 `ui-brand-official`，遵守品牌边界。
2. **继续完成 M1 dogfood 签收。** rc.8 没有替代 repository status/diff、turn ledger 或安全 revert；当前实现已通过 rc.8 HTTP 验证。
3. **M2 仍是 Approval Rules + Network Policy。** 不把 Codex/Claude provider 的非交互权限选项误认为 Harness 通用安全策略。
4. **M3 仍是 Worktree + Handoff。** Experimental Agent Teams 共享 checkout，恰好证明隔离仍必须由 Aezy 产品域承担。
5. **薄接入上游 `@file/@session`、Windows PTY 和可选 product subagent bundle。** 不复制其协议或状态机；按真实平台/权限测试后启用。
6. **继续等待 Task Surface、Side Sessions、Recallable Compaction 和 MCP reconnect。** rc.8 没有改变这些所有权边界。

## Aezy rc.8 验证证据

- `@deepseek-ai/dsh --version`：`0.1.0-rc.8`；
- lockfile 中 `0.1.0-rc.7` 出现次数：0；所有 DSH workspace/runtime peer 均解析到 rc.8；
- `pnpm peers check`：无 peer dependency 问题；React/ReactDOM 按上游 rc.8 Web 基线固定为 18.3.1；
- `pnpm store status`：untouched；
- M1 build：通过；
- M1 unit tests：6/6 通过；
- M0 真实 composition/Web/Workspace/Session/preset smoke：通过；
- 3090 Web：HTTP 200；
- boot manifest：同时包含 `@aezy/project`、`dsh-client-ui-renderer`、`dsh-client-ui-reference`、`dsh-client-ui-brand-official`；
- M1 真实 HTTP ledger/revert/undo/request fence：通过；
- 默认 Session persistence：仍为 JSONL，没有触发 SQLite schema 17 迁移风险。
