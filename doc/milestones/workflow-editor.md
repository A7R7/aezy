# E2 Template Workflow Editor

> 状态：**Complete on alpha candidate**  
> 签收日期：2026-08-30  
> Execution：**Unavailable by design**

## 交付结果

`@aezy/workflow` 现在通过 Aezy Settings 的 **Workflows** section 提供模板式 Editor。E2 只允许：

- 选择内建、content-addressed template；
- 修改 definition id、name、description 与四类全局 budgets；
- 预览锁定的 backend、capabilities、macro nodes 与 canonical digest；
- 查看 capability resolution；
- append-only 发布新的 immutable revision。

用户不能编辑 graph、backend、compiler target、capability requirements、prompt、code、package、
permission 或 credential。system definition id 保留；stale `expectedRevision` fail-closed。发布不会
创建 Session、preset 或 workflow run，UI 没有 Run action。

## Owner 与持久化

Aezy 只拥有 workflow definition revision store，文件位于隔离 DSH_HOME 的
`aezy/workflow-definitions.json`，目录 0700、文件 0600、atomic rename。每次加载会重新验证所有
definition body、revision 与 digest。这个 store 不是 Session/event/usage/Task store，也不进入
Agent Turn path。

Host 只暴露 same-origin、loopback、`x-aezy-client:web` fenced 的 snapshot/preview/publish API；
client 复用 DSH `settings.section` slot，没有新增 layout 或 transport。

## 门禁

```text
pnpm run build:workflow                      PASS
pnpm run test:workflow                       PASS (E2 时 16/16)
pnpm run test:alpha:runtime                  PASS (10/10)
AEZY_ALPHA_GATE_TOKEN=… \
  pnpm run test:alpha:workflow-definition    PASS
```

真实 3091 发布 `e2-template-gate@1`，digest 为
`6fbad2eb1a0a8c7230f47c7774bdbf8caf249c4e3e3c53cf4fad880f35de3305`；Host restart 后从 store
读取到相同 revision/digest。认证 Web index 为 22250 bytes，并包含第 8 个 Aezy client bundle
`@aezy/workflow`。`agentPresets/list` 仍不包含 `codex-inspired`。

E2 完成只表示 authoring/publishing 可用；definition execution、compiler 与 exact Session binding
仍不可用。
