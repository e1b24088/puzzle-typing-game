<script setup>
import { computed, nextTick, onUnmounted, ref } from 'vue'
import data from '../data/gameData.json'
import { canSelectSubject, makeSlots, scorePuzzle } from '../utils/gameLogic.js'
const emit = defineEmits(['finish', 'cancel'])
const slots = makeSlots(data.subjects)
const selections = ref({})
const activeSlot = ref(null)
const attributeFilter = ref('all')
const search = ref('')
const started = ref(false)
const remaining = ref(data.settings.puzzleSeconds)
const lastSelected = ref(null)
const panel = ref(null)
let deadline = 0
let timer
let finished = false
const result = computed(() => scorePuzzle(slots, selections.value, data.subjects, data.attributes, data.settings.allAttributesBonus))
const choices = computed(() => data.subjects.filter(item => activeSlot.value?.candidates.includes(item.id) &&
  (attributeFilter.value === 'all' || item.attributeId === attributeFilter.value) &&
  `${item.name} ${item.description}`.includes(search.value)))
const days = ['月', '火', '水', '木', '金']
const subject = id => data.subjects.find(item => item.id === id)
const attribute = id => data.attributes.find(item => item.id === id)
const selectedId = slot => slot.fixed ? slot.candidates[0] : selections.value[slot.id]
const available = id => canSelectSubject(slots, selections.value, activeSlot.value?.id, id)
async function openSlot(slot) {
  if (slot.fixed) { lastSelected.value = subject(slot.candidates[0]); return }
  activeSlot.value = slot
  await nextTick()
  panel.value?.focus()
}
function choose(item) {
  if (!activeSlot.value || !available(item.id)) return
  if (Date.now() >= deadline) { finish(); return }
  selections.value[activeSlot.value.id] = item.id
  lastSelected.value = item
}
function clearSlot() {
  if (Date.now() >= deadline) { finish(); return }
  if (activeSlot.value) delete selections.value[activeSlot.value.id]
}
function start() {
  started.value = true
  deadline = Date.now() + data.settings.puzzleSeconds * 1000
  timer = setInterval(() => {
    remaining.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    if (remaining.value === 0) finish()
  }, 100)
}
function finish() {
  if (finished) return
  finished = true
  clearInterval(timer)
  emit('finish', result.value)
}
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <section class="game-panel">
    <h2>単位ゲーム：履修登録</h2>
    <template v-if="!started">
      <p>時間割に科目を配置し、各分野の目標点を目指そう。</p>
      <p>空きコマを押すと科目一覧が開きます。科目を選ぶと、授業の内容とゲームとの関係を読めます。</p>
      <p>同じ科目は1回だけ。固定科目は変更不可。選び直し可能。制限時間{{ data.settings.puzzleSeconds }}秒。</p>
      <p class="note">{{ data.curriculumNote }}</p>
      <button @click="start">履修登録を始める</button>
      <button @click="emit('cancel')">タイトルへ</button>
    </template>
    <template v-else>
      <div class="status-row">
        <strong role="timer">残り {{ remaining }} 秒</strong>
        <span>登録 {{ result.selectedSubjectIds.length }} / {{ slots.length }} 科目</span>
        <button @click="finish">結果を見る</button>
      </div>
      <div class="attribute-list">
        <div v-for="item in data.attributes" :key="item.id" :style="{ borderColor: item.color }">
          {{ item.name }} {{ result.attributeScores[item.id] }} / {{ item.clearScore }}
          {{ result.attributeScores[item.id] >= item.clearScore ? '達成！' : '' }}
        </div>
      </div>
      <div class="course-layout">
        <div class="schedule">
          <div class="timetable">
            <div v-for="day in days" :key="day" class="day-column">
              <h3>{{ day }}</h3>
              <button v-for="slot in slots.filter(item => item.day === day)" :key="slot.id"
                class="slot-button" :class="{ selected: selectedId(slot), active: activeSlot?.id === slot.id }"
                :style="selectedId(slot) ? { borderColor: attribute(subject(selectedId(slot)).attributeId).color } : {}"
                :aria-pressed="activeSlot?.id === slot.id" @click="openSlot(slot)">
                <small>{{ slot.period }}限 {{ slot.fixed ? '固定' : '' }}</small>
                <span>{{ selectedId(slot) ? subject(selectedId(slot)).name : '＋ 科目を選ぶ' }}</span>
                <small v-if="selectedId(slot)">{{ attribute(subject(selectedId(slot)).attributeId).name }} +{{ subject(selectedId(slot)).points }}</small>
              </button>
            </div>
          </div>
          <aside v-if="lastSelected" class="learning-note" aria-live="polite">
            <strong>{{ lastSelected.name }}で学ぶこと</strong>
            <p>{{ lastSelected.description }}</p>
            <p>このゲームとの関係：{{ lastSelected.gameConnection }}</p>
          </aside>
          <p v-else class="note">空きコマを選んでください。色と分野名で属性を表示します。</p>
        </div>
        <aside ref="panel" class="choice-panel" tabindex="-1" aria-label="科目選択">
          <template v-if="activeSlot">
            <div class="panel-heading"><h3>{{ activeSlot.day }}曜 {{ activeSlot.period }}限の科目</h3><button @click="clearSlot">選択を解除</button></div>
            <label>科目を探す <input v-model="search" type="search" placeholder="科目名・学ぶ内容" /></label>
            <div class="filters">
              <button :aria-pressed="attributeFilter === 'all'" @click="attributeFilter = 'all'">すべて</button>
              <button v-for="item in data.attributes" :key="item.id" :aria-pressed="attributeFilter === item.id" @click="attributeFilter = item.id">{{ item.name }}</button>
            </div>
            <div class="choice-list">
              <button v-for="item in choices" :key="item.id" class="subject-card" :disabled="!available(item.id)"
                :style="{ borderLeftColor: attribute(item.attributeId).color }" @click="choose(item)">
                <strong>{{ item.name }}</strong>
                <small>{{ attribute(item.attributeId).name }} +{{ item.points }} ／ {{ !available(item.id) ? '他コマで登録済み' : selections[activeSlot.id] === item.id ? '選択中' : '選択可能' }}</small>
                <span>{{ item.description }}</span>
              </button>
              <p v-if="!choices.length">条件に合う科目がありません。</p>
            </div>
          </template>
          <p v-else>左の時間割で、変更したいコマを選んでください。</p>
        </aside>
      </div>
    </template>
  </section>
</template>

<style scoped>
h2 { margin-top: 0; } h3 { margin: .4rem 0; } p { line-height: 1.6; }
.status-row { display: flex; align-items: center; flex-wrap: wrap; gap: 1rem; }
.attribute-list { display: flex; flex-wrap: wrap; gap: .5rem; margin: .5rem 0 1rem; }
.attribute-list > div { padding: .5rem; border: 2px solid; border-radius: 8px; }
.course-layout { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(300px, 1fr); gap: 1rem; }
.timetable { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .35rem; }
.day-column h3 { text-align: center; }
.slot-button { display: flex; flex-direction: column; gap: .4rem; width: 100%; min-height: 94px; margin: 0 0 .4rem; padding: .5rem; color: #20344a; background: #f2f6fb; border: 2px solid #c5d0dd; text-align: left; overflow-wrap: anywhere; }
.slot-button:hover { background: #e4edfa; } .slot-button.active { outline: 3px solid #20344a; outline-offset: -5px; }
.slot-button.selected { background: #fff; } .slot-button small { font-size: .75rem; }
.choice-panel { padding: .8rem; background: #f2f6fb; border-radius: 12px; }
.panel-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; }
input { box-sizing: border-box; width: 100%; padding: .6rem; font-size: 1rem; margin-top: .4rem; }
.filters { display: flex; flex-wrap: wrap; gap: .3rem; margin: .7rem 0; }
.filters button, .panel-heading button { font-size: .8rem; padding: .45rem; margin: 0; }
.filters button[aria-pressed="true"] { background: #153a72; outline: 2px solid #153a72; outline-offset: 2px; }
.choice-list { display: grid; gap: .5rem; max-height: 48vh; overflow-y: auto; padding: .25rem; }
.subject-card { display: flex; flex-direction: column; gap: .3rem; margin: 0; padding: .7rem; background: white; color: #20344a; text-align: left; border: 1px solid #c5d0dd; border-left: 6px solid; }
.subject-card:hover { background: #e5edfa; } .subject-card:disabled { opacity: .5; cursor: not-allowed; background: #e2e5e9; }
.subject-card span { font-size: .9rem; } .learning-note { margin-top: .8rem; padding: .8rem; background: #fff7dc; border-radius: 8px; }
.learning-note p { margin: .4rem 0; } .note { color: #526074; font-size: .85rem; }
@media (max-width: 900px) { .course-layout { grid-template-columns: 1fr; } .choice-list { max-height: 40vh; } }
</style>
