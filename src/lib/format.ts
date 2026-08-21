import type { Lang } from './i18n.svelte'
import { i18n } from './i18n.svelte'

const MON: Record<Lang, string[]> = {
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

const WD: Record<Lang, string[]> = {
  id: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
}

const DOW: Record<Lang, string[]> = {
  id: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
}

/** Rp 1.234.567 */
export function fmt(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID')
}

/** 5rb / 15rb / 1.2jt */
export function fmtShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt'
  if (n >= 1000) return Math.round(n / 1000) + 'rb'
  return '' + n
}

/** 21 Ags */
export function shortDate(ts: number): string {
  const d = new Date(ts)
  return d.getDate() + ' ' + MON[i18n.lang][d.getMonth()]
}

/** 21 Ags 2025 */
export function fmtDate(d: Date): string {
  return d.getDate() + ' ' + MON[i18n.lang][d.getMonth()] + ' ' + d.getFullYear()
}

/** 25 Jul – 24 Ags '25 */
export function fmtRange(s: Date, e: Date): string {
  return (
    s.getDate() + ' ' + MON[i18n.lang][s.getMonth()] +
    ' – ' +
    e.getDate() + ' ' + MON[i18n.lang][e.getMonth()] +
    " '" + String(e.getFullYear()).slice(2)
  )
}

export function weekday(d: Date): string {
  return WD[i18n.lang][d.getDay()]
}

export function dowHeaders(): string[] {
  return DOW[i18n.lang]
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** yyyy-mm-dd for <input type=date> */
export function toDateInput(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

export interface Period {
  start: Date
  end: Date
}

/** Cut-date period containing `date`: e.g. cut=25 → 25 Jul–24 Ags */
export function periodFor(date: Date, cut: number): Period {
  const d = new Date(date)
  let y = d.getFullYear()
  let m = d.getMonth()
  if (d.getDate() < cut) {
    m -= 1
    if (m < 0) { m += 12; y -= 1 }
  }
  const start = new Date(y, m, cut)
  const end = new Date(y, m + 1, cut)
  end.setDate(end.getDate() - 1)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}
