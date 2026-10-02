/*
 * Magias na criação de personagem (etapas `cantrips` e `spells`) — funções puras.
 *
 * Modelo (o mesmo da ficha): `char.spells` = [{ id, prepared, inBook?, auto?, feat?, species? }].
 * Na criação só entram as escolhas da CLASSE (sem `auto`); truques e magias de
 * talento, espécie ou recurso de classe (Marca do Caçador, Consertar…) são
 * acrescentados ao salvar por applyAutosToCharacter e aqui só aparecem como
 * "já vem de …" (grantedSpells) — não ocupam vaga e não podem ser escolhidos de novo.
 *
 * Quantidades no nível do personagem (Utils, que segue a tabela da regra):
 *   2024 (SRD 5.2.1): todas as classes preparam. Nível 1: Bardo 2 truques/4 magias,
 *     Clérigo 3/4, Druida 2/4, Paladino 0/2, Patrulheiro 0/2, Feiticeiro 4/2,
 *     Bruxo 2/2, Mago 3 truques + 6 no grimório (4 preparadas), Artífice 2/2.
 *   2014 (SRD 5.1): Bardo 4 conhecidas, Feiticeiro 2, Bruxo 2; Clérigo/Druida
 *     preparam mod. SAB + nível (mín. 1); Mago 6 no grimório e prepara INT + nível;
 *     Artífice INT + ½ nível; Paladino/Patrulheiro só conjuram a partir do nível 2.
 */
import Utils from '../../utils.js';
import { tName } from '../../data/i18n.js';
import { findFeat } from '../../data/feats.js';
import { computeProgression } from '../progression/engine.js';
import { speciesGrants } from '../progression/species.js';
import * as Book from '../progression/spellbook.js';
import { optionPool } from '../progression/options.js';
import { rulesFor } from '../progression/rules.js';
import { speciesChoiceSpecs } from '../progression/species.js';
import SRD from '../../data/srd.js';
import { localizeLegacySpells } from '../../data/spells-extra.js';

// Catálogo 2014 em pt na tela (criação e ficha): resumo 2014 nas magias copiadas do
// SRD 5.2.1, "SAL DEST"/pés/HP por extenso e tempo/alcance/duração traduzidos (metaPt,
// que Utils.spellMeta usa). Ver data/spells-extra.js. Idempotente.
localizeLegacySpells(SRD.SPELLS);

const b = (pt, en) => ({ pt, en });
const rv = (char) => (char?.rulesVersion === '2014' ? '2014' : '2024');
const idOf = (s) => (typeof s === 'string' ? s : s?.id);
const asEntry = (s) => (typeof s === 'string' ? { id: s, prepared: true } : s);
const list = (v) => (Array.isArray(v) ? v : v != null && v !== '' ? [v] : []);
const plural = (n, one, many) => (n === 1 ? one : many);

export const spellDef = (char, id) => Utils.spellCatalog(char).find(s => s.id === id) || null;
const nameOf = (char, id) => b(tName('spellName', id, 'pt'), tName('spellName', id, 'en'));
const className = (char) => b(tName('class', char.className, 'pt'), tName('class', char.className, 'en'));

// ---------------------------------------------------------------------------
// Livro básico × outros livros
// ---------------------------------------------------------------------------
/** Fontes do livro básico (SRD 5.1/5.2.1 e Livro do Jogador 2014/2024) — as demais vão para "Outros livros". */
const CORE_SPELL_SOURCES = new Set([undefined, null, '', 'SRD', 'SRD 5.1', 'SRD 5.2.1', 'PHB', 'PHB14', 'PHB24']);
/**
 * Magias marcadas PHB24 que, na regra 2014, vieram de suplementos (XGE, TCE) ou só
 * existem em 2024 — numa ficha 2014 elas não são do livro básico.
 */
const NOT_PHB_2014 = new Set(['mindSliver', 'thunderclap', 'tollTheDead', 'wordOfRadiance', 'synapticStatic', 'steelWindStrike',
  'tashasBubblingCauldron', 'arcaneVigor', 'jallarzisStormOfRadiance', 'powerWordFortify', 'fountOfMoonlight', 'yolandesRegalPresence']);
/** A magia é do livro básico? (as de suplementos aparecem recolhidas, "confirme com o mestre"). */
export function isCoreSpell(sp, char) {
  if (!CORE_SPELL_SOURCES.has(sp?.source)) return false;
  if (rv(char) === '2014' && sp?.source === 'PHB24' && (NOT_PHB_2014.has(sp.id) || /^summon/.test(sp.id))) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Lista da classe (+ Lista Expandida do patrono do Bruxo 2014)
// ---------------------------------------------------------------------------
/**
 * 2014 (PHB): a Lista Expandida do patrono do bruxo só acrescenta opções à lista de
 * escolha — não são magias de graça. Ids de rules.js `expandedSpells` até o nível atual.
 */
export function expandedSpellIds(char) {
  const out = new Set();
  if (!char?.className || !char?.subclass) return out;
  const levels = rulesFor(char)?.subclassPerLevel?.[char.subclass];
  if (!levels) return out;
  for (const [lv, node] of Object.entries(levels)) {
    if (/^\d+$/.test(lv) && Number(lv) <= (char.level || 1)) for (const id of node?.expandedSpells || []) out.add(id);
  }
  return out;
}
/** A magia está na lista de escolha do personagem (lista da classe ou Lista Expandida)? */
export const onClassList = (char, d, expanded = expandedSpellIds(char)) => !!d && (Utils.inSpellList(char, d) || expanded.has(d.id));

// ---------------------------------------------------------------------------
// Sugestões para iniciantes
// ---------------------------------------------------------------------------
/**
 * Recomendações do SRD 5.2.1 (texto "… are recommended" de cada classe). O Artífice
 * não está no SRD: sugestão própria. Em 2014 vale a mesma lista, filtrada pelo que
 * existe no catálogo e na lista da classe (ex.: Explosão Feiticeira não existe em 2014).
 */
export const SRD_RECOMMENDED = {
  cantrips: {
    bard: ['viciousMockery', 'dancingLights'],
    cleric: ['sacredFlame', 'guidance', 'thaumaturgy'],
    druid: ['produceFlame', 'druidcraft'],
    sorcerer: ['sorcerousBurst', 'light', 'prestidigitation', 'shockingGrasp'],
    warlock: ['eldritchBlast', 'prestidigitation'],
    wizard: ['rayOfFrost', 'light', 'mageHand'],
    artificer: ['guidance', 'fireBolt'],
  },
  spells: {
    bard: ['healingWord', 'dissonantWhispers', 'charmPerson', 'colorSpray'],
    cleric: ['cureWounds', 'bless', 'guidingBolt', 'shieldOfFaith'],
    druid: ['cureWounds', 'thunderwave', 'faerieFire', 'animalFriendship'],
    paladin: ['searingSmite', 'heroism'],
    ranger: ['cureWounds', 'ensnaringStrike'],
    sorcerer: ['burningHands', 'detectMagic'],
    warlock: ['hex', 'charmPerson'],
    // Grimório (6); as 4 primeiras são as sugeridas para preparar.
    wizard: ['magicMissile', 'mageArmor', 'sleep', 'thunderwave', 'detectMagic', 'featherFall'],
    artificer: ['cureWounds', 'faerieFire'],
  },
};

/** Truques fáceis de usar, bons para qualquer classe que os tenha na lista. */
export const EASY_CANTRIPS = ['fireBolt', 'eldritchBlast', 'sacredFlame', 'guidance', 'mageHand', 'light'];
/** 2014: substitutos para recomendações que só existem em 2024. */
const FALLBACK_2014 = { sorcerer: ['fireBolt'] };

/** Truques marcados "Bom para começar" (na lista da classe), na ordem de sugestão. */
export function beginnerCantrips(char) {
  const cls = char?.className;
  const ids = [...(SRD_RECOMMENDED.cantrips[cls] || []), ...(rv(char) === '2014' ? FALLBACK_2014[cls] || [] : []), ...EASY_CANTRIPS];
  return [...new Set(ids)].filter(id => { const d = spellDef(char, id); return d && d.level === 0 && onClassList(char, d); });
}

/** Magias de 1º círculo recomendadas (na lista da classe), na ordem de sugestão. */
export function recommendedSpells(char) {
  const ids = SRD_RECOMMENDED.spells[char?.className] || [];
  return ids.filter(id => { const d = spellDef(char, id); return d && d.level === 1 && onClassList(char, d); });
}

// ---------------------------------------------------------------------------
// Quantidades
// ---------------------------------------------------------------------------
/**
 * O que a classe escolhe agora: truques, magias de círculo 1+ (preparadas ou
 * conhecidas) e, no Mago, o tamanho do grimório.
 */
export function spellPlan(char) {
  const ability = char?.className ? Utils.spellcastingAbilityOfClass(char) : null;
  const maxLevel = ability ? Utils.maxSpellLevel(char) : 0;
  const cantrips = ability ? (Utils.cantripsKnown(char) || 0) : 0;
  const prepared = Utils.isPreparedCaster(char);
  const book = Book.usesSpellbook(char) && maxLevel > 0;
  let leveled = 0;
  if (maxLevel > 0) leveled = prepared ? Utils.preparedSpellsLimit(char) : (Utils.knownSpellLimit(char) || 0);
  if (!Number.isFinite(leveled)) leveled = 0;
  return {
    ability, cantrips, leveled, maxLevel, book,
    spellbook: book ? Book.spellbookSize(char.level || 1) : 0,
    mode: prepared ? 'prepared' : 'known',
    slots: ability ? Utils.spellSlots(char) : [],
  };
}

/** A etapa de truques se aplica (a classe tem truques no nível atual). */
export const hasClassCantrips = (char) => spellPlan(char).cantrips > 0;
/** A etapa de magias se aplica (a classe escolhe magias de círculo 1+ agora). */
export const hasClassSpells = (char) => { const p = spellPlan(char); return p.leveled > 0 || p.spellbook > 0; };

// ---------------------------------------------------------------------------
// Magias que já vêm prontas (não ocupam vaga)
// ---------------------------------------------------------------------------
/** Atributo de conjuração de um talento: escolhido, ou o aumentado (`'asi'`). */
function featAbility(feat, entry) {
  const p = entry?.picks || {};
  if (p.spellAbility) return list(p.spellAbility)[0];
  if (feat?.choices?.spellAbility === 'asi') return Object.keys(entry?.asi || {}).find(k => entry.asi[k] > 0) || null;
  return null;
}

/**
 * Todas as origens de truques/magias que não ocupam vaga da classe, SEM juntar
 * repetidas: [{ id, level, source: 'class'|'feat'|'species', from: {pt,en}, ability,
 * chosen, step }]. `chosen` = o jogador escolheu (pode trocar); `step` = etapa da
 * criação onde se troca ('classChoices' | 'originFeat' | 'speciesChoices' | null).
 */
export function grantEntries(char) {
  const out = [];
  const push = (id, source, from, ability = null, chosen = false, step = null) => {
    if (!id || out.some(g => g.id === id && g.source === source && g.from?.pt === from?.pt)) return;
    const d = spellDef(char, id);
    out.push({ id, level: d ? d.level : null, source, from, ability, chosen, step });
  };
  if (char?.className) {
    let prog = null;
    try { prog = computeProgression(char); } catch { prog = null; }
    const ability = Utils.spellcastingAbilityOfClass(char);
    // Escolhas de recurso de classe (Truque do Taumaturgo, Pacto do Tomo…): origem própria.
    const picks = (Array.isArray(char.classOptions) ? char.classOptions : [])
      .filter(p => p?.id && optionPool(p.classId || char.className, p.pool)?.kind === 'spell' && spellDef(char, p.id));
    const picked = new Set(picks.map(p => p.id));
    const from = b(`recurso de ${tName('class', char.className, 'pt')}`, `${tName('class', char.className, 'en')} feature`);
    for (const id of [...(prog?.autoCantrips || []), ...(prog?.autoSpells || [])]) if (!picked.has(id)) push(id, 'class', from, ability);
    for (const p of picks) {
      const pool = optionPool(p.classId || char.className, p.pool);
      push(p.id, 'class', pool?.name?.pt ? pool.name : from, ability, true, 'classChoices');
    }
  }
  for (const entry of char?.feats || []) {
    const feat = entry?.id ? findFeat(entry.id) : null;
    if (!feat) continue;
    const g = feat.grants || {};
    const p = entry.picks || {};
    const ab = featAbility(feat, entry);
    const step = entry.origin === 'background' ? 'originFeat' : entry.origin === 'species' ? 'speciesChoices' : null;
    for (const id of [...list(g.cantrips), ...list(g.spells)]) push(id, 'feat', feat.name, ab);
    for (const id of [...list(p.cantrip), ...list(p.spell)]) push(id, 'feat', feat.name, ab, true, step);
  }
  const sg = speciesGrants(char || {});
  const race = Utils.races(char || {}).find(r => r.id === char?.race);
  const raceName = race?.name ? (typeof race.name === 'string' ? b(race.name, race.name) : race.name) : b('espécie', 'species');
  let chosenCantrip = null;
  try { if (speciesChoiceSpecs(char || {}).some(c => c.key === 'cantrip')) chosenCantrip = char?.speciesChoices?.cantrip || null; } catch { /* sem espécie */ }
  for (const id of [...sg.cantrips, ...sg.spells]) push(id, 'species', raceName, sg.spellAbility, id === chosenCantrip, id === chosenCantrip ? 'speciesChoices' : null);
  return out;
}

/**
 * Truques e magias que o personagem ganha sem escolher na classe (uma linha por magia):
 * [{ id, level, source: 'class'|'feat'|'species', from: {pt,en}, ability }].
 * Mesma ordem de prioridade do applyAutosToCharacter (classe, talento, espécie).
 */
export function grantedSpells(char) {
  const out = [];
  for (const g of grantEntries(char)) {
    if (out.some(x => x.id === g.id)) continue;
    const { chosen, step, ...rest } = g;
    out.push(rest);
  }
  return out;
}

const STEP_NAME = {
  classChoices: b('Escolhas da classe', 'Class choices'),
  originFeat: b('Talento de origem', 'Origin feat'),
  speciesChoices: b('Escolhas da espécie', 'Species choices'),
};

/**
 * O mesmo truque/magia vindo de duas origens (classe, talento, espécie): o personagem
 * ficaria com um a menos, porque a ficha guarda cada magia uma vez só.
 * [{ id, level, entries: [grantEntry…], fix: grantEntry escolhido para trocar | null }].
 * Só aponta quando há pelo menos uma escolha que pode ser trocada.
 */
export function duplicateGrants(char) {
  const by = new Map();
  for (const g of grantEntries(char)) (by.get(g.id) || by.set(g.id, []).get(g.id)).push(g);
  const out = [];
  for (const [id, entries] of by) {
    if (entries.length < 2) continue;
    const choices = entries.filter(e => e.chosen);
    if (!choices.length) continue;
    // Troca a escolha que vem por último no assistente (talento/espécie antes da classe).
    const order = ['speciesChoices', 'originFeat', 'classChoices'];
    const fix = [...choices].sort((a, c) => order.indexOf(a.step) - order.indexOf(c.step))[0];
    out.push({ id, level: entries[0].level, entries, fix });
  }
  return out;
}

/** Pendências de duplicata (kind: 'cantrip' | 'spell' | undefined = todas). Bloqueiam o avanço. */
export function duplicateGrantIssues(char, kind) {
  return duplicateGrants(char)
    .filter(d => !kind || (kind === 'cantrip' ? d.level === 0 : (d.level || 0) > 0))
    .map(d => {
      const n = nameOf(char, d.id);
      const froms = [...new Set(d.entries.map(e => e.from?.pt))].join(' e ');
      const fromsEn = [...new Set(d.entries.map(e => e.from?.en))].join(' and ');
      const where = d.fix?.step ? STEP_NAME[d.fix.step] : null;
      const kindPt = d.level === 0 ? 'truque' : 'magia';
      return b(
        `${n.pt} vem duas vezes (${froms}). Troque a escolha de ${d.fix.from?.pt}${where ? ` na etapa "${where.pt}"` : ''} por ${kindPt === 'truque' ? 'outro truque — repetido, ele não vale um truque extra' : 'outra magia — repetida, ela não vale uma magia extra'}.`,
        `${n.en} comes twice (${fromsEn}). Change the ${d.fix.from?.en} pick${where ? ` in the "${where.en}" step` : ''} to a different ${d.level === 0 ? 'cantrip' : 'spell'} — a repeat doesn't count as an extra one.`,
      );
    });
}

// ---------------------------------------------------------------------------
// Escolhas da classe em char.spells
// ---------------------------------------------------------------------------
const own = (char) => (char?.spells || []).map(asEntry).filter(s => s && !s.auto);
const levelOfEntry = (char, s) => spellDef(char, s.id)?.level;

/** Truques escolhidos na classe (ids, sem automáticos). */
export const chosenCantrips = (char) => own(char).filter(s => levelOfEntry(char, s) === 0).map(idOf);
/** Magias de círculo 1+ escolhidas na classe (no Mago: as do grimório). */
export const chosenSpells = (char) => own(char).filter(s => (levelOfEntry(char, s) || 0) > 0).map(idOf);
/** Mago: magias do grimório marcadas como preparadas. */
export const preparedFromBook = (char) => Book.preparedFromBook({ ...char, spells: own(char) });

/** Truques da lista da classe que podem ser escolhidos (sem os que já vêm de graça). */
export function availableCantrips(char) {
  const granted = new Set(grantedSpells(char).map(g => g.id));
  const expanded = expandedSpellIds(char);
  return Utils.spellCatalog(char).filter(s => s.level === 0 && onClassList(char, s, expanded) && !granted.has(s.id));
}

/** Magias de círculo 1..máximo da lista da classe que podem ser escolhidas. */
export function availableSpells(char) {
  const max = spellPlan(char).maxLevel;
  const granted = new Set(grantedSpells(char).map(g => g.id));
  const expanded = expandedSpellIds(char);
  return Utils.spellCatalog(char).filter(s => s.level >= 1 && s.level <= max && onClassList(char, s, expanded) && !granted.has(s.id));
}

/**
 * Escolhas inválidas: magia inexistente na regra, fora da lista da classe, de
 * círculo acima do que o personagem lança, ou repetida com algo que já vem de graça.
 * kind: 'cantrip' | 'spell'. Devolve [{ id, reason: 'unknown'|'list'|'level'|'granted', from? }].
 */
export function invalidChoices(char, kind) {
  const plan = spellPlan(char);
  const granted = new Map(grantedSpells(char).map(g => [g.id, g]));
  const expanded = expandedSpellIds(char);
  const out = [];
  for (const s of own(char)) {
    const d = spellDef(char, s.id);
    if (!d) { if (kind === 'spell') out.push({ id: s.id, reason: 'unknown' }); continue; }
    if ((d.level === 0) !== (kind === 'cantrip')) continue;
    if (!onClassList(char, d, expanded)) out.push({ id: s.id, reason: 'list' });
    else if (d.level > plan.maxLevel) out.push({ id: s.id, reason: 'level', level: d.level });
    else if (granted.has(s.id)) out.push({ id: s.id, reason: 'granted', level: d.level, from: granted.get(s.id).from });
  }
  return out;
}

/** Tira de char.spells as escolhas inválidas do tipo dado (mantém automáticas). */
export function withoutInvalid(char, kind) {
  const bad = new Set(invalidChoices(char, kind).map(x => x.id));
  return (char?.spells || []).filter(s => { const e = asEntry(s); return e.auto || !bad.has(e.id); });
}

function invalidIssue(char, x) {
  const n = nameOf(char, x.id);
  const c = className(char);
  if (x.reason === 'unknown') return b(`"${x.id}" não existe nesta regra; tire-a da seleção.`, `"${x.id}" doesn't exist in these rules; remove it.`);
  if (x.reason === 'list') return b(`${n.pt} não é da lista de magias da classe ${c.pt}; tire-a da seleção.`, `${n.en} isn't on the ${c.en} spell list; remove it.`);
  if (x.reason === 'level') {
    const max = spellPlan(char).maxLevel;
    return b(`${n.pt} é de ${x.level}º círculo; agora você só lança até o ${max}º. Tire-a da seleção.`,
      `${n.en} is level ${x.level}; right now you can only cast up to level ${max}. Remove it.`);
  }
  return b(`Você já ganha ${n.pt} de ${x.from?.pt}; troque por ${x.level === 0 ? 'outro' : 'outra'} para não desperdiçar a vaga.`,
    `You already get ${n.en} from ${x.from?.en}; swap it for another so you don't waste the slot.`);
}

function countIssue(n, of, what) {
  if (n < of) {
    const k = of - n;
    return b(`Escolha mais ${k} ${plural(k, what.pt[0], what.pt[1])} (${n}/${of}).`, `Pick ${k} more ${plural(k, what.en[0], what.en[1])} (${n}/${of}).`);
  }
  if (n > of) {
    const k = n - of;
    return b(`Você marcou ${plural(k, what.pt[0], what.pt[1])} demais: tire ${k} (${n}/${of}).`, `Too many ${what.en[1]}: remove ${k} (${n}/${of}).`);
  }
  return null;
}

/** Pendências da etapa de truques (linguagem simples). */
export function cantripIssues(char) {
  const plan = spellPlan(char);
  if (plan.cantrips <= 0) return [];
  const bad = invalidChoices(char, 'cantrip');
  const badIds = new Set(bad.map(x => x.id));
  const n = chosenCantrips(char).filter(id => !badIds.has(id)).length;
  const issues = [...duplicateGrantIssues(char, 'cantrip'), ...bad.map(x => invalidIssue(char, x))];
  const c = countIssue(n, plan.cantrips, { pt: ['truque', 'truques'], en: ['cantrip', 'cantrips'] });
  if (c) issues.push(c);
  return issues;
}

/** Pendências da etapa de magias de círculo 1+ (grimório e preparadas no Mago). */
export function spellIssues(char) {
  const plan = spellPlan(char);
  if (plan.leveled <= 0 && plan.spellbook <= 0) return [];
  const bad = invalidChoices(char, 'spell');
  const badIds = new Set(bad.map(x => x.id));
  const issues = [...duplicateGrantIssues(char, 'spell'), ...bad.map(x => invalidIssue(char, x))];
  const ok = chosenSpells(char).filter(id => !badIds.has(id));
  if (plan.book) {
    const c1 = countIssue(ok.length, plan.spellbook, { pt: ['magia no grimório', 'magias no grimório'], en: ['spellbook spell', 'spellbook spells'] });
    if (c1) issues.push(c1);
    const prepared = preparedFromBook(char).filter(id => !badIds.has(id)).length;
    const c2 = countIssue(prepared, plan.leveled, { pt: ['magia preparada (aba "2. Prepare para hoje")', 'magias preparadas (aba "2. Prepare para hoje")'], en: ['prepared spell ("2. Prepare for today" tab)', 'prepared spells ("2. Prepare for today" tab)'] });
    if (c2) issues.push(c2);
  } else {
    const what = plan.mode === 'prepared'
      ? { pt: ['magia preparada', 'magias preparadas'], en: ['prepared spell', 'prepared spells'] }
      : { pt: ['magia conhecida', 'magias conhecidas'], en: ['known spell', 'known spells'] };
    const c = countIssue(ok.length, plan.leveled, what);
    if (c) issues.push(c);
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Aplicar escolhas (devolvem a nova lista de magias, ou null se não pode)
// ---------------------------------------------------------------------------
/** Marca/desmarca um truque da classe. Nunca aceita truque fora da lista nem acima do limite. */
export function toggleCantrip(char, id) {
  const spells = char?.spells || [];
  const has = spells.some(s => !asEntry(s).auto && idOf(s) === id);
  if (has) return spells.filter(s => asEntry(s).auto || idOf(s) !== id);
  if (!availableCantrips(char).some(s => s.id === id)) return null;
  const badIds = new Set(invalidChoices(char, 'cantrip').map(x => x.id));
  if (chosenCantrips(char).filter(x => !badIds.has(x)).length >= spellPlan(char).cantrips) return null;
  return [...spells, { id, prepared: true }];
}

/** Marca/desmarca uma magia de círculo 1+ (no Mago: entra/sai do grimório). */
export function toggleSpell(char, id) {
  const plan = spellPlan(char);
  const spells = char?.spells || [];
  const has = spells.some(s => !asEntry(s).auto && idOf(s) === id);
  if (has) return plan.book ? Book.removeFromSpellbook(char, id) : spells.filter(s => asEntry(s).auto || idOf(s) !== id);
  if (!availableSpells(char).some(s => s.id === id)) return null;
  const badIds = new Set(invalidChoices(char, 'spell').map(x => x.id));
  const n = chosenSpells(char).filter(x => !badIds.has(x)).length;
  if (n >= (plan.book ? plan.spellbook : plan.leveled)) return null;
  return plan.book ? Book.addToSpellbook(char, [id]) : [...spells, { id, prepared: true }];
}

/** Mago: prepara/desprepara uma magia do grimório (respeita o limite). */
export function togglePrepared(char, id) {
  const plan = spellPlan(char);
  if (!plan.book) return null;
  return Book.togglePreparedInBook(char, id, plan.leveled);
}

/**
 * "Escolher por mim": completa as vagas com as sugestões (mantém o que já foi
 * escolhido). kind: 'cantrip' | 'spell'. No Mago também prepara as primeiras.
 */
export function fillRecommended(char, kind) {
  let cur = { ...char, spells: withoutInvalid(char, kind) };
  const plan = spellPlan(cur);
  if (kind === 'cantrip') {
    const pool = [...beginnerCantrips(cur), ...availableCantrips(cur).map(s => s.id)];
    for (const id of pool) {
      if (chosenCantrips(cur).length >= plan.cantrips) break;
      if (chosenCantrips(cur).includes(id)) continue;
      const next = toggleCantrip(cur, id);
      if (next) cur = { ...cur, spells: next };
    }
    return cur.spells;
  }
  const want = plan.book ? plan.spellbook : plan.leveled;
  const pool = [...recommendedSpells(cur), ...availableSpells(cur).filter(s => s.level === 1).map(s => s.id)];
  for (const id of pool) {
    if (chosenSpells(cur).length >= want) break;
    if (chosenSpells(cur).includes(id)) continue;
    const next = toggleSpell(cur, id);
    if (next) cur = { ...cur, spells: next };
  }
  if (plan.book) {
    const order = [...recommendedSpells(cur), ...chosenSpells(cur)];
    for (const id of [...new Set(order)]) {
      if (preparedFromBook(cur).length >= plan.leveled) break;
      if (!chosenSpells(cur).includes(id) || preparedFromBook(cur).includes(id)) continue;
      const next = togglePrepared(cur, id);
      if (next) cur = { ...cur, spells: next };
    }
  }
  return cur.spells;
}

// ---------------------------------------------------------------------------
// Ficha: origem de cada entrada e magias fora da lista
// ---------------------------------------------------------------------------
/** Origem de uma entrada de talento/espécie ({ from, ability }) ou null. */
export function grantSource(char, entry) {
  const e = asEntry(entry);
  if (!e?.auto || !(e.feat || e.species)) return null;
  return grantedSpells(char).find(g => g.id === e.id && g.source === (e.feat ? 'feat' : 'species')) || null;
}

/** Entradas da classe (não automáticas) fora da lista dela — sobras de outra classe. */
export function offListEntries(char) {
  const expanded = expandedSpellIds(char);
  return own(char).filter(s => { const d = spellDef(char, s.id); return d && !onClassList(char, d, expanded); });
}
