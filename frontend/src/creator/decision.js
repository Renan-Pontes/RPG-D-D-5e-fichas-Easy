/*
 * O peso da decisão: para as escolhas grandes da criação (classe, antecedente,
 * espécie, escolhas de classe de vaga única, tendência), calcula o que muda no
 * herói antes de o jogador selar a escolha. Só lê as regras que já existem
 * (Utils, start-data, ability/equipment/spell-helpers); não muda nenhuma.
 * Funções puras (testadas em tests/creator-journey.test.js).
 */
import Utils from '../../utils.js';
import { computeProgression } from '../progression/engine.js';
import { classStart, backgroundStart } from './start-data.js';
import { expectedRaceBonus, abilitiesIssues, STANDARD_ARRAY_BY_CLASS, ABILITIES } from './ability-helpers.js';
import { applyStartingEquipment } from './equipment-helpers.js';
import { spellPlan } from './spell-helpers.js';
import { characterSummary, classCastsNow } from './creation.js';

const withBonus = (c) => ({ ...c, raceBonus: expectedRaceBonus(c) });
const safe = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };

/** Aplica um patch (objeto ou função do char) e devolve o char resultante. */
export function afterPatch(char, patch) {
  const p = typeof patch === 'function' ? patch(char) : patch;
  return { ...char, ...(p || {}) };
}

/** Os atributos já foram distribuídos (a etapa Atributos não tem pendência)? Antes disso valem 8 (ver utils makeNew). */
export const abilitiesSet = (char) => !!char && abilitiesIssues(char).length === 0;

/** Antes da etapa Atributos, usa a tabela sugerida da classe para estimar PV/CA. */
const withAssumedAbilities = (char) => (char?.className && !abilitiesSet(char) && STANDARD_ARRAY_BY_CLASS[char.className]
  ? { ...char, abilities: { ...STANDARD_ARRAY_BY_CLASS[char.className] } } : char);

/** Números do herói que a decisão pode mudar. null = ainda não dá para saber. */
export function heroStats(char) {
  if (!char) return {};
  const c = withBonus(withAssumedAbilities(char));
  const plan = char.className ? safe(() => spellPlan(c), {}) : {};
  return {
    hp: char.className ? safe(() => Utils.maxHpDefault(c)) || null : null,
    ac: char.className ? safe(() => Utils.computeAc(c)) : null,
    speed: char.race ? safe(() => Utils.speed(c)) : null,
    cantrips: plan.cantrips || null,
    spells: plan.leveled || null,
  };
}

export const STAT_LABEL = {
  hp: { pt: 'PV', en: 'HP' }, ac: { pt: 'CA', en: 'AC' }, speed: { pt: 'Desloc.', en: 'Speed' },
  cantrips: { pt: 'Truques', en: 'Cantrips' }, spells: { pt: 'Magias', en: 'Spells' },
};

/** [{ key, from, to }] dos números que mudam com o patch. */
export function statDiffs(char, patch) {
  const before = heroStats(char), after = heroStats(afterPatch(char, patch));
  return Object.keys(STAT_LABEL)
    .filter(k => after[k] != null && after[k] !== before[k])
    .map(k => ({ key: k, from: before[k] ?? null, to: after[k] }));
}

const count = (x) => (Array.isArray(x) ? x.length : 0);

/**
 * O que a decisão desfaz (o app já limpa isso ao trocar de classe, antecedente
 * ou espécie): [{ pt, en }].
 */
export function lostByPatch(char, patch) {
  const a = afterPatch(char, patch), out = [];
  const n = (x, y) => Math.max(0, x - y);
  const skills = n(count(char.skillProfs), count(a.skillProfs));
  if (skills) out.push({ pt: `${skills} ${skills > 1 ? 'perícias escolhidas' : 'perícia escolhida'}`, en: `${skills} chosen skill${skills > 1 ? 's' : ''}` });
  const opts = n(count(char.classOptions), count(a.classOptions));
  if (opts) out.push({ pt: `${opts} ${opts > 1 ? 'escolhas' : 'escolha'} da classe`, en: `${opts} class choice${opts > 1 ? 's' : ''}` });
  const spells = n(count(char.spells), count(a.spells));
  if (spells) out.push({ pt: `${spells} ${spells > 1 ? 'magias e truques' : 'magia'}`, en: `${spells} spell${spells > 1 ? 's' : ''}` });
  if (char.subclass && !a.subclass) out.push({ pt: 'a subclasse', en: 'the subclass' });
  if (char.creation?.classPack && !a.creation?.classPack) out.push({ pt: 'o equipamento da classe', en: 'the class equipment' });
  if (char.creation?.backgroundPack && !a.creation?.backgroundPack) out.push({ pt: 'o equipamento do antecedente', en: 'the background equipment' });
  const feats = n(count(char.feats), count(a.feats));
  if (feats) out.push({ pt: `${feats} ${feats > 1 ? 'talentos' : 'talento'}`, en: `${feats} feat${feats > 1 ? 's' : ''}` });
  const langs = n(count(char.languages), count(a.languages));
  if (langs) out.push({ pt: `${langs} ${langs > 1 ? 'idiomas escolhidos' : 'idioma escolhido'}`, en: `${langs} chosen language${langs > 1 ? 's' : ''}` });
  const bonus = (c) => Object.values(c.raceBonus || {}).some(Boolean);
  if (bonus(char) && !bonus(a)) out.push({ pt: 'o bônus de atributo já distribuído', en: 'the ability bonus you assigned' });
  // Escolhas da espécie (o tamanho Médio volta sozinho; não conta).
  const sc = Object.keys(char.speciesChoices || {}).filter(key => key !== 'size' && char.speciesChoices[key] != null
    && JSON.stringify(a.speciesChoices?.[key]) !== JSON.stringify(char.speciesChoices[key])).length;
  if (sc) out.push({ pt: sc > 1 ? 'as escolhas da espécie' : 'a escolha da espécie', en: sc > 1 ? 'the species choices' : 'the species choice' });
  const tools = n(count(char.creation?.toolChoices?.background), count(a.creation?.toolChoices?.background));
  if (tools) out.push({ pt: tools > 1 ? 'as ferramentas escolhidas' : 'a ferramenta escolhida', en: tools > 1 ? 'the chosen tools' : 'the chosen tool' });
  return out;
}

// ---------------------------------------------------------------------------
// A primeira batalha: um Goblin Guerreiro (SRD 5.2.1: CA 15, Cimitarra +4, 5 de dano)
// ---------------------------------------------------------------------------
export const GOBLIN = { ac: 15, attack: 4, damage: 5 };
const pct = (x) => Math.round(Math.min(0.95, Math.max(0.05, x)) * 20) * 5;

/**
 * Chance de o goblin acertar o herói, quantos golpes ele aguenta e a chance de
 * o herói acertar o goblin. Sem atributos ainda, usa a tabela sugerida da
 * classe; sem equipamento, o primeiro pacote da classe. null sem classe.
 */
export function battleOdds(char, lang = 'pt') {
  if (!char?.className || !classStart(char)) return null;
  const assumedAbilities = !abilitiesSet(char);
  let c = withAssumedAbilities(char);
  const assumedKit = !c.creation?.classPack;
  if (assumedKit) {
    const packs = classStart(c)?.equipment || [];
    const pack = packs.find(p => (p.items || []).length) || packs[0];
    if (pack) c = safe(() => applyStartingEquipment({ ...c, creation: { ...(c.creation || {}), classPack: pack.id } }, lang), c);
  }
  const w = withBonus(c);
  const ac = safe(() => Utils.computeAc(w), 10), hp = safe(() => Utils.maxHpDefault(w), 1) || 1;
  // O mesmo ataque que a Revisão mostra: a melhor arma conhecida (ou desarmado) e,
  // se a classe já conjura, o ataque mágico. Sem isso, o atributo principal.
  const sum = safe(() => characterSummary(w, lang), null);
  const known = [...(sum?.attacks || []).filter(x => x?.known && Number.isFinite(x.atk)).map(x => x.atk),
    ...(classCastsNow(w) && Number.isFinite(sum?.spellAttack) ? [sum.spellAttack] : [])];
  const primary = classStart(c)?.primary || ['str'];
  const attack = known.length ? Math.max(...known) : Utils.profBonus(w) + Math.max(...primary.map(k => Utils.abilityMod(w, k)));
  return {
    hitsYou: pct((21 - (ac - GOBLIN.attack)) / 20),
    fallsAfter: Math.max(1, Math.ceil(hp / GOBLIN.damage)),
    youHit: pct((21 - (GOBLIN.ac - attack)) / 20),
    assumedAbilities, assumedKit,
  };
}

// ---------------------------------------------------------------------------
// O caminho adiante: o que a classe dá do nível 2 ao 5
// ---------------------------------------------------------------------------
const FULL_CASTERS = ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'];
const HALF_CASTERS = ['paladin', 'ranger', 'artificer'];
const ASI = /aumento (no valor )?de atributo|ability score improvement/i;
const BIG = /ataque extra|extra attack|subclasse|subclass|forma selvagem|wild shape|ação astuta|cunning action|surto de ação|action surge|golpe do paladino|paladin's smite|fonte de magia|font of magic/i;

/** [{ level, items: [{pt,en}], big }] para os níveis 2 a 5. */
const SUBCLASS = /subclasse|subclass/i, EXTRA = /ataque extra|extra attack/i, STYLE = /estilo de luta|fighting style/i, EXPERT = /especialização|expertise/i;

export function classPath(char, classId = char?.className) {
  if (!classId) return [];
  const base = {
    rulesVersion: char?.rulesVersion === '2014' ? '2014' : '2024', className: classId, subclass: '', classOptions: [], feats: [], spells: [],
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  };
  const at = (level) => safe(() => computeProgression({ ...base, level }), null);
  const p = at(5);
  if (!p) return [];
  // Marcas que a progressão guarda fora de features (regras 2014: subclasse, Ataque Extra, estilo, especialização).
  const levels = [1, 2, 3, 4, 5].map(at);
  const num = (level, key) => Number(levels[level - 1]?.[key]) || 0;
  const grew = (key, level) => num(level, key) > num(level - 1, key);
  const subLevel = safe(() => Utils.subclassLevel({ ...base, level: 1 }), null);
  return [2, 3, 4, 5].map(level => {
    const items = (p.features || []).filter(f => f.level === level && f.source === 'class' && !ASI.test(f.name || ''))
      .map(f => ({ pt: f.name, en: f.nameEn || f.name }));
    const has = (re) => items.some(x => re.test(x.pt) || re.test(x.en));
    if (level === subLevel && !has(SUBCLASS)) items.unshift({ pt: 'Subclasse', en: 'Subclass' });
    if (grew('extraAttacks', level) && !has(EXTRA)) items.push({ pt: 'Ataque Extra', en: 'Extra Attack' });
    if (grew('fightingStyles', level) && !has(STYLE)) items.push({ pt: 'Estilo de Luta', en: 'Fighting Style' });
    if (grew('expertiseSlots', level) && !has(EXPERT)) items.push({ pt: 'Especialização', en: 'Expertise' });
    if (level === 4) items.push({ pt: '+2 num atributo ou um talento', en: '+2 to an ability or a feat' });
    if (level === 5 && FULL_CASTERS.includes(classId)) items.push({ pt: 'Magias de 3º círculo', en: 'Level 3 spells' });
    if (level === 5 && HALF_CASTERS.includes(classId)) items.push({ pt: 'Magias de 2º círculo', en: 'Level 2 spells' });
    return { level, items, big: items.some(x => BIG.test(x.pt) || BIG.test(x.en)) };
  }).filter(x => x.items.length);
}

// ---------------------------------------------------------------------------
// O que fica para trás (escolhas que fecham portas)
// ---------------------------------------------------------------------------
const ABIL = { str: { pt: 'Força', en: 'Strength' }, dex: { pt: 'Destreza', en: 'Dexterity' }, con: { pt: 'Constituição', en: 'Constitution' },
  int: { pt: 'Inteligência', en: 'Intelligence' }, wis: { pt: 'Sabedoria', en: 'Wisdom' }, cha: { pt: 'Carisma', en: 'Charisma' } };
const or = (ids, lang) => ids.map(a => ABIL[a]?.[lang === 'pt' ? 'pt' : 'en']).join(lang === 'pt' ? ' ou ' : ' or ');

/** O que uma classe não dá: [{pt,en}]. */
export function classTradeoffs(char, classId, bgAbilities = null) {
  const s = classStart(char, classId);
  if (!s) return [];
  const out = [];
  const casts = (s.spells && (s.spells.cantrips || s.spells.prepared || s.spells.known)) || false;
  if (!casts) out.push({ pt: 'Magia: este caminho não conjura no nível 1', en: 'Magic: this path casts no spells at level 1' });
  const armor = s.armor || [];
  if (!armor.length) out.push({ pt: 'Qualquer armadura', en: 'Any armor' });
  else if (!armor.includes('heavy')) out.push({ pt: 'Armadura pesada', en: 'Heavy armor' });
  if (s.hitDie <= 6) out.push({ pt: 'Muita vida: d6 é o menor dado de vida', en: 'Plenty of health: d6 is the smallest hit die' });
  const bg = bgAbilities || [];
  if (bg.length && !(s.primary || []).some(a => bg.includes(a))) {
    out.push({ pt: `Seu antecedente não dá bônus em ${or(s.primary, 'pt')}`, en: `Your background gives no bonus to ${or(s.primary, 'en')}` });
  }
  return out;
}

/** O que um antecedente 2024 não dá: atributos sem bônus e o principal da classe. */
export function backgroundTradeoffs(char, bg) {
  if (!bg || !Array.isArray(bg.abilities) || !bg.abilities.length) return [];
  const others = ABILITIES.filter(a => !bg.abilities.includes(a));
  const out = [{ pt: `Nenhum bônus em ${others.map(a => ABIL[a].pt).join(', ')}`, en: `No bonus to ${others.map(a => ABIL[a].en).join(', ')}` }];
  const primary = classStart(char)?.primary || [];
  if (primary.length && !primary.some(a => bg.abilities.includes(a))) {
    out.push({ pt: `Seu atributo principal (${or(primary, 'pt')}) fica sem bônus`, en: `Your main ability (${or(primary, 'en')}) gets no bonus` });
  }
  return out;
}

/** Linhas do que o antecedente dá na criação (2014: idiomas/traço; 2024: bônus). */
export const backgroundLanguages = (char, id) => backgroundStart(char, id)?.languages || 0;
