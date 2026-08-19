import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { access, mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { describeDiff, describeProject, parsePorcelainV2, TurnLedger } from '../src/index.js'

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' })
}

async function fixture() {
  const writableTemp = process.platform === 'win32' ? tmpdir() : '/tmp'
  const root = await mkdtemp(join(writableTemp, 'aezy-project-'))
  git(root, 'init', '--quiet')
  git(root, 'config', 'user.name', 'Aezy Test')
  git(root, 'config', 'user.email', 'aezy@example.invalid')
  await writeFile(join(root, 'tracked.txt'), 'before\n')
  git(root, 'add', 'tracked.txt')
  git(root, 'commit', '--quiet', '-m', 'fixture')
  await writeFile(join(root, 'tracked.txt'), 'after\n')
  await writeFile(join(root, 'new file.txt'), 'one\ntwo\n')
  await mkdir(join(root, 'nested'))
  return root
}

test('porcelain parser preserves spaces and all M1 status classes', () => {
  const parsed = parsePorcelainV2([
    '1 M. N... 100644 100644 100644 aaa bbb staged name.txt',
    '2 R. N... 100644 100644 100644 aaa bbb R100 renamed now.txt',
    'old name.txt',
    '? untracked name.txt',
    'u UU N... 100644 100644 100644 100644 aaa bbb ccc conflict name.txt',
    '',
  ].join('\0'))
  assert.deepEqual(parsed.map(file => [file.path, file.kind]), [
    ['conflict name.txt', 'conflict'],
    ['renamed now.txt', 'renamed'],
    ['staged name.txt', 'ordinary'],
    ['untracked name.txt', 'untracked'],
  ])
  assert.equal(parsed.find(file => file.kind === 'renamed')?.originalPath, 'old name.txt')
})

test('project discovery returns structured local environment and Git status', async () => {
  const root = await fixture()
  const view = await describeProject(root)
  assert.equal(view.project.root, root)
  assert.equal(view.project.environment, 'local')
  assert.equal(view.environment.kind, 'local')
  assert.equal(view.repository.clean, false)
  assert.deepEqual(view.files.map(file => file.path), ['new file.txt', 'tracked.txt'])
  assert.equal(view.files.find(file => file.path === 'tracked.txt')?.worktreeStatus, 'M')
})

test('diff reads only current status paths and fingerprints exact content', async () => {
  const root = await fixture()
  const tracked = await describeDiff(root, 'tracked.txt')
  assert.match(tracked.worktree, /-before/)
  assert.match(tracked.worktree, /\+after/)
  assert.match(tracked.fingerprint, /^[a-f0-9]{64}$/)

  const untracked = await describeDiff(root, 'new file.txt')
  assert.match(untracked.worktree, /new file mode/)
  assert.match(untracked.worktree, /\+one/)
  assert.equal(untracked.binary, false)

  await assert.rejects(() => describeDiff(root, '../outside.txt'), /repository-relative|escapes/)
  await assert.rejects(() => describeDiff(root, 'not-in-status.txt'), /not present/)
})

test('turn ledger survives a fresh reader and safe revert preserves pre-turn dirty state', async () => {
  const root = await fixture()
  await writeFile(join(root, 'tracked.txt'), 'pre-turn\n')
  git(root, 'add', 'tracked.txt')
  const ledger = new TurnLedger()
  const session = { id: 'ledger-session', header: { id: 'ledger-session', cwd: root } }
  ledger.observe(session, { type: 'turn/start', time: 100, data: { turn: 1 } })
  await ledger.settle('ledger-session')

  await writeFile(join(root, 'tracked.txt'), 'agent-change\n')
  await writeFile(join(root, 'created.txt'), 'created-by-agent\n')
  ledger.observe(session, {
    type: 'turn/end',
    time: 200,
    data: { turn: 1, reason: { kind: 'completed' } },
  })
  await ledger.settle('ledger-session')

  const freshReader = new TurnLedger()
  const view = await freshReader.view(root, 'ledger-session')
  assert.equal(view.turns.length, 1)
  assert.deepEqual(view.turns[0].files.map(file => file.path), ['created.txt', 'tracked.txt'])

  const trackedEntry = view.turns[0].files.find(file => file.path === 'tracked.txt')
  const reverted = await freshReader.revert({
    cwd: root,
    sessionId: 'ledger-session',
    turn: 1,
    path: 'tracked.txt',
    expectedFingerprint: trackedEntry.afterFingerprint,
  })
  assert.equal(await readFile(join(root, 'tracked.txt'), 'utf8'), 'pre-turn\n')
  assert.equal(git(root, 'show', ':tracked.txt'), 'pre-turn\n')

  await freshReader.undo({ cwd: root, receiptId: reverted.receiptId })
  assert.equal(await readFile(join(root, 'tracked.txt'), 'utf8'), 'agent-change\n')

  const createdEntry = view.turns[0].files.find(file => file.path === 'created.txt')
  const removed = await freshReader.revert({
    cwd: root,
    sessionId: 'ledger-session',
    turn: 1,
    path: 'created.txt',
    expectedFingerprint: createdEntry.afterFingerprint,
  })
  await assert.rejects(() => access(join(root, 'created.txt')), /ENOENT/)
  await freshReader.undo({ cwd: root, receiptId: removed.receiptId })
  assert.equal(await readFile(join(root, 'created.txt'), 'utf8'), 'created-by-agent\n')
})

test('safe revert rejects a file that drifted after the recorded turn', async () => {
  const root = await fixture()
  const ledger = new TurnLedger()
  const session = { id: 'drift-session', header: { id: 'drift-session', cwd: root } }
  ledger.observe(session, { type: 'turn/start', time: 100, data: { turn: 1 } })
  await ledger.settle('drift-session')
  await writeFile(join(root, 'tracked.txt'), 'turn-result\n')
  ledger.observe(session, {
    type: 'turn/end',
    time: 200,
    data: { turn: 1, reason: { kind: 'completed' } },
  })
  await ledger.settle('drift-session')
  const view = await ledger.view(root, 'drift-session')
  const entry = view.turns[0].files.find(file => file.path === 'tracked.txt')
  await writeFile(join(root, 'tracked.txt'), 'later-edit\n')
  await assert.rejects(() => ledger.revert({
    cwd: root,
    sessionId: 'drift-session',
    turn: 1,
    path: 'tracked.txt',
    expectedFingerprint: entry.afterFingerprint,
  }), /changed since/)
  assert.equal(await readFile(join(root, 'tracked.txt'), 'utf8'), 'later-edit\n')
})
