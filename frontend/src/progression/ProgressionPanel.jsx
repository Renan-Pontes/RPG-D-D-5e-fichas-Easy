import { useMemo } from 'react';
import { computeProgression } from './engine.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

export default function ProgressionPanel({
  character,
  lang = 'pt',
  onLevelUpRequest,
  canRequestLevelUp = false,
  unlockedLevelup = null,
  onConsumeLevelup,
}) {
  const prog = useMemo(() => computeProgression(character), [character]);
  if (!prog.classId) return null;

  const atMaxLevel = (character.level || 1) >= 20;
  const hasUnlocked = !!unlockedLevelup && !atMaxLevel;

  return (
    <div className="progression-panel">
      <h3>{t(lang, 'Progressão', 'Progression')} — {prog.classId} {prog.level}{prog.subclass ? ` (${prog.subclass})` : ''}</h3>

      {prog.autoCantrips.length > 0 && (
        <div className="prog-section">
          <div className="prog-label">{t(lang, 'Truques automáticos da subclasse:', 'Auto cantrips from subclass:')}</div>
          <div className="prog-chips">
            {prog.autoCantrips.map(id => <span key={id} className="prog-chip auto">{id}</span>)}
          </div>
        </div>
      )}

      {prog.pendingChoices.length > 0 && (
        <div className="prog-section pending">
          <div className="prog-label">{t(lang, 'Decisões pendentes:', 'Pending choices:')}</div>
          <ul>
            {prog.pendingChoices.map((c, i) => (
              <li key={i}><strong>Nv. {c.level}</strong> — {c.reason}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="prog-section">
        <summary>{t(lang, `${prog.features.length} traços de classe acumulados`, `${prog.features.length} class features accumulated`)}</summary>
        <ul>
          {prog.features.map((f, i) => (
            <li key={i}><strong>Nv. {f.level}</strong> — {f.name}: <em>{f.desc}</em></li>
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

      {!hasUnlocked && canRequestLevelUp && !atMaxLevel && onLevelUpRequest && (
        <button className="btn btn-primary" onClick={() => onLevelUpRequest(prog)}>
          {t(lang, `Solicitar subida ao nível ${character.level + 1}`, `Request level ${character.level + 1}`)}
        </button>
      )}
    </div>
  );
}
