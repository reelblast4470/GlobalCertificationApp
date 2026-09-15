/* Headless engine checks — run with: npx esbuild tests/engine.test.ts --bundle --platform=node --outfile=/tmp/t.cjs && node /tmp/t.cjs
   Covers the things the spec says must be verified: score calculation,
   revision logic, mastery bands, mistake tracking, importer fidelity. */

import { applyReview, nextInterval, dueLabel, addDays, todayISO, isDue } from '../src/engine/srs';
import { topicMastery, bandOf, rankWeakTopics, nextStudyAdvice } from '../src/engine/mastery';
import { gradeExam } from '../src/engine/exam';
import { inferReason, recordMistake, redeemMistake } from '../src/engine/mistakes';
import { importNotes, validatePack } from '../src/engine/importer';
import { buildIndex, shuffle } from '../src/engine/indexBuilder';
import { selectQuestions } from '../src/engine/selector';
import { buildDailyPlan } from '../src/engine/planner';
import { search } from '../src/engine/search';
import { DEMO_PACK } from '../src/data/packs/demo';
import type { UserState, SrsState } from '../src/types/progress';
import type { QuestionRef, Question } from '../src/types/content';

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${extra}`);
  }
};
const eq = (name: string, a: unknown, b: unknown) => ok(name, JSON.stringify(a) === JSON.stringify(b), `got ${JSON.stringify(a)} want ${JSON.stringify(b)}`);

const emptyUser = (): UserState => ({
  version: 1,
  createdAt: new Date().toISOString(),
  settings: { theme: 'dark', dailyGoalQuestions: 30, negativeMarking: 0.25, examLength: 25, examMinutes: 30, optionShuffle: true, instantFeedback: true, showTimer: true },
  goals: { questions: 30, concepts: 2, revision: 15, mistakes: 10, cards: 5 },
  xp: 0, level: 1, streak: { current: 0, best: 0 },
  questions: {}, cards: {}, topics: {}, mistakes: {}, attempts: [], daily: {}, achievements: [], conceptsRead: {},
  personalBest: { accuracy: 0, examScore: 0, streak: 0 },
});

console.log('\n[1] Spaced repetition ladder');
{
  const today = todayISO();
  let s: SrsState | undefined;
  s = applyReview(s, 'good');
  eq('first good -> due tomorrow', s.due, addDays(today, 1));
  s = applyReview(s, 'good');
  eq('second good -> 3 days', s.interval, 3);
  s = applyReview(s, 'good');
  eq('third good -> 7 days', s.interval, 7);
  const before = s.interval;
  s = applyReview(s, 'again');
  ok('again resets to today', s.due === today && s.interval === 0, JSON.stringify(s));
  eq('lapse counted', s.lapses, 1);
  s = applyReview(s, 'hard');
  ok('after lapse, hard re-enters ladder at 1', s.interval === 1 && before > 0);
  eq('easy grows faster than good', nextInterval(7, 2.5, 'easy') > nextInterval(7, 2.5, 'good'), true);
  ok('ease stays in range', applyReview(applyReview(applyReview(undefined, 'again'), 'again'), 'again').ease >= 1.3);
  ok('dueLabel new', dueLabel(undefined) === 'New');
  ok('dueLabel overdue', dueLabel({ due: addDays(today, -4), interval: 3, ease: 2.5, reps: 1, lapses: 0, history: [] }).includes('Overdue 4 days'));
  ok('isDue true for past date', isDue({ due: addDays(today, -1), interval: 1, ease: 2.5, reps: 1, lapses: 0, history: [] }));
}

console.log('\n[2] Mastery bands');
{
  eq('0 -> weak', bandOf(0), 'weak');
  eq('40 -> weak', bandOf(40), 'weak');
  eq('41 -> learning', bandOf(41), 'learning');
  eq('65 -> improving', bandOf(65), 'improving');
  eq('90 -> strong', bandOf(90), 'strong');
  eq('100 -> mastered', bandOf(100), 'mastered');

  const full = topicMastery({
    totalQuestions: 4,
    seenQuestions: 4,
    srsStates: Array.from({ length: 4 }, () => ({ due: todayISO(), interval: 30, ease: 2.6, reps: 6, lapses: 0, history: Array(6).fill({ ok: true }) })),
    stat: { topicId: 't', seen: 4, correct: 4, wrong: 0, accuracy: 1, streakCorrect: 4, minutes: 1 },
  });
  ok('fully known topic is high', full >= 90, `got ${full}`);

  const half = topicMastery({
    totalQuestions: 4, seenQuestions: 2,
    srsStates: [{ due: todayISO(), interval: 1, ease: 2.5, reps: 1, lapses: 0, history: [{ ok: true }] }],
    stat: { topicId: 't', seen: 2, correct: 1, wrong: 1, accuracy: 0.5, streakCorrect: 0, minutes: 1 },
  });
  ok('half-seen topic stays low', half < 40, `got ${half}`);
  eq('untouched topic is 0', topicMastery({ totalQuestions: 5, seenQuestions: 0, srsStates: [] }), 0);
}

console.log('\n[3] Exam scoring');
{
  const index = buildIndex([DEMO_PACK]);
  const refs = [...index.questions.values()].slice(0, 6);
  const answers = Object.fromEntries(
    refs.map((r, i) => [r.question.id, { qid: r.question.id, selected: i < 4 ? r.question.correct : i === 4 ? ['zzz'] : [], timeSec: 30, marked: false }])
  );
  const res = gradeExam(refs, answers, 300, { count: 6, minutes: 30, negative: 0.25, shuffleOptions: false });
  eq('correct counted', res.correct, 4);
  eq('wrong counted', res.wrong, 1);
  eq('unattempted counted', res.unattempted, 1);
  eq('score with -0.25', res.score, 3.75);
  eq('percent', res.percent, 63);
  eq('accuracy of attempted', res.accuracy, 80);
  eq('avg sec/question', res.avgSecPerQuestion, 50);
  ok('strategy tips present', res.strategy.length > 0);
  ok('weak topics identified', res.byTopic.length > 0);

  const noNeg = gradeExam(refs, answers, 300, { count: 6, minutes: 30, negative: 0, shuffleOptions: false });
  eq('score without negative marks', noNeg.score, 4);
  const skipped = gradeExam(refs, {}, 100, { count: 6, minutes: 30, negative: 0.5, shuffleOptions: false });
  eq('all skipped = 0', skipped.score, 0);
  ok('all skipped -> 0% accuracy not NaN', skipped.accuracy === 0);
}

console.log('\n[4] Mistake book');
{
  const q: Question = {
    id: 'q1', type: 'negative', difficulty: 'medium',
    prompt: 'Which of the following is NOT a Fundamental Right?',
    options: [
      { id: 'a', text: 'Right to Equality' }, { id: 'b', text: 'Right to Property' },
      { id: 'c', text: 'Right to Freedom' }, { id: 'd', text: 'Right to Education' },
    ],
    correct: ['b'], explanation: 'Right to Property was removed by the 44th Amendment.', source: 'notes',
  };
  ok('detects missed NOT', inferReason(q, ['a']).toLowerCase().includes('negative'));
  const q2 = { ...q, type: 'multi' as const, correct: ['a', 'b'] };
  ok('detects under-selection', inferReason(q2 as Question, ['a']).includes('Under-selected'));
  ok('detects no answer', inferReason(q, []).includes('unanswered'));

  const u = emptyUser();
  recordMistake(u, q, ['a'], 'Fundamental Rights', 'practice');
  eq('mistake stored', u.mistakes.q1.times, 1);
  recordMistake(u, q, ['a'], 'Fundamental Rights', 'practice');
  eq('repeat increments', u.mistakes.q1.times, 2);
  redeemMistake(u, 'q1');
  eq('redeem decrements', u.mistakes.q1.times, 1);
  redeemMistake(u, 'q1');
  ok('resolved at zero', u.mistakes.q1.resolved);
}

console.log('\n[5] Importer fidelity (no invented facts)');
{
  const notes = `## Fundamental Rights

Fundamental Rights are the basic human rights guaranteed by Part III of the Constitution.
They are enforceable by the courts under Article 32.

- There are six categories of Fundamental Rights
- The Right to Property was removed by the 44th Amendment in 1978
- Article 32 is called the heart and soul of the Constitution

## Directive Principles

Directive Principles of State Policy are non-justiciable guidelines to the state.
Fundamental Rights are justiciable, whereas Directive Principles are not.

- They are contained in Part IV
- Article 37 declares them fundamental in the governance of the country`;

  const rep = importNotes(notes, { title: 'Polity', examId: 'ssc', examLabel: 'SSC', subjectTitle: 'Polity' });
  ok('sections detected', rep.headings === 2, `got ${rep.headings}`);
  ok('definitions extracted', rep.definitions >= 3, `got ${rep.definitions}`);
  ok('dates found (1978)', rep.dates >= 1, `got ${rep.dates}`);
  ok('flashcards from definitions', rep.flashcards >= 3, `got ${rep.flashcards}`);
  ok('auto MCQs generated', rep.autoQuestions >= 1, `got ${rep.autoQuestions}`);

  const issues = validatePack(rep.pack);
  const errors = issues.filter((i) => i.severity === 'error');
  eq('no blocking validation errors', errors.length, 0);
  const allQs = rep.pack.subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics.flatMap((t) => t.questions)));
  ok('every auto question has a source', allQs.every((q) => !!q.source));
  ok('every auto question has 4 options', allQs.every((q) => q.options.length === 4));
  ok('correct answer is in options', allQs.every((q) => q.correct.every((id) => q.options.some((o) => o.id === id))));
  ok('no duplicate option text', allQs.every((q) => new Set(q.options.map((o) => o.text)).size === q.options.length));
  ok('facts preserved in topic', rep.pack.subjects[0].chapters[0].topics[0].keyFacts!.length > 0);

  const idx = buildIndex([rep.pack]);
  ok('index built from imported pack', idx.questions.size === allQs.length);
}

console.log('\n[6] Selection, search, planner');
{
  const index = buildIndex([DEMO_PACK]);
  const u = emptyUser();
  const picked = selectQuestions(index, u, { mode: 'practice', count: 4 });
  eq('picks requested count', picked.length, 4);
  ok('no duplicates in a set', new Set(picked.map((p) => p.question.id)).size === 4);
  const easyFirst = selectQuestions(index, u, { mode: 'practice', count: 6 });
  const order = { easy: 0, medium: 1, hard: 2 };
  ok('difficulty ramps easy->hard', easyFirst.every((r, i) => i === 0 || order[r.question.difficulty] >= order[easyFirst[i - 1].question.difficulty]));
  const rev = selectQuestions(index, u, { mode: 'revision', count: 3 });
  ok('revision returns due items', rev.length > 0);
  eq('mistake mode empty when no mistakes', selectQuestions(index, u, { mode: 'mistake', count: 3 }).length, 0);

  const hits = search(index, 'mastery');
  ok('search finds matches', hits.length > 0);
  ok('search snippet highlights', hits[0].parts[1].length > 0);
  eq('short query ignored', search(index, 'a').length, 0);

  const plan = buildDailyPlan(index, u);
  ok('plan has items', plan.items.length >= 3);
  eq('plan starts at 0%', plan.overallPct, 0);

  const shuffled = shuffle([1, 2, 3, 4, 5], 42);
  ok('shuffle keeps all elements', [...shuffled].sort().join() === '1,2,3,4,5');
  eq('shuffle is seeded/deterministic', shuffle([1, 2, 3, 4, 5], 42).join(), shuffled.join());
}

console.log('\n[7] Adaptive advice');
{
  const ranked = rankWeakTopics([
    { topicId: 'a', title: 'Algebra', mastery: 92, mistakes: 0, lastActivity: new Date().toISOString() },
    { topicId: 'b', title: 'Geometry', mastery: 30, mistakes: 4, lastActivity: new Date().toISOString() },
  ]);
  eq('weakest ranked last in ascending sort', ranked[ranked.length - 1].title, 'Algebra');
  const advice = nextStudyAdvice(ranked.map((r) => ({ title: r.title, mastery: r.mastery })).reverse());
  ok('advice mentions weak topic', (advice ?? '').includes('Geometry'), advice ?? '');
  ok('advice suggests minutes', /\d+ minutes/.test(advice ?? ''), advice ?? '');
}

console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
