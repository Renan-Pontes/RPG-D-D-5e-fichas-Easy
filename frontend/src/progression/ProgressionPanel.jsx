import { useMemo } from 'react';
import { computeProgression } from './engine.js';
import { rulesFor } from './rules.js';
import { subclassName } from './subclasses.js';
import { classOptionsData } from './options.js';
import { pickLabel, pickDesc } from './options-catalog.js';
import { placeFeatures, placeLabel, featureItemKey, featureKey } from '../sheet/feature-placement.js';
import SRD from '../../data/srd.js';
import { tName } from '../../data/i18n.js';
import Utils from '../../utils.js';
import { FeatureTimeline } from '../../components/Sheet.jsx';

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
  // Onde cada traço aparece na ficha (src/sheet/feature-placement.js): o índice abaixo diz.
  // Mesma chave da ficha: não refaz a cada tecla.
  const fkey = featureKey(character);
  const placedObj = useMemo(() => {
    try { return placeFeatures(character); } catch { return placeFeatures({}); }
  }, [fkey]); // eslint-disable-line react-hooks/exhaustive-deps
  const placed = useMemo(() => new Map((placedObj.items || []).map(i => [i.key, i])), [placedObj]);
  if (!prog.classId) return null;

  const atMaxLevel = (character.level || 1) >= 20;
  const hasUnlocked = !!unlockedLevelup && !atMaxLevel;
  const subclassRule = rulesFor(character)?.subclassPerLevel?.[character.subclass];

  return (
    <div className="progression-panel">
      <h3>{t(lang, 'Progressão', 'Progression')} — {prog.classes
        ? Utils.classLabel(character, lang, tName)
        : `${tName('class', prog.classId, lang)} ${prog.level}${prog.subclass ? ` (${subclassName(character, prog.classId, prog.subclass, lang)})` : ''}`}</h3>
      {prog.classes && <p className="muted text-sm prog-total">{t(lang, 'Nível total', 'Total level')} {prog.level} · {t(lang, 'proficiência', 'proficiency')} +{prog.profBonus}</p>}
      <p className="muted text-sm prog-rules">{character.rulesVersion === '2024' ? 'D&D 5e revisado · SRD 5.2.1' : 'D&D 5e · regras de 2014'} · <a href="/rules/SRD-5.2.1.pdf" target="_blank" rel="noreferrer">{t(lang, 'Referência de regras', 'Rules reference')}</a></p>
      {(subclassRule?.manual || subclassRule?.legacyCompatibility) && <p className="muted text-sm">{t(lang, 'Opção de suplemento: ações e escolhas especiais são registradas em Traços e resolvidas com o mestre.', 'Supplement option: record special actions and choices under Features and resolve them with your DM.')}</p>}

      {/* A mesma linha do tempo da aba Características (mesma fonte e mesma lógica:
          traços, escolhas de classe, pendências, multiclasse, truques automáticos), aqui com
          os botões para resolver as pendências */}
      <FeatureTimeline char={character} lang={lang} title={false} placed={placedObj}
        onResolveChoice={onResolveChoice} onResolveOptions={onResolveOptions} />


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
