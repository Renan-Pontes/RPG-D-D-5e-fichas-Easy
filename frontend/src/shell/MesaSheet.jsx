// Folha da mesa (plano §4.1): sobe de baixo no celular e vira diálogo central
// a partir de 768 px. Um componente só para as janelas da área do mestre.
//
//   <MesaSheet title="Encerrar a sessão?" icon="■" onClose={…} footer={…}
//              size="auto|tall|full" width="sm|md|lg" dirty={mudou}>
//     …conteúdo…
//   </MesaSheet>
//
// - Portal na camada da mesa (último filho de #root, ver mesaLayer): fica acima
//   da casca e dos modais desenhados na árvore, e abaixo dos avisos (toasts) e
//   das confirmações, como no plano (folha 100 · toasts 120 · confirmação 150).
// - role="dialog" aria-modal="true": a casca já ignora as teclas 1–4, N e T
//   enquanto houver um diálogo assim aberto (CampaignDetail › modalOpen).
// - Fecha com Esc, ✕ (44×44) e toque fora. Com `dirty`, pergunta antes
//   ("Descartar mudanças?", pelo confirmDialog do app).
// - Trava a rolagem da página, põe body.mesa-sheet-open (esconde o dado e os
//   avisos flutuantes) e devolve o foco a quem abriu.
// - Cabeçalho e rodapé presos; um só corpo rolável.
// - footer pode ser uma função ({ close }) → nó: o "Fechar" do rodapé chama
//   close e passa pela mesma pergunta do ✕ e do Esc.
// - dock="bar" (só as folhas de Jogar, V4): no celular a folha para ACIMA da
//   barra da mesa, que continua à vista e tocável (o Próximo turno nunca some).
//   dock="play": o mesmo, mas só quando aberta dentro de Jogar (folhas que também
//   abrem de outras áreas: Pedir teste, Mostrar na Tela, Avisos, Escolher monstro…).
//   As outras folhas escondem a barra (body.mesa-sheet-covers).
// - side (PC ≥ 1024): painel de 520 px preso à direita, da altura da janela, que NÃO
//   bloqueia a página (a folha da Cena ao lado do Plano, a sala ao lado do mapa da
//   aventura): sem fundo escuro, sem travar a rolagem, tocar fora não fecha. Esc fecha
//   com o foco dentro dele. No celular é a folha de sempre.
// - aside: um pedaço no cabeçalho, antes do ✕ (o "✓ Salvo" da folha da Cena).
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import { useArea } from './useArea.js';
import './mesa.css';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);
function langNow() {
  try { return localStorage.getItem('dnd5e-forge:lang') || 'pt'; } catch { return 'pt'; }
}

/**
 * Camada das folhas e confirmações da mesa: um <div> no fim de #root (o #root
 * tem z-index próprio; um portal direto no <body> ficaria por cima até dos
 * avisos da casca). Criada uma vez, sob demanda.
 */
export function mesaLayer() {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById('mesa-layer');
  if (el && el.isConnected) return el;
  el = document.createElement('div');
  el.id = 'mesa-layer';
  el.className = 'mesa-layer';
  (document.getElementById('root') || document.body).appendChild(el);
  return el;
}

/** O diálogo modal de cima (o último na ordem do documento). */
export function topmostModal() {
  if (typeof document === 'undefined') return null;
  const all = document.querySelectorAll('[aria-modal="true"]');
  return all.length ? all[all.length - 1] : null;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openSheets = 0;
let coverSheets = 0;   // folhas que cobrem a barra da mesa (todas menos as dock="bar")

function readAccent() {
  try {
    const camp = document.activeElement?.closest?.('.campaign-detail') || document.querySelector('.campaign-detail');
    const v = camp ? getComputedStyle(camp).getPropertyValue('--camp-accent').trim() : '';
    return v || null;
  } catch { return null; }
}

export default function MesaSheet({
  title, icon, eyebrow, onClose, footer, children,
  size = 'auto', width, dirty = false, dirtyText, initialFocus,
  lang, role = 'dialog', closeLabel, describedBy, className = '', bodyClassName = '', dock, side = false, aside = null,
}) {
  const { area } = useArea();
  // o painel lateral só vale no PC; decidido ao abrir (girar o tablet não troca a folha aberta)
  const [isSide] = useState(() => {
    if (!side || typeof window === 'undefined') return false;
    try { return window.matchMedia('(min-width: 1024px)').matches; } catch { return false; }
  });
  const docked = dock === 'bar' || (dock === 'play' && area === 'play') || isSide;
  const L = lang || langNow();
  const titleId = useId();
  const dialogRef = useRef(null);
  const asking = useRef(false);
  const downOnBackdrop = useRef(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Lidos no 1º desenho, antes de o foco entrar na folha.
  const [opener] = useState(() => (typeof document !== 'undefined' ? document.activeElement : null));
  const [accent] = useState(readAccent);
  const [layer] = useState(mesaLayer);

  const requestClose = useCallback(async () => {
    if (asking.current) return;
    if (dirtyRef.current) {
      asking.current = true;
      const ok = await confirmDialog({
        title: t(L, 'Descartar mudanças?', 'Discard changes?'),
        message: dirtyText || t(L, 'O que você mudou aqui ainda não foi salvo.', 'What you changed here has not been saved yet.'),
        confirmLabel: t(L, 'Descartar', 'Discard'),
        cancelLabel: t(L, 'Continuar editando', 'Keep editing'),
        danger: true,
        lang: L,
      });
      asking.current = false;
      if (!ok) return;
      // fecha depois que a confirmação sai da tela (ela devolve o foco para cá
      // e só então a folha devolve o foco a quem abriu)
      await new Promise(r => setTimeout(r, 0));
    }
    closeRef.current?.();
  }, [L, dirtyText]);

  // Abrir: trava a página, foco para dentro. Fechar: devolve o foco.
  useLayoutEffect(() => {
    if (!isSide) {
      openSheets += 1;
      document.body.classList.add('mesa-sheet-open');
    }
    if (!docked) { coverSheets += 1; document.body.classList.add('mesa-sheet-covers'); }
    const d = dialogRef.current;
    let target = null;
    if (initialFocus && typeof initialFocus === 'object' && 'current' in initialFocus) target = initialFocus.current;
    else if (typeof initialFocus === 'string') target = d?.querySelector(initialFocus);
    try { (target || d)?.focus({ preventScroll: true }); } catch { /* ok */ }
    return () => {
      if (!isSide) {
        openSheets = Math.max(0, openSheets - 1);
        if (!openSheets) document.body.classList.remove('mesa-sheet-open');
      }
      if (!docked) {
        coverSheets = Math.max(0, coverSheets - 1);
        if (!coverSheets) document.body.classList.remove('mesa-sheet-covers');
      }
      const back = () => {
        if (opener && opener !== document.body && opener.isConnected && typeof opener.focus === 'function') {
          try { opener.focus({ preventScroll: true }); } catch { /* ok */ }
        }
      };
      back();
      // Se o foco se perdeu no mesmo instante (outro diálogo saindo junto), tenta de novo.
      setTimeout(() => {
        const a = document.activeElement;
        if (!a || a === document.body || !a.isConnected) back();
      }, 0);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc fecha e Tab dá a volta dentro da folha — só a folha de cima responde.
  useEffect(() => {
    const onKey = (e) => {
      const d = dialogRef.current;
      if (!d) return;
      if (isSide) {
        // painel lateral: não prende o Tab; Esc só com o foco nele e sem outra folha por cima
        if (e.key !== 'Escape' || topmostModal() || !d.contains(document.activeElement)) return;
        e.preventDefault();
        requestClose();
        return;
      }
      if (topmostModal() !== d) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...d.querySelectorAll(FOCUSABLE)].filter(x => x.getClientRects().length > 0);
      if (!items.length) { e.preventDefault(); d.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const cur = document.activeElement;
      if (!d.contains(cur)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && (cur === first || cur === d)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose, isSide]);

  const w = width || (size === 'full' ? 'lg' : size === 'tall' ? 'md' : 'sm');
  const sheet = (
    <div
      className={`mesa-sheet-backdrop ${docked && !isSide ? 'is-dock-bar' : ''} ${isSide ? 'is-side' : ''}`.trim()}
      style={accent ? { '--camp-accent': accent } : undefined}
      onPointerDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        // o portal repassa os cliques aos componentes "pais" no React: param aqui
        e.stopPropagation();
        if (e.target === e.currentTarget && downOnBackdrop.current && !isSide) requestClose();
        downOnBackdrop.current = false;
      }}
    >
      <div
        ref={dialogRef}
        className={`mesa-sheet is-${size} w-${w} ${className}`.trim()}
        role={role}
        aria-modal={isSide ? 'false' : 'true'}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        <header className="mesa-sheet-head">
          <span className="mesa-sheet-grip" aria-hidden="true" />
          <div className="mesa-sheet-heading">
            {eyebrow && <p className="mesa-eyebrow">{eyebrow}</p>}
            {title && (
              <h2 id={titleId} className="mesa-sheet-title">
                {icon && <span className="mesa-sheet-ico" aria-hidden="true">{icon}</span>}
                <span className="mesa-foil">{title}</span>
              </h2>
            )}
          </div>
          {aside}
          <button type="button" className="mesa-icon-btn mesa-sheet-x" onClick={requestClose}
            aria-label={closeLabel || t(L, 'Fechar', 'Close')} title={closeLabel || t(L, 'Fechar (Esc)', 'Close (Esc)')}>
            <span aria-hidden="true">✕</span>
          </button>
        </header>
        <div className={`mesa-sheet-body ${bodyClassName}`.trim()}>{children}</div>
        {footer && <footer className="mesa-sheet-foot">{typeof footer === 'function' ? footer({ close: requestClose }) : footer}</footer>}
      </div>
    </div>
  );
  return layer ? createPortal(sheet, layer) : sheet;
}
