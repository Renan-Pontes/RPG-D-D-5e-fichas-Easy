import { lazy, Suspense, useEffect, useState } from 'react';
import NextSession from './NextSession.jsx';
import CampaignItemsTab from '../items/CampaignItemsTab.jsx';
import { SubChips } from '../shell/AreaNav.jsx';
import './next-session.css';
import ReadyAdventureGallery from '../ready/ReadyAdventureGallery.jsx';

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
      <div role="tabpanel">
        {sub === 'next' && <NextSession campaign={campaign} lang={lang} goTo={nav} />}
        {/* Só aparece na lista de aventuras (CSS: irmão .prep-tab), não dentro de uma aventura aberta. */}
        {sub === 'adventures' && (
          <div className="ready-entry">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowReady(true)}>📖 {t(lang, 'Adicionar aventura pronta', 'Add a ready adventure')}</button>
            <span className="muted">{t(lang, 'Aventuras originais da Forja, prontas para conduzir.', 'Original Forja adventures, ready to run.')}</span>
          </div>
        )}
        {sub === 'adventures' && (
          <Suspense fallback={<p className="muted">{t(lang, 'Carregando…', 'Loading…')}</p>}>
            <PrepTab key={listKey} campaign={campaign} lang={lang} goTo={nav} onOpenTab={onOpenTab}
              initialAdventureId={openParams?.adventureId} initialNodeId={openParams?.nodeId}
              onConsumedParams={() => setOpenParams(null)} />
          </Suspense>
        )}
        {sub === 'items' && <CampaignItemsTab campaign={campaign} lang={lang} goTo={nav} />}
      </div>
      {showReady && (
        <ReadyModal campaign={campaign} lang={lang} onClose={() => setShowReady(false)}
          onImported={() => setListKey(k => k + 1)}
          onOpen={(adventureId) => { setShowReady(false); setOpenParams({ adventureId }); setListKey(k => k + 1); }} />
      )}
    </div>
  );
}

/** Janela "Adicionar aventura pronta" (Preparar › Aventuras). */
function ReadyModal({ campaign, lang, onClose, onImported, onOpen }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal ready-modal" role="dialog" aria-modal="true" aria-labelledby="ready-modal-title" onClick={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label={t(lang, 'Fechar', 'Close')}>×</button>
        <h2 id="ready-modal-title">📖 {t(lang, 'Aventuras prontas', 'Ready adventures')}</h2>
        <p className="ready-intro">{t(lang,
          'Cada uma traz o mundo (lugares, personagens, facções, lendas e documentos), as salas com texto para ler em voz alta, testes, encontros e tesouro, e dicas para conduzir. Os cartões chegam ocultos; a aventura chega como Rascunho.',
          'Each one brings the world (places, characters, factions, legends and handouts), rooms with read-aloud text, checks, encounters and treasure, and tips for running it. Cards arrive hidden; the adventure arrives as a Draft.')}</p>
        <ReadyAdventureGallery lang={lang} mode="import" campaignId={campaign.id} onImported={onImported} onOpen={onOpen} />
      </div>
    </div>
  );
}
