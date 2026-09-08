# Aezy 接手指南

> 更新：2026-09-08。仓库：`/home/aaron/repos/aezy-dsh-mvp`；分支：`main`。
> 最近功能提交：`57c552b58c`（Logs/Debug/Usage），部署验收：`1bb4792740`。
> 此后文档提交不改变运行基线。接手时以 `git status`、`git log` 和实际 Host 为准。

本文件只维护当前事实、边界与下一步，不是历次开发流水账。先完整阅读本文件、
[README](README.md)、[所有权路线图](doc/roadmap/aezy-upstream-ownership-roadmap.md)，
再按 [文档索引](doc/README.md) 选择相关 milestone；不要递归加载整个 `doc/`。

## 1. 项目定位与不可破坏的边界

Aezy 是基于 DSH 公开扩展机制的本地编程 Agent 工作台：组合 DSH 原生 Agent 与官方
Codex App Server，在统一项目界面中提供模型选择、受治理工具、Review、Terminal 和观测。
它不是 DSH fork，也不再追求自己复刻 Codex 的提示词和 micro-loop。

- `.local/deepseek-harness/` **只读**：不编辑、格式化、生成、构建或相对导入其中源码。
- 只通过参考树外的 package/plugin、bundle、profile patch、adapter 和公开接口扩展。
  优先完整同版、integrity 可验证的官方 npm family；版本确实未发布时，才允许固定官方
  immutable commit 在仓库外经过官方 build/pack 与 packed-install 验证的 artifact。
- 不复制 DSH/Codex 的 Session、tool、approval、Security、Subagent、usage、cancel、
  compaction、Task 或 PTY 内核。观测/投影不拥有执行事实，不反向控制 Agent。
- 不读取、复制或自行刷新 OAuth；GPT 登录交给官方 owner，DeepSeek key 经 DSH
  settings/credentials owner 解析。不得导入个人 Codex/OpenCodex config/history/catalog。
- 保持 Git fingerprint、并发检查、atomic Undo/Redo 和 fail-closed；不借新功能泛化 M1–M4。
- 不捆绑 Browser、Boards、Cloud/Remote/PR、Side Chat、DAG 或 merge-back。
- 现有修改属于用户；每个大步骤独立提交，精确 `git add -- <paths>`，不使用 `add .`/`-A`。
- 网络沿用 proxy 环境变量，缺失时回退 `http://127.0.0.1:7890`。根 [AGENTS.md](AGENTS.md) 同样适用。

## 2. 运行环境：不要混淆版本、端口与历史参考

| 项目 | 当前事实 |
| --- | --- |
| DSH runtime | `0.1.2-rc.1`，242-package 官方 npm family，逐包 SHA-512 |
| Runtime tag / commit | `dsh-v0.1.2-rc.1` / `a66e4702047846cdaa10c66c9d3df3951f5ea70d` |
| 官方 Codex | npm `0.153.4`；不是个人 CLI 的版本 |
| 已验证平台 | Node `24.20.0`、pnpm `11.7.0`、Linux/WSL2 x64 |
| 开发 home / profile | `/home/aaron/.aezy-alpha/dsh` / `aezy-alpha` |
| 正在服务的端口 | **3090**；本次文档整理时仍在监听 |
| 测试端口 | 3091、3197 当前均停止；不要与同一 profile 的 3090 并行启动 |
| 历史只读 reference | alpha.1 / `cd5ef8148158c3a752a658978873241fdf8e2bbc`，不是运行版本 |
| 外置 Aezy packages | 13 个；清单由 `scripts/lib/alpha-runtime.mjs` 持有 |

版本与 integrity 读 [runtime metadata](compatibility/dsh-alpha-runtime.json)、
[官方 family](reference/dsh-rc1-npm-family.json)、[网关 pin](compatibility/opencodex-runtime.json)；
reference 身份读 [reference lock](reference/dsh.lock.json)。metadata 内部分端口、package 数
和旧 stable home 是迁移时快照；当前服务以实测和上表为准，不因旧字段启动第二个 owner。
`~/.aezy/dsh` 是历史状态，不是本次运行目录。不恢复 alpha 分支或重做已完成的 migration。

```bash
# 只读起手检查，不自动升级、安装或重启：
git status --short
git log -5 --oneline
ss -ltn '( sport = :3090 or sport = :3091 or sport = :3197 )'
```

实际 Node 路径为 `/home/aaron/.cache/aezy/toolchains/node24/bin/node`，pnpm 在
`/home/aaron/.local/bin`。以下是需要时的命令，**不是接手时应自动执行的步骤**：

```bash
pnpm profile:sync
pnpm alpha:web -- --host 127.0.0.1 --port 3090 --no-open
```

重启前核验真实 PID/profile 和活跃 Turn，通过正常终止让 owner 释放锁，绝不删除活跃锁。
用户已批准并完成上次部署；这不是新对话可随意中断服务或重复付费测试的长期授权。
本机保留的隔离 QA home 为 `.local/aezy-model-fixes-XqAlLV/dsh`，profile `aezy-model-fixes`；
它不是长期第二套产品 runtime。临时 bootstrap URL 属于认证信息，不打印到聊天或提交。

## 3. 已交付、已封存与仍未证明的能力

| 能力 | 当前状态 / 权威记录 |
| --- | --- |
| Composition、品牌 | Complete；[M0](doc/milestones/m0.md) |
| Turn journal、Project/Review、Undo/Redo、Worktree/Handoff、Files/context | Complete；[Turn journal](doc/milestones/turn-journal.md)、[M1](doc/milestones/m1.md)、[M3](doc/milestones/m3.md)、[M4](doc/milestones/m4.md) |
| Approval Rules / Network Policy | Complete；[M2](doc/milestones/m2.md) |
| Integrated Terminal | Complete；DSH line PTY，不是 raw TTY；[Terminal](doc/milestones/terminal.md) |
| DSH native / Codex App Server / 模型菜单 | 已交付；[Modes](doc/milestones/mode-presets.md)、[Native provider](doc/milestones/native-provider.md)、[Codex](doc/milestones/codex.md) |
| Logs & Debug / Usage | **已部署 3090、验收完成**；[Observability](doc/milestones/observability.md) |
| Loop Inspector | **E0.1 revision 3 candidate，等待产品验收**；[Inspector](doc/milestones/loop-inspector.md) |
| codex-inspired / workflow parity | **封存**；revision 1 既有证据留档，不重做、不上架；[历史 milestone](doc/milestones/codex-inspired.md) |

### 模式与通道

- 普通菜单精确为 `standard / ptc / minimal / cordis / codex-app-server`；`cordis` 是创造模式。
  单个“运行方式”菜单分组表达 DSH 工作预设和 Codex 引擎，暂不增加独立引擎选择框。
- 模型身份统一，不抹平实际 route 的鉴权/能力差异。空白会话换 preset 尽量保留模型；
  无兼容通道则禁用并解释，不偷偷换模型。已开始的 Session 由 DSH 锁定 preset。
- `aezy` 模式已退役。12 个 legacy/封存测试 Session 已经 owner 归档并移出活动存储，
  可恢复清单：`~/.aezy-alpha/dsh/aezy/retired-sessions/2026-09-08-KD4FuO/manifest.json`。
  缺失 preset 的旧 Session 恢复错误及菜单长错误挤坏 UI 已修复，不重做清理。
- codex-inspired 不允许装回正式 profile；只有显式独立 home/profile 才可进行历史研究验证。
  保留源文件不等于路线恢复。E2/E3 暂停，旧 Activity 实验已 revert，Relay companion 不安装。

### Codex 与网关

- `@aezy/opencodex` 是历史包名，现在实现的是 Aezy 原创、Host 内置 Node Responses 网关。
  不启动或依赖 OpenCodex/Bun/`ocx sync`，不连接个人 `localhost:10100`。
- DeepSeek Codex home 为 `aezy/codex-runtime`，网关状态在 `aezy/model-gateway`；GPT 在
  `aezy/codex-openai-runtime`，均位于本 profile 的 DSH_HOME 内，配置/鉴权独立。
- GPT 通过 Aezy Settings 的独立登录和官方账户路由使用；不要恢复强制 `openai_base_url`
  覆盖，否则可能把 ChatGPT 登录错误送到 API-key 端点。当前账户已登录，Astra 目录与真实调用通过。
- 旧/异 runtime Thread binding 保留但拒绝自动恢复。已有 Thread 跨 GPT/DeepSeek 通道要新建
  Session，不迁移历史。配置隔离不等于独立 OS 用户/容器隔离。
- Codex 持有 agent loop；可变操作经 DSH dynamic tools → Security/approval → Journal。
  原生 Codex 权限保持 read-only，提权 fail-closed，不新增网关工具执行器或对话存储。

### 不得夸大已验证范围

- DeepSeek Flash 的 native/Codex 真实受治理开发、deny、Review、restart continuation 已通过；
  Pro 只有目录/契约证据。一次成功不代表模型指令遵循稳定性已签收。
- 当前独立 GPT/Astra 通道已验证受治理**只读**任务和真实 usage；GPT 写闭环仍未签收。
- 网关 image/search、任意 provider、remote compaction、完整 Subagent parity 尚未签收。
- Observability 不等于 DSH billing，也没有补全 Inspector 的 durable usage。只加总 owner
  已报告的数值，缺失不作零；估价不是账单，Astra 无已验证价格时显示未匹配。
- Logs/Debug/Usage 有界移植 OpenCodex v2.33.0 MIT UI，保留 NOTICE/LICENSE；surface 动态注册。
  数据只来自 Aezy owner，历史不回填，debug 默认关闭且只保留脱敏 metadata，不记录原文 prompt。
- Inspector 静态 Codex blueprint 仍固定 `rust-v0.149.0` 源码，不能当成当前 `0.153.4` 内部执行
  路径已逐项验收；运行叠加只显示可证明的事件，App Server trace 仍诚实标记 partial。
- Historical Review 读 durable ledger，不用当前文件重算；未知 shell 副作用标记 partial。
  M2 网络策略不是 OS 防火墙。Project/Terminal 复用 DSH 单一 details slot，不另造 AppFrame。

## 4. 最近验证与复验入口

2026-09-08：**179 tests pass / 0 fail / 0 skip**（含官方 Codex 实进程契约测试）；
隔离 DeepSeek 两路径及冷重启通过。授权部署后，正式 Astra 任务收到 3 条官方 usage 通知，
共 46,243 tokens，重启汇总完全一致；正式 3090 的 24 项浏览器检查通过、0 page errors。
凭据文件未变，仅本次测试 Session 归档，Debug 已恢复关闭。详细 receipt/截图/重放参数只在
[Observability milestone](doc/milestones/observability.md) 维护；临时 `/tmp` 证据不是永久发布资产。

```bash
# 选与改动相关的本地门禁；下列全量命令不发起付费模型 Turn：
AEZY_CODEX_PROCESS_TEST=1 AEZY_OPENCODEX_PROCESS_TEST=1 \
  node --test packages/*/tests/*.test.mjs scripts/alpha-runtime.test.mjs
pnpm peers check
git diff --check
```

实际 profile、浏览器或付费证明按对应 milestone 执行，不默认重跑所有历史 dogfood。
测试 script 名含 `profile` 不代表只读：可能启动 Host、创建 Session 或调用模型，先读脚本。
浏览器 QA 暂依赖本地 Playwright/Chromium/WSL libraries 与测试字体，不能称为新机器可复现。

## 5. 下一步：先收敛，不自动扩张路线

本轮 Logs/Debug/Usage 目标已经完成，**没有需要新对话自动续跑的部署任务**。
下一步由用户决定；合理候选是日常工程 dogfood、故障驱动的可靠性补强和 Inspector 产品验收。
新 DSH 版本先审计再在隔离 profile 验证，升级与功能分开提交，不顺手恢复 codex-inspired。

开源准备是建议，**尚未立项或授权发布**。当前检查发现：没有仓库级 LICENSE、贡献/安全说明
或 GitHub CI；安装/QA 留有本机 toolchain、缓存、绝对路径和 ignored fixture 假设。新机器
bootstrap、可重放无凭据测试、依赖/移植 UI 许可核对及公开前敏感数据审计应先于广泛推广。
这不否定工程价值，也不证明已有社区需求；不要把本机绿色测试当作通用发行版成熟度。

## 6. 可直接粘贴给新对话

```text
请从 /home/aaron/repos/aezy-dsh-mvp 的 main 继续。先完整阅读 HANDOFF.md、README.md、
doc/roadmap/aezy-upstream-ownership-roadmap.md，再按 doc/README.md 读取本次范围内 milestone。
先检查 git status、版本 pin 与实际 Host，不自动 sync、重启或发起付费测试。
当前 DSH 是官方 npm 0.1.2-rc.1，Codex 0.153.4，开发 home/profile 是
/home/aaron/.aezy-alpha/dsh / aezy-alpha，服务在 3090；3091/3197 测试 Host 已停止。
Logs & Debug / Usage 已部署并通过真实 DeepSeek/Astra、浏览器与 restart 验收，不重做。
aezy 模式已退役，codex-inspired 路线封存；不要被旧 milestone 的历史阶段误导。
遵守参考树只读、只用外置插件、不复制 DSH/Codex 内核、不读取 OAuth、精确提交的边界。
Inspector revision 3 仍待产品验收，GPT 写闭环未签收；不要扩大既有成功证据的含义。
先确认我这次要推进的目标，不自动增加多 runtime、DAG、Boards 或开源发布工作。
```
