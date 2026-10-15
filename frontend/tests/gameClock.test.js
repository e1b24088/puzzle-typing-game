import test from 'node:test'
import assert from 'node:assert/strict'
import { createGameClock, watchHandAngle, watchTickIsFinal } from '../src/utils/gameClock.js'
test('pause freezes elapsed and remaining; resumed time excludes the pause', () => {
  let now = 1000
  const clock = createGameClock(60, () => now); clock.start()
  now += 12500; clock.togglePause()
  const frozen = clock.snapshot()
  now += 100000
  assert.deepEqual(clock.snapshot(), frozen)
  assert.equal(frozen.elapsed, 12.5)
  assert.equal(frozen.remaining, 48)
  clock.togglePause(); now += 500
  assert.deepEqual(clock.snapshot(), { elapsed: 13, remaining: 47, paused: false, expired: false })
})
test('multiple pauses remain excluded and expiry cannot be paused away', () => {
  let now = 0; const clock = createGameClock(3, () => now); clock.start()
  now = 1000; clock.togglePause(); now += 10000; clock.togglePause()
  now += 1000; clock.togglePause(); now += 5000; clock.togglePause()
  now += 1000
  assert.equal(clock.snapshot().expired, true)
  assert.equal(clock.togglePause(), false)
  assert.equal(clock.snapshot().remaining, 0)
})
test('a paused clock can still provide a stable result snapshot', () => {
  let now = 0; const clock = createGameClock(60, () => now); clock.start()
  now = 5000; clock.togglePause(); now = 50000
  assert.equal(clock.snapshot().elapsed, 5)
})
test('clockwise elapsed hand enters the red 45–60 zone during the final fifteen seconds', () => {
  assert.equal(watchHandAngle(60, 60), 0)
  assert.equal(watchHandAngle(45, 60), 90)
  assert.equal(watchHandAngle(15, 60), 270)
  assert.equal(watchHandAngle(0, 60), 360)
  assert.equal(watchTickIsFinal(44, 60), false)
  assert.equal(watchTickIsFinal(45, 60), true)
  assert.equal(watchTickIsFinal(60, 60), true)
  assert.equal(watchTickIsFinal(15, 60), false)
  assert.equal(watchTickIsFinal(50, 90), true)
  assert.equal(watchTickIsFinal(49, 90), false)
  const angles = [60, 59, 45, 30, 15, 1, 0].map(s => watchHandAngle(s, 60))
  assert.deepEqual(angles, [...angles].sort((a, b) => a - b))
})
