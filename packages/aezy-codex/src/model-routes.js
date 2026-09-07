import { LlmAdapter } from '@deepseek-ai/dsh-llm'
import { CODEX_PROVIDER } from './dsh-adapter.js'

/** One DSH provider, two isolated connections to the same official engine.
 * Only dispatch is owned here; each existing adapter retains its official
 * Thread binding and DSH-owned tool/approval path. There is no fallback route.
 */
export class CodexModelRoutes extends LlmAdapter {
  constructor({ gateway, openai }) {
    super()
    this.gateway = gateway
    this.openai = openai
  }

  providerInfo() { return { id: CODEX_PROVIDER, name: 'Codex App Server' } }

  route(model) {
    if (model.startsWith('deepseek/')) return this.gateway
    if (model.startsWith('gpt-')) return this.openai
    throw new Error(`Model ${model} has no Aezy-owned Codex route`)
  }

  async listModels() {
    const results = await Promise.allSettled([this.gateway.listModels(), this.openai.listModels()])
    if (results.every(result => result.status === 'rejected')) {
      throw new Error('Both Aezy Codex channels are unavailable; check Settings → Codex')
    }
    return results.flatMap((result, index) => result.status === 'fulfilled'
      ? result.value.filter(model => model.id.startsWith(index === 0 ? 'deepseek/' : 'gpt-')) : [])
  }

  resolveModel(provider, model, signal) { return this.route(model).resolveModel(provider, model, signal) }

  async *stream(options) {
    const adapter = this.route(options.model)
    if (adapter === this.openai) {
      adapter.assertAllowedPreset(options)
      await adapter.ready
      const account = await adapter.client.request('account/read', { refreshToken: false })
      if (account.requiresOpenaiAuth && !account.account) {
        throw new Error('Sign in to the Aezy-owned GPT channel in Settings → Codex. Personal Codex login is not imported.')
      }
    }
    yield* adapter.stream(options)
  }

  dispose() { this.gateway.dispose(); this.openai.dispose() }
}
