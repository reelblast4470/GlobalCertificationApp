/**
 * CONTENT INDEX
 * -------------
 * Flattens every installed pack into:
 *   - questionId -> full breadcrumb (used by every quiz mode)
 *   - topicId    -> full breadcrumb (used by Learn / mastery)
 *   - a flat search corpus (used by instant search)
 * Built once per pack set and memoised.
 */

import type {
  ContentPack,
  Flashcard,
  ID,
  PackIndex,
  QuestionRef,
  SearchDoc,
  TopicRef,
} from '../types/content';

export function buildIndex(packs: ContentPack[]): PackIndex {
  const questions = new Map<ID, QuestionRef>();
  const topics = new Map<ID, TopicRef>();
  const docs: SearchDoc[] = [];
  let flashcards = 0;

  const pushDoc = (d: SearchDoc) => {
    if (d.text || d.title) docs.push(d);
  };

  for (const pack of packs) {
    for (const subject of pack.subjects) {
      for (const chapter of subject.chapters) {
        for (const topic of chapter.topics) {
          topics.set(topic.id, {
            packId: pack.id,
            subjectId: subject.id,
            subjectTitle: subject.title,
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            topicId: topic.id,
            topic,
          });

          pushDoc({
            id: `topic:${topic.id}`,
            type: 'topic',
            title: topic.title,
            text: [topic.oneLineSummary, topic.keyDefinition, ...(topic.keyFacts ?? [])]
              .filter(Boolean)
              .join(' · '),
            topicId: topic.id,
            chapterId: chapter.id,
            subjectId: subject.id,
            packId: pack.id,
          });

          for (const concept of topic.concepts) {
            pushDoc({
              id: `concept:${concept.id}`,
              type: 'concept',
              title: concept.title,
              text: [
                concept.rememberThis,
                ...concept.blocks.map((b) => [b.title, b.body, ...(b.items ?? [])].filter(Boolean).join(' ')),
              ]
                .filter(Boolean)
                .join(' · '),
              topicId: topic.id,
              chapterId: chapter.id,
              subjectId: subject.id,
              packId: pack.id,
            });
            for (const kw of concept.keywords ?? []) {
              pushDoc({
                id: `keyword:${concept.id}:${kw}`,
                type: 'keyword',
                title: kw,
                text: concept.rememberThis,
                topicId: topic.id,
                chapterId: chapter.id,
                subjectId: subject.id,
                packId: pack.id,
              });
            }
          }

          for (const question of topic.questions) {
            questions.set(question.id, {
              packId: pack.id,
              subjectId: subject.id,
              subjectTitle: subject.title,
              chapterId: chapter.id,
              chapterTitle: chapter.title,
              topicId: topic.id,
              topicTitle: topic.title,
              question,
            });
            pushDoc({
              id: `question:${question.id}`,
              type: 'question',
              title: question.prompt,
              text: [
                ...(question.statements ?? []),
                ...question.options.map((o) => o.text),
                question.explanation,
                ...(question.tags ?? []),
              ].join(' · '),
              topicId: topic.id,
              chapterId: chapter.id,
              subjectId: subject.id,
              packId: pack.id,
            });
          }

          for (const card of topic.flashcards ?? []) {
            flashcards++;
            pushDoc({
              id: `card:${card.id}`,
              type: 'flashcard',
              title: card.front,
              text: `${card.back} ${card.trick ?? ''}`,
              topicId: topic.id,
              chapterId: chapter.id,
              subjectId: subject.id,
              packId: pack.id,
            });
          }
        }
      }
    }
  }

  return {
    questions,
    topics,
    docs,
    stats: {
      packs: packs.length,
      subjects: packs.reduce((n, p) => n + p.subjects.length, 0),
      chapters: packs.reduce((n, p) => n + p.subjects.reduce((m, s) => m + s.chapters.length, 0), 0),
      topics: topics.size,
      questions: questions.size,
      flashcards,
    },
  };
}

export function allFlashcards(packs: ContentPack[]): { card: Flashcard; topicId: ID; topicTitle: string }[] {
  const out: { card: Flashcard; topicId: ID; topicTitle: string }[] = [];
  for (const pack of packs)
    for (const subject of pack.subjects)
      for (const chapter of subject.chapters)
        for (const topic of chapter.topics)
          for (const card of topic.flashcards ?? []) out.push({ card, topicId: topic.id, topicTitle: topic.title });
  return out;
}

/** Stable pseudo-random shuffle so option order can vary without losing truth. */
export function shuffle<T>(input: T[], seed?: number): T[] {
  const arr = [...input];
  let s = seed ?? Math.floor(Math.random() * 1e9);
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
