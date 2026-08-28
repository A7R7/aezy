import { useEffect } from 'react'
import type { Context } from '@deepseek-ai/cordis'

export const CODEX_APP_SERVER_PRESET = 'codex-app-server'
export const CODEX_PROVIDER = 'aezy-codex'

type Selection = { provider: string; model: string; reasoningEffort?: string }
type Model = { id: string; name: string; description?: string; reasoning?: { efforts: Array<{ id: string; name: string }>; defaultEffort?: string } }
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
    const result = await this.remote.modelCatalog()
    if (!result.ok) {
      this.store.update(state => { state.status = 'error'; state.error = `${result.error.code}: ${result.error.message}` })
      return
    }
    this.catalog = result.value
    this.sync()
    await this.ensureCodexDefault()
  }

  async select(selection: Selection): Promise<void> {
    const preset = projection<string | null>(this.presetProjection) ?? null
    const codexMode = preset === CODEX_APP_SERVER_PRESET
    if ((selection.provider === CODEX_PROVIDER) !== codexMode) {
      throw new Error(`provider ${selection.provider} is unavailable in preset ${preset ?? '(none)'}`)
    }
    this.store.update(state => { state.status = 'selecting'; state.error = null })
    const result = await this.remote.selectModel({ sessionId: this.sessionId, ...selection })
    if (!result.ok) {
      this.store.update(state => { state.status = 'error'; state.error = `${result.error.code}: ${result.error.message}` })
      throw new Error(result.error.message)
    }
    this.store.update(state => { state.current = result.value.selected; state.status = 'ready'; state.error = null })
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
        ...model.reasoning?.defaultEffort === undefined ? {} : { reasoningEffort: model.reasoning.defaultEffort },
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
  useEffect(() => { load() }, [load])
  const entries = state.groups.flatMap(group => group.models.map(model => ({ group, model })))
  const selectedIndex = entries.findIndex(({ group, model }) => (
    state.current?.provider === group.id && state.current.model === model.id
  ))
  const current = selectedIndex < 0 ? undefined : entries[selectedIndex]
  const efforts = current?.model.reasoning?.efforts ?? []
  return <span data-aezy-mode-model style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
    <select
      aria-label="Model"
      disabled={state.status === 'loading' || state.status === 'selecting' || entries.length === 0}
      value={selectedIndex < 0 ? '' : String(selectedIndex)}
      title={state.error ?? `Mode: ${state.preset ?? 'unknown'}`}
      onChange={(event) => {
        const entry = entries[Number(event.target.value)]
        if (entry === undefined) return
        void select({
          provider: entry.group.id,
          model: entry.model.id,
          ...entry.model.reasoning?.defaultEffort === undefined
            ? {} : { reasoningEffort: entry.model.reasoning.defaultEffort },
        })
      }}
      style={{ maxWidth: 220, minHeight: 30, borderRadius: 7 }}
    >
      {selectedIndex < 0 && <option value="">Select model</option>}
      {entries.map(({ group, model }, index) => <option key={`${group.id}:${model.id}`} value={String(index)}>
        {group.name} · {model.name}
      </option>)}
    </select>
    {efforts.length > 0 && <select
      aria-label="Reasoning effort"
      value={state.current?.reasoningEffort ?? current?.model.reasoning?.defaultEffort ?? ''}
      disabled={state.status === 'selecting'}
      onChange={(event) => {
        if (current === undefined) return
        void select({ provider: current.group.id, model: current.model.id, reasoningEffort: event.target.value })
      }}
      style={{ minHeight: 30, borderRadius: 7 }}
    >
      {efforts.map(effort => <option key={effort.id} value={effort.id}>{effort.name}</option>)}
    </select>}
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
        await directory.select({ provider, model })
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
