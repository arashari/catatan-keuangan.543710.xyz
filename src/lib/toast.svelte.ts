let toast = $state<{ id: number; msg: string } | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

export function getToast(): { id: number; msg: string } | null {
  return toast
}

/** Show a transient confirmation pill (auto-hides after 1.6s). */
export function showToast(msg: string): void {
  toast = { id: Date.now(), msg }
  clearTimeout(timer)
  timer = setTimeout(() => (toast = null), 1600)
}
