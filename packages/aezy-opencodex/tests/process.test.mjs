import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import test from 'node:test'
import { OpenCodexManager } from '../src/manager.js'
import { CodexAppServerClient } from '@aezy/codex'
import { bindGatewayLifecycle, prepareCodexRuntime } from '@aezy/codex/runtime-instance'

const sse = chunks => new Response(chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } })
const chunk = (delta, finish_reason = null) => ({ choices: [{ index: 0, delta, finish_reason }] })

test('official Codex turn/interrupt aborts the active gateway provider request', {
  skip: process.env.AEZY_OPENCODEX_PROCESS_TEST !== '1', timeout: 30000,
}, async t => {
  const root = await mkdtemp('/tmp/aezy-native-cancel-contract-')
  t.after(() => rm(root, { recursive: true, force: true }))
  let providerSignal, client, unbind
  const manager = new OpenCodexManager({ dshHome: root, gatewayOptions: { fetchImpl: async (_url, init) => {
    providerSignal = init.signal
    return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk({ content: 'in progress' }))}\n\n`))
      init.signal.addEventListener('abort', () => { try { controller.error(new Error('cancelled')) } catch {} }, { once: true })
    } }), { headers: { 'content-type': 'text/event-stream' } })
  } } })
  try {
    const gateway = await manager.start({ baseURL: 'https://provider.invalid', models: ['deepseek-v4-flash'], apiKey: 'test-only', credentialRef: 'TEST', credentialSource: 'test' })
    const runtime = await prepareCodexRuntime({ dshHome: root, gateway })
    client = new CodexAppServerClient({ env: runtime.env, cwd: root, appServerArgs: runtime.appServerArgs })
    unbind = bindGatewayLifecycle(client, gateway)
    await client.start()
    const notifications = []
    client.on('notification', message => notifications.push(message))
    const { thread } = await client.request('thread/start', { cwd: root, model: 'deepseek/deepseek-v4-flash', modelProvider: runtime.provider, config: runtime.config, permissions: ':read-only', approvalPolicy: 'never', ephemeral: true })
    const { turn } = await client.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'Explain the fixture.', text_elements: [] }], effort: 'low', summary: 'none' })
    for (let i = 0; i < 500 && !providerSignal; i++) await new Promise(resolve => setTimeout(resolve, 10))
    assert.ok(providerSignal)
    await client.request('turn/interrupt', { threadId: thread.id, turnId: turn.id })
    for (let i = 0; i < 500 && (!providerSignal.aborted || !notifications.some(row => row.method === 'turn/completed')); i++) await new Promise(resolve => setTimeout(resolve, 10))
    assert.equal(providerSignal.aborted, true, JSON.stringify({ gateway: manager.server.status(), events: notifications.map(row => ({ method: row.method, status: row.params?.turn?.status })) }))
    assert.equal(notifications.find(row => row.method === 'turn/completed')?.params.turn.status, 'interrupted')
    assert.equal(manager.server.status().completed, 0)
  } finally { await client?.close(); unbind?.(); await manager.stop() }
})

test('official Codex performs namespaced dynamic-tool roundtrip through the native Responses gateway', {
  skip: process.env.AEZY_OPENCODEX_PROCESS_TEST !== '1', timeout: 30000,
}, async t => {
  const root = await mkdtemp('/tmp/aezy-native-codex-contract-')
  t.after(() => rm(root, { recursive: true, force: true }))
  const requests = [], wire = []
  const manager = new OpenCodexManager({ dshHome: root, gatewayOptions: {
    observeRequest: request => requests.push(request),
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body); wire.push(body)
      if (wire.length === 1) {
        const tool = body.tools.find(tool => tool.function.description.startsWith('dsh.probe:'))
        assert.ok(tool, JSON.stringify(body.tools.map(tool => tool.function.description.slice(0, 45))))
        return sse([chunk({ reasoning_content: 'private fixture reasoning', tool_calls: [{ index: 0, id: 'fixture_call', type: 'function', function: { name: tool.function.name, arguments: '{"value":"proof"}' } }] }, 'tool_calls'), { choices: [], usage: { prompt_tokens: 100, completion_tokens: 10, prompt_cache_hit_tokens: 20 } }])
      }
      assert.ok(body.messages.some(row => row.role === 'tool' && row.content.includes('tool proof completed')))
      assert.ok(body.messages.some(row => row.reasoning_content === 'private fixture reasoning'))
      return sse([chunk({ content: 'NATIVE_GATEWAY_OK' }, 'stop'), { choices: [], usage: { prompt_tokens: 120, completion_tokens: 5, prompt_cache_hit_tokens: 30 } }])
    },
  } })
  let client
  try {
    const gateway = await manager.start({ baseURL: 'https://provider.invalid', models: ['deepseek-v4-flash'], apiKey: 'test-only', credentialRef: 'TEST', credentialSource: 'test' })
    const runtime = await prepareCodexRuntime({ dshHome: root, gateway })
    client = new CodexAppServerClient({ env: runtime.env, cwd: root, appServerArgs: runtime.appServerArgs })
    await client.start()
    const notifications = [], serverRequests = []
    client.on('notification', message => notifications.push(message))
    client.on('serverRequest', message => {
      serverRequests.push(message)
      if (message.method === 'item/tool/call') client.respond(message.id, { contentItems: [{ type: 'inputText', text: 'tool proof completed' }], success: true })
      else client.respondError(message.id, -32601, 'No native permissions')
    })
    const { thread } = await client.request('thread/start', {
      cwd: root, model: 'deepseek/deepseek-v4-flash', modelProvider: runtime.provider,
      config: runtime.config, permissions: ':read-only', approvalPolicy: 'never',
      dynamicTools: [{ type: 'namespace', name: 'dsh', description: 'Fixture tool', tools: [{ type: 'function', name: 'probe', description: 'Probe the protocol', deferLoading: false, inputSchema: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] } }] }],
      ephemeral: false,
    })
    await client.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'Call dsh.probe, then report.', text_elements: [] }], effort: 'low', summary: 'none' })
    const deadline = Date.now() + 15000
    while (!notifications.some(row => row.method === 'turn/completed') && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20))
    const completed = notifications.find(row => row.method === 'turn/completed')
    assert.equal(completed?.params.turn.status, 'completed', JSON.stringify({ error: completed?.params.turn.error, gateway: manager.server.status(), requests: requests.map(r => ({ headers: r.headers, keys: Object.keys(r.body), cache: r.body.prompt_cache_key })) }))
    assert.equal(wire.length, 2)
    assert.equal(serverRequests.filter(row => row.method === 'item/tool/call').length, 1)
    assert.equal(requests[0].scope, thread.id)
    assert.ok(notifications.some(row => row.method === 'item/agentMessage/delta' && row.params.delta === 'NATIVE_GATEWAY_OK'))
    assert.ok(notifications.some(row => row.method === 'thread/tokenUsage/updated'))
  } finally { await client?.close(); await manager.stop() }
})

test('official Codex: authenticated native gateway, isolated catalog, stable restart identity', {
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
      assert.equal((await readFile(gateway.catalogPath, 'utf8')).includes('invalid-test-key'), false)
      assert.equal((await fetch(`${gateway.endpoint}/models`)).status, 401)
    } finally { await client?.close(); await manager.stop() }
    assert.equal(manager.server.status().active, 0)
    await assert.rejects(readFile(`${manager.root}/aezy-owner.lock`), { code: 'ENOENT' })
  }
})
