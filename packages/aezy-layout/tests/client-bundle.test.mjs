import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('client bundle registers one fail-soft shell overlay policy mount', async () => {
  let handoff
  globalThis.window = { __ModuleLoader__: { load(value) { handoff = value } } }
  try {
    await import(`../lib/client.js?test=${Date.now()}`)
  } finally {
    delete globalThis.window
  }
  assert.equal(handoff?.id, '@aezy/layout')
  const require = createRequire(new URL('../package.json', import.meta.url))
  const plugin = handoff.factory(require)
  const registrations = []
  plugin.apply({
    slots: {
      inject(name, mount) { assert.equal(name, 'shell.overlay'); mount() },
      register(options, component) { registrations.push({ options, component }); return () => {} },
    },
  })
  assert.equal(registrations.length, 1)
  assert.deepEqual(registrations[0].options, {
    name: 'shell.overlay', id: 'aezy-layout-policy', order: -100,
  })
})

test('policy widens only the existing details drag and owns no layout or Session service', async () => {
  const source = await readFile(new URL('../src/client/index.tsx', import.meta.url), 'utf8')
  const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  for (const marker of [
    'data-aezy-layout-policy-mount', 'proportional-details-v1',
    'data-side', 'data-details-collapsed', 'data-shell-overlay',
  ]) assert.match(bundle, new RegExp(marker))
  assert.match(source, /CHAT_MIN_RATIO/)
  assert.match(source, /DETAILS_MAX_RATIO/)
  assert.match(source, /stopImmediatePropagation/)
  assert.doesNotMatch(source, /ctx\.layout\s*=|reflect\.provide|sessions\.|localStorage|indexedDB|fetch\(/)
})
