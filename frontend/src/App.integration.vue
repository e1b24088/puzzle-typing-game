<script setup>
import { nextTick, onMounted, ref } from 'vue'
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
  <main class="container" :class="{ 'title-container': screen === 'title' }">
    <nav class="top-nav" aria-label="展示メニュー">
      <span v-if="screen !== 'title'">大学生活を体験しよう</span>
      <button v-if="screen === 'title'" class="behind-button" @click="show('behind')">このゲームの裏側を見る</button>
    </nav>
    <TitleView v-if="screen === 'title'" @start="begin" />
    <CourseGameView v-else-if="screen === 'puzzle'" @finish="finishCourse" @cancel="show('title')" />
    <section v-else-if="screen === 'puzzle-result'" class="result-view">
      <h2>履修登録の結果</h2>
      <p class="score">{{ courseResult.score }} 点</p>
      <p>属性点 {{ courseResult.earnedPoints }} ＋ ボーナス {{ courseResult.bonus }}</p>
      <p>{{ courseResult.allCleared ? '全属性クリア！' : '次は分野のバランスを考えてみよう。' }}</p>
      <div class="result-attributes"><p v-for="item in data.attributes" :key="item.id" :style="{ borderColor: item.color }">{{ item.name }}：{{ courseResult.attributeScores[item.id] }} / {{ item.clearScore }}</p></div>
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
      <details v-if="typingResult.history.length"><summary>入力した用語を振り返る</summary><ul><li v-for="(item, index) in typingResult.history" :key="index">{{ item.text }}：{{ item.explanation }}</li></ul></details>
      <button @click="show('title')">タイトルへ</button>
      <button @click="show('behind')">開発の裏側を見る</button>
    </section>
    <BehindGameView v-else-if="screen === 'behind'" :backend-status="backendStatus" @back="show('title')" />
  </main>
</template>

<style scoped>
.container { box-sizing: border-box; max-width: 1240px; padding: 1rem; margin: 0 auto; }
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
.result-view { max-width: 800px; margin: 0 auto; }
.result-view h2 { margin-top: 0; }
.score { font-size: 2.5rem; font-weight: bold; margin: .5rem 0; }
.result-attributes { display: flex; gap: .5rem; flex-wrap: wrap; }
.result-attributes p { border-left: 5px solid; background: #f2f6fb; padding: .7rem; }
.learning-tip { margin: 1rem 0; padding: 1rem; border-radius: 10px; background: #fff7dc; }
.learning-tip h3 { margin: 0; } .learning-tip p { line-height: 1.7; }
details { margin: 1rem 0; } li { line-height: 1.7; }
</style>
