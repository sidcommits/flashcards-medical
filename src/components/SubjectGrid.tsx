'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { bySubject, loadAllCards, visibleCards, type Card } from '@/lib/cards';
import { loadFlags } from '@/lib/flags';
import { getReview } from '@/lib/store';
import { isLeech, splitCounts } from '@/lib/srs';
import { loadManifest, resolveSubjectMeta, type SubjectMeta } from '@/lib/theme';
import { loadExamDate, loadGoalDays } from '@/lib/profile';
import { readiness, streak } from '@/lib/stats';
import { Button } from './ui';

type Row = { subject: string; total: number; due: number; left: number; meta: SubjectMeta };

export default function SubjectGrid() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [manifest, setManifest] = useState<Record<string, Partial<SubjectMeta>>>({});
  const [counts, setCounts] = useState({ bookmarks: 0, hidden: 0, mastered: 0, struggling: 0 });
  const [insight, setInsight] = useState<{ streak: number; ready: number | null }>({ streak: 0, ready: null });
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, m] = await Promise.all([loadAllCards(), loadManifest()]);
      if (!alive) return;
      setCards(c);
      setManifest(m);
      // Count against the actual cards so the badges match their destinations:
      // bookmarks excludes hidden cards (like the Bookmarked landing), hidden
      // counts existing hidden cards (like the Hidden list). A bookmarked card
      // that's also hidden shows under Hidden only — never as a phantom bookmark.
      const bm = loadFlags('bookmarks');
      const hd = loadFlags('hidden');
      const ms = loadFlags('mastered');
      setCounts({
        bookmarks: visibleCards(c).filter((card) => bm[card.id]?.on).length,
        hidden: c.filter((card) => hd[card.id]?.on).length,
        mastered: c.filter((card) => ms[card.id]?.on).length,
        struggling: visibleCards(c).filter((card) => isLeech(getReview(card.id))).length,
      });
      const exam = loadExamDate().value;
      const visible = visibleCards(c);
      const reviewsMap = Object.fromEntries(
        visible.map((card) => [card.id, getReview(card.id)]).filter(([, r]) => r) as [string, NonNullable<ReturnType<typeof getReview>>][]
      );
      setInsight({ streak: streak(loadGoalDays()), ready: readiness(visible, reviewsMap, exam) });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows: Row[] = useMemo(() => {
    if (!cards) return [];
    const visible = visibleCards(cards);
    const groups = bySubject(visible);
    const meta = resolveSubjectMeta([...groups.keys()], manifest);
    const out: Row[] = [];
    for (const [subject, list] of groups) {
      const { due, left } = splitCounts(list, getReview);
      out.push({ subject, total: list.length, due, left, meta: meta.get(subject)! });
    }
    return out.sort((a, b) => a.meta.order - b.meta.order);
  }, [cards, manifest]);

  const totalDue = rows.reduce((n, r) => n + r.due, 0);
  const totalLeft = rows.reduce((n, r) => n + r.left, 0);

  const studyBucket = (e: React.MouseEvent, subject: string, mode: 'due' | 'left') => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/study?subject=${encodeURIComponent(subject)}&mode=${mode}`);
  };

  if (!cards) {
    return <p className="py-16 text-center text-muted">Loading cards…</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="card-face mt-6 p-8 text-center text-muted">
        <p className="font-display text-lg text-ink">No cards yet.</p>
        <p className="mt-2 text-sm">
          Add a CSV to <code className="rounded bg-line/40 px-1">public/decks/</code> with the header{' '}
          <code className="rounded bg-line/40 px-1">subject,deck,topic,front,back</code> and refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {totalDue + totalLeft > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted">
            <span className="font-display text-accent">{totalDue}</span> due
            {totalLeft > 0 && (
              <>
                {' · '}
                <span className="font-display text-ink">{totalLeft}</span> left
              </>
            )}
            {' '}across all subjects
          </p>
          <Link href="/study">
            <Button>Study everything</Button>
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/bookmarked" className="card-face px-4 py-2 text-sm hover:text-accent">★ Bookmarked ({counts.bookmarks})</Link>
        {counts.hidden > 0 && (
          <Link href="/hidden" className="card-face px-4 py-2 text-sm text-muted hover:text-accent">Hidden ({counts.hidden})</Link>
        )}
        {counts.mastered > 0 && (
          <Link href="/mastered" className="card-face px-4 py-2 text-sm text-[#1f5d54] hover:text-accent">✓ Mastered ({counts.mastered})</Link>
        )}
        {counts.struggling > 0 && (
          <Link href="/struggling" className="card-face px-4 py-2 text-sm text-[#8a4b1a] hover:text-accent">⚑ Struggling ({counts.struggling})</Link>
        )}
        <Link href="/stats" className="card-face px-4 py-2 text-sm hover:text-accent">
          🔥 {insight.streak}{insight.ready != null ? ` · ${Math.round(insight.ready * 100)}% ready` : ''}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <Link
            key={r.subject}
            href={`/browse?subject=${encodeURIComponent(r.subject)}`}
            className="card-face group flex flex-col gap-3 p-6 transition-transform hover:-translate-y-0.5"
            style={{ ['--accent' as string]: r.meta.color }}
          >
            <h2 className="font-display text-xl font-semibold leading-tight text-ink">
              {r.subject}
            </h2>
            <div className="h-1 w-12 rounded-full bg-accent" />
            {r.meta.blurb && <p className="text-sm text-muted">{r.meta.blurb}</p>}
            <p className="mt-auto text-sm text-muted">
              {r.total} card{r.total === 1 ? '' : 's'}
              {r.due > 0 && (
                <>
                  {' · '}
                  <button
                    type="button"
                    onClick={(e) => studyBucket(e, r.subject, 'due')}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {r.due} due
                  </button>
                </>
              )}
              {r.left > 0 && (
                <>
                  {' · '}
                  <button
                    type="button"
                    onClick={(e) => studyBucket(e, r.subject, 'left')}
                    className="font-medium text-ink underline-offset-2 hover:underline"
                  >
                    {r.left} left
                  </button>
                </>
              )}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
