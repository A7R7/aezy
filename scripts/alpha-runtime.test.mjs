import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  alphaRuntimeEnv,
  codexInspiredDogfoodEnabled,
  composeCodexPreset,
  parseSha256Manifest,
  profileManifest,
  workspaceSettings,
} from './lib/alpha-runtime.mjs'
import {
  CODEX_INSPIRED_LOOP,
  CODEX_INSPIRED_PRESET_ID,
} from '../packages/aezy-workflow/src/system.js'

const zero = '0'.repeat(64)
const one = '1'.repeat(64)

test('alpha artifact manifest accepts sorted family tarballs', () => {
  assert.deepEqual(parseSha256Manifest([
    `${zero}  dsh/a.tgz`,
    `${one}  vendor/b.tgz`,
    '',
  ].join('\n')), [
    { digest: zero, relativePath: 'dsh/a.tgz' },
    { digest: one, relativePath: 'vendor/b.tgz' },
  ])
})

test('alpha artifact manifest rejects traversal and unstable order', () => {
  assert.throws(() => parseSha256Manifest(`${zero}  dsh/../a.tgz\n`), /Invalid/)
  assert.throws(() => parseSha256Manifest([
    `${zero}  vendor/b.tgz`,
    `${one}  dsh/a.tgz`,
  ].join('\n')), /sorted/)
})

test('alpha profile pins transitive workspace edges to local tarballs', () => {
  const dsh = new Map([['@deepseek-ai/dsh', {
    name: '@deepseek-ai/dsh',
    path: '/tmp/dsh.tgz',
    digest: zero,
  }], ['@deepseek-ai/dsh-subprocess-local', {
    name: '@deepseek-ai/dsh-subprocess-local',
    path: '/tmp/dsh-subprocess-local.tgz',
    digest: zero,
  }]])
  const aezy = new Map([['@aezy/base', {
    name: '@aezy/base',
    path: '/tmp/aezy-base.tgz',
    digest: one,
  }]])
  const manifest = profileManifest(dsh, aezy)
  const workspace = workspaceSettings(manifest.dependencies)
  assert.deepEqual(workspace.overrides, manifest.dependencies)
  assert.deepEqual(workspace.packages, ['.'])
  assert.equal(workspace.allowBuilds.koffi, true)
  assert.equal(workspace.allowBuilds['node-pty'], true)
  assert.equal(workspace.allowBuilds['@deepseek-ai/dsh-subprocess-local'], undefined)
  assert.equal(Object.entries(workspace.allowBuilds).some(([selector, allowed]) => (
    selector.startsWith('@deepseek-ai/dsh-subprocess-local@file:') && allowed === true
  )), true)
  assert.match(manifest.dependencies['@deepseek-ai/dsh'], /^file:\/\/\/tmp\/dsh\.tgz$/)
})

test('alpha runtime always enables Node env-proxy routing', () => {
  assert.equal(alphaRuntimeEnv().NODE_USE_ENV_PROXY, '1')
  assert.equal(alphaRuntimeEnv({ NODE_USE_ENV_PROXY: '0' }).NODE_USE_ENV_PROXY, '1')
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
