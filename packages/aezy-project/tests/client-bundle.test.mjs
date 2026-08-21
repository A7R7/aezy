import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
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
  const injectedSlots = []
  const registrations = []
  const dispose = () => {}
  plugin.apply({
    sessions: {
      list: {
        getSnapshot: () => ({ byId: { session: { cwd: '/repo' } } }),
      },
    },
    slots: {
      inject(name, mount) {
        injectedSlots.push(name)
        mount()
      },
      register(options, component) {
        registrations.push({ options, component })
        return dispose
      },
    },
  })

  assert.deepEqual(injectedSlots, ['conversation.chat.turnTail', 'conversation.view'])
  const tail = registrations.find(entry => entry.options.name === 'conversation.chat.turnTail')
  assert.equal(tail.options.priority, -10)
  assert.deepEqual(tail.options.select({ turn: { turn: 3, status: 'closed' } }), { turn: 3 })
  assert.equal(tail.options.select({ turn: { turn: 3, status: 'open' } }), null)
  assert.deepEqual(tail.options.inject('session'), { cwd: '/repo', sessionId: 'session' })
  assert.equal(typeof tail.component, 'function')
  const view = registrations.find(entry => entry.options.id === 'changes')
  assert.equal(view.options.label(), 'Changes')
  assert.deepEqual(view.options.inject('session'), { cwd: '/repo', sessionId: 'session' })
  assert.equal(typeof view.component, 'function')
})

test('built Changes view consumes DSH theme aliases without dark-only fallbacks', async () => {
  const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(bundle, /--dsw-alias-bg-base/)
  assert.match(bundle, /--dsw-alias-bg-module-platform/)
  assert.match(bundle, /--dsw-alias-markdown-code-block/)
  assert.match(bundle, /--dsw-alias-label-primary/)
  assert.match(bundle, /Changed files/)
  assert.match(bundle, /data-aezy-turn-files/)
  assert.doesNotMatch(bundle, /--color-bg/)
})
