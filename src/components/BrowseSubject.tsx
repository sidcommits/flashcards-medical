'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { byDeck, byTopic, loadAllCards, visibleCards, type Card } from '@/lib/cards';
import { getReview } from '@/lib/store';
import { splitCounts } from '@/lib/srs';
import { loadManifest, resolveSubjectMeta } from '@/lib/theme';
import { BackLink, Button, Pill, naturalCompare } from './ui';

export default function BrowseSubject() {
  const params = useSearchParams();
  const router = useRouter();
  const subject = params.get('subject') ?? '';

  const [cards, setCards] = useState<Card[] | null>(null);
  const [accent, setAccent] = useState('#7c2b3e');

  useEffect(() => {
    let alive = true;
    (async () => {
      const [all, manifest] = await Promise.all([loadAllCards(), loadManifest()]);
      if (!alive) return;
      const meta = resolveSubjectMeta([...new Set(all.map((c) => c.subject))], manifest);
      setAccent(meta.get(subject)?.color ?? '#7c2b3e');
      setCards(visibleCards(all).filter((c) => c.subject === subject));
    })();
    return () => {
      alive = false;
    };
  }, [subject]);

  const decks = useMemo(() => {
    if (!cards) return [];
    const groups = byDeck(cards);
    return [...groups.entries()]
      .sort((a, b) => naturalCompare(a[0], b[0]))
      .map(([deck, list]) => ({
        deck,
        total: list.length,
        ...splitCounts(list, getReview),
        topics: [...byTopic(list).keys()].sort(naturalCompare),
      }));
  }, [cards]);

  const study = (extra: Record<string, string>) => {
    const q = new URLSearchParams({ subject, ...extra });
    router.push(`/study?${q.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6" style={{ ['--accent' as string]: accent }}>
      <BackLink href="/">All subjects</BackLink>

      {!cards ? (
        <p className="py-16 text-center text-muted">Loading…</p>
      ) : decks.length === 0 ? (
        <p className="py-16 text-center text-muted">No cards found for “{subject}”.</p>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="font-display text-3xl font-semibold leading-tight text-accent">
              {subject}
            </h1>
            <Button onClick={() => study({})}>Study whole subject</Button>
          </div>

          <div className="flex flex-col gap-4">
            {decks.map((d) => (
              <div key={d.deck} className="card-face flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-ink">{d.deck}</h2>
                    <p className="text-sm text-muted">
                      {d.total} card{d.total === 1 ? '' : 's'}
                      {d.due > 0 && (
                        <>
                          {' · '}
                          <span className="font-medium text-accent">{d.due} due</span>
                        </>
                      )}
                      {d.left > 0 && (
                        <>
                          {' · '}
                          <span className="font-medium text-ink">{d.left} left</span>
                        </>
                      )}
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => study({ deck: d.deck })}>
                    Study deck
                  </Button>
                </div>
                {d.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {d.topics.map((t) => (
                      <Pill key={t} onClick={() => study({ deck: d.deck, topic: t })}>
                        {t}
                      </Pill>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Link href="/" className="text-sm text-muted hover:text-accent">
            ← Back to all subjects
          </Link>
        </>
      )}
    </div>
  );
}
