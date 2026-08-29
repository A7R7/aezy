import { publishLoopDefinition } from './definition.js'

export const CODEX_INSPIRED_DEFINITION = publishLoopDefinition({
  schemaVersion: 1,
  id: 'codex-inspired',
  revision: 1,
  name: 'Codex Inspired',
  description: 'System-authored coding workflow whose micro-loop remains owned by DSH.',
  backend: {
    id: 'dsh-native',
    capabilities: [
      'structured-tools', 'approval', 'security', 'journal', 'provider-usage',
      'cancel', 'compaction', 'subagent', 'restart',
    ],
  },
  compiler: { target: 'dsh-agent-preset', version: 1 },
  budgets: {
    maxIterations: 24,
    maxWallTimeMs: 3_600_000,
    maxTokens: 200_000,
    maxToolCalls: 160,
  },
  nodes: [
    { id: 'orient', type: 'agent-phase', label: 'Orient' },
    { id: 'implement', type: 'agent-phase', label: 'Implement' },
    { id: 'verify', type: 'agent-phase', label: 'Verify' },
    { id: 'checkpoint', type: 'checkpoint/compaction', label: 'Checkpoint' },
    { id: 'finalize', type: 'finalize', label: 'Finalize' },
  ],
  edges: [
    { from: 'orient', to: 'implement', outcome: 'success' },
    { from: 'implement', to: 'verify', outcome: 'success' },
    { from: 'verify', to: 'checkpoint', outcome: 'success' },
    { from: 'checkpoint', to: 'finalize', outcome: 'success' },
  ],
}, 'system')

export const BOUNDED_REVIEW_TEMPLATE = publishLoopDefinition({
  schemaVersion: 1,
  id: 'bounded-review',
  revision: 1,
  name: 'Bounded Parallel Review',
  description: 'Template-only bounded review workflow; no runtime compiler is installed.',
  backend: {
    id: 'dsh-native',
    capabilities: [
      'structured-tools', 'approval', 'security', 'journal', 'provider-usage', 'cancel',
      'compaction', 'subagent', 'restart', 'structured-facts', 'parallel', 'bounded-retry',
    ],
  },
  compiler: { target: 'dsh-agent-preset', version: 1 },
  budgets: { maxIterations: 8, maxWallTimeMs: 1_800_000, maxTokens: 120_000, maxToolCalls: 96 },
  nodes: [
    { id: 'orient', type: 'agent-phase', label: 'Orient' },
    { id: 'fanout', type: 'parallel', label: 'Parallel review', requires: ['parallel'], config: { join: 'all-settled', maxConcurrency: 3, cancelRemaining: true, failurePolicy: 'collect' } },
    { id: 'delegation', type: 'subagent', label: 'Review agents', requires: ['subagent'], config: { maxChildren: 3, cancelWithParent: true, failurePolicy: 'continue' } },
    { id: 'assess', type: 'condition', label: 'Assess review', requires: ['structured-facts'], config: { fact: 'review-passed', operator: 'equals', value: true } },
    { id: 'retry', type: 'bounded-retry', label: 'Bounded retry', requires: ['bounded-retry'], config: { maxIterations: 3, maxWallTimeMs: 600_000, maxTokens: 40_000, maxToolCalls: 32 } },
    { id: 'checkpoint', type: 'checkpoint/compaction', label: 'Checkpoint' },
    { id: 'finalize', type: 'finalize', label: 'Finalize' },
  ],
  edges: [
    { from: 'orient', to: 'fanout', outcome: 'success' },
    { from: 'fanout', to: 'delegation', outcome: 'success' },
    { from: 'delegation', to: 'assess', outcome: 'success' },
    { from: 'assess', to: 'checkpoint', outcome: 'true' },
    { from: 'assess', to: 'retry', outcome: 'false' },
    { from: 'retry', to: 'fanout', outcome: 'failure' },
    { from: 'retry', to: 'checkpoint', outcome: 'success' },
    { from: 'checkpoint', to: 'finalize', outcome: 'success' },
  ],
}, 'template')
