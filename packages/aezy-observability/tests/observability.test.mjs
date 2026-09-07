import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { ObservationStore, usageOf } from '../src/store.js'
import { observeNative, handler } from '../src/index.js'
import { observeOfficialTurn } from '../../aezy-codex/src/observability.js'
import { publishedPrice } from '../src/prices.js'
const fixture = options => new ObservationStore(mkdtempSync('/tmp/aezy-observation-test-'), options)
const row = extra => ({ requestId: 'r1', timestamp: Date.now(), surface: 'custom-runtime', provider: 'deepseek', model: 'test', status: 200, durationMs: 1100, firstOutputMs: 100, usage: { inputTokens: 100, outputTokens: 20, cachedInputTokens: 40 }, ...extra })

test('disjoint DSH cache counts become inclusive display counts once; missing and zero differ', () => {
  assert.deepEqual(usageOf({ inputTokens: 60, outputTokens: 20, cacheReadTokens: 40 }, 'disjoint'), { inputTokens: 100, outputTokens: 20, totalTokens: 120, cachedInputTokens: 40, cacheReadInputTokens: 40 })
  assert.equal(usageOf({ inputTokens: -1, outputTokens: 3 }), undefined)
  assert.equal(usageOf({ inputTokens: 2, outputTokens: 3, cachedInputTokens: 4 }), undefined)
  assert.equal(usageOf(null), undefined)
  assert.equal(usageOf({ inputTokens: 0, outputTokens: 0 }).totalTokens, 0)
})
test('private durable metadata, redaction, dedup, dynamic surface, restart and no double counting', () => {
  const store = fixture()
  store.record(row({ conversationId: 'private-session', prompt: 'SECRET', error: 'Bearer SECRET', authorization: 'SECRET', usage: { inputTokens: 100, outputTokens: 20, apiKey: 'SECRET' } }))
  store.record(row())
  const content = readFileSync(store.file, 'utf8')
  assert.ok(!content.includes('SECRET') && !content.includes('private-session'))
  assert.equal(statSync(store.file).mode & 0o777, 0o600)
  const reloaded = new ObservationStore(join(store.file, '..'))
  assert.equal(reloaded.rows.length, 1)
  assert.equal(reloaded.rows[0].conversationId, store.rows[0].conversationId)
  assert.equal(reloaded.summary().summary.totalTokens, 120)
  assert.ok(reloaded.surfaces.has('custom-runtime'))
  assert.equal(reloaded.summary().summary.estimatedCostUsd, undefined)
})
test('range/surface aggregates and measured coverage exclude unknown rather than fabricate zero', () => {
  const now = Date.now(), store = fixture({ now: () => now })
  store.record(row({ timestamp: now - 40 * 86400000 }))
  store.record(row({ requestId: 'r2', usage: undefined }))
  store.record(row({ requestId: 'r3', surface: 'future-engine', usage: { inputTokens: 0, outputTokens: 0 } }))
  const result = store.summary({ range: '7d' })
  assert.equal(result.summary.requests, 2); assert.equal(result.summary.measuredRequests, 1)
  assert.equal(result.summary.unreportedRequests, 1); assert.equal(result.summary.coverageRatio, .5)
  assert.equal(store.summary({ range: 'all' }).summary.requests, 3)
  assert.equal(store.summary({ surface: 'future-engine' }).models.length, 1)
})
test('price equivalents use an explicit rate snapshot and disjoint cache splits; no billing mutation', () => {
  const store = fixture({ prices: { 'deepseek/test': { input: 1, output: 2, cacheRead: .1, cacheWrite: 1, date: '2026-09-08', reference: 'fixture' } } })
  store.record(row())
  assert.ok(Math.abs(store.summary().summary.estimatedCostUsd - .000104) < 1e-10)
  assert.equal(store.rows[0].displayMetrics.tokPerSecond.value, 20000 / 1100)
})
test('retention and corrupt-tail recovery are bounded and surfaced', () => {
  const store = fixture({ maxRecords: 2 })
  for (let i = 0; i < 4; i++) store.record(row({ requestId: `r${i}` }))
  assert.equal(store.rows.length, 2); assert.equal(store.summary().entriesDropped, 2)
  writeFileSync(store.file, readFileSync(store.file, 'utf8') + '{broken\n')
  const next = new ObservationStore(join(store.file, '..'), { maxRecords: 2 })
  assert.equal(next.rows.length, 2); assert.equal(next.corruptLines, 1)
  assert.equal(next.summary().historyTruncated, true)
})
test('debug opt-in, bounded follow, strict flags, reset and private inbound metadata', () => {
  const store = fixture()
  store.debug('provider', { event: 'off' }); assert.equal(store.debugRows.length, 0)
  store.setDebug({ debug: true, usage: true, injection: true, inbound: true })
  store.debug('provider', { event: 'test', prompt: 'SECRET', headers: 'SECRET' })
  store.inbound({ surface: 'new-runtime', model: 'test', hasSystem: true, system: 'SECRET' })
  assert.ok(!JSON.stringify(store.debugRows).includes('SECRET')); assert.ok(!JSON.stringify(store.inboundRows).includes('SECRET'))
  assert.throws(() => store.setDebug({ unknown: true }))
  assert.throws(() => store.setDebug({ debug: 'true' }))
  store.setDebug({ reset: true }); assert.equal(store.settings().enabled, false)
  assert.equal(store.inboundRows.length, 1)
})
test('native stream is transparent and auxiliary calls are visible; codex wrapper is not counted', async () => {
  const store = fixture()
  const chunks = [{ type: 'usage', usage: { inputTokens: 2, outputTokens: 3, cacheReadTokens: 4 } }, { type: 'finish', reason: { kind: 'stop' } }]
  const stream = async function* () { yield* chunks }
  const output = []
  for await (const chunk of observeNative(store, { provider: 'deepseek', model: 'test', purpose: 'session-title' }, stream)) output.push(chunk)
  assert.equal(output[0], chunks[0]); assert.equal(store.rows[0].usage.totalTokens, 9)
  for await (const chunk of observeNative(store, { provider: 'aezy-codex' }, stream)) assert.ok(chunk)
  assert.equal(store.rows.length, 1)
})
test('native throw and consumer cancellation retain semantics and failed diagnostics', async () => {
  const store = fixture(), error = new Error('SECRET provider error')
  await assert.rejects(async () => { for await (const _ of observeNative(store, { provider: 'test', model: 'x' }, async function* () { throw error })) {} }, e => e === error)
  assert.equal(store.rows[0].status, 500); assert.ok(!readFileSync(store.file, 'utf8').includes('SECRET'))
  for await (const _ of observeNative(store, { provider: 'test', model: 'x' }, async function* () { yield { type: 'text-delta', text: 'x' }; throw Error('must not run') })) break
  assert.equal(store.rows[1].status, 499)
})
test('official last usage notifications dedup; cumulative totals are never summed; fallback is unmetered', () => {
  const store = fixture(), observer = observeOfficialTurn(store, { provider: 'openai', model: 'gpt-test', conversationId: 's' })
  const message = { method: 'thread/tokenUsage/updated', params: { threadId: 't', turnId: 'u', tokenUsage: { total: { totalTokens: 1000 }, last: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } } } }
  observer.notification(message); observer.notification(message); observer.finish(200)
  assert.equal(store.rows.length, 1); assert.equal(store.summary().summary.totalTokens, 15)
  observeOfficialTurn(store, { provider: 'openai', model: 'gpt-test' }).finish(500)
  assert.equal(store.rows[1].usageStatus, 'unreported'); assert.equal(store.rows[1].unit, 'turn')
  observeOfficialTurn(store, { provider: 'aezy-opencodex', model: 'deepseek' }).finish(200)
  assert.equal(store.rows.length, 2)
})
test('HTTP read, dynamic filters, debug writes and cross-origin/unauthorized rejection', async t => {
  const store = fixture(); store.record(row())
  const server = createServer(handler(store, req => req.headers.cookie === 'test-authority=accepted' ? undefined : 401)); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections() }))
  const base = `http://127.0.0.1:${server.address().port}/aezy/observability/api`, headers = { 'X-Aezy-Client': 'web', Cookie: 'test-authority=accepted' }
  assert.equal((await fetch(`${base}/logs`)).status, 401)
  assert.equal((await fetch(`${base}/logs`, { headers: { 'X-Aezy-Client': 'web' } })).status, 401)
  assert.equal((await fetch(`${base}/logs`, { headers: { Cookie: headers.Cookie } })).status, 403)
  assert.equal((await fetch(`${base}/logs`, { headers: { ...headers, Origin: 'https://evil.example' } })).status, 403)
  assert.equal((await (await fetch(`${base}/logs`, { headers })).json()).logs.length, 1)
  store.record(row({ requestId: 'newer', timestamp: Date.now() + 1000 }))
  store.record(row({ requestId: 'older-completed-later', timestamp: 1 }))
  assert.equal((await (await fetch(`${base}/logs?limit=1`, { headers })).json()).logs[0].requestId, 'newer')
  assert.equal((await fetch(`${base}/usage?surface=no-such-surface`, { headers })).status, 400)
  const put = await fetch(`${base}/debug`, { method: 'PUT', headers: { ...headers, 'content-type': 'application/json' }, body: '{"debug":true}' })
  assert.equal((await put.json()).enabled, true)
  assert.equal((await fetch(`${base}/logs`, { method: 'DELETE', headers })).status, 405)
})
test('final-file symlinks are rejected', () => {
  const directory = mkdtempSync('/tmp/aezy-observation-link-'), target = join(directory, 'target')
  writeFileSync(target, '', { mode: 0o600 }); symlinkSync(target, join(directory, 'requests.jsonl'))
  assert.throws(() => new ObservationStore(directory))
})
test('dated published rates respect weekday UTC peak boundaries and unknown models stay unpriced', () => {
  const price = timestamp => publishedPrice({ provider: 'deepseek', model: 'deepseek-v4-flash', timestamp: Date.parse(timestamp) })
  assert.equal(price('2026-09-07T00:59:59Z').input, .22)
  assert.equal(price('2026-09-07T01:00:00Z').input, .44)
  assert.equal(price('2026-09-07T04:00:00Z').input, .22)
  assert.equal(price('2026-09-07T06:00:00Z').input, .44)
  assert.equal(price('2026-09-07T10:00:00Z').input, .22)
  assert.equal(price('2026-09-06T01:30:00Z').input, .22)
  assert.equal(publishedPrice({ provider: 'openai', model: 'gpt-6-astra', timestamp: Date.now() }), undefined)
})
test('failed measured official Turn stays in Logs without duplicating Usage', () => {
  const store = fixture(), observer = observeOfficialTurn(store, { provider: 'openai', model: 'gpt-test' })
  observer.notification({ method: 'thread/tokenUsage/updated', params: { threadId: 't', turnId: 'u', tokenUsage: { total: { totalTokens: 15 }, last: { inputTokens: 10, outputTokens: 5 } } } })
  observer.finish(500)
  assert.equal(store.rows.length, 2); assert.equal(store.rows[1].status, 500)
  assert.equal(store.summary().summary.requests, 1); assert.equal(store.summary().summary.totalTokens, 15)
})
test('canonical model/provider reporting does not erase the actual owner route', () => {
  const store = fixture()
  store.record(row({ provider: 'deepseek-official', model: 'deepseek-v4-flash' }))
  store.record(row({ requestId: 'r2', provider: 'deepseek', model: 'deepseek/deepseek-v4-flash' }))
  assert.equal(store.summary().models.length, 1)
  assert.equal(store.rows[0].routeDecision.selected.provider, 'deepseek-official')
  assert.equal(store.rows[1].routeDecision.selected.model, 'deepseek/deepseek-v4-flash')
})
test('rotation metadata survives restart, and a torn tail cannot swallow the next request', () => {
  const store = fixture({ maxRecords: 2 })
  for(let n=0;n<3;n++)store.record(row({requestId:`r${n}`}))
  writeFileSync(store.file,readFileSync(store.file,'utf8')+'{torn')
  const next = new ObservationStore(join(store.file,'..'),{maxRecords:2})
  assert.equal(next.dropped,1);assert.equal(next.corruptLines,1)
  next.record(row({requestId:'after-recovery'}))
  const again=new ObservationStore(join(store.file,'..'),{maxRecords:2})
  assert.ok(again.rows.some(r=>r.requestId==='after-recovery'));assert.equal(again.corruptLines,1)
})
