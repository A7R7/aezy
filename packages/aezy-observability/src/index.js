import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { ObservationStore, usageOf } from './store.js'

export const name = '@aezy/observability'
export const inject = ['webServer', 'connection', 'agents']
export const ROUTE = '/aezy/observability/api'
const json = (res, status, value) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(value)) }
export function handler(store, requestRejection = () => 401) {
  return async (req, res) => {
    try {
      // Connection owns signed cookies and the deployment Host/Origin fence.
      // Custom webServer routes are not authenticated automatically.
      const rejection = requestRejection(req)
      if (rejection !== undefined) { json(res, rejection, { error: 'web_authentication_required' }); return }
      const host = String(req.headers.host ?? ''), url = new URL(req.url, `http://${host}`)
      const hostname = url.hostname.replace(/^\[|\]$/g, '')
      if (!['localhost', '127.0.0.1', '::1'].includes(hostname) || req.headers['x-aezy-client'] !== 'web' || req.headers['sec-fetch-site'] === 'cross-site'
        || (req.headers.origin && new URL(req.headers.origin).origin !== url.origin)) { json(res, 403, { error: 'same_origin_web_client_required' }); return }
      const path = url.pathname.slice(ROUTE.length)
      if (req.method === 'GET') {
        if (path === '/logs') { const limit = Math.min(2000, Math.max(1, Number(url.searchParams.get('limit')) || 2000)); json(res, 200, { logs: store.rows.toSorted((a, b) => b.timestamp - a.timestamp).slice(0, limit), surfaces: [...store.surfaces.values()], persistenceErrors: store.persistenceErrors }); }
        else if (path === '/usage') {
          const range = url.searchParams.get('range') ?? '30d', surface = url.searchParams.get('surface') ?? 'all'
          if (!['all', '7d', '30d'].includes(range) || (surface !== 'all' && !store.surfaces.has(surface))) { json(res, 400, { error: 'invalid_filter' }); return }
          json(res, 200, store.summary({ range, surface }))
        } else if (path === '/surfaces') json(res, 200, [...store.surfaces.values()])
        else if (path === '/settings') json(res, 200, { timeZone: 'UTC' })
        else if (path === '/debug') json(res, 200, store.settings())
        else if (path === '/inbound-debug') json(res, 200, { entries: store.inboundRows })
        else if (['/debug/logs', '/debug/usage-logs', '/debug/injection-logs'].includes(path)) {
          const stream = path === '/debug/logs' ? 'provider' : path === '/debug/usage-logs' ? 'usage' : 'injection'
          const after = Number(url.searchParams.get('after')) || 0, limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 500))
          json(res, 200, store.debugRows.filter(row => row.stream === stream && row.seq > after).slice(-limit))
        } else json(res, 404, { error: 'unknown_observability_endpoint' })
      } else if (req.method === 'PUT' && path === '/debug') {
        if (!String(req.headers['content-type']).startsWith('application/json')) { json(res, 415, { error: 'json_required' }); return }
        const parts = []; let bytes = 0
        for await (const chunk of req) { bytes += chunk.length; if (bytes > 2048) { json(res, 413, { error: 'body_limit' }); return } parts.push(chunk) }
        json(res, 200, store.setDebug(JSON.parse(Buffer.concat(parts).toString('utf8'))))
      } else json(res, 405, { error: 'method_not_allowed' })
    } catch { json(res, 400, { error: 'invalid_observability_request' }) }
  }
}

export function observeNative(store, request, next) {
  // aezy-codex is a whole agent Turn, not a native model request. Its gateway
  // or official notification producer supplies the authoritative observation.
  if (request.provider === 'aezy-codex') return next()
  return (async function* () {
    const started = Date.now(), requestId = randomUUID()
    const row = { requestId, timestamp: started, surface: 'dsh-native', surfaceLabel: 'DSH native', unit: 'request', provider: request.provider,
      model: request.model, conversationId: request.sessionId, requestedEffort: request.reasoningEffort, status: 499 }
    store.inbound({ surface: row.surface, model: request.model, effort: request.reasoningEffort, hasSystem: !!request.system })
    store.debug('injection', { event: 'request_composition', requestId, surface: row.surface, messages: request.messages?.length, tools: request.tools?.length, systemCharacters: request.system?.length })
    try {
      for await (const chunk of next()) {
        if (['text-delta', 'reasoning-delta', 'tool-call-delta'].includes(chunk.type) && row.firstOutputMs === undefined) row.firstOutputMs = Date.now() - started
        if (chunk.type === 'usage') row.usage = usageOf(chunk.usage, 'disjoint')
        if (chunk.type === 'finish') {
          row.status = chunk.reason.kind === 'error' ? (chunk.reason.failure?.status ?? 500) : chunk.reason.kind === 'aborted' ? 499 : 200
          if (chunk.reason.failure) row.errorCode = chunk.reason.failure.code
        }
        yield chunk // Identity, ordering, backpressure and cancellation stay owned.
      }
    } catch (error) { row.status = request.signal?.aborted ? 499 : 500; row.errorCode = request.signal?.aborted ? 'aborted' : 'native_stream_failed'; throw error }
    finally { store.record({ ...row, durationMs: Date.now() - started }) }
  })()
}

export function apply(ctx, config = {}) {
  const home = process.env.DSH_HOME ?? join(homedir(), '.aezy', 'dsh')
  const store = new ObservationStore(join(home, 'aezy', 'observability'), { prices: config.prices ?? {} })
  store.registerSurface('dsh-native', 'DSH native')
  ctx.provide('aezyObservability', store)
  ctx.on('llm/stream', (request, next) => observeNative(store, request, next))
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: ROUTE, handler: handler(store, req => ctx.connection.requestRejection(req)) }), 'aezy-observability: authenticated read projections and opt-in debug')
}
