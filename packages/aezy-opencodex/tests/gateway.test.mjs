import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import { startGateway } from '../src/gateway.js'

const model = 'deepseek/deepseek-v4-flash'
const input = { model, stream: true, input: 'hello', tools: [] }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function fixture(t, handler, overrides = {}) {
  const upstream = createServer(handler)
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve))
  t.after(async () => { await new Promise(resolve => { upstream.close(resolve); upstream.closeAllConnections() }) })
  const gateway = await startGateway({ baseURL: `http://127.0.0.1:${upstream.address().port}/v1`, apiKey: 'provider-secret', models: [model], dataKey: 'client-secret', replayKey: randomBytes(32), ...overrides })
  t.after(() => gateway.stop())
  const request = (body = input, headers = {}, signal) => fetch(`${gateway.endpoint}/responses`, {
    method: 'POST', headers: { authorization: 'Bearer client-secret', 'thread-id': 'thread-a', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal,
  })
  return { gateway, request }
}

test('native HTTP gateway authenticates loopback, rejects browser/unsupported requests without provider IO', async t => {
  let calls = 0
  const { gateway, request } = await fixture(t, (_req, res) => { calls++; res.end() })
  assert.equal((await fetch(`${gateway.endpoint}/models`)).status, 401)
  assert.equal((await request(input, { authorization: 'Bearer wrong' })).status, 401)
  assert.equal((await request(input, { origin: 'https://evil.example' })).status, 403)
  assert.equal((await request(input, { 'thread-id': '' })).status, 400)
  assert.equal((await request({ ...input, previous_response_id: 'foreign' })).status, 400)
  assert.equal((await fetch(`${gateway.endpoint}/responses/compact`, { method: 'POST', headers: { authorization: 'Bearer client-secret' } })).status, 404)
  assert.equal(calls, 0)
})

test('HTTP errors are redacted, redirects are not followed, no retry or fallback occurs', async t => {
  let calls = 0
  const { request } = await fixture(t, (_req, res) => {
    calls++
    res.writeHead(429); res.end('provider-secret and raw prompt payload')
  })
  const response = await request()
  assert.equal(response.status, 429)
  const text = await response.text()
  assert.match(text, /provider_http_429/)
  assert.ok(!text.includes('provider-secret'))
  assert.equal(calls, 1)
  const redirect = await fixture(t, (_req, res) => { res.writeHead(302, { location: 'http://127.0.0.1:1/never' }); res.end() })
  assert.equal((await redirect.request()).status, 502)
})

test('client cancellation closes the actual upstream HTTP stream, releases capacity, and cannot complete', async t => {
  let upstreamClosed = false
  const { gateway, request } = await fixture(t, (req, res) => {
    assert.equal(req.headers.authorization, 'Bearer provider-secret')
    req.resume()
    res.once('close', () => { upstreamClosed = true })
    res.writeHead(200, { 'content-type': 'text/event-stream' })
    res.write('data: {"choices":[{"index":0,"delta":{"content":"partial"},"finish_reason":null}]}\n\n')
  }, { maxConcurrent: 1 })
  const cancel = new AbortController()
  const response = await request(input, {}, cancel.signal)
  const reader = response.body.getReader()
  assert.equal((await reader.read()).done, false)
  assert.equal((await request()).status, 503)
  cancel.abort()
  await reader.cancel().catch(() => {})
  for (let i = 0; i < 100 && (!upstreamClosed || gateway.status().active); i++) await pause(10)
  assert.equal(upstreamClosed, true)
  assert.equal(gateway.status().active, 0)
  assert.equal(gateway.status().completed, 0)
  assert.equal(gateway.status().cancelled, 1)
})

test('shutdown aborts in-flight provider IO; deadline cannot hang an idle upstream', async t => {
  const { gateway, request } = await fixture(t, req => { req.resume() }, { timeoutMs: 100 })
  assert.equal((await request()).status, 502)
  for (let i = 0; i < 100 && gateway.status().active; i++) await pause(10)
  assert.equal(gateway.status().active, 0)
  const second = await fixture(t, req => { req.resume() })
  const pending = second.request().catch(() => null)
  for (let i = 0; i < 100 && !second.gateway.status().active; i++) await pause(10)
  await second.gateway.stop()
  await pending
  for (let i = 0; i < 100 && second.gateway.status().active; i++) await pause(10)
  assert.equal(second.gateway.status().active, 0)
})
