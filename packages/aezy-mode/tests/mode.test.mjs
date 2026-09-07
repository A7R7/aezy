import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import {
  apply,
  CODEX_APP_SERVER_PRESET,
  CODEX_PROVIDER,
} from '../src/index.js'

function mounted(config, preset = CODEX_APP_SERVER_PRESET) {
  let handler = null
  const ctx = {
    agents: { currentInitiator: () => ({ session: { header: { agentPreset: preset } } }) },
    on(event, callback) {
      assert.equal(event, config.surfaceOnly ? 'llm/stream' : 'agent/request')
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

test('root dispatch fence checks only the final route of Codex sessions', () => {
  const handler = mounted({ surfaceOnly: true })
  assert.equal(handler({ provider: CODEX_PROVIDER }, () => 'stream'), 'stream')
  assert.throws(() => handler({ provider: 'deepseek-official' }, () => 'wrong'), /requires provider aezy-codex/)
  assert.equal(mounted({ surfaceOnly: true }, 'standard')({ provider: 'deepseek-official' }, () => 'native'), 'native')
})

test('default-export plugin retains its dependency grant in a real Cordis context', async () => {
  const require = createRequire(import.meta.url)
  const resolver = createRequire(require.resolve('@deepseek-ai/dsh/package.json'))
  const { Context } = await import(pathToFileURL(resolver.resolve('@deepseek-ai/cordis')).href)
  const ctx = new Context()
  try {
    ctx.provide('agents', { currentInitiator: () => ({ session: { header: { agentPreset: CODEX_APP_SERVER_PRESET } } }) })
    await ctx.plugin(apply, { surfaceOnly: true })
    assert.equal(ctx.waterfall('llm/stream', { provider: CODEX_PROVIDER }, () => 'owned-stream'), 'owned-stream')
    assert.throws(() => ctx.waterfall('llm/stream', { provider: 'deepseek-official' }, () => 'wrong-stream'), /requires provider aezy-codex/)
  } finally { await ctx.fiber.dispose() }
})

test('standing preset validates ownership without rejecting the pre-selection model seed', async () => {
  const handler = mounted({ enforceCodex: true })
  assert.equal(typeof handler, 'function')
  const accepted = request(CODEX_PROVIDER)
  assert.deepEqual(await handler(accepted.input, accepted.next), {
    provider: CODEX_PROVIDER,
    model: 'gpt-5.6-sol',
  })

  const wrongProvider = request('deepseek')
  assert.equal((await handler(wrongProvider.input, wrongProvider.next)).provider, 'deepseek')

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

test('client resolves model identities while retaining an engine compatibility fence', async () => {
  const source = await readFile(new URL('../src/client/index.tsx', import.meta.url), 'utf8')
  assert.match(source, /resolveModelDirectory/)
  assert.match(source, /engineForProvider\(selection.provider\) !== engineForPreset\(preset,/)
  assert.match(source, /name: 'conversation\.input\.model'/)
  assert.match(source, /name: 'model'/)
  assert.doesNotMatch(source, /codex-inspired/)
  const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.doesNotMatch(bundle, /require\(["']@deepseek-ai\/dsh-client-store["']\)/)
})
