/**
 * Regras dos talentos do catálogo (data/feats.js) na subida de nível e na
 * criação: categorias elegíveis, pré-requisitos, repetição, aumento de
 * atributo e sub-escolhas. Espelha backend/api/progression/feats.py.
 *
 * Puro e sem Utils (utils.js importa engine.js, que importa este arquivo).
 * Checagens que dependem da ficha calculada (proficiência em armadura,
 * conjuração, espécie) entram pelo `ctx` e só a interface as usa.
 */
import { FEATS, findFeat } from '../../data/feats.js';
import { profBonus } from './rules.js';

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const featRules = (character) => (character?.rulesVersion === '2024' ? '2024' : '2014');

/** Atributo atual (base + bônus racial/antecedente). */
export const featScore = (character, k) =>
  ((character?.abilities || {})[k] || 10) + ((character?.raceBonus || {})[k] || 0);

/**
 * Categorias aceitas numa vaga de talento.
 * kind: 'asi' (nível de ASI), 'epic' (Dádiva Épica, nível 19 em 2024) ou 'origin'.
 * Em 2024 a vaga de ASI aceita "outro talento para o qual você se qualifique":
 * Gerais e de Origem (sem pré-requisito), e Estilo de Luta para quem tem a característica.
 */
export function featCategories(rules, kind, { hasFightingStyle = false } = {}) {
  if (rules !== '2024') return kind === 'origin' ? [] : ['feat'];
  if (kind === 'origin') return ['origin'];
  const cats = ['general', 'origin', ...(hasFightingStyle ? ['fightingStyle'] : [])];
  return kind === 'epic' ? ['epicBoon', ...cats] : cats;
}

/** Tem a característica Estilo de Luta (qualquer classe)? Recebe computeProgression(). */
export const progHasFightingStyle = (prog) => (prog?.fightingStyles || 0) > 0;

const featIdsOf = (character) => (character?.feats || []).map(f => f?.id).filter(Boolean);
const hasFeat = (character, id) => featIdsOf(character).some(x => x === id || findFeat(x)?.base === id);

/**
 * Pré-requisitos não atendidos: [{ key, pt, en }]. Os de `ctx` são opcionais:
 *   ctx.hasProficiency(p) → bool, ctx.canCast → bool, ctx.hasFightingStyle → bool
 * (o que não vier no ctx não é checado, exceto fightingStyle, que conta como falso).
 */
export function featPrereqIssues(character, feat, level, ctx = {}) {
  const out = [];
  const p = feat?.prereq || {};
  if (p.level && level < p.level) out.push({ key: 'level', pt: `Nível ${p.level}+`, en: `Level ${p.level}+` });
  for (const [k, v] of Object.entries(p.abilities || {})) {
    if (featScore(character, k) < v) out.push({ key: 'ability', pt: `${k.toUpperCase()} ${v}+`, en: `${k.toUpperCase()} ${v}+` });
  }
  const any = Object.entries(p.anyAbility || {});
  if (any.length && !any.some(([k, v]) => featScore(character, k) >= v)) {
    const s = any.map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' / ');
    out.push({ key: 'ability', pt: `${s}+`, en: `${s}+` });
  }
  for (const id of p.feats || []) {
    if (!hasFeat(character, id)) {
      const f = findFeat(id);
      out.push({ key: 'feats', pt: `Talento ${f?.name.pt || id}`, en: `${f?.name.en || id} feat` });
    }
  }
  if (p.feature === 'fightingStyle' && !ctx.hasFightingStyle) out.push({ key: 'feature', pt: 'Estilo de Luta', en: 'Fighting Style' });
  if (p.proficiency && ctx.hasProficiency && !ctx.hasProficiency(p.proficiency)) {
    const n = { lightArmor: ['armadura leve', 'light armor'], mediumArmor: ['armadura média', 'medium armor'], heavyArmor: ['armadura pesada', 'heavy armor'], shield: ['escudo', 'shields'], martialWeapon: ['armas marciais', 'martial weapons'] }[p.proficiency] || [p.proficiency, p.proficiency];
    out.push({ key: 'proficiency', pt: `Proficiência: ${n[0]}`, en: `Proficiency: ${n[1]}` });
  }
  if (p.spellcasting && ctx.canCast === false) out.push({ key: 'spellcasting', pt: 'Conjuração', en: 'Spellcasting' });
  if (p.species?.length && ctx.checkSpecies && !p.species.includes(character?.race)) out.push({ key: 'species', pt: 'Espécie', en: 'Species' });
  return out;
}

/** Já pegou este talento (e ele não se repete, ou repete a mesma sub-escolha)? */
export function featTakenIssue(character, feat, picks = {}) {
  const same = (character?.feats || []).filter(f => f?.id === feat.id);
  if (!same.length) return null;
  if (!feat.repeatable) return { pt: 'Talento já escolhido', en: 'Feat already taken' };
  if (feat.repeatKey && picks?.[feat.repeatKey] != null && same.some(f => f.picks?.[feat.repeatKey] === picks[feat.repeatKey])) {
    return { pt: 'Talento já escolhido com esta opção', en: 'Feat already taken with this option' };
  }
  return null;
}

/** Problemas no aumento de atributo do talento (asi = { dex: 1 }). */
export function featAsiIssues(character, feat, asi) {
  const issues = [];
  const a = asi && typeof asi === 'object' ? asi : {};
  const keys = Object.keys(a).filter(k => a[k]);
  if (!feat.asi) {
    if (keys.length) issues.push('Este talento não aumenta atributo');
    return issues;
  }
  const { choose = ABILITIES, amount = 1, split = false, max = 20 } = feat.asi;
  if (keys.some(k => !choose.includes(k))) issues.push('Atributo não permitido por este talento');
  const vals = keys.map(k => a[k]);
  if (vals.some(v => !Number.isInteger(v) || v < 0 || v > amount)) issues.push(`Cada atributo recebe até +${amount}`);
  if (!split && keys.length > 1) issues.push('Escolha um só atributo');
  const sum = vals.reduce((s, v) => s + (Number.isInteger(v) ? v : 0), 0);
  // Se todos os atributos permitidos já estão no teto, o aumento se perde.
  const room = choose.some(k => featScore(character, k) < max);
  if (sum !== amount && !(sum === 0 && !room)) issues.push(amount === 1 ? 'Escolha o atributo do +1' : `Distribua exatamente ${amount} pontos`);
  if (keys.some(k => featScore(character, k) + a[k] > max)) issues.push(`Atributo não pode passar de ${max}`);
  return issues;
}

// ---------------------------------------------------------------------------
// Sub-escolhas (feat.choices)
// ---------------------------------------------------------------------------

/** Chaves que escolhem UM valor de uma lista fixa (guardado como string). */
const SINGLE = new Set(['spellList', 'spellAbility', 'variant']);

/** Normaliza um choice: { key, single, options?, count, spec }. null = nada a escolher. */
export function featChoiceSpecs(feat, level = 1) {
  const out = [];
  for (const [key, spec] of Object.entries(feat?.choices || {})) {
    if (key === 'spellAbility' && spec === 'asi') continue; // é o atributo aumentado
    if (Array.isArray(spec)) {
      const options = spec.map(o => (typeof o === 'string' ? o : o.id));
      out.push({ key, single: true, options, count: 1, spec });
      continue;
    }
    if (SINGLE.has(key)) continue;
    const raw = typeof spec === 'number' ? spec : spec?.count;
    const count = raw === 'pb' ? profBonus(level) : (Number.isInteger(raw) ? raw : 1);
    out.push({ key, single: false, options: Array.isArray(spec?.from) ? spec.from : null, count, spec: typeof spec === 'object' ? spec : {} });
  }
  return out;
}

/** Problemas nas sub-escolhas (picks = { spellList: 'cleric', cantrip: ['light', …] }). */
export function featPicksIssues(feat, picks, level = 1) {
  const issues = [];
  const p = picks && typeof picks === 'object' ? picks : {};
  for (const c of featChoiceSpecs(feat, level)) {
    const v = p[c.key];
    if (c.single) {
      if (typeof v !== 'string' || !c.options.includes(v)) issues.push(`Escolha: ${c.key}`);
      continue;
    }
    const arr = Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()) : [];
    if (arr.length !== c.count) issues.push(`Escolha ${c.count} em ${c.key}`);
    else if (new Set(arr).size !== arr.length) issues.push(`Repetido em ${c.key}`);
    else if (c.options && arr.some(x => !c.options.includes(x))) issues.push(`Opção inválida em ${c.key}`);
  }
  return issues;
}

/**
 * Valida a escolha de um talento do catálogo numa vaga.
 * choice = { type: 'feat', feat, featId, asi, picks }
 * opts: { kind: 'asi'|'epic'|'origin', hasFightingStyle, ctx?, cheat? (ignora pré-requisitos) }
 */
export function validateFeatChoice(character, level, choice, { kind = 'asi', hasFightingStyle = false, ctx = {}, cheat = false } = {}) {
  const issues = [];
  const rules = featRules(character);
  const feat = findFeat(choice?.featId);
  if (!feat) return ['Talento desconhecido'];
  if (feat.rules !== rules) issues.push('Talento de outra versão das regras');
  if (!featCategories(rules, kind, { hasFightingStyle }).includes(feat.category)) issues.push('Talento não permitido nesta vaga');
  const pre = featPrereqIssues(character, feat, level, { ...ctx, hasFightingStyle });
  if (pre.length && !cheat) issues.push(`Pré-requisito: ${pre.map(x => x.pt).join(', ')}`);
  const taken = featTakenIssue(character, feat, choice.picks);
  if (taken) issues.push(taken.pt);
  issues.push(...featAsiIssues(character, feat, choice.asi));
  issues.push(...featPicksIssues(feat, choice.picks, level));
  return issues;
}

/** Registro em character.feats de um talento escolhido. */
export function featEntry(choice, level, extra = {}) {
  const feat = choice.featId ? findFeat(choice.featId) : null;
  return {
    name: (choice.feat || feat?.name.en || '').trim(),
    ...(feat ? { id: feat.id } : {}),
    level,
    note: choice.note || '',
    ...(choice.picks && Object.keys(choice.picks).length ? { picks: choice.picks } : {}),
    ...(choice.asi && Object.keys(choice.asi).length ? { asi: choice.asi } : {}),
    ...extra,
  };
}

/** Soma (sign 1) ou tira (sign -1) o aumento do talento nos atributos-base. */
export function withFeatAsi(character, asi, sign = 1) {
  const entries = Object.entries(asi || {}).filter(([k, v]) => ABILITIES.includes(k) && Number.isInteger(v) && v);
  if (!entries.length) return character;
  const abilities = { ...(character.abilities || {}) };
  for (const [k, v] of entries) abilities[k] = (abilities[k] || 10) + sign * v;
  return { ...character, abilities };
}

/**
 * Talento de origem do antecedente 2024 ('Magic Initiate (Cleric)' → magicInitiate
 * com spellList 'cleric'). Devolve { feat, picks } ou null.
 */
const LIST_BY_NAME = { cleric: 'cleric', druid: 'druid', wizard: 'wizard' };
export function originFeatFromText(text) {
  if (typeof text !== 'string') return null;
  const m = /^(.*?)\s*(?:\(([^)]+)\))?$/.exec(text.trim());
  const name = (m?.[1] || '').toLowerCase();
  const feat = FEATS.find(f => f.rules === '2024' && f.category === 'origin' && f.name.en.toLowerCase() === name);
  if (!feat) return null;
  const list = LIST_BY_NAME[(m?.[2] || '').toLowerCase()];
  return { feat, picks: list ? { spellList: list } : {} };
}

/**
 * O que os talentos da ficha concedem (fixo + sub-escolhas registradas):
 * { spells, cantrips, skills, expertise, languages, tools, saves }.
 * Perícia/ferramenta são distinguidas pelo catálogo de perícias.
 */
export function featGrants(character, skillIds = []) {
  const g = { spells: [], cantrips: [], skills: [], expertise: [], languages: [], tools: [], saves: [] };
  const isSkill = (id) => skillIds.includes(id);
  const list = (v) => (Array.isArray(v) ? v : v != null && v !== '' ? [v] : []);
  for (const entry of character?.feats || []) {
    const feat = entry?.id ? findFeat(entry.id) : null;
    if (!feat) continue;
    const fixed = feat.grants || {};
    for (const k of ['spells', 'cantrips', 'skills', 'expertise', 'languages', 'tools']) g[k].push(...list(fixed[k]));
    if (fixed.savingThrow === 'asi') g.saves.push(...Object.keys(entry.asi || {}).filter(k => entry.asi[k] > 0));
    const p = entry.picks || {};
    g.skills.push(...list(p.skill));
    g.expertise.push(...list(p.expertise));
    g.languages.push(...list(p.language));
    g.tools.push(...list(p.tool), ...list(p.instrument));
    for (const id of list(p.skillOrTool)) (isSkill(id) ? g.skills : g.tools).push(id);
    for (const id of list(p.skillProfOrExpertise)) g.skills.push(id); // a ficha promove a expertise se já era proficiente
    g.cantrips.push(...list(p.cantrip));
    g.spells.push(...list(p.spell));
  }
  return g;
}
