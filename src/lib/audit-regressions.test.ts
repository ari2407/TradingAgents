import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, defaultData, replaceAllData } from './db';
import { accountFixture, tradeFixture } from './fixtures';
import { priceRisk, openRisk, statistics } from './calculations';
import { tradeSchema } from './schemas';

beforeEach(async () => { await db.open(); await replaceAllData(defaultData()); });
afterAll(async () => { await db.delete(); db.close(); });

describe('audit regressions: protective stops and displayed risk', () => {
  it('does not report zero risk for a stop on the wrong side', () => {
    const long = tradeFixture({ exitPrice: undefined, closedAt: undefined, stopLoss: 105 });
    const short = tradeFixture({ exitPrice: undefined, closedAt: undefined, direction: 'short', stopLoss: 95 });
    expect(priceRisk(long)).toBeNull();
    expect(openRisk(long)).toBeNull();
    expect(priceRisk(short)).toBeNull();
    expect(openRisk(short)).toBeNull();
  });

  it('counts missing and invalid protective stops as risk that cannot be estimated', () => {
    const account = accountFixture();
    const trades = [
      tradeFixture({ id: 'missing-stop', exitPrice: undefined, closedAt: undefined, stopLoss: undefined }),
      tradeFixture({ id: 'wrong-stop', exitPrice: undefined, closedAt: undefined, stopLoss: 105 }),
      tradeFixture({ id: 'valid-stop', exitPrice: undefined, closedAt: undefined, stopLoss: 95 }),
    ];
    const result = statistics(trades, account);
    expect(result.noStopCount).toBe(2);
    expect(result.openRisk).toBe(55);
  });

  it('rejects long/short trades with stop or target on the wrong side', () => {
    expect(tradeSchema.safeParse(tradeFixture({ stopLoss: 105 })).success).toBe(false);
    expect(tradeSchema.safeParse(tradeFixture({ takeProfit: 90 })).success).toBe(false);
    expect(tradeSchema.safeParse(tradeFixture({ direction: 'short', stopLoss: 95 })).success).toBe(false);
    expect(tradeSchema.safeParse(tradeFixture({ direction: 'short', takeProfit: 110 })).success).toBe(false);
    expect(tradeSchema.safeParse(tradeFixture({ stopLoss: 95, takeProfit: 115 })).success).toBe(true);
    expect(tradeSchema.safeParse(tradeFixture({ direction: 'short', stopLoss: 105, takeProfit: 85 })).success).toBe(true);
  });
});
