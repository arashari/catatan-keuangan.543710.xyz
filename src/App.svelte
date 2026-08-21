<script lang="ts">
  import { onMount } from 'svelte'
  import Home from './screens/Home.svelte'
  import Transaksi from './screens/Transaksi.svelte'
  import Laporan from './screens/Laporan.svelte'
  import Pengaturan from './screens/Pengaturan.svelte'
  import InputScreen from './screens/InputScreen.svelte'
  import { initApp, store, type Screen } from './lib/store.svelte'
  import { t } from './lib/i18n.svelte'
  import { applyTheme, initialTheme } from './lib/theme'

  applyTheme(initialTheme())
  onMount(() => { void initApp() })

  const NAV: Array<{ id: Screen; icon: string; label: string }> = [
    { id: 'home', icon: '🏠', label: 'nav_home' },
    { id: 'trans', icon: '📋', label: 'nav_trans' },
    { id: 'report', icon: '📊', label: 'nav_report' },
    { id: 'data', icon: '⚙️', label: 'nav_settings' },
  ]
</script>

{#if store.ready}
  <div class="app" class:nav-hidden={store.inputOpen}>
    {#if store.screen === 'home'}
      <Home />
    {:else if store.screen === 'trans'}
      <Transaksi />
    {:else if store.screen === 'report'}
      <Laporan />
    {:else}
      <Pengaturan />
    {/if}

    <nav class="bottomnav">
      {#each NAV as n (n.id)}
        <button class:active={store.screen === n.id} onclick={() => (store.screen = n.id)}>
          <span class="ic">{n.icon}</span><span>{t(n.label)}</span>
        </button>
      {/each}
    </nav>
  </div>

  {#if store.inputOpen}
    <div class="overlay">
      <InputScreen />
    </div>
  {/if}
{:else}
  <main class="screen center"><p class="muted">…</p></main>
{/if}
