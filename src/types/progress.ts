/**
 * PROGRESS LAYER — everything the app remembers about one student.
 * Persisted to localStorage (indexed by schema `version` for migration).
 */

import type { ID } from './content';

export type SrsRating = 'again' | 'hard' | 'good' | 'easy';

/** SM-2-lite scheduling state for one item (question or flashcard) */
export interface SrsState {
  due: string; // ISO date (yyyy-mm-dd)
  interval: number; // days
  ease: number; // 1.3 – 3.0
  reps: number; // successful repetitions
  lapses: number; // times forgotten
  lastResult?: 'correct' | 'wrong';
  lastSeen?: string; // ISO datetime
  history: { t: string; ok: boolean }[]; // newest last, capped
}

export interface TopicStat {
  topicId: ID;
  seen: number; // distinct questions attempted
  correct: number;
  wrong: number;
  /** exponentially-weighted accuracy 0..1 */
  accuracy: number;
  streakCorrect: number;
  lastActivity?: string;
  minutes: number;
}

export interface MistakeEntry {
  qid: ID;
  selected: string[];
  correct: string[];
  times: number; // how many times answered wrong
  lastWrong: string; // ISO datetime
  lastCorrect?: string; // set once redeemed
  conceptTested: string;
  reason?: string; // inferred reason for the mistake
  mode: 'practice' | 'exam' | 'quick' | 'revision' | 'flashcard' | 'mistake';
  resolved: boolean;
}

export interface AttemptLog {
  id: string;
  mode: 'practice' | 'exam' | 'quick' | 'revision' | 'mistake' | 'flashcard';
  ts: string;
  total: number;
  correct: number;
  wrong: number;
  unattempted: number;
  durationSec: number;
  negative: number; // 0, 0.25, 0.33, 0.5
  score: number;
  maxScore: number;
  byTopic: Record<ID, { correct: number; total: number }>;
}

export interface DailyStat {
  date: string; // yyyy-mm-dd
  questions: number;
  concepts: number;
  revision: number;
  mistakes: number;
  cards: number;
  xp: number;
  minutes: number;
}

export interface Achievement {
  id: string;
  unlockedAt: string;
}

export interface Goals {
  questions: number;
  concepts: number;
  revision: number;
  mistakes: number;
  cards: number;
}

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  dailyGoalQuestions: number;
  negativeMarking: number;
  examLength: number;
  examMinutes: number;
  optionShuffle: boolean;
  instantFeedback: boolean;
  showTimer: boolean;
}

export interface UserState {
  version: number;
  createdAt: string;
  activePackId?: ID;
  settings: Settings;
  goals: Goals;
  xp: number;
  level: number;
  streak: { current: number; best: number; lastDay?: string };
  questions: Record<ID, SrsState>;
  cards: Record<ID, SrsState>;
  topics: Record<ID, TopicStat>;
  mistakes: Record<ID, MistakeEntry>;
  attempts: AttemptLog[];
  daily: Record<string, DailyStat>;
  achievements: Achievement[];
  /** concepts the student has finished reading, packId:conceptId */
  conceptsRead: Record<string, string>;
  personalBest: { accuracy: number; examScore: number; streak: number };
}
