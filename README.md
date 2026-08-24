# Aezy

Aezy 是基于 DeepSeek Harness（DSH）公开扩展机制构建的独立编程 Agent。Aezy 不修改或 fork DSH 的内部插件；所有产品能力通过仓库外置的 Cordis 插件、bundle 和 profile patch 覆盖或补足。

## 仓库布局

- `.local/deepseek-harness/`：只读 DSH 上游参考源码，当前固定在 `dsh-v0.1.1-rc.1`（`528c682e061696f5a160f363f236ecbf53cbd006`）。
- `reference/dsh.lock.json`：DSH 来源、revision、Git tree 和本地参考路径的机器可读锁定记录。
- `doc/`：Aezy 的功能基线、DSH 插件审计和 Codex Desktop 差距报告。
- `packages/aezy-base/`、`packages/aezy-web/`：Aezy 的外置 composition 与默认 Agent preset。
- `packages/aezy-brand/`：占据 DSH 通用品牌 slots 的最薄文字品牌插件；暂以字母 `A` 作为图形占位。
- `packages/aezy-project/`：M1 Project/Repository/Changes/turn ledger、M3 Worktree/Session binding/结构化 Handoff，以及 M4.1A structured Review Side Panel 插件。
- `packages/aezy-security/`：M2 持久 Approval Rules、独立 Network Policy、决策解释与审计插件。
- Aezy 源码只放在参考树外的独立插件、bundle 和应用目录中，不写入 `.local/deepseek-harness/`。

DSH 参考树不进入 Aezy 的 Git index，以免数千个上游文件拖慢日常 `status`、diff 和 IDE Git 集成；`reference/dsh.lock.json` 是其来源与 revision 的可提交真相源。新的 Aezy clone 如需恢复本地参考树，可执行：

```bash
git clone https://github.com/deepseek-ai/deepseek-harness.git .local/deepseek-harness
git -C .local/deepseek-harness checkout --detach 528c682e061696f5a160f363f236ecbf53cbd006
```

恢复后应保持该目录只读使用；Aezy 构建和运行仍只消费发布到 npm 的 DSH package，不依赖本地参考树。

## 扩展边界

Aezy 只依赖 DSH 发布的 package、服务、事件、slot、Remote API 和 profile/bundle 接口。缺失能力应由新的 Aezy 插件提供；默认行为应由 Aezy bundle/profile patch 覆盖。即使上游实现薄弱，也不在参考树中直接修补。

DSH 更新以新的已审核上游 revision 整体替换参考树。Aezy 插件通过端到端测试证明与所支持 DSH revision 的兼容性。

## M0：运行 Aezy profile

Aezy 当前固定使用 DSH `0.1.1-rc.1`。依赖缓存写入仓库中已忽略的 `.local/pnpm-store/`；包含凭据、设置、profile 和 session 的运行状态默认写入 `~/.aezy/dsh/`，以确保 DSH 能在 WSL 的原生 Linux 文件系统上执行 owner-only 权限校验。可用 `DSH_HOME` 显式覆盖该位置。首次运行会从旧的 `.local/dsh/` 复制现有状态，但不会复制必须重新生成的 profile `node_modules`。

```bash
pnpm install
pnpm run profile:sync
pnpm run test:m0
pnpm run aezy:web -- --host 127.0.0.1 --port 3080
```

`profile:sync` 通过 DSH 的 `plugin --profile` 路径安装两个 Aezy 外置 bundle、`@aezy/brand`、`@aezy/security` 与 `@aezy/project` 普通插件依赖，并在两个 bundle 之间叠加当前 DSH 安装自带的 Web bundle，将 profile 固定为：

```text
@deepseek-ai/dsh-base
→ @aezy/base
→ @deepseek-ai/dsh-web-app
→ @aezy/web
```

首次真实 Agent turn 需要在 Web 的 Models 设置中配置可用 provider。`test:m0` 不使用模型 mock；它验证发布版 DSH CLI、完整 profile composition、Aezy 禁用策略、默认 preset、真实 Web Host/frontend，以及 Workspace/Session/preset Remote API 链路。当前签收状态见 [M0 里程碑记录](doc/milestones/m0.md)。

## M1：Workspace & Changes

`@aezy/project` 使用公开 `ctx.webServer`、`session/event`、`tools/execute`、`dsh.client`、`conversation.view`、`conversation.chat.turnTail`、`details` 和 `shell.overlay` seam 提供结构化 workspace/repository status/diff、持久 Turn File Change Journal、可选 Git enrichment，以及 Codex 式 Turn change card。非 Git workspace 的 `write` / `edit` 仍会形成稳定 Historical Review；Git 继续补充 fingerprint、rename/binary、concurrent 与 fail-closed Undo/Redo。shell-only 副作用显式标记 partial/unobserved，不伪装完整。完整签收见 [Turn Journal 基础层修复](doc/milestones/turn-journal.md)。

```bash
pnpm run build:m1
pnpm run test:m1
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run dogfood:turn-summary
# 已启动独立 Aezy 测试 Host 时：
pnpm run test:m1:http
pnpm run dogfood:turn-journal
```

M1 已完成签收：真实模型在 Aezy Workspace 中完成跨文件 Turn，随后通过实际 Web `Changes` 查看 diff、部分撤销、整页刷新恢复和 receipt Undo。签收证据、Session id 和 fail-closed 边界见 [M1 里程碑记录](doc/milestones/m1.md)。

## M2：Security Boundary

`@aezy/security` 使用 DSH rc.1 的公开 `tools/pre-execute` 与单调 `tools.guard()` seam，在 DSH 原生一次性审批之前执行持久规则。Security view 可设置 global/repository Network Policy，添加、查看和撤销 deny/ask/allow 规则，并查看经过脱敏的近期决策审计。

默认 Network Policy 为 `ask`。它覆盖 Agent 发起的网络工具与 shell 命令；未知 shell 在 `ask`/`deny` 下按 `possible network` 保守处理。模型服务和 DSH control-plane 流量不在此工具边界内，这也不是操作系统级网络沙箱。M2 的完整签收证据见 [M2 里程碑记录](doc/milestones/m2.md)。

```bash
pnpm run build:m2
pnpm run test:m2
pnpm run test:m2:http
# 已在 3090 启动真实 Aezy Host 时，可运行真实模型 deny dogfood：
pnpm run dogfood:m2
```

M2 已完成自动与真实模型签收；人工浏览器主题/交互复核项保留在 [M2 安全检查清单](doc/dogfood/m2-safety-checklist.md)。

## M3：Worktree & Handoff

`@aezy/project` 现在提供受管 Worktree identity/lifecycle、DSH Workspace/Session
绑定、结构化 handoff 与 fail-closed cleanup。创建只接收短名称和精确 Git commit，
目标固定派生在 `DSH_HOME/aezy/worktrees/<repository-identity>/`，不会接受任意路径；
dirty Local 必须明确确认，且其 staged/unstaged/untracked 内容不会被暗中复制。

Web `Worktrees` view 可从 Local 创建并打开隔离 Session，在 Worktree 内生成包含
base/head、branch、已提交/未提交文件、Git status、验证结果和接手说明的 handoff，
再归档/释放当前 Session 并回到 Local。清理会拒绝 dirty/conflict、活动 Session、
所有权或路径/branch 漂移、以及没有与当前 HEAD 匹配的 clean handoff；成功时只执行
非强制 `git worktree remove`，保留 branch 和 commits。

```bash
pnpm run build:m3
pnpm run test:m3
pnpm run test:m3:http
# 已启动带真实模型配置的 Aezy Host 时：
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run dogfood:m3
```

M3 已完成真实 rc.1 HTTP 与 Aezy 自仓库模型 dogfood 签收；完整证据、Session、
handoff 和保留分支见 [M3 里程碑记录](doc/milestones/m3.md)。

## M4.1A：Modern Review Side Panel

Turn card 不再在消息流内展开 raw unified diff。Review 与文件行现在打开 Aezy
Session-scoped 右侧 panel：桌面使用 DSH 原生 details column 占据主页面空间并可拖拽，
窄屏降级为全宽 overlay。文件名纵向排列，点击一个文件名只在其正下方展开该文件的
lazy-loaded diff。Working 与 Historical Turn 读取同一 structured DTO renderer，但
来源与 identity 严格分离；Historical 继续读取 ledger object，后续 worktree 漂移不会
改变快照。

Renderer 提供 old/new line number、addition/deletion gutter、sticky file/hunk header、
changed-file lazy navigation，以及 added/deleted/renamed/binary/truncated 和 malformed
raw fallback 状态。完整自动、真实 rc.1 HTTP、Aezy 自身模型 dogfood 与浏览器 QA
见 [M4.1A 签收记录](doc/milestones/m4.md)。

消息流中的 Turn changes summary 使用与 DSH `md-code-block` 相同的 code-block/banner
theme aliases、12px 圆角和 code font；文件明细位于简洁 body，总计位于
`└ +A -D · N files` footer，Undo/Redo 与 Review 保留在 banner action 区。

当前 rc.1/rc.2 没有 generic/additive details router，因此 desktop occupant 会 shadow
上游 Tool Details；这是 docked 布局的已知兼容性代价，未来出现公开 router 后迁移。

后续顺序固定为 M4.1B File Tree + code/Markdown/image Preview（复用同一 panel），
再做 M4.2 `@directory` / `@diff` + 当前 Session Contextual Ask。真正 Side Chat 等待
DSH Interactive Side Sessions/fork/merge-back seam，不在 Aezy 中复制持久会话内核。

## 研究资料

- [Codex Desktop / Harness 功能表](doc/codex-functions.md)
- [DSH 内置与第一方插件功能报告](doc/reports/dsh-plugin-function-report.md)
- [DSH 第一方包与插件逐项清单](doc/reports/dsh-first-party-package-inventory.md)
- [DSH Web 与 Codex Desktop 功能差距报告](doc/reports/dsh-web-vs-codex-desktop-gap-report.md)
- [DSH v0.1.0-rc.8 更新与 Aezy 影响报告](doc/reports/dsh-rc8-update-impact-report.md)
- [DSH v0.1.1-rc.1 更新与 Aezy 影响报告](doc/reports/dsh-0.1.1-rc1-update-impact-report.md)
- [Aezy 上游等待边界与实施路线图](doc/reports/aezy-upstream-ownership-roadmap.md)
