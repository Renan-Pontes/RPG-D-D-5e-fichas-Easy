import { useMemo, useState } from 'react';
import { CR_TABLE, CR_TABLE_NOTE, estimateCr, parseMultiattack, crToNumber, xpForCr } from './cr-estimate.js';
import { multiattackAction } from '../campaigns/import-5emm.js';
import { newCustomId } from './custom-monsters.js';
import './monster-tools.css';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
const DAMAGE_TYPES = ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'];
const PHYSICAL = 'nonmagical bludgeoning/piercing/slashing';
const ABILS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABIL_PT = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };
const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];
const TYPES = ['aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'fey', 'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead'];
const en = (v) => (v && typeof v === 'object' ? (v.en || v.pt || '') : (v || ''));
const nm = (v, lang) => (v && typeof v === 'object' ? (v[lang] || v.en || v.pt || '') : (v || ''));
const mod = (s) => Math.floor(((Number(s) || 10) - 10) / 2);
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);

const BLANK = {
  name: { pt: 'Novo monstro', en: 'New monster' },
  size: 'Medium', type: 'humanoid', alignment: 'any', speed: { walk: 30 },
  ac: 13, hp: 20, hitDice: '',
  abilities: { str: 12, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
  senses: '—', languages: '—', traits: [],
  actions: [{ name: { pt: 'Ataque', en: 'Attack' }, type: 'melee', atk: 3, range: '5 ft', damage: '1d6+1', damageType: 'slashing' }],
};

function isMulti(a) { return /multiattack|multiataque/i.test(en(a.name)); }

/** Converte um monstro do nosso formato no rascunho editável. */
function toDraft(src, lang) {
  const m = JSON.parse(JSON.stringify(src || BLANK));
  const multi = parseMultiattack(m) || [];
  const rows = [];
  const others = [];
  for (const a of m.actions || []) {
    if (isMulti(a)) continue;
    const count = multi.find(x => x.action === a)?.count || 0;
    if ((a.type === 'melee' || a.type === 'ranged') && a.damage) {
      rows.push({ kind: 'attack', name: nm(a.name, lang), type: a.type, atk: a.atk ?? 0, damage: a.damage, damageType: a.damageType || 'bludgeoning', count, range: a.range || '', extraDamage: a.extraDamage, desc: a.desc });
    } else if (a.save) {
      rows.push({ kind: 'save', name: nm(a.name, lang), ability: a.save.ability || 'DEX', dc: a.save.dc ?? 13, damage: a.damage || '', damageType: a.damageType || 'fire', half: !!a.save.halfOnSave, area: !!(a.save.area || a.multitarget || /cone|line|radius|each creature|sphere|cube/i.test(en(a.desc))), recharge: a.recharge ? String(a.recharge) : (/recharge/i.test(en(a.desc)) ? '5' : ''), keep: { targets: a.save.targets, conditions: a.save.conditions, extraDamage: a.extraDamage, uses: a.uses, usesPer: a.usesPer }, desc: a.desc });
    } else {
      others.push(a);
    }
  }
  const magicRes = (m.traits || []).some(tr => /magic resistance/i.test(en(tr.name)));
  return {
    id: src?.custom ? src.id : null,
    baseId: src?.custom ? src.baseId : src?.id,
    name: nm(m.name, lang) + (src && !src.custom ? ` (${t(lang, 'variante', 'variant')})` : ''),
    size: m.size || 'Medium', type: m.type || 'humanoid', alignment: m.alignment || '',
    ac: m.ac ?? 10, hp: m.hp ?? 1, hitDice: m.hitDice || '', speed: m.speed?.walk ?? 30,
    speedOther: Object.fromEntries(Object.entries(m.speed || {}).filter(([k]) => k !== 'walk')),
    abilities: { ...BLANK.abilities, ...(m.abilities || {}) },
    saves: Object.fromEntries(ABILS.map(k => [k, m.saves?.[k] ?? ''])),
    skills: m.skills, senses: m.senses, languages: m.languages,
    resist: [...(m.damageResistances || [])], immune: [...(m.damageImmunities || [])], vuln: [...(m.damageVulnerabilities || [])],
    conditionImmunities: m.conditionImmunities || [],
    traits: (m.traits || []).filter(tr => !/magic resistance/i.test(en(tr.name))),
    magicRes,
    rows, others,
    bonusActions: m.bonusActions, legendary: m.legendary, legendaryResistance: m.legendaryResistance, reactions: m.reactions,
    crMode: 'auto', crManual: m.cr || '1',
    passthrough: Object.fromEntries(['spellSaveDc', 'spellAttack', 'proficiency', 'sourceDoc'].filter(k => m[k] != null).map(k => [k, m[k]])),
  };
}

/** Rascunho → monstro no nosso formato. */
function fromDraft(d, lang, estimate) {
  const actions = [];
  const multi = d.rows.filter(r => r.kind === 'attack' && Number(r.count) > 0 && r.name.trim())
    .map(r => ({ name: r.name.trim(), count: Math.max(1, parseInt(r.count, 10) || 1) }));
  if (multi.length && multi.reduce((s, x) => s + x.count, 0) > 1) actions.push(multiattackAction(multi));
  for (const r of d.rows) {
    const name = { pt: r.name.trim() || 'Ação', en: r.name.trim() || 'Action' };
    if (r.kind === 'attack') {
      const a = { name, type: r.type, atk: parseInt(r.atk, 10) || 0, range: r.range || (r.type === 'ranged' ? '80/320 ft' : '5 ft'), damage: String(r.damage || '').replace(/\s+/g, ''), damageType: r.damageType };
      if (r.extraDamage && (!Array.isArray(r.extraDamage) || r.extraDamage.length)) a.extraDamage = r.extraDamage;
      if (r.desc) a.desc = r.desc;
      actions.push(a);
    } else {
      const k = r.keep || {};
      const a = { name, type: 'save', save: { ability: r.ability, dc: parseInt(r.dc, 10) || 10 } };
      if (k.targets) a.save.targets = k.targets;
      if (k.conditions) a.save.conditions = k.conditions;
      if (r.damage) { a.damage = String(r.damage).replace(/\s+/g, ''); a.damageType = r.damageType; if (r.half) a.save.halfOnSave = true; }
      if (r.damage && k.extraDamage) a.extraDamage = k.extraDamage;
      if (r.area) a.save.area = true;
      if (r.recharge) a.recharge = parseInt(r.recharge, 10) || 5;
      else if (k.uses) { a.uses = k.uses; a.usesPer = k.usesPer; }
      const auto = [r.area ? 'Area' : '', r.recharge ? `Recharge ${a.recharge}-6` : ''].filter(Boolean).join('. ');
      a.desc = r.desc || (auto ? { pt: auto.replace('Area', 'Área').replace('Recharge', 'Recarga'), en: auto } : undefined);
      if (!a.desc) delete a.desc;
      actions.push(a);
    }
  }
  actions.push(...d.others);
  const saves = {};
  for (const k of ABILS) if (d.saves[k] !== '' && d.saves[k] != null && Number.isFinite(Number(d.saves[k]))) saves[k] = Number(d.saves[k]);
  const traits = [...d.traits];
  if (d.magicRes) traits.push({ name: { pt: 'Resistência à Magia', en: 'Magic Resistance' }, desc: { pt: 'Vantagem em salvaguardas contra magias.', en: 'Advantage on saving throws against spells.' } });
  const m = {
    id: d.id || null,
    baseId: d.baseId || undefined,
    name: { pt: d.name.trim() || 'Monstro', en: d.name.trim() || 'Monster' },
    size: d.size, type: d.type, alignment: d.alignment,
    speed: { walk: parseInt(d.speed, 10) || 0, ...d.speedOther },
    ac: parseInt(d.ac, 10) || 10, hp: Math.max(1, parseInt(d.hp, 10) || 1),
    ...(d.hitDice ? { hitDice: d.hitDice } : {}),
    abilities: Object.fromEntries(ABILS.map(k => [k, Math.max(1, Math.min(30, parseInt(d.abilities[k], 10) || 10))])),
    ...(Object.keys(saves).length ? { saves } : {}),
    ...(d.skills ? { skills: d.skills } : {}),
    damageResistances: d.resist, damageImmunities: d.immune, damageVulnerabilities: d.vuln,
    conditionImmunities: d.conditionImmunities,
    senses: d.senses || '—', languages: d.languages || '—',
    traits, actions,
    ...(multi.length ? { multiattack: [multi] } : {}),
    ...(d.bonusActions ? { bonusActions: d.bonusActions } : {}),
    ...(d.legendary ? { legendary: d.legendary } : {}),
    ...(d.legendaryResistance ? { legendaryResistance: d.legendaryResistance } : {}),
    ...(d.reactions ? { reactions: d.reactions } : {}),
    ...(d.passthrough || {}),
    custom: true, source: 'custom',
  };
  const crNum = d.crMode === 'auto' && estimate ? estimate.crNum : crToNumber(d.crManual) ?? 0;
  m.crNum = crNum;
  m.cr = CR_TABLE.find(r => r.numeric === crNum)?.cr || String(crNum);
  return m;
}

function Field({ label, children, sub }) {
  return (
    <label className="me-field">
      <span>{label}</span>
      {children}
      {sub != null && <em className="me-sub">{sub}</em>}
    </label>
  );
}

/**
 * Editor de monstro personalizado (clona do catálogo ou começa do zero),
 * com ND estimado ao vivo (método do DMG 2014, via cr-estimate.js).
 */
export default function CustomMonsterEditor({ lang, base, xpMode, onSave, onCancel }) {
  const [d, setD] = useState(() => toDraft(base, lang));
  const set = (patch) => setD(prev => ({ ...prev, ...patch }));
  const setRow = (i, patch) => setD(prev => ({ ...prev, rows: prev.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  const est = useMemo(() => estimateCr(fromDraft({ ...d, crMode: 'manual' }, lang, null)), [d, lang]);
  const monster = () => fromDraft(d, lang, est);

  const cycleDefense = (type) => {
    // nada → resistência → imunidade → vulnerabilidade → nada
    const has = (list) => list.includes(type);
    if (has(d.resist)) set({ resist: d.resist.filter(x => x !== type), immune: [...d.immune, type] });
    else if (has(d.immune)) set({ immune: d.immune.filter(x => x !== type), vuln: [...d.vuln, type] });
    else if (has(d.vuln)) set({ vuln: d.vuln.filter(x => x !== type) });
    else set({ resist: [...d.resist, type] });
  };
  const defClass = (type) => (d.resist.includes(type) ? 'res' : d.immune.includes(type) ? 'imm' : d.vuln.includes(type) ? 'vul' : '');
  const extraDefenses = [...d.resist, ...d.immune, ...d.vuln].filter(x => !DAMAGE_TYPES.includes(x) && x !== PHYSICAL);

  const addRow = (kind) => set({
    rows: [...d.rows, kind === 'attack'
      ? { kind, name: t(lang, 'Ataque', 'Attack'), type: 'melee', atk: 4, damage: '1d8+2', damageType: 'slashing', count: 0, range: '' }
      : { kind, name: t(lang, 'Sopro', 'Breath'), ability: 'DEX', dc: 13, damage: '4d6', damageType: 'fire', half: true, area: true, recharge: '5' }],
  });

  const o = est.offensive;
  const df = est.defensive;
  const crOptions = CR_TABLE.map(r => r.cr);

  return (
    <div>
      <div className="me-cr-mini" aria-live="polite">
        <span>{t(lang, 'ND estimado', 'Estimated CR')}</span>
        <strong>{est.cr}</strong>
        <span>({t(lang, 'ofensivo', 'offense')} {o.cr} · {t(lang, 'defensivo', 'defense')} {df.cr})</span>
      </div>
      <div className="me-layout">
        <div className="me-form">
          <section className="me-section">
            <h4>{t(lang, 'Básico', 'Basics')}</h4>
            <div className="me-grid">
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label={t(lang, 'Nome', 'Name')}>
                  <input value={d.name} onChange={e => set({ name: e.target.value })} />
                </Field>
              </div>
              <Field label={t(lang, 'Tamanho', 'Size')}>
                <select value={d.size} onChange={e => set({ size: e.target.value })}>{SIZES.map(s => <option key={s}>{s}</option>)}</select>
              </Field>
              <Field label={t(lang, 'Tipo', 'Type')}>
                <select value={d.type} onChange={e => set({ type: e.target.value })}>
                  {[...new Set([...TYPES, d.type])].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label={t(lang, 'CA', 'AC')}>
                <input type="number" inputMode="numeric" min={1} max={30} value={d.ac} onChange={e => set({ ac: e.target.value })} />
              </Field>
              <Field label={t(lang, 'PV', 'HP')}>
                <input type="number" inputMode="numeric" min={1} value={d.hp} onChange={e => set({ hp: e.target.value })} />
              </Field>
              <Field label={t(lang, 'Deslocamento', 'Speed')}>
                <input type="number" inputMode="numeric" min={0} step={5} value={d.speed} onChange={e => set({ speed: e.target.value })} />
              </Field>
              <Field label={t(lang, 'ND do monstro', 'Monster CR')}>
                <select value={d.crMode === 'auto' ? 'auto' : d.crManual} onChange={e => (e.target.value === 'auto' ? set({ crMode: 'auto' }) : set({ crMode: 'manual', crManual: e.target.value }))}>
                  <option value="auto">{t(lang, `Estimado (${est.cr})`, `Estimated (${est.cr})`)}</option>
                  {crOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </section>

          <section className="me-section">
            <h4>{t(lang, 'Atributos e salvaguardas', 'Abilities and saves')}</h4>
            <div className="me-grid abil">
              {ABILS.map(k => (
                <Field key={k} label={lang === 'pt' ? ABIL_PT[k] : k.toUpperCase()} sub={signed(mod(d.abilities[k]))}>
                  <input type="number" inputMode="numeric" min={1} max={30} value={d.abilities[k]}
                    onChange={e => set({ abilities: { ...d.abilities, [k]: e.target.value } })} />
                </Field>
              ))}
            </div>
            <p className="me-legend" style={{ marginTop: 8 }}>{t(lang, 'Bônus de salvaguarda (vazio = sem proficiência):', 'Save bonus (blank = not proficient):')}</p>
            <div className="me-grid abil">
              {ABILS.map(k => (
                <Field key={k} label={lang === 'pt' ? ABIL_PT[k] : k.toUpperCase()}>
                  <input type="number" inputMode="numeric" value={d.saves[k]} placeholder={signed(mod(d.abilities[k]))}
                    onChange={e => set({ saves: { ...d.saves, [k]: e.target.value } })} />
                </Field>
              ))}
            </div>
          </section>

          <section className="me-section">
            <h4>{t(lang, 'Ataques e efeitos', 'Attacks and effects')}</h4>
            {d.rows.map((r, i) => (
              <div key={i} className="me-action">
                <Field label={r.kind === 'attack' ? t(lang, 'Ataque', 'Attack') : t(lang, 'Efeito com salvaguarda', 'Saving throw effect')}>
                  <input value={r.name} onChange={e => setRow(i, { name: e.target.value })} />
                </Field>
                {r.kind === 'attack' ? (
                  <>
                    <Field label={t(lang, 'Bônus', 'Bonus')}>
                      <input type="number" inputMode="numeric" value={r.atk} onChange={e => setRow(i, { atk: e.target.value })} />
                    </Field>
                    <Field label={t(lang, 'Dano', 'Damage')}>
                      <input value={r.damage} placeholder="1d8+3" onChange={e => setRow(i, { damage: e.target.value })} />
                    </Field>
                    <Field label={t(lang, 'Tipo', 'Type')}>
                      <select value={r.damageType} onChange={e => setRow(i, { damageType: e.target.value })}>{DAMAGE_TYPES.map(x => <option key={x}>{x}</option>)}</select>
                    </Field>
                    <Field label={t(lang, 'Nº/turno', 'Per turn')}>
                      <input type="number" inputMode="numeric" min={0} max={8} value={r.count} title={t(lang, 'Quantas vezes no multiataque (0 = fora do multiataque)', 'Times in the multiattack (0 = not part of it)')}
                        onChange={e => setRow(i, { count: e.target.value })} />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label={t(lang, 'CD', 'DC')}>
                      <input type="number" inputMode="numeric" value={r.dc} onChange={e => setRow(i, { dc: e.target.value })} />
                    </Field>
                    <Field label={t(lang, 'Atributo', 'Ability')}>
                      <select value={r.ability} onChange={e => setRow(i, { ability: e.target.value })}>{ABILS.map(k => <option key={k} value={k.toUpperCase()}>{lang === 'pt' ? ABIL_PT[k] : k.toUpperCase()}</option>)}</select>
                    </Field>
                    <Field label={t(lang, 'Dano', 'Damage')}>
                      <input value={r.damage} placeholder="6d6" onChange={e => setRow(i, { damage: e.target.value })} />
                    </Field>
                    <Field label={t(lang, 'Tipo', 'Type')}>
                      <select value={r.damageType} onChange={e => setRow(i, { damageType: e.target.value })}>{DAMAGE_TYPES.map(x => <option key={x}>{x}</option>)}</select>
                    </Field>
                  </>
                )}
                <button type="button" className="btn btn-ghost btn-icon danger" aria-label={t(lang, 'Remover', 'Remove')} onClick={() => set({ rows: d.rows.filter((_, j) => j !== i) })}>×</button>
                {r.kind === 'save' && (
                  <div className="me-chips" style={{ gridColumn: '1 / -1' }}>
                    <label className="me-check"><input type="checkbox" checked={r.half} onChange={e => setRow(i, { half: e.target.checked })} />{t(lang, 'metade no sucesso', 'half on success')}</label>
                    <label className="me-check"><input type="checkbox" checked={r.area} onChange={e => setRow(i, { area: e.target.checked })} />{t(lang, 'área (vários alvos)', 'area (multiple targets)')}</label>
                    <label className="me-check"><input type="checkbox" checked={!!r.recharge} onChange={e => setRow(i, { recharge: e.target.checked ? '5' : '' })} />{t(lang, `recarga ${r.recharge || 5}–6`, `recharge ${r.recharge || 5}–6`)}</label>
                  </div>
                )}
              </div>
            ))}
            {d.others.length > 0 && (
              <p className="me-legend" style={{ marginTop: 8 }}>
                {t(lang, 'Outras ações mantidas como texto: ', 'Other actions kept as text: ')}{d.others.map(a => nm(a.name, lang)).join(', ')}
              </p>
            )}
            <div className="row gap-2" style={{ flexWrap: 'wrap', marginTop: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => addRow('attack')}>✚ {t(lang, 'Ataque', 'Attack')}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => addRow('save')}>✚ {t(lang, 'Efeito com CD', 'DC effect')}</button>
            </div>
          </section>

          <section className="me-section">
            <h4>{t(lang, 'Defesas', 'Defenses')}</h4>
            <p className="me-legend">{t(lang, 'Toque para alternar: resistência → imunidade → vulnerabilidade → nada.', 'Tap to cycle: resistance → immunity → vulnerability → none.')}</p>
            <div className="me-chips">
              {[PHYSICAL, ...DAMAGE_TYPES].map(type => (
                <button key={type} type="button" className={`me-chip ${defClass(type)}`} onClick={() => cycleDefense(type)} aria-pressed={!!defClass(type)}>
                  {type === PHYSICAL ? t(lang, 'físico não mágico', 'nonmagical physical') : type}
                  {defClass(type) === 'res' && ' ½'}{defClass(type) === 'imm' && ' ∅'}{defClass(type) === 'vul' && ' ×2'}
                </button>
              ))}
              {extraDefenses.map(x => (
                <button key={x} type="button" className={`me-chip ${defClass(x)}`} title={t(lang, 'Remover', 'Remove')}
                  onClick={() => set({ resist: d.resist.filter(y => y !== x), immune: d.immune.filter(y => y !== x), vuln: d.vuln.filter(y => y !== x) })}>{x} ×</button>
              ))}
            </div>
            <label className="me-check" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={d.magicRes} onChange={e => set({ magicRes: e.target.checked })} />
              {t(lang, 'Resistência à Magia (vantagem contra magias)', 'Magic Resistance (advantage vs spells)')}
            </label>
          </section>
        </div>

        <aside className="me-cr" aria-live="polite">
          <div className="me-cr-head">
            <span>{t(lang, 'ND estimado', 'Estimated CR')}</span>
            <span className="me-cr-value">{est.cr}</span>
          </div>
          <div className="me-cr-note">{CR_TABLE_NOTE[lang] || CR_TABLE_NOTE.en}{xpMode ? ` · ${xpForCr(est.crNum).toLocaleString()} XP` : ''}</div>
          <div className="me-cr-part">
            <h5><span>{t(lang, 'Ofensivo', 'Offense')}</span><span>{o.cr}</span></h5>
            <dl>
              <dt>{t(lang, 'Dano/rodada (3 rodadas)', 'Damage/round (3 rounds)')}</dt><dd>{o.dpr}</dd>
              <dt>{t(lang, 'ND pelo dano', 'CR by damage')}</dt><dd>{o.damageCr}</dd>
              <dt>{o.useDc ? t(lang, 'Maior CD', 'Highest DC') : t(lang, 'Maior bônus de ataque', 'Highest attack bonus')}</dt>
              <dd>{o.useDc ? o.maxDc : signed(o.maxAttack)}</dd>
              <dt>{t(lang, 'Ajuste', 'Adjustment')}</dt><dd>{signed(Math.trunc(o.stepDelta / 2))} {t(lang, 'passo(s)', 'step(s)')}</dd>
              {o.multiattack && <><dt>{t(lang, 'Multiataque', 'Multiattack')}</dt><dd>{o.multiattack.map(x => `${x.count}× ${x.name}`).join(', ')}</dd></>}
            </dl>
          </div>
          <div className="me-cr-part">
            <h5><span>{t(lang, 'Defensivo', 'Defense')}</span><span>{df.cr}</span></h5>
            <dl>
              <dt>{t(lang, 'PV efetivos', 'Effective HP')}</dt><dd>{df.ehp}{df.multipliers.length ? ` (×${df.multipliers.map(x => x.value).join(' ×')})` : ''}</dd>
              <dt>{t(lang, 'ND pelos PV', 'CR by HP')}</dt><dd>{df.hpCr}</dd>
              <dt>{t(lang, 'CA efetiva', 'Effective AC')}</dt><dd>{df.eac}{df.saveAcBonus ? ` (+${df.saveAcBonus} ${t(lang, 'salv.', 'saves')})` : ''}{df.magicResistance ? ' (+2 RM)' : ''}</dd>
            </dl>
          </div>
        </aside>
      </div>

      <div className="mp-footer">
        <span className="mp-spacer" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>{t(lang, 'Voltar', 'Back')}</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => {
          const m = monster();
          if (!m.id) m.id = newCustomId(m.name.en);
          onSave(m);
        }}>
          {t(lang, 'Salvar na minha lista', 'Save to my list')}
        </button>
      </div>
    </div>
  );
}
