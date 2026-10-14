// 次の問題は即時に用意し、めくりは採点と独立した装飾として再生する。
export function createPageTurn({ advance, onStateChange, duration = 100, schedule = setTimeout, cancel = clearTimeout }) {
  let timer
  let version = 0
  let disposed = false
  return {
    begin() {
      if (disposed) return
      cancel(timer)
      version++
      advance()
      onStateChange(duration > 0, version)
      if (duration > 0) timer = schedule(() => onStateChange(false, version), duration)
    },
    dispose() { disposed = true; cancel(timer) }
  }
}
