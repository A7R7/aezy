# DSH alpha.1 隔离源码 release runtime

> 状态：**Source build / release pack gate complete；3091 composition gate pending**  
> 日期：2026-08-28  
> 来源：`dsh-v0.1.2-alpha.1` / `cd5ef8148158c3a752a658978873241fdf8e2bbc`

## 决策

官方 npm 尚未发布 `0.1.2-alpha.1`，但 Aezy 已明确允许一条窄的临时 runtime 路径：只从固定
官方 immutable commit，在仓库与只读 reference 之外的可清理缓存 checkout 中，完整复用官方
release workflow 构建 package artifacts。默认 runtime、`~/.aezy/dsh` 与 3090 仍保持 rc.2；
alpha 只有通过独立 `DSH_HOME`、profile、3091 和后续 parity gates 才能被提升。

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

source release artifacts 已可作为 alpha candidate，但还不是 Aezy runtime。下一步只能：

1. 用薄 selector/launcher 从 manifest 验证后的 tarball closure 安装隔离 runtime；
2. 仅写入 `~/.aezy-alpha/dsh`，组成 `aezy-alpha` profile 并监听 3091；
3. 先迁移 Remote/controller/client split，证明 composition、Web、Workspace、Session 与现有 Aezy
   外置插件真实启动；
4. 再实现 `codex-app-server` system preset、catalog UI 过滤、Host 执行门禁和 header 模式显示；
5. parity gates 全部通过前，README/compatibility 的默认 `packageVersion` 继续是 rc.2。
