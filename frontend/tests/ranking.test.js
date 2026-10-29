import test from 'node:test'
import assert from 'node:assert/strict'
import { createPlayId, makeSubmission } from '../src/utils/rankingApi.js'
test('HTTP LAN play IDs are UUIDs without requiring randomUUID', () => {
  const ids = new Set(Array.from({ length: 100 }, createPlayId))
  assert.equal(ids.size, 100)
  for (const id of ids) assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/)
})
test('separate game modes and sum are registered once with shared play identity', () => {
  const id = createPlayId()
  assert.deepEqual(makeSubmission(id, 'course', ' 名前 ', 40, 100), { playId: id, mode: 'course', name: '名前', score: 40, courseScore: 40, typingScore: null })
  assert.equal(makeSubmission(id, 'typing', '名前', 40, 100).score, 100)
  assert.equal(makeSubmission(id, 'typing', '名前', 40, 100).courseScore, null)
  assert.equal(makeSubmission(id, 'sequential', '名前', 40, 100).score, 140)
  assert.throws(() => makeSubmission(id, 'sequential', '名前', 40, null))
})
test('invalid names and scores are not sent', () => {
  for (const name of ['', ' ', 'a\nb', 'あいうえおかきくけこさしす']) assert.throws(() => makeSubmission('id', 'course', name, 10, null))
  for (const n of [-1, 1.5, NaN, Infinity, 1000001]) assert.throws(() => makeSubmission('id', 'course', '名前', n, null))
  assert.throws(() => makeSubmission('id', 'unknown', '名前', 10, null))
})
