import { describe, it, expect, vi } from 'vitest';
const mem: Record<string, string> = { 'flashcards.hidden.v1': JSON.stringify({ b: { on: true, ts: 1 } }) };
vi.stubGlobal('localStorage', { getItem: (k: string) => mem[k] ?? null, setItem: () => {}, removeItem: () => {} });
import { visibleCards } from './cards';

describe('visibleCards', () => {
  it('drops hidden cards', () => {
    const cards = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as Parameters<typeof visibleCards>[0];
    expect(visibleCards(cards).map((c) => c.id)).toEqual(['a', 'c']);
  });
});
