// Área Jogar (mesa ao vivo): Cena · Combate · Testes · Telão.
//
// Montada pela casca (WP3) com lazy(). Props aceitas:
//   campaign, lang, onChange (recarrega a campanha), approvals? (lista antiga)
//   sub?, onSubChange?(sub) | onSub?(sub), goTo?   — da casca; sem eles usa useArea() (C4)
// A subvista vem de useArea().sub; trocar de subvista chama goTo('play', sub).
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { useArea } from '../shell/useArea.js';
import { SubChips } from '../shell/AreaNav.jsx';
import { legacyTabToArea } from '../shell/shell-logic.js';
import './play-styles.css';

const TableNow = lazy(() => import('../campaigns/TableNow.jsx'));
const CombatTab = lazy(() => import('../campaigns/CombatTab.jsx'));
const TestsPanel = lazy(() => import('./TestsPanel.jsx'));
const ScreenPanel = lazy(() => import('./ScreenPanel.jsx'));

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
      <Suspense fallback={fallback}>
        {sub === 'scene' && (
          <TableNow campaign={campaign} approvals={props.approvals || []} lang={lang}
            onChange={onChange} onNavigate={onNavigate} goTo={goTo} />
        )}
        {sub === 'combat' && <CombatTab campaign={campaign} lang={lang} onChange={onChange} onNavigate={onNavigate} />}
        {sub === 'checks' && <TestsPanel campaign={campaign} lang={lang} onChange={onChange} onCount={setTestsWaiting} />}
        {sub === 'screen' && <ScreenPanel campaign={campaign} lang={lang} onChange={onChange} />}
      </Suspense>
    </div>
  );
}
