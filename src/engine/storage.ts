/**
 * PERSISTENCE
 * -----------
 * localStorage is plenty for a single-student app (a heavy year of Use
 * is well under 1 MB) and it is synchronous, which keeps the UI snappy on
 * low-end Android. Schema is versioned so future fields migrate safely.
 */

import type { UserState } from '../types/progress';
import { todayISO } from './srs';

const KEY = 'examcoach.user.v1';
export const SCHEMA_VERSION = 1;

export const defaultUser = (): UserState => ({
  version: SCHEMA_VERSION,
  createdAt: new Date().toISOString(),
  settings: {
    theme: 'dark',
    dailyGoalQuestions: 30,
    negativeMarking: 0.25,
    examLength: 25,
    examMinutes: 30,
    optionShuffle: true,
    instantFeedback: true,
    showTimer: true,
  },
  goals: { questions: 30, concepts: 2, revision: 15, mistakes: 10, cards: 5 },
  xp: 0,
  level: 1,
  streak: { current: 0, best: 0 },
  questions: {},
  cards: {},
  topics: {},
  mistakes: {},
  attempts: [],
  daily: {},
  achievements: [],
  conceptsRead: {},
  personalBest: { accuracy: 0, examScore: 0, streak: 0 },
});

export function loadUser(): UserState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultUser();
    const parsed = JSON.parse(raw) as UserState;
    return migrate(parsed);
  } catch {
    return defaultUser();
  }
}

function migrate(u: UserState): UserState {
  const base = defaultUser();
  const merged: UserState = {
    ...base,
    ...u,
    settings: { ...base.settings, ...(u.settings ?? {}) },
    goals: { ...base.goals, ...(u.goals ?? {}) },
    streak: { ...base.streak, ...(u.streak ?? {}) },
    personalBest: { ...base.personalBest, ...(u.personalBest ?? {}) },
    questions: u.questions ?? {},
    cards: u.cards ?? {},
    topics: u.topics ?? {},
    mistakes: u.mistakes ?? {},
    attempts: Array.isArray(u.attempts) ? u.attempts.slice(-200) : [],
    daily: u.daily ?? {},
    achievements: u.achievements ?? [],
    conceptsRead: u.conceptsRead ?? {},
    version: SCHEMA_VERSION,
  };
  return merged;
}

let saveTimer: number | undefined;
/** Debounced write — answering fast should not thrash the disk. */
export function saveUser(u: UserState, immediate = false): void {
  if (saveTimer) window.clearTimeout(saveTimer);
  const write = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(u));
    } catch {
      /* quota / private mode — keep the session alive in memory */
    }
  };
  if (immediate) write();
  else saveTimer = window.setTimeout(write, 400);
}

export function todayStat(u: UserState) {
  const d = todayISO();
  if (!u.daily[d]) {
    u.daily[d] = { date: d, questions: 0, concepts: 0, revision: 0, mistakes: 0, cards: 0, xp: 0, minutes: 0 };
  }
  // keep only 120 days of history
  const keys = Object.keys(u.daily).sort();
  if (keys.length > 120) keys.slice(0, keys.length - 120).forEach((k) => delete u.daily[k]);
  return u.daily[d];
}

export function exportProgress(u: UserState): string {
  return JSON.stringify({ kind: 'examcoach-progress', version: SCHEMA_VERSION, user: u }, null, 2);
}

export function importProgress(json: string): UserState | null {
  try {
    const parsed = JSON.parse(json);
    const u = parsed?.user ?? parsed;
    if (!u || typeof u !== 'object' || !('questions' in u)) return null;
    return migrate(u as UserState);
  } catch {
    return null;
  }
}

export function resetUser(): UserState {
  localStorage.removeItem(KEY);
  return defaultUser();
}
