<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
defineProps({ shakeVersion: { type: Number, default: 0 }, turning: Boolean, turnVersion: { type: Number, default: 0 }, remaining: { type: Number, default: null } })
const scene = ref(null)
let previousOverflow
onMounted(() => { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' })
onUnmounted(() => { document.body.style.overflow = previousOverflow })
defineExpose({ focus: () => scene.value?.focus({ preventScroll: true }) })
</script>

<template>
  <section ref="scene" class="notebook-scene" tabindex="0">
    <div class="desk-props">
      <div class="desk-pen" aria-hidden="true"></div><div class="desk-eraser" aria-hidden="true"></div>
      <div class="desk-watch" :class="{ urgent: remaining !== null && remaining <= 10 }">
        <div v-if="remaining !== null" class="watch-face timer-face"><span>残り時間</span><strong role="timer" :aria-label="'残り' + remaining + '秒'">{{ remaining }}</strong><small>秒</small></div>
        <div v-else class="watch-face analog-face" aria-hidden="true"><i></i><b></b></div>
      </div>
    </div>
    <div class="notebook" :class="{ 'shake-a': shakeVersion > 0 && shakeVersion % 2, 'shake-b': shakeVersion > 0 && !(shakeVersion % 2) }">
      <div class="paper paper-left" aria-hidden="true"></div><div class="paper paper-right" aria-hidden="true"></div>
      <div class="fold" aria-hidden="true"></div>
      <div class="stitches" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="notebook-content"><slot /></div>
      <div v-if="turning" :key="turnVersion" class="turn-page" aria-hidden="true"></div>
    </div>
    <div class="desk-action"><slot name="action" /></div>
  </section>
</template>

<style scoped>
.notebook-scene { position: fixed; inset: 0; z-index: 20; box-sizing: border-box; padding: 22px 6vw 54px; display: grid; place-items: center; overflow: hidden; color: #293b42; font-family: 'Yu Gothic', 'Hiragino Kaku Gothic ProN', sans-serif; border: 0; border-radius: 0; margin: 0; box-shadow: none; background: repeating-linear-gradient(1deg, #ffffff05 0 2px, transparent 2px 18px), repeating-linear-gradient(92deg, #50321109 0 1px, transparent 1px 94px), linear-gradient(110deg, #c69963, #dec09a 48%, #bd8e59); }
.notebook { position: relative; box-sizing: border-box; width: min(100%, 1500px); height: 100%; max-height: 920px; container-type: inline-size; perspective: 1800px; border-radius: 9px; background: #527d79; padding: 6px; box-shadow: 0 17px 35px #49311740, 0 3px 0 #e6e1d4, 0 6px 0 #d4cbbb; }
.paper { position: absolute; top: 6px; bottom: 6px; width: calc(50% - 6px); border-radius: 4px; background: repeating-linear-gradient(to bottom, transparent 0 31px, #b2c8d226 31px 32px), #fffdf5; }
.paper-left { left: 6px; } .paper-right { right: 6px; }
.fold { position: absolute; top: 6px; bottom: 6px; width: 20px; left: calc(50% - 10px); background: linear-gradient(90deg, transparent, #7e776b12, transparent); pointer-events: none; }
.notebook-content { position: absolute; inset: 6px; z-index: 1; padding: clamp(16px, 2vw, 32px); box-sizing: border-box; }
.turn-page { position: absolute; top: 6px; bottom: 6px; left: 50%; width: calc(50% - 6px); z-index: 3; pointer-events: none; background: repeating-linear-gradient(to bottom, transparent 0 31px, #b2c8d226 31px 32px), linear-gradient(90deg, #e7e2d3, #fffdf5 12%, #fffdf5 85%, #e2dccd); transform-origin: left; animation: turn .34s ease-in-out both; box-shadow: 8px 0 15px #34200c20; }
@keyframes turn { 0% { transform: rotateY(0); opacity: 0; } 10%,90% { opacity: 1; } 100% { transform: rotateY(-180deg); opacity: 0; } }
.shake-a { animation: shake-a .24s; } .shake-b { animation: shake-b .24s; }
@keyframes shake-a { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-3px) rotate(-.15deg); } 40%,80% { transform: translateX(3px) rotate(.15deg); } }
@keyframes shake-b { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-3px) rotate(-.15deg); } 40%,80% { transform: translateX(3px) rotate(.15deg); } }
.desk-props { position: absolute; inset: 0; pointer-events: none; } .desk-pen { position: absolute; left: 2.3vw; top: 40%; width: 14px; height: 180px; background: linear-gradient(90deg, #102d43, #456882, #102d43); border-radius: 7px 7px 3px 3px; transform: rotate(12deg); box-shadow: 4px 5px 7px #39271040; } .desk-pen::before { content: ''; position: absolute; top: 18px; right: 1px; height: 52px; width: 3px; background: #c0b087; border-radius: 3px; } .desk-pen::after { content: ''; position: absolute; bottom: -18px; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 18px solid #b2b5b4; }
.desk-eraser { position: absolute; left: 1.6vw; bottom: 10%; width: 38px; height: 60px; background: linear-gradient(90deg, #e7e0ce 30%, #d9958f 30%); transform: rotate(-16deg); border-radius: 6px; box-shadow: 3px 5px 8px #39271035; }
.desk-watch { position: absolute; right: 1.2vw; top: 8%; width: 38px; height: 180px; border-radius: 8px; transform: rotate(-12deg); background: linear-gradient(90deg, #4a3528, #795943, #4a3528); } .watch-face { position: absolute; top: 57px; left: -7px; width: 48px; height: 48px; border-radius: 50%; border: 4px solid #aba58c; background: repeating-conic-gradient(#8a7e68 0deg 2deg, transparent 2deg 30deg), #f7f2e5; box-shadow: 3px 5px 8px #39271040; } .watch-face::before { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: #f7f2e5; } .watch-face i, .watch-face b { position: absolute; z-index: 1; width: 2px; height: 18px; background: #45515a; left: 23px; top: 6px; transform-origin: bottom; transform: rotate(30deg); } .watch-face b { height: 13px; top: 11px; transform: rotate(115deg); }
.desk-action { position: absolute; right: 3vw; bottom: 4px; z-index: 5; }
.notebook-scene { padding-right: 13vw; padding-left: 9vw; }
.notebook { max-width: 1280px; border-radius: 5px 11px 8px 4px; background: #66857d; box-shadow: 0 16px 24px #49311730, 0 2px 0 #f5efdf, 0 4px 0 #d8d1bd, 0 6px 0 #f4efdf, 0 8px 0 #d8d1bd; }
.paper { background: repeating-linear-gradient(to bottom, transparent 0 29px, #90b1cd4d 29px 30px), linear-gradient(110deg, #fffef8, #faf6e9); border-radius: 5px 14px 10px 4px; }
.paper-left { box-shadow: inset -15px 0 18px -15px #675a4930; background-image: linear-gradient(90deg, transparent 32px, #d7858538 32px 33px, transparent 33px), repeating-linear-gradient(to bottom, transparent 0 29px, #90b1cd4d 29px 30px), linear-gradient(110deg, #fffef8, #faf6e9); }
.paper-right { box-shadow: inset 15px 0 18px -15px #675a4930; background-image: linear-gradient(90deg, transparent calc(100% - 33px), #d7858538 calc(100% - 33px) calc(100% - 32px), transparent calc(100% - 32px)), repeating-linear-gradient(to bottom, transparent 0 29px, #90b1cd4d 29px 30px), linear-gradient(110deg, #fffef8, #faf6e9); }
.fold { width: 24px; left: calc(50% - 12px); background: linear-gradient(90deg, transparent, #77694f12 40%, #6c5d4620 50%, #fffef5aa 60%, transparent); }
.stitches { position: absolute; top: 10%; bottom: 10%; left: calc(50% - 3px); width: 6px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; } .stitches i { height: 15px; width: 4px; border: 1px solid #81765b65; border-radius: 50%; }
.turn-page { z-index: 0; animation-duration: .1s; background: repeating-linear-gradient(to bottom, transparent 0 29px, #90b1cd4d 29px 30px), linear-gradient(90deg, #e5dcc7, #fffdf4 16%, #fffdf4 85%, #e7dcc6); }
.desk-watch { right: 2vw; top: 50%; width: clamp(65px, 8vw, 112px); height: clamp(210px, 29vh, 300px); transform: translateY(-50%) rotate(3deg); border: 1px solid #604435; box-shadow: 3px 6px 10px #39271035; }
.watch-face { box-sizing: border-box; top: 50%; left: -8px; width: calc(100% + 16px); height: clamp(92px, 10vw, 136px); transform: translateY(-50%); border: 5px solid #b9b7a9; border-radius: 27px; }
.timer-face { background: linear-gradient(130deg, #253b41, #17262c); display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 2px; color: #eef8e6; } .timer-face::before { content: none; } .timer-face > span { font-size: clamp(10px, 1vw, 13px); } .timer-face > strong { font: bold clamp(30px, 3.4vw, 46px) monospace; font-variant-numeric: tabular-nums; line-height: 1.1; } .timer-face > small { font-size: 12px; } .urgent .timer-face { color: #ffe0d9; border-color: #c46c62; } .analog-face { border-radius: 50%; } .analog-face i, .analog-face b { left: calc(50% - 1px); top: calc(50% - 28px); height: 28px; } .analog-face b { top: calc(50% - 20px); height: 20px; }
@media (max-width: 800px) { .notebook-scene { padding: 12px 14px 54px; } .desk-props { display: none; } .notebook-content { padding: 16px; } }
@media (max-width: 800px) { .notebook-scene { padding-top: 92px; } .desk-props { display: block; } .desk-pen, .desk-eraser { display: none; } .desk-watch { top: 10px; right: 24px; height: 70px; width: 110px; transform: none; background: transparent; border: 0; box-shadow: none; } .watch-face { height: 70px; width: 110px; left: 0; border-width: 3px; border-radius: 16px; } .timer-face { flex-direction: row; gap: 6px; } .timer-face > strong { font-size: 28px; } .timer-face > span { font-size: 10px; } }
@media (prefers-reduced-motion: reduce) { .shake-a, .shake-b { animation: none; } .turn-page { display: none; } }
</style>
