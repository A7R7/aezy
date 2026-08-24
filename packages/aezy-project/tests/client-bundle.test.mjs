import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('built client bundle registers one docked Project panel, narrow overlay, Changes, Worktrees, and Turn-tail surfaces', async () => {
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
  const plugin = handoff.factory(specifier => specifier === '@deepseek-ai/dsh-client-ui-primitives'
    ? { MarkdownText: () => null, ReadBlock: () => null }
    : require(specifier))
  const injectedSlots = []
  const registrations = []
  let referenceSource
  const dispose = () => {}
  plugin.apply({
    get(name) {
      assert.equal(name, 'inputTriggers')
      return { registerSource(source) { referenceSource = source; return dispose } }
    },
    effect(effect) { effect() },
    remote: { fileReferences: { list: async () => ({ ok: true, value: [] }) } },
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

  assert.deepEqual(injectedSlots, ['conversation.session.header.actions', 'details', 'shell.overlay', 'conversation.chat.turnTail', 'conversation.view', 'conversation.view'])
  assert.equal(referenceSource.name, 'aezy-project-context')
  assert.equal(referenceSource.trigger, '@')
  const directoryCandidates = await referenceSource.candidates(
    { sessionId: 'session' },
    { query: 'directory:', quoted: false, position: 'inline', signal: new AbortController().signal },
  )
  assert.equal(directoryCandidates[0].name, 'Directory context · .')
  const directoryPick = referenceSource.onPick({ candidate: directoryCandidates[0] })
  assert.equal(directoryPick.insert.source, 'aezy-project-context')
  assert.equal(directoryPick.insert.appearance, 'folder')
  assert.match(directoryPick.insert.ref, /aezy-directory:/)
  const diffCandidates = await referenceSource.candidates(
    { sessionId: 'session' },
    { query: 'diff', quoted: false, position: 'inline', signal: new AbortController().signal },
  )
  assert.equal(diffCandidates[0].name, 'Diff context · Working changes')
  const bridge = registrations.find(entry => entry.options.id === 'aezy-project-composer-bridge')
  assert.equal(typeof bridge.component, 'function')
  const details = registrations.find(entry => entry.options.name === 'details')
  assert.equal(details.options.priority, -10)
  assert.equal(details.options.inject().surface, 'details')
  assert.equal(typeof details.component, 'function')
  const panel = registrations.find(entry => entry.options.name === 'shell.overlay')
  assert.equal(panel.options.id, 'aezy-project')
  assert.equal(panel.options.inject().surface, 'overlay')
  assert.equal(typeof panel.component, 'function')
  const tail = registrations.find(entry => entry.options.name === 'conversation.chat.turnTail')
  assert.equal(tail.options.priority, -10)
  assert.deepEqual(tail.options.select({ turn: { turn: 3, status: 'closed' } }), { turn: 3 })
  assert.equal(tail.options.select({ turn: { turn: 3, status: 'open' } }), null)
  assert.equal(tail.options.inject('session').cwd, '/repo')
  assert.equal(tail.options.inject('session').sessionId, 'session')
  assert.equal(typeof tail.options.inject('session').openReview, 'function')
  assert.equal(typeof tail.options.inject('session').openFiles, 'function')
  assert.equal(typeof tail.component, 'function')
  const view = registrations.find(entry => entry.options.id === 'changes')
  assert.equal(view.options.label(), 'Changes')
  assert.equal(view.options.inject('session').cwd, '/repo')
  assert.equal(view.options.inject('session').sessionId, 'session')
  assert.equal(typeof view.options.inject('session').openReview, 'function')
  assert.equal(typeof view.options.inject('session').openFiles, 'function')
  assert.equal(typeof view.component, 'function')
  const worktrees = registrations.find(entry => entry.options.id === 'worktrees')
  assert.equal(worktrees.options.label(), 'Worktrees')
  assert.equal(worktrees.options.inject('session').cwd, '/repo')
  assert.equal(worktrees.options.inject('session').sessionId, 'session')
  assert.equal(typeof worktrees.options.inject('session').openFiles, 'function')
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
  assert.match(bundle, /data-aezy-project-panel/)
  assert.match(bundle, /data-aezy-files-panel/)
  assert.match(bundle, /data-aezy-file-preview/)
  assert.match(bundle, /data-aezy-markdown-preview/)
  assert.match(bundle, /Files & preview/)
  assert.match(bundle, /Browse files/)
  assert.match(bundle, /Workspace file tree/)
  assert.match(bundle, /Open file preview/)
  assert.match(bundle, /\/aezy\/api\/project\/tree/)
  assert.match(bundle, /\/aezy\/api\/project\/preview/)
  assert.match(bundle, /Directory response identity does not match the requested path/)
  assert.match(bundle, /1500/)
  assert.match(bundle, /aezy-project-context/)
  assert.match(bundle, /@directory:/)
  assert.match(bundle, /Diff context · Working changes/)
  assert.match(bundle, /Ask about workspace/)
  assert.match(bundle, /Ask about diff/)
  assert.match(bundle, /conversation\.session\.header\.actions/)
  assert.match(bundle, /@deepseek-ai\/dsh-client-ui-primitives/)
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
  assert.match(source, /review\.expandedPaths\.includes\(path\)/)
  assert.match(source, /\[\.\.\.review\.expandedPaths, path\]/)
  assert.match(source, /review\.expandedPaths\.includes\(file\.path\)/)
  assert.match(source, /active\?\.revision !== revision/)
  assert.match(source, /active\.files\.revision !== revision/)
  assert.match(source, /controller\.abort\(\)/)
  assert.match(source, /minHeight: 28/)
  assert.match(source, /background: highlighted \? palette\.interactive : 'transparent'/)
})
