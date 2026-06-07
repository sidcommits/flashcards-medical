'use client';

import type { Card } from '@/lib/cards';

const DRAW_TEAL = '#1f5d54';

function FaceLabel({ deck, topic }: { deck: string; topic: string }) {
  return (
    <div className="text-xs uppercase tracking-[0.18em] text-muted">
      {deck}
      {topic && topic !== 'General' ? <span> · {topic}</span> : null}
    </div>
  );
}

export default function Flashcard({
  card,
  flipped,
  onFlip,
  accent,
}: {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
  accent: string;
}) {
  return (
    <div className="scene w-full" style={{ ['--accent' as string]: accent }}>
      <div
        className={`flip-card ${flipped ? 'is-flipped' : ''}`}
        onClick={onFlip}
        role="button"
        tabIndex={-1}
      >
        {/* FRONT — defines height */}
        <div className="flip-face card-face flex min-h-[340px] cursor-pointer flex-col gap-4 p-7 sm:p-9">
          <div className="flex items-center justify-between">
            <FaceLabel deck={card.deck} topic={card.topic} />
            {card.isDraw ? (
              <span
                className="rounded-full px-2.5 py-1 text-xs font-medium italic"
                style={{ color: DRAW_TEAL, background: `${DRAW_TEAL}1a` }}
              >
                ✎ draw &amp; label
              </span>
            ) : null}
          </div>
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-accent">
            Question
          </div>
          <p className="font-display text-[22px] leading-snug text-ink sm:text-[25px]">
            {card.front}
          </p>
        </div>

        {/* BACK */}
        <div className="flip-face flip-face--back card-face flex min-h-[340px] cursor-pointer flex-col gap-4 p-7 sm:p-9">
          <FaceLabel deck={card.deck} topic={card.topic} />
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-accent">
            Answer
          </div>
          <p
            className={`whitespace-pre-wrap font-body text-[18px] leading-relaxed sm:text-[20px] ${
              card.isDraw ? 'italic' : ''
            }`}
            style={card.isDraw ? { color: DRAW_TEAL } : undefined}
          >
            {card.back}
          </p>
        </div>
      </div>
    </div>
  );
}
