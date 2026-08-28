export const name = '@aezy/mode'
export const CODEX_APP_SERVER_PRESET = 'codex-app-server'
export const CODEX_PROVIDER = 'aezy-codex'

/**
 * Preset-scoped execution fence. This instance is mounted inside the
 * codex-app-server Agent composition; the root instance only ships its client.
 */
export function apply(ctx, config = {}) {
  if (config.surfaceOnly === true) return
  if (config.enforceCodex !== true) return
  ctx.on('agent/request', async ({ agent }, next) => {
    const request = await next()
    if (request.provider !== CODEX_PROVIDER) {
      throw new Error(
        `codex-app-server mode requires provider ${CODEX_PROVIDER}; received ${String(request.provider)}`,
      )
    }
    if (agent.session.header.agentPreset !== CODEX_APP_SERVER_PRESET) {
      throw new Error('codex-app-server mode fence was mounted outside its owning preset')
    }
    return request
  })
}

export default apply
