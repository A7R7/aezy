import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import {
  describeProject, parseWorktreeList, TurnLedger, WorktreeManager,
} from '../src/index.js'

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

async function fixture() {
  const root = await mkdtemp('/tmp/aezy-worktree-')
  git(root, 'init', '--quiet')
  git(root, 'config', 'user.name', 'Aezy M3 Test')
  git(root, 'config', 'user.email', 'aezy@example.invalid')
  await writeFile(join(root, 'tracked.txt'), 'base\n')
  git(root, 'add', 'tracked.txt')
  git(root, 'commit', '--quiet', '-m', 'base')
  return root
}

test('worktree porcelain parser preserves explicit identity records', () => {
  const parsed = parseWorktreeList([
    'worktree /repo',
    `HEAD ${'a'.repeat(40)}`,
    'branch refs/heads/main',
    '',
    'worktree /repo worktrees/task',
    `HEAD ${'b'.repeat(40)}`,
    'branch refs/heads/aezy/task',
    'locked maintenance',
    '',
  ].join('\0'))
  assert.deepEqual(parsed, [
    { path: '/repo', head: 'a'.repeat(40), branch: 'main' },
    { path: '/repo worktrees/task', head: 'b'.repeat(40), branch: 'aezy/task', locked: 'maintenance' },
  ])
})

test('managed worktree binds a Session, emits handoff, rejects unsafe cleanup, and retains its branch', async () => {
  const root = await fixture()
  try {
    const manager = new WorktreeManager()
    const base = git(root, 'rev-parse', 'HEAD')
    const created = await manager.create({ cwd: root, name: 'm3-slice', base })
    const worktree = created.worktree
    assert.equal(worktree.branch, 'aezy/m3-slice')
    assert.equal(worktree.base, base)
    assert.equal(worktree.state, 'active')
    assert.equal((await describeProject(worktree.path)).environment.kind, 'worktree')

    await manager.bind({ cwd: worktree.path, worktreeId: worktree.id, sessionId: 'm3-session' })
    const firstHandoff = await manager.handoff({
      cwd: worktree.path,
      sessionId: 'm3-session',
      instructions: 'Continue from the isolated M3 worktree.',
      validations: [{ command: 'pnpm test', status: 'skipped', summary: 'Not run yet.' }],
    })
    assert.equal(firstHandoff.handoff.git.clean, true)
    await assert.rejects(
      () => manager.cleanup({ cwd: root, worktreeId: worktree.id }),
      /active Sessions/u,
    )

    await manager.release({ cwd: worktree.path, worktreeId: worktree.id, sessionId: 'm3-session' })
    await writeFile(join(worktree.path, 'tracked.txt'), 'changed\n')
    await assert.rejects(
      () => manager.cleanup({ cwd: root, worktreeId: worktree.id }),
      /uncommitted changes/u,
    )

    git(worktree.path, 'add', 'tracked.txt')
    git(worktree.path, 'commit', '--quiet', '-m', 'isolated change')
    const finalHead = git(worktree.path, 'rev-parse', 'HEAD')
    await manager.bind({ cwd: worktree.path, worktreeId: worktree.id, sessionId: 'm3-session-2' })
    const finalHandoff = await manager.handoff({
      cwd: worktree.path,
      sessionId: 'm3-session-2',
      instructions: 'Review the retained branch and continue from the recorded head.',
      validations: [{ command: 'node --test', status: 'passed', summary: 'M3 fixture passed.' }],
    })
    assert.equal(finalHandoff.handoff.git.clean, true)
    assert.equal(finalHandoff.handoff.git.head, finalHead)
    assert.equal(finalHandoff.handoff.git.commitsAheadOfBase, 1)
    assert.equal((await manager.readHandoff(root, finalHandoff.handoff.id)).instructions, finalHandoff.handoff.instructions)

    await manager.release({ cwd: worktree.path, worktreeId: worktree.id, sessionId: 'm3-session-2' })
    const cleaned = await manager.cleanup({ cwd: root, worktreeId: worktree.id })
    assert.equal(cleaned.branchRetained, 'aezy/m3-slice')
    await assert.rejects(() => access(worktree.path), /ENOENT/u)
    assert.equal(git(root, 'show-ref', '--verify', 'refs/heads/aezy/m3-slice').split(/\s+/u)[0], finalHead)
    assert.equal((await manager.list(root)).worktrees[0].state, 'cleaned')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('dirty Local creation is fail-closed until explicitly confirmed', async () => {
  const root = await fixture()
  try {
    const manager = new WorktreeManager()
    const base = git(root, 'rev-parse', 'HEAD')
    await writeFile(join(root, 'user-untracked.txt'), 'preserve me\n')
    await assert.rejects(
      () => manager.create({ cwd: root, name: 'dirty-source', base }),
      /explicit confirmation/u,
    )
    const created = await manager.create({ cwd: root, name: 'dirty-source', base, confirmDirty: true })
    assert.equal(created.worktree.sourceDirty, true)
    assert.equal(await readFile(join(root, 'user-untracked.txt'), 'utf8'), 'preserve me\n')
    await assert.rejects(() => access(join(created.worktree.path, 'user-untracked.txt')), /ENOENT/u)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('overlapping Turns in separate managed worktrees keep independent ledgers', async () => {
  const root = await fixture()
  const paths = []
  let managedRoot
  try {
    const manager = new WorktreeManager()
    const base = git(root, 'rev-parse', 'HEAD')
    const first = (await manager.create({ cwd: root, name: 'parallel-a', base })).worktree
    const second = (await manager.create({ cwd: root, name: 'parallel-b', base })).worktree
    paths.push(first.path, second.path)
    managedRoot = (await manager.list(root)).managedRoot

    const ledger = new TurnLedger()
    const firstSession = { id: 'parallel-session-a', header: { id: 'parallel-session-a', cwd: first.path } }
    const secondSession = { id: 'parallel-session-b', header: { id: 'parallel-session-b', cwd: second.path } }
    ledger.observe(firstSession, { type: 'turn/start', time: 100, data: { turn: 1 } })
    ledger.observe(secondSession, { type: 'turn/start', time: 101, data: { turn: 1 } })
    await Promise.all([ledger.settle(firstSession.id), ledger.settle(secondSession.id)])
    await Promise.all([
      writeFile(join(first.path, 'parallel.txt'), 'first\n'),
      writeFile(join(second.path, 'parallel.txt'), 'second\n'),
    ])
    ledger.observe(firstSession, { type: 'turn/end', time: 200, data: { turn: 1, reason: { kind: 'completed' } } })
    ledger.observe(secondSession, { type: 'turn/end', time: 201, data: { turn: 1, reason: { kind: 'completed' } } })
    const [firstView, secondView] = await Promise.all([
      ledger.view(first.path, firstSession.id),
      ledger.view(second.path, secondSession.id),
    ])
    assert.equal(firstView.turns[0].concurrent, false)
    assert.equal(secondView.turns[0].concurrent, false)
    assert.deepEqual(firstView.turns[0].files.map(file => file.path), ['parallel.txt'])
    assert.deepEqual(secondView.turns[0].files.map(file => file.path), ['parallel.txt'])
    assert.equal((await ledger.view(second.path, firstSession.id)).turns.length, 0)
  } finally {
    for (const path of paths) {
      try {
        git(root, 'worktree', 'remove', '--force', '--', path)
      } catch {}
    }
    if (managedRoot !== undefined) await rm(managedRoot, { recursive: true, force: true })
    await rm(root, { recursive: true, force: true })
  }
})
