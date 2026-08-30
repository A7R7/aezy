# E0 / CI.0 Loop Inspector

> 状态：**E0.1 revision 3 candidate — pending product acceptance**<br>
> 原 runtime trace foundation 日期：2026-08-30<br>
> Runtime：DSH `0.1.2-alpha.1` / `cd5ef8148158c3a752a658978873241fdf8e2bbc` / 3091

## 交付结果

`@aezy/inspector` 是参考树外的只读 observability plugin。它把公开 DSH Session
`eventSource`/Remote history page 投影为最小 `LoopTrace/Span/SourceRef/TraceFact` contract，
并在 Session header 提供常驻 mode/backend/current span/elapsed/known usage 状态以及可展开的
timeline。原 Graph 只是把 runtime span 按 parent 关系重新排版，与 Timeline 没有本质区别；它已
被判定不能满足静态 agent-loop logic graph 的产品目标，E0 因此重新打开。

E0.1 revision 3 将 backend blueprint 深化为独立、静态、始终可见的 full logic topology；runtime
trace 只在其上叠加 active/visited/count/usage/duration，Timeline 继续作为独立 occurrence log。
DSH-native 含 5 条 owner lane、40 个节点、59 条控制边；Codex App Server 含 5 条 owner lane、
41 个节点、54 条控制边。两条图都只把真正的模型推理标为 `OPAQUE`，不展示或猜测
chain-of-thought。

DSH 图显式展开 Inbox target、Turn/Step durable boundary、pre-step、request header、stream finish、
retry、compaction、exclusive barrier、bounded rolling pool、pre-execute/approval/monotonic guard、
tool dispatch/post-process/model-order commit、Subagent、cancel drain 与 driver convergence。Codex 图不再
把整个 Agent core 压成黑盒：它依据固定官方源码展开 Turn、Step capture、world-state/hooks、sampling、
response retry、item classifier、parallel/exclusive gate、ToolRouter、Subagent、follow-up、token pressure、
compaction 与 stop hook，再接入公开 App Server 和 Aezy/DSH Security bridge。

Inspector 默认打开 `Backend Logic`，按 80% readable view 呈现，支持 Fit/80%/100% 切换；owner
lane、节点和控制边始终来自 immutable blueprint。节点可查看 owner/说明/source contract；控制边可
点击查看 guard 与 source contract。原 runtime span-tree Graph 已完全移除。

Inspector 不注册 Turn hook，不写 Session event，不拥有 Agent、tool、approval、cancel、usage、
history 或 restart 状态。projector/UI 失败只产生 `partial/unavailable` diagnostic，不进入执行路径。

## 权威来源与精度

- `dsh-native` 静态 blueprint 依据固定
  `dsh-agent-loop`、tools、approval、retry、compaction 与 Subagent owner/source contracts；durable
  Turn、step/model、tool、approval、PTC dispatch、compaction、retry、Subagent 与 workflow events
  只生成 overlay。usage 只读取 `assistant/message.usage` 与 compaction usage。
- `codex-app-server` 静态 blueprint 依据 `@openai/codex@0.149.0` 对应的官方
  `rust-v0.149.0` commit `758ef40f50c1a458425c7cfbf1eb12cbc07af0b0`、tree
  `0f7a27df60e01dccf918f3203235266a0d6e3258`，并叠加公开 App Server protocol 与
  `@aezy/codex`/DSH bridge。runtime overlay 仍只投影已进入普通 DSH Session events 的 coarse
  trace，不因源码中存在某条路径就伪造 visited。已有
  `tool/result.meta.aezyCodex` 时携带 allowlisted `threadId/turnId/itemId/itemType` source identity。
- 当前 App Server adapter 没有把完整 item lifecycle 和 provider usage durable 投影进 Session
  events，因此该 backend 明确报告 `partial`、`app-server-item-lifecycle-partial`，在无 usage 时再
  报告 `app-server-usage-not-durable`。没有增加 App event log 或 usage ledger 来伪造完整度。
- cold history 中 assistant chunks 可能以 packed `chunkrow/*` 表示；projector 不把因此出现的
  普通 seq 跳跃误判为 event gap，Session journal 连续性仍由 DSH owner 校验。

## 安全边界

输出采用字段 allowlist。projector 丢弃 transcript、reasoning、prompt、credential、authorization、
raw tool arguments/results、approval reason 与 opaque metadata；SourceRef 只保留协议 identity/cursor。
hostile/malformed/unknown input 的测试要求 projector 不抛异常，并以不含原值的 diagnostic 降级。

## 自动门禁

```text
pnpm run build:inspector                 PASS
pnpm run test:inspector                  PASS (10/10)
pnpm run test:alpha:runtime              PASS (10/10)
pnpm run test:mode                       PASS (4/4)
pnpm run test:codex                      PASS (20/20)
pnpm run test:alpha:blueprint            PASS (real browser, both backends)
git diff --check                         PASS
```

覆盖内容包括：静态 topology 的 canonical revision/digest、lane/node/edge 完整性、guard/owner/source
refs、精确 Codex source revision、仅模型推理 opaque、runtime overlay 与 topology 分离、确定性 span id、nested/concurrent
active spans、parent evidence、精确 native usage、App partial semantics、packed chunks、敏感字段零
泄漏、异常输入 fail-soft，以及 UI 不存在 Agent/control/storage/第二 transport 路径。

## 真实 3091 双 backend 与 restart gate

`scripts/verify-loop-inspector.mjs` 只使用认证后的 `/api/remote.mux` `session/follow` 与
`session/page`：

1. 对既有 `standard` DSH-native Session 和 `codex-app-server` Session 各发起一个真实、无工具 Turn；
2. live follow 中两者都观测到 active Turn 与 active model span；
3. Turn 完成后，live trace 与同一 durable event prefix 的 cold reconstruction 深度相等；
4. native trace 为 `complete` 且具有 provider usage；App Server trace 为如实的 `partial`；
5. 保存 exact `throughSeq` 与脱敏语义 digest，重启 3091；
6. 重启后从相同 event prefix 重建，两条 backend 的 digest 均完全相等。

最终重启证据：

| Backend | `throughSeq` | 完整度 | Span | 重启前后 digest |
| --- | ---: | --- | ---: | --- |
| DSH-native | 207 | `complete` | 31 | equal |
| Codex App Server | 861 | `partial` | 33 | equal |

E0.1 另由 `scripts/verify-loop-blueprint.mjs` 在真实 3091 + 隔离 Edge/CDP 中切换实际 workspace/
Session，检查完整 DOM topology、缩放与可交互 guard。安装最终 bundle 并重启 Host 后结果仍相同：

| Backend | Lane | Node | Edge | revision / digest | OPAQUE |
| --- | ---: | ---: | ---: | --- | --- |
| DSH-native | 5 | 40 | 59 | `v3 / dc8900a001b6…` | `dsh-model-inference` |
| Codex App Server | 5 | 41 | 54 | `v3 / c3a0b8b2ebab…` | `codex-model-inference` |

80% 默认、100% 切换、水平 readable scroll、edge Guard 选择均通过，旧 `Official Codex agent core`
不存在，`pageErrors=[]`。重启前后 blueprint digest 完全一致。

相关 approval/Security/Journal/cancel 的执行 owner 与真实 backend parity 已分别由
[`native-provider.md`](native-provider.md) 和 [`codex.md`](codex.md) 签收；E0 不重跑或复制这些
状态机，只验证其 durable facts 能被安全 projector 消费。nested/concurrent/compaction/Subagent
事件组合在 pure-projector fixtures 中验证；以后只有真实 dogfood 暴露投影偏差时才补对应 live gate。

重启后的 3091 composition 包含 8 个 Aezy client bundles：brand、codex、inspector、layout、mode、
project、security、terminal。Host 继续使用隔离 alpha DSH_HOME/
profile，没有修改 `.local/deepseek-harness/`。

## 当前边界

上述自动与真实 gate 已签收 E0.1 revision 3 candidate 的 full static topology、runtime overlay 与
restart reconstruction；E0 仍等待产品验收，不自动恢复 Complete。E1–E3 当前实现已 revert 并
暂停，原 Git 历史保留；E0 获得验收前不继续 Editor/compiler。
不得把 Inspector 变为控制器，也不得在 parity gate 前开放 `codex-inspired`。E4 不在当前范围。
