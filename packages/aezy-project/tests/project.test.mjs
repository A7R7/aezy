import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { access, mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  basename, describeDiff, describeProject, parsePorcelainV2, parseUnifiedDiff, summarizeTurn, TurnLedger,
} from '../src/index.js'

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
  assert.equal(tracked.version, 2)
  assert.equal(tracked.source.kind, 'working')
  assert.equal(tracked.file.status, 'modified')
  assert.equal(tracked.file.additions, 1)
  assert.equal(tracked.file.deletions, 1)
  assert.deepEqual(tracked.parts[1].hunks[0].lines.map(line => [line.kind, line.oldLine, line.newLine, line.text]), [
    ['deletion', 1, null, 'before'],
    ['addition', null, 1, 'after'],
  ])
  assert.match(tracked.fingerprint, /^[a-f0-9]{64}$/)

  const untracked = await describeDiff(root, 'new file.txt')
  assert.equal(untracked.file.status, 'added')
  assert.equal(untracked.file.binary, false)
  assert.equal(untracked.parts[1].hunks[0].lines[0].text, 'one')

  await assert.rejects(() => describeDiff(root, '../outside.txt'), /repository-relative|escapes/)
  await assert.rejects(() => describeDiff(root, 'not-in-status.txt'), /not present/)
})

test('strict unified parser projects line numbers and fails closed to bounded raw', () => {
  const parsed = parseUnifiedDiff([
    'diff --git a/a.txt b/a.txt',
    '--- a/a.txt',
    '+++ b/a.txt',
    '@@ -2,3 +2,4 @@ section',
    ' same',
    '-old',
    '+new',
    '+extra',
    ' tail',
    '\\ No newline at end of file',
    '',
  ].join('\n'))
  assert.equal(parsed.state, 'structured')
  assert.deepEqual(parsed.hunks[0].lines.map(line => [line.kind, line.oldLine, line.newLine]), [
    ['context', 2, 2],
    ['deletion', 3, null],
    ['addition', null, 3],
    ['addition', null, 4],
    ['context', 4, 5],
    ['meta', null, null],
  ])
  const malformed = parseUnifiedDiff('@@ -1,2 +1,2 @@\n-old\n+new\n')
  assert.equal(malformed.state, 'fallback')
  assert.deepEqual(malformed.hunks, [])
  assert.match(malformed.rawFallback, /-old/u)
  assert.equal(parseUnifiedDiff('@@@ -1,1 -1,1 +1,1 @@@\n x\n').state, 'fallback')
  const rename = parseUnifiedDiff('diff --git a/old name.txt b/new name.txt\nsimilarity index 100%\nrename from old name.txt\nrename to new name.txt\n')
  assert.equal(rename.state, 'empty')
  assert.deepEqual(rename.metadata, { oldPath: 'old name.txt', newPath: 'new name.txt', status: 'renamed' })
  const binary = parseUnifiedDiff('diff --git a/image.png b/image.png\nBinary files a/image.png and b/image.png differ\n')
  assert.equal(binary.metadata.status, 'binary')
})

test('Turn summary is bounded to one ledger turn and preserves removed-file facts', () => {
  const ledger = {
    turns: [{
      turn: 2,
      concurrent: true,
      additions: 4,
      deletions: 2,
      statsComplete: true,
      files: [
        { path: 'src/changed.ts', openPath: '/repo/src/changed.ts', change: 'modified', afterFingerprint: 'a'.repeat(64), revertable: true, additions: 3, deletions: 1, binary: false },
        { path: 'old/deleted.ts', openPath: '/repo/old/deleted.ts', change: 'restored-or-removed', afterFingerprint: null, revertable: true, additions: 1, deletions: 1, binary: false },
      ],
    }],
  }
  assert.deepEqual(summarizeTurn(ledger, 2), {
    turn: 2,
    concurrent: true,
    additions: 4,
    deletions: 2,
    statsComplete: true,
    files: ledger.turns[0].files.map(file => ({
      ...file,
      truncated: false,
      status: file.binary ? 'binary' : 'modified',
      oldPath: null,
    })),
  })
  assert.equal(summarizeTurn(ledger, 1), null)
  assert.equal(basename('src/changed.ts'), 'changed.ts')
  assert.equal(basename('src\\windows.ts'), 'windows.ts')
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

  // The first post-turn read itself must await the asynchronous Git scan/write.
  const liveView = await ledger.view(root, 'ledger-session')
  assert.equal(liveView.turns.length, 1)

  const freshReader = new TurnLedger()
  const view = await freshReader.view(root, 'ledger-session')
  assert.equal(view.turns.length, 1)
  assert.deepEqual(view.turns[0].files.map(file => file.path), ['created.txt', 'tracked.txt'])
  assert.equal(view.turns[0].files[0].openPath, join(root, 'created.txt'))
  assert.deepEqual(view.turns[0].files.map(file => [file.additions, file.deletions]), [[1, 0], [1, 1]])
  assert.equal(view.turns[0].additions, 2)
  assert.equal(view.turns[0].deletions, 1)

  const createdReview = await freshReader.review(root, 'ledger-session', 1, 'created.txt')
  assert.equal(createdReview.source.kind, 'turn')
  assert.equal(createdReview.file.status, 'added')
  assert.equal(createdReview.parts[0].hunks[0].lines[0].text, 'created-by-agent')
  const trackedReview = await freshReader.review(root, 'ledger-session', 1, 'tracked.txt')
  assert.equal(trackedReview.file.status, 'modified')
  assert.ok(trackedReview.parts[0].hunks[0].lines.some(line => line.kind === 'deletion' && line.text === 'pre-turn'))
  assert.ok(trackedReview.parts[0].hunks[0].lines.some(line => line.kind === 'addition' && line.text === 'agent-change'))

  // Historical review is object-backed and must not drift with later worktree edits.
  await writeFile(join(root, 'tracked.txt'), 'later-worktree-drift\n')
  assert.deepEqual(await freshReader.review(root, 'ledger-session', 1, 'tracked.txt'), trackedReview)
  await assert.rejects(() => freshReader.review(root, 'ledger-session', 1, '../outside.txt'), /repository-relative|escapes/u)
  await writeFile(join(root, 'tracked.txt'), 'agent-change\n')

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

test('historical review records a Turn rename without weakening fail-closed revert', async () => {
  const root = await fixture()
  await writeFile(join(root, 'tracked.txt'), 'before\n')
  await access(join(root, 'new file.txt')).then(() => {})
  git(root, 'clean', '-fd')
  const ledger = new TurnLedger()
  const session = { id: 'rename-session', header: { id: 'rename-session', cwd: root } }
  ledger.observe(session, { type: 'turn/start', time: 100, data: { turn: 1 } })
  await ledger.settle('rename-session')
  git(root, 'mv', 'tracked.txt', 'renamed.txt')
  ledger.observe(session, { type: 'turn/end', time: 200, data: { turn: 1, reason: { kind: 'completed' } } })
  const view = await ledger.view(root, 'rename-session')
  assert.equal(view.turns[0].files[0].status, 'renamed')
  assert.equal(view.turns[0].files[0].oldPath, 'tracked.txt')
  assert.equal(view.turns[0].files[0].revertable, false)
  const review = await ledger.review(root, 'rename-session', 1, 'renamed.txt')
  assert.equal(review.file.status, 'renamed')
  assert.equal(review.file.oldPath, 'tracked.txt')
  assert.equal(review.file.newPath, 'renamed.txt')
  assert.equal(review.parts[0].state, 'empty')
})

test('historical review lazily reads only the requested Turn file object', async () => {
  const root = await fixture()
  const ledger = new TurnLedger()
  const session = { id: 'lazy-review-session', header: { id: 'lazy-review-session', cwd: root } }
  ledger.observe(session, { type: 'turn/start', time: 100, data: { turn: 1 } })
  await ledger.settle('lazy-review-session')
  await writeFile(join(root, 'tracked.txt'), 'first-after\n')
  await writeFile(join(root, 'second.txt'), 'second-after\n')
  ledger.observe(session, { type: 'turn/end', time: 200, data: { turn: 1, reason: { kind: 'completed' } } })
  await ledger.view(root, 'lazy-review-session')

  const ledgerPath = join(root, '.git', 'aezy', 'ledger.json')
  const persisted = JSON.parse(await readFile(ledgerPath, 'utf8'))
  const second = persisted.sessions['lazy-review-session'].turns[0].files.find(file => file.path === 'second.txt')
  second.review.object = 'f'.repeat(64)
  await writeFile(ledgerPath, `${JSON.stringify(persisted, null, 2)}\n`)

  const first = await ledger.review(root, 'lazy-review-session', 1, 'tracked.txt')
  assert.equal(first.file.path, 'tracked.txt')
  await assert.rejects(() => ledger.review(root, 'lazy-review-session', 1, 'second.txt'), /ENOENT/u)
})

test('Turn Undo restores every file atomically and its receipt can reapply the Turn', async () => {
  const root = await fixture()
  await writeFile(join(root, 'tracked.txt'), 'turn-before\n')
  const ledger = new TurnLedger()
  const session = { id: 'turn-undo-session', header: { id: 'turn-undo-session', cwd: root } }
  ledger.observe(session, { type: 'turn/start', time: 100, data: { turn: 1 } })
  await ledger.settle('turn-undo-session')
  await writeFile(join(root, 'tracked.txt'), 'turn-after\n')
  await writeFile(join(root, 'turn-created.txt'), 'created\n')
  ledger.observe(session, {
    type: 'turn/end', time: 200, data: { turn: 1, reason: { kind: 'completed' } },
  })
  const view = await ledger.view(root, 'turn-undo-session')
  assert.deepEqual(view.turns[0].files.map(file => file.path), ['tracked.txt', 'turn-created.txt'])

  const reverted = await ledger.revertTurn({ cwd: root, sessionId: 'turn-undo-session', turn: 1 })
  assert.equal(await readFile(join(root, 'tracked.txt'), 'utf8'), 'turn-before\n')
  await assert.rejects(() => access(join(root, 'turn-created.txt')), /ENOENT/u)
  assert.deepEqual(reverted.files, ['tracked.txt', 'turn-created.txt'])

  await ledger.undo({ cwd: root, receiptId: reverted.receiptId })
  assert.equal(await readFile(join(root, 'tracked.txt'), 'utf8'), 'turn-after\n')
  assert.equal(await readFile(join(root, 'turn-created.txt'), 'utf8'), 'created\n')
})

test('Turn Undo rejects the whole batch before mutation when one file drifted', async () => {
  const root = await fixture()
  const ledger = new TurnLedger()
  const session = { id: 'turn-drift-session', header: { id: 'turn-drift-session', cwd: root } }
  ledger.observe(session, { type: 'turn/start', time: 100, data: { turn: 1 } })
  await ledger.settle('turn-drift-session')
  await writeFile(join(root, 'tracked.txt'), 'turn-result\n')
  await writeFile(join(root, 'second.txt'), 'turn-result\n')
  ledger.observe(session, {
    type: 'turn/end', time: 200, data: { turn: 1, reason: { kind: 'completed' } },
  })
  await ledger.view(root, 'turn-drift-session')
  await writeFile(join(root, 'second.txt'), 'later-edit\n')
  await assert.rejects(() => ledger.revertTurn({
    cwd: root, sessionId: 'turn-drift-session', turn: 1,
  }), /changed since/u)
  assert.equal(await readFile(join(root, 'tracked.txt'), 'utf8'), 'turn-result\n')
  assert.equal(await readFile(join(root, 'second.txt'), 'utf8'), 'later-edit\n')
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
