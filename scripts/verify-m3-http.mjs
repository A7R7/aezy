import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const dshHome = await mkdtemp('/tmp/aezy-m3-dsh-home-')
const repository = await mkdtemp('/tmp/aezy-m3-repository-')
process.env.DSH_HOME = dshHome
process.env.TMPDIR = '/tmp'
process.env.TMP = '/tmp'
process.env.TEMP = '/tmp'

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

git(repository, 'init', '--quiet')
git(repository, 'config', 'user.name', 'Aezy M3 HTTP Test')
git(repository, 'config', 'user.email', 'aezy@example.invalid')
await writeFile(join(repository, 'tracked.txt'), 'base\n')
git(repository, 'add', 'tracked.txt')
git(repository, 'commit', '--quiet', '-m', 'base')
const base = git(repository, 'rev-parse', 'HEAD')

const { profileName, spawnDsh } = await import('./lib/profile.mjs')
await import('./sync-profile.mjs')

const port = await new Promise((resolve, reject) => {
  const probe = createServer()
  probe.once('error', reject)
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address()
    const selected = typeof address === 'object' && address ? address.port : 0
    probe.close(error => error ? reject(error) : resolve(selected))
  })
})
const baseUrl = `http://127.0.0.1:${port}`
let rpcSequence = 0

async function request(path, options = {}, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'X-Aezy-Client': 'web', ...options.headers },
    signal: AbortSignal.timeout(15000),
  })
  const body = await response.json()
  if (expectedStatus !== undefined) {
    assert.equal(response.status, expectedStatus, JSON.stringify(body))
    return body
  }
  if (!response.ok) throw new Error(`${response.status}: ${body.error}`)
  return body
}

function post(path, body, expectedStatus) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, expectedStatus)
}

async function rpc(method, payload) {
  rpcSequence += 1
  const rpcId = `m3-${Date.now().toString(36)}-${rpcSequence}`
  const response = await fetch(`${baseUrl}/api/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
    signal: AbortSignal.timeout(15000),
  })
  assert.equal(response.ok, true, `${method} transport failed with HTTP ${response.status}`)
  const envelope = await response.json()
  assert.equal(envelope.rpcId, rpcId)
  assert.equal(envelope.result?.ok, true, `${method}: ${JSON.stringify(envelope.result?.error)}`)
  return envelope.result.value
}

async function start() {
  const child = spawnDsh(['--profile', profileName, '--host', '127.0.0.1', '--port', String(port), '--no-open'])
  let output = ''
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`M3 host startup timed out\n${output}`)), 120000)
    const append = chunk => {
      output += chunk.toString()
      if (output.includes('dsh web:')) {
        clearTimeout(timer)
        resolve()
      }
    }
    child.stdout.on('data', append)
    child.stderr.on('data', append)
    child.once('exit', code => {
      clearTimeout(timer)
      reject(new Error(`M3 host exited during startup with ${code}\n${output}`))
    })
  })
  return child
}

async function stop(child) {
  child.kill('SIGTERM')
  if (child.exitCode !== null) return
  await new Promise(resolve => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve() }, 10000)
    child.once('exit', () => { clearTimeout(timer); resolve() })
  })
}

let child
let managedRoot
try {
  child = await start()
  const created = await post('/aezy/api/project/worktrees/create', {
    cwd: repository,
    name: 'http-slice',
    base,
    confirmDirty: false,
  })
  const worktree = created.worktree
  assert.equal(worktree.branch, 'aezy/http-slice')
  assert.equal(worktree.base, base)

  const project = await request(`/aezy/api/project?${new URLSearchParams({ cwd: worktree.path })}`)
  assert.equal(project.environment.kind, 'worktree')
  assert.equal(project.repository.head, base)

  const workspace = await rpc('workspace.create', { path: worktree.path })
  assert.equal(workspace.workspace.path, worktree.path)
  const firstSessionId = `m3-http-first-${Date.now().toString(36)}`
  await rpc('session.create', {
    workspaceId: workspace.workspace.workspaceId,
    sessionId: firstSessionId,
    agentPreset: 'aezy',
  })
  const firstList = await rpc('session.list', {})
  assert.equal(firstList.items.find(item => item.sessionId === firstSessionId)?.cwd, worktree.path)
  await post('/aezy/api/project/worktrees/bind', {
    cwd: worktree.path,
    worktreeId: worktree.id,
    sessionId: firstSessionId,
  })

  await post('/aezy/api/project/worktrees/handoff', {
    cwd: worktree.path,
    sessionId: firstSessionId,
    instructions: 'The first Session established the isolated environment.',
    validations: [{ command: 'git status --short', status: 'passed', summary: 'Initially clean.' }],
  })
  await post('/aezy/api/project/worktrees/cleanup', {
    cwd: repository,
    worktreeId: worktree.id,
  }, 409)

  await writeFile(join(worktree.path, 'tracked.txt'), 'dirty\n')
  await rpc('workspace.archiveSession', { sessionId: firstSessionId })
  await post('/aezy/api/project/worktrees/release', {
    cwd: worktree.path,
    worktreeId: worktree.id,
    sessionId: firstSessionId,
  })
  await post('/aezy/api/project/worktrees/cleanup', {
    cwd: repository,
    worktreeId: worktree.id,
  }, 409)

  const secondSessionId = `m3-http-second-${Date.now().toString(36)}`
  await rpc('session.create', {
    workspaceId: workspace.workspace.workspaceId,
    sessionId: secondSessionId,
    agentPreset: 'aezy',
  })
  await post('/aezy/api/project/worktrees/bind', {
    cwd: worktree.path,
    worktreeId: worktree.id,
    sessionId: secondSessionId,
  })
  git(worktree.path, 'add', 'tracked.txt')
  git(worktree.path, 'commit', '--quiet', '-m', 'M3 HTTP change')
  const head = git(worktree.path, 'rev-parse', 'HEAD')
  const final = await post('/aezy/api/project/worktrees/handoff', {
    cwd: worktree.path,
    sessionId: secondSessionId,
    instructions: 'Continue from the retained aezy/http-slice branch at the exact recorded head.',
    validations: [{ command: 'git status --short', status: 'passed', summary: 'Clean after commit.' }],
  })
  assert.equal(final.handoff.git.clean, true)
  assert.equal(final.handoff.git.head, head)
  assert.equal(final.handoff.git.commitsAheadOfBase, 1)
  const persisted = await request(`/aezy/api/project/worktrees/handoff?${new URLSearchParams({
    cwd: repository,
    handoffId: final.handoff.id,
  })}`)
  assert.equal(persisted.instructions, final.handoff.instructions)

  await rpc('workspace.archiveSession', { sessionId: secondSessionId })
  await post('/aezy/api/project/worktrees/release', {
    cwd: worktree.path,
    worktreeId: worktree.id,
    sessionId: secondSessionId,
  })
  const cleaned = await post('/aezy/api/project/worktrees/cleanup', {
    cwd: repository,
    worktreeId: worktree.id,
  })
  assert.equal(cleaned.branchRetained, 'aezy/http-slice')
  assert.equal(git(repository, 'show-ref', '--verify', 'refs/heads/aezy/http-slice').split(/\s+/u)[0], head)
  await assert.rejects(() => access(worktree.path), /ENOENT/u)

  const registry = await request(`/aezy/api/project/worktrees?${new URLSearchParams({ cwd: repository })}`)
  managedRoot = registry.managedRoot
  assert.equal(registry.worktrees.find(item => item.id === worktree.id)?.state, 'cleaned')
  const securityState = JSON.parse(await readFile(join(dshHome, 'aezy', 'security.json'), 'utf8'))
  const audited = new Set(securityState.audit.map(item => item.tool))
  for (const tool of [
    'aezy.project.worktree.create',
    'aezy.project.worktree.bind',
    'aezy.project.worktree.handoff',
    'aezy.project.worktree.release',
    'aezy.project.worktree.cleanup',
  ]) assert.equal(audited.has(tool), true, `missing Security audit for ${tool}; saw ${JSON.stringify([...audited])}`)

  const fenced = await fetch(`${baseUrl}/aezy/api/project/worktrees?${new URLSearchParams({ cwd: repository })}`)
  assert.equal(fenced.status, 403)
  process.stdout.write('M3 real DSH HTTP Worktree Session, handoff, fail-closed cleanup, retained branch, and Security audit passed.\n')
} finally {
  if (child !== undefined) await stop(child)
  if (managedRoot !== undefined) await rm(managedRoot, { recursive: true, force: true })
  await rm(dshHome, { recursive: true, force: true })
  await rm(repository, { recursive: true, force: true })
}
