# Aezy 项目交接

> 更新日期：2026-08-25<br>
> 仓库：`/home/aaron/repos/aezy-dsh-mvp`<br>
> 分支：`main`<br>
> 功能基线：`38ff79419a feat(activity): project DSH runtime status dashboard`

本文件只记录“下一位接手者现在必须知道的事实”。完整实现、测试和 dogfood 证据请沿
链接阅读 milestone/report，不在这里重复。

## 1. 不可破坏的边界

1. `.local/deepseek-harness/` 是 ignored、read-only 的上游参考快照。不得编辑、格式化、
   生成、patch 或提交其中内容。
2. Aezy 运行时只消费 npm 发布的 DSH packages；不得从参考树相对导入源码。
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

- 运行版本：`@deepseek-ai/dsh@0.1.1-rc.1`
- 对应 tag/commit：`dsh-v0.1.1-rc.1` / `528c682e061696f5a160f363f236ecbf53cbd006`
- 锁定文件：`reference/dsh.lock.json`
- 兼容性声明：`compatibility/dsh.json`
- 默认状态目录：`~/.aezy/dsh/`
- 仓库 pnpm store：`.local/pnpm-store/`

2026-08-25 最后复核的最新公开 tag 是 `dsh-v0.1.1-rc.2`
（`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`）。rc.2 仍没有 Aezy 所需的 generic
panel router、browser raw TTY/resize 或 Interactive Side Sessions/fork/merge-back 产品 seam；
Aezy 继续运行已完整签收的 rc.1。新里程碑开始前必须重新检查 tag，不要用 npm `latest`
推断版本；升级应作为独立、reviewed revision replacement。

当前外置包：

- `packages/aezy-base`：Host/base composition patch。
- `packages/aezy-web`：Web composition 与 Aezy preset。
- `packages/aezy-brand`：品牌 slots。
- `packages/aezy-project`：Project、Turn Journal、Git enrichment、Worktree/Handoff、
  Review/Files panel 与 Contextual References。
- `packages/aezy-security`：Approval Rules、Network Policy 与审计。
- `packages/aezy-terminal`：DSH PTY 的 Session-scoped Host bridge 与右侧 Terminal panel。
- `packages/aezy-activity`：DSH Session/Job/Subagent/interaction/usage 的只读 Activity dashboard。

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
| Activity | Status、Usage、Notifications 与 recent/background activity 薄 dashboard | `doc/milestones/activity.md` |

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
- Activity 不拥有通知 inbox 或 usage/task ledger。Notifications 是 DSH `pendingInteraction`、
  `completed` 和 failed Job 的 render-time 派生；usage/trajectory 只读 durable projections，
  Terminal 只轮询既有 fenced list endpoint。projection 缺失必须显示 unavailable，不能补算。

## 4. 当前 Git 与 Host 状态

Tracked worktree 在本次交接整理前为 clean。用户已有以下未跟踪项，必须保留且不得纳入
普通实现或 handoff 提交：

```text
doc/dogfood/codex-change-card-demo/
doc/dogfood/turn-changes-demo/
test.md
```

交接时 Aezy Web 正在监听：

```text
http://127.0.0.1:3090
```

它已在 Activity dashboard 完成后正常 SIGTERM/restart，并通过真实 projection/Terminal HTTP
smoke。当前 checkout 的 browser bundles SHA-256：

```text
aezy-terminal  9ee61ac87995cfdbf35c0915e8a59ec19e4e5671a41f13d83e343412d47136f4
aezy-activity  dac5432d1461a888546dc1ff4c2e927fff53258b1dbe50a4a8928fb7836f2c5d
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
pnpm run test:activity
git diff --check
```

已有真实 Host 时可运行：

```bash
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:m1:http
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:m2:http
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:m3:http
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:terminal:http
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:activity:http
```

当前签收结果摘要：Activity 2/2、Terminal 7/7、peer check、真实 rc.1 M0 composition 与
3090 projection/Terminal HTTP smoke 均通过。Activity 浏览器验证确认 1440px 下是 359px 原生
details 列、680px 下是全宽无溢出 overlay；Session/Terminal projection 隔离与
`pageerror=[]` 通过。其他里程碑的完整测试矩阵只在对应 milestone 中维护。

## 6. 下一步与所有权

下一切片固定为 **localhost Browser + browser interaction**。

目标是让本地前端 coding loop 能发现/启动 localhost 页面，提供 screenshot、click/type/scroll
与可审计证据。开工前重新检查最新 DSH tag、browser/tool/approval seam 与权威 owner；先做
最小纵向切片，不扩成远程桌面、Cloud browser fleet 或通用 Computer Use。

真正 Side Chat、DAG branch merge 和统一 harness agent loop 需另做所有权设计，并等待/复用
成熟的 DSH public seam；Remote/PR 与 merge-back 也不应顺手捆入 Browser 切片。

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
| Activity/Status/Usage/Notifications client | `packages/aezy-activity/` |
| Profile 同步与启动 | `scripts/sync-profile.mjs`、`scripts/run-profile.mjs` |
| 文档入口与阅读分层 | `doc/README.md` |
| 当前 milestone 证据 | `doc/milestones/` |
| 活动所有权路线 | `doc/roadmap/` |
| 长期产品与 DSH 参考 | `doc/reference/` |
| 被取代的调研与 dogfood 证据 | `doc/archive/` |

## 8. 已知陷阱

1. 仓库已从 `/mnt/d/projects/repos/aezy-dsh-mvp` 迁到当前 `/home/aaron/repos/...`；不要写回
   旧路径。移动 checkout 后若出现 `ERR_PNPM_UNEXPECTED_STORE`，用 profile sync 重新链接，
   不要把 store 指回旧路径。
2. M2 Network Policy 是 Agent tool boundary，不是 OS firewall；provider/control-plane 流量
   和用户自己启动的 Terminal 进程不受它声明的规则控制。
3. 当前 `details` 是 DSH single slot。Project 是长期 occupant；Terminal 与 Activity 只在打开
   期间按各自优先级动态占用并在关闭时释放。未来 generic panel router 出现后再统一，不要
   复制一个 AppFrame/layout 内核。
4. `authorization` package 已发布，但默认 Web composition/UI 尚未形成完整登录产品链路；
   后续 Auth dashboard 只能薄挂载上游能力，不能另写 OAuth/token-refresh 内核。
5. 当前 Codex Desktop 的 Windows computer-use helper 可能拒绝 WSL `file://` cwd；此前真实
   浏览器 QA 使用 `/tmp` 一次性 Playwright/NSS fallback。这不是 Aezy Web 故障。

## 9. 新会话首条指令

```text
请先完整阅读仓库根目录 HANDOFF.md、README.md 和
doc/roadmap/aezy-upstream-ownership-roadmap.md，检查 git status、当前 DSH tag、3090 Host
以及 HANDOFF 中记录的功能基线。遵守 .local/deepseek-harness 只读、只用外置插件扩展、
保留三个既有未跟踪 dogfood/test 项、每个大步骤独立且精确提交的边界。

M0–M4.2、Turn File Change Journal、Integrated Terminal 与 Activity / Status / Usage /
Notifications 已完成；需要细节时再按 doc/README.md 索引读取对应 milestone，不要从头重跑
或重构已签收切片。

接下来实施 localhost Browser + browser interaction：先检查最新上游 browser/tool/approval
seam 与权威 owner，只服务本地 coding loop 的页面发现/启动、screenshot、click/type/scroll
和证据。不要修改 DSH 源码，不要实现通用 Computer Use/Cloud browser fleet，也不要提前
捆绑 Cloud/Remote/PR、Side Chat、merge-back 或统一 harness agent loop。
```
