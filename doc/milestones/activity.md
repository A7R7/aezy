# Activity / Status / Usage / Notifications

## 当前状态

**Complete（2026-08-25）。** 本切片只增加外置 Aezy
dashboard；DSH 的 Session、Job、Subagent、approval、trajectory、terminal 和 provider
usage 仍是唯一事实 owner。dashboard 不写长期状态，不从事件流重算另一份 ledger，也不实现
Task、通知、usage 或 PTY 生命周期。

实现提交：

- `297f2525c5 docs(activity): record owner and seam decision`
- `38ff79419a feat(activity): project DSH runtime status dashboard`

开工时重新查询公开 Git tags，最新仍为 `dsh-v0.1.1-rc.2`
（`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`）。对 rc.1→rc.2 的相关 package/source diff
复核确认：Jobs、Subagent、approval、trajectory、layout/slots、token/session projections 和
Terminal 的公开实现 seam 没有逻辑变化；Session runtime 的变化只收窄 workspace/session-create
接口，不影响本切片的只读 client projection。Aezy 运行基线继续保持已签收的 rc.1。

## 权威 owner 与读取 seam

| Dashboard 事实 | 权威 owner | Aezy 读取 seam | unavailable 语义 |
| --- | --- | --- | --- |
| Session 选择、running、recency、cwd、preset | DSH Client SessionRuntime | `ctx.sessions.list` | list 尚未 ready 时显示 unavailable |
| approval / question / plan review attention | DSH pending interaction carrier | `SessionSummary.pendingInteraction` | 字段缺失表示当前没有等待交互 |
| completion reminder | DSH SessionRuntime | `SessionSummary.completed` | 字段缺失表示没有未查看完成提醒 |
| Background Job | DSH Jobs registry / apiproxy | `SessionListState.jobsBySession` 的 `JobView` | key 缺失表示当前无 Job |
| Subagent lineage/status | DSH Subagent catalog + Session summary | `subagentsByParent`、`parentId`、`origin`、`running` | catalog 未加载时只显示已知 summary，不猜 child 状态 |
| Trajectory totals | DSH durable `sessionStats` projection | `SessionSummary.projectionValues.sessionStats` | projection 缺失时显示 unavailable，不按分页窗口补算 |
| Provider usage/context | DSH token-meter projections | `tokenUsage`、`contextPressure` | 缺失表示 provider 尚未报告或能力未挂载 |
| Integrated Terminal | DSH PTY owner，经现有 Aezy Session/cwd fence | `GET /aezy/api/terminal` | cold runtime/backend absence/请求失败分别显示明确状态 |
| Notifications | DSH 的 pending/completed/Job 状态即时派生 | render-time attention list | 不保存 read/dismiss，不发送 native notification |

## 产品切片

- 在当前 Session header 增加 `Activity` 入口；打开时动态占用 DSH 原生 `details`，窄屏使用
  `shell.overlay`，关闭后释放，不建立 generic panel router。
- 顶部 Notifications 只投影需要 approval/question/plan review、未查看完成以及失败 Job；点击
  Session 只调用 DSH `ctx.sessions.open()`。
- Current Status 显示 Session 状态、cwd/preset、当前 Job/Subagent/Terminal 数量、durable
  trajectory totals、provider token usage 与 context pressure，并为每组标明来源或 unavailable。
- Recent Activity 使用 DSH list 顺序并有界显示；不创建 Task entity，不把 UI 行持久化。
- Terminal 只在 panel 可见且当前 Session/cwd 完整时有界轮询现有 list endpoint，不读取
  scrollback、不控制 PTY，也不枚举模型拥有的 Terminal。

## 验收边界

1. 外置 package/profile composition；`.local/deepseek-harness/` 零修改。
2. Session/Workspace 切换不串状态，关闭 panel 释放 slots，Terminal late response 不覆盖新身份。
3. Session、notification、Job/Subagent 和 Terminal 输出都有硬上限；无 durable Aezy truth store。
4. 真实 rc.1 Host 验证 module、Session projection 与 fenced Terminal list；浏览器宽/窄屏验证。
5. 不捆绑 Cloud/Remote/PR、Side Chat、merge-back、Browser interaction 或 native desktop shell。

## 自动与真实验证

- `pnpm run test:activity`：2/2，覆盖动态 header/details/overlay 注册与 disposer、Session
  navigation、事实源字段、硬上限、Terminal 只读 fence，以及无 localStorage/indexedDB/native
  Notification/SessionEvent 重放/PTY 控制；
- `pnpm run test:m0`：真实 rc.1 profile composition、Web、Workspace、Session 与 Aezy preset
  smoke 通过，HTML module manifest 加载 `@aezy/activity`；
- `AEZY_TEST_URL=http://127.0.0.1:3090 pnpm run test:activity:http`：真实 Host 新建 Session，
  读取 DSH tail-page `tokenUsage`、`contextPressure`、`sessionStats` durable projections，并通过
  existing Session/cwd-fenced Terminal list；
- `pnpm run test:terminal` 7/7、`pnpm peers check` 与 `git diff --check` 通过；参考树仍是
  detached rc.1 clean checkout。

真实 browser QA 使用两个 non-blank Aezy Session：`activity-panel-mt8gr0d3` 与
`activity-panel-other-mt8gr0d3`。1440×960 下 Activity 是 `left=1081`、`width=359`、
`right=1440` 的原生 details 列，Chat 保持可见，横向 overflow=0；680×820 下只显示
`left=0`、`width=680` 的 overlay，overflow=0。Session 切换关闭旧 panel，另一 Session 不继承
第一个 Session 的 Terminal projection；四个 section 均可见，provider usage/trajectory/
Terminal 数量来自真实 projection，`pageerror=[]`。截图是本机临时证据：
`/tmp/aezy-activity-panel-dark-wide.png`、`/tmp/aezy-activity-panel-light-narrow.png`。

3090 已在实现后正常 SIGTERM/restart；`packages/aezy-activity/lib/client.js` SHA-256 为
`dac5432d1461a888546dc1ff4c2e927fff53258b1dbe50a4a8928fb7836f2c5d`。

## 后续

下一切片是 localhost Browser + browser interaction。它应先服务本地 coding loop，并在开工
前重新核对上游 browser/tool/approval seam；不与 Cloud browser fleet、Remote/PR、Side Chat、
merge-back 或通用 Computer Use 捆绑。
