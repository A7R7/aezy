import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { alphaProfileDir } from './lib/alpha-runtime.mjs'

const launchToken = process.env.AEZY_ALPHA_GATE_TOKEN
if (!launchToken) throw new Error('AEZY_ALPHA_GATE_TOKEN is required for the authenticated E1 gate')
const baseUrl = process.env.AEZY_ALPHA_GATE_URL ?? 'http://127.0.0.1:3091'
const requireFromProfile = createRequire(join(alphaProfileDir, 'package.json'))
const packagePath = requireFromProfile.resolve('@aezy/workflow/package.json')
const packageManifest = JSON.parse(await readFile(packagePath, 'utf8'))
assert.equal(packageManifest.name, '@aezy/workflow')
assert.equal(packageManifest.dsh?.client?.platform, 'web')
assert.equal(packageManifest.dsh?.client?.inject?.includes('@deepseek-ai/dsh-client-ui-settings'), true)

const workflow = await import(pathToFileURL(requireFromProfile.resolve('@aezy/workflow')).href)
const definition = workflow.CODEX_INSPIRED_DEFINITION
assert.equal(definition.body.id, 'codex-inspired')
assert.equal(definition.trust, 'system')
assert.equal(workflow.loopDefinitionDigest(definition.body), definition.digest)

const capabilities = Object.fromEntries([
  ...definition.body.backend.capabilities,
  'durable-definition-binding',
].map(capability => [capability, true]))
capabilities['durable-definition-binding'] = false
const resolution = workflow.resolveLoopCapabilities(definition, {
  backend: 'dsh-native', capabilities,
}, { stage: 'E1' })
assert.equal(resolution.ok, false)
assert.equal(resolution.executable, false)
assert.deepEqual(resolution.missing, ['durable-definition-binding'])

const bootstrap = await fetch(`${baseUrl}/?token=${encodeURIComponent(launchToken)}`, {
  redirect: 'manual', signal: AbortSignal.timeout(15_000),
})
assert.equal(bootstrap.status, 303)
const setCookie = bootstrap.headers.get('set-cookie')
assert.ok(setCookie)
const cookie = setCookie.split(';', 1)[0]
const indexResponse = await fetch(`${baseUrl}/`, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(15_000) })
const index = await indexResponse.text()
assert.equal(indexResponse.ok, true)
assert.equal(index.includes('@aezy/workflow'), true)
async function webRequest(path, init = {}) {
  const headers = new Headers(init.headers)
  headers.set('Cookie', cookie)
  headers.set('x-aezy-client', 'web')
  if (init.body !== undefined) headers.set('content-type', 'application/json')
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, signal: AbortSignal.timeout(30_000) })
  const value = await response.json()
  assert.equal(response.ok, true, JSON.stringify(value))
  return value
}

const before = await webRequest('/aezy/api/workflows')
assert.equal(before.executionAvailable, false)
assert.equal(before.templates.some(template => template.id === 'codex-inspired'), true)
const boundedTemplate = before.templates.find(template => template.id === 'bounded-review')
assert.ok(boundedTemplate)
for (const kind of ['condition', 'parallel', 'subagent', 'bounded-retry']) {
  assert.equal(boundedTemplate.nodes.some(node => node.type === kind), true)
}
const gateId = 'e2-template-gate'
const draft = {
  id: gateId,
  name: 'E2 Template Gate',
  description: 'Durable immutable template publishing gate.',
  budgets: { maxIterations: 4, maxWallTimeMs: 120_000, maxTokens: 16_000, maxToolCalls: 12 },
}
let gateRevision = before.revisions.find(item => item.body.id === gateId)
if (gateRevision === undefined) {
  const preview = await webRequest('/aezy/api/workflows/preview', {
    method: 'POST', body: JSON.stringify({ templateId: 'codex-inspired', draft }),
  })
  assert.equal(preview.resolution.executable, false)
  assert.deepEqual(preview.resolution.missing, ['durable-definition-binding'])
  const published = await webRequest('/aezy/api/workflows/publish', {
    method: 'POST', body: JSON.stringify({ templateId: 'codex-inspired', draft, expectedRevision: 0 }),
  })
  gateRevision = published.revision
}
const after = await webRequest('/aezy/api/workflows')
assert.equal(after.revisions.some(item => item.body.id === gateId && item.digest === gateRevision.digest), true)

const e3Id = 'e3-bounded-gate'
const e3Draft = {
  id: e3Id,
  name: 'E3 Bounded Gate',
  description: 'Structured bounded control-flow publishing gate.',
  budgets: { maxIterations: 6, maxWallTimeMs: 900_000, maxTokens: 80_000, maxToolCalls: 64 },
}
let e3Revision = after.revisions.find(item => item.body.id === e3Id)
if (e3Revision === undefined) {
  const preview = await webRequest('/aezy/api/workflows/preview', {
    method: 'POST', body: JSON.stringify({ templateId: 'bounded-review', draft: e3Draft }),
  })
  assert.equal(preview.resolution.executable, false)
  assert.deepEqual(preview.resolution.missing, [
    'bounded-retry', 'durable-definition-binding', 'parallel', 'structured-facts',
  ])
  const published = await webRequest('/aezy/api/workflows/publish', {
    method: 'POST', body: JSON.stringify({ templateId: 'bounded-review', draft: e3Draft, expectedRevision: 0 }),
  })
  e3Revision = published.revision
}
const finalSnapshot = await webRequest('/aezy/api/workflows')
assert.equal(finalSnapshot.revisions.some(item => item.body.id === e3Id && item.digest === e3Revision.digest), true)

const response = await fetch(`${baseUrl}/api/agentPresets/list`, {
  method: 'POST',
  headers: { Cookie: cookie, 'content-type': 'application/json' },
  body: JSON.stringify({
    type: 'client-request',
    rpcId: 'e1-loop-definition-roster',
    method: 'agentPresets/list',
    payload: { args: {} },
  }),
  signal: AbortSignal.timeout(30_000),
})
const envelope = await response.json()
assert.equal(response.ok && envelope.result?.ok === true, true, JSON.stringify(envelope.result?.error ?? envelope))
const roster = envelope.result.value
assert.equal(roster.presets.some(preset => preset.id === 'codex-inspired'), false)

process.stdout.write(`${JSON.stringify({
  installedPackage: packageManifest.name,
  definition: { id: definition.body.id, revision: definition.revision, digest: definition.digest },
  resolution: { executable: resolution.executable, missing: resolution.missing },
  templateEditor: { published: `${gateRevision.body.id}@${String(gateRevision.revision)}`, digest: gateRevision.digest },
  boundedControlFlow: { published: `${e3Revision.body.id}@${String(e3Revision.revision)}`, digest: e3Revision.digest, executable: false },
  webIndex: { bytes: Buffer.byteLength(index), workflowBundle: true },
  clickablePreset: false,
}, null, 2)}\n`)
