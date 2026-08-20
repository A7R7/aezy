# Aezy

Aezy 是基于 DeepSeek Harness（DSH）公开扩展机制构建的独立编程 Agent。Aezy 不修改或 fork DSH 的内部插件；所有产品能力通过仓库外置的 Cordis 插件、bundle 和 profile patch 覆盖或补足。

## 仓库布局

- `.local/deepseek-harness/`：只读 DSH 上游参考源码，当前固定在 `dsh-v0.1.0-rc.8`（`141eb6fef83422698aef7a981029e843e8161534`）。
- `reference/dsh.lock.json`：DSH 来源、revision、Git tree 和本地参考路径的机器可读锁定记录。
- `doc/`：Aezy 的功能基线、DSH 插件审计和 Codex Desktop 差距报告。
- `packages/aezy-base/`、`packages/aezy-web/`：Aezy 的外置 composition 与默认 Agent preset。
- `packages/aezy-project/`：M1 Project/Repository/Local Environment、Git Changes、turn ledger 与安全 revert 插件。
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

`profile:sync` 通过 DSH 的 `plugin --profile` 路径安装两个 Aezy 外置 bundle 和 `@aezy/project` 普通插件依赖，并在两个 bundle 之间叠加当前 DSH 安装自带的 Web bundle，将 profile 固定为：

```text
@deepseek-ai/dsh-base
→ @aezy/base
→ @deepseek-ai/dsh-web-app
→ @aezy/web
```

首次真实 Agent turn 需要在 Web 的 Models 设置中配置可用 provider。`test:m0` 不使用模型 mock；它验证发布版 DSH CLI、完整 profile composition、Aezy 禁用策略、默认 preset、真实 Web Host/frontend，以及 Workspace/Session/preset Remote API 链路。当前签收状态见 [M0 里程碑记录](doc/milestones/m0.md)。

## M1：Workspace & Changes

`@aezy/project` 使用公开 `ctx.webServer`、`session/event`、`dsh.client` 和 `conversation.view` seam 提供结构化 repository status/diff、Local Environment 信息、持久 turn-scoped change ledger，以及有 fingerprint 冲突拒绝和 Undo receipt 的安全单文件 revert。它不修改 DSH API Proxy、SessionEvent 内核或参考树。

```bash
pnpm run build:m1
pnpm run test:m1
# 已启动独立 Aezy 测试 Host 时：
pnpm run test:m1:http
```

M1 核心实现已经通过真实 DSH Host HTTP 垂直验证；配置真实模型的跨文件 Agent Turn、浏览器部分撤销与刷新恢复仍是最终签收项。当前状态和 fail-closed 边界见 [M1 里程碑记录](doc/milestones/m1.md)。

## 研究资料

- [Codex Desktop / Harness 功能表](doc/codex-functions.md)
- [DSH 内置与第一方插件功能报告](doc/reports/dsh-plugin-function-report.md)
- [DSH 第一方包与插件逐项清单](doc/reports/dsh-first-party-package-inventory.md)
- [DSH Web 与 Codex Desktop 功能差距报告](doc/reports/dsh-web-vs-codex-desktop-gap-report.md)
- [DSH v0.1.0-rc.8 更新与 Aezy 影响报告](doc/reports/dsh-rc8-update-impact-report.md)
- [Aezy 上游等待边界与实施路线图](doc/reports/aezy-upstream-ownership-roadmap.md)
