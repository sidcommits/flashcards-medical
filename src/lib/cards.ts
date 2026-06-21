import Papa from 'papaparse';
import { loadFlags } from './flags';

export type Card = {
  id: string;
  subject: string;
  deck: string;
  topic: string;
  front: string;
  back: string;
  hint?: string;
  isDraw: boolean;
};

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

// FNV-1a hash -> base36 string id
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function rowsToCards(rows: Record<string, string>[]): Card[] {
  const out: Card[] = [];
  for (const r of rows) {
    const front = (r.front ?? '').trim();
    const back = (r.back ?? '').trim();
    if (!front || !back) continue;
    const subject = (r.subject ?? 'General').trim();
    const deck = (r.deck ?? 'General').trim();
    out.push({
      id: hash(`${subject}|${deck}|${front}`),
      subject,
      deck,
      topic: (r.topic ?? 'General').trim(),
      front,
      back,
      hint: (r.hint ?? '').trim() || undefined,
      isDraw: front.startsWith('[DRAW'),
    });
  }
  return out;
}

async function parseCsv(url: string): Promise<Card[]> {
  const text = await fetch(url).then((r) => r.text());
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  return rowsToCards(data);
}

async function fetchAllCards(): Promise<Card[]> {
  const { files } = await fetch(`${BASE}/decks/index.json`).then((r) => r.json());
  const all = await Promise.all(
    files.map((f: string) => parseCsv(`${BASE}/decks/${f}`))
  );
  const map = new Map<string, Card>();
  for (const c of all.flat()) map.set(c.id, c); // de-dupe; last wins
  return [...map.values()];
}

// Cache the parsed cards for the lifetime of the page. Every route mounts a
// component that calls loadAllCards(); without this, each navigation (doubled
// by React StrictMode in dev) re-downloads and re-parses ~0.5 MB of CSV. A full
// page reload re-evaluates this module, so edited decks still appear on refresh.
let cardsPromise: Promise<Card[]> | null = null;

export function loadAllCards(): Promise<Card[]> {
  if (!cardsPromise) {
    cardsPromise = fetchAllCards().catch((err) => {
      cardsPromise = null; // don't cache a failure — allow retry on next call
      throw err;
    });
  }
  return cardsPromise;
}

// Grouping helpers
export function bySubject(cards: Card[]): Map<string, Card[]> {
  const m = new Map<string, Card[]>();
  for (const c of cards) (m.get(c.subject) ?? m.set(c.subject, []).get(c.subject)!).push(c);
  return m;
}

export function byDeck(cards: Card[]): Map<string, Card[]> {
  const m = new Map<string, Card[]>();
  for (const c of cards) (m.get(c.deck) ?? m.set(c.deck, []).get(c.deck)!).push(c);
  return m;
}

export function byTopic(cards: Card[]): Map<string, Card[]> {
  const m = new Map<string, Card[]>();
  for (const c of cards) (m.get(c.topic) ?? m.set(c.topic, []).get(c.topic)!).push(c);
  return m;
}

/** Cards the user hasn't soft-hidden or marked mastered. Use everywhere study queues/counts are built. */
export function visibleCards(cards: Card[]): Card[] {
  const hidden = loadFlags('hidden');
  const mastered = loadFlags('mastered');
  return cards.filter((c) => !hidden[c.id]?.on && !mastered[c.id]?.on);
}
