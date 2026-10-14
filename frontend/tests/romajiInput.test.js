import test from 'node:test'
import assert from 'node:assert/strict'
import data from '../src/data/gameData.json' with { type: 'json' }
import { checkTypingInput, makeTypingTokens } from '../src/utils/romajiInput.js'
function inputAll(canonical, input) {
  const tokens = makeTypingTokens(canonical)
  let result = { input: '' }
  for (const key of input) {
    result = checkTypingInput(tokens, result.input, key)
    assert.ok(result.correct, `${canonical}: ${input}`)
    assert.ok(result.displayRomaji.startsWith(result.input))
  }
  assert.ok(result.completed)
  assert.equal(result.position, input.length)
}
test('book game accepts alternate and mixed romaji', () => {
  inputAll('shu', 'syu'); inputAll('syu', 'shu')
  inputAll('shuchoshichi', 'syutyositi')
  inputAll('ccha', 'ttya')
})
test('wrong keys leave position intact and display changes when a route is chosen', () => {
  const tokens = makeTypingTokens('shu')
  const s = checkTypingInput(tokens, '', 's')
  const sy = checkTypingInput(tokens, s.input, 'y')
  assert.equal(sy.displayRomaji, 'syu')
  const wrong = checkTypingInput(tokens, sy.input, 'x')
  assert.equal(wrong.correct, false); assert.equal(wrong.position, 2)
  assert.equal(checkTypingInput(tokens, wrong.input, 'U').completed, true)
})
test('all current questions accept original spellings without whitespace', () => {
  for (const question of data.questions) {
    const text = question.romaji.replace(/\s+/g, '')
    inputAll(text, text)
  }
})
