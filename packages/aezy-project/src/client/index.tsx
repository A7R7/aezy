import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { summarizeTurn } from '../summary.js'

type FileRow = {
  path: string
  originalPath?: string
  kind: 'ordinary' | 'renamed' | 'conflict' | 'untracked'
  indexStatus: string
  worktreeStatus: string
  conflict?: boolean
}

type ProjectView = {
  project: { name: string; cwd: string; root: string; environment: 'local' | 'worktree' }
  repository: {
    branch: string | null
    detached: boolean
    head: string | null
    upstream: string | null
    ahead: number
    behind: number
    clean: boolean
  }
  environment: {
    kind: 'local' | 'worktree'
    platform: string
    arch: string
    node: string
    git: string | null
    shell: string | null
    packageManager: string | null
    gitDir: string
    commonDir: string
  }
  files: FileRow[]
}

type DiffLine = {
  kind: 'context' | 'addition' | 'deletion' | 'meta'
  oldLine: number | null
  newLine: number | null
  text: string
}

type DiffPart = {
  scope: 'staged' | 'worktree' | 'turn'
  label: string
  state: 'structured' | 'empty' | 'fallback'
  message?: string
  rawFallback?: string
  hunks: Array<{
    header: string
    oldStart: number
    oldCount: number
    newStart: number
    newCount: number
    lines: DiffLine[]
  }>
}

type ReviewDocument = {
  version: 2
  identity: string
  source: {
    kind: 'working' | 'turn'
    label: string
    repositoryRoot: string
    fingerprint?: string
    sessionId?: string
    turn?: number
    snapshotId?: string
  }
  file: {
    path: string
    oldPath: string | null
    newPath: string | null
    status: 'modified' | 'added' | 'deleted' | 'renamed' | 'binary' | 'unavailable'
    additions: number | null
    deletions: number | null
    binary: boolean
    truncated: boolean
  }
  fingerprint?: string
  parts: DiffPart[]
}

type LedgerFile = {
  path: string
  openPath: string
  change: 'created-or-dirtied' | 'restored-or-removed' | 'modified'
  beforeFingerprint: string | null
  afterFingerprint: string | null
  revertable: boolean
  additions: number | null
  deletions: number | null
  binary: boolean
  truncated?: boolean
  status?: ReviewDocument['file']['status']
  oldPath?: string | null
}

type LedgerTurn = {
  turn: number
  startedAt: number
  endedAt: number
  reason: { kind: string }
  concurrent: boolean
  additions: number
  deletions: number
  statsComplete: boolean
  files: LedgerFile[]
}

type LedgerView = {
  sessionId: string
  turns: LedgerTurn[]
  receipts: Array<{
    id: string
    kind: 'file' | 'turn'
    turn: number
    path: string | null
    files: string[]
    status: string
    createdAt: number
  }>
}

type Snapshot<T> = { getSnapshot(): T; subscribe(listener: () => void): () => void }
type SessionsState = { current?: string; byId: Record<string, { cwd?: string }> }
type ClientContext = {
  effect(effect: () => (() => void) | void, label: string): void
  slots: {
    inject(name: string, register: () => (() => void)): void
    register(options: Record<string, unknown>, component: unknown): () => void
  }
  sessions: {
    list: Snapshot<SessionsState>
    open(sessionId: string): void
  }
  layout: {
    openDetails(): void
    closeDetails(): void
  }
  workspaces: {
    create(input: { path: string }): Promise<{ workspaceId: string }>
    connectWorkspace(workspaceId: string): Promise<string>
    archiveSession(sessionId: string): Promise<void>
  }
}

type ChangesProps = {
  cwd: string
  sessionId: string
  openReview(target: ReviewTarget): void
}

type TurnTailOwner = {
  turn: { turn: number; status: 'open' | 'closed' | 'unknown' }
}

type TurnSummaryProps = {
  matched: { turn: number }
  cwd: string
  sessionId: string
  openReview(target: ReviewTarget): void
}

type TurnSummary = NonNullable<ReturnType<typeof summarizeTurn>>

type WorktreeRecord = {
  id: string
  name: string
  path: string
  branch: string
  base: string
  head: string | null
  state: 'creating' | 'active' | 'failed' | 'handed-off' | 'cleaned'
  sourceDirty: boolean
  error: string | null
  latestHandoffId: string | null
  sessions: Array<{
    id: string
    status: 'active' | 'released' | 'disposed'
    activeTurn: boolean
  }>
}

type WorktreeList = {
  repository: { root: string; commonDir: string }
  managedRoot: string
  currentWorktreeId: string | null
  worktrees: WorktreeRecord[]
}

type Handoff = {
  id: string
  createdAt: number
  direction: 'worktree-to-local'
  repository: { root: string; worktreePath: string; worktreeId: string }
  git: {
    branch: string
    base: string
    head: string
    commitsBehindBase: number
    commitsAheadOfBase: number
    clean: boolean
    committedFiles: Array<{ path: string; previousPath?: string; status: string }>
    workingFiles: Array<{ path: string; indexStatus: string; worktreeStatus: string; conflict: boolean }>
  }
  validations: Array<{ command: string; status: 'passed' | 'failed' | 'skipped'; summary?: string }>
  instructions: string
}

type WorktreesProps = {
  cwd: string
  sessionId: string
  openWorktree(path: string, worktreeId: string): Promise<void>
  returnToLocal(repositoryRoot: string, worktreeId: string, cwd: string, sessionId: string): Promise<void>
}

const palette = {
  panel: 'var(--dsw-alias-bg-base, #ffffff)',
  elevated: 'var(--dsw-alias-bg-module-platform, #f9fafb)',
  interactive: 'var(--dsw-alias-interactive-bg-hover, rgba(38, 49, 72, 0.06))',
  button: 'var(--dsw-alias-button-elevated-fill, #ffffff)',
  code: 'var(--dsw-alias-markdown-code-block, #f9fafb)',
  border: 'var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1))',
  text: 'var(--dsw-alias-label-primary, #0f1115)',
  muted: 'var(--dsw-alias-label-tertiary, #81858c)',
  accent: 'var(--dsw-alias-state-business-primary, #4d6bfe)',
  success: 'var(--dsw-alias-state-success-primary, #1a7f37)',
  warning: 'var(--dsw-alias-state-warn-label, #b45309)',
  error: 'var(--dsw-alias-state-error-primary, #dc1313)',
}

type ReviewNavFile = {
  path: string
  oldPath?: string | null
  additions?: number | null
  deletions?: number | null
  binary?: boolean
  truncated?: boolean
  status?: ReviewDocument['file']['status']
}

type ReviewTarget = {
  source: 'working' | 'turn'
  sessionId: string
  cwd: string
  turn?: number
  path: string
  files: ReviewNavFile[]
}

class ReviewController {
  #target: ReviewTarget | null = null
  #listeners = new Set<() => void>()

  getSnapshot = (): ReviewTarget | null => this.#target
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }
  open(target: ReviewTarget): void {
    this.#target = target
    for (const listener of this.#listeners) listener()
  }
  select(path: string): void {
    if (this.#target === null || !this.#target.files.some(file => file.path === path)) return
    this.open({ ...this.#target, path })
  }
  close(): void {
    if (this.#target === null) return
    this.#target = null
    for (const listener of this.#listeners) listener()
  }
}

const ledgerRequests = new Map<string, { at: number; promise: Promise<LedgerView> }>()

function loadLedger(cwd: string, sessionId: string): Promise<LedgerView> {
  const key = `${sessionId}\0${cwd}`
  const cached = ledgerRequests.get(key)
  // Historical Turn tails mount together. Briefly share their one authoritative
  // read, while a genuinely later Turn gets a fresh post-settle snapshot.
  if (cached !== undefined && Date.now() - cached.at < 1000) return cached.promise
  const promise = request<LedgerView>('/aezy/api/project/ledger', { cwd, sessionId })
    .catch((error) => {
      ledgerRequests.delete(key)
      throw error
    })
  ledgerRequests.set(key, { at: Date.now(), promise })
  return promise
}

function DiffStats({ additions, deletions }: { additions: number | null; deletions: number | null }) {
  if (additions === null || deletions === null) {
    return <span title="Line statistics are unavailable for a binary, oversized, or legacy ledger entry" style={{ color: palette.muted }}>—</span>
  }
  return <span style={{ display: 'inline-flex', gap: 7, fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
    <span style={{ color: palette.success }}>+{additions}</span>
    <span style={{ color: palette.error }}>-{deletions}</span>
  </span>
}

function TurnChangedFiles({ matched, cwd, sessionId, openReview }: TurnSummaryProps) {
  const [summary, setSummary] = useState<TurnSummary | null | undefined>(undefined)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setSummary(undefined)
    setError(null)
    loadLedger(cwd, sessionId).then((ledger) => {
      if (!live) return
      setSummary(summarizeTurn(ledger, matched.turn))
      const latest = ledger.receipts
        .filter(receipt => receipt.kind === 'turn' && receipt.turn === matched.turn)
        .sort((left, right) => right.createdAt - left.createdAt)[0]
      setReceiptId(latest?.status === 'committed' ? latest.id : null)
    }).catch((reason) => {
      if (live) setError(reason instanceof Error ? reason.message : String(reason))
    })
    return () => { live = false }
  }, [cwd, matched.turn, sessionId])

  if (error !== null && summary === undefined) {
    return <div title={error} style={{ marginTop: 14, color: palette.error, fontSize: 12 }}>Changed files unavailable</div>
  }
  if (summary === undefined || summary === null) return null

  const canUndo = !summary.concurrent && summary.files.every(file => file.revertable)
  const toggleUndo = async () => {
    if (!canUndo || mutating) return
    setMutating(true)
    setError(null)
    try {
      if (receiptId === null) {
        const result = await mutate<{ receiptId: string }>('/aezy/api/project/revert-turn', {
          cwd, sessionId, turn: summary.turn,
        })
        setReceiptId(result.receiptId)
      } else {
        await mutate('/aezy/api/project/undo', { cwd, receiptId })
        setReceiptId(null)
      }
      ledgerRequests.delete(`${sessionId}\0${cwd}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setMutating(false)
    }
  }
  const openTurnReview = (path = summary.files[0]?.path) => {
    if (path === undefined) return
    openReview({
      source: 'turn', cwd, sessionId, turn: summary.turn, path,
      files: summary.files.map(file => ({
        path: file.path,
        oldPath: file.oldPath,
        additions: file.additions,
        deletions: file.deletions,
        binary: file.binary,
        truncated: file.truncated,
        status: file.status,
      })),
    })
  }

  return <section data-aezy-turn-files={summary.turn} style={{ marginTop: 14, maxWidth: 720, overflow: 'hidden', border: `1px solid ${palette.border}`, borderRadius: 10, background: palette.elevated, color: palette.text, fontSize: 12 }}>
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px 7px' }}>
      <strong style={{ fontSize: 12, fontWeight: 600 }}>Edited {summary.files.length} {summary.files.length === 1 ? 'file' : 'files'}</strong>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <button type="button" disabled={!canUndo || mutating} onClick={() => { void toggleUndo() }} title={summary.concurrent ? 'Batch Undo is disabled because another Session overlapped this Turn' : canUndo ? (receiptId === null ? 'Restore every file to its state before this Turn' : 'Reapply the files changed by this Turn') : 'At least one file cannot be restored safely'} style={{ border: 0, borderRadius: 5, padding: '3px 7px', background: 'transparent', color: canUndo ? palette.accent : palette.muted, cursor: canUndo && !mutating ? 'pointer' : 'not-allowed', font: 'inherit' }}>{mutating ? 'Working…' : receiptId === null ? 'Undo' : 'Redo'}</button>
        <button type="button" onClick={() => openTurnReview()} style={{ border: 0, borderRadius: 5, padding: '3px 7px', background: 'transparent', color: palette.accent, cursor: 'pointer', font: 'inherit' }}>Review changes</button>
      </span>
    </header>
    <div style={{ padding: '0 12px 8px', color: palette.muted }}>
      <DiffStats additions={summary.additions} deletions={summary.deletions} />
      {!summary.statsComplete && <span title="One or more files have unavailable line statistics" style={{ marginLeft: 8 }}>partial</span>}
      {summary.concurrent && <span title="Another Session was active in this repository during the Turn" style={{ marginLeft: 8, color: palette.warning }}>concurrent</span>}
    </div>
    <div style={{ borderTop: `1px solid ${palette.border}` }}>
      {summary.files.map(file => <div key={file.path} style={{ minHeight: 30, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 16, padding: '4px 12px', borderBottom: `1px solid ${palette.border}` }}>
        <button type="button" title={file.path} onClick={() => openTurnReview(file.path)} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: 0, border: 0, background: 'transparent', color: file.afterFingerprint === null ? palette.muted : palette.text, cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace', fontSize: 12, textDecoration: file.afterFingerprint === null ? 'line-through' : undefined }}>
          {file.oldPath && file.oldPath !== file.path ? `${file.oldPath} → ` : ''}{file.path}
          {file.binary && <span style={{ marginLeft: 7, color: palette.muted, fontFamily: 'inherit' }}>binary</span>}
          {file.truncated && <span style={{ marginLeft: 7, color: palette.warning, fontFamily: 'inherit' }}>truncated</span>}
        </button>
        <DiffStats additions={file.additions} deletions={file.deletions} />
      </div>)}
    </div>
    {error !== null && <div title={error} style={{ padding: '8px 12px', color: palette.error }}>{error}</div>}
  </section>
}

async function request<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const query = new URLSearchParams(params)
  const response = await fetch(`${path}?${query}`, {
    headers: { 'X-Aezy-Client': 'web' },
    cache: 'no-store',
    signal,
  })
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? `Aezy Project request failed (${response.status})`)
  return body
}

async function mutate<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Aezy-Client': 'web',
    },
    body: JSON.stringify(body),
  })
  const value = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(value.error ?? `Aezy Project request failed (${response.status})`)
  return value
}

function statusLabel(file: FileRow): string {
  if (file.conflict) return 'UU'
  if (file.kind === 'untracked') return '??'
  return `${file.indexStatus}${file.worktreeStatus}`
}

function statusName(status: ReviewDocument['file']['status']): string {
  return status[0].toUpperCase() + status.slice(1)
}

function StructuredPart({ part }: { part: DiffPart }) {
  const [rawOpen, setRawOpen] = useState(false)
  return <section style={{ borderBottom: `1px solid ${palette.border}` }}>
    <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: '7px 12px', borderBottom: `1px solid ${palette.border}`, background: palette.elevated, color: palette.muted, fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>{part.label}</div>
    {part.state === 'empty' && <div style={{ padding: '28px 16px', color: palette.muted, textAlign: 'center' }}>{part.message ?? 'No textual line changes.'}</div>}
    {part.state === 'fallback' && <div style={{ padding: 16 }}>
      <div role="status" style={{ padding: 12, border: `1px solid ${palette.warning}`, borderRadius: 8, color: palette.warning, background: palette.elevated }}>
        Structured review stopped safely. {part.message}
      </div>
      {part.rawFallback !== undefined && <div style={{ marginTop: 10 }}>
        <button type="button" onClick={() => setRawOpen(value => !value)} style={{ border: 0, padding: 0, background: 'transparent', color: palette.accent, cursor: 'pointer', font: 'inherit' }}>{rawOpen ? 'Hide' : 'Show'} bounded raw fallback</button>
        {rawOpen && <pre style={{ margin: '10px 0 0', padding: 12, maxHeight: 360, overflow: 'auto', border: `1px solid ${palette.border}`, borderRadius: 7, background: palette.code, color: palette.text, fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre' }}>{part.rawFallback}</pre>}
      </div>}
    </div>}
    {part.state === 'structured' && part.hunks.map((hunk, hunkIndex) => <section key={`${hunk.header}-${hunkIndex}`}>
      <div style={{ position: 'sticky', top: 27, zIndex: 1, padding: '6px 12px', borderBottom: `1px solid ${palette.border}`, background: 'var(--dsw-alias-bg-layer-2, #f3f5f8)', color: palette.accent, fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11, whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hunk.header}</div>
      <div role="table" aria-label={hunk.header} style={{ minWidth: 'max-content', width: '100%', fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11.5, lineHeight: 1.55 }}>
        {hunk.lines.map((line, lineIndex) => {
          const addition = line.kind === 'addition'
          const deletion = line.kind === 'deletion'
          const background = addition
            ? 'color-mix(in srgb, var(--dsw-alias-state-success-primary, #1a7f37) 13%, transparent)'
            : deletion ? 'color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc1313) 11%, transparent)' : 'transparent'
          const marker = addition ? '+' : deletion ? '−' : line.kind === 'meta' ? '·' : ''
          return <div role="row" key={lineIndex} data-line-kind={line.kind} style={{ display: 'grid', gridTemplateColumns: '46px 46px 24px minmax(max-content, 1fr)', minHeight: 20, background }}>
            <span role="cell" style={{ paddingRight: 8, borderRight: `1px solid ${palette.border}`, color: palette.muted, textAlign: 'right', userSelect: 'none' }}>{line.oldLine ?? ''}</span>
            <span role="cell" style={{ paddingRight: 8, borderRight: `1px solid ${palette.border}`, color: palette.muted, textAlign: 'right', userSelect: 'none' }}>{line.newLine ?? ''}</span>
            <span role="cell" style={{ color: addition ? palette.success : deletion ? palette.error : palette.muted, textAlign: 'center', userSelect: 'none' }}>{marker}</span>
            <span role="cell" style={{ paddingRight: 14, whiteSpace: 'pre', color: line.kind === 'meta' ? palette.muted : palette.text, fontStyle: line.kind === 'meta' ? 'italic' : undefined }}>{line.text || ' '}</span>
          </div>
        })}
      </div>
    </section>)}
  </section>
}

type ReviewPanelProps = {
  review: ReviewController
  surface: 'details' | 'overlay'
  closeReview(): void
  syncLayout(narrow: boolean): void
  useSessions<T>(selector: (state: SessionsState) => T): T
}

function ReviewPanel({ review, surface, closeReview, syncLayout, useSessions }: ReviewPanelProps) {
  const target = useSyncExternalStore(review.subscribe, review.getSnapshot)
  const currentSession = useSessions(state => state.current)
  const currentCwd = useSessions(state => state.current === undefined ? undefined : state.byId[state.current]?.cwd)
  const [document, setDocument] = useState<ReviewDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewport, setViewport] = useState(() => window.innerWidth)
  const generation = useRef(0)
  const narrow = viewport < 760
  const currentSurface = narrow ? 'overlay' : 'details'
  const matchesSession = target !== null && target.sessionId === currentSession && target.cwd === currentCwd
  const visible = matchesSession && surface === currentSurface

  useEffect(() => {
    const onResize = () => setViewport(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (target !== null && !matchesSession) closeReview()
  }, [closeReview, matchesSession, target])

  useEffect(() => {
    if (target !== null && matchesSession) syncLayout(narrow)
  }, [matchesSession, narrow, syncLayout, target])

  useEffect(() => {
    if (!visible || target === null) { setDocument(null); setError(null); return }
    const controller = new AbortController()
    const requestGeneration = ++generation.current
    setDocument(null)
    setError(null)
    const path = target.source === 'turn' ? '/aezy/api/project/turn-review' : '/aezy/api/project/diff'
    const params = target.source === 'turn'
      ? { cwd: target.cwd, sessionId: target.sessionId, turn: String(target.turn), path: target.path }
      : { cwd: target.cwd, path: target.path }
    request<ReviewDocument>(path, params, controller.signal).then(value => {
      if (requestGeneration !== generation.current || review.getSnapshot() !== target) return
      if (value.file.path !== target.path || value.source.kind !== target.source) throw new Error('Review response identity does not match the active selection.')
      setDocument(value)
    }).catch(reason => {
      if (controller.signal.aborted || requestGeneration !== generation.current) return
      setError(reason instanceof Error ? reason.message : String(reason))
    })
    return () => { controller.abort() }
  }, [review, target, visible])

  useEffect(() => {
    if (!visible) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeReview() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeReview, visible])

  if (!visible || target === null) return null

  const panel = <aside aria-label="Review changes" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: palette.panel, color: palette.text }}>
      <header style={{ flex: '0 0 auto', padding: '12px 14px 10px', borderBottom: `1px solid ${palette.border}`, background: palette.panel }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: 14 }}>Review changes</strong>
            <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 7px', borderRadius: 999, background: palette.interactive, color: target.source === 'turn' ? palette.accent : palette.warning, fontSize: 10.5, fontWeight: 600 }}>{target.source === 'turn' ? `Historical Turn ${target.turn} snapshot` : 'Current Working changes'}</span>
          </div>
          <button type="button" aria-label="Close Review panel" onClick={closeReview} style={{ border: 0, padding: 4, background: 'transparent', color: palette.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
      </header>
      <nav aria-label="Changed file navigation" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
        {target.files.map(file => {
          const expanded = file.path === target.path
          return <section key={file.path} style={{ borderBottom: `1px solid ${palette.border}` }}>
            <button
              type="button"
              onClick={() => review.select(file.path)}
              aria-expanded={expanded}
              title={file.path}
              style={{ width: '100%', minHeight: 42, display: 'grid', gridTemplateColumns: '16px minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '8px 12px', border: 0, background: expanded ? palette.interactive : palette.panel, color: expanded ? palette.accent : palette.text, cursor: 'pointer', textAlign: 'left' }}
            >
              <span aria-hidden style={{ color: palette.muted, fontSize: 10, transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 120ms ease' }}>▶</span>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11.5 }}>{file.oldPath && file.oldPath !== file.path ? `${file.oldPath} → ` : ''}{file.path}</span>
              <DiffStats additions={expanded ? document?.file.additions ?? file.additions ?? null : file.additions ?? null} deletions={expanded ? document?.file.deletions ?? file.deletions ?? null : file.deletions ?? null} />
            </button>
            {expanded && <div data-aezy-expanded-file={file.path} style={{ overflowX: 'auto', borderTop: `1px solid ${palette.border}`, background: palette.panel }}>
              {document === null && error === null && <div style={{ padding: 24, color: palette.muted, textAlign: 'center' }}>Loading this file…</div>}
              {error !== null && <div role="alert" style={{ margin: 12, padding: 12, border: `1px solid ${palette.error}`, borderRadius: 8, color: palette.error }}>Review unavailable: {error}</div>}
              {document !== null && <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: `1px solid ${palette.border}`, background: palette.panel, color: palette.muted, fontSize: 11 }}>
                  <span style={{ color: document.file.binary ? palette.warning : palette.text, fontWeight: 600 }}>{statusName(document.file.status)}</span>
                  {document.file.oldPath !== null && document.file.newPath !== null && document.file.oldPath !== document.file.newPath && <span title={`${document.file.oldPath} → ${document.file.newPath}`}>rename</span>}
                  {document.file.binary && <span>binary</span>}
                  {document.file.truncated && <span style={{ color: palette.warning }}>truncated</span>}
                  <span style={{ marginLeft: 'auto' }}>{document.source.kind === 'turn' ? `snapshot ${document.source.snapshotId?.slice(0, 8) ?? ''}` : `fingerprint ${document.source.fingerprint?.slice(0, 8) ?? ''}`}</span>
                </div>
                {document.file.binary && <div style={{ padding: '30px 16px', color: palette.muted, textAlign: 'center' }}>Binary file snapshot. Textual lines are not available.</div>}
                {document.file.truncated && <div style={{ margin: 12, padding: 10, border: `1px solid ${palette.warning}`, borderRadius: 7, color: palette.warning }}>This diff exceeded Aezy’s bounded review limit. Only a safe fallback may be available.</div>}
                {!document.file.binary && document.parts.map(part => <StructuredPart key={part.scope} part={part} />)}
              </>}
            </div>}
          </section>
        })}
      </nav>
    </aside>

  return surface === 'overlay'
    ? <div data-aezy-review-panel data-surface="overlay" data-source={target.source} style={{ position: 'absolute', inset: 0, background: 'var(--dsw-alias-bg-overlay, rgba(0,0,0,.36))' }}>{panel}</div>
    : <div data-aezy-review-panel data-surface="details" data-source={target.source} style={{ width: '100%', height: '100%' }}>{panel}</div>
}

function ChangesView({ cwd, sessionId, openReview }: ChangesProps) {
  const [project, setProject] = useState<ProjectView | null>(null)
  const [ledger, setLedger] = useState<LedgerView | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [diff, setDiff] = useState<ReviewDocument | null>(null)
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [undoReceipt, setUndoReceipt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [next, nextLedger] = await Promise.all([
        request<ProjectView>('/aezy/api/project', { cwd }),
        request<LedgerView>('/aezy/api/project/ledger', { cwd, sessionId }),
      ])
      setProject(next)
      setLedger(nextLedger)
      setUndoReceipt(current => current ?? nextLedger.receipts
        .filter(receipt => receipt.status === 'committed')
        .sort((left, right) => right.createdAt - left.createdAt)[0]?.id ?? null)
      setSelected(current => current !== null && next.files.some(file => file.path === current) ? current : null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }, [cwd, sessionId])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (selected === null) {
      setDiff(null)
      return
    }
    const controller = new AbortController()
    setDiff(null)
    request<ReviewDocument>('/aezy/api/project/diff', { cwd, path: selected }, controller.signal)
      .then(value => { if (!controller.signal.aborted && value.file.path === selected) setDiff(value) })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason)) })
    return () => { controller.abort() }
  }, [cwd, selected])

  const branch = useMemo(() => {
    if (project === null) return ''
    const name = project.repository.branch ?? `detached@${project.repository.head ?? 'unborn'}`
    const movement = [
      project.repository.ahead > 0 ? `↑${project.repository.ahead}` : '',
      project.repository.behind > 0 ? `↓${project.repository.behind}` : '',
    ].filter(Boolean).join(' ')
    return movement === '' ? name : `${name} ${movement}`
  }, [project])

  const ledgerByPath = useMemo(() => {
    const entries = new Map<string, { turn: LedgerTurn; file: LedgerFile }>()
    for (const turn of ledger?.turns ?? []) {
      for (const file of turn.files) entries.set(file.path, { turn, file })
    }
    return entries
  }, [ledger])

  const selectedLedger = selected === null ? undefined : ledgerByPath.get(selected)
  const canRevert = diff !== null
    && selectedLedger?.file.revertable === true
    && selectedLedger.file.afterFingerprint === diff.fingerprint

  const revertSelected = useCallback(async () => {
    if (diff === null || selectedLedger === undefined || !canRevert) return
    const confirmed = window.confirm(`Revert ${diff.file.path} to its state before Turn ${selectedLedger.turn.turn}? You can undo this action until the file changes again.`)
    if (!confirmed) return
    setMutating(true)
    setError(null)
    try {
      const result = await mutate<{ receiptId: string }>('/aezy/api/project/revert', {
        cwd,
        sessionId,
        turn: selectedLedger.turn.turn,
        path: diff.file.path,
        expectedFingerprint: diff.fingerprint,
      })
      setUndoReceipt(result.receiptId)
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setMutating(false)
    }
  }, [canRevert, cwd, diff, refresh, selectedLedger, sessionId])

  const undoLastRevert = useCallback(async () => {
    if (undoReceipt === null) return
    setMutating(true)
    setError(null)
    try {
      await mutate('/aezy/api/project/undo', { cwd, receiptId: undoReceipt })
      setUndoReceipt(null)
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setMutating(false)
    }
  }, [cwd, refresh, undoReceipt])

  return <div style={{ height: '100%', overflow: 'auto', padding: '18px 22px', background: palette.panel, color: palette.text }}>
    <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingBottom: 14, borderBottom: `1px solid ${palette.border}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 15 }}>{project?.project.name ?? 'Repository'}</strong>
          {project !== null && <span style={{ color: palette.accent, fontFamily: 'monospace', fontSize: 12 }}>{branch}</span>}
          {project !== null && <span style={{ color: palette.muted, fontSize: 12 }}>{project.files.length} changed</span>}
          {ledger !== null && <span style={{ color: palette.muted, fontSize: 12 }}>{ledger.turns.length} recorded turns</span>}
        </div>
        <div title={project?.project.root} style={{ marginTop: 4, color: palette.muted, fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project?.project.root ?? cwd}</div>
        {project !== null && <div style={{ marginTop: 5, color: palette.muted, fontSize: 11 }}>
          {project.environment.kind === 'worktree' ? 'Worktree' : 'Local'} · {project.environment.platform}/{project.environment.arch} · {project.environment.node}
          {project.environment.packageManager ? ` · ${project.environment.packageManager}` : ''}
        </div>}
      </div>
      <button type="button" onClick={() => void refresh()} disabled={loading} style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${palette.border}`, background: palette.button, color: palette.text, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Refreshing…' : 'Refresh'}</button>
    </header>

    {error !== null && <div role="alert" style={{ marginTop: 14, padding: 10, border: `1px solid ${palette.error}`, borderRadius: 7, color: palette.error }}>{error}</div>}

    {undoReceipt !== null && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14, padding: 10, border: `1px solid ${palette.border}`, borderRadius: 7, background: palette.elevated }}>
      <span style={{ color: palette.muted, fontSize: 12 }}>File reverted with a recoverable receipt.</span>
      <button type="button" onClick={() => void undoLastRevert()} disabled={mutating} style={{ padding: '5px 9px', borderRadius: 6, border: `1px solid ${palette.border}`, background: palette.button, color: palette.text, cursor: mutating ? 'wait' : 'pointer' }}>Undo</button>
    </div>}

    {project?.repository.clean === true && <div style={{ padding: '44px 0', textAlign: 'center', color: palette.muted }}>Working tree clean</div>}

    {project !== null && project.files.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'minmax(210px, 30%) minmax(0, 1fr)', gap: 18, marginTop: 16, alignItems: 'start' }}>
      <nav aria-label="Changed files" style={{ border: `1px solid ${palette.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {project.files.map(file => <button
          key={file.path}
          type="button"
          onClick={() => {
            setSelected(file.path)
            openReview({
              source: 'working', cwd, sessionId, path: file.path,
              files: project.files.map(item => ({ path: item.path, oldPath: item.originalPath ?? null })),
            })
          }}
          style={{ width: '100%', display: 'grid', gridTemplateColumns: '30px minmax(0, 1fr) auto', gap: 8, padding: '9px 10px', border: 0, borderBottom: `1px solid ${palette.border}`, background: selected === file.path ? palette.interactive : 'transparent', color: palette.text, textAlign: 'left', cursor: 'pointer' }}
        >
          <span style={{ color: file.conflict ? palette.error : palette.accent, fontFamily: 'monospace', fontSize: 11 }}>{statusLabel(file)}</span>
          <span title={file.path} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12 }}>{file.path}</span>
          {ledgerByPath.has(file.path) && <span title={ledgerByPath.get(file.path)?.turn.concurrent ? 'Observed while another Session was active in this repository' : 'Latest observed Agent turn'} style={{ color: ledgerByPath.get(file.path)?.turn.concurrent ? palette.warning : palette.muted, fontSize: 10 }}>T{ledgerByPath.get(file.path)?.turn.turn}</span>}
        </button>)}
      </nav>
      <main style={{ minWidth: 0 }}>
        {selected !== null && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ margin: 0, fontFamily: 'monospace', fontSize: 14, overflowWrap: 'anywhere' }}>{selected}</h2>
          {selectedLedger !== undefined && <button type="button" onClick={() => void revertSelected()} disabled={!canRevert || mutating} title={canRevert ? `Restore the state before Turn ${selectedLedger.turn.turn}` : 'The file changed after this ledger entry or the recorded state is unsupported'} style={{ padding: '5px 9px', flex: '0 0 auto', borderRadius: 6, border: `1px solid ${canRevert ? palette.warning : palette.border}`, background: palette.button, color: canRevert ? palette.warning : palette.muted, cursor: canRevert && !mutating ? 'pointer' : 'not-allowed' }}>Revert T{selectedLedger.turn.turn}</button>}
        </div>}
        {selected === null && <div style={{ padding: '24px 0', color: palette.muted }}>Select a file to open structured Review without changing this view or its scroll position.</div>}
        {diff === null && selected !== null && <div style={{ padding: '24px 0', color: palette.muted }}>Loading file identity…</div>}
        {diff !== null && <div style={{ marginTop: 14, padding: 12, border: `1px solid ${palette.border}`, borderRadius: 8, background: palette.elevated, color: palette.muted, fontSize: 12 }}>
          Structured diff is open in the right Review panel. <DiffStats additions={diff.file.additions} deletions={diff.file.deletions} />
          {diff.file.binary && <span style={{ marginLeft: 8 }}>binary</span>}
          {diff.file.truncated && <span style={{ marginLeft: 8, color: palette.warning }}>truncated</span>}
        </div>}
      </main>
    </div>}
  </div>
}

function shortCommit(value: string | null): string {
  return value === null ? 'unknown' : value.slice(0, 10)
}

function parseValidationLines(value: string): Handoff['validations'] {
  if (value.trim() === '') return []
  return value.split('\n').map((line, index) => {
    const [rawStatus, rawCommand, ...rawSummary] = line.split('|')
    const status = rawStatus?.trim()
    const command = rawCommand?.trim() ?? ''
    const summary = rawSummary.join('|').trim()
    if (status !== 'passed' && status !== 'failed' && status !== 'skipped') {
      throw new Error(`Validation line ${index + 1} must start with passed, failed, or skipped`)
    }
    if (command === '') throw new Error(`Validation line ${index + 1} needs a command after "|"`)
    return { status, command, ...(summary === '' ? {} : { summary }) }
  })
}

function WorktreesView({ cwd, sessionId, openWorktree, returnToLocal }: WorktreesProps) {
  const [project, setProject] = useState<ProjectView | null>(null)
  const [registry, setRegistry] = useState<WorktreeList | null>(null)
  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('Review the recorded branch and continue from the exact handoff head.')
  const [validationText, setValidationText] = useState('')
  const [handoff, setHandoff] = useState<Handoff | null>(null)
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextProject, nextRegistry] = await Promise.all([
        request<ProjectView>('/aezy/api/project', { cwd }),
        request<WorktreeList>('/aezy/api/project/worktrees', { cwd }),
      ])
      setProject(nextProject)
      setRegistry(nextRegistry)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }, [cwd])

  useEffect(() => { void refresh() }, [refresh])

  const current = registry?.worktrees.find(item => item.id === registry.currentWorktreeId)

  const createWorktree = useCallback(async () => {
    if (project?.repository.head === null || name.trim() === '') return
    let confirmDirty = false
    if (!project.repository.clean) {
      confirmDirty = window.confirm('The Local repository is dirty. The Worktree will start from the displayed committed HEAD only; current staged, unstaged, and untracked changes stay in Local. Continue?')
      if (!confirmDirty) return
    }
    if (!window.confirm(`Create aezy/${name.trim()} from ${shortCommit(project.repository.head)} in Aezy's repository-specific Worktree directory?`)) return
    setMutating(true)
    setError(null)
    try {
      const created = await mutate<{ worktree: WorktreeRecord }>('/aezy/api/project/worktrees/create', {
        cwd,
        name: name.trim(),
        base: project.repository.head,
        confirmDirty,
      })
      await openWorktree(created.worktree.path, created.worktree.id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      await refresh()
    } finally {
      setMutating(false)
    }
  }, [cwd, name, openWorktree, project, refresh])

  const createHandoff = useCallback(async (): Promise<Handoff> => {
    const result = await mutate<{ handoff: Handoff }>('/aezy/api/project/worktrees/handoff', {
      cwd,
      sessionId,
      instructions,
      validations: parseValidationLines(validationText),
    })
    setHandoff(result.handoff)
    await refresh()
    return result.handoff
  }, [cwd, instructions, refresh, sessionId, validationText])

  const generateHandoff = useCallback(async () => {
    setMutating(true)
    setError(null)
    try {
      await createHandoff()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setMutating(false)
    }
  }, [createHandoff])

  const handoffToLocal = useCallback(async () => {
    if (current === undefined || registry === null) return
    if (!window.confirm('Generate a fresh handoff, archive this Worktree Session, release its binding, and open a Local Session?')) return
    setMutating(true)
    setError(null)
    try {
      await createHandoff()
      await returnToLocal(registry.repository.root, current.id, cwd, sessionId)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setMutating(false)
    }
  }, [createHandoff, current, cwd, registry, returnToLocal, sessionId])

  const loadHandoff = useCallback(async (item: WorktreeRecord) => {
    if (item.latestHandoffId === null) return
    setError(null)
    try {
      setHandoff(await request<Handoff>('/aezy/api/project/worktrees/handoff', {
        cwd,
        handoffId: item.latestHandoffId,
      }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }, [cwd])

  const cleanup = useCallback(async (item: WorktreeRecord) => {
    if (!window.confirm(`Remove the clean Worktree directory for ${item.branch}? Aezy will retain the branch and its commits.`)) return
    setMutating(true)
    setError(null)
    try {
      await mutate('/aezy/api/project/worktrees/cleanup', { cwd, worktreeId: item.id })
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setMutating(false)
    }
  }, [cwd, refresh])

  return <div style={{ height: '100%', overflow: 'auto', padding: '18px 22px', background: palette.panel, color: palette.text }}>
    <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingBottom: 14, borderBottom: `1px solid ${palette.border}` }}>
      <div>
        <strong style={{ fontSize: 15 }}>Worktrees &amp; Handoff</strong>
        <div title={registry?.managedRoot} style={{ marginTop: 4, color: palette.muted, fontFamily: 'monospace', fontSize: 11 }}>{registry?.managedRoot ?? 'Loading repository identity…'}</div>
      </div>
      <button type="button" onClick={() => void refresh()} disabled={loading} style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${palette.border}`, background: palette.button, color: palette.text }}>{loading ? 'Refreshing…' : 'Refresh'}</button>
    </header>

    {error !== null && <div role="alert" style={{ marginTop: 14, padding: 10, border: `1px solid ${palette.error}`, borderRadius: 7, color: palette.error }}>{error}</div>}

    {project?.environment.kind === 'local' && <section style={{ marginTop: 16, padding: 14, border: `1px solid ${palette.border}`, borderRadius: 8, background: palette.elevated }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 14 }}>Create isolated Worktree Session</h2>
      <div style={{ color: palette.muted, fontSize: 12 }}>Exact base <code>{project.repository.head ?? 'unborn'}</code>. Local changes are never copied implicitly.</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <span style={{ alignSelf: 'center', color: palette.muted, fontFamily: 'monospace', fontSize: 12 }}>aezy/</span>
        <input value={name} onChange={event => setName(event.target.value.toLowerCase())} placeholder="task-name" aria-label="Worktree name" style={{ flex: '1 1 240px', minWidth: 120, padding: '7px 9px', border: `1px solid ${palette.border}`, borderRadius: 6, background: palette.panel, color: palette.text }} />
        <button type="button" onClick={() => void createWorktree()} disabled={mutating || name.trim() === '' || project.repository.head === null} style={{ padding: '7px 11px', border: `1px solid ${palette.border}`, borderRadius: 6, background: palette.button, color: palette.text }}>{mutating ? 'Creating…' : 'Create & open Session'}</button>
      </div>
      {!project.repository.clean && <div style={{ marginTop: 8, color: palette.warning, fontSize: 12 }}>Local is dirty; creation requires an explicit confirmation and uses committed HEAD only.</div>}
    </section>}

    {project?.environment.kind === 'worktree' && current === undefined && <div style={{ marginTop: 18, padding: 14, border: `1px solid ${palette.warning}`, borderRadius: 8, color: palette.warning }}>This is a Git worktree, but it is not owned by Aezy's M3 registry. Lifecycle actions are disabled.</div>}

    {current !== undefined && registry !== null && <section style={{ marginTop: 16, padding: 14, border: `1px solid ${palette.border}`, borderRadius: 8, background: palette.elevated }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14 }}>{current.branch}</h2>
          <div style={{ marginTop: 4, color: palette.muted, fontFamily: 'monospace', fontSize: 11 }}>{current.path}</div>
        </div>
        <span style={{ color: palette.accent, fontSize: 12 }}>{current.state} · {shortCommit(current.head)}</span>
      </div>
      <label style={{ display: 'block', marginTop: 14, color: palette.muted, fontSize: 12 }}>
        Handoff instructions
        <textarea value={instructions} onChange={event => setInstructions(event.target.value)} rows={4} style={{ display: 'block', boxSizing: 'border-box', width: '100%', marginTop: 6, padding: 9, resize: 'vertical', border: `1px solid ${palette.border}`, borderRadius: 6, background: palette.panel, color: palette.text }} />
      </label>
      <label style={{ display: 'block', marginTop: 12, color: palette.muted, fontSize: 12 }}>
        Validation results — one per line: <code>passed | command | summary</code>
        <textarea value={validationText} onChange={event => setValidationText(event.target.value)} rows={3} placeholder="passed | pnpm test | 13 tests passed" style={{ display: 'block', boxSizing: 'border-box', width: '100%', marginTop: 6, padding: 9, resize: 'vertical', border: `1px solid ${palette.border}`, borderRadius: 6, background: palette.panel, color: palette.text, fontFamily: 'monospace', fontSize: 12 }} />
      </label>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => void generateHandoff()} disabled={mutating || instructions.trim() === ''} style={{ padding: '7px 11px', border: `1px solid ${palette.border}`, borderRadius: 6, background: palette.button, color: palette.text }}>Generate handoff</button>
        <button type="button" onClick={() => void handoffToLocal()} disabled={mutating || instructions.trim() === ''} style={{ padding: '7px 11px', border: `1px solid ${palette.accent}`, borderRadius: 6, background: palette.button, color: palette.accent }}>Handoff to Local</button>
      </div>
      <div style={{ marginTop: 9, color: palette.muted, fontSize: 11 }}>Handoff records exact base/head, status, changed files, validations, and instructions. Returning archives and releases this Session; it does not merge or delete the branch.</div>
    </section>}

    {registry !== null && <section style={{ marginTop: 18 }}>
      <h2 style={{ margin: '0 0 9px', fontSize: 14 }}>Managed lifecycle</h2>
      {registry.worktrees.length === 0 && <div style={{ color: palette.muted }}>No Aezy-managed worktrees.</div>}
      {registry.worktrees.map(item => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, marginTop: 8, padding: 11, border: `1px solid ${palette.border}`, borderRadius: 7 }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.branch}</strong>
          <span style={{ marginLeft: 8, color: item.state === 'failed' ? palette.error : palette.muted, fontSize: 11 }}>{item.state}</span>
          <div title={item.path} style={{ marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: palette.muted, fontFamily: 'monospace', fontSize: 11 }}>{item.path}</div>
          <div style={{ marginTop: 3, color: palette.muted, fontSize: 11 }}>{item.sessions.filter(binding => binding.status === 'active').length} active Sessions · base {shortCommit(item.base)} · head {shortCommit(item.head)}</div>
          {item.error !== null && <div style={{ marginTop: 4, color: palette.error, fontSize: 11 }}>{item.error}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {item.latestHandoffId !== null && <button type="button" onClick={() => void loadHandoff(item)} style={{ padding: '5px 8px', border: `1px solid ${palette.border}`, borderRadius: 5, background: palette.button, color: palette.text }}>View handoff</button>}
          {project?.environment.kind === 'local' && item.state !== 'cleaned' && item.state !== 'failed' && <button type="button" onClick={() => void cleanup(item)} disabled={mutating} style={{ padding: '5px 8px', border: `1px solid ${palette.warning}`, borderRadius: 5, background: palette.button, color: palette.warning }}>Clean up</button>}
        </div>
      </div>)}
    </section>}

    {handoff !== null && <section style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 14 }}>Structured handoff {handoff.id}</h2>
        <button type="button" onClick={() => void navigator.clipboard.writeText(JSON.stringify(handoff, null, 2))} style={{ padding: '5px 8px', border: `1px solid ${palette.border}`, borderRadius: 5, background: palette.button, color: palette.text }}>Copy JSON</button>
      </div>
      <pre style={{ margin: '8px 0 0', padding: 12, maxHeight: 420, overflow: 'auto', border: `1px solid ${palette.border}`, borderRadius: 7, background: palette.code, color: palette.text, fontSize: 11, lineHeight: 1.5 }}>{JSON.stringify(handoff, null, 2)}</pre>
    </section>}
  </div>
}

export const inject = ['slots', 'sessions', 'workspaces', 'layout']

export function apply(ctx: ClientContext): void {
  const review = new ReviewController()
  const closeReview = () => {
    review.close()
    ctx.layout.closeDetails()
  }
  const syncLayout = (narrow: boolean) => {
    if (narrow) ctx.layout.closeDetails()
    else ctx.layout.openDetails()
  }
  const openReview = (target: ReviewTarget) => {
    review.open(target)
    syncLayout(window.innerWidth < 760)
  }

  ctx.slots.inject('details', () => ctx.slots.register({
    name: 'details',
    priority: -10,
    inject: (): Omit<ReviewPanelProps, 'useSessions'> => ({
      review, surface: 'details', closeReview, syncLayout,
    }),
  }, ReviewPanel))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'aezy-review',
    order: 100,
    inject: (): Omit<ReviewPanelProps, 'useSessions'> => ({
      review, surface: 'overlay', closeReview, syncLayout,
    }),
  }, ReviewPanel))

  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail',
    priority: -10,
    select: (owner: TurnTailOwner) => owner.turn.status === 'closed'
      ? { turn: owner.turn.turn }
      : null,
    inject: (sessionId: string): Omit<TurnSummaryProps, 'matched'> => {
      const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd
      if (cwd === undefined) throw new Error(`aezy-project: session "${sessionId}" has no working directory`)
      return { cwd, sessionId, openReview }
    },
  }, TurnChangedFiles))

  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'changes',
    order: 5,
    label: () => 'Changes',
    inject: (sessionId: string): ChangesProps => {
      const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd
      if (cwd === undefined) throw new Error(`aezy-project: session "${sessionId}" has no working directory`)
      return { cwd, sessionId, openReview }
    },
  }, ChangesView))

  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'worktrees',
    order: 6,
    label: () => 'Worktrees',
    inject: (sessionId: string): Omit<WorktreesProps, 'openWorktree' | 'returnToLocal'> => {
      const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd
      if (cwd === undefined) throw new Error(`aezy-project: session "${sessionId}" has no working directory`)
      return { cwd, sessionId }
    },
  }, (props: Omit<WorktreesProps, 'openWorktree' | 'returnToLocal'>) => <WorktreesView
    {...props}
    openWorktree={async (path, worktreeId) => {
      const workspace = await ctx.workspaces.create({ path })
      const sessionId = await ctx.workspaces.connectWorkspace(workspace.workspaceId)
      await mutate('/aezy/api/project/worktrees/bind', { cwd: path, worktreeId, sessionId })
      ctx.sessions.open(sessionId)
    }}
    returnToLocal={async (repositoryRoot, worktreeId, cwd, sessionId) => {
      const workspace = await ctx.workspaces.create({ path: repositoryRoot })
      const localSessionId = await ctx.workspaces.connectWorkspace(workspace.workspaceId)
      await ctx.workspaces.archiveSession(sessionId)
      await mutate('/aezy/api/project/worktrees/release', { cwd, worktreeId, sessionId })
      ctx.sessions.open(localSessionId)
    }}
  />))
}
