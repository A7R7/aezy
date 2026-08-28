# DSH v0.1.2-alpha.1 更新与 Aezy 影响报告

> 调查日期：2026-08-28<br>
> 上游范围：`dsh-v0.1.1-rc.2`（`b150a551`）→ `dsh-v0.1.2-alpha.1`（`cd5ef814`）<br>
> 当前结论：**reference 已更新；默认 runtime 暂留 rc.2；固定官方 commit 的隔离 source release
> artifacts 已通过官方 build/pack/packed-install，进入独立 3091 migration gate。**

## 结论摘要

alpha.1 是一次跨 Host API、Client runtime、Session transport、Agent preset、Subagent 和 Web
体验的大版本迁移，不是 rc.2 的小补丁。它包含 1,079 个区间提交（796 个 non-merge），在高
rename limit 下是 6,075 files、+283,791 / -86,873；workspace app/package 从 229 个变为 249 个，
新增 25 个、移除 5 个。

对 Aezy 最重要的正面变化是 Agent preset shipped root 现在由
`@deepseek-ai/dsh-agent-presets` 自己持有：`includeShippedRoot: true` 默认先挂载标准、PTC、极简
和创造模式，再合并 Profile 的额外 roots，最后追加用户 root。Aezy 因而可以把
`codex-app-server` 作为外置 `trust: system` preset root 加入，而不再复制上游 preset 或包装
roster service。这直接简化了当前模式隔离路线。

最大的升级成本是旧 `@deepseek-ai/dsh-host-apiproxy` 与 `@deepseek-ai/dsh-client-runtime` 已被
移除，替换为 `@Remote` gateway、Session/Workspace/Settings controller、client store 与更细的
UI packages。Aezy 所有 client package、真实 `/api/<method>` smoke 和 Codex DSH gate 必须按公开
Remote/controller 接口迁移后才能升级 runtime。只改 package version 会得到混合或不可启动的
profile。

官方边界：

- [alpha.1 Release](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-alpha.1)
- [rc.2 → alpha.1 compare](https://github.com/deepseek-ai/deepseek-harness/compare/dsh-v0.1.1-rc.2...dsh-v0.1.2-alpha.1)
- [Agent presets package](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.1.2-alpha.1/packages/preset/agent-presets)
- [Session controller](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.1.2-alpha.1/packages/api/session-controller)

## 不可变发布边界

| 项目 | rc.2 | alpha.1 |
| --- | --- | --- |
| Tag | `dsh-v0.1.1-rc.2` | `dsh-v0.1.2-alpha.1` |
| Commit | `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e` | `cd5ef8148158c3a752a658978873241fdf8e2bbc` |
| Git tree | `53915efe4e2126cc7779b73dfc8a3bcec5318c44` | `a712eec535b48badc4fefb4df5176a7002e4280b` |
| Workspace app/packages | 229 | 249 |
| 区间提交 | — | 1,079（796 non-merge） |
| Diff | — | 6,075 files，+283,791 / -86,873 |

GitHub Release 标记为 immutable prerelease，发布时间为 2026-08-27T17:06:37Z。调查时官方 npm
registry 的 versions 与 `latest`/`next` 仍停在 `0.1.1-rc.2`，请求
`@deepseek-ai/dsh@0.1.2-alpha.1` 返回 404；上游 `Release publish (dsh)` workflow 也没有该 tag
的运行记录。Aezy 只消费发布 package，因此 reference 可以更新，runtime 不能从 reference 源码、
Git checkout 或自打 tarball 临时替代。

## 新增能力及 owner 变化

### 1. Agent preset shipped-root 修复与 PTC rename

- 内置 preset 从 CLI 私有配置目录迁到 `dsh-agent-presets/presets/`，随 package 发布。
- `includeShippedRoot` 默认开启，并让 shipped system root 优先于 Profile roots 和用户 root。
- Profile 配置的 preset root 不再在 CLI 启动时丢失。
- 无法加载的 preset 会提前标记并解释 mount/switch 失败。
- 空白 Session 切换 preset 后会发出 `tools/change`，并由 durable `agentPreset` projection 恢复。
- `code` preset id 正式改为 `ptc`；旧 Session event 仍可迁移读取。

对 Aezy：恢复原生 `ui-agent-preset`、保留四个上游模式、增加不可删除的
`codex-app-server` system preset 现在有直接公开装配方式。旧 `aezy` 用户 preset 可继续留在
`DSH_HOME/.agent-presets/aezy`，只用于历史恢复。不得新增可点击 `codex-inspired`。

### 2. Remote gateway/controller 取代 ApiProxy

新增 `dsh-api-session-controller`、`dsh-api-workspace-controller`、
`dsh-api-settings-controller`，旧 `dsh-host-apiproxy` 完全删除。Client 侧旧
`dsh-client-runtime` 被 `dsh-client-store`、controller client、`ui-session`、`ui-chat`、
`ui-approval` 等更细 owner 替代。

Session history 现在通过 Gateway journal stream 提供；初始 page 可把连续 assistant chunks
压成无损 packed record，live follow 仍是单 event。Control state 通过 snapshot stream 传输，
断线重连以完整 generation baseline 替换 process-local queue/jobs/projection。

对 Aezy：M1/M2/M3/Terminal 自有 HTTP route 可保留，但所有依赖旧 ClientContext/Session runtime
类型的 browser bundle 与所有直接 POST `/api/session.*` 的验证脚本必须迁移。Turn Journal 的
Host live observer 不应改写；Historical Review 的客户端 history 消费需要用 controller stream
重新签收 packed records、seq continuity 与冷恢复。

### 3. Durable model selection 与共享 catalog

Session controller 增加 durable `model/selection` event/projection，将 `lastUsed` 与 `next` 分开；
选择不再只是 ApiProxy 进程内 WeakMap。模型目录变成 Host-generation 的
`session.modelCatalog()`：返回 deployment default、routable providers、groups 与 failures。

这是模型持久化的进步，但 catalog 仍是 **Host-wide**，没有 preset/session filter 参数。它没有
实现“agent loop backend 与普通 model picker 解耦”。Aezy 的 `codex-app-server` preset 仍需：

- UI 仅在该 preset 显示 `aezy-codex` models；标准/PTC/极简/创造模式过滤该 provider；
- Host/adapter execution gate 拒绝非 `codex-app-server`（以及历史 `aezy`）Session 使用该 route；
- 首次 Turn 前形成 durable Codex selection，不依赖把 Codex 写成全局 default；
- Session header 始终显示 preset 名称，避免把 backend mode 误解为普通模型切换。

### 4. Models provider-card extension slot

Models Settings 新增 keyed `settings.models.provider-card` 与 list `settings.models.footer` slots，外置
provider companion 可在自己的配置卡中加入登录/账户控制。Aezy 当前单独的 Codex Settings
section 可以迁到 `aezy-codex` provider card，复用上游 Models 信息架构；OAuth、credential 和
plan/rate/usage 仍由官方 App Server 与 Aezy account bridge 持有。

这能删除独立卡片布局代码，但不能让上游读取 Codex OAuth token，也不替代 App Server process
lifecycle、Thread binding 或 dynamic DSH tool adapter。

### 5. Subagent routing 与 experimental Agent Team

- Subagent 启动支持 provider/model/reasoning effort/max output tokens。
- Agent 可在授权目录内为 Subagent 选 route。
- Codex、Claude Code 和 DSH SDK Subagent 支持配置模型。
- experimental Agent Team 增加团队持久状态、Web action 与 profile。

这些 seam 适合未来 Task Board 投影权威 lineage/team/task facts，也减少未来模型路由工作；但
Agent Team 明确是 experimental，且不是项目/Issue/branch/worktree 看板。当前不启用、不复制，
也不把它捆入 Codex main-session preset。

### 6. Conversation、usage、image 与 Terminal 改进

- 每个完成回答后可展开精确 Turn token usage。
- 默认折叠过程与 System prompt，增加 Turn navigator、可调整内容宽度和字号。
- assistant/user/tool-result 图片进入 trajectory，图片异步压缩上传并计入 compaction。
- Session persistence 减少磁盘占用，截断尾部自动修复会警告具体 Session。
- persistent Bash pipeline readiness、PowerShell 启动和结果展开得到修复。
- WebSocket heartbeat 改善空闲连接。

对 Aezy：精确 Turn usage 可成为未来 Traffic Board 的事实输入，但不等于跨 provider/account 的
routing、request log、quota/control plane。Terminal side panel 仍有独立 UI 价值；它应复用新版
DSH Terminal/PTY 修复，而不是删除。M4 trajectory image 上游增强也不替代 workspace Files、
Preview、Historical Review 或 Contextual Ask。

### 7. Security 与网络默认值

- 非 loopback Web 启动链接增加一次性 token；loopback 维持本地使用路径。
- 公网 WebFetch 默认开启，使用 SSRF 防护且公网请求不再逐次申请 DSH approval。
- Safety Notice 明确 DSH 尚未接受安全审计，sandbox/approval/permission 不保证隔离。

Aezy Security 的 tool-boundary Network Policy 仍需保留并回归：只要 WebFetch 经 DSH tool registry，
Aezy pre-execute deny/audit 必须继续优先；不得把上游“公网默认允许”解释为绕过 Aezy policy。
非 loopback token 也不替代 Aezy 自有 route 的 same-origin/authority fence。

## 可替代与保留判断

| Aezy 能力 | alpha.1 影响 | 决定 |
| --- | --- | --- |
| 原生 Agent preset roster/header | 上游 shipped root、health、projection 更完整 | 恢复 `ui-agent-preset`，删除 Aezy 对默认 `aezy` 的强制 |
| `codex-app-server` mode | 可通过额外 system root 装配 | 实现外置 system preset，不复制上游四个 preset |
| Codex account Settings 卡 | Models provider-card slot 可承载 | 迁入 provider card，保留 account bridge |
| Codex catalog 隔离 | Host-wide catalog 仍无 per-preset filter | Aezy 保留薄 UI policy + Host execution gate |
| Session header mode label | 上游 `ui-agent-preset` 已持久显示 | 直接复用，不另写 header 组件 |
| exact Turn usage | 上游已显示 | 删除未来单 Session usage 重复 UI；Traffic Board 仍暂缓 |
| Client runtime / RPC | 旧 packages 已移除 | 必须迁到 Remote/controllers，不建兼容 ApiProxy 内核 |
| Turn Journal / Review | transport 变化但产品事实未替代 | 保留 ledger，重签 packed history/seq 兼容 |
| Terminal | 上游修复 backend，未提供 Aezy side panel | 保留薄 UI，回归新版 owner |
| Task Board | experimental Agent Team 提供部分事实 | 只记录未来投影可能，不提前启用完整 Board |
| Worktree/Handoff/Security/Files | 没有完整上游替代 | 保留既有切片，按新 controller/client seam 迁移 |

## Runtime 升级门禁

在 npm family 发布前只允许 reference/analysis 工作。发布后按独立大步骤执行：

1. 核对 `@deepseek-ai/dsh@0.1.2-alpha.1` 及全部直接 peer 的 repository、integrity 和同版关系；
2. 精确替换 root/package peer 与 `pnpm-workspace.yaml` release-age exceptions，不能保留 rc.2 混图；
3. 先迁移删除的 `dsh-client-runtime` / `dsh-host-apiproxy` imports 与真实测试 carrier；
4. 重建 Aezy profile，验证四个 shipped presets、旧 `aezy` history 和 Web bootstrap；
5. 跑所有 package tests、builds、`pnpm peers check`、M0 composition；
6. 在 disposable 3090 Host 回归 M1/M2/M3/Terminal/Codex account 与 Session/approval/Journal；
7. 只有全部通过才把 `compatibility/dsh.json.packageVersion` 和根 README runtime 改为 alpha.1。

## 当前状态

- `.local/deepseek-harness` 已 detached checkout 到 `dsh-v0.1.2-alpha.1`，保持 clean/read-only；
- `reference/dsh.lock.json` 记录 alpha.1 commit/tree；
- Aezy 默认 runtime、lock、profile 和当前 3090 Host 仍是已签收的 rc.2；
- 固定 alpha.1 官方 commit 已在仓库外按官方 workflow 构建 251 个 release tarball，并通过官方
  packed-install；manifest 与工具链证据见 [`dsh-alpha1-source-runtime.md`](dsh-alpha1-source-runtime.md)；
- 没有从 reference 相对导入或运行源码；alpha 只能进入独立 DSH_HOME/profile/3091；
- preset/backend-mode 实现等待 3091 composition 与 Remote/controller migration gate 通过。
