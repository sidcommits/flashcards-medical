import { Review } from './srs';

const KEY = 'flashcards.reviews.v1';

type Store = Record<string, Review>;

// Parse the store once and reuse it. getReview is called once per card inside
// tight loops (home grid, /struggling, the study queue), so re-parsing
// localStorage on every call meant O(cards) full JSON.parses per render — the
// home screen alone did ~9k parses and took >1s. Every write path below keeps
// this cache in sync, and writes replace (never mutate) the object so a map
// already handed to a caller via loadReviews() stays stable.
let cache: Store | null = null;

export function loadStore(): Store {
  if (cache) return cache;
  if (typeof window === 'undefined') return {};
  try {
    cache = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    cache = {};
  }
  return cache!;
}

export function getReview(id: string): Review | undefined {
  return loadStore()[id];
}

export function saveReview(id: string, r: Review): void {
  cache = { ...loadStore(), [id]: r };
  localStorage.setItem(KEY, JSON.stringify(cache));
}

export function resetStore(): void {
  cache = {};
  if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
}

export function loadReviews(): Record<string, Review> {
  return loadStore();
}

export function replaceReviews(map: Record<string, Review>): void {
  cache = map;
  localStorage.setItem(KEY, JSON.stringify(map));
}
