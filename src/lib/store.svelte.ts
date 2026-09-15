import { db, newTxId, ensureSeeded, resetToDefaults, type Category, type Siklus, type Template, type Transaction, type TxType } from './db'
import { t } from './i18n.svelte'
import { fmt } from './format'
import { showToast } from './toast.svelte'
import { initHistory, pushView, goBack, canGoBack, type View } from './history'

export type Screen = 'home' | 'trans' | 'report' | 'siklus' | 'data'
export type InputRet = 'home' | 'trans' | 'siklus'
export type SettingsPage = 'index' | 'pintasan' | 'pintasan-form' | 'kategori' | 'kategori-form' | 'siklus' | 'siklus-form' | 'ekspor' | 'tentang'

export const store = $state({
  ready: false,
  screen: 'home' as Screen,
  categories: [] as Category[],
  templates: [] as Template[],
  siklus: [] as Siklus[],
  transactions: [] as Transaction[],
  cutDate: 1,
  settingsPage: 'index' as SettingsPage,
  /** Which siklus' history page is open, if any. */
  siklusDetail: null as string | null,
  // input screen state
  inputOpen: false,
  editingId: null as number | null,
  inputDate: new Date() as Date,
  inputReturn: 'home' as InputRet,
  inputAmount: 0,
  inputType: 'expense' as TxType,
  inputCat: null as string | null,
  inputSiklusId: null as string | null,
  inputNote: '',
})

export async function reloadAll(): Promise<void> {
  store.categories = await db.categories.orderBy('order').toArray()
  store.templates = await db.templates.orderBy('order').toArray()
  store.siklus = await db.siklus.orderBy('order').toArray()
  store.transactions = (await db.transactions.toArray())
    .sort((a, b) => b.ts - a.ts || (b.created ?? b.id) - (a.created ?? a.id))
}

// ---- history -----------------------------------------------------------
// See lib/history.ts. The store only supplies the view snapshot and knows how
// to apply one; the depth accounting lives in a rune-free module so it can be
// exercised outside a browser.

function currentView(): View {
  return {
    screen: store.screen,
    settingsPage: store.settingsPage,
    siklusDetail: store.siklusDetail,
    input: store.inputOpen,
  }
}

/** Restore a view handed back by the history layer. */
function setView(v: View): void {
  store.screen = v.screen
  store.settingsPage = v.settingsPage
  store.siklusDetail = v.siklusDetail
  store.inputOpen = v.input
  if (!v.input) store.editingId = null
}

export async function initApp(): Promise<void> {
  await ensureSeeded()
  const s = await db.settings.get('cutDate')
  if (s && typeof s.value === 'number') store.cutDate = s.value
  await reloadAll()
  handleLaunchIntent()
  initHistory(currentView, setView)
  store.ready = true
}

/** Deep-link from PWA app shortcuts (?action=record&type=… or ?screen=…).
 *  The URL is cleaned afterwards so a reload doesn't re-trigger the action. */
function handleLaunchIntent(): void {
  const params = new URLSearchParams(location.search)
  const action = params.get('action')
  const screen = params.get('screen')
  if (!action && !screen) return
  history.replaceState(null, '', location.pathname)

  if (screen === 'report' || screen === 'trans' || screen === 'siklus' || screen === 'data') {
    store.screen = screen
    return
  }
  if (action === 'record') {
    const type = params.get('type') === 'income' ? ('income' as const) : ('expense' as const)
    prepareNew(new Date(), 'home')
    setType(type)
  }
}

export function catById(id: string): Category | undefined {
  return store.categories.find((c) => c.id === id)
}

export function setType(type: TxType): void {
  store.inputType = type
  const c = store.inputCat ? catById(store.inputCat) : undefined
  if (c && c.type !== type) store.inputCat = null
}

/** Open blank form; date comes from context (FAB day / today). */
export function openNew(date: Date, ret: InputRet): void {
  prepareNew(date, ret)
  pushView()
}

function prepareNew(date: Date, ret: InputRet): void {
  store.editingId = null
  store.inputDate = date
  store.inputReturn = ret
  store.inputAmount = 0
  store.inputNote = ''
  store.inputCat = null
  store.inputSiklusId = null
  setType('expense')
  store.inputOpen = true
}

/** Prefill from a shortcut and record for its category's type. */
export function openFromTemplate(tpl: Template, ret: InputRet): void {
  const c = catById(tpl.catId)
  store.editingId = null
  store.inputDate = new Date()
  store.inputReturn = ret
  store.inputAmount = tpl.amount
  store.inputNote = ''
  store.inputCat = tpl.catId
  store.inputSiklusId = tpl.siklusId ?? null
  setType(c ? c.type : 'expense')
  store.inputOpen = true
  pushView()
}

/** Tap an existing transaction to edit it. */
export function loadTx(tx: Transaction, ret: InputRet): void {
  store.editingId = tx.id
  store.inputDate = new Date(tx.ts)
  store.inputReturn = ret
  store.inputAmount = tx.amount
  store.inputNote = tx.note
  store.inputCat = tx.catId
  store.inputSiklusId = tx.siklusId ?? null
  setType(tx.type)
  store.inputOpen = true
  pushView()
}

export function cancelInput(): void {
  if (!store.inputOpen) return
  store.inputOpen = false
  store.editingId = null
  // pop the form's entry so the stack stays honest for back and forward;
  // a no-op at the root, where there is nothing to unwind
  goBack()
}

/** Open one siklus' purchase history. */
export function openSiklusDetail(id: string): void {
  store.siklusDetail = id
  pushView()
}

/** Leave the siklus detail page, unwinding its entry. */
export function closeSiklusDetail(): void {
  if (!store.siklusDetail) return
  store.siklusDetail = null
  goBack()
}

/** Switch bottom-nav tab, recording the step. */
export function goScreen(next: Screen): void {
  store.screen = next
  pushView()
}

/** Enter a settings sub-page, recording the step. */
export function goSettings(page: SettingsPage): void {
  store.settingsPage = page
  pushView()
}

/** Return from a settings form to its list. */
export function leaveSettings(page: SettingsPage): void {
  if (canGoBack()) { goBack(); return } // popstate restores the list view
  store.settingsPage = page
}

export async function saveInput(): Promise<boolean> {
  if (!store.inputAmount) { alert(t('alert_amount')); return false }
  if (!store.inputCat) { alert(t('alert_category')); return false }
  const editingId = store.editingId
  const existing = editingId != null ? await db.transactions.get(editingId) : undefined
  const d = store.inputDate
  // noon to be safe across DST/timezone shifts
  const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).getTime()
  const row: Transaction = {
    id: editingId ?? newTxId(),
    type: store.inputType,
    amount: store.inputAmount,
    catId: store.inputCat,
    note: store.inputNote.trim(),
    ts,
    // preserve original creation time when editing; legacy rows fall back to
    // their business date so edited old transactions don't jump to the top
    created: existing?.created ?? ts,
  }
  if (store.inputSiklusId) row.siklusId = store.inputSiklusId
  await db.transactions.put(row)
  cancelInput()
  await reloadAll()
  showToast(existing ? '✓ ' + t('tx_updated') : '✓ ' + t('tx_created') + ' · ' + fmt(row.amount))
  return true
}

export async function deleteTransaction(id: number): Promise<void> {
  await db.transactions.delete(id)
  showToast('✓ ' + t('tx_deleted'))
  await reloadAll()
}

/** Confirm, delete the tx being edited, then return to the previous screen. */
/** Factory reset with confirmation; preferences (lang/theme/cut-date) are kept. */
export async function factoryReset(): Promise<void> {
  if (!confirm(t('reset_confirm'))) return
  await resetToDefaults()
  await reloadAll()
  showToast('✓ ' + t('reset_done'))
}

export async function deleteCurrentTx(): Promise<void> {
  if (store.editingId == null) return
  if (!confirm(t('confirm_delete'))) return
  await db.transactions.delete(store.editingId)
  const ret = store.inputReturn
  cancelInput()
  // make sure the revealed screen matches where the user came from
  store.screen = ret
  await reloadAll()
  showToast('✓ ' + t('tx_deleted'))
}
