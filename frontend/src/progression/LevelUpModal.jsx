/* Subida de nível guiada: PV, ASI/talento e magias, com os limites das regras.
 * Também resolve um ASI pendente de nível antigo (onlyChoiceLevel). */
import { useState } from 'react';
import SRD from '../../data/srd.js';
import Utils from '../../utils.js';
import { t, tName } from '../../data/i18n.js';
import Icon from '../../components/Icons.jsx';
import { Modal, Filigree } from '../../components/Shared.jsx';
import { HIT_DIE, levelChoiceKind, validateLevelChoice } from './engine.js';

const box = { background: 'var(--bg-elev)', borderRadius: 8, padding: 14, marginBottom: 8 };

const ChoiceStep = ({ char, lang, level, kind, choice, setChoice }) => {
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
        <>
          <label>{lang === 'pt' ? 'Nome do talento' : 'Feat name'}</label>
          <input value={choice.feat || ''} maxLength={120} onChange={e => setChoice({ ...choice, type: 'feat', feat: e.target.value })}
            placeholder={kind === 'epic' ? 'Boon of Fate, Boon of Spell Recall…' : 'Alert, War Caster, Resilient…'} />
          <label style={{ marginTop: 8 }}>{lang === 'pt' ? 'O que ele faz (opcional)' : 'What it does (optional)'}</label>
          <textarea value={choice.note || ''} maxLength={500} onChange={e => setChoice({ ...choice, type: 'feat', note: e.target.value })} />
          <div className="text-xs muted" style={{ marginTop: 6 }}>
            {lang === 'pt'
              ? 'Se o talento der +1 em atributo, peça ao mestre para registrar (ou use o modo trapaça numa ficha pessoal).'
              : 'If the feat grants +1 to an ability, ask your DM to record it (or use cheat mode on a personal sheet).'}
          </div>
        </>
      )}
    </>
  );
};

export default function LevelUpModal({ char, lang, onConfirm, onClose, onlyChoiceLevel = null }) {
  const cheat = !!char.cheatMode;
  const choiceOnly = onlyChoiceLevel != null;
  const newLevel = choiceOnly ? onlyChoiceLevel : (char.level || 1) + 1;
  const after = choiceOnly ? char : { ...char, level: newLevel };
  const kind = levelChoiceKind(after, newLevel);
  const [choice, setChoice] = useState(kind === 'epic' ? { type: 'feat', feat: '' } : { type: 'asi', asi: {} });

  // PV: média (arredondada para cima) ou rolagem, + CON; mínimo 1.
  const hitDie = HIT_DIE[char.className] || 8;
  const conMod = Utils.abilityMod(char, 'con');
  const avgHp = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
  const [hpMode, setHpMode] = useState('avg');
  const [rolled, setRolled] = useState(null);
  const hpGain = hpMode === 'roll' && rolled != null ? Math.max(1, rolled + conMod) : avgHp;
  const rollHp = () => {
    setRolled(Math.floor(Math.random() * hitDie) + 1);
    if (window.__diceRoll) window.__diceRoll({ die: hitDie, mod: conMod, label: lang === 'pt' ? 'PV de nível' : 'Level HP' });
  };

  // Magias: só o que o novo nível acrescenta ao limite (sem limite no modo trapaça).
  const isCaster = !choiceOnly && !!Utils.spellcastingAbility(after);
  const catalog = isCaster ? Utils.spellCatalog(char) : [];
  const owned = new Set((char.spells || []).map(s => s.id));
  const isAuto = id => (char.spells || []).some(s => s.id === id && s.auto);
  const countOf = (lvl0) => (char.spells || []).filter(s => !isAuto(s.id) && (catalog.find(x => x.id === s.id)?.level === 0) === lvl0).length;
  const cantripRoom = Math.max(0, Utils.cantripsKnown(after) - countOf(true));
  // Conjuradores preparados (druida, clérigo, paladino, mago…) já têm a lista inteira
  // e escolhem as magias no descanso longo — no nível só aprendem truques novos.
  const spellRoom = Utils.isPreparedCaster(after) ? 0 : Math.max(0, (Utils.knownSpellLimit(after) || 0) - countOf(false));
  const maxLvl = Utils.maxSpellLevel(after);
  const listClass = Utils.spellListClass(after);
  const available = catalog.filter(s => !owned.has(s.id) && (cheat || (s.classes.includes(listClass) && s.level <= maxLvl && (s.level === 0 || spellRoom > 0))));
  const [added, setAdded] = useState([]);
  const addedCantrips = added.filter(id => catalog.find(s => s.id === id)?.level === 0).length;
  const addedSpells = added.length - addedCantrips;
  const canAdd = (sp) => cheat || (sp.level === 0 ? addedCantrips < cantripRoom : addedSpells < spellRoom);
  const toggle = (sp) => setAdded(prev => prev.includes(sp.id) ? prev.filter(x => x !== sp.id) : (canAdd(sp) ? [...prev, sp.id] : prev));

  const steps = [];
  if (!choiceOnly) steps.push('hp');
  if (kind) steps.push('choice');
  if (isCaster && (cheat || cantripRoom + spellRoom > 0)) steps.push('spells');
  if (!choiceOnly) steps.push('review');
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const effectiveChoice = kind === 'epic' ? { ...choice, type: 'feat' } : choice;
  const choiceCheck = kind ? validateLevelChoice(after, newLevel, effectiveChoice) : { valid: true, issues: [] };
  const stepValid = steps[step] !== 'choice' || choiceCheck.valid;
  const isLast = step === steps.length - 1;

  const confirm = async () => {
    setBusy(true); setError('');
    try {
      await onConfirm({
        toLevel: newLevel,
        hpGain,
        ...(kind ? { choice: effectiveChoice } : {}),
        ...(added.length ? { spellsAdded: added } : {}),
      });
      onClose();
    } catch (e) {
      setError(e?.data?.issues?.join(' · ') || e?.data?.error || e?.message || 'Falha');
    } finally { setBusy(false); }
  };

  const render = () => {
    const s = steps[step];
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
        <ChoiceStep char={char} lang={lang} level={newLevel} kind={kind} choice={choice} setChoice={setChoice} />
        {!choiceCheck.valid && <div className="text-xs" style={{ marginTop: 8, color: 'var(--blood-bright)' }}>{choiceCheck.issues.join(' · ')}</div>}
      </>
    );
    if (s === 'spells') {
      const byLevel = {};
      available.forEach(sp => { (byLevel[sp.level] ||= []).push(sp); });
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
        </>
      );
    }
    return (
      <>
        <h3 style={{ marginBottom: 4 }}>{lang === 'pt' ? 'Resumo' : 'Summary'}</h3>
        <div style={box}>{lang === 'pt' ? 'Nível' : 'Level'} {char.level} → <strong style={{ color: 'var(--gold-bright)' }}>{newLevel}</strong></div>
        <div style={box}>PV {char.maxHp} → <strong style={{ color: 'var(--moss-bright)' }}>{char.maxHp + hpGain}</strong> (+{hpGain})</div>
        {kind && (
          <div style={box}>
            {effectiveChoice.type === 'asi'
              ? SRD.ABILITIES.filter(k => effectiveChoice.asi?.[k]).map(k => `${t(k, lang)} +${effectiveChoice.asi[k]}`).join(', ')
              : `${lang === 'pt' ? 'Talento' : 'Feat'}: ${effectiveChoice.feat}`}
          </div>
        )}
        {added.length > 0 && <div style={box}>{added.map(id => tName('spellName', id, lang)).join(', ')}</div>}
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
