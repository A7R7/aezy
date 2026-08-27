# DSH v0.1.1-rc.2 更新与 Aezy 影响报告

> 调查日期：2026-08-27<br>
> 上游范围：`dsh-v0.1.1-rc.1`（`528c682e`）→ `dsh-v0.1.1-rc.2`（`b150a551`）<br>
> 结论：参考快照升级；建议在 Codex adapter 开工前单独验证 runtime 升级，但 rc.2 不替代任何
> 已完成的 Aezy 产品切片，也不改变 Codex `app-server` 主路线。

## 结论摘要

rc.2 是一次集中的 multimodal/attachment 请求管线发布，不是新的 Desktop、Task、Terminal、
OAuth 或 agent-loop 产品版本。35 个区间提交、431 个文件中，只有 43 个 package `src` 文件
发生实质变化；其余主要是全 workspace 版本号、测试、双语文档和设计记录。

本版最有价值的新增 owner 是 DSH 的 provider-independent 图片规范化和 provider-specific
请求投影：持久附件、请求尺寸/编码、纯文本模型 fallback、历史图片 offload、DeepSeek Files
上传复用与内联 fallback 已形成一条完整链路。Aezy 今后不应自建图片压缩、请求图片缓存、
Files API 映射或 text-only 历史降级逻辑。

它对现有 Aezy 的直接删减量仍是 **零**：Aezy 的 M4 `Files` 是 workspace 文件树/预览，不是
provider Files API；Project/Turn Journal/Security/Worktree/Review/Terminal 的上游 owner 与 seam
均没有新增实现。rc.2 也没有带来 ChatGPT OAuth、OpenAI Pro plan、Codex runtime 或 generic
agent adapter，所以近期仍应走官方 Codex `app-server`。

官方 tag、完整区间与实现决策：

- [dsh-v0.1.1-rc.2 tag](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.1.1-rc.2)
- [rc.1 → rc.2 compare](https://github.com/deepseek-ai/deepseek-harness/compare/dsh-v0.1.1-rc.1...dsh-v0.1.1-rc.2)
- [统一图片请求管线](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.1-rc.2/.agents/notes/implemented/feature/2026-08-20-unified-image-request-pipeline.zh.md)
- [DeepSeek Files 内联回退](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.1-rc.2/.agents/notes/implemented/bug-fix/2026-08-21-deepseek-files-inline-fallback.zh.md)

## 发布边界

| 项目 | rc.1 | rc.2 |
| --- | --- | --- |
| Tag | `dsh-v0.1.1-rc.1` | `dsh-v0.1.1-rc.2` |
| Commit | `528c682e061696f5a160f363f236ecbf53cbd006` | `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e` |
| Git tree | `19e109115f57ace4170caf25dadbb59021126174` | `53915efe4e2126cc7779b73dfc8a3bcec5318c44` |
| 区间提交数 | — | 35（31 个 non-merge） |
| Diff | — | 431 files，+8,101 / -2,039 |
| Package `src` 变更 | — | 43 files |
| Workspace packages | 234 | 234 |
| 新增/删除 package | — | 无 |

`@deepseek-ai/dsh@0.1.1-rc.2`、`dsh-attachment@0.1.1-rc.2` 和
`dsh-llm@0.1.1-rc.2` 均已在 npm registry 发布，并能解析到带 integrity 的官方仓库产物。
这证明 runtime upgrade 可执行，但不等于已经通过 Aezy compatibility gate。

## 新增与变更

### 1. Provider-independent 规范化附件

`dsh-attachment-local` 不再把用户提交的原始图片直接作为以后每次模型请求的表示。它会：

- 对单条消息做图片数量、总字节、单图字节、像素和边长准入；
- 应用 EXIF orientation，清除 metadata/color profile；
- 规范化为 8-bit sRGB/sRGBA；
- 在保持透明度和宽高比的前提下选择 PNG/WebP/JPEG；
- 以 content-addressed immutable object 保存 provider-independent 版本；
- 在缩小时记录 `originalDimensions`；
- 批量验证后再发布，避免返回部分成功引用。

默认准入提高到每条消息 20 张、源编码总量 200MiB；规范化存储默认限制为长边 2048px、
4MiB。Host HTTP bridge 的默认 request-body cap 因此从 160MiB 提高到 300MiB。这个 cap 是
内存缓冲上限，不是免费容量；Aezy 以后暴露大图上传时仍应保持 loopback、请求 fence 与明确
的 UI 限制。

### 2. Deterministic request image variants

新增 `ImageRequestPolicy`、`ImageVariantId`、`RequestImageAttachment` 和
`AttachmentStore.readImageRequest()`：

- 模型 route 决定自己的 pixel/encoded-byte budget；
- attachment backend 从同一持久规范化图片派生确定性请求版本；
- variant identity 覆盖 attachment、策略版本、像素/字节预算和编码参数；
- 同一 variant 可跨 Turn/Session 复用本地缓存；
- 并发变换 singleflight，取消不会错误终止其他等待者；
- 超过 route request budget 时，从最旧图片开始按固定数量/字节 quantum 投影为占位文本；
- text-only model 会获得稳定 attachment placeholder，而不是因历史中存在图片而禁止切换模型。

这部分也扩展了 provider-neutral `dsh-llm`：`PreparedLlmCall` 现在绑定精确 model modalities，
adapter 可通过 `prepareCall()` 把一次 model resolution 与最终 dispatch 固定在同一配置世代，
避免动态 settings 在两者之间变化造成能力与 endpoint 混用。

### 3. DeepSeek Files API lifecycle

`dsh-llm-deepseek` 对视觉请求优先使用 OpenAI-compatible Files API：

- request image variant 上传后以 `file_id` 进入 chat；
- 本地索引按 endpoint、credential scope 和 variant id 复用；
- 记录 expiry，并在 refresh margin 内替换；
- 处理远端 missing/expired/invalid id，只进行一次有界重传/重试；
- quota cleanup 有界列举和删除 Harness-owned 文件；
- Files 解析失败或超时后，以相同 request variant 整体回退为 base64 data URL；
- Files 与 inline 各有独立 request budget 和 timeout，避免无界重试或混合半套表示。

这里的 `Files API` 是 provider 请求传输，不是 Aezy 的 workspace `Files` panel。两者名字相近，
owner 和数据完全不同，不能据此删除 M4 文件树/预览。

### 4. `read_image` 与 route fallback

`read_image` 现在会返回规范化后的尺寸，并在发生下采样时提供原图尺寸和坐标倍率提示；工具
描述明确鼓励直接读取大图，而不是让 Agent 临时安装图片库或自行生成 thumbnail。16-bit PNG、
超限和转换失败也有更可操作的诊断。

LLM runtime 不再因为当前 Session 历史中有图片而禁止选择 text-only model。图片在该次请求
中被稳定文本替代，持久历史不被改写。这改善了长会话的可恢复性，但不是 Browser automation。

### 5. Blank Session / permission default 语义回退

rc.1 曾允许 Web 在复用仍为空白的 Session 时，把 default-origin permission preset 刷新为
最新默认值。rc.2 撤回该跨 host/client 协议：

- `session.create` 删除 `reuseWorkspaceBlank`；
- Workspace client 直接返回已存在的 blank Session id；
- `permission/preset` 不再记录 `origin`；
- 默认 permission 只影响以后新建的 Session，不刷新已存在 blank Session。

这不是 Aezy 能力新增。Aezy 的持久 Approval Rules、Network Policy、解释与审计没有被替代；
runtime 升级测试需要额外验证 blank Session 在修改默认 permission 后仍保持创建时的权限。

## 对 Aezy 自维护能力的替代判断

| Aezy / 未来能力 | rc.2 能否接管 | 处理决定 |
| --- | --- | --- |
| 未来消息图片准入、规范化、压缩 | 是 | 全部委托 DSH attachment owner，不在 Aezy 实现 encoder/cache |
| 未来模型 route 请求图片、历史 offload | 是 | 使用 `readImageRequest` 与 DSH LLM projection |
| 未来 DeepSeek Files 上传、expiry、重传、inline fallback | 是 | 使用 `dsh-llm-deepseek`，不建 Aezy provider file store |
| 纯文本模型面对图片历史的降级 | 是 | 使用 DSH stable placeholder，不在 adapter 重写历史 |
| M4 workspace Files tree / preview | 否 | 保留；它读取工作区文件，不是 provider attachment/Files API |
| Project / Git / Turn Journal / Undo | 否 | 保留；相关 owner/package 没有运行时增量 |
| Worktree / Handoff | 否 | 保留；上游没有新增结构化 Worktree 产品 seam |
| Review / Contextual Ask | 否 | 保留；没有通用 Review/file-tree/context resolver |
| Approval Rules / Network Policy / audit | 否 | 保留；permission preset 反而缩小为 future-session default |
| Integrated Terminal side panel | 否 | 保留；Terminal/PTY/layout/slot 没有运行时增量 |
| ChatGPT OAuth / Pro plan | 否 | 继续使用 Codex `app-server` managed auth |
| Codex/DSH agent loop | 否 | agent/session/subagent/compaction 没有新实现 |
| Traffic Board / Task Board | 否 | 继续暂缓，rc.2 没有 proxy control plane 或 issue board |

所以本次没有应立即删除的 Aezy package 或功能代码。真正减少的是**未来工作量**：任何
DSH-native backend 的 multimodal request layer 都从 Aezy scope 中移除。

## 兼容性与升级风险

1. Aezy 不直接使用 attachment store、`readImageRequest`、`permission/preset.origin` 或
   `reuseWorkspaceBlank`，当前源码没有需要立即迁移的引用。
2. Aezy 使用的 `createUserMessage` / `freezeMessage` 仍在 public `dsh-llm` export 中；新增
   `prepareCall` 和 modality projection 是 additive seam。
3. Aezy client 只使用 Session list/open、Workspace create/connect/archive 等表面；删除的
   `SessionsPort.create(...reuseWorkspaceBlank)` 不在当前外置 client 调用中。
4. M0 测试通过显式 `session.create` 创建带 id 的 Session；该 Host RPC 仍接受 `sessionId`，只
   删除 `reuseWorkspaceBlank`，现有 smoke 设计仍然成立。
5. 300MiB HTTP carrier cap 增加大请求时的 resident-memory 上界；升级后需增加有界上传 smoke，
   但不应在 Codex spike 中顺手开发新图片 UI。
6. DSH 仍声明为 developer preview，可能有 compatibility-breaking changes；所有 rc.2 package
   必须精确同版升级，不能形成 rc.1/rc.2 混合 peer graph。

## 对未来路线的影响

### 立即路线

建议在 Codex adapter 开工前插入一个**独立、限界的 rc.2 runtime compatibility gate**：只更新
发布包、lockfile、profile 与 compatibility runtime revision，运行现有全量自动测试和真实 3090
HTTP smoke。该步骤不增加图片 UI、不重构 M0–M4、不实现 OAuth，也不改变产品优先级。

理由不是 rc.2 替代了 Aezy，而是新 runtime adapter 不应刚写在 rc.1 client/LLM 类型上就立即
再次迁移。若 gate 暴露真实破坏，可保留 reference rc.2、runtime 回到 rc.1，并把失败记录为
compatibility issue；不允许通过修改 DSH 源码绕开。

### Codex-backed self-development loop

路线不变。rc.2 没有 ChatGPT managed OAuth 或 Codex thread/turn protocol；Codex
`app-server` 仍是 Pro plan、credential、conversation、approval 和 agent loop 的权威 owner。
compatibility gate 完成后继续原定 spike，不把 DSH multimodal 工作捆入其中。

### DSH-native backend

未来可替换 backend 应以 rc.2 或更新版 `PreparedLlmCall` / `prepareCall` 为 provider dispatch
边界，并完全复用 DSH attachment/request-image projection。Aezy runtime contract 只投影模型、
stream、tool、approval、usage 和错误，不拥有图片缓存或 provider Files 生命周期。

### 暂缓产品面

Traffic Board、Task Board、Browser、Cloud/Remote/PR、Side Chat 与 merge-back 的优先级均不因
rc.2 提前。统一图片管线能为将来的 screenshot evidence 提供模型输入基础，但没有提供页面
启动、CDP、DOM、点击或截图采集，因此 Browser 仍为 Paused。

## 当前实施状态

- `.local/deepseek-harness` 已 detached checkout 到 rc.2，保持 clean/read-only；
- `reference/dsh.lock.json` 已记录 rc.2 commit/tree；
- `compatibility/dsh.json` 明确区分 rc.2 reference 与 rc.1 runtime；
- Aezy npm runtime、profile 和 3090 Host 仍为已签收的 rc.1；
- 本轮未修改任何 DSH 源码，也未删除或重构任何 Aezy 产品能力。
