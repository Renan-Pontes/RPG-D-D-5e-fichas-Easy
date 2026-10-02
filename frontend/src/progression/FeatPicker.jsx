/* Escolha de talento do catálogo (data/feats.js): lista pesquisável com
 * pré-requisitos, +1 de atributo e sub-escolhas. Usado na subida de nível
 * (LevelUpModal) e no talento de origem do antecedente 2024 (Creator). */
import { useState } from 'react';
import SRD from '../../data/srd.js';
import Utils from '../../utils.js';
import { t as tr, tName } from '../../data/i18n.js';
import { featsFor, findFeat } from '../../data/feats.js';
import { SHARED } from '../../data/class-options/shared.js';
import { CLASS_OPTIONS } from '../../data/class-options/index.js';
import { TOOLS, toolName, armorTraining, weaponTraining, startingTools } from '../creator/start-data.js';
import {
  featCategories, featPrereqIssues, featTakenIssue, featChoiceSpecs, featRules, featScore,
} from './feat-rules.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

const CATEGORY = {
  origin: ['Origem', 'Origin'], general: ['Geral', 'General'], fightingStyle: ['Estilo de Luta', 'Fighting Style'],
  epicBoon: ['Dádiva Épica', 'Epic Boon'], feat: ['Talento', 'Feat'],
};
const PROF = {
  lightArmor: ['armadura leve', 'light armor'], mediumArmor: ['armadura média', 'medium armor'],
  heavyArmor: ['armadura pesada', 'heavy armor'], shield: ['escudo', 'shields'], martialWeapon: ['armas marciais', 'martial weapons'],
};
const DAMAGE = {
  acid: ['Ácido', 'Acid'], cold: ['Frio', 'Cold'], fire: ['Fogo', 'Fire'], lightning: ['Elétrico', 'Lightning'],
  thunder: ['Trovejante', 'Thunder'], necrotic: ['Necrótico', 'Necrotic'], poison: ['Veneno', 'Poison'],
  psychic: ['Psíquico', 'Psychic'], radiant: ['Radiante', 'Radiant'], force: ['Energia', 'Force'],
};
const INSTRUMENTS = {
  bagpipes: ['Gaita de foles', 'Bagpipes'], drum: ['Tambor', 'Drum'], dulcimer: ['Saltério', 'Dulcimer'],
  flute: ['Flauta', 'Flute'], horn: ['Trompa', 'Horn'], lute: ['Alaúde', 'Lute'], lyre: ['Lira', 'Lyre'],
  panFlute: ['Flauta de Pã', 'Pan Flute'], shawm: ['Charamela', 'Shawm'], viol: ['Viola', 'Viol'],
};
const CHOICE_LABEL = {
  spellList: ['Lista de magias', 'Spell list'], spellAbility: ['Atributo de conjuração', 'Spellcasting ability'],
  cantrip: ['Truques', 'Cantrips'], spell: ['Magias', 'Spells'], skill: ['Perícias', 'Skills'],
  skillOrTool: ['Perícias ou ferramentas', 'Skills or tools'], skillProfOrExpertise: ['Perícia (proficiência, ou especialização se já tiver)', 'Skill (proficiency, or expertise if you have it)'],
  expertise: ['Especialização', 'Expertise'], tool: ['Ferramentas', 'Tools'], instrument: ['Instrumentos musicais', 'Musical instruments'],
  language: ['Idiomas', 'Languages'], weapon: ['Armas', 'Weapons'], weaponMastery: ['Maestria em arma', 'Weapon mastery'],
  damageType: ['Tipo de dano', 'Damage type'], maneuver: ['Manobras', 'Maneuvers'], metamagic: ['Metamagia', 'Metamagic'],
  invocation: ['Invocação', 'Invocation'], fightingStyle: ['Estilo de Luta', 'Fighting Style'], variant: ['Variante', 'Variant'],
};
// Chaves em que o jogador pode digitar um valor fora da lista (ferramentas etc.).
const CUSTOM = new Set(['skillOrTool', 'tool', 'instrument', 'weapon']);

const humanize = (id) => String(id).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());

/** Proficiências em armadura/armas marciais que a ficha tem (aproximação para o pré-requisito). */
function proficiencySet(char) {
  const out = new Set();
  // Treino pela regra da ficha (start-data já soma multiclasse, talentos e concessões de classe).
  const ARMOR_KEY = { light: 'lightArmor', medium: 'mediumArmor', heavy: 'heavyArmor', shield: 'shield' };
  for (const a of armorTraining(char) || []) if (ARMOR_KEY[a]) out.add(ARMOR_KEY[a]);
  if (weaponTraining(char)?.categories.has('martial')) out.add('martialWeapon');
  if (char.race === 'dwarf-mountain') { out.add('lightArmor'); out.add('mediumArmor'); }
  for (const f of char.feats || []) {
    for (const p of findFeat(f?.id)?.grants?.proficiencies || []) out.add(p === 'martialWeapons' ? 'martialWeapon' : p);
  }
  return out;
}

/** Checagens de pré-requisito que dependem da ficha calculada. */
export function featCtx(char) {
  const profs = proficiencySet(char);
  return {
    hasProficiency: (p) => profs.has(p),
    canCast: Utils.casterViews(char).length > 0 || (char.spells || []).length > 0,
    checkSpecies: true,
  };
}

export function prereqText(feat, lang) {
  const p = feat?.prereq;
  if (!p) return '';
  const parts = [];
  if (p.level) parts.push(L(lang, `nível ${p.level}+`, `level ${p.level}+`));
  if (p.abilities) parts.push(Object.entries(p.abilities).map(([k, v]) => `${tr(k + 'Sh', lang)} ${v}+`).join(', '));
  if (p.anyAbility) parts.push(Object.entries(p.anyAbility).map(([k, v]) => `${tr(k + 'Sh', lang)} ${v}`).join(L(lang, ' ou ', ' or ')) + '+');
  if (p.proficiency) parts.push(L(lang, 'proficiência em ', 'proficiency with ') + (PROF[p.proficiency]?.[lang === 'pt' ? 0 : 1] || p.proficiency));
  if (p.spellcasting) parts.push(L(lang, 'conjuração', 'spellcasting'));
  if (p.feature === 'fightingStyle') parts.push(L(lang, 'Estilo de Luta', 'Fighting Style'));
  if (p.species?.length) parts.push(p.species.map(s => tName('race', s, lang)).join(', '));
  if (p.feats?.length) parts.push(p.feats.map(id => findFeat(id)?.name[lang] || id).join(', '));
  if (p.text && !p.species) parts.push(p.text[lang]);
  return parts.join(' · ');
}

/** Resumo curto de um talento do catálogo (para a ficha). */
export function featSummary(entry, lang) {
  const feat = entry?.id ? findFeat(entry.id) : null;
  return feat ? feat.desc[lang] || feat.desc.en : '';
}

/** Texto legível das sub-escolhas registradas ({ spellList: 'cleric', cantrip: [...] }). */
export function picksText(picks, lang) {
  if (!picks || typeof picks !== 'object') return '';
  const label = (key, v) => {
    if (key === 'spellList') return tName('class', v, lang);
    if (key === 'spellAbility') return tr(v + 'Sh', lang);
    if (key === 'cantrip' || key === 'spell') return tName('spellName', v, lang);
    if (['skill', 'skillProfOrExpertise', 'expertise', 'skillOrTool'].includes(key) && SRD.SKILLS.some(s => s.id === v)) return tName('skill', v, lang);
    if (key === 'damageType' && DAMAGE[v]) return DAMAGE[v][lang === 'pt' ? 0 : 1];
    if (key === 'instrument' && INSTRUMENTS[v]) return INSTRUMENTS[v][lang === 'pt' ? 0 : 1];
    if (TOOLS[v]) return toolName(v, lang);
    return humanize(v);
  };
  return Object.entries(picks)
    .map(([k, v]) => `${(CHOICE_LABEL[k] || [k, k])[lang === 'pt' ? 0 : 1]}: ${(Array.isArray(v) ? v : [v]).map(x => label(k, x)).join(', ')}`)
    .join(' · ');
}

// ---------------------------------------------------------------------------
// Opções de cada sub-escolha
// ---------------------------------------------------------------------------
function poolOpts(classId, pools, rules) {
  const data = CLASS_OPTIONS[classId];
  const key = pools.find(p => data?.pools?.[p]) || null;
  return (data?.pools?.[key]?.options || []).filter(o => !o.rules || o.rules === rules);
}

/** Ferramentas/instrumentos que a ficha já tem (treino da ficha, concessões, classe e antecedente da criação). */
function knownTools(char) {
  let fixed = [];
  try { fixed = startingTools(char).fixed || []; } catch { fixed = []; }
  let granted = [];
  try { granted = Utils.classGrants(char).tools || []; } catch { granted = []; }
  return new Set([...(char.toolProfs || []), ...granted, ...fixed]);
}

function choiceOptions(char, c, picks, lang) {
  const rules = featRules(char);
  const nm = (o) => o.name?.[lang] || o.name?.en || o.id;
  switch (c.key) {
    case 'spellList': return c.options.map(id => ({ id, label: tName('class', id, lang) }));
    case 'spellAbility': return c.options.map(id => ({ id, label: tr(id, lang) }));
    case 'variant': return c.spec.map(v => ({ id: v.id, label: v.name[lang] }));
    case 'damageType': return (c.options || []).map(id => ({ id, label: DAMAGE[id]?.[lang === 'pt' ? 0 : 1] || humanize(id) }));
    case 'skill': case 'skillProfOrExpertise': case 'skillOrTool': {
      // Perícia/ferramenta tem que ser NOVA (Habilidoso, Humano Habilidoso…): esconde as que a ficha
      // já tem por outro lado. As marcadas aqui mesmo continuam na lista para poder desmarcar.
      const cur = Array.isArray(picks?.[c.key]) ? picks[c.key] : [];
      const isNew = (has) => (id) => cur.includes(id) || !has(id);
      const newSkill = isNew(id => Utils.hasSkillProf(char, id));
      const skills = SRD.SKILLS.filter(s => (!c.options || c.options.includes(s.id)) && (c.key === 'skillProfOrExpertise' || newSkill(s.id)))
        .map(s => ({ id: s.id, label: tName('skill', s.id, lang) }));
      if (c.key !== 'skillOrTool') return skills;
      const known = knownTools(char);
      const newTool = isNew(id => known.has(id));
      const tools = Object.keys(TOOLS).filter(newTool)
        .map(id => ({ id, label: `${toolName(id, lang)} (${L(lang, 'ferramenta', 'tool')})` }))
        .sort((a, b) => a.label.localeCompare(b.label));
      return [...skills, ...tools];
    }
    case 'expertise':
      return SRD.SKILLS.filter(s => Utils.hasSkillProf(char, s.id) && !Utils.hasExpertise(char, s.id)).map(s => ({ id: s.id, label: tName('skill', s.id, lang) }));
    case 'tool': case 'instrument': {
      // Ferramenta/instrumento tem que ser NOVO (Artesão, Músico): esconde os que a ficha já tem.
      const cur = Array.isArray(picks?.[c.key]) ? picks[c.key] : [];
      const known = knownTools(char);
      const fresh = (id) => cur.includes(id) || !known.has(id);
      if (c.key === 'instrument') return Object.entries(INSTRUMENTS).filter(([id]) => fresh(id)).map(([id, n]) => ({ id, label: n[lang === 'pt' ? 0 : 1] }));
      return (c.options || Object.keys(TOOLS)).filter(fresh).map(id => ({ id, label: TOOLS[id] ? toolName(id, lang) : humanize(id) }));
    }
    case 'language': {
      const known = new Set(Utils.languagesFor(char));
      return Utils.LANGUAGES.filter(l => !known.has(l.id)).map(l => ({ id: l.id, label: lang === 'pt' ? l.pt : l.id }));
    }
    case 'weapon': case 'weaponMastery':
      return SHARED.weaponMastery.options.filter(o => o.source !== 'DMG24').map(o => ({ id: o.id, label: nm(o) }));
    case 'fightingStyle': return SHARED.fightingStyle.options.filter(o => !o.rules || o.rules === rules).map(o => ({ id: o.id, label: nm(o) }));
    case 'maneuver': return poolOpts('fighter', ['maneuver'], rules).map(o => ({ id: o.id, label: nm(o) }));
    case 'metamagic': return poolOpts('sorcerer', rules === '2014' ? ['metamagic2014', 'metamagic'] : ['metamagic'], rules).map(o => ({ id: o.id, label: nm(o) }));
    case 'invocation': return poolOpts('warlock', ['invocation'], rules).filter(o => !o.prereq).map(o => ({ id: o.id, label: nm(o) }));
    case 'cantrip': case 'spell': {
      const s = c.spec || {};
      const list = s.list === 'spellList' ? picks.spellList : s.list;
      if (s.list === 'spellList' && !list) return null; // escolher a lista antes
      const level = c.key === 'cantrip' ? 0 : s.level;
      const schools = (s.schools || []).map(x => x.toLowerCase());
      return Utils.spellCatalog(char)
        .filter(sp => (!list || sp.classes.includes(list)) && (level == null || sp.level === level)
          && (!schools.length || schools.includes(String(sp.school).toLowerCase())) && (!s.ritual || sp.ritual))
        // Livro básico (SRD) primeiro; magias de outros livros marcadas com a fonte ("confirme com o mestre").
        .map(sp => {
          const core = !sp.source || /SRD/.test(sp.source);
          return { id: sp.id, core, label: tName('spellName', sp.id, lang) + (core ? '' : ` · ${sp.source}`) };
        })
        .sort((a, b) => (b.core - a.core) || a.label.localeCompare(b.label));
    }
    default: return c.options ? c.options.map(id => ({ id, label: humanize(id) })) : [];
  }
}

function ChoiceField({ char, lang, c, picks, setPick, tall = false, recommend = {} }) {
  const [custom, setCustom] = useState('');
  const rec = recommend[c.key];
  const opts = (choiceOptions(char, c, picks, lang) || null)?.map(o => (rec && (Array.isArray(rec) ? rec.includes(o.id) : rec === o.id)
    ? { ...o, label: `${o.label} — ${L(lang, 'Recomendado', 'Recommended')}` } : o)) ?? null;
  const title = (CHOICE_LABEL[c.key] || [c.key, c.key])[lang === 'pt' ? 0 : 1];
  if (c.single) {
    return (
      <div style={{ marginBottom: 10 }}>
        <label>{title}</label>
        <select value={picks[c.key] || ''} onChange={e => setPick(c.key, e.target.value || undefined)}>
          <option value="">{L(lang, 'Escolha…', 'Choose…')}</option>
          {opts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
    );
  }
  const cur = Array.isArray(picks[c.key]) ? picks[c.key] : [];
  const toggle = (id) => setPick(c.key, cur.includes(id) ? cur.filter(x => x !== id) : (cur.length < c.count ? [...cur, id] : cur));
  const extra = cur.filter(x => !(opts || []).some(o => o.id === x));
  return (
    <div style={{ marginBottom: 10 }}>
      <label>{title} <span className="muted">({cur.length}/{c.count})</span></label>
      {opts == null ? (
        <div className="text-xs muted">{L(lang, 'Escolha a lista de magias primeiro.', 'Choose the spell list first.')}</div>
      ) : (
        <div className="class-pick-grid" style={tall ? undefined : { maxHeight: 200, overflowY: 'auto' }}>
          {[...opts, ...extra.map(id => ({ id, label: TOOLS[id] ? toolName(id, lang) : humanize(id) }))].map(o => {
            const on = cur.includes(o.id);
            return (
              <button key={o.id} type="button" className={`class-pick small ${on ? 'on' : ''}`} disabled={!on && cur.length >= c.count} onClick={() => toggle(o.id)}>
                <span className="class-pick-name" style={{ fontSize: '0.85rem' }}>{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
      {CUSTOM.has(c.key) && cur.length < c.count && (
        <div className="row gap-2" style={{ marginTop: 6 }}>
          <input aria-label={c.key === 'skillOrTool' ? L(lang, 'Ferramenta…', 'Tool…') : L(lang, 'Outro…', 'Other…')} value={custom} maxLength={60} onChange={e => setCustom(e.target.value)}
            placeholder={c.key === 'skillOrTool' ? L(lang, 'Ferramenta…', 'Tool…') : L(lang, 'Outro…', 'Other…')} />
          <button type="button" className="btn btn-ghost" disabled={!custom.trim() || cur.includes(custom.trim())}
            onClick={() => { setPick(c.key, [...cur, custom.trim()]); setCustom(''); }}>{L(lang, 'Adicionar', 'Add')}</button>
        </div>
      )}
    </div>
  );
}

/** Sub-escolhas de um talento (sem o +1). picks/onChange: { spellList: 'cleric', cantrip: [...] }. */
export function FeatChoices({ char, lang, feat, level, picks = {}, onChange, hide = [], tall = false, recommend = {} }) {
  const specs = featChoiceSpecs(feat, level).filter(c => !hide.includes(c.key));
  if (!specs.length) return null;
  const setPick = (key, v) => {
    const next = { ...picks };
    if (v == null || (Array.isArray(v) && !v.length)) delete next[key]; else next[key] = v;
    // Trocar a lista de magias zera truques/magias escolhidos dela.
    if (key === 'spellList' && v !== picks.spellList) { delete next.cantrip; delete next.spell; }
    onChange(next);
  };
  return <>{specs.map(c => <ChoiceField key={c.key} char={char} lang={lang} c={c} picks={picks} setPick={setPick} tall={tall} recommend={recommend} />)}</>;
}

/** Seletor do aumento de atributo do talento. asi = { dex: 1 }. */
function FeatAsi({ char, lang, feat, asi = {}, onChange }) {
  const { choose, amount = 1, split, max = 20, excludeProficientSaves } = feat.asi;
  const allowed = choose.filter(k => !(excludeProficientSaves && Utils.hasSaveProf(char, k)));
  const total = Object.values(asi).reduce((a, b) => a + b, 0);
  // Sem divisão: clicar escolhe o atributo (ou desmarca). Com divisão (+2 ou +1/+1): +1 por clique, e zera no fim.
  const click = (k, base) => {
    const d = asi[k] || 0;
    if (!split) return onChange(d ? {} : { [k]: amount });
    const up = total < amount && base + d < max;
    const next = { ...asi, [k]: up ? d + 1 : 0 };
    if (!next[k]) delete next[k];
    onChange(next);
  };
  return (
    <div style={{ marginBottom: 10 }}>
      <label>
        {amount === 1 ? L(lang, '+1 em atributo', '+1 to an ability') : L(lang, `+${amount} em atributos`, `+${amount} to abilities`)}
        <span className="muted"> ({L(lang, 'máximo', 'max')} {max})</span>
      </label>
      <div className="class-pick-grid">
        {allowed.map(k => {
          const base = featScore(char, k);
          const d = asi[k] || 0;
          const on = d > 0;
          const blocked = !on && (base + (split ? 1 : amount) > max || (split && total >= amount));
          return (
            <button key={k} type="button" className={`class-pick small ${on ? 'on' : ''}`}
              disabled={blocked} onClick={() => click(k, base)}>
              <span className="class-pick-name">{tr(k, lang)}{d ? ` +${d}` : ''}</span>
              <span className="class-pick-meta">{base} → {base + d}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Lista + detalhes. value: { type: 'feat', feat, featId?, asi?, picks?, note? }.
 * kind: 'asi' | 'epic' | 'origin'. `char` deve ser a ficha já no nível novo.
 */
export default function FeatPicker({ char, lang, level, kind, hasFightingStyle, value, onChange, cheat = false }) {
  const [q, setQ] = useState('');
  const rules = featRules(char);
  const cats = featCategories(rules, kind, { hasFightingStyle });
  const ctx = featCtx(char);
  const custom = !value.featId && value.custom;
  const hideAsiFeat = kind === 'asi'; // o +2 já está no botão ao lado
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const list = featsFor(rules)
    .filter(f => cats.includes(f.category) && !(hideAsiFeat && f.id === 'abilityScoreImprovement'))
    .filter(f => !q || norm(`${f.name.pt} ${f.name.en}`).includes(norm(q)))
    .map(f => {
      const issues = [...featPrereqIssues(char, f, level, { ...ctx, hasFightingStyle })];
      const taken = f.repeatable && f.repeatKey ? null : featTakenIssue(char, f, {});
      if (taken) issues.push(taken);
      return { f, issues };
    })
    .sort((a, b) => (a.issues.length > 0) - (b.issues.length > 0) || cats.indexOf(a.f.category) - cats.indexOf(b.f.category) || a.f.name[lang].localeCompare(b.f.name[lang]));
  const selected = value.featId ? findFeat(value.featId) : null;
  const pick = (f) => onChange({ type: 'feat', feat: f.name[lang], featId: f.id, asi: {}, picks: {}, note: '' });

  return (
    <>
      {selected ? (
        <div style={{ background: 'var(--bg-elev)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <div className="row gap-2" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            <strong style={{ fontFamily: 'var(--display)', color: 'var(--gold-bright)', flex: 1 }}>{selected.name[lang]}</strong>
            <span className="text-xs muted">{CATEGORY[selected.category][lang === 'pt' ? 0 : 1]} · {selected.source}</span>
            <button type="button" className="btn btn-ghost" onClick={() => onChange({ type: 'feat', feat: '' })}>{L(lang, 'Trocar', 'Change')}</button>
          </div>
          <div className="text-sm" style={{ margin: '6px 0 10px', color: 'var(--ink-secondary)' }}>{selected.desc[lang]}</div>
          {selected.asi && <FeatAsi char={char} lang={lang} feat={selected} asi={value.asi || {}} onChange={asi => onChange({ ...value, asi })} />}
          <FeatChoices char={char} lang={lang} feat={selected} level={level} picks={value.picks || {}} onChange={picks => onChange({ ...value, picks })} />
        </div>
      ) : custom ? (
        <>
          <label>{L(lang, 'Nome do talento', 'Feat name')}</label>
          <input aria-label={L(lang, 'Talento da casa…', 'Homebrew feat…')} value={value.feat || ''} maxLength={120} onChange={e => onChange({ ...value, feat: e.target.value })}
            placeholder={L(lang, 'Talento da casa…', 'Homebrew feat…')} />
          <label style={{ marginTop: 8 }}>{L(lang, 'O que ele faz (opcional)', 'What it does (optional)')}</label>
          <textarea value={value.note || ''} maxLength={500} onChange={e => onChange({ ...value, note: e.target.value })} />
          <div className="text-xs muted" style={{ marginTop: 6 }}>
            {L(lang, 'Talento fora do catálogo: se ele der +1 em atributo, peça ao mestre para registrar (ou use o modo trapaça numa ficha pessoal).',
              'Feat outside the catalog: if it grants +1 to an ability, ask your DM to record it (or use cheat mode on a personal sheet).')}
          </div>
          <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => onChange({ type: 'feat', feat: '' })}>← {L(lang, 'Voltar à lista', 'Back to the list')}</button>
        </>
      ) : (
        <>
          <input aria-label={L(lang, 'Buscar talento…', 'Search feats…')} value={q} onChange={e => setQ(e.target.value)} placeholder={L(lang, 'Buscar talento…', 'Search feats…')} style={{ marginBottom: 8 }} />
          <div style={{ display: 'grid', gap: 6 }}>
            {list.map(({ f, issues }) => {
              const blocked = issues.length > 0 && !cheat;
              const pre = prereqText(f, lang);
              return (
                <button key={f.id} type="button" className="class-pick small" disabled={blocked} onClick={() => pick(f)} style={{ alignItems: 'stretch' }}>
                  <span className="row gap-2" style={{ width: '100%', alignItems: 'baseline' }}>
                    <span className="class-pick-name" style={{ flex: 1 }}>{f.name[lang]}</span>
                    <span className="class-pick-meta">{CATEGORY[f.category][lang === 'pt' ? 0 : 1]} · {f.source}</span>
                  </span>
                  <span className="text-xs" style={{ color: 'var(--ink-secondary)' }}>{f.desc[lang].length > 160 ? f.desc[lang].slice(0, 157) + '…' : f.desc[lang]}</span>
                  {pre && <span className="class-pick-meta">{L(lang, 'Pré-requisito', 'Prerequisite')}: {pre}</span>}
                  {issues.length > 0 && <span className="text-xs" style={{ color: 'var(--blood-bright)' }}>{issues.map(i => i[lang] || i.pt).join(' · ')}</span>}
                </button>
              );
            })}
            <button type="button" className="class-pick small" onClick={() => onChange({ type: 'feat', feat: '', note: '', custom: true })}>
              <span className="class-pick-name">{L(lang, 'Outro (texto livre)', 'Other (free text)')}</span>
              <span className="class-pick-meta">{L(lang, 'Talento da casa ou fora do catálogo', 'Homebrew or not in the catalog')}</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}
