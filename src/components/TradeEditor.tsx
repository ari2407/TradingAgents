import { useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, ArrowDownRight, ArrowUpRight, ImagePlus, LockKeyhole, Save, ShieldCheck, Trash2, X } from 'lucide-react';
import { useApp } from '../stores/AppContext';
import { db, saveTrade } from '../lib/db';
import { attachmentSchema, checklistSchema, friendlyError, tradeSchema } from '../lib/schemas';
import { EMOTIONS, MARKETS, type Attachment, type ChecklistItem, type Trade } from '../lib/types';
import { formatBytes, localDateTime, now, number, optionalNumber, parseNumber, uid } from '../lib/format';
import { netPnl, priceRisk, rewardRisk } from '../lib/calculations';
import { Button, Field, InlineNotice, Modal, Money } from './ui';

interface FormState {
  accountId: string; strategyId: string; symbol: string; market: Trade['market']; direction: Trade['direction'];
  openedAt: string; closedAt: string; entryPrice: string; exitPrice: string; quantity: string; stopLoss: string; takeProfit: string;
  fees: string; multiplier: string; leverage: string; tags: string; emotion: Trade['emotion']; setupNotes: string; exitNotes: string; lessons: string;
  rating: number; checklist: ChecklistItem[]; attachments: Attachment[];
}
const draftSchema = z.object({
  accountId: z.string(), strategyId: z.string(), symbol: z.string(), market: z.enum(['Saham', 'Crypto', 'Forex', 'Futures', 'Lainnya']), direction: z.enum(['long', 'short']),
  openedAt: z.string(), closedAt: z.string(), entryPrice: z.string(), exitPrice: z.string(), quantity: z.string(), stopLoss: z.string(), takeProfit: z.string(),
  fees: z.string(), multiplier: z.string(), leverage: z.string(), tags: z.string(), emotion: z.enum(['', 'tenang', 'yakin', 'ragu', 'fomo', 'takut', 'balas-dendam', 'lelah']),
  setupNotes: z.string(), exitNotes: z.string(), lessons: z.string(), rating: z.number().min(0).max(5), checklist: z.array(checklistSchema), attachments: z.array(attachmentSchema),
});
function initialForm(trade: Trade | undefined, accountId: string, fee: number, multiplier: number): FormState {
  const text = (n: number | undefined) => n === undefined ? '' : String(n);
  return {
    accountId: trade?.accountId ?? accountId, strategyId: trade?.strategyId ?? '', symbol: trade?.symbol ?? '', market: trade?.market ?? 'Saham', direction: trade?.direction ?? 'long',
    openedAt: localDateTime(trade?.openedAt), closedAt: trade?.closedAt ? localDateTime(trade.closedAt) : '',
    entryPrice: text(trade?.entryPrice), exitPrice: text(trade?.exitPrice), quantity: text(trade?.quantity), stopLoss: text(trade?.stopLoss), takeProfit: text(trade?.takeProfit),
    fees: text(trade?.fees ?? fee), multiplier: text(trade?.multiplier ?? multiplier), leverage: text(trade?.leverage ?? 1), tags: trade?.tags.join(', ') ?? '', emotion: trade?.emotion ?? '',
    setupNotes: trade?.setupNotes ?? '', exitNotes: trade?.exitNotes ?? '', lessons: trade?.lessons ?? '', rating: trade?.rating ?? 0,
    checklist: trade?.checklist ?? [], attachments: [],
  };
}
export function TradeEditor({ trade, onClose }: { trade?: Trade; onClose: () => void }) {
  const { data, notify, confirm } = useApp();
  const [searchParams] = useSearchParams();
  const key = trade ? `edit:${trade.id}` : `new:${data!.account.id}`;
  const [form, setForm] = useState<FormState>(() => initialForm(trade, data!.account.id, data!.account.defaultFee, data!.account.contractMultiplier));
  const [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({}), [draftError, setDraftError] = useState('');
  const saved = useRef(false), fileInput = useRef<HTMLInputElement>(null);
  const [notesOpen, setNotesOpen] = useState(!!trade), [advancedOpen, setAdvancedOpen] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([db.drafts.get(key), trade ? db.attachments.where('id').anyOf(trade.attachmentIds).toArray() : Promise.resolve([])]).then(([draft, attachments]) => {
      if (!active) return;
      if (draft) { const parsed = draftSchema.safeParse(draft.payload); if (parsed.success) setForm(parsed.data); else setDraftError('Draf lama tidak dapat dibaca. Data trade tersimpan Anda tidak berubah.'); }
      else if (trade) setForm(f => ({ ...f, attachments }));
      else if (searchParams.get('calculated') === '1') setForm(f => ({ ...f,
        entryPrice: searchParams.get('entry') || '', stopLoss: searchParams.get('stop') || '', takeProfit: searchParams.get('target') || '',
        quantity: searchParams.get('quantity') || '', direction: searchParams.get('direction') === 'short' ? 'short' : 'long',
        fees: searchParams.get('fees') || f.fees, multiplier: searchParams.get('multiplier') || f.multiplier, leverage: searchParams.get('leverage') || f.leverage,
      }));
      setLoaded(true);
    }).catch(e => { if (active) { setDraftError(friendlyError(e)); setLoaded(true); } });
    return () => { active = false; };
  }, [key, trade]);
  useEffect(() => {
    if (!loaded || saved.current) return;
    const timer = setTimeout(() => { void db.drafts.put({ id: key, payload: form, updatedAt: now() }).then(() => setDraftError('')).catch(() => setDraftError('Draf belum tersimpan. Simpan trade sebelum menutup aplikasi.')); }, 500);
    return () => clearTimeout(timer);
  }, [form, key, loaded]);
  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => { setForm(f => ({ ...f, [field]: value })); setErrors(e => ({ ...e, [field]: '' })); };
  const selectedAccount = data!.accounts.find(a => a.id === form.accountId) ?? data!.account;
  const closed = form.closedAt !== '';
  const numeric = (field: keyof FormState, placeholder = '0') => <input inputMode="decimal" autoComplete="off" value={String(form[field])} onChange={e => update(field, e.target.value as never)} placeholder={placeholder} aria-invalid={!!errors[field]} />;
  const setStrategy = (id: string) => {
    const strategy = data!.strategies.find(s => s.id === id);
    setForm(f => ({ ...f, strategyId: id, checklist: strategy ? strategy.rules.map(text => ({ id: uid(), text, checked: false })) : f.checklist }));
    if (strategy) setNotesOpen(true);
  };
  const close = () => { if (!saved.current && loaded) void db.drafts.put({ id: key, payload: form, updatedAt: now() }).catch(() => notify('Draf belum tersimpan. Jangan tutup aplikasi sebelum menyimpan trade.', 'error')); onClose(); };
  const discard = async () => {
    if (!await confirm({ title: 'Buang draf ini?', message: 'Isian dan gambar yang belum disimpan sebagai trade akan dihapus. Trade yang sudah tersimpan tidak berubah.', label: 'Buang draf', danger: true })) return;
    saved.current = true; await db.drafts.delete(key); onClose();
  };
  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return; setUploading(true);
    try {
      const added: Attachment[] = [];
      for (const file of Array.from(files)) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error(`${file.name}: gunakan PNG, JPG, atau WebP.`);
        if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name}: maksimal 5 MB per gambar.`);
        if (form.attachments.length + added.length >= 10) throw new Error('Maksimal 10 gambar per trade.');
        const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Gambar gagal dibaca.')); reader.readAsDataURL(file); });
        added.push(attachmentSchema.parse({ id: uid(), name: file.name, mime: file.type, size: file.size, data: dataUrl, createdAt: now() }));
      }
      setForm(f => ({ ...f, attachments: [...f.attachments, ...added] }));
    } catch (e) { notify(friendlyError(e), 'error'); }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = ''; }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErrors({});
    try {
      const timestamp = now();
      const parsed = tradeSchema.safeParse({
        id: trade?.id ?? uid(), accountId: form.accountId, strategyId: form.strategyId || undefined, symbol: form.symbol, market: form.market, direction: form.direction,
        openedAt: form.openedAt ? new Date(form.openedAt).toISOString() : '', closedAt: form.closedAt ? new Date(form.closedAt).toISOString() : undefined,
        entryPrice: parseNumber(form.entryPrice), exitPrice: optionalNumber(form.exitPrice), quantity: parseNumber(form.quantity), stopLoss: optionalNumber(form.stopLoss), takeProfit: optionalNumber(form.takeProfit),
        fees: parseNumber(form.fees || '0'), multiplier: parseNumber(form.multiplier || '1'), leverage: parseNumber(form.leverage || '1'),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), emotion: form.emotion, setupNotes: form.setupNotes, exitNotes: form.exitNotes, lessons: form.lessons,
        rating: form.rating, checklist: form.checklist, attachmentIds: form.attachments.map(a => a.id), createdAt: trade?.createdAt ?? timestamp, updatedAt: timestamp,
      });
      if (!parsed.success) { const fields: Record<string, string> = {}; parsed.error.issues.forEach(i => { fields[String(i.path[0])] = i.message; }); setErrors(fields); if (parsed.error.issues.some(i => ['setupNotes', 'exitNotes', 'lessons', 'checklist'].includes(String(i.path[0])))) setNotesOpen(true); notify('Periksa kembali kolom yang ditandai.', 'error'); return; }
      const account = data!.accounts.find(a => a.id === form.accountId);
      if (!account || account.archived) throw new Error('Pilih akun aktif untuk menyimpan trade.');
      if (form.strategyId && !data!.strategies.some(s => s.id === form.strategyId)) throw new Error('Strategi sudah tidak tersedia. Pilih strategi lain.');
      await saveTrade(parsed.data, form.attachments); saved.current = true; await db.drafts.delete(key).catch(() => undefined);
      notify(trade ? 'Perubahan trade berhasil disimpan.' : 'Trade berhasil dicatat. Satu langkah lebih disiplin!'); onClose();
    } catch (e) { notify(friendlyError(e), 'error'); }
    finally { setBusy(false); }
  };
  const entry = parseNumber(form.entryPrice), stop = optionalNumber(form.stopLoss), target = optionalNumber(form.takeProfit), quantity = parseNumber(form.quantity), multiplier = parseNumber(form.multiplier || '1');
  const validPreview = [entry, stop, target, quantity, multiplier].every(Number.isFinite);
  const rr = validPreview && stop !== undefined && target !== undefined ? rewardRisk(entry, stop, target, form.direction) : null;
  const previewTrade = { entryPrice: entry, stopLoss: stop, exitPrice: optionalNumber(form.exitPrice), quantity, multiplier, fees: parseNumber(form.fees || '0'), direction: form.direction } as Trade;
  const risk = validPreview ? priceRisk(previewTrade) : null;
  const pnl = validPreview && closed ? netPnl(previewTrade) : null;
  return <Modal title={trade ? 'Edit catatan trade' : 'Catat trade baru'} subtitle="Mulai dari data sederhana. Detail lainnya bisa ditambahkan kapan saja." onClose={close} className="trade-editor">
    {!loaded ? <div className="form-loading">Membuka draf di perangkat…</div> : <form onSubmit={submit} noValidate>
      <div className="editor-section"><div className="section-heading"><span>01</span><div><h3>Informasi trade</h3><p>Apa yang Anda perdagangkan?</p></div><div className="segmented small"><button type="button" className={!closed ? 'selected' : ''} onClick={() => { update('closedAt', ''); update('exitPrice', ''); }}>Terbuka</button><button type="button" className={closed ? 'selected' : ''} onClick={() => update('closedAt', localDateTime())}>Sudah ditutup</button></div></div>
      <div className="form-grid three"><Field label="Akun trading" required><select value={form.accountId} onChange={e => { const a = data!.accounts.find(a => a.id === e.target.value)!; setForm(f => ({ ...f, accountId: a.id, fees: String(a.defaultFee), multiplier: String(a.contractMultiplier) })); }} disabled={!!trade}>{data!.accounts.filter(a => !a.archived).map(a => <option key={a.id} value={a.id}>{a.name} · {a.currency}</option>)}</select></Field><Field label="Pasar / instrumen" required><select value={form.market} onChange={e => update('market', e.target.value as Trade['market'])}>{MARKETS.map(m => <option key={m}>{m}</option>)}</select></Field><Field label="Simbol trading" required error={errors.symbol} hint="Contoh: BBCA, BTCUSDT, atau EURUSD"><input value={form.symbol} onChange={e => update('symbol', e.target.value.toUpperCase())} placeholder="Masukkan simbol" maxLength={30} list="recent-symbols" autoComplete="off" /><datalist id="recent-symbols">{[...new Set(data!.trades.filter(t => t.accountId === form.accountId).map(t => t.symbol))].map(s => <option key={s} value={s} />)}</datalist></Field></div>
      <div className="form-grid three"><Field label="Arah posisi" required><div className="direction-picker"><button type="button" className={form.direction === 'long' ? 'selected long' : ''} onClick={() => update('direction', 'long')}><ArrowUpRight size={15} />Long / Beli</button><button type="button" className={form.direction === 'short' ? 'selected short' : ''} onClick={() => update('direction', 'short')}><ArrowDownRight size={15} />Short / Jual</button></div></Field><Field label="Tanggal & jam masuk" required error={errors.openedAt}><input type="datetime-local" value={form.openedAt} onChange={e => update('openedAt', e.target.value)} /></Field><Field label={'Jumlah / ukuran posisi (unit)'} required error={errors.quantity} hint="Saham: lembar/unit; crypto: koin; forex: unit sesuai kontrak.">{numeric('quantity', 'Contoh: 100')}</Field></div>
      <div className={`form-grid ${closed ? 'four' : 'three'}`}><Field label="Harga masuk" required error={errors.entryPrice}>{numeric('entryPrice', 'Harga rata-rata entry')}</Field><Field label="Stop loss" error={errors.stopLoss} hint="Sangat disarankan untuk risiko.">{numeric('stopLoss', 'Opsional')}</Field><Field label="Target / take profit" error={errors.takeProfit}>{numeric('takeProfit', 'Opsional')}</Field>{closed && <Field label="Harga keluar" required error={errors.exitPrice}>{numeric('exitPrice', 'Harga rata-rata exit')}</Field>}</div>
      {closed && <div className="form-grid two"><Field label="Tanggal & jam keluar" required error={errors.closedAt}><input type="datetime-local" value={form.closedAt} onChange={e => update('closedAt', e.target.value)} /></Field><Field label={`Total biaya (${selectedAccount.currency})`} error={errors.fees} hint="Komisi beli + jual, pajak, swap, dan biaya lain.">{numeric('fees')}</Field></div>}
      <div className="trade-preview"><span><ShieldCheck size={16} />{closed ? 'Hasil bersih' : 'Rencana risiko'}</span><strong>{closed ? <Money value={Number.isFinite(pnl ?? NaN) ? pnl : null} currency={selectedAccount.currency} sign colored /> : <Money value={risk} currency={selectedAccount.currency} />}</strong><span>Reward / risk <b>{rr === null ? '—' : `1 : ${number(rr)}`}</b></span><small>{closed ? 'Setelah total biaya' : 'Belum termasuk biaya'}</small></div>
      </div>
      <div className="editor-section"><button type="button" className="section-toggle" onClick={() => setNotesOpen(!notesOpen)} aria-expanded={notesOpen}><span className="section-number">02</span><div><h3>Rencana, checklist & emosi</h3><p>Opsional · pahami alasan di balik keputusan Anda</p></div><ChevronDown size={19} className={notesOpen ? 'rotate' : ''} /></button>
      {notesOpen && <div className="optional-fields"><div className="form-grid two"><Field label="Strategi / setup"><select value={form.strategyId} onChange={e => setStrategy(e.target.value)}><option value="">Tanpa strategi tertentu</option>{data!.strategies.filter(s => !s.archived || s.id === form.strategyId).map(s => <option key={s.id} value={s.id}>{s.name}{s.isExample ? ' (contoh)' : ''}</option>)}</select></Field><Field label="Emosi sebelum masuk"><select value={form.emotion} onChange={e => update('emotion', e.target.value as Trade['emotion'])}>{EMOTIONS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}</select></Field></div>
      {form.checklist.length > 0 && <div className="trade-checklist"><div className="checklist-title"><strong>Checklist sebelum entry</strong><span>{form.checklist.filter(c => c.checked).length}/{form.checklist.length} terpenuhi</span></div>{form.checklist.map(item => <label key={item.id}><input type="checkbox" checked={item.checked} onChange={e => update('checklist', form.checklist.map(c => c.id === item.id ? { ...c, checked: e.target.checked } : c))} /><span>{item.text}</span></label>)}<small>Jujur pada checklist lebih penting daripada mencentang semuanya.</small></div>}
      <Field label="Alasan entry / rencana awal"><textarea rows={3} value={form.setupNotes} onChange={e => update('setupNotes', e.target.value)} placeholder="Setup apa yang terlihat? Mengapa Anda masuk? Di mana rencana keluar?" maxLength={10000} /></Field>
      <div className="form-grid two"><Field label="Catatan saat keluar"><textarea rows={3} value={form.exitNotes} onChange={e => update('exitNotes', e.target.value)} placeholder="Apakah keluar sesuai rencana?" maxLength={10000} /></Field><Field label="Pelajaran untuk trade berikutnya"><textarea rows={3} value={form.lessons} onChange={e => update('lessons', e.target.value)} placeholder="Satu hal yang bisa dilakukan lebih baik…" maxLength={10000} /></Field></div>
      <div className="form-grid two"><Field label="Tag" hint="Pisahkan dengan koma. Contoh: breakout, sesi pagi"><input value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="Tambahkan tag" /></Field><Field label="Nilai eksekusi Anda" hint="Menilai disiplin, bukan besarnya profit."><div className="rating-picker">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} className={form.rating >= n ? 'selected' : ''} aria-label={`Eksekusi ${n} dari 5`} aria-pressed={form.rating === n} onClick={() => update('rating', form.rating === n ? 0 : n)}>★</button>)}<span>{form.rating ? `${form.rating}/5` : 'Belum dinilai'}</span></div></Field></div>
      <div className="attachment-area"><div className="field-label">Screenshot chart <span className="muted">· opsional, maks. 10 gambar × 5 MB</span></div><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={e => void addFiles(e.target.files)} /><button type="button" className="upload-button" disabled={uploading} onClick={() => fileInput.current?.click()}><ImagePlus size={23} /><strong>{uploading ? 'Membaca gambar…' : 'Tambah screenshot'}</strong><span>PNG, JPG, WebP · tetap tersimpan offline</span></button>{form.attachments.length > 0 && <div className="attachment-grid">{form.attachments.map(a => <div className="attachment-thumb" key={a.id}><img src={a.data} alt={a.name} /><button type="button" aria-label={`Hapus ${a.name}`} onClick={() => update('attachments', form.attachments.filter(x => x.id !== a.id))}><X size={14} /></button><span>{a.name}<small>{formatBytes(a.size)}</small></span></div>)}</div>}</div>
      </div>}
      </div>
      <div className="editor-section"><button type="button" className="section-toggle" onClick={() => setAdvancedOpen(!advancedOpen)} aria-expanded={advancedOpen}><span className="section-number">03</span><div><h3>Detail kontrak & biaya</h3><p>Opsional · untuk forex, futures, atau instrumen berkontrak</p></div><ChevronDown size={19} className={advancedOpen ? 'rotate' : ''} /></button>{advancedOpen && <><InlineNotice>Untuk saham dan crypto biasa, gunakan nilai kontrak <b>1</b>. Leverage hanya menghitung estimasi margin, tidak mengalikan P&L dua kali.</InlineNotice><div className="form-grid three"><Field label="Nilai per poin / kontrak" error={errors.multiplier} hint="P&L = selisih harga × jumlah × nilai ini.">{numeric('multiplier')}</Field><Field label="Leverage (informatif)" error={errors.leverage}>{numeric('leverage')}</Field>{!closed && <Field label={`Total estimasi biaya (${selectedAccount.currency})`} error={errors.fees}>{numeric('fees')}</Field>}</div></>}</div>
      {draftError && <InlineNotice tone="warning">{draftError}</InlineNotice>}
      <div className="editor-footer"><span><LockKeyhole size={13} />{draftError ? 'Draf belum tersimpan' : 'Draf otomatis tersimpan lokal'}</span><div><Button type="button" variant="ghost" icon={Trash2} onClick={() => void discard()} aria-label="Buang draf" className="discard-button">Buang draf</Button><Button type="button" variant="secondary" onClick={close}>Nanti saja</Button><Button type="submit" icon={Save} loading={busy} disabled={uploading}>{trade ? 'Simpan perubahan' : 'Simpan trade'}</Button></div></div>
    </form>}
  </Modal>;
}
export function CloseTradeEditor({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const { notify } = useApp(); const [price, setPrice] = useState(''), [date, setDate] = useState(localDateTime()), [notes, setNotes] = useState(trade.exitNotes), [fees, setFees] = useState(String(trade.fees)), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const account = useApp().data!.accounts.find(a => a.id === trade.accountId)!;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { const parsed = tradeSchema.parse({ ...trade, exitPrice: parseNumber(price), closedAt: new Date(date).toISOString(), exitNotes: notes, fees: parseNumber(fees), updatedAt: now() }); await db.trades.put(parsed); notify('Trade ditutup. Hasil bersih dan analisis sudah diperbarui.'); onClose(); }
    catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  };
  const preview = { ...trade, exitPrice: parseNumber(price), fees: parseNumber(fees || '0') };
  return <Modal title={`Tutup posisi ${trade.symbol}`} subtitle="Catat hasil aktual. Tidak ada order yang dikirim ke broker." onClose={onClose} className="small-modal"><form onSubmit={submit}><div className="close-trade-summary"><span>{trade.direction === 'long' ? 'Long / Beli' : 'Short / Jual'} · {number(trade.quantity, 8)} unit</span><strong>Entry <Money value={trade.entryPrice} currency={account.currency} /></strong></div><div className="form-grid two"><Field label="Harga keluar aktual" required>{<input autoFocus inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="Harga rata-rata exit" required />}</Field><Field label="Total biaya aktual" required><input inputMode="decimal" value={fees} onChange={e => setFees(e.target.value)} /></Field></div><Field label="Tanggal & jam keluar" required><input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} required /></Field><Field label="Catatan keluar"><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Bagaimana eksekusi Anda?" maxLength={10000} /></Field><div className="trade-preview"><span><Check size={16} />Estimasi hasil bersih</span><strong><Money value={Number.isFinite(netPnl(preview) ?? NaN) ? netPnl(preview) : null} currency={account.currency} sign colored /></strong></div>{error && <InlineNotice tone="danger">{error}</InlineNotice>}<div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" loading={busy}>Simpan hasil trade</Button></div></form></Modal>;
}
