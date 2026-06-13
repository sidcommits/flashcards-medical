import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { isHidden } from './flags';

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
  const text = await fetch(url, { cache: 'no-store' }).then((r) => r.text());
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  return rowsToCards(data);
}

async function parseXlsx(url: string): Promise<Card[]> {
  const buf = await fetch(url, { cache: 'no-store' }).then((r) => r.arrayBuffer());
  const wb = XLSX.read(buf);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
  const rows = raw.map((r) => {
    const o: Record<string, string> = {};
    for (const k of Object.keys(r)) o[k.trim().toLowerCase()] = String(r[k]);
    return o;
  });
  return rowsToCards(rows);
}

export async function loadAllCards(): Promise<Card[]> {
  const { files } = await fetch(`${BASE}/decks/index.json`, { cache: 'no-store' }).then((r) =>
    r.json()
  );
  const all = await Promise.all(
    files.map((f: string) =>
      /\.xlsx$/i.test(f) ? parseXlsx(`${BASE}/decks/${f}`) : parseCsv(`${BASE}/decks/${f}`)
    )
  );
  const map = new Map<string, Card>();
  for (const c of all.flat()) map.set(c.id, c); // de-dupe; last wins
  return [...map.values()];
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

/** Cards not soft-hidden by the user. Use everywhere study queues/counts are built. */
export function visibleCards(cards: Card[]): Card[] {
  return cards.filter((c) => !isHidden(c.id));
}
