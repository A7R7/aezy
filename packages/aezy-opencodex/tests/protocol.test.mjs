import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import { translateRequest, reasoningEnvelope, openReasoning, normalizeUsage } from '../src/protocol.js'
import { readSse, streamResponse } from '../src/stream.js'

const key = randomBytes(32), model = 'deepseek/deepseek-v4-flash'
const options = { key, scope: 'thread-1', models: [model] }
const schema = { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] }
const request = () => ({ model, stream: true, input: 'hello', tools: [
  { type: 'namespace', name: 'dsh', tools: [{ type: 'function', name: 'write', parameters: schema }] },
  { type: 'custom', name: 'apply_patch', format: { type: 'text' } },
] })
export function sseResponse(chunks, done = true) {
  const data = chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join('') + (done ? 'data: [DONE]\n\n' : '')
  return new Response(data, { headers: { 'content-type': 'text/event-stream' } })
}
export const delta = (value, finish = null) => ({ choices: [{ index: 0, delta: value, finish_reason: finish }] })
const call = (index, id, name, args) => ({ index, id, type: 'function', function: { name, arguments: args } })
async function bridge(chunks, { done = true } = {}) {
  const events = [], translated = translateRequest(request(), options)
  let error
  try { await streamResponse(sseResponse(chunks, done), translated, { key, signal: new AbortController().signal, emit: event => { events.push(structuredClone(event)) } }) } catch (value) { error = value }
  return { events, error }
}

test('request translator preserves instructions, tool namespaces, choice and tool output replay', () => {
  const body = request()
  body.instructions = 'governed tools only'
  body.input = [
    { role: 'user', content: [{ type: 'input_text', text: 'hello' }] },
    { type: 'reasoning', encrypted_content: reasoningEnvelope(key, options.scope, model, { text: 'private test reasoning', calls: ['call1'] }) },
    { type: 'function_call', namespace: 'dsh', name: 'write', call_id: 'call1', arguments: '{"text":"x"}' },
    { type: 'function_call_output', call_id: 'call1', output: [{ type: 'input_text', text: 'denied' }] },
  ]
  const translated = translateRequest(body, options)
  assert.equal(translated.request.messages[0].content, body.instructions)
  assert.equal(translated.request.messages[2].tool_calls[0].function.name, 'dsh__write')
  assert.equal(translated.request.messages[2].reasoning_content, 'private test reasoning')
  assert.equal(translated.request.messages[3].content, 'denied')
  assert.equal(translated.routes.get('dsh__write').namespace, 'dsh')
})

test('unsupported capabilities, unscoped state and malformed history fail before provider IO', () => {
  for (const patch of [
    { model: 'openai/foreign' }, { previous_response_id: 'foreign' }, { stream: false },
    { input: [{ role: 'user', content: [{ type: 'input_image', image_url: 'https://example.com' }] }] },
    { input: [{ type: 'compaction', encrypted_content: 'foreign' }] },
    { tools: [{ type: 'web_search' }] }, { reasoning: { effort: 'ultra' } },
    { input: [{ type: 'function_call_output', call_id: 'missing', output: 'fake' }] },
  ]) assert.throws(() => translateRequest({ ...request(), ...patch }, options), /Aezy gateway/)
})

test('reasoning replay is encrypted and bound to Thread, model and key, not cached globally', () => {
  const value = { text: 'private reasoning', calls: ['call1'] }
  const sealed = reasoningEnvelope(key, 'thread1', model, value)
  assert.ok(!sealed.includes(value.text))
  assert.deepEqual(openReasoning(key, 'thread1', model, sealed), value)
  assert.throws(() => openReasoning(key, 'thread2', model, sealed), /invalid_reasoning/)
  assert.throws(() => openReasoning(key, 'thread1', 'other', sealed), /invalid_reasoning/)
  assert.throws(() => openReasoning(randomBytes(32), 'thread1', model, sealed), /invalid_reasoning/)
})

test('stream converts fragmented tools atomically and records authoritative usage', async () => {
  const { events, error } = await bridge([
    delta({ reasoning_content: 'private', tool_calls: [call(0, 'call1', 'dsh__', '{"text":')] }),
    delta({ tool_calls: [{ index: 0, function: { name: 'write', arguments: '"hello"' } }] }),
    delta({ tool_calls: [{ index: 0, function: { name: 'dsh__write', arguments: '}' } }] }, 'tool_calls'),
    { choices: [], usage: { prompt_tokens: 40, completion_tokens: 10, prompt_cache_hit_tokens: 12 } },
  ])
  assert.equal(error, undefined)
  const items = events.filter(e => e.type === 'response.output_item.done').map(e => e.item)
  assert.equal(items[0].type, 'reasoning')
  assert.deepEqual(items[0].summary, [])
  assert.equal(items[1].name, 'write'); assert.equal(items[1].namespace, 'dsh')
  assert.equal(items[1].arguments, '{"text":"hello"}')
  assert.deepEqual(events.at(-1).response.usage, { input_tokens: 40, output_tokens: 10, total_tokens: 50, input_tokens_details: { cached_tokens: 12 } })
  assert.deepEqual(events.map(e => e.sequence_number), events.map((_, i) => i))
})

test('truncation, invalid args, undeclared tools, duplicate IDs and late failure never expose executable items', async () => {
  const scenarios = [
    { chunks: [delta({ tool_calls: [call(0, 'call1', 'dsh__write', '{}')] }, 'tool_calls')], done: false },
    { chunks: [delta({ tool_calls: [call(0, 'call1', 'dsh__write', '{')] }, 'tool_calls')] },
    { chunks: [delta({ tool_calls: [call(0, 'call1', 'foreign', '{}')] }, 'tool_calls')] },
    { chunks: [delta({ tool_calls: [call(0, 'same', 'dsh__write', '{}'), call(1, 'same', 'dsh__write', '{}')] }, 'tool_calls')] },
    { chunks: [delta({ tool_calls: [call(0, 'call1', 'dsh__write', '{}')] }), { error: { message: 'secret provider error' } }] },
  ]
  for (const scenario of scenarios) {
    const { events, error } = await bridge(scenario.chunks, scenario)
    assert.ok(error)
    assert.equal(events.at(-1).type, 'response.failed')
    assert.equal(events.some(e => e.item?.type === 'function_call'), false)
    assert.ok(!JSON.stringify(events).includes('secret provider error'))
  }
})

test('length termination is incomplete, with no executable partial tools and unknown usage stays null', async () => {
  const { events, error } = await bridge([delta({ tool_calls: [call(0, 'call1', 'dsh__write', '{')] }, 'length')])
  assert.equal(error, undefined)
  assert.equal(events.at(-1).type, 'response.incomplete')
  assert.equal(events.at(-1).response.usage, null)
  assert.equal(events.some(e => e.item?.type === 'function_call'), false)
  assert.equal(normalizeUsage({}), null)
})

test('parallel function/custom tools retain distinct IDs, namespaces and exact freeform input', async () => {
  const { events, error } = await bridge([
    delta({ tool_calls: [call(1, 'patch2', 'apply_patch', '{"input":"patch\\ntext"}'), call(0, 'write1', 'dsh__write', '{"text":"ok"}')] }, 'tool_calls'),
  ])
  assert.equal(error, undefined)
  const calls = events.filter(e => e.type === 'response.output_item.done').map(e => e.item)
  assert.deepEqual(calls.map(c => c.call_id), ['write1', 'patch2'])
  assert.equal(calls[0].namespace, 'dsh')
  assert.equal(calls[1].type, 'custom_tool_call')
  assert.equal(calls[1].input, 'patch\ntext')
})

test('tool-choice none/specific and parallel=false constrain the executable response, not just the upstream hint', async () => {
  for (const [patch, chunks] of [
    [{ tool_choice: 'none' }, [delta({ tool_calls: [call(0, 'c1', 'dsh__write', '{}')] }, 'tool_calls')]],
    [{ tool_choice: { type: 'custom', name: 'apply_patch' } }, [delta({ tool_calls: [call(0, 'c1', 'dsh__write', '{}')] }, 'tool_calls')]],
    [{ tool_choice: 'required' }, [delta({ content: 'no tool' }, 'stop')]],
    [{ parallel_tool_calls: false }, [delta({ tool_calls: [call(0, 'c1', 'dsh__write', '{}'), call(1, 'c2', 'dsh__write', '{}')] }, 'tool_calls')]],
  ]) {
    const events = []
    await assert.rejects(streamResponse(sseResponse(chunks), translateRequest({ ...request(), ...patch }, options), {
      key, signal: new AbortController().signal, emit: event => events.push(event),
    }), /Aezy gateway/)
    assert.equal(events.some(e => e.item?.type === 'function_call'), false)
  }
})

test('SSE decoder preserves split UTF-8, CRLF and multiline data, rejects partial frames', async () => {
  const bytes = Buffer.from('data: 中文\r\ndata: second\r\n\r\n')
  const body = new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close() } })
  const result = []
  for await (const data of readSse(body, new AbortController().signal)) result.push(data)
  assert.deepEqual(result, ['中文\nsecond'])
  await assert.rejects(async () => { for await (const _ of readSse(new Response('data: partial').body, new AbortController().signal)) {} }, /truncated_sse/)
})
