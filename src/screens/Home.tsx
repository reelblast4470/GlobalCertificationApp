import React from 'react';
import { useApp } from '../state/AppContext';
import { buildDailyPlan, countDue, unreadConcepts } from '../engine/planner';
import { rankWeakTopics, nextStudyAdvice, masteryInfo } from '../engine/mastery';
import { mistakeQueue } from '../engine/mistakes';
import { Chip, EmptyState, MasteryBar, ProgressBar, SectionTitle } from '../components/ui/primitives';
import { levelProgress } from '../engine/gamification';

export default function Home({ navigate }: { navigate: (to: string) => void }) {
  const app = useApp();
  const { user, index, packs } = app;
  const plan = React.useMemo(() => buildDailyPlan(index, user), [index, user]);
  const lv = levelProgress(user.xp);

  const activePack = packs.find((p) => p.id === user.activePackId) ?? packs[0];
  const dueNow = countDue(index, user, 'questions');
  const newConcepts = unreadConcepts(index, user);
  const openMistakes = mistakeQueue(user).length;

  const ranked = React.useMemo(
    () =>
      rankWeakTopics(
        [...index.topics.values()].map((t) => ({
          topicId: t.topicId,
          title: t.topic.title,
          mastery: app.masteryByTopic[t.topicId] ?? 0,
          mistakes: Object.values(user.mistakes).filter(
            (m) => m.conceptTested === t.topic.title && !m.resolved
          ).length,
          lastActivity: user.topics[t.topicId]?.lastActivity,
        }))
      ),
    [index, app.masteryByTopic, user.mistakes, user.topics]
  );

  const continueTopic = React.useMemo(() => {
    const last = [...index.topics.values()]
      .filter((t) => user.topics[t.topicId]?.lastActivity)
      .sort(
        (a, b) =>
          +new Date(user.topics[b.topicId]!.lastActivity!) -
          +new Date(user.topics[a.topicId]!.lastActivity!)
      )[0];
    return last ?? index.topics.values().next().value;
  }, [index, user.topics]);

  const advice = nextStudyAdvice(ranked.map((r) => ({ title: r.title, mastery: r.mastery })).reverse());

  const quickActions = [
    { emoji: '📖', label: 'Learn', route: '/learn', tint: 'var(--brand-soft)' },
    { emoji: '🎯', label: 'Practice', route: '/practice', tint: 'var(--good-soft)' },
    { emoji: '🧠', label: 'Flashcards', route: '/flashcards', tint: 'var(--surface2)' },
    { emoji: '📝', label: 'Mock Test', route: '/exam', tint: 'var(--bad-soft)' },
  ];

  return (
    <div className="px-4 pt-4">
      {/* greeting + exam */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm" style={{ color: 'var(--muted)' }}>
            {plan.greeting}! 👋
          </div>
          <h1 className="text-xl font-extrabold leading-tight">Let's get a step ahead</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          {user.streak.current > 0 && (
            <span className="chip" style={{ background: 'var(--bad-soft)', color: 'var(--warn)' }}>
              🔥 {user.streak.current} day streak
            </span>
          )}
          <span className="chip" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
            L{lv.level} · {user.xp} XP
          </span>
        </div>
      </div>

      {/* exam selector */}
      {packs.length > 1 && (
        <div className="scroll-x mt-3">
          {packs.map((p) => (
            <button
              key={p.id}
              onClick={() => app.setActivePack(p.id)}
              className="chip"
              style={{
                background: activePack?.id === p.id ? 'var(--brand-soft)' : 'var(--surface2)',
                color: activePack?.id === p.id ? 'var(--brand)' : 'var(--muted)',
                border: activePack?.id === p.id ? '1px solid var(--brand)' : '1px solid transparent',
              }}
            >
              🎓 {p.examLabel}
            </button>
          ))}
        </div>
      )}

      <div className="card mt-3 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Your exam
        </div>
        <div className="font-bold">{activePack?.examLabel ?? 'No pack installed'}</div>
        <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {activePack?.title ?? 'Import your notes to begin'}
        </div>
        <div className="mt-2 flex gap-1.5">
          <Chip>📚 {index.stats.topics} topics</Chip>
          <Chip>❓ {index.stats.questions} questions</Chip>
          <Chip>🧠 {index.stats.flashcards} cards</Chip>
        </div>
      </div>

      {/* continue learning */}
      {continueTopic && (
        <div className="mt-4">
          <SectionTitle>Continue learning</SectionTitle>
          <button className="card w-full p-3 text-left" onClick={() => navigate(`/learn?topic=${continueTopic.topicId}`)}>
            <div className="flex items-center gap-2">
              <span className="text-lg">📖</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{continueTopic.topic.title}</div>
                <div className="truncate text-[11px]" style={{ color: 'var(--muted)' }}>
                  {continueTopic.chapterTitle} · {continueTopic.subjectTitle}
                </div>
              </div>
              <span className="text-lg" style={{ color: 'var(--brand)' }}>
                ›
              </span>
            </div>
            <div className="mt-2">
              <MasteryBar score={app.masteryByTopic[continueTopic.topicId] ?? 0} />
            </div>
          </button>
        </div>
      )}

      {/* today's plan */}
      <div className="mt-4">
        <SectionTitle
          action={
            <span className="text-[12px] font-bold" style={{ color: 'var(--brand)' }}>
              {plan.overallPct}%
            </span>
          }
        >
          Today's goal
        </SectionTitle>
        <div className="card p-3">
          <ProgressBar value={plan.overallPct} height={10} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {plan.items.map((it) => {
              const pct = Math.min(100, Math.round((it.done / Math.max(1, it.target)) * 100));
              return (
                <button
                  key={it.key}
                  onClick={() => navigate(`/${it.route}`)}
                  className="rounded-xl p-2.5 text-left"
                  style={{ background: 'var(--surface2)' }}
                >
                  <div className="flex items-center gap-1.5 text-[13px] font-bold">
                    <span>{it.emoji}</span>
                    <span>
                      {it.done}/{it.target}
                    </span>
                    <span className="font-normal" style={{ color: 'var(--muted)' }}>
                      {it.label}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar value={pct} height={5} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* weak topics */}
      <div className="mt-4">
        <SectionTitle>Weak topics</SectionTitle>
        {ranked.length === 0 ? (
          <EmptyState emoji="📥" title="No content yet" hint="Import your notes to build topics." />
        ) : (
          <div className="card divide-y" style={{ borderColor: 'var(--line)' }}>
            {ranked.slice(0, 3).map((t) => {
              const info = masteryInfo(t.mastery);
              return (
                <button
                  key={t.topicId}
                  onClick={() => navigate(`/learn?topic=${t.topicId}`)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <span>{info.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{t.title}</div>
                    <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                      {t.reason}
                    </div>
                  </div>
                  <div className="w-16">
                    <MasteryBar score={t.mastery} showLabel={false} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* advice */}
      {advice && (
        <div className="card mt-3 p-3 text-[13px]" style={{ background: 'var(--surface2)' }}>
          <span className="mr-1">🧭</span>
          {advice}
        </div>
      )}

      {/* quick actions */}
      <div className="mt-4">
        <SectionTitle>Quick actions</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((qa) => (
            <button
              key={qa.route}
              onClick={() => navigate(qa.route)}
              className="card flex flex-col items-center gap-1 p-3"
              style={{ background: qa.tint }}
            >
              <span style={{ fontSize: 22 }}>{qa.emoji}</span>
              <span className="text-[11px] font-bold">{qa.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* due strip */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <div className="text-lg">🔄</div>
          <div className="text-lg font-extrabold">{dueNow}</div>
          <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
            Due for review
          </div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-lg">📖</div>
          <div className="text-lg font-extrabold">{newConcepts}</div>
          <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
            New concepts
          </div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-lg">❌</div>
          <div className="text-lg font-extrabold">{openMistakes}</div>
          <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
            Open mistakes
          </div>
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}
