import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

test('built client bundle registers and mounts the Changes view', async () => {
  let handoff
  globalThis.window = {
    __ModuleLoader__: {
      load(value) { handoff = value },
    },
  }
  try {
    await import(`../lib/client.js?test=${Date.now()}`)
  } finally {
    delete globalThis.window
  }
  assert.equal(handoff?.id, '@aezy/project')
  assert.equal(typeof handoff?.factory, 'function')

  const require = createRequire(new URL('../package.json', import.meta.url))
  const plugin = handoff.factory(specifier => require(specifier))
  let injectedSlot
  let registration
  const dispose = () => {}
  plugin.apply({
    sessions: {
      list: {
        getSnapshot: () => ({ byId: { session: { cwd: '/repo' } } }),
      },
    },
    slots: {
      inject(name, mount) {
        injectedSlot = name
        mount()
      },
      register(options, component) {
        registration = { options, component }
        return dispose
      },
    },
  })

  assert.equal(injectedSlot, 'conversation.view')
  assert.equal(registration.options.id, 'changes')
  assert.equal(registration.options.label(), 'Changes')
  assert.deepEqual(registration.options.inject('session'), { cwd: '/repo', sessionId: 'session' })
  assert.equal(typeof registration.component, 'function')
})
