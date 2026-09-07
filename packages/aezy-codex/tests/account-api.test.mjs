import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'
import {
  CodexAccountBridge,
  createCodexHandler,
} from '../src/index.js'

class FakeClient {
  constructor() {
    this.calls = []
    this.state = 'connected'
  }

  status() {
    return { state: this.state }
  }

  async request(method, params) {
    this.calls.push({ method, params })
    if (method === 'account/read') return {
      requiresOpenaiAuth: true,
      account: { type: 'chatgpt', planType: 'prolite', email: 'must-not-leak@example.com' },
    }
    if (method === 'account/rateLimits/read') return {
      rateLimits: { primary: { usedPercent: 12, windowDurationMins: 300, resetsAt: 123 } },
      rateLimitsByLimitId: {},
    }
    if (method === 'account/usage/read') return { summary: { lifetimeTokens: 42 }, dailyUsageBuckets: [] }
    if (method === 'model/list') return {
      data: [{ id: 'gpt-5.6-sol', displayName: 'Sol', isDefault: true, defaultReasoningEffort: 'low' }],
    }
    if (method === 'account/login/start') return params.type === 'chatgpt'
      ? { type: 'chatgpt', loginId: 'login-1', authUrl: 'https://auth.example/' }
      : { type: 'chatgptDeviceCode', loginId: 'login-2', userCode: 'ABCD', verificationUrl: 'https://device.example/' }
    if (method === 'account/login/cancel') return {}
    if (method === 'account/logout') return {}
    throw new Error(`unexpected method ${method}`)
  }
}

function request(path, { method = 'GET', body } = {}) {
  const req = body === undefined ? Readable.from([]) : Readable.from([JSON.stringify(body)])
  req.method = method
  req.url = path
  req.headers = {
    host: '127.0.0.1:3090',
    'x-aezy-client': 'web',
    ...(body === undefined ? {} : { 'content-type': 'application/json' }),
  }
  return req
}

async function invoke(handler, req) {
  let status
  let headers
  let body = ''
  const res = {
    writeHead(nextStatus, nextHeaders) {
      status = nextStatus
      headers = nextHeaders
    },
    end(chunk = '') {
      body += String(chunk)
    },
  }
  await handler(req, res)
  return { status, headers, body: JSON.parse(body) }
}

test('account snapshot exposes plan/usage without email or tokens', async () => {
  const bridge = new CodexAccountBridge(new FakeClient())
  const snapshot = await bridge.snapshot()
  assert.deepEqual(snapshot.account, {
    requiresOpenaiAuth: true,
    type: 'chatgpt',
    planType: 'prolite',
  })
  assert.equal(JSON.stringify(snapshot).includes('must-not-leak'), false)
  assert.equal(snapshot.rateLimits.primary.usedPercent, 12)
  assert.equal(snapshot.usage.summary.lifetimeTokens, 42)
  assert.deepEqual(snapshot.models.map(model => model.id), ['gpt-5.6-sol'])
})

test('managed login allows only browser/device and never accepts tokens', async () => {
  const client = new FakeClient()
  const bridge = new CodexAccountBridge(client)
  assert.equal((await bridge.startLogin('browser')).type, 'chatgpt')
  assert.equal((await bridge.startLogin('device')).type, 'chatgptDeviceCode')
  await assert.rejects(bridge.startLogin('token'), /browser or device/u)
  assert.deepEqual(client.calls.filter(call => call.method === 'account/login/start').map(call => call.params), [
    { type: 'chatgpt', appBrand: 'codex', useHostedLoginSuccessPage: true },
    { type: 'chatgptDeviceCode' },
  ])
})

test('owned gateway never starts OAuth or changes a personal account', async () => {
  const client = new FakeClient()
  const bridge = new CodexAccountBridge(client, { owner: 'aezy', provider: 'aezy-opencodex' })
  await assert.rejects(bridge.startLogin('browser'), /DSH credentials/)
  await assert.rejects(bridge.cancelLogin('id'), /does not use ChatGPT/)
  await assert.rejects(bridge.logout(), /DSH settings/)
  assert.deepEqual(client.calls, [])
})

test('HTTP account and login routes require Aezy Web authority', async () => {
  const bridge = new CodexAccountBridge(new FakeClient())
  const handler = createCodexHandler(bridge)
  const account = await invoke(handler, request('/aezy/api/codex'))
  assert.equal(account.status, 200)
  assert.equal(account.headers['cache-control'], 'no-store')
  assert.equal(account.body.account.planType, 'prolite')

  const login = await invoke(handler, request('/aezy/api/codex/login/start', {
    method: 'POST', body: { mode: 'device' },
  }))
  assert.deepEqual(login.body, {
    type: 'chatgptDeviceCode', loginId: 'login-2', userCode: 'ABCD', verificationUrl: 'https://device.example/',
  })

  const foreign = request('/aezy/api/codex')
  foreign.headers['x-aezy-client'] = 'other'
  assert.equal((await invoke(handler, foreign)).status, 403)
})

test('explicit GPT login route never touches the gateway; unknown routes fail closed', async () => {
  const gatewayClient = new FakeClient(), openaiClient = new FakeClient()
  const gateway = new CodexAccountBridge(gatewayClient, { provider: 'aezy-opencodex' })
  const openai = new CodexAccountBridge(openaiClient, { provider: 'openai' })
  const handler = createCodexHandler(gateway, { gateway, openai })
  assert.equal((await invoke(handler, request('/aezy/api/codex/login/start?route=openai', {
    method: 'POST', body: { mode: 'browser' },
  }))).status, 200)
  assert.equal(openaiClient.calls[0].method, 'account/login/start')
  assert.deepEqual(gatewayClient.calls, [])
  assert.equal((await invoke(handler, request('/aezy/api/codex/login/start?route=gateway', {
    method: 'POST', body: { mode: 'browser' },
  }))).status, 400)
  for (const route of ['foreign', '__proto__', 'constructor']) {
    assert.equal((await invoke(handler, request(`/aezy/api/codex?route=${route}`))).status, 400)
  }
})
