import type { Screen, SettingsPage } from './store.svelte'

/** Everything the back/forward history can restore. */
export interface View {
  screen: Screen
  settingsPage: SettingsPage
  siklusDetail: string | null
  input: boolean
}

/**
 * Clamp a restored view to something self-consistent: a settings sub-page and
 * a siklus detail only mean anything on the screen they belong to. Leaving
 * them set would reopen a stale form the next time that tab is reached.
 */
export function normalizeView(v: View): View {
  return {
    screen: v.screen,
    settingsPage: v.screen === 'data' ? v.settingsPage : 'index',
    siklusDetail: v.screen === 'siklus' ? v.siklusDetail : null,
    input: v.input,
  }
}

/**
 * In-app history, wired to the browser History API.
 *
 * An installed PWA is closed by the system back gesture as soon as it runs out
 * of history to unwind, so every in-app step pushes an entry whose state is the
 * view to restore. At depth 0 there is nothing left to undo and back leaves the
 * app — which is how the user gets out.
 *
 * Deliberately rune-free and DOM-only, with no value imports, so the depth
 * accounting can be exercised in a plain runtime against a stubbed `history`.
 */

/** Depth of in-app history; 0 means the next back press leaves the app. */
let depth = 0
/** View of the entry the browser is currently sitting on. */
let top: View | null = null
let armed = false
let read = (): View => ({ screen: 'home', settingsPage: 'index', siklusDetail: null, input: false })
let write = (_v: View): void => {}

function sameView(a: View | null, b: View): boolean {
  return !!a && a.screen === b.screen && a.settingsPage === b.settingsPage
    && a.siklusDetail === b.siklusDetail && a.input === b.input
}

/** Wire the layer to app state and take over the browser's back and forward. */
export function initHistory(getView: () => View, applyView: (v: View) => void): void {
  read = getView
  write = applyView
  top = read()
  history.replaceState({ depth: 0, view: top }, '')
  window.addEventListener('popstate', (e) => {
    const s = (e as PopStateEvent).state as { depth: number; view: View } | null
    if (!s || !s.view) return
    depth = s.depth
    top = s.view
    write(normalizeView(s.view))
  })
  armed = true
}

/** True while there is in-app history to unwind. */
export function canGoBack(): boolean {
  return depth > 0
}

/** Record an in-app step so the next back press unwinds it. Repeating the same
 *  view is a no-op — two taps on + shouldn't cost two back presses. */
export function pushView(): void {
  if (!armed) return
  const v = read()
  if (sameView(top, v)) return
  depth++
  top = v
  history.pushState({ depth, view: v }, '')
}

/** Undo one in-app step; a no-op at the root, where back should leave the app. */
export function goBack(): void {
  if (depth > 0) history.back()
}
