<script lang="ts">
  import { fmt, fmtDate, toDateInput } from '../lib/format'
  import { t } from '../lib/i18n.svelte'
  import { store, cancelInput, pressKey, saveInput, setType as setInputType, deleteCurrentTx } from '../lib/store.svelte'

  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'clear']

  const visibleCats = $derived(
    store.categories.filter((c) => c.type === store.inputType),
  )

  let datepick: HTMLInputElement | undefined = $state()

  function openDatePicker(): void {
    if (!datepick) return
    datepick.value = toDateInput(store.inputDate.getTime())
    try { datepick.showPicker() } catch { datepick.click() }
  }

  function onPickDate(e: Event): void {
    const v = (e.target as HTMLInputElement).value
    if (v) store.inputDate = new Date(v + 'T12:00:00')
  }

  async function onSave(): Promise<void> {
    await saveInput()
  }
</script>

<div class="screen input-screen">
  <div class="subhead">
    <button class="subback" onclick={cancelInput}>‹</button>
    <h1>{store.editingId != null ? t('edit') : t('add')}</h1>
  </div>

  <div class="seg">
    <button
      class:active={store.inputType === 'expense'}
      class:exp={store.inputType === 'expense'}
      onclick={() => setInputType('expense')}>{t('expense')}</button>
    <button
      class:active={store.inputType === 'income'}
      class:incseg={store.inputType === 'income'}
      onclick={() => setInputType('income')}>{t('income')}</button>
  </div>

  <div class="amt-display">{fmt(store.inputAmount)}</div>

  <div class="keypad">
    {#each KEYS as k (k)}
      <button type="button" class:kdel={k === 'del'} class:kclr={k === 'clear'}
        onclick={() => pressKey(k)}>
        {k === 'del' ? '⌫' : k === 'clear' ? 'C' : k}
      </button>
    {/each}
  </div>

  <div class="meta-line">
    <span>{t('date')}</span>
    <button type="button" class="date-pick" onclick={openDatePicker}>
      <span>📅</span>
      <b>{fmtDate(store.inputDate)}</b>
      <input
        bind:this={datepick}
        type="date"
        tabindex="-1"
        aria-hidden="true"
        value={toDateInput(store.inputDate.getTime())}
        onchange={onPickDate}
      />
    </button>
  </div>

  <div class="label">{t('category')}</div>
  <div class="catrow">
    {#each visibleCats as c (c.id)}
      <button class="cat" class:active={store.inputCat === c.id} onclick={() => (store.inputCat = c.id)}>
        <span class="ico">{c.emoji}</span>
        <span class="nm">{c.name}</span>
      </button>
    {/each}
  </div>

  <input class="note" type="text" placeholder={t('note_placeholder')} bind:value={store.inputNote} />

  <button class="btn" onclick={onSave}>{t('save')}</button>

  {#if store.editingId != null}
    <button class="btn ghost danger" onclick={() => store.editingId != null && deleteCurrentTx()}>
      {t('delete_tx')}
    </button>
    <div class="muted hint" onclick={cancelInput} role="button" tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && cancelInput()}>
      {t('editing_hint')}
    </div>
  {/if}
</div>
