import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  alphaMetadata,
  alphaRuntimeEnv,
  codexInspiredDogfoodEnabled,
  composeCodexPreset,
  profileManifest,
  validateOfficialFamilyManifest,
  verifyOfficialFamilyManifest,
  workspaceSettings,
} from './lib/alpha-runtime.mjs'
import {
  CODEX_INSPIRED_LOOP,
  CODEX_INSPIRED_PRESET_ID,
} from '../packages/aezy-workflow/src/system.js'

const one = '1'.repeat(64)

test('alpha npm family manifest pins the complete official rc.1 family', () => {
  const { manifest, manifestDigest, packages } = verifyOfficialFamilyManifest()
  assert.equal(manifestDigest, alphaMetadata.publication.familyManifestDigest)
  assert.equal(packages.size, 242)
  assert.equal(packages.get('@deepseek-ai/dsh').version, '0.1.2-rc.1')
  assert.equal(packages.get('@deepseek-ai/dsh').integrity, alphaMetadata.publication.rootIntegrity)
  assert.equal(manifest.packages.every(entry => entry.integrity.startsWith('sha512-')), true)
})

test('alpha npm family manifest rejects drift before installation', () => {
  const { manifest } = verifyOfficialFamilyManifest()
  const drifted = structuredClone(manifest)
  drifted.packages[1].name = drifted.packages[0].name
  assert.throws(() => validateOfficialFamilyManifest(
    drifted,
    alphaMetadata.publication.familyManifestDigest,
  ), /unique, sorted/)
  assert.throws(() => validateOfficialFamilyManifest(manifest, '0'.repeat(64)), /digest mismatch/)
})

test('alpha profile pins every DSH edge to one registry version and only Aezy to local tarballs', () => {
  const dsh = new Map([['@deepseek-ai/dsh', {
    name: '@deepseek-ai/dsh',
    version: '0.1.2-rc.1',
    integrity: 'sha512-root',
  }], ['@deepseek-ai/dsh-subprocess-local', {
    name: '@deepseek-ai/dsh-subprocess-local',
    version: '0.1.2-rc.1',
    integrity: 'sha512-subprocess',
  }]])
  const aezy = new Map([['@aezy/base', {
    name: '@aezy/base',
    path: '/tmp/aezy-base.tgz',
    digest: one,
  }]])
  const manifest = profileManifest(dsh, aezy)
  const workspace = workspaceSettings(dsh, aezy)
  assert.equal(workspace.overrides['@deepseek-ai/dsh'], '0.1.2-rc.1')
  assert.equal(workspace.overrides['@deepseek-ai/dsh-subprocess-local'], '0.1.2-rc.1')
  assert.equal(workspace.overrides.react, '18.3.1')
  assert.equal(workspace.overrides['react-dom'], '18.3.1')
  assert.match(workspace.overrides['@aezy/base'], /^file:\/\/\/tmp\/aezy-base\.tgz$/)
  assert.deepEqual(workspace.packages, ['.'])
  assert.equal(workspace.allowBuilds.koffi, true)
  assert.equal(workspace.allowBuilds['node-pty'], true)
  assert.equal(workspace.allowBuilds['@deepseek-ai/dsh-subprocess-local'], undefined)
  assert.equal(workspace.allowBuilds['@deepseek-ai/dsh-subprocess-local@0.1.2-rc.1'], true)
  assert.deepEqual(workspace.minimumReleaseAgeExclude, [
    '@deepseek-ai/dsh@0.1.2-rc.1',
    '@deepseek-ai/dsh-subprocess-local@0.1.2-rc.1',
  ])
  assert.equal(manifest.dependencies['@deepseek-ai/dsh'], '0.1.2-rc.1')
  assert.match(manifest.dependencies['@aezy/base'], /^file:\/\/\/tmp\/aezy-base\.tgz$/)
  assert.equal(Object.entries(manifest.dependencies).some(([name, spec]) => (
    name.startsWith('@deepseek-ai/dsh') && spec.startsWith('file:')
  )), false)
})

test('alpha runtime always enables Node env-proxy routing', () => {
  assert.equal(alphaRuntimeEnv().NODE_USE_ENV_PROXY, '1')
  assert.equal(alphaRuntimeEnv({ NODE_USE_ENV_PROXY: '0' }).NODE_USE_ENV_PROXY, '1')
  assert.equal(typeof alphaRuntimeEnv().HTTPS_PROXY, 'string')
  assert.equal(typeof alphaRuntimeEnv().https_proxy, 'string')
})

test('codex preset mounts its route fence after the authoritative DSH composition', () => {
  const composition = composeCodexPreset(
    "- id: session-model-selection\n  name: '@deepseek-ai/dsh-session-controller'\n",
    "- id: codex-app-server-mode\n  name: '@aezy/mode'\n",
  )
  assert.ok(composition.indexOf('session-model-selection') < composition.indexOf('codex-app-server-mode'))
  assert.equal(composition.endsWith('\n'), true)
})

test('codex-inspired stays absent by default and binds exact definition only for explicit dogfood', async () => {
  assert.equal(codexInspiredDogfoodEnabled({}), false)
  assert.equal(codexInspiredDogfoodEnabled({ AEZY_CODEX_INSPIRED_DOGFOOD: '0' }), false)
  assert.equal(codexInspiredDogfoodEnabled({ AEZY_CODEX_INSPIRED_DOGFOOD: '1' }), true)
  const [runtime, overlay] = await Promise.all([
    readFile(new URL('./lib/alpha-runtime.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../packages/aezy-workflow/presets/codex-inspired/overlay.cordis.yml', import.meta.url), 'utf8'),
  ])
  assert.match(runtime, /\['@aezy\/workflow', 'packages\/aezy-workflow', false\]/)
  assert.match(runtime, /if \(codexInspiredDogfoodEnabled\(\)\)/)
  assert.match(overlay, new RegExp(`digest: ${CODEX_INSPIRED_LOOP.digest}`))
  assert.match(overlay, new RegExp(`presetId: ${CODEX_INSPIRED_PRESET_ID}`))
  assert.match(overlay, /AEZY_CODEX_INSPIRED_DOGFOOD === '1'/)
  assert.doesNotMatch(overlay, /javascript|packageImport|promptTemplate|access[_-]?token|refresh[_-]?token/i)
})

test('alpha base activates the DSH-owned Codex subscription route and authorization seam', async () => {
  const patch = await readFile(new URL('../packages/aezy-base/cordis.patch.yml', import.meta.url), 'utf8')
  assert.match(patch, /- id: llm-pi-ai\n  config:\n    providers:\n      openai-codex: \{\}/)
  assert.match(patch, /- id: authorization\n      name: '@deepseek-ai\/dsh-authorization'/)
  assert.doesNotMatch(patch, /apiKeyEnv|access[_-]?token|refresh[_-]?token/i)
})

test('native provider OAuth launcher requires an explicit user-authorized switch', async () => {
  const launcher = await readFile(
    new URL('./authorize-alpha-native-provider.mjs', import.meta.url),
    'utf8',
  )
  assert.match(launcher, /AEZY_ALPHA_AUTHORIZE_NATIVE_PROVIDER !== '1'/)
  assert.match(launcher, /spawnSync\(alphaNodeBin/)
  assert.match(launcher, /'--use-env-proxy'/)
  assert.match(launcher, /AEZY_ALPHA_OAUTH_REEXEC: '1'/)
  assert.match(launcher, /realpathSync\(process\.execPath\) === realpathSync\(alphaNodeBin\)/)
  assert.match(launcher, /ctx\.authorization\.begin\(/)
  assert.match(launcher, /describeRecord\(key\)/)
  assert.doesNotMatch(launcher, /readRecord\(key\)|access[_-]?token|refresh[_-]?token/i)
})

test('native provider Turn gate keeps authentication opaque and uses the DSH control plane', async () => {
  const gate = await readFile(
    new URL('./verify-alpha-native-provider-turn.mjs', import.meta.url),
    'utf8',
  )
  assert.match(gate, /AEZY_ALPHA_GATE_TOKEN/)
  assert.match(gate, /api\/remote\.mux/)
  assert.match(gate, /event === 'approval\/request'/)
  assert.match(gate, /'\$events\/result'/)
  assert.match(gate, /value: 'allowed-once'/)
  assert.match(gate, /agentPreset: 'standard'/)
  assert.match(gate, /provider: 'openai-codex'/)
  assert.match(gate, /project\/ledger/)
  assert.doesNotMatch(gate, /readRecord|access[_-]?token|refresh[_-]?token/i)
})

test('codex-inspired Turn gate requires explicit dogfood and exact durable preset binding', async () => {
  const gate = await readFile(
    new URL('./verify-alpha-codex-inspired-turn.mjs', import.meta.url),
    'utf8',
  )
  assert.match(gate, /AEZY_CODEX_INSPIRED_DOGFOOD !== '1'/)
  assert.match(gate, /CODEX_INSPIRED_PRESET_ID/)
  assert.match(gate, /agentPreset: CODEX_INSPIRED_PRESET_ID/)
  assert.match(gate, /provider: 'openai-codex'/)
  assert.match(gate, /event\.type === 'request\/header'/)
  assert.match(gate, /event\.type === 'tool\/call' && event\.data\.name === 'read'/)
  assert.doesNotMatch(gate, /readRecord|access[_-]?token|refresh[_-]?token|provider:\s*['"]aezy-codex/)
})

test('codex-inspired governed write gate stays on DSH approval, Security and Journal owners', async () => {
  const gate = await readFile(
    new URL('./verify-alpha-codex-inspired-governed-write.mjs', import.meta.url),
    'utf8',
  )
  assert.match(gate, /AEZY_CODEX_INSPIRED_DOGFOOD !== '1'/)
  assert.match(gate, /agentPreset: CODEX_INSPIRED_PRESET_ID/)
  assert.match(gate, /provider: 'openai-codex'/)
  assert.match(gate, /event === 'approval\/request'/)
  assert.match(gate, /value: 'allowed-once'/)
  assert.match(gate, /tool: 'write'/)
  assert.match(gate, /event\.type === 'approval\/asked'/)
  assert.match(gate, /event\.type === 'approval\/decided'/)
  assert.match(gate, /event\.type === 'tool\/call' && event\.data\.name === 'write'/)
  assert.match(gate, /project\/ledger/)
  assert.match(gate, /project\/turn-review/)
  assert.doesNotMatch(gate, /readRecord|access[_-]?token|refresh[_-]?token/i)
})

test('Loop Inspector gate consumes only authenticated Session follow/page truth', async () => {
  const gate = await readFile(
    new URL('./verify-loop-inspector.mjs', import.meta.url),
    'utf8',
  )
  assert.match(gate, /AEZY_ALPHA_GATE_TOKEN/)
  assert.match(gate, /endpoint: 'session\/follow'/)
  assert.match(gate, /rpc\('session\/page'/)
  assert.match(gate, /projectLoopTrace/)
  assert.match(gate, /assert\.deepEqual\(live, cold\)/)
  assert.match(gate, /AEZY_INSPECTOR_RESTART/)
  assert.doesNotMatch(gate, /readRecord\(|ctx\.credentials|credentialStore/i)
})

test('alpha Web mounts the proportional layout policy without replacing DSH AppFrame', async () => {
  const [patch, runtime, policy, gate] = await Promise.all([
    readFile(new URL('../packages/aezy-web/cordis.patch.yml', import.meta.url), 'utf8'),
    readFile(new URL('./lib/alpha-runtime.mjs', import.meta.url), 'utf8'),
    readFile(new URL('../packages/aezy-layout/src/policy.js', import.meta.url), 'utf8'),
    readFile(new URL('./verify-layout-policy.mjs', import.meta.url), 'utf8'),
  ])
  assert.match(patch, /- id: aezy-layout\n      name: '@aezy\/layout'/)
  assert.doesNotMatch(patch, /- id: ui-layout\n  disabled: true/)
  assert.match(runtime, /\['@aezy\/layout', 'packages\/aezy-layout', true\]/)
  assert.match(policy, /CHAT_MIN_RATIO = 0\.25/)
  assert.match(policy, /DETAILS_MAX_RATIO = 1 - CHAT_MIN_RATIO/)
  assert.match(gate, /AEZY_ALPHA_GATE_TOKEN/)
  assert.match(gate, /Input\.dispatchMouseEvent/)
  assert.match(gate, /detailsRatio/)
  assert.match(gate, /Emulation\.setDeviceMetricsOverride/)
  assert.doesNotMatch(gate, /localStorage|indexedDB|access[_-]?token|refresh[_-]?token/i)
})
