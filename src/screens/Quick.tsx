import React from 'react';
import { useApp } from '../state/AppContext';
import { Screen } from '../components/Layout';
import { QuizRunner } from '../components/QuizRunner';
import { Chip, EmptyState, SectionTitle } from '../components/ui/primitives';
import { RichText } from '../components/ui/primitives';
import { selectQuestions } from '../engine/selector';

export default function Quick({ navigate, initialTopicId }: { navigate: (to: string) => void; initialTopicId?: string }) {
  const app = useApp();
  const { index, user } = app;
  const [chapterId, setChapterId] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);

  const chapters = React.useMemo(() => {
    const map = new Map<string, { id: string; title: string; topics: string[] }>();
    for (const ref of index.topics.values()) {
      const c = map.get(ref.chapterId) ?? { id: ref.chapterId, title: ref.chapterTitle, topics: [] };
      c.topics.push(ref.topicId);
      map.set(ref.chapterId, c);
    }
    return [...map.values()];
  }, [index]);

  const activeChapter = chapterId ?? chapters[0]?.id ?? null;
  const topics = React.useMemo(() => {
    const ids = initialTopicId
      ? [initialTopicId]
      : (chapters.find((c) => c.id === activeChapter)?.topics ?? []);
    return ids.map((id) => index.topics.get(id)!).filter(Boolean);
  }, [chapters, activeChapter, index, initialTopicId]);

  if (running) {
    const refs = selectQuestions(index, user, {
      mode: 'quick',
      count: 15,
      topicIds: topics.map((t) => t.topicId),
    });
    return (
      <QuizRunner
        title="Quick Revision"
        subtitle="Most important questions from this chapter"
        mode="quick"
        initialRefs={refs}
        onExit={() => setRunning(false)}
        onFinish={() => setRunning(false)}
        onReviewMistakes={() => navigate('/mistakes')}
      />
    );
  }

  const questionCount = topics.reduce((n, t) => n + t.topic.questions.length, 0);

  return (
    <Screen
      title="⚡ Quick Revision"
      subtitle="Whole chapter in 5–15 minutes"
      onBack={() => navigate('/home')}
    >
      {!initialTopicId && chapters.length > 1 && (
        <div className="scroll-x">
          {chapters.map((c) => (
            <button
              key={c.id}
              onClick={() => setChapterId(c.id)}
              className="chip"
              style={{
                background: activeChapter === c.id ? 'var(--brand-soft)' : 'var(--surface2)',
                color: activeChapter === c.id ? 'var(--brand)' : 'var(--muted)',
                border: activeChapter === c.id ? '1px solid var(--brand)' : '1px solid transparent',
              }}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      <div className="card mt-3 flex items-center justify-between p-3">
        <div>
          <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
            {topics.length} topics · {questionCount} questions
          </div>
          <div className="font-bold">Revise the essentials</div>
        </div>
        <button className="btn btn-sm btn-primary" onClick={() => setRunning(true)} disabled={!questionCount}>
          Test me
        </button>
      </div>

      {topics.length === 0 && <EmptyState emoji="📥" title="Nothing to revise" hint="Import notes to build chapters." />}

      <div className="mt-3 flex flex-col gap-3">
        {topics.map((ref) => {
          const t = ref.topic;
          const mnemonic = t.concepts.find((c) => c.mnemonic)?.mnemonic;
          const facts = (t.keyFacts ?? []).slice(0, 10);
          const importantQs = t.questions.filter((q) => q.difficulty !== 'easy').slice(0, 3);
          return (
            <div key={ref.topicId} className="card overflow-hidden">
              <div className="flex items-center justify-between p-3" style={{ background: 'var(--surface2)' }}>
                <div className="font-bold">{t.title}</div>
                <Chip>{app.masteryByTopic[ref.topicId] ?? 0}% mastery</Chip>
              </div>

              <div className="flex flex-col gap-3 p-3">
                {t.keyDefinition && (
                  <div>
                    <Mini>📌 Definition</Mini>
                    <div className="text-[14px]">
                      <RichText text={t.keyDefinition} />
                    </div>
                  </div>
                )}

                {facts.length > 0 && (
                  <div>
                    <Mini>⭐ Key facts</Mini>
                    <ul className="flex flex-col gap-1">
                      {facts.map((f, i) => (
                        <li key={i} className="flex gap-2 text-[13px] leading-snug">
                          <span style={{ color: 'var(--brand)' }}>{i + 1}.</span>
                          <span className="flex-1">
                            <RichText text={f} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(t.formulas ?? []).length > 0 && (
                  <div>
                    <Mini>📐 Rules & formulas</Mini>
                    <ul className="flex flex-col gap-1">
                      {t.formulas!.map((f, i) => (
                        <li key={i} className="rounded-lg p-2 text-[13px]" style={{ background: 'var(--surface2)' }}>
                          <RichText text={f} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {t.commonConfusion && (
                  <div>
                    <Mini>⚠️ Common confusion</Mini>
                    <div className="rounded-lg p-2 text-[13px]" style={{ background: 'var(--bad-soft)' }}>
                      <RichText text={t.commonConfusion} />
                    </div>
                  </div>
                )}

                {mnemonic && (
                  <div>
                    <Mini>🧠 Memory trick</Mini>
                    <div className="rounded-lg p-2 text-[13px]" style={{ background: 'var(--surface2)' }}>
                      <strong>{mnemonic.for}:</strong> {mnemonic.text}
                    </div>
                  </div>
                )}

                {importantQs.length > 0 && (
                  <div>
                    <Mini>❓ Most important MCQs</Mini>
                    <ul className="flex flex-col gap-1">
                      {importantQs.map((q) => (
                        <li key={q.id} className="text-[13px] leading-snug">
                          • <RichText text={q.prompt} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {t.oneLineSummary && (
                  <div className="rounded-lg p-2.5 text-[13px]" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                    <strong>One line:</strong> <RichText text={t.oneLineSummary} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button className="btn btn-sm" onClick={() => navigate(`/learn?topic=${ref.topicId}`)}>
                    📖 Full concept
                  </button>
                  <button className="btn btn-sm" onClick={() => navigate(`/practice?topic=${ref.topicId}`)}>
                    🎯 Practise
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <SectionTitle>Spaced revision</SectionTitle>
        <div className="card p-3 text-[13px]" style={{ color: 'var(--muted)' }}>
          Topics you revise here are also tracked by the scheduler — items you got wrong come back
          tomorrow, then in 3 days, then 7.
        </div>
      </div>
      <div className="h-8" />
    </Screen>
  );
}

function Mini({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
      {children}
    </div>
  );
}
