import React from 'react';
import type { QuestionRef } from '../types/content';
import { useApp, type AnswerMode } from '../state/AppContext';
import { QuestionCard, ExplainAgain, ExplanationPanel } from './QuestionCard';
import { Chip, ProgressBar, EmptyState } from './ui/primitives';
import { shuffle } from '../engine/engineAliases';

export interface QuizResult {
  total: number;
  correct: number;
  xp: number;
  durationSec: number;
}

export function QuizRunner({
  initialRefs,
  mode,
  title,
  subtitle,
  instantFeedback = true,
  onExit,
  onFinish,
  onReviewMistakes,
}: {
  initialRefs: QuestionRef[];
  mode: AnswerMode;
  title: string;
  subtitle?: string;
  instantFeedback?: boolean;
  onExit: () => void;
  onFinish?: (r: QuizResult) => void;
  onReviewMistakes?: () => void;
}) {
  const app = useApp();
  const [refs, setRefs] = React.useState<QuestionRef[]>(initialRefs);
  const [idx, setIdx] = React.useState(0);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [submitted, setSubmitted] = React.useState(false);
  const [outcome, setOutcome] = React.useState<{ correct: boolean; reason?: string; xp: number } | null>(null);
  const [correctCount, setCorrectCount] = React.useState(0);
  const [xpTotal, setXpTotal] = React.useState(0);
  const [startedAt] = React.useState(Date.now());
  const [orders] = React.useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      initialRefs.map((r) => [r.question.id, shuffle(r.question.options.map((o) => o.id))])
    )
  );
  const [similarNote, setSimilarNote] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [confirmExit, setConfirmExit] = React.useState(false);

  if (!refs.length)
    return (
      <div className="px-4 pt-3">
        <EmptyState
          emoji="🤷"
          title="No questions available"
          hint="This filter has no questions yet. Try a wider scope or import more notes."
          action={
            <button className="btn btn-primary" onClick={onExit}>
              Back
            </button>
          }
        />
      </div>
    );

  if (done) {
    const pct = Math.round((correctCount / refs.length) * 100);
    return (
      <div className="px-4 pt-3">
        <div className="card p-5 text-center">
          <div className="text-5xl">{pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📚'}</div>
          <h1 className="mt-2 text-xl font-extrabold">Session complete</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {refs.length} questions · {correctCount} correct
          </p>
          <div className="my-4 grid grid-cols-3 gap-2">
            <div className="card p-3">
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                Score
              </div>
              <div className="text-xl font-extrabold">{pct}%</div>
            </div>
            <div className="card p-3">
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                Correct
              </div>
              <div className="text-xl font-extrabold" style={{ color: 'var(--good)' }}>
                {correctCount}
              </div>
            </div>
            <div className="card p-3">
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                XP
              </div>
              <div className="text-xl font-extrabold" style={{ color: 'var(--brand)' }}>
                +{xpTotal}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              className="btn btn-primary"
              onClick={() => {
                setIdx(0);
                setSelected([]);
                setSubmitted(false);
                setOutcome(null);
                setCorrectCount(0);
                setXpTotal(0);
                setDone(false);
                setSimilarNote(null);
              }}
            >
              🔁 Run it again
            </button>
            {correctCount < refs.length && onReviewMistakes && (
              <button className="btn" onClick={onReviewMistakes}>
                ❌ Review my mistakes
              </button>
            )}
            <button className="btn btn-ghost" onClick={onExit}>
              Back to {title}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ref = refs[Math.min(idx, refs.length - 1)];
  const msTaken = Date.now() - startedAt;

  const submit = () => {
    if (!selected.length || submitted) return;
    const res = app.answerQuestion(ref, selected, msTaken, mode);
    setOutcome(res);
    setSubmitted(true);
    if (res.correct) setCorrectCount((c) => c + 1);
    setXpTotal((x) => x + res.xp);

    // Error-based revision: pull in a similar question from the same topic
    if (!res.correct) {
      const used = new Set(refs.map((r) => r.question.id));
      const similar = [...app.index.questions.values()].find(
        (r) => r.topicId === ref.topicId && !used.has(r.question.id) && r.question.flag !== 'source-clarification-required'
      );
      if (similar) {
        setRefs((prev) => [...prev, similar]);
        orders[similar.question.id] = shuffle(similar.question.options.map((o) => o.id));
        setSimilarNote('A similar question was added to the end of this set.');
      }
    }
  };

  const next = () => {
    setSimilarNote(null);
    if (idx + 1 >= refs.length) {
      const r: QuizResult = {
        total: refs.length,
        correct: correctCount,
        xp: xpTotal,
        durationSec: Math.round((Date.now() - startedAt) / 1000),
      };
      setDone(true);
      onFinish?.(r);
      return;
    }
    setIdx(idx + 1);
    setSelected([]);
    setSubmitted(false);
    setOutcome(null);
  };

  const selectedText = selected
    .map((id) => ref.question.options.find((o) => o.id === id)?.text ?? '')
    .filter(Boolean)
    .join(' + ');

  return (
    <div className="px-4 pt-2">
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <button className="btn btn-sm btn-ghost" style={{ paddingLeft: 0 }} onClick={() => setConfirmExit(true)}>
            ✕ Exit
          </button>
          <div className="text-xs font-bold" style={{ color: 'var(--muted)' }}>
            {idx + 1} / {refs.length}
          </div>
        </div>
        <ProgressBar value={((idx + (submitted ? 1 : 0)) / refs.length) * 100} height={6} />
        {subtitle && (
          <div className="mt-1 truncate text-[11px]" style={{ color: 'var(--muted)' }}>
            {subtitle}
          </div>
        )}
      </div>

      <QuestionCard
        ref={ref}
        selected={selected}
        onSelect={setSelected}
        locked={submitted}
        showCorrect={submitted}
        order={orders[ref.question.id]}
        questionNo={idx + 1}
        total={refs.length}
      />

      <div className="h-3" />

      {!submitted && (
        <button className="btn btn-primary" disabled={!selected.length} onClick={submit}>
          {selected.length ? 'Check answer' : 'Select an option'}
        </button>
      )}

      {submitted && instantFeedback && (
        <div className="flex flex-col gap-3">
          <ExplanationPanel
            ref={ref}
            correct={!!outcome?.correct}
            reason={outcome?.reason}
            selectedText={selectedText}
          />
          {!outcome?.correct && <ExplainAgain ref={ref} />}
          {similarNote && (
            <div className="rounded-xl p-2.5 text-[13px]" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
              🔁 {similarNote}
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn" onClick={next}>
              {idx + 1 >= refs.length ? 'Finish session' : 'Next question →'}
            </button>
          </div>
        </div>
      )}

      {submitted && !instantFeedback && (
        <button className="btn btn-primary" onClick={next}>
          {idx + 1 >= refs.length ? 'Finish' : 'Next →'}
        </button>
      )}

      {confirmExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.55)' }} onClick={() => setConfirmExit(false)} />
          <div className="pop card relative w-full max-w-[340px] p-4">
            <h3 className="text-base font-bold">Leave this session?</h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              Your progress so far is already saved, including any mistakes.
            </p>
            <div className="mt-4 flex gap-2">
              <button className="btn" onClick={() => setConfirmExit(false)}>
                Keep going
              </button>
              <button className="btn btn-danger" onClick={onExit}>
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-6" />
      <div className="flex justify-center">
        <Chip>📚 {ref.chapterTitle}</Chip>
      </div>
      <div className="h-6" />
    </div>
  );
}
