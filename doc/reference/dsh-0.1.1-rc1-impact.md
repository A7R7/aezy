# DSH v0.1.1-rc.1 更新与 Aezy 影响报告

> 调查日期：2026-08-21<br>
> 上游范围：`dsh-v0.1.0-rc.8`（`141eb6fef`）→ `dsh-v0.1.1-rc.1`（`528c682e`）<br>
> 结论：升级；继续坚持“DSH 只读参考 + 发布包运行时 + Aezy 外置插件”边界。

## 结论摘要

这次更新不是 Codex 工作台能力的大规模补齐，而是一次明显的 Harness 内核与 Web 最后一公里强化。最重要的新能力是持久 credential record 与通用 authorization flow；同时，上游改善了 Subagent 会话头、Session projection、Web 启动注入、权限默认值、bwrap 隔离和多处会话 UI。DeepSeek 直连目录还新增了一个支持图片输入的实验模型。

它对 Aezy 路线的核心影响是：

- 不需要重写授权、Subagent 导航、Session projection 或 Web boot 内核；这些领域继续等待上游并只做薄接入。
- `@aezy/project` 的 Project/Git/turn change ledger/Undo，以及 `@aezy/security` 的持久 Approval Rules/Network Policy 仍然没有上游产品域替代，保留现有外置实现。
- 下一主里程碑仍应是 M3 Worktree/Handoff。此次更新没有带来结构化 Git、turn-scoped change ledger、Worktree 或 Handoff。
- 新 vision model 对将来的截图理解和视觉 QA 有价值，但它不是 Browser automation，也不提供浏览器控制、DOM、登录态或录制回放。

## 发布边界

| 项目 | rc.8 | 0.1.1-rc.1 |
| --- | --- | --- |
| Tag | `dsh-v0.1.0-rc.8` | `dsh-v0.1.1-rc.1` |
| Commit | `141eb6fef83422698aef7a981029e843e8161534` | `528c682e061696f5a160f363f236ecbf53cbd006` |
| Git tree | `24a3336d5c32b32ca7e01a84a08c757bd788c624` | `19e109115f57ace4170caf25dadbb59021126174` |
| 区间提交数 | — | 172 |
| Diff | — | 2,368 files，+23,679 / -11,723 |
| Workspace packages | 226 | 227 |
| 新增 package | — | `@deepseek-ai/dsh-authorization` |
| 删除 package | — | 无 |

2,368 个文件不能直接理解为 2,368 个运行时改动：其中 `.agents/` 940 个、`docs/` 257 个，另有大量双语文档、站点生成物、测试快照与统一版本变更。运行时确有重要变化，但规模远小于总 diff 数字暗示的“全架构重写”。官方 Release 页面没有详细 changelog，因此本报告以 tag 间 Git diff、实现记录和发布包为准：[DSH v0.1.1-rc.1 release](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.1-rc.1)。

## 主要新内容

### 1. Credential records 与 authorization flow

新增 `@deepseek-ai/dsh-authorization`，同时扩展 `dsh-credentials` 和 `llm-pi-ai`：

- 凭据不再只能表示“环境变量名 → API key”，还可以按插件所有权持久保存 API key record 或 opaque grant/OAuth payload。
- 新 authorization seam 允许插件注册登录流程，通过中立的 notice/prompt 协议向人请求输入，并要求 flow 在成功结束前真正提交 credential。
- `llm-pi-ai` 把 pi-ai 的 API key、OAuth/device flow 与 DSH credential record 对接；凭据能在配置重建和重启后继续存在。
- `openai-codex` 不再因只支持 OAuth 而从 provider 目录中被隐藏。
- 旧的 pre-release flat `.credentials.yaml` 会在启动时迁移到版本化的 `refs`/records 文档。

但这版仍缺浏览器端 authorization transport 和 Models 页“登录”控制。上游实现记录明确把 Web surface 列为未完成项；进一步核对 shipped `dsh-base` / `dsh-web-app` patch 与 Aezy profile dump 后，还确认默认 composition 并没有挂载 `dsh-authorization` 实例。当前状态因此是“package/seam 已发布、依赖可安装、默认 Web 产品链路未启用”，用户仍主要通过已有设置表单填 key。Aezy 不应据此宣布 provider onboarding 已完整，也不应另写 OAuth/refresh 内核；正确做法是等待上游 surface，必要时只通过 profile patch 挂载上游插件并提供很薄的外置 UI/bridge。

### 2. DeepSeek 图片输入

`llm-deepseek` 发布 `deepseek-v4-flash-vision-exp` / `DeepSeek-V4-Flash-Vision-Exp`，model catalog 声明 `text,image` modalities，并补齐直连图片输入审查修正。

对 Aezy 的价值是未来可让 Agent 理解截图、设计稿和视觉测试证据。它不会自动产生 Browser automation；浏览器启动、页面控制、DOM/截图采集、网络与审批边界仍需独立能力。

### 3. Subagent 会话头与会话 UI

`ui-conversation` 新增 session-scoped 单席位 `conversation.session.header.lineage`，`ui-subagent` 用它提供合并的标题、祖先导航和 lineage 控件。普通标题仍是 fallback，header actions/utilities 保持独立。

这符合“上游继续完善 Subagent/Job 状态与 UI”的预测。Aezy 不应再实现第二套 Subagent header；将来若需品牌或工作台动作，应占用现有 additive slot，而不是替换 lineage 所有权。

此外 Web 修复或改进了：

- `ask_user_question` 的自由回答支持最多六行自适应 textarea，Shift+Enter 换行；
- 宽 Markdown 表格按列数扩宽，并在 hover 时展示横向 scrollbar；
- 同一 Turn 内模型重试耗尽后，terminal turn error 不再被 retry history 隐藏；
- New Session 的空白会话置顶、拖拽与复用逻辑更稳定；
- composer caret/delete/reference decoration 的若干边界问题；
- cache-hit 百分比接近 100% 时保留更准确的精度。

### 4. Session projection 正确性

Session projection 把 host fold state 与 client-visible view 分成独立类型和 schema：

- 所有 projection unit 统一 checkpoint，不再由 `persist` 选择性跳过；
- 恢复时验证缓存 state，损坏时可回退重放日志；
- host-only state 不进入 wire snapshot；
- host consumer 可通过 `stateOf()` 读取当前折叠状态。

这正是此前预测的 projection/session correctness 收敛。Aezy 当前监听公开 `session/event` 来生成 turn-scoped change ledger，不持有 projection 内部 state；事件 seam 与 scoped event contract 未变，因此不需要迁移到上游私有状态。

### 5. Web index injection 与静态路由

`dsh-host-webserver` 新增 `webserver/index-inject` 结构化注入表，支持 `global`、inline/external script、style 和 HTML row；served Web 与 Worker boot 使用同一份纯数据语义。旧 `tapIndex`/`applyIndexTaps` 仍作为 raw HTML escape hatch 保留，route registration API 也没有被替换。

这给外置插件提供了更干净的 Web boot seam。Aezy 当前 M1/M2 使用 `ctx.webServer.register()` 注册 prefix route，不依赖旧 index transform，所以无需修改。若未来 Aezy 需要注入 bootstrap/CSP/theme 数据，应优先使用新表。

静态前端还改为：缺失 index 或未知静态 path 返回 404，不再错误回退空/错误内容。

### 6. Sandbox 与 permission 修复

- Linux bwrap profile 统一启用 private PID namespace 并挂载匹配的 `/proc`，防止通过 `/proc/<pid>/root|fd|cwd` 绕过文件隔离；不能建立 PID namespace 时会走既有 fail-closed backend ladder。
- 这只增强 bwrap 的进程可见性与文件边界；上游明确说明任何 backend 都没有因此限制网络。
- Permission preset 改善标签和空白默认显示，并在 Web 复用空白 New Session 时，仅对仍是 default-origin、未开始 Turn、未被单独改写的会话刷新默认权限。

所以 `@aezy/security` 的持久 Approval Rules 与独立 Network Policy 仍然必要。bwrap 修复降低了本地执行逃逸风险，但不能替代网络判定，也不会持久化用户审批规则。

### 7. 构建与发布可靠性

- 支持 standalone pnpm entrypoint 的构建路径；
- 发布/CI、双语文档链接和文档站生成得到大量修复；
- ACP、MCP、compaction、shell 目录在本区间主要是统一版本与文档变更，未发现对应运行时 `src`/`tests` 的功能增量。

## 对此前预测的复盘

| 预测方向 | 本版结果 | 评价 |
| --- | --- | --- |
| Profile bundle / 插件设置最后一公里 | credential 基础与 permission 默认刷新；authorization Web surface 未完成 | 部分命中 |
| Subagent + Job 状态与 UI | 新 lineage slot 与 Subagent header switcher；未见新的 Job 产品面 | Subagent 命中，Job 未命中 |
| PTY / persistent shell 跨平台稳定性 | 本区间 shell/PTY 无运行时增量，ConPTY 没有新的产品落地 | 未命中本版 |
| MCP/ACP rich content 与重连 | 本区间无对应运行时增量 | 未命中本版 |
| Session/projection/compaction 正确性 | projection state/view 分离与统一 checkpoint；compaction 本身无新运行时实现 | projection 命中，compaction 未命中 |
| Task Surface | 没有产品实现 | 继续等待上游 |
| Interactive Side Sessions / merge-back | 没有产品实现 | 继续等待上游 |
| Recallable Compaction/history read/search | 没有产品实现 | 继续等待上游 |

总体上，“下一两个 RC 以已有 seam 的最后一公里和正确性为主”的判断成立；但具体分布集中在 credentials、Session projection、Subagent header 和 Web 细节，不能把未出现的 PTY/MCP/Compaction 项继续当作近期承诺。

## Aezy 能力与优先级影响

### 继续由 Aezy 外置插件承担

- Project / Repository / Local Environment；
- 结构化 Git status/diff；
- turn-scoped file-change ledger 与 Codex 式 change card；
- fingerprint 门控的安全 file revert 与整轮 Undo/Redo；
- 持久 Approval Rules；
- 独立、可解释、可审计的 Network Policy；
- 下一步的 Worktree / Handoff。

这些产品域在 rc.1 中仍不存在。现有 M1/M2 seam 也仍有效：`conversation.chat.turnTail` 没有被删除，`session/event` 与 `tools/pre-execute` 的 scoped event contract 未变，`ctx.webServer.register()` 路由接口保留。

### 等待上游或只做薄封装

- Credential/OAuth/device authorization 内核与持久存储；
- Models 登录 surface：等待上游 transport/UI，只有 dogfood 明确被阻塞时才补薄 bridge；
- Subagent lineage/header、Job/Task Surface；
- Session projection、compaction、history recall；
- PTY backend、ConPTY、MCP/ACP transport；
- Side Session / merge-back。

### 里程碑顺序

1. 保持 M0 profile、M1 Project/Git/Turn Changes、M2 Security 在 rc.1 上持续 dogfood。
2. M3：Worktree + Handoff，沿用现有 Repository 与安全边界，不侵入 DSH session/subagent 内核。
3. 根据真实使用痛点再推进文件树/@file、用户 Integrated Terminal、统一 Activity/Status、Browser automation。
4. Models 登录 UI 只做上游 seam 的消费者，不建立 Aezy 自有 credential protocol。

## Aezy 升级实现说明

- `.local/deepseek-harness` 已切到 `dsh-v0.1.1-rc.1`，仅作为 ignored/read-only 参考。
- Aezy 根运行时与三个带 DSH client peer 的外置插件均精确固定到 `0.1.1-rc.1`。
- pnpm 初次增量安装复用了旧 lock/virtual-store 中自动补齐的 rc.8 基础 peer，出现混合依赖图。Aezy 现显式固定 17 个 DSH foundation peer，并从干净状态重建 lockfile；这是发布包消费侧的确定性措施，不是对 DSH 源码的修改。
- `minimumReleaseAgeExclude` 仍逐 package、逐版本列出，不放宽整个 `@deepseek-ai` scope；新增 `@deepseek-ai/dsh-authorization@0.1.1-rc.1`。

## 签收结果

2026-08-21 的升级回归全部通过：

- `pnpm peers check` 无问题，lockfile 不含 rc.8 DSH package；
- `test:brand` 1/1、`test:m1` 10/10、`test:m2` 11/11；
- 真实 rc.1 profile sync/dump 与 `test:m0` 通过；
- rc.1 Web Host 在 3090 启动，M1 Codex 式 Turn Review/Undo/Redo/request fence 与 M2 policy/restart persistence HTTP 验证通过；
- DSH reference tree 保持 clean，用户已有未跟踪 dogfood 文件未被修改或纳入提交。
