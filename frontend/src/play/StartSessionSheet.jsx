// A folha "COMEÇAR A SESSÃO N" (V7, especificação §4.3) — aberta pelo ▶ Começar da capa, pelo
// cartão J1 da Agora, por Mais › Sessão e pelo "▶ Começar a Sessão N" do Plano:
//   Onde começa?  (•) a 1ª cena não jogada · ( ) Continuar de onde paramos: <cena> ·
//                 ( ) Outra… [nome] · ( ) Ainda não sei
//   ☑ Mostrar "Anteriormente em…" na Tela  (o resumo salvo da sessão anterior — só se existe)
//   Tela: ● TV conectada / ○ Nenhuma TV aberta [Copiar link] [Abrir na TV ↗]
//   [▶ Começar]  48 px
// Um toque em ▶ Começar: POST /diary/sessions (cria a sessão e liga "ao vivo"; a sessão nova
// nasce com o `shown` zerado). Com o "Anteriormente em…" marcado, a frente da Tela vira o
// resumo e a cena escolhida fica como a próxima (o J4 começa por ela); desmarcado (ou sem
// resumo), a cena já COMEÇA (▶ Começar esta cena). A cena da sessão anterior não sobra.
// Nada mais vai à Tela sem toque. A lógica das opções mora em now-model.js (startChoices).
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { normalizePlan } from '../prep/next-session.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import { screenLink } from '../shell/shell-logic.js';
import { tvLine } from '../stage/table-bar-model.js';
import { sendToStage, showOnStage } from '../stage/stage-api.js';
import { getSessionPlan } from '../world/world-api.js';
import { startChoices, writeStartScene } from './now-model.js';
import { addSceneAndBegin, beginScene, clearSceneNow, loadRecap } from './scene-actions.js';
// os estilos da folha (.sss) moram com os da Agora; aberta de fora de Jogar, vêm daqui
import './now.css';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

/**
 * plan    o plano normalizado (a Agora já tem; sem ele a folha lê 1 vez)
 * recap   {has, title, text} do resumo salvo da sessão anterior (sem ele, a folha lê 1 vez)
 * tvLive  TVs conectadas agora (do pulso)
 * onStarted() depois de tudo (a casca recarrega e vai para Jogar › Agora)
 */
export default function StartSessionSheet({ campaign, lang = 'pt', plan: planProp, recap: recapProp, tvLive = 0, onClose, onStarted, onTvLink }) {
  const st = campaign.state || {};
  const n = (parseInt(st.session, 10) || 0) + 1;
  const [plan, setPlan] = useState(planProp || null);
  const [recap, setRecap] = useState(recapProp === undefined ? null : recapProp);
  useEffect(() => {
    let alive = true;
    if (!planProp) getSessionPlan(campaign.id).then(p => alive && setPlan(normalizePlan(p))).catch(() => alive && setPlan(normalizePlan(null)));
    if (recapProp === undefined && n > 1) loadRecap(campaign.id, n - 1).then(r => alive && setRecap(r)).catch(() => alive && setRecap({ has: false }));
    return () => { alive = false; };
  }, [campaign.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const choices = useMemo(() => startChoices(plan, st, lang), [plan, st, lang]);
  const [pick, setPick] = useState(null);
  const [other, setOther] = useState('');
  const [withRecap, setWithRecap] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const current = choices.some(c => c.id === pick) ? pick : (choices[0]?.id || 'unsure');
  const hasRecap = !!recap?.has && n > 1;
  const url = screenLink(window.location.origin, campaign.screenToken);
  const chosen = choices.find(c => c.id === current);

  const start = async () => {
    if (current === 'other' && !other.trim()) { setError(L(lang, 'Escreva o nome da cena.', 'Write the scene name.')); return; }
    setBusy(true); setError('');
    let state;
    try {
      state = (await api.startDiarySession(campaign.id, {}))?.state || st;
    } catch (e) { setError(errorMessage(e, lang)); setBusy(false); return; }
    // a campanha já com a sessão nova (o ▶ Começar esta cena compara a cena de antes)
    const fresh = { ...campaign, state };
    const scene = chosen?.sceneId ? (plan?.scenes || []).find(x => x.id === chosen.sceneId) : null;
    try {
      if (hasRecap && withRecap) {
        // o "Anteriormente em…" vai primeiro; a cena escolhida fica como a próxima (J4)
        writeStartScene(campaign.id, scene?.id || null);
        await sendToStage(campaign.id, () => showOnStage(campaign.id, { kind: 'recap', title: recap.title || '', text: recap.text || '' }),
          { lang, name: L(lang, 'Anteriormente em…', 'Previously on…') });
        if (!(current === 'continue' && !scene)) await clearSceneNow(fresh);
      } else {
        writeStartScene(campaign.id, null);
        if (scene) await beginScene(fresh, scene, { lang });
        else if (current === 'other') await addSceneAndBegin(fresh, plan, other.trim(), { lang });
        else if (current === 'unsure') await clearSceneNow(fresh);
        // "Continuar de onde paramos" sem a cena no plano: o nome de antes fica
      }
    } catch (e) {
      setError(errorMessage(e, lang));
    }
    setBusy(false);
    await onStarted?.();
  };
  const copy = async () => {
    try { await navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* sem clipboard */ }
    onTvLink?.();
  };

  return (
    <MesaSheet title={L(lang, `Começar a Sessão ${n}`, `Start session ${n}`)} icon="▶" size="auto" width="md" lang={lang}
      onClose={onClose} className="sss"
      footer={(
        <div className="mesa-actions is-stack">
          {error && <p className="sss-error" role="alert">{error}</p>}
          <button type="button" className="mesa-btn mesa-btn-lg is-primary sss-go" disabled={busy || !plan} onClick={start}>
            {busy ? '…' : <>▶ {L(lang, 'Começar', 'Start')}</>}
          </button>
        </div>
      )}>
      <fieldset className="sss-where">
        <legend className="mesa-eyebrow">{L(lang, 'Onde começa?', 'Where does it start?')}</legend>
        {choices.map(c => (
          <label key={c.id} className={`sss-opt ${current === c.id ? 'is-on' : ''}`}>
            <input type="radio" name="sss-where" checked={current === c.id} onChange={() => setPick(c.id)} />
            <span className="sss-opt-text">
              <span>{c.label}</span>
              {c.sub && <span className="sss-sub">{c.sub}</span>}
            </span>
          </label>
        ))}
        {current === 'other' && (
          <input className="input sss-other" autoFocus value={other} maxLength={120} onChange={e => setOther(e.target.value)}
            placeholder={L(lang, 'Nome da cena (ex.: Ponte velha)', 'Scene name (e.g. Old bridge)')} aria-label={L(lang, 'Nome da cena', 'Scene name')} />
        )}
      </fieldset>
      {hasRecap && (
        <label className="sss-opt sss-recap">
          <input type="checkbox" checked={withRecap} onChange={e => setWithRecap(e.target.checked)} />
          <span className="sss-opt-text">
            <span>{L(lang, 'Mostrar “Anteriormente em…” na Tela', 'Show “Previously on…” on screen')}</span>
            <span className="sss-sub">{L(lang, `O resumo salvo da Sessão ${n - 1}. A cena começa depois, com um toque.`, `The saved session ${n - 1} recap. The scene starts afterwards, with one tap.`)}</span>
          </span>
        </label>
      )}
      <div className="sss-tv">
        <span className={`sss-tv-state ${tvLive > 0 ? 'is-on' : ''}`}>{L(lang, 'Tela', 'Screen')}: {tvLine(tvLive, lang)}</span>
        {tvLive === 0 && (
          <span className="sss-tv-acts">
            <button type="button" className="mesa-btn" onClick={copy}>{copied ? L(lang, 'Copiado ✓', 'Copied ✓') : L(lang, 'Copiar link', 'Copy link')}</button>
            <a className="mesa-btn" href={url} target="_blank" rel="noreferrer" onClick={() => onTvLink?.()}>{L(lang, 'Abrir na TV', 'Open on TV')} ↗</a>
          </span>
        )}
      </div>
    </MesaSheet>
  );
}
