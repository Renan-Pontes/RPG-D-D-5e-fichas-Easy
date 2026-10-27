// Jogar › Tela (§5.3, W5): o controle completo da Tela. Substitui o antigo
// painel de Jogar › Tela (ScreenPanel). De cima para baixo (no PC, 2 colunas):
//   1. a regra de uma frase + a prévia 16:9 desenhada pelo app (StageThumb) e
//      "▶ Ver ao vivo" (a TV de verdade num iframe, só enquanto ligado; pausa
//      sozinha em 3 min parada ou com a aba escondida);
//   2. NA TELA AGORA: uma linha por camada (Frente · Fundo · Teste, sempre as 3)
//      com ✕ Tirar (por cima do combate: ⚔ Voltar ao combate), e sempre os
//      mesmos ↶ Voltar para… · 🧹 Limpar · ◐ Escurecer/◑ Acender — nada muda de
//      lugar quando a Tela muda sozinha nem depois de um toque: as linhas e os
//      botões têm tamanho fixo (texto cortado com reticências, a linha de baixo
//      da Frente sempre reservada; o nome inteiro fica no texto da página, no
//      `title` e na prévia), o que chega troca só o texto (princípio 8);
//   3. MOSTRAR: Imagens · Cenas · Texto · Mapa (ShowPicker, o 📺 único);
//   4. ROLAGENS NA TELA (V10): as regras, explicadas por escrito — Dos jogadores
//      (Todas · Só críticos · Nenhuma), Do mestre (🔒 Só eu · 📺 Na tela: o padrão do
//      🎲, que pode trocar a cada rolagem) e Dos monstros (📺 Na tela · 🔒 Só eu: o
//      padrão do "📺 vai à Tela" dos ataques e salvaguardas, sem o bônus) —, o que a
//      Tela mostra no combate (☑ ordem de iniciativa · ☑ PV do grupo) e as últimas 5;
//   5. LIGAR A TELA: link, Copiar (marca o passo "tv" dos primeiros passos),
//      Abrir na TV ↗, Gerar novo link (confirma).
// Não faz polling: o palco vem do GET da campanha (poll da casca) e da resposta
// de cada toque (useStage); o teste mostrado vem do selo de Testes da área Jogar;
// as últimas 5 rolagens só são buscadas quando o pulso diz que algo mudou.
import { useCallback, useEffect, useRef, useState } from 'react';
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
  rotateScreenToken, sendToStage, showCheckOnStage, stageBack, stageBg, stageClear, stageDark, stagePrefs, stageUndo,
} from '../stage/stage-api.js';
import { writeTarget } from '../dice/dice-table.js';
import { TableRollRow } from './RollRows.jsx';
import { useOnRev, useTable } from './table-store.js';
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
  // Nada a limpar: nem frente (na tela, esperando, atrás da escura ou ocultada depois) nem teste.
  const clean = !now.front && !now.held && !now.waiting && !now.gone && !shownCheck;
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
    : line.over ? `⚔ ${L(lang, 'Voltar ao combate', 'Back to combat')}` : `✕ ${L(lang, 'Tirar', 'Remove')}`);

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
            <div key={line.layer} className={`mesa-row stage-line is-${line.layer} ${line.empty ? 'is-empty' : ''}`} role="listitem"
              title={[line.text, line.sub].filter(Boolean).join(' · ')}>
              <span className="stage-line-layer">{line.title}</span>
              <span className="stage-line-text">{line.text}</span>
              {line.layer === 'front' && <span className="stage-line-sub">{line.sub || '\u00a0'}</span>}
              {line.remove && (
                <button type="button" className="mesa-btn stage-line-x" disabled={busy} onClick={() => removeLine(line)}
                  aria-label={`${removeLabel(line)}: ${line.title}`}><span className="stage-clamp">{removeLabel(line)}</span></button>
              )}
            </div>
          ))}
        </div>
        {/* Sempre os mesmos 3 botões, no mesmo lugar e da mesma altura (o rótulo diz o que fazem agora). */}
        <div className="stage-ctl">
          <button type="button" className="mesa-btn stage-ctl-btn is-undo" disabled={busy || !undo} title={undo || undefined}
            onClick={() => act(() => stageUndo(cid), { done: L(lang, 'Desfeito ✓', 'Undone ✓') })}>
            <span className="stage-clamp is-one">{undo || L(lang, '↶ Nada para desfazer', '↶ Nothing to undo')}</span>
          </button>
          <button type="button" className="mesa-btn stage-ctl-btn" disabled={busy || clean}
            onClick={() => act(() => stageClear(cid), { done: L(lang, 'Tela limpa ✓', 'Screen cleared ✓'), name: L(lang, 'só o fundo', 'background only') })}>
            <span className="stage-clamp">🧹 {clean ? L(lang, 'Limpar: já está limpa', 'Clear: already clear') : L(lang, 'Limpar a tela', 'Clear screen')}</span>
          </button>
          {now.mode === 'dark' ? (
            <button type="button" className="mesa-btn is-primary stage-ctl-btn" disabled={busy}
              onClick={() => act(() => stageDark(cid, false), { done: L(lang, 'Tela acesa ✓', 'Screen lit ✓') })}><span className="stage-clamp">◑ {L(lang, 'Acender', 'Light up')}</span></button>
          ) : (
            <button type="button" className="mesa-btn stage-ctl-btn" disabled={busy}
              onClick={() => act(() => stageDark(cid, true), { done: L(lang, 'Tela escurecida ✓', 'Screen blacked out ✓') })}><span className="stage-clamp">◐ {L(lang, 'Escurecer', 'Black out')}</span></button>
          )}
        </div>
      </section>

      <section className="mesa-panel stage-show-box" aria-labelledby="stage-show-h">
        <MesaTitle id="stage-show-h">{L(lang, 'Mostrar', 'Show')}</MesaTitle>
        <ShowPicker campaign={campaign} stage={stage} lang={lang} onChange={onChange} />
      </section>

      <RollRules campaign={campaign} stage={stage} lang={lang} onChange={onChange} />

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

const RULES = [
  ['players', (lang) => L(lang, 'Dos jogadores', 'Players'), [
    ['all', (lang) => L(lang, 'Todas', 'All')], ['crits', (lang) => L(lang, 'Só críticos', 'Crits only')], ['off', (lang) => L(lang, 'Nenhuma', 'None')]],
  (v, lang) => ({
    all: L(lang, 'Toda rolagem do rolador da Mesa vai à Tela. Dos testes, só o 20 e o 1 naturais dos testes da mesa (na Tela ou pedidos a todos, sem 🔒 CD secreta).',
      'Every roll from the table roller goes on screen. From checks, only natural 20s and 1s of table checks (on screen or asked of everyone, without a 🔒 secret DC).'),
    crits: L(lang, 'Só 20 e 1 naturais no d20 vão à Tela: do rolador da Mesa e dos testes da mesa (na Tela ou pedidos a todos, sem 🔒 CD secreta). Teste para um jogador só não aparece.',
      'Only natural 20s and 1s on the d20 go on screen: from the table roller and from table checks (on screen or asked of everyone, without a 🔒 secret DC). A check for a single player never shows.'),
    off: L(lang, 'Nada dos jogadores vai à Tela (os pedidos que você mostrar continuam indo).', "Nothing from the players goes on screen (the requests you show still do)."),
  })[v]],
  ['dm', (lang) => L(lang, 'Do mestre', 'GM'), [
    ['secret', (lang) => L(lang, '🔒 Só eu', '🔒 Only me')], ['shown', (lang) => L(lang, '📺 Na tela', '📺 On screen')]],
  (v, lang) => (v === 'shown'
    ? L(lang, 'O seu 🎲 começa em “📺 Na tela”: a TV mostra o dado com “Mestre”. Dá para trocar a cada rolagem.', 'Your 🎲 starts on “📺 On screen”: the TV shows the die as “GM”. You can switch on each roll.')
    : L(lang, 'O seu 🎲 começa em “🔒 Só eu”: só você vê. Dá para trocar a cada rolagem.', 'Your 🎲 starts on “🔒 Only me”: only you see it. You can switch on each roll.'))],
  ['monsters', (lang) => L(lang, 'Dos monstros', 'Monsters'), [
    ['shown', (lang) => L(lang, '📺 Na tela', '📺 On screen')], ['secret', (lang) => L(lang, '🔒 Só eu', '🔒 Only me')]],
  (v, lang) => (v === 'shown'
    ? L(lang, 'Ataques e salvaguardas aplicados vão à Tela, sem o bônus do monstro.', 'Applied attacks and saves go on screen, without the monster’s bonus.')
    : L(lang, 'Ataques e salvaguardas ficam com você (o cartão deixa mandar um por um).', 'Attacks and saves stay with you (the card lets you send one by one).'))],
];

/**
 * Rolagens na Tela (§5.3 item 4) e o que a Tela mostra no combate (item 5): as regras
 * gravadas no palco (`stage.prefs`, POST /stage {op:'prefs'}) e as últimas 5 rolagens
 * de mesa (📺 ou 🔒), buscadas só quando o pulso muda.
 */
function RollRules({ campaign, stage, lang, onChange }) {
  const prefs = stage?.prefs || {};
  const cid = campaign.id;
  const [busy, setBusy] = useState(false);
  const [rolls, setRolls] = useState(null);
  const table = useTable();
  const load = useCallback(async () => {
    try { const r = await api.listTableRolls(cid); setRolls((r.rolls || []).slice(0, 5)); } catch { /* fica o que estava */ }
  }, [cid]);
  useEffect(() => { load(); }, [load]);
  // o checksRev muda a cada rolagem (COUNT e MAX(id)): sem a busca de segurança de 60 s
  useOnRev(table?.pulse?.checksRev, load, { table, fallbackMs: 15_000, safetyMs: Infinity, initial: false });
  const set = async (key, value) => {
    if (busy || prefs[key] === value) return;
    setBusy(true);
    try {
      await stagePrefs(cid, { [key]: value });
      // o 🎲 do mestre passa a começar pela regra nova neste aparelho
      if (key === 'dm') writeTarget({ campaignId: cid }, value);
      flash(L(lang, 'Regra salva ✓', 'Rule saved ✓'));
      onChange?.();
    } catch {
      flash(L(lang, 'Não salvou · confira a conexão', 'Not saved · check the connection'), { error: true });
    } finally { setBusy(false); }
  };
  return (
    <section className="mesa-panel stage-rolls-box" aria-labelledby="stage-rolls-h">
      <MesaTitle id="stage-rolls-h">{L(lang, 'Rolagens na Tela', 'Rolls on screen')}</MesaTitle>
      <p className="mesa-hint">{L(lang,
        'As rolagens aparecem na TV em fila: as importantes no centro, o resto num cantinho que some sozinho.',
        'Rolls show up on the TV in a queue: the important ones in the middle, the rest in a corner that fades by itself.')}</p>
      {RULES.map(([key, title, options, explain]) => (
        <div key={key} className="stage-rule-row">
          <span className="stage-rule-title" id={`stage-rule-${key}`}>{title(lang)}</span>
          <div className="mesa-seg stage-rule-seg" role="radiogroup" aria-labelledby={`stage-rule-${key}`}>
            {options.map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={prefs[key] === v} disabled={busy}
                className={`mesa-seg-btn ${prefs[key] === v ? 'active' : ''}`} onClick={() => set(key, v)}>{label(lang)}</button>
            ))}
          </div>
          <p className="mesa-hint stage-rule-why">{explain(prefs[key], lang)}</p>
        </div>
      ))}
      <div className="stage-rule-row">
        <span className="stage-rule-title">{L(lang, 'Durante o combate a Tela mostra', 'During combat the screen shows')}</span>
        <div className="stage-rule-checks">
          {[['initiative', L(lang, 'Ordem de iniciativa', 'Initiative order')], ['party', L(lang, 'PV do grupo', "Party's HP")]].map(([k, label]) => (
            <label key={k} className="mesa-chip stage-rule-check">
              <input type="checkbox" checked={prefs[k] !== false} disabled={busy} onChange={e => set(k, e.target.checked)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <p className="mesa-hint stage-rule-why">{L(lang, 'Os monstros aparecem sempre só com a faixa de saúde.', 'Monsters always show only a health band.')}</p>
      </div>
      <div className="stage-rule-row">
        <span className="stage-rule-title" id="stage-rolls-last">{L(lang, 'Últimas 5', 'Last 5')}</span>
        {/* Altura fixa com rolagem própria: a rolagem que chega não empurra "Ligar a Tela" (princípio 8) */}
        <div className="rolls-panel stage-rolls-list" role="region" aria-labelledby="stage-rolls-last" tabIndex={0}>
          {rolls === null && <p className="muted small">{L(lang, 'Carregando…', 'Loading…')}</p>}
          {rolls?.length === 0 && <p className="muted small">{L(lang, 'Nenhuma rolagem de mesa ainda.', 'No table rolls yet.')}</p>}
          {(rolls || []).map(r => <TableRollRow key={r.id} r={r} lang={lang} compact />)}
        </div>
      </div>
    </section>
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
