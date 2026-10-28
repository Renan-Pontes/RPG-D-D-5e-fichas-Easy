// Área "Mundo" do mestre: Cartões · Mapas · Tempo (ids atlas · map · timeline), com o
// editor de cartão em painel lateral (tela cheia no celular), 🎲 Improvisar e revelação
// rápida na folha "Quem vê" única (RevealSheet, a mesma de Jogar: segredos, 📺 e Pronto).
// Campanha encerrada: tudo só leitura, inclusive o editor do cartão (abre para ler).
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
  createEntry, createSampleWorld, getEntry, getSessionPlan, getWorldEchoes, isConflict, listWorld, updateEntry, worldErrorText,
} from './world-api.js';
import { applyPatches, mergeReorderResponse, pendingAdd, pendingDone, t, toLight } from './world-model.js';
import { flash } from '../play/flash.js';
import Atlas from './Atlas.jsx';
import EntryEditor from './EntryEditor.jsx';
import ImproviseModal from './ImproviseModal.jsx';
import { RevealSheet } from './RevealControl.jsx';
import Timeline from './Timeline.jsx';
import WorldMap from './WorldMap.jsx';
import { immersionOn } from './living/living-logic.js';
const LivingWorld = lazy(() => import('./living/LivingWorld.jsx'));
import './world-styles.css';

const SUBS = [
  { id: 'atlas', icon: '📚', pt: 'Cartões', en: 'Cards' },
  { id: 'map', icon: '🗺', pt: 'Mapas', en: 'Maps' },
  { id: 'timeline', icon: '⌛', pt: 'Tempo', en: 'Timeline' },
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
  const [plan, setPlan] = useState(null);   // o Plano da Sessão N: as cenas no "Aparece em"
  const planLoaded = useRef(false);
  const [echoes, setEchoes] = useState(null);
  // "Mundo vivo" (⚙ Ajustes): a campanha manda `immersion`; a lista também.
  const [listImmersion, setListImmersion] = useState(true);
  const immersion = campaign && 'immersion' in campaign ? immersionOn(campaign) : listImmersion;

  const cid = campaign?.id;
  // Campanha encerrada: só leitura — some tudo que escreveria (o backend daria 423).
  const closed = campaign?.status === 'closed';
  // Versão mais nova de cada cartão que esta tela já viu (resposta de um PATCH, do
  // editor ou da lista): o ↑ ↓ do Ordenar manda a versão certa mesmo com toques
  // seguidos, antes de a lista redesenhar.
  const versions = useRef(new Map());
  const reorderChain = useRef(Promise.resolve());
  // Fila do Ordenar: id → {sort otimista, PATCH sem resposta} (mergeReorderResponse) e
  // a "geração" da fila — um erro recarrega a lista e descarta o que já estava na fila.
  const pendingSort = useRef(new Map());
  const reorderGen = useRef(0);
  // → true quando a lista veio (o aviso de antes some); false quando falhou (fica o aviso).
  const load = useCallback(async () => {
    if (!cid) return false;
    try {
      const r = await listWorld(cid);
      const list = r.entries || [];
      // a versão só sobe (a lista pode ter saído antes da resposta de um PATCH)
      for (const e of list) if (e.version != null && !(versions.current.get(e.id) > e.version)) versions.current.set(e.id, e.version);
      // recarregou no meio da fila do Ordenar (voltou para a aba): a ordem da tela fica
      const waiting = [...pendingSort.current].map(([id, w]) => ({ id, sort: w.sort }));
      setEntries(applyPatches(list, waiting));
      setMeta({ count: r.count ?? (r.entries || []).length, max: r.max || 500 });
      setListImmersion(r.immersion !== false);
      setError('');
      return true;
    } catch (e) { setError(worldErrorText(e, lang)); setEntries(prev => prev || []); return false; }
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

  // O plano (para as cenas no "aparece em"): só quando um cartão abre, 1 vez.
  useEffect(() => {
    if (!openId || planLoaded.current || !cid) return;
    planLoaded.current = true;
    getSessionPlan(cid).then(p => setPlan(p || null)).catch(() => {});
  }, [openId, cid]);

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
  // A resposta do servidor entra na lista; o `sort` de um cartão com PATCH do
  // Ordenar ainda na fila fica o da tela (senão a linha pula debaixo do dedo).
  const upsert = useCallback((full) => {
    if (!full?.id) return;
    if (full.version != null) versions.current.set(full.id, full.version);
    const light = toLight(full);
    const pending = new Map(pendingSort.current);
    setEntries(list => mergeReorderResponse(list, light, pending));
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

  // Reordenar (arrastar ou ↑ ↓): a lista muda na hora e os PATCH vão em fila, um
  // reordenar depois do outro, cada um com a versão mais nova (checagem de versão).
  // Enquanto a fila de um cartão não esvazia, a tela fica com o sort dela
  // (mergeReorderResponse): toques seguidos com o servidor lento não se desfazem.
  // Um erro (409 de outra aba, rede): desfaz a metade já gravada da troca (o servidor
  // não fica com sort repetido), descarta o resto da fila, recarrega e avisa num aviso
  // curto acima da barra da mesa — a faixa de erro do topo fica fora da vista de quem
  // rola a lista.
  const reorder = (patches) => {
    const before = entries || [];
    const gen = reorderGen.current;
    pendingAdd(pendingSort.current, patches);
    setEntries(list => applyPatches(list, patches));
    const run = async () => {
      if (gen !== reorderGen.current) return false; // a fila caiu num erro antes deste toque
      const done = [];
      try {
        for (const p of patches) {
          const cur = before.find(e => e.id === p.id);
          const version = versions.current.get(p.id) ?? cur?.version;
          const next = await updateEntry(p.id, { sort: p.sort, version });
          pendingDone(pendingSort.current, p.id);
          done.push({ id: p.id, sort: cur?.sort });
          upsert(next);
        }
        return true;
      } catch (e) {
        reorderGen.current += 1;
        pendingSort.current = new Map();
        for (const d of done.reverse()) {
          if (typeof d.sort !== 'number') continue;
          try {
            const back = await updateEntry(d.id, { sort: d.sort, version: versions.current.get(d.id) });
            if (back?.version != null) versions.current.set(d.id, back.version);
          } catch { /* o load() abaixo mostra o que ficou */ }
        }
        await load();
        flash(isConflict(e)
          ? t(lang, 'Um cartão mudou em outra aba; a ordem não foi gravada e recarreguei a lista.', 'A card changed in another tab; the order was not saved and the list was reloaded.')
          : `${t(lang, 'A ordem não foi gravada', 'The order was not saved')}: ${worldErrorText(e, lang)}`, { error: true, ms: 6000 });
        return false;
      }
    };
    reorderChain.current = reorderChain.current.then(run);
    return reorderChain.current;
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
        <Atlas entries={list} lang={lang} selectedId={openId} onOpen={openEntry}
          onCreate={closed ? null : create} onImprovise={closed ? null : () => setImprovise(true)} onReorder={closed ? null : reorder}
          onReveal={closed ? null : quickReveal} showCampaign={closed ? null : campaign} onRevealed={upsert}
          onSample={list.length === 0 && !closed ? sample : null} sampleBusy={sampleBusy} count={meta.count} max={meta.max} createNonce={createNonce}
          top={immersion && list.length > 0 ? (
            <Suspense fallback={null}>
              <LivingWorld entries={list} lang={lang} campaignId={cid} echoes={echoes} selectedId={openId}
                onOpen={openEntry} onCreate={closed ? null : create} />
            </Suspense>
          ) : null} />
      ) : sub === 'map' ? (
        <WorldMap campaign={campaign} readOnly={closed} entries={list} lang={lang} mapId={mapId} onMapChange={setMapId}
          showCampaign={closed ? null : campaign}
          onOpenEntry={openEntry} onEntrySaved={upsert} onEntryCreated={(e) => { upsert(e); }} />
      ) : (
        <Timeline campaign={campaign} entries={list} lang={lang} readOnly={closed} onOpenEntry={openEntry} onEntrySaved={upsert} onReload={load}
          onCreate={closed ? null : (f) => create({ ...f, name: t(lang, 'Novo evento', 'New event') })} />
      )}

      {openId && (
        <>
          <div className="wl-editor-scrim" onClick={() => setOpenId(null)} aria-hidden="true" />
          <EntryEditor key={openId} entryId={openId} campaign={campaign} entries={list} adventures={adventures} plan={plan} lang={lang}
            readOnly={closed} onClose={() => setOpenId(null)} onSaved={upsert}
            onDeleted={(id) => { removeLocal(id); setOpenId(null); setMeta(m => ({ ...m, count: Math.max(0, m.count - 1) })); setToast(t(lang, 'Cartão apagado.', 'Card deleted.')); }}
            onOpenEntry={openEntry} onOpenMap={openMap} onShow={!closed} />
        </>
      )}

      {improvise && !closed && (
        <ImproviseModal campaignId={cid} lang={lang} onClose={() => setImprovise(false)}
          onSaved={(e) => { upsert(e); setMeta(m => ({ ...m, count: m.count + 1 })); }} />
      )}

      {revealFor && (
        <RevealSheet entry={revealFor} campaign={closed ? null : campaign} lang={lang} onClose={() => setRevealFor(null)}
          onChange={(next) => { setRevealFor(next); upsert(next); }} />
      )}

      {toast && <Toast msg={toast} onDone={clearToast} />}
    </div>
  );
}
