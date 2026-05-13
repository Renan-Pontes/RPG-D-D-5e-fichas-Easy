/* Spells / Inventory / Story / Notes tabs */
import { useState } from 'react';
import SRD from '../data/srd.js';
import Utils from '../utils.js';
import { t, tName } from '../data/i18n.js';
import Icon from './Icons.jsx';
import { Filigree, NumStepper, Pips } from './Shared.jsx';

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

  const known = (char.spells || []).map(cs => {
    const def = SRD.SPELLS.find(s => s.id === cs.id);
    return { ...cs, def };
  }).filter(s => s.def);

  const byLevel = {};
  known.forEach(s => {
    const lvl = s.def.level;
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push(s);
  });

  const togglePrepared = (id) => {
    update({
      spells: char.spells.map(s => s.id === id ? { ...s, prepared: !s.prepared } : s)
    });
  };

  const removeSpell = (id) => {
    update({ spells: char.spells.filter(s => s.id !== id) });
  };

  // Add spell dropdown
  const available = SRD.SPELLS.filter(sp => sp.classes.includes(char.className) && !char.spells.find(s => s.id === sp.id));

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
        </div>
      </div>

      {slots && slots.length > 0 && slots.some(s => s) && (
        <>
          <div className="eyebrow mb-2">{t('slots', lang)}</div>
          {slots.map((max, idx) => {
            if (!max) return null;
            const used = (char.spellSlotsUsed && char.spellSlotsUsed[idx]) || 0;
            return (
              <div key={idx} className="slot-row">
                <div className="slot-level">{lang === 'pt' ? 'Nv' : 'Lv'} {idx + 1}</div>
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

      <div className="mt-4 mb-3">
        <select value="" onChange={e => {
          if (e.target.value) {
            update({ spells: [...char.spells, { id: e.target.value, prepared: true }] });
          }
        }}>
          <option value="">+ {lang === 'pt' ? 'Adicionar magia' : 'Add spell'}...</option>
          {[0,1,2,3,4,5,6,7,8,9].map(lvl => {
            const list = available.filter(s => s.level === lvl);
            if (list.length === 0) return null;
            return (
              <optgroup key={lvl} label={lvl === 0 ? t('cantrips', lang) : `${t('spellLevel', lang)} ${lvl}`}>
                {list.map(s =>
                  <option key={s.id} value={s.id}>{tName('spellName', s.id, lang)}</option>
                )}
              </optgroup>
            );
          })}
        </select>
      </div>

      {isDruid && char.level >= 2 && (
        <WildShapePanel lang={lang} maxCR={wildShapeMaxCR} note={wildShapeRules} druidLevel={char.level} />
      )}

      {Object.keys(byLevel).sort((a, b) => +a - +b).map(lvl => (
        <div key={lvl}>
          <Filigree>{+lvl === 0 ? t('cantrips', lang) : `${t('spellLevel', lang)} ${lvl}`}</Filigree>
          {byLevel[lvl].map(s => (
            <SpellRow
              key={s.id} spell={s} lang={lang}
              showPrepared={+lvl > 0}
              onTogglePrepared={() => togglePrepared(s.id)}
              onRemove={() => removeSpell(s.id)}
              onCast={() => {
                // attack roll if it's a damaging cantrip/spell — let the user roll dice manually via desc
                if (spellAtk !== null) roll({ die: 20, mod: spellAtk, label: tName('spellName', s.id, lang) + ' ' + t('attackRoll', lang) });
              }}
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

const SpellRow = ({ spell, lang, showPrepared, onTogglePrepared, onRemove, onCast }) => {
  const [open, setOpen] = useState(false);
  const sp = spell.def;
  return (
    <div className={`spell-row ${open ? 'open' : ''}`}>
      <div className="spell-row-header" onClick={() => setOpen(!open)}>
        {showPrepared && (
          <button
            type="button"
            className={`spell-prepared ${spell.prepared ? 'on' : ''}`}
            onClick={(e) => { e.stopPropagation(); onTogglePrepared(); }}
            title={spell.prepared ? t('prepared', lang) : (lang === 'pt' ? 'Preparar' : 'Prepare')}
          >
            <Icon name={spell.prepared ? 'star-fill' : 'star'} size={14}/>
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
          <div className="row gap-2 mt-3">
            <button className="btn btn-sm btn-ghost" onClick={onCast}>
              <Icon name="dice" size={12}/> {lang === 'pt' ? 'Atacar' : 'Cast'}
            </button>
            <button className="btn btn-sm btn-ghost btn-danger" onClick={onRemove}>
              <Icon name="trash" size={12}/>
            </button>
          </div>
        </div>
      )}
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
      {(char.equipment || []).map((e, i) => (
        <div key={i} className="inv-row">
          <input value={e.name} onChange={ev => updateItem(i, { name: ev.target.value })}/>
          <input className="inv-qty" type="number" value={e.qty} onChange={ev => updateItem(i, { qty: +ev.target.value || 1 })} min="0"/>
          <button className="btn btn-icon btn-ghost btn-danger" onClick={() => removeItem(i)}>
            <Icon name="trash" size={14}/>
          </button>
        </div>
      ))}
      <button className="btn btn-sm btn-ghost" onClick={addItem} style={{ marginTop: 4 }}>
        <Icon name="plus" size={14}/> {t('addItem', lang)}
      </button>

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

export { SheetSpells, SheetInventory, SheetStory, SheetNotes };
