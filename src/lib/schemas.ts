import { z } from 'zod';
import type { BackupData } from './types';

const id = z.string().min(1).max(100);
const timestamp = z.iso.datetime({ offset: true });
const date = z.iso.date();
const text = (max = 10000) => z.string().max(max);
const amount = z.number().finite().min(0).max(1e15);
const price = z.number().finite().positive().max(1e15);
const optionalPrice = price.optional();
const emotion = z.enum(['', 'tenang', 'yakin', 'ragu', 'fomo', 'takut', 'balas-dendam', 'lelah']);
export const accountSchema = z.object({
  id, name: z.string().trim().min(1, 'Nama akun wajib diisi.').max(80), broker: text(80),
  currency: z.enum(['IDR', 'USD', 'EUR', 'SGD', 'MYR']),
  initialBalance: amount, defaultFee: amount,
  contractMultiplier: z.number().finite().positive().max(1e6),
  riskLimitPercent: z.number().finite().min(0.01).max(100),
  dailyLossLimit: amount, archived: z.boolean(), createdAt: timestamp,
});
export const strategySchema = z.object({
  id, name: z.string().trim().min(1, 'Nama strategi wajib diisi.').max(80),
  description: text(2000), timeframe: text(40), rules: z.array(z.string().trim().min(1).max(300)).max(20),
  riskNotes: text(2000), archived: z.boolean(), isExample: z.boolean(), createdAt: timestamp,
});
export const checklistSchema = z.object({ id, text: z.string().min(1).max(300), checked: z.boolean() });
export const tradeSchema = z.object({
  id, accountId: id, strategyId: id.optional(),
  symbol: z.string().trim().min(1, 'Simbol atau nama instrumen wajib diisi.').max(30).transform(s => s.toUpperCase()),
  market: z.enum(['Saham', 'Crypto', 'Forex', 'Futures', 'Lainnya']), direction: z.enum(['long', 'short']),
  openedAt: timestamp, closedAt: timestamp.optional(), entryPrice: price, exitPrice: optionalPrice,
  quantity: z.number().finite().positive('Jumlah harus lebih dari 0.').max(1e15),
  stopLoss: optionalPrice, takeProfit: optionalPrice, fees: amount,
  multiplier: z.number().finite().positive().max(1e6), leverage: z.number().finite().min(1).max(10000),
  tags: z.array(z.string().trim().min(1).max(40)).max(20), emotion,
  setupNotes: text(), exitNotes: text(), lessons: text(),
  checklist: z.array(checklistSchema).max(30), attachmentIds: z.array(id).max(10),
  rating: z.number().int().min(0).max(5), createdAt: timestamp, updatedAt: timestamp,
}).superRefine((t, ctx) => {
  if ((t.exitPrice === undefined) !== (t.closedAt === undefined)) {
    ctx.addIssue({ code: 'custom', path: ['exitPrice'], message: 'Isi harga keluar dan tanggal keluar bersama-sama, atau kosongkan keduanya untuk trade terbuka.' });
  }
  if (t.closedAt && Date.parse(t.closedAt) < Date.parse(t.openedAt)) {
    ctx.addIssue({ code: 'custom', path: ['closedAt'], message: 'Tanggal keluar tidak boleh sebelum tanggal masuk.' });
  }
  if (t.stopLoss !== undefined && (t.direction === 'long' ? t.stopLoss >= t.entryPrice : t.stopLoss <= t.entryPrice)) {
    ctx.addIssue({ code: 'custom', path: ['stopLoss'], message: `Stop loss untuk ${t.direction} harus berada di sisi yang benar dari harga masuk.` });
  }
  if (t.takeProfit !== undefined && (t.direction === 'long' ? t.takeProfit <= t.entryPrice : t.takeProfit >= t.entryPrice)) {
    ctx.addIssue({ code: 'custom', path: ['takeProfit'], message: `Target untuk ${t.direction} harus berada di sisi yang benar dari harga masuk.` });
  }
  if (new Set(t.attachmentIds).size !== t.attachmentIds.length) {
    ctx.addIssue({ code: 'custom', path: ['attachmentIds'], message: 'Lampiran tidak boleh duplikat.' });
  }
});
export const noteSchema = z.object({
  id, accountId: id, kind: z.enum(['daily', 'weekly']), date, mood: emotion,
  content: text(), didWell: text(), improve: text(), nextPlan: text(),
  discipline: z.number().int().min(0).max(5), createdAt: timestamp, updatedAt: timestamp,
}).superRefine((n, ctx) => {
  if (n.kind === 'weekly' && new Date(n.date + 'T12:00:00').getDay() !== 1) {
    ctx.addIssue({ code: 'custom', path: ['date'], message: 'Review mingguan harus dimulai pada hari Senin.' });
  }
});
export const attachmentSchema = z.object({
  id, name: z.string().min(1).max(255), mime: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  size: z.number().int().min(1).max(5 * 1024 * 1024),
  data: z.string().max(7 * 1024 * 1024).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/, 'Format gambar tidak valid.'),
  createdAt: timestamp,
}).superRefine((a, ctx) => {
  const base64 = a.data.split(',')[1];
  const bytes = Math.floor(base64.length * 3 / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  if (bytes !== a.size || !a.data.startsWith(`data:${a.mime};base64,`)) {
    ctx.addIssue({ code: 'custom', path: ['data'], message: 'Ukuran atau jenis gambar tidak sesuai.' });
  }
});
export const settingsSchema = z.object({
  id: z.literal('preferences'), displayName: text(60), activeAccountId: id,
  theme: z.enum(['light', 'dark', 'system']), defaultRiskPercent: z.number().finite().min(0.01).max(100),
  hideBalances: z.boolean(), lastBackupAt: timestamp.optional(),
});
export const backupDataSchema = z.object({
  accounts: z.array(accountSchema).min(1).max(100), strategies: z.array(strategySchema).max(1000),
  trades: z.array(tradeSchema).max(100000), notes: z.array(noteSchema).max(20000),
  attachments: z.array(attachmentSchema).max(10000), settings: settingsSchema,
}).superRefine((data, ctx) => {
  const issue = (message: string, path: (string | number)[]) => ctx.addIssue({ code: 'custom', message, path });
  for (const key of ['accounts', 'strategies', 'trades', 'notes', 'attachments'] as const) {
    if (new Set(data[key].map(x => x.id)).size !== data[key].length) issue(`Ada ID duplikat pada ${key}.`, [key]);
  }
  const accounts = new Set(data.accounts.map(a => a.id));
  const strategies = new Set(data.strategies.map(s => s.id));
  const attachments = new Set(data.attachments.map(a => a.id));
  const noteKeys = new Set<string>();
  const usedAttachments = new Set<string>();
  if (!accounts.has(data.settings.activeAccountId) || data.accounts.find(a => a.id === data.settings.activeAccountId)?.archived) issue('Akun aktif tidak ditemukan atau sudah diarsipkan.', ['settings', 'activeAccountId']);
  data.trades.forEach((t, i) => {
    if (!accounts.has(t.accountId)) issue('Akun trade tidak ditemukan.', ['trades', i, 'accountId']);
    if (t.strategyId && !strategies.has(t.strategyId)) issue('Strategi trade tidak ditemukan.', ['trades', i, 'strategyId']);
    t.attachmentIds.forEach(a => {
      if (!attachments.has(a)) issue('Lampiran trade tidak ditemukan.', ['trades', i, 'attachmentIds']);
      if (usedAttachments.has(a)) issue('Satu gambar dipakai lebih dari satu trade.', ['trades', i, 'attachmentIds']);
      usedAttachments.add(a);
    });
  });
  data.notes.forEach((n, i) => {
    if (!accounts.has(n.accountId)) issue('Akun jurnal tidak ditemukan.', ['notes', i, 'accountId']);
    const key = `${n.accountId}:${n.kind}:${n.date}`;
    if (noteKeys.has(key)) issue('Ada dua jurnal untuk akun, jenis, dan tanggal yang sama.', ['notes', i]);
    noteKeys.add(key);
  });
  if (usedAttachments.size !== data.attachments.length) issue('Backup berisi gambar yang tidak terhubung ke trade.', ['attachments']);
});
export const backupSchema = z.object({
  app: z.literal('tradingagents-journal'), version: z.literal(1), exportedAt: timestamp,
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  accounts: backupDataSchema.shape.accounts, strategies: backupDataSchema.shape.strategies,
  trades: backupDataSchema.shape.trades, notes: backupDataSchema.shape.notes,
  attachments: backupDataSchema.shape.attachments, settings: backupDataSchema.shape.settings,
});
export function parseBackupData(value: unknown): BackupData { return backupDataSchema.parse(value); }
export function friendlyError(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues.slice(0, 5).map(i => `${i.path.join(' → ') || 'Data'}: ${i.message}`).join('\n');
  if (error instanceof Error) {
    if (/quota/i.test(error.message)) return 'Penyimpanan perangkat penuh. Backup data, lalu kosongkan ruang atau hapus lampiran besar.';
    return error.message;
  }
  return 'Terjadi kesalahan. Coba lagi.';
}
