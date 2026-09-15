/**
 * Minimal IndexedDB wrapper — used for CONTENT PACKS, which can be large
 * (an entire book's worth of notes). User progress stays in localStorage
 * because it is small and read on every render.
 */

const DB_NAME = 'exam-coach';
const DB_VERSION = 1;
const STORE = 'packs';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      })
  );
}

export const idb = {
  async all<T>(): Promise<T[]> {
    try {
      return await tx<T[]>('readonly', (s) => s.getAll() as IDBRequest);
    } catch {
      return [];
    }
  },
  async put<T>(value: T): Promise<void> {
    try {
      await tx('readwrite', (s) => s.put(value as unknown as object) as IDBRequest);
    } catch {
      /* fall back to nothing — pack stays in memory for this session */
    }
  },
  async remove(id: string): Promise<void> {
    try {
      await tx('readwrite', (s) => s.delete(id) as IDBRequest);
    } catch {
      /* ignore */
    }
  },
};
