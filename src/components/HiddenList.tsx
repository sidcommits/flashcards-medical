'use client';

import { useEffect, useState } from 'react';
import { loadAllCards, type Card } from '@/lib/cards';
import { loadFlags, setHidden } from '@/lib/flags';
import { pushDebounced } from '@/lib/sync';
import { BackLink } from './ui';

export default function HiddenList() {
  const [hiddenCards, setHiddenCards] = useState<Card[] | null>(null);

  const refresh = async () => {
    const all = await loadAllCards();
    const map = loadFlags('hidden');
    setHiddenCards(all.filter((c) => map[c.id]?.on));
  };
  useEffect(() => { refresh(); }, []);

  const restore = (id: string) => {
    setHidden(id, false);
    pushDebounced();
    setHiddenCards((cs) => (cs ? cs.filter((c) => c.id !== id) : cs));
  };

  if (!hiddenCards) return <p className="py-16 text-center text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/">Home</BackLink>
      <h1 className="font-display text-3xl font-semibold text-ink">Hidden cards</h1>
      {hiddenCards.length === 0 ? (
        <p className="card-face p-8 text-center text-muted">Nothing hidden.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {hiddenCards.map((c) => (
            <li key={c.id} className="card-face flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate font-display text-ink">{c.front}</p>
                <p className="text-xs uppercase tracking-wide text-muted">{c.subject} · {c.deck} · {c.topic}</p>
              </div>
              <button className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm text-accent hover:bg-accent hover:text-white" onClick={() => restore(c.id)}>
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
