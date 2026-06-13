import { Suspense } from 'react';
import HiddenList from '@/components/HiddenList';

export default function HiddenPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] flex-1 px-5 py-10 sm:py-14">
      <Suspense fallback={<p className="py-16 text-center text-muted">Loading…</p>}>
        <HiddenList />
      </Suspense>
    </main>
  );
}
