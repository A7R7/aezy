import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import test from 'node:test'

let client
vm.runInNewContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), {
  Error,
  window: { __ModuleLoader__: { load: entry => { client = entry.factory(() => ({})) } } },
})
const face = value => {
  const listeners = new Set()
  return { getSnapshot: () => value, subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    set: next => { value = next; for (const listener of listeners) listener() } }
}
const catalog = { default: { provider: 'openai-codex', model: 'gpt-6-astra' }, groups: [
  { id: 'openai-codex', name: 'OpenAI', models: [{ id: 'gpt-6-astra', name: 'Astra' }] },
  { id: 'deepseek-official', name: 'DeepSeek', models: [{ id: 'deepseek-v4-flash', name: 'DeepSeek Flash' }] },
  { id: 'aezy-codex', name: 'Codex', models: [{ id: 'deepseek/deepseek-v4-flash', name: 'Flash · gateway' }, { id: 'gpt-6-astra', name: 'GPT-6-Astra' }] },
] }
const create = (remote, preset = 'standard') => new client.ModeModelDirectory(remote, 'test', face(preset), face(null))

test('identical model identities remain visible in both engines with compatible routes', async () => {
  for (const preset of ['standard', 'codex-app-server']) {
    const directory = create({ modelCatalog: async () => ({ ok: true, value: catalog }),
      selectModel: async selected => ({ ok: true, value: { selected } }) }, preset)
    await directory.load()
    const state = directory.store.getSnapshot()
    assert.equal(state.groups.length, 2)
    assert.equal(state.groups[0].models[0].id, 'openai/gpt-6-astra')
    assert.equal(state.groups[0].models[0].route.provider, preset === 'standard' ? 'openai-codex' : 'aezy-codex')
    assert.equal(state.current.model, 'gpt-6-astra')
    assert.equal(state.status, 'ready')
    directory.dispose()
  }
})

const flush = () => new Promise(resolve => setImmediate(resolve))
test('preset changes preserve DeepSeek identity and persist only the matching route', async () => {
  const preset = face('standard')
  const selection = face({ next: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } })
  const writes = []
  const directory = new client.ModeModelDirectory({ modelCatalog: async () => ({ ok: true, value: catalog }),
    selectModel: async ({ sessionId, ...selected }) => { writes.push(selected); selection.set({ next: selected }); return { ok: true, value: { selected } } },
  }, 'test', preset, selection)
  await directory.load()
  for (const id of ['ptc', 'minimal', 'cordis']) { preset.set(id); await flush() }
  assert.equal(writes.length, 0)
  preset.set('codex-app-server'); await flush()
  assert.equal(writes.length, 1)
  assert.equal(writes[0].model, 'deepseek/deepseek-v4-flash')
  preset.set('standard'); await flush()
  assert.equal(writes.length, 2)
  assert.equal(writes[1].provider, 'deepseek-official')
  assert.equal(writes[1].model, 'deepseek-v4-flash')
  directory.dispose()
})

test('unavailable selected model stays visible without silently replacing it', async () => {
  const preset = face('standard')
  const selection = face({ next: { provider: 'custom', model: 'private-model' } })
  let writes = 0
  const directory = new client.ModeModelDirectory({ modelCatalog: async () => ({ ok: true, value: catalog }),
    selectModel: async () => { writes++; throw new Error('must not choose another model') },
  }, 'test', preset, selection)
  await directory.load()
  preset.set('codex-app-server'); await flush()
  assert.equal(directory.store.getSnapshot().current.model, 'private-model')
  const rows = directory.store.getSnapshot().groups.flatMap(group => group.models)
  assert.equal(rows.find(row => row.id === 'provider:custom/private-model').route, null)
  assert.match(directory.store.getSnapshot().error, /No Codex App Server channel/)
  assert.equal(writes, 0)
  directory.dispose()
})

test('a preset switch during a slow model write reconciles to the latest engine', async () => {
  const preset = face('standard'), selection = face({ next: catalog.default })
  let release
  const writes = []
  const directory = new client.ModeModelDirectory({ modelCatalog: async () => ({ ok: true, value: catalog }),
    selectModel: async ({ sessionId, ...selected }) => {
      writes.push(selected)
      if (writes.length === 1) await new Promise(resolve => { release = resolve })
      selection.set({ next: selected })
      return { ok: true, value: { selected } }
    },
  }, 'test', preset, selection)
  await directory.load()
  const pending = directory.select({ provider: 'deepseek-official', model: 'deepseek-v4-flash' })
  preset.set('codex-app-server')
  release(); await pending; await flush()
  assert.equal(writes.length, 2)
  assert.equal(directory.store.getSnapshot().current.provider, 'aezy-codex')
  assert.equal(directory.store.getSnapshot().current.model, 'deepseek/deepseek-v4-flash')
  directory.dispose()
})

test('stale catalog response cannot overwrite a newer refresh', async () => {
  let resolve, calls = 0
  const directory = create({ modelCatalog: () => ++calls === 1 ? new Promise(done => { resolve = done }) : Promise.resolve({ ok: true, value: catalog }) })
  const old = directory.load()
  await directory.load()
  resolve({ ok: true, value: { default: catalog.default, groups: [] } }); await old
  assert.equal(directory.store.getSnapshot().groups[0].models[0].route.provider, 'openai-codex')
  directory.dispose()
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

test('grouped run-method view reuses and releases the live upstream seat business face', () => {
  const face = { hooks: { agentPresetSeat: {} }, load: () => {}, select: () => {}, introduced: () => {} }
  const upstream = { locale: 'settings.agentPreset', options: {}, inject: () => face }
  let entries = [upstream], changed, cleanup, registered, removals = 0
  client.installRunMethodMenu({ slots: {
    inject: (_slot, callback) => { cleanup = callback() },
    entries: () => entries,
    subscribe: (_slot, callback) => { changed = callback; return () => { changed = null } },
    register: (options, component) => {
      registered = { options, component }
      return () => { removals++ }
    },
  } })
  assert.equal(registered.options.priority, -10)
  assert.equal(registered.options.inject(), face)
  entries = []; changed()
  assert.equal(removals, 1)
  entries = [upstream]; changed()
  assert.equal(registered.options.inject(), face)
  cleanup()
  assert.equal(removals, 2)
  assert.equal(changed, null)
})
