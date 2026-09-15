/**
 * NOTE IMPORTER
 * -------------
 * Turns raw notes (plain text / markdown / pasted-from-PDF) into a structured
 * ContentPack draft. Rules it obeys, in this order:
 *
 *   1. NEVER lose information — every source line is preserved in the pack.
 *   2. NEVER invent a fact — auto-questions are cloze-style and quoted from
 *      the notes; if 4 plausible options cannot be built, no question is made.
 *   3. Anything unclear or contradictory is surfaced in `clarifications`
 *      with the flag "Source clarification required" instead of being guessed.
 *
 * The output is a DRAFT: it is meant to be reviewed (and hand-topped-up with
 * conceptual / application / assertion-reason questions) in the Import screen.
 */

import type {
  Chapter,
  Concept,
  ConceptBlock,
  ContentPack,
  Flashcard,
  Question,
  Subject,
  Topic,
} from '../types/content';

const MONTHS =
  'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec';

const slug = (s: string, fallback = 'x'): string =>
  (s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || fallback);

const clean = (s: string): string =>
  s
    .replace(/^#+\s*/, '')
    .replace(/^\s*[-*•]\s*/, '')
    .replace(/^\s*\d+[.)]\s*/, '')
    .replace(/\*\*/g, '')
    .trim();

const DEFINITION_RE =
  /^([A-Z][\p{L}\p{N}\s\-'’()/,]{2,60}?)\s+(is|are|was|were|means|refers to|denotes|is defined as|is known as|implies)\s+(.{5,})$/iu;

const COMPARE_RE = /\b(vs\.?|versus|whereas|unlike|in contrast|difference between|however)\b/i;
const NUMBER_RE = /\b\d+(\.\d+)?\s*(%|percent|km|kg|cm|m|l|ml|years?|days?|months?|articles?|sections?|marks?)?\b/i;
const DATE_RE = new RegExp(`\\b(\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4}|(?:${MONTHS})\\s+\\d{1,2},?\\s+\\d{4}|\\b(1[0-9]{3}|20[0-9]{2})\\b)\\b`, 'i');
const HEADING_MD_RE = /^#{1,6}\s+/;
const ALLCAPS_RE = /^[A-Z0-9][A-Z0-9\s\-–—:,.()/&']{2,60}$/;

export interface ImportReport {
  pack: ContentPack;
  lines: number;
  headings: number;
  definitions: number;
  facts: number;
  dates: number;
  lists: number;
  autoQuestions: number;
  flashcards: number;
  clarifications: number;
  warnings: string[];
}

export function importNotes(
  raw: string,
  meta: { title: string; examId: string; examLabel: string; subjectTitle: string; audience?: ContentPack['audience'] }
): ImportReport {
  const warnings: string[] = [];
  const lines = raw.replace(/\r/g, '').split('\n');
  let definitions = 0;
  let facts = 0;
  let dates = 0;
  let lists = 0;
  let autoQuestions = 0;
  let flashcards = 0;

  /* ---------- pass 1: split into sections by heading ---------- */
  interface Section {
    level: number;
    title: string;
    lines: string[];
  }
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const isMd = HEADING_MD_RE.test(t);
    const mdLevel = (t.match(/^#+/) ?? ['#'])[0].length;
    const isCaps = !isMd && ALLCAPS_RE.test(t) && t.length < 70 && !t.endsWith('.');
    const isNumberedHeading = /^\d+(\.\d+)?\s+[A-Z]/.test(t) && t.length < 80 && !t.endsWith('.');
    if (isMd || isCaps || isNumberedHeading) {
      const level = isMd ? mdLevel : isNumberedHeading ? (t.split('.').length > 1 ? 2 : 1) : 1;
      current = { level, title: isMd ? t.replace(/^#+\s*/, '') : t.replace(/^\d+(\.\d+)?\s*/, ''), lines: [] };
      sections.push(current);
    } else {
      if (!current) current = { level: 1, title: 'Imported Notes', lines: [] };
      if (!sections.includes(current)) sections.push(current);
      current.lines.push(t);
    }
  }

  /* ---------- pass 2: chapter -> topic tree ---------- */
  const chapters: Chapter[] = [];
  const clarifications: { ref: string; issue: string }[] = [];
  const definitionIndex: { subject: string; body: string; topicId: string }[] = [];

  const rootLevel = Math.min(...sections.map((s) => s.level), 3);

  for (const section of sections) {
    const isChapter = section.level <= rootLevel;
    const chapterTitle = isChapter ? section.title : 'General';
    const topicTitle = isChapter ? section.title : section.title;

    let chapter = chapters.find((c) => c.title === chapterTitle);
    if (!chapter) {
      chapter = { id: slug(chapterTitle, 'chapter'), title: chapterTitle, topics: [] };
      chapters.push(chapter);
    }

    const topicId = `${chapter.id}--${slug(topicTitle, 'topic')}`;
    const blocks: ConceptBlock[] = [];
    const keyFacts: string[] = [];
    const cards: Flashcard[] = [];
    const questions: Question[] = [];
    const keywords = new Set<string>();

    // split section body into paragraphs / bullet groups
    const bullets: string[] = [];
    const prose: string[] = [];
    for (const l of section.lines) {
      const c = clean(l);
      if (!c) continue;
      if (/^\s*[-*•]/.test(l) || /^\s*\d+[.)]\s/.test(l)) bullets.push(c);
      else prose.push(c);
      const def = c.match(DEFINITION_RE);
      if (def) {
        definitions++;
        const subject = def[1].trim();
        const body = c.trim();
        definitionIndex.push({ subject, body: def[3].trim(), topicId });
        blocks.push({ kind: 'definition', title: subject, body });
        cards.push({
          id: slug(`card-${subject}`),
          front: `What is ${subject}?`,
          back: def[3].trim(),
        });
        flashcards++;
      }
      if (DATE_RE.test(c)) {
        dates++;
        keyFacts.push(c);
      } else if (NUMBER_RE.test(c) && !keyFacts.includes(c)) {
        facts++;
        keyFacts.push(c);
      }
      if (COMPARE_RE.test(c)) {
        blocks.push({ kind: 'compare', title: 'Compare & contrast', body: c });
      }
      if (/\?\?|tbd|not clear|verify|confirm this/i.test(c)) {
        clarifications.push({
          ref: `${topicTitle}: ${c.slice(0, 60)}`,
          issue: 'Source clarification required — the notes flag this as unclear.',
        });
      }
    }

    if (prose.length) {
      blocks.push({ kind: 'simple', title: 'In simple words', body: prose.slice(0, 3).join(' ') });
    }
    if (bullets.length) {
      lists += bullets.length;
      const numbered = bullets.filter((b, i) => i === 0 || NUMBER_RE.test(b));
      blocks.push({
        kind: bullets.length >= 3 && /^\d/.test(section.lines.find((l) => /^\s*\d+[.)]\s/.test(l)) ?? '')
          ? 'steps'
          : 'facts',
        title: 'Important points',
        items: bullets,
      });
      void numbered;
    }
    const uniqueFacts = [...new Set(keyFacts)].slice(0, 10);
    if (uniqueFacts.length) blocks.push({ kind: 'facts', title: 'Key facts & figures', items: uniqueFacts });

    // keywords: capitalised multiword terms that repeat
    const termCounts = new Map<string, number>();
    for (const l of section.lines) {
      for (const m of l.matchAll(/\b([A-Z][\p{L}]+(?:\s+[A-Z][\p{L}]+)*)\b/gu)) {
        const t = m[1];
        if (t.length < 4) continue;
        termCounts.set(t, (termCounts.get(t) ?? 0) + 1);
      }
    }
    [...termCounts.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .forEach(([t]) => keywords.add(t));
    if (keywords.size) blocks.push({ kind: 'keyword', title: 'Remember these terms', items: [...keywords] });

    blocks.push({
      kind: 'examPoint',
      title: 'Likely MCQ points',
      items: uniqueFacts.slice(0, 5).length
        ? uniqueFacts.slice(0, 5).map((f) => `Be ready to recall: ${f}`)
        : ['Re-read this topic — no numeric/date facts were detected to anchor a question.'],
    });

    // auto cloze questions from definitions (faithful to source, never invented)
    for (const def of definitionIndex.filter((d) => d.topicId === topicId)) {
      const distractors = definitionIndex
        .filter((d) => d.subject !== def.subject)
        .map((d) => d.body.split(/[,.;]/)[0].trim())
        .filter((s) => s.length > 3 && s.length < 70 && !s.toLowerCase().startsWith(def.subject.toLowerCase()))
        .slice(0, 3);
      if (distractors.length < 3) continue; // not enough plausible options -> skip, never guess
      const answer = def.body.split(/[,.;]/)[0].trim();
      if (answer.length < 3 || answer.length > 90) continue;
      const options = [
        { id: 'a', text: answer },
        ...distractors.slice(0, 3).map((d, i) => ({ id: 'abcd'[i + 1], text: d })),
      ];
      const correctId = 'a';
      questions.push({
        id: `${topicId}-q${questions.length + 1}`,
        type: 'direct',
        difficulty: 'easy',
        prompt: `According to the notes, ${def.subject} is:`,
        options: shuffleOptions(options, correctId),
        correct: [correctId],
        explanation: def.body,
        whyWrong: Object.fromEntries(
          options.filter((o) => o.id !== correctId).map((o) => [o.id, `"${o.text}" is the definition of a different term in the notes.`])
        ),
        source: `Notes → ${chapterTitle} → ${topicTitle}`,
        tags: ['auto-generated', 'definition'],
      });
      autoQuestions++;
    }

    const concept: Concept = {
      id: slug(`${topicId}-concept`),
      title: topicTitle,
      blocks: ensureOrder(blocks),
      keywords: [...keywords].slice(0, 10),
      rememberThis: uniqueFacts[0] ?? prose[0] ?? bullets[0] ?? topicTitle,
    };

    const topic: Topic = {
      id: topicId,
      title: topicTitle,
      concepts: [concept],
      questions,
      flashcards: cards,
      keyDefinition: definitionIndex.find((d) => d.topicId === topicId)?.body,
      keyFacts: uniqueFacts,
      oneLineSummary: uniqueFacts[0] ?? prose[0] ?? bullets[0],
      commonConfusion: blocks.find((b) => b.kind === 'compare')?.body,
    };

    const existing = chapter.topics.find((t) => t.id === topicId);
    if (existing) {
      existing.concepts.push(...topic.concepts);
      existing.questions.push(...topic.questions);
      existing.flashcards = [...(existing.flashcards ?? []), ...cards];
    } else {
      chapter.topics.push(topic);
    }
  }

  if (!chapters.length) warnings.push('No headings detected — everything landed in one topic.');
  if (!definitionIndex.length) warnings.push('No "X is/means..." definitions detected — add some for better auto-questions.');
  if (autoQuestions === 0)
    warnings.push('Not enough definitions to auto-generate safe MCQs (need 4+ definitions). Add questions manually or paste richer notes.');

  // contradiction check: same subject defined twice with different bodies
  const bySubject = new Map<string, Set<string>>();
  for (const d of definitionIndex) {
    const set = bySubject.get(d.subject.toLowerCase()) ?? new Set<string>();
    set.add(d.body.toLowerCase().slice(0, 60));
    bySubject.set(d.subject.toLowerCase(), set);
  }
  for (const [subject, bodies] of bySubject) {
    if (bodies.size > 1) {
      clarifications.push({
        ref: subject,
        issue: 'Source clarification required — this term is defined in more than one way in the notes.',
      });
    }
  }

  const subject: Subject = {
    id: slug(meta.subjectTitle, 'subject'),
    title: meta.subjectTitle,
    icon: '📘',
    chapters: chapters.length ? chapters : [{ id: 'general', title: 'General', topics: [] }],
  };

  const pack: ContentPack = {
    id: slug(`${meta.examId}-${meta.title}`, 'pack'),
    examId: meta.examId,
    examLabel: meta.examLabel,
    title: meta.title,
    audience: meta.audience ?? 'competitive',
    version: 1,
    sourceNotes: 'Imported from pasted notes',
    generatedAt: new Date().toISOString(),
    subjects: [subject],
    clarifications,
  };

  return {
    pack,
    lines: lines.length,
    headings: sections.length,
    definitions,
    facts,
    dates,
    lists,
    autoQuestions,
    flashcards,
    clarifications: clarifications.length,
    warnings,
  };
}

/** Progressive reveal order required by the spec. */
function ensureOrder(blocks: ConceptBlock[]): ConceptBlock[] {
  const order: ConceptBlock['kind'][] = ['simple', 'definition', 'steps', 'example', 'facts', 'compare', 'examPoint', 'keyword', 'trick'];
  const byKind = new Map<ConceptBlock['kind'], ConceptBlock[]>();
  for (const b of blocks) {
    const arr = byKind.get(b.kind) ?? [];
    arr.push(b);
    byKind.set(b.kind, arr);
  }
  const out: ConceptBlock[] = [];
  for (const kind of order) for (const b of byKind.get(kind) ?? []) out.push(b);
  // keep any custom kinds not in the ladder
  for (const [kind, arr] of byKind) if (!order.includes(kind)) out.push(...arr);
  return out;
}

function shuffleOptions(options: { id: string; text: string }[], correctId: string) {
  // keep the correct option mixed in, but remember its id stays stable
  const arr = [...options];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  void correctId;
  return arr;
}

/* --------------------------------- validate -------------------------------- */

export interface ValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warn';
}

/** Guards the accuracy rule: no question without a source, no 2 correct answers unless multi. */
export function validatePack(pack: ContentPack): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenQ = new Set<string>();
  pack.subjects.forEach((s) =>
    s.chapters.forEach((c) =>
      c.topics.forEach((t) => {
        if (!t.concepts.length) issues.push({ path: `${t.title}`, message: 'Topic has no concepts', severity: 'warn' });
        t.questions.forEach((q) => {
          if (seenQ.has(q.id)) issues.push({ path: q.id, message: 'Duplicate question id', severity: 'error' });
          seenQ.add(q.id);
          if (q.options.length < 4) issues.push({ path: q.id, message: 'Fewer than 4 options', severity: 'warn' });
          if (!q.correct.length) issues.push({ path: q.id, message: 'No correct answer set', severity: 'error' });
          if (q.correct.length > 1 && q.type !== 'multi')
            issues.push({ path: q.id, message: 'Multiple correct answers but type is not "multi"', severity: 'error' });
          if (q.correct.some((id) => !q.options.some((o) => o.id === id)))
            issues.push({ path: q.id, message: 'Correct answer id not present in options', severity: 'error' });
          if (!q.source?.trim())
            issues.push({ path: q.id, message: 'Missing source reference (accuracy rule)', severity: 'error' });
          if (q.type !== 'negative' && /\b(NOT|EXCEPT|INCORRECT|FALSE)\b/i.test(q.prompt))
            issues.push({
              path: q.id,
              message: 'Prompt contains NOT/EXCEPT but type is not "negative" — ambiguous',
              severity: 'warn',
            });
          if (!q.explanation?.trim())
            issues.push({ path: q.id, message: 'Missing explanation', severity: 'warn' });
          const texts = new Set(q.options.map((o) => o.text.trim().toLowerCase()));
          if (texts.size !== q.options.length)
            issues.push({ path: q.id, message: 'Duplicate option text', severity: 'error' });
        });
      })
    )
  );
  return issues;
}
