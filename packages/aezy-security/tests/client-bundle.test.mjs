import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('built browser bundle registers and mounts the Security conversation view', async () => {
  let handoff
  globalThis.window = { __ModuleLoader__: { load(value) { handoff = value } } }
  try {
    await import(`../lib/client.js?test=${Date.now()}`)
  } finally {
    delete globalThis.window
  }
  assert.equal(handoff?.id, '@aezy/security')
  const require = createRequire(new URL('../package.json', import.meta.url))
  const plugin = handoff.factory(specifier => require(specifier))
  let injectedSlot
  let registration
  plugin.apply({
    sessions: { list: { getSnapshot: () => ({ byId: { session: { cwd: '/repo' } } }) } },
    slots: {
      inject(name, mount) { injectedSlot = name; mount() },
      register(options, component) { registration = { options, component }; return () => {} },
    },
  })
  assert.equal(injectedSlot, 'conversation.view')
  assert.equal(registration.options.id, 'security')
  assert.equal(registration.options.label(), 'Security')
  assert.deepEqual(registration.options.inject('session'), { cwd: '/repo' })
  assert.equal(typeof registration.component, 'function')
})

test('built Security view consumes DSH light/dark theme aliases', async () => {
  const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(bundle, /--dsw-alias-bg-base/u)
  assert.match(bundle, /--dsw-alias-bg-module-platform/u)
  assert.match(bundle, /--dsw-alias-label-primary/u)
  assert.match(bundle, /--dsw-alias-border-l2/u)
  assert.doesNotMatch(bundle, /--color-bg/u)
})
