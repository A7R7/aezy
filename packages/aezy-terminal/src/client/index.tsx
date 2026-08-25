import {
  useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent,
} from 'react'

type TerminalStatus =
  | { kind: 'running' }
  | { kind: 'exited'; exitCode: number | null; signal: string | null }

type TerminalTab = {
  id: string
  title: string
  type: string
  pid?: number
  currentCwd: string
  status: TerminalStatus
}

type TerminalList = {
  sessionId: string
  cwd: string
  backendAvailable: boolean
  terminals: TerminalTab[]
}

type TerminalRead = {
  sessionId: string
  cwd: string
  terminal: TerminalTab
  output: string
  totalLines: number
  truncated: boolean
}

type ClientContext = {
  effect(effect: () => (() => void) | void, label: string): void
  slots: {
    inject(name: string, register: () => (() => void)): void
    register(options: Record<string, unknown>, component: unknown): () => void
  }
  sessions: {
    list: {
      getSnapshot(): { current?: string; byId: Record<string, { cwd?: string }> }
      subscribe(listener: () => void): () => void
    }
  }
  layout: {
    openDetails(): void
    closeDetails(): void
  }
}

type TerminalViewProps = {
  sessionId: string
  cwd: string
}

type TerminalPanelTarget = TerminalViewProps

type TerminalPanelProps = {
  panel: TerminalPanelController
  surface: 'details' | 'overlay'
  closePanel(): void
  syncLayout(narrow: boolean): void
}

type TerminalHeaderActionProps = {
  sessionId: string
  openTerminal(sessionId: string): void
}

const palette = {
  page: 'var(--dsw-alias-bg-base, #fff)',
  surface: 'var(--dsw-alias-bg-module-platform, #f7f7f8)',
  terminal: 'var(--dsw-alias-markdown-code-block, #f5f5f6)',
  terminalBanner: 'var(--dsw-alias-markdown-code-block-banner, #ececef)',
  text: 'var(--dsw-alias-label-primary, #202124)',
  muted: 'var(--dsw-alias-label-secondary, #737780)',
  border: 'var(--dsw-alias-border-subtle, rgba(127,127,127,.22))',
  interactive: 'var(--dsw-alias-bg-interactive-hover, rgba(127,127,127,.12))',
  selected: 'var(--dsw-alias-bg-interactive-selected, rgba(88,113,255,.14))',
  accent: 'var(--dsw-alias-state-info-primary, #4f6bed)',
  danger: 'var(--dsw-alias-state-error-primary, #d33)',
  warning: 'var(--dsw-alias-state-warning-primary, #9b6900)',
  success: 'var(--dsw-alias-state-success-primary, #27864a)',
}

const buttonStyle = {
  minHeight: 30,
  border: `1px solid ${palette.border}`,
  borderRadius: 7,
  background: palette.surface,
  color: palette.text,
  cursor: 'pointer',
} as const

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('x-aezy-client', 'web')
  if (init.body !== undefined) headers.set('content-type', 'application/json')
  const response = await fetch(path, { ...init, headers })
  const value = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(value.error ?? `Integrated Terminal request failed (${response.status})`)
  return value as T
}

function identityQuery(sessionId: string, cwd: string): string {
  return `sessionId=${encodeURIComponent(sessionId)}&cwd=${encodeURIComponent(cwd)}`
}

function upsert(tabs: TerminalTab[], next: TerminalTab): TerminalTab[] {
  const index = tabs.findIndex(tab => tab.id === next.id)
  if (index < 0) return [...tabs, next]
  return tabs.map(tab => tab.id === next.id ? next : tab)
}

function statusLabel(status: TerminalStatus): string {
  if (status.kind === 'running') return 'Running'
  if (status.exitCode !== null) return `Exited ${status.exitCode}`
  return status.signal === null ? 'Exited' : `Exited · ${status.signal}`
}

function displayOutput(output: string, currentCwd: string): string {
  const controlledPrompt = 'dsh> '
  return output.endsWith(controlledPrompt)
    ? `${output.slice(0, -controlledPrompt.length)}${currentCwd}> `
    : output
}

class TerminalPanelController {
  private target: TerminalPanelTarget | null = null
  private readonly listeners = new Set<() => void>()

  getSnapshot = (): TerminalPanelTarget | null => this.target

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  open(target: TerminalPanelTarget): void {
    this.target = target
    this.emit()
  }

  close(): void {
    if (this.target === null) return
    this.target = null
    this.emit()
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}

function TerminalGlyph() {
  return <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="2" width="13" height="11.5" rx="2" stroke="currentColor" />
    <path d="m4 5 2.2 2L4 9M8 10h3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

function TerminalHeaderAction({ sessionId, openTerminal }: TerminalHeaderActionProps) {
  return <button
    type="button"
    data-aezy-open-terminal
    title="Open Integrated Terminal"
    aria-label="Open Integrated Terminal"
    onClick={() => openTerminal(sessionId)}
    style={{ height: 28, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 8px', border: `1px solid ${palette.border}`, borderRadius: 7, background: palette.surface, color: palette.text, cursor: 'pointer', fontSize: 11 }}
  >
    <TerminalGlyph />
    <span>Terminal</span>
  </button>
}

export function TerminalView({ sessionId, cwd }: TerminalViewProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [outputs, setOutputs] = useState<Record<string, string>>({})
  const [truncated, setTruncated] = useState<Record<string, boolean>>({})
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [histories, setHistories] = useState<Record<string, string[]>>({})
  const [historyCursor, setHistoryCursor] = useState<Record<string, number>>({})
  const [busyIds, setBusyIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [backendAvailable, setBackendAvailable] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const followOutput = useRef(true)
  const active = tabs.find(tab => tab.id === activeId) ?? null
  const input = activeId === null ? '' : (inputs[activeId] ?? '')
  const busy = activeId !== null && busyIds.includes(activeId)

  const readTerminal = useCallback(async (terminalId: string, signal?: AbortSignal) => {
    const result = await requestJson<TerminalRead>(
      `/aezy/api/terminal/read?${identityQuery(sessionId, cwd)}&terminalId=${encodeURIComponent(terminalId)}`,
      { signal },
    )
    setTabs(current => upsert(current, result.terminal))
    setOutputs(current => ({ ...current, [terminalId]: result.output }))
    setTruncated(current => ({ ...current, [terminalId]: result.truncated }))
  }, [cwd, sessionId])

  const openTerminal = useCallback(async (signal?: AbortSignal) => {
    setOpening(true)
    setError(null)
    try {
      const result = await requestJson<{ terminal: TerminalTab; output: string }>('/aezy/api/terminal/open', {
        method: 'POST', signal, body: JSON.stringify({ sessionId, cwd }),
      })
      setTabs(current => upsert(current, result.terminal))
      setOutputs(current => ({ ...current, [result.terminal.id]: result.output }))
      setActiveId(result.terminal.id)
      followOutput.current = true
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === 'AbortError')) setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      if (signal?.aborted !== true) setOpening(false)
    }
  }, [cwd, sessionId])

  useEffect(() => {
    const controller = new AbortController()
    setTabs([])
    setActiveId(null)
    setOutputs({})
    setTruncated({})
    setInputs({})
    setHistories({})
    setHistoryCursor({})
    setBusyIds([])
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const result = await requestJson<TerminalList>(`/aezy/api/terminal?${identityQuery(sessionId, cwd)}`, { signal: controller.signal })
        if (controller.signal.aborted) return
        setBackendAvailable(result.backendAvailable)
        setTabs(result.terminals)
        if (result.terminals[0] !== undefined) {
          setActiveId(result.terminals[0].id)
          await readTerminal(result.terminals[0].id, controller.signal)
        } else if (result.backendAvailable) {
          await openTerminal(controller.signal)
        }
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === 'AbortError')) setError(caught instanceof Error ? caught.message : String(caught))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => { controller.abort() }
  }, [cwd, openTerminal, readTerminal, sessionId])

  useEffect(() => {
    if (activeId === null) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const poll = async () => {
      try {
        await readTerminal(activeId, controller.signal)
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === 'AbortError')) setError(caught instanceof Error ? caught.message : String(caught))
      }
      if (!controller.signal.aborted) timer = setTimeout(() => { void poll() }, 400)
    }
    void poll()
    return () => {
      controller.abort()
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [activeId, readTerminal])

  useEffect(() => {
    if (!followOutput.current) return
    const frame = requestAnimationFrame(() => {
      const node = outputRef.current
      if (node !== null) node.scrollTop = node.scrollHeight
    })
    return () => { cancelAnimationFrame(frame) }
  }, [activeId, outputs])

  const submit = async () => {
    if (active === null || busy || active.status.kind !== 'running') return
    const text = input
    setInputs(current => ({ ...current, [active.id]: '' }))
    if (text.length > 0) {
      setHistories(current => ({ ...current, [active.id]: [...(current[active.id] ?? []), text] }))
      setHistoryCursor(current => ({ ...current, [active.id]: (histories[active.id]?.length ?? 0) + 1 }))
    }
    setBusyIds(current => [...new Set([...current, active.id])])
    setError(null)
    followOutput.current = true
    try {
      await requestJson('/aezy/api/terminal/send', {
        method: 'POST', body: JSON.stringify({ sessionId, cwd, terminalId: active.id, text }),
      })
      await readTerminal(active.id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusyIds(current => current.filter(id => id !== active.id))
      inputRef.current?.focus()
    }
  }

  const interrupt = async () => {
    if (active === null || active.status.kind !== 'running') return
    setError(null)
    try {
      await requestJson('/aezy/api/terminal/signal', {
        method: 'POST', body: JSON.stringify({ sessionId, cwd, terminalId: active.id, signal: 'SIGINT' }),
      })
      await readTerminal(active.id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  const closeTerminal = async (terminal: TerminalTab) => {
    setError(null)
    try {
      await requestJson('/aezy/api/terminal/close', {
        method: 'POST', body: JSON.stringify({ sessionId, cwd, terminalId: terminal.id }),
      })
      const remaining = tabs.filter(tab => tab.id !== terminal.id)
      setTabs(remaining)
      setOutputs(current => {
        const next = { ...current }
        delete next[terminal.id]
        return next
      })
      if (activeId === terminal.id) {
        const oldIndex = tabs.findIndex(tab => tab.id === terminal.id)
        setActiveId(remaining[Math.min(oldIndex, remaining.length - 1)]?.id ?? null)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  const browseHistory = (direction: -1 | 1) => {
    if (activeId === null) return
    const history = histories[activeId] ?? []
    if (history.length === 0) return
    const current = historyCursor[activeId] ?? history.length
    const next = Math.max(0, Math.min(history.length, current + direction))
    setHistoryCursor(value => ({ ...value, [activeId]: next }))
    setInputs(value => ({ ...value, [activeId]: next === history.length ? '' : (history[next] ?? '') }))
  }

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
      return
    }
    if (event.key === 'ArrowUp' && !input.includes('\n')) {
      event.preventDefault()
      browseHistory(-1)
    } else if (event.key === 'ArrowDown' && !input.includes('\n')) {
      event.preventDefault()
      browseHistory(1)
    }
  }

  return <section data-aezy-terminal-view data-session-id={sessionId} style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: palette.page, color: palette.text }}>
    <div data-aezy-terminal-chrome style={{ minHeight: 43, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', overflowX: 'auto', borderBottom: `1px solid ${palette.border}`, background: palette.surface }}>
      {tabs.map(tab => {
        const selected = tab.id === activeId
        return <div key={tab.id} data-aezy-terminal-tab={tab.id} data-active={selected || undefined} style={{ height: 30, display: 'inline-flex', alignItems: 'center', flex: '0 0 auto', border: `1px solid ${selected ? palette.accent : palette.border}`, borderRadius: 7, background: selected ? palette.selected : palette.page, color: selected ? palette.text : palette.muted }}>
          <button type="button" role="tab" aria-selected={selected} onClick={() => { followOutput.current = true; setActiveId(tab.id) }} style={{ height: '100%', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 7px', border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 12 }}>
            <TerminalGlyph />
            <span>{tab.title}</span>
            <span aria-label={statusLabel(tab.status)} title={statusLabel(tab.status)} style={{ width: 6, height: 6, borderRadius: '50%', background: tab.status.kind === 'running' ? palette.success : palette.muted }} />
          </button>
          <button type="button" aria-label={`Close ${tab.title}`} title={`Close ${tab.title}`} onClick={() => { void closeTerminal(tab) }} style={{ width: 24, height: 24, marginRight: 2, padding: 0, border: 0, borderRadius: 5, background: 'transparent', color: palette.muted, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      })}
      <button type="button" data-aezy-terminal-new onClick={() => { void openTerminal() }} disabled={opening || !backendAvailable || tabs.length >= 8} title="New terminal" aria-label="New terminal" style={{ ...buttonStyle, minWidth: 30, padding: '0 8px', opacity: opening || tabs.length >= 8 ? .5 : 1, fontSize: 17 }}>+</button>
      <div title={active?.currentCwd ?? cwd} style={{ minWidth: 80, marginLeft: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: palette.muted, fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11 }}>{active?.currentCwd ?? cwd}</div>
    </div>

    {error !== null && <div role="alert" data-aezy-terminal-error style={{ padding: '7px 11px', borderBottom: `1px solid ${palette.border}`, background: 'var(--dsw-alias-state-error-secondary, rgba(211,51,51,.1))', color: palette.danger, fontSize: 12 }}>{error}</div>}
    {truncated[activeId ?? ''] && <div data-aezy-terminal-truncated style={{ padding: '6px 11px', borderBottom: `1px solid ${palette.border}`, color: palette.warning, fontSize: 11 }}>Older terminal output was truncated by the bounded DSH scrollback.</div>}

    {active === null
      ? <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 24, color: palette.muted, textAlign: 'center' }}>
        <div>
          <TerminalGlyph />
          <div style={{ marginTop: 10 }}>{loading ? 'Connecting to this Session runtime…' : backendAvailable ? 'No terminal is open.' : 'The platform shell backend is unavailable.'}</div>
          {!loading && backendAvailable && <button type="button" onClick={() => { void openTerminal() }} disabled={opening} style={{ ...buttonStyle, marginTop: 12, padding: '0 12px' }}>New terminal</button>}
        </div>
      </div>
      : <>
        <div
          ref={outputRef}
          data-aezy-terminal-output={active.id}
          onScroll={event => {
            const node = event.currentTarget
            followOutput.current = node.scrollHeight - node.scrollTop - node.clientHeight < 40
          }}
          onClick={() => { inputRef.current?.focus() }}
          style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '14px 16px', background: palette.terminal, color: palette.text, cursor: 'text' }}
        >
          <pre style={{ margin: 0, minHeight: '100%', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 12.5, lineHeight: 1.65 }}>{displayOutput(outputs[active.id] ?? '', active.currentCwd)}</pre>
        </div>
        <div data-aezy-terminal-input style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', alignItems: 'end', gap: 8, padding: '8px 10px 9px', borderTop: `1px solid ${palette.border}`, background: palette.terminalBanner }}>
          <span title={active.currentCwd} style={{ gridColumn: '1 / -1', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: palette.accent, fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11.5, fontWeight: 650 }}>{active.currentCwd}&gt;</span>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            disabled={busy || active.status.kind !== 'running'}
            aria-label="Terminal input"
            placeholder={active.status.kind === 'running' ? busy ? 'Waiting for the foreground process…' : 'Type a command or interactive reply' : statusLabel(active.status)}
            onChange={event => { setInputs(current => ({ ...current, [active.id]: event.target.value })) }}
            onKeyDown={onInputKeyDown}
            style={{ width: '100%', minHeight: 34, maxHeight: 120, boxSizing: 'border-box', resize: 'vertical', padding: '7px 9px', border: `1px solid ${palette.border}`, borderRadius: 7, outline: 'none', background: palette.page, color: palette.text, fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 12, lineHeight: 1.45 }}
          />
          <button type="button" onClick={() => { void interrupt() }} disabled={active.status.kind !== 'running'} title="Interrupt foreground process (Ctrl-C)" style={{ ...buttonStyle, padding: '0 9px', color: palette.muted }}>Ctrl-C</button>
          <button type="button" onClick={() => { void submit() }} disabled={busy || active.status.kind !== 'running'} style={{ ...buttonStyle, padding: '0 12px', borderColor: palette.accent, color: palette.accent, opacity: busy ? .55 : 1 }}>Send</button>
        </div>
        <footer style={{ minHeight: 25, display: 'flex', alignItems: 'center', gap: 8, padding: '0 11px', borderTop: `1px solid ${palette.border}`, background: palette.surface, color: palette.muted, fontSize: 10.5 }}>
          <span>{statusLabel(active.status)}</span>
          {active.pid !== undefined && <span>PID {active.pid}</span>}
          <span>DSH {active.type} PTY</span>
          <span style={{ marginLeft: 'auto' }}>Line terminal · Enter sends · Shift+Enter adds a line</span>
        </footer>
      </>}
  </section>
}

function TerminalPanel({ panel, surface, closePanel, syncLayout }: TerminalPanelProps) {
  const target = useSyncExternalStore(panel.subscribe, panel.getSnapshot)
  const [viewport, setViewport] = useState(() => window.innerWidth)
  const narrow = viewport < 760
  const currentSurface = narrow ? 'overlay' : 'details'
  const visible = target !== null && surface === currentSurface

  useEffect(() => {
    const onResize = () => setViewport(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (target !== null) syncLayout(narrow)
  }, [narrow, syncLayout, target])

  useEffect(() => {
    if (!visible) return
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') closePanel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closePanel, visible])

  if (!visible || target === null) return null

  const content = <aside aria-label="Integrated Terminal panel" data-aezy-terminal-panel data-session-id={target.sessionId} style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: palette.page, color: palette.text }}>
    <header style={{ flex: '0 0 auto', minHeight: 49, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 11px 8px 13px', borderBottom: `1px solid ${palette.border}`, background: palette.page }}>
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 14 }}>Integrated Terminal</strong>
        <span title={target.cwd} style={{ display: 'block', maxWidth: 360, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: palette.muted, fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 10.5 }}>{target.cwd}</span>
      </div>
      <button type="button" aria-label="Close Integrated Terminal panel" onClick={closePanel} style={{ border: 0, padding: 4, background: 'transparent', color: palette.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
    </header>
    <div style={{ flex: '1 1 auto', minHeight: 0 }}><TerminalView sessionId={target.sessionId} cwd={target.cwd} /></div>
  </aside>

  return surface === 'overlay'
    ? <div data-aezy-terminal-panel-surface="overlay" style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'var(--dsw-alias-bg-overlay, rgba(0,0,0,.36))' }}>{content}</div>
    : <div data-aezy-terminal-panel-surface="details" style={{ width: '100%', height: '100%' }}>{content}</div>
}

export const inject = ['slots', 'sessions', 'layout']

export function apply(ctx: ClientContext): void {
  const panel = new TerminalPanelController()
  let disposePanelSlots: (() => void) | null = null

  const syncLayout = (narrow: boolean) => {
    if (narrow) ctx.layout.closeDetails()
    else ctx.layout.openDetails()
  }
  const unmountPanel = () => {
    disposePanelSlots?.()
    disposePanelSlots = null
  }
  const closePanel = () => {
    panel.close()
    ctx.layout.closeDetails()
    unmountPanel()
  }
  const mountPanel = () => {
    if (disposePanelSlots !== null) return
    const disposeDetails = ctx.slots.register({
      name: 'details',
      priority: -20,
      inject: (): TerminalPanelProps => ({ panel, surface: 'details', closePanel, syncLayout }),
    }, TerminalPanel)
    const disposeOverlay = ctx.slots.register({
      name: 'shell.overlay',
      id: 'aezy-terminal',
      order: 110,
      inject: (): TerminalPanelProps => ({ panel, surface: 'overlay', closePanel, syncLayout }),
    }, TerminalPanel)
    disposePanelSlots = () => {
      disposeOverlay()
      disposeDetails()
    }
  }
  const openTerminal = (sessionId: string) => {
    const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd
    if (cwd === undefined) throw new Error(`aezy-terminal: session "${sessionId}" has no working directory`)
    panel.open({ sessionId, cwd })
    mountPanel()
    syncLayout(window.innerWidth < 760)
  }

  ctx.effect(() => ctx.sessions.list.subscribe(() => {
    const target = panel.getSnapshot()
    if (target === null) return
    const state = ctx.sessions.list.getSnapshot()
    const current = state.current ?? target.sessionId
    if (current !== target.sessionId || state.byId[target.sessionId]?.cwd !== target.cwd) closePanel()
  }), 'aezy-terminal: close panel on Session identity change')

  ctx.effect(() => () => {
    panel.close()
    unmountPanel()
  }, 'aezy-terminal: dispose dynamic side panel')

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'aezy-terminal',
    order: 40,
    inject: (): Pick<TerminalHeaderActionProps, 'openTerminal'> => ({ openTerminal }),
  }, TerminalHeaderAction))
}

export default { inject, apply }
