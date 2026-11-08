import React from 'react';
import DiceText from '../dice/dice-text.jsx';
import './monster-statblock.css';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

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

  const saveText = m.saveText || Object.entries(m.saves || {})
    .map(([k, v]) => `${k.toUpperCase()} ${Number(v) >= 0 ? '+' : ''}${v}`)
    .join(', ');

  const skillText = m.skillText || Object.entries(m.skills || {})
    .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${Number(v) >= 0 ? '+' : ''}${v}`)
    .join(', ');

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

      {/* Métricas Primárias de Combate */}
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

      <hr className="statblock-taper" />

      {/* Tabela dos 6 Atributos */}
      <div className="statblock-abilities" role="table" aria-label={t(lang, 'Atributos', 'Ability Scores')}>
        {[
          { key: 'str', label: t(lang, 'FOR', 'STR') },
          { key: 'dex', label: t(lang, 'DES', 'DEX') },
          { key: 'con', label: t(lang, 'CON', 'CON') },
          { key: 'int', label: t(lang, 'INT', 'INT') },
          { key: 'wis', label: t(lang, 'SAB', 'WIS') },
          { key: 'cha', label: t(lang, 'CAR', 'CHA') },
        ].map(({ key, label }) => {
          const score = abils[key] ?? 10;
          return (
            <div key={key} className="statblock-abil-col" role="cell">
              <span className="statblock-abil-head">{label}</span>
              <span className="statblock-abil-val">{score} ({mod(score)})</span>
            </div>
          );
        })}
      </div>

      <hr className="statblock-taper" />

      {/* Métricas Secundárias */}
      {saveText && (
        <div className="statblock-prop">
          <span className="statblock-prop-label">{t(lang, 'Testes de Resistência', 'Saving Throws')}:</span>
          <span className="statblock-prop-val">{saveText}</span>
        </div>
      )}
      {skillText && (
        <div className="statblock-prop">
          <span className="statblock-prop-label">{t(lang, 'Perícias', 'Skills')}:</span>
          <span className="statblock-prop-val">{skillText}</span>
        </div>
      )}
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
          {bonusActions.map((ba, i) => {
            const baName = getLocalizedText(ba.name, lang);
            const baDesc = renderActionDesc(ba);
            return (
              <p key={i} className="statblock-entry">
                <strong className="statblock-entry-name">{baName}.</strong>
                <DiceText text={baDesc} lang={lang} onRoll={onRoll} />
              </p>
            );
          })}
        </div>
      )}

      {/* Reações */}
      {reactions.length > 0 && (
        <div className="statblock-section">
          <h4 className="statblock-section-title">{t(lang, 'Reações', 'Reactions')}</h4>
          {reactions.map((rc, i) => {
            const rcName = getLocalizedText(rc.name, lang);
            const rcDesc = renderActionDesc(rc);
            return (
              <p key={i} className="statblock-entry">
                <strong className="statblock-entry-name">{rcName}.</strong>
                <DiceText text={rcDesc} lang={lang} onRoll={onRoll} />
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
              `${name} pode realizar ${m.legendary?.uses || 3} ações lendárias, escolhendo entre as opções abaixo. Apenas uma opção de ação lendária pode ser usada por vez e apenas no final do turno de outra criatura. ${name} recupera as ações lendárias gastas no início de seu turno.`,
              `The ${name} can take ${m.legendary?.uses || 3} legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. The ${name} regains spent legendary actions at the start of its turn.`
            )}
          </p>
          {legendaryActions.map((la, i) => {
            const laName = getLocalizedText(la.name, lang);
            const laDesc = renderActionDesc(la);
            const cost = la.cost && la.cost > 1 ? ` (${t(lang, `Custa ${la.cost} Ações`, `Costs ${la.cost} Actions`)})` : '';
            return (
              <p key={i} className="statblock-entry">
                <strong className="statblock-entry-name">{laName}{cost}.</strong>
                <DiceText text={laDesc} lang={lang} onRoll={onRoll} />
              </p>
            );
          })}
        </div>
      )}

      <hr className="statblock-taper" />
    </div>
  );
}
