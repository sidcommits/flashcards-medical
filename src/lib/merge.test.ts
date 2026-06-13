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
    const older: Review = { ease: 2.5, interval: 1, reps: 0, lapses: 0, due: 0, ts: 100 };
    const newer: Review = { ease: 2.6, interval: 2, reps: 1, lapses: 0, due: 0, ts: 200 };
    const a: ProgressDoc = { ...emptyDoc(), reviews: { 'card-1': older } };
    const b: ProgressDoc = { ...emptyDoc(), reviews: { 'card-1': newer } };
    const merged = mergeDoc(a, b);
    expect(merged.reviews['card-1'].ts).toBe(200);
    expect(merged.reviews['card-1'].ease).toBe(2.6);
  });

  // Test A-2: entry missing .ts is treated as 0 (older)
  it('reviews merge: entry missing ts treated as 0 (older)', () => {
    const withTs: Review = { ease: 2.5, interval: 1, reps: 0, lapses: 0, due: 0, ts: 50 };
    const noTs = { ease: 2.9, interval: 3, reps: 2, lapses: 0, due: 0 } as unknown as Review;
    const a: ProgressDoc = { ...emptyDoc(), reviews: { 'card-x': noTs } };
    const b: ProgressDoc = { ...emptyDoc(), reviews: { 'card-x': withTs } };
    const merged = mergeDoc(a, b);
    // withTs (ts=50) should win over noTs (ts=undefined → 0)
    expect(merged.reviews['card-x'].ts).toBe(50);
    expect(merged.reviews['card-x'].ease).toBe(2.5);
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
