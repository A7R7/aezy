import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type HTMLAttributes } from 'react'
import { MarkdownText, ReadBlock } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  InputTriggerCandidate, InputTriggerServiceContract, InputTriggerSource,
} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { summarizeTurn } from '../summary.js'
import { formatProjectReferenceMention } from '../context-reference.js'

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
    available: boolean
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
    gitDir: string | null
    commonDir: string | null
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
    repositoryRoot: string | null
    workspaceRoot?: string
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
  source: 'git' | 'structured'
  partial: boolean
  unobservedTools: string[]
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
  get(name: string): unknown
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
  remote: {
    fileReferences: {
      list(sessionId: string, query: string, signal: AbortSignal): Promise<{
        ok: boolean
        value?: Array<{ path: string; kind: 'file' | 'directory' }>
      }>
    }
  }
}

type InputActions = { setDraft(text: string): void; submit(): void }
type InputState = { draft: string }

type ChangesProps = {
  cwd: string
  sessionId: string
  openReview(target: ReviewOpenTarget): void
  openFiles(target: FilesOpenTarget): void
}

type TurnTailOwner = {
  turn: { turn: number; status: 'open' | 'closed' | 'unknown' }
}

type TurnSummaryProps = {
  matched: { turn: number }
  cwd: string
  sessionId: string
  openReview(target: ReviewOpenTarget): void
  openFiles(target: FilesOpenTarget): void
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
  openFiles(target: FilesOpenTarget): void
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

const changeSurfaceStyle = {
  overflow: 'hidden',
  borderRadius: 12,
  background: 'var(--dsw-alias-markdown-code-block)',
  color: 'var(--dsw-alias-label-primary)',
} as const

const changeBannerStyle = {
  background: 'var(--dsw-alias-markdown-code-block-banner)',
  font: 'var(--dsw-font-xs-13)',
} as const

function ChangeSurface({ className, style, ...props }: HTMLAttributes<HTMLElement>) {
  const classes = ['aezy-change-surface', className].filter(Boolean).join(' ')
  return <section {...props} className={classes} style={{ ...changeSurfaceStyle, ...style }} />
}

type FileVisual = 'code' | 'config' | 'document' | 'image' | 'style' | 'terminal' | 'data' | 'generic'

function fileVisual(path: string): FileVisual {
  const name = path.split('/').pop()?.toLowerCase() ?? path.toLowerCase()
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : ''
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'go', 'rs', 'java', 'kt', 'kts', 'c', 'cc', 'cpp', 'h', 'hpp', 'rb', 'php', 'swift', 'vue', 'svelte'].includes(extension)) return 'code'
  if (['json', 'jsonc', 'json5', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config', 'xml'].includes(extension) || ['dockerfile', 'makefile', '.gitignore', '.gitattributes', '.editorconfig', '.npmrc'].includes(name)) return 'config'
  if (['md', 'mdx', 'txt', 'rst', 'adoc', 'pdf', 'doc', 'docx'].includes(extension)) return 'document'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'avif', 'bmp'].includes(extension)) return 'image'
  if (['css', 'scss', 'sass', 'less', 'styl'].includes(extension)) return 'style'
  if (['sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd'].includes(extension)) return 'terminal'
  if (['csv', 'tsv', 'sql', 'db', 'sqlite', 'parquet'].includes(extension)) return 'data'
  return 'generic'
}

function FileTypeIcon({ path }: { path: string }) {
  const visual = fileVisual(path)
  const color = visual === 'image' || visual === 'style'
    ? palette.accent
    : visual === 'terminal' || visual === 'data'
      ? palette.success
      : visual === 'config'
        ? palette.warning
        : visual === 'code'
          ? 'var(--dsw-alias-state-business-primary, #4d6bfe)'
          : palette.muted
  const label = `${visual[0].toUpperCase()}${visual.slice(1)} file`
  return <span data-aezy-file-icon={visual} role="img" title={label} aria-label={label} style={{ width: 16, height: 16, display: 'inline-flex', flex: '0 0 auto', color }}>
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M3.25 1.75h5.2l4.3 4.3v8.2H3.25z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8.25 1.9v4.35h4.35" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      {visual === 'code' && <path d="m6.15 8-1.4 1.25 1.4 1.25M9.85 8l1.4 1.25-1.4 1.25M8.7 7.65 7.35 10.9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />}
      {visual === 'config' && <path d="M5.3 8.2h1.1M9.6 8.2h1.1M5.3 10.7h1.1M9.6 10.7h1.1M7.45 7.4l1.1 4.1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />}
      {visual === 'document' && <path d="M5.2 8h5.6M5.2 10h5.6M5.2 12h3.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />}
      {visual === 'image' && <><circle cx="6" cy="8" r=".8" fill="currentColor" /><path d="m4.8 12 2.1-2.1 1.3 1.2 1.25-1.45L11.2 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></>}
      {visual === 'style' && <path d="M5.1 8.1h5.8M5.1 10h4.3M5.1 11.9h2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />}
      {visual === 'terminal' && <path d="m5.25 8 1.55 1.4-1.55 1.4M8 11h2.7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />}
      {visual === 'data' && <path d="M5 7.8h6v4.4H5zM5 9.25h6M7 7.8v4.4M9 7.8v4.4" stroke="currentColor" strokeWidth=".8" />}
      {visual === 'generic' && <path d="M5.2 8.2h5.6M5.2 10.2h5.6M5.2 12.2h3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />}
    </svg>
  </span>
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
  expandedPaths: string[]
  revision: number
  files: ReviewNavFile[]
}

type ReviewOpenTarget = Omit<ReviewTarget, 'revision'>

type FilesTarget = {
  sessionId: string
  cwd: string
  selectedPath: string | null
  revision: number
}

type FilesOpenTarget = {
  sessionId: string
  cwd: string
  path?: string | null
}

type ProjectPanelTarget = {
  sessionId: string
  cwd: string
  mode: 'review' | 'files'
  review: ReviewTarget | null
  files: FilesTarget
}

type TreeEntry = {
  name: string
  path: string
  kind: 'directory' | 'file' | 'symlink' | 'unsupported'
}

type DirectoryDocument = {
  version: 1
  fingerprint: string
  workspaceRoot: string
  directory: string
  entries: TreeEntry[]
  truncated: boolean
  totalEntries: number
}

const DIRECTORY_REFRESH_MS = 1_500

type PreviewDocument = {
  version: 1
  identity: string
  workspaceRoot: string
  path: string
  name: string
  kind: 'code' | 'markdown' | 'image' | 'binary'
  size: number
  fingerprint: string | null
  truncated: boolean
  message?: string
  content?: string
  lines?: string[]
  totalLines?: number | null
  language?: string | null
  mime?: string
  dataUrl?: string | null
}

class ProjectPanelController {
  #target: ProjectPanelTarget | null = null
  #revision = 0
  #listeners = new Set<() => void>()
  #composers = new Map<string, (mention: string) => void>()

  getSnapshot = (): ProjectPanelTarget | null => this.#target
  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }
  openReview(target: ReviewOpenTarget): void {
    const current = this.#target
    const available = new Set(target.files.map(file => file.path))
    const sameScope = current?.sessionId === target.sessionId && current.cwd === target.cwd
    const review = {
      ...target,
      expandedPaths: [...new Set(target.expandedPaths.filter(path => available.has(path)))],
      revision: ++this.#revision,
    }
    this.#target = {
      sessionId: target.sessionId,
      cwd: target.cwd,
      mode: 'review',
      review,
      files: sameScope
        ? current.files
        : { sessionId: target.sessionId, cwd: target.cwd, selectedPath: null, revision: ++this.#revision },
    }
    this.#emit()
  }
  openFiles(target: FilesOpenTarget): void {
    const current = this.#target
    const sameScope = current?.sessionId === target.sessionId && current.cwd === target.cwd
    const selectedPath = target.path === undefined ? (sameScope ? current.files.selectedPath : null) : target.path
    this.#target = {
      sessionId: target.sessionId,
      cwd: target.cwd,
      mode: 'files',
      review: sameScope ? current.review : null,
      files: { sessionId: target.sessionId, cwd: target.cwd, selectedPath, revision: ++this.#revision },
    }
    this.#emit()
  }
  show(mode: ProjectPanelTarget['mode']): void {
    if (this.#target === null || (mode === 'review' && this.#target.review === null) || this.#target.mode === mode) return
    this.#target = { ...this.#target, mode }
    this.#emit()
  }
  selectFile(path: string): void {
    if (this.#target === null || !path || path.includes('\0')) return
    this.#target = {
      ...this.#target,
      mode: 'files',
      files: { ...this.#target.files, selectedPath: path, revision: ++this.#revision },
    }
    this.#emit()
  }
  toggleReview(path: string): void {
    const target = this.#target
    if (target === null || target.review === null || !target.review.files.some(file => file.path === path)) return
    const review = target.review
    const expandedPaths = review.expandedPaths.includes(path)
      ? review.expandedPaths.filter(candidate => candidate !== path)
      : [...review.expandedPaths, path]
    this.#target = { ...target, review: { ...review, expandedPaths } }
    this.#emit()
  }
  registerComposer(sessionId: string, insert: (mention: string) => void): () => void {
    this.#composers.set(sessionId, insert)
    return () => {
      if (this.#composers.get(sessionId) === insert) this.#composers.delete(sessionId)
    }
  }
  stageReference(sessionId: string, mention: string): boolean {
    const insert = this.#composers.get(sessionId)
    if (insert === undefined) return false
    insert(mention)
    return true
  }
  #emit(): void {
    for (const listener of this.#listeners) listener()
  }
  close(): void {
    if (this.#target === null) return
    this.#target = null
    this.#emit()
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

type ProjectReference =
  | { version: 1; kind: 'directory'; sessionId: string; cwd: string; path: string }
  | { version: 1; kind: 'diff'; source: 'working'; sessionId: string; cwd: string }
  | { version: 1; kind: 'diff'; source: 'turn'; sessionId: string; cwd: string; turn: number }

type ProjectReferenceCandidateValue =
  | { kind: 'directory-seed' }
  | { kind: 'reference'; reference: ProjectReference; label: string; appearance: 'folder' | 'file' }

function projectMention(reference: ProjectReference, label: string): string {
  return formatProjectReferenceMention(reference, label)
}

function candidateValue(value: ProjectReferenceCandidateValue): string {
  return JSON.stringify(value)
}

function parseProjectCandidate(candidate: InputTriggerCandidate): ProjectReferenceCandidateValue | null {
  if (candidate.value === undefined) return null
  try { return JSON.parse(candidate.value) as ProjectReferenceCandidateValue } catch { return null }
}

function createProjectReferenceSource(ctx: ClientContext): InputTriggerSource {
  return {
    trigger: '@',
    name: 'aezy-project-context',
    order: 5,
    showGroupTitle: false,
    async candidates(session, requestState) {
      const cwd = ctx.sessions.list.getSnapshot().byId[session.sessionId]?.cwd
      if (cwd === undefined || requestState.quoted === true) return []
      const queryText = requestState.query
      const query = queryText.toLocaleLowerCase()
      if (query.startsWith('directory:')) {
        const pathQuery = queryText.slice('directory:'.length)
        const response = await ctx.remote.fileReferences.list(session.sessionId, pathQuery, requestState.signal)
        if (requestState.signal.aborted || !response.ok) return []
        const directories = (response.value ?? []).filter(item => item.kind === 'directory')
        const root: Array<{ path: string; kind: 'directory' }> = pathQuery === '' ? [{ path: '', kind: 'directory' }] : []
        return [...root, ...directories].map(item => {
          const path = item.path
          const label = `directory:${path || '.'}`
          return {
            name: `Directory context · ${path || '.'}`,
            description: path === '' ? 'Current Session workspace root' : path,
            section: 'Project context',
            value: candidateValue({
              kind: 'reference',
              reference: { version: 1, kind: 'directory', sessionId: session.sessionId, cwd, path },
              label,
              appearance: 'folder',
            }),
          }
        })
      }
      const directoryMode = query === '' || 'directory'.startsWith(query) || query === 'directory'
      const diffMode = query === '' || query.startsWith('diff')
      if (!directoryMode && !diffMode) return []
      const candidates: InputTriggerCandidate[] = []
      if (directoryMode) {
        candidates.push({
          name: 'Directory context · choose folder…',
          description: 'Attach a bounded snapshot from this Session workspace',
          section: 'Project context',
          value: candidateValue({ kind: 'directory-seed' }),
        })
      }
      if (diffMode) {
        candidates.push({
          name: 'Diff context · Working changes',
          description: 'Current staged, unstaged, and untracked Git changes',
          section: 'Project context',
          value: candidateValue({
            kind: 'reference',
            reference: { version: 1, kind: 'diff', source: 'working', sessionId: session.sessionId, cwd },
            label: 'diff:working',
            appearance: 'file',
          }),
        })
        try {
          const ledger = await loadLedger(cwd, session.sessionId)
          if (requestState.signal.aborted) return []
          const turnNeedle = /^diff(?::(?:turn-)?)?(\d*)$/u.exec(query)?.[1] ?? ''
          const turns = [...ledger.turns].reverse()
            .filter(turn => turnNeedle === '' || String(turn.turn).includes(turnNeedle))
            .slice(0, 8)
          for (const turn of turns) {
            candidates.push({
              name: `Diff context · Historical Turn ${turn.turn}`,
              description: `${turn.files.length} changed file${turn.files.length === 1 ? '' : 's'} · immutable ledger snapshot`,
              section: 'Project context',
              value: candidateValue({
                kind: 'reference',
                reference: { version: 1, kind: 'diff', source: 'turn', sessionId: session.sessionId, cwd, turn: turn.turn },
                label: `diff:turn-${turn.turn}`,
                appearance: 'file',
              }),
            })
          }
        } catch {
          // Working diff remains usable when the optional Turn ledger is unavailable.
        }
      }
      return candidates
    },
    onPick({ candidate }) {
      const value = parseProjectCandidate(candidate)
      if (value === null) return undefined
      if (value.kind === 'directory-seed') return { text: '@directory:', continue: true }
      const mention = projectMention(value.reference, value.label)
      return {
        insert: {
          source: 'aezy-project-context',
          ref: mention,
          label: value.label,
          appearance: value.appearance,
          clipboardText: mention,
        },
      }
    },
    codec: {
      clipboardText: ref => ref,
      serialize: ref => Promise.resolve(ref),
    },
  }
}

function DiffStats({ additions, deletions }: { additions: number | null; deletions: number | null }) {
  if (additions === null || deletions === null) {
    return <span title="Line statistics are unavailable for a binary, oversized, or legacy ledger entry" style={{ color: palette.muted }}>—</span>
  }
  return <span style={{ display: 'inline-flex', gap: 7, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--ds-font-family-code, monospace)' }}>
    <span style={{ color: palette.success }}>+{additions}</span>
    <span style={{ color: palette.error }}>-{deletions}</span>
  </span>
}

function TurnSummaryFileRow({ file, openReview, openFile }: { file: TurnSummary['files'][number]; openReview(): void; openFile(): void }) {
  const [highlighted, setHighlighted] = useState(false)
  return <div
    data-aezy-turn-file={file.path}
    onPointerEnter={() => setHighlighted(true)}
    onPointerLeave={() => setHighlighted(false)}
    onFocusCapture={() => setHighlighted(true)}
    onBlurCapture={() => setHighlighted(false)}
    style={{ minHeight: 28, display: 'grid', gridTemplateColumns: '16px minmax(0, 1fr) auto 18px', alignItems: 'center', gap: 7, margin: '0 -6px', padding: '0 6px', borderRadius: 6, background: highlighted ? palette.interactive : 'transparent', transition: 'background 120ms ease' }}
  >
    <FileTypeIcon path={file.path} />
    <button type="button" title={`${file.path} · Review changes`} onClick={openReview} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: 0, border: 0, background: 'transparent', color: file.afterFingerprint === null ? 'var(--dsw-alias-label-tertiary)' : 'var(--dsw-alias-label-primary)', cursor: 'pointer', textAlign: 'left', font: 'inherit', textDecoration: file.afterFingerprint === null ? 'line-through' : undefined }}>
      {file.oldPath && file.oldPath !== file.path ? `${file.oldPath} → ` : ''}{file.path}
      {file.binary && <span style={{ marginLeft: 7, color: 'var(--dsw-alias-label-tertiary)' }}>binary</span>}
      {file.truncated && <span style={{ marginLeft: 7, color: palette.warning, fontFamily: 'inherit' }}>truncated</span>}
    </button>
    <DiffStats additions={file.additions} deletions={file.deletions} />
    <button type="button" aria-label={`Open ${file.path} preview`} title="Open file preview" disabled={file.afterFingerprint === null} onClick={openFile} style={{ width: 18, height: 18, padding: 0, border: 0, borderRadius: 4, background: 'transparent', color: file.afterFingerprint === null ? palette.muted : palette.accent, cursor: file.afterFingerprint === null ? 'not-allowed' : 'pointer', fontSize: 12, lineHeight: '18px' }}>↗</button>
  </div>
}

function TurnChangedFiles({ matched, cwd, sessionId, openReview, openFiles }: TurnSummaryProps) {
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

  const canUndo = summary.files.length > 0
    && !summary.partial
    && !summary.concurrent
    && summary.files.every(file => file.revertable)
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
      source: 'turn', cwd, sessionId, turn: summary.turn, expandedPaths: [path],
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

  return <ChangeSurface className="aezy-turn-changes" data-aezy-turn-files={summary.turn} style={{ position: 'relative', marginTop: 16, maxWidth: 720 }}>
    <header data-aezy-turn-banner style={{ ...changeBannerStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 14px', borderRadius: '12px 12px 0 0' }}>
      <strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--ds-font-family-code)', fontSize: 12, lineHeight: '18px', fontWeight: 600 }}>{summary.files.length > 0 ? `Edited ${summary.files.length} ${summary.files.length === 1 ? 'file' : 'files'}` : 'File changes partially observed'}</strong>
      <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, gap: 12, color: 'var(--dsw-alias-label-secondary)' }}>
        <button type="button" disabled={!canUndo || mutating} onClick={() => { void toggleUndo() }} title={summary.partial ? 'Undo is disabled because this Turn was only partially observed' : summary.concurrent ? 'Batch Undo is disabled because another Session overlapped this Turn' : canUndo ? (receiptId === null ? 'Restore every file to its state before this Turn' : 'Reapply the files changed by this Turn') : 'At least one file cannot be restored safely'} style={{ border: 0, padding: 0, margin: 0, background: 'transparent', color: canUndo ? 'inherit' : 'var(--dsw-alias-label-tertiary)', cursor: canUndo && !mutating ? 'pointer' : 'not-allowed', font: 'inherit' }}>{mutating ? 'Working…' : receiptId === null ? 'Undo' : 'Redo'}</button>
        <button type="button" disabled={summary.files.length === 0} onClick={() => openTurnReview()} style={{ border: 0, padding: 0, margin: 0, background: 'transparent', color: summary.files.length > 0 ? 'inherit' : 'var(--dsw-alias-label-tertiary)', cursor: summary.files.length > 0 ? 'pointer' : 'not-allowed', font: 'inherit' }}>Review changes</button>
      </span>
    </header>
    <div style={{ padding: '12px 14px 8px', background: 'var(--dsw-alias-markdown-code-block)', font: 'var(--dsw-font-markdown-code-block)' }}>
      {summary.files.map(file => <TurnSummaryFileRow key={file.path} file={file} openReview={() => openTurnReview(file.path)} openFile={() => openFiles({ cwd, sessionId, path: file.path })} />)}
    </div>
    <footer style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 7, padding: '0 14px 12px', background: 'var(--dsw-alias-markdown-code-block)', color: 'var(--dsw-alias-label-tertiary)', font: 'var(--dsw-font-markdown-code-block)' }}>
      <span aria-hidden>└</span>
      <DiffStats additions={summary.additions} deletions={summary.deletions} />
      <span>· {summary.files.length} {summary.files.length === 1 ? 'file' : 'files'}</span>
      {!summary.statsComplete && <span title="One or more files have unavailable line statistics">· partial</span>}
      {summary.partial && <span title={summary.unobservedTools.length > 0 ? `Potentially unobserved tools: ${summary.unobservedTools.join(', ')}` : 'The structured file journal could not prove complete coverage'} style={{ color: palette.warning }}>· partially observed</span>}
      {summary.concurrent && <span title="Another Session was active in this repository during the Turn" style={{ color: palette.warning }}>· concurrent</span>}
    </footer>
    {error !== null && <div title={error} style={{ padding: '0 14px 12px', background: 'var(--dsw-alias-markdown-code-block)', color: palette.error, font: 'var(--dsw-font-markdown-code-block)' }}>{error}</div>}
  </ChangeSurface>
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

function StructuredPart({ part }: { part: DiffPart }) {
  const [rawOpen, setRawOpen] = useState(false)
  return <section data-aezy-diff-part={part.scope}>
    {part.scope !== 'turn' && <div style={{ padding: '5px 10px', borderBottom: `1px solid ${palette.border}`, background: palette.elevated, color: palette.muted, fontSize: 10, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>{part.label}</div>}
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
      {hunkIndex > 0 && <div aria-hidden="true" title={hunk.header} style={{ height: 18, display: 'flex', alignItems: 'center', gap: 7, color: palette.muted }}><span style={{ flex: 1, borderTop: `1px dotted ${palette.border}` }} /><span style={{ fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 10 }}>···</span><span style={{ flex: 1, borderTop: `1px dotted ${palette.border}` }} /></div>}
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

type ProjectPanelProps = {
  panel: ProjectPanelController
  surface: 'details' | 'overlay'
  closePanel(): void
  syncLayout(narrow: boolean): void
  useSessions<T>(selector: (state: SessionsState) => T): T
}

type ComposerBridgeProps = {
  panel: ProjectPanelController
  sessionId: string
  useInput<T>(selector: (state: InputState) => T): T
  inputActions: InputActions
}

function ComposerBridge({ panel, sessionId, useInput, inputActions }: ComposerBridgeProps) {
  const draft = useInput(state => state.draft)
  const draftRef = useRef(draft)
  draftRef.current = draft
  useEffect(() => panel.registerComposer(sessionId, mention => {
    const current = draftRef.current.trimEnd()
    inputActions.setDraft(current === '' ? `${mention} ` : `${current}\n\n${mention} `)
  }), [inputActions, panel, sessionId])
  return null
}

type ReviewFileCardProps = {
  panel: ProjectPanelController
  target: ReviewTarget
  file: ReviewNavFile
  expanded: boolean
}

function ReviewFileCard({ panel, target, file, expanded }: ReviewFileCardProps) {
  const [document, setDocument] = useState<ReviewDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)
  const revision = target.revision

  useEffect(() => {
    if (!expanded) { setDocument(null); setError(null); return }
    const controller = new AbortController()
    const requestGeneration = ++generation.current
    setDocument(null)
    setError(null)
    const endpoint = target.source === 'turn' ? '/aezy/api/project/turn-review' : '/aezy/api/project/diff'
    const params: Record<string, string> = target.source === 'turn'
      ? { cwd: target.cwd, sessionId: target.sessionId, turn: String(target.turn), path: file.path }
      : { cwd: target.cwd, path: file.path }
    request<ReviewDocument>(endpoint, params, controller.signal).then(value => {
      const active = panel.getSnapshot()?.review
      if (requestGeneration !== generation.current || active?.revision !== revision || !active.expandedPaths.includes(file.path)) return
      if (value.file.path !== file.path || value.source.kind !== target.source) throw new Error('Review response identity does not match the expanded file.')
      setDocument(value)
    }).catch(reason => {
      const active = panel.getSnapshot()?.review
      if (controller.signal.aborted || requestGeneration !== generation.current || active?.revision !== revision || !active.expandedPaths.includes(file.path)) return
      setError(reason instanceof Error ? reason.message : String(reason))
    })
    return () => { controller.abort() }
  }, [expanded, file.path, panel, revision, target.cwd, target.sessionId, target.source, target.turn])

  const status = document?.file.status ?? file.status
  const binary = document?.file.binary ?? file.binary
  const truncated = document?.file.truncated ?? file.truncated

  return <ChangeSurface className="aezy-review-file" data-aezy-review-file={file.path} style={{ marginBottom: 8, overflow: 'visible' }}>
    <button
      type="button"
      onClick={() => panel.toggleReview(file.path)}
      aria-expanded={expanded}
      title={`${file.path}${status === undefined ? '' : ` · ${status}`}`}
      style={{ ...changeBannerStyle, position: expanded ? 'sticky' : undefined, top: expanded ? 0 : undefined, zIndex: expanded ? 3 : undefined, width: '100%', minHeight: 32, display: 'grid', gridTemplateColumns: '16px minmax(0, 1fr) auto 12px', alignItems: 'center', gap: 7, padding: '5px 9px', border: 0, borderRadius: expanded ? '12px 12px 0 0' : 12, color: expanded ? palette.accent : palette.text, cursor: 'pointer', textAlign: 'left' }}
    >
      <FileTypeIcon path={file.path} />
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11 }}>{file.oldPath && file.oldPath !== file.path ? `${file.oldPath} → ` : ''}{file.path}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 9.5, color: palette.muted }}>
        {status !== undefined && status !== 'modified' && <span title={status}>{status}</span>}
        {binary && status !== 'binary' && <span>binary</span>}
        {truncated && <span style={{ color: palette.warning }}>truncated</span>}
        <DiffStats additions={document?.file.additions ?? file.additions ?? null} deletions={document?.file.deletions ?? file.deletions ?? null} />
      </span>
      <span aria-hidden style={{ color: palette.muted, fontSize: 9, transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 120ms ease' }}>▶</span>
    </button>
    {expanded && <div data-aezy-expanded-file={file.path} data-aezy-review-request={file.path} style={{ overflowX: 'auto', borderRadius: '0 0 12px 12px', background: 'var(--dsw-alias-markdown-code-block)' }}>
      {document === null && error === null && <div style={{ padding: 24, color: palette.muted, textAlign: 'center' }}>Loading this file…</div>}
      {error !== null && <div role="alert" style={{ margin: 12, padding: 12, border: `1px solid ${palette.error}`, borderRadius: 8, color: palette.error }}>Review unavailable: {error}</div>}
      {document !== null && <>
        {document.file.binary && <div style={{ padding: '30px 16px', color: palette.muted, textAlign: 'center' }}>Binary file snapshot. Textual lines are not available.</div>}
        {document.file.truncated && <div style={{ margin: 12, padding: 10, border: `1px solid ${palette.warning}`, borderRadius: 7, color: palette.warning }}>This diff exceeded Aezy’s bounded review limit. Only a safe fallback may be available.</div>}
        {!document.file.binary && document.parts.map(part => <StructuredPart key={part.scope} part={part} />)}
      </>}
    </div>}
  </ChangeSurface>
}

function FolderIcon({ open }: { open: boolean }) {
  return <span aria-hidden style={{ width: 16, height: 16, display: 'inline-flex', color: open ? palette.accent : palette.warning }}>
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
      <path d="M1.75 3.5h4.4l1.2 1.35h6.9v7.65H1.75z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      {open && <path d="M2.1 6.35h11.55l-1.15 6.1H1.75z" fill="var(--dsw-alias-bg-base)" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />}
    </svg>
  </span>
}

function parentDirectories(path: string | null): string[] {
  if (path === null) return []
  const parts = path.split('/').filter(Boolean)
  const parents: string[] = []
  for (let index = 1; index < parts.length; index += 1) parents.push(parts.slice(0, index).join('/'))
  return parents
}

type DirectoryBranchProps = {
  panel: ProjectPanelController
  target: ProjectPanelTarget
  directory: string
  depth: number
  expanded: ReadonlySet<string>
  toggle(path: string): void
  stageDirectory(path: string): void
}

function DirectoryBranch({ panel, target, directory, depth, expanded, toggle, stageDirectory }: DirectoryBranchProps) {
  const [document, setDocument] = useState<DirectoryDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const open = directory === '' || expanded.has(directory)

  useEffect(() => {
    if (!open) { setDocument(null); setError(null); return }
    let active = true
    let controller: AbortController | null = null
    let timer: number | undefined
    let loaded = false
    setDocument(null)
    setError(null)

    const refresh = async () => {
      controller = new AbortController()
      try {
        const value = await request<DirectoryDocument>(
          '/aezy/api/project/tree',
          { cwd: target.cwd, path: directory },
          controller.signal,
        )
        const current = panel.getSnapshot()
        if (!active || controller.signal.aborted || current?.sessionId !== target.sessionId || current.cwd !== target.cwd) return
        if (value.directory !== directory) throw new Error('Directory response identity does not match the requested path.')
        loaded = true
        setError(null)
        setDocument(previous => previous?.fingerprint === value.fingerprint ? previous : value)
      } catch (reason) {
        if (active && controller.signal.aborted !== true && !loaded) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      } finally {
        if (active) timer = window.setTimeout(() => { void refresh() }, DIRECTORY_REFRESH_MS)
      }
    }

    void refresh()
    return () => {
      active = false
      if (timer !== undefined) window.clearTimeout(timer)
      controller?.abort()
    }
  }, [directory, open, panel, target.cwd, target.sessionId])

  if (!open) return null
  if (error !== null) return <div role="alert" style={{ padding: `5px 8px 5px ${10 + depth * 16}px`, color: palette.error, fontSize: 11 }}>{error}</div>
  if (document === null) return <div style={{ padding: `5px 8px 5px ${10 + depth * 16}px`, color: palette.muted, fontSize: 11 }}>Loading…</div>

  return <>
    {document.entries.map(entry => {
      const directoryEntry = entry.kind === 'directory'
      const entryOpen = directoryEntry && expanded.has(entry.path)
      const supported = directoryEntry || entry.kind === 'file'
      const selected = target.files.selectedPath === entry.path
      return <div key={entry.path}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center' }}>
          <button
          type="button"
          role="treeitem"
          aria-level={depth + 1}
          aria-expanded={directoryEntry ? entryOpen : undefined}
          disabled={!supported}
          title={entry.kind === 'symlink' ? `${entry.path} · symbolic links are not previewed` : entry.path}
          onClick={() => { if (directoryEntry) toggle(entry.path); else if (entry.kind === 'file') panel.selectFile(entry.path) }}
          style={{ boxSizing: 'border-box', width: '100%', minHeight: 26, display: 'grid', gridTemplateColumns: '12px 16px minmax(0, 1fr)', alignItems: 'center', gap: 5, padding: `3px 8px 3px ${8 + depth * 16}px`, border: 0, borderRadius: 5, background: selected ? palette.interactive : 'transparent', color: supported ? palette.text : palette.muted, cursor: supported ? 'pointer' : 'not-allowed', textAlign: 'left' }}
          >
            <span aria-hidden style={{ color: palette.muted, fontSize: 8, transform: entryOpen ? 'rotate(90deg)' : undefined, visibility: directoryEntry ? 'visible' : 'hidden' }}>▶</span>
            {directoryEntry ? <FolderIcon open={entryOpen} /> : <FileTypeIcon path={entry.path} />}
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11 }}>{entry.name}</span>
          </button>
          {directoryEntry && <button type="button" aria-label={`Ask about ${entry.path} directory`} title="Add directory context to the current Session draft" onClick={() => stageDirectory(entry.path)} style={{ width: 28, height: 24, padding: 0, border: 0, borderRadius: 5, background: 'transparent', color: palette.accent, cursor: 'pointer', fontSize: 10 }}>Ask</button>}
        </div>
        {directoryEntry && entryOpen && <DirectoryBranch panel={panel} target={target} directory={entry.path} depth={depth + 1} expanded={expanded} toggle={toggle} stageDirectory={stageDirectory} />}
      </div>
    })}
    {document.entries.length === 0 && <div style={{ padding: `5px 8px 5px ${10 + depth * 16}px`, color: palette.muted, fontSize: 11 }}>Empty directory</div>}
    {document.truncated && <div style={{ padding: `5px 8px 5px ${10 + depth * 16}px`, color: palette.warning, fontSize: 11 }}>Showing {document.entries.length} of {document.totalEntries} entries.</div>}
  </>
}

function FilePreview({ panel, target }: { panel: ProjectPanelController; target: ProjectPanelTarget }) {
  const path = target.files.selectedPath
  const revision = target.files.revision
  const [document, setDocument] = useState<PreviewDocument | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (path === null) { setDocument(null); setError(null); return }
    const controller = new AbortController()
    setDocument(null)
    setError(null)
    request<PreviewDocument>('/aezy/api/project/preview', { cwd: target.cwd, path }, controller.signal)
      .then(value => {
        const active = panel.getSnapshot()
        if (controller.signal.aborted || active?.mode !== 'files' || active.sessionId !== target.sessionId
          || active.cwd !== target.cwd || active.files.revision !== revision || active.files.selectedPath !== path) return
        if (value.path !== path) throw new Error('Preview response identity does not match the selected file.')
        setDocument(value)
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : String(reason)) })
    return () => { controller.abort() }
  }, [panel, path, revision, target.cwd, target.sessionId])

  if (path === null) return <div style={{ display: 'grid', minHeight: 160, placeItems: 'center', padding: 24, color: palette.muted, textAlign: 'center' }}>Select a file from the workspace tree.</div>
  if (error !== null) return <div role="alert" style={{ margin: 12, padding: 12, border: `1px solid ${palette.error}`, borderRadius: 8, color: palette.error }}>Preview unavailable: {error}</div>
  if (document === null) return <div style={{ display: 'grid', minHeight: 160, placeItems: 'center', padding: 24, color: palette.muted }}>Loading preview…</div>

  const lines = (document.lines ?? []).map((text, index) => ({ number: index + 1, text }))
  return <div data-aezy-file-preview={document.path} data-preview-kind={document.kind} style={{ minWidth: 0, padding: 10 }}>
    {document.truncated && <div style={{ marginBottom: 10, padding: 9, border: `1px solid ${palette.warning}`, borderRadius: 7, color: palette.warning, fontSize: 11 }}>{document.message ?? 'Preview output was safely bounded.'}</div>}
    {document.kind === 'code' && <ReadBlock label={document.path} lines={lines} totalLines={document.totalLines ?? Math.max(lines.length + 1, 1)} lang={document.language ?? undefined} maxLines={120} />}
    {document.kind === 'markdown' && <ChangeSurface className="aezy-markdown-preview" style={{ overflow: 'visible' }}>
      <div style={{ ...changeBannerStyle, padding: '8px 11px', borderRadius: '12px 12px 0 0', fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11 }}>{document.path}</div>
      <div data-aezy-markdown-preview style={{ padding: '2px 14px 14px', overflowWrap: 'anywhere' }}><MarkdownText text={document.content ?? ''} /></div>
    </ChangeSurface>}
    {document.kind === 'image' && <ChangeSurface className="aezy-image-preview">
      <div style={{ ...changeBannerStyle, padding: '8px 11px', fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11 }}>{document.path}</div>
      {document.dataUrl === null || document.dataUrl === undefined
        ? <div style={{ padding: 28, color: palette.muted, textAlign: 'center' }}>{document.message ?? 'Image preview is unavailable.'}</div>
        : <div style={{ display: 'grid', minHeight: 180, placeItems: 'center', padding: 12, backgroundImage: 'linear-gradient(45deg, rgba(127,127,127,.08) 25%, transparent 25%), linear-gradient(-45deg, rgba(127,127,127,.08) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(127,127,127,.08) 75%), linear-gradient(-45deg, transparent 75%, rgba(127,127,127,.08) 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0' }}><img src={document.dataUrl} alt={document.name} style={{ display: 'block', maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }} /></div>}
    </ChangeSurface>}
    {document.kind === 'binary' && <div style={{ padding: 30, border: `1px solid ${palette.border}`, borderRadius: 10, color: palette.muted, textAlign: 'center' }}>{document.message ?? 'Binary preview is unavailable.'}</div>}
  </div>
}

function FilesPanel({ panel, target, stageDirectory }: { panel: ProjectPanelController; target: ProjectPanelTarget; stageDirectory(path: string): void }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(parentDirectories(target.files.selectedPath)))
  useEffect(() => {
    setExpanded(current => new Set([...current, ...parentDirectories(target.files.selectedPath)]))
  }, [target.files.revision, target.files.selectedPath])
  useEffect(() => { setExpanded(new Set(parentDirectories(target.files.selectedPath))) }, [target.cwd, target.sessionId])
  const toggle = useCallback((path: string) => {
    setExpanded(current => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  return <div data-aezy-files-panel style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
    <section aria-label="Workspace file tree" style={{ flex: '0 1 38%', minHeight: 112, maxHeight: 320, overflow: 'auto', padding: '7px 6px 9px', borderBottom: `1px solid ${palette.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 2px 5px' }}><button type="button" onClick={() => stageDirectory('')} title="Add workspace directory context to the current Session draft" style={{ padding: '3px 7px', border: `1px solid ${palette.border}`, borderRadius: 6, background: palette.button, color: palette.accent, cursor: 'pointer', fontSize: 10 }}>Ask about workspace</button></div>
      <div role="tree" aria-label="Files"><DirectoryBranch panel={panel} target={target} directory="" depth={0} expanded={expanded} toggle={toggle} stageDirectory={stageDirectory} /></div>
    </section>
    <section aria-label="File preview" style={{ flex: '1 1 62%', minHeight: 0, overflow: 'auto', background: palette.panel }}>
      <FilePreview panel={panel} target={target} />
    </section>
  </div>
}

function ProjectPanel({ panel: controller, surface, closePanel, syncLayout, useSessions }: ProjectPanelProps) {
  const target = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const currentSession = useSessions(state => state.current)
  const currentCwd = useSessions(state => state.current === undefined ? undefined : state.byId[state.current]?.cwd)
  const [viewport, setViewport] = useState(() => window.innerWidth)
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
    if (target !== null && !matchesSession) closePanel()
  }, [closePanel, matchesSession, target])

  useEffect(() => {
    if (target !== null && matchesSession) syncLayout(narrow)
  }, [matchesSession, narrow, syncLayout, target])

  useEffect(() => {
    if (!visible) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closePanel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closePanel, visible])

  if (!visible || target === null) return null

  const review = target.review
  const stage = (reference: ProjectReference, label: string) => {
    if (controller.stageReference(target.sessionId, projectMention(reference, label))) closePanel()
  }
  const stageDirectory = (path: string) => stage(
    { version: 1, kind: 'directory', sessionId: target.sessionId, cwd: target.cwd, path },
    `directory:${path || '.'}`,
  )
  const stageDiff = () => {
    if (review === null) return
    stage(review.source === 'turn'
      ? { version: 1, kind: 'diff', source: 'turn', sessionId: target.sessionId, cwd: target.cwd, turn: review.turn }
      : { version: 1, kind: 'diff', source: 'working', sessionId: target.sessionId, cwd: target.cwd },
    review.source === 'turn' ? `diff:turn-${review.turn}` : 'diff:working')
  }
  const content = target.mode === 'review' && review !== null
    ? <nav aria-label="Changed file navigation" style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: 10 }}>
        {review.files.map(file => <ReviewFileCard key={file.path} panel={controller} target={review} file={file} expanded={review.expandedPaths.includes(file.path)} />)}
      </nav>
    : <FilesPanel panel={controller} target={target} stageDirectory={stageDirectory} />

  const panel = <aside aria-label="Project panel" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: palette.panel, color: palette.text }}>
      <header style={{ flex: '0 0 auto', padding: '12px 14px 10px', borderBottom: `1px solid ${palette.border}`, background: palette.panel }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: 14 }}>{target.mode === 'review' ? 'Review changes' : 'Files & preview'}</strong>
            <span title={target.cwd} style={{ display: 'block', maxWidth: 280, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: palette.muted, fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 10.5 }}>{target.cwd}</span>
          </div>
          <button type="button" aria-label="Close Project panel" onClick={closePanel} style={{ border: 0, padding: 4, background: 'transparent', color: palette.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div role="tablist" aria-label="Project panel views" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 9 }}>
          <button type="button" role="tab" aria-selected={target.mode === 'review'} disabled={review === null} onClick={() => controller.show('review')} style={{ padding: '3px 8px', border: 0, borderRadius: 6, background: target.mode === 'review' ? palette.interactive : 'transparent', color: review === null ? palette.muted : target.mode === 'review' ? palette.accent : palette.text, cursor: review === null ? 'not-allowed' : 'pointer', fontSize: 11 }}>Review</button>
          <button type="button" role="tab" aria-selected={target.mode === 'files'} onClick={() => controller.show('files')} style={{ padding: '3px 8px', border: 0, borderRadius: 6, background: target.mode === 'files' ? palette.interactive : 'transparent', color: target.mode === 'files' ? palette.accent : palette.text, cursor: 'pointer', fontSize: 11 }}>Files</button>
          {target.mode === 'review' && review !== null && <span style={{ marginLeft: 3, padding: '2px 7px', borderRadius: 999, background: palette.interactive, color: review.source === 'turn' ? palette.accent : palette.warning, fontSize: 10, fontWeight: 600 }}>{review.source === 'turn' ? `Historical · Turn ${review.turn}` : 'Current · Working changes'}</span>}
          {target.mode === 'review' && review !== null && <button type="button" onClick={stageDiff} title="Add this diff snapshot to the current Session draft" style={{ marginLeft: 'auto', padding: '3px 7px', border: `1px solid ${palette.border}`, borderRadius: 6, background: palette.button, color: palette.accent, cursor: 'pointer', fontSize: 10 }}>Ask about diff</button>}
        </div>
      </header>
      {content}
    </aside>

  return surface === 'overlay'
    ? <div data-aezy-project-panel data-aezy-review-panel={target.mode === 'review' ? '' : undefined} data-surface="overlay" data-mode={target.mode} style={{ position: 'absolute', inset: 0, background: 'var(--dsw-alias-bg-overlay, rgba(0,0,0,.36))' }}>{panel}</div>
    : <div data-aezy-project-panel data-aezy-review-panel={target.mode === 'review' ? '' : undefined} data-surface="details" data-mode={target.mode} style={{ width: '100%', height: '100%' }}>{panel}</div>
}

function ChangesView({ cwd, sessionId, openReview, openFiles }: ChangesProps) {
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
    if (project.repository.available === false) return 'No Git repository'
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
      <div style={{ display: 'flex', gap: 7 }}>
        <button type="button" onClick={() => openFiles({ cwd, sessionId })} style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${palette.border}`, background: palette.button, color: palette.text, cursor: 'pointer' }}>Browse files</button>
        <button type="button" onClick={() => void refresh()} disabled={loading} style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${palette.border}`, background: palette.button, color: palette.text, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>
    </header>

    {error !== null && <div role="alert" style={{ marginTop: 14, padding: 10, border: `1px solid ${palette.error}`, borderRadius: 7, color: palette.error }}>{error}</div>}

    {undoReceipt !== null && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14, padding: 10, border: `1px solid ${palette.border}`, borderRadius: 7, background: palette.elevated }}>
      <span style={{ color: palette.muted, fontSize: 12 }}>File reverted with a recoverable receipt.</span>
      <button type="button" onClick={() => void undoLastRevert()} disabled={mutating} style={{ padding: '5px 9px', borderRadius: 6, border: `1px solid ${palette.border}`, background: palette.button, color: palette.text, cursor: mutating ? 'wait' : 'pointer' }}>Undo</button>
    </div>}

    {project?.repository.available === false && <div style={{ padding: '44px 0', textAlign: 'center', color: palette.muted }}>Git working changes are unavailable. Structured Turn file changes are still recorded.</div>}
    {project?.repository.available !== false && project?.repository.clean === true && <div style={{ padding: '44px 0', textAlign: 'center', color: palette.muted }}>Working tree clean</div>}

    {project !== null && project.files.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'minmax(210px, 30%) minmax(0, 1fr)', gap: 18, marginTop: 16, alignItems: 'start' }}>
      <nav aria-label="Changed files" style={{ border: `1px solid ${palette.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {project.files.map(file => <div
          key={file.path}
          style={{ width: '100%', display: 'grid', gridTemplateColumns: '30px minmax(0, 1fr) 22px auto', alignItems: 'center', gap: 8, padding: '9px 10px', boxSizing: 'border-box', borderBottom: `1px solid ${palette.border}`, background: selected === file.path ? palette.interactive : 'transparent', color: palette.text }}
        >
          <span style={{ color: file.conflict ? palette.error : palette.accent, fontFamily: 'monospace', fontSize: 11 }}>{statusLabel(file)}</span>
          <button type="button" title={`${file.path} · Review working changes`} onClick={() => {
            setSelected(file.path)
            openReview({
              source: 'working', cwd, sessionId, expandedPaths: [file.path],
              files: project.files.map(item => ({ path: item.path, oldPath: item.originalPath ?? null })),
            })
          }} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: 0, border: 0, background: 'transparent', color: palette.text, cursor: 'pointer', textAlign: 'left', fontFamily: 'monospace', fontSize: 12 }}>{file.path}</button>
          <button type="button" aria-label={`Open ${file.path} preview`} title="Open file preview" onClick={() => openFiles({ cwd, sessionId, path: file.path })} style={{ width: 22, height: 22, padding: 0, border: 0, borderRadius: 5, background: 'transparent', color: palette.accent, cursor: 'pointer' }}>↗</button>
          {ledgerByPath.has(file.path) && <span title={ledgerByPath.get(file.path)?.turn.concurrent ? 'Observed while another Session was active in this repository' : 'Latest observed Agent turn'} style={{ color: ledgerByPath.get(file.path)?.turn.concurrent ? palette.warning : palette.muted, fontSize: 10 }}>T{ledgerByPath.get(file.path)?.turn.turn}</span>}
        </div>)}
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

function handoffChangedFiles(handoff: Handoff): Array<{ path: string; label: string; previousPath?: string }> {
  const files = new Map<string, { path: string; label: string; previousPath?: string }>()
  for (const file of handoff.git.committedFiles) files.set(file.path, { path: file.path, label: `committed · ${file.status}`, previousPath: file.previousPath })
  for (const file of handoff.git.workingFiles) {
    const label = `working · ${file.conflict ? 'conflict' : `${file.indexStatus}${file.worktreeStatus}`}`
    const previous = files.get(file.path)
    files.set(file.path, { path: file.path, label: previous === undefined ? label : `${previous.label} · ${label}`, previousPath: previous?.previousPath })
  }
  return [...files.values()].sort((left, right) => left.path.localeCompare(right.path))
}

function WorktreesView({ cwd, sessionId, openFiles, openWorktree, returnToLocal }: WorktreesProps) {
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 9, color: palette.muted, fontSize: 11 }}>
        <span>{handoff.git.branch}</span><span>base {shortCommit(handoff.git.base)}</span><span>head {shortCommit(handoff.git.head)}</span><span>{handoff.git.clean ? 'clean' : 'working changes'}</span>
      </div>
      <div style={{ marginTop: 10, padding: 10, border: `1px solid ${palette.border}`, borderRadius: 7, background: palette.elevated, color: palette.text, whiteSpace: 'pre-wrap', fontSize: 12 }}>{handoff.instructions}</div>
      <ChangeSurface className="aezy-handoff-files" style={{ marginTop: 10 }}>
        <div style={{ ...changeBannerStyle, padding: '8px 11px', fontWeight: 600 }}>Changed files</div>
        <div style={{ padding: '7px 8px' }}>
          {handoffChangedFiles(handoff).map(file => <button key={file.path} type="button" onClick={() => openFiles({ cwd, sessionId, path: file.path })} title={`Preview ${file.path} in the current Session workspace`} style={{ width: '100%', minHeight: 28, display: 'grid', gridTemplateColumns: '16px minmax(0, 1fr) auto', alignItems: 'center', gap: 7, padding: '3px 5px', border: 0, borderRadius: 5, background: 'transparent', color: palette.text, cursor: 'pointer', textAlign: 'left' }}>
            <FileTypeIcon path={file.path} />
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11 }}>{file.previousPath !== undefined ? `${file.previousPath} → ` : ''}{file.path}</span>
            <span style={{ color: palette.muted, fontSize: 10 }}>{file.label} · ↗</span>
          </button>)}
          {handoffChangedFiles(handoff).length === 0 && <div style={{ padding: 8, color: palette.muted, fontSize: 11 }}>No changed files recorded.</div>}
        </div>
      </ChangeSurface>
      {handoff.validations.length > 0 && <div style={{ marginTop: 10, color: palette.muted, fontSize: 11 }}>{handoff.validations.map((validation, index) => <div key={`${validation.command}-${index}`}>{validation.status} · <code>{validation.command}</code>{validation.summary ? ` · ${validation.summary}` : ''}</div>)}</div>}
      <details style={{ marginTop: 10 }}>
        <summary style={{ color: palette.muted, cursor: 'pointer', fontSize: 11 }}>Raw handoff JSON</summary>
        <pre style={{ margin: '8px 0 0', padding: 12, maxHeight: 320, overflow: 'auto', border: `1px solid ${palette.border}`, borderRadius: 7, background: palette.code, color: palette.text, fontSize: 11, lineHeight: 1.5 }}>{JSON.stringify(handoff, null, 2)}</pre>
      </details>
    </section>}
  </div>
}

export const inject = [
  'slots', 'sessions', 'workspaces', 'layout', 'inputTriggers', 'remote', 'remote.fileReferences',
]

export function apply(ctx: ClientContext): void {
  const panel = new ProjectPanelController()
  const inputTriggers = ctx.get('inputTriggers') as InputTriggerServiceContract
  ctx.effect(
    () => inputTriggers.registerSource(createProjectReferenceSource(ctx)),
    'aezy-project: @directory and @diff reference source',
  )
  const closePanel = () => {
    panel.close()
    ctx.layout.closeDetails()
  }
  const syncLayout = (narrow: boolean) => {
    if (narrow) ctx.layout.closeDetails()
    else ctx.layout.openDetails()
  }
  const openReview = (target: ReviewOpenTarget) => {
    panel.openReview(target)
    syncLayout(window.innerWidth < 760)
  }
  const openFiles = (target: FilesOpenTarget) => {
    panel.openFiles(target)
    syncLayout(window.innerWidth < 760)
  }

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'aezy-project-composer-bridge',
    order: -100,
    inject: (sessionId: string): Pick<ComposerBridgeProps, 'panel'> => ({ panel }),
  }, ComposerBridge))

  ctx.slots.inject('details', () => ctx.slots.register({
    name: 'details',
    priority: -10,
    inject: (): Omit<ProjectPanelProps, 'useSessions'> => ({
      panel, surface: 'details', closePanel, syncLayout,
    }),
  }, ProjectPanel))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'aezy-project',
    order: 100,
    inject: (): Omit<ProjectPanelProps, 'useSessions'> => ({
      panel, surface: 'overlay', closePanel, syncLayout,
    }),
  }, ProjectPanel))

  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail',
    priority: -10,
    select: (owner: TurnTailOwner) => owner.turn.status === 'closed'
      ? { turn: owner.turn.turn }
      : null,
    inject: (sessionId: string): Omit<TurnSummaryProps, 'matched'> => {
      const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd
      if (cwd === undefined) throw new Error(`aezy-project: session "${sessionId}" has no working directory`)
      return { cwd, sessionId, openReview, openFiles }
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
      return { cwd, sessionId, openReview, openFiles }
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
      return { cwd, sessionId, openFiles }
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
