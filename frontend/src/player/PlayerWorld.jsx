// Mundo do jogador (WP5): só o que o mestre revelou, do jeito mais bonito possível.
//
// Subvistas: Atlas (cartões por tipo) · Mapa (pins revelados) · Linha do tempo ·
// Documentos (handouts com moldura). Selo "Novo!" em tudo o que foi revelado
// depois da última visita; abrir a aba chama /world/seen (zera o badge).
// Polling da lista a cada 10 s, só enquanto a aba está aberta (montada).
//
// Props: campaign, lang, sub? (força a subvista), entryId? (abre um cartão),
//        onSeen?() (a casca recarrega o badge), showSubChips (padrão true).
// Também lê useArea() (sub/params/goTo) quando montado dentro da casca.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePolling } from '../api/polling.js';
import { errorMessage } from '../api/errors.js';
import useArea from '../shell/useArea.js';
import { SubChips } from '../shell/AreaNav.jsx';
import EntryCard, { EntryImage } from '../world/EntryCard.jsx';
import { getEntry, listWorld, markWorldSeen, worldImageUrl } from '../world/world-api.js';
import {
  KIND_META, backlinks, kindLabel, rarityLabel, relLabel, subtitleOf, timelineEntries,
} from '../world/world-model.js';
import { atlasEntries, kindCounts, L, newEntryIds, paragraphs, secretSessionLabel } from './player-model.js';
import Handout from './Handout.jsx';
import MentionText from './MentionText.jsx';
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
      setEntries(list);
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

  const openEntry = (id) => setOpenId(Number(id));
  const openMap = (id) => { setMapId(id); setOpenId(null); changeSub('map'); };

  return (
    <div className="pl-world">
      <header className="pl-world-head">
        <div>
          <div className="pl-eyebrow">{campaign.name}</div>
          <h2 className="pl-world-title">{L(lang, 'O Mundo', 'The World')}</h2>
          {campaign.tagline && <p className="pl-world-tagline">{campaign.tagline}</p>}
        </div>
        {newIds.size > 0 && (
          <div className="pl-world-newcount" role="status">
            ✨ {newIds.size === 1 ? L(lang, '1 novidade', '1 new discovery') : L(lang, `${newIds.size} novidades`, `${newIds.size} new discoveries`)}
          </div>
        )}
      </header>

      {showSubChips && (
        <SubChips subs={SUBS} active={sub} onSelect={changeSub} lang={lang}
          labels={Object.fromEntries(SUBS.map(s => [s, L(lang, ...SUB_LABELS[s])]))} badges={subBadges} />
      )}

      {error && !entries && <p className="pl-error" role="alert">{error}</p>}
      {!entries && !error && <p className="muted">{L(lang, 'Abrindo o mapa do mundo…', 'Unrolling the world map…')}</p>}

      {entries && entries.length === 0 && <WorldSilence lang={lang} />}

      {entries && entries.length > 0 && sub === 'atlas' && (
        <AtlasView entries={entries} kind={kind} setKind={setKind} counts={counts} newIds={newIds} lang={lang} onOpen={(e) => openEntry(e.id)} />
      )}
      {entries && entries.length > 0 && sub === 'map' && (
        <MapView maps={maps} mapId={mapId} setMapId={setMapId} byId={byId} fetchFull={fetchFull} newIds={newIds} lang={lang} onOpen={openEntry} />
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
        />
      )}
    </div>
  );
}

function WorldSilence({ lang }) {
  return (
    <div className="pl-empty">
      <div className="pl-empty-art" aria-hidden="true">🗺️</div>
      <h3>{L(lang, 'O mundo ainda está envolto em névoa', 'The world is still shrouded in mist')}</h3>
      <p>{L(lang,
        'Quando o mestre revelar lugares, pessoas e segredos, eles aparecem aqui — com um selo de "Novo!" para você não perder nada.',
        'When the DM reveals places, people and secrets, they show up here — with a "New!" seal so you never miss a thing.')}</p>
    </div>
  );
}

// ------------------------------------------------------------------ Atlas
function AtlasView({ entries, kind, setKind, counts, newIds, lang, onOpen }) {
  const kinds = ATLAS_KINDS.filter(k => counts[k]);
  const k = kind !== 'all' && !counts[kind] ? 'all' : kind;
  const list = atlasEntries(entries, { kind: k, newIds });
  return (
    <section aria-label={L(lang, 'Atlas', 'Atlas')}>
      {kinds.length > 1 && (
        <div className="pl-filters" role="group" aria-label={L(lang, 'Filtrar por tipo', 'Filter by type')}>
          <button type="button" className={`pl-filter ${k === 'all' ? 'active' : ''}`} aria-pressed={k === 'all'} onClick={() => setKind('all')}>
            {L(lang, 'Tudo', 'All')}
          </button>
          {kinds.map(kk => (
            <button key={kk} type="button" className={`pl-filter ${k === kk ? 'active' : ''}`} aria-pressed={k === kk} onClick={() => setKind(kk)}>
              <span aria-hidden="true">{KIND_META[kk].icon}</span> {kindLabel(kk, lang, true)} <span className="pl-filter-n">{counts[kk]}</span>
            </button>
          ))}
        </div>
      )}
      {list.length === 0 ? (
        <p className="muted">{L(lang, 'Nada revelado deste tipo ainda.', 'Nothing of this kind revealed yet.')}</p>
      ) : (
        <div className="pl-grid">
          {list.map(e => <EntryCard key={e.id} entry={e} mode="player" isNew={newIds.has(e.id)} onOpen={onOpen} lang={lang} />)}
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ Mapa
function MapView({ maps, mapId, setMapId, byId, fetchFull, newIds, lang, onOpen }) {
  const [trail, setTrail] = useState([]);           // mapas aninhados abertos pelo pin
  const rootId = maps.some(m => m.id === mapId) ? mapId : (maps.find(m => !m.parentId) || maps[0])?.id;
  const currentId = trail.length ? trail[trail.length - 1] : rootId;
  const current = byId.get(currentId);
  const [full, setFull] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFull(null); setFailed(false);
    if (current) fetchFull(current).then(f => { if (alive) setFull(f); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [current?.id, current?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!maps.length) {
    return (
      <div className="pl-empty small">
        <div className="pl-empty-art" aria-hidden="true">🧭</div>
        <p>{L(lang, 'Nenhum mapa revelado ainda. Quando o mestre mostrar um, ele aparece aqui com os lugares marcados.', 'No map revealed yet. When the DM shows one, it appears here with its places marked.')}</p>
      </div>
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
              🗺 {m.name}{newIds.has(m.id) && <span className="pl-dot-new" aria-label={L(lang, 'novo', 'new')} />}
            </button>
          ))}
        </div>
      )}
      {trail.length > 0 && (
        <nav className="pl-crumbs" aria-label={L(lang, 'Mapas abertos', 'Open maps')}>
          <button type="button" className="pl-crumb" onClick={() => setTrail([])}>{byId.get(rootId)?.name}</button>
          {trail.map((id, i) => (
            <span key={id}>
              <span aria-hidden="true"> › </span>
              <button type="button" className="pl-crumb" disabled={i === trail.length - 1} onClick={() => setTrail(trail.slice(0, i + 1))}>{byId.get(id)?.name}</button>
            </span>
          ))}
        </nav>
      )}
      <div className="pl-map-frame">
        <div className="pl-map-title">
          <span>{current?.name}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => current && onOpen(current.id)}>{L(lang, 'Ler sobre', 'Read about it')}</button>
        </div>
        <div className="pl-map-canvas">
          {img ? <img src={img} alt={current?.name || ''} className="pl-map-img" draggable={false} />
            : <div className="pl-map-noimg">{L(lang, 'O mestre ainda não desenhou este mapa.', 'The DM has not drawn this map yet.')}</div>}
          {pins.map(p => {
            const target = p.entryId && byId.get(p.entryId);
            const label = p.label || target?.name || '';
            return (
              <button key={p.id} type="button" className={`pl-pin ${target?.isMap ? 'is-map' : ''} ${target && newIds.has(target.id) ? 'is-new' : ''}`}
                style={{ left: `${(p.x ?? 0.5) * 100}%`, top: `${(p.y ?? 0.5) * 100}%` }}
                onClick={() => goPin(p)} disabled={!target} aria-label={label || L(lang, 'Marcador', 'Pin')}>
                <span className="pl-pin-dot" aria-hidden="true"><span className="pl-pin-ico">{target ? KIND_META[target.kind]?.icon : '✦'}</span></span>
                {label && <span className="pl-pin-label">{label}</span>}
              </button>
            );
          })}
        </div>
        {failed && <p className="muted small">{L(lang, 'Não deu para carregar os marcadores.', 'Could not load the pins.')}</p>}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Linha do tempo
function TimelineView({ items, newIds, lang, onOpen }) {
  if (!items.length) {
    return (
      <div className="pl-empty small">
        <div className="pl-empty-art" aria-hidden="true">⌛</div>
        <p>{L(lang, 'A história deste mundo ainda não foi contada. Os eventos que o mestre revelar aparecem aqui, em ordem.', 'This world\'s history is untold so far. Events the DM reveals appear here, in order.')}</p>
      </div>
    );
  }
  return (
    <ol className="pl-timeline">
      {items.map(e => (
        <li key={e.id} className={`pl-tl-item ${newIds.has(e.id) ? 'is-new' : ''}`}>
          <span className="pl-tl-dot" aria-hidden="true">{KIND_META[e.kind]?.icon}</span>
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
      <div className="pl-empty small">
        <div className="pl-empty-art" aria-hidden="true">✉️</div>
        <p>{L(lang, 'Nenhum documento ainda. Cartas, cartazes e bilhetes que o mestre entregar ficam guardados aqui.', 'No handouts yet. Letters, posters and notes the DM hands out are kept here.')}</p>
      </div>
    );
  }
  return (
    <div className="pl-docs">
      {handouts.map(h => (
        <div key={h.id} className="pl-doc-wrap" role="button" tabIndex={0}
          onClick={() => onOpen(h.id)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(h.id); }}>
          {newIds.has(h.id) && <span className="pl-new-chip pl-doc-new">{L(lang, 'Novo!', 'New!')}</span>}
          <Handout entry={fulls[h.id] || h} lang={lang} onMention={(id) => knownIds.has(id) && onOpen(id)} />
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Cartão aberto
function EntryViewer({ id, light, entries, byId, fetchFull, isNew, lang, onOpen, onOpenMap, onClose }) {
  const [full, setFull] = useState(null);
  const [missing, setMissing] = useState(false);
  const [history, setHistory] = useState([]);
  const panelRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setFull(null); setMissing(false);
    const base = light || { id, updatedAt: '', visibility: '' };
    fetchFull(base).then(f => { if (alive) setFull(f); }).catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [id, light?.updatedAt, light?.visibility]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
  const relSeen = new Set();
  const appearsIn = rel.filter(b => { if (relSeen.has(b.entry.id)) return false; relSeen.add(b.entry.id); return true; });
  const parent = e?.parentId && byId.get(e.parentId);
  const links = (e?.links || []).filter(l => byId.has(l.to));
  const facts = !partial && full ? factsOf(full, d, lang) : [];

  return (
    <div className="pl-viewer-backdrop" onClick={onClose}>
      <div className={`pl-viewer ${partial ? 'is-rumor' : ''} pl-viewer-${e?.kind || 'lore'}`} role="dialog" aria-modal="true"
        aria-label={e?.name || L(lang, 'Cartão', 'Card')} tabIndex={-1} ref={panelRef}
        onClick={ev => ev.stopPropagation()} style={{ '--wl-kind': KIND_META[e?.kind]?.color }}>
        <div className="pl-viewer-bar">
          {history.length > 0
            ? <button type="button" className="btn btn-ghost btn-sm" onClick={back}>← {L(lang, 'Voltar', 'Back')}</button>
            : <span />}
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label={L(lang, 'Fechar', 'Close')}>✕ {L(lang, 'Fechar', 'Close')}</button>
        </div>

        {missing && !e && <p className="pl-viewer-missing">{L(lang, 'Este cartão não está mais disponível.', 'This card is no longer available.')}</p>}

        {e && e.kind === 'handout' && full ? (
          <div className="pl-viewer-handout">
            <Handout entry={full} lang={lang} onMention={go} />
          </div>
        ) : e && (
          <>
            <div className="pl-viewer-hero">
              <EntryImage entry={e} className="pl-viewer-img" alt="" />
              <div className="pl-viewer-hero-fade" aria-hidden="true" />
              <div className="pl-viewer-hero-text">
                <span className="pl-viewer-kind"><span aria-hidden="true">{KIND_META[e.kind]?.icon}</span> {kindLabel(e.kind, lang)}{sub ? ` · ${sub}` : ''}</span>
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
                      <h3>🗝 {L(lang, 'Segredos descobertos', 'Secrets uncovered')}</h3>
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
                <button type="button" className="btn btn-primary btn-sm pl-viewer-mapbtn" onClick={() => onOpenMap(e.id)}>
                  🗺 {L(lang, 'Ver mapa', 'Open map')}
                </button>
              )}

              {(parent || links.length > 0 || appearsIn.length > 0) && (
                <section className="pl-relations">
                  {parent && (
                    <div className="pl-rel-row">
                      <span className="pl-rel-label">{L(lang, 'Fica em', 'Located in')}</span>
                      <button type="button" className="pl-rel-chip" onClick={() => go(parent.id)}>{KIND_META[parent.kind]?.icon} {parent.name}</button>
                    </div>
                  )}
                  {links.map((l, i) => (
                    <div key={`${l.to}-${i}`} className="pl-rel-row">
                      <span className="pl-rel-label">{relLabel(l.rel, lang)}</span>
                      <button type="button" className="pl-rel-chip" onClick={() => go(l.to)}>{KIND_META[byId.get(l.to).kind]?.icon} {byId.get(l.to).name}</button>
                      {l.note && <span className="pl-rel-note">{l.note}</span>}
                    </div>
                  ))}
                  {appearsIn.length > 0 && (
                    <div className="pl-rel-row">
                      <span className="pl-rel-label">{L(lang, 'Aparece em', 'Appears in')}</span>
                      <span className="pl-rel-chips">
                        {appearsIn.map(b => (
                          <button key={b.entry.id} type="button" className="pl-rel-chip" onClick={() => go(b.entry.id)}>{KIND_META[b.entry.kind]?.icon} {b.entry.name}</button>
                        ))}
                      </span>
                    </div>
                  )}
                </section>
              )}

              {(e.tags || []).length > 0 && (
                <div className="pl-viewer-tags">{e.tags.map(tag => <span key={tag} className="pl-tag">#{tag}</span>)}</div>
              )}
              {e.whenLabel && <div className="pl-viewer-when">⌛ {e.whenLabel}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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
