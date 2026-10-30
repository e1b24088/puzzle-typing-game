<script setup>
import RankingView from './views/RankingView.vue'
import RankingEntryForm from './components/RankingEntryForm.vue'
import {createPlayId, isValidRankingName, makeSubmission, saveRanking} from './utils/rankingApi.js'
import TypingResultView from './views/TypingResultView.vue'
import { computed, nextTick, onMounted, ref, watch, onUnmounted } from 'vue'
import TitleView from './views/TitleView.vue'
import CourseGameView from './views/CourseGameView.vue'
import TypingGameView from './views/TypingGameView.vue'
import { pickLearningTip } from './utils/gameLogic.js'
import data from './data/gameData.json'
const playerName = ref('')
const playId = ref(createPlayId())
const ownEntries = ref({})
const rankingMode = ref('course')
const rankingReturn = ref('title')
function openRanking(nextMode = rankingMode.value) {
  rankingReturn.value = screen.value
  // タイトル画面からランキングを開く場合は、
  // 前回のプレイ記録を「今回のあなた」として扱わない
  if (screen.value === 'title') {
    ownEntries.value = {}
  }
  rankingMode.value = nextMode
  show('rankings')
}
function rememberEntry(record) { ownEntries.value = { ...ownEntries.value, [record.mode]: record.id } }
const rankingSaveError = ref('')
// タイトルに戻る前にランキング登録
async function returnToTitle() {
  console.log('タイトルへ戻る処理を開始')
  console.log('名前:', playerName.value)
  console.log('モード:', mode.value)
  console.log('履修登録結果:', courseResult.value)
  console.log('登録済み:', ownEntries.value)
  rankingSaveError.value = ''
  // 名前が登録条件を満たさなければ登録しない
  if (!isValidRankingName(playerName.value)) {
    show('title')
    return
  }
  // 現在のプレイ内容から登録対象を決定
  // 実際に終了したゲームの結果から登録対象を決定
  let modes = []
  if (courseResult.value && typingResult.value) {
    // 履修登録とタイピングの両方が終了
    modes = ['course', 'typing', 'sequential']
  } else if (courseResult.value) {
    // 履修登録だけ終了
    modes = ['course']
  } else if (typingResult.value) {
    // タイピングだけ終了
    modes = ['typing']
  }
  console.log('登録対象:', modes)
  try {
    for (const targetMode of modes) {
      // すでに登録済みならスキップ
      if (ownEntries.value[targetMode]) continue
      const payload = makeSubmission(
        playId.value,
        targetMode,
        playerName.value,
        targetMode === 'typing' ? null : courseResult.value?.score,
        targetMode === 'course' ? null : typingResult.value?.score
      )
      const record = await saveRanking(payload)
      console.log('ランキング登録成功:', record)
      rememberEntry(record)
    }
  } catch (e) {
    console.error('ランキング登録失敗:', e)
    rankingSaveError.value = `ランキング登録に失敗しました：${e.message}`
  }
  show('title')
}
const screen = ref('title')
const mode = ref('sequential')
const backendStatus = ref('確認中')
const courseResult = ref(null)
const typingResult = ref(null)
const learningTip = ref(null)
const enrolledSubjects = computed(() => data.subjects.filter(item => courseResult.value?.selectedSubjectIds.includes(item.id)))
const courseAdvice = computed(() => {
  if (!courseResult.value) return ''
  const missing = data.attributes.filter(item => courseResult.value.attributeScores[item.id] < item.clearScore)
  return missing.length ? missing.map(item => `${item.name}はあと${item.clearScore - courseResult.value.attributeScores[item.id]}単位`).join('、') + '。次はこの分野を選べる時間を先に確保しよう！' : '3分野の目標をすべて達成！ 次は目標を超えて、さらに単位を伸ばそう。'
})
const reviewItems = computed(() => [...new Map((typingResult.value?.history ?? []).map(item => [item.id, { ...item, subject: data.subjects.find(subject => subject.id === item.subjectId) }])).values()])
let previousTipId = ''
onMounted(async () => {
  try {
    const response = await fetch('/api/health')
    if (!response.ok) throw new Error('API error')
    const result = await response.json()
    backendStatus.value = result.status === 'ok' ? '接続済み' : '応答を確認してください'
  } catch { backendStatus.value = '未接続' }
})
function show(nextScreen) {
  screen.value = nextScreen
  nextTick(() => window.scrollTo({ top: 0, behavior: 'instant' }))
}
function begin(nextMode, firstGame) {
  console.log('ゲーム開始時のモード:', nextMode)
  playerName.value = ''
  playId.value = createPlayId()
  ownEntries.value = {}
  mode.value = nextMode
  courseResult.value = null
  typingResult.value = null
  learningTip.value = null
  show(firstGame)
}
function setTip(ids) {
  learningTip.value = pickLearningTip(data.subjects, ids, previousTipId)
  previousTipId = learningTip.value?.id ?? previousTipId
}
function finishCourse(result) { courseResult.value = result; setTip(result.selectedSubjectIds); show('puzzle-result') }
function finishTyping(result) { typingResult.value = result; setTip(result.completedSubjectIds); show('typing-result') }
function scrollToBottom() { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }) }
const trianglePoints = computed(() => {
  if (!courseResult.value) return ''
  const scores = courseResult.value.attributeScores
  const centerX = 100
  const centerY = 90
  const radius = 70
  const values = [
    { value: scores.technology, max: 24, angle: -90 },
    { value: scores.management, max: 16, angle: 150 },
    { value: scores.strategy, max: 16, angle: 30 }
  ]
  return values.map(({ value, max, angle }) => {
    const ratio = Math.min(value, max) / max
    const rad = angle * Math.PI / 180
    const x = centerX + Math.cos(rad) * radius * ratio
    const y = centerY + Math.sin(rad) * radius * ratio
    return `${x},${y}`
  }).join(' ')
})
const triangleTargetPoints = computed(() => {
  const targetValues = [
    { value: 18, max: 24, angle: -90 },
    { value: 11, max: 16, angle: 150 },
    { value: 9, max: 16, angle: 30 }
  ]
  const centerX = 100
  const centerY = 90
  const radius = 70
  return targetValues.map(({ value, max, angle }) => {
    const ratio = value / max
    const rad = angle * Math.PI / 180
    const x = centerX + Math.cos(rad) * radius * ratio
    const y = centerY + Math.sin(rad) * radius * ratio
    return `${x},${y}`
  }).join(' ')
})
const displayedStars = ref(0)
const lightingStar = ref(0)
let starTimers = []
function clearStarTimers() {
  starTimers.forEach(clearTimeout)
  starTimers = []
}
const starSound = new Audio('/sounds/star-light.mp3')
function playStarAnimation() {
  clearStarTimers()
  displayedStars.value = 0
  lightingStar.value = 0
  const count = courseResult.value?.clearedCount ?? 0
  for (let i = 1; i <= count; i++) {
    const timer = setTimeout(() => {
      displayedStars.value = i
      lightingStar.value = i
      starSound.currentTime = 0
      starSound.play().catch((error) => {
        console.warn('星の音声を再生できません:', error)
      })
    }, i * 1000)
    starTimers.push(timer)
  }
  const finishTimer = setTimeout(() => {
    lightingStar.value = 0
  }, (count + 1) * 1000)
  starTimers.push(finishTimer)
}
watch(
  () => screen.value,
  (newScreen) => {
    if (newScreen === 'puzzle-result') {
      playStarAnimation()
    } else {
      clearStarTimers()
      displayedStars.value = 0
      lightingStar.value = 0
    }
  }
)
onUnmounted(clearStarTimers)
</script>

<template>
  <main class="container"
    :class="{ 'title-container': screen === 'title', playing: screen === 'puzzle' || screen === 'typing' }">

    <TitleView v-if="screen === 'title'" @start="begin" @rankings="openRanking()" />
    <CourseGameView v-else-if="screen === 'puzzle'" @finish="finishCourse" @cancel="show('title')" />
    <section v-else-if="screen === 'puzzle-result'" class="result-layout">
      <div class="result-view">
        <div class="result-top">
          <div class="result-banner" :class="{ cleared: courseResult.allCleared }">
            <div class="result-stars">
              <svg v-for="index in 3" :key="index" class="result-star"
                :class="{ active: index <= displayedStars, lighting: index === lightingStar }" viewBox="0 0 24 24"
                aria-hidden="true">
                <path
                  d="M9.362,9.158c0,0-3.16,0.35-5.268,0.584c-0.19.023-.358.15-.421.343s0 .394.14.521l3.919,3.569-1.074,5.19c-.036.188.032.387.196.506.163.119.373.121.538.028l4.606-2.624 4.604,2.625c.168.092.378.09.541-.029.164-.119.232-.318.195-.505l-1.071-5.191 3.919-3.566c.14-.131.202-.332.14-.524s-.23-.319-.42-.341l-5.269-.586-2.183-4.83c-.082-.173-.254-.294-.456-.294s-.375.122-.453.294z" />
              </svg>
            </div>
            <small>履修登録 成績表</small>
            <h2>{{ courseResult.allCleared ? '全分野クリア！' : 'あと一歩、次の作戦へ！' }}</h2>
            <p class="score">{{ courseResult.score }}<small> 点</small></p>
            <p>{{ courseResult.selectedSubjectIds.length }}科目登録 {{ courseResult.clearedCount }} / {{
              data.attributes.length }}分野達成</p>
            <div class="score-breakdown">
              <span>獲得単位 {{ courseResult.earnedPoints }}</span>
              <span>＋ ボーナス {{ courseResult.bonus }}点</span>
            </div>
          </div>
          <div class="triangle-status">
            <svg class="triangle-chart" viewBox="0 0 200 190">
              <!-- 最大値：技術24・経営16・戦略16 -->
              <polygon class="triangle-grid" points="100,20 39.4,125 160.6,125" />
              <!-- 目標値の三角形 -->
              <polygon class="triangle-target" :points="triangleTargetPoints" />
              <!-- 実際のステータス -->
              <polygon class="triangle-value" :points="trianglePoints" />
              <text x="100" y="12" text-anchor="middle">テクノロジ</text>
              <text x="20" y="145" text-anchor="middle">マネジメント</text>
              <text x="180" y="145" text-anchor="middle">ストラテジ</text>
            </svg>
          </div>
        </div>
        <div class="achievement-grid">
          <article v-for="item in data.attributes" :key="item.id" :style="{ '--field-color': item.color }">
            <h3>{{ item.name }}</h3><strong>{{ courseResult.attributeScores[item.id] }}<small> / {{ item.clearScore
            }}単位</small></strong><progress :value="Math.min(courseResult.attributeScores[item.id], item.clearScore)"
              :max="item.clearScore" :aria-label="item.name + 'の達成度'"></progress>
            <p>{{ courseResult.attributeScores[item.id] >= item.clearScore ? '目標達成！ 目標より＋' +
              (courseResult.attributeScores[item.id] - item.clearScore) + '単位' : 'あと ' + (item.clearScore -
                courseResult.attributeScores[item.id]) + '単位' }}</p>
          </article>
        </div>
        <div class="result-bottom">
          <div class="result-ranking">
            <RankingEntryForm v-model="playerName" :play-id="playId" mode="course" :course-score="courseResult.score"
              :can-register="mode !== 'sequential'" @registered="rememberEntry" @open="openRanking" />
          </div>

          <div class="result-buttons">
            <button v-if="mode === 'sequential'" class="chalk-button" @click="show('typing')">
              → 履修した科目のタイピングへ
            </button>
            <button class="chalk-button" @click="returnToTitle">
              ← タイトルへ
            </button>
          </div>
        </div>
      </div>
    </section>
    <TypingGameView v-else-if="screen === 'typing'" :mode="mode"
      :selected-subject-ids="courseResult?.selectedSubjectIds ?? []" @finish="finishTyping" @cancel="show('title')" />
    <TypingResultView v-else-if="screen === 'typing-result'" :result="typingResult"
      :course-score="courseResult?.score ?? null" :mode="mode" :learning-tip="learningTip"
      v-model:player-name="playerName" :play-id="playId" @registered="rememberEntry" @rankings="openRanking"
      @back="returnToTitle" />

    <RankingView v-else-if="screen === 'rankings'" :initial-mode="rankingMode" :own-entries="ownEntries"
      @tab="rankingMode = $event" @back="show(rankingReturn)" />
  </main>
  <p v-if="rankingSaveError" class="entry-error" role="alert">
  {{ rankingSaveError }}
  </p>
</template>

<style scoped>
.container { box-sizing: border-box; max-width: 1240px; padding: 1rem; margin: 0 auto;}
.container.playing { max-width: 1440px; padding: .5rem;}
.review-card { padding: .8rem; margin: .6rem 0; background: #f2f6fb; border-radius: 10px;}
.review-card h3 { margin: .3rem 0;}
.review-card p { line-height: 1.6;}
.game-link { border-left: 4px solid #2258a8; padding-left: .6rem;}
.top-nav { display: flex; justify-content: flex-end; align-items: center; min-height: 2rem; margin-bottom: .6rem; font-size: .85rem; color: #526074;}
.behind-button { background: transparent; color: #2258a8; margin: 0; padding: .35rem; text-decoration: underline;}
.behind-button:hover { background: #e5edfa;}
.title-container { max-width: 1000px;}
.title-container :deep(.title-view) { box-sizing: border-box; padding: clamp(.8rem, 3vh, 1.7rem);}
.title-container :deep(.title-view h2) { margin: .6rem 0;}
.title-container :deep(.title-view p) { margin: .5rem 0;}
.title-container :deep(.title-buttons) { margin-top: 1.1rem; gap: 1rem; padding-bottom: .7rem;}
.title-container :deep(.title-view .button) { min-height: 64px; padding: .65em;}
:deep(.game-panel) { padding: clamp(1rem, 2vw, 1.7rem);}
.result-top { display: flex; align-items: center; width: 100%; box-sizing: border-box; padding: 0; border: 2px solid #789184; border-radius: 16px; background: #3c7058;}
.result-banner { width: 66.6667%; box-sizing: border-box; text-align: center; padding: 1rem; border-radius: 16px; background: transparent; border: none; color: #fff;}
.result-banner h2 { margin: .1rem 0; line-height: 1.05;}
.result-banner .score { margin: 0; line-height: 1;}
.result-banner>p { margin: .35rem 0; line-height: 1.2;}
.result-banner .score-breakdown { display: flex; justify-content: center; flex-wrap: wrap; gap: .5rem 1rem;
  margin-top: .35rem; padding: .5rem .75rem; border-radius: 8px; background: #3c7058; color: #fff; line-height: 1.2;}
.result-stars { display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 0.4rem;}
.result-star { width: 40px; height: 40px; fill: #000; transition: fill 0.3s, transform 0.3s;}
.result-star.active { fill: #ffeb49; filter: drop-shadow(0 0 5px rgba(255, 235, 73, 0.8));}
.result-star:hover { transform: scale(1.1);}
.result-star.active { fill: #ffeb49; filter: drop-shadow(0 0 5px rgba(255, 235, 73, 0.8));}
.result-star.lighting {animation: star-light-up 0.35s ease-out;}
@keyframes star-light-up {
  0% {transform: scale(0.6) rotate(0deg); filter: brightness(1);}
  60% {transform: scale(1.6) rotate(180deg); filter: brightness(1.8) drop-shadow(0 0 10px #ffeb49);}
  100% {transform: scale(1.2) rotate(360deg); filter: brightness(1) drop-shadow(0 0 5px rgba(255, 235, 73, 0.8));}
}
.triangle-status { width: 33.3333%; box-sizing: border-box; padding-top: 20px;}
.achievement-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .7rem; margin: 1rem 0;}
.achievement-grid article { padding: .8rem; border-top: 5px solid var(--field-color); background: #f2f6fb; border-radius: 10px; color: #222;}
.achievement-grid h3 { font-size: 1rem; margin: 0 0 .6rem;}
.achievement-grid strong { font-size: 1.8rem;}
.achievement-grid small { font-size: .8rem;}
.achievement-grid progress { display: block; width: 100%; height: 12px; margin-top: .5rem; appearance: none;
  -webkit-appearance: none; border: 1px solid #bfc3c8; border-radius: 999px; overflow: hidden; background: #e5e5e5;}
.achievement-grid progress::-webkit-progress-bar { background: #e5e5e5; border-radius: 999px;}
.achievement-grid progress::-webkit-progress-value { background: var(--field-color); border-radius: 999px;}
.achievement-grid progress::-moz-progress-bar { background: var(--field-color); border-radius: 999px;}
.achievement-grid p { font-size: .8rem; margin-bottom: 0;}
@media (max-width: 600px) {.achievement-grid {grid-template-columns: 1fr;}}
@media (max-width: 800px) {.result-layout {flex-direction: column;}.result-view, .result-ranking-panel { width: 100%;}}
.result-layout { display: flex; align-items: flex-start; gap: 0.8rem; width: 100%; max-width: 1100px; margin: 0 auto; box-sizing: border-box; padding: 0 0.5rem;}
.result-view { position: relative; flex: 1; box-sizing: border-box; min-width: 0; max-width: none; height: auto;
  min-height: 630px; margin: 0; padding: 1.5rem 1.5rem 0.8rem; box-sizing: border-box; background: #284b3c;
  border: 18px solid transparent; border-image: url('/images/metal-frame-texture.png') 18 stretch; color: #fff;}
.result-ranking-panel { flex: 0 0 280px; box-sizing: border-box; padding: 1.2rem; background: #e9e9e5; border-radius: 12px; color: #222;}
.result-ranking-panel h2 { margin-top: 0; font-size: 1.2rem;}
.result-view h2 { margin-top: 0;}
.score { font-size: 2.5rem; font-weight: bold; margin: .5rem 0;}
.result-attributes { display: flex; gap: .5rem; flex-wrap: wrap;}
.result-attributes p { border-left: 5px solid; background: #f2f6fb; padding: .7rem;}
.result-bottom { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 0.2rem;}
.result-ranking { flex: 1; min-width: 0;}
.result-buttons { flex: 0 0 220px; display: flex; flex-direction: column; gap: 0.8rem;}
.result-ranking-panel { flex: 1; min-width: 0; padding: 0.8rem; background: #e9e9e5; border-radius: 12px; color: #222;}
.result-buttons { flex: 0 0 220px; display: flex; flex-direction: column; gap: 0.8rem;}
.result-buttons { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 0.8rem; min-width: 0;}
.result-buttons button { width: 100%; padding: 0.7rem; cursor: pointer;}
/* 黒板にチョークで書いたようなタイトルボタン */
.result-buttons button.chalk-button { width: fit-content; align-self: center; padding: 0.5rem 0.8rem;
  background: transparent; color: #f5f1df; border: none; border-radius: 0; font-size: 1rem;
  font-weight: bold; letter-spacing: 0.04em; box-shadow: none; text-decoration: none;
  border-bottom: 3px solid #f5f1df; transition: color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;}
.result-buttons button.chalk-button:hover { background: transparent; color: #ffeb9c; border-bottom-color: #ffeb9c; transform: translateY(-2px);}
.result-buttons button.chalk-button:active { transform: translateY(1px);}
.result-buttons button.chalk-button:focus-visible { outline: 2px dashed #ffeb9c; outline-offset: 5px;}
.learning-tip { flex: 2; min-width: 0; margin: 0; padding: 1rem; box-sizing: border-box; border-radius: 10px; background: #284b3c; border: 2px solid #f0c94d; color: #fff;}
.learning-tip h3 { margin: 0;}
.learning-tip p { line-height: 1.7;}
details { margin: 1rem 0;}
li { line-height: 1.7;}
.triangle-chart { display: block; width: 100%; max-width: 240px; margin: 0 auto; overflow: visible;}
.triangle-grid { fill: none; stroke: #b8c2d1; stroke-width: 2;}
.triangle-target { fill: rgba(128, 83, 165, 0.08); stroke: #b8c2d1; stroke-width: 1.5; stroke-dasharray: 4 3;}
.triangle-value { fill: rgba(255, 105, 180, 0.3); stroke: #eb557d; stroke-width: 3;}
.triangle-chart text { font-size: 12px; fill: #fff;}
.result-ranking-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px;}
@media (max-width: 700px) { .result-ranking-header {flex-wrap: wrap;}}
</style>
