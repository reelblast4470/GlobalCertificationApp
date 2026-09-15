/**
 * DAILY STUDY PLAN
 * ----------------
 * The plan is derived from real backlog, not from a fixed template:
 *   - how many SRS questions are actually due today
 *   - how many flashcards are due
 *   - how many unresolved mistakes are sitting in the error book
 *   - how many concepts remain unread in the active pack
 * Then it is clipped to the student's daily goal so the plan stays winnable.
 */

import type { PackIndex } from '../types/content';
import type { UserState } from '../types/progress';
import { isDue, todayISO } from './srs';

export interface PlanItem {
  key: 'concepts' | 'questions' | 'revision' | 'mistakes' | 'cards';
  label: string;
  emoji: string;
  target: number;
  done: number;
  backlog: number;
  route: string;
  hint: string;
}

export interface DailyPlan {
  date: string;
  items: PlanItem[];
  overallPct: number;
  greeting: string;
}

export function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function countDue(
  index: PackIndex,
  user: UserState,
  store: 'questions' | 'cards',
  topicIds?: string[]
): number {
  const today = todayISO();
  let n = 0;
  for (const ref of index.questions.values()) {
    if (topicIds?.length && !topicIds.includes(ref.topicId)) continue;
    const s = user[store][ref.question.id];
    if (isDue(s, today)) n++;
  }
  return n;
}

export function unresolvedMistakes(user: UserState): number {
  return Object.values(user.mistakes).filter((m) => !m.resolved).length;
}

export function unreadConcepts(index: PackIndex, user: UserState, packId?: string): number {
  let n = 0;
  for (const ref of index.topics.values()) {
    if (packId && ref.packId !== packId) continue;
    for (const c of ref.topic.concepts) {
      if (!user.conceptsRead[`${ref.packId}:${c.id}`]) n++;
    }
  }
  return n;
}

export function buildDailyPlan(index: PackIndex, user: UserState): DailyPlan {
  const today = todayISO();
  const stat = user.daily[today] ?? {
    date: today,
    questions: 0,
    concepts: 0,
    revision: 0,
    mistakes: 0,
    cards: 0,
    xp: 0,
    minutes: 0,
  };
  const g = user.goals;

  const dueQuestions = countDue(index, user, 'questions');
  const openMistakes = unresolvedMistakes(user);
  const newConcepts = unreadConcepts(index, user, user.activePackId);

  const items = [
    {
      key: 'concepts',
      label: 'Concepts',
      emoji: '📖',
      target: Math.max(1, Math.min(g.concepts, newConcepts || g.concepts)),
      done: stat.concepts,
      backlog: newConcepts,
      route: 'learn',
      hint: newConcepts ? 'New concept waiting' : 'All concepts seen — revise instead',
    },
    {
      key: 'questions',
      label: 'Questions',
      emoji: '🎯',
      target: g.questions,
      done: stat.questions,
      backlog: dueQuestions,
      route: 'practice',
      hint: `${dueQuestions} due for review`,
    },
    {
      key: 'revision',
      label: 'Revision',
      emoji: '🔄',
      target: g.revision,
      done: stat.revision,
      backlog: dueQuestions,
      route: 'practice',
      hint: 'Spaced-repetition queue',
    },
    {
      key: 'mistakes',
      label: 'Mistakes',
      emoji: '❌',
      target: Math.max(1, Math.min(g.mistakes, openMistakes)),
      done: stat.mistakes,
      backlog: openMistakes,
      route: 'mistakes',
      hint: openMistakes ? `${openMistakes} in your error book` : 'Error book is clean 🎉',
    },
    {
      key: 'cards',
      label: 'Flashcards',
      emoji: '🧠',
      target: g.cards,
      done: stat.cards,
      backlog: 0,
      route: 'flashcards',
      hint: 'Active recall burst',
    },
  ].filter((i) => i.target > 0) as PlanItem[];

  const totalTarget = items.reduce((n, i) => n + i.target, 0) || 1;
  const totalDone = items.reduce((n, i) => n + Math.min(i.done, i.target), 0);

  return {
    date: today,
    items,
    overallPct: Math.min(100, Math.round((totalDone / totalTarget) * 100)),
    greeting: greetingFor(),
  };
}
