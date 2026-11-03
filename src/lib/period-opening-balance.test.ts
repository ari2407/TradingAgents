import { describe, expect, it } from 'vitest';
import { accountFixture as account, tradeFixture as trade } from './fixtures';
import { periodOpeningBalance } from './calculations';

describe('reporting period opening balance', () => {
  const acct = account({ initialBalance: 10000 });
  const trades = [
    trade({ id: 'before', exitPrice: 120, fees: 0, closedAt: '2026-01-02T10:00:00.000Z' }),
    trade({ id: 'on-start', exitPrice: 110, fees: 0, closedAt: '2026-01-03T00:00:00.000Z' }),
    trade({ id: 'after', exitPrice: 90, fees: 0, closedAt: '2026-01-04T10:00:00.000Z' }),
    trade({ id: 'other-account', accountId: 'other', exitPrice: 1000, closedAt: '2026-01-02T10:00:00.000Z' }),
    trade({ id: 'open', exitPrice: undefined, closedAt: undefined, openedAt: '2026-01-02T10:00:00.000Z' }),
  ];

  it('uses only this account’s closed trades strictly before the period start', () => {
    expect(periodOpeningBalance(trades, acct, '2026-01-03T00:00:00.000Z')).toBe(10200);
  });

  it('uses initial balance for the all-time period', () => {
    expect(periodOpeningBalance(trades, acct)).toBe(10000);
  });

  it('does not count the same-day closed trade twice when its timestamp equals the boundary', () => {
    expect(periodOpeningBalance(trades, acct, '2026-01-03T00:00:00.000Z')).not.toBe(10300);
  });
});
