<script setup>
defineProps({ backendStatus: String })
const emit = defineEmits(['back'])
const technologies = [
  ['HTML・CSS', '画面の構造、色、配置、ボタンの装飾を作る。'],
  ['JavaScript・Vue', 'ブラウザで入力を判定し、得点を計算して画面に反映する。'],
  ['JSON', '科目・問題・解説をまとめたデータ形式。現在はファイルから読み込む。'],
  ['Vite・Node.js', '開発中のフロントの配信とビルドを行う。ゲームを操作するのはブラウザ。'],
  ['Java 21・Spring Boot', '現在は接続確認APIを提供する。ゲーム本体の採点はJavaではない。'],
  ['Tomcat・JVM', 'TomcatがHTTPリクエストを受け、Javaの処理はJVM上で実行される。'],
  ['Docker Compose', 'フロントとJavaバックエンドのコンテナをまとめて起動する。'],
  ['Git・GitHub', '変更履歴を保存し、ブランチとPRで変更を共有する。']
]
</script>
<template>
  <section class="behind-view">
    <h2>このゲームの裏側</h2>
    <p>画面を作るだけでなく、データ・判定・通信・開発環境を組み合わせています。</p>
    <div class="tech-grid"><article v-for="[name, detail] in technologies" :key="name"><h3>{{ name }}</h3><p>{{ detail }}</p></article></div>
    <h3>入力してから得点が変わるまで</h3>
    <ol><li>ブラウザがキー入力を受け取る。</li><li>JavaScriptで問題の次の文字と比較する。</li><li>正解なら得点と入力位置を更新する。</li><li>Vueが変化を反映して画面を書き換える。</li></ol>
    <h3>Java APIの接続確認</h3>
    <p>ブラウザが /api/health を要求 → ViteがJava側へ転送 → Tomcat・Spring Bootが処理 → JSONの応答をブラウザに返す。</p>
    <p>起動時のAPI確認結果：{{ backendStatus }}</p>
    <p>現在、採点・問題の絞り込み・入力判定はブラウザ内です。DB・ランキング保存は実装していません。</p>
    <h3>どの授業につながる？</h3>
    <p>プログラミング、Web技術、ネットワーク、ソフトウェア設計、データベースなどの学びに関係します。正式な授業名との対応はシラバスで確認します。</p>
    <button @click="emit('back')">タイトルへ</button>
  </section>
</template>
<style scoped>
h2 { margin-top: 0; } p, li { line-height: 1.7; }
.tech-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: .75rem; }
article { background: #f2f6fb; padding: .8rem; border-radius: 10px; }
article h3 { margin: 0; } article p { margin-bottom: 0; }
</style>
