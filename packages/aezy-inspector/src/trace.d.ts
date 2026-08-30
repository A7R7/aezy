export type EvidenceClass = 'authoritative' | 'derived' | 'inferred'
export type SpanStatus = 'pending' | 'active' | 'completed' | 'failed' |
  'cancelled' | 'interrupted' | 'unknown'
export type TraceCompleteness = 'complete' | 'partial' | 'unavailable'

export interface SourceRef {
  readonly source: 'dsh-session' | 'codex-app-server'
  readonly backend: string
  readonly sessionId: string
  readonly eventType: string
  readonly seq?: number
  readonly time?: number
  readonly threadId?: string
  readonly turnId?: string
  readonly itemId?: string
  readonly itemType?: string
}

export interface TraceFact<T> {
  readonly value: T
  readonly evidence: EvidenceClass
  readonly sources: readonly SourceRef[]
}

export interface TraceUsage {
  readonly inputTokens?: number
  readonly cacheReadTokens?: number
  readonly cacheWriteTokens?: number
  readonly outputTokens?: number
  readonly totalTokens?: number
}

export interface Span {
  readonly spanId: string
  readonly parentSpanId?: string
  readonly parentEvidence?: EvidenceClass
  readonly blueprintNodeId?: string
  readonly kind: 'session' | 'turn' | 'agent-phase' | 'model' | 'tool' |
    'approval' | 'subagent' | 'compaction' | 'retry' | 'finalize'
  readonly label: string
  readonly status: TraceFact<SpanStatus>
  readonly startedAt?: TraceFact<number>
  readonly endedAt?: TraceFact<number>
  readonly durationMs?: TraceFact<number>
  readonly usage?: TraceFact<TraceUsage>
  readonly sources: readonly SourceRef[]
  readonly safeFacts?: Readonly<Record<string, TraceFact<string | number | boolean | null>>>
}

export type BlueprintNodeKind = 'boundary' | 'phase' | 'decision' | 'model' |
  'retry' | 'tool' | 'approval' | 'subagent' | 'compaction' | 'cancel' | 'finalize' | 'opaque'
export type BlueprintEdgeKind = 'normal' | 'branch' | 'loop-back' | 'retry' | 'cancel'

export interface BlueprintSourceRef {
  readonly authority: 'upstream-source' | 'public-protocol' | 'adapter-source'
  readonly owner: string
  readonly symbol: string
  readonly revision: string
  readonly path: string
}

export interface BlueprintRuntimeBinding {
  readonly spanNodeIds: readonly string[]
  readonly statuses?: readonly SpanStatus[]
}

export interface BlueprintNode {
  readonly id: string
  readonly laneId: string
  readonly kind: BlueprintNodeKind
  readonly label: string
  readonly owner: string
  readonly description: string
  readonly position: Readonly<{ x: number; y: number }>
  readonly sourceRefs: readonly BlueprintSourceRef[]
  readonly runtime?: BlueprintRuntimeBinding
  readonly opaque?: true
}

export interface BlueprintLane {
  readonly id: string
  readonly label: string
  readonly owner: string
  readonly bounds: Readonly<{ x: number; y: number; width: number; height: number }>
  readonly sourceRefs: readonly BlueprintSourceRef[]
}

export interface BlueprintEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly kind: BlueprintEdgeKind
  readonly label: string
  readonly guard: string
  readonly sourceRefs: readonly BlueprintSourceRef[]
}

export interface LoopBlueprint {
  readonly id: string
  readonly revision: number
  readonly title: string
  readonly description: string
  readonly canvas: Readonly<{ width: number; height: number; nodeWidth: number; nodeHeight: number }>
  readonly lanes: readonly BlueprintLane[]
  readonly nodes: readonly BlueprintNode[]
  readonly edges: readonly BlueprintEdge[]
  readonly digest: string
}

export interface TraceDiagnostic {
  readonly code: string
  readonly message: string
  readonly sources?: readonly SourceRef[]
}

export interface LoopTrace {
  readonly schemaVersion: number
  readonly traceId: string
  readonly sessionId: string
  readonly backend: string
  readonly mode: string | null
  readonly blueprint: LoopBlueprint
  readonly throughSeq: number
  readonly completeness: TraceCompleteness
  readonly spans: readonly Span[]
  readonly activeSpanIds: readonly string[]
  readonly currentSpanId: string | null
  readonly diagnostics: readonly TraceDiagnostic[]
}

export interface SessionEventLikeEntry {
  readonly type?: string
  readonly event?: unknown
  readonly [key: string]: unknown
}

export interface LoopTraceInput {
  readonly sessionId?: unknown
  readonly mode?: unknown
  readonly entries?: readonly SessionEventLikeEntry[]
  readonly hasMore?: boolean
  readonly running?: boolean
}

export interface BlueprintNodeOverlay {
  readonly nodeId: string
  readonly visited: boolean
  readonly active: boolean
  readonly visits: number
  readonly status: SpanStatus
  readonly durationMs: number
  readonly activeSince?: number
  readonly usage?: TraceUsage
  readonly sources: readonly SourceRef[]
  readonly evidence: 'derived'
}

export interface BlueprintEdgeOverlay {
  readonly edgeId: string
  readonly traversed: boolean
  readonly active: boolean
  readonly traversals: number
  readonly evidence: 'derived'
}

export interface BlueprintOverlay {
  readonly blueprintId: string
  readonly blueprintRevision: number
  readonly nodes: Readonly<Record<string, BlueprintNodeOverlay>>
  readonly edges: Readonly<Record<string, BlueprintEdgeOverlay>>
}

export declare const LOOP_TRACE_SCHEMA_VERSION: 1
export declare const EVIDENCE: Readonly<Record<EvidenceClass, EvidenceClass>>
export declare const LOOP_BLUEPRINTS: Readonly<Record<'dsh-native' | 'codex-app-server', LoopBlueprint>>
export declare function canonicalBlueprint(blueprint: LoopBlueprint): string
export declare function projectBlueprintOverlay(trace: LoopTrace): BlueprintOverlay
export declare function projectLoopTrace(input?: LoopTraceInput): LoopTrace
