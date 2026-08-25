import {
  useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties, type ReactNode,
} from 'react'

type JobStatus = 'running' | 'stopping' | 'completed' | 'killed' | 'failed'

type JobView = {
  id: string
  kind: string
  label: string
  status: JobStatus
  detail?: string
  startedAt: number
  finishedAt?: number
}

type TokenUsage = {
  uncachedInputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

type ContextPressure = {
  pressureTokens?: number
  projectedTokens?: number
  contextWindow?: number
}

type SessionStats = {
  turns: number
  steps: number
  llmMs: number
  toolMs: number
  ttftMs: number
  ttftSteps: number
  decodeMs: number
  decodeTokens: number
}

type ActivityProjections = {
  tokenUsage?: TokenUsage
  contextPressure?: ContextPressure
  sessionStats?: SessionStats
}

type SessionSummary = {
  id: string
  displayTitle: string
  cwd?: string
  agentPreset?: string
  parentId?: string
  origin?: 'subagent'
  running: boolean
  pendingInteraction?: 'approval' | 'plan-review' | 'question'
  completed?: boolean
  blank: boolean
  updatedAt: number
  projectionValues?: Readonly<Record<string, unknown>>
}

type SubagentEntry =
  | { kind: 'child'; id: string; activity: 'running' | 'inactive'; mode: 'one-shot' | 'continuable'; label?: string; hasChildren: boolean }
  | { kind: 'diagnostic'; id: string; reason: 'corrupt' | 'unsupported' | 'unavailable' }

type SubagentCatalog = {
  state: 'loading' | 'ready' | 'error'
  entries: readonly SubagentEntry[]
  error: { message: string } | null
}

type SessionListState = {
  ids: string[]
  byId: Record<string, SessionSummary>
  current?: string
  phase: 'pending' | 'ready'
  jobsBySession: Readonly<Record<string, readonly JobView[]>>
  subagentsByParent: Readonly<Record<string, SubagentCatalog>>
}

type SessionsService = {
  list: {
    getSnapshot(): SessionListState
    subscribe(listener: () => void): () => void
  }
  open(sessionId: string): void
  refreshSubagents(sessionId: string): Promise<void>
}

type ClientContext = {
  effect(effect: () => (() => void) | void, label: string): void
  slots: {
    inject(name: string, register: () => void | (() => void)): void
    register(options: Record<string, unknown>, component: unknown): () => void
  }
  sessions: SessionsService
  layout: {
    openDetails(): void
    closeDetails(): void
  }
}

type ActivityTarget = { sessionId: string }

type ActivityPanelProps = {
  panel: ActivityPanelController
  surface: 'details' | 'overlay'
  sessions: SessionsService
  closePanel(): void
  openSession(sessionId: string): void
  syncLayout(narrow: boolean): void
}

type ActivityHeaderActionProps = {
  sessionId: string
  openActivity(sessionId: string): void
  useSessions<T>(selector: (state: SessionListState) => T): T
}

type TerminalStatus =
  | { kind: 'running' }
  | { kind: 'exited'; exitCode: number | null; signal: string | null }

type TerminalList = {
  sessionId: string
  cwd: string
  backendAvailable: boolean
  terminals: Array<{ id: string; status: TerminalStatus }>
}

type TerminalProjection =
  | { kind: 'loading' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'available'; backendAvailable: boolean; total: number; running: number }

type NotificationRow = {
  key: string
  sessionId: string
  title: string
  detail: string
  tone: 'warning' | 'success' | 'danger'
}

const LIMITS = {
  sessions: 24,
  notifications: 8,
  jobs: 8,
  subagents: 8,
} as const

const palette = {
  page: 'var(--dsw-alias-bg-base, #fff)',
  surface: 'var(--dsw-alias-bg-module-platform, #f7f7f8)',
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

const cardStyle: CSSProperties = {
  border: `1px solid ${palette.border}`,
  borderRadius: 10,
  background: palette.page,
  overflow: 'hidden',
}

const sourceStyle: CSSProperties = {
  marginTop: 10,
  color: palette.muted,
  fontSize: 10.5,
}

class ActivityPanelController {
  private target: ActivityTarget | null = null
  private readonly listeners = new Set<() => void>()

  getSnapshot = (): ActivityTarget | null => this.target

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  open(target: ActivityTarget): void {
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

function ActivityGlyph() {
  return <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M2 11.5h2.2l1.35-3.8 2.1 5.3 2.1-8 1.35 4H14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

function attentionCount(state: SessionListState): number {
  let count = 0
  for (const id of state.ids) {
    const summary = state.byId[id]
    if (summary?.pendingInteraction !== undefined || summary?.completed === true) count += 1
    count += (state.jobsBySession[id] ?? []).filter(job => job.status === 'failed').length
    if (count >= 99) return 99
  }
  return count
}

function ActivityHeaderAction({ openActivity, sessionId, useSessions }: ActivityHeaderActionProps) {
  const attention = useSessions(attentionCount)
  return <button
    type="button"
    data-aezy-open-activity
    title="Open Activity and status"
    aria-label={`Open Activity and status${attention > 0 ? `, ${attention} items need attention` : ''}`}
    onClick={() => openActivity(sessionId)}
    style={{ height: 28, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 8px', border: `1px solid ${attention > 0 ? palette.warning : palette.border}`, borderRadius: 7, background: palette.surface, color: palette.text, cursor: 'pointer', fontSize: 11 }}
  >
    <ActivityGlyph />
    <span>Activity</span>
    {attention > 0 && <span data-aezy-activity-badge style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: palette.warning, color: '#fff', fontSize: 10, lineHeight: '16px', textAlign: 'center' }}>{attention}</span>}
  </button>
}

function projectionsOf(summary: SessionSummary | undefined): ActivityProjections {
  return (summary?.projectionValues ?? {}) as ActivityProjections
}

function tokenTotal(usage: TokenUsage): number {
  return usage.uncachedInputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
}

function compactNumber(value: number): string {
  if (value < 1_000) return String(Math.round(value))
  if (value < 1_000_000) return `${Math.round(value / 100) / 10}K`
  return `${Math.round(value / 100_000) / 10}M`
}

function duration(value: number): string {
  const seconds = Math.max(0, Math.round(value / 1_000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function relativeTime(value: number, now: number): string {
  const elapsed = Math.max(0, now - value)
  if (elapsed < 60_000) return 'just now'
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`
  return `${Math.floor(elapsed / 86_400_000)}d ago`
}

function interactionLabel(value: SessionSummary['pendingInteraction']): string {
  if (value === 'approval') return 'Approval required'
  if (value === 'plan-review') return 'Plan review required'
  return 'Answer required'
}

function sessionStatus(summary: SessionSummary): { label: string; tone: string } {
  if (summary.pendingInteraction !== undefined) return { label: interactionLabel(summary.pendingInteraction), tone: palette.warning }
  if (summary.running) return { label: 'Running', tone: palette.accent }
  if (summary.completed === true) return { label: 'Completed · unseen', tone: palette.success }
  if (summary.blank) return { label: 'Ready', tone: palette.muted }
  return { label: 'Idle', tone: palette.muted }
}

function notificationsOf(state: SessionListState): { rows: NotificationRow[]; total: number } {
  const rows: NotificationRow[] = []
  for (const sessionId of state.ids) {
    const summary = state.byId[sessionId]
    if (summary === undefined) continue
    if (summary.pendingInteraction !== undefined) {
      rows.push({
        key: `interaction:${sessionId}`,
        sessionId,
        title: interactionLabel(summary.pendingInteraction),
        detail: summary.displayTitle,
        tone: 'warning',
      })
    }
    if (summary.completed === true) {
      rows.push({
        key: `completed:${sessionId}`,
        sessionId,
        title: 'Session completed',
        detail: summary.displayTitle,
        tone: 'success',
      })
    }
    const failed = (state.jobsBySession[sessionId] ?? [])
      .filter(job => job.status === 'failed')
      .sort((left, right) => (right.finishedAt ?? right.startedAt) - (left.finishedAt ?? left.startedAt))
    for (const job of failed) {
      rows.push({
        key: `job:${sessionId}:${job.id}`,
        sessionId,
        title: 'Background job failed',
        detail: `${summary.displayTitle} · ${job.label}`,
        tone: 'danger',
      })
    }
  }
  return { rows: rows.slice(0, LIMITS.notifications), total: rows.length }
}

async function terminalList(sessionId: string, cwd: string, signal: AbortSignal): Promise<TerminalList> {
  const query = new URLSearchParams({ sessionId, cwd })
  const response = await fetch(`/aezy/api/terminal?${query}`, {
    headers: { 'x-aezy-client': 'web' },
    signal,
  })
  const value = await response.json().catch(() => ({})) as TerminalList & { error?: string }
  if (!response.ok) throw new Error(value.error ?? `Terminal status failed (${response.status})`)
  return value
}

function useTerminalProjection(sessionId: string, cwd: string | undefined): TerminalProjection {
  const [projection, setProjection] = useState<TerminalProjection>(() => (
    cwd === undefined ? { kind: 'unavailable', reason: 'Session cwd is unavailable.' } : { kind: 'loading' }
  ))

  useEffect(() => {
    if (cwd === undefined) {
      setProjection({ kind: 'unavailable', reason: 'Session cwd is unavailable.' })
      return
    }
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    setProjection({ kind: 'loading' })
    const poll = async () => {
      try {
        const value = await terminalList(sessionId, cwd, controller.signal)
        if (controller.signal.aborted) return
        setProjection({
          kind: 'available',
          backendAvailable: value.backendAvailable,
          total: value.terminals.length,
          running: value.terminals.filter(terminal => terminal.status.kind === 'running').length,
        })
      } catch (error) {
        if (controller.signal.aborted) return
        setProjection({ kind: 'unavailable', reason: error instanceof Error ? error.message : String(error) })
      }
      if (!controller.signal.aborted) timer = setTimeout(() => { void poll() }, 2_000)
    }
    void poll()
    return () => {
      controller.abort()
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [cwd, sessionId])

  return projection
}

function Section({ title, children, marker }: { title: string; children: ReactNode; marker?: string }) {
  return <section data-aezy-activity-section={marker ?? title.toLowerCase().replaceAll(' ', '-')} style={cardStyle}>
    <header style={{ minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', borderBottom: `1px solid ${palette.border}`, background: palette.surface }}>
      <strong style={{ fontSize: 12.5 }}>{title}</strong>
    </header>
    <div style={{ padding: 12 }}>{children}</div>
  </section>
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div style={{ minWidth: 0, padding: '9px 10px', border: `1px solid ${palette.border}`, borderRadius: 8, background: palette.surface }}>
    <div style={{ color: palette.muted, fontSize: 10.5 }}>{label}</div>
    <strong style={{ display: 'block', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 15 }}>{value}</strong>
    {detail !== undefined && <div title={detail} style={{ marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: palette.muted, fontSize: 10 }}>{detail}</div>}
  </div>
}

function CurrentStatus({ state, sessionId }: { state: SessionListState; sessionId: string }) {
  const summary = state.byId[sessionId]
  const terminal = useTerminalProjection(sessionId, summary?.cwd)
  if (summary === undefined) {
    return <Section title="Current Status"><p style={{ margin: 0, color: palette.muted }}>The selected Session is unavailable from the DSH list.</p></Section>
  }
  const status = sessionStatus(summary)
  const jobs = state.jobsBySession[sessionId] ?? []
  const liveJobs = jobs.filter(job => job.status === 'running' || job.status === 'stopping').length
  const catalog = state.subagentsByParent[sessionId]
  const children = catalog?.entries.filter(entry => entry.kind === 'child') ?? []
  const projections = projectionsOf(summary)
  const usage = projections.tokenUsage
  const pressure = projections.contextPressure
  const stats = projections.sessionStats
  const projected = pressure?.projectedTokens ?? pressure?.pressureTokens
  const contextPercent = projected !== undefined && pressure?.contextWindow !== undefined && pressure.contextWindow > 0
    ? Math.min(999, Math.round((projected / pressure.contextWindow) * 100))
    : undefined
  const terminalValue = terminal.kind === 'loading'
    ? 'Loading…'
    : terminal.kind === 'unavailable'
      ? 'Unavailable'
      : terminal.backendAvailable
        ? `${terminal.running} running · ${terminal.total} total`
        : 'Backend unavailable'

  return <Section title="Current Status" marker="status">
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 11 }}>
      <span aria-hidden="true" style={{ flex: '0 0 auto', width: 8, height: 8, marginTop: 5, borderRadius: '50%', background: status.tone }} />
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13.5 }}>{summary.displayTitle}</strong>
        <span style={{ color: status.tone, fontSize: 11 }}>{status.label}</span>
        <span style={{ marginLeft: 8, color: palette.muted, fontSize: 11 }}>{summary.agentPreset ?? 'preset unavailable'}</span>
        <div title={summary.cwd} style={{ marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: palette.muted, fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 10.5 }}>{summary.cwd ?? 'cwd unavailable'}</div>
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 7 }}>
      <Metric label="Background Jobs" value={`${liveJobs} live · ${jobs.length} total`} />
      <Metric label="Direct Subagents" value={catalog === undefined ? 'Unavailable' : `${children.filter(child => child.activity === 'running').length} running · ${children.length} known`} detail={catalog?.state} />
      <Metric label="Integrated Terminal" value={terminalValue} detail={terminal.kind === 'unavailable' ? terminal.reason : 'DSH PTY projection'} />
      <Metric label="Provider Tokens" value={usage === undefined ? 'Unavailable' : compactNumber(tokenTotal(usage))} detail={usage === undefined ? 'No provider usage projection' : `${compactNumber(usage.uncachedInputTokens)} input · ${compactNumber(usage.outputTokens)} output`} />
      <Metric label="Context Pressure" value={contextPercent === undefined ? 'Unavailable' : `${contextPercent}%`} detail={projected === undefined ? 'No provider sample' : `${compactNumber(projected)}${pressure?.contextWindow === undefined ? '' : ` / ${compactNumber(pressure.contextWindow)}`}`} />
      <Metric label="Trajectory" value={stats === undefined ? 'Unavailable' : `${stats.turns} turns · ${stats.steps} steps`} detail={stats === undefined ? 'No durable sessionStats projection' : `${duration(stats.llmMs)} model · ${duration(stats.toolMs)} tools`} />
    </div>
    <div style={sourceStyle}>Sources: DSH SessionRuntime, durable session/token projections, and the fenced Aezy Terminal list projection.</div>
  </Section>
}

function Notifications({ state, openSession }: { state: SessionListState; openSession(sessionId: string): void }) {
  const notifications = useMemo(() => notificationsOf(state), [state])
  return <Section title="Notifications" marker="notifications">
    {notifications.rows.length === 0
      ? <div style={{ color: palette.muted, fontSize: 12 }}>Nothing currently needs attention.</div>
      : <div style={{ display: 'grid', gap: 6 }}>
        {notifications.rows.map(row => {
          const color = row.tone === 'warning' ? palette.warning : row.tone === 'danger' ? palette.danger : palette.success
          return <button key={row.key} type="button" onClick={() => openSession(row.sessionId)} style={{ display: 'grid', gridTemplateColumns: '8px minmax(0,1fr)', gap: 9, alignItems: 'start', width: '100%', padding: '8px 9px', border: `1px solid ${palette.border}`, borderRadius: 8, background: palette.page, color: palette.text, textAlign: 'left', cursor: 'pointer' }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, marginTop: 3, borderRadius: '50%', background: color }} />
            <span style={{ minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: 11.5 }}>{row.title}</strong>
              <span style={{ display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: palette.muted, fontSize: 10.5 }}>{row.detail}</span>
            </span>
          </button>
        })}
        {notifications.total > notifications.rows.length && <div style={{ color: palette.muted, fontSize: 10.5 }}>+{notifications.total - notifications.rows.length} more attention items (bounded view)</div>}
      </div>}
    <div style={sourceStyle}>Live projection of DSH pending interactions, completion reminders, and failed Jobs. Aezy stores no notification inbox or read state.</div>
  </Section>
}

function BackgroundWork({ state, sessionId }: { state: SessionListState; sessionId: string }) {
  const jobs = state.jobsBySession[sessionId] ?? []
  const catalog = state.subagentsByParent[sessionId]
  const entries = catalog?.entries ?? []
  return <Section title="Background Work" marker="background">
    <div style={{ color: palette.muted, fontSize: 10.5, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '.04em' }}>Jobs</div>
    {jobs.length === 0
      ? <p style={{ margin: '7px 0 12px', color: palette.muted, fontSize: 11.5 }}>No DSH Jobs are visible for this Session.</p>
      : <div style={{ display: 'grid', gap: 5, margin: '7px 0 13px' }}>
        {jobs.slice(0, LIMITS.jobs).map(job => <div key={job.id} style={{ display: 'grid', gridTemplateColumns: '8px minmax(0,1fr) auto', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 11 }}>
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: job.status === 'running' ? palette.accent : job.status === 'failed' ? palette.danger : job.status === 'stopping' || job.status === 'killed' ? palette.warning : palette.success }} />
          <span title={job.label} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.label}</span>
          <span style={{ color: palette.muted }}>{job.status}</span>
        </div>)}
        {jobs.length > LIMITS.jobs && <div style={{ color: palette.muted, fontSize: 10.5 }}>+{jobs.length - LIMITS.jobs} more Jobs</div>}
      </div>}
    <div style={{ color: palette.muted, fontSize: 10.5, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '.04em' }}>Direct Subagents</div>
    {catalog === undefined
      ? <p style={{ margin: '7px 0 0', color: palette.muted, fontSize: 11.5 }}>Subagent catalog unavailable.</p>
      : entries.length === 0
        ? <p style={{ margin: '7px 0 0', color: palette.muted, fontSize: 11.5 }}>{catalog.state === 'loading' ? 'Loading the DSH Subagent catalog…' : 'No direct Subagents.'}</p>
        : <div style={{ display: 'grid', gap: 5, marginTop: 7 }}>
          {entries.slice(0, LIMITS.subagents).map(entry => entry.kind === 'child'
            ? <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '8px minmax(0,1fr) auto', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 11 }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: entry.activity === 'running' ? palette.accent : palette.muted }} />
              <span title={entry.label ?? entry.id} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.label ?? entry.id}</span>
              <span style={{ color: palette.muted }}>{entry.mode} · {entry.activity}</span>
            </div>
            : <div key={entry.id} style={{ color: palette.warning, fontSize: 11 }}>{entry.id} · {entry.reason}</div>)}
          {entries.length > LIMITS.subagents && <div style={{ color: palette.muted, fontSize: 10.5 }}>+{entries.length - LIMITS.subagents} more Subagent rows</div>}
        </div>}
    {catalog?.state === 'error' && <div role="alert" style={{ marginTop: 7, color: palette.danger, fontSize: 10.5 }}>{catalog.error?.message ?? 'Subagent catalog failed to load.'}</div>}
    <div style={sourceStyle}>Sources: DSH `jobsBySession` mirror and authoritative Subagent catalog. Rows are display-only.</div>
  </Section>
}

function RecentActivity({ state, now, openSession }: { state: SessionListState; now: number; openSession(sessionId: string): void }) {
  const ids = state.ids.slice(0, LIMITS.sessions)
  return <Section title="Recent Activity" marker="recent">
    {state.phase === 'pending'
      ? <div style={{ color: palette.muted, fontSize: 12 }}>DSH Session list is not ready yet.</div>
      : ids.length === 0
        ? <div style={{ color: palette.muted, fontSize: 12 }}>No Sessions.</div>
        : <div style={{ display: 'grid', gap: 5 }}>
          {ids.map(id => {
            const summary = state.byId[id]
            if (summary === undefined) return null
            const status = sessionStatus(summary)
            const jobs = state.jobsBySession[id] ?? []
            const childCount = Object.values(state.byId).filter(child => child.origin === 'subagent' && child.parentId === id).length
            return <button key={id} type="button" data-aezy-activity-session={id} onClick={() => openSession(id)} style={{ display: 'grid', gridTemplateColumns: '8px minmax(0,1fr) auto', alignItems: 'center', gap: 9, width: '100%', padding: '8px 9px', border: `1px solid ${id === state.current ? palette.accent : palette.border}`, borderRadius: 8, background: id === state.current ? palette.selected : palette.page, color: palette.text, textAlign: 'left', cursor: 'pointer' }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: status.tone }} />
              <span style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5 }}>{summary.displayTitle}</strong>
                <span style={{ display: 'block', marginTop: 2, color: palette.muted, fontSize: 10 }}>{status.label} · {jobs.length} Jobs · {childCount} Subagents</span>
              </span>
              <span style={{ color: palette.muted, fontSize: 10 }}>{relativeTime(summary.updatedAt, now)}</span>
            </button>
          })}
          {state.ids.length > LIMITS.sessions && <div style={{ color: palette.muted, fontSize: 10.5 }}>+{state.ids.length - LIMITS.sessions} older Sessions (bounded view)</div>}
        </div>}
    <div style={sourceStyle}>Source: DSH SessionRuntime list order and live status projections.</div>
  </Section>
}

function ActivityDashboard({ sessions, sessionId, openSession }: { sessions: SessionsService; sessionId: string; openSession(sessionId: string): void }) {
  const state = useSyncExternalStore(sessions.list.subscribe, sessions.list.getSnapshot)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    void sessions.refreshSubagents(sessionId).catch(() => {})
  }, [sessionId, sessions])

  return <div data-aezy-activity-dashboard data-session-id={sessionId} style={{ height: '100%', minHeight: 0, overflow: 'auto', padding: 10, boxSizing: 'border-box', background: palette.surface, color: palette.text }}>
    <div style={{ display: 'grid', gap: 9 }}>
      <Notifications state={state} openSession={openSession} />
      <CurrentStatus state={state} sessionId={sessionId} />
      <BackgroundWork state={state} sessionId={sessionId} />
      <RecentActivity state={state} now={now} openSession={openSession} />
    </div>
  </div>
}

function ActivityPanel({ panel, surface, sessions, closePanel, openSession, syncLayout }: ActivityPanelProps) {
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

  const content = <aside aria-label="Activity and status panel" data-aezy-activity-panel data-session-id={target.sessionId} style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: palette.page, color: palette.text }}>
    <header style={{ flex: '0 0 auto', minHeight: 49, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 11px 8px 13px', borderBottom: `1px solid ${palette.border}`, background: palette.page }}>
      <div>
        <strong style={{ display: 'block', fontSize: 14 }}>Activity</strong>
        <span style={{ display: 'block', marginTop: 2, color: palette.muted, fontSize: 10.5 }}>Status · Usage · Notifications</span>
      </div>
      <button type="button" aria-label="Close Activity panel" onClick={closePanel} style={{ border: 0, padding: 4, background: 'transparent', color: palette.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
    </header>
    <div style={{ flex: '1 1 auto', minHeight: 0 }}><ActivityDashboard sessions={sessions} sessionId={target.sessionId} openSession={openSession} /></div>
  </aside>

  return surface === 'overlay'
    ? <div data-aezy-activity-panel-surface="overlay" style={{ position: 'absolute', inset: 0, zIndex: 3, background: 'var(--dsw-alias-bg-overlay, rgba(0,0,0,.36))' }}>{content}</div>
    : <div data-aezy-activity-panel-surface="details" style={{ width: '100%', height: '100%' }}>{content}</div>
}

export const inject = ['slots', 'sessions', 'layout']

export function apply(ctx: ClientContext): void {
  const panel = new ActivityPanelController()
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
  const openSession = (sessionId: string) => {
    closePanel()
    ctx.sessions.open(sessionId)
  }
  const mountPanel = () => {
    if (disposePanelSlots !== null) return
    const injected = (): Omit<ActivityPanelProps, 'surface'> => ({ panel, sessions: ctx.sessions, closePanel, openSession, syncLayout })
    const disposeDetails = ctx.slots.register({
      name: 'details',
      priority: -30,
      inject: (): ActivityPanelProps => ({ ...injected(), surface: 'details' }),
    }, ActivityPanel)
    const disposeOverlay = ctx.slots.register({
      name: 'shell.overlay',
      id: 'aezy-activity',
      order: 120,
      inject: (): ActivityPanelProps => ({ ...injected(), surface: 'overlay' }),
    }, ActivityPanel)
    disposePanelSlots = () => {
      disposeOverlay()
      disposeDetails()
    }
  }
  const openActivity = (sessionId: string) => {
    if (ctx.sessions.list.getSnapshot().byId[sessionId] === undefined) {
      throw new Error(`aezy-activity: session "${sessionId}" is unavailable`)
    }
    panel.open({ sessionId })
    mountPanel()
    syncLayout(window.innerWidth < 760)
  }

  ctx.effect(() => ctx.sessions.list.subscribe(() => {
    const target = panel.getSnapshot()
    if (target === null) return
    const state = ctx.sessions.list.getSnapshot()
    const current = state.current ?? target.sessionId
    if (current !== target.sessionId || state.byId[target.sessionId] === undefined) closePanel()
  }), 'aezy-activity: close panel on Session identity change')

  ctx.effect(() => () => {
    panel.close()
    unmountPanel()
  }, 'aezy-activity: dispose dynamic side panel')

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'aezy-activity',
    order: 30,
    inject: (): Pick<ActivityHeaderActionProps, 'openActivity'> => ({ openActivity }),
  }, ActivityHeaderAction))
}

export default { inject, apply }
