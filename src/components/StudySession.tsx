'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadAllCards, type Card } from '@/lib/cards';
import { getReview, saveReview } from '@/lib/store';
import { isDue, newReview, previewInterval, schedule, type Grade } from '@/lib/srs';
import { loadManifest, resolveSubjectMeta } from '@/lib/theme';
import { BackLink, Button, ProgressBar } from './ui';
import Flashcard from './Flashcard';

const GRADES: { grade: Grade; label: string; key: string; color: string }[] = [
  { grade: 'again', label: 'Again', key: '1', color: '#9b4a4a' },
  { grade: 'hard', label: 'Hard', key: '2', color: '#b07a25' },
  { grade: 'good', label: 'Good', key: '3', color: 'var(--accent)' },
  { grade: 'easy', label: 'Easy', key: '4', color: '#1f5d54' },
];

function dueQueue(cards: Card[]): Card[] {
  const withReview: { c: Card; due: number }[] = [];
  const fresh: Card[] = [];
  for (const c of cards) {
    const r = getReview(c.id);
    if (!r) fresh.push(c);
    else if (isDue(r)) withReview.push({ c, due: r.due });
  }
  withReview.sort((a, b) => a.due - b.due);
  return [...withReview.map((x) => x.c), ...fresh];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function StudySession() {
  const params = useSearchParams();
  const router = useRouter();
  const subject = params.get('subject') ?? '';
  const deck = params.get('deck') ?? '';
  const topic = params.get('topic') ?? '';

  const [cards, setCards] = useState<Card[] | null>(null);
  const [accent, setAccent] = useState('#7c2b3e');
  const [queue, setQueue] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [ahead, setAhead] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [all, manifest] = await Promise.all([loadAllCards(), loadManifest()]);
      if (!alive) return;
      const subjects = [...new Set(all.map((c) => c.subject))];
      const meta = resolveSubjectMeta(subjects, manifest);
      const filtered = all.filter(
        (c) =>
          (!subject || c.subject === subject) &&
          (!deck || c.deck === deck) &&
          (!topic || c.topic === topic)
      );
      setAccent((subject && meta.get(subject)?.color) || '#7c2b3e');
      setCards(filtered);
      setQueue(dueQueue(filtered));
      setIndex(0);
      setReviewed(0);
      setFlipped(false);
      setShowHint(false);
      setAhead(false);
    })();
    return () => {
      alive = false;
    };
  }, [subject, deck, topic]);

  const current = queue[index];
  const total = queue.length;
  const remaining = Math.max(0, total - index);

  const startAhead = useCallback(() => {
    if (!cards) return;
    setQueue(shuffle(cards));
    setIndex(0);
    setReviewed(0);
    setFlipped(false);
    setShowHint(false);
    setAhead(true);
  }, [cards]);

  const grade = useCallback(
    (g: Grade) => {
      if (!current) return;
      const next = schedule(getReview(current.id) ?? newReview(), g);
      saveReview(current.id, next);
      setReviewed((n) => n + 1);
      setIndex((i) => i + 1);
      setFlipped(false);
      setShowHint(false);
    },
    [current]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!flipped) setFlipped(true);
        return;
      }
      if ((e.key === 'h' || e.key === 'H') && current.hint) {
        setShowHint((s) => !s);
        return;
      }
      if (flipped) {
        const hit = GRADES.find((x) => x.key === e.key);
        if (hit) {
          e.preventDefault();
          grade(hit.grade);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, flipped, grade]);

  const crumb = useMemo(
    () => [subject, deck, topic].filter(Boolean).join(' ▸ ') || 'Everything due',
    [subject, deck, topic]
  );

  const backHref = subject ? `/browse?subject=${encodeURIComponent(subject)}` : '/';

  if (!cards) {
    return <p className="py-16 text-center text-muted">Loading…</p>;
  }

  const wrap = { ['--accent' as string]: accent };

  // Empty due queue (and not in study-ahead mode)
  if (total === 0) {
    return (
      <div className="flex flex-col gap-6" style={wrap}>
        <BackLink href={backHref}>Back</BackLink>
        <div className="card-face flex flex-col items-center gap-4 p-10 text-center">
          <p className="font-display text-2xl text-ink">You&apos;re all caught up 🎉</p>
          <p className="text-muted">No cards due in {crumb}.</p>
          {cards.length > 0 && <Button onClick={startAhead}>Study ahead</Button>}
        </div>
      </div>
    );
  }

  // Session complete
  if (index >= total) {
    return (
      <div className="flex flex-col gap-6" style={wrap}>
        <BackLink href={backHref}>Back</BackLink>
        <div className="card-face flex flex-col items-center gap-5 p-10 text-center">
          <p className="font-display text-2xl text-ink">Reviewed {reviewed} cards</p>
          <p className="text-muted">{crumb}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={ahead ? startAhead : () => router.refresh()}>Study again</Button>
            <Button variant="ghost" onClick={() => router.push(backHref)}>
              {subject ? 'Back to subject' : 'Home'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" style={wrap}>
      <div className="flex items-center justify-between gap-3">
        <BackLink href={backHref}>Back</BackLink>
        <span className="text-xs uppercase tracking-[0.16em] text-muted">
          {ahead ? 'Study ahead' : 'Due'}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm text-muted">
          <span className="font-display text-ink">{crumb}</span>
          <span>
            Reviewed {reviewed} · Remaining {remaining}
          </span>
        </div>
        <ProgressBar value={total ? index / total : 0} />
      </div>

      <Flashcard card={current} flipped={flipped} onFlip={() => setFlipped(true)} accent={accent} />

      {!flipped ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => setFlipped(true)}>Show answer</Button>
          {current.hint && (
            <Button variant="ghost" onClick={() => setShowHint((s) => !s)}>
              {showHint ? 'Hide hint' : 'Hint'}
            </Button>
          )}
          {showHint && current.hint && (
            <p className="w-full text-center text-sm italic text-muted">{current.hint}</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {GRADES.map((g) => (
            <button
              key={g.grade}
              onClick={() => grade(g.grade)}
              className="flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 transition-transform hover:-translate-y-0.5 active:translate-y-0"
              style={{
                borderColor: g.color,
                background: `color-mix(in srgb, ${g.color} 9%, transparent)`,
              }}
            >
              <span className="font-display text-sm font-semibold" style={{ color: g.color }}>
                {g.label}
              </span>
              <span className="text-xs text-muted">
                {previewInterval(getReview(current.id) ?? newReview(), g.grade)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
