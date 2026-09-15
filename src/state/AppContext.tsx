/**
 * APP STATE
 * ---------
 * Single source of truth for user progress. Every mutation funnels through
 * here so XP, streaks, SRS, mastery, the error book and the daily plan can
 * never drift out of sync with each other.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ContentPack, ID, QuestionRef } from '../types/content';
import type { AttemptLog, Settings, SrsRating, UserState } from '../types/progress';
import { buildIndex } from '../engine/indexBuilder';
import { applyReview, ratingForAnswer, todayISO } from '../engine/srs';
import { ewmaAccuracy, topicMastery } from '../engine/mastery';
import { recordMistake, redeemMistake } from '../engine/mistakes';
import { evaluateAchievements, XP_BY_DIFFICULTY, XP_CONCEPT, XP_FLASHCARD, bumpStreak } from '../engine/gamification';
import { loadUser, saveUser, todayStat, defaultUser, importProgress } from '../engine/storage';
import { installPack, loadPacks, removePack } from '../data/registry';

const clone = <T,>(v: T): T =>
  typeof structuredClone === 'function' ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);

export type AnswerMode = 'practice' | 'exam' | 'quick' | 'revision' | 'mistake';

export interface AnswerOutcome {
  correct: boolean;
  xp: number;
  reason?: string;
  unlocked: { id: string; title: string; emoji: string }[];
}

interface AppValue {
  ready: boolean;
  packs: ContentPack[];
  index: ReturnType<typeof buildIndex>;
  user: UserState;
  masteryByTopic: Record<ID, number>;
  answerQuestion: (ref: QuestionRef, selected: string[], msTaken: number, mode: AnswerMode) => AnswerOutcome;
  rateCard: (cardId: string, rating: SrsRating) => void;
  markConceptRead: (conceptId: string) => void;
  logAttempt: (attempt: AttemptLog) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  bumpDaily: (key: 'questions' | 'concepts' | 'revision' | 'mistakes' | 'cards', by?: number) => void;
  addPack: (pack: ContentPack) => Promise<void>;
  deletePack: (id: string) => Promise<void>;
  setActivePack: (id: string) => void;
  resetAll: () => void;
  importProgressJSON: (json: string) => boolean;
  refresh: () => Promise<void>;
}

const AppCtx = createContext<AppValue | null>(null);

export const useApp = (): AppValue => {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [user, setUser] = useState<UserState>(() => loadUser());
  const [achievementQueue, setAchievementQueue] = useState<{ id: string; title: string; emoji: string }[]>([]);
  const indexRef = useRef(buildIndex([]));

  const refresh = useCallback(async () => {
    const loaded = await loadPacks();
    setPacks(loaded);
    indexRef.current = buildIndex(loaded);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // persist (debounced inside saveUser)
  useEffect(() => {
    if (ready) saveUser(user);
  }, [user, ready]);

  const index = indexRef.current;

  const masteryByTopic = useMemo(() => {
    const out: Record<ID, number> = {};
    for (const ref of index.topics.values()) {
      const srs = ref.topic.questions.map((q) => user.questions[q.id]).filter(Boolean);
      out[ref.topicId] = topicMastery({
        totalQuestions: ref.topic.questions.length,
        seenQuestions: srs.filter((s) => s.history.length > 0).length,
        srsStates: srs,
        stat: user.topics[ref.topicId],
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, user.questions, user.topics]);

  const tally = useCallback((u: UserState) => {
    let attempted = 0;
    let correct = 0;
    for (const s of Object.values(u.topics)) {
      attempted += s.correct + s.wrong;
      correct += s.correct;
    }
    return { attempted, accuracy: attempted ? correct / attempted : 0 };
  }, []);

  const countMastered = useCallback(
    (u: UserState) => {
      let n = 0;
      for (const ref of index.topics.values()) {
        const srs = ref.topic.questions.map((q) => u.questions[q.id]).filter(Boolean);
        const m = topicMastery({
          totalQuestions: ref.topic.questions.length,
          seenQuestions: srs.filter((s) => s.history.length > 0).length,
          srsStates: srs,
          stat: u.topics[ref.topicId],
        });
        if (m >= 96) n++;
      }
      return n;
    },
    [index]
  );

  const answerQuestion = useCallback(
    (ref: QuestionRef, selected: string[], msTaken: number, mode: AnswerMode): AnswerOutcome => {
      const q = ref.question;
      const correctSet = new Set(q.correct);
      const correct =
        selected.length > 0 &&
        selected.length === correctSet.size &&
        selected.every((s) => correctSet.has(s));

      const xpGain = correct ? XP_BY_DIFFICULTY[q.difficulty] : 2;
      let reason: string | undefined;
      let unlocked: { id: string; title: string; emoji: string }[] = [];

      setUser((prev) => {
        const u = clone(prev);
        const today = todayISO();

        // 1. SRS
        const rating = ratingForAnswer(correct, msTaken);
        u.questions[q.id] = applyReview(u.questions[q.id], rating);

        // 2. topic stats (exponentially weighted accuracy)
        const stat = u.topics[ref.topicId] ?? {
          topicId: ref.topicId,
          seen: 0,
          correct: 0,
          wrong: 0,
          accuracy: 0.5,
          streakCorrect: 0,
          minutes: 0,
        };
        const prevHistory = u.questions[q.id].history;
        const wasNew = prevHistory.length <= 1;
        if (wasNew) stat.seen += 1;
        if (correct) {
          stat.correct += 1;
          stat.streakCorrect += 1;
        } else {
          stat.wrong += 1;
          stat.streakCorrect = 0;
        }
        stat.accuracy = ewmaAccuracy([{ ok: correct }], stat.accuracy || 0.5);
        stat.minutes = +(stat.minutes + msTaken / 60000).toFixed(2);
        stat.lastActivity = new Date().toISOString();
        u.topics[ref.topicId] = stat;

        // 3. error book
        if (correct) redeemMistake(u, q.id);
        else {
          const entry = recordMistake(u, q, selected, ref.topicTitle, mode);
          reason = entry.reason;
        }

        // 4. daily counters + XP + streak
        const d = todayStat(u);
        const key = mode === 'revision' ? 'revision' : mode === 'mistake' ? 'mistakes' : 'questions';
        d[key] += 1;
        d.minutes = +(d.minutes + msTaken / 60000).toFixed(2);

        const beforeStreak = u.streak.current;
        u.streak = bumpStreak(u, today);
        u.xp += xpGain + (u.streak.current > beforeStreak && u.streak.current % 7 === 0 ? 25 : 0);
        d.xp += xpGain;
        u.personalBest.accuracy = Math.max(u.personalBest.accuracy, Math.round(tally(u).accuracy * 100));

        // 5. achievements
        const t = tally(u);
        unlocked = evaluateAchievements(u, {
          totalAttempted: t.attempted,
          accuracy: t.accuracy,
          masteredTopics: countMastered(u),
          examBest: u.personalBest.examScore,
          mistakesResolved: Object.values(u.mistakes).filter((m) => m.resolved).length,
        }).map((a) => {
          const def = ACH_DEF[a.id];
          return { id: a.id, title: def?.title ?? a.id, emoji: def?.emoji ?? '🏅' };
        });
        if (unlocked.length) u.achievements.push(...unlocked.map((x) => ({ id: x.id, unlockedAt: new Date().toISOString() })));

        return u;
      });

      if (unlocked.length) setAchievementQueue((q) => [...q, ...unlocked]);
      return { correct, xp: xpGain, reason, unlocked };
    },
    [countMastered, tally]
  );

  const rateCard = useCallback((cardId: string, rating: SrsRating) => {
    setUser((prev) => {
      const u = clone(prev);
      u.cards[cardId] = applyReview(u.cards[cardId], rating);
      const d = todayStat(u);
      d.cards += 1;
      u.xp += XP_FLASHCARD;
      d.xp += XP_FLASHCARD;
      u.streak = bumpStreak(u, todayISO());
      return u;
    });
  }, []);

  const markConceptRead = useCallback(
    (conceptId: string) => {
      const packId = user.activePackId ?? packs[0]?.id ?? 'pack';
      const key = `${packId}:${conceptId}`;
      if (user.conceptsRead[key]) return;
      setUser((prev) => {
        const u = clone(prev);
        u.conceptsRead[key] = new Date().toISOString();
        u.xp += XP_CONCEPT;
        const d = todayStat(u);
        d.concepts += 1;
        d.xp += XP_CONCEPT;
        u.streak = bumpStreak(u, todayISO());
        return u;
      });
    },
    [packs, user.activePackId, user.conceptsRead]
  );

  const logAttempt = useCallback((attempt: AttemptLog) => {
    setUser((prev) => {
      const u = clone(prev);
      u.attempts = [...u.attempts, attempt].slice(-200);
      if (attempt.mode === 'exam') {
        const pct = attempt.maxScore ? Math.round((attempt.score / attempt.maxScore) * 100) : 0;
        u.personalBest.examScore = Math.max(u.personalBest.examScore, pct);
      }
      u.personalBest.streak = Math.max(u.personalBest.streak, u.streak.best ?? 0);
      return u;
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setUser((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const bumpDaily = useCallback((key: 'questions' | 'concepts' | 'revision' | 'mistakes' | 'cards', by = 1) => {
    setUser((prev) => {
      const u = clone(prev);
      const d = todayStat(u);
      d[key] += by;
      return u;
    });
  }, []);

  const addPack = useCallback(async (pack: ContentPack) => {
    await installPack(pack);
    await refresh();
    setUser((prev) => ({ ...prev, activePackId: pack.id }));
  }, [refresh]);

  const deletePack = useCallback(
    async (id: string) => {
      await removePack(id);
      await refresh();
    },
    [refresh]
  );

  const setActivePack = useCallback((id: string) => {
    setUser((prev) => ({ ...prev, activePackId: id }));
  }, []);

  const resetAll = useCallback(() => {
    setUser(defaultUser());
  }, []);

  const importProgressJSON = useCallback((json: string) => {
    const u = importProgress(json);
    if (!u) return false;
    setUser(u);
    return true;
  }, []);

  const value: AppValue = {
    ready,
    packs,
    index,
    user,
    masteryByTopic,
    answerQuestion,
    rateCard,
    markConceptRead,
    logAttempt,
    updateSettings,
    bumpDaily,
    addPack,
    deletePack,
    setActivePack,
    resetAll,
    importProgressJSON,
    refresh,
  };

  return (
    <AppCtx.Provider value={value}>
      {children}
      <AchievementToaster
        queue={achievementQueue}
        onClear={() => setAchievementQueue([])}
      />
    </AppCtx.Provider>
  );
}

/* ------------------------------ achievement toast ----------------------------- */

import { ACHIEVEMENTS } from '../engine/gamification';
const ACH_DEF = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

function AchievementToaster({
  queue,
  onClear,
}: {
  queue: { id: string; title: string; emoji: string }[];
  onClear: () => void;
}) {
  type Toast = { id: string; title: string; emoji: string } | null;
  const [visible, setVisible] = useState<Toast>(queue[0] ?? null);

  useEffect(() => {
    if (!visible && queue.length) setVisible(queue[0]);
  }, [queue, visible]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setVisible(null);
      onClear();
    }, 2600);
    return () => clearTimeout(t);
  }, [visible, onClear]);

  if (!visible) return null;
  return (
    <div className="fixed left-0 right-0 z-50 flex justify-center px-4" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
      <div className="pop card flex items-center gap-3 px-4 py-3 shadow-lg" style={{ borderColor: 'var(--brand)' }}>
        <span className="text-2xl">{visible.emoji}</span>
        <div>
          <div className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
            Achievement unlocked
          </div>
          <div className="text-sm font-bold">{visible.title}</div>
        </div>
      </div>
    </div>
  );
}
