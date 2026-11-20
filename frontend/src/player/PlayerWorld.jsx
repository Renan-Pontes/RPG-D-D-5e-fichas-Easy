// Mundo do jogador (WP5): só o que o mestre revelou, do jeito mais bonito possível.
//
// Subvistas: Atlas (cartões por tipo) · Mapa (pins revelados) · Linha do tempo ·
// Documentos (handouts com moldura). Selo "Novo!" em tudo o que foi revelado
// depois da última visita; abrir a aba chama /world/seen (zera o badge).
// Polling da lista a cada 10 s, só enquanto a aba está aberta (montada).
//
// Mundo vivo (src/player/living/, desligável em dm_settings.immersion): o
// personagem reage aos cartões (😱 ❤️ 🤔 ⚔️) e marca ⭐ "Quero voltar"
// (otimista), abrir um cartão registra a leitura (1/min/cartão), filtro
// "Quero voltar" no Atlas e a névoa do desconhecido no Atlas e no Mapa.
//
// Props: campaign, lang, sub? (força a subvista), entryId? (abre um cartão),
//        onSeen?() (a casca recarrega o badge), showSubChips (padrão true).
// Também lê useArea() (sub/params/goTo) quando montado dentro da casca.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePolling } from '../api/polling.js';
import { errorMessage } from '../api/errors.js';
import useArea from '../shell/useArea.js';
import { SubChips } from '../shell/AreaNav.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import { KindIcon, LineIcon } from './PlayerIcons.jsx';
import '../shell/mesa.css';
import useMedia from '../play/useMedia.js';
import { nearestHit, usePanZoom } from '../shell/usePanZoom.js';
import { labelAt, layoutPinLabels, pinPriority, zoomControlsRect } from '../world/map-labels.js';
import EntryCard, { EntryImage } from '../world/EntryCard.jsx';
import { getEntry, listWorld, markWorldSeen, worldImageUrl } from '../world/world-api.js';
import {
  KIND_META, backlinks, kindLabel, rarityLabel, relLabel, subtitleOf, timelineEntries,
} from '../world/world-model.js';
import { atlasEntries, kindCounts, L, newEntryIds, paragraphs, secretSessionLabel } from './player-model.js';
import Handout from './Handout.jsx';
import MentionText from './MentionText.jsx';
import ReactionBar from './living/ReactionBar.jsx';
import { AtlasFog, MapFog } from './living/Fog.jsx';
import { addReaction, registerView, removeReaction } from './living/living-api.js';
import {
  FAVORITE_KIND, favoriteEntries, immersionOn, isFavorite, mergePending, replaceEntry, shouldSendView,
  toggleFavorite, toggleReaction,
} from './living/living-model.js';
import './player-styles.css';

const SUBS = ['atlas', 'map', 'timeline', 'documents'];
const ATLAS_KINDS = ['place', 'npc', 'faction', 'item', 'lore'];
const SUB_LABELS = {
  atlas: ['Atlas', 'Atlas'], map: ['Mapa', 'Map'], timeline: ['Linha do tempo', 'Timeline'], documents: ['Documentos', 'Documents'],
};

export default function PlayerWorld({ campaign, lang = 'pt', sub: subProp, entryId: entryIdProp, onSeen, showSubChips = true }) {
  const area = useArea();
  const inShell = area?.area === 'world';
  const [localSub, setLocalSub] = useState(SUBS.includes(subProp) ? subProp : 'atlas');
  const sub = SUBS.includes(subProp) ? subProp : (inShell && SUBS.includes(area.sub) ? area.sub : localSub);
  const changeSub = (s) => { setLocalSub(s); if (inShell) area.goTo('world', s); };

  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [kind, setKind] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [mapId, setMapId] = useState(null);
  const baselineRef = useRef(undefined);  // seenAt de ANTES desta visita (congelado)
  const markedRef = useRef(null);         // último revealedAt (ms) já marcado como visto
  const cacheRef = useRef(new Map());     // id → {key, entry} (detalhes)
  const pendingRef = useRef(new Map());   // id → campos otimistas ainda sem resposta
  const viewedRef = useRef(new Map());    // id → ms do último registro de leitura
  const [fogHintKey, setFogHintKey] = useState('');
  const [echoError, setEchoError] = useState('');
  const [listImmersion, setListImmersion] = useState(null);
  const living = typeof listImmersion === 'boolean' ? listImmersion : immersionOn(campaign);
  const charName = useMemo(() => {
    const me = typeof window !== 'undefined' ? window.__currentUserId__ : null;
    return (campaign.members || []).find(m => me != null && m.user?.id === me)?.character?.name || '';
  }, [campaign.members]);

  const markSeen = useCallback(async (latestMs) => {
    markedRef.current = latestMs;
    try {
      await markWorldSeen(campaign.id);
      (onSeen || area?.reload)?.();
    } catch { markedRef.current = -1; /* tenta no próximo poll */ }
  }, [campaign.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    try {
      const r = await listWorld(campaign.id);
      const list = r.entries || [];
      if (baselineRef.current === undefined) baselineRef.current = r.seenAt ?? null;
      setEntries(mergePending(list, pendingRef.current));
      setFogHintKey(r.fog?.hint || '');
      if (typeof r.immersion === 'boolean') setListImmersion(r.immersion);
      setError('');
      const latest = list.reduce((m, e) => Math.max(m, Date.parse(e.revealedAt || '') || 0), 0);
      if (markedRef.current === null || latest > markedRef.current) markSeen(latest);
    } catch (e) {
      setError(errorMessage(e, lang, L(lang, 'Não deu para carregar o mundo.', 'Could not load the world.')));
    }
  }, [campaign.id, lang, markSeen]);

  usePolling(load, 10000, [campaign.id]);

  // Abrir um cartão vindo de fora (toast "Ver no Mundo", menção na Crônica, busca).
  const wantedId = entryIdProp ?? (inShell ? area.params?.entryId : null);
  useEffect(() => {
    if (wantedId == null) return;
    setOpenId(Number(wantedId));
    if (inShell && area.params?.entryId != null) area.clearParams?.();
  }, [wantedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const newIds = useMemo(() => newEntryIds(entries || [], baselineRef.current), [entries]);
  const byId = useMemo(() => new Map((entries || []).map(e => [e.id, e])), [entries]);
  const counts = useMemo(() => kindCounts(entries || []), [entries]);
  const maps = useMemo(() => (entries || []).filter(e => e.isMap), [entries]);
  const timeline = useMemo(() => timelineEntries(entries || []), [entries]);
  const handouts = useMemo(() => (entries || []).filter(e => e.kind === 'handout').sort((a, b) => String(b.revealedAt || '').localeCompare(String(a.revealedAt || ''))), [entries]);

  const fetchFull = useCallback(async (light) => {
    const key = `${light.id}:${light.updatedAt}:${light.visibility}`;
    const hit = cacheRef.current.get(light.id);
    if (hit && hit.key === key) return hit.entry;
    const full = await getEntry(light.id);
    cacheRef.current.set(light.id, { key, entry: full });
    return full;
  }, []);

  const subBadges = {
    documents: handouts.filter(h => newIds.has(h.id)).length,
    map: maps.filter(m => newIds.has(m.id)).length,
  };

  // ---- Ecos: reação / estrela (otimista; desfaz se o servidor recusar)
  const echo = useCallback(async (entry, kind) => {
    const fav = kind === FAVORITE_KIND;
    const { entry: next, on } = fav ? toggleFavorite(entry) : toggleReaction(entry, kind);
    if (next === entry) return;
    const patch = fav ? { myFavorite: next.myFavorite } : { myReactions: next.myReactions, reactionCounts: next.reactionCounts };
    pendingRef.current.set(entry.id, { ...(pendingRef.current.get(entry.id) || {}), ...patch });
    setEntries(list => replaceEntry(list, { ...(list || []).find(e => e.id === entry.id), ...patch }));
    setEchoError('');
    try {
      const r = on ? await addReaction(entry.id, kind) : await removeReaction(entry.id, kind);
      pendingRef.current.delete(entry.id);
      if (r && r.entryId === entry.id) {
        // o servidor devolve o estado real (contagens da mesa já com a minha)
        const real = { myReactions: r.myReactions, myFavorite: r.myFavorite, reactionCounts: r.reactionCounts };
        setEntries(list => replaceEntry(list, { ...(list || []).find(e => e.id === entry.id), ...real }));
      }
    } catch {
      pendingRef.current.delete(entry.id);
      const undo = fav ? { myFavorite: entry.myFavorite } : { myReactions: entry.myReactions, reactionCounts: entry.reactionCounts };
      setEntries(list => replaceEntry(list, { ...(list || []).find(e => e.id === entry.id), ...undo }));
      setEchoError(L(lang, 'O vento levou sua reação. Tente de novo.', 'The wind carried your reaction away. Try again.'));
    }
  }, [lang]);
  const onReact = useCallback((entry, kind) => echo(entry, kind), [echo]);
  const onFavorite = useCallback((entry) => echo(entry, FAVORITE_KIND), [echo]);

  // ---- Registro de leitura (o mestre vê nos Ecos da mesa)
  useEffect(() => {
    if (!living || openId == null) return;
    const light = byId.get(openId);
    if (light && shouldSendView(light, viewedRef.current)) registerView(light.id).catch(() => {});
  }, [openId, living, byId]);

  const openEntry = (id) => { setEchoError(''); setOpenId(Number(id)); };
  const openMap = (id) => { setMapId(id); setOpenId(null); changeSub('map'); };

  return (
    <div className="pl-world">
      {/* O nome da campanha, "O Mundo" e a frase já estão na capa e na aba ativa, logo acima:
          repetidos aqui, empurravam o primeiro cartão para y=619 de 900 no PC. Fica só a
          fileira das subvistas, com a contagem de novidades na ponta (no celular a contagem
          sai: o filtro "Novos" e os selos das abas já avisam). */}
      <div className="pl-world-top">
        {showSubChips && (
          <SubChips subs={SUBS} active={sub} onSelect={changeSub} lang={lang} badges={subBadges}
            ariaLabel={L(lang, 'Mundo', 'World')} />
        )}
        {newIds.size > 0 && (
          <div className="pl-world-newcount" role="status">
            <span className="pl-world-newdot" aria-hidden="true" />
            {newIds.size === 1 ? L(lang, '1 novidade desde a sua última visita', '1 new discovery since your last visit') : L(lang, `${newIds.size} novidades desde a sua última visita`, `${newIds.size} new discoveries since your last visit`)}
          </div>
        )}
      </div>

      {error && !entries && <p className="pl-error" role="alert">{error}</p>}
      {!entries && !error && <p className="muted">{L(lang, 'Abrindo o mapa do mundo…', 'Unrolling the world map…')}</p>}

      {entries && entries.length === 0 && <WorldSilence lang={lang} />}

      {entries && entries.length > 0 && sub === 'atlas' && (
        <AtlasView entries={entries} kind={kind} setKind={setKind} counts={counts} newIds={newIds} lang={lang} onOpen={(e) => openEntry(e.id)}
          living={living} campaignId={campaign.id} fogHint={fogHintKey} />
      )}
      {entries && entries.length > 0 && sub === 'map' && (
        <MapView maps={maps} mapId={mapId} setMapId={setMapId} byId={byId} fetchFull={fetchFull} newIds={newIds} lang={lang} onOpen={openEntry} living={living} />
      )}
      {entries && entries.length > 0 && sub === 'timeline' && (
        <TimelineView items={timeline} newIds={newIds} lang={lang} onOpen={openEntry} />
      )}
      {entries && entries.length > 0 && sub === 'documents' && (
        <DocumentsView handouts={handouts} fetchFull={fetchFull} newIds={newIds} lang={lang} onOpen={openEntry} knownIds={byId} />
      )}

      {openId != null && (
        <EntryViewer
          id={openId}
          light={byId.get(openId)}
          entries={entries || []}
          byId={byId}
          fetchFull={fetchFull}
          isNew={newIds.has(openId)}
          lang={lang}
          onOpen={openEntry}
          onOpenMap={openMap}
          onClose={() => setOpenId(null)}
          living={living}
          charName={charName}
          onReact={onReact}
          onFavorite={onFavorite}
          echoError={echoError}
        />
      )}
    </div>
  );
}

/** Estado vazio do Mundo: painel de couro, medalhão com ícone de linha e (opcional) título em folha de ouro. */
function EmptyPanel({ icon, title, children, small = false }) {
  return (
    <div className={`mesa-panel pl-empty${small ? ' small' : ''}`}>
      <span className="pl-defart-ico pl-empty-medal" aria-hidden="true"><LineIcon name={icon} size={small ? 22 : 26} /></span>
      {title && <h3 className="pl-empty-title"><span className="mesa-foil">{title}</span></h3>}
      <p>{children}</p>
    </div>
  );
}

function WorldSilence({ lang }) {
  return (
    <EmptyPanel icon="world" title={L(lang, 'O mundo ainda está envolto em névoa', 'The world is still shrouded in mist')}>
      {L(lang,
        'Quando o mestre revelar lugares, pessoas e segredos, eles aparecem aqui — com um selo de "Novo!" para você não perder nada.',
        'When the DM reveals places, people and secrets, they show up here — with a "New!" seal so you never miss a thing.')}
    </EmptyPanel>
  );
}

// ------------------------------------------------------------------ Atlas
function AtlasView({ entries, kind, setKind, counts, newIds, lang, onOpen, living, campaignId, fogHint }) {
  const kinds = ATLAS_KINDS.filter(k => counts[k]);
  const favs = living ? favoriteEntries(entries) : [];
  // "Novos": o que foi revelado desde a última visita (o mesmo conjunto do selo "Novo!")
  const fresh = entries.filter(e => newIds.has(e.id));
  const k = kind === 'fav' ? (favs.length ? 'fav' : 'all')
    : kind === 'new' ? (fresh.length ? 'new' : 'all')
      : (kind !== 'all' && !counts[kind] ? 'all' : kind);
  const list = k === 'fav'
    ? atlasEntries(favs, { kind: 'all', newIds, excludeHandouts: false })
    : k === 'new'
      ? atlasEntries(fresh, { kind: 'all', newIds, excludeHandouts: false })
      : atlasEntries(entries, { kind: k, newIds });
  return (
    <section aria-label={L(lang, 'Atlas', 'Atlas')}>
      {(kinds.length > 1 || favs.length > 0 || fresh.length > 0) && (
        <div className="pl-filters" role="group" aria-label={L(lang, 'Filtrar por tipo', 'Filter by type')}>
          <button type="button" className={`pl-filter ${k === 'all' ? 'active' : ''}`} aria-pressed={k === 'all'} onClick={() => setKind('all')}>
            {L(lang, 'Tudo', 'All')}
          </button>
          {fresh.length > 0 && (
            <button type="button" className={`pl-filter pl-filter-new ${k === 'new' ? 'active' : ''}`} aria-pressed={k === 'new'} onClick={() => setKind('new')}>
              <span className="pl-dot-new" aria-hidden="true" /> {L(lang, 'Novos', 'New')} <span className="pl-filter-n">{fresh.length}</span>
            </button>
          )}
          {kinds.map(kk => (
            <button key={kk} type="button" className={`pl-filter ${k === kk ? 'active' : ''}`} aria-pressed={k === kk} onClick={() => setKind(kk)}>
              <KindIcon kind={kk} /> {kindLabel(kk, lang, true)} <span className="pl-filter-n">{counts[kk]}</span>
            </button>
          ))}
          {favs.length > 0 && (
            <button type="button" className={`pl-filter lv-filter-fav ${k === 'fav' ? 'active' : ''}`} aria-pressed={k === 'fav'} onClick={() => setKind('fav')}>
              <span className="lv-fav-ico" aria-hidden="true">★</span> {L(lang, 'Quero voltar', 'Return here')}
            </button>
          )}
        </div>
      )}
      {list.length === 0 ? (
        <p className="muted">{L(lang, 'Nada revelado deste tipo ainda.', 'Nothing of this kind revealed yet.')}</p>
      ) : (
        <div className="pl-grid">
          {list.map(e => (living && isFavorite(e)
            ? (
              <div key={e.id} className="lv-card-wrap">
                <EntryCard entry={e} mode="player" isNew={newIds.has(e.id)} onOpen={onOpen} lang={lang} />
                <span className="lv-card-star" title={L(lang, 'Quero voltar aqui', 'I want to return here')}>★</span>
              </div>
            )
            : <EntryCard key={e.id} entry={e} mode="player" isNew={newIds.has(e.id)} onOpen={onOpen} lang={lang} />))}
        </div>
      )}
      {living && k === 'all' && <AtlasFog campaignId={campaignId} lang={lang} hint={fogHint} />}
    </section>
  );
}

// ------------------------------------------------------------------ Mapa
// F11: o mapa do jogador ganha pinça, arrastar e ＋ − ⤢ de 44 (usePanZoom, o
// mesmo do mapa de combate). A caixa tem a proporção da imagem e no máximo 60%
// da altura no celular: fora dela, o dedo rola a página. Tocar num marcador (área
// de 44 px) abre o cartão ou entra no mapa de dentro; os rótulos aparecem onde
// cabem (map-labels.js) — com zoom, nenhum cobre o outro.
const MAP_W = 1000; // largura do mapa em "unidades do conteúdo" (a altura segue a proporção)
const PIN_HIT = 24; // raio de toque do marcador, em px de tela
const PIN_HEAD = 20; // o meio da cabeça do marcador fica ~20 px acima da ponta

function MapView({ maps, mapId, setMapId, byId, fetchFull, newIds, lang, onOpen, living }) {
  const [trail, setTrail] = useState([]);           // mapas aninhados abertos pelo pin
  const rootId = maps.some(m => m.id === mapId) ? mapId : (maps.find(m => !m.parentId) || maps[0])?.id;
  const currentId = trail.length ? trail[trail.length - 1] : rootId;
  const current = byId.get(currentId);
  const [full, setFull] = useState(null);
  const [failed, setFailed] = useState(false);
  const [help, setHelp] = useState(false);          // a dica de uso (no celular fica atrás do "?")

  useEffect(() => {
    let alive = true;
    setFull(null); setFailed(false);
    if (current) fetchFull(current).then(f => { if (alive) setFull(f); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [current?.id, current?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!maps.length) {
    return (
      <EmptyPanel small icon="adventures">
        {L(lang, 'Nenhum mapa revelado ainda. Quando o mestre mostrar um, ele aparece aqui com os lugares marcados.', 'No map revealed yet. When the DM shows one, it appears here with its places marked.')}
      </EmptyPanel>
    );
  }
  const pins = full?.data?.map?.pins || [];
  const goPin = (pin) => {
    const target = pin.entryId && byId.get(pin.entryId);
    if (target?.isMap) setTrail(t => [...t, target.id]);
    else if (target) onOpen(target.id);
  };
  const img = current && worldImageUrl(current);
  return (
    <section className="pl-map" aria-label={L(lang, 'Mapa', 'Map')}>
      {maps.length > 1 && (
        <div className="pl-filters" role="group" aria-label={L(lang, 'Escolher mapa', 'Choose map')}>
          {maps.map(m => (
            <button key={m.id} type="button" className={`pl-filter ${rootId === m.id && !trail.length ? 'active' : ''}`}
              onClick={() => { setMapId(m.id); setTrail([]); }}>
              <LineIcon name="map" /> {m.name}{newIds.has(m.id) && <span className="pl-dot-new" aria-label={L(lang, 'novo', 'new')} />}
            </button>
          ))}
        </div>
      )}
      {trail.length > 0 && (
        <nav className="pl-crumbs" aria-label={L(lang, 'Mapas abertos', 'Open maps')}>
          <button type="button" className="pl-crumb" onClick={() => setTrail([])}>{byId.get(rootId)?.name}</button>
          {trail.map((id, i) => (
            <span key={id} className="pl-crumb-step">
              <span aria-hidden="true"> › </span>
              <button type="button" className="pl-crumb" disabled={i === trail.length - 1} onClick={() => setTrail(trail.slice(0, i + 1))}>{byId.get(id)?.name}</button>
            </span>
          ))}
        </nav>
      )}
      <div className="pl-map-frame">
        <div className="pl-map-title">
          <span className="pl-map-name"><span className="mesa-gem" aria-hidden="true" /><span className="mesa-foil">{current?.name}</span></span>
          <span className="pl-map-title-acts">
            <button type="button" className="pl-map-help" aria-expanded={help} aria-controls="pl-map-hint" onClick={() => setHelp(v => !v)}
              aria-label={L(lang, 'Como usar o mapa', 'How to use the map')}>?</button>
            <button type="button" className="mesa-btn pl-map-read" onClick={() => current && onOpen(current.id)}>{L(lang, 'Ler sobre', 'Read about it')}</button>
          </span>
        </div>
        {/* um por mapa: trocar de mapa volta para "ver tudo" */}
        <MapCanvas key={currentId} name={current?.name || ''} img={img} pins={pins} byId={byId} newIds={newIds} lang={lang} living={living} onPin={goPin} />
        <p id="pl-map-hint" className={`pl-map-hint${help ? ' is-open' : ''}`}>{L(lang, 'Pinça, ＋ e − para ver de perto; arraste para andar pelo mapa. Toque num marcador para ler sobre ele.',
          'Pinch, ＋ and − to look closer; drag to move around. Tap a pin to read about it.')}</p>
        {failed && <p className="muted small">{L(lang, 'Não deu para carregar os marcadores.', 'Could not load the pins.')}</p>}
      </div>
    </section>
  );
}

/** A imagem do mapa com pinça, arrastar e ＋ − ⤢ (usePanZoom), névoa e marcadores. */
function MapCanvas({ name, img, pins, byId, newIds, lang, living, onPin }) {
  const [ratio, setRatio] = useState(null);         // largura/altura da imagem
  const [widths, setWidths] = useState({});         // id → largura do rótulo (medida)
  const narrow = useMedia('(max-width: 767px)');    // celular: ＋ − ⤢ numa fileira em cima à esquerda
  const stageRef = useRef(null);
  const content = { w: MAP_W, h: Math.round(MAP_W / (ratio || 1.5)) };
  const placedRef = useRef({ placed: [], labels: new Map() });
  const pz = usePanZoom({
    content,
    // um toque (sem arrastar): o nome à vista de um marcador (o rótulo é parte do
    // alvo) ou o marcador mais perto da cabeça, dentro de 24 px de tela
    onTap: (p) => {
      const S = pz.scale || 1;
      const open = pins.filter(x => x.entryId && byId.has(x.entryId));
      const { placed, labels: shown } = placedRef.current;
      const byLabel = labelAt(placed.filter(x => open.some(o => o.id === x.id)), shown,
        { x: pz.view.x + p.x * S, y: pz.view.y + p.y * S }, pz.box);
      const items = open.map(x => ({ id: x.id, x: (x.x ?? 0.5) * content.w, y: (x.y ?? 0.5) * content.h - PIN_HEAD / S, r: 0 }));
      const id = byLabel ?? nearestHit(items, p, PIN_HIT / S)?.id;
      const pin = id != null && pins.find(x => x.id === id);
      if (pin) onPin(pin);
    },
  });

  // Rótulos que cabem nesta vista (px de tela na caixa); os novos primeiro. Os ＋ − ⤢
  // ficam à esquerda (à direita, o dado flutuante do celular cobriria o ⤢).
  const placed = useMemo(() => pins.map(p => ({
    id: p.id,
    x: pz.view.x + (p.x ?? 0.5) * content.w * pz.scale,
    y: pz.view.y + (p.y ?? 0.5) * content.h * pz.scale,
    w: widths[p.id] || 0,
    prio: pinPriority({ visible: true, isNew: !!(p.entryId && newIds.has(p.entryId)) }),
  })), [pins, pz.view.x, pz.view.y, pz.scale, content.w, content.h, widths, newIds]);
  const labels = useMemo(() => {
    // a área dos botões de zoom, de onde os rótulos fogem: coluna no PC, fileira no celular
    const col = zoomControlsRect(pz.box, { side: 'left' });
    const avoid = narrow && col ? { l: col.l, t: 8, r: col.l + 3 * 44 + 2 * 6, b: 8 + 44 } : col;
    return layoutPinLabels(placed, { w: pz.box.w, h: pz.box.h }, { avoid: [avoid] });
  }, [placed, pz.box.w, pz.box.h, narrow]); // eslint-disable-line react-hooks/exhaustive-deps
  placedRef.current = { placed, labels };

  // mede os rótulos (os escondidos também: visibility, não display)
  const [fontsTick, setFontsTick] = useState(0);
  useEffect(() => { document.fonts?.ready?.then(() => setFontsTick(n => n + 1)).catch(() => {}); }, []);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const next = {};
    stage.querySelectorAll('[data-pin]').forEach(el => {
      const lab = el.querySelector('.pl-pin-label');
      next[el.getAttribute('data-pin')] = lab ? lab.offsetWidth : 0;
    });
    setWidths(cur => {
      const keys = Object.keys(next);
      return keys.length === Object.keys(cur).length && keys.every(k => cur[k] === next[k]) ? cur : next;
    });
  }, [pins, byId, fontsTick]);

  return (
    <div className={`pl-map-canvas${pz.mode !== 'idle' ? ` is-${pz.mode}` : ''}`} ref={pz.boxRef} {...pz.handlers}
      style={{ aspectRatio: `${content.w} / ${content.h}` }} data-zoom={pz.view.z.toFixed(2)}>
      {!img && <div className="pl-map-noimg">{L(lang, 'O mestre ainda não desenhou este mapa.', 'The DM has not drawn this map yet.')}</div>}
      <div className="pl-map-stage" ref={stageRef}
        style={{ width: content.w, height: content.h, transform: `translate(${pz.view.x}px, ${pz.view.y}px) scale(${pz.scale})` }}>
        {img && (
          <img src={img} alt={name} className="pl-map-img" draggable={false}
            onLoad={e => { const im = e.currentTarget; if (im.naturalWidth && im.naturalHeight) setRatio(im.naturalWidth / im.naturalHeight); }} />
        )}
        {img && living && <MapFog pins={pins} known={byId} />}
        {pins.map(p => {
          const target = p.entryId && byId.get(p.entryId);
          const label = p.label || target?.name || '';
          const lab = labels.get(p.id);
          return (
            <button key={p.id} type="button" data-pin={p.id}
              className={`pl-pin ${target?.isMap ? 'is-map' : ''} ${target && newIds.has(target.id) ? 'is-new' : ''}${lab ? '' : ' is-label-off'}${lab?.above ? ' is-label-above' : ''}`}
              style={{ left: `${(p.x ?? 0.5) * 100}%`, top: `${(p.y ?? 0.5) * 100}%`, '--pin-scale': 1 / (pz.scale || 1), '--label-dx': `${lab?.dx || 0}px` }}
              // teclado (Enter/Espaço); o toque e o mouse chegam pelo onTap da caixa
              onClick={(e) => { if (e.detail === 0) onPin(p); }}
              disabled={!target} aria-label={label || L(lang, 'Marcador', 'Pin')}>
              <span className="pl-pin-dot" aria-hidden="true"><span className="pl-pin-ico">{target ? (target.isMap ? <LineIcon name="map" size={16} /> : <KindIcon kind={target.kind} size={16} />) : '✦'}</span></span>
              {label && <span className="pl-pin-label" aria-hidden="true">{label}</span>}
            </button>
          );
        })}
      </div>
      <div className="pl-map-zoom" role="group" aria-label={L(lang, 'Zoom do mapa', 'Map zoom')}
        onPointerDown={e => e.stopPropagation()}>
        <button type="button" onClick={pz.zoomIn} disabled={!pz.canZoomIn} aria-label={L(lang, 'Aproximar', 'Zoom in')}>＋</button>
        <button type="button" onClick={pz.zoomOut} disabled={!pz.canZoomOut} aria-label={L(lang, 'Afastar', 'Zoom out')}>－</button>
        <button type="button" className="pl-map-fit" onClick={pz.fit} disabled={!pz.canZoomOut} aria-label={L(lang, 'Ver o mapa inteiro', 'Fit the whole map')}>⤢</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Linha do tempo
function TimelineView({ items, newIds, lang, onOpen }) {
  if (!items.length) {
    return (
      <EmptyPanel small icon="timeline">
        {L(lang, 'A história deste mundo ainda não foi contada. Os eventos que o mestre revelar aparecem aqui, em ordem.', 'This world\'s history is untold so far. Events the DM reveals appear here, in order.')}
      </EmptyPanel>
    );
  }
  return (
    <ol className="pl-timeline">
      {items.map(e => (
        <li key={e.id} className={`pl-tl-item ${newIds.has(e.id) ? 'is-new' : ''}`}>
          <span className="pl-tl-dot" aria-hidden="true"><KindIcon kind={e.kind} size={13} /></span>
          <button type="button" className="pl-tl-card" onClick={() => onOpen(e.id)}>
            <span className="pl-tl-when">{e.whenLabel}</span>
            <span className="pl-tl-name">{e.name}{newIds.has(e.id) && <span className="pl-new-chip">{L(lang, 'Novo!', 'New!')}</span>}</span>
            {e.summary && <span className="pl-tl-sum">{e.summary}</span>}
          </button>
        </li>
      ))}
    </ol>
  );
}

// ------------------------------------------------------------------ Documentos
function DocumentsView({ handouts, fetchFull, newIds, lang, onOpen, knownIds }) {
  const [fulls, setFulls] = useState({});
  useEffect(() => {
    let alive = true;
    handouts.forEach(h => {
      fetchFull(h).then(f => { if (alive) setFulls(prev => (prev[h.id] === f ? prev : { ...prev, [h.id]: f })); }).catch(() => {});
    });
    return () => { alive = false; };
  }, [handouts.map(h => `${h.id}:${h.updatedAt}`).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!handouts.length) {
    return (
      <EmptyPanel small icon="requests">
        {L(lang, 'Nenhum documento ainda. Cartas, cartazes e bilhetes que o mestre entregar ficam guardados aqui.', 'No handouts yet. Letters, posters and notes the DM hands out are kept here.')}
      </EmptyPanel>
    );
  }
  return (
    <div className="pl-docs">
      {handouts.map(h => (
        <div key={h.id} className="pl-doc-wrap" role="button" tabIndex={0}
          aria-label={h.name}
          onClick={() => onOpen(h.id)}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;   // uma menção dentro do documento trata a própria tecla
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(h.id); }
          }}>
          {newIds.has(h.id) && <span className="pl-new-chip pl-doc-new">{L(lang, 'Novo!', 'New!')}</span>}
          <Handout entry={fulls[h.id] || h} lang={lang} onMention={(id) => knownIds.has(id) && onOpen(id)} />
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Cartão aberto
function EntryViewer({ id, light, entries, byId, fetchFull, isNew, lang, onOpen, onOpenMap, onClose, living, charName, onReact, onFavorite, echoError }) {
  const [full, setFull] = useState(null);
  const [missing, setMissing] = useState(false);
  const [history, setHistory] = useState([]);
  const panelRef = useRef(null);
  const [scrolled, setScrolled] = useState(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // quem abriu o cartão (lido no 1º desenho, antes de o foco entrar): recebe o foco de volta
  const [opener] = useState(() => (typeof document !== 'undefined' ? document.activeElement : null));

  useEffect(() => {
    let alive = true;
    setFull(null); setMissing(false);
    const base = light || { id, updatedAt: '', visibility: '' };
    fetchFull(base).then(f => { if (alive) setFull(f); }).catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [id, light?.updatedAt, light?.visibility]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc fecha; Tab dá a volta dentro do cartão (antes escapava para o dado flutuante atrás).
  // O foco entra UMA vez (antes voltava ao painel a cada redesenho — o poll de 10 s o tirava
  // dos botões de reação) e, ao fechar, volta para o cartão que abriu.
  useEffect(() => {
    const onKey = (e) => {
      const d = panelRef.current;
      if (!d) return;
      if (e.key === 'Escape') { closeRef.current?.(); return; }
      if (e.key !== 'Tab') return;
      const items = [...d.querySelectorAll(FOCUSABLE)].filter(x => x.getClientRects().length > 0);
      if (!items.length) { e.preventDefault(); d.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const cur = document.activeElement;
      if (!d.contains(cur)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && (cur === first || cur === d)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    try { panelRef.current?.focus({ preventScroll: true }); } catch { /* ok */ }
    return () => {
      window.removeEventListener('keydown', onKey);
      if (opener && opener !== document.body && opener.isConnected && typeof opener.focus === 'function') {
        try { opener.focus({ preventScroll: true }); } catch { /* ok */ }
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // outro cartão (menção, relação, voltar): a leitura recomeça do topo
  useEffect(() => { const d = panelRef.current; if (d) d.scrollTop = 0; setScrolled(0); }, [id]);

  const go = (nextId) => {
    if (!byId.has(nextId) || nextId === id) return;
    setHistory(h => [...h, id]);
    onOpen(nextId);
  };
  const back = () => {
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    if (prev != null) onOpen(prev);
  };

  const e = full || light;
  const partial = e?.visibility === 'partial';
  const d = full?.data || {};
  const sub = e ? subtitleOf(full || e, lang) : '';
  const rel = useMemo(() => backlinks(entries, id).filter(b => b.entry), [entries, id]);
  const parent = e?.parentId && byId.get(e.parentId);
  const links = (e?.links || []).filter(l => byId.has(l.to));
  const facts = !partial && full ? factsOf(full, d, lang) : [];
  // Relações numa lista só, sem repetir: "Fica em" (o pai), depois as ligações agrupadas
  // pelo rótulo (a ligação "fica em" para o próprio pai não entra de novo) e, por último,
  // "Aparece em" só com quem ainda não foi citado acima.
  const relRows = [];
  const relShown = new Set();
  const addRel = (label, target, note) => {
    let row = relRows.find(r => r.label === label);
    if (!row) { row = { label, items: [] }; relRows.push(row); }
    const had = row.items.find(x => x.entry.id === target.id);
    if (had) { if (note && !had.note) had.note = note; return; }
    row.items.push({ entry: target, note: note || '' });
    relShown.add(target.id);
  };
  if (parent) addRel(L(lang, 'Fica em', 'Located in'), parent);
  for (const l of links) addRel(relLabel(l.rel, lang), byId.get(l.to), l.note);
  for (const b of rel) if (!relShown.has(b.entry.id)) addRel(L(lang, 'Aparece em', 'Appears in'), b.entry);

  return (
    <div className="pl-viewer-backdrop" onClick={onClose}>
      <div className={`pl-viewer ${partial ? 'is-rumor' : ''} pl-viewer-${e?.kind || 'lore'}`} role="dialog" aria-modal="true"
        aria-label={e?.name || L(lang, 'Cartão', 'Card')} tabIndex={-1} ref={panelRef}
        // 1 = rolou (a barra fica opaca); 2 = o título grande já saiu da vista (o nome vai para a barra)
        onScroll={(ev) => { const top = ev.currentTarget.scrollTop; const on = top > 130 ? 2 : top > 24 ? 1 : 0; if (on !== scrolled) setScrolled(on); }}
        onClick={ev => ev.stopPropagation()} style={{ '--wl-kind': KIND_META[e?.kind]?.color }}>
        {/* a barra da folha da mesa: ← Voltar (quando veio de outro cartão), o nome do cartão
            ao rolar (o título grande saiu da vista) e o ✕ redondo de 44 px */}
        <div className={`pl-viewer-bar${scrolled ? ' is-scrolled' : ''}${scrolled > 1 ? ' is-deep' : ''}`}>
          {history.length > 0
            ? <button type="button" className="mesa-btn pl-viewer-back" onClick={back}><span aria-hidden="true">←</span> {L(lang, 'Voltar', 'Back')}</button>
            : <span />}
          <span className="pl-viewer-bar-title" aria-hidden="true"><span className="mesa-foil">{e?.name}</span></span>
          <button type="button" className="mesa-icon-btn pl-viewer-x" onClick={onClose} aria-label={L(lang, 'Fechar', 'Close')} title={L(lang, 'Fechar (Esc)', 'Close (Esc)')}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {missing && !e && <p className="pl-viewer-missing">{L(lang, 'Este cartão não está mais disponível.', 'This card is no longer available.')}</p>}

        {e && e.kind === 'handout' && full ? (
          <div className="pl-viewer-doc">
            {/* .pl-viewer-doc (não -handout: a caixa de fora já recebe pl-viewer-<tipo>, e o
                documento ganhava a margem duas vezes — a barra ficava encolhida num canto) */}
            <Handout entry={full} lang={lang} onMention={go} />
            {living && light && (
              <ReactionBar entry={light} charName={charName} lang={lang} onReact={onReact} onFavorite={onFavorite} error={echoError} />
            )}
          </div>
        ) : e && (
          <>
            <div className="pl-viewer-hero">
              <EntryImage entry={e} className="pl-viewer-img" alt="" />
              <div className="pl-viewer-hero-fade" aria-hidden="true" />
              <div className="pl-viewer-hero-text">
                <span className="pl-viewer-kind"><KindIcon kind={e.kind} /> {kindLabel(e.kind, lang)}{sub ? ` · ${sub}` : ''}</span>
                <h2 className="pl-viewer-name">{e.name}{isNew && <span className="pl-new-chip">{L(lang, 'Novo!', 'New!')}</span>}</h2>
              </div>
            </div>

            <div className="pl-viewer-body">
              {e.summary && <p className="pl-viewer-summary">{e.summary}</p>}

              {partial ? (
                <div className="pl-rumor-box">
                  <div className="pl-rumor-title">{L(lang, 'Rumores…', 'Rumors…')}</div>
                  <div className="pl-rumor-blur" aria-hidden="true">
                    <span /><span /><span />
                  </div>
                  <p>{L(lang, 'Você só ouviu falar disso. Talvez descubra mais durante o jogo.', 'You have only heard of this. Perhaps you will learn more in play.')}</p>
                </div>
              ) : (
                <>
                  {!full && !missing && <p className="muted">{L(lang, 'Desenrolando o pergaminho…', 'Unrolling the scroll…')}</p>}
                  {paragraphs(full?.body).map((p, i) => <p key={i} className="pl-viewer-p"><MentionText text={p} onMention={go} knownIds={byId} /></p>)}

                  {facts.length > 0 && (
                    <dl className="pl-facts">
                      {facts.map(([k, v]) => <div key={k} className="pl-fact"><dt>{k}</dt><dd>{v}</dd></div>)}
                    </dl>
                  )}

                  {(full?.secrets || []).length > 0 && (
                    <section className="pl-secrets">
                      <MesaTitle as="h3">{L(lang, 'Segredos descobertos', 'Secrets uncovered')}</MesaTitle>
                      {full.secrets.map(s => (
                        <div key={s.id} className="pl-secret">
                          <span className="pl-secret-when">{secretSessionLabel(s, lang)}</span>
                          <p><MentionText text={s.text} onMention={go} knownIds={byId} /></p>
                        </div>
                      ))}
                    </section>
                  )}
                </>
              )}

              {e.isMap && (
                <button type="button" className="mesa-btn is-primary pl-viewer-mapbtn" onClick={() => onOpenMap(e.id)}>
                  <LineIcon name="map" /> {L(lang, 'Ver mapa', 'Open map')}
                </button>
              )}

              {relRows.length > 0 && (
                <section className="pl-relations" aria-label={L(lang, 'Relações', 'Relations')}>
                  {relRows.map(row => (
                    <div key={row.label} className="pl-rel-row">
                      <span className="pl-rel-label">{row.label}</span>
                      <span className="pl-rel-chips">
                        {row.items.map(x => (
                          <span key={x.entry.id} className="pl-rel-item">
                            <button type="button" className="pl-rel-chip" onClick={() => go(x.entry.id)}>
                              <KindIcon kind={x.entry.kind} /> {x.entry.name}
                            </button>
                            {x.note && <span className="pl-rel-note">{x.note}</span>}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </section>
              )}

              {(e.tags || []).length > 0 && (
                <div className="pl-viewer-tags">{e.tags.map(tag => <span key={tag} className="pl-tag">#{tag}</span>)}</div>
              )}
              {e.whenLabel && <div className="pl-viewer-when"><LineIcon name="timeline" /> {e.whenLabel}</div>}

              {living && light && (
                <ReactionBar entry={light} charName={charName} lang={lang} onReact={onReact} onFavorite={onFavorite} error={echoError} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Campos públicos por tipo (o backend já tirou statblock, destinatários etc.). */
function factsOf(full, d, lang) {
  const out = [];
  if (full.kind === 'npc') {
    if (d.appearance) out.push([L(lang, 'Aparência', 'Appearance'), d.appearance]);
    if (d.mannerism) out.push([L(lang, 'Jeito', 'Mannerism'), d.mannerism]);
    if (d.wants) out.push([L(lang, 'O que quer', 'Wants'), d.wants]);
  } else if (full.kind === 'faction') {
    if (d.goal) out.push([L(lang, 'Objetivo', 'Goal'), d.goal]);
  } else if (full.kind === 'item') {
    if (d.rarity) out.push([L(lang, 'Raridade', 'Rarity'), rarityLabel(d.rarity, lang)]);
    if (d.attunement) out.push([L(lang, 'Sintonização', 'Attunement'), L(lang, 'Exige sintonização', 'Requires attunement')]);
    if (d.effect) out.push([L(lang, 'Efeito', 'Effect'), d.effect]);
  }
  return out;
}
