import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertLoopExecutable,
  CODEX_INSPIRED_DEFINITION,
  LoopDefinitionError,
  LoopDefinitionRegistry,
  loopDefinitionDigest,
  publishLoopDefinition,
  resolveLoopCapabilities,
  validateLoopDefinition,
} from '../src/index.js'

function baseDefinition() {
  return structuredClone(CODEX_INSPIRED_DEFINITION.body)
}

function fullInventory(extra = {}) {
  return {
    backend: 'dsh-native',
    capabilities: Object.fromEntries([
      ...CODEX_INSPIRED_DEFINITION.body.backend.capabilities,
      'durable-definition-binding',
    ].map(capability => [capability, true])),
    ...extra,
  }
}

test('system codex-inspired definition is immutable, canonical, and macro-only', () => {
  assert.equal(validateLoopDefinition(CODEX_INSPIRED_DEFINITION.body).ok, true)
  assert.equal(CODEX_INSPIRED_DEFINITION.digest, loopDefinitionDigest(CODEX_INSPIRED_DEFINITION.body))
  assert.equal(CODEX_INSPIRED_DEFINITION.digest.length, 64)
  assert.equal(CODEX_INSPIRED_DEFINITION.trust, 'system')
  assert.equal(Object.isFrozen(CODEX_INSPIRED_DEFINITION), true)
  assert.equal(Object.isFrozen(CODEX_INSPIRED_DEFINITION.body.nodes), true)
  assert.deepEqual(
    [...new Set(CODEX_INSPIRED_DEFINITION.body.nodes.map(node => node.type))].sort(),
    ['agent-phase', 'checkpoint/compaction', 'finalize'],
  )
  assert.doesNotMatch(
    JSON.stringify(CODEX_INSPIRED_DEFINITION),
    /"(?:prompt|script|shell|permission|credential|package|import)":/i,
  )
})

test('canonical digest ignores object key insertion order but not content', () => {
  const original = baseDefinition()
  const reordered = {
    edges: original.edges,
    nodes: original.nodes,
    budgets: original.budgets,
    compiler: original.compiler,
    backend: original.backend,
    description: original.description,
    name: original.name,
    revision: original.revision,
    id: original.id,
    schemaVersion: original.schemaVersion,
  }
  assert.equal(loopDefinitionDigest(original), loopDefinitionDigest(reordered))
  reordered.description = 'A distinct immutable revision body.'
  assert.notEqual(loopDefinitionDigest(original), loopDefinitionDigest(reordered))
})

test('registry makes one id/revision immutable and idempotent', () => {
  const registry = new LoopDefinitionRegistry()
  const first = registry.publish(baseDefinition(), 'system')
  const same = registry.publish(baseDefinition(), 'system')
  assert.equal(first, same)
  const changed = baseDefinition()
  changed.description = 'Changed without a revision bump.'
  assert.throws(
    () => registry.publish(changed, 'system'),
    error => error instanceof LoopDefinitionError && error.code === 'revision-immutable',
  )
})

test('strict schema rejects code, prompt, imports, permission grants, and unknown keys', () => {
  for (const [key, value] of [
    ['script', 'return 1'],
    ['prompt', 'secret template'],
    ['package', '@evil/plugin'],
    ['permissions', { network: true }],
  ]) {
    const candidate = baseDefinition()
    candidate[key] = value
    const result = validateLoopDefinition(candidate)
    assert.equal(result.ok, false)
    assert.equal(result.errors.some(error => error.code === 'unknown-key' && error.path === `$.${key}`), true)
  }
})

test('structured conditions accept registered scalar facts and reject executable values', () => {
  const candidate = baseDefinition()
  candidate.nodes.splice(1, 0, {
    id: 'decision',
    type: 'condition',
    label: 'Decision',
    config: { fact: 'tests-passed', operator: 'equals', value: true },
  })
  candidate.edges = [
    { from: 'orient', to: 'decision', outcome: 'success' },
    { from: 'decision', to: 'implement', outcome: 'true' },
    ...candidate.edges.slice(1),
  ]
  assert.equal(validateLoopDefinition(candidate).ok, true)
  candidate.nodes[1].config.value = { eval: 'process.exit()' }
  const invalid = validateLoopDefinition(candidate)
  assert.equal(invalid.ok, false)
  assert.equal(invalid.errors.some(error => error.code === 'structured-value'), true)
})

test('bounded retry requires all four independent hard budgets', () => {
  const candidate = baseDefinition()
  candidate.nodes.splice(1, 0, {
    id: 'retry',
    type: 'bounded-retry',
    label: 'Bounded retry',
    config: { maxIterations: 2, maxWallTimeMs: 60_000, maxTokens: 8_000 },
  })
  candidate.edges = [
    { from: 'orient', to: 'retry', outcome: 'success' },
    { from: 'retry', to: 'implement', outcome: 'success' },
    ...candidate.edges.slice(1),
  ]
  const invalid = validateLoopDefinition(candidate)
  assert.equal(invalid.ok, false)
  assert.equal(invalid.errors.some(error => error.path.endsWith('.maxToolCalls')), true)
  candidate.nodes[1].config.maxToolCalls = 4
  assert.equal(validateLoopDefinition(candidate).ok, true)
})

test('graph validation rejects ambiguous entry, unreachable nodes, and missing finalize', () => {
  const candidate = baseDefinition()
  candidate.nodes.push({ id: 'orphan', type: 'agent-phase', label: 'Orphan' })
  let invalid = validateLoopDefinition(candidate)
  assert.equal(invalid.ok, false)
  assert.equal(invalid.errors.some(error => error.code === 'entry-count'), true)
  candidate.nodes = candidate.nodes.filter(node => node.type !== 'finalize')
  invalid = validateLoopDefinition(candidate)
  assert.equal(invalid.errors.some(error => error.code === 'finalize-count'), true)
})

test('cycles are rejected unless they pass through a fully bounded retry node', () => {
  const unbounded = baseDefinition()
  unbounded.edges.splice(2, 0, { from: 'verify', to: 'implement', outcome: 'failure' })
  let result = validateLoopDefinition(unbounded)
  assert.equal(result.ok, false)
  assert.equal(result.errors.some(error => error.code === 'unbounded-cycle'), true)

  const bounded = baseDefinition()
  bounded.nodes.splice(2, 0, {
    id: 'retry',
    type: 'bounded-retry',
    label: 'Bounded retry',
    config: { maxIterations: 2, maxWallTimeMs: 60_000, maxTokens: 8_000, maxToolCalls: 4 },
  })
  bounded.edges = [
    { from: 'orient', to: 'implement', outcome: 'success' },
    { from: 'implement', to: 'retry', outcome: 'success' },
    { from: 'retry', to: 'implement', outcome: 'failure' },
    { from: 'retry', to: 'verify', outcome: 'success' },
    ...bounded.edges.slice(2),
  ]
  assert.equal(validateLoopDefinition(bounded).ok, true)
})

test('E1 resolver fails closed when exact durable Session binding is absent', () => {
  const inventory = fullInventory()
  inventory.capabilities['durable-definition-binding'] = false
  const resolution = resolveLoopCapabilities(CODEX_INSPIRED_DEFINITION, inventory, { stage: 'E1' })
  assert.equal(resolution.ok, false)
  assert.equal(resolution.executable, false)
  assert.deepEqual(resolution.missing, ['durable-definition-binding'])
  assert.throws(
    () => assertLoopExecutable(resolution),
    error => error instanceof LoopDefinitionError && error.code === 'capability-missing',
  )
})

test('matching capabilities still cannot fabricate an unimplemented compiler/runtime', () => {
  const resolution = resolveLoopCapabilities(CODEX_INSPIRED_DEFINITION, fullInventory(), { stage: 'E1' })
  assert.equal(resolution.ok, true)
  assert.equal(resolution.executable, false)
  assert.equal(resolution.reason, 'compiler-not-implemented')
  assert.throws(
    () => assertLoopExecutable(resolution),
    error => error instanceof LoopDefinitionError && error.code === 'compiler-not-implemented',
  )
})

test('capability resolution rejects a tampered revision/digest envelope', () => {
  const tampered = { ...CODEX_INSPIRED_DEFINITION, digest: '0'.repeat(64) }
  assert.throws(
    () => resolveLoopCapabilities(tampered, fullInventory()),
    error => error instanceof LoopDefinitionError && error.code === 'definition-envelope-invalid',
  )
})

test('E3 node vocabulary remains stage-gated in E1', () => {
  const candidate = baseDefinition()
  candidate.nodes.splice(1, 0, {
    id: 'delegation', type: 'subagent', label: 'Delegation', config: { maxChildren: 2 },
  })
  candidate.edges = [
    { from: 'orient', to: 'delegation', outcome: 'success' },
    { from: 'delegation', to: 'implement', outcome: 'success' },
    ...candidate.edges.slice(1),
  ]
  const published = publishLoopDefinition(candidate, 'template')
  const inventory = fullInventory()
  const resolution = resolveLoopCapabilities(published, inventory, { stage: 'E1' })
  assert.equal(resolution.ok, false)
  assert.deepEqual(resolution.missing, ['stage:E3:subagent'])
})
