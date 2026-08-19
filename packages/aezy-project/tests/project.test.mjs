import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { describeDiff, describeProject, parsePorcelainV2 } from '../src/index.js'

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
