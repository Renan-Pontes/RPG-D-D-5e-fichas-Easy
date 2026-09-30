/**
 * Opções selecionáveis de classe (invocações, metamagia, manobras, estilos…).
 *
 * Dados em frontend/data/class-options/ (formato no README de lá). A ficha
 * guarda as escolhas em `character.classOptions`:
 *   [{ classId, pool, id, level, detail? }]
 * onde `level` é o nível TOTAL em que a escolha entrou (para desfazer a subida).
 *
 * Tudo aqui é puro e trabalha sobre UMA classe por vez (a ficha "vista" como
 * classe única — ver classView em multiclass.js); a multiclasse junta os
 * resultados em engine.js. Espelhado em backend/api/progression/options.py.
 */
import { CLASS_OPTIONS } from '../../data/class-options/index.js';
import * as MC from './multiclass.js';

/** Dados de opções da classe, ou null. */
export const classOptionsData = (classId) => CLASS_OPTIONS[classId] || null;

/** Tabela de ganhos por nível para a versão de regras da ficha. */
function choiceTable(character, data) {
  const table = character.rulesVersion === '2024' ? data.choices : (data.legacyChoices || null);
  return table || {};
}

export const optionPool = (classId, pool) => classOptionsData(classId)?.pools?.[pool] || null;

/**
 * Pools dinâmicos (`kind`: 'spell' | 'skill' | 'language') tiram as opções de
 * catálogos (magias, perícias, idiomas); a filtragem fina (lista de classe,
 * nível, proficiência) é feita na UI (options-catalog.js). Aqui só se confere
 * o formato do id — como o backend já faz com magias.
 */
export const isDynamicPool = (def) => !!def?.kind;
export function findOption(classId, pool, id) {
  const def = optionPool(classId, pool);
  if (!def || typeof id !== 'string' || !id || id.length > 80) return null;
  if (isDynamicPool(def)) {
    if (def.filter?.from && !def.filter.from.includes(id)) return null;
    return { id, name: { pt: id, en: id }, dynamic: def.kind, repeatable: false };
  }
  return def.options.find(o => o.id === id) || null;
}

/**
 * Migra escolhas salvas em formatos antigos. Hoje: Kensei nível 3 passou de
 * 2 × `kenseiWeapon` para 1 `kenseiWeaponMelee` + 1 `kenseiWeaponRanged`; as
 * armas que sobram no pool genérico vão para os novos (corpo a corpo primeiro).
 * Espelhado em backend/api/progression/options.py (migrate_class_options).
 */
export function migrateClassOptions(character) {
  const all = Array.isArray(character.classOptions) ? character.classOptions : [];
  const kensei = all.filter(p => p && p.classId === 'monk' && p.pool === 'kenseiWeapon');
  if (!kensei.length) return character;
  const view = { ...character, classOptions: all.filter(p => !(p && p.classId === 'monk' && p.pool === 'kenseiWeapon')) };
  const monkLevel = MC.classLevel(character, 'monk');
  const slots = optionSlots({ ...character, classOptions: all }, 'monk', monkLevel);
  const room = slots.kenseiWeapon?.total || 0;
  if (kensei.length <= room) return character;
  const free = pool => (slots[pool]?.total || 0) - picksOf(view, 'monk', pool).length;
  const openMelee = free('kenseiWeaponMelee');
  const openRanged = free('kenseiWeaponRanged');
  // As mais antigas são as do nível 3.
  const excess = [...kensei].sort((a, b) => (a.level || 0) - (b.level || 0)).slice(0, kensei.length - room);
  const moved = new Map();
  let melee = openMelee; let ranged = openRanged;
  for (const p of excess) {
    const isMelee = findOption('monk', 'kenseiWeapon', p.id)?.melee !== false;
    if (isMelee && melee > 0) { moved.set(p, 'kenseiWeaponMelee'); melee--; }
    else if (!isMelee && ranged > 0) { moved.set(p, 'kenseiWeaponRanged'); ranged--; }
  }
  // Duas do mesmo tipo: a segunda ocupa a vaga que sobrou (o jogador pode trocar depois).
  for (const p of excess) {
    if (moved.has(p)) continue;
    if (melee > 0) { moved.set(p, 'kenseiWeaponMelee'); melee--; }
    else if (ranged > 0) { moved.set(p, 'kenseiWeaponRanged'); ranged--; }
  }
  if (!moved.size) return character;
  return { ...character, classOptions: all.map(p => (moved.has(p) ? { ...p, pool: moved.get(p) } : p)) };
}

/** Escolhas já registradas na ficha para uma classe (e pool, se informado). */
export function picksOf(character, classId, pool = null) {
  return (Array.isArray(character.classOptions) ? character.classOptions : [])
    .filter(p => p && p.classId === classId && (!pool || p.pool === pool));
}

/**
 * Quantas opções a classe concede até o nível dela, por pool.
 * Retorna { [pool]: { total, gains: [{ level, count }] } } (level = nível na classe).
 */
export function optionSlots(character, classId = character.className, classLevel = character.level || 1) {
  const data = classOptionsData(classId);
  if (!data) return {};
  const out = {};
  const add = (pool, level, count) => {
    if (!count) return;
    const slot = out[pool] ||= { total: 0, gains: [] };
    slot.total += count;
    slot.gains.push({ level, count });
  };
  const table = choiceTable(character, data);
  const subChoices = character.rulesVersion === '2024' ? data.subclassChoices : data.legacySubclassChoices;
  const subTable = character.subclass ? subChoices?.[character.subclass] : null;
  // Entrou na classe por multiclasse: pools `startingClassOnly` não dão vagas.
  const multiclassed = !!character.startingClass && character.startingClass !== classId;
  for (let lv = 1; lv <= classLevel; lv++) {
    for (const [pool, n] of Object.entries(table[lv] || {})) {
      if (!(multiclassed && data.pools?.[pool]?.startingClassOnly)) add(pool, lv, n);
    }
    for (const [pool, n] of Object.entries(subTable?.[lv] || {})) add(pool, lv, n);
  }
  // Opções que abrem vagas em outro pool (ex.: Guerreiro Abençoado → 2 truques de clérigo).
  for (const p of picksOf(character, classId)) {
    const option = findOption(classId, p.pool, p.id);
    for (const [pool, n] of Object.entries(option?.choices || {})) add(pool, classLevel, n);
  }
  return out;
}

/**
 * Pré-requisitos de uma opção para a ficha vista como `classId` no nível `classLevel`.
 * `picks` são as escolhas já feitas (incluindo as que estão sendo feitas agora).
 * Retorna { ok, issues: [{pt, en}] } — `prereq.text` não é verificável e só aparece na UI.
 */
export function checkPrereq(character, classId, option, picks, classLevel = character.level || 1) {
  const issues = [];
  const req = option.prereq || {};
  const have = new Set(picks.map(p => p.id));
  const rules = character.rulesVersion === '2024' ? '2024' : '2014';
  if (option.rules && option.rules !== rules) issues.push({ pt: `Só nas regras de ${option.rules}`, en: `${option.rules} rules only` });
  if (req.level && classLevel < req.level) issues.push({ pt: `Nível ${req.level}+`, en: `Level ${req.level}+` });
  for (const id of req.options || []) {
    if (!have.has(id)) issues.push({ pt: `Requer ${nameOf(classId, id, 'pt')}`, en: `Requires ${nameOf(classId, id, 'en')}` });
  }
  if (req.anyOption?.length && !req.anyOption.some(id => have.has(id))) {
    issues.push({ pt: `Requer ${req.anyOption.map(id => nameOf(classId, id, 'pt')).join(' ou ')}`, en: `Requires ${req.anyOption.map(id => nameOf(classId, id, 'en')).join(' or ')}` });
  }
  if (req.subclass?.length && !req.subclass.includes(character.subclass)) issues.push({ pt: 'Subclasse específica', en: 'Specific subclass' });
  // Estilos de luta 2014: cada estilo só existe na lista de certas classes.
  if (rules === '2014' && option.classes2014 && !option.classes2014.includes(classId)) issues.push({ pt: 'Fora da lista desta classe (2014)', en: "Not on this class's list (2014)" });
  return { ok: issues.length === 0, issues };
}

function nameOf(classId, id, lang) {
  for (const pool of Object.values(classOptionsData(classId)?.pools || {})) {
    const o = (pool.options || []).find(x => x.id === id);
    if (o) return o.name[lang];
  }
  return id;
}

/**
 * Catálogo de um pool anotado para a UI: cada opção com `eligible`, `issues`
 * e `taken` (quantas vezes já foi escolhida).
 */
export function optionCatalog(character, classId, pool, extraPicks = [], classLevel = character.level || 1) {
  const def = optionPool(classId, pool);
  if (!def || !def.options) return [];
  const picks = [...picksOf(character, classId), ...extraPicks];
  const rules = character.rulesVersion === '2024' ? '2024' : '2014';
  // Opções de outra versão das regras nem aparecem.
  return def.options.filter(o => !o.rules || o.rules === rules).map(option => {
    const taken = picks.filter(p => p.pool === pool && p.id === option.id).length;
    const check = checkPrereq(character, classId, option, picks, classLevel);
    const eligible = check.ok && (taken === 0 || !!option.repeatable);
    return { ...option, taken, eligible, issues: check.issues };
  });
}

/**
 * Estado das opções de UMA classe: escolhas com dados, pendências e concessões.
 * `character` é a ficha vista como essa classe (className/level/subclass dela).
 */
export function classOptionState(character) {
  character = migrateClassOptions(character);
  const classId = character.className;
  const data = classOptionsData(classId);
  const empty = { picks: [], pending: [], grants: { spells: [], cantrips: [] }, slots: {} };
  if (!data) return empty;
  const slots = optionSlots(character);
  const picks = picksOf(character, classId).map(p => ({ ...p, option: findOption(classId, p.pool, p.id) }))
    .filter(p => p.option);
  const pending = [];
  for (const [pool, slot] of Object.entries(slots)) {
    const chosen = picks.filter(p => p.pool === pool).length;
    if (chosen >= slot.total) continue;
    // Nível (da classe) em que surgiu a primeira vaga ainda não preenchida.
    let acc = 0;
    const firstOpen = slot.gains.find(g => (acc += g.count) > chosen)?.level || slot.gains[0].level;
    const def = data.pools[pool];
    pending.push({
      level: firstOpen, type: 'classOption', classId, pool, missing: slot.total - chosen,
      reason: `Escolha ${slot.total - chosen}: ${def?.name.pt || pool}`,
      reasonEn: `Choose ${slot.total - chosen}: ${def?.name.en || pool}`,
    });
  }
  return { picks, pending, grants: optionGrants(data, picks), slots };
}

// Magias/truques entram como autos; o resto é lido pela ficha (utils.js).
const GRANT_KEYS = ['spells', 'cantrips', 'spellbook', 'skills', 'expertise', 'languages', 'tools', 'weapons', 'armor', 'saves'];
const emptyGrants = () => Object.fromEntries(GRANT_KEYS.map(k => [k, []]));

/**
 * O que as escolhas concedem: magias/truques automáticos, perícias,
 * expertise e idiomas. Pools dinâmicos concedem o próprio item escolhido
 * conforme `grantAs` ('spell' | 'cantrip' | 'skill' | 'expertise' | 'language').
 */
function optionGrants(data, picks) {
  const g = emptyGrants();
  for (const p of picks) {
    const def = data.pools[p.pool];
    if (isDynamicPool(def)) {
      const as = def.grantAs || { spell: 'spell', skill: 'skill', language: 'language' }[def.kind];
      const key = { spell: 'spells', cantrip: 'cantrips', skill: 'skills', expertise: 'expertise', language: 'languages', tool: 'tools', weapon: 'weapons', spellbook: 'spellbook' }[as];
      if (key) g[key].push(p.id);
      continue;
    }
    for (const k of Object.keys(g)) g[k].push(...(p.option.grants?.[k] || []));
  }
  return g;
}

/** Concessões de todas as classes da ficha (multiclasse incluída). */
export function allOptionGrants(character) {
  const g = emptyGrants();
  const byClass = {};
  for (const p of Array.isArray(character.classOptions) ? character.classOptions : []) (byClass[p?.classId] ||= []).push(p);
  for (const [classId, list] of Object.entries(byClass)) {
    const data = classOptionsData(classId);
    if (!data) continue;
    const picks = list.map(p => ({ ...p, option: findOption(classId, p.pool, p.id) })).filter(p => p.option);
    const one = optionGrants(data, picks);
    for (const k of Object.keys(g)) g[k].push(...one[k]);
  }
  return g;
}

/**
 * Valida novas escolhas `adds` (e trocas `swaps`) para a ficha vista como `classId`.
 *   adds:  [{ pool, id, detail? }]
 *   swaps: [{ pool, from, to, detail? }]   — troca uma opção já escolhida
 * Não passa do total de vagas, respeita pré-requisitos e repetição. Trocas
 * valem ao subir de nível (`levelUp`, até pool.swapOnLevelUp) ou a qualquer
 * momento em pools com `freeSwap`.
 */
export function validateOptionPicks(character, classId, { adds = [], swaps = [] } = {}, classLevel = character.level || 1, { levelUp = false } = {}) {
  character = migrateClassOptions(character);
  const issues = [];
  const data = classOptionsData(classId);
  if (!data) return { valid: adds.length + swaps.length === 0, issues: adds.length + swaps.length ? ['Classe sem opções selecionáveis'] : [] };
  const view = { ...character, className: classId, level: classLevel };
  let picks = picksOf(character, classId);

  for (const s of swaps) {
    const def = data.pools[s?.pool];
    const levelOk = levelUp && def?.swapOnLevelUp && (!def.swapLevels || def.swapLevels.includes(classLevel));
    if (!def || !(def.freeSwap || levelOk)) { issues.push('Este pool não permite troca agora'); continue; }
    const i = picks.findIndex(p => p.pool === s.pool && p.id === s.from);
    if (i < 0) { issues.push('Opção a trocar não encontrada'); continue; }
    picks = [...picks.slice(0, i), ...picks.slice(i + 1)];
    adds = [...adds, { pool: s.pool, id: s.to, detail: s.detail }];
  }
  const swapsPerPool = {};
  for (const s of swaps) swapsPerPool[s.pool] = (swapsPerPool[s.pool] || 0) + 1;
  for (const [pool, n] of Object.entries(swapsPerPool)) {
    const def = data.pools[pool];
    if (def && !def.freeSwap && n > (def.swapOnLevelUp || 0)) issues.push('Trocas demais neste nível');
  }

  for (const a of adds) {
    const option = a && findOption(classId, a.pool, a.id);
    if (!option) { issues.push(`Opção inválida: ${a?.id}`); continue; }
    if (a.detail != null && (typeof a.detail !== 'string' || a.detail.length > 120)) issues.push('Detalhe inválido');
    const check = checkPrereq(view, classId, option, [...picks, ...adds], classLevel);
    if (!check.ok) issues.push(`${option.name.pt}: ${check.issues.map(x => x.pt).join(', ')}`);
    const same = picks.filter(p => p.pool === a.pool && p.id === a.id);
    if (same.length && !option.repeatable) issues.push(`${option.name.pt} já escolhida`);
    // Repetível com `detail`: cada escolha precisa de um alvo diferente. Sem `detail`
    // (ex.: Replicar Item Mágico, cujo item vem de outro pool), pode repetir à vontade.
    if (same.length && option.repeatable && option.detail && same.some(p => (p.detail || '') === (a.detail || ''))) issues.push(`${option.name.pt}: escolha um alvo diferente`);
    picks = [...picks, { classId, pool: a.pool, id: a.id, detail: a.detail }];
  }
  // Vagas contadas já com as novas escolhas (uma opção pode abrir vagas em outro pool).
  const others = (character.classOptions || []).filter(p => p?.classId !== classId);
  const slots = optionSlots({ ...view, classOptions: [...others, ...picks] }, classId, classLevel);
  for (const [pool, n] of Object.entries(countBy(picks))) {
    if (n > (slots[pool]?.total || 0)) issues.push(`Escolhas demais em ${data.pools[pool]?.name.pt || pool}`);
  }
  return { valid: issues.length === 0, issues };
}

const countBy = (picks) => picks.reduce((acc, p) => ({ ...acc, [p.pool]: (acc[p.pool] || 0) + 1 }), {});

/** Registra escolhas já validadas. `level` = nível total do personagem. */
export function applyOptionPicks(character, classId, { adds = [], swaps = [] } = {}, level = character.level || 1) {
  character = migrateClassOptions(character);
  let list = Array.isArray(character.classOptions) ? [...character.classOptions] : [];
  for (const s of swaps) {
    const i = list.findIndex(p => p.classId === classId && p.pool === s.pool && p.id === s.from);
    const old = i >= 0 ? list.splice(i, 1)[0] : null;
    list.push(clean({ classId, pool: s.pool, id: s.to, level, detail: s.detail, swappedFrom: s.from, originalLevel: old?.level, originalDetail: old?.detail }));
  }
  for (const a of adds) list.push(clean({ classId, pool: a.pool, id: a.id, level, detail: a.detail }));
  return { ...character, classOptions: list };
}

const clean = (p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v != null && v !== ''));

/**
 * Desfaz as escolhas feitas num nível total (ao voltar um nível). Trocas
 * devolvem a opção antiga.
 */
export function revertOptionPicks(character, level) {
  const list = Array.isArray(character.classOptions) ? character.classOptions : [];
  const out = [];
  for (const p of list) {
    if (p.level !== level) { out.push(p); continue; }
    if (p.swappedFrom) out.push(clean({ classId: p.classId, pool: p.pool, id: p.swappedFrom, level: p.originalLevel, detail: p.originalDetail }));
  }
  return { ...character, classOptions: out };
}
