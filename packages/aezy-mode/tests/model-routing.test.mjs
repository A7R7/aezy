import assert from 'node:assert/strict'
import test from 'node:test'
import { compatibleSelection, engineForPreset, modelIdentity, resolveModelDirectory } from '../src/model-routing.js'

const flash = 'deepseek-v4-flash'
const model = (id, name = id, efforts = ['low', 'high']) => ({ id, name,
  reasoning: { efforts: efforts.map(id => ({ id, name: id })), defaultEffort: efforts[0] } })
const catalog = { groups: [
  { id: 'deepseek-official', name: 'DeepSeek', models: [model(flash, 'DeepSeek V4 Flash')] },
  { id: 'openai-codex', name: 'OpenAI', models: [model('gpt-6-astra', 'Astra'), model('gpt-native-only')] },
  { id: 'aezy-codex', name: 'Codex', models: [model(`deepseek/${flash}`, 'Gateway Flash'), model('gpt-6-astra', 'GPT-6-Astra', ['low', 'high', 'ultra'])] },
] }
const rows = preset => resolveModelDirectory(catalog, preset, null).flatMap(group => group.models)

test('only known owned aliases coalesce; foreign names and unsupported aliases stay distinct', () => {
  assert.equal(modelIdentity('deepseek-official', flash), modelIdentity('aezy-codex', `deepseek/${flash}`))
  assert.equal(modelIdentity('openai-codex', 'gpt-6-astra'), modelIdentity('aezy-codex', 'gpt-6-astra'))
  assert.notEqual(modelIdentity('third-party', 'gpt-6-astra'), modelIdentity('openai-codex', 'gpt-6-astra'))
  assert.notEqual(modelIdentity('openai', 'gpt-6-astra'), modelIdentity('openai-codex', 'gpt-6-astra'))
  assert.notEqual(modelIdentity('deepseek-official', 'deepseek-chat'), modelIdentity('aezy-codex', 'deepseek/deepseek-chat'))
})

test('all presets display the same identity union, including unavailable combinations', () => {
  assert.deepEqual(rows('standard').map(row => row.id), rows('codex-app-server').map(row => row.id))
  assert.equal(rows('codex-app-server').find(row => row.id === 'openai/gpt-native-only').route, null)
  assert.match(rows('codex-app-server').find(row => row.id === 'openai/gpt-native-only').unavailableReason, /No Codex/)
  assert.equal(rows('codex-app-server').find(row => row.id === `deepseek/${flash}`).name, 'DeepSeek V4 Flash')
})

test('reasoning remains route-owned, preserving supported effort and resetting unsupported effort', () => {
  const native = rows('standard').find(row => row.id === 'openai/gpt-6-astra')
  const codex = rows('codex-app-server').find(row => row.id === 'openai/gpt-6-astra')
  assert.equal(compatibleSelection(native, { reasoningEffort: 'high' }).reasoningEffort, 'high')
  assert.equal(compatibleSelection(native, { reasoningEffort: 'ultra' }).reasoningEffort, 'low')
  assert.equal(compatibleSelection(codex, { reasoningEffort: 'ultra' }).reasoningEffort, 'ultra')
  assert.equal(compatibleSelection(codex).provider, 'aezy-codex')
})

test('a stale selected model is retained as unavailable, never substituted', () => {
  const groups = resolveModelDirectory({ groups: [] }, 'standard', { provider: 'openai-codex', model: 'gpt-6-astra' })
  assert.equal(groups[0].models[0].id, 'openai/gpt-6-astra')
  assert.throws(() => compatibleSelection(groups[0].models[0]), /No DSH channel/)
})

test('retired presets have no execution channel and cannot be silently migrated', () => {
  const selected = { provider: 'aezy-codex', model: 'gpt-6-astra' }
  assert.equal(engineForPreset('aezy', selected), 'retired')
  const groups = resolveModelDirectory(catalog, 'aezy', selected)
  assert.ok(groups.flatMap(group => group.models).every(row => row.route === null))
  assert.equal(engineForPreset('aezy', { provider: 'deepseek-official', model: flash }), 'retired')
  assert.equal(engineForPreset(`codex-inspired-r1-${'a'.repeat(64)}`), 'retired')
})
