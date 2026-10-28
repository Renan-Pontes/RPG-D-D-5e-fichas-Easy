// Jogar › Agora guiada (V7, especificação §4.4 e W3) — sucede a "Mesa agora" de antes
// (campaigns/TableNow.jsx virou só o invólucro). Jogar sem procurar:
//
// Celular, de cima para baixo (abaixo do segmentado preso):
//   1. faixa de ensaio (só com a sessão parada)
//   2. LINHA DE AÇÕES (48 px, sempre no mesmo lugar): 🎯 Pedir teste · 📺 Mostrar · ⋯ Ferramentas
//   3. PAINEL DO MOMENTO (120 px fixos: testes, pedidos, aprovações e perigos; MomentPanel)
//   4. no máximo 1 cartão "O que fazer agora" (J1–J6, shell/next-step.js) OU o cartão
//      CENA AGORA (SceneNowCard); com o combate montado e parado, a faixa dele antes
//   5. Cenas do plano (chips ✓ · ▶ · ○; o toque abre a cena numa folha com ▶ Começar)
//   6. Pistas e À mão (recolhível) + Anotações do plano
//   7. Grupo (os personagens) · 8. Avisos que não são de perigo + ⚙ Configurar
// PC (≥ 1024): a mesa à esquerda; à direita a janela da Tela encaixada, o painel do
// momento e os avisos.
//
// Uma fonte por recurso (§4.10): nenhum painel com polling próprio. O plano, o Mundo, a sala
// da cena ligada, os testes e o combate só são lidos ao abrir e quando a versão deles no
// pulso muda (useRevData); fora da casca (ou num servidor sem pulso), o polling de antes.
// A aventura inteira (com as imagens) só é lida ao abrir "da aventura ▸".
// Ensaio (sessão parada): "▶ Começar esta cena" vira "Ver esta cena (ensaio)" — destaca a
// cena só no aparelho, sem gravar `state.scene`; os 📺 vão à Tela de verdade.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { openGrimoireLink } from '../grimoire/link.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import GroupCheckPanel from '../checks/GroupCheckPanel.jsx';
import { buildCheckPayload, checkLabel } from '../checks/check-logic.js';
import { NudgeList, NudgeSettings, useNudges } from '../campaigns/NudgeList.jsx';
import { partyStatus } from '../campaigns/nudges.js';
import { isWizardEnabled, stateWithWizard } from '../campaigns/end-of-encounter.js';
import EndOfEncounterPanel from '../campaigns/EndOfEncounterPanel.jsx';
import { cachedInsights, insightsApi, loadInsightsOnce, rememberInsights } from '../group/insights-api.js';
import { emptyPlan, normalizePlan, revealBodyFor, toggleDiscovered } from '../prep/next-session.js';
import { fightToEncounter, sceneMoments } from '../prep/scene-model.js';
import { encounterCombatants } from '../prep/prep-graph.js';
import { loadRoom } from '../prep/prep-api.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import NextStepCard from '../shell/NextStepCard.jsx';
import { nextStep, readSkips, writeSkip } from '../shell/next-step.js';
import { screenLink } from '../shell/shell-logic.js';
import { useArea } from '../shell/useArea.js';
import { DockedScreen } from '../stage/ScreenWindow.jsx';
import { sendToStage, showOnStage } from '../stage/stage-api.js';
import RevealControl from '../world/RevealControl.jsx';
import ShowOnTable from '../stage/ShowOnTable.jsx';
import { getEntry, getSessionPlan, listWorld, revealEntry, saveSessionPlan, worldErrorText } from '../world/world-api.js';
import MomentPanel from './MomentPanel.jsx';
import { CombatStrip, PartyCard, PlanClues, SceneFields, ToolsSheet } from './NowParts.jsx';
import SceneNowCard from './SceneNowCard.jsx';
import {
  currentScene, nextSceneAfter, planChips, readRehearsal, readStartScene, recapShown, sceneName, scenePosition,
  sessionLength, sessionMeta, sessionTests, stateSessionNumber, writeRehearsal,
} from './now-model.js';
import { playPlanView } from './plan-model.js';
import { patchState } from './play-api.js';
import { addSceneAndBegin, beginScene, clearSceneNow, loadRecap, setSceneDone } from './scene-actions.js';
import { COMBAT_EVENT, useRevData, useTable } from './table-store.js';
import { flash } from './flash.js';
import useMedia from './useMedia.js';
import '../campaigns/combat-styles.css';
import '../campaigns/table-now.css';
import './now.css';

const ShowSheet = lazy(() => import('../stage/ShowSheet.jsx'));
const RecapCard = lazy(() => import('./RecapCard.jsx'));
const ImproviseModal = lazy(() => import('../world/ImproviseModal.jsx'));
const StartSessionSheet = lazy(() => import('./StartSessionSheet.jsx'));
const EntrySheet = lazy(() => import('../prep/EntrySheet.jsx'));
const AdventureNow = lazy(() => import('./AdventureNow.jsx'));
const DMCharacterEditor = lazy(() => import('../campaigns/DMCharacterEditor.jsx'));
const GiveItemModal = lazy(() => import('../campaigns/GiveItemModal.jsx'));

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

function openGrimoire() {
  if (openGrimoireLink('#grimorio')) return;
  if (/^#(grimorio|grimoire)$/i.test(window.location.hash)) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else window.location.hash = '#grimorio';
}

/**
 * tests      {checks, pendingRolls, loaded, reload} do PlayArea (a mesma busca do selo de
 *            Testes); sem ele (fora da casca), a Agora busca sozinha por versão
 * approvals  lista antiga (só o fallback manda)
 * turnStrip  fora da casca a faixa do turno ativo fica aqui; na casca ela mora na barra
 */
export default function NowPanel({ campaign, approvals, lang = 'pt', onChange, onNavigate, goTo: goToProp, turnStrip: ownStrip = true, tests: testsProp }) {
  const table = useTable();
  const area = useArea();
  const goTo = goToProp || area.goTo;
  const pulse = table?.pulse || null;
  const st = campaign.state || {};
  const live = pulse ? !!pulse.live : !!st.live;
  const closed = campaign.status === 'closed';
  const wide = useMedia('(min-width: 1024px)');
  const [sheet, setSheet] = useState(null);       // 'check' | 'show' | 'tools' | 'fields' | 'recap' | 'readRecap' | 'improvise' | 'nudges' | 'start' | 'sceneNow' | {peek} | {entry} | {reveal} | {edit} | {give}
  const [busy, setBusy] = useState('');
  const [pick, setPick] = useState(null);         // o que está no corpo do painel do momento
  const [skips, setSkips] = useState(() => readSkips(campaign.id));
  const [rehearse, setRehearseState] = useState(() => readRehearsal(campaign.id));
  const [ask, setAsk] = useState(null);           // "Revelar também no cartão?" de uma pista
  const [showWrapUp, setShowWrapUp] = useState(false);
  const [newName, setNewName] = useState('');
  const setRehearse = (id) => { setRehearseState(id); writeRehearsal(campaign.id, id); };

  // ---------------------------------------------------------------- dados, por versão do pulso
  const [planR, reloadPlan, setPlanR] = useRevData(pulse?.planRev ?? null,
    () => getSessionPlan(campaign.id).then(normalizePlan), { table, fallbackMs: 12000, key: String(campaign.id) });
  const plan = planR || null;
  const [worldR, , setWorldR] = useRevData(pulse?.worldRev ?? null,
    () => listWorld(campaign.id).then(r => r.entries || []), { table, fallbackMs: 15000, key: String(campaign.id) });
  const world = worldR || [];
  const [combatR, reloadCombat, setCombatR] = useRevData(pulse?.combat?.ver ?? null,
    () => api.getCombat(campaign.id).then(r => r.combat || null), { table, fallbackMs: 4000, key: String(campaign.id) });
  const combat = combatR;   // undefined = carregando
  // o combate completo que voltou de uma ação (barra da mesa, Próximo turno)
  useEffect(() => {
    const on = (e) => { if (String(e.detail?.campaignId) === String(campaign.id) && e.detail?.combat) setCombatR(e.detail.combat); };
    window.addEventListener(COMBAT_EVENT, on);
    return () => window.removeEventListener(COMBAT_EVENT, on);
  }, [campaign.id, setCombatR]);
  // os testes: os do PlayArea (o selo) ou, fora dele, uma busca por versão
  const [ownTests, reloadOwnTests] = useRevData(pulse?.checksRev ?? null, async () => {
    const [c, p] = await Promise.allSettled([api.listChecks(campaign.id), api.listPendingRolls(campaign.id)]);
    return { checks: c.status === 'fulfilled' ? (c.value.checks || []) : [], pendingRolls: p.status === 'fulfilled' ? (p.value.rolls || []) : [] };
  }, { table, fallbackMs: 4000, enabled: !testsProp, key: String(campaign.id) });
  const tests = testsProp || { checks: ownTests?.checks || [], pendingRolls: ownTests?.pendingRolls || [], loaded: ownTests !== undefined, reload: reloadOwnTests };
  const refreshTests = () => tests.reload?.();
  const refresh = useCallback(() => { onChange?.(); }, [onChange]);

  // a cena agora (ao vivo) ou a do ensaio (sessão parada)
  const sceneId = pulse ? pulse.sceneId : st.sceneId;
  const sceneNow = useMemo(() => (plan ? currentScene(plan, { sceneId, scene: pulse ? pulse.scene : st.scene }) : null), [plan, sceneId, pulse, st.scene]);
  const rehearsal = !live && rehearse ? (plan?.scenes || []).find(s => s.id === rehearse) || null : null;
  const shown = live ? sceneNow : rehearsal;
  const ref = shown?.nodeRef || null;
  const [node] = useRevData(pulse?.advRev ?? null,
    () => loadRoom(campaign.id, ref.adventureId, ref.nodeId).then(r => r.node || null),
    { table, fallbackMs: 30000, enabled: !!ref, key: ref ? `${ref.adventureId}:${ref.nodeId}` : '' });

  // os momentos (Raio-X): 1 leitura por campanha enquanto o app está aberto
  const [ins, setIns] = useState(() => cachedInsights(campaign.id));
  useEffect(() => {
    let alive = true;
    loadInsightsOnce(campaign.id).then(v => { if (alive) setIns(v); }).catch(() => { /* sem os momentos */ });
    return () => { alive = false; };
  }, [campaign.id]);
  const names = useMemo(() => Object.fromEntries((campaign.members || []).filter(m => m.character).map(m => [m.character.id, m.character.name])), [campaign.members]);
  const momentsOf = (scene) => (scene ? sceneMoments(scene, ins?.spotlights || {}) : []);

  // o resumo salvo da sessão anterior (J1, J3 e a folha Começar): 1 GET por sessão
  const cur = stateSessionNumber(st) || 0;
  const recapOf = live ? cur - 1 : cur;
  const [recap, setRecap] = useState(null);
  useEffect(() => {
    if (recapOf < 1) { setRecap({ has: false }); return undefined; }
    let alive = true;
    loadRecap(campaign.id, recapOf).then(r => alive && setRecap(r)).catch(() => alive && setRecap({ has: false }));
    return () => { alive = false; };
  }, [campaign.id, recapOf]);

  // aprovações: o número vem do pulso (ou da campanha); o tipo, 1 leitura quando o número muda
  const approvalsN = Array.isArray(approvals)
    ? approvals.filter(a => a.status === 'pending').length
    : (pulse?.counts?.approvals ?? Math.max(0, Number(campaign.pendingApprovals) || 0));
  const [levelups, setLevelups] = useState(null);
  useEffect(() => {
    if (Array.isArray(approvals)) { setLevelups(approvals.filter(a => a.status === 'pending' && a.type === 'levelup').length); return undefined; }
    if (!approvalsN) { setLevelups(0); return undefined; }
    let alive = true;
    api.listApprovals(campaign.id).then(r => {
      if (alive) setLevelups((r.approvals || []).filter(a => a.status === 'pending' && a.type === 'levelup').length);
    }).catch(() => alive && setLevelups(null));
    return () => { alive = false; };
  }, [campaign.id, approvalsN, approvals]);

  // ---------------------------------------------------------------- avisos e o grupo
  const party = partyStatus(campaign, combat);
  const nudges = useNudges({ campaign, combat, lang, onChange: () => { refresh(); reloadCombat(); } });
  const dangers = nudges.visible.filter(n => n.severity === 'danger');
  const notices = { ...nudges, visible: nudges.visible.filter(n => n.severity !== 'danger') };
  const [wizardLocal, setWizardLocal] = useState(null);
  const serverWizard = isWizardEnabled(st);
  useEffect(() => { setWizardLocal(null); }, [serverWizard]);
  const wizardOn = wizardLocal ?? serverWizard;
  const combatants = combat?.combatants || [];
  const active = !!combat?.active && combatants.length > 0;

  const saveState = async (patch) => { await patchState(campaign.id, patch); refresh(); };

  // ---------------------------------------------------------------- testes desta sessão
  const meta = sessionMeta(st);
  const since = pulse?.startedAt || meta.startedAt || null;
  const mine = useMemo(() => sessionTests({ checks: tests.checks, pendingRolls: tests.pendingRolls, since }), [tests.checks, tests.pendingRolls, since]);

  // ---------------------------------------------------------------- o cartão do topo
  const view = useMemo(() => playPlanView(plan || emptyPlan(), { entries: world }), [plan, world]);
  // o pulso cru traz as TVs em screen.tvLive; a barra da mesa soma as deste aparelho
  const step = plan ? nextStep({
    where: 'now', campaign, plan, live, sceneNow, lang, skips,
    pulse: pulse ? { ...pulse, tvLive: table?.tvLive ?? pulse.screen?.tvLive ?? 0 } : null,
    recap: recap ? { has: !!recap.has, shown: recapShown(st) } : null,
    startScene: readStartScene(campaign.id),
    length: sessionLength(meta.startedAt, meta.endedAt || pulse?.endedAt),
  }) : null;

  const copyTv = async () => {
    try { await navigator.clipboard?.writeText(screenLink(window.location.origin, campaign.screenToken)); } catch { /* ok */ }
    flash(L(lang, 'Link da Tela copiado. Abra na TV.', 'Screen link copied. Open it on the TV.'));
    if (!campaign.onboarding?.tv) api.patchCampaign(campaign.id, { onboarding: { tv: true } }).then(refresh).catch(() => {});
  };
  const openStart = () => (area.startSession ? area.startSession() : setSheet('start'));
  const findScene = (id) => (plan?.scenes || []).find(s => s.id === id) || null;

  const start = async (scene, opts = {}) => {
    if (!scene || closed) return;
    if (!live) { setRehearse(scene.id); setSheet(null); return; }   // ensaio: só no aparelho
    setBusy('start');
    try {
      await beginScene(campaign, scene, { lang, onDone: () => { refresh(); reloadPlan(); }, ...opts });
      setSheet(null);
    } finally { setBusy(''); }
  };

  const onStepAction = async (id, s) => {
    if (id === 'startSession') openStart();
    else if (id === 'tvLink') copyTv();
    else if (id === 'recap') goTo?.('group', 'chronicle', { recap: true });
    else if (id === 'preparePlan' || id === 'plan') goTo?.('prepare', 'next');
    else if (id === 'showRecap') {
      await sendToStage(campaign.id, () => showOnStage(campaign.id, { kind: 'recap', title: recap?.title || '', text: recap?.text || '' }),
        { lang, name: L(lang, 'Anteriormente em…', 'Previously on…'), onDone: refresh });
    } else if (id === 'readRecap') setSheet('readRecap');
    else if (id === 'startScene') start(findScene(s.payload?.sceneId));
    else if (id === 'startSceneLater') start(findScene(s.payload?.sceneId), { focus: false });
    else if (id === 'improvise') setSheet('improvise');
    else if (id === 'endSession') area.endSession?.();
    else if (id === 'sceneNow') { setNewName(''); setSheet('sceneNow'); }
  };

  // ---------------------------------------------------------------- ações do cartão Cena agora
  const askCheck = async (c, i) => {
    setBusy(`check:${i}`);
    try {
      const body = buildCheckPayload({ kind: c.kind, key: c.key, dc: Number.isInteger(c.dc) ? c.dc : '', dcHidden: !!c.dcHidden, advantage: 'normal', targets: [] }, lang);
      const r = await api.createCheck(campaign.id, body);
      if (r?.check?.id) setPick({ kind: 'check', id: r.check.id });
      if (navigator.vibrate) navigator.vibrate(20);
      flash(L(lang, `Pedido a todos: ${checkLabel(c, lang)}. As respostas chegam no painel.`, `Asked everyone: ${checkLabel(c, lang)}. Answers arrive in the panel.`));
      refreshTests();
    } catch (e) { flash(errorMessage(e, lang), { error: true }); } finally { setBusy(''); }
  };

  // ⚔ Começar o combate (sem a fatia do combate rápido: os monstros da cena e os personagens
  // que faltam entram no combate, e o app vai sozinho para Jogar › Combate)
  const startFight = async ({ fight, goOnly } = {}) => {
    if (goOnly || !fight?.length) { goTo?.('play', 'combat'); return; }
    if (combatants.length && !(await confirmDialog({ lang, confirmLabel: L(lang, 'Somar', 'Add'),
      message: L(lang, `Já há um combate montado (${combatants.length} combatentes). Os monstros desta cena entram junto.`, `There is already a combat set up (${combatants.length} combatants). This scene's monsters join it.`) }))) return;
    setBusy('fight');
    try {
      const [B, C] = await Promise.all([import('../../data/bestiary.js'), import('../combat/custom-monsters.js')]);
      const custom = C.loadCustomMonsters();
      const bodies = encounterCombatants({ encounter: fight.map(fightToEncounter) }, {
        resolve: (e) => B.findMonster(e.monsterId) || custom.find(m => m.id === e.monsterId) || e.snapshot || null,
        toCombat: B.monsterForCombat, lang,
      });
      if (!bodies.length) throw new Error(L(lang, 'monstros não encontrados no catálogo', 'monsters not found in the catalog'));
      const inFight = new Set(combatants.filter(c => c.type === 'pc').map(c => c.character_id));
      const pcs = (campaign.members || []).filter(m => m.role !== 'dm' && m.character && !inFight.has(m.character.id));
      for (const b of bodies) await api.addCombatant(campaign.id, b);
      for (const [i, m] of pcs.entries()) {
        await api.addCombatant(campaign.id, { type: 'pc', characterId: m.character.id, initiative: 10, position: { x: 100 + i * 60, y: 220 }, tokenScale: 1 });
      }
      flash(L(lang, `${bodies.length} monstro(s) e ${pcs.length} personagem(ns) no combate. Ajuste as iniciativas e ▶ Inicie.`, `${bodies.length} monster(s) and ${pcs.length} character(s) in combat. Adjust initiative and ▶ Start.`));
      goTo?.('play', 'combat');
    } catch (e) { flash(errorMessage(e, lang), { error: true }); } finally { setBusy(''); }
  };

  // ✓ Cena feita · próxima ▶ (com o "O momento aconteceu?" respondido antes)
  const doneScene = async ({ happened } = {}) => {
    const scene = shown;
    if (!scene) return;
    const next = nextSceneAfter(plan, scene.id);
    if (!live) { setRehearse(next?.id || null); return; }
    setBusy('done');
    try {
      if (happened) await markMoments(scene);
      if (next) await beginScene(campaign, next, { lang, onDone: () => { refresh(); reloadPlan(); } });
      else {
        const p = await setSceneDone(campaign, plan, scene.id, true);
        setPlanR(p);
        await clearSceneNow(campaign);
        flash(L(lang, `Cena feita: ${sceneName(scene)}`, `Scene done: ${sceneName(scene)}`), {
          action: { label: L(lang, '↶ Desfazer', '↶ Undo'), onClick: async () => {
            try { setPlanR(await setSceneDone(campaign, plan, scene.id, false)); await saveState({ scene: sceneName(scene), ...('sceneId' in st ? { sceneId: scene.id } : {}) }); }
            catch (e) { flash(errorMessage(e, lang), { error: true }); }
          } },
        });
        refresh();
      }
    } catch (e) { flash(errorMessage(e, lang), { error: true }); } finally { setBusy(''); }
  };
  const markMoments = async (scene) => {
    const list = momentsOf(scene).filter(m => m.moment.done == null);
    if (!list.length || !ins) return;
    const n = stateSessionNumber(st);
    const patch = {};
    for (const m of list) {
      const key = String(m.charId);
      const base = patch[key] || ins.spotlights?.[key] || [];
      patch[key] = base.map(x => (x.id === m.moment.id ? { ...x, done: n ?? 0 } : x));
    }
    try {
      const saved = await insightsApi.put(campaign.id, { spotlights: patch });
      rememberInsights(campaign.id, saved);
      setIns(cachedInsights(campaign.id));
    } catch (e) { flash(errorMessage(e, lang), { error: true }); }
  };

  // ---------------------------------------------------------------- cartões do Mundo
  const patchWorld = (full) => {
    if (!full) return;
    setWorldR(list => (list || []).map(e => (e.id === full.id ? { ...e, visibility: full.visibility, revealedAt: full.revealedAt, version: full.version } : e)));
  };
  const openReveal = async (entry) => {
    setBusy(`entry:${entry.id}`);
    try { setSheet({ reveal: await getEntry(entry.id) }); }
    catch (e) { flash(worldErrorText(e, lang), { error: true }); }
    finally { setBusy(''); }
  };
  const openEntry = (entry) => setSheet({ entry: entry.id });

  // ---------------------------------------------------------------- pistas
  const toggleClue = async (id) => {
    if (!plan) return;
    const { plan: next, ask: question } = toggleDiscovered(plan, id);
    setPlanR(next);
    try { setPlanR(normalizePlan(await saveSessionPlan(campaign.id, { secrets: next.secrets }))); }
    catch (e) { setPlanR(plan); flash(worldErrorText(e, lang), { error: true }); return; }
    if (!question) { if (ask?.secretItemId === id) setAsk(null); return; }
    try {
      const entry = await getEntry(question.entryId);
      const already = question.secretId ? entry?.secrets?.find(x => x.id === question.secretId)?.revealed : entry?.visibility === 'revealed';
      if (!already) setAsk({ ...question, entryName: entry?.name || '' });
    } catch { setAsk(question); }
  };
  const doReveal = async (logDiary) => {
    if (!ask) return;
    setBusy('reveal');
    try {
      await revealEntry(ask.entryId, revealBodyFor(ask, { logDiary, lang }));
      flash(L(lang, `Revelado aos jogadores em “${ask.entryName || '…'}”.`, `Revealed to the players on “${ask.entryName || '…'}”.`));
      setAsk(null);
    } catch (e) { flash(worldErrorText(e, lang), { error: true }); } finally { setBusy(''); }
  };
  const handy = useMemo(() => {
    const byId = new Map(world.map(e => [e.id, e]));
    return [...(plan?.npcIds || []), ...(plan?.placeIds || [])].map(id => byId.get(id)).filter(Boolean);
  }, [plan, world]);

  // ---------------------------------------------------------------- ⋯ Ferramentas
  const tool = async (id) => {
    if (id === 'improvise' || id === 'recap' || id === 'fields') { setSheet(id); return; }
    if (id === 'grimoire') { setSheet(null); openGrimoire(); return; }
    if (id === 'short' || id === 'long') {
      const msg = id === 'short'
        ? L(lang, 'Aplicar descanso curto em todos os personagens da mesa?', 'Apply a short rest to the whole party?')
        : L(lang, 'Aplicar descanso longo em todos os personagens da mesa?', 'Apply a long rest to the whole party?');
      if (!(await confirmDialog({ lang, message: msg, confirmLabel: L(lang, 'Aplicar', 'Apply') }))) return;
      setBusy(id);
      try {
        if (id === 'short') await api.campaignShortRestAll(campaign.id); else await api.campaignLongRestAll(campaign.id);
        flash(id === 'short' ? L(lang, 'Descanso curto aplicado.', 'Short rest applied.') : L(lang, 'Descanso longo aplicado.', 'Long rest applied.'));
        refresh();
      } catch (e) { flash(errorMessage(e, lang), { error: true }); } finally { setBusy(''); }
    }
  };
  const setWizard = async (on) => {
    setWizardLocal(on);
    try {
      await saveState({ endOfEncounterWizard: stateWithWizard(st, on).endOfEncounterWizard });
      flash(on ? L(lang, 'Fim de combate guiado ligado.', 'Guided wrap-up on.') : L(lang, 'Fim de combate guiado desligado.', 'Guided wrap-up off.'));
    } catch (e) { setWizardLocal(null); flash(errorMessage(e, lang), { error: true }); }
  };

  // Próximo turno fora da casca (a faixa de antes); na casca o turno mora na barra da mesa
  const nextTurn = () => {
    const expect = { round: combat.round, turnIndex: combat.turnIndex };
    if (table?.enabled) { table.nextTurn(expect); return; }
    api.combatNextTurn(campaign.id, expect).then(() => reloadCombat()).catch(e => flash(errorMessage(e, lang), { error: true }));
  };
  const strip = combat && combatants.length > 0 && (ownStrip || !active) ? (
    <CombatStrip combat={combat} lang={lang} active={active} wizardOn={wizardOn} busy={!!table?.busy}
      onOpen={() => goTo?.('play', 'combat')} onNext={nextTurn} onWrapUp={() => setShowWrapUp(true)} />
  ) : null;

  // ---------------------------------------------------------------- a página
  const chips = plan ? planChips(plan, live ? sceneNow?.id : rehearsal?.id) : [];
  const card = (live && sceneNow) || rehearsal ? (
    <SceneNowCard key={shown.id} campaign={campaign} lang={lang} scene={shown} node={node || null} world={world}
      moments={momentsOf(shown)} names={names} mode={live ? 'now' : 'rehearsal'} pos={scenePosition(plan, shown.id)}
      next={nextSceneAfter(plan, shown.id)} nextName={sceneName(nextSceneAfter(plan, shown.id)) || ''}
      combat={pulse?.combat || (combat ? { active: combat.active, round: combat.round } : null)} busy={busy} closed={closed}
      onEdit={() => setSheet('fields')} onFill={() => goTo?.('prepare', 'next', { sceneId: shown.id })}
      onAskCheck={askCheck} onStartFight={startFight} onDone={doneScene}
      onOpenEntry={openEntry} onRevealEntry={openReveal} onRevealed={patchWorld}
      adventurePanel={shown.nodeRef ? () => (
        <Suspense fallback={<p className="muted small">{L(lang, 'Carregando a aventura…', 'Loading the adventure…')}</p>}>
          <AdventureNow campaign={campaign} lang={lang} advId={shown.nodeRef.adventureId} nodeId={shown.nodeRef.nodeId} world={world}
            goTo={goTo} onWorldChange={patchWorld} onOpenEntry={openEntry} onChange={refresh} />
        </Suspense>
      ) : null} />
  ) : null;

  const moment = (
    <MomentPanel campaign={campaign} lang={lang} checks={mine.checks} rolls={mine.rolls}
      approvals={{ n: approvalsN, levelups }} dangers={dangers} nudges={nudges}
      pick={pick} onPick={setPick} ready={tests.loaded !== false} goTo={goTo} onChange={refreshTests} closed={closed} />
  );

  const noticesBox = (
    <section className="mesa-panel tn-box tn-nudges" aria-labelledby="now-nudges-h">
      <MesaTitle id="now-nudges-h"
        hint={notices.visible.length > 0 ? <span className="tn-count" aria-label={`(${notices.visible.length})`}>{notices.visible.length}</span> : null}
        act={<button type="button" className="mesa-btn is-quiet tn-nudge-cfg" aria-haspopup="dialog" onClick={() => setSheet('nudges')}>⚙ {L(lang, 'Configurar', 'Settings')}</button>}>
        {L(lang, 'Avisos', 'Notices')}
      </MesaTitle>
      {notices.visible.length > 0 && <p className="mesa-hint tn-nudge-hint">{L(lang, '“Dispensar” esconde só este aviso, neste aparelho. Os de perigo ficam no painel do momento.', '“Dismiss” hides only this notice, on this device. Danger notices sit in the moment panel.')}</p>}
      <NudgeList nudges={notices} lang={lang} />
    </section>
  );

  return (
    <div className={`table-now now ${active ? 'has-turn' : ''}`}>
      <div className="tn-col tn-col-main">
        {!live && !closed && (
          <div className="now-rehearsal" role="note">
            <p>{L(lang, 'Ensaio · a sessão não começou. O que você mostrar vai à Tela de verdade (bom para testar a TV).', 'Rehearsal · the session hasn\'t started. Whatever you show goes to the real screen (good for testing the TV).')}</p>
            <button type="button" className="mesa-btn is-primary" onClick={openStart}>▶ {L(lang, 'Começar a sessão', 'Start the session')}</button>
          </div>
        )}
        <div className="now-actions" role="group" aria-label={L(lang, 'Ações da mesa', 'Table actions')}>
          <button type="button" className="mesa-btn now-act" aria-haspopup="dialog" disabled={closed} onClick={() => setSheet('check')}>
            <span aria-hidden="true">🎯</span> {L(lang, 'Pedir teste', 'Ask a check')}
          </button>
          <button type="button" className="mesa-btn now-act" aria-haspopup="dialog" onClick={() => setSheet('show')}>
            <span aria-hidden="true">📺</span> {L(lang, 'Mostrar', 'Show')}
          </button>
          <button type="button" className="mesa-btn now-act" aria-haspopup="dialog" onClick={() => setSheet('tools')}>
            <span aria-hidden="true">⋯</span> {L(lang, 'Ferramentas', 'Tools')}
          </button>
        </div>
        {!wide && moment}
        {strip}
        {showWrapUp && combat && (
          <div className="tn-wrapup">
            <EndOfEncounterPanel campaign={campaign} combat={combat} lang={lang}
              onClose={() => setShowWrapUp(false)} onNavigate={onNavigate} onChange={() => { refresh(); reloadCombat(); }} />
          </div>
        )}
        {card || (step && (
          <NextStepCard step={step} lang={lang} onAction={onStepAction} busy={busy === 'start' ? 'startScene' : null}
            onSkip={(s) => setSkips(writeSkip(campaign.id, s.id, s.sig))} />
        ))}
        {!plan && <p className="muted small">{L(lang, 'Carregando o plano…', 'Loading the plan…')}</p>}

        {chips.length > 0 && (
          <section className="now-scenes" aria-labelledby="now-scenes-h">
            <p className="mesa-eyebrow" id="now-scenes-h">{L(lang, 'Cenas do plano', 'Plan scenes')}</p>
            <div className="now-chips">
              {chips.map(c => (
                <button key={c.id} type="button" className={`mesa-chip now-chip is-${c.status}`} aria-pressed={c.status === 'now'}
                  onClick={() => setSheet({ peek: c.id })}
                  aria-label={`${c.name}: ${{ now: L(lang, 'agora', 'now'), done: L(lang, 'feita', 'done'), open: L(lang, 'falta', 'to play') }[c.status]}`}>
                  <span aria-hidden="true">{c.icon}</span> {c.name}
                </button>
              ))}
            </div>
            {rehearsal && (
              <button type="button" className="mesa-btn is-quiet now-rehearse-off" onClick={() => setRehearse(null)}>✕ {L(lang, 'Sair do ensaio da cena', 'Leave the scene rehearsal')}</button>
            )}
          </section>
        )}

        {plan && <PlanClues campaign={campaign} lang={lang} view={view} handy={handy} ask={ask} busy={busy === 'reveal'} closed={closed}
          onToggleClue={toggleClue} onReveal={doReveal} onDismissAsk={() => setAsk(null)}
          onOpenEntry={openEntry} onRevealEntry={openReveal} onRevealed={patchWorld} onEditPlan={goTo ? () => goTo('prepare', 'next') : null} />}

        <section className="mesa-panel tn-party-box" aria-labelledby="now-party-h">
          <MesaTitle id="now-party-h" sub={party.length > 0 ? <span>{L(lang, 'Perícias passivas (10 + bônus) · espaços: restantes/máx.', 'Passive skills (10 + bonus) · slots: left/max.')}</span> : null}>
            {L(lang, 'Grupo', 'Party')}
          </MesaTitle>
          <div className="tn-party">
            {party.length === 0 && (
              <div className="tn-party-empty">
                <p>{L(lang, 'Nenhum personagem na mesa ainda. Convide os jogadores em Grupo › Jogadores.', 'No characters yet. Invite players in Party › Players.')}</p>
                {goTo && <button type="button" className="mesa-btn" onClick={() => goTo('group', 'players')}>🛡️ {L(lang, 'Ir para Grupo', 'Go to Party')}</button>}
              </div>
            )}
            {party.map(p => (
              <PartyCard key={p.characterId} p={p} campaign={campaign} lang={lang} onSaveState={saveState} closed={closed}
                onToggleInspiration={() => api.dmEditCharacter(p.characterId, { data: { inspiration: !p.data?.inspiration } }).then(refresh).catch(e => flash(errorMessage(e, lang), { error: true }))}
                onEdit={() => setSheet({ edit: { id: p.characterId, name: p.name, data: p.data } })}
                onLog={() => setSheet({ edit: { id: p.characterId, name: p.name, data: p.data, section: 'log' } })}
                onGive={() => setSheet({ give: { id: p.characterId, name: p.name } })}
                onRaioX={goTo ? () => goTo('group', 'insights', { focus: p.characterId }) : null} />
            ))}
          </div>
        </section>
        {!wide && noticesBox}
      </div>

      {wide && (
        <div className="tn-col tn-col-side">
          <DockedScreen campaign={campaign} lang={lang} />
          {moment}
          {noticesBox}
        </div>
      )}

      {sheet === 'check' && (
        <GroupCheckPanel campaign={campaign} lang={lang} showList={false} asSheet onClose={() => setSheet(null)} closeOnSend tvLive={table?.tvLive || 0}
          onSent={(body, check) => { if (check?.id) setPick({ kind: 'check', id: check.id }); refreshTests(); flash(L(lang, `Pedido enviado: ${body?.label || ''}. As respostas chegam no painel.`, `Request sent: ${body?.label || ''}. Answers arrive in the panel.`)); }} />
      )}
      {sheet === 'show' && (
        <Suspense fallback={null}>
          <ShowSheet campaign={campaign} stage={campaign.stage || st.stage} lang={lang} onClose={() => setSheet(null)} onChange={refresh}
            sceneNow={shown ? { id: shown.id, refs: (shown.nodeRef ? node?.refs : shown.refs) || [], show: shown.nodeRef ? null : shown.show || null } : null} />
        </Suspense>
      )}
      {sheet === 'tools' && (
        <ToolsSheet lang={lang} onClose={() => setSheet(null)} onPick={tool} wizardOn={wizardOn} onWizard={setWizard}
          busy={busy === 'short' || busy === 'long'} partyCount={party.length} closed={closed} />
      )}
      {sheet === 'fields' && (
        <MesaSheet title={L(lang, 'Sessão, cena e clima', 'Session, scene and weather')} icon="✎" size="auto" width="md" lang={lang} dock="bar"
          onClose={() => setSheet(null)} className="now-fields-sheet"
          footer={<div className="mesa-actions"><button type="button" className="mesa-btn is-primary" onClick={() => setSheet(null)}>{L(lang, 'Pronto', 'Done')}</button></div>}>
          <p className="mesa-sheet-text">{L(lang, 'O que a Mesa dos jogadores e a Tela mostram. Trocar o nome da cena aqui solta a cena do plano.', "What the players' Table and the screen show. Renaming the scene here unlinks it from the plan.")}</p>
          <SceneFields campaign={campaign} lang={lang} onSave={saveState} closed={closed} />
          {shown && goTo && (
            <button type="button" className="mesa-btn is-quiet" onClick={() => { setSheet(null); goTo('prepare', 'next', { sceneId: shown.id }); }}>
              ✎ {L(lang, 'Editar esta cena no Plano →', 'Edit this scene in the Plan →')}
            </button>
          )}
        </MesaSheet>
      )}
      {sheet === 'recap' && <Suspense fallback={null}><RecapCard campaign={campaign} lang={lang} autoDraft asSheet onClose={() => setSheet(null)} /></Suspense>}
      {sheet === 'readRecap' && (
        <MesaSheet title={recap?.title || L(lang, 'Anteriormente em…', 'Previously on…')} icon="📜" size="tall" width="md" lang={lang} dock="bar"
          onClose={() => setSheet(null)}
          footer={(
            <div className="mesa-actions">
              <ShowOnTable campaign={campaign} lang={lang} className="mesa-btn is-primary" target={{ kind: 'recap', title: recap?.title || '', text: recap?.text || '' }} onShown={refresh}>
                📺 {L(lang, 'Mostrar na Tela', 'Show on screen')}
              </ShowOnTable>
            </div>
          )}>
          <p className="now-recap-text">{recap?.text || ''}</p>
        </MesaSheet>
      )}
      {sheet === 'improvise' && (
        <Suspense fallback={null}>
          <ImproviseModal campaignId={campaign.id} lang={lang} onClose={() => setSheet(null)}
            onSaved={(entry) => flash(L(lang, `Salvo no Mundo (oculto): ${entry?.name || ''}`, `Saved to the World (hidden): ${entry?.name || ''}`))} />
        </Suspense>
      )}
      {sheet === 'nudges' && (
        <MesaSheet title={L(lang, 'Avisos: o que avisar', 'Notices: what to flag')} icon="⚙" size="auto" width="md" lang={lang}
          onClose={() => setSheet(null)} className="nudge-settings-sheet" dock="bar"
          footer={<div className="mesa-actions"><button type="button" className="mesa-btn is-primary" onClick={() => setSheet(null)}>{L(lang, 'Pronto', 'Done')}</button></div>}>
          <NudgeSettings nudges={nudges} lang={lang} />
        </MesaSheet>
      )}
      {sheet === 'start' && (
        <Suspense fallback={null}>
          <StartSessionSheet campaign={campaign} lang={lang} plan={plan || undefined} recap={recap?.has !== undefined ? recap : undefined}
            tvLive={table?.tvLive || 0} onClose={() => setSheet(null)} onStarted={() => { setSheet(null); refresh(); reloadPlan(); }} />
        </Suspense>
      )}
      {sheet === 'sceneNow' && (
        <MesaSheet title={L(lang, 'Cena agora', 'Scene now')} icon="＋" size="auto" width="sm" lang={lang} dock="bar" onClose={() => setSheet(null)}
          footer={(
            <div className="mesa-actions">
              <button type="button" className="mesa-btn mesa-btn-lg is-primary" disabled={!newName.trim() || busy === 'start'}
                onClick={async () => { setBusy('start'); try { await addSceneAndBegin(campaign, plan, newName, { lang, onDone: () => { refresh(); reloadPlan(); } }); setSheet(null); } finally { setBusy(''); } }}>
                ▶ {L(lang, 'Começar esta cena', 'Start this scene')}
              </button>
            </div>
          )}>
          <label className="mesa-field">
            <span className="mesa-field-label">{L(lang, 'Nome da cena', 'Scene name')}</span>
            <input className="input" autoFocus value={newName} maxLength={120} onChange={e => setNewName(e.target.value)}
              placeholder={L(lang, 'ex.: Briga no cais', 'e.g. Fight at the docks')} />
          </label>
          <p className="mesa-hint">{L(lang, 'A cena entra no plano de hoje e já começa (o nome vai à Mesa dos jogadores).', "The scene joins today's plan and starts right away (the name goes to the players' Table).")}</p>
        </MesaSheet>
      )}
      {sheet?.peek && (() => {
        const s = findScene(sheet.peek);
        if (!s) return null;
        const isNow = live && sceneNow?.id === s.id;
        return (
          <ScenePeek key={s.id} campaign={campaign} lang={lang} scene={s} plan={plan} world={world} table={table} live={live} isNow={isNow}
            moments={momentsOf(s)} names={names} busy={busy} closed={closed}
            onAskCheck={askCheck} onStartFight={(o) => { setSheet(null); startFight(o); }}
            onClose={() => setSheet(null)} onStart={() => start(s)}
            onToggleDone={async () => { try { setPlanR(await setSceneDone(campaign, plan, s.id, !s.done)); } catch (e) { flash(errorMessage(e, lang), { error: true }); } }}
            onOpenEntry={openEntry} onRevealEntry={openReveal} onRevealed={patchWorld} />
        );
      })()}
      {sheet?.entry && (
        <Suspense fallback={null}>
          <EntrySheet entryId={sheet.entry} campaign={campaign} world={world} plan={plan} lang={lang}
            onClose={() => setSheet(null)} onSaved={(e) => { patchWorld(e); }} onDeleted={() => setSheet(null)}
            onOpenEntry={(id) => setSheet({ entry: id })} onOpenMap={(id) => goTo?.('world', 'map', { mapId: id })} />
        </Suspense>
      )}
      {sheet?.reveal && (
        <MesaSheet title={sheet.reveal.name} icon="👁" dock="play" size="auto" width="md" lang={lang} onClose={() => setSheet(null)} className="ins-reveal"
          footer={(
            <div className="mesa-actions">
              <ShowOnTable campaign={campaign} lang={lang} className="mesa-btn" target={{ kind: 'card', entry: sheet.reveal }}
                onRevealed={(next) => { setSheet({ reveal: next }); patchWorld(next); }}>
                📺 {L(lang, 'Mostrar na Tela', 'Show on screen')}
              </ShowOnTable>
              <button type="button" className="mesa-btn is-primary" onClick={() => setSheet(null)}>{L(lang, 'Pronto', 'Done')}</button>
            </div>
          )}>
          {sheet.reveal.visibility === 'hidden' && (
            <p className="mesa-hint ins-reveal-hint">{L(lang, 'Oculto: o 📺 pergunta se vai só a imagem (sem o nome) ou se você revela antes.', 'Hidden: 📺 asks whether only the image goes (without the name) or whether you reveal it first.')}</p>
          )}
          <RevealControl entry={sheet.reveal} lang={lang} showSecrets onChange={(next) => { setSheet({ reveal: next }); patchWorld(next); }} />
        </MesaSheet>
      )}
      {sheet?.edit && (
        <Suspense fallback={null}>
          <DMCharacterEditor character={sheet.edit} lang={lang} initialSection={sheet.edit.section} onClose={() => setSheet(null)}
            onSaved={() => { flash(L(lang, `Ficha de ${sheet.edit.name} salva.`, `${sheet.edit.name}'s sheet saved.`)); setSheet(null); refresh(); }} />
        </Suspense>
      )}
      {sheet?.give && (
        <Suspense fallback={null}>
          <GiveItemModal campaign={campaign} character={sheet.give} lang={lang} onClose={() => setSheet(null)} onGiven={() => { setSheet(null); refresh(); }} />
        </Suspense>
      )}
    </div>
  );
}

/**
 * A folha de uma cena do plano (toque num chip de "Cenas do plano"): o que ela tem, com
 * ▶ Começar esta cena (ao vivo) ou "Ver esta cena (ensaio)" (sessão parada) e ✓ feita.
 * A sala da cena ligada é lida ao abrir (sem a imagem).
 */
function ScenePeek({ campaign, lang, scene, plan, world, live, isNow, moments, names, busy, closed, onClose, onStart, onToggleDone, onAskCheck, onStartFight, onOpenEntry, onRevealEntry, onRevealed }) {
  const ref = scene.nodeRef;
  const [node, setNode] = useState(null);
  useEffect(() => {
    if (!ref) return undefined;
    let alive = true;
    loadRoom(campaign.id, ref.adventureId, ref.nodeId).then(r => alive && setNode(r.node || null)).catch(() => { /* só o que é do plano */ });
    return () => { alive = false; };
  }, [campaign.id, ref?.adventureId, ref?.nodeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const touched = useRef(false);
  return (
    <MesaSheet title={sceneName(scene) || L(lang, 'Cena', 'Scene')} icon="🎭" size="tall" width="md" lang={lang} dock="bar" onClose={onClose}
      footer={(
        <div className="mesa-actions now-peek-foot">
          <button type="button" className="mesa-btn" disabled={closed || touched.current} onClick={() => { touched.current = true; onToggleDone(); onClose(); }}>
            {scene.done ? `↺ ${L(lang, 'Marcar como não feita', 'Mark as not done')}` : `✓ ${L(lang, 'Marcar feita', 'Mark done')}`}
          </button>
          {!isNow && (
            <button type="button" className="mesa-btn mesa-btn-lg is-primary" disabled={closed || busy === 'start'} onClick={onStart}>
              {busy === 'start' ? '…' : live ? `▶ ${L(lang, 'Começar esta cena', 'Start this scene')}` : L(lang, 'Ver esta cena (ensaio)', 'Preview this scene (rehearsal)')}
            </button>
          )}
        </div>
      )}>
      <SceneNowCard campaign={campaign} lang={lang} scene={scene} node={node} world={world} moments={moments} names={names}
        mode="peek" pos={scenePosition(plan, scene.id)} closed={closed} busy={busy}
        onAskCheck={onAskCheck} onStartFight={onStartFight} onOpenEntry={onOpenEntry} onRevealEntry={onRevealEntry} onRevealed={onRevealed} />
    </MesaSheet>
  );
}
