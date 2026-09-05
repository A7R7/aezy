import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import test from 'node:test'
import { OpenCodexManager } from '../src/manager.js'
import { CodexAppServerClient } from '@aezy/codex'
import { prepareCodexRuntime } from '@aezy/codex/runtime-instance'

test('official packages: authenticated owned gateway, isolated Codex catalog, stable restart identity', {
  skip: process.env.AEZY_OPENCODEX_PROCESS_TEST !== '1', timeout: 180_000,
}, async t => {
  const root = await mkdtemp('/tmp/aezy-owned-process-test-')
  t.after(() => rm(root, { recursive: true, force: true }))
  const foreign = `${root}/personal-config.toml`
  const sentinel = 'openai_base_url = "http://127.0.0.1:10100/v1"\n'
  await writeFile(foreign, sentinel)
  let identity
  for (let attempt = 0; attempt < 2; attempt++) {
    const manager = new OpenCodexManager({ dshHome: root })
    let client
    try {
      const gateway = await manager.start({ baseURL: 'https://api.deepseek.com', models: ['deepseek-v4-flash'], apiKey: 'invalid-test-key', credentialRef: 'TEST', credentialSource: 'test' })
      const runtime = await prepareCodexRuntime({ dshHome: root, gateway, environment: { CODEX_HOME: '/foreign', OPENAI_API_KEY: 'foreign', OPENAI_BASE_URL: 'http://127.0.0.1:10100/v1' } })
      assert.equal(runtime.env.OPENAI_API_KEY, undefined)
      if (identity) assert.equal(runtime.id, identity)
      identity = runtime.id
      client = new CodexAppServerClient({ env: runtime.env, cwd: runtime.home, appServerArgs: runtime.appServerArgs })
      await client.start()
      assert.deepEqual((await client.request('model/list', {})).data.map(row => row.id), ['deepseek/deepseek-v4-flash'])
      const config = (await client.request('config/read', { includeLayers: false })).config
      assert.equal(config.model_provider, 'aezy-opencodex')
      assert.equal(config.sqlite_home, runtime.home)
      assert.equal(JSON.parse(await readFile(gateway.catalogPath, 'utf8')).models[0].tool_mode, undefined)
      assert.equal((await client.request('account/read', { refreshToken: false })).requiresOpenaiAuth, false)
      assert.equal(await readFile(foreign, 'utf8'), sentinel)
      assert.equal((await readFile(`${manager.root}/config.json`, 'utf8')).includes('invalid-test-key'), false)
    } finally { await client?.close(); await manager.stop() }
    assert.equal(manager.children.size, 0)
    await assert.rejects(readFile(`${manager.root}/aezy-owner.lock`), { code: 'ENOENT' })
  }
})
