'use client';

import { useEffect, useState } from 'react';
import { pullAndMerge, onSyncStatus, type Status } from '@/lib/sync';

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    const off = onSyncStatus(setStatus);
    pullAndMerge();
    // Only register the SW in production — in dev it caches stale bundles
    // (its cache version never bumps), which masks code changes.
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const onOnline = () => pullAndMerge();
    window.addEventListener('online', onOnline);
    return () => { off(); window.removeEventListener('online', onOnline); };
  }, []);

  return (
    <>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-2 right-2 text-xs text-muted">
        {status === 'syncing' && 'syncing…'}
        {status === 'synced' && 'synced ✓'}
        {status === 'offline' && 'offline'}
      </div>
    </>
  );
}
