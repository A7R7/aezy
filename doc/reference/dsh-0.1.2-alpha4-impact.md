# DSH 0.1.2-alpha.4 影响审计与 runtime migration

> 状态：Complete<br>
> 日期：2026-09-02<br>
> 上游：`dsh-v0.1.2-alpha.4` / `4e84901e6471b79ec0338099867ebb4606d12bb5` / tree `aeb655f10fe7f8a15ddee8fa29a38af283660167`<br>
> 迁移范围：`0.1.2-alpha.3` → `0.1.2-alpha.4`

## 结论

`main` 的唯一开发 runtime 已提升为官方 `@deepseek-ai/dsh@0.1.2-alpha.4` npm family。
alpha.4 的 242 个公开 DSH family members 全部使用同一精确版本，并逐包带有 registry
SHA-512 integrity。alpha.3 不作为长期兼容路径保留；runtime selector 不消费源码 release
artifact，也没有修改或构建 `.local/deepseek-harness/`。

迁移先在 `/tmp/aezy-alpha4-migration/dsh`、profile `aezy-alpha4-migration`、端口 3294 完成。
composition、Web、Workspace、Session、shipped modes、native provider、Codex App Server、
codex-inspired revision 1、Inspector seam、真实 governed write 与冷重启全部通过后，才提升
`~/.aezy-alpha/dsh` 的 `aezy-alpha` profile，并在 3091 重复关键门禁。原 profile 的 opaque
credentials、JSONL Sessions 与其他状态被保留；最终 normal sync 已移除 dogfood-only preset。

本次没有新增 codex-inspired parity。唯一必要的 Aezy runtime 适配是把三个外置只读 consumer
从 alpha.4 已移除的 `session.events` getter 迁到公开 `session.snapshotEvents()`；DSH 继续拥有
Session、tool、approval、Security、compaction、Subagent、usage、cancel 与 persistence 内核。

## Publication 与完整性

| 项目 | 固定值 |
| --- | --- |
| npm publish time | `2026-09-01T16:01:23.092Z` |
| root package integrity | `sha512-+dOvmCxBNs4fWkBqAw1trAYE/5Ue/SmcC+ZKUfKAK/ai/FAgsSeiZkOhRQudVHuq/DZUhFH8BYkibhprhYqgAA==` |
| public family members | 242 |
| mixed versions | 0 |
| missing SHA-512 integrities | 0 |
| family manifest | `reference/dsh-alpha4-npm-family.json` |
| manifest SHA-256 | `c422f26b22899097e67344874a737fb909f0f7e1d76ec822bf53d672982b338d` |

上游 source workspace 有 252 个 DSH-named package manifests；root 与 9 个 experimental package
是 private，因此不属于可安装的官方 public family。相对 alpha.3，公开 family 减少两个成员：

- `@deepseek-ai/dsh-code-runtime-python` 移入 private experimental；
- `@deepseek-ai/dsh-tool-subagent-report` 删除，Subagent followup/report 收敛到相邻
  `send_message` / steer contract。

没有新增公开 package name。临时全 family consumer 验证 242/242 package manifests 都是
`0.1.2-alpha.4`，官方 CLI 返回相同版本；profile lock 中 DSH package spec 不含 `file:` 或本地
`.tgz` source。11 个 Aezy 外置 package 仍从当前 checkout 经 `pnpm pack` 安装。

上游 `dsh-app-boot` 把 `@deepseek-ai/cordis-plugin-group` 声明为 peer，但 alpha.4 根 package
没有把它列为 dependency；在 `autoInstallPeers: false` 的仓库根，`pnpm exec dsh --version` 因此会在
boot import 阶段失败。Aezy 根 dev closure 现与已验证 profile 一样精确安装官方
`@deepseek-ai/cordis-plugin-group@1.0.2`，并把 `pnpm peers check` 报出的九个 DSH interface peers
精确固定到 alpha.4；这只补足开发根 CLI closure，不改变 DSH family 数量或运行时 owner。

## 上游影响矩阵

| 重点 seam | alpha.3 → alpha.4 结论 | Aezy 决策与证据 |
| --- | --- | --- |
| Agent hooks | `agent/pre-step`、`agent/request`、`agent/turn-stopping`、`agent/status` 继续可用 | revision 1 hook compiler 不改；隔离与提升后的 exact-preset Turn 均通过 |
| `llm/stream` | 公开 route fence seam 稳定；provider discovery 会校验并复用配置 headers | Aezy 继续只在 provider I/O 前做 capability fence，不拥有 transport/header store；native Turn 通过 |
| `tools/pre-execute` | waterfall seam 稳定 | Security 与 revision 1 budget 继续委托 DSH ToolRuntime；两类真实 write 均为 ask → allowed-once |
| `SessionEvent.ignorable` | external unknown-event codec 语义保持 | Aezy 不扩展 SessionEventMap，不建立兼容 codec；Remote/history 门禁通过 |
| Session API / sequence | event sequence 与 log offset 被分别 branded；`session.events` getter 删除，公开 `snapshotEvents()`、`eventAt()`、`seq` | 首次真实 write 在 Security seam 以 `undefined.length` fail，durable tool/result 保留了证据；Security、workflow 与 Codex adapter 三处改用 `snapshotEvents()` 后通过，不加 alpha.3 shim |
| Session persistence | header 内部从 `seedLength` 变为 `isSeeded` + `inheritedEventCount`，wire 仍兼容；JSONL owner 保持 | 隔离与正式 profile 的三个 Session 均跨冷重启 exact-equal；不复制 persistence |
| RemoteError/controllers | unary result/error 与 controller contract 保持 | 无效 `session/page` 仍返回结构化 `gateway/input-invalid`；Web controller smoke 通过 |
| shipped presets / `ui-agent-preset` | standard ownership保持；PTC 不再装 workflow；base/headless/sdk 默认公开 web fetch | Aezy system presets 继续只做 external overlay；normal roster 不含 dogfood。web fetch 是上游 tool 能力，不等于捆绑 Browser 产品 |
| `openai-codex` / authorization | `llm-pi-ai/openai-codex` owner、OAuth method 与 7-model catalog 保持 | fresh/static owner probe 与既有 opaque credential 的两次真实 Turn 通过；Aezy 不读取 token |
| usage | durable assistant usage contract 保持 | standard write：2,365 uncached / 10,240 cache read / 45 output；revision 1 write：3,720 / 9,216 / 53 |
| compaction | owner 与 durable bracket/usage seam 保持 | 不复制内核；revision 1 的真实 compaction parity 仍 pending |
| Subagent | followup/report 收敛到 adjacent `sendMessage`，`send_message` 参数改为 `agent_id`，report package 删除 | Aezy 没有依赖删除的 package，也不建兼容层；Subagent/cancel parity 仍须独立 gate |
| cancel | public cooperative cancellation ownership保持 | 本迁移不宣称新增 parity，不改 DSH cancel owner |
| history pagination | `session/page` / load-through contract 保持并有性能调整 | isolated/promoted exact-prefix、history page 与 restart persistence 通过 |
| Inspector `eventSource` | `SessionBinding.eventSource` 保持 | Inspector 继续只读 durable truth；canonical source refs改钉 alpha.4，topology 不变 |
| AppFrame/details seam | existing details slot、resize handle 与 responsive owner 保持 | `@aezy/layout` 不复制 AppFrame；既有单元/client gates 通过 |

## 发现、隔离与修复

首次隔离 alpha.4 native governed write 在 DSH 已记录 `tool/call` 后失败，durable error result 是：

```text
Error: Cannot read properties of undefined (reading 'length')
```

审计定位到 alpha.4 删除了 `Session.events` getter，而 Aezy Security pre-execute policy 仍读取该
getter。相同假设还存在于 workflow budget 和 Codex adapter permission fold。三处均直接迁到
`session.snapshotEvents()`，相关 fixture 同步模拟公开方法。修复后没有保留版本判断、旧 getter
fallback 或双 runtime compatibility layer。这个实机故障证明了仅靠 package install 和静态
composition 不足以签收 Session API migration，真实可变 tool round-trip 是必要门禁。

## Revision 1 与 Inspector

codex-inspired definition 保持 immutable revision 1：

```text
f7841cbd49ebf7f3ad8e73db76e945eca86c6c7ac6311871bbd9d402f0fb0248
```

alpha.4 的 PTC preset 不再包含 upstream workflow，但 Aezy codex-inspired 并不派生 PTC；它继续
由 exact standard composition 加外置 overlay 组成。隔离和提升后的真实 governed write 都验证
exact revision/digest、policy header、structured call/result、approval、Security、Journal、Review、
usage 与 completed。普通 normal sync 后 preset 仍不可点击。

Inspector topology 没有增删节点或边。canonical blueprint 包含 source refs，DSH revision 改钉
alpha.4 后 digest 正确更新：

| Backend | Lane / Node / Edge | revision / digest |
| --- | --- | --- |
| DSH-native | 5 / 40 / 59 | `v3 / aa707d5b91bc…` |
| Codex App Server | 5 / 41 / 54 | `v3 / af38cbbf6581…` |

## 实机证据

隔离 3294：

- 242/242 registry package version/integrity、CLI `0.1.2-alpha.4`；
- Base/Web/Workspace/Session/projection/cache/Remote/controllers/shipped presets/Aezy clients；
- standard、Codex App Server、revision 1 三个 Session 创建与 cold restart persistence；
- 7-model `openai-codex` catalog、authorization owner、history pagination 与 RemoteError；
- 修复 Session getter 后，standard 和 revision 1 两个真实 governed write 均完成。

提升后的 3091：

- `aezy-alpha` profile 提升为 alpha.4，保留原 credentials 与 Sessions；
- composition/Web/Workspace/Session、7-model catalog、history page 与 structured RemoteError；
- standard Session `aezy-alpha-native-turn-mtjj9clr`：真实 write、Security ask、Remote
  allowed-once、Journal/Review、usage、completed；
- revision 1 Session `aezy-codex-inspired-write-mtjj9wi0`：exact definition、policy header、真实
  write、Security/approval、Journal/Review、usage、completed；
- 三个新建 mode Session 在 3091 cold restart 后 exact-equal；
- serial combined suite 110/110 pass（107 top-level），alpha runtime 13/13，frozen offline
  install、supply-chain policy 与 `git diff --check` pass。

## 后续边界

本迁移是独立 runtime commit，不混入新的 codex-inspired parity。后续 approval deny、cancel、
compaction、Subagent、专属 Inspector 等 parity 必须继续以独立精确切片开发。不得借升级捆绑
Browser、Boards、Cloud/Remote/PR、Side Chat 或 merge-back，也不得复制任何 DSH 内核。
