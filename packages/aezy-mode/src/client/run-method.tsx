import { useEffect, useState } from 'react'
import { Button, IconAgentPresetOutline16, IconChevronDownOutline14, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Context } from '@deepseek-ai/cordis'
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import { CODEX_APP_SERVER_PRESET } from '../model-routing.js'
import { isRetiredPreset, retiredPresetMessage } from '../preset-policy.js'

type Option = { id: string; name?: string; description?: string }
type Seat = { options: Option[]; current: string; busy: boolean; error: string | null; introduce: boolean }
type Props = {
  useAgentPresetSeat<T>(select: (state: Seat) => T): T
  load(): Promise<void>
  select(id: string): Promise<string | undefined>
  introduced(): void
}

// Only the rendering changes. The shipped controller still owns staging,
// blank-session checks, durable preset selection, and creator-draft behavior.
export function RunMethodMenu({ useAgentPresetSeat, load, select, introduced }: Props) {
  const state = useAgentPresetSeat(value => value)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { void load().catch(error => setError(String(error))) }, [load])
  useEffect(() => { if (state.introduce) introduced() }, [state.introduce, introduced])
  if (!state.options.length) return null
  const options = state.options.filter(option => !isRetiredPreset(option.id))
  const retired = isRetiredPreset(state.current)
  const chosen = options.find(option => option.id === state.current)
  const failure = retired ? retiredPresetMessage : error || state.error
  const groups = [
    { id: 'dsh', name: 'DSH 工作预设', options: options.filter(option => option.id !== CODEX_APP_SERVER_PRESET) },
    { id: 'codex', name: 'Codex 执行引擎', options: options.filter(option => option.id === CODEX_APP_SERVER_PRESET) },
  ]
  return <span data-aezy-run-method style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, maxWidth: '100%' }}>
    <Menu open={open} portal side="bottom" align="start"
      anchor={<Button variant="toolbar" size="sm" aria-label="运行方式" aria-haspopup="menu" aria-expanded={open}
        title="运行方式：工作预设与执行引擎分组；开始运行后请新建会话切换"
        disabled={state.busy || retired} onClick={() => setOpen(!open)}>
        <IconAgentPresetOutline16 />{retired ? '已封存的运行方式' : chosen?.name ?? '选择运行方式'}<IconChevronDownOutline14 />
      </Button>}
      items={groups.filter(group => group.options.length).flatMap(group => [
        { type: 'label' as const, id: group.id, text: group.name },
        ...group.options.map(option => ({ id: option.id, label: option.name ?? option.id })),
      ])}
      selectedId={state.current} onClose={() => setOpen(false)} onSelect={id => {
        setOpen(false)
        setError(null)
        void select(id).then(result => setError(result ?? null)).catch(error => setError(String(error)))
      }} />
    {failure && <span role="alert" style={{ color: 'var(--dsw-alias-state-error-primary, #d84848)', fontSize: 12, maxWidth: 360, maxHeight: 144, overflowY: 'auto', overflowWrap: 'anywhere' }}>
      {retired ? failure : <details><summary>运行方式切换失败；请重试或新建会话</summary>{failure}</details>}
    </span>}
  </span>
}

export function installRunMethodMenu(ctx: Context) {
  ctx.slots.inject('conversation.hero.agentPreset', () => {
    let source: StoredEntry | undefined
    let remove: (() => void) | undefined
    const update = () => {
      const next = ctx.slots.entries('conversation.hero.agentPreset').find(entry =>
        entry.locale === 'settings.agentPreset' && entry.options.priority !== -10 && entry.inject)
      if (next === source) return
      remove?.()
      remove = undefined
      source = next
      if (!next) return
      remove = ctx.slots.register({ name: 'conversation.hero.agentPreset', priority: -10,
        // Public stored business face: never reach into the upstream controller
        // or copy its state machine. It remains mounted below our presentation.
        inject: () => next.inject!(),
      }, RunMethodMenu)
    }
    const stop = ctx.slots.subscribe('conversation.hero.agentPreset', update)
    update()
    return () => { stop(); remove?.() }
  })
}
