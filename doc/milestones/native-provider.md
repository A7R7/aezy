# Alpha native provider spike

> 状态：Owner/catalog/Session selection spike complete；OAuth 与真实 native Turn pending
>
> Runtime：DSH `dsh-v0.1.2-alpha.1` / `cd5ef8148158c3a752a658978873241fdf8e2bbc`，
> `~/.aezy-alpha/dsh`，profile `aezy-alpha`，Host `127.0.0.1:3091`

## 目标与边界

本切片验证“OpenAI/Codex 模型”和“Codex App Server agent loop”可以独立存在。Aezy 不增加
第二个 provider implementation，只在外置 `@aezy/base` composition 中启用 alpha.1 已有的
`@deepseek-ai/dsh-llm-pi-ai` `openai-codex` route，并挂载 DSH 的
`@deepseek-ai/dsh-authorization` service。

权威所有权保持为：

- DSH `llm-pi-ai` 持有 model catalog、Responses transport、OAuth grant/refresh 和 credential
  store；
- DSH Session 持有 provider/model/reasoning selection 与 durable projection；
- Aezy 只启用现有 owner、提供 profile composition 和验证 gate；
- 既有 `aezy-codex` 仍只服务 `codex-app-server` system preset，Codex App Server 继续持有该
  preset 的 account/thread/turn/agent loop；
- 本切片不读取 token、不迁移凭据、不发起 OAuth、不发送模型请求，也不实现
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

自动门禁：

```text
node --test scripts/alpha-runtime.test.mjs                 5/5 pass
TMPDIR=/tmp TMP=/tmp TEMP=/tmp \
  node scripts/verify-alpha-native-provider.mjs            pass
pnpm run test:mode                                         4/4 pass
node --check scripts/verify-alpha-native-provider.mjs       pass
git diff --check                                            pass
```

isolated owner probe 返回 authorization key `llm-pi-ai/openai-codex`，唯一方法为 `oauth`，标签
为 `OpenAI (ChatGPT Plus/Pro)`；fresh store 显示 `credentialConfigured=false`、
`inFlight=false`、`oauthStarted=false`。

## 未通过的完成门槛

本切片尚不能称为“native provider 可日常使用”。下一步必须由用户明确授权后，通过 DSH
authorization owner 完成一次 OAuth，随后在 `standard` preset 执行真实模型 Turn，并验证：

1. credential 持久化与 Host restart 后恢复由 DSH owner 完成；
2. DSH Session/tool/approval/Security/Journal 事实保持原生链路；
3. `codex-app-server` preset 的 catalog/Host fence 不回归；
4. logout/revocation 与错误路径不泄漏 token；
5. 真实 usage 只投影 provider/Session 已有事实。

只有这组 authenticated Turn gate 通过后，才把本 milestone 标为 Complete。Codex-inspired agent
loop 仍是后续独立 backend milestone，不因 native model route 出现而被视为已经实现。
