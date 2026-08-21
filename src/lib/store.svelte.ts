import { db, ensureSeeded, type Category, type Template, type Transaction, type TxType } from './db'
import { t } from './i18n.svelte'

export type Screen = 'home' | 'trans' | 'report' | 'data'
export type InputRet = 'home' | 'trans'
export type SettingsPage = 'index' | 'pintasan' | 'kategori' | 'ekspor' | 'tentang'

export const store = $state({
  ready: false,
  screen: 'home' as Screen,
  categories: [] as Category[],
  templates: [] as Template[],
  transactions: [] as Transaction[],
  cutDate: 1,
  settingsPage: 'index' as SettingsPage,
  // input screen state
  inputOpen: false,
  editingId: null as number | null,
  inputDate: new Date() as Date,
  inputReturn: 'home' as InputRet,
  inputAmount: 0,
  inputType: 'expense' as TxType,
  inputCat: null as string | null,
  inputNote: '',
})

export async function reloadAll(): Promise<void> {
  store.categories = await db.categories.orderBy('order').toArray()
  store.templates = await db.templates.orderBy('order').toArray()
  store.transactions = (await db.transactions.toArray()).sort((a, b) => b.ts - a.ts)
}

export async function initApp(): Promise<void> {
  await ensureSeeded()
  const s = await db.settings.get('cutDate')
  if (s && typeof s.value === 'number') store.cutDate = s.value
  await reloadAll()
  store.ready = true
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
  store.editingId = null
  store.inputDate = date
  store.inputReturn = ret
  store.inputAmount = 0
  store.inputNote = ''
  store.inputCat = null
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
  setType(c ? c.type : 'expense')
  store.inputOpen = true
}

/** Tap an existing transaction to edit it. */
export function loadTx(tx: Transaction, ret: InputRet): void {
  store.editingId = tx.id
  store.inputDate = new Date(tx.ts)
  store.inputReturn = ret
  store.inputAmount = tx.amount
  store.inputNote = tx.note
  store.inputCat = tx.catId
  setType(tx.type)
  store.inputOpen = true
}

export function cancelInput(): void {
  store.inputOpen = false
  store.editingId = null
}

export function pressKey(k: string): void {
  if (k === 'del') {
    store.inputAmount = Math.floor(store.inputAmount / 10)
  } else if (k === 'clear') {
    store.inputAmount = 0
  } else {
    if (String(store.inputAmount).length < 12) store.inputAmount = store.inputAmount * 10 + parseInt(k, 10)
  }
}

export async function saveInput(): Promise<boolean> {
  if (!store.inputAmount) { alert(t('alert_amount')); return false }
  if (!store.inputCat) { alert(t('alert_category')); return false }
  const d = store.inputDate
  // noon to be safe across DST/timezone shifts
  const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).getTime()
  const row: Transaction = {
    id: store.editingId ?? Date.now(),
    type: store.inputType,
    amount: store.inputAmount,
    catId: store.inputCat,
    note: store.inputNote.trim(),
    ts,
  }
  await db.transactions.put(row)
  cancelInput()
  await reloadAll()
  return true
}

export async function deleteTransaction(id: number): Promise<void> {
  await db.transactions.delete(id)
  await reloadAll()
}

/** Confirm, delete the tx being edited, then return to the previous screen. */
export async function deleteCurrentTx(): Promise<void> {
  if (store.editingId == null) return
  if (!confirm(t('confirm_delete'))) return
  await db.transactions.delete(store.editingId)
  const ret = store.inputReturn
  cancelInput()
  // make sure the revealed screen matches where the user came from
  store.screen = ret === 'trans' ? 'trans' : 'home'
  await reloadAll()
}
