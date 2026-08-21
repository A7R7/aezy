import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { TurnLedger } from '../packages/aezy-project/src/index.js'

const baseUrl = process.env.AEZY_TEST_URL ?? 'http://127.0.0.1:3091'
const root = await mkdtemp('/tmp/aezy-project-http-')

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'X-Aezy-Client': 'web',
      ...options.headers,
    },
  })
  const body = await response.json()
  if (!response.ok) throw new Error(`${response.status}: ${body.error}`)
  return body
}

try {
  git('init', '--quiet')
  git('config', 'user.name', 'Aezy HTTP Test')
  git('config', 'user.email', 'aezy@example.invalid')
  await writeFile(join(root, 'file.txt'), 'before\n')
  git('add', 'file.txt')
  git('commit', '--quiet', '-m', 'fixture')

  const ledger = new TurnLedger()
  const session = { id: 'http-session', header: { id: 'http-session', cwd: root } }
  ledger.observe(session, { type: 'turn/start', time: 100, data: { turn: 1 } })
  await ledger.settle('http-session')
  await writeFile(join(root, 'file.txt'), 'after\n')
  ledger.observe(session, {
    type: 'turn/end',
    time: 200,
    data: { turn: 1, reason: { kind: 'completed' } },
  })

  // The post-turn summary read is the synchronization boundary; callers do
  // not need a private settle hook before the first authoritative response.
  const settled = await ledger.view(root, 'http-session')
  assert.equal(settled.turns[0].files.length, 1)

  const query = new URLSearchParams({ cwd: root, sessionId: 'http-session' })
  const view = await request(`/aezy/api/project/ledger?${query}`)
  assert.equal(view.turns.length, 1)
  const entry = view.turns[0].files[0]
  assert.equal(entry.path, 'file.txt')
  assert.equal(entry.openPath, join(root, 'file.txt'))
  assert.equal(entry.additions, 1)
  assert.equal(entry.deletions, 1)

  const review = await request(`/aezy/api/project/turn-review?${new URLSearchParams({
    cwd: root, sessionId: 'http-session', turn: '1', path: 'file.txt',
  })}`)
  assert.equal(review.source.kind, 'turn')
  assert.equal(review.file.path, 'file.txt')
  assert.ok(review.parts[0].hunks[0].lines.some(line => line.kind === 'deletion' && line.text === 'before'))
  assert.ok(review.parts[0].hunks[0].lines.some(line => line.kind === 'addition' && line.text === 'after'))

  const reverted = await request('/aezy/api/project/revert-turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cwd: root,
      sessionId: 'http-session',
      turn: 1,
    }),
  })
  assert.equal(await readFile(join(root, 'file.txt'), 'utf8'), 'before\n')

  await request('/aezy/api/project/undo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cwd: root, receiptId: reverted.receiptId }),
  })
  assert.equal(await readFile(join(root, 'file.txt'), 'utf8'), 'after\n')

  const forbidden = await fetch(`${baseUrl}/aezy/api/project?${new URLSearchParams({ cwd: root })}`)
  assert.equal(forbidden.status, 403)
  process.stdout.write('M1 real DSH HTTP Codex-style Turn review, batch Undo/Redo, and request fence passed.\n')
} finally {
  await rm(root, { recursive: true, force: true })
}
