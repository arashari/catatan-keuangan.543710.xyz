<script lang="ts">
  import { db, type Category, type CatType, type Template } from '../lib/db'
  import { fmt } from '../lib/format'
  import { t, i18n, setLang } from '../lib/i18n.svelte'
  import { reloadAll, store, type SettingsPage } from '../lib/store.svelte'
  import { showToast } from '../lib/toast.svelte'

  const MENU: Array<{ go: SettingsPage; label: string }> = [
    { go: 'ekspor', label: 'export_import' },
    { go: 'pintasan', label: 'pintasan' },
    { go: 'kategori', label: 'category' },
    { go: 'tentang', label: 'about' },
  ]

  // ---- pintasan ----
  let showTplForm = $state(false)
  let tplEditId = $state<string | null>(null)
  let tplName = $state('')
  let tplAmount = $state(0)
  let tplCat = $state('c_lain')

  function openTplForm(tpl?: Template): void {
    if (tpl) {
      tplEditId = tpl.id
      tplName = tpl.name
      tplAmount = tpl.amount
      tplCat = tpl.catId
    } else {
      const fallback = store.categories.find((c) => c.id === 'c_lain') ?? store.categories[0]
      tplEditId = null
      tplName = ''
      tplAmount = 0
      tplCat = fallback?.id ?? ''
    }
    showTplForm = true
  }

  async function saveTpl(): Promise<void> {
    if (!tplName.trim() || tplAmount <= 0 || !tplCat) return
    await db.templates.put({
      id: tplEditId ?? 't' + Date.now(),
      name: tplName.trim(),
      amount: tplAmount,
      catId: tplCat,
      order: tplEditId
        ? store.templates.find((x) => x.id === tplEditId)?.order ?? store.templates.length
        : store.templates.length,
    })
    await reloadAll()
    showTplForm = false
    showToast('✓ ' + t(tplEditId ? 'tpl_updated' : 'tpl_created'))
  }

  async function delTpl(id: string): Promise<void> {
    if (!confirm(t('tpl_delete'))) return
    await db.templates.delete(id)
    await reloadAll()
    showToast('✓ ' + t('tpl_deleted'))
  }

  function tplCatName(catId: string): string {
    return store.categories.find((c) => c.id === catId)?.name ?? '-'
  }
  function tplCatEmoji(catId: string): string {
    return store.categories.find((c) => c.id === catId)?.emoji ?? '📦'
  }

  // ---- pintasan reorder (drag & drop) ----
  let dragIdxT: number | null = $state(null)
  let overIdxT: number | null = $state(null)

  async function persistTplOrder(list: Template[]): Promise<void> {
    await db.templates.bulkPut(list.map((x, i) => ({ ...x, order: i })))
    await reloadAll()
  }

  function onDropT(target: number): void {
    if (dragIdxT === null || dragIdxT === target) return
    const list = [...store.templates]
    const [moved] = list.splice(dragIdxT, 1)
    list.splice(target, 0, moved)
    dragIdxT = null
    overIdxT = null
    void persistTplOrder(list)
  }

  // ---- kategori (drag & drop) ----
  const EMOJI_PALETTE = ['🍜', '🚌', '🛒', '🧾', '🎮', '💊', '💼', '🏠', '📚', '🎁', '☕', '⛽', '📱', '🐾', '✈️', '📦']

  let dragIdx: number | null = $state(null)
  let overIdx: number | null = $state(null)
  let showCatForm = $state(false)
  let catEditId = $state<string | null>(null)
  let catName_ = $state('')
  let catEmoji = $state('📦')
  let catType = $state<CatType>('expense')

  function openCatForm(c?: Category): void {
    if (c) {
      catEditId = c.id
      catName_ = c.name
      catEmoji = c.emoji
      catType = c.type
    } else {
      catEditId = null
      catName_ = ''
      catEmoji = '📦'
      catType = 'expense'
    }
    showCatForm = true
  }

  async function saveCat(): Promise<void> {
    if (!catName_.trim()) return
    const existing = catEditId ? store.categories.find((c) => c.id === catEditId) : undefined
    await db.categories.put({
      id: catEditId ?? 'k' + Date.now(),
      name: catName_.trim(),
      emoji: catEmoji.trim() || '📦', // fallback if user cleared the field
      type: catType,
      order: existing?.order ?? store.categories.length,
    })
    await reloadAll()
    showCatForm = false
    showToast('✓ ' + t(catEditId ? 'cat_updated' : 'cat_created'))
  }

  async function persistOrder(list: Category[]): Promise<void> {
    await db.categories.bulkPut(list.map((c, i) => ({ ...c, order: i })))
    await reloadAll()
  }

  function onDrop(target: number): void {
    if (dragIdx === null || dragIdx === target) return
    const list = [...store.categories]
    const [moved] = list.splice(dragIdx, 1)
    list.splice(target, 0, moved)
    dragIdx = null
    overIdx = null
    void persistOrder(list)
  }

  async function delCat(id: string): Promise<void> {
    if (store.categories.length <= 1) { alert(t('cat_min_one')); return }
    if (!confirm(t('cat_delete'))) return
    await db.categories.delete(id)
    await reloadAll()
    await persistOrder(store.categories) // renumber after delete
    showToast('✓ ' + t('cat_deleted'))
  }

  // ---- ekspor / impor ----
  function download(filename: string, mime: string, content: string): void {
    const url = URL.createObjectURL(new Blob([content], { type: mime }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function csvQuote(v: string): string {
    return /[",\n]/.test(v) ? '"' + v.replaceAll('"', '""') + '"' : v
  }

  function exportCsv(): void {
    const head = ['id', 'type', 'amount', 'category', 'note', 'datetime']
    const lines = [head.join(',')]
    for (const x of store.transactions) {
      lines.push([
        String(x.id),
        x.type,
        String(x.amount),
        csvQuote(tplCatName(x.catId)),
        csvQuote(x.note),
        new Date(x.ts).toISOString(),
      ].join(','))
    }
    download('catatan-keuangan.csv', 'text/csv;charset=utf-8', lines.join('\n'))
  }

  function exportJson(): void {
    const data = {
      exportedAt: new Date().toISOString(),
      categories: store.categories,
      templates: store.templates,
      transactions: store.transactions,
    }
    download('catatan-keuangan.json', 'application/json', JSON.stringify(data, null, 2))
  }

  async function importJson(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = '' // allow re-selecting the same file
    if (!file) return
    if (!confirm(t('import_confirm'))) return
    let data: { categories?: Category[]; templates?: unknown[]; transactions?: unknown[] }
    try {
      data = JSON.parse(await file.text())
    } catch {
      alert('JSON tidak valid')
      return
    }
    if (!Array.isArray(data.transactions)) { alert('JSON tidak valid'); return }
    await db.transaction('rw', db.categories, db.templates, db.transactions, async () => {
      await Promise.all([db.categories.clear(), db.templates.clear(), db.transactions.clear()])
      if (data.categories) await db.categories.bulkPut(data.categories)
      if (data.templates) await db.templates.bulkPut(data.templates as never[])
      await db.transactions.bulkPut(data.transactions as never[])
    })
    await reloadAll()
  }

  function go(page: SettingsPage): void {
    store.settingsPage = page
    showTplForm = false
    showCatForm = false
  }
</script>

<main class="screen">
  {#if store.settingsPage === 'index'}
    <h1>{t('settings')}</h1>
    <div class="menu">
      {#each MENU as m (m.go)}
        <button class="action" onclick={() => go(m.go)}>
          <span class="txt">{t(m.label)}</span><span class="chev">›</span>
        </button>
      {/each}
    </div>

    <div class="label" style="margin-top:36px">{t('lang')}</div>
    <div class="lang-seg" style="margin-top:10px" class:right={i18n.lang === 'en'}>
      <span class="thumb"></span>
      <button class:active={i18n.lang === 'id'} onclick={() => setLang('id')}>🇮🇩 Indonesia</button>
      <button class:active={i18n.lang === 'en'} onclick={() => setLang('en')}>🇬🇧 English</button>
    </div>
  {:else}
    <div class="subhead">
      <button class="subback" onclick={() => go('index')}>‹</button>
      <h1>
        {#if store.settingsPage === 'pintasan'}{t('pintasan')}
        {:else if store.settingsPage === 'kategori'}{t('category')}
        {:else if store.settingsPage === 'ekspor'}{t('export_import')}
        {:else}{t('about')}{/if}
      </h1>
    </div>
  {/if}

  {#if store.settingsPage === 'pintasan'}
    {#if showTplForm}
      <div class="form-card">
        <div class="form-title">{tplEditId ? t('edit') : '+ ' + t('add_pintasan')}</div>
        <div class="label">{t('name')}</div>
        <input class="f-input" type="text" maxlength="40" bind:value={tplName} placeholder={t('name')} />

        <div class="label">{t('amount')}</div>
        <input class="f-input" type="number" inputmode="numeric" min="0" bind:value={tplAmount} />

        <div class="label">{t('category')}</div>
        <select class="f-input" bind:value={tplCat}>
          {#each store.categories as c (c.id)}
            <option value={c.id}>{c.emoji} {c.name}</option>
          {/each}
        </select>

        <div class="form-actions">
          <button class="btn ghost" onclick={() => (showTplForm = false)}>{t('cancel')}</button>
          <button class="btn slim" disabled={!tplName.trim() || tplAmount <= 0 || !tplCat} onclick={saveTpl}>
            {t('save')}
          </button>
        </div>
        <div class="preview muted small">
          {tplCatEmoji(tplCat)} <b>{tplName || '…'}</b> · {fmt(tplAmount)}
        </div>
      </div>
    {/if}

    <p class="muted small hint-drag">⠿ = {i18n.lang === 'id' ? 'seret untuk mengurutkan' : 'drag to reorder'}</p>
    <div class="list">
      {#each store.templates as tpl, idx (tpl.id)}
        <div
          class="item tpl-row"
          class:dragging={dragIdxT === idx}
          class:over={overIdxT === idx}
          draggable="true"
          role="listitem"
          ondragstart={(e: DragEvent) => { dragIdxT = idx; e.dataTransfer?.setData('text/plain', String(idx)) }}
          ondragend={() => { dragIdxT = null; overIdxT = null }}
          ondragover={(e: DragEvent) => { e.preventDefault(); overIdxT = idx }}
          ondrop={(e: DragEvent) => { e.preventDefault(); onDropT(idx) }}
        >
          <span class="grip">⠿</span>
          <span class="ico">{tplCatEmoji(tpl.catId)}</span>
          <span class="meta">
            <span class="n">{tpl.name}</span>
            <span class="c">{tplCatName(tpl.catId)} · {fmt(tpl.amount)}</span>
          </span>
          <button class="row-btn" title={t('edit')} onclick={() => openTplForm(tpl)}>✏️</button>
          <button class="row-btn" onclick={() => delTpl(tpl.id)}>🗑️</button>
        </div>
      {:else}
        <div class="empty">{t('empty_tpl_type')}</div>
      {/each}
    </div>
    {#if !showTplForm}
      <button class="btn ghost" onclick={() => openTplForm()}>+ {t('add_pintasan')}</button>
    {/if}
  {:else if store.settingsPage === 'kategori'}
    {#if showCatForm}
      <div class="form-card">
        <div class="form-title">{catEditId ? t('edit') : '+ ' + t('add_category')}</div>
        <div class="label">{t('name')}</div>
        <input class="f-input" type="text" maxlength="30" bind:value={catName_} placeholder={t('name')} />

        <div class="label">{t('icon')}</div>
        <input
          class="f-input emoji-input"
          type="text"
          maxlength="8"
          bind:value={catEmoji}
          placeholder="😀"
        />
        <p class="muted small" style="margin:6px 0 0">{t('icon_hint')}</p>
        <div class="palette">
          {#each EMOJI_PALETTE as em (em)}
            <button class="pal" class:picked={catEmoji === em} onclick={() => (catEmoji = em)}>{em}</button>
          {/each}
        </div>

        <div class="label">{t('category')}</div>
        <div class="seg">
          <button class:active={catType === 'expense'} class:exp={catType === 'expense'}
            onclick={() => (catType = 'expense')}>{t('expense')}</button>
          <button class:active={catType === 'income'} class:incseg={catType === 'income'}
            onclick={() => (catType = 'income')}>{t('income')}</button>
        </div>

        <div class="form-actions">
          <button class="btn ghost" onclick={() => (showCatForm = false)}>{t('cancel')}</button>
          <button class="btn slim" disabled={!catName_.trim()} onclick={saveCat}>{t('save')}</button>
        </div>
        <div class="preview muted small">{catEmoji} <b>{catName_ || '…'}</b></div>
      </div>
    {/if}

    <p class="muted small hint-drag">⠿ = {i18n.lang === 'id' ? 'seret untuk mengurutkan' : 'drag to reorder'}</p>
    <div class="list">
      {#each store.categories as c, idx (c.id)}
        <div
          class="item cat-row"
          class:dragging={dragIdx === idx}
          class:over={overIdx === idx}
          draggable="true"
          role="listitem"
          ondragstart={(e: DragEvent) => { dragIdx = idx; e.dataTransfer?.setData('text/plain', String(idx)) }}
          ondragend={() => { dragIdx = null; overIdx = null }}
          ondragover={(e: DragEvent) => { e.preventDefault(); overIdx = idx }}
          ondrop={(e: DragEvent) => { e.preventDefault(); onDrop(idx) }}
        >
          <span class="grip">⠿</span>
          <span class="ico">{c.emoji}</span>
          <span class="meta">
            <span class="n">{c.name}</span>
            <span class="c">{c.type === 'income' ? t('income') : t('expense')}</span>
          </span>
          <button class="row-btn" title={t('edit')} onclick={() => openCatForm(c)}>✏️</button>
          <button class="row-btn" onclick={() => delCat(c.id)}>🗑️</button>
        </div>
      {/each}
    </div>
    {#if !showCatForm}
      <button class="btn ghost" onclick={() => openCatForm()}>+ {t('add_category')}</button>
    {/if}
  {:else if store.settingsPage === 'ekspor'}
    <div class="menu">
      <button class="action" onclick={exportCsv}><span class="txt">{t('export_csv')}</span><span class="chev">↓</span></button>
      <button class="action" onclick={exportJson}><span class="txt">{t('export_json')}</span><span class="chev">↓</span></button>
      <label class="action file-action">
        <span class="txt">{t('import_json')}</span><span class="chev">↑</span>
        <input type="file" accept=".json,application/json" onchange={importJson} />
      </label>
    </div>
  {:else if store.settingsPage === 'tentang'}
    <p class="muted about-text">{t('about_text')}</p>
    <p class="muted about-text ver">v{__APP_COMMIT__}</p>
  {/if}
</main>
