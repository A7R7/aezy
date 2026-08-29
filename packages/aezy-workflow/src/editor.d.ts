import type { CapabilityResolution, LoopBudgets, PublishedLoopDefinition } from './definition.js'
export interface WorkflowDraft { id: string; name: string; description: string; budgets: LoopBudgets }
export interface WorkflowTemplateView {
  id: string; name: string; description: string; digest: string
  backend: { id: string; capabilities: string[] }
  budgets: LoopBudgets
  nodes: Array<{ id: string; type: string; label: string; config?: Record<string, unknown> }>
}
export declare function templateView(template: PublishedLoopDefinition): WorkflowTemplateView
export declare function materializeTemplate(templateId: string, draft: WorkflowDraft, revision: number): import('./definition.js').LoopDefinition
export declare class WorkflowDefinitionStore {
  readonly file: string
  constructor(file: string)
  snapshot(): { version: 1; executionAvailable: false; templates: WorkflowTemplateView[]; revisions: PublishedLoopDefinition[] }
  preview(input: { templateId: string; draft: WorkflowDraft }): { published: PublishedLoopDefinition; resolution: CapabilityResolution; expectedRevision: number }
  publish(input: { templateId: string; draft: WorkflowDraft; expectedRevision: number }): Promise<{ revision: PublishedLoopDefinition; resolution: CapabilityResolution; snapshot: ReturnType<WorkflowDefinitionStore['snapshot']> }>
}
