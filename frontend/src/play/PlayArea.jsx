// Área Jogar (mesa ao vivo): Agora · Combate · Testes · Tela (os ids das rotas não mudam:
// #c/1/play/scene continua valendo; só os rótulos).
//
// Montada pela casca (WP3) com lazy(). Props aceitas:
//   campaign, lang, onChange (recarrega a campanha), approvals? (lista antiga)
//   sub?, onSubChange?(sub) | onSub?(sub), goTo?   — da casca; sem eles usa useArea() (C4)
// A subvista vem de useArea().sub; trocar de subvista chama goTo('play', sub).
// V4: com a loja da mesa (casca do mestre), a faixa do turno do PC fica aqui, presa
// no topo das 4 subvistas (no celular o turno e o Próximo moram na barra da mesa).
// V7: os testes e os pedidos de rolagem são lidos AQUI, uma vez para as 4 subvistas
// (o selo, o painel do momento da Agora e a lista de Testes), só quando o pulso diz que
// eles mudaram (`checksRev`). O selo tem 2 números ("1·2" = 1 teste · 2 rolagens) e conta
// só a sessão atual (criados depois de diarySessions[n].startedAt).
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { sessionMeta, sessionTests, testsBadge } from './now-model.js';
import { useRevData, useTable } from './table-store.js';
import { TurnStrip } from '../stage/TableBar.jsx';
import { useArea } from '../shell/useArea.js';
import { SubChips } from '../shell/AreaNav.jsx';
import { legacyTabToArea } from '../shell/shell-logic.js';
import WhatsNew from '../shell/WhatsNew.jsx';
import './play-styles.css';

const TableNow = lazy(() => import('../campaigns/TableNow.jsx'));
const CombatTab = lazy(() => import('../campaigns/CombatTab.jsx'));
const TestsPanel = lazy(() => import('./TestsPanel.jsx'));
const StagePanel = lazy(() => import('./StagePanel.jsx'));

export const PLAY_SUBS = ['scene', 'combat', 'checks', 'screen'];
const L = (lang, pt, en) => (lang === 'en' ? en : pt);

export default function PlayArea(props) {
  const area = useArea();
  const campaign = props.campaign || area.campaign;
  const lang = props.lang || area.lang || 'pt';
  const onChange = props.onChange || area.reload;
  const [localSub, setLocalSub] = useState('scene');
  const ctxSub = area.area === 'play' ? area.sub : null;
  const rawSub = props.sub || ctxSub || localSub;
  const sub = PLAY_SUBS.includes(rawSub) ? rawSub : 'scene';
  // Os testes e os pedidos de rolagem, uma leitura para as 4 subvistas (selo, Agora, Testes,
  // Tela): com o pulso, só quando eles mudam; sem ele, a cada 6 s, como antes.
  const campaignId = campaign?.id;
  const table = useTable();
  const [testsData, reloadTests] = useRevData(table?.pulse?.checksRev ?? null, async () => {
    const [c, p] = await Promise.allSettled([api.listChecks(campaignId), api.listPendingRolls(campaignId)]);
    if (c.status !== 'fulfilled' && p.status !== 'fulfilled') throw new Error('tests');
    return {
      checks: c.status === 'fulfilled' ? (c.value.checks || []) : [],
      pendingRolls: p.status === 'fulfilled' ? (p.value.rolls || []) : [],
    };
  }, { table, fallbackMs: 6000, enabled: campaignId != null, key: String(campaignId) });
  const refreshTests = reloadTests;
  const since = table?.pulse?.startedAt || sessionMeta(campaign?.state).startedAt || null;
  const tests = useMemo(() => ({
    checks: testsData?.checks || [], pendingRolls: testsData?.pendingRolls || [],
    loaded: testsData !== undefined, reload: reloadTests, since,
  }), [testsData, reloadTests, since]);
  // O teste que está na Tela (para Jogar › Tela, sem polling próprio).
  const shownCheck = tests.checks.find(x => x.showOnScreen && x.status === 'open') || null;
  const inShell = !!table?.enabled;

  const shellGoTo = props.goTo || (area.campaign != null ? area.goTo : null);
  const onSub = props.onSubChange || props.onSub;
  const setSub = useCallback((s) => {
    if (onSub) onSub(s);
    else if (shellGoTo) shellGoTo('play', s);
    else setLocalSub(s);
  }, [onSub, shellGoTo]);

  // goTo para os filhos: dentro de Jogar troca a subvista; fora dele usa a casca.
  const goTo = useCallback((a, s, params) => {
    if (a === 'play') { setSub(s || 'scene'); return; }
    shellGoTo?.(a, s, params);
  }, [setSub, shellGoTo]);

  // Componentes antigos ainda chamam onNavigate('combat' | 'rolls' | 'approvals'…).
  const onNavigate = useCallback((tab, params) => {
    const m = legacyTabToArea(tab);
    if (m) goTo(m[0], m[1], params);
  }, [goTo]);

  // o selo de Testes: "1·2" (1 teste · 2 rolagens), só desta sessão
  const mine = useMemo(() => sessionTests({ checks: tests.checks, pendingRolls: tests.pendingRolls, since }), [tests, since]);
  const badge = testsBadge({ checks: mine.checks.length, rolls: mine.rolls.length }, lang);
  const badges = useMemo(() => ({ checks: badge.short }), [badge.short]);
  const badgeLabels = useMemo(() => ({ checks: badge.long }), [badge.long]);
  if (!campaign) return null;
  const fallback = <p className="muted">{L(lang, 'Carregando…', 'Loading…')}</p>;

  return (
    <div className="play-area">
      <SubChips subs={PLAY_SUBS} active={sub} onSelect={setSub} lang={lang} badges={badges} badgeLabels={badgeLabels} />
      {inShell && (
        <TurnStrip lang={lang} onOpenActor={(id) => (shellGoTo ? shellGoTo('play', 'combat', { actor: id, at: Date.now() }) : setSub('combat'))} />
      )}
      {/* V14: "O que mudou" (Telão → Tela, Cena → Agora…), uma vez por aparelho */}
      <WhatsNew lang={lang} />
      <Suspense fallback={fallback}>
        {sub === 'scene' && (
          <TableNow campaign={campaign} approvals={props.approvals} lang={lang} tests={tests}
            onChange={onChange} onNavigate={onNavigate} goTo={goTo} turnStrip={!inShell} />
        )}
        {sub === 'combat' && (
          <CombatTab campaign={campaign} lang={lang} onChange={onChange} onNavigate={onNavigate} turnStrip={!inShell}
            params={area.area === 'play' ? area.params : null} />
        )}
        {sub === 'checks' && <TestsPanel campaign={campaign} lang={lang} onChange={onChange} tests={tests} />}
        {sub === 'screen' && (
          <StagePanel campaign={campaign} lang={lang} shownCheck={shownCheck}
            onChange={() => { onChange?.(); refreshTests(); }} />
        )}
      </Suspense>
    </div>
  );
}
