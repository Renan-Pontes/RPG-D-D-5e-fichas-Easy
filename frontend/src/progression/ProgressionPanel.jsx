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
import { byTier, tierOf, classesAt, charLevelOf } from '../sheet/feature-timeline.js';

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
  const placed = useMemo(() => {
    try { return new Map(placeFeatures(character).items.map(i => [i.key, i])); } catch { return new Map(); }
  }, [fkey]); // eslint-disable-line react-hooks/exhaustive-deps
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

      {prog.autoCantrips.length > 0 && (
        <div className="prog-section">
          <div className="prog-label">{t(lang, 'Truques automáticos da subclasse:', 'Auto cantrips from subclass:')}</div>
          <div className="prog-chips">
            {prog.autoCantrips.map(id => <span key={id} className="prog-chip auto">{tName('spellName', id, lang)}</span>)}
          </div>
        </div>
      )}

      {/* Linha do tempo (mesma da aba Características): níveis do personagem nos tiers de
          jogo, as classes de cada nível com a seta na que subiu, decisões pendentes e traços */}
      {(() => {
        const seq = (() => { try { return Utils.classSequence(character); } catch { return []; } })();
        const now = character.level || 1;
        const cur = tierOf(now);
        const map = new Map();
        const at = (lv) => { if (!map.has(lv)) map.set(lv, { level: lv, entries: [] }); return map.get(lv).entries; };
        prog.pendingChoices.forEach((c, i) => at(c.level).push({ kind: 'pending', key: `p${i}`, c }));
        prog.features.forEach((f, i) => {
          const lv = (prog.classes ? charLevelOf(seq, f.classId, f.classLevel ?? f.level) : (f.level ?? f.classLevel)) || f.level || 1;
          at(lv).push({ kind: 'feature', key: `f${i}`, f });
        });
        const groups = [...map.values()].sort((x, y) => x.level - y.level);
        if (!groups.length) return null;
        return (
          <ol className="fh-tl prog-tl">
            {byTier(groups).map(tr => (
              <li key={tr.tier} className={`fh-tl-tier${tr.tier === cur.tier ? ' is-current' : ''}${tr.from > now ? ' is-later' : ''}`}>
                <div className="fh-tl-tier-h">
                  <span className="fh-tl-tier-n">Tier {tr.tier}</span>
                  <span className="fh-tl-tier-t">{lang === 'pt' ? tr.pt : tr.en}</span>
                  <span className="fh-tl-tier-r">{t(lang, `Nv. ${tr.from}–${tr.to}`, `Lv ${tr.from}–${tr.to}`)}</span>
                </div>
                <ol className="fh-tl-levels">
                  {tr.levels.map(g => (
                    <li key={g.level} className={`fh-tl-level${g.level > now ? ' is-later' : ''}${g.level === now ? ' is-now' : ''}`}>
                      <span className="fh-tl-node">{g.level}</span>
                      <div className="fh-tl-body">
                        {classesAt(seq, g.level).length > 0 && (
                          <div className="fh-tl-classes">
                            {classesAt(seq, g.level).map(cl => (
                              <span key={cl.id} className={`fh-tl-cls${cl.up ? ' is-up' : ''}`}>
                                {tName('class', cl.id, lang)} {cl.level}
                                {cl.up && <svg className="fh-tl-up" viewBox="0 0 10 12" aria-hidden="true"><path d="M5 0 10 6H6.6V12H3.4V6H0Z" /></svg>}
                              </span>
                            ))}
                          </div>
                        )}
                        {g.entries.map(e => e.kind === 'pending' ? (
                          <div key={e.key} className="prog-tl-row is-pending">
                            <span className="fh-tl-tag is-pending">{t(lang, 'Pendente', 'Pending')}</span>
                            <span className="prog-tl-name">{lang === 'en' && e.c.reasonEn ? e.c.reasonEn : e.c.reason}</span>
                            {onResolveOptions && e.c.type === 'classOption' && (
                              <button className="btn btn-sm btn-primary prog-choose" onClick={() => onResolveOptions(e.c.classId || prog.classId)}>{t(lang, 'Escolher agora', 'Choose now')}</button>
                            )}
                            {onResolveChoice && (e.c.type === 'asiOrFeat' || e.c.type === 'epicBoon') && (
                              <button className="btn btn-sm btn-primary prog-choose" onClick={() => onResolveChoice(e.c.level)}>{t(lang, 'Escolher agora', 'Choose now')}</button>
                            )}
                          </div>
                        ) : (() => {
                          const f = e.f;
                          const item = placed.get(featureItemKey(f, f.classId || prog.classId));
                          return (
                            <details key={e.key} className="prog-tl-row">
                              <summary>
                                <span className="prog-tl-name">{lang === 'en' ? f.nameEn || f.name : f.name}</span>
                                <span className="fh-tl-tag is-class">{tName('class', f.classId || prog.classId, lang)}</span>
                              </summary>
                              <div className="prog-tl-desc">{lang === 'en' ? f.descEn || f.desc : f.desc}
                                {item && <span className="prog-where"> → {placeLabel(item, lang)}</span>}</div>
                            </details>
                          );
                        })())}
                      </div>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        );
      })()}

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
                    <button className="btn btn-sm btn-ghost prog-swap" onClick={(e) => { e.preventDefault(); onResolveOptions(classId); }}>
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
