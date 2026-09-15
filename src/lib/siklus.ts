import type { Siklus, Transaction } from './db'

const DAY = 86_400_000
/** Occurrences considered when estimating — old data shouldn't pin today's habit. */
const SAMPLE = 6

/** Day distance between two noon-normalized timestamps. */
function dayDiff(a: number, b: number): number {
  return Math.round((a - b) / DAY)
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2
}

export interface SiklusStat {
  siklus: Siklus
  /** Tagged transactions, including same-day duplicates. */
  count: number
  lastTs: number
  lastAmount: number
  /** Median days between purchases; null until there are two distinct days. */
  everyDays: number | null
  /** Median amount over the sample. */
  estAmount: number
  /** lastTs + everyDays; null when there is no estimate yet. */
  nextTs: number | null
  daysSinceLast: number
  /** everyDays − daysSinceLast; negative means overdue. */
  daysLeft: number | null
  /** Most recent completed gap; null until there are two distinct days. */
  lastGapDays: number | null
  /** lastGapDays − everyDays. Only meaningful from three distinct days on —
   *  with a single interval the gap *is* the median, so it is always 0. */
  deviationDays: number | null
}

/**
 * Derive per-siklus purchase stats from tagged transactions.
 * Pure: no Dexie, no Svelte — pass in plain arrays.
 */
export function siklusStats(list: Siklus[], txs: Transaction[], now = new Date()): SiklusStat[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime()
  const stats: SiklusStat[] = []

  for (const skl of list) {
    const hits = txs.filter((x) => x.siklusId === skl.id).sort((a, b) => a.ts - b.ts)
    if (!hits.length) continue

    // one restock per day — ts is already noon-normalized, so same-day
    // purchases collapse to a single day and can't produce a 0-day cycle
    const days: number[] = []
    for (const h of hits) if (days[days.length - 1] !== h.ts) days.push(h.ts)

    const sample = days.slice(-SAMPLE)
    const gaps = sample.slice(1).map((ts, i) => dayDiff(ts, sample[i]))
    const everyDays = gaps.length ? Math.max(1, Math.round(median(gaps))) : null

    const last = hits[hits.length - 1]
    const daysSinceLast = dayDiff(today, last.ts)
    const lastGapDays = gaps.length ? gaps[gaps.length - 1] : null

    stats.push({
      siklus: skl,
      count: hits.length,
      lastTs: last.ts,
      lastAmount: last.amount,
      everyDays,
      estAmount: median(hits.slice(-SAMPLE).map((x) => x.amount)),
      nextTs: everyDays != null ? last.ts + everyDays * DAY : null,
      daysSinceLast,
      daysLeft: everyDays != null ? everyDays - daysSinceLast : null,
      lastGapDays,
      deviationDays: everyDays != null && gaps.length >= 2 ? lastGapDays! - everyDays : null,
    })
  }

  // most urgent first; items without an estimate sink to the bottom
  return stats.sort(
    (a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity) || b.lastTs - a.lastTs,
  )
}

export interface SiklusRow {
  tx: Transaction
  /** Days since the purchase before it; null for the first one, and for a
   *  second purchase on the same day (a 0-day cycle is not a cycle). */
  gap: number | null
}

/** One siklus' tagged purchases, newest first, each with its measured gap. */
export function siklusHistory(txs: Transaction[], siklusId: string): SiklusRow[] {
  const hits = txs.filter((x) => x.siklusId === siklusId).sort((a, b) => b.ts - a.ts)
  return hits.map((tx, i) => {
    const prev = hits[i + 1] // next in the array = the earlier purchase
    const days = prev ? dayDiff(tx.ts, prev.ts) : 0
    return { tx, gap: days > 0 ? days : null }
  })
}
