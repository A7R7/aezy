export * from './definition.js'
export * from './system.js'
export * from './editor.js'
export declare const name: '@aezy/workflow'
export declare const inject: readonly ['webServer']
export declare function createWorkflowHandler(store: import('./editor.js').WorkflowDefinitionStore): (req: unknown, res: unknown) => Promise<void>
export declare function apply(ctx: unknown, config?: { file?: string }): void
