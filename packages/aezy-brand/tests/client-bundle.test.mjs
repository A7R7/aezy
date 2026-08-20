import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

test('built brand bundle fills all generic DSH brand slots', async () => {
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

  assert.equal(handoff?.id, '@aezy/brand')
  const require = createRequire(new URL('../package.json', import.meta.url))
  const plugin = handoff.factory(specifier => require(specifier))
  const injections = []
  const registrations = []
  const dispose = () => {}
  const slots = {
    inject(name, mount) {
      injections.push(name)
      const result = mount()
      if (result?.[Symbol.iterator]) [...result]
      return dispose
    },
    register(options, component) {
      registrations.push({ options, component })
      return dispose
    },
  }

  plugin.apply({ slots })

  assert.deepEqual(injections, [
    'sidebar.brand.mark',
    'sidebar.brand.name',
    'conversation.hero.brand.mark',
  ])
  assert.deepEqual(registrations.map(entry => entry.options.name), [
    'sidebar.brand.mark',
    'sidebar.brand.name',
    'conversation.hero.brand.mark',
  ])
  const name = registrations[1].component({})
  assert.equal(name.props.children, 'Aezy')
  const mark = registrations[0].component({ size: 24 })
  assert.equal(mark.props.children, 'A')
  assert.equal(mark.props.style.width, 24)
  assert.match(mark.props.style.background, /--dsw-alias-brand-primary/)
})
