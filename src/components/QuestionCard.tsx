import React from 'react';
import type { QuestionRef } from '../types/content';
import { Chip, DIFF_TONE, NegativeText, RichText, difficultyChip } from './ui/primitives';
import { QUESTION_TYPE_LABEL } from '../engine/selector';

const LETTERS = 'ABCDEFGH';

export interface QuestionCardProps {
  ref: QuestionRef;
  selected: string[];
  onSelect?: (ids: string[]) => void;
  locked?: boolean;
  showCorrect?: boolean;
  order?: string[]; // shuffled option ids
  showMeta?: boolean;
  questionNo?: number;
  total?: number;
}

export function QuestionCard({
  ref,
  selected,
  onSelect,
  locked = false,
  showCorrect = false,
  order,
  showMeta = true,
  questionNo,
  total,
}: QuestionCardProps) {
  const q = ref.question;
  const isMulti = q.correct.length > 1 || q.type === 'multi';
  const options = order ? order.map((id) => q.options.find((o) => o.id === id)!).filter(Boolean) : q.options;

  const toggle = (id: string) => {
    if (locked || !onSelect) return;
    if (isMulti) {
      onSelect(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
    } else {
      onSelect([id]);
    }
  };

  const stateOf = (id: string): 'idle' | 'selected' | 'correct' | 'wrong' => {
    const picked = selected.includes(id);
    if (!showCorrect) return picked ? 'selected' : 'idle';
    if (q.correct.includes(id)) return 'correct';
    if (picked) return 'wrong';
    return 'idle';
  };

  return (
    <div className="flex flex-col gap-3">
      {showMeta && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone="brand">{QUESTION_TYPE_LABEL[q.type] ?? q.type}</Chip>
          <Chip tone={DIFF_TONE[q.difficulty]}>{difficultyChip(q.difficulty)}</Chip>
          {ref.topicTitle && <Chip>📚 {ref.topicTitle}</Chip>}
          {questionNo != null && total != null && (
            <Chip>
              Q{questionNo}/{total}
            </Chip>
          )}
          {isMulti && <Chip tone="warn">Multiple correct — select all</Chip>}
        </div>
      )}

      <div className="card p-4">
        <p className="text-[16px] font-semibold leading-snug">
          <NegativeText text={q.prompt} />
        </p>

        {q.statements && q.statements.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {q.statements.map((s, i) => (
              <div
                key={i}
                className="rounded-xl p-3 text-[14px]"
                style={{ background: 'var(--surface2)' }}
              >
                <RichText text={s} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {options.map((o, i) => {
          const st = stateOf(o.id);
          const bg =
            st === 'correct'
              ? 'var(--good-soft)'
              : st === 'wrong'
                ? 'var(--bad-soft)'
                : st === 'selected'
                  ? 'var(--brand-soft)'
                  : 'var(--surface)';
          const border =
            st === 'correct'
              ? '1.5px solid var(--good)'
              : st === 'wrong'
                ? '1.5px solid var(--bad)'
                : st === 'selected'
                  ? '1.5px solid var(--brand)'
                  : '1px solid var(--line)';
          return (
            <button
              key={o.id}
              onClick={() => toggle(o.id)}
              disabled={locked && !showCorrect}
              className="flex w-full items-start gap-3 rounded-2xl p-3 text-left"
              style={{ background: bg, border, minHeight: 52 }}
            >
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold"
                style={{
                  background:
                    st === 'correct'
                      ? 'var(--good)'
                      : st === 'wrong'
                        ? 'var(--bad)'
                        : st === 'selected'
                          ? 'var(--brand)'
                          : 'var(--surface2)',
                  color: st === 'idle' ? 'var(--muted)' : '#fff',
                }}
              >
                {LETTERS[i]}
              </span>
              <span className="flex-1 text-[15px] leading-snug">
                <RichText text={o.text} />
                {showCorrect && (
                  <span className="mt-1 block text-[12px] font-semibold" style={{ color: 'var(--muted)' }}>
                    {q.correct.includes(o.id)
                      ? '✅ Correct answer'
                      : q.whyWrong?.[o.id]
                        ? `❌ ${q.whyWrong[o.id]}`
                        : selected.includes(o.id)
                          ? '❌ Your choice'
                          : ''}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {q.hintMnemonic && !showCorrect && (
        <div className="rounded-xl p-3 text-[13px]" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
          💡 Memory hook: <RichText text={q.hintMnemonic} />
        </div>
      )}
    </div>
  );
}

export function ExplanationPanel({
  ref,
  correct,
  reason,
  selectedText,
}: {
  ref: QuestionRef;
  correct: boolean;
  reason?: string;
  selectedText?: string;
}) {
  const q = ref.question;
  return (
    <div
      className="card p-4"
      style={{ borderColor: correct ? 'var(--good)' : 'var(--bad)', borderWidth: 1.5 }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">{correct ? '✅' : '❌'}</span>
        <span className="font-extrabold" style={{ color: correct ? 'var(--good)' : 'var(--bad)' }}>
          {correct ? 'Correct!' : 'Not quite'}
        </span>
      </div>

      {!correct && (
        <>
          {selectedText && (
            <p className="mb-2 text-[13px]" style={{ color: 'var(--muted)' }}>
              You chose: <strong style={{ color: 'var(--bad)' }}>{selectedText}</strong>
            </p>
          )}
          {reason && (
            <div className="mb-2 rounded-xl p-2.5 text-[13px]" style={{ background: 'var(--bad-soft)' }}>
              <strong>Likely reason:</strong> {reason}
            </div>
          )}
        </>
      )}

      <div className="text-[14px] leading-relaxed">
        <RichText text={q.explanation} />
      </div>

      {q.whyWrong && Object.keys(q.whyWrong).length > 0 && (
        <details className="mt-3">
          <summary className="text-[13px] font-bold" style={{ color: 'var(--brand)' }}>
            Why the other options are wrong
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {q.options
              .filter((o) => !q.correct.includes(o.id))
              .map((o) => (
                <li key={o.id} className="text-[13px]" style={{ color: 'var(--muted)' }}>
                  <strong style={{ color: 'var(--ink)' }}>{o.id.toUpperCase()}.</strong> {o.text} —{' '}
                  {q.whyWrong?.[o.id] ?? 'Not supported by the notes.'}
                </li>
              ))}
          </ul>
        </details>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip>📄 Source: {q.source}</Chip>
        {(q.tags ?? []).slice(0, 3).map((t) => (
          <Chip key={t}>#{t}</Chip>
        ))}
      </div>

      {q.hintMnemonic && (
        <div className="mt-2 rounded-xl p-2.5 text-[13px]" style={{ background: 'var(--surface2)' }}>
          🧠 <strong>Memory trick:</strong> <RichText text={q.hintMnemonic} />
        </div>
      )}
    </div>
  );
}

/** "Explain Again" — the offline AI-substitute: four fixed lenses over the same content. */
export function ExplainAgain({ ref }: { ref: QuestionRef }) {
  const [mode, setMode] = React.useState<null | 'simple' | 'example' | 'trick' | 'compare' | 'kid'>(null);
  const q = ref.question;
  const concept = q.explanation;

  const body = (() => {
    switch (mode) {
      case 'simple':
        return `Strip it back: ${q.explanation.split('.')[0]}. Everything else is detail — this one sentence is the fact being tested.`;
      case 'example':
        return `Picture it this way: you are the examiner. You want to check one thing — "${q.prompt.replace(/\?$/, '')}". The only answer that survives checking is "${q.options.find((o) => o.id === q.correct[0])?.text ?? ''}".`;
      case 'trick':
        return q.hintMnemonic
          ? `Memory hook: ${q.hintMnemonic}`
          : `Make your own: take the first letter of each keyword in the correct answer "${q.options.find((o) => o.id === q.correct[0])?.text ?? ''}" and turn it into a word you already know.`;
      case 'compare':
        return q.options
          .map((o) => `${o.id.toUpperCase()}: ${o.text} — ${q.correct.includes(o.id) ? 'RIGHT' : (q.whyWrong?.[o.id] ?? 'wrong')}`)
          .join('\n\n');
      case 'kid':
        return `Imagine you are explaining this to a 10-year-old:\n"${concept.split('.')[0]}." That's it. If you can say that much in your own words, you know it.`;
      default:
        return '';
    }
  })();

  const buttons: { key: typeof mode; label: string }[] = [
    { key: 'simple', label: 'Explain Simply' },
    { key: 'example', label: 'Give Example' },
    { key: 'trick', label: 'Memory Trick' },
    { key: 'compare', label: 'Compare Options' },
    { key: 'kid', label: "Explain Like I'm 10" },
  ];

  return (
    <div className="card p-3">
      <div className="mb-2 text-[13px] font-bold" style={{ color: 'var(--brand)' }}>
        🤖 Explain again
      </div>
      <div className="scroll-x">
        {buttons.map((b) => (
          <button
            key={b.key!}
            onClick={() => setMode(mode === b.key ? null : b.key)}
            className="chip"
            style={{
              background: mode === b.key ? 'var(--brand-soft)' : 'var(--surface2)',
              color: mode === b.key ? 'var(--brand)' : 'var(--muted)',
              border: mode === b.key ? '1px solid var(--brand)' : '1px solid transparent',
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
      {mode && (
        <div
          className="pop mt-3 whitespace-pre-line rounded-xl p-3 text-[14px] leading-relaxed"
          style={{ background: 'var(--surface2)' }}
        >
          {body}
        </div>
      )}
      <div className="mt-2 text-[11px]" style={{ color: 'var(--muted)' }}>
        Grounded in your notes — no facts are invented.
      </div>
    </div>
  );
}
