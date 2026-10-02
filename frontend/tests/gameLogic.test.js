import test from 'node:test'
import assert from 'node:assert/strict'
import data from '../src/data/gameData.json' with { type: 'json' }
import { makeSlots, scorePuzzle, selectQuestions, checkTypingKey, normalizeSelections, canSelectSubject, canUnlockSentence, typingMetrics, pickLearningTip } from '../src/utils/gameLogic.js'
test('18 slots, Wednesday two periods, fixed courses counted without selection', () => {
  const slots = makeSlots(data.subjects, data.slots)
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
  const slots = makeSlots(data.subjects, data.slots)
  const flexible = slots.find(s => !s.fixed)
  const other = slots.find(s => !s.fixed && s.id !== flexible.id && s.candidates.includes('network'))
  assert.equal(canSelectSubject(slots, {}, flexible.id, 'database'), false)
  assert.equal(canSelectSubject(slots, {}, flexible.id, 'network'), true)
  assert.equal(canSelectSubject(slots, { [flexible.id]: 'network' }, other.id, 'network'), false)
  assert.equal(canSelectSubject(slots, {}, other.id, 'network'), true)
  const normalized = normalizeSelections(slots, { [flexible.id]: 'programming' })
  assert.equal(normalized[flexible.id], undefined)
})
test('all attribute targets remain achievable with distinct courses', () => {
  const slots = makeSlots(data.subjects, data.slots)
  const optional = slots.filter(s => !s.fixed)
  function findSchedule(index, selections) {
    const result = scorePuzzle(slots, selections, data.subjects, data.attributes, 10)
    if (result.allCleared) return selections
    const deficit = data.attributes.reduce((sum, a) => sum + Math.max(0, a.clearScore - result.attributeScores[a.id]), 0)
    if (index === optional.length || deficit > (optional.length - index) * 2) return null
    const slot = optional[index]
    const need = id => { const subject = data.subjects.find(s => s.id === id); const attr = data.attributes.find(a => a.id === subject.attributeId); return attr.clearScore - result.attributeScores[attr.id] }
    for (const id of [...slot.candidates].sort((a, b) => need(b) - need(a))) {
      if (!canSelectSubject(slots, selections, slot.id, id)) continue
      const found = findSchedule(index + 1, { ...selections, [slot.id]: id })
      if (found) return found
    }
    return null
  }
  const selections = findSchedule(0, {})
  assert.ok(selections, 'a valid three-candidate schedule must meet all targets')
  const result = scorePuzzle(slots, selections, data.subjects, data.attributes, data.settings.allAttributesBonus)
  assert.equal(result.allCleared, true)
  assert.equal(result.bonus, 10)
  assert.ok(result.score >= 42)
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

test('three candidates, repeated courses and uneven attribute choices create constraints', () => {
  const slots = makeSlots(data.subjects, data.slots), counts = new Map()
  for (const slot of slots) {
    assert.equal(slot.candidates.length, slot.fixed ? 1 : 3)
    for (const id of slot.candidates) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  assert.ok([...counts.values()].filter(count => count >= 2).length >= 16)
  for (const slot of slots.filter(s => !s.fixed)) {
    const attrs = new Set(slot.candidates.map(id => data.subjects.find(s => s.id === id).attributeId))
    assert.equal(attrs.size, 2, 'optional slots offer only two of the three attributes')
  }
  const optional = slots.find(s => !s.fixed), unavailable = data.subjects.find(s => !optional.candidates.includes(s.id))
  assert.equal(canSelectSubject(slots, {}, optional.id, unavailable.id), false)
  assert.equal(normalizeSelections(slots, { [optional.id]: unavailable.id })[optional.id], undefined)
})
test('invalid timetable is rejected', () => {
  assert.throws(() => makeSlots(data.subjects, undefined))
  const bad = structuredClone(data.slots)
  bad.find(s => !s.fixed).candidates[0] = 'unknown'
  assert.throws(() => makeSlots(data.subjects, bad))
})

test('all typing questions use romaji without whitespace', () => {
  for (const question of data.questions) assert.match(question.romaji, /^[a-z0-9-]+$/)
})
