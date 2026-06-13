import { describe, it, expect } from 'vitest';
import { mergeMap, mergeDoc, emptyDoc, type ProgressDoc } from './merge';

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
});
