import './sync-profile.mjs'
import { createServer } from 'node:net'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dshHome, profileName, repoRoot, runDsh, spawnDsh } from './lib/profile.mjs'

function invariant(condition, message) {
  if (!condition) throw new Error(message)
}

function row(config, id) {
  const marker = `- id: ${id}\n`
  const start = config.indexOf(marker)
  invariant(start >= 0, `Missing composed row: ${id}`)
  const next = config.indexOf('\n- id: ', start + marker.length)
  return config.slice(start, next < 0 ? config.length : next)
}

function assertDisabled(config, id) {
  invariant(/\ndisabled: true(?:\n|$)|\n  disabled: true(?:\n|$)/.test(row(config, id)), `${id} must be disabled`)
}

let rpcSequence = 0
async function rpc(port, method, payload) {
  rpcSequence += 1
  const rpcId = `m0-${Date.now().toString(36)}-${rpcSequence}`
  const response = await fetch(`http://127.0.0.1:${port}/api/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
    signal: AbortSignal.timeout(10000),
  })
  invariant(response.ok, `${method} transport failed with HTTP ${response.status}`)
  const envelope = await response.json()
  invariant(envelope.rpcId === rpcId, `${method} returned a mismatched rpcId`)
  invariant(envelope.result?.ok, `${method} failed: ${JSON.stringify(envelope.result?.error)}`)
  return envelope.result.value
}

const dump = runDsh(['--profile', profileName, '--dump-default-config']).stdout
invariant(dump.includes('@aezy/base'), 'Composed config does not include @aezy/base')
invariant(dump.includes('@aezy/web'), 'Composed config does not include @aezy/web')
invariant(dump.includes('@aezy/brand'), 'Composed config does not include @aezy/brand')
invariant(dump.indexOf('@aezy/base') < dump.indexOf('@aezy/web'), 'Aezy bundle order is invalid')

for (const id of [
  'session-telemetry-otel',
  'command-feedback',
  'code-runtime',
  'message-feedback',
  'ui-message-feedback',
  'cordis-host-runner',
  'cordis-client-runner',
  'ui-cordis',
  'ui-workflow-run',
  'plugin-inventory',
  'ui-settings-plugin-inventory',
  'ui-settings-plugins',
  'ui-agent-preset',
  'ui-brand-official',
]) assertDisabled(dump, id)

const brandRow = row(dump, 'aezy-brand')
invariant(brandRow.includes("name: '@aezy/brand'"), 'Aezy brand occupant is not composed')

const presetRow = row(dump, 'agent-presets')
invariant(/\n    default: aezy(?:\n|$)/.test(presetRow), 'Aezy must be the default Agent preset')
invariant(/\n    includeUserRoot: true(?:\n|$)/.test(presetRow), 'Aezy preset root must be enabled')

const preset = readFileSync(join(repoRoot, 'packages', 'aezy-base', 'presets', 'aezy', 'agent.cordis.yml'), 'utf8')
invariant(preset.includes('- id: experimental-workflows'), 'The reversible workflow disable group is missing')
invariant(/- id: experimental-workflows[\s\S]*?disabled: true/.test(preset), 'Workflow/Ralph group must be disabled')
invariant(!preset.includes("name: '@deepseek-ai/dsh-tool-cordis'"), 'Dynamic Cordis must not enter the Aezy preset')

const profile = JSON.parse(readFileSync(join(dshHome, 'profiles', profileName, 'package.json'), 'utf8'))
const expectedBundles = [
  '@deepseek-ai/dsh-base',
  '@aezy/base',
  '@deepseek-ai/dsh-web-app',
  '@aezy/web',
]
invariant(JSON.stringify(profile.dsh?.profile?.bundles) === JSON.stringify(expectedBundles), 'Profile bundle order drifted')

const help = runDsh(['--profile', profileName, '--help'])
invariant(help.stdout.includes('Usage:'), 'Aezy profile did not expose the DSH Web command line')

const port = await new Promise((resolve, reject) => {
  const probe = createServer()
  probe.once('error', reject)
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address()
    const selected = typeof address === 'object' && address ? address.port : 0
    probe.close(error => error ? reject(error) : resolve(selected))
  })
})

const child = spawnDsh(['--profile', profileName, '--host', '127.0.0.1', '--port', String(port), '--no-open'])
let output = ''
const startup = new Promise((resolve, reject) => {
  const append = chunk => {
    output += chunk.toString()
    if (output.includes('dsh web:')) resolve()
  }
  child.stdout.on('data', append)
  child.stderr.on('data', append)
  child.once('exit', code => reject(new Error(`Aezy Web exited during startup with code ${code}\n${output}`)))
})

try {
  let startupTimer
  try {
    await Promise.race([
      startup,
      new Promise((_, reject) => {
        startupTimer = setTimeout(() => reject(new Error(`Aezy Web startup timed out\n${output}`)), 120000)
      }),
    ])
  } finally {
    clearTimeout(startupTimer)
  }
  const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(10000) })
  invariant(response?.ok, `Aezy Web did not become ready on port ${port}\n${output}`)
  const html = await response.text()
  invariant(/<!doctype html>/i.test(html), 'Aezy Web root did not serve the DSH frontend')
  invariant(html.includes('"id":"@aezy/brand"'), 'Aezy Web did not load the Aezy brand occupant')
  invariant(
    !html.includes('"id":"@deepseek-ai/dsh-client-ui-brand-official"'),
    'Aezy Web still loads the disabled official DSH brand occupant',
  )

  const host = await rpc(port, 'host.describe', {})
  invariant(typeof host === 'object' && host !== null, 'host.describe returned no host information')
  const workspace = await rpc(port, 'workspace.create', { path: repoRoot })
  invariant(workspace.workspace?.path === repoRoot, 'workspace.create did not adopt the Aezy repository')
  const sessionId = `m0-smoke-${Date.now().toString(36)}`
  const session = await rpc(port, 'session.create', {
    workspaceId: workspace.workspace.id,
    sessionId,
    agentPreset: 'aezy',
  })
  invariant(session.sessionId === sessionId, 'session.create returned the wrong Session')
  invariant(session.agentPreset === 'aezy', 'session.create did not mount the Aezy Agent preset')
} finally {
  child.kill('SIGTERM')
  if (child.exitCode === null) {
    let shutdownTimer
    try {
      await new Promise(resolve => {
        child.once('exit', resolve)
        shutdownTimer = setTimeout(() => {
          child.kill('SIGKILL')
          resolve()
        }, 10000)
      })
    } finally {
      clearTimeout(shutdownTimer)
    }
  }
}

process.stdout.write('M0 composition, Web, Workspace, Session, and Aezy preset smoke passed.\n')
