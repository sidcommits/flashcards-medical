import { Review } from './srs';

const KEY = 'flashcards.reviews.v1';

type Store = Record<string, Review>;

export function loadStore(): Store {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function getReview(id: string): Review | undefined {
  return loadStore()[id];
}

export function saveReview(id: string, r: Review): void {
  const s = loadStore();
  s[id] = r;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function resetStore(): void {
  localStorage.removeItem(KEY);
}

export function loadReviews(): Record<string, Review> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export function replaceReviews(map: Record<string, Review>): void {
  localStorage.setItem(KEY, JSON.stringify(map));
}
