/* Helpers puros para resumo de traços da espécie sem arrastar JSX de modal. */
import Utils from '../../utils.js';
import { t as tr, tName } from '../../data/i18n.js';
import { findFeat } from '../../data/feats.js';
import { DAMAGE_NAMES, RACE_TOOL_NAMES } from '../../data/species-2024.js';
import { speciesChoiceSpecs, speciesGrants, speciesFeatEntry, speciesAsi } from './species.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const list = (v) => (Array.isArray(v) ? v : v != null && v !== '' ? [v] : []);
const spellName = (id, lang) => tName('spellName', id, lang);

/** Linhas de resumo do que a espécie dá hoje (para a ficha e a impressão). */
export function speciesSummary(char, lang) {
  const g = speciesGrants(char);
  const sc = char.speciesChoices || {};
  const rows = [];
  for (const c of speciesChoiceSpecs(char)) {
    if (c.key === 'feat') {
      const e = speciesFeatEntry(char);
      if (e) rows.push([c.label[lang], findFeat(e.id)?.name[lang] || e.name]);
    } else if (c.key === 'asi') {
      const a = speciesAsi(char);
      if (Object.keys(a).length) rows.push([c.label[lang], Object.entries(a).map(([k, v]) => `${tr(k + 'Sh', lang)} +${v}`).join(', ')]);
    } else if (c.key === 'cantrip') {
      const id = sc.cantrip || c.default;
      if (id) rows.push([c.label[lang], spellName(id, lang)]);
    } else if (c.options) {
      const o = g.options[c.key];
      if (o) rows.push([c.label[lang], o.name[lang]]);
    } else if (c.key === 'skill') {
      const s = list(sc.skill);
      if (s.length) rows.push([c.label[lang], s.map(id => tName('skill', id, lang)).join(', ')]);
    } else if (c.key === 'tool' && c.from) {
      const tIds = list(sc.tool);
      if (tIds.length) rows.push([c.label[lang], tIds.map(id => RACE_TOOL_NAMES[id]?.[lang] || id).join(', ')]);
    } else if (c.from && sc[c.key]) rows.push([c.label[lang], tr(sc[c.key], lang)]);
  }
  if (g.resist.length) rows.push([L(lang, 'Resistências', 'Resistances'), g.resist.map(d => DAMAGE_NAMES[d]?.[lang] || d).join(', ')]);
  const shownTools = new Set([...list(g.options.tool?.tools), ...list(sc.tool)]);
  const fixedTools = g.tools.filter(t => !shownTools.has(t));
  if (fixedTools.length) rows.push([L(lang, 'Ferramentas', 'Tools'), fixedTools.map(t => RACE_TOOL_NAMES[t]?.[lang] || t).join(', ')]);
  if (g.darkvision) rows.push([L(lang, 'Visão no escuro', 'Darkvision'), Utils.speedLabel(g.darkvision, lang)]);
  const spells = [...g.cantrips, ...Object.entries(g.spellsByLevel).flatMap(([lv, ids]) => ids.map(id => ((char.level || 1) >= +lv ? id : null)))].filter(Boolean);
  if (spells.length) {
    const ab = g.spellAbility;
    const dc = ab ? 8 + Utils.profBonus(char) + Utils.abilityMod(char, ab) : null;
    rows.push([L(lang, 'Magias da espécie', 'Species spells'),
      spells.map(id => spellName(id, lang)).join(', ') + (ab ? ` (${tr(ab, lang)}, ${L(lang, 'CD', 'DC')} ${dc})` : '')]);
  }
  const next = Object.entries(g.spellsByLevel).filter(([lv]) => (char.level || 1) < +lv);
  if (next.length) rows.push([L(lang, 'Próximas', 'Upcoming'), next.map(([lv, ids]) => `${L(lang, 'Nv', 'Lv')} ${lv}: ${ids.map(id => spellName(id, lang)).join(', ')}`).join(' · ')]);
  return rows;
}
