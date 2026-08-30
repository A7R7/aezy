# Aezy 项目交接

> 更新日期：2026-08-30<br>
> 仓库：`/home/aaron/repos/aezy-dsh-mvp`<br>
> 分支：`alpha`<br>
> 功能基线：Codex-backed Aezy self-development loop（Complete）；alpha DSH-native
> OpenAI/Codex provider（Complete）；E0/CI.0 Loop Inspector（Reopened：静态 backend logic graph）

本文件只记录“下一位接手者现在必须知道的事实”。完整实现、测试和 dogfood 证据请沿
链接阅读 milestone/report，不在这里重复。

## 1. 不可破坏的边界

1. `.local/deepseek-harness/` 是 ignored、read-only 的上游参考快照。不得编辑、格式化、
   生成、patch 或提交其中内容。
2. Aezy 运行时只消费 package artifacts 与公开 extension interfaces，默认优先 npm 发布版本；
   npm 缺版时仅允许从固定官方 immutable commit、在仓库外经官方 build/pack 与 packed-install
   验证的 release artifacts。不得从参考树相对导入或直接运行源码。
3. Aezy 能力只能通过参考树外的 Cordis plugin、bundle、profile patch、adapter 或应用实现。
4. DSH 已拥有或已公开 seam 的状态机只做薄接入；不得复制 Session、Task、Subagent、PTY、
   compaction、approval 或 merge-back 内核。
5. 保持 M1 Git fingerprint、concurrent、atomic Undo/Redo 和 fail-closed 语义；不要借新功能
   泛化重构 M1–M4。
6. 每个大步骤独立提交。提交前后检查 `git status --short`，只精确 `git add -- <files>`；
   不得使用 `git add .` 或 `git add -A`。
7. 网络访问使用现有 proxy 环境变量；缺失时回退 `http://127.0.0.1:7890`。

根 `AGENTS.md` 中的仓库指令与以上边界同样具有约束力。

## 2. 上游与运行时基线

- 分支运行版本：`@deepseek-ai/dsh@0.1.2-alpha.1`（源码 release artifacts / 3091）
- 对应 tag/commit：`dsh-v0.1.2-alpha.1` / `cd5ef8148158c3a752a658978873241fdf8e2bbc`
- 只读参考版本：`dsh-v0.1.2-alpha.1` / `cd5ef8148158c3a752a658978873241fdf8e2bbc`
- 参考锁定文件：`reference/dsh.lock.json`
- 兼容性声明：`compatibility/dsh.json`
- 默认状态目录：`~/.aezy/dsh/`
- 仓库 pnpm store：`.local/pnpm-store/`

2026-08-28 复核确认最新 immutable GitHub Release/tag 是 `dsh-v0.1.2-alpha.1`，reference 已完成
一次完整 revision replacement；官方 npm registry 仍无 `@deepseek-ai/dsh@0.1.2-alpha.1`。
经明确授权，固定官方 commit 已在仓库外完成完整 official build、241 个 DSH + 9 个 vendor +
1 个 Landlock entry tarball、逐文件 SHA-256 与官方 packed-install verification。本 `alpha` 分支
只面向 `~/.aezy-alpha/dsh`、`aezy-alpha` profile 与 3091，不承诺 rc.2 runtime 兼容，也不能从
reference 源码运行。隔离 selector、checksum-pinned consumer、composition、
Web、Workspace、Session、mode/preset 与 7 个 Aezy Client bundle 已实机通过；完整证据见
`doc/reference/dsh-alpha1-source-runtime.md`。alpha.1
移除了 ApiProxy/client-runtime，新增 Remote controllers、package-owned shipped presets、PTC rename、
provider-card slots、exact Turn usage、subagent model routing 与 experimental Agent Team；详细影响和
迁移门禁见 `doc/reference/dsh-0.1.2-alpha1-impact.md`。

当前外置包：

- `packages/aezy-base`：Host/base composition patch；alpha 薄启用 DSH-owned
  `openai-codex` provider 与 authorization seam。
- `packages/aezy-web`：Web composition 与 Aezy preset。
- `packages/aezy-brand`：品牌 slots。
- `packages/aezy-project`：Project、Turn Journal、Git enrichment、Worktree/Handoff、
  Review/Files panel 与 Contextual References。
- `packages/aezy-security`：Approval Rules、Network Policy 与审计。
- `packages/aezy-terminal`：DSH PTY 的 Session-scoped Host bridge 与右侧 Terminal panel。
- `packages/aezy-codex`：官方 App Server process/protocol client、Aezy profile Host bridge 与
  Settings managed ChatGPT browser/device login、logout、plan/rate/usage/model 产品面，以及
  `aezy-codex` provider 的 Session↔Thread/Turn、stream/activity/cancel/resume 薄适配。
- `packages/aezy-mode`：alpha-only 原生 preset 装配、`codex-app-server` system overlay、
  per-preset catalog UI 与 Host provider fence。
- `packages/aezy-inspector`：只读 Session event projector、LoopTrace contract、header 与
  timeline/runtime graph；不拥有 loop、history、usage 或控制状态。

## 3. 当前产品基线

所有下列切片均为 **Complete**：

| 切片 | 当前能力 | 权威记录 |
| --- | --- | --- |
| M0 | 外置 composition、真实 profile、Aezy preset | `doc/milestones/m0.md` |
| Turn foundation | Git-independent structured Turn journal + optional Git enrichment | `doc/milestones/turn-journal.md` |
| M1 | Project/Changes、historical ledger、fingerprint-safe atomic Undo/Redo | `doc/milestones/m1.md` |
| M2 | 持久 Approval Rules、Network Policy、解释与审计 | `doc/milestones/m2.md` |
| M3 | 受管 Worktree/Session binding、结构化 Handoff | `doc/milestones/m3.md` |
| M4.1A | Modern structured Review side panel | `doc/milestones/m4.md` |
| M4.1B | File tree + code/Markdown/image preview、自动目录刷新 | `doc/milestones/m4.md` |
| M4.2 | `@directory` / Working+Historical `@diff` 与 Contextual Ask | `doc/milestones/m4.md` |
| Terminal | DSH line PTY 的多标签 Integrated Terminal side panel | `doc/milestones/terminal.md` |
| Codex loop | Managed ChatGPT、DSH dynamic tools、真实 Aezy 自开发闭环 | `doc/milestones/codex.md` |
| Agent modes | standard/PTC/minimal/creative、legacy aezy、Codex App Server preset | `doc/milestones/mode-presets.md` |
| Native provider | DSH-owned OAuth、OpenAI/Codex model、原生 tool/approval/Security/Journal/restart | `doc/milestones/native-provider.md` |
| E0 / CI.0 | 双 backend durable LoopTrace、Session header、timeline/graph、live/cold/restart parity | `doc/milestones/loop-inspector.md` |

`openai-codex` 是 standard/PTC/minimal/creative 可用的 DSH-native provider；
`codex-app-server` 仍只使用 `aezy-codex`。两者的模型可能同名，但 agent loop owner 不同。

接手时最容易误解的语义：

- Turn diff 不再完全依赖 Git。结构化 `write/edit` 在非 Git cwd 中也会生成 durable Historical
  Review；无法证明完整影响的 shell/terminal 操作只标记 `partial/unobserved`。Git 仍负责
  repository identity、rename/binary、fingerprint、concurrent 和 safe Undo/Redo。
- Historical Turn 必须读取 ledger object，不能用当前 worktree 重算。Turn 中途 `git init`
  不补造 start baseline；下一 Turn 才启用完整 Git enrichment。
- Project panel 在桌面占用公开 `details` single slot，窄屏使用 `shell.overlay`。Review 文件是
  多开 accordion、逐文件 lazy load；Files tree 对展开目录做有界 fingerprint polling。
- Terminal 已从 `conversation.view` 迁到右侧 panel。Session header 的 `Terminal` 按钮会在
  桌面动态占用原生、可调整宽度的 `details`，窄屏才使用 overlay；关闭时释放注册，不永久
  遮蔽 Project panel。关闭 panel 不杀 PTY，关闭 terminal tab 才会终止对应 PTY。
- Linux Terminal 从 DSH 公开 PID 开始有界遍历 sandbox 子进程树，投影实际 shell cwd；
  `cd` 后活动提示符更新。失败或非 Linux 平台回退 Session cwd。Aezy 不注入 `pwd`，不改
  raw scrollback，也不修改 DSH 内部 `dsh> ` readiness 协议。
- DSH 0.1.1 terminal 是 line-oriented read/send contract，不是 raw browser TTY。不要为了
  xterm 外观复制 VT/PTY/resize/ConPTY 协议。

## 4. 当前 Git 与 Host 状态

Tracked worktree clean；无需保留历史 dogfood fixture。

交接时 Aezy Web 正在监听：

```text
http://127.0.0.1:3090
```

alpha Host 已在本次验证重启后监听 `http://127.0.0.1:3091`，进程状态必须重新检查。其
DSH_HOME/profile 与主线历史状态完全分离，启动命令为：

```bash
pnpm run alpha:web -- --host 127.0.0.1 --port 3091 --no-open
```

它已在 Codex self-development dogfood 完成并 fast-forward 回 `main` 后正常 SIGTERM/restart，
真实页面包含
`@aezy/codex` client bundle，account endpoint 返回 connected ChatGPT plan/rate/usage 且不含
email/token；真实 DSH Codex dynamic tool、write/Journal、Security deny/audit、approval
allowed-once、cancel 与跨重启 resume 均通过。当前 checkout 的
`packages/aezy-terminal/lib/client.js` SHA-256：

```text
9ee61ac87995cfdbf35c0915e8a59ec19e4e5671a41f13d83e343412d47136f4
```

Host 是运行时状态；新会话必须重新检查 3090，不能只相信本文件。启动命令：

```bash
cd /home/aaron/repos/aezy-dsh-mvp
pnpm run aezy:web -- --host 127.0.0.1 --port 3090 --no-open
```

## 5. 最小复验入口

不要默认重跑所有历史 dogfood。先按改动范围选择：

```bash
pnpm exec dsh --version
pnpm peers check
pnpm run test:m0
pnpm run test:brand
pnpm run test:m1
pnpm run test:m2
pnpm run test:m3
pnpm run test:terminal
pnpm run test:codex
pnpm run test:codex:dsh
pnpm run test:inspector
pnpm run test:alpha:runtime
git diff --check
```

已有真实 Host 时可运行：

```bash
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:m1:http
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:m2:http
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:m3:http
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:terminal:http
```

当前签收结果摘要：Codex 自动测试 18/18、官方 App Server 实机 structured command gate，
以及上述真实 DSH Codex gates；真实 rc.2 M0 composition smoke；3090 的
Worktree/Journal/Security HTTP 回归，以及 open/send/read、多 PTY、SIGINT、Session/cwd/request
fence 和 `cd /tmp` live cwd 均通过。
浏览器验证确认 1440px 下 Terminal 是 359px 原生 details 列且 Chat 保持选中；680px 下
只显示无溢出的 overlay；reopen、scrollback、双 Session 隔离与 `pageerror=[]` 通过。
E0 自动门禁为 Inspector 9/9、alpha runtime 9/9；真实 3091 双 backend live/cold trace 与 Host
restart exact-prefix digest parity 通过。其他里程碑的完整测试矩阵只在对应 milestone 中维护。

## 6. 下一步与所有权

近期目标已达成：让 Aezy 能用官方 managed ChatGPT 账户完成真实 coding agent Turn，并能
在 Aezy 仓库中开发、测试、重启和继续开发 Aezy，形成最小自迭代闭环。

首选 owner/seam 是官方 Codex `app-server`，不是 Aezy 自写 OAuth 或立即复制 Codex agent
loop。官方接口已提供 ChatGPT managed OAuth（浏览器与 device-code）、凭据持久化/刷新、
`planType`、rate limits/usage、conversation history、approval 和 streamed agent events。Aezy
只通过新的外置 runtime adapter 启动/连接该进程并投影协议事实；Codex 继续拥有 OAuth、
credential 和 agent loop。当前本机 `codex-cli 0.149.0-alpha.4.1` 的 `app-server` 命令仍标为
experimental，因此第一步必须是固定版本的兼容性 spike 和端到端 contract test，不能直接
把不稳定协议散入现有 M0–M4/Terminal 包。

近期顺序：

1. 已完成：独立 rc.2 runtime compatibility gate，发布包/lock/profile/3090 均已签收。
2. 已完成：alpha.1 reference replacement、影响审计、仓库外 official source release pack、
   packed-install，以及独立 3091 的 Remote/controllers、client split、Web/Workspace/Session/Aezy
   外置插件实机门禁；rc.2 仍是默认。
3. 已完成：隔离验证 `relay-dsh-plugin-codex@0.1.2`。auth/account/usage、对话、resume、cancel
   通过，但真实工具/approval 事实与安全切模型失败；不要安装到 Aezy profile。
4. 已完成：最小外置官方 App Server adapter。process/protocol client、真实
   `gpt-5.6-sol` structured `commandExecution`、account/rate/usage gate，以及 Aezy Settings
   managed browser/device login/logout 产品入口均已完成并在 3090 验证；`aezy-codex` provider
   的 Session↔Thread、dynamic DSH tools、activity、approval、Security、Journal、cancel 与
   restart-resume 门禁均通过。Codex 原生权限固定 read-only，提权一律拒绝；所有可变操作回到
   DSH tools/Security/approval。
5. 已完成：在 Aezy 自身仓库的受管 Worktree 执行真实开发 Turn、失败后恢复、18/18 测试、
   Journal/Review、结构化 Handoff、Host restart 与同一 Thread continuation；首笔 Aezy 自开发
   提交为 `36871adfe5`。完整证据见 `doc/milestones/codex.md`。
6. 已完成：alpha 恢复上游 `ui-agent-preset`，保留 standard/ptc/minimal/cordis，
   增加 `codex-app-server` system preset、catalog UI/Host 双门禁与原生持久 header；旧 `aezy`
   仅保历史恢复，`codex-inspired` 不可点击。证据见 `doc/milestones/mode-presets.md`。
7. 已完成：alpha DSH-native provider。通过 `@aezy/base` 薄启用 alpha.1 已有
   `llm-pi-ai/openai-codex` 与 authorization owner；DSH-owned OAuth、真实 standard Turn、
   structured tool、approval、Security、Journal/Review、usage 与 restart-resume 均通过。默认
   DeepSeek model 与 `codex-app-server`/`aezy-codex` 隔离未改变。证据见
   `doc/milestones/native-provider.md`。
8. 正在纠正：E0/CI.0 只读 Loop Inspector。既有 `LoopTrace/Span/SourceRef` projector、header、
   timeline 与双 backend live/cold/restart parity 继续作为 runtime evidence 基础；原 runtime span
   tree 不是产品所需的静态 agent-loop 逻辑图，不能视为 E0 完成。E0 重新打开，先交付由 backend
   owner/source contract 固定的静态 node/edge/guard 图，再把 durable trace 仅作为 active/visited/
   usage/duration overlay。App Server 内核不可见部分必须显示为 opaque，不得推测。
9. 完整 alpha parity gates 仍是 `alpha` 合回主线的 release gate；通过前不合并。
10. E1–E3 的当前实现已通过新增 revert 提交撤回，原提交完整保留供历史追溯；三个阶段均暂停，
    直到静态 backend logic graph 版本的 E0 被重新验收。E4 与外置 node SDK 不在当前范围，也不
    为它预留抽象。长期路线见
    `doc/roadmap/loop-inspector-workflow-editor.md`。
11. 按真实 dogfood 故障 harden 已完成的两条 backend；Traffic Board 与 Task Board 继续暂缓。

原 Activity dashboard 实验已全部废弃：原提交 `eae530ddcb`、`4d187252b0`、`d77430c012`
分别由 `4428fc8037`、`2cb30ba1ab`、`b89422ddc0` 的独立 revert 撤销。不要从这些旧提交继续
开发。Browser integration 同样暂停；默认直接使用外部浏览器。只有当自动页面发现、CDP
调试、截图/交互证据能明显增强 agent loop 时再单独复议，而且不预设嵌入狭小网页 viewport。

禁止在近期切片中：

- 读取、复制或自行刷新 Codex OAuth token；优先让 `app-server` 托管登录与凭据；
- 建立第二套 Session/Subagent/Task/PTY/compaction/approval/usage 内核；
- 让 Inspector 反向驱动 Turn，或展示 chain-of-thought、credential、secret prompt、未脱敏 tool
  arguments；
- 在 E1 capability/binding gate 前运行 imported definition，或在 parity gate 前提供可点击
  `codex-inspired`；
- 泛化重构已签收的 M1–M4、Turn journal 或 Terminal；
- 提前捆绑 Traffic/Task Board、Cloud/Remote/PR、Side Chat、merge-back 或 Browser；
- 修改 `.local/deepseek-harness/` 绕开缺失 seam。

活动路线与上游/Aezy 所有权：`doc/roadmap/aezy-upstream-ownership-roadmap.md`。

## 7. 文件地图

| 目的 | 文件/目录 |
| --- | --- |
| 产品说明、运行和测试命令 | `README.md` |
| DSH revision / compatibility | `reference/dsh.lock.json`、`compatibility/dsh.json` |
| Base/Web composition | `packages/aezy-base/`、`packages/aezy-web/` |
| Project、Turn、Worktree、Handoff、M4 client | `packages/aezy-project/` |
| Security policy/store/client | `packages/aezy-security/` |
| Integrated Terminal Host/client | `packages/aezy-terminal/` |
| Codex App Server、managed account Host/client 与完成证据 | `packages/aezy-codex/`、`doc/milestones/codex.md` |
| Loop Inspector 与完成证据 | `packages/aezy-inspector/`、`doc/milestones/loop-inspector.md` |
| Profile 同步与启动 | `scripts/sync-profile.mjs`、`scripts/run-profile.mjs` |
| 文档入口与阅读分层 | `doc/README.md` |
| 当前 milestone 证据 | `doc/milestones/` |
| 活动所有权路线 | `doc/roadmap/` |
| Loop Inspector / Workflow Editor 详细路线 | `doc/roadmap/loop-inspector-workflow-editor.md` |
| 长期产品与 DSH 参考 | `doc/reference/` |
| 被取代的调研与 dogfood 证据 | `doc/archive/` |

## 8. 已知陷阱

1. 仓库已从 `/mnt/d/projects/repos/aezy-dsh-mvp` 迁到当前 `/home/aaron/repos/...`；不要写回
   旧路径。移动 checkout 后若出现 `ERR_PNPM_UNEXPECTED_STORE`，用 profile sync 重新链接，
   不要把 store 指回旧路径。
2. M2 Network Policy 是 Agent tool boundary，不是 OS firewall；provider/control-plane 流量
   和用户自己启动的 Terminal 进程不受它声明的规则控制。
3. 当前 `details` 是 DSH single slot。Project 是长期 occupant；Terminal 只在打开期间以更高
   优先级动态占用并在关闭时释放。未来 generic panel router 出现后再统一，不要复制一个
   AppFrame/layout 内核。
4. ChatGPT 计划的可用入口是受支持的 Codex client/app-server 登录链路，不等价于把订阅计划
   当作任意 OpenAI API key。Aezy 不读取 Codex credential 文件，也不实现 OAuth refresh；
   `app-server` 不可用时必须明确降级为 API-key provider 或不可用，不能秘密复用 token。
5. 当前 Codex Desktop 的 Windows computer-use helper 可能拒绝 WSL `file://` cwd；此前真实
   浏览器 QA 使用 `/tmp` 一次性 Playwright/NSS fallback。这不是 Aezy Web 故障。
6. 新建 Git Worktree 不包含 ignored `node_modules`。真实自开发 Turn 首次测试因此失败，随后
   在同一 Session/Thread 中经审批执行 `pnpm install --offline` 后恢复；不要把依赖缺失误判为
   Codex continuation 或 DSH tool 故障。

## 9. 新会话首条指令

```text
请先完整阅读仓库根目录 HANDOFF.md、README.md 和
doc/roadmap/aezy-upstream-ownership-roadmap.md，检查 git status、当前 DSH tag 与 3091 Host
以及 HANDOFF 中记录的功能基线。遵守 .local/deepseek-harness 只读、只用外置插件扩展、
tracked worktree clean、无需保留历史 dogfood fixture、每个大步骤独立且精确提交的边界。

M0–M4.2、Turn File Change Journal 与 Integrated Terminal side panel 已完成；需要细节时再按
doc/README.md 索引读取对应 milestone，不要递归读取整个 doc/，也不要重构已签收切片。

Activity dashboard 的三笔原提交已经独立 revert，Browser integration 已暂停；Traffic/Task Board
继续暂缓。alpha 分支只使用固定官方 alpha.1 release artifacts、独立 DSH_HOME/profile/3091，
不得从 reference 源码运行。Codex App Server self-development loop、原生 Agent preset 与
codex-app-server system preset、DSH-native openai-codex OAuth/Turn/tool/approval/Security/Journal/
usage/restart 均已签收；codex-inspired 暂不提供选项。

完整 alpha parity 仍是合回主线的 release gate；E0/CI.0 因原 graph 只是 runtime span tree 而重新
打开。先读 doc/milestones/loop-inspector.md 与 doc/roadmap/loop-inspector-workflow-editor.md，完成
静态 backend logic graph：blueprint 是主体，runtime trace 只叠加 active/visited/usage/duration，
Timeline 保留逐次证据；App Server 私有内核显示为 opaque。E1–E3 暂停，不包含 E4。Inspector
失败只能降低可见性，不得影响 Turn，也不得展示 reasoning、credential、secret prompt 或未脱敏
tool arguments。`codex-inspired` 在完整 parity gate 前不可点击。不要读取
或管理 OAuth token，不修改 DSH 源码，不实现
第二套 Session/Subagent/Task/PTY/compaction/approval/usage 内核，也不要捆绑 Browser、Boards、
Cloud/Remote/PR、Side Chat 或 merge-back。
```
