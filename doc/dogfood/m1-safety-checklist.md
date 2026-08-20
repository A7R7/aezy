# M1 安全检查清单

> 在真实 dogfood 与后续迭代中逐项核对；任何一项不满足即视为失败，不得放行。

## 参考树不可变性

- [ ] 不修改、生成、patch `.local/deepseek-harness/` 下任何文件；该路径保持只读快照（rc.8 `141eb6fef8…`）。
- [ ] Aezy 源码不通过相对路径导入参考树文件，只消费发布版 DSH package 与公开 seam（`webServer`、`session/event`、client-module、`conversation.view`）。
- [ ] 参考树更新只允许以整体审核后的 upstream revision 替换，并在根 README 与兼容性元数据中记录 revision。

## Turn-Scoped Ledger

- [ ] ledger 只记录单个 Session 单个 Turn 边界（`turn/start` 快照 → `turn/end` 重扫）内 fingerprint 发生变化的文件。
- [ ] ledger 按 Session/Turn 持久化于 Git metadata 目录（`<gitRoot>/aezy/ledger.json`），重启后仍可读取。
- [ ] 同一 checkout 上重叠 Session 必须标记 `concurrent`，此类记录不得被自动批量撤销。

## Fingerprint 冲突拒绝

- [ ] revert 前校验 `expectedFingerprint` 与 ledger 记录的 `afterFingerprint` 一致。
- [ ] revert/undo 前校验文件当前 fingerprint 与记录值一致；任何漂移返回 409，绝不覆盖。
- [ ] undo 仅当 `resultFingerprint` 仍匹配时执行一次，之后置 `undone`。

## 单文件 Revert

- [ ] revert 只作用于单个文件，且同时恢复 worktree 与 index，而不是粗暴回到 HEAD。
- [ ] symlink、非普通文件、conflict、rename、超过 8 MiB 的文件一律 fail closed（`revertable: false`）。
- [ ] 恢复期间拒绝替换/删除非普通文件路径；失败时回滚到变更前状态并标记 `rolled-back`。

## Undo Receipt

- [ ] revert 先写 `prepared` receipt（含 restore 快照），成功后才置 `committed` 并记录 `resultFingerprint`。
- [ ] receipt 按仓库持久化、可查询（`/aezy/api/project/ledger`），与 Session/Turn/文件一一对应。
- [ ] 已 `undone` 或非 `committed` 的 receipt 拒绝再次 undo。

## UI 签收锚点

- [ ] 在浏览器中对本次跨文件 Turn 的部分文件执行 revert，刷新页面后确认变更持久化，再对 receipt 执行 Undo 验证端到端闭环。
