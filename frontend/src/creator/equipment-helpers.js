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
import { optionPool, findOption } from '../progression/options.js';
import {
  classStart, backgroundStart, packFor, startingTools, toolName, isArmorProficient, isWeaponProficient,
  packProficiencyIssues,
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
  const bgTools = Array.isArray(c.toolChoices?.background) ? c.toolChoices.background : [];
  return [rv(char), char?.className || '', c.classPack || '', char?.background || '', c.backgroundPack || '',
    (char?.toolProfs || []).join(','), classToolIds(char).join(','), bgTools.join(',')].join('|');
}

// ---------------------------------------------------------------------------
// Nomes e estatísticas
// ---------------------------------------------------------------------------
// Mesmos nomes usados nos talentos e nas magias ("dano contundente, perfurante e cortante").
const DMG = { bludgeoning: b('contundente', 'bludgeoning'), piercing: b('perfurante', 'piercing'), slashing: b('cortante', 'slashing') };
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

/**
 * Ferramentas/instrumentos escolhidos nas Escolhas da classe (char.classOptions,
 * pools sem `kind` com grants.tools: instrumentos do Bardo, ferramenta do Monge…).
 * Mesma lógica de class-helpers.js classToolPicks (copiada para evitar import circular).
 */
export function classToolIds(char) {
  const cls = char?.className;
  if (!cls) return [];
  const out = [];
  for (const p of char.classOptions || []) {
    if (!p || p.classId !== cls) continue;
    let o = null;
    try { o = !optionPool(cls, p.pool)?.kind ? findOption(cls, p.pool, p.id) : null; } catch { o = null; }
    for (const t of o?.grants?.tools || []) if (!out.includes(t)) out.push(t);
  }
  return out;
}

/**
 * Ferramenta concreta escolhida na proficiência para um item "a que você escolheu"
 * (toolChoice: 'class' | 'background'), ou null se ainda não escolheu.
 * Fontes, nesta ordem: creation.toolChoices[source], Escolhas da classe (classe), toolProfs.
 */
export function chosenToolFor(char, source) {
  const choice = startingTools(char).choices.find(c => c.source === source);
  if (!choice) return null;
  const fixed = new Set(startingTools(char).fixed);
  const explicit = char?.creation?.toolChoices?.[source];
  const fromClass = classToolIds(char);
  let pool;
  if (Array.isArray(explicit) && explicit.length) pool = explicit;
  else if (source === 'class') pool = [...fromClass, ...(char?.toolProfs || [])];
  else pool = (char?.toolProfs || []).filter(id => !fromClass.includes(id)); // não reaproveita a da classe
  return pool.find(id => choice.from.includes(id) && !fixed.has(id)) || null;
}

/** Item "ferramenta escolhida" que ainda não tem ferramenta escolhida. */
export const isUnresolvedToolItem = (it, char) => !!it?.toolChoice && !chosenToolFor(char, it.toolChoice);

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

// Conteúdo dos pacotes de aventura, por regra (lista própria, sem texto copiado):
// 2024 = SRD 5.2.1 "Adventuring Gear"; 2014 = SRD 5.1 / PHB 2014 "Equipment Packs".
export const PACK_CONTENTS = {
  '2024': {
    burglar: b('mochila, rolamentos, sino, 10 velas, pé de cabra, lanterna coberta, 7 frascos de óleo, comida para 5 dias, corda, pederneira e cantil',
      'backpack, ball bearings, bell, 10 candles, crowbar, hooded lantern, 7 flasks of oil, 5 days of rations, rope, tinderbox and waterskin'),
    diplomat: b('baú, roupas finas, tinta, 5 penas de escrever, lamparina, 2 estojos de mapa, 4 frascos de óleo, 5 folhas de papel, 5 folhas de pergaminho, perfume e pederneira',
      'chest, fine clothes, ink, 5 ink pens, lamp, 2 map or scroll cases, 4 flasks of oil, 5 sheets of paper, 5 sheets of parchment, perfume and tinderbox'),
    dungeoneer: b('mochila, estrepes, pé de cabra, 2 frascos de óleo, comida para 10 dias, corda, pederneira, 10 tochas e cantil',
      'backpack, caltrops, crowbar, 2 flasks of oil, 10 days of rations, rope, tinderbox, 10 torches and waterskin'),
    entertainer: b('mochila, saco de dormir, sino, lanterna furta-fogo, 3 fantasias, espelho, 8 frascos de óleo, comida para 9 dias, pederneira e cantil',
      'backpack, bedroll, bell, bullseye lantern, 3 costumes, mirror, 8 flasks of oil, 9 days of rations, tinderbox and waterskin'),
    explorer: b('mochila, saco de dormir, 2 frascos de óleo, comida para 10 dias, corda, pederneira, 10 tochas e cantil',
      'backpack, bedroll, 2 flasks of oil, 10 days of rations, rope, tinderbox, 10 torches and waterskin'),
    priest: b('mochila, cobertor, água benta, lamparina, comida para 7 dias, túnica e pederneira',
      'backpack, blanket, holy water, lamp, 7 days of rations, robe and tinderbox'),
    scholar: b('mochila, livro, tinta, pena de escrever, lamparina, 10 frascos de óleo, 10 folhas de pergaminho e pederneira',
      'backpack, book, ink, ink pen, lamp, 10 flasks of oil, 10 sheets of parchment and tinderbox'),
  },
  '2014': {
    burglar: b('mochila, saco com 1.000 rolamentos, 3 m de barbante, sino, 5 velas, pé de cabra, martelo, 10 pítons, lanterna coberta, 2 frascos de óleo, comida para 5 dias, pederneira, cantil e 15 m de corda',
      'backpack, bag of 1,000 ball bearings, 10 feet of string, bell, 5 candles, crowbar, hammer, 10 pitons, hooded lantern, 2 flasks of oil, 5 days of rations, tinderbox, waterskin and 50 feet of hempen rope'),
    diplomat: b('baú, 2 estojos para mapas e pergaminhos, roupas finas, vidro de tinta, pena de escrever, lamparina, 2 frascos de óleo, 5 folhas de papel, vidro de perfume, lacre e sabão',
      'chest, 2 cases for maps and scrolls, fine clothes, bottle of ink, ink pen, lamp, 2 flasks of oil, 5 sheets of paper, vial of perfume, sealing wax and soap'),
    dungeoneer: b('mochila, pé de cabra, martelo, 10 pítons, 10 tochas, pederneira, comida para 10 dias, cantil e 15 m de corda',
      'backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days of rations, waterskin and 50 feet of hempen rope'),
    entertainer: b('mochila, saco de dormir, 2 fantasias, 5 velas, comida para 5 dias, cantil e kit de disfarce',
      'backpack, bedroll, 2 costumes, 5 candles, 5 days of rations, waterskin and disguise kit'),
    explorer: b('mochila, saco de dormir, kit de refeição, pederneira, 10 tochas, comida para 10 dias, cantil e 15 m de corda',
      'backpack, bedroll, mess kit, tinderbox, 10 torches, 10 days of rations, waterskin and 50 feet of hempen rope'),
    priest: b('mochila, cobertor, 10 velas, pederneira, caixa de esmolas, 2 blocos de incenso, incensário, vestes, comida para 2 dias e cantil',
      'backpack, blanket, 10 candles, tinderbox, alms box, 2 blocks of incense, censer, vestments, 2 days of rations and waterskin'),
    scholar: b('mochila, livro de estudo, vidro de tinta, pena de escrever, 10 folhas de pergaminho, saquinho de areia e faca pequena',
      'backpack, book of lore, bottle of ink, ink pen, 10 sheets of parchment, little bag of sand and small knife'),
  },
};

/** Conteúdo de um pacote de aventura ('explorer', 'priest'…) na regra da ficha. */
export const packContents = (key, char, lang = 'pt') => pick(lang, PACK_CONTENTS[rv(char)][key]);

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
    } else if (isUnresolvedToolItem(it, char)) {
      out.push({ kind: 'item', text, hint: it.toolChoice === 'class'
        ? (lang === 'pt' ? 'vem o que você escolher em Escolhas da classe' : 'you get the one you pick in Class choices')
        : (lang === 'pt' ? 'vem o que você escolher na etapa Antecedente' : 'you get the one you pick in the Background step') });
    } else {
      out.push({ kind: 'item', text, hint: it.pack ? packContents(it.pack, char, lang) : '' });
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
/** Peças de um pacote: armas e itens ainda "crus" (juntados depois com mergePieces). */
function packPieces(pack, from, char, lang) {
  const weapons = []; const equipment = [];
  let armor = null; let shield = false;
  for (const it of pack?.items || []) {
    if (it.kind === 'armor') armor = it.id;
    else if (it.kind === 'shield') shield = true;
    else if (it.kind === 'weapon') weapons.push({ id: it.id, qty: it.qty || 1, note: it.note, from });
    else if (isUnresolvedToolItem(it, char)) continue; // nunca grava o texto "ferramenta escolhida"
    else equipment.push({ name: itemName(it, char, lang), qty: it.qty || 1, from });
  }
  return { weapons, equipment, armor, shield, gp: pack?.gp || 0 };
}

/** Junta armas (mesmo id) e itens (mesmo nome) repetidos da classe e do antecedente, somando a quantidade. */
function mergeBy(list, key) {
  const out = []; const seen = new Map();
  for (const x of list) {
    const k = key(x);
    if (k && seen.has(k)) { const y = seen.get(k); y.qty += x.qty; if (!y.note && x.note) y.note = x.note; continue; }
    const copy = { ...x };
    out.push(copy);
    if (k) seen.set(k, copy);
  }
  return out;
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
  const packWeapons = mergeBy([...c.weapons, ...g.weapons], w => w.id)
    .map(w => weaponEntry(w.id, char, lang, { qty: w.qty, note: w.note, from: w.from })).filter(Boolean);
  const packEquipment = mergeBy([...c.equipment, ...g.equipment], e => String(e.name || '').trim().toLowerCase())
    .map(e => ({ name: e.name, qty: e.qty, from: e.from }));
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
    weapons: [...(char.weapons || []).filter(keep), ...packWeapons],
    equipment: [...(char.equipment || []).filter(keep), ...packEquipment],
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
  const missing = masteriesWithoutWeapon(char);
  if (missing.length) {
    const pt = missing.map(id => tName('weapon', id, 'pt')).join(', ');
    const en = missing.map(id => tName('weapon', id, 'en')).join(', ');
    out.push({ id: 'masteryMismatch',
      pt: `Você escolheu Maestria em ${pt}, mas não terá ${missing.length > 1 ? 'essas armas' : 'essa arma'} com este equipamento. Volte em Escolhas da classe para trocar a Maestria, ou combine com o mestre comprar a arma com seu ouro.`,
      en: `You picked Weapon Mastery with ${en}, but this equipment doesn't include ${missing.length > 1 ? 'those weapons' : 'that weapon'}. Go back to Class choices to change your Mastery, or buy the weapon with your gold (ask your DM).` });
  }
  return out;
}

/** Armas com Maestria escolhida (classOptions pool 'weaponMastery') que o personagem não tem em char.weapons. */
export function masteriesWithoutWeapon(char) {
  const cls = char?.className;
  if (rv(char) !== '2024' || !cls) return [];
  const have = new Set((char.weapons || []).map(w => w?.id).filter(Boolean));
  return (char.classOptions || [])
    .filter(p => p && p.pool === 'weaponMastery' && (!p.classId || p.classId === cls) && typeof p.id === 'string')
    .map(p => p.id)
    .filter((id, i, arr) => arr.indexOf(id) === i && !have.has(id));
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
  for (const [pack, label] of [[s.classPack, b('da classe', 'class')], [s.backgroundPack, b('do antecedente', 'background')]]) {
    const bad = packProficiencyIssues(char, pack).filter(it => it.kind === 'armor' || it.kind === 'shield');
    if (!bad.length) continue;
    const names = (lang) => bad.map(it => (it.kind === 'shield' ? (lang === 'pt' ? 'Escudo' : 'Shield') : tName('armor', it.id, lang))).join(lang === 'pt' ? ' e ' : ' and ');
    out.push({ id: 'packArmorTraining',
      pt: `O pacote ${pack.id} ${label.pt} traz ${names('pt')}, mas você não tem treino para usar (com isso não conseguiria conjurar magias e teria desvantagem nos ataques). Escolha outro pacote na etapa Equipamento.`,
      en: `${label.en[0].toUpperCase()}${label.en.slice(1)} package ${pack.id} includes ${names('en')}, but you are not trained to use it (you couldn't cast spells and would have disadvantage on attacks). Pick another package in the Equipment step.` });
  }
  if (!out.length && (s.classPack || s.backgroundPack) && creation.equipSig !== equipmentSignature(char)) {
    out.push({ pt: 'Sua classe ou antecedente mudou: abra a etapa Equipamento para atualizar os itens.',
      en: 'Your class or background changed: open the Equipment step to update your items.' });
  }
  return out;
}
