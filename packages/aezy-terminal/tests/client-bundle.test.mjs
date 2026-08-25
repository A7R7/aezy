import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('built client contributes one Session-scoped Terminal conversation view', async () => {
  let handoff
  globalThis.window = { __ModuleLoader__: { load(value) { handoff = value } } }
  try {
    await import(`../lib/client.js?test=${Date.now()}`)
  } finally {
    delete globalThis.window
  }
  assert.equal(handoff?.id, '@aezy/terminal')
  assert.equal(typeof handoff?.factory, 'function')

  const require = createRequire(new URL('../package.json', import.meta.url))
  const plugin = handoff.factory(require)
  const injections = []
  const registrations = []
  plugin.apply({
    effect(effect) { effect() },
    sessions: { list: { getSnapshot: () => ({ byId: { session: { cwd: '/repo' } } }) } },
    slots: {
      inject(name, mount) { injections.push(name); mount() },
      register(options, component) { registrations.push({ options, component }); return () => {} },
    },
  })
  assert.deepEqual(injections, ['conversation.view'])
  assert.equal(registrations[0].options.id, 'terminal')
  assert.equal(registrations[0].options.order, 40)
  assert.equal(registrations[0].options.label(), 'Terminal')
  assert.deepEqual(registrations[0].options.inject('session'), { sessionId: 'session', cwd: '/repo' })
  assert.equal(typeof registrations[0].component, 'function')
})

test('built client contains bounded multi-tab line terminal interactions and DSH theme aliases', async () => {
  const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(bundle, /data-aezy-terminal-view/)
  assert.match(bundle, /data-aezy-terminal-tab/)
  assert.match(bundle, /data-aezy-terminal-output/)
  assert.match(bundle, /data-aezy-terminal-input/)
  assert.match(bundle, /\/aezy\/api\/terminal\/send/)
  assert.match(bundle, /\/aezy\/api\/terminal\/signal/)
  assert.match(bundle, /\/aezy\/api\/terminal\/close/)
  assert.match(bundle, /--dsw-alias-markdown-code-block/)
  assert.match(bundle, /Line terminal/)
  assert.match(bundle, /Shift\+Enter/)
  assert.match(bundle, /400/)
  assert.match(bundle, /tabs\.length >= 8/)
  assert.doesNotMatch(bundle, /xterm/)
})
