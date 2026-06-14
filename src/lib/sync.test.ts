import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// --- stub localStorage BEFORE importing sync ---
const mem: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (k in mem ? mem[k] : null),
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
});

// --- stub window (location + event listeners used by sync) ---
const loc = { href: '' };
vi.stubGlobal('window', {
  location: loc,
  addEventListener: () => {},
  removeEventListener: () => {},
});

// import AFTER stubs
import { pullAndMerge, pushReset, onSyncStatus } from './sync';
import type { ProgressDoc } from './merge';

const REVIEWS_KEY = 'flashcards.reviews.v1';
// Keys kept for potential future assertions
const _BOOKMARKS_KEY = 'flashcards.bookmarks.v1';
const _HIDDEN_KEY = 'flashcards.hidden.v1';
void _BOOKMARKS_KEY; void _HIDDEN_KEY;

function emptyRemote(): ProgressDoc {
  return { version: 1, updatedAt: 1, resetAt: null, reviews: {}, bookmarks: {}, hidden: {} };
}

function remoteWithReview(): ProgressDoc {
  return {
    version: 1,
    updatedAt: 100,
    resetAt: null,
    reviews: {
      'card-abc': { stability: 2.6, difficulty: 5, state: 2, reps: 1, lapses: 0, due: 9999, ts: 500 },
    },
    bookmarks: {},
    hidden: {},
  };
}

beforeEach(() => {
  // clear mem storage
  for (const k of Object.keys(mem)) delete mem[k];
  loc.href = '';
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('pullAndMerge', () => {
  it('happy path: GET returns ProgressDoc, PUT returns canonical → writeLocal persists reviews', async () => {
    const remote = remoteWithReview();
    const canonical: ProgressDoc = {
      ...remoteWithReview(),
      updatedAt: 200,
    };

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => remote })   // GET
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => canonical }) // PUT
    );

    await pullAndMerge();

    const stored = JSON.parse(mem[REVIEWS_KEY] ?? '{}');
    expect(stored['card-abc']).toBeDefined();
    expect(stored['card-abc'].stability).toBe(2.6);
    expect(stored['card-abc'].ts).toBe(500);
  });

  it('happy path: status ends as synced', async () => {
    const remote = emptyRemote();
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => remote })
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => remote })
    );

    let lastStatus = '';
    const unsub = onSyncStatus((s) => { lastStatus = s; });
    await pullAndMerge();
    unsub();

    expect(lastStatus).toBe('synced');
  });

  it('offline: fetch rejects → status ends offline, localStorage unchanged', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    // pre-set something in storage to verify it is unchanged
    mem[REVIEWS_KEY] = JSON.stringify({ 'pre-existing': { stability: 1, difficulty: 5, state: 0, reps: 0, lapses: 0, due: 0, ts: 1 } });

    let lastStatus = '';
    const unsub = onSyncStatus((s) => { lastStatus = s; });
    await pullAndMerge();
    unsub();

    expect(lastStatus).toBe('offline');
    // localStorage should still have the pre-existing review
    const stored = JSON.parse(mem[REVIEWS_KEY] ?? '{}');
    expect(stored['pre-existing']).toBeDefined();
  });

  it('401 on GET: sets window.location.href and does NOT write reviews', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({}) })
    );

    await pullAndMerge();

    expect(loc.href).toBe('/login.html');
    // should not have written anything to the reviews key
    expect(mem[REVIEWS_KEY]).toBeUndefined();
  });

  it('401 on PUT: does not set synced status and redirects to login', async () => {
    const remote = remoteWithReview();
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => remote })   // GET ok
      .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({}) })   // PUT 401
    );

    let lastStatus = '';
    const unsub = onSyncStatus((s) => { lastStatus = s; });
    await pullAndMerge();
    unsub();

    // After 401 on PUT we early-return, never call setStatus('synced')
    expect(lastStatus).not.toBe('synced');
    expect(loc.href).toBe('/login.html');
  });
});

describe('pushReset', () => {
  it('happy path: calls PUT with reset:true', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ status: 200, ok: true, json: async () => emptyRemote() });
    vi.stubGlobal('fetch', fetchMock);

    await pushReset();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/progress');
    expect(init?.method).toBe('PUT');
    const body = JSON.parse(init?.body as string);
    expect(body.reset).toBe(true);
  });

  it('offline: pushReset swallows the error silently', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    // should not throw
    await expect(pushReset()).resolves.toBeUndefined();
  });
});
