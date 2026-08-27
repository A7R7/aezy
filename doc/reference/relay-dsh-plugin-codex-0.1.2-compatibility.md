# Relay DSH Codex 0.1.2 与 Aezy 兼容性门禁

> 验证日期：2026-08-28<br>
> 被测包：`relay-dsh-plugin-codex@0.1.2`<br>
> 固定 runtime：`@openai/codex@0.149.0`<br>
> DSH：`0.1.1-rc.2`<br>
> 结论：**companion 硬约束失败，不安装到 Aezy 主 profile；进入最小外置 adapter 路线。**

## 为什么先测 companion

Aezy 不应在已有可信实现时重写 Codex App Server lifecycle、Thread binding、fork、approval
provenance 或 history import。`relay-dsh-plugin-codex` 正好以外置 DSH bundle 的形式覆盖这些
seam，因此先验证固定 npm 产物；只有 coding-agent 硬约束失败，才授权 Aezy 自写更窄的
adapter。

被测产物不是 GitHub `main`：

- npm：`relay-dsh-plugin-codex@0.1.2`
- integrity：
  `sha512-UD3Ud3zTsxRY/0ZlLsAqbAopXb7fPY5zXjefMRWsAqG+wBaZMNSrYd5XpI453xBe8M/KdNFdae+Ha3HNI+aQ4w==`
- repository：<https://github.com/yangbobo2021/relay-dsh-plugin-codex>
- peer range 接受 DSH rc.2；包内 README/可靠性矩阵也声明以 rc.2 为验收基线。

官方协议 owner 仍是 Codex App Server；Relay 和未来 Aezy adapter 都不能读取 token、复制
conversation history 或替代 Codex agent loop。协议依据见
[Codex App Server](https://developers.openai.com/codex/app-server/)。

## 隔离方式

验证使用 `/tmp/aezy-relay-codex-gate` 作为 `DSH_HOME`，profile 名为 `relay-gate`，Host 监听
`127.0.0.1:3091`；主 Aezy rc.2 Host 始终留在 3090。没有修改 `.local/deepseek-harness/`，
也没有把 Relay 安装到 `~/.aezy/dsh`。

仅覆盖 `DSH_HOME` **不足以隔离 Relay**：插件默认把 Session↔Thread binding 写到
`~/.relay/codex-dsh-links.json`。第二次启动开始显式设置：

```bash
RELAY_CODEX_LINK_PATH=/tmp/aezy-relay-codex-gate/codex-dsh-links.json
```

首次启动产生的外部 binding 文件已在测试后删除；逐字原始副本与后续隔离副本保留在
`/tmp/aezy-relay-codex-gate/`，可恢复。不得把默认路径带入正式 Aezy profile；正式实现应由
Aezy profile 明确提供受管状态路径。

独立 DSH Web profile 还有一个安装事实：`@deepseek-ai/dsh-web-app` 会触发 `koffi` build，
需要按包精确批准；重新执行 `plugin add` 时 pnpm 还尝试下载所有 Codex 平台 optional
artifact。不得用“允许所有 build”或无限等待掩盖该行为。

## 通过的能力

### App Server 与账户

- bundled App Server 成功启动，公开状态端点返回
  `CODEX_APP_SERVER_CONNECTED`；
- bundled CLI `login status` 返回 ChatGPT managed login；
- `account/read` 的去标识结果为 `type: chatgpt`、`planType: prolite`；
- `account/rateLimits/read` 返回 `codex` 与 `codex_bengalfox` bucket；
- `account/usage/read` 返回 summary 和 30 个 daily buckets；
- schema 证明当前固定 Codex 版本还提供 login/logout、rate limits、usage 与 Thread API。

Relay 自己只把连接状态暴露到 `/api/relay/codex/status`。它在启动时读取 account，但没有把
plan/rate/usage 或 managed login/logout 做成 DSH 产品入口；README 要求用户先用另一个官方
Codex 客户端登录。因此它只能**复用已有登录**，不能单独满足“Aezy 内完成 OAuth”的产品
要求。

### Session、stream、resume 与 cancel

在 DSH Session 中显式选择 `provider: relay-codex`、`model: gpt-5.6-luna`、
`reasoningEffort: medium` 后：

1. 第一 Turn 流式产生 `assistant/chunk`、`assistant/message`、`turn/end`；
2. 同一 DSH Session 的第二 Turn 正常续聊；
3. 停止 3091 Host，用显式临时 binding store 重启后，第三 Turn 保持同一选择并正常续聊；
4. 第四 Turn 在 `turn/start` 后调用 DSH 原生 `session.cancel`，以
   `turn/end: aborted / user` 收敛。

这证明 Relay 的基本 Thread binding、DSH presentation Session、stream、Host restart resume
和 cancel 路径可以工作。插件关于 fail-closed fork、stale approval provenance 与 import 的
源码/测试设计值得借鉴，但本门禁没有把其自述等同于 Aezy 实机签收。

## 硬约束失败

### 1. 工具调用没有形成权威事件

`gpt-5.6-luna` 被要求运行一个需要审批的命令时，把 DSML `tool_calls` 标记直接写进
`assistant/message` 文本；DSH history 没有 `tool/call`、`tool/result`、`approval/asked` 或
`approval/decided`。

为排除 Luna 特例，又创建了首 Turn 就固定 `gpt-5.6-sol` 的全新 Session：

- 请求 `touch /etc/aezy-relay-approval-probe` 时，助手文本声称“permission denied”，但仍没有
  任何结构化 tool/approval 事件；目标文件确实没有创建；
- 请求只读 `pwd` 时，助手文本声称实际输出为 Aezy cwd，但仍没有 `tool/call` 或
  `tool/result`。

这不是 UI 缺卡片，而是 truth-source 失败：文本声称执行不能替代可审计的结构化工具事实。
因此 command/file-change approval、Aezy Security、Turn Journal 和真实 coding loop 均不能
签收。

### 2. approval round-trip 无法到达

测试在 Turn 前建立 DSH `/api/events.mux` WebSocket，并准备通过 `/api/respond` 明确
`outcome: rejected`。两种模型均未产生 `approval/requested`，所以不能证明 Relay 的
App Server approval → DSH approval → App Server response 路径在当前模型目录下可用。

包内可靠性测试和实现中的 provenance tuple 设计仍有参考价值，但 mock/fixture 通过不能覆盖
上述真实模型不产生结构化调用的事实。

### 3. 同 Thread 切模型不安全

已有 Luna history 的 Thread 切到 `gpt-5.6-sol` 后，下一 Turn 以
`CODEX_TURN_FAILED / invalid_encrypted_content` 结束：历史 encrypted reasoning 无法由新模型
验证。Aezy 不能向用户承诺既有 Thread 可任意切模型；adapter/UI 至少应在已开始的 Codex
Thread 上锁定模型，或只使用 Codex 官方明确支持的迁移 seam。

### 4. 运行配置还有产品缺口

- App Server catalog 的默认模型是 `deepseek/deepseek-v4-flash`，不能用默认选择证明 Pro
  Codex route；必须显式选择目标模型；
- Relay bundled launcher固定传入 `--analytics-default-enabled`。Aezy 的兼容探针移除了该参数；
  正式产品不能在未作产品/隐私决策时默认为用户启用 analytics；
- binding store 默认逃逸 `DSH_HOME`；
- DSH profile 没有 in-app managed OAuth control，只能复用外部预登录。

## 与已完成 Aezy 能力的兼容矩阵

| Aezy 能力 | 结果 | 依据与影响 |
| --- | --- | --- |
| DSH Session | 部分通过 | Relay 以 DSH Session 作 presentation，持久绑定 Codex Thread；三 Turn 与重启 resume 通过 |
| Worktree / Handoff | 架构可兼容，未签收 | Relay 接受 Session cwd 且不自建 Worktree；但未在 M3 managed Worktree 上跑真实工具 Turn |
| Turn File Change Journal | 失败 | 实机无 `tool/call/result` 与 file-change 事实，不能让文本结果进入 durable journal |
| Security / Approval Rules / Network Policy | 失败 | 无真实 approval round-trip；Codex 命令也未证明经过 Aezy 的 DSH tool boundary |
| Integrated Terminal | 可共存 | Relay 不替换 DSH PTY；其 optional Relay terminal provider 不是 Aezy Terminal 所需依赖 |
| Review / Files | 静态共存，动态未签收 | 面板可并存；没有真实 Codex file-change event，无法证明自动 Review 数据链 |
| Usage | 上游可读、Relay 产品面不足 | App Server rate/usage API 通过；Relay status route 只公开 connection state |
| OAuth | 复用通过、产品要求失败 | 共享 ChatGPT login 可用；Relay 不提供 Aezy 内 browser/device login/logout 控制 |

所以不能把 Relay 直接加入 Aezy profile 后声称“可替代 Codex Desktop”。那会让对话看似工作，
但 coding truth、approval 和 journal 都可能是假阳性。

## 决策与可借鉴部分

### 当前决定

`relay-dsh-plugin-codex@0.1.2` **不进入 Aezy 主 profile**。这次已满足“companion 硬约束失败
才自写 adapter”的条件；下一步允许实现一个更窄的外置 Aezy Codex adapter，但仍以官方
App Server 为 OAuth、credential、Thread、Turn、tool execution 和 compaction owner。

### 值得复用的设计，不复制代码内核

- Host 明确拥有一个 App Server child，并在 dispose 时关闭；
- bundled command → environment override → config override 的可诊断 launcher；
- DSH Session↔Codex Thread 一对一 binding 与 fail-closed resume/fork；
- pending approval 绑定 Session/Thread/Turn/Item/request/binding epoch；
- stale approval 必须 reject；
- import 与 history sync 不复制 Codex 私有运行记录；
- status 使用稳定错误码，不把原始 `spawn ENOENT` 暴露为产品文案。

Aezy 不应复制 Relay 的完整 implementation，也不应修补该包或 DSH 源码。最小 adapter 的第一
个 contract test 必须先证明：真实 `gpt-5.6-sol` Turn 产生官方 App Server structured item，
真实 command/file-change approval 可往返，随后才接 DSH tool/Security/Journal 投影。

## 后续门禁

1. 固定官方 Codex 版本，自己用最小 stdio client 验证 login、account、thread/turn、structured
   command/file-change item、approval response、interrupt 与 usage；
2. 不传 `--analytics-default-enabled`，不读取 token，不实现 refresh；
3. adapter 只持有 opaque Thread binding，并将状态写入 Aezy 受管 profile 路径；
4. 先在临时 repo/worktree 做真实文件修改，证明 Turn Journal、Security 与 Review；
5. 再组合 Aezy Terminal，运行现有 M0–M4/Terminal 回归；
6. 最后才用 Aezy 修改 Aezy 自身并重启 3090，签收 self-development loop。

## Relay 后的直接官方协议复核

同日新增 `@aezy/codex` 最小 process/protocol client，直接启动同一个固定
`@openai/codex@0.149.0`，且不传 `features.code_mode_host=true` 或
`--analytics-default-enabled`。真实 `gpt-5.6-sol` `pwd` Turn 成功产生官方
`item/started`/`item/completed: commandExecution`，并正常收到 token usage、rate-limit 与
`turn/completed` 通知。

这把故障边界进一步缩小到 Relay 的 DSH/code-mode 映射，而不是账户或官方 App Server
本身。直接协议通过仍不等于 Aezy 产品闭环通过；DSH Session binding、approval round-trip、
Security、Journal/file-change 与 managed login UI 继续保持 Pending。
