import type { Account, Direction, Trade } from './types';
import { addDays, localDate } from './format';

export const isOpen = (t: Trade) => t.exitPrice === undefined;
export const isClosed = (t: Trade) => !isOpen(t);
export const grossPnl = (t: Trade): number | null => t.exitPrice === undefined ? null : (t.exitPrice - t.entryPrice) * t.quantity * t.multiplier * (t.direction === 'long' ? 1 : -1);
export const netPnl = (t: Trade): number | null => { const p = grossPnl(t); return p === null ? null : p - t.fees; };

// A zero result means no price distance only for legacy callers. Risk displays must use
// openRisk(), which returns null unless the stop is protective and therefore estimable.
export function priceRisk(t: Trade): number | null {
  if (t.stopLoss === undefined) return null;
  return Math.max(0, (t.entryPrice - t.stopLoss) * (t.direction === 'long' ? 1 : -1)) * t.quantity * t.multiplier;
}
export function hasProtectiveStop(t: Trade): boolean {
  return t.stopLoss !== undefined && (t.direction === 'long' ? t.stopLoss < t.entryPrice : t.stopLoss > t.entryPrice);
}
export const openRisk = (t: Trade) => { if (!hasProtectiveStop(t)) return null; const r = priceRisk(t); return r === null ? null : r + t.fees; };
export function rMultiple(t: Trade): number | null {
  const p = netPnl(t); const risk = priceRisk(t);
  return p === null || risk === null || risk <= 0 || !hasProtectiveStop(t) ? null : p / risk;
}
export function rewardRisk(entry: number, stop: number, target: number, direction: Direction = 'long'): number | null {
  const sign = direction === 'long' ? 1 : -1;
  const risk = (entry - stop) * sign, reward = (target - entry) * sign;
  return risk > 0 && reward > 0 ? reward / risk : null;
}
export const tradeRR = (t: Trade) => t.stopLoss !== undefined && t.takeProfit !== undefined ? rewardRisk(t.entryPrice, t.stopLoss, t.takeProfit, t.direction) : null;
export interface EquityPoint { date: string; equity: number; pnl: number; label: string }
export function equityCurve(trades: Trade[], account: Account): EquityPoint[] {
  const closed = trades.filter(t => t.accountId === account.id && isClosed(t)).sort((a, b) => a.closedAt!.localeCompare(b.closedAt!) || a.id.localeCompare(b.id));
  let equity = account.initialBalance;
  const initialDate = closed.length && closed[0].closedAt! < account.createdAt ? closed[0].closedAt! : account.createdAt;
  const points: EquityPoint[] = [{ date: initialDate, equity, pnl: 0, label: 'Modal awal' }];
  for (const t of closed) { const pnl = netPnl(t)!; equity += pnl; points.push({ date: t.closedAt!, equity, pnl, label: t.symbol }); }
  return points;
}
export function maxDrawdown(points: EquityPoint[]) {
  let peak = points[0]?.equity ?? 0, amount = 0, percent = 0;
  for (const p of points) { peak = Math.max(peak, p.equity); const dd = Math.max(0, peak - p.equity); amount = Math.max(amount, dd); if (peak > 0) percent = Math.max(percent, dd / peak * 100); }
  return { amount, percent };
}
/** Equity at the start of a reporting period, based only on previously closed trades. */
export function periodOpeningBalance(trades: Trade[], account: Account, start?: string): number {
  if (!start) return account.initialBalance;
  return account.initialBalance + trades
    .filter(t => t.accountId === account.id && t.closedAt && t.closedAt < start)
    .reduce((sum, t) => sum + (netPnl(t) ?? 0), 0);
}
export function statistics(trades: Trade[], account: Account) {
  const closed = trades.filter(t => t.accountId === account.id && isClosed(t));
  const open = trades.filter(t => t.accountId === account.id && isOpen(t));
  const profits = closed.map(t => netPnl(t)!);
  const wins = profits.filter(p => p > 0), losses = profits.filter(p => p < 0);
  const grossProfit = wins.reduce((a, b) => a + b, 0), grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  const net = profits.reduce((a, b) => a + b, 0), count = closed.length;
  const rValues = closed.map(rMultiple).filter((r): r is number => r !== null);
  const ordered = [...closed].sort((a, b) => a.closedAt!.localeCompare(b.closedAt!) || a.id.localeCompare(b.id));
  let streak = 0; let streakType: 'win' | 'loss' | '' = '';
  for (const t of ordered) { const p = netPnl(t)!; const type = p > 0 ? 'win' : p < 0 ? 'loss' : ''; if (type && type === streakType) streak++; else streak = type ? 1 : 0; streakType = type; }
  const withChecklist = closed.filter(t => t.checklist.length > 0);
  const followed = withChecklist.filter(t => t.checklist.every(c => c.checked)).length;
  return {
    closed, open, count, net, wins: wins.length, losses: losses.length, breakeven: count - wins.length - losses.length,
    winRate: count ? wins.length / count * 100 : null,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : null,
    expectancy: count ? net / count : null,
    avgWin: wins.length ? grossProfit / wins.length : null,
    avgLoss: losses.length ? grossLoss / losses.length : null,
    payoff: wins.length && losses.length ? (grossProfit / wins.length) / (grossLoss / losses.length) : null,
    grossProfit, grossLoss, fees: closed.reduce((a, t) => a + t.fees, 0),
    best: profits.length ? profits.reduce((a, b) => Math.max(a, b)) : null, worst: profits.length ? profits.reduce((a, b) => Math.min(a, b)) : null,
    balance: account.initialBalance + net, returnPercent: account.initialBalance > 0 ? net / account.initialBalance * 100 : null,
    drawdown: maxDrawdown(equityCurve(closed, account)),
    openRisk: open.reduce((a, t) => a + (openRisk(t) ?? 0), 0),
    noStopCount: open.filter(t => !hasProtectiveStop(t)).length,
    avgR: rValues.length ? rValues.reduce((a, b) => a + b, 0) / rValues.length : null, rCount: rValues.length,
    discipline: withChecklist.length ? followed / withChecklist.length * 100 : null, checklistCount: withChecklist.length,
    streak, streakType,
  };
}
export interface DayResult { date: string; pnl: number; count: number; wins: number; trades: Trade[] }
export function dailyResults(trades: Trade[]): Map<string, DayResult> {
  const map = new Map<string, DayResult>();
  for (const t of trades.filter(isClosed)) {
    const day = localDate(new Date(t.closedAt!)); const current = map.get(day) ?? { date: day, pnl: 0, count: 0, wins: 0, trades: [] };
    const pnl = netPnl(t)!; current.pnl += pnl; current.count++; if (pnl > 0) current.wins++; current.trades.push(t); map.set(day, current);
  }
  return map;
}
export function groupPerformance(trades: Trade[], getKey: (t: Trade) => string) {
  const groups = new Map<string, { name: string; count: number; net: number; wins: number }>();
  for (const t of trades.filter(isClosed)) { const name = getKey(t) || 'Tanpa label'; const g = groups.get(name) ?? { name, count: 0, net: 0, wins: 0 }; g.count++; g.net += netPnl(t)!; if (netPnl(t)! > 0) g.wins++; groups.set(name, g); }
  return [...groups.values()].sort((a, b) => b.net - a.net).map(g => ({ ...g, winRate: g.wins / g.count * 100 }));
}
export function inPeriod(trades: Trade[], from?: string, to?: string) {
  return trades.filter(t => { const d = t.closedAt ?? t.openedAt; return (!from || d >= from) && (!to || d <= to); });
}
export function tradingSession(value: string) {
  const hour = new Date(value).getHours(); return hour >= 7 && hour < 14 ? 'Pagi · 07–14' : hour >= 14 && hour < 21 ? 'Siang · 14–21' : 'Malam · 21–07';
}
export function weeklyTrades(trades: Trade[], monday: string) {
  const from = new Date(monday + 'T00:00:00'); const to = addDays(from, 7);
  return trades.filter(t => t.closedAt && new Date(t.closedAt) >= from && new Date(t.closedAt) < to);
}
export interface RiskInput { balance: number; riskPercent: number; entry: number; stop: number; target?: number; direction: Direction; fees: number; multiplier: number; step: number; leverage: number }
export function calculatePosition(input: RiskInput) {
  const { balance, riskPercent, entry, stop, target, direction, fees, multiplier, step, leverage } = input;
  const inputsValid = [balance, entry, stop, fees, multiplier, step, leverage].every(Number.isFinite) && balance > 0 && entry > 0 && stop > 0 && fees >= 0 && multiplier > 0 && step > 0 && leverage >= 1 && Number.isFinite(riskPercent) && riskPercent > 0 && riskPercent <= 100;
  const perUnitRisk = Math.abs(entry - stop) * multiplier;
  const wrongStop = inputsValid && (direction === 'long' ? stop >= entry : stop <= entry);
  const valid = inputsValid && !wrongStop && perUnitRisk > 0;
  const budget = balance * riskPercent / 100;
  const raw = valid && perUnitRisk > 0 ? Math.max(0, budget - fees) / perUnitRisk : 0;
  const quantity = valid ? Math.max(0, Math.floor((raw + Number.EPSILON * raw) / step) * step) : 0;
  const actualRisk = quantity * perUnitRisk + (quantity > 0 ? fees : 0);
  const rr = target !== undefined && valid ? rewardRisk(entry, stop, target, direction) : null;
  return { valid, budget, perUnitRisk, quantity, actualRisk, notional: quantity * entry * multiplier, margin: quantity * entry * multiplier / leverage, rr, potentialProfit: rr === null ? null : rr * quantity * perUnitRisk - fees, wrongStop, tooSmall: valid && perUnitRisk > 0 && raw < step };
}
