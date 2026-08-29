import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  composeCodexPreset,
  parseSha256Manifest,
  profileManifest,
  workspaceSettings,
} from './lib/alpha-runtime.mjs'

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

test('codex preset mounts its route fence after the authoritative DSH composition', () => {
  const composition = composeCodexPreset(
    "- id: session-model-selection\n  name: '@deepseek-ai/dsh-session-controller'\n",
    "- id: codex-app-server-mode\n  name: '@aezy/mode'\n",
  )
  assert.ok(composition.indexOf('session-model-selection') < composition.indexOf('codex-app-server-mode'))
  assert.equal(composition.endsWith('\n'), true)
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
  assert.match(launcher, /ctx\.authorization\.begin\(/)
  assert.match(launcher, /describeRecord\(key\)/)
  assert.doesNotMatch(launcher, /readRecord\(key\)|access[_-]?token|refresh[_-]?token/i)
})
