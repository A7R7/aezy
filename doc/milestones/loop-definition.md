# E1 Immutable LoopDefinition

> 状态：**Complete on alpha candidate; execution intentionally unavailable**  
> 签收日期：2026-08-30  
> Runtime：DSH `0.1.2-alpha.1` / 3091

## 交付结果

`@aezy/workflow` 提供内部、严格 JSON、revisioned/immutable 的宏观 `LoopDefinition`：

- schema version、稳定 id、单调 revision 与 canonical SHA-256 digest；
- backend/capability requirements、compiler target/version、全局四类硬 budget；
- 白名单 node/edge vocabulary；
- strict validator、immutable registry 与 capability resolver；
- 第一个 system-authored `codex-inspired@1` definition。

定义不能包含 JavaScript、shell、prompt/template eval、package import、credential 或 permission
grant。未知字段 fail-closed；imported definition 的 trust 只能是 `untrusted`，不能通过重新发布提升
权限。所有 cycle 必须经过带 iteration/wall-time/token/tool-call 四类上限的 `bounded-retry`。

`codex-inspired@1` 只描述 Orient → Implement → Verify → Checkpoint → Finalize 宏观阶段；
model→tool→approval→result micro-loop 仍完全由 DSH Agent 持有。其 exact digest 为：

```text
d655a88a024e3cd96c701b140554523d7d402d813d334591376ba4ee8592c060
```

## 上游 seam 结论

固定 alpha.1 的 SessionHeader 只 durable 绑定 `agentPreset`，没有公开的 arbitrary
definition revision+digest 字段；未知 downstream Session event 会 fail-closed。当前
`@deepseek-ai/dsh-workflow` 又是 model-written JavaScript runner，并明确没有 journaling/resume
或 token-budget vocabulary，不能充当 immutable macro definition runtime。

因此 E1 没有创建私有 Session event、没有复制 standard preset、没有把 digest 藏进可变 UI state，
也没有用 DSH workflow JS 伪装 compiler。resolver 将 `durable-definition-binding` 视为硬 capability；
即使测试 inventory 把它标成满足，未实现 compiler 仍返回 `executable:false`。这正是路线规定的
“无公开 durable binding seam 时保持内部不可运行”。

## 门禁

```text
pnpm run test:workflow                       PASS (12/12)
pnpm run test:alpha:runtime                  PASS (10/10)
AEZY_ALPHA_GATE_TOKEN=… \
  pnpm run test:alpha:workflow-definition    PASS
git diff --check                             PASS
```

真实隔离门禁证明：

- `@aezy/workflow@0.0.0` 已从本仓库打包并安装到独立 alpha profile；
- package manifest 没有 `dsh` Host/Client 入口，因此不会影响 Turn；
- profile 中的 definition digest 与源码 canonical digest 相同；
- capability resolution 精确缺少 `durable-definition-binding`，`executable:false`；
- 认证后的 3091 `agentPresets/list` 中没有 `codex-inspired`，所以不可点击、不可创建 Session。

## 后续边界

E2 可以为内建/签名模板提供表单式编辑、验证预览与 immutable revision publishing，但发布不等于
可执行。没有 exact Session binding/compiler seam 前，所有 revision 继续显示 unavailable，不能
偷偷复制 preset 或扩大 Session/Security 权限。E3 控制流仍保持 stage gate；E4 不在范围。
