import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { MODEL_IDS } from './catalog.js'

export class GatewayError extends Error {
  constructor(code, status = 400) { super(`Aezy gateway: ${code}`); this.code = code; this.status = status }
}
export const fail = (code, status) => { throw new GatewayError(code, status) }
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const validName = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value)
const validCall = value => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,160}$/.test(value)

// A transport envelope, not a history cache. Only Codex persists the item.
// Authenticated encryption binds replay to the exact Thread and model, including
// across Host restarts. No reasoning is logged or projected into the Aezy UI.
export function reasoningEnvelope(key, scope, model, value) {
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, nonce)
  cipher.setAAD(Buffer.from(JSON.stringify([scope, model])))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()])
  return `aezy1:${Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64url')}`
}
export function openReasoning(key, scope, model, envelope) {
  if (typeof envelope !== 'string' || !/^aezy1:[A-Za-z0-9_-]+$/.test(envelope)) fail('foreign_reasoning_envelope')
  try {
    const bytes = Buffer.from(envelope.slice(6), 'base64url')
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12))
    decipher.setAAD(Buffer.from(JSON.stringify([scope, model])))
    decipher.setAuthTag(bytes.subarray(12, 28))
    const value = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'))
    if (!object(value) || typeof value.text !== 'string' || !Array.isArray(value.calls)
      || !value.calls.every(validCall)) fail('invalid_reasoning_envelope')
    return value
  } catch { fail('invalid_reasoning_envelope') }
}

function textContent(value) {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) fail('unsupported_content')
  return value.map(part => {
    if (!object(part) || !['input_text', 'output_text', 'text'].includes(part.type) || typeof part.text !== 'string') fail('text_only_content_required')
    return part.text
  }).join('\n')
}

function toolCatalog(input = []) {
  if (!Array.isArray(input) || input.length > 256) fail('invalid_tool_catalog')
  const routes = new Map(), keys = new Map(), tools = []
  function add(tool, namespace) {
    if (!object(tool) || !validName(tool.name)) fail('invalid_tool_name')
    if (!['function', 'custom'].includes(tool.type)) fail('unsupported_tool_type')
    const key = JSON.stringify([namespace ?? null, tool.name])
    if (keys.has(key)) fail('duplicate_tool_name')
    const name = namespace ? `${namespace}__${tool.name}` : tool.name
    const wire = name.length <= 64 ? name : `aezy_${createHash('sha256').update(key).digest('hex').slice(0, 48)}`
    if (routes.has(wire)) fail('ambiguous_tool_wire_name')
    const parameters = tool.type === 'custom'
      ? { type: 'object', properties: { input: { type: 'string' } }, required: ['input'], additionalProperties: false }
      : tool.parameters
    if (!object(parameters) || parameters.type !== 'object') fail('invalid_tool_schema')
    routes.set(wire, { name: tool.name, namespace, custom: tool.type === 'custom' })
    keys.set(key, wire)
    tools.push({ type: 'function', function: {
      name: wire, description: `${namespace ? `${namespace}.` : ''}${tool.name}: ${tool.description ?? ''}`,
      parameters,
    } })
  }
  for (const tool of input) {
    if (tool?.type === 'namespace') {
      if (!validName(tool.name) || !Array.isArray(tool.tools)) fail('invalid_tool_namespace')
      for (const child of tool.tools) add(child, tool.name)
    } else add(tool)
    if (tools.length > 256) fail('too_many_tools')
  }
  return { routes, keys, tools }
}

export function translateRequest(body, { models, key, scope }) {
  if (!object(body)) fail('object_request_required')
  if (!models.includes(body.model) || !MODEL_IDS.includes(body.model.replace(/^deepseek\//, ''))) fail('unsupported_model')
  if (body.stream !== true) fail('stream_required')
  // This route uses Codex-owned full input replay. No gateway response/history DB.
  if (body.previous_response_id != null || body.conversation != null || body.background === true
    || body.store === true) fail('server_side_history_unsupported')
  if (body.text?.format && body.text.format.type !== 'text') fail('structured_output_unsupported')
  if (body.reasoning?.summary && body.reasoning.summary !== 'none') fail('reasoning_summary_unsupported')
  const effort = body.reasoning?.effort ?? 'high'
  if (!['low', 'high', 'max'].includes(effort)) fail('unsupported_reasoning_effort')
  const { routes, keys, tools } = toolCatalog(body.tools)
  const messages = []
  if (body.instructions) messages.push({ role: 'system', content: textContent(body.instructions) })
  const input = typeof body.input === 'string' ? [{ role: 'user', content: body.input }] : body.input
  if (!Array.isArray(input) || !input.length) fail('input_required')
  const calls = new Map(), results = new Set(), reasoning = []
  let assistant = null
  for (const item of input) {
    if (!object(item)) fail('invalid_input_item')
    if (item.type === 'reasoning') {
      // Unknown/plain summary items are not a substitute for raw provider replay.
      reasoning.push(openReasoning(key, scope, body.model, item.encrypted_content))
      continue
    }
    if (item.type === 'function_call' || item.type === 'custom_tool_call') {
      if (!validCall(item.call_id) || calls.has(item.call_id)) fail('invalid_or_duplicate_call_id')
      let wire = keys.get(JSON.stringify([item.namespace ?? null, item.name]))
      if (!wire) {
        // Historical tool declarations can disappear after a completed turn.
        // Preserve only their identity for replay; never declare them callable.
        if (!validName(item.name) || (item.namespace != null && !validName(item.namespace))) fail('invalid_historical_tool')
        wire = `aezy_history_${calls.size}`
      }
      let args
      if (item.type === 'custom_tool_call') {
        if (typeof item.input !== 'string') fail('invalid_custom_input')
        args = JSON.stringify({ input: item.input })
      } else {
        if (typeof item.arguments !== 'string') fail('invalid_historical_arguments')
        try { if (!object(JSON.parse(item.arguments))) fail('invalid_historical_arguments') } catch { fail('invalid_historical_arguments') }
        args = item.arguments
      }
      if (!assistant) { assistant = { role: 'assistant', content: null, tool_calls: [] }; messages.push(assistant) }
      assistant.tool_calls ??= []
      assistant.tool_calls.push({ id: item.call_id, type: 'function', function: { name: wire, arguments: args } })
      calls.set(item.call_id, assistant)
    } else if (item.type === 'function_call_output' || item.type === 'custom_tool_call_output') {
      if (!calls.has(item.call_id) || results.has(item.call_id)) fail('orphan_or_duplicate_tool_result')
      messages.push({ role: 'tool', tool_call_id: item.call_id, content: textContent(item.output) })
      results.add(item.call_id)
      assistant = null
    } else if (item.type === 'message' || (!item.type && item.role)) {
      if (!['user', 'assistant', 'system', 'developer'].includes(item.role)) fail('unsupported_message_role')
      const role = item.role === 'developer' ? 'system' : item.role
      const message = { role, content: textContent(item.content) }
      messages.push(message)
      assistant = role === 'assistant' ? message : null
    } else fail('unsupported_input_item')
  }
  if ([...calls.keys()].some(id => !results.has(id))) fail('tool_result_missing')
  for (const value of reasoning) {
    for (const id of value.calls) {
      const owner = calls.get(id)
      if (!owner) fail('reasoning_call_missing')
      if (owner.reasoning_content !== undefined && owner.reasoning_content !== value.text) fail('conflicting_reasoning')
      owner.reasoning_content = value.text
    }
  }
  // Non-thinking historical assistant messages need no fabricated reasoning.
  let toolChoice = body.tool_choice ?? 'auto'
  if (!['auto', 'none', 'required'].includes(toolChoice)) {
    if (!object(toolChoice) || !['function', 'custom'].includes(toolChoice.type)) fail('unsupported_tool_choice')
    const wire = keys.get(JSON.stringify([toolChoice.namespace ?? null, toolChoice.name]))
    if (!wire) fail('undeclared_tool_choice')
    toolChoice = { type: 'function', function: { name: wire } }
  }
  if (body.max_output_tokens !== undefined && (!Number.isSafeInteger(body.max_output_tokens) || body.max_output_tokens < 1 || body.max_output_tokens > 32768)) fail('invalid_output_limit')
  return {
    routes, model: body.model, scope,
    request: {
      model: body.model.slice('deepseek/'.length), messages, stream: true, stream_options: { include_usage: true },
      thinking: { type: 'enabled' }, reasoning_effort: effort,
      max_tokens: body.max_output_tokens ?? 8192,
      ...(tools.length ? { tools, tool_choice: toolChoice, parallel_tool_calls: body.parallel_tool_calls !== false } : {}),
    },
  }
}

export function normalizeUsage(value) {
  if (!object(value) || !Number.isSafeInteger(value.prompt_tokens) || value.prompt_tokens < 0
    || !Number.isSafeInteger(value.completion_tokens) || value.completion_tokens < 0) return null
  const cached = value.prompt_cache_hit_tokens ?? value.prompt_tokens_details?.cached_tokens
  const reasoning = value.completion_tokens_details?.reasoning_tokens
  return {
    input_tokens: value.prompt_tokens, output_tokens: value.completion_tokens,
    total_tokens: value.prompt_tokens + value.completion_tokens,
    ...(Number.isSafeInteger(cached) && cached >= 0 && cached <= value.prompt_tokens ? { input_tokens_details: { cached_tokens: cached } } : {}),
    ...(Number.isSafeInteger(reasoning) && reasoning >= 0 && reasoning <= value.completion_tokens ? { output_tokens_details: { reasoning_tokens: reasoning } } : {}),
  }
}
