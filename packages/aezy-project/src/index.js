import {
  describeDiff,
  describeProject,
  parsePorcelainV2,
} from './git.js'
import { TurnLedger } from './ledger.js'
import { basename, summarizeTurn } from './summary.js'

const ROUTE = '/aezy/api/project'
const MAX_BODY_BYTES = 32 * 1024

export { basename, describeDiff, describeProject, parsePorcelainV2, summarizeTurn, TurnLedger }
export const inject = ['webServer', 'sessions', 'aezySecurity']

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

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
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
      const source = new URL(origin)
      if (source.protocol !== 'http:' || source.host !== authority) return false
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
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('request body exceeds the Aezy limit')
    chunks.push(chunk)
  }
  const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('request body must be a JSON object')
  }
  return value
}

function query(url, name) {
  return url.searchParams.get(name)
}

function createHandler(ledger, security, warn) {
  return async (req, res) => {
    if (!requireWebClient(req)) {
      json(res, 403, { error: 'This endpoint accepts only Aezy Web requests.' })
      return
    }
    const url = new URL(req.url ?? '/', 'http://aezy.local')
    try {
      if (req.method === 'GET' && url.pathname === ROUTE) {
        json(res, 200, await describeProject(query(url, 'cwd')))
        return
      }
      if (req.method === 'GET' && url.pathname === `${ROUTE}/diff`) {
        json(res, 200, await describeDiff(query(url, 'cwd'), query(url, 'path')))
        return
      }
      if (req.method === 'GET' && url.pathname === `${ROUTE}/ledger`) {
        json(res, 200, await ledger.view(query(url, 'cwd'), query(url, 'sessionId')))
        return
      }
      if (req.method === 'POST' && url.pathname === `${ROUTE}/revert`) {
        const body = await readJson(req)
        const result = await ledger.revert(body)
        await security.auditUserAction({
          tool: 'aezy.project.revert',
          cwd: body.cwd,
          sessionId: body.sessionId,
          turn: body.turn,
          callId: result.receiptId,
          explanation: 'Allowed by the user-confirmed Aezy Web revert action.',
        }).catch(warn)
        json(res, 200, result)
        return
      }
      if (req.method === 'POST' && url.pathname === `${ROUTE}/undo`) {
        const body = await readJson(req)
        const result = await ledger.undo(body)
        await security.auditUserAction({
          tool: 'aezy.project.undo',
          cwd: body.cwd,
          callId: body.receiptId,
          explanation: 'Allowed by the explicit Aezy Web Undo action.',
        }).catch(warn)
        json(res, 200, result)
        return
      }
      json(res, 404, { error: 'Unknown Aezy Project endpoint.' })
    } catch (error) {
      const message = messageOf(error)
      const conflict = /changed since|already undone|does not match/u.test(message)
      json(res, conflict ? 409 : 400, { error: message })
    }
  }
}

/** Register the M1 Project HTTP surface and turn observer on public DSH seams. */
export function apply(ctx) {
  const warn = error => ctx.logger.warn(error instanceof Error ? error : new Error(String(error)))
  const ledger = new TurnLedger({
    warn,
  })
  const handler = createHandler(ledger, ctx.aezySecurity, warn)
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE,
    handler,
  }), 'aezy-project: repository API')
  ctx.on('session/event', (session, event) => {
    ledger.observe(session, event)
  })
}
