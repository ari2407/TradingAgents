import Papa from 'papaparse';
import type { Account, Strategy, Trade } from './types';
import { db } from './db';
import { now, uid } from './format';
import { friendlyError, tradeSchema } from './schemas';

export const CSV_HEADERS = ['id', 'account', 'currency', 'symbol', 'market', 'direction', 'openedAt', 'closedAt', 'entryPrice', 'exitPrice', 'quantity', 'stopLoss', 'takeProfit', 'fees', 'multiplier', 'leverage', 'strategy', 'tags', 'emotion', 'setupNotes', 'exitNotes', 'lessons', 'rating', 'checklist'];
const required = ['symbol', 'market', 'direction', 'openedAt', 'entryPrice', 'quantity'];
export function tradesToCsv(trades: Trade[], account: Account, strategies: Strategy[]) {
  const rows = trades.map(t => ({
    id: t.id, account: account.name, currency: account.currency, symbol: t.symbol, market: t.market, direction: t.direction,
    openedAt: t.openedAt, closedAt: t.closedAt ?? '', entryPrice: t.entryPrice, exitPrice: t.exitPrice ?? '', quantity: t.quantity,
    stopLoss: t.stopLoss ?? '', takeProfit: t.takeProfit ?? '', fees: t.fees, multiplier: t.multiplier, leverage: t.leverage,
    strategy: strategies.find(s => s.id === t.strategyId)?.name ?? '', tags: t.tags.join('|'), emotion: t.emotion,
    setupNotes: t.setupNotes, exitNotes: t.exitNotes, lessons: t.lessons, rating: t.rating, checklist: JSON.stringify(t.checklist),
  }));
  return '\uFEFF' + Papa.unparse({ fields: CSV_HEADERS, data: rows.map(r => Object.values(r)) }, { escapeFormulae: true, newline: '\r\n' });
}
export interface CsvPreview { trades: Trade[]; strategies: Strategy[]; errors: string[]; skipped: number; total: number }
function csvDate(value: string | undefined, requiredDate = false): string | undefined {
  if (!value?.trim()) { if (requiredDate) throw new Error('Tanggal masuk wajib diisi.'); return undefined; }
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T00:00:00' : value.trim().replace(' ', 'T');
  const d = new Date(normalized); if (Number.isNaN(d.getTime())) throw new Error(`Tanggal tidak valid: ${value}`); return d.toISOString();
}
function csvNumber(value: string | undefined, fallback?: number): number | undefined {
  if (!value?.trim()) return fallback;
  const n = Number(value.trim()); if (!Number.isFinite(n)) throw new Error(`Angka tidak valid: ${value}. Gunakan titik untuk desimal.`); return n;
}
export async function prepareCsv(text: string, account: Account): Promise<CsvPreview> {
  if (new Blob([text]).size > 10 * 1024 * 1024) throw new Error('CSV maksimal 10 MB. Pecah menjadi beberapa file.');
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.trim(), transform: v => v.trim() });
  const headers = parsed.meta.fields ?? [];
  const missing = required.filter(h => !headers.includes(h));
  if (missing.length) throw new Error(`Kolom wajib belum ada: ${missing.join(', ')}. Unduh template untuk melihat format.`);
  if (parsed.data.length > 10000) throw new Error('Maksimal 10.000 baris per impor.');
  const errors = parsed.errors.slice(0, 10).map(e => `Baris ${(e.row ?? 0) + 2}: ${e.message}`);
  const existing = await db.trades.toArray(); const existingIds = new Set(existing.map(t => t.id));
  const existingStrategies = await db.strategies.toArray(); const strategyMap = new Map(existingStrategies.map(s => [s.name.toLocaleLowerCase('id'), s]));
  const newStrategies: Strategy[] = []; const trades: Trade[] = []; let skipped = 0;
  parsed.data.forEach((row, index) => {
    const line = index + 2;
    if (row.id && existingIds.has(row.id)) { skipped++; return; }
    try {
      if (row.account && row.account !== account.name) throw new Error(`Akun "${row.account}" berbeda dari akun tujuan "${account.name}". Impor satu akun sekaligus.`);
      if (row.currency && row.currency !== account.currency) throw new Error('Mata uang CSV berbeda dari akun tujuan. Tidak ada konversi otomatis.');
      let strategyId: string | undefined;
      if (row.strategy) {
        const key = row.strategy.toLocaleLowerCase('id'); let strategy = strategyMap.get(key);
        if (!strategy) { strategy = { id: uid(), name: row.strategy, description: 'Dibuat saat impor CSV.', timeframe: '', rules: [], riskNotes: '', archived: false, isExample: false, createdAt: now() }; strategyMap.set(key, strategy); newStrategies.push(strategy); }
        strategyId = strategy.id;
      }
      let checklist: unknown = [];
      if (row.checklist) { try { checklist = JSON.parse(row.checklist); } catch { throw new Error('Checklist harus berupa JSON yang valid atau dikosongkan.'); } }
      const timestamp = now();
      const trade = tradeSchema.parse({
        id: row.id || uid(), accountId: account.id, strategyId,
        symbol: row.symbol, market: row.market, direction: row.direction,
        openedAt: csvDate(row.openedAt, true), closedAt: csvDate(row.closedAt),
        entryPrice: csvNumber(row.entryPrice), exitPrice: csvNumber(row.exitPrice), quantity: csvNumber(row.quantity),
        stopLoss: csvNumber(row.stopLoss), takeProfit: csvNumber(row.takeProfit), fees: csvNumber(row.fees, 0),
        multiplier: csvNumber(row.multiplier, account.contractMultiplier), leverage: csvNumber(row.leverage, 1),
        tags: row.tags ? row.tags.split('|').map(t => t.trim()).filter(Boolean) : [], emotion: row.emotion || '',
        setupNotes: row.setupNotes || '', exitNotes: row.exitNotes || '', lessons: row.lessons || '',
        rating: csvNumber(row.rating, 0), checklist, attachmentIds: [], createdAt: timestamp, updatedAt: timestamp,
      });
      existingIds.add(trade.id); trades.push(trade);
    } catch (error) {
      errors.push(`Baris ${line}: ${friendlyError(error)}`);
    }
  });
  return { trades, strategies: newStrategies, errors, skipped, total: parsed.data.length };
}
export async function importCsv(preview: CsvPreview) {
  if (preview.errors.length) throw new Error('Perbaiki semua kesalahan CSV sebelum mengimpor.');
  return db.transaction('rw', [db.trades, db.strategies], async () => {
    const ids = new Set((await db.trades.toCollection().primaryKeys()).map(String));
    const fresh = preview.trades.filter(t => !ids.has(t.id));
    const strategyIds = new Set(await db.strategies.toCollection().primaryKeys());
    await db.strategies.bulkAdd(preview.strategies.filter(s => !strategyIds.has(s.id)));
    await db.trades.bulkAdd(fresh); return fresh.length;
  });
}
