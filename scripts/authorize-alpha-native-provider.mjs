import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createInterface } from 'node:readline/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  alphaDshHome,
  alphaMetadata,
  alphaProfileDir,
  verifyAlphaArtifacts,
} from './lib/alpha-runtime.mjs'

if (process.env.AEZY_ALPHA_AUTHORIZE_NATIVE_PROVIDER !== '1') {
  throw new Error([
    'Refusing to start OAuth without explicit authorization.',
    'Set AEZY_ALPHA_AUTHORIZE_NATIVE_PROVIDER=1 only for a user-approved alpha login attempt.',
  ].join(' '))
}

const expectedVersion = alphaMetadata.source.tag.replace('dsh-v', '')
const requiredPackages = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-llm',
  '@deepseek-ai/dsh-credentials-local',
  '@deepseek-ai/dsh-authorization',
  '@deepseek-ai/dsh-llm-pi-ai',
]

const { packages: packed } = verifyAlphaArtifacts()
for (const name of requiredPackages.filter(name => name.startsWith('@deepseek-ai/dsh-'))) {
  assert.equal(packed.get(name)?.version, expectedVersion, `${name} is not pinned to ${expectedVersion}`)
}

const profileManifestPath = join(alphaProfileDir, 'package.json')
const requireFromProfile = createRequire(profileManifestPath)
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

const ctx = new Context()
const terminal = createInterface({ input: process.stdin, output: process.stdout })
const key = LlmPiAi.recordKeyFor('openai-codex')
try {
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(LocalCredentials, {
    path: join(alphaDshHome, '.credentials.yaml'),
    watch: false,
  })
  await ctx.plugin(LlmPiAi, { providers: { 'openai-codex': {} } })
  await ctx.plugin(Authorization)

  const flow = ctx.authorization.describe(key)
  assert.ok(flow, 'the pinned DSH owner did not register openai-codex authorization')
  assert.deepEqual(flow.methods.map(method => method.id), ['oauth'])

  const before = await ctx.credentials.describeRecord(key)
  process.stdout.write(`${JSON.stringify({
    type: 'authorization-start',
    owner: '@deepseek-ai/dsh-llm-pi-ai',
    key,
    method: 'oauth',
    alreadyConfigured: before.configured,
  })}\n`)

  if (before.configured) {
    process.stdout.write(`${JSON.stringify({ type: 'authorization-result', status: 'already-configured' })}\n`)
    process.exitCode = 0
  } else {
    const outcome = await ctx.authorization.begin({
      key,
      method: 'oauth',
      interaction: {
        notify(notice) {
          process.stdout.write(`${JSON.stringify({ type: 'authorization-notice', ...notice })}\n`)
        },
        async prompt(prompt) {
          if (prompt.kind === 'secret') {
            throw new Error('The OAuth-only openai-codex flow unexpectedly requested a secret')
          }
          if (prompt.signal?.aborted === true) throw prompt.signal.reason
          if (prompt.kind === 'select') {
            process.stdout.write(`${JSON.stringify({
              type: 'authorization-options',
              message: prompt.message,
              options: prompt.options,
            })}\n`)
          }
          const answer = await terminal.question(`${prompt.message}\n> `, { signal: prompt.signal })
          return answer.trim()
        },
      },
    })

    const after = await ctx.credentials.describeRecord(key)
    assert.equal(outcome.status, 'authorized')
    assert.equal(after.configured, true)
    process.stdout.write(`${JSON.stringify({
      type: 'authorization-result',
      status: outcome.status,
      credentialConfigured: after.configured,
    })}\n`)
  }
} finally {
  terminal.close()
  await ctx.fiber.dispose()
}
