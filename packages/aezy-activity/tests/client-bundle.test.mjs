import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('built client mounts a dynamic Activity details/overlay panel', async () => {
  let handoff
  globalThis.window = { __ModuleLoader__: { load(value) { handoff = value } } }
  try {
    await import(`../lib/client.js?test=${Date.now()}`)
  } finally {
    delete globalThis.window
  }
  assert.equal(handoff?.id, '@aezy/activity')
  assert.equal(typeof handoff?.factory, 'function')

  const require = createRequire(new URL('../package.json', import.meta.url))
  const plugin = handoff.factory(require)
  const registrations = []
  const layoutCalls = []
  const opened = []
  const list = {
    getSnapshot: () => ({
      ids: ['session'],
      byId: { session: { id: 'session', displayTitle: 'Session', running: false, blank: false, updatedAt: 1 } },
      current: 'session',
      phase: 'ready',
      jobsBySession: {},
      subagentsByParent: {},
    }),
    subscribe: () => () => {},
  }
  globalThis.window = { innerWidth: 1200, addEventListener() {}, removeEventListener() {} }
  try {
    plugin.apply({
      effect(effect) { effect() },
      sessions: {
        list,
        open(id) { opened.push(id) },
        refreshSubagents: async () => {},
      },
      layout: {
        openDetails() { layoutCalls.push('open') },
        closeDetails() { layoutCalls.push('close') },
      },
      slots: {
        inject(_name, mount) { return mount() },
        register(options, component) {
          const registration = { options, component, disposed: false }
          registrations.push(registration)
          return () => { registration.disposed = true }
        },
      },
    })
    assert.equal(registrations[0].options.id, 'aezy-activity')
    assert.equal(registrations[0].options.order, 30)
    registrations[0].options.inject().openActivity('session')
    assert.deepEqual(layoutCalls, ['open'])
    assert.equal(registrations[1].options.name, 'details')
    assert.equal(registrations[1].options.priority, -30)
    assert.equal(registrations[2].options.name, 'shell.overlay')
    assert.equal(registrations[2].options.id, 'aezy-activity')
    assert.equal(registrations[2].options.order, 120)
    registrations[1].options.inject().openSession('session')
    assert.deepEqual(opened, ['session'])
    assert.deepEqual(layoutCalls, ['open', 'close'])
    assert.equal(registrations[1].disposed, true)
    assert.equal(registrations[2].disposed, true)
  } finally {
    delete globalThis.window
  }
})

test('built client only projects bounded DSH facts and the fenced Terminal list', async () => {
  const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(bundle, /data-aezy-activity-dashboard/)
  assert.match(bundle, /data-aezy-activity-panel/)
  assert.match(bundle, /data-aezy-open-activity/)
  assert.match(bundle, /pendingInteraction/)
  assert.match(bundle, /completed/)
  assert.match(bundle, /jobsBySession/)
  assert.match(bundle, /subagentsByParent/)
  assert.match(bundle, /tokenUsage/)
  assert.match(bundle, /contextPressure/)
  assert.match(bundle, /sessionStats/)
  assert.match(bundle, /\/aezy\/api\/terminal\?/)
  assert.match(bundle, /x-aezy-client/)
  assert.match(bundle, /\.slice\(0, LIMITS\.sessions\)/)
  assert.match(bundle, /\.slice\(0, LIMITS\.notifications\)/)
  assert.doesNotMatch(bundle, /localStorage|indexedDB|Notification\.requestPermission/)
  assert.doesNotMatch(bundle, /session\/event|assistant\/message|turn\/start/)
  assert.doesNotMatch(bundle, /\/aezy\/api\/terminal\/(open|send|signal|close)/)
})
