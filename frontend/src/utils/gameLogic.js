export function makeSlots(subjects, configuredSlots, consecutiveGroups = []) {
  const ids = new Set(subjects.map(item => item.id))
  if (!Array.isArray(configuredSlots) || configuredSlots.length !== 18) {
    throw new Error('18コマの設定が必要です')
  }
  const days = ['月', '火', '水', '木', '金']
  const expected = new Set(
    days.flatMap((day, index) =>
      Array.from({ length: day === '水' ? 2 : 4 }, (_, i) => `${index}-${i + 1}`)
    )
  )
  const slots = configuredSlots.map(slot => {
    const dayIndex = days.indexOf(slot.day)
    if (
      !expected.delete(slot.id) ||
      slot.id !== `${dayIndex}-${slot.period}` ||
      !Array.isArray(slot.candidates) ||
      slot.candidates.length !== (slot.fixed ? 1 : 3) ||
      new Set(slot.candidates).size !== slot.candidates.length ||
      slot.candidates.some(id => !ids.has(id))
    ) {
      throw new Error('コマ・候補科目の設定が不正です')
    }
    return { ...slot, candidates: [...slot.candidates] }
  })
  if (expected.size !== 0) throw new Error('時間割に不足しているコマがあります')
  // 連コマは、異なる2コマが同じ科目を候補に持つ設定でなければならない。
  const groupSubjects = new Set()
  const groupSlots = new Set()
  for (const group of consecutiveGroups) {
    if (
      !ids.has(group.subjectId) ||
      groupSubjects.has(group.subjectId) ||
      !Array.isArray(group.slotIds) ||
      group.slotIds.length !== 2 ||
      group.slotIds[0] === group.slotIds[1]
    ) {
      throw new Error('連コマの設定が不正です')
    }
    groupSubjects.add(group.subjectId)
    for (const slotId of group.slotIds) {
      const slot = slots.find(item => item.id === slotId)
      if (!slot || slot.fixed || !slot.candidates.includes(group.subjectId) || groupSlots.has(slotId)) {
        throw new Error('連コマのコマ配置が不正です')
      }
      groupSlots.add(slotId)
    }
  }
  return slots
}
function getGroup(subjectId, consecutiveGroups = []) {
  return consecutiveGroups.find(group => group.subjectId === subjectId) ?? null
}
function selectedIdForSlot(slot, selections) {
  return slot.fixed ? slot.candidates[0] : selections[slot.id]
}
function registeredIds(slots, selections) {
  return new Set(slots.map(slot => selectedIdForSlot(slot, selections)).filter(Boolean))
}
export function normalizeSelections(slots, selections, consecutiveGroups = []) {
  const normalized = {}
  // 固定コマは常に登録済み。
  for (const slot of slots.filter(item => item.fixed)) {
    normalized[slot.id] = slot.candidates[0]
  }
  // 同じ科目IDを2コマに置けるのは、定義済みの連コマだけ。
  const taken = new Set(Object.values(normalized))
  for (const slot of slots.filter(item => !item.fixed)) {
    const id = selections?.[slot.id]
    if (!id || !slot.candidates.includes(id)) continue
    const group = getGroup(id, consecutiveGroups)
    if (group) {
      if (!group.slotIds.includes(slot.id)) continue
      const [firstId, secondId] = group.slotIds
      const first = slots.find(item => item.id === firstId)
      const second = slots.find(item => item.id === secondId)
      if (!first || !second || !selections || group.slotIds.some(groupSlotId => {
        const value = selections[groupSlotId]
        return value && value !== id
      })) continue
      if (taken.has(id)) {
        // 同じ連コマの相方として登録されている場合のみ許可する。
        if (group.slotIds.every(groupSlotId => normalized[groupSlotId] === id)) continue
        const alreadyInGroup = group.slotIds.some(groupSlotId => normalized[groupSlotId] === id)
        if (!alreadyInGroup) continue
      }
      normalized[firstId] = id
      normalized[secondId] = id
      taken.add(id)
    } else {
      if (taken.has(id)) continue
      normalized[slot.id] = id
      taken.add(id)
    }
  }
  return normalized
}
export function canSelectSubject( slots, selections, slotId, subjectId, subjects = [], consecutiveGroups = [] ) {
  const slot = slots.find(item => item.id === slotId)
  if (!slot || slot.fixed || !slot.candidates.includes(subjectId)) return false
  const subject = subjects.find(item => item.id === subjectId)
  const group = getGroup(subjectId, consecutiveGroups)
  const current = selections?.[slotId]
  // クリック済み科目の解除は選択可否とは別に扱う。
  if (current === subjectId) return true
  if (group) {
    if (!group.slotIds.includes(slotId)) return false
    const pairedSlots = group.slotIds.map(id => slots.find(item => item.id === id))
    if (pairedSlots.some(item => !item || item.fixed || !item.candidates.includes(subjectId))) return false
  }
  // すでに別の科目として登録されていないか確認する。
  for (const other of slots) {
    if (other.id === slotId || (group && group.slotIds.includes(other.id))) continue
    if (selectedIdForSlot(other, selections) === subjectId) return false
  }
  // 前提科目はすべて先に登録されている必要がある。
  const registered = registeredIds(slots, selections)
  if (subject?.prerequisiteIds?.some(id => !registered.has(id))) return false
  return true
}
export function canDeselectSubject( slots, selections, slotId, subjects = [], consecutiveGroups = [] ) {
  const slot = slots.find(item => item.id === slotId)
  if (!slot || slot.fixed) return false
  const subjectId = selections?.[slotId]
  if (!subjectId) return false
  const group = getGroup(subjectId, consecutiveGroups)
  const removingIds = new Set(group ? group.slotIds : [slotId])
  // この科目を外すことで、登録済みの後続科目の前提条件が崩れないか確認。
  const remaining = new Set( slots .filter(item => !removingIds.has(item.id)) .map(item => selectedIdForSlot(item, selections)) .filter(Boolean))
  for (const id of remaining) {
    const subject = subjects.find(item => item.id === id)
    if (subject?.prerequisiteIds?.some(requiredId => removingIds.size && !remaining.has(requiredId))) {
      const removedSubjects = new Set(
        slots.filter(item => removingIds.has(item.id)).map(item => selectedIdForSlot(item, selections)).filter(Boolean)
      )
      if (subject.prerequisiteIds.some(requiredId => removedSubjects.has(requiredId))) return false
    }
  }
  return true
}
export function scorePuzzle( slots, selections, subjects, attributes, bonus, consecutiveGroups = [] ) {
  const attributeScores = Object.fromEntries(attributes.map(item => [item.id, 0]))
  const normalized = normalizeSelections(slots, selections, consecutiveGroups)
  const selectedSubjectIds = [...new Set(Object.values(normalized))]
  // 得点はコマ単位ではなく科目単位で加算するため、連コマでも二重加点しない。
  for (const id of selectedSubjectIds) {
    const subject = subjects.find(item => item.id === id)
    if (subject && Object.hasOwn(attributeScores, subject.attributeId)) {
      attributeScores[subject.attributeId] += subject.points
    }
  }
  const cleared = attributes.filter(item => attributeScores[item.id] >= item.clearScore)
  const allCleared = cleared.length === attributes.length
  const earnedPoints = Object.values(attributeScores).reduce((sum, points) => sum + points, 0)
  return { selectedSubjectIds, attributeScores, earnedPoints, bonus: allCleared ? bonus : 0, score: earnedPoints + (allCleared ? bonus : 0), clearedCount: cleared.length, allCleared }
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