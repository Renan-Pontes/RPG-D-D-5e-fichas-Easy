/**
 * Opções de um pool prontas para a UI, inclusive pools dinâmicos (magias,
 * perícias, idiomas), que o motor (options.js) só confere pelo formato.
 *
 * Filtros de pools `kind: 'spell'`:
 *   classes: ['cleric']      lista de magias (omitido = qualquer classe)
 *   level / minLevel / maxLevel   círculo exato / mínimo / máximo
 *   maxSlot: true            círculo ≤ maior espaço que a ficha conjura
 *   school: ['divination']   escolas
 *   ritual: true             só rituais
 *   castingTime: 'Action'    tempo de conjuração (começo do texto)
 *   inBook: true             só magias do grimório do mago (spellbook.js)
 * Pools `kind: 'skill'`: from: [ids], proficient: true (só perícias já proficientes).
 * Pools `kind: 'language'`: from: [ids] opcional.
 * Pools estáticos: `filter` / `filterByClass` (ver matchesOptionFilter).
 */
import SRD from '../../data/srd.js';
import { tName } from '../../data/i18n.js';
import Utils from '../../utils.js';
import { optionPool, optionCatalog, picksOf } from './options.js';
import { spellbookIds } from './spellbook.js';

const SCHOOL = s => String(s || '').toLowerCase();

function spellOptions(character, def) {
  const f = def.filter || {};
  const maxSlot = f.maxSlot ? Utils.maxSpellLevel(character) : null;
  const book = f.inBook ? new Set(spellbookIds(character)) : null;
  return Utils.spellCatalog(character).filter(s =>
    (!book || book.has(s.id)) &&
    (!f.classes || f.classes.some(c => s.classes.includes(c)))
    && (f.level == null || s.level === f.level)
    && (f.minLevel == null || s.level >= f.minLevel)
    && (f.maxLevel == null || s.level <= f.maxLevel)
    && (maxSlot == null || s.level <= maxSlot)
    && (!f.school || f.school.map(SCHOOL).includes(SCHOOL(s.school)))
    && (!f.ritual || s.ritual)
    && (!f.castingTime || String(s.castingTime || '').toLowerCase().startsWith(f.castingTime.toLowerCase())),
  ).map(s => ({ id: s.id, name: { pt: tName('spellName', s.id, 'pt'), en: tName('spellName', s.id, 'en') }, meta: s.level === 0 ? 'truque' : `${s.level}º`, desc: null }));
}

function skillOptions(character, def) {
  const f = def.filter || {};
  return SRD.SKILLS
    .filter(k => (!f.from || f.from.includes(k.id)) && (!f.proficient || Utils.hasSkillProf(character, k.id)))
    .map(k => ({ id: k.id, name: { pt: tName('skill', k.id, 'pt'), en: tName('skill', k.id, 'en') }, desc: null }));
}

function languageOptions(character, def) {
  const f = def.filter || {};
  const known = new Set(Utils.languagesFor(character));
  return Utils.LANGUAGES
    .filter(l => (!f.from || f.from.includes(l.id)) && !known.has(l.id))
    .map(l => ({ id: l.id, name: { pt: l.pt, en: l.id }, meta: l.rare ? 'raro' : '', desc: null }));
}

/**
 * Filtro de pool estático (`filter`, ou `filterByClass[classId]` em pools
 * compartilhados). Cada chave compara com o campo de mesmo nome da opção:
 *   valor simples  → igualdade (booleano ausente conta como false)
 *   array          → o campo (ou algum item dele, se for array) está na lista
 *   anyOf: [f, …]  → basta um dos subfiltros casar
 * Ex.: { melee: true }, { anyOf: [{ category: ['simple'] }, { props: ['finesse', 'light'] }] }.
 */
export function matchesOptionFilter(option, filter) {
  return Object.entries(filter || {}).every(([key, want]) => {
    if (key === 'anyOf') return want.some(f => matchesOptionFilter(option, f));
    const have = option[key];
    if (Array.isArray(want)) return Array.isArray(have) ? have.some(v => want.includes(v)) : want.includes(have);
    return typeof want === 'boolean' ? !!have === want : have === want;
  });
}

/**
 * Opções do pool com `eligible`, `issues` e `taken`. `pending` são as
 * escolhas ainda não salvas (contam para pré-requisitos e repetição).
 */
export function poolOptions(character, classId, pool, pending = [], classLevel = character.level || 1) {
  const def = optionPool(classId, pool);
  if (!def) return [];
  if (!def.kind) {
    const filter = def.filterByClass?.[classId] || def.filter;
    const list = optionCatalog(character, classId, pool, pending, classLevel);
    // Opções já escolhidas continuam visíveis mesmo fora do filtro (para poder trocá-las).
    return filter ? list.filter(o => o.taken || matchesOptionFilter(o, filter)) : list;
  }
  const list = def.kind === 'spell' ? spellOptions(character, def)
    : def.kind === 'skill' ? skillOptions(character, def)
      : languageOptions(character, def);
  const taken = [...picksOf(character, classId, pool), ...pending.filter(p => p.pool === pool)];
  return list.map(o => {
    const n = taken.filter(p => p.id === o.id).length;
    return { ...o, taken: n, eligible: n === 0, issues: [] };
  });
}

/** Nome legível de uma escolha já feita (pools estáticos ou dinâmicos). */
export function pickLabel(classId, pick, lang) {
  const def = optionPool(classId, pick.pool);
  if (!def) return pick.id;
  if (!def.kind) return def.options.find(o => o.id === pick.id)?.name[lang] || pick.id;
  if (def.kind === 'spell') return tName('spellName', pick.id, lang);
  if (def.kind === 'skill') return tName('skill', pick.id, lang);
  const l = Utils.LANGUAGES.find(x => x.id === pick.id);
  return l ? (lang === 'pt' ? l.pt : l.id) : pick.id;
}

export function pickDesc(classId, pick) {
  const def = optionPool(classId, pick.pool);
  return def && !def.kind ? def.options.find(o => o.id === pick.id)?.desc || null : null;
}
