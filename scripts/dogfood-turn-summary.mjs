import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const baseUrl = process.env.AEZY_TEST_URL ?? 'http://127.0.0.1:3090'
const sessionId = `turn-summary-dogfood-${Date.now().toString(36)}`
const fixtureBase = process.env.AEZY_DOGFOOD_TMP
  ?? (process.platform === 'win32' ? tmpdir() : '/tmp')
const root = await mkdtemp(join(fixtureBase, 'aezy-turn-summary-dogfood-'))
const relativePath = 'turn-summary.md'
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

try {
  execFileSync('git', ['init', '-b', 'main'], { cwd: root, stdio: 'ignore' })
  execFileSync('git', ['config', 'user.name', 'Aezy Dogfood'], { cwd: root })
  execFileSync('git', ['config', 'user.email', 'dogfood@aezy.local'], { cwd: root })
  await writeFile(join(root, 'README.md'), '# Aezy Turn Summary Dogfood\n')
  execFileSync('git', ['add', '--', 'README.md'], { cwd: root })
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: root, stdio: 'ignore' })

  await rpc('session.create', { cwd: root, sessionId, agentPreset: 'aezy' })
  await rpc('session.prompt', {
    sessionId,
    mode: 'queue',
    content: [{
      type: 'text',
      text: [
        'Turn-summary dogfood only.',
        `Use the write tool to create exactly ${relativePath}.`,
        'Its Markdown must state that the real Aezy Agent created it to verify the authoritative post-Turn changed-files summary.',
        'Do not call bash or pwsh. Do not modify any other file.',
      ].join(' '),
    }],
    clientTimeZone: 'Asia/Shanghai',
  })

  const deadline = Date.now() + 150_000
  let events = []
  while (Date.now() < deadline) {
    const history = await rpc('session.history', { sessionId, maxMessages: 50 })
    events = history.events.map(entry => entry.event)
    if (events.some(event => event.type === 'turn/end')) break
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  assert.equal(events.some(event => event.type === 'turn/end'), true, 'dogfood Turn did not finish')
  assert.equal(events.some(event => event.type === 'tool/call' && event.data.name === 'write'), true,
    'real Agent did not use the requested write tool')

  const query = new URLSearchParams({ cwd: root, sessionId })
  const response = await fetch(`${baseUrl}/aezy/api/project/ledger?${query}`, {
    headers: { 'X-Aezy-Client': 'web' },
    signal: AbortSignal.timeout(30_000),
  })
  const ledger = await response.json()
  if (!response.ok) throw new Error(`ledger failed: ${ledger.error}`)
  const turn = ledger.turns.find(candidate => candidate.turn === 1)
  assert.ok(turn, 'authoritative ledger did not publish Turn 1')
  assert.deepEqual(turn.files.map(file => file.path), [relativePath])
  assert.equal(turn.files[0].openPath, absolutePath)
  assert.match(await readFile(absolutePath, 'utf8'), /post-Turn changed-files summary/iu)
  process.stdout.write(`Real Aezy post-Turn summary dogfood passed (session ${sessionId}, file ${relativePath}).\n`)
} finally {
  await rm(root, { recursive: true, force: true })
}
