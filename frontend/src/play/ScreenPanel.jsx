// Jogar › Telão: o que está na TV agora e o que mostrar (cartão do Mundo,
// "Anteriormente em…", cena ou nada), mais o link do telão.
// Mostrar no telão é sempre um toque do mestre; cartão oculto não vai à TV.
import { useCallback, useMemo, useState } from 'react';
import { API_BASE } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { usePolling } from '../api/polling.js';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import EntryCard from '../world/EntryCard.jsx';
import { listWorld, showEntryOnScreen, worldErrorText } from '../world/world-api.js';
import { defaultArt } from '../world/world-model.js';
import RecapCard from './RecapCard.jsx';
import { getAdventure, getScreen, listAdventures, rotateScreenToken, setScreenCard } from './play-api.js';
import { activeScene } from './scene-model.js';
import { cardKind, screenNow } from './screen-now.js';
import { flash } from './flash.js';
import './play-styles.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);
const abs = (url) => (!url ? null : /^(https?:|data:|blob:)/.test(url) ? url : `${API_BASE || ''}${url}`);

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* sem permissão */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

export default function ScreenPanel({ campaign, lang = 'pt', onChange }) {
  const [screen, setScreen] = useState(null);
  const [mode, setMode] = useState('entry');
  const [entries, setEntries] = useState(null);
  const [filter, setFilter] = useState('');
  const [scene, setScene] = useState(null);
  const [busy, setBusy] = useState(false);
  const token = campaign.screenToken;
  const url = token ? `${window.location.origin}/tv/${token}` : '';

  const load = useCallback(async () => {
    if (!token) return;
    try { setScreen(await getScreen(token)); } catch { /* polling */ }
  }, [token]);
  usePolling(load, 5000, [token]);

  const loadWorld = useCallback(async () => {
    try { const r = await listWorld(campaign.id); setEntries(r.entries || []); } catch { setEntries([]); }
    try {
      const r = await listAdventures(campaign.id);
      const adv = activeScene(r.adventures || []);
      if (adv) {
        const full = (await getAdventure(campaign.id, adv.id)).adventure;
        const node = (full?.data?.nodes || []).find(n => n.id === full.play?.current);
        setScene(node ? { adventure: full, node } : null);
      } else setScene(null);
    } catch { setScene(null); }
  }, [campaign.id]);
  usePolling(loadWorld, 15000, [campaign.id]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (entries || []).filter(e => e.visibility !== 'hidden' && (!q || e.name.toLowerCase().includes(q)));
  }, [entries, filter]);
  const hiddenCount = (entries || []).filter(e => e.visibility === 'hidden').length;

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); if (ok) flash(ok); await load(); onChange?.(); }
    catch (e) { flash(worldErrorText(e, lang, errorMessage), { error: true }); }
    finally { setBusy(false); }
  };

  const showEntry = (e) => run(() => showEntryOnScreen(campaign.id, e.id), L(lang, `No telão: ${e.name}`, `On screen: ${e.name}`));
  const clear = () => run(() => setScreenCard(campaign.id, null), L(lang, 'Telão em repouso (capa).', 'Screen at rest (cover).'));
  const showScene = () => scene && run(() => setScreenCard(campaign.id, { type: 'scene', adventureId: scene.adventure.id, nodeId: scene.node.id }), L(lang, `No telão: ${scene.node.name}`, `On screen: ${scene.node.name}`));

  const copy = async () => {
    const ok = await copyText(url);
    flash(ok ? L(lang, 'Link do telão copiado. Abra na TV ou no tablet.', 'Screen link copied. Open it on the TV or tablet.')
      : L(lang, 'Não consegui copiar. Selecione o link e copie à mão.', 'Could not copy. Select the link and copy it by hand.'), { error: !ok });
  };
  const rotate = async () => {
    const yes = await confirmDialog({
      lang, danger: true, confirmLabel: L(lang, 'Gerar novo link', 'New link'),
      message: L(lang, 'Gerar um novo link? O antigo deixa de funcionar na TV.', 'Generate a new link? The old one stops working on the TV.'),
    });
    if (!yes) return;
    run(() => rotateScreenToken(campaign.id), L(lang, 'Novo link gerado.', 'New link generated.'));
  };

  const card = screen?.card;
  // Cartão sem imagem própria: a mesma arte padrão do tipo que o Mundo usa.
  const cardImg = card ? (abs(card.imageUrl) || (card.type === 'entry' ? defaultArt({ kind: card.kind, id: card.entryId }) : null)) : null;
  const cover = abs(screen?.campaign?.coverUrl);
  // Mesma regra do /tv e do 📺 do cabeçalho (screen-now.js).
  const now = screenNow({ combat: screen?.combat, card });
  const combatOn = now.mode === 'combat';

  return (
    <div className="scr">
      <section className="scr-tv-wrap" aria-labelledby="scr-h">
        <div className="scr-tv-head">
          <h3 id="scr-h">📺 {L(lang, 'Na TV agora', 'On the TV now')}</h3>
          {card && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={clear}>{L(lang, 'Tirar do telão', 'Clear screen')}</button>}
        </div>
        <div className="scr-tv" style={campaign.accent ? { '--scr-accent': campaign.accent } : undefined}>
          {cover && <img className="scr-tv-bg" src={cover} alt="" />}
          <div className="scr-tv-shade" />
          {combatOn ? (
            <div className="scr-tv-body">
              <span className="scr-tv-kind">⚔ {L(lang, 'Combate', 'Combat')}</span>
              <strong className="scr-tv-title">{L(lang, 'Rodada', 'Round')} {screen.combat.round}</strong>
              <span className="scr-tv-text">{L(lang, 'O telão mostra o mapa e a ordem de iniciativa.', 'The screen shows the map and initiative order.')}</span>
              {now.overlay && (
                <span className="scr-tv-overlay">
                  {L(lang, 'Junto, ao lado:', 'Alongside:')} <strong>{cardKind(now.overlay, lang) ? `${cardKind(now.overlay, lang)} · ` : ''}{now.overlay.title}</strong>
                </span>
              )}
              {now.waiting && (
                <span className="scr-tv-overlay is-waiting">
                  {L(lang, 'Aparece quando o combate acabar:', 'Shows when combat ends:')} <strong>{now.waiting.title}</strong>
                </span>
              )}
            </div>
          ) : card ? (
            <div className={`scr-tv-body ${cardImg ? 'has-img' : ''}`}>
              {cardImg && <img className="scr-tv-img" src={cardImg} alt="" />}
              <div className="scr-tv-copy">
                <span className="scr-tv-kind">{lang === 'en' ? (card.kindLabelEn || card.kindLabel) : card.kindLabel}</span>
                <strong className="scr-tv-title">{card.title}</strong>
                {card.text && <span className="scr-tv-text">{card.text}</span>}
              </div>
            </div>
          ) : (
            <div className="scr-tv-body is-rest">
              <strong className="scr-tv-title">{screen?.campaign?.name || campaign.name}</strong>
              {(screen?.campaign?.tagline || campaign.tagline) && <span className="scr-tv-text">{screen?.campaign?.tagline || campaign.tagline}</span>}
              {screen?.state?.scene && <span className="scr-tv-kind">{L(lang, 'Cena', 'Scene')}: {screen.state.scene}</span>}
            </div>
          )}
        </div>
        <div className="scr-link">
          <input className="input" readOnly value={url} onFocus={e => e.target.select()} aria-label={L(lang, 'Link do telão', 'Screen link')} />
          <button type="button" className="btn btn-primary btn-sm" onClick={copy}>{L(lang, 'Copiar link', 'Copy link')}</button>
          <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">{L(lang, 'Abrir', 'Open')} ↗</a>
          <button type="button" className="btn btn-ghost btn-sm" onClick={rotate}>{L(lang, 'Gerar novo link', 'New link')}</button>
        </div>
      </section>

      <section className="info-box scr-show" aria-labelledby="scr-show-h">
        <h3 id="scr-show-h" style={{ marginTop: 0 }}>{L(lang, 'Mostrar no telão', 'Show on screen')}</h3>
        <div className="gc-chips" role="tablist" aria-label={L(lang, 'O que mostrar', 'What to show')}>
          {[['entry', L(lang, 'Cartão do Mundo', 'World card')], ['recap', L(lang, 'Anteriormente em…', 'Previously on…')],
            ['scene', L(lang, 'Cena', 'Scene')], ['none', L(lang, 'Nada (capa)', 'Nothing (cover)')]].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={mode === k} className={`gc-chip ${mode === k ? 'active' : ''}`} onClick={() => setMode(k)}>{label}</button>
          ))}
        </div>

        {mode === 'entry' && (
          <div className="scr-pane">
            <input className="input" value={filter} onChange={e => setFilter(e.target.value)} placeholder={L(lang, 'Procurar cartão…', 'Find a card…')}
              aria-label={L(lang, 'Procurar cartão', 'Find a card')} />
            {entries === null && <p className="muted small">{L(lang, 'Carregando…', 'Loading…')}</p>}
            {entries && shown.length === 0 && (
              <p className="muted small">
                {L(lang, 'Nenhum cartão revelado ainda. Só cartões revelados (ou conhecidos de nome) podem ir ao telão.', 'No revealed card yet. Only revealed (or known-by-name) cards can go on screen.')}
                {hiddenCount > 0 && ` ${L(lang, `${hiddenCount} oculto(s) no Mundo.`, `${hiddenCount} hidden in the World.`)}`}
              </p>
            )}
            <div className="ins-grid">
              {shown.slice(0, 40).map(e => (
                <EntryCard key={e.id} entry={e} mode="dm" lang={lang} compact onOpen={showEntry} onShow={busy ? undefined : showEntry} />
              ))}
            </div>
          </div>
        )}

        {mode === 'recap' && (
          <div className="scr-pane">
            <RecapCard campaign={campaign} lang={lang} onShown={() => { load(); onChange?.(); }} />
          </div>
        )}

        {mode === 'scene' && (
          <div className="scr-pane">
            {scene ? (
              <>
                <p style={{ margin: 0 }}><strong>{scene.node.name}</strong> <span className="muted small">· {scene.adventure.name}</span></p>
                <div><button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={showScene}>📺 {L(lang, 'Mostrar a cena', 'Show the scene')}</button></div>
              </>
            ) : (
              <p className="muted small">{L(lang, 'Nenhuma sala em jogo. Em Preparar › Aventuras, use "Conduzir" e marque onde o grupo está.', 'No room in play. In Prepare › Adventures, use "Run" and mark where the party is.')}</p>
            )}
          </div>
        )}

        {mode === 'none' && (
          <div className="scr-pane">
            <p className="muted small" style={{ margin: 0 }}>{L(lang, 'O telão volta para a capa da campanha, com o nome e a frase.', 'The screen goes back to the campaign cover, with name and tagline.')}</p>
            <div><button type="button" className="btn btn-primary btn-sm" disabled={busy || !card} onClick={clear}>{L(lang, 'Deixar só a capa', 'Show only the cover')}</button></div>
          </div>
        )}
      </section>
    </div>
  );
}
