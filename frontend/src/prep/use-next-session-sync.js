import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage, isOldServer } from '../api/errors.js';
import { prepApi, loadRooms } from './prep-api.js';
import { archiveSessionPlan } from '../world/world-api.js';
import {
  carryOver, droppedPockets, isOldPlanServer, normalizePlan, padSecrets, patchHasPockets,
  planDiff, planNeedsReload, planSessionKey, removeItem, revealBodyFor, toggleDiscovered,
} from './next-session.js';
import { lightNode } from './scene-model.js';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

export function useNextSessionSync({ campaign, lang, headingRef, logDiary, say, setBusy, setSheet, setOpen }) {
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('saved');
  const [oldPlan, setOldPlan] = useState(false);
  const [lostPockets, setLostPockets] = useState([]);
  const [world, setWorld] = useState(null);
  const [worldError, setWorldError] = useState(false);
  const [adventures, setAdventures] = useState(null);
  const [nodesByAdv, setNodesByAdv] = useState({});
  const [asks, setAsks] = useState({});
  const [sceneSheet, setSceneSheet] = useState(null);

  const planRef = useRef(null);
  const savedRef = useRef(null);
  const timer = useRef(null);
  const dirtySince = useRef(0);
  const dirty = useRef(false);
  const chain = useRef(Promise.resolve());
  const details = useRef(new Map());
  const nodesCache = useRef(new Map());

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
        const old = isOldPlanServer(r?.plan);
        setOldPlan(old);
        const lost = old && patchHasPockets(patch);
        const dropped = old ? [] : droppedPockets(patch, r?.plan);
        if (dropped.length) setLostPockets(l => [...new Set([...l, ...dropped])]);
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
  }, [campaign.id, lang, say]);

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

  const loadNodes = useCallback((advId) => {
    if (!nodesCache.current.has(advId)) {
      const p = loadRooms(campaign.id, advId);
      p.then(nodes => setNodesByAdv(m => ({ ...m, [advId]: nodes })))
        .catch(() => { nodesCache.current.delete(advId); setNodesByAdv(m => (advId in m ? m : { ...m, [advId]: [] })); });
      nodesCache.current.set(advId, p);
    }
    return nodesCache.current.get(advId);
  }, [campaign.id]);

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

  const onDiscover = async (id) => {
    const { plan: next, ask } = toggleDiscovered(planRef.current, id);
    change(() => next);
    if (!ask) { setAsks(a => { const c = { ...a }; delete c[id]; return c; }); return; }
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

  const startNewPlan = async (carry) => {
    const n = headingRef?.current?.next || 1;
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

  return {
    plan, planRef, error, setError, saveState, oldPlan, lostPockets, world, setWorld, worldError,
    adventures, setAdventures, nodesByAdv, setNodesByAdv, asks, sceneSheet, setSceneSheet,
    details, nodesCache, loadPlan, loadWorld, loadAdventures, flush, change, loadEntry, createEntry,
    loadNodes, onRoomSaved, upsertWorld, onDiscover, doReveal, dismissAsk, removeWithUndo, startNewPlan,
  };
}
