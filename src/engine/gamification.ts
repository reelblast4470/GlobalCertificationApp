/**
 * GAMIFICATION — present, but never in the way of the actual studying.
 * XP, levels, streaks, achievements, personal bests.
 */

import type { Achievement, DailyStat, UserState } from '../types/progress';
import type { Difficulty } from '../types/content';
import { todayISO } from './srs';

export const XP_BY_DIFFICULTY: Record<Difficulty, number> = { easy: 8, medium: 12, hard: 18 };
export const XP_CONCEPT = 15;
export const XP_FLASHCARD = 5;
export const XP_REVISE_MISTAKE = 10;
export const XP_DAILY_GOAL = 50;
export const XP_STREAK_BONUS = 25;

/** Level curve: each level costs a bit more than the last. */
export const levelForXp = (xp: number): number => Math.floor(Math.sqrt(Math.max(0, xp) / 45)) + 1;
export const xpForLevel = (level: number): number => 45 * (level - 1) ** 2;

export function levelProgress(xp: number): { level: number; into: number; need: number; pct: number } {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const into = Math.max(0, xp - base);
  const need = Math.max(1, next - base);
  return { level, into, need, pct: Math.min(100, Math.round((into / need) * 100)) };
}

/** Day-streak bookkeeping. Called once per answer, cheap. */
export function bumpStreak(user: UserState, date = todayISO()): UserState['streak'] {
  const s = user.streak ?? { current: 0, best: 0 };
  if (s.lastDay === date) return s;
  const yesterday = new Date(date + 'T00:00:00');
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.toISOString().slice(0, 10);
  const current = s.lastDay === y ? s.current + 1 : 1;
  return { current, best: Math.max(s.best ?? 0, current), lastDay: date };
}

export interface AchievementDef {
  id: string;
  title: string;
  emoji: string;
  test: (ctx: {
    user: UserState;
    totalAttempted: number;
    accuracy: number;
    masteredTopics: number;
    examBest: number;
    mistakesResolved: number;
  }) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-steps', title: 'First Answer', emoji: '👣', test: (c) => c.totalAttempted >= 1 },
  { id: 'q100', title: 'First 100 Questions', emoji: '🏆', test: (c) => c.totalAttempted >= 100 },
  { id: 'q500', title: '500 Club', emoji: '🏅', test: (c) => c.totalAttempted >= 500 },
  { id: 'streak3', title: '3-Day Streak', emoji: '🔥', test: (c) => c.user.streak.current >= 3 },
  { id: 'streak7', title: '7-Day Streak', emoji: '🔥', test: (c) => c.user.streak.current >= 7 },
  { id: 'streak30', title: '30-Day Streak', emoji: '💥', test: (c) => c.user.streak.current >= 30 },
  { id: 'accuracy90', title: '90% Accuracy', emoji: '🎯', test: (c) => c.totalAttempted >= 30 && c.accuracy >= 0.9 },
  { id: 'chapter-master', title: 'Chapter Master', emoji: '⭐', test: (c) => c.masteredTopics >= 1 },
  { id: 'memory-master', title: 'Memory Master', emoji: '🧠', test: (c) => Object.keys(c.user.cards).length >= 50 },
  { id: 'error-slayer', title: 'Error Slayer', emoji: '⚔️', test: (c) => c.mistakesResolved >= 25 },
  { id: 'mock80', title: 'Mock Test 80%', emoji: '📈', test: (c) => c.examBest >= 80 },
];

export function evaluateAchievements(
  user: UserState,
  ctx: Omit<Parameters<AchievementDef['test']>[0], 'user'>
): Achievement[] {
  const owned = new Set(user.achievements.map((a) => a.id));
  const unlocked: Achievement[] = [];
  for (const def of ACHIEVEMENTS) {
    if (owned.has(def.id)) continue;
    let ok = false;
    try {
      ok = def.test({ user, ...ctx });
    } catch {
      ok = false;
    }
    if (ok) unlocked.push({ id: def.id, unlockedAt: new Date().toISOString() });
  }
  return unlocked;
}

export const emptyDaily = (date = todayISO()): DailyStat => ({
  date,
  questions: 0,
  concepts: 0,
  revision: 0,
  mistakes: 0,
  cards: 0,
  xp: 0,
  minutes: 0,
});
