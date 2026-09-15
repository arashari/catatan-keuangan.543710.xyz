<script lang="ts">
  import { t } from './i18n.svelte'
  import type { Category, Siklus, TxType } from './db'

  /** Category chips (filtered by type) + optional siklus tags.
   *  Shared by the transaction input screen and the shortcut form. */
  let {
    type,
    catId = $bindable<string | null>(null),
    siklusId = $bindable<string | null>(null),
    categories,
    siklus,
  }: {
    type: TxType
    catId: string | null
    siklusId: string | null
    categories: Category[]
    siklus: Siklus[]
  } = $props()

  const visibleCats = $derived(categories.filter((c) => c.type === type))
</script>

<div class="label">{t('category')}</div>
<div class="catrow">
  {#each visibleCats as c (c.id)}
    <button class="cat" class:active={catId === c.id} onclick={() => (catId = c.id)}>
      <span class="ico">{c.emoji}</span>
      <span class="nm">{c.name}</span>
    </button>
  {/each}
</div>

{#if siklus.length}
  <div class="label">{t('siklus_field')}</div>
  <div class="stagrow">
    {#each siklus as s (s.id)}
      <button
        class="stag"
        class:active={siklusId === s.id}
        onclick={() => (siklusId = siklusId === s.id ? null : s.id)}>
        {s.emoji} {s.name}
      </button>
    {/each}
  </div>
{/if}
