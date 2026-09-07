import { homedir } from 'node:os'
import { join } from 'node:path'
import { resolveAdapterOptions } from '@deepseek-ai/dsh-llm-deepseek'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import { OpenCodexManager } from './manager.js'

export const name = '@aezy/opencodex'
export const inject = ['credentials', 'settings']

export async function resolveDeepSeek(ctx) {
  const settings = ctx.settings.get('llm-deepseek')
  if (!settings) throw new Error('DSH llm-deepseek settings are unavailable')
  const connection = resolveAdapterOptions(settings, launchEnvironmentOf(ctx))
  const credential = await ctx.credentials.resolve(connection.apiKeyEnv)
  if (!credential?.value) throw new Error('DSH DeepSeek credential is unavailable; configure it in Aezy settings')
  const models = connection.models.filter(model => !model.inputModalities?.includes('image')).map(model => model.id)
  return {
    baseURL: connection.baseURL, models, apiKey: credential.value,
    credentialRef: connection.apiKeyEnv, credentialSource: `DSH credentials (${credential.source})`,
  }
}

export function apply(ctx) {
  let observer
  ctx.inject(['aezyObservability'], observing => {
    observer = observing.aezyObservability
    observer.registerSurface('codex-gateway', 'Codex gateway')
    observing.effect(() => () => { observer = undefined })
  })
  const observation = Object.fromEntries(['record', 'inbound', 'debug'].map(method => [method, (...args) => observer?.[method](...args)]))
  const manager = new OpenCodexManager({ dshHome: process.env.DSH_HOME ?? join(homedir(), '.aezy', 'dsh'), gatewayOptions: { observation } })
  const ready = resolveDeepSeek(ctx).then(connection => manager.start(connection))
  // A missing key must not take down native DSH modes. The dependent Codex
  // adapter stays unavailable and reports this error, without personal fallback.
  void ready.catch(() => {})
  ctx.effect(() => async () => { await manager.stop(); await ready.catch(() => {}) }, 'aezy-opencodex: owned gateway lifecycle')
  ctx.provide('aezyOpenCodex', { ready, status: () => ({ owner: 'aezy', state: manager.state }) })
}
