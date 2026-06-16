'use client';

import { useState } from 'react';
import { isBookmarked, setBookmark, setHidden, setMastered } from '@/lib/flags';
import { pushDebounced } from '@/lib/sync';

export default function CardActions({
  cardId,
  onHide,
  onMastered,
}: {
  cardId: string;
  onHide: () => void;
  onMastered: () => void;
}) {
  const [marked, setMarked] = useState(() => isBookmarked(cardId));

  const toggleStar = () => {
    const next = !marked;
    setBookmark(cardId, next);
    setMarked(next);
    pushDebounced();
  };

  const masterIt = () => {
    setMastered(cardId, true);
    pushDebounced();
    onMastered();
  };

  const hide = () => {
    setHidden(cardId, true);
    pushDebounced();
    onHide();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleStar}
        aria-pressed={marked}
        aria-label={marked ? 'Remove bookmark' : 'Bookmark this card'}
        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${marked ? 'border-accent bg-accent text-white' : 'border-line text-muted hover:text-accent'}`}
      >
        {marked ? '★ Bookmarked' : '☆ Bookmark'}
      </button>
      <button
        type="button"
        onClick={masterIt}
        aria-label="Mark this card too easy (move to Mastered)"
        className="rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:text-[#1f5d54] hover:border-[#1f5d54]"
      >
        ✓ Too easy
      </button>
      <button
        type="button"
        onClick={hide}
        aria-label="Hide this card"
        className="rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:text-[#9b2226] hover:border-[#9b2226]"
      >
        ⌫ Hide
      </button>
    </div>
  );
}
