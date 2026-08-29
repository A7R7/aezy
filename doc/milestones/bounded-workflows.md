# E3 Bounded Control-Flow Authoring

> 状态：**Complete for declarative authoring; execution intentionally unavailable**  
> 签收日期：2026-08-30  
> E4：**Out of scope**

## 交付结果

E3 在 E2 的内建模板 Editor 中增加第二个 `bounded-review` template，覆盖受限的：

- `condition`：只能读取注册的结构化 facts；当前 allowlist 为 `tests-passed`、`review-passed`、
  `tool-failed`、`subagent-failed`，必须恰有一条 true 和一条 false edge；
- `parallel`：显式 `join`、`maxConcurrency`、`cancelRemaining` 与 `failurePolicy`；
- `subagent`：显式 `maxChildren`、`cancelWithParent:true` 与 failure policy；
- `bounded-retry`：iteration、wall-time、token、tool-call 四类 hard bounds 缺一不可，且不能超过
  definition 全局 budget；每个 cycle 必须经过一个 fully bounded retry node。

UI 在 template graph 中显示这些结构化 policy，不收集或执行代码、prompt、transcript condition、
tool arguments 或 package。用户仍只能参数化 definition identity/description/global budgets，不能任意
改 graph。

## Fail-closed runtime 状态

`bounded-review` 的 resolver 明确缺少：

```text
bounded-retry
durable-definition-binding
parallel
structured-facts
```

因此发布的 E3 definition 只是 immutable configuration，`executable:false`。Aezy 没有用当前
`dsh-workflow` JavaScript runner 实现另一套 coordinator，也没有复制 Subagent/cancel/budget/
compaction 状态机。`codex-inspired` 仍不进入 preset selector；它需要的 Session/tool/approval/
Security/Journal/usage/cancel/compaction/Subagent/restart/Inspector parity gate 尚未开始，不能因
authoring 完成而降低。

## 门禁

```text
pnpm run build:workflow                      PASS
pnpm run test:workflow                       PASS (19/19)
pnpm run test:alpha:runtime                  PASS (10/10)
AEZY_ALPHA_GATE_TOKEN=… \
  pnpm run test:alpha:workflow-definition    PASS before and after Host restart
git diff --check                             PASS
```

真实 3091 发布 `e3-bounded-gate@1`，digest 为
`c57a11d04a7d972685654df479a2d0ba97125c2cbb1bb4393d57e7853b16878e`。Host restart 后读取到
相同 revision/digest；Web index 仍为 22250 bytes、包含 `@aezy/workflow`，且
`agentPresets/list` 不包含 `codex-inspired`。

E0–E3 当前范围至此完成。下一步若要让 definition 可运行，必须先获得或设计受审的 DSH-owned
durable exact-definition binding 与 compiler seam，再按完整 parity gate 立项；这不是 E4，也不授权
现在添加 node plugin SDK。
