import { describe, it, expect } from 'vitest';
import { newReview, schedule } from './srs';

describe('srs ts field', () => {
  it('newReview has a ts', () => {
    expect(newReview().ts).toBeGreaterThan(0);
  });
  it('schedule stamps ts', () => {
    const r = schedule(newReview(), 'good');
    expect(r.ts).toBeGreaterThan(0);
  });
});
