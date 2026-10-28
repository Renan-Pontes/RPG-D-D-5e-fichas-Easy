import { lazy, Suspense, useState } from 'react';
import NextSession from './NextSession.jsx';
import CampaignItemsTab from '../items/CampaignItemsTab.jsx';
import { SubChips } from '../shell/AreaNav.jsx';
import ReadySheet from './ReadySheet.jsx';
import WhatsNew from '../shell/WhatsNew.jsx';
import './next-session.css';

const PrepTab = lazy(() => import('./PrepTab.jsx'));
const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

export const PREPARE_SUBS = [
  { id: 'next',       icon: '📋', pt: 'Plano',      en: 'Plan' },
  { id: 'adventures', icon: '🗺', pt: 'Aventuras',  en: 'Adventures' },
  { id: 'items',      icon: '💎', pt: 'Itens',      en: 'Items' },
];

const readSub = (campaignId) => { try { return localStorage.getItem(`forja.prepare.sub.${campaignId}`) || 'next'; } catch { return 'next'; } };
const writeSub = (campaignId, v) => { try { localStorage.setItem(`forja.prepare.sub.${campaignId}`, v); } catch { /* sem storage */ } };

/**
 * Área "Preparar" do mestre: Plano · Aventuras · Itens (os ids das rotas não mudam:
 * `next` é o Plano da Sessão N).
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
  const [showReady, setShowReady] = useState(false);
  const [listKey, setListKey] = useState(0); // remonta a lista depois de importar uma aventura pronta

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
        ariaLabel={t(lang, 'Preparar', 'Prepare')} />
      {/* V14: "O que mudou" (Próxima sessão → Plano, Telão → Tela…), uma vez por aparelho */}
      <WhatsNew lang={lang} />
      <div role="tabpanel">
        {sub === 'next' && <NextSession campaign={campaign} lang={lang} goTo={nav} />}
        {sub === 'adventures' && (
          <Suspense fallback={<p className="muted">{t(lang, 'Carregando…', 'Loading…')}</p>}>
            <PrepTab key={listKey} campaign={campaign} lang={lang} goTo={nav} onOpenTab={onOpenTab}
              initialAdventureId={openParams?.adventureId} initialNodeId={openParams?.nodeId}
              onConsumedParams={() => setOpenParams(null)} onReady={() => setShowReady(true)} />
          </Suspense>
        )}
        {sub === 'items' && <CampaignItemsTab campaign={campaign} lang={lang} goTo={nav} />}
      </div>
      {showReady && (
        <ReadySheet campaign={campaign} lang={lang} onClose={() => setShowReady(false)}
          onImported={() => setListKey(k => k + 1)}
          onOpen={(adventureId) => { setShowReady(false); setOpenParams({ adventureId }); setListKey(k => k + 1); }} />
      )}
    </div>
  );
}
