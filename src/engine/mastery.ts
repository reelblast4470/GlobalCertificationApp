/**
 * MASTERY ENGINE
 * --------------
 * Mastery is computed, never stored as an opinion:
 *   mastery = exposure x (0.6 * recentAccuracy + 0.4 * scheduleStability)
 *
 *  - exposure   : what share of the topic's questions you have actually met
 *                 (you cannot have mastered a topic you never practised)
 *  - accuracy   : exponentially weighted, so a recent slump counts more
 *  - stability  : mean of min(interval / 21, 1) — how far the SRS has pushed it
 *
 * Bands: 0–40 Weak | 41–60 Learning | 61–80 Improving | 81–95 Strong | 96–100 Mastered
 */

import type { ID } from '../types/content';
import type { SrsState, TopicStat } from '../types/progress';

export type Band = 'weak' | 'learning' | 'improving' | 'strong' | 'mastered';

export interface MasteryInfo {
  score: number; // 0–100
  band: Band;
  label: string;
  emoji: string;
  color: string; // tailwind-ish hex, safe for inline style
}

export const BANDS: Record<Band, { label: string; emoji: string; color: string; max: number }> = {
  weak: { label: 'Weak', emoji: '🟥', color: '#ef4444', max: 40 },
  learning: { label: 'Learning', emoji: '🟧', color: '#f97316', max: 60 },
  improving: { label: 'Improving', emoji: '🟨', color: '#eab308', max: 80 },
  strong: { label: 'Strong', emoji: '🟩', color: '#22c55e', max: 95 },
  mastered: { label: 'Mastered', emoji: '⭐', color: '#a78bfa', max: 100 },
};

export function bandOf(score: number): Band {
  if (score <= 40) return 'weak';
  if (score <= 60) return 'learning';
  if (score <= 80) return 'improving';
  if (score <= 95) return 'strong';
  return 'mastered';
}

export function masteryInfo(score: number): MasteryInfo {
  const band = bandOf(score);
  return { score, band, ...BANDS[band] };
}

/** Weighted accuracy: recent attempts count ~3x older ones. */
export function ewmaAccuracy(history: { ok: boolean }[], prior = 0.5): number {
  if (!history.length) return prior;
  const alpha = 0.3;
  let acc = prior;
  for (const h of history) acc = acc + alpha * ((h.ok ? 1 : 0) - acc);
  return acc;
}

const stabilityOf = (s: SrsState): number => Math.min(1, (s.interval ?? 0) / 21);

export interface TopicMasteryInput {
  totalQuestions: number;
  seenQuestions: number;
  srsStates: SrsState[];
  stat?: TopicStat;
}

export function topicMastery(input: TopicMasteryInput): number {
  const { totalQuestions, seenQuestions, srsStates, stat } = input;
  if (totalQuestions === 0) return 0;
  const exposure = Math.min(1, seenQuestions / totalQuestions);
  if (seenQuestions === 0) return 0;

  const acc = stat ? stat.accuracy : ewmaAccuracy(srsStates.flatMap((s) => s.history));
  const stability = srsStates.length
    ? srsStates.reduce((sum, s) => sum + stabilityOf(s), 0) / srsStates.length
    : 0;

  const score = 100 * exposure * (0.6 * acc + 0.4 * stability);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Which topics deserve attention right now, ranked.
 * Priority = weakness x recency-decay x mistake-pressure.
 */
export function rankWeakTopics(
  entries: { topicId: ID; title: string; mastery: number; mistakes: number; lastActivity?: string }[]
): { topicId: ID; title: string; mastery: number; priority: number; reason: string }[] {
  const today = Date.now();
  return entries
    .map((e) => {
      const days = e.lastActivity ? (today - new Date(e.lastActivity).getTime()) / 86400000 : 99;
      const recency = Math.min(1, days / 14); // untouched topics drift upward
      const pressure = Math.min(1, e.mistakes / 5);
      const weakness = (100 - e.mastery) / 100;
      const priority = +(0.5 * weakness + 0.25 * recency + 0.25 * pressure).toFixed(4);
      const reason =
        e.mastery <= 40
          ? `Mastery ${e.mastery}% — needs a full re-learn`
          : e.mistakes >= 3
            ? `${e.mistakes} mistakes logged here`
            : e.mastery <= 80
              ? `Mastery ${e.mastery}% — close to strong`
              : 'Keep it warm';
      return { topicId: e.topicId, title: e.title, mastery: e.mastery, priority, reason };
    })
    .sort((a, b) => b.priority - a.priority);
}

/** "You are strong in A but weak in C. Spend 10 minutes revising C first." */
export function nextStudyAdvice(
  ranked: { title: string; mastery: number }[]
): string | null {
  if (!ranked.length) return null;
  const weakest = ranked[ranked.length - 1];
  const strongest = ranked[0];
  if (weakest.mastery >= 81) return `Every topic is strong. Run a mock test to lock it in.`;
  const minutes = weakest.mastery <= 40 ? 15 : weakest.mastery <= 60 ? 10 : 7;
  if (strongest.mastery - weakest.mastery >= 25 && strongest.mastery >= 61) {
    return `You are strong in ${strongest.title} but weak in ${weakest.title}. Spend ${minutes} minutes revising ${weakest.title} before the next test.`;
  }
  return `Weakest area: ${weakest.title} (${weakest.mastery}%). Spend ${minutes} minutes there first.`;
}

export function overallMastery(perTopic: Record<ID, number>): number {
  const values = Object.values(perTopic);
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
