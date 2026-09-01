# Agent mode 与 Codex App Server preset

> 状态：**Complete on `alpha` branch runtime；尚未合回主线**<br>
> 日期：2026-09-01<br>
> Runtime：DSH `0.1.2-alpha.3` / `~/.aezy-alpha/dsh` / `aezy-alpha` / 3091

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
  composition，再只在开头加一行 Aezy provider fence overlay，生成 `codex-app-server` composition；
  Aezy 不复制或维护 DSH 的 plan、tool、compaction、workflow、Subagent 配置；
- 浏览器替换 Host-global 的上游 model selector，只投影当前 Session 允许的目录：
  `codex-app-server` 仅显示 `aezy-codex`，其他模式隐藏 `aezy-codex`；
- preset-scoped `agent/request` hook 拒绝 Codex mode 内的非 Codex route；
- `@aezy/codex` adapter 在 App Server turn/thread I/O 前再次按 Session header 拒绝越界执行；
  `codex-app-server` 是正常入口，`aezy` 仅是历史 Session 兼容例外；该包不声明 rc.2 runtime 兼容。

catalog 仍由 DSH Host 统一生成，这是 alpha.3 的公开 seam；因此 Remote
`session/modelCatalog` 会包含 DeepSeek 与 Codex。隔离策略不伪造第二份 Host catalog，而在 UI
目录和最终执行边界做双门禁。

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

自动门禁：

```text
pnpm run build:mode
pnpm run test:mode    # 4/4
pnpm run test:codex   # 20/20，含 3 个 provider fence 场景
pnpm run test:alpha:runtime
```

## 仍然阻塞默认提升

本切片只完成 mode/preset 与隔离执行边界。`alpha` 分支的默认开发命令已经只指向 3091/
`~/.aezy-alpha/dsh`，但合回主线前仍须完成相称的 M0–M4.2、Terminal、Security、Codex、
自开发 loop 与 Session/tool/approval/Journal parity gates。
