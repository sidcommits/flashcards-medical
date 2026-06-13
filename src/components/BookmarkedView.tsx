'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadAllCards, visibleCards, type Card } from '@/lib/cards';
import { loadFlags } from '@/lib/flags';
import { BackLink } from './ui';
import Flashcard from './Flashcard';

export default function BookmarkedView() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const all = await loadAllCards();
      if (!alive) return;
      const marks = loadFlags('bookmarks');
      setCards(visibleCards(all).filter((c) => marks[c.id]?.on));
    })();
    return () => { alive = false; };
  }, []);

  const current = useMemo(() => (cards ? cards[i] : undefined), [cards, i]);

  if (!cards) return <p className="py-16 text-center text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/">Home</BackLink>
      <h1 className="font-display text-3xl font-semibold text-accent">★ Bookmarked</h1>
      {cards.length === 0 ? (
        <p className="card-face p-8 text-center text-muted">No bookmarked cards yet. Star cards while studying.</p>
      ) : !current ? (
        <div className="card-face p-8 text-center">
          <p className="font-display text-xl text-ink">Done — reviewed all {cards.length} bookmarked.</p>
          <button className="mt-4 text-sm text-accent" onClick={() => { setI(0); setFlipped(false); }}>Start over</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">{i + 1} / {cards.length}</p>
          <Flashcard card={current} flipped={flipped} onFlip={() => setFlipped(true)} accent="#7c2b3e" />
          <div className="flex justify-center">
            <button
              className="rounded-xl bg-accent px-4 py-2.5 font-display text-sm font-semibold text-white"
              onClick={() => { setFlipped(false); setI((n) => n + 1); }}
            >
              {flipped ? 'Next' : 'Show answer'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
