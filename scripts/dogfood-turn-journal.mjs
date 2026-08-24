import assert from 'node:assert/strict'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const baseUrl = process.env.AEZY_TEST_URL ?? 'http://127.0.0.1:3090'
const sessionId = `turn-journal-dogfood-${Date.now().toString(36)}`
const fixtureBase = process.env.AEZY_DOGFOOD_TMP
  ?? (process.platform === 'win32' ? tmpdir() : '/tmp')
const root = await mkdtemp(join(fixtureBase, 'aezy-turn-journal-dogfood-'))
const relativePath = 'journal.md'
const absolutePath = join(root, relativePath)
let rpcSequence = 0

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

async function projectRequest(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'X-Aezy-Client': 'web' },
    signal: AbortSignal.timeout(30_000),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(`${path} failed: ${body.error}`)
  return body
}

try {
  const project = await projectRequest(`/aezy/api/project?${new URLSearchParams({ cwd: root })}`)
  assert.equal(project.repository.available, false)

  await rpc('session.create', { cwd: root, sessionId, agentPreset: 'aezy' })
  await rpc('session.prompt', {
    sessionId,
    mode: 'queue',
    content: [{
      type: 'text',
      text: [
        'Non-Git Turn journal dogfood only.',
        `Use the write tool to create exactly ${relativePath} with the text "draft journal".`,
        'Then use the edit tool to replace "draft" with "verified non-git".',
        'Do not call bash, pwsh, run_code, or modify any other file.',
        'Reply briefly after both file tool calls succeed.',
      ].join(' '),
    }],
    clientTimeZone: 'Asia/Shanghai',
  })

  const deadline = Date.now() + 150_000
  let events = []
  while (Date.now() < deadline) {
    const history = await rpc('session.history', { sessionId, maxMessages: 80 })
    events = history.events.map(entry => entry.event)
    if (events.some(event => event.type === 'turn/end')) break
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  assert.equal(events.some(event => event.type === 'turn/end'), true, 'non-Git dogfood Turn did not finish')
  assert.equal(events.some(event => event.type === 'tool/call' && event.data.name === 'write'), true,
    'real Agent did not use write')
  assert.equal(events.some(event => event.type === 'tool/call' && event.data.name === 'edit'), true,
    'real Agent did not use edit')
  await assert.rejects(() => access(join(root, '.git')), /ENOENT/u)

  const query = new URLSearchParams({ cwd: root, sessionId })
  const ledger = await projectRequest(`/aezy/api/project/ledger?${query}`)
  assert.equal(ledger.gitAvailable, false)
  const turn = ledger.turns.find(candidate => candidate.turn === 1)
  assert.ok(turn, 'structured journal did not publish Turn 1')
  assert.equal(turn.source, 'structured')
  assert.equal(turn.partial, false)
  assert.deepEqual(turn.files.map(file => file.path), [relativePath])
  assert.equal(turn.files[0].revertable, false)
  assert.match(await readFile(absolutePath, 'utf8'), /verified non-git journal/iu)

  const review = await projectRequest(`/aezy/api/project/turn-review?${new URLSearchParams({
    cwd: root, sessionId, turn: '1', path: relativePath,
  })}`)
  assert.equal(review.source.repositoryRoot, null)
  assert.equal(review.file.status, 'added')
  assert.ok(review.parts[0].hunks.flatMap(hunk => hunk.lines)
    .some(line => line.kind === 'addition' && /verified non-git journal/iu.test(line.text)))
  process.stdout.write(`Real Aezy non-Git Turn journal dogfood passed (session ${sessionId}, file ${relativePath}).\n`)
} finally {
  await rm(root, { recursive: true, force: true })
}
