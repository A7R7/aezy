import { createHash, randomUUID } from 'node:crypto'
import {
  lstat, mkdir, readFile, realpath, rename, writeFile,
} from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import {
  describeProject, git, gitCommonMetadataRoot, repositoryFor,
} from './git.js'

const REGISTRY_VERSION = 1
const MAX_ERROR_LENGTH = 2_000
const MAX_HANDOFF_INSTRUCTIONS = 8_192
const MAX_VALIDATIONS = 20
const MAX_VALIDATION_COMMAND = 512
const MAX_VALIDATION_SUMMARY = 1_024
const MAX_EVENTS = 200

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

function bounded(value, limit) {
  return String(value).slice(0, limit)
}

function validSessionId(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 256 && !value.includes('\0')
}

function validateName(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(value)) {
    throw new Error('worktree name must use 1-64 lowercase letters, numbers, dots, underscores, or hyphens')
  }
  if (value === '.' || value === '..' || value.endsWith('.lock')) {
    throw new Error('worktree name is reserved')
  }
  return value
}

function validateBase(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40,64}$/u.test(value)) {
    throw new Error('base must be an exact Git commit id')
  }
  return value
}

function validateInstructions(value) {
  if (typeof value !== 'string') throw new Error('handoff instructions must be a string')
  const instructions = value.trim()
  if (instructions === '' || instructions.length > MAX_HANDOFF_INSTRUCTIONS || instructions.includes('\0')) {
    throw new Error(`handoff instructions must contain 1-${MAX_HANDOFF_INSTRUCTIONS} characters`)
  }
  return instructions
}

function validateValidations(value) {
  if (!Array.isArray(value) || value.length > MAX_VALIDATIONS) {
    throw new Error(`validations must be an array of at most ${MAX_VALIDATIONS} results`)
  }
  return value.map((item, index) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`validation ${index + 1} must be an object`)
    }
    const command = typeof item.command === 'string' ? item.command.trim() : ''
    const summary = typeof item.summary === 'string' ? item.summary.trim() : ''
    if (command === '' || command.length > MAX_VALIDATION_COMMAND || /[\0\r\n]/u.test(command)) {
      throw new Error(`validation ${index + 1} command is invalid`)
    }
    if (!['passed', 'failed', 'skipped'].includes(item.status)) {
      throw new Error(`validation ${index + 1} status must be passed, failed, or skipped`)
    }
    if (summary.length > MAX_VALIDATION_SUMMARY || summary.includes('\0')) {
      throw new Error(`validation ${index + 1} summary is invalid`)
    }
    return { command, status: item.status, ...(summary === '' ? {} : { summary }) }
  })
}

function emptyRegistry(repositoryRoot, commonDir) {
  return {
    version: REGISTRY_VERSION,
    repository: { root: repositoryRoot, commonDir },
    worktrees: [],
  }
}

async function readRegistry(metaRoot, repositoryRoot, commonDir) {
  try {
    const value = JSON.parse(await readFile(resolve(metaRoot, 'worktrees.json'), 'utf8'))
    if (value?.version !== REGISTRY_VERSION || !Array.isArray(value.worktrees)
      || value?.repository?.root !== repositoryRoot || value?.repository?.commonDir !== commonDir) {
      throw new Error('Aezy worktree registry does not match this repository')
    }
    return value
  } catch (error) {
    if (error?.code === 'ENOENT') return emptyRegistry(repositoryRoot, commonDir)
    throw error
  }
}

async function writeRegistry(metaRoot, value) {
  await mkdir(metaRoot, { recursive: true, mode: 0o700 })
  const target = resolve(metaRoot, 'worktrees.json')
  const temporary = resolve(metaRoot, `.worktrees-${process.pid}-${randomUUID()}.tmp`)
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await rename(temporary, target)
}

function parseWorktreeList(raw) {
  const result = []
  let current = {}
  const publish = () => {
    if (current.path !== undefined) result.push(current)
    current = {}
  }
  for (const token of raw.split('\0')) {
    if (token === '') {
      publish()
      continue
    }
    const at = token.indexOf(' ')
    const key = at < 0 ? token : token.slice(0, at)
    const value = at < 0 ? true : token.slice(at + 1)
    if (key === 'worktree') current.path = value
    else if (key === 'HEAD') current.head = value
    else if (key === 'branch') current.branch = value.startsWith('refs/heads/') ? value.slice(11) : value
    else if (key === 'detached') current.detached = true
    else if (key === 'bare') current.bare = true
    else if (key === 'locked') current.locked = value === true ? null : value
    else if (key === 'prunable') current.prunable = value === true ? null : value
  }
  publish()
  return result
}

async function repositoryContext(cwd) {
  const current = await repositoryFor(cwd)
  const commonDir = await gitCommonMetadataRoot(current.root)
  const listed = parseWorktreeList((await git(current.root, ['worktree', 'list', '--porcelain', '-z'])).stdout)
  const primary = listed.find(item => item.bare !== true)
  if (primary === undefined || typeof primary.path !== 'string' || !isAbsolute(primary.path)) {
    throw new Error('repository has no primary worktree')
  }
  const repositoryRoot = await realpath(primary.path)
  const currentRoot = await realpath(current.root)
  const owner = `${basename(repositoryRoot)}-${createHash('sha256').update(commonDir).digest('hex').slice(0, 12)}`
  const managedRoot = resolve(dirname(repositoryRoot), '.aezy-worktrees', owner)
  return {
    currentRoot,
    repositoryRoot,
    commonDir,
    metaRoot: resolve(commonDir, 'aezy'),
    managedRoot,
    listed,
  }
}

async function assertDirectory(path) {
  const info = await lstat(path)
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error(`managed worktree directory is not a real directory: ${path}`)
  }
  if (await realpath(path) !== path) throw new Error(`managed worktree directory drifted: ${path}`)
}

async function ensureManagedRoot(context) {
  const container = resolve(dirname(context.repositoryRoot), '.aezy-worktrees')
  for (const path of [container, context.managedRoot]) {
    try {
      await mkdir(path, { mode: 0o700 })
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
    }
    await assertDirectory(path)
  }
}

async function assertMissing(path) {
  try {
    await lstat(path)
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }
  throw new Error(`managed worktree target already exists: ${path}`)
}

function assertManagedPath(context, path) {
  if (typeof path !== 'string' || !isAbsolute(path)) throw new Error('managed worktree path is invalid')
  const rel = relative(context.managedRoot, path)
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel) || rel.includes(sep)) {
    throw new Error('managed worktree path escaped its repository-specific directory')
  }
}

function event(record, type, data = {}) {
  record.events ??= []
  record.events.push({ type, at: Date.now(), ...data })
  record.events = record.events.slice(-MAX_EVENTS)
  record.updatedAt = Date.now()
}

function publicRecord(record) {
  return {
    id: record.id,
    name: record.name,
    path: record.path,
    branch: record.branch,
    base: record.base,
    head: record.head ?? null,
    state: record.state,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    sourceDirty: record.sourceDirty === true,
    error: record.error ?? null,
    sessions: (record.sessions ?? []).map(session => ({ ...session })),
    latestHandoffId: record.latestHandoffId ?? null,
    events: (record.events ?? []).map(item => ({ ...item })),
  }
}

function recordFor(registry, id) {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/u.test(id)) throw new Error('worktreeId is invalid')
  const record = registry.worktrees.find(item => item.id === id)
  if (record === undefined) throw new Error('worktree is not owned by Aezy in this repository')
  return record
}

function sessionRecord(record, sessionId) {
  record.sessions ??= []
  let binding = record.sessions.find(item => item.id === sessionId)
  if (binding === undefined) {
    binding = { id: sessionId, status: 'active', activeTurn: false, boundAt: Date.now(), updatedAt: Date.now() }
    record.sessions.push(binding)
  }
  return binding
}

async function currentListedWorktree(context, record) {
  assertManagedPath(context, record.path)
  const listed = parseWorktreeList((await git(context.repositoryRoot, ['worktree', 'list', '--porcelain', '-z'])).stdout)
  const item = listed.find(candidate => candidate.path === record.path)
  if (item === undefined) throw new Error('managed worktree is no longer registered with Git')
  if (item.branch !== record.branch) throw new Error('managed worktree branch drifted')
  if (item.prunable !== undefined) throw new Error('managed worktree is prunable or missing')
  const canonical = await realpath(record.path)
  if (canonical !== record.path) throw new Error('managed worktree path drifted')
  return item
}

/** Parse `git worktree list --porcelain -z` without relying on line paths. */
export { parseWorktreeList }

/** Durable, repository-scoped M3 worktree lifecycle and handoff owner. */
export class WorktreeManager {
  #queues = new Map()
  #sessions
  #warn

  constructor(options = {}) {
    this.#sessions = options.sessions
    this.#warn = options.warn ?? (() => {})
  }

  async list(cwd) {
    const context = await repositoryContext(cwd)
    return this.#serial(context.commonDir, async () => {
      const registry = await readRegistry(context.metaRoot, context.repositoryRoot, context.commonDir)
      const current = registry.worktrees.find(item => item.path === context.currentRoot)
      return {
        version: 1,
        repository: { root: context.repositoryRoot, commonDir: context.commonDir },
        managedRoot: context.managedRoot,
        currentWorktreeId: current?.id ?? null,
        worktrees: registry.worktrees.map(publicRecord),
      }
    })
  }

  async create(request) {
    const name = validateName(request?.name)
    const base = validateBase(request?.base)
    const context = await repositoryContext(request?.cwd)
    if (context.currentRoot !== context.repositoryRoot) {
      throw new Error('new managed worktrees must be created from the primary Local environment')
    }
    const project = await describeProject(context.repositoryRoot)
    if (project.files.some(file => file.conflict)) throw new Error('source repository has unresolved conflicts')
    if (!project.repository.clean && request?.confirmDirty !== true) {
      throw new Error('source repository is dirty; explicit confirmation is required because only the committed base is copied')
    }
    const resolvedBase = (await git(context.repositoryRoot, ['rev-parse', '--verify', `${base}^{commit}`])).stdout.trim()
    if (resolvedBase !== base) throw new Error('base does not resolve to the exact requested commit')
    const branch = `aezy/${name}`
    const branchExists = await git(context.repositoryRoot, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], [0, 1])
    if (branchExists.code === 0) throw new Error(`branch already exists: ${branch}`)
    await ensureManagedRoot(context)
    const path = resolve(context.managedRoot, name)
    assertManagedPath(context, path)
    await assertMissing(path)

    return this.#serial(context.commonDir, async () => {
      const registry = await readRegistry(context.metaRoot, context.repositoryRoot, context.commonDir)
      if (registry.worktrees.some(item => item.name === name || item.path === path || item.branch === branch)) {
        throw new Error('Aezy already has a worktree with this name, path, or branch')
      }
      const now = Date.now()
      const record = {
        id: randomUUID(),
        name,
        path,
        branch,
        base,
        head: null,
        state: 'creating',
        sourceDirty: !project.repository.clean,
        createdAt: now,
        updatedAt: now,
        sessions: [],
        handoffs: [],
        events: [{ type: 'create-started', at: now, sourceRoot: context.repositoryRoot, base }],
      }
      registry.worktrees.push(record)
      await writeRegistry(context.metaRoot, registry)
      try {
        await git(context.repositoryRoot, ['worktree', 'add', '-b', branch, path, base])
        const listed = await currentListedWorktree(context, record)
        if (listed.head !== base) throw new Error('created worktree HEAD does not match the requested base')
        record.head = listed.head
        record.state = 'active'
        event(record, 'created', { head: listed.head })
        await writeRegistry(context.metaRoot, registry)
        return { ok: true, worktree: publicRecord(record), source: project }
      } catch (error) {
        record.state = 'failed'
        record.error = bounded(messageOf(error), MAX_ERROR_LENGTH)
        event(record, 'create-failed', { error: record.error })
        await writeRegistry(context.metaRoot, registry)
        throw error
      }
    })
  }

  async readHandoff(cwd, handoffId) {
    if (typeof handoffId !== 'string' || !/^[a-f0-9-]{36}$/u.test(handoffId)) {
      throw new Error('handoffId is invalid')
    }
    const context = await repositoryContext(cwd)
    return this.#serial(context.commonDir, async () => {
      const registry = await readRegistry(context.metaRoot, context.repositoryRoot, context.commonDir)
      const owned = registry.worktrees.some(record => record.handoffs?.some(item => item.id === handoffId))
      if (!owned) throw new Error('handoff does not belong to this repository')
      const handoff = JSON.parse(await readFile(resolve(context.metaRoot, 'handoffs', `${handoffId}.json`), 'utf8'))
      if (handoff?.version !== 1 || handoff?.id !== handoffId) throw new Error('handoff record is invalid')
      return handoff
    })
  }

  async bind(request) {
    if (!validSessionId(request?.sessionId)) throw new Error('sessionId is invalid')
    const context = await repositoryContext(request?.cwd)
    return this.#serial(context.commonDir, async () => {
      const registry = await readRegistry(context.metaRoot, context.repositoryRoot, context.commonDir)
      const record = recordFor(registry, request.worktreeId)
      await currentListedWorktree(context, record)
      const live = this.#sessions?.get?.(request.sessionId)
      if (this.#sessions !== undefined) {
        if (live === undefined) throw new Error('session is not active on this Host')
        const owner = await repositoryFor(live.header?.cwd)
        const ownerRoot = await realpath(owner.root)
        if (ownerRoot !== record.path) {
          throw new Error(`session cwd belongs to ${ownerRoot}, not managed worktree ${record.path}`)
        }
      } else if (context.currentRoot !== record.path) {
        throw new Error('binding cwd does not belong to this worktree')
      }
      const binding = sessionRecord(record, request.sessionId)
      binding.status = 'active'
      binding.activeTurn = false
      binding.updatedAt = Date.now()
      event(record, 'session-bound', { sessionId: request.sessionId })
      await writeRegistry(context.metaRoot, registry)
      return { ok: true, worktree: publicRecord(record) }
    })
  }

  async observe(session, lifecycle) {
    const sessionId = String(session?.id ?? session?.header?.id ?? '')
    const cwd = session?.header?.cwd
    if (!validSessionId(sessionId) || typeof cwd !== 'string') return
    let context
    try {
      context = await repositoryContext(cwd)
    } catch {
      return
    }
    await this.#serial(context.commonDir, async () => {
      const registry = await readRegistry(context.metaRoot, context.repositoryRoot, context.commonDir)
      const record = registry.worktrees.find(item => item.path === context.currentRoot)
      if (record === undefined) return
      const binding = sessionRecord(record, sessionId)
      if (lifecycle === 'disposed') {
        binding.status = 'disposed'
        binding.activeTurn = false
      } else {
        binding.status = 'active'
        if (lifecycle === 'turn-start') binding.activeTurn = true
        if (lifecycle === 'turn-end') binding.activeTurn = false
      }
      binding.updatedAt = Date.now()
      event(record, `session-${lifecycle}`, { sessionId })
      await writeRegistry(context.metaRoot, registry)
    })
  }

  async handoff(request) {
    if (!validSessionId(request?.sessionId)) throw new Error('sessionId is invalid')
    const instructions = validateInstructions(request?.instructions)
    const validations = validateValidations(request?.validations ?? [])
    const context = await repositoryContext(request?.cwd)
    return this.#serial(context.commonDir, async () => {
      const registry = await readRegistry(context.metaRoot, context.repositoryRoot, context.commonDir)
      const record = registry.worktrees.find(item => item.path === context.currentRoot)
      if (record === undefined) throw new Error('current directory is not an Aezy-managed worktree')
      const binding = record.sessions?.find(item => item.id === request.sessionId)
      if (binding === undefined || binding.status !== 'active') {
        throw new Error('handoff requires the active Session bound to this worktree')
      }
      if (binding.activeTurn) throw new Error('handoff cannot be generated during an active Turn')
      const listed = await currentListedWorktree(context, record)
      const project = await describeProject(record.path)
      const counts = (await git(record.path, ['rev-list', '--left-right', '--count', `${record.base}...HEAD`])).stdout.trim().split(/\s+/u).map(Number)
      const handoff = {
        version: 1,
        id: randomUUID(),
        direction: 'worktree-to-local',
        createdAt: Date.now(),
        sessionId: request.sessionId,
        repository: {
          root: context.repositoryRoot,
          worktreePath: record.path,
          worktreeId: record.id,
        },
        git: {
          branch: record.branch,
          base: record.base,
          head: listed.head,
          commitsBehindBase: Number.isFinite(counts[0]) ? counts[0] : 0,
          commitsAheadOfBase: Number.isFinite(counts[1]) ? counts[1] : 0,
          clean: project.repository.clean,
          files: project.files.map(file => ({
            path: file.path,
            kind: file.kind,
            indexStatus: file.indexStatus,
            worktreeStatus: file.worktreeStatus,
            conflict: file.conflict === true,
          })),
        },
        validations,
        instructions,
      }
      const handoffDir = resolve(context.metaRoot, 'handoffs')
      await mkdir(handoffDir, { recursive: true, mode: 0o700 })
      await writeFile(resolve(handoffDir, `${handoff.id}.json`), `${JSON.stringify(handoff, null, 2)}\n`, {
        mode: 0o600,
        flag: 'wx',
      })
      record.handoffs ??= []
      record.handoffs.push(handoff)
      record.latestHandoffId = handoff.id
      record.head = listed.head
      record.state = 'handed-off'
      event(record, 'handoff-created', { handoffId: handoff.id, sessionId: request.sessionId, head: listed.head })
      await writeRegistry(context.metaRoot, registry)
      return { ok: true, handoff, worktree: publicRecord(record) }
    })
  }

  async release(request) {
    if (!validSessionId(request?.sessionId)) throw new Error('sessionId is invalid')
    const context = await repositoryContext(request?.cwd)
    return this.#serial(context.commonDir, async () => {
      const registry = await readRegistry(context.metaRoot, context.repositoryRoot, context.commonDir)
      const record = recordFor(registry, request.worktreeId)
      const binding = record.sessions?.find(item => item.id === request.sessionId)
      if (binding === undefined) throw new Error('session is not bound to this worktree')
      if (binding.activeTurn) throw new Error('session has an active Turn and cannot be released')
      binding.status = 'released'
      binding.releasedAt = Date.now()
      binding.updatedAt = binding.releasedAt
      event(record, 'session-released', { sessionId: request.sessionId })
      await writeRegistry(context.metaRoot, registry)
      return { ok: true, worktree: publicRecord(record) }
    })
  }

  async cleanup(request) {
    const context = await repositoryContext(request?.cwd)
    return this.#serial(context.commonDir, async () => {
      const registry = await readRegistry(context.metaRoot, context.repositoryRoot, context.commonDir)
      const record = recordFor(registry, request.worktreeId)
      if (record.state === 'cleaned') throw new Error('worktree is already cleaned')
      const listed = await currentListedWorktree(context, record)
      const active = (record.sessions ?? []).filter(item => item.status === 'active' || item.activeTurn)
      if (active.length > 0) throw new Error(`worktree has active Sessions: ${active.map(item => item.id).join(', ')}`)
      const project = await describeProject(record.path)
      if (!project.repository.clean) throw new Error('worktree has uncommitted changes and cannot be cleaned')
      if (project.files.some(file => file.conflict)) throw new Error('worktree has unresolved conflicts and cannot be cleaned')
      const handoff = record.handoffs?.find(item => item.id === record.latestHandoffId)
      if (handoff === undefined || handoff.git.head !== listed.head || handoff.git.clean !== true) {
        throw new Error('cleanup requires a clean handoff matching the current worktree HEAD')
      }
      await git(context.repositoryRoot, ['worktree', 'remove', '--', record.path])
      const remaining = parseWorktreeList((await git(context.repositoryRoot, ['worktree', 'list', '--porcelain', '-z'])).stdout)
      if (remaining.some(item => item.path === record.path)) throw new Error('Git still reports the worktree after cleanup')
      record.head = listed.head
      record.state = 'cleaned'
      record.cleanedAt = Date.now()
      event(record, 'cleaned', { head: listed.head, branchRetained: record.branch })
      await writeRegistry(context.metaRoot, registry)
      return {
        ok: true,
        worktree: publicRecord(record),
        branchRetained: record.branch,
        pathRemoved: record.path,
      }
    })
  }

  async #serial(key, operation) {
    const previous = this.#queues.get(key) ?? Promise.resolve()
    const current = previous.then(operation, operation)
    this.#queues.set(key, current.catch((error) => { this.#warn(error) }))
    return current
  }
}
