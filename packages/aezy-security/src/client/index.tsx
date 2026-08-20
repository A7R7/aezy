import { useCallback, useEffect, useState } from 'react'

type Mode = 'deny' | 'ask' | 'allow'
type Scope = 'global' | 'repository'
type Rule = {
  id: string
  createdAt: number
  effect: Mode
  scope: Scope
  tool: string
  commandPrefix?: string
  repositoryRoot?: string
}
type Audit = {
  id: string
  time: number
  tool: string
  decision: Mode
  source: string
  network: 'none' | 'possible' | 'required'
  explanation: string
  commandPreview?: string
  outcome?: string
}
type SecuritySnapshot = {
  repositoryRoot: string
  network: { default: Mode; effective: Mode; repositoryOverride: Mode | null }
  rules: Rule[]
  audit: Audit[]
}
type Snapshot<T> = { getSnapshot(): T; subscribe(listener: () => void): () => void }
type SessionsState = { byId: Record<string, { cwd?: string }> }
type ClientContext = {
  slots: {
    inject(name: string, register: () => (() => void)): void
    register(options: Record<string, unknown>, component: unknown): () => void
  }
  sessions: { list: Snapshot<SessionsState> }
}
type SecurityProps = { cwd: string }

const palette = {
  panel: 'var(--dsw-alias-bg-base, #ffffff)',
  elevated: 'var(--dsw-alias-bg-module-platform, #f9fafb)',
  button: 'var(--dsw-alias-button-elevated-fill, #ffffff)',
  interactive: 'var(--dsw-alias-interactive-bg-hover, rgba(38, 49, 72, 0.06))',
  border: 'var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1))',
  text: 'var(--dsw-alias-label-primary, #0f1115)',
  muted: 'var(--dsw-alias-label-tertiary, #81858c)',
  accent: 'var(--dsw-alias-state-business-primary, #4d6bfe)',
  warning: 'var(--dsw-alias-state-warn-label, #b45309)',
  error: 'var(--dsw-alias-state-error-primary, #dc1313)',
}

const control = {
  padding: '7px 9px',
  borderRadius: 6,
  border: `1px solid ${palette.border}`,
  background: palette.button,
  color: palette.text,
} as const

async function request<T>(path: string, params: Record<string, string>): Promise<T> {
  const response = await fetch(`${path}?${new URLSearchParams(params)}`, {
    headers: { 'X-Aezy-Client': 'web' },
    cache: 'no-store',
  })
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? `Aezy Security request failed (${response.status})`)
  return body
}

async function mutate<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Aezy-Client': 'web' },
    body: JSON.stringify(body),
  })
  const value = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(value.error ?? `Aezy Security request failed (${response.status})`)
  return value
}

function decisionColor(decision: Mode): string {
  if (decision === 'deny') return palette.error
  if (decision === 'ask') return palette.warning
  return palette.accent
}

function SecurityView({ cwd }: SecurityProps) {
  const [snapshot, setSnapshot] = useState<SecuritySnapshot | null>(null)
  const [effect, setEffect] = useState<Mode>('ask')
  const [scope, setScope] = useState<Scope>('repository')
  const [tool, setTool] = useState('bash')
  const [commandPrefix, setCommandPrefix] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      setSnapshot(await request('/aezy/api/security', { cwd }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }, [cwd])

  useEffect(() => { void refresh() }, [refresh])

  const updateNetwork = useCallback(async (mode: Mode, target: Scope) => {
    setBusy(true)
    setError(null)
    try {
      setSnapshot(await mutate('/aezy/api/security/network', { cwd, mode, scope: target }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }, [cwd])

  const clearOverride = useCallback(async () => {
    setBusy(true)
    try {
      setSnapshot(await mutate('/aezy/api/security/network/clear', { cwd }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }, [cwd])

  const addRule = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await mutate<{ snapshot: SecuritySnapshot }>('/aezy/api/security/rules', {
        cwd,
        effect,
        scope,
        tool: tool.trim(),
        ...(commandPrefix.trim() === '' ? {} : { commandPrefix: commandPrefix.trim() }),
      })
      setSnapshot(result.snapshot)
      setCommandPrefix('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }, [commandPrefix, cwd, effect, scope, tool])

  const removeRule = useCallback(async (id: string) => {
    setBusy(true)
    setError(null)
    try {
      const result = await mutate<{ snapshot: SecuritySnapshot }>('/aezy/api/security/rules/delete', { cwd, id })
      setSnapshot(result.snapshot)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }, [cwd])

  return <div style={{ height: '100%', overflow: 'auto', padding: '18px 22px', background: palette.panel, color: palette.text }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingBottom: 14, borderBottom: `1px solid ${palette.border}` }}>
      <div style={{ minWidth: 0 }}>
        <strong style={{ fontSize: 15 }}>Security</strong>
        <div style={{ marginTop: 4, color: palette.muted, fontSize: 11, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{snapshot?.repositoryRoot ?? cwd}</div>
      </div>
      <button type="button" disabled={busy} onClick={() => void refresh()} style={{ ...control, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Working…' : 'Refresh'}</button>
    </header>

    {error !== null && <div role="alert" style={{ marginTop: 14, padding: 10, border: `1px solid ${palette.error}`, borderRadius: 7, color: palette.error }}>{error}</div>}

    <section style={{ marginTop: 18 }}>
      <h2 style={{ margin: '0 0 5px', fontSize: 14 }}>Network Policy</h2>
      <p style={{ margin: '0 0 12px', color: palette.muted, fontSize: 12, lineHeight: 1.5 }}>Controls Agent-initiated network tools and shell commands. Model-provider and DSH control-plane traffic are outside this boundary.</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: 12, border: `1px solid ${palette.border}`, borderRadius: 8, background: palette.elevated }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>Repository
          <select disabled={busy} value={snapshot?.network.repositoryOverride ?? snapshot?.network.effective ?? 'ask'} onChange={event => void updateNetwork(event.target.value as Mode, 'repository')} style={control}>
            <option value="deny">Deny</option><option value="ask">Ask</option><option value="allow">Allow</option>
          </select>
        </label>
        <span style={{ color: palette.muted, fontSize: 12 }}>Effective: <strong style={{ color: decisionColor(snapshot?.network.effective ?? 'ask') }}>{snapshot?.network.effective ?? 'ask'}</strong></span>
        {snapshot?.network.repositoryOverride !== null && snapshot !== null && <button type="button" disabled={busy} onClick={() => void clearOverride()} style={{ ...control, cursor: 'pointer' }}>Use global ({snapshot.network.default})</button>}
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>Global default
          <select disabled={busy} value={snapshot?.network.default ?? 'ask'} onChange={event => void updateNetwork(event.target.value as Mode, 'global')} style={control}>
            <option value="deny">Deny</option><option value="ask">Ask</option><option value="allow">Allow</option>
          </select>
        </label>
      </div>
    </section>

    <section style={{ marginTop: 22 }}>
      <h2 style={{ margin: '0 0 5px', fontSize: 14 }}>Approval Rules</h2>
      <p style={{ margin: '0 0 12px', color: palette.muted, fontSize: 12, lineHeight: 1.5 }}>Deny wins over ask and allow. An allow prefix matches only one simple command, never a shell chain or expansion.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '110px 130px minmax(100px, 160px) minmax(180px, 1fr) auto', gap: 8, alignItems: 'center' }}>
        <select aria-label="Rule effect" value={effect} onChange={event => setEffect(event.target.value as Mode)} style={control}><option value="deny">Deny</option><option value="ask">Ask</option><option value="allow">Allow</option></select>
        <select aria-label="Rule scope" value={scope} onChange={event => setScope(event.target.value as Scope)} style={control}><option value="repository">Repository</option><option value="global">Global</option></select>
        <input aria-label="Tool name" value={tool} onChange={event => setTool(event.target.value)} placeholder="bash or *" style={control} />
        <input aria-label="Command prefix" value={commandPrefix} onChange={event => setCommandPrefix(event.target.value)} placeholder="Optional command prefix" style={{ ...control, minWidth: 0 }} />
        <button type="button" disabled={busy || tool.trim() === ''} onClick={() => void addRule()} style={{ ...control, color: palette.accent, cursor: 'pointer' }}>Add rule</button>
      </div>
      <div style={{ marginTop: 12, border: `1px solid ${palette.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {(snapshot?.rules.length ?? 0) === 0 && <div style={{ padding: 14, color: palette.muted, fontSize: 12 }}>No persistent rules for this repository.</div>}
        {snapshot?.rules.map(rule => <div key={rule.id} style={{ display: 'grid', gridTemplateColumns: '70px 82px minmax(80px, 130px) minmax(0, 1fr) auto', gap: 9, alignItems: 'center', padding: '9px 11px', borderBottom: `1px solid ${palette.border}`, background: palette.panel, fontSize: 12 }}>
          <strong style={{ color: decisionColor(rule.effect), textTransform: 'uppercase', fontSize: 10 }}>{rule.effect}</strong>
          <span style={{ color: palette.muted }}>{rule.scope}</span>
          <span style={{ fontFamily: 'monospace' }}>{rule.tool}</span>
          <span title={rule.commandPrefix} style={{ color: palette.muted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rule.commandPrefix ?? 'all calls'}</span>
          <button type="button" disabled={busy} onClick={() => void removeRule(rule.id)} style={{ ...control, color: palette.error, cursor: 'pointer' }}>Delete</button>
        </div>)}
      </div>
    </section>

    <section style={{ marginTop: 22 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 14 }}>Recent decisions</h2>
      <div style={{ border: `1px solid ${palette.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {(snapshot?.audit.length ?? 0) === 0 && <div style={{ padding: 14, color: palette.muted, fontSize: 12 }}>No policy-relevant Agent actions recorded yet.</div>}
        {snapshot?.audit.map(record => <div key={record.id} style={{ padding: '9px 11px', borderBottom: `1px solid ${palette.border}`, background: palette.panel }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 12 }}>
            <strong style={{ color: decisionColor(record.decision), textTransform: 'uppercase', fontSize: 10 }}>{record.decision}</strong>
            <span style={{ fontFamily: 'monospace' }}>{record.tool}</span>
            <span style={{ color: palette.muted }}>{record.source} · network {record.network}</span>
            {record.outcome !== undefined && <span style={{ color: palette.muted }}>→ {record.outcome}</span>}
            <time style={{ marginLeft: 'auto', color: palette.muted, fontSize: 10 }}>{new Date(record.time).toLocaleString()}</time>
          </div>
          {record.commandPreview !== undefined && <div style={{ marginTop: 5, padding: '5px 7px', borderRadius: 5, background: palette.interactive, color: palette.muted, fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.commandPreview}</div>}
          <div style={{ marginTop: 5, color: palette.muted, fontSize: 11 }}>{record.explanation}</div>
        </div>)}
      </div>
    </section>
  </div>
}

export const inject = ['slots', 'sessions']

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'security',
    order: 6,
    label: () => 'Security',
    inject: (sessionId: string): SecurityProps => {
      const cwd = ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd
      if (cwd === undefined) throw new Error(`aezy-security: session "${sessionId}" has no working directory`)
      return { cwd }
    },
  }, SecurityView))
}
