import {
  LlmAdapter,
  createAssistantMessage,
  createToolResultMessage,
} from '@deepseek-ai/dsh-llm'
import { codexModelInfo, readCodexModels } from './model-catalog.js'

export const CODEX_PROVIDER = 'aezy-codex'
const MAX_PROJECTED_TEXT_BYTES = 512 * 1024
const DSH_TOOL_INSTRUCTIONS = [
  'Use tools in the dsh namespace for every workspace operation, including shell commands, file reads, file changes, searches, network access, and task state.',
  'Native Codex tools are restricted to read-only fallback inspection. Never request broader native permissions.',
  'Do not claim a command or file change happened unless the corresponding tool result confirms it.',
].join(' ')

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== null))
}

function boundedText(value, limit = MAX_PROJECTED_TEXT_BYTES) {
  const text = String(value ?? '')
  const bytes = Buffer.from(text)
  if (bytes.length <= limit) return text
  const head = bytes.subarray(0, Math.floor(limit * 0.75)).toString('utf8')
  const tail = bytes.subarray(bytes.length - Math.floor(limit * 0.25)).toString('utf8')
  return `${head}\n\n[Codex activity output truncated by Aezy]\n\n${tail}`
}

function currentBoundary(session) {
  let turn = null
  let step = null
  for (const event of session.snapshotEvents()) {
    if (event.type === 'turn/start') turn = event.data.turn
    else if (event.type === 'turn/end' && event.data.turn === turn) {
      turn = null
      step = null
    } else if (event.type === 'step/start' && event.data.turn === turn) step = event.data.step
    else if (event.type === 'step/end' && event.data.turn === turn && event.data.step === step) step = null
  }
  if (turn === null || step === null) throw new Error('Codex adapter requires an open DSH turn and step')
  return { turn, step }
}

function permissionConfiguration(events) {
  let sandbox = 'workspace-write'
  let approvalPolicy = 'on-request'
  for (const event of events) {
    if (event.type === 'sandbox/mode') sandbox = event.data.mode
    if (event.type === 'approval/policy') approvalPolicy = event.data.policy === 'never' ? 'never' : 'on-request'
  }
  return { sandbox, approvalPolicy }
}

function codexDynamicTools(tools = []) {
  if (tools.length === 0) return []
  return [{
    type: 'namespace',
    name: 'dsh',
    description: 'Tools governed and executed by the current DSH Session.',
    tools: tools.map(tool => ({
      type: 'function',
      name: tool.name,
      deferLoading: false,
      description: tool.description,
      inputSchema: structuredClone(tool.parameters),
    })),
  }]
}

function latestInput(messages) {
  let boundary = -1
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'assistant') {
      boundary = index
      break
    }
  }
  const texts = []
  for (const message of messages.slice(boundary + 1)) {
    if (message?.role !== 'user') continue
    for (const block of message.content ?? []) {
      if (block.type === 'text' && block.text.trim()) texts.push(block.text.trim())
    }
  }
  const text = texts.join('\n\n')
  if (!text) throw new Error('Codex adapter received no user text in the current DSH step')
  return text
}

function auxiliaryInput(messages) {
  return messages.map(message => (message.content ?? [])
    .filter(block => block.type === 'text')
    .map(block => `${message.role ?? 'user'}: ${block.text}`)
    .join('\n'))
    .filter(Boolean)
    .join('\n\n')
}

function itemIdentity(item, fallback) {
  return typeof item?.id === 'string' && item.id ? item.id : fallback
}

function activityDescriptor(item, fallbackId = 'activity') {
  const id = itemIdentity(item, fallbackId)
  if (item?.type === 'dynamicTool') {
    return {
      id,
      type: 'dynamicTool',
      toolName: item.toolName,
      arguments: typeof item.arguments === 'string' ? item.arguments : JSON.stringify(item.arguments ?? {}),
      resultText: item.resultText ?? '(no output)',
      isError: item.isError === true,
      meta: item.meta ?? {},
    }
  }
  if (item?.type === 'permissions') {
    return {
      id,
      type: 'permissions',
      toolName: 'codex_permissions',
      arguments: JSON.stringify({ permissions: item.permissions ?? {} }),
      resultText: item.allowed ? 'Codex permissions allowed for this turn.' : 'Codex permissions declined.',
      isError: !item.allowed,
      meta: {},
    }
  }
  if (item?.type === 'fileChange') {
    const changes = Array.isArray(item.changes) ? item.changes : []
    const first = changes[0]
    const updating = changes.some(change => change?.kind?.type !== 'add')
    const diffs = changes.flatMap(fileChangeDiffs)
    return {
      id,
      type: 'fileChange',
      toolName: updating ? 'edit' : 'write',
      arguments: JSON.stringify(updating ? {
        file_path: first?.path ?? '(unknown file)',
        old_string: diffs[0]?.oldText ?? '',
        new_string: diffs[0]?.newText ?? String(first?.diff ?? ''),
      } : {
        file_path: first?.path ?? '(unknown file)',
        content: diffs[0]?.newText ?? String(first?.diff ?? ''),
      }),
      resultText: changes.length === 0 ? 'No file changes recorded' : changes.map(change => {
        const verb = change?.kind?.type === 'add' ? 'Added'
          : change?.kind?.type === 'delete' ? 'Deleted' : 'Updated'
        return `${verb} ${change?.path ?? '(unknown file)'}`
      }).join('\n'),
      isError: item.status === 'failed' || item.status === 'declined',
      meta: { diffs },
    }
  }
  const command = Array.isArray(item?.command) ? item.command.join(' ') : String(item?.command ?? '')
  const exitCode = Number.isInteger(item?.exitCode) ? item.exitCode : null
  const output = boundedText(item?.aggregatedOutput || '(no output)')
  return {
    id,
    type: 'commandExecution',
    toolName: 'bash',
    arguments: JSON.stringify({ command, description: command.split('\n', 1)[0].slice(0, 120) || 'Codex command' }),
    resultText: exitCode !== null && exitCode !== 0
      ? `${output.replace(/\n+$/u, '')}\n[exit code: ${exitCode}]`
      : output,
    isError: item?.status === 'failed' || item?.status === 'declined' || (exitCode !== null && exitCode !== 0),
    meta: {},
  }
}

function fileChangeDiffs(change) {
  const path = typeof change?.path === 'string' ? change.path : ''
  const diff = boundedText(change?.diff ?? '')
  if (!path || !diff) return []
  if (change?.kind?.type === 'add' && !diff.includes('@@')) return [{ path, oldText: null, newText: diff }]
  if (change?.kind?.type === 'delete' && !diff.includes('@@')) return [{ path, oldText: diff, newText: '' }]
  const hunks = []
  let oldLines = []
  let newLines = []
  let inside = false
  const flush = () => {
    if (oldLines.length === 0 && newLines.length === 0) return
    hunks.push({ path, oldText: oldLines.length === 0 ? null : oldLines.join('\n'), newText: newLines.join('\n') })
    oldLines = []
    newLines = []
  }
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@')) {
      flush()
      inside = true
    } else if (inside && line.startsWith('-') && !line.startsWith('---')) oldLines.push(line.slice(1))
    else if (inside && line.startsWith('+') && !line.startsWith('+++')) newLines.push(line.slice(1))
    else if (inside && line.startsWith(' ')) {
      oldLines.push(line.slice(1))
      newLines.push(line.slice(1))
    }
  }
  flush()
  return hunks
}

class ActivityQueue {
  constructor(signal) {
    this.values = []
    this.waiter = null
    this.closed = false
    this.abort = () => this.finish(signal.reason instanceof Error ? signal.reason : new Error('Codex turn aborted'))
    this.signal = signal
    signal?.addEventListener('abort', this.abort, { once: true })
  }

  push(value) {
    if (this.closed) return
    if (this.waiter !== null) {
      const waiter = this.waiter
      this.waiter = null
      waiter.resolve(value)
    } else this.values.push(value)
  }

  next() {
    if (this.values.length > 0) return Promise.resolve(this.values.shift())
    if (this.closed) return Promise.reject(this.error ?? new Error('Codex activity stream closed'))
    if (this.waiter !== null) return Promise.reject(new Error('Codex activity queue already has a waiter'))
    return new Promise((resolve, reject) => { this.waiter = { resolve, reject } })
  }

  finish(error) {
    if (this.closed) return
    this.closed = true
    this.error = error
    this.signal?.removeEventListener('abort', this.abort)
    if (this.waiter !== null) {
      const waiter = this.waiter
      this.waiter = null
      waiter.reject(error ?? new Error('Codex activity stream closed'))
    }
  }
}

function createStreamState() {
  return { blocks: new Map(), completed: new Set(), nextIndex: 0 }
}

function textDelta(state, itemId, type, delta) {
  const chunks = []
  let block = state.blocks.get(itemId)
  if (block === undefined) {
    block = { index: state.nextIndex++, type, text: '', closed: false }
    state.blocks.set(itemId, block)
    chunks.push({ type: 'block-start', index: block.index, blockType: type })
  }
  if (!block.closed && delta) {
    block.text += delta
    chunks.push({ type: type === 'reasoning' ? 'reasoning-delta' : 'text-delta', index: block.index, text: delta })
  }
  return chunks
}

function completeText(state, item, type, text) {
  const chunks = []
  const id = itemIdentity(item, `${type}-${state.nextIndex}`)
  let block = state.blocks.get(id)
  if (block === undefined) {
    block = { index: state.nextIndex++, type, text: '', closed: false }
    state.blocks.set(id, block)
    chunks.push({ type: 'block-start', index: block.index, blockType: type })
  }
  if (text.startsWith(block.text) && text.length > block.text.length) {
    const delta = text.slice(block.text.length)
    block.text = text
    chunks.push({ type: type === 'reasoning' ? 'reasoning-delta' : 'text-delta', index: block.index, text: delta })
  }
  if (!block.closed) {
    block.closed = true
    chunks.push({ type: 'block-end', index: block.index, block: { type, text: block.text } })
  }
  return chunks
}

/** DSH provider adapter that projects the official App Server without owning a second Session or tool loop. */
export class AezyCodexAdapter extends LlmAdapter {
  constructor({
    client,
    ready,
    bindings,
    ctx,
    logger = console,
    allowedAgentPresets = [],
    legacyAgentPresets = [],
    runtime,
  }) {
    super()
    this.client = client
    this.ready = ready
    this.bindings = bindings
    this.ctx = ctx
    this.logger = logger
    this.runtime = runtime
    this.allowedAgentPresets = new Set(allowedAgentPresets.filter(value => typeof value === 'string' && value))
    this.legacyAgentPresets = new Set(legacyAgentPresets.filter(value => typeof value === 'string' && value))
    this.pendingThreads = new Map()
    this.resumedThreads = new Set()
    this.toolSignatures = new Map()
    this.activeTurns = new Map()
    this.requestListener = request => {
      void this.handleServerRequest(request).catch(error => {
        this.client.respondError(request.id, -32000, error instanceof Error ? error.message : String(error))
      })
    }
    this.client.on('serverRequest', this.requestListener)
  }

  dispose() {
    this.client.off('serverRequest', this.requestListener)
  }

  providerInfo() {
    return { id: CODEX_PROVIDER, name: 'Codex App Server' }
  }

  threadRoute() {
    return this.runtime ? { modelProvider: this.runtime.provider, config: this.runtime.config } : {}
  }

  assertThreadRoute(result) {
    if (this.runtime && result.modelProvider !== this.runtime.provider) {
      throw new Error('Codex Thread returned a foreign model provider; execution refused')
    }
  }

  async listModels() {
    await this.ready
    return (await readCodexModels(this.client)).map(model => codexModelInfo(CODEX_PROVIDER, model))
  }

  async resolveModel(provider, model) {
    await this.ready
    const raw = (await readCodexModels(this.client)).find(candidate => candidate.id === model)
    if (!raw && this.runtime) throw new Error('Model is not in the Aezy-owned Codex catalog; no personal fallback is permitted')
    return codexModelInfo(provider, raw ?? { id: model })
  }

  assertAllowedPreset(options) {
    if (this.allowedAgentPresets.size === 0 && this.legacyAgentPresets.size === 0) return
    const sessionId = String(options.sessionId ?? '')
    if (!sessionId) throw new Error('Codex provider requires a DSH sessionId before checking its Agent mode')
    const agent = this.ctx.agents.get(sessionId)
    if (!agent) throw new Error(`Codex adapter could not find live DSH Session ${sessionId}`)
    const preset = agent.session.header.agentPreset
    if (this.allowedAgentPresets.has(preset) || this.legacyAgentPresets.has(preset)) return
    throw new Error(
      `provider ${CODEX_PROVIDER} is unavailable in Agent mode ${String(preset ?? '(none)')}; use codex-app-server`,
    )
  }

  async ensureThread(sessionId, cwd, model, permissions, dynamicTools) {
    const key = String(sessionId)
    const pending = this.pendingThreads.get(key)
    if (pending !== undefined) return pending
    const operation = this.ensureThreadOnce(key, cwd, model, permissions, dynamicTools)
      .finally(() => this.pendingThreads.delete(key))
    this.pendingThreads.set(key, operation)
    return operation
  }

  async ensureThreadOnce(sessionId, cwd, model, permissions, dynamicTools) {
    await this.ready
    const signature = JSON.stringify(dynamicTools)
    const binding = this.bindings.get(sessionId)
    if (binding !== null) {
      if (this.runtime && binding.runtimeId !== this.runtime.id) {
        throw new Error('Codex Thread belongs to a different or legacy runtime. Binding preserved; create a new isolated Session.')
      }
      if (binding.cwd !== cwd) {
        throw new Error(`Codex binding cwd mismatch for DSH Session ${sessionId}: expected ${binding.cwd}, got ${cwd}`)
      }
      if (!this.resumedThreads.has(binding.threadId) || this.toolSignatures.get(binding.threadId) !== signature) {
        try {
          const resumed = await this.client.request('thread/resume', {
            ...this.threadRoute(),
            threadId: binding.threadId,
            cwd,
            dynamicTools,
            developerInstructions: DSH_TOOL_INSTRUCTIONS,
          })
          this.assertThreadRoute(resumed)
        } catch (error) {
          throw new Error(`Could not resume Codex Thread ${binding.threadId}; the binding was preserved`, { cause: error })
        }
        this.resumedThreads.add(binding.threadId)
        this.toolSignatures.set(binding.threadId, signature)
      }
      return binding.threadId
    }
    const result = await this.client.request('thread/start', {
      cwd,
      model,
      config: { 'features.realtime_conversation': false },
      ...this.threadRoute(),
      approvalsReviewer: 'user',
      approvalPolicy: permissions.approvalPolicy,
      permissions: ':read-only',
      runtimeWorkspaceRoots: [],
      dynamicTools,
      developerInstructions: DSH_TOOL_INSTRUCTIONS,
      serviceName: 'aezy_dsh',
      threadSource: 'aezy',
      ephemeral: false,
    })
    this.assertThreadRoute(result)
    const threadId = result.thread?.id
    if (typeof threadId !== 'string' || !threadId) throw new Error('Codex thread/start returned no thread id')
    await this.bindings.set(sessionId, { threadId, cwd, model, ...(this.runtime ? { runtimeId: this.runtime.id } : {}) })
    this.resumedThreads.add(threadId)
    this.toolSignatures.set(threadId, signature)
    return threadId
  }

  async *stream(options) {
    this.assertAllowedPreset(options)
    if (options.purpose) {
      yield* this.streamAuxiliary(options)
      return
    }
    const sessionId = String(options.sessionId ?? '')
    if (!sessionId) throw new Error('Codex adapter requires a DSH sessionId')
    const agent = this.ctx.agents.get(sessionId)
    if (!agent) throw new Error(`Codex adapter could not find live DSH Session ${sessionId}`)
    const cwd = agent.session.header.cwd
    const permissions = permissionConfiguration(agent.session.snapshotEvents())
    const dynamicTools = codexDynamicTools(options.tools ?? [])
    const threadId = await this.ensureThread(sessionId, cwd, options.model, permissions, dynamicTools)
    const boundary = currentBoundary(agent.session)
    const queue = new ActivityQueue(options.signal)
    const listener = message => {
      const owner = message.params?.threadId ?? message.params?.thread?.id
      if (owner === threadId) queue.push(message)
    }
    this.client.on('notification', listener)
    const active = {
      token: Symbol('codex-turn'),
      sessionId,
      threadId,
      turnId: null,
      agent,
      boundary,
      model: options.model,
      signal: options.signal,
      activities: new Map(),
      toolNames: new Set((options.tools ?? []).map(tool => tool.name)),
    }
    this.activeTurns.set(threadId, active)
    let turnId = null
    try {
      const started = await this.client.request('turn/start', {
        threadId,
        input: [{ type: 'text', text: latestInput(options.messages), text_elements: [] }],
        cwd,
        approvalPolicy: permissions.approvalPolicy,
        approvalsReviewer: 'user',
        permissions: ':read-only',
        runtimeWorkspaceRoots: [],
        developerInstructions: DSH_TOOL_INSTRUCTIONS,
        model: options.model,
        effort: options.reasoningEffort ?? null,
        summary: 'none',
      }, { timeoutMs: 60_000 })
      turnId = started.turn?.id
      if (typeof turnId !== 'string' || !turnId) throw new Error('Codex turn/start returned no turn id')
      active.turnId = turnId
      const state = createStreamState()
      let completed = null
      while (completed === null) {
        const message = await queue.next()
        const params = message.params ?? {}
        if (params.turnId && params.turnId !== turnId) continue
        if (message.method === 'item/reasoning/summaryTextDelta' || message.method === 'item/reasoning/textDelta') {
          for (const chunk of textDelta(state, params.itemId, 'reasoning', params.delta ?? '')) yield chunk
        } else if (message.method === 'item/agentMessage/delta') {
          for (const chunk of textDelta(state, params.itemId, 'text', params.delta ?? '')) yield chunk
        } else if (message.method === 'item/completed') {
          for (const chunk of this.completeItem(active, state, params.item)) yield chunk
        } else if (message.method === 'turn/completed' && params.turn?.id === turnId) {
          for (const item of params.turn.items ?? []) {
            for (const chunk of this.completeItem(active, state, item)) yield chunk
          }
          completed = params.turn
        }
      }
      for (const block of state.blocks.values()) {
        if (!block.closed) yield { type: 'block-end', index: block.index, block: { type: block.type, text: block.text } }
      }
      if (completed.status === 'failed') {
        yield { type: 'finish', reason: { kind: 'error', failure: {
          message: completed.error?.message ?? 'Codex turn failed', code: 'CODEX_TURN_FAILED',
        } } }
      } else {
        yield { type: 'finish', reason: { kind: 'stop' }, replayState: { threadId, turnId } }
      }
    } catch (error) {
      if (options.signal?.aborted) {
        if (turnId !== null) await this.client.request('turn/interrupt', { threadId, turnId }).catch(() => {})
        yield { type: 'finish', reason: { kind: 'aborted', failure: { message: 'Codex turn cancelled', code: 'ABORTED' } } }
        return
      }
      throw error
    } finally {
      if (this.activeTurns.get(threadId)?.token === active.token) this.activeTurns.delete(threadId)
      this.client.off('notification', listener)
      queue.finish(new Error('Codex turn stream disposed'))
    }
  }

  *completeItem(active, state, item) {
    if (!item?.id || state.completed.has(item.id)) return
    state.completed.add(item.id)
    if (item.type === 'reasoning') {
      yield* completeText(state, item, 'reasoning', [...item.summary ?? [], ...item.content ?? []].join('\n\n'))
    } else if (item.type === 'agentMessage') {
      yield* completeText(state, item, 'text', item.text ?? '')
    } else if (item.type === 'commandExecution' || item.type === 'fileChange') {
      this.completeActivity(active, item)
    }
  }

  ensureActivityCall(active, item, fallbackId, requestedCallId) {
    const descriptor = activityDescriptor(item, fallbackId)
    const existing = active.activities.get(descriptor.id)
    if (existing !== undefined) return existing
    const callId = requestedCallId ?? `codex:${active.turnId ?? 'pending'}:${descriptor.id}`
    const assistant = createAssistantMessage({
      content: [{ type: 'tool-call', id: callId, name: descriptor.toolName, arguments: descriptor.arguments }],
      source: { provider: CODEX_PROVIDER, model: active.model },
    })
    active.agent.session.append('assistant/message', {
      ...active.boundary,
      message: assistant,
    }, { surfaceOp: 'append' })
    const call = active.agent.session.append('tool/call', {
      ...active.boundary,
      callId,
      name: descriptor.toolName,
      arguments: descriptor.arguments,
    })
    const projected = { descriptor, callId, callSeq: call.seq, completed: false }
    active.activities.set(descriptor.id, projected)
    return projected
  }

  completeActivity(active, item) {
    const projected = this.ensureActivityCall(active, item, item.id)
    if (projected.completed) return
    projected.completed = true
    const descriptor = activityDescriptor(item, item.id)
    const message = createToolResultMessage({
      callId: projected.callId,
      content: [{ type: 'text', text: descriptor.resultText }],
      isError: descriptor.isError,
    })
    active.agent.session.append('tool/result', {
      ...active.boundary,
      message,
      ...(descriptor.isError ? { error: { name: 'CodexActivityError', code: 'CODEX_ACTIVITY_FAILED' } } : {}),
      meta: {
        ...descriptor.meta,
        aezyCodex: { threadId: active.threadId, turnId: active.turnId, itemId: descriptor.id, type: descriptor.type },
      },
    }, { surfaceOp: 'append', sourceEventSeqs: [projected.callSeq] })
  }

  async handleServerRequest(request) {
    if (request.method === 'item/tool/call' || request.method === 'item/dynamicTool/call') {
      await this.handleDynamicTool(request)
      return
    }
    if (!isApprovalRequest(request.method)) {
      this.client.respondError(request.id, -32601, `Unsupported Codex interaction ${request.method}`)
      return
    }
    const threadId = request.params?.threadId
    const active = typeof threadId === 'string' ? this.activeTurns.get(threadId) : null
    if (!active || (request.params?.turnId && active.turnId && request.params.turnId !== active.turnId)) {
      this.respondApproval(request, false)
      return
    }
    const item = itemFromApproval(request)
    this.ensureActivityCall(active, item, `request-${request.id}`)
    // Native escalation would leave the DSH tool/Security boundary. It is
    // deliberately fail-closed; the model can retry through the dsh namespace.
    this.respondApproval(request, false)
    if (request.method === 'item/permissions/requestApproval') {
      this.completeActivity(active, {
        id: item.id,
        type: 'permissions',
        permissions: request.params?.permissions,
        allowed: false,
      })
    }
  }

  async handleDynamicTool(request) {
    const threadId = request.params?.threadId
    const active = typeof threadId === 'string' ? this.activeTurns.get(threadId) : null
    const namespace = request.params?.namespace
    const tool = typeof request.params?.tool === 'string' ? request.params.tool : request.params?.tool?.name
    const callId = request.params?.callId ?? `codex-request-${request.id}`
    const itemId = request.params?.itemId ?? callId
    const args = request.params?.arguments ?? request.params?.input ?? {}
    if (!active || (request.params?.turnId && active.turnId && request.params.turnId !== active.turnId)
      || namespace !== 'dsh' || typeof tool !== 'string' || !active.toolNames.has(tool)) {
      this.respondDynamicTool(request.id, false, `DSH tool request is unavailable or stale: ${String(tool ?? 'unknown')}`)
      return
    }
    const projected = this.ensureActivityCall(active, {
      id: itemId,
      type: 'dynamicTool',
      toolName: tool,
      arguments: args,
      resultText: '',
      isError: false,
    }, itemId, callId)
    const result = await active.agent.ctx.tools.execute({
      callId: projected.callId,
      name: tool,
      arguments: args,
      agent: active.agent,
      signal: active.signal,
    })
    const text = toolResultText(result)
    this.completeDynamicActivity(active, projected, result, text)
    if (this.activeTurns.get(threadId)?.token !== active.token) {
      this.respondDynamicTool(request.id, false, 'DSH Session ownership changed before the tool completed.')
      return
    }
    this.respondDynamicTool(request.id, !result.isError, text)
  }

  completeDynamicActivity(active, projected, result, text) {
    if (projected.completed) return
    projected.completed = true
    const message = createToolResultMessage({
      callId: projected.callId,
      content: result.content ?? [{ type: 'text', text }],
      isError: result.isError,
    })
    const resultMeta = result.meta !== null && typeof result.meta === 'object' && !Array.isArray(result.meta)
      ? result.meta : {}
    active.agent.session.append('tool/result', {
      ...active.boundary,
      message,
      ...(result.error?.info ? { error: result.error.info } : {}),
      meta: {
        ...resultMeta,
        aezyCodex: {
          threadId: active.threadId,
          turnId: active.turnId,
          itemId: projected.descriptor.id,
          type: 'dynamicTool',
        },
      },
    }, { surfaceOp: 'append', sourceEventSeqs: [projected.callSeq] })
  }

  respondDynamicTool(id, success, text) {
    this.client.respond(id, {
      success,
      contentItems: [{ type: 'inputText', text: boundedText(text) }],
    })
  }

  respondApproval(request, allowed) {
    if (request.method === 'item/permissions/requestApproval') {
      this.client.respond(request.id, { permissions: allowed ? request.params?.permissions ?? {} : {}, scope: 'turn' })
    } else this.client.respond(request.id, { decision: allowed ? 'accept' : 'decline' })
  }

  async *streamAuxiliary(options) {
    await this.ready
    const sessionId = String(options.sessionId ?? '')
    const cwd = this.ctx.agents.get(sessionId)?.session.header.cwd ?? process.cwd()
    const thread = await this.client.request('thread/start', {
      ...this.threadRoute(),
      cwd,
      model: options.model,
      approvalPolicy: 'never',
      approvalsReviewer: 'user',
      permissions: ':read-only',
      runtimeWorkspaceRoots: [],
      baseInstructions: options.system ?? null,
      serviceName: 'aezy_dsh_auxiliary',
      threadSource: 'aezy',
      ephemeral: true,
    })
    this.assertThreadRoute(thread)
    const threadId = thread.thread?.id
    const queue = new ActivityQueue(options.signal)
    const listener = message => {
      if ((message.params?.threadId ?? message.params?.thread?.id) === threadId) queue.push(message)
    }
    this.client.on('notification', listener)
    let turnId = null
    try {
      const started = await this.client.request('turn/start', {
        threadId,
        input: [{ type: 'text', text: auxiliaryInput(options.messages), text_elements: [] }],
        cwd,
        approvalPolicy: 'never',
        approvalsReviewer: 'user',
        sandboxPolicy: { type: 'readOnly' },
        model: options.model,
        effort: options.reasoningEffort ?? null,
        summary: 'none',
      }, { timeoutMs: 60_000 })
      turnId = started.turn?.id
      const state = createStreamState()
      let completed = null
      while (completed === null) {
        const message = await queue.next()
        const params = message.params ?? {}
        if (params.turnId && params.turnId !== turnId) continue
        if (message.method === 'item/agentMessage/delta') {
          for (const chunk of textDelta(state, params.itemId, 'text', params.delta ?? '')) yield chunk
        } else if (message.method === 'item/completed' && params.item?.type === 'agentMessage') {
          for (const chunk of completeText(state, params.item, 'text', params.item.text ?? '')) yield chunk
        } else if (message.method === 'turn/completed' && params.turn?.id === turnId) completed = params.turn
      }
      yield completed.status === 'failed'
        ? { type: 'finish', reason: { kind: 'error', failure: { message: completed.error?.message ?? 'Codex auxiliary turn failed', code: 'CODEX_AUXILIARY_FAILED' } } }
        : { type: 'finish', reason: { kind: 'stop' } }
    } finally {
      this.client.off('notification', listener)
      queue.finish(new Error('Codex auxiliary stream disposed'))
      if (threadId) await this.client.request('thread/unsubscribe', { threadId }).catch(() => {})
    }
  }
}

function isApprovalRequest(method) {
  return method === 'item/commandExecution/requestApproval'
    || method === 'item/fileChange/requestApproval'
    || method === 'item/permissions/requestApproval'
    || method === 'execCommandApproval'
    || method === 'applyPatchApproval'
}

function toolResultText(result) {
  const text = (result.content ?? []).map(block => block.type === 'text' ? block.text : JSON.stringify(block)).filter(Boolean).join('\n')
  if (text) return boundedText(text)
  if (!result.isError && result.value !== undefined) return boundedText(typeof result.value === 'string' ? result.value : JSON.stringify(result.value))
  return result.isError ? result.error?.message ?? 'DSH tool failed' : 'DSH tool completed.'
}

function approvalReason(request) {
  const command = request.params?.command
  if (Array.isArray(command)) return command.join(' ')
  if (typeof command === 'string' && command.trim()) return command.trim()
  return request.params?.reason ?? 'Codex requires permission to continue.'
}

function itemFromApproval(request) {
  const id = request.params?.itemId ?? `request-${request.id}`
  if (request.method.includes('fileChange') || request.method === 'applyPatchApproval') {
    return { id, type: 'fileChange', changes: request.params?.changes ?? [{ path: request.params?.path, kind: { type: 'update' }, diff: '' }] }
  }
  if (request.method.includes('permissions')) {
    return { id, type: 'permissions', permissions: request.params?.permissions, allowed: false }
  }
  return { id, type: 'commandExecution', command: request.params?.command ?? approvalReason(request), status: 'inProgress' }
}
