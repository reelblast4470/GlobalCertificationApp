import React from 'react';
import { useApp } from '../state/AppContext';
import { Screen } from '../components/Layout';
import { QuizRunner } from '../components/QuizRunner';
import { Chip, EmptyState, SectionTitle } from '../components/ui/primitives';
import { RichText } from '../components/ui/primitives';
import { mistakeQueue, resolvedCount, isToday } from '../engine/mistakes';
import { selectQuestions } from '../engine/selector';

export default function Mistakes({ navigate }: { navigate: (to: string) => void }) {
  const app = useApp();
  const { user, index } = app;
  const [running, setRunning] = React.useState(false);
  const [open, setOpen] = React.useState<string | null>(null);

  const queue = React.useMemo(() => mistakeQueue(user), [user]);
  const resolved = React.useMemo(() => resolvedCount(user), [user]);

  const hotConcepts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of queue) counts.set(m.conceptTested, (counts.get(m.conceptTested) ?? 0) + m.times);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [queue]);

  if (running) {
    const refs = selectQuestions(index, user, { mode: 'mistake', count: 20 });
    return (
      <QuizRunner
        title="Mistakes"
        subtitle="Mistake revision — get it right three times to clear it"
        mode="mistake"
        initialRefs={refs}
        onExit={() => setRunning(false)}
        onFinish={() => setRunning(false)}
      />
    );
  }

  return (
    <Screen title="My Mistakes" subtitle="Every wrong answer, with the reason">
      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <div className="text-xl font-extrabold" style={{ color: 'var(--bad)' }}>
            {queue.length}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
            Open
          </div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-extrabold" style={{ color: 'var(--good)' }}>
            {resolved}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
            Cleared
          </div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-extrabold">
            {queue.length ? Math.max(...queue.map((m) => m.times)) : 0}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
            Worst repeat
          </div>
        </div>
      </div>

      {queue.length > 0 && (
        <button className="btn btn-primary mt-3" onClick={() => setRunning(true)}>
          🔁 Revise mistakes ({Math.min(20, queue.length)})
        </button>
      )}

      {hotConcepts.length > 0 && (
        <div className="mt-4">
          <SectionTitle>Frequently wrong concepts</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {hotConcepts.map(([c, n]) => (
              <Chip key={c} tone="bad">
                {c} · {n}×
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <SectionTitle>Error book</SectionTitle>
        {queue.length === 0 ? (
          <EmptyState
            emoji="🎉"
            title="Error book is clean"
            hint="Nothing unresolved. Answer a few questions and any mistakes will land here automatically."
            action={
              <button className="btn btn-primary" onClick={() => navigate('/practice')}>
                Practise now
              </button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {queue.map((m) => {
              const ref = index.questions.get(m.qid);
              if (!ref) return null;
              const q = ref.question;
              const expanded = open === m.qid;
              return (
                <div key={m.qid} className="card overflow-hidden">
                  <button className="w-full p-3 text-left" onClick={() => setOpen(expanded ? null : m.qid)}>
                    <div className="flex items-start gap-2">
                      <span className="chip" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>
                        {m.times}×
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold leading-snug">
                          <RichText text={q.prompt} />
                        </div>
                        <div className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
                          {ref.topicTitle} · last missed {isToday(m.lastWrong) ? 'today' : new Date(m.lastWrong).toLocaleDateString()}
                        </div>
                      </div>
                      <span style={{ color: 'var(--muted)' }}>{expanded ? '▴' : '▾'}</span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="flex flex-col gap-2 p-3" style={{ borderTop: '1px solid var(--line)' }}>
                      <div className="rounded-xl p-2.5 text-[13px]" style={{ background: 'var(--bad-soft)' }}>
                        <div>
                          <strong>You chose:</strong>{' '}
                          {m.selected.map((id) => q.options.find((o) => o.id === id)?.text).join(' + ') || '— no answer —'}
                        </div>
                        <div className="mt-1">
                          <strong>Correct:</strong>{' '}
                          {m.correct.map((id) => q.options.find((o) => o.id === id)?.text).join(' + ')}
                        </div>
                      </div>

                      {m.reason && (
                        <div className="rounded-xl p-2.5 text-[13px]" style={{ background: 'var(--surface2)' }}>
                          <strong>Likely reason:</strong> {m.reason}
                        </div>
                      )}

                      <div className="text-[13px] leading-relaxed">
                        <RichText text={q.explanation} />
                      </div>

                      {q.hintMnemonic && (
                        <div className="rounded-xl p-2.5 text-[13px]" style={{ background: 'var(--surface2)' }}>
                          🧠 {q.hintMnemonic}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        <Chip>🎯 {m.conceptTested}</Chip>
                        <Chip>📄 {q.source}</Chip>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="h-8" />
    </Screen>
  );
}
