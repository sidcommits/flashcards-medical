import { fsrs, createEmptyCard, Rating, State, generatorParameters, type Card, type Grade as FsrsGrade } from 'ts-fsrs';

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export type Review = {
  stability: number;     // 0 for New cards; legacy SM-2 blobs lack it — detect via === undefined, never falsiness
  difficulty: number;    // 1..10 (FSRS)
  state: number;         // State enum: 0 New, 1 Learning, 2 Review, 3 Relearning
  lastReview?: number;   // epoch ms of previous grade; undefined if never reviewed
  due: number;           // epoch ms — when next due
  reps: number;
  lapses: number;
  ts: number;            // last graded, epoch ms — sync merge key (unchanged)
};

const DAY = 86_400_000;

// One scheduler for the whole app. 90% target retention is the recommended
// board-prep default; fuzz spreads reviews so they don't clump on one day.
// New-card feel (tuned 2026-06-30): a single 30-minute learning step, so
// Again -> ~30m and Hard -> ~45m (both stay "in learning"); Good and Easy
// graduate immediately. We nudge the FSRS-6 initial-stability weights for the
// first Good/Easy (w[2]/w[3]) so those first graduated intervals land near
// 3 days / 6 days at the 90% target. Only w[2]/w[3] are overridden — every
// other weight (and thus all mature-card growth) stays at the FSRS-6 default,
// so existing cards' future scheduling is unchanged. No optimizer.
const w = [...generatorParameters().w];
w[2] = 3.4; // initial stability after a first "Good" -> ~3 days
w[3] = 6.2; // initial stability after a first "Easy" -> ~6 days

const scheduler = fsrs({
  request_retention: 0.9,
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ['30m'],
  relearning_steps: ['30m'],
  w,
});

const RATING: Record<Grade, Rating> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

// Build a ts-fsrs Card from our stored Review. Legacy SM-2 blobs (no
// `stability`) are seeded in place: stability from the old interval, a neutral
// difficulty, and the existing due date preserved. Approximate but
// self-correcting — FSRS refines difficulty/stability on the next review.
function toCard(prev: Review): Card {
  const c = createEmptyCard(new Date(prev.due));
  const reps = prev.reps ?? 0;
  c.reps = reps;
  c.lapses = prev.lapses ?? 0;

  if (prev.stability === undefined) {
    // legacy SM-2 blob (no FSRS state) -> seed it
    const interval = (prev as { interval?: number }).interval ?? 0;
    const reviewed = reps > 0;
    c.stability = Math.max(interval, 0.1);
    c.difficulty = 5;
    c.state = reviewed ? State.Review : State.New;
    c.last_review = reviewed ? new Date(prev.due - interval * DAY) : undefined;
  } else {
    c.stability = prev.stability;
    c.difficulty = prev.difficulty;
    c.state = prev.state as State;
    c.last_review = prev.lastReview !== undefined ? new Date(prev.lastReview) : undefined;
  }
  return c;
}

// Fold a scheduled Card back into our Review (Date -> epoch ms), stamping ts.
function fromCard(c: Card): Review {
  return {
    stability: c.stability,
    difficulty: c.difficulty,
    state: c.state,
    lastReview: c.last_review ? c.last_review.getTime() : undefined,
    due: c.due.getTime(),
    reps: c.reps,
    lapses: c.lapses,
    ts: Date.now(),
  };
}

export function newReview(): Review {
  return fromCard(createEmptyCard());
}

export function schedule(prev: Review, grade: Grade): Review {
  const { card } = scheduler.next(toCard(prev), new Date(), RATING[grade] as FsrsGrade);
  return fromCard(card);
}

export function isDue(r: Review | undefined): boolean {
  return !r || r.due <= Date.now();
}

/**
 * Split a card set into two disjoint counts for the deck/subject tiles:
 *   - `due`  = studied before and now resurfacing (has a review whose due time has passed)
 *   - `left` = never attempted even once (no review yet)
 * A studied card scheduled into the future counts as neither. Together with the
 * scheduled-ahead cards they make up the total. `reviewOf` is injected (usually
 * `getReview`) so this stays pure and testable.
 */
export function splitCounts(
  cards: readonly { id: string }[],
  reviewOf: (id: string) => Review | undefined,
): { due: number; left: number } {
  let due = 0;
  let left = 0;
  for (const c of cards) {
    const r = reviewOf(c.id);
    if (!r) left += 1;
    else if (r.due <= Date.now()) due += 1;
  }
  return { due, left };
}

export type StudyMode = 'mixed' | 'due' | 'left';

/**
 * Order a card set into a study queue for the given mode (mirrors splitCounts'
 * buckets). Due cards (prior review whose due time has passed) come first,
 * soonest-due first; never-seen cards follow in input order. `'due'` keeps only
 * the due group; `'left'` keeps only the never-seen group; `'mixed'` (default)
 * returns both. Cards reviewed but scheduled ahead are in neither group.
 * Pure — `reviewOf` is injected; the caller shuffles the `'left'` result when it
 * wants randomized new cards (kept out of here so this stays deterministic).
 */
export function studyQueue<T extends { id: string }>(
  cards: readonly T[],
  reviewOf: (id: string) => Review | undefined,
  mode: StudyMode = 'mixed',
): T[] {
  const withReview: { c: T; due: number }[] = [];
  const fresh: T[] = [];
  for (const c of cards) {
    const r = reviewOf(c.id);
    if (!r) fresh.push(c);
    else if (r.due <= Date.now()) withReview.push({ c, due: r.due });
  }
  withReview.sort((a, b) => a.due - b.due);
  const due = withReview.map((x) => x.c);
  if (mode === 'due') return due;
  if (mode === 'left') return fresh;
  return [...due, ...fresh];
}

/** A card she keeps failing — lapsed this many times or more. */
export const LEECH_LAPSES = 4;

/** True when a card has lapsed enough to count as a "leech" (struggling). */
export function isLeech(r: Review | undefined): boolean {
  return (r?.lapses ?? 0) >= LEECH_LAPSES;
}

// Short human label for the next-due preview on each grade button.
export function previewInterval(prev: Review, grade: Grade): string {
  const now = new Date();
  // preview uses repeat(); the actual grade uses next(); fuzz makes the two differ slightly
  const preview = scheduler.repeat(toCard(prev), now);
  const due = preview[RATING[grade] as FsrsGrade].card.due.getTime();
  return formatInterval(due - now.getTime());
}

/** FSRS-predicted recall probability for this card at a given date (0..1). */
export function retrievabilityAt(prev: Review, date: Date): number {
  return scheduler.get_retrievability(toCard(prev), date, false);
}

function formatInterval(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(ms / 3_600_000);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(ms / 86_400_000);
  if (days < 30) return `${days}d`;
  const rawDays = ms / 86_400_000;
  const months = rawDays / 30;
  if (months < 12) return `${months < 10 ? months.toFixed(1) : Math.round(months)}mo`;
  return `${(rawDays / 365).toFixed(1)}y`;
}
