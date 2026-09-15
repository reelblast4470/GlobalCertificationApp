import React from 'react';
import { useApp } from '../state/AppContext';
import { Screen } from '../components/Layout';
import { QuizRunner } from '../components/QuizRunner';
import { EmptyState, MasteryBar, SectionTitle } from '../components/ui/primitives';
import { RichText } from '../components/ui/primitives';
import type { Concept, ConceptBlock, TopicRef } from '../types/content';
import { selectQuestions } from '../engine/selector';
import { shuffle } from '../engine/engineAliases';

const BLOCK_META: Record<ConceptBlock['kind'], { emoji: string; label: string }> = {
  simple: { emoji: '💬', label: 'In simple words' },
  definition: { emoji: '📌', label: 'Definition' },
  steps: { emoji: '🪜', label: 'Step by step' },
  facts: { emoji: '⭐', label: 'Important facts' },
  example: { emoji: '🌍', label: 'Example' },
  compare: { emoji: '⚖️', label: 'Compare & contrast' },
  examPoint: { emoji: '🎯', label: 'Exam point' },
  keyword: { emoji: '🔑', label: 'Keywords' },
  trick: { emoji: '🧠', label: 'Memory trick' },
};

export default function Learn({ navigate, initialTopicId }: { navigate: (to: string) => void; initialTopicId?: string }) {
  const app = useApp();
  const { index, user } = app;
  const [subjectId, setSubjectId] = React.useState<string | null>(null);
  const [chapterId, setChapterId] = React.useState<string | null>(null);
  const [topicId, setTopicId] = React.useState<string | null>(initialTopicId ?? null);
  const [quickCheck, setQuickCheck] = React.useState(false);

  // deep link from Home
  React.useEffect(() => {
    if (initialTopicId) {
      const ref = index.topics.get(initialTopicId);
      if (ref) {
        setSubjectId(ref.subjectId);
        setChapterId(ref.chapterId);
        setTopicId(initialTopicId);
      }
    }
  }, [initialTopicId, index]);

  const subjects = React.useMemo(() => {
    const map = new Map<string, { id: string; title: string; icon?: string; chapters: Map<string, { id: string; title: string; topics: TopicRef[] }> }>();
    for (const ref of index.topics.values()) {
      const s = map.get(ref.subjectId) ?? { id: ref.subjectId, title: ref.subjectTitle, chapters: new Map() };
      const c = s.chapters.get(ref.chapterId) ?? { id: ref.chapterId, title: ref.chapterTitle, topics: [] };
      c.topics.push(ref);
      s.chapters.set(ref.chapterId, c);
      map.set(ref.subjectId, s);
    }
    return [...map.values()];
  }, [index]);

  React.useEffect(() => {
    if (!subjectId && subjects.length) setSubjectId(subjects[0].id);
  }, [subjects, subjectId]);

  const subject = subjects.find((s) => s.id === subjectId);
  const chapters = subject ? [...subject.chapters.values()] : [];
  const chapter = chapters.find((c) => c.id === chapterId) ?? chapters[0];
  const topicRef = topicId ? index.topics.get(topicId) : undefined;

  if (quickCheck && topicRef) {
    const refs = selectQuestions(index, user, { mode: 'practice', count: 4, topicIds: [topicRef.topicId] });
    return (
      <QuizRunner
        title="Learn"
        subtitle={`Quick check · ${topicRef.topic.title}`}
        mode="quick"
        initialRefs={refs.length ? refs : shuffle(topicRef.topic.questions.slice(0, 4)).map((q) => index.questions.get(q.id)!)}
        onExit={() => setQuickCheck(false)}
        onReviewMistakes={() => navigate('/mistakes')}
      />
    );
  }

  if (topicRef) {
    return (
      <ConceptView
        topicRef={topicRef}
        mastery={app.masteryByTopic[topicRef.topicId] ?? 0}
        onBack={() => setTopicId(null)}
        onQuickCheck={() => setQuickCheck(true)}
        onQuickRevision={() => navigate(`/quick?topic=${topicRef.topicId}`)}
        onPractice={() => navigate(`/practice?topic=${topicRef.topicId}`)}
      />
    );
  }

  return (
    <Screen title="Learn" subtitle={subject?.title}>
      {/* subject chips */}
      <div className="scroll-x">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setSubjectId(s.id);
              setChapterId(null);
            }}
            className="chip"
            style={{
              background: subjectId === s.id ? 'var(--brand-soft)' : 'var(--surface2)',
              color: subjectId === s.id ? 'var(--brand)' : 'var(--muted)',
              border: subjectId === s.id ? '1px solid var(--brand)' : '1px solid transparent',
            }}
          >
            {s.icon ?? '📘'} {s.title}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <SectionTitle>Chapters</SectionTitle>
        <div className="flex flex-col gap-2">
          {chapters.map((c) => {
            const open = chapter?.id === c.id;
            const masteryVals = c.topics.map((t) => app.masteryByTopic[t.topicId] ?? 0);
            const avg = masteryVals.length
              ? Math.round(masteryVals.reduce((a, b) => a + b, 0) / masteryVals.length)
              : 0;
            return (
              <div key={c.id} className="card overflow-hidden">
                <button
                  className="flex w-full items-center gap-3 p-3 text-left"
                  onClick={() => setChapterId(open ? null : c.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span>{open ? '▾' : '▸'}</span>
                      <span className="truncate">{c.title}</span>
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                      {c.topics.length} topics · avg mastery {avg}%
                    </div>
                  </div>
                  <div className="w-16">
                    <MasteryBar score={avg} showLabel={false} />
                  </div>
                </button>
                {open && (
                  <div className="flex flex-col" style={{ borderTop: '1px solid var(--line)' }}>
                    {c.topics.map((t) => {
                      const m = app.masteryByTopic[t.topicId] ?? 0;
                      return (
                        <button
                          key={t.topicId}
                          onClick={() => setTopicId(t.topicId)}
                          className="flex items-center gap-3 p-3 text-left"
                          style={{ borderTop: '1px solid var(--line)' }}
                        >
                          <span className="text-sm" style={{ color: 'var(--muted)' }}>
                            📄
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[14px] font-semibold">{t.topic.title}</div>
                            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                              {t.topic.concepts.length} concepts · {t.topic.questions.length} questions
                            </div>
                          </div>
                          <div className="w-14">
                            <MasteryBar score={m} showLabel={false} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!chapters.length && (
        <EmptyState
          emoji="📥"
          title="No content installed"
          hint="Import your notes from the More menu to build chapters and topics."
          action={
            <button className="btn btn-primary" onClick={() => navigate('/import')}>
              Import notes
            </button>
          }
        />
      )}
      <div className="h-8" />
    </Screen>
  );
}

/* ------------------------------ concept view ------------------------------ */

function ConceptView({
  topicRef,
  mastery,
  onBack,
  onQuickCheck,
  onQuickRevision,
  onPractice,
}: {
  topicRef: TopicRef;
  mastery: number;
  onBack: () => void;
  onQuickCheck: () => void;
  onQuickRevision: () => void;
  onPractice: () => void;
}) {
  const app = useApp();
  const [conceptIdx, setConceptIdx] = React.useState(0);
  const [revealed, setRevealed] = React.useState(2);
  const concept: Concept | undefined = topicRef.topic.concepts[conceptIdx];

  React.useEffect(() => {
    setRevealed(2);
  }, [conceptIdx]);

  if (!concept) {
    return (
      <Screen title={topicRef.topic.title} onBack={onBack}>
        <EmptyState emoji="📝" title="No concepts yet" hint="This topic has no authored concepts." />
      </Screen>
    );
  }

  const visible = concept.blocks.slice(0, revealed);
  const allRevealed = revealed >= concept.blocks.length;

  return (
    <Screen
      title={topicRef.topic.title}
      subtitle={`${topicRef.chapterTitle} · ${topicRef.subjectTitle}`}
      onBack={onBack}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex-1">
          <MasteryBar score={mastery} />
        </div>
      </div>

      {topicRef.topic.concepts.length > 1 && (
        <div className="scroll-x mb-3">
          {topicRef.topic.concepts.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setConceptIdx(i)}
              className="chip"
              style={{
                background: i === conceptIdx ? 'var(--brand-soft)' : 'var(--surface2)',
                color: i === conceptIdx ? 'var(--brand)' : 'var(--muted)',
                border: i === conceptIdx ? '1px solid var(--brand)' : '1px solid transparent',
              }}
            >
              {i + 1}. {c.title}
            </button>
          ))}
        </div>
      )}

      {/* why this matters */}
      <div className="card mb-3 p-3" style={{ background: 'var(--surface2)' }}>
        <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Why it matters
        </div>
        <div className="text-[13px]">
          {topicRef.topic.concepts.length} concept(s) · {topicRef.topic.questions.length} practice
          questions · aim for 96% mastery before the exam.
        </div>
      </div>

      {/* progressive reveal */}
      <div className="flex flex-col gap-2">
        {visible.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>

      {!allRevealed && (
        <button className="btn btn-primary mt-3" onClick={() => setRevealed((r) => r + 1)}>
          Reveal next →
        </button>
      )}

      {allRevealed && (
        <div className="pop card mt-3 p-4" style={{ borderColor: 'var(--brand)' }}>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--brand)' }}>
            Remember this
          </div>
          <div className="text-[15px] leading-snug">
            <RichText text={concept.rememberThis} />
          </div>
          {concept.mnemonic && (
            <div className="mt-2 rounded-xl p-2.5 text-[13px]" style={{ background: 'var(--surface2)' }}>
              🧠 <strong>{concept.mnemonic.for}:</strong> {concept.mnemonic.text}
              {concept.mnemonic.note && (
                <div className="mt-1 text-[12px]" style={{ color: 'var(--muted)' }}>
                  {concept.mnemonic.note}
                </div>
              )}
            </div>
          )}
          <button
            className="btn btn-sm mt-3"
            style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
            onClick={() => app.markConceptRead(concept.id)}
          >
            ✅ Got it — mark as read
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button className="btn btn-sm" onClick={onQuickCheck} disabled={!topicRef.topic.questions.length}>
          ⚡ Quick check
        </button>
        <button className="btn btn-sm" onClick={onPractice} disabled={!topicRef.topic.questions.length}>
          🎯 Practice
        </button>
        <button className="btn btn-sm" onClick={onQuickRevision}>
          📋 Revise
        </button>
      </div>

      <div className="h-8" />
    </Screen>
  );
}

function Block({ block }: { block: ConceptBlock }) {
  const meta = BLOCK_META[block.kind];
  return (
    <div className="pop card p-3">
      <div className="mb-1 flex items-center gap-2">
        <span>{meta.emoji}</span>
        <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          {block.title ?? meta.label}
        </span>
      </div>
      {block.body && (
        <div className="text-[14px] leading-relaxed">
          <RichText text={block.body} />
        </div>
      )}
      {block.items && (
        <ul className="mt-1 flex flex-col gap-1.5">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-2 text-[14px] leading-snug">
              <span style={{ color: 'var(--brand)' }}>•</span>
              <span className="flex-1">
                <RichText text={it} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {block.pairs && (
        <div className="mt-1 flex flex-col gap-1.5">
          {block.pairs.map((p, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-2 text-[13px]" style={{ background: 'var(--surface2)' }}>
                <RichText text={p.left} />
              </div>
              <div className="rounded-lg p-2 text-[13px]" style={{ background: 'var(--surface2)' }}>
                <RichText text={p.right} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
