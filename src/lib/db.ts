import Dexie, { type Table } from 'dexie';
import type { Account, Trade, Strategy, JournalNote, Attachment, Settings, Draft, BackupData } from './types';
import { now, uid } from './format';

export class JournalDatabase extends Dexie {
  accounts!: Table<Account, string>; trades!: Table<Trade, string>; strategies!: Table<Strategy, string>;
  notes!: Table<JournalNote, string>; attachments!: Table<Attachment, string>;
  settings!: Table<Settings, string>; drafts!: Table<Draft, string>;
  constructor(name = 'tradingagents-journal-v1') {
    super(name);
    this.version(1).stores({
      accounts: 'id, name, archived', trades: 'id, accountId, openedAt, closedAt, strategyId, symbol, [accountId+closedAt]',
      strategies: 'id, name, archived', notes: 'id, accountId, date, [accountId+kind+date]',
      attachments: 'id', settings: 'id', drafts: 'id',
    });
  }
}
export const db = new JournalDatabase();
export function defaultData(): BackupData {
  const createdAt = now(); const accountId = uid();
  return {
    accounts: [{ id: accountId, name: 'Akun utama', broker: '', currency: 'IDR', initialBalance: 0, defaultFee: 0, contractMultiplier: 1, riskLimitPercent: 1, dailyLossLimit: 0, archived: false, createdAt }],
    strategies: [
      { id: uid(), name: 'Trend following', description: 'Contoh rencana: ikuti arah tren, tunggu pullback, dan masuk hanya setelah ada konfirmasi. Sesuaikan dengan gaya Anda.', timeframe: 'H1 / H4', rules: ['Tren di timeframe besar jelas', 'Harga pullback ke area rencana', 'Ada konfirmasi entry', 'Stop loss dan target sudah ditentukan'], riskNotes: 'Risiko per trade maksimal 1% dari modal. Lewati setup jika rasio reward/risk di bawah 2.', archived: false, isExample: true, createdAt },
      { id: uid(), name: 'Breakout', description: 'Contoh rencana untuk breakout level kunci. Bukan sinyal beli atau jual; ubah aturan sesuai hasil pengujian Anda.', timeframe: 'M15 / H1', rules: ['Level support/resistance sudah ditandai', 'Breakout didukung volume', 'Entry tidak mengejar harga', 'Rencana keluar sudah jelas'], riskNotes: 'Hindari entry saat spread melebar. Jangan menambah posisi untuk membalas kerugian.', archived: false, isExample: true, createdAt },
    ],
    trades: [], notes: [], attachments: [],
    settings: { id: 'preferences', displayName: '', activeAccountId: accountId, theme: 'light', defaultRiskPercent: 1, hideBalances: false },
  };
}
let initialization: Promise<void> | undefined;
export function initializeDatabase() {
  if (!initialization) initialization = db.transaction('rw', [db.accounts, db.strategies, db.settings], async () => {
    if (await db.accounts.count()) {
      const prefs = await db.settings.get('preferences');
      if (!prefs) { const first = await db.accounts.filter(a => !a.archived).first(); if (first) await db.settings.put({ ...defaultData().settings, activeAccountId: first.id }); }
      return;
    }
    const data = defaultData(); await db.accounts.bulkAdd(data.accounts); await db.strategies.bulkAdd(data.strategies); await db.settings.put(data.settings);
  }).catch(error => { initialization = undefined; throw error; });
  return initialization;
}
export async function saveTrade(trade: Trade, attachments: Attachment[]) {
  await db.transaction('rw', [db.trades, db.attachments], async () => {
    const old = await db.trades.get(trade.id);
    if (old) { const removed = old.attachmentIds.filter(id => !trade.attachmentIds.includes(id)); await db.attachments.bulkDelete(removed); }
    await db.attachments.bulkPut(attachments); await db.trades.put(trade);
  });
}
export async function deleteTrade(id: string) {
  await db.transaction('rw', [db.trades, db.attachments], async () => { const t = await db.trades.get(id); if (t) await db.attachments.bulkDelete(t.attachmentIds); await db.trades.delete(id); });
}
export async function deleteAccount(id: string) {
  await db.transaction('rw', [db.accounts, db.trades, db.notes, db.settings], async () => {
    if (await db.trades.where('accountId').equals(id).count() || await db.notes.where('accountId').equals(id).count()) throw new Error('Akun masih memiliki trade atau jurnal. Arsipkan akun agar riwayatnya tetap aman.');
    if (await db.accounts.filter(a => !a.archived && a.id !== id).count() === 0) throw new Error('Pertahankan setidaknya satu akun aktif.');
    await db.accounts.delete(id); const prefs = await db.settings.get('preferences');
    if (prefs?.activeAccountId === id) { const next = await db.accounts.filter(a => !a.archived).first(); if (next) await db.settings.put({ ...prefs, activeAccountId: next.id }); }
  });
}
export async function replaceAllData(data: BackupData) {
  await db.transaction('rw', [db.accounts, db.strategies, db.trades, db.notes, db.attachments, db.settings, db.drafts], async () => {
    await Promise.all([db.accounts.clear(), db.strategies.clear(), db.trades.clear(), db.notes.clear(), db.attachments.clear(), db.settings.clear(), db.drafts.clear()]);
    await db.accounts.bulkAdd(data.accounts); await db.strategies.bulkAdd(data.strategies); await db.trades.bulkAdd(data.trades);
    await db.notes.bulkAdd(data.notes); await db.attachments.bulkAdd(data.attachments); await db.settings.put(data.settings);
  });
}
export async function resetAllData() { await replaceAllData(defaultData()); }
export async function saveNote(note: JournalNote) {
  await db.transaction('rw', db.notes, async () => {
    const existing = await db.notes.where('[accountId+kind+date]').equals([note.accountId, note.kind, note.date]).first();
    await db.notes.put(existing ? { ...note, id: existing.id, createdAt: existing.createdAt } : note);
  });
}
