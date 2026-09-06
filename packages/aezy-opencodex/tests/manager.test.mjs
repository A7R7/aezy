import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { OpenCodexManager } from '../src/manager.js'
import { providerEndpoint } from '../src/gateway.js'
import { createCatalog, BASE_INSTRUCTIONS } from '../src/catalog.js'
import * as plugin from '../src/index.js'
import { privateDirectory } from '@aezy/codex/runtime-instance'
const { resolveDeepSeek } = plugin

test('provider endpoint rejects credential-bearing URLs and retains explicit base paths', () => {
  assert.equal(providerEndpoint('https://api.deepseek.com/'), 'https://api.deepseek.com/chat/completions')
  assert.equal(providerEndpoint('https://provider.example/v1'), 'https://provider.example/v1/chat/completions')
  for (const url of ['file:///tmp/foo', 'https://key@example.com', 'https://example.com?key=test']) assert.throws(() => providerEndpoint(url), /invalid_provider_endpoint/)
})

test('Aezy owns a narrow catalog, with no vendor CLI, prompts or inflated capabilities', () => {
  const row = createCatalog(['deepseek-v4-flash']).models[0]
  assert.deepEqual(row.input_modalities, ['text'])
  assert.equal(row.base_instructions, BASE_INSTRUCTIONS)
  assert.equal(row.supports_search_tool, false)
  assert.equal(row.node_repl_disabled, true)
  assert.throws(() => createCatalog(['unknown']), /Unsupported/)
  assert.throws(() => createCatalog(['deepseek-v4-flash', 'deepseek-v4-flash']), /Unsupported/)
})

test('DeepSeek resolution uses public DSH settings and credential reference only', async () => {
  const refs = []
  const ctx = {
    get: () => undefined,
    settings: { get: name => { assert.equal(name, 'llm-deepseek'); return { apiKeyEnv: 'TEST_KEY' } } },
    credentials: { resolve: async ref => { refs.push(ref); return { value: 'test-secret', source: 'file' } } },
  }
  const result = await resolveDeepSeek(ctx)
  assert.deepEqual(refs, ['TEST_KEY'])
  assert.equal(result.apiKey, 'test-secret')
  assert.deepEqual(result.models, ['deepseek-v4-flash', 'deepseek-v4-pro'])
  assert.equal(result.credentialSource, 'DSH credentials (file)')
  ctx.credentials.resolve = async () => undefined
  await assert.rejects(resolveDeepSeek(ctx), /credential is unavailable/)
})

test('missing credential fails closed before spawning or persisting a configuration', async t => {
  const dshHome = await mkdtemp('/tmp/aezy-gateway-test-')
  t.after(() => rm(dshHome, { recursive: true, force: true }))
  const manager = new OpenCodexManager({ dshHome })
  await assert.rejects(manager.start({}), /no personal fallback/)
  assert.equal(manager.server, null)
  await assert.rejects(readFile(`${manager.root}/config.json`), { code: 'ENOENT' })
})

test('a second owner cannot overwrite configuration or remove the first owner lock', async t => {
  const dshHome = await mkdtemp('/tmp/aezy-gateway-lock-test-')
  t.after(() => rm(dshHome, { recursive: true, force: true }))
  const manager = new OpenCodexManager({ dshHome })
  await privateDirectory(manager.root)
  const lock = `${manager.root}/aezy-owner.lock`
  await writeFile(lock, 'existing-owner')
  await assert.rejects(manager.start({ apiKey: 'test' }), { code: 'EEXIST' })
  assert.equal(await readFile(lock, 'utf8'), 'existing-owner')
  assert.equal(manager.server, null)
})

test('actual Cordis service mounts and disposes even when credentials are missing', async () => {
  const require = createRequire(import.meta.url)
  const resolver = createRequire(require.resolve('@deepseek-ai/dsh/package.json'))
  const { Context } = await import(pathToFileURL(resolver.resolve('@deepseek-ai/cordis')).href)
  const ctx = new Context()
  try {
    ctx.provide('credentials', { resolve: async () => undefined })
    ctx.provide('settings', { get: () => ({}) })
    await ctx.plugin(plugin)
    await assert.rejects(ctx.aezyOpenCodex.ready, /credential is unavailable/)
    assert.equal(ctx.aezyOpenCodex.status().owner, 'aezy')
  } finally { await ctx.fiber.dispose() }
})
