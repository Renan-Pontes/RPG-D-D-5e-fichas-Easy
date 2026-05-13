/* Character sheet view — play/stats/spells/inventory/story/journal tabs */
import { useState, useEffect, useRef } from 'react';
import SRD from '../data/srd.js';
import Utils from '../utils.js';
import { t, tName } from '../data/i18n.js';
import Icon from './Icons.jsx';
import { Filigree, Modal, NumStepper, Pips, AvatarUpload } from './Shared.jsx';
import { SheetSpells, SheetInventory, SheetStory, SheetNotes } from './SheetTabs.jsx';

const Sheet = ({ lang, char, onUpdate, onEdit, onPrint, onShare, onExport, onDelete, onBack }) => {
  const [tab, setTab] = useState('play');
  const [hpDelta, setHpDelta] = useState(0);
  const [tempHpInput, setTempHpInput] = useState(false);

  const update = (patch) => onUpdate({ ...char, ...patch });
  const updateRef = useRef(update);
  updateRef.current = update;
  useEffect(() => {
    window.__updateChar = (patch) => updateRef.current(patch);
    return () => { window.__updateChar = null; };
  }, []);

  const ac = Utils.computeAc(char);
  const initBonus = Utils.abilityMod(char, 'dex');
  const speed = Utils.speed(char);
  const profB = Utils.profBonus(char);
  const passPerc = Utils.passivePerception(char);
  const spellAb = Utils.spellcastingAbility(char);
  const spellDc = Utils.spellSaveDc(char);
  const spellAtk = Utils.spellAttackBonus(char);
  const slots = Utils.spellSlots(char);

  const cls = SRD.CLASSES.find(c => c.id === char.className);
  const race = SRD.RACES.find(r => r.id === char.race);
  const bg = SRD.BACKGROUNDS.find(b => b.id === char.background);

  // === HP actions ===
  const applyHp = (delta) => {
    let newCurrent = char.currentHp + delta;
    let newTemp = char.tempHp || 0;
    if (delta < 0) {
      // damage hits temp first
      const dmg = -delta;
      const absorbed = Math.min(newTemp, dmg);
      newTemp -= absorbed;
      newCurrent = char.currentHp - (dmg - absorbed);
    } else {
      newCurrent = Math.min(char.maxHp, char.currentHp + delta);
    }
    newCurrent = Math.max(0, Math.min(newCurrent, char.maxHp));
    update({ currentHp: newCurrent, tempHp: newTemp });
    setHpDelta(0);
  };

  const roll = (config) => {
    if (window.__diceRoll) window.__diceRoll(config);
  };

  return (
    <>
      <SheetHero
        char={char}
        lang={lang}
        onAvatar={(av) => update({ avatar: av })}
        onBack={onBack}
        cls={cls} race={race} bg={bg}
      />

      <div className="action-bar no-print">
        <button className="chip" onClick={onPrint}><Icon name="print" size={14} className="chip-icon"/> {t('print', lang)}</button>
        <button className="chip" onClick={onShare}><Icon name="share" size={14} className="chip-icon"/> {t('share', lang)}</button>
        <button className="chip" onClick={onExport}><Icon name="download" size={14} className="chip-icon"/> {t('export', lang)}</button>
        <button className="chip" onClick={onEdit}><Icon name="edit" size={14} className="chip-icon"/> {t('edit', lang)}</button>
        <button className="chip" onClick={() => update({ inspiration: !char.inspiration })}>
          <Icon name={char.inspiration ? 'star-fill' : 'star'} size={14} style={{ color: char.inspiration ? 'var(--gold-bright)' : 'var(--gold)' }}/>
          {t('inspiration', lang)}
        </button>
      </div>

      <div className="tabs no-print">
        {[
          { id: 'play', label: t('tabPlay', lang) },
          { id: 'stats', label: t('tabStats', lang) },
          { id: 'spells', label: t('tabSpells', lang) },
          { id: 'inv', label: t('tabInv', lang) },
          { id: 'story', label: t('tabStory', lang) },
          { id: 'notes', label: t('tabNotes', lang) },
        ].map(tb => (
          <button key={tb.id} className={`tab ${tab === tb.id ? 'active' : ''}`} onClick={() => setTab(tb.id)}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'play' && (
        <SheetPlay
          char={char} lang={lang} update={update} applyHp={applyHp}
          ac={ac} speed={speed} profB={profB} initBonus={initBonus}
          passPerc={passPerc} slots={slots} roll={roll}
        />
      )}

      {tab === 'stats' && (
        <SheetStats
          char={char} lang={lang} update={update}
          profB={profB} passPerc={passPerc} roll={roll}
        />
      )}

      {tab === 'spells' && (
        <SheetSpells
          char={char} lang={lang} update={update}
          spellAb={spellAb} spellDc={spellDc} spellAtk={spellAtk} slots={slots} roll={roll}
        />
      )}

      {tab === 'inv' && (
        <SheetInventory char={char} lang={lang} update={update} roll={roll} cls={cls} bg={bg} />
      )}

      {tab === 'story' && <SheetStory char={char} lang={lang} update={update} cls={cls} race={race} />}
      {tab === 'notes' && <SheetNotes char={char} lang={lang} update={update} />}

      <div style={{ marginTop: 'var(--s-7)', textAlign: 'center' }} className="no-print">
        <button className="btn btn-ghost btn-danger btn-sm" onClick={onDelete}>
          <Icon name="trash" size={14}/> {t('delete', lang)}
        </button>
      </div>
    </>
  );
};

// ===== Sub-components =====

const SheetHero = ({ char, lang, onAvatar, onBack, cls, race, bg }) => (
  <>
    <button className="btn btn-ghost btn-sm no-print" onClick={onBack} style={{ marginBottom: 12 }}>
      <Icon name="arrow-back" size={14}/> {t('yourHeroes', lang)}
    </button>
    <div className="sheet-hero">
      <AvatarUpload value={char.avatar} onChange={onAvatar} letter={(char.name || '?').charAt(0).toUpperCase()} />
      <div className="hero-info">
        <div className="hero-name">{char.name || (lang === 'pt' ? 'Sem nome' : 'Unnamed')}</div>
        <div className="hero-sub">
          {race ? tName('race', race.id, lang) : '—'}
          {cls ? ` · ${tName('class', cls.id, lang)} ${char.level}` : ''}
          {bg ? ` · ${tName('background', bg.id, lang)}` : ''}
        </div>
        <div className="hero-tags">
          {char.alignment && <span className="tag">{tName('alignment', char.alignment, lang)}</span>}
          {char.player && <span className="tag">{char.player}</span>}
          {(char.levelingMode || 'xp') === 'xp' && char.xp > 0 && <span className="tag">{char.xp} XP</span>}
          {(char.levelingMode || 'xp') === 'milestone' && <span className="tag">{lang === 'pt' ? 'Marcos' : 'Milestones'}</span>}
        </div>
      </div>
      <LevelUpButton char={char} lang={lang} />
    </div>
  </>
);

const LevelUpButton = ({ char, lang }) => {
  const [open, setOpen] = useState(false);
  const cls = SRD.CLASSES.find(c => c.id === char.className);
  const mode = char.levelingMode || 'xp';
  const XP_THRESHOLDS = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];
  const canLevelXp = mode === 'xp' && char.level < 20 && (char.xp || 0) >= (XP_THRESHOLDS[char.level] || Infinity);
  const canLevel = char.level < 20 && (mode === 'milestone' || canLevelXp);

  return (
    <>
      <button
        className="btn btn-sm no-print"
        onClick={() => setOpen(true)}
        disabled={char.level >= 20}
        style={{
          alignSelf: 'flex-start',
          background: canLevel ? 'var(--gold)' : 'transparent',
          color: canLevel ? 'var(--bg-deep)' : 'var(--ink-muted)',
          borderColor: canLevel ? 'var(--gold-bright)' : 'var(--stroke-faint)',
          fontFamily: 'var(--display)',
          letterSpacing: '0.08em',
        }}
        title={canLevel ? (lang === 'pt' ? 'Pronto para subir de nível!' : 'Ready to level up!') : ''}
      >
        <Icon name="star" size={12}/> {t('level', lang)} {char.level}
        {canLevel && <span style={{ marginLeft: 6 }}>↑</span>}
      </button>
      {open && (
        <LevelUpModal char={char} cls={cls} lang={lang} canLevel={canLevel} onClose={() => setOpen(false)} />
      )}
    </>
  );
};

// ASI levels: most classes 4,8,12,16,19 — Fighter +6,14, Rogue +10
const ASI_LEVELS_BY_CLASS = {
  fighter: [4, 6, 8, 12, 14, 16, 19],
  rogue:   [4, 8, 10, 12, 16, 19],
  _default: [4, 8, 12, 16, 19],
};

const LevelUpModal = ({ char, cls, lang, canLevel, onClose }) => {
  const newLevel = char.level + 1;
  const asiLevels = ASI_LEVELS_BY_CLASS[char.className] || ASI_LEVELS_BY_CLASS._default;
  const isASILevel = asiLevels.includes(newLevel);

  // HP step state
  const hitDie = cls?.hitDie || 8;
  const conMod = Utils.abilityMod(char, 'con');
  const avgHp = Math.ceil((hitDie + 1) / 2) + conMod; // (hitDie/2 + 1) round up + Con
  const [hpMode, setHpMode] = useState('avg'); // 'avg' | 'roll'
  const [rolledHp, setRolledHp] = useState(null);
  const hpGain = Math.max(1, hpMode === 'roll' && rolledHp != null ? rolledHp + conMod : avgHp);

  // ASI state
  const [asiDelta, setAsiDelta] = useState({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
  const asiTotal = Object.values(asiDelta).reduce((s, v) => s + v, 0);
  const asiOk = !isASILevel || asiTotal === 2;
  const canBump = (k) => {
    const current = Utils.abilityWithRace(char, k) + (asiDelta[k] || 0);
    return current < 20;
  };

  // Spells step state
  const isCaster = cls?.spellcaster;
  const currentSpellIds = (char.spells || []).map(s => s.id);
  const available = isCaster
    ? SRD.SPELLS.filter(s => s.classes.includes(char.className) && !currentSpellIds.includes(s.id))
    : [];
  const oldSlots = Utils.spellSlots({ ...char, level: char.level });
  const newSlots = Utils.spellSlots({ ...char, level: newLevel });
  const maxNewSlotLevel = newSlots.length;
  const oldMaxSlot = oldSlots.length;
  const newSpellSlotUnlocked = maxNewSlotLevel > oldMaxSlot;
  const [addedSpells, setAddedSpells] = useState([]); // ids
  const toggleSpell = (id) => {
    setAddedSpells(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Steps
  const steps = ['hp'];
  if (isASILevel) steps.push('asi');
  if (isCaster) steps.push('spells');
  steps.push('review');
  const [step, setStep] = useState(0);

  const rollHp = () => {
    setRolledHp(Math.floor(Math.random() * hitDie) + 1);
    if (window.__diceRoll) window.__diceRoll({ die: hitDie, mod: conMod, label: lang === 'pt' ? 'HP de Nível' : 'Level HP' });
  };

  const finalize = () => {
    const patch = { level: newLevel };
    // HP
    const newMax = char.maxHp + hpGain;
    patch.maxHp = newMax;
    patch.currentHp = Math.min(char.currentHp + hpGain, newMax);
    // ASI
    if (isASILevel) {
      patch.abilities = { ...char.abilities };
      SRD.ABILITIES.forEach(k => {
        patch.abilities[k] = (patch.abilities[k] || 8) + (asiDelta[k] || 0);
      });
    }
    // Spells
    if (addedSpells.length > 0) {
      patch.spells = [...(char.spells || []), ...addedSpells.map(id => ({ id, prepared: true }))];
    }
    window.__updateChar && window.__updateChar(patch);
    onClose();
  };

  const renderStep = () => {
    const s = steps[step];
    if (s === 'hp') return (
      <>
        <h3 style={{ marginBottom: 4 }}>{lang === 'pt' ? 'Pontos de Vida' : 'Hit Points'}</h3>
        <div className="muted" style={{ fontSize: '0.85rem', marginBottom: 12 }}>
          {lang === 'pt' ? `Ganhe HP usando média ou rolando 1d${hitDie} + Con (${conMod >= 0 ? '+' : ''}${conMod})` : `Gain HP using average or rolling 1d${hitDie} + Con (${conMod >= 0 ? '+' : ''}${conMod})`}
        </div>
        <div className="row gap-2" style={{ marginBottom: 12 }}>
          <button className={`btn ${hpMode === 'avg' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => { setHpMode('avg'); setRolledHp(null); }}>
            {lang === 'pt' ? 'Média' : 'Average'}: <strong style={{ marginLeft: 6 }}>+{avgHp}</strong>
          </button>
          <button className={`btn ${hpMode === 'roll' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => { setHpMode('roll'); if (rolledHp == null) rollHp(); }}>
            <Icon name="dice" size={12}/> {lang === 'pt' ? 'Rolar' : 'Roll'} {rolledHp != null && hpMode === 'roll' ? `+${Math.max(1, rolledHp + conMod)}` : ''}
          </button>
        </div>
        {hpMode === 'roll' && rolledHp != null && (
          <button className="btn btn-sm btn-ghost" onClick={rollHp} style={{ width: '100%', marginBottom: 12 }}>
            <Icon name="dice" size={12}/> {lang === 'pt' ? 'Rolar de novo' : 'Reroll'} ({rolledHp})
          </button>
        )}
        <div className="card" style={{ padding: 12, background: 'var(--bg-elev)' }}>
          <div className="text-xs muted">{lang === 'pt' ? 'HP Máximo' : 'Max HP'}</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', color: 'var(--ink-primary)' }}>
            {char.maxHp} → <span style={{ color: 'var(--moss-bright)' }}>{char.maxHp + hpGain}</span>
          </div>
        </div>
      </>
    );

    if (s === 'asi') return (
      <>
        <h3 style={{ marginBottom: 4 }}>{lang === 'pt' ? 'Aumento de Atributo' : 'Ability Score Improvement'}</h3>
        <div className="muted" style={{ fontSize: '0.85rem', marginBottom: 12 }}>
          {lang === 'pt' ? 'Distribua 2 pontos: +2 num atributo ou +1 em dois. (Atributos ficam até 20)' : 'Distribute 2 points: +2 to one or +1 to two. (Cap at 20)'}
        </div>
        <div style={{ marginBottom: 12, padding: 10, background: 'var(--bg-elev)', borderRadius: 8, textAlign: 'center', fontFamily: 'var(--display)', color: asiTotal > 2 ? 'var(--blood-bright)' : 'var(--gold)' }}>
          {asiTotal} / 2 {lang === 'pt' ? 'pontos' : 'points'}
        </div>
        {SRD.ABILITIES.map(k => {
          const base = Utils.abilityWithRace(char, k);
          const delta = asiDelta[k] || 0;
          const newVal = base + delta;
          return (
            <div key={k} className="row gap-3" style={{ padding: '8px 0', borderBottom: '1px solid var(--stroke-faint)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--display)', color: 'var(--ink-primary)' }}>{t(k, lang)}</div>
                <div className="text-xs muted">{base} → <strong style={{ color: delta > 0 ? 'var(--moss-bright)' : delta < 0 ? 'var(--blood-bright)' : 'var(--ink-secondary)' }}>{newVal}</strong></div>
              </div>
              <div className="dice-stepper" style={{ width: 120 }}>
                <button onClick={() => setAsiDelta(d => ({ ...d, [k]: Math.max(-base + 1, (d[k] || 0) - 1) }))}>−</button>
                <span className="dice-stepper-val">{delta >= 0 ? `+${delta}` : delta}</span>
                <button
                  onClick={() => setAsiDelta(d => ({ ...d, [k]: (d[k] || 0) + 1 }))}
                  disabled={!canBump(k) || asiTotal >= 2}
                  style={{ opacity: (!canBump(k) || asiTotal >= 2) ? 0.4 : 1 }}
                >+</button>
              </div>
            </div>
          );
        })}
      </>
    );

    if (s === 'spells') {
      // Group by level
      const byLevel = {};
      available.forEach(sp => {
        if (sp.level > maxNewSlotLevel) return;
        if (!byLevel[sp.level]) byLevel[sp.level] = [];
        byLevel[sp.level].push(sp);
      });
      return (
        <>
          <h3 style={{ marginBottom: 4 }}>{lang === 'pt' ? 'Novas Magias' : 'New Spells'}</h3>
          <div className="muted" style={{ fontSize: '0.85rem', marginBottom: 12 }}>
            {newSpellSlotUnlocked
              ? (lang === 'pt' ? `Você desbloqueou slots de magia de nível ${maxNewSlotLevel}!` : `You unlocked level ${maxNewSlotLevel} spell slots!`)
              : (lang === 'pt' ? 'Você pode aprender magias adicionais.' : 'You may learn additional spells.')}
          </div>
          <div className="text-xs muted" style={{ marginBottom: 8 }}>
            {lang === 'pt' ? 'Selecionadas' : 'Selected'}: {addedSpells.length}
          </div>
          {Object.keys(byLevel).sort((a, b) => +a - +b).map(lvl => (
            <div key={lvl} style={{ marginBottom: 12 }}>
              <Filigree>{+lvl === 0 ? t('cantrips', lang) : `${t('spellLevel', lang)} ${lvl}`}</Filigree>
              {byLevel[lvl].map(sp => {
                const checked = addedSpells.includes(sp.id);
                return (
                  <label key={sp.id} className="option" style={{ padding: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderColor: checked ? 'var(--gold)' : 'var(--stroke-faint)' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleSpell(sp.id)} style={{ width: 18, height: 18, minHeight: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--display)', color: 'var(--ink-primary)' }}>{tName('spellName', sp.id, lang)}</div>
                      <div className="text-xs muted">{sp.school}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          ))}
          {available.length === 0 && (
            <div className="muted text-center" style={{ padding: 20 }}>
              {lang === 'pt' ? 'Nenhuma nova magia disponível.' : 'No new spells available.'}
            </div>
          )}
        </>
      );
    }

    if (s === 'review') return (
      <>
        <h3 style={{ marginBottom: 4 }}>{lang === 'pt' ? 'Resumo' : 'Summary'}</h3>
        <div className="muted" style={{ fontSize: '0.85rem', marginBottom: 12 }}>
          {lang === 'pt' ? `Subindo de Nível ${char.level} para ${newLevel}` : `Leveling from ${char.level} to ${newLevel}`}
        </div>
        <div style={{ background: 'var(--bg-elev)', borderRadius: 8, padding: 14, marginBottom: 8 }}>
          <div className="text-xs muted" style={{ letterSpacing: '0.1em' }}>{lang === 'pt' ? 'NÍVEL' : 'LEVEL'}</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.3rem' }}>
            {char.level} → <span style={{ color: 'var(--gold-bright)' }}>{newLevel}</span>
          </div>
        </div>
        <div style={{ background: 'var(--bg-elev)', borderRadius: 8, padding: 14, marginBottom: 8 }}>
          <div className="text-xs muted" style={{ letterSpacing: '0.1em' }}>HP</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: '1.3rem' }}>
            {char.maxHp} → <span style={{ color: 'var(--moss-bright)' }}>{char.maxHp + hpGain}</span> <span className="text-xs muted">(+{hpGain})</span>
          </div>
        </div>
        {isASILevel && asiTotal > 0 && (
          <div style={{ background: 'var(--bg-elev)', borderRadius: 8, padding: 14, marginBottom: 8 }}>
            <div className="text-xs muted" style={{ letterSpacing: '0.1em' }}>{lang === 'pt' ? 'ATRIBUTOS' : 'ABILITIES'}</div>
            {SRD.ABILITIES.filter(k => asiDelta[k]).map(k => (
              <div key={k} style={{ fontFamily: 'var(--display)', fontSize: '0.95rem' }}>
                {t(k, lang)}: {Utils.abilityWithRace(char, k)} → <span style={{ color: asiDelta[k] > 0 ? 'var(--moss-bright)' : 'var(--blood-bright)' }}>{Utils.abilityWithRace(char, k) + asiDelta[k]}</span>
              </div>
            ))}
          </div>
        )}
        {addedSpells.length > 0 && (
          <div style={{ background: 'var(--bg-elev)', borderRadius: 8, padding: 14, marginBottom: 8 }}>
            <div className="text-xs muted" style={{ letterSpacing: '0.1em' }}>{lang === 'pt' ? 'NOVAS MAGIAS' : 'NEW SPELLS'}</div>
            {addedSpells.map(id => (
              <div key={id} style={{ fontFamily: 'var(--display)', fontSize: '0.95rem' }}>· {tName('spellName', id, lang)}</div>
            ))}
          </div>
        )}
        <div className="text-xs muted" style={{ marginTop: 8 }}>
          {lang === 'pt' ? 'Bônus de proficiência:' : 'Proficiency bonus:'} <strong>+{SRD.profBonus(char.level)} → +{SRD.profBonus(newLevel)}</strong>
        </div>
      </>
    );

    return null;
  };

  const stepValid = (() => {
    const s = steps[step];
    if (s === 'asi') return asiOk;
    return true;
  })();
  const isLast = step === steps.length - 1;

  return (
    <Modal onClose={onClose}>
      {!canLevel && (
        <div style={{ background: 'var(--blood-deep)', color: 'var(--ink-primary)', padding: 10, borderRadius: 6, marginBottom: 12, fontSize: '0.85rem' }}>
          {lang === 'pt' ? 'XP insuficiente para subir de nível.' : 'Not enough XP to level up.'}
        </div>
      )}
      {/* Step pill */}
      <div className="row gap-2" style={{ marginBottom: 14 }}>
        {steps.map((s, i) => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= step ? 'var(--gold)' : 'var(--stroke-faint)',
            transition: 'background 0.2s'
          }}/>
        ))}
      </div>
      <div style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: 14 }}>
        {renderStep()}
      </div>
      <div className="row gap-2">
        {step > 0 && (
          <button className="btn btn-ghost" onClick={() => setStep(step - 1)}>
            <Icon name="arrow-back" size={12}/> {t('back', lang)}
          </button>
        )}
        <button className="btn btn-ghost" onClick={onClose} style={{ flex: step === 0 ? 1 : 0 }}>
          {t('cancel', lang)}
        </button>
        {!isLast ? (
          <button className="btn btn-primary" onClick={() => setStep(step + 1)} disabled={!stepValid} style={{ flex: 1 }}>
            {lang === 'pt' ? 'Próximo' : 'Next'} →
          </button>
        ) : (
          <button className="btn btn-primary" onClick={finalize} disabled={!canLevel} style={{ flex: 1 }}>
            <Icon name="star-fill" size={14}/> {lang === 'pt' ? 'Confirmar' : 'Confirm'}
          </button>
        )}
      </div>
    </Modal>
  );
};

// ===== Play tab =====
const SheetPlay = ({ char, lang, update, applyHp, ac, speed, profB, initBonus, passPerc, slots, roll }) => {
  const [delta, setDelta] = useState('');
  const apply = (sign) => {
    const n = +delta || 0;
    if (!n) return;
    applyHp(n * sign);
    setDelta('');
  };

  const hpPct = Math.max(0, Math.min(100, (char.currentHp / Math.max(1, char.maxHp)) * 100));

  return (
    <>
      <div className="hp-tracker" style={{ marginBottom: 16 }}>
        <div className="eyebrow text-center">{t('hp', lang)}</div>
        <div className="hp-display">
          <span className="hp-current">{char.currentHp}</span>
          <span className="hp-sep">/</span>
          <span className="hp-max">{char.maxHp}</span>
          {char.tempHp > 0 && <span style={{ marginLeft: 12, color: 'var(--moss-bright)', fontFamily: 'var(--display)', fontSize: '1.2rem' }}>+{char.tempHp}</span>}
        </div>
        <div className="hp-bar"><div className="hp-bar-fill" style={{ width: `${hpPct}%` }} /></div>
        <div className="hp-actions">
          <button className="btn btn-sm btn-danger" onClick={() => apply(-1)} disabled={!delta}>
            <Icon name="sword" size={14}/> {t('damage', lang)}
          </button>
          <input
            className="hp-input"
            type="number"
            min="0"
            value={delta}
            onChange={e => setDelta(e.target.value)}
            placeholder="0"
            style={{ width: 80 }}
          />
          <button className="btn btn-sm" onClick={() => apply(1)} disabled={!delta} style={{ background: 'var(--moss)', color: 'var(--ink-primary)', borderColor: 'var(--moss-bright)' }}>
            <Icon name="heart" size={14}/> {t('heal', lang)}
          </button>
        </div>
        <div className="hp-temp">
          {t('tempHp', lang)}:
          {' '}
          <input
            type="number" min="0"
            value={char.tempHp || 0}
            onChange={e => update({ tempHp: Math.max(0, +e.target.value || 0) })}
            style={{ width: 60, display: 'inline-block', padding: '4px 8px', minHeight: 28, fontSize: '0.85rem', textAlign: 'center' }}
          />
        </div>

        {/* Death saves */}
        {char.currentHp === 0 && (
          <div style={{ marginTop: 14, padding: 12, background: 'var(--blood-deep)', borderRadius: 4, border: '1px solid var(--blood-bright)' }}>
            <div className="eyebrow text-center" style={{ color: 'var(--blood-bright)' }}>{t('deathSaves', lang)}</div>
            <div className="row gap-3" style={{ marginTop: 8, justifyContent: 'center', alignItems: 'center' }}>
              <span className="text-xs" style={{ color: 'var(--moss-bright)' }}>{t('successes', lang)}:</span>
              <div className="death-pips">
                {[0,1,2].map(i => (
                  <button key={i} type="button" className={`death-pip ${i < char.deathSaves.success ? 'success' : ''}`}
                    onClick={() => update({ deathSaves: { ...char.deathSaves, success: i < char.deathSaves.success ? i : i + 1 } })}/>
                ))}
              </div>
              <span style={{ width: 16 }}/>
              <span className="text-xs" style={{ color: 'var(--blood-bright)' }}>{t('failures', lang)}:</span>
              <div className="death-pips">
                {[0,1,2].map(i => (
                  <button key={i} type="button" className={`death-pip ${i < char.deathSaves.fail ? 'fail' : ''}`}
                    onClick={() => update({ deathSaves: { ...char.deathSaves, fail: i < char.deathSaves.fail ? i : i + 1 } })}/>
                ))}
              </div>
            </div>
            <button className="btn btn-sm btn-ghost" style={{ width: '100%', marginTop: 8 }}
              onClick={() => roll({ die: 20, label: t('death', lang) })}>
              <Icon name="dice" size={12}/> {lang === 'pt' ? 'Rolar teste contra morte' : 'Roll death save'}
            </button>
          </div>
        )}
      </div>

      {/* Combat trio */}
      <div className="combat-grid" style={{ marginBottom: 16 }}>
        <div className="combat-box">
          <div className="eyebrow">{t('ac', lang)}</div>
          <div className="combat-box-value">{ac}</div>
          <div className="combat-box-sub"><Icon name="shield" size={11}/></div>
        </div>
        <div className="combat-box" onClick={() => roll({ die: 20, mod: initBonus, label: t('initRoll', lang) })} style={{ cursor: 'pointer' }}>
          <div className="eyebrow">{t('initiative', lang)}</div>
          <div className="combat-box-value">{Utils.fmtMod(initBonus)}</div>
          <div className="combat-box-sub">{lang === 'pt' ? 'toque p/ rolar' : 'tap to roll'}</div>
        </div>
        <div className="combat-box">
          <div className="eyebrow">{t('speed', lang)}</div>
          <div className="combat-box-value">{speed}</div>
          <div className="combat-box-sub">ft</div>
        </div>
      </div>

      <div className="combat-grid" style={{ marginBottom: 16 }}>
        <div className="combat-box">
          <div className="eyebrow">{lang === 'pt' ? 'Prof.' : 'Prof.'}</div>
          <div className="combat-box-value">{Utils.fmtMod(profB)}</div>
        </div>
        <div className="combat-box">
          <div className="eyebrow">{lang === 'pt' ? 'Perc.' : 'Perc.'}</div>
          <div className="combat-box-value">{passPerc}</div>
          <div className="combat-box-sub">{lang === 'pt' ? 'passiva' : 'passive'}</div>
        </div>
        <div className="combat-box">
          <div className="eyebrow">{t('hitDice', lang)}</div>
          <div className="combat-box-value">{Math.max(0, char.level - (char.hitDiceUsed || 0))}</div>
          <div className="combat-box-sub">/{char.level} d{(SRD.CLASSES.find(c => c.id === char.className) || {}).hitDie || ''}</div>
        </div>
      </div>

      {/* Abilities at a glance */}
      <div className="abil-grid" style={{ marginBottom: 16 }}>
        {SRD.ABILITIES.map(k => {
          const score = Utils.abilityWithRace(char, k);
          const mod = Utils.abilityMod(char, k);
          return (
            <div key={k} className="abil-box" onClick={() => roll({ die: 20, mod, label: t(k, lang) + ' ' + t('abilityCheck', lang) })} style={{ cursor: 'pointer' }}>
              <div className="abil-box-name">{t(k + 'Sh', lang)}</div>
              <div className="abil-box-mod">{Utils.fmtMod(mod)}</div>
              <div className="abil-box-score">{score}</div>
            </div>
          );
        })}
      </div>

      {/* Quick rest buttons */}
      <div className="row gap-2" style={{ marginBottom: 16 }}>
        <button className="btn btn-sm btn-ghost" style={{ flex: 1 }} onClick={() => {
          // short rest — restore nothing automatic except warlock slots
          if (char.className === 'warlock') update({ spellSlotsUsed: [] });
        }}>
          <Icon name="flame" size={14}/> {t('shortRest', lang)} {t('rest', lang)}
        </button>
        <button className="btn btn-sm btn-primary" style={{ flex: 1 }} onClick={() => {
          update({
            currentHp: char.maxHp,
            tempHp: 0,
            spellSlotsUsed: [],
            hitDiceUsed: Math.max(0, (char.hitDiceUsed || 0) - Math.max(1, Math.floor(char.level / 2))),
            deathSaves: { success: 0, fail: 0 },
          });
        }}>
          <Icon name="heart" size={14}/> {t('longRest', lang)} {t('rest', lang)}
        </button>
      </div>

      {/* Spell slots quick tracker */}
      {slots && slots.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 8 }}>{t('slots', lang)}</div>
          {slots.map((max, idx) => {
            const lvl = idx + 1;
            if (!max) return null;
            const used = (char.spellSlotsUsed && char.spellSlotsUsed[idx]) || 0;
            return (
              <div key={lvl} className="slot-row">
                <div className="slot-level">{lang === 'pt' ? 'Nv' : 'Lv'} {lvl}</div>
                <div className="slot-pips">
                  {Array.from({ length: max }).map((_, i) => (
                    <button
                      key={i} type="button"
                      className={`slot-pip ${i < used ? 'used' : ''}`}
                      onClick={() => {
                        const arr = [...(char.spellSlotsUsed || [])];
                        while (arr.length <= idx) arr.push(0);
                        arr[idx] = i < used ? i : i + 1;
                        update({ spellSlotsUsed: arr });
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs muted mono">{max - used}/{max}</span>
              </div>
            );
          })}
        </>
      )}

      {/* Quick weapons (attacks) */}
      {char.weapons && char.weapons.length > 0 && (
        <>
          <div className="eyebrow mt-4 mb-2">{lang === 'pt' ? 'Ataques' : 'Attacks'}</div>
          {char.weapons.map((w, i) => {
            const wDef = w.id ? SRD.WEAPONS.find(x => x.id === w.id) : null;
            const isFinesse = wDef && wDef.props.includes('finesse');
            const isRanged = wDef && (wDef.type || '').includes('ranged');
            const useDex = isRanged || (isFinesse && Utils.abilityMod(char, 'dex') > Utils.abilityMod(char, 'str'));
            const abMod = Utils.abilityMod(char, useDex ? 'dex' : 'str');
            const isProf = !wDef || !cls
              ? true
              : (cls.weapons.includes('Simple') && (wDef.type || '').startsWith('simple'))
                || (cls.weapons.includes('Martial'))
                || cls.weapons.some(wt => wDef.id.toLowerCase().includes(wt.toLowerCase().replace(/s$/, '')));
            const atk = abMod + (isProf ? Utils.profBonus(char) : 0);
            return (
              <div key={i} className="slot-row" style={{ gridTemplateColumns: '1fr auto auto auto' }}>
                <div>
                  <div style={{ fontFamily: 'var(--display)', color: 'var(--ink-primary)' }}>{w.name}</div>
                  <div className="text-xs muted">{w.damage} {w.dmgType ? `${w.dmgType}` : ''}</div>
                </div>
                <button className="btn btn-sm" onClick={() => roll({ die: 20, mod: atk, label: w.name + ' ' + t('attackRoll', lang) })}>
                  {Utils.fmtMod(atk)}
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => {
                  const m = w.damage.match(/(\d+)d(\d+)/);
                  if (m) roll({ die: +m[2], count: +m[1], mod: abMod, label: w.name + ' ' + t('damageRoll', lang) });
                }}>
                  <Icon name="dice" size={12}/>
                </button>
              </div>
            );
          })}
        </>
      )}
    </>
  );
};

// ===== Stats tab (abilities, saves, skills full) =====
const SheetStats = ({ char, lang, update, profB, passPerc, roll }) => {
  return (
    <>
      <div className="eyebrow mb-2">{t('abilitiesTitle', lang).split(' ')[0] || lang === 'pt' ? 'Atributos' : 'Abilities'}</div>
      <div className="abil-grid mb-4">
        {SRD.ABILITIES.map(k => {
          const score = Utils.abilityWithRace(char, k);
          const mod = Utils.abilityMod(char, k);
          return (
            <div key={k} className="abil-box" onClick={() => roll({ die: 20, mod, label: t(k, lang) })} style={{ cursor: 'pointer' }}>
              <div className="abil-box-name">{t(k + 'Sh', lang)}</div>
              <div className="abil-box-mod">{Utils.fmtMod(mod)}</div>
              <div className="abil-box-score">{score}</div>
            </div>
          );
        })}
      </div>

      <Filigree>{lang === 'pt' ? 'Testes de Resistência' : 'Saving Throws'}</Filigree>
      <div className="skill-display mb-4">
        {SRD.ABILITIES.map(k => {
          const bonus = Utils.saveBonus(char, k);
          const isProf = (char.saveProfs || []).includes(k);
          return (
            <div key={k} className="skill-display-row" onClick={() => roll({ die: 20, mod: bonus, label: t(k, lang) + ' ' + t('saveRoll', lang) })}>
              <button
                type="button"
                className={`skill-prof-dot ${isProf ? 'prof' : ''}`}
                onClick={(e) => { e.stopPropagation(); update({ saveProfs: isProf ? char.saveProfs.filter(x => x !== k) : [...char.saveProfs, k] }); }}
                style={{ cursor: 'pointer', background: 'none' }}
              />
              <span className="skill-display-name">{t(k, lang)}</span>
              <span className="skill-display-stat">{t(k + 'Sh', lang)}</span>
              <span className="skill-display-mod">{Utils.fmtMod(bonus)}</span>
            </div>
          );
        })}
      </div>

      <Filigree>{t('skills', lang)} · {t('passivePerception', lang)} {passPerc}</Filigree>
      <div className="skill-display">
        {SRD.SKILLS.map(s => {
          const bonus = Utils.skillBonus(char, s.id);
          const isProf = (char.skillProfs || []).includes(s.id);
          const isExpert = (char.skillExpertise || []).includes(s.id);
          return (
            <div key={s.id} className="skill-display-row" onClick={() => roll({ die: 20, mod: bonus, label: tName('skill', s.id, lang) })}>
              <button
                type="button"
                className={`skill-prof-dot ${isExpert ? 'expert' : isProf ? 'prof' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isExpert) {
                    update({ skillExpertise: char.skillExpertise.filter(x => x !== s.id), skillProfs: char.skillProfs.filter(x => x !== s.id) });
                  } else if (isProf) {
                    update({ skillExpertise: [...(char.skillExpertise || []), s.id] });
                  } else {
                    update({ skillProfs: [...char.skillProfs, s.id] });
                  }
                }}
                style={{ cursor: 'pointer', background: 'none' }}
              />
              <span className="skill-display-name">{tName('skill', s.id, lang)}</span>
              <span className="skill-display-stat">{t(s.stat + 'Sh', lang)}</span>
              <span className="skill-display-mod">{Utils.fmtMod(bonus)}</span>
            </div>
          );
        })}
      </div>

      <Filigree>{lang === 'pt' ? 'Idiomas e Outras Proficiências' : 'Languages & Other Proficiencies'}</Filigree>
      <div style={{ marginBottom: 12 }}>
        <label>{t('languages', lang)}</label>
        <input
          value={(char.languages || []).join(', ')}
          onChange={e => update({ languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
        />
      </div>
      <div>
        <label>{lang === 'pt' ? 'Outras proficiências' : 'Other proficiencies'}</label>
        <textarea
          value={char.otherProfs || ''}
          onChange={e => update({ otherProfs: e.target.value })}
          placeholder={lang === 'pt' ? 'Ferramentas, armas adicionais...' : 'Tools, extra weapons...'}
        />
      </div>
    </>
  );
};

export default Sheet;
