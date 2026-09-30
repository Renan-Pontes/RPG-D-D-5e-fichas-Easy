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

// SRD e Utils são pesados (~2MB): carregados sob demanda para não entrarem no
// bundle inicial (tela de login e telão /tv/ não precisam deles).
let SRD = null;
let Utils = null;
async function loadDeps() {
  if (!SRD || !Utils) {
    const [srd, utils] = await Promise.all([import('../../data/srd.js'), import('../../utils.js')]);
    SRD = srd.default;
    Utils = utils.default;
  }
}

// Ids de magia renomeados: fichas antigas são corrigidas ao carregar.
// (Chamado só depois de loadDeps().)
function migrate(char) {
  if (!char || !Array.isArray(char.spells)) return char;
  const alias = SRD?.SPELL_ID_ALIASES || {};
  if (!char.spells.some(s => alias[typeof s === 'string' ? s : s?.id])) return char;
  const spells = char.spells.map(s => (typeof s === 'string' ? (alias[s] || s) : alias[s?.id] ? { ...s, id: alias[s.id] } : s));
  return { ...char, spells };
}

const STORAGE_KEY = 'dnd5e-forge:characters:v1';

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const chars = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(chars)) throw new Error('invalid_local_backup');
  return chars;
}

function saveLocal(chars) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
}

export function createStorageAdapter({ remote }) {
  if (!remote) {
    return {
      mode: 'local',
      async list() { await loadDeps(); return loadLocal().map(migrate); },
      async get(id) { await loadDeps(); return migrate(loadLocal().find(c => c.id === id) || null); },
      async save(char) {
        const all = loadLocal();
        const next = { ...char, id: char.id || `local-${crypto.randomUUID()}`, updatedAt: Date.now() };
        const idx = all.findIndex(c => c.id === next.id);
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
      const [res] = await Promise.all([api.listCharacters(), loadDeps()]);
      // O backend retorna { id, name, data, inCampaign, ... } — promove data
      return res.characters.map(c => migrate({ ...c.data, id: c.id, name: c.name, updatedAt: c.updatedAt, createdAt: c.createdAt, inCampaign: c.inCampaign, campaignLeveling: c.campaignLeveling ?? null }));
    },
    async get(id) {
      try {
        const [res] = await Promise.all([api.getCharacter(id), loadDeps()]);
        const c = res.character;
        return migrate({ ...c.data, id: c.id, name: c.name, updatedAt: c.updatedAt, createdAt: c.createdAt, inCampaign: c.inCampaign, campaignLeveling: c.campaignLeveling ?? null });
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    async save(char) {
      const { id, createdAt, updatedAt, inCampaign, campaignLeveling, ...data } = char;
      // CA calculada (armadura, escudo, estilos de luta…) para o combate no servidor.
      if (char.className) {
        await loadDeps();
        try { data.armorClass = Utils.computeAc(char); } catch { /* ficha incompleta */ }
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
      return { ...c.data, id: c.id, name: c.name, updatedAt: c.updatedAt, createdAt: c.createdAt, inCampaign: c.inCampaign, campaignLeveling: c.campaignLeveling ?? null };
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
