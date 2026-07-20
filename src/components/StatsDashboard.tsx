'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadAllCards, visibleCards, type Card } from '@/lib/cards';
import { loadReviews } from '@/lib/store';
import { type Review, isLeech } from '@/lib/srs';
import Link from 'next/link';
import { loadExamDate, setExamDate, loadGoalDays, todayLocal } from '@/lib/profile';
import { pushDebounced } from '@/lib/sync';
import { readiness, daysUntil, dueForecast, streak, recentAvgPerDay, onPace, cardsNotReady } from '@/lib/stats';
import { BackLink } from './ui';

type Stats = { retention30: number | null; reviewedByDay: Record<string, number> };

const ACCENT = '#1f5d54';

function pct(n: number | null): string {
  return n == null ? '—' : `${Math.round(n * 100)}%`;
}

export default function StatsDashboard() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [exam, setExam] = useState<string | null>(null);
  const [goalDays, setGoalDays] = useState<Record<string, { on: boolean; ts: number }>>({});
  const [stats, setStats] = useState<Stats>({ retention30: null, reviewedByDay: {} });

  useEffect(() => {
    let alive = true;
    (async () => {
      const all = await loadAllCards();
      if (!alive) return;
      setCards(visibleCards(all));
      setReviews(loadReviews());
      setExam(loadExamDate().value);
      setGoalDays(loadGoalDays());
      try {
        const res = await fetch('/api/stats', { credentials: 'include' });
        if (res.ok && alive) setStats(await res.json());
      } catch { /* offline — keep client-only metrics */ }
    })();
    return () => { alive = false; };
  }, []);

  const m = useMemo(() => {
    if (!cards) return null;
    const ready = readiness(cards, reviews, exam);
    const days = daysUntil(exam);
    const avg = recentAvgPerDay(stats.reviewedByDay, 7);
    const notReady = exam ? cardsNotReady(cards, reviews, exam) : 0;
    const pace = exam && days != null ? onPace({ cardsNotReady: notReady, daysLeft: days, recentAvg: avg }) : null;
    return {
      ready, days, pace,
      streakN: streak(goalDays),
      todayCount: stats.reviewedByDay[todayLocal()] ?? 0, // device-local, matches server local_date
      forecast: dueForecast(cards, reviews, 7),
      strugglingN: cards.filter((c) => isLeech(reviews[c.id])).length,
    };
  }, [cards, reviews, exam, goalDays, stats]);

  if (!cards || !m) return <p className="py-16 text-center text-muted">Loading…</p>;

  const heatDays = lastNDates(28).map((d) => stats.reviewedByDay[d] ?? 0);
  const heatMax = Math.max(1, ...heatDays);

  return (
    <div className="flex flex-col gap-5" style={{ ['--accent' as string]: ACCENT }}>
      <BackLink href="/">Home</BackLink>
      <h1 className="font-display text-3xl font-semibold text-accent">Your progress</h1>

      {/* Readiness ring (or exam-date prompt) */}
      {exam ? (
        <div className="card-face flex flex-col items-center gap-2 p-6 text-center">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Exam readiness</span>
          <Ring value={m.ready ?? 0} />
          <p className="text-sm text-muted">
            {m.days != null && <>⏳ {m.days} day{m.days === 1 ? '' : 's'} left · </>}
            {m.pace == null ? '' : m.pace ? <span className="text-accent">on pace ✓</span> : <span className="text-[#9b4a4a]">behind ⚠</span>}
          </p>
          <ExamEditor value={exam} onChange={(v) => { setExamDate(v); setExam(v); pushDebounced(); }} />
        </div>
      ) : (
        <div className="card-face flex flex-col items-center gap-3 p-6 text-center">
          <p className="font-display text-lg text-ink">Set her exam date</p>
          <p className="text-sm text-muted">Unlocks the countdown, pacing, and readiness.</p>
          <ExamEditor value={null} onChange={(v) => { setExamDate(v); setExam(v); pushDebounced(); }} />
        </div>
      )}

      {/* Streak */}
      <div className="card-face flex items-center justify-between p-4">
        <span className="font-display text-ink">🔥 {m.streakN}-day streak</span>
        <span className="text-sm text-muted">{m.streakN > 0 ? 'keep it going' : 'clear your due today'}</span>
      </div>

      {/* Retention + today tiles */}
      <div className="grid grid-cols-2 gap-3">
        <Tile n={pct(stats.retention30)} label="Retention (30d)" />
        <Tile n={String(m.todayCount)} label="Reviewed today" />
      </div>

      {/* Activity heatmap */}
      <div className="card-face p-4">
        <span className="text-xs uppercase tracking-[0.16em] text-muted">Activity · last 4 weeks</span>
        <div className="mt-2 grid grid-cols-14 gap-1">
          {heatDays.map((c, i) => (
            <div key={i} className="aspect-square rounded-sm" style={{ background: heatColor(c, heatMax) }} title={`${c} reviews`} />
          ))}
        </div>
      </div>

      {/* Due forecast */}
      <div className="card-face p-4">
        <span className="text-xs uppercase tracking-[0.16em] text-muted">Due · next 7 days</span>
        <Forecast values={m.forecast} />
      </div>

      {m.strugglingN > 0 && (
        <Link href="/struggling" className="card-face p-4 text-center font-display text-[#8a4b1a] hover:text-accent">
          ⚑ Struggling cards ({m.strugglingN})
        </Link>
      )}
    </div>
  );
}

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return out;
}

function heatColor(c: number, max: number): string {
  if (c === 0) return '#e3dac9';
  const t = c / max;
  if (t > 0.66) return '#1f5d54';
  if (t > 0.33) return '#5a8c80';
  return '#a9c6bd';
}

function Ring({ value }: { value: number }) {
  const deg = Math.round(value * 360);
  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--accent) 0 ${deg}deg, #e3dac9 ${deg}deg 360deg)` }}>
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-paper font-display text-xl font-bold text-accent">
        {pct(value)}
      </div>
    </div>
  );
}

function Tile({ n, label }: { n: string; label: string }) {
  return (
    <div className="card-face flex flex-col items-center gap-1 p-4 text-center">
      <span className="font-display text-2xl font-bold text-accent">{n}</span>
      <span className="text-xs uppercase tracking-[0.12em] text-muted">{label}</span>
    </div>
  );
}

function Forecast({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const labels = ['Today', '+1', '+2', '+3', '+4', '+5', '+6'];
  return (
    <div className="mt-2 flex items-end gap-2" style={{ height: 56 }}>
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
          <div className="w-full rounded-t bg-accent" style={{ height: `${(v / max) * 40 + 2}px`, opacity: 0.85 }} title={`${v} due`} />
          <span className="text-[9px] text-muted">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function ExamEditor({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <input
      type="date"
      defaultValue={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="mt-1 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink"
      aria-label="Exam date"
    />
  );
}
