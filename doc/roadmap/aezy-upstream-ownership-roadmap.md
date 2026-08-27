# Aezy 上游边界与实施路线图

> 活动路线文档，更新于 2026-08-28。已完成切片的详细实现和验证只在
> `doc/milestones/` 维护。

## 决策原则

Aezy 是基于 DSH 公开扩展机制的完整编程 Agent 发行版，不是 DSH 源码 fork。工作分为
两类：

1. **Aezy 产品域**：上游没有相应产品面、又直接影响 Aezy 使用体验的能力，通过外置
   plugin、bundle、profile patch、adapter 或 Desktop 应用实现。
2. **DSH 内核域**：DSH 已有 seam、实现或成熟 proposed design 的状态机/协议，Aezy 只做
   装配、状态投影和必要 UI，不复制第二套内核。

每个新切片开始前重新检查公开 tag、package API 和 client/layout/slot seam。没有新上游
版本不构成阻塞；但缺失产品 UI 也不授权修改 `.local/deepseek-harness/`。

## 当前上游信号

- Aezy runtime 与只读 reference 均已运行并签收于最新公开 tag `dsh-v0.1.1-rc.2`。
- rc.1/rc.2 已有 credentials/authorization、Session projection、Subagent lineage、PTY、
  Job、MCP/ACP、compaction 和 Web layout 等基础 seam，但不等于完整 Aezy 产品面。
- rc.2 仍没有 generic panel router、browser raw TTY/resize 或 Interactive Side Sessions
  merge-back 产品实现。
- rc.2 的实质增量集中于统一图片/附件请求管线：provider-independent normalized attachment、
  route-owned deterministic request variant、text-only fallback、历史图片 offload、DeepSeek Files
  lifecycle/inline fallback，以及绑定 model metadata 与 dispatch 世代的 `prepareCall` seam。它
  可以接管未来 DSH-native backend 的 multimodal request layer，但不替代现有 Aezy 产品切片。
- 官方 Codex `app-server` 是自定义 rich client 的公开集成面，覆盖 authentication、
  conversation history、approvals 与 streamed agent events；ChatGPT managed 模式由 Codex
  持有并刷新 OAuth credentials，并公开 plan、rate limits 与 usage。当前本机
  `codex-cli 0.149.0-alpha.4.1` 仍把该命令标为 experimental，因此 Aezy 必须固定兼容版本并
  用 contract test 隔离协议变化。
- proposed note 是避免重复造内核的信号，不是交付日期承诺：
  - [Task Surface](../../.local/deepseek-harness/.agents/notes/proposed/feature/2026-08-04-task-surface.zh.md)
  - [Interactive Side Sessions](../../.local/deepseek-harness/.agents/notes/proposed/feature/2026-07-08-interactive-side-sessions.md)
  - [Recallable Compaction](../../.local/deepseek-harness/.agents/notes/proposed/feature/2026-07-06-recallable-compaction.md)

版本变化与签收见 [`dsh-0.1.1-rc1-impact.md`](../reference/dsh-0.1.1-rc1-impact.md)；最新
reference 差异与路线影响见
[`dsh-0.1.1-rc2-impact.md`](../reference/dsh-0.1.1-rc2-impact.md)。

## 能力所有权矩阵

| 能力域 | Owner / 当前策略 | Aezy 允许做什么 | Aezy 不做什么 |
| --- | --- | --- | --- |
| Composition、品牌、默认 preset | Aezy | 外置 bundle/profile patch、禁用非核心行 | 修改 DSH package 或另建安装格式 |
| Project/Repository/Environment | Aezy | 统一 cwd、Git、Session、sandbox 的产品归属 | 用 shell 文本冒充权威 Git/环境事实 |
| Turn File Change Journal | Aezy 薄观察层 + Git enrichment | 记录 structured `write/edit`；Git 补 fingerprint/concurrent/Undo | 修改 SessionEvent/文件工具；解析 shell 猜副作用 |
| Approval Rules / Network Policy | Aezy，叠加 DSH approval/sandbox | 持久规则、解释、审计、tool-boundary network policy | 绕过 downstream deny；声称是 OS firewall |
| Worktree / Handoff | Aezy | 受管路径、Session binding、可审计 handoff/cleanup | Cloud/PR/任意远程 worktree 泛化 |
| Review、Files、Contextual Ask | Aezy Web 产品面 | 复用 ledger、`details`、reference codec、DSH renderer | editor/stage/hunk apply；复制 layout/file index/composer |
| Integrated Terminal | Aezy UI + DSH PTY owner | Session/cwd fence、line UI、动态 details/overlay、状态投影 | fork PTY/job/process；伪装 raw TTY/resize/ConPTY |
| Multimodal attachment / request projection | DSH owner | 消费 normalized attachment、request variant、route offload 与 provider transport | 自建 image encoder/cache、provider Files index 或 text-only history rewrite |
| Activity / Status / Usage / Notifications | 原实验废弃；未来拆入 Traffic/Task Board | 需要时投影各 runtime 的权威事件与 usage | 继续旧 Activity 提交；用小状态页代替完整 Board |
| ChatGPT Auth / Codex runtime | Codex `app-server` owner + Aezy 外置 adapter | 发起 managed browser/device login；投影 account/plan/rate/usage；映射 thread/turn/approval stream | 读取 OAuth token；自写 refresh/credential store；假定 Pro 是通用 API key |
| Codex-inspired DSH backend | DSH Session/provider/tool/approval owner + Aezy adapter | 在同一 runtime contract 后增加可替换 backend，并复用 DSH 事实 | 为追求 Codex 外观复制 Session/Subagent/Task/PTY/compaction 内核 |
| Browser interaction | Paused | 默认打开外部浏览器；未来仅在 agent 调试证据有明确价值时复议 CDP/screenshot/interaction | 为视觉完整性嵌入狭小 viewport；阻塞 self-development loop |
| Subagent / Job / Task Surface | DSH owner，Aezy 薄投影 | 显示 lineage、状态、控制入口 | 第二套 Subagent/Job/Task 持久状态机 |
| Side Sessions / merge-back | 等待 DSH | 未来复用 fork/merge-back seam | 平行 Session 内核和私有 merge event/store |
| Compaction / recall | DSH owner | 展示 token/context 压力，消费公开 history seam | 第二套摘要、历史索引、`history_read/search` |
| MCP/ACP transport | DSH owner | 配置、权限入口、状态展示 | fork transport/reconnect/rich-content mapping |
| Desktop multi-runtime | Aezy Desktop 产品域 | 一个 Desktop 管理多 Workspace；每个绑定独立 Runtime adapter | 把 Windows/WSL/SSH/Docker 差异塞入 Session 内核 |
| Workspace DAG / branch merge | Aezy 导航产品面 + 上游 lineage/merge seam | 可视化 Session/Worktree/Handoff 关系 | 在 merge-back seam 成熟前建立私有 DAG 持久协议 |
| Traffic Board | Aezy control-plane 产品面，当前暂缓 | 未来统一 provider/account pool、routing、request log、usage/quota 与控制 | 把单 Session 状态卡称作统一流量控制 |
| Task Board | Aezy 产品面，当前暂缓 | 基于权威 Task/Issue facts 做本地看板与开发关联 | 用 UI 卡片另建第二套 agent Task runtime |

### 关于 “remove repository plugin”

上游移除的是重复的第三方插件分发路径，不是 Git Repository 产品域。Aezy 的唯一扩展路线
仍是：

```text
dsh plugin --profile <name> add <package-or-git-spec>
→ installable profile bundle
→ dsh.bundle.patch / cordis.patch.yml
→ ordinary external Cordis plugins
```

因此 Project/Repository/Environment 继续由 Aezy 产品层拥有，但交付格式不另起炉灶。

## 已完成基线

| 切片 | 状态 | 记录 |
| --- | --- | --- |
| M0 composition/profile | Complete | [`m0.md`](../milestones/m0.md) |
| Turn journal foundation | Complete | [`turn-journal.md`](../milestones/turn-journal.md) |
| M1 Project/Changes | Complete | [`m1.md`](../milestones/m1.md) |
| M2 Security | Complete | [`m2.md`](../milestones/m2.md) |
| M3 Worktree/Handoff | Complete | [`m3.md`](../milestones/m3.md) |
| M4 Review/Files/Context | Complete | [`m4.md`](../milestones/m4.md) |
| Integrated Terminal | Complete | [`terminal.md`](../milestones/terminal.md) |

## 路线纠偏记录

Activity dashboard 的 `297f2525c5`、`38ff79419a`、`b31efd533f` 没有满足统一 Traffic Board
或 Task Board 的产品目标，已分别由 `b153454f3c`、`b09c40b197`、`5faa1ba740` 独立 revert。
这些提交仅供历史追溯，不是后续实现基础。

Browser integration 暂停。外部浏览器已经能提供更合适的页面空间；未来只有当页面自动发现、
CDP 调试、截图或交互证据对 agent loop 有经过验证的价值时才重开，而且“浏览器工具”不等于
必须把网页 viewport 嵌进 Aezy panel。

## 接下来

### 0. rc.2 runtime compatibility gate（Complete）

所有 DSH 发布包已从 rc.1 精确升级到 rc.2，lock/profile 与 3090 Host 已重建；全量自动测试、
M0 profile smoke 及 M1/M2/M3/Terminal 真实 HTTP/PTY 回归通过。没有新增图片产品 UI、重构
已签收能力或 patch DSH 源码。门禁发现 `dsh-authorization` 必须显式精确锁定 rc.2，避免
`dsh-llm-pi-ai` 带来的混合 peer graph。

### 1. Relay Codex companion gate（Complete：硬约束失败）

已在隔离 profile 验证 `relay-dsh-plugin-codex@0.1.2`。ChatGPT managed auth 复用、account/
rate/usage、streamed Turn、连续对话、重启 resume 和 cancel 通过；但真实 Luna/Sol Turn 都没有
形成结构化 DSH tool/call/result 或 approval round-trip，Sol 还在跨模型 continuation 上出现
`invalid_encrypted_content`。Relay 也没有 Aezy 内 managed login/logout 产品入口，binding store
默认逃逸 `DSH_HOME`。因此不安装到主 profile。完整证据见
[`relay-dsh-plugin-codex-0.1.2-compatibility.md`](../reference/relay-dsh-plugin-codex-0.1.2-compatibility.md)。

### 2. 最小官方 app-server adapter spike

这是当前唯一最高优先级切片。以固定 Codex 版本启动本地 `app-server`，在独立外置 adapter
中验证：

当前进度：`@aezy/codex` process/protocol client、Host account API 与 Settings 产品面已经进入
Aezy profile；真实 `gpt-5.6-sol` structured `commandExecution` 已通过，managed ChatGPT
browser/device login、logout、account/plan/rate limits/usage/model discovery 均由官方 App Server
托管并在 3090 验证，analytics 默认关闭，Aezy 不接收或返回 token。`aezy-codex` provider 的
DSH Session↔Codex Thread/Turn、stream、cancel、restart-resume 已完成；官方 dynamic tool seam
把所有可变操作送回 DSH tools/Security/approval，Codex 原生权限固定 read-only 且提权
fail-closed。真实 command projection、write→Journal、Security deny/audit 与 approval
`allowed-once` 均已通过。剩余门槛是 Aezy 自身仓库的完整 self-development dogfood。

- protocol initialize 与能力协商；
- `account/read`、managed ChatGPT browser/device login、logout、Pro `planType`；
- thread create/read/resume 与 turn start/stream/cancel；
- command/file-change approval、工具事件和错误/断线恢复；
- rate limits 与 account usage 的只读投影；
- 进程重启后恢复同一 Codex thread，不复制 conversation history。

Codex 是 OAuth、credential、thread 和 agent loop 的权威 owner。Aezy 只持有将 DSH
Workspace/Session 关联到 opaque Codex thread id 所需的最小 binding，不读取 credential 文件，
不接收 access/refresh token，也不自行调用非公开 ChatGPT endpoint。官方依据：
[Codex App Server](https://developers.openai.com/codex/app-server/)、
[Codex Authentication](https://developers.openai.com/codex/auth/) 和
[Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)。

### 3. Codex-backed Aezy 产品闭环

模型/推理选择、登录状态、composer、streaming transcript、tool/diff 事实、approval、stop/resume
与 usage 已通过现有 DSH/Aezy 产品面连接。当前不增加平行 UI；下一步直接以受管 Worktree 对
Aezy 自身执行真实改动、测试、Review、Host restart 与 continuation。必须继续复用当前
Project/Review/Terminal/Security 能力，不从头重构已签收切片。

完成门槛不是静态 UI，而是 Aezy 能打开本仓库、通过 Pro 登录执行真实 Turn、修改外置 Aezy
代码、运行相关测试、审阅 diff、重启 Host，并在同一开发任务上继续工作。达到该门槛才可称为
“可自迭代”的最小替代品。

### 4. 可替换 DSH-native agent backend

Codex-backed 闭环稳定后，再决定是否以同一 runtime contract 接入 DSH provider/Session/tool/
approval seam，形成 Codex-inspired backend。先写 parity contract 与端到端测试，再实现 adapter；
不得以“自主可控”为理由建立第二套 Session/Subagent/Task/usage/PTY/compaction 内核。

### 5. 暂缓产品面

- Traffic Board：未来按统一 provider proxy/control plane 立项，覆盖 provider/model/account pool、
  routing、request logs、quota/usage 与控制；
- Task Board：未来按本地项目/Issue 看板立项，并与权威任务、conversation、branch/worktree 关联；
- Browser integration：Paused；
- Cloud/Remote/PR、Side Chat、Workspace DAG/merge-back：继续等待独立 owner/seam 决策。

这些能力都不阻塞近期的 Codex-backed self-development loop，也不得顺手捆入 compatibility
spike。

## 上游同步与防分叉

- 以 tag/release 和运行时 source/API diff 为依据，不按 proposed note 猜 API 或排期。
- Aezy adapter 必须能随 bundle/profile patch 被关闭，不拥有与 DSH 重复的 durable truth。
- 公开 seam 无法承载且已有真实端到端失败证据时，先记录 compatibility issue；仍不得通过
  相对源码导入绕开。
- 上游发布重叠能力后，优先删除/禁用 Aezy 薄 adapter 并迁移权威事实源。
- 完成切片的细节只更新 milestone；HANDOFF 只更新当前状态，本路线只更新所有权和顺序。
