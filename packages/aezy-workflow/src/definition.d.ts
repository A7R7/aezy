export type LoopNodeType = 'agent-phase' | 'tool-phase' | 'approval' | 'condition' |
  'bounded-retry' | 'parallel' | 'subagent' | 'checkpoint/compaction' | 'finalize'
export type DefinitionTrust = 'system' | 'template' | 'untrusted'

export interface LoopBudgets {
  readonly maxIterations: number
  readonly maxWallTimeMs: number
  readonly maxTokens: number
  readonly maxToolCalls: number
}

export interface LoopNode {
  readonly id: string
  readonly type: LoopNodeType
  readonly label: string
  readonly requires?: readonly string[]
  readonly config?: Readonly<Record<string, unknown>>
}

export interface LoopEdge {
  readonly from: string
  readonly to: string
  readonly outcome: 'success' | 'failure' | 'always' | 'true' | 'false'
}

export interface LoopDefinition {
  readonly schemaVersion: 1
  readonly id: string
  readonly revision: number
  readonly name: string
  readonly description: string
  readonly backend: { readonly id: string; readonly capabilities: readonly string[] }
  readonly compiler: { readonly target: 'dsh-agent-preset'; readonly version: 1 }
  readonly budgets: LoopBudgets
  readonly nodes: readonly LoopNode[]
  readonly edges: readonly LoopEdge[]
}

export interface PublishedLoopDefinition {
  readonly body: LoopDefinition
  readonly revision: number
  readonly digest: string
  readonly trust: DefinitionTrust
}

export interface DefinitionViolation { readonly path: string; readonly code: string; readonly message: string }
export type DefinitionValidation = { readonly ok: true; readonly errors: readonly [] } |
  { readonly ok: false; readonly errors: readonly DefinitionViolation[] }
export interface CapabilityInventory { readonly backend: string; readonly capabilities: Readonly<Record<string, boolean>> }
export interface CapabilityResolution {
  readonly ok: boolean
  readonly definition: { readonly id: string; readonly revision: number; readonly digest: string }
  readonly backend: string
  readonly compiler: { readonly target: string; readonly version: number }
  readonly missing: readonly string[]
  readonly executable: false
  readonly reason: 'capability-missing' | 'compiler-not-implemented'
}

export declare const LOOP_DEFINITION_SCHEMA_VERSION: 1
export declare const LOOP_COMPILER_TARGET: 'dsh-agent-preset'
export declare const LOOP_COMPILER_VERSION: 1
export declare const LOOP_NODE_TYPES: readonly LoopNodeType[]
export declare const E3_NODE_TYPES: readonly LoopNodeType[]
export declare function validateLoopDefinition(input: unknown): DefinitionValidation
export declare function loopDefinitionDigest(definition: LoopDefinition): string
export declare function publishLoopDefinition(definition: LoopDefinition, trust?: DefinitionTrust): PublishedLoopDefinition
export declare class LoopDefinitionRegistry {
  publish(definition: LoopDefinition, trust?: DefinitionTrust): PublishedLoopDefinition
  get(id: string, revision: number): PublishedLoopDefinition | undefined
  list(): PublishedLoopDefinition[]
}
export declare function resolveLoopCapabilities(
  published: PublishedLoopDefinition,
  inventory: CapabilityInventory,
  options?: { readonly stage?: 'E1' | 'E2' | 'E3' },
): CapabilityResolution
export declare function assertLoopExecutable(resolution: CapabilityResolution): CapabilityResolution
export declare class LoopDefinitionError extends Error {
  readonly code: string
  readonly violations: readonly DefinitionViolation[]
}
