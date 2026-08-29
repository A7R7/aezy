export * from './definition.js'
export * from './system.js'
export * from './editor.js'

import { homedir } from 'node:os'
import { join } from 'node:path'
import { WorkflowDefinitionStore } from './editor.js'

const ROUTE = '/aezy/api/workflows'
const MAX_BODY_BYTES = 32 * 1024

export const name = '@aezy/workflow'
export const inject = ['webServer']

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
  if (req.headers['x-aezy-client'] !== 'web' || req.headers['sec-fetch-site'] === 'cross-site') return false
  const authority = req.headers.host
  if (typeof authority !== 'string') return false
  let host
  try { host = new URL(`http://${authority}`).hostname } catch { return false }
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) return false
  const origin = req.headers.origin
  if (typeof origin !== 'string') return true
  try { return new URL(origin).host === authority } catch { return false }
}

async function readJson(req) {
  if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) throw new Error('content-type must be application/json')
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('workflow request exceeds size limit')
    chunks.push(chunk)
  }
  const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('request body must be an object')
  return value
}

export function createWorkflowHandler(store) {
  return async (req, res) => {
    if (!requireWebClient(req)) return json(res, 403, { error: 'This endpoint accepts only Aezy Web requests.' })
    const url = new URL(req.url ?? '/', 'http://aezy.local')
    try {
      if (req.method === 'GET' && url.pathname === ROUTE) return json(res, 200, store.snapshot())
      if (req.method === 'POST' && url.pathname === `${ROUTE}/preview`) return json(res, 200, store.preview(await readJson(req)))
      if (req.method === 'POST' && url.pathname === `${ROUTE}/publish`) return json(res, 201, await store.publish(await readJson(req)))
      return json(res, 404, { error: 'Unknown Aezy workflow endpoint.' })
    } catch (error) {
      return json(res, 400, { error: error instanceof Error ? error.message : String(error) })
    }
  }
}

export function apply(ctx, config = {}) {
  const home = process.env.DSH_HOME ?? join(homedir(), '.aezy', 'dsh')
  const store = new WorkflowDefinitionStore(config.file ?? join(home, 'aezy', 'workflow-definitions.json'))
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: ROUTE, handler: createWorkflowHandler(store) }), 'aezy-workflow: template editor API')
  ctx.provide('aezyWorkflow', { store, executionAvailable: false })
}
