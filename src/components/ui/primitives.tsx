import React from 'react';
import type { Difficulty } from '../../types/content';
import { BANDS, bandOf } from '../../engine/mastery';

/* ------------------------------- rich text ------------------------------- */

export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**'))
          return (
            <strong key={i} style={{ color: 'var(--ink)' }}>
              {p.slice(2, -2)}
            </strong>
          );
        if (p.startsWith('`') && p.endsWith('`'))
          return (
            <code
              key={i}
              className="rounded px-1 py-0.5 text-[13px]"
              style={{ background: 'var(--surface2)' }}
            >
              {p.slice(1, -1)}
            </code>
          );
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}

/** Highlights NOT / EXCEPT / INCORRECT / FALSE so negative questions cannot be misread. */
export function NegativeText({ text }: { text: string }) {
  const re = /\b(NOT|EXCEPT|INCORRECT|FALSE|WRONG|LEAST)\b/gi;
  const parts = text.split(re);
  return (
    <span>
      {parts.map((p, i) =>
        re.test(p) && /^(NOT|EXCEPT|INCORRECT|FALSE|WRONG|LEAST)$/i.test(p) ? (
          <span
            key={i}
            className="rounded px-1 font-extrabold"
            style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}
          >
            {p}
          </span>
        ) : (
          <RichText key={i} text={p} />
        )
      )}
    </span>
  );
}

/* ------------------------------- progress -------------------------------- */

export function ProgressBar({
  value,
  color,
  height = 8,
  bg,
}: {
  value: number;
  color?: string;
  height?: number;
  bg?: string;
}) {
  return (
    <div
      style={{ background: bg ?? 'var(--surface2)', height }}
      className="w-full overflow-hidden rounded-full"
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: color ?? 'var(--brand)',
          height: '100%',
          transition: 'width .25s ease',
        }}
      />
    </div>
  );
}

export function MasteryBar({ score, showLabel = true }: { score: number; showLabel?: boolean }) {
  const band = bandOf(score);
  const meta = BANDS[band];
  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span style={{ color: meta.color }} className="font-bold">
            {meta.emoji} {meta.label}
          </span>
          <span className="font-semibold" style={{ color: 'var(--muted)' }}>
            {score}%
          </span>
        </div>
      )}
      <ProgressBar value={score} color={meta.color} />
    </div>
  );
}

/* --------------------------------- chips --------------------------------- */

export function Chip({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'brand' | 'good' | 'bad' | 'warn';
}) {
  const map: Record<string, React.CSSProperties> = {
    default: {},
    brand: { background: 'var(--brand-soft)', color: 'var(--brand)' },
    good: { background: 'var(--good-soft)', color: 'var(--good)' },
    bad: { background: 'var(--bad-soft)', color: 'var(--bad)' },
    warn: { background: 'var(--bad-soft)', color: 'var(--warn)' },
  };
  return (
    <span className="chip" style={map[tone]}>
      {children}
    </span>
  );
}

export const difficultyChip = (d: Difficulty) =>
  d === 'easy' ? '🟢 Easy' : d === 'medium' ? '🟡 Medium' : '🔴 Hard';

export const DIFF_TONE: Record<Difficulty, 'good' | 'warn' | 'bad'> = {
  easy: 'good',
  medium: 'warn',
  hard: 'bad',
};

/* --------------------------------- sheet --------------------------------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,.55)' }}
        onClick={onClose}
      />
      <div
        className="pop relative w-full max-w-[480px] rounded-t-2xl p-4"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)' }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: 'var(--line)' }} />
        {title && <h3 className="mb-3 text-base font-bold">{title}</h3>}
        {children}
        <div className="h-2" />
      </div>
    </div>
  );
}

/* ------------------------------- segmented -------------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--surface2)' }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="flex-1 rounded-lg px-2 py-2 text-[13px] font-bold transition"
          style={{
            background: value === o.value ? 'var(--surface)' : 'transparent',
            color: value === o.value ? 'var(--ink)' : 'var(--muted)',
            boxShadow: value === o.value ? '0 1px 3px rgba(0,0,0,.18)' : 'none',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- tiles --------------------------------- */

export function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="card p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
      <div className="mt-0.5 text-xl font-extrabold" style={{ color: tone ?? 'var(--ink)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-[13px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
        {children}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  hint,
  action,
}: {
  emoji: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 p-8 text-center">
      <div className="text-4xl">{emoji}</div>
      <div className="font-bold">{title}</div>
      {hint && (
        <div className="text-sm" style={{ color: 'var(--muted)' }}>
          {hint}
        </div>
      )}
      {action && <div className="mt-2 w-full">{action}</div>}
    </div>
  );
}

/* ---------------------------------- bars ---------------------------------- */

export function MiniBars({
  data,
  height = 64,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
          <div
            className="w-full rounded-t"
            style={{
              height: `${Math.max(3, (d.value / max) * (height - 16))}px`,
              background: d.value > 0 ? 'var(--brand)' : 'var(--surface2)',
              opacity: d.value > 0 ? 1 : 0.5,
            }}
          />
          <div className="text-[9px]" style={{ color: 'var(--muted)' }}>
            {d.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LineChart({
  points,
  height = 80,
}: {
  points: { x: number; y: number }[];
  height?: number;
}) {
  if (points.length < 2) return <MiniBars data={points.map((p) => ({ label: '', value: p.y }))} />;
  const w = 300;
  const max = Math.max(1, ...points.map((p) => p.y));
  const min = Math.min(...points.map((p) => p.y));
  const range = Math.max(1, max - min);
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = height - ((p.y - min) / range) * (height - 10) - 5;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" height={height} preserveAspectRatio="none">
      <path d={d} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
