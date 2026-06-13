'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loadAllCards, visibleCards, type Card } from '@/lib/cards';
import { loadFlags } from '@/lib/flags';
import { loadManifest, resolveSubjectMeta, type SubjectMeta } from '@/lib/theme';
import { BackLink } from './ui';
import Flashcard from './Flashcard';

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

type LoadedData = {
  bookmarked: Card[];
  manifest: Record<string, Partial<SubjectMeta>>;
};

function useBookmarkedData(): LoadedData | null {
  const [data, setData] = useState<LoadedData | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [all, manifest] = await Promise.all([loadAllCards(), loadManifest()]);
      if (!alive) return;
      const marks = loadFlags('bookmarks');
      const bookmarked = visibleCards(all).filter((c) => marks[c.id]?.on);
      setData({ bookmarked, manifest });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return data;
}

// ---------------------------------------------------------------------------
// Study mode (shared by ?subject=X and ?all=1)
// ---------------------------------------------------------------------------

function StudyView({
  cards,
  accent,
  heading,
  backHref,
  backLabel,
}: {
  cards: Card[];
  accent: string;
  heading: string;
  backHref: string;
  backLabel: string;
}) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const current = cards[i];

  return (
    <div className="flex flex-col gap-6" style={{ ['--accent' as string]: accent }}>
      <BackLink href={backHref}>{backLabel}</BackLink>
      <h1 className="font-display text-3xl font-semibold text-accent">{heading}</h1>
      {!current ? (
        <div className="card-face p-8 text-center">
          <p className="font-display text-xl text-ink">Done — reviewed all {cards.length} bookmarked.</p>
          <button
            className="mt-4 text-sm text-accent"
            onClick={() => {
              setI(0);
              setFlipped(false);
            }}
          >
            Start over
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">
            {i + 1} / {cards.length}
          </p>
          <Flashcard card={current} flipped={flipped} onFlip={() => setFlipped(true)} accent={accent} />
          <div className="flex justify-center">
            <button
              className="rounded-xl bg-accent px-4 py-2.5 font-display text-sm font-semibold text-white"
              onClick={() => {
                if (!flipped) {
                  setFlipped(true);
                } else {
                  setFlipped(false);
                  setI((n) => n + 1);
                }
              }}
            >
              {flipped ? 'Next' : 'Show answer'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Landing (no params)
// ---------------------------------------------------------------------------

type SubjectRow = { subject: string; count: number; meta: SubjectMeta };

function LandingView({ bookmarked, manifest }: LoadedData) {
  const subjectRows = useMemo((): SubjectRow[] => {
    const groups = new Map<string, Card[]>();
    for (const c of bookmarked) {
      const list = groups.get(c.subject) ?? [];
      list.push(c);
      groups.set(c.subject, list);
    }
    const meta = resolveSubjectMeta([...groups.keys()], manifest);
    const rows: SubjectRow[] = [];
    for (const [subject, list] of groups) {
      rows.push({ subject, count: list.length, meta: meta.get(subject)! });
    }
    return rows.sort((a, b) => a.meta.order - b.meta.order);
  }, [bookmarked, manifest]);

  if (bookmarked.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink href="/">Home</BackLink>
        <h1 className="font-display text-3xl font-semibold text-accent">★ Bookmarked</h1>
        <p className="card-face p-8 text-center text-muted">No bookmarked cards yet. Star cards while studying.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/">Home</BackLink>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold text-accent">★ Bookmarked</h1>
        <Link
          href={`/bookmarked?all=1`}
          className="rounded-xl bg-accent px-4 py-2.5 font-display text-sm font-semibold text-white"
        >
          Study all ({bookmarked.length})
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {subjectRows.map((r) => (
          <Link
            key={r.subject}
            href={`/bookmarked?subject=${encodeURIComponent(r.subject)}`}
            className="card-face group flex flex-col gap-3 p-6 transition-transform hover:-translate-y-0.5"
            style={{ ['--accent' as string]: r.meta.color }}
          >
            <h2 className="font-display text-xl font-semibold leading-tight text-ink">{r.subject}</h2>
            <div className="h-1 w-12 rounded-full bg-accent" />
            <p className="mt-auto text-sm text-muted">
              {r.count} bookmarked
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export default function BookmarkedView() {
  const params = useSearchParams();
  const subjectParam = params.get('subject');
  const allParam = params.get('all');

  const data = useBookmarkedData();

  if (!data) return <p className="py-16 text-center text-muted">Loading…</p>;

  const { bookmarked, manifest } = data;

  // STUDY: ?all=1
  if (allParam === '1') {
    return (
      <StudyView
        cards={bookmarked}
        accent="#7c2b3e"
        heading="★ All bookmarked"
        backHref="/bookmarked"
        backLabel="Bookmarked"
      />
    );
  }

  // STUDY: ?subject=X
  if (subjectParam) {
    const filtered = bookmarked.filter((c) => c.subject === subjectParam);
    const metaMap = resolveSubjectMeta([subjectParam], manifest);
    const meta = metaMap.get(subjectParam)!;
    return (
      <StudyView
        cards={filtered}
        accent={meta.color}
        heading={subjectParam}
        backHref="/bookmarked"
        backLabel="Bookmarked"
      />
    );
  }

  // LANDING
  return <LandingView bookmarked={bookmarked} manifest={manifest} />;
}
