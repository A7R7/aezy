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

当前 `alpha` 分支只面向 DSH `0.1.2-alpha.1`，tag/commit 为
`dsh-v0.1.2-alpha.1` / `cd5ef8148158c3a752a658978873241fdf8e2bbc`。开发运行状态位于
`~/.aezy-alpha/dsh/`，profile 为 `aezy-alpha`；该分支不承诺兼容 rc.2 runtime。

只读上游参考快照已更新到 immutable prerelease `dsh-v0.1.2-alpha.1`（commit
`cd5ef8148158c3a752a658978873241fdf8e2bbc`），但官方 npm registry 尚未发布对应 DSH family。
由于 npm 尚未发布 alpha.1，经明确授权，本分支在仓库外从固定官方 commit 完整执行
`build:official`、DSH/vendor/Landlock release pack 与官方 packed-install verification，产物只允许
进入独立 3091 candidate，不从 reference 源码运行。参考 revision 由
`reference/dsh.lock.json` 记录，reference/runtime 分离状态由 `compatibility/dsh.json` 记录；
影响与 publication gate 见 [`dsh-0.1.2-alpha1-impact.md`](doc/reference/dsh-0.1.2-alpha1-impact.md)，
source release 证据见
[`dsh-alpha1-source-runtime.md`](doc/reference/dsh-alpha1-source-runtime.md)。

alpha.1 已通过独立 3091 的 composition、Web、Workspace、Session 与 Aezy 外置插件
实机门禁，并完成原生 Agent mode UI、`codex-app-server` system preset、catalog UI/Host 双门禁；
并作为本分支唯一开发 runtime。它使用 `~/.aezy-alpha/dsh`、`aezy-alpha` profile、隔离
Node 24/CMake/pnpm store 和 checksum-pinned 本地 release tarball closure；不会迁移或共享
`~/.aezy/dsh` 的 Session、credentials 与 profile。

## 仓库布局

- `packages/aezy-base/`、`packages/aezy-web/`：最小 Host/Web composition 与 Aezy preset；alpha
  base 只薄启用 DSH-owned `openai-codex` provider/authorization seam，不拥有 transport 或凭据。
- `packages/aezy-brand/`：DSH 通用品牌 slots 的 Aezy occupant。
- `packages/aezy-project/`：Project、Turn Journal、Git enrichment、Worktree/Handoff、
  Review/Files panel 与 Contextual References。
- `packages/aezy-security/`：Approval Rules、Network Policy、解释与审计。
- `packages/aezy-terminal/`：复用 DSH PTY registry/platform shell 的 Integrated Terminal
  Host bridge 与右侧 panel。
- `packages/aezy-codex/`：固定官方 Codex App Server runtime 的外置 process/protocol client，
  以及 managed ChatGPT browser/device login、plan/rate/usage 的 Settings 产品面；不读取或返回
  OAuth token，也不默认启用 analytics。
- `packages/aezy-mode/`：alpha-only 的原生 preset 装配、Codex system preset overlay、
  per-preset model directory 与 Host provider fence；不拥有 Agent/Session/tool loop。
- `packages/aezy-inspector/`：从权威 durable Session events 纯投影 `LoopTrace`，提供 Session
  header、revision 3 双 backend full logic graph（owner lanes、可选择 guard/source）与独立
  evidence timeline；不拥有 loop、history、usage 或控制状态。
- `packages/aezy-layout/`：在保留 DSH AppFrame、slot 与 responsive owner 的前提下，薄扩展
  既有 desktop details resize handle；Chat 最少保留共享内容区的 25%，side panel 最多可占
  75%，窄屏继续使用原生 overlay。
- `packages/aezy-workflow/`：alpha-only immutable LoopDefinition、capability resolver 与 DSH
  Agent hook compiler/controller；首个 `codex-inspired` revision 只允许显式 internal dogfood，
  不复制 DSH micro-loop，也不进入普通 mode roster。
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

需要继续 alpha candidate 开发时，先同步并检查独立 composition，再启动 3091：

```bash
pnpm run alpha:profile:sync
pnpm run alpha:profile:dump
pnpm run alpha:web -- --host 127.0.0.1 --port 3091 --no-open
```

selector 会先校验 251 个官方 release tarball 的 SHA-256，重建并打包 11 个 Aezy 外置包，再用
全量本地 override 安装 workspace closure。只有依赖安装、受审 native scripts 和 alpha CLI
版本验证全部成功才写 completion marker；本分支的 `profile:sync`/`profile:dump`/`aezy:web`
直接指向该 alpha profile，`alpha:*` 只是等价的显式别名。

Alpha native provider 验证命令：

```bash
pnpm run test:alpha:runtime
pnpm run test:workflow
pnpm run test:alpha:native-provider
pnpm run test:mode
pnpm run test:inspector
pnpm run test:layout
# 已授权且 3091 正在运行时：
AEZY_ALPHA_GATE_TOKEN=<launch-token> pnpm run test:alpha:native-turn
AEZY_ALPHA_GATE_TOKEN=<launch-token> pnpm run test:alpha:inspector
AEZY_ALPHA_GATE_TOKEN=<launch-token> pnpm run test:alpha:layout
# 只供内部 parity dogfood；普通启动不会出现该 preset：
AEZY_CODEX_INSPIRED_DOGFOOD=1 AEZY_ALPHA_GATE_TOKEN=<launch-token> \
  pnpm run test:alpha:codex-inspired-turn
```

`standard` Session 已通过 DSH-owned OAuth、真实 `openai-codex/gpt-5.6-sol` Turn、structured
tool、approval、Security、Journal/Review、usage 与 restart-resume gate，且不改变默认 DeepSeek
model 或 `codex-app-server` 的 `aezy-codex` route。证据见
[`native-provider.md`](doc/milestones/native-provider.md)。

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
| Codex loop | Managed ChatGPT、DSH dynamic tools 与 Aezy 自开发闭环 | [`codex.md`](doc/milestones/codex.md) |
| Agent modes | 原生四模式、legacy `aezy`、Codex App Server preset 与双门禁 | [`mode-presets.md`](doc/milestones/mode-presets.md) |
| Native provider | DSH-owned OAuth、OpenAI/Codex models 与原生 agent loop parity | [`native-provider.md`](doc/milestones/native-provider.md) |
| Loop Inspector | 静态 backend logic graph、durable trace overlay、Timeline 与 restart rebuild | [`loop-inspector.md`](doc/milestones/loop-inspector.md) |
| Codex-inspired | 内部 immutable macro loop + DSH hook compiler；完整 parity pending、不可点击 | [`codex-inspired.md`](doc/milestones/codex-inspired.md) |

关键语义：

- Historical Turn 始终读取 durable ledger object，不用当前 worktree 重算。
- Git 为 Turn journal 提供 repository identity、rename/binary、fingerprint、concurrent 与
  safe Undo/Redo；非 Git structured `write/edit` 仍可 Review，未知 shell 副作用标记
  `partial/unobserved`。
- Review/Files 和 Terminal 在桌面使用 DSH 原生、占据页面空间的 `details` 列，窄屏才降级
  为 overlay。Terminal 只在打开期间动态占用单槽位，关闭后释放，不永久遮蔽 Project panel。
- 桌面 `details` 拖拽使用 Aezy 外置比例策略：以 Chat+details 的共享内容区计算，Chat 最小
  25%、details 最大 75%；DSH 继续拥有 AppFrame、panel open/close 与窄屏 overlay。
- Terminal transport 是 DSH 0.1.1 的 line-oriented contract，不是 raw browser TTY；Aezy
  不复制 VT/PTY/resize/ConPTY 生命周期。Linux 活动提示符会随 shell `cd` 更新实际 cwd。
- M2 Network Policy 是 Agent tool boundary，不是操作系统防火墙。

## 构建与测试

```bash
pnpm run build:brand
pnpm run build:codex
pnpm run build:mode
pnpm run build:inspector
pnpm run build:layout
pnpm run build:m1
pnpm run build:m2
pnpm run build:m3
pnpm run build:terminal

pnpm run test:brand
pnpm run test:layout
pnpm run test:m0
pnpm run test:m1
pnpm run test:m2
pnpm run test:m3
pnpm run test:terminal
pnpm run test:codex
pnpm run test:mode
pnpm run test:inspector
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
git -C .local/deepseek-harness checkout --detach cd5ef8148158c3a752a658978873241fdf8e2bbc
```

正式发布后仍优先消费 npm 包；npm 版本缺失期间，本分支只允许使用从上述固定官方 commit、
在仓库外通过官方完整 release path 构建并
通过 packed-install verification 的 package artifacts。它必须使用独立 DSH_HOME/profile/3091，
当前 Remote/controller/client split 与 mode/preset 的隔离 3091 门禁已完成；完整 parity gates
决定何时把 `alpha` 分支合回主线，不再通过同分支双 runtime 兼容来过渡。

## 文档与下一步

- 当前接手状态：[`HANDOFF.md`](HANDOFF.md)
- 文档阅读顺序：[`doc/README.md`](doc/README.md)
- 当前所有权与实施路线：[`doc/roadmap/aezy-upstream-ownership-roadmap.md`](doc/roadmap/aezy-upstream-ownership-roadmap.md)
- 当前产品路线 E0 静态 logic graph 纠正：[`doc/roadmap/loop-inspector-workflow-editor.md`](doc/roadmap/loop-inspector-workflow-editor.md)

**Codex-backed self-development loop 已完成**：固定 Relay 0.1.2 companion 已完成隔离
门禁，但因真实 structured tool/approval 硬约束失败而不进入 Aezy profile。最小外置 runtime
adapter 已接入官方 Codex `app-server`，并在 Aezy Settings 中提供 managed browser/device login、
logout、plan/rate/usage 与 model discovery。`aezy-codex` provider 已完成 DSH Session↔Codex
Thread binding、stream/cancel/restart-resume，以及 `dsh.*` dynamic tool 到既有 Security、approval、
tool event 与 Journal 的薄投影；Codex 原生权限固定 read-only，原生提权 fail-closed。Aezy 已在
受管 Worktree 中通过同一链路修改、测试、Review、Handoff、重启并继续开发自身。完成证据见
[`codex.md`](doc/milestones/codex.md)，Relay 兼容性证据见
[`relay-dsh-plugin-codex-0.1.2-compatibility.md`](doc/reference/relay-dsh-plugin-codex-0.1.2-compatibility.md)。

隔离 alpha.1 已恢复上游 Agent preset UI，并把 Codex App Server 收口为独立 system preset，
完成 per-preset catalog UI 过滤、Host 执行门禁与 Session header 模式显示；证据见
[`mode-presets.md`](doc/milestones/mode-presets.md)。完整 alpha parity gates 仍是合回主线的 release
gate；已完成闭环只按真实 dogfood 故障做 Worktree dependency bootstrap 与 App Server contract
hardening。当前 DSH-owned `openai-codex` 已完成 OAuth、真实
standard Turn、tool/approval/Security/Journal/usage 与 restart-resume gate。E0/CI.0 Loop Inspector
已有 durable Session event projector、只读 Session header、Timeline 与双 backend live/cold/restart
trace accuracy；但原 Graph 只是同一 runtime span log 的树形缩略版，不满足静态 agent-loop 逻辑图
目标，因此 E0 已纠正为 backend-specific node/edge/guard/owner/source blueprint 主图，runtime trace
只叠加 active/visited/count/usage/duration；Codex App Server 不公开的内部控制流显示为 opaque。
实现与双 backend restart gate 已通过，当前等待产品验收。旧 E1–E3 实现已 revert，原 Git 历史
保留；E1 已按新的宏观 workflow 边界重新开始，internal `codex-inspired` revision 1 已完成真实
Turn 与 restart continuation，但完整 parity pending 且不可点击；E2/E3 继续暂停，不包含 E4。
Inspector 不驱动 loop，
且不得展示 reasoning、secret 或未脱敏 tool arguments。

已实现的 Activity dashboard 实验已经通过三笔独立 revert 全部撤销，不再作为后续基础。
Traffic Board 与 Task Board 暂缓；Browser integration 暂停并默认使用外部浏览器。当前
DSH-native Codex-inspired 首个 internal dogfood slice 通过外置 immutable definition 与公共
Agent hooks 编译宏观 coding policy，DSH 继续持有 Session/Subagent/Task/PTY/compaction/approval
内核；在完整 parity gate 前保持不可点击。
