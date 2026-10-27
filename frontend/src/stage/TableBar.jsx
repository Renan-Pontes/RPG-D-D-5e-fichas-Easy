// A barra da mesa (V4, §5.8 · W3, W4, W7) e a faixa do turno do PC (§2.2).
//
// <TableBar> — celular (≤ 767): 64 px fixos logo acima da barra de baixo, em
// QUALQUER área. À esquerda a miniatura da Tela (desenhada pelo app, StageThumb
// mini) numa área de toque de 80×64; no meio 2 linhas de texto de verdade
// (table-bar-model.barLines); à direita o 🎲 (48×48) e, em combate, o
// [Próximo →] (88×48, dourado) — ▶ Iniciar com o combate montado e parado,
// "Encerrar o combate" quando todos os monstros caíram (sugestão, nada sozinho).
// Tocar na miniatura ou no texto abre a folha Tela ao vivo (sempre o mesmo
// destino). Some com o teclado aberto e atrás das folhas que não são de Jogar
// (CSS: body.mesa-sheet-covers). Os dados vêm da loja da mesa (pulso), sem
// pedido novo; o relógio de "Sem conexão há N s" é só do aparelho.
//
// <TurnStrip> — PC (≥ 768), presa no topo de Jogar com combate: "RODADA 2 · VEZ
// DE X · PV 3/10 · depois: Dagna", a fita de iniciativa (✓ agiu · ● agora ·
// ○ falta · † caiu, só leitura) e [Próximo turno →] (48, tecla N).
import { useEffect, useRef, useState } from 'react';
import StageThumb from './StageThumb.jsx';
import useStage from './useStage.js';
import { L } from './stage-now.js';
import { REARM_MS, afterLine, barLines, freshRoll, offlineSeconds, ribbon } from './table-bar-model.js';
import { useTable } from '../play/table-store.js';
import './stage.css';

/** Um relógio do aparelho (re-desenha a cada `ms`; nenhum pedido). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Teclado do celular aberto (a área visível encolhe para menos de 75% da janela). */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return undefined;
    const on = () => setOpen(vv.height < window.innerHeight * 0.75);
    on();
    vv.addEventListener('resize', on);
    return () => vv.removeEventListener('resize', on);
  }, []);
  return open;
}

/** O botão que acabou de mudar de sentido ignora toques por 400 ms (princípio 8). */
function useRearm(key) {
  const until = useRef(0);
  const last = useRef(key);
  if (last.current !== key) { last.current = key; until.current = Date.now() + REARM_MS; }
  return () => Date.now() >= until.current;
}

export function openDice() {
  try { window.__diceOpen?.(); } catch { /* sem o rolador */ }
}

const ACTION_LABEL = {
  next: ['Próximo →', 'Next →', 'Próximo turno', 'Next turn'],
  end: ['Encerrar o combate', 'End combat', 'Encerrar o combate', 'End combat'],
  start: ['▶ Iniciar', '▶ Start', 'Iniciar o combate', 'Start combat'],
};

export default function TableBar({ campaign, lang = 'pt', onOpenLive, onEndCombat }) {
  const table = useTable();
  const stage = useStage(campaign);
  const now = useNow(1000);
  const keyboard = useKeyboardOpen();
  const combat = table?.combat || null;
  const offlineFor = offlineSeconds(table?.lastOkAt, now);
  const lines = barLines({
    stage, combat, test: table?.pulse?.screen?.test || null, tvLive: table?.tvLive || 0, tvSeen: !!table?.tvSeen,
    live: table?.pulse ? !!table.pulse.live : !!campaign.state?.live, offlineFor,
    roll: freshRoll(table?.pulse?.screen?.roll, table?.rollSeen, now), sending: table?.sending, lang,
  });
  const action = lines.action;
  const armed = useRearm(action);
  // o 🎲 anda quando o botão da direita aparece ou some (começo/fim do combate)
  const diceArmed = useRearm(!!action);
  const busy = !!table?.busy;
  const act = () => {
    if (!armed() || busy) return;
    if (action === 'next') table?.nextTurn();
    else if (action === 'start') table?.startCombat();
    else if (action === 'end') onEndCombat?.();
  };
  const label = action ? ACTION_LABEL[action] : null;
  return (
    <div className={`mesa-bar no-print ${keyboard ? 'is-keyboard' : ''} ${action ? 'has-action' : ''}`}
      role="region" aria-label={L(lang, 'Barra da mesa', 'Table bar')}>
      <button type="button" className="mesa-bar-main" onClick={onOpenLive} aria-haspopup="dialog"
        aria-label={`${lines.l1}. ${lines.l2}. ${L(lang, 'Abrir a Tela ao vivo', 'Open the live screen')}`}>
        <span className="mesa-bar-thumb">
          <StageThumb campaign={campaign} stage={stage} lang={lang} mini
            combat={combat ? { active: combat.active, round: combat.round } : null} />
        </span>
        <span className="mesa-bar-text" aria-hidden="true">
          <span className="mesa-bar-l1">{lines.l1}</span>
          <span className={`mesa-bar-l2 ${lines.tone ? `is-${lines.tone}` : ''}`} aria-live="polite">{lines.l2}</span>
        </span>
      </button>
      <button type="button" className="mesa-btn mesa-bar-dice" onClick={() => { if (diceArmed()) openDice(); }}
        aria-label={L(lang, 'Rolar dados', 'Roll dice')} title={L(lang, 'Rolar dados', 'Roll dice')}>
        <span aria-hidden="true">🎲</span>
      </button>
      {label && (
        <button type="button" className={`mesa-btn ${action === 'end' ? '' : 'is-primary'} mesa-bar-act is-${action}`} onClick={act} disabled={busy}
          aria-label={busy ? L(lang, 'Enviando…', 'Sending…') : L(lang, label[2], label[3])}
          aria-keyshortcuts={action === 'next' ? 'N' : undefined}>
          <span className="stage-clamp">{busy ? '…' : L(lang, label[0], label[1])}</span>
        </button>
      )}
    </div>
  );
}

/** Faixa do turno do PC (Jogar, com combate): a vez, quem vem, a fita e o Próximo. */
export function TurnStrip({ lang = 'pt', onOpenActor }) {
  const table = useTable();
  const combat = table?.combat;
  const armed = useRearm(combat?.allMonstersDown ? 'end' : 'next');
  const ref = useRef(null);
  // A altura da faixa (a fita pode quebrar em 2 linhas) vai para a área Jogar como
  // --turn-strip-h: o mapa do Combate e a coluna de Testes prendem logo abaixo dela.
  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host || typeof ResizeObserver === 'undefined') return undefined;
    const fit = () => host.style.setProperty('--turn-strip-h', `${Math.ceil(el.offsetHeight)}px`);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => { ro.disconnect(); host.style.removeProperty('--turn-strip-h'); };
  }, [combat?.active]);
  if (!combat?.active) return null;
  const busy = !!table.busy;
  const marks = ribbon(combat);
  const after = afterLine(combat, lang);
  return (
    <div ref={ref} className="mesa-turn is-now turn-strip no-print" role="region" aria-label={L(lang, 'Turno do combate', 'Combat turn')}>
      <button type="button" className="turn-strip-who" onClick={() => onOpenActor?.(combat.turnId)}
        title={L(lang, 'Ver quem age', 'See who acts')}>
        <span className="mesa-turn-label">{L(lang, 'Rodada', 'Round')} {combat.round} · {L(lang, 'Vez de', 'Now')}</span>
        <span className="turn-strip-name">{combat.turnName || '—'}</span>
        <span className="turn-strip-sub">
          {combat.turnHp && <>{L(lang, 'PV', 'HP')} {combat.turnHp}</>}
          {after && <>{combat.turnHp ? ' · ' : ''}{after}</>}
        </span>
      </button>
      <ol className="turn-strip-ribbon" aria-label={L(lang, 'Ordem de iniciativa', 'Initiative order')}>
        {marks.map(m => (
          <li key={m.id} className={`turn-strip-mark is-${m.state}`}>
            <span aria-hidden="true">{m.mark}</span> {m.name}
            <span className="sr-only">{m.state === 'now' ? L(lang, ' (agora)', ' (now)') : m.state === 'acted' ? L(lang, ' (agiu)', ' (acted)')
              : m.state === 'down' ? L(lang, ' (caiu)', ' (down)') : L(lang, ' (falta)', ' (to act)')}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="mesa-btn mesa-btn-lg is-primary turn-strip-next" disabled={busy}
        onClick={() => { if (armed() && !busy) table.nextTurn(); }}
        aria-keyshortcuts="N" title={L(lang, 'Atalho: tecla N', 'Shortcut: N key')}>
        <span>{busy ? L(lang, 'Enviando…', 'Sending…') : <>{L(lang, 'Próximo turno', 'Next turn')}{' '}<span aria-hidden="true">→</span></>}</span>
      </button>
    </div>
  );
}
