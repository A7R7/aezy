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
assert.equal(packageManifest.dsh, undefined, 'E1 definition package must not mount a Host or Client plugin')

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
  clickablePreset: false,
}, null, 2)}\n`)
