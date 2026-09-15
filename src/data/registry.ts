/**
 * PACK REGISTRY — the seam between content and UI.
 * Installed packs live in IndexedDB; the app shows the demo pack only until
 * the first real pack is installed.
 */

import type { ContentPack } from '../types/content';
import { idb } from '../engine/idb';
import { DEMO_PACK } from './packs/demo';

export async function loadPacks(): Promise<ContentPack[]> {
  const stored = await idb.all<ContentPack>();
  const packs = stored.filter((p) => p && p.subjects);
  return packs.length ? packs : [DEMO_PACK];
}

export async function installPack(pack: ContentPack): Promise<void> {
  await idb.put(pack);
}

export async function removePack(id: string): Promise<void> {
  await idb.remove(id);
}

export const isDemo = (p: ContentPack) => p.id === DEMO_PACK.id;

export const packQuestionCount = (p: ContentPack): number =>
  p.subjects.reduce(
    (n, s) => n + s.chapters.reduce((m, c) => m + c.topics.reduce((k, t) => k + t.questions.length, 0), 0),
    0
  );

export const packTopicCount = (p: ContentPack): number =>
  p.subjects.reduce((n, s) => n + s.chapters.reduce((m, c) => m + c.topics.length, 0), 0);

export const packFlashcardCount = (p: ContentPack): number =>
  p.subjects.reduce(
    (n, s) => n + s.chapters.reduce((m, c) => m + c.topics.reduce((k, t) => k + (t.flashcards?.length ?? 0), 0), 0),
    0
  );

export const exportPack = (p: ContentPack): string => JSON.stringify(p, null, 2);
