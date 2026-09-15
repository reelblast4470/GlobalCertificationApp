/**
 * SPACED REPETITION (SM-2 lite)
 * -----------------------------
 * Base ladder from the spec: 1 -> 3 -> 7 -> 14 -> 30 days, then x2.
 * Poor performance pulls items back in immediately (and re-enters the ladder
 * low), good performance stretches it. Everything is derived from the four
 * flashcard buttons: Again | Hard | Good | Easy.
 */

import type { SrsRating, SrsState } from '../types/progress';

export const LADDER = [1, 3, 7, 14, 30];

export const todayISO = (d: Date = new Date()): string => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const nowISO = (): string => new Date().toISOString();

export const addDays = (iso: string, days: number): string => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return todayISO(d);
};

export const daysBetween = (fromISO: string, toISO: string): number => {
  const a = new Date(fromISO + 'T00:00:00').getTime();
  const b = new Date(toISO + 'T00:00:00').getTime();
  return Math.round((b - a) / 86400000);
};

export const newSrsState = (): SrsState => ({
  due: todayISO(),
  interval: 0,
  ease: 2.5,
  reps: 0,
  lapses: 0,
  history: [],
});

const clampEase = (e: number) => Math.min(3.0, Math.max(1.3, e));

/**
 * Rating -> next interval, in days.
 * Inside the ladder we step rung-by-rung so the schedule matches the spec
 * exactly (1 -> 3 -> 7 -> 14 -> 30). Beyond the top rung the ease factor
 * takes over, so strong items stretch out instead of plateauing.
 */
export function nextInterval(interval: number, ease: number, rating: SrsRating): number {
  if (rating === 'again') return 0; // relearn today
  if (interval <= 0) {
    // first successful review: enter the ladder at a rung based on confidence
    return rating === 'hard' ? 1 : rating === 'good' ? 1 : 3;
  }
  const rung = Math.max(
    0,
    LADDER.filter((x) => x <= interval).length - 1
  );
  if (rating === 'hard') return Math.max(interval, Math.round(interval * 1.2));
  if (rating === 'good') return LADDER[rung + 1] ?? Math.round(interval * ease);
  return LADDER[rung + 2] ?? Math.round(interval * ease * 1.3);
}

export function applyReview(
  prev: SrsState | undefined,
  rating: SrsRating,
  opts: { now?: Date } = {}
): SrsState {
  const base = prev ?? newSrsState();
  const now = opts.now ?? new Date();
  const today = todayISO(now);

  let ease = base.ease;
  if (rating === 'again') ease = clampEase(ease - 0.2);
  else if (rating === 'hard') ease = clampEase(ease - 0.15);
  else if (rating === 'easy') ease = clampEase(ease + 0.15);

  const interval = nextInterval(base.interval, ease, rating);
  const due = rating === 'again' ? today : addDays(today, interval);

  const history = [...(base.history ?? []), { t: nowISO(), ok: rating !== 'again' }].slice(-25);

  return {
    due,
    interval,
    ease: Math.round(ease * 100) / 100,
    reps: rating === 'again' ? 0 : base.reps + 1,
    lapses: rating === 'again' ? base.lapses + 1 : base.lapses,
    lastResult: rating === 'again' ? 'wrong' : 'correct',
    lastSeen: now.toISOString(),
    history,
  };
}

/** True/false answers reuse the same scheduler so practice + cards stay in sync. */
export const ratingForAnswer = (correct: boolean, msTaken?: number): SrsRating =>
  !correct ? 'again' : msTaken != null && msTaken < 6000 ? 'easy' : 'good';

/** How overdue an item is, in days (0 = due now, negative = scheduled ahead). */
export const overdueDays = (s: SrsState, today = todayISO()): number =>
  daysBetween(s.due, today);

export const isDue = (s: SrsState | undefined, today = todayISO()): boolean =>
  !s || s.due <= today;

/** Human label for the next review, used on cards and topic chips. */
export function dueLabel(s: SrsState | undefined, today = todayISO()): string {
  if (!s) return 'New';
  if (s.due === today) return 'Due today';
  if (s.due < today) {
    const d = daysBetween(s.due, today);
    return d === 1 ? 'Overdue 1 day' : `Overdue ${d} days`;
  }
  const d = daysBetween(today, s.due);
  if (d === 1) return 'Tomorrow';
  if (d < 7) return `In ${d} days`;
  if (d < 14) return 'In 1 week';
  if (d < 30) return `In ${Math.round(d / 7)} weeks`;
  return `In ${Math.round(d / 30)} months`;
}
