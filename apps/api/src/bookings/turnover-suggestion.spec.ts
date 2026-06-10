import { suggestTurnover } from './turnover-suggestion';

const at = (iso: string) => new Date(iso);

describe('suggestTurnover', () => {
  it('proposes a window from checkout, default 3 hours', () => {
    const s = suggestTurnover({
      checkoutAt: at('2026-07-04T08:00:00Z'), // 10:00 local
      checkinAt: at('2026-07-05T14:00:00Z'), // next day
    });

    expect(s.start.toISOString()).toBe('2026-07-04T08:00:00.000Z');
    expect(s.end.toISOString()).toBe('2026-07-04T11:00:00.000Z');
    expect(s.tightGap).toBe(false);
  });

  it('clamps to the next check-in on a tight same-day turnover', () => {
    const s = suggestTurnover({
      checkoutAt: at('2026-07-04T08:00:00Z'),
      checkinAt: at('2026-07-04T10:00:00Z'), // only 2h gap
    });

    expect(s.end.toISOString()).toBe('2026-07-04T10:00:00.000Z');
    expect(s.tightGap).toBe(true);
  });

  it('uses the default duration when no next check-in exists', () => {
    const s = suggestTurnover({
      checkoutAt: at('2026-07-04T08:00:00Z'),
      checkinAt: null,
    });

    expect(s.end.toISOString()).toBe('2026-07-04T11:00:00.000Z');
    expect(s.tightGap).toBe(false);
  });

  it('flags an impossible gap (check-in before checkout) as tight with a minimal window', () => {
    const s = suggestTurnover({
      checkoutAt: at('2026-07-04T10:00:00Z'),
      checkinAt: at('2026-07-04T09:00:00Z'),
    });

    expect(s.tightGap).toBe(true);
    expect(s.end.getTime()).toBeGreaterThan(s.start.getTime());
  });
});
