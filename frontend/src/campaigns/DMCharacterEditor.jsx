import { errorMessage } from '../api/errors.js';
import { useEffect, useState, useCallback, useMemo, useRef, useId } from 'react';
import SRD from '../../data/srd.js';
import { api } from '../api/client.js';
import ResourcesCard from '../progression/ResourcesCard.jsx';
import { computeResources } from '../progression/resources.js';
import { tName } from '../../data/i18n.js';
import { editLogEntries, describeEditLogEntry } from './edit-log.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import useScrollEdges from '../shell/useScrollEdges.js';

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

// Use the same slot table as the character sheet.
function defaultSlotsFor(className, level, subclass) {
  const slots = SRD.getSpellSlots(className, level, subclass || '');
  return [...slots, ...Array(9 - slots.length).fill(0)];
}

const ordinal = (n, lang) => (lang === 'pt' ? `${n}º` : `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`);
/** Mesmo valor (ausente = null), para saber se o formulário mudou de verdade. */
const sameValue = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Folha pro mestre editar tudo da ficha do jogador (MesaSheet: tela cheia no
 * celular, diálogo largo no desktop).
 *
 * Recebe `character` (objeto remoto com id numérico e data inline) + `lang` +
 * `onSaved(newCharacter)` callback. Backend rota: PATCH /characters/:id/dm-edit
 *
 * Edita: nome, HP atual/máximo/temp, atributos, level, XP, alinhamento,
 * background, race, className, subclass, slots por nível (atuais + máximos),
 * condições toggle, moedas, notas, descrição, equipamento (lista).
 * Aba "Registro de edições" (só se a ficha tiver data.editLog, ver edit-log.js):
 * o que o jogador mudou na campanha. Só leitura; `initialSection="log"` abre nela.
 * Com mudança não salva, ✕ / Esc / toque fora perguntam "Descartar mudanças?"
 * (MesaSheet `dirty`); "Cancelar" descarta direto, como sempre.
 */
export default function DMCharacterEditor({ character, lang, onClose, onSaved, initialSection }) {
  const [data, setData] = useState(() => ({ ...(character.data || {}) }));
  const [name, setName] = useState(character.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showEmptySlots, setShowEmptySlots] = useState(false);
  const logEntries = editLogEntries(character.data);
  const [section, setSection] = useState(() => (initialSection === 'log' && !logEntries.length ? 'vitals' : initialSection || 'vitals'));
  // Mudou algo? Só os campos que trocaram de referência são comparados (o patch
  // mantém os outros), então o retrato e o registro não são serializados a cada tecla.
  const [initialData] = useState(() => character.data || {});
  const dirty = useMemo(() => {
    if (name !== (character.name || '')) return true;
    const keys = new Set([...Object.keys(initialData), ...Object.keys(data)]);
    for (const k of keys) {
      if (initialData[k] !== data[k] && !sameValue(initialData[k], data[k])) return true;
    }
    return false;
  }, [data, name, initialData, character.name]);

  // Abas num trilho que rola de lado: cada aba no tamanho do texto, a aberta
  // sempre à vista (inclusive o Registro, a última, quando se abre por ele).
  const navRef = useRef(null);
  useScrollEdges(navRef, { active: section, selector: '[aria-selected="true"]' });
  const firstSection = useRef(true);
  useEffect(() => {
    // trocar de aba volta ao começo do corpo (o trilho de abas fica preso no topo)
    if (firstSection.current) { firstSection.current = false; return; }
    const body = navRef.current?.closest('.mesa-sheet-body');
    if (body) body.scrollTop = 0;
  }, [section]);

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
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  // Slots: usa spellSlotsUsed (array por nível) + maxSlots derivado
  const lvl = data.level || 1;
  const defaultMax = defaultSlotsFor(data.className, lvl, data.subclass);
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
  // Só os círculos com espaço (ou com algum usado); o resto fica atrás de "Mostrar círculos sem espaço".
  const circles = [1,2,3,4,5,6,7,8,9];
  const withSlots = circles.filter(level => slotMax(level - 1) > 0 || (used[level - 1] || 0) > 0);
  const emptyCount = circles.length - withSlots.length;
  const shownCircles = showEmptySlots ? circles : withSlots;

  const tabs = [
    { id: 'vitals', label: t(lang, 'Vida e estado', 'Vitals & Status') },
    { id: 'abilities', label: t(lang, 'Atributos', 'Abilities') },
    { id: 'progression', label: t(lang, 'Progressão', 'Progression') },
    { id: 'spells', label: t(lang, 'Espaços de magia', 'Spell slots') },
    { id: 'inventory', label: t(lang, 'Inventário e moedas', 'Inventory & Coins') },
    { id: 'story', label: t(lang, 'Identidade', 'Identity') },
    logEntries.length > 0 && { id: 'log', label: `${t(lang, 'Registro de edições', 'Edit log')} (${logEntries.length})` },
  ].filter(Boolean);
  const tabsId = useId();
  const onTabKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = tabs.findIndex(x => x.id === section);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    setSection(next.id);
    requestAnimationFrame(() => navRef.current?.querySelector(`[data-tab="${next.id}"]`)?.focus());
  };

  const footer = (
    <>
      {error && <div className="dm-editor-error" role="alert">{error}</div>}
      <div className="mesa-actions dm-editor-actions">
        <button type="button" className="mesa-btn" onClick={onClose}>{t(lang, 'Cancelar', 'Cancel')}</button>
        <button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={save} disabled={saving}>
          {saving ? '…' : t(lang, 'Salvar', 'Save')}
        </button>
      </div>
    </>
  );

  return (
    <MesaSheet
      icon="🛠"
      eyebrow={t(lang, 'Modo mestre', 'DM mode')}
      title={`${t(lang, 'Editar ficha', 'Edit sheet')} — ${name || character.name || ''}`}
      size="full" width="lg" lang={lang}
      dirty={dirty}
      onClose={onClose}
      className="dm-editor"
      bodyClassName="dm-editor-sheet-body"
      footer={footer}
    >
      <div className="dm-editor-tabs">
        <div className="dm-editor-nav mesa-scroll" role="tablist" ref={navRef}
          aria-label={t(lang, 'Partes da ficha', 'Sheet sections')} onKeyDown={onTabKey}>
          {tabs.map(s => (
            <button key={s.id} type="button" role="tab" data-tab={s.id}
              id={`${tabsId}-${s.id}`} aria-controls={`${tabsId}-panel`}
              aria-selected={section === s.id} tabIndex={section === s.id ? 0 : -1}
              className={`dm-editor-tab ${section === s.id ? 'active' : ''}`}
              onClick={() => setSection(s.id)}>{s.label}</button>
          ))}
        </div>
      </div>

      <div className="dm-editor-body" role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${section}`}>
        {section === 'vitals' && (
          <>
            <Section title={t(lang, 'Pontos de Vida', 'Hit Points')}>
              <div className="dm-num-grid">
                <NumInput lang={lang} label={t(lang, 'PV atuais', 'Current HP')} value={data.currentHp} stepper onChange={v => patch({ currentHp: v })} />
                <NumInput lang={lang} label={t(lang, 'PV máximos', 'Max HP')} value={data.maxHp} onChange={v => patch({ maxHp: v })} />
                <NumInput lang={lang} label={t(lang, 'PV temporários', 'Temp HP')} value={data.tempHp} min={0} stepper onChange={v => patch({ tempHp: v })} />
                <NumInput lang={lang} label={t(lang, 'Dados de vida usados', 'Hit dice used')} value={data.hitDiceUsed} onChange={v => patch({ hitDiceUsed: v })} />
              </div>
            </Section>

            <Section title={t(lang, 'Combate', 'Combat')}>
              <div className="dm-num-grid">
                <NumInput lang={lang} label={t(lang, 'Bônus extra de CA', 'Extra AC bonus')} value={data.extraAcBonus} onChange={v => patch({ extraAcBonus: v })} />
                <NumInput lang={lang} label={t(lang, 'Deslocamento fixo (0 = automático)', 'Speed override (0 = automatic)')} value={data.speedOverride} onChange={v => patch({ speedOverride: v })} />
              </div>
              <div className="dm-toggle-grid">
                <ToggleRow label={t(lang, 'Inspiração', 'Inspiration')} value={!!data.inspiration} onChange={v => patch({ inspiration: v })} />
                <ToggleRow label={t(lang, 'Escudo equipado', 'Shield equipped')} value={!!data.hasShield} onChange={v => patch({ hasShield: v })} />
              </div>
            </Section>

            <Section title={t(lang, 'Recursos de classe', 'Class resources')} className="dm-res">
              {computeResources(data).length > 0
                ? <ResourcesCard char={data} lang={lang} update={patch} canRestore local showDesc />
                : <p className="dm-editor-note">{t(lang, 'Esta ficha não tem recursos de classe com usos.', 'This sheet has no class resources with uses.')}</p>}
            </Section>

            <Section title={t(lang, 'Salvamentos contra morte', 'Death saves')}>
              <div className="dm-num-grid">
                <NumInput lang={lang} label={t(lang, 'Sucessos', 'Successes')} value={data.deathSaves?.success} min={0} max={3} stepper
                  onChange={v => patch({ deathSaves: { ...(data.deathSaves || {}), success: Math.max(0, Math.min(3, v)) } })} />
                <NumInput lang={lang} label={t(lang, 'Falhas', 'Failures')} value={data.deathSaves?.fail} min={0} max={3} stepper
                  onChange={v => patch({ deathSaves: { ...(data.deathSaves || {}), fail: Math.max(0, Math.min(3, v)) } })} />
              </div>
            </Section>

            <Section title={t(lang, 'Condições ativas', 'Active conditions')}>
              <div className="dm-chip-grid">
                {CONDITIONS.map(cond => {
                  const on = (data.conditions || []).includes(cond);
                  return (
                    <button key={cond} type="button" aria-pressed={on}
                      className={`mesa-chip dm-cond-chip ${on ? 'on' : ''}`}
                      onClick={() => toggleCondition(cond)}>
                      {cond === 'exhaustion' ? t(lang, 'Exaustão', 'Exhaustion') : tName('condition', cond, lang)}
                    </button>
                  );
                })}
              </div>
            </Section>

            {data.wildShape?.active && (
              <Section title={t(lang, 'Forma selvagem ativa', 'Wild Shape active')}>
                <p className="dm-editor-note">{t(lang, 'Fera:', 'Beast:')} <strong>{data.wildShape.beastName}</strong></p>
                <div className="dm-num-grid">
                  <NumInput lang={lang} label={t(lang, 'PV atuais da fera', 'Beast current HP')} value={data.wildShape.beastCurrentHp} stepper
                    onChange={v => patch({ wildShape: { ...data.wildShape, beastCurrentHp: v } })} />
                  <NumInput lang={lang} label={t(lang, 'PV máximos da fera', 'Beast max HP')} value={data.wildShape.beastMaxHp}
                    onChange={v => patch({ wildShape: { ...data.wildShape, beastMaxHp: v } })} />
                </div>
              </Section>
            )}
          </>
        )}

        {section === 'abilities' && (
          <>
            <Section title={t(lang, 'Atributos (valor base)', 'Ability scores (base)')}>
              <div className="dm-abil-grid">
                {ABILITIES.map(k => {
                  const score = (data.abilities || {})[k] ?? 10;
                  const mod = Math.floor((score - 10) / 2);
                  return (
                    <div key={k} className="dm-abil-box">
                      <label htmlFor={`ab-${k}-${tabsId}`}>{ABILITY_NAMES[k][lang]}</label>
                      <input id={`ab-${k}-${tabsId}`} type="number" min={1} max={30} inputMode="numeric"
                        value={score}
                        onChange={e => patchAbility(k, e.target.value)}
                        className="input" />
                      <span className="dm-abil-mod" aria-label={t(lang, `modificador ${(mod >= 0 ? '+' : '') + mod}`, `modifier ${(mod >= 0 ? '+' : '') + mod}`)}>
                        {(mod >= 0 ? '+' : '') + mod}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Section>
            <Section title={t(lang, 'Perícias (com proficiência)', 'Skills (proficient)')}>
              <div className="dm-chip-grid is-wide">
                {SKILLS.map(sk => {
                  const on = (data.skillProfs || []).includes(sk);
                  return (
                    <button key={sk} type="button" aria-pressed={on}
                      className={`mesa-chip dm-cond-chip ${on ? 'on' : ''}`}
                      onClick={() => patch({ skillProfs: on ? data.skillProfs.filter(x => x !== sk) : [...(data.skillProfs || []), sk] })}>
                      {tName('skill', sk, lang)}
                    </button>
                  );
                })}
              </div>
            </Section>
            <Section title={t(lang, 'Salvamentos com proficiência', 'Save proficiencies')}>
              <div className="dm-chip-grid is-abil">
                {ABILITIES.map(ab => {
                  const on = (data.saveProfs || []).includes(ab);
                  return (
                    <button key={ab} type="button" aria-pressed={on}
                      className={`mesa-chip dm-cond-chip ${on ? 'on' : ''}`}
                      onClick={() => patch({ saveProfs: on ? data.saveProfs.filter(x => x !== ab) : [...(data.saveProfs || []), ab] })}>
                      {ABILITY_NAMES[ab][lang]}
                    </button>
                  );
                })}
              </div>
            </Section>
          </>
        )}

        {section === 'progression' && (
          <>
            <Section title={t(lang, 'Nível e experiência', 'Level & XP')}>
              <div className="dm-num-grid">
                <NumInput lang={lang} label={t(lang, 'Nível', 'Level')} value={data.level} min={1} max={20} onChange={v => patch({ level: Math.max(1, Math.min(20, v)) })} />
                <NumInput lang={lang} label="XP" value={data.xp} onChange={v => patch({ xp: v })} />
              </div>
              <div className="dm-text-grid">
                <TextInput label={t(lang, 'Classe (id)', 'Class (id)')} value={data.className} onChange={v => patch({ className: v })} />
                <TextInput label={t(lang, 'Subclasse (id)', 'Subclass (id)')} value={data.subclass} onChange={v => patch({ subclass: v })} />
                <TextInput label={t(lang, 'Espécie (id)', 'Species (id)')} value={data.race} onChange={v => patch({ race: v })} />
                <TextInput label={t(lang, 'Antecedente (id)', 'Background (id)')} value={data.background} onChange={v => patch({ background: v })} />
              </div>
            </Section>
            <details className="dm-override-section">
              <summary>{t(lang, '⚠ Ajuste manual (consertar inconsistências)', '⚠ Override (fix inconsistencies)')}</summary>
              <p className="dm-editor-note">
                {t(lang,
                  'Caminho normal: o jogador pede a subida → você libera em Grupo › Jogadores › Pedidos → o jogador confirma "Subir de nível" na ficha dele. Use este botão SÓ para consertar fichas inconsistentes (não ajusta PV sozinho).',
                  'Normal flow: player requests a level up → you unlock it in Group › Players › Requests → player confirms "Level up" on their sheet. Use this button ONLY to fix inconsistent sheets (does not adjust HP).')}
              </p>
              <button type="button" className="mesa-btn"
                disabled={(data.level || 1) >= 20}
                onClick={() => patch({ level: Math.min(20, (data.level || 1) + 1) })}>
                ⬆ {t(lang, 'Forçar subida +1', 'Force level up +1')}
              </button>
            </details>
          </>
        )}

        {section === 'spells' && (
          <Section title={t(lang, 'Espaços de magia por círculo', 'Spell slots per level')}>
            <p className="dm-editor-note">
              {t(lang,
                'Editar o máximo substitui o valor automático. "Restaurar tudo" zera os espaços usados (descanso longo).',
                'Edit max to override automatic. "Restore all" zeroes used slots (long rest).')}
            </p>
            {!shownCircles.length && (
              <p className="dm-slots-none">{t(lang, 'Esta ficha não tem espaços de magia em nenhum círculo.', 'This sheet has no spell slots at any level.')}</p>
            )}
            {shownCircles.length > 0 && (
              <ul className="dm-slots-list">
                {shownCircles.map(level => {
                  const i = level - 1;
                  const max = slotMax(i);
                  const avail = slotAvail(i);
                  return (
                    <li key={level} className={`dm-slot ${max === 0 ? 'is-empty' : ''}`}>
                      <div className="dm-slot-head">
                        <strong>{t(lang, `${ordinal(level, lang)} círculo`, `${ordinal(level, lang)} level`)}</strong>
                        <span className={`dm-slots-avail ${max > 0 && avail === 0 ? 'zero' : ''}`}>
                          {t(lang, `disponíveis ${avail} de ${max}`, `${avail} of ${max} available`)}
                        </span>
                      </div>
                      <div className="dm-slot-ctrls">
                        <NumInput lang={lang} label={t(lang, 'Usados', 'Used')} value={used[i] || 0} min={0} stepper
                          onChange={v => setUsedAt(i, v)} />
                        <NumInput lang={lang} label={t(lang, 'Máximo', 'Max')} value={max} min={0}
                          onChange={v => setMaxAt(i, v)} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {emptyCount > 0 && (
              <button type="button" className="mesa-btn is-quiet dm-slots-more" aria-expanded={showEmptySlots}
                onClick={() => setShowEmptySlots(v => !v)}>
                {showEmptySlots
                  ? t(lang, 'Esconder círculos sem espaço', 'Hide levels without slots')
                  : t(lang, `Mostrar círculos sem espaço (${emptyCount})`, `Show levels without slots (${emptyCount})`)}
              </button>
            )}
            <div className="dm-editor-row-actions">
              <button type="button" className="mesa-btn" onClick={restoreAllSlots}>
                🛌 {t(lang, 'Restaurar tudo (descanso longo)', 'Restore all (long rest)')}
              </button>
              <button type="button" className="mesa-btn" onClick={resetSlotsToDefault}>
                {t(lang, 'Voltar ao automático', 'Reset to auto')}
              </button>
            </div>
          </Section>
        )}

        {section === 'inventory' && (
          <>
            <Section title={t(lang, 'Moedas', 'Coins')}>
              <div className="dm-coin-grid">
                {['cp','sp','ep','gp','pp'].map(c => (
                  <NumInput key={c} lang={lang} label={lang === 'en' ? c.toUpperCase() : ({ cp: 'PC', sp: 'PP', ep: 'PE', gp: 'PO', pp: 'PL' }[c])} value={(data.coins||{})[c]} onChange={v => patchCoin(c, v)} />
                ))}
              </div>
            </Section>
            <Section title={t(lang, 'Tesouro / notas', 'Treasure / notes')}>
              <TextArea label={t(lang, 'Tesouro / notas', 'Treasure / notes')} hideLabel rows={4} value={data.treasure} onChange={v => patch({ treasure: v })} />
            </Section>
            <Section title={t(lang, 'Equipamento (texto livre)', 'Equipment (free text)')}>
              <p className="dm-editor-note">
                {t(lang, 'Só leitura. Para entregar itens use "Dar item" no card do jogador.', 'Read only. To hand out items use "Give item" on the player card.')}
              </p>
              <TextArea label={t(lang, 'Equipamento (texto livre)', 'Equipment (free text)')} hideLabel rows={6} readOnly
                value={Array.isArray(data.equipment) ? data.equipment.map(it => typeof it === 'string' ? it : `${it.name || '?'}${it.qty ? ` ×${it.qty}` : ''}${it.broken ? (lang === 'en' ? ' (broken)' : ' (quebrado)') : ''}${it.notes ? ' — ' + it.notes : ''}`).join('\n') : (data.equipment || '')} />
            </Section>
          </>
        )}

        {section === 'story' && (
          <>
            <Section title={t(lang, 'Identidade', 'Identity')}>
              <div className="dm-text-grid">
                <TextInput label={t(lang, 'Nome do personagem', 'Character name')} value={name} onChange={setName} />
                <TextInput label={t(lang, 'Jogador', 'Player')} value={data.player} onChange={v => patch({ player: v })} />
                <TextInput label={t(lang, 'Alinhamento', 'Alignment')} value={data.alignment} onChange={v => patch({ alignment: v })} />
                <TextInput label={t(lang, 'Idade', 'Age')} value={data.age} onChange={v => patch({ age: v })} />
              </div>
            </Section>
            <Section title={t(lang, 'Personalidade e história', 'Personality & Backstory')}>
              <TextArea label={t(lang, 'Traços de personalidade', 'Personality traits')} value={data.personality} onChange={v => patch({ personality: v })} />
              <TextArea label={t(lang, 'Ideais', 'Ideals')} value={data.ideals} onChange={v => patch({ ideals: v })} />
              <TextArea label={t(lang, 'Vínculos', 'Bonds')} value={data.bonds} onChange={v => patch({ bonds: v })} />
              <TextArea label={t(lang, 'Defeitos', 'Flaws')} value={data.flaws} onChange={v => patch({ flaws: v })} />
              <TextArea label={t(lang, 'História', 'Backstory')} value={data.backstory} onChange={v => patch({ backstory: v })} />
              <TextArea label={t(lang, 'Aparência', 'Appearance')} value={data.appearance} onChange={v => patch({ appearance: v })} />
              <TextArea label={t(lang, 'Notas (jornal)', 'Notes (journal)')} value={data.notes} onChange={v => patch({ notes: v })} />
            </Section>
          </>
        )}

        {section === 'log' && (
          <Section title={t(lang, 'Registro de edições', 'Edit log')}>
            <p className="dm-editor-note">
              {t(lang,
                'O que o jogador mudou na própria ficha durante a campanha, do mais recente ao mais antigo. O jogador não consegue apagar este registro.',
                'What the player changed on their own sheet during the campaign, newest first. The player cannot erase this log.')}
            </p>
            <ol className="dm-editlog">
              {logEntries.map(raw => {
                const e = describeEditLogEntry(raw, lang);
                return (
                  <li key={e.key} className="dm-editlog-item">
                    <div className="dm-editlog-head">
                      <strong>{e.field}</strong>
                      <span className="dm-editlog-when">{[e.when, e.by].filter(Boolean).join(' · ')}</span>
                    </div>
                    {e.added.length > 0 && (
                      <div className="dm-editlog-added"><span aria-hidden="true">+ </span>{t(lang, 'Entrou', 'Added')}: {e.added.join(', ')}</div>
                    )}
                    {e.removed.length > 0 && (
                      <div className="dm-editlog-removed"><span aria-hidden="true">− </span>{t(lang, 'Saiu', 'Removed')}: {e.removed.join(', ')}</div>
                    )}
                    {e.change && <div className="dm-editlog-change">{e.change.from} → {e.change.to}</div>}
                  </li>
                );
              })}
            </ol>
          </Section>
        )}
      </div>
    </MesaSheet>
  );
}

function Section({ title, children, className = '' }) {
  return (
    <section className={`mesa-panel is-sunk dm-editor-section ${className}`.trim()}>
      <MesaTitle as="h4">{title}</MesaTitle>
      <div className="dm-editor-section-body">{children}</div>
    </section>
  );
}

/** Campo numérico com rótulo visível em cima; `stepper` põe − e + de 44 px dos lados. */
function NumInput({ label, value, onChange, min = -999, max = 9999, stepper, lang }) {
  const id = useId();
  const v = value ?? 0;
  const clamp = (n) => Math.max(min, Math.min(max, n));
  return (
    <div className={`dm-field dm-num-field ${stepper ? 'has-stepper' : ''}`}>
      <label className="dm-field-label" htmlFor={id}>{label}</label>
      <div className="dm-num-ctrl">
        {stepper && (
          <button type="button" className="dm-step" disabled={v <= min}
            aria-label={t(lang, `Diminuir ${label}`, `Decrease ${label}`)} onClick={() => onChange(clamp((parseInt(v) || 0) - 1))}>−</button>
        )}
        {/* inputmode=numeric só quando o campo não aceita negativo: no iPhone esse
            teclado não tem o "−" (Bônus extra de CA −1, por exemplo) */}
        <input id={id} type="number" className="input" min={min} max={max} inputMode={min >= 0 ? 'numeric' : undefined}
          value={v} onChange={e => onChange(parseInt(e.target.value) || 0)} />
        {stepper && (
          <button type="button" className="dm-step" disabled={v >= max}
            aria-label={t(lang, `Aumentar ${label}`, `Increase ${label}`)} onClick={() => onChange(clamp((parseInt(v) || 0) + 1))}>+</button>
        )}
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange }) {
  const id = useId();
  return (
    <div className="dm-field dm-text-field">
      <label className="dm-field-label" htmlFor={id}>{label}</label>
      <input id={id} className="input" value={value || ''} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3, hideLabel, readOnly }) {
  const id = useId();
  return (
    <div className="dm-field dm-text-field">
      {!hideLabel && <label className="dm-field-label" htmlFor={id}>{label}</label>}
      <textarea id={id} className="input" rows={rows} value={value || ''} readOnly={readOnly}
        aria-label={hideLabel ? label : undefined}
        onChange={readOnly ? undefined : (e => onChange(e.target.value))} />
    </div>
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
