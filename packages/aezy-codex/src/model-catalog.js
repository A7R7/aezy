// Public App Server discovery only. Never substitute the DeepSeek catalog for
// OpenAI, synthesize an account entitlement, or truncate a paginated catalog.
export async function readCodexModels(client) {
  const models = []
  const seen = new Set()
  let cursor = null
  do {
    if (seen.has(cursor) || seen.size >= 100) throw new Error('Invalid Codex model catalog pagination')
    seen.add(cursor)
    const page = await client.request('model/list', { cursor, limit: 100 })
    models.push(...(page.data ?? []).filter(model => !model.hidden))
    cursor = page.nextCursor ?? null
  } while (cursor !== null)
  return models
}

export function codexModelInfo(provider, raw) {
  const efforts = (raw.supportedReasoningEfforts ?? []).map(value => value.reasoningEffort ?? value.id ?? value)
  return {
    provider, id: raw.id, name: raw.displayName ?? raw.id,
    description: raw.description, inputModalities: ['text'],
    ...(efforts.length ? { reasoning: {
      efforts: efforts.map(id => ({ id, name: String(id) })),
      defaultEffort: raw.defaultReasoningEffort ?? efforts[0],
    } } : {}),
  }
}
