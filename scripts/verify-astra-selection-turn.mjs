import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { compatibleSelection, resolveModelDirectory } from '../packages/aezy-mode/src/model-routing.js'

// Explicitly opted-in real Turn, via the already authenticated Host owner.
// Never read/copy OAuth, share CODEX_HOME, or point a model at the user's repo.
export async function verifyAstraSelectionTurn({ rpc, catalog }) {
  const fixture = await mkdtemp('/tmp/aezy-astra-route-proof-')
  const marker = `AEZY_ASTRA_ROUTE_${Date.now().toString(36)}`
  await writeFile(join(fixture, 'route.txt'), `${marker}\n`)
  const sessionId = `aezy-astra-route-${Date.now().toString(36)}`
  const workspace = await rpc('workspace/create', { request: { path: fixture } })
  await rpc('session/create', { request: { workspaceId: workspace.workspace.workspaceId, sessionId, agentPreset: 'codex-app-server' } })
  const row = resolveModelDirectory(catalog, 'codex-app-server', null).flatMap(group => group.models)
    .find(row => row.id === 'openai/gpt-6-astra')
  assert.ok(row?.route)
  const selected = compatibleSelection(row, { reasoningEffort: 'low' })
  assert.equal(selected.provider, 'aezy-codex')
  assert.equal(selected.model, 'gpt-6-astra')
  await rpc('session/selectModel', { request: { sessionId, ...selected } })
  let completed = false
  try {
    await rpc('session/prompt', { request: { sessionId, requestId: sessionId, mode: 'queue',
      content: [{ type: 'text', text: 'Use dsh.read exactly once to read route.txt in this workspace. Reply with exactly the file contents. Do not use any other tool, modify files, or access the network.' }] } })
    const deadline = Date.now() + 120_000
    let summary
    while (Date.now() < deadline) {
      summary = (await rpc('session/list', { _request: {} })).items.find(row => row.sessionId === sessionId)
      if (summary?.running === false && summary.projections.values.sessionStats.turns >= 1) break
      await new Promise(resolve => setTimeout(resolve, 400))
    }
    assert.ok(summary?.running === false && summary.projections.values.sessionStats.turns >= 1, 'Astra Turn timed out')
    const page = await rpc('session/page', { request: { address: { kind: 'session', sessionId },
      throughSeq: summary.projections.asOfSeq, maxMessages: 100 } })
    const events = page.records.filter(row => row.type === 'event').map(row => row.event)
    const reason = events.findLast(event => event.type === 'turn/end')?.data.reason
    assert.equal(reason?.kind, 'completed', JSON.stringify(reason))
    const calls = events.filter(event => event.type === 'tool/call')
    assert.deepEqual(calls.map(event => event.data.name), ['read'])
    const result = events.find(event => event.type === 'tool/result' && event.data.message?.source?.callId === calls[0].data.callId)
    assert.equal(result?.data.meta?.aezyCodex?.type, 'dynamicTool')
    const text = events.filter(event => event.type === 'assistant/message')
      .flatMap(event => event.data.message.content).filter(block => block.type === 'text').map(block => block.text).join('\n')
    assert.ok(text.includes(marker), 'Astra must return the marker observed through the governed read tool')
    completed = true
    await assert.rejects(rpc('agentPresets/select', { agentId: sessionId, agentPreset: 'standard' }), /agent-preset\/locked/)
    return { timestamp: new Date().toISOString(), sessionId, fixture, modelIdentity: row.id, selected,
      realTurn: true, governedRead: true, markerMatched: true, startedPresetLocked: true, oauthFilesRead: false }
  } finally {
    if (!completed) await rpc('session/cancel', { request: { sessionId } }).catch(() => {})
  }
}
