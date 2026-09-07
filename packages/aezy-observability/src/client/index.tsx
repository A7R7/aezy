import type { Context } from '@deepseek-ai/cordis'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Logs from './vendor/pages/Logs'
import Usage from './vendor/pages/Usage'
import { styles } from './vendor/styles'
import { API_BASE } from './vendor/aezy-api'
import { IconX } from './vendor/icons'

type Page = 'logs' | 'usage' | null
const pageFromLocation = (): Page => {
  const value = new URL(window.location.href).searchParams.get('aezyView')
  return value === 'logs' || value === 'usage' ? value : null
}
class Navigation {
  page: Page = pageFromLocation()
  listeners = new Set<() => void>()
  trigger: HTMLElement | null = null
  getSnapshot = () => this.page
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  open = (page: Page, navigate = true) => {
    if (navigate && page !== pageFromLocation()) {
      const url = new URL(window.location.href)
      if (page) url.searchParams.set('aezyView', page)
      else { url.searchParams.delete('aezyView'); url.searchParams.delete('aezyTab') }
      window.history.pushState(null, '', url)
    }
    this.page = page; for (const listener of this.listeners) listener()
  }
}
function Nav({ wide, navigation }: { wide: boolean; navigation: Navigation }) {
  const page = useSyncExternalStore(navigation.subscribe, navigation.getSnapshot)
  return <nav aria-label="Observability" data-aezy-observability-nav style={{ display: 'grid', gap: 3, width: '100%' }}>
    {(['logs', 'usage'] as const).map(value => <button key={value} type="button" title={value === 'logs' ? 'Logs & Debug' : 'Usage'} aria-label={value === 'logs' ? 'Logs & Debug' : 'Usage'} aria-pressed={page === value}
      onClick={event => { navigation.trigger = event.currentTarget; navigation.open(value) }} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, width: '100%', border: 0, borderRadius: 8, padding: wide ? '7px 12px' : 7, background: page === value ? 'var(--dsw-alias-bg-hover, #8882)' : 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer' }}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{value === 'logs' ? <path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/> : <path d="M4 20V10m8 10V4m8 16v-7"/>}</svg>
      {wide && <span>{value === 'logs' ? 'Logs & Debug' : 'Usage'}</span>}
    </button>)}
  </nav>
}
function Surface({ navigation }: { navigation: Navigation }) {
  const page = useSyncExternalStore(navigation.subscribe, navigation.getSnapshot)
  const root = useRef<HTMLDivElement>(null)
  const [left, setLeft] = useState(0)
  const close = () => { navigation.open(null); navigation.trigger?.focus() }
  useEffect(() => {
    if (!page) return
    // Geometry only: preserve the existing AppFrame and mounted Session.
    const frame = document.querySelector('[data-app-frame]')
    const update = () => {
      const nav = document.querySelector('[data-aezy-observability-nav]')
      const sidebar = nav?.closest('aside')
      const width = sidebar?.getBoundingClientRect().right ?? nav?.getBoundingClientRect().right ?? 0
      setLeft(window.innerWidth < 760 ? 0 : Math.round(width + (sidebar ? 0 : 12)))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(frame ?? document.body)
    window.addEventListener('resize', update)
    root.current?.focus()
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) close() }
    document.addEventListener('keydown', key)
    return () => { observer.disconnect(); window.removeEventListener('resize', update); document.removeEventListener('keydown', key) }
  }, [page])
  if (!page) return null
  return <div className="aezy-observability" ref={root} tabIndex={-1} aria-label={page === 'logs' ? 'Logs & Debug workspace' : 'Usage workspace'} data-aezy-observability-page={page}
    style={{ position: 'fixed', inset: `0 0 0 ${left}px`, pointerEvents: 'auto', overflow: 'auto', padding: '24px 30px', background: 'var(--bg)', color: 'var(--text)', zIndex: 4 }}>
    <style>{styles}</style>
    <style>{`.aezy-observability {font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.5;--font-code:ui-monospace,SFMono-Regular,monospace}
      .aezy-observability [hidden]{display:none!important}.aezy-observability .usage-filters{flex-wrap:wrap}
      .aezy-observability .usage-filters{min-width:0;max-width:100%;justify-content:flex-start}
      .aezy-observability .usage-segmented{max-width:100%;min-width:0;flex-wrap:wrap;justify-content:flex-start}
      body[data-ds-dark-theme] .aezy-observability{color-scheme:dark} body:not([data-ds-dark-theme]) .aezy-observability{color-scheme:light}
      .aezy-observability .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
      .aezy-observability .logs-table-wrap{max-height:calc(100vh - 290px)}.aezy-observability .modal-overlay{padding:0;color:var(--text)}
      .aezy-observability .aezy-page-tools{display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px}
      .aezy-observability .aezy-coverage-note{font-size:12px;color:var(--muted);margin:10px 0 18px;max-width:100ch}
      @media(max-width:760px){.aezy-observability{padding:14px!important}.aezy-observability .page-head{flex-wrap:wrap}}
    `}</style>
    <div className="aezy-page-tools">
      <button className="btn btn-ghost btn-sm" onClick={() => navigation.open(page === 'logs' ? 'usage' : 'logs')}>{page === 'logs' ? 'Usage' : 'Logs & Debug'}</button>
      <button className="btn btn-ghost btn-sm" onClick={close} aria-label="Close observability"><IconX/> Back to session</button>
    </div>
    <details className="aezy-coverage-note"><summary>Data coverage · Aezy local observations · UTC</summary><p>Native and gateway entries are model requests. Official App Server entries are usage notifications, or unmetered Turns when no usage arrives; not HTTP traces. Only measured tokens are summed. Pre-install history is not imported. No prompts or credentials are stored. Debug metadata is opt-in and process-local; usage records survive restart.</p></details>
    {page === 'logs' ? <Logs apiBase={API_BASE}/> : <Usage apiBase={API_BASE}/>}
  </div>
}
export const inject = ['slots']
export function apply(ctx: Context) {
  const navigation = new Navigation()
  ctx.effect(() => {
    const onPop = () => navigation.open(pageFromLocation(), false)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, 'aezy-observability: browser navigation without touching DSH URL state')
  ctx.inject(['sessions'], (bound: any) => {
    let current = bound.sessions.list.getSnapshot().current
    bound.effect(() => bound.sessions.list.subscribe(() => {
      const next = bound.sessions.list.getSnapshot().current
      if (next !== current) { const previous = current; current = next; if (previous != null) navigation.open(null) }
    }), 'aezy-observability: return to selected Session')
  })
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'aezy-observability', order: -20, inject: () => ({ navigation }) }, Nav))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'aezy-observability', order: 130, inject: () => ({ navigation }) }, Surface))
}
