# DSH 0.1.2-rc.1 影响审计与 runtime migration

> 审计日期：2026-09-04<br>
> 上游：`dsh-v0.1.2-rc.1` / `a66e4702047846cdaa10c66c9d3df3951f5ea70d` /
> tree `27ab636bb3d77e698f5637e518db44ae1f61e262`<br>
> 迁移范围：`0.1.2-alpha.4` → `0.1.2-alpha.5` → `0.1.2-rc.1`

## 结论

`main` 的唯一开发 runtime 已从 alpha.4 提升到官方 `@deepseek-ai/dsh@0.1.2-rc.1`
npm family。rc.1 的 242 个公开 DSH packages 全部使用同一精确版本，并逐包记录 registry
SHA-512 integrity；family manifest 的 SHA-256 为
`b2d09ca40d9c1c171d99f501a12c26c8895261ebb8bb2ee94f21580a054287b1`。根 package integrity 为：

```text
sha512-RPq48TzxvwpdT9/7W1tbhZDBMmeK+bxDrX9cqQC27Wx/LqtgJF8PSa3b3xriU8oxtvhwYmk21w2cej3uMQrnVA==
```

alpha.5 与 rc.1 的源码除 252 个 package manifest 版本字段外 byte-identical，公开 package 名称
也与 alpha.4 相同。因此影响审计以 alpha.4 → alpha.5 的实质变更为准，rc.1 再验证发布身份、
完整 family 与 registry integrity。

本次唯一实质运行时变化属于 DSH-owned storage/projection-cache 容错：storage domain 可以声明
`compatibleVersions`，可丢弃的派生记录可以选择 `invalidRecords: backup-and-skip`，JSON storage
遇到损坏记录时调用可选 `KvUnit.backupRecord()` 将原文件移动为带时间戳的 `.bak` 后跳过；
`session_projcache` v5 接受 v3/v4 记录，旧记录缺少的 lineage 字段继续按 unseeded 语义解释。
Aezy 无需修改任何 runtime seam，也没有复制 Session、tool、approval、Security、compaction、
Subagent、usage 或 cancel 内核。

## 发布与 supply chain

- npm `next` 与 immutable GitHub release/tag 均指向 `0.1.2-rc.1`；发布于
  `2026-09-03T06:21:52.107Z`。
- clean source checkout 位于仓库外临时目录；`.local/deepseek-harness` 保持 alpha.1 historical
  read-only snapshot，未参与 build、pack 或运行。
- `reference/dsh-rc1-npm-family.json` 记录 242/242 public packages 的统一精确版本、源码路径与
  registry integrity；root lock 和正式 profile lock 均通过 supply-chain policy。
- profile closure 不使用 `file:` DSH package、源码 release artifact 或混版 family；只有 11 个
  Aezy 外置 package 使用本地官方 pack 流程产生的 tarball。
- upstream optional `@deepseek-ai/dsh-subagent-codex` 在 rc.1 closure 中引用
  `@openai/codex@0.149.1`。Aezy 的 `@aezy/codex` 仍精确固定已验收的 `0.149.0` App Server；上游
  optional Codex subagent provider 不在 Aezy system roots 中启用，二者没有形成运行时 owner 混用。

## 重点所有权审计

| 重点 seam | alpha.4 → rc.1 结论 | Aezy 决策与证据 |
| --- | --- | --- |
| Agent hooks | 无实质变化 | codex-inspired revision 1 原样编译，未增加 parity 功能 |
| `llm/stream` | 无实质变化 | DSH-native `openai-codex` 真实 Turn 与 usage 通过 |
| `tools/pre-execute` / approval | 无实质变化 | native 与 codex-inspired write 均得到 `ask → allowed-once` |
| `SessionEvent.ignorable` | 无实质变化 | durable write、Journal/Review 与 restart reconstruction 通过 |
| Session persistence / JSONL | JSONL owner 不变；projection cache 增加兼容与损坏隔离 | alpha.4 Session 与 cache 在隔离、正式 profile 均成功续读 |
| RemoteError / controllers | 无实质变化 | authenticated Remote mux、`gateway/input-invalid`、Session controller 通过 |
| shipped presets / `ui-agent-preset` | 无实质变化 | standard/PTC/minimal/cordis/Aezy/Codex roster 与三 preset Session 通过 |
| `openai-codex` authorization | 无实质变化 | owner 仍为 `dsh-llm-pi-ai`，key 仍为 `llm-pi-ai/openai-codex`，7-model catalog 通过 |
| usage / compaction | 无实质变化 | 两条真实 write 均保留 exact usage；未复制 compaction owner |
| Subagent / cancel | 无实质变化 | package/API 审计通过；无 Aezy 内核或兼容层 |
| history pagination | 无实质变化 | 首启与重启 `session/page` 均通过 |
| Inspector `eventSource` | 无实质变化 | topology 不变，仅 canonical DSH source pin/digest 更新 |
| AppFrame / details seam | 无实质变化 | 8 个 client bundles 的正式 composition 与既有 layout tests 通过 |

Inspector revision 3 topology 没有改变。因为 canonical source revision 是 blueprint 输入，更新后
digest 为：

```text
DSH-native       sha256:772d6169735e6214812ce460ab00574f900b57c5a6a282a7885ef57502bf86b4
Codex App Server sha256:9ad35e581aa482b8d5ea5ebd13022958b8e538c23488b018c9bc2b00195531ee
```

## 隔离 migration spike

迁移先在可清理的 `/tmp/aezy-rc1-migration/dsh`、profile `aezy-rc1-migration`、端口 `3395`
执行，没有覆盖当时可工作的 alpha.4 profile。隔离安装确认 CLI 为 `0.1.2-rc.1`，242-package
family 同版且 integrity 可验证，并通过：

- composition、8 个 Web client bundles、Workspace、Session、shipped/Aezy modes；
- DSH-native provider ownership、7-model catalog、authorization contract；
- Codex App Server preset 和 exact codex-inspired revision 1 preset；
- Session history pagination、RemoteError、JSONL persistence 与 cold restart；
- standard native governed write：Security `ask → allowed-once`、structured write、Journal/Review、
  usage 与 Turn completion；
- codex-inspired revision 1 governed write：相同治理闭环、immutable definition digest 与 policy
  header；
- opaque 复制 28 个既有 alpha.4 Session directories 和 28 个 `session_projcache` records 后，
  rc.1 可以恢复旧 Session 与有效 `asOfSeq`。

临时 profile 仅用于一次性 migration spike；验证后删除，不建立长期 alpha.4/rc.1 双 runtime 层。

## 正式 3091 提升

隔离门通过后，selector 将 `~/.aezy-alpha/dsh` / `aezy-alpha` 提升到 rc.1，保留 credentials、
settings 与 Sessions。正式 3091 首启再次通过完整 composition/modes/history/RemoteError，并恢复
alpha.4 Session `aezy-alpha4-standard-mtjj90x8`。真实门禁结果：

```text
native session          aezy-alpha-native-turn-mtme7us8
native provider/model   openai-codex / gpt-5.6-sol
native governance       ask → allowed-once / Journal added / Review added
native usage            6446 uncached / 6144 cache read / 43 output

codex-inspired session  aezy-codex-inspired-write-mtme8g70
definition              revision 1 / f7841cbd49eb…
codex governance        ask → allowed-once / structured write / Journal added / Review added
codex usage             6649 uncached / 6272 cache read / 53 output
```

停止并冷启动 3091 后，首启建立的 standard、codex-app-server、codex-inspired 三个 Session 均为
`restart-equal`，alpha.4 carryover Session 继续可读。最后重新执行普通 profile sync，system roots
恢复为正常六 mode roster，不残留 internal dogfood preset。

## 迁移决策

1. rc.1 成为 `main` 唯一开发 runtime；不保留 alpha.4 compatibility path。
2. codex-inspired revision 1 在升级中保持同一 revision/digest；升级 commit 不包含后续 parity。
3. projection-cache 新容错由 DSH storage owner 提供；Aezy 不建立自己的 cache repair/migration 层。
4. Browser、Boards、Cloud/Remote/PR、Side Chat 与 merge-back 继续不在范围内。
