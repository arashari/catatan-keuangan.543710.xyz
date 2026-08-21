export type Lang = 'id' | 'en'

type Dict = Record<string, string>

const I18N: Record<Lang, Dict> = {
  id: {
    nav_home: 'Beranda', nav_trans: 'Transaksi', nav_report: 'Laporan', nav_settings: 'Pengaturan',
    balance: 'Saldo', in: 'Masuk', out: 'Keluar', pintasan: 'Pintasan', recent: 'Transaksi terbaru',
    add: 'Catat', edit: 'Edit', expense: 'Pengeluaran', income: 'Pemasukan', date: 'Tanggal', category: 'Kategori',
    note_placeholder: 'Catatan (opsional)', save: 'Simpan', delete_tx: 'Hapus transaksi ini', editing_hint: 'Sedang mengedit · tap untuk batal',
    name: 'Nama', amount: 'Nominal', icon: 'Ikon', cancel: 'Batal', both_label: 'Keduanya',
    icon_hint: 'Ketik emoji apa saja, atau pilih di bawah',
    today: 'Kembali ke periode sekarang',
    report: 'Laporan', cut_date_label: 'Tanggal potong', by_category: 'Per kategori', calendar: 'Kalender',
    empty_period: 'Belum ada pengeluaran di periode ini', empty_tx: 'Belum ada transaksi', empty_day: 'Tidak ada transaksi di hari ini',
    empty_tpl_type: 'Tidak ada pintasan untuk tipe ini',
    settings: 'Pengaturan', export_import: 'Ekspor & Impor',
    pintasan_sub: 'Satu tap untuk rutinitas', add_pintasan: 'Tambah pintasan',
    add_category: 'Tambah kategori', about: 'Tentang', about_text: 'PWA · data tersimpan di perangkatmu.',
    other: 'Lainnya', transaction: 'Transaksi', type_both: 'pemasukan + pengeluaran', type_income: 'pemasukan', type_expense: 'pengeluaran',
    confirm_delete: 'Hapus transaksi ini?', alert_amount: 'Masukkan nominal dulu', alert_category: 'Pilih kategori dulu',
    prompt_tpl_name: 'Nama pintasan?', prompt_tpl_amount: 'Nominal?', prompt_cat_name: 'Nama kategori?', lang: 'Bahasa',
    cat_min_one: 'Minimal harus ada satu kategori', cat_delete: 'Hapus kategori ini?',
    tpl_delete: 'Hapus pintasan ini?', import_confirm: 'Impor akan mengganti SEMUA data di perangkat ini. Lanjutkan?',
    export_csv: 'Ekspor CSV (Sheet)', export_json: 'Ekspor JSON (backup)', import_json: 'Impor JSON',
  },
  en: {
    nav_home: 'Home', nav_trans: 'Transactions', nav_report: 'Report', nav_settings: 'Settings',
    balance: 'Balance', in: 'In', out: 'Out', pintasan: 'Shortcuts', recent: 'Recent transactions',
    add: 'Add', edit: 'Edit', expense: 'Expense', income: 'Income', date: 'Date', category: 'Category',
    note_placeholder: 'Note (optional)', save: 'Save', delete_tx: 'Delete this transaction', editing_hint: 'Editing · tap to cancel',
    name: 'Name', amount: 'Amount', icon: 'Icon', cancel: 'Cancel', both_label: 'Both',
    icon_hint: 'Type any emoji, or pick one below',
    today: 'Back to current period',
    report: 'Report', cut_date_label: 'Cut-off date', by_category: 'By category', calendar: 'Calendar',
    empty_period: 'No expenses this period', empty_tx: 'No transactions yet', empty_day: 'No transactions this day',
    empty_tpl_type: 'No shortcut for this type',
    settings: 'Settings', export_import: 'Export & Import',
    pintasan_sub: 'One tap for routine', add_pintasan: 'Add shortcut',
    add_category: 'Add category', about: 'About', about_text: 'PWA · data stored on your device.',
    other: 'Other', transaction: 'Transaction', type_both: 'income + expense', type_income: 'income', type_expense: 'expense',
    confirm_delete: 'Delete this transaction?', alert_amount: 'Enter an amount first', alert_category: 'Pick a category first',
    prompt_tpl_name: 'Shortcut name?', prompt_tpl_amount: 'Amount?', prompt_cat_name: 'Category name?', lang: 'Language',
    cat_min_one: 'Keep at least one category', cat_delete: 'Delete this category?',
    tpl_delete: 'Delete this shortcut?', import_confirm: 'Import will REPLACE ALL data on this device. Continue?',
    export_csv: 'Export CSV (Sheet)', export_json: 'Export JSON (backup)', import_json: 'Import JSON',
  },
}

function initial(): Lang {
  try {
    const saved = localStorage.getItem('lang')
    if (saved === 'id' || saved === 'en') return saved
  } catch { /* ignore */ }
  return 'id'
}

export const i18n = $state({ lang: initial() })

export function setLang(l: Lang): void {
  i18n.lang = l
  try { localStorage.setItem('lang', l) } catch { /* ignore */ }
}

export function t(key: string): string {
  return I18N[i18n.lang][key] ?? I18N.id[key] ?? key
}
