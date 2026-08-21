# Aezy 项目交接

> 交接日期：2026-08-21<br>
> 仓库：`/home/aaron/repos/aezy-dsh-mvp`<br>
> 当前分支：`main`<br>
> 功能基线：`07f9218150 chore: upgrade Aezy to DSH 0.1.1-rc.1`

## 1. 最终目标与不可破坏的边界

Aezy 的目标是成为一个精简、类似 Codex 的完整编程 Agent。它以 DeepSeek Harness（DSH）作为 Harness 内核，但不是在 DSH 第一方插件中直接改代码的 fork。

当前已经确定并必须继续遵守的架构边界：

1. `.local/deepseek-harness/` 只作为 ignored、read-only 的上游参考快照。
2. Aezy 运行时只消费 npm 发布的 DSH packages，不从参考树相对导入源码。
3. Aezy 缺失的产品能力通过新的外置 Cordis plugin、bundle、profile patch、adapter 或应用实现。
4. 上游已有 seam、状态机、协议或明确 proposed design 的领域，Aezy 只做薄接入，不建立第二套内核。
5. 不为旧实现做兼容层，不提前抽象 Cloud/Remote，不用过度验证代替端到端可用性。
6. 非必要上游组件通过 Aezy profile 禁用，不删除、不修改 DSH 包。
7. 每个大步骤完成后创建独立 Git commit；不得顺手提交用户已有的未跟踪文件。

这条边界源自用户对原目标的重大修正，优先级高于早期“直接 fork 并修改 DSH 插件”的表述。

## 2. 当前版本基线

### DSH

- Package：`@deepseek-ai/dsh@0.1.1-rc.1`
- Tag：`dsh-v0.1.1-rc.1`
- Commit：`528c682e061696f5a160f363f236ecbf53cbd006`
- Git tree：`19e109115f57ace4170caf25dadbb59021126174`
- 参考路径：`.local/deepseek-harness`
- 参考树状态：detached at tag、clean、ignored
- 机器可读锁定：`reference/dsh.lock.json`
- Aezy 兼容性声明：`compatibility/dsh.json`

不要使用 npm `latest` 推断 DSH 版本；此前 npm dist-tag 曾落后。升级时应先核对不可变 Git tag/commit/tree，再安装精确 package version。

### Aezy

已存在的外置包：

- `packages/aezy-base`：Host/base composition patch，禁用非核心能力并收敛默认 Harness。
- `packages/aezy-web`：Web composition 与 Aezy preset 装配。
- `packages/aezy-brand`：最薄品牌 occupant，占据 DSH 通用品牌 slots；当前继续使用字母 `A`，未设计新图标。
- `packages/aezy-project`：M1 Project/Repository/Local Environment、结构化 Git、Turn ledger、Changes 与 Codex 式 change card。
- `packages/aezy-security`：M2 持久 Approval Rules、Network Policy、解释与审计。

默认运行状态位于 `~/.aezy/dsh/`，除非显式设置 `DSH_HOME`。pnpm store 位于仓库已忽略的 `.local/pnpm-store/`。

## 3. 已完成里程碑

### M0：外置 composition 与真实 profile

状态：Complete，已在 DSH 0.1.1-rc.1 复验。

已完成：

- `dsh-base → aezy/base → dsh-web-app → aezy/web` composition；
- 外置 `@aezy/brand`、`@aezy/security`、`@aezy/project` 普通插件安装；
- Aezy 自有默认 Agent preset；
- telemetry、feedback、动态 Cordis self-modification、Workflow/Ralph 等非核心行默认禁用；
- 真实 DSH Web Host、frontend、Workspace、Session 与 preset Remote API smoke；
- 参考树与运行时发布包彻底解耦。

详见 `doc/milestones/m0.md`。

### M1：Project / Repository / Changes

状态：Complete，真实模型 dogfood 与 DSH 0.1.1-rc.1 HTTP 回归均通过。

已完成：

- Session cwd → Project → Git Repository → Local Environment；
- branch/HEAD/upstream/ahead/behind；
- staged、unstaged、untracked、conflict 状态；
- repository/file staged/worktree diff；
- 按 Session/Turn 持久化的观察式 Git change ledger；
- fingerprint 门控的安全单文件 revert；
- receipt 持久化与 Undo；
- 整轮原子 Undo/Redo：写入前校验全部文件，失败时整批恢复；
- Web `Changes` view；
- 最终 Assistant 回复下方的 Codex 式 Turn change card：
  - `Edited N files`
  - 总计 `+added -deleted`
  - 逐文件 `+added -deleted`
  - `Review`
  - `Undo` / `Redo`
  - 历史 diff 不受后续 worktree 状态影响
  - 删除文件和 concurrent Turn fail closed
- Changes 与 Turn card 已使用 DSH theme aliases，不再是深色专用背景。

重要语义：ledger 观察 Turn 边界前后的 Git 事实，不声称知道每一次文件写入的作者。同一 checkout 中 Session 重叠时标记 `concurrent`，M3 Worktree 隔离前不得自动整轮撤销。

详见 `doc/milestones/m1.md`。

### M2：Approval Rules + Network Policy

状态：Complete，真实模型 deny dogfood、临时全新 `DSH_HOME` 与 restart persistence 均已签收。

已完成：

- global/repository 持久 Approval Rules；
- 独立于 filesystem sandbox 的 Network Policy；
- deny/ask/allow 规则优先级与可解释匹配；
- 未知 shell 与未知外置工具按 `possible network` 保守处理；
- shell allow prefix 拒绝 chain、pipe、redirection、expansion 和未闭合 quote；
- Security conversation view；
- 脱敏、有界、owner-only、原子持久化的审计；
- DSH `tools/pre-execute` waterfall 与单调 `tools.guard()` backstop；
- Aezy allow 不能跳过 DSH sandbox、原生 one-shot approval 或其他 downstream deny；
- M1 revert/Undo 以 `user-confirmation` 进入同一 Security projection。

能力边界：这是 Agent tool boundary，不是 Linux namespace、防火墙或系统级 egress sandbox；模型 provider/control-plane 流量和用户自己启动的进程不在该策略内。

详见 `doc/milestones/m2.md`。

## 4. DSH 0.1.1-rc.1 调查结论

rc.8 → 0.1.1-rc.1 的边界为 172 个 commit、2,368 个变更文件、+23,679/-11,723，workspace packages 从 226 增至 227。大量路径是 Agent Notes、双语文档、站点生成物、快照和统一版本更新，不能把总文件数当成运行时重写规模。

真正重要的上游变化：

1. 新增 `@deepseek-ai/dsh-authorization`；credentials 支持 durable API-key/grant records，`llm-pi-ai` 能对接登录和 refresh。
2. 但 shipped base/web patch 没有挂载 authorization，Web transport 和 Models 登录控制也未完成。当前是“package/seam 已发布，默认 Web 产品链路未启用”。不要另写 OAuth 内核；需要时只薄挂载上游插件并补 UI/bridge。
3. `llm-deepseek` 新增 `deepseek-v4-flash-vision-exp`，支持 text/image。这有助于后续截图理解，但不是 Browser automation。
4. 新增 `conversation.session.header.lineage`；Subagent 标题与祖先导航由上游维护。Aezy 不实现第二套 Subagent header。
5. Session projection 分离 host state 与 client view、统一 checkpoint、验证恢复缓存。Aezy 的公开 `session/event` seam 没有变化。
6. Webserver 新增结构化 `webserver/index-inject`；现有 `ctx.webServer.register()` 路由保持兼容。
7. bwrap 启用 private PID namespace，修复 `/proc/<pid>/root|fd|cwd` 隔离穿越；这不提供网络隔离，M2 仍然必要。
8. `ask_user_question` 多行回答、宽 Markdown 表、Turn retry terminal error、New Session 空白行和 composer 细节得到修复。
9. 本版没有新的 PTY/ConPTY、MCP/ACP runtime、compaction recall、Task Surface、Side Session/merge-back 产品落地。

完整报告：`doc/reports/dsh-0.1.1-rc1-update-impact-report.md`。

## 5. 当前测试与运行状态

在交接基线已通过：

- `pnpm exec dsh --version` → `0.1.1-rc.1`
- `pnpm peers check` → no issues
- `pnpm run test:brand` → 1/1
- `pnpm run test:m1` → 10/10
- `pnpm run test:m2` → 11/11
- `pnpm run test:m0` → composition/Web/Workspace/Session/preset smoke passed
- `pnpm run test:m1:http` → Turn Review、batch Undo/Redo、request fence passed
- `pnpm run test:m2:http` → policy、precedence、request fence、restart persistence passed
- `git diff --check` → passed

交接时 Aezy Web 正运行于：

```text
http://127.0.0.1:3090
```

它是当前 rc.1 profile。如果新会话接手时端口已不再监听，重新启动：

```bash
cd /home/aaron/repos/aezy-dsh-mvp
pnpm run aezy:web -- --host 127.0.0.1 --port 3090
```

## 6. Git 与用户文件状态

交接时的功能基线提交（其后仅增加本交接文档）：

```text
07f9218150 chore: upgrade Aezy to DSH 0.1.1-rc.1
```

用户已有三个未跟踪项，必须保留、不得纳入普通实现提交：

```text
doc/dogfood/codex-change-card-demo/
doc/dogfood/turn-changes-demo/
test.md
```

开始工作和提交前都应运行：

```bash
git status --short
```

不要使用 `git add -A` 或 `git add .`；应精确列出本步骤文件。

## 7. 下一步：M3 Worktree + Handoff

当前主里程碑是 M3，不是继续扩展 M1/M2，也不是实现 DSH 很可能自行维护的内核。

### M3 要解决的问题

当前多个 Session/Agent 仍可能共享一个 checkout，因此 M1 的 Turn 归因只能是观察式的。M3 应让一次执行拥有明确、隔离、可审计的 Git worktree/environment，再把结果安全交回主工作区或另一个人/Agent。

建议首个垂直切片：

1. 在现有 Repository/Local Environment 模型上增加 Worktree identity 和 lifecycle。
2. 创建 worktree 前检查 repository、branch/ref、目标路径与当前 Git 状态。
3. 默认在仓库专属、可验证的目录下创建，不接受未解析的 broad path、glob 或危险环境变量。
4. 将 Session 明确绑定到 worktree Local Environment；shell、Git status/diff、Turn ledger 都从该环境获得 cwd。
5. 创建、失败、进入使用、handoff、归档/清理都生成可审计状态。
6. Handoff 至少包含 repository、base/head、worktree path、Git status、changed files、验证结果和接手说明。
7. 清理前 fail closed：有未提交变化、活动 Session、无法确认所有权或路径漂移时拒绝删除。
8. M2 Security 应覆盖 worktree create/remove/handoff 等有副作用操作，并记录 user-confirmation/Agent policy 来源。

### M3 不应做的事

- 不修改 DSH Session、Subagent、Job 或 Task Surface 内核。
- 不把 DSH Experimental Agent Teams 当成 Worktree 隔离。
- 不先实现 Cloud/SSH/Container environment provider。
- 不在第一版实现完整 PR、push、remote review 或自动 merge。
- 不用共享 checkout 的文件时间戳推断作者，再把它包装成强隔离。
- 不自动删除用户不明确拥有的 worktree 或 branch。

### M3 完成门槛建议

Aezy 在自身仓库中：

1. 从明确 base 创建隔离 worktree；
2. 创建绑定该 worktree 的 Session；
3. 完成跨文件 Turn 和真实 build/test；
4. Changes/Turn card 只展示该 worktree 的变化，且不再因其他 Session 产生 `concurrent`；
5. 生成可供另一个新会话接手的结构化 handoff；
6. 在有脏状态时拒绝清理；
7. 在用户明确处理变化后安全清理；
8. 全程不修改 `.local/deepseek-harness/`。

M3 开工前先读 `doc/reports/aezy-upstream-ownership-roadmap.md`，并再次检查是否有新的 DSH tag。上游变化只用于重新评估所有权，不能自动扩大到修改 DSH 源码。

## 8. 关键文件地图

| 目的 | 文件/目录 |
| --- | --- |
| 项目入口和运行命令 | `README.md` |
| DSH 参考 revision | `reference/dsh.lock.json` |
| 支持的 DSH/runtime composition | `compatibility/dsh.json` |
| 外置 base/web composition | `packages/aezy-base/`、`packages/aezy-web/` |
| M1 Host、Git、ledger、client | `packages/aezy-project/` |
| M2 policy、store、client | `packages/aezy-security/` |
| 品牌 slots | `packages/aezy-brand/` |
| Profile 同步/启动 | `scripts/sync-profile.mjs`、`scripts/run-profile.mjs`、`scripts/lib/profile.mjs` |
| M0/M1/M2 签收 | `doc/milestones/m0.md`、`m1.md`、`m2.md` |
| 当前路线和所有权 | `doc/reports/aezy-upstream-ownership-roadmap.md` |
| DSH rc.1 影响 | `doc/reports/dsh-0.1.1-rc1-update-impact-report.md` |
| DSH 插件审计 | `doc/reports/dsh-plugin-function-report.md` |
| DSH Web/Codex 差距 | `doc/reports/dsh-web-vs-codex-desktop-gap-report.md` |
| Codex 功能基线 | `doc/codex-functions.md` |

## 9. 已知陷阱

1. 仓库已经从 `/mnt/d/projects/repos/aezy-dsh-mvp` 迁移到 `/home/aaron/repos/aezy-dsh-mvp`。不要把旧路径写回脚本、profile 或文档。
2. 若移动仓库后看到 `ERR_PNPM_UNEXPECTED_STORE`，应让 profile dependency migration/clean install 重新链接；不要把 pnpm global store 指回旧 `/mnt/d`。
3. rc.1 升级时旧 lock/virtual store 曾留下 rc.8 auto peers。当前根 `package.json` 显式固定 17 个 DSH foundation peers，不能随意删掉；先证明干净安装仍解析为单一版本。
4. DSH reference 在 `.local/`，目的是避免数千个上游文件拖慢 Aezy Git。不要重新纳入 index。
5. authorization 包已发布但默认 composition/UI 未完成，不能把它当作已交付的 Models 登录产品面。
6. vision model 不是 Browser automation。
7. M2 Network Policy 不是 OS firewall；描述能力时必须保留这一限制。
8. Turn ledger 是边界观察，不是逐写入 provenance。Worktree 完成前 concurrent Turn 必须 fail closed。
9. 旧 Codex Desktop computer-use 任务曾保留迁移前 `/mnt/d` sandbox metadata，导致 WSL → Windows URI 校验拒绝自动浏览器操作；这不是 Aezy Web 本身的错误。
10. 网络命令遵守代理环境变量；缺失时回退 `http://127.0.0.1:7890`。

## 10. 新对话建议的首条指令

可将下面内容直接交给新对话：

```text
请先完整阅读仓库根目录 HANDOFF.md、README.md 和
doc/reports/aezy-upstream-ownership-roadmap.md，检查 git status、当前 DSH tag
以及 3090 Aezy Host 状态。遵守只读 .local/deepseek-harness、只用外置插件扩展、
保留三个既有未跟踪 dogfood/test 项、每个大步骤单独提交的边界。

接下来开始 M3 Worktree + Handoff：先研究现有 @aezy/project 的
Repository/Local Environment、Turn ledger、Undo/Redo 与 @aezy/security seam，
形成一个最小端到端垂直切片计划，然后实现、用 Aezy 自己 dogfood 并签收。
不要修改 DSH 源码，不要实现第二套 Session/Subagent/Task 内核，也不要提前扩展
Cloud/Remote/PR。
```
