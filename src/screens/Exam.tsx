import React from 'react';
import { useApp } from '../state/AppContext';
import { Screen } from '../components/Layout';
import { QuestionCard, ExplanationPanel } from '../components/QuestionCard';
import { Chip, EmptyState, ProgressBar, Segmented, StatTile } from '../components/ui/primitives';
import { shuffle } from '../engine/engineAliases';
import { buildExamSet, fmtTime, gradeExam, resultToAttempt, type ExamAnswer, type ExamConfig, type ExamResult } from '../engine/exam';

const NEG_OPTIONS = [0, 0.25, 0.33, 0.5];

export default function Exam({ navigate }: { navigate: (to: string) => void }) {
  const app = useApp();
  const { index, user } = app;
  const [phase, setPhase] = React.useState<'setup' | 'run' | 'result'>('setup');
  const [cfg, setCfg] = React.useState<ExamConfig>({
    count: Math.min(25, index.stats.questions),
    minutes: user.settings.examMinutes,
    negative: user.settings.negativeMarking,
    topicIds: undefined,
    shuffleOptions: user.settings.optionShuffle,
  });
  const [refs, setRefs] = React.useState<ReturnType<typeof buildExamSet>>([]);
  const [answers, setAnswers] = React.useState<Record<string, ExamAnswer>>({});
  const [idx, setIdx] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState(0);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [result, setResult] = React.useState<ExamResult | null>(null);
  const [startedAt, setStartedAt] = React.useState(0);
  const [perQuestionStart, setPerQuestionStart] = React.useState(Date.now());
  const [orders, setOrders] = React.useState<Record<string, string[]>>({});

  const start = () => {
    const set = buildExamSet(index, user, cfg);
    if (!set.length) return;
    setRefs(set);
    setAnswers({});
    setIdx(0);
    setTimeLeft(cfg.minutes * 60);
    setStartedAt(Date.now());
    setPerQuestionStart(Date.now());
    setOrders(
      Object.fromEntries(
        set.map((r) => [
          r.question.id,
          cfg.shuffleOptions ? shuffle(r.question.options.map((o) => o.id)) : r.question.options.map((o) => o.id),
        ])
      )
    );
    setPhase('run');
  };

  const submit = React.useCallback(() => {
    if (!refs.length) return;
    const duration = Math.round((Date.now() - startedAt) / 1000);

    // feed every answer into the learning engine (SRS + error book + mastery + XP)
    for (const ref of refs) {
      const a = answers[ref.question.id];
      app.answerQuestion(ref, a?.selected ?? [], a?.timeSec ? a.timeSec * 1000 : 15000, 'exam');
    }

    const res = gradeExam(refs, answers, duration, cfg);
    setResult(res);
    app.logAttempt(resultToAttempt(res, duration, cfg.negative));
    setPhase('result');
  }, [answers, app, cfg, refs, startedAt]);

  React.useEffect(() => {
    if (phase !== 'run') return;
    const t = window.setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          window.clearInterval(t);
          submit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [phase, submit]);

  const moveTo = (next: number) => {
    const now = Date.now();
    const cur = refs[idx];
    if (cur) {
      const prevTime = Math.round((now - perQuestionStart) / 1000);
      setAnswers((a) => ({
        ...a,
        [cur.question.id]: { ...(a[cur.question.id] ?? { selected: [], marked: false }), timeSec: (a[cur.question.id]?.timeSec ?? 0) + prevTime },
      }));
    }
    setIdx(Math.max(0, Math.min(refs.length - 1, next)));
    setPerQuestionStart(Date.now());
  };

  const select = (ids: string[]) => {
    const cur = refs[idx];
    setAnswers((a) => ({ ...a, [cur.question.id]: { ...(a[cur.question.id] ?? { selected: [], marked: false, timeSec: 0 }), selected: ids } }));
  };

  /* ------------------------------- setup ------------------------------- */
  if (phase === 'setup') {
    return (
      <Screen title="Mock Test" subtitle="Exam simulator with negative marking">
        <div className="card p-3">
          <div className="mb-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Questions
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[10, 25, 50, 100].map((n) => (
              <button
                key={n}
                onClick={() => setCfg({ ...cfg, count: Math.min(n, index.stats.questions) })}
                className="btn btn-sm"
                style={{
                  background: cfg.count === Math.min(n, index.stats.questions) ? 'var(--brand)' : 'var(--surface)',
                  color: cfg.count === Math.min(n, index.stats.questions) ? '#fff' : 'var(--ink)',
                  borderColor: cfg.count === Math.min(n, index.stats.questions) ? 'transparent' : 'var(--line)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
            {index.stats.questions} questions available in this pack.
          </div>
        </div>

        <div className="card mt-3 p-3">
          <div className="mb-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Time limit
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[15, 30, 45, 60].map((m) => (
              <button
                key={m}
                onClick={() => setCfg({ ...cfg, minutes: m })}
                className="btn btn-sm"
                style={{
                  background: cfg.minutes === m ? 'var(--brand)' : 'var(--surface)',
                  color: cfg.minutes === m ? '#fff' : 'var(--ink)',
                  borderColor: cfg.minutes === m ? 'transparent' : 'var(--line)',
                }}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        <div className="card mt-3 p-3">
          <div className="mb-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Negative marking
          </div>
          <div className="grid grid-cols-4 gap-2">
            {NEG_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setCfg({ ...cfg, negative: n })}
                className="btn btn-sm"
                style={{
                  background: cfg.negative === n ? 'var(--brand)' : 'var(--surface)',
                  color: cfg.negative === n ? '#fff' : 'var(--ink)',
                  borderColor: cfg.negative === n ? 'transparent' : 'var(--line)',
                }}
              >
                {n === 0 ? 'None' : `-${n}`}
              </button>
            ))}
          </div>
        </div>

        <div className="card mt-3 p-3">
          <div className="mb-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Options
          </div>
          <Segmented
            value={cfg.shuffleOptions ? 'yes' : 'no'}
            onChange={(v) => setCfg({ ...cfg, shuffleOptions: v === 'yes' })}
            options={[
              { value: 'yes', label: 'Shuffle options' },
              { value: 'no', label: 'Fixed order' },
            ]}
          />
        </div>

        <button className="btn btn-primary mt-4" disabled={!index.stats.questions} onClick={start}>
          Start mock test
        </button>

        {!index.stats.questions && (
          <div className="mt-3">
            <EmptyState emoji="📥" title="No questions installed" hint="Import your notes first." />
          </div>
        )}

        {user.attempts.filter((a) => a.mode === 'exam').length > 0 && (
          <div className="mt-4">
            <div className="mb-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
              Recent mocks
            </div>
            <div className="flex flex-col gap-1.5">
              {user.attempts
                .filter((a) => a.mode === 'exam')
                .slice(-5)
                .reverse()
                .map((a) => (
                  <div key={a.id} className="card flex items-center justify-between p-2.5">
                    <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
                      {new Date(a.ts).toLocaleDateString()} · {a.total} Q
                    </div>
                    <div className="text-[14px] font-extrabold">
                      {a.score}/{a.maxScore}
                      <span className="ml-1 text-[11px] font-normal" style={{ color: 'var(--muted)' }}>
                        ({Math.round((a.score / a.maxScore) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
        <div className="h-8" />
      </Screen>
    );
  }

  /* -------------------------------- run -------------------------------- */
  if (phase === 'run') {
    const ref = refs[idx];
    const ans = answers[ref.question.id];
    const attempted = Object.values(answers).filter((a) => a.selected.length > 0).length;
    const marked = Object.values(answers).filter((a) => a.marked).length;

    return (
      <div className="px-4 pt-2">
        <div className="card mb-2 flex items-center justify-between p-2.5">
          <div className="flex items-center gap-2">
            <span
              className="text-[15px] font-extrabold tabular-nums"
              style={{ color: timeLeft < 60 ? 'var(--bad)' : 'var(--ink)' }}
            >
              ⏱ {fmtTime(timeLeft)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Chip tone="good">✓ {attempted}</Chip>
            <Chip tone="warn">⚑ {marked}</Chip>
            <Chip>
              {idx + 1}/{refs.length}
            </Chip>
          </div>
          <button className="btn btn-sm btn-danger" onClick={submit}>
            Submit
          </button>
        </div>

        <ProgressBar value={(attempted / refs.length) * 100} height={5} />

        <div className="h-3" />

        <QuestionCard
          ref={ref}
          selected={ans?.selected ?? []}
          onSelect={select}
          order={orders[ref.question.id]}
          questionNo={idx + 1}
          total={refs.length}
        />

        <div className="mt-3 grid grid-cols-4 gap-2">
          <button className="btn btn-sm" disabled={idx === 0} onClick={() => moveTo(idx - 1)}>
            ‹ Prev
          </button>
          <button
            className="btn btn-sm"
            style={{ borderColor: ans?.marked ? 'var(--warn)' : 'var(--line)', color: ans?.marked ? 'var(--warn)' : undefined }}
            onClick={() =>
              setAnswers((a) => ({
                ...a,
                [ref.question.id]: { ...(a[ref.question.id] ?? { selected: [], timeSec: 0 }), marked: !a[ref.question.id]?.marked },
              }))
            }
          >
            ⚑ Mark
          </button>
          <button
            className="btn btn-sm"
            disabled={!ans?.selected.length}
            onClick={() =>
              setAnswers((a) => ({ ...a, [ref.question.id]: { ...(a[ref.question.id] ?? { selected: [], timeSec: 0 }), selected: [] } }))
            }
          >
            Clear
          </button>
          <button className="btn btn-sm" onClick={() => moveTo(idx + 1)}>
            Next ›
          </button>
        </div>

        <button className="btn mt-2" onClick={() => setPaletteOpen(true)}>
          🗂 Question palette
        </button>

        {paletteOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.55)' }} onClick={() => setPaletteOpen(false)} />
            <div className="pop card relative m-3 w-full max-w-[460px] p-4">
              <h3 className="mb-2 text-base font-bold">Question palette</h3>
              <div className="grid grid-cols-6 gap-2">
                {refs.map((r, i) => {
                  const a = answers[r.question.id];
                  const bg = a?.selected.length
                    ? a.marked
                      ? 'var(--warn)'
                      : 'var(--good)'
                    : a?.marked
                      ? 'var(--bad-soft)'
                      : 'var(--surface2)';
                  return (
                    <button
                      key={r.question.id}
                      onClick={() => {
                        setPaletteOpen(false);
                        moveTo(i);
                      }}
                      className="flex h-11 items-center justify-center rounded-xl text-[14px] font-extrabold"
                      style={{ background: bg, color: a?.selected.length && !a.marked ? '#fff' : 'var(--ink)', border: i === idx ? '2px solid var(--brand)' : '1px solid var(--line)' }}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip tone="good">✓ Answered</Chip>
                <Chip tone="warn">⚑ Marked</Chip>
                <Chip>Unvisited</Chip>
              </div>
              <button className="btn btn-primary mt-3" onClick={() => { setPaletteOpen(false); submit(); }}>
                Submit exam
              </button>
            </div>
          </div>
        )}
        <div className="h-8" />
      </div>
    );
  }

  /* ------------------------------- result ------------------------------- */
  if (phase === 'result' && result) {
    const incorrect = result.perQuestion.filter((p) => !p.isCorrect);
    return (
      <Screen title="Result" subtitle={`${cfg.count} questions · ${cfg.minutes} min · ${cfg.negative ? `-${cfg.negative}` : 'no negative'}`}>
        <div className="card p-4 text-center">
          <div className="text-5xl">{result.percent >= 80 ? '🏆' : result.percent >= 50 ? '💪' : '📚'}</div>
          <div className="mt-1 text-3xl font-extrabold">
            {result.score}
            <span className="text-lg" style={{ color: 'var(--muted)' }}>
              /{result.maxScore}
            </span>
          </div>
          <div className="text-sm" style={{ color: 'var(--muted)' }}>
            {result.percent}% · accuracy {result.accuracy}%
          </div>
          <div className="mt-3">
            <ProgressBar value={result.percent} color={result.percent >= 80 ? 'var(--good)' : result.percent >= 50 ? 'var(--warn)' : 'var(--bad)'} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatTile label="Correct" value={result.correct} tone="var(--good)" />
          <StatTile label="Wrong" value={result.wrong} tone="var(--bad)" sub={`-${(result.wrong * result.negative).toFixed(2)}`} />
          <StatTile label="Skipped" value={result.unattempted} tone="var(--muted)" />
          <StatTile label="Time" value={fmtTime(result.durationSec)} sub={`${result.avgSecPerQuestion}s/Q`} />
          <StatTile label="Accuracy" value={`${result.accuracy}%`} />
          <StatTile label="Best" value={`${user.personalBest.examScore}%`} sub="personal best" />
        </div>

        <div className="card mt-3 p-3">
          <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Exam strategy
          </div>
          <ul className="flex flex-col gap-1.5">
            {result.strategy.map((s, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-snug">
                <span style={{ color: 'var(--brand)' }}>▸</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {(result.weakTopics.length > 0 || result.strongTopics.length > 0) && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="card p-3">
              <div className="mb-1 text-[11px] font-bold uppercase" style={{ color: 'var(--bad)' }}>
                Weak topics
              </div>
              {result.weakTopics.length ? (
                result.weakTopics.map((t) => (
                  <div key={t} className="text-[13px]">
                    🔴 {t}
                  </div>
                ))
              ) : (
                <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
                  None — nice.
                </div>
              )}
            </div>
            <div className="card p-3">
              <div className="mb-1 text-[11px] font-bold uppercase" style={{ color: 'var(--good)' }}>
                Strong topics
              </div>
              {result.strongTopics.length ? (
                result.strongTopics.map((t) => (
                  <div key={t} className="text-[13px]">
                    🟢 {t}
                  </div>
                ))
              ) : (
                <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
                  Push accuracy above 80%.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Review incorrect questions ({incorrect.length})
          </div>
          {incorrect.length === 0 ? (
            <div className="card p-4 text-center text-[14px]">🎯 Clean sheet — nothing to review.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {incorrect.map((p) => (
                <div key={p.ref.question.id}>
                  <QuestionCard ref={p.ref} selected={p.selected} showCorrect locked />
                  <div className="h-2" />
                  <ExplanationPanel
                    ref={p.ref}
                    correct={false}
                    selectedText={
                      p.selected.map((id) => p.ref.question.options.find((o) => o.id === id)?.text).join(' + ') || 'No answer'
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button className="btn btn-primary" onClick={() => setPhase('setup')}>
            New mock test
          </button>
          <button className="btn" onClick={() => navigate('/mistakes')}>
            ❌ Go to error book
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/home')}>
            Home
          </button>
        </div>
        <div className="h-8" />
      </Screen>
    );
  }

  return null;
}
