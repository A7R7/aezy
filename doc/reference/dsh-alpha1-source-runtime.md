# DSH alpha.1 隔离源码 release runtime

> 状态：**Source build / release pack + isolated 3091 runtime gate complete；`alpha` 分支唯一开发 runtime**
> 日期：2026-08-28  
> 来源：`dsh-v0.1.2-alpha.1` / `cd5ef8148158c3a752a658978873241fdf8e2bbc`

## 决策

官方 npm 尚未发布 `0.1.2-alpha.1`，但 Aezy 已明确允许一条窄的临时 runtime 路径：只从固定
官方 immutable commit，在仓库与只读 reference 之外的可清理缓存 checkout 中，完整复用官方
release workflow 构建 package artifacts。`alpha` 分支只运行独立 `DSH_HOME`、profile 与 3091；
rc.2 留在主线历史，不作为该分支需要维持的兼容 runtime。后续 parity gates 决定是否合回主线。

这不是从源码直接运行，也不是只 pack `apps/cli`。运行输入必须是完整 DSH family、vendor
family 与官方 packed-install 所需的 Landlock entry tarball；Aezy 仍只消费 package/extension
接口，不相对导入 DSH 源文件。

## 来源与隔离

- 官方仓库：`https://github.com/deepseek-ai/deepseek-harness.git`
- tag：`dsh-v0.1.2-alpha.1`
- commit：`cd5ef8148158c3a752a658978873241fdf8e2bbc`
- tree：`a712eec535b48badc4fefb4df5176a7002e4280b`
- source cache：`~/.cache/aezy/runtime-sources/dsh-v0.1.2-alpha.1-cd5ef814`
- artifact cache：`~/.cache/aezy/runtime-artifacts/dsh-v0.1.2-alpha.1-cd5ef814`
- `.local/deepseek-harness/`：始终 clean，只读，未 install/build/generate
- alpha state target：`~/.aezy-alpha/dsh` / profile `aezy-alpha` / `127.0.0.1:3091`

首次 partial clone 在 promisor blob 下载时遇到 TLS 中断，留下无效空工作树；该目录被完整移到
`/tmp/aezy-dsh-alpha1-partial-clone-failed-20260828`，没有修补后复用。正式构建输入重新以固定 tag
做完整 `--depth 1 --single-branch` clone，并核对 commit/tree/tag 与 clean status。

## 官方 release 路径

执行顺序与上游 `.github/workflows/release.yml` / `release-publish.yml` 一致：

1. `pnpm install --frozen-lockfile`
2. `pnpm run release:verify --family dsh`
3. `pnpm run build:official`
4. `pnpm run release:pack --family dsh`
5. `pnpm run release:pack --family vendor`
6. `pnpm --dir native/landlock-run run build:ts`
7. `pnpm --dir native/landlock-run/packages/entry pack`
8. `pnpm run release:verify-packed-install --family dsh --from <dsh> --from <vendor> --from <landlock>`

工具链证据：

- frozen install：Node `22.22.1`、pnpm `11.7.0`，满足仓库 engine；
- release verify/build/pack/packed-install：隔离 Node `24.20.0`、pnpm `11.7.0`，匹配官方 workflow
  的 Node 24 primary line；
- WSL shell 必须使用 `TMPDIR=/tmp`，避免 `tsx` 在 Windows temp 路径创建 Unix socket；
- Node 22 下 `tsdown 0.22.2` 会尝试加载未解析的 optional peer `unrun`；Node 24 原生加载
  TypeScript config 后完整 build 成功，未添加或 patch 依赖；
- packed consumer 的 `koffi` 没有命中 Node 24 prebuild，使用隔离 Ubuntu CMake `4.2.3` 源码
  构建；CMake 仅是 consumer build tool，没有进入 DSH tarball 或系统安装。

## 产物与验证

`release:verify` 确认 DSH family 为 241 个同版 `0.1.2-alpha.1` 成员，publish order 成功；两条
peer cycle 按官方规则标记为 unordered，不阻塞安装。`build:official` 完成 Host、Client 与 Web
frontend，并记录 218 个 client artifacts 和 4 个 public build values。

产物：

| family | tarball 数 | 大小约计 |
| --- | ---: | ---: |
| DSH | 241 | 8.0 MiB |
| vendor | 9 | 180 KiB |
| Landlock entry | 1 | 16 KiB |
| 总计 | 251 | — |

完整相对路径与逐 tarball SHA-256 见
[`reference/dsh-alpha1-runtime.sha256`](../../reference/dsh-alpha1-runtime.sha256)，manifest 自身
SHA-256 为 `0a40b1b7a7ad17c3c7acd18d167321e544b2fb3db2635702f9a4032d40168706`。

关键产物：

- `@deepseek-ai/dsh`：`7d25b50db364d4f01c79a0ac7d5cef36f38bd27052aa14e98310646780f0e5ed`
- `@deepseek-ai/dsh-agent-presets`：
  `410e470690a055b507dc13b7af943113e9861f8732c1ebd53255a94b4af2ba59`

官方 packed-install verification 在一次性 consumer 中安装全部 251 个本地 tarball，只从 registry
解析外部第三方依赖，并最终得到：

```text
release verify-packed-install: installed @deepseek-ai/dsh reports 0.1.2-alpha.1
```

因此 workspace links、checkout 内残留 `lib/` 或单独 CLI tarball 都没有充当缺失 closure 的替代品。

## 下一门禁

source release artifacts 已通过以下隔离 runtime gate：

- selector 每次同步先验证 tracked SHA manifest 与全部 251 个官方 tarball，再重建并 pack 8 个
  Aezy 外置 package；
- 独立 consumer 用 pnpm `overrides` 把所有传递 workspace edge 固定到本地 release tarball，
  仅允许 `esbuild`、`node-pty`、`koffi` 与官方 `dsh-subprocess-local` 的受审构建脚本；
- Node `24.20.0`、pnpm `11.7.0`、隔离 CMake `4.2.3` 完成 743-package Linux optional closure；
  `koffi`、`node-pty`、`sharp` 均可在 3091 Host 加载；
- completion marker 只在 install/scripts/CLI version 全部成功后写入，中断或失败的半安装不能复用；
- `alpha:profile:dump` 初始成功组成 DSH Base/Web 与 8 个 Aezy package；当前 selector 已扩展为
  11 个外置 package，其中 8 个包含 Client bundle，`@aezy/workflow` 等 Host-only package 不增加
  Web bundle 数；
- 3091 authenticated Web index 为 21,183 bytes，包含 `@aezy/brand`、`codex`、`project`、
  `security`、`terminal` 以及 Remote/Connection/Modules/UI Session/UI Workspace；
- 真实 `/api` Remote transport 完成 `workspace/create`、`session/modelCatalog`、
  `session/create`、`session/list`；创建的隔离 Session 为 `aezy-alpha-runtime-spike`，preset 为
  legacy `aezy`，projection 包含 permissions、usage、image limits 与 model selection；
- 同期 3090 保持 HTTP 200，默认 CLI/profile 仍报告 `0.1.1-rc.2`，稳定 DSH_HOME 的目录与 profile
  时间戳未改变。

使用入口：

```bash
pnpm run alpha:profile:sync
pnpm run alpha:profile:dump
pnpm run alpha:web -- --host 127.0.0.1 --port 3091 --no-open
```

alpha 已是本分支唯一开发 runtime；mode/preset gate 也已完成：

1. 原生 roster 保留 `standard/ptc/minimal/cordis`，新增 system `codex-app-server`；
2. catalog UI 过滤、Host 执行门禁、header projection 与 legacy `aezy` 恢复通过真实 3091；
   `codex-inspired` 已有只在显式 dogfood 开关下暂存的 internal exact-digest preset，普通 roster
   仍不可见且不可点击；
3. 下一步跑相称的 M0–M4.2、Terminal、Security、Codex、自开发 loop 与
   Session/tool/approval/Journal parity gates；
4. parity gates 全部通过前不把 `alpha` 分支合回主线；本分支机器元数据固定为 alpha.1。
