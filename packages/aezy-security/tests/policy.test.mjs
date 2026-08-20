import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import {
  auditRecord,
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
  assert.equal(classifyAction('read_file', { path: 'README.md' }, '.').network, 'none')
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
    const rule = { id: 'repo-deny', ...normalizeRule({
      effect: 'deny', scope: 'repository', tool: 'bash', commandPrefix: 'git push', cwd: first,
    }, first) }
    const policy = state({ network: { default: 'allow' }, rules: [rule] })
    assert.equal(evaluatePolicy(policy, classifyAction('bash', { command: 'git push' }, first)).decision, 'deny')
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
    value.network.default = 'surprise'
    await writeFile(file, JSON.stringify(value))
    assert.throws(() => new PolicyStore(file), /unsupported/u)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
