// Run with the pinned Bun binary. Consume only OpenCodex's public package API.
import { loadConfig, startServer } from '@bitkyc08/opencodex'

const config = loadConfig()
if (Object.keys(config.providers).join(',') !== 'deepseek'
  || config.defaultProvider !== 'deepseek' || config.hostname !== '127.0.0.2'
  || config.providers.deepseek.apiKey !== '${AEZY_OPENCODEX_PROVIDER_API_KEY}'
  || config.providers.deepseek.codexToolMode !== 'shell'
  || config.codexAutoStart !== false || config.codexShimAutoRestore !== false
  || config.syncResumeHistory !== false || config.websockets !== false
  || config.subagentModels?.length !== 0) {
  throw new Error('Managed OpenCodex configuration failed admission; no fallback allowed')
}
if (!process.argv.includes('--validate')) {
  const server = startServer(0)
  let closing = false
  const close = async () => {
    if (closing) return
    closing = true
    await server.stop(true)
    process.exit(0)
  }
  process.once('SIGTERM', close)
  process.once('SIGINT', close)
  process.stdout.write(`AEZY_GATEWAY_READY ${JSON.stringify({ port: server.port })}\n`)
}
