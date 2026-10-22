// 読みが同じ代表的な綴りを、音のまとまりごとに受け付ける。
// 問題全体の組合せを展開せず、入力済みの接頭辞だけを照合する。
const romajiGroups = [
  ['sha', 'sya'], ['shu', 'syu'], ['sho', 'syo'], ['shi', 'si'],
  ['cha', 'tya', 'cya'], ['chu', 'tyu', 'cyu'], ['cho', 'tyo', 'cyo'],
  ['chi', 'ti'], ['tsu', 'tu'], ['fu', 'hu'], ['ji', 'zi'],
  ['ja', 'jya', 'zya'], ['ju', 'jyu', 'zyu'], ['je', 'jye', 'zye'], ['jo', 'jyo', 'zyo']
]
const doubledGroups = romajiGroups.map(group => [...new Set(group.flatMap(spelling =>
  spelling.startsWith('ch') ? ['c' + spelling, 't' + spelling] : [spelling[0] + spelling]))])
const spellings = [...romajiGroups, ...doubledGroups]
  .flatMap(group => group.map(spelling => ({ spelling, alternatives: group })))
  .sort((a, b) => b.spelling.length - a.spelling.length)

export function makeTypingTokens(romaji) {
  romaji = romaji.toLowerCase().replace(/\s+/g, '')
  const tokens = []
  let index = 0
  while (index < romaji.length) {
    if (romaji[index] === 'n') {
      const doubled = romaji[index + 1] === 'n'
      const following = romaji[index + (doubled ? 2 : 1)]
      // 母音・yの前のnnは省略しない。nn+母音は「ん＋母音」と
      // 「ん＋な行」の両方があり得るので、後者の追加nも許可する。
      if (doubled && following && /[aiueoy]/.test(following)) {
        tokens.push({ canonical: 'n', alternatives: ['nn', 'nnn'] })
        index += 2
        continue
      }
      if (following && /[bcdfghjklmpqrstvwxyz]/.test(following)) {
        tokens.push({ canonical: 'n', alternatives: ['n', 'nn'] })
        index += doubled ? 2 : 1
        continue
      }
    }
    const match = spellings.find(item => romaji.startsWith(item.spelling, index))
    const canonical = match?.spelling ?? romaji[index]
    tokens.push({ canonical, alternatives: [canonical, ...(match?.alternatives ?? []).filter(s => s !== canonical)] })
    index += canonical.length
  }
  return tokens
}

export function matchTypingPrefix(tokens, input) {
  const failed = new Set()
  function visit(tokenIndex, position) {
    if (tokenIndex === tokens.length) return position === input.length ? { completed: true, suffix: '' } : null
    const state = `${tokenIndex}:${position}`
    if (failed.has(state)) return null
    const rest = input.slice(position)
    if (!rest) return { completed: false, suffix: tokens.slice(tokenIndex).map(t => t.canonical).join('') }
    for (const spelling of tokens[tokenIndex].alternatives) {
      if (rest.length < spelling.length && spelling.startsWith(rest)) {
        return { completed: false, suffix: spelling.slice(rest.length) + tokens.slice(tokenIndex + 1).map(t => t.canonical).join('') }
      }
      if (rest.startsWith(spelling)) {
        const result = visit(tokenIndex + 1, position + spelling.length)
        if (result) return result
      }
    }
    failed.add(state)
    return null
  }
  const result = visit(0, 0)
  return result ? { valid: true, completed: result.completed, displayRomaji: input + result.suffix } : { valid: false, completed: false }
}

export function checkTypingInput(tokens, input, key) {
  const previous = matchTypingPrefix(tokens, input)
  if (key.length !== 1) return { correct: false, input, position: input.length, completed: false, displayRomaji: previous.displayRomaji }
  const next = input + key.toLowerCase()
  const result = matchTypingPrefix(tokens, next)
  return { correct: result.valid, input: result.valid ? next : input,
    position: result.valid ? next.length : input.length, completed: result.valid && result.completed,
    displayRomaji: result.valid ? result.displayRomaji : previous.displayRomaji }
}
