'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loadAllCards, visibleCards, type Card } from '@/lib/cards';
import { getReview } from '@/lib/store';
import { isLeech } from '@/lib/srs';
import { loadManifest, resolveSubjectMeta, type SubjectMeta } from '@/lib/theme';
import { BackLink } from './ui';
import Flashcard from './Flashcard';

type LoadedData = { struggling: Card[]; manifest: Record<string, Partial<SubjectMeta>> };

function useStrugglingData(refreshKey: string): LoadedData | null {
  const [data, setData] = useState<LoadedData | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const [all, manifest] = await Promise.all([loadAllCards(), loadManifest()]);
      if (!alive) return;
      const struggling = visibleCards(all).filter((c) => isLeech(getReview(c.id)));
      setData({ struggling, manifest });
    })();
    return () => { alive = false; };
  }, [refreshKey]);
  return data;
}

function StudyView({ cards, accent, heading }: { cards: Card[]; accent: string; heading: string }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const current = cards[i];
  return (
    <div className="flex flex-col gap-6" style={{ ['--accent' as string]: accent }}>
      <BackLink href="/struggling">Struggling</BackLink>
      <h1 className="font-display text-3xl font-semibold text-accent">{heading}</h1>
      {!current ? (
        <div className="card-face p-8 text-center">
          <p className="font-display text-xl text-ink">{cards.length === 0 ? 'No struggling cards here.' : `Done — reviewed all ${cards.length}.`}</p>
          {cards.length > 0 && (
            <button className="mt-4 text-sm text-accent" onClick={() => { setI(0); setFlipped(false); }}>Start over</button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">{i + 1} / {cards.length}</p>
          <Flashcard key={current.id} card={current} flipped={flipped} onFlip={() => setFlipped(true)} accent={accent} />
          <div className="flex justify-center">
            <button
              className="rounded-xl bg-accent px-4 py-2.5 font-display text-sm font-semibold text-white"
              onClick={() => { if (!flipped) { setFlipped(true); } else { setFlipped(false); setI((n) => n + 1); } }}
            >
              {flipped ? 'Next' : 'Show answer'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type SubjectRow = { subject: string; count: number; meta: SubjectMeta };

function LandingView({ struggling, manifest }: LoadedData) {
  const rows = useMemo((): SubjectRow[] => {
    const groups = new Map<string, Card[]>();
    for (const c of struggling) {
      const list = groups.get(c.subject) ?? [];
      list.push(c);
      groups.set(c.subject, list);
    }
    const meta = resolveSubjectMeta([...groups.keys()], manifest);
    return [...groups.entries()]
      .map(([subject, list]) => ({ subject, count: list.length, meta: meta.get(subject)! }))
      .sort((a, b) => a.meta.order - b.meta.order);
  }, [struggling, manifest]);

  if (struggling.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink href="/">Home</BackLink>
        <h1 className="font-display text-3xl font-semibold text-accent">⚑ Struggling</h1>
        <p className="card-face p-8 text-center text-muted">Nothing here — no card has been failed 4+ times yet. 🎉</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/">Home</BackLink>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold text-accent">⚑ Struggling</h1>
        <Link href="/struggling?all=1" className="rounded-xl bg-accent px-4 py-2.5 font-display text-sm font-semibold text-white">
          Study all ({struggling.length})
        </Link>
      </div>
      <p className="text-sm text-muted">Cards you&apos;ve missed 4+ times. Consider rewriting them or adding a hint in the CSV.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <Link
            key={r.subject}
            href={`/struggling?subject=${encodeURIComponent(r.subject)}`}
            className="card-face group flex flex-col gap-3 p-6 transition-transform hover:-translate-y-0.5"
            style={{ ['--accent' as string]: r.meta.color }}
          >
            <h2 className="font-display text-xl font-semibold leading-tight text-ink">{r.subject}</h2>
            <div className="h-1 w-12 rounded-full bg-accent" />
            <p className="mt-auto text-sm text-muted">{r.count} struggling</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function StrugglingView() {
  const params = useSearchParams();
  const subjectParam = params.get('subject');
  const allParam = params.get('all');
  const data = useStrugglingData(params.toString());

  if (!data) return <p className="py-16 text-center text-muted">Loading…</p>;
  const { struggling, manifest } = data;

  if (allParam === '1') {
    return <StudyView key="all" cards={struggling} accent="#8a4b1a" heading="⚑ All struggling" />;
  }
  if (subjectParam) {
    const filtered = struggling.filter((c) => c.subject === subjectParam);
    const subjects = [...new Set([subjectParam, ...struggling.map((c) => c.subject)])];
    const accent = resolveSubjectMeta(subjects, manifest).get(subjectParam)?.color ?? '#8a4b1a';
    return <StudyView key={subjectParam} cards={filtered} accent={accent} heading={subjectParam} />;
  }
  return <LandingView struggling={struggling} manifest={manifest} />;
}
