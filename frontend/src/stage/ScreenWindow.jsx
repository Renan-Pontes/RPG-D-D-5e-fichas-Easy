// Janela da Tela no PC (V4, §5.8 · P2): a miniatura do YouTube pedida pelo dono.
//
// <ScreenWindow> flutua no canto de baixo (24 px das bordas): o resumo 16:9 de
// 320×180 desenhado pelo app (StageThumb, a mesma regra da TV) + uma legenda de
// 44 px ("● TV · Na tela: X") e [⤢ Ao vivo] [🎲] [⇆] [–] [✕]:
//   ⤢ Ao vivo  vira 480×270 com a TV de verdade (iframe; pausa como na folha) · ⤡ volta;
//   ⇆          troca de canto (botão, sem arrastar; Mundo › Mapas põe à esquerda sozinho);
//   –          recolhe numa pílula "📺 Tela · Ponte velha" de 44 px;
//   ✕          esconde até a próxima sessão (a casca guarda no aparelho).
// Tocar no resumo abre a folha Tela ao vivo (os controles). O 📺 Tela da capa
// abre a janela já em "ao vivo".
// <DockedScreen> é a mesma janela ENCAIXADA no topo da coluna da direita em
// Jogar › Agora e Jogar › Combate (não flutua; sem ⇆ – ✕).
import { useEffect, useState } from 'react';
import StageThumb from './StageThumb.jsx';
import useStage from './useStage.js';
import { L, screenLine } from './stage-now.js';
import { tvLine, turnLine } from './table-bar-model.js';
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
  const line = screenLine({ stage, combat: combatNow, lang });
  return { table, stage, combat, combatNow, test, line, tvLive: table?.tvLive || 0 };
}

export default function ScreenWindow({ campaign, lang = 'pt', corner = 'right', onCorner, onHide, liveAt = 0 }) {
  const { table, stage, combat, combatNow, test, line, tvLive } = useWindowData(campaign, lang);
  const [size, setSize] = useState(liveAt ? 'live' : 'thumb');   // 'thumb' | 'live' | 'pill'
  // O 📺 Tela da capa: abre já em "ao vivo".
  useEffect(() => { if (liveAt) setSize('live'); }, [liveAt]);
  if (size === 'pill') {
    return (
      <button type="button" className={`screen-win is-pill is-${corner} no-print`} onClick={() => setSize('thumb')}
        aria-label={`${L(lang, 'Tela', 'Screen')}: ${line}. ${L(lang, 'Abrir a janela', 'Open the window')}`}>
        <span aria-hidden="true">📺</span> <span className="screen-win-pill-text">{L(lang, 'Tela', 'Screen')} · {line}</span>
      </button>
    );
  }
  return (
    <section className={`screen-win is-float is-${corner} is-${size} no-print`} aria-label={L(lang, 'Janela da Tela', 'Screen window')}>
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
          title={tvLine(tvLive, lang)}>
          <span className={`live-tv-dot ${tvLive > 0 ? 'is-on' : ''}`}>{tvLive > 0 ? `● ${L(lang, 'TV', 'TV')}` : `○ ${L(lang, 'Nenhuma TV', 'No TV')}`}</span>
          {' · '}{combat?.active ? turnLine(combat, lang) : `${L(lang, 'Na tela', 'On screen')}: ${line}`}
        </button>
        <div className="screen-win-tools">
          <button type="button" className="mesa-icon-btn" onClick={() => setSize(size === 'live' ? 'thumb' : 'live')}
            aria-pressed={size === 'live'} title={size === 'live' ? L(lang, 'Voltar ao resumo', 'Back to the summary') : L(lang, 'Ver ao vivo', 'Watch live')}>
            <span aria-hidden="true">{size === 'live' ? '⤡' : '⤢'}</span>
            <span className="sr-only">{size === 'live' ? L(lang, 'Voltar ao resumo', 'Back to the summary') : L(lang, 'Ver ao vivo', 'Watch live')}</span>
          </button>
          <button type="button" className="mesa-icon-btn" onClick={openDice} title={L(lang, 'Rolar dados', 'Roll dice')}>
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

/** A janela encaixada no topo da coluna da direita (Jogar › Agora e Combate, PC). */
export function DockedScreen({ campaign, lang = 'pt' }) {
  const { table, stage, combat, combatNow, test, line, tvLive } = useWindowData(campaign, lang);
  const [live, setLive] = useState(false);
  if (table?.win !== 'docked') return null;
  return (
    <section className="screen-win is-docked no-print" aria-label={L(lang, 'Na tela agora', 'On screen now')}>
      <p className="mesa-eyebrow screen-win-head">
        <span>{L(lang, 'Na tela agora', 'On screen now')}</span>
        <span className={`live-tv-dot ${tvLive > 0 ? 'is-on' : ''}`}>{tvLine(tvLive, lang)}</span>
      </p>
      {live ? <LiveTv token={campaign.screenToken} lang={lang} /> : (
        <button type="button" className="screen-win-thumb" onClick={() => table?.openLive?.()} aria-haspopup="dialog"
          aria-label={`${line}. ${L(lang, 'Abrir a Tela ao vivo', 'Open the live screen')}`}>
          <StageThumb campaign={campaign} stage={stage} test={test} lang={lang} combat={combatNow} />
        </button>
      )}
      <div className="screen-win-cap">
        <button type="button" className="screen-win-line" onClick={() => table?.openLive?.()} aria-haspopup="dialog">
          {combat?.active ? turnLine(combat, lang) : `${L(lang, 'Na tela', 'On screen')}: ${line}`}
        </button>
        <div className="screen-win-tools">
          <button type="button" className="mesa-btn" onClick={() => setLive(v => !v)} aria-pressed={live}>
            {live ? `⤡ ${L(lang, 'Resumo', 'Summary')}` : `⤢ ${L(lang, 'Ao vivo', 'Live')}`}
          </button>
          <button type="button" className="mesa-icon-btn" onClick={openDice} title={L(lang, 'Rolar dados', 'Roll dice')}>
            <span aria-hidden="true">🎲</span><span className="sr-only">{L(lang, 'Rolar dados', 'Roll dice')}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
