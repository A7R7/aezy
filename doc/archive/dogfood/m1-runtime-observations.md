# M1 运行期观察（rc.8 Aezy 外置插件架构与 Changes 表面）

> **Archived dogfood evidence.** 当前 M1 状态与结论见 `doc/milestones/m1.md`。

> 本笔记基于对当前 rc.8 profile 的实际代码与运行路径的三条证据化观察，非设计文档复述。

## 观察一：整个 M1 表面只通过公开 seam 挂载，参考树保持只读

`@aezy/project` 的注入点只有 `['webServer', 'sessions']`（`packages/aezy-project/src/index.js`），`apply()` 通过 `ctx.webServer.register({ kind: 'prefix', path: '/aezy/api/project', ... })` 挂 HTTP 面，通过 `ctx.on('session/event', ...)` 订阅 `turn/start` 与 `turn/end`。源码仅相对导入 `./git.js` 与 `./ledger.js`，没有任何指向 `.local/deepseek-harness/` 的相对路径引用；该参考树仍固定为 rc.8（`141eb6fef8…`）且只读。结论：M1 能力确实完全位于参考树外，与 AGENTS.md 的约束一致。

## 观察二：HTTP 边界是浏览器导向的 request fence，且多数边界 fail closed

`requireWebClient()` 强制 `X-Aezy-Client: web` 头、loopback 权威（`127.0.0.1`/`localhost`/`[::1]`），拒绝 `sec-fetch-site: cross-site`；origin 仅在存在时才校验。非 Web 客户端一律 403。值得注意的实测细节：`Origin` 缺失的裸客户端（如 curl 带自定义头）也能通过——fence 依赖非浏览器客户端不去伪造该头。请求体限制 32 KiB、无 shell 插值、diff 与 revert 的路径都经过 `safeRelativePath` 校验；fingerprint 不匹配时 `index.js` 统一映射为 409（`changed since|already undone|does not match`）。

## 观察三：ledger 是观察式、按 Session/Turn 持久化的数据面，revert/undo 全程 fingerprint 门控

`TurnLedger` 在 `turn/start` 快照 changed-files 并捕获每个文件的 restore 状态（含 index），在 `turn/end` 重扫后仅记录 fingerprint 变化的文件；同一 checkout 上重叠 Session 标记 `concurrent`。ledger 落在 Git metadata 目录（`<gitRoot>/aezy/ledger.json`），单 Session 最多 100 个 turn。revert 要求 `expectedFingerprint` 同时等于 ledger 记录的 `afterFingerprint` 与当前文件 fingerprint，任何漂移都 409 拒绝；先写 `prepared` receipt 再恢复 worktree+index，成功后落 `committed` + `resultFingerprint`，失败回滚为 `rolled-back`。undo 仅在 `resultFingerprint` 仍匹配时执行一次并置 `undone`。symlink、非普通文件、conflict、rename 与超过 8 MiB 的文件全部 `revertable: false`，不走有损路径。

## UI 签收锚点

本次跨文件 Turn 绑定于真实 Aezy Workspace 上执行，其产物将在 Changes 中被逐一核验签收。
