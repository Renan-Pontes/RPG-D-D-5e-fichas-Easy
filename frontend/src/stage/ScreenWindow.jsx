// Janela da Tela no PC (V4, §5.8 · P2): a miniatura do YouTube pedida pelo dono.
//
// <ScreenWindow> flutua no canto de baixo (24 px das bordas): o resumo 16:9 de
// 320×180 desenhado pelo app (StageThumb, a mesma regra da TV) + uma legenda de
// 44 px ("● TV · Na tela: X") e [⤢ Ao vivo] [🎲] [⇆] [–] [✕]:
//   ⤢ Ao vivo  vira 480×270 com a TV de verdade (iframe; pausa como na folha) · ⤡ volta;
//   ⇆          troca de canto (botão, sem arrastar; Mundo › Mapas e a aventura aberta
//              em Preparar põem à esquerda sozinhos);
//   –          recolhe numa pílula "📺 Tela · Ponte velha" de 44 px;
//   ✕          esconde até a próxima sessão (a casca guarda no aparelho).
// Tocar no resumo abre a folha Tela ao vivo (os controles). O 📺 Tela da capa
// abre a janela já em "ao vivo".
// <DockedScreen> é a mesma janela ENCAIXADA (não flutua; sem ⇆ – ✕): no topo da
// coluna da direita em Jogar › Agora; em Jogar › Combate, numa 3ª coluna estreita
// a partir de 1280 px e, de 1024 a 1279, na forma `compact` (uma linha com a
// miniatura, no topo da coluna da lista) — nunca dentro do mapa, que fica inteiro
// e preso ao lado da lista.
// Sem conexão (a loja diz há quantos segundos): o ponto da TV fica cinza ("○ TV:
// sem conexão") e o que está na Tela leva "(última vez visto)".
import { useEffect, useRef, useState } from 'react';
import StageThumb from './StageThumb.jsx';
import useStage from './useStage.js';
import { L, screenLine } from './stage-now.js';
import { seenSuffix, tvLine, tvShort, tvState, turnLine } from './table-bar-model.js';
import { LiveTv } from './LiveScreenSheet.jsx';
import { openDice } from './TableBar.jsx';
import { useTable } from '../play/table-store.js';
import './stage.css';

function useWindowData(campaign, lang) {
  const table = useTable();
  const stage = useStage(campaign);
  const combat = table?.combat || null;
  const combatNow = combat ? { active: combat.active, round: combat.round } : campaign.combatNow;
  const test = table?.pulse?.screen?.test || null;
  const offline = (table?.offlineFor || 0) > 0;
  const line = screenLine({ stage, combat: combatNow, lang }) + seenSuffix(offline, lang);
  return { table, stage, combat, combatNow, test, line, tvLive: table?.tvLive || 0, offline };
}

/**
 * A altura da janela na casca (--screen-win-h): o painel lateral do PC (a folha da Cena)
 * para acima dela quando ela está no canto da direita (P2), e a miniatura nunca fica coberta.
 */
function useWinHeight(dep) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el) return undefined;
    const put = () => root.style.setProperty('--screen-win-h', `${Math.ceil(el.getBoundingClientRect().height)}px`);
    put();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(put) : null;
    ro?.observe(el);
    return () => { ro?.disconnect(); root.style.removeProperty('--screen-win-h'); };
  }, [dep]);
  return ref;
}

export default function ScreenWindow({ campaign, lang = 'pt', corner = 'right', onCorner, onHide, liveAt = 0 }) {
  const { table, stage, combat, combatNow, test, line, tvLive, offline } = useWindowData(campaign, lang);
  const [size, setSize] = useState(liveAt ? 'live' : 'thumb');   // 'thumb' | 'live' | 'pill'
  const winRef = useWinHeight(size);
  // O 📺 Tela da capa: abre já em "ao vivo".
  useEffect(() => { if (liveAt) setSize('live'); }, [liveAt]);
  if (size === 'pill') {
    return (
      <button type="button" ref={winRef} className={`screen-win is-pill is-${corner} no-print`} onClick={() => setSize('thumb')}
        aria-label={`${L(lang, 'Tela', 'Screen')}: ${line}. ${L(lang, 'Abrir a janela', 'Open the window')}`}>
        <span aria-hidden="true">📺</span> <span className="screen-win-pill-text">{L(lang, 'Tela', 'Screen')} · {line}</span>
      </button>
    );
  }
  return (
    <section ref={winRef} className={`screen-win is-float is-${corner} is-${size} no-print`} aria-label={L(lang, 'Janela da Tela', 'Screen window')}>
      {size === 'live' ? (
        <LiveTv token={campaign.screenToken} lang={lang} className="screen-win-live" />
      ) : (
        <button type="button" className="screen-win-thumb" onClick={() => table?.openLive?.()} aria-haspopup="dialog"
          aria-label={`${line}. ${L(lang, 'Abrir a Tela ao vivo', 'Open the live screen')}`}>
          <StageThumb campaign={campaign} stage={stage} test={test} lang={lang} combat={combatNow} />
        </button>
      )}
      <div className="screen-win-cap">
        <button type="button" className="screen-win-line" onClick={() => table?.openLive?.()} aria-haspopup="dialog"
          title={tvLine(tvLive, lang, offline)}>
          <span className={`live-tv-dot is-${tvState(tvLive, offline)}`}>{tvShort(tvLive, lang, offline)}</span>
          {' · '}{combat?.active ? turnLine(combat, lang) : `${L(lang, 'Na tela', 'On screen')}: ${line}`}
        </button>
        <div className="screen-win-tools">
          <button type="button" className="mesa-btn screen-win-live-btn" onClick={() => setSize(size === 'live' ? 'thumb' : 'live')}
            aria-pressed={size === 'live'}>
            {size === 'live' ? `⤡ ${L(lang, 'Resumo', 'Summary')}` : `⤢ ${L(lang, 'Ao vivo', 'Live')}`}
          </button>
          <button type="button" className="mesa-icon-btn screen-win-dice" onClick={openDice} title={L(lang, 'Rolar dados', 'Roll dice')}>
            <span aria-hidden="true">🎲</span><span className="sr-only">{L(lang, 'Rolar dados', 'Roll dice')}</span>
          </button>
          <button type="button" className="mesa-icon-btn" onClick={() => onCorner?.(corner === 'right' ? 'left' : 'right')}
            title={L(lang, 'Trocar de canto', 'Switch corner')}>
            <span aria-hidden="true">⇆</span><span className="sr-only">{L(lang, 'Trocar de canto', 'Switch corner')}</span>
          </button>
          <button type="button" className="mesa-icon-btn" onClick={() => setSize('pill')} title={L(lang, 'Recolher', 'Collapse')}>
            <span aria-hidden="true">–</span><span className="sr-only">{L(lang, 'Recolher', 'Collapse')}</span>
          </button>
          <button type="button" className="mesa-icon-btn" onClick={onHide} title={L(lang, 'Esconder até a próxima sessão', 'Hide until next session')}>
            <span aria-hidden="true">✕</span><span className="sr-only">{L(lang, 'Esconder até a próxima sessão', 'Hide until next session')}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * A janela encaixada (Jogar › Agora e Combate, PC). `compact`: uma linha só (a
 * miniatura de 72×40, o que está na Tela e a TV, [⤢ Ao vivo] e 🎲), para o
 * Combate de 1024 a 1279 px; ⤢ Ao vivo abre ali a folha Tela ao vivo (com a TV).
 */
export function DockedScreen({ campaign, lang = 'pt', compact = false }) {
  const { table, stage, combat, combatNow, test, line, tvLive, offline } = useWindowData(campaign, lang);
  const [live, setLive] = useState(false);
  if (table?.win !== 'docked') return null;
  const what = combat?.active ? turnLine(combat, lang) : `${L(lang, 'Na tela', 'On screen')}: ${line}`;
  const dice = (
    <button type="button" className="mesa-icon-btn screen-win-dice" onClick={openDice} title={L(lang, 'Rolar dados', 'Roll dice')}>
      <span aria-hidden="true">🎲</span><span className="sr-only">{L(lang, 'Rolar dados', 'Roll dice')}</span>
    </button>
  );
  if (compact) {
    return (
      <section className="screen-win is-docked is-compact no-print" aria-label={L(lang, 'Na tela agora', 'On screen now')}>
        <button type="button" className="screen-win-compact" onClick={() => table?.openLive?.()} aria-haspopup="dialog">
          <StageThumb campaign={campaign} stage={stage} lang={lang} mini combat={combatNow} />
          <span className="screen-win-compact-text">
            <span className="screen-win-compact-what">{what}</span>
            <span className={`live-tv-dot is-${tvState(tvLive, offline)}`}>{tvLine(tvLive, lang, offline)}</span>
          </span>
        </button>
        <button type="button" className="mesa-btn screen-win-live-btn" onClick={() => table?.openLive?.()} aria-haspopup="dialog">
          ⤢ {L(lang, 'Ao vivo', 'Live')}
        </button>
        {dice}
      </section>
    );
  }
  return (
    <section className="screen-win is-docked no-print" aria-label={L(lang, 'Na tela agora', 'On screen now')}>
      <p className="mesa-eyebrow screen-win-head">
        <span>{L(lang, 'Na tela agora', 'On screen now')}</span>
        <span className={`live-tv-dot is-${tvState(tvLive, offline)}`}>{tvLine(tvLive, lang, offline)}</span>
      </p>
      {live ? <LiveTv token={campaign.screenToken} lang={lang} /> : (
        <button type="button" className="screen-win-thumb" onClick={() => table?.openLive?.()} aria-haspopup="dialog"
          aria-label={`${line}. ${L(lang, 'Abrir a Tela ao vivo', 'Open the live screen')}`}>
          <StageThumb campaign={campaign} stage={stage} test={test} lang={lang} combat={combatNow} />
        </button>
      )}
      <div className="screen-win-cap">
        <button type="button" className="screen-win-line" onClick={() => table?.openLive?.()} aria-haspopup="dialog">
          {what}
        </button>
        <div className="screen-win-tools">
          <button type="button" className="mesa-btn screen-win-live-btn" onClick={() => setLive(v => !v)} aria-pressed={live}>
            {live ? `⤡ ${L(lang, 'Resumo', 'Summary')}` : `⤢ ${L(lang, 'Ao vivo', 'Live')}`}
          </button>
          {dice}
        </div>
      </div>
    </section>
  );
}
