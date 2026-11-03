import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, BookOpen, CalendarCheck2, Check, ChevronLeft, ChevronRight, Feather, Save, Search, Sparkles, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { useApp } from '../stores/AppContext';
import { db, saveNote } from '../lib/db';
import { friendlyError, noteSchema } from '../lib/schemas';
import { EMOTIONS, emotionLabel, type Emotion } from '../lib/types';
import { addDays, dateLabel, localDate, now, percent, uid, weekStart } from '../lib/format';
import { dailyResults, statistics, weeklyTrades } from '../lib/calculations';
import { Badge, Button, Card, EmptyState, Field, InlineNotice, Money, PageHeader } from '../components/ui';
import { saveFile } from '../lib/backup';

const noteFormSchema = z.object({ mood: z.enum(['', 'tenang', 'yakin', 'ragu', 'fomo', 'takut', 'balas-dendam', 'lelah']), discipline: z.number().min(0).max(5), content: z.string(), didWell: z.string(), improve: z.string(), nextPlan: z.string() });
type NoteForm = z.infer<typeof noteFormSchema>;
const emptyForm: NoteForm = { mood: '', discipline: 0, content: '', didWell: '', improve: '', nextPlan: '' };
export function NotesPage() {
  const { data } = useApp(); const { account, notes } = data!;
  const [params, setParams] = useSearchParams(); const kind = params.get('tab') === 'weekly' ? 'weekly' : 'daily';
  const [date, setDate] = useState(localDate()), [query, setQuery] = useState('');
  const selectedDate = kind === 'weekly' ? weekStart(date) : date;
  const history = notes.filter(n => n.accountId === account.id && n.kind === kind && `${n.content} ${n.didWell} ${n.improve} ${n.nextPlan}`.toLocaleLowerCase('id').includes(query.toLocaleLowerCase('id'))).sort((a, b) => b.date.localeCompare(a.date));
  return <><PageHeader eyebrow="KENALI CARA ANDA MENGAMBIL KEPUTUSAN" title="Jurnal & review" description="Tidak harus panjang. Yang penting jujur, relevan, dan bisa dijadikan pelajaran."><Badge tone="green"><BookOpen size={13} />{account.name}</Badge></PageHeader>
    <div className="notes-topline"><div className="tabs"><button className={kind === 'daily' ? 'active' : ''} onClick={() => { setParams({}); setDate(localDate()); }}><Feather size={17} />Jurnal harian</button><button className={kind === 'weekly' ? 'active' : ''} onClick={() => { setParams({ tab: 'weekly' }); setDate(localDate()); }}><CalendarCheck2 size={17} />Review mingguan</button></div><div className="note-date-picker"><button className="icon-btn" aria-label={kind === 'weekly' ? 'Minggu sebelumnya' : 'Hari sebelumnya'} onClick={() => setDate(localDate(addDays(selectedDate, kind === 'weekly' ? -7 : -1)))}><ChevronLeft size={18} /></button><input type="date" aria-label="Tanggal jurnal" value={selectedDate} onChange={e => { if (e.target.value) setDate(e.target.value); }} /><button className="icon-btn" aria-label={kind === 'weekly' ? 'Minggu berikutnya' : 'Hari berikutnya'} onClick={() => setDate(localDate(addDays(selectedDate, kind === 'weekly' ? 7 : 1)))}><ChevronRight size={18} /></button><button className="text-link" onClick={() => setDate(localDate())}>Hari ini</button></div></div>
    <div className="notes-layout"><NoteEditor key={`${account.id}:${kind}:${selectedDate}`} accountId={account.id} kind={kind} date={selectedDate} />
      <aside className="notes-history"><Card title={kind === 'weekly' ? 'Review sebelumnya' : 'Lembaran sebelumnya'} subtitle={`${history.length} catatan tersimpan di akun ini`}><div className="search-input"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari dalam jurnal…" aria-label="Cari jurnal" /></div><div className="note-history-list">{history.length ? history.slice(0, 30).map(n => <button key={n.id} className={n.date === selectedDate ? 'selected' : ''} onClick={() => setDate(n.date)}><span><strong>{kind === 'weekly' ? `Minggu ${dateLabel(n.date, { day: 'numeric', month: 'short' })}` : dateLabel(n.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong><ChevronRight size={15} /></span><p>{n.content || n.didWell || n.improve || 'Catatan refleksi trading.'}</p><small>{emotionLabel(n.mood)}{n.discipline > 0 && ` · Disiplin ${n.discipline}/5`}</small></button>) : <EmptyState icon={BookOpen} title="Satu halaman baru" description={query ? 'Tidak ada catatan yang cocok dengan pencarian.' : 'Catatan yang disimpan akan muncul di sini. Draf juga disimpan otomatis di perangkat.'} compact />}</div></Card><div className="writing-tip"><Sparkles size={22} /><h3>Coba mulai dengan satu kalimat.</h3><p>“Hari ini saya belajar bahwa…”</p><p>“Jika bisa mengulang, saya akan…”</p><p>“Besok saya ingin lebih…”</p><small>Proses yang baik dibangun dari refleksi kecil yang dilakukan terus-menerus.</small></div></aside>
    </div></>;
}
function NoteEditor({ accountId, kind, date }: { accountId: string; kind: 'daily' | 'weekly'; date: string }) {
  const { data, notify, confirm } = useApp(); const { trades, account, notes } = data!;
  const existing = notes.find(n => n.accountId === accountId && n.kind === kind && n.date === date);
  const [form, setForm] = useState<NoteForm>(emptyForm), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false), [draftError, setDraftError] = useState('');
  const saved = useRef(false), draftKey = `note:${accountId}:${kind}:${date}`;
  useEffect(() => {
    let active = true;
    Promise.all([db.notes.where('[accountId+kind+date]').equals([accountId, kind, date]).first(), db.drafts.get(draftKey)]).then(([note, draft]) => {
      if (!active) return;
      const initial = note ? { mood: note.mood, discipline: note.discipline, content: note.content, didWell: note.didWell, improve: note.improve, nextPlan: note.nextPlan } : emptyForm;
      const parsed = draft ? noteFormSchema.safeParse(draft.payload) : null;
      setForm(parsed?.success ? parsed.data : initial); setLoaded(true);
    }).catch(e => { if (active) { setDraftError(friendlyError(e)); setLoaded(true); } });
    return () => { active = false; };
  }, [accountId, kind, date, draftKey]);
  useEffect(() => {
    if (!loaded || saved.current) return;
    const timer = setTimeout(() => { void db.drafts.put({ id: draftKey, payload: form, updatedAt: now() }).then(() => setDraftError('')).catch(() => setDraftError('Draf belum tersimpan. Simpan jurnal sebelum menutup aplikasi.')); }, 500);
    return () => clearTimeout(timer);
  }, [form, loaded, draftKey]);
  const update = <K extends keyof NoteForm>(key: K, value: NoteForm[K]) => { saved.current = false; setForm(f => ({ ...f, [key]: value })); };
  const weekTrades = weeklyTrades(trades.filter(t => t.accountId === accountId), date);
  const stats = kind === 'weekly' ? statistics(weekTrades, account) : null;
  const day = dailyResults(trades.filter(t => t.accountId === accountId)).get(date);
  const save = async () => {
    setBusy(true);
    try {
      const timestamp = now();
      const note = noteSchema.parse({ id: existing?.id ?? uid(), accountId, kind, date, ...form, createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp });
      if (!Object.values(form).some(v => typeof v === 'string' ? v.trim() : v > 0)) throw new Error('Tulis setidaknya satu refleksi atau pilih emosi sebelum menyimpan.');
      await saveNote(note); saved.current = true; await db.drafts.delete(draftKey); notify('Jurnal tersimpan. Terima kasih sudah meluangkan waktu untuk refleksi.');
    } catch (e) { notify(friendlyError(e), 'error'); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!await confirm({ title: 'Hapus lembar jurnal ini?', message: 'Catatan tersimpan dan draf untuk tanggal ini akan dihapus. Trade dan statistiknya tidak berubah.', label: 'Hapus jurnal', danger: true })) return;
    try { saved.current = true; if (existing) await db.notes.delete(existing.id); await db.drafts.delete(draftKey); setForm(emptyForm); notify('Jurnal dihapus.'); } catch (e) { saved.current = false; notify(friendlyError(e), 'error'); }
  };
  const exportNote = async () => {
    const content = `# ${kind === 'weekly' ? 'Review mingguan' : 'Jurnal harian'} — ${date}\n\nAkun: ${account.name}\nEmosi: ${emotionLabel(form.mood)}\nDisiplin: ${form.discipline || 'belum dinilai'}/5\n\n## Catatan utama\n${form.content || '—'}\n\n## Yang sudah baik\n${form.didWell || '—'}\n\n## Yang perlu diperbaiki\n${form.improve || '—'}\n\n## Rencana berikutnya\n${form.nextPlan || '—'}\n`;
    try { await saveFile(content, `Jurnal-${kind}-${date}.md`, 'text/markdown;charset=utf-8'); notify('Catatan disiapkan untuk diunduh.'); } catch (e) { notify(friendlyError(e), 'error'); }
  };
  return <Card className="note-editor"><div className="note-editor-title"><span className="note-editor-icon">{kind === 'weekly' ? <CalendarCheck2 size={24} /> : <Feather size={24} />}</span><div><h2>{kind === 'weekly' ? 'Berhenti sejenak. Lihat gambaran besar.' : 'Satu hari, satu pelajaran.'}</h2><p>{kind === 'weekly' ? `${dateLabel(date)} – ${dateLabel(localDate(addDays(date, 6)))}` : dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>{existing && <Badge tone="green"><Check size={12} />Tersimpan</Badge>}</div>
    <div className="note-context"><div><span>{kind === 'weekly' ? 'Trade closed minggu ini' : 'Trade closed hari ini'}</span><strong>{kind === 'weekly' ? stats!.count : day?.count ?? 0}</strong></div><div><span>Hasil bersih</span><strong><Money value={kind === 'weekly' ? stats!.net : day?.pnl ?? 0} currency={account.currency} sign colored /></strong></div><div><span>{kind === 'weekly' ? 'Checklist lengkap' : 'Win rate hari ini'}</span><strong>{kind === 'weekly' ? percent(stats!.discipline, 0) : day?.count ? percent(day.wins / day.count * 100, 0) : '—'}</strong></div></div>
    {kind === 'weekly' && <InlineNotice>Review mingguan memakai tanggal keluar, dimulai hari Senin. Angka adalah ringkasan catatan manual pada akun ini. Gunakan untuk mengevaluasi proses, bukan mengejar target profit.</InlineNotice>}
    <div className="form-grid two"><Field label={kind === 'weekly' ? 'Emosi dominan minggu ini' : 'Bagaimana perasaan Anda hari ini?'}><select value={form.mood} onChange={e => update('mood', e.target.value as Emotion)}>{EMOTIONS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}</select></Field><Field label="Disiplin menjalankan rencana" hint="Nilai proses Anda, terlepas dari profit atau loss."><div className="rating-picker">{[1, 2, 3, 4, 5].map(n => <button key={n} className={form.discipline >= n ? 'selected' : ''} aria-label={`Disiplin ${n} dari 5`} aria-pressed={form.discipline === n} onClick={() => update('discipline', n)}>★</button>)}<span>{form.discipline ? `${form.discipline}/5` : 'Belum dinilai'}</span></div></Field></div>
    <Field label={kind === 'weekly' ? 'Apa pola paling penting minggu ini?' : 'Ceritakan trading Anda hari ini'} hint="Cukup 2–3 kalimat. Apa yang terjadi, dan apa yang Anda pelajari?"><textarea rows={5} value={form.content} onChange={e => update('content', e.target.value)} maxLength={10000} placeholder={kind === 'weekly' ? 'Setup mana yang paling konsisten? Apakah ada pola emosi atau pelanggaran aturan?' : 'Apakah mengikuti rencana? Apa keputusan terbaik yang Anda ambil hari ini?'} /></Field>
    <div className="reflection-fields"><Field label="01 · Yang sudah saya lakukan dengan baik"><textarea rows={3} value={form.didWell} onChange={e => update('didWell', e.target.value)} maxLength={10000} placeholder="Contoh: tidak entry saat setup belum lengkap." /></Field><Field label="02 · Satu hal yang ingin saya perbaiki"><textarea rows={3} value={form.improve} onChange={e => update('improve', e.target.value)} maxLength={10000} placeholder="Spesifik dan bisa dilakukan, bukan menyalahkan diri." /></Field><Field label={kind === 'weekly' ? '03 · Rencana konkret minggu depan' : '03 · Rencana untuk trading berikutnya'}><textarea rows={3} value={form.nextPlan} onChange={e => update('nextPlan', e.target.value)} maxLength={10000} placeholder="Contoh: hanya mengambil setup A, risiko 0,5%, review setiap selesai sesi." /></Field></div>
    {draftError && <InlineNotice tone="warning">{draftError}</InlineNotice>}
    <div className="note-save-row"><span><span className={`mini-dot ${draftError ? 'negative-bg' : 'positive-bg'}`} />{draftError ? 'Draf belum tersimpan' : 'Draf otomatis · lokal di perangkat'}</span><div><button className="icon-btn" title="Unduh sebagai Markdown" aria-label="Unduh jurnal sebagai Markdown" onClick={() => void exportNote()}><ArrowDownToLine size={18} /></button>{existing && <button className="icon-btn" aria-label="Hapus jurnal" onClick={() => void remove()}><Trash2 size={18} /></button>}<Button icon={Save} loading={busy} disabled={!loaded} onClick={() => void save()}>{existing ? 'Simpan perubahan' : 'Simpan jurnal'}</Button></div></div>
  </Card>;
}
