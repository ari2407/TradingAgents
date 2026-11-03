import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import Papa from 'papaparse';
import { db, defaultData, replaceAllData } from './db';
import { CSV_HEADERS, importCsv, prepareCsv, tradesToCsv } from './csv';
import { tradeFixture } from './fixtures';
import type { Account } from './types';
let account: Account;
beforeEach(async () => { const data = defaultData(); await db.open(); await replaceAllData(data); account = data.accounts[0]; });
afterAll(async () => { await db.delete(); db.close(); });
const row = (patch: Record<string, string> = {}) => ({ symbol: 'BBCA', market: 'Saham', direction: 'long', openedAt: '2026-11-03T09:00', entryPrice: '100', quantity: '100', fees: '0', ...patch });
const csv = (rows: Record<string, string>[]) => Papa.unparse(rows);
describe('CSV import and export', () => {
  it('round-trips trades, notes with commas/newlines, tags and checklist', async () => {
    const strategy = { ...defaultData().strategies[0], id: 'strategy-1', name: 'My setup' };
    await db.strategies.add(strategy);
    const trade = tradeFixture({ accountId: account.id, strategyId: strategy.id, setupNotes: 'Breakout, volume\nTunggu close', tags: ['pagi', 'uji'], checklist: [{ id: 'c1', text: 'SL terpasang', checked: true }] });
    await db.trades.add(trade); const exported = tradesToCsv([trade], account, [strategy]);
    const preview = await prepareCsv(exported, account);
    expect(preview.errors).toEqual([]); expect(preview.skipped).toBe(1); expect(preview.trades).toEqual([]);
    const fresh = await prepareCsv(exported.replace(trade.id, 'imported-copy'), { ...account, id: 'new-account' });
    expect(fresh.errors).toEqual([]); expect(fresh.trades[0].setupNotes).toBe(trade.setupNotes); expect(fresh.trades[0].tags).toEqual(trade.tags); expect(fresh.trades[0].checklist).toEqual(trade.checklist); expect(fresh.trades[0].accountId).toBe('new-account');
  });
  it('previews valid rows and creates missing strategies only on confirmation', async () => {
    const preview = await prepareCsv(csv([row({ strategy: 'Setup baru' })]), account);
    expect(preview.trades.length).toBe(1); expect(preview.strategies.length).toBe(1); expect(await db.trades.count()).toBe(0); expect(await db.strategies.count()).toBe(2);
    expect(await importCsv(preview)).toBe(1); expect(await db.trades.count()).toBe(1); expect(await db.strategies.count()).toBe(3);
    expect(await importCsv(preview)).toBe(0); expect(await db.trades.count()).toBe(1);
  });
  it('rejects the entire file on any invalid row, without partial imports', async () => {
    const preview = await prepareCsv(csv([row(), row({ quantity: '-5', symbol: 'INVALID' })]), account);
    expect(preview.errors.length).toBe(1); expect(preview.errors[0]).toContain('Baris 3'); await expect(importCsv(preview)).rejects.toThrow('Perbaiki semua'); expect(await db.trades.count()).toBe(0);
  });
  it('rejects missing headers, wrong account and currency mismatch', async () => {
    await expect(prepareCsv('symbol,quantity\nBBCA,100', account)).rejects.toThrow('Kolom wajib');
    const wrongAccount = await prepareCsv(csv([row({ account: 'Another' })]), account); expect(wrongAccount.errors[0]).toContain('berbeda');
    const wrongCurrency = await prepareCsv(csv([row({ currency: 'USD' })]), account); expect(wrongCurrency.errors[0]).toContain('Tidak ada konversi');
  });
  it('supports quoted CSV delimiters and skips duplicate IDs', async () => {
    const text = Papa.unparse([row({ id: 'same', setupNotes: 'a;b' }), row({ id: 'same', symbol: 'BBRI' })], { delimiter: ';' });
    const preview = await prepareCsv(text, account); expect(preview.errors).toEqual([]); expect(preview.trades.length).toBe(1); expect(preview.skipped).toBe(1); expect(preview.trades[0].setupNotes).toBe('a;b');
  });
  it('escapes spreadsheet formula injection on export', () => {
    const exported = tradesToCsv([tradeFixture({ accountId: account.id, symbol: '=HYPERLINK', setupNotes: '+SUM(1,2)', exitNotes: '@command', lessons: '-danger' })], account, []);
    expect(exported).toContain("'=HYPERLINK"); expect(exported).toContain("'+SUM(1,2)"); expect(exported).toContain("'@command"); expect(exported).toContain("'-danger");
    const parsed = Papa.parse<Record<string, string>>(exported, { header: true }); expect(parsed.data[0].symbol).toBe("'=HYPERLINK");
  });
  it('validates numeric fields rather than silently coercing malformed values', async () => {
    const p = await prepareCsv(csv([row({ entryPrice: '1,000.5' })]), account); expect(p.errors[0]).toContain('Angka tidak valid');
  });
  it('uses the selected account default contract multiplier', async () => {
    const p = await prepareCsv(csv([row()]), { ...account, contractMultiplier: 50 }); expect(p.trades[0].multiplier).toBe(50);
  });
  it('ships a stable template with required fields', () => { expect(CSV_HEADERS).toEqual(expect.arrayContaining(['symbol', 'market', 'direction', 'openedAt', 'entryPrice', 'quantity'])); });
});
