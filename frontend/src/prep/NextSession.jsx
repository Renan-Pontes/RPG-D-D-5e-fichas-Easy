import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, apiUrl } from '../api/client.js';
import { errorMessage, isOldServer } from '../api/errors.js';
import { tName } from '../../data/i18n.js';
import { prepApi, loadRooms } from './prep-api.js';
import { sceneView, sceneIcons, sceneMoments, closeScene, lightNode } from './scene-model.js';
import { partyLevels } from './prep-graph.js';
import {
  normalizePlan, addScene, addSecret, updateItem, removeItem, moveItem, toggleId, padSecrets,
  toggleDiscovered, revealBodyFor, planDiff, carryOver, textForRef, PLAN_LIMITS, PLAN_STEPS,
  sceneParts, withSceneName, planHeading, stepSummary, initialStep, nextStepId, stepLabel, clueCount,
  readyChecklist, planExport, realScene, freshSceneId, sceneFights, linkedAdventureIds, isOldPlanServer, patchHasPockets, droppedPockets,
  rewardWithItem, planSessionKey, planNeedsReload,
} from './next-session.js';
import { nextStep, prepSession, readSkips, reminderText, writeSkip } from '../shell/next-step.js';
import { inviteLink, screenLink } from '../shell/shell-logic.js';
import { useArea } from '../shell/useArea.js';
import { useTable } from '../play/table-store.js';
import useMedia from '../play/useMedia.js';
import NextStepCard from '../shell/NextStepCard.jsx';
import MesaSheet, { SIDE_MQ } from '../shell/MesaSheet.jsx';
import MoreMenu from '../group/MoreMenu.jsx';
import { WORLD_KINDS } from './prep-world.js';
// Ícones e nomes dos tipos vêm do Mundo, para casar com o Atlas (🧑 NPCs, ⚜️ Facções, 📜 Histórias).
import { kindIcon, kindLabel } from '../world/world-model.js';
import { archiveSessionPlan, createSampleWorld } from '../world/world-api.js';
import { carryText, leftoverCounts } from '../play/end-session.js';
import { loadRecap, RECAP_EVENT } from '../play/scene-actions.js';
import { toLight } from '../world/world-model.js';
import WorldRefs from './WorldRefs.jsx';
import ReadySheet from './ReadySheet.jsx';
import useRaioX from '../group/useRaioX.js';
import { momentLine, momentSession, planMoments, planMomentCount } from '../group/moment-words.js';
import { cachedInsights, insightsApi, rememberInsights, withDefaults } from '../group/insights-api.js';
import '../group/group-styles.css';
import './next-session.css';

// A folha da Cena (e o Escolher monstro, o bestiário…) só baixa quando a 1ª cena abre;
// o editor do cartão, quando o 1º chip abre.
const SceneSheet = lazy(() => import('./SceneSheet.jsx'));
const EntrySheet = lazy(() => import('./EntrySheet.jsx'));
// o resumo pendente da sessão anterior, escrito daqui (a linha dele no "Pronto para jogar")
const RecapEditor = lazy(() => import('../play/RecapEditor.jsx'));
// ⑤ Recompensas: escolher um item cadastrado (Preparar › Itens ou as regras básicas)
const ItemPickerModal = lazy(() => import('../items/ItemPickerModal.jsx'));

import { AccStep, PartyStep } from './SessionSummaryHeader.jsx';
import { ScenesStep, CluesStep } from './SceneChecklistDrawer.jsx';
import { ReadyToPlay, IdeaSheet, MomentsSheet } from './EncounterLauncher.jsx';
const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
// Quanto a página espera as contas do Raio-X e as salas das cenas ligadas junto com o
// plano (o cartão e o passo 1 nascem inteiros: a ideia de momento do N7 e o combate da
// sala do N5 não aparecem depois, debaixo do dedo).
const WAIT_MS = 3000;
const FLASH_MS = 6000;   // aviso curto e o "↶ Desfazer" de apagar cena/pista
const HANDY_KINDS = ['npc', 'faction', 'place'];

/**
 * Preparar › Plano — o Plano da Sessão N (especificação §3.2, W1): o cartão "O que fazer
 * agora" (N1–N9, shell/next-step.js; plano vazio = as 3 portas) e a sanfona de 5 passos
 * (① Quem joga · ② Como começa · ③ Cenas · ④ Pistas · ⑤ Recompensas e anotações), um
 * aberto por vez, os outros com o resumo de 1 linha. Salva sozinho em /session-plan
 * (700 ms, no máximo 3 s; merge por chave, as cenas por id). Abrir e sair não grava nada:
 * as linhas vazias de pista são só da tela. Nada é revelado sem o mestre pedir.
 * No PC (≥ 1024, P2): o índice dos passos à esquerda e o passo aberto à direita.
 * Nenhum polling: o plano é lido ao abrir e depois de uma porta (aventura pronta, exemplo).
 */
export default function NextSession({ campaign, lang, goTo }) {
  const { reload, startSession: startFromShell, onPlan, params: areaParams, clearParams } = useArea();
  const table = useTable();
  const desk = useMedia('(min-width: 1024px)');       // PC: 2 colunas (passos à esquerda, o passo aberto à direita)
  const sidePanel = useMedia(SIDE_MQ);                 // a folha da Cena vira painel à direita (≥ 1280)
  const narrow = useMedia('(max-width: 767px)');      // celular: À mão numa linha só
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('saved');
  const [oldPlan, setOldPlan] = useState(false);      // servidor de antes do Plano guiado: só o nome da cena fica
  const [lostPockets, setLostPockets] = useState([]); // bolsos novos que o servidor ainda não guarda (💰)
  const [world, setWorld] = useState(null);
  const [worldError, setWorldError] = useState(false);
  const [adventures, setAdventures] = useState(null);
  const [nodesByAdv, setNodesByAdv] = useState({});   // adventureId -> nodes (das cenas ligadas)
  const [asks, setAsks] = useState({}); // secretItemId -> ask
  const [logDiary, setLogDiary] = useState(true);
  const [flash, setFlash] = useState(null);           // {text, undo?}
  const [open, setOpen] = useState(undefined);        // passo aberto (undefined = ainda não decidido)
  const [skips, setSkips] = useState(() => readSkips(campaign.id));
  const [idea, setIdea] = useState(0);
  const [busy, setBusy] = useState(null);             // ação do cartão em andamento
  const [sheet, setSheet] = useState(null);           // {kind:'ready'} | {kind:'idea', step} | {kind:'moments', charId} | {kind:'newPlan'}
  const [sceneSheet, setSceneSheet] = useState(null); // {id, fresh}: a folha da Cena aberta
  const [entrySheet, setEntrySheet] = useState(null); // id do cartão aberto no editor (sem sair do Preparar)
  const [reorder, setReorder] = useState(false);
  const [focusId, setFocusId] = useState(null);       // campo a focar depois de criar (cena/pista)

  const planRef = useRef(null);
  const savedRef = useRef(null);
  const timer = useRef(null);
  const dirtySince = useRef(0);
  const dirty = useRef(false);
  const chain = useRef(Promise.resolve());
  const details = useRef(new Map()); // entryId -> entry completo (segredos)
  const flashTimer = useRef(null);
  const closed = campaign.status === 'closed';

  // ---------------------------------------------------------------- carga
  const loadPlan = useCallback(async () => {
    const r = await prepApi.getSessionPlan(campaign.id);
    setOldPlan(isOldPlanServer(r?.plan));
    const p = normalizePlan(r.plan);
    savedRef.current = p;
    planRef.current = padSecrets(p);
    dirty.current = false;
    setPlan(planRef.current);
    setSaveState('saved');
    return p;
  }, [campaign.id]);
  const loadWorld = useCallback(() => prepApi.listWorld(campaign.id)
    .then(r => { setWorld(r.entries || []); setWorldError(false); })
    .catch(() => { setWorld(w => w || []); setWorldError(true); }), [campaign.id]);
  const loadAdventures = useCallback(() => api.listAdventures(campaign.id)
    .then(r => setAdventures(r.adventures || [])).catch(() => setAdventures(a => a || [])), [campaign.id]);

  useEffect(() => {
    let alive = true;
    loadPlan().catch(e => { if (alive) { setError(errorMessage(e, lang)); setPlan(null); } });
    loadWorld();
    loadAdventures();
    return () => { alive = false; };
  }, [campaign.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- autosave
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    chain.current = chain.current.then(async () => {
      if (!planRef.current || !savedRef.current) return;
      const snapshot = planRef.current;
      dirty.current = false;
      const patch = planDiff(savedRef.current, snapshot);
      if (!Object.keys(patch).length) { setSaveState('saved'); return; }
      setSaveState('saving');
      try {
        const r = await prepApi.saveSessionPlan(campaign.id, patch);
        // servidor de antes do Plano guiado: o que ia dentro da cena não ficou. Nunca "✓ Salvo"
        // calado: o aviso diz (a folha da Cena já não deixa pôr, isto é a rede de baixo)
        const old = isOldPlanServer(r?.plan);
        setOldPlan(old);
        const lost = old && patchHasPockets(patch);
        const dropped = old ? [] : droppedPockets(patch, r?.plan);
        if (dropped.length) setLostPockets(l => [...new Set([...l, ...dropped])]);
        // o servidor marca de qual sessão é o plano (1ª gravação) e sobe o _rev
        const server = normalizePlan(r?.plan);
        const meta = { forSession: server.forSession || savedRef.current.forSession, _rev: server._rev };
        savedRef.current = { ...savedRef.current, ...patch, ...meta };
        if (planRef.current && (!planRef.current.forSession || planRef.current.forSession === snapshot.forSession)) {
          planRef.current = { ...planRef.current, ...meta };
          setPlan(planRef.current);
        }
        setSaveState(lost ? 'lost' : Object.keys(planDiff(savedRef.current, planRef.current)).length ? 'dirty' : 'saved');
        if (lost) {
          say(t(lang, 'O servidor ainda não guarda o que vai dentro da cena (ler, imagem, combate, teste, notas): falta atualizar. O nome da cena ficou salvo.',
            'The server cannot keep what goes inside a scene yet (read-aloud, image, combat, check, notes): it needs an update. The scene name was saved.'));
        } else if (dropped.includes('treasure')) {
          say(t(lang, 'O servidor ainda não guarda o tesouro da cena: falta atualizar. O resto da cena ficou salvo.',
            "The server cannot keep the scene's treasure yet: it needs an update. The rest of the scene was saved."));
        }
      } catch (e) {
        setSaveState('error');
        setError(errorMessage(e, lang));
      }
    });
    return chain.current;
  }, [campaign.id, lang]);

  const change = (fn) => {
    const next = fn(planRef.current);
    if (next === planRef.current) return;
    if (!dirty.current) { dirty.current = true; dirtySince.current = Date.now(); }
    planRef.current = next;
    setPlan(next);
    setSaveState('dirty');
    clearTimeout(timer.current);
    if (Date.now() - dirtySince.current > 3000) flush();
    else timer.current = setTimeout(flush, 700);
  };

  useEffect(() => () => { flush(); }, [flush]);
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flush); };
  }, [flush]);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  // F1.7: a sessão encerrou com o Plano aberto (■ Encerrar daqui ou de outro aparelho). O
  // servidor arquivou este plano e gravou o da próxima: o que está na tela é o arquivado. O
  // rascunho dele sai sem gravar (gravá-lo traria de volta a cena jogada) e o plano novo é
  // lido depois da gravação que estiver a caminho.
  const sessionKey = planSessionKey(campaign.state);
  const lastSessionKey = useRef(sessionKey);
  useEffect(() => {
    const prev = lastSessionKey.current;
    lastSessionKey.current = sessionKey;
    if (!planNeedsReload(prev, sessionKey) || !savedRef.current) return;
    clearTimeout(timer.current);
    dirty.current = false;
    planRef.current = padSecrets(savedRef.current);
    setSceneSheet(null); setAsks({});
    chain.current = chain.current.then(() => loadPlan()).catch(e => setError(errorMessage(e, lang)));
  }, [sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vindo de Jogar › Agora ("✎ Pôr coisas nela", "Editar esta cena no Plano"): a cena abre
  // na folha da Cena, com o passo ③ aberto atrás (V7).
  const wantScene = areaParams?.sceneId || null;
  useEffect(() => {
    if (!wantScene || !plan) return;
    if (plan.scenes.some(x => x.id === wantScene)) { setOpen('scenes'); setSceneSheet({ id: wantScene, fresh: false }); }
    clearParams?.();
  }, [wantScene, !!plan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aviso curto (1 por vez, 6 s), às vezes com "↶ Desfazer".
  const say = (text, undo = null) => {
    clearTimeout(flashTimer.current);
    setFlash({ text, undo });
    flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
  };
  const copy = async (text, ok) => {
    try { await navigator.clipboard.writeText(text); say(ok); }
    catch { say(t(lang, `Não deu para copiar. Copie à mão: ${text}`, `Could not copy. Copy it by hand: ${text}`)); }
  };
  const markOnboarding = async (flag) => {
    if (campaign.onboarding?.[flag]) return;
    try { await api.patchCampaign(campaign.id, { onboarding: { [flag]: true } }); reload?.(); } catch { /* não bloqueia */ }
  };

  // ---------------------------------------------------------------- Mundo
  const loadEntry = useCallback(async (entryId) => {
    if (details.current.has(entryId)) return details.current.get(entryId);
    const r = await prepApi.getEntry(entryId);
    details.current.set(entryId, r.entry);
    return r.entry;
  }, []);

  const createEntry = async (kind, name) => {
    const r = await prepApi.createEntry(campaign.id, { kind, name, visibility: 'hidden' });
    const e = r.entry;
    const light = { id: e.id, kind: e.kind, name: e.name, summary: e.summary || '', tags: e.tags || [], visibility: e.visibility, imageVer: e.imageVer || '', imageUrl: e.imageUrl || null, secretsCount: 0 };
    setWorld(w => [...(w || []), light]);
    return light;
  };

  // as salas das cenas ligadas, leves (sem textos nem imagens: GET …/nodes; o servidor
  // antigo cai na aventura inteira), 1 vez por aventura
  const nodesCache = useRef(new Map()); // adventureId -> Promise<salas leves>
  const loadNodes = useCallback((advId) => {
    if (!nodesCache.current.has(advId)) {
      const p = loadRooms(campaign.id, advId);
      // falhou (aventura apagada, sem rede): o N5 segue sem as salas dela; quem abrir a sala tenta de novo
      p.then(nodes => setNodesByAdv(m => ({ ...m, [advId]: nodes })))
        .catch(() => { nodesCache.current.delete(advId); setNodesByAdv(m => (advId in m ? m : { ...m, [advId]: [] })); });
      nodesCache.current.set(advId, p);
    }
    return nodesCache.current.get(advId);
  }, [campaign.id]);

  // tocar num chip (À mão, 🎭 Quem aparece) abre o editor do cartão numa folha, sem sair do Preparar
  const openEntry = (e) => setEntrySheet(e.id);
  // o "Aparece em" do editor lista as salas como no Mundo: as salas leves das aventuras
  // (as das cenas ligadas já vieram; as outras, 1 GET leve por aventura, ao abrir um cartão)
  useEffect(() => {
    if (!entrySheet) return;
    for (const a of (adventures || []).slice(0, 12)) if (!(a.id in nodesByAdv)) loadNodes(a.id).catch(() => {});
  }, [entrySheet, adventures]); // eslint-disable-line react-hooks/exhaustive-deps
  const entryAdventures = useMemo(() => (adventures || []).filter(a => nodesByAdv[a.id])
    .map(a => ({ id: a.id, name: a.name, nodes: nodesByAdv[a.id] })), [adventures, nodesByAdv]);

  // ---------------------------------------------------------------- pistas
  const onDiscover = async (id) => {
    const { plan: next, ask } = toggleDiscovered(planRef.current, id);
    change(() => next);
    if (!ask) { setAsks(a => { const c = { ...a }; delete c[id]; return c; }); return; }
    // Se o segredo já está revelado no cartão, não há o que perguntar.
    try {
      const entry = await loadEntry(ask.entryId);
      const already = ask.secretId
        ? entry.secrets?.find(s => s.id === ask.secretId)?.revealed
        : entry.visibility === 'revealed';
      if (already) return;
      setAsks(a => ({ ...a, [id]: { ...ask, entryName: entry.name, secretText: entry.secrets?.find(s => s.id === ask.secretId)?.text || '' } }));
    } catch {
      setAsks(a => ({ ...a, [id]: ask }));
    }
  };

  const doReveal = async (id) => {
    const ask = asks[id];
    if (!ask) return;
    try {
      const r = await prepApi.reveal(ask.entryId, revealBodyFor(ask, { logDiary, lang }));
      if (r?.entry) {
        details.current.set(ask.entryId, r.entry);
        setWorld(w => (w || []).map(e => (e.id === ask.entryId ? { ...e, visibility: r.entry.visibility } : e)));
      }
      setAsks(a => { const c = { ...a }; delete c[id]; return c; });
      say(t(lang, `Revelado aos jogadores em “${ask.entryName || '…'}”.`, `Revealed to the players on “${ask.entryName || '…'}”.`));
    } catch (e) { setError(errorMessage(e, lang)); }
  };
  const dismissAsk = (id) => setAsks(a => { const c = { ...a }; delete c[id]; return c; });

  // Apagar cena/pista não pergunta: "↶ Desfazer" por 6 s, que põe a foto de volta no lugar.
  const removeWithUndo = (key, item, label) => {
    const index = planRef.current[key].findIndex(x => x.id === item.id);
    if (key === 'secrets') dismissAsk(item.id);
    change(p => removeItem(p, key, item.id));
    say(label, () => change(p => {
      if (p[key].some(x => x.id === item.id)) return p;
      const list = [...p[key]];
      list.splice(Math.min(index, list.length), 0, item);
      return { ...p, [key]: list };
    }));
  };

  const heading = useMemo(() => (plan ? planHeading(plan, campaign.state, lang) : null), [plan, campaign.state, lang]);

  // "Pronto para jogar": o resumo da sessão anterior (o "Anteriormente em…" desta), lido 1 vez
  // ao abrir pela mesma fonte do J1 da Agora (sem polling); o salvo agora chega pelo evento
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

  // ⋯ › "Começar o plano da Sessão N" (V12): a folha pergunta Levar o que sobrou / Começar do
  // zero; o servidor arquiva este plano na Crônica (Ver o plano desta sessão, com Restaurar)
  // e grava o novo. Servidor de antes do arquivo: o plano novo sai daqui, como antes (o velho
  // não fica guardado; o aviso diz).
  const newSession = () => setSheet({ kind: 'newPlan' });
  const startNewPlan = async (carry) => {
    const n = heading?.next || 1;
    setBusy('newPlan');
    try {
      await flush();
      let r;
      try { r = await archiveSessionPlan(campaign.id, { carry, forSession: n }); }
      catch (e) {
        if (!isOldServer(e)) throw e;
        setAsks({}); setSheet(null);
        change(p => padSecrets(carryOver(p, n, { carry })));
        setOpen('scenes');
        say(t(lang, `Plano da Sessão ${n} começado. O servidor ainda não guarda o plano de antes (falta atualizar).`, `Session ${n} plan started. The server cannot keep the old plan yet (it needs an update).`));
        return;
      }
      const p = normalizePlan(r.plan);
      savedRef.current = p;
      planRef.current = padSecrets(p);
      dirty.current = false;
      setPlan(planRef.current);
      setSaveState('saved');
      setAsks({}); setSheet(null); setOpen('scenes');
      say(r.archived
        ? t(lang, `Plano da Sessão ${n} começado. O de antes ficou na Crônica: Sessão ${r.archived.session} › ⋯ › Ver o plano.`, `Session ${n} plan started. The old one is in the Chronicle: session ${r.archived.session} › ⋯ › See the plan.`)
        : t(lang, `Plano da Sessão ${n} começado.`, `Session ${n} plan started.`));
    } catch (e) { setError(errorMessage(e, lang)); } finally { setBusy(null); }
  };

  // ---------------------------------------------------------------- Raio-X (momentos, N7, passo 1)
  const party = (campaign.members || []).filter(m => m.role !== 'dm');
  const wantRx = party.some(m => m.character?.data);
  const rx = useRaioX(campaign.id, wantRx);
  const [waitOver, setWaitOver] = useState(false);
  const [insLocal, setInsLocal] = useState(null);     // os momentos gravados daqui (Usar a ideia, → Cena)
  useEffect(() => {
    const id = setTimeout(() => setWaitOver(true), WAIT_MS);
    return () => clearTimeout(id);
  }, [campaign.id]);
  const holdRx = wantRx && !rx && !waitOver;
  // servidor sem o Raio-X (ainda não atualizado): sem momentos gravados, a N7 não pede nada
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
  // a conta única dos momentos (F1.3): os que esperam, com ou sem cena, e os que aconteceram
  // hoje — a mesma do Raio-X, do "O que fazer agora" (N7) e do "Pronto para jogar"
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

  // N5: as cenas com combate (o bolso ⚔ da cena ou o encontro da sala ligada). As salas das
  // cenas ligadas vêm junto com o plano (1 GET por aventura, uma vez), não do passo ③ aberto.
  const advIds = useMemo(() => linkedAdventureIds(plan), [plan]);
  useEffect(() => {
    for (const id of advIds) if (!(id in nodesByAdv)) loadNodes(id).catch(() => {});
  }, [advIds.join(','), nodesByAdv, loadNodes]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownOnce = useRef(false);   // só a 1ª abertura espera: depois, a sala que chega troca o cartão (useSettled)
  const holdNodes = !shownOnce.current && advIds.some(id => !(id in nodesByAdv)) && !waitOver;
  const fights = useMemo(() => sceneFights(plan, nodesByAdv), [plan, nodesByAdv]);

  // a sala que a folha da Cena gravou: a linha leve dela (ícones da cena, N5) sem novo GET
  const onRoomSaved = useCallback((ref, node) => {
    if (!node) return;
    setNodesByAdv(m => (m[ref.adventureId]
      ? { ...m, [ref.adventureId]: m[ref.adventureId].map(n => (n.id === node.id ? lightNode(node) : n)) } : m));
  }, []);
  const upsertWorld = (light) => setWorld(w => {
    const l = w || [];
    const i = l.findIndex(e => e.id === light.id);
    if (i < 0) return [...l, light];
    const next = l.slice();
    next[i] = { ...l[i], ...light };
    return next;
  });

  // a casca põe o "!" em Preparar com o plano em branco (o Plano aberto avisa a cada mudança)
  useEffect(() => { if (plan) onPlan?.(plan); }, [plan, onPlan]);

  const computed = useMemo(() => (plan && adventures != null && !holdRx && !holdNodes ? nextStep({
    campaign, plan, pulse: table ? { tvLive: table.tvLive } : null, insights,
    adventures: adventures.length, fights, skips, idea, lang,
  }) : null), [campaign, plan, table?.tvLive, insights, adventures, fights, skips, idea, lang, holdRx, holdNodes]); // eslint-disable-line react-hooks/exhaustive-deps
  // O cartão que muda sozinho (a TV ligou, alguém entrou na mesa…) espera 600 ms depois do
  // último toque: o que está embaixo dele não sobe nem desce debaixo do dedo (princípio 8).
  // (o toque no próprio cartão — Pular, Outra ideia — troca na hora: `release`.)
  const [step, release] = useSettled(computed, (x) => (x ? `${x.id}:${x.text}` : ''));

  // o passo que abre ao entrar segue o cartão (decidido uma vez, no 1º desenho inteiro:
  // `shownOpen` já vale nesse desenho, e o efeito o guarda para o cartão mudar depois sem fechar nada)
  const ready = !!plan && adventures != null && !holdRx && !holdNodes;
  if (ready) shownOnce.current = true;
  // no PC a coluna da direita mostra o passo aberto: com cenas, abre nelas (P2); sem, no ①
  const firstStep = () => initialStep(plan, step?.id || null) || (desk ? (plan.scenes.some(realScene) ? 'scenes' : 'party') : null);
  const shownOpen = open === undefined ? (ready ? firstStep() : null) : open;
  useEffect(() => {
    if (open === undefined && ready) setOpen(shownOpen);
  }, [open, ready, shownOpen]);

  // depois de criar uma cena/pista, o campo dela ganha o foco (e rola até ele)
  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(focusId);
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setFocusId(null); }
  }, [focusId, plan, open]);

  const openStep = (id, focus = null) => {
    setOpen(id);
    if (focus) setFocusId(focus);
    // PC: o passo abre no painel da direita, que fica preso à vista (sticky): a página só rola
    // se o painel estiver fora da tela, e só o necessário. Celular: o passo sobe para o topo.
    else if (desk) setTimeout(() => document.querySelector('.ns.is-desk > .ns-side')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0);
    else setTimeout(() => document.getElementById(`ns-step-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);
  };
  // A cena que sai da folha sem nome: vazia some; com algo, ganha "Cena N" (o nome é obrigatório).
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
  // "＋ Cena" abre a folha da Cena com o nome em foco (o passo ③ fica aberto atrás)
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
    else if (id === 'newPlan') newSession();
  };

  // ⑤ "＋ Item cadastrado": os itens de Preparar › Itens (1 leitura ao tocar) e o seletor de sempre
  const openRewardItem = async () => {
    let items = [];
    try { items = (await api.campaignItems(campaign.id)).items || []; } catch { /* só as regras básicas */ }
    setSheet({ kind: 'rewardItem', items });
  };

  // ---------------------------------------------------------------- as 3 portas
  const afterFill = async (filledMsg, emptyMsg) => {
    try {
      const p = await loadPlan();
      setOpen(p.scenes.some(realScene) ? 'scenes' : 'start');
      say(p.scenes.some(realScene) ? filledMsg : emptyMsg);
    } catch (e) { setError(errorMessage(e, lang)); }
    loadWorld();
    loadAdventures();
    nodesCache.current.clear();
    setNodesByAdv({});
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
  const stepByStep = () => {
    release();
    if (step?.id === 'N2') setSkips(writeSkip(campaign.id, 'N2', step.sig));
    openStep('party');
  };

  // ---------------------------------------------------------------- desenho
  if (!ready) {
    return (
      <div className="ns">
        {error ? <p className="prep-error" role="alert">{error}</p> : <p className="muted" role="status">{t(lang, 'Carregando o plano…', 'Loading the plan…')}</p>}
      </div>
    );
  }

  const saveText = { saved: t(lang, '✓ Salvo', '✓ Saved'), dirty: t(lang, 'Alterado…', 'Edited…'), saving: t(lang, 'Salvando…', 'Saving…'), error: t(lang, 'Erro ao salvar', 'Save failed'), lost: t(lang, '⚠ Só o nome ficou', '⚠ Only the name was kept') }[saveState];
  const worldCount = (world || []).length;
  const totalMoments = insights ? insights.chars.reduce((n, c) => n + c.moments, 0) : null;
  const clues = clueCount(plan);
  // a linha de cada cena (③): os ícones do que ela tem, escritos; a cena ligada lê a sala leve
  const firstNames = raiox ? Object.fromEntries(raiox.facts.map(f => [f.id, rx.PM.firstName(f.name)])) : {};
  const roomOf = (sc) => (sc.nodeRef ? (nodesByAdv[sc.nodeRef.adventureId] || []).find(n => n.id === sc.nodeRef.nodeId) || null : null);
  const sceneInfo = (sc) => {
    const room = roomOf(sc);
    const v = sceneView(sc, room, { world });
    return { icons: sceneIcons(v, { lang, moments: sceneMoments(sc, ins?.spotlights || {}), names: firstNames }), room: room?.name || null, image: !!v.show };
  };
  const withImage = plan.scenes.filter(realScene).filter(sc => sceneInfo(sc).image).length;
  // ★ Momento na folha da Cena: o mesmo Raio-X já carregado aqui (ideias, estilo, gravar)
  const momentApi = raiox && insOk ? {
    facts: raiox.facts, firstName: rx.PM.firstName, kindIcon: rx.S.kindIcon,
    nameOf: (id) => raiox.byId[id]?.name || '?',
    styleOf: (id) => (ins?.style?.[String(id)] || []).map(x => rx.S.styleLabel(x, lang)),
    ideasFor: (id) => insights?.chars.find(c => c.id === id)?.ideas || [],
    dismissedOf: (id) => ins?.dismissed?.[String(id)] || [],
    momentsOf, accept: rx.S.acceptMoment, write: rx.S.writeMoment, save: saveMoments,
    spotlights: ins?.spotlights || {},
  } : null;
  const momentsNote = !wantRx
    ? t(lang, 'Os momentos vêm do Raio-X do grupo: precisam de personagens com ficha.', 'Moments come from the party X-ray: they need characters with sheets.')
    : !rx ? t(lang, 'Carregando o Raio-X do grupo…', 'Loading the party X-ray…')
      : t(lang, 'Os momentos precisam do servidor atualizado.', 'Moments need the updated server.');
  const handyIds = [...plan.npcIds, ...plan.placeIds];
  const toggleHandy = (id) => {
    const e = (world || []).find(x => x.id === id);
    const key = plan.placeIds.includes(id) || e?.kind === 'place' ? 'placeIds' : 'npcIds';
    change(p => toggleId(p, key, id));
  };
  // o plano já é o da sessão que vem (não jogada): o ⋯ recomeça este mesmo plano
  const again = !heading.live && !heading.stale && !!plan.forSession;
  const newPlanTitle = again
    ? t(lang, `↻ Recomeçar o plano da Sessão ${heading.next}`, `↻ Restart the session ${heading.next} plan`)
    : t(lang, `↻ Começar o plano da Sessão ${heading.next}`, `↻ Start the session ${heading.next} plan`);
  const menu = [
    { id: 'ready', label: t(lang, '📖 Usar uma aventura pronta', '📖 Use a ready adventure'), onSelect: () => setSheet({ kind: 'ready' }), hidden: closed },
    { id: 'archived', label: t(lang, '🗂 Ver planos arquivados', '🗂 See archived plans'),
      hint: t(lang, 'Na Crônica, cada sessão tem ⋯ › Ver o plano desta sessão, com Restaurar.', 'In the Chronicle, each session has ⋯ › See this session’s plan, with Restore.'),
      onSelect: () => goTo?.('group', 'chronicle'), hidden: !goTo },
    { id: 'export', label: t(lang, '⇩ Exportar o plano (JSON)', '⇩ Export the plan (JSON)'), onSelect: () => downloadPlan(plan, campaign, heading) },
    { id: 'new', label: newPlanTitle,
      hint: t(lang, 'Guarda este plano na Crônica e começa o novo: com o que sobrou ou do zero.', 'Keeps this plan in the Chronicle and starts the new one: with what is left or from scratch.'),
      onSelect: newSession, hidden: closed },
  ];

  const body = {
    party: (
      <PartyStep party={party} lang={lang} raiox={raiox} insights={insights} rx={rx} onInvite={copyInvite}
        onRemind={(names) => copy(reminderText({ names, campaign: campaign.name, session: prepSession(heading), link: window.location.origin, lang }),
          t(lang, 'Lembrete copiado. Cole no grupo da mesa.', 'Reminder copied. Paste it in your group chat.'))}
        onMoments={(charId) => setSheet({ kind: 'moments', charId })}
        onXray={goTo ? () => goTo('group', 'insights') : null} />
    ),
    start: (
      <div className="ns-start">
        <label className="ns-label" htmlFor="ns-start">{t(lang, 'Algo acontece no 1º minuto.', 'Something happens in the first minute.')}</label>
        <textarea id="ns-start" className="input ns-big" rows={3} maxLength={PLAN_LIMITS.long} value={plan.strongStart} disabled={closed}
          placeholder={t(lang, 'Ex.: o sino toca sozinho à meia-noite — e a água do poço começa a subir…', 'E.g. the bell rings by itself at midnight — and the well water starts to rise…')}
          onChange={e => change(p => ({ ...p, strongStart: e.target.value }))} />
      </div>
    ),
    scenes: (
      <ScenesStep plan={plan} lang={lang} closed={closed} reorder={reorder} setReorder={setReorder} narrow={narrow}
        world={world} worldError={worldError} handyIds={handyIds} sceneInfo={sceneInfo}
        onToggleHandy={toggleHandy} onCreateEntry={createEntry} onOpenEntry={openEntry}
        onAdd={addSceneAndFocus} onOpenScene={(id) => openScene(id)}
        onChange={(id, patch) => change(p => updateItem(p, 'scenes', id, patch))}
        onMove={(id, dir) => change(p => moveItem(p, 'scenes', id, dir))} />
    ),
    clues: (
      <CluesStep plan={plan} lang={lang} closed={closed} clues={clues} world={world} asks={asks} logDiary={logDiary}
        setLogDiary={setLogDiary} loadEntry={loadEntry} onCreateEntry={createEntry}
        onDiscover={onDiscover} onReveal={doReveal} onDismissAsk={dismissAsk}
        onChange={(id, patch) => change(p => updateItem(p, 'secrets', id, patch))}
        onMove={(id, dir) => change(p => moveItem(p, 'secrets', id, dir))}
        onRemove={(s) => removeWithUndo('secrets', s, t(lang, 'Pista apagada', 'Clue deleted'))}
        onAdd={addClueAndFocus} />
    ),
    rewards: (
      <div className="ns-rewards">
        <label className="ns-label" htmlFor="ns-rewards">{t(lang, 'Recompensas', 'Rewards')}</label>
        <textarea id="ns-rewards" className="input" rows={3} maxLength={PLAN_LIMITS.long} value={plan.rewards} disabled={closed}
          placeholder={t(lang, 'Ex.: 120 po no altar; a Lanterna da Maré; o favor da sacerdotisa', 'E.g. 120 gp on the altar; the Tide Lantern; the priestess’s favor')}
          onChange={e => change(p => ({ ...p, rewards: e.target.value }))} />
        {!closed && (
          <button type="button" className="mesa-btn ns-link-btn" onClick={openRewardItem}>＋ {t(lang, 'Item cadastrado', 'Saved item')}</button>
        )}
        <p className="ns-hint">{t(lang, 'O item escolhido entra numa linha das recompensas. Para pôr numa cena, use 💰 Tesouro na cena.', 'The chosen item goes on a line of the rewards. To put it in a scene, use 💰 Treasure in the scene.')}</p>
        {goTo && <button type="button" className="mesa-btn is-quiet ns-link-btn" onClick={() => goTo('prepare', 'items')}>{t(lang, 'Ver itens da campanha', 'See campaign items')} →</button>}
        <details className="ns-monsters" open={!!plan.monsters.trim()}>
          <summary className="ns-fold-sum"><span className="ns-fold-mark" aria-hidden="true">▸</span> {t(lang, 'Anotações de monstros (opcional)', 'Monster notes (optional)')}</summary>
          <textarea className="input" rows={3} maxLength={PLAN_LIMITS.long} value={plan.monsters} disabled={closed}
            aria-label={t(lang, 'Anotações de monstros', 'Monster notes')}
            placeholder={t(lang, 'Ex.: 4 goblins, 1 lobo atroz; o afogado do sino (chefe)', 'E.g. 4 goblins, 1 dire wolf; the drowned one of the bell (boss)')}
            onChange={e => change(p => ({ ...p, monsters: e.target.value }))} />
          <p className="ns-hint">{t(lang, 'Para um combate de verdade, use ⚔ Combate dentro da cena.', 'For a real fight, use ⚔ Combat inside the scene.')}</p>
          <button type="button" className="mesa-btn is-quiet ns-link-btn" onClick={() => openStep('scenes')}>⚔ {t(lang, 'Pôr um combate numa cena', 'Put a fight in a scene')} →</button>
          {goTo && <button type="button" className="mesa-btn is-quiet ns-link-btn" onClick={() => goTo('prepare', 'adventures')}>{t(lang, 'Montar combates nas Aventuras', 'Build combats in Adventures')} →</button>}
        </details>
      </div>
    ),
  };

  const doors = step?.doors ? (
    <ul className="ns-doors">
      <li><button type="button" className="ns-door" onClick={() => setSheet({ kind: 'ready' })}>
        <span className="ns-door-title">📖 {t(lang, 'Usar uma aventura pronta', 'Use a ready adventure')}</span>
        <span className="ns-door-sub">{t(lang, 'Cenas, pessoas, combates e imagens já prontos. 2 toques.', 'Scenes, people, fights and images ready. 2 taps.')}</span>
        <span className="ns-door-go" aria-hidden="true">›</span>
      </button></li>
      <li><button type="button" className="ns-door" onClick={stepByStep}>
        <span className="ns-door-title">✎ {t(lang, 'Montar a minha, passo a passo', 'Build my own, step by step')}</span>
        <span className="ns-door-sub">{t(lang, '5 passos curtos.', '5 short steps.')}</span>
        <span className="ns-door-go" aria-hidden="true">›</span>
      </button></li>
      <li><button type="button" className="ns-door" onClick={doSample} disabled={worldCount > 0 || world == null || busy === 'sample'}
        aria-describedby={worldCount > 0 ? 'ns-door-why' : undefined}>
        <span className="ns-door-title">✨ {busy === 'sample' ? t(lang, 'Criando o exemplo…', 'Creating the example…') : t(lang, 'Começar com um exemplo', 'Start with an example')}</span>
        <span className="ns-door-sub" id={worldCount > 0 ? 'ns-door-why' : undefined}>{worldCount > 0
          ? t(lang, 'Seu Mundo já tem cartões: o exemplo só entra num Mundo vazio.', 'Your World already has cards: the example only goes into an empty World.')
          : t(lang, 'Uma vila pronta para você mexer.', 'A village ready for you to play with.')}</span>
        <span className="ns-door-go" aria-hidden="true">›</span>
      </button></li>
    </ul>
  ) : null;

  const goNext = (id) => {
    const nx = nextStepId(id);
    if (nx) { openStep(nx); return; }
    setOpen(null);
    setTimeout(() => document.getElementById('ns-ready')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);
  };
  const sideStep = desk ? PLAN_STEPS.find(s => s.id === shownOpen) : null;
  const sheetSide = !!sceneSheet && sidePanel;   // a folha no painel da direita: o Plano numa coluna só

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

      {step && (
        <NextStepCard step={step} lang={lang} busy={busy} onAction={onAction} onSkip={skip}>
          {step.doors ? doors : null}
        </NextStepCard>
      )}

      <div className="ns-acc">
        {PLAN_STEPS.map(s => {
          // PC (P2) com a folha da Cena aberta: o Plano vira uma coluna só (a sanfona do
          // celular) à esquerda do painel; tocar noutra cena troca a folha
          const side = desk && !sheetSide;
          return (
            <AccStep key={s.id} id={s.id} n={s.n} lang={lang} open={shownOpen === s.id} side={side}
              summary={stepSummary(s.id, plan, { party, moments: totalMoments, lang })}
              onToggle={() => setOpen(shownOpen === s.id && !side ? null : s.id)}
              onNext={() => goNext(s.id)}>
              {side ? null : body[s.id]}
            </AccStep>
          );
        })}
      </div>

      <ReadyToPlay plan={plan} lang={lang} party={party} heading={heading} closed={closed} compact={!desk && !!shownOpen} withImage={withImage}
        primary={!step /* com o "O que fazer agora" na tela, o dourado é o dele */}
        recap={recap} recapOf={recapOf} moments={insights?.chars || null}
        onRecap={() => setSheet({ kind: 'recap' })} onStep={(id) => openStep(id)}
        tv={!!(campaign.onboarding?.tv || table?.tvLive)} busy={busy === 'startSession'}
        onCopyTv={copyTv} onStart={startSession} onRehearse={goTo ? () => goTo('play', 'scene') : null} />
     </div>

      {desk && !sheetSide && (
        <aside className="ns-side mesa-panel" aria-labelledby={sideStep ? 'ns-side-h' : undefined} aria-label={sideStep ? undefined : t(lang, 'Passo aberto', 'Open step')}>
          {sideStep ? (
            <>
              <h3 className="ns-side-h" id="ns-side-h"><span aria-hidden="true">{sideStep.n}</span> {stepLabel(sideStep.id, lang)}</h3>
              <div className="ns-step-body">{body[sideStep.id]}</div>
              <div className="ns-side-next">
                <button type="button" className="mesa-btn mesa-btn-lg" onClick={() => goNext(sideStep.id)}>
                  {nextStepId(sideStep.id)
                    ? t(lang, `Próximo passo: ${stepLabel(nextStepId(sideStep.id), lang, true)} →`, `Next step: ${stepLabel(nextStepId(sideStep.id), lang, true)} →`)
                    : t(lang, 'Pronto para jogar →', 'Ready to play →')}
                </button>
              </div>
            </>
          ) : (
            <p className="ns-hint ns-side-empty">{t(lang, 'Escolha um passo à esquerda: ele abre aqui.', 'Pick a step on the left: it opens here.')}</p>
          )}
        </aside>
      )}

      {flash && (
        <div className="ns-flash" role="status" aria-live="polite">
          <span>{flash.text}</span>
          {flash.undo && <button type="button" className="mesa-btn" onClick={() => { flash.undo(); setFlash(null); }}>↶ {t(lang, 'Desfazer', 'Undo')}</button>}
        </div>
      )}

      {sheet?.kind === 'newPlan' && (
        <MesaSheet title={newPlanTitle.replace(/^↻\s*/, '')} icon="↻"
          size="auto" width="sm" lang={lang} onClose={() => setSheet(null)} className="ns-newplan"
          footer={(
            <div className="mesa-actions is-stack">
              <button type="button" className="mesa-btn" disabled={busy === 'newPlan'} onClick={() => startNewPlan(false)}>
                {t(lang, 'Começar do zero', 'Start from scratch')}
              </button>
              <button type="button" className="mesa-btn mesa-btn-lg is-primary" disabled={busy === 'newPlan'} onClick={() => startNewPlan(true)}>
                {busy === 'newPlan' ? '…' : t(lang, 'Levar o que sobrou', 'Carry over what’s left')}
              </button>
            </div>
          )}>
          <p className="mesa-sheet-text">{t(lang,
            'Este plano fica guardado na Crônica (⋯ da sessão › Ver o plano desta sessão), com Restaurar.',
            'This plan is kept in the Chronicle (session ⋯ › See this session’s plan), with Restore.')}</p>
          <p className="mesa-sheet-text"><strong>{t(lang, 'Levar o que sobrou', 'Carry over what’s left')}:</strong>{' '}
            {leftoverCounts(plan) ? carryText(leftoverCounts(plan), lang) : t(lang, 'nada sobrou', 'nothing left')}
            {t(lang, ' (as cenas não jogadas, as pistas não achadas, as pessoas e os lugares).', ' (scenes not played, clues not found, people and places).')}</p>
          <p className="mesa-sheet-text"><strong>{t(lang, 'Começar do zero', 'Start from scratch')}:</strong>{' '}
            {t(lang, 'o plano novo vem em branco.', 'the new plan starts blank.')}</p>
        </MesaSheet>
      )}
      {sheet?.kind === 'rewardItem' && (
        <Suspense fallback={null}>
          <ItemPickerModal lang={lang} sheet icon="💎" title={t(lang, 'Item para as recompensas', 'Item for the rewards')}
            confirmLabel={t(lang, 'Pôr nas recompensas', 'Add to the rewards')} campaignItems={sheet.items || []}
            onClose={() => setSheet(null)}
            onPick={async (instance) => change(p => ({ ...p, rewards: rewardWithItem(p.rewards, instance) }))} />
        </Suspense>
      )}
      {sheet?.kind === 'recap' && recapOf > 0 && (
        <Suspense fallback={null}>
          <RecapEditor campaign={campaign} lang={lang} session={recapOf} onClose={() => setSheet(null)} onSaved={() => setSheet(null)} />
        </Suspense>
      )}
      {sheet?.kind === 'ready' && (
        <ReadySheet campaign={campaign} lang={lang} onClose={() => setSheet(null)}
          onImported={onReadyImported}
          onOpen={(adventureId) => { setSheet(null); goTo?.('prepare', 'adventures', { adventureId }); }} />
      )}
      {sheet?.kind === 'idea' && raiox && (
        <IdeaSheet lang={lang} plan={plan} step={sheet.step} rx={rx}
          onClose={() => setSheet(null)}
          onPick={async (sceneId, newName) => {
            const { charId, name, idea: sug } = sheet.step.payload;
            let target = sceneId;
            if (!target) {
              target = freshSceneId(planRef.current.scenes);
              change(p => addScene(p, newName, null, target));
              await flush();
            }
            const list = rx.S.acceptMoment(momentsOf(charId), sug);
            const added = list[list.length - 1];
            const ok = await saveMoments(charId, list.map(m => (m === added ? { ...m, plan: target } : m)));
            setSheet(null);
            if (ok) say(t(lang, `Momento de ${rx.PM.firstName(name)} ligado à cena.`, `${rx.PM.firstName(name)}'s moment linked to the scene.`));
          }} />
      )}
      {sheet?.kind === 'moments' && raiox && (
        <MomentsSheet lang={lang} rx={rx} plan={plan} fact={raiox.byId[sheet.charId]} closed={closed || !insOk}
          moments={momentsOf(sheet.charId)} session={countSession} suggestions={insights?.chars.find(c => c.id === sheet.charId)?.ideas || []}
          style={(ins?.style?.[String(sheet.charId)] || []).map(x => rx.S.styleLabel(x, lang))}
          onSave={(list) => saveMoments(sheet.charId, list)}
          onXray={goTo ? () => { setSheet(null); goTo('group', 'insights', { focus: sheet.charId }); } : null}
          onClose={() => setSheet(null)} />
      )}
      {sceneSheet && (
        <Suspense fallback={null}>
          <SceneSheet key={sceneSheet.id} campaign={campaign} lang={lang} plan={plan} sceneId={sceneSheet.id} closed={closed}
            planSave={saveState} oldServer={oldPlan} lostPockets={lostPockets} world={world} adventures={adventures} levels={partyLevels(campaign)}
            moments={momentApi} momentsNote={momentsNote} autoFocusName={sceneSheet.fresh}
            onChange={(id, patch) => change(p => updateItem(p, 'scenes', id, patch))}
            onRemove={(sc) => { setSceneSheet(null); removeWithUndo('scenes', sc, t(lang, 'Cena apagada', 'Scene deleted')); }}
            onDiscard={(sc) => change(p => removeItem(p, 'scenes', sc.id))}
            onClose={() => setSceneSheet(null)}
            onCreateEntry={createEntry} onWorldEntry={upsertWorld} onOpenEntry={openEntry}
            onWorldRemoved={(id) => setWorld(w => (w || []).filter(e => e.id !== id))}
            onRoomSaved={onRoomSaved} onAdventureCreated={(a) => setAdventures(l => [a, ...(l || [])])}
            goTo={goTo} flushPlan={flush} />
        </Suspense>
      )}
      {entrySheet && (
        <Suspense fallback={null}>
          <EntrySheet entryId={entrySheet} campaign={campaign} world={world} adventures={entryAdventures} plan={plan} lang={lang}
            onClose={() => setEntrySheet(null)}
            onSaved={(full) => { if (full?.id) { details.current.delete(full.id); upsertWorld(toLight(full)); } }}
            onDeleted={(id) => { setWorld(w => (w || []).filter(e => e.id !== id)); setEntrySheet(null); }}
            onOpenEntry={(id) => setEntrySheet(id)}
            onOpenMap={goTo ? (id) => { setEntrySheet(null); goTo('world', 'map', { mapId: id }); } : undefined} />
        </Suspense>
      )}
    </div>
  );
}

const SETTLE_MS = 600;
/** O valor de agora, mas trocado só 600 ms depois do último toque na página (`release` libera já). */
function useSettled(value, keyOf) {
  const [shown, setShown] = useState(value);
  const touchedAt = useRef(0);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    const mark = () => { touchedAt.current = Date.now(); };
    document.addEventListener('pointerdown', mark, true);
    return () => document.removeEventListener('pointerdown', mark, true);
  }, []);
  const key = keyOf(value);
  const shownKey = keyOf(shown);
  useEffect(() => {
    if (key === shownKey) { if (value !== shown) setShown(value); return undefined; }
    let id = null;
    // um toque novo durante a espera recomeça a conta
    const tick = () => {
      const wait = touchedAt.current + SETTLE_MS - Date.now();
      if (wait <= 0) setShown(latest.current);
      else id = setTimeout(tick, wait);
    };
    tick();
    return () => clearTimeout(id);
  }, [key, shownKey, value, shown]);
  const release = useCallback(() => { touchedAt.current = 0; }, []);
  return [key === shownKey ? value : shown, release];
}

function downloadPlan(plan, campaign, heading) {
  try {
    const blob = new Blob([planExport(plan, { campaign: campaign.name, heading })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plano-sessao-${heading?.n || 'x'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { /* sem download neste navegador */ }
}
