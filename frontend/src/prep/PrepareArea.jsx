import { lazy, Suspense, useState } from 'react';
import NextSession from './NextSession.jsx';
import CampaignItemsTab from '../items/CampaignItemsTab.jsx';
import { SubChips } from '../shell/AreaNav.jsx';
import './next-session.css';

const PrepTab = lazy(() => import('./PrepTab.jsx'));
const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

export const PREPARE_SUBS = [
  { id: 'next',       icon: '📋', pt: 'Próxima sessão',      en: 'Next session' },
  { id: 'adventures', icon: '🗺', pt: 'Aventuras',            en: 'Adventures' },
  { id: 'items',      icon: '💎', pt: 'Itens da campanha',    en: 'Campaign items' },
];

const readSub = (campaignId) => { try { return localStorage.getItem(`forja.prepare.sub.${campaignId}`) || 'next'; } catch { return 'next'; } };
const writeSub = (campaignId, v) => { try { localStorage.setItem(`forja.prepare.sub.${campaignId}`, v); } catch { /* sem storage */ } };

/**
 * Área "Preparar" do mestre (WP7): Próxima sessão · Aventuras · Itens.
 *
 * props:
 *  - campaign, lang
 *  - sub?        subvista controlada pela casca ('next' | 'adventures' | 'items')
 *  - params?     { adventureId?, nodeId? } — abre a aventura (e a sala) direto
 *  - goTo?(area, sub, params)  navegação entre áreas (useArea do WP3)
 *  - onSubChange?(sub)         avisa a casca quando o mestre troca de chip
 *  - onOpenTab?  compatibilidade com a casca antiga (abas)
 */
export default function PrepareArea({ campaign, lang, sub: subProp, params, goTo, onSubChange, onOpenTab }) {
  const [own, setOwn] = useState(() => readSub(campaign.id));
  const sub = PREPARE_SUBS.some(s => s.id === subProp) ? subProp : own;
  const [openParams, setOpenParams] = useState(params || null);
  const [paramsSeen, setParamsSeen] = useState(params);
  if (params !== paramsSeen) { setParamsSeen(params); setOpenParams(params || null); }

  const setSub = (id) => {
    setOwn(id);
    writeSub(campaign.id, id);
    onSubChange?.(id);
  };

  // Navegação: dentro do Preparar troca de chip aqui mesmo; fora, delega à casca.
  const nav = (area, s, p) => {
    if (area === 'prepare') {
      if (p) setOpenParams(p);
      setOwn(s || 'next');
      writeSub(campaign.id, s || 'next');
    }
    if (goTo) goTo(area, s, p);
    else if (area === 'prepare') onSubChange?.(s || 'next');
    else if (onOpenTab) onOpenTab({ world: 'world', play: s === 'combat' ? 'combat' : 'now', group: 'members' }[area] || area);
  };

  return (
    <div className="pa">
      <SubChips subs={PREPARE_SUBS.map(x => x.id)} active={sub} onSelect={setSub} lang={lang}
        labels={Object.fromEntries(PREPARE_SUBS.map(x => [x.id, `${x.icon} ${t(lang, x.pt, x.en)}`]))} />
      <div role="tabpanel">
        {sub === 'next' && <NextSession campaign={campaign} lang={lang} goTo={nav} />}
        {sub === 'adventures' && (
          <Suspense fallback={<p className="muted">{t(lang, 'Carregando…', 'Loading…')}</p>}>
            <PrepTab campaign={campaign} lang={lang} goTo={nav} onOpenTab={onOpenTab}
              initialAdventureId={openParams?.adventureId} initialNodeId={openParams?.nodeId}
              onConsumedParams={() => setOpenParams(null)} />
          </Suspense>
        )}
        {sub === 'items' && <CampaignItemsTab campaign={campaign} lang={lang} goTo={nav} />}
      </div>
    </div>
  );
}
