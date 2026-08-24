import { createHash, randomUUID } from 'node:crypto'
import {
  chmod, lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile,
} from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import {
  describeProject,
  fingerprintPath,
  git,
  gitMetadataRoot,
  indexEntry,
  optionalRepositoryFor,
  readGitBlob,
  repositoryFor,
  safeRelativePath,
  snapshotChangedFiles,
  treeEntry,
} from './git.js'
import { parseUnifiedDiff } from './diff.js'

const MAX_CAPTURE_BYTES = 8 * 1024 * 1024
const MAX_REVIEW_DIFF_BYTES = 512 * 1024
const MAX_TURNS_PER_SESSION = 100
const STRUCTURED_MUTATION_TOOLS = new Set(['write', 'edit'])
const POTENTIALLY_UNOBSERVED_TOOLS = /^(?:bash|pwsh|run_code|terminal_)/u

function emptyLedger() {
  return { version: 1, sessions: {}, receipts: {} }
}

function validSessionId(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 256 && !value.includes('\0')
}

function journalBase(options = {}) {
  const home = options.home ?? process.env.DSH_HOME ?? join(homedir(), '.aezy', 'dsh')
  return resolve(home, 'aezy', 'turn-journal')
}

function workspaceMetaRoot(base, root) {
  const identity = createHash('sha256').update(root).digest('hex')
  return resolve(base, identity)
}

function safeWorkspacePath(root, path) {
  if (typeof path !== 'string' || path === '' || path.includes('\0')) return undefined
  const absolute = isAbsolute(path) ? resolve(path) : resolve(root, path)
  const normalized = relative(root, absolute)
  if (normalized === '' || normalized === '..' || normalized.startsWith(`..${sep}`) || isAbsolute(normalized)
    || normalized === '.git' || normalized.startsWith(`.git${sep}`)) return undefined
  return normalized
}

async function safeObservedPath(root, path) {
  const normalized = safeWorkspacePath(root, path)
  if (normalized === undefined) return undefined
  const canonical = await realpath(resolve(root, normalized))
  const contained = relative(root, canonical)
  if (contained === '..' || contained.startsWith(`..${sep}`) || isAbsolute(contained)) return undefined
  return normalized
}

function standaloneFingerprint(path, state) {
  if (state?.worktree?.kind === 'missing') return null
  return createHash('sha256').update(JSON.stringify({ path, worktree: state?.worktree ?? null })).digest('hex')
}

function stateFromText(text, metaRoot) {
  if (text === null) return Promise.resolve({ worktree: { kind: 'missing' }, index: { kind: 'unavailable' } })
  if (typeof text !== 'string') {
    return Promise.resolve({
      worktree: { kind: 'unsupported', reason: 'structured mutation did not expose bounded text' },
      index: { kind: 'unavailable' },
    })
  }
  const bytes = Buffer.from(text)
  if (bytes.length > MAX_CAPTURE_BYTES) {
    return Promise.resolve({
      worktree: { kind: 'unsupported', reason: `file exceeds ${MAX_CAPTURE_BYTES} bytes` },
      index: { kind: 'unavailable' },
    })
  }
  return storeObject(metaRoot, bytes).then(object => ({
    worktree: { kind: 'object', object, mode: 0o644 },
    index: { kind: 'unavailable' },
  }))
}

function mutationValue(exec, result) {
  if (result?.isError !== false || !STRUCTURED_MUTATION_TOOLS.has(exec?.name)) return undefined
  const value = result.value
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  if (typeof value.path !== 'string' || typeof value.after !== 'string') return undefined
  if (exec.name === 'edit' && typeof value.before !== 'string') return undefined
  if (exec.name === 'write' && value.before !== null && typeof value.before !== 'string') return undefined
  const beforeKnown = exec.name === 'edit' || value.before !== null || value.operation === 'create'
  return {
    path: value.path,
    before: beforeKnown ? value.before : undefined,
    after: value.after,
    partial: !beforeKnown,
  }
}

async function readLedger(metaRoot) {
  try {
    const value = JSON.parse(await readFile(resolve(metaRoot, 'ledger.json'), 'utf8'))
    if (value?.version !== 1 || typeof value.sessions !== 'object' || typeof value.receipts !== 'object') {
      throw new Error('unsupported Aezy ledger format')
    }
    return value
  } catch (error) {
    if (error?.code === 'ENOENT') return emptyLedger()
    throw error
  }
}

async function writeLedger(metaRoot, value) {
  await mkdir(metaRoot, { recursive: true, mode: 0o700 })
  const target = resolve(metaRoot, 'ledger.json')
  const temporary = resolve(metaRoot, `.ledger-${process.pid}-${randomUUID()}.tmp`)
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await rename(temporary, target)
}

async function storeObject(metaRoot, bytes) {
  const id = createHash('sha256').update(bytes).digest('hex')
  const directory = resolve(metaRoot, 'objects', id.slice(0, 2))
  const target = resolve(directory, id.slice(2))
  await mkdir(directory, { recursive: true, mode: 0o700 })
  try {
    await writeFile(target, bytes, { flag: 'wx', mode: 0o600 })
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
  }
  return id
}

async function readObject(metaRoot, id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{64}$/u.test(id)) {
    throw new Error('Aezy review object id is invalid')
  }
  return readFile(resolve(metaRoot, 'objects', id.slice(0, 2), id.slice(2)))
}

async function worktreeBytes(root, metaRoot, state) {
  const descriptor = state?.worktree
  if (descriptor?.kind === 'missing') return Buffer.alloc(0)
  if (descriptor?.kind === 'object') return readObject(metaRoot, descriptor.object)
  if (descriptor?.kind === 'git') {
    const blob = descriptor.blob ?? state?.index?.blob
    return typeof blob === 'string' ? readGitBlob(root, blob) : undefined
  }
  return undefined
}

function normalizeReviewDiff(raw, oldPath, newPath, beforeMissing, afterMissing) {
  const lines = raw.split('\n')
  const left = oldPath ?? newPath
  const right = newPath ?? oldPath
  if (lines[0]?.startsWith('diff --git ')) lines[0] = `diff --git a/${left} b/${right}`
  const beforeAt = lines.findIndex(line => line.startsWith('--- '))
  const afterAt = lines.findIndex(line => line.startsWith('+++ '))
  if (beforeAt >= 0) lines[beforeAt] = beforeMissing ? '--- /dev/null' : `--- a/${left}`
  if (afterAt >= 0) lines[afterAt] = afterMissing ? '+++ /dev/null' : `+++ b/${right}`
  return lines.join('\n')
}

async function reviewForStates(root, path, metaRoot, before, after, oldPath = path) {
  const [beforeBytes, afterBytes] = await Promise.all([
    worktreeBytes(root, metaRoot, before),
    worktreeBytes(root, metaRoot, after),
  ])
  if (beforeBytes === undefined || afterBytes === undefined) {
    return { additions: null, deletions: null, binary: true, truncated: false, object: null }
  }
  if (beforeBytes.includes(0) || afterBytes.includes(0)) {
    return { additions: null, deletions: null, binary: true, truncated: false, object: null }
  }
  if (beforeBytes.equals(afterBytes)) {
    return { additions: 0, deletions: 0, binary: false, truncated: false, object: null }
  }

  const temporaryBase = process.platform === 'win32' ? tmpdir() : '/tmp'
  const temporary = await mkdtemp(join(temporaryBase, 'aezy-turn-diff-'))
  const beforePath = resolve(temporary, 'before')
  const afterPath = resolve(temporary, 'after')
  try {
    await Promise.all([writeFile(beforePath, beforeBytes), writeFile(afterPath, afterBytes)])
    const stat = await git(root, [
      'diff', '--no-index', '--numstat', '--', beforePath, afterPath,
    ], [0, 1])
    const [added, deleted] = stat.stdout.trim().split(/\s+/u)
    if (added === '-' || deleted === '-') {
      return { additions: null, deletions: null, binary: true, truncated: false, object: null }
    }
    const additions = Number.parseInt(added, 10)
    const deletions = Number.parseInt(deleted, 10)
    if (!Number.isSafeInteger(additions) || additions < 0
      || !Number.isSafeInteger(deletions) || deletions < 0) {
      throw new Error(`Git returned invalid Turn diff statistics for "${path}"`)
    }
    let raw
    try {
      raw = (await git(root, [
        'diff', '--no-index', '--no-color', '--unified=3', '--', beforePath, afterPath,
      ], [0, 1])).stdout
    } catch {
      return { additions, deletions, binary: false, truncated: true, object: null }
    }
    const normalized = normalizeReviewDiff(
      raw,
      oldPath,
      path,
      before.worktree.kind === 'missing',
      after.worktree.kind === 'missing',
    )
    const bytes = Buffer.from(normalized)
    const truncated = bytes.length > MAX_REVIEW_DIFF_BYTES
    const bounded = truncated
      ? `${bytes.subarray(0, MAX_REVIEW_DIFF_BYTES).toString('utf8')}\n\n[diff truncated by Aezy]\n`
      : normalized
    return {
      additions,
      deletions,
      binary: false,
      truncated,
      object: bounded === '' ? null : await storeObject(metaRoot, Buffer.from(bounded)),
    }
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

async function captureWorktree(root, path, metaRoot) {
  const absolute = resolve(root, path)
  let info
  try {
    info = await lstat(absolute)
  } catch (error) {
    if (error?.code === 'ENOENT') return { kind: 'missing' }
    throw error
  }
  if (!info.isFile()) {
    return { kind: 'unsupported', reason: info.isSymbolicLink() ? 'symlink' : 'non-file' }
  }
  if (info.size > MAX_CAPTURE_BYTES) {
    return { kind: 'unsupported', reason: `file exceeds ${MAX_CAPTURE_BYTES} bytes` }
  }
  const bytes = await readFile(absolute)
  return {
    kind: 'object',
    object: await storeObject(metaRoot, bytes),
    mode: info.mode & 0o777,
  }
}

async function captureRestoreState(root, path, metaRoot) {
  const [worktree, index] = await Promise.all([
    captureWorktree(root, path, metaRoot),
    indexEntry(root, path),
  ])
  return { worktree, index }
}

async function cleanBaselineState(root, head, path) {
  const entry = await treeEntry(root, head, path)
  if (entry.kind === 'tracked') {
    return {
      worktree: { kind: 'git', ref: head, blob: entry.blob },
      index: entry,
    }
  }
  if (entry.kind === 'missing') {
    return { worktree: { kind: 'missing' }, index: { kind: 'missing' } }
  }
  return {
    worktree: { kind: 'unsupported', reason: 'baseline tree entry is not a regular blob' },
    index: { kind: 'unsupported' },
  }
}

function restoreSupported(state) {
  return state?.worktree?.kind !== 'unsupported'
    && (state?.index?.kind === 'tracked' || state?.index?.kind === 'missing')
}

async function replaceWithObject(root, path, metaRoot, descriptor) {
  const absolute = resolve(root, path)
  let current
  try {
    current = await lstat(absolute)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  if (current !== undefined && !current.isFile()) {
    throw new Error(`safe revert refuses to replace non-file path "${path}"`)
  }
  const bytes = await readFile(resolve(metaRoot, 'objects', descriptor.object.slice(0, 2), descriptor.object.slice(2)))
  await mkdir(dirname(absolute), { recursive: true })
  const temporary = `${absolute}.aezy-${randomUUID()}.tmp`
  await writeFile(temporary, bytes, { mode: descriptor.mode })
  await chmod(temporary, descriptor.mode)
  await rename(temporary, absolute)
}

async function removeWorktreeFile(root, path) {
  const absolute = resolve(root, path)
  let current
  try {
    current = await lstat(absolute)
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }
  if (!current.isFile()) throw new Error(`safe revert refuses to remove non-file path "${path}"`)
  await rm(absolute)
}

async function restoreState(root, path, metaRoot, state) {
  if (!restoreSupported(state)) throw new Error(`safe revert does not support the recorded state for "${path}"`)
  if (state.index.kind === 'tracked') {
    await git(root, ['update-index', '--add', '--cacheinfo', `${state.index.mode},${state.index.blob},${path}`])
  } else if (state.index.kind === 'missing') {
    await git(root, ['update-index', '--force-remove', '--', path])
  } else {
    throw new Error(`safe revert cannot restore the recorded index state for "${path}"`)
  }

  if (state.worktree.kind === 'object') {
    await replaceWithObject(root, path, metaRoot, state.worktree)
  } else if (state.worktree.kind === 'git') {
    await git(root, ['restore', `--source=${state.worktree.ref}`, '--worktree', '--', path])
  } else if (state.worktree.kind === 'missing') {
    await removeWorktreeFile(root, path)
  } else {
    throw new Error(`safe revert cannot restore the recorded worktree state for "${path}"`)
  }
}

function publicTurn(turn, root) {
  const files = turn.files.map(file => ({
    path: file.path,
    openPath: resolve(root, safeRelativePath(root, file.path)),
    change: file.change,
    beforeFingerprint: file.beforeFingerprint,
    afterFingerprint: file.afterFingerprint,
    revertable: file.revertable,
    additions: file.review?.additions ?? null,
    deletions: file.review?.deletions ?? null,
    binary: file.review?.binary ?? false,
    truncated: file.review?.truncated ?? false,
    status: file.review?.status ?? (file.review?.binary ? 'binary' : 'modified'),
    oldPath: file.review?.oldPath ?? null,
  }))
  return {
    turn: turn.turn,
    startedAt: turn.startedAt,
    endedAt: turn.endedAt,
    reason: turn.reason,
    concurrent: turn.concurrent,
    source: turn.source ?? 'git',
    partial: turn.partial === true,
    unobservedTools: Array.isArray(turn.unobservedTools) ? turn.unobservedTools : [],
    additions: files.reduce((sum, file) => sum + (file.additions ?? 0), 0),
    deletions: files.reduce((sum, file) => sum + (file.deletions ?? 0), 0),
    statsComplete: files.every(file => file.additions !== null && file.deletions !== null),
    files,
  }
}

function changeKind(before, after) {
  if (before === null && after !== null) return 'created-or-dirtied'
  if (before !== null && after === null) return 'restored-or-removed'
  return 'modified'
}

/** Durable observational turn ledger plus conflict-safe, recoverable file revert. */
export class TurnLedger {
  #active = new Map()
  #activeRoots = new Map()
  #sessionQueues = new Map()
  #sessionErrors = new Map()
  #repoQueues = new Map()
  #journalBase
  #warn

  constructor(options = {}) {
    this.#journalBase = journalBase(options)
    this.#warn = options.warn ?? (() => {})
  }

  observe(session, event) {
    if (event?.type !== 'turn/start' && event?.type !== 'turn/end') return
    const sessionId = String(session?.id ?? session?.header?.id ?? '')
    const cwd = session?.header?.cwd
    if (!validSessionId(sessionId) || typeof cwd !== 'string') return
    const previous = this.#sessionQueues.get(sessionId) ?? Promise.resolve()
    const next = previous.then(async () => {
      if (event.type === 'turn/start') {
        await this.#start(sessionId, cwd, event)
        this.#sessionErrors.delete(sessionId)
      } else {
        await this.#end(sessionId, cwd, event)
      }
    }).catch(error => {
      this.#sessionErrors.set(sessionId, error)
      this.#warn(error)
    })
    this.#sessionQueues.set(sessionId, next)
  }

  async settle(sessionId) {
    await (this.#sessionQueues.get(sessionId) ?? Promise.resolve())
  }

  /** Record one completed public tool execution without changing its outcome. */
  async observeTool(exec, result) {
    const session = exec?.agent?.session
    const sessionId = String(session?.id ?? session?.header?.id ?? '')
    const cwd = session?.header?.cwd
    if (!validSessionId(sessionId) || typeof cwd !== 'string' || result?.isError !== false) return
    const previous = this.#sessionQueues.get(sessionId) ?? Promise.resolve()
    const next = previous.then(async () => {
      const baseline = this.#active.get(sessionId)
      if (baseline === undefined) return
      const mutation = mutationValue(exec, result)
      if (mutation !== undefined) {
        const path = await safeObservedPath(baseline.root, mutation.path)
        if (path === undefined) {
          baseline.partial = true
          baseline.unobservedTools.add(exec.name)
          return
        }
        const [before, after] = await Promise.all([
          stateFromText(mutation.before, baseline.metaRoot),
          stateFromText(mutation.after, baseline.metaRoot),
        ])
        const current = baseline.observed.get(path)
        baseline.observed.set(path, {
          before: current?.before ?? before,
          after,
          partial: current?.partial === true || mutation.partial,
        })
        if (mutation.partial) baseline.partial = true
        return
      }
      if (POTENTIALLY_UNOBSERVED_TOOLS.test(String(exec?.name ?? ''))) {
        baseline.partial = true
        baseline.unobservedTools.add(String(exec.name))
      }
    }).catch(error => {
      const baseline = this.#active.get(sessionId)
      if (baseline !== undefined) {
        baseline.partial = true
        baseline.unobservedTools.add(String(exec?.name ?? 'unknown'))
      }
      this.#warn(error)
    })
    this.#sessionQueues.set(sessionId, next)
    await next
  }

  async #start(sessionId, cwd, event) {
    const snapshot = await snapshotChangedFiles(cwd)
    const root = snapshot.project.project.root
    const gitAvailable = snapshot.project.repository.available !== false
    const metaRoot = gitAvailable
      ? resolve(await gitMetadataRoot(root), 'aezy')
      : workspaceMetaRoot(this.#journalBase, root)
    const restore = gitAvailable
      ? new Map(await Promise.all([...snapshot.states].map(async ([path]) => [
          path,
          await captureRestoreState(root, path, metaRoot),
        ])))
      : new Map()
    const active = this.#activeRoots.get(root) ?? new Set()
    const concurrent = active.size > 0
    active.add(sessionId)
    this.#activeRoots.set(root, active)
    this.#active.set(sessionId, {
      sessionId,
      turn: event.data.turn,
      startedAt: event.time,
      root,
      cwd,
      metaRoot,
      mode: gitAvailable ? 'git' : 'structured',
      head: snapshot.project.repository.head,
      states: snapshot.states,
      restore,
      observed: new Map(),
      partial: false,
      unobservedTools: new Set(),
      concurrent,
    })
  }

  async #end(sessionId, cwd, event) {
    const baseline = this.#active.get(sessionId)
    if (baseline === undefined || baseline.turn !== event.data.turn) return
    this.#active.delete(sessionId)
    const active = this.#activeRoots.get(baseline.root)
    active?.delete(sessionId)
    if (active?.size === 0) this.#activeRoots.delete(baseline.root)

    if (baseline.mode === 'structured') {
      const files = await this.#structuredFiles(baseline)
      if (files.length === 0 && !baseline.partial) return
      await this.#persistTurn(sessionId, baseline, event, files, 'structured', baseline.partial)
      return
    }

    let after
    try {
      after = await snapshotChangedFiles(cwd)
      if (after.project.repository.available === false || after.project.project.root !== baseline.root) {
        throw new Error('Git repository identity changed during the turn')
      }
    } catch (error) {
      this.#warn(error)
      baseline.partial = true
      baseline.unobservedTools.add('git-enrichment')
      const files = await this.#structuredFiles(baseline)
      await this.#persistTurn(sessionId, baseline, event, files, 'structured', true)
      return
    }

    const paths = new Set([...baseline.states.keys(), ...after.states.keys()])
    const files = []
    for (const path of [...paths].sort((left, right) => left.localeCompare(right))) {
      const beforeState = baseline.states.get(path)
      const afterState = after.states.get(path)
      const afterFingerprint = afterState?.fingerprint
        ?? await fingerprintPath(baseline.root, path, undefined)
      if (beforeState?.fingerprint === afterFingerprint) continue
      const renamedRow = afterState?.row?.kind === 'renamed' ? afterState.row
        : beforeState?.row?.kind === 'renamed' ? beforeState.row : undefined
      const oldPath = renamedRow?.originalPath ?? path
      const before = baseline.restore.get(path)
        ?? baseline.restore.get(oldPath)
        ?? await cleanBaselineState(baseline.root, baseline.head, oldPath)
      const afterRestore = await captureRestoreState(baseline.root, path, baseline.metaRoot)
      const reviewStatus = renamedRow !== undefined && renamedRow.originalPath !== path ? 'renamed'
        : before.worktree.kind === 'missing' && afterRestore.worktree.kind !== 'missing' ? 'added'
          : before.worktree.kind !== 'missing' && afterRestore.worktree.kind === 'missing' ? 'deleted'
            : 'modified'
      let review
      try {
        review = await reviewForStates(baseline.root, path, baseline.metaRoot, before, afterRestore, oldPath)
      } catch (error) {
        this.#warn(error)
        review = { additions: null, deletions: null, binary: true, truncated: false, object: null }
      }
      review.status = review.binary ? 'binary' : reviewStatus
      review.oldPath = reviewStatus === 'added' ? null : oldPath
      review.newPath = reviewStatus === 'deleted' ? null : path
      files.push({
        path,
        change: changeKind(beforeState?.fingerprint ?? null, afterFingerprint),
        beforeFingerprint: beforeState?.fingerprint ?? null,
        afterFingerprint,
        before,
        after: afterRestore,
        review,
        revertable: restoreSupported(before)
          && beforeState?.row?.kind !== 'conflict'
          && beforeState?.row?.kind !== 'renamed'
          && afterState?.row?.kind !== 'conflict'
          && afterState?.row?.kind !== 'renamed',
      })
    }
    if (files.length === 0) return
    await this.#persistTurn(sessionId, baseline, event, files, 'git', false)
  }

  async #structuredFiles(baseline) {
    const files = []
    for (const [path, observed] of [...baseline.observed].sort(([left], [right]) => left.localeCompare(right))) {
      const beforeFingerprint = standaloneFingerprint(path, observed.before)
      const afterFingerprint = standaloneFingerprint(path, observed.after)
      if (beforeFingerprint === afterFingerprint) continue
      const reviewStatus = observed.before.worktree.kind === 'missing' && observed.after.worktree.kind !== 'missing' ? 'added'
        : observed.before.worktree.kind !== 'missing' && observed.after.worktree.kind === 'missing' ? 'deleted'
          : 'modified'
      let review
      try {
        review = await reviewForStates(
          baseline.root, path, baseline.metaRoot, observed.before, observed.after, path,
        )
      } catch (error) {
        this.#warn(error)
        review = { additions: null, deletions: null, binary: true, truncated: false, object: null }
      }
      review.status = review.binary ? 'binary' : reviewStatus
      review.oldPath = reviewStatus === 'added' ? null : path
      review.newPath = reviewStatus === 'deleted' ? null : path
      files.push({
        path,
        change: changeKind(beforeFingerprint, afterFingerprint),
        beforeFingerprint,
        afterFingerprint,
        before: observed.before,
        after: observed.after,
        review,
        revertable: false,
      })
      if (observed.partial) baseline.partial = true
    }
    return files
  }

  async #persistTurn(sessionId, baseline, event, files, source, partial) {
    const turn = {
      turn: baseline.turn,
      startedAt: baseline.startedAt,
      endedAt: event.time,
      reason: event.data.reason,
      concurrent: baseline.concurrent,
      source,
      partial,
      unobservedTools: [...baseline.unobservedTools].sort(),
      files,
    }
    await this.#serial(baseline.root, async () => {
      const ledger = await readLedger(baseline.metaRoot)
      const session = ledger.sessions[sessionId] ?? { turns: [] }
      session.turns = session.turns.filter(item => item.turn !== turn.turn)
      session.turns.push(turn)
      session.turns.sort((left, right) => left.turn - right.turn)
      session.turns = session.turns.slice(-MAX_TURNS_PER_SESSION)
      ledger.sessions[sessionId] = session
      await writeLedger(baseline.metaRoot, ledger)
    })
  }

  async #storesFor(cwd) {
    const workspace = await realpath(cwd)
    const stores = [{ kind: 'workspace', root: workspace, metaRoot: workspaceMetaRoot(this.#journalBase, workspace) }]
    const repository = await optionalRepositoryFor(workspace)
    if (repository.root !== null) {
      stores.push({
        kind: 'git',
        root: repository.root,
        metaRoot: resolve(await gitMetadataRoot(repository.root), 'aezy'),
      })
    }
    return { workspace, repository, stores }
  }

  async view(cwd, sessionId) {
    if (!validSessionId(sessionId)) throw new Error('sessionId is invalid')
    // A turn/end reaches Web clients before this observer's Git scan and
    // atomic ledger write necessarily finish. Waiting here makes the first
    // post-turn summary request authoritative instead of race-dependent.
    await this.settle(sessionId)
    const failure = this.#sessionErrors.get(sessionId)
    if (failure !== undefined) {
      throw new Error(`Aezy could not summarize the latest turn: ${failure instanceof Error ? failure.message : String(failure)}`)
    }
    const { workspace, repository, stores } = await this.#storesFor(cwd)
    const records = await Promise.all(stores.map(async store => ({
      store,
      ledger: await this.#serial(store.metaRoot, () => readLedger(store.metaRoot)),
    })))
    const turns = new Map()
    for (const { store, ledger } of records) {
      for (const turn of ledger.sessions[sessionId]?.turns ?? []) {
        const current = turns.get(turn.turn)
        if (current === undefined || store.kind === 'git') turns.set(turn.turn, { store, turn })
      }
    }
    const receipts = records
      .filter(({ store }) => store.kind === 'git')
      .flatMap(({ ledger }) => Object.values(ledger.receipts))
      .filter(receipt => receipt.sessionId === sessionId)
      .map(receipt => ({
        id: receipt.id,
        kind: receipt.kind ?? 'file',
        turn: receipt.turn,
        path: receipt.path ?? null,
        files: receipt.files?.map(file => file.path) ?? [receipt.path],
        status: receipt.status,
        createdAt: receipt.createdAt,
      }))
    return {
      version: 2,
      sessionId,
      workspaceRoot: workspace,
      repositoryRoot: repository.root,
      gitAvailable: repository.root !== null,
      turns: [...turns.values()]
        .sort((left, right) => left.turn.turn - right.turn.turn)
        .map(({ store, turn }) => publicTurn(turn, store.root)),
      receipts,
    }
  }

  async review(cwd, sessionId, turn, path) {
    if (!validSessionId(sessionId)) throw new Error('sessionId is invalid')
    if (!Number.isSafeInteger(turn) || turn < 1) throw new Error('turn must be a positive integer')
    const { stores } = await this.#storesFor(cwd)
    let validPath = false
    for (const store of [...stores].reverse()) {
      const normalized = safeWorkspacePath(store.root, path)
      if (normalized === undefined) continue
      validPath = true
      const ledger = await this.#serial(store.metaRoot, () => readLedger(store.metaRoot))
      const record = ledger.sessions[sessionId]?.turns?.find(item => item.turn === turn)
      const file = record?.files.find(item => item.path === normalized)
      if (file === undefined) continue
      const snapshotId = file.review?.object ?? createHash('sha256')
        .update(JSON.stringify({ before: file.before, after: file.after, review: file.review }))
        .digest('hex')
      const raw = typeof file.review?.object === 'string'
        ? (await readObject(store.metaRoot, file.review.object)).toString('utf8')
        : ''
      const part = parseUnifiedDiff(raw, { truncated: file.review?.truncated === true })
      const status = file.review?.status ?? (file.review?.binary ? 'binary' : 'modified')
      return {
        version: 2,
        identity: `turn\0${sessionId}\0${store.root}\0${turn}\0${normalized}\0${snapshotId}`,
        source: {
          kind: 'turn',
          label: 'Historical Turn snapshot',
          sessionId,
          turn,
          repositoryRoot: store.kind === 'git' ? store.root : null,
          workspaceRoot: store.root,
          snapshotId,
        },
        file: {
          path: file.path,
          oldPath: file.review?.oldPath ?? (status === 'added' ? null : file.path),
          newPath: file.review?.newPath ?? (status === 'deleted' ? null : file.path),
          status,
          additions: file.review?.additions ?? null,
          deletions: file.review?.deletions ?? null,
          binary: file.review?.binary ?? false,
          truncated: file.review?.truncated ?? false,
        },
        parts: [{ scope: 'turn', label: `Turn ${turn}`, ...part }],
      }
    }
    if (!validPath) throw new Error('path escapes the Session workspace or repository')
    throw new Error('turn ledger entry does not match the requested file')
  }

  async revert(request) {
    const { cwd, sessionId, turn, path, expectedFingerprint } = request
    if (!validSessionId(sessionId)) throw new Error('sessionId is invalid')
    if (!Number.isSafeInteger(turn) || turn < 1) throw new Error('turn must be a positive integer')
    if (expectedFingerprint !== null && !/^[a-f0-9]{64}$/u.test(expectedFingerprint)) {
      throw new Error('expectedFingerprint is invalid')
    }
    const { root } = await repositoryFor(cwd)
    const normalized = safeRelativePath(root, path)
    const metaRoot = resolve(await gitMetadataRoot(root), 'aezy')
    return this.#serial(root, async () => {
      const ledger = await readLedger(metaRoot)
      const record = ledger.sessions[sessionId]?.turns?.find(item => item.turn === turn)
      const file = record?.files?.find(item => item.path === normalized)
      if (file === undefined) throw new Error('turn ledger entry does not match the requested file')
      if (!file.revertable) throw new Error('turn ledger entry is not safely revertable')
      if (file.afterFingerprint !== expectedFingerprint) {
        throw new Error('turn ledger fingerprint does not match the requested fingerprint')
      }
      const project = await describeProject(root)
      const row = project.files.find(item => item.path === normalized)
      const current = await fingerprintPath(root, normalized, row)
      if (current !== expectedFingerprint) {
        throw new Error(`file "${normalized}" changed since this turn was recorded`)
      }
      const undoState = await captureRestoreState(root, normalized, metaRoot)
      if (!restoreSupported(undoState)) throw new Error('current file state cannot be backed up safely')
      const receiptId = randomUUID()
      const receipt = {
        id: receiptId,
        sessionId,
        turn,
        path: normalized,
        createdAt: Date.now(),
        status: 'prepared',
        restore: undoState,
        expectedFingerprint,
      }
      ledger.receipts[receiptId] = receipt
      await writeLedger(metaRoot, ledger)
      try {
        await restoreState(root, normalized, metaRoot, file.before)
      } catch (error) {
        try {
          await restoreState(root, normalized, metaRoot, undoState)
          receipt.status = 'rolled-back'
          await writeLedger(metaRoot, ledger)
        } catch (rollbackError) {
          this.#warn(rollbackError)
        }
        throw error
      }
      const refreshed = await describeProject(root)
      const refreshedRow = refreshed.files.find(item => item.path === normalized)
      receipt.resultFingerprint = await fingerprintPath(root, normalized, refreshedRow)
      receipt.status = 'committed'
      await writeLedger(metaRoot, ledger)
      return { ok: true, receiptId, file: normalized, project: refreshed }
    })
  }

  async revertTurn(request) {
    const { cwd, sessionId, turn } = request
    if (!validSessionId(sessionId)) throw new Error('sessionId is invalid')
    if (!Number.isSafeInteger(turn) || turn < 1) throw new Error('turn must be a positive integer')
    const { root } = await repositoryFor(cwd)
    const metaRoot = resolve(await gitMetadataRoot(root), 'aezy')
    return this.#serial(root, async () => {
      const ledger = await readLedger(metaRoot)
      const record = ledger.sessions[sessionId]?.turns?.find(item => item.turn === turn)
      if (record === undefined) throw new Error('turn ledger entry does not exist')
      if (record.concurrent) throw new Error('concurrent turn changes cannot be reverted as a batch')
      if (record.files.length === 0) throw new Error('turn ledger entry has no files')

      const project = await describeProject(root)
      const prepared = []
      for (const file of record.files) {
        if (!file.revertable) throw new Error(`turn ledger entry is not safely revertable: ${file.path}`)
        const row = project.files.find(item => item.path === file.path)
        const current = await fingerprintPath(root, file.path, row)
        if (current !== file.afterFingerprint) {
          throw new Error(`file "${file.path}" changed since this turn was recorded`)
        }
        const restore = await captureRestoreState(root, file.path, metaRoot)
        if (!restoreSupported(restore)) {
          throw new Error(`current file state cannot be backed up safely: ${file.path}`)
        }
        prepared.push({
          path: file.path,
          restore,
          reverted: file.before,
          expectedFingerprint: file.afterFingerprint,
        })
      }

      const receiptId = randomUUID()
      const receipt = {
        id: receiptId,
        kind: 'turn',
        sessionId,
        turn,
        createdAt: Date.now(),
        status: 'prepared',
        files: prepared,
      }
      ledger.receipts[receiptId] = receipt
      await writeLedger(metaRoot, ledger)
      let revertedProject
      try {
        for (const file of record.files) await restoreState(root, file.path, metaRoot, file.before)
        revertedProject = await describeProject(root)
        for (const file of prepared) {
          const row = revertedProject.files.find(item => item.path === file.path)
          file.revertedFingerprint = await fingerprintPath(root, file.path, row)
        }
      } catch (error) {
        try {
          for (const file of prepared) await restoreState(root, file.path, metaRoot, file.restore)
          receipt.status = 'rolled-back'
          await writeLedger(metaRoot, ledger)
        } catch (rollbackError) {
          this.#warn(rollbackError)
        }
        throw error
      }
      receipt.status = 'committed'
      await writeLedger(metaRoot, ledger)
      return {
        ok: true,
        receiptId,
        files: prepared.map(file => file.path),
        project: revertedProject,
      }
    })
  }

  async undo(request) {
    const { cwd, receiptId } = request
    if (typeof receiptId !== 'string' || !/^[a-f0-9-]{36}$/u.test(receiptId)) {
      throw new Error('receiptId is invalid')
    }
    const { root } = await repositoryFor(cwd)
    const metaRoot = resolve(await gitMetadataRoot(root), 'aezy')
    return this.#serial(root, async () => {
      const ledger = await readLedger(metaRoot)
      const receipt = ledger.receipts[receiptId]
      if (receipt === undefined) throw new Error('revert receipt does not match this repository')
      if (receipt.status === 'undone') throw new Error('revert receipt is already undone')
      if (receipt.status !== 'committed') throw new Error('revert receipt is not undoable')
      if (receipt.kind === 'turn') {
        const project = await describeProject(root)
        for (const file of receipt.files) {
          const row = project.files.find(item => item.path === file.path)
          const current = await fingerprintPath(root, file.path, row)
          if (current !== file.revertedFingerprint) {
            throw new Error(`file "${file.path}" changed since the turn revert was recorded`)
          }
        }
        try {
          for (const file of receipt.files) await restoreState(root, file.path, metaRoot, file.restore)
        } catch (error) {
          try {
            for (const file of receipt.files) await restoreState(root, file.path, metaRoot, file.reverted)
          } catch (rollbackError) {
            this.#warn(rollbackError)
          }
          throw error
        }
        receipt.status = 'undone'
        receipt.undoneAt = Date.now()
        await writeLedger(metaRoot, ledger)
        return {
          ok: true,
          receiptId,
          files: receipt.files.map(file => file.path),
          project: await describeProject(root),
        }
      }
      const project = await describeProject(root)
      const row = project.files.find(item => item.path === receipt.path)
      const current = await fingerprintPath(root, receipt.path, row)
      if (current !== receipt.resultFingerprint) {
        throw new Error(`file "${receipt.path}" changed since the revert was recorded`)
      }
      await restoreState(root, receipt.path, metaRoot, receipt.restore)
      receipt.status = 'undone'
      receipt.undoneAt = Date.now()
      await writeLedger(metaRoot, ledger)
      return { ok: true, receiptId, file: receipt.path, project: await describeProject(root) }
    })
  }

  async #serial(root, operation) {
    const previous = this.#repoQueues.get(root) ?? Promise.resolve()
    const current = previous.then(operation, operation)
    this.#repoQueues.set(root, current.catch(() => {}))
    return current
  }
}
