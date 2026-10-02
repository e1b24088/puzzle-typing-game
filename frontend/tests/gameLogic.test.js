import test from 'node:test'
import assert from 'node:assert/strict'
import data from '../src/data/gameData.json' with { type: 'json' }
import { makeSlots, scorePuzzle, selectQuestions, checkTypingKey, normalizeSelections, canSelectSubject, canUnlockSentence, typingMetrics, pickLearningTip } from '../src/utils/gameLogic.js'
test('18 slots, Wednesday two periods, fixed courses counted without selection', () => {
  const slots = makeSlots(data.subjects)
  assert.equal(slots.length, 18)
  assert.equal(slots.filter(s => s.day === '水').length, 2)
  const result = scorePuzzle(slots, {}, data.subjects, data.attributes, 10)
  assert.equal(result.earnedPoints, 4)
  assert.equal(result.bonus, 0)
})
test('reselecting a slot replaces points and invalid selections are ignored', () => {
  const slots = [{ id: 'a', fixed: false, candidates: ['database', 'project'] }]
  const first = scorePuzzle(slots, { a: 'database' }, data.subjects, data.attributes, 10)
  const second = scorePuzzle(slots, { a: 'project' }, data.subjects, data.attributes, 10)
  assert.equal(first.attributeScores.technology, 2)
  assert.equal(second.attributeScores.technology, 0)
  assert.equal(second.attributeScores.management, 2)
  assert.equal(scorePuzzle(slots, { a: 'business' }, data.subjects, data.attributes, 10).score, 0)
})
test('duplicate courses earn points only once', () => {
  const slots = [{ id: 'a', candidates: ['database'] }, { id: 'b', candidates: ['database'] }]
  const result = scorePuzzle(slots, { a: 'database', b: 'database' }, data.subjects,
    [{ id: 'technology', clearScore: 4 }, { id: 'management', clearScore: 0 }, { id: 'strategy', clearScore: 0 }], 10)
  assert.equal(result.score, 2)
  assert.deepEqual(result.selectedSubjectIds, ['database'])
})
test('fixed courses are reserved before optional selections and slots are reusable after clearing', () => {
  const slots = makeSlots(data.subjects)
  const flexible = slots.find(s => !s.fixed)
  const other = slots.filter(s => !s.fixed)[1]
  assert.equal(canSelectSubject(slots, {}, flexible.id, 'database'), false)
  assert.equal(canSelectSubject(slots, {}, flexible.id, 'network'), true)
  assert.equal(canSelectSubject(slots, { [flexible.id]: 'network' }, other.id, 'network'), false)
  assert.equal(canSelectSubject(slots, {}, other.id, 'network'), true)
  const normalized = normalizeSelections(slots, { [flexible.id]: 'programming' })
  assert.equal(normalized[flexible.id], undefined)
})
test('all attribute targets remain achievable with distinct courses', () => {
  const slots = makeSlots(data.subjects)
  const fixed = slots.filter(s => s.fixed).map(s => s.candidates[0])
  const selected = []
  for (const attribute of data.attributes) {
    const candidates = data.subjects.filter(s => s.attributeId === attribute.id)
    selected.push(...candidates.slice(0, attribute.clearScore / 2).map(s => s.id))
  }
  const optional = selected.filter(id => !fixed.includes(id))
  const selections = Object.fromEntries(slots.filter(s => !s.fixed).slice(0, optional.length).map((s, i) => [s.id, optional[i]]))
  const result = scorePuzzle(slots, selections, data.subjects, data.attributes, data.settings.allAttributesBonus)
  assert.equal(result.allCleared, true)
  assert.equal(result.bonus, 10)
  assert.equal(result.score, 42)
})
test('sentence challenge requires time, clean streak, accuracy and speed together', () => {
  const settings = data.settings.sentenceChallenge
  assert.equal(canUnlockSentence(20, 0, 10, 3, settings), true)
  assert.equal(canUnlockSentence(20, 0, 9, 3, settings), false)
  assert.equal(canUnlockSentence(20, 0, 10, 2, settings), false)
  assert.equal(canUnlockSentence(20, 10, 10, 3, settings), false)
  assert.equal(canUnlockSentence(5, 0, 10, 3, settings), false)
  assert.deepEqual(typingMetrics(10, 2, 10), { accuracy: 83, cpm: 60 })
})
test('learning tips stay linked to subjects and do not repeat consecutively', () => {
  const first = pickLearningTip(data.subjects, ['database'], '', () => 0)
  const second = pickLearningTip(data.subjects, ['database'], first.id, () => 0)
  assert.equal(first.subjectName, 'データベース')
  assert.notEqual(first.id, second.id)
})
test('content IDs are unique; each course has word, sentence and explanation', () => {
  assert.equal(new Set(data.subjects.map(s => s.id)).size, data.subjects.length)
  assert.equal(new Set(data.questions.map(q => q.id)).size, data.questions.length)
  for (const s of data.subjects) {
    assert.ok(s.description && s.gameConnection && s.learningTips.length >= 2)
    for (const kind of ['word', 'sentence']) {
      const q = data.questions.find(q => q.subjectId === s.id && q.kind === kind)
      assert.ok(q && q.explanation && /^[a-z0-9 -]+$/.test(q.romaji))
    }
  }
})
test('sequential questions belong to selected subjects, standalone uses entire pool', () => {
  assert.ok(selectQuestions(data.questions, 'sequential', ['database']).every(q => q.subjectId === 'database'))
  assert.equal(selectQuestions(data.questions, 'sequential', []).length, 0)
  assert.equal(selectQuestions(data.questions, 'select', []).length, data.questions.length)
  for (const s of data.subjects) assert.ok(data.questions.some(q => q.subjectId === s.id))
})
test('wrong key does not advance, uppercase accepted, final character completes question', () => {
  assert.deepEqual(checkTypingKey('abc', 0, 'x'), { correct: false, position: 0, completed: false })
  assert.equal(checkTypingKey('abc', 0, 'A').position, 1)
  assert.equal(checkTypingKey('abc', 2, 'c').completed, true)
  assert.equal(checkTypingKey('abc', 0, 'Enter').correct, false)
})
