<script setup>
import { onMounted, ref } from 'vue'
import TitleView from './views/TitleView.vue'

// 共通の画面遷移だけを用意した開発用の土台。ゲームの採点処理はこれから実装する。
const screen = ref('title')
const mode = ref('sequential')
const backendStatus = ref('確認中')
const selectedSubjects = ref([])

onMounted(async () => {
  try {
    const response = await fetch('/api/health')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    backendStatus.value = data.status === 'ok' ? '接続済み' : '応答を確認してください'
  } catch {
    backendStatus.value = '未接続'
  }
})

function begin(nextMode, firstGame) {
  mode.value = nextMode
  selectedSubjects.value = []
  screen.value = firstGame
}

function finish(game) {
  screen.value = game === 'puzzle' ? 'puzzle-result' : 'typing-result'
}

function advance() {
  screen.value = mode.value === 'sequential' ? 'typing' : 'title'
}
</script>

<template>
  <main class="container">
    <header>
      <h1>単位ゲーム × タイピングゲーム</h1>
      <small>開発用画面 / Java API: {{ backendStatus }}</small>
    </header>

    <TitleView
      v-if="screen === 'title'"
      @start="begin"
    />

    <section v-else-if="screen === 'puzzle'">
      <h2>単位ゲーム</h2>
      <p>月〜金の時間割、固定授業、科目候補と属性別の得点をここに実装します。</p>
      <p>選択科目: {{ selectedSubjects.join('、') || '未選択' }}</p>
      <button @click="finish('puzzle')">仮のリザルトへ</button>
    </section>

    <section v-else-if="screen === 'puzzle-result'">
      <h2>単位ゲームのリザルト</h2>
      <p>各属性の達成度とボーナスをここに表示します。</p>
      <button @click="advance">{{ mode === 'sequential' ? 'タイピングゲームへ' : 'タイトルへ' }}</button>
    </section>

    <section v-else-if="screen === 'typing'">
      <h2>タイピングゲーム</h2>
      <p>文章・ローマ字・日本語読みと文字数スコアをここに実装します。</p>
      <p>{{ mode === 'sequential' ? '単位ゲームで選んだ科目を出題に利用します。' : 'ランダムな内容を出題します。' }}</p>
      <button @click="finish('typing')">仮のリザルトへ</button>
    </section>

    <section v-else>
      <h2>タイピングゲームのリザルト</h2>
      <p>入力文字数に基づくスコアをここに表示します。</p>
      <button @click="screen = 'title'">タイトルへ</button>
    </section>
  </main>
</template>
