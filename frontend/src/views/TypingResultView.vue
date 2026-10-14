<script setup>
import { computed, ref } from 'vue'
import NotebookScene from '../components/NotebookScene.vue'
import data from '../data/gameData.json'
const props = defineProps({ result: { type: Object, required: true }, courseScore: { type: Number, default: null }, mode: String, learningTip: Object })
const emit = defineEmits(['back', 'behind'])
const page = ref(0)
const tab = ref('summary')
const reviews = computed(() => [...new Map((props.result.history ?? []).map(item => [item.id, { ...item, subject: data.subjects.find(s => s.id === item.subjectId) }])).values()])
const pages = computed(() => Math.max(1, Math.ceil(reviews.value.length / 2)))
const visible = computed(() => reviews.value.slice(page.value * 2, page.value * 2 + 2))
</script>
<template>
  <NotebookScene aria-label="タイピングの学習記録">
    <div class="record">
      <header><div><small>CAMPUS NOTE / 学習記録</small><h2>授業チャレンジの結果</h2></div><button @click="emit('back')">タイトルへ</button></header>
      <nav class="record-tabs" aria-label="結果の表示を選ぶ"><button :aria-pressed="tab === 'summary'" @click="tab = 'summary'">成績を見る</button><button :aria-pressed="tab === 'review'" @click="tab = 'review'">言葉の復習（{{ reviews.length }}種類）</button></nav>
      <template v-if="tab === 'summary'">
      <div class="summary"><div><small>スコア</small><strong>{{ result.score }}<span>点</span></strong></div><div><small>正確率</small><strong>{{ result.accuracy }}<span>%</span></strong></div><div><small>完了した問題</small><strong>{{ result.completed }}<span>問</span></strong></div><div><small>入力の速さ</small><strong>{{ result.cpm }}<span>文字/分</span></strong></div></div>
      <p class="extras">ミス {{ result.mistakes }}回 <span v-if="result.sentencesUnlocked">／ 文章チャレンジ解放！</span><span v-if="mode === 'sequential' && courseScore !== null">／ 総合 {{ courseScore + result.score }}点</span></p>
      <aside v-if="learningTip" class="tip"><b>ひとこと学習：{{ learningTip.subjectName }}</b><p>{{ learningTip.text }}</p></aside>
      <p class="summary-hint">「言葉の復習」を押すと、入力した用語の意味とゲームとの関係を読めます。</p>
      </template>
      <template v-else>
      <div class="review-heading"><h3>入力した言葉を振り返ろう</h3><div class="pager"><button :disabled="page === 0" aria-label="前の解説ページ" @click="page--">←</button><span>{{ page + 1 }} / {{ pages }}</span><button :disabled="page + 1 >= pages" aria-label="次の解説ページ" @click="page++">→</button></div></div>
      <div class="reviews"><article v-for="item in visible" :key="item.id"><small>{{ item.subject?.name }}</small><h3>{{ item.text }}</h3><p>{{ item.explanation }}</p><p class="connection"><b>このゲームでは</b><br>{{ item.subject?.gameConnection }}</p></article><p v-if="!reviews.length">まだ完了した問題はありません。もう一度挑戦して、最初の言葉を入力してみよう！</p></div>
      </template>
      <footer><span>解説は自分のペースで、ページを変えて読めます。</span><button class="sub-button" @click="emit('behind')">ゲームの裏側を見る</button></footer>
    </div>
  </NotebookScene>
</template>
<style scoped>
.record-tabs { display: flex; gap: 8px; } .record-tabs button { background: #edf4ea; color: #446e67; border: 1px solid #9eb4ad; } .record-tabs button[aria-pressed="true"] { background: #446e67; color: white; } .summary-hint { font-size: 15px; line-height: 1.7; text-align: center; } footer { margin-top: auto; }
.record { height: 100%; display: flex; flex-direction: column; gap: 12px; min-height: 0; } header { display: flex; justify-content: space-between; align-items: center; margin: 0; gap: 12px; } h2 { font-size: clamp(22px, 2.3cqw, 32px); margin: 6px 0 0; } small { color: #5b7970; font-size: 13px; } button { margin: 0; padding: 9px 15px; font-size: 14px; background: #446e67; border-radius: 7px; } button:hover { background: #31594f; } button:disabled { opacity: .35; cursor: not-allowed; } .summary { display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; padding: 14px; border: 1px solid #abc1b440; background: #eef5eade; border-radius: 12px; } .summary small { display: block; } .summary strong { display: block; font-size: clamp(24px, 3cqw, 38px); margin-top: 3px; } .summary strong span { font-size: 13px; margin-left: 4px; } .extras { margin: 0; font-size: 14px; text-align: center; color: #597066; }
.tip { padding: 10px 14px; border-left: 4px solid #c8a55e; background: #fbf2dbe0; border-radius: 6px; font-size: 14px; } .tip p { margin: 5px 0 0; line-height: 1.5; } .review-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; } .review-heading h3 { margin: 0; font-size: 17px; } .pager { display: flex; align-items: center; gap: 12px; font-size: 14px; } .pager button { padding: 5px 12px; } .reviews { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; } article { background: #ffffffce; border: 1px solid #a7bdb750; border-radius: 10px; padding: 14px; } article h3 { font-size: 20px; margin: 6px 0; } article p { font-size: 15px; line-height: 1.6; margin: 8px 0; overflow-wrap: anywhere; } .connection { border-left: 3px solid #719891; padding-left: 10px; } footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; color: #657a71; font-size: 13px; } .sub-button { color: #446e67; background: #fffdf5; border: 1px solid #9eb4ad; } .sub-button:hover { background: #edf4ea; }
@media (max-height: 700px) { .record { gap: 8px; } .summary { padding: 8px; } article { padding: 10px; } article p { font-size: 14px; line-height: 1.45; } .tip { font-size: 13px; } }
@media (max-width: 700px) { .summary { padding: 6px; } .summary strong { font-size: 24px; } .reviews { gap: 6px; } article { padding: 8px; } article p { font-size: 13px; } article h3 { font-size: 17px; } footer > span { display: none; } }
</style>
