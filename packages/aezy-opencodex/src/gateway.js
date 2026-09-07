import { createServer } from 'node:http'
import { timingSafeEqual, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { GatewayError, fail, translateRequest } from './protocol.js'
import { streamResponse } from './stream.js'

function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
  res.end(JSON.stringify(value))
}
async function readBody(req, signal) {
  let size = 0; const chunks = []
  const abort = () => req.destroy()
  signal.addEventListener('abort', abort, { once: true })
  try {
    signal.throwIfAborted()
    for await (const chunk of req) {
      signal.throwIfAborted()
      size += chunk.length
      if (size > 8 * 1024 * 1024) fail('request_limit', 413)
      chunks.push(chunk)
    }
  } finally { signal.removeEventListener('abort', abort) }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { fail('invalid_json') }
}
function authorized(req, token) {
  const actual = Buffer.from(req.headers.authorization ?? ''), expected = Buffer.from(`Bearer ${token}`)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
export function providerEndpoint(baseURL) {
  let url
  try { url = new URL(baseURL) } catch { fail('invalid_provider_endpoint') }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) fail('invalid_provider_endpoint')
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/chat/completions`
  return url.href
}

export async function startGateway({ baseURL, models, apiKey, dataKey, replayKey,
  fetchImpl = fetch, timeoutMs = 120000, maxConcurrent = 8, observeRequest, observation }) {
  const endpoint = providerEndpoint(baseURL), active = new Map()
  const counts = { started: 0, completed: 0, failed: 0, cancelled: 0, usageReported: 0, usageUnreported: 0 }
  let stopping = false
  const server = createServer(async (req, res) => {
    if (!authorized(req, dataKey)) { json(res, 401, { error: { code: 'gateway_auth_required' } }); return }
    if (req.headers.origin || req.headers['sec-fetch-site'] === 'cross-site') { json(res, 403, { error: { code: 'browser_request_forbidden' } }); return }
    if (req.url === '/v1/models' && req.method === 'GET') { json(res, 200, { object: 'list', data: models.map(id => ({ id, object: 'model', owned_by: 'aezy' })) }); return }
    if (req.url !== '/v1/responses' || req.method !== 'POST') { json(res, 404, { error: { code: 'unsupported_gateway_endpoint' } }); return }
    if (stopping || active.size >= maxConcurrent) { json(res, 503, { error: { code: 'gateway_busy' } }); return }
    const controller = new AbortController()
    active.set(controller, null)
    let terminal = false, upstream, timer
    const observed = { requestId: randomUUID(), timestamp: Date.now(), surface: 'codex-gateway', surfaceLabel: 'Codex gateway', provider: 'deepseek', unit: 'request', status: 500 }
    const safeObserve = fn => { try { fn(observation) } catch { /* diagnostics never controls transport */ } }
    const abort = () => { if (!terminal) controller.abort(new Error('Codex connection closed')) }
    res.once('close', abort)
    req.once('aborted', abort)
    try {
      timer = setTimeout(() => controller.abort(new Error('Gateway request deadline')), timeoutMs)
      if (!String(req.headers['content-type']).startsWith('application/json')) fail('json_content_type_required', 415)
      const body = await readBody(req, controller.signal)
      // Pinned Codex 0.149.0 sends thread-id on Responses HTTP.
      const scope = req.headers['thread-id']
      observeRequest?.({ headers: Object.keys(req.headers), scope, body }) // Explicit test seam; omitted in production.
      if (typeof scope !== 'string' || !/^[A-Za-z0-9_.:-]{1,160}$/.test(scope)) fail('thread_scope_required')
      active.set(controller, scope)
      const translated = translateRequest(body, { models, key: replayKey, scope })
      Object.assign(observed, { model: translated.model, requestModel: translated.request.model, conversationId: scope, requestedEffort: body.reasoning?.effort })
      safeObserve(o => {
        o?.inbound({ surface: observed.surface, model: observed.model, effort: observed.requestedEffort, hasSystem: !!body.instructions })
        o?.debug('injection', { event: 'responses_translation', requestId: observed.requestId, surface: observed.surface, inputItems: Array.isArray(body.input) ? body.input.length : 1, tools: translated.request.tools?.length })
      })
      controller.signal.throwIfAborted()
      counts.started++
      observed.attemptObserved = true
      upstream = await fetchImpl(endpoint, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(translated.request), signal: controller.signal, redirect: 'error',
      })
      if (!upstream.ok) {
        await upstream.body?.cancel()
        throw new GatewayError(`provider_http_${upstream.status}`, upstream.status === 429 ? 429 : 502)
      }
      if (!upstream.headers.get('content-type')?.includes('text/event-stream')) fail('provider_sse_required', 502)
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', 'x-accel-buffering': 'no' })
      const result = await streamResponse(upstream, translated, {
        key: replayKey, signal: controller.signal,
        emit: async event => {
          if (observed.firstOutputMs === undefined && /delta$/.test(event.type)) observed.firstOutputMs = Date.now() - observed.timestamp
          controller.signal.throwIfAborted()
          if (!res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)) await once(res, 'drain', { signal: controller.signal })
        },
        onUsage: value => {
          counts[value ? 'usageReported' : 'usageUnreported']++
          if (value) observed.usage = { inputTokens: value.input_tokens, outputTokens: value.output_tokens, totalTokens: value.total_tokens, cachedInputTokens: value.input_tokens_details?.cached_tokens, reasoningOutputTokens: value.output_tokens_details?.reasoning_tokens }
        },
      })
      counts[result.status === 'completed' ? 'completed' : 'failed']++
      observed.status = result.status === 'completed' ? 200 : 500
      terminal = true
      res.end()
    } catch (error) {
      observed.status = controller.signal.aborted ? 499 : error instanceof GatewayError ? error.status : 502
      observed.errorCode = controller.signal.aborted ? 'aborted' : error instanceof GatewayError ? error.code : 'gateway_transport_failed'
      counts[controller.signal.aborted ? 'cancelled' : 'failed']++
      if (!res.destroyed) {
        if (!res.headersSent) json(res, error instanceof GatewayError ? error.status : 502, {
          error: { code: error instanceof GatewayError ? error.code : 'gateway_transport_failed', message: 'Aezy gateway rejected or failed this request. No fallback or retry was used.' },
        })
        else res.end()
      }
    } finally {
      safeObserve(o => o?.record({ ...observed, durationMs: Date.now() - observed.timestamp }))
      terminal = true
      clearTimeout(timer)
      controller.abort()
      await upstream?.body?.cancel().catch(() => {})
      res.off('close', abort); req.off('aborted', abort)
      active.delete(controller)
    }
  })
  server.requestTimeout = timeoutMs
  server.headersTimeout = Math.min(timeoutMs, 15000)
  server.on('clientError', (_error, socket) => { socket.destroy() })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  return {
    endpoint: `http://127.0.0.1:${server.address().port}/v1`,
    status: () => ({ active: active.size, ...counts }),
    cancelThread(threadId) {
      if (typeof threadId !== 'string' || !threadId) return
      for (const [controller, scope] of active) if (scope === threadId) controller.abort(new Error('Codex Turn interrupted'))
    },
    cancelAll() {
      for (const controller of active.keys()) controller.abort(new Error('Codex connection unavailable'))
    },
    async stop() {
      if (stopping) return
      stopping = true
      for (const controller of active.keys()) controller.abort(new Error('Aezy Host shutdown'))
      await new Promise(resolve => { server.close(resolve); server.closeAllConnections() })
    },
  }
}
