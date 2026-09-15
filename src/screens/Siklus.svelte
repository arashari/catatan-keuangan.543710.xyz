<script lang="ts">
  import {
    fmt, fmtShort, fmtDate, shortDate, fmtDays,
    fmtDaysAgo, fmtInDays, fmtEvery, fmtLate, fmtFaster, fmtSlower,
  } from '../lib/format'
  import { t } from '../lib/i18n.svelte'
  import { loadTx, store, openSiklusDetail, closeSiklusDetail } from '../lib/store.svelte'
  import { siklusHistory, siklusStats } from '../lib/siklus'

  const stats = $derived(siklusStats(store.siklus, store.transactions))
  // falls back to the list page once the last tagged purchase is deleted
  const detail = $derived(stats.find((s) => s.siklus.id === store.siklusDetail) ?? null)

  /** Newest first, each row carrying the measured gap to the one before it. */
  const rows = $derived(detail ? siklusHistory(store.transactions, detail.siklus.id) : [])
  const total = $derived(rows.reduce((s, r) => s + r.tx.amount, 0))
</script>

<main class="screen">
  {#if detail}
    <div class="subhead">
      <button class="subback" onclick={closeSiklusDetail}>‹</button>
      <h1>{detail.siklus.emoji} {detail.siklus.name}</h1>
    </div>

    <div class="skl-panel">
      {#if detail.nextTs != null}
        <span class="skl-next">
          {t('siklus_next')} {fmtDate(new Date(detail.nextTs))} · {t('siklus_est')} {fmtShort(detail.estAmount)}
        </span>
      {:else}
        <span class="skl-next muted">{t('siklus_no_est')}</span>
      {/if}
      <span class="skl-sub">
        {detail.count}{t('siklus_times')} · {t('siklus_total')} {fmt(total)}
        {#if detail.everyDays != null}· {fmtEvery(detail.everyDays)}{/if}
      </span>
      {#if detail.daysLeft != null}
        <span class="skl-sub">
          {detail.daysLeft < 0 ? fmtLate(-detail.daysLeft) : fmtInDays(detail.daysLeft)}
        </span>
      {/if}
    </div>

    <div class="label">{t('siklus_history')}</div>
    <div class="list">
      {#each rows as row (row.tx.id)}
        <button class="tx" onclick={() => loadTx(row.tx, 'siklus')}>
          <span class="ico">{detail.siklus.emoji}</span>
          <span class="meta">
            <span class="n">{fmtDate(new Date(row.tx.ts))}</span>
            <span class="c">
              {row.gap != null ? fmtDays(row.gap) : t('siklus_first')}{row.tx.note ? ' · ' + row.tx.note : ''}
            </span>
          </span>
          <span class="v" class:exp={row.tx.type === 'expense'} class:inc={row.tx.type !== 'expense'}>
            {row.tx.type === 'expense' ? '-' : '+'}{fmt(row.tx.amount)}
          </span>
        </button>
      {/each}
    </div>
  {:else}
    <h1>{t('siklus')}</h1>
    <p class="muted small">{t('siklus_sub')}</p>

    {#if stats.length}
      <div class="list">
        {#each stats as st (st.siklus.id)}
          <button class="skl" class:due={st.daysLeft != null && st.daysLeft < 0}
            onclick={() => openSiklusDetail(st.siklus.id)}>
            <span class="skl-top">
              <span class="n">{st.siklus.emoji} {st.siklus.name}</span>
              <span class="skl-right">
                {#if st.daysLeft != null}
                  <span class="pill" class:late={st.daysLeft < 0}>
                    {st.daysLeft < 0 ? fmtLate(-st.daysLeft) : fmtInDays(st.daysLeft)}
                  </span>
                {/if}
                <span class="chev">›</span>
              </span>
            </span>

            {#if st.nextTs != null}
              <span class="skl-next">
                {t('siklus_next')} {fmtDate(new Date(st.nextTs))} · {t('siklus_est')} {fmtShort(st.estAmount)}
              </span>
            {:else}
              <span class="skl-next muted">{t('siklus_no_est')}</span>
            {/if}

            <span class="skl-sub">
              {t('siklus_last')} {shortDate(st.lastTs)} · {fmt(st.lastAmount)} · {fmtDaysAgo(st.daysSinceLast)}
            </span>

            {#if st.everyDays != null}
              <span class="skl-sub">{fmtEvery(st.everyDays)} · {st.count}{t('siklus_times')}</span>
            {/if}

            {#if st.deviationDays != null && st.deviationDays !== 0}
              <span class="skl-note">
                {st.deviationDays < 0 ? fmtFaster(-st.deviationDays) : fmtSlower(st.deviationDays)}
              </span>
            {/if}
          </button>
        {/each}
      </div>
    {:else}
      <div class="empty">
        {store.siklus.length ? t('siklus_empty_tagged') : t('empty_siklus')}
      </div>
    {/if}
  {/if}
</main>
