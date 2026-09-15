<script lang="ts">
  import { fmt } from './format'
  import { t } from './i18n.svelte'
  import type { TxType } from './db'

  /** Expense/income toggle + amount readout + numeric keypad.
   *  Shared by the transaction input screen and the shortcut form. */
  let {
    type,
    amount = $bindable(0),
    onTypePick,
  }: { type: TxType; amount: number; onTypePick: (t: TxType) => void } = $props()

  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'clear']

  // swallow near-instant duplicate presses (<50ms) — ghost clicks on mobile —
  // while still allowing intentional fast repeats (human floor is ~80ms)
  let lastK = ''
  let lastT = 0

  function press(k: string): void {
    const now = Date.now()
    if (k === lastK && now - lastT < 50) return
    lastK = k
    lastT = now
    if (k === 'del') amount = Math.floor(amount / 10)
    else if (k === 'clear') amount = 0
    else if (String(amount).length < 12) amount = amount * 10 + parseInt(k, 10)
  }
</script>

<div class="seg">
  <button
    class:active={type === 'expense'}
    class:exp={type === 'expense'}
    onclick={() => onTypePick('expense')}>{t('expense')}</button>
  <button
    class:active={type === 'income'}
    class:incseg={type === 'income'}
    onclick={() => onTypePick('income')}>{t('income')}</button>
</div>

<div class="amt-display">{fmt(amount)}</div>

<div class="keypad">
  {#each KEYS as k (k)}
    <button type="button" class:kdel={k === 'del'} class:kclr={k === 'clear'}
      onclick={() => press(k)}>
      {k === 'del' ? '⌫' : k === 'clear' ? 'C' : k}
    </button>
  {/each}
</div>
