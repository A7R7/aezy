import { createHash } from 'node:crypto'

export const LOOP_DEFINITION_SCHEMA_VERSION = 1
export const LOOP_COMPILER_TARGET = 'dsh-agent-preset'
export const LOOP_COMPILER_VERSION = 1

export const LOOP_NODE_TYPES = Object.freeze([
  'agent-phase',
  'tool-phase',
  'approval',
  'condition',
  'bounded-retry',
  'parallel',
  'subagent',
  'checkpoint/compaction',
  'finalize',
])

export const E3_NODE_TYPES = Object.freeze([
  'condition', 'bounded-retry', 'parallel', 'subagent',
])
export const STRUCTURED_FACTS = Object.freeze([
  'tests-passed', 'review-passed', 'tool-failed', 'subagent-failed',
])

const IDENTIFIER = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const DIGEST = /^[0-9a-f]{64}$/
const NODE_TYPES = new Set(LOOP_NODE_TYPES)
const E3_TYPES = new Set(E3_NODE_TYPES)
const FACTS = new Set(STRUCTURED_FACTS)
const ROOT_KEYS = new Set([
  'schemaVersion', 'id', 'revision', 'name', 'description', 'backend',
  'compiler', 'budgets', 'nodes', 'edges',
])
const BACKEND_KEYS = new Set(['id', 'capabilities'])
const COMPILER_KEYS = new Set(['target', 'version'])
const BUDGET_KEYS = new Set(['maxIterations', 'maxWallTimeMs', 'maxTokens', 'maxToolCalls'])
const NODE_KEYS = new Set(['id', 'type', 'label', 'requires', 'config'])
const EDGE_KEYS = new Set(['from', 'to', 'outcome'])
const CONDITION_KEYS = new Set(['fact', 'operator', 'value'])
const PARALLEL_KEYS = new Set(['join', 'maxConcurrency', 'cancelRemaining', 'failurePolicy'])
const SUBAGENT_KEYS = new Set(['maxChildren', 'cancelWithParent', 'failurePolicy'])

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ownKeys(value, allowed, path, errors) {
  if (!isRecord(value)) {
    errors.push({ path, code: 'type', message: 'must be an object' })
    return false
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push({ path: `${path}.${key}`, code: 'unknown-key', message: 'is not allowed' })
  }
  return true
}

function identifier(value, path, errors) {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) {
    errors.push({ path, code: 'identifier', message: 'must be a stable kebab-case identifier' })
    return false
  }
  return true
}

function shortText(value, path, errors, max = 160) {
  if (typeof value !== 'string' || value.trim() === '' || value !== value.trim() || value.length > max) {
    errors.push({ path, code: 'text', message: `must be non-empty trimmed text of at most ${String(max)} characters` })
    return false
  }
  return true
}

function positiveInteger(value, path, errors) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    errors.push({ path, code: 'positive-integer', message: 'must be a positive safe integer' })
    return false
  }
  return true
}

function stringList(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push({ path, code: 'type', message: 'must be an array' })
    return []
  }
  const result = []
  for (const [index, item] of value.entries()) {
    if (identifier(item, `${path}[${String(index)}]`, errors)) result.push(item)
  }
  if (new Set(result).size !== result.length) errors.push({ path, code: 'duplicate', message: 'must not contain duplicates' })
  return result
}

function jsonValue(value, path, errors) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number' && Number.isFinite(value)) return true
  errors.push({ path, code: 'structured-value', message: 'must be a scalar JSON fact value' })
  return false
}

function validateBudgets(value, path, errors) {
  if (!ownKeys(value, BUDGET_KEYS, path, errors)) return
  for (const key of BUDGET_KEYS) positiveInteger(value[key], `${path}.${key}`, errors)
}

function validateNodeConfig(node, path, errors) {
  const configPath = `${path}.config`
  if (node.type === 'condition') {
    if (!ownKeys(node.config, CONDITION_KEYS, configPath, errors)) return
    if (identifier(node.config.fact, `${configPath}.fact`, errors) && !FACTS.has(node.config.fact)) {
      errors.push({ path: `${configPath}.fact`, code: 'unknown-fact', message: 'must name a registered structured fact' })
    }
    if (!['equals', 'not-equals', 'present', 'absent'].includes(node.config.operator)) {
      errors.push({ path: `${configPath}.operator`, code: 'operator', message: 'must be a registered structured-fact operator' })
    }
    if (['equals', 'not-equals'].includes(node.config.operator)) jsonValue(node.config.value, `${configPath}.value`, errors)
    else if (Object.hasOwn(node.config, 'value')) errors.push({ path: `${configPath}.value`, code: 'unexpected-value', message: 'is not allowed for this operator' })
    return
  }
  if (node.type === 'bounded-retry') {
    validateBudgets(node.config, configPath, errors)
    return
  }
  if (node.type === 'parallel') {
    if (!ownKeys(node.config, PARALLEL_KEYS, configPath, errors)) return
    if (!['all', 'all-settled'].includes(node.config.join)) {
      errors.push({ path: `${configPath}.join`, code: 'join', message: 'must be all or all-settled' })
    }
    positiveInteger(node.config.maxConcurrency, `${configPath}.maxConcurrency`, errors)
    if (typeof node.config.cancelRemaining !== 'boolean') errors.push({ path: `${configPath}.cancelRemaining`, code: 'boolean', message: 'must be explicit' })
    if (!['fail-fast', 'collect'].includes(node.config.failurePolicy)) errors.push({ path: `${configPath}.failurePolicy`, code: 'failure-policy', message: 'must be fail-fast or collect' })
    return
  }
  if (node.type === 'subagent') {
    if (!ownKeys(node.config, SUBAGENT_KEYS, configPath, errors)) return
    positiveInteger(node.config.maxChildren, `${configPath}.maxChildren`, errors)
    if (node.config.cancelWithParent !== true) errors.push({ path: `${configPath}.cancelWithParent`, code: 'cancel-propagation', message: 'must remain true' })
    if (!['fail', 'continue'].includes(node.config.failurePolicy)) errors.push({ path: `${configPath}.failurePolicy`, code: 'failure-policy', message: 'must be fail or continue' })
    return
  }
  if (node.config !== undefined) {
    errors.push({ path: configPath, code: 'config-forbidden', message: `is not allowed for ${String(node.type)}` })
  }
}

function reachable(entry, adjacency) {
  const seen = new Set()
  const queue = [entry]
  while (queue.length > 0) {
    const current = queue.shift()
    if (seen.has(current)) continue
    seen.add(current)
    queue.push(...(adjacency.get(current) ?? []))
  }
  return seen
}

function cyclicComponents(adjacency) {
  let index = 0
  const stack = []
  const onStack = new Set()
  const indices = new Map()
  const low = new Map()
  const components = []
  const visit = (node) => {
    indices.set(node, index)
    low.set(node, index)
    index += 1
    stack.push(node)
    onStack.add(node)
    for (const next of adjacency.get(node) ?? []) {
      if (!indices.has(next)) {
        visit(next)
        low.set(node, Math.min(low.get(node), low.get(next)))
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node), indices.get(next)))
      }
    }
    if (low.get(node) !== indices.get(node)) return
    const component = []
    let member
    do {
      member = stack.pop()
      onStack.delete(member)
      component.push(member)
    } while (member !== node)
    if (component.length > 1 || (adjacency.get(node) ?? []).includes(node)) components.push(component)
  }
  for (const node of adjacency.keys()) if (!indices.has(node)) visit(node)
  return components
}

export function validateLoopDefinition(input) {
  const errors = []
  if (!ownKeys(input, ROOT_KEYS, '$', errors)) return { ok: false, errors }
  if (input.schemaVersion !== LOOP_DEFINITION_SCHEMA_VERSION) {
    errors.push({ path: '$.schemaVersion', code: 'schema-version', message: `must equal ${String(LOOP_DEFINITION_SCHEMA_VERSION)}` })
  }
  identifier(input.id, '$.id', errors)
  positiveInteger(input.revision, '$.revision', errors)
  shortText(input.name, '$.name', errors, 80)
  shortText(input.description, '$.description', errors, 240)

  if (ownKeys(input.backend, BACKEND_KEYS, '$.backend', errors)) {
    identifier(input.backend.id, '$.backend.id', errors)
    const capabilities = stringList(input.backend.capabilities, '$.backend.capabilities', errors)
    if (capabilities.length === 0) errors.push({ path: '$.backend.capabilities', code: 'empty', message: 'must declare runtime requirements' })
  }
  if (ownKeys(input.compiler, COMPILER_KEYS, '$.compiler', errors)) {
    if (input.compiler.target !== LOOP_COMPILER_TARGET) errors.push({ path: '$.compiler.target', code: 'compiler-target', message: `must equal ${LOOP_COMPILER_TARGET}` })
    if (input.compiler.version !== LOOP_COMPILER_VERSION) errors.push({ path: '$.compiler.version', code: 'compiler-version', message: `must equal ${String(LOOP_COMPILER_VERSION)}` })
  }
  validateBudgets(input.budgets, '$.budgets', errors)

  if (!Array.isArray(input.nodes) || input.nodes.length === 0) {
    errors.push({ path: '$.nodes', code: 'nodes', message: 'must contain at least one node' })
  }
  const nodeIds = new Set()
  const nodeTypes = new Map()
  let finalizeCount = 0
  for (const [index, node] of (Array.isArray(input.nodes) ? input.nodes : []).entries()) {
    const path = `$.nodes[${String(index)}]`
    if (!ownKeys(node, NODE_KEYS, path, errors)) continue
    if (identifier(node.id, `${path}.id`, errors)) {
      if (nodeIds.has(node.id)) errors.push({ path: `${path}.id`, code: 'duplicate', message: 'must be unique' })
      nodeIds.add(node.id)
    }
    if (!NODE_TYPES.has(node.type)) errors.push({ path: `${path}.type`, code: 'node-type', message: 'is not in the node allowlist' })
    else if (typeof node.id === 'string') nodeTypes.set(node.id, node.type)
    shortText(node.label, `${path}.label`, errors, 80)
    if (node.requires !== undefined) stringList(node.requires, `${path}.requires`, errors)
    validateNodeConfig(node, path, errors)
    if (node.type === 'finalize') finalizeCount += 1
  }
  if (finalizeCount !== 1) errors.push({ path: '$.nodes', code: 'finalize-count', message: 'must contain exactly one finalize node' })

  if (!Array.isArray(input.edges)) errors.push({ path: '$.edges', code: 'type', message: 'must be an array' })
  const incoming = new Map([...nodeIds].map(id => [id, 0]))
  const adjacency = new Map([...nodeIds].map(id => [id, []]))
  const edgeKeys = new Set()
  for (const [index, edge] of (Array.isArray(input.edges) ? input.edges : []).entries()) {
    const path = `$.edges[${String(index)}]`
    if (!ownKeys(edge, EDGE_KEYS, path, errors)) continue
    const fromOk = identifier(edge.from, `${path}.from`, errors)
    const toOk = identifier(edge.to, `${path}.to`, errors)
    if (fromOk && !nodeIds.has(edge.from)) errors.push({ path: `${path}.from`, code: 'unknown-node', message: 'does not name a node' })
    if (toOk && !nodeIds.has(edge.to)) errors.push({ path: `${path}.to`, code: 'unknown-node', message: 'does not name a node' })
    if (!['success', 'failure', 'always', 'true', 'false'].includes(edge.outcome)) {
      errors.push({ path: `${path}.outcome`, code: 'edge-outcome', message: 'is not allowed' })
    }
    const sourceType = nodeTypes.get(edge.from)
    if (sourceType === 'condition' && !['true', 'false'].includes(edge.outcome)) {
      errors.push({ path: `${path}.outcome`, code: 'condition-outcome', message: 'condition edges must be true or false' })
    }
    if (sourceType !== undefined && sourceType !== 'condition' && ['true', 'false'].includes(edge.outcome)) {
      errors.push({ path: `${path}.outcome`, code: 'condition-outcome', message: 'true/false edges require a condition node' })
    }
    if (sourceType === 'finalize') errors.push({ path: `${path}.from`, code: 'finalize-outgoing', message: 'finalize cannot have outgoing edges' })
    const key = `${String(edge.from)}\0${String(edge.to)}\0${String(edge.outcome)}`
    if (edgeKeys.has(key)) errors.push({ path, code: 'duplicate-edge', message: 'must be unique' })
    edgeKeys.add(key)
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      adjacency.get(edge.from).push(edge.to)
      incoming.set(edge.to, incoming.get(edge.to) + 1)
    }
  }
  const entries = [...incoming].filter(([, count]) => count === 0).map(([id]) => id)
  if (entries.length !== 1) errors.push({ path: '$.edges', code: 'entry-count', message: 'graph must have exactly one entry node' })
  if (entries.length === 1) {
    const seen = reachable(entries[0], adjacency)
    for (const id of nodeIds) {
      if (!seen.has(id)) errors.push({ path: '$.edges', code: 'unreachable-node', message: `node ${id} is unreachable` })
    }
  }
  for (const component of cyclicComponents(adjacency)) {
    if (!component.some(id => nodeTypes.get(id) === 'bounded-retry')) {
      errors.push({ path: '$.edges', code: 'unbounded-cycle', message: 'every cycle must pass through a bounded-retry node' })
    }
  }
  for (const node of (Array.isArray(input.nodes) ? input.nodes : [])) {
    if (node.type !== 'bounded-retry' || !isRecord(node.config) || !isRecord(input.budgets)) continue
    for (const key of BUDGET_KEYS) {
      if (Number.isSafeInteger(node.config[key]) && Number.isSafeInteger(input.budgets[key])
        && node.config[key] > input.budgets[key]) {
        errors.push({ path: `$.nodes.${String(node.id)}.config.${key}`, code: 'budget-conflict', message: 'cannot exceed the global budget' })
      }
    }
  }
  for (const node of (Array.isArray(input.nodes) ? input.nodes : [])) {
    if (node.type !== 'condition') continue
    const outcomes = (Array.isArray(input.edges) ? input.edges : []).filter(edge => edge.from === node.id).map(edge => edge.outcome)
    if (outcomes.filter(value => value === 'true').length !== 1 || outcomes.filter(value => value === 'false').length !== 1) {
      errors.push({ path: '$.edges', code: 'condition-branches', message: `condition ${String(node.id)} must have one true and one false edge` })
    }
  }
  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors }
}

function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (isRecord(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  throw new TypeError('LoopDefinition must be lossless JSON')
}

export function loopDefinitionDigest(definition) {
  const validation = validateLoopDefinition(definition)
  if (!validation.ok) throw new LoopDefinitionError('definition-invalid', validation.errors)
  return createHash('sha256').update(canonical(definition)).digest('hex')
}

function deepFreeze(value) {
  if (isRecord(value) || Array.isArray(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

export function publishLoopDefinition(definition, trust = 'untrusted') {
  if (!['system', 'template', 'untrusted'].includes(trust)) throw new TypeError('Unknown definition trust')
  const validation = validateLoopDefinition(definition)
  if (!validation.ok) throw new LoopDefinitionError('definition-invalid', validation.errors)
  const body = structuredClone(definition)
  const digest = loopDefinitionDigest(body)
  return deepFreeze({ body, revision: body.revision, digest, trust })
}

export class LoopDefinitionRegistry {
  #revisions = new Map()

  publish(definition, trust = 'untrusted') {
    const published = publishLoopDefinition(definition, trust)
    const key = `${published.body.id}@${String(published.revision)}`
    const existing = this.#revisions.get(key)
    if (existing !== undefined && existing.digest !== published.digest) {
      throw new LoopDefinitionError('revision-immutable', [{ path: '$.revision', code: 'revision-immutable', message: 'an existing revision cannot change digest' }])
    }
    if (existing !== undefined) return existing
    this.#revisions.set(key, published)
    return published
  }

  get(id, revision) {
    return this.#revisions.get(`${String(id)}@${String(revision)}`)
  }

  list() {
    return [...this.#revisions.values()].sort((left, right) => (
      left.body.id.localeCompare(right.body.id) || left.revision - right.revision
    ))
  }
}

export function resolveLoopCapabilities(published, inventory, options = {}) {
  if (!isRecord(published) || !DIGEST.test(published.digest) || !isRecord(published.body)) {
    throw new TypeError('Expected a published LoopDefinition')
  }
  if (published.revision !== published.body.revision || loopDefinitionDigest(published.body) !== published.digest) {
    throw new LoopDefinitionError('definition-envelope-invalid', [{ path: '$.digest', code: 'digest-mismatch', message: 'does not identify the exact definition body' }])
  }
  const stage = options.stage ?? 'E1'
  const capabilities = isRecord(inventory?.capabilities) ? inventory.capabilities : {}
  const missing = []
  if (inventory?.backend !== published.body.backend.id) missing.push(`backend:${published.body.backend.id}`)
  for (const capability of published.body.backend.capabilities) {
    if (capabilities[capability] !== true) missing.push(capability)
  }
  for (const node of published.body.nodes) {
    for (const capability of node.requires ?? []) {
      if (capabilities[capability] !== true) missing.push(capability)
    }
    if (E3_TYPES.has(node.type) && stage !== 'E3') missing.push(`stage:E3:${node.type}`)
  }
  if (capabilities['durable-definition-binding'] !== true) missing.push('durable-definition-binding')
  const unique = [...new Set(missing)].sort()
  return deepFreeze({
    ok: unique.length === 0,
    definition: { id: published.body.id, revision: published.revision, digest: published.digest },
    backend: published.body.backend.id,
    compiler: structuredClone(published.body.compiler),
    missing: unique,
    executable: false,
    reason: unique.length === 0 ? 'compiler-not-implemented' : 'capability-missing',
  })
}

export function assertLoopExecutable(resolution) {
  if (resolution?.ok !== true || resolution?.executable !== true) {
    throw new LoopDefinitionError(
      resolution?.reason ?? 'definition-unavailable',
      (resolution?.missing ?? []).map(capability => ({ path: '$.backend.capabilities', code: 'capability-missing', message: capability })),
    )
  }
  return resolution
}

export class LoopDefinitionError extends Error {
  constructor(code, violations = []) {
    super(code)
    this.name = 'LoopDefinitionError'
    this.code = code
    this.violations = structuredClone(violations)
  }
}
