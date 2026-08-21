import Dexie, { type EntityTable } from 'dexie'

/** Categories are strictly expense or income. */
export type CatType = 'expense' | 'income'
export type TxType = 'expense' | 'income'

export interface Category {
  id: string
  name: string
  emoji: string
  type: CatType
  order: number
}

export interface Template {
  id: string
  name: string
  amount: number
  catId: string
  order: number
}

export interface Transaction {
  id: number
  type: TxType
  amount: number
  catId: string
  note: string
  /** Business date (normalized to noon of the selected day). */
  ts: number
  /** Wall-clock creation time — used to order same-day entries. */
  created?: number
}

export interface Setting {
  key: string
  value: unknown
}

export const db = new Dexie('catatan-keuangan') as Dexie & {
  categories: EntityTable<Category, 'id'>
  templates: EntityTable<Template, 'id'>
  transactions: EntityTable<Transaction, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  categories: 'id, order',
  templates: 'id, order',
  transactions: 'id, ts, catId',
  settings: 'key',
})

/** Millisecond-precision numeric id that survives rapid successive calls. */
export function newTxId(): number {
  return Date.now() * 100 + Math.floor(Math.random() * 100)
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c_makan', name: 'Makanan', emoji: '🍜', type: 'expense', order: 0 },
  { id: 'c_trans', name: 'Transport', emoji: '🚌', type: 'expense', order: 1 },
  { id: 'c_belanja', name: 'Belanja', emoji: '🛒', type: 'expense', order: 2 },
  { id: 'c_tagihan', name: 'Tagihan', emoji: '🧾', type: 'expense', order: 3 },
  { id: 'c_hiburan', name: 'Hiburan', emoji: '🎮', type: 'expense', order: 4 },
  { id: 'c_sehat', name: 'Kesehatan', emoji: '💊', type: 'expense', order: 5 },
  { id: 'c_gaji', name: 'Gaji', emoji: '💼', type: 'income', order: 6 },
  { id: 'c_lain', name: 'Lainnya', emoji: '📦', type: 'expense', order: 7 },
]

/** Seed default data once, on first run; migrate legacy 'both' categories. */
async function seedDefaults(): Promise<void> {
  await db.categories.bulkPut(DEFAULT_CATEGORIES)
  await db.templates.bulkPut([
    { id: 't_angkot', name: 'Angkot', amount: 5000, catId: 'c_trans', order: 0 },
    { id: 't_kopi', name: 'Kopi', amount: 15000, catId: 'c_makan', order: 1 },
    { id: 't_makan', name: 'Makan Siang', amount: 25000, catId: 'c_makan', order: 2 },
    { id: 't_pulsa', name: 'Pulsa', amount: 20000, catId: 'c_tagihan', order: 3 },
  ])
}

export async function ensureSeeded(): Promise<void> {
  // v1.1: categories no longer support 'both' — fold them into expense
  const legacy = (await db.categories.toArray()).filter((c) => (c.type as string) === 'both')
  if (legacy.length) {
    await db.categories.bulkPut(legacy.map((c) => ({ ...c, type: 'expense' as CatType })))
  }

  const count = await db.categories.count()
  if (count > 0) return
  await seedDefaults()
}

/** Factory reset: wipe everything, then restore default categories & shortcuts. */
export async function resetToDefaults(): Promise<void> {
  await db.transaction('rw', [db.categories, db.templates, db.transactions], async () => {
    await Promise.all([db.categories.clear(), db.templates.clear(), db.transactions.clear()])
  })
  await seedDefaults()
}
