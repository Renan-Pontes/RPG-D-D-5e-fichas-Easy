import { openDB } from 'idb';

const DB_NAME = 'forja-de-herois';
const DB_VER = 1;
const STORES = ['characters', 'versions', 'assets', 'outbox'];

let dbPromise = null;

function hasIdb() {
  return typeof indexedDB !== 'undefined';
}

export function getIdb() {
  if (!hasIdb()) return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VER, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('characters')) db.createObjectStore('characters', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('versions')) db.createObjectStore('versions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', { keyPath: 'key' });
        if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'opId' });
      },
    }).catch(() => {
      dbPromise = null;
      return null;
    });
  }
  return dbPromise;
}

export async function idbGetAll(store) {
  const db = await getIdb();
  if (!db || !STORES.includes(store)) return [];
  return db.getAll(store);
}

export async function idbGet(store, key) {
  const db = await getIdb();
  if (!db || !STORES.includes(store)) return null;
  return (await db.get(store, key)) ?? null;
}

export async function idbPut(store, value) {
  const db = await getIdb();
  if (!db || !STORES.includes(store)) return false;
  await db.put(store, value);
  return true;
}

export async function idbDelete(store, key) {
  const db = await getIdb();
  if (!db || !STORES.includes(store)) return false;
  await db.delete(store, key);
  return true;
}

export async function idbReplaceStore(store, items) {
  const db = await getIdb();
  if (!db || !STORES.includes(store)) return false;
  const tx = db.transaction(store, 'readwrite');
  await tx.store.clear();
  for (const item of items) await tx.store.put(item);
  await tx.done;
  return true;
}

const MIGRATED_FLAG = 'dnd5e-forge:idb-migrated:v1';

export async function migrateCharactersFromLocalStorage(storageKey = 'dnd5e-forge:characters:v1') {
  if (!hasIdb() || typeof localStorage === 'undefined') return [];
  try {
    if (localStorage.getItem(MIGRATED_FLAG) === '1') return idbGetAll('characters');
    const raw = localStorage.getItem(storageKey);
    const list = raw ? JSON.parse(raw) : [];
    if (Array.isArray(list) && list.length) {
      await idbReplaceStore('characters', list.filter(c => c && c.id != null));
    }
    localStorage.setItem(MIGRATED_FLAG, '1');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
