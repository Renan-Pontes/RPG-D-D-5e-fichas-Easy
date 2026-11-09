import React, { useMemo } from 'react';
import DiceText, { executeDiceRoll } from '../dice/dice-text.jsx';
import './monster-statblock.css';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

import { ACTION_SKILL_GROUPS, computeActionGroupData, hasKeenSenses } from './monster-action-skills.js';
export { ACTION_SKILL_GROUPS, computeActionGroupData, hasKeenSenses };


const mod = (score) => {
  const n = Number(score) || 10;
  const m = Math.floor((n - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
};

const getLocalizedText = (val, lang) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return val[lang] || val.pt || val.en || '';
  return String(val);
};

export default function MonsterStatblock({ monster: m, lang = 'pt', onRoll, className = '' }) {
  if (!m) return null;

  const keen = useMemo(() => hasKeenSenses(m), [m]);

  const handleRoll = (opts, e) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(35);
    const targetEl = e?.currentTarget || (e?.target?.closest ? e.target.closest('[data-roll-adv], .statblock-roll-btn') : null);
    const elementAdv = targetEl?.getAttribute?.('data-roll-adv');
    const adv = opts?.adv || opts?.advMode || elementAdv || undefined;
    const finalOpts = adv ? { ...opts, adv, advMode: adv } : opts;
    if (onRoll) {
      onRoll(finalOpts);
    } else {
      executeDiceRoll(finalOpts);
    }
  };

  const name = getLocalizedText(m.name, lang) || 'Monster';
  const typeLine = m.typeLine || `${m.size || 'Medium'} ${m.type || 'monstrosity'}, ${m.alignment || 'unaligned'}`;
  const acText = m.acText || (m.ac != null ? String(m.ac) : '10');
  const hpText = m.hpText || (m.hitDice ? `${m.hp || 10} (${m.hitDice})` : String(m.hp || 10));
  const speedText = m.speedText || (
    typeof m.speed === 'number'
      ? `${m.speed} ft.`
      : Object.entries(m.speed || { walk: 30 })
          .map(([k, v]) => `${k !== 'walk' ? `${k} ` : ''}${v} ft.`)
          .join(', ')
  );

  const abils = m.abilities || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const dexScore = abils.dex ?? 10;
  const dexMod = Math.floor((dexScore - 10) / 2);
  const initBonus = m.initiative != null ? m.initiative : dexMod;
  const initText = `${initBonus >= 0 ? '+' : ''}${initBonus} (${10 + initBonus})`;

  // Saves fallback text if needed
  const saveText = m.saveText || Object.entries(m.saves || {})
    .map(([k, v]) => `${k.toUpperCase()} ${Number(v) >= 0 ? '+' : ''}${v}`)
    .join(', ');

  const explicitSkillMap = useMemo(() => {
    const map = new Map();
    if (m.skills && typeof m.skills === 'object') {
      for (const [k, v] of Object.entries(m.skills)) {
        map.set(k.toLowerCase().replace(/[\s_\-]/g, ''), Number(v) || 0);
      }
    }
    if (m.skillText && typeof m.skillText === 'string') {
      for (const part of m.skillText.split(',')) {
        const match = part.trim().match(/^([A-Za-z\s]+)\s*([+-]\s*\d+)$/);
        if (match) {
          map.set(match[1].trim().toLowerCase().replace(/[\s_\-]/g, ''), parseInt(match[2].replace(/\s+/g, ''), 10));
        }
      }
    }
    return map;
  }, [m.skills, m.skillText]);

  const actionSkillData = useMemo(() => {
    return ACTION_SKILL_GROUPS.map((grp) => ({
      ...grp,
      ...computeActionGroupData(grp, abils, explicitSkillMap, lang, { hasKeen: keen }),
    }));
  }, [abils, explicitSkillMap, lang, keen]);

  // Skills parsing for interactive chips
  const skillsObj = m.skills || {};
  const skillsList = Object.keys(skillsObj).length > 0
    ? Object.entries(skillsObj).map(([k, v]) => {
        const bonus = Number(v) || 0;
        const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
        const displayName = k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1');
        return { name: displayName, bonus, bonusStr };
      })
    : (m.skillText
        ? m.skillText.split(',').map(s => s.trim()).filter(Boolean).map(s => {
            const match = s.match(/^([A-Za-z\s]+)\s*([+-]\s*\d+)$/);
            if (match) {
              const b = parseInt(match[2].replace(/\s+/g, ''), 10);
              return { name: match[1].trim(), bonus: b, bonusStr: b >= 0 ? `+${b}` : `${b}` };
            }
            return { name: s, bonus: 0, bonusStr: '+0' };
          })
        : []);

  const vulnText = m.vulnText || (m.damageVulnerabilities || []).join(', ');
  const resistText = m.resistText || (m.damageResistances || []).join(', ');
  const immuneText = m.immuneText || (m.damageImmunities || []).join(', ');
  const conditionImmuneText = m.conditionImmuneText || (m.conditionImmunities || []).join(', ');
  const sensesText = m.senses || '—';
  const languagesText = m.languages || '—';

  const cr = m.cr ?? '0';
  const xp = m.xp != null ? m.xp : null;
  const pb = m.proficiencyBonus != null ? m.proficiencyBonus : (m.proficiency || 2);

  const traits = m.traits || [];
  const rawActions = m.actions || [];
  const hasTaggedActions = rawActions.some(a => a.kind);

  const actions = hasTaggedActions
    ? rawActions.filter(a => !a.kind || a.kind === 'action')
    : rawActions;
  const bonusActions = (m.bonusActions && m.bonusActions.length > 0)
    ? m.bonusActions
    : (hasTaggedActions ? rawActions.filter(a => a.kind === 'bonus') : []);
  const reactions = (m.reactions && m.reactions.length > 0)
    ? m.reactions
    : (hasTaggedActions ? rawActions.filter(a => a.kind === 'reaction') : []);
  const legendaryActions = (m.legendary?.actions && m.legendary.actions.length > 0)
    ? m.legendary.actions
    : (hasTaggedActions ? rawActions.filter(a => a.kind === 'legendary') : []);

  const renderActionDesc = (act) => {
    const desc = getLocalizedText(act.desc, lang);
    if (desc) return desc;
    const parts = [];
    if (act.atk != null) parts.push(`${act.atk >= 0 ? '+' : ''}${act.atk} to hit`);
    if (act.range) parts.push(`range ${act.range}`);
    if (act.damage) parts.push(`Hit: ${act.damage} ${act.damageType || ''} damage`);
    if (act.save) parts.push(`DC ${act.save.dc} ${act.save.ability} save`);
    return parts.join(', ');
  };

  return (
    <div className={`statblock-card ${className}`}>
      {/* Cabeçalho */}
      <header className="statblock-header">
        <h3 className="statblock-name">{name}</h3>
        <p className="statblock-meta">{typeLine}</p>
      </header>

      <hr className="statblock-taper" />

      {/* Métricas Primárias de Combate (D&D 5e 2024 Layout com Iniciativa) */}
      <div className="statblock-prop">
        <span className="statblock-prop-label">{t(lang, 'Classe de Armadura', 'Armor Class')}:</span>
        <span className="statblock-prop-val">{acText}</span>
      </div>
      <div className="statblock-prop">
        <span className="statblock-prop-label">{t(lang, 'Pontos de Vida', 'Hit Points')}:</span>
        <span className="statblock-prop-val">{hpText}</span>
      </div>
      <div className="statblock-prop">
        <span className="statblock-prop-label">{t(lang, 'Deslocamento', 'Speed')}:</span>
        <span className="statblock-prop-val">{speedText}</span>
      </div>
      <div className="statblock-prop statblock-prop-init">
        <span className="statblock-prop-label">{t(lang, 'Iniciativa', 'Initiative')}:</span>
        <button
          type="button"
          className="statblock-roll-btn init-btn statblock-init-btn"
          data-roll-check={`1d20${initBonus >= 0 ? '+' : ''}${initBonus}`}
          data-roll-label={`${name}: ${t(lang, 'Iniciativa', 'Initiative')} (${initBonus >= 0 ? '+' : ''}${initBonus})`}
          onClick={(e) => handleRoll({
            formula: `1d20${initBonus >= 0 ? '+' : ''}${initBonus}`,
            label: `${name}: ${t(lang, 'Iniciativa', 'Initiative')} (${initBonus >= 0 ? '+' : ''}${initBonus})`,
            isCheck: true,
            sheet: true,
          }, e)}
          title={t(lang, `Toque para rolar iniciativa (1d20${initBonus >= 0 ? '+' : ''}${initBonus}). Deslize ↑ para Vantagem ou ↓ para Desvantagem.`, `Tap to roll initiative (1d20${initBonus >= 0 ? '+' : ''}${initBonus}). Swipe ↑ for Advantage or ↓ for Disadvantage.`)}
          aria-label={t(lang, `Rolar Iniciativa ${initText}`, `Roll Initiative ${initText}`)}
        >
          <span className="statblock-roll-glyph" aria-hidden="true">⚡</span>
          <span className="statblock-roll-val">{initText}</span>
        </button>
      </div>

      <hr className="statblock-taper" />

      {/* Tabela dos 6 Atributos - D&D 5e 2024 Layout com Atributos e Salvaguardas Integradas */}
      <div className="statblock-abilities dnd-2024-grid" role="table" aria-label={t(lang, 'Atributos e Salvaguardas', 'Ability Scores & Saves')}>
        {[
          { key: 'str', label: t(lang, 'FOR', 'STR'), full: t(lang, 'Força', 'Strength') },
          { key: 'dex', label: t(lang, 'DES', 'DEX'), full: t(lang, 'Destreza', 'Dexterity') },
          { key: 'con', label: t(lang, 'CON', 'CON'), full: t(lang, 'Constituição', 'Constitution') },
          { key: 'int', label: t(lang, 'INT', 'INT'), full: t(lang, 'Inteligência', 'Intelligence') },
          { key: 'wis', label: t(lang, 'SAB', 'WIS'), full: t(lang, 'Sabedoria', 'Wisdom') },
          { key: 'cha', label: t(lang, 'CAR', 'CHA'), full: t(lang, 'Carisma', 'Charisma') },
        ].map(({ key, label, full }) => {
          const score = abils[key] ?? 10;
          const mVal = Math.floor((score - 10) / 2);
          const mStr = mVal >= 0 ? `+${mVal}` : `${mVal}`;
          const explicitSave = m.saves?.[key];
          const saveVal = explicitSave != null ? Number(explicitSave) : mVal;
          const saveStr = saveVal >= 0 ? `+${saveVal}` : `${saveVal}`;

          return (
            <div key={key} className="statblock-abil-col" role="cell">
              <span className="statblock-abil-head">{label}</span>

              {/* Botão de Teste de Atributo (Ability Check) */}
              <button
                type="button"
                className="statblock-roll-btn abil-btn"
                data-roll-check={`1d20${mStr}`}
                data-roll-label={`${name}: ${t(lang, 'Teste de', 'Check')} ${full} (${mStr})`}
                onClick={(e) => handleRoll({
                  formula: `1d20${mStr}`,
                  label: `${name}: ${t(lang, 'Teste de', 'Check')} ${full} (${mStr})`,
                  isCheck: true,
                  sheet: true,
                }, e)}
                title={t(lang, `Toque para Teste de ${full} (1d20${mStr}). Deslize ↑ para Vantagem ou ↓ para Desvantagem.`, `Tap for ${full} Check (1d20${mStr}). Swipe ↑ for Advantage or ↓ for Disadvantage.`)}
                aria-label={t(lang, `Teste de ${full} ${score} (${mStr})`, `${full} Check ${score} (${mStr})`)}
              >
                <span className="statblock-abil-score">{score}</span>
                <span className="statblock-abil-mod">({mStr})</span>
              </button>

              {/* Botão de Salvaguarda (Saving Throw) */}
              <button
                type="button"
                className={`statblock-roll-btn save-btn ${explicitSave != null ? 'is-proficient' : ''}`}
                data-roll-save={`1d20${saveStr}`}
                data-roll-label={`${name}: ${t(lang, 'Salvaguarda de', 'Save')} ${full} (${saveStr})`}
                onClick={(e) => handleRoll({
                  formula: `1d20${saveStr}`,
                  label: `${name}: ${t(lang, 'Salvaguarda de', 'Save')} ${full} (${saveStr})`,
                  isSave: true,
                  sheet: true,
                }, e)}
                title={t(lang, `Toque para Salvaguarda de ${full} (1d20${saveStr}). Deslize ↑ para Vantagem ou ↓ para Desvantagem.`, `Tap for ${full} Saving Throw (1d20${saveStr}). Swipe ↑ for Advantage or ↓ for Disadvantage.`)}
                aria-label={t(lang, `Salvaguarda de ${full} ${saveStr}`, `${full} Save ${saveStr}`)}
              >
                <span className="statblock-save-tag">{t(lang, 'Salva', 'Save')}</span>
                <span className="statblock-save-val">{saveStr}</span>
              </button>
            </div>
          );
        })}
      </div>

      <hr className="statblock-taper" />

      {/* Ações de Perícias D&D 5e 2024: Busca, Estudo, Influência, Furtividade */}
      <div className="statblock-actions-skills" aria-label={t(lang, 'Ações e Perícias (D&D 2024)', 'Action & Skill Groups (D&D 2024)')}>
        <div className="statblock-prop-label" style={{ marginBottom: 4 }}>
          {t(lang, 'Ações de Perícias & Pontuações Passivas (D&D 2024)', 'Action Skills & Passive Scores (D&D 2024)')}:
        </div>
        {actionSkillData.map((grp) => (
          <details key={grp.key} className="statblock-action-details">
            <summary className="statblock-action-summary">
              <span className="statblock-action-header-left">
                <span className="statblock-action-icon" aria-hidden="true">{grp.icon}</span>
                <span className="statblock-action-title">{grp.groupTitle}</span>
              </span>

              <div className="statblock-action-summary-actions">
                {/* Botão de rolagem direta da ação pelo bônus base consolidado */}
                <button
                  type="button"
                  className="statblock-roll-btn statblock-action-header-roll-btn"
                  data-roll-check={`1d20${grp.baselineBonusStr}`}
                  data-roll-label={`${name}: ${grp.groupTitle} (${grp.baselineBonusStr})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleRoll({
                      formula: `1d20${grp.baselineBonusStr}`,
                      label: `${name}: ${grp.groupTitle} (${grp.baselineBonusStr})`,
                      isCheck: true,
                      sheet: true,
                    }, e);
                  }}
                  title={t(lang, `Toque para rolar ${grp.groupTitle} (1d20${grp.baselineBonusStr}). Deslize ↑ para Vantagem ou ↓ para Desvantagem.`, `Tap to roll ${grp.groupTitle} (1d20${grp.baselineBonusStr}). Swipe ↑ for Advantage or ↓ for Disadvantage.`)}
                  aria-label={t(lang, `Rolar ${grp.groupTitle} ${grp.baselineBonusStr}`, `Roll ${grp.groupTitle} ${grp.baselineBonusStr}`)}
                >
                  <span className="statblock-action-roll-dice" aria-hidden="true">🎲</span>
                  <span className="statblock-action-roll-score">{grp.baselinePassive}/{grp.baselineBonusStr}</span>
                </button>

                {/* Exceções expostas com botão interativo (ex: Percepção com Vantagem em Sentidos Aguçados) */}
                {grp.exceptions?.map((exc) => (
                  <button
                    key={exc.id}
                    type="button"
                    className={`statblock-roll-btn statblock-action-exception-btn${exc.defaultAdv ? ' has-adv' : ''}`}
                    data-roll-check={`1d20${exc.bonusStr}`}
                    data-roll-label={`${name}: ${exc.name} (${exc.bonusStr})`}
                    data-roll-adv={exc.defaultAdv}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRoll({
                        formula: `1d20${exc.bonusStr}`,
                        label: `${name}: ${exc.name} (${exc.bonusStr})`,
                        isCheck: true,
                        sheet: true,
                        ...(exc.defaultAdv ? { adv: exc.defaultAdv, advMode: exc.defaultAdv } : {}),
                      }, e);
                    }}
                    title={t(lang, `Toque para rolar ${exc.name} (1d20${exc.bonusStr})${exc.isKeen ? ' [Vantagem automática por Sentidos Aguçados]' : ''}. Deslize ↑ para Vantagem ou ↓ para Desvantagem.`, `Tap to roll ${exc.name} (1d20${exc.bonusStr})${exc.isKeen ? ' [Automatic Advantage from Keen Senses]' : ''}. Swipe ↑ for Advantage or ↓ for Disadvantage.`)}
                    aria-label={t(lang, `Rolar ${exc.name} ${exc.bonusStr}`, `Roll ${exc.name} ${exc.bonusStr}`)}
                  >
                    <span className="statblock-exception-text">{exc.passive}/{exc.bonusStr} {exc.name}</span>
                    {exc.defaultAdv && <span className="statblock-adv-badge" aria-label="Vantagem">▲</span>}
                  </button>
                ))}
              </div>

              <span className="statblock-action-chevron" aria-hidden="true">▾</span>
            </summary>
            <div className="statblock-action-grid">
              {grp.skills.map((sk) => (
                <div key={sk.id} className={`statblock-action-skill-row${sk.isTrained ? ' is-trained' : ''}`}>
                  <span className="statblock-action-skill-name" title={`${sk.name} (${sk.abilUpper})`}>
                    {sk.name} <abbr>({sk.abilUpper})</abbr>
                  </span>
                  <div className="statblock-action-skill-controls">
                    <span className="statblock-action-skill-pass" title={t(lang, 'Passiva', 'Passive')}>
                      {sk.passive}
                    </span>
                    <button
                      type="button"
                      className={`statblock-roll-btn statblock-action-skill-btn${sk.defaultAdv ? ' has-adv' : ''}`}
                      data-roll-check={`1d20${sk.bonusStr}`}
                      data-roll-label={`${name}: ${sk.name} (${sk.bonusStr})`}
                      data-roll-adv={sk.defaultAdv}
                      onClick={(e) => handleRoll({
                        formula: `1d20${sk.bonusStr}`,
                        label: `${name}: ${t(lang, 'Perícia', 'Skill')} ${sk.name} (${sk.bonusStr})`,
                        isCheck: true,
                        sheet: true,
                        ...(sk.defaultAdv ? { adv: sk.defaultAdv, advMode: sk.defaultAdv } : {}),
                      }, e)}
                      title={t(lang, `Toque para rolar ${sk.name} (1d20${sk.bonusStr})${sk.isKeen ? ' [Vantagem automática por Sentidos Aguçados]' : ''}. Deslize ↑ para Vantagem ou ↓ para Desvantagem.`, `Tap to roll ${sk.name} (1d20${sk.bonusStr})${sk.isKeen ? ' [Automatic Advantage from Keen Senses]' : ''}. Swipe ↑ for Advantage or ↓ for Disadvantage.`)}
                      aria-label={t(lang, `Rolar ${sk.name} ${sk.bonusStr}`, `Roll ${sk.name} ${sk.bonusStr}`)}
                    >
                      <span>{sk.bonusStr}</span>
                      {sk.defaultAdv && <span className="statblock-adv-badge" aria-label="Vantagem">▲</span>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>

      {/* Métricas Secundárias */}
      {skillsList.length > 0 ? (
        <div className="statblock-prop">
          <span className="statblock-prop-label">{t(lang, 'Perícias', 'Skills')}:</span>
          <span className="statblock-prop-val statblock-skills-wrap">
            {skillsList.map(({ name: skName, bonusStr }, idx) => {
              const isKeenPercep = skName.toLowerCase().includes('percep') && keen;
              const defaultAdv = isKeenPercep ? 'adv' : undefined;
              return (
                <button
                  key={idx}
                  type="button"
                  className={`statblock-roll-btn statblock-skill-chip${defaultAdv ? ' has-adv' : ''}`}
                  data-roll-check={`1d20${bonusStr}`}
                  data-roll-label={`${name}: ${t(lang, 'Perícia', 'Skill')} ${skName} (${bonusStr})`}
                  data-roll-adv={defaultAdv}
                  onClick={(e) => handleRoll({
                    formula: `1d20${bonusStr}`,
                    label: `${name}: ${t(lang, 'Perícia', 'Skill')} ${skName} (${bonusStr})`,
                    isCheck: true,
                    sheet: true,
                    ...(defaultAdv ? { adv: defaultAdv, advMode: defaultAdv } : {}),
                  }, e)}
                  title={t(lang, `Toque para rolar ${skName} (1d20${bonusStr})${isKeenPercep ? ' [Vantagem automática por Sentidos Aguçados]' : ''}. Deslize ↑ para Vantagem ou ↓ para Desvantagem.`, `Tap to roll ${skName} (1d20${bonusStr})${isKeenPercep ? ' [Automatic Advantage from Keen Senses]' : ''}. Swipe ↑ for Advantage or ↓ for Disadvantage.`)}
                  aria-label={t(lang, `Rolar Perícia ${skName} ${bonusStr}`, `Roll Skill ${skName} ${bonusStr}`)}
                >
                  <span className="statblock-skill-glyph" aria-hidden="true">🎯</span>
                  <span className="statblock-skill-name">{skName}</span>
                  <span className="statblock-skill-bonus">{bonusStr}</span>
                  {defaultAdv && <span className="statblock-adv-badge" aria-label="Vantagem">▲</span>}
                </button>
              );
            })}
          </span>
        </div>
      ) : null}

      {vulnText && (
        <div className="statblock-prop">
          <span className="statblock-prop-label">{t(lang, 'Vulnerabilidades a Dano', 'Damage Vulnerabilities')}:</span>
          <span className="statblock-prop-val">{vulnText}</span>
        </div>
      )}
      {resistText && (
        <div className="statblock-prop">
          <span className="statblock-prop-label">{t(lang, 'Resistências a Dano', 'Damage Resistances')}:</span>
          <span className="statblock-prop-val">{resistText}</span>
        </div>
      )}
      {immuneText && (
        <div className="statblock-prop">
          <span className="statblock-prop-label">{t(lang, 'Imunidades a Dano', 'Damage Immunities')}:</span>
          <span className="statblock-prop-val">{immuneText}</span>
        </div>
      )}
      {conditionImmuneText && (
        <div className="statblock-prop">
          <span className="statblock-prop-label">{t(lang, 'Imunidades a Condição', 'Condition Immunities')}:</span>
          <span className="statblock-prop-val">{conditionImmuneText}</span>
        </div>
      )}
      <div className="statblock-prop">
        <span className="statblock-prop-label">{t(lang, 'Sentidos', 'Senses')}:</span>
        <span className="statblock-prop-val">{sensesText}</span>
      </div>
      <div className="statblock-prop">
        <span className="statblock-prop-label">{t(lang, 'Idiomas', 'Languages')}:</span>
        <span className="statblock-prop-val">{languagesText}</span>
      </div>
      <div className="statblock-prop">
        <span className="statblock-prop-label">{t(lang, 'Desafio', 'Challenge')}:</span>
        <span className="statblock-prop-val">
          {cr} {xp != null ? `(${xp.toLocaleString('en-US')} XP)` : ''} · <span className="statblock-prop-label">{t(lang, 'Bônus de Proficiência', 'Proficiency Bonus')}:</span> +{pb}
        </span>
      </div>

      <hr className="statblock-taper" />

      {/* Traços / Características */}
      {traits.length > 0 && (
        <div className="statblock-section">
          {traits.map((tr, i) => {
            const trName = getLocalizedText(tr.name, lang);
            const trDesc = getLocalizedText(tr.desc, lang);
            return (
              <p key={i} className="statblock-entry">
                <strong className="statblock-entry-name">{trName}.</strong>
                <DiceText text={trDesc} lang={lang} onRoll={onRoll} />
              </p>
            );
          })}
        </div>
      )}

      {/* Ações */}
      {actions.length > 0 && (
        <div className="statblock-section">
          <h4 className="statblock-section-title">{t(lang, 'Ações', 'Actions')}</h4>
          {actions.map((act, i) => {
            const actName = getLocalizedText(act.name, lang);
            const actDesc = renderActionDesc(act);
            return (
              <p key={i} className="statblock-entry">
                <strong className="statblock-entry-name">{actName}.</strong>
                <DiceText text={actDesc} lang={lang} onRoll={onRoll} />
              </p>
            );
          })}
        </div>
      )}

      {/* Ações Bônus */}
      {bonusActions.length > 0 && (
        <div className="statblock-section">
          <h4 className="statblock-section-title">{t(lang, 'Ações Bônus', 'Bonus Actions')}</h4>
          {bonusActions.map((act, i) => {
            const actName = getLocalizedText(act.name, lang);
            const actDesc = renderActionDesc(act);
            return (
              <p key={i} className="statblock-entry">
                <strong className="statblock-entry-name">{actName}.</strong>
                <DiceText text={actDesc} lang={lang} onRoll={onRoll} />
              </p>
            );
          })}
        </div>
      )}

      {/* Reações */}
      {reactions.length > 0 && (
        <div className="statblock-section">
          <h4 className="statblock-section-title">{t(lang, 'Reações', 'Reactions')}</h4>
          {reactions.map((act, i) => {
            const actName = getLocalizedText(act.name, lang);
            const actDesc = renderActionDesc(act);
            return (
              <p key={i} className="statblock-entry">
                <strong className="statblock-entry-name">{actName}.</strong>
                <DiceText text={actDesc} lang={lang} onRoll={onRoll} />
              </p>
            );
          })}
        </div>
      )}

      {/* Ações Lendárias */}
      {legendaryActions.length > 0 && (
        <div className="statblock-section">
          <h4 className="statblock-section-title">{t(lang, 'Ações Lendárias', 'Legendary Actions')}</h4>
          <p className="statblock-section-desc">
            {t(
              lang,
              `A criatura pode realizar ${m.legendary?.uses || 3} ações lendárias, escolhendo entre as opções abaixo. Apenas uma ação lendária pode ser usada por vez e apenas no final do turno de outra criatura. Ela recupera as ações gastas no início do seu turno.`,
              `The creature can take ${m.legendary?.uses || 3} legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. It regains spent legendary actions at the start of its turn.`
            )}
          </p>
          {legendaryActions.map((act, i) => {
            const actName = getLocalizedText(act.name, lang);
            const actDesc = renderActionDesc(act);
            const cost = act.cost || 1;
            return (
              <p key={i} className="statblock-entry">
                <strong className="statblock-entry-name">{actName}</strong>
                {cost > 1 && (
                  <span className="statblock-entry-cost">
                    {t(lang, `(Custa ${cost} Ações)`, `(Costs ${cost} Actions)`)}.
                  </span>
                )}
                <DiceText text={actDesc} lang={lang} onRoll={onRoll} />
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
