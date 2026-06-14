import { describe, it, expect } from 'vitest';
import { mergeMap, mergeDoc, emptyDoc, type ProgressDoc } from './merge';
import type { Review } from './srs';

describe('client merge', () => {
  it('keeps newest ts (incoming wins ties)', () => {
    const out = mergeMap({ x: { on: true, ts: 5 } }, { x: { on: false, ts: 5 } }, (f) => f.ts);
    expect(out.x.on).toBe(false);
  });
  it('mergeDoc merges all maps', () => {
    const a: ProgressDoc = { ...emptyDoc(), hidden: { c: { on: true, ts: 1 } } };
    const b: ProgressDoc = { ...emptyDoc(), hidden: { c: { on: false, ts: 2 } } };
    expect(mergeDoc(a, b).hidden.c.on).toBe(false);
  });

  // Test A-1: reviews merge — newer ts wins
  it('reviews merge: newer ts wins', () => {
    const older: Review = { stability: 1, difficulty: 5, state: 2, reps: 0, lapses: 0, due: 0, ts: 100 };
    const newer: Review = { stability: 2, difficulty: 4, state: 2, reps: 1, lapses: 0, due: 0, ts: 200 };
    const a: ProgressDoc = { ...emptyDoc(), reviews: { 'card-1': older } };
    const b: ProgressDoc = { ...emptyDoc(), reviews: { 'card-1': newer } };
    const merged = mergeDoc(a, b);
    expect(merged.reviews['card-1'].ts).toBe(200);
    expect(merged.reviews['card-1'].stability).toBe(2);
  });

  // Test A-2: entry missing .ts is treated as 0 (older)
  it('reviews merge: entry missing ts treated as 0 (older)', () => {
    const withTs: Review = { stability: 1, difficulty: 5, state: 2, reps: 0, lapses: 0, due: 0, ts: 50 };
    const noTs = { stability: 3, difficulty: 4, state: 2, reps: 2, lapses: 0, due: 0 } as unknown as Review;
    const a: ProgressDoc = { ...emptyDoc(), reviews: { 'card-x': noTs } };
    const b: ProgressDoc = { ...emptyDoc(), reviews: { 'card-x': withTs } };
    const merged = mergeDoc(a, b);
    // withTs (ts=50) should win over noTs (ts=undefined → 0)
    expect(merged.reviews['card-x'].ts).toBe(50);
    expect(merged.reviews['card-x'].stability).toBe(1);
  });

  // Test A-3a: resetAt most-recent-wins — b has newer resetAt
  it('resetAt: most-recent wins (b newer)', () => {
    const a: ProgressDoc = { ...emptyDoc(), resetAt: 1000 };
    const b: ProgressDoc = { ...emptyDoc(), resetAt: 2000 };
    expect(mergeDoc(a, b).resetAt).toBe(2000);
  });

  // Test A-3b: resetAt — a has value, b is null → keeps a
  it('resetAt: a has value, b is null → keeps a', () => {
    const a: ProgressDoc = { ...emptyDoc(), resetAt: 5000 };
    const b: ProgressDoc = { ...emptyDoc(), resetAt: null };
    expect(mergeDoc(a, b).resetAt).toBe(5000);
  });
});

describe('examDate + goalDays merge', () => {
  it('examDate: newest ts wins; goalDays union', () => {
    const a = { ...emptyDoc(), examDate: { value: '2026-09-01', ts: 10 }, goalDays: { '2026-06-13': { on: true, ts: 5 } } };
    const b = { ...emptyDoc(), examDate: { value: '2026-10-01', ts: 20 }, goalDays: { '2026-06-14': { on: true, ts: 6 } } };
    const m = mergeDoc(a, b);
    expect(m.examDate.value).toBe('2026-10-01'); // newer ts
    expect(Object.keys(m.goalDays).sort()).toEqual(['2026-06-13', '2026-06-14']);
  });

  it('tolerates docs missing the new fields (back-compat)', () => {
    const legacy = { version: 1, updatedAt: 0, resetAt: null, reviews: {}, bookmarks: {}, hidden: {} } as never;
    const m = mergeDoc(legacy, emptyDoc());
    expect(m.examDate.value).toBeNull();
    expect(m.goalDays).toEqual({});
  });
});
