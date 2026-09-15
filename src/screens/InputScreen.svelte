<script lang="ts">
  import { fmtDate, toDateInput } from '../lib/format'
  import { t } from '../lib/i18n.svelte'
  import { store, cancelInput, saveInput, setType as setInputType, deleteCurrentTx } from '../lib/store.svelte'
  import AmountPad from '../lib/AmountPad.svelte'
  import CatPicker from '../lib/CatPicker.svelte'

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

  <AmountPad type={store.inputType} bind:amount={store.inputAmount} onTypePick={setInputType} />

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

  <CatPicker
    type={store.inputType}
    bind:catId={store.inputCat}
    bind:siklusId={store.inputSiklusId}
    categories={store.categories}
    siklus={store.siklus}
  />

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
