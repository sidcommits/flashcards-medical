import type { Flag } from './merge';

const KEYS = {
  bookmarks: 'flashcards.bookmarks.v1',
  hidden: 'flashcards.hidden.v1',
  mastered: 'flashcards.mastered.v1',
} as const;

type Kind = keyof typeof KEYS;

export function loadFlags(kind: Kind): Record<string, Flag> {
  if (typeof localStorage === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(KEYS[kind]) || '{}'); } catch { return {}; }
}

function saveFlags(kind: Kind, map: Record<string, Flag>): void {
  localStorage.setItem(KEYS[kind], JSON.stringify(map));
}

function setFlag(kind: Kind, id: string, on: boolean): void {
  const map = loadFlags(kind);
  map[id] = { on, ts: Date.now() };
  saveFlags(kind, map);
}

function isOn(kind: Kind, id: string): boolean {
  return loadFlags(kind)[id]?.on === true;
}

export const isBookmarked = (id: string) => isOn('bookmarks', id);
export const isHidden = (id: string) => isOn('hidden', id);
export const setBookmark = (id: string, on: boolean) => setFlag('bookmarks', id, on);
export const setHidden = (id: string, on: boolean) => setFlag('hidden', id, on);
export const isMastered = (id: string) => isOn('mastered', id);
export const setMastered = (id: string, on: boolean) => setFlag('mastered', id, on);
export { KEYS as FLAG_KEYS };
