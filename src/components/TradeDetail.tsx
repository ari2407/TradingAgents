import { useState } from 'react';
import { CalendarDays, Check, CheckCircle2, Circle, FileImage, Pencil, ShieldCheck, Trash2, X } from 'lucide-react';
import type { Attachment, Trade } from '../lib/types';
import { emotionLabel } from '../lib/types';
import { useApp } from '../stores/AppContext';
import { dateLabel, number } from '../lib/format';
import { isOpen, netPnl, rMultiple, tradeRR } from '../lib/calculations';
import { deleteTrade } from '../lib/db';
import { friendlyError } from '../lib/schemas';
import { Badge, Button, DirectionBadge, Modal, Money } from './ui';

export function TradeDetail({ trade, onClose, onEdit, onCloseTrade }: { trade: Trade; onClose: () => void; onEdit: () => void; onCloseTrade: () => void }) {
  const { data, confirm, notify } = useApp(); const [image, setImage] = useState<Attachment | null>(null);
  const account = data!.accounts.find(a => a.id === trade.accountId)!;
  const strategy = data!.strategies.find(s => s.id === trade.strategyId);
  const attachments = data!.attachments.filter(a => trade.attachmentIds.includes(a.id));
  const pnl = netPnl(trade), r = rMultiple(trade), rr = tradeRR(trade);
  const remove = async () => {
    if (!await confirm({ title: `Hapus trade ${trade.symbol}?`, message: 'Catatan, hasil, dan screenshot trade ini akan dihapus permanen dari perangkat. Statistik ikut berubah. Tindakan ini tidak dapat dibatalkan.', label: 'Hapus trade', danger: true })) return;
    try { await deleteTrade(trade.id); notify('Trade dihapus. Statistik sudah diperbarui.'); onClose(); } catch (e) { notify(friendlyError(e), 'error'); }
  };
  return <><Modal title={trade.symbol} subtitle={`${account.name} · ${trade.market} · dicatat ${dateLabel(trade.createdAt)}`} onClose={onClose} className="trade-detail">
    <div className="detail-hero"><div><div className="badge-row"><DirectionBadge direction={trade.direction} /><Badge tone={isOpen(trade) ? 'blue' : pnl! > 0 ? 'green' : pnl! < 0 ? 'red' : 'neutral'}>{isOpen(trade) ? 'Posisi terbuka' : pnl! > 0 ? 'Profit' : pnl! < 0 ? 'Loss' : 'Impas'}</Badge></div><span className="detail-result-label">{isOpen(trade) ? 'Posisi masih berjalan' : 'Hasil bersih setelah biaya'}</span><h3>{isOpen(trade) ? <Badge tone="blue">Belum ditutup</Badge> : <Money value={pnl} currency={account.currency} sign colored />}</h3></div><div className="detail-r"><span>{isOpen(trade) ? 'Rencana reward / risk' : 'Realisasi R-multiple'}</span><strong>{isOpen(trade) ? rr === null ? '—' : `1 : ${number(rr)}` : r === null ? '—' : `${r > 0 ? '+' : ''}${number(r)} R`}</strong><small>{isOpen(trade) ? 'Berdasarkan SL dan target awal' : 'Risiko harga awal, tanpa biaya'}</small></div></div>
    <div className="detail-metrics">{[
      ['Harga masuk', <Money value={trade.entryPrice} currency={account.currency} />], ['Harga keluar', isOpen(trade) ? 'Masih terbuka' : <Money value={trade.exitPrice} currency={account.currency} />],
      ['Jumlah / unit', number(trade.quantity, 8)], ['Total biaya', <Money value={trade.fees} currency={account.currency} />],
      ['Stop loss', trade.stopLoss === undefined ? 'Belum dicatat' : <Money value={trade.stopLoss} currency={account.currency} />], ['Take profit', trade.takeProfit === undefined ? 'Belum dicatat' : <Money value={trade.takeProfit} currency={account.currency} />],
      ['Nilai per poin', `${number(trade.multiplier, 6)} ${account.currency}`], ['Leverage', `${number(trade.leverage)}×`],
    ].map(([label, value], i) => <div key={i}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="detail-dates"><span><CalendarDays size={16} /><div><small>Masuk</small>{dateLabel(trade.openedAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div></span><span><CalendarDays size={16} /><div><small>Keluar</small>{trade.closedAt ? dateLabel(trade.closedAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Belum ditutup'}</div></span></div>
    <div className="detail-tags"><Badge tone="purple">{strategy?.name || 'Tanpa strategi'}</Badge>{trade.tags.map(tag => <Badge key={tag}>#{tag}</Badge>)}<Badge>{emotionLabel(trade.emotion)}</Badge>{trade.rating > 0 && <Badge tone="amber">Eksekusi {trade.rating}/5</Badge>}</div>
    {([['Alasan entry & rencana', trade.setupNotes], ['Catatan keluar', trade.exitNotes], ['Pelajaran', trade.lessons]] as const).map(([title, content]) => content && <section className="detail-note" key={title}><h4>{title}</h4><p>{content}</p></section>)}
    {trade.checklist.length > 0 && <section className="detail-note"><h4><ShieldCheck size={17} />Checklist eksekusi <span>{trade.checklist.filter(c => c.checked).length}/{trade.checklist.length}</span></h4><div className="detail-checklist">{trade.checklist.map(c => <div key={c.id} className={c.checked ? 'positive' : 'muted'}>{c.checked ? <CheckCircle2 size={17} /> : <Circle size={17} />}<span>{c.text}</span></div>)}</div></section>}
    {attachments.length > 0 && <section className="detail-note"><h4><FileImage size={17} />Screenshot tersimpan</h4><div className="detail-images">{attachments.map(a => <button key={a.id} onClick={() => setImage(a)} aria-label={`Perbesar ${a.name}`}><img src={a.data} alt={a.name} loading="lazy" /><span>{a.name}</span></button>)}</div></section>}
    {!trade.setupNotes && !trade.lessons && trade.checklist.length === 0 && <p className="detail-hint">Tambahkan alasan entry dan pelajaran saat mengedit. Jurnal yang berguna tidak harus panjang — cukup jujur dan konsisten.</p>}
    <div className="modal-actions detail-actions"><Button variant="ghost" icon={Trash2} onClick={() => void remove()} className="delete-trade">Hapus</Button><div><Button variant="secondary" icon={Pencil} onClick={onEdit}>Edit catatan</Button>{isOpen(trade) && <Button icon={Check} onClick={onCloseTrade}>Tutup posisi</Button>}</div></div>
  </Modal>{image && <Modal title={image.name} onClose={() => setImage(null)} className="image-modal" zIndex={120}><img src={image.data} alt={image.name} /><Button variant="secondary" icon={X} onClick={() => setImage(null)}>Tutup gambar</Button></Modal>}</>;
}
