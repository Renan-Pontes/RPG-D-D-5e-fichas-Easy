import { useMemo } from 'react';
import { computeProgression } from './engine.js';
import { rulesFor } from './rules.js';
import { subclassName } from './subclasses.js';
import { classOptionsData } from './options.js';
import { pickLabel, pickDesc } from './options-catalog.js';
import SRD from '../../data/srd.js';
import { tName } from '../../data/i18n.js';
import Utils from '../../utils.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;
const groupBy = (picks) => picks.reduce((acc, p) => ({ ...acc, [`${p.classId}:${p.pool}`]: [...(acc[`${p.classId}:${p.pool}`] || []), p] }), {});

export default function ProgressionPanel({
  character,
  lang = 'pt',
  onLevelUpRequest,
  onLevelDown,
  canRequestLevelUp = false,
  unlockedLevelup = null,
  onConsumeLevelup,
  onResolveChoice,
  onResolveOptions,
}) {
  const prog = useMemo(() => computeProgression(character), [character]);
  if (!prog.classId) return null;

  const atMaxLevel = (character.level || 1) >= 20;
  const hasUnlocked = !!unlockedLevelup && !atMaxLevel;
  const subclassRule = rulesFor(character)?.subclassPerLevel?.[character.subclass];

  return (
    <div className="progression-panel">
      <h3>{t(lang, 'Progressão', 'Progression')} — {prog.classes
        ? Utils.classLabel(character, lang, tName)
        : `${tName('class', prog.classId, lang)} ${prog.level}${prog.subclass ? ` (${subclassName(character, prog.classId, prog.subclass, lang)})` : ''}`}</h3>
      {prog.classes && <p className="muted text-sm" style={{ margin: '-6px 0 8px' }}>{t(lang, 'Nível total', 'Total level')} {prog.level} · {t(lang, 'proficiência', 'proficiency')} +{prog.profBonus}</p>}
      <p className="muted text-sm">{character.rulesVersion === '2024' ? 'D&D 5e revisado · SRD 5.2.1' : 'D&D 5e · regras de 2014'} · <a href="/rules/SRD-5.2.1.pdf" target="_blank" rel="noreferrer">{t(lang, 'Referência de regras', 'Rules reference')}</a></p>
      {(subclassRule?.manual || subclassRule?.legacyCompatibility) && <p className="muted text-sm">{t(lang, 'Opção de suplemento: ações e escolhas especiais são registradas em Traços e resolvidas com o mestre.', 'Supplement option: record special actions and choices under Features and resolve them with your DM.')}</p>}

      {prog.autoCantrips.length > 0 && (
        <div className="prog-section">
          <div className="prog-label">{t(lang, 'Truques automáticos da subclasse:', 'Auto cantrips from subclass:')}</div>
          <div className="prog-chips">
            {prog.autoCantrips.map(id => <span key={id} className="prog-chip auto">{tName('spellName', id, lang)}</span>)}
          </div>
        </div>
      )}

      {prog.pendingChoices.length > 0 && (
        <div className="prog-section pending">
          <div className="prog-label">{t(lang, 'Decisões pendentes:', 'Pending choices:')}</div>
          <ul>
            {prog.pendingChoices.map((c, i) => (
              <li key={i}>
                <strong>Nv. {c.level}</strong>{c.classId && prog.classes && <span className="muted"> ({tName('class', c.classId, lang)} {c.classLevel})</span>} — {lang === 'en' && c.reasonEn ? c.reasonEn : c.reason}
                {onResolveOptions && c.type === 'classOption' && (
                  <button className="btn btn-sm btn-primary" style={{ marginLeft: 8 }} onClick={() => onResolveOptions(c.classId || prog.classId)}>
                    {t(lang, 'Escolher agora', 'Choose now')}
                  </button>
                )}
                {onResolveChoice && (c.type === 'asiOrFeat' || c.type === 'epicBoon') && (
                  <button className="btn btn-sm btn-primary" style={{ marginLeft: 8 }} onClick={() => onResolveChoice(c.level)}>
                    {t(lang, 'Escolher agora', 'Choose now')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {prog.classOptions?.length > 0 && (
        <div className="prog-section">
          <div className="prog-label">{t(lang, 'Escolhas de classe:', 'Class choices:')}</div>
          {Object.entries(groupBy(prog.classOptions)).map(([key, picks]) => {
            const [classId, pool] = key.split(':');
            const def = classOptionsData(classId)?.pools?.[pool];
            return (
              <details key={key}>
                <summary>
                  <strong>{def?.name[lang] || pool}</strong>{prog.classes && <span className="muted"> ({tName('class', classId, lang)})</span>}: {picks.map(p => pickLabel(classId, p, lang) + (p.detail ? ` (${p.detail})` : '')).join(', ')}
                  {def?.freeSwap && onResolveOptions && (
                    <button className="btn btn-sm btn-ghost" style={{ marginLeft: 8 }} onClick={(e) => { e.preventDefault(); onResolveOptions(classId); }}>
                      {t(lang, 'Trocar', 'Swap')}
                    </button>
                  )}
                </summary>
                <ul>
                  {picks.map((p, i) => {
                    const desc = pickDesc(classId, p);
                    return <li key={i}><strong>{pickLabel(classId, p, lang)}</strong>{p.detail ? ` (${p.detail})` : ''}{desc ? <>: <em>{desc[lang]}</em></> : null}</li>;
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      )}

      {prog.classes && prog.classes.some(e => !e.primary) && (
        <div className="prog-section">
          <div className="prog-label">{t(lang, 'Proficiências de multiclasse:', 'Multiclass proficiencies:')}</div>
          <ul>
            {prog.classes.filter(e => !e.primary).map(e => (
              <li key={e.id}><strong>{tName('class', e.id, lang)}</strong> — {Utils.multiclassProfs(character, e.id)?.[lang]}</li>
            ))}
          </ul>
        </div>
      )}

      {(prog.classes || [{ id: prog.classId }]).map(e => {
        const list = prog.features.filter(f => !prog.classes || f.classId === e.id);
        return (
          <details key={e.id} className="prog-section">
            <summary>{prog.classes
              ? t(lang, `${tName('class', e.id, lang)} ${e.level}: ${list.length} traços`, `${tName('class', e.id, lang)} ${e.level}: ${list.length} features`)
              : t(lang, `${list.length} traços de classe acumulados`, `${list.length} class features accumulated`)}</summary>
            <ul>
              {list.map((f, i) => (
                <li key={i}><strong>Nv. {f.classLevel ?? f.level}</strong> — {lang === 'en' ? f.nameEn || f.name : f.name}: <em>{lang === 'en' ? f.descEn || f.desc : f.desc}</em></li>
              ))}
            </ul>
          </details>
        );
      })}

      {hasUnlocked && onConsumeLevelup && (
        <div className="prog-section unlocked-banner">
          <div className="prog-label">
            ✨ {t(lang, `Evolução liberada para o nível ${unlockedLevelup.toLevel}!`, `Evolution unlocked to level ${unlockedLevelup.toLevel}!`)}
          </div>
          <button className="btn btn-primary btn-unlock" onClick={onConsumeLevelup}>
            {t(lang, `Subir para o nível ${unlockedLevelup.toLevel} ✨`, `Level up to ${unlockedLevelup.toLevel} ✨`)}
          </button>
        </div>
      )}

      <div className="prog-actions">
        {!hasUnlocked && canRequestLevelUp && !atMaxLevel && onLevelUpRequest && (
          <button className="btn btn-primary" onClick={() => onLevelUpRequest(prog)}>
            {character.inCampaign
              ? t(lang, `Solicitar subida ao nível ${character.level + 1}`, `Request level ${character.level + 1}`)
              : t(lang, `Subir para o nível ${character.level + 1}`, `Level up to ${character.level + 1}`)}
          </button>
        )}
        {!character.inCampaign && onLevelDown && (character.level || 1) > 1 && (
          <button className="btn btn-ghost" onClick={onLevelDown}>
            {t(lang, `Voltar ao nível ${character.level - 1}`, `Back to level ${character.level - 1}`)}
          </button>
        )}
      </div>
    </div>
  );
}
