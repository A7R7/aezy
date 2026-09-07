import { useEffect, useState } from 'react'
import { Button, IconChevronDownOutline14, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Context } from '@deepseek-ai/cordis'

export const CODEX_APP_SERVER_PRESET = 'codex-app-server'
export const CODEX_PROVIDER = 'aezy-codex'

type Selection = { provider: string; model: string; reasoningEffort?: string }
type Model = { id: string; name: string; description?: string; reasoning?: { efforts: Array<{ id: string; name: string }>; defaultEffort?: string } }
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
  private selectingDefault = false
  private readonly stops: Array<() => void>

  constructor(
    private readonly remote: SessionRemote,
    private readonly sessionId: string,
    private readonly presetProjection: ObservableSnapshot<unknown>,
    private readonly modelProjection: ObservableSnapshot<unknown>,
  ) {
    this.stops = [
      presetProjection.subscribe(() => { this.sync() }),
      modelProjection.subscribe(() => { this.sync() }),
    ]
    this.sync()
  }

  async load(): Promise<void> {
    if (this.disposed) return
    this.store.update(state => { state.status = 'loading'; state.error = null })
    try {
      const result = await this.remote.modelCatalog()
      if (this.disposed) return
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.catalog = result.value
      this.sync()
      await this.ensureCodexDefault()
    } catch (error) {
      this.reportError(error)
    }
  }

  private reportError(error: unknown): void {
    if (this.disposed) return
    this.store.update(state => { state.status = 'error'; state.error = error instanceof Error ? error.message : String(error) })
  }

  async select(selection: Selection): Promise<void> {
    if (this.disposed) return
    try {
      const preset = projection<string | null>(this.presetProjection) ?? null
      const codexMode = preset === CODEX_APP_SERVER_PRESET
      if ((selection.provider === CODEX_PROVIDER) !== codexMode) {
        throw new Error(`provider ${selection.provider} is unavailable in preset ${preset ?? '(none)'}`)
      }
      this.store.update(state => { state.status = 'selecting'; state.error = null })
      const result = await this.remote.selectModel({ sessionId: this.sessionId, ...selection })
      if (this.disposed) return
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      this.store.update(state => { state.current = result.value.selected; state.status = 'ready'; state.error = null })
    } catch (error) {
      this.reportError(error)
      throw error
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
    const codexMode = preset === CODEX_APP_SERVER_PRESET
    const groups = (this.catalog?.groups ?? []).filter(group => (
      (group.id === CODEX_PROVIDER) === codexMode
    ))
    const fallback = this.catalog?.default ?? null
    const selected = projected?.next ?? fallback
    const current = selected !== null && ((selected.provider === CODEX_PROVIDER) === codexMode)
      ? selected
      : null
    this.store.set({
      preset,
      current,
      groups,
      status: this.catalog === null ? 'idle' : 'ready',
      error: null,
    })
  }

  private async ensureCodexDefault(): Promise<void> {
    const state = this.store.getSnapshot()
    if (state.preset !== CODEX_APP_SERVER_PRESET || state.current?.provider === CODEX_PROVIDER) return
    const model = state.groups[0]?.models[0]
    if (model === undefined || this.selectingDefault) return
    this.selectingDefault = true
    try {
      await this.select({
        provider: CODEX_PROVIDER,
        model: model.id,
        ...defaultEffort(model) === undefined ? {} : { reasoningEffort: defaultEffort(model) },
      })
    } finally {
      this.selectingDefault = false
    }
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
  const selectedIndex = entries.findIndex(({ group, model }) => (
    state.current?.provider === group.id && state.current.model === model.id
  ))
  const current = selectedIndex < 0 ? undefined : entries[selectedIndex]
  const efforts = current?.model.reasoning?.efforts ?? []
  const busy = state.status === 'loading' || state.status === 'selecting'
  // Errors are published by the directory; never leave a rejected UI promise.
  const choose = (selection: Selection) => { setOpen(null); void select(selection).catch(() => {}) }
  const items: MenuEntry[] = state.groups.flatMap(group => [
    { type: 'label' as const, id: `group:${group.id}`, text: group.name },
    ...group.models.map(model => ({ id: `${group.id}\u0000${model.id}`, label: model.name })),
  ])
  const effort = state.current?.reasoningEffort ?? (current && defaultEffort(current.model))
  return <span data-aezy-mode-model style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
    <Menu open={open === 'model'} portal side="top" align="end" compact
      anchor={<Button variant="toolbar" size="sm" aria-label="Model" aria-haspopup="menu"
        aria-expanded={open === 'model'} disabled={busy}
        title={current ? `${current.group.name} · ${current.model.name}` : 'Select model'}
        onClick={() => setOpen(open === 'model' ? null : 'model')}>
        <span style={{ maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {busy ? 'Loading…' : current?.model.name ?? 'Select model'}
        </span><span aria-hidden="true" style={{ display: 'inline-flex', flexShrink: 0 }}><IconChevronDownOutline14 /></span>
      </Button>}
      items={items.length ? items : [{ type: 'label', id: 'empty', text: 'No models available' }]}
      footer={[{ id: 'refresh', label: 'Refresh models' }]}
      selectedId={current ? `${current.group.id}\u0000${current.model.id}` : undefined}
      onClose={() => setOpen(null)}
      onSelect={id => {
        if (id === 'refresh') { setOpen(null); load(); return }
        const entry = entries.find(({ group, model }) => `${group.id}\u0000${model.id}` === id)
        if (entry === undefined) return
        choose({
          provider: entry.group.id,
          model: entry.model.id,
          ...defaultEffort(entry.model) === undefined ? {} : { reasoningEffort: defaultEffort(entry.model) },
        })
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
        if (current === undefined) return
        choose({ provider: current.group.id, model: current.model.id, reasoningEffort: id })
      }}
    />}
    {state.error && <span role="alert" style={{ color: 'var(--dsw-alias-state-error-primary, #d84848)', fontSize: 12, maxWidth: 280 }}>{state.error}</span>}
  </span>
}

export const inject = ['commandUi', 'remote', 'remote.session', 'sessions', 'slots']

export function apply(ctx: Context): void {
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
    description: 'Choose a model allowed by this Session mode',
    available: session => ctx.sessions.subagentAddress(session.sessionId) === undefined,
    ui: {
      kind: 'popupSelect',
      options: async (session) => {
        const directory = directoryFor(String(session.sessionId))
        await directory.load()
        return directory.store.getSnapshot().groups.flatMap(group => group.models.map(model => ({
          id: `${group.id}\u0000${model.id}`,
          label: model.name,
          detail: group.name,
          active: directory.store.getSnapshot().current?.provider === group.id
            && directory.store.getSnapshot().current?.model === model.id,
        })))
      },
      onSelect: async (option, session) => {
        const directory = directoryFor(String(session.sessionId))
        const [provider, model] = option.id.split('\u0000', 2)
        if (provider === undefined || model === undefined) throw new Error('stale model option')
        const entry = directory.store.getSnapshot().groups.find(group => group.id === provider)?.models.find(item => item.id === model)
        if (!entry) throw new Error('stale model option')
        await directory.select({ provider, model, ...defaultEffort(entry) === undefined ? {} : { reasoningEffort: defaultEffort(entry) } })
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
