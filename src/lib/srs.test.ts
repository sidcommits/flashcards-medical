import { describe, it, expect } from 'vitest';
import { newReview, schedule, isDue, previewInterval, retrievabilityAt, type Review } from './srs';

const DAY = 86_400_000;

// A mature, review-state card reviewed 10 days ago (FSRS shape).
function mature(): Review {
  return {
    stability: 10,
    difficulty: 5,
    state: 2, // State.Review
    lastReview: Date.now() - 10 * DAY,
    due: Date.now(),
    reps: 5,
    lapses: 0,
    ts: Date.now(),
  };
}

describe('srs ts field', () => {
  it('newReview has a ts', () => {
    expect(newReview().ts).toBeGreaterThan(0);
  });
  it('schedule stamps ts', () => {
    const r = schedule(newReview(), 'good');
    expect(r.ts).toBeGreaterThan(0);
  });
});

describe('FSRS scheduling', () => {
  it('newReview is a fresh New-state card due ~now', () => {
    const r = newReview();
    expect(r.state).toBe(0); // State.New
    expect(r.reps).toBe(0);
    expect(r.due).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('grading good advances reps and builds stability', () => {
    const r = schedule(newReview(), 'good');
    expect(r.reps).toBeGreaterThan(0);
    expect(r.stability).toBeGreaterThan(0);
    expect(typeof r.difficulty).toBe('number');
  });

  it('schedules a Learning-state card across grades without regressing', () => {
    const inLearning = schedule(newReview(), 'good');
    expect(inLearning.state).toBe(1); // State.Learning
    const next = schedule(inLearning, 'good');
    expect(next.reps).toBeGreaterThan(inLearning.reps);
    expect(next.stability).toBeGreaterThan(0);
  });

  it('orders intervals easy >= good >= hard for a mature card', () => {
    const good = schedule(mature(), 'good').due;
    const easy = schedule(mature(), 'easy').due;
    const hard = schedule(mature(), 'hard').due;
    expect(easy).toBeGreaterThanOrEqual(good);
    expect(good).toBeGreaterThanOrEqual(hard);
  });

  it('again resets a mature card to a short interval and counts a lapse', () => {
    const again = schedule(mature(), 'again');
    expect(again.due - Date.now()).toBeLessThan(DAY); // minutes, not days
    expect(again.lapses).toBe(1);
  });

  it('migrates a legacy SM-2 review (no stability), producing valid FSRS state', () => {
    // Legacy blob shape from the old SM-2 scheduler: ease/interval, no stability.
    const legacy = {
      ease: 2.5,
      interval: 15,
      due: Date.now() + 5 * DAY,
      reps: 5,
      lapses: 1,
      ts: Date.now(),
    } as unknown as Review;
    const next = schedule(legacy, 'good');
    expect(next.stability).toBeGreaterThan(0);
    expect(typeof next.difficulty).toBe('number');
    expect(next.reps).toBeGreaterThan(5);
  });

  it('isDue: undefined and past are due, future is not', () => {
    expect(isDue(undefined)).toBe(true);
    expect(isDue({ ...newReview(), due: Date.now() - 1000 })).toBe(true);
    expect(isDue({ ...newReview(), due: Date.now() + 60_000 })).toBe(false);
  });

  it('previewInterval returns a short human label per grade', () => {
    const r = newReview();
    expect(previewInterval(r, 'again')).toMatch(/m$/); // e.g. "1m"
    expect(previewInterval(r, 'easy')).toMatch(/[mhdoy]$/); // e.g. "4d"
  });

  it('retrievabilityAt: high for a just-reviewed card, lower far in the future', () => {
    const r = schedule(newReview(), 'good'); // freshly studied
    const soon = retrievabilityAt(r, new Date(Date.now() + DAY));
    const later = retrievabilityAt(r, new Date(Date.now() + 120 * DAY));
    expect(soon).toBeGreaterThan(later);
    expect(soon).toBeLessThanOrEqual(1);
    expect(later).toBeGreaterThanOrEqual(0);
  });
});
