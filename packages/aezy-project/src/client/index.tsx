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
  project: { name: string; cwd: string; root: string; environment: 'local' }
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
    kind: 'local'
    platform: string
    arch: string
    node: string
    git: string | null
    shell: string | null
    packageManager: string | null
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
  sessions: { list: Snapshot<SessionsState> }
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
          Local · {project.environment.platform}/{project.environment.arch} · {project.environment.node}
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

export const inject = ['slots', 'sessions']

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
}
