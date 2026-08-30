import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  CODEX_INSPIRED_LOOP,
  CODEX_INSPIRED_PRESET_ID,
} from '../packages/aezy-workflow/src/system.js'

const baseUrl = process.env.AEZY_ALPHA_GATE_URL ?? 'http://127.0.0.1:3091'
const launchToken = process.env.AEZY_ALPHA_GATE_TOKEN
const resumeSessionId = process.env.AEZY_CODEX_INSPIRED_RESUME_SESSION
const resumeFixture = process.env.AEZY_CODEX_INSPIRED_FIXTURE
const keepFixture = process.env.AEZY_CODEX_INSPIRED_KEEP_FIXTURE === '1'
const cleanupFixture = process.env.AEZY_CODEX_INSPIRED_CLEANUP_FIXTURE === '1'
if (!launchToken) throw new Error('AEZY_ALPHA_GATE_TOKEN is required for the authenticated codex-inspired gate')
if (process.env.AEZY_CODEX_INSPIRED_DOGFOOD !== '1') {
  throw new Error('AEZY_CODEX_INSPIRED_DOGFOOD=1 is required for the internal codex-inspired gate')
}

const bootstrap = await fetch(`${baseUrl}/?token=${encodeURIComponent(launchToken)}`, {
  redirect: 'manual',
  signal: AbortSignal.timeout(15_000),
})
assert.equal(bootstrap.status, 303)
const setCookie = bootstrap.headers.get('set-cookie')
assert.ok(setCookie, '3091 bootstrap returned no signed cookie')
const cookie = setCookie.split(';', 1)[0]

const resumed = resumeSessionId !== undefined || resumeFixture !== undefined
if (resumed && (!resumeSessionId || !resumeFixture)) {
  throw new Error('resume requires both AEZY_CODEX_INSPIRED_RESUME_SESSION and AEZY_CODEX_INSPIRED_FIXTURE')
}
const fixture = resumed ? resolve(resumeFixture) : await mkdtemp('/tmp/aezy-codex-inspired-')
if (!fixture.startsWith('/tmp/aezy-codex-inspired-')) {
  throw new Error('codex-inspired gate fixture must be a disposable /tmp/aezy-codex-inspired-* directory')
}
const sessionId = resumeSessionId ?? `aezy-codex-inspired-${Date.now().toString(36)}`
const expectedMarker = resumed ? 'CODEX_INSPIRED_RESUME_OK' : 'CODEX_INSPIRED_LOOP_OK'
const probeName = resumed ? 'resume-probe.txt' : 'loop-probe.txt'
let rpcSequence = 0

function headers(extra = {}) {
  return { Cookie: cookie, ...extra }
}

async function rpc(method, args, timeoutMs = 30_000) {
  rpcSequence += 1
  const response = await fetch(`${baseUrl}/api/${method}`, {
    method: 'POST',
    headers: headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({
      type: 'client-request',
      rpcId: `codex-inspired-${String(rpcSequence)}`,
      method,
      payload: { args },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const envelope = await response.json()
  assert.equal(response.ok && envelope.result?.ok === true, true,
    `${method}: ${JSON.stringify(envelope.result?.error ?? envelope)}`)
  return envelope.result.value
}

async function sessionSummary() {
  const listed = await rpc('session/list', { _request: {} })
  return listed.items.find(item => item.sessionId === sessionId)
}

async function sessionEvents(asOfSeq) {
  const page = await rpc('session/page', {
    request: {
      address: { kind: 'session', sessionId },
      throughSeq: asOfSeq,
      maxMessages: 240,
    },
  })
  return page.records.filter(record => record.type === 'event').map(record => record.event)
}

try {
  let turnsBefore = 0
  if (resumed) {
    const before = await sessionSummary()
    assert.ok(before, 'codex-inspired Session was not restored after Host restart')
    assert.equal(before.projections.values.agentPreset, CODEX_INSPIRED_PRESET_ID)
    turnsBefore = before.projections.values.sessionStats?.turns ?? 0
    assert.ok(turnsBefore >= 1, 'restored codex-inspired Session has no completed first Turn')
  } else {
    const workspace = await rpc('workspace/create', { request: { path: fixture } })
    await rpc('session/create', { request: {
      workspaceId: workspace.workspace.workspaceId,
      sessionId,
      agentPreset: CODEX_INSPIRED_PRESET_ID,
    } })
    await rpc('session/selectModel', { request: {
      sessionId,
      provider: 'openai-codex',
      model: 'gpt-5.6-sol',
      reasoningEffort: 'low',
    } })
  }
  await writeFile(join(fixture, probeName), `${expectedMarker}\n`)
  await rpc('session/prompt', { request: {
    requestId: `${sessionId}-${resumed ? 'resume' : 'initial'}-prompt`,
    sessionId,
    mode: 'queue',
    content: [{
      type: 'text',
      text: [
        `Use the structured read tool exactly once to read ${probeName}.`,
        'Do not use shell or any other tool.',
        `Reply with exactly ${expectedMarker} after the read succeeds.`,
      ].join(' '),
    }],
    clientTimeZone: 'Asia/Shanghai',
  } })

  const deadline = Date.now() + 240_000
  let summary
  while (Date.now() < deadline) {
    summary = await sessionSummary()
    if (summary?.running === false && summary.blank === false
      && (summary.projections?.values?.sessionStats?.turns ?? 0) >= turnsBefore + 1) break
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert.ok(summary, 'codex-inspired Session disappeared')
  assert.equal(summary.running, false, 'codex-inspired Turn did not settle')
  assert.equal(summary.projections.values.agentPreset, CODEX_INSPIRED_PRESET_ID)

  const events = await sessionEvents(summary.projections.asOfSeq)
  const requestHeader = events.findLast(event => event.type === 'request/header')
  const readCall = events.findLast(event => event.type === 'tool/call' && event.data.name === 'read')
  const readResult = events.find(event => event.type === 'tool/result'
    && event.data.message?.source?.callId === readCall?.data.callId)
  const assistants = events.filter(event => event.type === 'assistant/message')
  const visible = assistants.flatMap(event => event.data.message?.content ?? [])
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')

  assert.equal(requestHeader?.data.header.config.provider, 'openai-codex')
  assert.equal(requestHeader?.data.header.config.model, 'gpt-5.6-sol')
  assert.match(requestHeader?.data.header.system ?? '', /Codex-inspired execution policy:/)
  assert.ok(readCall, 'codex-inspired model did not issue a structured DSH read')
  assert.ok(readResult, 'codex-inspired structured read produced no durable result')
  assert.match(visible, new RegExp(expectedMarker))
  assert.equal(events.some(event => event.type === 'turn/end'
    && event.data.reason?.kind === 'completed'), true)

  const selection = summary.projections.values.modelSelection
  const usage = summary.projections.values.tokenUsage
  assert.equal(selection.lastUsed.provider, 'openai-codex')
  assert.equal(selection.lastUsed.model, 'gpt-5.6-sol')
  assert.equal((usage.uncachedInputTokens ?? 0) + (usage.cacheReadTokens ?? 0) > 0, true)
  assert.equal(usage.outputTokens > 0, true)

  process.stdout.write(`${JSON.stringify({
    sessionId,
    definition: {
      id: CODEX_INSPIRED_LOOP.body.id,
      revision: CODEX_INSPIRED_LOOP.revision,
      digest: CODEX_INSPIRED_LOOP.digest,
      presetId: CODEX_INSPIRED_PRESET_ID,
    },
    provider: selection.lastUsed.provider,
    model: selection.lastUsed.model,
    fixture,
    resumed,
    turns: summary.projections.values.sessionStats.turns,
    structuredRead: true,
    policyHeader: true,
    usage,
    turnCompleted: true,
  }, null, 2)}\n`)
} finally {
  if ((!resumed && !keepFixture) || (resumed && cleanupFixture)) {
    await rm(fixture, { recursive: true, force: true })
  }
}
