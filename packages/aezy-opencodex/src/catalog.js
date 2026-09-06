// Aezy-owned capability contract for the pinned Codex 0.149.0 reader.
// This is deliberately text-only, not a copy of OpenCodex's catalog/prompts.
export const CATALOG_REVISION = 1
export const MODEL_IDS = Object.freeze(['deepseek-v4-flash', 'deepseek-v4-pro'])
export const BASE_INSTRUCTIONS = [
  'You are Aezy, a coding agent running in the official Codex App Server.',
  'Investigate the requested task, make focused changes, and verify the result with relevant tests.',
  'Respect repository instructions, preserve unrelated user changes, and explain failures honestly.',
  'Use the supplied dsh tools for workspace operations; their approval and security decisions are authoritative.',
  'Do not retry a denied action through another tool or request broader native permissions.',
].join('\n')

export function createCatalog(models) {
  if (!Array.isArray(models) || !models.length || new Set(models).size !== models.length
    || models.some(id => !MODEL_IDS.includes(id))) throw new Error('Unsupported Aezy DeepSeek model catalog')
  return { models: models.map((id, priority) => ({
    slug: `deepseek/${id}`, display_name: `DeepSeek ${id.endsWith('pro') ? 'Pro' : 'Flash'} · Aezy`,
    description: 'Text-only DeepSeek through the Aezy-owned gateway.',
    default_reasoning_level: 'high',
    supported_reasoning_levels: ['low', 'high', 'max'].map(effort => ({ effort, description: `DeepSeek ${effort}` })),
    shell_type: 'unified_exec', visibility: 'list', supported_in_api: true, priority,
    base_instructions: BASE_INSTRUCTIONS,
    supports_reasoning_summaries: true, default_reasoning_summary: 'none',
    support_verbosity: false, supports_parallel_tool_calls: true,
    apply_patch_tool_type: 'freeform', web_search_tool_type: 'text',
    input_modalities: ['text'], supports_image_detail_original: false,
    supports_search_tool: false, node_repl_disabled: true, experimental_supported_tools: [],
    // Conservative local operating limit, not a claim about the provider maximum.
    context_window: 128000, max_context_window: 128000, auto_compact_token_limit: 100000,
    effective_context_window_percent: 95, truncation_policy: { mode: 'tokens', limit: 10000 },
  })) }
}
