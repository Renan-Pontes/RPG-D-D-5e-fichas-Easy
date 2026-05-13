/* Step-by-step character creator (mobile-first) */
import { useState, useEffect, useCallback } from 'react';
import SRD from '../data/srd.js';
import Utils from '../utils.js';
import { t, tName } from '../data/i18n.js';
import Icon from './Icons.jsx';
import { Filigree, Modal, NumStepper, AvatarUpload } from './Shared.jsx';

const POINT_BUY_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const POINT_BUY_TOTAL = 27;

const pointBuyCost = (abilities) =>
  SRD.ABILITIES.reduce((s, k) => s + (POINT_BUY_COST[abilities[k]] || 0), 0);

const CLASS_PRIORITIES = {
  barbarian: ['str', 'con', 'dex', 'wis', 'int', 'cha'],
  bard:      ['cha', 'dex', 'con', 'int', 'wis', 'str'],
  cleric:    ['wis', 'str', 'con', 'cha', 'int', 'dex'],
  druid:     ['wis', 'con', 'dex', 'int', 'str', 'cha'],
  fighter:   ['str', 'con', 'dex', 'wis', 'int', 'cha'],
  monk:      ['dex', 'wis', 'con', 'str', 'int', 'cha'],
  paladin:   ['str', 'cha', 'con', 'dex', 'wis', 'int'],
  ranger:    ['dex', 'wis', 'con', 'str', 'int', 'cha'],
  rogue:     ['dex', 'int', 'con', 'cha', 'wis', 'str'],
  sorcerer:  ['cha', 'con', 'dex', 'int', 'wis', 'str'],
  warlock:   ['cha', 'con', 'dex', 'int', 'wis', 'str'],
  wizard:    ['int', 'con', 'dex', 'wis', 'cha', 'str'],
};

const optimizeAbilities = (className) => {
  const order = CLASS_PRIORITIES[className] || ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const result = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
  let budget = POINT_BUY_TOTAL;
  for (const stat of order) {
    for (let v = 15; v >= 8; v--) {
      if ((POINT_BUY_COST[v] || 0) <= budget) {
        result[stat] = v;
        budget -= POINT_BUY_COST[v] || 0;
        break;
      }
    }
  }
  return result;
};

// === Step Components ===

// 1. Identity
const StepIdentity = ({ char, set, lang }) => (
  <div>
    <h2>{t('stepIdentity', lang)}</h2>
    <Filigree />
    <div style={{ display: 'grid', gap: 'var(--s-3)', gridTemplateColumns: '1fr' }}>
      <div>
        <label>{t('characterName', lang)}</label>
        <input value={char.name} onChange={e => set({ name: e.target.value })} placeholder={lang === 'pt' ? 'Aragorn, Filho de Arathorn...' : 'Aragorn, son of Arathorn...'} />
      </div>
      <div>
        <label>{t('playerName', lang)}</label>
        <input value={char.player} onChange={e => set({ player: e.target.value })} />
      </div>
      <div className="row gap-3">
        <div style={{ flex: 1 }}>
          <label>{t('level', lang)}</label>
          <select value={char.level} onChange={e => set({ level: +e.target.value })}>
            {Array.from({ length: 20 }, (_, i) => i + 1).map(n =>
              <option key={n} value={n}>{n}</option>
            )}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>{lang === 'pt' ? 'Progressão' : 'Leveling'}</label>
          <select value={char.levelingMode || 'xp'} onChange={e => set({ levelingMode: e.target.value })}>
            <option value="xp">{lang === 'pt' ? 'Por XP' : 'By XP'}</option>
            <option value="milestone">{lang === 'pt' ? 'Por Marcos' : 'Milestones'}</option>
          </select>
        </div>
      </div>
      {(char.levelingMode || 'xp') === 'xp' && (
        <div>
          <label>{t('xp', lang)}</label>
          <input type="number" min="0" value={char.xp} onChange={e => set({ xp: +e.target.value || 0 })} />
        </div>
      )}
      <div>
        <label>{t('alignment', lang)}</label>
        <select value={char.alignment} onChange={e => set({ alignment: e.target.value })}>
          <option value="">{t('chooseAlignment', lang)}</option>
          {SRD.ALIGNMENTS.map(a =>
            <option key={a} value={a}>{tName('alignment', a, lang)}</option>
          )}
        </select>
      </div>
    </div>
  </div>
);

// 2. Race
const StepRace = ({ char, set, lang }) => {
  const select = (id) => {
    const bonus = Utils.applyRaceBonus(char, id);
    const race = SRD.RACES.find(r => r.id === id);
    set({ race: id, raceBonus: bonus, speedOverride: 0, languages: race ? [...(race.languages || [])] : [] });
  };
  return (
    <div>
      <h2>{t('chooseRace', lang)}</h2>
      <Filigree />
      <div className="options-list cols-2">
        {SRD.RACES.map(r => {
          const isSel = char.race === r.id;
          const asiTxt = Object.entries(r.asi || {}).map(([k, v]) => {
            if (k === 'all') return `+${v} ${lang === 'pt' ? 'todos' : 'all'}`;
            if (k === 'other') return `+${v} ${lang === 'pt' ? 'à escolha' : 'choice'}`;
            return `+${v} ${t(k + 'Sh', lang)}`;
          }).join(', ');
          return (
            <button key={r.id} className={`option ${isSel ? 'selected' : ''}`} onClick={() => select(r.id)}>
              <div className="option-title">{tName('race', r.id, lang)}</div>
              <div className="option-meta">
                <span><strong>{asiTxt}</strong></span>
                <span>{t('speed', lang)}: {r.speed}'</span>
                <span>{r.size}</span>
              </div>
              {isSel && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--stroke-faint)' }}>
                  {r.traits.slice(0, 3).map((tr, i) => (
                    <div key={i} className="text-sm" style={{ marginBottom: 4, color: 'var(--ink-secondary)' }}>
                      <strong style={{ color: 'var(--gold-deep)' }}>{tr.name[lang]}:</strong> {tr.desc[lang]}
                    </div>
                  ))}
                  {r.traits.length > 3 && <div className="text-xs muted">+{r.traits.length - 3} {lang === 'pt' ? 'traços' : 'traits'}</div>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 3. Class
// Level at which each class chooses a subclass
const SUBCLASS_LEVEL = {
  barbarian: 3, bard: 3, cleric: 1, druid: 2, fighter: 3,
  monk: 3, paladin: 3, ranger: 3, rogue: 3, sorcerer: 1, warlock: 1, wizard: 2,
};

const SubclassSelector = ({ char, set, lang }) => {
  const classId = char.className;
  if (!classId) return null;
  const subs = (SRD.SUBCLASSES && SRD.SUBCLASSES[classId]) || [];
  if (!subs.length) return null;

  const subclassLabelMap = {
    barbarian: { pt: 'Caminho', en: 'Path' },
    bard:      { pt: 'Colégio', en: 'College' },
    cleric:    { pt: 'Domínio Divino', en: 'Divine Domain' },
    druid:     { pt: 'Círculo Druídico', en: 'Druid Circle' },
    fighter:   { pt: 'Arquétipo Marcial', en: 'Martial Archetype' },
    monk:      { pt: 'Tradição Monástica', en: 'Monastic Tradition' },
    paladin:   { pt: 'Juramento Sagrado', en: 'Sacred Oath' },
    ranger:    { pt: 'Arquétipo de Ranger', en: 'Ranger Archetype' },
    rogue:     { pt: 'Arquétipo Ladino', en: 'Roguish Archetype' },
    sorcerer:  { pt: 'Origem de Feiticeiro', en: 'Sorcerous Origin' },
    warlock:   { pt: 'Patrono Sobrenatural', en: 'Otherworldly Patron' },
    wizard:    { pt: 'Tradição Arcana', en: 'Arcane Tradition' },
  };
  const label = subclassLabelMap[classId] || { pt: 'Subclasse', en: 'Subclass' };
  const selectedSub = subs.find(s => s.id === char.subclass);

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ color: 'var(--gold)', marginBottom: 8 }}>{label[lang]}</h3>
      <Filigree />
      <div className="options-list cols-2" style={{ marginTop: 12 }}>
        {subs.map(sc => {
          const isSel = char.subclass === sc.id;
          return (
            <button key={sc.id} className={`option ${isSel ? 'selected' : ''}`}
              onClick={() => set({ subclass: sc.id, landType: '', starFormType: '' })}>
              <div className="option-title">{sc.name[lang]}</div>
              <div className="option-meta text-xs" style={{ marginTop: 4 }}>{sc.desc[lang]}</div>
              {isSel && sc.features && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--stroke-faint)' }}>
                  {sc.features.map((f, i) => (
                    <div key={i} className="text-sm" style={{ marginBottom: 4 }}>
                      <strong style={{ color: 'var(--gold-deep)' }}>Lv{f.level} {f.name[lang]}:</strong>{' '}
                      <span style={{ color: 'var(--ink-secondary)' }}>{f.desc[lang]}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Land circle terrain type */}
      {char.subclass === 'land' && selectedSub && selectedSub.landTypes && (
        <div style={{ marginTop: 16 }}>
          <label style={{ color: 'var(--gold-deep)', display: 'block', marginBottom: 8 }}>
            {lang === 'pt' ? 'Terreno Sagrado' : 'Sacred Terrain'}
          </label>
          <div className="options-list cols-4" style={{ marginTop: 4 }}>
            {selectedSub.landTypes.map(lt => (
              <button key={lt.id} className={`option ${char.landType === lt.id ? 'selected' : ''}`}
                style={{ padding: '8px 12px', textAlign: 'center' }}
                onClick={() => set({ landType: lt.id })}>
                {lt.name[lang]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stars circle constellation form */}
      {char.subclass === 'stars' && selectedSub && selectedSub.starForms && (
        <div style={{ marginTop: 16 }}>
          <label style={{ color: 'var(--gold-deep)', display: 'block', marginBottom: 8 }}>
            {lang === 'pt' ? 'Constelação Favorita' : 'Favored Constellation'}
          </label>
          <div className="options-list cols-3" style={{ marginTop: 4 }}>
            {selectedSub.starForms.map(sf => (
              <button key={sf.id} className={`option ${char.starFormType === sf.id ? 'selected' : ''}`}
                onClick={() => set({ starFormType: sf.id })}>
                <div className="option-title" style={{ fontSize: '0.9rem' }}>{sf.name[lang]}</div>
                <div className="option-meta text-xs" style={{ marginTop: 4 }}>{sf.desc[lang]}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StepClass = ({ char, set, lang }) => {
  const select = (id) => {
    const cls = SRD.CLASSES.find(c => c.id === id);
    set({
      className: id,
      saveProfs: cls ? [...cls.saves] : [],
      skillProfs: [],
      subclass: '',
      landType: '',
      starFormType: '',
    });
  };
  return (
    <div>
      <h2>{t('chooseClass', lang)}</h2>
      <Filigree />
      <div className="options-list cols-2">
        {SRD.CLASSES.map(c => {
          const isSel = char.className === c.id;
          const subLv = SUBCLASS_LEVEL[c.id];
          return (
            <button key={c.id} className={`option ${isSel ? 'selected' : ''}`} onClick={() => select(c.id)}>
              <div className="option-title">{tName('class', c.id, lang)}</div>
              <div className="option-meta">
                <span><strong>d{c.hitDie}</strong> {t('hitDie', lang)}</span>
                <span>{t('saves', lang)}: {c.saves.map(s => t(s + 'Sh', lang)).join(', ')}</span>
                {c.spellcaster && <span style={{ color: 'var(--gold)' }}>✦ {t('spellcaster', lang)}</span>}
                {subLv && <span className="text-xs muted">{lang === 'pt' ? `Subclasse Lv${subLv}` : `Subclass Lv${subLv}`}</span>}
              </div>
              {isSel && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--stroke-faint)' }}>
                  {c.features.map((f, i) => (
                    <div key={i} className="text-sm" style={{ marginBottom: 4, color: 'var(--ink-secondary)' }}>
                      <strong style={{ color: 'var(--gold-deep)' }}>{f.name[lang]}:</strong> {f.desc[lang]}
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <SubclassSelector char={char} set={set} lang={lang} />
    </div>
  );
};

// 4. Abilities (point buy)
const StepAbilities = ({ char, set, lang }) => {
  const cost = pointBuyCost(char.abilities);
  const remaining = POINT_BUY_TOTAL - cost;
  const canIncrease = (k) => {
    const v = char.abilities[k];
    if (v >= 15) return false;
    const nextCost = (POINT_BUY_COST[v + 1] || 99) - (POINT_BUY_COST[v] || 0);
    return remaining >= nextCost;
  };
  const canDecrease = (k) => char.abilities[k] > 8;
  const change = (k, delta) => {
    const next = { ...char.abilities, [k]: char.abilities[k] + delta };
    set({ abilities: next });
  };

  // Optional ASI for races with "other" bonus (Half-Elf: +2 CHA + 2x +1 of choice)
  const race = SRD.RACES.find(r => r.id === char.race);
  const needsExtraASI = race && race.asi.other;
  const extraASIPool = needsExtraASI ? race.asi.other : 0;
  const usedExtra = SRD.ABILITIES.reduce((s, a) => {
    const expected = (race && race.asi[a]) || (race && race.asi.all) || 0;
    return s + Math.max(0, (char.raceBonus[a] || 0) - expected);
  }, 0);

  const adjustBonus = (k, delta) => {
    const next = { ...char.raceBonus };
    next[k] = Math.max(0, (next[k] || 0) + delta);
    set({ raceBonus: next });
  };

  return (
    <div>
      <h2>{t('abilitiesTitle', lang)}</h2>
      <div className="text-sm muted" style={{ marginBottom: 16 }}>{t('abilitiesSub', lang)}</div>
      <Filigree />

      {char.className && (
        <button
          className="btn btn-sm btn-ghost"
          style={{ width: '100%', marginBottom: 16, borderColor: 'var(--gold)', color: 'var(--gold)' }}
          onClick={() => set({ abilities: optimizeAbilities(char.className) })}
        >
          ✦ {lang === 'pt'
            ? `Otimizar para ${tName('class', char.className, lang)}`
            : `Optimize for ${tName('class', char.className, lang)}`}
        </button>
      )}

      <div className="pointbuy-pool">
        <span className="pool-label">{t('pointsRemaining', lang)}</span>
        <span className="pool-value mono">{remaining}/27</span>
      </div>

      {SRD.ABILITIES.map(k => {
        const base = char.abilities[k];
        const bonus = char.raceBonus[k] || 0;
        const final = base + bonus;
        const final_mod = Utils.mod(final);
        return (
          <div key={k} className="stat-row">
            <div className="stat-name">
              {t(k, lang)}
              {bonus > 0 && <small>{t('raceBonus', lang)}: +{bonus}</small>}
            </div>
            <div className="stat-controls">
              <button className="stat-btn" onClick={() => change(k, -1)} disabled={!canDecrease(k)}>−</button>
              <span className="stat-value mono">{base}</span>
              <button className="stat-btn" onClick={() => change(k, 1)} disabled={!canIncrease(k)}>+</button>
            </div>
            <div className="stat-final">
              <div className="stat-final-num">{final}</div>
              <div className="stat-final-mod">{Utils.fmtMod(final_mod)}</div>
            </div>
          </div>
        );
      })}

      {needsExtraASI && (
        <>
          <Filigree>{lang === 'pt' ? 'Bônus extra de Meio-Elfo' : 'Half-Elf bonus'}</Filigree>
          <div className="text-sm muted" style={{ marginBottom: 8 }}>
            {lang === 'pt' ? `Distribua +${extraASIPool} extras (1 por atributo, exceto Carisma).` : `Distribute +${extraASIPool} extra (1 per ability, not Charisma).`}
            {' '}{lang === 'pt' ? 'Usados' : 'Used'}: {usedExtra}/{extraASIPool}
          </div>
          {SRD.ABILITIES.filter(a => a !== 'cha').map(k => {
            const expected = (race && race.asi[k]) || 0;
            const extra = Math.max(0, (char.raceBonus[k] || 0) - expected);
            return (
              <div key={k} className="row gap-3" style={{ padding: '6px 0' }}>
                <span style={{ flex: 1, fontFamily: 'var(--display)', fontSize: '0.85rem' }}>{t(k, lang)}</span>
                <NumStepper
                  value={extra}
                  onChange={(v) => adjustBonus(k, v - extra)}
                  min={0}
                  max={Math.min(1, extraASIPool - usedExtra + extra)}
                />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

// 5. Background
const StepBackground = ({ char, set, lang }) => (
  <div>
    <h2>{t('chooseBackground', lang)}</h2>
    <Filigree />
    <div className="options-list cols-2">
      {SRD.BACKGROUNDS.map(b => {
        const isSel = char.background === b.id;
        return (
          <button key={b.id} className={`option ${isSel ? 'selected' : ''}`} onClick={() => set({ background: b.id })}>
            <div className="option-title">{tName('background', b.id, lang)}</div>
            <div className="option-meta">
              <span>{t('skills', lang)}: {b.skills.map(s => tName('skill', s, lang)).join(', ')}</span>
            </div>
            <div className="text-xs muted" style={{ marginTop: 4 }}>{b.equipment[lang]}</div>
          </button>
        );
      })}
    </div>
  </div>
);

// 6. Skills
const StepSkills = ({ char, set, lang }) => {
  const cls = SRD.CLASSES.find(c => c.id === char.className);
  const bg = SRD.BACKGROUNDS.find(b => b.id === char.background);
  const bgSkills = bg ? bg.skills : [];
  const allowed = cls ? cls.skillsFrom : SRD.SKILLS.map(s => s.id);
  const limit = cls ? cls.skillCount : 0;

  const classSelected = char.skillProfs.filter(s => !bgSkills.includes(s));
  const remaining = limit - classSelected.length;

  const toggle = (id) => {
    if (bgSkills.includes(id)) return; // can't unselect bg
    if (!allowed.includes(id)) return;
    const has = char.skillProfs.includes(id);
    if (has) {
      set({ skillProfs: char.skillProfs.filter(s => s !== id) });
    } else if (remaining > 0) {
      set({ skillProfs: [...char.skillProfs, id] });
    }
  };

  // Ensure bg skills always in profs
  useEffect(() => {
    if (bg && bg.skills.some(s => !char.skillProfs.includes(s))) {
      set({ skillProfs: Array.from(new Set([...char.skillProfs, ...bg.skills])) });
    }
  }, [char.background]);

  return (
    <div>
      <h2>{t('chooseSkills', lang)}</h2>
      <div className="text-sm muted" style={{ marginBottom: 8 }}>
        {t('chooseSkillsSub', lang)} {limit} {t('fromClass', lang)} ({remaining} {lang === 'pt' ? 'restantes' : 'left'})
      </div>
      <Filigree />
      <div className="skill-list">
        {SRD.SKILLS.map(s => {
          const fromBg = bgSkills.includes(s.id);
          const fromClass = char.skillProfs.includes(s.id) && !fromBg;
          const isSelected = fromBg || fromClass;
          const isAllowed = allowed.includes(s.id) || fromBg;
          const disabled = !isAllowed || (fromBg);
          return (
            <div
              key={s.id}
              className={`skill-row ${isSelected ? 'selected' : ''} ${!isAllowed ? 'disabled' : ''}`}
              onClick={() => !disabled && toggle(s.id)}
            >
              <div className="skill-check">
                {isSelected && <Icon name="check" size={14}/>}
              </div>
              <span>{tName('skill', s.id, lang)}</span>
              <span className="skill-stat">{t(s.stat + 'Sh', lang)}{fromBg ? ' · BG' : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 7. Equipment
const StepEquipment = ({ char, set, lang }) => {
  const allArmor = SRD.ARMOR.filter(a => a.type !== 'shield');
  const cls = SRD.CLASSES.find(c => c.id === char.className);

  const addWeapon = (id) => {
    const w = SRD.WEAPONS.find(x => x.id === id);
    if (!w) return;
    set({
      weapons: [...(char.weapons || []), {
        id: w.id,
        name: tName('weapon', w.id, lang),
        damage: w.damage,
        dmgType: w.dmgType,
        props: w.props,
      }]
    });
  };

  const removeWeapon = (idx) => {
    set({ weapons: char.weapons.filter((_, i) => i !== idx) });
  };

  const addCustomWeapon = () => {
    set({
      weapons: [...(char.weapons || []), {
        id: '', name: lang === 'pt' ? 'Arma personalizada' : 'Custom weapon',
        damage: '1d6', dmgType: '', props: []
      }]
    });
  };

  const updateWeapon = (idx, patch) => {
    set({ weapons: char.weapons.map((w, i) => i === idx ? { ...w, ...patch } : w) });
  };

  const addEquipment = () => {
    set({ equipment: [...(char.equipment || []), { name: '', qty: 1 }] });
  };

  const updateEq = (idx, patch) => {
    set({ equipment: char.equipment.map((e, i) => i === idx ? { ...e, ...patch } : e) });
  };

  const removeEq = (idx) => {
    set({ equipment: char.equipment.filter((_, i) => i !== idx) });
  };

  return (
    <div>
      <h2>{t('stepEquipment', lang)}</h2>
      <Filigree />

      <h4 style={{ marginBottom: 8 }}>{t('armorChoice', lang)}</h4>
      <select value={char.armor || ''} onChange={e => set({ armor: e.target.value || null })} style={{ marginBottom: 12 }}>
        <option value="">{t('noArmor', lang)}</option>
        {allArmor.map(a => (
          <option key={a.id} value={a.id}>
            {tName('armor', a.id, lang)} ({t('ac', lang)} {a.ac}, {a.type})
          </option>
        ))}
      </select>
      <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 16 }}>
        <input
          type="checkbox" id="shield" checked={char.hasShield}
          onChange={e => set({ hasShield: e.target.checked })}
          style={{ width: 'auto', minHeight: 'auto' }}
        />
        <label htmlFor="shield" style={{ margin: 0, cursor: 'pointer' }}>{t('shield', lang)} (+2 {t('ac', lang)})</label>
      </div>

      <h4 style={{ marginBottom: 8 }}>{t('weapons', lang)}</h4>
      <div style={{ marginBottom: 12 }}>
        <select value="" onChange={e => { if (e.target.value) addWeapon(e.target.value); e.target.value = ''; }}>
          <option value="">{t('addWeapon', lang)}...</option>
          <optgroup label={lang === 'pt' ? 'Simples — Corpo a corpo' : 'Simple — Melee'}>
            {SRD.WEAPONS.filter(w => w.type === 'simple-melee').map(w =>
              <option key={w.id} value={w.id}>{tName('weapon', w.id, lang)} ({w.damage} {w.dmgType})</option>
            )}
          </optgroup>
          <optgroup label={lang === 'pt' ? 'Simples — Distância' : 'Simple — Ranged'}>
            {SRD.WEAPONS.filter(w => w.type === 'simple-ranged').map(w =>
              <option key={w.id} value={w.id}>{tName('weapon', w.id, lang)} ({w.damage} {w.dmgType})</option>
            )}
          </optgroup>
          <optgroup label={lang === 'pt' ? 'Marcial — Corpo a corpo' : 'Martial — Melee'}>
            {SRD.WEAPONS.filter(w => w.type === 'martial-melee').map(w =>
              <option key={w.id} value={w.id}>{tName('weapon', w.id, lang)} ({w.damage} {w.dmgType})</option>
            )}
          </optgroup>
          <optgroup label={lang === 'pt' ? 'Marcial — Distância' : 'Martial — Ranged'}>
            {SRD.WEAPONS.filter(w => w.type === 'martial-ranged').map(w =>
              <option key={w.id} value={w.id}>{tName('weapon', w.id, lang)} ({w.damage} {w.dmgType})</option>
            )}
          </optgroup>
        </select>
      </div>
      {(char.weapons || []).map((w, i) => (
        <div key={i} className="inv-row">
          <input value={w.name} onChange={e => updateWeapon(i, { name: e.target.value })} />
          <input value={w.damage} onChange={e => updateWeapon(i, { damage: e.target.value })} style={{ width: 100 }} placeholder="1d8" />
          <button className="btn btn-icon btn-ghost btn-danger" onClick={() => removeWeapon(i)}><Icon name="trash" size={14}/></button>
        </div>
      ))}
      <button className="btn btn-sm btn-ghost" onClick={addCustomWeapon} style={{ marginTop: 4 }}>
        <Icon name="plus" size={14}/> {lang === 'pt' ? 'Arma personalizada' : 'Custom weapon'}
      </button>

      <h4 style={{ marginBottom: 8, marginTop: 24 }}>{t('equipmentList', lang)}</h4>
      {(char.equipment || []).map((e, i) => (
        <div key={i} className="inv-row">
          <input value={e.name} onChange={ev => updateEq(i, { name: ev.target.value })} placeholder={lang === 'pt' ? 'Item' : 'Item'} />
          <input className="inv-qty" type="number" value={e.qty} onChange={ev => updateEq(i, { qty: +ev.target.value || 1 })} min="0" />
          <button className="btn btn-icon btn-ghost btn-danger" onClick={() => removeEq(i)}><Icon name="trash" size={14}/></button>
        </div>
      ))}
      <button className="btn btn-sm btn-ghost" onClick={addEquipment} style={{ marginTop: 4 }}>
        <Icon name="plus" size={14}/> {t('addItem', lang)}
      </button>

      <h4 style={{ marginBottom: 8, marginTop: 24 }}>{t('coins', lang)}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {['cp', 'sp', 'ep', 'gp', 'pp'].map(c => (
          <div key={c}>
            <label>{tName('coin', c, lang)}</label>
            <input
              type="number" min="0"
              value={char.coins[c]}
              onChange={e => set({ coins: { ...char.coins, [c]: +e.target.value || 0 } })}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// 8. Spells
const StepSpells = ({ char, set, lang }) => {
  const cls = SRD.CLASSES.find(c => c.id === char.className);
  if (!cls || !cls.spellcaster) {
    return (
      <div>
        <h2>{t('stepSpells', lang)}</h2>
        <Filigree />
        <div className="card text-center" style={{ padding: 'var(--s-7)' }}>
          <Icon name="sparkle" size={36} style={{ color: 'var(--gold-deep)', marginBottom: 12 }}/>
          <p className="muted">{t('notSpellcaster', lang)}</p>
        </div>
      </div>
    );
  }
  const available = SRD.SPELLS.filter(s => s.classes.includes(char.className));
  const cantrips = available.filter(s => s.level === 0);
  const level1 = available.filter(s => s.level === 1);
  const level2 = available.filter(s => s.level === 2);
  const level3 = available.filter(s => s.level === 3);
  const level4 = available.filter(s => s.level === 4);
  const level5 = available.filter(s => s.level === 5);
  const level6 = available.filter(s => s.level === 6);
  const level7Plus = available.filter(s => s.level >= 7);

  const toggle = (id) => {
    const has = char.spells.find(s => s.id === id);
    if (has) {
      set({ spells: char.spells.filter(s => s.id !== id) });
    } else {
      set({ spells: [...(char.spells || []), { id, prepared: true }] });
    }
  };

  const SpellGroup = ({ label, list }) => (
    <>
      <h4 style={{ marginTop: 20, marginBottom: 8 }}>{label}</h4>
      <div className="options-list">
        {list.map(sp => {
          const sel = char.spells.some(s => s.id === sp.id);
          return (
            <div key={sp.id} className={`option ${sel ? 'selected' : ''}`} onClick={() => toggle(sp.id)}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div className="skill-check" style={{ marginTop: 2 }}>
                  {sel && <Icon name="check" size={14}/>}
                </div>
                <div style={{ flex: 1, marginLeft: 8 }}>
                  <div className="option-title" style={{ fontSize: '1rem' }}>{tName('spellName', sp.id, lang)}</div>
                  <div className="spell-meta">
                    <span>{tName('school', sp.school, lang)}</span>
                    <span>{sp.castingTime}</span>
                    <span>{sp.range}</span>
                  </div>
                  <div className="text-sm" style={{ color: 'var(--ink-secondary)', marginTop: 6 }}>
                    {sp.desc[lang]}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div>
      <h2>{t('chooseSpells', lang)}</h2>
      <Filigree>{tName('class', char.className, lang)}</Filigree>
      <SpellGroup label={t('cantrips', lang)} list={cantrips} />
      <SpellGroup label={`${t('spellLevel', lang)} 1`} list={level1} />
      {char.level >= 3 && level2.length > 0 && <SpellGroup label={`${t('spellLevel', lang)} 2`} list={level2} />}
      {char.level >= 5 && level3.length > 0 && <SpellGroup label={`${t('spellLevel', lang)} 3`} list={level3} />}
      {char.level >= 7 && level4.length > 0 && <SpellGroup label={`${t('spellLevel', lang)} 4`} list={level4} />}
      {char.level >= 9 && level5.length > 0 && <SpellGroup label={`${t('spellLevel', lang)} 5`} list={level5} />}
      {char.level >= 11 && level6.length > 0 && <SpellGroup label={`${t('spellLevel', lang)} 6`} list={level6} />}
      {char.level >= 13 && level7Plus.length > 0 && <SpellGroup label={`${t('spellLevel', lang)} 7+`} list={level7Plus} />}
    </div>
  );
};

// 9. Story
const StepStory = ({ char, set, lang }) => (
  <div>
    <h2>{t('stepStory', lang)}</h2>
    <Filigree />
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <label>{t('personality', lang)}</label>
        <textarea value={char.personality} onChange={e => set({ personality: e.target.value })} />
      </div>
      <div>
        <label>{t('ideals', lang)}</label>
        <textarea value={char.ideals} onChange={e => set({ ideals: e.target.value })} />
      </div>
      <div>
        <label>{t('bonds', lang)}</label>
        <textarea value={char.bonds} onChange={e => set({ bonds: e.target.value })} />
      </div>
      <div>
        <label>{t('flaws', lang)}</label>
        <textarea value={char.flaws} onChange={e => set({ flaws: e.target.value })} />
      </div>
      <div>
        <label>{t('backstory', lang)}</label>
        <textarea value={char.backstory} onChange={e => set({ backstory: e.target.value })} style={{ minHeight: 120 }} />
      </div>
      <div>
        <label>{t('appearance', lang)}</label>
        <textarea value={char.appearance} onChange={e => set({ appearance: e.target.value })} />
      </div>
      <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 100px' }}>
          <label>{t('age', lang)}</label>
          <input value={char.age} onChange={e => set({ age: e.target.value })} />
        </div>
        <div style={{ flex: '1 1 100px' }}>
          <label>{t('height', lang)}</label>
          <input value={char.height} onChange={e => set({ height: e.target.value })} />
        </div>
        <div style={{ flex: '1 1 100px' }}>
          <label>{t('weight', lang)}</label>
          <input value={char.weight} onChange={e => set({ weight: e.target.value })} />
        </div>
      </div>
      <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 100px' }}>
          <label>{t('eyes', lang)}</label>
          <input value={char.eyes} onChange={e => set({ eyes: e.target.value })} />
        </div>
        <div style={{ flex: '1 1 100px' }}>
          <label>{t('skin', lang)}</label>
          <input value={char.skin} onChange={e => set({ skin: e.target.value })} />
        </div>
        <div style={{ flex: '1 1 100px' }}>
          <label>{t('hair', lang)}</label>
          <input value={char.hair} onChange={e => set({ hair: e.target.value })} />
        </div>
      </div>
      <div>
        <label>{t('allies', lang)}</label>
        <textarea value={char.allies} onChange={e => set({ allies: e.target.value })} />
      </div>
      <div>
        <label>{t('treasure', lang)}</label>
        <textarea value={char.treasure} onChange={e => set({ treasure: e.target.value })} />
      </div>
      <div>
        <label>{t('symbol', lang)}</label>
        <input value={char.symbol} onChange={e => set({ symbol: e.target.value })} placeholder={lang === 'pt' ? 'Brasão, símbolo sagrado, etc.' : 'Crest, holy symbol, etc.'} />
      </div>
    </div>
  </div>
);

// === Creator orchestrator ===
const Creator = ({ lang, initial, onSave, onCancel }) => {
  const [step, setStep] = useState(0);
  const [char, setChar] = useState(() => initial || Utils.makeNew());

  const set = useCallback((patch) => setChar(prev => ({ ...prev, ...patch })), []);

  // When class/level/race change, recompute defaults
  useEffect(() => {
    if (char.className) {
      const maxHp = Utils.maxHpDefault(char);
      if (!char.maxHp || char.maxHp < 1) {
        setChar(prev => ({ ...prev, maxHp, currentHp: maxHp }));
      }
    }
  }, [char.className, char.level, char.abilities, char.raceBonus]);

  const steps = [
    { id: 'identity', label: t('stepIdentity', lang), comp: StepIdentity, valid: () => !!char.name },
    { id: 'race', label: t('stepRace', lang), comp: StepRace, valid: () => !!char.race },
    { id: 'class', label: t('stepClass', lang), comp: StepClass, valid: () => !!char.className },
    { id: 'abilities', label: t('stepAbilities', lang), comp: StepAbilities, valid: () => true },
    { id: 'background', label: t('stepBackground', lang), comp: StepBackground, valid: () => !!char.background },
    { id: 'skills', label: t('stepSkills', lang), comp: StepSkills, valid: () => true },
    { id: 'equipment', label: t('stepEquipment', lang), comp: StepEquipment, valid: () => true },
    { id: 'spells', label: t('stepSpells', lang), comp: StepSpells, valid: () => true },
    { id: 'story', label: t('stepStory', lang), comp: StepStory, valid: () => true },
  ];

  const Cur = steps[step].comp;
  const canNext = steps[step].valid();
  const isLast = step === steps.length - 1;

  const handleFinish = () => {
    const maxHp = Utils.maxHpDefault(char);
    const final = { ...char, maxHp, currentHp: char.currentHp || maxHp };
    onSave(final);
  };

  return (
    <>
      <div className="wizard no-print">
        <div className="wizard-progress">
          {steps.map((s, i) => (
            <div key={s.id} className={`wizard-step ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>
        <div className="wizard-meta">
          <div className="eyebrow">{steps[step].label}</div>
          <div className="mono text-xs">{t('step', lang)} {step + 1} {t('of', lang)} {steps.length}</div>
        </div>
      </div>

      <Cur char={char} set={set} lang={lang} />

      <div className="wizard-footer no-print">
        <div className="wizard-footer-inner">
          <button className="btn btn-ghost" onClick={step === 0 ? onCancel : () => setStep(step - 1)}>
            <Icon name="chevron-left" size={16}/>
            {step === 0 ? t('cancel', lang) : t('back', lang)}
          </button>
          <button
            className="btn btn-primary"
            onClick={isLast ? handleFinish : () => setStep(step + 1)}
            disabled={!canNext}
          >
            {isLast ? t('finish', lang) : t('next', lang)}
            {!isLast && <Icon name="chevron-right" size={16}/>}
            {isLast && <Icon name="check" size={16}/>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Creator;
