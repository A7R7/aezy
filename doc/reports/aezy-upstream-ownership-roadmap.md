# Aezy 上游等待边界与实施路线图

## 决策摘要

截至 2026-08-24，Aezy 运行基线为已验证的 `dsh-v0.1.1-rc.1`，M4.1B 开工复核时最新公开 tag 仍为
`dsh-v0.1.1-rc.2`。rc.2 主要交付统一 image/attachment 管线、DeepSeek Files API
和权限默认值修正，没有新增 Worktree/Handoff；因此 M3 所有权不变，升级不夹带在
M3 中；rc.2 也没有新增 generic/additive details panel router。M4.1A desktop 按
docked 产品要求使用公开 `details` single slot，narrow 通过 `shell.overlay` seam
降级；shadow Tool Details 是迁移到未来 panel router 前的明确兼容性代价。后续工作
继续分成两条明确轨道：

1. **Aezy 立即实现的产品域**：DSH 没有公开近期落地信号、又直接阻塞本地编程闭环的能力，通过参考树外的 plugin、bundle、profile patch、adapter 或应用实现。
2. **等待 DSH 或只做薄集成的内核域**：DSH 已有 seam、实现、roadmap 文字或详细 proposed note 的能力，不在 Aezy 中复制第二套状态机、协议或生命周期；当前版本只做启停、配置、状态透传和必要的 Web 装配。

因此，近期唯一正确的起点是先建立最小 `aezy-base` / `aezy-web` 外置 composition，并用当前真实 DSH profile dogfood。第一个产品垂直切片固定为 **Project / Repository / Local Environment + Git status/diff + turn-scoped change ledger + 安全 revert**；随后依次实现 **Approval Rules + Network Policy** 和 **Worktree + Handoff**。

rc.8 已交付 `@file/@session`、Windows 持久 PowerShell、可安装 Product Subagent bundle 和多项 Session 能力；0.1.1-rc.1 又补充 credential record/authorization flow、Subagent lineage header、Session projection 正确性、Web index injection、DeepSeek vision 和 bwrap PID 隔离。Aezy 对这些能力只做薄接入；文件树、用户终端 UI、Activity 和 Browser 仍按真实 dogfood 痛点推进。Task Surface、Interactive Side Sessions、Recallable Compaction、Subagent/Job 内核、PTY backend 和 MCP/ACP transport 仍不进入 Aezy 的近期重型实现计划。增量复盘见 [0.1.1-rc.1 更新与影响报告](dsh-0.1.1-rc1-update-impact-report.md)。

## 上游信号的解释边界

2026-08-21 上游发布 `dsh-v0.1.1-rc.1`（`528c682e`）。它相对 rc.8 有 172 个 commit 和 2,368 个变更文件，但大部分路径属于 Agent Notes、双语文档、站点生成物和统一版本更新；后续判断继续以 tag/release 与运行时 source diff 为准，不能仅凭总文件数推断功能规模。仍应遵守：

- package README 中的 roadmap 文字只表示设计方向，不是版本承诺；
- `.agents/notes/proposed/` 中的 Agent Note 是实现信号，不是排期承诺；
- “最可能在下一到两个 RC 完善”只用于避免 Aezy 抢先复制内核，不用于依赖一个确定发布日期；
- 每个 Aezy 里程碑开始时重新检查 upstream；没有新版本就继续按本路线推进 Aezy 自有产品域，不因等待上游而停工。

此前预测的“已有 seam 最后一公里”继续部分命中：0.1.1-rc.1 实际集中在 credentials/authorization、Subagent header、Session projection 和 Web 细节；PTY、MCP/ACP、compaction、Task Surface、Side Session 与 recall 没有新的运行时落地。这个结果强化了“不抢写已有 seam 内核”的策略，但不构成对下一个 RC 的新承诺。

三个 proposed 方向有比普通 backlog 更强的设计信号，但仍不得当作承诺：

- [Task Surface](../../.local/deepseek-harness/.agents/notes/proposed/feature/2026-08-04-task-surface.zh.md) 已定义协议、持久化、Host/Client 边界和三阶段交付计划，是最成熟的 proposed 产品面。
- [Interactive Side Sessions](../../.local/deepseek-harness/.agents/notes/proposed/feature/2026-07-08-interactive-side-sessions.md) 已有 fork、隔离、多轮对话和 merge-back spike，适合等待上游沿 Session 语义实现。
- [Recallable Compaction](../../.local/deepseek-harness/.agents/notes/proposed/feature/2026-07-06-recallable-compaction.md) 已定义 checkpoint split、`history_read`、`history_search`、回放与缓存约定，属于 Session/compaction 内核，不应由 Aezy 另建历史系统。

## 能力所有权矩阵

| 能力域 | 当前策略 | Aezy 当前允许做什么 | Aezy 当前不做什么 | 重新评估触发器 |
|---|---|---|---|---|
| `aezy-base` / `aezy-web` bundle、profile patch | **立即实现** | 使用 `dsh plugin`、installable profile bundle 和 `cordis.patch.yml` 建立最小 composition；默认禁用非核心组件 | 不修改 DSH package，不创建第二种插件安装格式 | 当前里程碑立即开始 |
| Aezy 品牌 slot occupant | **rc.8 后立即补足** | 外置 `@aezy/brand` 占据 sidebar/conversation 品牌 slot，并禁用 `ui-brand-official` | 不修改上游品牌包，不复用 “DeepSeek Harness” 商标作为 Aezy 产品名 | rc.8 基线提交后 |
| Project / Repository / Local Environment | **立即实现** | 建立 Aezy 产品实体，统一 Session、cwd、Git、shell、sandbox 的环境归属 | 不提前抽象 Cloud/SSH provider | M1 完成后根据 Worktree 需求扩展 |
| Git status/diff 与 branch identity | **立即实现** | Host 侧结构化 Git read model、稳定 DTO、Web Changes/Diff UI | 不把 Agent 的 `git` 文本输出当产品事实源，不先做 PR | M1 端到端验收 |
| Turn File Change Journal、安全 revert 与 Turn 后文件摘要 | **基础层已修复** | 通过公开 `tools/execute` 记录 Git-independent structured `write/edit` before/after；Git 可选补充 repository snapshot、fingerprint、rename/binary、concurrent 与 safe Undo/Redo；非 Git shell-only 标记 partial/unobserved | 不修改 DSH SessionEvent/文件工具内核；不解析 shell 猜测副作用；不为 Turn 中途 `git init` 补造 baseline 或 safe Undo | 新结构化文件 mutation seam 或第二个独立消费者出现时评估拆出 `@aezy/turn-journal` |
| Approval Rules | **立即实现，位于 M2** | 在现有 one-shot approval 外增加 Aezy 规则存储、匹配解释、查看和撤销 | 不改写 DSH approval seam，不做自动 reviewer | M1 稳定后 |
| Network Policy | **立即实现，位于 M2** | 对 Aezy 管理的 shell/provider/external tool 建立独立 deny/ask/allow 与审计 | 不声称仅靠文件 sandbox 已限制网络 | M1 稳定后 |
| Worktree / Local Handoff | **立即实现，位于 M3** | 基于 Repository/Environment 与 Git 状态建立创建、清理、绑定和可审计 handoff | 不先于 M1/M2；不让并行 Agent 共享 checkout 后再补隔离 | M2 安全策略完成后 |
| 上游 `@file/@session` reference | **rc.8 已交付，Aezy 薄集成** | 使用上游 Host index、Remote 和 Web source；验证 Aezy profile 中可用 | 不另建文件索引、Session mention 或引用准备协议 | 上游 seam 无法承载真实引用用例 |
| Review + Files Project Panel | **M4.1A/B 已实现** | 复用 `@aezy/project` Git/Turn ledger；desktop 占用公开 `details`，narrow 使用 `shell.overlay`；提供 structured Review、多开 accordion、lazy file tree，以及复用 DSH `ReadBlock` / `MarkdownText` 的 code/Markdown/image Preview | 当前已知代价是 shadow Tool Details；不复制 layout/Markdown/highlight/file-index 内核，不做 editor/stage/hunk apply/PR/Side Session | 上游新增通用 panel router 或 file-preview surface 时优先迁移并恢复多 occupant |
| `@directory` / `@diff` + Contextual Ask | **M4.2 下一步** | 在上游 `@file/@session` reference seam 上补目录/diff reference 与当前 Session ask；复用 M4.1 Project Panel 的 path/source identity | 不重复 `@file/@session`，不一次构建完整 IDE，不建立 Side Session 状态机 | M4.2 浏览器和模型 dogfood 后进入下一工作台痛点 |
| 用户 Integrated Terminal UI | **dogfood 驱动；复用 rc.8 backend** | 未来在 Aezy Web 增加用户 PTY tabs、cwd/environment 绑定；当前继续用 shell/job | 不 fork PTY/Windows persistent PowerShell，不重写 job/terminal lifecycle | 真实交互命令阻塞 M1-M3 |
| Activity / Status / Usage / Notifications | **薄投影后按痛点增强** | 汇总现有 Session、Job、Subagent、approval、trajectory 投影 | 不另建 Task runtime 或第二套状态机 | 状态不可见开始阻塞多任务 dogfood |
| Browser automation | **后续 Aezy 产品能力** | 前端 dogfood 成为主要场景后实现 localhost、screenshot、click/type/scroll | 不阻塞本地通用 coding loop；不先扩展到 Computer Use | 前端任务无法仅靠 shell/test 验收 |
| Profile bundle / plugin settings / credential authorization | **上游继续交付，Aezy 薄封装** | 提供 Aezy 默认 bundle、必要配置和兼容性检查；消费上游 credential/authorization seam | 不另建插件市场、安装器、OAuth/refresh 协议或凭据存储内核 | 当前接口确实阻塞 Aezy bundle/onboarding |
| Subagent + Job、Experimental Agent Teams、Task Surface | **上游薄集成；Task Surface 继续等待** | 保留当前 subagent/job；复用 rc.1 lineage header；Agent Teams 保持实验禁用 | 不创建第二套 Task Surface；不把共享 checkout 的 Agent Teams 当作 Worktree 隔离 | Task Surface 转 implemented；或缺口阻塞 M3 |
| Interactive Side Sessions / merge-back | **等待上游** | 暂用现有 fork/subagent，必要时只做无新持久协议的轻入口 | 不实现平行 Session 内核、merge-back 事件体系或专用存储 | proposed note 转 implemented 或产品需求成为 P0 |
| Compaction / recall / Session projection | **等待上游** | 使用现有 compaction、token meter、history paging；可薄展示压力 | 不实现第二套摘要、`history_read`/`history_search`、日志索引或 Session projection | 新 RC；或长任务 dogfood 出现可复现数据丢失 |
| PTY/persistent shell backend | **rc.8 已补 Windows 持久 PowerShell，Aezy 薄集成** | 复用 terminal seam/provider；真实 Windows 验证后用 preset patch 启用 | 不 fork backend，不自行补 ConPTY | 用户终端 UI 需要新的公开 seam |
| MCP/ACP rich content、transport、reconnect | **rc.8 部分进展，继续等待/薄配置** | 需要时挂载现有 client/server，并加最小 Aezy 权限入口 | 不 fork transport、rich-content mapping、重连状态机或协议 | 真实 MCP 用例无法通过现有 seam 完成 |
| Automations / Cloud / Remote / PR | **长期后续** | 保留扩展点和环境类型空间 | 不用 Schedule/E2B/shell/`gh` POC 冒充完整产品闭环 | 本地 M1-M4 稳定且出现明确用例 |

## “remove repository plugin”的正确解释

上游 2026-08-09 的 [移除专用 repository 插件路径](../../.local/deepseek-harness/.agents/notes/implemented/simplification/2026-08-09-remove-repository-plugin.zh.md) 删除的是一条与 profile composition bundle 重复的第三方插件分发路径：`.dsh-plugin` 格式、专用 repository cache、包装层和准备流程。

它没有删除、实现或否定 Git repository 产品域。相反，该决策明确把唯一外部扩展路线收敛为：

```text
dsh plugin --profile <name> add <package-or-git-spec>
    → installable profile bundle
    → dsh.bundle.patch
    → ordered cordis.patch.yml
    → ordinary Cordis plugins
```

因此 Aezy 应把自身作为可安装 profile bundle 和外置 Cordis 插件交付；Project/Repository/Environment 中的 “Repository” 是代码工作区与 Git 产品实体，与已删除的 “repository plugin distribution path” 没有语义关系。

## 重排后的实施里程碑

### M0：外置 composition 与真实 profile dogfood

**状态：Complete（2026-08-20）。**

交付：

- 在参考树外建立最小 `aezy-base`、`aezy-web` 和 profile patch；
- 只依赖发布包和公开 extension interfaces；
- 通过 patch 禁用 telemetry/feedback、动态 Cordis self-modification、Workflow/Ralph、Schedule、E2B、外部 subagent/hook 等非核心行；
- 用真实 DSH Host/Web 跑通 workspace、Session create/resume、queue/steer、文件读改、shell/job、approval、trajectory；
- 固定 DSH revision 与 Aezy compatibility metadata。

完成门槛：Aezy 自己通过该 profile 完成并验证一个真实小改动；没有 mock runtime，没有参考树源码导入，没有 `.local/deepseek-harness/` 修改。

### M1：Workspace & Changes——第一个产品垂直切片

**状态：Complete（2026-08-21 rc.1 复验）。** 真实 rc.8 模型跨文件 Turn、Changes UI diff、部分撤销、刷新恢复和 Undo 已按 [M1 签收记录](../milestones/m1.md) 完成；0.1.1-rc.1 的自动、真实 profile 和 HTTP 回归均通过。后续 M3 也已完成，当前主里程碑是 M4。

交付：

- Project / Repository / Local Environment 最小模型；
- Session 与权威 Local Environment 绑定；
- Git repository discovery、branch/HEAD、staged/unstaged/untracked/conflict status；
- repository/file/overall diff；
- turn-scoped file-change ledger；
- 安全单文件 revert、receipt Undo 与冲突拒绝；
- Web repo header、Changes 列表和 diff view。

完成门槛：Aezy 在自身仓库中完成跨文件修改、真实 build/test、查看逐文件 diff、撤销其中一部分、刷新/恢复 Session 后保持一致，并能确认只读参考树未变化。

M1 不包含 stage/commit/push/PR、Worktree、完整文件树、用户 PTY、通用 Task Surface 或新的 Session 内核。

### M2：可持续自治的权限边界

**状态：Complete（2026-08-20）。** 外置 `@aezy/security` 已完成持久规则、global/repository Network Policy、Security Web view、匹配解释、审计、restart persistence 与真实模型 deny dogfood；详见 [M2 签收记录](../milestones/m2.md)。后续 M3 已复用该审计边界并完成，当前主里程碑是 M4。

交付：

- command/tool 规则的持久允许、一次允许、拒绝；
- 规则作用域、匹配解释、列表和撤销；
- 独立 Network Policy；
- 规则命中与 escalation 的审计投影；
- 对 M1 Git write/revert 和环境操作使用同一权限边界。

完成门槛：常见 build/test/package-manager 流程能够依规则运行，未授权命令和网络仍 fail closed，用户能明确知道一次操作为什么被允许或拒绝。

### M3：Worktree 与 Handoff

**状态：Complete（2026-08-21）。** 外置 `@aezy/project` 已交付受管 Worktree
identity/lifecycle、真实 DSH Workspace/Session 绑定、结构化 handoff、M2 audit 与
fail-closed cleanup；自动、真实 rc.1 HTTP 和 Aezy 自仓库模型 dogfood 均通过。
详见 [M3 签收记录](../milestones/m3.md)。下一主里程碑是 M4。

交付：

- Worktree environment 创建、绑定、状态和安全清理；
- branch/base 与 worktree identity；
- Local → Worktree、Worktree → Local 的可审计 handoff；
- dirty/conflict/protected-branch 拒绝路径；
- Session/Subagent 的 environment isolation。

完成门槛：两个真实并行任务在不同 worktree 修改相邻代码而不共享 checkout，并能将一个任务安全 handoff 回 Local。完成 M3 前不扩大并行 Agent 的默认并发。

### M4：按 dogfood 痛点逐项补工作台入口

**Turn File Change Journal 基础层修复：Complete（2026-08-24）。** 非 Git workspace
通过公开 `tools/execute` 记录 structured `write/edit` snapshot，Git 成为可选 enrichment；
Turn 中途 `git init`、shell-only partial、真实 rc.1 HTTP 与 Git/非 Git模型 dogfood 已
签收，详见 [Turn Journal 基础层修复](../milestones/turn-journal.md)。

**M4.1A Modern Review Side Panel：Complete（2026-08-22，docked/accordion 复验
2026-08-23）。** Turn card 已移除 inline raw diff；Working/Historical structured
DTO、纵向多开 accordion、逐文件独立 lazy load、desktop docked details、narrow overlay、theme、
真实 rc.1 Host、模型 dogfood 与浏览器 QA 均已签收，
详见 [M4.1A 签收记录](../milestones/m4.md)。
2026-08-24 follow-up 又将 Turn/Review 收敛到 Aezy semantic ChangeSurface、32px file row
与文件类型图标，并移除可见 snapshot id、重复 Turn part 和 raw hunk header；这只是
M4.1A 视觉语义收敛，不改变 ledger 或 Undo/Redo。

**M4.1B File Tree + Preview：Complete（2026-08-24）。** 同一 Session-scoped Project
Panel 已增加逐目录 lazy tree、bounded code/Markdown/image Preview，并让
Changes/Turn/Handoff changed files 跳转；代码/Markdown renderer 直接复用发布版 DSH
`ReadBlock` / `MarkdownText`，Host path containment、`.git`/symlink 拒绝、输出硬上限、
AbortController identity fence、真实 rc.1 HTTP/模型/browser QA 均已签收，详见
[M4.1B 签收记录](../milestones/m4.md)。

后续项不是一个捆绑交付，固定顺序如下：

1. **M4.2** 在上游 `@file/@session` 之上补 `@directory` / `@diff`，以及当前
   Session 内 Contextual Ask；
2. 用户 Integrated Terminal UI；
3. Activity / Status / Usage / Notifications；
4. localhost Browser + browser interaction。

真正 Side Chat 继续等待 DSH Interactive Side Sessions/fork/merge-back 公开 seam；
Aezy 不建立第二套持久会话状态机。

每项都必须复用 DSH 现有 Host/Client slot、Session projection 和 provider seam；如果需要改写 PTY、Task、Session、MCP 或 compaction 内核，则暂停并先重新检查 upstream。

### M5：本地闭环之后的扩展产品面

在 M0-M4 形成稳定 dogfood 后，才评估 Git stage/commit/branch UX、Code Review、MCP 管理、PR、Automations、Cloud、Remote、Computer Use 和 Desktop shell。现有 Schedule、E2B 或 shell/`gh` 只能作为 POC 证据，不能直接获得完整产品能力标签。

## 上游同步与防分叉规则

- 每个里程碑开始前检查公开 upstream commit/tag/release，并把结果记录到 compatibility metadata；不根据 proposed note 预测 API。
- 对等待上游的能力，Aezy adapter 必须能随 bundle/profile patch 被关闭，不拥有与 DSH 重复的持久数据。
- 只在公开 seam 确实无法承载 M1-M3，且有端到端失败证据时，记录 compatibility issue；不通过相对源码导入绕开 seam。
- 上游发布重叠能力时，优先删除或禁用 Aezy 的薄 adapter，迁移到上游事实源；任何重型 Aezy 产品域都应以 Project/Environment/Git 等上游缺失边界为限。
- 没有新 upstream 不构成阻塞：Aezy 继续实现自己拥有的 M0-M4，不等待未承诺的版本。
