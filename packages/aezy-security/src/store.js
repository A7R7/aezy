import { createHash, randomUUID } from 'node:crypto'
import { chmod, mkdir, rename, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import {
  canonicalRepositoryRoot,
  NETWORK_MODES,
  normalizeRule,
  RULE_EFFECTS,
  RULE_SCOPES,
} from './policy.js'

const MAX_RULES = 128
const MAX_AUDIT = 500

function emptyState() {
  return { version: 1, network: { default: 'ask', repositories: {} }, rules: [], audit: [] }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
}

function validUuid(value) {
  return typeof value === 'string' && /^[a-f0-9-]{36}$/u.test(value)
}

function validateRule(rule) {
  if (!isPlainObject(rule) || !validUuid(rule.id) || !Number.isSafeInteger(rule.createdAt)
    || rule.createdAt < 0 || !RULE_EFFECTS.includes(rule.effect)
    || !RULE_SCOPES.includes(rule.scope)) return false
  try {
    const normalized = normalizeRule({ ...rule, scope: 'global' }, process.cwd())
    if (normalized.effect !== rule.effect || normalized.tool !== rule.tool
      || normalized.commandPrefix !== rule.commandPrefix) return false
    return rule.scope !== 'repository' || (typeof rule.repositoryRoot === 'string'
      && isAbsolute(rule.repositoryRoot))
  } catch {
    return false
  }
}

function validateAudit(record) {
  return isPlainObject(record) && validUuid(record.id) && Number.isSafeInteger(record.time)
    && record.time >= 0 && typeof record.tool === 'string' && isAbsolute(record.repositoryRoot)
    && RULE_EFFECTS.includes(record.decision) && ['none', 'possible', 'required'].includes(record.network)
    && typeof record.source === 'string' && typeof record.explanation === 'string'
    && (record.outcome === undefined
      || ['allowed-once', 'rejected', 'cancelled', 'unavailable'].includes(record.outcome))
}

function validateLoaded(value) {
  if (!isPlainObject(value) || value.version !== 1 || !isPlainObject(value.network)
    || !NETWORK_MODES.includes(value.network.default) || !isPlainObject(value.network.repositories)
    || !Array.isArray(value.rules) || value.rules.length > MAX_RULES
    || !Array.isArray(value.audit) || value.audit.length > MAX_AUDIT
    || Object.entries(value.network.repositories).some(([cwd, mode]) => !isAbsolute(cwd)
      || !NETWORK_MODES.includes(mode))
    || value.rules.some(rule => !validateRule(rule))
    || new Set(value.rules.map(rule => rule.id)).size !== value.rules.length
    || value.audit.some(record => !validateAudit(record))) {
    throw new Error('unsupported Aezy security policy format')
  }
  return value
}

function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

function snapshotOf(state, repositoryRoot) {
  return {
    version: 1,
    repositoryRoot,
    network: {
      default: state.network.default,
      effective: state.network.repositories[repositoryRoot] ?? state.network.default,
      repositoryOverride: state.network.repositories[repositoryRoot] ?? null,
    },
    rules: state.rules.filter(rule => rule.scope === 'global' || rule.repositoryRoot === repositoryRoot),
    audit: state.audit.filter(record => record.repositoryRoot === repositoryRoot).slice(-100).reverse(),
  }
}

export function redactCommand(command) {
  if (typeof command !== 'string') return null
  return command
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/giu, '$1<redacted>@')
    .replace(/\b([A-Z0-9_]*(?:TOKEN|KEY|SECRET|PASSWORD|PASSWD))=([^\s]+)/giu, '$1=<redacted>')
    .replace(/(--?(?:token|password|secret|api-key))(?:=|\s+)([^\s]+)/giu, '$1 <redacted>')
    .slice(0, 240)
}

export function auditRecord(input) {
  const command = input.action.command
  return {
    id: randomUUID(),
    time: Date.now(),
    sessionId: input.sessionId,
    turn: input.turn,
    callId: input.callId,
    tool: input.action.tool,
    repositoryRoot: input.action.repositoryRoot,
    network: input.action.network,
    decision: input.verdict.decision,
    source: input.verdict.source,
    explanation: input.verdict.explanation,
    ...input.verdict.ruleId === undefined ? {} : { ruleId: input.verdict.ruleId },
    ...command === null ? {} : {
      commandPreview: redactCommand(command),
      commandHash: createHash('sha256').update(command).digest('hex'),
    },
  }
}

export class PolicyStore {
  #state
  #tail = Promise.resolve()

  constructor(file) {
    this.file = resolve(file)
    this.#state = deepFreeze(existsSync(this.file)
      ? validateLoaded(JSON.parse(readFileSync(this.file, 'utf8')))
      : emptyState())
  }

  get state() {
    return this.#state
  }

  snapshot(cwd) {
    const repositoryRoot = canonicalRepositoryRoot(cwd)
    return snapshotOf(this.#state, repositoryRoot)
  }

  async setNetwork({ mode, scope, cwd }) {
    if (!NETWORK_MODES.includes(mode)) throw new Error('network mode must be deny, ask, or allow')
    if (scope !== 'global' && scope !== 'repository') throw new Error('network scope must be global or repository')
    const repositoryRoot = canonicalRepositoryRoot(cwd)
    return this.#commit((state) => {
      if (scope === 'global') state.network.default = mode
      else state.network.repositories[repositoryRoot] = mode
      return snapshotOf(state, repositoryRoot)
    })
  }

  async clearRepositoryNetwork(cwd) {
    const repositoryRoot = canonicalRepositoryRoot(cwd)
    return this.#commit((state) => {
      delete state.network.repositories[repositoryRoot]
      return snapshotOf(state, repositoryRoot)
    })
  }

  async addRule(input) {
    const normalized = normalizeRule(input, input.cwd)
    return this.#commit((state) => {
      if (state.rules.length >= MAX_RULES) throw new Error(`rule limit reached (${MAX_RULES})`)
      const rule = { id: randomUUID(), createdAt: Date.now(), ...normalized }
      state.rules.unshift(rule)
      return rule
    })
  }

  async removeRule(id) {
    if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/u.test(id)) throw new Error('rule id is invalid')
    return this.#commit((state) => {
      const index = state.rules.findIndex(rule => rule.id === id)
      if (index < 0) throw new Error('rule does not exist')
      const [removed] = state.rules.splice(index, 1)
      return removed
    })
  }

  async appendAudit(record) {
    return this.#commit((state) => {
      state.audit.push(record)
      if (state.audit.length > MAX_AUDIT) state.audit.splice(0, state.audit.length - MAX_AUDIT)
      return record
    })
  }

  async settleApproval({ sessionId, callId, outcome }) {
    return this.#commit((state) => {
      const record = state.audit.findLast(item => item.sessionId === sessionId
        && item.callId === callId && item.decision === 'ask' && item.outcome === undefined)
      if (record === undefined) return null
      record.outcome = outcome
      record.settledAt = Date.now()
      return record
    })
  }

  #commit(mutator) {
    const operation = this.#tail.then(async () => {
      const next = structuredClone(this.#state)
      const result = mutator(next)
      await this.#write(next)
      this.#state = deepFreeze(next)
      return result
    })
    this.#tail = operation.catch(() => {})
    return operation
  }

  async #write(state) {
    const directory = dirname(this.file)
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const temporary = resolve(directory, `.security-${process.pid}-${randomUUID()}.tmp`)
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
    await rename(temporary, this.file)
    await Promise.all([
      chmod(directory, 0o700),
      chmod(this.file, 0o600),
    ])
  }
}
