import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SettingsSectionOwnerProps } from '@deepseek-ai/dsh-client-ui-settings/client'

type Budget = { maxIterations: number; maxWallTimeMs: number; maxTokens: number; maxToolCalls: number }
type Template = {
  id: string; name: string; description: string; digest: string
  backend: { id: string; capabilities: string[] }; budgets: Budget
  nodes: Array<{ id: string; type: string; label: string }>
}
type Revision = { body: { id: string; revision: number; name: string }; digest: string }
type Snapshot = { executionAvailable: false; templates: Template[]; revisions: Revision[] }
type Draft = { id: string; name: string; description: string; budgets: Budget }
type Preview = {
  published: { body: { id: string; revision: number; name: string }; digest: string }
  expectedRevision: number
  resolution: { executable: false; missing: string[]; reason: string }
}
type ClientContext = { slots: { inject(name: string, register: () => (() => void)): void; register(options: Record<string, unknown>, component: unknown): () => void } }

const ROUTE = '/aezy/api/workflows'
const colors = { text: 'var(--dsw-alias-label-primary,#202124)', muted: 'var(--dsw-alias-label-secondary,#737780)', surface: 'var(--dsw-alias-bg-module-platform,#f7f7f8)', border: 'var(--dsw-alias-border-subtle,rgba(127,127,127,.22))', accent: 'var(--dsw-alias-state-info-primary,#4f6bed)', danger: 'var(--dsw-alias-state-error-primary,#c73535)' }
const field = { minHeight: 34, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '0 9px', color: colors.text, background: 'transparent' } as const
const button = { ...field, cursor: 'pointer', background: colors.surface, padding: '0 12px' } as const

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers); headers.set('x-aezy-client', 'web')
  if (init.body !== undefined) headers.set('content-type', 'application/json')
  const response = await fetch(path, { ...init, headers })
  const value = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(value.error ?? `Workflow request failed (${response.status})`)
  return value as T
}

function draftFor(template: Template): Draft {
  return { id: `my-${template.id}`, name: `My ${template.name}`, description: template.description, budgets: { ...template.budgets } }
}

export function WorkflowSettingsSection(_props: SettingsSectionOwnerProps) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [templateId, setTemplateId] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const template = useMemo(() => snapshot?.templates.find(item => item.id === templateId) ?? null, [snapshot, templateId])

  const refresh = useCallback(async () => {
    try {
      const next = await request<Snapshot>(ROUTE); setSnapshot(next)
      if (templateId === '' && next.templates[0] !== undefined) {
        setTemplateId(next.templates[0].id); setDraft(draftFor(next.templates[0]))
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
  }, [templateId])
  useEffect(() => { void refresh() }, [refresh])

  const changeTemplate = (id: string) => {
    const next = snapshot?.templates.find(item => item.id === id); if (next === undefined) return
    setTemplateId(id); setDraft(draftFor(next)); setPreview(null); setError(null)
  }
  const previewDraft = async () => {
    if (draft === null) return; setBusy(true); setError(null)
    try { setPreview(await request<Preview>(`${ROUTE}/preview`, { method: 'POST', body: JSON.stringify({ templateId, draft }) })) }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) } finally { setBusy(false) }
  }
  const publish = async () => {
    if (draft === null || preview === null) return; setBusy(true); setError(null)
    try {
      await request(`${ROUTE}/publish`, { method: 'POST', body: JSON.stringify({ templateId, draft, expectedRevision: preview.expectedRevision }) })
      setPreview(null); await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) } finally { setBusy(false) }
  }
  const setBudget = (key: keyof Budget, value: string) => setDraft(current => current === null ? null : ({ ...current, budgets: { ...current.budgets, [key]: Number(value) } }))

  return <section data-aezy-workflow-editor style={{ maxWidth: 820, color: colors.text, paddingBottom: 36 }}>
    <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Agent workflows</h2>
    <p style={{ margin: '0 0 18px', color: colors.muted, lineHeight: 1.55 }}>
      Create immutable macro definitions from built-in templates. Publishing does not run a workflow or create a Session; execution remains unavailable until the backend can durably bind the exact revision and digest.
    </p>
    {template !== null && draft !== null && <div style={{ display: 'grid', gap: 14 }}>
      <label>Template<br/><select aria-label="Workflow template" value={templateId} onChange={event => changeTemplate(event.target.value)} style={{ ...field, marginTop: 5, width: '100%' }}>{snapshot?.templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) minmax(220px,2fr)', gap: 12 }}>
        <label>Definition id<br/><input value={draft.id} onChange={event => { setDraft({ ...draft, id: event.target.value }); setPreview(null) }} style={{ ...field, marginTop: 5, width: '100%', boxSizing: 'border-box' }}/></label>
        <label>Name<br/><input value={draft.name} onChange={event => { setDraft({ ...draft, name: event.target.value }); setPreview(null) }} style={{ ...field, marginTop: 5, width: '100%', boxSizing: 'border-box' }}/></label>
      </div>
      <label>Description<br/><textarea value={draft.description} onChange={event => { setDraft({ ...draft, description: event.target.value }); setPreview(null) }} rows={3} style={{ ...field, padding: 9, marginTop: 5, width: '100%', boxSizing: 'border-box', resize: 'vertical' }}/></label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(110px,1fr))', gap: 10 }}>
        {([['maxIterations','Iterations'],['maxWallTimeMs','Wall time ms'],['maxTokens','Tokens'],['maxToolCalls','Tool calls']] as const).map(([key,label]) => <label key={key}>{label}<br/><input type="number" min={1} value={draft.budgets[key]} onChange={event => { setBudget(key,event.target.value); setPreview(null) }} style={{ ...field, marginTop: 5, width: '100%', boxSizing: 'border-box' }}/></label>)}
      </div>
      <div style={{ padding: 14, border: `1px solid ${colors.border}`, borderRadius: 10, background: colors.surface }}>
        <strong>Template graph</strong><div style={{ color: colors.muted, marginTop: 7 }}>{template.nodes.map(node => `${node.label} [${node.type}]`).join(' → ')}</div>
        <div style={{ color: colors.muted, marginTop: 6 }}>Backend: {template.backend.id} · Template digest {template.digest.slice(0,12)}…</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" disabled={busy} onClick={() => { void previewDraft() }} style={button}>Validate preview</button>
        <button type="button" disabled={busy || preview === null} onClick={() => { void publish() }} style={button}>Publish immutable revision</button>
      </div>
      {preview !== null && <div role="status" style={{ padding: 14, border: `1px solid ${colors.border}`, borderRadius: 10 }}>
        <strong>{preview.published.body.id}@{preview.published.body.revision}</strong> · <code>{preview.published.digest.slice(0,16)}…</code>
        <div style={{ color: colors.danger, marginTop: 7 }}>Execution unavailable: {preview.resolution.missing.join(', ') || preview.resolution.reason}</div>
      </div>}
      <div><strong>Published revisions</strong><div style={{ color: colors.muted, marginTop: 6 }}>{snapshot?.revisions.length === 0 ? 'None' : snapshot?.revisions.map(item => `${item.body.id}@${item.body.revision} (${item.digest.slice(0,10)}…)`).join(' · ')}</div></div>
      {error !== null && <p role="alert" style={{ color: colors.danger, margin: 0 }}>{error}</p>}
    </div>}
  </section>
}

export const inject = ['slots']
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'aezy-workflow', order: 14, label: 'Workflows' }, WorkflowSettingsSection))
}
