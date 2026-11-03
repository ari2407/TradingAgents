import { describe, expect, it } from 'vitest';
import { accountFixture as account, tradeFixture as trade } from './fixtures';
import { calculatePosition, dailyResults, equityCurve, groupPerformance, grossPnl, inPeriod, isOpen, maxDrawdown, netPnl, openRisk, priceRisk, rMultiple, rewardRisk, statistics, weeklyTrades } from './calculations';
import { weekStart } from './format';

describe('P&L and risk calculations', () => {
  it('calculates long and short net P&L after fees', () => {
    expect(grossPnl(trade())).toBe(100); expect(netPnl(trade())).toBe(95);
    expect(netPnl(trade({ direction: 'short' }))).toBe(-105);
    expect(netPnl(trade({ direction: 'short', exitPrice: 90, stopLoss: 105, takeProfit: 85 }))).toBe(95);
  });
  it('supports contract multiplier without double-counting leverage', () => {
    expect(netPnl(trade({ multiplier: 50, leverage: 100 }))).toBe(4995);
  });
  it('never invents P&L for open trades and reports missing stop loss', () => {
    const t = trade({ exitPrice: undefined, closedAt: undefined });
    expect(isOpen(t)).toBe(true); expect(netPnl(t)).toBeNull(); expect(rMultiple(t)).toBeNull();
    expect(openRisk(t)).toBe(55); expect(openRisk(trade({ stopLoss: undefined }))).toBeNull();
  });
  it('uses initial price risk excluding fees as the R denominator', () => {
    expect(priceRisk(trade())).toBe(50); expect(rMultiple(trade())).toBe(1.9);
    expect(rMultiple(trade({ stopLoss: 100 }))).toBeNull();
  });
  it('does not treat a stop on the wrong side as zero-risk free profit', () => {
    expect(priceRisk(trade({ stopLoss: 105 }))).toBe(0);
    expect(rMultiple(trade({ stopLoss: 105 }))).toBeNull();
    expect(rewardRisk(100, 105, 120)).toBeNull();
    expect(rewardRisk(100, 95, 90)).toBeNull();
    expect(rewardRisk(100, 95, 115)).toBe(3);
    expect(rewardRisk(100, 105, 90, 'short')).toBe(2);
  });
  it('keeps account currencies isolated', () => {
    const result = statistics([trade(), trade({ id: 'usd', accountId: 'usd-account' })], account());
    expect(result.count).toBe(1); expect(result.net).toBe(95); expect(result.balance).toBe(10095);
  });
});
describe('portfolio statistics', () => {
  const closed = [trade({ id: 'a', exitPrice: 120, fees: 0, closedAt: '2026-01-02T04:00:00Z' }), trade({ id: 'b', exitPrice: 90, fees: 0, closedAt: '2026-01-03T04:00:00Z' }), trade({ id: 'c', exitPrice: 100, fees: 0, closedAt: '2026-01-04T04:00:00Z' }), trade({ id: 'd', exitPrice: undefined, closedAt: undefined })];
  it('includes breakeven trades in win-rate denominator', () => {
    const s = statistics(closed, account());
    expect(s.count).toBe(3); expect(s.wins).toBe(1); expect(s.losses).toBe(1); expect(s.breakeven).toBe(1);
    expect(s.winRate).toBeCloseTo(100 / 3); expect(s.net).toBe(100); expect(s.expectancy).toBeCloseTo(100 / 3); expect(s.open.length).toBe(1);
  });
  it('calculates payoff, profit factor, fees and checklist adherence', () => {
    const s = statistics([trade({ id: 'w', exitPrice: 120, fees: 2, checklist: [{ id: '1', text: 'SL', checked: true }] }), trade({ id: 'l', exitPrice: 90, fees: 3, checklist: [{ id: '1', text: 'SL', checked: false }] })], account());
    expect(s.profitFactor).toBeCloseTo(198 / 103); expect(s.payoff).toBeCloseTo(198 / 103); expect(s.fees).toBe(5); expect(s.discipline).toBe(50);
  });
  it('returns honest empty values rather than fabricated statistics', () => {
    const s = statistics([], account()); expect(s.winRate).toBeNull(); expect(s.profitFactor).toBeNull(); expect(s.avgR).toBeNull(); expect(s.discipline).toBeNull(); expect(s.net).toBe(0);
  });
  it('distinguishes infinity from insufficient profit-factor data', () => {
    expect(statistics([trade()], account()).profitFactor).toBe(Infinity);
    expect(statistics([trade({ exitPrice: 100, fees: 0 })], account()).profitFactor).toBeNull();
  });
  it('sorts equity by exit time and computes peak-to-trough drawdown', () => {
    const points = equityCurve([closed[1], closed[2], closed[0]], account());
    expect(points.map(p => p.equity)).toEqual([10000, 10200, 10100, 10100]);
    expect(maxDrawdown(points)).toEqual({ amount: 100, percent: 100 / 102 });
  });
  it('groups by strategy and ignores open positions', () => {
    const groups = groupPerformance(closed, t => t.strategyId || 'none'); expect(groups[0].count).toBe(3); expect(groups[0].net).toBe(100);
  });
  it('filters by exit date for closed trades and entry date for open trades', () => {
    expect(inPeriod(closed, '2026-01-03T00:00:00Z').length).toBe(2);
    expect(inPeriod(closed, '2026-01-02T00:00:00Z', '2026-01-02T23:59:59Z').map(t => t.id)).toEqual(['a', 'd']);
  });
  it('groups a cross-day trade only on its local exit date', () => {
    const days = dailyResults([trade({ openedAt: '2026-01-02T23:00:00Z', closedAt: '2026-01-03T02:00:00Z' })]);
    expect([...days.keys()]).toEqual(['2026-01-03']); expect(days.get('2026-01-03')?.count).toBe(1);
  });
  it('starts weeks on Monday and includes exactly seven local days', () => {
    expect(weekStart('2026-11-08')).toBe('2026-11-02');
    expect(weeklyTrades([trade({ closedAt: '2026-11-02T00:00:00Z' }), trade({ id: 'next', closedAt: '2026-11-09T00:00:00Z' })], '2026-11-02').length).toBe(1);
  });
});
describe('position sizing', () => {
  const input = { balance: 10000, riskPercent: 1, entry: 100, stop: 95, target: 115, direction: 'long' as const, fees: 10, multiplier: 1, step: 1, leverage: 1 };
  it('rounds down and reserves fixed fees inside the risk budget', () => {
    const r = calculatePosition(input); expect(r.budget).toBe(100); expect(r.quantity).toBe(18); expect(r.actualRisk).toBe(100); expect(r.rr).toBe(3); expect(r.potentialProfit).toBe(260);
  });
  it('respects lot size and never rounds up', () => {
    const r = calculatePosition({ ...input, step: 10 }); expect(r.quantity).toBe(10); expect(r.actualRisk).toBe(60);
  });
  it('returns no position if budget cannot pay fees or one lot', () => {
    expect(calculatePosition({ ...input, fees: 110 }).quantity).toBe(0);
    const r = calculatePosition({ ...input, step: 100 }); expect(r.quantity).toBe(0); expect(r.tooSmall).toBe(true);
  });
  it('rejects invalid numbers, wrong-side stops and identical entry/stop', () => {
    expect(calculatePosition({ ...input, entry: NaN }).valid).toBe(false);
    expect(calculatePosition({ ...input, stop: 105 }).quantity).toBe(0);
    expect(calculatePosition({ ...input, stop: 105 }).wrongStop).toBe(true);
    expect(calculatePosition({ ...input, stop: 100 }).valid).toBe(false);
    expect(calculatePosition({ ...input, riskPercent: -1 }).valid).toBe(false);
    expect(calculatePosition({ ...input, leverage: 0 }).valid).toBe(false);
  });
  it('calculates margin separately from P&L risk', () => {
    const r = calculatePosition({ ...input, leverage: 5 }); expect(r.quantity).toBe(18); expect(r.notional).toBe(1800); expect(r.margin).toBe(360);
  });
});
