import { useEffect, useState } from 'react'
import { Button, IconChevronDownOutline14, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Context } from '@deepseek-ai/cordis'
import { compatibleSelection, engineForPreset, engineForProvider, modelIdentity, resolveModelDirectory } from '../model-routing.js'
import { installRunMethodMenu } from './run-method.js'
export { installRunMethodMenu } from './run-method.js'

export const CODEX_APP_SERVER_PRESET = 'codex-app-server'
export const CODEX_PROVIDER = 'aezy-codex'

type Selection = { provider: string; model: string; reasoningEffort?: string }
type Model = { id: string; name: string; description?: string; route?: Selection | null; channel?: string; unavailableReason?: string | null; reasoning?: { efforts: Array<{ id: string; name: string }>; defaultEffort?: string } }
const defaultEffort = (model: Model) => model.reasoning?.defaultEffort ?? model.reasoning?.efforts[0]?.id
type Group = { id: string; name: string; models: Model[] }
type Catalog = { default: Selection; routableProviders: string[]; groups: Group[]; failures: Array<{ id: string; name: string; message: string }> }
type RemoteResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } }
type SessionRemote = {
  modelCatalog(): Promise<RemoteResult<Catalog>>
  selectModel(input: Selection & { sessionId: string }): Promise<RemoteResult<{ selected: Selection }>>
}
type DirectoryState = {
  preset: string | null
  current: Selection | null
  groups: Group[]
  status: 'idle' | 'loading' | 'ready' | 'selecting' | 'error'
  error: string | null
}

type ObservableSnapshot<T> = {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}
type SnapshotStore<T> = ObservableSnapshot<T> & {
  set(value: T): void
  update(update: (value: T) => void): void
}

function createSnapshotStore<T extends object>(initial: T): SnapshotStore<T> {
  let snapshot = initial
  const listeners = new Set<() => void>()
  const publish = (value: T): void => {
    snapshot = value
    for (const listener of listeners) listener()
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set: publish,
    update: (update) => {
      const next = { ...snapshot }
      update(next)
      publish(next)
    },
  }
}

function projection<T>(face: ObservableSnapshot<unknown>): T | undefined {
  return face.getSnapshot() as T | undefined
}

export class ModeModelDirectory {
  readonly store: SnapshotStore<DirectoryState> = createSnapshotStore({
    preset: null, current: null, groups: [], status: 'idle', error: null,
  })
  private catalog: Catalog | null = null
  private disposed = false
  private selecting = false
  private loadRevision = 0
  private acknowledged: { base: string; selected: Selection } | null = null
  private readonly stops: Array<() => void>

  constructor(
    private readonly remote: SessionRemote,
    private readonly sessionId: string,
    private readonly presetProjection: ObservableSnapshot<unknown>,
    private readonly modelProjection: ObservableSnapshot<unknown>,
  ) {
    this.stops = [
      presetProjection.subscribe(() => { this.sync(); void this.reconcile() }),
      modelProjection.subscribe(() => { this.sync(); void this.reconcile() }),
    ]
    this.sync()
  }

  async load(): Promise<void> {
    if (this.disposed) return
    const revision = ++this.loadRevision
    this.store.update(state => { state.status = 'loading'; state.error = null })
    try {
      const result = await this.remote.modelCatalog()
      if (this.disposed || revision !== this.loadRevision) return
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.catalog = result.value
      this.sync()
      await this.reconcile()
    } catch (error) {
      if (revision === this.loadRevision) this.reportError(error)
    }
  }

  private reportError(error: unknown): void {
    if (this.disposed) return
    this.store.update(state => { state.status = 'error'; state.error = error instanceof Error ? error.message : String(error) })
  }

  async select(selection: Selection): Promise<void> {
    if (this.disposed) return
    if (this.selecting) throw new Error('Model selection is already in progress')
    const preset = projection<string | null>(this.presetProjection) ?? null
    try {
      const row = this.store.getSnapshot().groups.flatMap(group => group.models).find(model =>
        model.id === modelIdentity(selection.provider, selection.model))
      if (engineForProvider(selection.provider) !== engineForPreset(preset, this.store.getSnapshot().current)
        || row?.route?.provider !== selection.provider || row?.route?.model !== selection.model) {
        throw new Error('This model has no compatible channel for the selected run method; no fallback was used')
      }
      this.selecting = true
      const base = JSON.stringify(projection<{ next: Selection | null }>(this.modelProjection)?.next ?? null)
      this.store.update(state => { state.status = 'selecting'; state.error = null })
      const result = await this.remote.selectModel({ sessionId: this.sessionId, ...selection })
      if (this.disposed) return
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.acknowledged = { base, selected: result.value.selected }
      this.store.update(state => { state.current = result.value.selected; state.status = 'ready'; state.error = null })
    } catch (error) {
      this.reportError(error)
      throw error
    } finally {
      this.selecting = false
      if (preset !== (projection<string | null>(this.presetProjection) ?? null)) {
        this.sync()
        void this.reconcile()
      }
    }
  }

  dispose(): void {
    this.disposed = true
    for (const stop of this.stops) stop()
  }

  private sync(): void {
    if (this.disposed) return
    const preset = projection<string | null>(this.presetProjection) ?? null
    const projected = projection<{ next: Selection | null }>(this.modelProjection)
    const wire = JSON.stringify(projected?.next ?? null)
    if (this.acknowledged && wire !== this.acknowledged.base) this.acknowledged = null
    const current = this.acknowledged?.selected ?? projected?.next ?? this.catalog?.default ?? null
    const groups = this.catalog ? resolveModelDirectory(this.catalog, preset, current) : []
    const selectedRow = groups.flatMap(group => group.models).find(model => current && model.id === modelIdentity(current.provider, current.model))
    this.store.set({
      preset,
      current,
      groups,
      status: this.selecting ? 'selecting' : this.catalog === null ? 'idle' : 'ready',
      error: selectedRow?.unavailableReason ?? null,
    })
  }

  private async reconcile(): Promise<void> {
    const state = this.store.getSnapshot()
    if (this.disposed || this.selecting || !state.current) return
    const model = state.groups.flatMap(group => group.models).find(model => model.id === modelIdentity(state.current!.provider, state.current!.model))
    if (!model?.route || (model.route.provider === state.current.provider && model.route.model === state.current.model)) return
    try {
      await this.select(compatibleSelection(model, state.current))
    } catch (error) { this.reportError(error) }
  }
}

type Injected = {
  hooks: { modeModels: SnapshotStore<DirectoryState> }
  load(): void
  select(selection: Selection): Promise<void>
}
type ComponentProps = Injected & {
  useModeModels<T>(selector: (state: DirectoryState) => T): T
}

export function ModeModelSelect({ useModeModels, load, select }: ComponentProps) {
  const state = useModeModels(value => value)
  const [open, setOpen] = useState<'model' | 'effort' | null>(null)
  useEffect(() => { load() }, [load])
  useEffect(() => { setOpen(null) }, [state.preset])
  const entries = state.groups.flatMap(group => group.models.map(model => ({ group, model })))
  const selectedIndex = entries.findIndex(({ model }) => (
    state.current && modelIdentity(state.current.provider, state.current.model) === model.id
  ))
  const current = selectedIndex < 0 ? undefined : entries[selectedIndex]
  const efforts = current?.model.reasoning?.efforts ?? []
  const busy = state.status === 'loading' || state.status === 'selecting'
  // Errors are published by the directory; never leave a rejected UI promise.
  const choose = (selection: Selection) => { setOpen(null); void select(selection).catch(() => {}) }
  const items: MenuEntry[] = state.groups.flatMap(group => [
    { type: 'label' as const, id: `group:${group.id}`, text: group.name },
    ...group.models.map(model => ({ id: model.id, disabled: !model.route,
      label: <span>{model.name}{model.unavailableReason && <small style={{ display: 'block', maxWidth: 300, whiteSpace: 'normal' }}>{model.unavailableReason}</small>}</span> })),
  ])
  const effort = state.current?.reasoningEffort ?? (current && defaultEffort(current.model))
  return <span data-aezy-mode-model style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
    <Menu open={open === 'model'} portal side="top" align="end" compact
      anchor={<Button variant="toolbar" size="sm" aria-label="Model" aria-haspopup="menu"
        aria-expanded={open === 'model'} disabled={busy}
        title={current ? `${current.model.name} · ${current.model.channel}` : 'Select model'}
        onClick={() => setOpen(open === 'model' ? null : 'model')}>
        <span style={{ maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {busy ? 'Loading…' : current?.model.name ?? 'Select model'}
        </span><span aria-hidden="true" style={{ display: 'inline-flex', flexShrink: 0 }}><IconChevronDownOutline14 /></span>
      </Button>}
      items={items.length ? items : [{ type: 'label', id: 'empty', text: 'No models available' }]}
      footer={[{ id: 'refresh', label: 'Refresh models' }]}
      selectedId={current?.model.id}
      onClose={() => setOpen(null)}
      onSelect={id => {
        if (id === 'refresh') { setOpen(null); load(); return }
        const entry = entries.find(({ model }) => model.id === id)
        if (!entry?.model.route) return
        choose(compatibleSelection(entry.model, state.current))
      }}
    />
    {efforts.length > 0 && <Menu open={open === 'effort'} portal side="top" align="end" compact
      anchor={<Button variant="toolbar" size="sm" aria-label="Reasoning effort" aria-haspopup="menu"
        aria-expanded={open === 'effort'} disabled={busy}
        onClick={() => setOpen(open === 'effort' ? null : 'effort')}>
        {efforts.find(item => item.id === effort)?.name ?? 'Reasoning'}<span aria-hidden="true" style={{ display: 'inline-flex', flexShrink: 0 }}><IconChevronDownOutline14 /></span>
      </Button>}
      items={efforts.map(item => ({ id: item.id, label: item.name }))} selectedId={effort}
      onClose={() => setOpen(null)} onSelect={id => {
        if (!current?.model.route) return
        choose({ ...current.model.route, reasoningEffort: id })
      }}
    />}
    {state.error && <span role="alert" style={{ color: 'var(--dsw-alias-state-error-primary, #d84848)', fontSize: 12, maxWidth: 280 }}>{state.error}</span>}
  </span>
}

export const inject = ['commandUi', 'remote', 'remote.session', 'sessions', 'slots']

export function apply(ctx: Context): void {
  installRunMethodMenu(ctx)
  const directories = new Map<string, ModeModelDirectory>()
  const directoryFor = (sessionId: string): ModeModelDirectory => {
    const existing = directories.get(sessionId)
    if (existing !== undefined) return existing
    const scope = ctx.sessions.scope(sessionId)
    const binding = ctx.sessions.binding(sessionId)
    if (scope === undefined || binding === undefined) throw new Error(`Aezy mode has no Session binding for ${sessionId}`)
    const directory = new ModeModelDirectory(
      ctx.remote.session,
      sessionId,
      binding.session.projections.faceOf('agentPreset'),
      binding.session.projections.faceOf('modelSelection'),
    )
    directories.set(sessionId, directory)
    scope.effect(() => () => { directory.dispose(); directories.delete(sessionId) }, 'aezy-mode: model directory')
    return directory
  }

  ctx.effect(() => ctx.commandUi.register({
    name: 'model',
    description: 'Choose a model through a compatible execution channel',
    available: session => ctx.sessions.subagentAddress(session.sessionId) === undefined,
    ui: {
      kind: 'popupSelect',
      options: async (session) => {
        const directory = directoryFor(String(session.sessionId))
        await directory.load()
        return directory.store.getSnapshot().groups.flatMap(group => group.models.map(model => ({
          id: model.id,
          label: model.name,
          detail: model.channel ?? group.name,
          active: Boolean(directory.store.getSnapshot().current && modelIdentity(directory.store.getSnapshot().current!.provider,
            directory.store.getSnapshot().current!.model) === model.id),
        })))
      },
      onSelect: async (option, session) => {
        const directory = directoryFor(String(session.sessionId))
        const entry = directory.store.getSnapshot().groups.flatMap(group => group.models).find(item => item.id === option.id)
        if (!entry) throw new Error('stale model option')
        await directory.select(compatibleSelection(entry, directory.store.getSnapshot().current))
      },
    },
  }), 'aezy-mode: /model projection')

  ctx.slots.inject('conversation.input.model', () => ctx.slots.register({
    name: 'conversation.input.model',
    id: 'aezy-mode-model',
    inject: (sessionId: string): Injected => {
      const directory = directoryFor(String(sessionId))
      return {
        hooks: { modeModels: directory.store },
        load: () => { void directory.load() },
        select: selection => directory.select(selection),
      }
    },
  }, ModeModelSelect))
}
