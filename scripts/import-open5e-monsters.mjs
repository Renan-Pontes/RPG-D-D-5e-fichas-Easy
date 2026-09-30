#!/usr/bin/env node
/**
 * Importa o bestiário do SRD 5.2.1 a partir da API Open5e v2 e gera
 * frontend/data/monsters-srd521.js (arquivo versionado, não editar à mão).
 *
 *   node scripts/import-open5e-monsters.mjs              # baixa e gera
 *   node scripts/import-open5e-monsters.mjs --cache DIR  # usa/grava DIR/open5e-srd-2024.json
 *   node scripts/import-open5e-monsters.mjs --check      # falha se o arquivo gerado estiver desatualizado
 *
 * Só entram criaturas com document.key === 'srd-2024' (SRD 5.2.1, CC-BY 4.0).
 * Outros documentos do Open5e são OGL de terceiros e ficam de fora.
 * O texto das regras fica em inglês (SRD); os nomes em português são tradução
 * própria (scripts/monster-names-pt.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MONSTER_NAMES_PT, FEATURE_NAMES_PT } from './monster-names-pt.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'frontend/data/monsters-srd521.js');
const API = 'https://api.open5e.com/v2/creatures/?document__key=srd-2024&limit=100';
const DOC_KEY = 'srd-2024';

const ABILITY_KEYS = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' };
const ABILITY_ABBR = { Strength: 'STR', Dexterity: 'DEX', Constitution: 'CON', Intelligence: 'INT', Wisdom: 'WIS', Charisma: 'CHA' };
const DAMAGE_TYPES = 'Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder';
const CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible',
  'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'];

// ------------------------------------------------------------
// Texto
// ------------------------------------------------------------
export function cleanText(s) {
  return String(s || '')
    .replace(/\r/g, '')
    .replace(/ \[Area of Effect\]\|XPHB\|\w+/g, '')   // "Sphere [Area of Effect]|XPHB|Sphere" → "Sphere"
    .replace(/\b\w+\|XPHB\|/g, '')                    // "Cover|XPHB|Total Cover" → "Total Cover"
    .replace(/_(Trigger|Response)([^_]*?):_/g, '$1$2:') // "_Trigger:_" → "Trigger:"
    .replace(/––/g, '—')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const normDice = (s) => String(s).replace(/−/g, '-').replace(/\s+/g, '');

export function crString(n) {
  if (n === 0.125) return '1/8';
  if (n === 0.25) return '1/4';
  if (n === 0.5) return '1/2';
  return String(n);
}

const featurePt = (en) => FEATURE_NAMES_PT[en] || en;

// "Fire Breath (Recharge 5–6)" → { name: 'Fire Breath', recharge: 5 }
export function splitName(raw) {
  let name = String(raw || '').trim();
  const out = {};
  let m = name.match(/\s*\(Recharge (\d)(?:[–-]6)?\)\s*$/i);
  if (m) { out.recharge = +m[1]; name = name.slice(0, m.index); }
  m = name.match(/\s*\(Recharge after a Short or Long Rest\)\s*$/i);
  if (m) { out.uses = 1; out.usesPer = 'rest'; name = name.slice(0, m.index); }
  m = name.match(/\s*\((\d+)\/Day(?: Each)?\)\s*$/i);
  if (m) { out.uses = +m[1]; out.usesPer = 'day'; name = name.slice(0, m.index); }
  return { name, ...out };
}

// ------------------------------------------------------------
// Dano: "13 (1d10 + 8) Slashing damage plus 5 (2d4) Fire damage"
// ------------------------------------------------------------
const DMG = `(\\d+)(?: \\(([^)]+)\\))? (?:(${DAMAGE_TYPES}) )?damage`;
// Sem tipo explícito ("damage of the type chosen..."): 'varies' — o mestre decide.
const toPart = (m) => ({ damage: m[2] ? normDice(m[2]) : String(+m[1]), damageType: m[3] ? m[3].toLowerCase() : 'varies' });

export function parseDamageChain(text) {
  const s = String(text || '').replace(/^Hit: /, '');
  const first = new RegExp('^' + DMG).exec(s);
  if (!first) return null;
  const parts = [toPart(first)];
  let rest = s.slice(first[0].length);
  const plus = new RegExp('^,? plus ' + DMG);
  let m;
  while ((m = plus.exec(rest))) { parts.push(toPart(m)); rest = rest.slice(m[0].length); }
  return parts;
}

// ------------------------------------------------------------
// Ataque: "Melee Attack Roll: +14, reach 10 ft. 13 (1d10 + 8) Slashing damage ..."
// ------------------------------------------------------------
export function parseAttack(desc) {
  const m = /^(Melee or Ranged|Melee|Ranged) Attack Roll: ([+\-−]\d+)[^,]*, ((?:reach|range) [\d/]+ (?:ft|feet)\.?(?:,? or range [\d/]+ (?:ft|feet)\.?)?) (.*)$/s.exec(desc);
  if (!m) return null;
  const kind = m[1];
  const reach = /reach (\d+)/.exec(m[3]);
  const range = /range (\d+)(?:\/(\d+))?/.exec(m[3]);
  const rangeNums = range ? `${range[1]}${range[2] ? '/' + range[2] : ''}` : null;
  let rangeText;
  if (kind === 'Ranged') rangeText = rangeNums ? `${rangeNums} ft` : '';
  else if (reach && rangeNums) rangeText = `${reach[1]} ft (${rangeNums} ranged)`;
  else rangeText = reach ? `${reach[1]} ft` : (rangeNums ? `${rangeNums} ft` : '');
  const out = {
    type: kind === 'Ranged' ? 'ranged' : 'melee',
    atk: parseInt(m[2].replace('−', '-'), 10),
    range: rangeText,
  };
  const parts = parseDamageChain(m[4]);
  if (parts) {
    out.damage = parts[0].damage;
    out.damageType = parts[0].damageType;
    if (parts.length > 1) out.extraDamage = parts.slice(1);
  }
  return out;
}

// ------------------------------------------------------------
// Salvaguarda (formato 2024):
// "Dexterity Saving Throw: DC 21, each creature in a 60-foot Cone.
//  Failure: 59 (17d6) Fire damage. Success: Half damage."
// ------------------------------------------------------------
export function parseSave(text) {
  // Aceita frase antes do save ("The harpy sings... Wisdom Saving Throw: DC 11, ...").
  const start = /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC \d+/.exec(text);
  if (!start || /^_?Trigger/.test(text)) return null;
  // "First Failure The target..." (efeitos em etapas) conta como Failure.
  const desc = text.slice(start.index).replace(/\bFirst Failure:? /, 'Failure: ');
  const head = /^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+),? ?(.*?)(?= Failure: |$)/s.exec(desc);
  if (!head) return null;
  const failIdx = desc.indexOf('Failure: ');
  const save = { ability: ABILITY_ABBR[head[1]], dc: +head[2] };
  const targets = head[3].replace(/\.$/, '').trim();
  if (targets) save.targets = targets;
  save.area = /\beach\b|\bcreatures\b/i.test(targets);
  const out = { type: 'save', save };
  if (failIdx < 0) { save.halfOnSave = false; return out; }
  const after = desc.slice(failIdx + 'Failure: '.length);
  const succ = /(?<!or )Success: /.exec(after);
  const both = /Failure or Success: /.exec(after);
  const cut = Math.min(succ ? succ.index : Infinity, both ? both.index : Infinity);
  const failText = cut === Infinity ? after : after.slice(0, cut);
  const successText = succ ? after.slice(succ.index + 'Success: '.length) : '';
  save.halfOnSave = /^Half damage/i.test(successText);
  const parts = parseDamageChain(failText);
  if (parts) {
    out.damage = parts[0].damage;
    out.damageType = parts[0].damageType;
    if (parts.length > 1) out.extraDamage = parts.slice(1);
  }
  const conds = [];
  const re = new RegExp(`has the (${CONDITIONS.join('|')}) condition`, 'g');
  let cm;
  while ((cm = re.exec(failText))) {
    const c = cm[1].toLowerCase();
    if (!conds.includes(c)) conds.push(c);
  }
  if (conds.length) save.conditions = conds;
  return out;
}

// ------------------------------------------------------------
// Ação / traço
// ------------------------------------------------------------
export function convertAction(a) {
  const nm = splitName(a.name);
  const desc = cleanText(a.desc);
  const out = { name: { pt: featurePt(nm.name), en: nm.name } };
  const parsed = parseAttack(desc) || parseSave(desc);
  if (parsed) Object.assign(out, parsed);
  else out.type = 'special';
  const ul = a.usage_limits;
  if (ul && (ul.type === 'RECHARGE_ON_ROLL' || ul.type === 'RECHARGE')) out.recharge = ul.param;
  else if (nm.recharge) out.recharge = nm.recharge;
  if (ul && ul.type === 'PER_DAY') { out.uses = ul.param; out.usesPer = 'day'; }
  else if (nm.uses) { out.uses = nm.uses; out.usesPer = nm.usesPer; }
  if (a.action_type === 'LEGENDARY_ACTION') out.cost = a.legendary_action_cost || 1;
  out.desc = { en: desc };
  return out;
}

export function convertTrait(t) {
  const name = String(t.name || '').replace(/\s*\([^)]*\/Day[^)]*\)\s*$/, '').trim();
  return { name: { pt: featurePt(name), en: name }, desc: { en: cleanText(t.desc) } };
}

function senses(x) {
  const out = [];
  for (const [k, label] of [['blindsight_range', 'blindsight'], ['darkvision_range', 'darkvision'],
    ['tremorsense_range', 'tremorsense'], ['truesight_range', 'truesight']]) {
    if (x[k]) out.push(`${label} ${x[k]} ft`);
  }
  if (x.passive_perception != null) out.push(`passive Perception ${x.passive_perception}`);
  return out.join(', ') || '—';
}

const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const keys = (arr) => (arr || []).map(d => (d.key || d.name || '').toLowerCase()).filter(Boolean);

export function convertCreature(x) {
  const id = x.key.replace(/^srd-2024_/, '');
  const cr = Number(x.challenge_rating);
  const speed = {};
  for (const [k, v] of Object.entries(x.speed || {})) if (k !== 'unit' && v) speed[k] = v;
  if (!('walk' in speed)) speed.walk = 0;
  if (x.speed_all?.hover) speed.hover = true;
  const abilities = {};
  for (const [k, v] of Object.entries(x.ability_scores || {})) abilities[ABILITY_KEYS[k]] = v;
  const saves = {};
  for (const [k, v] of Object.entries(x.saving_throws || {})) saves[ABILITY_KEYS[k]] = v;
  const skills = {};
  for (const [k, v] of Object.entries(x.skill_bonuses || {})) skills[camel(k)] = v;
  const ri = x.resistances_and_immunities || {};

  const byOrder = (a, b) => (a.order_in_statblock ?? 0) - (b.order_in_statblock ?? 0);
  const of = (type) => (x.actions || []).filter(a => a.action_type === type).sort(byOrder).map(convertAction);
  // Multiataque primeiro, como no bloco de estatísticas.
  const actions = of('ACTION').sort((a, b) => (b.name.en === 'Multiattack') - (a.name.en === 'Multiattack'));

  const traits = (x.traits || []).map(convertTrait);
  const m = {
    id,
    name: { pt: MONSTER_NAMES_PT[id] || x.name, en: x.name },
    cr: crString(cr), crNum: cr, xp: x.experience_points ?? undefined,
    type: x.type?.key || 'monstrosity',
    size: x.size?.name || 'Medium',
    alignment: x.alignment || 'unaligned',
    speed,
    ac: x.armor_class, hp: x.hit_points, hitDice: x.hit_dice ? normDice(x.hit_dice) : undefined,
    initiative: x.initiative_bonus ?? undefined,
    abilities, saves,
  };
  if (Object.keys(skills).length) m.skills = skills;
  const dr = keys(ri.damage_resistances), di = keys(ri.damage_immunities);
  const dv = keys(ri.damage_vulnerabilities), ci = keys(ri.condition_immunities);
  if (dr.length) m.damageResistances = dr;
  if (di.length) m.damageImmunities = di;
  if (dv.length) m.damageVulnerabilities = dv;
  if (ci.length) m.conditionImmunities = ci;
  m.senses = senses(x);
  m.languages = x.languages?.as_string || '—';
  if (traits.length) m.traits = traits;
  m.actions = actions;
  const bonus = of('BONUS_ACTION');
  const reactions = of('REACTION');
  const legendary = of('LEGENDARY_ACTION');
  if (bonus.length) m.bonusActions = bonus;
  if (reactions.length) m.reactions = reactions;

  const lr = (x.traits || []).map(t => /^Legendary Resistance \((\d+)\/Day(?:, or (\d+)\/Day in Lair)?\)/.exec(t.name)).find(Boolean);
  const hasLair = !!(lr && lr[2]);
  if (legendary.length) {
    // SRD 5.2.1: "Legendary Action Uses: 3 (4 in Lair)" — a API não traz o número; 3 é o padrão do SRD.
    m.legendary = { uses: 3, ...(hasLair ? { lairUses: 4 } : {}), actions: legendary };
  }
  if (lr) m.legendaryResistance = { uses: +lr[1], ...(lr[2] ? { lairUses: +lr[2] } : {}) };
  m.source = 'SRD 5.2.1';
  return JSON.parse(JSON.stringify(m)); // remove undefined
}

// ------------------------------------------------------------
// Download / geração
// ------------------------------------------------------------
async function fetchAll() {
  let url = API;
  const out = [];
  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open5e ${res.status} em ${url}`);
    const j = await res.json();
    out.push(...j.results);
    url = j.next;
  }
  return out;
}

export function render(creatures) {
  const lines = creatures.map(c => '  ' + JSON.stringify(c) + ',');
  return `// Gerado por scripts/import-open5e-monsters.mjs a partir da API Open5e v2
// (document srd-2024). NÃO editar à mão: rode o script de novo.
//
// This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1")
// by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1
// is licensed under the Creative Commons Attribution 4.0 International License,
// available at https://creativecommons.org/licenses/by/4.0/legalcode.
// Nomes em português: tradução própria, não oficial.
//
// Formato: ver frontend/data/bestiary.js.
/* eslint-disable */
export const MONSTERS_SRD521 = [
${lines.join('\n')}
];

export default MONSTERS_SRD521;
`;
}

async function main() {
  const args = process.argv.slice(2);
  const cacheDir = args.includes('--cache') ? args[args.indexOf('--cache') + 1] : null;
  const cacheFile = cacheDir ? path.join(cacheDir, 'open5e-srd-2024.json') : null;
  let raw;
  if (cacheFile && fs.existsSync(cacheFile)) raw = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  else {
    raw = await fetchAll();
    if (cacheFile) { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cacheFile, JSON.stringify(raw)); }
  }
  const srd = raw.filter(x => x.document?.key === DOC_KEY);
  const skipped = raw.length - srd.length;
  const creatures = srd.map(convertCreature).sort((a, b) => a.crNum - b.crNum || a.name.en.localeCompare(b.name.en));
  const text = render(creatures);

  // Relatório de parse
  let atk = 0, save = 0, special = 0, noDmgAtk = 0;
  for (const c of creatures) for (const a of [...c.actions, ...(c.bonusActions || []), ...(c.reactions || []), ...(c.legendary?.actions || [])]) {
    if (a.type === 'melee' || a.type === 'ranged') { atk++; if (!a.damage) noDmgAtk++; }
    else if (a.type === 'save') save++;
    else special++;
  }
  console.log(`${creatures.length} criaturas (ignoradas fora do SRD: ${skipped}); ataques ${atk} (sem dano: ${noDmgAtk}), saves ${save}, especiais ${special}`);

  if (args.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== text) { console.error('monsters-srd521.js desatualizado'); process.exit(1); }
    console.log('ok');
    return;
  }
  fs.writeFileSync(OUT, text);
  console.log(`gravado ${path.relative(ROOT, OUT)} (${(text.length / 1024).toFixed(0)} KB)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e); process.exit(1); });
}
