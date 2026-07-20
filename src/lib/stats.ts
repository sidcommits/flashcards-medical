import { retrievabilityAt, type Review } from './srs';
import { todayLocal } from './profile';
import type { Card } from './cards';
import type { Flag } from './merge';

const DAY = 86_400_000;

/** Whole days from now until end of the exam day; null if no date. */
export function daysUntil(examDate: string | null): number | null {
  if (!examDate) return null;
  const exam = new Date(`${examDate}T23:59:59`).getTime();
  return Math.max(0, Math.ceil((exam - Date.now()) / DAY));
}

/**
 * Mean FSRS recall probability across all cards at the exam date. Never-studied
 * cards count as 0 (you won't recall what you haven't learned). null if no date
 * or no cards.
 */
export function readiness(cards: Card[], reviews: Record<string, Review>, examDate: string | null): number | null {
  if (!examDate || cards.length === 0) return null;
  const exam = new Date(`${examDate}T23:59:59`);
  let sum = 0;
  for (const c of cards) {
    const r = reviews[c.id];
    sum += r ? retrievabilityAt(r, exam) : 0;
  }
  return sum / cards.length;
}

/** Count of cards due in each of the next `days` days; overdue counted in day 0. */
export function dueForecast(cards: Card[], reviews: Record<string, Review>, days = 7): number[] {
  const buckets = new Array(days).fill(0);
  const now = Date.now();
  for (const c of cards) {
    const r = reviews[c.id];
    if (!r) continue;
    const d = Math.floor((r.due - now) / DAY);
    if (d < 0) buckets[0] += 1;
    else if (d < days) buckets[d] += 1;
  }
  return buckets;
}

/** Consecutive goal-met days ending today (or yesterday if today not yet met). */
export function streak(goalDays: Record<string, Flag>, today = todayLocal()): number {
  const met = (d: string) => goalDays[d]?.on === true;
  const shift = (iso: string, n: number) => {
    const dt = new Date(`${iso}T12:00:00`);
    dt.setDate(dt.getDate() + n);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  let cursor = met(today) ? today : shift(today, -1);
  let n = 0;
  while (met(cursor)) {
    n += 1;
    cursor = shift(cursor, -1);
  }
  return n;
}

/** Average reviews/day over the most recent `windowDays` active days. */
export function recentAvgPerDay(reviewedByDay: Record<string, number>, windowDays = 7): number {
  const counts = Object.entries(reviewedByDay)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, windowDays)
    .map(([, c]) => c);
  if (counts.length === 0) return 0;
  return counts.reduce((a, b) => a + b, 0) / counts.length;
}

/** On pace if the not-yet-ready cards fit the remaining days at her recent rate. */
export function onPace(x: { cardsNotReady: number; daysLeft: number; recentAvg: number }): boolean {
  if (x.daysLeft <= 0) return false;
  if (x.recentAvg <= 0) return x.cardsNotReady === 0;
  return x.cardsNotReady / x.daysLeft <= x.recentAvg;
}

/** Count of cards whose exam-day recall is below `threshold` (for on-pace input). */
export function cardsNotReady(cards: Card[], reviews: Record<string, Review>, examDate: string, threshold = 0.9): number {
  const exam = new Date(`${examDate}T23:59:59`);
  let n = 0;
  for (const c of cards) {
    const r = reviews[c.id];
    const ret = r ? retrievabilityAt(r, exam) : 0;
    if (ret < threshold) n += 1;
  }
  return n;
}
