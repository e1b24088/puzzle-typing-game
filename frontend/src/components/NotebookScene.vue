<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { watchHandAngle, watchTickIsFinal } from '../utils/gameClock.js'
const props = defineProps({ shakeVersion: { type: Number, default: 0 }, turning: Boolean, turnVersion: { type: Number, default: 0 }, remaining: { type: Number, default: null }, totalSeconds: { type: Number, default: 60 }, paused: Boolean })
const handAngle = computed(() => watchHandAngle(props.remaining ?? props.totalSeconds, props.totalSeconds))
const redArc = computed(() => {
  const span = Math.min(15 / props.totalSeconds, 1) * Math.PI * 2
  const start = Math.PI * 2 - span
  return `M ${60 + 45 * Math.sin(start)} ${60 - 45 * Math.cos(start)} A 45 45 0 ${span > Math.PI ? 1 : 0} 1 60 15`
})
const scene = ref(null)
let previousOverflow
onMounted(() => { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' })
onUnmounted(() => { document.body.style.overflow = previousOverflow })
defineExpose({ focus: () => scene.value?.focus({ preventScroll: true }) })
</script>

<template>
  <section ref="scene" class="notebook-scene" tabindex="0">
    <svg class="wood-texture" width="100%" height="100%" aria-hidden="true"><defs><pattern id="notebook-woodgrain" width="600" height="240" patternUnits="userSpaceOnUse"><g fill="none" stroke="#74431f"><path v-for="line in 12" :key="line" :d="'M -20 ' + line * 20 + ' C 110 ' + (line * 20 - 18) + ', 170 ' + (line * 20 + 20) + ', 300 ' + line * 20 + ' S 490 ' + (line * 20 - 20) + ', 620 ' + line * 20" :stroke-width="line % 3 === 0 ? 1.4 : .6" opacity=".23"/><ellipse cx="410" cy="110" rx="74" ry="18" opacity=".16"/><ellipse cx="410" cy="110" rx="46" ry="10" opacity=".13"/></g></pattern></defs><rect width="100%" height="100%" fill="url(#notebook-woodgrain)"/></svg>
    <div class="desk-props">
      <div class="desk-pen" aria-hidden="true"></div><div class="desk-eraser" aria-hidden="true"></div>
      <div class="desk-watch" :class="{ urgent: remaining !== null && remaining <= 15, critical: remaining !== null && remaining <= 5, paused }">
        <div class="watch-case">
          <svg viewBox="0 0 120 120" class="watch-dial" role="img" :aria-label="remaining === null ? 'アナログ腕時計' : '残り' + remaining + '秒のアナログ腕時計'">
            <circle cx="60" cy="60" r="54" fill="#fffaf0" stroke="#a4a697" stroke-width="2" />
            <path :d="redArc" fill="none" stroke="#edb1ab" stroke-width="13" opacity=".45" />
            <line v-for="tick in 60" :key="tick" x1="60" y1="9" x2="60" :y2="tick % 5 === 0 ? 20 : 15" :transform="'rotate(' + tick * 6 + ' 60 60)'" :stroke="watchTickIsFinal(tick, totalSeconds) ? '#bf3945' : '#53605e'" :stroke-width="tick % 5 === 0 ? 2 : 1" />
            <g class="dial-labels" text-anchor="middle"><text x="60" y="31">{{ totalSeconds }}</text><text x="91" y="65">{{ totalSeconds / 4 }}</text><text x="60" y="97">{{ totalSeconds / 2 }}</text><text x="29" y="65">{{ totalSeconds * 3 / 4 }}</text></g>
            <text x="60" y="46" class="dial-caption" text-anchor="middle">{{ paused ? 'PAUSED' : 'ELAPSED' }}</text>
            <g :transform="'rotate(' + handAngle + ' 60 60)'" class="countdown-hand"><line x1="60" y1="70" x2="60" y2="22" stroke="#b93744" stroke-width="2.5" stroke-linecap="round" /></g>
            <circle cx="60" cy="60" r="4" fill="#586763" />
          </svg>
          <span v-if="remaining !== null" class="watch-time" role="timer">残り {{ remaining }} 秒</span>
        </div>
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
.notebook-scene { position: fixed; inset: 0; z-index: 20; box-sizing: border-box; padding: 22px 13vw 58px 9vw; display: grid; grid-template-rows: minmax(0, 1fr); place-items: center; overflow: hidden; color: #293b42; font-family: 'Yu Gothic', 'Hiragino Kaku Gothic ProN', sans-serif; border: 0; border-radius: 0; margin: 0; box-shadow: none; background: repeating-linear-gradient(1deg, #ffffff05 0 2px, transparent 2px 18px), repeating-linear-gradient(92deg, #50321109 0 1px, transparent 1px 94px), linear-gradient(110deg, #c69963, #dec09a 48%, #bd8e59); outline: none; }
.notebook { position: relative; box-sizing: border-box; width: min(100%, 1280px); height: 100%; min-height: 0; max-height: 920px; container-type: inline-size; perspective: 1800px; border-radius: 5px 11px 8px 4px; background: #66857d; padding: 6px; box-shadow: 0 16px 24px #49311730, 0 2px 0 #f5efdf, 0 4px 0 #d8d1bd, 0 6px 0 #f4efdf, 0 8px 0 #d8d1bd; }
.paper { position: absolute; top: 6px; bottom: 6px; width: calc(50% - 6px); border-radius: 5px 14px 10px 4px; background: repeating-linear-gradient(to bottom, transparent 0 29px, #90b1cd4d 29px 30px), linear-gradient(110deg, #fffef8, #faf6e9); }
.paper-left { left: 6px; box-shadow: inset -15px 0 18px -15px #675a4930; background-image: linear-gradient(90deg, transparent 32px, #d7858538 32px 33px, transparent 33px), repeating-linear-gradient(to bottom, transparent 0 29px, #90b1cd4d 29px 30px), linear-gradient(110deg, #fffef8, #faf6e9); }
.paper-right { right: 6px; box-shadow: inset 15px 0 18px -15px #675a4930; background-image: linear-gradient(90deg, transparent calc(100% - 33px), #d7858538 calc(100% - 33px) calc(100% - 32px), transparent calc(100% - 32px)), repeating-linear-gradient(to bottom, transparent 0 29px, #90b1cd4d 29px 30px), linear-gradient(110deg, #fffef8, #faf6e9); }
.fold { position: absolute; top: 6px; bottom: 6px; width: 24px; left: calc(50% - 12px); background: linear-gradient(90deg, transparent, #77694f12 40%, #6c5d4620 50%, #fffef5aa 60%, transparent); pointer-events: none; }
.stitches { position: absolute; top: 10%; bottom: 10%; left: calc(50% - 3px); width: 6px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; } .stitches i { height: 15px; width: 4px; border: 1px solid #81765b65; border-radius: 50%; }
.notebook-content { position: absolute; inset: 6px; z-index: 1; padding: clamp(16px, 2vw, 32px); box-sizing: border-box; }
.turn-page { position: absolute; top: 6px; bottom: 6px; left: 50%; width: calc(50% - 6px); z-index: 0; pointer-events: none; background: repeating-linear-gradient(to bottom, transparent 0 29px, #90b1cd4d 29px 30px), linear-gradient(90deg, #e5dcc7, #fffdf4 16%, #fffdf4 85%, #e7dcc6); transform-origin: left; animation: turn .24s ease-in-out both; box-shadow: 8px 0 15px #34200c20; }
@keyframes turn { 0% { transform: rotateY(0); opacity: 0; } 10%,90% { opacity: 1; } 100% { transform: rotateY(-180deg); opacity: 0; } }
.shake-a { animation: shake-a .24s; } .shake-b { animation: shake-b .24s; }
@keyframes shake-a { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-3px) rotate(-.15deg); } 40%,80% { transform: translateX(3px) rotate(.15deg); } }
@keyframes shake-b { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-3px) rotate(-.15deg); } 40%,80% { transform: translateX(3px) rotate(.15deg); } }
.desk-props { position: absolute; inset: 0; pointer-events: none; }
.desk-pen { position: absolute; left: 3vw; top: 40%; width: 14px; height: 180px; background: linear-gradient(90deg, #102d43, #456882, #102d43); border-radius: 7px 7px 3px 3px; transform: rotate(12deg); box-shadow: 4px 5px 7px #39271040; } .desk-pen::before { content: ''; position: absolute; top: 18px; right: 1px; height: 52px; width: 3px; background: #c0b087; border-radius: 3px; } .desk-pen::after { content: ''; position: absolute; bottom: -18px; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 18px solid #b2b5b4; }
.desk-eraser { position: absolute; left: 2.6vw; bottom: 10%; width: 38px; height: 60px; background: linear-gradient(90deg, #e7e0ce 30%, #d9958f 30%); transform: rotate(-16deg); border-radius: 6px; box-shadow: 3px 5px 8px #39271035; }
.desk-watch { position: absolute; right: 2.3vw; top: 22px; width: clamp(70px, 8vw, 112px); height: clamp(190px, 27vh, 250px); border-radius: 12px; transform: rotate(3deg); background: repeating-linear-gradient(to bottom, transparent 0 22px, #b8957140 22px 23px), linear-gradient(90deg, #49372c, #795b47, #49372c); border: 1px solid #604435; box-shadow: 3px 6px 10px #39271035; }
.watch-case { position: absolute; top: 50%; left: -12px; width: calc(100% + 24px); transform: translateY(-50%); border: 5px solid #b8b8a8; border-radius: 50%; background: #fffaf0; box-shadow: 0 0 0 2px #66726a, 3px 5px 8px #39271040; }
.watch-dial { display: block; width: 100%; aspect-ratio: 1; }
.dial-labels { font: bold 11px sans-serif; fill: #3b514c; } .dial-caption { font: 6px sans-serif; fill: #6b7c71; letter-spacing: .1em; }
.countdown-hand { transition: transform .1s linear; }
.watch-time { position: absolute; left: -6px; right: -6px; bottom: -29px; text-align: center; border-radius: 6px; padding: 4px 1px; background: #fdf7e8f2; color: #3f554d; font-size: clamp(11px, 1.05vw, 14px); font-weight: bold; font-variant-numeric: tabular-nums; box-shadow: 0 2px 4px #39271022; }
.urgent .watch-case { animation: watch-pulse 1.6s ease-in-out infinite; border-color: #c98980; } .urgent .watch-time { color: #a72f3a; background: #fff1e9; } .critical .watch-case { border-color: #ad4955; }
@keyframes watch-pulse { 0%,100% { box-shadow: 0 0 0 2px #b4545960, 3px 5px 8px #39271040; } 50% { box-shadow: 0 0 0 7px #b4545925, 3px 5px 8px #39271040; } }
.paused .watch-case { animation: none; } .paused .watch-time { color: #756019; background: #f7eac1; }
.desk-action { position: absolute; right: 3vw; bottom: 4px; z-index: 5; }
.notebook-scene { padding: 36px 15vw 68px 11vw; background: repeating-linear-gradient(0deg, #75431e24 0 1px, transparent 1px 170px), repeating-linear-gradient(1deg, #fff3 0 1px, transparent 1px 11px), linear-gradient(105deg, #bb8752, #d7af7d 36%, #c1905c 68%, #d5aa74); }
.wood-texture { position: absolute; inset: 0; pointer-events: none; }
.notebook { max-width: 1180px; max-height: 800px; background: transparent; padding: 0; border-radius: 6px 12px 14px 5px; box-shadow: 0 12px 22px #49311730, 1px 2px 0 #f5efdf, 2px 4px 0 #cfc4ab, 3px 6px 0 #f8f1df; }
.notebook::before { content: ''; position: absolute; inset: 4px -3px -9px 0; background: #b8aa8c; border-radius: 5px 12px 14px 5px; z-index: -1; }
.paper { top: 0; bottom: 3px; width: 50%; border-radius: 5px 10px 12px 4px; background: repeating-linear-gradient(to bottom, transparent 0 21px, #90b1cd55 21px 22px), linear-gradient(110deg, #fffef8, #faf6e9); }
.paper-left { left: 0; background-image: linear-gradient(90deg, transparent 27px, #d7858538 27px 28px, transparent 28px), repeating-linear-gradient(to bottom, transparent 0 21px, #90b1cd55 21px 22px), linear-gradient(110deg, #fffef8, #faf6e9); }
.paper-right { right: 0; background-image: linear-gradient(90deg, transparent calc(100% - 28px), #d7858538 calc(100% - 28px) calc(100% - 27px), transparent calc(100% - 27px)), repeating-linear-gradient(to bottom, transparent 0 21px, #90b1cd55 21px 22px), linear-gradient(110deg, #fffef8, #faf6e9); }
.paper-right::after { content: ''; position: absolute; right: 0; bottom: 0; width: 20px; height: 20px; background: linear-gradient(135deg, transparent 48%, #e0d8c2 50%, #fffdf3 85%); border-radius: 0 0 10px 0; }
.fold { top: 0; bottom: 3px; } .notebook-content { inset: 0; } .turn-page { top: 0; bottom: 3px; width: 50%; background: repeating-linear-gradient(to bottom, transparent 0 21px, #90b1cd55 21px 22px), linear-gradient(90deg, #e5dcc7, #fffdf4 16%, #fffdf4 85%, #e7dcc6); }
.desk-watch { right: 4vw; width: clamp(35px, 4.2vw, 58px); } .watch-case { width: clamp(94px, 8.5vw, 125px); left: 50%; transform: translate(-50%, -50%); }
@media (max-width: 800px) { .notebook-scene { padding: 100px 14px 58px; } .notebook-content { padding: 16px; } .desk-pen, .desk-eraser { display: none; } .desk-watch { top: 4px; right: 22px; width: 62px; height: 72px; transform: none; } .watch-case { left: -5px; width: 68px; border-width: 3px; } .watch-time { bottom: -18px; font-size: 10px; padding: 2px; } }
@media (max-width: 800px) { .desk-watch { right: 43px; width: 30px; } .watch-case { left: 50%; transform: translate(-50%, -50%); } }
@media (prefers-reduced-motion: reduce) { .shake-a, .shake-b, .urgent .watch-case { animation: none; } .turn-page { display: none; } .countdown-hand { transition: none; } }
</style>
