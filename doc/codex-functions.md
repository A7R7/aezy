# Codex Desktop / Harness 主要功能表

## 1. 项目与工作区

* 打开本地文件夹作为项目。
* 管理多个项目和最近使用的项目。
* 一个项目下保存多个独立对话/thread。
* 支持一个项目包含多个文件夹或多个 repository。
* 识别当前 Git repository、branch 和工作目录。
* 项目与对应的对话历史关联。
* Local、Worktree、Cloud 等不同执行环境与项目关联。

## 2. Thread / Session

* 创建新 thread。
* 持久保存 thread。
* 恢复旧 thread 并继续工作。
* fork 一个已有 thread。
* archive / restore thread。
* rename thread。
* 搜索历史 thread。
* thread 可持续跨多个 turn 工作。
* 不同 thread 可以同时运行。
* thread 有 running、waiting、completed、failed 等状态。
* 长时间运行时可以在后台保持执行。

## 3. Turn 与实时执行

一个用户输入通常对应一个 turn，内部可以包含很多 agent 行为：

* 用户消息。
* reasoning / progress 信息。
* 文件读取。
* 搜索。
* tool call。
* shell command。
* 文件修改。
* subagent 活动。
* approval request。
* 最终回复。
* error / cancellation。

执行过程以流式形式实时显示。

## 4. Stop

* 当前 agent 工作过程中可以停止。
* 停止当前 turn 不等于删除整个 thread。
* 已经完成的文件修改和执行结果可以保留。
* 停止后可以继续发送新的指令。

## 5. Queue

Agent 正在工作时，可以再发送一个 prompt，并让它：

* 先进入队列；
* 当前工作结束后再执行。

可以连续排多个后续请求。

## 6. Steer

Agent 正在工作时，可以直接发送新的约束或方向：

例如：

> 不要修改 public API。

这条信息会进入当前正在运行的任务，而不是等待整个任务完成后才成为下一轮消息。

## 7. Context 管理

* 根据 thread 历史重建模型 context。
* 长对话自动 compaction。
* 手动 compact。
* 对大型 tool output 做裁剪或压缩。
* 保存重要的任务状态和上下文。
* 显示 context/token 使用情况。

## 8. 文件读取

Agent 可以：

* 读取文件。
* 读取指定范围。
* 浏览目录。
* 搜索文件名。
* glob。
* grep。
* 搜索 repository 内容。
* 读取图片等部分非文本内容。

## 9. 文件修改

Agent 可以：

* 创建文件。
* 编辑文件。
* patch。
* replace。
* 删除文件。
* rename / move 文件。
* 同一个 turn 修改多个文件。

## 10. Shell

Agent 可以执行：

* shell command。
* build。
* test。
* lint。
* formatter。
* package manager。
* Git CLI。
* 开发服务器。
* 任意项目相关 CLI。

能获取：

* stdout。
* stderr。
* exit status。

Windows 可以使用 PowerShell 等 shell。

## 11. Background Jobs

长时间运行的命令可以后台执行，例如：

* dev server。
* watch。
* 长测试。
* build。
* script。

Agent 后续可以：

* 查看 job。
* 查看新 output。
* 等待 job。
* kill job。

## 12. Local Mode

Agent 直接在用户当前 checkout 中工作：

```text
repo/
```

文件修改、shell、Git 全部操作当前真实 workspace。

## 13. Worktree Mode

Codex 可以自动创建 Git worktree：

```text
repo/
repo-worktree-A/
repo-worktree-B/
```

不同任务使用不同 worktree，从而：

* 并行工作；
* 隔离文件修改；
* 避免多个 agent 修改同一个 checkout。

## 14. Local / Worktree Handoff

一个已有 conversation 可以在 Local 与 Worktree 环境之间移动。

对应代码修改和 Git 状态也一起处理。

## 15. Cloud Mode

Agent 可以在远程隔离环境中运行：

* checkout repository。
* 安装 dependency。
* 运行 build/test。
* 修改代码。
* 保存 diff。
* 后续继续 conversation。
* push / PR。

## 16. 文件浏览器

桌面端提供项目文件浏览能力：

* directory tree。
* 展开/折叠目录。
* 打开文件。
* 搜索文件。
* 查看文件内容。
* 从文件加入 prompt context。

## 17. 文件预览

可以预览不同类型内容，例如：

* source code。
* Markdown。
* 图片。
* PDF。
* spreadsheet。
* document。
* presentation 等。

不完全等价于完整 IDE editor。

## 18. `@` Context 引用

在 prompt 中可以引用：

* 文件。
* directory。
* skill。
* 其他可提供 context 的对象。

例如：

```text
@src/auth.ts
```

## 19. Integrated Terminal

每个项目/thread 可以打开交互式 terminal。

特点包括：

* cwd 对应当前 project/worktree。
* 用户可以手工执行命令。
* 多 terminal。
* terminal tabs。
* shell 选择。
* Agent 可以利用 terminal 中的输出继续分析问题。

## 20. Git Status

界面可以显示：

* current branch。
* modified files。
* staged files。
* unstaged files。
* untracked files。

## 21. Git Diff

查看：

* 单文件 diff。
* 所有修改 diff。
* staged diff。
* unstaged diff。
* commit diff。
* branch vs base diff。
* 最近一个 agent turn 产生的 diff。

## 22. Git Stage / Unstage

支持：

* stage file。
* unstage file。
* stage all。
* 部分场景下按 hunk 操作。

## 23. Git Revert

支持：

* revert 文件修改。
* revert 一部分 diff/hunk。
* 撤销 Agent 某些修改。

## 24. Commit / Push

直接从桌面端：

* 创建 commit。
* 填写 commit message。
* push 当前 branch。

## 25. Branch

* 查看当前 branch。
* 创建 branch。
* worktree 与 branch 建立关联。
* 从特定 base branch 开始任务。

## 26. Code Review

Codex 可以进入专门的 review 工作流，审查：

* 当前未提交修改。
* staged changes。
* 当前 branch 与 base branch 的差异。
* PR diff。

输出代码问题、风险、bug 等 findings。

## 27. Inline Review

在 diff 的具体代码行上：

* 查看 review finding。
* 添加用户 comment。
* 将这些 comment 重新交给 Codex。
* Codex 根据指定位置修改代码。

## 28. GitHub / Pull Request

Codex 可以围绕 GitHub PR 工作：

* 创建 PR。
* 查看 PR。
* 查看 changed files。
* 查看 review comments。
* 阅读 reviewer feedback。
* 根据 review 修改代码。
* push fix。
* 继续更新 PR。

## 29. Plan Mode

专门的规划模式。

Agent 主要：

* 阅读代码。
* 搜索。
* 调查架构。
* 分析问题。
* 制定实现计划。

和直接 implementation 的普通模式区分开。

## 30. Goal Mode

可以给 thread 设置一个持续性的 Goal。

Goal：

* 跨多个 turn 保存。
* 可以持续较长时间。
* 可以修改。
* 可以暂停。
* 可以恢复。
* 可以完成/清除。

Agent 后续工作围绕这个长期目标推进。

## 31. Side Chat

在主 conversation 之外临时开一个相关问题。

例如主 thread 正在重构代码，同时开 side chat 问：

> 这个协议为什么这么设计？

Side Chat 可以利用相关上下文，但不必把整段讨论混入主任务。

## 32. Model Selection

每个任务可以选择模型。

包括：

* 当前 model。
* 不同 coding model。
* 可用 provider/model 配置。

## 33. Reasoning Effort

可以选择不同推理强度，例如：

* low。
* medium。
* high。
* xhigh。

不同 model 支持程度可能不同。

## 34. Fast Mode

提供偏重低延迟/高速度的执行模式。

## 35. Personality / Communication Style

可以改变 Agent 的交流风格或行为偏好。

这主要影响回答表现，不是 coding runtime 的核心机制。

## 36. Sandbox

本地 Agent 执行具有 sandbox。

典型权限级别包括：

* read-only。
* workspace write。
* full access。

控制 Agent 能访问哪些 filesystem/resource。

## 37. Approval

当 Agent 尝试执行超出当前权限的操作时，可以要求用户批准。

包括：

* command。
* workspace 外文件访问。
* network。
* 外部 tool。
* MCP / app 操作。

用户可以 approve 或 deny。

## 38. Approval Rules

可以对某些操作建立规则，例如：

* 这一次允许。
* 相同 command 以后允许。
* 某些类型操作不再询问。

## 39. Network Policy

网络访问可以与 filesystem 权限分开控制：

* 禁止。
* 请求 approval。
* 允许。

## 40. Auto Review Approval

某些权限请求可以交给另一个 reviewer agent 判断是否安全，再决定是否自动批准。

## 41. AGENTS.md

Codex 自动读取 repository 中的 `AGENTS.md`。

用于保存：

* coding rules。
* build/test 命令。
* repository conventions。
* architecture instructions。
* agent 注意事项。

可以有全局和目录层级的 instructions。

## 42. `/init`

可以帮助项目创建初始 `AGENTS.md` 或项目级 agent instructions。

## 43. Skills

Codex 支持 reusable Skill。

Skill 可以包含：

* instruction。
* workflow。
* script。
* reference material。
* resources。

Skill 可以被：

* Agent 自动选择。
* 用户显式调用。

## 44. Plugins

Plugin 是更大的扩展包，可以组合：

* Skills。
* MCP。
* connectors。
* hooks。
* 其他能力。

支持安装、启用和管理插件。

## 45. MCP

连接 Model Context Protocol server。

可以获得：

* MCP tools。
* resources。
* 外部系统访问。
* authentication。

支持本地 stdio 和远程 MCP 等形式。

## 46. Hooks

监听 Agent 生命周期事件并执行额外行为。

例如：

* turn start。
* turn end。
* tool invocation。
* approval。
* task completion。

用途包括：

* automation。
* logging。
* policy。
* telemetry。
* notifications。

## 47. Slash Commands

Composer 支持 `/` command。

常见包括：

```text
/plan
/goal
/review
/compact
/status
/model
/reasoning
/mcp
/init
/fork
/side
/worktree
/local
/cloud
/task
```

## 48. Subagents

主 Agent 可以启动子 Agent。

Subagent 可以负责：

* 搜索。
* 调研。
* 修改某个子系统。
* 测试。
* review。
* 其他独立子任务。

主 Agent最终接收 Subagent 的结果。

## 49. Subagent Thread

每个 Subagent 可以具有自己的执行记录：

```text
Main Agent
 ├─ Subagent A
 ├─ Subagent B
 └─ Subagent C
```

用户可以查看 Subagent 做了什么。

## 50. Parallel Subagents

多个 Subagent 可以并行运行。

例如：

```text
Agent A → frontend
Agent B → backend
Agent C → tests
```

完成后由主 Agent继续整合。

## 51. Delegation / Background Agent

任务可以委托给后台 agent/thread，主 conversation 不需要一直阻塞等待。

## 52. Task / Activity 状态

桌面端集中显示正在发生的工作，例如：

* running。
* queued。
* needs input。
* needs approval。
* completed。
* failed。

## 53. Todo / Task Tracking

Agent 内部可以维护任务列表、当前进度和待完成事项。

## 54. Automations

可以创建自动运行的 coding task。

通常包含：

* prompt。
* project。
* schedule。
* model。
* execution environment。

例如：

```text
每天检查 repository 是否有 failing tests。
```

## 55. Scheduled Task History

Automation 的每一次运行：

* 保存结果。
* 显示成功/失败。
* 产生新的 thread/result。
* 可以查看历史运行。

## 56. Browser

桌面端有内置 Browser。

可以：

* 打开 localhost。
* 打开网页。
* 多 tab。
* screenshot。
* 查看当前渲染结果。

## 57. Browser Agent Interaction

Agent 可以操作 Browser：

* click。
* type。
* scroll。
* screenshot。
* 查看页面状态。

典型用途是修改 Web UI 后自己打开 localhost 验证。

## 58. Browser Annotation

用户可以直接在网页 UI 上标记问题：

* 点选元素。
* 指出 layout。
* spacing。
* visual bug。

标注可以成为 Agent 的结构化输入。

## 59. Computer Use

Agent 可以操作桌面 GUI：

* screenshot。
* mouse click。
* keyboard input。
* 应用切换。

可以用于：

* GUI 软件开发。
* 测试。
* bug reproduction。
* 验证桌面应用行为。

## 60. Remote Host / SSH

Codex 可以在远程机器对应的 workspace 中工作。

包括：

* SSH host。
* 远程 filesystem。
* shell。
* Git。
* agent execution。

## 61. Remote Control

运行中的 desktop coding task 可以通过其他设备继续控制：

* 查看进度。
* send follow-up。
* steer。
* approve。

## 62. Notifications

桌面通知包括：

* Agent 完成。
* 需要 approval。
* 需要用户输入。
* background task 完成或失败。

## 63. Activity View

集中查看最近：

* 活跃 thread。
* 正在运行任务。
* 等待处理任务。
* 已完成任务。

适合多 Agent / 多 thread 并行时使用。

## 64. Status

可以查看当前 Agent 环境状态，例如：

* model。
* reasoning。
* cwd。
* project。
* Git branch。
* sandbox。
* context usage。
* 当前任务状态。

## 65. Usage / Token 信息

Codex 可以提供一定程度的：

* token usage。
* context usage。
* rate limit。
* model usage。
* thread usage 信息。

## 66. Execution / Trajectory 展示

运行历史可以展示：

* Agent 消息。
* tool。
* command。
* file change。
* Subagent。
* execution duration。
* error。

DSH 自己现有的 trajectory viewer 在这个方向已经比较接近。

## 67. Search

桌面端存在多种搜索：

* thread 搜索。
* project 搜索。
* file 搜索。
* repository text search。
* command/skill 搜索。

## 68. Command Palette / Keyboard Shortcuts

桌面应用支持：

* command palette。
* keyboard shortcuts。
* 快速切换 project/thread。
* 快速打开 terminal/file 等。

## 69. 多窗口

可以把不同项目、conversation 或任务放到独立窗口。

## 70. Desktop Shell

作为桌面应用还包含：

* system tray / menu。
* native notification。
* preferred editor。
* terminal configuration。
* WSL 等本机环境配置。
* automatic update。
* theme/font 等界面设置。

## 71. Appshots

部分平台可以直接获取其他应用当前内容：

* screenshot。
* 可获取的文本信息。

然后加入 Codex context。

## 72. Import

当前 Codex/ChatGPT Desktop 还可以从其他 coding agent 环境导入一部分配置和数据，例如：

* projects。
* instructions。
* skills。
* MCP。
* plugins。
* memories。
* recent chats 等。
