'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { bySubject, loadAllCards, visibleCards, type Card } from '@/lib/cards';
import { loadFlags } from '@/lib/flags';
import { getReview } from '@/lib/store';
import { isDue } from '@/lib/srs';
import { loadManifest, resolveSubjectMeta, type SubjectMeta } from '@/lib/theme';
import { Button } from './ui';

type Row = { subject: string; total: number; due: number; meta: SubjectMeta };

export default function SubjectGrid() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [manifest, setManifest] = useState<Record<string, Partial<SubjectMeta>>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, m] = await Promise.all([loadAllCards(), loadManifest()]);
      if (!alive) return;
      setCards(c);
      setManifest(m);
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
      const due = list.filter((c) => isDue(getReview(c.id))).length;
      out.push({ subject, total: list.length, due, meta: meta.get(subject)! });
    }
    return out.sort((a, b) => a.meta.order - b.meta.order);
  }, [cards, manifest]);

  const totalDue = rows.reduce((n, r) => n + r.due, 0);

  const bookmarkCount = useMemo(() => Object.values(loadFlags('bookmarks')).filter((f) => f.on).length, [cards]);
  const hiddenCount = useMemo(() => Object.values(loadFlags('hidden')).filter((f) => f.on).length, [cards]);

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
      {totalDue > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted">
            <span className="font-display text-ink">{totalDue}</span> card
            {totalDue === 1 ? '' : 's'} due across all subjects
          </p>
          <Link href="/study">
            <Button>Study everything due</Button>
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/bookmarked" className="card-face px-4 py-2 text-sm hover:text-accent">★ Bookmarked ({bookmarkCount})</Link>
        {hiddenCount > 0 && (
          <Link href="/hidden" className="card-face px-4 py-2 text-sm text-muted hover:text-accent">Hidden ({hiddenCount})</Link>
        )}
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
                  <span className="font-medium text-accent">{r.due} due</span>
                </>
              )}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
