# Codex-backed self-development milestone

> Status: **Complete**<br>
> Date: 2026-08-28<br>
> DSH runtime: `0.1.1-rc.2`<br>
> Codex runtime: `@openai/codex@0.149.0`

上方日期/runtime 是首个 managed ChatGPT 自开发闭环的历史签收。当前开发 runtime 为 DSH
`0.1.2-rc.1`；2026-09-05 已切换为 Aezy-owned OpenCodex / DeepSeek，当前路径与新增证据见
本文最后一节。不要把历史个人账户路径当作当前配置要求。

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

## 2026-09-06：Aezy 内置网关迁移（进行中）

用户批准将有限模型协议转换内置，而非长期托管完整 OpenCodex 产品。固定 DSH rc.1 / Codex
0.149.0；不改变 DSH/Codex loop、工具与审批 owner。迁移分为目录、网关、实机签收三个提交。

第一步已移除启动时 `ocx sync`：Aezy 自己生成 text-only Flash/Pro catalog，拒绝未知模型与重复
行；明确 reasoning low/high/max、无 image/search/node-repl 能力和保守 128k 本地上下文上限。
使用 Aezy 自写的短 coding instructions，不复制 OpenCodex 的 vendor prompt，也不声称提示词
等价。官方 Codex 0.149.0 实进程读取目录、无 OAuth、双启动身份一致测试通过；六项插件测试通过。
本步骤仍使用原网关处理模型请求，未提升开发 profile；内置网关与真实开发复验仍 pending。
