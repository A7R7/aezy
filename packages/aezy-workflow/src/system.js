import { publishLoopDefinition } from './definition.js'

const budgets = Object.freeze({
  maxIterations: 64,
  maxWallTimeMs: 3_600_000,
  maxTokens: 250_000,
  maxToolCalls: 256,
})

export const CODEX_INSPIRED_DEFINITION = Object.freeze({
  schemaVersion: 1,
  id: 'codex-inspired',
  revision: 1,
  name: 'Codex Inspired',
  description: 'A bounded evidence-driven coding workflow compiled onto the DSH-native Agent runtime.',
  backend: {
    id: 'dsh-native',
    capabilities: [
      'agent-pre-step',
      'agent-request',
      'agent-turn-stopping',
      'llm-stream-fence',
      'system-prompt',
      'tool-pre-execute',
      'provider-retry',
      'structured-tools',
      'approval',
      'security',
      'journal',
      'usage',
      'cancel',
      'compaction',
      'subagent',
      'durable-definition-binding',
    ],
  },
  compiler: { target: 'dsh-agent-hooks', version: 1 },
  budgets,
  nodes: [
    { id: 'bind-task', type: 'agent-phase', label: 'Bind Session and task boundaries', requires: ['agent-pre-step', 'system-prompt', 'durable-definition-binding'] },
    { id: 'investigate', type: 'agent-phase', label: 'Inspect repository and runtime facts', requires: ['structured-tools', 'tool-pre-execute'] },
    { id: 'plan', type: 'agent-phase', label: 'Choose and maintain a proportionate plan', requires: ['agent-request'] },
    { id: 'implement', type: 'agent-phase', label: 'Implement the smallest coherent change', requires: ['structured-tools', 'tool-pre-execute', 'approval', 'security'] },
    { id: 'verify', type: 'tool-phase', label: 'Run proportionate verification', requires: ['structured-tools', 'tool-pre-execute', 'approval', 'security'] },
    { id: 'review', type: 'agent-phase', label: 'Inspect diff, Journal, and remaining risk', requires: ['journal', 'usage'] },
    { id: 'completion-check', type: 'condition', label: 'Evaluate evidence-backed completion', requires: ['agent-turn-stopping'] },
    { id: 'recovery', type: 'bounded-retry', label: 'Bound recovery and replanning', requires: ['provider-retry', 'cancel'], config: budgets },
    { id: 'checkpoint', type: 'checkpoint/compaction', label: 'Checkpoint or compact durable context', requires: ['journal', 'usage', 'compaction'] },
    { id: 'finalize', type: 'finalize', label: 'Finalize the DSH Turn', requires: ['agent-turn-stopping', 'cancel'] },
  ],
  edges: [
    { from: 'bind-task', to: 'investigate', outcome: 'bound' },
    { from: 'investigate', to: 'plan', outcome: 'grounded' },
    { from: 'plan', to: 'implement', outcome: 'ready' },
    { from: 'implement', to: 'verify', outcome: 'changed' },
    { from: 'verify', to: 'review', outcome: 'settled' },
    { from: 'review', to: 'completion-check', outcome: 'evidence-ready' },
    { from: 'completion-check', to: 'checkpoint', outcome: 'complete' },
    { from: 'completion-check', to: 'recovery', outcome: 'incomplete' },
    { from: 'recovery', to: 'investigate', outcome: 'retry' },
    { from: 'recovery', to: 'finalize', outcome: 'exhausted' },
    { from: 'checkpoint', to: 'finalize', outcome: 'settled' },
  ],
})

export const CODEX_INSPIRED_LOOP = publishLoopDefinition(CODEX_INSPIRED_DEFINITION, 'system')
export const CODEX_INSPIRED_PRESET_ID = `codex-inspired-r${String(CODEX_INSPIRED_LOOP.revision)}-${CODEX_INSPIRED_LOOP.digest}`

export const CODEX_INSPIRED_CAPABILITIES = Object.freeze({
  backend: 'dsh-native',
  capabilities: Object.freeze(Object.fromEntries(
    CODEX_INSPIRED_DEFINITION.backend.capabilities.map(capability => [capability, true]),
  )),
})
