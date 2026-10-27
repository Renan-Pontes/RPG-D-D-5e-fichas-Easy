// Folha da Cena (Preparar › Plano, §3.3, W2): um editor só para a cena. "＋ Cena" e tocar
// na linha da cena abrem esta folha; a paleta "Pôr nesta cena" cria cada bloco. Cena solta
// grava no plano (o autosave do Plano: 700 ms, no máximo 3 s); cena ligada a uma sala grava
// ler/imagem/quem aparece/combate/teste NA SALA, por PATCH …/node/:id (só aquela sala, sem
// baixar a aventura com as imagens), com o mesmo ritmo. No PC é um painel de 520 px à
// direita do Plano (MesaSheet side). Nada vai à Tela daqui: só a referência fica pronta.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage, errorText } from '../api/errors.js';
import { showPlanLimit } from '../plans/plans-api.js';
import { compressForEntry } from '../world/image.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import {
  ScenePalette, TextBlock, ImageBlock, WorldImagePicker, PeopleBlock, FightBlock, CheckBlock, MomentBlock, useMonsterLookup,
} from './SceneBlocks.jsx';
import {
  sceneView, presentBlocks, writeBlock, showOnStartVisible, linkScene, unlinkScene, hasRoomPockets, roomHasPockets,
  fightEntry, snapCount, sceneMoments, sceneMomentIdeas, sceneCheckIdea, spotKey, sceneHeading, whatField, closeScene, SCENE_LIMITS,
} from './scene-model.js';
import { withSceneName, PLAN_LIMITS } from './next-session.js';
import { makeNode, hasTreasure, treasureSummary } from './prep-graph.js';
import { loadRoom, loadRooms, saveRoom, prepApi } from './prep-api.js';
import './scene-sheet.css';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);
const FLASH_MS = 6000;
const PLAN_BLOCKS = ['read', 'show', 'refs', 'fight', 'check', 'spots', 'notes'];

/**
 * O ritmo do autosave (700 ms; nunca segura mais de 3 s) para as gravações da sala. Sem rede,
 * o que não foi segue esperando a próxima gravação; recusado pelo servidor (400: monstro
 * grande demais, sala apagada…), sai da fila e o motivo fica escrito (`error`).
 */
function useRoomSaver(campaignId, ref, onSaved, onRejected) {
  const [state, setState] = useState('saved');
  const [error, setError] = useState(null);
  const pending = useRef({});
  const timer = useRef(null);
  const since = useRef(0);
  const chain = useRef(Promise.resolve());
  const refRef = useRef(ref);
  refRef.current = ref;
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    chain.current = chain.current.then(async () => {
      const body = pending.current;
      const target = refRef.current;
      pending.current = {};
      if (!Object.keys(body).length || !target) return;
      setState('saving');
      try {
        const r = await saveRoom(campaignId, target.adventureId, target.nodeId, body);
        if (!Object.keys(pending.current).length) setState('saved');
        setError(null);
        onSaved?.(target, r.node);
      } catch (e) {
        const rejected = e?.status >= 400 && e?.status < 500;
        if (!rejected) pending.current = { ...body, ...pending.current };
        setState('error');
        setError(e);
        if (rejected) onRejected?.(target);
        throw e;
      }
    }).catch(() => {});
    return chain.current;
  }, [campaignId, onSaved]);
  const queue = (patch) => {
    if (!Object.keys(pending.current).length) since.current = Date.now();
    pending.current = { ...pending.current, ...patch };
    setState('dirty');
    clearTimeout(timer.current);
    if (Date.now() - since.current > 3000) flush();
    else timer.current = setTimeout(flush, 700);
  };
  useEffect(() => () => { flush(); }, [flush]);
  return { state, error, queue, flush };
}

/**
 * props: campaign, lang, plan, sceneId, closed, planSave ('saved'|'dirty'|'saving'|'error'),
 * world, adventures, levels, moments (o Raio-X do Plano, ou null), autoFocusName,
 * onChange(sceneId, patch), onRemove(scene), onDiscard(scene), onClose(), onCreateEntry(kind, name),
 * onWorldEntry(light), onOpenEntry(entry), onRoomSaved(ref, node), onAdventureCreated(adv), goTo, flushPlan()
 */
export default function SceneSheet({
  campaign, lang, plan, sceneId, closed, planSave, world, adventures, levels, moments, momentsNote, autoFocusName = false,
  onChange, onRemove, onDiscard, onClose, onCreateEntry, onWorldEntry, onOpenEntry, onRoomSaved, onAdventureCreated, goTo, flushPlan,
}) {
  const scene = plan.scenes.find(s => s.id === sceneId) || null;
  const index = plan.scenes.findIndex(s => s.id === sceneId);
  const ref = scene?.nodeRef || null;
  const linked = !!ref;
  const [room, setRoom] = useState(null);          // {adventure, node} da cena ligada
  const [roomState, setRoomState] = useState(linked ? 'loading' : 'none');
  const [opened, setOpened] = useState(() => new Set());
  const [picker, setPicker] = useState(null);      // 'image'
  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState('');
  const [fresh, setFresh] = useState(null);         // o cartão que a imagem acabou de criar (o tipo muda num chip)
  const [fightError, setFightError] = useState('');
  const [momBusy, setMomBusy] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [flash, setFlash] = useState(null);
  const [ask, setAsk] = useState(null);             // {type: 'link', ref} | {type: 'unlink'}
  const [linking, setLinking] = useState(null);      // {advId, rooms}
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const flashTimer = useRef(null);
  const nameRef = useRef(null);
  const lookup = useMonsterLookup();

  const onSaved = useCallback((target, node) => onRoomSaved?.(target, node), [onRoomSaved]);
  const [roomNonce, setRoomNonce] = useState(0);   // recusado pelo servidor: relê a sala como ela está lá
  const onRejected = useCallback(() => setRoomNonce(n => n + 1), []);
  const saver = useRoomSaver(campaign.id, ref, onSaved, onRejected);

  // a sala da cena ligada: 1 GET dela (sem a imagem), quando liga ou troca
  useEffect(() => {
    let alive = true;
    if (!ref) { setRoom(null); setRoomState('none'); return undefined; }
    if (!roomNonce) setRoomState('loading');
    loadRoom(campaign.id, ref.adventureId, ref.nodeId)
      .then(r => { if (alive) { setRoom(r); setRoomState('ok'); } })
      .catch(e => { if (alive) { setRoom(null); setRoomState(e?.status === 404 ? 'gone' : 'error'); } });
    return () => { alive = false; };
  }, [campaign.id, ref?.adventureId, ref?.nodeId, roomNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(flashTimer.current), []);
  const say = (text, undo = null) => {
    clearTimeout(flashTimer.current);
    setFlash({ text, undo });
    flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS);
  };

  const view = useMemo(() => sceneView(scene, room?.node || null, { world }), [scene, room, world]);
  const spotlights = moments?.spotlights || {};
  const momentItems = useMemo(() => (scene ? sceneMoments(scene, spotlights) : []), [scene, spotlights]);
  const present = useMemo(() => {
    const p = new Set(presentBlocks(view));
    if (momentItems.length) p.add('spots'); else p.delete('spots');
    return p;
  }, [view, momentItems]);
  const shown = (id) => present.has(id) || opened.has(id);
  const roomReady = !linked || roomState === 'ok';
  const lockedRoom = linked && !roomReady;   // os blocos da sala esperam a sala chegar

  // "× grupo" (o monstro contra o dano e as salvaguardas da mesa) e as salvaguardas que o
  // combate cobra (para as ideias de momento): versus.js chega por import dinâmico; se chegar
  // logo depois de um toque, espera 600 ms (nada mexe debaixo do dedo)
  const [vs, setVs] = useState(null);
  const touchedAt = useRef(0);
  useEffect(() => {
    const mark = () => { touchedAt.current = Date.now(); };
    document.addEventListener('pointerdown', mark, true);
    return () => document.removeEventListener('pointerdown', mark, true);
  }, []);
  useEffect(() => {
    if (!(campaign.members || []).some(m => m.role !== 'dm' && m.character?.data)) return undefined;
    let alive = true;
    let timer = null;
    Promise.all([import('../group/party-metrics.js'), import('../group/versus.js')]).then(([PM, V]) => {
      if (!alive) return;
      const facts = PM.partyFacts(PM.partyMembers(campaign.members), lang);
      if (!facts.length) return;
      const apply = () => { if (alive) setVs({ facts, V, cache: new Map() }); };
      const wait = touchedAt.current + 600 - Date.now();
      if (wait > 0) timer = setTimeout(apply, wait); else apply();
    }).catch(() => { /* sem a linha "× grupo": a folha funciona igual */ });
    return () => { alive = false; clearTimeout(timer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const versusLine = vs ? (m) => {
    const k = m.id || m.name;
    if (!vs.cache.has(k)) vs.cache.set(k, vs.V.versus(m, vs.facts, lang).line);
    return vs.cache.get(k);
  } : null;
  const fightSaves = useMemo(() => {
    if (!vs) return [];
    const out = [];
    for (const f of view.fight) { const m = lookup(f.monsterId, f.snap); if (m) out.push(...vs.V.monsterSaves(m)); }
    return out;
  }, [vs, view.fight, lookup]);

  if (!scene) return null;

  // ---------------------------------------------------------------- gravar
  const write = (key, value) => {
    const w = writeBlock(key, value, { linked, refs: view.refs, showFrom: view.showFrom, show: view.show });
    if (!w) return;
    if (w.scene) onChange(scene.id, w.scene);
    if (w.node) {
      setRoom(r => (r ? { ...r, node: { ...r.node, ...w.node } } : r));
      saver.queue(w.node);
    }
  };
  const valueOf = (key) => ({ read: view.read, show: view.show, refs: view.refs, fight: view.fight, check: view.checks, notes: view.notes })[key];
  const emptyOf = (key) => ({ read: '', show: null, refs: [], fight: [], check: [], notes: '' })[key];
  const openBlock = (id) => {
    setOpened(s => new Set(s).add(id));
    // o 🎯 nasce com Percepção CD 13 (troca-se num toque); os outros nascem vazios
    if (id === 'check' && !view.checks.length && !lockedRoom && !closed) write('check', [{ kind: 'skill', key: 'perception', dc: 13 }]);
    setTimeout(() => {
      const el = document.getElementById(`ss-b-${id}`);
      el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      el?.querySelector('textarea, input:not([type="file"]), select')?.focus({ preventScroll: true });
    }, 30);
  };
  // ✕ num bloco: tira já e oferece "↶ Desfazer" por 6 s (a foto do valor volta)
  const removeBlock = (key) => {
    const before = valueOf(key);
    write(key, emptyOf(key));
    setOpened(s => { const n = new Set(s); n.delete(key); return n; });
    say(t(lang, 'Tirado da cena.', 'Removed from the scene.'), () => { write(key, before); setOpened(s => new Set(s).add(key)); });
  };

  // ---------------------------------------------------------------- 📺 imagem
  const pickImage = (entry) => { setPicker(null); setImgError(''); write('show', { kind: 'entry', id: entry.id }); };
  const uploadImage = async (file) => {
    setImgBusy(true); setImgError('');
    try {
      const url = await compressForEntry(file, { kind: 'place' });
      const name = (view.name || '').trim() || t(lang, `Cena ${index + 1}`, `Scene ${index + 1}`);
      const light = await onCreateEntry('place', name.slice(0, 120));
      const r = await prepApi.putEntryImage(light.id, url);
      onWorldEntry?.({ ...light, imageVer: r.imageVer, imageUrl: r.imageUrl || null });
      setFresh(light.id);
      write('show', { kind: 'entry', id: light.id });
    } catch (e) {
      if (showPlanLimit(e)) return;
      setImgError(e?.message === 'image_too_large'
        ? t(lang, 'Imagem grande demais mesmo depois de comprimir.', 'Image still too large after compression.')
        : e?.message === 'not_image' || e?.message === 'read_failed'
          ? t(lang, 'Não consegui ler a imagem.', 'Could not read the image.')
          : errorMessage(e, lang));
    } finally { setImgBusy(false); }
  };
  const changeKind = async (kind) => {
    const id = view.show?.id;
    if (!id) return;
    setImgBusy(true); setImgError('');
    try {
      const r = await prepApi.updateEntry(id, { kind });
      const e = (world || []).find(x => x.id === id);
      onWorldEntry?.({ ...(e || {}), id, kind: r?.entry?.kind || kind });
    } catch (e) { setImgError(errorMessage(e, lang)); } finally { setImgBusy(false); }
  };

  // ---------------------------------------------------------------- ⚔ combate
  const addMonster = (monster, count) => {
    setFightError('');
    const inScene = linked ? 0 : view.fight.filter(f => f.snap).length;
    const { entry, error: code } = fightEntry(monster, count, { lang, plan, sceneId: scene.id, inScene, linked });
    if (!entry) { setFightError(errorText(code, lang)); return true; }
    const max = linked ? SCENE_LIMITS.nodeCount : SCENE_LIMITS.count;
    const same = view.fight.findIndex(f => f.monsterId && f.monsterId === entry.monsterId);
    const next = same >= 0
      ? view.fight.map((f, i) => (i === same ? { ...f, count: Math.min(max, f.count + entry.count) } : f))
      : [...view.fight, entry];
    write('fight', next);
    return true;
  };

  // ---------------------------------------------------------------- ★ momentos
  const momentApi = moments ? { ...moments } : null;
  // as ideias que combinam com a cena primeiro: a do 🎯 dela e as que batem com o teste e o combate
  const ideasFor = (charId) => {
    const base = sceneMomentIdeas(view, moments?.ideasFor(charId) || [], { fightSaves, lang });
    const extra = sceneCheckIdea(view, moments?.facts.find(f => f.id === charId), moments?.facts || [], { lang });
    const used = new Set([...(moments?.momentsOf(charId) || []).map(m => m.auto), ...(moments?.dismissedOf?.(charId) || [])]);
    return extra && !used.has(extra.auto) ? [extra, ...base.filter(x => x.auto !== extra.auto)] : base;
  };
  const linkMoment = async (charId, list, added) => {
    if (!added) return false;
    setMomBusy(true);
    try {
      const ok = await moments.save(charId, list.map(m => (m.id === added.id ? { ...m, plan: scene.id } : m)));
      if (ok) {
        write('spots', [...new Set([...(view.spots || []), spotKey(charId, added.id)])].slice(-SCENE_LIMITS.spots));
        say(t(lang, `Momento de ${moments.firstName(moments.nameOf(charId))} nesta cena.`, `${moments.firstName(moments.nameOf(charId))}'s moment in this scene.`));
      }
      return ok;
    } finally { setMomBusy(false); }
  };
  const acceptIdea = (charId, sug) => {
    const cur = moments.momentsOf(charId);
    const list = moments.accept(cur, sug);
    return linkMoment(charId, list, list.length > cur.length ? list[list.length - 1] : null);
  };
  const writeOwn = (charId, text) => {
    const cur = moments.momentsOf(charId);
    const { list } = moments.write(cur, 'shine', text);
    return linkMoment(charId, list, list.length > cur.length ? list[list.length - 1] : null);
  };
  const unlinkMoments = async (items) => {
    const keys = new Set(items.map(x => x.key));
    write('spots', (view.spots || []).filter(k => !keys.has(k)));
    setMomBusy(true);
    try {
      for (const charId of [...new Set(items.filter(x => x.moment.plan === scene.id).map(x => x.charId))]) {
        const ids = new Set(items.filter(x => x.charId === charId).map(x => x.moment.id));
        await moments.save(charId, moments.momentsOf(charId).map(m => (ids.has(m.id) && m.plan === scene.id ? { ...m, plan: null } : m)));
      }
    } finally { setMomBusy(false); }
  };

  // ---------------------------------------------------------------- ligar / desligar a sala
  const pickAdventure = async (advId) => {
    if (!advId) { setLinking({ advId: '', rooms: null }); return; }
    setLinking({ advId, rooms: null });
    try { const rooms = await loadRooms(campaign.id, Number(advId)); setLinking(l => (l?.advId === advId ? { advId, rooms } : l)); }
    catch { setLinking(l => (l?.advId === advId ? { advId, rooms: [] } : l)); }
  };
  const chooseRoom = (nodeId) => {
    const target = { adventureId: Number(linking.advId), nodeId };
    if (hasRoomPockets(scene)) setAsk({ type: 'link', ref: target });
    else doLink(target, false);
  };
  const doLink = async (target, carry) => {
    setBusy('link'); setError('');
    try {
      await saver.flush();
      let node = null;
      if (carry) node = (await loadRoom(campaign.id, target.adventureId, target.nodeId)).node;
      const r = linkScene(scene, target, node, { carry });
      if (r.node) await saveRoom(campaign.id, target.adventureId, target.nodeId, r.node);
      onChange(scene.id, r.scene);
      setAsk(null); setLinking(null);
      say(t(lang, 'Cena ligada à sala. Mudar aqui muda a aventura.', 'Scene linked to the room. Changing it here changes the adventure.'));
    } catch (e) { setError(errorMessage(e, lang)); } finally { setBusy(null); }
  };
  const askUnlink = () => {
    if (room?.node && roomHasPockets(room.node)) setAsk({ type: 'unlink' });
    else doUnlink(false);
  };
  const doUnlink = async (copy) => {
    await saver.flush();
    const snapsLeft = SCENE_LIMITS.snaps - snapCount(plan, scene.id);
    onChange(scene.id, unlinkScene(scene, room?.node || null, { copy, world, snapsLeft }));
    setAsk(null);
  };
  const createAdventure = async () => {
    setBusy('create'); setError('');
    try {
      const name = (view.name || '').trim() || t(lang, `Cena ${index + 1}`, `Scene ${index + 1}`);
      const base = makeNode({ name, kind: 'room' });
      const { node: carried } = linkScene(scene, null, base, { carry: true });
      const r = await api.createAdventure(campaign.id, { name, data: { version: 1, nodes: [{ ...base, ...(carried || {}) }], edges: [] } });
      onAdventureCreated?.(r.adventure);
      const { scene: patch } = linkScene(scene, { adventureId: r.adventure.id, nodeId: base.id }, null, { carry: false });
      onChange(scene.id, patch);
      say(t(lang, `Aventura “${name}” criada com esta cena.`, `Adventure “${name}” created with this scene.`));
    } catch (e) { if (!showPlanLimit(e)) setError(errorMessage(e, lang)); } finally { setBusy(null); }
  };
  const openMap = async () => {
    await saver.flush();
    await flushPlan?.();
    goTo?.('prepare', 'adventures', { adventureId: ref.adventureId, nodeId: ref.nodeId });
  };

  // ---------------------------------------------------------------- fechar
  const finish = async () => {
    if (closed) { onClose(); return; }
    const r = closeScene(scene, index, lang);
    if (r.action === 'remove') onDiscard?.(scene);
    else if (r.action === 'name') onChange(scene.id, { text: withSceneName(scene.text, r.text) });
    await saver.flush();
    onClose();
  };
  const done = () => {
    if (!(view.name || '').trim() && !linked) { setNameError(true); nameRef.current?.focus(); return; }
    finish();
  };

  // ---------------------------------------------------------------- desenho
  const what = whatField(scene);
  const roomName = room?.node?.name || '';
  const advName = room?.adventure?.name || (adventures || []).find(a => a.id === ref?.adventureId)?.name || '';
  const states = [planSave, linked ? saver.state : 'saved'];
  const saveText = states.includes('error') ? t(lang, 'Erro ao salvar', 'Save failed')
    : states.includes('saving') ? t(lang, 'Salvando…', 'Saving…')
      : states.includes('dirty') ? t(lang, 'Alterado…', 'Edited…') : t(lang, '✓ Salvo', '✓ Saved');
  const saveCls = states.includes('error') ? 's-error' : states.some(s => s === 'saving' || s === 'dirty') ? 's-dirty' : 's-saved';
  const disabled = closed;
  const roomNote = lockedRoom ? (
    <p className="ss-hint">{roomState === 'loading' ? t(lang, 'Carregando a sala…', 'Loading the room…')
      : roomState === 'gone' ? t(lang, 'A sala desta cena não existe mais. Desligue a cena em "Mais opções".', "This scene's room no longer exists. Unlink the scene under \"More options\".")
        : t(lang, 'Não consegui abrir a sala agora.', 'Could not open the room right now.')}</p>
  ) : null;

  return (
    <MesaSheet title={sceneHeading(plan, scene.id, lang)} icon="🎬" size="tall" width="md" lang={lang} side className="ss"
      onClose={finish} initialFocus={autoFocusName ? '#ss-name' : undefined}
      aside={<span className={`ss-save ${saveCls}`} role="status">{saveText}</span>}
      footer={(
        <div className="ss-foot">
          {!disabled && <button type="button" className="mesa-btn mesa-btn-lg is-quiet ss-del" onClick={() => onRemove(scene)}>🗑 {t(lang, 'Apagar cena', 'Delete scene')}</button>}
          <button type="button" className="mesa-btn mesa-btn-lg is-primary ss-done" onClick={done}>{t(lang, 'Pronto', 'Done')}</button>
        </div>
      )}>
      <div className="ss-body">
        {closed && <p className="ss-hint">{t(lang, 'Campanha encerrada: a cena fica só para ler.', 'Campaign closed: the scene is read-only.')}</p>}
        {linked && saver.state === 'error' && saver.error && (
          <p className="ss-error" role="alert">{t(lang, 'A sala não foi gravada', 'The room was not saved')}: {errorMessage(saver.error, lang)}</p>
        )}
        <div className="ss-field">
          <label className="ss-label" htmlFor="ss-name">{t(lang, 'Nome da cena', 'Scene name')}</label>
          <input id="ss-name" ref={nameRef} className="input ss-input" value={view.name} disabled={disabled}
            maxLength={Math.max(1, PLAN_LIMITS.text - (view.notesInText ? view.notesInText.length + 1 : 0))}
            aria-invalid={nameError || undefined} aria-describedby={nameError ? 'ss-name-err' : undefined}
            placeholder={t(lang, 'Ex.: Ponte velha sobre o Rio Brumoso', 'E.g. Old bridge over the Misty River')}
            onChange={e => { setNameError(false); onChange(scene.id, { text: withSceneName(scene.text, e.target.value) }); }} />
          {nameError && <p className="ss-error" id="ss-name-err" role="alert">{t(lang, 'Dê um nome à cena.', 'Give the scene a name.')}</p>}
        </div>
        <div className="ss-field">
          <label className="ss-label" htmlFor="ss-what">{t(lang, 'O que acontece (só você vê)', 'What happens (only you see)')}</label>
          <textarea id="ss-what" className="input ss-text" rows={2} maxLength={SCENE_LIMITS.what} value={what.value} disabled={disabled}
            placeholder={t(lang, 'Ex.: Goblins esperam sob a ponte para cobrar pedágio.', 'E.g. Goblins wait under the bridge to charge a toll.')}
            onChange={e => onChange(scene.id, what.patch(e.target.value))} />
        </div>

        <ScenePalette ids={PLAN_BLOCKS} present={new Set([...present, ...opened])} lang={lang} disabled={disabled} onPick={openBlock} />
        {linked && (roomReady
          ? <p className="ss-linked-note">🗺 {t(lang, `Guardada na aventura ${advName}. Mudar aqui muda a aventura.`, `Stored in the adventure ${advName}. Changing it here changes the adventure.`)}</p>
          : roomNote)}

        {shown('read') && (
          <TextBlock id="read" lang={lang} value={view.read} max={linked ? SCENE_LIMITS.nodeRead : SCENE_LIMITS.read} disabled={disabled || lockedRoom}
            placeholder={t(lang, 'A ponte range. A névoa sobe do rio e…', 'The bridge creaks. Mist rises from the river and…')}
            onChange={v => write('read', v)} onRemove={() => removeBlock('read')} />
        )}
        {shown('show') && (
          <ImageBlock lang={lang} show={view.show} showFrom={view.showFrom} world={world} roomName={roomName}
            disabled={disabled || lockedRoom} busy={imgBusy} error={imgError} fresh={fresh}
            onPickWorld={() => setPicker('image')} onUpload={uploadImage} onKind={changeKind}
            onRemove={() => removeBlock('show')} onRemoveBlock={() => removeBlock('show')} />
        )}
        {shown('refs') && (
          <PeopleBlock lang={lang} world={world} ids={view.refs} max={linked ? SCENE_LIMITS.nodeRefs : SCENE_LIMITS.refs} disabled={disabled || lockedRoom}
            onToggle={(id) => write('refs', view.refs.includes(id) ? view.refs.filter(x => x !== id) : [...view.refs, id])}
            onCreate={onCreateEntry} onOpen={onOpenEntry} onRemove={() => removeBlock('refs')} />
        )}
        {shown('fight') && (
          <FightBlock lang={lang} fight={view.fight} levels={levels} members={campaign.members} levelingMode={campaign.state?.levelingMode || 'milestone'}
            disabled={disabled || lockedRoom} maxRows={linked ? SCENE_LIMITS.nodeFight : SCENE_LIMITS.fight} maxCount={linked ? SCENE_LIMITS.nodeCount : SCENE_LIMITS.count}
            versusLine={versusLine} error={fightError} onChange={v => write('fight', v)} onAdd={addMonster} onRemove={() => removeBlock('fight')} />
        )}
        {shown('check') && (
          <CheckBlock lang={lang} checks={view.checks} members={campaign.members} multi={linked} disabled={disabled || lockedRoom}
            onChange={list => write('check', list)} onRemove={() => removeBlock('check')} />
        )}
        {shown('spots') && (
          <MomentBlock lang={lang} items={momentItems} api={momentApi} ideasFor={ideasFor} disabled={disabled} max={SCENE_LIMITS.spots}
            busy={momBusy} note={momentApi ? null : (momentsNote || t(lang, 'Os momentos vêm do Raio-X do grupo: precisam de personagens com ficha.', 'Moments come from the party X-ray: they need characters with sheets.'))}
            onAccept={acceptIdea} onWrite={writeOwn} onUnlink={(x) => unlinkMoments([x])}
            onRemove={() => {
              const items = momentItems;
              unlinkMoments(items);
              setOpened(s => { const n = new Set(s); n.delete('spots'); return n; });
            }} />
        )}
        {shown('notes') && (
          <TextBlock id="notes" lang={lang} value={view.notes} max={SCENE_LIMITS.notes} disabled={disabled}
            placeholder={t(lang, 'Ex.: se fugirem, os goblins seguem até a vila.', 'E.g. if they flee, the goblins follow them to the village.')}
            onChange={v => write('notes', v)} onRemove={() => removeBlock('notes')} />
        )}

        {showOnStartVisible(view) && (
          <label className="ss-switch">
            <input type="checkbox" checked={view.showOnStart} disabled={disabled} onChange={e => write('showOnStart', e.target.checked)} />
            <span>{t(lang, 'Ao começar esta cena, mostrar na Tela: nome, imagem e texto para ler', 'When this scene starts, show on screen: name, image and read-aloud text')}
              <span className="ss-hint"> · {t(lang, 'nada vai à Tela sem o seu toque em ▶ Começar esta cena.', 'nothing goes on screen until you tap ▶ Start this scene.')}</span></span>
          </label>
        )}

        <details className="ss-more">
          <summary>{linked ? t(lang, 'Mais opções (a sala da aventura)', 'More options (the adventure room)') : t(lang, 'Mais opções (usar uma sala de aventura)', 'More options (use an adventure room)')}</summary>
          {error && <p className="ss-error" role="alert">{error}</p>}
          {linked ? (
            <div className="ss-more-body">
              <p className="ss-text-line">🗺 {t(lang, 'Guardada na aventura', 'Stored in the adventure')} <strong>{advName || '…'}</strong>{roomName ? <> · {t(lang, 'sala', 'room')} <strong>{roomName}</strong></> : null}</p>
              <p className="ss-hint">{t(lang, 'Mudar aqui muda a aventura: o texto para ler, a imagem, quem aparece, o combate e os testes moram na sala.', 'Changing it here changes the adventure: read-aloud, image, who shows up, combat and checks live in the room.')}</p>
              {room?.node && ((room.node.hazards || []).length > 0 || hasTreasure(room.node)) && (
                <div className="ss-adv">
                  <p className="mesa-eyebrow">{t(lang, 'da aventura ▸', 'from the adventure ▸')}</p>
                  {(room.node.hazards || []).map((h, i) => <p key={i} className="ss-text-line">⚠ {h.name}{h.dc ? ` · ${t(lang, 'CD', 'DC')} ${h.dc}` : ''}{h.damage ? ` · ${h.damage}` : ''}</p>)}
                  {hasTreasure(room.node) && <p className="ss-text-line">💰 {treasureSummary(room.node.treasure, lang)}</p>}
                  <p className="ss-hint">{t(lang, 'Perigos, tesouro e caminhos mudam no mapa da aventura.', 'Hazards, treasure and paths change on the adventure map.')}</p>
                </div>
              )}
              <div className="ss-row-btns">
                {goTo && <button type="button" className="mesa-btn" onClick={openMap}>{t(lang, 'Abrir o mapa da aventura', 'Open the adventure map')} →</button>}
                {!disabled && <button type="button" className="mesa-btn is-quiet" disabled={busy === 'link'} onClick={askUnlink}>{t(lang, 'Desligar da sala', 'Unlink from the room')}</button>}
              </div>
            </div>
          ) : (
            <div className="ss-more-body">
              {(adventures || []).length === 0 ? (
                <>
                  <p className="ss-hint">{t(lang, 'Ainda não há aventuras. Uma aventura é um mapa de salas, bom para masmorras e viagens.', 'There are no adventures yet. An adventure is a map of rooms, good for dungeons and journeys.')}</p>
                  {!disabled && <button type="button" className="mesa-btn" disabled={busy === 'create'} onClick={createAdventure}>{busy === 'create' ? '…' : t(lang, '🗺 Criar uma aventura com esta cena', '🗺 Create an adventure with this scene')}</button>}
                </>
              ) : !linking ? (
                !disabled && <button type="button" className="mesa-btn" onClick={() => setLinking({ advId: '', rooms: null })}>🗺 {t(lang, 'Usar uma sala de aventura', 'Use an adventure room')}</button>
              ) : (
                <div className="ss-link-edit">
                  <p className="ss-hint">{t(lang, 'A sala traz o texto para ler, o combate e os cartões dela para a mesa. O que a cena tiver passa a morar na sala.', 'The room brings its read-aloud text, fight and cards to the table. What the scene has moves into the room.')}</p>
                  <select className="input" value={linking.advId} onChange={e => pickAdventure(e.target.value)} aria-label={t(lang, 'Aventura', 'Adventure')}>
                    <option value="">{t(lang, 'Aventura…', 'Adventure…')}</option>
                    {adventures.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  {linking.advId && (
                    <select className="input" defaultValue="" disabled={!linking.rooms} aria-label={t(lang, 'Sala', 'Room')}
                      onChange={e => { if (e.target.value) chooseRoom(e.target.value); }}>
                      <option value="">{linking.rooms ? (linking.rooms.length ? t(lang, 'Sala…', 'Room…') : t(lang, 'Sem salas ainda', 'No rooms yet')) : t(lang, 'Carregando…', 'Loading…')}</option>
                      {(linking.rooms || []).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                  )}
                  <button type="button" className="mesa-btn is-quiet" onClick={() => setLinking(null)}>{t(lang, 'Cancelar', 'Cancel')}</button>
                </div>
              )}
            </div>
          )}
          {ask?.type === 'link' && (
            <div className="ss-ask" role="group" aria-label={t(lang, 'Levar para a sala?', 'Take to the room?')}>
              <p>{t(lang, 'Levar o que está na cena para a sala?', 'Take what is in the scene to the room?')}</p>
              <p className="ss-hint">{t(lang, 'Texto para ler, imagem, quem aparece, combate e teste passam a morar na sala. "Usar só o da sala" deixa a sala como está e tira isso da cena.', 'Read-aloud, image, who shows up, combat and check move into the room. "Use only the room\'s" keeps the room as it is and removes them from the scene.')}</p>
              <div className="ss-row-btns">
                <button type="button" className="mesa-btn is-primary" disabled={busy === 'link'} onClick={() => doLink(ask.ref, true)}>{t(lang, 'Levar', 'Take it')}</button>
                <button type="button" className="mesa-btn" disabled={busy === 'link'} onClick={() => doLink(ask.ref, false)}>{t(lang, 'Usar só o da sala', "Use only the room's")}</button>
                <button type="button" className="mesa-btn is-quiet" onClick={() => setAsk(null)}>{t(lang, 'Cancelar', 'Cancel')}</button>
              </div>
            </div>
          )}
          {ask?.type === 'unlink' && (
            <div className="ss-ask" role="group" aria-label={t(lang, 'Copiar para a cena?', 'Copy to the scene?')}>
              <p>{t(lang, 'Copiar o que a sala tem para a cena?', 'Copy what the room has to the scene?')}</p>
              <p className="ss-hint">{t(lang, 'A sala continua igual na aventura. Copiar traz o texto, a imagem, quem aparece, o combate e o 1º teste para a cena.', 'The room stays the same in the adventure. Copy brings the read-aloud, image, who shows up, combat and the 1st check to the scene.')}</p>
              <div className="ss-row-btns">
                <button type="button" className="mesa-btn is-primary" onClick={() => doUnlink(true)}>{t(lang, 'Copiar', 'Copy')}</button>
                <button type="button" className="mesa-btn" onClick={() => doUnlink(false)}>{t(lang, 'Não, só desligar', 'No, just unlink')}</button>
                <button type="button" className="mesa-btn is-quiet" onClick={() => setAsk(null)}>{t(lang, 'Cancelar', 'Cancel')}</button>
              </div>
            </div>
          )}
        </details>
      </div>

      {flash && (
        <div className="ss-flash" role="status" aria-live="polite">
          <span>{flash.text}</span>
          {flash.undo && <button type="button" className="mesa-btn" onClick={() => { flash.undo(); setFlash(null); }}>↶ {t(lang, 'Desfazer', 'Undo')}</button>}
        </div>
      )}
      {picker === 'image' && <WorldImagePicker lang={lang} world={world} onPick={pickImage} onClose={() => setPicker(null)} />}
    </MesaSheet>
  );
}
