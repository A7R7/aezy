export {
  CodexAppServerClient,
  DEFAULT_CAPABILITIES,
  DEFAULT_CLIENT_INFO,
  bundledCodexSpawnSpec,
} from './app-server-client.js'

import { homedir } from 'node:os'
import { join } from 'node:path'
import { CodexAppServerClient } from './app-server-client.js'
import { CodexBindingStore } from './binding-store.js'
import { AezyCodexAdapter, CODEX_PROVIDER } from './dsh-adapter.js'
import { prepareCodexRuntime } from './runtime-instance.js'

export { CodexBindingStore } from './binding-store.js'
export { AezyCodexAdapter, CODEX_PROVIDER } from './dsh-adapter.js'

const ROUTE = '/aezy/api/codex'
const MAX_BODY_BYTES = 8 * 1024

export const name = '@aezy/codex'
export const inject = ['agents', 'approval', 'aezySecurity', 'aezyOpenCodex', 'llm', 'webServer']

function json(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

function requireWebClient(req) {
  if (req.headers['x-aezy-client'] !== 'web') return false
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  const authority = req.headers.host
  if (typeof authority !== 'string') return false
  let host
  try {
    host = new URL(`http://${authority}`).hostname
  } catch {
    return false
  }
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '[::1]') return false
  const origin = req.headers.origin
  if (typeof origin === 'string') {
    try {
      if (new URL(origin).host !== authority) return false
    } catch {
      return false
    }
  }
  return true
}

async function readJson(req) {
  if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
    throw new Error('content-type must be application/json')
  }
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new Error('request body exceeds the Aezy Codex limit')
    chunks.push(buffer)
  }
  const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('request body must be a JSON object')
  }
  return value
}

function rateWindow(value) {
  if (!value || typeof value !== 'object') return null
  return {
    usedPercent: value.usedPercent ?? null,
    remainingPercent: value.remainingPercent ?? null,
    windowDurationMins: value.windowDurationMins ?? null,
    resetsAt: value.resetsAt ?? null,
  }
}

function rateLimitsView(value) {
  return {
    primary: rateWindow(value?.rateLimits?.primary),
    secondary: rateWindow(value?.rateLimits?.secondary),
    byLimitId: Object.fromEntries(Object.entries(value?.rateLimitsByLimitId ?? {}).map(
      ([id, entry]) => [id, {
        primary: rateWindow(entry?.primary),
        secondary: rateWindow(entry?.secondary),
      }],
    )),
  }
}

export class CodexAccountBridge {
  constructor(client, runtimeView = null) {
    this.client = client
    this.runtimeView = runtimeView
    this.startError = null
  }

  recordStartError(error) {
    this.startError = error instanceof Error ? error.message : String(error)
  }

  expectConnected() {
    if (this.client.status().state !== 'connected') throw new Error('Codex App Server is not connected')
  }

  async snapshot() {
    const connection = this.client.status()
    if (connection.state !== 'connected') {
      return { connection, runtime: this.runtimeView, account: null, rateLimits: null, usage: null, models: [], error: this.startError }
    }
    const [account, rateLimits, usage, models] = await Promise.all([
      this.client.request('account/read', { refreshToken: false }).catch(() => null),
      this.client.request('account/rateLimits/read', {}).catch(() => null),
      this.client.request('account/usage/read', {}).catch(() => null),
      this.client.request('model/list', { cursor: null, limit: 100 }).catch(() => ({ data: [] })),
    ])
    return {
      connection,
      runtime: this.runtimeView,
      gatewayDiagnostics: this.gatewayDiagnostics?.() ?? null,
      account: account ? {
        requiresOpenaiAuth: account.requiresOpenaiAuth ?? null,
        type: account.account?.type ?? null,
        planType: account.account?.planType ?? null,
      } : null,
      rateLimits: rateLimits ? rateLimitsView(rateLimits) : null,
      usage: usage ? {
        summary: usage.summary ?? null,
        dailyBucketCount: Array.isArray(usage.dailyUsageBuckets) ? usage.dailyUsageBuckets.length : null,
      } : null,
      models: (models.data ?? []).map(model => ({
        id: model.id,
        displayName: model.displayName ?? model.id,
        isDefault: Boolean(model.isDefault),
        defaultReasoningEffort: model.defaultReasoningEffort ?? null,
      })),
      error: null,
    }
  }

  async startLogin(mode) {
    if (this.runtimeView?.provider === 'aezy-opencodex') throw new Error('Managed OpenCodex uses DSH credentials, not ChatGPT login')
    this.expectConnected()
    if (mode !== 'browser' && mode !== 'device') throw new Error('mode must be browser or device')
    return this.client.request('account/login/start', mode === 'browser'
      ? { type: 'chatgpt', appBrand: 'codex', useHostedLoginSuccessPage: true }
      : { type: 'chatgptDeviceCode' })
  }

  async cancelLogin(loginId) {
    if (this.runtimeView?.provider === 'aezy-opencodex') throw new Error('Managed OpenCodex does not use ChatGPT login')
    this.expectConnected()
    if (typeof loginId !== 'string' || !loginId.trim()) throw new Error('loginId must be a non-empty string')
    await this.client.request('account/login/cancel', { loginId: loginId.trim() })
    return { cancelled: true }
  }

  async logout() {
    if (this.runtimeView?.provider === 'aezy-opencodex') throw new Error('Manage the DeepSeek credential in DSH settings')
    this.expectConnected()
    await this.client.request('account/logout', {})
    return { loggedOut: true }
  }
}

export function createCodexHandler(bridge) {
  return async (req, res) => {
    if (!requireWebClient(req)) {
      json(res, 403, { error: 'This endpoint accepts only Aezy Web requests.' })
      return
    }
    const url = new URL(req.url ?? '/', 'http://aezy.local')
    try {
      if (req.method === 'GET' && url.pathname === ROUTE) {
        json(res, 200, await bridge.snapshot())
        return
      }
      if (req.method === 'POST') {
        const body = await readJson(req)
        if (url.pathname === `${ROUTE}/login/start`) json(res, 200, await bridge.startLogin(body.mode))
        else if (url.pathname === `${ROUTE}/login/cancel`) json(res, 200, await bridge.cancelLogin(body.loginId))
        else if (url.pathname === `${ROUTE}/logout`) json(res, 200, await bridge.logout())
        else json(res, 404, { error: 'Unknown Aezy Codex endpoint.' })
        return
      }
      json(res, 405, { error: 'Method not allowed.' })
    } catch (error) {
      json(res, 400, { error: error instanceof Error ? error.message : String(error) })
    }
  }
}

export async function apply(ctx, config = {}) {
  const home = process.env.DSH_HOME ?? join(homedir(), '.aezy', 'dsh')
  const runtime = { provider: 'aezy-opencodex' }
  const client = new CodexAppServerClient()
  const bridge = new CodexAccountBridge(client, { owner: 'aezy', provider: runtime.provider })
  const bindings = new CodexBindingStore(config.bindingFile ?? join(home, 'aezy', 'codex-bindings.json'))
  let disposed = false
  const ready = ctx.aezyOpenCodex.ready.then(async gateway => {
    if (disposed) throw new Error('Aezy Codex was disposed during gateway startup')
    Object.assign(runtime, await prepareCodexRuntime({ dshHome: home, gateway }))
    if (disposed) throw new Error('Aezy Codex was disposed during runtime preparation')
    client.env = runtime.env
    client.cwd = runtime.home
    client.appServerArgs = runtime.appServerArgs
    bridge.runtimeView = runtime.view
    bridge.gatewayDiagnostics = gateway.diagnostics
    await client.start()
  })
  const adapter = new AezyCodexAdapter({
    client,
    ready,
    bindings,
    ctx,
    logger: ctx.logger,
    allowedAgentPresets: Array.isArray(config.allowedAgentPresets) ? config.allowedAgentPresets : [],
    legacyAgentPresets: Array.isArray(config.legacyAgentPresets) ? config.legacyAgentPresets : [],
    runtime,
  })
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE,
    handler: createCodexHandler(bridge),
  }), 'aezy-codex: account API')
  ctx.effect(() => {
    void ready.catch((error) => {
      bridge.recordStartError(error)
      if (!disposed) ctx.logger.warn(error instanceof Error ? error : new Error(String(error)))
    })
    return async () => {
      disposed = true
      await client.close()
    }
  }, 'aezy-codex: official app-server lifecycle')
  ctx.effect(() => {
    let unregister
    try {
      unregister = ctx.llm.registerAdapter([CODEX_PROVIDER], adapter)
    } catch (error) {
      adapter.dispose()
      throw error
    }
    return () => {
      unregister()
      adapter.dispose()
    }
  }, 'aezy-codex: DSH Session to official Thread adapter')
  ctx.provide('aezyCodex', { client, account: bridge, adapter, bindings })
}
