import assert from 'node:assert/strict'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import {
  auditRecord,
  apply,
  classifyAction,
  evaluatePolicy,
  normalizeRule,
  PolicyStore,
  simpleShellTokens,
} from '../src/index.js'

function state(overrides = {}) {
  return {
    version: 1,
    network: { default: 'ask', repositories: {}, ...overrides.network },
    rules: overrides.rules ?? [],
    audit: [],
  }
}

test('simple command parser rejects composition and expansion', () => {
  assert.deepEqual(simpleShellTokens('git status --short'), ['git', 'status', '--short'])
  assert.deepEqual(simpleShellTokens('curl "https://example.com/a b"'), ['curl', 'https://example.com/a b'])
  for (const command of ['git status && curl example.com', 'echo $TOKEN', 'cat < input', 'echo `whoami`']) {
    assert.equal(simpleShellTokens(command), null, command)
  }
})

test('network classifier distinguishes required, possible, and known-local actions', () => {
  assert.equal(classifyAction('web_search', { query: 'Aezy' }, '.').network, 'required')
  assert.equal(classifyAction('bash', { command: 'pnpm install' }, '.').network, 'required')
  assert.equal(classifyAction('bash', { command: 'my-local-compiler build' }, '.').network, 'possible')
  assert.equal(classifyAction('bash', { command: 'git diff -- README.md' }, '.').network, 'none')
  assert.equal(classifyAction('read', { path: 'README.md' }, '.').network, 'none')
  assert.equal(classifyAction('grep', { pattern: 'Aezy' }, '.').network, 'none')
  assert.equal(classifyAction('notion_create_page', {}, '.').network, 'possible')
})

test('deny rules and Network deny outrank persistent allows', () => {
  const action = classifyAction('bash', { command: 'curl https://example.com' }, '.')
  const allowed = normalizeRule({ effect: 'allow', scope: 'global', tool: 'bash', commandPrefix: 'curl' })
  assert.equal(evaluatePolicy(state({ network: { default: 'deny' }, rules: [{ id: 'allow', ...allowed }] }), action).decision, 'deny')
  const denied = normalizeRule({ effect: 'deny', scope: 'global', tool: 'bash', commandPrefix: 'curl' })
  assert.equal(evaluatePolicy(state({ network: { default: 'allow' }, rules: [
    { id: 'allow', ...allowed }, { id: 'deny', ...denied },
  ] }), action).ruleId, 'deny')
})

test('a simple allow prefix bypasses Network ask but never matches a chain', () => {
  const rule = { id: 'curl-rule', ...normalizeRule({
    effect: 'allow', scope: 'global', tool: 'bash', commandPrefix: 'curl https://api.example.com',
  }) }
  const policy = state({ rules: [rule] })
  assert.equal(evaluatePolicy(policy, classifyAction('bash', {
    command: 'curl https://api.example.com/v1',
  }, '.')).decision, 'ask')
  assert.equal(evaluatePolicy(policy, classifyAction('bash', {
    command: 'curl https://api.example.com --silent',
  }, '.')).decision, 'allow')
  assert.equal(evaluatePolicy(policy, classifyAction('bash', {
    command: 'curl https://api.example.com && sh payload',
  }, '.')).decision, 'ask')
})

test('repository rules apply only to their canonical repository', () => {
  const first = mkdtempSync('/tmp/aezy-security-repo-a-')
  const second = mkdtempSync('/tmp/aezy-security-repo-b-')
  try {
    mkdirSync(join(first, '.git'))
    mkdirSync(join(second, '.git'))
    const nested = join(first, 'packages', 'example')
    mkdirSync(nested, { recursive: true })
    const rule = { id: 'repo-deny', ...normalizeRule({
      effect: 'deny', scope: 'repository', tool: 'bash', commandPrefix: 'git push', cwd: nested,
    }, nested) }
    assert.equal(rule.repositoryRoot, first)
    const policy = state({ network: { default: 'allow' }, rules: [rule] })
    assert.equal(evaluatePolicy(policy, classifyAction('bash', { command: 'git push' }, nested)).decision, 'deny')
    assert.equal(evaluatePolicy(policy, classifyAction('bash', { command: 'git push' }, second)).decision, 'allow')
  } finally {
    rmSync(first, { recursive: true, force: true })
    rmSync(second, { recursive: true, force: true })
  }
})

test('allow rules reject unsafe shell prefixes at creation time', () => {
  assert.throws(() => normalizeRule({
    effect: 'allow', scope: 'global', tool: 'bash', commandPrefix: 'pnpm test && curl example.com',
  }), /one simple command/u)
})

test('policy store persists rules, repository network mode, redacted audit, and approval outcome', async () => {
  const directory = mkdtempSync('/tmp/aezy-security-store-')
  const repository = mkdtempSync('/tmp/aezy-security-repository-')
  const file = join(directory, 'nested', 'security.json')
  try {
    mkdirSync(join(repository, '.git'))
    const store = new PolicyStore(file)
    await store.setNetwork({ mode: 'deny', scope: 'repository', cwd: repository })
    await store.addRule({ effect: 'ask', scope: 'repository', tool: 'bash', commandPrefix: 'git push', cwd: repository })
    const action = classifyAction('bash', { command: 'API_TOKEN=secret curl https://user:pass@example.com' }, repository)
    await store.appendAudit(auditRecord({
      action,
      verdict: { decision: 'ask', source: 'network', explanation: 'test' },
      sessionId: 'session-1',
      turn: 1,
      callId: 'call-1',
    }))
    await store.settleApproval({ sessionId: 'session-1', callId: 'call-1', outcome: 'allowed-once' })

    const reloaded = new PolicyStore(file).snapshot(repository)
    assert.equal(reloaded.network.effective, 'deny')
    assert.equal(reloaded.rules.length, 1)
    assert.equal(reloaded.audit[0].outcome, 'allowed-once')
    assert.match(reloaded.audit[0].commandPreview, /<redacted>/u)
    assert.doesNotMatch(JSON.stringify(reloaded), /secret|user:pass/u)
    assert.equal(statSync(file).mode & 0o777, 0o600)
    assert.equal(statSync(join(directory, 'nested')).mode & 0o777, 0o700)
    await rm(repository, { recursive: true, force: true })
    assert.doesNotThrow(() => new PolicyStore(file), 'a stale deleted repository must not brick Aezy startup')
  } finally {
    chmodSync(directory, 0o700)
    await rm(directory, { recursive: true, force: true })
    await rm(repository, { recursive: true, force: true })
  }
})

test('corrupt policy state fails closed instead of resetting silently', async () => {
  const directory = mkdtempSync('/tmp/aezy-security-corrupt-')
  const file = join(directory, 'security.json')
  try {
    const valid = new PolicyStore(file)
    await valid.setNetwork({ mode: 'deny', scope: 'global', cwd: directory })
    const value = JSON.parse(readFileSync(file, 'utf8'))
    value.network.repositories[directory] = 'surprise'
    await writeFile(file, JSON.stringify(value))
    assert.throws(() => new PolicyStore(file), /unsupported/u)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('DSH pre-execute integration asks before network access and preserves downstream denial', async () => {
  const directory = mkdtempSync('/tmp/aezy-security-gate-')
  const repository = mkdtempSync('/tmp/aezy-security-gate-repo-')
  const listeners = new Map()
  let guard
  let service
  const ctx = {
    webServer: { register: () => () => {} },
    tools: { guard: value => { guard = value; return () => {} } },
    logger: { warn: () => {} },
    effect: callback => callback(),
    on: (name, listener) => { listeners.set(name, listener); return () => {} },
    provide: (name, value) => { if (name === 'aezySecurity') service = value },
  }
  try {
    apply(ctx, { file: join(directory, 'security.json') })
    const exec = {
      name: 'bash',
      arguments: { command: 'curl https://example.com' },
      callId: 'call-1',
      agent: {
        session: {
          id: 'session-1',
          header: { cwd: repository },
          events: [{ type: 'turn/start', data: { turn: 3 } }],
        },
      },
    }
    const preExecute = listeners.get('tools/pre-execute')
    assert.equal(typeof preExecute, 'function')
    assert.deepEqual(await preExecute(exec, async () => ({ kind: 'allow' })), {
      kind: 'ask',
      reason: 'Network Policy is ask; bash is classified as required network access.',
    })
    assert.equal(guard(exec), undefined)
    assert.deepEqual(await preExecute({ ...exec, callId: 'call-2' }, async () => ({
      kind: 'deny', reason: 'downstream sandbox denied',
    })), { kind: 'deny', reason: 'downstream sandbox denied' })
    const persisted = JSON.parse(readFileSync(join(directory, 'security.json'), 'utf8'))
    assert.equal(persisted.audit.length, 2)
    assert.equal(persisted.audit[0].turn, 3)
    await service.auditUserAction({
      tool: 'aezy.project.revert',
      cwd: repository,
      sessionId: 'session-1',
      turn: 3,
      callId: 'receipt-1',
      explanation: 'confirmed',
    })
    const withUserAction = JSON.parse(readFileSync(join(directory, 'security.json'), 'utf8'))
    assert.equal(withUserAction.audit.at(-1).source, 'user-confirmation')
  } finally {
    rmSync(directory, { recursive: true, force: true })
    rmSync(repository, { recursive: true, force: true })
  }
})
