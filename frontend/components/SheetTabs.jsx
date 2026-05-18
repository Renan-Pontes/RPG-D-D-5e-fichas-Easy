/* Spells / Inventory / Story / Notes tabs */
import { useState } from 'react';
import SRD from '../data/srd.js';
import Utils from '../utils.js';
import { t, tName } from '../data/i18n.js';
import Icon from './Icons.jsx';
import { Filigree, NumStepper, Pips } from './Shared.jsx';
import { api } from '../src/api/client.js';

const SheetSpells = ({ char, lang, update, spellAb, spellDc, spellAtk, slots, roll }) => {
  const cls = SRD.CLASSES.find(c => c.id === char.className);
  if (!cls || !cls.spellcaster) {
    return (
      <div className="card text-center" style={{ padding: 'var(--s-7)' }}>
        <Icon name="sparkle" size={36} style={{ color: 'var(--gold-deep)', marginBottom: 12 }}/>
        <p className="muted">{t('notSpellcaster', lang)}</p>
      </div>
    );
  }

  const isDruid = char.className === 'druid';
  const wildShapeMaxCR = isDruid ? (char.level >= 8 ? 1 : (char.level >= 4 ? 0.5 : 0.25)) : 0;
  const wildShapeRules = isDruid && char.level >= 4 && char.level < 8
    ? (lang === 'pt' ? 'Sem velocidade de voo.' : 'No fly speed.')
    : (isDruid && char.level < 4 ? (lang === 'pt' ? 'Sem velocidade de voo ou natação.' : 'No fly or swim speed.') : '');

  const isPrepared = Utils.isPreparedCaster(char);
  const maxLvl = Utils.maxSpellLevel(char);
  const cantripLimit = Utils.cantripsKnown(char);
  const preparedLimit = isPrepared ? Utils.preparedSpellsLimit(char) : null;

  const spellEntries = char.spells || [];
  const cantripIds = spellEntries.filter(s => {
    const def = SRD.SPELLS.find(x => x.id === s.id);
    return def && def.level === 0;
  }).map(s => s.id);
  const preparedIds = spellEntries.filter(s => {
    const def = SRD.SPELLS.find(x => x.id === s.id);
    return def && def.level > 0;
  }).map(s => s.id);

  const classSpells = SRD.SPELLS.filter(sp => sp.classes.includes(char.className) && sp.level <= maxLvl);
  const classCantrips = SRD.SPELLS.filter(sp => sp.classes.includes(char.className) && sp.level === 0);

  const toggleCantrip = (id) => {
    const has = cantripIds.includes(id);
    if (has) {
      update({ spells: spellEntries.filter(s => s.id !== id) });
    } else {
      if (cantripIds.length >= cantripLimit) return;
      update({ spells: [...spellEntries, { id, prepared: true }] });
    }
  };

  const togglePrepared = (id) => {
    const has = preparedIds.includes(id);
    if (has) {
      update({ spells: spellEntries.filter(s => s.id !== id) });
    } else {
      if (isPrepared && preparedIds.length >= preparedLimit) return;
      update({ spells: [...spellEntries, { id, prepared: true }] });
    }
  };

  const removeSpell = (id) => {
    update({ spells: spellEntries.filter(s => s.id !== id) });
  };

  // Known caster: ability to add new known spells via dropdown
  const available = SRD.SPELLS.filter(sp => sp.classes.includes(char.className) && !spellEntries.find(s => s.id === sp.id));
  const addKnownSpell = (id) => update({ spells: [...spellEntries, { id, prepared: true }] });

  const longRest = () => {
    // Reset all slots + wild shape uses + lay-on-hands etc. For now: reset spell slots.
    update({
      spellSlotsUsed: (char.spellSlotsUsed || []).map(() => 0),
      wildShapeUses: 0,
      hitDiceUsed: Math.max(0, (char.hitDiceUsed || 0) - Math.max(1, Math.floor(char.level / 2))),
    });
  };

  return (
    <>
      <div className="card mb-4">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="eyebrow">{t('spellAbility', lang)}</div>
            <div style={{ fontFamily: 'var(--display)', color: 'var(--gold)' }}>
              {spellAb ? t(spellAb, lang) : '—'}
            </div>
          </div>
          <div>
            <div className="eyebrow">{t('spellSaveDc', lang)}</div>
            <div className="mono" style={{ fontSize: '1.4rem', color: 'var(--gold-bright)' }}>{spellDc || '—'}</div>
          </div>
          <div>
            <div className="eyebrow">{t('spellAttack', lang)}</div>
            <div className="mono" style={{ fontSize: '1.4rem', color: 'var(--gold-bright)' }}>
              {spellAtk !== null ? Utils.fmtMod(spellAtk) : '—'}
            </div>
          </div>
          {isPrepared && (
            <div>
              <div className="eyebrow">{t('preparedSpells', lang)}</div>
              <div className="mono" style={{ fontSize: '1.4rem', color: preparedIds.length > preparedLimit ? 'var(--blood-bright)' : 'var(--gold-bright)' }}>
                {preparedIds.length}/{preparedLimit}
              </div>
            </div>
          )}
        </div>
      </div>

      {slots && slots.length > 0 && slots.some(s => s) && (
        <>
<<<<<<< HEAD:components/SheetTabs.jsx
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="eyebrow mb-2">{t('slots', lang)}</div>
            <button className="btn btn-sm btn-ghost" onClick={longRest} title={t('longRest', lang)}>
              <Icon name="moon" size={12}/> {t('longRest', lang)}
            </button>
          </div>
=======
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div className="eyebrow">{t('slots', lang)}</div>
            <RestButtons char={char} lang={lang} update={update} />
          </div>
          {char.inCampaign && (
            <div className="muted small" style={{ fontSize: '0.8em', marginBottom: 6 }}>
              🔒 {lang === 'pt' ? 'Em campanha: slots travados. Use "Conjurar" nas magias abaixo.' : 'In campaign: slots locked. Use "Cast" on spells below.'}
            </div>
          )}
>>>>>>> d203953156f15171fef4cef7339793c1d615b179:frontend/components/SheetTabs.jsx
          {slots.map((max, idx) => {
            if (!max) return null;
            const used = (char.spellSlotsUsed && char.spellSlotsUsed[idx]) || 0;
            const locked = !!char.inCampaign;
            return (
              <div key={idx} className="slot-row">
                <div className="slot-level">{lang === 'pt' ? 'Nv' : 'Lv'} {idx + 1}</div>
                <div className="slot-pips">
                  {Array.from({ length: max }).map((_, i) => (
                    <button
                      key={i} type="button"
                      className={`slot-pip ${i < used ? 'used' : ''} ${locked ? 'locked' : ''}`}
                      disabled={locked}
                      onClick={locked ? undefined : () => {
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

      {isDruid && char.level >= 2 && (
        <WildShapePanel lang={lang} maxCR={wildShapeMaxCR} note={wildShapeRules} druidLevel={char.level} />
      )}

      {isPrepared ? (
        <PreparedSpellsView
          lang={lang}
          char={char}
          classCantrips={classCantrips}
          classSpells={classSpells}
          cantripIds={cantripIds}
          preparedIds={preparedIds}
          cantripLimit={cantripLimit}
          preparedLimit={preparedLimit}
          maxLvl={maxLvl}
          onToggleCantrip={toggleCantrip}
          onTogglePrepared={togglePrepared}
          spellAtk={spellAtk}
          roll={roll}
        />
      ) : (
        <KnownSpellsView
          lang={lang}
          char={char}
          spellEntries={spellEntries}
          available={available}
          onAddSpell={addKnownSpell}
          onRemove={removeSpell}
          spellAtk={spellAtk}
          roll={roll}
        />
      )}
    </>
  );
};

const PreparedSpellsView = ({ lang, char, classCantrips, classSpells, cantripIds, preparedIds, cantripLimit, preparedLimit, maxLvl, onToggleCantrip, onTogglePrepared, spellAtk, roll }) => {
  const leveled = classSpells.filter(s => s.level > 0);
  const byLevel = {};
  leveled.forEach(sp => {
    if (!byLevel[sp.level]) byLevel[sp.level] = [];
    byLevel[sp.level].push(sp);
  });

  return (
    <>
      {cantripLimit > 0 && classCantrips.length > 0 && (
        <>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
            <Filigree>{t('cantrips', lang)}</Filigree>
            <span className="text-xs muted mono">{cantripIds.length}/{cantripLimit}</span>
          </div>
          {classCantrips.map(sp => {
            const sel = cantripIds.includes(sp.id);
            const disabled = !sel && cantripIds.length >= cantripLimit;
            return (
              <SpellRow
                key={sp.id} spell={{ id: sp.id, def: sp, prepared: sel }} lang={lang}
                showPrepared={true}
                preparedDisabled={disabled}
                preparedIcon={sel ? 'check' : 'plus'}
                onTogglePrepared={() => onToggleCantrip(sp.id)}
                onCast={() => spellAtk !== null && roll({ die: 20, mod: spellAtk, label: tName('spellName', sp.id, lang) + ' ' + t('attackRoll', lang) })}
              />
            );
          })}
        </>
      )}

      {Object.keys(byLevel).sort((a, b) => +a - +b).map(lvl => (
        <div key={lvl}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
            <Filigree>{`${t('spellLevel', lang)} ${lvl}`}</Filigree>
            <span className="text-xs muted mono">
              {byLevel[lvl].filter(s => preparedIds.includes(s.id)).length}/{byLevel[lvl].length}
            </span>
          </div>
          {byLevel[lvl].map(sp => {
            const sel = preparedIds.includes(sp.id);
            const disabled = !sel && preparedIds.length >= preparedLimit;
            return (
              <SpellRow
                key={sp.id} spell={{ id: sp.id, def: sp, prepared: sel }} lang={lang}
                showPrepared={true}
                preparedDisabled={disabled}
                onTogglePrepared={() => onTogglePrepared(sp.id)}
                onCast={() => spellAtk !== null && roll({ die: 20, mod: spellAtk, label: tName('spellName', sp.id, lang) + ' ' + t('attackRoll', lang) })}
              />
            );
          })}
        </div>
      ))}

      {maxLvl === 0 && (
        <div className="card text-center muted" style={{ padding: 'var(--s-6)' }}>
          {lang === 'pt' ? 'Nenhum espaço de magia ainda — aumente de nível.' : 'No spell slots yet — level up.'}
        </div>
      )}
    </>
  );
};

const KnownSpellsView = ({ lang, char, spellEntries, available, onAddSpell, onRemove, spellAtk, roll }) => {
  const known = spellEntries.map(cs => {
    const def = SRD.SPELLS.find(s => s.id === cs.id);
    return { ...cs, def };
  }).filter(s => s.def);

  const byLevel = {};
  known.forEach(s => {
    if (!byLevel[s.def.level]) byLevel[s.def.level] = [];
    byLevel[s.def.level].push(s);
  });

  return (
    <>
      <div className="mt-4 mb-3">
        <select value="" onChange={e => { if (e.target.value) onAddSpell(e.target.value); }}>
          <option value="">+ {lang === 'pt' ? 'Adicionar magia' : 'Add spell'}...</option>
          {[0,1,2,3,4,5,6,7,8,9].map(lvl => {
            const list = available.filter(s => s.level === lvl);
            if (list.length === 0) return null;
            return (
              <optgroup key={lvl} label={lvl === 0 ? t('cantrips', lang) : `${t('spellLevel', lang)} ${lvl}`}>
                {list.map(s => <option key={s.id} value={s.id}>{tName('spellName', s.id, lang)}</option>)}
              </optgroup>
            );
          })}
        </select>
      </div>

      {Object.keys(byLevel).sort((a, b) => +a - +b).map(lvl => (
        <div key={lvl}>
          <Filigree>{+lvl === 0 ? t('cantrips', lang) : `${t('spellLevel', lang)} ${lvl}`}</Filigree>
          {byLevel[lvl].map(s => (
            <SpellRow
              key={s.id} spell={s} lang={lang}
<<<<<<< HEAD:components/SheetTabs.jsx
              showPrepared={false}
              onRemove={() => onRemove(s.id)}
              onCast={() => spellAtk !== null && roll({ die: 20, mod: spellAtk, label: tName('spellName', s.id, lang) + ' ' + t('attackRoll', lang) })}
=======
              showPrepared={+lvl > 0}
              onTogglePrepared={() => togglePrepared(s.id)}
              onRemove={() => removeSpell(s.id)}
              char={char}
              slots={slots}
              update={update}
              spellAtk={spellAtk}
              roll={roll}
>>>>>>> d203953156f15171fef4cef7339793c1d615b179:frontend/components/SheetTabs.jsx
            />
          ))}
        </div>
      ))}

      {known.length === 0 && (
        <div className="card text-center muted" style={{ padding: 'var(--s-6)' }}>
          {lang === 'pt' ? 'Nenhuma magia conhecida.' : 'No spells known.'}
        </div>
      )}
    </>
  );
};

const abilityMod = (score) => Math.floor((score - 10) / 2);
const fmtMod = (m) => (m >= 0 ? `+${m}` : `${m}`);

const WildShapePanel = ({ lang, maxCR, note, druidLevel }) => {
  const [open, setOpen] = useState(false);
  const beasts = (SRD.BEASTS || []).filter(b => b.crNum <= maxCR + 1e-9);
  const allowFly = druidLevel >= 8;
  const allowSwim = druidLevel >= 4;
  const eligible = beasts.filter(b => (allowFly || !b.fly) && (allowSwim || !b.swim));

  return (
    <div style={{ marginBottom: 16 }}>
      <Filigree>{lang === 'pt' ? 'Forma Selvagem' : 'Wild Shape'}</Filigree>
      <div className="card" style={{ padding: 12, marginBottom: 8 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="eyebrow">{lang === 'pt' ? 'CR máximo' : 'Max CR'}</div>
            <div style={{ fontFamily: 'var(--display)', color: 'var(--gold-bright)', fontSize: '1.2rem' }}>
              {maxCR === 0.25 ? '1/4' : maxCR === 0.5 ? '1/2' : maxCR}
            </div>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={() => setOpen(!open)}>
            <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14}/>
            {open
              ? (lang === 'pt' ? 'Ocultar bestas' : 'Hide beasts')
              : `${eligible.length} ${lang === 'pt' ? 'formas' : 'forms'}`}
          </button>
        </div>
        {note && <div className="text-xs muted" style={{ marginTop: 6 }}>{note}</div>}
      </div>
      {open && eligible.map(b => <BeastCard key={b.id} beast={b} lang={lang} />)}
    </div>
  );
};

const BeastCard = ({ beast, lang }) => {
  const [open, setOpen] = useState(false);
  const speeds = [];
  if (beast.speed) speeds.push(`${beast.speed}'`);
  if (beast.fly) speeds.push(`${lang === 'pt' ? 'voo' : 'fly'} ${beast.fly}'`);
  if (beast.swim) speeds.push(`${lang === 'pt' ? 'nat' : 'swim'} ${beast.swim}'`);
  if (beast.climb) speeds.push(`${lang === 'pt' ? 'esc' : 'climb'} ${beast.climb}'`);
  if (beast.burrow) speeds.push(`${lang === 'pt' ? 'esc' : 'burrow'} ${beast.burrow}'`);
  return (
    <div className="card" style={{ marginBottom: 6, padding: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div>
          <div style={{ fontFamily: 'var(--display)', color: 'var(--gold)' }}>
            {tName('beast', beast.id, lang)}
          </div>
          <div className="text-xs muted">
            CR {beast.cr} · {beast.size} · CA {beast.ac} · HP {beast.hp} · {speeds.join(', ')}
          </div>
        </div>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14}/>
      </div>
      {open && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--stroke-faint)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 10, textAlign: 'center' }}>
            {['str','dex','con','int','wis','cha'].map(k => (
              <div key={k}>
                <div className="eyebrow text-xs">{t(k + 'Sh', lang)}</div>
                <div className="mono text-sm">{beast[k]} <span className="muted">({fmtMod(abilityMod(beast[k]))})</span></div>
              </div>
            ))}
          </div>
          {(beast.traits || []).map((tr, i) => (
            <div key={i} className="text-sm" style={{ marginBottom: 4 }}>
              <strong style={{ color: 'var(--gold-deep)' }}>{tr.name[lang]}.</strong>{' '}
              <span style={{ color: 'var(--ink-secondary)' }}>{tr.desc[lang]}</span>
            </div>
          ))}
          {(beast.actions || []).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div className="eyebrow text-xs" style={{ marginBottom: 4 }}>{lang === 'pt' ? 'Ações' : 'Actions'}</div>
              {beast.actions.map((a, i) => (
                <div key={i} className="text-sm" style={{ marginBottom: 4 }}>
                  <strong style={{ color: 'var(--gold-deep)' }}>{a.name[lang]}.</strong>{' '}
                  <span style={{ color: 'var(--ink-secondary)' }}>{a.desc[lang]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

<<<<<<< HEAD:components/SheetTabs.jsx
const SpellRow = ({ spell, lang, showPrepared, onTogglePrepared, onRemove, onCast, preparedDisabled, preparedIcon }) => {
=======
const SpellRow = ({ spell, lang, showPrepared, onTogglePrepared, onRemove, char, slots, update, spellAtk, roll }) => {
>>>>>>> d203953156f15171fef4cef7339793c1d615b179:frontend/components/SheetTabs.jsx
  const [open, setOpen] = useState(false);
  const [casting, setCasting] = useState(false);
  const [error, setError] = useState('');
  const sp = spell.def;
  const isCantrip = sp.level === 0;
  const inCampaign = !!char?.inCampaign;

  // Slot selecionado pra conjurar (default: nível mínimo possível = nível da magia)
  const available = (slots || []).map((max, i) => {
    const used = (char.spellSlotsUsed || [])[i] || 0;
    return { level: i + 1, max, used, free: max - used };
  }).filter(x => x.level >= sp.level && x.free > 0);
  const [chosenSlot, setChosenSlot] = useState(sp.level || 1);
  // sincronia: se o nível escolhido não está disponível, escolhe o mínimo disponível
  const effectiveSlot = available.find(x => x.level === chosenSlot) ? chosenSlot : (available[0]?.level || sp.level);

  const cast = async () => {
    setError('');
    setCasting(true);
    try {
      const lvl = isCantrip ? 0 : effectiveSlot;
      if (typeof char.id === 'number' && inCampaign) {
        // Backend faz o desconto atomicamente
        const res = await api.castSpell(char.id, { spellId: sp.id, slotLevel: lvl });
        // res.character.data tem o novo spellSlotsUsed; propaga via update merge
        const data = res.character.data || {};
        update({ spellSlotsUsed: data.spellSlotsUsed || char.spellSlotsUsed });
      } else if (!isCantrip) {
        // Standalone (local OR remoto sem campanha): aplica local
        const arr = [...(char.spellSlotsUsed || [])];
        while (arr.length < 9) arr.push(0);
        arr[lvl - 1] = (arr[lvl - 1] || 0) + 1;
        update({ spellSlotsUsed: arr });
      }
      // Rolagem de ataque, se aplicável
      if (spellAtk !== null && spellAtk !== undefined) {
        roll({ die: 20, mod: spellAtk, label: tName('spellName', sp.id, lang) + ' ' + t('attackRoll', lang) });
      }
    } catch (e) {
      setError(e?.data?.error || e?.message || 'failed');
    } finally {
      setCasting(false);
    }
  };

  const canCast = isCantrip || available.length > 0;

  return (
    <div className={`spell-row ${open ? 'open' : ''} ${showPrepared && !spell.prepared ? 'unprepared' : ''}`}>
      <div className="spell-row-header" onClick={() => setOpen(!open)}>
        {showPrepared && (
          <button
            type="button"
            className={`spell-prepared ${spell.prepared ? 'on' : ''}`}
            onClick={(e) => { e.stopPropagation(); if (!preparedDisabled || spell.prepared) onTogglePrepared(); }}
            disabled={preparedDisabled && !spell.prepared}
            title={spell.prepared ? t('prepared', lang) : (preparedDisabled ? (lang === 'pt' ? 'Limite atingido' : 'Limit reached') : (lang === 'pt' ? 'Preparar' : 'Prepare'))}
            style={{ opacity: preparedDisabled && !spell.prepared ? 0.4 : 1 }}
          >
            <Icon name={spell.prepared ? 'star-fill' : (preparedIcon || 'star')} size={14}/>
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div className="spell-row-name">{tName('spellName', sp.id, lang)}</div>
          <div className="spell-meta">
            <span>{tName('school', sp.school, lang)}</span>
            <span>{sp.castingTime}</span>
            <span>{sp.range}</span>
            {sp.concentration && <span style={{ color: 'var(--gold)' }}>C</span>}
            {sp.ritual && <span style={{ color: 'var(--moss-bright)' }}>R</span>}
          </div>
        </div>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16}/>
      </div>
      {open && (
        <div className="spell-row-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div className="text-xs muted">{t('components', lang)}: <span style={{ color: 'var(--ink-secondary)' }}>{sp.components}</span></div>
            <div className="text-xs muted">{t('duration', lang)}: <span style={{ color: 'var(--ink-secondary)' }}>{sp.duration}</span></div>
          </div>
          <div className="text-sm" style={{ color: 'var(--ink-secondary)' }}>{sp.desc[lang]}</div>
<<<<<<< HEAD:components/SheetTabs.jsx
          <div className="row gap-2 mt-3">
            <button className="btn btn-sm btn-ghost" onClick={onCast}>
              <Icon name="dice" size={12}/> {lang === 'pt' ? 'Atacar' : 'Cast'}
            </button>
            {onRemove && (
              <button className="btn btn-sm btn-ghost btn-danger" onClick={onRemove}>
=======
          {error && <div style={{ color: '#ff9999', fontSize: '0.85em', marginTop: 4 }}>{error}</div>}
          <div className="row gap-2 mt-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {!isCantrip && available.length > 0 && (
              <label className="text-xs muted" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {lang === 'pt' ? 'Slot' : 'Slot'}:
                <select
                  value={effectiveSlot}
                  onChange={e => setChosenSlot(parseInt(e.target.value))}
                  className="input"
                  style={{ padding: '2px 6px', fontSize: '0.85em', height: 'auto' }}
                  onClick={e => e.stopPropagation()}
                >
                  {available.map(x => (
                    <option key={x.level} value={x.level}>
                      Nv {x.level} ({x.free}/{x.max}){x.level > sp.level ? ' ↑' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              className="btn btn-sm btn-primary"
              onClick={cast}
              disabled={!canCast || casting}
              title={!canCast ? (lang === 'pt' ? 'Sem slot disponível neste nível' : 'No slot available') : undefined}
            >
              <Icon name="dice" size={12}/> {casting ? '…' : (isCantrip ? (lang === 'pt' ? 'Conjurar truque' : 'Cast cantrip') : (lang === 'pt' ? 'Conjurar' : 'Cast'))}
            </button>
            {!isCantrip && !canCast && (
              <span className="text-xs" style={{ color: '#ff9999' }}>
                {lang === 'pt' ? 'sem slot' : 'no slot'}
              </span>
            )}
            {!inCampaign && (
              <button className="btn btn-sm btn-ghost btn-danger" onClick={onRemove} title={lang === 'pt' ? 'Remover magia' : 'Remove'}>
>>>>>>> d203953156f15171fef4cef7339793c1d615b179:frontend/components/SheetTabs.jsx
                <Icon name="trash" size={12}/>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Botões de descanso. Em campanha: chama backend (recurso autorizado pra dono
 * ou DM). Em standalone: aplica local.
 */
const RestButtons = ({ char, lang, update }) => {
  const [busy, setBusy] = useState(false);
  const restore = async (type) => {
    setBusy(true);
    try {
      if (typeof char.id === 'number') {
        const res = await api.rest(char.id, { type });
        const d = res.character.data || {};
        update({
          spellSlotsUsed: d.spellSlotsUsed,
          wildShapeUses: d.wildShapeUses,
          currentHp: d.currentHp,
          tempHp: d.tempHp,
          conditions: d.conditions,
          deathSaves: d.deathSaves,
          hitDiceUsed: d.hitDiceUsed,
        });
      } else {
        // Local — aplica via merge
        const patch = {};
        if (type === 'long') {
          patch.spellSlotsUsed = [0,0,0,0,0,0,0,0,0];
          patch.wildShapeUses = 0;
          patch.currentHp = char.maxHp;
          patch.tempHp = 0;
          patch.conditions = (char.conditions || []).filter(c => c !== 'unconscious');
          patch.deathSaves = { success: 0, fail: 0 };
        } else {
          if (char.className === 'warlock') patch.spellSlotsUsed = [0,0,0,0,0,0,0,0,0];
          if (char.className === 'druid') patch.wildShapeUses = 0;
        }
        update(patch);
      }
    } catch (e) { console.warn('rest failed', e); }
    finally { setBusy(false); }
  };
  return (
    <div className="row gap-1">
      <button className="btn btn-sm btn-ghost" onClick={() => restore('short')} disabled={busy} title={lang === 'pt' ? 'Descanso curto' : 'Short rest'}>
        ☕ {lang === 'pt' ? 'Curto' : 'Short'}
      </button>
      <button className="btn btn-sm btn-ghost" onClick={() => restore('long')} disabled={busy} title={lang === 'pt' ? 'Descanso longo' : 'Long rest'}>
        🛌 {lang === 'pt' ? 'Longo' : 'Long'}
      </button>
    </div>
  );
};

// ===== Inventory =====
const SheetInventory = ({ char, lang, update, roll, cls, bg }) => {
  const cls_ = cls;
  const addWeapon = (id) => {
    const w = SRD.WEAPONS.find(x => x.id === id);
    if (!w) return;
    update({
      weapons: [...(char.weapons || []), {
        id: w.id, name: tName('weapon', w.id, lang), damage: w.damage, dmgType: w.dmgType, props: w.props,
      }]
    });
  };
  const removeWeapon = (idx) => update({ weapons: char.weapons.filter((_, i) => i !== idx) });
  const updateWeapon = (idx, patch) => update({ weapons: char.weapons.map((w, i) => i === idx ? { ...w, ...patch } : w) });

  const addItem = () => update({ equipment: [...(char.equipment || []), { name: '', qty: 1 }] });
  const updateItem = (idx, patch) => update({ equipment: char.equipment.map((e, i) => i === idx ? { ...e, ...patch } : e) });
  const removeItem = (idx) => update({ equipment: char.equipment.filter((_, i) => i !== idx) });

  return (
    <>
      <Filigree>{t('armorChoice', lang)}</Filigree>
      <div className="card mb-3">
        <select value={char.armor || ''} onChange={e => update({ armor: e.target.value || null })}>
          <option value="">{t('noArmor', lang)}</option>
          {SRD.ARMOR.filter(a => a.type !== 'shield').map(a => (
            <option key={a.id} value={a.id}>{tName('armor', a.id, lang)} (CA {a.ac}, {a.type})</option>
          ))}
        </select>
        <div className="row gap-2 mt-2" style={{ alignItems: 'center' }}>
          <input type="checkbox" id="shield2" checked={char.hasShield}
            onChange={e => update({ hasShield: e.target.checked })}
            style={{ width: 'auto', minHeight: 'auto' }}/>
          <label htmlFor="shield2" style={{ margin: 0, cursor: 'pointer' }}>{t('shield', lang)} (+2 CA)</label>
        </div>
      </div>

      <Filigree>{t('weapons', lang)}</Filigree>
      <select value="" onChange={e => { if (e.target.value) { addWeapon(e.target.value); e.target.value = ''; } }} style={{ marginBottom: 8 }}>
        <option value="">+ {t('addWeapon', lang)}...</option>
        {['simple-melee','simple-ranged','martial-melee','martial-ranged'].map(t_ => (
          <optgroup key={t_} label={t_}>
            {SRD.WEAPONS.filter(w => w.type === t_).map(w =>
              <option key={w.id} value={w.id}>{tName('weapon', w.id, lang)} ({w.damage})</option>
            )}
          </optgroup>
        ))}
      </select>
      {(char.weapons || []).map((w, i) => {
        const wDef = w.id ? SRD.WEAPONS.find(x => x.id === w.id) : null;
        const isFinesse = wDef && wDef.props && wDef.props.includes('finesse');
        const isRanged = wDef && (wDef.type || '').includes('ranged');
        const useDex = isRanged || (isFinesse && Utils.abilityMod(char, 'dex') > Utils.abilityMod(char, 'str'));
        const abMod = Utils.abilityMod(char, useDex ? 'dex' : 'str');
        const atk = abMod + Utils.profBonus(char);
        return (
          <div key={i} className="card" style={{ marginBottom: 8, padding: 12 }}>
            <div className="row gap-2 mb-2">
              <input value={w.name} onChange={e => updateWeapon(i, { name: e.target.value })}/>
              <button className="btn btn-icon btn-ghost btn-danger" onClick={() => removeWeapon(i)}>
                <Icon name="trash" size={14}/>
              </button>
            </div>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <input value={w.damage} onChange={e => updateWeapon(i, { damage: e.target.value })} style={{ width: 90 }} placeholder="1d8"/>
              <input value={w.dmgType || ''} onChange={e => updateWeapon(i, { dmgType: e.target.value })} style={{ width: 110 }} placeholder={lang === 'pt' ? 'tipo' : 'type'}/>
              <button className="btn btn-sm" onClick={() => roll({ die: 20, mod: atk, label: w.name + ' ' + t('attackRoll', lang) })}>
                <Icon name="dice" size={12}/> {Utils.fmtMod(atk)}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => {
                const m = w.damage.match(/(\d+)d(\d+)/);
                if (m) roll({ die: +m[2], count: +m[1], mod: abMod, label: w.name + ' ' + t('damageRoll', lang) });
              }}>
                {t('damageRoll', lang)}
              </button>
            </div>
            {wDef && wDef.props && wDef.props.length > 0 && (
              <div className="text-xs muted mt-2">{wDef.props.join(', ')}</div>
            )}
          </div>
        );
      })}

      <Filigree>{t('equipmentList', lang)}</Filigree>
      <InventoryList char={char} lang={lang} update={update} addItem={addItem} updateItem={updateItem} removeItem={removeItem} />


      <Filigree>{t('coins', lang)}</Filigree>
      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {['cp','sp','ep','gp','pp'].map(c => (
            <div key={c} className="text-center">
              <div className="eyebrow text-xs">{tName('coin', c, lang)}</div>
              <input
                type="number" min="0"
                value={char.coins[c]}
                onChange={ev => update({ coins: { ...char.coins, [c]: +ev.target.value || 0 } })}
                style={{ textAlign: 'center', padding: 6 }}
              />
            </div>
          ))}
        </div>
      </div>

      <Filigree>{lang === 'pt' ? 'Características de Classe' : 'Class Features'}</Filigree>
      {cls && cls.features && cls.features.map((f, i) => (
        <div key={i} className="card" style={{ marginBottom: 8, padding: 12 }}>
          <div style={{ fontFamily: 'var(--display)', color: 'var(--gold)', marginBottom: 4 }}>
            {f.name[lang]}
          </div>
          <div className="text-sm" style={{ color: 'var(--ink-secondary)' }}>{f.desc[lang]}</div>
        </div>
      ))}
    </>
  );
};

// ===== Story =====
const SheetStory = ({ char, lang, update, cls, race }) => (
  <>
    <Filigree>{t('stepStory', lang)}</Filigree>
    <div style={{ display: 'grid', gap: 12 }}>
      {['personality','ideals','bonds','flaws','backstory','appearance','allies','treasure'].map(field => (
        <div key={field}>
          <label>{t(field, lang)}</label>
          <textarea value={char[field] || ''} onChange={e => update({ [field]: e.target.value })} style={{ minHeight: field === 'backstory' ? 120 : 60 }}/>
        </div>
      ))}
      <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
        {['age','height','weight','eyes','skin','hair'].map(f => (
          <div key={f} style={{ flex: '1 1 30%' }}>
            <label>{t(f, lang)}</label>
            <input value={char[f] || ''} onChange={e => update({ [f]: e.target.value })}/>
          </div>
        ))}
      </div>
      <div>
        <label>{t('symbol', lang)}</label>
        <input value={char.symbol || ''} onChange={e => update({ symbol: e.target.value })}/>
      </div>
    </div>

    {race && (
      <>
        <Filigree>{lang === 'pt' ? 'Traços Raciais' : 'Racial Traits'}</Filigree>
        {race.traits.map((tr, i) => (
          <div key={i} className="card" style={{ marginBottom: 8, padding: 12 }}>
            <div style={{ fontFamily: 'var(--display)', color: 'var(--gold)', marginBottom: 4 }}>{tr.name[lang]}</div>
            <div className="text-sm" style={{ color: 'var(--ink-secondary)' }}>{tr.desc[lang]}</div>
          </div>
        ))}
      </>
    )}
  </>
);

// ===== Notes / Journal =====
const SheetNotes = ({ char, lang, update }) => {
  const addNote = () => {
    const date = new Date().toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');
    update({ notes: [{ id: Date.now(), date, text: '' }, ...(char.notes || [])] });
  };
  const updateNote = (id, text) => {
    update({ notes: char.notes.map(n => n.id === id ? { ...n, text } : n) });
  };
  const removeNote = (id) => update({ notes: char.notes.filter(n => n.id !== id) });

  return (
    <>
      <Filigree>{t('tabNotes', lang)}</Filigree>
      <button className="btn btn-primary btn-sm" onClick={addNote} style={{ marginBottom: 16 }}>
        <Icon name="plus" size={14}/> {t('addNote', lang)}
      </button>
      {(char.notes || []).length === 0 && (
        <div className="card text-center muted" style={{ padding: 'var(--s-6)' }}>
          {t('noNotes', lang)}
        </div>
      )}
      {(char.notes || []).map(n => (
        <div key={n.id} className="card mb-3" style={{ padding: 12 }}>
          <div className="row mb-2" style={{ justifyContent: 'space-between' }}>
            <span className="text-xs muted mono">{n.date}</span>
            <button className="btn btn-icon btn-ghost btn-danger" onClick={() => removeNote(n.id)}>
              <Icon name="trash" size={14}/>
            </button>
          </div>
          <textarea value={n.text} onChange={e => updateNote(n.id, e.target.value)} style={{ minHeight: 90 }} placeholder={lang === 'pt' ? 'Aventura, encontro, descoberta...' : 'Adventure, encounter, discovery...'}/>
        </div>
      ))}
    </>
  );
};

/**
 * InventoryList — lista de equipamento com estado (flags broken/equipped/qty/
 * attunement/notes).
 *
 * Modo standalone: edita tudo localmente via `update`. Mostra botão "Adicionar".
 * Modo campanha: usa endpoints (PATCH/DELETE/consume). Esconde "Adicionar"
 * (item dado pelo mestre). Mostra mensagem clara.
 *
 * Items "legacy" sem `id` (antiga estrutura {name, qty}) ainda aparecem
 * — convertidos para nova estrutura na primeira edição via `update`.
 */
function InventoryList({ char, lang, update, addItem, updateItem, removeItem }) {
  const inCampaign = !!char.inCampaign;
  const items = char.equipment || [];

  const callBackend = async (fn) => {
    if (typeof char.id !== 'number') return null;
    try { return await fn(); } catch (e) {
      alert(e?.data?.error || e?.message || 'failed');
      return null;
    }
  };

  const toggleEquipped = async (it, idx) => {
    if (typeof char.id === 'number' && inCampaign && it.id) {
      const r = await callBackend(() => api.invPatch(char.id, it.id, { equipped: !it.equipped }));
      if (r) update({ equipment: r.character.data.equipment || [] });
    } else {
      updateItem(idx, { equipped: !it.equipped });
    }
  };

  const toggleAttuned = async (it, idx) => {
    if (!it.attunement) return;
    const newVal = !it.attuned;
    // Limite de 3 attuned em standalone (validado no backend em campanha)
    if (newVal && !inCampaign) {
      const count = items.filter(x => x.attuned).length;
      if (count >= 3) { alert(lang === 'pt' ? 'Limite de 3 itens em sintonia.' : 'Limit of 3 attuned items.'); return; }
    }
    if (typeof char.id === 'number' && inCampaign && it.id) {
      const r = await callBackend(() => api.invPatch(char.id, it.id, { attuned: newVal }));
      if (r) update({ equipment: r.character.data.equipment || [] });
    } else {
      updateItem(idx, { attuned: newVal });
    }
  };

  const consume = async (it, idx) => {
    if (typeof char.id === 'number' && it.id) {
      const r = await callBackend(() => api.invConsume(char.id, it.id));
      if (r) update({ equipment: r.character.data.equipment || [] });
    } else {
      const nq = Math.max(0, (it.qty || 1) - 1);
      if (nq === 0 && it.type === 'potion') {
        const next = items.filter((_, i) => i !== idx);
        update({ equipment: next });
      } else {
        updateItem(idx, { qty: nq });
      }
    }
  };

  const removeOne = async (it, idx) => {
    if (inCampaign && typeof char.id === 'number') {
      // Em campanha, dono não remove. DM remove via DM editor.
      alert(lang === 'pt' ? 'Em campanha, apenas o mestre remove itens.' : 'In campaign, only the DM removes items.');
      return;
    }
    if (typeof char.id === 'number' && it.id) {
      const r = await callBackend(() => api.invDelete(char.id, it.id));
      if (r) update({ equipment: r.character.data.equipment || [] });
    } else {
      removeItem(idx);
    }
  };

  const setNotes = async (it, idx, notes) => {
    if (typeof char.id === 'number' && inCampaign && it.id) {
      await callBackend(() => api.invPatch(char.id, it.id, { notes }));
    } else {
      updateItem(idx, { notes });
    }
  };

  return (
    <>
      {inCampaign && (
        <div className="muted small" style={{ fontSize: '0.85em', marginBottom: 6 }}>
          🔒 {lang === 'pt'
            ? 'Em campanha: o mestre entrega os equipamentos. Você pode equipar, consumir e anotar.'
            : 'In campaign: the DM gives items. You can equip, consume, and add notes.'}
        </div>
      )}
      {items.length === 0 && (
        <p className="muted small">{lang === 'pt' ? 'Sem itens.' : 'No items.'}</p>
      )}
      {items.map((it, i) => (
        <InventoryRow key={it.id || `legacy-${i}`} item={it} idx={i} lang={lang}
          inCampaign={inCampaign}
          onToggleEquipped={() => toggleEquipped(it, i)}
          onToggleAttuned={() => toggleAttuned(it, i)}
          onConsume={() => consume(it, i)}
          onRemove={() => removeOne(it, i)}
          onSetNotes={(n) => setNotes(it, i, n)}
          onPatchLocal={(p) => updateItem(i, p)}
        />
      ))}
      {!inCampaign && (
        <button className="btn btn-sm btn-ghost" onClick={addItem} style={{ marginTop: 4 }}>
          <Icon name="plus" size={14}/> {t('addItem', lang)}
        </button>
      )}
    </>
  );
}

function InventoryRow({ item, idx, lang, inCampaign, onToggleEquipped, onToggleAttuned, onConsume, onRemove, onSetNotes, onPatchLocal }) {
  const [open, setOpen] = useState(false);
  const isLegacy = !item.id;
  const broken = !!item.broken;
  const equipped = !!item.equipped;
  const attuned = !!item.attuned;
  const canAttune = !!item.attunement;
  const type = item.type || (isLegacy ? 'gear' : '');
  const typeIcon = type === 'weapon' ? '⚔️' : type === 'armor' ? '🛡️' : type === 'shield' ? '🛡' : type === 'potion' ? '🧪' : type === 'magic' ? '✨' : '🎒';

  return (
    <div className={`inv-row-v2 ${broken ? 'broken' : ''} ${equipped ? 'equipped' : ''}`}>
      <div className="inv-row-head" onClick={() => setOpen(!open)}>
        <span className="inv-type-icon">{typeIcon}</span>
        <span className="inv-name">{item.name || '?'}</span>
        {item.qty != null && item.qty !== 1 && <span className="muted small">×{item.qty}</span>}
        {broken && <span className="inv-tag broken-tag">{lang === 'pt' ? 'QUEBRADO' : 'BROKEN'}</span>}
        {equipped && <span className="inv-tag equip-tag">{lang === 'pt' ? 'equipado' : 'equipped'}</span>}
        {attuned && <span className="inv-tag attune-tag">⚝ {lang === 'pt' ? 'em sintonia' : 'attuned'}</span>}
      </div>
      {open && (
        <div className="inv-row-body">
          {item.description && (
            <div className="text-sm muted" style={{ marginBottom: 6 }}>
              {item.description[lang] || item.description.en || item.description}
            </div>
          )}
          {item.weapon && (
            <div className="text-xs muted">⚔ {item.weapon.damage} {item.weapon.dmgType}{item.weapon.props?.length ? ` · ${item.weapon.props.join(', ')}` : ''}</div>
          )}
          {item.armor && (
            <div className="text-xs muted">🛡 CA {item.armor.ac} ({item.armor.type}){item.armor.stealth === 'disadv' ? ' · desv. Stealth' : ''}{item.armor.strReq ? ` · req FOR ${item.armor.strReq}` : ''}</div>
          )}
          {item.magic && (
            <div className="text-xs" style={{ color: 'var(--gold)' }}>✨ {item.magic.effect?.[lang] || item.magic.effect?.en}</div>
          )}
          <div className="row gap-2 mt-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            {(item.type === 'weapon' || item.type === 'armor' || item.type === 'shield' || canAttune) && (
              <button className={`btn btn-sm ${equipped ? 'btn-primary' : 'btn-ghost'}`} onClick={onToggleEquipped}>
                {equipped ? '✓ ' : ''}{lang === 'pt' ? 'Equipado' : 'Equipped'}
              </button>
            )}
            {canAttune && (
              <button className={`btn btn-sm ${attuned ? 'btn-primary' : 'btn-ghost'}`} onClick={onToggleAttuned}>
                ⚝ {lang === 'pt' ? 'Sintonia' : 'Attune'}
              </button>
            )}
            {(item.qty || 0) > 0 && (
              <button className="btn btn-sm btn-ghost" onClick={onConsume} title={lang === 'pt' ? 'Consumir 1' : 'Consume 1'}>
                − {lang === 'pt' ? 'Consumir' : 'Consume'}
              </button>
            )}
            {/* Em campanha não permite remover */}
            {!inCampaign && (
              <button className="btn btn-sm btn-ghost btn-danger" onClick={onRemove}>
                <Icon name="trash" size={12}/>
              </button>
            )}
          </div>
          <label className="row gap-2 mt-2" style={{ alignItems: 'center' }}>
            <span className="muted small">{lang === 'pt' ? 'Notas' : 'Notes'}:</span>
            <input
              value={item.notes || ''}
              onChange={e => onPatchLocal({ notes: e.target.value })}
              onBlur={e => onSetNotes(e.target.value)}
              placeholder={lang === 'pt' ? '...' : '...'}
              style={{ flex: 1 }}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export { SheetSpells, SheetInventory, SheetStory, SheetNotes };
