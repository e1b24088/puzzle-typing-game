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

test('ja ji ju je jo accept z spellings in both directions and mixtures', () => {
  for (const [first, second] of [['ja', 'zya'], ['ji', 'zi'], ['ju', 'zyu'], ['je', 'zye'], ['jo', 'zyo']]) {
    inputAll(first, second); inputAll(second, first)
    inputAll(first, second.toUpperCase())
  }
  inputAll('jajijujejo', 'zyajizyujezyo')
})

test('nasal n before consonants accepts single and double input independently of source', () => {
  for (const source of ['sanpo', 'sannpo']) {
    inputAll(source, 'sanpo'); inputAll(source, 'sannpo')
    assert.equal(makeTypingTokens(source).map(t => t.canonical).join(''), 'sanpo')
  }
  inputAll('honndana', 'hondana'); inputAll('hondana', 'honndana')
  inputAll('hennsyuu', 'henshuu'); inputAll('henshuu', 'hennsyuu')
})

test('nasal before vowels and y cannot omit the separating n', () => {
  inputAll('zenninn', 'zenninn'); inputAll('honnya', 'honnya')
  for (const [source, short] of [['zenninn', 'zeninn'], ['honnya', 'honya'], ['hannou', 'hanou']]) {
    assert.equal(checkTypingInput(makeTypingTokens(source), short.slice(0, 3), short[3]).correct, false)
  }
  assert.equal(makeTypingTokens('honnya').map(t => t.canonical).join(''), 'honya')
})

test('n in na ni nu ne no nya is not treated as a nasal', () => {
  for (const source of ['nani', 'nuno', 'nen', 'nya', 'nyu', 'nyo']) inputAll(source, source)
  inputAll('tokutennohenka', 'tokutennnohenka')
  const tokens = makeTypingTokens('sanpo')
  const wrong = checkTypingInput(tokens, 'san', 'a')
  assert.equal(wrong.correct, false)
  assert.equal(wrong.input, 'san')
  inputAll('sanpo', 'sannpo')
})
