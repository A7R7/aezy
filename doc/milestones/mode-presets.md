# Agent mode 与 Codex App Server preset

> 状态：**Complete on `main` development runtime**<br>
> 日期：2026-09-05<br>
> Runtime：DSH `0.1.2-rc.1` / `~/.aezy-alpha/dsh` / `aezy-alpha` / 3091

## 2026-09-07：模型选择器修复

Aezy 替换面板曾使用两个没有主题样式的原生 `<select>`，现改为公开 DSH `Menu` / `Button`：
模型按 provider 分组，当前项选中，菜单以 portal 避免 composer 裁剪，带 refresh、错误提示、
Escape/outside-click dismissal。推理强度来自模型能力，不自行补齐 Off；新选择和 `/model`
均使用该模型的默认或首个受支持 effort。网络失败可重试，disposed Session 不接收晚到结果。

Codex 与 native mode 的双向 provider fence 保持不变；`aezy-codex` 内的 GPT/DeepSeek
属于同一种官方 Codex engine 的两个隔离通道，不开放 native provider 绕过模式门禁。
目录/失败/销毁/样式契约由 `packages/aezy-mode/tests/directory.test.mjs` 覆盖；浏览器门禁为
`scripts/verify-model-picker.mjs`，仅在隔离 profile 运行，不发送付费模型 Turn。

2026-09-07T02:53:37.775Z 浏览器门禁通过：真实 standard→Codex preset 切换、Astra/五档
effort、GPT/DeepSeek 同目录、选择 high、刷新、Escape、独立 GPT 登录按钮均通过，0 page
errors。截图与 receipt：`.local/aezy-model-fixes-XqAlLV/dsh/aezy/model-picker-proof/`。
Chromium 140 的最小 Linux runner 无法解析系统字体栈，测试浏览器显式加载 DejaVu Sans；
这是记录在 receipt 的测试字体替代，不改变 Aezy 的字体/CSS。随后经用户授权已同步正式
开发 profile；3091 双通道/目录 smoke 通过，开发访问恢复为原有 3090。

## 产品结果

隔离 alpha runtime 重新启用了 DSH 原生 `ui-agent-preset`，新建 Session 可选择上游随包发布的
`standard`、`ptc`、`minimal`、`cordis`，其中 `cordis` 的产品名称为“创造模式”。Aezy 额外
提供不可删除的 `codex-app-server` system preset；旧 `aezy` 仍作为 system preset 存在，保证
历史 Session 能按原 header 恢复。普通启动下 `codex-inspired` 没有目录、roster entry 或可点击
选项；后续 E1 internal dogfood 只能由显式环境开关暂存 exact-digest preset，未改变本门禁。

Session header 的模式名称由原生 `ui-agent-preset` 读取 durable `agentPreset` projection 持久
显示；Aezy 没有复制 header 或 preset 状态机。

## 所有权与实现

`packages/aezy-mode` 是 alpha-only 外置 bundle/client：

- profile patch 打开原生 preset UI，把默认模式设为 `standard`，并加入隔离 system root；
- runtime selector 从**已安装、checksum-pinned 的官方 DSH package**读取其 shipped `standard`
  composition，再追加 Aezy preset ownership overlay，生成 `codex-app-server` composition；
  Aezy 不复制或维护 DSH 的 plan、tool、compaction、workflow、Subagent 配置；
- 浏览器替换 Host-global 的上游 model selector，只投影当前 Session 允许的目录：
  `codex-app-server` 仅显示 `aezy-codex`，其他模式隐藏 `aezy-codex`；
- Host `llm/stream` hook 在 DSH 完成 Session model selection 后拒绝 Codex mode 内的非 Codex
  route；preset-scoped `agent/request` 只验证自身 preset 归属；
- `@aezy/codex` adapter 在 App Server turn/thread I/O 前再次按 Session header 拒绝越界执行；
  `codex-app-server` 是正常入口，`aezy` 仅是历史 Session 兼容例外；该包不声明 rc.2 runtime 兼容。

catalog 仍由 DSH Host 统一生成，这是 rc.1 的公开 seam；因此 Remote
`session/modelCatalog` 会包含 DeepSeek 与 Codex。隔离策略不伪造第二份 Host catalog，而在 UI
目录和最终执行边界做双门禁。

2026-09-05 的真实新建 Codex Turn 暴露了此前 smoke 未覆盖的问题：standing preset 位于
Session model-selection wrapper 内层，其 `agent/request` 返回时仍是默认 seed provider。
因此不能在该处检查最终 route，也不能靠调整 preset 插入顺序修复。现在使用公开
`llm/stream` final request seam 和 `agents.currentInitiator()`；默认导出的 apply 函数显式携带
`inject` 元数据。5 项 mode 回归含真实 Cordis Context；DeepSeek 真实 Codex Thread 的治理与
restart 证据见 [`codex.md`](codex.md)。没有重写 Session selection 或放宽 `aezy-codex` 门禁。

## 3091 真实证据

真实 `/api` Remote roster 精确返回：

```text
standard / ptc / minimal / cordis / aezy / codex-app-server
```

`standard` 是默认项；前四项和中文产品名称来自官方 shipped root，后两项来自 Aezy system
root。roster 不含 `codex-inspired`。真实创建并恢复了三个隔离 proof Session：

```text
aezy-alpha-standard-mode-proof → agentPreset=standard
aezy-alpha-legacy-mode-proof   → agentPreset=aezy
aezy-alpha-codex-mode-proof    → agentPreset=codex-app-server
```

`session/list` 的 durable projections 均保留对应 `agentPreset`。最终 authenticated Web index 为
21,691 bytes，加载 `@aezy/mode` 与原生 `@deepseek-ai/dsh-client-ui-agent-preset`；composition dump
确认上游 global `ui-model-selection` 被禁用、Aezy replacement 已装载。真实 Codex preset 首次
暴露 alpha `dsh-plan-mode.section` 新约束后，selector 改为派生官方 standard composition，复验
创建成功；没有用 rc.2 仿制层绕过该约束。

alpha.3 migration 复验确认 shipped `standard/agent.cordis.yml` 与 alpha.1 byte-identical，虽然
preset manager UI 已把默认选择 owner 调整到 roster section，Aezy 的 package-owned composition
与 durable header seam 无需 shim。隔离 3193 与提升后 3091 都成功创建 standard、
`codex-app-server` 和 exact revision 1 Session；最终普通 sync 后 roster/system root 仍不包含
codex-inspired dogfood preset。

alpha.4 migration 再次在隔离 3294 与正式 3091 创建 `standard`、`codex-app-server` 和 exact
revision 1 Session，并在冷重启后恢复相同 durable preset projection。上游 PTC 在 alpha.4 不再
装载 workflow；Aezy 不复制该配置，codex-inspired 继续由 exact standard composition 加外置
overlay 组成。最终 normal sync 的 roster 仍精确为六个普通 mode，不残留 dogfood preset。

rc.1 migration 在隔离 3395 与正式 3091 再次创建并冷恢复 `standard`、`codex-app-server` 和
exact revision 1 Session。shipped preset、`ui-agent-preset`、Host catalog 与 provider fence 均无
实质变化；alpha.4 carryover Session 可读。最终 normal sync 的 roster 仍为六个普通 mode，未建立
双 runtime 或残留 dogfood preset。证据见
[`../reference/dsh-0.1.2-rc1-impact.md`](../reference/dsh-0.1.2-rc1-impact.md)。

自动门禁：

```text
pnpm run build:mode
pnpm run test:mode    # 4/4
pnpm run test:codex   # 20/20，含 3 个 provider fence 场景
pnpm run test:alpha:runtime
```

## 仍然阻塞产品提升

本切片只完成 mode/preset 与隔离执行边界。`main` 的开发命令只指向 3091/
`~/.aezy-alpha/dsh`；codex-inspired 完整 parity 通过前仍不可进入普通 mode roster。
