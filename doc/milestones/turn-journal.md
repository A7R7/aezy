# Turn File Change Journal 基础层修复

> 签收日期：2026-08-24<br>
> DSH runtime：`0.1.1-rc.1`<br>
> Host：真实 Aezy profile，`http://127.0.0.1:3090`

## 目标与边界

此前 `@aezy/project` 把 Turn change card、Historical Review 和 Git ledger 完全绑定：
`turn/start` 在非 Git cwd 执行 `git rev-parse --show-toplevel` 失败后，会把错误保留为
Session observer failure；之后 `/ledger` 和 Turn tail 持续返回 400 / `Changed files
unavailable`。这与结构化文件工具在非 Git workspace 中仍可产生精确变更事实的能力不符。

本次修复没有修改 DSH，也没有复制 Session 或文件工具内核。Aezy 复用公开
`tools/execute` around-dispatch seam：成功的 DSH `write` / `edit` 在该进程内结果中携带
完整、结构化的 `path / before / after / operation`；Aezy 只观察该结果并写入自己的
Turn journal，随后原结果原样返回。

## 新的数据分层

1. **Turn File Change Journal**：非 Git workspace 按 Session/Turn 记录结构化
   `write` / `edit` 的最早 before 与最终 after；对象和 ledger 位于
   `DSH_HOME/aezy/turn-journal/<workspace-hash>/`，目录 0700、文件 0600。
2. **Optional Git Enrichment**：Turn 开始时已经存在 Git repository，继续使用原有
   start/end status scan、Git metadata object、rename/binary、fingerprint、concurrent、
   safe Undo/Redo 与 receipt 语义。
3. **Partial / unobserved**：非 Git Turn 中成功运行 `bash`、`pwsh`、`run_code` 或
   terminal 类工具时，Turn 显式标记 `partial` 并记录潜在未观测工具；shell-only Turn
   也会留下零文件 partial 记录，不声称变更完整。

Turn 中执行 `git init` 时，当前 Turn 保持使用其开始时的 structured journal，不补造
Git turn-start baseline，也不开放 Git-safe Undo；下一 Turn 才启用完整 Git enrichment。
读取会合并当前 workspace journal 与 Git ledger，同 Turn 冲突时优先选择 Git enriched
记录，因此历史 structured snapshot 在 `git init` 后仍可 Review。

## HTTP 与 UI 行为

- `/aezy/api/project` 对非 Git cwd 返回 200，`repository.available=false`；
- `/aezy/api/project/ledger` 返回 version 2，包含 `workspaceRoot`、nullable
  `repositoryRoot`、`gitAvailable`、Turn `source/partial/unobservedTools`；
- 非 Git Historical Review 继续使用持久 object，不读取当前文件重算；
- structured-only Turn 的文件 `revertable=false`，Undo fail closed；
- Changes 显示明确的非 Git 空态，而不是 Git 命令错误；
- partial Turn card 显示 `partially observed`，零文件时 Review 和 Undo 均禁用。

## 自动与真实验证

- `pnpm run test:m1`：16/16，新增覆盖非 Git create/edit、重启读取、历史不漂移、
  shell-only partial，以及 Turn 内 `git init` 后下一 Turn 启用 Git enrichment；
- `pnpm run test:m2`：11/11；
- `pnpm run test:m3`：6/6；
- `pnpm run test:m0`：真实 composition/Web/Workspace/Session/preset smoke passed；
- `AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:m1:http`：真实 rc.1 Host 的
  Git/non-Git ledger、Historical Review、Undo/Redo 和 request fence passed；
- `pnpm run dogfood:turn-journal`：真实模型 Session
  `turn-journal-dogfood-mt6qureu` 在无 `.git` 目录中依次使用 `write` / `edit`，Turn 1
  得到 source=`structured`、partial=`false`、稳定 added Review；
- `pnpm run dogfood:turn-summary`：真实模型 Session
  `turn-summary-dogfood-mt6qvc9u` 的原 Git-enriched Turn summary 继续通过；
- 用户原问题 URL（Session `session-d3ba37e0-c6d8-4a3e-96d1-8ad334e729ef`，cwd
  `/home/aaron/repos/llm-test/simple-test`）在更新后的 3090 Host 返回 200。

Windows computer-use 仍因该 Codex task 的 WSL workspace URI metadata 被安全拒绝，
没有执行 UI 输入；client bundle regression 已锁定非 Git 空态和 partial 文案。这个
限制与 M4.1A HANDOFF 中的既有说明相同，不是 Aezy Host 或本次实现错误。

## 仍然保留的限制

- 当前 structured journal 精确覆盖 DSH `write` / `edit`；任意 shell 副作用不解析
  命令、不扫描整个非 Git目录，只标记 partial/unobserved；
- 非 Git structured snapshot 不提供 Git index、rename detection 或 safe Undo；
- 已经因旧实现失败且没有结构化 journal 的历史 Turn 无法倒推补造；修复只保证新 Turn；
- 当前持久格式仍由 `@aezy/project` 承载，后续稳定后再考虑抽成通用
  `@aezy/turn-journal`，不在本轮提前拆包。
