# @aezy/terminal

Aezy's Integrated Terminal is a thin user-facing adapter over the published
DSH terminal registry and platform shell backend. It binds every operation to
the exact live Session and its recorded working directory, exposes only PTYs
created by this UI, and contributes a Session-scoped Integrated Terminal in
DSH's native resizable right details area. On narrow screens the same panel
degrades to the shell overlay instead of replacing the conversation view.

The DSH 0.1.1 terminal contract is deliberately line-oriented: commands and
interactive replies are submitted as lines, retained sanitized scrollback is
read through a bounded API, and foreground processes can receive an explicit
interrupt. This package does not implement or copy a raw TTY protocol, terminal
emulator, PTY process lifecycle, sandbox policy, shell selection, or process
tree cleanup. Those remain owned by `@deepseek-ai/dsh-terminal` and
`@deepseek-ai/dsh-terminal-bash`.

The Host projects the live shell working directory from a bounded traversal
rooted at the public DSH terminal PID on Linux, with a fail-safe fallback to the
owning Session cwd. Aezy changes only the visible trailing prompt; DSH's
controlled `dsh> ` prompt and readiness protocol remain untouched.

Terminal processes are runtime state. They survive navigation between Aezy
views while their owning Agent is live, and DSH closes them when that owner or
the Host is disposed. They are not claimed to survive a Host restart.
