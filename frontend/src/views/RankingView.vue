<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { fetchRanking, rankingModes } from '../utils/rankingApi.js'
const props = defineProps({ initialMode: { type: String, default: 'course' }, ownEntries: { type: Object, default: () => ({}) } })
const emit = defineEmits(['back', 'tab'])
const active = ref(props.initialMode)
const board = ref({ top: [], self: null, total: 0 })
const error = ref('')
const loading = ref(false)
let controller
let interval
let sequence = 0
const outside = computed(() => board.value.self && board.value.self.position > 10)
const ownId = computed(() => props.ownEntries[active.value])
async function refresh() {
  const version = ++sequence
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  try {
    const result = await fetchRanking(active.value, ownId.value, controller.signal)
    if (version !== sequence) return
    board.value = result
    error.value = ''
  } catch (e) { if (e.name !== 'AbortError' && version === sequence) error.value = e.message }
  finally { if (version === sequence) loading.value = false }
}
watch(active, () => { board.value = { top: [], self: null, total: 0 }; emit('tab', active.value); refresh() }, { immediate: true })
interval = setInterval(refresh, 5000)
onUnmounted(() => { sequence++; clearInterval(interval); controller?.abort() })
</script>
<template>
  <section class="grade-board" aria-label="ランキング 成績発表">
    <div class="grade-paper">
      <header><div><p class="eyebrow">CAMPUS RESULTS</p><h2>成績発表</h2></div><button @click="emit('back')">← 戻る</button></header>
      <div class="ranking-tabs" role="group" aria-label="ランキングの種類">
        <button v-for="item in rankingModes" :key="item.id" :aria-pressed="active === item.id" @click="active = item.id">{{ item.label }}</button>
      </div>
      <div class="board-caption"><span>上位10件 ／ {{ board.total }}件の記録</span><button :disabled="loading" @click="refresh">{{ loading ? '更新中…' : '最新に更新' }}</button></div>
      <p v-if="error" class="ranking-error" role="alert">{{ error }}</p>
      <table><thead><tr><th scope="col">順位</th><th scope="col">名前</th><th scope="col">スコア</th></tr></thead>
        <tbody>
          <tr v-for="row in board.top" :key="row.id" :class="{ 'your-row': row.id === ownId }" :aria-current="row.id === ownId ? 'true' : undefined">
            <td><svg v-if="row.rank <= 3" viewBox="0 0 32 26" class="crown" :class="`medal-${row.rank}`" aria-hidden="true"><path d="M3 6 10 12 16 2 22 12 29 6 26 22H6Z"/><path d="M6 25H26"/></svg>{{ row.rank }}<small>位</small></td>
            <td>{{ row.name }}<span v-if="row.id === ownId" class="your-label">今回のあなた</span></td><td>{{ row.score }}<small>点</small></td>
          </tr>
          <tr v-if="!board.top.length && !loading && !error"><td colspan="3" class="empty">まだ記録がありません。最初の挑戦者になろう！</td></tr>
        </tbody>
        <tbody v-if="outside" class="outside-self"><tr class="your-row" aria-current="true"><td><svg v-if="board.self.rank <= 3" viewBox="0 0 32 26" class="crown" :class="`medal-${board.self.rank}`" aria-hidden="true"><path d="M3 6 10 12 16 2 22 12 29 6 26 22H6Z"/><path d="M6 25H26"/></svg>{{ board.self.rank }}<small>位</small></td><td>{{ board.self.name }}<span class="your-label">今回のあなた</span></td><td>{{ board.self.score }}<small>点</small></td></tr></tbody>
      </table>
      <p class="board-note">同点は同順位。同点の中では登録が早い順です。5秒ごとに更新します。</p>
    </div>
  </section>
</template>
<style scoped>
.grade-board { position: fixed; inset: 0; z-index: 100; overflow: auto; padding: 24px; box-sizing: border-box; background: #d9d3bd; color: #233c32; font-family: 'Yu Gothic',sans-serif; }
.grade-paper { max-width: 950px; margin: auto; padding: 20px 28px; background: #fffef5; border: 1px solid #bcb59e; box-shadow: 0 10px 35px #493c2b30; }
header { display: flex; align-items: center; justify-content: space-between; gap: 16px; } .eyebrow { margin: 0; font-size: 12px; letter-spacing: .2em; color: #75826b; } h2 { margin: 4px 0 12px; font-size: 32px; letter-spacing: .2em; }
button { padding: 9px 14px; margin: 0; border: 1px solid #708c7d; border-radius: 6px; background: #f5f5eb; color: #294b3e; cursor: pointer; font: inherit; } button:disabled { opacity: .5; }
.ranking-tabs { display: flex; gap: 8px; border-bottom: 2px solid #365b49; } .ranking-tabs button { flex: 1; border-radius: 7px 7px 0 0; border-bottom: none; } .ranking-tabs button[aria-pressed="true"] { background: #365b49; color: white; font-weight: bold; }
.board-caption { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 12px 0; font-size: 13px; }
table { width: 100%; border-collapse: separate; border-spacing: 0 5px; table-layout: fixed; line-height: 1.25; font-variant-numeric: tabular-nums; } th { padding: 6px 12px; color: #677568; text-align: left; font-size: 13px; } th:first-child { width: 21%; } th:last-child { width: 21%; text-align: right; } td { padding: 4px 12px; border-top: 1px solid #dbdfd2; border-bottom: 1px solid #dbdfd2; background: #f4f6ec; overflow-wrap: anywhere; } td:first-child { border-left: 1px solid #dbdfd2; border-radius: 5px 0 0 5px; white-space: nowrap; font-weight: bold; } td:last-child { border-right: 1px solid #dbdfd2; border-radius: 0 5px 5px 0; text-align: right; font-weight: bold; }
.your-row td { border-top: 2px solid #127d96; border-bottom: 2px solid #127d96; background: #e4f4f5; } .your-row td:first-child { border-left: 2px solid #127d96; } .your-row td:last-child { border-right: 2px solid #127d96; } .your-label { display: inline-block; margin-left: 8px; font-size: 11px; color: #087088; font-weight: bold; } small { margin-left: 3px; font-size: 12px; } .crown { width: 25px; height: 20px; vertical-align: middle; margin-right: 6px; fill: #d5b04c; stroke: #aa8020; stroke-width: 1.5; } .medal-2 { fill: #c8ced1; stroke: #7b858d; } .medal-3 { fill: #c88b58; stroke: #94613b; }
.outside-self::before { content: ''; display: table-row; height: 12px; } .board-note { font-size: 12px; color: #637267; } .ranking-error { color: #ab2d40; } .empty { text-align: center; padding: 28px 10px; }
@media (max-width:600px) { .grade-board { padding: 10px; } .grade-paper { padding: 16px 10px; } h2 { font-size: 26px; } .ranking-tabs button { font-size: 12px; padding: 9px 4px; } td,th { padding: 8px 6px; } .crown { width: 18px; margin-right: 2px; } .your-label { display: block; margin-left: 0; } }
</style>
