import { Suspense } from 'react';
import BookmarkedView from '@/components/BookmarkedView';

export default function BookmarkedPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] flex-1 px-5 py-10 sm:py-14">
      <Suspense fallback={<p className="py-16 text-center text-muted">Loading…</p>}>
        <BookmarkedView />
      </Suspense>
    </main>
  );
}
