/**
 * ADAPTIVE QUESTION SELECTION
 * ---------------------------
 * A practice set is not a random sample. The selector mixes:
 *   1. overdue SRS items        (memory maintenance — always first)
 *   2. mistake-book items       (error-based revision, weighted by times wrong)
 *   3. unseen items             (coverage)
 *   4. difficulty ramp          (easy first, then harder as the streak grows)
 * and never repeats a question inside one session.
 */

import type { PackIndex, QuestionRef } from '../types/content';
import type { SrsState, UserState } from '../types/progress';
import { isDue, todayISO } from './srs';
import { shuffle } from './indexBuilder';

export type PracticeMode = 'practice' | 'revision' | 'mistake' | 'quick' | 'weak';

export interface SelectionOptions {
  mode: PracticeMode;
  count: number;
  topicIds?: string[]; // restrict to these topics (empty = all)
  chapterId?: string;
  subjectId?: string;
  exclude?: Set<string>;
}

interface Scored {
  ref: QuestionRef;
  score: number;
}

const difficultyWeight = (d: QuestionRef['question']['difficulty']) =>
  d === 'easy' ? 0 : d === 'medium' ? 1 : 2;

export function selectQuestions(
  index: PackIndex,
  user: UserState,
  opts: SelectionOptions
): QuestionRef[] {
  const today = todayISO();
  const pool = [...index.questions.values()].filter((ref) => {
    if (opts.exclude?.has(ref.question.id)) return false;
    if (opts.topicIds?.length && !opts.topicIds.includes(ref.topicId)) return false;
    if (opts.chapterId && ref.chapterId !== opts.chapterId) return false;
    if (opts.subjectId && ref.subjectId !== opts.subjectId) return false;
    if (ref.question.flag === 'source-clarification-required') return false;
    return true;
  });

  if (!pool.length) return [];

  const scored: Scored[] = pool.map((ref) => {
    const srs: SrsState | undefined = user.questions[ref.question.id];
    const mistake = user.mistakes[ref.question.id];
    let score = 0;

    switch (opts.mode) {
      case 'revision':
        // pure SRS: overdue first, then longest-scheduled-but-due
        score = isDue(srs, today) ? 100 : 0;
        score += srs ? Math.min(40, srs.interval) : 0;
        score -= (srs?.history.length ?? 0) * 0.5;
        break;
      case 'mistake': {
        const times = mistake?.times ?? 0;
        score = mistake && !mistake.resolved ? 100 + times * 10 : -1000;
        break;
      }
      case 'weak': {
        const stat = user.topics[ref.topicId];
        const mastery = stat ? 100 - Math.min(100, stat.accuracy * 100) : 50;
        score = mastery + (mistake?.times ?? 0) * 8;
        break;
      }
      case 'quick':
        score = 50 + difficultyWeight(ref.question.difficulty) * 5;
        break;
      default: {
        // practice: overdue + unseen + mistakes, with a gentle variety bonus
        if (isDue(srs, today)) score += srs && srs.history.length ? 60 : 30;
        if (!srs || !srs.history.length) score += 25; // never seen
        score += (mistake?.times ?? 0) * 6;
        score += Math.random() * 12; // variety
        score -= (srs?.history.length ?? 0) * 0.4;
      }
    }
    return { ref, score };
  });

  const ranked = scored
    .filter((s) => s.score > -500)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(opts.count * 3, opts.count + 10))
    .map((s) => s.ref);

  const picked = shuffle(ranked).slice(0, Math.min(opts.count, ranked.length));

  // Difficulty ramp: easy -> medium -> hard. Only in practice / quick modes.
  if (opts.mode === 'practice' || opts.mode === 'quick') {
    const order: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
    picked.sort((a, b) => order[a.question.difficulty] - order[b.question.difficulty]);
  }
  return picked;
}

/** Adaptive follow-up: after a correct answer go slightly harder, after a miss stay or drop. */
export function nextTargetDifficulty(
  current: QuestionRef['question']['difficulty'],
  wasCorrect: boolean,
  streak: number
): 'easy' | 'medium' | 'hard' {
  const ladder: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
  const i = ladder.indexOf(current);
  if (wasCorrect && streak >= 2 && i < 2) return ladder[i + 1];
  if (!wasCorrect && i > 0) return ladder[i - 1];
  return current;
}

export const QUESTION_TYPE_LABEL: Record<string, string> = {
  direct: 'Direct',
  conceptual: 'Conceptual',
  application: 'Application',
  statement: 'Statement',
  'assertion-reason': 'Assertion & Reason',
  match: 'Match the Following',
  multi: 'Multiple Correct',
  negative: 'Negative',
};
