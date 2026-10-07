<script setup>
import { computed, nextTick, onUnmounted, ref } from 'vue'
import data from '../data/gameData.json'
import { canSelectSubject, makeSlots, scorePuzzle } from '../utils/gameLogic.js'
const emit = defineEmits(['finish', 'cancel'])
const slots = makeSlots(data.subjects, data.slots)
const selections = ref({})
const activeSlot = ref(null)
const started = ref(false)
const remaining = ref(data.settings.puzzleSeconds)
const panel = ref(null)
let deadline = 0
let timer
let finished = false
const result = computed(() => scorePuzzle(slots, selections.value, data.subjects, data.attributes, data.settings.allAttributesBonus))
const choices = computed(() => data.subjects.filter(item => activeSlot.value?.candidates.includes(item.id)))
const days = ['月', '火', '水', '木', '金']
const subject = id => data.subjects.find(item => item.id === id)
const attribute = id => data.attributes.find(item => item.id === id)
const selectedId = slot => slot.fixed ? slot.candidates[0] : selections.value[slot.id]
const available = id => canSelectSubject(slots, selections.value, activeSlot.value?.id, id)
async function openSlot(slot) {
  activeSlot.value = slot
  await nextTick()
  panel.value?.focus()
}
function choose(item) {
  if (!activeSlot.value || !available(item.id)) return
  if (Date.now() >= deadline) { finish(); return }
  selections.value[activeSlot.value.id] = item.id
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
  <section class="game-panel course-game" :class="{ playing: started }">
    <template v-if="!started">
      <h2>単位ゲーム：履修登録</h2>
      <p class="rule-goal"><strong>{{ data.settings.puzzleSeconds }}秒で時間割を作り、3つの分野すべての目標単位を集めよう！</strong></p>
      <ol class="rule-steps"><li><b>時間割のコマを押す。</b>その時間に選べる3科目が右に出ます。</li><li><b>科目を1つ選ぶ。</b>科目の分野に2単位が加わります。</li><li><b>右上の「あと○単位」を見て、足りない分野を増やす。</b>3分野とも達成するとボーナス{{ data.settings.allAttributesBonus }}点！</li></ol>
      <p>同じ科目は1回だけ。先に選ぶと、別の時間では選べなくなります。候補の分野も時間ごとに違います。</p>
      <p>困ったら「選択を解除」で選び直そう。固定科目は最初から登録済みで、変更できません。</p>
      <p>単位の合計＋ボーナスが得点です。時間切れ、または「結果を見る」で終了します。</p>
      <p class="note">{{ data.curriculumNote }}</p>
      <button @click="start">履修登録を始める</button><button @click="emit('cancel')">タイトルへ</button>
    </template>
    <template v-else>
      <header class="game-header">
        <div><h2>履修登録</h2><small>登録 {{ result.selectedSubjectIds.length }} / {{ slots.length }} 科目</small><br><button @click="finish">結果を見る</button></div>
        <div class="clock" role="timer"><small>残り時間</small><strong>{{ remaining }}<small> 秒</small></strong></div>
        <div class="goals" aria-label="クリアまでの単位数">
          <strong>クリアまで</strong>
          <div v-for="item in data.attributes" :key="item.id" :style="{ borderColor: item.color }">
            <span>{{ item.name }}</span><b>{{ Math.max(0, item.clearScore - result.attributeScores[item.id]) === 0 ? '達成！' : 'あと ' + Math.max(0, item.clearScore - result.attributeScores[item.id]) + ' 単位' }}</b>
            <small>{{ result.attributeScores[item.id] }} / {{ item.clearScore }}</small>
          </div>
        </div>
      </header>
      <div class="course-layout">
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
        <aside ref="panel" class="choice-panel" tabindex="-1" aria-label="科目選択">
          <template v-if="activeSlot">
            <div class="panel-heading"><h3>{{ activeSlot.day }}曜 {{ activeSlot.period }}限</h3><button v-if="!activeSlot.fixed" @click="clearSlot">選択を解除</button></div>
            <p class="note">{{ activeSlot.fixed ? '固定科目：変更できません' : 'この時間の3候補から選ぼう' }}</p>
            <div class="choice-list">
              <button v-for="item in choices"
                :key="item.id" class="subject-card"
                :class="{ selected: selections[activeSlot.id] === item.id }"
                :disabled="!available(item.id)"
                :style="{ '--subject-color': attribute(item.attributeId).color }"
                @click="choose(item)"
                >
                  <!-- キラキラ -->
                  <svg class="subject-doodle sparkle" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" >
                    <path d="M12 0C12 6.6 17.4 12 24 12C17.4 12 12 17.4 12 24C12 17.4 6.6 12 0 12C6.6 12 12 6.6 12 0Z" ></path>
                  </svg>
                  <strong class="subject-title"> {{ item.name }} </strong>
                  <small class="subject-info"> 
                    {{ attribute(item.attributeId).name }} ＋
                    {{ item.points }}単位 ／ {{ activeSlot.fixed ? '固定'
                    : selections[activeSlot.id] === item.id ? '選択中'
                    : !available(item.id) ? '他コマで登録済み'
                    : '選択可能' }}
                  </small>
                  <span class="subject-description">
                    {{ item.description }}
                  </span>
              </button>
            </div>
          </template>
          <div v-else class="empty-choice"><h3>まずコマを選ぼう</h3><p>左の時間割を押すと、その時間の科目がここに出ます。</p><p>色と分野名を見て、バランスよく履修しよう。</p></div>
        </aside>
      </div>
    </template>
  </section>
</template>
<style scoped>
.game-panel.course-game { padding: 1rem; box-sizing: border-box; }
.rule-steps { padding-left: 1.5rem; line-height: 1.8; } .rule-steps li { margin: .6rem 0; } .rule-goal { background: #fff7dc; padding: .8rem; border-radius: 10px; }
h2 { margin: 0 0 .4rem; font-size: 1.5rem; } h3 { margin: 0; } p { line-height: 1.6; }
.game-header { display: grid; grid-template-columns: 1fr .8fr 1.2fr; gap: 1rem; align-items: center; margin: 0 0 .7rem; }
.game-header button { padding: .45rem .7rem; margin: .4rem 0 0; }
.clock { text-align: center; } .clock > small { display: block; } .clock strong { display: block; font-size: 2.7rem; font-variant-numeric: tabular-nums; } .clock strong small { font-size: 1rem; }
.goals > strong { font-size: .85rem; } .goals > div { display: flex; gap: .5rem; align-items: center; border-left: 5px solid; padding: .2rem .5rem; font-size: .85rem; } .goals b { margin-left: auto; } .goals small { min-width: 3rem; text-align: right; }
.course-layout { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(300px, 1fr); gap: .8rem; align-items: stretch; }
.timetable { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .4rem; padding: 1rem; box-sizing: border-box; background-image: url('/images/timetable-bg.png'); background-repeat: repeat; background-position: center; border-radius: 16px; }
.day-column { display: grid; grid-template-rows: 26px repeat(4, minmax(82px, 1fr)); gap: .4rem; }
.day-column h3 { text-align: center; font-size: 1rem; }
.slot-button { position: relative; display: flex; flex-direction: column; justify-content: center; gap: .3rem; width: 100%; margin: 0; padding: 1.1rem .45rem .45rem; color: #20344a; background: white; border: 2px solid #d8cf82; text-align: left; overflow-wrap: anywhere; box-shadow: 2px 3px 6px rgba(0, 0, 0, .15); }
.slot-button::before { content: ''; position: absolute; top: .35rem; left: 50%; transform: translateX(-50%); width: 13px; height: 13px; border-radius: 50%; background: #d94b4b; border: 2px solid #b73535; box-shadow: 1px 2px 2px rgba(0, 0, 0, .25), inset 1px 1px 2px rgba(255, 255, 255, .5); }
.slot-button:hover { background: #fff39a !important;}
.slot-button.active { outline: 3px solid #20344a; outline-offset: -5px; }
.slot-button.selected { background: var(--slot-color); }
.slot-button small { font-size: .72rem; }
.slot-button span { font-weight: bold; font-size: .9rem; }
.no-class { grid-row: span 2; text-align: center; align-self: center; font-size: .8rem; color: #000000; }
.choice-panel { padding: .75rem; background: #3CB371; box-sizing: border-box; border-radius: 12px; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: .5rem; } .panel-heading button { font-size: .8rem; padding: .4rem; margin: 0; }
.choice-list { display: grid; gap: 1rem; }
.subject-card { --bg-color: #fdfbf7; --ink-color: #2c2c2c; --paper-line: #e6e0d4; --tape-color: rgba(255, 221, 161, 0.85);
                position: relative; width: 95%; min-height: 120px; box-sizing: border-box; display: flex; flex-direction: column;
                align-items: flex-start; margin: 0; padding: 1rem 1rem .8rem; color: var(--ink-color); text-align: left;
                background: linear-gradient(var(--bg-color) 1.5rem, transparent 1.5rem) 0 0 / 100% 1.6rem, linear-gradient(var(--paper-line) 0.08rem, transparent 0.08rem) 0 1.5rem / 100% 1.6rem var(--bg-color); border: 0.2rem solid var(--ink-color);
                border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px; box-shadow: 0.35rem 0.35rem 0 var(--ink-color), inset 0 0 1.2rem rgba(0, 0, 0, 0.03);
                line-height: 1.5; cursor: pointer; transition: transform 0.25s ease, box-shadow 0.25s ease, border-radius 0.25s ease; }
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
.note { color: #526074; font-size: .8rem; margin: .5rem 0; }
@media (min-width: 1000px) and (min-height: 650px) { .course-game.playing { min-height: calc(100svh - 16px); display: flex; flex-direction: column; } .course-layout { flex: 1; } }
@media (max-width: 999px) { .course-layout { grid-template-columns: 1fr; } .game-header { grid-template-columns: 1fr 1fr; } .goals { grid-column: 1 / -1; } }
</style>
