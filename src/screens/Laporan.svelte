<script lang="ts">
  import { db } from '../lib/db'
  import { fmt, fmtRange, fmtShort, dowHeaders, periodFor } from '../lib/format'
  import { t, i18n } from '../lib/i18n.svelte'
  import { store } from '../lib/store.svelte'
  import { swipe } from '../lib/swipe'

  let anchor = $state(new Date())

  interface DayCell {
    key: string
    day: number
    inPer: boolean
    inc: number
    exp: number
  }

  function period(): { start: Date; end: Date } {
    return periodFor(anchor, store.cutDate)
  }

  const label = $derived(fmtRange(period().start, period().end))

  const sums = $derived.by(() => {
    const { start, end } = period()
    let inc = 0
    let exp = 0
    const byCat = new Map<string, number>()
    for (const x of store.transactions) {
      if (x.ts < start.getTime() || x.ts > end.getTime()) continue
      if (x.type === 'income') inc += x.amount
      else {
        exp += x.amount
        byCat.set(x.catId, (byCat.get(x.catId) ?? 0) + x.amount)
      }
    }
    return { inc, exp, byCat }
  })

  const catBars = $derived.by(() => {
    const entries = [...sums.byCat.entries()].sort((a, b) => b[1] - a[1])
    const max = entries.length ? entries[0][1] : 1
    return entries.map(([id, val]) => ({
      id,
      val,
      pct: Math.round((val / max) * 100),
      name: store.categories.find((c) => c.id === id)?.name ?? t('other'),
      emoji: store.categories.find((c) => c.id === id)?.emoji ?? '📦',
    }))
  })

  /** Calendar weeks covering the period; days outside are dimmed. */
  const calendar = $derived.by(() => {
    const { start, end } = period()
    const cursor = new Date(start)
    cursor.setDate(cursor.getDate() - cursor.getDay()) // back to Sunday
    const cells: DayCell[] = []
    let guard = 0
    while (cursor <= end && guard < 60) {
      for (let i = 0; i < 7 && cursor <= end; i++) {
        const d = new Date(cursor)
        const iso = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()
        let inc = 0
        let exp = 0
        for (const x of store.transactions) {
          const xd = new Date(x.ts)
          if (xd.getFullYear() !== d.getFullYear() || xd.getMonth() !== d.getMonth() || xd.getDate() !== d.getDate()) continue
          if (x.type === 'income') inc += x.amount
          else exp += x.amount
        }
        cells.push({
          key: iso,
          day: d.getDate(),
          inPer: d >= start && d <= end,
          inc,
          exp,
        })
        cursor.setDate(cursor.getDate() + 1)
      }
      guard++
    }
    return cells
  })

  function shift(dir: number): void {
    const { start } = period()
    anchor = new Date(start.getFullYear(), start.getMonth() + dir, store.cutDate + 1)
  }

  async function changeCut(e: Event): Promise<void> {
    const v = parseInt((e.target as HTMLSelectElement).value, 10)
    store.cutDate = v
    await db.settings.put({ key: 'cutDate', value: v })
  }

  const cutOptions = Array.from({ length: 28 }, (_, i) => i + 1)
</script>

<main class="screen" use:swipe={(dir) => shift(dir)}>
  <h1>{t('report')}</h1>

  <div class="cut-row">
    <span class="muted">{t('cut_date_label')}</span>
    <select value={store.cutDate} onchange={changeCut}>
      {#each cutOptions as n (n)}
        <option value={n}>{i18n.lang === 'id' ? 'Tanggal' : 'Day'} {n}</option>
      {/each}
    </select>
  </div>

  <div class="row period-row">
    <button class="subback" onclick={() => shift(-1)}>‹</button>
    <div class="period-center"><div class="range">{label}</div></div>
    <button class="subback" onclick={() => shift(1)}>›</button>
  </div>

  <div class="bignum">
    <div class="bal-row">
      <div class="l">{t('balance')}</div>
      <div class="v bal">{fmt(sums.inc - sums.exp)}</div>
    </div>
    <div class="io-row">
      <div><div class="v inc">{fmt(sums.inc)}</div><div class="l">{t('income')}</div></div>
      <div><div class="v exp">{fmt(sums.exp)}</div><div class="l">{t('expense')}</div></div>
    </div>
  </div>

  <div class="label">{t('by_category')}</div>
  <div class="repbars">
    {#each catBars as bar (bar.id)}
      <div class="rep-bar">
        <span class="nm">{bar.emoji} {bar.name}</span>
        <span class="track"><span class="fill" style="width:{bar.pct}%"></span></span>
        <span class="amt">{fmt(bar.val)}</span>
      </div>
    {:else}
      <div class="empty">{t('empty_period')}</div>
    {/each}
  </div>

  <div class="label">{t('calendar')}</div>
  <div class="cal">
    {#each dowHeaders() as d (d)}
      <div class="dow">{d}</div>
    {/each}
    {#each calendar as cell (cell.key)}
      <div class="cell" class:out={!cell.inPer}>
        <div class="dn">{cell.day}</div>
        {#if cell.inc}<div class="inc">+{fmtShort(cell.inc)}</div>{/if}
        {#if cell.exp}<div class="exp">-{fmtShort(cell.exp)}</div>{/if}
      </div>
    {/each}
  </div>
</main>
