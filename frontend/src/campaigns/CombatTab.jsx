import { errorMessage } from '../api/errors.js';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import MonsterPicker from './MonsterPicker.jsx';
import CombatGrid from './CombatGrid.jsx';
import EncounterDifficulty from '../combat/EncounterDifficulty.jsx';
import { NudgeBell } from './NudgeList.jsx';
import EndOfEncounterPanel from './EndOfEncounterPanel.jsx';
import { isWizardEnabled } from './end-of-encounter.js';
import { findMonster, monsterForCombat } from '../../data/bestiary.js';
import SRD from '../../data/srd.js';
import Utils from '../../utils.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import AttackResultCard from '../play/AttackResultCard.jsx';
import SaveResultCard from '../play/SaveResultCard.jsx';
import { attackPreview } from '../play/play-api.js';
import { flash } from '../play/flash.js';
import { CONDITIONS, DAMAGE_TYPES, conditionLabel, damageTypeLabel } from '../combat/monster-i18n.js';

// Animais da Forma Selvagem (SRD.BEASTS) não têm ataques estruturados: no combate
// usamos a versão do bestiário SRD 5.2.1, com ataques reais.
const WILD_SHAPE_BEAST_IDS = new Set((SRD.BEASTS || []).map(b => b.id));
const resolveCatalogMonster = (m) => (
  m && !m.source && !m.combatReady && WILD_SHAPE_BEAST_IDS.has(m.id) ? (findMonster(m.id) || m) : m
);
import {
  KIND_ORDER, KIND_LABEL, actionName, actionStatus, actionSummary, groupCombatActions, hasLair,
  isAttack, isSave, legendaryInfo, legendaryResistanceInfo, limitLabel, logLine, reasonLabel,
} from './monster-actions.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

const CONDITION_LIST = CONDITIONS;
const ask = (lang, message, opts = {}) => confirmDialog({ message, lang, ...opts });

/**
 * Aba de Combate (só DM).
 * - Botão start/end. Lista de combatentes. Próximo turno. Próxima rodada.
 * - Adicionar monstro (modal MonsterPicker) e adicionar PCs da campanha.
 * - Cada combatente tem ações: atacar (com escolha de target), dano/cura
 *   manual, aplicar/remover condição, death save.
 * - Grid VTT (CombatGrid) renderiza embaixo (canvas + tokens drag-drop).
 */
export default function CombatTab({ campaign, lang, onChange, onNavigate }) {
  const [combat, setCombat] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showAddPC, setShowAddPC] = useState(false);
  const [selected, setSelected] = useState(null); // combatant id selecionado
  const [actionMode, setActionMode] = useState(null); // 'attack'|'damage'|'heal'|'condition'
  const [wrapUp, setWrapUp] = useState(null); // combate encerrado → painel opcional (opt-in)

  const load = useCallback(async () => {
    try {
      const r = await api.getCombat(campaign.id);
      setCombat(r.combat);
    } catch (e) { console.warn(e); }
  }, [campaign.id]);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 2500, [campaign.id]);

  if (!combat) return <div>{t(lang, 'Carregando combate…', 'Loading combat…')}</div>;

  const combatants = combat.combatants || [];
  const currentTurn = combatants[combat.turnIndex];

  const startCombat = async () => { await api.startCombat(campaign.id); load(); };
  const endCombat = async () => {
    if (!await ask(lang, t(lang, 'Encerrar o combate?', 'End combat?'), { confirmLabel: t(lang, 'Encerrar', 'End') })) return;
    const r = await api.endCombat(campaign.id); load();
    if (isWizardEnabled(campaign.state)) setWrapUp(r?.combat || combat);
  };
  const resetCombat = async () => {
    if (!await ask(lang, t(lang, 'Recomeçar do zero? Todos os combatentes saem do combate.', 'Start over? All combatants are removed.'), { danger: true, confirmLabel: t(lang, 'Recomeçar', 'Start over') })) return;
    await api.resetCombat(campaign.id); load();
  };
  const nextTurn = async () => { await api.combatNextTurn(campaign.id); load(); };

  const addMonster = async (monster, count, initiative) => {
    // Snapshot do bestiário (ações/bônus/reações/lendárias numa lista com `kind`).
    const snap = monsterForCombat(resolveCatalogMonster(monster));
    const base = (typeof snap.name === 'object' ? (snap.name?.[lang] || snap.name?.en) : snap.name) || 'Monster';
    for (let i = 0; i < count; i++) {
      await api.addCombatant(campaign.id, {
        type: 'monster',
        monster: { ...snap, name: count > 1 ? `${base} #${i + 1}` : base },
        initiative: initiative + Math.floor(Math.random() * 5) - 2, // pequena variação
        position: { x: 100 + i * 60, y: 100 },
        tokenScale: snap.size === 'Large' ? 2 : snap.size === 'Huge' ? 3 : snap.size === 'Gargantuan' ? 4 : snap.size === 'Tiny' ? 0.5 : 1,
      });
    }
    setShowPicker(false);
    load();
  };

  // Iniciativa do personagem: o mestre digita o que o jogador rolou na mesa
  // (dado físico); "rolar" só preenche o campo com d20 + bônus da ficha.
  const addPC = async (characterId, initiative) => {
    const n = parseInt(initiative, 10);
    const pcCount = combatants.filter(c => c.type === 'pc').length;
    await api.addCombatant(campaign.id, {
      type: 'pc',
      characterId,
      initiative: Number.isFinite(n) ? n : 10,
      position: { x: 100 + pcCount * 60, y: 200 },
      tokenScale: 1,
    });
    load();
  };

  const removeCombatant = async (cid) => {
    const who = combat?.combatants?.find(c => c.id === cid)?.name || '';
    if (!await ask(lang, t(lang, `Tirar ${who} do combate? (PV e condições dele se perdem.)`, `Remove ${who} from combat? (Its HP and conditions are lost.)`), { danger: true, confirmLabel: t(lang, 'Tirar', 'Remove') })) return;
    await api.removeCombatant(campaign.id, cid);
    if (selected === cid) setSelected(null);
    load();
  };

  const sel = combatants.find(c => c.id === selected);

  return (
    <div className="combat-tab">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0 }}>
            {t(lang, 'Combate', 'Combat')}
            {combat.active && <span className="pill pill-pending" style={{ marginLeft: 8 }}>
              {t(lang, 'Em andamento', 'In progress')} · {t(lang, 'rodada', 'round')} {combat.round}
            </span>}
            {!combat.active && combatants.length > 0 && <span style={{ marginLeft: 8, color: 'var(--ink-secondary)' }}>
              {t(lang, '(parado)', '(paused)')}
            </span>}
          </h3>
        </div>
        <div className="row gap-2">
          <NudgeBell campaign={campaign} combat={combat} lang={lang} onChange={() => { load(); onChange?.(); }} />
          {!combat.active && <button className="btn btn-primary btn-sm" onClick={startCombat} disabled={combatants.length === 0}>
            ▶ {t(lang, 'Iniciar combate', 'Start combat')}
          </button>}
          {combat.active && <>
            <button className="btn btn-ghost btn-sm" onClick={nextTurn}>
              {t(lang, 'Próximo turno', 'Next turn')} →
            </button>
            <button className="btn btn-ghost btn-sm" onClick={endCombat}>
              ⏸ {t(lang, 'Encerrar', 'End')}
            </button>
          </>}
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blood-bright)' }} onClick={resetCombat}
            title={t(lang, 'Tira todos os combatentes e recomeça', 'Removes all combatants and starts over')}>
            {t(lang, 'Recomeçar', 'Start over')}
          </button>
        </div>
      </div>

      {currentTurn && combat.active && (
        <div className="now-turn">
          <span className="now-turn-label">{t(lang, 'Vez de', 'Now acting')}</span>
          <span className="now-turn-name">{currentTurn.name}</span>
          <span className="now-turn-hp">{t(lang, 'PV', 'HP')} {currentTurn.current_hp} / {(currentTurn.stats || {}).max_hp}</span>
        </div>
      )}

      <div className="row gap-2" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowPicker(true)}>
          ✚ {t(lang, 'Adicionar monstro', 'Add monster')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAddPC(true)}>
          ✚ {t(lang, 'Adicionar personagem', 'Add character')}
        </button>
      </div>
      <EncounterDifficulty campaign={campaign} combatants={combatants} lang={lang} />
      {wrapUp && (
        <EndOfEncounterPanel campaign={campaign} combat={wrapUp} lang={lang} onNavigate={onNavigate}
          onClose={() => setWrapUp(null)} onChange={() => { load(); onChange?.(); }} />
      )}

      <div className="combat-body">
        {/* GRID VTT */}
        <CombatGrid combat={combat} campaignId={campaign.id} lang={lang} onChange={load} selectedId={selected} setSelectedId={setSelected} />

        {/* Lista de combatentes */}
        <div className="combatants-list">
          {combatants.length === 0 && (
            <div className="empty-card">
              {t(lang, 'Nenhum combatente ainda. Adicione monstros e personagens para montar a iniciativa.', 'No combatants yet. Add monsters and characters to build initiative.')}
            </div>
          )}
          {combatants.map((c, i) => (
            <CombatantCard
              key={c.id}
              combatant={c}
              lang={lang}
              isCurrentTurn={i === combat.turnIndex && combat.active}
              isSelected={selected === c.id}
              onSelect={() => setSelected(c.id === selected ? null : c.id)}
              onRemove={() => removeCombatant(c.id)}
              allCombatants={combatants}
              campaignId={campaign.id}
              onChange={load}
            />
          ))}
        </div>
      </div>

      <CombatLog log={combat.log} lang={lang} />

      {showPicker && <MonsterPicker lang={lang} levelingMode={campaign.state?.levelingMode || 'milestone'} onPick={addMonster} onClose={() => setShowPicker(false)} />}
      {showAddPC && (
        <AddCharacterModal campaign={campaign} lang={lang} combatants={combatants}
          onAdd={addPC} onClose={() => setShowAddPC(false)} />
      )}
    </div>
  );
}

function CombatantCard({ combatant, lang, isCurrentTurn, isSelected, onSelect, onRemove, allCombatants, campaignId, onChange }) {
  const c = combatant;
  const hpPct = (c.stats?.max_hp || 0) ? Math.max(0, Math.min(100, (c.current_hp / c.stats.max_hp) * 100)) : 0;
  const tone = hpPct > 60 ? 'ok' : hpPct > 30 ? 'warn' : 'crit';
  const actions = c.stats?.actions || [];
  const [actionError, setActionError] = useState('');
  const [condRounds, setCondRounds] = useState(''); // duração opcional (rodadas) ao aplicar condição

  const send = async (body) => {
    setActionError('');
    try {
      await api.combatAction(campaignId, body);
    } catch (e) {
      setActionError(errorMessage(e, lang));
    }
    onChange();
  };

  // "Atacar" agora só PEDE uma prévia ao servidor: nada muda até o mestre tocar em Aplicar.
  const [suggestion, setSuggestion] = useState(null); // {preview, targetId, index}
  const doAttack = async (actionIndex, targetId) => {
    setActionError('');
    try {
      const preview = await attackPreview(campaignId, { attackerId: c.id, targetId, actionIndex });
      setSuggestion({ preview, targetId, index: actionIndex, key: Date.now() });
    } catch (e) {
      setActionError(errorMessage(e, lang));
    }
  };
  const doSave = (actionIndex, targetIds, force) => send({ action: 'save_aoe', attackerId: c.id, targetIds, actionIndex, force: !!force });
  const doUse = (actionIndex, force) => send({ action: 'use_action', attackerId: c.id, actionIndex, force: !!force });
  const setRes = (patch) => send({ action: 'set_resources', targetId: c.id, ...patch });

  const doDamage = async (amount, damageType) => {
    await api.combatAction(campaignId, {
      action: 'damage', targetId: c.id, amount: parseInt(amount) || 0, damageType: damageType || 'bludgeoning',
    });
    onChange();
  };

  const doHeal = async (amount) => {
    await api.combatAction(campaignId, {
      action: 'heal', targetId: c.id, amount: parseInt(amount) || 0,
    });
    onChange();
  };

  const toggleCondition = async (cond) => {
    const has = (c.conditions || []).includes(cond);
    const rounds = parseInt(condRounds, 10);
    await api.combatAction(campaignId, {
      action: has ? 'remove_condition' : 'add_condition', targetId: c.id, condition: cond,
      ...(!has && rounds > 0 ? { rounds } : {}),
    });
    onChange();
  };

  const doDeathSave = async () => {
    await api.combatAction(campaignId, { action: 'death_save', targetId: c.id });
    onChange();
  };

  return (
    <div className={`combatant-card ${isCurrentTurn ? 'is-turn' : ''} ${isSelected ? 'is-sel' : ''} ${c.defeated ? 'is-defeated' : ''} type-${c.type}`}>
      <div className="cc-head" onClick={onSelect}>
        <div className="cc-name">
          <span className="cc-init">{c.initiative}</span>
          <span className="cc-who">
            <strong>{c.name}</strong>
            {c.type === 'monster' && <span className="cc-badge mon">{t(lang, 'Monstro', 'Monster')}</span>}
            {c.type === 'pc' && <span className="cc-badge pc">{t(lang, 'Personagem', 'Character')}</span>}
          </span>
        </div>
        <div className="cc-hp">
          <div className={`cc-hp-bar tone-${tone}`}>
            <div className="cc-hp-fill" style={{ width: `${hpPct}%` }} />
            <span className="cc-hp-text">{c.current_hp} / {c.stats?.max_hp ?? '?'}</span>
          </div>
        </div>
        <button className="btn-icon danger" onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label={t(lang, `Tirar ${c.name} do combate`, `Remove ${c.name} from combat`)} title={t(lang, 'Tirar do combate', 'Remove from combat')}>×</button>
      </div>

      {(c.conditions || []).length > 0 && (
        <div className="cc-conditions">
          {c.conditions.map(cond => (
            <span key={cond} className="cc-cond" role="button" tabIndex={0} onClick={() => toggleCondition(cond)}
              onKeyDown={e => { if (e.key === 'Enter') toggleCondition(cond); }} title={t(lang, 'Toque para remover', 'Tap to remove')}>
              {conditionLabel(cond, lang)}{(() => { const ef = (c.effects || []).find(e => e.name === cond); return ef ? ` (${ef.rounds_left})` : ''; })()}
            </span>
          ))}
        </div>
      )}

      {isSelected && (
        <div className="cc-actions">
          <details open={c.type === 'monster'}>
            <summary>{t(lang, 'Ações', 'Actions')} ({actions.length})</summary>
            <MonsterResources combatant={c} lang={lang} onSet={setRes} />
            {actionError && <div className="cc-action-error">{actionError}</div>}
            <div className="cc-attack-list">
              {KIND_ORDER.map(kind => {
                const list = groupCombatActions(actions)[kind];
                if (!list.length) return null;
                return (
                  <div key={kind} className="cc-kind">
                    {kind !== 'action' && <div className="cc-kind-label">{KIND_LABEL[kind][lang] || KIND_LABEL[kind].en}</div>}
                    {list.map(({ action: a, index }) => (
                      <AttackRow
                        key={index} action={a} index={index} combatant={c} lang={lang}
                        allCombatants={allCombatants} selfId={c.id}
                        onAttack={(tid) => doAttack(index, tid)}
                        suggestion={suggestion && suggestion.index === index ? suggestion : null}
                        campaignId={campaignId}
                        onApplied={(res, info) => {
                          setSuggestion(null);
                          const name = info?.targetName || '';
                          flash(info?.hit
                            ? t(lang, `Aplicado: ${name} sofreu ${info.damage} de dano.`, `Applied: ${name} took ${info.damage} damage.`)
                            : t(lang, `Aplicado: o ataque errou ${name}.`, `Applied: the attack missed ${name}.`));
                          onChange();
                        }}
                        onDiscard={() => setSuggestion(null)}
                        onSaveApplied={onChange}
                        onSave={(tids, force) => doSave(index, tids, force)}
                        onUse={(force) => doUse(index, force)}
                        onRecharge={(charged) => setRes({ actionIndex: index, charged })}
                      />
                    ))}
                  </div>
                );
              })}
              {actions.length === 0 && <p style={{ color: 'var(--ink-secondary)', fontStyle: 'italic' }}>
                {c.type === 'pc' ? t(lang, 'O jogador age pela própria ficha; use Dano / Cura e Condições abaixo.', 'The player acts from their own sheet; use Damage / Heal and Conditions below.') :
                 t(lang, 'Sem ações cadastradas.', 'No actions defined.')}
              </p>}
            </div>
          </details>
          <details>
            <summary>{t(lang, 'Dano / Cura', 'Damage / Heal')}</summary>
            <DamageHealForm lang={lang} onDamage={doDamage} onHeal={doHeal} />
          </details>
          <details>
            <summary>{t(lang, 'Condições', 'Conditions')}</summary>
            <label className="small" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', margin: '4px 0 6px' }}>
              {t(lang, 'Duração (rodadas, opcional)', 'Duration (rounds, optional)')}
              <input type="number" min={1} max={100} className="input" value={condRounds} onChange={e => setCondRounds(e.target.value)} style={{ width: 70 }} />
            </label>
            <div className="cc-cond-grid">
              {CONDITION_LIST.map(cond => {
                const on = (c.conditions || []).includes(cond);
                return (
                  <button key={cond} type="button" className={`btn-icon ${on ? 'active' : ''}`} aria-pressed={on} onClick={() => toggleCondition(cond)} style={{ width: 'auto', padding: '4px 8px' }}>
                    {conditionLabel(cond, lang)}
                  </button>
                );
              })}
            </div>
          </details>
          {c.type === 'pc' && (c.current_hp || 0) <= 0 && (
            <div className="cc-death">
              <div>
                {t(lang, 'Salvamentos contra morte', 'Death saves')}: ✓{c.death_saves?.success || 0} ✗{c.death_saves?.fail || 0}
              </div>
              <button className="btn btn-primary btn-sm" onClick={doDeathSave}>{t(lang, 'Rolar teste contra a morte', 'Roll death save')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MonsterResources({ combatant: c, lang, onSet }) {
  const leg = legendaryInfo(c);
  const lr = legendaryResistanceInfo(c);
  const limited = (c.stats?.actions || []).some(a => a.recharge || a.uses);
  if (!leg && !lr && !limited) return null;
  const pips = (info, onClick) => Array.from({ length: info.max }, (_, i) => (
    <button
      key={i} type="button" className={`cc-pip ${i < info.remaining ? 'on' : ''}`}
      onClick={() => onClick(i < info.remaining ? i : i + 1)}
      aria-label={`${i + 1}`}
    />
  ));
  return (
    <div className="cc-resources">
      {leg && (
        <div className="cc-res-row" title={t(lang, 'Restauradas no início do turno do monstro. Pode usar fora do turno.', 'Restored at the start of its turn. Usable outside its turn.')}>
          <span>{t(lang, 'Ações lendárias', 'Legendary actions')}</span>
          <span className="cc-pips">{pips(leg, (n) => onSet({ legendaryRemaining: n }))}</span>
          <span className="muted small">{leg.remaining}/{leg.max}</span>
        </div>
      )}
      {lr && (
        <div className="cc-res-row">
          <span>{t(lang, 'Resistência lendária', 'Legendary resistance')}</span>
          <span className="cc-pips">{pips(lr, (n) => onSet({ legendaryResistanceRemaining: n }))}</span>
          <span className="muted small">{lr.remaining}/{lr.max} {t(lang, 'por dia', 'per day')}</span>
        </div>
      )}
      <div className="cc-res-row">
        {hasLair(c) && (
          <label className="small" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <input type="checkbox" checked={!!c.in_lair} onChange={e => onSet({ inLair: e.target.checked })} />
            {t(lang, 'No covil', 'In lair')}
          </label>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSet({ restoreAll: true })}>
          {t(lang, 'Restaurar tudo (descanso longo)', 'Restore all (long rest)')}
        </button>
      </div>
    </div>
  );
}

function AttackRow({ action, index, combatant, lang, allCombatants, selfId, onAttack, onSave, onUse, onRecharge, suggestion, campaignId, onApplied, onDiscard, onSaveApplied }) {
  const [targetId, setTargetId] = useState('');
  const [targetIds, setTargetIds] = useState([]);
  const [showDesc, setShowDesc] = useState(false);
  const targets = allCombatants.filter(c => c.id !== selfId && !c.defeated);
  const name = actionName(action, lang);
  const attack = isAttack(action);
  const save = !attack && isSave(action);
  const status = combatant ? actionStatus(combatant, index) : { available: true, reason: null };
  const limits = combatant ? limitLabel(combatant, index, lang) : '';
  const summary = actionSummary(action, lang);
  const desc = action.desc && (action.desc[lang] || action.desc.en || action.desc.pt);
  const force = !status.available;
  const forceTitle = force ? `${reasonLabel(status.reason, lang)} ${t(lang, '(o mestre pode forçar)', '(DM may force)')}` : undefined;
  // Indisponível (recarga/usos/lendárias): o mestre confirma para forçar.
  const guard = (fn) => async () => {
    if (force && !await ask(lang, `${reasonLabel(status.reason, lang)} ${t(lang, 'Usar mesmo assim?', 'Use anyway?')}`, { confirmLabel: t(lang, 'Usar', 'Use') })) return;
    fn();
  };
  const [loading, setLoading] = useState(false);
  const [saveSugg, setSaveSugg] = useState(null); // efeito com resistência em sugestão
  const attackNow = async () => {
    setLoading(true);
    try { await onAttack(targetId); } finally { setLoading(false); }
  };
  const target = allCombatants.find(x => x.id === (suggestion?.targetId || targetId));
  const toggleTarget = (id) => setTargetIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  return (
    <>
    <div className={`cc-attack-row ${status.available ? '' : 'is-unavailable'}`}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>{name}</strong>
        {summary && <span style={{ marginLeft: 6, color: 'var(--ink-secondary)' }}>{summary}</span>}
        {limits && (
          <span className={`cc-limit ${status.available ? '' : 'spent'}`}>
            {limits}
            {action.recharge && (
              <button type="button" className="btn-link" onClick={() => onRecharge(!status.available)}>
                {status.available ? t(lang, 'marcar gasta', 'mark spent') : t(lang, 'recarregar', 'recharge')}
              </button>
            )}
          </span>
        )}
        {desc && (
          <button type="button" className="btn-link" onClick={() => setShowDesc(v => !v)}>
            {showDesc ? t(lang, 'ocultar', 'hide') : t(lang, 'texto', 'text')}
          </button>
        )}
        {showDesc && desc && (
          <div className="cc-action-desc">
            {lang === 'pt' && !action.desc?.pt && <div className="muted small">{t(lang, 'Texto original das regras (em inglês):', 'Rules text:')}</div>}
            {desc}
          </div>
        )}
        {save && (
          <div className="cc-save-targets">
            {targets.map(tg => (
              <label key={tg.id} className="small">
                <input type="checkbox" checked={targetIds.includes(tg.id)} onChange={() => toggleTarget(tg.id)} /> {tg.name}
              </label>
            ))}
          </div>
        )}
      </div>
      {attack && (
        <>
          <select value={targetId} onChange={e => setTargetId(e.target.value)} className="input cc-target-select" aria-label={t(lang, `Alvo de ${name}`, `Target for ${name}`)}>
            <option value="">{t(lang, 'Alvo…', 'Target…')}</option>
            {targets.map(tg => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" disabled={!targetId || loading} title={forceTitle || t(lang, 'Mostra o resultado; nada é aplicado até você confirmar', 'Shows the result; nothing is applied until you confirm')} onClick={attackNow}>
            ⚔ {t(lang, 'Atacar', 'Attack')}
          </button>
        </>
      )}
      {save && (
        <button className="btn btn-primary btn-sm" disabled={!targetIds.length || !!saveSugg}
          title={forceTitle || t(lang, 'Mostra os resultados; nada é aplicado até você confirmar', 'Shows the results; nothing is applied until you confirm')}
          onClick={() => setSaveSugg({ key: Date.now(), targets: allCombatants.filter(x => targetIds.includes(x.id)) })}>
          {t(lang, 'Resolver', 'Resolve')} ({targetIds.length})
        </button>
      )}
      {!attack && !save && (action.recharge || action.uses || action.kind === 'legendary') && (
        <button className="btn btn-ghost btn-sm" title={forceTitle} onClick={guard(() => onUse(force))}>
          {t(lang, 'Usar', 'Use')}
        </button>
      )}
    </div>
    {saveSugg && (
      <SaveResultCard key={saveSugg.key} campaignId={campaignId} attacker={combatant} action={action} actionIndex={index}
        targets={saveSugg.targets} status={status} lang={lang}
        onApplied={() => {
          setSaveSugg(null); setTargetIds([]);
          flash(t(lang, `Aplicado: ${name}.`, `Applied: ${name}.`));
          onSaveApplied?.();
        }}
        onDiscard={() => setSaveSugg(null)} />
    )}
    {suggestion && (
      <AttackResultCard key={suggestion.key} preview={suggestion.preview} campaignId={campaignId}
        attacker={combatant} target={target} lang={lang} onApplied={onApplied} onDiscard={onDiscard} />
    )}
    </>
  );
}

function CombatLog({ log, lang }) {
  const lines = (log || []).slice(-8).map(e => logLine(e, lang)).filter(Boolean).reverse();
  if (!lines.length) return null;
  return (
    <details className="combat-log">
      <summary>{t(lang, 'Registro recente', 'Recent log')}</summary>
      <ul>{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </details>
  );
}

function DamageHealForm({ lang, onDamage, onHeal }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('bludgeoning');
  return (
    <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <input type="number" inputMode="numeric" min={0} className="input" value={amount} onChange={e => setAmount(e.target.value)} placeholder={t(lang, 'PV', 'HP')} aria-label={t(lang, 'Quantidade de PV', 'HP amount')} style={{ width: 80 }} />
      <select className="input" value={type} onChange={e => setType(e.target.value)} aria-label={t(lang, 'Tipo de dano', 'Damage type')}>
        {DAMAGE_TYPES.map(ty => <option key={ty} value={ty}>{damageTypeLabel(ty, lang)}</option>)}
      </select>
      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blood-bright)' }} onClick={() => onDamage(amount, type)} disabled={!amount}>
        − {t(lang, 'Dano', 'Damage')}
      </button>
      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--moss-bright)' }} onClick={() => onHeal(amount)} disabled={!amount}>
        + {t(lang, 'Cura', 'Heal')}
      </button>
    </div>
  );
}

/** Adicionar personagens ao combate com a iniciativa que o jogador rolou na mesa. */
function AddCharacterModal({ campaign, lang, combatants, onAdd, onClose }) {
  const inFight = new Set(combatants.filter(c => c.type === 'pc').map(c => c.character_id));
  const members = (campaign.members || []).filter(m => m.role !== 'dm' && m.character);
  const [inits, setInits] = useState({});
  const [busy, setBusy] = useState(null);
  const bonusOf = (m) => {
    try { const d = m.character.data; return d && d.abilities ? Utils.initiative(d) : null; } catch { return null; }
  };
  const add = async (m) => {
    setBusy(m.character.id);
    try { await onAdd(m.character.id, inits[m.character.id]); } finally { setBusy(null); }
  };
  const addAll = async () => {
    for (const m of members) {
      if (inFight.has(m.character.id)) continue;
      // eslint-disable-next-line no-await-in-loop
      await add(m);
    }
    onClose();
  };
  return createPortal(
    <div className="modal-backdrop combat-modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={t(lang, 'Adicionar personagem ao combate', 'Add character to combat')} onClick={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label={t(lang, 'Fechar', 'Close')}>×</button>
        <h2 style={{ marginTop: 0 }}>{t(lang, 'Adicionar personagem ao combate', 'Add character to combat')}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          {t(lang, 'Digite a iniciativa que cada jogador rolou (dado físico). Em branco = 10.', 'Type the initiative each player rolled (physical die). Blank = 10.')}
        </p>
        {members.map(m => {
          const id = m.character.id;
          const bonus = bonusOf(m);
          const already = inFight.has(id);
          return (
            <div key={m.id} className={`add-pc-row ${already ? 'is-in' : ''}`}>
              <div className="add-pc-who">
                <strong>{m.character.name}</strong>
                <span className="muted small">{m.user?.displayName}{bonus != null ? ` · ${t(lang, 'iniciativa', 'initiative')} ${bonus >= 0 ? '+' : ''}${bonus}` : ''}</span>
              </div>
              {already ? (
                <span className="muted small">✓ {t(lang, 'no combate', 'in combat')}</span>
              ) : (
                <div className="add-pc-actions">
                  <input className="input" type="number" inputMode="numeric" value={inits[id] ?? ''} placeholder="10"
                    onChange={e => setInits(v => ({ ...v, [id]: e.target.value }))}
                    aria-label={t(lang, `Iniciativa de ${m.character.name}`, `${m.character.name} initiative`)} />
                  <button type="button" className="btn btn-ghost btn-sm" title={t(lang, 'Rolar d20 + bônus (só preenche o campo)', 'Roll d20 + bonus (just fills the field)')}
                    onClick={() => setInits(v => ({ ...v, [id]: String(1 + Math.floor(Math.random() * 20) + (bonus || 0)) }))}>🎲</button>
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy === id} onClick={() => add(m)}>
                    {t(lang, 'Adicionar', 'Add')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {members.length === 0 && (
          <p style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Nenhum jogador com personagem ainda.', 'No player with a character yet.')}</p>
        )}
        {members.some(m => !inFight.has(m.character.id)) && members.length > 1 && (
          <div className="row gap-2" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addAll}>{t(lang, 'Adicionar todos', 'Add everyone')}</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
