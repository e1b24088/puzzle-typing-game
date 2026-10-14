<script setup>
defineProps({ label: { type: String, default: '結果を見る' } })
</script>
<template>
  <button type="button" class="pencil-button" :aria-label="label">
    <svg viewBox="0 0 300 64" aria-hidden="true"><path d="M6 32 L45 7 L45 57Z" fill="#d5ae79"/><path d="M6 32 L20 23 L20 41Z" fill="#333"/><path d="M45 7 H249 V57 H45Z" fill="#efb632"/><path d="M45 10 H249 V19 H45Z" fill="#ffdc73"/><path d="M45 47 H249 V57 H45Z" fill="#bd8220"/><rect x="249" y="7" width="19" height="50" fill="#b8b9ad"/><path d="M268 7 H284 Q295 7 295 18 V46 Q295 57 284 57 H268Z" fill="#df8c8a"/></svg><span>{{ label }}</span>
  </button>
</template>
<style scoped>
.pencil-button { position: relative; width: clamp(175px, 19vw, 270px); display: block; padding: 0; margin: 0; background: transparent; border: 0; box-shadow: none; color: #4b3818; cursor: pointer; filter: drop-shadow(0 3px 2px #24170b40); transition: transform .15s; } .pencil-button:hover { background: transparent; transform: translateY(-2px); } svg { display: block; width: 100%; } span { position: absolute; top: 50%; left: 49%; transform: translate(-50%, -50%); font-size: 14px; font-weight: bold; white-space: nowrap; } .pencil-button:focus-visible { outline: 3px solid #243f55; outline-offset: 3px; border-radius: 6px; }
@media (prefers-reduced-motion: reduce) { .pencil-button { transition: none; } }
</style>
