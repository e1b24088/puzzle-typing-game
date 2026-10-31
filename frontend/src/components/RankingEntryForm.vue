<script setup>
import { ref } from 'vue'
import { makeSubmission, saveRanking, isValidRankingName } from '../utils/rankingApi.js'
const props = defineProps({
  modelValue: String,
  playId: String,
  mode: String,
  courseScore: Number,
  typingScore: Number,
  canRegister: { type: Boolean, default: true }
})
const emit = defineEmits(['update:modelValue', 'open', 'registered'])
const saving = ref(false)
const error = ref('')
// 登録処理
async function registerRecords(modes) {
  const name = props.modelValue ?? ''
  for (const mode of modes) {
    const payload = makeSubmission(
      props.playId,
      mode,
      name,
      mode === 'typing' ? null : props.courseScore,
      mode === 'course' ? null : props.typingScore
    )
    const record = await saveRanking(payload)
    emit('registered', record)
    emit('update:modelValue', record.name)
  }
}
// 登録ボタン
async function submit() {
  if (saving.value || !props.canRegister) return
  error.value = ''
  saving.value = true
  try {
    const modes = props.mode === 'sequential'
      ? ['course', 'typing', 'sequential']
      : [props.mode]
    await registerRecords(modes)
    emit('open', props.mode)
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}
// ランキングを見るボタン
async function openRanking() {
  if (saving.value) return
  // 名前が登録条件を満たさない場合は登録せずランキングを開く
  if (!props.playId || !isValidRankingName(props.modelValue)) {
    emit('open', props.mode)
    return
  }
  error.value = ''
  saving.value = true
  try {
    // 通しプレイの途中なら履修登録だけを保存
    // 最後まで終了していれば3種類を保存
    const modes = props.mode === 'sequential'
      ? (props.typingScore == null
        ? ['course']
        : ['course', 'typing', 'sequential'])
      : [props.mode]
    await registerRecords(modes)
    emit('open', props.mode)
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <form class="ranking-entry" @submit.prevent="submit">
    <label>
      <span class="name-label">
        ランキングに載せる名前
        <small v-if="!canRegister">
          ※通しプレイの総合ランキング登録は、タイピング終了後に行います。
        </small>
      </span>
      <input :value="modelValue" :disabled="saving" @input="emit('update:modelValue', $event.target.value)"
        placeholder="ニックネーム 12文字まで" autocomplete="off" aria-label="ランキングに載せる名前" />
    </label>
    <div class="entry-actions">
      <button v-if="canRegister" type="submit" :disabled="saving">
        {{ saving ? '登録中…' : '登録して成績発表へ' }}
      </button>
      <button type="button" :disabled="saving" @click="openRanking">
        {{ saving ? '登録中…' : 'ランキングを見る' }}
      </button>
    </div>
    <p v-if="error" class="entry-error" role="alert">{{ error }}</p>
  </form>
</template>
<style scoped>
.ranking-entry {
  flex: 0 1 330px;
  min-width: 240px;
  margin-left: auto;
  text-align: left;
  font-size: 13px;
  color: #294b40;
  background: #fffdf3;
  border: 1px solid #b5bba9;
  border-radius: 8px;
  padding: 10px;
  box-sizing: border-box;
}

label {
  display: grid;
  gap: 4px;
  font-weight: bold;
}

input {
  box-sizing: border-box;
  width: 100%;
  padding: 7px 9px;
  border: 1px solid #849b8d;
  border-radius: 5px;
  font: inherit;
  background: white;
  color: #243b33;
}

.entry-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
}

.name-label {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.name-label small {
  font-size: 0.75rem;
  font-weight: normal;
  color: #666;
}

button {
  margin: 0;
  padding: 7px 9px;
  font: inherit;
  background: #315b4a;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:disabled {
  opacity: .5;
  cursor: wait;
}

small {
  display: block;
  margin-top: 5px;
  line-height: 1.4;
}

.entry-error {
  margin: 6px 0 0;
  color: #ae243b;
}

@media (max-width: 700px) {
  .ranking-entry {
    width: 100%;
    flex-basis: auto;
    min-width: 0;
  }
}
</style>
