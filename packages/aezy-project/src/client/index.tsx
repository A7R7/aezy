import { useCallback, useEffect, useMemo, useState } from 'react'
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

type DiffView = {
  file: FileRow
  staged: string
  worktree: string
  binary: boolean
  truncated: boolean
  fingerprint: string
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

type TurnReview = {
  turn: number
  files: Array<{
    path: string
    openPath: string
    change: LedgerFile['change']
    additions: number | null
    deletions: number | null
    binary: boolean
    truncated: boolean
    diff: string
  }>
}

type Snapshot<T> = { getSnapshot(): T; subscribe(listener: () => void): () => void }
type SessionsState = { byId: Record<string, { cwd?: string }> }
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
  workspaces: {
    create(input: { path: string }): Promise<{ workspaceId: string }>
    connectWorkspace(workspaceId: string): Promise<string>
    archiveSession(sessionId: string): Promise<void>
  }
}

type ChangesProps = {
  cwd: string
  sessionId: string
}

type TurnTailOwner = {
  turn: { turn: number; status: 'open' | 'closed' | 'unknown' }
}

type TurnSummaryProps = {
  matched: { turn: number }
  cwd: string
  sessionId: string
  openFile(path: string): void
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
    files: Array<{ path: string; indexStatus: string; worktreeStatus: string; conflict: boolean }>
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

function TurnChangedFiles({ matched, cwd, sessionId, openFile }: TurnSummaryProps) {
  const [summary, setSummary] = useState<TurnSummary | null | undefined>(undefined)
  const [review, setReview] = useState<TurnReview | undefined>(undefined)
  const [reviewOpen, setReviewOpen] = useState(false)
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
  const toggleReview = async () => {
    if (reviewOpen) {
      setReviewOpen(false)
      return
    }
    setReviewOpen(true)
    if (review !== undefined) return
    setError(null)
    try {
      setReview(await request<TurnReview>('/aezy/api/project/turn-review', {
        cwd, sessionId, turn: String(summary.turn),
      }))
    } catch (reason) {
      setReview(undefined)
      setReviewOpen(false)
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  return <section data-aezy-turn-files={summary.turn} style={{ marginTop: 14, maxWidth: 720, overflow: 'hidden', border: `1px solid ${palette.border}`, borderRadius: 10, background: palette.elevated, color: palette.text, fontSize: 12 }}>
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px 7px' }}>
      <strong style={{ fontSize: 12, fontWeight: 600 }}>Edited {summary.files.length} {summary.files.length === 1 ? 'file' : 'files'}</strong>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <button type="button" disabled={!canUndo || mutating} onClick={() => { void toggleUndo() }} title={summary.concurrent ? 'Batch Undo is disabled because another Session overlapped this Turn' : canUndo ? (receiptId === null ? 'Restore every file to its state before this Turn' : 'Reapply the files changed by this Turn') : 'At least one file cannot be restored safely'} style={{ border: 0, borderRadius: 5, padding: '3px 7px', background: 'transparent', color: canUndo ? palette.accent : palette.muted, cursor: canUndo && !mutating ? 'pointer' : 'not-allowed', font: 'inherit' }}>{mutating ? 'Working…' : receiptId === null ? 'Undo' : 'Redo'}</button>
        <button type="button" onClick={() => { void toggleReview() }} aria-expanded={reviewOpen} style={{ border: 0, borderRadius: 5, padding: '3px 7px', background: 'transparent', color: palette.accent, cursor: 'pointer', font: 'inherit' }}>{reviewOpen ? 'Close review' : 'Review'}</button>
      </span>
    </header>
    <div style={{ padding: '0 12px 8px', color: palette.muted }}>
      <DiffStats additions={summary.additions} deletions={summary.deletions} />
      {!summary.statsComplete && <span title="One or more files have unavailable line statistics" style={{ marginLeft: 8 }}>partial</span>}
      {summary.concurrent && <span title="Another Session was active in this repository during the Turn" style={{ marginLeft: 8, color: palette.warning }}>concurrent</span>}
    </div>
    <div style={{ borderTop: `1px solid ${palette.border}` }}>
      {summary.files.map(file => <div key={file.path} style={{ minHeight: 30, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 16, padding: '4px 12px', borderBottom: `1px solid ${palette.border}` }}>
        {file.afterFingerprint === null
          ? <span title={`${file.path} (removed)`} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: palette.muted, textDecoration: 'line-through', fontFamily: 'monospace' }}>{file.path}</span>
          : <button type="button" title={file.path} onClick={() => openFile(file.openPath)} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: 0, border: 0, background: 'transparent', color: palette.text, cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace', fontSize: 12 }}>{file.path}</button>}
        <DiffStats additions={file.additions} deletions={file.deletions} />
      </div>)}
    </div>
    {error !== null && <div title={error} style={{ padding: '8px 12px', color: palette.error }}>{error}</div>}
    {reviewOpen && <div style={{ padding: 12, background: palette.panel }}>
      {review === undefined && <div style={{ color: palette.muted }}>Loading Turn diff…</div>}
      {review?.files.map(file => <section key={file.path} style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <strong style={{ minWidth: 0, overflowWrap: 'anywhere', fontFamily: 'monospace', fontWeight: 500 }}>{file.path}</strong>
          <DiffStats additions={file.additions} deletions={file.deletions} />
        </div>
        {file.binary
          ? <div style={{ color: palette.muted }}>Binary or oversized file; textual review unavailable.</div>
          : file.diff === ''
            ? <div style={{ color: palette.muted }}>No worktree line changes.</div>
            : <pre style={{ margin: 0, padding: 10, maxHeight: 360, overflow: 'auto', border: `1px solid ${palette.border}`, borderRadius: 7, background: palette.code, color: palette.text, fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre' }}>{file.diff}</pre>}
        {file.truncated && <div style={{ marginTop: 5, color: palette.warning }}>Diff truncated at the Aezy review limit.</div>}
      </section>)}
    </div>}
  </section>
}

async function request<T>(path: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params)
  const response = await fetch(`${path}?${query}`, {
    headers: { 'X-Aezy-Client': 'web' },
    cache: 'no-store',
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

function CodeDiff({ title, text }: { title: string; text: string }) {
  if (text === '') return null
  return <section style={{ marginTop: 16 }}>
    <h3 style={{ margin: '0 0 8px', fontSize: 12, color: palette.muted, textTransform: 'uppercase', letterSpacing: '.08em' }}>{title}</h3>
    <pre style={{ margin: 0, padding: 14, overflow: 'auto', fontSize: 12, lineHeight: 1.55, background: palette.code, border: `1px solid ${palette.border}`, borderRadius: 8, color: palette.text, whiteSpace: 'pre' }}>{text}</pre>
  </section>
}

function ChangesView({ cwd, sessionId }: ChangesProps) {
  const [project, setProject] = useState<ProjectView | null>(null)
  const [ledger, setLedger] = useState<LedgerView | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [diff, setDiff] = useState<DiffView | null>(null)
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
      setSelected(current => current !== null && next.files.some(file => file.path === current)
        ? current
        : next.files[0]?.path ?? null)
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
    let live = true
    setDiff(null)
    request<DiffView>('/aezy/api/project/diff', { cwd, path: selected })
      .then(value => { if (live) setDiff(value) })
      .catch(reason => { if (live) setError(reason instanceof Error ? reason.message : String(reason)) })
    return () => { live = false }
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
          onClick={() => setSelected(file.path)}
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
        {diff === null && selected !== null && <div style={{ padding: '24px 0', color: palette.muted }}>Loading diff…</div>}
        {diff?.binary === true && <div style={{ padding: '24px 0', color: palette.muted }}>Binary or oversized file; textual diff unavailable.</div>}
        {diff?.truncated === true && <div style={{ marginTop: 10, color: palette.warning, fontSize: 12 }}>Diff truncated at the Aezy safety limit.</div>}
        {diff !== null && !diff.binary && diff.staged === '' && diff.worktree === '' && <div style={{ padding: '24px 0', color: palette.muted }}>No textual diff.</div>}
        {diff !== null && <>
          <CodeDiff title="Staged" text={diff.staged} />
          <CodeDiff title={diff.file.kind === 'untracked' ? 'Untracked' : 'Working tree'} text={diff.worktree} />
        </>}
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

export const inject = ['slots', 'sessions', 'workspaces']

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail',
    priority: -10,
    select: (owner: TurnTailOwner) => owner.turn.status === 'closed'
      ? { turn: owner.turn.turn }
      : null,
    inject: (sessionId: string): Omit<TurnSummaryProps, 'matched' | 'openFile'> => {
      const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd
      if (cwd === undefined) throw new Error(`aezy-project: session "${sessionId}" has no working directory`)
      return { cwd, sessionId }
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
      return { cwd, sessionId }
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
