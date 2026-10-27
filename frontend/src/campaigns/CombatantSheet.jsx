// Folha do combatente (plano §4.4 e §5.D): o corpo do antigo card do combate,
// dividido em abas — Ações · Dano/Cura · Condições · Recursos (só monstro com
// lendárias, resistência lendária, covil ou ação limitada).
//
// - <CombatantPanel>: as abas. No celular (e no tablet) ficam dentro da folha
//   (<CombatantSheet>, MesaSheet "tall"); no desktop o painel abre na própria
//   lista, embaixo da linha, como o card abria.
// - As sugestões (AttackResultCard / SaveResultCard) entram no lugar da lista
//   de ações, com "✓ Aplicar · ✍ Ajustar · ✕ Descartar" presos embaixo. Nada é
//   aplicado antes do Aplicar. A sugestão em aberto e os alvos escolhidos ficam
//   no CombatTab (por combatente): fechar a folha não perde nada.
// - Remover uma condição sempre pergunta antes (confirmDialog).
// - Condições da ficha do jogador aparecem marcadas "ficha", só leitura.
// Mesmas chamadas de antes (api.combatAction, attackPreview); nenhuma consulta nova.
import { useEffect, useMemo, useRef, useState } from 'react';
import { errorMessage } from '../api/errors.js';
import { api } from '../api/client.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import { HpBar } from '../shell/MesaPc.jsx';
import AttackResultCard from '../play/AttackResultCard.jsx';
import SaveResultCard from '../play/SaveResultCard.jsx';
import { attackPreview } from '../play/play-api.js';
import { flash } from '../play/flash.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import { CONDITIONS, DAMAGE_TYPES, conditionLabel, damageTypeLabel } from '../combat/monster-i18n.js';
import { conditionIcon, CONDITION_EMOJI } from '../art.js';
import { ArtIcon } from '../components/ArtThumb.jsx';
import {
  KIND_ORDER, KIND_LABEL, actionName, actionStatus, actionSummary, groupCombatActions, hasLair,
  isAttack, isSave, legendaryInfo, legendaryResistanceInfo, limitLabel, reasonLabel,
} from './monster-actions.js';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

/** Condições que estão na ficha do jogador (character.data.conditions) e não no combate. */
export function sheetConditions(combatant, campaign) {
  if (combatant?.type !== 'pc') return [];
  const m = (campaign?.members || []).find(x => x.character && x.character.id === combatant.character_id);
  const d = m?.character?.data || m?.character?.summary || {};
  const list = Array.isArray(d.conditions) ? d.conditions : [];
  const inFight = new Set(combatant.conditions || []);
  return [...new Set(list.filter(c => typeof c === 'string' && c && !inFight.has(c)))];
}

/** Rodadas restantes de uma condição aplicada com duração (ou null). */
export function condRounds(combatant, cond) {
  const ef = (combatant?.effects || []).find(e => e.name === cond);
  return ef ? ef.rounds_left : null;
}

/** "Remover Envenenado?" — a mesma confirmação na linha, na folha e na grade de condições. */
export function askRemoveCondition(lang, who, cond) {
  const label = conditionLabel(cond, lang);
  return confirmDialog({
    lang,
    title: t(lang, `Remover ${label}?`, `Remove ${label}?`),
    message: t(lang, `${who} fica sem essa condição.`, `${who} loses this condition.`),
    confirmLabel: t(lang, 'Remover', 'Remove'),
  });
}

/** Tira a condição do combatente, depois de confirmar. */
export async function removeCondition({ campaignId, combatant, cond, lang }) {
  if (!await askRemoveCondition(lang, combatant.name, cond)) return false;
  await api.combatAction(campaignId, { action: 'remove_condition', targetId: combatant.id, condition: cond });
  return true;
}

/** Chip de condição. Com onRemove: botão (pergunta antes de tirar). Sem: só leitura ("ficha"). */
export function ConditionChip({ cond, rounds = null, lang, onRemove, fromSheet = false, className = '' }) {
  const label = conditionLabel(cond, lang);
  const inner = (
    <>
      <ArtIcon src={conditionIcon(cond)} emoji={CONDITION_EMOJI[cond]} size={16} />
      <span className="cs-cond-label">{label}</span>
      {rounds != null && <span className="cs-cond-rounds" aria-label={t(lang, `${rounds} rodada(s)`, `${rounds} round(s)`)}>{rounds}</span>}
      {fromSheet && <em className="cs-cond-sheet">{t(lang, 'ficha', 'sheet')}</em>}
      {onRemove && <span className="cs-cond-x" aria-hidden="true">×</span>}
    </>
  );
  if (!onRemove) {
    return (
      <span className={`cs-cond ${fromSheet ? 'is-sheet' : ''} ${className}`.trim()}
        title={fromSheet ? t(lang, 'Na ficha do jogador (ele muda na ficha)', "On the player's sheet (they change it there)") : undefined}>
        {inner}
      </span>
    );
  }
  return (
    <button type="button" className={`cs-cond ${className}`.trim()} onClick={onRemove}
      aria-label={t(lang, `Remover ${label}`, `Remove ${label}`) + (rounds != null ? t(lang, ` (${rounds} rodada(s))`, ` (${rounds} round(s))`) : '')}>
      {inner}
    </button>
  );
}

const TAB_IDS = ['actions', 'hp', 'conditions', 'resources'];
const TAB_ICON = { actions: '⚔', hp: '❤', conditions: '✦', resources: '◆' };

function hasResources(c) {
  if (c?.type !== 'monster') return false;
  const limited = (c.stats?.actions || []).some(a => a.recharge || a.uses);
  return !!(legendaryInfo(c) || legendaryResistanceInfo(c) || limited);
}

/** Aba inicial: monstro → Ações; personagem (age pela ficha) → Dano/Cura. */
export function defaultTab(c) {
  return c?.type === 'pc' && !(c.stats?.actions || []).length ? 'hp' : 'actions';
}

/**
 * As abas do combatente. Props:
 *  - combatant, allCombatants, campaign, lang, isCurrentTurn
 *  - pending / setPending: sugestão em aberto deste combatente (vem do CombatTab)
 *  - choice(index) / setChoice(index, patch): alvos escolhidos por ação
 *  - onChange: recarrega o combate · onRemove: tirar do combate (pede confirmação)
 *  - layout: 'sheet' (dentro da folha) | 'inline' (desktop, na lista)
 */
export function CombatantPanel({
  combatant: c, allCombatants, campaign, lang, pending, setPending, choice, setChoice,
  onChange, onRemove, layout = 'sheet', tab: tabProp, onTab, showSummary = layout === 'sheet',
}) {
  const campaignId = campaign.id;
  const actions = c.stats?.actions || [];
  const [error, setError] = useState('');
  const [condRoundsIn, setCondRoundsIn] = useState('');
  const [tabLocal, setTabLocal] = useState(() => defaultTab(c));
  const tab = tabProp || tabLocal;
  const setTab = onTab || setTabLocal;
  const [openIdx, setOpenIdx] = useState(null);
  const [busyIdx, setBusyIdx] = useState(null);
  const showResources = hasResources(c);
  const tabs = TAB_IDS.filter(id => id !== 'resources' || showResources);
  const activeTab = tabs.includes(tab) ? tab : 'actions';
  const fromSheet = useMemo(() => sheetConditions(c, campaign), [c, campaign]);

  const send = async (body) => {
    setError('');
    try { await api.combatAction(campaignId, body); }
    catch (e) { setError(errorMessage(e, lang)); }
    onChange();
  };

  // "Atacar" só PEDE uma prévia ao servidor: nada muda até o mestre tocar em Aplicar.
  const doAttack = async (index, targetId) => {
    setError(''); setBusyIdx(index);
    try {
      const preview = await attackPreview(campaignId, { attackerId: c.id, targetId, actionIndex: index });
      setPending({ kind: 'attack', preview, targetId, index, key: Date.now() });
    } catch (e) {
      setError(errorMessage(e, lang));
    } finally { setBusyIdx(null); }
  };
  const doResolve = (index, targetIds) => setPending({
    kind: 'save', index, key: Date.now(), targets: allCombatants.filter(x => targetIds.includes(x.id)),
  });
  const doUse = (index, force) => send({ action: 'use_action', attackerId: c.id, actionIndex: index, force: !!force });
  const setRes = (patch) => send({ action: 'set_resources', targetId: c.id, ...patch });
  const doDamage = (amount, damageType) => send({ action: 'damage', targetId: c.id, amount: parseInt(amount) || 0, damageType: damageType || 'bludgeoning' });
  const doHeal = (amount) => send({ action: 'heal', targetId: c.id, amount: parseInt(amount) || 0 });
  const doDeathSave = () => send({ action: 'death_save', targetId: c.id });
  const addCondition = (cond) => {
    const rounds = parseInt(condRoundsIn, 10);
    return send({ action: 'add_condition', targetId: c.id, condition: cond, ...(rounds > 0 ? { rounds } : {}) });
  };
  const dropCondition = async (cond) => {
    setError('');
    try { if (await removeCondition({ campaignId, combatant: c, cond, lang })) onChange(); }
    catch (e) { setError(errorMessage(e, lang)); onChange(); }
  };

  const conds = c.conditions || [];
  const down = c.type === 'pc' && (c.current_hp || 0) <= 0;
  const targets = useMemo(() => {
    const list = allCombatants.filter(x => x.id !== c.id && !x.defeated);
    // o outro lado primeiro (monstro mira personagens), na ordem da iniciativa
    return [...list.filter(x => x.type !== c.type), ...list.filter(x => x.type === c.type)];
  }, [allCombatants, c.id, c.type]);

  const panelId = `cs-${c.id}`;
  return (
    <div className={`cs-panel is-${layout}`}>
      {showSummary && (
        <div className="cs-sum">
          <div className="cs-sum-stats">
            <HpBar hp={c.current_hp} max={c.stats?.max_hp} temp={c.temp_hp} lang={lang} className="cs-sum-hp" />
            {c.stats?.ac != null && <span className="cs-stat"><span className="cs-stat-k">{t(lang, 'CA', 'AC')}</span> {c.stats.ac}</span>}
            <span className="cs-stat"><span className="cs-stat-k">{t(lang, 'Inic.', 'Init')}</span> {c.initiative}</span>
          </div>
          {(conds.length > 0 || fromSheet.length > 0) && (
            <div className="cs-conds">
              {conds.map(cond => (
                <ConditionChip key={cond} cond={cond} rounds={condRounds(c, cond)} lang={lang} onRemove={() => dropCondition(cond)} />
              ))}
              {fromSheet.map(cond => <ConditionChip key={`f-${cond}`} cond={cond} lang={lang} fromSheet />)}
            </div>
          )}
        </div>
      )}

      {down && (
        <div className="cs-death">
          <span className="cs-death-text">
            {t(lang, 'Salvamentos contra morte', 'Death saves')}: <strong>✓ {c.death_saves?.success || 0}</strong> · <strong>✗ {c.death_saves?.fail || 0}</strong>
          </span>
          <button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={doDeathSave}>{t(lang, 'Rolar teste contra a morte', 'Roll death save')}</button>
        </div>
      )}

      {error && <div className="cc-action-error cs-error" role="alert">{error}</div>}

      <div className="mesa-seg cs-tabs" role="tablist" aria-label={t(lang, `Ações de ${c.name}`, `${c.name} actions`)}>
        {tabs.map(id => (
          <button key={id} type="button" role="tab" id={`${panelId}-t-${id}`} aria-controls={`${panelId}-p`}
            aria-selected={activeTab === id} className={`mesa-seg-btn cs-tab ${activeTab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}>
            <span className="cs-tab-ico" aria-hidden="true">{TAB_ICON[id]}</span>
            <span className="cs-tab-label">
              {id === 'actions' && t(lang, 'Ações', 'Actions')}
              {id === 'hp' && t(lang, 'Dano/Cura', 'Dmg/Heal')}
              {id === 'conditions' && t(lang, 'Condições', 'Conditions')}
              {id === 'resources' && t(lang, 'Recursos', 'Resources')}
            </span>
            {id === 'actions' && actions.length > 0 && <span className="cs-tab-n" aria-label={t(lang, `${actions.length} ações`, `${actions.length} actions`)}>{actions.length}</span>}
            {id === 'conditions' && conds.length > 0 && <span className="cs-tab-n" aria-label={t(lang, `${conds.length} condições`, `${conds.length} conditions`)}>{conds.length}</span>}
            {id === 'actions' && pending && <span className="cs-tab-dot" aria-label={t(lang, 'sugestão em aberto', 'pending suggestion')} />}
          </button>
        ))}
      </div>

      <div className="cs-tabpanel" role="tabpanel" id={`${panelId}-p`} aria-labelledby={`${panelId}-t-${activeTab}`}>
        {activeTab === 'actions' && (pending ? (
          <PendingSuggestion pending={pending} combatant={c} allCombatants={allCombatants} campaignId={campaignId}
            lang={lang} layout={layout}
            onDone={(msg) => {
              // área aplicada: os alvos marcados saem (como antes), para a próxima não ir nos mesmos sem querer
              if (pending.kind === 'save') setChoice(pending.index, { targetIds: [] });
              setPending(null); if (msg) flash(msg); onChange();
            }}
            onDiscard={() => setPending(null)} />
        ) : (
          <div className="cs-actions">
            {KIND_ORDER.map(kind => {
              const list = groupCombatActions(actions)[kind];
              if (!list.length) return null;
              return (
                <div key={kind} className="cs-kind">
                  {kind !== 'action' && <p className="cs-label">{KIND_LABEL[kind][lang] || KIND_LABEL[kind].en}</p>}
                  {list.map(({ action: a, index }) => (
                    <ActionItem key={index} action={a} index={index} combatant={c} lang={lang} targets={targets}
                      open={openIdx === index} onToggle={() => setOpenIdx(v => (v === index ? null : index))}
                      choice={choice(index)} setChoice={(patch) => setChoice(index, patch)} busy={busyIdx === index}
                      onAttack={(tid) => doAttack(index, tid)} onResolve={(ids) => doResolve(index, ids)}
                      onUse={(force) => doUse(index, force)} onRecharge={(charged) => setRes({ actionIndex: index, charged })} />
                  ))}
                </div>
              );
            })}
            {actions.length === 0 && (
              <p className="cs-empty">
                {c.type === 'pc'
                  ? t(lang, 'O jogador age pela própria ficha; use as abas Dano/Cura e Condições.', 'The player acts from their own sheet; use the Damage/Heal and Conditions tabs.')
                  : t(lang, 'Sem ações cadastradas.', 'No actions defined.')}
              </p>
            )}
          </div>
        ))}

        {activeTab === 'hp' && <DamageHealForm lang={lang} onDamage={doDamage} onHeal={doHeal} />}

        {activeTab === 'conditions' && (
          <div className="cs-condtab">
            <div className="mesa-field cs-rounds">
              <label htmlFor={`${panelId}-rounds`}>{t(lang, 'Duração (rodadas, opcional)', 'Duration (rounds, optional)')}</label>
              <input id={`${panelId}-rounds`} type="number" min={1} max={100} inputMode="numeric" className="input"
                value={condRoundsIn} onChange={e => setCondRoundsIn(e.target.value)} />
            </div>
            <p className="mesa-hint">{t(lang, 'Toque para pôr. Tirar uma condição pede confirmação.', 'Tap to apply. Removing a condition asks first.')}</p>
            <div className="cs-cond-grid">
              {CONDITIONS.map(cond => {
                const on = conds.includes(cond);
                const r = on ? condRounds(c, cond) : null;
                return (
                  <button key={cond} type="button" className={`mesa-chip cs-cond-btn ${on ? 'active' : ''}`} aria-pressed={on}
                    onClick={() => (on ? dropCondition(cond) : addCondition(cond))}>
                    <ArtIcon src={conditionIcon(cond)} emoji={CONDITION_EMOJI[cond]} size={16} />
                    <span>{conditionLabel(cond, lang)}{r != null ? ` (${r})` : ''}</span>
                  </button>
                );
              })}
            </div>
            {fromSheet.length > 0 && (
              <p className="mesa-hint cs-sheet-note">
                {t(lang, 'Na ficha do jogador: ', "On the player's sheet: ")}
                <strong>{fromSheet.map(x => conditionLabel(x, lang)).join(', ')}</strong>
                {t(lang, ' (só leitura: o jogador muda na ficha).', ' (read only: the player changes it on the sheet).')}
              </p>
            )}
          </div>
        )}

        {activeTab === 'resources' && showResources && <MonsterResources combatant={c} lang={lang} onSet={setRes} />}
      </div>

      {onRemove && (
        <div className="cs-remove">
          <button type="button" className="mesa-btn is-danger" onClick={onRemove}>
            × {t(lang, 'Tirar do combate', 'Remove from combat')}
          </button>
        </div>
      )}
    </div>
  );
}

// V10: o aviso diz quando a rolagem foi à Tela ("📺 vai à Tela" do cartão).
const onScreen = (info, lang) => (info?.shown ? t(lang, ' 📺 Na tela ✓', ' 📺 On screen ✓') : '');

/** A sugestão em aberto (ataque ou salvaguarda), no lugar da lista, com os botões presos. */
function PendingSuggestion({ pending, combatant, allCombatants, campaignId, lang, layout, onDone, onDiscard }) {
  const ref = useRef(null);
  const action = combatant.stats?.actions?.[pending.index];
  const name = actionName(action, lang);
  useEffect(() => {
    // traz a sugestão para a vista (na folha, logo abaixo das abas presas)
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      try { el.scrollIntoView({ block: layout === 'sheet' ? 'start' : 'nearest' }); } catch { /* ok */ }
    });
  }, [pending.key, layout]);
  if (!action) return null;
  if (pending.kind === 'save') {
    return (
      <div className="cs-pending" ref={ref}>
        <SaveResultCard key={pending.key} campaignId={campaignId} attacker={combatant} action={action} actionIndex={pending.index}
          targets={pending.targets} status={actionStatus(combatant, pending.index)} lang={lang} pinned
          onApplied={(_, info) => onDone(t(lang, `Aplicado: ${name}.`, `Applied: ${name}.`) + onScreen(info, lang))}
          onDiscard={onDiscard} />
      </div>
    );
  }
  const target = allCombatants.find(x => x.id === pending.targetId);
  return (
    <div className="cs-pending" ref={ref}>
      <AttackResultCard key={pending.key} preview={pending.preview} campaignId={campaignId} pinned
        attacker={combatant} target={target} lang={lang}
        onApplied={(res, info) => {
          const who = info?.targetName || '';
          onDone((info?.hit
            ? t(lang, `Aplicado: ${who} sofreu ${info.damage} de dano.`, `Applied: ${who} took ${info.damage} damage.`)
            : t(lang, `Aplicado: o ataque errou ${who}.`, `Applied: the attack missed ${who}.`)) + onScreen(info, lang));
        }}
        onDiscard={onDiscard} />
    </div>
  );
}

/** Uma ação: botão grande (nome + resumo + limite) que abre alvo, regra e o botão de agir. */
function ActionItem({ action, index, combatant, lang, targets, open, onToggle, choice, setChoice, busy, onAttack, onResolve, onUse, onRecharge }) {
  const [showDesc, setShowDesc] = useState(false);
  const name = actionName(action, lang);
  const attack = isAttack(action);
  const save = !attack && isSave(action);
  const usable = !attack && !save && !!(action.recharge || action.uses || action.kind === 'legendary');
  const status = actionStatus(combatant, index);
  const limits = limitLabel(combatant, index, lang);
  const summary = actionSummary(action, lang);
  const desc = action.desc && (action.desc[lang] || action.desc.en || action.desc.pt);
  const force = !status.available;
  const targetId = choice?.targetId || '';
  const targetIds = (choice?.targetIds || []).filter(id => targets.some(x => x.id === id));
  const bodyId = `cs-act-${combatant.id}-${index}`;
  // Indisponível (recarga/usos/lendárias): o mestre confirma para forçar.
  const guard = (fn) => async () => {
    if (force && !await confirmDialog({ lang, message: `${reasonLabel(status.reason, lang)} ${t(lang, 'Usar mesmo assim?', 'Use anyway?')}`, confirmLabel: t(lang, 'Usar', 'Use') })) return;
    fn();
  };
  const toggleTarget = (id) => setChoice({ targetIds: targetIds.includes(id) ? targetIds.filter(x => x !== id) : [...targetIds, id] });
  const target = targets.find(x => x.id === targetId);
  const ico = attack ? '⚔' : save ? '✺' : usable ? '◆' : '¶';
  return (
    <div className={`cs-act ${open ? 'is-open' : ''} ${status.available ? '' : 'is-unavailable'}`}>
      <button type="button" className="cs-act-head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span className="cs-act-ico" aria-hidden="true">{ico}</span>
        <span className="cs-act-main">
          <strong className="cs-act-name">{name}</strong>
          {summary && <span className="cs-act-sum">{summary}</span>}
          {limits && <span className={`cs-act-limit ${status.available ? '' : 'spent'}`}>{limits}</span>}
        </span>
        <span className="cs-act-chev" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="cs-act-body" id={bodyId}>
          {force && (
            <p className="cs-act-reason">⚠ {reasonLabel(status.reason, lang)} {t(lang, 'O mestre pode forçar (pede confirmação).', 'The DM may force it (asks first).')}</p>
          )}
          {(action.recharge || desc) && (
            <div className="cs-act-tools">
              {action.recharge && (
                <button type="button" className="mesa-btn" onClick={() => onRecharge(!status.available)}>
                  {status.available ? t(lang, 'Marcar gasta', 'Mark spent') : t(lang, 'Recarregar', 'Recharge')}
                </button>
              )}
              {desc && (
                <button type="button" className="mesa-btn is-quiet cs-rule-btn" aria-expanded={showDesc} onClick={() => setShowDesc(v => !v)}>
                  <span aria-hidden="true">{showDesc ? '▾' : '▸'}</span> {t(lang, 'Regra', 'Rule')}
                </button>
              )}
            </div>
          )}
          {showDesc && desc && (
            <div className="cs-act-desc">
              {lang !== 'en' && !action.desc?.pt && <p className="cs-note">{t(lang, 'Texto original das regras (em inglês):', 'Rules text:')}</p>}
              {desc}
            </div>
          )}
          {attack && (
            <>
              <p className="cs-label" id={`${bodyId}-tl`}>{t(lang, 'Alvo', 'Target')}</p>
              <div className="cs-targets" role="radiogroup" aria-labelledby={`${bodyId}-tl`}>
                {targets.map(tg => (
                  <button key={tg.id} type="button" role="radio" aria-checked={targetId === tg.id}
                    className={`cs-target ${targetId === tg.id ? 'is-on' : ''}`} onClick={() => setChoice({ targetId: tg.id })}>
                    <span className="cs-target-mark" aria-hidden="true" />
                    <span className="cs-target-name">{tg.name}</span>
                    <TargetMeta tg={tg} lang={lang} />
                  </button>
                ))}
                {!targets.length && <p className="cs-empty">{t(lang, 'Nenhum alvo no combate.', 'No target in combat.')}</p>}
              </div>
              <button type="button" className="mesa-btn mesa-btn-lg is-primary cs-go" disabled={!targetId || busy}
                aria-describedby={`${bodyId}-hint`} onClick={() => onAttack(targetId)}>
                ⚔ {busy ? '…' : t(lang, 'Atacar', 'Attack')}{target && !busy ? ` ${target.name}` : ''}
              </button>
              <p className="mesa-hint" id={`${bodyId}-hint`}>{t(lang, 'Mostra o resultado; nada é aplicado até você confirmar.', 'Shows the result; nothing is applied until you confirm.')}</p>
            </>
          )}
          {save && (
            <>
              <p className="cs-label" id={`${bodyId}-tl`}>{t(lang, 'Alvos', 'Targets')} ({targetIds.length})</p>
              <div className="cs-targets" role="group" aria-labelledby={`${bodyId}-tl`}>
                {targets.map(tg => (
                  <label key={tg.id} className={`cs-target is-check ${targetIds.includes(tg.id) ? 'is-on' : ''}`}>
                    <input type="checkbox" checked={targetIds.includes(tg.id)} onChange={() => toggleTarget(tg.id)} />
                    <span className="cs-target-name">{tg.name}</span>
                    <TargetMeta tg={tg} lang={lang} />
                  </label>
                ))}
              </div>
              <button type="button" className="mesa-btn mesa-btn-lg is-primary cs-go" disabled={!targetIds.length}
                aria-describedby={`${bodyId}-hint`} onClick={() => onResolve(targetIds)}>
                {t(lang, 'Resolver', 'Resolve')} ({targetIds.length})
              </button>
              <p className="mesa-hint" id={`${bodyId}-hint`}>{t(lang, 'Mostra os resultados; nada é aplicado até você confirmar.', 'Shows the results; nothing is applied until you confirm.')}</p>
            </>
          )}
          {usable && (
            <button type="button" className="mesa-btn mesa-btn-lg cs-go" onClick={guard(() => onUse(force))}>
              {t(lang, 'Usar', 'Use')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TargetMeta({ tg, lang }) {
  return (
    <span className="cs-target-meta">
      {tg.type === 'pc' ? t(lang, 'Personagem', 'Character') : t(lang, 'Monstro', 'Monster')}
      {' · '}{t(lang, 'PV', 'HP')} {tg.current_hp}/{tg.stats?.max_hp ?? '?'}
      {tg.stats?.ac != null && <> · {t(lang, 'CA', 'AC')} {tg.stats.ac}</>}
    </span>
  );
}

/** Ações lendárias e resistência lendária como gemas de 44 px, covil e Restaurar tudo. */
function MonsterResources({ combatant: c, lang, onSet }) {
  const leg = legendaryInfo(c);
  const lr = legendaryResistanceInfo(c);
  const gems = (info, what, onPick, tone) => (
    <div className={`cs-gems tone-${tone}`} role="group" aria-label={what}>
      {Array.from({ length: info.max }, (_, i) => {
        const lit = i < info.remaining;
        return (
          <button key={i} type="button" className={`cs-gem ${lit ? 'is-lit' : 'is-spent'}`} aria-pressed={lit}
            aria-label={`${what} ${i + 1}/${info.max}: ${lit ? t(lang, 'disponível (toque para gastar)', 'available (tap to spend)') : t(lang, 'gasta (toque para recuperar)', 'spent (tap to restore)')}`}
            onClick={() => onPick(lit ? i : i + 1)} />
        );
      })}
    </div>
  );
  return (
    <div className="cs-res">
      {leg && (
        <section className="cs-res-block">
          <div className="cs-res-head">
            <p className="cs-label">{t(lang, 'Ações lendárias', 'Legendary actions')}</p>
            <span className="cs-res-count">{leg.remaining}/{leg.max}</span>
          </div>
          {gems(leg, t(lang, 'Ação lendária', 'Legendary action'), (n) => onSet({ legendaryRemaining: n }), 'gold')}
          <p className="mesa-hint">{t(lang, 'Restauradas no início do turno do monstro. Pode usar fora do turno.', 'Restored at the start of its turn. Usable outside its turn.')}</p>
        </section>
      )}
      {lr && (
        <section className="cs-res-block">
          <div className="cs-res-head">
            <p className="cs-label">{t(lang, 'Resistência lendária', 'Legendary resistance')}</p>
            <span className="cs-res-count">{lr.remaining}/{lr.max} {t(lang, 'por dia', 'per day')}</span>
          </div>
          {gems(lr, t(lang, 'Resistência lendária', 'Legendary resistance'), (n) => onSet({ legendaryResistanceRemaining: n }), 'arcane')}
          <p className="mesa-hint">{t(lang, 'Quando falha num teste de resistência, o monstro pode passar mesmo assim.', 'When it fails a saving throw, the monster can succeed instead.')}</p>
        </section>
      )}
      <div className="cs-res-foot">
        {hasLair(c) && (
          <label className="cs-check">
            <input type="checkbox" checked={!!c.in_lair} onChange={e => onSet({ inLair: e.target.checked })} />
            <span>{t(lang, 'No covil', 'In lair')}</span>
          </label>
        )}
        <button type="button" className="mesa-btn" onClick={() => onSet({ restoreAll: true })}>
          {t(lang, 'Restaurar tudo (descanso longo)', 'Restore all (long rest)')}
        </button>
      </div>
    </div>
  );
}

function DamageHealForm({ lang, onDamage, onHeal }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('bludgeoning');
  const id = useRef(`cs-dmg-${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <div className="cs-dmg">
      <div className="cs-dmg-fields">
        <div className="mesa-field cs-dmg-amount">
          <label htmlFor={`${id}-n`}>{t(lang, 'Quantos PV', 'How many HP')}</label>
          <input id={`${id}-n`} type="number" inputMode="numeric" min={0} className="input" value={amount}
            onChange={e => setAmount(e.target.value)} placeholder={t(lang, 'PV', 'HP')} />
        </div>
        <div className="mesa-field cs-dmg-type">
          <label htmlFor={`${id}-t`}>{t(lang, 'Tipo de dano', 'Damage type')}</label>
          <select id={`${id}-t`} className="input" value={type} onChange={e => setType(e.target.value)}>
            {DAMAGE_TYPES.map(ty => <option key={ty} value={ty}>{damageTypeLabel(ty, lang)}</option>)}
          </select>
        </div>
      </div>
      <div className="cs-dmg-btns">
        <button type="button" className="mesa-btn mesa-btn-lg is-danger" onClick={() => onDamage(amount, type)} disabled={!amount}>
          − {t(lang, 'Dano', 'Damage')}
        </button>
        <button type="button" className="mesa-btn mesa-btn-lg cs-heal" onClick={() => onHeal(amount)} disabled={!amount}>
          + {t(lang, 'Cura', 'Heal')}
        </button>
      </div>
      <p className="mesa-hint">{t(lang, 'A cura não usa o tipo de dano.', 'Healing ignores the damage type.')}</p>
    </div>
  );
}

/**
 * A folha do combatente no celular/tablet (MesaSheet "tall"): cabeçalho com o
 * nome, o tipo e a iniciativa, e as abas do CombatantPanel no corpo.
 */
export default function CombatantSheet({ combatant: c, onClose, lang, isCurrentTurn, initialTab, ...rest }) {
  const [tab, setTab] = useState(() => initialTab || defaultTab(c));
  const eyebrow = [
    c.type === 'monster' ? t(lang, 'Monstro', 'Monster') : t(lang, 'Personagem', 'Character'),
    isCurrentTurn ? t(lang, '▶ Vez dele', '▶ Their turn') : null,
    c.defeated ? t(lang, 'Derrotado', 'Defeated') : null,
  ].filter(Boolean).join(' · ');
  return (
    <MesaSheet title={c.name} eyebrow={eyebrow} size="tall" width="md" lang={lang} onClose={onClose}
      className="cs-sheet" bodyClassName="cs-sheet-body">
      <CombatantPanel combatant={c} lang={lang} layout="sheet" tab={tab} onTab={setTab} {...rest} />
    </MesaSheet>
  );
}
