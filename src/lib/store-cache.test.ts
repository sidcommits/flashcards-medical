import { describe, it, expect, vi, beforeEach } from 'vitest';

const review = { stability: 10, difficulty: 5, state: 2, lastReview: 1, due: 1, reps: 1, lapses: 0, ts: 1 };

function stubStorage(initial: Record<string, unknown>) {
  let raw = JSON.stringify(initial);
  const getItem = vi.fn((_k: string) => raw);
  const setItem = vi.fn((_k: string, v: string) => { raw = v; });
  const removeItem = vi.fn(() => { raw = '{}'; });
  vi.stubGlobal('window', {} as unknown);
  vi.stubGlobal('localStorage', { getItem, setItem, removeItem });
  return { getItem, setItem, removeItem };
}

describe('store cache', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('parses localStorage once across many getReview calls', async () => {
    const { getItem } = stubStorage({ c1: review });
    const { getReview } = await import('./store');
    for (let i = 0; i < 50; i++) getReview('c1');
    expect(getReview('c1')?.stability).toBe(10);
    expect(getItem).toHaveBeenCalledTimes(1); // parsed once, then served from cache
  });

  it('saveReview makes the new value visible without losing the cache', async () => {
    stubStorage({});
    const { getReview, saveReview } = await import('./store');
    expect(getReview('c1')).toBeUndefined();
    saveReview('c1', review);
    expect(getReview('c1')?.stability).toBe(10);
  });

  it('replaceReviews and resetStore refresh the cache', async () => {
    stubStorage({ c1: review });
    const { getReview, replaceReviews, resetStore, loadReviews } = await import('./store');
    expect(getReview('c1')).toBeDefined();
    replaceReviews({ c2: { ...review, stability: 7 } });
    expect(getReview('c1')).toBeUndefined();
    expect(getReview('c2')?.stability).toBe(7);
    resetStore();
    expect(loadReviews()).toEqual({});
  });

  it('does not mutate a previously returned reviews map when saving', async () => {
    stubStorage({ c1: review });
    const { loadReviews, saveReview } = await import('./store');
    const snapshot = loadReviews();
    saveReview('c2', { ...review, stability: 9 });
    // The earlier snapshot must be unchanged (saveReview replaces, not mutates).
    expect(snapshot.c2).toBeUndefined();
  });
});
