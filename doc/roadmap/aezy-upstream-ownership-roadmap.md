# Aezy 上游边界与实施路线图

> 活动路线文档，更新于 2026-09-02。已完成切片的详细实现和验证只在
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

- 主线历史签收于 `dsh-v0.1.1-rc.2`；`alpha` 已 fast-forward 合入当前 `main`，开发线只面向 immutable prerelease
  `dsh-v0.1.2-alpha.4`，不承诺双 runtime 兼容。完整官方 npm family 已发布；242 个公开 DSH package
  使用同一精确版本并逐项锁定 registry integrity。alpha.1/alpha.3 artifacts 只保留为历史证据，
  不再是 selector 路径。开发线继续使用独立 DSH_HOME/profile/3091；产品可点击 parity gate 不因
  branch merge 而降低。
- alpha.1 开始让 shipped presets 由 `dsh-agent-presets` 自己持有并默认优先，正式将 `code` id 改为
  `ptc`，增加 durable preset/tool-change 与 model-selection projection；这为 Aezy 增加
  `codex-app-server` system preset 提供了更直接的公开 seam。
- alpha.3 保留 Agent/LLM/tool hooks、shipped standard preset、Inspector eventSource 与
  AppFrame/details seam，但把 Agent/usage/Subagent 等 Host state 更彻底地收口到 mandatory Session
  projections，并让 unary Remote 收敛到 `RemoteResult`/`RemoteError`。迁移不得用 compatibility
  shim 复刻旧 client wrapper、Session 投影或内核。
- alpha.4 分离 Session event sequence 与 log offset，移除 `session.events` getter 并公开
  `snapshotEvents()`；Subagent followup/report 收敛到相邻 `send_message`，PTC 不再装 workflow。
  Aezy 已直接迁移三个只读 Session consumer，没有保留 alpha.3 shim 或复制任何 owner 内核。
- Models provider-card slots 可承载 Codex managed account UI，exact per-turn usage 可交还上游；
  但 model catalog 仍是 Host-wide，没有 per-preset filter，experimental Agent Team 也不是 Task
  Board。
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

版本变化与签收见 [`dsh-0.1.1-rc1-impact.md`](../reference/dsh-0.1.1-rc1-impact.md) 与
[`dsh-0.1.1-rc2-impact.md`](../reference/dsh-0.1.1-rc2-impact.md)；最新 reference 差异、
publication gate 与路线影响见
[`dsh-0.1.2-alpha1-impact.md`](../reference/dsh-0.1.2-alpha1-impact.md)。
当前 runtime migration 证据见
[`dsh-0.1.2-alpha4-impact.md`](../reference/dsh-0.1.2-alpha4-impact.md)。

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
| Loop Inspector | Aezy 只读 observability layer；backend/DSH events 是 truth | static backend blueprint + runtime overlay、provenance、evidence timeline、restart rebuild | 驱动 loop；复制 event/usage store；展示 reasoning/secret/raw arguments |
| Custom Agent Workflow Editor | Aezy macro workflow 产品面 + DSH/backend runtime owner | immutable declarative definition、validator/capability resolver、preset/workflow compiler | 编辑或复制 model→tool→approval→result micro-loop；执行任意代码；扩大权限 |
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
| Codex-backed self-development loop | Complete | [`codex.md`](../milestones/codex.md) |
| Agent modes / Codex App Server preset | Complete on alpha candidate | [`mode-presets.md`](../milestones/mode-presets.md) |
| DSH-native Codex provider | Complete on alpha candidate | [`native-provider.md`](../milestones/native-provider.md) |
| E0 / CI.0 Loop Inspector | Corrected candidate: pending product acceptance | [`loop-inspector.md`](../milestones/loop-inspector.md) |

## 路线纠偏记录

Activity dashboard 的 `eae530ddcb`、`4d187252b0`、`d77430c012` 没有满足统一 Traffic Board
或 Task Board 的产品目标，已分别由 `4428fc8037`、`2cb30ba1ab`、`b89422ddc0` 独立 revert。
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

### 0.5. alpha.1 → alpha.3 official npm migration（Complete）

244-package 官方 npm family、逐包 SHA-512、隔离 `/tmp` DSH_HOME/profile/3193、composition/Web/
Workspace/Session/modes/native owner/RemoteError/history/Codex App Server/revision 1/Inspector/restart
均已签收，随后才提升 3091 开发 profile。`.local` 仍是未修改的 alpha.1 historical reference；
runtime 只消费 alpha.3 registry artifacts。完整证据见
[`dsh-0.1.2-alpha3-impact.md`](../reference/dsh-0.1.2-alpha3-impact.md)。

### 0.6. alpha.3 → alpha.4 official npm migration（Complete）

242-package 公开官方 npm family、逐包 SHA-512、隔离 `/tmp` DSH_HOME/profile/3294、正式 3091
composition/Web/Workspace/Session/modes/native owner/RemoteError/history/Codex App Server/revision 1/
Inspector seam/governed write/restart 均已签收。首次真实 write 暴露的 `session.events` API 断点已
直接迁到 `snapshotEvents()`，未保留双 runtime 层。完整证据见
[`dsh-0.1.2-alpha4-impact.md`](../reference/dsh-0.1.2-alpha4-impact.md)。

### 1. Relay Codex companion gate（Complete：硬约束失败）

已在隔离 profile 验证 `relay-dsh-plugin-codex@0.1.2`。ChatGPT managed auth 复用、account/
rate/usage、streamed Turn、连续对话、重启 resume 和 cancel 通过；但真实 Luna/Sol Turn 都没有
形成结构化 DSH tool/call/result 或 approval round-trip，Sol 还在跨模型 continuation 上出现
`invalid_encrypted_content`。Relay 也没有 Aezy 内 managed login/logout 产品入口，binding store
默认逃逸 `DSH_HOME`。因此不安装到主 profile。完整证据见
[`relay-dsh-plugin-codex-0.1.2-compatibility.md`](../reference/relay-dsh-plugin-codex-0.1.2-compatibility.md)。

### 2. 最小官方 app-server adapter spike（Complete）

`@aezy/codex` process/protocol client、Host account API 与 Settings 产品面已经进入
Aezy profile；真实 `gpt-5.6-sol` structured `commandExecution` 已通过，managed ChatGPT
browser/device login、logout、account/plan/rate limits/usage/model discovery 均由官方 App Server
托管并在 3090 验证，analytics 默认关闭，Aezy 不接收或返回 token。`aezy-codex` provider 的
DSH Session↔Codex Thread/Turn、stream、cancel、restart-resume 已完成；官方 dynamic tool seam
把所有可变操作送回 DSH tools/Security/approval，Codex 原生权限固定 read-only 且提权
fail-closed。真实 command projection、write→Journal、Security deny/audit 与 approval
`allowed-once` 均已通过。Aezy 自身仓库的完整 self-development dogfood 也已签收。

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

### 3. Codex-backed Aezy 产品闭环（Complete）

模型/推理选择、登录状态、composer、streaming transcript、tool/diff 事实、approval、stop/resume
与 usage 已通过现有 DSH/Aezy 产品面连接。受管 Worktree 已对 Aezy 自身执行真实改动、失败
恢复、18/18 测试、Journal/Review、Handoff、Host restart 与同一 Thread continuation；首笔
自开发提交为 `36871adfe5`。完整证据见 [`codex.md`](../milestones/codex.md)。这一闭环继续复用
当前 Project/Review/Terminal/Security 能力，没有增加平行 UI 或重构已签收切片。

完成门槛不是静态 UI，而是 Aezy 能打开本仓库、通过 managed ChatGPT 登录执行真实 Turn、修改外置 Aezy
代码、运行相关测试、审阅 diff、重启 Host，并在同一开发任务上继续工作。达到该门槛才可称为
“可自迭代”的最小替代品；该门槛现已达到。

### 4. Alpha native provider gate（Complete）

DSH alpha.4 已原生持有 `llm-pi-ai/openai-codex` catalog、Responses transport、OAuth
grant/refresh 与 credential store。Aezy 已用外置 base patch 薄启用该 owner，并在真实 3091
证明 `standard` Session 可选择并持久化 native Codex model，同时保持默认 DeepSeek route 和
`codex-app-server`/`aezy-codex` 隔离。

DSH-owned OAuth 已完成，真实 `standard` Turn、structured tool、Remote approval waterfall、Security
audit、Journal/Review、usage 与 restart-resume 均通过。Node 24 env-proxy 与 alpha.4
`/api/remote.mux` `$events` contract 已固化为回归门禁。它现在可日常 dogfood；证据见
[`native-provider.md`](../milestones/native-provider.md)。

这里完成的是 DSH 原生 agent loop 使用 OpenAI/Codex model，不是 Codex-inspired loop。后者若
立项，仍作为同一 runtime contract 的独立 backend，并在 parity gate 通过前保持不可点击。

### 5. E0 / CI.0：只读 Loop Inspector（Corrected candidate）

`@aezy/inspector` 已固定最小 `LoopTrace/Span/SourceRef` runtime evidence contract，并通过 Session
header 与 timeline 消费 DSH cold history/live `eventSource`。既有 Graph 直接重排同一组 span，
本质仍是调用日志，不能解释 backend 的静态控制流，因此不能作为 E0 完成证据。

纠正后的 E0 已以 backend-specific 静态 blueprint 为主体：明确 node、edge、guard、owner、SourceRef
与 opaque boundary；runtime trace 只投影 active/visited/count/usage/duration overlay。DSH-native 图
以固定上游 agent-loop/tool/approval/retry/compaction/Subagent contract 为权威；Codex App Server 只画
公开协议和 Aezy/DSH bridge，私有 agent core 必须是 opaque 节点，不能推测内部步骤。Timeline 继续
显示实际 occurrence，不再另设与它同源同构的 runtime Graph。实现与真实 restart gate 已通过，
但在产品验收前不恢复 E0 Complete。

当前 App Server adapter 只为部分 tool activity 持久保存 `threadId/turnId/itemId`；没有 durable
correlation 的 App-specific span 必须保持 `partial/unavailable`，不能猜测为权威事实。E0 先证明
`standard` DSH-native 与 `codex-app-server` 两条 backend 的 live/cold/restart accuracy，并以 pure
fixtures 验证并行/nested span、usage、approval、compaction/Subagent 与脱敏安全；App Server 缺失
durable usage 时明确保持 partial。完整签收见 [`loop-inspector.md`](../milestones/loop-inspector.md)，
详细路线见
[`loop-inspector-workflow-editor.md`](loop-inspector-workflow-editor.md)。

alpha.4 runtime migration 与 main smoke 已作为独立 commit 通过；完整 codex-inspired parity
仍是进入可点击产品面的 release gate，不能因为 branch merge 或既有 runtime trace gates 已通过而
降低或跳过。

### 6. E1–E3：声明式 workflow 与可选 Codex-inspired backend（E1 parity in progress）

旧 E1–E3 实现已由后续 revert 提交撤回，原始提交完整保留供历史追溯。E0.1 revision 3 可读后，
E1 已按新边界重新开始：外置 `@aezy/workflow` 提供内部、不可点击、不可执行任意代码的
versioned/immutable LoopDefinition，让 `codex-inspired` 作为第一个 system-authored dogfood；
revision 1 已通过真实 DSH-native Turn 与 restart 后同 Session continuation，但完整 parity pending。
alpha.3 migration 已独立完成并再次证明 exact revision 1 Turn/restart，随后 fast-forward 合入
`main`。独立 governed write vertical slice 已证明 exact preset 下的 Security ask、Remote
allowed-once、durable structured write、Journal/Review 与 usage；其提交不得与 runtime upgrade
混合。alpha.4 migration 又以未修改的 revision 1 重复该 write gate，并只迁移公开 Session read
seam；其余 parity 继续按独立、精确切片推进。
E2 仍暂停，未来才考虑模板式 Editor；E3 仍暂停，之后才增加
structured condition、parallel、Subagent 与 bounded retry。外置 node plugin SDK 不在当前实施
范围内，也不为它预留抽象。

Session 必须绑定 exact definition revision + digest，运行中不得热改；backend/model capability
不满足时 fail-closed。`codex-inspired` 在 Session/tool/approval/Security/Journal/usage/cancel/
compaction/Subagent/restart 与 Inspector parity gate 全部通过前保持不可点击。DSH/Codex backend
继续持有 micro-loop 和 runtime truth，Aezy 不建立第二套 Session/Subagent/Task/usage/PTY/
compaction/approval 内核。

近期 hardening 仍只按真实 dogfood 故障补强 Worktree dependency bootstrap 和固定版本 App Server
contract，不为未来 Editor 提前泛化已签收切片。

### 7. 暂缓产品面

- Traffic Board：未来按统一 provider proxy/control plane 立项，覆盖 provider/model/account pool、
  routing、request logs、quota/usage 与控制；
- Task Board：未来按本地项目/Issue 看板立项，并与权威任务、conversation、branch/worktree 关联；
- Browser integration：Paused；
- Cloud/Remote/PR、Side Chat、Workspace DAG/merge-back：继续等待独立 owner/seam 决策。

这些能力都不是已完成 Codex-backed self-development loop 的组成部分，也不得顺手捆入
compatibility hardening。

## 上游同步与防分叉

- 以 tag/release 和运行时 source/API diff 为依据，不按 proposed note 猜 API 或排期。
- Aezy adapter 必须能随 bundle/profile patch 被关闭，不拥有与 DSH 重复的 durable truth。
- 公开 seam 无法承载且已有真实端到端失败证据时，先记录 compatibility issue；仍不得通过
  相对源码导入绕开。
- 上游发布重叠能力后，优先删除/禁用 Aezy 薄 adapter 并迁移权威事实源。
- 完成切片的细节只更新 milestone；HANDOFF 只更新当前状态，本路线只更新所有权和顺序。
