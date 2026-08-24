import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('built client bundle registers docked details, narrow Review overlay, Changes, Worktrees, and Turn-tail surfaces', async () => {
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

  assert.deepEqual(injectedSlots, ['details', 'shell.overlay', 'conversation.chat.turnTail', 'conversation.view', 'conversation.view'])
  const details = registrations.find(entry => entry.options.name === 'details')
  assert.equal(details.options.priority, -10)
  assert.equal(details.options.inject().surface, 'details')
  assert.equal(typeof details.component, 'function')
  const panel = registrations.find(entry => entry.options.name === 'shell.overlay')
  assert.equal(panel.options.id, 'aezy-review')
  assert.equal(panel.options.inject().surface, 'overlay')
  assert.equal(typeof panel.component, 'function')
  const tail = registrations.find(entry => entry.options.name === 'conversation.chat.turnTail')
  assert.equal(tail.options.priority, -10)
  assert.deepEqual(tail.options.select({ turn: { turn: 3, status: 'closed' } }), { turn: 3 })
  assert.equal(tail.options.select({ turn: { turn: 3, status: 'open' } }), null)
  assert.equal(tail.options.inject('session').cwd, '/repo')
  assert.equal(tail.options.inject('session').sessionId, 'session')
  assert.equal(typeof tail.options.inject('session').openReview, 'function')
  assert.equal(typeof tail.component, 'function')
  const view = registrations.find(entry => entry.options.id === 'changes')
  assert.equal(view.options.label(), 'Changes')
  assert.equal(view.options.inject('session').cwd, '/repo')
  assert.equal(view.options.inject('session').sessionId, 'session')
  assert.equal(typeof view.options.inject('session').openReview, 'function')
  assert.equal(typeof view.component, 'function')
  const worktrees = registrations.find(entry => entry.options.id === 'worktrees')
  assert.equal(worktrees.options.label(), 'Worktrees')
  assert.deepEqual(worktrees.options.inject('session'), { cwd: '/repo', sessionId: 'session' })
  assert.equal(typeof worktrees.component, 'function')
})

test('built structured Review surface uses DSH aliases and removes the Turn inline review path', async () => {
  const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  const source = await readFile(new URL('../src/client/index.tsx', import.meta.url), 'utf8')
  assert.match(bundle, /--dsw-alias-bg-base/)
  assert.match(bundle, /--dsw-alias-bg-module-platform/)
  assert.match(bundle, /--dsw-alias-markdown-code-block/)
  assert.match(bundle, /--dsw-alias-label-primary/)
  assert.match(bundle, /Edited/)
  assert.match(bundle, /Undo/)
  assert.match(bundle, /Review/)
  assert.match(bundle, /--dsw-alias-state-success-primary/)
  assert.match(bundle, /data-aezy-turn-files/)
  assert.match(bundle, /data-aezy-turn-file/)
  assert.match(bundle, /data-aezy-turn-banner/)
  assert.match(bundle, /aezy-change-surface/)
  assert.match(bundle, /aezy-turn-changes/)
  assert.match(bundle, /aezy-review-file/)
  assert.match(bundle, /data-aezy-file-icon/)
  assert.match(bundle, /Historical · Turn/)
  assert.match(bundle, /Current · Working changes/)
  assert.match(bundle, /--dsw-alias-markdown-code-block-banner/)
  assert.match(bundle, /--dsw-alias-markdown-code-block/)
  assert.match(bundle, /--dsw-font-markdown-code-block/)
  assert.match(bundle, /data-aezy-review-panel/)
  assert.match(bundle, /data-aezy-expanded-file/)
  assert.match(bundle, /data-aezy-review-request/)
  assert.match(bundle, /aria-expanded/)
  assert.match(bundle, /data-surface/)
  assert.match(bundle, /partially observed/)
  assert.match(bundle, /Git working changes are unavailable/)
  assert.match(bundle, /AbortController/)
  assert.match(bundle, /oldLine/)
  assert.doesNotMatch(bundle, /Close review/)
  assert.doesNotMatch(bundle, /Loading Turn diff/)
  assert.match(bundle, /Worktrees & Handoff/)
  assert.match(bundle, /Handoff to Local/)
  assert.doesNotMatch(bundle, /--color-bg/)
  assert.doesNotMatch(source, /className="md-code-block"/)
  assert.doesNotMatch(source, /snapshot \$\{document\.source\.snapshotId/)
  assert.doesNotMatch(source, />\{hunk\.header\}<\/div>/)
  assert.match(source, /expandedPaths: \[\.\.\.new Set/)
  assert.match(source, /this\.#target\.expandedPaths\.includes\(path\)/)
  assert.match(source, /\[\.\.\.this\.#target\.expandedPaths, path\]/)
  assert.match(source, /target\.expandedPaths\.includes\(file\.path\)/)
  assert.match(source, /active\?\.revision !== revision/)
  assert.match(source, /minHeight: 28/)
  assert.match(source, /background: highlighted \? palette\.interactive : 'transparent'/)
})
