# Aezy

Aezy 是基于 DeepSeek Harness（DSH）公开扩展机制构建的独立编程 Agent。Aezy 不修改或 fork DSH 的内部插件；所有产品能力通过仓库外置的 Cordis 插件、bundle 和 profile patch 覆盖或补足。

## 仓库布局

- `reference/deepseek-harness/`：只读 DSH 上游参考源码，当前固定在 `dsh-v0.1.0-rc.7`（`99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`）。
- `reference/dsh.lock.json`：DSH 来源、revision、Git tree 和本地参考路径的机器可读锁定记录。
- `doc/`：Aezy 的功能基线、DSH 插件审计和 Codex Desktop 差距报告。
- 后续 Aezy 源码将放在根目录的独立插件、bundle 和应用目录中，不写入 `reference/deepseek-harness/`。

## 扩展边界

Aezy 只依赖 DSH 发布的 package、服务、事件、slot、Remote API 和 profile/bundle 接口。缺失能力应由新的 Aezy 插件提供；默认行为应由 Aezy bundle/profile patch 覆盖。即使上游实现薄弱，也不在参考树中直接修补。

DSH 更新以新的已审核上游 revision 整体替换参考树。Aezy 插件通过端到端测试证明与所支持 DSH revision 的兼容性。

## 研究资料

- [Codex Desktop / Harness 功能表](doc/codex-functions.md)
- [DSH 内置与第一方插件功能报告](doc/reports/dsh-plugin-function-report.md)
- [DSH 第一方包与插件逐项清单](doc/reports/dsh-first-party-package-inventory.md)
- [DSH Web 与 Codex Desktop 功能差距报告](doc/reports/dsh-web-vs-codex-desktop-gap-report.md)
