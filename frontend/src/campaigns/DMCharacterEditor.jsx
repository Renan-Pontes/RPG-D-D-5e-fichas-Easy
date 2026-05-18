import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_NAMES = {
  str: { pt: 'FOR', en: 'STR' },
  dex: { pt: 'DES', en: 'DEX' },
  con: { pt: 'CON', en: 'CON' },
  int: { pt: 'INT', en: 'INT' },
  wis: { pt: 'SAB', en: 'WIS' },
  cha: { pt: 'CAR', en: 'CHA' },
};

const SKILLS = [
  'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception',
  'history', 'insight', 'intimidation', 'investigation', 'medicine',
  'nature', 'perception', 'performance', 'persuasion', 'religion',
  'sleightOfHand', 'stealth', 'survival',
];

const CONDITIONS = [
  'blinded','charmed','deafened','frightened','grappled','incapacitated',
  'invisible','paralyzed','petrified','poisoned','prone','restrained',
  'stunned','unconscious','exhaustion',
];

// Slots por classe e nível (subset do PHB; usados como referência inicial)
function defaultSlotsFor(className, level) {
  const FULL = {
    1:  [2,0,0,0,0,0,0,0,0],
    2:  [3,0,0,0,0,0,0,0,0],
    3:  [4,2,0,0,0,0,0,0,0],
    4:  [4,3,0,0,0,0,0,0,0],
    5:  [4,3,2,0,0,0,0,0,0],
    6:  [4,3,3,0,0,0,0,0,0],
    7:  [4,3,3,1,0,0,0,0,0],
    8:  [4,3,3,2,0,0,0,0,0],
    9:  [4,3,3,3,1,0,0,0,0],
    10: [4,3,3,3,2,0,0,0,0],
    11: [4,3,3,3,2,1,0,0,0],
    12: [4,3,3,3,2,1,0,0,0],
    13: [4,3,3,3,2,1,1,0,0],
    14: [4,3,3,3,2,1,1,0,0],
    15: [4,3,3,3,2,1,1,1,0],
    16: [4,3,3,3,2,1,1,1,0],
    17: [4,3,3,3,2,1,1,1,1],
    18: [4,3,3,3,3,1,1,1,1],
    19: [4,3,3,3,3,2,1,1,1],
    20: [4,3,3,3,3,2,2,1,1],
  };
  const HALF = {  // paladin/ranger
    1: [0,0,0,0,0,0,0,0,0],
    2: [2,0,0,0,0,0,0,0,0],
    3: [3,0,0,0,0,0,0,0,0],
    4: [3,0,0,0,0,0,0,0,0],
    5: [4,2,0,0,0,0,0,0,0],
    6: [4,2,0,0,0,0,0,0,0],
    7: [4,3,0,0,0,0,0,0,0],
    8: [4,3,0,0,0,0,0,0,0],
    9: [4,3,2,0,0,0,0,0,0],
    10:[4,3,2,0,0,0,0,0,0],
    11:[4,3,3,0,0,0,0,0,0],
    12:[4,3,3,0,0,0,0,0,0],
    13:[4,3,3,1,0,0,0,0,0],
    14:[4,3,3,1,0,0,0,0,0],
    15:[4,3,3,2,0,0,0,0,0],
    16:[4,3,3,2,0,0,0,0,0],
    17:[4,3,3,3,1,0,0,0,0],
    18:[4,3,3,3,1,0,0,0,0],
    19:[4,3,3,3,2,0,0,0,0],
    20:[4,3,3,3,2,0,0,0,0],
  };
  const WARLOCK = {
    1: [1,0,0,0,0], 2: [2,0,0,0,0], 3: [0,2,0,0,0], 4: [0,2,0,0,0],
    5: [0,0,2,0,0], 6: [0,0,2,0,0], 7: [0,0,0,2,0], 8: [0,0,0,2,0],
    9: [0,0,0,0,2],10: [0,0,0,0,2],11: [0,0,0,0,3],12: [0,0,0,0,3],
    13:[0,0,0,0,3],14:[0,0,0,0,3],15:[0,0,0,0,3],16:[0,0,0,0,3],
    17:[0,0,0,0,4],18:[0,0,0,0,4],19:[0,0,0,0,4],20:[0,0,0,0,4],
  };
  const lvl = Math.max(1, Math.min(20, level || 1));
  if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].includes(className)) return FULL[lvl];
  if (['paladin', 'ranger'].includes(className)) return HALF[lvl];
  if (className === 'warlock') return WARLOCK[lvl];
  return [0,0,0,0,0,0,0,0,0];
}

/**
 * Modal pro mestre editar tudo da ficha do jogador.
 *
 * Recebe `character` (objeto remoto com id numérico e data inline) + `lang` +
 * `onSaved(newCharacter)` callback. Backend rota: PATCH /characters/:id/dm-edit
 *
 * Edita: nome, HP atual/máximo/temp, atributos, level, XP, alinhamento,
 * background, race, className, subclass, slots por nível (atuais + máximos),
 * condições toggle, moedas, notas, descrição, equipamento (lista).
 */
export default function DMCharacterEditor({ character, lang, onClose, onSaved }) {
  const [data, setData] = useState(() => ({ ...(character.data || {}) }));
  const [name, setName] = useState(character.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [section, setSection] = useState('vitals');

  const patch = useCallback((p) => setData(d => ({ ...d, ...p })), []);
  const patchAbility = (k, v) => setData(d => ({ ...d, abilities: { ...(d.abilities || {}), [k]: parseInt(v) || 0 } }));
  const patchCoin = (k, v) => setData(d => ({ ...d, coins: { ...(d.coins || {}), [k]: parseInt(v) || 0 } }));
  const toggleCondition = (cond) => {
    setData(d => {
      const cur = d.conditions || [];
      return { ...d, conditions: cur.includes(cond) ? cur.filter(x => x !== cond) : [...cur, cond] };
    });
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const res = await api.dmEditCharacter(character.id, { data, name });
      onSaved?.(res.character);
      onClose();
    } catch (e) {
      setError(e?.data?.error || e?.message || 'failed');
    } finally {
      setSaving(false);
    }
  };

  // Slots: usa spellSlotsUsed (array por nível) + maxSlots derivado
  const lvl = data.level || 1;
  const defaultMax = defaultSlotsFor(data.className, lvl);
  const used = data.spellSlotsUsed || [];
  const maxOverride = data.spellSlotsMax || null; // override opcional do mestre
  const slotMax = (i) => (maxOverride && Number.isFinite(maxOverride[i])) ? maxOverride[i] : (defaultMax[i] || 0);
  const slotAvail = (i) => Math.max(0, slotMax(i) - (used[i] || 0));
  const setUsedAt = (i, value) => {
    const arr = [...(used.length ? used : new Array(9).fill(0))];
    while (arr.length < 9) arr.push(0);
    arr[i] = Math.max(0, parseInt(value) || 0);
    patch({ spellSlotsUsed: arr });
  };
  const setMaxAt = (i, value) => {
    const arr = [...(maxOverride || defaultMax)];
    while (arr.length < 9) arr.push(0);
    arr[i] = Math.max(0, parseInt(value) || 0);
    patch({ spellSlotsMax: arr });
  };
  const resetSlotsToDefault = () => patch({ spellSlotsMax: null, spellSlotsUsed: [0,0,0,0,0,0,0,0,0] });
  const restoreAllSlots = () => patch({ spellSlotsUsed: [0,0,0,0,0,0,0,0,0] });

  return (
    <div className="modal-backdrop dm-editor-backdrop" onClick={onClose}>
      <div className="modal dm-editor-modal" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="dm-editor-title">
        <div className="dm-editor-head">
          <h2 id="dm-editor-title" style={{ margin: 0 }}>
            🛠 {t(lang, 'Editar ficha (modo mestre)', 'Edit sheet (DM mode)')}
            <span className="muted small" style={{ marginLeft: 8 }}>{name}</span>
          </h2>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <nav className="dm-editor-nav" role="tablist">
          {[
            { id: 'vitals', label: t(lang, 'Vitais & Status', 'Vitals & Status') },
            { id: 'abilities', label: t(lang, 'Atributos', 'Abilities') },
            { id: 'progression', label: t(lang, 'Progressão', 'Progression') },
            { id: 'spells', label: t(lang, 'Slots de magia', 'Spell slots') },
            { id: 'inventory', label: t(lang, 'Inventário & Moedas', 'Inventory & Coins') },
            { id: 'story', label: t(lang, 'Identidade', 'Identity') },
          ].map(s => (
            <button key={s.id} role="tab" aria-selected={section === s.id}
              className={`dm-editor-tab ${section === s.id ? 'active' : ''}`}
              onClick={() => setSection(s.id)}>{s.label}</button>
          ))}
        </nav>

        <div className="dm-editor-body">
          {section === 'vitals' && (
            <div className="col gap-3">
              <Section title={t(lang, 'Pontos de Vida', 'Hit Points')}>
                <NumInput label={t(lang, 'HP atual', 'Current HP')} value={data.currentHp} onChange={v => patch({ currentHp: v })} />
                <NumInput label={t(lang, 'HP máximo', 'Max HP')} value={data.maxHp} onChange={v => patch({ maxHp: v })} />
                <NumInput label={t(lang, 'HP temporário', 'Temp HP')} value={data.tempHp} onChange={v => patch({ tempHp: v })} />
                <NumInput label={t(lang, 'Dados de vida usados', 'Hit dice used')} value={data.hitDiceUsed} onChange={v => patch({ hitDiceUsed: v })} />
              </Section>

              <Section title={t(lang, 'Combate', 'Combat')}>
                <NumInput label={t(lang, 'CA bônus extra', 'Extra AC bonus')} value={data.extraAcBonus} onChange={v => patch({ extraAcBonus: v })} />
                <NumInput label={t(lang, 'Deslocamento override', 'Speed override')} value={data.speedOverride} onChange={v => patch({ speedOverride: v })} />
                <ToggleRow label={t(lang, 'Inspiração', 'Inspiration')} value={!!data.inspiration} onChange={v => patch({ inspiration: v })} />
                <ToggleRow label={t(lang, 'Escudo equipado', 'Shield equipped')} value={!!data.hasShield} onChange={v => patch({ hasShield: v })} />
              </Section>

              <Section title={t(lang, 'Salvamentos contra morte', 'Death saves')}>
                <NumInput label={t(lang, 'Sucessos', 'Successes')} value={data.deathSaves?.success} max={3}
                  onChange={v => patch({ deathSaves: { ...(data.deathSaves || {}), success: Math.max(0, Math.min(3, v)) } })} />
                <NumInput label={t(lang, 'Falhas', 'Failures')} value={data.deathSaves?.fail} max={3}
                  onChange={v => patch({ deathSaves: { ...(data.deathSaves || {}), fail: Math.max(0, Math.min(3, v)) } })} />
              </Section>

              <Section title={t(lang, 'Condições ativas', 'Active conditions')}>
                <div className="dm-condition-grid">
                  {CONDITIONS.map(cond => {
                    const on = (data.conditions || []).includes(cond);
                    return (
                      <button key={cond} type="button"
                        className={`dm-cond-chip ${on ? 'on' : ''}`}
                        onClick={() => toggleCondition(cond)}>
                        {cond}
                      </button>
                    );
                  })}
                </div>
              </Section>

              {data.wildShape?.active && (
                <Section title={t(lang, 'Wild Shape ativo', 'Wild Shape active')}>
                  <div className="muted">{t(lang, 'Fera:', 'Beast:')} <strong>{data.wildShape.beastName}</strong></div>
                  <NumInput label={t(lang, 'HP fera atual', 'Beast current HP')} value={data.wildShape.beastCurrentHp}
                    onChange={v => patch({ wildShape: { ...data.wildShape, beastCurrentHp: v } })} />
                  <NumInput label={t(lang, 'HP fera máximo', 'Beast max HP')} value={data.wildShape.beastMaxHp}
                    onChange={v => patch({ wildShape: { ...data.wildShape, beastMaxHp: v } })} />
                </Section>
              )}
            </div>
          )}

          {section === 'abilities' && (
            <div className="col gap-3">
              <Section title={t(lang, 'Atributos (score base)', 'Ability scores (base)')}>
                <div className="dm-abil-grid">
                  {ABILITIES.map(k => (
                    <div key={k} className="dm-abil-box">
                      <label htmlFor={`ab-${k}`}>{ABILITY_NAMES[k][lang]}</label>
                      <input id={`ab-${k}`} type="number" min={1} max={30}
                        value={(data.abilities || {})[k] ?? 10}
                        onChange={e => patchAbility(k, e.target.value)}
                        className="input" />
                      <span className="muted small">
                        {(() => { const s = (data.abilities||{})[k] ?? 10; const m = Math.floor((s-10)/2); return (m>=0?'+':'') + m; })()}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
              <Section title={t(lang, 'Perícias (com proficiência)', 'Skills (proficient)')}>
                <div className="dm-condition-grid">
                  {SKILLS.map(sk => {
                    const on = (data.skillProfs || []).includes(sk);
                    return (
                      <button key={sk} type="button"
                        className={`dm-cond-chip ${on ? 'on' : ''}`}
                        onClick={() => patch({ skillProfs: on ? data.skillProfs.filter(x => x !== sk) : [...(data.skillProfs || []), sk] })}>
                        {sk}
                      </button>
                    );
                  })}
                </div>
              </Section>
              <Section title={t(lang, 'Salvamentos com proficiência', 'Save proficiencies')}>
                <div className="dm-condition-grid">
                  {ABILITIES.map(ab => {
                    const on = (data.saveProfs || []).includes(ab);
                    return (
                      <button key={ab} type="button"
                        className={`dm-cond-chip ${on ? 'on' : ''}`}
                        onClick={() => patch({ saveProfs: on ? data.saveProfs.filter(x => x !== ab) : [...(data.saveProfs || []), ab] })}>
                        {ABILITY_NAMES[ab][lang]}
                      </button>
                    );
                  })}
                </div>
              </Section>
            </div>
          )}

          {section === 'progression' && (
            <div className="col gap-3">
              <Section title={t(lang, 'Nível & Experiência', 'Level & XP')}>
                <NumInput label={t(lang, 'Nível', 'Level')} value={data.level} min={1} max={20} onChange={v => patch({ level: Math.max(1, Math.min(20, v)) })} />
                <NumInput label="XP" value={data.xp} onChange={v => patch({ xp: v })} />
                <TextInput label={t(lang, 'Classe', 'Class')} value={data.className} onChange={v => patch({ className: v })} />
                <TextInput label={t(lang, 'Subclasse', 'Subclass')} value={data.subclass} onChange={v => patch({ subclass: v })} />
                <TextInput label={t(lang, 'Raça', 'Race')} value={data.race} onChange={v => patch({ race: v })} />
                <TextInput label={t(lang, 'Antecedente', 'Background')} value={data.background} onChange={v => patch({ background: v })} />
              </Section>
              <details className="dm-override-section">
                <summary>{t(lang, '⚠ Override (consertar inconsistências)', '⚠ Override (fix inconsistencies)')}</summary>
                <p className="muted small" style={{ margin: '8px 0' }}>
                  {t(lang,
                    'Fluxo normal: jogador solicita evolução → você libera na aba Aprovações → jogador clica "Subir nível" na ficha dele. Use este botão APENAS pra consertar fichas inconsistentes (não aplica HP automático).',
                    'Normal flow: player requests evolution → you unlock in Approvals tab → player clicks "Level up" on their sheet. Use this button ONLY to fix inconsistent sheets (does not auto-apply HP).')}
                </p>
                <button className="btn btn-ghost btn-sm"
                  disabled={(data.level || 1) >= 20}
                  onClick={() => patch({ level: Math.min(20, (data.level || 1) + 1) })}>
                  ⬆ {t(lang, 'Forçar subida +1', 'Force level up +1')}
                </button>
              </details>
            </div>
          )}

          {section === 'spells' && (
            <div className="col gap-3">
              <Section title={t(lang, 'Slots de magia por nível', 'Spell slots per level')}>
                <p className="muted small" style={{ marginTop: 0 }}>
                  {t(lang,
                    'Editar o máximo aplica override (substitui o automático). Marque "Restaurar tudo" pra zerar usados em descanso longo.',
                    'Edit max to override automatic. "Restore all" zeroes used slots (long rest).')}
                </p>
                <div className="dm-slots-table">
                  <div className="dm-slots-row dm-slots-header">
                    <div>{t(lang, 'Nível', 'Level')}</div>
                    <div>{t(lang, 'Usados', 'Used')}</div>
                    <div>{t(lang, 'Máximo', 'Max')}</div>
                    <div>{t(lang, 'Disponíveis', 'Available')}</div>
                  </div>
                  {[1,2,3,4,5,6,7,8,9].map(level => {
                    const i = level - 1;
                    return (
                      <div key={level} className="dm-slots-row">
                        <div className="dm-slots-level">{level}</div>
                        <input type="number" min={0} className="input"
                          value={used[i] || 0} onChange={e => setUsedAt(i, e.target.value)} />
                        <input type="number" min={0} className="input"
                          value={slotMax(i)} onChange={e => setMaxAt(i, e.target.value)} />
                        <div className={`dm-slots-avail ${slotAvail(i) === 0 ? 'zero' : ''}`}>{slotAvail(i)}/{slotMax(i)}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="row gap-2" style={{ marginTop: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={restoreAllSlots}>
                    🛌 {t(lang, 'Restaurar tudo (descanso longo)', 'Restore all (long rest)')}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={resetSlotsToDefault}>
                    {t(lang, 'Reverter pra auto', 'Reset to auto')}
                  </button>
                </div>
              </Section>
            </div>
          )}

          {section === 'inventory' && (
            <div className="col gap-3">
              <Section title={t(lang, 'Moedas', 'Coins')}>
                <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                  {['cp','sp','ep','gp','pp'].map(c => (
                    <NumInput key={c} label={c.toUpperCase()} value={(data.coins||{})[c]} onChange={v => patchCoin(c, v)} small />
                  ))}
                </div>
              </Section>
              <Section title={t(lang, 'Tesouro / notas', 'Treasure / notes')}>
                <textarea className="input" rows={4} value={data.treasure || ''} onChange={e => patch({ treasure: e.target.value })} />
              </Section>
              <Section title={t(lang, 'Equipamento (texto livre)', 'Equipment (free text)')}>
                <p className="muted small" style={{ marginTop: 0 }}>
                  {t(lang, 'Itens estruturados serão editados pelo painel próprio (item 4 do plano).', 'Structured items will be edited via the dedicated panel (plan item 4).')}
                </p>
                <textarea className="input" rows={6}
                  value={Array.isArray(data.equipment) ? data.equipment.map(it => typeof it === 'string' ? it : `${it.name || '?'}${it.qty ? ` ×${it.qty}` : ''}${it.broken ? ' (quebrado)' : ''}${it.notes ? ' — ' + it.notes : ''}`).join('\n') : (data.equipment || '')}
                  readOnly />
              </Section>
            </div>
          )}

          {section === 'story' && (
            <div className="col gap-3">
              <Section title={t(lang, 'Identidade', 'Identity')}>
                <TextInput label={t(lang, 'Nome do personagem', 'Character name')} value={name} onChange={setName} />
                <TextInput label={t(lang, 'Jogador', 'Player')} value={data.player} onChange={v => patch({ player: v })} />
                <TextInput label={t(lang, 'Alinhamento', 'Alignment')} value={data.alignment} onChange={v => patch({ alignment: v })} />
                <TextInput label={t(lang, 'Idade', 'Age')} value={data.age} onChange={v => patch({ age: v })} />
              </Section>
              <Section title={t(lang, 'Personalidade & Histórico', 'Personality & Backstory')}>
                <TextArea label={t(lang, 'Traços de personalidade', 'Personality traits')} value={data.personality} onChange={v => patch({ personality: v })} />
                <TextArea label={t(lang, 'Ideais', 'Ideals')} value={data.ideals} onChange={v => patch({ ideals: v })} />
                <TextArea label={t(lang, 'Vínculos', 'Bonds')} value={data.bonds} onChange={v => patch({ bonds: v })} />
                <TextArea label={t(lang, 'Defeitos', 'Flaws')} value={data.flaws} onChange={v => patch({ flaws: v })} />
                <TextArea label={t(lang, 'História', 'Backstory')} value={data.backstory} onChange={v => patch({ backstory: v })} />
                <TextArea label={t(lang, 'Aparência', 'Appearance')} value={data.appearance} onChange={v => patch({ appearance: v })} />
                <TextArea label={t(lang, 'Notas (jornal)', 'Notes (journal)')} value={data.notes} onChange={v => patch({ notes: v })} />
              </Section>
            </div>
          )}
        </div>

        <div className="dm-editor-foot">
          {error && <div className="auth-error" style={{ flex: 1, margin: 0 }}>{error}</div>}
          <button className="btn btn-ghost" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? '…' : t(lang, 'Salvar', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="dm-editor-section">
      <h4>{title}</h4>
      <div className="dm-editor-section-body">{children}</div>
    </div>
  );
}

function NumInput({ label, value, onChange, min = -999, max = 9999, small }) {
  return (
    <label className={`dm-num-field ${small ? 'small' : ''}`}>
      <span>{label}</span>
      <input type="number" className="input" min={min} max={max}
        value={value ?? 0} onChange={e => onChange(parseInt(e.target.value) || 0)} />
    </label>
  );
}

function TextInput({ label, value, onChange }) {
  return (
    <label className="dm-text-field">
      <span>{label}</span>
      <input className="input" value={value || ''} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 3 }) {
  return (
    <label className="dm-text-field">
      <span>{label}</span>
      <textarea className="input" rows={rows} value={value || ''} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <label className="dm-toggle-row">
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
