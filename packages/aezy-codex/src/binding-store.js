import { readFileSync } from 'node:fs'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'

function emptyDocument() {
  return { version: 1, bindings: {} }
}

function validateSessionId(sessionId) {
  const key = String(sessionId)
  if (!key || key.length > 256 || key.includes('\0')) throw new Error('DSH sessionId is invalid')
  return key
}

function validateRecord(sessionId, value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Codex binding for ${sessionId} must be an object`)
  }
  if (typeof value.threadId !== 'string' || value.threadId.length === 0) {
    throw new Error(`Codex binding for ${sessionId} has no threadId`)
  }
  if (typeof value.cwd !== 'string' || value.cwd.length === 0) {
    throw new Error(`Codex binding for ${sessionId} has no cwd`)
  }
  return Object.freeze({
    threadId: value.threadId,
    cwd: value.cwd,
    ...(typeof value.model === 'string' && value.model ? { model: value.model } : {}),
  })
}

function readDocument(file) {
  let value
  try {
    value = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return emptyDocument()
    throw new Error(`Could not read Aezy Codex bindings at ${file}: ${error.message}`, { cause: error })
  }
  if (value?.version !== 1 || value.bindings === null
    || typeof value.bindings !== 'object' || Array.isArray(value.bindings)) {
    throw new Error(`Unsupported Aezy Codex binding document at ${file}`)
  }
  return {
    version: 1,
    bindings: Object.fromEntries(Object.entries(value.bindings).map(
      ([sessionId, record]) => [validateSessionId(sessionId), validateRecord(sessionId, record)],
    )),
  }
}

/** Minimal durable mapping from DSH Session identity to an opaque Codex Thread identity. */
export class CodexBindingStore {
  constructor(file) {
    if (typeof file !== 'string' || !file) throw new Error('Codex binding file is required')
    this.file = file
    this.document = readDocument(file)
    this.writeQueue = Promise.resolve()
  }

  get(sessionId) {
    const record = this.document.bindings[String(sessionId)]
    return record === undefined ? null : structuredClone(record)
  }

  entries() {
    return Object.entries(this.document.bindings).map(([sessionId, record]) => [sessionId, structuredClone(record)])
  }

  async set(sessionId, record) {
    const key = validateSessionId(sessionId)
    const next = validateRecord(key, record)
    this.document.bindings[key] = next
    this.writeQueue = this.writeQueue.then(() => writeFileAtomic(
      this.file,
      `${JSON.stringify(this.document, null, 2)}\n`,
      { mode: 0o600, dirMode: 0o700 },
    ))
    await this.writeQueue
    return structuredClone(next)
  }
}
