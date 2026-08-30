import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

function source(entries, hasMore = false) {
  let snapshot = { entries, hasMore, revision: 1 }
  const listeners = new Set()
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
    replace(next) { snapshot = { entries: next, hasMore: false, revision: snapshot.revision + 1 }; for (const listener of listeners) listener() },
  }
}

test('built client binds the public Session eventSource to a dynamic read-only inspector panel', async () => {
  let handoff
  globalThis.window = { __ModuleLoader__: { load(value) { handoff = value } } }
  try {
    await import(`../lib/client.js?test=${Date.now()}`)
  } finally {
    delete globalThis.window
  }
  assert.equal(handoff?.id, '@aezy/inspector')
  const require = createRequire(new URL('../package.json', import.meta.url))
  const plugin = handoff.factory(require)
  const eventRows = [
    { type: 'event', event: { type: 'turn/start', seq: 0, time: 1, data: { turn: 1 } } },
  ]
  const events = source(eventRows, true)
  const sessionSnapshot = source([])
  sessionSnapshot.getSnapshot = () => ({ running: true, hasMore: false })
  let olderCalls = 0
  const list = source([])
  list.getSnapshot = () => ({ current: 'session', byId: { session: { cwd: '/repo', projectionValues: { agentPreset: 'standard' } } } })
  const registrations = []
  const layout = []
  globalThis.window = { innerWidth: 1200, addEventListener() {}, removeEventListener() {} }
  try {
    plugin.apply({
      effect(effect) { effect() },
      sessions: {
        list,
        binding(id) {
          assert.equal(id, 'session')
          return { eventSource: events, session: { ...sessionSnapshot, async loadOlder() { olderCalls += 1; events.replace(eventRows) } } }
        },
        scope() { return { effect() {} } },
      },
      layout: { openDetails() { layout.push('open') }, closeDetails() { layout.push('close') } },
      slots: {
        inject(name, mount) { assert.equal(name, 'conversation.session.header.actions'); mount() },
        register(options, component) {
          const row = { options, component, disposed: false }
          registrations.push(row)
          return () => { row.disposed = true }
        },
      },
    })
    assert.equal(registrations[0].options.id, 'aezy-loop-inspector')
    assert.equal(registrations[0].options.order, 30)
    const injected = registrations[0].options.inject('session')
    assert.equal(injected.hooks.loopTrace.getSnapshot().backend, 'dsh-native')
    assert.equal(injected.hooks.loopTrace.getSnapshot().activeSpanIds.length, 2)
    assert.equal(injected.hooks.loopTrace.getSnapshot().activeSpanIds.includes('turn:1'), true)
    assert.equal(injected.hooks.loopTrace.getSnapshot().activeSpanIds.some(id => id.startsWith('session:')), true)
    assert.equal(injected.hooks.loopTrace.getSnapshot().currentSpanId, 'turn:1')
    injected.openInspector('session')
    await injected.hooks.loopTrace.ensureComplete()
    assert.equal(registrations[1].options.name, 'details')
    assert.equal(registrations[1].options.priority, -30)
    assert.equal(registrations[2].options.name, 'shell.overlay')
    assert.equal(registrations[2].options.id, 'aezy-loop-inspector')
    assert.equal(registrations[2].options.order, 120)
    assert.deepEqual(layout, ['open'])
    assert.equal(olderCalls, 1)
    assert.equal(injected.hooks.loopTrace.getSnapshot().completeness, 'complete')
    registrations[1].options.inject().closePanel()
    assert.equal(registrations[1].disposed, true)
    assert.equal(registrations[2].disposed, true)
    assert.deepEqual(layout, ['open', 'close'])
  } finally {
    delete globalThis.window
  }
})

test('built inspector exposes a static backend logic graph plus evidence timeline and no Agent control path', async () => {
  const sourceText = await readFile(new URL('../src/client/index.tsx', import.meta.url), 'utf8')
  const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  for (const marker of [
    'data-aezy-loop-inspector', 'data-aezy-loop-inspector-panel',
    'data-aezy-loop-timeline', 'data-aezy-loop-logic-graph',
    'data-aezy-loop-blueprint-lane', 'data-aezy-loop-blueprint-node', 'data-aezy-loop-blueprint-edge',
  ]) assert.match(bundle, new RegExp(marker))
  assert.match(bundle, /Backend Logic/)
  assert.match(bundle, /Static blueprint/)
  assert.match(bundle, /nodes/)
  assert.match(bundle, /edges/)
  assert.match(bundle, /80%/)
  assert.match(bundle, /OPAQUE/)
  assert.doesNotMatch(sourceText, /function GraphNode/)
  assert.match(sourceText, /binding\.eventSource/)
  assert.match(sourceText, /session\.loadOlder\(\)/)
  assert.match(sourceText, /name: 'details', priority: -30/)
  assert.match(sourceText, /name: 'shell\.overlay'/)
  assert.doesNotMatch(sourceText, /\.prompt\(|\.cancel\(|\.command\(|turn\/start|tool\/call/)
  assert.doesNotMatch(sourceText, /fetch\(|XMLHttpRequest|WebSocket|localStorage|indexedDB/)
})
