# Codex-inspired Agent Loop

> 状态：**E1 internal dogfood slice verified；完整 parity pending；不可点击**<br>
> 日期：2026-08-30<br>
> Runtime：DSH `0.1.2-alpha.1` / `~/.aezy-alpha/dsh` / `aezy-alpha` / 3091

## 当前产品结果

Aezy 已有第一个可执行的 `codex-inspired` system-authored macro loop。它不是把 Codex model
放进标准模式，也不是复制 Codex 或 DSH 的底层 agent 内核：模型仍可独立选择，DSH 继续拥有
Session、model→tool→approval→result micro-loop、Security、compaction、Subagent、usage、cancel
与 persistence。Aezy 新增的外置 `@aezy/workflow` 只负责：

- 发布 immutable、versioned、canonical-digest 的内部 LoopDefinition；
- 在 capability/binding 不满足时 fail-closed；
- 把宏观 coding policy 与四类硬预算编译到 DSH 公共 Agent/tool/LLM seam；
- 只在显式 `AEZY_CODEX_INSPIRED_DOGFOOD=1` 时暂存 exact-digest system preset。

普通 3091 启动不会安装该 preset 目录，原生 mode selector 仍精确返回
`standard / ptc / minimal / cordis / aezy / codex-app-server`。因此本切片允许内部真实 dogfood，
但没有提前提供可点击产品选项。

## Revision 1

当前 system definition：

```text
id       codex-inspired
revision 1
digest   f7841cbd49ebf7f3ad8e73db76e945eca86c6c7ac6311871bbd9d402f0fb0248
preset   codex-inspired-r1-f7841cbd49ebf7f3ad8e73db76e945eca86c6c7ac6311871bbd9d402f0fb0248
target   dsh-agent-hooks@1
```

静态 topology 描述宏观 coding loop，而不是把调用日志换一种画法：

```text
bind task boundaries
  → investigate repository/runtime facts
  → choose and maintain a proportionate plan
  → implement the smallest coherent change
  → run proportionate verification
  → inspect diff / Journal / usage / remaining risk
  → evidence-backed completion check
      ├─ complete   → checkpoint/compaction → finalize
      └─ incomplete → bounded recovery ─────→ investigate
                         └─ exhausted ───────→ finalize
```

每个 cycle 必须经过 `bounded-retry`。revision 1 固定上限为 64 iterations、1 hour、250,000
tokens 与 256 tool calls；definition 或 overlay 的 id/revision/digest/preset/budget 任一不一致，
runtime 都拒绝挂载。schema 只允许声明式 JSON 数据与节点白名单，拒绝 code、script、package
import、prompt eval、未知字段、无界 cycle 和不可达节点。

## 公共 seam 与所有权

runtime controller 只使用固定 alpha.1 的公开 seam：

- `agent/pre-step`、`agent/request`、`agent/turn-stopping`：检查 durable Turn facts 与硬预算；
- `tools/pre-execute`：在调用已经进入 DSH durable log 后执行 tool-call budget，允许时继续委托
  DSH approval/Security owner；
- `llm/stream`：在 DSH Session model-selection 已经解析完成、provider I/O 尚未开始时执行最终
  route fence；拒绝 `aezy-codex` App Server route，允许独立 DSH-native provider/model；
- `systemPrompt.section`：注入与静态 macro topology 对应的 evidence-driven coding policy；
- `agent/status`：只为 exact preset 安装 wall-time cancellation timer。

早期 spike 曾把 provider fence 放在 `agent/request`，实机证明该层仍可能看到 Agent seed route，
而不是 Session controller 的最终 model selection。最终实现将门禁移到 `llm/stream`，既避免
把模型选择误判成 loop owner，也没有绕开 DSH transport。

## 自动与真实证据

```text
pnpm run test:workflow              12/12 pass
pnpm run test:alpha:runtime         12/12 pass
pnpm run test:mode                   4/4 pass
pnpm run test:inspector             10/10 pass
pnpm run test:codex                 20/20 pass
git diff --check                    pass
```

真实 gate 使用 disposable `/tmp` workspace、内部 exact preset 与
`openai-codex/gpt-5.6-sol/low`：

```text
Session        aezy-codex-inspired-mtfs9w1k
Turn 1         structured DSH read + durable call/result + completed
Host restart   same exact preset revision/digest restored
Turn 2         same Session continued with a second structured DSH read
policy         request/header contains Codex-inspired execution policy
usage after T2 8940 uncached input / 16896 cache read / 72 output
```

gate 不读取 OAuth token；只使用 3091 的短期 launch token 建立签名 Web cookie。fixture 已删除。
最后以普通环境重启 3091，system root 只包含 `aezy` 与 `codex-app-server`，未残留 dogfood preset。

## 尚未签收

这不是完整 codex-inspired milestone，也不是“alpha MVP loop 可点击”的声明。以下 parity 仍需在
这个 exact preset 下逐项实测，而不能借用 `standard` 的既有结果代替：

- mutable structured tool 的 approval + Aezy Security allow/deny/audit；
- Turn Journal/Review 与真实 Aezy self-development change；
- cancel/interrupted、provider retry、四类预算耗尽；
- compaction/checkpoint usage；
- parallel/nested tools 与 Subagent lineage/budget/cancel/restart；
- 专属 codex-inspired Inspector blueprint 的 live/cold/restart reconstruction；
- compiler/controller failure 不破坏 DSH Session truth。

完整 parity 通过前，preset 继续只允许显式内部 dogfood，不进入 mode selector。E2 模板 Editor 与
E3 受限控制流仍暂停；E4 不在范围内。
