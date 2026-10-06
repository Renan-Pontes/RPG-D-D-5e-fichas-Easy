// Toast grande no celular do jogador: "✨ O mestre revelou: Irmã Velna".
//
// Duas origens, ambas vindas do poll da campanha que a casca já faz:
//   1. campaign.screenCard (o mestre clicou "Mostrar no telão") — usa card.at;
//   2. campaign.worldNewCount subiu (o mestre revelou sem mostrar) — busca a
//      lista leve uma vez para saber o nome.
// Some sozinho em 10 s; "Ver no Mundo" abre o cartão. Não interrompe nada
// (não é modal) e não aparece para o mestre.
//
// Props: campaign, lang, onOpenWorld?(entryId) — sem ela, usa useArea().goTo.
import { useEffect, useRef, useState } from 'react';
import useArea from '../shell/useArea.js';
import { listWorld, worldImageUrl } from '../world/world-api.js';
import { defaultArt, kindIcon } from '../world/world-model.js';
import { cardKey, L, revealedSince, shouldToastCard, toastTitle } from './player-model.js';
import './player-styles.css';

const SHOW_MS = 10_000;
const storeKey = (id) => `forja:reveal-toast:${id}`;
const readStore = (id) => { try { return localStorage.getItem(storeKey(id)) || ''; } catch { return ''; } };
const writeStore = (id, v) => { try { localStorage.setItem(storeKey(id), v); } catch { /* sem storage */ } };

export default function RevealToast({ campaign, lang = 'pt', onOpenWorld }) {
  const area = useArea();
  const [toast, setToast] = useState(null);
  const lastCardRef = useRef(null);
  const prevCountRef = useRef(undefined);
  const recentIdsRef = useRef(new Set());
  const isPlayer = campaign && campaign.role !== 'dm';
  const campaignId = campaign?.id;

  const show = (t) => {
    setToast({ ...t, key: `${Date.now()}` });
    if (t.entryId) recentIdsRef.current.add(t.entryId);
    try { navigator.vibrate?.([30, 50, 30]); } catch { /* ignore */ }
  };

  // 1) Cartão do telão
  const card = campaign?.screenCard;
  const ck = cardKey(card);
  useEffect(() => {
    if (!isPlayer) return;
    if (lastCardRef.current === null) lastCardRef.current = readStore(campaignId);
    if (shouldToastCard(card, lastCardRef.current, Date.now(), 10 * 60_000)) {
      lastCardRef.current = ck;
      writeStore(campaignId, ck);
      show({
        title: toastTitle([card.title], lang),
        text: card.partial ? L(lang, 'Rumores…', 'Rumors…') : (card.text || ''),
        entryId: card.entryId,
        image: worldImageUrl(card.imageUrl) || defaultArt({ id: card.entryId, kind: card.kind }),
        icon: kindIcon(card.kind),
      });
    }
  }, [ck, isPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2) Revelação sem telão: o contador de novidades subiu
  const count = campaign?.worldNewCount;
  useEffect(() => {
    if (!isPlayer || typeof count !== 'number') return;
    const prev = prevCountRef.current;
    prevCountRef.current = count;
    if (prev === undefined || count <= prev) return;
    let alive = true;
    (async () => {
      try {
        const r = await listWorld(campaignId);
        const fresh = revealedSince(r.entries || [], r.seenAt)
          .slice(0, count - prev)
          .filter(e => !recentIdsRef.current.has(e.id));
        if (!alive || !fresh.length) return;
        const first = fresh[0];
        show({
          title: toastTitle(fresh.map(e => e.name), lang),
          text: first.summary || '',
          entryId: first.id,
          image: worldImageUrl(first) || defaultArt(first),
          icon: kindIcon(first.kind),
        });
      } catch { /* o selo "Novo!" na aba já avisa */ }
    })();
    return () => { alive = false; };
  }, [count, isPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), SHOW_MS);
    return () => clearTimeout(id);
  }, [toast?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isPlayer || !toast) return null;

  const open = () => {
    const id = toast.entryId;
    setToast(null);
    if (onOpenWorld) onOpenWorld(id);
    else area?.goTo?.('world', 'atlas', id ? { entryId: id } : {});
  };
  const text = toast.text && toast.text.length > 140 ? `${toast.text.slice(0, 137)}…` : toast.text;

  return (
    <div className="pl-toast-wrap" role="status" aria-live="polite">
      <div className="pl-toast" key={toast.key}>
        <div className="pl-toast-art" aria-hidden="true">
          {toast.image ? <img src={toast.image} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span>{toast.icon}</span>}
        </div>
        <div className="pl-toast-body">
          <div className="pl-toast-title"><span aria-hidden="true">✨ </span>{toast.title}</div>
          {text && <div className="pl-toast-text">{text}</div>}
          <div className="pl-toast-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={open}>{L(lang, 'Ver no Mundo', 'See in World')}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setToast(null)}>{L(lang, 'Fechar', 'Close')}</button>
          </div>
        </div>
        <div className="pl-toast-timer" aria-hidden="true" />
      </div>
    </div>
  );
}
