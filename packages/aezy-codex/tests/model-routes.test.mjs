import assert from 'node:assert/strict'
import test from 'node:test'
import { CodexModelRoutes } from '../src/model-routes.js'
import { readCodexModels, codexModelInfo } from '../src/model-catalog.js'

function fixture(id, error) {
  return { calls: [], ready: Promise.resolve(),
    client: { request: async () => ({ requiresOpenaiAuth: true, account: { type: 'chatgpt' } }) },
    assertAllowedPreset() {},
    async listModels() { if (error) throw error; return [{ id }] },
    async resolveModel(provider, model) { this.calls.push(model); return { provider, id: model } },
    async *stream(options) { this.calls.push(options.model); yield { type: 'text-delta', text: id } },
    dispose() { this.disposed = true },
  }
}

test('both catalogs are offered; GPT never resolves or streams through the DeepSeek gateway', async () => {
  const gateway = fixture('deepseek/flash'), openai = fixture('gpt-test')
  const routes = new CodexModelRoutes({ gateway, openai })
  assert.deepEqual((await routes.listModels()).map(row => row.id), ['deepseek/flash', 'gpt-test'])
  await routes.resolveModel('aezy-codex', 'gpt-test')
  for await (const _ of routes.stream({ model: 'gpt-test' })) {}
  assert.deepEqual(gateway.calls, [])
  assert.deepEqual(openai.calls, ['gpt-test', 'gpt-test'])
  assert.throws(() => routes.route('unknown'), /no Aezy-owned/)
  routes.dispose()
  assert.equal(gateway.disposed && openai.disposed, true)
})

test('one broken channel does not hide the other and cannot trigger fallback', async () => {
  const gateway = fixture('deepseek/flash', new Error('no credential')), openai = fixture('gpt-test')
  const routes = new CodexModelRoutes({ gateway, openai })
  assert.deepEqual((await routes.listModels()).map(row => row.id), ['gpt-test'])
  openai.listModels = async () => { throw new Error('offline') }
  await assert.rejects(routes.listModels(), /Both Aezy/)
  openai.client.request = async () => ({ requiresOpenaiAuth: true, account: null })
  await assert.rejects(async () => { for await (const _ of routes.stream({ model: 'gpt-test' })) {} }, /Settings → Codex/)
  assert.deepEqual(gateway.calls, [])
  assert.deepEqual(openai.calls, [])
})

test('public catalog reads every page, hides hidden models, and refuses cursor cycles', async () => {
  const client = { request: async (_method, { cursor }) => cursor === null
    ? { data: [{ id: 'gpt-test' }], nextCursor: 'page2' }
    : { data: [{ id: 'gpt-6-astra' }, { id: 'hidden', hidden: true }] } }
  assert.deepEqual((await readCodexModels(client)).map(row => row.id), ['gpt-test', 'gpt-6-astra'])
  client.request = async () => ({ data: [], nextCursor: 'loop' })
  await assert.rejects(readCodexModels(client), /pagination/)
})

test('App Server reasoning metadata reaches both catalog and selection surfaces', () => {
  const model = codexModelInfo('aezy-codex', { id: 'gpt-test', defaultReasoningEffort: 'medium',
    supportedReasoningEfforts: [{ reasoningEffort: 'low' }, { reasoningEffort: 'medium' }] })
  assert.deepEqual(model.reasoning, { efforts: [{ id: 'low', name: 'low' }, { id: 'medium', name: 'medium' }], defaultEffort: 'medium' })
})
