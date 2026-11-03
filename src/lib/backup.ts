import { Capacitor } from '@capacitor/core';
import { db } from './db';
import { now, localDate } from './format';
import { backupSchema, parseBackupData } from './schemas';
import type { Backup, BackupData } from './types';

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().filter(k => object[k] !== undefined).map(k => `${JSON.stringify(k)}:${canonical(object[k])}`).join(',')}}`;
}
export async function checksum(data: BackupData) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(data)));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function createBackup(): Promise<Backup> {
  const [accounts, strategies, trades, notes, attachments, settings] = await db.transaction('r', [db.accounts, db.strategies, db.trades, db.notes, db.attachments, db.settings], async () => Promise.all([db.accounts.toArray(), db.strategies.toArray(), db.trades.toArray(), db.notes.toArray(), db.attachments.toArray(), db.settings.get('preferences')]));
  if (!settings) throw new Error('Pengaturan belum siap. Muat ulang aplikasi lalu coba lagi.');
  const data: BackupData = parseBackupData({ accounts, strategies, trades, notes, attachments, settings });
  return { app: 'tradingagents-journal', version: 1, exportedAt: now(), checksum: await checksum(data), ...data };
}
export async function validateBackupText(text: string): Promise<Backup> {
  if (new Blob([text]).size > 100 * 1024 * 1024) throw new Error('Backup melebihi 100 MB. Simpan lampiran lebih kecil lalu buat backup baru.');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('File bukan JSON yang valid. Pilih file backup .json dari TradingAgents Journal.'); }
  const result = backupSchema.safeParse(raw);
  if (!result.success) throw new Error(`Backup tidak valid. ${result.error.issues.slice(0, 4).map(i => `${i.path.join('/')}: ${i.message}`).join('; ')}`);
  const { app, version, exportedAt, checksum: expected, ...data } = result.data;
  if (await checksum(data) !== expected) throw new Error('Checksum tidak cocok. File mungkin rusak atau berubah. Data Anda tidak diubah; gunakan backup lain.');
  return { app, version, exportedAt, checksum: expected, ...data };
}
export async function saveFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
    const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Gagal menyiapkan file.')); reader.readAsDataURL(blob); });
    const file = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache, recursive: true });
    await Share.share({ title: filename, files: [file.uri], dialogTitle: 'Simpan atau bagikan file jurnal' });
  } else {
    const { downloadBlob } = await import('./format'); downloadBlob(blob, filename);
  }
}
export async function exportBackup() {
  const backup = await createBackup();
  await saveFile(JSON.stringify(backup, null, 2), `TA-Journal-Backup-${localDate()}-${Date.now()}.json`, 'application/json');
  await db.settings.update('preferences', { lastBackupAt: now() });
  return backup;
}
