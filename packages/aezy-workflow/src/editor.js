import { randomUUID } from 'node:crypto'
import { chmod, mkdir, rename, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  LoopDefinitionRegistry,
  publishLoopDefinition,
  resolveLoopCapabilities,
} from './definition.js'
import { CODEX_INSPIRED_DEFINITION } from './system.js'

const MAX_REVISIONS = 128
const DRAFT_KEYS = new Set(['id', 'name', 'description', 'budgets'])
const TEMPLATES = new Map([[CODEX_INSPIRED_DEFINITION.body.id, CODEX_INSPIRED_DEFINITION]])

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertDraft(draft) {
  if (!isRecord(draft)) throw new Error('draft must be an object')
  for (const key of Object.keys(draft)) if (!DRAFT_KEYS.has(key)) throw new Error(`draft field ${key} is not editable in E2`)
  if (!isRecord(draft.budgets)) throw new Error('draft budgets are required')
}

function inventoryFor(template) {
  return {
    backend: template.body.backend.id,
    capabilities: Object.fromEntries([
      ...template.body.backend.capabilities.map(capability => [capability, true]),
      ['durable-definition-binding', false],
    ]),
  }
}

export function templateView(template) {
  return {
    id: template.body.id,
    name: template.body.name,
    description: template.body.description,
    digest: template.digest,
    backend: structuredClone(template.body.backend),
    budgets: structuredClone(template.body.budgets),
    nodes: template.body.nodes.map(node => ({ id: node.id, type: node.type, label: node.label })),
  }
}

export function materializeTemplate(templateId, draft, revision) {
  const template = TEMPLATES.get(templateId)
  if (template === undefined) throw new Error('unknown workflow template')
  assertDraft(draft)
  if (draft.id === template.body.id) throw new Error('system definition id is reserved')
  return {
    ...structuredClone(template.body),
    id: draft.id,
    revision,
    name: draft.name,
    description: draft.description,
    budgets: structuredClone(draft.budgets),
  }
}

function loadState(file) {
  if (!existsSync(file)) return []
  const value = JSON.parse(readFileSync(file, 'utf8'))
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.revisions)
    || value.revisions.length > MAX_REVISIONS) throw new Error('unsupported Aezy workflow definition store')
  const registry = new LoopDefinitionRegistry()
  for (const item of value.revisions) {
    if (!isRecord(item) || item.trust !== 'template') throw new Error('unsupported Aezy workflow revision')
    const published = registry.publish(item.body, 'template')
    if (published.digest !== item.digest || published.revision !== item.revision) throw new Error('workflow revision digest mismatch')
  }
  return registry.list()
}

export class WorkflowDefinitionStore {
  #revisions
  #tail = Promise.resolve()

  constructor(file) {
    this.file = resolve(file)
    this.#revisions = loadState(this.file)
  }

  snapshot() {
    return {
      version: 1,
      executionAvailable: false,
      templates: [...TEMPLATES.values()].map(templateView),
      revisions: structuredClone(this.#revisions),
    }
  }

  preview({ templateId, draft }) {
    const latest = this.#revisions.filter(item => item.body.id === draft?.id)
      .reduce((revision, item) => Math.max(revision, item.revision), 0)
    const definition = materializeTemplate(templateId, draft, latest + 1)
    const published = publishLoopDefinition(definition, 'template')
    const resolution = resolveLoopCapabilities(published, inventoryFor(TEMPLATES.get(templateId)), { stage: 'E2' })
    return { published, resolution, expectedRevision: latest }
  }

  publish({ templateId, draft, expectedRevision }) {
    return this.#enqueue(async () => {
      const preview = this.preview({ templateId, draft })
      if (expectedRevision !== preview.expectedRevision) throw new Error('workflow revision changed; refresh before publishing')
      if (this.#revisions.length >= MAX_REVISIONS) throw new Error(`workflow revision limit reached (${String(MAX_REVISIONS)})`)
      this.#revisions = [...this.#revisions, preview.published]
      await this.#write()
      return { revision: preview.published, resolution: preview.resolution, snapshot: this.snapshot() }
    })
  }

  #enqueue(operation) {
    const next = this.#tail.then(operation)
    this.#tail = next.catch(() => {})
    return next
  }

  async #write() {
    const directory = dirname(this.file)
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const temporary = resolve(directory, `.workflow-${process.pid}-${randomUUID()}.tmp`)
    await writeFile(temporary, `${JSON.stringify({ version: 1, revisions: this.#revisions }, null, 2)}\n`, { mode: 0o600 })
    await rename(temporary, this.file)
    await Promise.all([chmod(directory, 0o700), chmod(this.file, 0o600)])
  }
}
