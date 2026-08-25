import { randomUUID } from 'node:crypto'
import { TerminalError, TerminalSessionId } from '@deepseek-ai/dsh-terminal'

const ROUTE = '/aezy/api/terminal'
const UI_NAME_PREFIX = 'aezy-ui:'
const MAX_BODY_BYTES = 32 * 1024
const MAX_INPUT_BYTES = 16 * 1024
const READ_LINES = 1000
const MAX_TERMINALS = 8

export const terminalLimits = Object.freeze({
  maxBodyBytes: MAX_BODY_BYTES,
  maxInputBytes: MAX_INPUT_BYTES,
  readLines: READ_LINES,
  maxTerminals: MAX_TERMINALS,
})

export class TerminalRequestError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'TerminalRequestError'
    this.status = status
  }
}

function requiredString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TerminalRequestError(`${name} must be a non-empty string`)
  }
  return value
}

function terminalView(snapshot, index) {
  return {
    id: snapshot.sessionId,
    title: `Terminal ${index + 1}`,
    type: snapshot.type,
    ...(snapshot.pid !== undefined ? { pid: snapshot.pid } : {}),
    status: snapshot.status,
  }
}

function translateTerminalError(error) {
  if (!(error instanceof TerminalError)) return error
  if (error.code === 'SEND_ACTIVE' || error.code === 'DUPLICATE_NAME') {
    return new TerminalRequestError(error.message, 409)
  }
  if (error.code === 'NO_SESSION') return new TerminalRequestError(error.message, 404)
  if (error.code === 'FOREIGN_SESSION') return new TerminalRequestError(error.message, 403)
  if (error.code === 'NO_BACKEND') return new TerminalRequestError(error.message, 503)
  return new TerminalRequestError(error.message, 409)
}

/** Thin authority and transport projection over DSH's owner-scoped PTY service. */
export class TerminalBridge {
  constructor({ agents, terminals }) {
    this.agents = agents
    this.terminals = terminals
  }

  owner(input) {
    const sessionId = requiredString(input.sessionId, 'sessionId')
    const cwd = requiredString(input.cwd, 'cwd')
    const agent = this.agents.get(sessionId)
    if (agent === undefined) {
      throw new TerminalRequestError(
        `Session "${sessionId}" has no attached runtime. Send or resume the Session before opening a terminal.`,
        409,
      )
    }
    if (agent.session?.id !== sessionId || agent.session?.header?.cwd !== cwd) {
      throw new TerminalRequestError('Terminal Session/cwd identity does not match the attached runtime.', 409)
    }
    return { agent, sessionId, cwd }
  }

  uiSnapshots(agent) {
    return this.terminals.list(agent).filter(snapshot => snapshot.name?.startsWith(UI_NAME_PREFIX))
  }

  expectTerminal(agent, id) {
    const terminalId = requiredString(id, 'terminalId')
    const snapshots = this.uiSnapshots(agent)
    const index = snapshots.findIndex(snapshot => snapshot.sessionId === terminalId)
    if (index < 0) throw new TerminalRequestError('Unknown Integrated Terminal for this Session.', 404)
    return { id: TerminalSessionId(terminalId), snapshot: snapshots[index], index }
  }

  list(input) {
    const { agent, sessionId, cwd } = this.owner(input)
    const snapshots = this.uiSnapshots(agent)
    return {
      sessionId,
      cwd,
      backendAvailable: this.terminals.listBackends().includes('shell'),
      terminals: snapshots.map(terminalView),
    }
  }

  async open(input) {
    const { agent, sessionId, cwd } = this.owner(input)
    if (!this.terminals.listBackends().includes('shell')) {
      throw new TerminalRequestError('The DSH platform shell backend is unavailable.', 503)
    }
    if (this.uiSnapshots(agent).length >= MAX_TERMINALS) {
      throw new TerminalRequestError(`A Session can open at most ${MAX_TERMINALS} Integrated Terminals.`, 409)
    }
    try {
      const created = await this.terminals.spawn(agent, {
        type: 'shell',
        name: `${UI_NAME_PREFIX}${randomUUID()}`,
        cwd,
      })
      const snapshots = this.uiSnapshots(agent)
      const index = snapshots.findIndex(snapshot => snapshot.sessionId === created.sessionId)
      return {
        sessionId,
        cwd,
        terminal: terminalView(created, Math.max(0, index)),
        output: created.motd,
      }
    } catch (error) {
      throw translateTerminalError(error)
    }
  }

  read(input) {
    const { agent, sessionId, cwd } = this.owner(input)
    const target = this.expectTerminal(agent, input.terminalId)
    try {
      const result = this.terminals.read(agent, target.id, { offset: 0, count: READ_LINES })
      const snapshot = this.uiSnapshots(agent).find(item => item.sessionId === target.id) ?? target.snapshot
      return {
        sessionId,
        cwd,
        terminal: terminalView(snapshot, target.index),
        output: result.text,
        totalLines: result.totalLines,
        truncated: result.truncated,
      }
    } catch (error) {
      throw translateTerminalError(error)
    }
  }

  async send(input) {
    const { agent, sessionId, cwd } = this.owner(input)
    const target = this.expectTerminal(agent, input.terminalId)
    if (target.snapshot.status.kind !== 'running') {
      throw new TerminalRequestError('This terminal process has already exited.', 409)
    }
    const text = typeof input.text === 'string' ? input.text : null
    if (text === null) throw new TerminalRequestError('text must be a string')
    if (text.includes('\0')) throw new TerminalRequestError('Terminal input must not contain NUL bytes')
    if (Buffer.byteLength(text) > MAX_INPUT_BYTES) {
      throw new TerminalRequestError(`Terminal input exceeds ${MAX_INPUT_BYTES} bytes`)
    }
    try {
      const result = await this.terminals.startSend(agent, target.id, { text, submit: true }).done
      return {
        sessionId,
        cwd,
        terminalId: target.id,
        waitReason: result.waitReason,
        status: result.sessionStatus,
        truncated: result.truncated,
      }
    } catch (error) {
      throw translateTerminalError(error)
    }
  }

  async signal(input) {
    const { agent, sessionId, cwd } = this.owner(input)
    const target = this.expectTerminal(agent, input.terminalId)
    if (input.signal !== 'SIGINT') throw new TerminalRequestError('Integrated Terminal permits only SIGINT')
    try {
      const result = await this.terminals.signal(agent, target.id, 'SIGINT')
      return { sessionId, cwd, terminalId: target.id, delivered: result.delivered }
    } catch (error) {
      throw translateTerminalError(error)
    }
  }

  async close(input) {
    const { agent, sessionId, cwd } = this.owner(input)
    const target = this.expectTerminal(agent, input.terminalId)
    try {
      await this.terminals.kill(agent, target.id, 'Aezy user closed Integrated Terminal')
      return { sessionId, cwd, terminalId: target.id, closed: true }
    } catch (error) {
      throw translateTerminalError(error)
    }
  }
}

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
    throw new TerminalRequestError('content-type must be application/json')
  }
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new TerminalRequestError('request body exceeds the Aezy limit')
    chunks.push(chunk)
  }
  let value
  try {
    value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new TerminalRequestError('request body must be valid JSON')
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TerminalRequestError('request body must be a JSON object')
  }
  return value
}

function query(url, name) {
  return url.searchParams.get(name)
}

export function createHandler(bridge, warn = () => {}) {
  return async (req, res) => {
    if (!requireWebClient(req)) {
      json(res, 403, { error: 'This endpoint accepts only Aezy Web requests.' })
      return
    }
    const url = new URL(req.url ?? '/', 'http://aezy.local')
    try {
      if (req.method === 'GET' && url.pathname === ROUTE) {
        json(res, 200, bridge.list({ sessionId: query(url, 'sessionId'), cwd: query(url, 'cwd') }))
        return
      }
      if (req.method === 'GET' && url.pathname === `${ROUTE}/read`) {
        json(res, 200, bridge.read({
          sessionId: query(url, 'sessionId'), cwd: query(url, 'cwd'), terminalId: query(url, 'terminalId'),
        }))
        return
      }
      if (req.method === 'POST') {
        const body = await readJson(req)
        if (url.pathname === `${ROUTE}/open`) json(res, 201, await bridge.open(body))
        else if (url.pathname === `${ROUTE}/send`) json(res, 200, await bridge.send(body))
        else if (url.pathname === `${ROUTE}/signal`) json(res, 200, await bridge.signal(body))
        else if (url.pathname === `${ROUTE}/close`) json(res, 200, await bridge.close(body))
        else json(res, 404, { error: 'Unknown Aezy terminal endpoint.' })
        return
      }
      json(res, 404, { error: 'Unknown Aezy terminal endpoint.' })
    } catch (error) {
      const known = error instanceof TerminalRequestError
      if (!known) warn(error)
      json(res, known ? error.status : 500, {
        error: known ? error.message : 'Integrated Terminal request failed.',
      })
    }
  }
}

export const inject = ['webServer', 'agents', 'terminals']

export function apply(ctx) {
  const bridge = new TerminalBridge({ agents: ctx.agents, terminals: ctx.terminals })
  const handler = createHandler(bridge, error => ctx.logger.warn(error))
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: ROUTE, handler }), 'aezy-terminal: HTTP bridge')
}

export default { inject, apply }
