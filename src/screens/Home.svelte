<script lang="ts">
  import { fmt, fmtShort, shortDate } from '../lib/format'
  import { t } from '../lib/i18n.svelte'
  import { db, type Template } from '../lib/db'
  import { openFromTemplate, loadTx, store, reloadAll } from '../lib/store.svelte'
  import { initialTheme, toggleTheme, type Theme } from '../lib/theme'

  let theme = $state<Theme>(initialTheme())

  const income = $derived(store.transactions.filter((x) => x.type === 'income').reduce((s, x) => s + x.amount, 0))
  const expense = $derived(store.transactions.filter((x) => x.type === 'expense').reduce((s, x) => s + x.amount, 0))

  function catEmoji(id: string): string {
    return store.categories.find((c) => c.id === id)?.emoji ?? '📦'
  }
  function catName(id: string): string {
    return store.categories.find((c) => c.id === id)?.name ?? '-'
  }

  async function quickAdd(tpl: Template): Promise<void> {
    // one-tap record straight from a shortcut
    const cat = store.categories.find((c) => c.id === tpl.catId)
    const type = cat?.type ?? ('expense' as const)
    await db.transactions.add({
      id: Date.now(),
      type,
      amount: tpl.amount,
      catId: tpl.catId,
      note: tpl.name,
      ts: Date.now(),
    })
    await reloadAll()
  }
</script>

<main class="screen">
  <div class="row head">
    <div>
      <h1>{t('nav_home')}</h1>
      <div class="muted">{t('balance')}</div>
      <div class="balance">{fmt(income - expense)}</div>
      <div class="muted small">
        {t('in')} <b class="inc">{fmt(income)}</b> · {t('out')} <b class="exp">{fmt(expense)}</b>
      </div>
    </div>
    <button class="theme" title="Mode gelap / terang" onclick={() => (theme = toggleTheme(theme))}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  </div>

  <section>
    <div class="label">{t('pintasan')}</div>
    <div class="chips">
      {#each store.templates as tpl (tpl.id)}
        <button class="chip" onclick={() => openFromTemplate(tpl, 'home')}>
          <span>{catEmoji(tpl.catId)}</span>
          <span>{tpl.name}</span>
          <span class="amt">{fmtShort(tpl.amount)}</span>
        </button>
      {:else}
        <span class="empty">{t('empty_tpl_type')}</span>
      {/each}
    </div>
  </section>

  <section>
    <div class="label">{t('recent')}</div>
    <div class="list">
      {#each store.transactions.slice(0, 8) as tx (tx.id)}
        <button class="tx" onclick={() => loadTx(tx, 'home')}>
          <span class="ico">{catEmoji(tx.catId)}</span>
          <span class="meta">
            <span class="n">{tx.note || catName(tx.catId)}</span>
            <span class="c">{catName(tx.catId)} · {shortDate(tx.ts)}</span>
          </span>
          <span class="v" class:exp={tx.type === 'expense'} class:inc={tx.type !== 'expense'}>
            {tx.type === 'expense' ? '-' : '+'}{fmt(tx.amount)}
          </span>
        </button>
      {:else}
        <div class="empty">{t('empty_tx')}</div>
      {/each}
    </div>
  </section>
</main>
