import { describe, it, expect } from 'vitest';
import { daysUntil, dueForecast, streak, recentAvgPerDay, onPace } from './stats';
import type { Review } from './srs';

const DAY = 86_400_000;
const mk = (over: Partial<Review> = {}): Review => ({ stability: 10, difficulty: 5, state: 2, lastReview: Date.now() - DAY, due: Date.now(), reps: 3, lapses: 0, ts: Date.now(), ...over });

describe('stats', () => {
  it('daysUntil counts whole days to the exam (null when no date)', () => {
    expect(daysUntil(null)).toBeNull();
    const d = new Date(Date.now() + 5 * DAY).toISOString().slice(0, 10);
    expect(daysUntil(d)).toBeGreaterThanOrEqual(4);
  });

  it('dueForecast buckets due cards into the next 7 days, overdue in day 0', () => {
    const reviews = {
      a: mk({ due: Date.now() - DAY }),       // overdue -> day 0
      b: mk({ due: Date.now() + 2 * DAY }),    // day 2
      c: mk({ due: Date.now() + 2 * DAY }),    // day 2
    };
    const f = dueForecast(reviews, 7);
    expect(f[0]).toBe(1);
    expect(f[2]).toBe(2);
  });

  it('streak counts consecutive goal-met days', () => {
    const today = '2026-06-14';
    const yest = '2026-06-13';
    const goalDays = { [today]: { on: true, ts: 2 }, [yest]: { on: true, ts: 1 } };
    expect(streak(goalDays, today)).toBe(2);
  });

  it('recentAvgPerDay averages the most recent active days', () => {
    expect(recentAvgPerDay({ '2026-06-14': 10, '2026-06-13': 20 }, 7)).toBe(15);
    expect(recentAvgPerDay({}, 7)).toBe(0);
  });

  it('onPace true when not-ready cards fit the remaining days at recent rate', () => {
    // 10 not-ready cards, 10 days left, avg 5/day -> 1 per day needed <= 5 -> on pace
    expect(onPace({ cardsNotReady: 10, daysLeft: 10, recentAvg: 5 })).toBe(true);
    expect(onPace({ cardsNotReady: 100, daysLeft: 10, recentAvg: 5 })).toBe(false);
    expect(onPace({ cardsNotReady: 10, daysLeft: 0, recentAvg: 5 })).toBe(false);
  });
});
