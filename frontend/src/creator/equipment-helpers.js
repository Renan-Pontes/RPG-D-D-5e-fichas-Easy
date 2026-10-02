/*
 * Equipamento inicial da criação (funções puras, sem React). Ver README.md.
 *
 * O jogador escolhe um pacote da classe (char.creation.classPack) e um do
 * antecedente (char.creation.backgroundPack). applyStartingEquipment recalcula
 * weapons / armor / hasShield / equipment / coins a partir dessas escolhas:
 *   - itens dos pacotes levam from: 'classPack' | 'backgroundPack' e são
 *     trocados (não duplicados) quando a escolha muda;
 *   - itens com outra origem (ex.: from: 'manual') ficam intactos;
 *   - armadura, escudo e ouro aplicados ficam em char.creation.equipApplied
 *     para que trocar de pacote desfaça só o que o pacote anterior colocou.
 */
import Utils from '../../utils.js';
import SRD from '../../data/srd.js';
import { tName } from '../../data/i18n.js';
import { SHARED } from '../../data/class-options/shared.js';
import {
  classStart, backgroundStart, packFor, startingTools, toolName, isArmorProficient, isWeaponProficient,
} from './start-data.js';

const b = (pt, en) => ({ pt, en });
const rv = (char) => (char?.rulesVersion === '2014' ? '2014' : '2024');
const pick = (lang, o) => (o ? (lang === 'pt' ? o.pt : o.en) ?? o.pt : '');
export const PACK_SOURCES = ['classPack', 'backgroundPack'];

// ---------------------------------------------------------------------------
// Opções e escolhas
// ---------------------------------------------------------------------------
export const classPackOptions = (char) => classStart(char)?.equipment || [];
export const backgroundPackOptions = (char) => backgroundStart(char)?.equipment || [];

/** Pacote só de ouro (sem itens). */
export const isGoldOnly = (pack) => !!pack && !(pack.items || []).length;

/**
 * Pacotes efetivamente escolhidos. Em 2014 o antecedente tem um único pacote
 * (aplicado sozinho); a riqueza inicial em ouro da classe (replacesBackground)
 * substitui o pacote do antecedente.
 */
export function selectedPacks(char) {
  const classOpts = classPackOptions(char);
  const bgOpts = backgroundPackOptions(char);
  const classPack = packFor({ equipment: classOpts }, char?.creation?.classPack);
  const bgReplaced = !!classPack?.replacesBackground;
  const bgId = char?.creation?.backgroundPack || (bgOpts.length === 1 ? bgOpts[0].id : null);
  const backgroundPack = bgReplaced ? null : packFor({ equipment: bgOpts }, bgId);
  return { classPack, backgroundPack, bgReplaced, needsClassChoice: classOpts.length > 0, needsBackgroundChoice: !bgReplaced && bgOpts.length > 1 };
}

/** Assinatura das escolhas (sem idioma): mudou → o equipamento precisa ser recalculado. */
export function equipmentSignature(char) {
  const c = char?.creation || {};
  return [rv(char), char?.className || '', c.classPack || '', char?.background || '', c.backgroundPack || '',
    (char?.toolProfs || []).join(',')].join('|');
}

// ---------------------------------------------------------------------------
// Nomes e estatísticas
// ---------------------------------------------------------------------------
const DMG = { bludgeoning: b('concussão', 'bludgeoning'), piercing: b('perfuração', 'piercing'), slashing: b('corte', 'slashing') };
const PROPS = {
  finesse: b('Acuidade', 'Finesse'), light: b('Leve', 'Light'), thrown: b('Arremesso', 'Thrown'),
  'two-handed': b('Duas Mãos', 'Two-Handed'), versatile: b('Versátil', 'Versatile'), heavy: b('Pesada', 'Heavy'),
  reach: b('Alcance', 'Reach'), ammo: b('Munição', 'Ammunition'), loading: b('Recarga', 'Loading'), special: b('Especial', 'Special'),
};
const ARMOR_TYPE = { light: b('leve', 'light'), medium: b('média', 'medium'), heavy: b('pesada', 'heavy'), shield: b('escudo', 'shield') };

export const damageTypeLabel = (t, lang) => pick(lang, DMG[t]) || t || '';
export const propLabel = (p, lang) => pick(lang, PROPS[p]) || p;
export const armorTypeLabel = (t, lang) => pick(lang, ARMOR_TYPE[t]) || t || '';

/** Dano com as duas mãos de uma arma Versátil: um dado acima (1d6→1d8, 1d8→1d10). SRD 5.1 / 5.2.1. */
export function versatileDamage(def) {
  if (!def || !(def.props || []).includes('versatile')) return null;
  const m = /^(\d+)d(\d+)$/.exec(def.damage || '');
  if (!m) return null;
  const next = { 4: 6, 6: 8, 8: 10, 10: 12 }[+m[2]];
  return next ? `${m[1]}d${next}` : null;
}

/** "20/60 pés" (en) ou "6/18 m" (pt; 5 pés = 1,5 m). */
export function rangeLabel(range, lang) {
  if (!range) return '';
  if (lang !== 'pt') return `${range} ft`;
  return `${String(range).split('/').map(n => String(Math.round(+n * 0.3 * 10) / 10).replace('.', ',')).join('/')} m`;
}

export const masteryInfo = (id) => SHARED.masteryProperties?.[id] || null;

/** Entrada de arma no formato da ficha (char.weapons), com estatísticas da regra da ficha. */
export function weaponEntry(id, char, lang = 'pt', extra = {}) {
  const rules = rv(char);
  const def = SRD.weaponFor(id, rules);
  if (!def) return null;
  const qty = extra.qty || 1;
  const vers = versatileDamage(def);
  return {
    id: def.id,
    name: tName('weapon', def.id, lang) + (qty > 1 ? ` ×${qty}` : ''),
    damage: def.damage,
    dmgType: def.dmgType,
    props: [...(def.props || [])],
    ...(def.range ? { range: def.range } : {}),
    ...(vers ? { versatile: vers } : {}),
    ...(rules === '2024' && def.mastery ? { mastery: def.mastery } : {}),
    ...(qty > 1 ? { qty } : {}),
    ...(extra.note ? { note: pick(lang, extra.note) } : {}),
    ...(extra.from ? { from: extra.from } : {}),
  };
}

/** Uma linha curta explicando a arma: "1d8 corte · Versátil (1d10 com duas mãos) · Maestria: Enfraquecer". */
export function weaponSummary(id, char, lang = 'pt') {
  const def = SRD.weaponFor(id, rv(char));
  if (!def) return '';
  const parts = [`${def.damage} ${damageTypeLabel(def.dmgType, lang)}`];
  const vers = versatileDamage(def);
  const props = (def.props || []).map(p => (p === 'versatile' && vers
    ? `${propLabel(p, lang)} (${vers} ${lang === 'pt' ? 'com duas mãos' : 'two-handed'})`
    : propLabel(p, lang)));
  if (props.length) parts.push(props.join(', '));
  if (def.range) parts.push(`${lang === 'pt' ? 'distância' : 'range'} ${rangeLabel(def.range, lang)}`);
  if (rv(char) === '2024' && def.mastery) {
    const m = masteryInfo(def.mastery);
    parts.push(`${lang === 'pt' ? 'Maestria' : 'Mastery'}: ${m ? pick(lang, m.name) : def.mastery}`);
  }
  return parts.join(' · ');
}

/** Ferramenta concreta escolhida na proficiência para um item "a que você escolheu". */
export function chosenToolFor(char, source) {
  const choice = startingTools(char).choices.find(c => c.source === source);
  if (!choice) return null;
  const fixed = new Set(startingTools(char).fixed);
  const explicit = char?.creation?.toolChoices?.[source];
  const pool = Array.isArray(explicit) && explicit.length ? explicit : (char?.toolProfs || []);
  return pool.find(id => choice.from.includes(id) && !fixed.has(id)) || null;
}

/** Nome de um item de pacote (resolve "ferramenta escolhida" quando já há escolha). */
export function itemName(it, char, lang = 'pt') {
  if (it.kind === 'weapon') return tName('weapon', it.id, lang);
  if (it.kind === 'armor') return tName('armor', it.id, lang);
  if (it.kind === 'shield') return lang === 'pt' ? 'Escudo' : 'Shield';
  if (it.toolChoice) {
    const id = chosenToolFor(char, it.toolChoice);
    if (id) return toolName(id, lang);
  }
  return pick(lang, it.name);
}

// Conteúdo dos pacotes de aventura (resumo próprio do SRD 5.2.1, "Adventuring Gear").
export const PACK_CONTENTS = {
  burglar: b('mochila, rolamentos, sino, velas, pé de cabra, lanterna, óleo, comida para 5 dias, corda, pederneira e cantil',
    'backpack, ball bearings, bell, candles, crowbar, lantern, oil, 5 days of rations, rope, tinderbox and waterskin'),
  diplomat: b('baú, roupas finas, tinta e penas, lamparina, estojos de mapa, óleo, papel, pergaminho, perfume e pederneira',
    'chest, fine clothes, ink and pens, lamp, map cases, oil, paper, parchment, perfume and tinderbox'),
  dungeoneer: b('mochila, estrepes, pé de cabra, óleo, comida para 10 dias, corda, pederneira, 10 tochas e cantil',
    'backpack, caltrops, crowbar, oil, 10 days of rations, rope, tinderbox, 10 torches and waterskin'),
  entertainer: b('mochila, saco de dormir, sino, lanterna, fantasias, espelho, óleo, comida para 9 dias, pederneira e cantil',
    'backpack, bedroll, bell, lantern, costumes, mirror, oil, 9 days of rations, tinderbox and waterskin'),
  explorer: b('mochila, saco de dormir, óleo, comida para 10 dias, corda, pederneira, 10 tochas e cantil',
    'backpack, bedroll, oil, 10 days of rations, rope, tinderbox, 10 torches and waterskin'),
  priest: b('mochila, cobertor, água benta, lamparina, comida para 7 dias, túnica e pederneira',
    'backpack, blanket, holy water, lamp, 7 days of rations, robe and tinderbox'),
  scholar: b('mochila, livro, tinta e pena, lamparina, óleo, pergaminho e pederneira',
    'backpack, book, ink and pen, lamp, oil, parchment and tinderbox'),
};

/**
 * Linhas de um pacote para mostrar ao jogador: { kind, text, hint?, warn? }.
 * hint = explicação curta (CA, dano, conteúdo do kit); warn = sem treino/proficiência.
 */
export function packLines(pack, char, lang = 'pt') {
  const out = [];
  for (const it of pack?.items || []) {
    const qty = it.qty || 1;
    const name = itemName(it, char, lang);
    const text = qty > 1 ? `${qty} × ${name}` : name;
    if (it.kind === 'armor') {
      const a = SRD.ARMOR.find(x => x.id === it.id);
      const hint = a ? armorHint(a, lang) : '';
      out.push({ kind: 'armor', text, hint, warn: !isArmorProficient(char, it.id) });
    } else if (it.kind === 'shield') {
      out.push({ kind: 'shield', text, hint: lang === 'pt' ? '+2 na CA, ocupa uma mão' : '+2 AC, uses one hand', warn: !isArmorProficient(char, 'shield') });
    } else if (it.kind === 'weapon') {
      const note = it.note ? ` (${pick(lang, it.note)})` : '';
      out.push({ kind: 'weapon', text: text + note, hint: weaponSummary(it.id, char, lang), warn: !isWeaponProficient(char, it.id) });
    } else {
      out.push({ kind: 'item', text, hint: it.pack ? pick(lang, PACK_CONTENTS[it.pack]) : '' });
    }
  }
  return out;
}

export function armorHint(a, lang = 'pt') {
  const pt = lang === 'pt';
  const base = a.type === 'light' ? (pt ? `CA ${a.ac} + DES` : `AC ${a.ac} + DEX`)
    : a.type === 'medium' ? (pt ? `CA ${a.ac} + DES (máx. +2)` : `AC ${a.ac} + DEX (max +2)`)
      : (pt ? `CA ${a.ac}` : `AC ${a.ac}`);
  const parts = [`${pt ? 'armadura' : ''} ${armorTypeLabel(a.type, lang)}${pt ? '' : ' armor'}`.trim(), base];
  if (a.strReq) parts.push(pt ? `pede FOR ${a.strReq}` : `needs STR ${a.strReq}`);
  if (a.stealth === 'disadv') parts.push(pt ? 'desvantagem em Furtividade' : 'Stealth disadvantage');
  return parts.join(' · ');
}

// ---------------------------------------------------------------------------
// Aplicação dos pacotes
// ---------------------------------------------------------------------------
function packPieces(pack, from, char, lang) {
  const weapons = []; const equipment = [];
  let armor = null; let shield = false;
  for (const it of pack?.items || []) {
    if (it.kind === 'armor') armor = it.id;
    else if (it.kind === 'shield') shield = true;
    else if (it.kind === 'weapon') {
      const w = weaponEntry(it.id, char, lang, { qty: it.qty, note: it.note, from });
      if (w) weapons.push(w);
    } else {
      equipment.push({ name: itemName(it, char, lang), qty: it.qty || 1, from });
    }
  }
  return { weapons, equipment, armor, shield, gp: pack?.gp || 0 };
}

/**
 * Recalcula o equipamento a partir de char.creation.classPack / backgroundPack.
 * Pura e idempotente: aplicar duas vezes dá o mesmo resultado; trocar de pacote
 * remove só o que o pacote anterior colocou. Devolve o char inteiro atualizado.
 */
export function applyStartingEquipment(char, lang = 'pt') {
  const creation = { ...(char.creation || {}) };
  const prev = creation.equipApplied || { armor: null, shield: false, gp: 0 };
  const { classPack, backgroundPack } = selectedPacks(char);
  // Escolha que não existe mais (ex.: trocou de classe) é descartada.
  if (creation.classPack && !classPack) delete creation.classPack;
  if (creation.backgroundPack && !backgroundPack && !packFor({ equipment: backgroundPackOptions(char) }, creation.backgroundPack)) delete creation.backgroundPack;

  const c = packPieces(classPack, 'classPack', char, lang);
  const g = packPieces(backgroundPack, 'backgroundPack', char, lang);
  const keep = (x) => !PACK_SOURCES.includes(x?.from);

  const packArmor = c.armor || g.armor || null;
  const packShield = c.shield || g.shield;
  // Armadura/escudo: o pacote manda; sem pacote, só tira o que o pacote anterior tinha posto.
  let armor = char.armor ?? null;
  if (packArmor) armor = packArmor;
  else if (prev.armor && armor === prev.armor) armor = null;
  let hasShield = !!char.hasShield;
  if (packShield) hasShield = true;
  else if (prev.shield && hasShield) hasShield = false;

  const gp = c.gp + g.gp;
  const coins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, ...(char.coins || {}) };
  coins.gp = Math.max(0, (+coins.gp || 0) - (prev.gp || 0) + gp);

  creation.equipApplied = { armor: packArmor, shield: packShield, gp };
  creation.equipSig = equipmentSignature({ ...char, creation });
  creation.equipLang = lang;
  return {
    ...char,
    armor,
    hasShield,
    weapons: [...(char.weapons || []).filter(keep), ...c.weapons, ...g.weapons],
    equipment: [...(char.equipment || []).filter(keep), ...c.equipment, ...g.equipment],
    coins,
    creation,
  };
}

/**
 * Tira um pacote ('classPack' | 'backgroundPack') e devolve o patch com armas,
 * armadura, escudo, itens e ouro recalculados — usado ao trocar de classe ou de
 * antecedente, para não sobrar item nem ouro do pacote antigo.
 */
export function dropPack(char, key) {
  const creation = { ...(char.creation || {}) };
  delete creation[key];
  const next = applyStartingEquipment({ ...char, creation }, creation.equipLang || 'pt');
  return { weapons: next.weapons, equipment: next.equipment, armor: next.armor, hasShield: next.hasShield, coins: next.coins, creation: next.creation };
}

/** Precisa recalcular (escolhas mudaram desde a última aplicação, ou trocou o idioma)? */
export const needsReapply = (char, lang) =>
  (char?.creation?.equipSig || null) !== equipmentSignature(char) || (!!char?.creation?.equipSig && char.creation.equipLang !== lang);

// ---------------------------------------------------------------------------
// Avisos
// ---------------------------------------------------------------------------
/** Força total (atributo + bônus). */
const strScore = (char) => Utils.abilityWithRace({ abilities: {}, ...char }, 'str');

/**
 * Avisos sobre o que está vestido/empunhado agora: { id, pt, en }.
 * - armadura/escudo sem treino;  - Força abaixo do pedido pela armadura pesada;
 * - armadura num Bárbaro/Monge (perde Defesa sem Armadura);  - armas sem proficiência.
 */
export function equipmentWarnings(char) {
  const out = [];
  const a = char.armor ? SRD.ARMOR.find(x => x.id === char.armor) : null;
  if (a && !isArmorProficient(char, a.id)) {
    out.push({ id: 'armorTraining', pt: `Sem treino em armadura ${armorTypeLabel(a.type, 'pt')}: desvantagem em testes, salvaguardas e ataques de Força ou Destreza, e não pode conjurar magias.`,
      en: `No ${armorTypeLabel(a.type, 'en')} armor training: disadvantage on Strength and Dexterity checks, saves and attacks, and you can't cast spells.` });
  }
  if (char.hasShield && !isArmorProficient(char, 'shield')) {
    out.push({ id: 'shieldTraining', pt: 'Sem treino com escudo: desvantagem em testes, salvaguardas e ataques de Força ou Destreza, e não pode conjurar magias.',
      en: "No shield training: disadvantage on Strength and Dexterity checks, saves and attacks, and you can't cast spells." });
  }
  if (a?.strReq) {
    const str = strScore(char);
    const dwarf14 = rv(char) === '2014' && String(char.race || '').startsWith('dwarf');
    if (str < a.strReq && !dwarf14) {
      out.push({ id: 'strReq', pt: `Sua Força é ${str}, mas esta armadura pede ${a.strReq}: você anda 3 m (10 pés) a menos por turno enquanto a usa.`,
        en: `Your Strength is ${str} but this armor needs ${a.strReq}: your Speed drops by 10 feet while wearing it.` });
    }
  }
  const cls = char.className;
  if (a && (cls === 'barbarian' || cls === 'monk')) {
    out.push({ id: 'unarmored', pt: 'Sua classe tem Defesa sem Armadura: vestindo armadura você perde esse bônus (e o Monge perde também as Artes Marciais com armadura).',
      en: 'Your class has Unarmored Defense: wearing armor turns it off (Monks also lose Martial Arts in armor).' });
  } else if (!a && char.hasShield && cls === 'monk') {
    out.push({ id: 'monkShield', pt: 'Monge com escudo perde a Defesa sem Armadura.', en: 'A Monk carrying a shield loses Unarmored Defense.' });
  }
  const nonProf = (char.weapons || []).filter(w => w.id && !isWeaponProficient(char, w.id));
  if (nonProf.length) {
    const names = nonProf.map(w => w.name).join(', ');
    out.push({ id: 'weaponProf', pt: `Sem proficiência com: ${names}. Você ainda pode usar, mas não soma o Bônus de Proficiência no ataque.`,
      en: `Not proficient with: ${names}. You can still use them, but you don't add your Proficiency Bonus to the attack.` });
  }
  return out;
}

/** CA atual e, para comparação, a CA sem armadura (útil para Bárbaro/Monge). */
export function acPreview(char) {
  return { ac: Utils.computeAc(char), unarmored: Utils.computeAc({ ...char, armor: null }) };
}

// ---------------------------------------------------------------------------
// Pendências (etapa)
// ---------------------------------------------------------------------------
export function equipmentIssues(char) {
  const out = [];
  const s = selectedPacks(char);
  const creation = char?.creation || {};
  if (s.needsClassChoice && !s.classPack) {
    out.push({ pt: 'Escolha o equipamento da sua classe (um dos pacotes).', en: 'Pick your class equipment (one of the packages).' });
  }
  if (s.needsBackgroundChoice && !s.backgroundPack) {
    out.push({ pt: 'Escolha o equipamento do seu antecedente (pacote ou ouro).', en: 'Pick your background equipment (package or gold).' });
  }
  if (!out.length && (s.classPack || s.backgroundPack) && creation.equipSig !== equipmentSignature(char)) {
    out.push({ pt: 'Sua classe ou antecedente mudou: abra a etapa Equipamento para atualizar os itens.',
      en: 'Your class or background changed: open the Equipment step to update your items.' });
  }
  return out;
}
