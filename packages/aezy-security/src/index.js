import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { auditRecord, PolicyStore } from './store.js'
import { classifyAction, evaluatePolicy } from './policy.js'

const ROUTE = '/aezy/api/security'
const MAX_BODY_BYTES = 32 * 1024

export { auditRecord, PolicyStore } from './store.js'
export {
  canonicalRepositoryRoot,
  classifyAction,
  effectiveNetworkMode,
  evaluatePolicy,
  normalizeRule,
  simpleShellTokens,
} from './policy.js'

export const inject = ['tools', 'webServer', 'sessions']

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

function sessionContext(exec) {
  const session = exec.agent?.session
  const cwd = session?.header.cwd ?? process.cwd()
  let turn = null
  if (session !== undefined) {
    const events = session.snapshotEvents()
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index]
      if (event.type === 'turn/end') break
      if (event.type === 'turn/start') {
        turn = event.data.turn
        break
      }
    }
  }
  return { cwd, sessionId: session?.id ?? null, turn }
}

/** Build the HTTP handler separately so policy storage can be integration-tested. */
export function createSecurityHandler(store) {
  return async (req, res) => {
    if (!requireWebClient(req)) {
      json(res, 403, { error: 'This endpoint accepts only Aezy Web requests.' })
      return
    }
    const url = new URL(req.url ?? '/', 'http://aezy.local')
    try {
      if (req.method === 'GET' && url.pathname === ROUTE) {
        json(res, 200, store.snapshot(url.searchParams.get('cwd')))
        return
      }
      if (req.method === 'POST' && url.pathname === `${ROUTE}/network`) {
        json(res, 200, await store.setNetwork(await readJson(req)))
        return
      }
      if (req.method === 'POST' && url.pathname === `${ROUTE}/network/clear`) {
        const body = await readJson(req)
        json(res, 200, await store.clearRepositoryNetwork(body.cwd))
        return
      }
      if (req.method === 'POST' && url.pathname === `${ROUTE}/rules`) {
        const body = await readJson(req)
        const rule = await store.addRule(body)
        json(res, 201, { rule, snapshot: store.snapshot(body.cwd) })
        return
      }
      if (req.method === 'POST' && url.pathname === `${ROUTE}/rules/delete`) {
        const body = await readJson(req)
        json(res, 200, { removed: await store.removeRule(body.id), snapshot: store.snapshot(body.cwd) })
        return
      }
      if (req.method === 'POST' && url.pathname === `${ROUTE}/explain`) {
        const body = await readJson(req)
        const action = classifyAction(body.tool, body.arguments, body.cwd)
        json(res, 200, { action, verdict: evaluatePolicy(store.state, action) })
        return
      }
      json(res, 404, { error: 'Unknown Aezy Security endpoint.' })
    } catch (error) {
      json(res, 400, { error: error instanceof Error ? error.message : String(error) })
    }
  }
}

/** Install durable policy ahead of DSH's one-shot user-approval mechanism. */
export function apply(ctx, config = {}) {
  const home = process.env.DSH_HOME ?? join(homedir(), '.aezy', 'dsh')
  const file = config.file ?? join(home, 'aezy', 'security.json')
  const store = new PolicyStore(file)
  const decisions = new WeakMap()
  const approvalRequests = new Map()

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE,
    handler: createSecurityHandler(store),
  }), 'aezy-security: policy API')

  ctx.on('tools/pre-execute', async (exec, next) => {
    const owner = sessionContext(exec)
    const action = classifyAction(exec.name, exec.arguments, owner.cwd)
    const verdict = evaluatePolicy(store.state, action)
    decisions.set(exec, verdict)

    if (verdict.source !== 'default' || action.network !== 'none') {
      await store.appendAudit(auditRecord({
        action,
        verdict,
        sessionId: owner.sessionId,
        turn: owner.turn,
        callId: String(exec.callId),
      }))
    }

    if (verdict.decision === 'deny') return { kind: 'deny', reason: verdict.explanation }
    const downstream = await next()
    if (downstream.kind !== 'allow') return downstream
    if (verdict.decision === 'ask') return { kind: 'ask', reason: verdict.explanation }
    return downstream
  }, { prepend: true })

  // A later waterfall policy cannot undo this deny backstop.
  ctx.effect(() => ctx.tools.guard((exec) => {
    const remembered = decisions.get(exec)
    if (remembered?.decision === 'deny') return remembered.explanation
    const owner = sessionContext(exec)
    const action = classifyAction(exec.name, exec.arguments, owner.cwd)
    const current = evaluatePolicy(store.state, action)
    return current.decision === 'deny' ? current.explanation : undefined
  }), 'aezy-security: monotonic deny guard')

  ctx.on('session/event', (session, event) => {
    if (event.type === 'approval/asked') {
      approvalRequests.set(event.data.id, {
        sessionId: String(session.id),
        callId: event.data.callId === undefined ? null : String(event.data.callId),
      })
      return
    }
    if (event.type !== 'approval/decided') return
    const request = approvalRequests.get(event.data.id)
    if (request === undefined) return
    approvalRequests.delete(event.data.id)
    void store.settleApproval({ ...request, outcome: event.data.outcome }).catch((error) => {
      ctx.logger.warn(error instanceof Error ? error : new Error(String(error)))
    })
  })

  // Exposed for another out-of-tree Aezy plugin to share the same audit boundary.
  ctx.provide('aezySecurity', {
    file: resolve(file),
    snapshot: cwd => store.snapshot(cwd),
    evaluate: (tool, args, cwd) => {
      const action = classifyAction(tool, args, cwd)
      return { action, verdict: evaluatePolicy(store.state, action) }
    },
    auditUserAction: ({ tool, cwd, sessionId = null, turn = null, callId, explanation }) => {
      const action = classifyAction(tool, {}, cwd)
      return store.appendAudit(auditRecord({
        action,
        verdict: {
          decision: 'allow',
          source: 'user-confirmation',
          explanation,
        },
        sessionId,
        turn,
        callId,
      }))
    },
  })
}
