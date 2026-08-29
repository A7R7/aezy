# Aezy 文档索引

文档按“当前状态、验收记录、长期参考、历史归档”分层。新会话不要递归读取整个
`doc/`；先读接手入口，再按正在修改的能力选择一份 milestone 或 reference。

## Start here

1. [`HANDOFF.md`](../HANDOFF.md)：当前 HEAD、运行状态、边界、下一步和新会话指令。
2. [`README.md`](../README.md)：产品说明、仓库布局、启动与常用测试命令。
3. [`roadmap/aezy-upstream-ownership-roadmap.md`](roadmap/aezy-upstream-ownership-roadmap.md)：
   Aezy/DSH 能力所有权、等待条件和实施顺序。

## 修改某项能力时再读

| 范围 | 权威验收记录 |
| --- | --- |
| Profile/composition | [`milestones/m0.md`](milestones/m0.md) |
| Project、Changes、Undo/Redo | [`milestones/m1.md`](milestones/m1.md) |
| Approval Rules、Network Policy | [`milestones/m2.md`](milestones/m2.md) |
| Worktree、Session binding、Handoff | [`milestones/m3.md`](milestones/m3.md) |
| Review、Files/Preview、Contextual Ask | [`milestones/m4.md`](milestones/m4.md) |
| Git-independent Turn journal | [`milestones/turn-journal.md`](milestones/turn-journal.md) |
| Integrated Terminal | [`milestones/terminal.md`](milestones/terminal.md) |
| Codex-backed managed account and self-development loop | [`milestones/codex.md`](milestones/codex.md) |
| Alpha DSH-native Codex provider spike | [`milestones/native-provider.md`](milestones/native-provider.md) |
| E0 / CI.0 read-only Loop Inspector | [`milestones/loop-inspector.md`](milestones/loop-inspector.md) |
| E1 immutable LoopDefinition | [`milestones/loop-definition.md`](milestones/loop-definition.md) |
| E2 template Workflow Editor | [`milestones/workflow-editor.md`](milestones/workflow-editor.md) |
| E3 bounded control-flow authoring | [`milestones/bounded-workflows.md`](milestones/bounded-workflows.md) |

Milestone 维护已签收事实与明确的剩余门槛；未完成项必须在标题状态中标明 pending。不要把
其中的历史 Session ID、浏览器坐标或旧测试流水账复制回 HANDOFF/README；需要追溯时在原
milestone 阅读。

## 当前活动路线

- [`roadmap/loop-inspector-workflow-editor.md`](roadmap/loop-inspector-workflow-editor.md)：
  E0–E3 已签收；definition execution 因缺少 durable binding/compiler/capabilities 继续
  fail-closed，E4 不在范围。

## 长期参考

- [`reference/codex-functions.md`](reference/codex-functions.md)：Codex Desktop/Harness
  72 项产品功能基线，不代表 Aezy 当前状态。
- [`reference/codex-dsh-capability-gap.md`](reference/codex-dsh-capability-gap.md)：以 rc.7
  为原始基线的 Codex/DSH 能力矩阵；当前交付状态以 roadmap/milestone 为准。
- [`reference/dsh-package-catalog.md`](reference/dsh-package-catalog.md)：DSH package
  架构、能力族和 Aezy 装配决策。
- [`reference/dsh-0.1.1-rc1-impact.md`](reference/dsh-0.1.1-rc1-impact.md)：当前运行
  基线升级到 rc.1 时的影响与签收。
- [`reference/dsh-0.1.1-rc2-impact.md`](reference/dsh-0.1.1-rc2-impact.md)：rc.2 只读
  参考更新、multimodal/attachment 变化、可替代范围与 runtime upgrade gate。
- [`reference/dsh-0.1.2-alpha1-impact.md`](reference/dsh-0.1.2-alpha1-impact.md)：alpha.1
  reference replacement、Remote/controller 迁移、preset/catalog seam 与 npm publication gate。
- [`reference/dsh-alpha1-source-runtime.md`](reference/dsh-alpha1-source-runtime.md)：固定 alpha.1
  官方 commit 的隔离 source build、完整 release artifacts、SHA-256 与 packed-install gate。
- [`milestones/mode-presets.md`](milestones/mode-presets.md)：原生 Agent preset UI、
  `codex-app-server` system preset、per-preset catalog UI 与 Host 执行门禁的 3091 签收。
- [`reference/relay-dsh-plugin-codex-0.1.2-compatibility.md`](reference/relay-dsh-plugin-codex-0.1.2-compatibility.md)：
  固定 Relay companion 的 OAuth/account、Thread/Turn、tool/approval、usage 与 Aezy 兼容门禁。

DSH revision 的机器可读真相源位于根目录 `reference/dsh.lock.json` 与
`compatibility/dsh.json`；Relay companion 的机器结论位于 `compatibility/relay-codex.json`，
不是这些叙述文档。

## Archive

`archive/` 只用于追溯已被替代的研究和已签收的 dogfood 过程证据：

- `archive/research/`：rc.7 逐包快照、rc.7 → rc.8 影响报告；
- `archive/dogfood/`：M1/M2/M4 与 Turn summary 的一次性人工检查记录。

归档内容不作为当前版本或下一步的依据，不应由新会话默认加载。若其中结论仍影响产品，
应把结论写入对应 milestone/roadmap，并保留归档作为证据，而不是在多处维护同一状态。

## 维护规则

- `HANDOFF.md` 只维护“现在”；目标控制在约 200 行。
- 根 `README.md` 只维护产品概览、运行和常用命令。
- 一个完成切片只在一份 milestone 中维护详细验收证据。
- `roadmap/` 只维护尚有决策价值的所有权与未来顺序。
- `reference/` 可以较长，但不进入新会话默认阅读集。
- 被新版本替代的调研移入 `archive/`，不要继续在活动文档中追加修正。
- 新增文档前先判断现有 milestone/roadmap/reference 是否已是它的权威 owner。
