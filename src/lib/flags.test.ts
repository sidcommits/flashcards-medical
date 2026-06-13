import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (k in mem ? mem[k] : null),
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
});

import { isBookmarked, setBookmark, isHidden, setHidden, loadFlags } from './flags';

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
});
