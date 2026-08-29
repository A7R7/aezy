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

export interface LoopBlueprint {
  readonly id: string
  readonly revision: number
  readonly nodes: readonly string[]
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

export declare const LOOP_TRACE_SCHEMA_VERSION: 1
export declare const EVIDENCE: Readonly<Record<EvidenceClass, EvidenceClass>>
export declare const LOOP_BLUEPRINTS: Readonly<Record<'dsh-native' | 'codex-app-server', LoopBlueprint>>
export declare function projectLoopTrace(input?: LoopTraceInput): LoopTrace
