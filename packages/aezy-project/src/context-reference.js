const DIRECTORY_SCHEME = 'aezy-directory:'
const DIFF_SCHEME = 'aezy-diff:'
const MAX_ID_CHARS = 256
const MAX_PATH_CHARS = 8_192

function encodeUtf8(value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

function decodeUtf8(value) {
  const padding = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4))
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + padding)
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

function validIdentity(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_CHARS && !value.includes('\0')
}

function validPath(value, allowEmpty = false) {
  return typeof value === 'string' && value.length <= MAX_PATH_CHARS && !value.includes('\0')
    && (allowEmpty || value.length > 0)
}

function normalizeReference(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || value.version !== 1
    || !validIdentity(value.sessionId) || !validPath(value.cwd)) {
    throw new Error('Aezy project reference has an invalid identity')
  }
  if (value.kind === 'directory' && validPath(value.path, true)) {
    return { version: 1, kind: 'directory', sessionId: value.sessionId, cwd: value.cwd, path: value.path }
  }
  if (value.kind === 'diff' && value.source === 'working') {
    return { version: 1, kind: 'diff', source: 'working', sessionId: value.sessionId, cwd: value.cwd }
  }
  if (value.kind === 'diff' && value.source === 'turn' && Number.isSafeInteger(value.turn) && value.turn > 0) {
    return { version: 1, kind: 'diff', source: 'turn', sessionId: value.sessionId, cwd: value.cwd, turn: value.turn }
  }
  throw new Error('Aezy project reference has an invalid target')
}

export function encodeProjectReference(reference) {
  const normalized = normalizeReference(reference)
  const scheme = normalized.kind === 'directory' ? DIRECTORY_SCHEME : DIFF_SCHEME
  return `${scheme}${encodeUtf8(JSON.stringify(normalized))}`
}

export function decodeProjectReference(uri) {
  if (typeof uri !== 'string') throw new Error('Aezy project reference URI must be text')
  const scheme = uri.startsWith(DIRECTORY_SCHEME) ? DIRECTORY_SCHEME
    : uri.startsWith(DIFF_SCHEME) ? DIFF_SCHEME : null
  if (scheme === null) throw new Error('Aezy project reference URI has an unknown scheme')
  const payload = uri.slice(scheme.length)
  if (!/^[A-Za-z0-9_-]+$/u.test(payload)) throw new Error('Aezy project reference URI is malformed')
  let parsed
  try {
    parsed = JSON.parse(decodeUtf8(payload))
  } catch (error) {
    throw new Error('Aezy project reference URI is malformed', { cause: error })
  }
  const normalized = normalizeReference(parsed)
  if (encodeProjectReference(normalized) !== uri) throw new Error('Aezy project reference URI is not canonical')
  if ((scheme === DIRECTORY_SCHEME) !== (normalized.kind === 'directory')) {
    throw new Error('Aezy project reference URI scheme does not match its target')
  }
  return normalized
}

export function formatProjectReferenceMention(reference, label) {
  if (typeof label !== 'string' || label.length === 0 || label.includes('\0')) {
    throw new Error('Aezy project reference label must be non-empty text')
  }
  const escaped = label.replace(/[\\\]]/gu, match => `\\${match}`)
  return `@[${escaped}](${encodeProjectReference(reference)})`
}

export function parseProjectReferenceText(text) {
  if (typeof text !== 'string') throw new Error('Aezy project reference input must be text')
  const references = []
  const pattern = /@\[((?:\\.|[^\\\]])*)\]\(((?:aezy-directory|aezy-diff):[^\s)]*)\)|((?:aezy-directory|aezy-diff):[A-Za-z0-9_-]+)/gu
  const rendered = text.replace(pattern, (_match, rawLabel, markdownUri, bareUri) => {
    const uri = markdownUri ?? bareUri
    const reference = decodeProjectReference(uri)
    const label = rawLabel === undefined
      ? reference.kind === 'directory' ? `directory:${reference.path || '.'}`
        : reference.source === 'working' ? 'diff:working' : `diff:turn-${reference.turn}`
      : rawLabel.replace(/\\(.)/gu, '$1')
    references.push({ ...reference, label })
    return `@${label}`
  })
  return { text: rendered, references }
}

export const projectReferenceSchemes = Object.freeze({ directory: DIRECTORY_SCHEME, diff: DIFF_SCHEME })
