# Aezy

Aezy 是基于 DeepSeek Harness（DSH）公开扩展机制构建的独立编程 Agent。Aezy 不 fork
或修改 DSH 内部插件；产品能力通过参考树外的 Cordis plugin、bundle、profile patch 和
adapter 提供，并尽量复用 DSH 的 Session、Agent、PTY、Subagent、approval 与 UI seam。

## 架构边界

- `.local/deepseek-harness/` 是 ignored、read-only 的上游参考快照；运行时不从中相对导入源码。
- `reference/dsh.lock.json` 与 `compatibility/dsh.json` 是支持版本的机器可读真相源。
- 上游状态机只做薄接入，不在 Aezy 建立第二套 Session、Task、Subagent、PTY、compaction
  或 merge-back 内核。
- 非必要 DSH 组件通过 Aezy profile patch 禁用，不删除或修改上游 package。

当前运行基线是 DSH `0.1.1-rc.2`，tag/commit 为
`dsh-v0.1.1-rc.2` / `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`。默认运行状态位于
`~/.aezy/dsh/`，仓库依赖缓存位于已忽略的 `.local/pnpm-store/`。

只读上游参考快照与 npm runtime 已对齐到同一 rc.2 revision。参考 revision 由
`reference/dsh.lock.json` 记录，runtime 兼容声明由 `compatibility/dsh.json` 记录；升级门禁已
覆盖完整静态测试、真实 profile composition 与 3090 HTTP/PTY 回归。

## 仓库布局

- `packages/aezy-base/`、`packages/aezy-web/`：最小 Host/Web composition 与 Aezy preset。
- `packages/aezy-brand/`：DSH 通用品牌 slots 的 Aezy occupant。
- `packages/aezy-project/`：Project、Turn Journal、Git enrichment、Worktree/Handoff、
  Review/Files panel 与 Contextual References。
- `packages/aezy-security/`：Approval Rules、Network Policy、解释与审计。
- `packages/aezy-terminal/`：复用 DSH PTY registry/platform shell 的 Integrated Terminal
  Host bridge 与右侧 panel。
- `packages/aezy-codex/`：固定官方 Codex App Server runtime 的外置 process/protocol client，
  以及 managed ChatGPT browser/device login、plan/rate/usage 的 Settings 产品面；不读取或返回
  OAuth token，也不默认启用 analytics。
- `doc/`：按 milestone、roadmap、reference 和 archive 分层的项目文档；入口见
  [`doc/README.md`](doc/README.md)。

## 安装与运行

```bash
pnpm install
pnpm run profile:sync
pnpm run test:m0
pnpm run aezy:web -- --host 127.0.0.1 --port 3080 --no-open
```

`profile:sync` 通过 DSH `plugin --profile` 安装 Aezy 外置 bundle/plugins，并组成：

```text
@deepseek-ai/dsh-base
→ @aezy/base
→ @deepseek-ai/dsh-web-app
→ @aezy/web
```

首次真实 Agent Turn 需要在 Web Models 设置中配置可用 provider。`test:m0` 使用发布版 DSH
CLI 和真实 profile/Web/Workspace/Session/preset 链路，不使用替代 runtime。

## 已完成能力

| 切片 | 产品能力 | 记录 |
| --- | --- | --- |
| M0 | 外置 composition、真实 profile、Aezy preset | [`m0.md`](doc/milestones/m0.md) |
| Turn foundation | 非 Git structured Turn journal + optional Git enrichment | [`turn-journal.md`](doc/milestones/turn-journal.md) |
| M1 | Project/Changes、Historical Review、fingerprint-safe atomic Undo/Redo | [`m1.md`](doc/milestones/m1.md) |
| M2 | 持久 Approval Rules、Network Policy 与安全审计 | [`m2.md`](doc/milestones/m2.md) |
| M3 | 受管 Worktree/Session binding 与结构化 Handoff | [`m3.md`](doc/milestones/m3.md) |
| M4.1 | Structured Review、自动刷新 file tree、code/Markdown/image preview | [`m4.md`](doc/milestones/m4.md) |
| M4.2 | `@directory`、Working/Historical `@diff` 与 Contextual Ask | [`m4.md`](doc/milestones/m4.md) |
| Terminal | 多标签、Session-scoped DSH line PTY side panel | [`terminal.md`](doc/milestones/terminal.md) |

关键语义：

- Historical Turn 始终读取 durable ledger object，不用当前 worktree 重算。
- Git 为 Turn journal 提供 repository identity、rename/binary、fingerprint、concurrent 与
  safe Undo/Redo；非 Git structured `write/edit` 仍可 Review，未知 shell 副作用标记
  `partial/unobserved`。
- Review/Files 和 Terminal 在桌面使用 DSH 原生、占据页面空间的 `details` 列，窄屏才降级
  为 overlay。Terminal 只在打开期间动态占用单槽位，关闭后释放，不永久遮蔽 Project panel。
- Terminal transport 是 DSH 0.1.1 的 line-oriented contract，不是 raw browser TTY；Aezy
  不复制 VT/PTY/resize/ConPTY 生命周期。Linux 活动提示符会随 shell `cd` 更新实际 cwd。
- M2 Network Policy 是 Agent tool boundary，不是操作系统防火墙。

## 构建与测试

```bash
pnpm run build:brand
pnpm run build:codex
pnpm run build:m1
pnpm run build:m2
pnpm run build:m3
pnpm run build:terminal

pnpm run test:brand
pnpm run test:m0
pnpm run test:m1
pnpm run test:m2
pnpm run test:m3
pnpm run test:terminal
pnpm run test:codex
pnpm run test:codex:dsh
pnpm peers check
```

已有 Aezy Host 时可运行真实 HTTP/PTY 回归：

```bash
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:m1:http
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:m2:http
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:m3:http
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:terminal:http
```

需要已有 managed ChatGPT 登录时，官方 App Server 实机 contract gate 为：

```bash
pnpm run test:codex:real
```

已有 3090 Host 时，`test:codex:dsh` 通过普通 DSH Session/model-selection/prompt/history 链路
验证 `aezy-codex` provider、Session↔Thread binding、`dsh.bash` structured projection 与 Turn
完成。设置 `AEZY_CODEX_CANCEL=1` 验证 cancel；用同一 Session id 配合
`AEZY_CODEX_RESUME=1` 可在 Host 重启后验证 Thread resume。对 disposable Git fixture 还可运行：

```bash
AEZY_CODEX_WRITE=1 AEZY_CODEX_TEST_CWD=/tmp/example pnpm run test:codex:dsh
AEZY_CODEX_TEST_CWD=/tmp/example pnpm run test:codex:dsh:security
AEZY_CODEX_TEST_CWD=/tmp/example pnpm run test:codex:dsh:approval
```

需要真实模型时再按对应 milestone 运行 `dogfood:*` 命令，不把一次性 dogfood 过程记录复制
到 README。

## DSH 参考树

新的 clone 如需恢复只读参考树：

```bash
git clone https://github.com/deepseek-ai/deepseek-harness.git .local/deepseek-harness
git -C .local/deepseek-harness checkout --detach b150a551b8d465e31e418e1b2eaf5e79bbb7d28e
```

Aezy 的构建和运行仍只消费 npm 发布包；恢复参考树不会改变 runtime composition。升级 DSH
前必须核对不可变 Git tag/commit/tree，并作为独立 reviewed revision replacement 处理。

## 文档与下一步

- 当前接手状态：[`HANDOFF.md`](HANDOFF.md)
- 文档阅读顺序：[`doc/README.md`](doc/README.md)
- 当前所有权与实施路线：[`doc/roadmap/aezy-upstream-ownership-roadmap.md`](doc/roadmap/aezy-upstream-ownership-roadmap.md)

下一主线是 **Codex-backed self-development loop**：固定 Relay 0.1.2 companion 已完成隔离
门禁，但因真实 structured tool/approval 硬约束失败而不进入 Aezy profile。最小外置 runtime
adapter 已接入官方 Codex `app-server`，并在 Aezy Settings 中提供 managed browser/device login、
logout、plan/rate/usage 与 model discovery。`aezy-codex` provider 已完成 DSH Session↔Codex
Thread binding、stream/cancel/restart-resume，以及 `dsh.*` dynamic tool 到既有 Security、approval、
tool event 与 Journal 的薄投影；Codex 原生权限固定 read-only，原生提权 fail-closed。下一验收只剩
Aezy 自身仓库的真实开发 Turn。兼容性证据见
[`relay-dsh-plugin-codex-0.1.2-compatibility.md`](doc/reference/relay-dsh-plugin-codex-0.1.2-compatibility.md)。
第一验收目标是在 Aezy 中对 Aezy 仓库完成真实开发 Turn。

已实现的 Activity dashboard 实验已经通过三笔独立 revert 全部撤销，不再作为后续基础。
Traffic Board 与 Task Board 暂缓；Browser integration 暂停并默认使用外部浏览器。后续若实现
DSH-native Codex-inspired loop，必须作为同一 runtime contract 的可替换 backend，不能复制
DSH 的 Session/Subagent/Task/PTY/compaction/approval 内核。
