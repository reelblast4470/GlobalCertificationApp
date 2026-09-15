import React from 'react';
import { useApp } from '../state/AppContext';
import { Screen } from '../components/Layout';
import { Chip, EmptyState, ProgressBar } from '../components/ui/primitives';
import { allFlashcards } from '../engine/indexBuilder';
import { isDue, dueLabel } from '../engine/srs';
import type { SrsRating } from '../types/progress';

const RATINGS: { key: SrsRating; label: string; hint: string; tone: string }[] = [
  { key: 'again', label: 'Again', hint: '10 min', tone: 'var(--bad)' },
  { key: 'hard', label: 'Hard', hint: '1 day', tone: 'var(--warn)' },
  { key: 'good', label: 'Good', hint: '3 days', tone: 'var(--good)' },
  { key: 'easy', label: 'Easy', hint: '1 week', tone: 'var(--brand)' },
];

export default function Flashcards({ navigate }: { navigate: (to: string) => void }) {
  const app = useApp();
  const { packs, user } = app;
  const [session, setSession] = React.useState<{ id: string; front: string; back: string; trick?: string; topic: string }[] | null>(null);
  const [idx, setIdx] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);
  const [reviewed, setReviewed] = React.useState(0);

  const all = React.useMemo(() => allFlashcards(packs), [packs]);
  const dueCount = React.useMemo(
    () => all.filter((f) => isDue(user.cards[f.card.id])).length,
    [all, user.cards]
  );

  const start = () => {
    const due = all.filter((f) => isDue(user.cards[f.card.id]));
    const fresh = all.filter((f) => !user.cards[f.card.id]).slice(0, Math.max(0, 20 - due.length));
    const picked = [...due, ...fresh].slice(0, 20);
    if (!picked.length) return;
    setSession(
      picked.map((p) => ({
        id: p.card.id,
        front: p.card.front,
        back: p.card.back,
        trick: p.card.trick,
        topic: p.topicTitle,
      }))
    );
    setIdx(0);
    setFlipped(false);
    setReviewed(0);
  };

  if (session && idx < session.length) {
    const card = session[idx];
    const rate = (r: SrsRating) => {
      app.rateCard(card.id, r);
      setReviewed((n) => n + 1);
      setFlipped(false);
      setIdx((i) => i + 1);
    };
    return (
      <Screen title="Flashcards" subtitle={`${idx + 1} of ${session.length} · ${card.topic}`}>
        <div className="mb-2">
          <ProgressBar value={(idx / session.length) * 100} height={6} />
        </div>

        <button
          onClick={() => setFlipped((f) => !f)}
          className="card flex min-h-[260px] w-full flex-col items-center justify-center gap-3 p-5 text-center"
          style={{ borderColor: flipped ? 'var(--brand)' : 'var(--line)' }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            {flipped ? 'Answer' : 'Question'}
          </div>
          <div className={`text-[19px] font-bold leading-snug ${flipped ? 'pop' : ''}`}>
            {flipped ? card.back : card.front}
          </div>
          {flipped && card.trick && (
            <div className="rounded-xl p-2.5 text-[13px]" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
              🧠 {card.trick}
            </div>
          )}
          <div className="text-[12px]" style={{ color: 'var(--brand)' }}>
            {flipped ? 'Tap to hide' : 'Tap to reveal'}
          </div>
        </button>

        {flipped ? (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.key}
                onClick={() => rate(r.key)}
                className="btn btn-sm flex-col"
                style={{ background: 'var(--surface)', borderColor: r.tone, width: '100%', padding: '10px 4px' }}
              >
                <span className="text-[13px] font-extrabold" style={{ color: r.tone }}>
                  {r.label}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                  {r.hint}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button className="btn btn-primary mt-3" onClick={() => setFlipped(true)}>
            Show answer
          </button>
        )}

        <div className="mt-3 flex justify-center gap-1.5">
          <Chip>✅ {reviewed} reviewed</Chip>
          <Chip>⏳ {session.length - idx - 1} left</Chip>
        </div>
        <div className="h-8" />
      </Screen>
    );
  }

  if (session && idx >= session.length) {
    return (
      <Screen title="Flashcards" subtitle="Session complete">
        <div className="card p-6 text-center">
          <div className="text-5xl">🧠</div>
          <h2 className="mt-2 text-lg font-extrabold">{reviewed} cards reviewed</h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Next reviews are scheduled automatically — "Again" cards come back today.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button className="btn btn-primary" onClick={start}>
              Another round
            </button>
            <button className="btn btn-ghost" onClick={() => setSession(null)}>
              Done
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  const nextDue = Object.entries(user.cards)
    .map(([id, s]) => ({ id, label: dueLabel(s) }))
    .slice(0, 5);

  return (
    <Screen title="Flashcards" subtitle="Active recall, four-button scheduling">
      <div className="card p-4 text-center">
        <div className="text-5xl">🧠</div>
        <div className="mt-2 text-lg font-extrabold">{dueCount} cards due</div>
        <div className="text-sm" style={{ color: 'var(--muted)' }}>
          {all.length} cards installed · 20 per session
        </div>
        <button className="btn btn-primary mt-4" disabled={!dueCount && !all.length} onClick={start}>
          Start session
        </button>
      </div>

      {!all.length && (
        <div className="mt-3">
          <EmptyState
            emoji="📥"
            title="No flashcards yet"
            hint="Flashcards come with your content pack. Import notes to generate them from definitions and key facts."
            action={
              <button className="btn btn-primary" onClick={() => navigate('/import')}>
                Import notes
              </button>
            }
          />
        </div>
      )}

      {nextDue.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Recently scheduled
          </div>
          <div className="flex flex-wrap gap-1.5">
            {nextDue.map((n) => (
              <Chip key={n.id}>{n.label}</Chip>
            ))}
          </div>
        </div>
      )}
      <div className="h-8" />
    </Screen>
  );
}
