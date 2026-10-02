<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import TitleView from './views/TitleView.vue'
import CourseGameView from './views/CourseGameView.vue'
import TypingGameView from './views/TypingGameView.vue'
import BehindGameView from './views/BehindGameView.vue'
import { pickLearningTip } from './utils/gameLogic.js'
import data from './data/gameData.json'
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
</script>

<template>
  <main class="container" :class="{ 'title-container': screen === 'title', playing: screen === 'puzzle' || screen === 'typing' }">
    <nav v-if="screen === 'title' || screen === 'behind'" class="top-nav" aria-label="展示メニュー">
      <span v-if="screen !== 'title'">大学生活を体験しよう</span>
      <button v-if="screen === 'title'" class="behind-button" @click="show('behind')">このゲームの裏側を見る</button>
    </nav>
    <TitleView v-if="screen === 'title'" @start="begin" />
    <CourseGameView v-else-if="screen === 'puzzle'" @finish="finishCourse" @cancel="show('title')" />
    <section v-else-if="screen === 'puzzle-result'" class="result-view">
      <div class="result-banner" :class="{ cleared: courseResult.allCleared }"><small>履修登録 成績表</small><h2>{{ courseResult.allCleared ? '全分野クリア！' : 'あと一歩、次の作戦へ！' }}</h2><p class="score">{{ courseResult.score }}<small> 点</small></p><p>{{ courseResult.selectedSubjectIds.length }}科目登録 ／ {{ courseResult.clearedCount }} / {{ data.attributes.length }}分野達成</p><div class="score-breakdown"><span>獲得単位 {{ courseResult.earnedPoints }}</span><span>＋ ボーナス {{ courseResult.bonus }}点</span></div></div>
      <div class="achievement-grid"><article v-for="item in data.attributes" :key="item.id" :style="{ '--field-color': item.color }"><h3>{{ item.name }}</h3><strong>{{ courseResult.attributeScores[item.id] }}<small> / {{ item.clearScore }}単位</small></strong><progress :value="Math.min(courseResult.attributeScores[item.id], item.clearScore)" :max="item.clearScore" :aria-label="item.name + 'の達成度'"></progress><p>{{ courseResult.attributeScores[item.id] >= item.clearScore ? '目標達成！ 目標より＋' + (courseResult.attributeScores[item.id] - item.clearScore) + '単位' : 'あと ' + (item.clearScore - courseResult.attributeScores[item.id]) + '単位' }}</p></article></div>
      <p class="next-strategy"><b>次の作戦：</b>{{ courseAdvice }}</p>
      <details><summary>登録した科目を見る（{{ enrolledSubjects.length }}科目）</summary><div class="enrolled-list"><span v-for="item in enrolledSubjects" :key="item.id" :style="{ borderColor: data.attributes.find(attr => attr.id === item.attributeId).color }">{{ item.name }}</span></div></details>
      <aside v-if="learningTip" class="learning-tip"><h3>ひとこと学習：{{ learningTip.subjectName }}</h3><p>{{ learningTip.text }}</p></aside>
      <button @click="show(mode === 'sequential' ? 'typing' : 'title')">{{ mode === 'sequential' ? '履修した科目のタイピングへ' : 'タイトルへ' }}</button>
    </section>
    <TypingGameView v-else-if="screen === 'typing'" :mode="mode" :selected-subject-ids="courseResult?.selectedSubjectIds ?? []" @finish="finishTyping" @cancel="show('title')" />
    <section v-else-if="screen === 'typing-result'" class="result-view">
      <h2>授業チャレンジの結果</h2>
      <p class="score">{{ typingResult.score }} 点</p>
      <p>{{ typingResult.completed }} 問完了 ／ 正確率 {{ typingResult.accuracy }}% ／ {{ typingResult.cpm }} 文字/分</p>
      <p>ミス {{ typingResult.mistakes }} 回{{ typingResult.sentencesUnlocked ? ' ／ 文章チャレンジ解放！' : '' }}</p>
      <p v-if="mode === 'sequential'">総合：{{ courseResult.score + typingResult.score }} 点</p>
      <aside v-if="learningTip" class="learning-tip"><h3>ひとこと学習：{{ learningTip.subjectName }}</h3><p>{{ learningTip.text }}</p></aside>
      <details v-if="reviewItems.length" open><summary>入力した用語を振り返る（{{ reviewItems.length }}種類）</summary><article v-for="item in reviewItems" :key="item.id" class="review-card"><small>{{ item.subject?.name }}</small><h3>{{ item.text }}</h3><p>{{ item.explanation }}</p><p class="game-link">このゲームでは：{{ item.subject?.gameConnection }}</p></article></details>
      <button @click="show('title')">タイトルへ</button>
      <button @click="show('behind')">開発の裏側を見る</button>
    </section>
    <BehindGameView v-else-if="screen === 'behind'" :backend-status="backendStatus" @back="show('title')" />
  </main>
</template>

<style scoped>
.container { box-sizing: border-box; max-width: 1240px; padding: 1rem; margin: 0 auto; }
.container.playing { max-width: 1440px; padding: .5rem; }
.review-card { padding: .8rem; margin: .6rem 0; background: #f2f6fb; border-radius: 10px; } .review-card h3 { margin: .3rem 0; } .review-card p { line-height: 1.6; } .game-link { border-left: 4px solid #2258a8; padding-left: .6rem; }
.top-nav { display: flex; justify-content: flex-end; align-items: center; min-height: 2rem; margin-bottom: .6rem; font-size: .85rem; color: #526074; }
.behind-button { background: transparent; color: #2258a8; margin: 0; padding: .35rem; text-decoration: underline; }
.behind-button:hover { background: #e5edfa; }
.title-container { max-width: 1000px; }
.title-container :deep(.title-view) { box-sizing: border-box; padding: clamp(.8rem, 3vh, 1.7rem); }
.title-container :deep(.title-view h2) { margin: .6rem 0; }
.title-container :deep(.title-view p) { margin: .5rem 0; }
.title-container :deep(.title-buttons) { margin-top: 1.1rem; gap: 1rem; padding-bottom: .7rem; }
.title-container :deep(.title-view .button) { min-height: 64px; padding: .65em; }
:deep(.game-panel) { padding: clamp(1rem, 2vw, 1.7rem); }
.result-banner { text-align: center; padding: 1rem; border-radius: 16px; background: linear-gradient(130deg, #e7efff, #f4edff); border: 2px solid #c9d7ed; } .result-banner.cleared { background: linear-gradient(130deg, #fff0bd, #e3f7e9); border-color: #cfb452; } .result-banner h2 { margin: .5rem 0; } .result-banner .score { font-size: 3.5rem; } .score small { font-size: 1rem; } .score-breakdown { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }
.achievement-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .7rem; margin: 1rem 0; } .achievement-grid article { padding: .8rem; border-top: 5px solid var(--field-color); background: #f2f6fb; border-radius: 10px; } .achievement-grid h3 { font-size: 1rem; margin: 0 0 .6rem; } .achievement-grid strong { font-size: 1.8rem; } .achievement-grid small { font-size: .8rem; } .achievement-grid progress { display: block; width: 100%; height: 12px; accent-color: var(--field-color); margin-top: .5rem; } .achievement-grid p { font-size: .8rem; margin-bottom: 0; } .next-strategy { padding: .8rem; background: #eaf1ff; border-radius: 10px; line-height: 1.6; } .enrolled-list { display: flex; flex-wrap: wrap; gap: .5rem; padding-top: .7rem; } .enrolled-list span { border-left: 4px solid; padding: .4rem .6rem; background: #f2f6fb; }
@media (max-width: 600px) { .achievement-grid { grid-template-columns: 1fr; } }
.result-view { max-width: 800px; margin: 0 auto; }
.result-view h2 { margin-top: 0; }
.score { font-size: 2.5rem; font-weight: bold; margin: .5rem 0; }
.result-attributes { display: flex; gap: .5rem; flex-wrap: wrap; }
.result-attributes p { border-left: 5px solid; background: #f2f6fb; padding: .7rem; }
.learning-tip { margin: 1rem 0; padding: 1rem; border-radius: 10px; background: #fff7dc; }
.learning-tip h3 { margin: 0; } .learning-tip p { line-height: 1.7; }
details { margin: 1rem 0; } li { line-height: 1.7; }
</style>
