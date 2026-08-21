# M2 安全检查清单

## 执行组合

- [x] policy 在公开 `tools/pre-execute` seam 读取完整 parsed arguments。
- [x] allow 必须调用 downstream `next()`，不能越过 DSH sandbox/approval/其他 policy。
- [x] deny 同时受单调 `tools.guard()` backstop 保护。
- [x] DSH `allowed-once` 仍是唯一交互式一次授权结果，Aezy 不 fork approval 内核。

## Rule 安全性

- [x] deny > Network deny > ask > Network ask/allow > default allow。
- [x] repository rule 绑定 canonical Git/worktree root，而不是原始路径拼写。
- [x] allow command prefix 拒绝 shell chain、pipe、redirection、expansion 与未闭合 quote。
- [x] 规则可在 Security view 查看、创建和删除，持久化重启恢复。
- [x] 损坏 policy 文件 fail closed，不静默回落默认。

## Network Policy

- [x] global 与 repository deny/ask/allow 独立于 filesystem sandbox。
- [x] 明显网络工具与 shell 归类 required。
- [x] 未知 shell 与未知外置/MCP tool 归类 possible，不静默穿透。
- [x] 文档明确 model/control-plane 与用户外部进程不在 tool boundary 内。
- [x] 不声称提供 OS firewall 或 namespace 隔离。

## Audit 与秘密

- [x] 记录 Session/Turn/call/tool/repository/decision/source/rule/explanation。
- [x] 原始 shell 命令不落盘，只保留脱敏 preview 与 SHA-256。
- [x] one-shot approval outcome 回填 ask record。
- [x] M1 revert/Undo 进入同一 projection，并标明 user-confirmation。
- [x] store 目录 `0700`、文件 `0600`、原子替换、有界保留。

## 端到端

- [x] 全新临时 `DSH_HOME` 安装真实 rc.1 profile 并启动 Web Host。
- [x] HTTP request fence、规则优先级和 restart persistence 通过。
- [x] 真实模型发起的 `bash curl` 在 dispatch 前被 Network deny 阻断并审计。
- [x] client bundle 与真实 Host module manifest 包含 Security view。
- [ ] 人工浏览器逐项点击 global/repository select、添加/删除 rule，并在 light/dark theme 查看完整布局；自动化因当前 WSL → Windows computer-use URI 限制未执行。
