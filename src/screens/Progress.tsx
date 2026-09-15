import React from 'react';
import { useApp } from '../state/AppContext';
import { Screen } from '../components/Layout';
import { Chip, EmptyState, LineChart, MasteryBar, MiniBars, SectionTitle, StatTile } from '../components/ui/primitives';
import { ACHIEVEMENTS, levelProgress } from '../engine/gamification';
import { rankWeakTopics, nextStudyAdvice, overallMastery } from '../engine/mastery';
import { mistakeQueue, resolvedCount } from '../engine/mistakes';
import { todayISO } from '../engine/srs';

export default function Progress({ navigate }: { navigate: (to: string) => void }) {
  const app = useApp();
  const { user, index } = app;

  const totals = React.useMemo(() => {
    let attempted = 0;
    let correct = 0;
    let minutes = 0;
    for (const s of Object.values(user.topics)) {
      attempted += s.correct + s.wrong;
      correct += s.correct;
      minutes += s.minutes;
    }
    return { attempted, correct, minutes, accuracy: attempted ? correct / attempted : 0 };
  }, [user.topics]);

  const mastered = React.useMemo(
    () => Object.values(app.masteryByTopic).filter((m) => m >= 96).length,
    [app.masteryByTopic]
  );
  const overall = overallMastery(app.masteryByTopic);
  const lv = levelProgress(user.xp);

  const last14 = React.useMemo(() => {
    const out: { label: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayISO(d);
      const stat = user.daily[key];
      out.push({ label: d.toLocaleDateString(undefined, { day: 'numeric' }), value: stat?.questions ?? 0 });
    }
    return out;
  }, [user.daily]);

  const mocks = React.useMemo(
    () => user.attempts.filter((a) => a.mode === 'exam').slice(-10),
    [user.attempts]
  );

  const ranked = React.useMemo(
    () =>
      rankWeakTopics(
        [...index.topics.values()].map((t) => ({
          topicId: t.topicId,
          title: t.topic.title,
          mastery: app.masteryByTopic[t.topicId] ?? 0,
          mistakes: mistakeQueue(user).filter((m) => m.conceptTested === t.topic.title).length,
          lastActivity: user.topics[t.topicId]?.lastActivity,
        }))
      ),
    [index, app.masteryByTopic, user]
  );

  const hotMistakes = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of mistakeQueue(user)) counts.set(m.conceptTested, (counts.get(m.conceptTested) ?? 0) + m.times);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [user]);

  if (totals.attempted === 0) {
    return (
      <Screen title="Progress" subtitle="Your analytics">
        <EmptyState
          emoji="📊"
          title="No data yet"
          hint="Answer your first questions and this dashboard fills up with accuracy, mastery and trends."
          action={
            <button className="btn btn-primary" onClick={() => navigate('/practice')}>
              Start practising
            </button>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen title="Progress" subtitle="Analytics & mastery">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Attempted" value={totals.attempted} />
        <StatTile label="Accuracy" value={`${Math.round(totals.accuracy * 100)}%`} tone="var(--good)" />
        <StatTile label="Mastered" value={mastered} sub="topics ≥96%" tone="var(--brand)" />
        <StatTile label="Study time" value={`${Math.round(totals.minutes)}m`} />
        <StatTile label="Streak" value={user.streak.current} sub={`best ${user.streak.best}`} tone="var(--warn)" />
        <StatTile label="Level" value={lv.level} sub={`${lv.into}/${lv.need} XP`} tone="var(--brand)" />
      </div>

      <div className="card mt-3 p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Overall mastery
          </span>
          <span className="text-lg font-extrabold">{overall}%</span>
        </div>
        <MasteryBar score={overall} showLabel={false} />
      </div>

      <div className="mt-4">
        <SectionTitle>Last 14 days — questions/day</SectionTitle>
        <div className="card p-3">
          <MiniBars data={last14} height={72} />
        </div>
      </div>

      {mocks.length >= 2 && (
        <div className="mt-4">
          <SectionTitle>Mock test scores</SectionTitle>
          <div className="card p-3">
            <LineChart points={mocks.map((m, i) => ({ x: i, y: Math.round((m.score / m.maxScore) * 100) }))} height={90} />
            <div className="mt-1 flex justify-between text-[11px]" style={{ color: 'var(--muted)' }}>
              <span>{mocks[0] ? Math.round((mocks[0].score / mocks[0].maxScore) * 100) : 0}%</span>
              <span>latest {mocks.length ? Math.round((mocks[mocks.length - 1].score / mocks[mocks.length - 1].maxScore) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <SectionTitle>Topic mastery</SectionTitle>
        <div className="card divide-y" style={{ borderColor: 'var(--line)' }}>
          {ranked
            .slice()
            .reverse()
            .map((t) => (
              <button key={t.topicId} onClick={() => navigate(`/learn?topic=${t.topicId}`)} className="flex w-full items-center gap-3 p-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{t.title}</div>
                  <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                    {t.reason}
                  </div>
                </div>
                <div className="w-20">
                  <MasteryBar score={t.mastery} />
                </div>
              </button>
            ))}
        </div>
      </div>

      {hotMistakes.length > 0 && (
        <div className="mt-4">
          <SectionTitle>Frequently wrong concepts</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {hotMistakes.map(([c, n]) => (
              <Chip key={c} tone="bad">
                {c} · {n}×
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="card mt-3 p-3 text-[13px]" style={{ background: 'var(--surface2)' }}>
        <span className="mr-1">🧭</span>
        {nextStudyAdvice(ranked.map((r) => ({ title: r.title, mastery: r.mastery })).reverse()) ??
          'Answer more questions to unlock personalised advice.'}
      </div>

      <div className="mt-4">
        <SectionTitle
          action={
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
              {user.achievements.length}/{ACHIEVEMENTS.length}
            </span>
          }
        >
          Achievements
        </SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const owned = user.achievements.some((x) => x.id === a.id);
            return (
              <div
                key={a.id}
                className="card flex flex-col items-center gap-0.5 p-2 text-center"
                style={{ opacity: owned ? 1 : 0.4 }}
              >
                <span style={{ fontSize: 22 }}>{a.emoji}</span>
                <span className="text-[10px] font-semibold leading-tight">{a.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatTile label="Open errors" value={mistakeQueue(user).length} tone="var(--bad)" />
        <StatTile label="Errors cleared" value={resolvedCount(user)} tone="var(--good)" />
      </div>
      <div className="h-8" />
    </Screen>
  );
}
