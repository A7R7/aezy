import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { alphaProfileDir } from './lib/alpha-runtime.mjs'

const launchToken = process.env.AEZY_ALPHA_GATE_TOKEN
if (!launchToken) throw new Error('AEZY_ALPHA_GATE_TOKEN is required for the authenticated layout gate')
const baseUrl = process.env.AEZY_ALPHA_GATE_URL ?? 'http://127.0.0.1:3091'
const cdpUrl = process.env.AEZY_LAYOUT_CDP_URL ?? 'http://127.0.0.1:9223'
const requireFromProfile = createRequire(join(alphaProfileDir, 'package.json'))
const wsModule = await import(pathToFileURL(requireFromProfile.resolve('ws')).href)
const WebSocket = wsModule.WebSocket ?? wsModule.default

const targets = await fetch(`${cdpUrl}/json/list`, { signal: AbortSignal.timeout(10_000) }).then(response => response.json())
const target = targets.find(candidate => candidate.type === 'page')
assert.equal(typeof target?.webSocketDebuggerUrl, 'string', 'CDP exposed no page target')
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.once('open', resolve)
  socket.once('error', reject)
})

let sequence = 0
const pending = new Map()
socket.on('message', raw => {
  const message = JSON.parse(raw.toString())
  if (typeof message.id !== 'number') return
  const waiter = pending.get(message.id)
  if (waiter === undefined) return
  pending.delete(message.id)
  if (message.error !== undefined) waiter.reject(new Error(message.error.message))
  else waiter.resolve(message.result)
})

function send(method, params = {}) {
  sequence += 1
  const id = sequence
  const result = Promise.withResolvers()
  pending.set(id, result)
  socket.send(JSON.stringify({ id, method, params }))
  return result.promise
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails !== undefined) throw new Error(result.exceptionDetails.text ?? 'browser evaluation failed')
  return result.result?.value
}

async function waitFor(expression, message, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(message)
}

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: `${baseUrl}/?token=${encodeURIComponent(launchToken)}` })
  await waitFor("document.readyState === 'complete' && document.querySelector('[data-shell-overlay]') !== null", 'Aezy AppFrame did not load')
  const nonblankSession = "[...document.querySelectorAll('[role=treeitem][aria-selected]')].find(row => row.querySelector('button') !== null)"
  await waitFor(`${nonblankSession} !== undefined`, 'Aezy exposed no nonblank Session row')
  await evaluate(`${nonblankSession}.click(); true`)
  await waitFor("document.querySelector('[data-aezy-loop-inspector]') !== null", 'selected Session exposed no Inspector action')
  await evaluate("document.querySelector('[data-aezy-loop-inspector]').click(); true")
  await waitFor(`(() => {
    const frame = document.querySelector('[data-shell-overlay]')?.parentElement
    const handle = frame?.querySelector('[data-side="details"]')
    const tracks = frame === undefined || frame === null ? [] : getComputedStyle(frame).gridTemplateColumns.match(/-?\\d+(?:\\.\\d+)?px/g) ?? []
    const details = Number.parseFloat(tracks.at(-1) ?? '0')
    const frameRect = frame?.getBoundingClientRect()
    const handleRect = handle?.getBoundingClientRect()
    const handleX = handleRect === undefined ? 0 : handleRect.left + handleRect.width / 2
    const expectedX = frameRect === undefined ? Number.POSITIVE_INFINITY : frameRect.right - details
    return document.querySelector('[data-aezy-loop-inspector-panel]') !== null
      && handle !== null && handle !== undefined && details > 0
      && Math.abs(handleX - expectedX) < 10
      && document.elementFromPoint(handleX, handleRect.top + handleRect.height / 2)?.closest('[data-side]') === handle
  })()`, 'details panel did not finish opening')

  const before = await evaluate(`(() => {
    const frame = document.querySelector('[data-shell-overlay]').parentElement
    const handle = frame.querySelector('[data-side="details"]')
    const tracks = getComputedStyle(frame).gridTemplateColumns.match(/-?\\d+(?:\\.\\d+)?px/g).map(Number.parseFloat)
    const rect = frame.getBoundingClientRect()
    const handleRect = handle.getBoundingClientRect()
    const content = rect.width - tracks[0]
    const handleX = handleRect.left + handleRect.width / 2
    const handleY = handleRect.top + handleRect.height / 2
    return {
      frameWidth: rect.width,
      sidebar: tracks[0],
      center: tracks[1],
      details: tracks[2],
      targetX: rect.left + tracks[0] + Math.round(content * 0.25),
      dragX: rect.left + tracks[0] + Math.round(content * 0.25) - 120,
      handleX,
      handleY,
      handleWidth: handleRect.width,
      handleHeight: handleRect.height,
      hitSide: document.elementFromPoint(handleX, handleY)?.closest('[data-side]')?.dataset.side ?? null,
    }
  })()`)
  assert.ok(before.details <= 520, `expected the upstream starting width, got ${String(before.details)}`)

  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: before.handleX, y: before.handleY, button: 'left', buttons: 1, clickCount: 1 })
  for (const progress of [0.25, 0.5, 0.75, 1]) {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: before.handleX + (before.dragX - before.handleX) * progress,
      y: before.handleY,
      button: 'left',
      buttons: 1,
    })
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: before.dragX, y: before.handleY, button: 'left', buttons: 0, clickCount: 1 })
  await new Promise(resolve => setTimeout(resolve, 300))

  const after = await evaluate(`(() => {
    const frame = document.querySelector('[data-shell-overlay]').parentElement
    const tracks = getComputedStyle(frame).gridTemplateColumns.match(/-?\\d+(?:\\.\\d+)?px/g).map(Number.parseFloat)
    const content = tracks[1] + tracks[2]
    return {
      frameWidth: frame.getBoundingClientRect().width,
      sidebar: tracks[0],
      chat: tracks[1],
      details: tracks[2],
      content,
      chatRatio: tracks[1] / content,
      detailsRatio: tracks[2] / content,
      policy: frame.dataset.aezyLayoutPolicy,
      chatMinRatio: Number(frame.dataset.aezyChatMinRatio),
      detailsMaxRatio: Number(frame.dataset.aezyDetailsMaxRatio),
      chatMinPx: Number(frame.dataset.aezyChatMinPx),
      detailsMaxPx: Number(frame.dataset.aezyDetailsMaxPx),
      grid: getComputedStyle(frame).gridTemplateColumns,
    }
  })()`)
  assert.equal(after.policy, 'proportional-details-v1')
  assert.equal(after.chatMinRatio, 0.25, JSON.stringify({ before, after }))
  assert.equal(after.detailsMaxRatio, 0.75, JSON.stringify({ before, after }))
  assert.ok(after.details > 520, `details did not pass the upstream ceiling: ${String(after.details)}`)
  assert.ok(after.details > after.content / 2, 'details did not exceed half of the shared content region')
  assert.ok(after.details > after.frameWidth / 2, 'details did not exceed half of the full frame')
  assert.ok(Math.abs(after.chatRatio - 0.25) < 0.01, `Chat ratio was ${String(after.chatRatio)}`)
  assert.ok(Math.abs(after.detailsRatio - 0.75) < 0.01, `details ratio was ${String(after.detailsRatio)}`)
  assert.equal(Math.round(after.chat), after.chatMinPx)
  assert.equal(Math.round(after.details), after.detailsMaxPx)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 680,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await waitFor(`(() => {
    const frame = document.querySelector('[data-shell-overlay]')?.parentElement
    return frame !== undefined && frame !== null
      && frame.getBoundingClientRect().width < 760
      && frame.dataset.aezyChatMinRatio === undefined
      && document.querySelector('[data-aezy-loop-inspector-surface="overlay"]') !== null
  })()`, 'narrow viewport did not return authority to the overlay layout')
  const narrow = await evaluate(`(() => {
    const frame = document.querySelector('[data-shell-overlay]').parentElement
    return {
      frameWidth: frame.getBoundingClientRect().width,
      overlay: document.querySelector('[data-aezy-loop-inspector-surface="overlay"]') !== null,
      proportionalFactsPresent: frame.dataset.aezyChatMinRatio !== undefined,
    }
  })()`)
  assert.equal(narrow.overlay, true)
  assert.equal(narrow.proportionalFactsPresent, false)
  await send('Emulation.clearDeviceMetricsOverride')
  process.stdout.write(`${JSON.stringify({ before, after, narrow }, null, 2)}\n`)
} finally {
  socket.close()
}
