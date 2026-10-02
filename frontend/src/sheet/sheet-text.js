/**
 * Textos da ficha que o app (Sheet.jsx / SheetTabs.jsx) e o PDF (src/pdf/sheet-data.js)
 * mostram iguais. Funções puras (sem React), testáveis no Node.
 */
import SRD from '../../data/srd.js';
import Utils from '../../utils.js';
import { tName } from '../../data/i18n.js';
import { findFeat } from '../../data/feats.js';
import { computeProgression } from '../progression/engine.js';
import { findOption, optionPool } from '../progression/options.js';
import { pickLabel } from '../progression/options-catalog.js';
import { armorTraining, weaponTraining, backgroundStart, toolName, TOOLS } from '../creator/start-data.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const txt = (v, lang) => (v && typeof v === 'object' ? (lang === 'pt' ? v.pt : v.en) ?? v.pt ?? '' : (v || ''));

const ARMOR_LABEL = { light: ['leves', 'light'], medium: ['médias', 'medium'], heavy: ['pesadas', 'heavy'], shield: ['escudos', 'shields'] };
const WEAPON_CAT = { simple: ['simples', 'simple'], martial: ['marciais', 'martial'] };
const ARMOR_ORDER = ['light', 'medium', 'heavy', 'shield'];

/**
 * Treino em armaduras e proficiência com armas pela regra da ficha:
 * [{ key: 'armor'|'weapons', label, text }]. Vazio se a classe é desconhecida.
 */
export function trainingLines(char, lang = 'pt') {
  const out = [];
  const armor = armorTraining(char);
  if (armor?.size) {
    const list = [...armor].sort((a, b) => ARMOR_ORDER.indexOf(a) - ARMOR_ORDER.indexOf(b));
    out.push({ key: 'armor', label: L(lang, 'Armaduras', 'Armor'), text: list.map(a => (ARMOR_LABEL[a] ? L(lang, ...ARMOR_LABEL[a]) : a)).join(', ') });
  }
  const weapons = weaponTraining(char);
  if (weapons) {
    const parts = [...[...weapons.categories].map(c => (WEAPON_CAT[c] ? L(lang, ...WEAPON_CAT[c]) : c)),
      ...[...weapons.ids].map(id => {
        const w = SRD.weaponsFor(char.rulesVersion).find(x => x.id.toLowerCase() === id);
        return w ? tName('weapon', w.id, lang) : id;
      })];
    if (weapons.martialProps.size) parts.push(L(lang, 'marciais com Acuidade ou Leves', 'martial Finesse or Light'));
    if (parts.length) out.push({ key: 'weapons', label: L(lang, 'Armas', 'Weapons'), text: parts.join(', ') });
  }
  return out;
}

/** Característica do antecedente (só regras 2014): { name, desc } no idioma pedido, ou null. */
export function backgroundFeature(char, lang = 'pt') {
  if (char?.rulesVersion === '2024' || !char?.background) return null;
  const s = backgroundStart({ ...char, rulesVersion: '2014' });
  if (!s?.feature) return null;
  return { name: txt(s.feature, lang), desc: txt(s.featureDesc, lang) };
}

const featDef = (char, f) => (f?.id ? (findFeat(f.id, char?.rulesVersion === '2014' ? '2014' : '2024') || findFeat(f.id)) : null);

/** Nome do talento no idioma da tela (fichas antigas guardam o nome em inglês). "Iniciado em Magia (Clérigo)". */
export function featName(char, f, lang = 'pt') {
  if (typeof f === 'string') return f;
  const def = featDef(char, f);
  const base = def ? txt(def.name, lang) : (txt(f?.name, lang) || f?.id || '');
  const list = f?.picks?.spellList;
  return list && !/\(/.test(base) ? `${base} (${tName('class', list, lang)})` : base;
}

/** Descrição do talento (catálogo), no idioma da tela. */
export function featDesc(char, f, lang = 'pt') {
  const def = featDef(char, f);
  return def ? txt(def.desc, lang) : txt(f?.desc, lang);
}

const PICK_LABEL = {
  spellList: ['Lista de magias', 'Spell list'], spellAbility: ['Atributo de conjuração', 'Spellcasting ability'],
  cantrip: ['Truques', 'Cantrips'], spell: ['Magia', 'Spell'], skill: ['Perícias', 'Skills'],
  skillOrTool: ['Perícias ou ferramentas', 'Skills or tools'], skillProfOrExpertise: ['Perícia', 'Skill'],
  expertise: ['Especialização', 'Expertise'], tool: ['Ferramentas', 'Tools'], instrument: ['Instrumentos musicais', 'Musical instruments'],
  language: ['Idiomas', 'Languages'], weapon: ['Armas', 'Weapons'], weaponMastery: ['Maestria em arma', 'Weapon mastery'],
  damageType: ['Tipo de dano', 'Damage type'], fightingStyle: ['Estilo de Luta', 'Fighting Style'], variant: ['Variante', 'Variant'],
};
const ABILITY_LABEL = {
  str: ['Força', 'Strength'], dex: ['Destreza', 'Dexterity'], con: ['Constituição', 'Constitution'],
  int: ['Inteligência', 'Intelligence'], wis: ['Sabedoria', 'Wisdom'], cha: ['Carisma', 'Charisma'],
};
const humanize = (id) => String(id).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());

/** Sub-escolhas de um talento ({ spellList, spellAbility, cantrip, spell, skill… }) em texto. */
export function featPicksText(picks, lang = 'pt') {
  if (!picks || typeof picks !== 'object') return '';
  const label = (key, v) => {
    if (key === 'spellList') return tName('class', v, lang);
    if (key === 'spellAbility' && ABILITY_LABEL[v]) return L(lang, ...ABILITY_LABEL[v]);
    if (key === 'cantrip' || key === 'spell') return tName('spellName', v, lang);
    if (SRD.SKILLS.some(s => s.id === v)) return tName('skill', v, lang);
    if (key === 'damageType') return Utils.damageLabel(v, lang);
    if (TOOLS[v]) return toolName(v, lang);
    if (key === 'weapon' || key === 'weaponMastery') return tName('weapon', v, lang) || humanize(v);
    return humanize(v);
  };
  return Object.entries(picks)
    .filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `${(PICK_LABEL[k] || [humanize(k), humanize(k)])[lang === 'pt' ? 0 : 1]}: ${(Array.isArray(v) ? v : [v]).map(x => label(k, x)).join(', ')}`)
    .join(' · ');
}

/**
 * Características de classe pela regra da ficha (2024 usa os traços de 2024),
 * com as escolhas de classe (Estilo de Luta, Ordem Divina…): [{ title, text, level }].
 */
export function classFeatureList(char, lang = 'pt', { withLevel = true } = {}) {
  if (!char?.className) return [];
  const prog = computeProgression(char);
  const out = [];
  const seen = new Set();
  for (const f of prog.features || []) {
    const key = `${f.classId || ''}:${f.id || txt(f.name, 'pt')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const name = lang === 'pt' ? f.name : (f.nameEn || f.name);
    const desc = lang === 'pt' ? f.desc : (f.descEn || f.desc);
    const lv = f.classLevel || f.level;
    const cls = f.classId ? ` — ${tName('class', f.classId, lang)} ${f.classLevel}` : '';
    const title = txt(name, lang);
    out.push({ title: withLevel && lv ? `${title} (${L(lang, 'nv.', 'lvl')} ${lv}${cls})` : title, text: txt(desc, lang), level: lv || 1 });
  }
  // Escolhas de pools dinâmicos (truque, perícia, idioma…) viram uma linha por pool: "Especialização: Furtividade, Prestidigitação".
  const dynamic = new Map();
  for (const p of prog.classOptions || []) {
    const classId = p.classId || char.className;
    const def = optionPool(classId, p.pool);
    if (def?.kind) {
      const key = `${classId}:${p.pool}`;
      if (!dynamic.has(key)) dynamic.set(key, { name: txt(def.name, lang), picks: [], level: p.level || 1 });
      dynamic.get(key).picks.push(pickLabel(classId, p, lang) + (p.detail ? ` (${p.detail})` : ''));
      continue;
    }
    const opt = findOption(classId, p.pool, p.id);
    if (!opt) continue;
    out.push({ title: `${txt(opt.name, lang)}${p.detail ? ` (${p.detail})` : ''}`, text: txt(opt.desc, lang), level: p.level || 1 });
  }
  for (const d of dynamic.values()) out.push({ title: `${d.name}: ${d.picks.join(', ')}`, text: '', level: d.level });
  return out;
}
