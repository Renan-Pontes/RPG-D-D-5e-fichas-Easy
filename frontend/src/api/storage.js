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

const STORAGE_KEY = 'dnd5e-forge:characters:v1';

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(chars) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
}

export function createStorageAdapter({ remote }) {
  if (!remote) {
    return {
      mode: 'local',
      async list() { return loadLocal(); },
      async get(id) { return loadLocal().find(c => c.id === id) || null; },
      async save(char) {
        const all = loadLocal();
        const idx = all.findIndex(c => c.id === char.id);
        const next = { ...char, updatedAt: Date.now() };
        if (idx >= 0) all[idx] = next;
        else all.push(next);
        saveLocal(all);
        return next;
      },
      async remove(id) {
        saveLocal(loadLocal().filter(c => c.id !== id));
      },
      async replaceAll(chars) { saveLocal(chars); },
    };
  }

  return {
    mode: 'remote',
    async list() {
      const res = await api.listCharacters();
      // O backend retorna { id, name, data, inCampaign, ... } — promove data
      return res.characters.map(c => ({ ...c.data, id: c.id, name: c.name, updatedAt: c.updatedAt, createdAt: c.createdAt, inCampaign: c.inCampaign }));
    },
    async get(id) {
      try {
        const res = await api.getCharacter(id);
        const c = res.character;
        return { ...c.data, id: c.id, name: c.name, updatedAt: c.updatedAt, createdAt: c.createdAt, inCampaign: c.inCampaign };
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    async save(char) {
      const { id, createdAt, updatedAt, inCampaign, ...data } = char;
      const body = { name: char.name || 'Sem nome', data };
      let res;
      if (id && !id.startsWith('local-')) {
        res = await api.updateCharacter(id, body);
      } else {
        res = await api.createCharacter(body);
      }
      const c = res.character;
      return { ...c.data, id: c.id, name: c.name, updatedAt: c.updatedAt, createdAt: c.createdAt, inCampaign: c.inCampaign };
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
  for (const c of local) {
    try {
      const { id, createdAt, updatedAt, ...data } = c;
      await api.createCharacter({ name: c.name || 'Sem nome', data });
      migrated++;
    } catch (e) {
      console.warn('falha ao migrar personagem', c.name, e);
    }
  }
  // limpa local após migração bem-sucedida (parcial é ok)
  if (migrated > 0) localStorage.removeItem(STORAGE_KEY);
  return { migrated };
}
