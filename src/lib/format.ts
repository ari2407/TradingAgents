import type { Currency } from './types';
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export function money(value: number | null | undefined, currency: Currency = 'IDR', compact = false): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: currency === 'IDR' ? (compact ? 0 : 2) : 2, minimumFractionDigits: 0, ...(compact ? { notation: 'compact' as const, maximumFractionDigits: 1 } : {}) }).format(value);
}
export const number = (value: number, digits = 2) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(value);
export const percent = (value: number | null, digits = 1) => value === null || !Number.isFinite(value) ? '—' : `${number(value, digits)}%`;
export const signed = (value: number, currency: Currency = 'IDR') => `${value > 0 ? '+' : ''}${money(value, currency)}`;
export const pnlClass = (value: number | null | undefined) => value === null || value === undefined || value === 0 ? 'neutral' : value > 0 ? 'positive' : 'negative';
export function dateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('id-ID', options || { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value.length === 10 ? value + 'T12:00:00' : value));
}
export function localDate(value: Date = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
export function localDateTime(value: string = new Date().toISOString()) {
  const d = new Date(value); return `${localDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export function addDays(value: Date | string, days: number) {
  const d = typeof value === 'string' ? new Date(value.length === 10 ? value + 'T12:00:00' : value) : new Date(value);
  d.setDate(d.getDate() + days); return d;
}
export function weekStart(value: Date | string = new Date()) {
  const d = typeof value === 'string' ? new Date(value + 'T12:00:00') : new Date(value);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return localDate(d);
}
export const parseNumber = (value: string): number => Number(value.trim().replace(/\s/g, '').replace(',', '.'));
export const optionalNumber = (value: string): number | undefined => value.trim() === '' ? undefined : parseNumber(value);
export function formatBytes(bytes: number) { return bytes >= 1048576 ? `${number(bytes / 1048576, 1)} MB` : `${number(bytes / 1024, 0)} KB`; }
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function periodStart(period: string): string | undefined {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (period === '7') d.setDate(d.getDate() - 6);
  else if (period === '30') d.setDate(d.getDate() - 29);
  else if (period === 'month') d.setDate(1);
  else if (period === 'year') { d.setMonth(0, 1); }
  else return undefined;
  return d.toISOString();
}
