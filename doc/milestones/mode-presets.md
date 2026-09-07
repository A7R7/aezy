# Agent mode 与 Codex App Server preset

> 状态：**Complete on `main` development runtime**<br>
> 日期：2026-09-05<br>
> Runtime：DSH `0.1.2-rc.1` / `~/.aezy-alpha/dsh` / `aezy-alpha` / 3091

## 2026-09-07：统一模型身份与分组运行方式

仅在现有“运行方式”菜单内区分 **DSH 工作预设** 与 **Codex 执行引擎**，不增加独立引擎
选择框。外置 client 通过公开 slots `entries/subscribe/StoredEntry.inject` 复用原生 seat
business face，只替换渲染；上游 controller 继续拥有 staging、blank Session、creator draft、
durable preset 与首个 Turn 后锁定。原生 Session header 不替换。

模型菜单和 `/model` 使用 Host catalog 的统一模型身份并集，不再按模式隐藏另一套目录。
仅合并明确拥有的 GPT 与 DeepSeek Flash/Pro route alias；同名第三方 provider 不自动合并。
切换空白会话的 standard/PTC/minimal/创造模式保留模型；跨 Codex 时由同一身份选择实际
兼容 route，经 DSH `session/selectModel` 持久化，不换模型、不借用另一通道凭据。
没有兼容 route 的条目保留、禁用并显示原因；effort 采用实际 route metadata，保留仍受支持的值。
历史 `aezy` Codex Session 不自动迁到 native。已有 Turn 的 preset 锁与 Codex Thread/runtime
归属仍有效，跨已有 Thread 的 GPT/DeepSeek 通道请新建会话。这是薄投影，不是多 runtime 调度器。

隔离 profile `.local/aezy-model-fixes-XqAlLV/dsh` / `aezy-model-fixes`：

- 浏览器 receipt `2026-09-07T09:54:10.048Z`：一个分组运行方式按钮，Astra/high 刷新保持，
  Flash 在 standard→PTC→minimal→Codex 往返保持，实际 RPC 回执验证 native/Codex provider；
  不兼容项禁用，SVG 箭头正常，0 page errors、0 模型调用。截图/receipt 在
  `aezy/model-picker-proof/`；测试字体替代沿用下方说明。
- native DeepSeek receipt `2026-09-07T09:48:50.821Z`：`deepseek-official/deepseek-v4-flash`，
  修复、4 次审批、测试、网络拒绝、Journal/Review、完整 Inspector、分页和重启续跑通过；
  网关调用数为 0。receipt：`aezy/dsh-deepseek-proof.json`。
- Codex DeepSeek receipt `2026-09-07T09:55:58.386Z`：同一模型身份，经 `aezy-codex` 路由，
  相同开发门禁及同 Thread 重启续跑通过，已开始的 preset 切换返回 `agent-preset/locked`；
  Inspector 如实为 partial。receipt：`aezy/opencodex-proof.json`。

补跑 native Session `aezy-owned-deepseek-dsh-mtr2pnb6` 未通过：模型先请求
`pwd && ls -la /tmp/aezy-governed-project-uXdmtc`，偏离本测试只允许 read/write/精确 test
命令的审批白名单，被拒绝并中止，未执行该命令。此前成功 receipt 保留；这说明真实模型
指令遵循有波动，不把一次成功宣称为稳定性签收，也不为了通过测试扩宽审批。
163 项自动测试全部通过（含官方进程测试、selection race/stale refresh 和 slot 卸载重载契约）。

开发 profile 已同步，3091 最小 smoke 通过并恢复 3090。Astra 也已通过同一身份解析器选择
官方通道并完成真实 DSH read Turn；验证发现的账户路由覆盖错误独立修正，详见
[`codex.md`](codex.md)。本切片没有升级 DSH/Codex，也没有修改只读 reference。

测试入口：`verify-model-picker.mjs` 与 `verify-opencodex-governed-development.mjs`；后者显式
`AEZY_MODEL_PROOF_ENGINE=dsh|codex` 选择一次性真实验证，不建立产品双 runtime 兼容层。

## 2026-09-07：模型选择器修复（历史记录）

后续修正：模型与 effort 按钮的 `⌄` 字符替换为公开
`IconChevronDownOutline14` SVG（固定图标尺寸、禁止 flex 压缩，不依赖字体字形）。
`2026-09-07T03:32:29.855Z` 浏览器回归检查两个按钮均有 SVG，Codex 模式可选 Astra/high
并刷新保持，旧 GPT/DeepSeek 仍在目录，0 page errors。截图/receipt 路径同下。

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
- 浏览器替换 Host-global 的上游 model selector，显示统一身份目录并解析当前运行方式允许的
  route；不兼容模型保留但禁用，`codex-app-server` 仍只执行 `aezy-codex`；
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
