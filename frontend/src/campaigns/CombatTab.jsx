import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import MonsterPicker from './MonsterPicker.jsx';
import CombatGrid from './CombatGrid.jsx';

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
export default function CombatTab({ campaign, lang, onChange }) {
  const [combat, setCombat] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showAddPC, setShowAddPC] = useState(false);
  const [selected, setSelected] = useState(null); // combatant id selecionado
  const [actionMode, setActionMode] = useState(null); // 'attack'|'damage'|'heal'|'condition'

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
    await api.endCombat(campaign.id); load();
  };
  const resetCombat = async () => {
    if (!confirm(t(lang, 'Resetar combate (remove todos os combatentes)?', 'Reset combat (removes all combatants)?'))) return;
    await api.resetCombat(campaign.id); load();
  };
  const nextTurn = async () => { await api.combatNextTurn(campaign.id); load(); };

  const addMonster = async (monster, count, initiative) => {
    for (let i = 0; i < count; i++) {
      await api.addCombatant(campaign.id, {
        type: 'monster',
        monster: { ...monster, name: count > 1 ? `${monster.name?.en || monster.name || 'Monster'} #${i + 1}` : (monster.name?.[lang] || monster.name?.en || monster.name) },
        initiative: initiative + Math.floor(Math.random() * 5) - 2, // pequena variação
        position: { x: 100 + i * 60, y: 100 },
        tokenScale: monster.size === 'Large' ? 2 : monster.size === 'Huge' ? 3 : monster.size === 'Tiny' ? 0.5 : 1,
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
          <button className="btn btn-ghost btn-sm" style={{ color: '#ff9999' }} onClick={resetCombat}>
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

      {/* GRID VTT */}
      <CombatGrid combat={combat} campaignId={campaign.id} lang={lang} onChange={load} selectedId={selected} setSelectedId={setSelected} />

      {/* Lista de combatentes */}
      <div className="combatants-list">
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

      {showPicker && <MonsterPicker lang={lang} onPick={addMonster} onClose={() => setShowPicker(false)} />}
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
  const actions = (c.stats?.actions || []).filter(a => a.type === 'melee' || a.type === 'ranged' || a.type === 'special');

  const doAttack = async (actionIndex, targetId) => {
    await api.combatAction(campaignId, {
      action: 'attack', attackerId: c.id, targetId, actionIndex,
    });
    onChange();
  };

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
    await api.combatAction(campaignId, {
      action: has ? 'remove_condition' : 'add_condition', targetId: c.id, condition: cond,
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
        <button className="btn-icon danger" onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label="Remover">×</button>
      </div>

      {(c.conditions || []).length > 0 && (
        <div className="cc-conditions">
          {c.conditions.map(cond => (
            <span key={cond} className="cc-cond" onClick={() => toggleCondition(cond)} title="Clique para remover">{cond}</span>
          ))}
        </div>
      )}

      {isSelected && (
        <div className="cc-actions">
          <details>
            <summary>{t(lang, 'Ataques', 'Attacks')} ({actions.length})</summary>
            <div className="cc-attack-list">
              {actions.map((a, idx) => (
                <AttackRow key={idx} action={a} lang={lang} allCombatants={allCombatants} selfId={c.id} onAttack={(tid) => doAttack(idx, tid)} />
              ))}
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

function AttackRow({ action, lang, allCombatants, selfId, onAttack }) {
  const [targetId, setTargetId] = useState('');
  const targets = allCombatants.filter(c => c.id !== selfId && !c.defeated);
  const name = typeof action.name === 'object' ? (action.name[lang] || action.name.en) : action.name;
  const isAttack = action.type === 'melee' || action.type === 'ranged';
  const isSave = action.type === 'special' && action.save;
  return (
    <div className="cc-attack-row">
      <div style={{ flex: 1 }}>
        <strong>{name}</strong>
        {isAttack && action.atk !== undefined && <span style={{ marginLeft: 6, color: 'var(--ink-secondary)' }}>+{action.atk}, {action.damage} {action.damageType}</span>}
        {isSave && <span style={{ marginLeft: 6, color: 'var(--ink-secondary)' }}>{action.save.ability} CD {action.save.dc}{action.damage ? ` · ${action.damage} ${action.damageType}` : ''}</span>}
      </div>
      {isAttack && (
        <>
          <select value={targetId} onChange={e => setTargetId(e.target.value)} className="input" style={{ minWidth: 120 }}>
            <option value="">{t(lang, 'Alvo…', 'Target…')}</option>
            {targets.map(tg => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" disabled={!targetId} onClick={() => onAttack(targetId)}>
            ⚔ {t(lang, 'Atacar', 'Attack')}
          </button>
        </>
      )}
    </div>
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
      <button className="btn btn-ghost btn-sm" style={{ color: '#ff9999' }} onClick={() => onDamage(amount, type)} disabled={!amount}>
        − {t(lang, 'Dano', 'Damage')}
      </button>
      <button className="btn btn-ghost btn-sm" style={{ color: '#80d080' }} onClick={() => onHeal(amount)} disabled={!amount}>
        + {t(lang, 'Cura', 'Heal')}
      </button>
    </div>
  );
}
