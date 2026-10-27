// Folha "Tela ao vivo" (V4, §5.8 · W5): o destino único de quem toca na barra da
// mesa (celular) ou na janela da Tela (PC). De cima para baixo:
//   1. a TV de verdade num iframe (/tv/<token>?preview=1, que não conta como "TV
//      conectada"), em 16:9, sem toque nem foco; só existe com a folha aberta e
//      pausa sozinha depois de 3 min sem toque ou com a aba escondida;
//   2. "● TV conectada (1)" ou "○ Nenhuma TV detectada · [Copiar link] [Abrir na TV ↗]";
//      sem conexão: "⟳ Sem conexão há N s", o ponto cinza e "(última vez visto)";
//   3. a regra de uma frase e NA TELA AGORA (Frente · Fundo · Teste, com ✕) +
//      [↶ Desfazer] [🧹 Limpar] [⚔ Voltar ao combate];
//   4. com combate: [Próximo turno →] (48, largura toda) e "Vez de X · [Ações]";
//   5. [📺 Mostrar…] [🎲 Rolar] [◐ Escurecer / ◑ Acender];
//   6. [Abrir o controle completo →] · Barra da mesa: Sempre · Só ao vivo · Nunca ·
//      [Esconder a barra até a próxima sessão].
// Nenhum polling próprio (o palco vem do GET da campanha e da resposta de cada
// toque; o resto, da loja da mesa). Só o iframe pede à TV, ~30 pedidos/min,
// enquanto a folha está aberta.
import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import MesaSheet from '../shell/MesaSheet.jsx';
import { screenLink } from '../shell/shell-logic.js';
import { copyText } from '../group/InviteCard.jsx';
import { flash } from '../play/flash.js';
import { useTable } from '../play/table-store.js';
import useStage from './useStage.js';
import { L, ruleText, stageLines, stageNow, undoLabel } from './stage-now.js';
import { sendToStage, showCheckOnStage, stageBack, stageBg, stageClear, stageDark, stageUndo } from './stage-api.js';
import { BAR_PREFS, afterLine, offlineLine, seenSuffix, tvLine, tvState, turnLine } from './table-bar-model.js';
import { openDice } from './TableBar.jsx';
import './stage.css';

const ShowSheet = lazy(() => import('./ShowSheet.jsx'));
export const LIVE_IDLE_MS = 3 * 60_000;

/**
 * A TV de verdade num iframe (a TV desenha em 1280×720; a caixa reduz na
 * proporção). Desmonta sozinha depois de 3 min sem toque ou com a aba
 * escondida ("Pausado · toque para ver ao vivo").
 */
export function LiveTv({ token, lang = 'pt', className = '' }) {
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);
  const box = useRef(null);
  useEffect(() => {
    if (paused) return undefined;
    const arm = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setPaused(true), LIVE_IDLE_MS); };
    arm();
    const onVis = () => { if (document.hidden) setPaused(true); };
    window.addEventListener('pointerdown', arm, { passive: true });
    window.addEventListener('keydown', arm);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [paused]);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const fit = () => el.style.setProperty('--stage-live-k', String(el.clientWidth / 1280));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [paused]);
  if (!token) return null;
  if (paused) {
    return (
      <button type="button" className={`stage-live is-paused ${className}`.trim()} onClick={() => setPaused(false)}>
        <span>⏸ {L(lang, 'Pausado · toque para ver ao vivo', 'Paused · tap to watch live')}</span>
      </button>
    );
  }
  return (
    <div className={`stage-live ${className}`.trim()} ref={box}>
      <iframe className="stage-live-frame" src={`/tv/${token}?preview=1`} title={L(lang, 'Tela ao vivo', 'Live screen')}
        tabIndex={-1} aria-hidden="true" />
    </div>
  );
}

/** Barra da mesa: Sempre · Só ao vivo · Nunca (e o "Esconder até a próxima sessão"). */
export function BarPrefs({ prefs, onPrefs, session, lang = 'pt', desk = false }) {
  const labels = { always: L(lang, 'Sempre', 'Always'), live: L(lang, 'Só ao vivo', 'Only when live'), never: L(lang, 'Nunca', 'Never') };
  const hidden = desk ? prefs.winSession != null && String(prefs.winSession) === String(session ?? '')
    : prefs.hideSession != null && String(prefs.hideSession) === String(session ?? '');
  const key = desk ? 'winSession' : 'hideSession';
  const hid = useId();
  return (
    <div className="live-prefs">
      <p className="mesa-eyebrow" id={hid}>{desk ? L(lang, 'Janela da Tela', 'Screen window') : L(lang, 'Barra da mesa', 'Table bar')}</p>
      <div className="mesa-seg live-prefs-seg" role="radiogroup" aria-labelledby={hid}>
        {BAR_PREFS.map(p => (
          <button key={p} type="button" role="radio" aria-checked={prefs.pref === p}
            className={`mesa-seg-btn ${prefs.pref === p ? 'active' : ''}`} onClick={() => onPrefs({ ...prefs, pref: p })}>
            {labels[p]}
          </button>
        ))}
      </div>
      <p className="mesa-hint">{L(lang,
        '“Só ao vivo”: aparece com a sessão ao vivo, com combate ou com uma TV conectada. Em combate, dentro de Jogar, aparece sempre.',
        '“Only when live”: shows with a live session, a combat or a connected TV. In combat, inside Play, it always shows.')}</p>
      <button type="button" className="mesa-btn live-hide" aria-pressed={hidden}
        onClick={() => onPrefs({ ...prefs, [key]: hidden ? null : String(session ?? '') })}>
        {hidden ? L(lang, 'Mostrar de novo', 'Show it again')
          : desk ? L(lang, 'Esconder a janela até a próxima sessão', 'Hide the window until next session')
            : L(lang, 'Esconder a barra até a próxima sessão', 'Hide the bar until next session')}
      </button>
    </div>
  );
}

export default function LiveScreenSheet({ campaign, lang = 'pt', onClose, onFullControl, onActor, onTvLink, desk = false }) {
  const table = useTable();
  const stage = useStage(campaign);
  const combat = table?.combat || null;
  const combatNow = combat ? { active: combat.active, round: combat.round } : campaign.combatNow;
  const test = table?.pulse?.screen?.test || null;
  const now = stageNow({ stage, combat: combatNow });
  const lines = stageLines({ stage, combat: combatNow, test, lang, all: true });
  const undo = undoLabel(stage, lang);
  const tvLive = table?.tvLive || 0;
  const offlineFor = table?.offlineFor || 0;
  const url = screenLink(window.location.origin, campaign.screenToken);
  const cid = campaign.id;
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const clean = !now.front && !now.held && !now.waiting && !now.gone && !test;
  // Campanha encerrada: a folha fica só para ver (nada que escreva; o servidor daria 423).
  const closed = campaign.status === 'closed';
  const session = table?.pulse?.session ?? campaign.state?.session;

  const act = async (send, opts = {}) => {
    if (busy || closed) return;
    setBusy(true);
    try { await sendToStage(cid, send, { lang, ...opts }); } finally { setBusy(false); table?.refresh(); }
  };
  const removeLine = (line) => {
    if (line.remove === 'back') return act(() => stageBack(cid), { done: L(lang, 'Tirado ✓', 'Removed ✓'), name: L(lang, 'volta para o fundo', 'back to the background') });
    if (line.remove === 'bg') return act(() => stageBg(cid, 'auto'), { done: L(lang, 'Mapa tirado ✓', 'Map removed ✓') });
    if (line.remove === 'light') return act(() => stageDark(cid, false), { done: L(lang, 'Tela acesa ✓', 'Screen lit ✓') });
    if (line.remove === 'test' && line.checkId) {
      return act(() => showCheckOnStage(line.checkId, false), { done: L(lang, 'Fora da Tela ✓', 'Off screen ✓'), undo: () => showCheckOnStage(line.checkId, true) });
    }
    return null;
  };
  const removeLabel = (line) => (line.remove === 'light' ? `◑ ${L(lang, 'Acender', 'Light up')}`
    : line.over ? `⚔ ${L(lang, 'Voltar ao combate', 'Back to combat')}` : `✕ ${L(lang, 'Tirar', 'Remove')}`);
  const copy = async () => {
    const ok = await copyText(url);
    flash(ok ? L(lang, 'Link da Tela copiado. Abra na TV ou no tablet.', 'Screen link copied. Open it on the TV or tablet.')
      : L(lang, 'Não consegui copiar. Selecione o link e copie à mão.', 'Could not copy. Select the link and copy it by hand.'), { error: !ok });
    if (ok) onTvLink?.();
  };
  const fighting = !!combat?.active;

  return (
    <MesaSheet lang={lang} size="tall" width="md" className="live-sheet" icon="📺"
      title={L(lang, 'Tela ao vivo', 'Live screen')} onClose={onClose}>
      <LiveTv token={campaign.screenToken} lang={lang} />
      {offlineFor > 0 && <p className="table-offline is-sheet" role="status">{offlineLine(offlineFor, lang)}</p>}
      <div className="live-tv-state">
        <span className={`live-tv-dot is-${tvState(tvLive, offlineFor > 0)}`} role="status">{tvLine(tvLive, lang, offlineFor > 0)}</span>
        {(tvLive === 0 || offlineFor > 0) && (
          <span className="live-tv-link">
            <button type="button" className="mesa-btn" onClick={copy}>{L(lang, 'Copiar link', 'Copy link')}</button>
            <a className="mesa-btn" href={url} target="_blank" rel="noreferrer" onClick={() => onTvLink?.()}>{L(lang, 'Abrir na TV', 'Open on TV')} ↗</a>
          </span>
        )}
      </div>

      <section className="live-now" aria-labelledby="live-now-h">
        <p className="mesa-eyebrow" id="live-now-h">{L(lang, 'Na tela agora', 'On screen now')}{seenSuffix(offlineFor > 0, lang)}</p>
        <p className="stage-rule">{ruleText(lang)}</p>
        <div className="stage-lines" role="list">
          {lines.map(line => (
            <div key={line.layer} className={`mesa-row stage-line is-${line.layer} ${line.empty ? 'is-empty' : ''}`} role="listitem"
              title={[line.text, line.sub].filter(Boolean).join(' · ')}>
              <span className="stage-line-layer">{line.title}</span>
              <span className="stage-line-text">{line.text}</span>
              {line.layer === 'front' && <span className="stage-line-sub">{line.sub || ' '}</span>}
              {line.remove && !closed && (
                <button type="button" className="mesa-btn stage-line-x" disabled={busy} onClick={() => removeLine(line)}
                  aria-label={`${removeLabel(line)}: ${line.title}`}><span className="stage-clamp">{removeLabel(line)}</span></button>
              )}
            </div>
          ))}
        </div>
        {closed ? <p className="mesa-hint stage-closed-note" role="note">{L(lang, 'Campanha encerrada: a Tela fica só para ver.', 'Campaign closed: the screen is view-only.')}</p> : (
        <div className="stage-ctl live-ctl">
          <button type="button" className="mesa-btn stage-ctl-btn is-undo" disabled={busy || !undo} title={undo || undefined}
            onClick={() => act(() => stageUndo(cid), { done: L(lang, 'Desfeito ✓', 'Undone ✓') })}>
            <span className="stage-clamp is-one">{undo || L(lang, '↶ Nada para desfazer', '↶ Nothing to undo')}</span>
          </button>
          <button type="button" className="mesa-btn stage-ctl-btn" disabled={busy || clean}
            onClick={() => act(() => stageClear(cid), { done: L(lang, 'Tela limpa ✓', 'Screen cleared ✓'), name: L(lang, 'só o fundo', 'background only') })}>
            <span className="stage-clamp">🧹 {clean ? L(lang, 'Limpar: já está limpa', 'Clear: already clear') : L(lang, 'Limpar a tela', 'Clear screen')}</span>
          </button>
          <button type="button" className="mesa-btn stage-ctl-btn" disabled={busy || !(now.mode === 'front' && now.over)}
            onClick={() => act(() => stageBack(cid), { done: L(lang, 'Combate na Tela ✓', 'Combat on screen ✓') })}>
            <span className="stage-clamp">⚔ {now.mode === 'front' && now.over ? L(lang, 'Voltar ao combate', 'Back to combat')
              : fighting ? L(lang, 'O combate já está na Tela', 'Combat is already on screen') : L(lang, 'Voltar ao combate: sem combate', 'Back to combat: no combat')}</span>
          </button>
        </div>
        )}
      </section>

      {fighting && !closed && (
        <section className="live-turn" aria-label={L(lang, 'Turno', 'Turn')}>
          <button type="button" className="mesa-btn mesa-btn-lg is-primary live-next" disabled={!!table?.busy}
            onClick={() => table?.nextTurn()} aria-keyshortcuts="N">
            {table?.busy ? L(lang, 'Enviando…', 'Sending…') : <>{L(lang, 'Próximo turno', 'Next turn')}{' '}<span aria-hidden="true">→</span></>}
          </button>
          <div className="live-turn-who">
            <span className="live-turn-text">
              <strong>{turnLine(combat, lang)}</strong>
              <span className="mesa-hint">{afterLine(combat, lang)}</span>
            </span>
            {combat.turnId && (
              <button type="button" className="mesa-btn live-actor" onClick={() => onActor?.(combat.turnId)}>
                {L(lang, 'Ações', 'Actions')} ›
              </button>
            )}
          </div>
        </section>
      )}

      <div className="live-row">
        {!closed && <button type="button" className="mesa-btn" onClick={() => setShow(true)} aria-haspopup="dialog">📺 {L(lang, 'Mostrar…', 'Show…')}</button>}
        <button type="button" className="mesa-btn" onClick={() => { onClose?.(); setTimeout(openDice, 0); }}>🎲 {L(lang, 'Rolar', 'Roll')}</button>
        {closed ? null : now.mode === 'dark' ? (
          <button type="button" className="mesa-btn is-primary" disabled={busy}
            onClick={() => act(() => stageDark(cid, false), { done: L(lang, 'Tela acesa ✓', 'Screen lit ✓') })}>◑ {L(lang, 'Acender', 'Light up')}</button>
        ) : (
          <button type="button" className="mesa-btn" disabled={busy}
            onClick={() => act(() => stageDark(cid, true), { done: L(lang, 'Tela escurecida ✓', 'Screen blacked out ✓') })}>◐ {L(lang, 'Escurecer', 'Black out')}</button>
        )}
      </div>

      <button type="button" className="mesa-btn is-quiet live-full" onClick={onFullControl}>
        {L(lang, 'Abrir o controle completo → Jogar › Tela', 'Open full control → Play › Screen')}
      </button>
      {table?.prefs && <BarPrefs prefs={table.prefs} onPrefs={table.setPrefs} session={session} lang={lang} desk={desk} />}

      {show && (
        <Suspense fallback={null}>
          <ShowSheet campaign={campaign} stage={stage} lang={lang} onClose={() => setShow(false)} onChange={() => table?.refresh()} />
        </Suspense>
      )}
    </MesaSheet>
  );
}

