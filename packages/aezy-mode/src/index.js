export const name = '@aezy/mode'
export const CODEX_APP_SERVER_PRESET = 'codex-app-server'
export const CODEX_PROVIDER = 'aezy-codex'
export const inject = ['agents']

/**
 * Preset-scoped execution fence. This instance is mounted inside the
 * codex-app-server Agent composition; the root instance only ships its client.
 */
export function apply(ctx, config = {}) {
  if (config.surfaceOnly === true) {
    // Session model selection is installed around the standing preset scope.
    // agent/request inside that preset sees the seed, not the final route.
    // Check the immutable final request at the public LLM dispatch boundary.
    ctx.on('llm/stream', (request, next) => {
      const agent = ctx.agents.currentInitiator()
      if (agent?.session?.header?.agentPreset === CODEX_APP_SERVER_PRESET
        && request.provider !== CODEX_PROVIDER) {
        throw new Error(`codex-app-server mode requires provider ${CODEX_PROVIDER}; received ${String(request.provider)}`)
      }
      return next()
    })
    return
  }
  if (config.enforceCodex !== true) return
  ctx.on('agent/request', async ({ agent }, next) => {
    const request = await next()
    if (agent.session.header.agentPreset !== CODEX_APP_SERVER_PRESET) {
      throw new Error('codex-app-server mode fence was mounted outside its owning preset')
    }
    return request
  })
}

// Cordis loaders may select the default function rather than the module object.
apply.inject = inject
export default apply
