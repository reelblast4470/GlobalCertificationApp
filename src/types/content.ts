/**
 * CONTENT LAYER (source of truth = the student's notes)
 * -----------------------------------------------------
 * Everything the app teaches, asks and revises lives in a `ContentPack`.
 * The UI never hard-codes a question, a fact or an explanation — it only
 * renders whatever pack(s) are installed. Dropping in new notes = dropping
 * in a new JSON pack. No rebuild of the UI required.
 *
 * Authoring contract (see docs/CONTENT-SCHEMA.md after build):
 *   - never invent facts: every question carries `source`
 *   - unclear source material -> `flag: 'source-clarification-required'`
 */

export type ID = string;

export type Difficulty = 'easy' | 'medium' | 'hard';

export type QuestionType =
  | 'direct' // Type 1 — one fact
  | 'conceptual' // Type 2 — do you understand it
  | 'application' // Type 3 — situation, apply the rule
  | 'statement' // Type 4 — Statement I / Statement II
  | 'assertion-reason' // Type 5 — Assertion & Reason
  | 'match' // Type 6 — Match the following
  | 'multi' // Type 7 — more than one correct
  | 'negative'; // Type 8 — NOT / EXCEPT / INCORRECT

export type Audience = 'child' | 'school' | 'college' | 'competitive';

/* ---------------------------------- Blocks --------------------------------- */

export type BlockKind =
  | 'simple' // plain-language explanation
  | 'definition' // the important definition
  | 'steps' // step-by-step
  | 'facts' // important facts
  | 'example' // practical / real-world
  | 'compare' // confusing concepts side by side
  | 'examPoint' // likely to be asked
  | 'keyword' // must-remember keywords
  | 'trick'; // mnemonic / memory hook

export interface ConceptBlock {
  kind: BlockKind;
  title?: string;
  body?: string; // supports **bold** and `code`
  items?: string[]; // steps, facts, keywords
  pairs?: { left: string; right: string }[]; // compare & contrast rows
}

export interface Mnemonic {
  for: string; // what it helps you remember
  text: string; // the sentence / acronym / story
  note?: string; // why it works — never changes the fact
}

export interface Concept {
  id: ID;
  title: string;
  /** progressive reveal order: simple -> example -> facts -> examPoint -> trick */
  blocks: ConceptBlock[];
  keywords?: string[];
  rememberThis: string; // the short "Remember This" summary
  mnemonic?: Mnemonic;
  minutes?: number;
  flag?: 'source-clarification-required';
}

/* --------------------------------- Questions -------------------------------- */

export interface Option {
  id: string; // 'a' | 'b' | 'c' | 'd' ...
  text: string;
}

export interface Question {
  id: ID;
  type: QuestionType;
  difficulty: Difficulty;
  prompt: string;
  /** Type 4/5/6: the statements, assertion+reason, or list A / list B headers */
  statements?: string[];
  options: Option[];
  /** one id normally, several for Type 7 */
  correct: string[];
  explanation: string;
  /** optionId -> why that distractor is wrong (plausible, mistake-based) */
  whyWrong?: Record<string, string>;
  /** reference back into the student's notes — REQUIRED by the accuracy rule */
  source: string;
  tags?: string[];
  hint?: string;
  hintMnemonic?: string;
  timeTargetSec?: number;
  flag?: 'source-clarification-required';
}

/* -------------------------------- Flashcards -------------------------------- */

export interface Flashcard {
  id: ID;
  front: string;
  back: string;
  trick?: string;
  tags?: string[];
}

/* ------------------------------ Topic & above ------------------------------- */

export interface Topic {
  id: ID;
  title: string;
  minutes?: number;
  concepts: Concept[];
  questions: Question[];
  flashcards?: Flashcard[];
  /** Quick Revision essentials */
  keyDefinition?: string;
  keyFacts?: string[]; // 3–10
  formulas?: string[]; // rules / formulas
  commonConfusion?: string;
  oneLineSummary?: string;
}

export interface Chapter {
  id: ID;
  title: string;
  icon?: string;
  topics: Topic[];
}

export interface Subject {
  id: ID;
  title: string;
  icon?: string;
  chapters: Chapter[];
}

export interface ContentPack {
  id: ID;
  examId: ID; // 'ssc' | 'banking' | 'railway' | 'custom' ...
  examLabel: string;
  title: string;
  audience: Audience;
  version: number;
  sourceNotes?: string; // provenance: where the notes came from
  generatedAt?: string;
  subjects: Subject[];
  /** anything the notes left unclear or contradictory — surfaced, never guessed */
  clarifications?: { ref: string; issue: string }[];
}

/* --------------------------- Derived / indexed views -------------------------- */

export interface QuestionRef {
  packId: ID;
  subjectId: ID;
  subjectTitle: string;
  chapterId: ID;
  chapterTitle: string;
  topicId: ID;
  topicTitle: string;
  question: Question;
}

export interface TopicRef {
  packId: ID;
  subjectId: ID;
  subjectTitle: string;
  chapterId: ID;
  chapterTitle: string;
  topicId: ID;
  topic: Topic;
}

export interface PackIndex {
  questions: Map<ID, QuestionRef>;
  topics: Map<ID, TopicRef>;
  /** flat search corpus */
  docs: SearchDoc[];
  stats: {
    packs: number;
    subjects: number;
    chapters: number;
    topics: number;
    questions: number;
    flashcards: number;
  };
}

export interface SearchDoc {
  id: ID;
  type: 'topic' | 'concept' | 'question' | 'flashcard' | 'keyword';
  title: string;
  text: string;
  topicId?: ID;
  chapterId?: ID;
  subjectId?: ID;
  packId: ID;
}
