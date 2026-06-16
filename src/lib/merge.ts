import type { Review } from './srs';

export type Flag = { on: boolean; ts: number };

export type ExamDate = { value: string | null; ts: number };

export type ProgressDoc = {
  version: 1;
  updatedAt: number;
  resetAt: number | null;
  reviews: Record<string, Review>;
  bookmarks: Record<string, Flag>;
  hidden: Record<string, Flag>;
  mastered: Record<string, Flag>;
  examDate: ExamDate;
  goalDays: Record<string, Flag>;
};

export function mergeMap<T>(a: Record<string, T>, b: Record<string, T>, tsOf: (v: T) => number): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [id, v] of Object.entries(b || {})) {
    if (!out[id] || tsOf(v) >= tsOf(out[id])) out[id] = v;
  }
  return out;
}

const NO_EXAM: ExamDate = { value: null, ts: 0 };
function mergeExam(a?: ExamDate, b?: ExamDate): ExamDate {
  const x = a ?? NO_EXAM, y = b ?? NO_EXAM;
  return (y.ts >= x.ts ? y : x);
}

export function emptyDoc(): ProgressDoc {
  return { version: 1, updatedAt: Date.now(), resetAt: null, reviews: {}, bookmarks: {}, hidden: {}, mastered: {}, examDate: { value: null, ts: 0 }, goalDays: {} };
}

export function mergeDoc(a: ProgressDoc, b: ProgressDoc): ProgressDoc {
  return {
    version: 1,
    updatedAt: Date.now(),
    resetAt: Math.max(a.resetAt ?? 0, b.resetAt ?? 0) || null,
    reviews: mergeMap(a.reviews ?? {}, b.reviews ?? {}, (r) => r.ts ?? 0),
    bookmarks: mergeMap(a.bookmarks ?? {}, b.bookmarks ?? {}, (f) => f.ts ?? 0),
    hidden: mergeMap(a.hidden ?? {}, b.hidden ?? {}, (f) => f.ts ?? 0),
    mastered: mergeMap(a.mastered ?? {}, b.mastered ?? {}, (f) => f.ts ?? 0),
    examDate: mergeExam(a.examDate, b.examDate),
    goalDays: mergeMap(a.goalDays ?? {}, b.goalDays ?? {}, (f) => f.ts ?? 0),
  };
}
