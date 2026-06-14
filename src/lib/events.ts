'use client';

export type OutboxEvent = {
  event_id: string;
  card_id: string;
  grade: string;
  reviewed_at: number;
  local_date: string; // YYYY-MM-DD in the device's timezone
  prev_state: number;
  new_state: number;
};

const KEY = 'flashcards.events.outbox';

function load(): OutboxEvent[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function save(list: OutboxEvent[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function outboxSize(): number {
  return load().length;
}

function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Record a grade as a durable event in the local outbox. */
export function recordEvent(e: { cardId: string; grade: string; prevState: number; newState: number }): void {
  const list = load();
  list.push({
    event_id: uuid(),
    card_id: e.cardId,
    grade: e.grade,
    reviewed_at: Date.now(),
    local_date: localDate(),
    prev_state: e.prevState,
    new_state: e.newState,
  });
  save(list);
}

/**
 * Flush queued events to the server. On success, drops exactly the events that
 * were sent (anything recorded mid-request is preserved). On 401 redirects to
 * login. On 503 (log unavailable, e.g. server on old Node) keeps the queue for
 * later. Any other non-ok status throws so the caller can mark sync offline.
 */
export async function flushEvents(): Promise<void> {
  const sending = load();
  if (sending.length === 0) return;
  const res = await fetch('/api/events', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: sending }),
  });
  if (res.status === 401) {
    window.location.href = '/login.html';
    return;
  }
  if (res.status === 503) return; // log unavailable — retry next flush
  if (!res.ok) throw new Error(`events ${res.status}`);
  // Success: keep only events appended while the request was in flight.
  save(load().slice(sending.length));
}

let timer: ReturnType<typeof setTimeout> | null = null;
/** Debounced flush — call after recording an event. Never rejects. */
export function flushEventsDebounced(delay = 2500): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    flushEvents().catch(() => {});
  }, delay);
}
