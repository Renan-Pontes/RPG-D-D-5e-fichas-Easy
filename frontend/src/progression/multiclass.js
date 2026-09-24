/**
 * Multiclasse — funções puras compartilhadas por engine, utils e UI.
 * Espelhado em backend/api/progression/multiclass.py.
 *
 * Modelo na ficha (compatível com fichas de uma classe só):
 *   className / subclass / landType  → classe inicial (dá os salvamentos)
 *   level                            → nível TOTAL do personagem
 *   multiclass: [{ id, subclass, landType }]  → classes adicionais
 *   classSequence: ['druid', 'druid', 'fighter', ...]  → classe de cada nível
 *     (só existe com multiclasse; índice 0 = nível 1). É o que liga um nível
 *     total (chave de levelChoices) ao nível da classe correspondente.
 */

// Pré-requisito: cada grupo precisa de ao menos um atributo >= 13 (todos os grupos valem).
export const MULTICLASS_PREREQS = {
  barbarian: [['str']],
  bard: [['cha']],
  cleric: [['wis']],
  druid: [['wis']],
  fighter: [['str', 'dex']],
  monk: [['dex'], ['wis']],
  paladin: [['str'], ['cha']],
  ranger: [['dex'], ['wis']],
  rogue: [['dex']],
  sorcerer: [['cha']],
  warlock: [['cha']],
  wizard: [['int']],
  artificer: [['int']],
};

// Proficiências ganhas ao entrar numa classe como multiclasse (não a classe inicial).
// skill: quantas perícias da lista da classe o jogador escolhe.
const P = (pt, en, skill = 0) => ({ pt, en, skill });
export const MULTICLASS_PROFS = {
  legacy: {
    barbarian: P('Escudos, armas simples e marciais', 'Shields, simple and martial weapons'),
    bard: P('Armadura leve, 1 perícia, 1 instrumento musical', 'Light armor, 1 skill, 1 musical instrument', 1),
    cleric: P('Armaduras leve e média, escudos', 'Light and medium armor, shields'),
    druid: P('Armaduras leve e média, escudos (não metálicos)', 'Light and medium armor, shields (non-metal)'),
    fighter: P('Armaduras leve e média, escudos, armas simples e marciais', 'Light and medium armor, shields, simple and martial weapons'),
    monk: P('Armas simples, espadas curtas', 'Simple weapons, shortswords'),
    paladin: P('Armaduras leve e média, escudos, armas simples e marciais', 'Light and medium armor, shields, simple and martial weapons'),
    ranger: P('Armaduras leve e média, escudos, armas simples e marciais, 1 perícia', 'Light and medium armor, shields, simple and martial weapons, 1 skill', 1),
    rogue: P('Armadura leve, 1 perícia, ferramentas de ladrão', "Light armor, 1 skill, thieves' tools", 1),
    sorcerer: P('Nenhuma', 'None'),
    warlock: P('Armadura leve, armas simples', 'Light armor, simple weapons'),
    wizard: P('Nenhuma', 'None'),
    artificer: P('Armaduras leve e média, escudos, ferramentas de ladrão e de funileiro', "Light and medium armor, shields, thieves' and tinker's tools"),
  },
  current: {
    barbarian: P('Escudos, armas marciais', 'Shields, martial weapons'),
    bard: P('Armadura leve, 1 perícia, 1 instrumento musical', 'Light armor, 1 skill, 1 musical instrument', 1),
    cleric: P('Armaduras leve e média, escudos', 'Light and medium armor, shields'),
    druid: P('Armadura leve, escudos', 'Light armor, shields'),
    fighter: P('Armaduras leve e média, escudos, armas marciais', 'Light and medium armor, shields, martial weapons'),
    monk: P('Nenhuma', 'None'),
    paladin: P('Armaduras leve e média, escudos, armas marciais', 'Light and medium armor, shields, martial weapons'),
    ranger: P('Armaduras leve e média, escudos, armas marciais, 1 perícia', 'Light and medium armor, shields, martial weapons, 1 skill', 1),
    rogue: P('Armadura leve, 1 perícia, ferramentas de ladrão', "Light armor, 1 skill, thieves' tools", 1),
    sorcerer: P('Nenhuma', 'None'),
    warlock: P('Armadura leve', 'Light armor'),
    wizard: P('Nenhuma', 'None'),
    artificer: P('Armaduras leve e média, escudos, ferramentas de ladrão e de funileiro', "Light and medium armor, shields, thieves' and tinker's tools"),
  },
};

export const multiclassProfs = (character, classId) =>
  MULTICLASS_PROFS[character.rulesVersion === '2024' ? 'current' : 'legacy'][classId] || null;

const extraClasses = (character) =>
  (Array.isArray(character.multiclass) ? character.multiclass : [])
    .filter(m => m && m.id && m.id !== character.className);

export const isMulticlass = (character) => extraClasses(character).length > 0;

/** Classe de cada nível total (índice 0 = nível 1). Sempre começa pela classe inicial. */
export function classSequence(character) {
  const level = Math.max(1, character.level || 1);
  const primary = character.className;
  if (!isMulticlass(character)) return Array(level).fill(primary);
  const known = new Set([primary, ...extraClasses(character).map(m => m.id)]);
  const seq = (Array.isArray(character.classSequence) ? character.classSequence : []).filter(id => known.has(id)).slice(0, level);
  if (!seq.length || seq[0] !== primary) seq.unshift(primary);
  // Nível editado à mão (mestre/modo trapaça): o que sobra ou falta fica na classe inicial.
  while (seq.length > level) seq.pop();
  while (seq.length < level) seq.push(primary);
  return seq;
}

/** [{ id, subclass, landType, level, primary }] — só classes com ao menos 1 nível. */
export function classEntries(character) {
  const seq = classSequence(character);
  const count = (id) => seq.filter(x => x === id).length;
  const out = [{ id: character.className, subclass: character.subclass || '', landType: character.landType || '', level: count(character.className), primary: true }];
  for (const m of extraClasses(character)) {
    const lv = count(m.id);
    if (lv > 0 && !out.some(e => e.id === m.id)) out.push({ id: m.id, subclass: m.subclass || '', landType: m.landType || '', level: lv, primary: false });
  }
  return out;
}

export const classLevel = (character, classId) => classEntries(character).find(e => e.id === classId)?.level || 0;
export const hasClass = (character, classId) => classLevel(character, classId) > 0;

/** Nível total em que a classe atingiu `classLvl` (inverso de classAt). */
export function totalLevelFor(character, classId, classLvl) {
  const seq = classSequence(character);
  let n = 0;
  for (let i = 0; i < seq.length; i++) {
    if (seq[i] === classId && ++n === classLvl) return i + 1;
  }
  return null;
}

/** Qual classe (e em que nível dela) corresponde ao nível total `total`. */
export function classAt(character, total) {
  const seq = classSequence(character);
  const id = seq[total - 1] || (total > seq.length ? seq[seq.length - 1] : null);
  if (!id) return null;
  const upTo = total <= seq.length ? seq.slice(0, total) : [...seq, ...Array(total - seq.length).fill(id)];
  const entry = classEntries(character).find(e => e.id === id) || { id, subclass: '', landType: '', level: 0, primary: false };
  return { entry, classLevel: upTo.filter(x => x === id).length };
}

/**
 * A ficha "vista" como se tivesse só uma classe: level = nível da classe,
 * totalLevel = nível do personagem (bônus de proficiência) e levelChoices
 * reindexado pelo nível da classe. Serve para reaproveitar toda a lógica de
 * classe única (progressão, espaços, truques, magias preparadas).
 */
export function classView(character, entry) {
  if (!isMulticlass(character)) return { ...character, totalLevel: character.totalLevel || character.level };
  const seq = classSequence(character);
  const choices = character.levelChoices || {};
  const levelChoices = {};
  let n = 0;
  seq.forEach((id, i) => {
    if (id !== entry.id) return;
    n += 1;
    const c = choices[i + 1] ?? choices[String(i + 1)];
    if (c) levelChoices[n] = c;
  });
  return {
    ...character,
    className: entry.id,
    subclass: entry.subclass || '',
    landType: entry.landType || '',
    level: entry.level,
    totalLevel: character.level,
    multiclass: [],
    classSequence: undefined,
    levelChoices,
  };
}

const score = (character, k) => ((character.abilities || {})[k] || 10) + ((character.raceBonus || {})[k] || 0);

/** Atributos que faltam para a classe: [] quando cumpre. Ex.: [['str','dex']]. */
export function missingPrereqs(character, classId) {
  return (MULTICLASS_PREREQS[classId] || []).filter(group => !group.some(k => score(character, k) >= 13));
}

/**
 * Pode entrar em `classId` como multiclasse? Exige 13 no(s) atributo(s) da nova
 * classe e de todas as classes atuais.
 */
export function canMulticlassInto(character, classId) {
  if (classEntries(character).some(e => e.id === classId)) return { ok: false, reason: 'already', missing: [] };
  const missing = [
    ...missingPrereqs(character, classId).map(group => ({ classId, group })),
    ...classEntries(character).flatMap(e => missingPrereqs(character, e.id).map(group => ({ classId: e.id, group }))),
  ];
  return { ok: missing.length === 0, reason: missing.length ? 'prereq' : null, missing };
}

/** Aplica +1 nível na classe `classId` (sequência e lista de classes). Não mexe em PV/escolhas. */
export function withClassLevel(character, classId) {
  const toLevel = (character.level || 1) + 1;
  const primary = character.className;
  if (classId === primary && !isMulticlass(character)) return { ...character, level: toLevel };
  const next = { ...character, level: toLevel, classSequence: [...classSequence(character), classId] };
  if (classId !== primary && !extraClasses(character).some(m => m.id === classId)) {
    next.multiclass = [...extraClasses(character), { id: classId, subclass: '', landType: '' }];
  }
  return next;
}

/** Remove o último nível (e a classe, se ficar sem níveis). */
export function withoutLastClassLevel(character) {
  const level = character.level || 1;
  if (level <= 1) return character;
  if (!isMulticlass(character)) return { ...character, level: level - 1 };
  const seq = classSequence(character).slice(0, -1);
  const left = new Set(seq);
  const multiclass = extraClasses(character).filter(m => left.has(m.id));
  const next = { ...character, level: level - 1, multiclass, classSequence: seq };
  if (!multiclass.length) { delete next.multiclass; delete next.classSequence; }
  return next;
}
