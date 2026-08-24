import { createHash } from 'node:crypto'
import { lstat, open, readdir, realpath } from 'node:fs/promises'
import { extname, isAbsolute, relative, resolve, sep } from 'node:path'

const MAX_DIRECTORY_ENTRIES = 500
const MAX_TEXT_BYTES = 256 * 1024
const MAX_TEXT_LINES = 4_000
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx', '.markdown'])
const LANGUAGE_BY_EXTENSION = new Map([
  ['.bash', 'bash'], ['.c', 'c'], ['.cc', 'cpp'], ['.cjs', 'javascript'], ['.cpp', 'cpp'],
  ['.css', 'css'], ['.go', 'go'], ['.h', 'c'], ['.hpp', 'cpp'], ['.html', 'html'],
  ['.ini', 'ini'], ['.java', 'java'], ['.js', 'javascript'], ['.json', 'json'],
  ['.jsonc', 'jsonc'], ['.jsx', 'jsx'], ['.kt', 'kotlin'], ['.kts', 'kotlin'],
  ['.less', 'less'], ['.lua', 'lua'], ['.mjs', 'javascript'], ['.php', 'php'],
  ['.ps1', 'powershell'], ['.py', 'python'], ['.rb', 'ruby'], ['.rs', 'rust'],
  ['.sass', 'sass'], ['.scss', 'scss'], ['.sh', 'bash'], ['.sql', 'sql'],
  ['.svelte', 'svelte'], ['.swift', 'swift'], ['.toml', 'toml'], ['.ts', 'typescript'],
  ['.tsx', 'tsx'], ['.vue', 'vue'], ['.xml', 'xml'], ['.yaml', 'yaml'], ['.yml', 'yaml'],
  ['.zsh', 'bash'],
])

function validCwd(value) {
  return typeof value === 'string' && value !== '' && !value.includes('\0') && isAbsolute(value)
}

function normalizeRequestedPath(root, value, allowRoot) {
  if (typeof value !== 'string' || value.includes('\0') || isAbsolute(value)) {
    throw new Error('path must be workspace-relative')
  }
  const normalized = relative(root, resolve(root, value))
  if ((!allowRoot && normalized === '') || normalized === '..' || normalized.startsWith(`..${sep}`)
    || isAbsolute(normalized) || normalized === '.git' || normalized.startsWith(`.git${sep}`)) {
    throw new Error('path escapes the workspace or addresses private Git metadata')
  }
  return normalized
}

async function workspacePath(cwd, path, allowRoot = false) {
  if (!validCwd(cwd)) throw new Error('cwd must be a non-empty absolute path')
  const root = await realpath(cwd)
  const rootInfo = await lstat(root)
  if (!rootInfo.isDirectory()) throw new Error('cwd must resolve to a directory')
  const normalized = normalizeRequestedPath(root, path, allowRoot)
  const absolute = normalized === '' ? root : resolve(root, normalized)
  const canonical = await realpath(absolute)
  const canonicalRelative = relative(root, canonical)
  if (canonicalRelative === '..' || canonicalRelative.startsWith(`..${sep}`) || isAbsolute(canonicalRelative)) {
    throw new Error('path resolves outside the workspace')
  }
  if (canonical !== absolute) throw new Error('symbolic-link paths are not previewed')
  return { root, path: normalized, absolute }
}

function entryKind(entry) {
  if (entry.isDirectory()) return 'directory'
  if (entry.isFile()) return 'file'
  if (entry.isSymbolicLink()) return 'symlink'
  return 'unsupported'
}

/** List one workspace directory without building or persisting a file index. */
export async function describeDirectory(cwd, path = '') {
  const target = await workspacePath(cwd, path, true)
  const info = await lstat(target.absolute)
  if (!info.isDirectory()) throw new Error('path is not a directory')
  const allEntries = (await readdir(target.absolute, { withFileTypes: true }))
    .filter(entry => entry.name !== '.git' && !entry.name.includes('\0'))
    .map(entry => ({
      name: entry.name,
      path: target.path === '' ? entry.name : `${target.path}/${entry.name}`,
      kind: entryKind(entry),
    }))
    .sort((left, right) => {
      const leftDirectory = left.kind === 'directory' ? 0 : 1
      const rightDirectory = right.kind === 'directory' ? 0 : 1
      return leftDirectory - rightDirectory || left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    })
  return {
    version: 1,
    fingerprint: createHash('sha256').update(JSON.stringify({
      directory: target.path,
      entries: allEntries,
      truncated: allEntries.length > MAX_DIRECTORY_ENTRIES,
    })).digest('hex'),
    workspaceRoot: target.root,
    directory: target.path,
    entries: allEntries.slice(0, MAX_DIRECTORY_ENTRIES),
    truncated: allEntries.length > MAX_DIRECTORY_ENTRIES,
    totalEntries: allEntries.length,
  }
}

function imageMime(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png'
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return 'image/gif'
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  if (buffer.length >= 2 && buffer.subarray(0, 2).toString('ascii') === 'BM') return 'image/bmp'
  if (buffer.length >= 4 && buffer[0] === 0 && buffer[1] === 0 && buffer[2] === 1 && buffer[3] === 0) return 'image/x-icon'
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp'
    && ['avif', 'avis'].includes(buffer.subarray(8, 12).toString('ascii'))) return 'image/avif'
  return null
}

async function readWindow(path, limit) {
  const handle = await open(path, 'r')
  try {
    const buffer = Buffer.allocUnsafe(limit)
    const { bytesRead } = await handle.read(buffer, 0, limit, 0)
    return buffer.subarray(0, bytesRead)
  } finally {
    await handle.close()
  }
}

function decodeUtf8(buffer, truncated) {
  let end = buffer.length
  while (end >= Math.max(0, buffer.length - 4)) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, end))
    } catch {
      if (!truncated) break
      end -= 1
    }
  }
  return null
}

function contentLines(content) {
  const lines = content.replace(/\r\n/gu, '\n').replace(/\r/gu, '\n').split('\n')
  if (lines.at(-1) === '') lines.pop()
  return lines
}

function languageFor(path) {
  const name = path.split('/').at(-1)?.toLowerCase() ?? ''
  if (name === 'dockerfile') return 'dockerfile'
  if (name === 'makefile') return 'makefile'
  return LANGUAGE_BY_EXTENSION.get(extname(name)) ?? null
}

/** Read one current workspace file into a bounded code, Markdown, image, or binary preview DTO. */
export async function describePreview(cwd, path) {
  const target = await workspacePath(cwd, path)
  const info = await lstat(target.absolute)
  if (!info.isFile()) throw new Error('path is not a regular file')

  const imageProbe = await readWindow(target.absolute, Math.min(info.size, 32))
  const mime = imageMime(imageProbe)
  if (mime !== null) {
    if (info.size > MAX_IMAGE_BYTES) {
      return {
        version: 1, identity: `${target.root}\0${target.path}\0${info.size}\0${info.mtimeMs}`,
        workspaceRoot: target.root, path: target.path, name: target.path.split('/').at(-1),
        kind: 'image', size: info.size, fingerprint: null, truncated: true, mime, dataUrl: null,
        message: `Image exceeds the ${MAX_IMAGE_BYTES} byte preview limit.`,
      }
    }
    const buffer = await readWindow(target.absolute, info.size)
    const fingerprint = createHash('sha256').update(buffer).digest('hex')
    return {
      version: 1, identity: `${target.root}\0${target.path}\0${fingerprint}`,
      workspaceRoot: target.root, path: target.path, name: target.path.split('/').at(-1),
      kind: 'image', size: info.size, fingerprint, truncated: false, mime,
      dataUrl: `data:${mime};base64,${buffer.toString('base64')}`,
    }
  }

  const byteTruncated = info.size > MAX_TEXT_BYTES
  const buffer = await readWindow(target.absolute, Math.min(info.size, MAX_TEXT_BYTES))
  const content = decodeUtf8(buffer, byteTruncated)
  if (content === null || buffer.subarray(0, Math.min(buffer.length, 8_192)).includes(0)) {
    return {
      version: 1, identity: `${target.root}\0${target.path}\0${info.size}\0${info.mtimeMs}`,
      workspaceRoot: target.root, path: target.path, name: target.path.split('/').at(-1),
      kind: 'binary', size: info.size, fingerprint: null, truncated: byteTruncated,
      message: 'This binary file cannot be represented as a safe text preview.',
    }
  }

  const allLines = contentLines(content)
  const lineTruncated = allLines.length > MAX_TEXT_LINES
  const lines = allLines.slice(0, MAX_TEXT_LINES)
  const renderedContent = lines.join('\n')
  const truncated = byteTruncated || lineTruncated
  const fingerprint = createHash('sha256').update(buffer).digest('hex')
  const markdown = MARKDOWN_EXTENSIONS.has(extname(target.path).toLowerCase())
  return {
    version: 1, identity: `${target.root}\0${target.path}\0${fingerprint}\0${truncated ? 'partial' : 'full'}`,
    workspaceRoot: target.root, path: target.path, name: target.path.split('/').at(-1),
    kind: markdown ? 'markdown' : 'code', size: info.size, fingerprint,
    truncated, content: renderedContent, lines,
    totalLines: truncated ? null : allLines.length,
    language: markdown ? 'markdown' : languageFor(target.path),
    ...(truncated ? { message: `Preview is bounded to ${MAX_TEXT_BYTES} bytes and ${MAX_TEXT_LINES} lines.` } : {}),
  }
}

export const previewLimits = Object.freeze({
  directoryEntries: MAX_DIRECTORY_ENTRIES,
  textBytes: MAX_TEXT_BYTES,
  textLines: MAX_TEXT_LINES,
  imageBytes: MAX_IMAGE_BYTES,
})
