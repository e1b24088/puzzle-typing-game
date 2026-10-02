<script setup>
import { ref } from 'vue'
const props = defineProps({ backendStatus: String })
const emit = defineEmits(['back'])
const tab = ref('play'), points = ref(0), message = ref('正解は a。押してみよう！')
const reply = ref('起動時：' + props.backendStatus), checking = ref(false)
function input(key) { if (key === 'a') { points.value++; message.value = '正解と同じ！ 点数を1増やして表示したよ。' } else message.value = '違う文字。点数はそのまま。もう一度！' }
async function check() {
  checking.value = true; reply.value = '裏方に聞いています…'
  try { const response = await fetch('/api/health'); if (!response.ok) throw new Error(); const data = await response.json(); reply.value = data.status === 'ok' ? '裏方から「動いてるよ！」と返事が来ました。' : '返事の状態を確認してください。' }
  catch { reply.value = '返事が届きません。Javaの起動を確認してください。' }
  finally { checking.value = false }
}
const tools = [['HTML','画面の骨組み','見出しやボタンを置く'],['CSS','見た目','色・大きさ・配置を決める'],['JavaScript','ゲームのルール','正解と比べ、点数を計算する'],['Vue','画面の組み立て','点数が変わると表示も変える'],['Java / Spring Boot','裏方の仕事','今回は接続確認に返事をする'],['Docker','開発道具の箱','同じ環境で動くようまとめる']]
</script>
<template>
  <section class="behind-view">
    <header><h2>ゲームの中はどうなってる？</h2><button @click="emit('back')">タイトルへ</button></header>
    <nav aria-label="説明を選ぶ"><button :aria-pressed="tab === 'play'" @click="tab = 'play'">① 点数が増えるしくみ</button><button :aria-pressed="tab === 'server'" @click="tab = 'server'">② 裏方とのやりとり</button><button :aria-pressed="tab === 'tools'" @click="tab = 'tools'">③ 作った道具</button></nav>
    <div v-if="tab === 'play'">
      <h3>押す → 考える → 見せる</h3><p>ブラウザはゲームを表示しているアプリ。このゲームのルールも、その中で動いています。</p>
      <div class="frame"><b>ブラウザの中</b>
        <svg viewBox="0 0 840 175" role="img" aria-labelledby="play-title play-desc"><title id="play-title">入力、判定、画面更新のつながり</title><desc id="play-desc">キーを押すとJavaScriptが正解と比べ、点数を増やし、Vueが表示を更新します。すべてブラウザの中です。</desc>
          <rect x="10" y="25" width="230" height="125" rx="16" fill="#e2efff"/><rect x="305" y="25" width="230" height="125" rx="16" fill="#fff0be"/><rect x="600" y="25" width="230" height="125" rx="16" fill="#dff4e9"/>
          <g text-anchor="middle" fill="#20344a" font-family="sans-serif"><text x="125" y="70" font-size="24">① キーを押す</text><text x="125" y="110" font-size="20">入力「a」</text><text x="270" y="95" font-size="35">→</text><text x="420" y="65" font-size="24">② 正解と比べる</text><text x="420" y="100" font-size="19">同じなら ＋1点</text><text x="420" y="130" font-size="16">JavaScript</text><text x="565" y="95" font-size="35">→</text><text x="715" y="65" font-size="24">③ 画面を変える</text><text x="715" y="100" font-size="19">新しい点数を表示</text><text x="715" y="130" font-size="16">Vue</text></g>
        </svg>
      </div>
      <div class="demo"><strong>体験：正解は a</strong><div><button @click="input('a')">a を押す</button><button @click="input('b')">b を押す</button><b>{{ points }} 点</b></div><p role="status">{{ message }}</p></div>
      <p class="connection">プログラミングで学ぶ「条件分岐」。もし正解なら点数を増やす、というルールです。</p>
    </div>
    <div v-else-if="tab === 'server'">
      <h3>見える画面のほかに、裏方もいる</h3><p>サーバーは、お願いを受けて返事をするプログラム。今回は同じパソコンの中にいます。</p>
      <div class="frame"><b>展示用パソコンの中</b>
        <svg viewBox="0 0 840 200" role="img" aria-labelledby="server-title server-desc"><title id="server-title">画面と裏方の通信</title><desc id="server-desc">ブラウザが動いているか質問を送り、Javaのサーバーが返事をします。今回は接続確認で、点数はブラウザで計算します。</desc>
          <rect x="15" y="20" width="235" height="150" rx="16" fill="#e2efff"/><rect x="590" y="20" width="235" height="150" rx="16" fill="#dff4e9"/>
          <g text-anchor="middle" fill="#20344a" font-family="sans-serif"><text x="132" y="80" font-size="26">見える画面</text><text x="132" y="120" font-size="20">ブラウザ</text><text x="708" y="80" font-size="26">裏方</text><text x="708" y="120" font-size="20">Java サーバー</text><text x="420" y="60" font-size="22">「動いてる？」</text><text x="420" y="90" font-size="28">────────→</text><text x="420" y="128" font-size="22">「動いてるよ！」</text><text x="420" y="160" font-size="28">←────────</text></g>
        </svg>
      </div>
      <button :disabled="checking" @click="check">本当に裏方に聞いてみる</button><p role="status">{{ reply }}</p>
      <p class="connection">今回、点数計算はブラウザの仕事。裏方は接続確認を担当しています。ネットワークの授業では、お願いと返事の仕組みを学びます。</p>
      <details><summary>技術名も知りたい人へ</summary><p>画面 → Viteの中継 → Tomcat・Spring Boot → Javaの処理 → 返事。JavaはJVMで動きます。接続確認の宛先は /api/health です。</p></details>
    </div>
    <div v-else><h3>いろいろな道具を組み合わせた</h3><div class="tool-grid"><article v-for="[name, role, detail] in tools" :key="name"><small>{{ name }}</small><h3>{{ role }}</h3><p>{{ detail }}</p></article></div>
      <p class="connection">画面はお店のカウンター、サーバーは奥の作業場。どちらにどの仕事を任せるかも、開発で考えることです。</p>
      <details><summary>ほかの道具・授業とのつながり</summary><p>JSONに科目や問題を保存。Node.jsとViteが開発中の画面配信とビルドを担当。GitとGitHubで変更履歴を共有します。現在、データベースへの保存はありません。</p><p>プログラミング・Web技術・ネットワーク・ソフトウェア設計などに関係します。正式な授業名は大学のシラバスで確認します。</p></details>
    </div>
  </section>
</template>
<style scoped>
.behind-view { padding: 1.2rem; } header { display: flex; justify-content: space-between; align-items: center; gap: .5rem; margin: 0; } h2 { margin: 0; font-size: clamp(1.3rem, 3vw, 1.8rem); } h3 { margin: .7rem 0 .4rem; } p { line-height: 1.6; margin: .6rem 0; } nav { display: flex; flex-wrap: wrap; gap: .4rem; margin: .8rem 0; } nav button { margin: 0; } nav button[aria-pressed="true"] { background: #153a72; outline: 2px solid #153a72; outline-offset: 2px; }
.frame { border: 2px solid #aabbd0; border-radius: 16px; padding: .7rem; background: #fafcfe; } .frame > b { font-size: .9rem; color: #526074; } svg { display: block; width: 100%; max-width: 840px; margin: auto; }
.demo { padding: .8rem; margin: .7rem 0; border-radius: 12px; background: #fff7dc; } .demo p { margin-bottom: 0; } .connection { background: #f2f6fb; padding: .8rem; border-left: 4px solid #2258a8; border-radius: 6px; }
.tool-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .7rem; } article { background: #f2f6fb; border-radius: 12px; padding: .8rem; } article h3 { margin-top: .3rem; } article p { margin-bottom: 0; } button:disabled { opacity: .5; }
@media (max-width: 650px) { .tool-grid { grid-template-columns: 1fr 1fr; } header button { white-space: nowrap; } }
</style>
