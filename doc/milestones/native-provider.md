# Alpha native provider spike

> 状态：Complete
>
> Runtime：DSH `dsh-v0.1.2-rc.1` / `a66e4702047846cdaa10c66c9d3df3951f5ea70d`，
> `~/.aezy-alpha/dsh`，profile `aezy-alpha`，Host `127.0.0.1:3091`

## 2026-09-07：Astra 目录补全

固定 DSH rc.1 的 pi-ai 目录只有七个旧模型。Aezy 使用公开 `providers.openai-codex.models`
配置保留全部七项并添加 `gpt-6-astra`，没有修改或升级 DSH、pi-ai 或 OAuth owner。
按 [官方 Astra 文档](https://developers.openai.com/api/docs/models/gpt-6-astra) 声明
1,050,000 context、128,000 output、text/image，以及 low/medium/high/xhigh/max；不提供
Off/minimal。模型调用继续走原有 provider-owned Responses，不改为 Chat Completions。

`scripts/verify-alpha-native-provider.mjs` 从实际 Aezy YAML 加载配置，在全新空凭据目录中
经真实 DSH `listModels` / `resolveModelInfo` 验证八模型、Astra efforts、原 authorization key
与未发起 OAuth。这是目录/配置验证，不是 Astra 账户可用性或真实付费 Turn 签收。
Codex App Server 的模型目录是另一 owner，不用这份 YAML 伪造 App Server entitlement。

## 目标与边界

本切片验证“OpenAI/Codex 模型”和“Codex App Server agent loop”可以独立存在。Aezy 不增加
第二个 provider implementation，只在外置 `@aezy/base` composition 中启用 rc.1 已有的
`@deepseek-ai/dsh-llm-pi-ai` `openai-codex` route，并挂载 DSH 的
`@deepseek-ai/dsh-authorization` service。

权威所有权保持为：

- DSH `llm-pi-ai` 持有 model catalog、Responses transport、OAuth grant/refresh 和 credential
  store；
- DSH Session 持有 provider/model/reasoning selection 与 durable projection；
- Aezy 只启用现有 owner、提供 profile composition 和验证 gate；
- 既有 `aezy-codex` 仍只服务 `codex-app-server` system preset，Codex App Server 继续持有该
  preset 的 account/thread/turn/agent loop；
- Aezy 不读取 token、不迁移或复制凭据，也不实现
  Session/tool/approval/usage/notification/PTY/compaction 内核。

## 实现

`packages/aezy-base/cordis.patch.yml` 对 DSH base composition 中已经存在的 `llm-pi-ai` row
增加 `providers.openai-codex: {}`，并插入官方 authorization service。默认 provider/model 没有
改变。

`scripts/verify-alpha-native-provider.mjs` 只从 checksum-pinned alpha profile 的安装产物加载
真实 package closure，使用新的临时 credential store 验证 owner 契约。它不会调用
authorization `begin`，因此测试不会启动浏览器/device-code flow。

`scripts/alpha-runtime.test.mjs` 另有静态 composition gate，防止 route、authorization seam 或
credential 边界被后续 profile 调整意外移除。

`scripts/authorize-alpha-native-provider.mjs` 是显式授权后才能运行的 alpha-only launcher。它
要求 `AEZY_ALPHA_AUTHORIZE_NATIVE_PROVIDER=1`，固定重入 alpha Node 24，并通过
`--use-env-proxy` 调用 DSH `ctx.authorization.begin()`；notice/prompt 可以显示 URL 或一次性
device code，但脚本不读取或输出 credential payload。

`scripts/verify-alpha-native-provider-turn.mjs` 通过真实 3091 Remote control plane 建立 disposable
Git fixture 和 `standard` Session，在 rc.1 `/api/remote.mux` 的 `$events` stream 回答
`approval/request` waterfall，再检查 Security、Journal、Review 与 exact provider usage。launch
token 只由运行时环境提供，不写入仓库或测试输出。

## 验证证据

2026-08-29 重新同步 alpha profile 并重启 3091 后，authenticated Remote control plane 返回：

- 默认仍为 `deepseek-official/deepseek-v4-flash/high`；
- routable providers 为 `deepseek-official`、`openai-codex`、`aezy-codex`；
- DSH-native `openai-codex` catalog 有 7 个模型：`gpt-5.3-codex-spark`、`gpt-5.4`、
  `gpt-5.4-mini`、`gpt-5.5`、`gpt-5.6-luna`、`gpt-5.6-sol`、`gpt-5.6-terra`；
- 新建空白 `standard` Session `aezy-alpha-native-provider-spike` 持久化了下一次选择
  `openai-codex/gpt-5.6-sol/low`，同时保持 0 Turn、0 token；
- 既有 `codex-app-server` dogfood Session `aezy-alpha-mvp-mte8pbf4` 仍恢复为
  `aezy-codex/gpt-5.6-sol/low`，没有被 native provider 改写。

首次 owner/catalog 门禁：

```text
node --test scripts/alpha-runtime.test.mjs                 8/8 pass
TMPDIR=/tmp TMP=/tmp TEMP=/tmp \
  node scripts/verify-alpha-native-provider.mjs            pass
pnpm run test:mode                                         4/4 pass
node --check scripts/verify-alpha-native-provider.mjs       pass
git diff --check                                            pass
```

isolated owner probe 返回 authorization key `llm-pi-ai/openai-codex`，唯一方法为 `oauth`，标签
为 `OpenAI (ChatGPT Plus/Pro)`；fresh store 显示 `credentialConfigured=false`、
`inFlight=false`、`oauthStarted=false`。

## OAuth 与真实 Turn gate

用户明确授权后，DSH owner 已通过 device-code flow 完成 OAuth，并确认
`credentialConfigured=true`；Aezy 没有读取 credential 内容。首次尝试暴露两个真实 runtime
问题并分别修复：

- developer shell Node 22 的 built-in `fetch` 未采用代理，device request/token exchange 被 OpenAI
  以 `unsupported_country_region_territory` 拒绝；修复后 launcher 固定 alpha Node `v24.20.0`
  与 `--use-env-proxy`，proxy trace 为 `US`；
- alpha Node 路径是 symlink，直接比较 `process.execPath` 会重复 re-entry；改为 realpath 校验与
  显式单次 re-entry marker。`alphaRuntimeEnv()` 同时强制 `NODE_USE_ENV_PROXY=1`，使 3091 的
  catalog、refresh 和 Responses Turn 使用同一代理路径。

真实只读 Turn 使用 Session `aezy-alpha-native-provider-spike`：

- `standard` + `openai-codex/gpt-5.6-sol/low`；
- 模型发出一个结构化 `read` call，DSH 返回 `package.json`；
- 最终精确回答 `node scripts/verify-alpha-native-provider.mjs`；
- Turn 1 完成；Session projection 为 9,072 uncached input、5,632 cache read、41 output，包含
  title request 与两步 agent response。

真实 governed write gate 使用 disposable Session `aezy-alpha-native-turn-mtehj6mz`，结果：

```text
provider/model       openai-codex / gpt-5.6-sol
approval             allowed-once
Security             ask → allowed-once，audit present
tool                  structured DSH write
Journal              Turn 1，source=git，native-provider-gate.txt
Review                added
usage                 6872 uncached input / 5632 cache read / 43 output
Turn                  completed
```

fixture 与临时 Security rule 已在 gate 结束时删除。随后重启 Host，原 Session
`aezy-alpha-native-provider-spike` 恢复为 Turn 1、相同 native route，并在同一 Session 完成 Turn 2，
精确返回 `ALPHA_NATIVE_RESUME_OK`；DSH projection 更新为 2 Turns，证明 credential、Session、
selection、Responses continuation 与 usage 均跨 restart 恢复。

## 签收结论

Alpha native provider 已可在 `standard` preset 日常使用，且通过 Session/tool/approval/Security/
Journal/Review/usage/restart parity gate。`codex-app-server` 仍使用独立 `aezy-codex` route；默认
DeepSeek model 未改变，mode tests 4/4 通过。

2026-09-01 的官方 npm alpha.3 migration 先用空 credential store 复验相同 owner、authorization
key、OAuth-only method 与 7-model catalog，未启动 OAuth；提升后复用既有 opaque credential 完成
Session `aezy-alpha-native-turn-mti3c5v0` 的 governed write：6,887 uncached input、5,632 cache read、
43 output，approval/Security/Journal/Review 均通过。Inspector 对该 Session 的 live/cold trace 相等，
并在 Host restart 后以 exact prefix 重建相同 digest。完整升级证据见
[`../reference/dsh-0.1.2-alpha3-impact.md`](../reference/dsh-0.1.2-alpha3-impact.md)。

2026-09-02 的 alpha.4 migration 在隔离 3294 发现并修复 Aezy 对已移除 `session.events`
getter 的使用，改为公开 `snapshotEvents()`。提升后的正式 3091 继续返回相同 authorization owner
与 7-model catalog，并以 Session `aezy-alpha-native-turn-mtjj9clr` 完成 governed write：2,365
uncached input、10,240 cache read、45 output，approval/Security/Journal/Review 均通过。三组 mode
Session 又在冷重启后 exact-equal。完整证据见
[`../reference/dsh-0.1.2-alpha4-impact.md`](../reference/dsh-0.1.2-alpha4-impact.md)。

2026-09-04 的 rc.1 migration 确认 provider/authorization seam 没有实质变化：owner 仍是
`@deepseek-ai/dsh-llm-pi-ai`，authorization key 仍是 `llm-pi-ai/openai-codex`，catalog 仍为 7 个
模型。正式 3091 Session `aezy-alpha-native-turn-mtme7us8` 完成 governed write：6,446 uncached
input、6,144 cache read、43 output，Security `ask → allowed-once`、Journal/Review 与 Turn completion
均通过，随后冷重启恢复。完整证据见
[`../reference/dsh-0.1.2-rc1-impact.md`](../reference/dsh-0.1.2-rc1-impact.md)。

本 spike 没有新增或签收 Aezy logout/revocation UI；credential 删除仍应通过 DSH owner 的未来
authorization surface 完成，而不是由 Aezy 读取或改写 credential 文件。

这不代表 `codex-inspired` agent loop 已实现。当前 native route 使用的是 DSH 原生 agent loop；
Codex-inspired 仍是后续独立 backend milestone，必须通过相同 parity contract 后才可进入模式选择器。
