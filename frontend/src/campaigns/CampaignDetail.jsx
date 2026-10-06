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
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { usePolling } from '../api/polling.js';
import { listWorld, createSampleWorld, getSessionPlan } from '../world/world-api.js';
import CampaignHeader from '../shell/CampaignHeader.jsx';
import AreaNav from '../shell/AreaNav.jsx';
import Onboarding from '../shell/Onboarding.jsx';
import { AreaContext, legacyNavigate } from '../shell/useArea.js';
import {
  AreaBoundary, ChronicleView, GroupFallback, Loading, PlayFallback, PlayerGroupFallback,
  PlayerTableFallback, PrepareFallback, WorldFallback,
} from '../shell/Fallbacks.jsx';
import {
  areasFor, campaignRoute, initialArea, isHexColor, loadRememberedArea, normalizeArea, onboardingStatus,
  onboardingVisible, parseCampaignRoute, planHasContent, saveRememberedArea, screenLink, t,
} from '../shell/shell-logic.js';
import '../shell/shell.css';

const SettingsMenu = lazy(() => import('../shell/SettingsMenu.jsx'));
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

export default function CampaignDetail({ lang = 'pt', campaignId, onBack, characters = [] }) {
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');
  const [nav, setNav] = useState(null);           // {area, sub, params}
  const [world, setWorld] = useState(null);       // {entries, count, max} (mestre)
  const [planHas, setPlanHas] = useState(false);
  const [search, setSearch] = useState(false);
  const [settings, setSettings] = useState(false);
  const [ending, setEnding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [groupPending, setGroupPending] = useState(null);
  const [toast, setToast] = useState('');
  const [sampleBusy, setSampleBusy] = useState(false);
  const toastTimer = useRef(null);

  const say = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  // Polling global: só a campanha (aprovações e o resto ficam nas áreas).
  const load = useCallback(async () => {
    try {
      const r = await api.getCampaign(campaignId);
      setCampaign(r.campaign);
      setError('');
    } catch (e) {
      // Falha no polling com a campanha já na tela: mantém o que está aberto.
      setError(errorMessage(e, lang));
    }
  }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Trocou de campanha: zera a tela (o usePolling já busca na hora).
  useEffect(() => { setCampaign(null); setNav(null); setWorld(null); setError(''); }, [campaignId]);
  usePolling(load, 2500, [campaignId]);

  const isDM = campaign?.role === 'dm';

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
    const h = campaignRoute(campaign.slug || campaign.id, nav.area, nav.sub);
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
    try { await navigator.clipboard?.writeText(tvUrl); say(t(lang, 'Link do telão copiado', 'TV link copied')); } catch { /* ok */ }
    markOnboarding('tv');
  }, [tvUrl, lang, say, markOnboarding]);

  const onOnboardingAction = async (step) => {
    if (step === 'cover') { setSettings(true); return; }
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
  const clearScreen = async () => {
    try { await api.setScreenCard(campaign.id, null); load(); } catch (e) { say(errorMessage(e, lang)); }
  };

  // Atalhos: 1–4 áreas · Ctrl+K busca · N próximo turno (Jogar › Combate) · T copia o telão.
  const areas = areasFor(isDM);
  useEffect(() => {
    if (!campaign) return;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault(); setSearch(true); return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || modalOpen()) return;
      if (/^[1-4]$/.test(e.key)) {
        const a = areas[parseInt(e.key, 10) - 1];
        if (a) { e.preventDefault(); goTo(a.id, nav?.area === a.id ? nav.sub : null); }
      } else if (isDM && (e.key === 'n' || e.key === 'N') && nav?.area === 'play' && nav?.sub === 'combat') {
        e.preventDefault();
        api.combatNextTurn(campaign.id).then(load).catch(() => {});
      } else if (isDM && (e.key === 't' || e.key === 'T')) {
        e.preventDefault(); copyTv();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [campaign, areas, isDM, nav, goTo, load, copyTv]);

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
  const areaProps = {
    campaign, lang, isDM, characters, sub: nav.sub, params: nav.params, goTo, onSubChange,
    onChange: load, onOpenTab: legacyNav, onNavigate: legacyNav,
  };
  const ctx = {
    area: nav.area, sub: nav.sub, params: nav.params, goTo, clearParams, isDM, lang, campaign, reload: load,
    openSearch: () => setSearch(true), openSettings: () => setSettings(true),
  };

  const content = isDM ? renderDM(nav.area, areaProps, { setGroupPending }) : renderPlayer(nav.area, areaProps);

  return (
    <AreaContext.Provider value={ctx}>
      <div className={`campaign-detail shell ${isDM ? 'is-dm' : 'is-player'}`} style={accent ? { '--camp-accent': accent } : undefined}>
        <CampaignHeader
          campaign={campaign} lang={lang} isDM={isDM} busy={busy} onBack={onBack}
          onStartSession={startSession} onEndSession={() => setEnding(true)}
          onSearch={() => setSearch(true)} onSettings={() => setSettings(true)}
          onTvOpened={() => markOnboarding('tv')} onClearScreen={clearScreen}
        />
        <AreaNav areas={areas} active={nav.area} onSelect={(a) => goTo(a)} onSearch={() => setSearch(true)} lang={lang} badges={badges} showKeys={isDM} />

        <div className="shell-panel" id="shell-panel" role="tabpanel" aria-labelledby={`area-tab-${nav.area}`}>
          {isDM && nav.area === 'world' && onboardingVisible(obStatus) && (
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
        {settings && isDM && (
          <Suspense fallback={null}>
            <SettingsMenu campaign={campaign} lang={lang} onClose={() => setSettings(false)} onChange={load}
              worldCount={world?.count ?? null} worldMax={world?.max || 500} onMarkOnboarding={markOnboarding} />
          </Suspense>
        )}
        {ending && <EndSessionDialog lang={lang} busy={busy} onCancel={() => setEnding(false)} onEnd={endSession} />}
        {toast && <div className="toast shell-toast" role="status">{toast}</div>}
      </div>
    </AreaContext.Provider>
  );
}

function Area({ Comp, props, fallback, lang, resetKey }) {
  if (!Comp) return fallback;
  return (
    <AreaBoundary lang={lang} resetKey={resetKey} fallback={fallback}>
      <Suspense fallback={<Loading lang={lang} />}><Comp {...props} /></Suspense>
    </AreaBoundary>
  );
}

function renderDM(area, p, { setGroupPending }) {
  const k = `${area}:${p.campaign.id}`;
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

function EndSessionDialog({ lang, busy, onCancel, onEnd }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal shell-end" role="dialog" aria-modal="true" aria-labelledby="shell-end-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="shell-end-title">■ {t(lang, 'Encerrar a sessão?', 'End the session?')}</h2>
        <p className="muted">{t(lang,
          'O selo "Ao vivo" sai. Se quiser, já abrimos a Crônica para você escrever o "Anteriormente em…" — é opcional.',
          'The "Live" badge goes away. If you like, we open the Chronicle so you can write the "Previously on…" — optional.')}</p>
        <div className="shell-end-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>{t(lang, 'Continuar jogando', 'Keep playing')}</button>
          <button type="button" className="btn btn-ghost" onClick={() => onEnd(false)} disabled={busy}>{t(lang, 'Encerrar', 'End')}</button>
          <button type="button" className="btn btn-primary" onClick={() => onEnd(true)} disabled={busy}>{t(lang, 'Encerrar e escrever o recap', 'End and write the recap')}</button>
        </div>
      </div>
    </div>
  );
}

