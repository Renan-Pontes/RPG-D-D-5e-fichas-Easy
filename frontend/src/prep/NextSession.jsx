import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage, isOldServer } from '../api/errors.js';
import { sceneView, sceneIcons, sceneMoments, closeScene } from './scene-model.js';
import {
  addScene, addSecret, updateItem, removeItem, toggleId, PLAN_STEPS,
  withSceneName, planHeading, initialStep, nextStepId, clueCount, realScene, freshSceneId,
  sceneFights, linkedAdventureIds,
} from './next-session.js';
import { nextStep, readSkips, reminderText, writeSkip } from '../shell/next-step.js';
import { inviteLink, screenLink } from '../shell/shell-logic.js';
import { useArea } from '../shell/useArea.js';
import { useTable } from '../play/table-store.js';
import useMedia from '../play/useMedia.js';
import { SIDE_MQ } from '../shell/MesaSheet.jsx';
import MoreMenu from '../group/MoreMenu.jsx';
import { createSampleWorld } from '../world/world-api.js';
import { loadRecap, RECAP_EVENT } from '../play/scene-actions.js';
import useRaioX from '../group/useRaioX.js';
import { momentSession, planMomentCount } from '../group/moment-words.js';
import { cachedInsights, insightsApi, rememberInsights, withDefaults } from '../group/insights-api.js';
import { useNextSessionSync } from './use-next-session-sync.js';
import { NextSessionDoors, NextSessionSidePanel, NextSessionStepsColumn, buildStepBodies } from './NextSessionSteps.jsx';
import NextSessionOverlays, { downloadPlan, useSettled } from './NextSessionOverlays.jsx';
import '../group/group-styles.css';
import './next-session.css';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
const WAIT_MS = 3000;
const FLASH_MS = 6000;

export default function NextSession({ campaign, lang, goTo }) {
  const { reload, startSession: startFromShell, onPlan, params: areaParams, clearParams } = useArea();
  const table = useTable();
  const desk = useMedia('(min-width: 1024px)');
  const sidePanel = useMedia(SIDE_MQ);
  const narrow = useMedia('(max-width: 767px)');
  const [logDiary, setLogDiary] = useState(true);
  const [flash, setFlash] = useState(null);
  const [open, setOpen] = useState(undefined);
  const [skips, setSkips] = useState(() => readSkips(campaign.id));
  const [idea, setIdea] = useState(0);
  const [busy, setBusy] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [entrySheet, setEntrySheet] = useState(null);
  const [reorder, setReorder] = useState(false);
  const [focusId, setFocusId] = useState(null);
  const flashTimer = useRef(null);
  const headingRef = useRef(null);
  const closed = campaign.status === 'closed';

  useEffect(() => () => clearTimeout(flashTimer.current), []);
  const say = useCallback((text, undo = null) => {
    clearTimeout(flashTimer.current);
    setFlash({ text, undo });
    flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
  }, []);

  const sync = useNextSessionSync({ campaign, lang, headingRef, logDiary, say, setBusy, setSheet, setOpen });
  const {
    plan, planRef, error, setError, saveState, oldPlan, lostPockets, world, setWorld, worldError,
    adventures, setAdventures, nodesByAdv, setNodesByAdv, asks, sceneSheet, setSceneSheet,
    details, nodesCache, loadPlan, loadWorld, loadAdventures, flush, change, loadEntry, createEntry,
    loadNodes, onRoomSaved, upsertWorld, onDiscover, doReveal, dismissAsk, removeWithUndo, startNewPlan,
  } = sync;

  const heading = useMemo(() => (plan ? planHeading(plan, campaign.state, lang) : null), [plan, campaign.state, lang]);
  headingRef.current = heading;

  const wantScene = areaParams?.sceneId || null;
  useEffect(() => {
    if (!wantScene || !plan) return;
    if (plan.scenes.some(x => x.id === wantScene)) { setOpen('scenes'); setSceneSheet({ id: wantScene, fresh: false }); }
    clearParams?.();
  }, [wantScene, !!plan]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!entrySheet) return;
    for (const a of (adventures || []).slice(0, 12)) if (!(a.id in nodesByAdv)) loadNodes(a.id).catch(() => {});
  }, [entrySheet, adventures]); // eslint-disable-line react-hooks/exhaustive-deps
  const entryAdventures = useMemo(() => (adventures || []).filter(a => nodesByAdv[a.id])
    .map(a => ({ id: a.id, name: a.name, nodes: nodesByAdv[a.id] })), [adventures, nodesByAdv]);

  const recapOf = heading ? (heading.live ? heading.n : heading.next) - 1 : 0;
  const [recap, setRecap] = useState(null);
  useEffect(() => {
    if (!(recapOf > 0)) { setRecap(null); return undefined; }
    let alive = true;
    loadRecap(campaign.id, recapOf).then(r => alive && setRecap(r)).catch(() => alive && setRecap(null));
    const on = (e) => {
      const d = e.detail || {};
      if (String(d.campaignId) === String(campaign.id) && Number(d.session) === recapOf && d.recap) setRecap(d.recap);
    };
    window.addEventListener(RECAP_EVENT, on);
    return () => { alive = false; window.removeEventListener(RECAP_EVENT, on); };
  }, [campaign.id, recapOf]);

  const party = (campaign.members || []).filter(m => m.role !== 'dm');
  const wantRx = party.some(m => m.character?.data);
  const rx = useRaioX(campaign.id, wantRx);
  const [waitOver, setWaitOver] = useState(false);
  const [insLocal, setInsLocal] = useState(null);
  useEffect(() => {
    const id = setTimeout(() => setWaitOver(true), WAIT_MS);
    return () => clearTimeout(id);
  }, [campaign.id]);
  const holdRx = wantRx && !rx && !waitOver;
  const insOk = !!rx && (!!insLocal || !!cachedInsights(campaign.id));
  const ins = insLocal || rx?.ins || null;
  const sheetsKey = party.map(m => `${m.character?.id}:${JSON.stringify(m.character?.data || null)}`).join('|');
  const raiox = useMemo(() => {
    if (!rx || !ins) return null;
    const all = rx.PM.partyMembers(campaign.members);
    const inIds = rx.PM.includedIds(all, ins.include, ins.exclude);
    const facts = rx.PM.partyFacts(all.filter(p => inIds.includes(p.id)), lang);
    const sug = rx.S.momentSuggestions(facts, { lang, dc: ins.dc, style: ins.style, axisOpts: { w: ins.w, base: ins.base } });
    return { facts, byId: Object.fromEntries(facts.map(f => [f.id, f])), sug };
  }, [rx, ins, sheetsKey, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const sceneIds = useMemo(() => new Set((plan?.scenes || []).filter(realScene).map(s => s.id)), [plan]);
  const momentsOf = (charId) => (ins?.spotlights?.[String(charId)] || []);
  const countSession = momentSession(campaign.state);
  const insights = useMemo(() => {
    if (!raiox || !insOk) return null;
    return {
      chars: raiox.facts.map(f => {
        const count = planMomentCount(momentsOf(f.id), { session: countSession, sceneIds });
        return {
          id: f.id, name: f.name, moments: count.total, noScene: count.noScene,
          ideas: rx.S.openSuggestions(raiox.sug[f.id] || [], momentsOf(f.id), ins.dismissed?.[String(f.id)] || []),
          style: (ins.style?.[String(f.id)] || []).map(x => rx.S.styleLabel(x, lang)),
        };
      }),
    };
  }, [raiox, insOk, ins, sceneIds, countSession, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMoments = async (charId, list) => {
    const key = String(charId);
    const before = ins;
    setInsLocal({ ...(ins || withDefaults({})), spotlights: { ...(ins?.spotlights || {}), [key]: list } });
    try {
      const server = await insightsApi.put(campaign.id, { spotlights: { [key]: list } });
      rememberInsights(campaign.id, server);
      setInsLocal(withDefaults(server));
      return true;
    } catch (e) {
      setInsLocal(before);
      say(isOldServer(e)
        ? t(lang, 'Os momentos precisam do servidor atualizado.', 'Moments need the updated server.')
        : `${t(lang, 'Não enviado', 'Not sent')}: ${errorMessage(e, lang)}`);
      return false;
    }
  };

  const advIds = useMemo(() => linkedAdventureIds(plan), [plan]);
  useEffect(() => {
    for (const id of advIds) if (!(id in nodesByAdv)) loadNodes(id).catch(() => {});
  }, [advIds.join(','), nodesByAdv, loadNodes]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownOnce = useRef(false);
  const holdNodes = !shownOnce.current && advIds.some(id => !(id in nodesByAdv)) && !waitOver;
  const fights = useMemo(() => sceneFights(plan, nodesByAdv), [plan, nodesByAdv]);
  useEffect(() => { if (plan) onPlan?.(plan); }, [plan, onPlan]);

  const computed = useMemo(() => (plan && adventures != null && !holdRx && !holdNodes ? nextStep({
    campaign, plan, pulse: table ? { tvLive: table.tvLive } : null, insights,
    adventures: adventures.length, fights, skips, idea, lang,
  }) : null), [campaign, plan, table?.tvLive, insights, adventures, fights, skips, idea, lang, holdRx, holdNodes]); // eslint-disable-line react-hooks/exhaustive-deps
  const [step, release] = useSettled(computed, (x) => (x ? `${x.id}:${x.text}` : ''));

  const ready = !!plan && adventures != null && !holdRx && !holdNodes;
  if (ready) shownOnce.current = true;
  const firstStep = () => initialStep(plan, step?.id || null) || (desk ? (plan.scenes.some(realScene) ? 'scenes' : 'party') : null);
  const shownOpen = open === undefined ? (ready ? firstStep() : null) : open;
  useEffect(() => { if (open === undefined && ready) setOpen(shownOpen); }, [open, ready, shownOpen]);
  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(focusId);
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setFocusId(null); }
  }, [focusId, plan, open]);

  const copy = async (text, ok) => {
    try { await navigator.clipboard.writeText(text); say(ok); }
    catch { say(t(lang, `Não deu para copiar. Copie à mão: ${text}`, `Could not copy. Copy it by hand: ${text}`)); }
  };
  const markOnboarding = async (flag) => {
    if (campaign.onboarding?.[flag]) return;
    try { await api.patchCampaign(campaign.id, { onboarding: { [flag]: true } }); reload?.(); } catch { /* ok */ }
  };
  const openStep = (id, focus = null) => {
    setOpen(id);
    if (focus) setFocusId(focus);
    else if (desk) setTimeout(() => document.querySelector('.ns.is-desk > .ns-side')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0);
    else setTimeout(() => document.getElementById(`ns-step-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);
  };
  const settleScene = (id) => {
    if (closed) return;
    const list = planRef.current?.scenes || [];
    const i = list.findIndex(x => x.id === id);
    if (i < 0) return;
    const r = closeScene(list[i], i, lang);
    if (r.action === 'remove') change(p => removeItem(p, 'scenes', id));
    else if (r.action === 'name') change(p => updateItem(p, 'scenes', id, { text: withSceneName(list[i].text, r.text) }));
  };
  const openScene = (id, fresh = false) => {
    if (sceneSheet && sceneSheet.id !== id) settleScene(sceneSheet.id);
    setSceneSheet({ id, fresh });
  };
  const addSceneAndFocus = () => {
    const id = freshSceneId(planRef.current.scenes);
    change(p => addScene(p, '', null, id));
    setOpen('scenes');
    openScene(id, true);
  };
  const addClueAndFocus = () => {
    const empty = planRef.current.secrets.find(s => !s.text && !s.ref);
    if (empty) { openStep('clues', `ns-clue-${empty.id}`); return; }
    const next = addSecret(planRef.current);
    if (next === planRef.current) return;
    change(() => next);
    openStep('clues', `ns-clue-${next.secrets[next.secrets.length - 1].id}`);
  };
  const skip = (s) => { release(); setSkips(writeSkip(campaign.id, s.id, s.sig)); };
  const startSession = async () => {
    await flush();
    if (startFromShell) { startFromShell(); return; }
    setBusy('startSession');
    try { await api.startDiarySession(campaign.id, {}); await reload?.(); goTo?.('play', 'scene'); }
    catch (e) { say(errorMessage(e, lang)); } finally { setBusy(null); }
  };
  const copyInvite = () => { copy(inviteLink(window.location.origin, campaign.inviteCode), t(lang, 'Link de convite copiado. Mande para a mesa.', 'Invite link copied. Send it to the table.')); markOnboarding('invite'); };
  const copyTv = () => { copy(screenLink(window.location.origin, campaign.screenToken), t(lang, 'Link da Tela copiado. Abra na TV.', 'Screen link copied. Open it on the TV.')); markOnboarding('tv'); };
  const onAction = async (id, s) => {
    if (id === 'invite') copyInvite();
    else if (id === 'share') {
      try { await navigator.share({ title: campaign.name, text: t(lang, `Entre na mesa “${campaign.name}”`, `Join the table “${campaign.name}”`), url: inviteLink(window.location.origin, campaign.inviteCode) }); markOnboarding('invite'); }
      catch { /* cancelado */ }
    } else if (id === 'start') openStep('start', 'ns-start');
    else if (id === 'scene') addSceneAndFocus();
    else if (id === 'clue') addClueAndFocus();
    else if (id === 'remind') {
      copy(reminderText({ names: s.payload.names, campaign: campaign.name, session: s.payload.session, link: window.location.origin, lang }),
        t(lang, 'Lembrete copiado. Cole no grupo da mesa.', 'Reminder copied. Paste it in your group chat.'));
    } else if (id === 'useIdea') setSheet({ kind: 'idea', step: s });
    else if (id === 'otherIdea') { release(); setIdea(i => i + 1); }
    else if (id === 'moments') setSheet({ kind: 'moments', charId: s.payload.charId });
    else if (id === 'tvLink') copyTv();
    else if (id === 'startSession') startSession();
    else if (id === 'newPlan') setSheet({ kind: 'newPlan' });
  };
  const openRewardItem = async () => {
    let items = [];
    try { items = (await api.campaignItems(campaign.id)).items || []; } catch { /* ok */ }
    setSheet({ kind: 'rewardItem', items });
  };
  const afterFill = async (filledMsg, emptyMsg) => {
    try {
      const p = await loadPlan();
      setOpen(p.scenes.some(realScene) ? 'scenes' : 'start');
      say(p.scenes.some(realScene) ? filledMsg : emptyMsg);
    } catch (e) { setError(errorMessage(e, lang)); }
    loadWorld(); loadAdventures(); nodesCache.current.clear(); setNodesByAdv({});
  };
  const onReadyImported = async (r) => {
    await flush();
    afterFill(
      t(lang, `Plano preenchido com “${r?.name || '…'}”: cenas, pistas e pessoas.`, `Plan filled from “${r?.name || '…'}”: scenes, clues and people.`),
      t(lang, `“${r?.name || '…'}” está em Aventuras. O plano já tinha conteúdo e ficou como estava.`, `“${r?.name || '…'}” is in Adventures. The plan already had content and was kept.`));
  };
  const doSample = async () => {
    setBusy('sample');
    try {
      await flush();
      await createSampleWorld(campaign.id, lang);
      await afterFill(
        t(lang, 'Vale de Brumafria criado: o plano ganhou 2 cenas de exemplo.', 'Mistfrost Vale created: the plan got 2 example scenes.'),
        t(lang, 'Vale de Brumafria criado no Mundo e nas Aventuras.', 'Mistfrost Vale created in the World and Adventures.'));
    } catch (e) { say(errorMessage(e, lang)); } finally { setBusy(null); }
  };
  const stepByStep = () => { release(); if (step?.id === 'N2') setSkips(writeSkip(campaign.id, 'N2', step.sig)); openStep('party'); };

  if (!ready) {
    return (
      <div className="ns">
        {error ? <p className="prep-error" role="alert">{error}</p> : <p className="muted" role="status">{t(lang, 'Carregando o plano…', 'Loading the plan…')}</p>}
      </div>
    );
  }

  const saveText = { saved: t(lang, '✓ Salvo', '✓ Saved'), dirty: t(lang, 'Alterado…', 'Edited…'), saving: t(lang, 'Salvando…', 'Saving…'), error: t(lang, 'Erro ao salvar', 'Save failed'), lost: t(lang, '⚠ Só o nome ficou', '⚠ Only the name was kept') }[saveState];
  const totalMoments = insights ? insights.chars.reduce((n, c) => n + c.moments, 0) : null;
  const clues = clueCount(plan);
  const firstNames = raiox ? Object.fromEntries(raiox.facts.map(f => [f.id, rx.PM.firstName(f.name)])) : {};
  const roomOf = (sc) => (sc.nodeRef ? (nodesByAdv[sc.nodeRef.adventureId] || []).find(n => n.id === sc.nodeRef.nodeId) || null : null);
  const sceneInfo = (sc) => {
    const room = roomOf(sc);
    const v = sceneView(sc, room, { world });
    return { icons: sceneIcons(v, { lang, moments: sceneMoments(sc, ins?.spotlights || {}), names: firstNames }), room: room?.name || null, image: !!v.show };
  };
  const withImage = plan.scenes.filter(realScene).filter(sc => sceneInfo(sc).image).length;
  const handyIds = [...plan.npcIds, ...plan.placeIds];
  const toggleHandy = (id) => {
    const e = (world || []).find(x => x.id === id);
    const key = plan.placeIds.includes(id) || e?.kind === 'place' ? 'placeIds' : 'npcIds';
    change(p => toggleId(p, key, id));
  };
  const again = !heading.live && !heading.stale && !!plan.forSession;
  const newPlanTitle = again
    ? t(lang, `↻ Recomeçar o plano da Sessão ${heading.next}`, `↻ Restart the session ${heading.next} plan`)
    : t(lang, `↻ Começar o plano da Sessão ${heading.next}`, `↻ Start the session ${heading.next} plan`);
  const menu = [
    { id: 'ready', label: t(lang, '📖 Usar uma aventura pronta', '📖 Use a ready adventure'), onSelect: () => setSheet({ kind: 'ready' }), hidden: closed },
    { id: 'archived', label: t(lang, '🗂 Ver planos arquivados', '🗂 See archived plans'), hint: t(lang, 'Na Crônica, cada sessão tem ⋯ › Ver o plano desta sessão, com Restaurar.', 'In the Chronicle, each session has ⋯ › See this session’s plan, with Restore.'), onSelect: () => goTo?.('group', 'chronicle'), hidden: !goTo },
    { id: 'export', label: t(lang, '⇩ Exportar o plano (JSON)', '⇩ Export the plan (JSON)'), onSelect: () => downloadPlan(plan, campaign, heading) },
    { id: 'new', label: newPlanTitle, hint: t(lang, 'Guarda este plano na Crônica e começa o novo: com o que sobrou ou do zero.', 'Keeps this plan in the Chronicle and starts the new one: with what is left or from scratch.'), onSelect: () => setSheet({ kind: 'newPlan' }), hidden: closed },
  ];

  const body = buildStepBodies({
    plan, lang, campaign, heading, party, raiox, insights, rx, closed, reorder, setReorder,
    narrow, world, worldError, handyIds, sceneInfo, toggleHandy, createEntry, openEntry: (e) => setEntrySheet(e.id),
    addSceneAndFocus, openScene, clues, asks, logDiary, setLogDiary, loadEntry, onDiscover,
    doReveal, dismissAsk, removeWithUndo, addClueAndFocus, openRewardItem, openStep, copyInvite,
    copy, setSheet, change, goTo,
  });
  const doors = step?.doors ? <NextSessionDoors lang={lang} worldCount={(world || []).length} world={world} busy={busy} onReady={() => setSheet({ kind: 'ready' })} onStepByStep={stepByStep} onSample={doSample} /> : null;
  const goNext = (id) => {
    const nx = nextStepId(id);
    if (nx) { openStep(nx); return; }
    setOpen(null);
    setTimeout(() => document.getElementById('ns-ready')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);
  };
  const sideStep = desk ? PLAN_STEPS.find(s => s.id === shownOpen) : null;
  const sheetSide = !!sceneSheet && sidePanel;

  return (
    <div className={`ns ${desk ? 'is-desk' : ''} ${desk && sheetSide ? 'has-sheet' : ''}`.trim()}>
      <div className="ns-main">
        <header className="ns-head">
          <div className="ns-head-text">
            <h2 className="ns-title">{heading.title}</h2>
            {heading.line && <p className={`ns-head-line ${heading.stale ? 'is-warn' : ''}`}>{heading.line}</p>}
          </div>
          <span className={`ns-save s-${saveState}`} role="status">{saveText}</span>
          <MoreMenu items={menu} lang={lang} label={t(lang, 'Mais ações do plano', 'More plan actions')} sheetTitle={t(lang, 'Plano', 'Plan')} />
        </header>
        {closed && <p className="ns-note">{t(lang, 'Campanha encerrada: o plano fica só para ler.', 'Campaign closed: the plan is read-only.')}</p>}
        {error && <p className="prep-error" role="alert">{error} <button type="button" className="mesa-btn is-quiet" onClick={() => setError('')}>ok</button></p>}
        <NextSessionStepsColumn step={step} lang={lang} busy={busy} onAction={onAction} onSkip={skip} doors={doors} desk={desk} sheetSide={sheetSide}
          shownOpen={shownOpen} plan={plan} party={party} totalMoments={totalMoments} setOpen={setOpen} goNext={goNext} body={body}
          heading={heading} closed={closed} withImage={withImage} recap={recap} recapOf={recapOf} insights={insights} setSheet={setSheet}
          openStep={openStep} campaign={campaign} table={table} copyTv={copyTv} startSession={startSession} goTo={goTo} />
      </div>
      <NextSessionSidePanel desk={desk} sheetSide={sheetSide} sideStep={sideStep} body={body} goNext={goNext} lang={lang} />
      {flash && (
        <div className="ns-flash" role="status" aria-live="polite">
          <span>{flash.text}</span>
          {flash.undo && <button type="button" className="mesa-btn" onClick={() => { flash.undo(); setFlash(null); }}>↶ {t(lang, 'Desfazer', 'Undo')}</button>}
        </div>
      )}
      <NextSessionOverlays campaign={campaign} lang={lang} plan={plan} planRef={planRef} heading={heading} closed={closed} busy={busy}
        world={world} adventures={adventures} entryAdventures={entryAdventures} recapOf={recapOf} raiox={raiox} rx={rx} ins={ins}
        insights={insights} insOk={insOk} countSession={countSession} momentsOf={momentsOf} saveMoments={saveMoments} wantRx={wantRx}
        sheet={sheet} setSheet={setSheet} sceneSheet={sceneSheet} setSceneSheet={setSceneSheet} entrySheet={entrySheet} setEntrySheet={setEntrySheet}
        saveState={saveState} oldPlan={oldPlan} lostPockets={lostPockets} change={change} flush={flush} say={say} startNewPlan={startNewPlan}
        newPlanTitle={newPlanTitle} onReadyImported={onReadyImported} removeWithUndo={removeWithUndo} createEntry={createEntry}
        upsertWorld={upsertWorld} openEntry={(e) => setEntrySheet(e.id)} onRoomSaved={onRoomSaved} setWorld={setWorld}
        setAdventures={setAdventures} details={details} goTo={goTo} />
    </div>
  );
}
