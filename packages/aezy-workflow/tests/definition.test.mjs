import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LOOP_COMPILER_TARGET,
  LoopDefinitionError,
  loopDefinitionDigest,
  publishLoopDefinition,
  resolveLoopCapabilities,
  validateLoopDefinition,
} from '../src/definition.js'
import {
  CODEX_INSPIRED_CAPABILITIES,
  CODEX_INSPIRED_DEFINITION,
  CODEX_INSPIRED_LOOP,
  CODEX_INSPIRED_PRESET_ID,
} from '../src/system.js'

test('codex-inspired is an immutable exact-revision system definition', () => {
  assert.equal(CODEX_INSPIRED_LOOP.trust, 'system')
  assert.equal(CODEX_INSPIRED_LOOP.body.id, 'codex-inspired')
  assert.equal(CODEX_INSPIRED_LOOP.revision, 1)
  assert.equal(CODEX_INSPIRED_LOOP.digest, 'f7841cbd49ebf7f3ad8e73db76e945eca86c6c7ac6311871bbd9d402f0fb0248')
  assert.equal(loopDefinitionDigest(CODEX_INSPIRED_LOOP.body), CODEX_INSPIRED_LOOP.digest)
  assert.equal(
    CODEX_INSPIRED_PRESET_ID,
    `codex-inspired-r1-${CODEX_INSPIRED_LOOP.digest}`,
  )
  assert.equal(CODEX_INSPIRED_LOOP.body.compiler.target, LOOP_COMPILER_TARGET)
  assert.equal(Object.isFrozen(CODEX_INSPIRED_LOOP.body.nodes), true)
  assert.equal(Object.isFrozen(CODEX_INSPIRED_LOOP.body.budgets), true)
  assert.deepEqual(CODEX_INSPIRED_LOOP.body.nodes.map(node => node.id), [
    'bind-task',
    'investigate',
    'plan',
    'implement',
    'verify',
    'review',
    'completion-check',
    'recovery',
    'checkpoint',
    'finalize',
  ])
  assert.equal(CODEX_INSPIRED_LOOP.body.nodes.some(node => node.id === 'sample'), false)
})

test('schema rejects code, imports, prompt eval and unknown fields', () => {
  for (const injection of [
    { code: 'process.exit()' },
    { package: '@scope/plugin' },
    { script: 'echo unsafe' },
    { promptTemplate: '{{constructor.constructor("return process")()}}' },
  ]) {
    const candidate = structuredClone(CODEX_INSPIRED_DEFINITION)
    Object.assign(candidate.nodes[0], injection)
    const validation = validateLoopDefinition(candidate)
    assert.equal(validation.ok, false)
    assert.ok(validation.errors.some(error => error.code === 'unknown-key'))
  }
})

test('schema requires all four budgets and a bounded node in every cycle', () => {
  const missingBudget = structuredClone(CODEX_INSPIRED_DEFINITION)
  delete missingBudget.budgets.maxTokens
  assert.equal(validateLoopDefinition(missingBudget).ok, false)

  const unbounded = structuredClone(CODEX_INSPIRED_DEFINITION)
  unbounded.nodes = unbounded.nodes.filter(node => node.id !== 'recovery')
  unbounded.edges = [
    { from: 'bind-task', to: 'investigate', outcome: 'bound' },
    { from: 'investigate', to: 'plan', outcome: 'grounded' },
    { from: 'plan', to: 'implement', outcome: 'ready' },
    { from: 'implement', to: 'verify', outcome: 'changed' },
    { from: 'verify', to: 'review', outcome: 'settled' },
    { from: 'review', to: 'completion-check', outcome: 'evidence-ready' },
    { from: 'completion-check', to: 'investigate', outcome: 'incomplete' },
    { from: 'completion-check', to: 'checkpoint', outcome: 'complete' },
    { from: 'checkpoint', to: 'finalize', outcome: 'settled' },
  ]
  const validation = validateLoopDefinition(unbounded)
  assert.equal(validation.ok, false)
  assert.ok(validation.errors.some(error => error.code === 'unbounded-cycle'))
})

test('capability resolution is deterministic and dogfood remains opt-in', () => {
  const disabled = resolveLoopCapabilities(CODEX_INSPIRED_LOOP, CODEX_INSPIRED_CAPABILITIES)
  assert.equal(disabled.ok, true)
  assert.equal(disabled.executable, false)
  assert.equal(disabled.reason, 'dogfood-disabled')

  const enabled = resolveLoopCapabilities(CODEX_INSPIRED_LOOP, CODEX_INSPIRED_CAPABILITIES, { enabled: true })
  assert.equal(enabled.ok, true)
  assert.equal(enabled.executable, true)
  assert.equal(enabled.reason, 'ready')

  const missing = structuredClone(CODEX_INSPIRED_CAPABILITIES)
  missing.capabilities.compaction = false
  const blocked = resolveLoopCapabilities(CODEX_INSPIRED_LOOP, missing, { enabled: true })
  assert.equal(blocked.executable, false)
  assert.deepEqual(blocked.missing, ['compaction'])
})

test('published envelopes detect mutation and invalid definitions throw structured errors', () => {
  const published = publishLoopDefinition(CODEX_INSPIRED_DEFINITION, 'system')
  assert.throws(() => { published.body.name = 'mutated' }, TypeError)
  const invalid = structuredClone(CODEX_INSPIRED_DEFINITION)
  invalid.nodes.push({ id: 'finalize-two', type: 'finalize', label: 'Second finalize' })
  assert.throws(
    () => publishLoopDefinition(invalid, 'system'),
    error => error instanceof LoopDefinitionError && error.code === 'definition-invalid',
  )
})
