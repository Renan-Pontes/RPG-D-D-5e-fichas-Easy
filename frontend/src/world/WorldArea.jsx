// Área "Mundo" do mestre: Atlas · Mapa · Linha do tempo, com o editor de
// cartão em painel lateral, 🎲 Improvisar e revelação rápida.
//
// Montada pela casca (WP3) com lazy(). Lê área/sub/params de useArea() e
// aceita props para sobrescrever:
//   <WorldArea campaign lang sub params goTo showSubChips={false} />
// params.entryId abre o cartão; params.mapId abre o mapa; params.create abre o "+ Novo".
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { Toast } from '../../components/Shared.jsx';
import useArea from '../shell/useArea.js';
import { SubChips } from '../shell/AreaNav.jsx';
import {
  createEntry, createSampleWorld, getEntry, getWorldEchoes, isConflict, listWorld, showEntryOnScreen, updateEntry, worldErrorText,
} from './world-api.js';
import { applyPatches, t, toLight } from './world-model.js';
import Atlas from './Atlas.jsx';
import EntryEditor from './EntryEditor.jsx';
import ImproviseModal from './ImproviseModal.jsx';
import RevealControl from './RevealControl.jsx';
import Timeline from './Timeline.jsx';
import WorldMap from './WorldMap.jsx';
import { EntryImage } from './EntryCard.jsx';
import { immersionOn } from './living/living-logic.js';
const LivingWorld = lazy(() => import('./living/LivingWorld.jsx'));
import './world-styles.css';

const SUBS = [
  { id: 'atlas', icon: '📚', pt: 'Atlas', en: 'Atlas' },
  { id: 'map', icon: '🗺', pt: 'Mapa', en: 'Map' },
  { id: 'timeline', icon: '⌛', pt: 'Linha do tempo', en: 'Timeline' },
];

export default function WorldArea(props) {
  const ctx = useArea() || {};
  const campaign = props.campaign || ctx.campaign;
  const lang = props.lang || ctx.lang || 'pt';
  const goTo = props.goTo || ctx.goTo;
  const params = props.params || ctx.params || {};
  const clearParams = props.clearParams || ctx.clearParams;
  const showSubChips = props.showSubChips !== false;
  const [localSub, setLocalSub] = useState('atlas');
  const subRaw = props.sub || (ctx.area === 'world' ? ctx.sub : null) || localSub;
  const sub = SUBS.some(s => s.id === subRaw) ? subRaw : 'atlas';
  const setSub = (s) => { setLocalSub(s); if (goTo) goTo('world', s); };

  const [entries, setEntries] = useState(null);
  const [meta, setMeta] = useState({ count: 0, max: 500 });
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [improvise, setImprovise] = useState(false);
  const [revealFor, setRevealFor] = useState(null);
  const [mapId, setMapId] = useState(null);
  const [toast, setToast] = useState('');
  const [createNonce, setCreateNonce] = useState(0);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [adventures, setAdventures] = useState([]);
  const advLoaded = useRef(false);
  const [echoes, setEchoes] = useState(null);
  // "Mundo vivo" (⚙ Ajustes): a campanha manda `immersion`; a lista também.
  const [listImmersion, setListImmersion] = useState(true);
  const immersion = campaign && 'immersion' in campaign ? immersionOn(campaign) : listImmersion;

  const cid = campaign?.id;
  const load = useCallback(async () => {
    if (!cid) return;
    try {
      const r = await listWorld(cid);
      setEntries(r.entries || []);
      setMeta({ count: r.count ?? (r.entries || []).length, max: r.max || 500 });
      setListImmersion(r.immersion !== false);
      setError('');
    } catch (e) { setError(worldErrorText(e, lang)); setEntries(prev => prev || []); }
  }, [cid, lang]);
  // Ecos da mesa: sem endpoint ou com erro → vazio, sem aviso.
  const loadEchoes = useCallback(async () => {
    if (!cid || !immersion) return;
    setEchoes(await getWorldEchoes(cid, lang));
  }, [cid, lang, immersion]);
  useEffect(() => { loadEchoes(); }, [loadEchoes]);
  useEffect(() => { load(); }, [load]);
  // Volta para a aba → atualiza (outra aba/aparelho pode ter mexido).
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === 'visible') { load(); loadEchoes(); } };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [load, loadEchoes]);

  // Atalhos vindos da busca (Ctrl+K) ou de outras áreas.
  useEffect(() => {
    if (params?.entryId) { setOpenId(Number(params.entryId)); clearParams?.(); }
    if (params?.mapId) { setMapId(Number(params.mapId)); clearParams?.(); }
    if (params?.create) { setCreateNonce(n => n + 1); clearParams?.(); }
  }, [params?.entryId, params?.mapId, params?.create]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aventuras (para "aparece em" no editor): só quando um cartão abre.
  useEffect(() => {
    if (!openId || advLoaded.current || !cid) return;
    advLoaded.current = true;
    api.listAdventures(cid).then(async r => {
      const list = (r.adventures || []).slice(0, 12);
      const full = await Promise.all(list.map(a => api.getAdventure(cid, a.id).then(x => x.adventure).catch(() => null)));
      setAdventures(full.filter(Boolean));
    }).catch(() => {});
  }, [openId, cid]);

  // ---------------------------------------------------------------- lista
  const upsert = useCallback((full) => {
    if (!full?.id) return;
    const light = toLight(full);
    setEntries(list => {
      const l = list || [];
      const i = l.findIndex(e => e.id === full.id);
      if (i < 0) return [...l, light];
      const next = l.slice();
      next[i] = { ...l[i], ...light };
      return next;
    });
  }, []);
  const removeLocal = (id) => setEntries(list => (list || []).filter(e => e.id !== id));

  const create = async (fields) => {
    try {
      const e = await createEntry(cid, fields);
      upsert(e);
      setMeta(m => ({ ...m, count: m.count + 1 }));
      setOpenId(e.id);
      if (sub !== 'atlas' && fields.kind !== 'lore') setSub('atlas');
      return e;
    } catch (err) { setError(worldErrorText(err, lang)); return null; }
  };

  const reorder = async (patches) => {
    setEntries(list => applyPatches(list, patches));
    try {
      for (const p of patches) {
        const cur = (entries || []).find(e => e.id === p.id);
        const next = await updateEntry(p.id, { sort: p.sort, version: cur?.version });
        upsert(next);
      }
    } catch (e) {
      setError(isConflict(e) ? t(lang, 'Um cartão mudou em outra aba; recarreguei a lista.', 'A card changed in another tab; the list was reloaded.') : worldErrorText(e, lang));
      load();
    }
  };

  const show = async (entry) => {
    try {
      await showEntryOnScreen(cid, entry.id);
      setToast(t(lang, `📺 No telão: ${entry.name}`, `📺 On screen: ${entry.name}`));
    } catch (e) { setToast(worldErrorText(e, lang)); }
  };

  const quickReveal = async (entry) => {
    try { setRevealFor(await getEntry(entry.id)); } catch (e) { setError(worldErrorText(e, lang)); }
  };

  const sample = async () => {
    setSampleBusy(true);
    try {
      const r = await createSampleWorld(cid, lang);
      setEntries(r.entries || []);
      setMeta(m => ({ ...m, count: (r.entries || []).length }));
      ctx.reload?.();
      setToast(t(lang, '✨ Vale de Brumafria pronto para explorar!', '✨ Mistfrost Vale is ready to explore!'));
    } catch (e) { setError(worldErrorText(e, lang)); } finally { setSampleBusy(false); }
  };

  const openEntry = (id) => setOpenId(id);
  const clearToast = useCallback(() => setToast(''), []);
  const openMap = (id) => { setMapId(id); setOpenId(null); setSub('map'); };

  const list = useMemo(() => entries || [], [entries]);

  if (!campaign) return null;

  return (
    <div className={`wl-area${openId ? ' has-editor' : ''}`}>
      {showSubChips && (
        <SubChips subs={SUBS.map(s => s.id)} active={sub} onSelect={setSub} lang={lang}
          icons={Object.fromEntries(SUBS.map(s => [s.id, s.icon]))} ariaLabel={t(lang, 'Mundo', 'World')} />
      )}

      {error && <p className="wl-error" role="alert">{error} <button type="button" className="wl-linkbtn" onClick={() => { setError(''); load(); }}>{t(lang, 'Tentar de novo', 'Try again')}</button></p>}

      {entries === null ? (
        <div className="wl-skeleton-grid" aria-busy="true">{[0, 1, 2, 3].map(i => <div key={i} className="wl-skeleton" />)}</div>
      ) : sub === 'atlas' ? (
        <Atlas entries={list} lang={lang} selectedId={openId} onOpen={openEntry} onReveal={quickReveal} onShow={show}
          onCreate={create} onImprovise={() => setImprovise(true)} onReorder={reorder}
          onSample={list.length === 0 ? sample : null} sampleBusy={sampleBusy} count={meta.count} max={meta.max} createNonce={createNonce}
          top={immersion && list.length > 0 ? (
            <Suspense fallback={null}>
              <LivingWorld entries={list} lang={lang} campaignId={cid} echoes={echoes} selectedId={openId}
                onOpen={openEntry} onCreate={create} />
            </Suspense>
          ) : null} />
      ) : sub === 'map' ? (
        <WorldMap campaign={campaign} entries={list} lang={lang} mapId={mapId} onMapChange={setMapId}
          onOpenEntry={openEntry} onEntrySaved={upsert} onEntryCreated={(e) => { upsert(e); }} />
      ) : (
        <Timeline campaign={campaign} entries={list} lang={lang} onOpenEntry={openEntry} onEntrySaved={upsert} onReload={load}
          onCreate={(f) => create({ ...f, name: t(lang, 'Novo evento', 'New event') })} />
      )}

      {openId && (
        <>
          <div className="wl-editor-scrim" onClick={() => setOpenId(null)} aria-hidden="true" />
          <EntryEditor key={openId} entryId={openId} campaign={campaign} entries={list} adventures={adventures} lang={lang}
            onClose={() => setOpenId(null)} onSaved={upsert}
            onDeleted={(id) => { removeLocal(id); setOpenId(null); setMeta(m => ({ ...m, count: Math.max(0, m.count - 1) })); setToast(t(lang, 'Cartão apagado.', 'Card deleted.')); }}
            onOpenEntry={openEntry} onOpenMap={openMap} onShow={show} />
        </>
      )}

      {improvise && (
        <ImproviseModal campaignId={cid} lang={lang} onClose={() => setImprovise(false)}
          onSaved={(e) => { upsert(e); setMeta(m => ({ ...m, count: m.count + 1 })); }} />
      )}

      {revealFor && (
        <div className="modal-backdrop" onClick={() => setRevealFor(null)}>
          <div className="modal wl-reveal-modal" role="dialog" aria-modal="true" aria-label={revealFor.name} onClick={e => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setRevealFor(null)} aria-label={t(lang, 'Fechar', 'Close')}>×</button>
            <div className="wl-reveal-modal-head">
              <span className="wl-reveal-modal-thumb"><EntryImage entry={revealFor} className="wl-thumb-img" /></span>
              <h2>{revealFor.name}</h2>
            </div>
            <RevealControl entry={revealFor} lang={lang} showSecrets onChange={(next) => { setRevealFor(next); upsert(next); }} />
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost btn-sm" disabled={revealFor.visibility === 'hidden'} onClick={() => show(revealFor)}>📺 {t(lang, 'Mostrar no telão', 'Show on screen')}</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setRevealFor(null)}>{t(lang, 'Pronto', 'Done')}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onDone={clearToast} />}
    </div>
  );
}
