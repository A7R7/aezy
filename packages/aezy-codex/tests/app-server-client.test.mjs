import assert from 'node:assert/strict'
import { EventEmitter, once } from 'node:events'
import { PassThrough } from 'node:stream'
import test from 'node:test'
import {
  CodexAppServerClient,
  bundledCodexSpawnSpec,
} from '../src/app-server-client.js'

function fakeChild() {
  const child = new EventEmitter()
  child.stdin = new PassThrough()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.kill = () => queueMicrotask(() => child.emit('exit', 0, null))
  return child
}

test('bundled launch is exact and does not enable analytics', () => {
  const spec = bundledCodexSpawnSpec()
  assert.equal(spec.command, process.execPath)
  assert.match(spec.argsPrefix[0], /@openai[/\\]codex[/\\]bin[/\\]codex\.js$/u)
  const client = new CodexAppServerClient()
  assert.deepEqual(client.spawnSpec().args.slice(-1), ['app-server'])
  assert.equal(client.spawnSpec().args.includes('--analytics-default-enabled'), false)
})

test('initializes, routes notifications and server requests, and closes the child', async () => {
  const child = fakeChild()
  const writes = []
  child.stdin.on('data', (chunk) => writes.push(...String(chunk).trim().split('\n').map(JSON.parse)))
  const client = new CodexAppServerClient({
    command: '/fake/codex',
    argsPrefix: [],
    spawnProcess: () => child,
  })
  const starting = client.start()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(writes[0].method, 'initialize')
  child.stdout.write(`${JSON.stringify({ id: writes[0].id, result: { userAgent: 'fake' } })}\n`)
  await starting
  assert.equal(client.status().state, 'connected')
  assert.equal(writes[1].method, 'initialized')

  const notification = once(client, 'notification')
  child.stdout.write(`${JSON.stringify({ method: 'turn/started', params: { turn: { id: 't1' } } })}\n`)
  assert.equal((await notification)[0].method, 'turn/started')

  const serverRequest = once(client, 'serverRequest')
  child.stdout.write(`${JSON.stringify({ id: 9, method: 'item/commandExecution/requestApproval', params: { itemId: 'i1' } })}\n`)
  assert.equal((await serverRequest)[0].id, 9)
  client.respond(9, { decision: 'decline' })
  assert.deepEqual(writes.at(-1), { id: 9, result: { decision: 'decline' } })

  await client.close()
  assert.equal(client.status().state, 'not-started')
})

test('times out a request without leaking its pending entry', async () => {
  const child = fakeChild()
  const client = new CodexAppServerClient({
    command: '/fake/codex',
    argsPrefix: [],
    spawnProcess: () => child,
    requestTimeoutMs: 5,
  })
  client.child = child
  await assert.rejects(client.request('model/list'), /timed out after 5ms/u)
  assert.equal(client.pending.size, 0)
  await client.close()
})
