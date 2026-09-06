import { spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { open, readFile, unlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { bundledCodexSpawnSpec } from '@aezy/codex'
import { isolatedChildEnv, privateDirectory } from '@aezy/codex/runtime-instance'
import { createCatalog, CATALOG_REVISION } from './catalog.js'

const require = createRequire(import.meta.url)
export const OPENCODEX_VERSION = '2.42.0'
export const BUN_VERSION = '1.4.0'

export function gatewayConfig({ baseURL, models }) {
  const url = new URL(baseURL)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('DSH DeepSeek endpoint must be an HTTP(S) URL without embedded credentials')
  }
  if (!models.length || models.some(id => !/^[a-zA-Z0-9._-]+$/.test(id))) {
    throw new Error('Managed OpenCodex requires explicit DeepSeek model IDs')
  }
  return {
    port: 10391,
    // Linux/WSL loopback, with the official gateway's mandatory bearer-auth
    // policy. 127.0.0.1 deliberately bypasses that policy in OpenCodex 2.42.0.
    hostname: '127.0.0.2',
    providers: { deepseek: {
      adapter: 'openai-chat', baseUrl: baseURL.replace(/\/+$/, ''), authMode: 'key',
      apiKey: '${AEZY_OPENCODEX_PROVIDER_API_KEY}', models, selectedModels: models,
      // Official direct-tool catalog option; native Codex permissions remain
      // read-only. Mutable tools are still the DSH dynamic-tool bridge.
      codexToolMode: 'shell',
    } },
    defaultProvider: 'deepseek', openaiProviderTierVersion: 2,
    subagentModels: [], multiAgentGuidanceEnabled: false, websockets: false,
    codexAutoStart: false, codexShimAutoRestore: false, syncResumeHistory: false,
    syncCodexSubagentDefaults: false,
    clientIntegrations: { codex: true, grok: false, 'claude-desktop': false },
    webSearchSidecar: { enabled: false }, visionSidecar: { enabled: false },
    agentTaskRecovery: { enabled: false }, resetCreditAutoRedeem: { enabled: false },
    unauthenticatedLoopbackListener: { enabled: false, port: 10392 },
  }
}

export async function bundledGatewayPaths() {
  if (process.platform !== 'linux' || process.arch !== 'x64') {
    throw new Error('Managed OpenCodex currently supports Linux/WSL x64 only')
  }
  const manifest = require.resolve('@bitkyc08/opencodex/package.json')
  if (JSON.parse(await readFile(manifest, 'utf8')).version !== OPENCODEX_VERSION) throw new Error('OpenCodex pin mismatch')
  const bunManifest = createRequire(require.resolve('bun/package.json')).resolve('@oven/bun-linux-x64/package.json')
  if (JSON.parse(await readFile(bunManifest, 'utf8')).version !== BUN_VERSION) throw new Error('Bun pin mismatch')
  return {
    bun: join(dirname(bunManifest), 'bin', 'bun'),
    entry: fileURLToPath(new URL('./gateway-entry.mjs', import.meta.url)),
    codex: bundledCodexSpawnSpec().argsPrefix[0],
  }
}

/** One owned gateway per DSH_HOME. No global CLI start/stop/sync-restart. */
export class OpenCodexManager {
  constructor({ dshHome, environment = process.env }) {
    this.root = join(dshHome, 'aezy', 'opencodex')
    this.environment = environment
    this.children = new Set()
    this.closed = false
    this.state = 'not-started'
    this.lock = null
  }

  launch(command, args, env) {
    if (this.closed) throw new Error('Managed OpenCodex is stopped')
    const child = spawn(command, args, { env, cwd: this.root, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
    this.children.add(child)
    child.once('close', () => this.children.delete(child))
    // Upstream diagnostics may include provider error payloads. Never forward
    // raw child output into DSH logs or the browser account/status projection.
    child.stderr.resume()
    child.stdin.on('error', () => {})
    return child
  }

  async run(command, args, env, stage) {
    const child = this.launch(command, args, env)
    child.stdout.resume()
    child.stdin.end()
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`Managed OpenCodex ${stage} timed out`)) }, 90_000)
      child.once('error', () => { clearTimeout(timeout); reject(new Error(`Managed OpenCodex ${stage} failed to launch`)) })
      child.once('exit', code => { clearTimeout(timeout); code === 0 ? resolve() : reject(new Error(`Managed OpenCodex ${stage} failed (${code})`)) })
    })
  }

  async start({ baseURL, models, apiKey, credentialRef, credentialSource }) {
    if (this.closed) throw new Error('Managed OpenCodex is stopped')
    if (this.state !== 'not-started') throw new Error('Managed OpenCodex can only be started once')
    this.state = 'starting'
    try {
      if (!apiKey) throw new Error('DSH DeepSeek credential is unavailable; no personal fallback is permitted')
      await privateDirectory(this.root)
      this.lock = await open(join(this.root, 'aezy-owner.lock'), 'wx', 0o600)
      await this.lock.writeFile(JSON.stringify({ pid: process.pid }))
      const integrationHome = await privateDirectory(join(this.root, 'unused-codex-home'))
      const temporaryHome = await privateDirectory(join(this.root, 'tmp'))
      await writeFileAtomic(join(integrationHome, 'config.toml'), 'cli_auth_credentials_store = "file"\n', { mode: 0o600 })
      const config = gatewayConfig({ baseURL, models })
      await writeFileAtomic(join(this.root, 'config.json'), `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 })
      const paths = await bundledGatewayPaths()
      const dataKey = randomBytes(32).toString('hex')
      const env = {
        ...isolatedChildEnv(this.environment),
        TMPDIR: temporaryHome, TMP: temporaryHome, TEMP: temporaryHome,
        OPENCODEX_HOME: this.root, CODEX_HOME: integrationHome, CODEX_SQLITE_HOME: integrationHome,
        CODEX_CLI_PATH: paths.codex, OPENCODEX_BUN_PATH: paths.bun,
        AEZY_OPENCODEX_PROVIDER_API_KEY: apiKey,
        OPENCODEX_API_AUTH_TOKEN: dataKey, OPENCODEX_ADMIN_AUTH_TOKEN: randomBytes(32).toString('hex'),
      }
      // Validate with the vendor's public API before any CLI/config integration.
      await this.run(paths.bun, [paths.entry, '--validate'], env, 'config validation')
      const catalog = createCatalog(models)
      const catalogPath = join(this.root, 'codex-catalog.json')
      await writeFileAtomic(catalogPath, `${JSON.stringify(catalog)}\n`, { mode: 0o600 })
      const child = this.launch(paths.bun, [paths.entry], env)
      child.stdin.end()
      const address = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Managed OpenCodex startup timed out')), 45_000)
        const fail = () => { clearTimeout(timeout); reject(new Error('Managed OpenCodex exited before readiness')) }
        child.once('error', fail)
        child.once('exit', fail)
        createInterface({ input: child.stdout }).on('line', line => {
          if (!line.startsWith('AEZY_GATEWAY_READY ')) return
          try {
            const value = JSON.parse(line.slice('AEZY_GATEWAY_READY '.length))
            if (!Number.isInteger(value.port) || value.port < 1 || value.port > 65535) return
            clearTimeout(timeout)
            resolve(value)
          } catch { /* Only the owned readiness message is a control message. */ }
        })
      })
      const endpoint = `http://127.0.0.2:${address.port}/v1`
      const unauthenticated = await fetch(`${endpoint}/models`, { signal: AbortSignal.timeout(10_000) })
      const authenticated = await fetch(`${endpoint}/models`, { headers: { authorization: `Bearer ${dataKey}` }, signal: AbortSignal.timeout(10_000) })
      if (unauthenticated.status !== 401 || !authenticated.ok) throw new Error('Managed OpenCodex bearer-auth readiness check failed')
      await unauthenticated.body?.cancel()
      await authenticated.body?.cancel()
      if (this.closed) throw new Error('Managed OpenCodex stopped during startup')
      child.once('exit', () => { this.state = this.closed ? 'stopped' : 'failed' })
      this.state = 'ready'
      return {
        endpoint, catalogPath, dataKey, version: OPENCODEX_VERSION, credentialSource,
        models: models.map(id => ({ id: `deepseek/${id}` })),
        routeId: createHash('sha256').update(JSON.stringify({ root: this.root, baseURL, credentialRef, models, version: OPENCODEX_VERSION, catalog: CATALOG_REVISION })).digest('hex'),
      }
    } catch (error) {
      await this.stop()
      this.state = 'failed'
      throw error
    }
  }

  async stop() {
    this.closed = true
    await Promise.all([...this.children].map(child => new Promise(resolve => {
      if (child.exitCode !== null || child.signalCode !== null || child.pid === undefined) return resolve()
      const timeout = setTimeout(() => child.kill('SIGKILL'), 5_000)
      child.once('close', () => { clearTimeout(timeout); resolve() })
      child.kill('SIGTERM')
    })))
    const lock = this.lock
    this.lock = null
    if (lock) {
      await lock.close()
      await unlink(join(this.root, 'aezy-owner.lock'))
    }
    this.state = 'stopped'
  }
}
