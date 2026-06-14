import { describe, it, expect, beforeEach, vi } from 'vitest';

// Stub localStorage BEFORE importing events (matches flags.test.ts / sync.test.ts pattern)
const mem: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (k in mem ? mem[k] : null),
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
});

import { recordEvent, flushEvents, outboxSize } from './events';

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  // Re-stub localStorage after unstubAllGlobals (unstub resets globals)
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
    clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
  });
});

const grade = (over = {}) => ({ cardId: 'c1', grade: 'good', prevState: 0, newState: 1, ...over });

describe('event outbox', () => {
  it('recordEvent appends to the outbox', () => {
    recordEvent(grade());
    recordEvent(grade({ cardId: 'c2' }));
    expect(outboxSize()).toBe(2);
  });

  it('flushEvents POSTs the queued events and clears them on success', async () => {
    recordEvent(grade());
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, inserted: 1 }) }) as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await flushEvents();

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const [url, opts] = call;
    expect(url).toBe('/api/events');
    expect(JSON.parse(opts.body as string).events).toHaveLength(1);
    expect(outboxSize()).toBe(0); // cleared
  });

  it('keeps events queued on 503 (log unavailable)', async () => {
    recordEvent(grade());
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }) as unknown as Response));
    await flushEvents();
    expect(outboxSize()).toBe(1); // retained for retry
  });

  it('throws (and keeps queue) on a real error status', async () => {
    recordEvent(grade());
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response));
    await expect(flushEvents()).rejects.toThrow();
    expect(outboxSize()).toBe(1);
  });
});
