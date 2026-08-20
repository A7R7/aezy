import { useCallback, useEffect, useMemo, useState } from 'react'

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
  change: 'created-or-dirtied' | 'restored-or-removed' | 'modified'
  beforeFingerprint: string | null
  afterFingerprint: string | null
  revertable: boolean
}

type LedgerTurn = {
  turn: number
  startedAt: number
  endedAt: number
  reason: { kind: string }
  concurrent: boolean
  files: LedgerFile[]
}

type LedgerView = {
  sessionId: string
  turns: LedgerTurn[]
  receipts: Array<{
    id: string
    turn: number
    path: string
    status: string
    createdAt: number
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
  warning: 'var(--dsw-alias-state-warn-label, #b45309)',
  error: 'var(--dsw-alias-state-error-primary, #dc1313)',
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
