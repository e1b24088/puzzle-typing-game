<script setup>
defineProps({ label: { type: String, default: '結果を見る' } })
</script>
<template>
  <button type="button" class="pencil-button" :aria-label="label">
    <svg viewBox="0 0 320 44" aria-hidden="true"><path d="M5 22 L35 8 L35 36Z" fill="#d5ae79"/><path d="M5 22 L17 16 L17 28Z" fill="#333"/><path d="M35 8 H265 V36 H35Z" fill="#efb632"/><path d="M35 8 H265 V14 H35Z" fill="#ffdc73"/><path d="M35 31 H265 V36 H35Z" fill="#bd8220"/><rect x="265" y="8" width="17" height="28" fill="#b8b9ad"/><path d="M282 8 H303 Q315 8 315 18 V26 Q315 36 303 36 H282Z" fill="#df8c8a"/></svg><span>{{ label }} →</span>
  </button>
</template>
<style scoped>
.pencil-button { position: relative; width: clamp(175px, 19vw, 270px); display: block; padding: 0; margin: 0; background: transparent; border: 0; box-shadow: none; color: #4b3818; cursor: pointer; filter: drop-shadow(0 3px 2px #24170b40); transition: transform .15s; } .pencil-button:hover { background: transparent; transform: translateY(-2px); } svg { display: block; width: 100%; } span { position: absolute; top: 50%; left: 49%; transform: translate(-50%, -50%); font-size: 14px; font-weight: bold; white-space: nowrap; } .pencil-button:focus-visible { outline: 3px solid #243f55; outline-offset: 3px; border-radius: 6px; }
.pencil-button { min-height: 44px; display: grid; place-items: center; }
@media (prefers-reduced-motion: reduce) { .pencil-button { transition: none; } }
</style>
