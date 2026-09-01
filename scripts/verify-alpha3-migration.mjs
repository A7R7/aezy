import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { CODEX_INSPIRED_PRESET_ID } from '../packages/aezy-workflow/src/system.js'

const baseUrl = process.env.AEZY_ALPHA_GATE_URL ?? 'http://127.0.0.1:3091'
const launchToken = process.env.AEZY_ALPHA_GATE_TOKEN
if (!launchToken) throw new Error('AEZY_ALPHA_GATE_TOKEN is required for the alpha.3 migration gate')
const restart = process.env.AEZY_ALPHA3_RESTART === '1'
const snapshotPath = process.env.AEZY_ALPHA3_SNAPSHOT ?? '/tmp/aezy-alpha3-migration-sessions.json'

const bootstrap = await fetch(`${baseUrl}/?token=${encodeURIComponent(launchToken)}`, {
  redirect: 'manual',
  signal: AbortSignal.timeout(15_000),
})
assert.equal(bootstrap.status, 303)
const setCookie = bootstrap.headers.get('set-cookie')
assert.ok(setCookie, 'alpha.3 bootstrap returned no signed cookie')
const cookie = setCookie.split(';', 1)[0]
let rpcSequence = 0

async function rpcEnvelope(method, args) {
  rpcSequence += 1
  const response = await fetch(`${baseUrl}/api/${method}`, {
    method: 'POST',
    headers: { Cookie: cookie, 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId: `alpha3-migration-${String(rpcSequence)}`,
      method,
      payload: { args },
    }),
    signal: AbortSignal.timeout(30_000),
  })
  const envelope = await response.json()
  assert.equal(response.ok, true, `${method} transport failed with HTTP ${String(response.status)}`)
  return envelope
}

async function rpc(method, args) {
  const envelope = await rpcEnvelope(method, args)
  assert.equal(envelope.result?.ok, true, `${method}: ${JSON.stringify(envelope.result?.error ?? envelope)}`)
  return envelope.result.value
}

const authenticatedIndex = await fetch(baseUrl, {
  headers: { Cookie: cookie },
  signal: AbortSignal.timeout(15_000),
})
assert.equal(authenticatedIndex.status, 200)
const html = await authenticatedIndex.text()
for (const client of [
  '@aezy/brand',
  '@aezy/codex',
  '@aezy/inspector',
  '@aezy/layout',
  '@aezy/mode',
  '@aezy/project',
  '@aezy/security',
  '@aezy/terminal',
]) assert.equal(html.includes(`"id":"${client}"`), true, `Web index is missing ${client}`)

const presets = await rpc('agentPresets/list', {})
const presetIds = presets.presets.map(preset => preset.id)
for (const id of ['standard', 'codex-app-server', CODEX_INSPIRED_PRESET_ID]) {
  assert.equal(presetIds.includes(id), true, `agent preset ${id} is absent`)
}
const catalog = await rpc('session/modelCatalog', {})
const openaiCodex = catalog.groups.find(group => group.id === 'openai-codex')
assert.ok(openaiCodex, 'openai-codex is absent from the routable model catalog')
assert.equal(openaiCodex.models.some(model => model.id === 'gpt-5.6-sol'), true)

let snapshot
if (restart) {
  snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'))
} else {
  const workspace = await rpc('workspace/create', { request: { path: process.cwd() } })
  const nonce = Date.now().toString(36)
  snapshot = {
    workspaceId: workspace.workspace.workspaceId,
    sessions: [
      { id: `aezy-alpha3-standard-${nonce}`, preset: 'standard' },
      { id: `aezy-alpha3-app-server-${nonce}`, preset: 'codex-app-server' },
      { id: `aezy-alpha3-codex-inspired-${nonce}`, preset: CODEX_INSPIRED_PRESET_ID },
    ],
  }
  for (const session of snapshot.sessions) {
    await rpc('session/create', { request: {
      workspaceId: snapshot.workspaceId,
      sessionId: session.id,
      agentPreset: session.preset,
    } })
  }
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 })
}

const listed = await rpc('session/list', { _request: {} })
for (const session of snapshot.sessions) {
  const summary = listed.items.find(item => item.sessionId === session.id)
  assert.ok(summary, `${session.id} did not survive ${restart ? 'restart' : 'creation'}`)
  assert.equal(summary.projections.values.agentPreset, session.preset)
  const page = await rpc('session/page', {
    request: {
      address: { kind: 'session', sessionId: session.id },
      throughSeq: summary.projections.asOfSeq,
      maxMessages: 1,
    },
  })
  assert.equal(Array.isArray(page.records), true)
  assert.equal(typeof page.hasMore, 'boolean')
  assert.equal(page.records.every(record => record.event.seq <= summary.projections.asOfSeq), true)
}

const missing = await rpcEnvelope('session/page', {
  request: {
    address: { kind: 'session', sessionId: 'aezy-alpha3-intentionally-missing' },
    maxMessages: 1,
  },
})
assert.equal(missing.result?.ok, false, 'missing Session unexpectedly succeeded')
assert.equal(typeof missing.result.error?.code, 'string', 'RemoteError code is absent')

process.stdout.write(`${JSON.stringify({
  runtime: '0.1.2-alpha.3',
  restart,
  webClients: 8,
  presets: presetIds,
  openaiCodexModels: openaiCodex.models.map(model => model.id),
  sessions: snapshot.sessions,
  persistence: restart ? 'restart-equal' : 'created',
  historyPage: true,
  remoteError: missing.result.error.code,
}, null, 2)}\n`)
