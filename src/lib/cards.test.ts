import { describe, it, expect, vi } from 'vitest';
const mem: Record<string, string> = { 'flashcards.hidden.v1': JSON.stringify({ b: { on: true, ts: 1 } }) };
vi.stubGlobal('localStorage', { getItem: (k: string) => mem[k] ?? null, setItem: () => {}, removeItem: () => {} });
import { visibleCards } from './cards';

describe('visibleCards', () => {
  it('drops hidden cards', () => {
    const cards = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as any;
    expect(visibleCards(cards).map((c: any) => c.id)).toEqual(['a', 'c']);
  });
});
