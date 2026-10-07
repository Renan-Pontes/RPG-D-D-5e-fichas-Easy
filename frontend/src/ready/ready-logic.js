/* Aventuras prontas da Forja — chamadas e regras puras (testadas em tests/ready.test.js). */
import { request } from '../api/client.js';

const cid = (c) => encodeURIComponent(c);
const L = (lang) => (lang === 'en' ? 'en' : 'pt');

export const readyApi = {
  /** Catálogo da galeria (sem spoilers). → { adventures: [...] } */
  catalog: (lang) => request(`/api/ready-adventures?lang=${L(lang)}`),
  /** Catálogo + situação nesta campanha ({imported, adventureId}). Só mestre. */
  status: (campaignId, lang) => request(`/api/campaigns/${cid(campaignId)}/ready-adventure?lang=${L(lang)}`),
  /** Importa. → { adventureId, entryIds, sessionPlanFilled, name } (409 already_imported) */
  importInto: (campaignId, id, lang) => request(`/api/campaigns/${cid(campaignId)}/ready-adventure`, { method: 'POST', body: { id, lang: L(lang) } }),
};

/** "Níveis 1–2" / "Nível 3" / "Levels 2–3". */
export function levelLabel(levels, lang = 'pt') {
  const s = String(levels || '').trim();
  if (!s) return '';
  const many = /[–-]/.test(s);
  if (lang === 'en') return `${many ? 'Levels' : 'Level'} ${s}`;
  return `${many ? 'Níveis' : 'Nível'} ${s}`;
}

/** "8 cenas · 19 cartões do Mundo · 1–2 sessões". */
export function metaLine(adv, lang = 'pt') {
  if (!adv) return '';
  const n = (v, one, many) => `${v} ${v === 1 ? one : many}`;
  const parts = lang === 'en'
    ? [n(adv.scenes, 'scene', 'scenes'), n(adv.cards, 'World card', 'World cards'), adv.sessions && `${adv.sessions} ${adv.sessions === '1' ? 'session' : 'sessions'}`]
    : [n(adv.scenes, 'cena', 'cenas'), n(adv.cards, 'cartão do Mundo', 'cartões do Mundo'), adv.sessions && `${adv.sessions} ${adv.sessions === '1' ? 'sessão' : 'sessões'}`];
  return parts.filter(Boolean).join(' · ');
}

const ERRORS = {
  already_imported: { pt: 'Esta aventura já está na campanha.', en: 'This adventure is already in the campaign.' },
  world_full: { pt: 'O Mundo desta campanha está cheio demais para receber a aventura.', en: "This campaign's World is too full to take the adventure." },
  too_many_adventures: { pt: 'A campanha chegou ao limite de aventuras.', en: 'The campaign has reached its adventure limit.' },
  unknown_adventure: { pt: 'Aventura não encontrada.', en: 'Adventure not found.' },
};

/** Mensagem para o código de erro do servidor (ou null para usar a genérica). */
export function readyErrorText(code, lang = 'pt') {
  const e = ERRORS[code];
  return e ? e[L(lang)] : null;
}

/** Aviso depois de importar (linguagem de mesa, sem festa). */
export function importedNote(result, lang = 'pt') {
  if (!result) return '';
  const name = result.name || '';
  if (lang === 'en') {
    return `“${name}” is in Prepare › Adventures, as a Draft. Its World cards are hidden until you reveal them.`
      + (result.sessionPlanFilled ? ' The next session plan already has the strong start, scenes and clues.' : '');
  }
  return `“${name}” está em Preparar › Aventuras, como Rascunho. Os cartões do Mundo ficam ocultos até você revelar.`
    + (result.sessionPlanFilled ? ' O plano da próxima sessão já tem o começo forte, as cenas e as pistas.' : '');
}
