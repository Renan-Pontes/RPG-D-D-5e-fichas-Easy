// Mapa do Mundo: a imagem de um lugar com marcadores (pins) que apontam para
// outros cartões. Pan/zoom com mouse, roda e pinça. Um pin novo nasce
// INVISÍVEL para os jogadores; mostrar é um clique do mestre.
// Um pin para um lugar que também tem mapa vira "Entrar no mapa" (aninhado).
//
// F11 (celular primeiro):
// - Tocar num marcador abre a FOLHA do marcador (MesaSheet, fundo quase claro) e
//   a página rola para o marcador ficar à vista acima dela; "Mostrar aos
//   jogadores" fica no rodapé preso: 2 toques. No PC (≥ 768) é um painel AO LADO
//   do mapa, preso no alto ao rolar.
// - O mapa ocupa no máximo 55% da altura no celular: um gesto que começa fora
//   dele rola a página (só a caixa do mapa tem touch-action: none). A roda do
//   mouse no zoom mínimo devolve a rolagem à página.
// - Rótulos só onde cabem (map-labels.js): nenhum cobre outro nem a cabeça de
//   outro marcador; mais zoom, mais nomes.
// - Campanha encerrada (readOnly): sem 📍, sem arrastar, sem editar o marcador.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createEntry, getEntry, isConflict, putEntryImage, updateEntry, worldErrorText, worldImageUrl } from './world-api.js';
import { compressImage } from './image.js';
import { KIND_META, clampUnit, freshId, isTouchUi, kindIcon, pinCountText, sortEntries, t, tapVerb } from './world-model.js';
import useAutosave, { saveStateLabel } from './useAutosave.js';
import { LogDiaryCheck, useReveal } from './RevealControl.jsx';
import { EntryPicker } from './LinksField.jsx';
import { layoutPinLabels, pinPriority, zoomControlsRect } from './map-labels.js';
import ShowOnTable from '../stage/ShowOnTable.jsx';
import MesaSheet from '../shell/MesaSheet.jsx';
import useMedia from '../play/useMedia.js';

const MIN_Z = 1;
const MAX_Z = 6;
const WIDE = '(min-width: 768px)';

export default function WorldMap({ campaign, readOnly = false, entries = [], lang = 'pt', mapId: mapIdProp, onMapChange, onOpenEntry, onEntrySaved, onEntryCreated, showCampaign = null }) {
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
  const wide = useMedia(WIDE);
  const viewRef = useRef(null);     // .wl-mapview (acha o marcador na tela)
  const spacerRef = useRef(null);   // folga embaixo enquanto a folha está aberta
  const sheetRef = useRef(null);    // o corpo da folha do marcador

  useEffect(() => { if (mapIdProp && mapIdProp !== mapId) setMapIdState(mapIdProp); }, [mapIdProp]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!mapId && maps.length) setMapIdState(maps[0].id); }, [mapId, maps]);
  useEffect(() => { if (readOnly) setAdding(false); }, [readOnly]);

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
  const selPin = pins.find(p => p.id === sel) || null;
  const sheetOpen = !!selPin && !wide;

  // Celular: com a folha aberta, a página rola para o marcador ficar no meio do
  // pedaço de mapa que sobra acima dela (abaixo do segmentado preso). A folha
  // trava a rolagem do dedo, não a do programa. Perto do fim da página, uma folga
  // embaixo do mapa deixa rolar o bastante; ela some quando a folha fecha.
  useLayoutEffect(() => {
    const spacer = spacerRef.current;
    if (!sheetOpen) { if (spacer) spacer.style.height = '0px'; return; }
    const sheet = sheetRef.current?.closest('.mesa-sheet');
    const head = viewRef.current?.querySelector(`[data-pin="${CSS.escape(String(sel))}"] .wl-pin-head`);
    if (!sheet || !head) return;
    const sheetTop = window.innerHeight - sheet.offsetHeight;
    const seg = document.querySelector('.shell-seg-tabs');
    // o que cobre o alto da tela: o segmentado (preso depois de rolar) ou nada
    const coverTop = () => Math.max(0, seg ? seg.getBoundingClientRect().bottom : 0);
    const shown = (r, top) => r.top >= top + 8 && r.bottom + 28 <= sheetTop - 8; // a cabeça e o rótulo
    const scrollBy = (delta) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const need = window.scrollY + delta - max;
      if (need > 0 && spacer) spacer.style.height = `${(parseFloat(spacer.style.height) || 0) + Math.ceil(need) + 8}px`;
      window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: 'instant' });
    };
    let r = head.getBoundingClientRect();
    if (shown(r, coverTop())) return;
    // 1ª conta já com o segmentado preso no alto (é como ele fica depois de rolar)
    const stuckTop = seg ? seg.offsetHeight : 0;
    scrollBy((r.top + r.bottom) / 2 - (stuckTop + (sheetTop - stuckTop) / 2));
    // 2ª, com o que ficou de fato (o segmentado pode ainda não ter prendido)
    r = head.getBoundingClientRect();
    const top = coverTop();
    if (!shown(r, top)) scrollBy((r.top + r.bottom) / 2 - (top + (sheetTop - top) / 2));
  }, [sheetOpen, sel]);

  // PC: o painel ao lado começa na altura do mapa. Se o fim dele ficar abaixo da
  // tela, a página sobe só o que falta (até o painel prender no alto), sem tirar
  // o marcador escolhido de vista.
  const sideRef = useRef(null);
  useLayoutEffect(() => {
    if (!wide || sel == null) return;
    const side = sideRef.current;
    const head = viewRef.current?.querySelector(`[data-pin="${CSS.escape(String(sel))}"] .wl-pin-head`);
    if (!side || !head) return;
    const r = side.getBoundingClientRect();
    const over = r.bottom - (window.innerHeight - 8);
    if (over <= 0) return;
    const stick = parseFloat(getComputedStyle(side).top) || 0;
    const room = Math.max(0, r.top - stick);                         // até o painel prender
    const pinRoom = Math.max(0, head.getBoundingClientRect().top - stick - 8); // o marcador fica à vista
    const delta = Math.min(over, room, pinRoom);
    if (delta > 0) window.scrollBy({ top: delta, behavior: 'instant' });
  }, [wide, sel]);

  // ---------------------------------------------------------------- sem mapas
  if (!maps.length && !mapId) {
    if (readOnly) return <p className="wl-empty wl-empty-small">{t(lang, 'Esta campanha não tem mapas.', 'This campaign has no maps.')}</p>;
    return <NewMapCard campaign={campaign} lang={lang} entries={entries} onCreated={(e) => { onEntryCreated?.(e); setMapId(e.id); }} />;
  }

  const selTarget = selPin?.entryId ? byId.get(selPin.entryId) : null;
  const visibleCount = pins.filter(p => p.visible).length;
  const panel = selPin ? (
    <PinPanel pin={selPin} target={selTarget} map={map} entries={entries} lang={lang} readOnly={readOnly} rv={rv}
      layout={wide ? 'side' : 'sheet'} innerRef={sheetRef}
      onUpdate={(patch) => updatePin(selPin.id, patch)}
      onClose={() => setSel(null)}
      onOpenCard={(id) => { if (!wide) setSel(null); onOpenEntry?.(id); }}
      onEnterMap={(id) => setMapId(id, { push: true })}
      onRemove={() => removePin(selPin.id)} />
  ) : null;

  return (
    <div className={`wl-mapview${wide ? ' is-wide' : ''}`} ref={viewRef}>
      <div className="wl-map-bar">
        {trail.length > 0 && (
          <button type="button" className="mesa-btn wl-map-back" onClick={() => { const prev = trail[trail.length - 1]; setTrail(tr => tr.slice(0, -1)); setMapIdState(prev); setSel(null); }}>
            ← {byId.get(trail[trail.length - 1])?.name || t(lang, 'Voltar', 'Back')}
          </button>
        )}
        <div className="wl-map-tabs" role="tablist" aria-label={t(lang, 'Mapas', 'Maps')}>
          {maps.map(m => (
            <button key={m.id} type="button" role="tab" aria-selected={m.id === mapId} className={`wl-chip wl-map-tab${m.id === mapId ? ' is-on' : ''}`} onClick={() => setMapId(m.id)}>
              🗺 {m.name}
            </button>
          ))}
        </div>
        <span className={`wl-save wl-save-${autosave.state}`} aria-live="polite">{saveStateLabel(autosave.state, lang)}</span>
        {map && (
          <div className="wl-map-tools" role="group" aria-label={t(lang, 'Ferramentas do mapa', 'Map tools')}>
            {!readOnly && (
              <button type="button" className={`mesa-btn wl-map-tool${adding ? ' is-primary' : ''}`} onClick={() => { setAdding(a => !a); setSel(null); }} aria-pressed={adding}>
                <span aria-hidden="true">📍</span>
                <span className="wl-map-tool-txt">{adding ? t(lang, `${tap} no mapa…`, `${tap} the map…`) : t(lang, 'Marcador', 'Pin')}</span>
              </button>
            )}
            <button type="button" className="mesa-btn wl-map-tool" onClick={() => onOpenEntry?.(map.id)}>
              <span aria-hidden="true">{readOnly ? '📖' : '✎'}</span>
              <span className="wl-map-tool-txt">{readOnly ? t(lang, 'Ver lugar', 'View place') : t(lang, 'Editar lugar', 'Edit place')}</span>
            </button>
            {showCampaign && map.imageVer && (
              <ShowOnTable campaign={showCampaign} target={{ kind: 'map', entry: map }} lang={lang} className="mesa-btn wl-map-tool"
                ariaLabel={t(lang, 'Mostrar este mapa na Tela', 'Show this map on screen')}>
                <span aria-hidden="true">📺</span>
                <span className="wl-map-tool-txt">{wide ? t(lang, 'Mostrar este mapa na Tela', 'Show this map on screen') : t(lang, 'Mostrar na Tela', 'Show on screen')}</span>
              </ShowOnTable>
            )}
          </div>
        )}
      </div>

      {error && <p className="wl-error" role="alert">{error}</p>}
      {conflict && (
        <div className="wl-conflict" role="alert">
          <strong>{t(lang, 'Alguém alterou este mapa — recarregar?', 'Someone changed this map — reload?')}</strong>
          <div className="wl-row">
            <button type="button" className="mesa-btn is-primary" onClick={() => { autosave.discard(); load(mapId); }}>{t(lang, 'Recarregar', 'Reload')}</button>
          </div>
        </div>
      )}

      {!map ? <p className="wl-muted">{t(lang, 'Abrindo mapa…', 'Opening map…')}</p> : (
        <div className="wl-map-stage">
          <div className="wl-map-col">
            <MapCanvas
              map={map} pins={pins} byId={byId} lang={lang} adding={adding} selected={sel} readOnly={readOnly}
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
            <p className="wl-hint wl-map-hint">{pins.length
              ? `${pinCountText(pins.length, visibleCount, lang)} ${selPin && wide && !readOnly
                ? t(lang, 'Arraste o marcador para movê-lo.', 'Drag the pin to move it.')
                : readOnly
                  ? t(lang, `${tap} num marcador para ver.`, `${tap} a pin to view it.`)
                  : t(lang, `${tap} num marcador para editar.`, `${tap} a pin to edit.`)}`
              : readOnly
                ? t(lang, 'Este mapa não tem marcadores.', 'This map has no pins.')
                : t(lang, `Nenhum marcador ainda. Use "Marcador" e ${tap.toLowerCase()} no mapa.`, `No pins yet. Use "Pin" and ${tap.toLowerCase()} the map.`)}</p>
            <div className="wl-pin-spacer" ref={spacerRef} aria-hidden="true" />
          </div>

          {wide && (
            <aside className="wl-pin-side" ref={sideRef} aria-label={t(lang, 'Marcador', 'Pin')}>
              {panel || <MapHelp lang={lang} tap={tap} readOnly={readOnly} count={pins.length} visible={visibleCount} />}
            </aside>
          )}
        </div>
      )}

      {sheetOpen && panel}
    </div>
  );
}

// ===================================================================== o marcador aberto
// layout="sheet": folha da mesa no celular (Mostrar aos jogadores no rodapé
// preso); layout="side": painel ao lado do mapa no PC. O conteúdo é o mesmo.
function PinPanel({ pin, target, map, entries, lang, readOnly, rv, layout, innerRef, onUpdate, onClose, onOpenCard, onEnterMap, onRemove }) {
  const name = target?.name || pin.label || t(lang, 'Marcador novo', 'New pin');
  // Mostrar ⇄ Ocultar: o botão que acabou de mudar de sentido ignora toques por
  // 400 ms (o 2º toque de um toque duplo não desfaz o 1º)
  const flippedAt = useRef(0);
  useEffect(() => { flippedAt.current = Date.now(); }, [pin.id, pin.visible]);
  const vis = (
    <div className={`wl-pin-vis${pin.visible ? ' is-on' : ''}`}>
      <span className="wl-pin-vis-txt">
        {pin.visible ? t(lang, '👁 Os jogadores veem este marcador', '👁 Players see this pin') : t(lang, '🔒 Só você vê este marcador', '🔒 Only you see this pin')}
      </span>
      {!readOnly && (
        <button type="button" className={`mesa-btn mesa-btn-lg wl-pin-show${pin.visible ? '' : ' is-primary'}`} disabled={rv.busy}
          onClick={() => { if (Date.now() - flippedAt.current >= 400) rv.togglePin(pin.id, !pin.visible); }}>
          {rv.busy ? '…' : pin.visible ? t(lang, '🔒 Ocultar', '🔒 Hide') : t(lang, '👁 Mostrar aos jogadores', '👁 Show to players')}
        </button>
      )}
    </div>
  );
  const log = <LogRow rv={rv} lang={lang} />;
  const body = (
    <div className="wl-pin-body" ref={innerRef}>
      {layout === 'side' && vis}
      {pin.visible && target?.visibility === 'hidden' && (
        <p className="wl-hint wl-pin-warn">{t(lang, 'O cartão ligado está oculto: os jogadores só verão o marcador quando você revelar o cartão.', 'The linked card is hidden: players will only see the pin once you reveal the card.')}</p>
      )}
      {rv.error && <p className="wl-error" role="alert">{rv.error}</p>}
      {!readOnly && layout === 'side' && log}

      {readOnly ? (
        <dl className="wl-pin-ro">
          <dt>{t(lang, 'Aponta para', 'Points to')}</dt>
          <dd>{target ? `${kindIcon(target.kind)} ${target.name}` : t(lang, 'nenhum cartão', 'no card')}</dd>
          {pin.label && <><dt>{t(lang, 'Rótulo', 'Label')}</dt><dd>{pin.label}</dd></>}
        </dl>
      ) : (
        <>
          <div className="mesa-field">
            <span className="mesa-field-label">{t(lang, 'Aponta para', 'Points to')}</span>
            <EntryPicker entries={entries} value={pin.entryId} onChange={v => onUpdate({ entryId: v })} exclude={[map.id]} lang={lang}
              placeholder={t(lang, 'Escolha um cartão (opcional)', 'Pick a card (optional)')} />
          </div>
          <div className="mesa-field">
            <label htmlFor={`wl-pin-label-${pin.id}`}>{t(lang, 'Rótulo', 'Label')}</label>
            <input id={`wl-pin-label-${pin.id}`} maxLength={60} value={pin.label || ''} onChange={e => onUpdate({ label: e.target.value })}
              placeholder={t(lang, 'Ex.: Cripta', 'E.g.: Crypt')} />
          </div>
        </>
      )}

      {(target || !readOnly) && (
        <div className="wl-pin-acts">
          {target && <button type="button" className="mesa-btn" onClick={() => onOpenCard(target.id)}>{kindIcon(target.kind)} {t(lang, 'Abrir cartão', 'Open card')}</button>}
          {target?.isMap && <button type="button" className="mesa-btn" onClick={() => onEnterMap(target.id)}>🗺 {t(lang, 'Entrar no mapa', 'Enter map')}</button>}
          {!readOnly && <button type="button" className="mesa-btn is-danger" onClick={onRemove}>{t(lang, 'Remover marcador', 'Remove pin')}</button>}
        </div>
      )}
      {!readOnly && layout === 'sheet' && (
        <p className="wl-hint">{t(lang, 'Para mover o marcador, feche esta folha e arraste-o no mapa.', 'To move the pin, close this sheet and drag it on the map.')}</p>
      )}
      {/* na folha, a caixa fica logo acima do rodapé com o Mostrar (é dele que ela trata) */}
      {!readOnly && layout === 'sheet' && log}
    </div>
  );

  if (layout === 'sheet') {
    return (
      <MesaSheet title={name} icon="📍" eyebrow={t(lang, 'Marcador', 'Pin')} size="auto" width="sm" lang={lang}
        className="wl-pin-sheet" onClose={onClose} footer={vis}>
        {body}
      </MesaSheet>
    );
  }
  return (
    <div className="wl-pin-panel">
      <div className="wl-pin-panel-head">
        <div className="wl-pin-panel-title">
          <p className="mesa-eyebrow">{t(lang, 'Marcador', 'Pin')}</p>
          <strong className="wl-pin-panel-name">📍 {name}</strong>
        </div>
        <button type="button" className="mesa-icon-btn wl-pin-x" onClick={onClose} aria-label={t(lang, 'Fechar', 'Close')}>✕</button>
      </div>
      {body}
    </div>
  );
}

/** "Registrar na Crônica" com o "?" de 44 que mostra o que ela faz (sem depender do title). */
function LogRow({ rv, lang }) {
  const [help, setHelp] = useState(false);
  return (
    <div className="wl-pin-log">
      <div className="wl-pin-log-row">
        <LogDiaryCheck value={rv.logDiary} onChange={rv.setLogDiary} lang={lang} />
        <button type="button" className="mesa-icon-btn wl-pin-help-btn" aria-expanded={help} onClick={() => setHelp(h => !h)}
          aria-label={t(lang, 'O que faz "Registrar na Crônica"?', 'What does "Log in the Chronicle" do?')}>?</button>
      </div>
      {help && (
        <p className="wl-logcheck-hint wl-pin-log-hint">{t(lang, 'Ligada: mostrar um marcador aos jogadores vira uma linha na Crônica da campanha. Desligada: só o mapa muda.',
          'On: showing a pin to the players adds a line to the campaign Chronicle. Off: only the map changes.')}</p>
      )}
    </div>
  );
}

/** PC sem marcador escolhido: o que dá para fazer, no lugar do painel. */
function MapHelp({ lang, tap, readOnly, count, visible }) {
  return (
    <div className="wl-pin-panel is-help">
      <p className="mesa-eyebrow">{t(lang, 'Marcadores', 'Pins')}</p>
      <p className="wl-pin-help-n">{count ? pinCountText(count, visible, lang) : t(lang, 'Nenhum marcador ainda.', 'No pins yet.')}</p>
      <ul className="wl-pin-help">
        <li>{readOnly
          ? t(lang, `${tap} num marcador para ver para onde ele aponta.`, `${tap} a pin to see where it points.`)
          : t(lang, `${tap} num marcador para editar, mostrar aos jogadores ou remover.`, `${tap} a pin to edit, show to players or remove it.`)}</li>
        {!readOnly && <li>{t(lang, `Para criar: 📍 Marcador e ${tap.toLowerCase()} no mapa. Ele nasce oculto.`, `To create one: 📍 Pin, then ${tap.toLowerCase()} the map. It starts hidden.`)}</li>}
        {!readOnly && <li>{t(lang, 'Arraste um marcador para movê-lo.', 'Drag a pin to move it.')}</li>}
        <li>{t(lang, 'Cinza e tracejado = só você vê.', 'Grey and dashed = only you see it.')}</li>
      </ul>
    </div>
  );
}

// ===================================================================== tela do mapa (pan/zoom)
function MapCanvas({ map, pins, byId, lang, adding, selected, readOnly, onAdd, onSelect, onMovePin }) {
  const boxRef = useRef(null);
  const innerRef = useRef(null);
  const [view, setView] = useState({ z: 1, x: 0, y: 0 });
  const [ratio, setRatio] = useState(null); // largura/altura da imagem
  const [size, setSize] = useState({ bw: 0, bh: 0, w: 0, h: 0 }); // caixa e imagem (zoom 1), em px
  const [widths, setWidths] = useState({}); // id → largura do rótulo (medida no DOM)
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const src = worldImageUrl(map) || '/art/backgrounds/guide.webp';

  useEffect(() => { setView({ z: 1, x: 0, y: 0 }); }, [map.id]);

  // mede a caixa e a imagem (gira o celular, abre o painel do lado…)
  useLayoutEffect(() => {
    const box = boxRef.current, inner = innerRef.current;
    if (!box || !inner) return undefined;
    const measure = () => setSize(s => {
      const n = { bw: box.clientWidth, bh: box.clientHeight, w: inner.offsetWidth, h: inner.offsetHeight };
      return n.bw === s.bw && n.bh === s.bh && n.w === s.w && n.h === s.h ? s : n;
    });
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(box); ro?.observe(inner);
    return () => ro?.disconnect();
  }, []);

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

  // roda do mouse (listener não-passivo para poder impedir a rolagem da página);
  // no zoom mínimo, afastar não muda nada: a roda rola a página.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      const z = viewRef.current.z;
      const out = e.deltaY > 0;
      if ((out && z <= MIN_Z + 1e-6) || (!out && z >= MAX_Z - 1e-6)) return;
      e.preventDefault();
      zoomAt(out ? 1 / 1.15 : 1.15, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const toUnit = (clientX, clientY) => {
    const r = innerRef.current.getBoundingClientRect();
    return { x: clampUnit((clientX - r.left) / r.width), y: clampUnit((clientY - r.top) / r.height) };
  };

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button > 0) return;
    // ＋ − ⤢: a captura do ponteiro roubaria o clique do mouse desses botões.
    if (e.target.closest?.('.wl-map-zoom')) return;
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
      // encerrada: o marcador não sai do lugar (o toque só abre)
      if (g.moved && !readOnly) { const u = toUnit(e.clientX, e.clientY); g.last = u; movePreview(g.id, u); }
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
      if (g.moved && g.last && !readOnly) onMovePin(g.id, g.last.x, g.last.y);
      else if (!g.moved) onSelect(g.id);
      setPreview(null);
    } else if (g.type === 'pan' && !g.moved) {
      if (adding && !readOnly) { const u = toUnit(e.clientX, e.clientY); onAdd(u.x, u.y); } else onSelect(null);
    }
    if (!g.moved) tappedAt.current = Date.now();
  };
  // Toque que abriu a folha do marcador: o "click" que o celular gera depois cairia
  // no que acabou de subir debaixo do dedo (o "Aponta para" da folha). O touchend
  // cancelado não gera esse clique.
  const tappedAt = useRef(0);
  const onTouchEnd = (e) => { if (e.cancelable && Date.now() - tappedAt.current < 300) e.preventDefault(); };

  // Rótulos que cabem nesta vista (px de tela dentro da caixa).
  const labels = useMemo(() => layoutPinLabels(pins.map(p => {
    const pos = preview?.id === p.id ? preview : p;
    return {
      id: p.id,
      x: view.x + clampUnit(pos.x) * size.w * view.z,
      y: view.y + clampUnit(pos.y) * size.h * view.z,
      w: widths[p.id] || 0,
      prio: pinPriority({ selected: selected === p.id, visible: p.visible }),
    };
  }), { w: size.bw, h: size.bh }, { avoid: [zoomControlsRect({ w: size.bw, h: size.bh })] }), [pins, preview, view, size, widths, selected]);

  // mede a largura de cada rótulo (os escondidos também: visibility, não display)
  const [fontsTick, setFontsTick] = useState(0);
  useEffect(() => { document.fonts?.ready?.then(() => setFontsTick(n => n + 1)).catch(() => {}); }, []);
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const next = {};
    inner.querySelectorAll('[data-pin]').forEach(el => {
      const lab = el.querySelector('.wl-pin-label');
      next[el.getAttribute('data-pin')] = lab ? lab.offsetWidth : 0;
    });
    setWidths(cur => {
      const keys = Object.keys(next);
      return keys.length === Object.keys(cur).length && keys.every(k => cur[k] === next[k]) ? cur : next;
    });
  }, [pins, byId, fontsTick]);

  return (
    <div className={`wl-map-box${adding ? ' is-adding' : ''}${ratio ? ' has-ratio' : ''}${readOnly ? ' is-readonly' : ''}`} ref={boxRef} style={ratio ? { aspectRatio: String(ratio) } : undefined}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onTouchEnd={onTouchEnd}>
      <div className="wl-map-inner" ref={innerRef} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
        <img src={src} alt={map.name} draggable={false} className="wl-map-img"
          onLoad={e => { const im = e.currentTarget; if (im.naturalWidth && im.naturalHeight) setRatio(im.naturalWidth / im.naturalHeight); }} />
        {pins.map(p => {
          const target = p.entryId ? byId.get(p.entryId) : null;
          const pos = preview?.id === p.id ? preview : p;
          const meta = target ? KIND_META[target.kind] : null;
          const lab = labels.get(p.id);
          const text = p.label || target?.name || '';
          return (
            <button key={p.id} type="button" data-pin={p.id}
              className={`wl-pin${p.visible ? ' is-visible' : ' is-hidden'}${selected === p.id ? ' is-selected' : ''}${target?.visibility === 'hidden' ? ' target-hidden' : ''}${lab ? '' : ' is-label-off'}${lab?.above ? ' is-label-above' : ''}`}
              style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, '--pin-scale': 1 / view.z, '--wl-kind': meta?.color || '#d6b064', '--label-dx': `${lab?.dx || 0}px` }}
              // teclado (Enter/Espaço): o toque e o mouse já chegam pelos ponteiros
              onClick={(e) => { if (e.detail === 0) onSelect(p.id); }}
              aria-label={`${text || t(lang, 'Marcador', 'Pin')}${p.visible ? '' : ` (${t(lang, 'oculto', 'hidden')})`}`}>
              <span className="wl-pin-head" aria-hidden="true"><span>{target ? kindIcon(target.kind) : '✦'}</span></span>
              {(text || !p.visible) && <span className="wl-pin-label" aria-hidden="true">{text}{!p.visible && ' 🔒'}</span>}
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
        <div className="wl-newmap-row">
          <div className="mesa-field">
            <label htmlFor="wl-newmap-name">{t(lang, 'Nome do mapa', 'Map name')}</label>
            <input id="wl-newmap-name" value={name} onChange={e => setName(e.target.value)} placeholder={t(lang, 'Ex.: Vale de Brumafria', 'E.g. Mistfrost Vale')} maxLength={120} />
          </div>
          <button type="button" className="mesa-btn mesa-btn-lg is-primary" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? t(lang, 'Criando…', 'Creating…') : t(lang, '🖼 Escolher imagem do mapa', '🖼 Choose map image')}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) create(f); }} />
        </div>
        {places.some(p => p.imageVer) && (
          <>
            <p className="wl-hint">{t(lang, 'Ou transforme a imagem de um lugar que você já criou:', 'Or turn the image of a place you already made into a map:')}</p>
            <div className="wl-chips">
              {places.filter(p => p.imageVer).slice(0, 8).map(p => (
                <button key={p.id} type="button" className="wl-chip wl-newmap-place" disabled={busy} onClick={() => convert(p)}>🏰 {p.name}</button>
              ))}
            </div>
          </>
        )}
        {error && <p className="wl-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
