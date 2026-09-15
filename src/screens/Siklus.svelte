<script lang="ts">
  import {
    fmt, fmtShort, fmtDate, shortDate,
    fmtDaysAgo, fmtInDays, fmtEvery, fmtLate, fmtFaster, fmtSlower,
  } from '../lib/format'
  import { t } from '../lib/i18n.svelte'
  import { store } from '../lib/store.svelte'
  import { siklusStats } from '../lib/siklus'

  const stats = $derived(siklusStats(store.siklus, store.transactions))

  function manage(): void {
    store.settingsPage = 'siklus'
    store.screen = 'data'
  }
</script>

<main class="screen">
  <h1>{t('siklus')}</h1>
  <p class="muted small">{t('siklus_sub')}</p>

  {#if stats.length}
    <div class="list">
      {#each stats as st (st.siklus.id)}
        <div class="skl" class:due={st.daysLeft != null && st.daysLeft < 0}>
          <div class="skl-top">
            <span class="n">{st.siklus.emoji} {st.siklus.name}</span>
            {#if st.daysLeft != null}
              <span class="pill" class:late={st.daysLeft < 0}>
                {st.daysLeft < 0 ? fmtLate(-st.daysLeft) : fmtInDays(st.daysLeft)}
              </span>
            {/if}
          </div>

          {#if st.nextTs != null}
            <div class="skl-next">
              {t('siklus_next')} {fmtDate(new Date(st.nextTs))} · {t('siklus_est')} {fmtShort(st.estAmount)}
            </div>
          {:else}
            <div class="skl-next muted">{t('siklus_no_est')}</div>
          {/if}

          <div class="skl-sub">
            {t('siklus_last')} {shortDate(st.lastTs)} · {fmt(st.lastAmount)} · {fmtDaysAgo(st.daysSinceLast)}
          </div>

          {#if st.everyDays != null}
            <div class="skl-sub">{fmtEvery(st.everyDays)} · {st.count}{t('siklus_times')}</div>
          {/if}

          {#if st.deviationDays != null && st.deviationDays !== 0}
            <div class="skl-note">
              {st.deviationDays < 0 ? fmtFaster(-st.deviationDays) : fmtSlower(st.deviationDays)}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty">
      {store.siklus.length ? t('siklus_empty_tagged') : t('empty_siklus')}
    </div>
  {/if}

  <button class="btn ghost" onclick={manage}>⚙️ {t('manage_siklus')}</button>
</main>
