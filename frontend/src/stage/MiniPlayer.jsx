// O miniplayer da Tela no celular (onda 3, E2.5c) — o "miniplayer do YouTube" pedido
// pelo dono. Tocar na miniatura da barra da mesa abre (e fecha) uma janelinha 16:9
// flutuante (~200×112 a 390 px) por cima do conteúdo: o mestre continua mexendo por
// baixo e vê a Tela o tempo todo.
//   · mostra a imagem, o estado e a última rolagem (8 s) a partir do PULSO que a casca já
//     busca (StageThumb `small`): nenhum iframe, nenhum pedido novo;
//   · tocar na imagem ou em [⤢ Ao vivo] abre a folha Tela ao vivo (grande, com os controles);
//   · arrastável entre os 4 cantos (solta no mais perto, nearestCorner) e, sem gesto,
//     [⇅] troca em cima ↔ embaixo; [✕] fecha;
//   · aberto/fechado e o canto ficam lembrados no aparelho (readMini/writeMini, na casca);
//   · nos cantos de baixo a página ganha folga no fim e, nos de cima, no começo
//     (--mini-player-h): nada fica preso embaixo dele (no topo, o cabeçalho do app e a capa
//     começam abaixo dele). Some junto com a barra (teclado aberto, folha que não é de Jogar).
import { useEffect, useRef, useState } from 'react';
import StageThumb from './StageThumb.jsx';
import useStage from './useStage.js';
import { L } from './stage-now.js';
import { flipCorner, nearestCorner } from './table-bar-model.js';
import { useFreshRoll } from './TableBar.jsx';
import { useTable } from '../play/table-store.js';
import './stage.css';

const DRAG_PX = 8;   // até aqui é toque (abre a Tela ao vivo); daqui em diante, arrastar

export default function MiniPlayer({ campaign, lang = 'pt', corner = 'br', onCorner, onClose, onOpenLive }) {
  const table = useTable();
  const stage = useStage(campaign);
  const combat = table?.combat || null;
  const roll = useFreshRoll(table);
  const test = table?.pulse?.screen?.test || null;
  const ref = useRef(null);
  const drag = useRef(null);
  const [delta, setDelta] = useState(null);   // {x, y} enquanto arrasta

  // A altura do miniplayer vai para a casca: a folga no fim (cantos de baixo) ou no começo (de cima).
  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el) return undefined;
    const put = () => root.style.setProperty('--mini-player-h', `${Math.ceil(el.getBoundingClientRect().height)}px`);
    put();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(put) : null;
    ro?.observe(el);
    return () => { ro?.disconnect(); root.style.removeProperty('--mini-player-h'); };
  }, []);

  const down = (e) => {
    if (e.button != null && e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ok */ }
  };
  const move = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_PX) return;
    d.moved = true;
    setDelta({ x: dx, y: dy });
  };
  const up = (e) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved) { setDelta(null); onOpenLive?.(); return; }
    const r = ref.current?.getBoundingClientRect();
    setDelta(null);
    if (r) onCorner?.(nearestCorner({ x: r.left, y: r.top, w: r.width, h: r.height, vw: window.innerWidth, vh: window.innerHeight }));
  };
  const cancel = () => { drag.current = null; setDelta(null); };

  const top = corner[0] === 't';
  return (
    <section ref={ref} className={`mini-player no-print is-${corner} ${top ? 'is-top' : 'is-bottom'} ${delta ? 'is-dragging' : ''}`}
      style={delta ? { transform: `translate(${delta.x}px, ${delta.y}px)` } : undefined}
      aria-label={L(lang, 'Miniplayer da Tela', 'Screen miniplayer')}>
      <div className="mini-player-screen" role="button" tabIndex={0}
        aria-label={L(lang, 'Abrir a Tela ao vivo (arraste para mudar de canto)', 'Open the live screen (drag to move it)')}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenLive?.(); } }}>
        <StageThumb campaign={campaign} stage={stage} test={test} lang={lang} small roll={roll}
          combat={combat ? { active: combat.active, round: combat.round } : null} />
      </div>
      <div className="mini-player-tools">
        <button type="button" className="mesa-btn mini-player-live" onClick={onOpenLive} aria-haspopup="dialog">
          ⤢ {L(lang, 'Ao vivo', 'Live')}
        </button>
        <button type="button" className="mesa-icon-btn" onClick={() => onCorner?.(flipCorner(corner))}
          aria-label={top ? L(lang, 'Mover para baixo', 'Move down') : L(lang, 'Mover para cima', 'Move up')}>
          <span aria-hidden="true">⇅</span>
        </button>
        <button type="button" className="mesa-icon-btn" onClick={onClose} aria-label={L(lang, 'Fechar o miniplayer', 'Close the miniplayer')}>
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </section>
  );
}
