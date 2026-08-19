import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstat, readFile, realpath } from 'node:fs/promises'
import { basename, isAbsolute, relative, resolve, sep } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const ROUTE = '/aezy/api/project'
const MAX_GIT_BYTES = 4 * 1024 * 1024
const MAX_DIFF_BYTES = 2 * 1024 * 1024
const GIT_TIMEOUT_MS = 15_000

export const inject = ['webServer']

function json(res, status, value) {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

async function git(cwd, args, allowedExitCodes = [0]) {
  try {
    const result = await execFileAsync('git', ['--no-optional-locks', ...args], {
      cwd,
      encoding: 'utf8',
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: MAX_GIT_BYTES,
      windowsHide: true,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' },
    })
    return { stdout: result.stdout, stderr: result.stderr, code: 0 }
  } catch (error) {
    const code = typeof error?.code === 'number' ? error.code : undefined
    if (code !== undefined && allowedExitCodes.includes(code)) {
      return { stdout: error.stdout ?? '', stderr: error.stderr ?? '', code }
    }
    throw new Error(`git ${args[0] ?? ''} failed: ${messageOf(error)}`)
  }
}

function validCwd(value) {
  return typeof value === 'string' && value !== '' && !value.includes('\0') && isAbsolute(value)
}

async function repositoryFor(cwd) {
  if (!validCwd(cwd)) throw new Error('cwd must be a non-empty absolute path')
  const canonicalCwd = await realpath(cwd)
  const top = await git(canonicalCwd, ['rev-parse', '--show-toplevel'])
  const root = await realpath(top.stdout.trim())
  const rel = relative(root, canonicalCwd)
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error('cwd is outside the discovered repository')
  }
  return { cwd: canonicalCwd, root }
}

function splitStatusRecords(raw) {
  return raw.split('\0').filter(Boolean)
}

function normalizeStatusCode(value) {
  return value === '.' ? ' ' : value
}

/** Parse Git porcelain v2 `-z` records into stable file rows. */
export function parsePorcelainV2(raw) {
  const records = splitStatusRecords(raw)
  const files = []
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (record.startsWith('# ')) continue
    if (record.startsWith('? ')) {
      files.push({ path: record.slice(2), kind: 'untracked', indexStatus: ' ', worktreeStatus: '?' })
      continue
    }
    if (record.startsWith('! ')) continue
    if (record.startsWith('1 ')) {
      const parts = record.split(' ')
      if (parts.length < 9) throw new Error(`unsupported porcelain record: ${record}`)
      const xy = parts[1]
      files.push({
        path: parts.slice(8).join(' '),
        kind: 'ordinary',
        indexStatus: normalizeStatusCode(xy[0]),
        worktreeStatus: normalizeStatusCode(xy[1]),
      })
      continue
    }
    if (record.startsWith('2 ')) {
      const parts = record.split(' ')
      if (parts.length < 10) throw new Error(`unsupported porcelain rename record: ${record}`)
      const xy = parts[1]
      const originalPath = records[index + 1]
      if (originalPath === undefined) throw new Error('rename record is missing its original path')
      index += 1
      files.push({
        path: parts.slice(9).join(' '),
        originalPath,
        kind: 'renamed',
        indexStatus: normalizeStatusCode(xy[0]),
        worktreeStatus: normalizeStatusCode(xy[1]),
      })
      continue
    }
    if (record.startsWith('u ')) {
      const parts = record.split(' ')
      if (parts.length < 11) throw new Error(`unsupported porcelain conflict record: ${record}`)
      const xy = parts[1]
      files.push({
        path: parts.slice(10).join(' '),
        kind: 'conflict',
        conflict: true,
        indexStatus: normalizeStatusCode(xy[0]),
        worktreeStatus: normalizeStatusCode(xy[1]),
      })
      continue
    }
    throw new Error(`unknown porcelain v2 record: ${record}`)
  }
  return files.sort((left, right) => left.path.localeCompare(right.path))
}

async function optionalGit(cwd, args) {
  const result = await git(cwd, args, [0, 1, 128])
  return result.code === 0 ? result.stdout.trim() : undefined
}

function packageManagerAt(root) {
  const candidates = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['package-lock.json', 'npm'],
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
  ]
  return Promise.all(candidates.map(async ([file, manager]) => {
    try {
      await lstat(resolve(root, file))
      return manager
    } catch {
      return undefined
    }
  })).then(values => values.find(Boolean))
}

export async function describeProject(cwd) {
  const repository = await repositoryFor(cwd)
  const status = await git(repository.root, ['status', '--porcelain=v2', '--branch', '-z', '--untracked-files=all'])
  const files = parsePorcelainV2(status.stdout)
  const [branch, head, upstream, gitVersion, packageManager] = await Promise.all([
    optionalGit(repository.root, ['symbolic-ref', '--quiet', '--short', 'HEAD']),
    optionalGit(repository.root, ['rev-parse', '--short=12', 'HEAD']),
    optionalGit(repository.root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']),
    optionalGit(repository.root, ['--version']),
    packageManagerAt(repository.root),
  ])
  let ahead = 0
  let behind = 0
  if (upstream !== undefined) {
    const counts = await optionalGit(repository.root, ['rev-list', '--left-right', '--count', `HEAD...${upstream}`])
    const [left, right] = counts?.split(/\s+/).map(Number) ?? []
    ahead = Number.isFinite(left) ? left : 0
    behind = Number.isFinite(right) ? right : 0
  }
  return {
    version: 1,
    project: {
      name: basename(repository.root),
      cwd: repository.cwd,
      root: repository.root,
      environment: 'local',
    },
    repository: {
      branch: branch ?? null,
      detached: branch === undefined,
      head: head ?? null,
      upstream: upstream ?? null,
      ahead,
      behind,
      clean: files.length === 0,
    },
    environment: {
      kind: 'local',
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      git: gitVersion ?? null,
      shell: process.env.SHELL ? basename(process.env.SHELL) : null,
      packageManager: packageManager ?? null,
    },
    files,
  }
}

function fileFromProject(project, path) {
  if (typeof path !== 'string' || path === '' || path.includes('\0') || isAbsolute(path)) {
    throw new Error('path must be a non-empty repository-relative path')
  }
  const normalized = relative(project.project.root, resolve(project.project.root, path))
  if (normalized === '..' || normalized.startsWith(`..${sep}`) || isAbsolute(normalized) || normalized === '.git' || normalized.startsWith(`.git${sep}`)) {
    throw new Error('path escapes the repository worktree')
  }
  const row = project.files.find(file => file.path === normalized)
  if (row === undefined) throw new Error('path is not present in the current Git status')
  return { normalized, row }
}

function addedFileDiff(path, text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  if (lines.at(-1) === '') lines.pop()
  return [
    `diff --git a/${path} b/${path}`,
    'new file mode 100644',
    '--- /dev/null',
    `+++ b/${path}`,
    `@@ -0,0 +1,${lines.length} @@`,
    ...lines.map(line => `+${line}`),
    '',
  ].join('\n')
}

async function untrackedDiff(root, path) {
  const absolute = resolve(root, path)
  const info = await lstat(absolute)
  if (info.isSymbolicLink()) return { diff: addedFileDiff(path, await readFile(absolute, 'utf8')), binary: false }
  if (!info.isFile()) return { diff: '', binary: true }
  if (info.size > MAX_DIFF_BYTES) return { diff: '', binary: true }
  const bytes = await readFile(absolute)
  if (bytes.includes(0)) return { diff: '', binary: true }
  return { diff: addedFileDiff(path, bytes.toString('utf8')), binary: false }
}

function boundedDiff(value) {
  if (Buffer.byteLength(value) <= MAX_DIFF_BYTES) return { value, truncated: false }
  const bytes = Buffer.from(value)
  return {
    value: `${bytes.subarray(0, MAX_DIFF_BYTES).toString('utf8')}\n\n[diff truncated by Aezy]\n`,
    truncated: true,
  }
}

export async function describeDiff(cwd, path) {
  const project = await describeProject(cwd)
  const { normalized, row } = fileFromProject(project, path)
  let staged = ''
  let worktree = ''
  let binary = false
  if (row.kind === 'untracked') {
    const result = await untrackedDiff(project.project.root, normalized)
    worktree = result.diff
    binary = result.binary
  } else {
    const [stagedResult, worktreeResult] = await Promise.all([
      git(project.project.root, ['diff', '--cached', '--no-ext-diff', '--no-color', '--unified=3', '--', normalized]),
      git(project.project.root, ['diff', '--no-ext-diff', '--no-color', '--unified=3', '--', normalized]),
    ])
    staged = stagedResult.stdout
    worktree = worktreeResult.stdout
    binary = /Binary files .* differ/u.test(staged) || /Binary files .* differ/u.test(worktree)
  }
  const stagedBound = boundedDiff(staged)
  const worktreeBound = boundedDiff(worktree)
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(row)).update('\0').update(staged).update('\0').update(worktree)
    .digest('hex')
  return {
    version: 1,
    project: project.project,
    repository: project.repository,
    file: row,
    staged: stagedBound.value,
    worktree: worktreeBound.value,
    binary,
    truncated: stagedBound.truncated || worktreeBound.truncated,
    fingerprint,
  }
}

function requireWebClient(req) {
  if (req.headers['x-aezy-client'] !== 'web') return false
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  const authority = req.headers.host
  if (typeof authority !== 'string') return false
  let host
  try {
    host = new URL(`http://${authority}`).hostname
  } catch {
    return false
  }
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '[::1]') return false
  const origin = req.headers.origin
  if (typeof origin === 'string') {
    try {
      const source = new URL(origin)
      if (source.protocol !== 'http:' || source.host !== authority) return false
    } catch {
      return false
    }
  }
  return true
}

async function handle(req, res) {
  if (!requireWebClient(req)) {
    json(res, 403, { error: 'This endpoint accepts only Aezy Web requests.' })
    return
  }
  if (req.method !== 'GET') {
    res.setHeader('allow', 'GET')
    json(res, 405, { error: 'Method not allowed.' })
    return
  }
  const url = new URL(req.url ?? '/', 'http://aezy.local')
  try {
    if (url.pathname === ROUTE) {
      json(res, 200, await describeProject(url.searchParams.get('cwd')))
      return
    }
    if (url.pathname === `${ROUTE}/diff`) {
      json(res, 200, await describeDiff(url.searchParams.get('cwd'), url.searchParams.get('path')))
      return
    }
    json(res, 404, { error: 'Unknown Aezy Project endpoint.' })
  } catch (error) {
    json(res, 400, { error: messageOf(error) })
  }
}

/** Register the M1 Project HTTP surface on DSH's public WebServer seam. */
export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE,
    handler: handle,
  }), 'aezy-project: repository API')
}
