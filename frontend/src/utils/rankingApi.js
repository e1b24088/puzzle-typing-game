export const rankingModes = [
  { id: 'course', label: '履修登録ゲーム' },
  { id: 'typing', label: 'タイピングゲーム' },
  { id: 'sequential', label: '通しプレイ' },
]
export function createPlayId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
export function makeSubmission(playId, mode, name, courseScore, typingScore) {
  if (!rankingModes.some(m => m.id === mode)) throw new Error('モードが不正です')
  const normalized = name.trim()
  if (!normalized || [...normalized].length > 12 || /[\u0000-\u001f\u007f-\u009f]/.test(normalized)) throw new Error('名前は1〜12文字で入力してください')
  const course = mode === 'typing' ? null : courseScore
  const typing = mode === 'course' ? null : typingScore
  for (const n of [course, typing].filter(n => n !== null)) {
    if (!Number.isInteger(n) || n < 0 || n > 1_000_000) throw new Error('得点を確認してください')
  }
  if ((mode !== 'typing' && course == null) || (mode !== 'course' && typing == null)) throw new Error('両ゲームの終了後に登録してください')
  const score = (course ?? 0) + (typing ?? 0)
  if (score > 1_000_000) throw new Error('得点を確認してください')
  return { playId, mode, name: normalized, score, courseScore: course, typingScore: typing }
}
async function request(url, options = {}) {
  let response
  try { response = await fetch(url, { ...options, cache: 'no-store' }) }
  catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('ランキングサーバーに接続できません。サーバーPCの起動と接続を確認してください。')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || 'ランキングサーバーに接続できません。サーバーPCの起動と接続を確認してください。')
  }
  return response.json()
}
export function saveRanking(payload) {
  return request('/api/rankings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
}
export function fetchRanking(mode, selfId, signal) {
  const params = new URLSearchParams({ mode })
  if (selfId) params.set('selfId', selfId)
  return request(`/api/rankings?${params}`, { signal })
}
