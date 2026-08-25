import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('built client opens a Session-scoped Terminal in the native side panel', async () => {
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
  const layoutCalls = []
  globalThis.window = {
    innerWidth: 1200,
    addEventListener() {},
    removeEventListener() {},
  }
  try {
    plugin.apply({
      effect(effect) { effect() },
      sessions: {
        list: {
          getSnapshot: () => ({ current: 'session', byId: { session: { cwd: '/repo' } } }),
          subscribe: () => () => {},
        },
      },
      layout: {
        openDetails() { layoutCalls.push('open') },
        closeDetails() { layoutCalls.push('close') },
      },
      slots: {
        inject(name, mount) { injections.push(name); mount() },
        register(options, component) {
          const registration = { options, component, disposed: false }
          registrations.push(registration)
          return () => { registration.disposed = true }
        },
      },
    })
    assert.deepEqual(injections, ['conversation.session.header.actions'])
    assert.equal(registrations[0].options.id, 'aezy-terminal')
    assert.equal(registrations[0].options.order, 40)
    assert.equal(typeof registrations[0].component, 'function')

    registrations[0].options.inject().openTerminal('session')
    assert.deepEqual(layoutCalls, ['open'])
    assert.equal(registrations[1].options.name, 'details')
    assert.equal(registrations[1].options.priority, -20)
    assert.equal(registrations[2].options.name, 'shell.overlay')
    assert.equal(registrations[2].options.id, 'aezy-terminal')
    assert.equal(registrations[2].options.order, 110)
    assert.equal(typeof registrations[1].component, 'function')
    assert.equal(typeof registrations[2].component, 'function')
    registrations[1].options.inject().closePanel()
    assert.equal(registrations[1].disposed, true)
    assert.equal(registrations[2].disposed, true)
    assert.deepEqual(layoutCalls, ['open', 'close'])
  } finally {
    delete globalThis.window
  }
})

test('built client contains bounded multi-tab line terminal interactions and DSH theme aliases', async () => {
  const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(bundle, /data-aezy-terminal-view/)
  assert.match(bundle, /data-aezy-terminal-panel/)
  assert.match(bundle, /data-aezy-open-terminal/)
  assert.match(bundle, /data-aezy-terminal-tab/)
  assert.match(bundle, /data-aezy-terminal-output/)
  assert.match(bundle, /data-aezy-terminal-input/)
  assert.match(bundle, /\/aezy\/api\/terminal\/send/)
  assert.match(bundle, /\/aezy\/api\/terminal\/signal/)
  assert.match(bundle, /\/aezy\/api\/terminal\/close/)
  assert.match(bundle, /--dsw-alias-markdown-code-block/)
  assert.match(bundle, /Line terminal/)
  assert.match(bundle, /Shift\+Enter/)
  assert.match(bundle, /currentCwd/)
  assert.match(bundle, /dsh> /)
  assert.match(bundle, /400/)
  assert.match(bundle, /tabs\.length >= 8/)
  assert.doesNotMatch(bundle, /xterm/)
  assert.doesNotMatch(bundle, /name:\s*["']conversation\.view/)
})
