import { createHash, randomUUID } from 'node:crypto'

/** Public notification projection only. Never reconstruct wire requests or
 * assume tokenUsage.last represents the whole multi-step Codex Turn. */
export function observeOfficialTurn(store, { provider, model, conversationId, effort }) {
  if (!store || provider !== 'openai') return { notification() {}, finish() {} }
  const started = Date.now(), fallbackId = randomUUID()
  let measured = false
  store.registerSurface('codex-app-server', 'Codex App Server')
  return {
    notification(message) {
      try {
        if (message.method !== 'thread/tokenUsage/updated') return
        const p = message.params, usage = p?.tokenUsage?.last
        if (!usage || !Number.isSafeInteger(usage.inputTokens) || !Number.isSafeInteger(usage.outputTokens)) return
        // last = this reported model call; total is ONLY a dedup cursor, not
        // a second quantity added to the usage report. Tool time is not TTFT.
        const requestId = createHash('sha256').update(JSON.stringify([p.threadId, p.turnId, p.tokenUsage.total, usage])).digest('hex')
        store.record({ requestId, timestamp: Date.now(), surface: 'codex-app-server', surfaceLabel: 'Codex App Server', provider: 'openai', model,
          conversationId, requestedEffort: effort, unit: 'usage-notification', status: 200, durationMs: 0,
          usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, totalTokens: usage.totalTokens,
            cachedInputTokens: usage.cachedInputTokens, reasoningOutputTokens: usage.reasoningOutputTokens } })
        measured = true
      } catch { /* optional diagnostic projection must not control Codex */ }
    },
    finish(status = 499) {
      if (measured && status === 200) return
      try { store.record({ requestId: fallbackId, timestamp: started, surface: 'codex-app-server', surfaceLabel: 'Codex App Server', provider: 'openai', model,
        conversationId, requestedEffort: effort, unit: 'turn', status, durationMs: Date.now() - started, usageStatus: 'unreported', accounting: !measured }) } catch {}
    },
  }
}
