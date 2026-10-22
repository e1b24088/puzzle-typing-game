<script setup>
import { computed, nextTick, onUnmounted, ref, watch} from 'vue'
import data from '../data/gameData.json'
import { canSelectSubject, canDeselectSubject, makeSlots, scorePuzzle } from '../utils/gameLogic.js'
const emit = defineEmits(['finish', 'cancel'])
const slots = makeSlots( data.subjects, data.slots, data.consecutiveGroups )
const selections = ref({})
const activeSlot = ref(null)
const started = ref(false)
const paused = ref(false)
let pausedAt = 0
const remaining = ref(data.settings.puzzleSeconds)
const panel = ref(null)
const timerProgress = computed(() => {
  const total = data.settings.puzzleSeconds
  return total > 0 ? remaining.value / total : 0
})
let deadline = 0
let timer
let finished = false

// ルール説明スライド
const currentSlide = ref(0)
const ruleSlides = [
  {
    title: '時間割の見方',
    description: [
      'あなたはこれから、自分だけの時間割を作ります。',
      '赤線で囲われた部分が曜日と時間帯ごとに科目を登録する時間割です。',
      '青枠で囲われた部分にあるメモが、履修できる科目の候補です。'
    ],
    image: '/images/course-slide1.png'
  },
  {
    title: '科目の選び方',
    description: [
      '時間割のコマを選ぶと、その時間に履修できる科目が表示されます。',
      '候補の中から科目を選んで、時間割に登録しましょう。',
      '科目によって分野や獲得できる単位数が異なります。'
    ],
    image: '/videos/course-slide2.mp4'
  },
  {
    title: '履修登録のルール',
    description: [
      '赤枠で囲われた固定科目は最初から登録されており、変更できません。',
      '登録済みの科目をもう一度選ぶと、選択を解除できます。',
      '青枠の科目のように同じ科目を別のコマで複数回登録することはできません。'
    ],
    image: '/images/course-slide3.png'
  },
  {
    title: 'クリア条件',
    description: [
      '赤枠で囲われた部分には、3つの分野それぞれの目標となる単位数が設定されています。',
      '右上の目標表示を確認しながら、時間割を組み立てましょう。',
      `3分野すべての目標を達成すると、ボーナス${data.settings.allAttributesBonus}点を獲得できます。`
    ],
    image: '/images/course-slide4.png'
  },
  {
    title: '特殊な科目',
    description: [
      '赤枠で囲われた連コマの科目は、連続する複数の時間帯に登録されます。',
      '青枠の科目は、前提科目が未登録のため、まだ選択できません。前提科目がある科目は、必要な科目を先に登録する必要があります。',
      '例えば、ソフトウェア工学Ⅱを登録するには、前提科目のソフトウェア工学Ⅰが必要です。',
      '時間割全体を確認しながら、効率よく履修登録を進めましょう。'
    ],
    image: '/images/course-slide5.png'
  }
]
// 前のスライドへ
function previousSlide() {
  if (currentSlide.value > 0) {
    currentSlide.value--
  }
}
// 次のスライドへ
function nextSlide() {
  if (currentSlide.value < ruleSlides.length - 1) {
    currentSlide.value++
  }
}
const result = computed(() => scorePuzzle( slots, selections.value, data.subjects, data.attributes, data.settings.allAttributesBonus, data.consecutiveGroups ))
// 目標達成時の花火演出
const fireworks = ref({})
const fireworkTimers = {}
function triggerFirework(id) {
  fireworks.value[id] = (fireworks.value[id] || 0) + 1
  clearTimeout(fireworkTimers[id])
  fireworkTimers[id] = setTimeout(() => {
    delete fireworks.value[id]
  }, 750)
}
watch(() => data.attributes.map( item => result.value.attributeScores[item.id] >= item.clearScore ),
  (current, previous) => {
    if (!previous) return
    current.forEach((achieved, index) => {
      if (achieved && !previous[index]) {
        triggerFirework(data.attributes[index].id)
      }
    })
  }
)
const choices = computed(() => data.subjects.filter(item => activeSlot.value?.candidates.includes(item.id)))
const days = ['月', '火', '水', '木', '金']
const subject = id => data.subjects.find(item => item.id === id)
const attribute = id => data.attributes.find(item => item.id === id)
const selectedId = slot => slot.fixed ? slot.candidates[0] : selections.value[slot.id]
const available = id => canSelectSubject( slots, selections.value, activeSlot.value?.id, id, data.subjects, data.consecutiveGroups )
// 前提科目が不足しているか判定する
const missingPrerequisites = id => {
  const subject = data.subjects.find(item => item.id === id)
  if (!subject?.prerequisiteIds?.length) return false
  const registeredIds = new Set( slots .map(slot => slot.fixed ? slot.candidates[0] : selections.value[slot.id] ) .filter(Boolean) )
  return subject.prerequisiteIds.some( prerequisiteId => !registeredIds.has(prerequisiteId) )
}
const hasDependentSubjects = id => {
  const subject = data.subjects.find(item => item.id === id)
  if (!subject) return false
  // この科目を前提科目としている科目が登録済みか調べる
  return data.subjects.some(item =>
    item.prerequisiteIds?.includes(id) &&
    Object.values(selections.value).includes(item.id)
  )
}
async function openSlot(slot) {
  activeSlot.value = slot
  await nextTick()
  panel.value?.focus()
}
function playSound(filename) {
  const audio = new Audio(`/sounds/${filename}.mp3`)
  audio.volume = 0.5
  audio.play().catch(error => {
    console.warn('効果音を再生できませんでした:', error)
  })
}
function choose(item) {
  if (!activeSlot.value || !available(item.id)) return
  if (!paused.value && Date.now() >= deadline) {
    finish()
    return
  }
  const slotId = activeSlot.value.id
  const current = selections.value[slotId]
  // 選択済み科目を解除する
  if (current === item.id) {
    const canRemove = canDeselectSubject( slots, selections.value, slotId, data.subjects, data.consecutiveGroups )
    if (!canRemove) return
    // 連コマなら2枠とも解除する
    const group = data.consecutiveGroups?.find( group => group.subjectId === item.id )
    const removeSlotIds = group ? group.slotIds : [slotId]
    for (const id of removeSlotIds) {
      delete selections.value[id]
    }
    playSound('subject-remove')
    return
  }
  // 新しい科目の登録先を決める
  const group = data.consecutiveGroups?.find( group => group.subjectId === item.id )
  const targetSlotIds = group ? group.slotIds : [slotId]
  // 登録先にある、上書き対象の科目を取得する
  const existingIds = [ ...new Set( targetSlotIds .map(id => selections.value[id])
                        .filter(id => id && id !== item.id))]
  // 上書き対象の科目を解除できるか、すべて確認する
  for (const existingId of existingIds) {
    const existingSlot = slots.find( slot => selections.value[slot.id] === existingId )
    if (!existingSlot) return
    const canRemove = canDeselectSubject( slots, selections.value, existingSlot.id, data.subjects, data.consecutiveGroups)
    if (!canRemove) return
  }
  // すべて解除可能な場合だけ、既存科目を解除する
  for (const existingId of existingIds) {
    for (const id of Object.keys(selections.value)) {
      if (selections.value[id] === existingId) {
        delete selections.value[id]
      }
    }
  }
  // 新しい科目を登録する
  for (const id of targetSlotIds) {
    selections.value[id] = item.id
  }
  playSound('subject-register')
}
function start() {
  started.value = true
  playSound('game-start')
  deadline = Date.now() + data.settings.puzzleSeconds * 1000
  timer = setInterval(() => {
    if (paused.value) return
    remaining.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    if (remaining.value === 0) finish() }, 100)
}
function finish() {
  if (finished) return
  finished = true
  clearInterval(timer)
  playSound('game-end')
  emit('finish', result.value)
}
function togglePause() {
  if (!started.value || finished) return
  if (!paused.value) {
    // 一時停止
    paused.value = true
    pausedAt = Date.now()
    clearInterval(timer)
  } else {
    // 再開
    const pauseTime = Date.now() - pausedAt
    deadline += pauseTime
    paused.value = false
    timer = setInterval(() => {
      remaining.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      if (remaining.value === 0) finish()
    }, 100)
  }
}
function handleKeydown(event) {
  if (event.key === 'F9') {
    event.preventDefault()
    togglePause()
  }
}
window.addEventListener('keydown', handleKeydown)
onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('keydown', handleKeydown)
  Object.values(fireworkTimers).forEach(clearTimeout)
})
</script>

<template>
  <section class="game-panel course-game" :class="{ playing: started }">
    <template v-if="!started">
      <div class="rule-page">
        <!-- スライドのタイトル -->
        <h2 class="rule-title">{{ ruleSlides[currentSlide].title }}</h2>
        <!-- 説明文と画像 -->
        <div class="rule-content">
          <div class="rule-description">
            <p v-for="(line, index) in ruleSlides[currentSlide].description" :key="index">{{ line }}</p>
          </div>
          <div class="rule-image">
            <video v-if="ruleSlides[currentSlide].image.endsWith('.mp4')"
                   :src="ruleSlides[currentSlide].image" autoplay muted loop playsinline></video>
            <img v-else :src="ruleSlides[currentSlide].image" :alt="ruleSlides[currentSlide].title"/>
          </div>
        </div>
        <!-- スライド移動 -->
        <nav class="rule-navigation" aria-label="ルール説明のページ移動">
          <button type="button" class="rule-arrow" :disabled="currentSlide === 0" @click="previousSlide" aria-label="前のページ"> ← </button>
          <span class="rule-page-number"> {{ currentSlide + 1 }} / {{ ruleSlides.length }} </span>
          <button v-if="currentSlide < ruleSlides.length - 1" type="button" class="rule-arrow" @click="nextSlide" aria-label="次のページ" > → </button>
          <!-- 最終ページでは右側を空欄にする -->
          <span v-else class="rule-arrow-placeholder" aria-hidden="true"></span>
        </nav>
        <!-- 下部の操作ボタン -->
        <div class="rule-footer">
          <button type="button" class="rule-title-button" @click="emit('cancel')"> タイトルへ </button>
          <button type="button" class="rule-start-button" @click="start"> 履修登録を始める</button>
        </div>
      </div>
    </template>
    <template v-else>
      <header class="game-header">
        <div class="game-title">
          <h2>📝 履修登録タイム</h2>
          <button class="button" @click="finish">
            <div class="bg">
              <div class="shine"></div>
            </div>
            <div class="wrap">
              <div class="wrap-content">
                <div class="content">
                  <div class="outline"></div>
                  <div class="glyphs">
                    <span class="text">登録完了</span>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>
        <div class="clock" role="timer">
          <div class="clock-content">
            <div class="timer-ring-wrap">
              <svg class="timer-ring" viewBox="0 0 44 44" aria-hidden="true">
                <circle class="timer-ring-bg" cx="22" cy="22" r="18"/>
                <circle class="timer-ring-progress"
                cx="22" cy="22" r="18"
                :style="{ strokeDashoffset: 113.1 * (1 - timerProgress) }"/>
              </svg>
              <strong>{{ remaining }}<small>秒</small></strong>
            </div>
          </div>
        </div>
        <div class="registration-count">
          <span class="registration-label">履修登録数</span>
          <div class="registration-value">
            <strong>{{ result.selectedSubjectIds.length }}</strong>
            <span>/ {{ slots.length }} 科目</span>
          </div>
        </div>
        <div class="goals" aria-label="クリアまでの単位数">
          <div v-for="item in data.attributes" :key="item.id"
          :class="{ achieved: result.attributeScores[item.id] >= item.clearScore }"
          :style="{ borderColor: item.color, '--attribute-color': item.color }">
          <span>{{ item.name }}</span>
          <b>{{ Math.max(0, item.clearScore - result.attributeScores[item.id]) === 0 ? '達成！' : 'あと ' + Math.max(0, item.clearScore - result.attributeScores[item.id]) + ' 単位' }}</b>
          <small>{{ result.attributeScores[item.id] }} / {{ item.clearScore }}</small>
          <!-- 花火の粒 -->
          <span v-if="fireworks[item.id]" :key="fireworks[item.id]" class="firework" aria-hidden="true" >
            <i v-for="n in 12" :key="n" :style="{ '--angle': ((n - 1) * 30) + 'deg', '--particle-color': ['#064583', '#65D5FF', '#8053A5'][n % 3], '--distance': (35 + (n % 3) * 10) + 'px' }"></i>
          </span>
        </div>
      </div>
      </header>
      <div class="course-layout">
        <div class="wood-frame">
          <div class="wood-frame-top"></div>
          <div class="wood-frame-bottom"></div>
          <div class="wood-frame-left"></div>
          <div class="wood-frame-right"></div>
          <div class="timetable">
            <div v-for="day in days" :key="day" class="day-column">
              <h3>{{ day }}</h3>
              <button v-for="slot in slots.filter(item => item.day === day)" :key="slot.id" class="slot-button"
                :class="{ selected: selectedId(slot), active: activeSlot?.id === slot.id }"
                :style="selectedId(slot) ? { borderColor: attribute(subject(selectedId(slot)).attributeId).color, backgroundColor: attribute(subject(selectedId(slot)).attributeId).color } : {}"
                :aria-pressed="activeSlot?.id === slot.id" @click="openSlot(slot)">
                <small>{{ slot.period }}限 {{ slot.fixed ? '固定' : '' }}</small>
                <span>{{ selectedId(slot) ? subject(selectedId(slot)).name : '＋ 科目を選ぶ' }}</span>
                <small v-if="selectedId(slot)">{{ attribute(subject(selectedId(slot)).attributeId).name }} +{{ subject(selectedId(slot)).points }}単位</small>
              </button>
              <div v-if="day === '水'" class="no-class">3・4限は授業なし</div>
            </div>
          </div>
        </div>
        <aside ref="panel" class="choice-panel" tabindex="-1" aria-label="科目選択">
          <div class="metal-header">
            <template v-if="activeSlot">
              <h3>{{ activeSlot.day }}曜 {{ activeSlot.period }}限</h3>
              <p>{{ activeSlot.fixed ? '固定科目：変更できません' : 'この時間の3候補から選ぼう' }}</p>
            </template>
            <template v-else>
              <h3>科目選択</h3>
              <p>左の時間割からコマを選ぼう</p>
            </template>
          </div>
          <template v-if="activeSlot">
            <div class="choice-board">
              <div class="choice-list">
                <button v-for="item in choices"
                  :key="item.id" class="subject-card"
                  :class="{ selected: selections[activeSlot.id] === item.id }"
                  :disabled="!available(item.id)"
                  :style="{ '--subject-color': attribute(item.attributeId).color }"
                  @click="choose(item)" >
                  <!-- キラキラ -->
                  <svg class="subject-doodle sparkle" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" >
                    <path d="M12 0C12 6.6 17.4 12 24 12C17.4 12 12 17.4 12 24C12 17.4 6.6 12 0 12C6.6 12 12 6.6 12 0Z"></path>
                  </svg>
                  <!-- 右上のマーク・前提科目表示 -->
                  <span v-if="item.prerequisiteIds?.length" class="prerequisite-label">
                    前提：{{ data.subjects
                    .filter(subject => item.prerequisiteIds.includes(subject.id))
                    .map(subject => subject.name) .join('・') }}
                  </span>
                  <!-- 連コマ画像 -->
                  <img v-if="data.consecutiveGroups.some(group => group.subjectId === item.id)"
                    class="consecutive-icon" src="/images/consecutive.png" alt="連続するコマ"
                  />
                  <strong class="subject-title">{{ item.name }}</strong>
                  <small class="subject-info">
                    {{ attribute(item.attributeId).name }} ＋ {{ item.points }}単位 ／ 
                    {{ activeSlot.fixed ? '固定' : selections[activeSlot.id] === item.id ?
                    hasDependentSubjects(item.id) ? '応用科目があるため外せません' : '選択中' :
                    missingPrerequisites(item.id) ? '前提科目が足りません' :
                    !available(item.id) ? '他コマで登録済み' : '選択可能' }}
                  </small>
                  <span class="subject-description">
                    {{ item.description }}
                  </span>
                </button>
              </div>
            </div>
          </template>
          <div v-else class="empty-choice">
            <h3>まずコマを選ぼう</h3>
            <p>左の時間割を押すと、その時間の科目がここに出ます。</p>
            <p>色と分野名を見て、バランスよく履修しよう。</p>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>
<style scoped>
.game-panel.course-game { padding: 0.1rem 1rem 1rem; box-sizing: border-box; background-color: #F2F2EF; }
/* ルール説明画面全体 */
.rule-page { display: flex; flex-direction: column; min-height: 0; box-sizing: border-box;
             padding: 1rem 1.5rem; gap: 1rem; }
/* スライドタイトル */
.rule-title { margin: 0; text-align: center; font-size: 2rem; color: #20344a; }
/* 説明文と画像 */
.rule-content { display: grid; grid-template-columns: 1fr 1.2fr; align-items: center; gap: 2rem;
                width: 100%; max-width: 1200px; margin: 0 auto; }
/* 説明文 */
.rule-description { display: flex; flex-direction: column; justify-content: center; gap: 1rem;
                    font-size: 1.1rem; line-height: 1.8; }
.rule-description p { margin: 0; }
/* スライド画像 */
.rule-image { width: 100%; aspect-ratio: 16 / 9; overflow: hidden; border: 3px solid #20344a;
              border-radius: 8px; background: #fff; box-shadow: 4px 4px 0 rgba(32, 52, 74, 0.2); }
.rule-image img,
.rule-image video { display: block; width: 100%; height: 100%; object-fit: contain; }/* ページ移動 */
.rule-navigation { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
                   width: 100%; max-width: 500px; margin: 0 auto; gap: 1rem; }
.rule-arrow { justify-self: center; min-width: 56px; min-height: 44px; padding: 0.4rem 1rem; font-size: 1.5rem;
              font-weight: bold; color: #fff; background: #064583; border: 2px solid #20344a; border-radius: 8px; cursor: pointer; }
.rule-arrow:hover:not(:disabled) { background: #0A579F; }
.rule-arrow:disabled { opacity: 0.35; cursor: not-allowed; }
.rule-page-number { font-size: 1.1rem; font-weight: bold; color: #20344a; white-space: nowrap; }
.rule-arrow-placeholder { width: 56px; height: 44px; justify-self: center; visibility: hidden; }
/* 下部のボタン */
.rule-footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; width: 100%;
               max-width: 1200px; margin: auto auto 0; padding-top: 0.5rem; }
/* タイトルへ */
.rule-title-button { padding: 0.75rem 1.5rem; color: #20344a; background: #fff; border: 2px solid #20344a;
                     border-radius: 8px; font-weight: bold; cursor: pointer; }
.rule-title-button:hover { background: #e6ebf0; }
/* 履修登録を始める */
.rule-start-button { padding: 0.85rem 2rem; color: #fff; background: #064583; border: 2px solid #20344a; border-radius: 8px;
                     box-shadow: 3px 3px 0 #20344a; font-size: 1.1rem; font-weight: bold; cursor: pointer; }
.rule-start-button:hover { background: #0A579F; }
.rule-start-button:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 #20344a; }
/* 画面が狭い場合 */
@media (max-width: 700px) {
  .rule-page { padding: 0.75rem; gap: 0.75rem; }
  .rule-title { font-size: 1.5rem; }
  .rule-content { grid-template-columns: 1fr; gap: 1rem; }
  .rule-description { font-size: 0.95rem; gap: 0.5rem; }
  .rule-footer { gap: 0.5rem; }
  .rule-title-button,
  .rule-start-button { padding: 0.7rem 0.8rem; font-size: 0.9rem; }
}
h2 { margin: 0 0 .2rem; font-size: 1.5rem; }
.game-header { display: grid; grid-template-columns: 1fr auto .8fr 1.2fr; gap: 0.75rem; align-items: center; margin: 0 0 0.4rem; position: relative; }
.game-title { display: flex; flex-direction: column; align-items: flex-start; }
.game-title h2 { position: absolute; left: calc((100% - 0.8rem) * 1.7 / 2.7 / 2); top: 1.2rem; transform: translateX(-50%); margin: 0; font-size: 2rem; white-space: nowrap; }
/* 登録完了ボタン */
.game-header .button { position: relative; width: 170px; height: 54px; margin: 1.5rem 0 0;
                       padding: 0; border: none; border-radius: 0; background: transparent;
                       box-shadow: none; cursor: pointer; outline: none; z-index: 10;
                       transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.game-header .button:hover { animation: doodle-wobble 0.4s ease-in-out infinite alternate; }
.game-header .button:active { transform: scale(0.94) translateY(3px); }
@keyframes doodle-wobble { 0% { transform: rotate(-1.5deg) scale(1.02); }
                         100% { transform: rotate(1.5deg) scale(1.02); } }
.game-header .button .bg { position: absolute; inset: 0; background: #064583; border: 3px solid #172536;
                           border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
                           box-shadow: 3px 4px 0 #172536; overflow: hidden; z-index: 1;
                           transition: box-shadow 0.2s; }
.game-header .button:hover .bg { background: #0A579F; }
.game-header .button:active .bg { box-shadow: 1px 2px 0 #172536; }
.game-header .button .shine { position: absolute; top: 6px; left: 12px; width: 36px;
                              height: 7px; background: #fff; border: 1px solid #172536;
                              border-radius: 10px; transform: rotate(-4deg); opacity: 0.85;
                              transition: all 0.3s; }
.game-header .button:hover .shine { transform: rotate(4deg) translateX(8px); width: 28px; }
.game-header .button .wrap,
.game-header .button .wrap-content,
.game-header .button .content { position: absolute; inset: 0; display: flex; align-items: center;
                                justify-content: center; }
.game-header .button .wrap { z-index: 2; }
.game-header .button .outline { position: absolute; bottom: 8px; left: 20%; right: 20%; height: 3px;
                                background: #65D5FF; border-radius: 5px; transform: rotate(-1deg); }
.game-header .button:hover .outline { animation: scribble-line 0.2s steps(2) infinite alternate; }
@keyframes scribble-line { 0% { transform: rotate(-1deg); background: #65D5FF; }
                         100% { transform: rotate(1deg) translateY(2px); background: #fff; } }
.game-header .button .glyphs { display: flex; align-items: center; font-family: sans-serif;
                               font-size: 1.3rem; font-weight: 900; letter-spacing: 0.15rem; }
.game-header .button .text { color: #fff; text-shadow: 1px 2px 0 #172536; transition: color 0.2s; }
.game-header .button:hover .text { animation: doodle-bounce 0.6s ease-in-out infinite alternate; color: #D9F4FF; }
@keyframes doodle-bounce { 0% { transform: translateY(0) rotate(-2deg); } 100% { transform: translateY(-3px) rotate(2deg); } }
.game-header > div:first-child small { display: inline-block; margin-left: 10px; font-size: 1rem; }
.registration-count { background: #fff4c7; border: 1px solid #e2c96b; border-radius: 4px; padding: 0.45rem 0.9rem;
                      box-shadow: 2px 3px 0 rgba(80, 60, 30, 0.15); white-space: nowrap; align-self: center; justify-self: end; }
.registration-label { display: block; color: #805b27; font-size: 0.75rem; font-weight: bold; margin-bottom: 0.1rem; }
.registration-value { display: flex; align-items: baseline; gap: 0.25rem; color: #20344a; }
.registration-value strong { font-size: 1.8rem; line-height: 1; font-weight: 800; color: #20344a; }
.registration-value span { font-size: 0.9rem; }
.clock { text-align: center; justify-self: end; transform: translateX(11rem); }
.clock-content { display: flex; align-items: center; justify-content: center; }
.timer-ring-wrap { position: relative; width: 70px; height: 70px; }
.timer-ring { width: 70px; height: 70px; transform: rotate(-90deg); }
.timer-ring-wrap strong { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; line-height: 1; font-variant-numeric: tabular-nums; }
.timer-ring-wrap strong small { font-size: .7rem; margin-left: 2px; }
.timer-ring-bg, .timer-ring-progress { fill: none; stroke-width: 4; }
.timer-ring-bg { stroke: #d9d9d9; }
.timer-ring-progress { stroke: #20344a; stroke-linecap: round; stroke-dasharray: 113.1; transition: stroke-dashoffset .15s linear; }
.goals { display: grid; grid-template-columns: repeat(3, 1fr); gap: .3rem .5rem; }
.goals > div { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .2rem; border: 3px solid; border-radius: 8px; padding: .4rem .3rem; font-size: .85rem; }
.goals > div.achieved { background: var(--attribute-color); color: #fff; }
.goals b { margin-left: 0; }
.goals small { min-width: 0; text-align: center; }
/* 花火を目標ボックスの中央から発生させる */
.goals > div { position: relative; }
/* 花火全体 */
.goals .firework { position: absolute; inset: 0; z-index: 5; pointer-events: none; overflow: visible; }
/* 花火の粒 */
.goals .firework i { position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; border-radius: 50%;
                     background: var(--particle-color); animation: goal-firework 0.7s ease-out forwards; }
/* 放射状に飛び散って消える */
@keyframes goal-firework { 0% { transform: rotate(var(--angle)) translateY(0) scale(1); opacity: 1; }
                         100% { transform: rotate(var(--angle)) translateY(calc(-1 * var(--distance)))
                         scale(0.2); opacity: 0; } }
.course-layout { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(300px, 1fr); gap: .8rem; align-items: stretch; }
.wood-frame { position: relative; padding: 12px; box-sizing: border-box; min-height: 0; }
.wood-frame-top, .wood-frame-bottom, .wood-frame-left, .wood-frame-right {
   position: absolute; background-image: url('/images/wood-frame-texture.png'); background-repeat: repeat; z-index: 2; pointer-events: none; }
/* 上 */
.wood-frame-top { top: 0; left: 0; right: 0; height: 12px; background-repeat: repeat-x; }
/* 下 */
.wood-frame-bottom { bottom: 0; left: 0; right: 0; height: 12px; background-repeat: repeat-x; }
/* 左 */
.wood-frame-left { top: 0; bottom: 0; left: 0; width: 12px; background-repeat: repeat-y; transform: rotate(180deg); }
/* 右 */
.wood-frame-right { top: 0; bottom: 0; right: 0; width: 12px; background-repeat: repeat-y; transform: rotate(180deg); }
.timetable { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .4rem; padding: 0.1rem 1rem 1rem; box-sizing: border-box; height: 100%; background-image: url('/images/timetable-bg.png'); background-repeat: repeat; background-position: center; }
.day-column { display: grid; grid-template-rows: 36px repeat(4, 110px); gap: .4rem; }
.day-column h3 { text-align: center; font-size: 1.1rem; align-self: center; color: #20344a; }
.slot-button { position: relative; display: flex; flex-direction: column; justify-content: center; gap: .3rem; width: 100%; margin: 0; padding: 1.1rem .45rem .45rem; color: #20344a; background: white; border: 2px solid #d8cf82; text-align: left; overflow-wrap: anywhere; box-shadow: 2px 3px 6px rgba(0, 0, 0, .15);
               min-height: 0; overflow: hidden;}
.slot-button::before { content: ''; position: absolute; top: .35rem; left: 50%; transform: translateX(-50%); width: 13px; height: 13px; border-radius: 50%; background: #d94b4b; border: 2px solid #b73535; box-shadow: 1px 2px 2px rgba(0, 0, 0, .25), inset 1px 1px 2px rgba(255, 255, 255, .5); }
.slot-button:hover { background: #fff39a !important;}
.slot-button.active { outline: 5px solid #20344a; outline-offset: -5px; }
.slot-button.selected { background: var(--slot-color); }
.slot-button small { font-size: .72rem; }
.slot-button span { font-weight: bold; font-size: .9rem; }
.no-class { grid-row: span 2; text-align: center; align-self: center; font-size: .8rem; color: #000000; }
.choice-panel { position: relative; box-sizing: border-box; padding: 0 10px 10px; background: #3CB371;
                border-left: 10px solid transparent; border-right: 10px solid transparent;
                border-bottom: 10px solid transparent; border-image-source: url('/images/metal-frame-texture.png');
                border-image-slice: 10; border-image-repeat: repeat; border-radius: 4px; overflow: hidden; }
.metal-header { position: relative; z-index: 2; margin: 0 -10px 1rem; height: 70px; padding: 0.8rem 1rem; box-sizing: border-box;
                background-image: url('/images/metal-frame-texture.png'); background-repeat: repeat; display: flex;
                flex-direction: column; justify-content: center; align-items: center; }
.metal-header h3 { font-size: 1.2rem; margin: 0; }
.metal-header p { margin: .4rem 0 0; font-size: .8rem; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: .5rem; } .panel-heading button { font-size: .8rem; padding: .4rem; margin: 0; }
.choice-list { display: grid; gap: 1rem; }
.choice-board { padding: 0.5rem 0 1rem; box-sizing: border-box; }
.subject-card { --bg-color: #fdfbf7; --ink-color: #2c2c2c; --paper-line: #e6e0d4; --tape-color: rgba(255, 221, 161, 0.85);
                position: relative; width: 95%; min-height: 120px; box-sizing: border-box; display: flex; flex-direction: column;
                align-items: flex-start; margin: 0; padding: 1rem 1rem .8rem; color: var(--ink-color); text-align: left;
                background: linear-gradient(var(--bg-color) 1.5rem, transparent 1.5rem) 0 0 / 100% 1.6rem, linear-gradient(var(--paper-line) 0.08rem, transparent 0.08rem) 0 1.5rem / 100% 1.6rem var(--bg-color); border: 0.2rem solid var(--ink-color);
                border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px; box-shadow: 0.35rem 0.35rem 0 var(--ink-color), inset 0 0 1.2rem rgba(0, 0, 0, 0.03);
                line-height: 1.5; cursor: pointer; transition: transform 0.25s ease, box-shadow 0.25s ease, border-radius 0.25s ease; }
.consecutive-icon { position: absolute; top: 8px; right: 8px; width: 40px; height: 40px; object-fit: contain;}
/* 上のテープ */
.subject-card::before { content: ""; position: absolute; top: -0.6rem; left: 50%; transform: translateX(-50%) rotate(-4deg);
                        width: 4.5rem; height: 1.2rem; background: var(--tape-color); border: 0.1rem solid rgba(0, 0, 0, 0.1);
                        border-radius: 2px 4px 2px 5px; box-shadow: 0.1rem 0.1rem 0.2rem rgba(0, 0, 0, 0.1); z-index: 3; }
/* ホバー */
.subject-card:hover:not(:disabled) { transform: translateY(-0.35rem) rotate(0.5deg);
                                     box-shadow: 0.5rem 0.6rem 0 var(--ink-color), inset 0 0 1.2rem rgba(0, 0, 0, 0.03);
                                     border-radius: 15px 255px 15px 225px / 255px 15px 225px 15px; }
/* 選択中 */
.subject-card.selected { box-shadow: 0.45rem 0.45rem 0 var(--subject-color), inset 0 0 1.2rem rgba(0, 0, 0, 0.03);
                         border-color: var(--subject-color); }
/* 無効 */
.subject-card:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
/* 科目名 */
.subject-title { position: relative; z-index: 2; font-size: 1.05rem; font-weight: 900; color: var(--ink-color);
                 margin-bottom: 0.45rem; }
/* 分野・単位・状態 */
.subject-info { position: relative; z-index: 2; display: inline-block; padding: 0.25rem 0.55rem; font-size: 0.75rem;
                font-weight: bold; color: var(--ink-color); background: var(--subject-color); border: 0.1rem solid var(--ink-color);
                border-radius: 8px; box-shadow: 0.15rem 0.15rem 0 var(--ink-color); margin-bottom: 0.7rem; }
/* 説明 */
.subject-description { position: relative; z-index: 2; font-size: 0.82rem; line-height: 1.5; }
/* 装飾 */
.subject-doodle { position: absolute; fill: none; stroke: var(--ink-color); stroke-width: 2; stroke-linecap: round;
                  stroke-linejoin: round; pointer-events: none; z-index: 1; }
.subject-doodle.sparkle { width: 1.1rem; height: 1.1rem; top: 3.5rem; left: 0.7rem; fill: #c6e377;}
.prerequisite-label { position: absolute; top: 8px; right: 8px; max-width: 45%; overflow: hidden;
                      text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; color: #315d4c;
                      background: #e5f4e9; border: 1px solid #548d68; border-radius: 4px;
                      padding: 3px 6px; }
.note { color: #526074; font-size: .8rem; margin: .5rem 0; }
@media (min-width: 1000px) and (min-height: 650px) { .course-game.playing { min-height: calc(100svh - 16px); display: flex; flex-direction: column; } .course-layout { flex: 1; } }
@media (max-width: 999px) { .course-layout { grid-template-columns: 1fr; } .game-header { grid-template-columns: 1fr 1fr; } .goals { grid-column: 1 / -1; } }
</style>
