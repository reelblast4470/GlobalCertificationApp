import React from 'react';
import { levelProgress } from '../engine/gamification';
import { Sheet } from './ui/primitives';

export type TabKey = 'home' | 'learn' | 'practice' | 'mistakes' | 'more';

export interface NavProps {
  tab: TabKey;
  navigate: (to: string) => void;
}

export function Screen({
  title,
  subtitle,
  right,
  children,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="px-4 pt-3">
      <div className="mb-3 flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="btn btn-sm btn-ghost"
            style={{ width: 40, padding: 0 }}
            aria-label="Back"
          >
            ‹
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold leading-tight">{title}</h1>
          {subtitle && (
            <div className="truncate text-xs" style={{ color: 'var(--muted)' }}>
              {subtitle}
            </div>
          )}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function LevelPill({ xp, streak }: { xp: number; streak: number }) {
  const p = levelProgress(xp);
  return (
    <div className="flex items-center gap-2">
      {streak > 0 && (
        <span className="chip" style={{ background: 'var(--bad-soft)', color: 'var(--warn)' }}>
          🔥 {streak}
        </span>
      )}
      <span className="chip" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
        L{p.level} · {xp} XP
      </span>
    </div>
  );
}

export function BottomNav({ tab, navigate }: NavProps) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const items: { key: TabKey; emoji: string; label: string; route: string }[] = [
    { key: 'home', emoji: '🏠', label: 'Home', route: '/home' },
    { key: 'learn', emoji: '📖', label: 'Learn', route: '/learn' },
    { key: 'practice', emoji: '🎯', label: 'Practice', route: '/practice' },
    { key: 'mistakes', emoji: '❌', label: 'Mistakes', route: '/mistakes' },
    { key: 'more', emoji: '☰', label: 'More', route: '' },
  ];

  const moreItems = [
    { emoji: '🧠', label: 'Flashcards', route: '/flashcards', hint: 'Active recall, 4-button SRS' },
    { emoji: '📝', label: 'Mock Test', route: '/exam', hint: 'Timed exam simulator' },
    { emoji: '⚡', label: 'Quick Revision', route: '/quick', hint: 'Whole chapter in 5–15 min' },
    { emoji: '📊', label: 'Progress', route: '/progress', hint: 'Analytics & mastery' },
    { emoji: '🔍', label: 'Search', route: '/search', hint: 'Topics, facts, questions' },
    { emoji: '📥', label: 'Import Notes', route: '/import', hint: 'Turn notes into a course' },
    { emoji: '⚙️', label: 'Settings', route: '/settings', hint: 'Theme, exam rules, data' },
  ];

  return (
    <>
      <nav className="tabbar">
        <div className="tabbar-inner">
          {items.map((it) => {
            const active = tab === it.key;
            return (
              <button
                key={it.key}
                onClick={() => (it.key === 'more' ? setMoreOpen(true) : navigate(it.route))}
                className="flex flex-col items-center justify-center gap-0.5 py-2"
                style={{ color: active ? 'var(--brand)' : 'var(--muted)' }}
                aria-label={it.label}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{it.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: active ? 800 : 600 }}>{it.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="flex flex-col gap-2">
          {moreItems.map((m) => (
            <button
              key={m.route}
              className="btn"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => {
                setMoreOpen(false);
                navigate(m.route);
              }}
            >
              <span style={{ fontSize: 18 }}>{m.emoji}</span>
              <span className="flex-1 text-left">
                <span className="block leading-tight">{m.label}</span>
                <span className="block text-[11px] font-normal" style={{ color: 'var(--muted)' }}>
                  {m.hint}
                </span>
              </span>
              <span style={{ color: 'var(--muted)' }}>›</span>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
