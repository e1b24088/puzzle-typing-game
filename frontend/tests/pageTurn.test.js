import test from 'node:test'
import assert from 'node:assert/strict'
import { createPageTurn } from '../src/utils/pageTurn.js'
function fixture(duration = 100) {
  const tasks = new Map(), states = []
  let index = 0, questions = 0
  const turn = createPageTurn({ duration, advance: () => questions++, onStateChange: (...state) => states.push(state), schedule: fn => { tasks.set(++index, fn); return index }, cancel: id => tasks.delete(id) })
  return { turn, tasks, states, questions: () => questions }
}
test('next question is ready immediately, before animation finishes', () => {
  const f = fixture(); f.turn.begin()
  assert.equal(f.questions(), 1)
  assert.deepEqual(f.states, [[true, 1]])
  assert.equal(f.tasks.size, 1)
})
test('rapid question completion restarts only the decoration', () => {
  const f = fixture(); f.turn.begin(); f.turn.begin()
  assert.equal(f.questions(), 2)
  assert.equal(f.tasks.size, 1)
  assert.deepEqual(f.states, [[true, 1], [true, 2]])
  for (const fn of f.tasks.values()) fn()
  assert.deepEqual(f.states.at(-1), [false, 2])
})
test('ending the game cancels delayed decoration and prevents new questions', () => {
  const f = fixture(); f.turn.begin(); f.turn.dispose(); f.turn.begin()
  assert.equal(f.questions(), 1)
  assert.equal(f.tasks.size, 0)
})
test('reduced motion advances without animation delay or timer', () => {
  const f = fixture(0); f.turn.begin()
  assert.equal(f.questions(), 1)
  assert.equal(f.tasks.size, 0)
  assert.deepEqual(f.states, [[false, 1]])
})
