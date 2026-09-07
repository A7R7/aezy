import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import test from 'node:test'

let client
vm.runInNewContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), {
  Error,
  window: { __ModuleLoader__: { load: entry => { client = entry.factory(() => ({})) } } },
})
const face = value => ({ getSnapshot: () => value, subscribe: () => () => {} })
const catalog = { default: { provider: 'openai-codex', model: 'gpt-6-astra' }, groups: [
  { id: 'openai-codex', name: 'OpenAI', models: [{ id: 'gpt-6-astra', name: 'Astra' }] },
  { id: 'aezy-codex', name: 'Codex', models: [{ id: 'deepseek/test', name: 'DeepSeek' }, { id: 'gpt-test', name: 'GPT' }] },
] }
const create = (remote, preset = 'standard') => new client.ModeModelDirectory(remote, 'test', face(preset), face(null))

test('model directory preserves mode isolation with both GPT and gateway models', async () => {
  for (const preset of ['standard', 'codex-app-server']) {
    const directory = create({ modelCatalog: async () => ({ ok: true, value: catalog }),
      selectModel: async selected => ({ ok: true, value: { selected } }) }, preset)
    await directory.load()
    const state = directory.store.getSnapshot()
    assert.equal(state.groups.length, 1)
    assert.equal(state.groups[0].id, preset === 'standard' ? 'openai-codex' : 'aezy-codex')
    assert.equal(state.status, 'ready')
    directory.dispose()
  }
})

test('network failure is visible, refresh recovers, and failed selection is not stuck busy', async () => {
  let fail = true
  const directory = create({ modelCatalog: async () => {
    if (fail) throw new Error('offline')
    return { ok: true, value: catalog }
  }, selectModel: async () => { throw new Error('selection failed') } })
  await directory.load()
  assert.equal(directory.store.getSnapshot().error, 'offline')
  fail = false
  await directory.load()
  assert.equal(directory.store.getSnapshot().status, 'ready')
  await assert.rejects(directory.select(catalog.default), /selection failed/)
  assert.equal(directory.store.getSnapshot().status, 'error')
  directory.dispose()
})

test('late catalog response cannot update a disposed Session directory', async () => {
  let resolve
  const directory = create({ modelCatalog: () => new Promise(done => { resolve = done }) })
  const pending = directory.load()
  directory.dispose()
  const snapshot = directory.store.getSnapshot()
  resolve({ ok: true, value: catalog })
  await pending
  assert.equal(directory.store.getSnapshot(), snapshot)
})

test('composer consumes public themed controls, not native select or copied DSH UI', async () => {
  const source = await readFile(new URL('../src/client/index.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /<select\b|<option\b/)
  assert.doesNotMatch(source, /⌄/)
  assert.match(source, /<IconChevronDownOutline14/)
  assert.match(source, /<Menu open=/)
  assert.match(source, /portal side="top"/)
  assert.match(source, /Refresh models/)
  assert.match(source, /role="alert"/)
  const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(bundle, /require\("@deepseek-ai\/dsh-client-ui-primitives"\)/)
})
