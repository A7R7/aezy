import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('browser bundle registers the Security conversation view', async () => {
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.match(source, /@aezy\/security/u)
  assert.match(source, /conversation\.view/u)
  assert.match(source, /Security/u)
  assert.match(source, /aezy\/api\/security/u)
})
