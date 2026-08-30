# Loop Inspector 与 Custom Agent Workflow Editor 路线

> 状态：**E0 / CI.0 Complete；E1 in progress**<br>
> 当前优先级：**E1 internal LoopDefinition**<br>
> 更新日期：2026-08-30

本文定义 Aezy 从只读 Loop Inspector 演进到简易 Custom Agent Workflow Editor 的产品边界、
最小数据契约和分阶段门禁。它不是完成记录，也不授权重构 M0–M4.2、Turn Journal、Terminal、
`standard` 或 `codex-app-server` 已签收实现。

## 1. 产品目标

Loop Inspector 要回答三个问题：当前 Session 的 backend 正在执行哪个宏观阶段、已经发生了
什么、这些结论分别来自哪些权威事件。它采用 **backend-specific blueprint + runtime trace**：

- blueprint 描述某个 backend 可观察到的宏观结构和节点语义，只用于解释与布局；
- runtime trace 由实际事件构成，允许多个同时 active 的 span 和任意层级的 nested span；
- 当前节点、耗时、provider usage、approval、tool、Subagent、compaction 与结束原因只在有证据时
  展示；
- Host restart 后从 durable DSH Session events 重建同一结果，不以浏览器内存或第二日志为真相源；
- 每个事实显式区分 `authoritative`、`derived` 和 `inferred`，且可以追溯到 source reference。

Inspector 是 observability layer，不是 loop driver。它的 adapter、布局或图渲染失败只能让可见性
降级，不能阻塞、取消、重试或改变 Turn。

Custom Agent Workflow Editor 是后续能力。它只编辑宏观 workflow，不编辑、复制或接管底层
`model → tool call → approval → tool result → model` micro-loop。Session、tool protocol、approval、
Security、compaction、Subagent、usage、cancel 与 persistence 始终由 DSH Agent、Codex App Server
或将来注册的 backend 持有。

## 2. 固定所有权与数据流

```text
Editor
  → immutable, versioned LoopDefinition
  → validator + capability resolver
  → DSH preset/workflow compiler
  → DSH Session runtime + registered backend
  → authoritative durable Session events
  → backend-specific trace adapter
  → LoopTrace
  → Inspector
```

箭头上游是控制/执行方向，`authoritative durable Session events → Inspector` 是单向观察方向。
Inspector 不得反向调用 compiler、Agent 或 tool；未来 Editor 的“运行”动作也只能创建一个通过
validator/capability gate 的普通 DSH Session，不能绕过 Session 和 Security owner。

## 3. 当前事件 seam 审计

本节记录 2026-08-30 对固定 DSH `dsh-v0.1.2-alpha.1` 和当前
`@aezy/codex` adapter 的窄范围审计。它是 E0 的起点，不是实现签收。

### 3.1 DSH-native

DSH Session log 是 append-only、lossless JSON、连续 `seq` 的持久真相源。当前公开 Remote/client
链路已经提供：

- cold-safe backwards history page；
- opening snapshot + cursor + gap-free live follow；
- Client Session 的 observable `eventSource`，支持 replace/prepend/append window；
- fail-closed event vocabulary：未知事件不能被旧 runtime 静默解释；
- crash recovery 的 synthetic `tool/result` / `step/end` / `turn/end { interrupted }` closer；
- `assistant/message.usage` 的 provider usage，以及从同一日志纯 fold 的 `sessionStats`。

E0 可直接复用的核心事实包括：

| 观察对象 | 权威 DSH 事实 | 关联键 |
| --- | --- | --- |
| Turn | `turn/start`、`turn/end` | `turn` |
| model step | `step/start`、`request/header`、`request/context`、`assistant/message`、`step/end` | `turn + step` |
| tool | `tool/call`、`tool/result` | `callId` |
| PTC nested dispatch | `tool/code-dispatch-start`、`tool/code-dispatch` | `rootCallId + parentCallId + subCallId` |
| approval | `approval/asked`、`approval/decided` | approval `id`，可选 `callId` |
| compaction | `compaction/start`、`compaction/summary`、`compaction/end` | `compactionId` |
| cancel/failure | `turn/end.reason` | `turn` |
| Subagent | child Session header lineage + `subagent/descriptor` | parent/child Session id |
| preset/model/security state | `agent-preset/selected`、`model/selection`、`permission/preset`、`sandbox/mode`、`approval/policy` | Session `seq` |
| usage | `assistant/message.usage`、`compaction/summary.usage` | event `seq` / `turn + step` |

`assistant/chunk` 可以帮助判定 first-token time，但其 reasoning delta/content 不得进入 Inspector。
已有 `sessionStats` 可用于 Session 总量；单 span usage 仍从对应权威 message/compaction event 读取，
不能把累计值反推成虚假的逐节点精确值。

结论：E0 不建立新的 event bus、history store、usage ledger 或 restart protocol；直接订阅 DSH
Session `eventSource` 并在需要时补齐较早历史页。

### 3.2 Codex App Server

官方 [Codex App Server 文档](https://learn.chatgpt.com/docs/app-server) 定义了 `thread/*`、
`turn/*`、`item/*`、approval request、
`serverRequest/resolved` 与 `thread/tokenUsage/updated` 等运行事实。`turn/started` / `turn/completed`
和 `item/started` / `item/completed` 给出生命周期，其中 completed item 是最终 item 事实；item 类型
覆盖 agent message、reasoning、command execution、file change、dynamic tool、collaboration tool 和
context compaction。

当前 Aezy adapter 已把 App Server 运行接入普通 DSH Turn，并做到：

- DSH Session 与 opaque Codex Thread 的 durable binding；
- Codex Turn start/completion 映射为 DSH provider stream；
- command/file-change/dynamic-tool activity 映射为 DSH `tool/call` / `tool/result`；
- `tool/result.meta.aezyCodex` 对已投影 activity 保存 `threadId`、`turnId`、`itemId` 与类型；
- mutable dynamic tool 回到 DSH tool/Security/approval owner；Codex native escalation fail-closed。

当前缺口也必须如实记录：adapter 没有把所有 App Server `item/started` / `item/completed`、approval
request/resolution、token-usage update 的完整关联身份持久投影为可在 restart 后逐项恢复的 DSH
事实。DSH raw stream 还可能包含 reasoning content，但这不是 Inspector 可展示的数据。

因此 E0 分两层交付：

1. 先用 DSH `turn/step/tool/approval/usage` 事实构建准确的 App Server coarse trace；
2. 对已有 `aezyCodex` source ref 的 activity 显示精确 App item 关联；没有 durable correlation 的
   App-specific node 必须省略或标记 `partial`，不能猜测为 `authoritative`；
3. 只有在公开、外置且可持久化到 DSH Session 的关联 seam 明确后，才补齐更细 App item span。

不得为补齐精度建立独立 App Server event log。固定 DSH build 当前对未知 downstream Session event
类型 fail-closed；在没有注册 seam 时也不得私自发明 `aezy/loop-*` event vocabulary。可选方案必须先
在 E0-A 审计中证明：复用安全的既有 event metadata、增加上游公开 extension seam，或保持该节点
不可用。

## 4. 最小只读 contract

以下是 E0 要固定的语义 contract，不是现在就承诺的公开 SDK。字段必须是 lossless JSON，所有 id
在同一 Session/revision 内稳定；实现可以用 TypeScript discriminated unions 进一步收紧。

```ts
type EvidenceClass = 'authoritative' | 'derived' | 'inferred'

interface SourceRef {
  source: 'dsh-session' | 'codex-app-server'
  backend: string
  sessionId: string
  eventType: string
  seq?: number
  time?: number
  threadId?: string
  turnId?: string
  itemId?: string
  requestId?: string
}

interface TraceFact<T> {
  value: T
  evidence: EvidenceClass
  sources: SourceRef[]
}

interface Span {
  spanId: string
  parentSpanId?: string
  blueprintNodeId?: string
  kind: 'session' | 'turn' | 'agent-phase' | 'model' | 'tool' |
    'approval' | 'subagent' | 'compaction' | 'retry' | 'finalize'
  label: string
  status: TraceFact<'pending' | 'active' | 'completed' | 'failed' |
    'cancelled' | 'interrupted' | 'unknown'>
  startedAt?: TraceFact<number>
  endedAt?: TraceFact<number>
  durationMs?: TraceFact<number>
  usage?: TraceFact<{
    inputTokens?: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
    outputTokens?: number
    totalTokens?: number
  }>
  sources: SourceRef[]
  safeFacts?: Record<string, TraceFact<string | number | boolean | null>>
}

interface LoopTrace {
  schemaVersion: number
  traceId: string
  sessionId: string
  backend: string
  blueprint: { id: string; revision: number; digest: string }
  throughSeq: number
  completeness: 'complete' | 'partial' | 'unavailable'
  spans: Span[]
  activeSpanIds: string[]
  currentSpanId: string | null
  diagnostics: Array<{
    code: string
    message: string
    sources?: SourceRef[]
  }>
}
```

Contract 语义：

- `authoritative`：字段直接来自 backend/DSH 的权威 durable event；
- `derived`：从一组 authoritative facts 确定性计算，例如 end-start duration、usage 求和；
- `inferred`：adapter 用可解释规则映射 blueprint node；UI 必须显示其较低置信身份，且不能拿它
  决定控制行为；
- 一个 span 可以混合不同证据等级，不能只给整个 span 一个模糊的“可信”标签；
- `activeSpanIds` 是所有当前 active span，不是假设只有一个 spinner；UI 可从中选择一个主高亮，
  但不能丢失并行/nested 状态；
- `spanId` 必须由 durable correlation keys 确定性生成，restart 后不能改变；
- adapter 遇到未知 event、缺失配对或版本不兼容时输出 `partial/unavailable + diagnostics`，不得
  抛错回 Agent/Turn path；
- blueprint revision/digest 只标识解释用蓝图，不能让 Inspector 变成执行 owner。

## 5. 安全与脱敏硬边界

Inspector 只显示允许列表中的结构化摘要，禁止默认“先收集再隐藏”。

- 不展示或持久化 chain-of-thought、raw reasoning、reasoning summary text 或 reasoning delta；可以
  仅用不含内容的 lifecycle 事实显示“模型处理中”。
- 不展示 credential、access/refresh token、authorization header、cookie、device code、login URL
  query secret、provider secret prompt、developer/system secret instruction。
- 不展示未脱敏 tool arguments、command environment、tool result 原文或任意 opaque `meta`。
- tool span 默认只保留 tool name、状态、计时、批准结果和经过 owner allowlist 的摘要；路径、命令、
  URL、错误信息等字段分别经过类型化 sanitizer，不能对 JSON 做通用 stringify。
- SourceRef 只能携带协议 identity/cursor，不携带 payload。
- imported blueprint/definition 按不受信任配置处理，不能借 Inspector 或 Editor 扩大 Session、tool、
  network、sandbox、approval 或 credential 权限。
- redaction/sanitizer 自身失败时丢弃字段并记录不含原值的 diagnostic；不得 fail-open。

## 6. E0 / CI.0：开发者优先的只读 Inspector

E0 已在 alpha candidate 签收；完整证据见
[`../milestones/loop-inspector.md`](../milestones/loop-inspector.md)。完整 alpha parity 仍是分支
合回主线的独立 release gate。E0 没有实现 Editor/compiler，也没有提供 `codex-inspired` 点击入口。

### E0-A：event/capability inventory

- 固定 DSH tag/commit、Codex App Server protocol/runtime version 和 Aezy adapter revision；
- 枚举两条 backend 的 durable/live event、关联键、usage、cancel、approval、compaction、Subagent
  与 restart 语义；
- 为每类节点写 `authoritative / derived / inferred / unavailable` 矩阵；
- 明确 App Server item 到 DSH event 的持久关联缺口，未找到合法 seam 前不扩张 scope；
- 建立脱敏测试向量，包含 reasoning、secret prompt、credential-like value 和敏感 tool arguments。

### E0-B：contract 与纯 projector

- 在 Aezy 外置包中定义内部 `LoopTrace/Span/SourceRef/TraceFact` schema；
- projector 是只读纯 fold：相同 Session event prefix 必须产生相同 trace；
- DSH-native blueprint 与 Codex App Server blueprint 分开实现，共享的只是 trace contract；
- live path 消费 `eventSource` append，cold/restart path 消费相同 Remote history page；
- projector/adapter 不注册 Turn hook，不持有 cancel/retry 权限，不写 Session event；
- 未知 event 和缺失配对以 diagnostic 降级，不能让 event stream 或 Session UI 崩溃。

### E0-C：Session header + expandable timeline/graph

第一版面向开发者，而不是替代 Traffic/Task Board：

- Session header 常驻显示 mode/backend、coarse state、当前主节点、elapsed 和已知 usage；未知值留空，
  不显示伪精确数字；
- header 入口展开 timeline/graph；timeline 是完整且可访问的默认视图，graph 用 blueprint edges
  解释 nesting/parallel，并高亮全部 active span；
- 节点详情显示 evidence badge 和 SourceRef cursor，不显示原始 payload；
- 复用现有 layout/overlay seam，并与 Project/Review/Files/Terminal 的 `details` single slot 协商；
  E0 不重构 layout router，也不让 Inspector 永久抢占现有 panel；
- adapter 不可用时 header 退化为 backend + Session running/idle，Turn 继续运行。

### E0-D：双 backend accuracy gate

用 `standard` DSH-native 与 `codex-app-server` 各跑同一组行为，而不是比较两套内部图是否长得一样：

1. 单步回答；
2. structured tool success/failure；
3. approval allowed/rejected/cancelled；
4. 同一步多个或嵌套 tool span；
5. provider usage 有/无；
6. cancel/interrupted；
7. compaction 与 Subagent capability 存在时的真实 fixture；
8. Host restart 后读取同一 Session；
9. adapter/projector 故障注入。

E0 签收条件：

- live trace 与同一 durable prefix 的 cold reconstruction 深度相等；允许排除
  `reconstructedAt` 一类非语义字段；
- 事件配对、parent/child、并行 active set、终止原因、duration 和 usage 都能回溯到 SourceRef；
- 两条 backend 对共同 contract 的差异通过 `partial/unavailable` 如实表达，不用 compatibility
  emulation 补齐；
- restart 后 deterministic span id、blueprint revision/digest 与 evidence 等级不变；
- reasoning、credential、secret prompt、未脱敏 arguments/result/meta 的快照泄漏测试为零；
- kill/throw/unknown-version projector 只让 Inspector 降级，真实 Turn、approval、cancel、Journal 与
  Session persistence 不受影响；
- 没有引入第二套 event bus、Session store、usage ledger、notification system 或 loop controller。

## 7. E1：内部声明式 LoopDefinition 与 codex-inspired dogfood（当前）

E1 只定义内部、不可点击、不可导入任意代码的 schema，并让 `codex-inspired` 成为第一个
system-authored dogfood。只有 E0 已证明两条 backend 的观测准确性后，才确定 compiler 的具体 API。

最小定义包含：

- `schemaVersion`、稳定 `id`、单调 `revision`、canonical digest；
- required backend/capabilities、允许的 node/edge、全局 budget；
- 每个 node 的结构化参数和 capability requirements；
- validator/capability resolver 的确定性结果；
- compiler target 和 compiler version。

允许的宏观节点白名单为：`agent-phase`、`tool-phase`、`approval`、structured `condition`、
`bounded-retry`、`parallel`、`subagent`、`checkpoint/compaction`、`finalize`。它们只能编排 backend
已有能力，不能包含 JavaScript、shell、prompt template eval、任意 package import 或自定义
micro-loop。

约束：

- condition 只读取 validator 注册的结构化 facts，不读取 transcript 文本、reasoning 或 secret；
- 每个 retry/loop 必须同时声明 iteration、wall-time、token、tool-call 四类硬上限，缺任一上限
  就拒绝；
- parallel/Subagent 只能使用 DSH/backend 已有 cancel、lineage、budget 与 Security semantics；
- imported definition 按不受信任配置处理，不能扩大 preset/Session 现有权限；
- definition revision 一经发布不可变，Session 必须持久绑定 exact revision + digest；运行中禁止热改；
- backend/model 不满足 capability 时 fail-closed，不能用 Aezy compatibility shim 仿制 capability；
- 如果 DSH 没有公开、durable 的 definition binding seam，E1 保持内部不可运行，先解决 owner seam。

## 8. E2–E3：逐步开放编辑能力

### E2：模板式 Editor

- 只从已签名/内建模板创建、复制和参数化定义；
- 表单/图形编辑都落到相同声明式 schema，预览 validator 和 capability resolution；
- 发布产生新 immutable revision，已有 Session 不受影响；
- 不开放任意节点、脚本、prompt secret 或 package import。

### E3：受限控制流

- 在真实 parity gates 覆盖后才开放 structured condition、parallel、Subagent 和 bounded retry；
- UI 必须可见地显示每个 budget、取消传播、join policy 和失败策略；
- validator 对无界 cycle、不可达 finalize、权限升级、能力缺口和预算冲突 fail-closed。

## 9. `codex-inspired` parity gate

`codex-inspired` 在通过与 `standard` 和 Codex App Server 相同的以下真实门禁前保持路线定义，
不进入可点击 mode selector：

- Session create/resume/restart 与 exact LoopDefinition revision/digest；
- structured tool protocol 与并行/nested call；
- approval 与 Aezy Security；
- Turn Journal/Review；
- exact provider usage 与 compaction usage；
- cancel/interrupted/retry bounds；
- compaction/checkpoint；
- Subagent lineage、budget、cancel 与 restart；
- Inspector live/cold reconstruction parity；
- adapter/compiler failure 不破坏 Session truth。

任何 backend/model capability 缺口都必须 fail-closed 或保持不可点击，不能通过复制 DSH/Codex
内核、隐藏 partial 状态或降低 Security 语义来通过门禁。

## 10. 明确不捆绑

E0–E3 均不自动包含 Browser integration、Traffic Board、Task Board、Cloud/Remote/PR、Side Chat、
Workspace DAG 或 merge-back。它们继续按各自 owner/seam 单独立项。尤其 Loop Inspector 不是旧
Activity dashboard 的复活，也不是统一流量控制或任务看板的缩小替代品。

E1–E3 期间继续延后决定：Editor 的最终 graph 交互、compiler 的公开 package 边界、import/export、
协作发布和商业模板目录。外置 node plugin SDK 明确不在 E0–E3 实施范围，也不为它预留抽象。
E0 已证明双 backend trace 的准确、安全与 fail-soft；后续扩大产品面仍受 E1–E3 各自门禁约束。
