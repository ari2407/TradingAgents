import { useEffect, useId, useRef, useState } from 'react';
import { ChartNoAxesCombined } from 'lucide-react';
import type { EquityPoint } from '../lib/calculations';
import type { Currency } from '../lib/types';
import { dateLabel, money, number, percent, signed } from '../lib/format';
import { EmptyState } from './ui';

function useChartWidth() {
  const ref = useRef<HTMLDivElement>(null); const [width, setWidth] = useState(700);
  useEffect(() => { if (!ref.current) return; const observer = new ResizeObserver(entries => setWidth(Math.max(280, entries[0].contentRect.width))); observer.observe(ref.current); return () => observer.disconnect(); }, []);
  return { ref, width };
}
export function EquityChart({ points, currency, hidden = false, height = 260 }: { points: EquityPoint[]; currency: Currency; hidden?: boolean; height?: number }) {
  const { ref, width } = useChartWidth(); const gradient = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);
  const left = width < 450 ? 57 : 72, right = 20, top = 20, bottom = 34;
  const values = points.map(p => p.equity); const minValue = Math.min(...values), maxValue = Math.max(...values);
  const pad = Math.max((maxValue - minValue) * .18, Math.max(Math.abs(maxValue) * .005, 1));
  const low = minValue - pad, high = maxValue + pad;
  const x = (i: number) => left + i / Math.max(1, points.length - 1) * (width - left - right);
  const y = (value: number) => top + (high - value) / (high - low) * (height - top - bottom);
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.equity)}`).join(' ');
  const area = `${path} L ${x(points.length - 1)} ${height - bottom} L ${left} ${height - bottom} Z`;
  const last = points.at(-1); const up = (last?.equity ?? 0) >= (points[0]?.equity ?? 0); const color = up ? '#209477' : '#d76565';
  const active = hover !== null ? points[hover] : null;
  if (points.length < 2) return <div style={{ minHeight: height }}><EmptyState icon={ChartNoAxesCombined} title="Perjalanan Anda dimulai di sini" description="Tutup dan catat trade pertama untuk melihat kurva ekuitas. Tidak ada data contoh yang dicampurkan ke performa Anda." compact /></div>;
  return <div className={`equity-chart ${hidden ? 'sensitive' : ''}`} ref={ref}>
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Kurva ekuitas ${points.length - 1} trade tertutup. Modal awal ${money(points[0].equity, currency)}, nilai akhir ${money(last?.equity, currency)}.`} onPointerMove={e => { const rect = e.currentTarget.getBoundingClientRect(); const index = Math.round((e.clientX - rect.left - left) / (width - left - right) * (points.length - 1)); setHover(Math.max(0, Math.min(points.length - 1, index))); }} onPointerLeave={() => setHover(null)}>
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".17" /><stop offset="100%" stopColor={color} stopOpacity=".005" /></linearGradient></defs>
      {[0, 1, 2, 3].map(i => { const value = low + (high - low) * i / 3; return <g key={i}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="var(--chart-grid)" strokeDasharray="4 5" /><text x={left - 11} y={y(value) + 4} textAnchor="end" fill="var(--muted)" fontSize="10">{hidden ? '••••' : money(value, currency, true)}</text></g>; })}
      <path d={area} fill={`url(#${gradient})`} /><path d={path} fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(last!.equity)} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="3" />
      <text x={left} y={height - 8} fill="var(--muted)" fontSize="10">{dateLabel(points[0].date, { day: 'numeric', month: 'short' })}</text><text x={width - right} y={height - 8} textAnchor="end" fill="var(--muted)" fontSize="10">{dateLabel(last!.date, { day: 'numeric', month: 'short', year: '2-digit' })}</text>
      {active && hover !== null && <g><line x1={x(hover)} x2={x(hover)} y1={top} y2={height - bottom} stroke={color} strokeDasharray="3 4" opacity=".5" /><circle cx={x(hover)} cy={y(active.equity)} r="5" fill={color} stroke="var(--surface)" strokeWidth="2" /></g>}
    </svg>
    {active && <div className="chart-tooltip" style={{ left: Math.min(Math.max(0, x(hover!) - 80), width - 175) }}><span>{dateLabel(active.date)} · {active.label}</span><strong className="sensitive">{hidden ? '••••••' : money(active.equity, currency)}</strong>{active.pnl !== 0 && <small className="sensitive">{hidden ? '••••' : signed(active.pnl, currency)} trade ini</small>}</div>}
  </div>;
}
export function WinLossDonut({ wins, losses, breakeven, winRate }: { wins: number; losses: number; breakeven: number; winRate: number | null }) {
  const total = wins + losses + breakeven, radius = 60, circumference = 2 * Math.PI * radius;
  const parts = [{ value: wins, color: '#319c83', label: 'Profit', className: 'positive' }, { value: losses, color: '#dc8582', label: 'Loss', className: 'negative' }, { value: breakeven, color: '#cbd3d8', label: 'Impas', className: 'neutral' }];
  let offset = 0;
  return <div className="donut-layout"><div className="donut"><svg viewBox="0 0 160 160" role="img" aria-label={`${wins} profit, ${losses} loss, ${breakeven} impas`}><circle cx="80" cy="80" r={radius} fill="none" stroke="var(--chart-grid)" strokeWidth="15" />{parts.map(p => { const length = total ? p.value / total * circumference : 0; const current = offset; offset += length; return p.value > 0 ? <circle key={p.label} cx="80" cy="80" r={radius} fill="none" stroke={p.color} strokeWidth="15" strokeDasharray={`${Math.max(0, length - (total === p.value ? 0 : 3))} ${circumference}`} strokeDashoffset={-current} transform="rotate(-90 80 80)" strokeLinecap="round" /> : null; })}</svg><div className="donut-label"><strong>{percent(winRate, 0)}</strong><span>win rate</span></div></div><div className="donut-legend">{parts.map(p => <div key={p.label}><span><i style={{ background: p.color }} />{p.label}</span><strong>{p.value}<small> trade</small></strong></div>)}<p>Trade impas tetap dihitung dalam win rate.</p></div></div>;
}
export function BreakdownBars({ data, currency, hidden = false }: { data: { name: string; net: number; count: number; winRate: number }[]; currency: Currency; hidden?: boolean }) {
  const max = Math.max(1, ...data.map(d => Math.abs(d.net)));
  if (!data.length) return <EmptyState icon={ChartNoAxesCombined} title="Belum ada yang bisa dibandingkan" description="Catat beberapa trade closed untuk menemukan pola performa Anda." compact />;
  return <div className="breakdown-list">{data.slice(0, 8).map((d, i) => <div className="breakdown-row" key={d.name}><span className="breakdown-rank">{String(i + 1).padStart(2, '0')}</span><div className="breakdown-info"><div><strong>{d.name}</strong><span className={`sensitive ${d.net >= 0 ? 'positive' : 'negative'}`}>{hidden ? '••••••' : signed(d.net, currency)}</span></div><div className="breakdown-track"><span className={d.net >= 0 ? 'positive-bg' : 'negative-bg'} style={{ width: `${Math.max(2, Math.abs(d.net) / max * 100)}%` }} /></div><small>{d.count} trade <span>·</span> {number(d.winRate, 0)}% win rate</small></div></div>)}</div>;
}
