<script lang="ts">
  import { fmt, fmtDate, weekday, sameDay, toDateInput } from '../lib/format'
  import { t } from '../lib/i18n.svelte'
  import { loadTx, openNew, store } from '../lib/store.svelte'

  let viewDate = $state(new Date())
  let datepick: HTMLInputElement | undefined = $state()

  const dayTx = $derived(
    store.transactions
      .filter((x) => sameDay(new Date(x.ts), viewDate))
      .sort((a, b) => b.ts - a.ts),
  )

  function shiftDay(dir: number): void {
    const d = new Date(viewDate)
    d.setDate(d.getDate() + dir)
    viewDate = d
  }

  function onPick(e: Event): void {
    const v = (e.target as HTMLInputElement).value
    if (v) viewDate = new Date(v + 'T12:00:00')
  }

  function pick(): void {
    if (!datepick) return
    datepick.value = toDateInput(viewDate.getTime())
    try { datepick.showPicker() } catch { datepick.click() }
  }

  function catEmoji(id: string): string {
    return store.categories.find((c) => c.id === id)?.emoji ?? '📦'
  }
  function catName(id: string): string {
    return store.categories.find((c) => c.id === id)?.name ?? '-'
  }
</script>

<main class="screen">
  <div class="row period-row">
    <button class="subback" onclick={() => shiftDay(-1)}>‹</button>
    <div class="period-center">
      <div class="muted">{weekday(viewDate)}</div>
      <button class="date-btn" onclick={pick}>{fmtDate(viewDate)}</button>
      <input
        bind:this={datepick}
        type="date"
        style="position:absolute;opacity:0;width:1px;height:1px;pointer-events:none"
        onchange={onPick}
      />
    </div>
    <button class="subback" onclick={() => shiftDay(1)}>›</button>
  </div>

  <div class="list">
    {#each dayTx as tx (tx.id)}
      <button class="tx" onclick={() => loadTx(tx, 'trans')}>
        <span class="ico">{catEmoji(tx.catId)}</span>
        <span class="meta">
          <span class="n">{tx.note || catName(tx.catId)}</span>
          <span class="c">{catName(tx.catId)}</span>
        </span>
        <span class="v" class:exp={tx.type === 'expense'} class:inc={tx.type !== 'expense'}>
          {tx.type === 'expense' ? '-' : '+'}{fmt(tx.amount)}
        </span>
      </button>
    {:else}
      <div class="empty">{t('empty_day')}</div>
    {/each}
  </div>

  <button class="fab" title={t('add')} onclick={() => openNew(new Date(viewDate), 'trans')}>+</button>
</main>
