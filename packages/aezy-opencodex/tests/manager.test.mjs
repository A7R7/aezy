import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { gatewayConfig, OpenCodexManager, selectCatalog } from '../src/manager.js'
import * as plugin from '../src/index.js'
import { privateDirectory } from '@aezy/codex/runtime-instance'
const { resolveDeepSeek } = plugin

test('managed gateway enables only explicit DeepSeek models and no personal integrations', () => {
  const config = gatewayConfig({ baseURL: 'https://api.deepseek.com', models: ['deepseek-v4-flash'] })
  assert.deepEqual(Object.keys(config.providers), ['deepseek'])
  assert.equal(config.providers.deepseek.apiKey, '${AEZY_OPENCODEX_PROVIDER_API_KEY}')
  assert.equal(config.providers.deepseek.codexToolMode, 'shell')
  assert.equal(config.codexAutoStart, false)
  assert.equal(config.codexShimAutoRestore, false)
  assert.equal(config.syncResumeHistory, false)
  assert.equal(config.agentTaskRecovery.enabled, false)
  assert.deepEqual(config.subagentModels, [])
  assert.throws(() => gatewayConfig({ baseURL: 'https://key@example.com', models: ['x'] }), /embedded credentials/)
  assert.throws(() => gatewayConfig({ baseURL: 'https://example.com', models: [] }), /explicit/)
})

test('catalog filters official generated data without reimplementing prompt templates', () => {
  const row = { slug: 'deepseek/x', model_messages: { base_instructions: 'vendor prompt' } }
  assert.deepEqual(selectCatalog({ models: [row, { slug: 'openai/y' }] }, ['x']).models, [row])
  assert.throws(() => selectCatalog({ models: [] }, ['x']), /exactly/)
  assert.throws(() => selectCatalog({ models: [row, row] }, ['x']), /exactly/)
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
  assert.equal(manager.children.size, 0)
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
  assert.equal(manager.children.size, 0)
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
