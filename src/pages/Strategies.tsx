import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Archive, ArrowUpRight, Check, CheckCheck, Copy, FileText, Pencil, Plus, SlidersHorizontal, Target, Trash2 } from 'lucide-react';
import { useApp } from '../stores/AppContext';
import { db } from '../lib/db';
import { strategySchema, friendlyError } from '../lib/schemas';
import type { Strategy } from '../lib/types';
import { now, percent, uid } from '../lib/format';
import { groupPerformance } from '../lib/calculations';
import { Badge, Button, Card, EmptyState, Field, InlineNotice, Modal, Money, PageHeader } from '../components/ui';

export function StrategiesPage() {
  const { data, notify, confirm } = useApp(); const { strategies, trades, account } = data!;
  const [params, setParams] = useSearchParams(); const [editing, setEditing] = useState<Strategy | null>(null), [showArchived, setShowArchived] = useState(false);
  const open = params.get('new') === '1' || !!editing;
  const results = groupPerformance(trades.filter(t => t.accountId === account.id), t => t.strategyId || '');
  const save = async (strategy: Strategy) => { await db.strategies.put(strategy); };
  const archive = async (s: Strategy) => {
    if (!await confirm({ title: s.archived ? 'Aktifkan strategi?' : 'Arsipkan strategi?', message: 'Strategi yang diarsipkan tidak muncul saat mencatat trade baru. Riwayat trade yang menggunakannya tetap utuh.', label: s.archived ? 'Aktifkan' : 'Arsipkan' })) return;
    try { await save({ ...s, archived: !s.archived }); notify(s.archived ? 'Strategi aktif kembali.' : 'Strategi diarsipkan.'); } catch (e) { notify(friendlyError(e), 'error'); }
  };
  const duplicate = async (s: Strategy) => { try { await save({ ...s, id: uid(), name: `${s.name.slice(0, 70)} (salinan)`, isExample: false, archived: false, createdAt: now() }); notify('Strategi disalin. Sesuaikan aturannya dengan rencana Anda.'); } catch (e) { notify(friendlyError(e), 'error'); } };
  const remove = async (s: Strategy) => {
    if (!await confirm({ title: `Hapus ${s.name}?`, message: 'Strategi yang masih dipakai trade tidak dapat dihapus. Arsipkan untuk menyimpan riwayat.', label: 'Hapus strategi', danger: true })) return;
    try { if (trades.some(t => t.strategyId === s.id)) throw new Error('Strategi masih digunakan oleh trade. Pilih Arsipkan agar riwayat tetap aman.'); await db.strategies.delete(s.id); notify('Strategi dihapus.'); } catch (e) { notify(friendlyError(e), 'error'); }
  };
  const list = strategies.filter(s => showArchived || !s.archived);
  return <><PageHeader eyebrow="RENCANA YANG BISA DIEVALUASI" title="Strategi & checklist" description="Ubah aturan trading menjadi kebiasaan. Checklist otomatis tersedia saat Anda mencatat trade."><Button icon={Plus} onClick={() => setParams({ new: '1' })}>Buat strategi</Button></PageHeader>
    <InlineNotice><strong>Untuk pemula:</strong> mulai dengan satu strategi dan 3–5 aturan yang mudah diamati. Dua contoh di bawah adalah titik awal belajar, bukan rekomendasi trading. Edit dan sesuaikan sebelum digunakan.</InlineNotice>
    <div className="section-toolbar"><h2>{strategies.filter(s => !s.archived).length} strategi tersimpan</h2><label className="checkbox-label"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />Tampilkan arsip</label></div>
    {!list.length ? <Card><EmptyState icon={SlidersHorizontal} title="Strategi sederhana lebih mudah dijalankan" description="Tuliskan kapan Anda masuk, kapan keluar, dan kapan memilih tidak trading." action={<Button icon={Plus} onClick={() => setParams({ new: '1' })}>Buat strategi pertama</Button>} /></Card> : <div className="strategies-grid">{list.map((s, index) => {
      const linked = trades.filter(t => t.strategyId === s.id && t.accountId === account.id), result = results.find(r => r.name === s.id);
      return <Card key={s.id} className={`strategy-card ${s.archived ? 'archived' : ''}`}><div className="strategy-card-top"><span className={`strategy-icon tone-${index % 3}`}><Target size={24} /></span><div>{s.archived && <Badge>Diarsipkan</Badge>}{s.isExample && <Badge tone="amber">Contoh · sesuaikan dulu</Badge>}<span className="strategy-timeframe">{s.timeframe || 'Semua timeframe'}</span></div><button className="icon-btn" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}><Pencil size={17} /></button></div><h2>{s.name}</h2><p className="strategy-description">{s.description || 'Belum ada deskripsi. Tambahkan konteks strategi Anda.'}</p><div className="strategy-rules"><span className="eyebrow">CHECKLIST ENTRY · {s.rules.length} ATURAN</span>{s.rules.length ? s.rules.slice(0, 4).map((r, i) => <div key={i}><Check size={15} /><span>{r}</span></div>) : <p>Belum ada checklist. Edit strategi untuk menambah aturan.</p>}{s.rules.length > 4 && <small>+{s.rules.length - 4} aturan lainnya</small>}</div>{s.riskNotes && <div className="strategy-risk"><ShieldIcon /><p>{s.riskNotes}</p></div>}<div className="strategy-performance"><div><span>Trade akun ini</span><strong>{linked.length}</strong></div><div><span>Win rate</span><strong>{percent(result?.winRate ?? null, 0)}</strong></div><div><span>Hasil bersih</span><strong><Money value={result?.net ?? 0} currency={account.currency} sign colored /></strong></div></div><div className="strategy-footer"><Button variant="secondary" icon={Pencil} onClick={() => setEditing(s)}>{s.isExample ? 'Jadikan milik saya' : 'Edit strategi'}</Button><div><button className="icon-btn" title="Duplikat" aria-label={`Duplikat ${s.name}`} onClick={() => void duplicate(s)}><Copy size={16} /></button><button className="icon-btn" title={s.archived ? 'Aktifkan' : 'Arsipkan'} aria-label={`Arsipkan atau aktifkan ${s.name}`} onClick={() => void archive(s)}><Archive size={16} /></button><button className="icon-btn" title="Hapus" aria-label={`Hapus ${s.name}`} onClick={() => void remove(s)}><Trash2 size={16} /></button></div></div></Card>;
    })}</div>}
    <div className="strategy-tip"><CheckCheck size={29} /><div><h3>Eksekusi yang baik belum tentu profit. Itu tidak apa-apa.</h3><p>Checklist membantu menilai proses secara terpisah dari hasil. Satu trade rugi yang disiplin tetap memberi informasi berharga.</p></div><ArrowUpRight size={24} /></div>
    {open && <StrategyEditor strategy={editing || undefined} onClose={() => { setEditing(null); setParams({}); }} />}</>;
}
function ShieldIcon() { return <FileText size={17} />; }
function StrategyEditor({ strategy, onClose }: { strategy?: Strategy; onClose: () => void }) {
  const { data, notify } = useApp();
  const [name, setName] = useState(strategy?.name ?? ''), [description, setDescription] = useState(strategy?.description ?? ''), [timeframe, setTimeframe] = useState(strategy?.timeframe ?? ''), [rules, setRules] = useState(strategy?.rules.join('\n') ?? ''), [riskNotes, setRiskNotes] = useState(strategy?.riskNotes ?? ''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (data!.strategies.some(s => s.id !== strategy?.id && s.name.toLocaleLowerCase('id') === name.trim().toLocaleLowerCase('id'))) throw new Error('Nama strategi sudah digunakan.');
      const parsed = strategySchema.parse({ id: strategy?.id ?? uid(), name, description, timeframe, rules: rules.split('\n').map(r => r.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean), riskNotes, archived: strategy?.archived ?? false, isExample: false, createdAt: strategy?.createdAt ?? now() });
      await db.strategies.put(parsed); notify(strategy ? 'Strategi diperbarui. Checklist trade lama tetap menyimpan versi saat entry.' : 'Strategi siap digunakan pada trade berikutnya.'); onClose();
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  };
  return <Modal title={strategy ? 'Edit strategi & checklist' : 'Buat strategi Anda'} subtitle="Satu baris untuk satu aturan. Buat spesifik dan mudah dinilai." onClose={onClose} className="strategy-editor"><form onSubmit={submit}><Field label="Nama strategi" required><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Pullback mengikuti tren" maxLength={80} required /></Field><div className="form-grid two"><Field label="Timeframe"><input value={timeframe} onChange={e => setTimeframe(e.target.value)} placeholder="Contoh: M15 / H1" maxLength={40} /></Field><div className="strategy-editor-hint"><Target size={20} /><span>Fokus pada setup yang benar-benar Anda pahami.</span></div></div><Field label="Deskripsi & konteks pasar"><textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Kondisi seperti apa yang cocok untuk strategi ini?" maxLength={2000} /></Field><Field label="Checklist entry" required hint="Satu aturan per baris, maksimal 20. Centangnya disimpan per trade, bukan diubah di semua riwayat."><textarea rows={6} value={rules} onChange={e => setRules(e.target.value)} placeholder={'Tren utama jelas\nHarga berada di area entry\nKonfirmasi candle muncul\nRasio reward/risk minimal 1:2'} /></Field><Field label="Aturan risiko & kondisi tidak entry"><textarea rows={3} value={riskNotes} onChange={e => setRiskNotes(e.target.value)} placeholder="Contoh: risiko maksimal 1%, tidak entry menjelang berita besar, berhenti setelah 2 loss." maxLength={2000} /></Field>{strategy?.isExample && <InlineNotice>Anda sedang mengubah contoh. Setelah disimpan, strategi ini menjadi rencana milik Anda dan tetap bukan saran investasi.</InlineNotice>}{error && <InlineNotice tone="danger">{error}</InlineNotice>}<div className="modal-actions"><Button variant="secondary" type="button" onClick={onClose}>Batal</Button><Button type="submit" icon={Check} loading={busy}>Simpan strategi</Button></div></form></Modal>;
}
