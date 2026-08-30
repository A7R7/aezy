# E0 / CI.0 Loop Inspector

> 状态：**Reopened — static backend logic graph pending**<br>
> 原 runtime trace foundation 日期：2026-08-30<br>
> Runtime：DSH `0.1.2-alpha.1` / `cd5ef8148158c3a752a658978873241fdf8e2bbc` / 3091

## 交付结果

`@aezy/inspector` 是参考树外的只读 observability plugin。它把公开 DSH Session
`eventSource`/Remote history page 投影为最小 `LoopTrace/Span/SourceRef/TraceFact` contract，
并在 Session header 提供常驻 mode/backend/current span/elapsed/known usage 状态以及可展开的
timeline。原 Graph 只是把 runtime span 按 parent 关系重新排版，与 Timeline 没有本质区别；它已
被判定不能满足静态 agent-loop logic graph 的产品目标，E0 因此重新打开。

纠正目标是让 backend blueprint 成为独立、静态、始终可见的 node/edge/guard/owner topology；
runtime trace 只在其上叠加 active/visited/count/usage/duration。Codex App Server 未公开的 agent
内部必须显示为 opaque，不得根据表面事件猜测内部 phase。

Inspector 不注册 Turn hook，不写 Session event，不拥有 Agent、tool、approval、cancel、usage、
history 或 restart 状态。projector/UI 失败只产生 `partial/unavailable` diagnostic，不进入执行路径。

## 权威来源与精度

- `dsh-native` blueprint 从 durable Turn、step/model、tool、approval、PTC dispatch、compaction、
  retry、Subagent 与 workflow events 确定性重建。usage 只读取 `assistant/message.usage` 与
  compaction usage。
- `codex-app-server` blueprint 只投影已进入普通 DSH Session events 的 coarse trace；已有
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
pnpm run test:inspector                  PASS (9/9)
pnpm run test:alpha:runtime              PASS (9/9)
git diff --check                         PASS
```

覆盖内容包括：独立 blueprint revision/digest、确定性 span id、nested/concurrent active spans、
parent evidence、精确 native usage、App partial semantics、packed chunks、敏感字段零泄漏、异常输入
fail-soft，以及 UI 不存在 Agent/control/storage/第二 transport 路径。

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
| DSH-native | 187 | `complete` | 28 | equal |
| Codex App Server | 842 | `partial` | 30 | equal |

相关 approval/Security/Journal/cancel 的执行 owner 与真实 backend parity 已分别由
[`native-provider.md`](native-provider.md) 和 [`codex.md`](codex.md) 签收；E0 不重跑或复制这些
状态机，只验证其 durable facts 能被安全 projector 消费。nested/concurrent/compaction/Subagent
事件组合在 pure-projector fixtures 中验证；以后只有真实 dogfood 暴露投影偏差时才补对应 live gate。

重启后的 3091 Web index 为 22014 bytes，实际 composition 包含 7 个 Aezy client bundles：
brand、codex、inspector、mode、project、security、terminal。Host 继续使用隔离 alpha DSH_HOME/
profile，没有修改 `.local/deepseek-harness/`。

## 当前边界

上述自动与真实 gate 只签收 runtime trace foundation，不再代表 E0 整体完成。E1–E3 当前实现已
revert 并暂停，原 Git 历史保留；静态 backend logic graph 重新验收前不继续 Editor/compiler。
不得把 Inspector 变为控制器，也不得在 parity gate 前开放 `codex-inspired`。E4 不在当前范围。
