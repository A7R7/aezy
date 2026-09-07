import { appendFileSync, closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { join, resolve } from 'node:path'
import { publishedPrice } from './prices.js'

// Display-only projection, not the DSH usage ledger. Never accept arbitrary
// serialized requests, error messages, prompts, tool arguments or credentials.
export const id = value => typeof value === 'string' && /^[a-zA-Z0-9_.:/@+ -]{1,180}$/.test(value) ? value : 'unknown'
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : undefined
const hash = value => typeof value === 'string' && value ? createHash('sha256').update(value).digest('hex').slice(0, 24) : undefined
export function usageOf(value, convention = 'inclusive') {
  if (!value || count(value.inputTokens) === undefined || count(value.outputTokens) === undefined) return undefined
  const cached = count(value.cacheReadInputTokens ?? value.cacheReadTokens ?? value.cachedInputTokens)
  const written = count(value.cacheCreationInputTokens ?? value.cacheWriteTokens)
  const input = value.inputTokens + (convention === 'disjoint' ? (cached ?? 0) + (written ?? 0) : 0)
  if ((cached ?? 0) + (written ?? 0) > input || !Number.isSafeInteger(input + value.outputTokens)
    || (value.totalTokens !== undefined && value.totalTokens !== input + value.outputTokens)) return undefined
  return { inputTokens: input, outputTokens: value.outputTokens, totalTokens: count(value.totalTokens) ?? input + value.outputTokens,
    ...(cached !== undefined ? { cachedInputTokens: cached, cacheReadInputTokens: cached } : {}),
    ...(written !== undefined ? { cacheCreationInputTokens: written } : {}),
    ...(count(value.reasoningOutputTokens ?? value.reasoningTokens) !== undefined ? { reasoningOutputTokens: value.reasoningOutputTokens ?? value.reasoningTokens } : {}) }
}

export function metrics(row, price) {
  const missing = { kind: 'unavailable', reason: row.usage ? 'price_unmatched' : 'usage_missing' }
  let cost = missing
  if (row.usage && price && ['input', 'output', 'cacheRead', 'cacheWrite'].every(k => Number.isFinite(price[k]) && price[k] >= 0)) {
    const u = row.usage, read = u.cacheReadInputTokens ?? 0, write = u.cacheCreationInputTokens ?? 0
    // Rates are an explicitly attributed per-million snapshot, never a bill.
    const parts = { input: (u.inputTokens - read - write) * price.input / 1e6, output: u.outputTokens * price.output / 1e6,
      cacheRead: read * price.cacheRead / 1e6, cacheWrite: write * price.cacheWrite / 1e6 }
    cost = { kind: 'value', estimate: { cost: { ...parts, total: Object.values(parts).reduce((a, b) => a + b, 0) }, estimated: true,
      price: { provider: row.provider, modelId: row.model, source: price.source ?? 'user', status: price.status ?? 'verified-derived', verifiedAt: price.date, sourceRef: price.reference } }, estimateReasons: [price.source === 'expected' ? 'expected_price_overlay' : 'provider_cost_overlay', ...(u.cacheReadInputTokens === undefined ? ['cache_detail_missing'] : [])] }
  }
  return { cost, tokPerSecond: row.usage && row.durationMs > 0 && row.unit === 'request'
    ? { kind: 'value', value: row.usage.outputTokens * 1000 / row.durationMs, estimated: true }
    : { kind: 'unavailable', reason: row.usage ? 'invalid_duration' : 'usage_missing' } }
}

export class ObservationStore {
  constructor(directory, { maxRecords = 20000, prices = {}, now = () => Date.now() } = {}) {
    this.now = now; this.maxRecords = maxRecords; this.prices = prices
    this.rows = []; this.surfaces = new Map(); this.seq = Date.now() * 1000; this.debugRows = []; this.inboundRows = []
    this.overrides = {}; this.env = { debug: false, usage: false, injection: false, inbound: false }
    this.dropped = 0; this.persistenceErrors = 0; this.corruptLines = 0
    mkdirSync(directory, { recursive: true, mode: 0o700 })
    const dirStat = lstatSync(directory)
    if (realpathSync(directory) !== resolve(directory) || !dirStat.isDirectory() || dirStat.mode & 0o077 || (process.getuid && dirStat.uid !== process.getuid())) throw new Error('Observation directory must be private and not traverse symlinks')
    this.file = join(directory, 'requests.jsonl')
    // O_NOFOLLOW also covers final-file symlink substitution. Directory is a
    // private Aezy child of the already owned DSH_HOME, not a supplied HTTP path.
    const fd = openSync(this.file, constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW, 0o600)
    try {
      const stat = fstatSync(fd)
      if (!stat.isFile() || stat.mode & 0o077 || (process.getuid && stat.uid !== process.getuid())) throw new Error('Observation storage must be a private regular file')
      if (stat.size > 64 * 1024 * 1024) throw new Error('Observation storage exceeds its bounded recovery limit')
      for (const line of readFileSync(fd, 'utf8').split('\n')) {
        if (!line) continue
        try {
          const row = JSON.parse(line)
          if (row.schema === 'retention') { this.dropped += count(row.dropped) ?? 0; this.corruptLines += count(row.corruptLines) ?? 0; continue }
          if (row.schema !== 1 || !row.requestId || !Number.isFinite(row.timestamp)) throw new Error('invalid record')
          this.rows.push(this.normalize(row, true))
        } catch { this.corruptLines++ }
      }
    } finally { closeSync(fd) }
    if (this.rows.length > maxRecords) { this.dropped += this.rows.length - maxRecords; this.rows = this.rows.slice(-maxRecords) }
    for (const row of this.rows) this.registerSurface(row.surface, row.surfaceLabel)
    this.seen = new Set(this.rows.map(row => row.requestId))
    // Repair only our bounded derived projection; never touch DSH Sessions.
    // This also prevents a torn JSON tail swallowing the next appended record.
    if (this.corruptLines || this.dropped) this.checkpoint()
  }
  registerSurface(key, label) { this.surfaces.set(id(key), { id: id(key), label: id(label ?? key) }) }
  normalize(raw, restoring = false) {
    const usage = usageOf(raw.usage)
    const provider = raw.provider === 'deepseek-official' ? 'deepseek' : raw.provider
    const model = provider === 'deepseek' && typeof raw.model === 'string' ? raw.model.replace(/^deepseek\//, '') : raw.model
    const row = { schema: 1, requestId: id(raw.requestId ?? randomUUID()), timestamp: Number.isFinite(raw.timestamp) ? raw.timestamp : this.now(),
      surface: id(raw.surface), surfaceLabel: id(raw.surfaceLabel ?? raw.surface), provider: id(provider), model: id(model),
      providerRoute: id(raw.providerRoute ?? raw.provider), requestModel: id(raw.requestModel ?? raw.model),
      unit: ['request', 'turn', 'usage-notification'].includes(raw.unit) ? raw.unit : 'request',
      accounting: raw.accounting !== false,
      attemptObserved: raw.attemptObserved === true,
      status: count(raw.status) ?? 500, durationMs: count(raw.durationMs) ?? 0,
      ...(count(raw.firstOutputMs) !== undefined ? { firstOutputMs: raw.firstOutputMs } : {}),
      conversationId: restoring ? id(raw.conversationId) : hash(raw.conversationId),
      requestedEffort: raw.requestedEffort ? id(raw.requestedEffort) : undefined,
      errorCode: raw.errorCode ? id(raw.errorCode) : undefined,
      usageStatus: usage ? (raw.usageStatus === 'estimated' ? 'estimated' : 'reported') : (raw.usageStatus === 'unsupported' ? 'unsupported' : 'unreported'),
      ...(usage ? { usage, totalTokens: usage.totalTokens } : {}),
      routeDecision: { routeKind: id(raw.surface), selected: { provider: id(raw.providerRoute ?? raw.provider), model: id(raw.requestModel ?? raw.model), reason: 'Owner-observed route. No routing override.' } },
    }
    row.displayMetrics = metrics(row, this.prices[`${row.provider}/${row.model}`] ?? publishedPrice(row))
    if (row.attemptObserved) row.attempts = [{ ordinal: 1, provider: row.provider, model: row.model, status: row.status, durationMs: row.durationMs,
      upstreamSendCount: 1, recoveryKinds: [], usageStatus: row.usageStatus, usage: row.usage, errorCode: row.errorCode, displayMetrics: row.displayMetrics }]
    return row
  }
  record(raw) {
    // Observability must never turn a successful model call into a failed Turn.
    try {
      const row = this.normalize(raw)
      if (this.seen.has(row.requestId)) return
      this.registerSurface(row.surface, row.surfaceLabel); this.seen.add(row.requestId); this.rows.push(row)
      if (this.rows.length > this.maxRecords) {
        const removed = this.rows.splice(0, Math.max(this.rows.length - this.maxRecords, Math.floor(this.maxRecords / 10))); this.dropped += removed.length
        for (const old of removed) this.seen.delete(old.requestId)
        this.checkpoint()
      } else {
        const fd = openSync(this.file, constants.O_APPEND | constants.O_WRONLY | constants.O_NOFOLLOW)
        try { appendFileSync(fd, `${JSON.stringify(row)}\n`) } finally { closeSync(fd) }
      }
      this.debug('provider', { event: 'completed', requestId: row.requestId, surface: row.surface, status: row.status, durationMs: row.durationMs })
      this.debug('usage', { event: row.usageStatus, requestId: row.requestId, usage: row.usage ?? null })
      return row
    } catch { this.persistenceErrors++ }
  }
  checkpoint() {
    const temporary = `${this.file}.${randomUUID()}.tmp`
    writeFileSync(temporary, [JSON.stringify({ schema: 'retention', dropped: this.dropped, corruptLines: this.corruptLines }), ...this.rows.map(r => JSON.stringify(r))].join('\n') + '\n', { mode: 0o600, flag: 'wx' })
    renameSync(temporary, this.file)
  }
  settings() { const flags = { ...this.env, ...this.overrides }; return { ...flags, enabled: flags.debug, runtimeOverride: this.overrides, env: this.env } }
  setDebug(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !['reset', ...Object.keys(this.env)].includes(k))) throw new Error('invalid debug flags')
    if (value.reset === true) this.overrides = {}
    else { for (const [key, v] of Object.entries(value)) if (!(key in this.env) || typeof v !== 'boolean') throw new Error('invalid debug flag'); Object.assign(this.overrides, value) }
    return this.settings()
  }
  debug(stream, metadata) {
    if (!this.settings()[stream === 'provider' ? 'enabled' : stream]) return
    // Only producer-owned, numeric or allowlisted metadata; no arbitrary line API.
    const safe = {}
    for (const [key, value] of Object.entries(metadata)) {
      if (['event', 'requestId', 'surface', 'model', 'provider'].includes(key)) safe[key] = id(value)
      if (['status', 'durationMs', 'messages', 'tools', 'inputItems', 'systemCharacters'].includes(key)) safe[key] = count(value)
      if (key === 'usage') safe.usage = usageOf(value) ?? null
    }
    this.debugRows.push({ seq: ++this.seq, at: this.now(), stream, line: JSON.stringify(safe) })
    if (this.debugRows.length > 2000) this.debugRows.shift()
  }
  inbound(metadata) {
    if (!this.settings().inbound) return
    this.inboundRows.push({ id: ++this.seq, at: this.now(), endpoint: id(metadata.surface), model: id(metadata.model),
      outputConfigEffort: id(metadata.effort), hasSystem: !!metadata.hasSystem, hasMetadataUserId: false,
      systemTag: metadata.hasSystem ? 'present (content not retained)' : undefined })
    if (this.inboundRows.length > 500) this.inboundRows.shift()
  }
  summary({ range = '30d', surface = 'all' } = {}) {
    const since = range === 'all' ? 0 : this.now() - (range === '7d' ? 7 : 30) * 86400000
    const rows = this.rows.filter(r => r.accounting && r.timestamp >= since && (surface === 'all' || r.surface === surface))
    const empty = () => ({ requests: 0, measuredRequests: 0, reportedRequests: 0, estimatedRequests: 0, unreportedRequests: 0, unsupportedRequests: 0,
      inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0, reasoningOutputTokens: 0, totalTokens: 0,
      estimatedCostUsd: 0, pricedRequests: 0, unpricedRequests: 0, unmeteredRequests: 0 })
    const summary = empty(), days = new Map(), models = new Map(), providers = new Map()
    const add = (target, row) => {
      target.requests++; target[`${row.usageStatus}Requests`]++
      if (row.usage) { target.measuredRequests++; for (const k of ['inputTokens', 'outputTokens', 'cachedInputTokens', 'cacheReadInputTokens', 'cacheCreationInputTokens', 'reasoningOutputTokens', 'totalTokens']) target[k] += row.usage[k] ?? 0 }
      if (row.displayMetrics.cost.kind === 'value') { target.pricedRequests++; target.estimatedCostUsd += row.displayMetrics.cost.estimate.cost.total }
      else target[row.usage ? 'unpricedRequests' : 'unmeteredRequests']++
    }
    for (const row of rows) {
      add(summary, row)
      const date = new Date(row.timestamp).toISOString().slice(0, 10), key = JSON.stringify([row.provider, row.model])
      if (!days.has(date)) days.set(date, { ...empty(), date, models: new Map() })
      if (!models.has(key)) models.set(key, { ...empty(), provider: row.provider, model: row.model })
      if (!providers.has(row.provider)) providers.set(row.provider, { ...empty(), provider: row.provider })
      const day = days.get(date)
      if (!day.models.has(key)) day.models.set(key, { ...empty(), provider: row.provider, model: row.model })
      for (const target of [day, day.models.get(key), models.get(key), providers.get(row.provider)]) add(target, row)
    }
    summary.coverageRatio = summary.requests ? summary.measuredRequests / summary.requests : 0
    // No priced calls is unavailable, not a fabricated $0 receipt.
    if (!summary.pricedRequests) delete summary.estimatedCostUsd
    return { range, surface, since, generatedAt: this.now(), summary, days: [...days.values()].sort((a,b) => a.date.localeCompare(b.date)).map(d => ({ ...d, models: [...d.models.values()] })),
      models: [...models.values()].map(m => ({ ...m, shareRatio: summary.totalTokens ? m.totalTokens / summary.totalTokens : 0 })),
      providers: [...providers.values()].map(p => ({ ...p, shareRatio: summary.totalTokens ? p.totalTokens / summary.totalTokens : 0 })),
      historyTruncated: this.dropped > 0 || this.corruptLines > 0, entriesTruncated: this.dropped > 0, entriesDropped: this.dropped, truncatedPrefixBytes: 0,
      snapshotWindowStart: this.rows[0]?.timestamp, snapshotWindowEnd: this.rows.at(-1)?.timestamp,
      surfaces: [...this.surfaces.values()], persistenceErrors: this.persistenceErrors, corruptLines: this.corruptLines,
      units: [...new Set(rows.map(r => r.unit))] }
  }
}
