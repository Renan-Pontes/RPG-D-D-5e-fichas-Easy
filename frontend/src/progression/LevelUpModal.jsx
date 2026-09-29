/* Subida de nível guiada: PV, ASI/talento e magias, com os limites das regras.
 * Também resolve um ASI pendente de nível antigo (onlyChoiceLevel). */
import { useState, useEffect } from 'react';
import SRD from '../../data/srd.js';
import Utils from '../../utils.js';
import { t, tName } from '../../data/i18n.js';
import Icon from '../../components/Icons.jsx';
import { Modal, Filigree } from '../../components/Shared.jsx';
import { HIT_DIE, levelChoiceKind, validateLevelChoice, validateClassOptions } from './engine.js';
import ClassOptionsPicker, { openPools } from './ClassOptionsPicker.jsx';
import { pickLabel } from './options-catalog.js';
import { withClassLevel } from './multiclass.js';
import FeatPicker, { featCtx, picksText } from './FeatPicker.jsx';
import { progHasFightingStyle } from './feat-rules.js';
import { computeProgression } from './engine.js';
import { spellbookGain, spellbookCandidates, SPELLBOOK_CLASS } from './spellbook.js';

const box = { background: 'var(--bg-elev)', borderRadius: 8, padding: 14, marginBottom: 8 };

const ChoiceStep = ({ char, featChar, hasFightingStyle, lang, level, kind, choice, setChoice }) => {
  const type = kind === 'epic' ? 'feat' : choice.type;
  const asi = choice.asi || {};
  const total = Object.values(asi).reduce((a, b) => a + b, 0);
  const bump = (k, d) => {
    const v = Math.max(0, Math.min(2, (asi[k] || 0) + d));
    setChoice({ ...choice, type: 'asi', asi: { ...asi, [k]: v } });
  };
  return (
    <>
      <h3 style={{ marginBottom: 4 }}>
        {kind === 'epic'
          ? (lang === 'pt' ? `Nível ${level}: Dádiva Épica` : `Level ${level}: Epic Boon`)
          : (lang === 'pt' ? `Nível ${level}: Aumento de Atributo ou Talento` : `Level ${level}: Ability Score Improvement or Feat`)}
      </h3>
      {kind !== 'epic' && (
        <div className="row gap-2" style={{ margin: '8px 0 12px' }}>
          <button className={`btn ${type === 'asi' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setChoice({ type: 'asi', asi: {} })}>
            {lang === 'pt' ? '+2 em atributos' : '+2 to abilities'}
          </button>
          <button className={`btn ${type === 'feat' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setChoice({ type: 'feat', feat: '' })}>
            {lang === 'pt' ? 'Talento' : 'Feat'}
          </button>
        </div>
      )}
      {type === 'asi' ? (
        <>
          <div className="muted text-sm" style={{ marginBottom: 8 }}>
            {lang === 'pt' ? '+2 num atributo ou +1 em dois. Máximo 20.' : '+2 to one or +1 to two. Max 20.'}
            {' '}<strong style={{ color: total === 2 ? 'var(--moss-bright)' : 'var(--gold)' }}>{total}/2</strong>
          </div>
          {SRD.ABILITIES.map(k => {
            const base = Utils.abilityWithRace(char, k);
            const d = asi[k] || 0;
            const canUp = total < 2 && d < 2 && base + d < 20;
            return (
              <div key={k} className="row gap-3" style={{ padding: '8px 0', borderBottom: '1px solid var(--stroke-faint)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--display)' }}>{t(k, lang)}</div>
                  <div className="text-xs muted">{base} → <strong style={{ color: d ? 'var(--moss-bright)' : 'var(--ink-secondary)' }}>{base + d}</strong></div>
                </div>
                <div className="dice-stepper" style={{ width: 120 }}>
                  <button onClick={() => bump(k, -1)} disabled={!d}>−</button>
                  <span className="dice-stepper-val">+{d}</span>
                  <button onClick={() => bump(k, 1)} disabled={!canUp}>+</button>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <FeatPicker char={featChar || char} lang={lang} level={level} kind={kind === 'epic' ? 'epic' : 'asi'}
          hasFightingStyle={hasFightingStyle} value={choice} onChange={setChoice} cheat={!!char.cheatMode} />
      )}
    </>
  );
};

// Passo 1: continuar numa classe atual ou abrir uma nova (multiclasse).
const ClassStep = ({ char, lang, classId, setClassId, allowMulticlass, cheat }) => {
  const pt = lang === 'pt';
  const entries = Utils.classEntries(char);
  const others = SRD.CLASSES.filter(c => !entries.some(e => e.id === c.id));
  const abilityName = (k) => t(k + 'Sh', lang);
  const profs = Utils.multiclassProfs(char, classId);
  const isNew = !entries.some(e => e.id === classId);
  return (
    <>
      <h3 style={{ marginBottom: 4 }}>{pt ? 'Em qual classe?' : 'Which class?'}</h3>
      <div className="muted text-sm" style={{ marginBottom: 10 }}>
        {pt ? 'O nível novo vai para uma das suas classes ou abre uma classe nova.' : 'The new level goes to one of your classes or opens a new one.'}
      </div>
      <div className="class-pick-list">
        {entries.map(e => (
          <button key={e.id} type="button" className={`class-pick ${classId === e.id ? 'on' : ''}`} onClick={() => setClassId(e.id)}>
            <span className="class-pick-name">{tName('class', e.id, lang)}</span>
            <span className="class-pick-meta mono">{e.level} → {e.level + 1}</span>
          </button>
        ))}
      </div>
      {allowMulticlass ? (
        <>
          <Filigree>{pt ? 'Nova classe (multiclasse)' : 'New class (multiclass)'}</Filigree>
          <div className="class-pick-grid">
            {others.map(c => {
              const check = Utils.canMulticlassInto(char, c.id);
              const blocked = !check.ok && !cheat;
              const why = check.missing.map(m => `${tName('class', m.classId, lang)}: ${m.group.map(abilityName).join(pt ? ' ou ' : ' or ')} 13`).join(' · ');
              return (
                <button key={c.id} type="button" disabled={blocked} title={why}
                  className={`class-pick small ${classId === c.id ? 'on' : ''}`} onClick={() => setClassId(c.id)}>
                  <span className="class-pick-name">{tName('class', c.id, lang)}</span>
                  <span className="class-pick-meta">{check.ok ? `d${c.hitDie}` : (pt ? 'requer ' : 'needs ') + why.replace(/^[^:]+: /, '')}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="muted text-xs" style={{ marginTop: 10 }}>{pt ? 'O mestre não liberou multiclasse nesta subida.' : 'Your DM did not allow multiclassing for this level.'}</div>
      )}
      {isNew && profs && (
        <div className="class-pick-note">
          <strong>{pt ? 'Ao entrar na classe você ganha:' : 'Multiclassing grants:'}</strong> {profs[lang]}
          {cheat && !Utils.canMulticlassInto(char, classId).ok && <div className="text-xs" style={{ color: 'var(--blood-bright)', marginTop: 4 }}>{pt ? 'Sem o pré-requisito (modo trapaça).' : 'Prerequisite not met (cheat mode).'}</div>}
        </div>
      )}
    </>
  );
};

export default function LevelUpModal({ char, lang, onConfirm, onClose, onlyChoiceLevel = null, allowMulticlass = true }) {
  const cheat = !!char.cheatMode;
  const choiceOnly = onlyChoiceLevel != null;
  const newLevel = choiceOnly ? onlyChoiceLevel : (char.level || 1) + 1;
  // Padrão: a classe do último nível ganho (continua o caminho atual).
  const [classId, setClassId] = useState(() => Utils.classSequence(char).at(-1) || char.className);
  const isNewClass = !Utils.classEntries(char).some(e => e.id === classId);
  const after = choiceOnly ? char : { ...withClassLevel(char, classId), level: newLevel };
  const kind = levelChoiceKind(after, newLevel);
  const [choice, setChoice] = useState(kind === 'epic' ? { type: 'feat', feat: '' } : { type: 'asi', asi: {} });
  useEffect(() => { setChoice(kind === 'epic' ? { type: 'feat', feat: '' } : { type: 'asi', asi: {} }); }, [kind]);

  // PV: média (arredondada para cima) ou rolagem do dado da classe escolhida, + CON; mínimo 1.
  const hitDie = HIT_DIE[classId] || 8;
  const conMod = Utils.abilityMod(char, 'con');
  const avgHp = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
  const [hpMode, setHpMode] = useState('avg');
  const [rolled, setRolled] = useState(null);
  useEffect(() => { setHpMode('avg'); setRolled(null); }, [classId]);
  const hpGain = hpMode === 'roll' && rolled != null ? Math.max(1, rolled + conMod) : avgHp;
  const rollHp = () => {
    setRolled(Math.floor(Math.random() * hitDie) + 1);
    if (window.__diceRoll) window.__diceRoll({ die: hitDie, mod: conMod, label: lang === 'pt' ? 'PV de nível' : 'Level HP' });
  };

  // Perícia ganha ao entrar como multiclasse (bardo, ranger, ladino).
  const skillCount = !choiceOnly && isNewClass ? (Utils.multiclassProfs(char, classId)?.skill || 0) : 0;
  const skillOptions = skillCount ? (SRD.CLASSES.find(c => c.id === classId)?.skillsFrom || []).filter(k => !(char.skillProfs || []).includes(k)) : [];
  const [skillAdded, setSkillAdded] = useState('');
  useEffect(() => { setSkillAdded(''); }, [classId]);

  // Magias da classe escolhida, vista isoladamente (limites e lista dela).
  const entry = Utils.classEntries(after).find(e => e.id === classId);
  const view = entry ? Utils.classView(after, entry) : after;
  const isCaster = !choiceOnly && !!Utils.spellcastingAbilityOfClass(view) && (Utils.spellSlots(view).length > 0 || Utils.cantripsKnown(view) > 0);
  const catalog = isCaster ? Utils.spellCatalog(char) : [];
  const owned = new Set((char.spells || []).map(s => s.id));
  const mine = (char.spells || []).filter(s => (s.cls || char.className) === classId && !s.auto);
  const countOf = (lvl0) => mine.filter(s => (catalog.find(x => x.id === s.id)?.level === 0) === lvl0).length;
  const cantripRoom = Math.max(0, Utils.cantripsKnown(view) - countOf(true));
  // Conjuradores preparados (druida, clérigo, paladino, mago…) já têm a lista inteira
  // e escolhem as magias no descanso longo — no nível só aprendem truques novos.
  const spellRoom = Utils.isPreparedCaster(view) ? 0 : Math.max(0, (Utils.knownSpellLimit(view) || 0) - countOf(false));
  const maxLvl = Utils.maxSpellLevel(view);
  const listClass = Utils.spellListClass(view);
  const available = catalog.filter(s => !owned.has(s.id) && (cheat || (s.classes.includes(listClass) && s.level <= maxLvl && (s.level === 0 || spellRoom > 0))));
  const [added, setAdded] = useState([]);
  useEffect(() => { setAdded([]); }, [classId]);
  const addedCantrips = added.filter(id => catalog.find(s => s.id === id)?.level === 0).length;
  const addedSpells = added.length - addedCantrips;
  const canAdd = (sp) => cheat || (sp.level === 0 ? addedCantrips < cantripRoom : addedSpells < spellRoom);
  const toggle = (sp) => setAdded(prev => prev.includes(sp.id) ? prev.filter(x => x !== sp.id) : (canAdd(sp) ? [...prev, sp.id] : prev));
  // Mago: grimório ganha 6 magias de nível 1 no 1º nível de Mago e +2 a cada nível
  // seguinte, de círculo ≤ maior espaço de Mago. Vão para o livro, não preparadas.
  const bookMode = isCaster && classId === SPELLBOOK_CLASS;
  const wizLevel = entry?.level || 1;
  const bookRoom = bookMode ? spellbookGain(wizLevel) : 0;
  const bookAvailable = bookMode
    ? spellbookCandidates(char, { maxLevel: cheat ? 9 : (wizLevel === 1 ? 1 : maxLvl), anyList: cheat }).filter(s => !owned.has(s.id))
    : [];
  const [bookAdded, setBookAdded] = useState([]);
  useEffect(() => { setBookAdded([]); }, [classId]);
  const toggleBook = (sp) => setBookAdded(prev => prev.includes(sp.id) ? prev.filter(x => x !== sp.id) : (cheat || prev.length < bookRoom ? [...prev, sp.id] : prev));

  // Opções de classe (invocações, metamagia…) ganhas ou trocáveis neste nível.
  const [optValue, setOptValue] = useState({ adds: [], swaps: [] });
  useEffect(() => { setOptValue({ adds: [], swaps: [] }); }, [classId]);
  const optPicks = { adds: optValue.adds, swaps: optValue.swaps };
  const hasOptionStep = !choiceOnly && (() => { const o = openPools(after, classId, optValue, { levelUp: true }); return o.open.length + o.swappable.length > 0; })();
  const optionCheck = optPicks.adds.length + optPicks.swaps.length ? validateClassOptions(after, classId, optPicks, { levelUp: true }) : { valid: true, issues: [] };

  const steps = [];
  const showClassStep = !choiceOnly && (allowMulticlass || Utils.isMulticlass(char));
  if (showClassStep) steps.push('class');
  if (skillCount) steps.push('skill');
  if (!choiceOnly) steps.push('hp');
  if (kind) steps.push('choice');
  if (hasOptionStep) steps.push('options');
  if (isCaster && (cheat || cantripRoom + spellRoom + bookRoom > 0)) steps.push('spells');
  if (!choiceOnly) steps.push('review');
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { custom: _custom, ...effectiveChoice } = kind === 'epic' ? { ...choice, type: 'feat' } : choice;
  // Talento do catálogo: pré-requisitos de proficiência/conjuração/espécie (fora do modo trapaça).
  const hasFightingStyle = kind ? progHasFightingStyle(computeProgression({ ...after, levelChoices: {} })) : false;
  const choiceCheck = kind ? validateLevelChoice(after, newLevel, effectiveChoice, { ctx: featCtx(after), cheat }) : { valid: true, issues: [] };
  const stepValid = (steps[step] !== 'choice' || choiceCheck.valid) && (steps[step] !== 'skill' || !!skillAdded)
    && (steps[step] !== 'options' || optionCheck.valid);
  const isLast = step === steps.length - 1;

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      await onConfirm({
        toLevel: newLevel,
        hpGain,
        ...(choiceOnly ? {} : { classId }),
        ...(skillAdded ? { skillAdded } : {}),
        ...(kind ? { choice: effectiveChoice } : {}),
        ...(added.length + bookAdded.length ? { spellsAdded: [...added, ...bookAdded.map(id => ({ id, inBook: true }))] } : {}),
        ...(optPicks.adds.length + optPicks.swaps.length ? { options: optPicks } : {}),
      });
      onClose();
    } catch (e) {
      setError(e?.data?.issues?.join(' · ') || e?.data?.error || e?.message || 'Falha');
    } finally { setBusy(false); }
  };

  const render = () => {
    const s = steps[step];
    if (s === 'class') return <ClassStep char={char} lang={lang} classId={classId} setClassId={setClassId} allowMulticlass={allowMulticlass} cheat={cheat} />;
    if (s === 'skill') return (
      <>
        <h3 style={{ marginBottom: 4 }}>{lang === 'pt' ? `Perícia de ${tName('class', classId, lang)}` : `${tName('class', classId, lang)} skill`}</h3>
        <div className="muted text-sm" style={{ marginBottom: 10 }}>{lang === 'pt' ? 'Escolha 1 perícia da lista da classe.' : 'Pick 1 skill from the class list.'}</div>
        <div className="class-pick-grid">
          {skillOptions.map(k => (
            <button key={k} type="button" className={`class-pick small ${skillAdded === k ? 'on' : ''}`} onClick={() => setSkillAdded(k)}>
              <span className="class-pick-name">{tName('skill', k, lang)}</span>
            </button>
          ))}
        </div>
      </>
    );
    if (s === 'hp') return (
      <>
        <h3 style={{ marginBottom: 4 }}>{lang === 'pt' ? 'Pontos de Vida' : 'Hit Points'}</h3>
        <div className="muted text-sm" style={{ marginBottom: 12 }}>
          {lang === 'pt' ? `Média ou 1d${hitDie} ${Utils.fmtMod(conMod)} (CON)` : `Average or 1d${hitDie} ${Utils.fmtMod(conMod)} (CON)`}
        </div>
        <div className="row gap-2" style={{ marginBottom: 12 }}>
          <button className={`btn ${hpMode === 'avg' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => { setHpMode('avg'); setRolled(null); }}>
            {lang === 'pt' ? 'Média' : 'Average'}: <strong style={{ marginLeft: 6 }}>+{avgHp}</strong>
          </button>
          {/* Rolagem é única: sem "rolar de novo" até gostar do resultado. */}
          <button className={`btn ${hpMode === 'roll' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} disabled={rolled != null && hpMode === 'roll'}
            onClick={() => { setHpMode('roll'); if (rolled == null) rollHp(); }}>
            <Icon name="dice" size={12}/> {lang === 'pt' ? 'Rolar' : 'Roll'} {rolled != null ? `+${Math.max(1, rolled + conMod)}` : ''}
          </button>
        </div>
        <div style={box}>
          <div className="text-xs muted">{lang === 'pt' ? 'PV máximo' : 'Max HP'}</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.4rem' }}>{char.maxHp} → <span style={{ color: 'var(--moss-bright)' }}>{char.maxHp + hpGain}</span></div>
        </div>
      </>
    );
    if (s === 'choice') return (
      <>
        <ChoiceStep char={char} featChar={after} hasFightingStyle={hasFightingStyle} lang={lang} level={newLevel} kind={kind} choice={choice} setChoice={setChoice} />
        {!choiceCheck.valid && <div className="text-xs" style={{ marginTop: 8, color: 'var(--blood-bright)' }}>{choiceCheck.issues.join(' · ')}</div>}
      </>
    );
    if (s === 'options') return (
      <>
        <ClassOptionsPicker char={after} classId={classId} lang={lang} value={optValue} onChange={setOptValue} levelUp />
        {!optionCheck.valid && <div className="text-xs" style={{ marginTop: 8, color: 'var(--blood-bright)' }}>{optionCheck.issues.join(' · ')}</div>}
      </>
    );
    if (s === 'spells') {
      const byLevel = {};
      // Mago: magias de nível 1+ entram pelo grimório (abaixo); aqui só truques.
      available.filter(sp => !bookMode || sp.level === 0).forEach(sp => { (byLevel[sp.level] ||= []).push(sp); });
      const bookByLevel = {};
      bookAvailable.forEach(sp => { (bookByLevel[sp.level] ||= []).push(sp); });
      const pt = lang === 'pt';
      return (
        <>
          <h3 style={{ marginBottom: 4 }}>{lang === 'pt' ? 'Novas magias' : 'New spells'}</h3>
          <div className="muted text-sm" style={{ marginBottom: 8 }}>
            {cheat
              ? (lang === 'pt' ? 'Modo trapaça: qualquer magia, sem limite.' : 'Cheat mode: any spell, no limit.')
              : `${t('cantrips', lang)}: ${addedCantrips}/${cantripRoom} · ${lang === 'pt' ? 'Magias' : 'Spells'}: ${addedSpells}/${spellRoom}`}
          </div>
          {Object.keys(byLevel).sort((a, b) => a - b).map(lvl => (
            <div key={lvl} style={{ marginBottom: 12 }}>
              <Filigree>{+lvl === 0 ? t('cantrips', lang) : `${t('spellLevel', lang)} ${lvl}`}</Filigree>
              {byLevel[lvl].map(sp => {
                const on = added.includes(sp.id);
                const blocked = !on && !canAdd(sp);
                return (
                  <label key={sp.id} className="option" style={{ padding: 10, marginBottom: 6, display: 'flex', gap: 10, alignItems: 'center', opacity: blocked ? 0.45 : 1, borderColor: on ? 'var(--gold)' : 'var(--stroke-faint)' }}>
                    <input type="checkbox" checked={on} disabled={blocked} onChange={() => toggle(sp)} style={{ width: 18, height: 18, minHeight: 0 }}/>
                    <span style={{ fontFamily: 'var(--display)' }}>{tName('spellName', sp.id, lang)}</span>
                  </label>
                );
              })}
            </div>
          ))}
          {bookMode && (
            <>
              <h3 style={{ margin: '12px 0 4px' }}>{pt ? 'Grimório' : 'Spellbook'}</h3>
              <div className="muted text-sm" style={{ marginBottom: 8 }}>
                {wizLevel === 1
                  ? (pt ? 'Seu grimório começa com 6 magias de Mago de nível 1.' : 'Your spellbook starts with 6 level 1 Wizard spells.')
                  : (pt ? `Acrescente 2 magias de Mago de círculo até ${maxLvl}.` : `Add 2 Wizard spells of level ${maxLvl} or lower.`)}
                {' '}<strong style={{ color: bookAdded.length === bookRoom ? 'var(--moss-bright)' : 'var(--gold)' }}>{bookAdded.length}/{cheat ? '∞' : bookRoom}</strong>
                {' · '}{pt ? 'Entram no livro sem preparar; prepare-as na ficha.' : 'They go in the book unprepared; prepare them on the sheet.'}
              </div>
              {Object.keys(bookByLevel).sort((a, b) => a - b).map(lvl => (
                <div key={`b${lvl}`} style={{ marginBottom: 12 }}>
                  <Filigree>{`${t('spellLevel', lang)} ${lvl}`}</Filigree>
                  {bookByLevel[lvl].map(sp => {
                    const on = bookAdded.includes(sp.id);
                    const blocked = !on && !cheat && bookAdded.length >= bookRoom;
                    return (
                      <label key={sp.id} className="option" style={{ padding: 10, marginBottom: 6, display: 'flex', gap: 10, alignItems: 'center', opacity: blocked ? 0.45 : 1, borderColor: on ? 'var(--gold)' : 'var(--stroke-faint)' }}>
                        <input type="checkbox" checked={on} disabled={blocked} onChange={() => toggleBook(sp)} style={{ width: 18, height: 18, minHeight: 0 }}/>
                        <span style={{ fontFamily: 'var(--display)' }}>{tName('spellName', sp.id, lang)}</span>
                        <span className="text-xs muted" style={{ marginLeft: 'auto' }}>{tName('school', sp.school, lang)}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </>
      );
    }
    return (
      <>
        <h3 style={{ marginBottom: 4 }}>{lang === 'pt' ? 'Resumo' : 'Summary'}</h3>
        <div style={box}>{lang === 'pt' ? 'Nível' : 'Level'} {char.level} → <strong style={{ color: 'var(--gold-bright)' }}>{newLevel}</strong>
          {' · '}{tName('class', classId, lang)} {entry?.level}{isNewClass && <span className="muted"> ({lang === 'pt' ? 'nova classe' : 'new class'})</span>}
        </div>
        {skillAdded && <div style={box}>{lang === 'pt' ? 'Perícia' : 'Skill'}: {tName('skill', skillAdded, lang)}</div>}
        <div style={box}>PV {char.maxHp} → <strong style={{ color: 'var(--moss-bright)' }}>{char.maxHp + hpGain}</strong> (+{hpGain})</div>
        {kind && (
          <div style={box}>
            {effectiveChoice.type === 'asi'
              ? SRD.ABILITIES.filter(k => effectiveChoice.asi?.[k]).map(k => `${t(k, lang)} +${effectiveChoice.asi[k]}`).join(', ')
              : `${lang === 'pt' ? 'Talento' : 'Feat'}: ${effectiveChoice.feat}${
                SRD.ABILITIES.filter(k => effectiveChoice.asi?.[k]).map(k => ` (${t(k, lang)} +${effectiveChoice.asi[k]})`).join('')}${
                effectiveChoice.picks && Object.keys(effectiveChoice.picks).length ? ` — ${picksText(effectiveChoice.picks, lang)}` : ''}`}
          </div>
        )}
        {added.length > 0 && <div style={box}>{added.map(id => tName('spellName', id, lang)).join(', ')}</div>}
        {bookAdded.length > 0 && <div style={box}>{lang === 'pt' ? 'Grimório' : 'Spellbook'}: {bookAdded.map(id => tName('spellName', id, lang)).join(', ')}</div>}
        {optPicks.adds.length > 0 && <div style={box}>{optPicks.adds.map(a => pickLabel(classId, a, lang)).join(', ')}</div>}
        {optPicks.swaps.map(sw => (
          <div key={sw.pool} style={box}>{pickLabel(classId, { pool: sw.pool, id: sw.from }, lang)} → {pickLabel(classId, { pool: sw.pool, id: sw.to }, lang)}</div>
        ))}
      </>
    );
  };

  return (
    <Modal onClose={onClose}>
      <div className="row gap-2" style={{ marginBottom: 14 }}>
        {steps.map((s, i) => <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? 'var(--gold)' : 'var(--stroke-faint)' }}/>)}
      </div>
      <div style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: 14 }}>{render()}</div>
      {error && <div className="text-sm" style={{ color: 'var(--blood-bright)', marginBottom: 8 }}>{error}</div>}
      <div className="row gap-2">
        {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>{t('back', lang)}</button>}
        <button className="btn btn-ghost" onClick={onClose}>{t('cancel', lang)}</button>
        {isLast
          ? <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy || !stepValid} onClick={confirm}><Icon name="star-fill" size={14}/> {lang === 'pt' ? 'Confirmar' : 'Confirm'}</button>
          : <button className="btn btn-primary" style={{ flex: 1 }} disabled={!stepValid} onClick={() => setStep(step + 1)}>{lang === 'pt' ? 'Próximo' : 'Next'} →</button>}
      </div>
    </Modal>
  );
}
