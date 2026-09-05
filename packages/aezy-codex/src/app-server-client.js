import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { createInterface } from 'node:readline'

const require = createRequire(import.meta.url)

export const DEFAULT_CLIENT_INFO = Object.freeze({
  name: 'aezy',
  title: 'Aezy',
  version: '0.1.0',
})

export const DEFAULT_CAPABILITIES = Object.freeze({ experimentalApi: true })

export function bundledCodexSpawnSpec() {
  return Object.freeze({
    command: process.execPath,
    argsPrefix: Object.freeze([require.resolve('@openai/codex/bin/codex.js')]),
    source: 'bundled',
  })
}

export class CodexAppServerClient extends EventEmitter {
  constructor({
    command,
    argsPrefix,
    appServerArgs = ['app-server'],
    clientInfo = DEFAULT_CLIENT_INFO,
    capabilities = DEFAULT_CAPABILITIES,
    requestTimeoutMs = 30_000,
    spawnProcess = spawn,
    env,
    cwd,
  } = {}) {
    super()
    const bundled = command ? null : bundledCodexSpawnSpec()
    this.command = command ?? bundled.command
    this.argsPrefix = [...(argsPrefix ?? bundled.argsPrefix)]
    this.appServerArgs = [...appServerArgs]
    this.clientInfo = structuredClone(clientInfo)
    this.capabilities = structuredClone(capabilities)
    this.requestTimeoutMs = requestTimeoutMs
    this.spawnProcess = spawnProcess
    this.env = env === undefined ? undefined : { ...env }
    this.cwd = cwd
    this.child = null
    this.nextRequestId = 1
    this.pending = new Map()
    this.state = 'not-started'
    this.closed = false
  }

  spawnSpec() {
    return Object.freeze({
      command: this.command,
      args: Object.freeze([...this.argsPrefix, ...this.appServerArgs]),
    })
  }

  status() {
    return Object.freeze({ state: this.state })
  }

  async start() {
    if (this.child) return
    this.closed = false
    this.setState('starting')
    const spec = this.spawnSpec()
    const child = this.spawnProcess(spec.command, [...spec.args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      ...(this.env === undefined ? {} : { env: { ...this.env } }),
      ...(this.cwd === undefined ? {} : { cwd: this.cwd }),
    })
    this.child = child
    createInterface({ input: child.stdout }).on('line', (line) => this.handleLine(line))
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk) => this.emit('diagnostic', String(chunk)))
    child.stdin.on('error', (error) => this.fail(error))
    child.once('error', (error) => this.fail(error))
    child.once('exit', (code, signal) => {
      if (this.child === child) this.child = null
      if (!this.closed) this.fail(new Error(`codex app-server exited (${signal ?? code})`))
    })
    try {
      await this.request('initialize', {
        clientInfo: this.clientInfo,
        capabilities: this.capabilities,
      })
      this.notify('initialized', {})
      this.setState('connected')
    } catch (error) {
      this.setState('connection-failed')
      await this.close({ state: 'connection-failed' })
      throw error
    }
  }

  request(method, params = {}, { timeoutMs = this.requestTimeoutMs } = {}) {
    if (!this.child?.stdin?.writable) return Promise.reject(new Error('Codex App Server is not running'))
    const id = this.nextRequestId++
    return new Promise((resolve, reject) => {
      const timer = timeoutMs === null ? null : setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`${method} timed out after ${timeoutMs}ms`))
      }, timeoutMs)
      this.pending.set(id, { method, resolve, reject, timer })
      this.write({ id, method, params })
    })
  }

  notify(method, params = {}) {
    this.write({ method, params })
  }

  respond(id, result) {
    this.write({ id, result })
  }

  respondError(id, code, message) {
    this.write({ id, error: { code, message } })
  }

  async close({ state = 'not-started' } = {}) {
    this.closed = true
    const child = this.child
    this.child = null
    this.rejectPending(new Error('Codex App Server client closed'))
    if (!child) {
      this.setState(state)
      return
    }
    child.kill('SIGTERM')
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 1_000)
      child.once('exit', () => {
        clearTimeout(timer)
        resolve()
      })
    })
    this.setState(state)
  }

  handleLine(line) {
    let message
    try {
      message = JSON.parse(line)
    } catch (error) {
      this.emit('diagnostic', `invalid app-server JSON: ${error.message}`)
      return
    }
    if (message.id != null && ('result' in message || 'error' in message)) {
      const pending = this.pending.get(message.id)
      if (!pending) return
      if (pending.timer) clearTimeout(pending.timer)
      this.pending.delete(message.id)
      if (message.error) {
        const error = new Error(message.error.message ?? `${pending.method} failed`)
        error.code = message.error.code
        error.data = message.error.data
        pending.reject(error)
      } else pending.resolve(message.result)
      return
    }
    if (message.id != null && message.method) {
      this.emit('serverRequest', Object.freeze(structuredClone(message)))
      return
    }
    if (message.method) this.emit('notification', Object.freeze(structuredClone(message)))
  }

  write(message) {
    if (!this.child?.stdin?.writable) throw new Error('Codex App Server is not running')
    this.child.stdin.write(`${JSON.stringify(message)}\n`)
  }

  fail(error) {
    this.rejectPending(error)
    if (!this.closed) this.setState('connection-failed')
    this.emit('runtimeError', error)
  }

  rejectPending(error) {
    for (const pending of this.pending.values()) {
      if (pending.timer) clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.pending.clear()
  }

  setState(state) {
    if (this.state === state) return
    this.state = state
    this.emit('status', this.status())
  }
}
