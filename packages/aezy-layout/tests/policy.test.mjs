import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CHAT_MIN_RATIO, DETAILS_MAX_RATIO, clampDetailsWidth, columnLimits, parsePixelTracks,
} from '../src/policy.js'

test('conversation floor is one quarter of the conversation+details region', () => {
  const limits = columnLimits(1440, 280)
  assert.deepEqual(limits, {
    frame: 1440,
    sidebar: 280,
    content: 1160,
    chatMin: 290,
    detailsMin: 300,
    detailsMax: 870,
  })
  assert.equal(CHAT_MIN_RATIO, 0.25)
  assert.equal(DETAILS_MAX_RATIO, 0.75)
  assert.ok(limits.detailsMax > limits.content / 2)
  assert.ok(limits.detailsMax > limits.frame / 2)
})

test('details drag clamps to the proportional ceiling instead of the upstream 520px ceiling', () => {
  assert.equal(clampDetailsWidth(2_000, 1440, 280), 870)
  assert.equal(clampDetailsWidth(700, 1440, 280), 700)
  assert.equal(clampDetailsWidth(100, 1440, 280), 300)
})

test('collapsed sidebar leaves three quarters of the content region to details', () => {
  const limits = columnLimits(1440, 56)
  assert.equal(limits.chatMin, 346)
  assert.equal(limits.detailsMax, 1038)
  assert.equal(limits.chatMin + limits.detailsMax + limits.sidebar, 1440)
})

test('track parsing is strict and fail-soft', () => {
  assert.deepEqual(parsePixelTracks('280px 640px 520px'), { sidebar: 280, center: 640, details: 520 })
  assert.deepEqual(parsePixelTracks('56px 346.5px 1037.5px'), { sidebar: 56, center: 346.5, details: 1037.5 })
  assert.equal(parsePixelTracks('56px minmax(0, 1fr) 360px'), null)
  assert.equal(parsePixelTracks('not-grid-tracks'), null)
})
