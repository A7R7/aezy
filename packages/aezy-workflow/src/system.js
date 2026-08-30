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
