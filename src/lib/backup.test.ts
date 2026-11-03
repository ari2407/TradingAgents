import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, defaultData, deleteAccount, deleteTrade, replaceAllData, saveNote, saveTrade } from './db';
import { createBackup, checksum, validateBackupText } from './backup';
import { attachmentSchema, backupDataSchema, noteSchema, tradeSchema } from './schemas';
import { accountFixture, tradeFixture } from './fixtures';
import type { JournalNote } from './types';

beforeEach(async () => { await db.open(); await replaceAllData(defaultData()); });
afterAll(async () => { await db.delete(); db.close(); });
describe('validated, checksummed backups', () => {
  it('round-trips all saved data and verifies checksum', async () => {
    const backup = await createBackup(); const text = JSON.stringify(backup); const parsed = await validateBackupText(text);
    expect(parsed.accounts.length).toBe(1); expect(parsed.strategies.length).toBe(2); expect(parsed.settings.activeAccountId).toBe(backup.accounts[0].id);
    const { app: _app, version: _version, exportedAt: _exportedAt, checksum: _checksum, ...data } = backup;
    expect(parsed.checksum).toBe(await checksum(data));
  });
  it('round-trips a closed trade with optional fields', async () => {
    const data = await createBackup(); await db.trades.add(tradeFixture({ accountId: data.accounts[0].id, strategyId: undefined, exitNotes: 'Sesuai rencana', tags: ['uji'] }));
    const backup = await createBackup(); const parsed = await validateBackupText(JSON.stringify(backup)); expect(parsed.trades.length).toBe(1);
  });
  it('rejects malformed JSON and foreign backup formats without touching data', async () => {
    const before = await db.accounts.toArray();
    await expect(validateBackupText('{oops')).rejects.toThrow('bukan JSON');
    await expect(validateBackupText(JSON.stringify({ app: 'other', version: 1 }))).rejects.toThrow('tidak valid');
    expect(await db.accounts.toArray()).toEqual(before);
  });
  it('rejects a modified file even if JSON remains valid', async () => {
    const backup = await createBackup(); backup.accounts[0].initialBalance = 999999;
    await expect(validateBackupText(JSON.stringify(backup))).rejects.toThrow('Checksum tidak cocok');
    expect((await db.accounts.toArray())[0].initialBalance).toBe(0);
  });
  it('restores a snapshot atomically and clears unsaved drafts', async () => {
    const backup = await createBackup(); await db.accounts.update(backup.accounts[0].id, { name: 'Changed' }); await db.drafts.put({ id: 'unfinished', payload: {}, updatedAt: new Date().toISOString() });
    await replaceAllData(backup); expect((await db.accounts.toArray())[0].name).toBe('Akun utama'); expect(await db.drafts.count()).toBe(0);
  });
  it('rolls back every table if a write fails mid-restore', async () => {
    const before = await createBackup(); const data = defaultData();
    const note: JournalNote = { id: 'note', accountId: data.accounts[0].id, kind: 'daily', date: '2026-11-03', mood: '', content: '', didWell: '', improve: '', nextPlan: '', discipline: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.notes = [note, { ...note }];
    await expect(replaceAllData(data)).rejects.toThrow();
    expect(await db.accounts.toArray()).toEqual(before.accounts); expect(await db.strategies.toArray()).toEqual(before.strategies); expect(await db.notes.count()).toBe(0);
  });
  it('rejects missing foreign keys and duplicate IDs', () => {
    const data = defaultData(); expect(backupDataSchema.safeParse({ ...data, trades: [tradeFixture()] }).success).toBe(false);
    expect(backupDataSchema.safeParse({ ...data, accounts: [data.accounts[0], data.accounts[0]] }).success).toBe(false);
  });
  it('validates screenshot MIME, byte length, and ownership', () => {
    const a = { id: 'image', name: 'chart.png', mime: 'image/png', size: 3, data: 'data:image/png;base64,YWJj', createdAt: new Date().toISOString() };
    expect(attachmentSchema.safeParse(a).success).toBe(true);
    expect(attachmentSchema.safeParse({ ...a, size: 4 }).success).toBe(false);
    expect(attachmentSchema.safeParse({ ...a, mime: 'image/jpeg' }).success).toBe(false);
    const data = defaultData(); expect(backupDataSchema.safeParse({ ...data, attachments: [a] }).success).toBe(false);
  });
});
describe('safe trade and journal writes', () => {
  it('requires both exit price and exit date, and valid chronology', () => {
    expect(tradeSchema.safeParse(tradeFixture({ exitPrice: undefined })).success).toBe(false);
    expect(tradeSchema.safeParse(tradeFixture({ closedAt: undefined })).success).toBe(false);
    expect(tradeSchema.safeParse(tradeFixture({ closedAt: '2026-01-01T00:00:00Z' })).success).toBe(false);
    expect(tradeSchema.safeParse(tradeFixture({ quantity: -1 })).success).toBe(false);
  });
  it('stores screenshots atomically and deletes orphaned images with the trade', async () => {
    const data = await createBackup(); const accountId = data.accounts[0].id;
    const attachment = { id: 'image', name: 'chart.png', mime: 'image/png' as const, size: 3, data: 'data:image/png;base64,YWJj', createdAt: new Date().toISOString() };
    const trade = tradeFixture({ accountId, attachmentIds: ['image'] });
    await saveTrade(trade, [attachment]); expect(await db.attachments.count()).toBe(1);
    await saveTrade({ ...trade, attachmentIds: [] }, []); expect(await db.attachments.count()).toBe(0);
    await saveTrade(trade, [attachment]); await deleteTrade(trade.id); expect(await db.attachments.count()).toBe(0); expect(await db.trades.count()).toBe(0);
  });
  it('keeps one daily and one weekly note per account/date without duplicate records', async () => {
    const accountId = (await db.accounts.toCollection().first())!.id;
    const note: JournalNote = { id: 'n1', accountId, kind: 'daily', date: '2026-11-03', mood: 'tenang', discipline: 4, content: 'First', didWell: '', improve: '', nextPlan: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await saveNote(note); await saveNote({ ...note, id: 'n2', content: 'Updated' });
    expect(await db.notes.count()).toBe(1); expect((await db.notes.toCollection().first())!.content).toBe('Updated'); expect((await db.notes.toCollection().first())!.id).toBe('n1');
    expect(noteSchema.safeParse({ ...note, kind: 'weekly' }).success).toBe(false);
    expect(noteSchema.safeParse({ ...note, kind: 'weekly', date: '2026-11-02' }).success).toBe(true);
  });
  it('protects account history and updates active account after deletion', async () => {
    const first = (await db.accounts.toCollection().first())!; await db.trades.add(tradeFixture({ accountId: first.id }));
    await expect(deleteAccount(first.id)).rejects.toThrow('Arsipkan');
    await db.trades.clear(); await db.accounts.add(accountFixture({ id: 'second', name: 'Second' })); await db.settings.update('preferences', { activeAccountId: 'second' });
    await deleteAccount('second'); expect((await db.settings.get('preferences'))!.activeAccountId).toBe(first.id);
    await expect(deleteAccount(first.id)).rejects.toThrow('setidaknya satu');
  });
});
