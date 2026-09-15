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

/** A recurring purchase worth tracking — "galon air", "token listrik".
 *  A tag on a transaction, not a property of a shortcut: a shortcut may
 *  pre-tag one, but a siklus exists on its own. */
export interface Siklus {
  id: string
  name: string
  emoji: string
  order: number
}

export interface Template {
  id: string
  name: string
  amount: number
  catId: string
  /** Optional siklus this shortcut pre-tags when tapped. */
  siklusId?: string
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
  /** Optional siklus tag, for recurring-purchase tracking. */
  siklusId?: string
}

export interface Setting {
  key: string
  value: unknown
}

export const db = new Dexie('catatan-keuangan') as Dexie & {
  categories: EntityTable<Category, 'id'>
  templates: EntityTable<Template, 'id'>
  transactions: EntityTable<Transaction, 'id'>
  siklus: EntityTable<Siklus, 'id'>
  settings: EntityTable<Setting, 'key'>
}

db.version(1).stores({
  categories: 'id, order',
  templates: 'id, order',
  transactions: 'id, ts, catId',
  settings: 'key',
})

// v2: siklus tags. The new object store is the only schema change — siklusId
// on templates/transactions is unindexed, so it rides along for free.
// Every store is re-declared so the upgrade can never drop an existing one;
// re-declaring an identical schema is a no-op, and no .upgrade() callback
// touches old rows. Opening a v1 database therefore keeps all its data.
db.version(2).stores({
  categories: 'id, order',
  templates: 'id, order',
  transactions: 'id, ts, catId',
  siklus: 'id, order',
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

  // v1.1: backfill `created` for transactions made before the field existed.
  // ids are Date.now()*100+rand, so id/100 recovers the original timestamp.
  const noCreated = (await db.transactions.toArray()).filter((x) => x.created == null)
  if (noCreated.length) {
    await db.transactions.bulkPut(
      noCreated.map((x) => ({ ...x, created: Math.round(x.id / 100) })),
    )
  }

  // v1.2: normalize every ts to noon of its own day so same-day order
  // is decided purely by `created`, regardless of how the row was made
  const unnormalized = (await db.transactions.toArray()).filter((x) => {
    const d = new Date(x.ts)
    return d.getHours() !== 12 || d.getMinutes() !== 0
  })
  if (unnormalized.length) {
    await db.transactions.bulkPut(
      unnormalized.map((x) => {
        const d = new Date(x.ts)
        return {
          ...x,
          ts: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime(),
        }
      }),
    )
  }

  // v2: siklus emoji arrived after the table did — give old rows a fallback
  const noEmoji = (await db.siklus.toArray()).filter((s) => !s.emoji)
  if (noEmoji.length) {
    await db.siklus.bulkPut(noEmoji.map((s) => ({ ...s, emoji: '🔁' })))
  }

  const count = await db.categories.count()
  if (count > 0) return
  await seedDefaults()
}

/** Factory reset: wipe everything, then restore default categories & shortcuts. */
export async function resetToDefaults(): Promise<void> {
  await db.transaction('rw', [db.categories, db.templates, db.transactions, db.siklus], async () => {
    await Promise.all([
      db.categories.clear(),
      db.templates.clear(),
      db.transactions.clear(),
      db.siklus.clear(),
    ])
  })
  await seedDefaults()
}
