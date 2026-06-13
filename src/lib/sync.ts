'use client';

import { loadReviews, replaceReviews } from './store';
import { loadFlags, FLAG_KEYS } from './flags';
import { mergeDoc, emptyDoc, type ProgressDoc } from './merge';

type Status = 'idle' | 'syncing' | 'synced' | 'offline';
let status: Status = 'idle';
const listeners = new Set<(s: Status) => void>();
function setStatus(s: Status) { status = s; listeners.forEach((l) => l(s)); }
export function onSyncStatus(l: (s: Status) => void) { listeners.add(l); l(status); return () => listeners.delete(l); }

function localDoc(): ProgressDoc {
  return {
    ...emptyDoc(),
    reviews: loadReviews(),
    bookmarks: loadFlags('bookmarks'),
    hidden: loadFlags('hidden'),
  };
}

function writeLocal(doc: ProgressDoc) {
  replaceReviews(doc.reviews);
  localStorage.setItem(FLAG_KEYS.bookmarks, JSON.stringify(doc.bookmarks));
  localStorage.setItem(FLAG_KEYS.hidden, JSON.stringify(doc.hidden));
}

async function api(method: string, body?: unknown): Promise<ProgressDoc | null> {
  const res = await fetch('/api/progress', {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { window.location.href = '/login.html'; return null; }
  if (!res.ok) throw new Error(`sync ${method} ${res.status}`);
  return res.json();
}

/** On load: pull remote, merge into local, push merged back so both sides converge. */
export async function pullAndMerge(): Promise<void> {
  try {
    setStatus('syncing');
    const remote = await api('GET');
    if (!remote) return;
    const merged = mergeDoc(localDoc(), remote as ProgressDoc);
    writeLocal(merged);
    const canonical = await api('PUT', { reviews: merged.reviews, bookmarks: merged.bookmarks, hidden: merged.hidden });
    if (!canonical) return;            // 401 -> navigating to login
    writeLocal(canonical as ProgressDoc);
    setStatus('synced');
  } catch {
    setStatus('offline');
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
/** After a grade or flag toggle: debounce a push of the current local state. */
export function pushDebounced(delay = 2000): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    try {
      setStatus('syncing');
      const d = localDoc();
      const canonical = await api('PUT', { reviews: d.reviews, bookmarks: d.bookmarks, hidden: d.hidden });
      if (canonical) writeLocal(canonical as ProgressDoc);
      setStatus('synced');
    } catch {
      setStatus('offline');
    }
  }, delay);
}

export async function pushReset(): Promise<void> {
  try { await api('PUT', { reset: true }); } catch { /* offline: local already cleared */ }
}

export type { Status };
