# Codex-backed self-development milestone

> Status: **Complete**<br>
> Date: 2026-08-28<br>
> DSH runtime: `0.1.1-rc.2`<br>
> Codex runtime: `@openai/codex@0.149.0`

上方日期/runtime 是首个 managed ChatGPT 自开发闭环的历史签收。当前开发 runtime 为 DSH
`0.1.2-rc.1`；2026-09-06 已从受管 OpenCodex 切换为 Aezy 内置 Node 网关 / DeepSeek，当前路径与新增证据见
本文对应日期的小节。不要把历史个人账户路径当作当前配置要求。

## 2026-09-07：Astra 真实 Turn 与账户路由修正

模型身份统一后的真实 Astra 验证发现：已登录 home 的请求被 Aezy 显式设置的
`openai_base_url = "https://api.openai.com/v1"` 强制发往 API Key 端点，返回 401 /
`Missing scopes: api.responses.write`。目录可见、account/read 和 thread/start 都无法发现
这个错误。移除该覆盖，由官方内置 provider 按账户决定推理路由；继续保留独立 CODEX_HOME、
白名单环境、官方 ChatGPT 地址及 model_provider，不导入个人配置或 OAuth，不改变 runtime pin。
官方文档将此项定义为可选路由覆盖，而不是必须写入的默认地址：
[Advanced Configuration](https://learn.chatgpt.com/docs/config-file/config-advanced)、
[Sample Configuration](https://learn.chatgpt.com/docs/config-file/config-sample)。

复验 receipt `2026-09-07T10:08:39.846Z`：`aezy-astra-route-mtr2var9`，
`aezy-codex/gpt-6-astra/low`，经同一个 Aezy 已登录 owner 完成真实 Turn；只调用一次 DSH
`read`，返回未在 prompt 中提供的临时文件 marker，`dynamicTool` durable 证据和 started
preset lock 均通过。没有访问用户工程、读取/复制 OAuth、重登或修改 DSH credentials document。
这是 **GPT 受治理只读 Turn** 签收，不等于 GPT 写操作、所有模型 entitlement 或完整 loop parity。

测试：163 项全过；官方进程 `config/read` 断言没有 API 地址覆盖。增强 smoke 默认依然
0 模型调用，只有显式 `AEZY_ASTRA_REAL_PROOF=1` 才运行上述真实 Turn；可用
`AEZY_ASTRA_PROOF_RECEIPT` 指定 receipt 路径。本次 receipt 保留于
`.local/aezy-model-fixes-XqAlLV/dsh/aezy/astra-route-proof.json`。
开发 profile 已同步；3091 双通道/Web/catalog/真实 Turn smoke 完成后关闭临时 Host，恢复 3090。
该账户路由修正与分组运行方式/统一模型 UI 分成独立提交。

## 2026-09-07：修正登录后仍缺 Astra 的 runtime pin（历史记录）

通过 Aezy 官方 App Server 的 `account/read(refreshToken: false)` 已确认新 home 登录成功
（`type: chatgpt`），但 0.149.0 的 `model/list(includeHidden: true, limit: 100)` 全量目录无
`gpt-6-astra`，且 `nextCursor: null`。因此不是 UI 过滤、漏分页或用户未登录；此前“登录后
以目录为准”没有解决固定旧 engine 的问题。没有读取 OAuth 文件，也没有复制个人配置。

仅将官方 npm Codex 精确 pin 升到稳定版 0.153.4，lock 锁定主包与平台包 SHA-512；DSH
完整官方 family 仍为 0.1.2-rc.1。新进程无自定义 GPT catalog 即返回可见 Astra，保留官方
reasoning metadata（App Server 目录与 native API 配置分别消费各自能力，不互相硬编码覆盖）。
GPT/DeepSeek 的 home、runtimeId 和路由边界不变。目录按官方公开 `model/list` 发现，不伪造
entitlement 或复制旧模型 prompt；参考 https://learn.chatgpt.com/docs/app-server#models。

验证：153 项测试通过（含四项官方进程测试）；Astra 的 model/list、thread/start、独立 home
及双启动均通过。修正了一处 Terminal mock 使用虚构正 PID 命中真实 `/proc` 进程的测试污染，
不改变 Terminal 产品行为。浏览器 receipt `2026-09-07T03:32:29.855Z` 证明 Codex 菜单同时
有 Astra、旧 GPT 与两个 DeepSeek，可选择 Astra/high、刷新并保持；模型/effort 箭头为公共
SVG，无字符 `⌄`，0 page errors。测试字体替代仍显式记录。

0.153.4 的真实 DeepSeek 开发回归 receipt `2026-09-07T03:33:55.979Z`：Session
`aezy-owned-deepseek-mtqorlx5`，Thread `01a079ed-bf5e-7032-ba12-e00f2ca3ff9b`，sum 修复、
4 次批准、测试通过、网络拒绝、Journal/Review、Inspector partial、分页、同 Thread cold
restart 与精确历史续跑均通过。receipt 仍位于隔离 profile 的 `aezy/opencodex-proof.json`。
以上不等于真实 GPT/Astra 付费 Turn 或 GPT governed write 已验证。
Inspector 的静态 Codex source blueprint 仍明确标记 rust-v0.149.0 审计来源；本次只验证
公开事件边界，不把旧源码图改标签冒充 0.153.4 的完整内核审计。

部署完成：默认 `~/.aezy-alpha/dsh` / `aezy-alpha` 已同步，增强的 3091 smoke 确认两条
通道版本均 0.153.4、connected；原 GPT 登录保留（accountConfigured=true），Codex 目录
两个 DeepSeek + 六个 GPT（含 Astra），native 八模型仍含 Astra。DSH 凭据文件 mtime
未变，smoke 0 模型 Turn；停止临时 3091 并恢复 3090 开发服务。

## 2026-09-07：恢复隔离 GPT 通道（历史初次部署记录）

修复 Codex 模式只剩 DeepSeek：`aezy-codex` 外置 adapter 现在将 `deepseek/*` 与 `gpt-*`
分发到同一固定官方 Codex engine 的两个隔离连接。DeepSeek 原有 `aezy/codex-runtime` / runtimeId
保持不变，GPT 使用全新的 `aezy/codex-openai-runtime`。独立启动、独立 model catalog、独立
登录，任一通道失败不隐藏另一通道；绝不跨 provider fallback。绑定后的 Session 换通道仍拒绝
resume，必须新建 Session，不复制历史，不建立旧 runtime 兼容层或多-runtime 编排产品。

Settings 同时展示两条通道；GPT 的 browser/device login/logout 只调用该进程的官方 account
RPC。默认 `/aezy/api/codex` 继续返回网关快照，新增显式 `?route=openai|gateway`。
个人 config/OAuth 未读取、复制或修改。目录读取完整分页并保留 reasoning metadata；目前
0.149.0 未登录内置目录没有 Astra，不伪造其官方 prompt/catalog。登录后以官方目录为准。

验证：153 项测试通过（含四项 opt-in 官方 Codex 进程测试）；新增覆盖双向路由、缺凭据、
无 fallback、登录目标、分页、reasoning、独立 GPT 配置及 restart 稳定 runtimeId。
未登录空 Thread 没有 Codex rollout，不能把空 Thread 的启动当作真实 history resume 证明。

隔离磁盘 profile：`.local/aezy-model-fixes-XqAlLV/dsh` / `aezy-model-fixes`。
2026-09-07T02:26:21.912Z 真实 DeepSeek 回归 Session `aezy-owned-deepseek-mtqmcrw0`，
Thread `01a079af-eefc-7e31-8a4a-3f0e91bbd87b`：修复 sum、一次测试通过、4 次显式批准、
网络拒绝、Journal/Review、Inspector partial、分页、cold restart 同 Thread/精确历史继续均通过。
receipt 位于该 profile 的 `aezy/opencodex-proof.json`。此前失败安装只清理了本次生成的
`/tmp/aezy-model-fixes-zqErJq`，未删除既有 profile 或历史证据。

剩余边界：用户须在 Settings → Codex → GPT 登录新目录，随后才能真实签收 GPT/Astra
账户可用性和 GPT governed Turn。DSH-native Astra 的配置证据见 native-provider milestone，
不得借用历史 ChatGPT 或 DeepSeek 证据宣称新 GPT 通道已经付费验证。

部署状态：第一次同步被审批阻止后，用户明确回复“允许”，随后同步默认 `~/.aezy-alpha/dsh`
成功。旧开发 Host 实际运行在 3090，确认 owner PID/profile 后正常终止并自行释放锁；没有
删除活跃锁或干预个人进程。增强的 3091 smoke 通过：Web、两条 Codex channel connected、
native 八模型含 Astra、Codex 两个 DeepSeek + 五个 GPT、凭据文件 mtime 未变、0 付费调用。
GPT 新 home 为 `aezy/codex-openai-runtime`，accountConfigured=false；验证后开发 Host
恢复到原有 3090 端口。隔离 profile 保留可复验。

## Outcome

Aezy can use the official Codex App Server managed ChatGPT account path to run a real coding Turn
inside an Aezy-managed Worktree, execute mutable actions through existing DSH tools and approvals,
review the resulting durable Turn journal, restart the Host, and continue the same opaque Codex
Thread. This is the minimum Codex-backed Aezy self-development loop.

The first Aezy-authored change produced through that loop is commit `36871adfe5`: persisted Codex
Session bindings now validate loaded Session IDs with the same constraints used when writing them.
The change and its tests were generated in the managed Worktree, reviewed through Aezy, committed,
handed off, and fast-forwarded onto `main` without a product-specific merge-back implementation.

## Ownership boundary

| Fact or action | Authoritative owner |
| --- | --- |
| Managed ChatGPT login, credential storage/refresh | Official Codex App Server |
| Codex Thread and agent loop | Official Codex App Server |
| Workspace, Session, Turn events and transcript projection | DSH |
| Tool execution, Security policy and approval | DSH plus Aezy Security |
| File-change journal, Review, Worktree and Handoff | Existing Aezy Project surfaces |
| Session-to-Thread association | Minimal Aezy binding at `DSH_HOME/aezy/codex-bindings.json` |

The binding contains only Session ID, opaque Thread ID, cwd and selected model. Aezy does not read
Codex credential files, accept or return OAuth tokens, copy conversation history, or implement a
second Session/Task/Subagent/PTY/compaction/usage kernel.

## Adapter and security model

- `@aezy/codex` owns the out-of-tree App Server process/protocol client and account Host/client
  surface.
- The `aezy-codex` DSH provider maps one DSH Session to one opaque Codex Thread and projects streamed
  responses, activity, cancel and completion into ordinary DSH Turn facts.
- Codex native filesystem permissions are fixed to read-only, with empty mutable roots. Native
  escalation requests are declined.
- Mutable operations are exposed to Codex as namespaced App Server dynamic tools such as
  `dsh.bash`; execution returns through `agent.ctx.tools.execute()`. Existing DSH tool events,
  approval round-trips, Aezy Security audit and Turn journal therefore remain authoritative.
- Native read-only inspection can be projected as activity but cannot currently be pre-vetoed by an
  arbitrary Aezy Security rule. Mutations still fail closed through the DSH dynamic-tool path.

## Compatibility decision

`relay-dsh-plugin-codex@0.1.2` was evaluated in an isolated profile. Managed account/rate/usage,
conversation, restart resume and cancel worked, but real Luna/Sol Turns did not establish the
required structured DSH tool/call/result and approval facts. Relay is therefore not installed in
the Aezy profile. The narrow official adapter exists only for the missing hard constraints; it does
not fork Codex or DSH internals.

## Verification

| Gate | Result |
| --- | --- |
| Codex package tests | 18 passed, 0 failed |
| Official App Server structured command | Passed with the real managed account |
| Account/plan/rate-limit/usage projection | Passed without returning email or token |
| DSH Session/model/prompt/history path | Passed |
| Structured `dsh.bash` projection | Passed |
| Turn cancel and same-Session restart resume | Passed |
| Governed write into disposable Git fixture | Passed |
| Durable Journal and Historical Review | Passed; Git source, complete observation |
| Aezy Security network deny and audit | Passed |
| Real DSH approval requested/responded (`allowed-once`) | Passed |
| rc.2 M0 and 3090 M1/M2/M3/Terminal regressions | Passed |

## Self-development dogfood

1. Aezy created managed Worktree `a39c10e6-e75c-4d64-9c60-61120d5f5998` and bound Session
   `aezy-self-mtbu9b2u` to a Codex Thread using `gpt-5.6-sol`.
2. The agent used the namespaced DSH todo, edit and bash tools to modify only
   `packages/aezy-codex/src/binding-store.js` and its test.
3. The first test attempt failed genuinely because a fresh Git Worktree does not contain ignored
   `node_modules`. After the Host restart, the same Session/Thread continued, ran
   `pnpm install --offline` through an approved DSH tool call, and then passed all 18 Codex tests.
4. Turn 1 produced a complete Git-backed journal containing exactly the two changed files. Historical
   Review loaded the stored binding-file hunks rather than recomputing them from the later checkout.
5. The Worktree committed `36871adfe5fb88966dd1d8efd1aec40fad6e7cf8`; structured Handoff
   `9868261a-a66d-4816-93b3-d526f4e66369` reported a clean branch one commit ahead.
6. `main` was fast-forwarded to the same commit. After the main Host restarted, continuation on the
   same Session/Thread correctly recalled the exact code change, initial missing-dependency failure
   and offline recovery.
7. The Session was archived, its binding released, and the managed Worktree cleaned. The recoverable
   branch `aezy/codex-self-mtbu9b4o` remains; no merge-back product feature was introduced.

## Known limits and next decision

- Fresh managed Worktrees need an explicit dependency bootstrap when dependencies are ignored.
  Today the proven recovery is `pnpm install --offline`; a future Worktree bootstrap affordance may
  make this automatic without changing the agent-loop ownership.
- App Server is a version-pinned compatibility surface. Protocol changes must remain behind contract
  tests rather than leaking into M0-M4 or Terminal packages.
- The official account response on this machine reports `planType: prolite`; Aezy displays the
  authoritative value and does not reinterpret subscription names.
- A second DSH-native Codex-inspired backend is optional hardening, not required for the achieved
  self-development loop. If pursued, it must pass the same runtime contract without duplicating DSH
  state machines.
- Traffic Board, Task Board, Browser integration, Cloud/Remote/PR, Side Chat and merge-back remain
  separate deferred product slices.

## 2026-09-05：Aezy-owned OpenCodex

本节为已经退役的托管方案历史签收；当前实现与限制以 2026-09-06 一节为准。

### 结果与固定依赖

已通过外置 `@aezy/opencodex` 托管独立官方 OpenCodex 实例，并让真实 DeepSeek 模型在官方
Codex App Server 中完成 DSH 受治理开发与同 Thread restart continuation。没有内化 OpenCodex
源码，没有重写 Codex prompt 模板或 DSH/Codex 内核。

- DSH：完整、同版、逐包 integrity-pinned 官方 npm family `0.1.2-rc.1`（242 packages）。
- Codex：官方 npm `@openai/codex@0.149.0`，不使用个人 CLI。
- OpenCodex：官方 npm `@bitkyc08/opencodex@2.42.0`；SHA-512
  `Jnw7ZL/0dlxYMBXZwtMRG6J6+wuKDtXOdSl7sl52gT2eekQsR36zihe7NzThaixotGoqKc96ZL3w9E/Ff+qKGg==`。
- Bun：官方 npm Linux x64 binary `1.4.0`；安装脚本明确禁用，不在 Host 启动时下载 runtime。
- 精确 pin 与消费接口：`compatibility/opencodex-runtime.json`、根/profile lockfile。
- 12 个 Aezy 外置包通过本地 pack/override，DSH/OpenCodex 不从参考树或本地源码 artifact 运行。

### 配置、凭据与权限归属

个人 Codex 配置允许只读审计，其 `openai_base_url` 为 `http://127.0.0.1:10100/v1`，catalog 也在
个人 home 中；这是旧 Aezy App Server 继承个人 OpenCodex 影响的来源。本次不读/复制个人
OAuth、不修改个人配置或个人 OpenCodex 进程。

| 内容 | 当前归属 |
| --- | --- |
| DeepSeek endpoint/model/key reference | DSH `llm-deepseek` settings，经官方 `resolveAdapterOptions` 解析 |
| DeepSeek API key | DSH credentials/reference owner；用户明确选用已有配置 |
| OpenCodex config/state/catalog | `DSH_HOME/aezy/opencodex`，私有目录、单 owner lock |
| Codex config/sqlite/history/log | `DSH_HOME/aezy/codex-runtime`，CLI 与 Thread 参数固定路由 |
| Catalog 生成用的 Codex home | gateway 内独立 `catalog-codex-home`，不接触正在运行的 Codex home |
| 模型 API 协议转换 | 官方 OpenCodex public API；供应商 key 仅通过受管进程环境传递 |
| Thread、agent loop 与原生只读工具 | 官方 Codex App Server |
| 可变动作、审批、审计、Session 与 Journal | 既有 DSH tools/approval + Aezy Security/Project |

子进程环境为白名单，不继承个人 `CODEX_*`、`OPENAI_*`、`OPENCODEX_*`、provider key 或
`NODE_OPTIONS`。官方 `loadConfig/startServer` 启动网关；只运行 scoped `ocx sync` 生成 catalog，
不调用全局 start/stop/restart/shim/service/history import。非必要 OpenCodex account pools、
sidecars、recovery、Subagent guidance、Claude/Grok integration 关闭。网关只绑定动态端口的
`127.0.0.2`，data/admin bearer token 每次启动独立生成；用官方鉴权检查证实无 token 为 401。

旧无 runtimeId 的 Session↔Thread mapping 保留，但拒绝静默迁入新 home。用户须新建 Codex
Session。provider endpoint、model catalog、credential reference 或 OpenCodex version 变化
形成新的 route identity；只轮换 key 或动态端口不会破坏同路由的 Thread restart identity。
现阶段 settings/key 更改须重启 Host；不建立热迁移或长期双 runtime 兼容层。

### 真实失败暴露的接口约束

1. Codex preset 的 `agent/request` hook 位于 DSH Session selection 的内层，观察到的是 seed
   `deepseek-official` 而不是最终 route。Aezy 将 provider fence 移到公开 `llm/stream` 最终请求
   边界；standing preset 只检查自身归属。真实 Cordis default-export dependency grant 也有回归。
2. OpenCodex 默认 `code_mode_only` 隐藏直接工具声明，DeepSeek 的直接 `dsh__read` 会被官方
   undeclared-tool guard 拒绝。使用官方 provider `codexToolMode: shell` 与显式非 deferred 的
   DSH dynamic tools 解决；不改 vendor prompt，不关闭工具校验，Codex 原生权限仍 read-only。
3. Network `deny` 正确保守拦截 `node --test`（可能联网的 shell）。正向 fixture 使用 `ask`，
   仅按持久 callId 放行指定文件读写和精确测试命令；另一个 Turn 使用 `deny` 验证 curl 被拒绝。
   试验有 10-call / 120-second 上限，拒绝后不授权模型自行升级权限或绕过策略。
4. 官方 OpenCodex coordinator 要求系统 `/tmp` 为 root-owned sticky directory。执行沙箱映射
   下会拒绝；真实 Host 环境正常。没有修改系统权限或绕开上游检查。

### 真实证据

最终代码验证于 `2026-09-05T02:29:00.676Z`，独立
`/tmp/aezy-opencodex-e2e-uNKR9m/dsh` / profile `aezy-opencodex-proof`；首个 Host 端口 `43778`，
restart 使用新的独立端口。fixture 为 `/tmp/aezy-governed-project-Em2nS1`。

- Session：`aezy-owned-deepseek-mtnrkiu3`；provider/model：
  `aezy-codex` / `deepseek/deepseek-v4-flash`。
- Codex Thread：`01a06f65-aeb3-73e2-b75f-48d7c6153beb`。
- runtimeId：`97de679d10249e40a7cf78e4ee61f2869d2093bc5481efb314f29e14888494a5`。
- Fixture 基线真实 `node --test` 失败；模型经 `dsh.read` 读取源代码和测试，经审批的 `dsh.write`
  修复 `sum.mjs`，再经审批的 `dsh.bash` 运行测试，真实通过 1 个测试。只有源文件修改，测试
  文件未改。外部再次执行同一测试确认通过，而不只相信模型最终文本。
- 正向回合 4 次精确 `allowed-once`（2 read、1 write、1 bash）；durable approval/call/result、
  Security audit、Journal 与 `turn-review` 的 `modified` 文件均成立。
- 第二 Turn 的 `curl https://example.com` 被 Network deny 拒绝并有 Security audit，无绕过。
- 用 `session/page` 的两消息窗口完整分页；Host restart 后历史 records 完全一致。
- 第三 Turn 重新读取和运行测试；新 Host/new gateway port 下仍为相同 runtimeId、相同 Codex
  Thread、同一 DSH Session，真实 continuation 成功。
- Inspector 从上述 durable records 投影 16 spans，backend `codex-app-server`、completeness
  `partial`；不伪装成完整的 Codex 私有 micro-loop trace。
- 测试正常结束关闭自己的 Host、Codex 和 OpenCodex。只保留显式临时目录用于复查/清理，
  不把它变成第二套开发 runtime。

机器 receipt 由 gate 写入 `<proof DSH_HOME>/aezy/opencodex-proof.json`，不含 secret、prompt 或
原始供应商输出。本段保存可长期追溯的脱敏结果；临时目录不作为长期依赖。

### 复验与明确未完成项

最终全量本地回归：124 pass、0 fail、1 opt-in process test skipped；官方包的双启动/鉴权/
catalog/restart identity/清理测试已在宿主环境另行通过。相同插件随后同步到正式
`~/.aezy-alpha/dsh` / `aezy-alpha`，3091 最小 Web smoke 返回 connected，gateway 为
`http://127.0.0.2:43332/v1`、DeepSeek Flash/Pro 两个模型、`requiresOpenaiAuth=false`，
凭据来源 `DSH credentials (file)`，凭据文件 mtime 未改变。该 smoke 的模型请求数为 0，
完成后关闭 Host 与受管进程；端口只是本次证据，不是固定配置。

```sh
node --test packages/aezy-*/tests/*.test.mjs scripts/alpha-runtime.test.mjs
AEZY_OPENCODEX_PROCESS_TEST=1 node --test packages/aezy-opencodex/tests/process.test.mjs
# 已同步 profile，无付费模型请求，smoke 结束关闭 Host：
pnpm test:opencodex:profile
# 仅对另行创建并 sync 的 /tmp/aezy-opencodex-e2e-* DSH_HOME，且用户已授权真实请求：
AEZY_OPENCODEX_REAL_PROOF=1 pnpm test:opencodex:development
```

Codex token usage 尚未映射到 DSH，UI 明示缺失，不将缺失计为 0 或汇总进原生 provider 计费。
Inspector 的内部 loop coverage、DeepSeek 下独立 cancel/compaction/Subagent 门禁、第二 provider、
Claude Code 和平台扩展均没有在本次签收。旧 Codex cancel 契约测试不冒充新的 DeepSeek 实机
cancel 证据。配置隔离不抵御同 UID 文件读取/环境读取/全局 kill；强隔离另需 OS 用户或容器。

下一步是用这条现成 harness 路径做小型真实工程 dogfood，再按失败补契约；暂停新增
codex-inspired 提示词/parity 复刻，不捆绑多 runtime、DAG、issue dashboard、Browser、Boards、
Cloud/Remote/PR、Side Chat 或 merge-back。

## 2026-09-06：Aezy 内置网关迁移（Complete，限定范围）

用户批准将有限模型协议转换内置，而非长期托管完整 OpenCodex 产品。固定 DSH rc.1 / Codex
0.149.0；不改变 DSH/Codex loop、工具与审批 owner。目录、网关、依赖清理/profile 提升分别
提交；最终检查发现的工具准入与早期中断问题各自再作独立修复，不与 runtime 清理混合。

第一步已移除启动时 `ocx sync`：Aezy 自己生成 text-only Flash/Pro catalog，拒绝未知模型与重复
行；明确 reasoning low/high/max、无 image/search/node-repl 能力和保守 128k 本地上下文上限。
使用 Aezy 自写的短 coding instructions，不复制 OpenCodex 的 vendor prompt，也不声称提示词
等价。官方 Codex 0.149.0 实进程读取目录、无 OAuth、双启动身份一致测试通过；六项插件测试通过。
第一步提交时仍使用原网关处理模型请求、尚未提升开发 profile；后续步骤已完成替换与复验。

第二步：新增 Aezy 自写的 Node HTTP/Responses 网关，完全不加载 OpenCodex 或 Bun。目录/指令、
请求翻译、SSE、取消、鉴权、错误和传输 replay 都在外置插件内；不执行工具，不运行第二层
Agent，不存会话或响应历史，不复制 DSH 内核。`@aezy/opencodex` 包名与内部 provider ID 暂时保留
为现有 composition 标识，不代表仍使用 OpenCodex，也没有旧网关 fallback。

- `127.0.0.1` 动态端口始终校验每次启动随机 bearer，拒绝浏览器 Origin；无 admin/global API。
- 独立 `DSH_HOME/aezy/model-gateway` 只持有 catalog、owner lock 与 32-byte replay key。
  provider key 仅在 Host 内存中，不写文件、不传给 Codex。旧 OpenCodex home 不读、不改。
- Responses 仅接受固定 DeepSeek 文本、namespaced function/custom tools 和完整 input replay；
  image/search/remote compaction/previous_response_id/non-streaming 等未支持路径明确拒绝。
- SSE 有输入/输出/事件/工具参数上限；整个工具批次完整校验后才发 executable items；断流、
  不完整 JSON、未声明工具、重复 call ID 不产生可执行输出。length 明示 incomplete。
- reasoning 使用 AES-256-GCM transport envelope，绑定官方 `thread-id` header 与 model，由 Codex
  自己持久化；网关没有 replay/history cache。重启复用私有 key，跨 Thread/model 解密失败。
- HTTP 取消/Host stop 传到上游 AbortSignal；不跟随 provider redirect，不重试、轮换或 fallback。
- gateway 保留无内容的内存诊断计数，真实 usage 转 Responses、未知 usage 保持 null；本切片
  尚不将 Codex usage 汇总进 DSH billing。未新增持久 usage store。

真实失败与修复：首个 Codex 请求证明身份字段是 `thread-id`，不是 `session_id`；DeepSeek 工具
分片可能重复完整函数名，不能直接逐段拼接。修复使用稳定名称/namespace 映射并正确处理重复
名称，没有放宽 undeclared-tool admission。失败未触发 fallback 或自动重试。

第二步实机签收于 `2026-09-06T08:00:31.603Z`，独立
`/tmp/aezy-opencodex-e2e-native-imUspG/dsh` / `aezy-native-gateway-proof`，fixture
`/tmp/aezy-governed-project-G3pjmG`：

- Session `aezy-owned-deepseek-mtpiunx7` / Codex Thread `01a075bb-817f-7e63-8381-e3f76128c4fe`；
  `deepseek/deepseek-v4-flash`，凭据来自既有 DSH owner，不读 OAuth。
- 原有真实修复/失败基线→read→approved write→test（1 pass，仅 sum.mjs 改动）、Security deny、
  Journal/Review、16-span partial Inspector、分页和 Host restart 同 Thread continuation 全通过。
- restart 后 3 次模型请求全部 completed，3 次有真实 usage、0 次 unknown；无错误或 fallback。
- 全量本地回归 136 pass / 0 fail / 3 opt-in skipped；3 个官方 Codex 实进程门禁另行通过，含
  namespaced dynamic tools + encrypted replay + tokenUsage notification、turn/interrupt 传播、双启动。

最终检查补充两个独立修复：

- `5e8875846c`：模型返回的工具批次必须符合 `tool_choice` none/specific/required 与
  `parallel_tool_calls:false`，不仅把这些约束作为上游提示。违例不给出可执行工具。
- `e2ae3de3c9`：实进程测试复现 Codex 较早 interrupt 会报告 interrupted，但不保证立即关闭
  空闲 HTTP 流。adapter 监听官方 interrupted/failed Turn 事实，直接取消该 Thread 活跃传输；
  进程断连取消本实例全部请求。跨 Thread 隔离、实际上游 HTTP 关闭、官方早期 interrupt 均通过。
  只记录活跃 HTTP 的 Thread scope，不拥有 Turn/cancel 状态机或公开 HTTP admin/cancel API。

第三步完成：OpenCodex/Bun/keyring 等退役依赖从根 lock 与 profile closure 移除，profile selector
新增旧依赖缺席门禁。DSH 仍为完整 242-package 官方 `0.1.2-rc.1` family，逐项 SHA-512 校验，
没有升级/修改 DSH；只有 12 个 Aezy 外置包来自本地 pack。

最终代码（含上述两个修复）真实签收于 **`2026-09-06T08:19:55.640Z`**，同一独立 proof home /
profile；本次 fixture `/tmp/aezy-governed-project-Xl1fo0`：

- Session `aezy-owned-deepseek-mtpjjn9q`；Thread `01a075cd-4a2a-71d1-9a3f-c8b127bb048b`；
  runtime `3a9f1843e00ff77ebd3ee31a24c5a6fbcf0bcd2ab7a9ec8fbfb020b3a966e5e0`。
- 实际版本：DSH `0.1.2-rc.1`、Codex `0.149.0`、gateway `aezy-responses-v1`；
  OpenCodex/Bun 均不在运行依赖中。仅复用既有 DSH DeepSeek credential reference，不读 OAuth。
- 失败测试基线 → 真实 read → 4 次 allowed-once（含 structured write）→ 测试 1 pass，独立检查
  Git diff 仅 `sum.mjs`；Security network deny、Journal/Review、16-span partial Inspector 和分页通过。
- 整个 Host 重启后 exact history、同 runtime/Thread 及真实 read/test continuation 通过；
  重启后的 3 次 provider 请求全部 completed 且提供 usage；无 failed/cancelled/unknown usage。
- 全量 Node 24 回归：**140 pass / 0 fail / 3 opt-in skipped**；另行启用官方 Codex 实进程测试
  **3 pass / 0 fail**。取消/HTTP 错误/工具准入的负向契约使用本地受控 provider，不增加付费请求。
- 收据：`/tmp/aezy-opencodex-e2e-native-imUspG/dsh/aezy/opencodex-proof.json`；
  无 secret/prompt/原始 provider 输出，临时 home 仅供复查、不作为第二 runtime。

最终外置包随后同步到 `~/.aezy-alpha/dsh` / `aezy-alpha`，正式 3091 无模型请求的 Web/runtime
smoke 验证 native gateway、官方 App Server connected、Flash/Pro 目录、无需 OpenAI auth、
credentials 文件 mtime 未变。测试停止各自 Host；开发使用原 `alpha:web` 命令，新建 Codex App
Server Session。旧 OpenCodex 目录/binding 原样保留但不自动 resume、不作为 fallback。

限制：只有 Flash 做真实付费开发；Pro 为 catalog/契约覆盖。仅文本、HTTP/SSE、固定版本
Responses full-input replay；未实现 image/search/remote compaction/其它 provider/完整 Subagent
parity。模型 reasoning 只加密传输、由 Codex 持久化；`replay-key` 不是可随意删除的缓存。
Responses usage 与官方 tokenUsage notification 已验证，**DSH per-Turn billing 投影仍不可用**。
Inspector partial 不代表完整私有 loop 可见。不会抵御同 UID 文件读取/global kill。

本次路径提交：`4d8680c83e`（目录脱离 CLI）、`0f7a863bfe`（内置网关）、上述两个独立修复，
以及本节所在的依赖清理/profile 提升提交。新增 codex-inspired parity、多 runtime、DAG、issue
dashboard、Browser、Boards、Cloud/Remote/PR、Side Chat 和 merge-back 均未加入。
