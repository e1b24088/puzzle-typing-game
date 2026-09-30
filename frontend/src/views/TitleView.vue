<script setup>
const emit = defineEmits(['start'])
</script>

<template>
  <section class="title-view">
    <h2>タイトル</h2>
    <p>大学生活をゲームで体験しよう！</p>
    <p>通しプレイの体験時間：約3分</p>

    <button @click="emit('start', 'sequential', 'puzzle')">
      通しプレイ
    </button>
    <button @click="emit('start', 'select', 'puzzle')">
      単位ゲームのみ
    </button>
    <button @click="emit('start', 'select', 'typing')">
      タイピングのみ
    </button>
  </section>
</template>

<style scoped>
/* タイトル専用の装飾をここに追加する */
</style>