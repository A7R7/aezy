# DSH 0.1.2-alpha.3 影响审计与 runtime migration

> 状态：Complete<br>
> 日期：2026-09-01<br>
> 上游：`dsh-v0.1.2-alpha.3` / `dd6322d604e00eec1ba5e0c8541159906a21094a` / tree `86be9091c78528b5ef0866ae6d58b01d4a53582e`<br>
> 迁移范围：`0.1.2-alpha.1` → `0.1.2-alpha.3`

## 结论

`alpha` 分支的开发 runtime 已从 alpha.1 的仓库外 source-release tarball closure 迁移到官方
`@deepseek-ai/dsh@0.1.2-alpha.3` npm family。alpha.3 的 244 个公开 DSH family members 全部使用
同一精确版本，profile lock 中逐包存在 registry SHA-512 integrity；selector 不再默认消费
alpha.1 的源码 release artifacts，也没有建立长期双 runtime compatibility layer。

迁移先在 `/tmp/aezy-alpha3-migration/dsh`、profile `aezy-alpha3-migration`、端口 3193 完成，
确认 composition/Web/Workspace/Session/modes/native provider/Codex App Server/codex-inspired
revision 1/Inspector/restart 后，才提升 `~/.aezy-alpha/dsh` 的 `aezy-alpha` profile。现有
credentials、JSONL Sessions 与其他 DSH_HOME 状态没有被 migration spike 覆盖；最终 normal sync
已移除 dogfood-only preset，3091 当前未监听。

`.local/deepseek-harness/` 全程未修改、未构建、未生成。它仍是 alpha.1 的 historical read-only
snapshot，继续由 `reference/dsh.lock.json` 如实记录；alpha.3 源码影响审计使用仓库外可清理 checkout，
运行时只消费官方 npm artifacts。这个 reference/runtime 分离状态由 `compatibility/dsh.json` 明确表示。

## Publication 与完整性

| 项目 | 固定值 |
| --- | --- |
| npm publish time | `2026-08-31T16:20:52.856Z` |
| root package integrity | `sha512-VvATzYmQ4LMJREJ9e2POKksSHRfqP3y9pghplLBaQBuw2BqfbC0mQUVsaPwxe4wlcpj+riEgn8OJB01YnpF+3A==` |
| family members | 244 |
| mixed versions | 0 |
| missing SHA-512 integrities | 0 |
| family manifest | `reference/dsh-alpha3-npm-family.json` |
| manifest SHA-256 | `ed7f64c9b5c2b1f2a82f6a53148361ad2825aac69aad268eefce1d10488626f6` |

临时全 family consumer 验证 244/244 package manifests 均为 `0.1.2-alpha.3`，官方 CLI 返回
`0.1.2-alpha.3`。Aezy profile 额外精确固定 `react` / `react-dom` 18.3.1，避免 raw full-family
consumer 把 peer closure 漂移到 React 19；11 个 Aezy 外置 package 仍从当前 checkout 经过 `pnpm pack`
进入 profile，并通过 local override 解析其相互依赖。DSH package spec 与 lock 不允许 `file:` 或
本地 `.tgz` source。

## 上游影响矩阵

| 重点 seam | alpha.1 → alpha.3 结论 | Aezy 决策与证据 |
| --- | --- | --- |
| Agent hooks | `agent/pre-step`、`agent/request`、`agent/turn-stopping`、`agent/status` 的使用面保持稳定；Agent loop 的最后 Turn 读取改为依赖强制 Session projections | revision 1 compiler 不改 hook 或顺序；真实 exact-preset Turn 通过。不得复制 Agent loop |
| `llm/stream` | 路由 fence 使用面保持稳定 | revision 1 继续在最终 provider I/O 前拒绝 App Server route；真实 `openai-codex` Turn 通过 |
| `tools/pre-execute` | policy waterfall 使用面保持稳定 | Aezy Security 与 revision 1 budget 继续委托 DSH ToolRuntime；真实 ask → allowed-once、audit、Journal/Review 通过 |
| `SessionEvent.ignorable` | Remote history codec 允许未知 external event 以 `ignorable: true` 传输 | Aezy 没有扩展 `SessionEventMap`，只 append 标准 DSH events；不新增自定义事件或复制兼容语义 |
| Session persistence | Base composition 继续使用 JSONL persistence；SQLite persistence backend 不再是 runtime owner，SQLite query 只以内存索引组合 | 现有 alpha.1 profile 本来就是 JSONL；隔离和提升后的 Session 均跨 restart 恢复 |
| Session projections | Agent、token meter、Session list、Subagent 与更多 Host state 依赖 mandatory projection/projection-cache | composition dump 必须包含 projection 与 cache；迁移不提供绕过投影的 fallback |
| RemoteError/controllers | unary Remote converges on `RemoteResult` / `RemoteError`，旧 client wrapper 被移除 | Web controller RPC 成功；无效 `session/page` 返回结构化 `gateway/input-invalid`，不以旧 shim 解包 |
| shipped presets / `ui-agent-preset` | package-owned standard preset 保持权威；preset manager UI 由 General row 转到 roster section，默认选择 owner 调整 | alpha.1 与 alpha.3 shipped `standard/agent.cordis.yml` byte-identical；Aezy 仍只派生 external overlay，真实 roster/header projection 通过 |
| `openai-codex` / authorization | DSH `llm-pi-ai` owner、authorization key/method 与公开模型目录保持兼容；共享 value/brand dependency ownership调整 | fresh credential store 验证 `llm-pi-ai/openai-codex` OAuth seam，不启动 OAuth；提升后真实 governed Turn 使用既有 opaque credential 成功 |
| usage | token meter 改为 mandatory projection consumer；durable assistant usage 语义保持 | native Turn 得到 6,887 uncached input / 5,632 cache read / 43 output；Inspector native trace usage 完整 |
| compaction | durable bracket/usage 语义保持，但依赖 mandatory projection stack | 不复制 compaction；revision 1 后续 parity 仍暂停，等待独立真实 compaction gate |
| Subagent | identity、timing、control 与 model selection 更依赖 projections；continuable interrupt 与 RemoteError 收紧 | 不建立 compatibility copy；revision 1 Subagent/cancel parity 仍 pending |
| cancel | cooperative cancellation 与 continuable child settlement 的错误边界收紧 | 既有 DSH/Codex owner 不改；升级未宣称新增 parity，后续必须独立 gate |
| history pagination | `session/page` 的 `throughSeq` contract 保持，client 增加 deep `loadThrough` 行为 | isolated/promoted Session page 均以 exact projection `asOfSeq` 读取；Inspector live/cold/restart exact-prefix 相等 |
| Inspector `eventSource` | `SessionBinding.eventSource` 保持 | Inspector 仍是只读 consumer；native/App Server live 与 cold trace 深度相等，restart digest 相等 |
| AppFrame/details seam | `data-side="details"`、`data-details-collapsed` 与三轨 AppFrame grid 保持；相关 alpha.1/alpha.3 source byte-identical | `@aezy/layout` 不改 owner；现有 resize policy 单元与 client tests 通过，不新增 AppFrame copy |

## Revision 1 与 Inspector 的升级处理

本次没有新增 codex-inspired parity。revision 1 的 id/revision/digest/preset/budgets 均未变化：

```text
codex-inspired / revision 1
f7841cbd49ebf7f3ad8e73db76e945eca86c6c7ac6311871bbd9d402f0fb0248
```

隔离 3193 创建 exact-preset Session 并验证 durable `agentPreset` projection；提升后的 3091 使用
`openai-codex/gpt-5.6-sol` 完成一个 structured read Turn，产生 policy header、tool call/result 与
usage。最终 normal sync 后 system root 仍只有 `aezy` 与 `codex-app-server`，revision 1 不可点击。

Inspector topology 没有因 migration 增删节点或边，但 DSH source references 必须改钉 alpha.3。
canonical topology 包含 source refs，因此 digest 正确更新为：

| Backend | Lane / Node / Edge | revision / digest |
| --- | --- | --- |
| DSH-native | 5 / 40 / 59 | `v3 / 18895de7d169…` |
| Codex App Server | 5 / 41 / 54 | `v3 / a90cda5a03c1…` |

真实 promoted Host 上，native trace 在 `throughSeq=95` 为 `complete`、14 spans、digest
`828c67872e67…`；App Server trace 在 `throughSeq=880` 为如实的 `partial`、36 spans、digest
`68723386aa20…`。两者 live/cold 相等，并在 Host restart 后以同一 prefix 重建出相同 digest。

## 实机迁移证据

隔离 3193：

- 244/244 registry package 安装、版本与 lock integrity 校验；CLI `0.1.2-alpha.3`；
- composition dump 包含 Base/Web、JSONL、Session projection/cache、Remote controllers、native
  `ui-agent-preset`、Aezy mode/Inspector/layout；
- authenticated Web index 包含 8 个 Aezy client bundles；
- Workspace 与 standard/Codex App Server/revision 1 三个 Session 创建成功，preset projection 跨
  restart 保持；
- `session/modelCatalog` 返回 7 个 `openai-codex` 模型；fresh-store authorization owner probe 通过；
- `session/page` exact-prefix 与结构化 RemoteError 通过。

提升后的 3091：

- official family selector 将 `aezy-alpha` profile 提升到 alpha.3，保留原 DSH_HOME state；
- native governed write Turn：structured DSH write、approval `allowed-once`、Security ask/audit、
  Journal Turn 1、Review added、exact usage、completed；
- revision 1 structured read Turn：exact definition/preset、policy header、tool/result/usage、completed；
- Codex App Server：真实 managed account、model、rate limits、usage 与 structured commandExecution；
- Inspector 双 backend live/cold/restart digest equality；
- 109 tests pass（106 top-level subtests，含嵌套 109 total）；`git diff --check` pass。

## 后续边界

alpha.3 升级与后续 codex-inspired parity 必须保持独立提交。本迁移完成后仍暂停新增 parity；下一笔
只有在单独授权/范围下才可继续 approval/Security/Journal/cancel/compaction/Subagent/Inspector
专属 blueprint 等 E1 gates。不得借 migration 引入 Browser、Boards、Cloud/Remote/PR、Side Chat、
merge-back，或复制 DSH Session/tool/approval/Security/compaction/Subagent/usage/cancel 内核。
