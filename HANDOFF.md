# Aezy 项目交接

> 更新日期：2026-09-05<br>
> 仓库：`/home/aaron/repos/aezy-dsh-mvp`<br>
> 分支：`main`（`alpha` 已 fast-forward 合入）<br>
> 功能基线：Codex-backed Aezy self-development loop（Complete）；alpha DSH-native
> OpenAI/Codex provider（Complete）；E0.1 Loop Inspector revision 3（Candidate：等待产品验收）；
> Codex-inspired E1 既有 dogfood 保留（新增 parity 暂停）；
> Aezy-owned OpenCodex + DeepSeek 真实受治理开发 / restart continuation 已验证

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

- 分支运行版本：`@deepseek-ai/dsh@0.1.2-rc.1`（官方 npm family / 3091）
- 对应 tag/commit：`dsh-v0.1.2-rc.1` / `a66e4702047846cdaa10c66c9d3df3951f5ea70d`
- 只读本地参考版本：`dsh-v0.1.2-alpha.1` / `cd5ef8148158c3a752a658978873241fdf8e2bbc`
- 参考锁定文件：`reference/dsh.lock.json`
- 兼容性声明：`compatibility/dsh.json`
- alpha 开发状态目录：`~/.aezy-alpha/dsh/`
- 主线历史状态目录：`~/.aezy/dsh/`
- 仓库 pnpm store：`.local/pnpm-store/`

2026-09-01 已完成 alpha.1 → alpha.3 影响审计与迁移。alpha.3 的 244-package 官方 npm family
全为同一精确版本且逐项锁定 SHA-512；selector 不再默认消费 alpha.1 source-release tarballs。
迁移先在 `/tmp` 独立 DSH_HOME/profile/3193 验证，再提升 `~/.aezy-alpha/dsh` 的 `aezy-alpha`
profile，保留 credentials 与 JSONL Sessions。`.local` 仍是未修改的 alpha.1 historical read-only
snapshot，alpha.3 源码审计使用仓库外可清理 checkout；不要把 `reference/dsh.lock.json` 伪改为
alpha.3。完整审计、integrity、Remote/projection/history/Inspector/restart 证据见
`doc/reference/dsh-0.1.2-alpha3-impact.md`。

2026-09-02 又完成 alpha.3 → alpha.4 迁移。242-package 公开官方 npm family 同版且逐项有
SHA-512；隔离 `/tmp` DSH_HOME/profile/3294 和提升后的 3091 都通过 composition/Web/Workspace/
Session/modes/native provider/Codex App Server/revision 1/history/RemoteError/governed write/cold
restart。真实 write 暴露 alpha.4 已移除 `session.events` getter，Security、workflow 与 Codex adapter
三个外置 consumer 已直接迁到 `snapshotEvents()`，没有保留 alpha.3 shim。完整证据见
`doc/reference/dsh-0.1.2-alpha4-impact.md`。

2026-09-04 完成 alpha.4 → alpha.5 → rc.1 审计与迁移。alpha.5 与 rc.1 除 package 版本字段外
byte-identical；242-package 官方 npm family 同版且逐项有 registry SHA-512。唯一实质变化是
DSH-owned storage/projection-cache 增加 compatible versions 与损坏派生记录 backup-and-skip。
隔离 `/tmp` DSH_HOME/profile/3395 与正式 3091 均通过 composition/Web/Workspace/Session/modes、
native provider、Codex App Server、未修改的 codex-inspired revision 1、history/RemoteError、两条
governed write、alpha.4 Session/cache carryover 和 cold restart。Aezy runtime seam 无需适配，也
没有建立 alpha.4 兼容层。完整证据见 `doc/reference/dsh-0.1.2-rc1-impact.md`。

当前外置包：

- `packages/aezy-base`：Host/base composition patch；alpha 薄启用 DSH-owned
  `openai-codex` provider 与 authorization seam。
- `packages/aezy-web`：Web composition 与 Aezy preset。
- `packages/aezy-brand`：品牌 slots。
- `packages/aezy-project`：Project、Turn Journal、Git enrichment、Worktree/Handoff、
  Review/Files panel 与 Contextual References。
- `packages/aezy-security`：Approval Rules、Network Policy 与审计。
- `packages/aezy-terminal`：DSH PTY 的 Session-scoped Host bridge 与右侧 Terminal panel。
- `packages/aezy-codex`：官方 App Server process/protocol client、独立 Codex home、runtime-bound
  Session↔Thread/Turn、stream/activity/cancel/resume 薄适配。当前 Settings 显示受管路由与模型，
  不导入个人 OAuth，OpenCodex 模式拒绝 ChatGPT login/logout。
- `packages/aezy-opencodex`：固定官方 npm `@bitkyc08/opencodex@2.42.0` / Bun `1.4.0`，
  独立 home/catalog/动态 loopback 端口。凭据由 DSH `llm-deepseek` settings / credentials owner
  提供；Codex 仍拥有 agent loop，写操作仍回 DSH approval/Security/Journal。
- `packages/aezy-mode`：alpha-only 原生 preset 装配、`codex-app-server` system overlay、
  per-preset catalog UI 与 Host provider fence。
- `packages/aezy-inspector`：只读 Session event projector、LoopTrace contract、header 与
  revision 3 双 backend full logic graph / runtime overlay / evidence timeline；40/59 与 41/54
  topology 按 owner lane 呈现，不拥有 loop、history、usage 或控制状态。
- `packages/aezy-layout`：只在 desktop 拖拽期间接管现有 details resize handle，将 Chat/details
  共享内容区的下限/上限设为 25%/75%；不替换 AppFrame、slot、open/close 或窄屏 overlay。
- `packages/aezy-workflow`：alpha-only immutable system LoopDefinition、capability resolver 与
  DSH public Agent/tool/LLM hook compiler/controller；内部 codex-inspired revision 仅显式 dogfood，
  普通 roster 不可见，不拥有 DSH micro-loop。

## 3. 当前产品基线

下列 E0 之前的切片均为 **Complete**；E0 是等待产品验收的 corrected candidate：

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
| Codex loop | Aezy-owned OpenCodex / DeepSeek、DSH dynamic tools、受治理开发与同 Thread restart | `doc/milestones/codex.md` |
| Agent modes | standard/PTC/minimal/creative、legacy aezy、Codex App Server preset | `doc/milestones/mode-presets.md` |
| Native provider | DSH-owned OAuth、OpenAI/Codex model、原生 tool/approval/Security/Journal/restart | `doc/milestones/native-provider.md` |
| E0.1 | revision 3 双 backend full logic graph、durable overlay、Timeline、live/cold/restart parity（candidate） | `doc/milestones/loop-inspector.md` |
| E1 slice | immutable Codex-inspired macro loop、DSH hook compiler、真实 native Turn + restart、governed write（internal/pending parity） | `doc/milestones/codex-inspired.md` |

`openai-codex` 是 standard/PTC/minimal/creative 可用的 DSH-native provider；
`codex-app-server` 仍只使用 `aezy-codex`。两者的模型可能同名，但 agent loop owner 不同。

2026-09-05：个人 Codex config 的 `openai_base_url` 指向 `127.0.0.1:10100`，这是旧 Aezy 进程
继承个人 OpenCodex 路由的来源。现在 Codex 使用 `DSH_HOME/aezy/codex-runtime`，OpenCodex 使用
`DSH_HOME/aezy/opencodex`；不复制个人 config/catalog/history/OAuth。旧无 runtimeId 的 binding
原样保留但拒绝跨 home 自动 resume，请新建 Codex Session。仅 Linux/WSL x64 已支持；同 UID
的全局 kill/restart 不属于配置隔离保证，强隔离需另行引入 OS 用户或容器。

真实 profile 暴露并修正旧 mode fence：standing preset 的 `agent/request` 仍看到 seed model，
最终 provider 验证现在位于公开 `llm/stream`；不能回退成修改 seed 或放宽门禁。OpenCodex
采用官方 `codexToolMode: shell` 暴露直接 DSH dynamic tools；不关闭未声明工具检查，不提高
Codex 的 native read-only 权限。provider 配置/凭据变动后须重启 Host；usage 尚未映射到 DSH，
Inspector 仍诚实标记 partial。详细证据与复验命令见 Codex milestone。

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

本次独立 OpenCodex/DeepSeek 真实开发闭环已通过后，同一插件已同步至
`~/.aezy-alpha/dsh` / `aezy-alpha`。正式 3091 最小 Web/runtime smoke 返回 connected，
独立 gateway 为 `127.0.0.2` 动态端口，模型仅 `deepseek-v4-flash` / `deepseek-v4-pro`，
凭据来源 `DSH credentials (file)`，凭据文件 mtime 未变。smoke 没有付费模型请求。
验证后所有本次 Host 已停止，3091 未监听；新会话须重新检查，不能仅相信此处的运行时状态。

alpha Host 已完成本次 rc.1 启动/重启与 governed write 验收后停止；新会话仍必须重新检查。
其
DSH_HOME/profile 与主线历史状态完全分离，启动命令为：

```bash
pnpm run alpha:web -- --host 127.0.0.1 --port 3091 --no-open
```

历史 managed ChatGPT/3090 验收由 `doc/milestones/codex.md` 保留，不代表现在使用个人账户。
独立临时证明目录 `/tmp/aezy-opencodex-e2e-uNKR9m` 只供复查，可在确认无进程后清理；
不是第二套开发 runtime，也没有替换当前 DSH profile 的 credentials/Sessions。

## 5. 最小复验入口

2026-09-05 全量本地回归：124 pass / 0 fail / 1 opt-in process test skipped；该官方 package
process test 已在宿主环境另行通过。真实 DeepSeek 开发、审批、Network deny、Journal/Review、
Inspector partial、分页、restart 与同 Thread continuation 均通过；正式 3091 无付费 smoke 通过。
新增入口：`pnpm test:opencodex`、`pnpm test:opencodex:profile`。真实付费 gate 必须使用独立
`/tmp/aezy-opencodex-e2e-*` profile 与显式 `AEZY_OPENCODEX_REAL_PROOF=1`。

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
pnpm run test:layout
pnpm run test:workflow
pnpm run test:alpha:runtime
# 仅在以 AEZY_CODEX_INSPIRED_DOGFOOD=1 启动的独立/已授权 Host 上：
AEZY_ALPHA_GATE_TOKEN=<launch-token> pnpm run test:alpha:migration
git diff --check
```

已有真实 Host 时可运行：

```bash
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:m1:http
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:m2:http
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:m3:http
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:terminal:http
```

以下是此前的历史签收摘要（不是本次新路由的全覆盖声明）：Codex 自动测试 18/18、官方 App Server 实机 structured command gate，
以及上述真实 DSH Codex gates；真实 rc.2 M0 composition smoke；3090 的
Worktree/Journal/Security HTTP 回归，以及 open/send/read、多 PTY、SIGINT、Session/cwd/request
fence 和 `cd /tmp` live cwd 均通过。
浏览器验证确认 1440px 下 Terminal 是 359px 原生 details 列且 Chat 保持选中；680px 下
只显示无溢出的 overlay；reopen、scrollback、双 Session 隔离与 `pageerror=[]` 通过。
rc.1 升级后的串行组合自动门禁为 110 tests pass（107 top-level subtests）；
其中 Inspector 10/10、
workflow 12/12、alpha runtime 13/13、mode 4/4、Codex 20/20；布局单元/Client
门禁 6/6。真实 3091 在 1416px AppFrame 下通过既有 drag handle 将 Chat/details 固定到共享区
25%/75%（284px/852px），details 超过完整 frame 的一半与上游 520px ceiling；680px 下仍为
原生 overlay。真实 3091 双 backend
live/cold trace 与 Host restart exact-prefix digest parity 通过。其他里程碑的完整测试矩阵只在对应
milestone 中维护。

E0.1 revision 3 浏览器门禁：DSH-native 为 5 lanes / 40 nodes / 59 edges，digest
`772d6169735e…`；Codex App Server 为 5 / 41 / 54，digest `9ad35e581aa4…`。Codex 静态图固定
官方 `rust-v0.149.0@758ef40f` 源码，不再把整个 core 标为 opaque；两条 backend 都只有模型推理
保持 OPAQUE。80%/100%、edge Guard、两 workspace/Session、Host restart 与 `pageErrors=[]` 通过。

## 6. 下一步与所有权

当前目标已验证：由 Aezy 外置插件托管独立 OpenCodex，使用既有 DSH DeepSeek 凭据驱动官方
Codex App Server，完成真实受审批开发、测试、Journal/Review、网络 deny、历史分页与 Host
restart 后同 Thread continuation。个人 OpenCodex 与 OAuth 不作为运行依赖。

首选 owner/seam 是官方 Codex `app-server`，不是 Aezy 自写 OAuth 或立即复制 Codex agent
loop。官方接口已提供 ChatGPT managed OAuth（浏览器与 device-code）、凭据持久化/刷新、
`planType`、rate limits/usage、conversation history、approval 和 streamed agent events。Aezy
只通过外置 runtime adapter 启动/连接该进程并投影协议事实。当前固定 npm Codex `0.149.0`，
个人 CLI 版本不是权威；官方 OpenCodex 消费方式固定于 `compatibility/opencodex-runtime.json`。
不把 App Server 协议散入现有 M0–M4/Terminal 包。

近期顺序：

1. 已完成：独立 rc.2 runtime compatibility gate，发布包/lock/profile/3090 均已签收。
2. 已完成：alpha.1 historical reference/source-release gate；随后 alpha.1 → alpha.3 上游影响审计、
   244-package 官方 npm family integrity、独立 3193 migration 与 3091 提升均已通过。之后
   alpha.3 → alpha.4 的 242-package family、独立 3294 与正式 3091 migration 也已通过；随后
   alpha.4 → rc.1 的同规模 family、独立 3395 与正式 3091 migration 通过。rc.1 是 `main` 唯一
   开发 runtime；不保留双 runtime selector。
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
7. 已完成：alpha DSH-native provider。通过 `@aezy/base` 薄启用 rc.1 已有
   `llm-pi-ai/openai-codex` 与 authorization owner；DSH-owned OAuth、真实 standard Turn、
   structured tool、approval、Security、Journal/Review、usage 与 restart-resume 均通过。默认
   DeepSeek model 与 `codex-app-server`/`aezy-codex` 隔离未改变。证据见
   `doc/milestones/native-provider.md`。
8. E0.1 revision 3 candidate：原 runtime span tree 已移除；默认 `Backend Logic` 是 5-lane full
   static topology，durable trace 只叠加可证明的 active/visited/count/usage/duration，Timeline 单独
   保留 occurrence。DSH 图固定 rc.1 源码 owner；Codex 图固定官方 rust-v0.149.0 source 并接入
   public protocol/DSH bridge，只有模型推理 opaque。Inspector 10/10 与真实双 backend DOM/digest/
   live/cold/restart gate 通过，等待产品验收后再决定是否恢复 E0 Complete。
9. 已完成：`alpha` 在 runtime migration 与最小 smoke 通过后以 `285bd5d28e` fast-forward 合入
   `main`；合并没有把后续 codex-inspired parity 混进 runtime upgrade commit。2026-09-05 起
   新 parity 暂停，且不因已合并而降低产品可点击 gate。
10. 旧 E1–E3 实现已通过 revert 撤回，原提交完整保留。E1 已按新边界重新开始：
    `@aezy/workflow` revision 1（digest `f7841cbd49eb…`）描述宏观 coding loop，并只在
    `AEZY_CODEX_INSPIRED_DOGFOOD=1` 暂存 exact preset。真实 Session
    `aezy-codex-inspired-mtfs9w1k` 用 `openai-codex/gpt-5.6-sol` 完成 Turn 1、Host restart 与同
    Session Turn 2；alpha.3 提升后又完成一次 exact revision 1 structured Turn 与 restart gate。
    合入 `main` 后，Session `aezy-codex-inspired-write-mtieqspj` 已证明 Security `ask` → Remote
    `allowed-once` → durable structured `write` → exact file → Journal/Review/usage 的 governed write
    vertical slice。普通启动 system root 仍只有 `aezy` / `codex-app-server`。既有 revision 1 原样
    保留；新增提示词/parity 复刻暂停，不可点击。E2/E3 暂停，E4 不在范围。
    alpha.4 和 rc.1 migration 均保持同一 revision/digest，并在正式 3091 再次通过 governed
    write；这些 runtime commit 没有加入新的 parity。
11. 当前优先 Aezy-owned OpenCodex 的真实工程 dogfood 和必要错误/usage/cancel 契约验证；
    不 fork OpenCodex，不追加多 runtime/DAG/issue dashboard。Traffic/Task Board 继续暂缓。

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
| Desktop Chat/details 比例布局 | `packages/aezy-layout/` |
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
继续暂缓。当前 main 开发线只使用完整同版、integrity-pinned 的官方 rc.1 npm family 与独立
DSH_HOME/profile/3091，不得从 reference 源码运行；本地 reference 仍是 alpha.1 historical snapshot，
不得伪改。Codex App Server self-development loop、原生 Agent preset 与
codex-app-server system preset、DSH-native openai-codex OAuth/Turn/tool/approval/Security/Journal/
usage/restart 均已签收；codex-inspired 已有 internal revision 1 和真实 restart dogfood，但完整
parity 前仍不提供选项。

alpha.3 与 alpha.4 migration 已独立完成并合入 `main`；rc.1 migration 又以独立 commit 通过隔离与
正式 3091 smoke。E0/CI.0
revision 3 的静态 backend logic graph 仍等待产品验收：blueprint 是主体，runtime trace 只叠加
active/visited/usage/duration，Timeline 保留逐次证据；App Server 私有内核显示为 opaque。
codex-inspired revision 1 的 restart 与 governed write vertical slice 已签收，但新增 parity 复刻暂停。
先按 doc/milestones/codex.md 继续 Aezy-owned OpenCodex 的真实工程 dogfood：官方 npm 插件、
独立 home/端口、DSH DeepSeek 凭据和 DSH tools/approval/Security/Journal；不要复用个人 10100 路由。
E2/E3 暂停，不包含 E4。Inspector
失败只能降低可见性，不得影响 Turn，也不得展示 reasoning、credential、secret prompt 或未脱敏
tool arguments。`codex-inspired` 在完整 parity gate 前不可点击。不要读取
或管理 OAuth token，不修改 DSH 源码，不实现
第二套 Session/Subagent/Task/PTY/compaction/approval/usage 内核，也不要捆绑 Browser、Boards、
Cloud/Remote/PR、Side Chat 或 merge-back。
```
