# Integrated Terminal 签收

## 状态

**Complete（2026-08-25）。** Aezy 已交付 Session-scoped Integrated Terminal UI，Host
与 Client 均位于外置 `@aezy/terminal` package；`.local/deepseek-harness/` 未修改。实现提交：

- `3f9c6da230 feat(terminal): bridge DSH PTY sessions to Aezy Web`
- `dfa1d8eb0b feat(terminal): add Session-scoped integrated UI`
- `703a93fc38 fix(terminal): expose bounded read truncation`
- `2d8729ea23 feat(terminal): project live shell cwd`
- `c973692d6c fix(terminal): follow sandboxed shell cwd`
- `dd75c23e4c feat(terminal): move UI into side panel`

开工时重新查询公开 Git tags，最新仍为 `dsh-v0.1.1-rc.2`
（`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`）。rc.2 没有 browser terminal
transport、raw TTY/resize、bottom dock 或新的 layout seam；运行时继续使用已验证的 rc.1。

## 架构与边界

Aezy Web composition 新挂载发布版 `@deepseek-ai/dsh-terminal` registry 和
`@deepseek-ai/dsh-terminal-bash` platform backend；POSIX 选择 bash，Windows 选择 pwsh。
`@aezy/terminal` 只做三件事：

1. 将 Web 请求的 `sessionId + cwd` 与 exact live Agent/Session header 对齐；cold runtime、
   cwd drift、foreign Session 全部 fail closed；
2. 只投影名称带 Aezy UI namespace 的 PTY，不允许用户 bridge 枚举或控制模型通过
   terminal tools 打开的 session；
3. 通过公开 Session header action、`details` 与 `shell.overlay` 注册右侧 Terminal panel，
   提供多标签 chrome、输入、读取、`SIGINT` 和关闭入口。

PTY id、owner authority、backend registry、sandbox policy、shell argv/env、进程组信号、
scrollback retention、超时、退出与 awaited process-tree cleanup 均由 DSH 维护。Aezy 没有
复制 PTY/job/shell/Windows persistent PowerShell/ConPTY/process lifecycle，也没有修改 Agent、
Session 或 composer 内核。用户在 Terminal 中直接启动的进程不经过 M2 Agent tool policy；
它仍受 DSH 为 owning Session 解析的 sandbox policy 约束，这与 M2 已记录的边界一致。

DSH 0.1.1 的 terminal API 是经过控制序列清理的 line-oriented contract：一次 send 提交
一行并等待 stdin/prompt/idle/timeout/exit，read 返回有界文本；它没有 raw keystroke 或 resize
API。因此本版明确标注 `Line terminal`，不引入 xterm，也不声称支持 full-screen TUI、动态
terminal resize、逐字节输入或完整 VT emulation。未来上游公开 raw browser TTY/resize seam 后，
可替换 transport/renderer，而无需迁移 Aezy Workspace/Session identity。

## 产品行为

- Terminal 桌面端动态占用原生、可调宽度的 `details` column，与 Chat 同时可见且不改变
  对话滚动；窄屏才降级为全宽 `shell.overlay`。关闭后释放单槽位，不永久遮蔽 M4 Project
  Review/Files panel；
- 每个 Session 最多 8 个 UI terminal；标签可以切换、新建和关闭；状态显示 running、exit
  code/signal、PID 和 backend type；
- Enter 提交命令或 interactive reply，Shift+Enter 保留多行，Up/Down 浏览每个 tab 独立
  history；持续读取最新 1000 行，DSH 超出 retention 时显示 truncated 状态；
- Ctrl-C 只投递上游允许的 `SIGINT`；UI 不暴露 SIGKILL 或任意 signal；
- 关闭/重开 panel 只卸载 view，PTY 留在 Host registry；重新进入从 DSH list/read 恢复；
- Linux 通过 DSH snapshot 的公开 PID 读取 shell 实际 cwd，并只把最后一个可输入的可视
  `dsh> ` 投影为“cwd 加 `>`”；执行 `cd` 后随 read polling 更新。读取失败回退 Session cwd，
  raw scrollback 与 DSH controlled prompt/readiness 协议均不改写；
- Session/Workspace 切换按 exact owner 隔离，旧响应不能投影到新 Session；
- owning Agent 或 Host dispose 时 DSH 关闭 PTY。进程不是 durable Session history，Host
  restart 后不恢复，也不冒充可恢复终端。

## 自动与真实验证

- `pnpm run test:terminal`：7/7，覆盖 Host open/list/read/send/signal/close、cold/cwd/foreign/
  non-UI fence、16 KiB input、NUL、SIGINT、8-session bound，以及 browser bundle/panel seam；
- `pnpm run test:m0`：全新临时 `DSH_HOME` 的真实 rc.1 composition/Web/Workspace/Session/
  preset smoke 通过，HTML 实际加载 `@aezy/terminal`；
- `pnpm run test:terminal:http`：真实 rc.1 Host + DSH PTY 执行 `printf`/`pwd`/`cd /tmp`，
  确认 live cwd 会从 Session 目录更新为 `/tmp`；同 Session 两 PTY、错误 cwd 409、request
  fence 403，并用 SIGINT 中断 `sleep 30`；
- M1 22/22、M2 11/11、M3 6/6、brand 1/1、peer check、`git diff --check` 通过；
- 新版 Browser QA 使用真实 3095 Host 和 Aezy 仓库 cwd：1440×960 时 Terminal 是原生静态
  `details` 列，`left=1081`、`width=359`、`right=1440`，Chat tab 全程仍为 selected；
  680×820 时只渲染宽 680 的 overlay，input right edge=680，无 overflow；`cd /tmp` 后输出
  末尾与 input prompt 都显示 `/tmp>`。关闭/reopen 保留两 PTY 与 scrollback，Session 切换
  自动关闭旧 panel，新 Session 只有自己的一个 PTY；`pageerror=[]`；
- 浏览器验证沿用 `/tmp` 的一次性 Playwright Chromium、NSS runtime 与 Windows fonts
  fontconfig；没有新增仓库浏览器依赖，也没有修改系统安装。

新版浏览器 QA Session：`terminal-panel-mt80q6it` 与
`terminal-panel-other-mt80q6it`。截图只保留为本机临时证据：
`/tmp/aezy-terminal-panel-dark-wide.png`、`/tmp/aezy-terminal-panel-light-narrow.png`。

## 后续

下一切片是 Activity / Status / Usage / Notifications，只投影现有 Session、Job、Subagent、
approval、trajectory 与 terminal 状态；不建立 Task runtime。其后才是 localhost Browser +
browser interaction。真正 Side Chat 继续等待 DSH Interactive Side Sessions/fork/merge-back
公开 seam。
