// Mapa do Mundo: a imagem de um lugar com marcadores (pins) que apontam para
// outros cartões. Pan/zoom com mouse, roda e pinça. Um pin novo nasce
// INVISÍVEL para os jogadores; mostrar é um clique do mestre.
// Um pin para um lugar que também tem mapa vira "Entrar no mapa" (aninhado).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createEntry, getEntry, isConflict, putEntryImage, updateEntry, worldErrorText, worldImageUrl } from './world-api.js';
import { compressImage } from './image.js';
import { KIND_META, clampUnit, freshId, isTouchUi, kindIcon, pinCountText, sortEntries, t, tapVerb } from './world-model.js';
import useAutosave, { saveStateLabel } from './useAutosave.js';
import { LogDiaryCheck, useReveal } from './RevealControl.jsx';
import { EntryPicker } from './LinksField.jsx';

const MIN_Z = 1;
const MAX_Z = 6;

export default function WorldMap({ campaign, readOnly = false, entries = [], lang = 'pt', mapId: mapIdProp, onMapChange, onOpenEntry, onEntrySaved, onEntryCreated }) {
  const maps = useMemo(() => sortEntries(entries.filter(e => e.isMap)), [entries]);
  const [mapId, setMapIdState] = useState(mapIdProp || null);
  const [trail, setTrail] = useState([]); // mapas anteriores (aninhados)
  const [map, setMap] = useState(null);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [adding, setAdding] = useState(false);
  const [sel, setSel] = useState(null);
  const mapRef = useRef(null);
  const [touch] = useState(isTouchUi);
  const tap = tapVerb(lang, touch);
  const versionRef = useRef(null);

  useEffect(() => { if (mapIdProp && mapIdProp !== mapId) setMapIdState(mapIdProp); }, [mapIdProp]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!mapId && maps.length) setMapIdState(maps[0].id); }, [mapId, maps]);

  const setMapId = (id, { push = false } = {}) => {
    if (push && mapId) setTrail(tr => [...tr, mapId]);
    if (!push) setTrail([]);
    setMapIdState(id); setSel(null); setAdding(false);
    onMapChange?.(id);
  };

  // ---------------------------------------------------------------- carregar o mapa
  const load = useCallback(async (id) => {
    setError(''); setConflict(false);
    try {
      const e = await getEntry(id);
      versionRef.current = e.version;
      mapRef.current = e;
      setMap(e);
    } catch (err) { setError(worldErrorText(err, lang)); setMap(null); }
  }, [lang]);
  useEffect(() => { if (mapId) { setMap(null); load(mapId); } }, [mapId, load]);

  const save = useCallback(async (patch) => {
    const cur = mapRef.current;
    const next = await updateEntry(cur.id, { data: { ...(cur.data || {}), ...patch.data }, version: versionRef.current });
    versionRef.current = next.version;
    mapRef.current = { ...mapRef.current, version: next.version, updatedAt: next.updatedAt, revealedAt: next.revealedAt };
    onEntrySaved?.(next);
    return next;
  }, [onEntrySaved]);
  const autosave = useAutosave(save, { delay: 500, isConflict, onError: (e) => (isConflict(e) ? setConflict(true) : setError(worldErrorText(e, lang))) });

  const pins = map?.data?.map?.pins || [];
  const setPins = (next) => {
    const data = { ...(mapRef.current.data || {}), map: { ...(mapRef.current.data?.map || {}), pins: next } };
    mapRef.current = { ...mapRef.current, data };
    setMap(mapRef.current);
    autosave.queue({ data });
  };
  const updatePin = (id, patch) => setPins(pins.map(p => (p.id === id ? { ...p, ...patch } : p)));
  const removePin = (id) => { setPins(pins.filter(p => p.id !== id)); setSel(null); };

  // Mostrar/ocultar pin = ação de revelar (servidor), depois de gravar o pendente.
  const rv = useReveal(map, lang, (next) => {
    versionRef.current = next.version;
    mapRef.current = { ...mapRef.current, ...next };
    setMap(mapRef.current);
    onEntrySaved?.(next);
  }, () => autosave.flush());

  const byId = useMemo(() => new Map(entries.map(e => [e.id, e])), [entries]);

  // ---------------------------------------------------------------- sem mapas
  if (!maps.length && !mapId) {
    if (readOnly) return <p className="wl-empty wl-empty-small">{t(lang, 'Esta campanha não tem mapas.', 'This campaign has no maps.')}</p>;
    return <NewMapCard campaign={campaign} lang={lang} entries={entries} onCreated={(e) => { onEntryCreated?.(e); setMapId(e.id); }} />;
  }

  const selPin = pins.find(p => p.id === sel) || null;
  const selTarget = selPin?.entryId ? byId.get(selPin.entryId) : null;

  return (
    <div className="wl-mapview">
      <div className="wl-map-bar">
        {trail.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const prev = trail[trail.length - 1]; setTrail(tr => tr.slice(0, -1)); setMapIdState(prev); setSel(null); }}>
            ← {byId.get(trail[trail.length - 1])?.name || t(lang, 'Voltar', 'Back')}
          </button>
        )}
        <div className="wl-map-tabs" role="tablist">
          {maps.map(m => (
            <button key={m.id} type="button" role="tab" aria-selected={m.id === mapId} className={`wl-chip${m.id === mapId ? ' is-on' : ''}`} onClick={() => setMapId(m.id)}>
              🗺 {m.name}
            </button>
          ))}
        </div>
        <span className={`wl-save wl-save-${autosave.state}`} aria-live="polite">{saveStateLabel(autosave.state, lang)}</span>
      </div>

      {error && <p className="wl-error" role="alert">{error}</p>}
      {conflict && (
        <div className="wl-conflict" role="alert">
          <strong>{t(lang, 'Alguém alterou este mapa — recarregar?', 'Someone changed this map — reload?')}</strong>
          <div className="wl-row">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { autosave.discard(); load(mapId); }}>{t(lang, 'Recarregar', 'Reload')}</button>
          </div>
        </div>
      )}

      {!map ? <p className="wl-muted">{t(lang, 'Abrindo mapa…', 'Opening map…')}</p> : (
        <>
          <div className="wl-map-tools">
            <button type="button" className={`btn btn-sm ${adding ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setAdding(a => !a); setSel(null); }} aria-pressed={adding}>
              📍 {adding ? t(lang, `${tap} no mapa…`, `${tap} the map…`) : t(lang, 'Marcador', 'Pin')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenEntry?.(map.id)}>✎ {t(lang, 'Editar lugar', 'Edit place')}</button>
            <LogDiaryCheck value={rv.logDiary} onChange={rv.setLogDiary} lang={lang} />
          </div>

          <MapCanvas
            map={map} pins={pins} byId={byId} lang={lang} adding={adding} selected={sel}
            onAdd={(x, y) => {
              if (pins.length >= 100) { setError(worldErrorText({ data: { error: 'too_many_pins' } }, lang)); return; }
              const id = freshId('p', pins.map(p => p.id));
              setPins([...pins, { id, entryId: null, x, y, visible: false }]);
              setSel(id); setAdding(false);
            }}
            onSelect={setSel}
            onMovePin={(id, x, y) => updatePin(id, { x, y })}
          />

          {!map.imageVer && (
            <p className="wl-hint">{t(lang, 'Este mapa ainda não tem imagem. Suba uma em "Editar lugar".', 'This map has no image yet. Upload one in "Edit place".')}</p>
          )}

          {selPin ? (
            <div className="wl-pin-panel">
              <div className="wl-pin-panel-head">
                <strong>📍 {selTarget?.name || selPin.label || t(lang, 'Marcador novo', 'New pin')}</strong>
                <button type="button" className="wl-x" onClick={() => setSel(null)} aria-label={t(lang, 'Fechar', 'Close')}>×</button>
              </div>
              <label className="wl-label">{t(lang, 'Aponta para', 'Points to')}</label>
              <EntryPicker entries={entries} value={selPin.entryId} onChange={v => updatePin(selPin.id, { entryId: v })} exclude={[map.id]} lang={lang}
                placeholder={t(lang, 'Escolha um cartão (opcional)', 'Pick a card (optional)')} />
              <label className="wl-label" htmlFor="wl-pin-label">{t(lang, 'Rótulo', 'Label')}</label>
              <input id="wl-pin-label" maxLength={60} value={selPin.label || ''} onChange={e => updatePin(selPin.id, { label: e.target.value })}
                placeholder={t(lang, 'Ex.: Cripta', 'E.g.: Crypt')} />
              <div className="wl-pin-vis">
                <span className={selPin.visible ? 'wl-ok' : 'wl-muted'}>
                  {selPin.visible ? t(lang, '👁 Os jogadores veem este marcador', '👁 Players see this pin') : t(lang, '🔒 Só você vê este marcador', '🔒 Only you see this pin')}
                </span>
                <button type="button" className={`btn btn-sm ${selPin.visible ? 'btn-ghost' : 'btn-primary'}`} disabled={rv.busy}
                  onClick={() => rv.togglePin(selPin.id, !selPin.visible)}>
                  {selPin.visible ? t(lang, 'Ocultar', 'Hide') : t(lang, 'Mostrar aos jogadores', 'Show to players')}
                </button>
              </div>
              {selPin.visible && selTarget?.visibility === 'hidden' && (
                <p className="wl-hint">{t(lang, 'O cartão ligado está oculto: os jogadores só verão o marcador quando você revelar o cartão.', 'The linked card is hidden: players will only see the pin once you reveal the card.')}</p>
              )}
              {rv.error && <p className="wl-error">{rv.error}</p>}
              <div className="wl-row">
                {selTarget && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenEntry?.(selTarget.id)}>{kindIcon(selTarget.kind)} {t(lang, 'Abrir cartão', 'Open card')}</button>}
                {selTarget?.isMap && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMapId(selTarget.id, { push: true })}>🗺 {t(lang, 'Entrar no mapa', 'Enter map')}</button>}
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removePin(selPin.id)}>{t(lang, 'Remover marcador', 'Remove pin')}</button>
              </div>
              <p className="wl-hint">{t(lang, 'Arraste o marcador para movê-lo.', 'Drag the pin to move it.')}</p>
            </div>
          ) : (
            <p className="wl-hint">{pins.length
              ? `${pinCountText(pins.length, pins.filter(p => p.visible).length, lang)} ${t(lang, `${tap} num marcador para editar.`, `${tap} a pin to edit.`)}`
              : t(lang, `Nenhum marcador ainda. Use "Marcador" e ${tap.toLowerCase()} no mapa.`, `No pins yet. Use "Pin" and ${tap.toLowerCase()} the map.`)}</p>
          )}
        </>
      )}
    </div>
  );
}

// ===================================================================== tela do mapa (pan/zoom)
function MapCanvas({ map, pins, byId, lang, adding, selected, onAdd, onSelect, onMovePin }) {
  const boxRef = useRef(null);
  const innerRef = useRef(null);
  const [view, setView] = useState({ z: 1, x: 0, y: 0 });
  const [ratio, setRatio] = useState(null); // largura/altura da imagem
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const src = worldImageUrl(map) || '/art/backgrounds/guide.webp';

  useEffect(() => { setView({ z: 1, x: 0, y: 0 }); }, [map.id]);

  const clampView = (v) => {
    const box = boxRef.current?.getBoundingClientRect();
    const inner = innerRef.current;
    if (!box || !inner) return v;
    const w = inner.offsetWidth * v.z; const h = inner.offsetHeight * v.z;
    const minX = Math.min(0, box.width - w); const minY = Math.min(0, box.height - h);
    const maxX = Math.max(0, box.width - w); const maxY = Math.max(0, box.height - h);
    return { z: v.z, x: Math.min(maxX, Math.max(minX, v.x)), y: Math.min(maxY, Math.max(minY, v.y)) };
  };
  const zoomAt = (factor, cx, cy) => {
    const box = boxRef.current.getBoundingClientRect();
    const v = viewRef.current;
    const z = Math.min(MAX_Z, Math.max(MIN_Z, v.z * factor));
    const px = cx - box.left; const py = cy - box.top;
    const x = px - ((px - v.x) * z) / v.z;
    const y = py - ((py - v.y) * z) / v.z;
    setView(clampView({ z, x, y }));
  };

  // roda do mouse (listener não-passivo para poder impedir a rolagem da página)
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const onWheel = (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const toUnit = (clientX, clientY) => {
    const r = innerRef.current.getBoundingClientRect();
    return { x: clampUnit((clientX - r.left) / r.width), y: clampUnit((clientY - r.top) / r.height) };
  };

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button > 0) return;
    boxRef.current.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pinId = e.target.closest?.('[data-pin]')?.getAttribute('data-pin');
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), z: viewRef.current.z };
    } else if (pinId) {
      gesture.current = { type: 'pin', id: pinId, sx: e.clientX, sy: e.clientY, moved: false };
    } else {
      gesture.current = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y, moved: false };
    }
  };
  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.type === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const target = Math.min(MAX_Z, Math.max(MIN_Z, (g.z * dist) / (g.dist || 1)));
      zoomAt(target / viewRef.current.z, (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (g.type === 'pan') {
      const dx = e.clientX - g.sx; const dy = e.clientY - g.sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) g.moved = true;
      if (g.moved) setView(clampView({ z: viewRef.current.z, x: g.vx + dx, y: g.vy + dy }));
    } else if (g.type === 'pin') {
      if (Math.abs(e.clientX - g.sx) + Math.abs(e.clientY - g.sy) > 4) g.moved = true;
      if (g.moved) { const u = toUnit(e.clientX, e.clientY); g.last = u; movePreview(g.id, u); }
    }
  };
  const [preview, setPreview] = useState(null); // {id, x, y} enquanto arrasta
  const movePreview = (id, u) => setPreview({ id, ...u });
  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0) { if (g?.type === 'pinch') gesture.current = null; return; }
    gesture.current = null;
    if (!g) return;
    if (g.type === 'pin') {
      if (g.moved && g.last) onMovePin(g.id, g.last.x, g.last.y);
      else onSelect(g.id);
      setPreview(null);
    } else if (g.type === 'pan' && !g.moved) {
      if (adding) { const u = toUnit(e.clientX, e.clientY); onAdd(u.x, u.y); } else onSelect(null);
    }
  };

  return (
    <div className={`wl-map-box${adding ? ' is-adding' : ''}${ratio ? ' has-ratio' : ''}`} ref={boxRef} style={ratio ? { aspectRatio: String(ratio) } : undefined}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <div className="wl-map-inner" ref={innerRef} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
        <img src={src} alt={map.name} draggable={false} className="wl-map-img"
          onLoad={e => { const im = e.currentTarget; if (im.naturalWidth && im.naturalHeight) setRatio(im.naturalWidth / im.naturalHeight); }} />
        {pins.map(p => {
          const target = p.entryId ? byId.get(p.entryId) : null;
          const pos = preview?.id === p.id ? preview : p;
          const meta = target ? KIND_META[target.kind] : null;
          return (
            <button key={p.id} type="button" data-pin={p.id}
              className={`wl-pin${p.visible ? ' is-visible' : ' is-hidden'}${selected === p.id ? ' is-selected' : ''}${target?.visibility === 'hidden' ? ' target-hidden' : ''}`}
              style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, '--pin-scale': 1 / view.z, '--wl-kind': meta?.color || '#d6b064' }}
              aria-label={`${target?.name || p.label || t(lang, 'Marcador', 'Pin')}${p.visible ? '' : ` (${t(lang, 'oculto', 'hidden')})`}`}>
              <span className="wl-pin-head" aria-hidden="true"><span>{target ? kindIcon(target.kind) : '✦'}</span></span>
              <span className="wl-pin-label">{p.label || target?.name || ''}{!p.visible && ' 🔒'}</span>
            </button>
          );
        })}
      </div>
      <div className="wl-map-zoom">
        <button type="button" onClick={() => { const r = boxRef.current.getBoundingClientRect(); zoomAt(1.4, r.left + r.width / 2, r.top + r.height / 2); }} aria-label={t(lang, 'Aproximar', 'Zoom in')}>＋</button>
        <button type="button" onClick={() => { const r = boxRef.current.getBoundingClientRect(); zoomAt(1 / 1.4, r.left + r.width / 2, r.top + r.height / 2); }} aria-label={t(lang, 'Afastar', 'Zoom out')}>－</button>
        <button type="button" onClick={() => setView({ z: 1, x: 0, y: 0 })} aria-label={t(lang, 'Ver tudo', 'Fit')}>⤢</button>
      </div>
    </div>
  );
}

// ===================================================================== criar o primeiro mapa
function NewMapCard({ campaign, lang, entries, onCreated }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const places = entries.filter(e => e.kind === 'place' && !e.isMap);

  const create = async (file) => {
    setBusy(true); setError('');
    try {
      const img = file ? (await compressImage(file, 1800)).url : null;
      const entry = await createEntry(campaign.id, { kind: 'place', name: name.trim() || t(lang, 'Mapa do mundo', 'World map'), data: { placeType: 'region', map: { pins: [] } } });
      let full = entry;
      if (img) { const r = await putEntryImage(entry.id, img); full = { ...entry, imageVer: r.imageVer, imageUrl: r.imageUrl }; }
      onCreated({ ...full, isMap: true });
    } catch (e) { setError(worldErrorText(e, lang)); } finally { setBusy(false); }
  };
  const convert = async (p) => {
    setBusy(true); setError('');
    try {
      const full = await getEntry(p.id);
      const next = await updateEntry(p.id, { data: { ...(full.data || {}), map: { pins: [] } }, version: full.version });
      onCreated(next);
    } catch (e) { setError(worldErrorText(e, lang)); } finally { setBusy(false); }
  };

  return (
    <div className="wl-empty wl-empty-map">
      <img src="/art/backgrounds/guide.webp" alt="" className="wl-empty-art" />
      <div className="wl-empty-body">
        <h3>{t(lang, 'Desenhe o seu mundo', 'Draw your world')}</h3>
        <p>{t(lang, 'Suba a imagem de um mapa (feito à mão, gerado ou de um livro) e espete marcadores nos lugares, NPCs e segredos. Os jogadores só veem os marcadores que você mostrar.',
          'Upload a map image (hand-drawn, generated or from a book) and drop pins on places, NPCs and secrets. Players only see the pins you show.')}</p>
        <div className="wl-row wl-wrap">
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t(lang, 'Nome do mapa (ex.: Vale de Brumafria)', 'Map name (e.g. Mistfrost Vale)')} maxLength={120} />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? t(lang, 'Criando…', 'Creating…') : t(lang, '🖼 Escolher imagem do mapa', '🖼 Choose map image')}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) create(f); }} />
        </div>
        {places.some(p => p.imageVer) && (
          <>
            <p className="wl-hint">{t(lang, 'Ou transforme a imagem de um lugar que você já criou:', 'Or turn the image of a place you already made into a map:')}</p>
            <div className="wl-chips">
              {places.filter(p => p.imageVer).slice(0, 8).map(p => (
                <button key={p.id} type="button" className="wl-chip" disabled={busy} onClick={() => convert(p)}>🏰 {p.name}</button>
              ))}
            </div>
          </>
        )}
        {error && <p className="wl-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
