import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => { vi.unstubAllGlobals(); const store: Record<string,string> = {};
  vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, clear: () => {} });
});

describe('profile storage', () => {
  it('exam date round-trips with a ts', async () => {
    const p = await import('./profile');
    expect(p.loadExamDate().value).toBeNull();
    p.setExamDate('2026-09-01');
    expect(p.loadExamDate().value).toBe('2026-09-01');
    expect(p.loadExamDate().ts).toBeGreaterThan(0);
  });
  it('marks a goal day as an on-flag', async () => {
    const p = await import('./profile');
    p.markGoalDay('2026-06-14');
    expect(p.loadGoalDays()['2026-06-14']?.on).toBe(true);
  });
  it('todayLocal is YYYY-MM-DD', async () => {
    const p = await import('./profile');
    expect(p.todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
