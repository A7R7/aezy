import { createHash, randomBytes } from 'node:crypto'
import { constants } from 'node:fs'
import { open, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { privateDirectory } from '@aezy/codex/runtime-instance'
import { createCatalog, CATALOG_REVISION } from './catalog.js'
import { startGateway } from './gateway.js'

export const GATEWAY_VERSION = 'aezy-responses-v1'

async function replayKey(root) {
  const path = join(root, 'replay-key')
  let handle
  try {
    handle = await open(path, 'wx', 0o600)
    await handle.writeFile(randomBytes(32))
    await handle.sync()
  } catch (error) { if (error.code !== 'EEXIST') throw error }
  finally { await handle?.close() }
  handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o077) || stat.size !== 32) throw new Error('Invalid private gateway replay key')
    return await handle.readFile()
  } finally { await handle.close() }
}

// Existing external plugin package, now an Aezy implementation. No OpenCodex
// code/runtime is loaded, and this server neither executes tools nor owns a loop.
export class OpenCodexManager {
  constructor({ dshHome, gatewayOptions = {} }) {
    this.root = join(dshHome, 'aezy', 'model-gateway')
    this.gatewayOptions = gatewayOptions
    this.state = 'not-started'
    this.closed = false
    this.lock = null
    this.server = null
  }
  async start({ baseURL, models, apiKey, credentialRef, credentialSource }) {
    if (this.closed || this.state !== 'not-started') throw new Error('Aezy gateway can only start once')
    this.state = 'starting'
    try {
      if (!apiKey) throw new Error('DSH DeepSeek credential is unavailable; no personal fallback is permitted')
      await privateDirectory(this.root)
      this.lock = await open(join(this.root, 'aezy-owner.lock'), 'wx', 0o600)
      await this.lock.writeFile(JSON.stringify({ pid: process.pid }))
      const catalog = createCatalog(models), key = await replayKey(this.root)
      const catalogPath = join(this.root, 'codex-catalog.json')
      await writeFileAtomic(catalogPath, `${JSON.stringify(catalog)}\n`, { mode: 0o600 })
      const dataKey = randomBytes(32).toString('hex')
      this.server = await startGateway({ ...this.gatewayOptions, baseURL, models: catalog.models.map(row => row.slug), apiKey, dataKey, replayKey: key })
      if (this.closed) throw new Error('Aezy gateway stopped during startup')
      this.state = 'ready'
      return {
        endpoint: this.server.endpoint, catalogPath, dataKey, version: GATEWAY_VERSION, credentialSource,
        models: catalog.models.map(row => ({ id: row.slug })),
        routeId: createHash('sha256').update(JSON.stringify({ root: this.root, baseURL, credentialRef, models, version: GATEWAY_VERSION, catalog: CATALOG_REVISION })).digest('hex'),
        diagnostics: () => this.server.status(),
        cancelThread: threadId => this.server.cancelThread(threadId),
        cancelAll: () => this.server.cancelAll(),
      }
    } catch (error) { await this.stop(); this.state = 'failed'; throw error }
  }
  async stop() {
    this.closed = true
    await this.server?.stop()
    const lock = this.lock; this.lock = null
    if (lock) { await lock.close(); await unlink(join(this.root, 'aezy-owner.lock')) }
    this.state = 'stopped'
  }
}
