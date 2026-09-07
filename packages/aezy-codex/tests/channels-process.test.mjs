import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import test from 'node:test'
import { CodexAppServerClient } from '../src/app-server-client.js'
import { prepareCodexRuntime } from '../src/runtime-instance.js'
import { readCodexModels } from '../src/model-catalog.js'

test('official GPT process owns separate auth/catalog/config and stable identity after restart', {
  skip: process.env.AEZY_CODEX_PROCESS_TEST !== '1', timeout: 60000,
}, async t => {
  const root = await mkdtemp('/tmp/aezy-gpt-channel-process-')
  t.after(() => rm(root, { recursive: true, force: true }))
  const gateway = { endpoint: 'http://127.0.0.1:1/v1', routeId: 'fixture', catalogPath: `${root}/unused-catalog.json`,
    models: [{ id: 'deepseek/fixture' }], dataKey: 'fixture-only', version: 'fixture', credentialSource: 'fixture' }
  const deepseek = await prepareCodexRuntime({ dshHome: root, gateway })
  const gatewayConfig = await readFile(`${deepseek.home}/config.toml`, 'utf8')
  let id
  for (let attempt = 0; attempt < 2; attempt++) {
    const runtime = await prepareCodexRuntime({ dshHome: root, environment: {
      PATH: process.env.PATH, HOME: process.env.HOME, CODEX_HOME: '/foreign',
      OPENAI_API_KEY: 'foreign', OPENAI_BASE_URL: 'http://127.0.0.1:10100/v1',
    } })
    assert.notEqual(runtime.home, deepseek.home)
    assert.notEqual(runtime.id, deepseek.id)
    if (id) assert.equal(runtime.id, id)
    id = runtime.id
    assert.equal(runtime.env.AEZY_CODEX_GATEWAY_KEY, undefined)
    assert.equal(runtime.env.OPENAI_API_KEY, undefined)
    const client = new CodexAppServerClient({ env: runtime.env, cwd: runtime.home, appServerArgs: runtime.appServerArgs })
    try {
      await client.start()
      const models = await readCodexModels(client)
      assert.ok(models.some(model => model.id === 'gpt-5.6-sol'))
      assert.ok(models.every(model => !model.id.startsWith('deepseek/')))
      const account = await client.request('account/read', { refreshToken: false })
      assert.equal(account.requiresOpenaiAuth, true)
      assert.equal(account.account, null)
      const config = (await client.request('config/read', { includeLayers: false })).config
      assert.equal(config.model_provider, 'openai')
      assert.equal(config.sqlite_home, runtime.home)
      assert.equal(config.model_catalog_json, null)
      const params = { cwd: root, model: 'gpt-5.6-sol', modelProvider: runtime.provider,
        config: runtime.config, permissions: ':read-only', approvalPolicy: 'never' }
      // An empty unauthenticated Thread has no persisted rollout in Codex.
      // This probes thread configuration, not a paid Turn or history resume.
      const result = await client.request('thread/start', params)
      assert.equal(result.modelProvider, 'openai')
      assert.ok(result.thread.id)
    } finally { await client.close() }
    assert.equal(await readFile(`${deepseek.home}/config.toml`, 'utf8'), gatewayConfig)
  }
})
