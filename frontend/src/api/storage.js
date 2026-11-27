/**
 * Adapter de storage para personagens.
 *
 * Mantém compatibilidade com o uso offline (localStorage) do app antigo,
 * mas quando o usuário está logado, sincroniza com o backend.
 *
 * Modo `local` é o default — não quebra ninguém que abrir o site sem conta.
 * Quando autentica, troca-se para `remote` e a lista vem do servidor.
 */

import { api, ApiError } from './client.js';
import { migrateSpellAliases } from './char-card-summary.js';
import { idbGetAll, idbPut, idbDelete, idbReplaceStore, migrateCharactersFromLocalStorage } from './idb-store.js';

let Utils = null;
async function loadUtils() {
  if (!Utils) {
    const utils = await import('../../utils.js');
    Utils = utils.default;
  }
}

/**
 * Campos da ficha que vêm do servidor fora de `data`. O CharacterSerializer
 * manda as datas em snake_case (created_at/updated_at); o app usa camelCase
 * (a ordem "Recentes"/"Criação" da tela inicial depende delas).
 */
export function remoteMeta(c) {
  return {
    updatedAt: c.updatedAt ?? c.updated_at,
    createdAt: c.createdAt ?? c.created_at,
    inCampaign: c.inCampaign,
    campaignLeveling: c.campaignLeveling ?? null,
  };
}

function migrate(char) {
  return migrateSpellAliases(char);
}

const STORAGE_KEY = 'dnd5e-forge:characters:v1';

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const chars = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(chars)) throw new Error('invalid_local_backup');
  return chars;
}

function saveLocal(chars) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
  } catch { /* localStorage quota fallback relies on IndexedDB */ }
}

export function createStorageAdapter({ remote }) {
  if (!remote) {
    return {
      mode: 'local',
      async list() {
        await migrateCharactersFromLocalStorage(STORAGE_KEY);
        const idbChars = await idbGetAll('characters');
        if (idbChars.length) return idbChars.map(migrate);
        return loadLocal().map(migrate);
      },
      async get(id) {
        const fromIdb = await idbGetAll('characters');
        if (fromIdb.length) return migrate(fromIdb.find(c => c.id === id) || null);
        return migrate(loadLocal().find(c => c.id === id) || null);
      },
      async save(char) {
        const all = (await idbGetAll('characters')).length ? await idbGetAll('characters') : loadLocal();
        const next = { ...char, id: char.id || `local-${crypto.randomUUID()}`, updatedAt: Date.now() };
        const idx = all.findIndex(c => c.id === next.id);
        if (idx >= 0) all[idx] = next;
        else all.push(next);
        await idbPut('characters', next);
        saveLocal(all);
        return next;
      },
      async remove(id) {
        await idbDelete('characters', id);
        saveLocal(loadLocal().filter(c => c.id !== id));
      },
      async replaceAll(chars) {
        await idbReplaceStore('characters', chars.filter(c => c && c.id != null));
        saveLocal(chars);
      },
    };
  }

  return {
    mode: 'remote',
    async list() {
      const res = await api.listCharacters();
      return res.characters.map(c => migrate({ ...c.data, id: c.id, name: c.name, ...remoteMeta(c) }));
    },
    async get(id) {
      try {
        const res = await api.getCharacter(id);
        const c = res.character;
        return migrate({ ...c.data, id: c.id, name: c.name, ...remoteMeta(c) });
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    async save(char) {
      const { id, createdAt, updatedAt, inCampaign, campaignLeveling, ...data } = char;
      if (char.className) {
        await loadUtils();
        Object.assign(data, Utils.serverNumbers(char));
      }
      const body = { name: char.name || 'Sem nome', data };
      let res;
      // Server IDs are integers. Older local sheets used unprefixed random IDs.
      if (id != null && /^\d+$/.test(String(id))) {
        res = await api.updateCharacter(id, body);
      } else {
        res = await api.createCharacter(body);
      }
      const c = res.character;
      return { ...c.data, id: c.id, name: c.name, ...remoteMeta(c) };
    },
    async remove(id) {
      await api.deleteCharacter(id);
    },
    async replaceAll(chars) {
      // sync incremental: cria/sobre cada
      for (const c of chars) {
        await this.save(c);
      }
    },
  };
}

// Migra personagens locais para remoto após login.
export async function migrateLocalToRemote(remoteAdapter) {
  const local = loadLocal();
  if (!local.length) return { migrated: 0 };
  let migrated = 0;
  // Keep a recovery copy even after a successful migration.
  localStorage.setItem(`${STORAGE_KEY}:migration-backup`, JSON.stringify(local));
  const remaining = [...local];
  for (const c of local) {
    try {
      const { id, createdAt, updatedAt, ...data } = c;
      await remoteAdapter.save({ ...data, id: undefined });
      remaining.splice(remaining.indexOf(c), 1);
      saveLocal(remaining);
      migrated++;
    } catch (e) {
      console.warn('falha ao migrar personagem', c.name, e);
    }
  }
  return { migrated, failed: remaining.length };
}
