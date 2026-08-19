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
  panel: 'var(--color-bg, #111827)',
  elevated: 'var(--color-bg-elevated, #182233)',
  border: 'var(--color-border, #334155)',
  text: 'var(--color-text, #e5e7eb)',
  muted: 'var(--color-text-secondary, #94a3b8)',
  accent: 'var(--color-primary, #60a5fa)',
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

function statusLabel(file: FileRow): string {
  if (file.conflict) return 'UU'
  if (file.kind === 'untracked') return '??'
  return `${file.indexStatus}${file.worktreeStatus}`
}

function CodeDiff({ title, text }: { title: string; text: string }) {
  if (text === '') return null
  return <section style={{ marginTop: 16 }}>
    <h3 style={{ margin: '0 0 8px', fontSize: 12, color: palette.muted, textTransform: 'uppercase', letterSpacing: '.08em' }}>{title}</h3>
    <pre style={{ margin: 0, padding: 14, overflow: 'auto', fontSize: 12, lineHeight: 1.55, background: palette.elevated, border: `1px solid ${palette.border}`, borderRadius: 8, color: palette.text, whiteSpace: 'pre' }}>{text}</pre>
  </section>
}

function ChangesView({ cwd }: ChangesProps) {
  const [project, setProject] = useState<ProjectView | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [diff, setDiff] = useState<DiffView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await request<ProjectView>('/aezy/api/project', { cwd })
      setProject(next)
      setSelected(current => current !== null && next.files.some(file => file.path === current)
        ? current
        : next.files[0]?.path ?? null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }, [cwd])

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

  return <div style={{ height: '100%', overflow: 'auto', padding: '18px 22px', background: palette.panel, color: palette.text }}>
    <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingBottom: 14, borderBottom: `1px solid ${palette.border}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 15 }}>{project?.project.name ?? 'Repository'}</strong>
          {project !== null && <span style={{ color: palette.accent, fontFamily: 'monospace', fontSize: 12 }}>{branch}</span>}
          {project !== null && <span style={{ color: palette.muted, fontSize: 12 }}>{project.files.length} changed</span>}
        </div>
        <div title={project?.project.root} style={{ marginTop: 4, color: palette.muted, fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project?.project.root ?? cwd}</div>
        {project !== null && <div style={{ marginTop: 5, color: palette.muted, fontSize: 11 }}>
          Local · {project.environment.platform}/{project.environment.arch} · {project.environment.node}
          {project.environment.packageManager ? ` · ${project.environment.packageManager}` : ''}
        </div>}
      </div>
      <button type="button" onClick={() => void refresh()} disabled={loading} style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${palette.border}`, background: palette.elevated, color: palette.text, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Refreshing…' : 'Refresh'}</button>
    </header>

    {error !== null && <div role="alert" style={{ marginTop: 14, padding: 10, border: '1px solid #b45309', borderRadius: 7, color: '#fbbf24' }}>{error}</div>}

    {project?.repository.clean === true && <div style={{ padding: '44px 0', textAlign: 'center', color: palette.muted }}>Working tree clean</div>}

    {project !== null && project.files.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'minmax(210px, 30%) minmax(0, 1fr)', gap: 18, marginTop: 16, alignItems: 'start' }}>
      <nav aria-label="Changed files" style={{ border: `1px solid ${palette.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {project.files.map(file => <button
          key={file.path}
          type="button"
          onClick={() => setSelected(file.path)}
          style={{ width: '100%', display: 'grid', gridTemplateColumns: '30px minmax(0, 1fr)', gap: 8, padding: '9px 10px', border: 0, borderBottom: `1px solid ${palette.border}`, background: selected === file.path ? palette.elevated : 'transparent', color: palette.text, textAlign: 'left', cursor: 'pointer' }}
        >
          <span style={{ color: file.conflict ? '#fb7185' : palette.accent, fontFamily: 'monospace', fontSize: 11 }}>{statusLabel(file)}</span>
          <span title={file.path} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12 }}>{file.path}</span>
        </button>)}
      </nav>
      <main style={{ minWidth: 0 }}>
        {selected !== null && <h2 style={{ margin: 0, fontFamily: 'monospace', fontSize: 14, overflowWrap: 'anywhere' }}>{selected}</h2>}
        {diff === null && selected !== null && <div style={{ padding: '24px 0', color: palette.muted }}>Loading diff…</div>}
        {diff?.binary === true && <div style={{ padding: '24px 0', color: palette.muted }}>Binary or oversized file; textual diff unavailable.</div>}
        {diff?.truncated === true && <div style={{ marginTop: 10, color: '#fbbf24', fontSize: 12 }}>Diff truncated at the Aezy safety limit.</div>}
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
