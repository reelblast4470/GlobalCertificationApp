/**
 * INSTANT SEARCH
 * --------------
 * Tiny in-memory inverted index. No dependency, no network, sub-millisecond
 * on a phone. Prefix matching + field weighting + phrase bonus.
 */

import type { PackIndex, SearchDoc } from '../types/content';

export interface SearchHit {
  doc: SearchDoc;
  score: number;
  /** matched snippet with the query highlighted (use with <mark>) */
  snippet: string;
  parts: [string, string, string]; // before / match / after
}

const tokenize = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

let cache: { index: PackIndex; map: Map<string, Set<number>> } | null = null;

function getMap(index: PackIndex): Map<string, Set<number>> {
  if (cache && cache.index === index) return cache.map;
  const map = new Map<string, Set<number>>();
  index.docs.forEach((d, i) => {
    for (const t of tokenize(`${d.title} ${d.text}`)) {
      let set = map.get(t);
      if (!set) map.set(t, (set = new Set()));
      set.add(i);
    }
  });
  cache = { index, map };
  return map;
}

const FIELD_WEIGHT: Record<SearchDoc['type'], number> = {
  keyword: 2.4,
  topic: 2.0,
  concept: 1.6,
  question: 1.2,
  flashcard: 1.0,
};

export function search(index: PackIndex, query: string, limit = 30): SearchHit[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const map = getMap(index);
  const terms = tokenize(q);
  if (!terms.length) return [];

  const scores = new Map<number, number>();
  terms.forEach((term, ti) => {
    const weight = 1 / (ti + 1);
    for (const [token, ids] of map) {
      if (!token.startsWith(term)) continue;
      const exact = token === term ? 1.6 : 1;
      for (const id of ids) scores.set(id, (scores.get(id) ?? 0) + exact * weight);
    }
  });

  const lowerQ = q.toLowerCase();
  const hits: SearchHit[] = [];
  for (const [i, base] of scores) {
    const doc = index.docs[i];
    let score = base * FIELD_WEIGHT[doc.type];
    const haystack = `${doc.title} ${doc.text}`.toLowerCase();
    if (haystack.includes(lowerQ)) score *= 1.5; // phrase bonus
    if (doc.title.toLowerCase().startsWith(lowerQ)) score *= 1.8; // title prefix
    hits.push({ doc, score, ...snippet(`${doc.title} — ${doc.text}`, q) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

function snippet(text: string, q: string): Omit<SearchHit, 'doc' | 'score'> {
  const lower = text.toLowerCase();
  const at = lower.indexOf(q.trim().toLowerCase());
  if (at < 0) {
    const short = text.slice(0, 110);
    return { snippet: short, parts: [short, '', ''] };
  }
  const start = Math.max(0, at - 40);
  const end = Math.min(text.length, at + q.length + 70);
  const before = (start > 0 ? '…' : '') + text.slice(start, at);
  const match = text.slice(at, at + q.length);
  const after = text.slice(at + q.length, end) + (end < text.length ? '…' : '');
  return { snippet: before + match + after, parts: [before, match, after] };
}

export const TYPE_ICON: Record<SearchDoc['type'], string> = {
  topic: '📚',
  concept: '💡',
  question: '❓',
  flashcard: '🧠',
  keyword: '🔑',
};
