/* Escolhas de espécie (linhagem, ancestral, tamanho, atributo de conjuração,
 * perícia, truque, bônus de atributo e talento) — usadas no passo de espécie
 * do Creator e no modal da ficha. Motor: species.js. */
import { useState } from 'react';
import { t as tr, tName } from '../../data/i18n.js';
import { findFeat } from '../../data/feats.js';
import { DAMAGE_NAMES, RACE_TOOL_NAMES } from '../../data/species-2024.js';
import { featEntry } from './feat-rules.js';
import FeatPicker from './FeatPicker.jsx';
import { Modal } from '../../components/Shared.jsx';
import { unknownSpells } from './known.js';
import {
  speciesDef, speciesChoiceSpecs, speciesChoiceIssues, speciesFeatEntry, withSpeciesFeat, speciesAsi,
} from './species.js';
import Utils from '../../utils.js';
import SRD from '../../data/srd.js';
export { speciesSummary } from './species-summary.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const list = (v) => (Array.isArray(v) ? v : v != null && v !== '' ? [v] : []);
const spellName = (id, lang) => tName('spellName', id, lang);

/** "Truques: X · Nv 3: Y · Nv 5: Z" de uma espécie/opção. */
function spellLine(src, lang) {
  const parts = [];
  if (src.cantrips?.length) parts.push(`${L(lang, 'Truques', 'Cantrips')}: ${src.cantrips.map(id => spellName(id, lang)).join(', ')}`);
  for (const [lv, ids] of Object.entries(src.spells || {})) parts.push(`${L(lang, 'Nv', 'Lv')} ${lv}: ${ids.map(id => spellName(id, lang)).join(', ')}`);
  return parts.join(' · ');
}

/** Bônus racial de 2014 com escolha de atributo: bônus fixo da raça + escolha da espécie + +1 do talento da espécie. */
function raceBonusWith(char) {
  const out = { ...Utils.applyRaceBonus(char, char.race) };
  for (const [k, v] of Object.entries(speciesAsi(char))) out[k] = (out[k] || 0) + v;
  for (const [k, v] of Object.entries(speciesFeatEntry(char)?.asi || {})) out[k] = (out[k] || 0) + v;
  return out;
}

function Pick({ on, disabled, onClick, title, meta }) {
  return (
    <button type="button" className={`class-pick small ${on ? 'on' : ''}`} disabled={disabled} onClick={onClick} style={{ alignItems: 'stretch' }}>
      <span className="class-pick-name">{title}</span>
      {meta && <span className="text-xs" style={{ color: 'var(--ink-secondary)' }}>{meta}</span>}
    </button>
  );
}

function SpeciesFeat({ char, lang, spec, onFeats, locked }) {
  const entry = speciesFeatEntry(char);
  const [value, setValue] = useState(() => (entry
    ? { type: 'feat', feat: entry.name, featId: entry.id, asi: entry.asi || {}, picks: entry.picks || {}, note: entry.note || '', custom: !entry.id }
    : { type: 'feat', feat: '' }));
  if (locked) {
    return (
      <div className="text-sm muted">
        {entry ? <strong>{findFeat(entry.id)?.name[lang] || entry.name}</strong> : L(lang, 'Nenhum talento registrado.', 'No feat recorded.')}
        {' — '}{L(lang, 'em campanha, só o mestre altera talentos.', 'in a campaign, only the DM changes feats.')}
      </div>
    );
  }
  // O próprio talento da espécie não conta como "já escolhido".
  const others = { ...char, feats: (char.feats || []).filter(f => f?.origin !== 'species') };
  const change = (v) => {
    setValue(v);
    const named = v.featId || (v.feat || '').trim();
    onFeats(withSpeciesFeat(char.feats, named ? featEntry(v, 1) : null));
  };
  return <FeatPicker char={others} lang={lang} level={1} kind={spec.kind} value={value} onChange={change} />;
}

/**
 * Formulário das escolhas. onChange(patch) recebe { speciesChoices, feats?, raceBonus? }.
 * lockFeat: em campanha o talento não muda pela ficha (o servidor tranca `feats`).
 */
export default function SpeciesChoices({ char, lang, onChange, lockFeat = false }) {
  const specs = speciesChoiceSpecs(char);
  if (!specs.length) return null;
  const sc = char.speciesChoices || {};
  const needsBonus = speciesDef(char)?.choices?.some(c => c.key === 'asi') && char.rulesVersion !== '2024';
  const emit = (next) => {
    const merged = { ...char, ...next };
    onChange({ ...next, ...(needsBonus ? { raceBonus: raceBonusWith(merged) } : {}) });
  };
  const setChoice = (key, v) => {
    const next = { ...sc };
    if (v == null || (Array.isArray(v) && !v.length)) delete next[key]; else next[key] = v;
    // Trocar a linhagem zera o truque escolhido (Alto Elfo); trocar o traço variável zera a perícia.
    if (key === 'lineage' && v !== sc.lineage) delete next.cantrip;
    if (key === 'bonus' && v !== sc.bonus) delete next.skill;
    // Escolhas condicionais (`when`) que deixaram de valer somem (ex.: traço do meio-elfo ao trocar a descendência).
    const active = speciesChoiceSpecs({ ...char, speciesChoices: next });
    for (const c of speciesDef(char)?.choices || []) {
      if (c.when && c.key in next && !active.some(a => a.key === c.key)) delete next[c.key];
    }
    for (const c of active) if (c.options && next[c.key] != null && !c.options.some(o => o.id === next[c.key])) delete next[c.key];
    emit({ speciesChoices: next });
  };
  const withoutSkill = { ...char, speciesChoices: { ...sc, skill: undefined } };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {specs.map(c => {
        const title = c.label[lang];
        const v = sc[c.key];
        let body = null;
        if (c.key === 'feat') {
          body = <SpeciesFeat char={char} lang={lang} spec={c} locked={lockFeat} onFeats={feats => emit({ feats })} />;
        } else if (c.key === 'asi' && lockFeat) {
          body = <div className="text-sm muted">{L(lang, 'Em campanha, só o mestre altera atributos.', 'In a campaign, only the DM changes abilities.')}</div>;
        } else if (c.key === 'asi') {
          const cur = v && typeof v === 'object' ? v : {};
          const each = Math.max(...c.pattern);
          const used = Object.values(cur).filter(Boolean).length;
          body = (
            <div className="class-pick-grid">
              {c.from.map(k => {
                const on = !!cur[k];
                return <Pick key={k} on={on} disabled={!on && used >= c.pattern.length} title={`${tr(k, lang)}${on ? ` +${cur[k]}` : ''}`}
                  onClick={() => { const n = { ...cur }; if (on) delete n[k]; else n[k] = each; setChoice('asi', Object.keys(n).length ? n : null); }} />;
              })}
            </div>
          );
        } else if (c.key === 'cantrip') {
          // o truque marcado aqui não conta como "já tem" (sai da ficha vista sem ele)
          // O truque em uso (o escolhido ou o padrão da espécie) é mantido na lista: sem isso o
          // padrão saía como "já conhecido" e o campo mostrava o primeiro da lista (outro truque).
          const cur = v || c.default || '';
          const catalog = Utils.spellCatalog(char);
          const found = unknownSpells({ ...char, speciesChoices: { ...(char.speciesChoices || {}), cantrip: undefined } }, catalog, cur).filter(s => s.level === 0 && s.classes.includes(c.list));
          const curDef = cur && !found.some(s => s.id === cur) ? catalog.find(s => s.id === cur) : null;
          const opts = curDef ? [curDef, ...found] : found;
          body = (
            <select aria-label={title} value={cur} onChange={e => setChoice('cantrip', e.target.value || null)}>
              {!c.default && <option value="">{L(lang, 'Escolha…', 'Choose…')}</option>}
              {opts.map(s => <option key={s.id} value={s.id}>{spellName(s.id, lang)}</option>)}
            </select>
          );
        } else if (c.options) {
          body = (
            <div className="class-pick-grid">
              {c.options.map(o => {
                const extra = [o.desc?.[lang], spellLine(o, lang)].filter(Boolean).join(' ');
                return <Pick key={o.id} on={v === o.id} onClick={() => setChoice(c.key, o.id)} title={o.name[lang]} meta={extra} />;
              })}
            </div>
          );
        } else if (c.key === 'skill') {
          const n = c.count || 1;
          const cur = list(v);
          const pool = SRD.SKILLS.filter(s => !c.from || c.from.includes(s.id));
          body = (
            <div className="class-pick-grid">
              {pool.map(s => {
                const on = cur.includes(s.id);
                const have = !on && Utils.hasSkillProf(withoutSkill, s.id);
                const toggle = () => {
                  if (n === 1) return setChoice('skill', on ? null : s.id);
                  setChoice('skill', on ? cur.filter(x => x !== s.id) : [...cur, s.id]);
                };
                return <Pick key={s.id} on={on} disabled={!on && (have || (n > 1 && cur.length >= n))} onClick={toggle}
                  title={tName('skill', s.id, lang)} meta={have ? L(lang, 'já proficiente', 'already proficient') : null} />;
              })}
            </div>
          );
        } else if (c.key === 'tool' && c.from) {
          const n = c.count || 1;
          const cur = list(v);
          body = (
            <div className="class-pick-grid">
              {c.from.map(id => {
                const on = cur.includes(id);
                const toggle = () => {
                  if (n === 1) return setChoice('tool', on ? null : id);
                  setChoice('tool', on ? cur.filter(x => x !== id) : [...cur, id]);
                };
                return <Pick key={id} on={on} disabled={!on && n > 1 && cur.length >= n} onClick={toggle}
                  title={RACE_TOOL_NAMES[id]?.[lang] || id} />;
              })}
            </div>
          );
        } else if (c.from) {
          body = (
            <div className="class-pick-grid">
              {c.from.map(k => <Pick key={k} on={v === k} onClick={() => setChoice(c.key, k)} title={tr(k, lang)} />)}
            </div>
          );
        }
        return (
          <div key={c.key}>
            <label style={{ display: 'block', marginBottom: 6 }}>{title}{c.count > 1 ? <span className="muted"> ({list(v).length}/{c.count})</span> : null}</label>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** Modal da ficha para escolher/alterar as escolhas da espécie. */
export function SpeciesChoicesModal({ char, lang, onSave, onClose, askDm = false }) {
  const [draft, setDraft] = useState(char);
  // Em campanha o servidor tranca `feats` e `raceBonus`: talento e atributos ficam com o mestre.
  const issues = speciesChoiceIssues(draft).filter(i => !(char.inCampaign && (i.key === 'feat' || i.key === 'asi')));
  const save = () => {
    const patch = { speciesChoices: draft.speciesChoices || {} };
    if (!char.inCampaign) {
      patch.feats = draft.feats || [];
      if (draft.raceBonus !== char.raceBonus) patch.raceBonus = draft.raceBonus;
    }
    onSave(patch);
    onClose();
  };
  return (
    <Modal onClose={onClose} title={`${L(lang, 'Espécie', 'Species')}: ${tName('race', char.race, lang)}`}>
      <SpeciesChoices char={draft} lang={lang} lockFeat={!!char.inCampaign} onChange={patch => setDraft(d => ({ ...d, ...patch }))} />
      {issues.length > 0 && <div className="text-xs" style={{ color: 'var(--blood-bright)', marginTop: 10 }}>{issues.map(i => i[lang] || i.pt).join(' · ')}</div>}
      {/* askDm: numa campanha a troca vira pedido ao mestre; o botão e a linha dizem isso antes do toque */}
      {askDm && (
        <p className="fh-ask-dm" role="note">
          <span>{L(lang, 'Em campanha, o mestre aprova esta troca. A ficha só muda quando ele aceitar.', 'In a campaign, the DM approves this change. The sheet only changes once they accept.')}</span>
        </p>
      )}
      <div className="row" style={{ gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={onClose}>{L(lang, 'Cancelar', 'Cancel')}</button>
        <button className="btn btn-primary" onClick={save} disabled={issues.length > 0}>{askDm ? L(lang, 'Pedir ao mestre', 'Ask the DM') : L(lang, 'Salvar', 'Save')}</button>
      </div>
    </Modal>
  );
}
