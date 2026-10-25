// "Mesa agora" (Jogar › Cena) — painel do mestre com tudo da sessão num lugar só.
// Regra de produto: aqui só se mostra e se sugere; toda mudança é um clique do mestre.
//
// Celular, nesta ordem (o urgente primeiro):
//   1. faixa do turno (presa ao rolar) · 2. cena compacta (o toque abre os campos)
//   3. avisos · 4. personagens · 5. pendências · 6. ações rápidas
//   7. Nesta cena · 8. plano da sessão (recolhido)
// Pedir teste, Anteriormente em…, Improvisar, Revelar e Configurar avisos abrem
// em folha (MesaSheet), sem empurrar a página.
// Desktop (≥ 1024): 2 colunas — à esquerda turno, cena, avisos e personagens;
// à direita pendências, ações e Nesta cena; o plano embaixo, nas 2 colunas.
import { errorMessage } from '../api/errors.js';
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import Utils from '../../utils.js';
import { tName } from '../../data/i18n.js';
import GroupCheckPanel from '../checks/GroupCheckPanel.jsx';
import { summarize } from '../checks/check-logic.js';
import { NudgeList, NudgeSettings, useNudges } from './NudgeList.jsx';
import { concentrationOf, conditionLabel, partyStatus, stateWithConcentration } from './nudges.js';
import { isWizardEnabled, stateWithWizard } from './end-of-encounter.js';
import EndOfEncounterPanel from './EndOfEncounterPanel.jsx';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import InScenePanel from '../play/InScenePanel.jsx';
import SessionPlanPanel from '../play/SessionPlanPanel.jsx';
import RecapCard from '../play/RecapCard.jsx';
import { patchState } from '../play/play-api.js';
import { flash } from '../play/flash.js';
import useMedia from '../play/useMedia.js';
import { openGrimoireLink } from '../grimoire/link.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import { HpBar, PcPortrait } from '../shell/MesaPc.jsx';
import { DM_AREAS, legacyTabToArea, subLabel } from '../shell/shell-logic.js';
import { memberStats } from '../group/group-model.js';
import './combat-styles.css';
import './table-now.css';

const ImproviseModal = lazy(() => import('../world/ImproviseModal.jsx'));

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

const condLabel = conditionLabel;

const safe = (fn, fallback = null) => { try { const v = fn(); return v ?? fallback; } catch { return fallback; } };

function classLine(data, lang) {
  if (!data) return '';
  const entries = safe(() => Utils.classEntries(data), []);
  const cls = entries.map(e => `${tName('class', e.id, lang)} ${e.level}`).join(' / ');
  return cls || (data.level ? `${L(lang, 'Nível', 'Level')} ${data.level}` : '');
}

// Resumo de espaços: "1º 3/4 · 2º 1/2" (restantes/máximo).
function slotSummary(data) {
  const max = safe(() => Utils.spellSlots(data), []) || [];
  const used = data?.spellSlotsUsed || [];
  return max.map((m, i) => ({ lvl: i + 1, max: m, left: Math.max(0, m - (Number(used[i]) || 0)) })).filter(s => s.max > 0);
}

// Abrir o Grimório reaproveita o link #grimorio que o app já escuta (com a entrada
// marcada: o "Voltar à mesa" volta pelo histórico, sem deixar entrada morta).
function openGrimoire() {
  if (openGrimoireLink('#grimorio')) return;
  if (/^#(grimorio|grimoire)$/i.test(window.location.hash)) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else window.location.hash = '#grimorio';
}

/** "Grupo › Jogadores": para onde leva uma aba antiga (o mapa da casca decide). */
function routeLabel(tab, lang) {
  const m = legacyTabToArea(tab);
  if (!m) return '';
  const area = DM_AREAS.find(a => a.id === m[0]);
  const name = area ? (lang === 'en' ? area.en : area.pt) : m[0];
  return m[1] ? `${name} › ${subLabel(m[1], lang)}` : name;
}

// onNavigate(tabAntiga) continua aceito; goTo(área, sub, params) é o da casca nova.
// approvals: lista antiga (só o fallback manda); sem ela, as aprovações vêm do
// contador campaign.pendingApprovals, que já chega com a campanha (sem consulta nova).
export default function TableNow({ campaign, approvals, lang = 'pt', onChange, onNavigate, goTo }) {
  const [combat, setCombat] = useState(undefined); // undefined = carregando
  const [pendingRolls, setPendingRolls] = useState([]);
  const [checks, setChecks] = useState([]);
  const [sheet, setSheet] = useState(null); // 'check' | 'recap' | 'improvise' | 'nudges'
  const [showWrapUp, setShowWrapUp] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const wide = useMedia('(min-width: 1024px)');

  const load = useCallback(async () => {
    const [cb, rolls, ch] = await Promise.allSettled([
      api.getCombat(campaign.id), api.listPendingRolls(campaign.id), api.listChecks(campaign.id),
    ]);
    if (cb.status === 'fulfilled') setCombat(cb.value.combat || null);
    if (rolls.status === 'fulfilled') setPendingRolls(rolls.value.rolls || []);
    if (ch.status === 'fulfilled') setChecks(ch.value.checks || []);
  }, [campaign.id]);
  useEffect(() => { load(); }, [load]);
  usePolling(load, 4000, [campaign.id]);

  const refresh = useCallback(() => { load(); onChange?.(); }, [load, onChange]);
  const nudges = useNudges({ campaign, combat, lang, onChange: refresh });

  // PATCH por chave (merge no servidor): só manda o que mudou.
  const saveState = async (patch) => {
    await patchState(campaign.id, patch);
    onChange?.();
  };
  const ask = (message, confirmLabel) => confirmDialog({ lang, message, confirmLabel });

  const act = async (fn, ok) => {
    setBusy(true); setMsg('');
    try { await fn(); if (ok) setMsg(ok); refresh(); } catch (e) { setMsg(errorMessage(e)); } finally { setBusy(false); }
  };

  const party = partyStatus(campaign, combat);
  const combatants = combat?.combatants || [];
  const active = !!combat?.active && combatants.length > 0;
  // Marca na hora (otimista); o valor do servidor assume quando a campanha recarrega.
  const [wizardLocal, setWizardLocal] = useState(null);
  const serverWizard = isWizardEnabled(campaign.state);
  useEffect(() => { setWizardLocal(null); }, [serverWizard]);
  const wizardOn = wizardLocal ?? serverWizard;
  const openChecks = checks.filter(c => c.status === 'open');
  const closeSheet = () => setSheet(null);

  const turnStrip = combat !== undefined && combatants.length > 0 && (
    <CombatStrip combat={combat} lang={lang} active={active} wizardOn={wizardOn}
      onOpen={() => onNavigate?.('combat')}
      onNext={() => act(() => api.combatNextTurn(campaign.id))}
      onWrapUp={() => setShowWrapUp(true)} busy={busy} />
  );

  const main = (
    <>
      {turnStrip}
      <SceneBar campaign={campaign} lang={lang} onSave={saveState} alwaysOpen={wide} />
      {showWrapUp && combat && (
        <div className="tn-wrapup">
          <EndOfEncounterPanel campaign={campaign} combat={combat} lang={lang}
            onClose={() => setShowWrapUp(false)} onNavigate={onNavigate} onChange={refresh} />
        </div>
      )}

      <section className="mesa-panel tn-box tn-nudges" aria-labelledby="tn-nudges-h">
        <MesaTitle id="tn-nudges-h"
          hint={nudges.visible.length > 0 ? <span className="tn-count" aria-label={`(${nudges.visible.length})`}>{nudges.visible.length}</span> : null}
          act={(
            <button type="button" className="mesa-btn is-quiet tn-nudge-cfg" aria-haspopup="dialog" onClick={() => setSheet('nudges')}>
              ⚙ {L(lang, 'Configurar', 'Settings')}
            </button>
          )}>
          {L(lang, 'Avisos', 'Notices')}
        </MesaTitle>
        {nudges.visible.length > 0 && (
          <p className="mesa-hint tn-nudge-hint">
            {L(lang, '“Dispensar” esconde só este aviso, neste aparelho.', '“Dismiss” hides only this notice, on this device.')}
          </p>
        )}
        <NudgeList nudges={nudges} lang={lang} />
      </section>

      <section className="mesa-panel tn-party-box" aria-labelledby="tn-party-h">
        <MesaTitle id="tn-party-h"
          sub={party.length > 0 ? <span>{L(lang, 'Perícias passivas (10 + bônus) · espaços: restantes/máx.', 'Passive skills (10 + bonus) · slots: left/max.')}</span> : null}>
          {L(lang, 'Personagens', 'Characters')}
        </MesaTitle>
        <div className="tn-party">
          {party.length === 0 && (
            <div className="tn-party-empty">
              <p>{L(lang, 'Nenhum personagem na mesa ainda. Convide os jogadores em Grupo › Jogadores.', 'No characters yet. Invite players in Party › Players.')}</p>
              {goTo && <button type="button" className="mesa-btn" onClick={() => goTo('group', 'players')}>🛡️ {L(lang, 'Ir para Grupo', 'Go to Party')}</button>}
            </div>
          )}
          {party.map(p => (
            <PartyCard key={p.characterId} p={p} campaign={campaign} lang={lang} onSaveState={saveState}
              onToggleInspiration={() => act(() => api.dmEditCharacter(p.characterId, { data: { inspiration: !p.data?.inspiration } }))} />
          ))}
        </div>
      </section>
    </>
  );

  const approvalsList = Array.isArray(approvals) ? approvals.filter(a => a.status === 'pending') : null;
  const levelups = approvalsList ? approvalsList.filter(a => a.type === 'levelup').length : 0;
  const approvalsCount = approvalsList ? approvalsList.length : Math.max(0, Number(campaign.pendingApprovals) || 0);
  const toApprovals = routeLabel('approvals', lang);
  const toTests = routeLabel('rolls', lang);
  const nothing = !approvalsCount && !pendingRolls.length && !openChecks.length;

  const side = (
    <>
      <section className="mesa-panel tn-box tn-pending" aria-labelledby="tn-pending-h">
        <MesaTitle id="tn-pending-h">{L(lang, 'Pendências', 'Pending')}</MesaTitle>
        <ul className="tn-pending-list">
          {approvalsList ? (
            <>
              <PendingRow n={levelups} sub={toApprovals} label={L(lang, 'pedido(s) de subida de nível', 'level-up request(s)')} onClick={() => onNavigate?.('approvals')} />
              <PendingRow n={approvalsList.length - levelups} sub={toApprovals} label={L(lang, 'outro(s) pedido(s) de aprovação', 'other approval request(s)')} onClick={() => onNavigate?.('approvals')} />
            </>
          ) : (
            <PendingRow n={approvalsCount} sub={toApprovals}
              label={approvalsCount === 1 ? L(lang, 'pedido esperando você', 'request waiting for you') : L(lang, 'pedidos esperando você', 'requests waiting for you')}
              onClick={() => onNavigate?.('approvals')} />
          )}
          <PendingRow n={pendingRolls.length} sub={toTests}
            label={pendingRolls.length === 1 ? L(lang, 'pedido de rolagem esperando', 'roll request waiting') : L(lang, 'pedidos de rolagem esperando', 'roll requests waiting')}
            onClick={() => onNavigate?.('rolls')} />
          {openChecks.map(c => {
            const s = summarize(c);
            return (
              <li key={c.id}>
                <button type="button" className="tn-pending-item" onClick={() => onNavigate?.('rolls')}>
                  <span className="tn-pending-n">{s.answered}/{s.total}</span>
                  <span className="tn-pending-text">
                    <span>🎯 {c.label}{c.dc != null ? ` CD ${c.dc}` : ''} — {L(lang, 'responderam', 'answered')}</span>
                    <span className="tn-pending-sub">{toTests}</span>
                  </span>
                  <span className="tn-pending-go" aria-hidden="true">›</span>
                </button>
              </li>
            );
          })}
        </ul>
        {nothing && <p className="mesa-hint tn-pending-none">{L(lang, 'Nada esperando por você.', 'Nothing waiting for you.')}</p>}
      </section>

      <section className="mesa-panel tn-box tn-actions" aria-labelledby="tn-actions-h">
        <MesaTitle id="tn-actions-h">{L(lang, 'Ações rápidas', 'Quick actions')}</MesaTitle>
        <div className="tn-action-grid">
          <button type="button" className="mesa-btn tn-act" aria-haspopup="dialog" onClick={() => setSheet('check')}>
            <span aria-hidden="true">🎯</span> {L(lang, 'Pedir teste à mesa', 'Ask for a check')}
          </button>
          <button type="button" className="mesa-btn tn-act" aria-haspopup="dialog" onClick={() => setSheet('improvise')}
            title={L(lang, 'NPC, taverna ou nomes na hora', 'NPC, tavern or names on the spot')}>
            <span aria-hidden="true">🎲</span> {L(lang, 'Improvisar', 'Improvise')}
          </button>
          <button type="button" className="mesa-btn tn-act" aria-haspopup="dialog" onClick={() => setSheet('recap')}>
            <span aria-hidden="true">📜</span> {L(lang, 'Anteriormente em…', 'Previously on…')}
          </button>
          <button type="button" className="mesa-btn tn-act" disabled={busy || !party.length} onClick={async () => {
            if (await ask(L(lang, 'Aplicar descanso curto em todos os personagens da mesa?', 'Apply a short rest to the whole party?'), L(lang, 'Aplicar', 'Apply'))) {
              act(async () => { await api.campaignShortRestAll(campaign.id); }, L(lang, 'Descanso curto aplicado.', 'Short rest applied.'));
            }
          }}><span aria-hidden="true">☕</span> {L(lang, 'Descanso curto (mesa)', 'Short rest (party)')}</button>
          <button type="button" className="mesa-btn tn-act" disabled={busy || !party.length} onClick={async () => {
            if (await ask(L(lang, 'Aplicar descanso longo em todos os personagens da mesa?', 'Apply a long rest to the whole party?'), L(lang, 'Aplicar', 'Apply'))) {
              act(async () => { await api.campaignLongRestAll(campaign.id); }, L(lang, 'Descanso longo aplicado.', 'Long rest applied.'));
            }
          }}><span aria-hidden="true">🛌</span> {L(lang, 'Descanso longo (mesa)', 'Long rest (party)')}</button>
          <button type="button" className="mesa-btn tn-act" onClick={openGrimoire}><span aria-hidden="true">📖</span> {L(lang, 'Abrir Grimório', 'Open Grimoire')}</button>
        </div>
        <label className="tn-toggle">
          <input type="checkbox" checked={wizardOn} disabled={busy}
            onChange={e => {
              const on = e.target.checked;
              setWizardLocal(on);
              act(async () => {
                try { await saveState({ endOfEncounterWizard: stateWithWizard(campaign.state, on).endOfEncounterWizard }); } catch (err) { setWizardLocal(null); throw err; }
              }, on ? L(lang, 'Fim de encontro guiado ligado.', 'Guided wrap-up on.') : L(lang, 'Fim de encontro guiado desligado.', 'Guided wrap-up off.'));
            }} />
          <span>
            <strong>{L(lang, 'Fim de encontro guiado', 'Guided end of encounter')}</strong>
            <span className="tn-toggle-hint">{L(lang,
              'Ao encerrar o combate: XP, descanso, tesouro e nota no Diário (tudo opcional).',
              'When combat ends: XP, rest, treasure and a Diary note (all optional).')}</span>
          </span>
        </label>
        {msg && <p className="tn-msg" role="status">{msg}</p>}
      </section>

      <InScenePanel campaign={campaign} lang={lang} goTo={goTo} />
    </>
  );

  return (
    <div className={`table-now ${active ? 'has-turn' : ''}`}>
      <div className="tn-col tn-col-main">{main}</div>
      <div className="tn-col tn-col-side">{side}</div>
      {/* o plano por último; no desktop ocupa as 2 colunas embaixo (grid-area: plan) */}
      <SessionPlanPanel campaign={campaign} lang={lang} goTo={goTo} onSaveState={saveState} />

      {sheet === 'check' && (
        <GroupCheckPanel campaign={campaign} lang={lang} showList={false} asSheet onClose={closeSheet}
          onSent={(body) => { load(); flash(L(lang, `Pedido enviado: ${body?.label || ''}. Acompanhe em Testes.`, `Request sent: ${body?.label || ''}. Follow it in Checks.`)); }} />
      )}
      {sheet === 'recap' && <RecapCard campaign={campaign} lang={lang} autoDraft asSheet onClose={closeSheet} />}
      {sheet === 'improvise' && (
        <Suspense fallback={null}>
          <ImproviseModal campaignId={campaign.id} lang={lang} onClose={closeSheet}
            onSaved={(entry) => flash(L(lang, `Salvo no Mundo (oculto): ${entry?.name || ''}`, `Saved to the World (hidden): ${entry?.name || ''}`))} />
        </Suspense>
      )}
      {sheet === 'nudges' && (
        <MesaSheet title={L(lang, 'Avisos: o que avisar', 'Notices: what to flag')} icon="⚙" size="auto" width="md" lang={lang}
          onClose={closeSheet} className="nudge-settings-sheet"
          footer={<div className="mesa-actions"><button type="button" className="mesa-btn is-primary" onClick={closeSheet}>{L(lang, 'Pronto', 'Done')}</button></div>}>
          <NudgeSettings nudges={nudges} lang={lang} />
        </MesaSheet>
      )}
    </div>
  );
}

function PendingRow({ n, label, sub, onClick }) {
  if (!n) return null;
  return (
    <li>
      <button type="button" className="tn-pending-item" onClick={onClick}>
        <span className="tn-pending-n">{n}</span>
        <span className="tn-pending-text">
          <span>{n} {label}</span>
          {sub && <span className="tn-pending-sub">{sub}</span>}
        </span>
        <span className="tn-pending-go" aria-hidden="true">›</span>
      </button>
    </li>
  );
}

/** Campo da barra da cena que cresce com o texto (Cena e Clima quebram linha). */
function GrowField({ value, multiline, ...rest }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !multiline) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value, multiline]);
  return multiline
    ? <textarea ref={ref} rows={1} value={value} {...rest} />
    : <input ref={ref} value={value} {...rest} />;
}

/**
 * Sessão / cena / clima editáveis (salva ao sair do campo ou com Enter; Esc desfaz;
 * "✓" por 1,5 s; o polling não atropela o campo em edição).
 * Celular: uma linha compacta "🎭 Sessão 3 · Taverna… · ☁ Chuva"; o toque abre os
 * campos. Desktop (alwaysOpen): os campos sempre à vista.
 */
function SceneBar({ campaign, lang, onSave, alwaysOpen = false }) {
  const fields = [
    ['session', L(lang, 'Sessão', 'Session'), 'ex: 12'],
    ['scene', L(lang, 'Cena', 'Scene'), L(lang, 'ex: Taverna do Javali Cego', 'e.g.: Blind Boar Tavern')],
    ['weather', L(lang, 'Clima', 'Weather'), L(lang, 'ex: chuva fina', 'e.g.: drizzle')],
  ];
  const [vals, setVals] = useState(() => Object.fromEntries(fields.map(([k]) => [k, campaign.state?.[k] || ''])));
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState(null);
  const [open, setOpen] = useState(false);
  const st = campaign.state || {};
  useEffect(() => {
    // Atualiza com o que veio do servidor, sem atropelar o campo em edição.
    setVals(v => Object.fromEntries(fields.map(([k]) => [k, k === editing ? v[k] : (st[k] || '')])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.session, st.scene, st.weather, editing]);

  const commit = async (k) => {
    setEditing(null);
    if ((st[k] || '') === vals[k]) return;
    try { await onSave({ [k]: vals[k] }); setSaved(k); setTimeout(() => setSaved(s => (s === k ? null : s)), 1500); } catch { /* polling corrige */ }
  };
  const showFields = alwaysOpen || open || !!editing;
  const anything = vals.session || vals.scene || vals.weather;

  return (
    <section className={`mesa-panel tn-scene ${showFields ? 'is-open' : ''}`} aria-label={L(lang, 'Sessão, cena e clima', 'Session, scene and weather')}>
      {!alwaysOpen && (
        <button type="button" className="tn-scene-sum" aria-expanded={showFields} onClick={() => setOpen(o => !o)}>
          <span className="tn-scene-sum-ico" aria-hidden="true">🎭</span>
          <span className="tn-scene-sum-text">
            {anything ? (
              <>
                {vals.session && <span className="tn-scene-sum-session">{L(lang, 'Sessão', 'Session')} {vals.session}</span>}
                {vals.scene && <span className="tn-scene-sum-scene">{vals.scene}</span>}
                {vals.weather && <span className="tn-scene-sum-weather">☁ {vals.weather}</span>}
              </>
            ) : <span className="tn-scene-sum-empty">{L(lang, 'Sem cena ainda — toque para escrever', 'No scene yet — tap to write one')}</span>}
            {saved && <span className="tn-saved"> ✓ {L(lang, 'salvo', 'saved')}</span>}
          </span>
          <span className="tn-scene-sum-edit">
            <span aria-hidden="true">{showFields ? '▴' : '✎'}</span>
            <span>{showFields ? L(lang, 'Fechar', 'Close') : L(lang, 'Editar', 'Edit')}</span>
          </span>
        </button>
      )}
      {showFields && (
        <div className="tn-scene-fields">
          {fields.map(([k, label, ph]) => (
            <label key={k} className={`tn-scene-field tn-scene-${k}`}>
              <span className="tn-eyebrow">{label}{saved === k && <span className="tn-saved"> ✓</span>}</span>
              <GrowField className="tn-scene-input" value={vals[k]} placeholder={ph} maxLength={120} multiline={k !== 'session'}
                onFocus={() => setEditing(k)}
                onChange={e => setVals(v => ({ ...v, [k]: e.target.value.replace(/\n/g, ' ') }))}
                onBlur={() => commit(k)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
                  if (e.key === 'Escape') { setVals(v => ({ ...v, [k]: st[k] || '' })); setEditing(null); }
                }} />
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Faixa do combate. Ativo: presa no topo ao rolar — Rodada · Vez de (PV) ·
 * Próximo, [Próximo turno →] e [⚔ Combate] (abre Jogar › Combate; o toque no
 * nome também). Montado e parado: "Combate montado, parado", Fim de encontro
 * (com o guiado ligado) e Abrir combate.
 */
function CombatStrip({ combat, lang, active, wizardOn, onOpen, onNext, onWrapUp, busy }) {
  const list = combat.combatants || [];
  const cur = list[combat.turnIndex];
  let next = null;
  for (let i = 1; i <= list.length; i++) {
    const c = list[(combat.turnIndex + i) % list.length];
    if (c && !c.defeated && c.id !== cur?.id) { next = c; break; }
  }
  if (!active) {
    return (
      <div className="mesa-panel tn-combat is-idle">
        <span className="tn-combat-label">⚔ {L(lang, 'Combate montado, parado', 'Combat set up, paused')} · {list.length} {L(lang, 'combatentes', 'combatants')}</span>
        <div className="tn-combat-actions">
          {wizardOn && <button type="button" className="mesa-btn" onClick={onWrapUp}>{L(lang, 'Fim de encontro', 'Wrap up')}</button>}
          <button type="button" className="mesa-btn" onClick={onOpen}>{L(lang, 'Abrir combate', 'Open combat')} →</button>
        </div>
      </div>
    );
  }
  return (
    <div className="tn-turn-wrap">
      <div className="mesa-turn is-now tn-turn" role="region" aria-label={L(lang, 'Turno do combate', 'Combat turn')}>
        <button type="button" className="tn-turn-who" onClick={onOpen}
          aria-label={[
            `${L(lang, 'Rodada', 'Round')} ${combat.round}, ${L(lang, 'vez de', 'now acting')} ${cur?.name || '—'}`,
            cur && `${L(lang, 'PV', 'HP')} ${cur.current_hp}/${cur.stats?.max_hp ?? '?'}`,
            next && `${L(lang, 'Próximo', 'Next')}: ${next.name}`,
            L(lang, 'Abrir combate', 'Open combat'),
          ].filter(Boolean).join('. ')}>
          <span className="mesa-turn-label">{L(lang, 'Rodada', 'Round')} {combat.round} · {L(lang, 'Vez de', 'Now')}</span>
          <span className="tn-turn-name">{cur?.name || '—'}</span>
          {/* quebra em até 2 linhas: no celular o "Próximo: nome" desce inteiro (o · fica preso ao PV) */}
          <span className="tn-turn-sub">
            {cur && <span className="tn-turn-hp">{L(lang, 'PV', 'HP')} {cur.current_hp}/{cur.stats?.max_hp ?? '?'}</span>}
            {next && <span className="tn-turn-next">{cur ? ' · ' : ''}{L(lang, 'Próximo', 'Next')}: {next.name}</span>}
          </span>
        </button>
        <button type="button" className="mesa-btn tn-turn-open" onClick={onOpen} aria-label={L(lang, 'Abrir combate', 'Open combat')}>
          <span aria-hidden="true">⚔</span>
          <span className="tn-turn-open-word" aria-hidden="true">{L(lang, 'Combate', 'Combat')}</span>
          <span className="tn-turn-open-long" aria-hidden="true">{L(lang, 'Abrir combate', 'Open combat')}</span>
        </button>
        <button type="button" className="mesa-btn mesa-btn-lg is-primary tn-next" disabled={busy} onClick={onNext}>
          <span>{L(lang, 'Próximo turno', 'Next turn')}{' '}<span aria-hidden="true">→</span></span>
        </button>
      </div>
    </div>
  );
}

function PartyCard({ p, campaign, lang, onSaveState, onToggleInspiration }) {
  const d = p.data || {};
  const [editConc, setEditConc] = useState(false);
  const [concText, setConcText] = useState('');
  const conc = concentrationOf(campaign.state, { characterId: p.characterId, data: d });
  const pct = p.maxHp ? Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100)) : 0;
  const tone = p.hp != null && p.hp <= 0 ? 'down' : pct <= 25 ? 'crit' : pct <= 60 ? 'warn' : 'ok';
  const ac = safe(() => Utils.computeAc(d), d.armorClass);
  const pp = safe(() => Utils.passivePerception(d));
  const inv = safe(() => 10 + Utils.skillBonus(d, 'investigation'));
  const ins = safe(() => 10 + Utils.skillBonus(d, 'insight'));
  const slots = slotSummary(d);
  const conds = p.conditions.filter(c => c !== 'unconscious' || p.hp > 0);
  // Em combate as condições vêm do combatente; as da ficha aparecem junto, marcadas "ficha".
  const sheetConds = p.inCombat
    ? [...new Set((Array.isArray(d.conditions) ? d.conditions : []).filter(c => typeof c === 'string' && c && !p.conditions.includes(c)))]
    : [];
  const ds = p.deathSaves || {};
  const member = (campaign.members || []).find(m => m.character?.id === p.characterId);
  const stats = member ? memberStats(member) : null;

  const saveConc = async (spell) => {
    await onSaveState({ concentration: stateWithConcentration(campaign.state, `char:${p.characterId}`, spell).concentration });
    setEditConc(false); setConcText('');
  };

  return (
    <article className={`tn-card tone-${tone}`}>
      <header className="tn-card-head">
        <PcPortrait stats={stats} name={p.name} size={40} className="tn-card-pic" />
        <div className="tn-card-who">
          <strong className="tn-card-name">{p.name}</strong>
          <span className="tn-card-class">
            <span>{classLine(d, lang)}</span>
            {slots.length > 0 && (
              <span className="tn-slots" title={L(lang, 'Espaços de magia restantes / máximo', 'Spell slots left / max')}>
                <span className="tn-slots-label">{L(lang, 'Espaços', 'Slots')}</span>
                {slots.map(s => (
                  <span key={s.lvl} className={`tn-slot ${s.left === 0 ? 'empty' : ''}`}>{s.lvl}º <strong>{s.left}</strong>/{s.max}</span>
                ))}
              </span>
            )}
          </span>
        </div>
        <button type="button" className={`tn-insp ${d.inspiration ? 'on' : ''}`} onClick={onToggleInspiration}
          aria-pressed={!!d.inspiration} aria-label={L(lang, `Inspiração de ${p.name}`, `${p.name}'s inspiration`)}
          title={L(lang, 'Inspiração (toque para alternar)', 'Inspiration (tap to toggle)')}>
          <span aria-hidden="true">{d.inspiration ? '★' : '☆'}</span><span className="tn-insp-label" aria-hidden="true">{L(lang, 'Insp.', 'Insp.')}</span>
        </button>
      </header>

      <HpBar hp={p.hp} max={p.maxHp} temp={p.tempHp} lang={lang} units className="tn-hp" />

      <dl className="tn-stats">
        <div><dt>{L(lang, 'CA', 'AC')}</dt><dd>{ac ?? '—'}</dd></div>
        <div><dt>{L(lang, 'Percepção', 'Perception')}</dt><dd>{pp ?? '—'}</dd></div>
        <div><dt>{L(lang, 'Investigação', 'Investigation')}</dt><dd>{inv ?? '—'}</dd></div>
        <div><dt>{L(lang, 'Intuição', 'Insight')}</dt><dd>{ins ?? '—'}</dd></div>
      </dl>

      {p.hp != null && p.hp <= 0 && (
        <div className="tn-death">
          <span>{L(lang, 'Contra a morte', 'Death saves')}</span>
          <span className="tn-ds ok"><span className="tn-ds-word">{L(lang, 'sucessos', 'successes')}</span> <span aria-hidden="true">{'●'.repeat(ds.success || 0)}{'○'.repeat(Math.max(0, 3 - (ds.success || 0)))}</span><span className="tn-sr">{ds.success || 0}/3</span></span>
          <span className="tn-ds bad"><span className="tn-ds-word">{L(lang, 'falhas', 'failures')}</span> <span aria-hidden="true">{'●'.repeat(ds.fail || 0)}{'○'.repeat(Math.max(0, 3 - (ds.fail || 0)))}</span><span className="tn-sr">{ds.fail || 0}/3</span></span>
        </div>
      )}

      <div className="tn-card-extra">
        {conds.map(c => <span key={c} className="tn-cond">{condLabel(c, lang)}</span>)}
        {sheetConds.map(c => (
          <span key={`f-${c}`} className="tn-cond is-sheet" title={L(lang, 'Na ficha do jogador (ele muda na ficha)', "On the player's sheet (they change it there)")}>
            {condLabel(c, lang)} <em>{L(lang, 'ficha', 'sheet')}</em>
          </span>
        ))}
        <div className={`tn-conc ${editConc ? 'is-editing' : ''}`}>
          {editConc ? (
            <form className="tn-conc-form" onSubmit={e => { e.preventDefault(); saveConc(concText); }}>
              <input className="input" autoFocus value={concText} maxLength={80} onChange={e => setConcText(e.target.value)}
                placeholder={L(lang, 'Magia (ex.: Bênção)', 'Spell (e.g. Bless)')} aria-label={L(lang, 'Concentrando em', 'Concentrating on')} />
              <button type="submit" className="mesa-btn is-primary" disabled={!concText.trim()}>OK</button>
              <button type="button" className="mesa-icon-btn" onClick={() => setEditConc(false)} aria-label={L(lang, 'Cancelar', 'Cancel')}>✕</button>
            </form>
          ) : conc ? (
            <span className="tn-conc-on">
              <span>◎ {L(lang, 'Concentrando', 'Concentrating')}: <strong>{conc.spell}</strong></span>
              {!conc.fromSheet && (
                <button type="button" className="mesa-btn is-quiet tn-conc-end" onClick={() => saveConc('')}>{L(lang, 'encerrar', 'end')}</button>
              )}
            </span>
          ) : (
            <button type="button" className="mesa-btn is-quiet tn-conc-add" onClick={() => setEditConc(true)}>◎ {L(lang, 'marcar concentração', 'mark concentration')}</button>
          )}
        </div>
      </div>
    </article>
  );
}
