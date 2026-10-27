// Casca da campanha (DESIGN 1): capa fixa + quatro áreas.
//   Mestre:  Mundo · Preparar · Jogar · Grupo  (teclas 1–4, Ctrl+K, N, T)
//   Jogador: Mesa · Mundo · Crônica · Grupo
// Cada área é um arquivo de outro pacote, carregado sob demanda. Enquanto um
// arquivo não existe (ou quebra), a casca mostra a tela antiga equivalente
// (src/shell/Fallbacks.jsx), para nada se perder no caminho.
//
// Props passadas a toda área: { campaign, lang, isDM, characters, sub, params,
// goTo, onSubChange, onChange (recarrega a campanha), onOpenTab/onNavigate
// (ids de aba antigos → área nova) }. O mesmo vem por contexto em useArea().
//
// Mestre (V4): o polling da campanha é o PULSO (play/table-store.js, ~0,8 KB,
// 304 parado); o GET completo só vem quando `pulse.rev` muda (e 1 vez por minuto,
// de segurança). A loja da mesa vai por contexto (useTable) para a barra da mesa
// (celular), a janela da Tela (PC), a folha Tela ao vivo, a faixa do turno do PC,
// Jogar › Combate e o selo de Testes. Jogador: o GET completo a cada 2,5 s, como antes.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { usePolling } from '../api/polling.js';
import { TableContext, useTableStore } from '../play/table-store.js';
import { clearDiceTable, setDiceTable } from '../dice/dice-table.js';
import useMedia from '../play/useMedia.js';
import TableBar from '../stage/TableBar.jsx';
import ScreenWindow from '../stage/ScreenWindow.jsx';
import { barVisible, readBarPrefs, windowCorner, windowMode, writeBarPrefs } from '../stage/table-bar-model.js';
import { listWorld, createSampleWorld, getSessionPlan } from '../world/world-api.js';
import CampaignHeader from '../shell/CampaignHeader.jsx';
import AreaNav from '../shell/AreaNav.jsx';
import Onboarding from '../shell/Onboarding.jsx';
import MesaSheet from '../shell/MesaSheet.jsx';
import { AreaContext, legacyNavigate } from '../shell/useArea.js';
import {
  AreaBoundary, ChronicleView, GroupFallback, Loading, PlayFallback, PlayerGroupFallback,
  PlayerTableFallback, PrepareFallback, WorldFallback,
} from '../shell/Fallbacks.jsx';
import {
  areasFor, campaignRoute, initialArea, isHexColor, loadRememberedArea, normalizeArea, onboardingStatus,
  onboardingVisible, parseCampaignRoute, planHasContent, saveRememberedArea, screenLink, t,
} from '../shell/shell-logic.js';
import '../shell/mesa.css';
import '../shell/shell.css';

const SettingsMenu = lazy(() => import('../shell/SettingsMenu.jsx'));
const LiveScreenSheet = lazy(() => import('../stage/LiveScreenSheet.jsx'));
const MoreSheet = lazy(() => import('../shell/MoreSheet.jsx'));
const QuickSearch = lazy(() => import('../shell/QuickSearch.jsx'));

// Áreas novas: detectadas em tempo de build. Arquivo ausente → fallback.
const MODULES = import.meta.glob([
  '../world/WorldArea.jsx', '../prep/PrepareArea.jsx', '../play/PlayArea.jsx', '../group/GroupArea.jsx',
  '../player/PlayerTable.jsx', '../player/PlayerWorld.jsx', '../player/RevealToast.jsx',
]);
const lazyIf = (p) => (MODULES[p] ? lazy(MODULES[p]) : null);
const WorldArea = lazyIf('../world/WorldArea.jsx');
const PrepareArea = lazyIf('../prep/PrepareArea.jsx');
const PlayArea = lazyIf('../play/PlayArea.jsx');
const GroupArea = lazyIf('../group/GroupArea.jsx');
const PlayerTable = lazyIf('../player/PlayerTable.jsx');
const PlayerWorld = lazyIf('../player/PlayerWorld.jsx');
const RevealToast = lazyIf('../player/RevealToast.jsx');

const isTyping = (el) => {
  const tag = (el?.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || !!el?.isContentEditable;
};
const modalOpen = () => !!document.querySelector('.modal-backdrop, [role="dialog"][aria-modal="true"]');
const FULL_SAFETY_MS = 60_000;   // GET completo de segurança do mestre, mesmo com o rev parado
const CORNER_KEY = 'forja:win-corner';
const readCorner = () => { try { return localStorage.getItem(CORNER_KEY) === 'left' ? 'left' : 'right'; } catch { return 'right'; } };

export default function CampaignDetail({ lang = 'pt', campaignId, onBack, characters = [] }) {
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');
  const [nav, setNav] = useState(null);           // {area, sub, params}
  const [worldEpoch, setWorldEpoch] = useState(0); // muda ao esvaziar o Mundo → remonta a área
  const [world, setWorld] = useState(null);       // {entries, count, max} (mestre)
  const [planHas, setPlanHas] = useState(false);
  const [search, setSearch] = useState(false);
  const [settings, setSettings] = useState(null); // null = fechado; senão a seção ('identity', 'danger', 'dice'…)
  const [more, setMore] = useState(false);         // folha "Mesa do mestre" (casa "Mais" do celular)
  const [ending, setEnding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [groupPending, setGroupPending] = useState(null);
  const [toast, setToast] = useState('');
  const [sampleBusy, setSampleBusy] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);   // folha "Tela ao vivo"
  const [barPrefs, setBarPrefsState] = useState(() => readBarPrefs(campaignId));
  const [corner, setCorner] = useState(readCorner);
  const [winLiveAt, setWinLiveAt] = useState(0);      // 📺 Tela da capa: a janela abre já "ao vivo"
  const [page, setPage] = useState(null);             // a página aberta pede a janela à esquerda ('adventure')
  const mobile = useMedia('(max-width: 767px)');
  const twoCols = useMedia('(min-width: 1024px)');     // Agora e Combate em colunas: a janela encaixa
  const toastTimer = useRef(null);
  const lastFullAt = useRef(0);
  const isDMRef = useRef(false);

  const say = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  // Polling global: só a campanha (aprovações e o resto ficam nas áreas).
  const load = useCallback(async () => {
    try {
      const r = await api.getCampaign(campaignId);
      lastFullAt.current = Date.now();
      isDMRef.current = r.campaign?.role === 'dm';
      setCampaign(r.campaign);
      setError('');
    } catch (e) {
      // Falha no polling com a campanha já na tela: mantém o que está aberto.
      setError(errorMessage(e, lang));
    }
  }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Trocou de campanha: zera a tela (o usePolling já busca na hora).
  useEffect(() => {
    setCampaign(null); setNav(null); setWorld(null); setError(''); setLiveOpen(false);
    setBarPrefsState(readBarPrefs(campaignId));
  }, [campaignId]);

  const isDM = campaign?.role === 'dm';
  // Mestre: o pulso; o GET completo quando o `rev` muda (ou a cada minuto, de segurança).
  const onPulse = useCallback((p, { revChanged }) => {
    if (revChanged || Date.now() - lastFullAt.current > FULL_SAFETY_MS) load();
  }, [load]);
  const table = useTableStore(campaign, { enabled: isDM, lang, onPulse });
  const pulsing = table.enabled;
  // O 🎲 do mestre na mesa (V10, dice/dice-table.js): o rolador global passa a saber a
  // campanha e a regra "Do mestre" do palco (🔒 Só eu · 📺 Na tela).
  const dmDice = campaign?.stage?.prefs?.dm;
  useEffect(() => {
    if (!isDM || !campaign?.id || campaign.status === 'closed') return undefined;
    setDiceTable({ campaignId: campaign.id, dmDefault: dmDice === 'shown' ? 'shown' : 'secret' });
    return () => clearDiceTable(campaign.id);
  }, [isDM, campaign?.id, campaign?.status, dmDice]);
  // A Tela fala a língua da campanha (V9): o idioma do app do mestre vai à campanha
  // (dm_settings.lang) uma vez por troca; a TV lê no /api/screen, não do aparelho dela.
  // Servidor sem o campo (deploy fora de ordem): nada é enviado.
  const langSent = useRef('');
  useEffect(() => {
    if (!isDM || !campaign?.id || campaign.status === 'closed' || !('lang' in campaign)) return;
    const key = `${campaign.id}:${lang}`;
    if (campaign.lang === lang || langSent.current === key) return;
    langSent.current = key;
    api.patchCampaign(campaign.id, { lang }).catch(() => { /* fica para a próxima troca de idioma */ });
  }, [isDM, campaign?.id, campaign?.lang, campaign?.status, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  // Jogador (e o mestre sem o pulso no servidor): o GET completo a cada 2,5 s, como antes.
  usePolling(async () => {
    if (isDMRef.current && pulsing) return;
    await load();
  }, 2500, [campaignId, pulsing]);

  const loadWorld = useCallback(async () => {
    if (!campaign) return;
    try { const r = await listWorld(campaign.id); setWorld({ entries: r.entries || [], count: r.count ?? (r.entries || []).length, max: r.max || 500 }); }
    catch { setWorld(w => w || { entries: [], count: 0, max: 500 }); }
  }, [campaign?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dados de apoio do mestre: lista leve do Mundo (onboarding + busca) e plano.
  useEffect(() => {
    if (!campaign?.id || !isDM) return;
    loadWorld();
    if (!campaign.onboarding?.dismissed) {
      getSessionPlan(campaign.id).then(p => setPlanHas(planHasContent(p))).catch(() => {});
    }
  }, [campaign?.id, isDM]); // eslint-disable-line react-hooks/exhaustive-deps

  const obStatus = useMemo(() => (isDM && campaign
    ? onboardingStatus(campaign, { worldCount: world?.count || 0, planHasContent: planHas })
    : null), [isDM, campaign, world?.count, planHas]);

  // Área inicial (uma vez por campanha, quando os dados chegam).
  useEffect(() => {
    if (!campaign || nav) return;
    if (isDM && world == null) return; // espera o Mundo para decidir pelo onboarding
    let alive = true;
    (async () => {
      let combatActive = false;
      if (isDM && !campaign.state?.live) {
        try { combatActive = !!(await api.getCombat(campaign.id))?.combat?.active; } catch { /* ok */ }
      }
      if (!alive) return;
      // F5 dentro da campanha: a URL (#c/<slug>/<área>/<sub>) diz onde estava.
      const route = parseCampaignRoute(window.location.hash);
      const fromUrl = route && (route.slug === campaign.slug || route.slug === String(campaign.id)) ? route : null;
      const first = initialArea({
        isDM, live: !!campaign.state?.live, combatActive,
        onboardingPending: onboardingVisible(obStatus),
        remembered: loadRememberedArea(campaign.id),
        fromUrl,
      });
      setNav({ ...first, params: {} });
    })();
    return () => { alive = false; };
  }, [campaign, isDM, world, nav, obStatus]);

  // Mantém a URL em dia com a tela (replaceState: não enche o histórico).
  useEffect(() => {
    if (!campaign || !nav) return;
    // slug com acento (não serve na URL) → o id: #c/1/play/combat
    const h = campaignRoute(campaign.slug || campaign.id, nav.area, nav.sub, campaign.id);
    if (!h || window.location.hash === h) return;
    try { window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${h}`); } catch { /* ok */ }
  }, [campaign?.slug, campaign?.id, nav?.area, nav?.sub]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = useCallback((area, sub, params) => {
    if (!campaign) return;
    const n = normalizeArea(isDM, area, sub);
    if (!n) return;
    setNav({ ...n, params: params || {} });
    saveRememberedArea(campaign.id, n);
    if (n.area === 'world' && isDM) loadWorld();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* ok */ }
  }, [campaign?.id, isDM, loadWorld]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubChange = useCallback((s) => {
    setNav(prev => {
      if (!prev) return prev;
      const n = normalizeArea(isDM, prev.area, s) || prev;
      if (campaign) saveRememberedArea(campaign.id, n);
      return { ...n, params: {} };
    });
  }, [isDM, campaign?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const clearParams = useCallback(() => setNav(prev => (prev ? { ...prev, params: {} } : prev)), []);
  const legacyNav = useMemo(() => legacyNavigate(goTo), [goTo]);

  // Onboarding: grava a flag (só o mestre vê).
  const markOnboarding = useCallback(async (flag, value = true) => {
    if (!campaign || !isDM || campaign.onboarding?.[flag] === value) return;
    try { await api.patchCampaign(campaign.id, { onboarding: { [flag]: value } }); load(); } catch { /* não bloqueia */ }
  }, [campaign, isDM, load]);

  const tvUrl = campaign ? screenLink(window.location.origin, campaign.screenToken) : '';
  const copyTv = useCallback(async () => {
    try { await navigator.clipboard?.writeText(tvUrl); say(t(lang, 'Link da Tela copiado', 'Screen link copied')); } catch { /* ok */ }
    markOnboarding('tv');
  }, [tvUrl, lang, say, markOnboarding]);

  const onOnboardingAction = async (step) => {
    if (step === 'cover') { setSettings('identity'); return; }
    if (step === 'firstEntry') { goTo('world', 'atlas', { create: true }); return; }
    if (step === 'prepare') { goTo('prepare', 'next'); return; }
    if (step === 'tv') { window.open(tvUrl, '_blank', 'noopener'); markOnboarding('tv'); return; }
    if (step === 'invite') {
      try { await navigator.clipboard?.writeText(campaign.inviteCode); } catch { /* ok */ }
      say(t(lang, `Código ${campaign.inviteCode} copiado — mande para a mesa`, `Code ${campaign.inviteCode} copied — send it to the table`));
      markOnboarding('invite');
    }
  };

  const loadSample = async () => {
    setSampleBusy(true);
    try {
      await createSampleWorld(campaign.id, lang);
      await loadWorld();
      setNav(n => ({ ...(n || { area: 'world', sub: 'atlas' }), params: { sampleAt: Date.now() } }));
      say(t(lang, 'Vale de Brumafria está pronto para explorar', 'Mistfrost Vale is ready to explore'));
    } catch (e) { say(errorMessage(e, lang)); } finally { setSampleBusy(false); }
  };

  // Sessão: começar / encerrar.
  const startSession = async () => {
    setBusy(true);
    try { await api.startDiarySession(campaign.id, {}); await load(); goTo('play', 'scene'); }
    catch (e) { say(errorMessage(e, lang)); } finally { setBusy(false); }
  };
  const endSession = async (withRecap) => {
    setBusy(true);
    try {
      await api.patchCampaignState(campaign.id, { live: false });
      await load();
      setEnding(false);
      if (withRecap) goTo('group', 'chronicle', { recap: true });
      else say(t(lang, 'Sessão encerrada. Bom jogo!', 'Session ended. Good game!'));
    } catch (e) { say(errorMessage(e, lang)); } finally { setBusy(false); }
  };
  // Da folha "Mais" para outra janela: fecha a folha primeiro (o foco volta à
  // casa "Mais") e abre a próxima no tick seguinte, que devolve o foco para lá.
  const fromMore = (fn) => () => { setMore(false); setTimeout(fn, 0); };

  // Atalhos: 1–4 áreas · Ctrl+K busca · N próximo turno (toda a área Jogar) · T copia o link da Tela.
  const areas = areasFor(isDM);
  const tableRef = useRef(table);
  tableRef.current = table;
  useEffect(() => {
    if (!campaign) return;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        // Com folha ou diálogo aberto a busca ficaria escondida atrás dele (e o Esc fecharia os dois).
        e.preventDefault(); if (!modalOpen()) setSearch(true); return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || modalOpen()) return;
      if (/^[1-4]$/.test(e.key)) {
        const a = areas[parseInt(e.key, 10) - 1];
        if (a) { e.preventDefault(); goTo(a.id, nav?.area === a.id ? nav.sub : null); }
      } else if (isDM && (e.key === 'n' || e.key === 'N') && nav?.area === 'play') {
        // N em toda a área Jogar: o mesmo Próximo turno da barra (com a vez esperada).
        e.preventDefault();
        if (tableRef.current.enabled) tableRef.current.nextTurn();
        else api.combatNextTurn(campaign.id).then(load).catch(() => {});
      } else if (isDM && (e.key === 't' || e.key === 'T')) {
        e.preventDefault(); copyTv();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [campaign, areas, isDM, nav, goTo, load, copyTv]);

  const setBarPrefs = useCallback((next) => {
    setBarPrefsState(next);
    writeBarPrefs(campaignId, next);
  }, [campaignId]);
  const tableValue = useMemo(() => ({
    ...table, prefs: barPrefs, setPrefs: setBarPrefs, openLive: () => setLiveOpen(true), setPage,
    win: null, bar: false,   // completados abaixo, quando a área já é conhecida
  }), [table, barPrefs, setBarPrefs]);

  if (error && !campaign) {
    return (
      <div className="shell-error">
        <p style={{ color: 'var(--blood-bright)' }}>{error}</p>
        <button className="btn btn-ghost" onClick={onBack}>← {t(lang, 'Voltar', 'Back')}</button>
      </div>
    );
  }
  if (!campaign || !nav) return <div className="shell-error"><Loading lang={lang} /></div>;

  const accent = isHexColor(campaign.accent) ? campaign.accent : null;
  const badges = isDM
    ? { group: groupPending ?? campaign.pendingApprovals ?? 0 }
    : { world: campaign.worldNewCount || 0 };
  // Barra da mesa (celular) e janela da Tela (PC): table-bar-model decide quando.
  const st = campaign.state || {};
  const fighting = !!(table.combat ? table.combat.active : campaign.combatNow?.active);
  const vis = {
    prefs: barPrefs, session: table.pulse?.session ?? st.session, live: table.pulse ? table.pulse.live : !!st.live,
    combatActive: fighting, tvLive: table.tvLive, area: nav.area, sub: nav.sub, dockable: twoCols,
  };
  const showBar = isDM && mobile && barVisible(vis);
  const win = isDM && !mobile ? windowMode({ ...vis, forced: !!winLiveAt }) : 'hidden';
  const tableCtx = isDM ? { ...tableValue, win, bar: showBar } : null;
  // Selos de Jogar: "● ao vivo" e "⚔" com combate ativo (texto para o leitor de tela).
  const marks = isDM ? {
    play: [vis.live && { k: 'live', icon: '●', label: t(lang, 'ao vivo', 'live') },
      fighting && { k: 'combat', icon: '⚔', label: t(lang, 'combate', 'combat') }].filter(Boolean),
  } : {};
  const openActor = (id) => { setLiveOpen(false); goTo('play', 'combat', { actor: id, at: Date.now() }); };
  const endCombatFromBar = () => goTo('play', 'combat', { endCombat: Date.now() });
  const openScreen = () => {
    // 📺 Tela da capa (PC): a janela aparece já "ao vivo", mesmo escondida pelo ✕.
    // Onde ela não flutua (encaixada em Agora/Combate, escondida em Jogar › Tela): a folha Tela ao vivo.
    if (windowMode({ ...vis, forced: true }) !== 'float') { setLiveOpen(true); return; }
    if (barPrefs.winSession != null) setBarPrefs({ ...barPrefs, winSession: null });
    setWinLiveAt(Date.now());
  };
  const areaProps = {
    worldEpoch,
    campaign, lang, isDM, characters, sub: nav.sub, params: nav.params, goTo, onSubChange,
    onChange: load, onOpenTab: legacyNav, onNavigate: legacyNav,
    // jogador saiu da mesa (Grupo › ⋯ › Sair da campanha): volta para Campanhas
    onLeaveCampaign: isDM ? undefined : onBack,
  };
  const ctx = {
    area: nav.area, sub: nav.sub, params: nav.params, goTo, clearParams, isDM, lang, campaign, reload: load,
    openSearch: () => setSearch(true), openSettings: (section) => { setSettings(typeof section === 'string' ? section : 'identity'); if (isDM) loadWorld(); },
  };

  const content = isDM ? renderDM(nav.area, areaProps, { setGroupPending }) : renderPlayer(nav.area, areaProps);

  return (
    <AreaContext.Provider value={ctx}>
     <TableContext.Provider value={tableCtx}>
      <div className={`campaign-detail shell ${isDM ? 'is-dm' : 'is-player'}`} style={accent ? { '--camp-accent': accent } : undefined}>
        <CampaignHeader
          campaign={campaign} lang={lang} isDM={isDM} busy={busy} onBack={onBack}
          onStartSession={startSession} onEndSession={() => setEnding(true)}
          onSearch={() => setSearch(true)} onSettings={() => { setSettings('identity'); if (isDM) loadWorld(); }}
          onOpenScreen={openScreen}
        />
        <AreaNav areas={areas} active={nav.area} onSelect={(a) => goTo(a)} lang={lang} badges={badges} marks={marks} showKeys={isDM}
          onSearch={isDM ? undefined : () => setSearch(true)}
          onMore={isDM ? () => { setMore(true); loadWorld(); } : undefined} moreOpen={more} />

        <div className="shell-panel" id="shell-panel" role="tabpanel" aria-labelledby={`area-tab-${nav.area}`}>
          {isDM && nav.area === 'world' && campaign.status !== 'closed' && onboardingVisible(obStatus) && (
            <Onboarding
              lang={lang} status={obStatus}
              onAction={onOnboardingAction}
              onDismiss={() => markOnboarding('dismissed')}
              worldEmpty={(world?.count || 0) === 0}
              onSample={loadSample} sampleBusy={sampleBusy}
            />
          )}
          {content}
        </div>

        {showBar && (
          <TableBar campaign={campaign} lang={lang} onOpenLive={() => setLiveOpen(true)} onEndCombat={endCombatFromBar} />
        )}
        {win === 'float' && (
          <ScreenWindow key={campaign.id} campaign={campaign} lang={lang} liveAt={winLiveAt}
            corner={windowCorner({ corner, area: nav.area, sub: nav.sub, page })}
            onCorner={(c) => { setCorner(c); try { localStorage.setItem(CORNER_KEY, c); } catch { /* ok */ } }}
            onHide={() => { setWinLiveAt(0); setBarPrefs({ ...barPrefs, winSession: String(vis.session ?? '') }); }} />
        )}
        {liveOpen && isDM && (
          <Suspense fallback={null}>
            <LiveScreenSheet campaign={campaign} lang={lang} desk={!mobile} onClose={() => setLiveOpen(false)}
              onFullControl={() => { setLiveOpen(false); goTo('play', 'screen'); }}
              onActor={openActor} onTvLink={() => markOnboarding('tv')} />
          </Suspense>
        )}

        {!isDM && RevealToast && (
          <AreaBoundary lang={lang} resetKey="toast">
            <Suspense fallback={null}><RevealToast {...areaProps} /></Suspense>
          </AreaBoundary>
        )}

        {search && (
          <Suspense fallback={null}>
            <QuickSearch campaign={campaign} lang={lang} isDM={isDM} initialWorld={world?.entries}
              onClose={() => setSearch(false)}
              onPick={(r) => { setSearch(false); goTo(r.go[0], r.go[1], r.go[2]); }} />
          </Suspense>
        )}
        {more && isDM && (
          <Suspense fallback={null}>
            <MoreSheet campaign={campaign} lang={lang} busy={busy}
              worldCount={world?.count ?? null} worldMax={world?.max || 500}
              onClose={() => setMore(false)}
              onStartSession={fromMore(startSession)}
              onEndSession={fromMore(() => setEnding(true))}
              onSearch={fromMore(() => setSearch(true))}
              onSettings={(section) => fromMore(() => setSettings(section))()}
              onBack={fromMore(onBack)}
              onTvOpened={() => markOnboarding('tv')} onScreenChange={load}
              onChooseScreen={fromMore(() => goTo('play', 'screen'))}
              onOpenLive={fromMore(() => setLiveOpen(true))}
              barPrefs={barPrefs} onBarPrefs={setBarPrefs} />
          </Suspense>
        )}
        {settings && isDM && (
          <Suspense fallback={null}>
            <SettingsMenu key={settings} campaign={campaign} lang={lang} initialSection={settings} onClose={() => setSettings(null)} onChange={load}
              worldCount={world?.count ?? null} worldMax={world?.max || 500} onMarkOnboarding={markOnboarding}
              onWorldCleared={async () => { await loadWorld(); setWorldEpoch(e => e + 1); }} />
          </Suspense>
        )}
        {ending && <EndSessionDialog lang={lang} busy={busy} onCancel={() => setEnding(false)} onEnd={endSession} />}
        {toast && <div className="toast shell-toast" role="status">{toast}</div>}
      </div>
     </TableContext.Provider>
    </AreaContext.Provider>
  );
}

function Area({ Comp, props, fallback, lang, resetKey }) {
  if (!Comp) return fallback;
  return (
    <AreaBoundary lang={lang} resetKey={resetKey} fallback={fallback}>
      <Suspense fallback={<Loading lang={lang} />}><Comp key={resetKey} {...props} /></Suspense>
    </AreaBoundary>
  );
}

function renderDM(area, p, { setGroupPending }) {
  const k = `${area}:${p.campaign.id}:${area === 'world' ? p.worldEpoch || 0 : 0}`;
  if (area === 'world') return <Area Comp={WorldArea} props={p} lang={p.lang} resetKey={k} fallback={<WorldFallback {...p} />} />;
  if (area === 'prepare') return <Area Comp={PrepareArea} props={p} lang={p.lang} resetKey={k} fallback={<PrepareFallback {...p} />} />;
  if (area === 'play') return <Area Comp={PlayArea} props={p} lang={p.lang} resetKey={k} fallback={<PlayFallback {...p} />} />;
  if (area === 'group') {
    return <Area Comp={GroupArea} props={{ ...p, hasJoinRoute: true, onPendingCount: setGroupPending }} lang={p.lang} resetKey={k} fallback={<GroupFallback {...p} />} />;
  }
  return null;
}

function renderPlayer(area, p) {
  const k = `${area}:${p.campaign.id}`;
  if (area === 'table') return <Area Comp={PlayerTable} props={p} lang={p.lang} resetKey={k} fallback={<PlayerTableFallback {...p} />} />;
  if (area === 'world') return <Area Comp={PlayerWorld} props={p} lang={p.lang} resetKey={k} fallback={<WorldFallback {...p} />} />;
  if (area === 'chronicle') return <ChronicleView {...p} />;
  if (area === 'group') {
    return <Area Comp={GroupArea} props={{ ...p, sub: 'players', hasJoinRoute: true }} lang={p.lang} resetKey={k} fallback={<PlayerGroupFallback {...p} />} />;
  }
  return null;
}

// "Encerrar a sessão?": folha da altura do conteúdo no celular (botões
// empilhados, a ação principal por último) e caixa central no desktop.
// Esc, ✕ e toque fora = Continuar jogando, como antes.
function EndSessionDialog({ lang, busy, onCancel, onEnd }) {
  return (
    <MesaSheet
      lang={lang} size="auto" width="sm" className="shell-end"
      icon="■" title={t(lang, 'Encerrar a sessão?', 'End the session?')}
      onClose={onCancel}
      footer={(
        <div className="mesa-actions is-stack">
          <button type="button" className="mesa-btn" onClick={onCancel} disabled={busy}>{t(lang, 'Continuar jogando', 'Keep playing')}</button>
          <button type="button" className="mesa-btn" onClick={() => onEnd(false)} disabled={busy}>{t(lang, 'Encerrar', 'End')}</button>
          <button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={() => onEnd(true)} disabled={busy}>{t(lang, 'Encerrar e escrever o recap', 'End and write the recap')}</button>
        </div>
      )}
    >
      <p className="mesa-sheet-text">{t(lang,
        'O selo "Ao vivo" sai. Se quiser, já abrimos a Crônica para você escrever o "Anteriormente em…" — é opcional.',
        'The "Live" badge goes away. If you like, we open the Chronicle so you can write the "Previously on…" — optional.')}</p>
    </MesaSheet>
  );
}
