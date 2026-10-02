<script setup>
import { computed, nextTick, onUnmounted, ref } from 'vue'
import data from '../data/gameData.json'
import { canUnlockSentence, checkTypingKey, selectQuestions, typingMetrics } from '../utils/gameLogic.js'
const props = defineProps({ mode: String, selectedSubjectIds: { type: Array, default: () => [] } })
const emit = defineEmits(['finish', 'cancel'])
const pool = computed(() => selectQuestions(data.questions, props.mode, props.selectedSubjectIds))
const current = ref(null)
const currentSubject = computed(() => data.subjects.find(item => item.id === current.value?.subjectId))
const started = ref(false)
const position = ref(0)
const score = ref(0)
const mistakes = ref(0)
const completed = ref(0)
const streak = ref(0)
const sentencesUnlocked = ref(false)
const remaining = ref(data.settings.typingSeconds)
const elapsed = ref(0)
const metrics = computed(() => typingMetrics(score.value, mistakes.value, elapsed.value))
const playArea = ref(null)
const wrong = ref(false)
const history = ref([])
const completedSubjects = new Set()
const questionCounts = new Map()
let questionHadMistake = false
let startedAt = 0
let deadline = 0
let timer
let finished = false
function nextQuestion() {
  const sentenceTurn = sentencesUnlocked.value && (completed.value + 1) % data.settings.sentenceChallenge.sentenceEvery === 0
  const kind = sentenceTurn ? 'sentence' : 'word'
  const matching = pool.value.filter(item => item.kind === kind)
  const available = matching.length ? matching : pool.value
  const alternatives = available.filter(item => item.id !== current.value?.id)
  const choices = alternatives.length ? alternatives : available
  const minimum = Math.min(...choices.map(item => questionCounts.get(item.id) ?? 0))
  const leastSeen = choices.filter(item => (questionCounts.get(item.id) ?? 0) === minimum)
  current.value = leastSeen[Math.floor(Math.random() * leastSeen.length)]
  questionCounts.set(current.value.id, (questionCounts.get(current.value.id) ?? 0) + 1)
  position.value = 0
  wrong.value = false
  questionHadMistake = false
}
function updateClock() {
  elapsed.value = Math.min(data.settings.typingSeconds, Math.max(0, (Date.now() - startedAt) / 1000))
  remaining.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
}
async function start() {
  if (!pool.value.length) return
  started.value = true
  nextQuestion()
  startedAt = Date.now()
  deadline = startedAt + data.settings.typingSeconds * 1000
  await nextTick()
  playArea.value?.focus()
  timer = setInterval(() => { updateClock(); if (remaining.value === 0) finish() }, 100)
}
function finish() {
  if (finished) return
  finished = true
  updateClock()
  clearInterval(timer)
  emit('finish', { score: score.value, mistakes: mistakes.value, completed: completed.value,
    ...metrics.value, sentencesUnlocked: sentencesUnlocked.value,
    completedSubjectIds: [...completedSubjects], history: [...history.value] })
}
function type(event) {
  if (!started.value || finished || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return
  event.preventDefault()
  updateClock()
  if (Date.now() >= deadline) { finish(); return }
  const checked = checkTypingKey(current.value.romaji, position.value, event.key)
  wrong.value = !checked.correct
  if (!checked.correct) {
    mistakes.value++
    streak.value = 0
    questionHadMistake = true
    return
  }
  score.value++
  position.value = checked.position
  if (checked.completed) {
    completed.value++
    completedSubjects.add(current.value.subjectId)
    history.value.push({ id: current.value.id, subjectId: current.value.subjectId,
      text: current.value.text, explanation: current.value.explanation })
    streak.value = questionHadMistake ? 0 : streak.value + 1
    if (canUnlockSentence(score.value, mistakes.value, elapsed.value, streak.value, data.settings.sentenceChallenge)) sentencesUnlocked.value = true
    nextQuestion()
  }
}
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <section class="game-panel typing-game" :class="{ playing: started }">
    <h2 v-if="!started">タイピング：授業に挑戦</h2>
    <template v-if="!started">
      <p><strong>{{ data.settings.typingSeconds }}秒で、正しい文字をできるだけ多く入力しよう！</strong></p>
      <ol class="rule-steps"><li><b>日本語入力（IME）をオフにする。</b>半角英字で入力します。</li><li><b>下に出ているローマ字を左から入力する。</b>正解1文字につき1点。文章もスペースなしで続けて入力します。</li><li><b>全部入力すると次の問題へ。</b>間違えても減点なし。同じ位置から正しい文字を入力して続けられます。</li></ol>
      <p>{{ mode === 'sequential' ? '出題は、単位ゲームであなたが選んだ科目から。' : '出題は、すべての科目からランダム。' }}</p>
      <p>ミスなく続けて解き、正確さと速さの条件を満たすと文章問題も登場します。</p>
      <details><summary>文章問題が出る条件</summary><p>開始から{{ data.settings.sentenceChallenge.minimumSeconds }}秒以上、{{ data.settings.sentenceChallenge.minimumStreak }}問連続ノーミス、正確率{{ data.settings.sentenceChallenge.minimumAccuracy }}%以上、1分あたり{{ data.settings.sentenceChallenge.minimumCpm }}文字以上を同時に達成。解放後は{{ data.settings.sentenceChallenge.sentenceEvery }}問ごとに文章問題です。</p></details>
      <p>時間切れ、または「結果を見る」で終了。言葉の意味は結果画面で読めます。</p>
      <p v-if="!pool.length">対応する問題がありません。タイトルに戻って選び直してください。</p>
      <button :disabled="!pool.length" @click="start">タイピングを始める</button>
      <button @click="emit('cancel')">タイトルへ</button>
    </template>
    <template v-else>
      <header class="typing-header"><div><h2>授業に挑戦</h2><span>{{ score }} 点 ／ 正確率 {{ metrics.accuracy }}%</span></div><div class="clock" role="timer"><small>残り時間</small><strong>{{ remaining }}<small> 秒</small></strong></div><button @click="finish">結果を見る</button></header>
      <p class="challenge-status">{{ sentencesUnlocked ? '文章チャレンジ解放！' : 'まずは用語を入力しよう' }}</p>
      <div ref="playArea" tabindex="0" class="typing-area" :class="{ wrong }" @keydown="type" @click="playArea?.focus()">
        <p class="subject-name">{{ currentSubject.name }} ／ {{ current.kind === 'sentence' ? '文章チャレンジ' : '授業のキーワード' }}</p>
        <p class="question-text">{{ current.text }}</p>
        <p class="romaji"><span v-for="(letter, index) in current.romaji" :key="index" :class="{ typed: index < position, cursor: index === position }">{{ letter }}</span></p>
        <p aria-live="polite">{{ wrong ? '違うキーです。次の文字を確認してください。' : 'この枠をクリックして半角英字で入力' }}</p>
      </div>
      <p class="review-notice">言葉の意味とゲームとのつながりは、結果画面で確認できます。</p>
    </template>
  </section>
</template>

<style scoped>
.rule-steps { padding-left: 1.5rem; line-height: 1.8; } .rule-steps li { margin: .5rem 0; }
h2 { margin-top: 0; }
.typing-header { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; gap: .5rem; } .typing-header button { justify-self: end; } .clock { text-align: center; } .clock > small { display: block; } .clock strong { font-size: 2.7rem; display: block; font-variant-numeric: tabular-nums; } .clock strong small { font-size: 1rem; } .review-notice { font-size: .85rem; color: #526074; text-align: center; } .game-panel.typing-game { box-sizing: border-box; padding: 1rem; }
.challenge-status { color: #2258a8; font-weight: bold; }
.typing-area { text-align: center; padding: 1.25rem 1rem; border: 3px solid #aabbd0; border-radius: 12px; }
.typing-area:focus { border-color: #2258a8; outline: none; }
.typing-area.wrong { border-color: #b52b35; }
.subject-name { font-weight: bold; color: #526074; }
.question-text { font-size: clamp(1.4rem, 3vw, 2.2rem); font-weight: bold; margin: 1rem 0; }
.romaji { font: bold clamp(1.1rem, 3vw, 1.8rem) monospace; overflow-wrap: anywhere; line-height: 1.8; }
.typed { color: #8a96a5; }
.cursor { color: #2258a8; background: #e4efff; border-bottom: 3px solid; }
.meaning { background: #fff7dc; border-radius: 8px; padding: .7rem; line-height: 1.6; }
.connection { margin-top: 1rem; padding: .8rem; border-left: 4px solid #2258a8; background: #f2f6fb; }
.connection p { margin: .4rem 0; line-height: 1.6; }
button:disabled { opacity: .5; cursor: not-allowed; }
@media (min-width: 1000px) and (min-height: 650px) { .typing-game.playing { min-height: calc(100svh - 16px); display: flex; flex-direction: column; } .typing-area { flex: 1; display: flex; flex-direction: column; justify-content: center; } }
@media (max-width: 600px) { .typing-header { grid-template-columns: 1fr 1fr; } .typing-header button { grid-column: 1 / -1; } }
</style>
