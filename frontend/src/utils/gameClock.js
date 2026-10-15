export function createGameClock(seconds, now = Date.now) {
  let startedAt = 0
  let pausedAt = null
  let pausedMs = 0
  return {
    start() { startedAt = now(); pausedAt = null; pausedMs = 0 },
    snapshot() {
      const elapsed = Math.min(seconds, Math.max(0, ((pausedAt ?? now()) - startedAt - pausedMs) / 1000))
      return { elapsed, remaining: Math.max(0, Math.ceil(seconds - elapsed)), paused: pausedAt !== null, expired: elapsed >= seconds }
    },
    togglePause() {
      if (pausedAt !== null) { pausedMs += now() - pausedAt; pausedAt = null; return true }
      if (this.snapshot().expired) return false
      pausedAt = now()
      return true
    }
  }
}

export function watchHandAngle(remaining, totalSeconds) {
  return (totalSeconds - Math.max(0, Math.min(totalSeconds, remaining))) / totalSeconds * 360
}

export function watchTickIsFinal(tick, totalSeconds) {
  return tick > 0 && tick / 60 * totalSeconds >= Math.max(0, totalSeconds - 15)
}
