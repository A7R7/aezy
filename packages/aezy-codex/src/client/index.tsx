import { useCallback, useEffect, useState } from 'react'
import type { SettingsSectionOwnerProps } from '@deepseek-ai/dsh-client-ui-settings/client'

type ClientContext = {
  slots: {
    inject(name: string, register: () => (() => void)): void
    register(options: Record<string, unknown>, component: unknown): () => void
  }
}

type RateWindow = {
  usedPercent: number | null
  remainingPercent: number | null
  windowDurationMins: number | null
  resetsAt: number | null
}

type AccountSnapshot = {
  connection: { state: string }
  runtime?: { owner: string; provider: string; home?: string; gateway?: { version: string; endpoint: string; credentialSource: string } }
  account: null | {
    requiresOpenaiAuth: boolean | null
    type: string | null
    planType: string | null
  }
  rateLimits: null | {
    primary: RateWindow | null
    secondary: RateWindow | null
    byLimitId: Record<string, { primary: RateWindow | null; secondary: RateWindow | null }>
  }
  usage: null | {
    summary: null | Record<string, number>
    dailyBucketCount: number | null
  }
  models: Array<{
    id: string
    displayName: string
    isDefault: boolean
    defaultReasoningEffort: string | null
  }>
  error: string | null
}

type LoginStart = {
  type: 'chatgpt' | 'chatgptDeviceCode'
  loginId: string
  authUrl?: string
  verificationUrl?: string
  userCode?: string
}

const ROUTE = '/aezy/api/codex'
const palette = {
  text: 'var(--dsw-alias-label-primary, #202124)',
  muted: 'var(--dsw-alias-label-secondary, #737780)',
  surface: 'var(--dsw-alias-bg-module-platform, #f7f7f8)',
  border: 'var(--dsw-alias-border-subtle, rgba(127,127,127,.22))',
  accent: 'var(--dsw-alias-state-info-primary, #4f6bed)',
  danger: 'var(--dsw-alias-state-error-primary, #c73535)',
}

const buttonStyle = {
  minHeight: 34,
  padding: '0 12px',
  border: `1px solid ${palette.border}`,
  borderRadius: 8,
  background: palette.surface,
  color: palette.text,
  cursor: 'pointer',
} as const

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('x-aezy-client', 'web')
  if (init.body !== undefined) headers.set('content-type', 'application/json')
  const response = await fetch(path, { ...init, headers })
  const value = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(value.error ?? `Codex account request failed (${response.status})`)
  return value as T
}

function percent(window: RateWindow | null | undefined): string {
  if (typeof window?.usedPercent === 'number') return `${Math.round(window.usedPercent)}% used`
  if (typeof window?.remainingPercent === 'number') return `${Math.round(window.remainingPercent)}% remaining`
  return 'Unavailable'
}

function resetLabel(window: RateWindow | null | undefined): string | null {
  if (typeof window?.resetsAt !== 'number') return null
  return new Date(window.resetsAt * 1000).toLocaleString()
}

function numberLabel(value: number | undefined): string {
  return typeof value === 'number' ? new Intl.NumberFormat().format(value) : 'Unavailable'
}

function safeExternalUrl(value: string | undefined): string | null {
  if (value === undefined) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

function CodexChannel({ route }: { route: 'openai' | 'gateway' }) {
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null)
  const [pending, setPending] = useState<LoginStart | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await requestJson<AccountSnapshot>(`${ROUTE}?route=${route}`)
      setSnapshot(next)
      setError(next.error)
      if (next.account?.type === 'chatgpt') setPending(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }, [route])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    if (pending === null) return
    const interval = window.setInterval(() => { void refresh() }, 3000)
    return () => window.clearInterval(interval)
  }, [pending, refresh])

  const startLogin = async (mode: 'browser' | 'device') => {
    setBusy(mode)
    setError(null)
    try {
      const login = await requestJson<LoginStart>(`${ROUTE}/login/start?route=${route}`, {
        method: 'POST',
        body: JSON.stringify({ mode }),
      })
      setPending(login)
      const href = safeExternalUrl(login.authUrl ?? login.verificationUrl)
      if (href !== null) window.open(href, '_blank', 'noopener,noreferrer')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(null)
    }
  }

  const cancelLogin = async () => {
    if (pending === null) return
    setBusy('cancel')
    setError(null)
    try {
      await requestJson(`${ROUTE}/login/cancel?route=${route}`, {
        method: 'POST',
        body: JSON.stringify({ loginId: pending.loginId }),
      })
      setPending(null)
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(null)
    }
  }

  const logout = async () => {
    if (!window.confirm('Sign out of this Aezy-owned Codex instance?')) return
    setBusy('logout')
    setError(null)
    try {
      await requestJson(`${ROUTE}/logout?route=${route}`, { method: 'POST', body: '{}' })
      setPending(null)
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(null)
    }
  }

  const account = snapshot?.account
  const summary = snapshot?.usage?.summary ?? null
  const externalHref = safeExternalUrl(pending?.authUrl ?? pending?.verificationUrl)
  const connected = snapshot?.connection.state === 'connected'
  const managed = route === 'gateway'
  const primaryReset = resetLabel(snapshot?.rateLimits?.primary)

  return <section data-aezy-codex-channel={route} style={{ color: palette.text, maxWidth: 760, paddingBottom: 32 }}>
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 20, margin: '0 0 6px' }}>{managed ? 'DeepSeek · Aezy gateway' : 'GPT · OpenAI'}</h2>
      <p style={{ color: palette.muted, margin: 0, lineHeight: 1.55 }}>
        {managed
          ? 'DeepSeek uses existing DSH credentials through the Aezy gateway. Restart the Host after changing provider settings or credentials.'
          : 'This official Codex App Server has its own Aezy login, configuration and history. Personal Codex/OpenCodex configuration and OAuth are never imported. Sign in here to use GPT; model availability depends on this account.'}
      </p>
    </div>

    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ padding: 16, border: `1px solid ${palette.border}`, borderRadius: 10, background: palette.surface }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 650 }}>Connection</div>
            <div style={{ color: connected ? palette.accent : palette.muted, marginTop: 4 }}>
              {snapshot?.connection.state ?? 'Loading'}
              {account?.type === 'chatgpt' ? ` · ChatGPT ${account.planType ?? 'plan'}` : ''}
            </div>
          </div>
          <button type="button" disabled={busy !== null} onClick={() => { void refresh() }} style={buttonStyle}>Refresh</button>
        </div>
      </div>

      {!managed && <div style={{ padding: 16, border: `1px solid ${palette.border}`, borderRadius: 10 }}>
        <div style={{ fontWeight: 650, marginBottom: 8 }}>Official model catalog</div>
        <div style={{ color: palette.muted, lineHeight: 1.7 }}>
          {snapshot?.models.map(model => model.displayName).join(' · ') || 'Unavailable'}
        </div>
        {!account?.type && <p style={{ color: palette.muted }}>Catalog visibility is not authorization. Sign in before starting a GPT turn.</p>}
      </div>}

      {!managed && account?.type !== 'chatgpt' && <div style={{ padding: 16, border: `1px solid ${palette.border}`, borderRadius: 10 }}>
        <div style={{ fontWeight: 650, marginBottom: 6 }}>Sign in with ChatGPT</div>
        <p style={{ color: palette.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
          Browser login is recommended. Device login is available when the browser callback cannot reach this machine.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" disabled={!connected || busy !== null} onClick={() => { void startLogin('browser') }} style={buttonStyle}>
            {busy === 'browser' ? 'Starting…' : 'Open browser login'}
          </button>
          <button type="button" disabled={!connected || busy !== null} onClick={() => { void startLogin('device') }} style={buttonStyle}>
            {busy === 'device' ? 'Starting…' : 'Use device code'}
          </button>
        </div>
      </div>}

      {pending !== null && <div role="status" style={{ padding: 16, border: `1px solid ${palette.border}`, borderRadius: 10 }}>
        <div style={{ fontWeight: 650 }}>Waiting for browser sign-in</div>
        {pending.userCode !== undefined && <p style={{ margin: '10px 0', color: palette.text }}>
          Device code: <code style={{ fontWeight: 700, letterSpacing: '.08em' }}>{pending.userCode}</code>
        </p>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {externalHref !== null && <a href={externalHref} target="_blank" rel="noreferrer" style={{ ...buttonStyle, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            Continue in external browser
          </a>}
          <button type="button" disabled={busy !== null} onClick={() => { void cancelLogin() }} style={buttonStyle}>Cancel login</button>
        </div>
      </div>}

      {managed && <div style={{ padding: 16, border: `1px solid ${palette.border}`, borderRadius: 10 }}>
        <div style={{ fontWeight: 650 }}>Aezy built-in model gateway · {snapshot?.runtime?.gateway?.version}</div>
        <p style={{ color: palette.muted }}>Credentials: {snapshot?.runtime?.gateway?.credentialSource ?? 'DSH (waiting for gateway)'}</p>
        <div>Available models: {snapshot?.models.map(model => model.displayName).join(' · ') || 'Unavailable'}</div>
        <p style={{ color: palette.muted }}>ChatGPT plan limits do not apply to this provider. This adapter does not yet project Codex token usage into DSH; gateway accounting is separate.</p>
      </div>}

      {!managed && account?.type === 'chatgpt' && <>
        <div style={{ padding: 16, border: `1px solid ${palette.border}`, borderRadius: 10 }}>
          <div style={{ fontWeight: 650, marginBottom: 10 }}>Plan and limits</div>
          <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1fr) 2fr', gap: '8px 16px', margin: 0 }}>
            <dt style={{ color: palette.muted }}>Plan</dt><dd style={{ margin: 0 }}>{account.planType ?? 'Unknown'}</dd>
            <dt style={{ color: palette.muted }}>Primary window</dt><dd style={{ margin: 0 }}>{percent(snapshot?.rateLimits?.primary)}</dd>
            {primaryReset !== null && <><dt style={{ color: palette.muted }}>Resets</dt><dd style={{ margin: 0 }}>{primaryReset}</dd></>}
            <dt style={{ color: palette.muted }}>Lifetime tokens</dt><dd style={{ margin: 0 }}>{numberLabel(summary?.lifetimeTokens)}</dd>
            <dt style={{ color: palette.muted }}>Recent usage days</dt><dd style={{ margin: 0 }}>{snapshot?.usage?.dailyBucketCount ?? 'Unavailable'}</dd>
          </dl>
        </div>

        <div style={{ padding: 16, border: `1px solid ${palette.border}`, borderRadius: 10 }}>
          <div style={{ fontWeight: 650, marginBottom: 8 }}>Available models</div>
          <div style={{ color: palette.muted, lineHeight: 1.7 }}>
            {snapshot?.models.map(model => `${model.displayName}${model.isDefault ? ' (default)' : ''}`).join(' · ') || 'Unavailable'}
          </div>
        </div>

        <div>
          <button type="button" disabled={busy !== null} onClick={() => { void logout() }} style={{ ...buttonStyle, color: palette.danger }}>
            {busy === 'logout' ? 'Signing out…' : 'Sign out on this machine'}
          </button>
        </div>
      </>}

      {error !== null && <p role="alert" style={{ color: palette.danger, margin: 0 }}>{error}</p>}
    </div>
  </section>
}

export function CodexSettingsSection(_props: SettingsSectionOwnerProps) {
  return <div data-aezy-codex-settings>
    <p style={{ color: palette.muted, maxWidth: 760, lineHeight: 1.6 }}>
      Codex mode offers both GPT and DeepSeek. Start a new Session when changing channels: existing Sessions keep their original runtime-bound Thread and history. Refresh models in the composer after signing in.
    </p>
    <CodexChannel route="openai" />
    <CodexChannel route="gateway" />
  </div>
}

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'aezy-codex',
    order: 12,
    label: 'Codex',
  }, CodexSettingsSection))
}
