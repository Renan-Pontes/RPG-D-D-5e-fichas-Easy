// Área Jogar (mesa ao vivo): Cena · Combate · Testes · Tela.
//
// Montada pela casca (WP3) com lazy(). Props aceitas:
//   campaign, lang, onChange (recarrega a campanha), approvals? (lista antiga)
//   sub?, onSubChange?(sub) | onSub?(sub), goTo?   — da casca; sem eles usa useArea() (C4)
// A subvista vem de useArea().sub; trocar de subvista chama goTo('play', sub).
// V4: com a loja da mesa (casca do mestre), a faixa do turno do PC fica aqui, presa
// no topo das 4 subvistas (no celular o turno e o Próximo moram na barra da mesa),
// e o selo de Testes só busca quando o pulso diz que os testes mudaram.
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { testsBadge, unifyTests } from './scene-model.js';
import { useOnRev, useTable } from './table-store.js';
import { TurnStrip } from '../stage/TableBar.jsx';
import { useArea } from '../shell/useArea.js';
import { SubChips } from '../shell/AreaNav.jsx';
import { legacyTabToArea } from '../shell/shell-logic.js';
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
  const [testsWaiting, setTestsWaiting] = useState(0);
  // O teste que está na Tela (para Jogar › Tela, sem polling próprio).
  const [shownCheck, setShownCheck] = useState(null);
  // Selo de Testes sempre atual, mesmo com outra subvista aberta (#37).
  const campaignId = campaign?.id;
  const refreshTests = useCallback(async () => {
    if (!campaignId) return;
    const [c, p] = await Promise.allSettled([api.listChecks(campaignId), api.listPendingRolls(campaignId)]);
    if (c.status !== 'fulfilled' && p.status !== 'fulfilled') return;
    const checks = c.status === 'fulfilled' ? (c.value.checks || []) : null;
    if (checks) setShownCheck(checks.find(x => x.showOnScreen && x.status === 'open') || null);
    setTestsWaiting(testsBadge(unifyTests({
      checks: checks || [],
      pendingRolls: p.status === 'fulfilled' ? (p.value.rolls || []) : [],
    })));
  }, [campaignId]);
  const table = useTable();
  // Com o pulso: só quando os testes mudam (e 1 vez por minuto); sem ele, a cada 6 s, como antes.
  useOnRev(table?.pulse?.checksRev, refreshTests, { table, fallbackMs: 6000 });
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

  const badges = useMemo(() => ({ checks: testsWaiting }), [testsWaiting]);
  if (!campaign) return null;
  const fallback = <p className="muted">{L(lang, 'Carregando…', 'Loading…')}</p>;

  return (
    <div className="play-area">
      <SubChips subs={PLAY_SUBS} active={sub} onSelect={setSub} lang={lang} badges={badges} />
      {inShell && (
        <TurnStrip lang={lang} onOpenActor={(id) => (shellGoTo ? shellGoTo('play', 'combat', { actor: id, at: Date.now() }) : setSub('combat'))} />
      )}
      <Suspense fallback={fallback}>
        {sub === 'scene' && (
          <TableNow campaign={campaign} approvals={props.approvals} lang={lang}
            onChange={onChange} onNavigate={onNavigate} goTo={goTo} turnStrip={!inShell} />
        )}
        {sub === 'combat' && (
          <CombatTab campaign={campaign} lang={lang} onChange={onChange} onNavigate={onNavigate} turnStrip={!inShell}
            params={area.area === 'play' ? area.params : null} />
        )}
        {sub === 'checks' && <TestsPanel campaign={campaign} lang={lang} onChange={onChange} onCount={setTestsWaiting} />}
        {sub === 'screen' && (
          <StagePanel campaign={campaign} lang={lang} shownCheck={shownCheck}
            onChange={() => { onChange?.(); refreshTests(); }} />
        )}
      </Suspense>
    </div>
  );
}
