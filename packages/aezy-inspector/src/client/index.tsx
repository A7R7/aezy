import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { projectBlueprintOverlay, projectLoopTrace } from '../trace.js'
import type {
  BlueprintEdge, BlueprintNode, BlueprintSourceRef, LoopTrace, Span, TraceUsage,
} from '../trace.js'

type Observable<T> = {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

type EventWindow = {
  entries: readonly Record<string, unknown>[]
  hasMore: boolean
  revision: number
}

type SessionFace = Observable<{ running?: boolean; hasMore?: boolean }> & {
  loadOlder(): Promise<void>
}

type SessionBinding = {
  session: SessionFace
  eventSource: Observable<EventWindow>
}

type SessionList = Observable<{
  current?: string
  byId: Record<string, {
    cwd?: string
    projectionValues?: Record<string, unknown>
  }>
}>

type InspectorContext = Context & {
  sessions: {
    list: SessionList
    binding(sessionId: string): SessionBinding | undefined
    scope(sessionId: string): { effect(dispose: () => () => void, label: string): void } | undefined
  }
  slots: {
    inject(name: string, mount: () => unknown): unknown
    register(options: Record<string, unknown>, component: unknown): () => void
  }
  layout: { openDetails(): void; closeDetails(): void }
}

const colors = {
  page: 'var(--dsw-alias-bg-page, #0f1115)',
  raised: 'var(--dsw-alias-bg-raised, #171a20)',
  soft: 'var(--dsw-alias-bg-layer-1, rgba(255,255,255,.045))',
  border: 'var(--dsw-alias-border-subtle, rgba(255,255,255,.13))',
  text: 'var(--dsw-alias-label-primary, #e9edf2)',
  muted: 'var(--dsw-alias-label-secondary, #9aa4b2)',
  active: 'var(--dsw-alias-brand-primary, #6ea8fe)',
  done: 'var(--dsw-alias-status-success, #62c98d)',
  failed: 'var(--dsw-alias-status-danger, #ef7373)',
  warning: 'var(--dsw-alias-status-warning, #dfb15b)',
}

function modeFrom(list: ReturnType<SessionList['getSnapshot']>, sessionId: string): string | null {
  const value = list.byId[sessionId]?.projectionValues?.agentPreset
  return typeof value === 'string' ? value : null
}

function degraded(trace: LoopTrace, code: string): LoopTrace {
  if (trace.diagnostics.some(item => item.code === code)) return trace
  return {
    ...trace,
    completeness: trace.completeness === 'unavailable' ? 'unavailable' : 'partial',
    diagnostics: [...trace.diagnostics, { code, message: code }],
  }
}

export class LoopTraceController implements Observable<LoopTrace> {
  private readonly listeners = new Set<() => void>()
  private snapshot: LoopTrace
  private historyProblem: string | null = null
  private loading: Promise<void> | null = null
  private readonly stops: Array<() => void>

  constructor(
    private readonly sessionId: string,
    private readonly binding: SessionBinding,
    private readonly list: SessionList,
  ) {
    this.snapshot = this.project()
    const refresh = () => {
      this.snapshot = this.project()
      for (const listener of this.listeners) listener()
    }
    this.stops = [binding.eventSource.subscribe(refresh), binding.session.subscribe(refresh), list.subscribe(refresh)]
  }

  readonly getSnapshot = (): LoopTrace => this.snapshot

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  dispose(): void {
    for (const stop of this.stops) stop()
    this.listeners.clear()
  }

  ensureComplete(): Promise<void> {
    if (this.loading !== null) return this.loading
    this.loading = this.loadComplete().finally(() => { this.loading = null })
    return this.loading
  }

  private project(): LoopTrace {
    const window = this.binding.eventSource.getSnapshot()
    const trace = projectLoopTrace({
      sessionId: this.sessionId,
      mode: modeFrom(this.list.getSnapshot(), this.sessionId),
      entries: window.entries,
      hasMore: window.hasMore,
      running: this.binding.session.getSnapshot().running === true,
    })
    return this.historyProblem === null ? trace : degraded(trace, this.historyProblem)
  }

  private async loadComplete(): Promise<void> {
    this.historyProblem = null
    for (let page = 0; page < 256; page += 1) {
      const before = this.binding.eventSource.getSnapshot()
      if (!before.hasMore) return
      try {
        await this.binding.session.loadOlder()
      } catch {
        this.historyProblem = 'history-load-failed'
        this.snapshot = degraded(this.project(), this.historyProblem)
        this.publish()
        return
      }
      const after = this.binding.eventSource.getSnapshot()
      if (after.hasMore && after.revision === before.revision) {
        this.historyProblem = 'history-load-stalled'
        this.snapshot = degraded(this.project(), this.historyProblem)
        this.publish()
        return
      }
    }
    if (this.binding.eventSource.getSnapshot().hasMore) {
      this.historyProblem = 'history-page-limit'
      this.snapshot = degraded(this.project(), this.historyProblem)
      this.publish()
    }
  }

  private publish(): void {
    for (const listener of this.listeners) listener()
  }
}

type PanelTarget = { sessionId: string } | null

class InspectorPanelController implements Observable<PanelTarget> {
  private target: PanelTarget = null
  private readonly listeners = new Set<() => void>()
  readonly getSnapshot = (): PanelTarget => this.target
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  open(sessionId: string): void { this.target = { sessionId }; this.publish() }
  close(): void { this.target = null; this.publish() }
  private publish(): void { for (const listener of this.listeners) listener() }
}

type TraceHook = <T>(selector: (trace: LoopTrace) => T) => T

type HeaderProps = {
  sessionId: string
  useLoopTrace: TraceHook
  openInspector(sessionId: string): void
}

function currentSpan(trace: LoopTrace): Span | undefined {
  return trace.currentSpanId === null ? undefined : trace.spans.find(span => span.spanId === trace.currentSpanId)
}

function usageTotal(usage: TraceUsage | undefined): number | null {
  if (usage === undefined) return null
  if (usage.totalTokens !== undefined) return usage.totalTokens
  const values = [usage.inputTokens, usage.cacheReadTokens, usage.cacheWriteTokens, usage.outputTokens]
    .filter((value): value is number => typeof value === 'number')
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0)
}

function shortNumber(value: number): string {
  if (value < 1_000) return String(value)
  if (value < 1_000_000) return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)}k`
  return `${(value / 1_000_000).toFixed(1)}m`
}

function durationText(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1_000))
  if (seconds < 60) return `${String(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${String(minutes)}m ${String(seconds % 60)}s`
  return `${String(Math.floor(minutes / 60))}h ${String(minutes % 60)}m`
}

function backendLabel(backend: string): string {
  if (backend === 'codex-app-server') return 'Codex App Server'
  if (backend === 'dsh-native') return 'DSH native'
  return 'Loop unavailable'
}

export function InspectorHeaderAction({ sessionId, useLoopTrace, openInspector }: HeaderProps) {
  const trace = useLoopTrace(value => value)
  const span = currentSpan(trace)
  const usage = usageTotal(trace.spans[0]?.usage?.value)
  const active = trace.activeSpanIds.length > 0
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => { setNow(Date.now()) }, 1_000)
    return () => { clearInterval(timer) }
  }, [active])

  const elapsed = span?.startedAt === undefined ? null : Math.max(0, now - span.startedAt.value)
  const pieces = [trace.mode ?? backendLabel(trace.backend), span?.label ?? (active ? 'Running' : 'Idle')]
  if (elapsed !== null && active) pieces.push(durationText(elapsed))
  if (usage !== null) pieces.push(`${shortNumber(usage)} tok`)

  return <button
    type="button"
    data-aezy-loop-inspector
    data-completeness={trace.completeness}
    aria-label={`Open Loop Inspector: ${pieces.join(', ')}`}
    title={`${backendLabel(trace.backend)} · ${trace.completeness}`}
    onClick={() => { openInspector(sessionId) }}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 26, maxWidth: 360,
      padding: '3px 8px', border: `1px solid ${colors.border}`, borderRadius: 999,
      background: colors.soft, color: colors.text, cursor: 'pointer', fontSize: 11,
    }}
  >
    <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: active ? colors.active : trace.completeness === 'complete' ? colors.done : colors.warning }} />
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pieces.join(' · ')}</span>
  </button>
}

type PanelProps = {
  panel: Observable<PanelTarget>
  trace: LoopTraceController
  surface: 'details' | 'overlay'
  closePanel(): void
  syncLayout(narrow: boolean): void
}

function statusColor(status: Span['status']['value']): string {
  if (status === 'active' || status === 'pending') return colors.active
  if (status === 'completed') return colors.done
  if (status === 'failed') return colors.failed
  if (status === 'cancelled' || status === 'interrupted') return colors.warning
  return colors.muted
}

function spanDepth(span: Span, byId: Map<string, Span>): number {
  let depth = 0
  let parent = span.parentSpanId
  const seen = new Set<string>()
  while (parent !== undefined && !seen.has(parent) && depth < 16) {
    seen.add(parent)
    depth += 1
    parent = byId.get(parent)?.parentSpanId
  }
  return depth
}

function SourceRefs({ span }: { span: Span }) {
  return <details style={{ marginTop: 6 }}>
    <summary style={{ cursor: 'pointer', color: colors.muted, fontSize: 10 }}>Evidence · {span.status.evidence}</summary>
    <ul style={{ margin: '5px 0 0', paddingLeft: 16, color: colors.muted, fontSize: 10 }}>
      {span.sources.map((source, index) => <li key={`${source.source}:${source.seq ?? source.itemId ?? index}`}>
        {source.source} · {source.eventType}
        {source.seq === undefined ? '' : ` · seq ${String(source.seq)}`}
        {source.itemId === undefined ? '' : ` · item ${source.itemId}`}
      </li>)}
    </ul>
  </details>
}

function Timeline({ trace, now }: { trace: LoopTrace; now: number }) {
  const byId = useMemo(() => new Map(trace.spans.map(span => [span.spanId, span])), [trace.spans])
  return <ol data-aezy-loop-timeline style={{ listStyle: 'none', margin: 0, padding: '8px 10px 18px' }}>
    {trace.spans.map(span => {
      const elapsed = span.durationMs?.value
        ?? (span.status.value === 'active' && span.startedAt !== undefined ? Math.max(0, now - span.startedAt.value) : null)
      const usage = usageTotal(span.usage?.value)
      return <li key={span.spanId} data-span-status={span.status.value} style={{ margin: '7px 0', marginLeft: Math.min(80, spanDepth(span, byId) * 14) }}>
        <article style={{ border: `1px solid ${colors.border}`, borderLeft: `3px solid ${statusColor(span.status.value)}`, borderRadius: 8, background: colors.soft, padding: '8px 9px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <strong style={{ fontSize: 12 }}>{span.label}</strong>
            <span style={{ color: statusColor(span.status.value), fontSize: 10 }}>{span.status.value}</span>
            <span style={{ marginLeft: 'auto', color: colors.muted, fontSize: 10 }}>
              {elapsed === null ? '' : durationText(elapsed)}{usage === null ? '' : `${elapsed === null ? '' : ' · '}${shortNumber(usage)} tok`}
            </span>
          </div>
          <div style={{ marginTop: 3, color: colors.muted, fontSize: 10 }}>
            {span.blueprintNodeId ?? span.kind} · {span.status.evidence}
            {span.parentEvidence === undefined ? '' : ` · parent ${span.parentEvidence}`}
          </div>
          {span.safeFacts === undefined ? null : <div style={{ marginTop: 4, color: colors.muted, fontSize: 10 }}>
            {Object.entries(span.safeFacts).map(([key, value]) => `${key}=${String(value.value)}`).join(' · ')}
          </div>}
          <SourceRefs span={span} />
        </article>
      </li>
    })}
  </ol>
}

type BlueprintSelection = { kind: 'node'; value: BlueprintNode } | { kind: 'edge'; value: BlueprintEdge }

function blueprintPath(edge: BlueprintEdge, nodes: Map<string, BlueprintNode>, width: number, height: number): string {
  const from = nodes.get(edge.from)
  const to = nodes.get(edge.to)
  if (from === undefined || to === undefined) return ''
  const sx = from.position.x + width / 2
  const sy = from.position.y + height / 2
  const tx = to.position.x + width / 2
  const ty = to.position.y + height / 2
  if (edge.kind === 'loop-back') {
    const bend = Math.max(70, Math.abs(ty - sy) * 0.35)
    return `M ${String(sx)} ${String(sy)} C ${String(sx)} ${String(sy + bend)}, ${String(tx)} ${String(ty - bend)}, ${String(tx)} ${String(ty)}`
  }
  const middle = (sx + tx) / 2
  return `M ${String(sx)} ${String(sy)} C ${String(middle)} ${String(sy)}, ${String(middle)} ${String(ty)}, ${String(tx)} ${String(ty)}`
}

function BlueprintRefs({ refs }: { refs: readonly BlueprintSourceRef[] }) {
  return <ul style={{ margin: '6px 0 0', paddingLeft: 17, color: colors.muted, fontSize: 10 }}>
    {refs.map(source => <li key={`${source.authority}:${source.owner}:${source.symbol}`} style={{ marginTop: 3 }}>
      {source.owner} · {source.symbol}<br />
      <span style={{ opacity: .78 }}>{source.revision} · {source.path}</span>
    </li>)}
  </ul>
}

function LogicGraph({ trace, now }: { trace: LoopTrace; now: number }) {
  const blueprint = trace.blueprint
  const overlay = useMemo(() => projectBlueprintOverlay(trace), [trace])
  const nodes = useMemo(() => new Map(blueprint.nodes.map(nodeValue => [nodeValue.id, nodeValue])), [blueprint])
  const [selection, setSelection] = useState<BlueprintSelection | null>(null)
  const [fit, setFit] = useState(true)
  const [availableWidth, setAvailableWidth] = useState(blueprint.canvas.width)
  const frame = useRef<HTMLDivElement>(null)
  const { width, height, nodeWidth, nodeHeight } = blueprint.canvas

  useEffect(() => {
    const element = frame.current
    if (element === null || typeof ResizeObserver === 'undefined') return
    const update = () => { setAvailableWidth(Math.max(1, element.clientWidth)) }
    const observer = new ResizeObserver(update)
    observer.observe(element)
    update()
    return () => { observer.disconnect() }
  }, [blueprint])

  const scale = fit ? Math.min(1, availableWidth / width) : 1

  return <section data-aezy-loop-logic-graph data-blueprint={blueprint.id} style={{ padding: 12 }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 10 }}>
      <div>
        <strong style={{ display: 'block', fontSize: 13 }}>{blueprint.title}</strong>
        <span style={{ display: 'block', maxWidth: 760, marginTop: 3, color: colors.muted, fontSize: 10 }}>{blueprint.description}</span>
      </div>
      <div style={{ marginLeft: 'auto', color: colors.muted, fontSize: 9, textAlign: 'right' }}>
        Static blueprint v{String(blueprint.revision)}<br />{blueprint.digest.slice(0, 24)}…<br />
        <button type="button" onClick={() => { setFit(value => !value) }} style={{ marginTop: 4, padding: 0, border: 0, background: 'transparent', color: colors.active, cursor: 'pointer', fontSize: 9 }}>{fit ? 'Open at 100%' : 'Fit overview'}</button>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, color: colors.muted, fontSize: 9 }}>
      <span><i style={{ display: 'inline-block', width: 8, height: 8, marginRight: 4, borderRadius: '50%', background: colors.active }} />active</span>
      <span><i style={{ display: 'inline-block', width: 8, height: 8, marginRight: 4, borderRadius: '50%', background: colors.done }} />visited</span>
      <span>solid topology is static · highlights are durable trace overlay</span>
    </div>
    <div ref={frame} style={{ width: '100%', overflow: 'auto' }}>
      <div style={{ position: 'relative', width: width * scale, height: height * scale }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width, height, transform: `scale(${String(scale)})`, transformOrigin: 'top left', border: `1px solid ${colors.border}`, borderRadius: 10, background: colors.raised, overflow: 'hidden' }}>
      <svg aria-label={`${blueprint.title} edges`} width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <defs>
          <marker id="aezy-loop-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker>
        </defs>
        {blueprint.edges.map(edgeValue => {
          const state = overlay.edges[edgeValue.id]
          const from = nodes.get(edgeValue.from)
          const to = nodes.get(edgeValue.to)
          if (from === undefined || to === undefined) return null
          const labelX = (from.position.x + to.position.x + nodeWidth) / 2
          const labelY = (from.position.y + to.position.y + nodeHeight) / 2 - 5
          const stroke = state.active ? colors.active : state.traversed ? colors.done : colors.muted
          return <g key={edgeValue.id} data-aezy-loop-blueprint-edge={edgeValue.id} data-edge-kind={edgeValue.kind} data-traversed={String(state.traversed)}>
            <path d={blueprintPath(edgeValue, nodes, nodeWidth, nodeHeight)} fill="none" stroke={stroke} strokeOpacity={state.traversed ? .9 : .34} strokeWidth={state.active ? 2.4 : edgeValue.kind === 'loop-back' ? 1.7 : 1.3} strokeDasharray={edgeValue.kind === 'loop-back' || edgeValue.kind === 'retry' ? '5 4' : undefined} markerEnd="url(#aezy-loop-arrow)" />
            <text x={labelX} y={labelY} textAnchor="middle" fill={state.traversed ? colors.text : colors.muted} stroke={colors.raised} strokeWidth="4" paintOrder="stroke" fontSize="9">{edgeValue.label}</text>
          </g>
        })}
      </svg>
      {blueprint.nodes.map(nodeValue => {
        const state = overlay.nodes[nodeValue.id]
        const activeDuration = state.activeSince === undefined ? 0 : Math.max(0, now - state.activeSince)
        const elapsed = state.durationMs + activeDuration
        const tokens = usageTotal(state.usage)
        const borderColor = state.active ? colors.active : state.visited ? colors.done : colors.border
        return <button
          key={nodeValue.id}
          type="button"
          data-aezy-loop-blueprint-node={nodeValue.id}
          data-node-kind={nodeValue.kind}
          data-runtime-status={state.status}
          aria-label={`${nodeValue.label}; owner ${nodeValue.owner}; ${state.visited ? `visited ${String(state.visits)} times` : 'not visited in loaded Session history'}`}
          onClick={() => { setSelection({ kind: 'node', value: nodeValue }) }}
          style={{
            position: 'absolute', left: nodeValue.position.x, top: nodeValue.position.y,
            width: nodeWidth, height: nodeHeight, padding: '8px 9px', textAlign: 'left', overflow: 'hidden',
            border: `${nodeValue.opaque ? '2px dashed' : '1px solid'} ${borderColor}`,
            boxShadow: state.active ? `0 0 0 2px color-mix(in srgb, ${colors.active} 28%, transparent)` : 'none',
            borderRadius: 8, background: nodeValue.opaque ? `repeating-linear-gradient(135deg, ${colors.soft}, ${colors.soft} 7px, ${colors.raised} 7px, ${colors.raised} 14px)` : colors.soft,
            color: colors.text, cursor: 'pointer', zIndex: 1,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i aria-hidden="true" style={{ width: 7, height: 7, flex: '0 0 auto', borderRadius: '50%', background: state.active ? colors.active : state.visited ? statusColor(state.status) : colors.muted }} />
            <strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{nodeValue.label}</strong>
            {nodeValue.opaque ? <small style={{ marginLeft: 'auto', color: colors.warning, fontSize: 8 }}>OPAQUE</small> : null}
          </span>
          <span style={{ display: 'block', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: colors.muted, fontSize: 9 }}>{nodeValue.owner}</span>
          <span style={{ display: 'block', marginTop: 7, color: state.visited ? colors.text : colors.muted, fontSize: 9 }}>
            {state.visited ? `${String(state.visits)} visit${state.visits === 1 ? '' : 's'}` : 'static'}
            {elapsed > 0 ? ` · ${durationText(elapsed)}` : ''}{tokens === null ? '' : ` · ${shortNumber(tokens)} tok`}
          </span>
        </button>
      })}
        </div>
      </div>
    </div>
    <div style={{ marginTop: 10, minHeight: 76, padding: '9px 10px', border: `1px solid ${colors.border}`, borderRadius: 8, background: colors.soft }}>
      {selection === null ? <span style={{ color: colors.muted, fontSize: 10 }}>Select a node to inspect its static owner and source contract. Edge labels show the branch or loop guard.</span>
        : selection.kind === 'node' ? <>
          <strong style={{ fontSize: 11 }}>{selection.value.label}</strong>
          <span style={{ marginLeft: 7, color: colors.muted, fontSize: 9 }}>{selection.value.kind} · {selection.value.owner}{selection.value.opaque ? ' · opaque boundary' : ''}</span>
          <p style={{ margin: '5px 0 0', color: colors.muted, fontSize: 10 }}>{selection.value.description}</p>
          <BlueprintRefs refs={selection.value.sourceRefs} />
        </> : <>
          <strong style={{ fontSize: 11 }}>{selection.value.label}</strong>
          <p style={{ margin: '5px 0 0', color: colors.muted, fontSize: 10 }}>Guard: {selection.value.guard}</p>
          <BlueprintRefs refs={selection.value.sourceRefs} />
        </>}
    </div>
  </section>
}

export function InspectorPanel({ panel, trace: source, surface, closePanel, syncLayout }: PanelProps) {
  const target = useSyncExternalStore(panel.subscribe, panel.getSnapshot)
  const trace = useSyncExternalStore(source.subscribe, source.getSnapshot)
  const [view, setView] = useState<'logic' | 'timeline'>('logic')
  const [viewport, setViewport] = useState(() => window.innerWidth)
  const [now, setNow] = useState(() => Date.now())
  const narrow = viewport < 760
  const currentSurface = narrow ? 'overlay' : 'details'
  const visible = target !== null && surface === currentSurface

  useEffect(() => {
    const resize = () => { setViewport(window.innerWidth) }
    window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize) }
  }, [])

  useEffect(() => {
    if (target !== null) syncLayout(narrow)
  }, [narrow, syncLayout, target])

  useEffect(() => {
    if (!visible) return
    void source.ensureComplete()
    const key = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') closePanel() }
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('keydown', key) }
  }, [closePanel, source, visible])

  useEffect(() => {
    if (!visible || trace.activeSpanIds.length === 0) return
    const timer = setInterval(() => { setNow(Date.now()) }, 1_000)
    return () => { clearInterval(timer) }
  }, [trace.activeSpanIds.length, visible])

  if (!visible || target === null) return null

  const content = <aside aria-label="Loop Inspector" data-aezy-loop-inspector-panel data-session-id={target.sessionId} style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.page, color: colors.text }}>
    <header style={{ flex: '0 0 auto', padding: '9px 11px', borderBottom: `1px solid ${colors.border}`, background: colors.raised }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', fontSize: 14 }}>Loop Inspector</strong>
          <span style={{ display: 'block', marginTop: 2, color: colors.muted, fontSize: 10 }}>
            {trace.mode ?? 'unknown mode'} · {backendLabel(trace.backend)} · {trace.completeness}
          </span>
        </div>
        <button type="button" aria-label="Close Loop Inspector" onClick={closePanel} style={{ marginLeft: 'auto', border: 0, background: 'transparent', color: colors.muted, cursor: 'pointer', fontSize: 20 }}>×</button>
      </div>
      <div role="tablist" aria-label="Loop Inspector view" style={{ display: 'flex', gap: 5, marginTop: 9 }}>
        {(['logic', 'timeline'] as const).map(id => <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => { setView(id) }} style={{ border: `1px solid ${view === id ? colors.active : colors.border}`, borderRadius: 6, background: view === id ? colors.soft : 'transparent', color: colors.text, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>{id === 'logic' ? 'Backend Logic' : 'Timeline'}</button>)}
      </div>
    </header>
    {trace.diagnostics.length === 0 ? null : <div data-aezy-loop-diagnostics style={{ flex: '0 0 auto', padding: '6px 10px', borderBottom: `1px solid ${colors.border}`, color: colors.warning, fontSize: 10 }}>
      Visibility: {trace.diagnostics.map(item => item.code).join(' · ')}
    </div>}
    <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
      {view === 'logic' ? <LogicGraph trace={trace} now={now} /> : <Timeline trace={trace} now={now} />}
    </div>
  </aside>

  return surface === 'overlay'
    ? <div data-aezy-loop-inspector-surface="overlay" style={{ position: 'absolute', inset: 0, zIndex: 3, background: 'rgba(0,0,0,.36)' }}>{content}</div>
    : <div data-aezy-loop-inspector-surface="details" style={{ width: '100%', height: '100%' }}>{content}</div>
}

export const inject = ['slots', 'sessions', 'layout']

export function apply(raw: Context): void {
  const ctx = raw as InspectorContext
  const traces = new Map<string, LoopTraceController>()
  const panel = new InspectorPanelController()
  let disposePanelSlots: (() => void) | null = null

  const traceFor = (sessionId: string): LoopTraceController => {
    const existing = traces.get(sessionId)
    if (existing !== undefined) return existing
    const binding = ctx.sessions.binding(sessionId)
    if (binding === undefined) throw new Error(`aezy-inspector: no Session binding for ${sessionId}`)
    const trace = new LoopTraceController(sessionId, binding, ctx.sessions.list)
    traces.set(sessionId, trace)
    ctx.sessions.scope(sessionId)?.effect(() => () => {
      trace.dispose()
      traces.delete(sessionId)
    }, 'aezy-inspector: dispose Session trace')
    return trace
  }
  const syncLayout = (narrow: boolean) => { if (narrow) ctx.layout.closeDetails(); else ctx.layout.openDetails() }
  const unmountPanel = () => { disposePanelSlots?.(); disposePanelSlots = null }
  const closePanel = () => { panel.close(); ctx.layout.closeDetails(); unmountPanel() }
  const mountPanel = (trace: LoopTraceController) => {
    unmountPanel()
    const disposeDetails = ctx.slots.register({
      name: 'details', priority: -30,
      inject: (): PanelProps => ({ panel, trace, surface: 'details', closePanel, syncLayout }),
    }, InspectorPanel)
    const disposeOverlay = ctx.slots.register({
      name: 'shell.overlay', id: 'aezy-loop-inspector', order: 120,
      inject: (): PanelProps => ({ panel, trace, surface: 'overlay', closePanel, syncLayout }),
    }, InspectorPanel)
    disposePanelSlots = () => { disposeOverlay(); disposeDetails() }
  }
  const openInspector = (sessionId: string) => {
    const trace = traceFor(sessionId)
    panel.open(sessionId)
    mountPanel(trace)
    syncLayout(window.innerWidth < 760)
    void trace.ensureComplete()
  }

  ctx.effect(() => ctx.sessions.list.subscribe(() => {
    const target = panel.getSnapshot()
    if (target === null) return
    const state = ctx.sessions.list.getSnapshot()
    if ((state.current ?? target.sessionId) !== target.sessionId || state.byId[target.sessionId] === undefined) closePanel()
  }), 'aezy-inspector: close panel on Session identity change')

  ctx.effect(() => () => {
    panel.close()
    unmountPanel()
    for (const trace of traces.values()) trace.dispose()
    traces.clear()
  }, 'aezy-inspector: dispose')

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions', id: 'aezy-loop-inspector', order: 30,
    inject: (sessionId: string) => ({
      hooks: { loopTrace: traceFor(sessionId) },
      openInspector,
    }),
  }, InspectorHeaderAction))
}

export default { inject, apply }
