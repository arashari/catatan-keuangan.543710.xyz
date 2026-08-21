<script lang="ts">
  import { fly } from 'svelte/transition'
  import { getToast } from './toast.svelte'

  const toast = $derived(getToast())
</script>

{#if toast}
  {#key toast.id}
    <div class="toast" transition:fly={{ y: 18, duration: 150 }}>{toast.msg}</div>
  {/key}
{/if}
