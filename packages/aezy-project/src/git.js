import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, readFile, realpath } from 'node:fs/promises'
import { basename, isAbsolute, relative, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import { countStructuredLines, parseUnifiedDiff } from './diff.js'

const execFileAsync = promisify(execFile)
const MAX_GIT_BYTES = 4 * 1024 * 1024
const MAX_BLOB_BYTES = 8 * 1024 * 1024
const MAX_DIFF_BYTES = 2 * 1024 * 1024
const GIT_TIMEOUT_MS = 15_000

export async function git(cwd, args, allowedExitCodes = [0]) {
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
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`git ${args[0] ?? ''} failed: ${message}`)
  }
}

/** Read one validated Git blob without UTF-8 coercion for historical Turn diffs. */
export async function readGitBlob(cwd, object) {
  if (typeof object !== 'string' || !/^[a-f0-9]{40,64}$/u.test(object)) {
    throw new Error('Git blob id is invalid')
  }
  try {
    const result = await execFileAsync('git', ['--no-optional-locks', 'cat-file', 'blob', object], {
      cwd,
      encoding: null,
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: MAX_BLOB_BYTES,
      windowsHide: true,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' },
    })
    return result.stdout
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`git cat-file failed: ${message}`)
  }
}

function validCwd(value) {
  return typeof value === 'string' && value !== '' && !value.includes('\0') && isAbsolute(value)
}

export async function repositoryFor(cwd) {
  const repository = await optionalRepositoryFor(cwd)
  if (repository.root === null) throw new Error('cwd is not inside a Git repository')
  return repository
}

/** Resolve a workspace and discover its optional containing Git repository. */
export async function optionalRepositoryFor(cwd) {
  if (!validCwd(cwd)) throw new Error('cwd must be a non-empty absolute path')
  const canonicalCwd = await realpath(cwd)
  const top = await git(canonicalCwd, ['rev-parse', '--show-toplevel'], [0, 128])
  if (top.code === 128 && /not a git repository/u.test(top.stderr)) {
    return { cwd: canonicalCwd, root: null }
  }
  if (top.code !== 0) {
    throw new Error(`git rev-parse failed: ${top.stderr.trim() || `exit ${top.code}`}`)
  }
  const root = await realpath(top.stdout.trim())
  const rel = relative(root, canonicalCwd)
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error('cwd is outside the discovered repository')
  }
  return { cwd: canonicalCwd, root }
}

export function safeRelativePath(root, path) {
  if (typeof path !== 'string' || path === '' || path.includes('\0') || isAbsolute(path)) {
    throw new Error('path must be a non-empty repository-relative path')
  }
  const normalized = relative(root, resolve(root, path))
  if (normalized === '..' || normalized.startsWith(`..${sep}`) || isAbsolute(normalized)
    || normalized === '.git' || normalized.startsWith(`.git${sep}`)) {
    throw new Error('path escapes the repository worktree')
  }
  return normalized
}

function splitStatusRecords(raw) {
  return raw.split('\0').filter(Boolean)
}

function statusCode(value) {
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
        indexStatus: statusCode(xy[0]),
        worktreeStatus: statusCode(xy[1]),
        headMode: parts[3],
        indexMode: parts[4],
        worktreeMode: parts[5],
        headHash: parts[6],
        indexHash: parts[7],
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
        indexStatus: statusCode(xy[0]),
        worktreeStatus: statusCode(xy[1]),
        headMode: parts[3],
        indexMode: parts[4],
        worktreeMode: parts[5],
        headHash: parts[6],
        indexHash: parts[7],
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
        indexStatus: statusCode(xy[0]),
        worktreeStatus: statusCode(xy[1]),
      })
      continue
    }
    throw new Error(`unknown porcelain v2 record: ${record}`)
  }
  return files.sort((left, right) => left.path.localeCompare(right.path))
}

export async function optionalGit(cwd, args) {
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
  const repository = await optionalRepositoryFor(cwd)
  if (repository.root === null) {
    const [gitVersion, packageManager] = await Promise.all([
      optionalGit(repository.cwd, ['--version']),
      packageManagerAt(repository.cwd),
    ])
    return {
      version: 1,
      project: {
        name: basename(repository.cwd),
        cwd: repository.cwd,
        root: repository.cwd,
        environment: 'local',
      },
      repository: {
        available: false,
        branch: null,
        detached: false,
        head: null,
        upstream: null,
        ahead: 0,
        behind: 0,
        clean: true,
      },
      environment: {
        kind: 'local',
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        git: gitVersion ?? null,
        shell: process.env.SHELL ? basename(process.env.SHELL) : null,
        packageManager: packageManager ?? null,
        gitDir: null,
        commonDir: null,
      },
      files: [],
    }
  }
  const status = await git(repository.root, ['status', '--porcelain=v2', '--branch', '-z', '--untracked-files=all'])
  const files = parsePorcelainV2(status.stdout)
  const [branch, head, upstream, gitVersion, packageManager, gitDir, commonDir] = await Promise.all([
    optionalGit(repository.root, ['symbolic-ref', '--quiet', '--short', 'HEAD']),
    optionalGit(repository.root, ['rev-parse', 'HEAD']),
    optionalGit(repository.root, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']),
    optionalGit(repository.root, ['--version']),
    packageManagerAt(repository.root),
    gitMetadataRoot(repository.root),
    gitCommonMetadataRoot(repository.root),
  ])
  const environmentKind = gitDir === commonDir ? 'local' : 'worktree'
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
      environment: environmentKind,
    },
    repository: {
      available: true,
      branch: branch ?? null,
      detached: branch === undefined,
      head: head ?? null,
      upstream: upstream ?? null,
      ahead,
      behind,
      clean: files.length === 0,
    },
    environment: {
      kind: environmentKind,
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      git: gitVersion ?? null,
      shell: process.env.SHELL ? basename(process.env.SHELL) : null,
      packageManager: packageManager ?? null,
      gitDir,
      commonDir,
    },
    files,
  }
}

function fileFromProject(project, path) {
  const normalized = safeRelativePath(project.project.root, path)
  const row = project.files.find(file => file.path === normalized)
  if (row === undefined) throw new Error('path is not present in the current Git status')
  return { normalized, row }
}

async function hashWorktreePath(root, path) {
  const absolute = resolve(root, path)
  let info
  try {
    info = await lstat(absolute)
  } catch (error) {
    if (error?.code === 'ENOENT') return { kind: 'missing' }
    throw error
  }
  if (!info.isFile()) return { kind: info.isSymbolicLink() ? 'symlink' : 'unsupported', mode: info.mode & 0o777 }
  const hash = createHash('sha256')
  await new Promise((resolveStream, reject) => {
    const stream = createReadStream(absolute)
    stream.on('data', chunk => hash.update(chunk))
    stream.once('error', reject)
    stream.once('end', resolveStream)
  })
  return { kind: 'file', hash: hash.digest('hex'), size: info.size, mode: info.mode & 0o777 }
}

export async function indexEntry(root, path) {
  const result = await git(root, ['ls-files', '--stage', '-z', '--', path])
  const record = result.stdout.split('\0').find(Boolean)
  if (record === undefined) return { kind: 'missing' }
  const match = /^(\d+) ([a-f0-9]+) (\d+)\t([\s\S]+)$/u.exec(record)
  if (match === null || match[3] !== '0') return { kind: 'unsupported' }
  return { kind: 'tracked', mode: match[1], blob: match[2] }
}

export async function treeEntry(root, ref, path) {
  if (ref === null || ref === undefined) return { kind: 'missing' }
  const result = await git(root, ['ls-tree', '-z', ref, '--', path])
  const record = result.stdout.split('\0').find(Boolean)
  if (record === undefined) return { kind: 'missing' }
  const match = /^(\d+) blob ([a-f0-9]+)\t([\s\S]+)$/u.exec(record)
  if (match === null) return { kind: 'unsupported' }
  return { kind: 'tracked', mode: match[1], blob: match[2] }
}

export async function fingerprintPath(root, path, row) {
  const normalized = safeRelativePath(root, path)
  const [worktree, index] = await Promise.all([
    hashWorktreePath(root, normalized),
    indexEntry(root, normalized),
  ])
  if (worktree.kind === 'missing' && index.kind === 'missing') return null
  return createHash('sha256').update(JSON.stringify({
    path: normalized,
    row: row ?? null,
    worktree,
    index,
  })).digest('hex')
}

export async function snapshotChangedFiles(cwd) {
  const project = await describeProject(cwd)
  if (project.repository.available === false) return { project, states: new Map() }
  const states = new Map(await Promise.all(project.files.map(async row => [
    row.path,
    { row, fingerprint: await fingerprintPath(project.project.root, row.path, row) },
  ])))
  return { project, states }
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
  if (!info.isFile() || info.size > MAX_DIFF_BYTES) return { diff: '', binary: true }
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
  const stagedPart = parseUnifiedDiff(stagedBound.value, { truncated: stagedBound.truncated })
  const worktreePart = parseUnifiedDiff(worktreeBound.value, { truncated: worktreeBound.truncated })
  const stagedStats = countStructuredLines(stagedPart)
  const worktreeStats = countStructuredLines(worktreePart)
  const status = row.kind === 'renamed' ? 'renamed'
    : row.kind === 'untracked' || row.indexStatus === 'A' || row.worktreeStatus === 'A' ? 'added'
      : row.indexStatus === 'D' || row.worktreeStatus === 'D' ? 'deleted'
        : binary ? 'binary' : 'modified'
  const fingerprint = await fingerprintPath(project.project.root, normalized, row)
  return {
    version: 2,
    source: {
      kind: 'working',
      label: 'Working changes',
      repositoryRoot: project.project.root,
      fingerprint,
    },
    identity: `working\0${project.project.root}\0${normalized}\0${fingerprint}`,
    file: {
      path: normalized,
      oldPath: row.originalPath ?? (status === 'added' ? null : normalized),
      newPath: status === 'deleted' ? null : normalized,
      status,
      additions: binary || stagedStats.additions === null || worktreeStats.additions === null
        ? null : stagedStats.additions + worktreeStats.additions,
      deletions: binary || stagedStats.deletions === null || worktreeStats.deletions === null
        ? null : stagedStats.deletions + worktreeStats.deletions,
      binary,
      truncated: stagedBound.truncated || worktreeBound.truncated,
    },
    fingerprint,
    parts: [
      { scope: 'staged', label: 'Staged', ...stagedPart },
      { scope: 'worktree', label: 'Working tree', ...worktreePart },
    ],
  }
}

export async function gitMetadataRoot(root) {
  const value = await git(root, ['rev-parse', '--path-format=absolute', '--git-dir'])
  return realpath(value.stdout.trim())
}

/** Resolve the Git common metadata directory shared by every linked worktree. */
export async function gitCommonMetadataRoot(root) {
  const value = await git(root, ['rev-parse', '--path-format=absolute', '--git-common-dir'])
  return realpath(value.stdout.trim())
}
