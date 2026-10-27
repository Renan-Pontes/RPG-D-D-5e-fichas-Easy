// Jogar › Tela (§5.3, W5): o controle completo da Tela. Substitui o antigo
// painel de Jogar › Tela (ScreenPanel). De cima para baixo (no PC, 2 colunas):
//   1. a regra de uma frase + a prévia 16:9 desenhada pelo app (StageThumb) e
//      "▶ Ver ao vivo" (a TV de verdade num iframe, só enquanto ligado; pausa
//      sozinha em 3 min parada ou com a aba escondida);
//   2. NA TELA AGORA: uma linha por camada (Frente · Fundo · Teste, sempre as 3)
//      com ✕ Tirar (por cima do combate: ⚔ Voltar para o combate), e sempre os
//      mesmos ↶ Voltar para… · 🧹 Limpar · ◐ Escurecer/◑ Acender — nada muda de
//      lugar quando a Tela muda sozinha;
//   3. MOSTRAR: Imagens · Cenas · Texto · Mapa (ShowPicker, o 📺 único);
//   4. LIGAR A TELA: link, Copiar (marca o passo "tv" dos primeiros passos),
//      Abrir na TV ↗, Gerar novo link (confirma).
// Não faz polling: o palco vem do GET da campanha (poll da casca) e da resposta
// de cada toque (useStage); o teste mostrado vem do selo de Testes da área Jogar.
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import MesaTitle from '../shell/MesaTitle.jsx';
import { screenLink } from '../shell/shell-logic.js';
import { copyText } from '../group/InviteCard.jsx';
import StageThumb from '../stage/StageThumb.jsx';
import { ShowPicker } from '../stage/ShowSheet.jsx';
import useStage from '../stage/useStage.js';
import { L, ruleText, stageLines, stageNow, undoLabel } from '../stage/stage-now.js';
import {
  rotateScreenToken, sendToStage, showCheckOnStage, stageBack, stageBg, stageClear, stageDark, stageUndo,
} from '../stage/stage-api.js';
import { flash } from './flash.js';
import '../stage/stage.css';

const LIVE_KEY = 'forja:tv-live-preview';
const LIVE_IDLE_MS = 3 * 60_000;
const readLive = () => { try { return localStorage.getItem(LIVE_KEY) === '1'; } catch { return false; } };
const writeLive = (v) => { try { localStorage.setItem(LIVE_KEY, v ? '1' : '0'); } catch { /* ok */ } };

export default function StagePanel({ campaign, lang = 'pt', onChange, shownCheck = null }) {
  const stage = useStage(campaign);
  const combat = campaign.combatNow;
  const now = stageNow({ stage, combat });
  const lines = stageLines({ stage, combat, test: shownCheck, lang, all: true });
  const undo = undoLabel(stage, lang);
  const url = screenLink(window.location.origin, campaign.screenToken);
  const [busy, setBusy] = useState(false);
  const cid = campaign.id;

  const act = async (send, opts = {}) => {
    if (busy) return;
    setBusy(true);
    try { await sendToStage(cid, send, { lang, onDone: () => onChange?.(), ...opts }); }
    finally { setBusy(false); }
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
    : line.over ? `⚔ ${L(lang, 'Voltar para o combate', 'Back to combat')}` : `✕ ${L(lang, 'Tirar', 'Remove')}`);

  const copy = async () => {
    const ok = await copyText(url);
    flash(ok ? L(lang, 'Link da Tela copiado. Abra na TV ou no tablet.', 'Screen link copied. Open it on the TV or tablet.')
      : L(lang, 'Não consegui copiar. Selecione o link e copie à mão.', 'Could not copy. Select the link and copy it by hand.'), { error: !ok });
    if (ok && !campaign.onboarding?.tv) { try { await api.patchCampaign(cid, { onboarding: { tv: true } }); onChange?.(); } catch { /* não bloqueia */ } }
  };
  const rotate = async () => {
    const yes = await confirmDialog({
      lang, danger: true, confirmLabel: L(lang, 'Gerar novo link', 'New link'),
      message: L(lang, 'Gerar um novo link? O antigo deixa de funcionar na TV.', 'Generate a new link? The old one stops working on the TV.'),
    });
    if (!yes) return;
    try { await rotateScreenToken(cid); flash(L(lang, 'Novo link gerado.', 'New link generated.')); onChange?.(); }
    catch { flash(L(lang, 'Não consegui gerar o link novo.', 'Could not generate the new link.'), { error: true }); }
  };

  return (
    <div className="stage-panel">
      <section className="mesa-panel stage-now-box" aria-labelledby="stage-now-h">
        <MesaTitle id="stage-now-h">{L(lang, 'Na tela agora', 'On screen now')}</MesaTitle>
        <p className="stage-rule">{ruleText(lang)}</p>
        <LivePreview campaign={campaign} stage={stage} test={shownCheck} lang={lang} />
        <div className="stage-lines" role="list">
          {lines.map(line => (
            <div key={line.layer} className={`mesa-row stage-line is-${line.layer} ${line.empty ? 'is-empty' : ''}`} role="listitem">
              <span className="stage-line-layer">{line.title}</span>
              <span className="mesa-row-main">
                <span className="mesa-row-title stage-line-text">{line.text}</span>
                {line.sub && <span className="mesa-row-sub">{line.sub}</span>}
              </span>
              {line.remove && (
                <button type="button" className="mesa-btn stage-line-x" disabled={busy} onClick={() => removeLine(line)}
                  aria-label={`${removeLabel(line)}: ${line.title}`}>{removeLabel(line)}</button>
              )}
            </div>
          ))}
        </div>
        {/* Sempre os mesmos 3 botões, no mesmo lugar (o rótulo diz o que fazem agora). */}
        <div className="stage-ctl">
          <button type="button" className="mesa-btn stage-ctl-btn" disabled={busy || !undo}
            onClick={() => act(() => stageUndo(cid), { done: L(lang, 'Desfeito ✓', 'Undone ✓') })}>
            {undo || L(lang, '↶ Nada para desfazer', '↶ Nothing to undo')}
          </button>
          <button type="button" className="mesa-btn stage-ctl-btn" disabled={busy || (!now.front && !now.held && !now.waiting && !shownCheck)}
            onClick={() => act(() => stageClear(cid), { done: L(lang, 'Tela limpa ✓', 'Screen cleared ✓'), name: L(lang, 'só o fundo', 'background only') })}>
            🧹 {(!now.front && !now.held && !now.waiting && !shownCheck) ? L(lang, 'Limpar: já está limpa', 'Clear: already clear') : L(lang, 'Limpar a tela', 'Clear screen')}
          </button>
          {now.mode === 'dark' ? (
            <button type="button" className="mesa-btn is-primary stage-ctl-btn" disabled={busy}
              onClick={() => act(() => stageDark(cid, false), { done: L(lang, 'Tela acesa ✓', 'Screen lit ✓') })}>◑ {L(lang, 'Acender', 'Light up')}</button>
          ) : (
            <button type="button" className="mesa-btn stage-ctl-btn" disabled={busy}
              onClick={() => act(() => stageDark(cid, true), { done: L(lang, 'Tela escurecida ✓', 'Screen blacked out ✓') })}>◐ {L(lang, 'Escurecer', 'Black out')}</button>
          )}
        </div>
      </section>

      <section className="mesa-panel stage-show-box" aria-labelledby="stage-show-h">
        <MesaTitle id="stage-show-h">{L(lang, 'Mostrar', 'Show')}</MesaTitle>
        <ShowPicker campaign={campaign} stage={stage} lang={lang} onChange={onChange} />
      </section>

      <section className="mesa-panel stage-link-box" aria-labelledby="stage-link-h">
        <MesaTitle id="stage-link-h">{L(lang, 'Ligar a Tela', 'Connect the screen')}</MesaTitle>
        <div className="scr-link">
          <input className="input" readOnly value={url} onFocus={e => e.target.select()} aria-label={L(lang, 'Link da Tela', 'Screen link')} />
          <button type="button" className="mesa-btn is-primary" onClick={copy}>{L(lang, 'Copiar link', 'Copy link')}</button>
          <a className="mesa-btn" href={url} target="_blank" rel="noreferrer">{L(lang, 'Abrir na TV', 'Open on TV')} ↗</a>
          <button type="button" className="mesa-btn is-quiet" onClick={rotate}>{L(lang, 'Gerar novo link', 'New link')}</button>
        </div>
        <p className="mesa-hint">{L(lang, 'Abra este link no navegador da TV, do notebook ligado na TV ou de um tablet. “Gerar novo link” desliga o antigo.', 'Open this link in the browser of the TV, of a laptop connected to the TV or of a tablet. “New link” turns the old one off.')}</p>
      </section>
    </div>
  );
}

/**
 * A prévia: o resumo do app (0 pedido) ou, com "▶ Ver ao vivo", a TV de verdade
 * num iframe (+28 pedidos/min só enquanto ligado). O iframe só existe ligado e
 * desmonta sozinho depois de 3 min sem toque ou com a aba escondida.
 */
function LivePreview({ campaign, stage, test, lang }) {
  const [live, setLive] = useState(readLive);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);
  const arm = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPaused(true), LIVE_IDLE_MS);
  };
  useEffect(() => {
    if (!live || paused) return undefined;
    arm();
    const onVis = () => { if (document.hidden) setPaused(true); };
    const onTouch = () => arm();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pointerdown', onTouch, { passive: true });
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointerdown', onTouch);
    };
  }, [live, paused]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = () => { const v = !live; setLive(v); setPaused(false); writeLive(v); };
  const src = campaign.screenToken ? `/tv/${campaign.screenToken}?preview=1` : '';
  // A TV desenha em 1280×720; a caixa reduz na proporção da largura dela.
  const box = useRef(null);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const fit = () => el.style.setProperty('--stage-live-k', String(el.clientWidth / 1280));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [live, paused]);
  return (
    <div className="stage-preview">
      {live && !paused && src ? (
        <div className="stage-live" ref={box}>
          <iframe className="stage-live-frame" src={src} title={L(lang, 'Tela ao vivo', 'Live screen')}
            tabIndex={-1} aria-hidden="true" />
        </div>
      ) : live && paused ? (
        <button type="button" className="stage-live is-paused" onClick={() => setPaused(false)}>
          <span>⏸ {L(lang, 'Pausado · toque para ver ao vivo', 'Paused · tap to watch live')}</span>
        </button>
      ) : (
        <StageThumb campaign={campaign} stage={stage} test={test} lang={lang} />
      )}
      <div className="stage-preview-bar">
        <span className="mesa-hint stage-preview-note">
          {live ? L(lang, 'A TV de verdade (pausa sozinha em 3 min).', 'The real TV (pauses itself after 3 min).')
            : L(lang, 'Resumo do que a TV mostra.', 'Summary of what the TV shows.')}
        </span>
        <button type="button" className="mesa-btn stage-live-btn" onClick={toggle} aria-pressed={live}>
          {live ? `▣ ${L(lang, 'Ver o resumo', 'Show the summary')}` : `▶ ${L(lang, 'Ver ao vivo', 'Watch live')}`}
        </button>
      </div>
    </div>
  );
}
