import assert from 'node:assert/strict'
import { mkdtemp, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { WorkflowDefinitionStore } from '../src/editor.js'

function draft(id = 'team-loop') {
  return {
    id,
    name: 'Team loop',
    description: 'A bounded copy of the system coding workflow.',
    budgets: { maxIterations: 12, maxWallTimeMs: 900_000, maxTokens: 80_000, maxToolCalls: 64 },
  }
}

test('E2 preview only parameterizes a built-in graph and remains unavailable', async () => {
  const root = await mkdtemp('/tmp/aezy-workflow-preview-')
  const store = new WorkflowDefinitionStore(join(root, 'definitions.json'))
  const preview = store.preview({ templateId: 'codex-inspired', draft: draft() })
  assert.equal(preview.published.body.id, 'team-loop')
  assert.equal(preview.published.revision, 1)
  assert.equal(preview.published.trust, 'template')
  assert.deepEqual(preview.published.body.nodes.map(node => node.id), ['orient', 'implement', 'verify', 'checkpoint', 'finalize'])
  assert.equal(preview.resolution.executable, false)
  assert.deepEqual(preview.resolution.missing, ['durable-definition-binding'])
  assert.equal(preview.expectedRevision, 0)
})

test('publishing appends immutable revisions and reload verifies every digest', async () => {
  const root = await mkdtemp('/tmp/aezy-workflow-store-')
  const file = join(root, 'definitions.json')
  const store = new WorkflowDefinitionStore(file)
  const first = await store.publish({ templateId: 'codex-inspired', draft: draft(), expectedRevision: 0 })
  const changed = draft(); changed.budgets.maxToolCalls = 72
  const second = await store.publish({ templateId: 'codex-inspired', draft: changed, expectedRevision: 1 })
  assert.equal(first.revision.revision, 1)
  assert.equal(second.revision.revision, 2)
  assert.notEqual(first.revision.digest, second.revision.digest)
  assert.equal(first.revision.body.budgets.maxToolCalls, 64)
  const reloaded = new WorkflowDefinitionStore(file).snapshot()
  assert.deepEqual(reloaded.revisions.map(item => item.revision), [1, 2])
  assert.equal(reloaded.executionAvailable, false)
  assert.equal((await stat(file)).mode & 0o777, 0o600)
})

test('stale publishing and attempts to edit graph, backend, or system id fail closed', async () => {
  const root = await mkdtemp('/tmp/aezy-workflow-race-')
  const store = new WorkflowDefinitionStore(join(root, 'definitions.json'))
  await store.publish({ templateId: 'codex-inspired', draft: draft(), expectedRevision: 0 })
  await assert.rejects(
    store.publish({ templateId: 'codex-inspired', draft: draft(), expectedRevision: 0 }),
    /revision changed/,
  )
  assert.throws(() => store.preview({ templateId: 'codex-inspired', draft: { ...draft(), nodes: [] } }), /not editable/)
  assert.throws(() => store.preview({ templateId: 'codex-inspired', draft: { ...draft(), backend: { id: 'other' } } }), /not editable/)
  assert.throws(() => store.preview({ templateId: 'codex-inspired', draft: draft('codex-inspired') }), /reserved/)
})

test('built client is a Settings template editor with no execution or arbitrary definition path', async () => {
  const source = await readFile(new URL('../src/client/index.tsx', import.meta.url), 'utf8')
  const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(source, /id: 'aezy-workflow'/)
  assert.match(source, /label: 'Workflows'/)
  assert.match(source, /Publish immutable revision/)
  assert.match(source, /Execution unavailable/)
  assert.match(source, /\/preview/)
  assert.match(source, /\/publish/)
  assert.doesNotMatch(source, /session\/prompt|workflowEngine|new Function|eval\(|import definition|Run workflow/i)
  assert.match(bundle, /data-aezy-workflow-editor/)
})
