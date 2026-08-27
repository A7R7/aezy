import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const baseUrl = process.env.AEZY_TEST_URL ?? 'http://127.0.0.1:3090'
const cwd = process.env.AEZY_CODEX_TEST_CWD ?? process.cwd()
const model = process.env.AEZY_CODEX_TEST_MODEL ?? 'gpt-5.6-sol'
const resume = process.env.AEZY_CODEX_RESUME === '1'
const cancel = process.env.AEZY_CODEX_CANCEL === '1'
const write = process.env.AEZY_CODEX_WRITE === '1'
const proofFile = join(cwd, 'codex-dsh-proof.txt')
const sessionId = process.env.AEZY_CODEX_TEST_SESSION_ID ?? `codex-dsh-gate-${Date.now().toString(36)}`
let sequence = 0

async function rpc(method, payload) {
  sequence += 1
  const rpcId = `codex-dsh-${sequence}`
  const response = await fetch(`${baseUrl}/api/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
    signal: AbortSignal.timeout(30_000),
  })
  assert.equal(response.ok, true, `${method} failed with HTTP ${response.status}`)
  const envelope = await response.json()
  assert.equal(envelope.rpcId, rpcId)
  assert.equal(envelope.result?.ok, true, `${method}: ${JSON.stringify(envelope.result?.error)}`)
  return envelope.result.value
}

async function historyUntilComplete(previousTurns) {
  const deadline = Date.now() + 150_000
  while (Date.now() < deadline) {
    const history = await rpc('session.history', { sessionId, maxMessages: 200 })
    const events = history.events.map(entry => entry.event)
    if (events.filter(event => event.type === 'turn/end').length > previousTurns) return events
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error('DSH Codex Turn did not complete before the gate deadline')
}

const workspace = await rpc('workspace.create', { path: cwd })
await rpc('session.create', {
  workspaceId: workspace.workspace.workspaceId,
  sessionId,
  agentPreset: 'aezy',
})
const models = await rpc('session.models', { sessionId })
const provider = models.groups.find(group => group.id === 'aezy-codex')
assert.ok(provider, 'Aezy Codex provider is absent from the DSH model catalog')
assert.ok(provider.models.some(candidate => candidate.id === model), `${model} is absent from the Aezy Codex provider`)
if (resume) {
  assert.equal(models.current.provider, 'aezy-codex', 'resumed DSH Session lost its Codex provider selection')
} else {
  await rpc('session.selectModel', {
    sessionId,
    provider: 'aezy-codex',
    model,
    reasoningEffort: 'low',
  })
}
const before = await rpc('session.history', { sessionId, maxMessages: 200 })
const previousTurns = before.events.filter(entry => entry.event.type === 'turn/end').length
await rpc('session.prompt', {
  sessionId,
  mode: 'queue',
  content: [{
    type: 'text',
    text: resume
      ? 'Without using any tool, state the exact output returned by the `pwd` command in the previous turn.'
      : cancel
        ? 'Use the `dsh.bash` tool exactly once to run `sleep 30`; do not use native tools. Wait for it to complete before replying.'
        : write
          ? 'Use the `dsh.write` tool exactly once to create `codex-dsh-proof.txt` with the exact content `AEZY_CODEX_DSH_WRITE_OK\n`. Do not use native tools or any other tool. Then report completion.'
          : 'Aezy DSH adapter gate. Use the `dsh.bash` tool exactly once to run `pwd`; do not use native tools, do not modify files, then report the actual output.',
  }],
})

if (cancel) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    const inFlight = await rpc('session.history', { sessionId, maxMessages: 200 })
    if (inFlight.events.filter(entry => entry.event.type === 'turn/start').length > previousTurns) break
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  await new Promise(resolve => setTimeout(resolve, 500))
  await rpc('session.cancel', { sessionId })
}

const events = await historyUntilComplete(previousTurns)
const latestStart = events.findLastIndex(event => event.type === 'turn/start')
const latest = events.slice(latestStart)
const call = latest.find(event => event.type === 'tool/call' && event.data.name === 'bash')
const finalText = latest.filter(event => event.type === 'assistant/message')
  .flatMap(event => event.data.message?.content ?? [])
  .filter(block => block.type === 'text')
  .map(block => block.text)
  .join('\n')
if (cancel) {
  assert.equal(latest.findLast(event => event.type === 'turn/end').data.reason.kind, 'aborted')
} else if (resume) {
  assert.equal(call, undefined, 'resume proof unexpectedly invoked another command')
  assert.match(finalText, new RegExp(cwd.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'), 'resumed Codex Thread did not recall prior pwd output')
} else {
  const governedCall = write ? latest.find(event => event.type === 'tool/call' && event.data.name === 'write') : call
  assert.ok(governedCall, `Codex ${write ? 'write' : 'command'} was not projected as a DSH tool/call`)
  const result = latest.find(event => event.type === 'tool/result'
    && event.data.message?.source?.callId === governedCall.data.callId)
  assert.ok(result, `Codex ${write ? 'write' : 'command'} was not projected as a DSH tool/result`)
  assert.equal(result.data.meta?.aezyCodex?.type, 'dynamicTool', 'activity did not pass through the DSH tool boundary')
}
if (!cancel) {
  assert.ok(finalText.trim(), 'No final assistant text was projected')
  assert.equal(latest.findLast(event => event.type === 'turn/end').data.reason.kind, 'completed')
}

const bindingFile = process.env.AEZY_CODEX_BINDING_FILE
  ?? join(process.env.DSH_HOME ?? join(homedir(), '.aezy', 'dsh'), 'aezy', 'codex-bindings.json')
const bindings = JSON.parse(await readFile(bindingFile, 'utf8'))
const binding = bindings.bindings?.[sessionId]
assert.equal(typeof binding?.threadId, 'string')
assert.equal(binding.cwd, cwd)
assert.equal(JSON.stringify(binding).match(/token|message|history/iu), null)

if (write) {
  assert.equal(await readFile(proofFile, 'utf8'), 'AEZY_CODEX_DSH_WRITE_OK\n')
  const response = await fetch(`${baseUrl}/aezy/api/project/ledger?${new URLSearchParams({ cwd, sessionId })}`, {
    headers: { 'X-Aezy-Client': 'web' },
    signal: AbortSignal.timeout(30_000),
  })
  const journal = await response.json()
  assert.equal(response.ok, true, JSON.stringify(journal))
  const journalTurn = journal.turns.find(turn => turn.files.some(file => file.path === 'codex-dsh-proof.txt'))
  assert.ok(journalTurn, 'Turn Journal did not record the Codex-backed file change')
  assert.equal(journalTurn.source, 'git')
  assert.equal(journalTurn.partial, false)
}

process.stdout.write(`${JSON.stringify({
  sessionId,
  provider: 'aezy-codex',
  model,
  threadBound: true,
  structuredCommandProjection: !resume && !cancel && !write,
  governedWriteAndJournal: write,
  restartResume: resume,
  cancelled: cancel,
  turnCompleted: !cancel,
}, null, 2)}\n`)
