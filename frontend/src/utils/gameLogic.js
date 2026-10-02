export function makeSlots(subjects) {
  if (subjects.length < 2) throw new Error('2科目以上必要です')
  const days = ['月', '火', '水', '木', '金']
  return days.flatMap((day, dayIndex) =>
    Array.from({ length: day === '水' ? 2 : 4 }, (_, index) => {
      const fixed = index === 0 && (dayIndex === 0 || dayIndex === 2)
      const candidates = fixed ? [subjects[dayIndex === 0 ? 0 : 1].id] : subjects.map(item => item.id)
      return { id: `${dayIndex}-${index + 1}`, day, period: index + 1,
        fixed, candidates }
    }))
}

export function normalizeSelections(slots, selections) {
  const normalized = {}
  const taken = new Set()
  for (const slot of slots.filter(item => item.fixed)) {
    const id = slot.candidates[0]
    if (!taken.has(id)) { normalized[slot.id] = id; taken.add(id) }
  }
  for (const slot of slots.filter(item => !item.fixed)) {
    const id = selections[slot.id]
    if (slot.candidates.includes(id) && !taken.has(id)) {
      normalized[slot.id] = id
      taken.add(id)
    }
  }
  return normalized
}

export function canSelectSubject(slots, selections, slotId, subjectId) {
  const slot = slots.find(item => item.id === slotId)
  if (!slot || slot.fixed || !slot.candidates.includes(subjectId)) return false
  return !slots.some(item => item.id !== slotId &&
    (item.fixed ? item.candidates[0] : selections[item.id]) === subjectId)
}

export function scorePuzzle(slots, selections, subjects, attributes, bonus) {
  const attributeScores = Object.fromEntries(attributes.map(item => [item.id, 0]))
  const selectedSubjectIds = []
  const normalized = normalizeSelections(slots, selections)
  for (const slot of slots) {
    const id = normalized[slot.id]
    if (!slot.candidates.includes(id)) continue
    const subject = subjects.find(item => item.id === id)
    if (!subject) continue
    selectedSubjectIds.push(id)
    attributeScores[subject.attributeId] += subject.points
  }
  const cleared = attributes.filter(item => attributeScores[item.id] >= item.clearScore)
  const allCleared = cleared.length === attributes.length
  const earnedPoints = Object.values(attributeScores).reduce((sum, points) => sum + points, 0)
  return { selectedSubjectIds: [...new Set(selectedSubjectIds)], attributeScores,
    earnedPoints, bonus: allCleared ? bonus : 0, score: earnedPoints + (allCleared ? bonus : 0),
    clearedCount: cleared.length, allCleared }
}

export function typingMetrics(score, mistakes, elapsedSeconds) {
  const attempts = score + mistakes
  return { accuracy: attempts ? Math.round(score / attempts * 100) : 0,
    cpm: elapsedSeconds > 0 ? Math.floor(score * 60 / elapsedSeconds) : 0 }
}

export function canUnlockSentence(score, mistakes, elapsedSeconds, streak, settings) {
  const metrics = typingMetrics(score, mistakes, elapsedSeconds)
  const attempts = score + mistakes
  const exactAccuracy = attempts ? score / attempts * 100 : 0
  return elapsedSeconds >= settings.minimumSeconds && streak >= settings.minimumStreak &&
    exactAccuracy >= settings.minimumAccuracy && metrics.cpm >= settings.minimumCpm
}

export function pickLearningTip(subjects, ids, previousId = '', random = Math.random) {
  const selected = subjects.filter(item => ids.includes(item.id))
  const source = selected.length ? selected : subjects
  const tips = source.flatMap(item => item.learningTips.map((text, index) =>
    ({ id: `${item.id}-${index}`, subjectName: item.name, text })))
  const other = tips.filter(item => item.id !== previousId)
  const available = other.length ? other : tips
  return available[Math.min(available.length - 1, Math.floor(random() * available.length))] ?? null
}

export function selectQuestions(questions, mode, selectedSubjectIds) {
  return mode === 'sequential'
    ? questions.filter(question => selectedSubjectIds.includes(question.subjectId))
    : questions
}

export function checkTypingKey(romaji, position, key) {
  const correct = key.length === 1 && key.toLowerCase() === romaji[position]
  return { correct, position: position + (correct ? 1 : 0),
    completed: correct && position + 1 === romaji.length }
}
