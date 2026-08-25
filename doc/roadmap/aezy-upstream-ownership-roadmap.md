# Aezy 上游边界与实施路线图

> 活动路线文档，更新于 2026-08-25。已完成切片的详细实现和验证只在
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

- Aezy 运行并签收于 `dsh-v0.1.1-rc.1`；2026-08-25 最后检查的最新 tag 是 rc.2。
- rc.1/rc.2 已有 credentials/authorization、Session projection、Subagent lineage、PTY、
  Job、MCP/ACP、compaction 和 Web layout 等基础 seam，但不等于完整 Aezy 产品面。
- rc.2 仍没有 generic panel router、browser raw TTY/resize 或 Interactive Side Sessions
  merge-back 产品实现。
- proposed note 是避免重复造内核的信号，不是交付日期承诺：
  - [Task Surface](../../.local/deepseek-harness/.agents/notes/proposed/feature/2026-08-04-task-surface.zh.md)
  - [Interactive Side Sessions](../../.local/deepseek-harness/.agents/notes/proposed/feature/2026-07-08-interactive-side-sessions.md)
  - [Recallable Compaction](../../.local/deepseek-harness/.agents/notes/proposed/feature/2026-07-06-recallable-compaction.md)

版本变化与签收见 [`dsh-0.1.1-rc1-impact.md`](../reference/dsh-0.1.1-rc1-impact.md)。

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
| Activity / Status / Usage / Notifications | Aezy 薄 dashboard | 汇总 Session、Job、Subagent、approval、trajectory、terminal、usage | 第二套 Task runtime、usage ledger、通知状态机 |
| Auth / Provider dashboard | Aezy 产品壳 + DSH credentials/authorization | 装配已有 provider/auth seam，做解释和可见性 | 自建 OAuth、refresh、credential store 内核 |
| Browser interaction | Aezy 后续产品域 | localhost browser、screenshot、click/type/scroll 与证据 | 在本地 coding loop 前扩成通用 Computer Use |
| Subagent / Job / Task Surface | DSH owner，Aezy 薄投影 | 显示 lineage、状态、控制入口 | 第二套 Subagent/Job/Task 持久状态机 |
| Side Sessions / merge-back | 等待 DSH | 未来复用 fork/merge-back seam | 平行 Session 内核和私有 merge event/store |
| Compaction / recall | DSH owner | 展示 token/context 压力，消费公开 history seam | 第二套摘要、历史索引、`history_read/search` |
| MCP/ACP transport | DSH owner | 配置、权限入口、状态展示 | fork transport/reconnect/rich-content mapping |
| Desktop multi-runtime | Aezy Desktop 产品域 | 一个 Desktop 管理多 Workspace；每个绑定独立 Runtime adapter | 把 Windows/WSL/SSH/Docker 差异塞入 Session 内核 |
| Workspace DAG / branch merge | Aezy 导航产品面 + 上游 lineage/merge seam | 可视化 Session/Worktree/Handoff 关系 | 在 merge-back seam 成熟前建立私有 DAG 持久协议 |
| Issue board | Aezy 产品面，等待 Task facts | 基于权威 Task/Issue facts 做 board 投影 | 用 UI 卡片另建第二套 Task truth |

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
| Activity / Status / Usage / Notifications | Complete | [`activity.md`](../milestones/activity.md) |

## 接下来

### 1. Localhost Browser + browser interaction

在本地前端任务中提供页面启动/发现、截图、click/type/scroll 和可审计证据。先服务 Aezy
coding loop，不捆绑远程桌面、通用 Computer Use 或 Cloud browser fleet。

### 2. 后续特色产品面

以下方向分别立项，不与 Browser 切片捆绑：

- Auth / provider / agent / log / usage 综合 dashboard；
- 基于 DSH provider/agent-loop seam 的 Codex、Claude、OpenCode harness adapter；
- Aezy Desktop 多 Workspace、多 Runtime（Windows、WSL、SSH、Docker、远程开发）；
- Workspace DAG 导航与 branch/merge 可视化；
- Issue board。

每项开工前必须先写 owner/seam 决策。尤其 unified harness loop、DAG merge 和 issue board
不能通过复制 DSH Session/Subagent/Task 状态机来换取短期 UI 完成度。

## 上游同步与防分叉

- 以 tag/release 和运行时 source/API diff 为依据，不按 proposed note 猜 API 或排期。
- Aezy adapter 必须能随 bundle/profile patch 被关闭，不拥有与 DSH 重复的 durable truth。
- 公开 seam 无法承载且已有真实端到端失败证据时，先记录 compatibility issue；仍不得通过
  相对源码导入绕开。
- 上游发布重叠能力后，优先删除/禁用 Aezy 薄 adapter 并迁移权威事实源。
- 完成切片的细节只更新 milestone；HANDOFF 只更新当前状态，本路线只更新所有权和顺序。
