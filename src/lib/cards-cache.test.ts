import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('loadAllCards caching', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('fetches the deck files once and reuses the parsed result across calls', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).endsWith('index.json')) {
        return { json: async () => ({ files: ['a.csv'] }) } as unknown as Response;
      }
      return { text: async () => 'subject,deck,topic,front,back\nS,D,T,Q,A\n' } as unknown as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const mod = await import('./cards');
    const first = await mod.loadAllCards();
    const second = await mod.loadAllCards();

    expect(second).toBe(first); // same cached array reference
    // index.json (1) + a.csv (1) = 2 fetches total — NOT 4 (no per-call refetch)
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
