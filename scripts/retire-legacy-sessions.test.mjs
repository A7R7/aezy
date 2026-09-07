import assert from 'node:assert/strict'
import test from 'node:test'
import { retiredPreset, sessionIdentity } from './retire-legacy-sessions.mjs'

test('retirement uses durable preset identity, never a session name', () => {
  assert.equal(retiredPreset('aezy'), true)
  assert.equal(retiredPreset(`codex-inspired-r1-${'a'.repeat(64)}`), true)
  for (const id of ['standard', 'codex-app-server', 'aezy-codex', 'codex-inspired-my-custom-preset']) assert.equal(retiredPreset(id), false)
  const records = [{ type: 'session', id: 'aezy-codex-inspired-proof', agentPreset: 'aezy', cwd: '/tmp/project' },
    { type: 'agent-preset/selected', data: { agentPreset: 'standard' } }]
  assert.equal(retiredPreset(sessionIdentity(records).preset), false)
  assert.throws(() => sessionIdentity([{ type: 'unknown' }]))
})
