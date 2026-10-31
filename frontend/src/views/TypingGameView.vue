<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import NotebookScene from '../components/NotebookScene.vue'
import PencilButton from '../components/PencilButton.vue'
import data from '../data/gameData.json'
import { canUnlockSentence, selectQuestions, typingMetrics } from '../utils/gameLogic.js'
import { checkTypingInput, makeTypingTokens } from '../utils/romajiInput.js'
import { createPageTurn } from '../utils/pageTurn.js'
import { createGameClock } from '../utils/gameClock.js'
const props = defineProps({ mode: String, selectedSubjectIds: { type: Array, default: () => [] } })
const emit = defineEmits(['finish', 'cancel', 'start'])
const pool = computed(() => selectQuestions(data.questions, props.mode, props.selectedSubjectIds))
const current = ref(null)
const currentSubject = computed(() => data.subjects.find(item => item.id === current.value?.subjectId))
const started = ref(false)
const position = ref(0)
const typedInput = ref('')
const displayRomaji = ref('')
let typingTokens = []
const score = ref(0)
const mistakes = ref(0)
const completed = ref(0)
const streak = ref(0)
const sentencesUnlocked = ref(false)
const remaining = ref(data.settings.typingSeconds)
const elapsed = ref(0)
const paused = ref(false)
const debugPauseEnabled = import.meta.env.DEV
const clock = createGameClock(data.settings.typingSeconds)
const timeWarning = computed(() => remaining.value <= 5 ? 'あと少し！ 最後の文字まで挑戦しよう。' : remaining.value <= 15 ? 'ラストスパート！' : '')
const metrics = computed(() => typingMetrics(score.value, mistakes.value, elapsed.value))
const playArea = ref(null)
function focusInput() { playArea.value?.focus() }
const wrong = ref(false)
const turning = ref(false)
const turnVersion = ref(0)
const shakeVersion = ref(0)
const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const questionFont = computed(() => 'clamp(20px, ' + Math.min(4.1, 130 / Math.max(28, current.value?.text.length ?? 0)) + 'cqw, 48px)')
const romajiFont = computed(() => 'clamp(17px, ' + Math.min(2.7, 145 / Math.max(45, displayRomaji.value.length)) + 'cqw, 32px)')
const pageTurn = createPageTurn({ advance: nextQuestion, duration: reduceMotion ? 0 : 240, onStateChange: (active, version) => { turning.value = active; turnVersion.value = version } })
const history = ref([])
const completedSubjects = new Set()
const questionCounts = new Map()
let questionHadMistake = false
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
  typedInput.value = ''
  displayRomaji.value = current.value.romaji.replace(/\s+/g, '')
  typingTokens = makeTypingTokens(displayRomaji.value)
  displayRomaji.value = typingTokens.map(token => token.canonical).join('')
  wrong.value = false
  questionHadMistake = false
}
function updateClock() {
  const state = clock.snapshot()
  elapsed.value = state.elapsed
  remaining.value = state.remaining
  paused.value = state.paused
}
function handleDebugPause(event) {
  if (!debugPauseEnabled || event.key !== 'F9' || event.repeat || !started.value || finished) return
  event.preventDefault()
  event.stopPropagation()
  updateClock()
  if (remaining.value === 0) { finish(); return }
  clock.togglePause()
  updateClock()
  if (!paused.value) focusInput()
}
async function start() {
  if (!pool.value.length) return
  started.value = true
  emit('start')
  nextQuestion()
  clock.start()
  await nextTick()
  playArea.value?.focus()
  timer = setInterval(() => { updateClock(); if (remaining.value === 0) finish() }, 100)
}
function finish() {
  if (finished) return
  finished = true
  updateClock()
  clearInterval(timer)
  pageTurn.dispose()
  emit('finish', { score: score.value, mistakes: mistakes.value, completed: completed.value,
    ...metrics.value, sentencesUnlocked: sentencesUnlocked.value,
    completedSubjectIds: [...completedSubjects], history: [...history.value] })
}
function type(event) {
  if (!started.value || finished || paused.value || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return
  event.preventDefault()
  updateClock()
  if (remaining.value === 0) { finish(); return }
  const checked = checkTypingInput(typingTokens, typedInput.value, event.key)
  wrong.value = !checked.correct
  if (!checked.correct) {
    shakeVersion.value++
    mistakes.value++
    streak.value = 0
    questionHadMistake = true
    return
  }
  score.value++
  typedInput.value = checked.input
  displayRomaji.value = checked.displayRomaji
  position.value = checked.position
  if (checked.completed) {
    completed.value++
    completedSubjects.add(current.value.subjectId)
    history.value.push({ id: current.value.id, subjectId: current.value.subjectId,
      text: current.value.text, explanation: current.value.explanation })
    streak.value = questionHadMistake ? 0 : streak.value + 1
    if (canUnlockSentence(score.value, mistakes.value, elapsed.value, streak.value, data.settings.sentenceChallenge)) sentencesUnlocked.value = true
    pageTurn.begin()
  }
}
onMounted(() => window.addEventListener('keydown', handleDebugPause, true))
onUnmounted(() => { clearInterval(timer); pageTurn.dispose(); window.removeEventListener('keydown', handleDebugPause, true) })
</script>
<template>
  <NotebookScene ref="playArea" :shake-version="shakeVersion" :turning="turning" :turn-version="turnVersion" :remaining="started ? remaining : null" :total-seconds="data.settings.typingSeconds" :paused="paused" aria-label="ノートのタイピングゲーム" @keydown="type" @click="focusInput">
    <div v-if="!started" class="intro">
      <p class="eyebrow">CAMPUS NOTE / 授業チャレンジ</p>
      <h2>ノートを開いて、学んでみよう。</h2>
      <p>{{ data.settings.typingSeconds }}秒で、正しく入力した文字を増やそう。</p>
      <ol class="rule-cards"><li><b>1</b><h3>日本語入力をオフ</h3><p>半角英字で入力しよう。</p></li><li><b>2</b><h3>ローマ字を入力</h3><p>左から順番に。文章もスペースなし。</p></li><li><b>3</b><h3>1文字で1点</h3><p>ミスは減点なし。正しいキーで続けよう。</p></li></ol>
      <p class="intro-context">{{ mode === 'sequential' ? '履修登録で選んだ科目から出題します。' : '全科目からランダムに出題します。' }} 言葉の意味は、結果で振り返れます。</p>
      <p v-if="!pool.length" role="alert">対応する問題がありません。タイトルに戻ってください。</p>
      <div class="intro-actions"><button :disabled="!pool.length" @click.stop="start">タイピングを始める</button><button class="sub-button" @click.stop="emit('cancel')">タイトルへ</button></div>
    </div>
    <div v-else class="play-content">
      <p v-if="paused" class="pause-banner" role="status">開発確認：時計と入力を停止中。F9で再開します。</p>
      <header class="page-header"><span class="subject-name">{{ currentSubject?.name }}</span><span>{{ current.kind === 'sentence' ? '文章チャレンジ' : '授業のキーワード' }}</span></header>
      <div class="reading-center">
        <div class="reading-stats" aria-label="プレイ状況"><div><small>スコア</small><strong>{{ score }}<span>点</span></strong></div><div><small>正確率</small><strong>{{ score + mistakes ? metrics.accuracy : '—' }}<span>%</span></strong></div></div>
        <p class="question-text" :style="{ fontSize: questionFont }">{{ current.text }}</p>
        <p class="romaji" :style="{ fontSize: romajiFont }" aria-label="入力するローマ字"><span v-for="(letter, index) in displayRomaji" :key="index" :class="{ typed: index < position, cursor: index === position, 'wrong-letter': wrong && index === position }">{{ letter }}</span></p>
        <p class="input-message" :class="{ 'wrong-message': wrong }" role="status">{{ paused ? 'F9で再開できます' : wrong ? '違うキーです。下線の文字をもう一度。' : '半角英字で入力してください' }}</p>
        <p class="time-warning" role="status">{{ timeWarning }}</p>
      </div>
      <footer class="page-footer"><span>{{ sentencesUnlocked ? '文章チャレンジ解放！' : '言葉の意味は、結果で振り返ろう。' }}<small v-if="debugPauseEnabled"> ／ F9：開発用の一時停止</small></span><span class="page-number" :aria-label="`${completed + 1}ページ`">{{ completed + 1 }}</span></footer>
    </div>
    <template #action><PencilButton v-if="started" @click.stop="finish" /></template>
  </NotebookScene>
</template>
<style scoped>
.pause-banner { margin: 0 0 8px; padding: 8px 12px; border-radius: 6px; background: #f6e9bb; color: #694e14; font-size: 14px; text-align: center; } .time-warning { min-height: 1.5em; margin: 0; color: #ac303b; font-size: 14px; font-weight: bold; }
.intro, .play-content { height: 100%; display: flex; flex-direction: column; min-height: 0; } .intro { justify-content: center; text-align: center; gap: clamp(8px, 1.5vh, 18px); } .intro p { margin: 0; line-height: 1.6; } .eyebrow { font-size: 13px; color: #557a77; letter-spacing: .12em; font-weight: bold; } h2 { font-size: clamp(24px, 3cqw, 40px); margin: 0; }
.rule-cards { list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 0; margin: 8px auto; width: min(100%, 940px); } .rule-cards li { border: 1px solid #a3bdb850; background: #f4f8f2e8; border-radius: 12px; padding: 20px 12px; } .rule-cards b { display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: #557e77; color: white; } .rule-cards h3 { font-size: 18px; margin: 12px 0 8px; } .rule-cards p { font-size: 15px; } .intro-context { font-size: 15px; } .intro-actions { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
button { font-size: 15px; padding: 12px 20px; margin: 0; background: #446e67; border-radius: 8px; } button:hover { background: #31594f; } .sub-button { background: #fffdf5; color: #355e58; border: 1px solid #9db4ab; } .sub-button:hover { background: #eef4ed; } button:disabled { opacity: .5; cursor: not-allowed; }
.page-header { display: flex; justify-content: space-between; gap: 16px; font-size: clamp(13px, 1.25cqw, 17px); color: #53716c; margin: 0; padding-bottom: 12px; border-bottom: 1px solid #9bbcb150; } .reading-center { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; min-height: 0; padding: 12px 0; gap: clamp(8px, 1.3vh, 16px); } .reading-stats { display: flex; gap: clamp(20px, 5cqw, 70px); padding: 8px 24px; border-radius: 12px; background: #f6f8f1ef; border: 1px solid #a6bfb340; } .reading-stats > div { min-width: 72px; } .reading-stats small { display: block; font-size: 13px; color: #5c736b; margin-bottom: 3px; } .reading-stats strong { font-size: clamp(24px, 2.7cqw, 36px); font-variant-numeric: tabular-nums; } .reading-stats strong span { font-size: 14px; margin-left: 4px; } .urgent { color: #ad3038; }
.question-text { width: min(100%, 1080px); font-weight: bold; line-height: 1.45; margin: 10px 0 0; overflow-wrap: anywhere; text-wrap: balance; } .romaji { width: min(100%, 1100px); font-family: monospace; font-weight: bold; line-height: 1.7; letter-spacing: .025em; margin: 0; overflow-wrap: anywhere; } .typed { color: #a0aaa5; } .cursor { color: #245d8b; background: #e0edf5; border-bottom: 3px solid; } .wrong-letter { color: #bd2636; background: #f8dfe1; border-bottom-color: #bd2636; } .input-message { font-size: 14px; min-height: 1.7em; color: #657a71; margin: 0; } .wrong-message { color: #b52b35; } .page-footer { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: #657a71; margin: 0; padding-top: 12px; border-top: 1px solid #9bbcb150; }
.rule-dialog { width: min(600px, 80vw); border: 1px solid #9fb5aa; border-radius: 12px; padding: 24px; color: #293b42; background: #fffdf5; box-shadow: 0 12px 50px #203a2940; } .rule-dialog h2 { font-size: 24px; } .rule-dialog p { line-height: 1.8; } .rule-dialog::backdrop { background: #293b4266; }
@media (max-width: 700px) { .rule-cards { gap: 6px; } .rule-cards li { padding: 10px 6px; } .rule-cards h3 { font-size: 14px; } .rule-cards p, .intro-context { font-size: 13px; } .reading-stats { gap: 18px; padding: 8px 14px; } .page-footer { font-size: 11px; } }
@media (max-height: 600px) { .intro { gap: 8px; } .rule-cards li { padding: 10px; } .rule-cards h3 { margin: 6px 0; } .reading-center { gap: 5px; padding: 5px 0; } .page-header, .page-footer { padding: 5px 0; } }
/* typing-review-input-update-v1 */
.subject-name { font-size: clamp(20px, 2.4cqw, 30px); font-weight: 800; color: #294e49; line-height: 1.3; }
.page-number { font-size: 18px; font-weight: bold; font-variant-numeric: tabular-nums; }
</style>
