import { useMemo } from 'react';
import { computeProgression } from './engine.js';
import { rulesFor } from './rules.js';
import SRD from '../../data/srd.js';
import { tName } from '../../data/i18n.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

export default function ProgressionPanel({
  character,
  lang = 'pt',
  onLevelUpRequest,
  onLevelDown,
  canRequestLevelUp = false,
  unlockedLevelup = null,
  onConsumeLevelup,
  onResolveChoice,
}) {
  const prog = useMemo(() => computeProgression(character), [character]);
  if (!prog.classId) return null;

  const atMaxLevel = (character.level || 1) >= 20;
  const hasUnlocked = !!unlockedLevelup && !atMaxLevel;
  const subclassRule = rulesFor(character)?.subclassPerLevel?.[character.subclass];

  return (
    <div className="progression-panel">
      <h3>{t(lang, 'Progressão', 'Progression')} — {tName('class', prog.classId, lang)} {prog.level}{prog.subclass ? ` (${SRD.SUBCLASSES[prog.classId]?.find(s => s.id.toLowerCase() === prog.subclass.toLowerCase())?.name[lang] || prog.subclass})` : ''}</h3>
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
                <strong>Nv. {c.level}</strong> — {c.reason}
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

      <details className="prog-section">
        <summary>{t(lang, `${prog.features.length} traços de classe acumulados`, `${prog.features.length} class features accumulated`)}</summary>
        <ul>
          {prog.features.map((f, i) => (
            <li key={i}><strong>Nv. {f.level}</strong> — {lang === 'en' ? f.nameEn || f.name : f.name}: <em>{lang === 'en' ? f.descEn || f.desc : f.desc}</em></li>
          ))}
        </ul>
      </details>

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
