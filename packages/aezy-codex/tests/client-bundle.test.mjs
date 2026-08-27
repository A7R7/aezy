import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const bundle = readFileSync(fileURLToPath(new URL('../lib/client.js', import.meta.url)), 'utf8')

test('client bundle registers the Codex settings section', () => {
  assert.match(bundle, /@aezy\/codex/u)
  assert.match(bundle, /settings\.section/u)
  assert.match(bundle, /data-aezy-codex-settings/u)
})

test('client bundle keeps OAuth in the official external-browser flow', () => {
  assert.match(bundle, /login\/start/u)
  assert.match(bundle, /chatgpt/u)
  assert.match(bundle, /noopener,noreferrer/u)
  assert.doesNotMatch(bundle, /access[_-]?token/iu)
  assert.doesNotMatch(bundle, /refresh[_-]?token/iu)
})
