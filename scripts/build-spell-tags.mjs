// Etiquetas das magias para o Raio-X do grupo (frontend/data/spell-tags.json).
//
// O catálogo de magias não tem tipo de dano, cura, controle nem área: só o texto. Este
// script lê o texto em inglês das duas regras (2014: SRD.SPELLS; 2024: SPELLS_2024) uma
// vez e grava as etiquetas; a revisão à mão está em FIX (2024 e o que vale para as duas)
// e FIX_2014 (só 2014). O app só lê o JSON (0 custo no servidor, nada em tempo de uso).
//
//   node scripts/build-spell-tags.mjs           grava frontend/data/spell-tags.json
//   node scripts/build-spell-tags.mjs --check   falha se o JSON estiver desatualizado
//
// Formato: { v, spells: { id: tags }, legacy: { id: tags } } — `spells` vale para 2024
// (e para as magias que só existem em 2014); `legacy` só traz as magias cuja leitura
// em 2014 é diferente (texto e dados mudaram entre as regras). tags:
//   dmg: ['fire', …]  tipos de dano que a magia causa      avg: dano médio por alvo
//   atk: 1 ataque mágico · save: 1 salvaguarda · half: 1 metade no sucesso
//   area: 1 atinge uma área (conta 2 alvos)                 rider: 1 dano só junto do ataque com arma
//   heal: cura média · hm: 1 soma o modificador de conjuração
//   ctl: 'single' | 'area' (condição, empurrão, terreno, velocidade)
//   mob: 1 movimento · soc: 1 social · exp: 1 exploração
// Magia sem nenhuma etiqueta fica de fora (conta como utilidade no Raio-X).
import { readFileSync, writeFileSync } from 'node:fs';
import SRD from '../frontend/data/srd.js';
import { SPELLS_2024 } from '../frontend/data/rules2024.js';
import { localizeLegacySpells } from '../frontend/data/spells-extra.js';

// O catálogo 2014 como o app o usa (resumos 2014 nas cópias de magias 2024): a ficha
// importa src/creator/spell-helpers.js, que faz o mesmo. Idempotente.
localizeLegacySpells(SRD.SPELLS);

const DAMAGE_TYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
const DT = DAMAGE_TYPES.join('|');
const RE_DMG = new RegExp(`(\\d+d\\d+)(?:\\s*\\+\\s*\\d+)?\\s+(${DT})\\b`, 'i');
const RE_DMG_TYPE = new RegExp(`\\b(${DT})\\s+damage\\b`, 'gi');
const RE_CHOOSE = /choose\s+((?:acid|cold|fire|lightning|poison|thunder|necrotic|radiant|psychic|force)(?:,?\s*(?:or\s+)?(?:acid|cold|fire|lightning|poison|thunder|necrotic|radiant|psychic|force))+)/i;
const RE_HEAL = /\bregains?\b[^.]*?(\d+d\d+)|\bheal(?:s|ing)?\s+(\d+d\d+)|\b(?:regains?|restores?|restoring)\s+(\d+)\s+hit points?/i;
const RE_HEAL_MOD = /plus your spellcasting ability modifier|\+\s*spellcasting mod/i;
const RE_CONTROL = /\b(charmed|frightened|paralyzed|restrained|incapacitated|stunned|prone|blinded|petrified|unconscious|grappled|banish(?:ed)?|fall asleep|asleep|pushed|push(?:es)?|difficult terrain|can't take reactions|follow the command|speed (?:is )?(?:reduced|halved|becomes 0|decreases)|speed -\d+|-\d+ (?:ft|feet) speed)\b/i;
// frases de proteção ("immune to the Frightened condition", "ends one condition") não são controle
const RE_PROTECT = /[^.]*\b(?:immune|immunity|can't be|advantage on saving throws against|advantage on saves against|ends? (?:the|one|any)|remove[sd]?|end one)\b[^.]*\./gi;
const RE_AREA = /\b\d+[- ](?:foot|ft)[- ]?(?:-?radius|-?long|-?wide)?\s*(?:radius|cone|cube|line|sphere|cylinder|emanation)\b|\beach creature (?:in|within)\b|\((?:\d+-ft|\d+-foot) (?:cone|cube|line|sphere|radius)/i;
const RE_RIDER = /extra \d+d\d+|\+\d+d\d+ damage|whenever you hit|from the attack/i;

const MOBILITY = ['mistyStep', 'jump', 'longstrider', 'expeditiousRetreat', 'fly', 'dimensionDoor', 'teleport', 'spiderClimb', 'haste', 'freedomOfMovement', 'thunderStep', 'farStep', 'windWalk', 'transportViaPlants', 'treeStride', 'gaseousForm', 'waterWalk', 'stepsOfTheWind', 'featherFall', 'levitate', 'blink', 'passwall', 'etherealness', 'teleportationCircle', 'wordOfRecall'];
const EXPLORE = ['detectMagic', 'findTraps', 'passWithoutTrace', 'locateObject', 'locateCreature', 'findFamiliar', 'darkvision', 'seeInvisibility', 'clairvoyance', 'speakWithAnimals', 'detectPoisonAndDisease', 'detectEvilAndGood', 'identify', 'light', 'dancingLights', 'knock', 'waterBreathing', 'guidance', 'arcaneEye', 'commune', 'communeWithNature', 'divination', 'augury', 'findTheWay', 'scrying', 'tongues', 'comprehendLanguages'];
const SOCIAL = ['charmPerson', 'friends', 'suggestion', 'zoneOfTruth', 'detectThoughts', 'calmEmotions', 'tongues', 'comprehendLanguages', 'enthrall', 'command', 'disguiseSelf', 'thaumaturgy', 'minorIllusion', 'charmMonster', 'massSuggestion', 'modifyMemory', 'glibness', 'heroesFeast', 'sending', 'message'];

// Revisão à mão (2024 e o que vale para as duas regras). `null` apaga a etiqueta lida.
const FIX = {
  // cura que o texto não diz do jeito comum, ou diz errado
  heal: { heal: 70, hm: null },
  massCureWounds: { heal: 13.5, hm: 1, area: 1 },
  massHealingWord: { heal: 5, hm: 1, area: 1 },
  healingSpirit: { heal: 3.5, hm: null },
  auraOfVitality: { heal: 7, hm: null },
  prayerOfHealing: { heal: 9, hm: 1, area: 1 },
  regenerate: { heal: 22, hm: null },
  findSteed: { heal: null, hm: null, ctl: null },
  goodberry: { heal: null, hm: null, exp: 1 },
  revivify: { heal: null, hm: null },
  spareTheDying: { heal: null },
  // texto curto (magias fora do SRD) sem o dado: o dano médio do livro
  tollTheDead: { avg: 6.5, save: 1 }, antagonize: { avg: 10, save: 1, half: 1 }, armsOfHadar: { avg: 7, save: 1, half: 1 },
  infestation: { avg: 3.5, save: 1 }, sappingSting: { avg: 2.5, save: 1 }, shadowBlade: { avg: 9, atk: 1 },
  snillocsSnowballSwarm: { avg: 10.5, save: 1, half: 1, area: 1 }, witherAndBloom: { avg: 7, save: 1, half: 1, area: 1 },
  rimesBindingIce: { avg: 13.5, save: 1, half: 1, ctl: 'area' }, guardianOfFaith: { avg: 20, auto: 1, area: 1 },
  abiDalzimsHorridWilting: { avg: 54, save: 1, half: 1 }, maddeningDarkness: { avg: 36, save: 1, half: 1 },
  gravitySinkhole: { avg: 27.5, save: 1, half: 1, area: 1 }, sickeningRadiance: { avg: 22, save: 1, area: 1 },
  // falam de um tipo de dano, mas para proteger (resistência, imunidade) ou de passagem
  bladeWard: { dmg: null }, auraOfLife: { dmg: null, heal: null, hm: null }, mindBlank: { dmg: null, ctl: null }, protectionFromPoison: { dmg: null },
  stoneskin: { dmg: null }, etherealness: { dmg: null }, gaseousForm: { dmg: null }, silence: { dmg: null },
  windWalk: { dmg: null }, wallOfStone: { dmg: null }, meldIntoStone: { dmg: null, ctl: null }, web: { dmg: null, ctl: 'area' },
  // "área" lida de outra frase do texto
  produceFlame: { area: null }, flameBlade: { area: null }, starryWisp: { area: null },
  // falsos positivos de controle (só falam de condição para proteger ou de outra coisa)
  alarm: { ctl: null }, mirrorImage: { ctl: null }, magicCircle: { ctl: null },
  haste: { ctl: null }, protectionFromEvilAndGood: { ctl: null }, heroism: { ctl: null }, sanctuary: { ctl: null },
  lesserRestoration: { ctl: null }, greaterRestoration: { ctl: null }, calmEmotions: { ctl: 'area', soc: 1 },
  freedomOfMovement: { ctl: null }, deathWard: { ctl: null }, featherFall: { ctl: null },
  shieldOfFaith: { ctl: null }, aid: { ctl: null }, beaconOfHope: { ctl: null },
  // controle que o texto não diz com as palavras de sempre
  sleep: { ctl: 'area' }, command: { ctl: 'single', soc: 1 }, hideousLaughter: { ctl: 'single' },
  holdPerson: { ctl: 'single' }, holdMonster: { ctl: 'single' }, entangle: { ctl: 'area' },
  slow: { ctl: 'area' }, hypnoticPattern: { ctl: 'area' }, fear: { ctl: 'area' }, bane: { ctl: 'area' },
  rayOfFrost: { ctl: 'single' }, thunderwave: { ctl: 'area' }, grease: { ctl: 'area' }, faerieFire: { ctl: 'area' },
  speakWithPlants: { ctl: null },
  // dano que acompanha o ataque com arma (não é dano de magia por conta própria)
  huntersMark: { rider: 1, dmg: ['force'] }, hex: { rider: 1, dmg: ['necrotic'] }, divineSmite: { rider: 1, dmg: ['radiant'] },
  searingSmite: { rider: 1, dmg: ['fire'] }, thunderousSmite: { rider: 1, dmg: ['thunder'] }, wrathfulSmite: { rider: 1, dmg: ['psychic'] },
  brandingSmite: { rider: 1, dmg: ['radiant'] }, blindingSmite: { rider: 1, dmg: ['radiant'] }, staggeringSmite: { rider: 1, dmg: ['psychic'] },
  banishingSmite: { rider: 1, dmg: ['force'] }, shiningSmite: { rider: 1, dmg: ['radiant'] }, trueStrike: { rider: 1, dmg: ['radiant'] },
  shillelagh: { rider: 1 }, crusadersMantle: { rider: 1 }, flameArrows: { rider: 1 }, holyWeapon: { rider: 1 },
  fountOfMoonlight: { rider: 1 }, armorOfAgathys: { rider: 1 }, divineFavor: { rider: 1 },
  // Mísseis Mágicos: 3 dardos que sempre acertam
  magicMissile: { avg: 10.5, atk: null, save: null, auto: 1 },
};
const FIX_2014 = {
  huntersMark: { rider: 1, dmg: null },          // 2014: dano do mesmo tipo da arma
  trueStrike: { rider: null, dmg: null, avg: null },  // 2014: só vantagem no próximo ataque
};

const avgDice = (expr) => {
  let n = 0;
  for (const m of String(expr || '').matchAll(/(\d+)d(\d+)/g)) n += (+m[1]) * (+m[2] + 1) / 2;
  const flat = /([+-]\s*\d+)\s*$/.exec(String(expr || '').trim());
  return n + (flat && /d/.test(expr) ? +flat[1].replace(/\s/g, '') : 0);
};
const r1 = (v) => Math.round(v * 10) / 10;

/** Primeira leitura do texto (a mesma do protótipo do Raio-X). */
function read(sp) {
  const en = String(sp?.desc?.en || '').replace(/\s+/g, ' ');
  const types = new Set();
  for (const m of en.matchAll(RE_DMG_TYPE)) types.add(m[1].toLowerCase());
  const dmgHit = RE_DMG.exec(en);
  if (dmgHit) types.add(dmgHit[2].toLowerCase());
  const choose = RE_CHOOSE.exec(en);
  if (choose) for (const t of choose[1].split(/,|\bor\b/)) { const k = t.trim().toLowerCase(); if (DAMAGE_TYPES.includes(k)) types.add(k); }
  const healHit = RE_HEAL.exec(en);
  const heal = healHit ? avgDice(healHit[1] || healHit[2] || '0') + (healHit[3] ? +healHit[3] : 0) : 0;
  const area = RE_AREA.test(en) || /\(\d+-(?:ft|foot)/.test(String(sp?.range || ''));
  const control = RE_CONTROL.test(en.replace(RE_PROTECT, ''));
  const dice = dmgHit ? dmgHit[1] : (/(\d+d\d+)/.exec(en) || [])[1] || '';
  const t = {};
  if (types.size) {
    t.dmg = DAMAGE_TYPES.filter(x => types.has(x));
    const avg = avgDice(dice);
    if (avg) t.avg = r1(avg);
    if (/spell attack/i.test(en)) t.atk = 1;
    else if (/saving throw|\bsave\b/i.test(en)) t.save = 1;
    if (t.save && /half as much|half on success|\(half/i.test(en)) t.half = 1;
    if (RE_RIDER.test(en)) t.rider = 1;
  }
  if (area) t.area = 1;
  if (heal > 0) { t.heal = r1(heal); if (RE_HEAL_MOD.test(en)) t.hm = 1; }
  if (control) t.ctl = area ? 'area' : 'single';
  if (MOBILITY.includes(sp.id)) t.mob = 1;
  if (SOCIAL.includes(sp.id)) t.soc = 1;
  if (EXPLORE.includes(sp.id)) t.exp = 1;
  // "área" sozinha (sem dano, cura nem controle) não diz nada ao Raio-X
  if (Object.keys(t).length === 1 && t.area) delete t.area;
  return t;
}

const ORDER = ['dmg', 'avg', 'atk', 'save', 'half', 'auto', 'area', 'rider', 'heal', 'hm', 'ctl', 'mob', 'soc', 'exp'];
function fixed(t, fix) {
  const out = { ...t };
  for (const [k, v] of Object.entries(fix || {})) { if (v == null) delete out[k]; else out[k] = v; }
  if (!out.dmg) { for (const k of ['avg', 'atk', 'save', 'half', 'auto', 'rider']) delete out[k]; }
  return Object.fromEntries(ORDER.filter(k => k in out).map(k => [k, out[k]]));
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Completa a leitura `a` com o que só a outra regra diz (`b`): muitos textos são um
 * resumo curto (392 de 520 em 2014; as magias fora do SRD em 2024). Os números (dano e
 * cura) e os tipos de dano ficam os da própria regra quando ela os diz. */
const HIT = ['atk', 'save', 'half', 'auto'];
function filled(a, b) {
  const out = { ...a };
  const hasHit = HIT.some(k => k in a);   // um jeito de acertar só (ataque, salvaguarda ou sempre)
  for (const [k, v] of Object.entries(b || {})) if (!(k in out) && !(hasHit && HIT.includes(k))) out[k] = v;
  if (a.save && b?.save && b.half) out.half = 1;
  if (a.dmg && b?.dmg && !a.avg && b.avg) out.dmg = [...new Set([...a.dmg, ...b.dmg])].sort();
  return out;
}

export function buildSpellTags() {
  const by24 = new Map(SPELLS_2024.map(s => [s.id, s]));
  const by14 = new Map(SRD.SPELLS.map(s => [s.id, s]));
  const ids = [...new Set([...by24.keys(), ...by14.keys()])].sort();
  const spells = {}, legacy = {};
  for (const id of ids) {
    const r24 = by24.has(id) ? read(by24.get(id)) : null;
    const r14 = by14.has(id) ? read(by14.get(id)) : null;
    const main = r24 ? fixed(filled(r24, r14), FIX[id]) : fixed(r14, { ...FIX[id], ...FIX_2014[id] });
    if (Object.keys(main).length) spells[id] = main;
    if (r24 && r14) {
      const old = fixed(filled(r14, r24), { ...FIX[id], ...FIX_2014[id] });
      if (!same(old, main)) legacy[id] = old;
    }
  }
  return { v: 1, spells, legacy };
}

const output = new URL('../frontend/data/spell-tags.json', import.meta.url);
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const text = JSON.stringify(buildSpellTags()) + '\n';
  if (process.argv.includes('--check')) {
    if (readFileSync(output, 'utf8') !== text) throw new Error('Run node scripts/build-spell-tags.mjs to update spell-tags.json.');
  } else writeFileSync(output, text);
}
