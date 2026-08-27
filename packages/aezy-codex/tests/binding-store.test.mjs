import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { mkdtemp } from 'node:fs/promises'
import { CodexBindingStore } from '../src/binding-store.js'

test('binding store persists only the minimal Session to Thread mapping', async () => {
  const root = await mkdtemp(join('/tmp', 'aezy-codex-bindings-'))
  const file = join(root, 'nested', 'codex-bindings.json')
  const store = new CodexBindingStore(file)
  await store.set('session-1', { threadId: 'thread-1', cwd: '/workspace', model: 'gpt-5.6-sol' })
  assert.deepEqual(store.get('session-1'), {
    threadId: 'thread-1', cwd: '/workspace', model: 'gpt-5.6-sol',
  })
  const persisted = JSON.parse(await readFile(file, 'utf8'))
  assert.deepEqual(persisted, {
    version: 1,
    bindings: { 'session-1': { threadId: 'thread-1', cwd: '/workspace', model: 'gpt-5.6-sol' } },
  })
  assert.equal(JSON.stringify(persisted).match(/token|message|history/iu), null)
})

test('binding store fails closed on malformed durable state', async () => {
  const root = await mkdtemp(join('/tmp', 'aezy-codex-bindings-bad-'))
  const file = join(root, 'codex-bindings.json')
  await mkdir(root, { recursive: true })
  await writeFile(file, '{"version":1,"bindings":{"s":{"cwd":"/workspace"}}}')
  assert.throws(() => new CodexBindingStore(file), /has no threadId/u)
})

test('binding store rejects malformed persisted Session ids', async (t) => {
  const malformedSessionIds = [
    ['', 'empty'],
    ['s'.repeat(257), 'longer than 256 characters'],
    ['session\0id', 'containing NUL'],
  ]

  for (const [sessionId, description] of malformedSessionIds) {
    await t.test(description, async () => {
      const root = await mkdtemp(join('/tmp', 'aezy-codex-bindings-bad-session-'))
      const file = join(root, 'codex-bindings.json')
      await writeFile(file, JSON.stringify({
        version: 1,
        bindings: { [sessionId]: { threadId: 'thread-1', cwd: '/workspace' } },
      }))
      assert.throws(() => new CodexBindingStore(file), /DSH sessionId is invalid/u)
    })
  }
})
