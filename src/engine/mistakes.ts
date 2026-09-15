/**
 * ERROR BOOK
 * ----------
 * Every wrong answer is stored with the reason we can infer for it. The
 * reason is pattern-matched from the answer shape, so the student sees
 * "you missed the NOT", not just "wrong".
 */

import type { Question } from '../types/content';
import type { MistakeEntry, UserState } from '../types/progress';
import { todayISO } from './srs';

const NEGATIVE_CUES = ['not', 'except', 'incorrect', 'false', 'wrong'];

const isNegative = (q: Question) =>
  q.type === 'negative' || NEGATIVE_CUES.some((c) => q.prompt.toLowerCase().includes(c));

export function inferReason(q: Question, selected: string[]): string {
  if (!selected.length) return 'Left unanswered — time pressure or uncertainty.';

  // Shape of the answer first — it is concrete evidence, not a guess.
  if (q.correct.length > 1 && selected.length === 1)
    return 'Under-selected — this question has more than one correct option.';

  if (q.correct.length === 1 && selected.length > 1)
    return 'Over-selected — treated a single-answer question as multiple-correct.';

  if (isNegative(q)) return 'Missed the negative word (NOT / EXCEPT / INCORRECT) — picked the true statement instead.';

  if (q.type === 'assertion-reason')
    return 'Assertion–Reason logic slip — check whether the Reason actually explains the Assertion.';

  if (q.type === 'statement')
    return 'Statement evaluation slip — judge each statement independently before combining.';

  const chosen = q.options.filter((o) => selected.includes(o.id)).map((o) => o.text).join(' ');
  const right = q.options.filter((o) => q.correct.includes(o.id)).map((o) => o.text).join(' ');
  const shared = tokenOverlap(chosen, right);
  if (shared >= 2) return 'Confused two closely-related terms — re-read the exact wording of both.';

  if (q.type === 'application') return 'Could not apply the rule to the situation — redo the worked example.';

  return 'Concept gap — revisit the concept and its key facts.';
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\s+/));
  const tb = new Set(b.toLowerCase().split(/\s+/));
  let n = 0;
  for (const t of ta) if (t.length > 3 && tb.has(t)) n++;
  return n;
}

export function recordMistake(
  user: UserState,
  q: Question,
  selected: string[],
  conceptTested: string,
  mode: MistakeEntry['mode']
): MistakeEntry {
  const now = new Date().toISOString();
  const prev = user.mistakes[q.id];
  const entry: MistakeEntry = prev
    ? {
        ...prev,
        selected,
        times: prev.times + 1,
        lastWrong: now,
        reason: inferReason(q, selected),
        conceptTested,
        mode,
        resolved: false,
      }
    : {
        qid: q.id,
        selected,
        correct: q.correct,
        times: 1,
        lastWrong: now,
        conceptTested,
        reason: inferReason(q, selected),
        mode,
        resolved: false,
      };
  user.mistakes[q.id] = entry;
  return entry;
}

/** A mistake counts as redeemed after three consecutive correct answers. */
export function redeemMistake(user: UserState, qid: string): void {
  const m = user.mistakes[qid];
  if (!m) return;
  m.lastCorrect = new Date().toISOString();
  m.times = Math.max(0, m.times - 1);
  if (m.times === 0) m.resolved = true;
}

export const mistakeQueue = (user: UserState): MistakeEntry[] =>
  Object.values(user.mistakes)
    .filter((m) => !m.resolved)
    .sort((a, b) => b.times - a.times || +new Date(b.lastWrong) - +new Date(a.lastWrong));

export const resolvedCount = (user: UserState): number =>
  Object.values(user.mistakes).filter((m) => m.resolved).length;

/** Mistakes that have not been revisited in N days — push them back in. */
export const staleMistakes = (user: UserState, days = 3): MistakeEntry[] => {
  const cutoff = Date.now() - days * 86400000;
  return mistakeQueue(user).filter((m) => +new Date(m.lastWrong) < cutoff);
};

export const isToday = (iso: string): boolean => iso.slice(0, 10) === todayISO();
