import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useApp } from '../stores/AppContext';
import { CSV_HEADERS, importCsv, prepareCsv, type CsvPreview } from '../lib/csv';
import { saveFile } from '../lib/backup';
import { friendlyError } from '../lib/schemas';
import { Button, InlineNotice, Modal } from './ui';
export function CsvImportModal({ onClose }: { onClose: () => void }) {
  const { data, notify } = useApp(); const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null), [filename, setFilename] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const account = data!.account;
  const load = async (file: File | undefined) => {
    if (!file) return; setBusy(true); setError(''); setPreview(null); setFilename(file.name);
    try { setPreview(await prepareCsv(await file.text(), account)); } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  const commit = async () => {
    if (!preview) return; setBusy(true);
    try { const imported = await importCsv(preview); notify(`${imported} trade berhasil diimpor. ${preview.skipped} duplikat dilewati.`); onClose(); }
    catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  };
  const template = () => saveFile(CSV_HEADERS.join(',') + '\r\n', 'TA-Journal-Template.csv', 'text/csv;charset=utf-8').catch(e => notify(friendlyError(e), 'error'));
  return <Modal title="Impor trade dari CSV" subtitle="Pindahkan catatan dari spreadsheet tanpa mengetik ulang." onClose={onClose} className="csv-modal">
    <InlineNotice>Semua baris masuk ke akun <strong>{account.name} · {account.currency}</strong>. Nama akun dan mata uang pada CSV harus cocok. Tidak ada konversi mata uang otomatis.</InlineNotice>
    <div className="import-step"><span>1</span><div><h3>Siapkan format yang sesuai</h3><p>Kolom wajib: symbol, market, direction, openedAt, entryPrice, quantity. Angka memakai titik desimal; tanggal memakai format ISO atau waktu lokal perangkat.</p><Button variant="secondary" icon={Download} onClick={() => void template()}>Unduh template CSV</Button></div></div>
    <div className="import-step"><span>2</span><div><h3>Pilih file, lalu periksa pratinjau</h3><p>CSV atau TXT maksimal 10 MB / 10.000 baris. ID yang sudah ada akan dilewati, bukan diperbarui. Screenshot hanya disertakan dalam backup JSON.</p><input ref={input} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={e => void load(e.target.files?.[0])} /><button className="upload-button" disabled={busy} onClick={() => input.current?.click()}><Upload size={25} /><strong>{busy ? 'Memeriksa file…' : filename || 'Pilih file CSV'}</strong><span>File dibaca lokal, tidak dikirim ke server</span></button></div></div>
    {error && <InlineNotice tone="danger">{error}</InlineNotice>}
    {preview && <div className="import-preview"><h3><FileSpreadsheet size={19} />Hasil pemeriksaan</h3><div className="import-counts"><span><strong>{preview.trades.length}</strong>siap diimpor</span><span><strong>{preview.skipped}</strong>duplikat dilewati</span><span><strong>{preview.errors.length}</strong>baris bermasalah</span></div>{preview.errors.length > 0 ? <><InlineNotice tone="danger">Belum ada data yang disimpan. Perbaiki file lalu pilih ulang. Tidak ada impor sebagian.</InlineNotice><ul className="import-errors">{preview.errors.slice(0, 20).map((e, i) => <li key={i}><AlertCircle size={14} />{e}</li>)}</ul></> : <><p><CheckCircle2 size={16} className="positive" />Validasi selesai. {preview.strategies.length} strategi baru akan dibuat bila diperlukan.</p><div className="table-scroll"><table className="data-table"><thead><tr><th>Simbol</th><th>Arah</th><th>Masuk</th><th>Harga entry</th><th>Jumlah</th></tr></thead><tbody>{preview.trades.slice(0, 5).map(t => <tr key={t.id}><td><strong>{t.symbol}</strong></td><td>{t.direction}</td><td>{new Date(t.openedAt).toLocaleDateString('id-ID')}</td><td>{t.entryPrice}</td><td>{t.quantity}</td></tr>)}</tbody></table></div>{preview.trades.length > 5 && <small>Menampilkan 5 dari {preview.trades.length} trade.</small>}</>}</div>}
    <div className="modal-actions"><Button variant="secondary" onClick={onClose}>Batal</Button><Button onClick={() => void commit()} loading={busy} disabled={!preview || !!preview.errors.length || preview.trades.length === 0}>Impor {preview?.trades.length || 0} trade</Button></div>
  </Modal>;
}
