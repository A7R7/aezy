import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { bindGatewayLifecycle, isolatedChildEnv, prepareCodexRuntime, privateDirectory } from '../src/runtime-instance.js'

test('gateway transport follows only official interrupted/failed Turn and process lifecycle facts', () => {
  const client = new EventEmitter(), cancelled = []
  let all = 0
  const unbind = bindGatewayLifecycle(client, { cancelThread: id => cancelled.push(id), cancelAll: () => all++ })
  for (const status of ['inProgress', 'completed', 'interrupted', 'failed']) {
    client.emit('notification', { method: 'turn/completed', params: { threadId: status, turn: { status } } })
  }
  client.emit('notification', { method: 'unrelated', params: { threadId: 'other', turn: { status: 'interrupted' } } })
  assert.deepEqual(cancelled, ['interrupted', 'failed'])
  for (const state of ['starting', 'connected']) client.emit('status', { state })
  assert.equal(all, 0)
  client.emit('status', { state: 'connection-failed' })
  assert.equal(all, 1)
  unbind()
  assert.equal(all, 2)
  assert.equal(client.listenerCount('notification'), 0)
  assert.equal(client.listenerCount('status'), 0)
})

test('child environment drops personal routes and credentials but preserves explicit network policy', () => {
  const env = isolatedChildEnv({ PATH: '/usr/bin', HOME: '/personal', CODEX_HOME: '/personal/codex',
    CODEX_SQLITE_HOME: '/personal/sql', OPENAI_BASE_URL: 'http://foreign', OPENAI_API_KEY: 'secret',
    OPENCODEX_HOME: '/personal/ocx', NODE_OPTIONS: '--require foreign', DEEPSEEK_API_KEY: 'secret', HTTPS_PROXY: 'http://proxy' })
  assert.deepEqual(Object.keys(env).sort(), ['HOME', 'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY', 'PATH', 'https_proxy', 'http_proxy', 'no_proxy'].sort())
  assert.equal(env.HTTPS_PROXY, 'http://proxy')
  assert.ok(env.NO_PROXY.includes('127.0.0.2'))
})

test('runtime owns its home and forces the same configuration on every startup', async t => {
  const root = await mkdtemp('/tmp/aezy-runtime-test-')
  t.after(() => rm(root, { recursive: true, force: true }))
  const runtime = await prepareCodexRuntime({ dshHome: root, environment: { CODEX_HOME: '/personal' } })
  assert.equal(runtime.env.CODEX_HOME, join(root, 'aezy/codex-openai-runtime'))
  assert.equal(runtime.env.CODEX_SQLITE_HOME, runtime.home)
  assert.equal(runtime.config.cli_auth_credentials_store, 'file')
  assert.equal(runtime.appServerArgs.includes('model_provider="openai"'), true)
  assert.equal((await prepareCodexRuntime({ dshHome: root })).id, runtime.id)
  assert.match(await readFile(join(runtime.home, 'config.toml'), 'utf8'), /model_provider = "openai"/)
  await symlink(root, join(root, 'link'))
  await assert.rejects(privateDirectory(join(root, 'link')), /symlinks/)
})

test('managed route has no OpenAI auth or personal fallback and stores no gateway secret', async t => {
  const root = await mkdtemp('/tmp/aezy-runtime-gateway-test-')
  t.after(() => rm(root, { recursive: true, force: true }))
  const gateway = { endpoint: 'http://127.0.0.2:10391/v1', routeId: 'test', catalogPath: join(root, 'catalog.json'),
    models: [{ id: 'deepseek/deepseek-v4-flash' }], dataKey: 'must-not-persist', version: '2.42.0', credentialSource: 'DSH' }
  const runtime = await prepareCodexRuntime({ dshHome: root, gateway })
  assert.equal(runtime.provider, 'aezy-opencodex')
  assert.equal(runtime.env.AEZY_CODEX_GATEWAY_KEY, gateway.dataKey)
  assert.equal(runtime.config.model_providers['aezy-opencodex'].requires_openai_auth, false)
  assert.equal(JSON.stringify(runtime.view).includes(gateway.dataKey), false)
  assert.equal((await readFile(join(runtime.home, 'config.toml'), 'utf8')).includes(gateway.dataKey), false)
})
