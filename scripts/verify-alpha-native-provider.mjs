import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  alphaMetadata,
  alphaProfileDir,
  verifyAlphaArtifacts,
} from './lib/alpha-runtime.mjs'

const expectedVersion = alphaMetadata.source.tag.replace('dsh-v', '')
const requiredPackages = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-llm',
  '@deepseek-ai/dsh-credentials-local',
  '@deepseek-ai/dsh-authorization',
  '@deepseek-ai/dsh-llm-pi-ai',
]

// Recheck the immutable release manifest before loading any installed package.
const { packages: packed } = verifyAlphaArtifacts()
for (const name of requiredPackages.filter(name => name.startsWith('@deepseek-ai/dsh-'))) {
  assert.equal(packed.get(name)?.version, expectedVersion, `${name} is not pinned to ${expectedVersion}`)
}

const profileManifestPath = join(alphaProfileDir, 'package.json')
const profileManifest = JSON.parse(await readFile(profileManifestPath, 'utf8'))
const requireFromProfile = createRequire(profileManifestPath)
for (const name of requiredPackages) {
  assert.equal(typeof profileManifest.dependencies?.[name], 'string', `${name} is missing from the alpha profile`)
}

async function load(name) {
  return import(pathToFileURL(requireFromProfile.resolve(name)).href)
}

const [
  { Context },
  { default: LlmRuntime },
  { default: LocalCredentials },
  { default: Authorization },
  LlmPiAi,
] = await Promise.all(requiredPackages.map(load))

const temporaryHome = await mkdtemp('/tmp/aezy-native-provider-')
let ctx
try {
  const credentialsPath = join(temporaryHome, '.credentials.yaml')
  await writeFile(credentialsPath, 'version: 1\nrefs: {}\nrecords: {}\n', { mode: 0o600 })

  ctx = new Context()
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(LocalCredentials, { path: credentialsPath, watch: false })

  // Match the product's load order: DSH base mounts llm-pi-ai first and the
  // Aezy overlay supplies authorization later. ctx.inject() must connect them
  // without Aezy re-registering or copying the provider's OAuth flow.
  await ctx.plugin(LlmPiAi, { providers: { 'openai-codex': {} } })
  await ctx.plugin(Authorization)

  const providers = ctx.llm.listProviders()
  assert.equal(providers.some(provider => provider.id === 'openai-codex'), true)
  const models = await ctx.llm.listModels('openai-codex')
  assert.ok(models.length > 0, 'openai-codex catalog is empty')
  assert.ok(models.some(model => model.id === 'gpt-5.6-sol'), 'pinned catalog has no gpt-5.6-sol')

  const key = LlmPiAi.recordKeyFor('openai-codex')
  const flow = ctx.authorization.describe(key)
  assert.ok(flow, 'llm-pi-ai did not register its OpenAI Codex authorization flow')
  assert.equal(flow.key, 'llm-pi-ai/openai-codex')
  assert.deepEqual(flow.methods.map(method => method.id), ['oauth'])
  assert.match(flow.methods[0].label, /ChatGPT/i)
  assert.equal(flow.inFlight, false)

  // The probe uses a new empty credential store. Catalog and flow discovery
  // must not import the existing Codex App Server login or begin OAuth.
  const credential = await ctx.credentials.describeRecord(key)
  assert.equal(credential.configured, false)
  assert.equal(credential.writable, true)

  process.stdout.write(`${JSON.stringify({
    source: {
      tag: alphaMetadata.source.tag,
      commit: alphaMetadata.source.commit,
    },
    owner: '@deepseek-ai/dsh-llm-pi-ai',
    provider: providers.find(provider => provider.id === 'openai-codex'),
    modelCount: models.length,
    models: models.map(model => model.id),
    authorization: {
      key: flow.key,
      methods: flow.methods.map(method => ({ id: method.id, label: method.label })),
      inFlight: flow.inFlight,
      credentialConfigured: credential.configured,
    },
    oauthStarted: false,
  }, null, 2)}\n`)
} finally {
  await ctx?.fiber.dispose()
  await rm(temporaryHome, { recursive: true, force: true })
}
