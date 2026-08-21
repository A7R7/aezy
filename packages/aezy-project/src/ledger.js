import { createHash, randomUUID } from 'node:crypto'
import {
  chmod, lstat, mkdir, readFile, rename, rm, writeFile,
} from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import {
  describeProject,
  fingerprintPath,
  git,
  gitMetadataRoot,
  indexEntry,
  repositoryFor,
  safeRelativePath,
  snapshotChangedFiles,
  treeEntry,
} from './git.js'

const MAX_CAPTURE_BYTES = 8 * 1024 * 1024
const MAX_TURNS_PER_SESSION = 100

function emptyLedger() {
  return { version: 1, sessions: {}, receipts: {} }
}

function validSessionId(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 256 && !value.includes('\0')
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
  await mkdir(metaRoot, { recursive: true })
  const target = resolve(metaRoot, 'ledger.json')
  const temporary = resolve(metaRoot, `.ledger-${process.pid}-${randomUUID()}.tmp`)
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await rename(temporary, target)
}

async function storeObject(metaRoot, bytes) {
  const id = createHash('sha256').update(bytes).digest('hex')
  const directory = resolve(metaRoot, 'objects', id.slice(0, 2))
  const target = resolve(directory, id.slice(2))
  await mkdir(directory, { recursive: true })
  try {
    await writeFile(target, bytes, { flag: 'wx', mode: 0o600 })
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
  }
  return id
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
      worktree: { kind: 'git', ref: head },
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
  return state?.worktree?.kind !== 'unsupported' && state?.index?.kind !== 'unsupported'
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
  return {
    turn: turn.turn,
    startedAt: turn.startedAt,
    endedAt: turn.endedAt,
    reason: turn.reason,
    concurrent: turn.concurrent,
    files: turn.files.map(file => ({
      path: file.path,
      openPath: resolve(root, safeRelativePath(root, file.path)),
      change: file.change,
      beforeFingerprint: file.beforeFingerprint,
      afterFingerprint: file.afterFingerprint,
      revertable: file.revertable,
    })),
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
  #warn

  constructor(options = {}) {
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

  async #start(sessionId, cwd, event) {
    const snapshot = await snapshotChangedFiles(cwd)
    const root = snapshot.project.project.root
    const gitRoot = await gitMetadataRoot(root)
    const metaRoot = resolve(gitRoot, 'aezy')
    const restore = new Map(await Promise.all([...snapshot.states].map(async ([path]) => [
      path,
      await captureRestoreState(root, path, metaRoot),
    ])))
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
      head: snapshot.project.repository.head,
      states: snapshot.states,
      restore,
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

    const after = await snapshotChangedFiles(cwd)
    if (after.project.project.root !== baseline.root) {
      throw new Error('Aezy turn ledger repository changed during the turn')
    }
    const paths = new Set([...baseline.states.keys(), ...after.states.keys()])
    const files = []
    for (const path of [...paths].sort((left, right) => left.localeCompare(right))) {
      const beforeState = baseline.states.get(path)
      const afterState = after.states.get(path)
      const afterFingerprint = afterState?.fingerprint
        ?? await fingerprintPath(baseline.root, path, undefined)
      if (beforeState?.fingerprint === afterFingerprint) continue
      const before = baseline.restore.get(path)
        ?? await cleanBaselineState(baseline.root, baseline.head, path)
      files.push({
        path,
        change: changeKind(beforeState?.fingerprint ?? null, afterFingerprint),
        beforeFingerprint: beforeState?.fingerprint ?? null,
        afterFingerprint,
        before,
        revertable: restoreSupported(before)
          && beforeState?.row?.kind !== 'conflict'
          && beforeState?.row?.kind !== 'renamed'
          && afterState?.row?.kind !== 'conflict'
          && afterState?.row?.kind !== 'renamed',
      })
    }
    if (files.length === 0) return
    const turn = {
      turn: baseline.turn,
      startedAt: baseline.startedAt,
      endedAt: event.time,
      reason: event.data.reason,
      concurrent: baseline.concurrent,
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
    const { root } = await repositoryFor(cwd)
    const metaRoot = resolve(await gitMetadataRoot(root), 'aezy')
    return this.#serial(root, async () => {
      const ledger = await readLedger(metaRoot)
      const turns = ledger.sessions[sessionId]?.turns ?? []
      const receipts = Object.values(ledger.receipts)
        .filter(receipt => receipt.sessionId === sessionId)
        .map(receipt => ({
          id: receipt.id,
          turn: receipt.turn,
          path: receipt.path,
          status: receipt.status,
          createdAt: receipt.createdAt,
        }))
      return {
        version: 1,
        sessionId,
        repositoryRoot: root,
        turns: turns.map(turn => publicTurn(turn, root)),
        receipts,
      }
    })
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
