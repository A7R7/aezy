// Presentation identities, not a provider registry or a second model catalog.
// Only explicitly owned routes are aliases. Equal display names prove nothing.
import { isRetiredPreset, retiredPresetMessage } from './preset-policy.js'
export const CODEX_PROVIDER = 'aezy-codex'
export const CODEX_APP_SERVER_PRESET = 'codex-app-server'
export const engineForPreset = preset => isRetiredPreset(preset) ? 'retired'
  : preset === CODEX_APP_SERVER_PRESET ? 'codex' : 'dsh'
export const engineForProvider = provider => provider === CODEX_PROVIDER ? 'codex' : 'dsh'

export function modelIdentity(provider, model) {
  if (provider === 'openai-codex' || (provider === CODEX_PROVIDER && model.startsWith('gpt-'))) {
    return `openai/${model}`
  }
  if (provider === 'deepseek-official' && /^deepseek-v4-(flash|pro)$/.test(model)) return `deepseek/${model}`
  if (provider === CODEX_PROVIDER && /^deepseek\/deepseek-v4-(flash|pro)$/.test(model)) return model
  return `provider:${provider}/${model}`
}

export function resolveModelDirectory(catalog, preset, selected) {
  const engine = engineForPreset(preset, selected)
  const identities = new Map()
  for (const group of catalog.groups) for (const model of group.models) {
    const id = modelIdentity(group.id, model.id)
    const family = id.startsWith('openai/') ? 'OpenAI' : id.startsWith('deepseek/') ? 'DeepSeek' : group.name
    let row = identities.get(id)
    if (!row) identities.set(id, row = { id, name: model.name, family, routes: [] })
    // Prefer the native catalog's name over transport-specific gateway branding.
    if (group.id !== CODEX_PROVIDER) row.name = model.name
    row.routes.push({ provider: group.id, model: model.id, info: model, engine: engineForProvider(group.id), name: group.name })
  }
  const selectedId = selected && modelIdentity(selected.provider, selected.model)
  if (selectedId && !identities.has(selectedId)) identities.set(selectedId, {
    id: selectedId, name: selected.model, family: 'Unavailable', routes: [],
  })
  const groups = new Map()
  for (const row of identities.values()) {
    const routes = row.routes.filter(route => route.engine === engine)
    const route = routes.find(value => value.provider === selected?.provider && value.model === selected?.model)
      ?? (routes.length === 1 ? routes[0] : null)
    const reason = engine === 'retired' ? retiredPresetMessage : route ? null : routes.length > 1 ? 'Ambiguous channels in the current catalog; no automatic route selected'
      : `No ${engine === 'codex' ? 'Codex App Server' : 'DSH'} channel in the current catalog`
    const info = route?.info ?? row.routes[0]?.info
    const model = { id: row.id, name: row.name, description: info?.description,
      reasoning: route?.info.reasoning, route: route ? { provider: route.provider, model: route.model } : null,
      channel: route ? `${engine === 'codex' ? 'Codex' : 'DSH'} · ${route.provider === CODEX_PROVIDER
        ? route.model.startsWith('deepseek/') ? 'Aezy gateway / DeepSeek API' : 'Aezy GPT / ChatGPT login'
        : route.name}` : reason, unavailableReason: reason }
    if (!groups.has(row.family)) groups.set(row.family, { id: row.family, name: row.family, models: [] })
    groups.get(row.family).models.push(model)
  }
  return [...groups.values()]
}

export function compatibleSelection(model, previous) {
  if (!model.route) throw new Error(model.unavailableReason)
  const efforts = model.reasoning?.efforts ?? []
  const effort = efforts.some(value => value.id === previous?.reasoningEffort) ? previous.reasoningEffort
    : model.reasoning?.defaultEffort ?? efforts[0]?.id
  return { ...model.route, ...(effort === undefined ? {} : { reasoningEffort: effort }) }
}
