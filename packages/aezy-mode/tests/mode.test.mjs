import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  apply,
  CODEX_APP_SERVER_PRESET,
  CODEX_PROVIDER,
} from '../src/index.js'

function mounted(config) {
  let handler = null
  const ctx = {
    on(event, callback) {
      assert.equal(event, 'agent/request')
      handler = callback
    },
  }
  apply(ctx, config)
  return handler
}

function request(provider, agentPreset = CODEX_APP_SERVER_PRESET) {
  return {
    input: { agent: { session: { header: { agentPreset } } } },
    next: async () => ({ provider, model: 'gpt-5.6-sol' }),
  }
}

test('root surface instance does not install a request hook', () => {
  assert.equal(mounted({ surfaceOnly: true }), null)
})

test('codex-app-server fence accepts only the Aezy Codex provider in its owning preset', async () => {
  const handler = mounted({ enforceCodex: true })
  assert.equal(typeof handler, 'function')
  const accepted = request(CODEX_PROVIDER)
  assert.deepEqual(await handler(accepted.input, accepted.next), {
    provider: CODEX_PROVIDER,
    model: 'gpt-5.6-sol',
  })

  const wrongProvider = request('deepseek')
  await assert.rejects(() => handler(wrongProvider.input, wrongProvider.next), /requires provider aezy-codex/)

  const wrongPreset = request(CODEX_PROVIDER, 'standard')
  await assert.rejects(() => handler(wrongPreset.input, wrongPreset.next), /outside its owning preset/)
})

test('mode package ships only the clickable codex-app-server system preset', async () => {
  const preset = await readFile(new URL('../presets/codex-app-server/preset.yml', import.meta.url), 'utf8')
  const composition = await readFile(new URL('../presets/codex-app-server/overlay.cordis.yml', import.meta.url), 'utf8')
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  assert.match(preset, /^name: Codex App Server/m)
  assert.match(composition, /name: '@aezy\/mode'/)
  assert.match(composition, /enforceCodex: true/)
  assert.match(patch, /id: ui-agent-preset/)
  assert.match(patch, /id: ui-model-selection\n  disabled: true/)
  assert.doesNotMatch(`${preset}\n${composition}\n${patch}`, /codex-inspired/)
})

test('client projection filters Codex bidirectionally and owns the replacement model surface', async () => {
  const source = await readFile(new URL('../src/client/index.tsx', import.meta.url), 'utf8')
  assert.match(source, /group\.id === CODEX_PROVIDER\) === codexMode/)
  assert.match(source, /selection\.provider === CODEX_PROVIDER\) !== codexMode/)
  assert.match(source, /name: 'conversation\.input\.model'/)
  assert.match(source, /name: 'model'/)
  assert.doesNotMatch(source, /codex-inspired/)
  const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.doesNotMatch(bundle, /require\(["']@deepseek-ai\/dsh-client-store["']\)/)
})
