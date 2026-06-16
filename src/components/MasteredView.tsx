'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadAllCards, byTopic, type Card } from '@/lib/cards';
import { loadFlags, setMastered } from '@/lib/flags';
import { pushDebounced } from '@/lib/sync';
import { loadManifest, resolveSubjectMeta, type SubjectMeta } from '@/lib/theme';
import { BackLink, naturalCompare } from './ui';
import Flashcard from './Flashcard';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Rapid-review flip-through: front -> flip -> next, no grading ---
function Review({
  cards,
  accent,
  heading,
  onBack,
  onUnmaster,
}: {
  cards: Card[];
  accent: string;
  heading: string;
  onBack: () => void;
  onUnmaster: (id: string) => void;
}) {
  const [list, setList] = useState(cards);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const current = list[i];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (!flipped) setFlipped(true);
        else { setFlipped(false); setI((n) => n + 1); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped]);

  const backToStudy = () => {
    if (!current) return;
    onUnmaster(current.id);
    setList((prev) => prev.filter((c) => c.id !== current.id));
    setFlipped(false);
  };

  return (
    <div className="flex flex-col gap-6" style={{ ['--accent' as string]: accent }}>
      <button onClick={onBack} className="self-start text-sm text-muted hover:text-accent">← Mastered</button>
      <h1 className="font-display text-3xl font-semibold text-accent">{heading}</h1>
      {!current ? (
        <div className="card-face p-8 text-center">
          <p className="font-display text-xl text-ink">
            {list.length === 0 ? 'None left here.' : `Done — skimmed all ${list.length}.`}
          </p>
          {list.length > 0 && (
            <button className="mt-4 text-sm text-accent" onClick={() => { setI(0); setFlipped(false); }}>
              Start over
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">{i + 1} / {list.length}</p>
          <Flashcard key={current.id} card={current} flipped={flipped} onFlip={() => setFlipped(true)} accent={accent} />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              className="rounded-xl bg-accent px-4 py-2.5 font-display text-sm font-semibold text-white"
              onClick={() => { if (!flipped) setFlipped(true); else { setFlipped(false); setI((n) => n + 1); } }}
            >
              {flipped ? 'Next' : 'Show answer'}
            </button>
            <button
              type="button"
              onClick={backToStudy}
              className="rounded-xl border border-line px-4 py-2.5 font-display text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
            >
              ↩ Back to study
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type Target = { kind: 'all' } | { kind: 'subject'; subject: string } | { kind: 'topic'; subject: string; topic: string };

export default function MasteredView() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [manifest, setManifest] = useState<Record<string, Partial<SubjectMeta>>>({});
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [all, m] = await Promise.all([loadAllCards(), loadManifest()]);
      if (!alive) return;
      const mastered = loadFlags('mastered');
      setCards(all.filter((c) => mastered[c.id]?.on));
      setManifest(m);
    })();
    return () => { alive = false; };
  }, []);

  const subjects = useMemo(() => {
    if (!cards) return [] as { subject: string; meta: SubjectMeta; topics: { topic: string; cards: Card[] }[]; all: Card[] }[];
    const bySub = new Map<string, Card[]>();
    for (const c of cards) (bySub.get(c.subject) ?? bySub.set(c.subject, []).get(c.subject)!).push(c);
    const meta = resolveSubjectMeta([...bySub.keys()], manifest);
    const rows = [...bySub.entries()].map(([subject, list]) => {
      const topics = [...byTopic(list).entries()]
        .map(([topic, ts]) => ({ topic, cards: ts }))
        .sort((a, b) => naturalCompare(a.topic, b.topic));
      return { subject, meta: meta.get(subject)!, topics, all: list };
    });
    return rows.sort((a, b) => a.meta.order - b.meta.order);
  }, [cards, manifest]);

  if (!cards) return <p className="py-16 text-center text-muted">Loading…</p>;

  const unmaster = (id: string) => {
    setMastered(id, false);
    pushDebounced();
    setCards((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
  };

  // Flip-through view
  if (target) {
    let queue: Card[] = [];
    let accent = '#7c2b3e';
    let heading = 'Mastered';
    if (target.kind === 'all') { queue = shuffle(cards); heading = 'Study everything'; }
    else {
      const s = subjects.find((x) => x.subject === target.subject);
      accent = s?.meta.color ?? '#7c2b3e';
      if (target.kind === 'subject') { queue = s?.all ?? []; heading = target.subject; }
      else { queue = s?.topics.find((t) => t.topic === target.topic)?.cards ?? []; heading = target.topic; }
    }
    return <Review cards={queue} accent={accent} heading={heading} onBack={() => setTarget(null)} onUnmaster={unmaster} />;
  }

  // Landing
  if (cards.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink href="/">Home</BackLink>
        <h1 className="font-display text-3xl font-semibold text-accent">✓ Mastered</h1>
        <p className="card-face p-8 text-center text-muted">Nothing mastered yet. Tap &ldquo;✓ Too easy&rdquo; on a card you know cold.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/">Home</BackLink>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold text-accent">✓ Mastered ({cards.length})</h1>
        <button
          onClick={() => setTarget({ kind: 'all' })}
          className="rounded-xl bg-accent px-4 py-2.5 font-display text-sm font-semibold text-white"
        >
          ▶ Study everything
        </button>
      </div>

      {subjects.map((s) => (
        <div key={s.subject} className="flex flex-col gap-3" style={{ ['--accent' as string]: s.meta.color }}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-ink">{s.subject}</h2>
            <button onClick={() => setTarget({ kind: 'subject', subject: s.subject })} className="text-sm text-accent hover:underline">
              ▶ study all ({s.all.length})
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {s.topics.map((t) => (
              <button
                key={t.topic}
                onClick={() => setTarget({ kind: 'topic', subject: s.subject, topic: t.topic })}
                className="card-face flex flex-col gap-1 p-4 text-left transition-transform hover:-translate-y-0.5"
              >
                <span className="font-display text-sm font-semibold text-ink">{t.topic}</span>
                <span className="text-xs text-muted">{t.cards.length} card{t.cards.length === 1 ? '' : 's'}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
