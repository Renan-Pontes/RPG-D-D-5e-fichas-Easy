/* Print sheet — multi-page, parchment-styled, faithful to classic 5e layout */
import SRD from '../data/srd.js';
import Utils from '../utils.js';
import { t, tName } from '../data/i18n.js';
import Icon from './Icons.jsx';
import { Filigree } from './Shared.jsx';

const PrintSheet = ({ char, lang }) => {
  const cls = SRD.CLASSES.find(c => c.id === char.className);
  const race = SRD.RACES.find(r => r.id === char.race);
  const bg = SRD.BACKGROUNDS.find(b => b.id === char.background);

  const ac = Utils.computeAc(char);
  const initBonus = Utils.abilityMod(char, 'dex');
  const speed = Utils.speed(char);
  const profB = Utils.profBonus(char);
  const passPerc = Utils.passivePerception(char);
  const spellAb = Utils.spellcastingAbility(char);
  const spellDc = Utils.spellSaveDc(char);
  const spellAtk = Utils.spellAttackBonus(char);
  const slots = Utils.spellSlots(char);
  const hitDie = cls ? `d${cls.hitDie}` : '—';

  const PS_Header = ({ subtitle }) => (
    <div className="ps-page-header">
      <div className="ps-corner ps-corner-tl"/>
      <div className="ps-corner ps-corner-tr"/>
      <div className="ps-title-block">
        <div className="ps-title">{char.name || (lang === 'pt' ? 'Sem nome' : 'Unnamed')}</div>
        <div className="ps-flourish">✦ ❖ ✦</div>
        <div className="ps-subtitle">
          {race ? tName('race', race.id, lang) : '—'}
          {cls ? ` · ${tName('class', cls.id, lang)} ${char.level}` : ''}
          {bg ? ` · ${tName('background', bg.id, lang)}` : ''}
        </div>
        {subtitle && <div className="ps-page-subtitle">{subtitle}</div>}
      </div>
    </div>
  );

  return (
    <div className="ps-sheet">

      {/* ============ PAGE 1 — CORE ============ */}
      <div className="ps-page">
        <PS_Header />

        {/* Meta strip */}
        <div className="ps-meta-strip">
          <div className="ps-meta-cell">
            <label>{lang === 'pt' ? 'Jogador' : 'Player'}</label>
            <span>{char.player || '—'}</span>
          </div>
          <div className="ps-meta-cell">
            <label>{lang === 'pt' ? 'Alinhamento' : 'Alignment'}</label>
            <span>{char.alignment ? tName('alignment', char.alignment, lang) : '—'}</span>
          </div>
          <div className="ps-meta-cell">
            <label>XP</label>
            <span>{char.xp || 0}</span>
          </div>
          <div className="ps-meta-cell">
            <label>{lang === 'pt' ? 'Dado de Vida' : 'Hit Die'}</label>
            <span>{hitDie}</span>
          </div>
          <div className="ps-meta-cell">
            <label>{lang === 'pt' ? 'Prof.' : 'Prof.'}</label>
            <span>{Utils.fmtMod(profB)}</span>
          </div>
          <div className="ps-meta-cell">
            <label>{lang === 'pt' ? 'Inspiração' : 'Inspiration'}</label>
            <span className="ps-bubble">{char.inspiration ? '★' : '○'}</span>
          </div>
        </div>

        {/* Main 3-column grid */}
        <div className="ps-main-grid">

          {/* LEFT — Abilities + Saves */}
          <div className="ps-col-left">
            <div className="ps-abilities">
              {SRD.ABILITIES.map(k => {
                const score = Utils.abilityWithRace(char, k);
                const mod = Utils.abilityMod(char, k);
                return (
                  <div key={k} className="ps-ability">
                    <div className="ps-ability-name">{t(k, lang)}</div>
                    <div className="ps-ability-mod">{Utils.fmtMod(mod)}</div>
                    <div className="ps-ability-score">{score}</div>
                  </div>
                );
              })}
            </div>

            <div className="ps-card">
              <div className="ps-card-title">{lang === 'pt' ? 'Salvamentos' : 'Saving Throws'}</div>
              <div className="ps-list">
                {SRD.ABILITIES.map(k => {
                  const bonus = Utils.saveBonus(char, k);
                  const isProf = (char.saveProfs || []).includes(k);
                  return (
                    <div key={k} className="ps-row">
                      <span className={`ps-dot ${isProf ? 'on' : ''}`}/>
                      <span className="ps-row-mod">{Utils.fmtMod(bonus)}</span>
                      <span className="ps-row-name">{t(k, lang)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ps-card">
              <div className="ps-card-title">{lang === 'pt' ? 'Sentidos' : 'Senses'}</div>
              <div className="ps-senses">
                <div className="ps-sense-row">
                  <span className="ps-sense-num">{passPerc}</span>
                  <span className="ps-sense-name">{lang === 'pt' ? 'Percepção Passiva' : 'Passive Perception'}</span>
                </div>
                <div className="ps-sense-row">
                  <span className="ps-sense-num">{10 + Utils.skillBonus(char, 'investigation')}</span>
                  <span className="ps-sense-name">{lang === 'pt' ? 'Investigação Passiva' : 'Passive Investigation'}</span>
                </div>
                <div className="ps-sense-row">
                  <span className="ps-sense-num">{10 + Utils.skillBonus(char, 'insight')}</span>
                  <span className="ps-sense-name">{lang === 'pt' ? 'Intuição Passiva' : 'Passive Insight'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE — Skills */}
          <div className="ps-col-mid">
            <div className="ps-card ps-card-tall">
              <div className="ps-card-title">{t('skills', lang)}</div>
              <div className="ps-list">
                {SRD.SKILLS.map(s => {
                  const bonus = Utils.skillBonus(char, s.id);
                  const isProf = (char.skillProfs || []).includes(s.id);
                  const isExpert = (char.skillExpertise || []).includes(s.id);
                  return (
                    <div key={s.id} className="ps-row">
                      <span className={`ps-dot ${isExpert ? 'expert' : isProf ? 'on' : ''}`}/>
                      <span className="ps-row-mod">{Utils.fmtMod(bonus)}</span>
                      <span className="ps-row-name">
                        {tName('skill', s.id, lang)}
                        <em className="ps-row-stat">{t(s.stat + 'Sh', lang)}</em>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT — Combat */}
          <div className="ps-col-right">
            <div className="ps-combat-grid">
              <div className="ps-stat-box ps-shield">
                <div className="ps-stat-num">{ac}</div>
                <div className="ps-stat-label">{t('ac', lang)}</div>
              </div>
              <div className="ps-stat-box">
                <div className="ps-stat-num">{Utils.fmtMod(initBonus)}</div>
                <div className="ps-stat-label">{t('initiative', lang)}</div>
              </div>
              <div className="ps-stat-box">
                <div className="ps-stat-num">{speed}</div>
                <div className="ps-stat-label">{t('speed', lang)}</div>
              </div>
            </div>

            <div className="ps-hp-card">
              <div className="ps-hp-header">
                <span className="ps-hp-title">{lang === 'pt' ? 'Pontos de Vida' : 'Hit Points'}</span>
                <span className="ps-hp-max">{lang === 'pt' ? 'Máx' : 'Max'} {char.maxHp}</span>
              </div>
              <div className="ps-hp-current">
                <div className="ps-hp-num">{char.currentHp}</div>
              </div>
              <div className="ps-hp-temp">
                <label>{lang === 'pt' ? 'HP Temp.' : 'Temp HP'}</label>
                <span>{char.tempHp || 0}</span>
              </div>
            </div>

            <div className="ps-card">
              <div className="ps-card-title">{lang === 'pt' ? 'Testes contra Morte' : 'Death Saves'}</div>
              <div className="ps-deathsaves">
                <div className="ps-deathsave-row">
                  <span className="ps-deathsave-label">{lang === 'pt' ? 'Sucessos' : 'Successes'}</span>
                  <span className="ps-deathsave-circles">○ ○ ○</span>
                </div>
                <div className="ps-deathsave-row">
                  <span className="ps-deathsave-label">{lang === 'pt' ? 'Falhas' : 'Failures'}</span>
                  <span className="ps-deathsave-circles">○ ○ ○</span>
                </div>
              </div>
            </div>

            <div className="ps-card">
              <div className="ps-card-title">{lang === 'pt' ? 'Dados de Vida' : 'Hit Dice'}</div>
              <div className="ps-hitdice">
                <div className="ps-hitdice-total">{char.level}{hitDie}</div>
                <div className="ps-hitdice-circles">
                  {Array.from({ length: Math.min(char.level, 20) }).map((_, i) => (
                    <span key={i} className="ps-hitdice-circle">○</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attacks */}
        {char.weapons && char.weapons.length > 0 && (
          <div className="ps-section">
            <div className="ps-section-title">{lang === 'pt' ? 'Ataques & Conjurações' : 'Attacks & Spellcasting'}</div>
            <table className="ps-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>{lang === 'pt' ? 'Arma' : 'Weapon'}</th>
                  <th>{lang === 'pt' ? 'Bônus' : 'Atk'}</th>
                  <th>{lang === 'pt' ? 'Dano' : 'Damage'}</th>
                  <th>{lang === 'pt' ? 'Propriedades' : 'Properties'}</th>
                </tr>
              </thead>
              <tbody>
                {char.weapons.map((w, i) => {
                  const wDef = w.id ? SRD.WEAPONS.find(x => x.id === w.id) : null;
                  const isFinesse = wDef && wDef.props && wDef.props.includes('finesse');
                  const isRanged = wDef && (wDef.type || '').includes('ranged');
                  const useDex = isRanged || (isFinesse && Utils.abilityMod(char, 'dex') > Utils.abilityMod(char, 'str'));
                  const abMod = Utils.abilityMod(char, useDex ? 'dex' : 'str');
                  const atk = abMod + Utils.profBonus(char);
                  return (
                    <tr key={i}>
                      <td><strong>{w.name}</strong></td>
                      <td>{Utils.fmtMod(atk)}</td>
                      <td>{w.damage}{abMod !== 0 ? ` ${abMod >= 0 ? '+' : ''}${abMod}` : ''} {w.dmgType}</td>
                      <td>{wDef && wDef.props ? wDef.props.join(', ') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer: profs */}
        <div className="ps-section">
          <div className="ps-section-title">{lang === 'pt' ? 'Idiomas & Proficiências' : 'Languages & Proficiencies'}</div>
          <div className="ps-prof-grid">
            <div>
              <strong>{t('languages', lang)}:</strong> {(char.languages || []).join(', ') || '—'}
            </div>
            {cls && (
              <>
                <div>
                  <strong>{lang === 'pt' ? 'Armaduras' : 'Armor'}:</strong> {cls.armor.join(', ') || '—'}
                </div>
                <div>
                  <strong>{lang === 'pt' ? 'Armas' : 'Weapons'}:</strong> {cls.weapons.join(', ')}
                </div>
              </>
            )}
            {char.otherProfs && (
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>{lang === 'pt' ? 'Ferramentas' : 'Tools'}:</strong> {char.otherProfs}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ PAGE 2 — EQUIPMENT & FEATURES ============ */}
      <div className="ps-page">
        <PS_Header subtitle={lang === 'pt' ? 'Equipamento & Habilidades' : 'Equipment & Features'} />

        <div className="ps-two-col">
          <div>
            <div className="ps-section">
              <div className="ps-section-title">{lang === 'pt' ? 'Armadura Equipada' : 'Equipped Armor'}</div>
              <div className="ps-equipped">
                <div className="ps-equipped-row">
                  <span className="ps-equipped-label">{t('armorChoice', lang)}</span>
                  <span>{char.armor ? tName('armor', char.armor, lang) : (lang === 'pt' ? 'Nenhuma' : 'None')}</span>
                </div>
                <div className="ps-equipped-row">
                  <span className="ps-equipped-label">{t('shield', lang)}</span>
                  <span>{char.hasShield ? '✓' : '—'}</span>
                </div>
              </div>
            </div>

            <div className="ps-section">
              <div className="ps-section-title">{t('equipmentList', lang)}</div>
              <ul className="ps-equipment-list">
                {(char.equipment || []).map((e, i) => (
                  <li key={i}>
                    <span className="ps-eq-qty">{e.qty > 1 ? `${e.qty}×` : '·'}</span>
                    <span>{e.name}</span>
                  </li>
                ))}
                {(!char.equipment || char.equipment.length === 0) && (
                  <li className="ps-empty">{lang === 'pt' ? '— vazio —' : '— empty —'}</li>
                )}
              </ul>
            </div>

            <div className="ps-section">
              <div className="ps-section-title">{t('coins', lang)}</div>
              <div className="ps-coins">
                {['cp','sp','ep','gp','pp'].map(c => (
                  <div key={c} className="ps-coin">
                    <span className="ps-coin-label">{tName('coin', c, lang)}</span>
                    <span className="ps-coin-num">{char.coins?.[c] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            {cls && (
              <div className="ps-section">
                <div className="ps-section-title">{lang === 'pt' ? 'Características de Classe' : 'Class Features'}</div>
                {cls.features.map((f, i) => (
                  <div key={i} className="ps-feature">
                    <strong>{f.name[lang]}.</strong> {f.desc[lang]}
                  </div>
                ))}
              </div>
            )}

            {race && (
              <div className="ps-section">
                <div className="ps-section-title">{lang === 'pt' ? 'Traços Raciais' : 'Racial Traits'}</div>
                {race.traits.map((tr, i) => (
                  <div key={i} className="ps-feature">
                    <strong>{tr.name[lang]}.</strong> {tr.desc[lang]}
                  </div>
                ))}
              </div>
            )}

            {(char.personality || char.ideals || char.bonds || char.flaws) && (
              <div className="ps-section">
                <div className="ps-section-title">{lang === 'pt' ? 'Personalidade' : 'Personality'}</div>
                {char.personality && <div className="ps-feature"><strong>{t('personality', lang)}.</strong> {char.personality}</div>}
                {char.ideals && <div className="ps-feature"><strong>{t('ideals', lang)}.</strong> {char.ideals}</div>}
                {char.bonds && <div className="ps-feature"><strong>{t('bonds', lang)}.</strong> {char.bonds}</div>}
                {char.flaws && <div className="ps-feature"><strong>{t('flaws', lang)}.</strong> {char.flaws}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ PAGE 3 — SPELLS ============ */}
      {cls && cls.spellcaster && (
        <div className="ps-page">
          <PS_Header subtitle={lang === 'pt' ? 'Grimório' : 'Spellbook'} />

          <div className="ps-spell-stats">
            <div className="ps-stat-box">
              <div className="ps-stat-num" style={{ fontSize: '1.4rem' }}>{spellAb ? t(spellAb, lang).slice(0, 3).toUpperCase() : '—'}</div>
              <div className="ps-stat-label">{t('spellAbility', lang)}</div>
            </div>
            <div className="ps-stat-box">
              <div className="ps-stat-num">{spellDc || '—'}</div>
              <div className="ps-stat-label">{t('spellSaveDc', lang)}</div>
            </div>
            <div className="ps-stat-box">
              <div className="ps-stat-num">{spellAtk !== null ? Utils.fmtMod(spellAtk) : '—'}</div>
              <div className="ps-stat-label">{t('spellAttack', lang)}</div>
            </div>
          </div>

          {slots && slots.length > 0 && slots.some(s => s) && (
            <div className="ps-section">
              <div className="ps-section-title">{t('slots', lang)}</div>
              <div className="ps-slots-grid">
                {slots.map((max, idx) => max ? (
                  <div key={idx} className="ps-slot-level">
                    <div className="ps-slot-num">{idx + 1}</div>
                    <div className="ps-slot-circles">
                      {Array.from({ length: max }).map((_, i) => (
                        <span key={i} className="ps-slot-circle">○</span>
                      ))}
                    </div>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {[0,1,2,3,4,5,6,7,8,9].map(lvl => {
            const list = (char.spells || []).map(cs => ({ ...cs, def: SRD.SPELLS.find(s => s.id === cs.id) })).filter(s => s.def && s.def.level === lvl);
            if (list.length === 0) return null;
            return (
              <div key={lvl} className="ps-section">
                <div className="ps-section-title">{lvl === 0 ? t('cantrips', lang) : `${t('spellLevel', lang)} ${lvl}`}</div>
                <div className="ps-spell-list-2col">
                {list.map(sp => (
                  <div key={sp.id} className="ps-spell-entry">
                    <div className="ps-spell-head">
                      <strong>{tName('spellName', sp.def.id, lang)}</strong>
                      <span className="ps-spell-meta">
                        {tName('school', sp.def.school, lang)} · {sp.def.castingTime} · {sp.def.range}
                        {sp.def.concentration ? ' · Conc.' : ''}
                      </span>
                    </div>
                    <div className="ps-spell-desc">{sp.def.desc[lang]}</div>
                  </div>
                ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ PAGE 4 — BACKSTORY ============ */}
      {(char.backstory || char.appearance || char.allies || char.treasure) && (
        <div className="ps-page">
          <PS_Header subtitle={lang === 'pt' ? 'Crônicas' : 'Chronicles'} />

          {(char.age || char.height || char.weight || char.eyes || char.skin || char.hair) && (
            <div className="ps-portrait-strip">
              {['age','height','weight','eyes','skin','hair'].filter(f => char[f]).map(f => (
                <div key={f} className="ps-portrait-cell">
                  <label>{t(f, lang)}</label>
                  <span>{char[f]}</span>
                </div>
              ))}
            </div>
          )}

          {char.appearance && (
            <div className="ps-section">
              <div className="ps-section-title">{t('appearance', lang)}</div>
              <div className="ps-narrative">{char.appearance}</div>
            </div>
          )}

          {char.backstory && (
            <div className="ps-section">
              <div className="ps-section-title">{t('backstory', lang)}</div>
              <div className="ps-narrative">{char.backstory}</div>
            </div>
          )}

          {char.allies && (
            <div className="ps-section">
              <div className="ps-section-title">{t('allies', lang)}</div>
              <div className="ps-narrative">{char.allies}</div>
            </div>
          )}

          {char.treasure && (
            <div className="ps-section">
              <div className="ps-section-title">{t('treasure', lang)}</div>
              <div className="ps-narrative">{char.treasure}</div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default PrintSheet;
