export type Grade = 'again' | 'hard' | 'good' | 'easy';

export type Review = {
  ease: number;     // ease factor, starts 2.5
  interval: number; // days
  due: number;      // epoch ms
  reps: number;
  lapses: number;
  ts: number;       // last graded, epoch ms — merge key for sync
};

const DAY = 86_400_000;

export function newReview(): Review {
  return { ease: 2.5, interval: 0, due: Date.now(), reps: 0, lapses: 0, ts: Date.now() };
}

export function schedule(prev: Review, grade: Grade): Review {
  let { ease, interval, reps, lapses } = prev;

  if (grade === 'again') {
    lapses += 1;
    ease = Math.max(1.3, ease - 0.2);
    return { ease, interval: 0, reps: 0, lapses, due: Date.now() + 10 * 60_000, ts: Date.now() };
  }

  if (reps === 0) {
    interval = grade === 'easy' ? 4 : 1;
  } else {
    const mult = grade === 'hard' ? 1.2 : grade === 'easy' ? ease * 1.3 : ease;
    interval = Math.max(1, Math.round(interval * mult));
  }

  if (grade === 'hard') ease = Math.max(1.3, ease - 0.15);
  if (grade === 'easy') ease = ease + 0.15;

  reps += 1;
  return { ease, interval, reps, lapses, due: Date.now() + interval * DAY, ts: Date.now() };
}

export function isDue(r: Review | undefined): boolean {
  return !r || r.due <= Date.now();
}

// human label for the "next due" preview on each grade button
export function previewInterval(prev: Review, grade: Grade): string {
  const next = schedule(prev, grade);
  if (grade === 'again') return '10m';
  return next.interval >= 1 ? `${next.interval}d` : '<1d';
}
