import React from 'react';
import { useApp } from '../state/AppContext';
import { Screen } from '../components/Layout';
import { QuizRunner } from '../components/QuizRunner';
import { Segmented, Chip, EmptyState } from '../components/ui/primitives';
import { selectQuestions, type PracticeMode } from '../engine/selector';
import { countDue } from '../engine/planner';

const COUNTS = [10, 20, 30, 50];

export default function Practice({ navigate, initialTopicId }: { navigate: (to: string) => void; initialTopicId?: string }) {
  const app = useApp();
  const { index, user } = app;
  const [mode, setMode] = React.useState<PracticeMode>(initialTopicId ? 'practice' : 'practice');
  const [count, setCount] = React.useState(20);
  const [chapterId, setChapterId] = React.useState<string>('');
  const [running, setRunning] = React.useState(false);

  const chapters = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const ref of index.topics.values()) map.set(ref.chapterId, ref.chapterTitle);
    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [index]);

  const available = React.useMemo(
    () => selectQuestions(index, user, { mode, count: 999, chapterId: chapterId || undefined, topicIds: initialTopicId ? [initialTopicId] : undefined }).length,
    [index, user, mode, chapterId, initialTopicId]
  );

  const topicTitle = initialTopicId ? index.topics.get(initialTopicId)?.topic.title : undefined;

  if (running) {
    const refs = selectQuestions(index, user, {
      mode,
      count,
      chapterId: chapterId || undefined,
      topicIds: initialTopicId ? [initialTopicId] : undefined,
    });
    return (
      <QuizRunner
        title="Practice"
        subtitle={topicTitle ?? (chapterId ? chapters.find((c) => c.id === chapterId)?.title : 'All chapters')}
        mode={mode === 'practice' ? 'practice' : mode === 'mistake' ? 'mistake' : 'revision'}
        initialRefs={refs}
        onExit={() => setRunning(false)}
        onFinish={() => setRunning(false)}
        onReviewMistakes={() => navigate('/mistakes')}
      />
    );
  }

  const due = countDue(index, user, 'questions');
  const weakCount = Object.values(app.masteryByTopic).filter((m) => m <= 40).length;
  const mistakeCount = Object.values(user.mistakes).filter((m) => !m.resolved).length;

  const modeInfo: Record<PracticeMode, { emoji: string; hint: string; n: number }> = {
    practice: { emoji: '🎯', hint: 'Mixed set — overdue items, unseen questions and past mistakes', n: available },
    revision: { emoji: '🔄', hint: 'Spaced repetition only — items scheduled for today', n: due },
    weak: { emoji: '🩹', hint: 'Drawn from topics below 40% mastery', n: weakCount },
    mistake: { emoji: '❌', hint: 'Only questions from your error book', n: mistakeCount },
    quick: { emoji: '⚡', hint: 'Fast mixed warm-up', n: available },
  };

  return (
    <Screen title="Practice" subtitle={topicTitle ?? 'Adaptive question sets'} onBack={initialTopicId ? () => navigate('/learn') : undefined}>
      <Segmented
        value={mode}
        onChange={(v) => setMode(v as PracticeMode)}
        options={[
          { value: 'practice', label: '🎯 Mixed' },
          { value: 'revision', label: '🔄 Revision' },
          { value: 'weak', label: '🩹 Weak' },
          { value: 'mistake', label: '❌ Errors' },
        ]}
      />

      <div className="card mt-3 p-3">
        <div className="text-[15px] font-bold">
          {modeInfo[mode].emoji} {modeInfo[mode].hint}
        </div>
        <div className="mt-1 text-[12px]" style={{ color: 'var(--muted)' }}>
          {modeInfo[mode].n} questions available
        </div>
      </div>

      {!initialTopicId && (
        <div className="mt-3">
          <div className="mb-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Chapter
          </div>
          <select value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
            <option value="">All chapters</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-3">
        <div className="mb-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Questions
        </div>
        <div className="grid grid-cols-4 gap-2">
          {COUNTS.map((c) => (
            <button
              key={c}
              onClick={() => setCount(c)}
              className="btn btn-sm"
              style={{
                background: count === c ? 'var(--brand)' : 'var(--surface)',
                color: count === c ? '#fff' : 'var(--ink)',
                borderColor: count === c ? 'transparent' : 'var(--line)',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-primary mt-4" disabled={!available} onClick={() => setRunning(true)}>
        {available ? `Start ${Math.min(count, available)} questions` : 'Nothing to practise here'}
      </button>

      {!available && (
        <div className="mt-3">
          <EmptyState
            emoji="✅"
            title="Nothing due right now"
            hint={
              mode === 'revision'
                ? 'Your spaced-repetition queue is empty. Come back tomorrow, or run a mixed set.'
                : 'Try a different mode or a wider chapter scope.'
            }
            action={
              <button className="btn" onClick={() => setMode('practice')}>
                Switch to mixed practice
              </button>
            }
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Chip>🔥 Streak {user.streak.current}</Chip>
        <Chip>🔄 {due} due</Chip>
        <Chip>❌ {mistakeCount} open errors</Chip>
      </div>
      <div className="h-8" />
    </Screen>
  );
}
