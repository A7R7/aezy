import { createHash } from 'node:crypto'

export const LOOP_DEFINITION_SCHEMA_VERSION = 1
export const LOOP_COMPILER_TARGET = 'dsh-agent-hooks'
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

const IDENTIFIER = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const DIGEST = /^[0-9a-f]{64}$/
const NODE_TYPES = new Set(LOOP_NODE_TYPES)
const ROOT_KEYS = new Set([
  'schemaVersion', 'id', 'revision', 'name', 'description', 'backend',
  'compiler', 'budgets', 'nodes', 'edges',
])
const BACKEND_KEYS = new Set(['id', 'capabilities'])
const COMPILER_KEYS = new Set(['target', 'version'])
const BUDGET_KEYS = new Set(['maxIterations', 'maxWallTimeMs', 'maxTokens', 'maxToolCalls'])
const NODE_KEYS = new Set(['id', 'type', 'label', 'requires', 'config'])
const EDGE_KEYS = new Set(['from', 'to', 'outcome'])

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateKeys(value, allowed, path, errors) {
  if (!isRecord(value)) {
    errors.push({ path, code: 'type', message: 'must be an object' })
    return false
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push({ path: `${path}.${key}`, code: 'unknown-key', message: 'is not allowed' })
  }
  return true
}

function validateIdentifier(value, path, errors) {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) {
    errors.push({ path, code: 'identifier', message: 'must be a stable kebab-case identifier' })
    return false
  }
  return true
}

function validateText(value, path, errors, max) {
  if (typeof value !== 'string' || value.trim() === '' || value !== value.trim() || value.length > max) {
    errors.push({ path, code: 'text', message: `must be non-empty trimmed text of at most ${String(max)} characters` })
  }
}

function validatePositiveInteger(value, path, errors) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    errors.push({ path, code: 'positive-integer', message: 'must be a positive safe integer' })
  }
}

function validateIdentifierList(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push({ path, code: 'type', message: 'must be an array' })
    return []
  }
  const result = []
  for (const [index, item] of value.entries()) {
    if (validateIdentifier(item, `${path}[${String(index)}]`, errors)) result.push(item)
  }
  if (new Set(result).size !== result.length) errors.push({ path, code: 'duplicate', message: 'must not contain duplicates' })
  return result
}

function validateBudgets(value, path, errors) {
  if (!validateKeys(value, BUDGET_KEYS, path, errors)) return
  for (const key of BUDGET_KEYS) validatePositiveInteger(value[key], `${path}.${key}`, errors)
}

function validateNodeConfig(node, path, errors) {
  if (node.type === 'bounded-retry') {
    validateBudgets(node.config, `${path}.config`, errors)
    return
  }
  if (node.config !== undefined) {
    errors.push({ path: `${path}.config`, code: 'config-forbidden', message: `is not allowed for ${String(node.type)}` })
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
  if (!validateKeys(input, ROOT_KEYS, '$', errors)) return { ok: false, errors }
  if (input.schemaVersion !== LOOP_DEFINITION_SCHEMA_VERSION) {
    errors.push({ path: '$.schemaVersion', code: 'schema-version', message: `must equal ${String(LOOP_DEFINITION_SCHEMA_VERSION)}` })
  }
  validateIdentifier(input.id, '$.id', errors)
  validatePositiveInteger(input.revision, '$.revision', errors)
  validateText(input.name, '$.name', errors, 80)
  validateText(input.description, '$.description', errors, 240)

  if (validateKeys(input.backend, BACKEND_KEYS, '$.backend', errors)) {
    validateIdentifier(input.backend.id, '$.backend.id', errors)
    const capabilities = validateIdentifierList(input.backend.capabilities, '$.backend.capabilities', errors)
    if (capabilities.length === 0) errors.push({ path: '$.backend.capabilities', code: 'empty', message: 'must declare runtime requirements' })
  }
  if (validateKeys(input.compiler, COMPILER_KEYS, '$.compiler', errors)) {
    if (input.compiler.target !== LOOP_COMPILER_TARGET) {
      errors.push({ path: '$.compiler.target', code: 'compiler-target', message: `must equal ${LOOP_COMPILER_TARGET}` })
    }
    if (input.compiler.version !== LOOP_COMPILER_VERSION) {
      errors.push({ path: '$.compiler.version', code: 'compiler-version', message: `must equal ${String(LOOP_COMPILER_VERSION)}` })
    }
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
    if (!validateKeys(node, NODE_KEYS, path, errors)) continue
    if (validateIdentifier(node.id, `${path}.id`, errors)) {
      if (nodeIds.has(node.id)) errors.push({ path: `${path}.id`, code: 'duplicate', message: 'must be unique' })
      nodeIds.add(node.id)
    }
    if (!NODE_TYPES.has(node.type)) errors.push({ path: `${path}.type`, code: 'node-type', message: 'is not in the node allowlist' })
    else if (typeof node.id === 'string') nodeTypes.set(node.id, node.type)
    validateText(node.label, `${path}.label`, errors, 80)
    if (node.requires !== undefined) validateIdentifierList(node.requires, `${path}.requires`, errors)
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
    if (!validateKeys(edge, EDGE_KEYS, path, errors)) continue
    const fromOk = validateIdentifier(edge.from, `${path}.from`, errors)
    const toOk = validateIdentifier(edge.to, `${path}.to`, errors)
    const outcomeOk = validateIdentifier(edge.outcome, `${path}.outcome`, errors)
    if (fromOk && !nodeIds.has(edge.from)) errors.push({ path: `${path}.from`, code: 'unknown-node', message: 'does not name a node' })
    if (toOk && !nodeIds.has(edge.to)) errors.push({ path: `${path}.to`, code: 'unknown-node', message: 'does not name a node' })
    if (nodeTypes.get(edge.from) === 'finalize') errors.push({ path: `${path}.from`, code: 'finalize-outgoing', message: 'finalize cannot have outgoing edges' })
    if (fromOk && toOk && outcomeOk) {
      const key = `${edge.from}\0${edge.to}\0${edge.outcome}`
      if (edgeKeys.has(key)) errors.push({ path, code: 'duplicate-edge', message: 'must be unique' })
      edgeKeys.add(key)
    }
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      adjacency.get(edge.from).push(edge.to)
      incoming.set(edge.to, incoming.get(edge.to) + 1)
    }
  }
  const entries = [...incoming].filter(([, count]) => count === 0).map(([id]) => id)
  if (entries.length !== 1) errors.push({ path: '$.edges', code: 'entry-count', message: 'graph must have exactly one entry node' })
  if (entries.length === 1) {
    const seen = reachable(entries[0], adjacency)
    for (const id of nodeIds) if (!seen.has(id)) errors.push({ path: '$.edges', code: 'unreachable-node', message: `node ${id} is unreachable` })
  }
  for (const component of cyclicComponents(adjacency)) {
    if (!component.some(id => nodeTypes.get(id) === 'bounded-retry')) {
      errors.push({ path: '$.edges', code: 'unbounded-cycle', message: 'every cycle must pass through a bounded-retry node' })
    }
  }
  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors }
}

export function canonicalLoopDefinition(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalLoopDefinition).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalLoopDefinition(value[key])}`).join(',')}}`
  }
  throw new TypeError('LoopDefinition must be lossless JSON')
}

export function loopDefinitionDigest(definition) {
  const validation = validateLoopDefinition(definition)
  if (!validation.ok) throw new LoopDefinitionError('definition-invalid', validation.errors)
  return createHash('sha256').update(canonicalLoopDefinition(definition)).digest('hex')
}

function deepFreeze(value) {
  if (isRecord(value) || Array.isArray(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

export function publishLoopDefinition(definition, trust = 'untrusted') {
  if (!['system', 'template', 'untrusted'].includes(trust)) throw new TypeError('unknown definition trust')
  const validation = validateLoopDefinition(definition)
  if (!validation.ok) throw new LoopDefinitionError('definition-invalid', validation.errors)
  const body = structuredClone(definition)
  return deepFreeze({ body, revision: body.revision, digest: loopDefinitionDigest(body), trust })
}

export function resolveLoopCapabilities(published, inventory, options = {}) {
  if (!isRecord(published) || !DIGEST.test(published.digest) || !isRecord(published.body)) {
    throw new TypeError('expected a published LoopDefinition')
  }
  if (published.revision !== published.body.revision || loopDefinitionDigest(published.body) !== published.digest) {
    throw new LoopDefinitionError('definition-envelope-invalid', [{ path: '$.digest', code: 'digest-mismatch', message: 'does not identify the exact definition body' }])
  }
  const capabilities = isRecord(inventory?.capabilities) ? inventory.capabilities : {}
  const missing = []
  if (inventory?.backend !== published.body.backend.id) missing.push(`backend:${published.body.backend.id}`)
  for (const capability of published.body.backend.capabilities) if (capabilities[capability] !== true) missing.push(capability)
  for (const node of published.body.nodes) {
    for (const capability of node.requires ?? []) if (capabilities[capability] !== true) missing.push(capability)
  }
  if (capabilities['durable-definition-binding'] !== true) missing.push('durable-definition-binding')
  const unique = [...new Set(missing)].sort()
  const enabled = options.enabled === true
  return deepFreeze({
    ok: unique.length === 0,
    definition: { id: published.body.id, revision: published.revision, digest: published.digest },
    backend: published.body.backend.id,
    compiler: structuredClone(published.body.compiler),
    missing: unique,
    executable: unique.length === 0 && enabled,
    reason: unique.length > 0 ? 'capability-missing' : enabled ? 'ready' : 'dogfood-disabled',
  })
}

export class LoopDefinitionError extends Error {
  constructor(code, violations = []) {
    super(code)
    this.name = 'LoopDefinitionError'
    this.code = code
    this.violations = structuredClone(violations)
  }
}
