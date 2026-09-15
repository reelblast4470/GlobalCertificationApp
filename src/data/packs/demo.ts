/**
 * PLACEHOLDER PACK
 * ----------------
 * This exists only so every screen has something real to render before the
 * student's own notes are imported. It is flagged `placeholder: true` and is
 * replaced/removed the moment a real pack is installed.
 *
 * It doubles as a live demonstration of the MCQ quality rules: each question
 * carries a source, four plausible options, an explanation, and a reason why
 * every distractor is wrong.
 */

import type { ContentPack } from '../../types/content';

export const DEMO_PACK: ContentPack = {
  id: 'demo-study-loop',
  examId: 'demo',
  examLabel: 'Demo',
  title: 'Demo: The Study Loop',
  audience: 'competitive',
  version: 1,
  sourceNotes: 'Built-in orientation pack — not from student notes.',
  generatedAt: '2026-01-01',
  subjects: [
    {
      id: 'demo-subject',
      title: 'Getting Started',
      icon: '🚀',
      chapters: [
        {
          id: 'demo-chapter',
          title: 'How this app works',
          icon: '📘',
          topics: [
            {
              id: 'demo-topic-loop',
              title: 'The Study Loop',
              minutes: 4,
              keyDefinition:
                'The study loop is the fixed cycle: Learn → Recall → Test → Correct → Repeat → Revise → Master.',
              keyFacts: [
                'The loop has seven stages, in this order: Learn, Recall, Test, Correct, Repeat, Revise, Master.',
                'Active recall (retrieving from memory) beats re-reading for long-term retention.',
                'Spaced repetition revisits an item just before you would forget it.',
                'The error book stores every wrong answer with the inferred reason for the mistake.',
                'Mastery is computed: exposure × (0.6 × accuracy + 0.4 × schedule stability).',
              ],
              formulas: [
                'Mastery = exposure × (0.6 × accuracy + 0.4 × stability), capped at 100',
                'Exam score = correct − (wrong × negative marking)',
              ],
              commonConfusion:
                'Re-reading notes feels productive but is passive. Recall (closing the book and answering) is what builds retention.',
              oneLineSummary:
                'Study in a loop: learn a little, immediately recall it, test it, fix mistakes, and let the scheduler bring it back before you forget.',
              concepts: [
                {
                  id: 'demo-concept-loop',
                  title: 'The Study Loop',
                  keywords: ['active recall', 'spaced repetition', 'mastery', 'error book', 'interleaving'],
                  rememberThis:
                    'Learn → Recall → Test → Correct → Repeat → Revise → Master. Small chunks, immediately tested, scheduled back in.',
                  mnemonic: {
                    for: 'The seven stages of the study loop',
                    text: 'Lively Rabbits Test Carrots, Rarely Regret Munching → Learn, Recall, Test, Correct, Repeat, Revise, Master',
                    note: 'The first letter of each word maps to the stage, in order.',
                  },
                  blocks: [
                    {
                      kind: 'simple',
                      title: 'In simple words',
                      body: 'This app does not let you read passively. It teaches a small chunk, immediately asks you to recall it, marks what you got wrong, then brings that exact item back tomorrow, then in 3 days, then in 7 — until it sticks.',
                    },
                    {
                      kind: 'definition',
                      title: 'The loop',
                      body: 'The study loop is a fixed cycle: **Learn → Recall → Test → Correct → Repeat → Revise → Master**.',
                    },
                    {
                      kind: 'steps',
                      title: 'How a session flows',
                      items: [
                        'Learn one concept (2–5 minutes, never a wall of text).',
                        'Quick Check: 2–5 questions on that concept, immediately.',
                        'Practice: mixed questions, difficulty ramps up as you streak.',
                        'Review: every wrong answer lands in your error book with a reason.',
                        'Revise: the scheduler brings the item back before you forget it.',
                        'Master: topic mastery crosses 96% and the item is retired.',
                      ],
                    },
                    {
                      kind: 'example',
                      title: 'Example',
                      body: 'You read that a bill becomes an Act after the President gives assent. Instead of re-reading that line five times, you close it and answer: "What turns a bill into an Act?" Getting it wrong is useful — it puts the fact into your error book and schedules it for tomorrow.',
                    },
                    {
                      kind: 'facts',
                      title: 'Important facts',
                      items: [
                        'Active recall beats re-reading for long-term retention.',
                        'Spaced repetition revisits an item just before you would forget it.',
                        'The revision ladder is 1 → 3 → 7 → 14 → 30 days, and it stretches when you keep getting it right.',
                        'Difficulty rises after two correct answers in a row and drops after a miss.',
                      ],
                    },
                    {
                      kind: 'compare',
                      title: 'Confusing pair: re-reading vs recall',
                      pairs: [
                        { left: 'Re-reading: eyes on notes', right: 'Recognises the text; feels easy; fades fast' },
                        { left: 'Recall: eyes off notes', right: 'Rebuilds the memory; feels hard; lasts' },
                      ],
                    },
                    {
                      kind: 'examPoint',
                      title: 'Exam point',
                      body: 'If you only have 15 minutes before an exam, open **⚡ Quick Revision** or your **❌ Error book** — never a fresh chapter.',
                    },
                    {
                      kind: 'keyword',
                      title: 'Remember these terms',
                      items: ['Active recall', 'Spaced repetition', 'Interleaving', 'Mastery score', 'Error book', 'Negative marking'],
                    },
                    {
                      kind: 'trick',
                      title: 'Memory trick',
                      body: '**Lively Rabbits Test Carrots, Rarely Regret Munching** → Learn, Recall, Test, Correct, Repeat, Revise, Master.',
                    },
                  ],
                },
              ],
              flashcards: [
                {
                  id: 'demo-card-1',
                  front: 'What are the seven stages of the study loop?',
                  back: 'Learn → Recall → Test → Correct → Repeat → Revise → Master.',
                  trick: 'Lively Rabbits Test Carrots, Rarely Regret Munching',
                },
                {
                  id: 'demo-card-2',
                  front: 'Re-reading vs active recall — which builds retention?',
                  back: 'Active recall. Re-reading only builds familiarity with the text; recall rebuilds the memory itself.',
                  trick: 'Recall = rebuild. Re-read = recognise.',
                },
                {
                  id: 'demo-card-3',
                  front: 'What is the default revision ladder?',
                  back: '1 → 3 → 7 → 14 → 30 days, stretching further each time you get it right.',
                  trick: 'Odd doubles: 1-3-7-14-30',
                },
                {
                  id: 'demo-card-4',
                  front: 'How is mastery calculated?',
                  back: 'Mastery = exposure × (0.6 × accuracy + 0.4 × schedule stability).',
                  trick: 'You cannot master what you have not met (exposure).',
                },
              ],
              questions: [
                {
                  id: 'demo-q1',
                  type: 'direct',
                  difficulty: 'easy',
                  prompt: 'What are the stages of the study loop used by this app, in the correct order?',
                  options: [
                    { id: 'a', text: 'Learn → Recall → Test → Correct → Repeat → Revise → Master' },
                    { id: 'b', text: 'Read → Memorise → Test → Repeat → Master' },
                    { id: 'c', text: 'Learn → Test → Revise → Master → Recall' },
                    { id: 'd', text: 'Recall → Learn → Correct → Test → Revise → Master → Repeat' },
                  ],
                  correct: ['a'],
                  explanation:
                    'The full cycle is Learn → Recall → Test → Correct → Repeat → Revise → Master.',
                  whyWrong: {
                    b: 'Drops four stages and puts memorising before testing.',
                    c: 'Drops Correct and Repeat, and puts Recall last.',
                    d: 'Starts with Recall — you cannot recall something you have not learned yet.',
                  },
                  source: 'Demo pack → The Study Loop → The loop',
                  tags: ['loop'],
                  hintMnemonic: 'Lively Rabbits Test Carrots, Rarely Regret Munching',
                },
                {
                  id: 'demo-q2',
                  type: 'conceptual',
                  difficulty: 'medium',
                  prompt: 'Why is active recall more effective than re-reading the same notes?',
                  options: [
                    { id: 'a', text: 'Because recalling rebuilds the memory, while re-reading only builds familiarity with the text' },
                    { id: 'b', text: 'Because re-reading is physically slower than answering questions' },
                    { id: 'c', text: 'Because re-reading damages long-term memory' },
                    { id: 'd', text: 'Because recall can only be done under exam conditions' },
                  ],
                  correct: ['a'],
                  explanation:
                    'Re-reading creates the feeling of knowing because the text looks familiar. Recall forces you to reconstruct the memory, which is what actually strengthens it.',
                  whyWrong: {
                    b: 'Speed is not the mechanism; re-reading is often faster.',
                    c: 'An overstatement — re-reading is simply weak, not harmful.',
                    d: 'Recall works anywhere: flashcards in a queue count.',
                  },
                  source: 'Demo pack → The Study Loop → Confusing pair: re-reading vs recall',
                  tags: ['recall'],
                },
                {
                  id: 'demo-q3',
                  type: 'application',
                  difficulty: 'hard',
                  prompt:
                    'You have exactly 15 minutes before a mock test and one topic at 38% mastery. What should this app push you to do?',
                  options: [
                    { id: 'a', text: 'Start a brand-new chapter to cover more syllabus' },
                    { id: 'b', text: 'Open Quick Revision and the error book for the weak topic' },
                    { id: 'c', text: 'Re-read the entire chapter from the first page' },
                    { id: 'd', text: 'Attempt a full 100-question mock test' },
                  ],
                  correct: ['b'],
                  explanation:
                    'With limited time, revision beats new learning. Quick Revision compresses a chapter to its facts, and the error book targets exactly what you got wrong before.',
                  whyWrong: {
                    a: 'New material in the last 15 minutes rarely converts into marks.',
                    c: 'Passive and unfocused — it does not target your gaps.',
                    d: 'A full mock takes longer than 15 minutes and adds nothing you can fix in time.',
                  },
                  source: 'Demo pack → The Study Loop → Exam point',
                  tags: ['strategy'],
                },
                {
                  id: 'demo-q4',
                  type: 'statement',
                  difficulty: 'medium',
                  prompt: 'Which of the statements given below is/are correct?',
                  statements: [
                    'Statement I: The default revision ladder is 1 → 3 → 7 → 14 → 30 days.',
                    'Statement II: The ladder stretches further each time you answer correctly.',
                  ],
                  options: [
                    { id: 'a', text: 'Only Statement I is correct' },
                    { id: 'b', text: 'Only Statement II is correct' },
                    { id: 'c', text: 'Both Statement I and Statement II are correct' },
                    { id: 'd', text: 'Neither Statement I nor Statement II is correct' },
                  ],
                  correct: ['c'],
                  explanation:
                    'Both are correct. The base ladder is 1-3-7-14-30, and a correct answer multiplies the interval by your ease factor.',
                  whyWrong: {
                    a: 'Statement II is also correct — intervals grow on success.',
                    b: 'Statement I is also correct — that is the base ladder.',
                    d: 'Both statements are supported by the notes.',
                  },
                  source: 'Demo pack → The Study Loop → Important facts',
                  tags: ['srs'],
                },
                {
                  id: 'demo-q5',
                  type: 'assertion-reason',
                  difficulty: 'hard',
                  prompt: 'Assertion & Reason',
                  statements: [
                    'Assertion (A): A topic you have never attempted shows 0% mastery in this app.',
                    'Reason (R): Mastery is multiplied by exposure — the share of the topic’s questions you have actually met.',
                  ],
                  options: [
                    { id: 'a', text: 'Both A and R are true and R correctly explains A' },
                    { id: 'b', text: 'Both A and R are true but R does not explain A' },
                    { id: 'c', text: 'A is true but R is false' },
                    { id: 'd', text: 'A is false but R is true' },
                  ],
                  correct: ['a'],
                  explanation:
                    'Mastery = exposure × (0.6 × accuracy + 0.4 × stability). If exposure is 0, mastery is 0 — which is exactly why R explains A.',
                  whyWrong: {
                    b: 'R is precisely the mechanism behind A.',
                    c: 'R is true — exposure is part of the formula.',
                    d: 'A is true — unseen topics read 0%.',
                  },
                  source: 'Demo pack → The Study Loop → Important facts',
                  tags: ['mastery'],
                },
                {
                  id: 'demo-q6',
                  type: 'negative',
                  difficulty: 'medium',
                  prompt: 'Which of the following is NOT part of how this app computes topic mastery?',
                  options: [
                    { id: 'a', text: 'How many of the topic’s questions you have attempted' },
                    { id: 'b', text: 'Your exponentially-weighted recent accuracy' },
                    { id: 'c', text: 'How far spaced repetition has pushed the interval' },
                    { id: 'd', text: 'The total number of chapters in the subject' },
                  ],
                  correct: ['d'],
                  explanation:
                    'Mastery = exposure × (0.6 × accuracy + 0.4 × stability). Chapter count plays no part — a topic is judged only on its own questions.',
                  whyWrong: {
                    a: 'That is exposure, a real factor.',
                    b: 'That is the accuracy term — recent attempts weigh more.',
                    c: 'That is the stability term, min(interval / 21, 1).',
                  },
                  source: 'Demo pack → The Study Loop → Important facts',
                  tags: ['mastery', 'negative'],
                  hint: 'Read the NOT before you read the options.',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  clarifications: [],
};
