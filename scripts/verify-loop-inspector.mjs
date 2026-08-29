import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { projectLoopTrace } from '../packages/aezy-inspector/src/trace.js'
import { alphaProfileDir } from './lib/alpha-runtime.mjs'

const baseUrl = process.env.AEZY_ALPHA_GATE_URL ?? 'http://127.0.0.1:3091'
const launchToken = process.env.AEZY_ALPHA_GATE_TOKEN
if (!launchToken) throw new Error('AEZY_ALPHA_GATE_TOKEN is required for the authenticated E0 gate')
const restart = process.env.AEZY_INSPECTOR_RESTART === '1'
const snapshotPath = process.env.AEZY_INSPECTOR_SNAPSHOT ?? '/tmp/aezy-e0-loop-traces.json'
const nativeSessionId = process.env.AEZY_INSPECTOR_NATIVE_SESSION ?? 'aezy-alpha-native-provider-spike'
const appSessionId = process.env.AEZY_INSPECTOR_APP_SESSION ?? 'aezy-alpha-mvp-mte8pbf4'
const secretSentinel = `E0_SECRET_PROMPT_${Date.now().toString(36)}`

const requireFromProfile = createRequire(join(alphaProfileDir, 'package.json'))
const wsModule = await import(pathToFileURL(requireFromProfile.resolve('ws')).href)
const WebSocket = wsModule.WebSocket ?? wsModule.default
assert.equal(typeof WebSocket, 'function')

const bootstrap = await fetch(`${baseUrl}/?token=${encodeURIComponent(launchToken)}`, {
  redirect: 'manual',
  signal: AbortSignal.timeout(15_000),
})
assert.equal(bootstrap.status, 303)
const setCookie = bootstrap.headers.get('set-cookie')
assert.ok(setCookie)
const cookie = setCookie.split(';', 1)[0]
let rpcSequence = 0

async function rpc(method, args) {
  rpcSequence += 1
  const response = await fetch(`${baseUrl}/api/${method}`, {
    method: 'POST',
    headers: { Cookie: cookie, 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId: `e0-inspector-${String(rpcSequence)}`,
      method,
      payload: { args },
    }),
    signal: AbortSignal.timeout(30_000),
  })
  const envelope = await response.json()
  assert.equal(response.ok && envelope.result?.ok === true, true,
    `${method}: ${JSON.stringify(envelope.result?.error ?? envelope)}`)
  return envelope.result.value
}

function eventEntries(records) {
  return records.filter(record => record.type === 'event')
}

async function completeRecords(snapshot) {
  let records = [...snapshot.records]
  let hasMore = snapshot.hasMore
  while (hasMore) {
    const first = records[0]?.event?.seq
    assert.equal(Number.isSafeInteger(first) && first > 0, true, 'history page has no earlier cursor')
    const page = await rpc('session/page', {
      request: {
        address: { kind: 'session', sessionId: snapshot.header.id },
        throughSeq: snapshot.cursor,
        beforeSeq: first,
        maxMessages: 240,
      },
    })
    records = [...page.records, ...records]
    hasMore = page.hasMore
  }
  return eventEntries(records)
}

function traceFor(sessionId, mode, entries, hasMore = false, running = false) {
  return projectLoopTrace({ sessionId, mode, entries, hasMore, running })
}

function semanticDigest(trace) {
  return createHash('sha256').update(JSON.stringify(trace)).digest('hex')
}

function assertSafe(trace) {
  const serialized = JSON.stringify(trace)
  assert.equal(serialized.includes(secretSentinel), false)
  for (const forbidden of ['reasoning-delta', 'authorization', 'accessToken', 'refreshToken', 'arguments']) {
    assert.equal(serialized.includes(forbidden), false, forbidden)
  }
}

async function withTimeout(promise, timeoutMs, message) {
  let timeout
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timeout)
  }
}

async function openFollow(sessionId, mode) {
  const socketUrl = new URL('/api/remote.mux', baseUrl)
  socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  const socket = new WebSocket(socketUrl, { headers: { Cookie: cookie } })
  await new Promise((resolve, reject) => {
    socket.once('open', resolve)
    socket.once('error', reject)
  })
  const streamId = `e0-follow-${sessionId}-${Date.now().toString(36)}`
  const opened = Promise.withResolvers()
  const completed = Promise.withResolvers()
  const observed = {
    entries: [],
    sawActiveTurn: false,
    sawActiveModel: false,
    finalTrace: null,
  }
  let failure

  socket.on('message', raw => {
    try {
      const frame = JSON.parse(raw.toString())
      if (frame.streamId !== streamId) return
      if (frame.type === 'error') {
        failure = new Error('session follow failed')
        opened.reject(failure)
        completed.reject(failure)
        return
      }
      if (frame.type !== 'item') return
      const value = frame.value
      if (value?.type === 'snapshot') {
        void completeRecords(value).then(entries => {
          observed.entries = entries
          opened.resolve(value)
        }, error => {
          failure = error
          opened.reject(error)
          completed.reject(error)
        })
        return
      }
      if (value?.type !== 'event') return
      observed.entries.push(value)
      const running = !observed.entries.some(entry => entry.event?.type === 'turn/end'
        && entry.event.seq >= value.event.seq)
      const trace = traceFor(sessionId, mode, observed.entries, false, running)
      observed.sawActiveTurn ||= trace.spans.some(span => span.kind === 'turn' && span.status.value === 'active')
      observed.sawActiveModel ||= trace.spans.some(span => span.kind === 'model' && span.status.value === 'active')
      if (value.event?.type === 'turn/end') {
        observed.finalTrace = traceFor(sessionId, mode, observed.entries, false, false)
        completed.resolve(observed.finalTrace)
      }
    } catch (error) {
      failure = error
      opened.reject(error)
      completed.reject(error)
    }
  })
  socket.send(JSON.stringify({
    type: 'open',
    streamId,
    endpoint: 'session/follow',
    payload: { args: { request: { address: { kind: 'session', sessionId }, maxMessages: 240 } } },
  }))
  await withTimeout(opened.promise, 20_000, 'session follow snapshot timeout')
  if (failure !== undefined) throw failure
  return {
    observed,
    async runTurn(expected) {
      const beforeEnds = observed.entries.filter(entry => entry.event?.type === 'turn/end').length
      await rpc('session/prompt', {
        request: {
          requestId: `e0-${sessionId}-${Date.now().toString(36)}`,
          sessionId,
          mode: 'queue',
          content: [{
            type: 'text',
            text: `Do not use tools. Reply with exactly ${expected}. Hidden test marker: ${secretSentinel}`,
          }],
          clientTimeZone: 'Asia/Shanghai',
        },
      })
      const finalTrace = await withTimeout(completed.promise, 240_000, `${sessionId} Turn timeout`)
      const afterEnds = observed.entries.filter(entry => entry.event?.type === 'turn/end').length
      assert.equal(afterEnds, beforeEnds + 1)
      return finalTrace
    },
    async close() {
      if (socket.readyState === WebSocket.CLOSED) return
      await new Promise(resolve => {
        const forceClose = setTimeout(() => {
          socket.terminate()
          resolve()
        }, 1_000)
        socket.once('close', () => {
          clearTimeout(forceClose)
          resolve()
        })
        socket.close()
      })
    },
  }
}

async function coldTrace(sessionId, mode, throughSeq) {
  const listed = await rpc('session/list', { _request: {} })
  const summary = listed.items.find(item => item.sessionId === sessionId)
  assert.ok(summary, `${sessionId} is absent`)
  const cursor = throughSeq ?? summary.projections.asOfSeq
  const page = await rpc('session/page', {
    request: {
      address: { kind: 'session', sessionId },
      throughSeq: cursor,
      maxMessages: 240,
    },
  })
  const fakeSnapshot = {
    header: { id: sessionId },
    cursor,
    records: page.records,
    hasMore: page.hasMore,
  }
  return traceFor(sessionId, mode, await completeRecords(fakeSnapshot), false, summary.running)
}

const targets = [
  { key: 'native', sessionId: nativeSessionId, mode: 'standard', backend: 'dsh-native', expected: 'E0_NATIVE_LIVE_OK' },
  { key: 'appServer', sessionId: appSessionId, mode: 'codex-app-server', backend: 'codex-app-server', expected: 'E0_APP_LIVE_OK' },
]

if (restart) {
  const expected = JSON.parse(await readFile(snapshotPath, 'utf8'))
  const checked = {}
  for (const target of targets) {
    const trace = await coldTrace(target.sessionId, target.mode, expected[target.key].throughSeq)
    assertSafe(trace)
    assert.equal(trace.backend, target.backend)
    assert.equal(semanticDigest(trace), expected[target.key].digest)
    checked[target.key] = {
      sessionId: target.sessionId,
      backend: trace.backend,
      completeness: trace.completeness,
      digest: semanticDigest(trace),
      restartEqual: true,
    }
  }
  process.stdout.write(`${JSON.stringify({ restart: true, checked }, null, 2)}\n`)
} else {
  const captured = {}
  for (const target of targets) {
    const follower = await openFollow(target.sessionId, target.mode)
    try {
      const live = await follower.runTurn(target.expected)
      const cold = await coldTrace(target.sessionId, target.mode)
      assertSafe(live)
      assertSafe(cold)
      assert.equal(live.backend, target.backend)
      assert.deepEqual(live, cold)
      assert.equal(follower.observed.sawActiveTurn, true)
      assert.equal(follower.observed.sawActiveModel, true)
      if (target.backend === 'dsh-native') {
        assert.ok(cold.spans[0]?.usage, 'native trace has no provider usage')
        assert.equal(
          cold.completeness,
          'complete',
          `native diagnostics: ${cold.diagnostics.map(item => item.code).join(',')}`,
        )
      } else {
        assert.equal(cold.completeness, 'partial')
        assert.equal(cold.diagnostics.some(item => item.code === 'app-server-item-lifecycle-partial'), true)
        if (cold.spans[0]?.usage === undefined) {
          assert.equal(cold.diagnostics.some(item => item.code === 'app-server-usage-not-durable'), true)
        }
      }
      captured[target.key] = {
        sessionId: target.sessionId,
        backend: cold.backend,
        completeness: cold.completeness,
        digest: semanticDigest(cold),
        throughSeq: cold.throughSeq,
        spans: cold.spans.length,
        liveColdEqual: true,
        activeTurnObserved: true,
        activeModelObserved: true,
      }
    } finally {
      await follower.close()
    }
  }
  await writeFile(snapshotPath, `${JSON.stringify(captured, null, 2)}\n`, { mode: 0o600 })
  process.stdout.write(`${JSON.stringify({ restart: false, captured }, null, 2)}\n`)
}
