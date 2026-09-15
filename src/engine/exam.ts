/**
 * EXAM SIMULATOR — scoring, analysis and strategy feedback.
 */

import type { PackIndex, QuestionRef } from '../types/content';
import type { AttemptLog, UserState } from '../types/progress';
import { selectQuestions } from './selector';

export interface ExamConfig {
  count: number;
  minutes: number;
  negative: number; // 0 | 0.25 | 0.33 | 0.5
  topicIds?: string[];
  chapterId?: string;
  subjectId?: string;
  shuffleOptions: boolean;
}

export interface ExamAnswer {
  qid: string;
  selected: string[];
  timeSec: number;
  marked: boolean;
}

export interface ExamResult {
  total: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  score: number;
  maxScore: number;
  percent: number;
  accuracy: number; // of attempted
  durationSec: number;
  avgSecPerQuestion: number;
  negative: number;
  perQuestion: {
    ref: QuestionRef;
    selected: string[];
    isCorrect: boolean;
    timeSec: number;
    marks: number;
  }[];
  byTopic: { topicId: string; topicTitle: string; correct: number; total: number; pct: number }[];
  weakTopics: string[];
  strongTopics: string[];
  strategy: string[];
}

export function buildExamSet(index: PackIndex, user: UserState, cfg: ExamConfig): QuestionRef[] {
  return selectQuestions(index, user, {
    mode: 'practice',
    count: cfg.count,
    topicIds: cfg.topicIds,
    chapterId: cfg.chapterId,
    subjectId: cfg.subjectId,
  });
}

export function gradeExam(
  refs: QuestionRef[],
  answers: Record<string, ExamAnswer>,
  durationSec: number,
  cfg: ExamConfig
): ExamResult {
  const perQuestion = refs.map((ref) => {
    const a = answers[ref.question.id];
    const selected = a?.selected ?? [];
    const correctSet = new Set(ref.question.correct);
    const isCorrect =
      selected.length > 0 &&
      selected.length === correctSet.size &&
      selected.every((s) => correctSet.has(s));
    const marks = selected.length === 0 ? 0 : isCorrect ? 1 : -cfg.negative;
    return { ref, selected, isCorrect, timeSec: a?.timeSec ?? 0, marks };
  });

  const correct = perQuestion.filter((p) => p.isCorrect).length;
  const attempted = perQuestion.filter((p) => p.selected.length > 0).length;
  const wrong = attempted - correct;
  const unattempted = perQuestion.length - attempted;
  const score = +perQuestion.reduce((s, p) => s + (p.selected.length ? p.marks : 0), 0).toFixed(2);
  const maxScore = perQuestion.length;

  const topicMap = new Map<string, { correct: number; total: number; title: string }>();
  for (const p of perQuestion) {
    const cur = topicMap.get(p.ref.topicId) ?? {
      correct: 0,
      total: 0,
      title: p.ref.topicTitle,
    };
    cur.total++;
    if (p.isCorrect) cur.correct++;
    topicMap.set(p.ref.topicId, cur);
  }
  const byTopic = [...topicMap.entries()]
    .map(([topicId, v]) => ({
      topicId,
      topicTitle: v.title,
      correct: v.correct,
      total: v.total,
      pct: Math.round((v.correct / v.total) * 100),
    }))
    .sort((a, b) => a.pct - b.pct);

  const slow = perQuestion.filter((p) => p.timeSec > 90);

  return {
    total: perQuestion.length,
    attempted,
    correct,
    wrong,
    unattempted,
    score,
    maxScore,
    percent: maxScore ? Math.round((score / maxScore) * 100) : 0,
    accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
    durationSec,
    avgSecPerQuestion: perQuestion.length ? Math.round(durationSec / perQuestion.length) : 0,
    negative: cfg.negative,
    perQuestion,
    byTopic,
    weakTopics: byTopic.filter((t) => t.pct < 50).map((t) => t.topicTitle),
    strongTopics: byTopic.filter((t) => t.pct >= 80).map((t) => t.topicTitle),
    strategy: buildStrategy({
      accuracy: attempted ? correct / attempted : 0,
      unattempted,
      total: perQuestion.length,
      avgSec: perQuestion.length ? durationSec / perQuestion.length : 0,
      slowWrong: perQuestion.filter((p) => !p.isCorrect && p.timeSec > 60).length,
      slowCount: slow.length,
      negative: cfg.negative,
      wrong,
      weak: byTopic.filter((t) => t.pct < 50).map((t) => t.topicTitle),
    }),
  };
}

function buildStrategy(m: {
  accuracy: number;
  unattempted: number;
  total: number;
  avgSec: number;
  slowWrong: number;
  slowCount: number;
  negative: number;
  wrong: number;
  weak: string[];
}): string[] {
  const tips: string[] = [];
  const acc = Math.round(m.accuracy * 100);

  if (m.total === 0) return ['Attempt more questions to unlock strategy tips.'];

  if (acc >= 85 && m.avgSec > 60)
    tips.push(
      `Your accuracy is ${acc}%, but you average ${Math.round(m.avgSec)}s per question. Set a 60s cut-off: skip, mark for review, come back.`
    );
  if (acc < 60)
    tips.push(
      `Accuracy ${acc}% — speed is not the problem yet. Slow down, read the NOT/EXCEPT words, and eliminate two options before you commit.`
    );
  if (m.slowWrong >= 3)
    tips.push(
      `${m.slowWrong} questions took over a minute and were still wrong. Those are guesses dressed up as effort — mark and move on next time.`
    );
  if (m.unattempted > 0)
    tips.push(
      `You left ${m.unattempted} unanswered. With ${m.negative} negative marking, an educated 50/50 guess is worth it — blind guessing is not.`
    );
  if (m.negative >= 0.25 && m.wrong > m.total * 0.3)
    tips.push(
      `With ${m.negative} negative marking, ${m.wrong} wrong answers cost you ${(m.wrong * m.negative).toFixed(2)} marks. Attempt fewer, but attempt better.`
    );
  if (m.weak.length)
    tips.push(
      `You repeatedly made mistakes in ${m.weak.slice(0, 2).join(' and ')}. Revise these two topics before your next mock test.`
    );
  if (!tips.length) tips.push(`Solid round — ${acc}% accuracy at ${Math.round(m.avgSec)}s per question. Push the difficulty up next time.`);
  return tips.slice(0, 4);
}

export function resultToAttempt(result: ExamResult, durationSec: number, negative: number): AttemptLog {
  const byTopic: Record<string, { correct: number; total: number }> = {};
  for (const t of result.byTopic) byTopic[t.topicId] = { correct: t.correct, total: t.total };
  return {
    id: `a${Date.now()}`,
    mode: 'exam',
    ts: new Date().toISOString(),
    total: result.total,
    correct: result.correct,
    wrong: result.wrong,
    unattempted: result.unattempted,
    durationSec,
    negative,
    score: result.score,
    maxScore: result.maxScore,
    byTopic,
  };
}

export const fmtTime = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};
