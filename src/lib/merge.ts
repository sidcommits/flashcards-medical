import type { Review } from './srs';

export type Flag = { on: boolean; ts: number };

export type ProgressDoc = {
  version: 1;
  updatedAt: number;
  resetAt: number | null;
  reviews: Record<string, Review>;
  bookmarks: Record<string, Flag>;
  hidden: Record<string, Flag>;
};

export function mergeMap<T>(a: Record<string, T>, b: Record<string, T>, tsOf: (v: T) => number): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [id, v] of Object.entries(b || {})) {
    if (!out[id] || tsOf(v) >= tsOf(out[id])) out[id] = v;
  }
  return out;
}

export function emptyDoc(): ProgressDoc {
  return { version: 1, updatedAt: Date.now(), resetAt: null, reviews: {}, bookmarks: {}, hidden: {} };
}

export function mergeDoc(a: ProgressDoc, b: ProgressDoc): ProgressDoc {
  return {
    version: 1,
    updatedAt: Date.now(),
    resetAt: b.resetAt ?? a.resetAt ?? null,
    reviews: mergeMap(a.reviews, b.reviews, (r) => r.ts ?? 0),
    bookmarks: mergeMap(a.bookmarks, b.bookmarks, (f) => f.ts ?? 0),
    hidden: mergeMap(a.hidden, b.hidden, (f) => f.ts ?? 0),
  };
}
