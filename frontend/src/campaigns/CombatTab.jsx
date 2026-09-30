import { errorMessage } from '../api/errors.js';
import { useCallback, useEffect, useState } from 'react';
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

const CONDITION_LIST = [
  'blinded','charmed','deafened','frightened','grappled','incapacitated',
  'invisible','paralyzed','petrified','poisoned','prone','restrained',
  'stunned','unconscious','exhaustion',
];

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
    if (!confirm(t(lang, 'Encerrar combate?', 'End combat?'))) return;
    const r = await api.endCombat(campaign.id); load();
    if (isWizardEnabled(campaign.state)) setWrapUp(r?.combat || combat);
  };
  const resetCombat = async () => {
    if (!confirm(t(lang, 'Resetar combate (remove todos os combatentes)?', 'Reset combat (removes all combatants)?'))) return;
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

  const addPC = async (characterId) => {
    const dexMod = 2; // suposição; jogador rola depois
    const init = 10 + Math.floor(Math.random() * 8); // random pra rapido; mestre ajusta
    await api.addCombatant(campaign.id, {
      type: 'pc',
      characterId,
      initiative: init,
      position: { x: 100, y: 200 },
      tokenScale: 1,
    });
    setShowAddPC(false);
    load();
  };

  const removeCombatant = async (cid) => {
    const who = combat?.combatants?.find(c => c.id === cid)?.name || '';
    if (!confirm(t(lang, `Tirar ${who} do combate? (PV e condições dele se perdem.)`, `Remove ${who} from combat? (Its HP and conditions are lost.)`))) return;
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
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--blood-bright)' }} onClick={resetCombat}>
            {t(lang, 'Resetar', 'Reset')}
          </button>
        </div>
      </div>

      {currentTurn && combat.active && (
        <div className="now-turn">
          <span className="now-turn-label">{t(lang, 'Vez de', 'Now acting')}</span>
          <span className="now-turn-name">{currentTurn.name}</span>
          <span className="now-turn-hp">HP {currentTurn.current_hp} / {(currentTurn.stats || {}).max_hp}</span>
        </div>
      )}

      <div className="row gap-2" style={{ marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowPicker(true)}>
          ✚ {t(lang, 'Adicionar monstro', 'Add monster')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAddPC(true)}>
          ✚ {t(lang, 'Adicionar PC', 'Add PC')}
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
              {t(lang, 'Nenhum combatente ainda. Adicione monstros ou PCs para montar a iniciativa.', 'No combatants yet. Add monsters or PCs to build initiative.')}
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
        <div className="modal-backdrop" onClick={() => setShowAddPC(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{t(lang, 'Adicionar PC ao combate', 'Add PC to combat')}</h2>
            {campaign.members.filter(m => m.role !== 'dm' && m.character).map(m => (
              <button key={m.id} className="member-pick" onClick={() => addPC(m.character.id)}>
                <strong>{m.character.name}</strong>
                <span style={{ color: 'var(--ink-secondary)', marginLeft: 8 }}>{m.user.displayName}</span>
              </button>
            ))}
            {campaign.members.filter(m => m.role !== 'dm' && m.character).length === 0 && (
              <p style={{ color: 'var(--ink-secondary)' }}>{t(lang, 'Nenhum PC com personagem atribuído.', 'No PC with assigned character.')}</p>
            )}
          </div>
        </div>
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

  const doAttack = (actionIndex, targetId, force) => send({ action: 'attack', attackerId: c.id, targetId, actionIndex, force: !!force });
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
          <strong>{c.name}</strong>
          {c.type === 'monster' && <span className="cc-badge mon">M</span>}
          {c.type === 'pc' && <span className="cc-badge pc">PC</span>}
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
            <span key={cond} className="cc-cond" onClick={() => toggleCondition(cond)} title="Clique para remover">
              {cond}{(() => { const ef = (c.effects || []).find(e => e.name === cond); return ef ? ` (${ef.rounds_left})` : ''; })()}
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
                        onAttack={(tid, force) => doAttack(index, tid, force)}
                        onSave={(tids, force) => doSave(index, tids, force)}
                        onUse={(force) => doUse(index, force)}
                        onRecharge={(charged) => setRes({ actionIndex: index, charged })}
                      />
                    ))}
                  </div>
                );
              })}
              {actions.length === 0 && <p style={{ color: 'var(--ink-secondary)', fontStyle: 'italic' }}>
                {c.type === 'pc' ? t(lang, 'Ações de PC são executadas pelo jogador.', 'PC actions are executed by the player.') :
                 t(lang, 'Sem ações cadastradas.', 'No actions defined.')}
              </p>}
            </div>
          </details>
          <details>
            <summary>{t(lang, 'Dano / Cura manual', 'Manual damage / heal')}</summary>
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
                  <button key={cond} className={`btn-icon ${on ? 'active' : ''}`} onClick={() => toggleCondition(cond)} title={cond} style={{ width: 'auto', padding: '4px 8px' }}>
                    {cond}
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
              <button className="btn btn-primary btn-sm" onClick={doDeathSave}>{t(lang, 'Rolar SAL Morte', 'Roll Death Save')}</button>
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

function AttackRow({ action, index, combatant, lang, allCombatants, selfId, onAttack, onSave, onUse, onRecharge }) {
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
  const guard = (fn) => () => {
    if (force && !confirm(`${reasonLabel(status.reason, lang)} ${t(lang, 'Usar mesmo assim?', 'Use anyway?')}`)) return;
    fn();
  };
  const toggleTarget = (id) => setTargetIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  return (
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
        {showDesc && desc && <div className="cc-action-desc">{desc}</div>}
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
          <select value={targetId} onChange={e => setTargetId(e.target.value)} className="input" style={{ minWidth: 120 }}>
            <option value="">{t(lang, 'Alvo…', 'Target…')}</option>
            {targets.map(tg => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" disabled={!targetId} title={forceTitle} onClick={guard(() => onAttack(targetId, force))}>
            ⚔ {t(lang, 'Atacar', 'Attack')}
          </button>
        </>
      )}
      {save && (
        <button className="btn btn-primary btn-sm" disabled={!targetIds.length} title={forceTitle} onClick={guard(() => { onSave(targetIds, force); setTargetIds([]); })}>
          {t(lang, 'Resolver', 'Resolve')} ({targetIds.length})
        </button>
      )}
      {!attack && !save && (action.recharge || action.uses || action.kind === 'legendary') && (
        <button className="btn btn-ghost btn-sm" title={forceTitle} onClick={guard(() => onUse(force))}>
          {t(lang, 'Usar', 'Use')}
        </button>
      )}
    </div>
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
      <input type="number" className="input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="HP" style={{ width: 80 }} />
      <select className="input" value={type} onChange={e => setType(e.target.value)}>
        {['bludgeoning','piercing','slashing','fire','cold','lightning','thunder','acid','poison','necrotic','radiant','psychic','force'].map(t => <option key={t}>{t}</option>)}
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
