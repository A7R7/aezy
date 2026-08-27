# Activity / Status / Usage / Notifications

## 当前状态

**In progress（2026-08-25 owner/seam decision complete）。** 本切片只增加外置 Aezy
dashboard；DSH 的 Session、Job、Subagent、approval、trajectory、terminal 和 provider
usage 仍是唯一事实 owner。dashboard 不写长期状态，不从事件流重算另一份 ledger，也不实现
Task、通知、usage 或 PTY 生命周期。

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
