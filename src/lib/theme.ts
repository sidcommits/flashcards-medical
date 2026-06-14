const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const PALETTE = ['#7c2b3e', '#1f5d54', '#2f4858', '#6a4c93', '#8a5a17', '#3a6ea5', '#9b2226'];

export type SubjectMeta = { color: string; order: number; blurb?: string };

async function fetchManifest(): Promise<Record<string, Partial<SubjectMeta>>> {
  try {
    const res = await fetch(`${BASE}/decks/manifest.json`, { cache: 'no-store' });
    if (!res.ok) return {};
    return (await res.json()).subjects ?? {};
  } catch {
    return {};
  }
}

// Cached for the page lifetime — called on every route mount. (Never rejects.)
let manifestPromise: Promise<Record<string, Partial<SubjectMeta>>> | null = null;

export function loadManifest(): Promise<Record<string, Partial<SubjectMeta>>> {
  if (!manifestPromise) manifestPromise = fetchManifest();
  return manifestPromise;
}

export function resolveSubjectMeta(
  subjects: string[],
  manifest: Record<string, Partial<SubjectMeta>>
): Map<string, SubjectMeta> {
  const sorted = [...subjects].sort();
  const m = new Map<string, SubjectMeta>();
  sorted.forEach((s, i) => {
    const man = manifest[s] ?? {};
    m.set(s, {
      color: man.color ?? PALETTE[i % PALETTE.length],
      order: man.order ?? 100 + i,
      blurb: man.blurb,
    });
  });
  return m;
}
