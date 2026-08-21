/** Svelte action: call cb(-1 | 1) on horizontal swipe (left = 1/next, right = -1/prev). */
export function swipe(node: HTMLElement, cb: (dir: -1 | 1) => void): {
  update: (newCb: (dir: -1 | 1) => void) => void
  destroy: () => void
} {
  let callback = cb
  let x0 = 0
  let y0 = 0
  let tracking = false

  const THRESHOLD = 60 // px

  function start(e: TouchEvent): void {
    const t = e.changedTouches[0]
    x0 = t.clientX
    y0 = t.clientY
    tracking = true
  }

  function end(e: TouchEvent): void {
    if (!tracking) return
    tracking = false
    const t = e.changedTouches[0]
    const dx = t.clientX - x0
    const dy = t.clientY - y0
    // horizontal intent only — don't fight vertical scrolling
    if (Math.abs(dx) > THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      callback(dx < 0 ? 1 : -1)
    }
  }

  node.addEventListener('touchstart', start, { passive: true })
  node.addEventListener('touchend', end, { passive: true })

  return {
    update(newCb: (dir: -1 | 1) => void) {
      callback = newCb
    },
    destroy() {
      node.removeEventListener('touchstart', start)
      node.removeEventListener('touchend', end)
    },
  }
}
