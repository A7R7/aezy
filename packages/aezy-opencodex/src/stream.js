import { randomUUID } from 'node:crypto'
import { GatewayError, fail, normalizeUsage, reasoningEnvelope } from './protocol.js'

// Incremental UTF-8/SSE decoder with explicit wire bounds. CRLF and chunk splits
// must not change provider semantics. Transport errors are never normal EOF.
export async function* readSse(body, signal, maxBytes = 8 * 1024 * 1024) {
  if (!body) fail('upstream_body_missing', 502)
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let buffer = '', data = [], received = 0, eventBytes = 0
  for await (const chunk of body) {
    signal.throwIfAborted()
    received += chunk.byteLength
    if (received > maxBytes) fail('upstream_stream_limit', 502)
    buffer += decoder.decode(chunk, { stream: true })
    let end
    while ((end = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, end).replace(/\r$/, '')
      buffer = buffer.slice(end + 1)
      if (!line) {
        if (data.length) yield data.join('\n')
        data = []; eventBytes = 0
      } else if (line.startsWith('data:')) {
        const value = line.slice(5).replace(/^ /, '')
        eventBytes += Buffer.byteLength(value)
        if (eventBytes > 1024 * 1024) fail('upstream_event_limit', 502)
        data.push(value)
      }
    }
    if (Buffer.byteLength(buffer) > 1024 * 1024) fail('upstream_event_limit', 502)
  }
  buffer += decoder.decode()
  if (buffer.trim() || data.length) fail('truncated_sse_frame', 502)
}

export async function streamResponse(upstream, translated, { key, signal, emit, onUsage }) {
  const id = `resp_${randomUUID().replaceAll('-', '')}`, created = Math.floor(Date.now() / 1000)
  let sequence = 0, text = '', thinking = '', textItem, usage = null, finish = null, done = false
  const calls = new Map(), output = []
  const send = (type, data) => emit({ type, sequence_number: sequence++, ...data })
  const snapshot = (status, extra = {}) => ({ id, object: 'response', created_at: created, model: translated.model, status, output: [...output], usage, ...extra })
  await send('response.created', { response: snapshot('in_progress') })
  await send('response.in_progress', { response: snapshot('in_progress') })
  try {
    for await (const data of readSse(upstream.body, signal)) {
      if (data === '[DONE]') { done = true; break }
      let chunk
      try { chunk = JSON.parse(data) } catch { fail('invalid_upstream_json', 502) }
      if (!chunk || typeof chunk !== 'object' || chunk.error) fail('upstream_stream_error', 502)
      if (chunk.usage != null) usage = normalizeUsage(chunk.usage)
      if (!Array.isArray(chunk.choices) || chunk.choices.length > 1) fail('invalid_upstream_choices', 502)
      if (!chunk.choices.length) continue
      const choice = chunk.choices[0]
      if (choice.index !== 0) fail('invalid_choice_index', 502)
      const delta = choice.delta ?? {}
      if (finish && (delta.content || delta.reasoning_content || delta.tool_calls?.length)) fail('data_after_finish', 502)
      if (delta.refusal) fail('upstream_refusal', 502)
      if (delta.reasoning_content !== undefined && delta.reasoning_content !== null) {
        if (typeof delta.reasoning_content !== 'string') fail('invalid_reasoning_delta', 502)
        thinking += delta.reasoning_content
      }
      if (delta.content !== undefined && delta.content !== null) {
        if (typeof delta.content !== 'string') fail('invalid_text_delta', 502)
        if (!textItem && delta.content) {
          textItem = { type: 'message', id: `msg_${randomUUID().replaceAll('-', '')}`, role: 'assistant', status: 'in_progress', content: [] }
          output.push(textItem)
          await send('response.output_item.added', { output_index: 0, item: { ...textItem } })
          await send('response.content_part.added', { item_id: textItem.id, output_index: 0, content_index: 0, part: { type: 'output_text', text: '', annotations: [] } })
        }
        text += delta.content
        if (delta.content) await send('response.output_text.delta', { item_id: textItem.id, output_index: 0, content_index: 0, delta: delta.content })
      }
      if (delta.tool_calls !== undefined && !Array.isArray(delta.tool_calls)) fail('invalid_tool_delta', 502)
      for (const fragment of delta.tool_calls ?? []) {
        if (!Number.isInteger(fragment.index) || fragment.index < 0 || fragment.index >= 64) fail('invalid_tool_index', 502)
        let call = calls.get(fragment.index)
        if (!call) { call = { id: '', name: '', arguments: '' }; calls.set(fragment.index, call) }
        if (fragment.type && fragment.type !== 'function') fail('unsupported_upstream_tool', 502)
        if (fragment.id) {
          if (call.id && call.id !== fragment.id) fail('conflicting_call_id', 502)
          call.id = fragment.id
        }
        for (const field of ['name', 'arguments']) {
          const value = fragment.function?.[field]
          if (value != null) {
            if (typeof value !== 'string') fail('invalid_tool_delta', 502)
            // DeepSeek may repeat the complete function name on argument frames.
            if (field !== 'name' || value !== call.name) call[field] += value
          }
        }
        if (Buffer.byteLength(call.arguments) > 512 * 1024 || call.name.length > 128) fail('tool_argument_limit', 502)
      }
      if (Buffer.byteLength(text) + Buffer.byteLength(thinking) > 2 * 1024 * 1024) fail('output_limit', 502)
      if (choice.finish_reason != null) {
        if (finish && finish !== choice.finish_reason) fail('conflicting_finish', 502)
        finish = choice.finish_reason
      }
    }
    signal.throwIfAborted()
    if (!done || !finish) fail('upstream_stream_truncated', 502)
    if (!['stop', 'tool_calls', 'length'].includes(finish)) fail('unsupported_finish_reason', 502)
    if ((calls.size && finish === 'stop') || (!calls.size && finish === 'tool_calls')) fail('inconsistent_tool_finish', 502)
    if (finish !== 'length' && translated.requireTool && !calls.size) fail('required_tool_missing', 502)
    if (translated.parallelTools === false && calls.size > 1) fail('parallel_tools_forbidden', 502)
    // Validate the WHOLE batch before emitting any executable tool item.
    const validated = [], ids = new Set()
    if (finish !== 'length') for (const [index, call] of [...calls].sort(([a], [b]) => a - b)) {
      if (index !== validated.length || !/^[A-Za-z0-9_.:-]{1,160}$/.test(call.id) || ids.has(call.id)) fail('invalid_or_duplicate_call_id', 502)
      ids.add(call.id)
      const route = translated.routes.get(call.name)
      if (!route) fail('undeclared_tool_call', 502)
      let args
      try { args = JSON.parse(call.arguments) } catch { fail('invalid_tool_arguments', 502) }
      if (!args || typeof args !== 'object' || Array.isArray(args)) fail('invalid_tool_arguments', 502)
      if (route.custom && (typeof args.input !== 'string' || Object.keys(args).length !== 1)) fail('invalid_custom_arguments', 502)
      validated.push({ type: route.custom ? 'custom_tool_call' : 'function_call', id: `fc_${randomUUID().replaceAll('-', '')}`,
        call_id: call.id, name: route.name, ...(route.namespace ? { namespace: route.namespace } : {}),
        ...(route.custom ? { input: args.input } : { arguments: call.arguments }), status: 'completed' })
    }
    if (textItem) {
      textItem.status = finish === 'length' ? 'incomplete' : 'completed'
      textItem.content = [{ type: 'output_text', text, annotations: [] }]
      await send('response.output_text.done', { item_id: textItem.id, output_index: 0, content_index: 0, text })
      await send('response.content_part.done', { item_id: textItem.id, output_index: 0, content_index: 0, part: textItem.content[0] })
      await send('response.output_item.done', { output_index: 0, item: textItem })
    }
    const completeItem = async item => {
      const index = output.length; output.push(item)
      await send('response.output_item.added', { output_index: index, item: { ...item, status: 'in_progress' } })
      if (item.type === 'function_call') await send('response.function_call_arguments.done', { output_index: index, item_id: item.id, name: item.name, arguments: item.arguments })
      if (item.type === 'custom_tool_call') await send('response.custom_tool_call_input.done', { output_index: index, item_id: item.id, input: item.input })
      await send('response.output_item.done', { output_index: index, item })
    }
    if (thinking && finish !== 'length') await completeItem({
      type: 'reasoning', id: `rs_${randomUUID().replaceAll('-', '')}`, summary: [],
      encrypted_content: reasoningEnvelope(key, translated.scope, translated.model, { text: thinking, calls: validated.map(call => call.call_id) }),
    })
    for (const item of validated) await completeItem(item)
    if (finish === 'stop' && !text.trim()) fail('empty_upstream_response', 502)
    const status = finish === 'length' ? 'incomplete' : 'completed'
    onUsage?.(usage)
    await send(`response.${status}`, { response: snapshot(status, status === 'incomplete' ? { incomplete_details: { reason: 'max_output_tokens' } } : {}) })
    return { status, usage }
  } catch (error) {
    const code = error instanceof GatewayError ? error.code : 'upstream_transport_error'
    if (!signal.aborted) await send('response.failed', { response: snapshot('failed', { error: { code, message: `Aezy gateway: ${code}; no automatic retry was performed.` } }) })
    throw error
  }
}
