import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (k in mem ? mem[k] : null),
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
});

import { isBookmarked, setBookmark, isHidden, setHidden, isMastered, setMastered, loadFlags } from './flags';

beforeEach(() => { for (const k of Object.keys(mem)) delete mem[k]; });

describe('flags', () => {
  it('bookmark toggles and persists with ts', () => {
    expect(isBookmarked('c1')).toBe(false);
    setBookmark('c1', true);
    expect(isBookmarked('c1')).toBe(true);
    expect(loadFlags('bookmarks').c1.ts).toBeGreaterThan(0);
    setBookmark('c1', false);
    expect(isBookmarked('c1')).toBe(false);
  });
  it('hidden toggles', () => {
    setHidden('c2', true);
    expect(isHidden('c2')).toBe(true);
  });

  it('mastered toggles and persists with ts', () => {
    expect(isMastered('c3')).toBe(false);
    setMastered('c3', true);
    expect(isMastered('c3')).toBe(true);
    expect(loadFlags('mastered').c3.ts).toBeGreaterThan(0);
    setMastered('c3', false);
    expect(isMastered('c3')).toBe(false);
  });

  it('setMastered never writes the reviews store (progress frozen)', () => {
    const reviewsBefore = JSON.stringify({ c1: { stability: 9, difficulty: 5, state: 2, due: 1, reps: 3, lapses: 0, ts: 7 } });
    mem['flashcards.reviews.v1'] = reviewsBefore;
    setMastered('c1', true);
    expect(mem['flashcards.reviews.v1']).toBe(reviewsBefore); // byte-identical
  });
});
