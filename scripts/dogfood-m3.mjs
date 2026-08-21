import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { repoRoot } from './lib/profile.mjs'

const baseUrl = process.env.AEZY_TEST_URL ?? 'http://127.0.0.1:3090'
const suffix = process.env.AEZY_DOGFOOD_SUFFIX ?? Date.now().toString(36)
const resuming = process.env.AEZY_DOGFOOD_RESUME === '1'
const name = `m3-dogfood-${suffix}`
const sessionId = `m3-dogfood-turn-${suffix}`
const handoffSessionId = `m3-dogfood-handoff-${suffix}`
const relativeRoot = `doc/dogfood/m3-worktree-handoff/${suffix}`
const expectedFiles = [`${relativeRoot}/implementation.md`, `${relativeRoot}/verification.md`]
let rpcSequence = 0

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

async function rpc(method, payload) {
  rpcSequence += 1
  const rpcId = `${sessionId}-${rpcSequence}`
  const response = await fetch(`${baseUrl}/api/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
    signal: AbortSignal.timeout(15_000),
  })
  const envelope = await response.json()
  if (!response.ok || envelope.result?.ok !== true) {
    throw new Error(`${method} failed: ${JSON.stringify(envelope.result?.error ?? envelope)}`)
  }
  return envelope.result.value
}

async function request(path, options = {}, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'X-Aezy-Client': 'web', ...options.headers },
    signal: AbortSignal.timeout(30_000),
  })
  const body = await response.json()
  if (expectedStatus !== undefined) {
    assert.equal(response.status, expectedStatus, JSON.stringify(body))
    return body
  }
  if (!response.ok) throw new Error(`${response.status}: ${body.error}`)
  return body
}

function post(path, body, expectedStatus) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, expectedStatus)
}

const base = git(repoRoot, 'rev-parse', 'HEAD')
const localStatusBefore = git(repoRoot, 'status', '--short')
let worktree
if (resuming) {
  const registry = await request(`/aezy/api/project/worktrees?${new URLSearchParams({ cwd: repoRoot })}`)
  worktree = registry.worktrees.find(item => item.name === name && item.state !== 'cleaned')
  if (worktree === undefined) throw new Error(`no resumable Aezy Worktree named ${name}`)
  assert.equal(worktree.base, base, 'resumed Worktree base no longer matches Local HEAD')
} else {
  const created = await post('/aezy/api/project/worktrees/create', {
    cwd: repoRoot,
    name,
    base,
    confirmDirty: localStatusBefore !== '',
  })
  worktree = created.worktree
}

try {
  const workspace = await rpc('workspace.create', { path: worktree.path })
  if (!resuming) {
    await rpc('session.create', {
      workspaceId: workspace.workspace.workspaceId,
      sessionId,
      agentPreset: 'aezy',
    })
    await post('/aezy/api/project/worktrees/bind', {
      cwd: worktree.path,
      worktreeId: worktree.id,
      sessionId,
    })
    await rpc('session.prompt', {
      sessionId,
      mode: 'queue',
      content: [{
        type: 'text',
        text: [
          'M3 Worktree isolation dogfood only.',
          `Use the write tool to create exactly these two Markdown files: ${expectedFiles.join(' and ')}.`,
          'The first must state that the real Aezy Agent worked inside an isolated Git worktree.',
          'The second must state that Changes and the Turn ledger are scoped to this Worktree Session.',
          'Do not call bash or pwsh. Do not modify any other file.',
        ].join(' '),
      }],
      clientTimeZone: 'Asia/Shanghai',
    })

    const deadline = Date.now() + 180_000
    let events = []
    while (Date.now() < deadline) {
      const history = await rpc('session.history', { sessionId, maxMessages: 80 })
      events = history.events.map(entry => entry.event)
      if (events.some(event => event.type === 'turn/end')) break
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    assert.equal(events.some(event => event.type === 'turn/end'), true, 'M3 dogfood Turn did not finish')
    assert.equal(events.filter(event => event.type === 'tool/call' && event.data.name === 'write').length >= 2, true,
      'real Agent did not create both files with write')
  }

  const ledger = await request(`/aezy/api/project/ledger?${new URLSearchParams({ cwd: worktree.path, sessionId })}`)
  const turn = ledger.turns.find(candidate => candidate.turn === 1)
  assert.ok(turn, 'M3 dogfood ledger did not publish Turn 1')
  assert.equal(turn.concurrent, false)
  assert.deepEqual(turn.files.map(file => file.path), expectedFiles)
  assert.match(await readFile(join(worktree.path, expectedFiles[0]), 'utf8'), /isolated Git worktree/iu)
  assert.match(await readFile(join(worktree.path, expectedFiles[1]), 'utf8'), /Worktree Session/iu)
  assert.equal(git(repoRoot, 'status', '--short'), localStatusBefore, 'the Local checkout changed during the isolated Turn')

  execFileSync('node', ['--test', 'packages/aezy-project/tests/worktree.test.mjs'], {
    cwd: worktree.path,
    encoding: 'utf8',
    stdio: 'pipe',
  })
  git(worktree.path, 'add', '--', ...expectedFiles)
  git(worktree.path, 'commit', '-m', 'test: record M3 worktree dogfood')
  const head = git(worktree.path, 'rev-parse', 'HEAD')

  await rpc('workspace.archiveSession', { sessionId })
  await post('/aezy/api/project/worktrees/release', {
    cwd: worktree.path,
    worktreeId: worktree.id,
    sessionId,
  })
  await rpc('session.create', {
    workspaceId: workspace.workspace.workspaceId,
    sessionId: handoffSessionId,
    agentPreset: 'aezy',
  })
  await post('/aezy/api/project/worktrees/bind', {
    cwd: worktree.path,
    worktreeId: worktree.id,
    sessionId: handoffSessionId,
  })
  const handedOff = await post('/aezy/api/project/worktrees/handoff', {
    cwd: worktree.path,
    sessionId: handoffSessionId,
    instructions: 'Review the isolated dogfood commit and continue from the exact retained branch head.',
    validations: [{
      command: 'node --test packages/aezy-project/tests/worktree.test.mjs',
      status: 'passed',
      summary: 'All M3 Worktree lifecycle and isolation tests passed inside the dogfood Worktree.',
    }],
  })
  assert.equal(handedOff.handoff.git.clean, true)
  assert.equal(handedOff.handoff.git.head, head)
  assert.deepEqual(handedOff.handoff.git.committedFiles.map(file => file.path), expectedFiles)

  await rpc('workspace.archiveSession', { sessionId: handoffSessionId })
  await post('/aezy/api/project/worktrees/release', {
    cwd: worktree.path,
    worktreeId: worktree.id,
    sessionId: handoffSessionId,
  })
  const cleaned = await post('/aezy/api/project/worktrees/cleanup', {
    cwd: repoRoot,
    worktreeId: worktree.id,
  })
  assert.equal(cleaned.branchRetained, `aezy/${name}`)
  assert.equal(git(repoRoot, 'show-ref', '--verify', `refs/heads/aezy/${name}`).split(/\s+/u)[0], head)
  assert.equal(git(repoRoot, 'status', '--short'), localStatusBefore)
  process.stdout.write(`${JSON.stringify({
    sessionId,
    handoffSessionId,
    handoffId: handedOff.handoff.id,
    branch: cleaned.branchRetained,
    base,
    head,
    files: expectedFiles,
  }, null, 2)}\n`)
} catch (error) {
  throw new Error(`M3 dogfood stopped with managed Worktree preserved at ${worktree.path}: ${error instanceof Error ? error.message : String(error)}`)
}
