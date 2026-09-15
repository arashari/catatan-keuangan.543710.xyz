# Catatan Keuangan

A local-first PWA for tracking daily income and expenses — one tap to record, a
clear per-day and per-period view, no accounts and no server.

**Live:** <https://catatan-keuangan.543710.xyz>

All data lives in the browser (IndexedDB). Nothing is uploaded anywhere; exports
and imports are plain files you control.

## Features

- **Beranda (Home)** — running balance with income/expense totals, one-tap
  shortcuts (*pintasan*) that record a routine expense instantly, and the most
  recent transactions. Light/dark toggle.
- **Transaksi** — transactions grouped by day. Move between days with the
  arrows, a date picker, or a horizontal swipe. Each day shows its own in/out
  totals. Tap any entry to edit it; the `+` button adds a new one.
- **Laporan (Report)** — configurable **cut-off date** (a "month" can run from
  the 25th to the 24th, like a payroll period). Navigate periods by month or
  year, see balance/in/out, an expense bar chart by category, and a calendar
  with per-day amounts plus the emoji of every siklus tagged that day.
- **Siklus** — its own tab. Track purchases whose *last* date is worth knowing
  (galon air, cukur rambut, token listrik). Tag a purchase with a siklus, either
  from the input form or by tapping a shortcut that has one pre-set, and the tab
  shows when it's next expected. See [Siklus](#siklus) below.
- **Input** — expense/income switch, numeric keypad, date, category, optional
  **siklus** tag, optional note, save and delete.
- **Pengaturan (Settings)**
  - Export to **CSV** (spreadsheets) or **JSON** (full backup)
  - Import a JSON backup (replaces all local data)
  - Manage **shortcuts** — add, edit, delete, drag to reorder, optional siklus
  - Manage **categories** — custom emoji, expense/income type, drag to reorder
  - Manage **siklus** — name, emoji, add/edit/delete, drag to reorder
  - Reset data back to defaults
  - Language: **Indonesian / English**

## Tech stack

| Area | Choice |
| --- | --- |
| UI | [Svelte 5](https://svelte.dev/) (runes) + TypeScript |
| Build | [Vite 8](https://vite.dev/) |
| Storage | [Dexie 4](https://dexie.org/) over IndexedDB |
| PWA | [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) (auto-update service worker) |
| Hosting | Cloudflare Workers static assets |

No backend, no runtime dependencies beyond Dexie.

## Project structure

```
src/
  App.svelte              # shell, bottom nav, screen switching, input overlay
  app.css                 # design tokens (light/dark) and all component styles
  main.ts                 # app entry
  lib/
    db.ts                 # Dexie schema, default seed data, migrations, reset
    store.svelte.ts       # global reactive state + all mutations/actions
    i18n.svelte.ts        # id/en dictionaries and `t()`
    format.ts             # currency, date, cut-off period, and duration helpers
    siklus.ts             # pure stats engine for recurring purchases
    theme.ts              # light/dark persistence
    toast.svelte.ts       # transient confirmation toasts
    swipe.ts              # touch swipe action for day/period navigation
  screens/
    Home.svelte           # balance, shortcuts, recent list
    Transaksi.svelte      # per-day transactions
    Laporan.svelte        # periodic report + calendar
    Siklus.svelte         # recurring purchase tracker
    InputScreen.svelte    # add/edit form
    Pengaturan.svelte     # settings, exports, siklus/shortcuts/categories
```

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built output locally |
| `npm run check` | `svelte-check` + `tsc` type checks |

## Data model

Stored in the IndexedDB database `catatan-keuangan` (five tables):

- `categories` — `{ id, name, emoji, type: 'expense' | 'income', order }`
- `templates` — shortcuts: `{ id, name, amount, catId, siklusId?, order }`.
  `siklusId` is the siklus this shortcut pre-tags when tapped.
- `transactions` — `{ id, type, amount, catId, note, ts, created, siklusId? }`.
  `ts` is normalized to **noon of the business day** so ordering within a day is
  decided purely by `created` (the wall-clock time the entry was made).
- `siklus` — `{ id, name, emoji, order }`
- `settings` — key/value, currently just `cutDate`

Default categories and a few shortcuts are seeded on first run. `ensureSeeded()`
in `src/lib/db.ts` also runs one-off migrations (legacy `both` categories,
backfilling `created`, re-normalizing `ts`).

### Schema versioning

The database is at version 2 (version 1 + the `siklus` store). Each version's
`stores()` re-declares **every** store, so an upgrade can never drop one, and no
`.upgrade()` callback touches existing rows. `siklusId` is unindexed, so it
needed no version bump — old rows simply lack the field and read as untagged.
Old JSON backups import fine: a missing `siklus` array just means nothing is
tagged.

## Siklus

For purchases where the *interval* carries information — galon air, cukur
rambut, token listrik — a **siklus** is a tag you put on the transaction. A
siklus is independent of shortcuts: a shortcut may pre-set one, but not every
shortcut is a siklus.

Everything shown is **derived** from tagged transactions, so it can't go stale —
editing or deleting a purchase immediately corrects the estimate. Per siklus the
app computes:

- **Interval** — the *median* gap between purchases (not the mean, which one long
gap would wreck), over the last 6 occurrences. Two purchases on the same day
count as one restock.
- **Next date** — last purchase + interval, plus a countdown or an overdue
  marker.
- **Estimated amount** — the median amount paid.
- **Last-cycle deviation** — the most recent gap vs. the typical one, e.g.
  "siklus terakhir lebih cepat 4 hari". For irregular items like token listrik
  this is the useful signal: it usually lasts N days, so a shorter cycle is a
  nudge to check for extra usage. It needs at least three distinct days to mean
  anything — with a single interval the gap *is* the median.

With only one recorded purchase there is no interval, and the card says so
rather than inventing a date. A siklus with no tagged transactions shows
nowhere. Deleting a siklus untags shortcuts but leaves transactions intact.

Siklus are managed in **Pengaturan → Siklus** (name + emoji, drag to reorder);
the **Siklus** tab is the read-only view of the stats above. The report calendar
marks each day with the emoji of any siklus tagged that day.

## PWA

The build registers a service worker with `autoUpdate`, so installed clients pick
up new versions automatically. The web app manifest declares three **app
shortcuts** that deep-link into the app; the URLs are cleaned after launch so a
reload doesn't re-trigger them:

- `/?action=record&type=expense` — record an expense
- `/?action=record&type=income` — record an income
- `/?screen=report` — open the report

The About screen shows the short git commit hash the bundle was built from
(injected as `__APP_COMMIT__` by `vite.config.ts`).

## Deploy

Static output, deployed to a Cloudflare Worker serving `./dist` as assets with
SPA fallback (see `wrangler.jsonc`). The custom domain is configured in the
route.

```bash
npm run build
npx wrangler deploy
```
