'use client';

import SubjectGrid from '@/components/SubjectGrid';
import { resetStore } from '@/lib/store';

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[760px] flex-1 px-5 py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-black tracking-tight text-ink sm:text-5xl">
          Flashcards
        </h1>
        <p className="mt-2 text-muted">Spaced-repetition revision, powered by your spreadsheets.</p>
      </header>

      <SubjectGrid />

      <footer className="mt-14 border-t border-line pt-5">
        <button
          onClick={() => {
            if (confirm('Reset all study progress? This cannot be undone.')) {
              resetStore();
              location.reload();
            }
          }}
          className="text-sm text-muted transition-colors hover:text-accent"
        >
          Reset all progress
        </button>
      </footer>
    </main>
  );
}
