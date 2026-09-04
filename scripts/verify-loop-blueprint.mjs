import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { alphaProfileDir } from './lib/alpha-runtime.mjs'

const launchToken = process.env.AEZY_ALPHA_GATE_TOKEN
if (!launchToken) throw new Error('AEZY_ALPHA_GATE_TOKEN is required for the authenticated blueprint gate')
const baseUrl = process.env.AEZY_ALPHA_GATE_URL ?? 'http://127.0.0.1:3091'
const cdpUrl = process.env.AEZY_BLUEPRINT_CDP_URL ?? 'http://127.0.0.1:9224'
const screenshotDir = process.env.AEZY_BLUEPRINT_SCREENSHOT_DIR
const requireFromProfile = createRequire(join(alphaProfileDir, 'package.json'))
const wsModule = await import(pathToFileURL(requireFromProfile.resolve('ws')).href)
const WebSocket = wsModule.WebSocket ?? wsModule.default

const targets = await fetch(`${cdpUrl}/json/list`, { signal: AbortSignal.timeout(10_000) }).then(response => response.json())
const target = targets.find(candidate => candidate.type === 'page' && candidate.url === 'about:blank')
  ?? targets.find(candidate => candidate.type === 'page')
assert.equal(typeof target?.webSocketDebuggerUrl, 'string', 'CDP exposed no page target')
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.once('open', resolve)
  socket.once('error', reject)
})

let sequence = 0
const pending = new Map()
const pageErrors = []
socket.on('message', raw => {
  const message = JSON.parse(raw.toString())
  if (message.method === 'Runtime.exceptionThrown') {
    pageErrors.push(message.params?.exceptionDetails?.text ?? 'page exception')
    return
  }
  if (typeof message.id !== 'number') return
  const waiter = pending.get(message.id)
  if (waiter === undefined) return
  pending.delete(message.id)
  if (message.error !== undefined) waiter.reject(new Error(message.error.message))
  else waiter.resolve(message.result)
})

function send(method, params = {}) {
  sequence += 1
  const result = Promise.withResolvers()
  pending.set(sequence, result)
  socket.send(JSON.stringify({ id: sequence, method, params }))
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

const expected = {
  'dsh-native': { lanes: 5, nodes: 40, edges: 59, digest: 'sha256:772d6169735e6214812ce460ab00574f900b57c5a6a282a7885ef57502bf86b4' },
  'codex-app-server': { lanes: 5, nodes: 41, edges: 54, digest: 'sha256:9ad35e581aa482b8d5ea5ebd13022958b8e538c23488b018c9bc2b00195531ee' },
}

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${baseUrl}/?token=${encodeURIComponent(launchToken)}` })
  await waitFor("document.readyState === 'complete' && document.querySelector('[data-shell-overlay]') !== null", 'Aezy AppFrame did not load')
  const rowSelector = "[...document.querySelectorAll('[role=treeitem][aria-selected]')].filter(row => row.querySelector('button') !== null)"
  const found = {}
  const observedRows = []
  const inspectVisibleRows = async () => {
    const rows = await evaluate(`${rowSelector}.map((row, index) => ({ index, text: row.textContent?.trim().slice(0, 120) ?? '', attrs: Object.fromEntries([...row.attributes].map(item => [item.name, item.value])) }))`)
    observedRows.push(...rows)
    for (let index = 0; index < rows.length && Object.keys(found).length < 2; index += 1) {
    await evaluate(`(() => { const row = ${rowSelector}[${String(index)}]; if (!row) return false; row.click(); return true })()`)
    await waitFor("document.querySelector('[data-aezy-loop-inspector]') !== null", `Session row ${String(index)} exposed no Inspector action`)
    await evaluate("document.querySelector('[data-aezy-loop-inspector]').click(); true")
    await waitFor("document.querySelector('[data-aezy-loop-logic-graph]') !== null", `Session row ${String(index)} exposed no logic graph`)
    const blueprintId = await evaluate("document.querySelector('[data-aezy-loop-logic-graph]').dataset.blueprint")
    if (expected[blueprintId] !== undefined && found[blueprintId] === undefined) {
      const snapshot = await evaluate(`(async () => {
        const graph = document.querySelector('[data-aezy-loop-logic-graph]')
        const lanes = [...graph.querySelectorAll('[data-aezy-loop-blueprint-lane]')]
        const nodes = [...graph.querySelectorAll('[data-aezy-loop-blueprint-node]')]
        const edges = [...graph.querySelectorAll('[data-aezy-loop-blueprint-edge]')]
        const zoom = [...graph.querySelectorAll('button')].find(button => button.textContent === '80%')
        const full = [...graph.querySelectorAll('button')].find(button => button.textContent === '100%')
        const defaultZoom80 = zoom?.getAttribute('aria-pressed') === 'true'
        full?.click()
        await new Promise(resolve => setTimeout(resolve, 50))
        const zoom100 = [...graph.querySelectorAll('button')].find(button => button.textContent === '100%')?.getAttribute('aria-pressed') === 'true'
        const firstEdge = edges[0]
        firstEdge?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await new Promise(resolve => setTimeout(resolve, 50))
        return {
          revisionText: graph.textContent.includes('Static blueprint v3'),
          revision: Number(graph.dataset.blueprintRevision),
          digest: graph.dataset.blueprintDigest,
          lanes: lanes.length,
          nodes: nodes.length,
          edges: edges.length,
          laneIds: lanes.map(item => item.dataset.aezyLoopBlueprintLane),
          opaque: nodes.filter(item => item.textContent.includes('OPAQUE')).map(item => item.dataset.aezyLoopBlueprintNode),
          oldOpaqueCore: graph.textContent.includes('Official Codex agent core'),
          defaultZoom80,
          zoom100,
          edgeGuardVisible: graph.textContent.includes('Guard:'),
          horizontalScrollable: graph.querySelector('div[style*="overflow: auto"]')?.scrollWidth > graph.clientWidth,
        }
      })()`)
      assert.equal(snapshot.revisionText, true)
      assert.equal(snapshot.revision, 3)
      assert.equal(snapshot.digest, expected[blueprintId].digest)
      assert.equal(snapshot.lanes, expected[blueprintId].lanes)
      assert.equal(snapshot.nodes, expected[blueprintId].nodes)
      assert.equal(snapshot.edges, expected[blueprintId].edges)
      assert.deepEqual(snapshot.opaque, [blueprintId === 'dsh-native' ? 'dsh-model-inference' : 'codex-model-inference'])
      assert.equal(snapshot.oldOpaqueCore, false)
      assert.equal(snapshot.defaultZoom80, true)
      assert.equal(snapshot.zoom100, true)
      assert.equal(snapshot.edgeGuardVisible, true)
      assert.equal(snapshot.horizontalScrollable, true)
      found[blueprintId] = snapshot
      if (screenshotDir !== undefined) {
        await mkdir(screenshotDir, { recursive: true })
        const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
        await writeFile(join(screenshotDir, `${blueprintId}.png`), Buffer.from(screenshot.data, 'base64'))
      }
    }
      await evaluate("document.querySelector('[aria-label=\"Close Loop Inspector\"]')?.click(); true")
      await new Promise(resolve => setTimeout(resolve, 150))
    }
  }
  const projectSelector = '[...document.querySelectorAll(\'[role=treeitem][class*="projectRow"]\')]'
  await waitFor(`${rowSelector}.length > 0 || ${projectSelector}.length > 0`, 'Aezy exposed neither a project nor a selectable nonblank Session row')
  if (await evaluate(`${rowSelector}.length > 0`)) await inspectVisibleRows()
  const projects = await evaluate(`${projectSelector}.map(row => row.textContent?.trim() ?? '')`)
  for (const project of projects) {
    if (Object.keys(found).length >= 2) break
    await evaluate(`(() => { const row = [...document.querySelectorAll('[role=treeitem][class*="projectRow"]')].find(item => item.textContent?.trim() === ${JSON.stringify(project)}); if (!row) return false; row.click(); return true })()`)
    await new Promise(resolve => setTimeout(resolve, 250))
    await inspectVisibleRows()
  }
  const allRows = await evaluate("[...document.querySelectorAll('[role=treeitem]')].map((row, index) => ({ index, text: row.textContent?.trim().slice(0, 120) ?? '', className: row.className, selected: row.getAttribute('aria-selected') }))")
  assert.deepEqual(Object.keys(found).sort(), ['codex-app-server', 'dsh-native'], `visible Sessions did not cover both backends: ${JSON.stringify({ observedRows, projects, allRows })}`)
  assert.deepEqual(pageErrors, [])
  process.stdout.write(`${JSON.stringify({ found, pageErrors }, null, 2)}\n`)
} finally {
  socket.close()
}
