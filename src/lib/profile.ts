'use client';

import type { ExamDate, Flag } from './merge';

const EXAM_KEY = 'flashcards.examDate.v1';
const GOAL_KEY = 'flashcards.goalDays.v1';

export function todayLocal(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadExamDate(): ExamDate {
  if (typeof localStorage === 'undefined') return { value: null, ts: 0 };
  try {
    return JSON.parse(localStorage.getItem(EXAM_KEY) || '') as ExamDate;
  } catch {
    return { value: null, ts: 0 };
  }
}

export function setExamDate(value: string | null): void {
  localStorage.setItem(EXAM_KEY, JSON.stringify({ value, ts: Date.now() }));
}

export function loadGoalDays(): Record<string, Flag> {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(GOAL_KEY) || '{}');
  } catch {
    return {};
  }
}

export function markGoalDay(date = todayLocal()): void {
  const map = loadGoalDays();
  if (map[date]?.on) return; // already marked today
  map[date] = { on: true, ts: Date.now() };
  localStorage.setItem(GOAL_KEY, JSON.stringify(map));
}

export const PROFILE_KEYS = { exam: EXAM_KEY, goals: GOAL_KEY } as const;
