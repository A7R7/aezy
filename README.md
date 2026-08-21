# Aezy

Aezy 是基于 DeepSeek Harness（DSH）公开扩展机制构建的独立编程 Agent。Aezy 不修改或 fork DSH 的内部插件；所有产品能力通过仓库外置的 Cordis 插件、bundle 和 profile patch 覆盖或补足。

## 仓库布局

- `.local/deepseek-harness/`：只读 DSH 上游参考源码，当前固定在 `dsh-v0.1.0-rc.8`（`141eb6fef83422698aef7a981029e843e8161534`）。
- `reference/dsh.lock.json`：DSH 来源、revision、Git tree 和本地参考路径的机器可读锁定记录。
- `doc/`：Aezy 的功能基线、DSH 插件审计和 Codex Desktop 差距报告。
- `packages/aezy-base/`、`packages/aezy-web/`：Aezy 的外置 composition 与默认 Agent preset。
- `packages/aezy-brand/`：占据 DSH 通用品牌 slots 的最薄文字品牌插件；暂以字母 `A` 作为图形占位。
- `packages/aezy-project/`：M1 Project/Repository/Local Environment、Git Changes、turn ledger 与安全 revert 插件。
- `packages/aezy-security/`：M2 持久 Approval Rules、独立 Network Policy、决策解释与审计插件。
- Aezy 源码只放在参考树外的独立插件、bundle 和应用目录中，不写入 `.local/deepseek-harness/`。

DSH 参考树不进入 Aezy 的 Git index，以免数千个上游文件拖慢日常 `status`、diff 和 IDE Git 集成；`reference/dsh.lock.json` 是其来源与 revision 的可提交真相源。新的 Aezy clone 如需恢复本地参考树，可执行：

```bash
git clone https://github.com/deepseek-ai/deepseek-harness.git .local/deepseek-harness
git -C .local/deepseek-harness checkout --detach 141eb6fef83422698aef7a981029e843e8161534
```

恢复后应保持该目录只读使用；Aezy 构建和运行仍只消费发布到 npm 的 DSH package，不依赖本地参考树。

## 扩展边界

Aezy 只依赖 DSH 发布的 package、服务、事件、slot、Remote API 和 profile/bundle 接口。缺失能力应由新的 Aezy 插件提供；默认行为应由 Aezy bundle/profile patch 覆盖。即使上游实现薄弱，也不在参考树中直接修补。

DSH 更新以新的已审核上游 revision 整体替换参考树。Aezy 插件通过端到端测试证明与所支持 DSH revision 的兼容性。

## M0：运行 Aezy profile

Aezy 当前固定使用 DSH `0.1.0-rc.8`。依赖缓存写入仓库中已忽略的 `.local/pnpm-store/`；包含凭据、设置、profile 和 session 的运行状态默认写入 `~/.aezy/dsh/`，以确保 DSH 能在 WSL 的原生 Linux 文件系统上执行 owner-only 权限校验。可用 `DSH_HOME` 显式覆盖该位置。首次运行会从旧的 `.local/dsh/` 复制现有状态，但不会复制必须重新生成的 profile `node_modules`。

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

`@aezy/project` 使用公开 `ctx.webServer`、`session/event`、`dsh.client`、`conversation.view` 和 `conversation.chat.turnTail` seam 提供结构化 repository status/diff、Local Environment 信息、持久 turn-scoped change ledger，以及 Codex 式 Turn change card：总/逐文件 `+/-` 行统计、历史 diff Review、fingerprint 门控的整轮 Undo/Redo 和安全单文件 revert。它不修改 DSH API Proxy 或 SessionEvent 内核。

```bash
pnpm run build:m1
pnpm run test:m1
AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run dogfood:turn-summary
# 已启动独立 Aezy 测试 Host 时：
pnpm run test:m1:http
```

M1 已完成签收：真实 rc.8 模型在 Aezy Workspace 中完成跨文件 Turn，随后通过实际 Web `Changes` 查看 diff、部分撤销、整页刷新恢复和 receipt Undo。签收证据、Session id 和 fail-closed 边界见 [M1 里程碑记录](doc/milestones/m1.md)。

## M2：Security Boundary

`@aezy/security` 使用 DSH rc.8 的公开 `tools/pre-execute` 与单调 `tools.guard()` seam，在 DSH 原生一次性审批之前执行持久规则。Security view 可设置 global/repository Network Policy，添加、查看和撤销 deny/ask/allow 规则，并查看经过脱敏的近期决策审计。

默认 Network Policy 为 `ask`。它覆盖 Agent 发起的网络工具与 shell 命令；未知 shell 在 `ask`/`deny` 下按 `possible network` 保守处理。模型服务和 DSH control-plane 流量不在此工具边界内，这也不是操作系统级网络沙箱。M2 的完整签收证据见 [M2 里程碑记录](doc/milestones/m2.md)。

```bash
pnpm run build:m2
pnpm run test:m2
pnpm run test:m2:http
# 已在 3090 启动真实 Aezy Host 时，可运行真实模型 deny dogfood：
pnpm run dogfood:m2
```

M2 已完成自动与真实模型签收；人工浏览器主题/交互复核项保留在 [M2 安全检查清单](doc/dogfood/m2-safety-checklist.md)。下一主里程碑是 M3 Worktree/Handoff。

## 研究资料

- [Codex Desktop / Harness 功能表](doc/codex-functions.md)
- [DSH 内置与第一方插件功能报告](doc/reports/dsh-plugin-function-report.md)
- [DSH 第一方包与插件逐项清单](doc/reports/dsh-first-party-package-inventory.md)
- [DSH Web 与 Codex Desktop 功能差距报告](doc/reports/dsh-web-vs-codex-desktop-gap-report.md)
- [DSH v0.1.0-rc.8 更新与 Aezy 影响报告](doc/reports/dsh-rc8-update-impact-report.md)
- [Aezy 上游等待边界与实施路线图](doc/reports/aezy-upstream-ownership-roadmap.md)
