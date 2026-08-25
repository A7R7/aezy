# Aezy 项目交接

> 交接日期：2026-08-25<br>
> 仓库：`/home/aaron/repos/aezy-dsh-mvp`<br>
> 当前分支：`main`<br>
> 功能基线：`7188e6298e fix(terminal): expose bounded read truncation`

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
- `packages/aezy-project`：Project/Repository/Changes、Git-independent Turn File Change Journal + optional Git enrichment、M3 受管 Worktree/Session binding/结构化 Handoff，以及 M4 Review + Files + Contextual References Project Panel。
- `packages/aezy-security`：M2 持久 Approval Rules、Network Policy、解释与审计。
- `packages/aezy-terminal`：Session/cwd-fenced Integrated Terminal Host bridge 与 Session-scoped Web view；PTY/shell/process lifecycle 复用 DSH。

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

### M3：Worktree + Handoff

状态：Complete，真实 rc.1 HTTP 和 Aezy 自仓库模型 dogfood 均已签收。

已完成：

- exact base + `aezy/<name>` 的受管 Worktree 创建；
- 固定派生的 `DSH_HOME/aezy/worktrees/<repository-identity>/` 路径，不接受任意 target；
- dirty Local 明示确认，且不隐式复制其 staged/unstaged/untracked 内容；
- 公开 DSH Workspace/Session seam 的 cwd 绑定、导航、archive/release；
- Local/Worktree identity 和每个 linked worktree 独立 Turn ledger；
- base/head、committed/working files、status、验证结果、接手说明的结构化 handoff；
- active Session、active Turn、dirty/conflict、路径/branch drift、stale handoff 的 fail-closed cleanup；
- 非强制 `git worktree remove`，branch/commits 永远保留；
- create/bind/handoff/release/cleanup 进入 M2 Security user-confirmation audit；
- 两个不同 worktree 的重叠 Turn 均保持 `concurrent: false` 且 ledger 互不可见。

真实 dogfood retained branch：`aezy/m3-dogfood-mt3192wf`；handoff：
`6df715fd-151e-40a0-994b-77ba9bdba52a`。完整证据见 `doc/milestones/m3.md`。

### M4.1A：Modern Review Side Panel

状态：Complete，真实 rc.1 HTTP、Aezy 自仓库模型 dogfood 与浏览器响应式 QA 已签收。

已完成：

- Turn card 删除消息流内 inline raw diff，只保留摘要、状态、Undo/Redo 与 Review；
- transient Session-scoped 右侧 panel：desktop 使用公开 `details` slot 占据 AppFrame
  页面空间并复用原生 resize，narrow 使用 additive `shell.overlay`；
- 文件名纵向 accordion 排列，多个文件可同时在各自文件名下方展开 lazy-loaded diff；
- conversation view 不卸载、垂直 scroll state 不重置；desktop 横向 reflow 是预期行为；
- Turn changes summary 已对齐 DSH code-block family：12px radius、code-block/banner
  aliases、code font、无分隔线 file body 和 `└ +A -D · N files` footer；DOM 使用
  Aezy 自有 `aezy-change-surface` / `aezy-turn-changes` 语义 class，不冒用
  `md-code-block`；
- Review 文件 accordion 与 Turn summary 共用 ChangeSurface 和 banner tokens，文件按钮
  为 32px；两处共用 code/config/document/image/style/terminal/data/generic 文件图标；
- Turn summary 文件行独立保持 28px，不随 side panel 的紧凑按钮缩小；整行在 pointer
  hover 或 keyboard focus 时使用 DSH interactive hover alias 提亮；
- Review accordion 使用去重的 `expandedPaths` 集合；多个文件可同时展开，每个文件
  维护独立 document/error/loading、AbortController 和 generation guard。再次点击只
  折叠并取消该文件请求，不关闭 panel，也不卸载或重载其他已展开文件；
- Historical Review 不再显示 per-file status/snapshot hash、重复 `Turn N` part header 或
  raw `@@` hunk header；特殊状态留在紧凑文件行和专用空状态，多 hunk 使用轻量间隔；
- Working/Historical 共用 structured diff DTO 与 renderer；
- old/new line number、addition/deletion/status gutter、sticky expanded-file banner；
- added/deleted/renamed/binary/truncated/malformed raw fallback；
- Historical path-required 单文件 object lazy load，后续 worktree 漂移不改变快照；
- AbortController + generation + active identity 防止快速切换旧响应覆盖；
- Light/Dark、1440/1280/680 viewport 与多文件 Working navigation 浏览器验证。

完整证据见 `doc/milestones/m4.md`。

### M4.1B：File Tree + code/Markdown/image Preview

状态：Complete，自动、真实 rc.1 HTTP、真实模型与宽/窄、深/浅浏览器 QA 已签收。

已完成：

- M4.1A controller 已提升为 Session-scoped Project Panel controller，同一个 desktop
  `details` / narrow `shell.overlay` occupant 内切换 Review 与 Files；
- 纵向 file tree 按目录懒加载，不建立持久 index/watch state；Session/cwd 切换立即关闭；
- root 与展开目录使用 1500 ms、fingerprint 门控、可取消的 bounded refresh；文件新增/删除
  自动投影，折叠目录不轮询；
- code preview 复用 DSH `ReadBlock`，Markdown 复用 `MarkdownText`，常见位图用 Host
  magic-byte 分类后的 bounded data URL；
- tree 最多 500 entries，文本最多 256 KiB / 4000 行，图片最多 5 MiB；`.git`、越界、
  symlink、binary 与 oversized fail closed；
- 预览以 `sessionId + cwd + path + revision` 隔离，AbortController 与 active identity
  防止快速切换的旧响应覆盖；
- Changes、Turn 文件行、结构化 Handoff changed-file list 均可跳转；Handoff 当前只读取
  当前 Session workspace 的同路径文件，不冒充 historical handoff snapshot；
- M1 fingerprint/concurrent/Undo/Redo、M3 Worktree/Handoff 权威事实均未改变。

完整边界、限制、Session 与浏览器证据见 `doc/milestones/m4.md`。

### M4.2：`@directory` / `@diff` + 当前 Session Contextual Ask

状态：Complete，自动、真实 rc.1 HTTP、真实模型、Historical 漂移与宽/窄浏览器 QA
已签收。

已完成：

- 通过发布版 `inputTriggers.registerSource` 增加 `aezy-project-context`，与上游
  `@file/@session` 共用 reference occurrence、codec、取消和 submit serialization；
- `@directory:` 直接复用上游 `remote.fileReferences.list` 的 directory candidates，
  没有第二份文件索引或 browser scan；
- canonical `aezy-directory:` / `aezy-diff:` URI 携带 Session/cwd/path/source/Turn identity，
  malformed、跨 Session/cwd、超出 3 refs 全部 fail closed；
- 公开 `agent/pre-step` 把 direct mention 投影为可读标签，并追加 durable、untrusted、
  bounded `aezy-project` context injection；不修改消息、Session 或 composer 内核；
- Directory 最多 200 entries / 80 files / 每文件 16 KiB / 64 KiB 内容；diff 最多
  40 files / 2000 lines / 16 KiB raw fallback；每 reference 最终 96 KiB rendered hard limit；
- Working diff 在 submit 时读取当前 Git facts；非 Git 明确 unavailable；Historical 只读
  指定 Turn ledger objects，当前文件漂移后内容保持不变；
- Files 的 workspace/目录 Ask 与 Working/Historical Review 的 diff Ask 只通过标准
  `inputActions.setDraft` 追加到当前 Session 草稿，成功后关闭 panel；不自动发送、不创建
  Side Session。

完整边界、limits、Session `m42-browser-qa` Turn 2–5、浏览器与 Historical drift 证据见
`doc/milestones/m4.md`。

### Integrated Terminal UI

状态：Complete，自动、真实 rc.1 PTY/HTTP、Aezy 自仓库与宽/窄、深/浅浏览器 QA 已签收。

已完成：

- 外置 `@aezy/terminal` 挂载发布版 DSH terminal registry 与 platform bash/pwsh backend；
- exact live Session/cwd/Agent fence；cold、cwd drift、foreign 与模型自有 terminal fail closed；
- 公开 `conversation.view` 中占据主内容区的 Terminal tab，不使用 floating overlay，也不
  侵占 Project details panel；
- 每 Session 最多 8 个 UI PTY tabs，支持 line input、Shift+Enter、per-tab history、bounded
  scrollback polling、SIGINT、exit/PID/backend status 和显式关闭；
- Chat/Terminal 切换恢复 DSH registry 中的 PTY；Session/Workspace 切换不串内容；owner/Host
  dispose 继续由 DSH awaited cleanup；
- 不复制 PTY/job/shell/Windows persistent PowerShell/ConPTY/process lifecycle，不引入 xterm。

重要限制：DSH 0.1.1 公开的是 line-oriented terminal contract，没有 raw byte input 或 resize
API。因此当前产品明确显示 `Line terminal`，不支持 full-screen TUI/完整 VT emulation；Host
restart 不恢复进程。完整证据见 `doc/milestones/terminal.md`。

### Turn File Change Journal 基础层修复

状态：Complete，真实 rc.1 HTTP、Git/非 Git 模型 dogfood 均通过。

已完成：

- 非 Git cwd 不再因 `git rev-parse` 产生 Session sticky observer error；Project 与 ledger
  API 返回 200，并显式暴露 `repository.available/gitAvailable`；
- 通过公开 `tools/execute` seam 观察成功 DSH `write` / `edit` 的结构化
  `path/before/after/operation`，不解析命令文本、不复制文件工具；
- 非 Git Turn object/ledger 按 workspace identity 持久化于
  `DSH_HOME/aezy/turn-journal/`，Historical Review 重启和当前文件漂移后保持稳定；
- Turn 中途 `git init` 保留本 Turn structured snapshot，不补造 Git baseline 或 safe Undo；
  下一 Turn 自动启用原 Git enrichment；
- shell/terminal 等无法证明完整文件影响的成功调用标记 `partial/unobserved`；shell-only
  Turn 也不再显示 unavailable 或伪装完整；
- 原 Git fingerprint、concurrent、rename/binary、atomic Undo/Redo、receipt 和 Worktree
  ledger 语义保持不变。

完整证据见 `doc/milestones/turn-journal.md`。

## 4. DSH 基线与最新上游复核

M4.2 开工时再次确认最新公开 tag 仍为 `dsh-v0.1.1-rc.2`（commit `b150a551…`，tree
`53915efe…`）。rc.2 没有新增 Worktree/Handoff 或相关环境内核，M3 所有权不变；
关键 layout/slot/theme 文件也没有新增 generic/additive details panel router。按
2026-08-23 docked 产品要求，Aezy desktop 有意占用公开 `details` single slot，narrow
继续用 `shell.overlay`；这会 shadow 当前 Tool Details，是迁移到未来 panel router
前的已知兼容性代价。Aezy 仍运行已完整验证的 rc.1，rc.2 升级应保持为独立 reviewed
revision replacement。rc.2 也没有新增 generic project-context resolver；M4.2 因此只用
发布版 input-trigger、file-reference Remote、agent/pre-step 与 DSH durable message seam，
没有复制 `@file/@session`。复核结果已写入 `compatibility/dsh.json` 和 M4 里程碑记录。

### 0.1.1-rc.1 调查结论

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
- `pnpm run test:m1` → 22/22
- `pnpm run test:m2` → 11/11
- `pnpm run test:m3` → 6/6
- `pnpm run test:m0` → composition/Web/Workspace/Session/preset smoke passed
- `pnpm run test:terminal` → 7/7
- `pnpm run test:terminal:http` → 真实 DSH PTY open/send/read、多 tab、SIGINT、Session/cwd fence passed
- `pnpm run test:m1:http` → Git/non-Git ledger、Turn Review、batch Undo/Redo、request fence passed
- `pnpm run test:m2:http` → policy、precedence、request fence、restart persistence passed
- `pnpm run test:m3:http` → Worktree Session、handoff、拒绝路径、retained branch、Security audit passed
- `pnpm run dogfood:m3` → Aezy 自仓库真实模型隔离 Turn、test、handoff、cleanup passed
- M4.1A Aezy 自身真实模型 dogfood → Session `m4-review-qa-home`，13/13 passed
- M4.1A docked browser QA → center `1160→800→1160`、scrollTop `391→391→391`、native details `359→451` resize、纵向 accordion 单文件展开、680 overlay
- M4.1A Turn summary browser QA → 与同页 DSH fenced code block 的 background/banner/radius 完全一致，body `13px/22px`，Review action passed
- M4.1A surface follow-up → `build:m1`、M1 16/16、M2 11/11、M3 6/6、brand 1/1、peer check、真实 rc.1 M0 与 3090 M1 HTTP passed；3090 served bundle 与 checkout 字节一致
- M4.1B → Host/API 与 Project Panel 分别提交；M1 18/18、M2 11/11、M3 6/6、brand
  1/1、peer check、diff check 和真实 M0 passed
- M4.1B real Host → `http://127.0.0.1:3091` M1 tree/preview + ledger/Review/Undo HTTP 与
  M3 HTTP passed；served client SHA-256 与 checkout 一致
- M4.1B model/browser → Session `m41b-browser-mt6yx03x`，DeepSeek-V4-Flash 完成真实
  Turn；1440 docked `359px`、680 overlay、code/Markdown/PNG、Review→Files、Session
  isolation、DSH dark/light palette 均 passed，pageerror 为空
- M4.2 → commits `b1acc596a8` / `9b7d1b1652` / `5a92271843`；展开 tree 自动增删，
  canonical refs、Session/cwd fence、Directory/Working/Historical hard limits 与 durable
  context 自动测试 passed；
- M4.2 real Host/model/browser → 临时 `DSH_HOME` 的真实 rc.1 M0、3094 M1 HTTP、M2
  11/11、M3 6/6、brand 1/1、peer check passed；Session `m42-browser-qa` 的 Working
  `@diff`、`@directory:src` 和 Historical Turn 2 context 均由真实模型消费，当前文件漂移
  后 Historical 仍保持原内容；1440 details、680 overlay、三个 Panel Ask、tree 自动增删、
  pageerror 0 passed；
- Integrated Terminal → commits `f22a7f0677` / `bef5cb0ef8` / `7188e6298e`；真实 rc.1 Host 执行
  `printf`/`pwd` 与 SIGINT `sleep 30`，1440 dark/680 light、Chat view persistence、双 Session
  isolation、pageerror 0 passed；
- `pnpm run dogfood:turn-journal` → 非 Git真实模型 `write + edit`、structured Historical Review passed（Session `turn-journal-dogfood-mt6qureu`）
- `pnpm run dogfood:turn-summary` → 原 Git-enriched Turn summary 回归 passed（Session `turn-summary-dogfood-mt6qvc9u`）
- `git diff --check` → passed

交接时用户原有 Aezy Web 仍运行于：

```text
http://127.0.0.1:3090
```

它已在 Integrated Terminal 签收后正常 SIGTERM 并重启到当前 rc.1 profile；root 与
`@aezy/terminal` module 均为 200，served client SHA-256
`224235d5a1e36f3f2de4de0de510583723e9bf208457f1b4b398fb88e45ecdef` 与 checkout
一致，3090 的真实 Terminal HTTP smoke 已通过。继续启动命令为：

```bash
cd /home/aaron/repos/aezy-dsh-mvp
pnpm run aezy:web -- --host 127.0.0.1 --port 3090
```

## 6. Git 与用户文件状态

交接时的功能基线提交：

```text
7188e6298e fix(terminal): expose bounded read truncation
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

## 7. 下一步：Activity / Status / Usage / Notifications

M4.1A/B、M4.2 与 Integrated Terminal 已完成。下一切片固定为
**Activity / Status / Usage / Notifications**：薄投影现有 Session、Job、Subagent、approval、
trajectory 与 terminal 状态，不建立第二套 Task runtime、usage ledger 或通知状态机。

其后顺序是 localhost Browser + browser interaction。M4.2 的 reference hard limits、
Historical ledger truth、Session/cwd fence 与 Project Panel current-Session Ask 不应在
后续状态面工作中泛化重构。

不要继续把 Worktree 扩大成 PR/Cloud/Remote，也不要实现 DSH 很可能自行维护的
Task/Session/Subagent/merge-back 内核。真正 Side Chat 等 DSH Interactive Side
Sessions/fork/merge-back 公开 seam 成熟后再做。

开始前重新检查上游 tag 与 runtime diff，确认选中能力仍由 Aezy 拥有。若实现需要改写
PTY、Task、Session、MCP、Subagent 或 compaction 内核，应暂停并重新评估 seam，
不能通过修改 `.local/deepseek-harness/` 绕开。

## 8. 关键文件地图

| 目的 | 文件/目录 |
| --- | --- |
| 项目入口和运行命令 | `README.md` |
| DSH 参考 revision | `reference/dsh.lock.json` |
| 支持的 DSH/runtime composition | `compatibility/dsh.json` |
| 外置 base/web composition | `packages/aezy-base/`、`packages/aezy-web/` |
| Project、Turn Journal、Git enrichment、Worktree、Handoff、client | `packages/aezy-project/` |
| M2 policy、store、client | `packages/aezy-security/` |
| 品牌 slots | `packages/aezy-brand/` |
| Integrated Terminal Host/client | `packages/aezy-terminal/` |
| Profile 同步/启动 | `scripts/sync-profile.mjs`、`scripts/run-profile.mjs`、`scripts/lib/profile.mjs` |
| M0-M4.2、Terminal 与 Turn Journal 签收 | `doc/milestones/m0.md`、`m1.md`、`m2.md`、`m3.md`、`m4.md`、`terminal.md`、`turn-journal.md` |
| 当前路线和所有权 | `doc/reports/aezy-upstream-ownership-roadmap.md` |
| DSH rc.1 影响 | `doc/reports/dsh-0.1.1-rc1-update-impact-report.md` |
| DSH 插件审计 | `doc/reports/dsh-plugin-function-report.md` |
| DSH Web/Codex 差距 | `doc/reports/dsh-web-vs-codex-desktop-gap-report.md` |
| Codex 功能基线 | `doc/codex-functions.md` |

## 9. 已知陷阱

1. 仓库已经从 `/mnt/d/projects/repos/aezy-dsh-mvp` 迁移到 `/home/aaron/repos/aezy-dsh-mvp`。不要把旧路径写回脚本、profile 或文档。
2. 若移动仓库后看到 `ERR_PNPM_UNEXPECTED_STORE`，应让 profile dependency migration/clean install 重新链接；不要把 pnpm global store 指回旧 `/mnt/d`。
3. rc.1 升级时旧 lock/virtual store 曾留下 rc.8 auto peers。当前根 `package.json` 保留
   17 个 DSH foundation peers，并为产品插件显式增加 M4 所需的 `dsh-llm` 与
   `dsh-client-ui-input-trigger` 等直接依赖；不能随意删掉，先证明干净安装仍解析为单一版本。
4. DSH reference 在 `.local/`，目的是避免数千个上游文件拖慢 Aezy Git。不要重新纳入 index。
5. authorization 包已发布但默认 composition/UI 未完成，不能把它当作已交付的 Models 登录产品面。
6. vision model 不是 Browser automation。
7. M2 Network Policy 不是 OS firewall；描述能力时必须保留这一限制。
8. Turn journal 与 Git enrichment 已分层：非 Git 精确覆盖结构化 `write/edit`；shell-only
   只能标记 partial/unobserved，不得宣传为完整。同一 Git checkout 的 concurrent Turn
   仍必须 fail closed；受管 linked worktree 通过不同 root/metadata 隔离。
9. 当前 Codex Desktop task 的 computer-use helper 把 WSL cwd 判为非 Windows local URI，
   报 `sandboxCwd is not a local file URI: file:///home/aaron/repos/aezy-dsh-mvp`。M4.2 按
   skill fallback 将一次性 Playwright Chromium 与缺失 NSS runtime 解压到 `/tmp` 完成
   真实 Host QA；没有修改系统安装，这不是 Aezy Web 错误。
10. 网络命令遵守代理环境变量；缺失时回退 `http://127.0.0.1:7890`。
11. DSH 0.1.1 terminal 是 line-oriented sanitizer/read/send seam，不是 browser raw TTY。不要
    为追求 xterm 外观在 Aezy 复制 PTY/resize/VT 协议；等待上游公开 seam。

## 10. 新对话建议的首条指令

可将下面内容直接交给新对话：

```text
请先完整阅读仓库根目录 HANDOFF.md、README.md 和
doc/reports/aezy-upstream-ownership-roadmap.md，检查 git status、当前 DSH tag
以及 3090 Aezy Host 状态。遵守只读 .local/deepseek-harness、只用外置插件扩展、
保留三个既有未跟踪 dogfood/test 项、每个大步骤单独提交的边界。

M4.1A/B、M4.2 Project Panel/Contextual References、Integrated Terminal 与 Turn Journal
基础层修复已完成；先阅读 doc/milestones/m4.md、doc/milestones/terminal.md、
doc/milestones/turn-journal.md 并复验相关测试。
接下来实施 Activity / Status / Usage / Notifications，只薄投影现有 DSH/Aezy 状态。
不要修改 DSH 源码，不要实现第二套 Session/Subagent/Task/PTY/compaction 内核，
也不要提前扩展 Cloud/Remote/PR。
```
