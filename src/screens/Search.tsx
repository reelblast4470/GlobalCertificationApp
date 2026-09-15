import React from 'react';
import { useApp } from '../state/AppContext';
import { Screen } from '../components/Layout';
import { Chip, EmptyState } from '../components/ui/primitives';
import { TYPE_ICON, search } from '../engine/search';
import type { SearchDoc } from '../types/content';

const RECENT_KEY = 'examcoach.recent-searches';

export default function Search({ navigate }: { navigate: (to: string) => void }) {
  const app = useApp();
  const [q, setQ] = React.useState('');
  const [recent, setRecent] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    } catch {
      return [];
    }
  });
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const hits = React.useMemo(() => (q.trim().length >= 2 ? search(app.index, q, 40) : []), [q, app.index]);

  const remember = (term: string) => {
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, 8);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const open = (doc: SearchDoc) => {
    remember(q.trim() || doc.title);
    if (doc.type === 'question' && doc.topicId) {
      navigate(`/practice?topic=${doc.topicId}`);
    } else if (doc.topicId) {
      navigate(`/learn?topic=${doc.topicId}`);
    }
  };

  const grouped = React.useMemo(() => {
    const map = new Map<SearchDoc['type'], typeof hits>();
    for (const h of hits) {
      const arr = map.get(h.doc.type) ?? [];
      arr.push(h);
      map.set(h.doc.type, arr);
    }
    return [...map.entries()];
  }, [hits]);

  return (
    <Screen title="Search" subtitle="Topics, concepts, questions, keywords">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search your notes…"
        inputMode="search"
        autoComplete="off"
      />

      {q.trim().length < 2 ? (
        <>
          {recent.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Recent
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((r) => (
                  <button key={r} className="chip" onClick={() => setQ(r)}>
                    🕘 {r}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3">
            <div className="mb-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
              Try searching for
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...app.index.topics.values()].slice(0, 8).map((t) => (
                <button key={t.topicId} className="chip" onClick={() => setQ(t.topic.title)}>
                  📚 {t.topic.title}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <Chip>🔑 {app.index.docs.filter((d) => d.type === 'keyword').length} keywords indexed</Chip>
          </div>
        </>
      ) : hits.length === 0 ? (
        <div className="mt-3">
          <EmptyState emoji="🔍" title="No matches" hint={`Nothing in your notes matches "${q}".`} />
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {grouped.map(([type, list]) => (
            <div key={type}>
              <div className="mb-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                {TYPE_ICON[type]} {type}s ({list.length})
              </div>
              <div className="card divide-y" style={{ borderColor: 'var(--line)' }}>
                {list.slice(0, 12).map((h) => (
                  <button key={h.doc.id} onClick={() => open(h.doc)} className="w-full p-3 text-left">
                    <div className="text-[14px] font-semibold leading-snug">
                      {h.parts[0]}
                      <mark>{h.parts[1]}</mark>
                      {h.parts[2]}
                    </div>
                    <div className="mt-0.5 text-[11px]" style={{ color: 'var(--muted)' }}>
                      {h.doc.type === 'question' ? 'Tap to practise this topic' : 'Tap to open the topic'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="h-8" />
    </Screen>
  );
}
