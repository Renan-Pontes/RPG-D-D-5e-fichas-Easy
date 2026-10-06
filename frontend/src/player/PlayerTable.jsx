// Mesa do jogador (WP5): o que está acontecendo agora.
//
//   - cena: sessão, "Ao vivo", nome da cena, clima e o texto lido pelo mestre;
//   - "No telão agora": o cartão/recap que o mestre está mostrando (imagem da cena);
//   - testes que o mestre pediu (rolar no app OU digitar o dado físico);
//   - rolador de dados (sem aviso de valores pré-definidos) e "pedir ao mestre".
//
// Props: campaign (GET da campanha, visão do jogador), lang, onChange?.
import { useCallback, useEffect, useState } from 'react';
import { api, API_BASE } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import { errorMessage } from '../api/errors.js';
import { HERO_ART } from '../art.js';
import useArea from '../shell/useArea.js';
import CheckRequestCard from '../checks/CheckRequestCard.jsx';
import '../checks/checks-styles.css';
import { worldImageUrl } from '../world/world-api.js';
import { kindIcon } from '../world/world-model.js';
import { absUrl, L, paragraphs } from './player-model.js';
import './player-styles.css';

const DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

export default function PlayerTable({ campaign, lang = 'pt', onOpenWorld }) {
  const area = useArea();
  const state = campaign.state || {};
  const card = campaign.screenCard;
  const cover = absUrl(API_BASE, campaign.coverUrl) || HERO_ART;
  const me = (campaign.members || []).find(m => m.character?.data);
  const char = me?.character?.data ? { ...me.character.data, id: me.character.id } : null;
  const openWorld = (entryId) => {
    if (onOpenWorld) onOpenWorld(entryId);
    else area?.goTo?.('world', 'atlas', entryId ? { entryId } : {});
  };

  return (
    <div className="pl-table">
      <section className="pl-scene" style={{ '--pl-cover': `url("${cover}")` }}>
        <div className="pl-scene-bg" aria-hidden="true" />
        <div className="pl-scene-content">
          <div className="pl-scene-pills">
            {state.live && <span className="pl-live"><span className="pl-live-dot" aria-hidden="true" />{L(lang, 'Ao vivo', 'Live')}</span>}
            {state.session && <span className="pl-pill">{L(lang, 'Sessão', 'Session')} {state.session}</span>}
            {state.weather && <span className="pl-pill pl-pill-soft">☁ {state.weather}</span>}
          </div>
          <div className="pl-eyebrow">{campaign.name}</div>
          <h2 className="pl-scene-name">
            {state.scene || (state.live ? L(lang, 'A aventura continua…', 'The adventure goes on…') : L(lang, 'Entre uma sessão e outra', 'Between sessions'))}
          </h2>
          {!state.scene && !state.live && campaign.tagline && <p className="pl-scene-tagline">{campaign.tagline}</p>}
          {state.sceneText && (
            <blockquote className="pl-read-aloud">
              {paragraphs(state.sceneText).map((p, i) => <p key={i}>{p}</p>)}
            </blockquote>
          )}
        </div>
      </section>

      {card && <OnScreenNow card={card} lang={lang} onOpen={openWorld} />}

      <ChecksSection campaign={campaign} char={char} lang={lang} />

      <DiceSection campaign={campaign} lang={lang} />
    </div>
  );
}

/** O que o mestre está mostrando no telão agora (o celular vira uma segunda tela). */
function OnScreenNow({ card, lang, onOpen }) {
  const img = worldImageUrl(card.imageUrl);
  const [imgOk, setImgOk] = useState(true);
  const label = card.type === 'recap'
    ? L(lang, 'Anteriormente…', 'Previously…')
    : (lang === 'pt' ? card.kindLabel : card.kindLabelEn) || card.kindLabel;
  const paras = paragraphs(card.text);
  return (
    <section className={`pl-onscreen pl-onscreen-${card.type}`} aria-label={L(lang, 'No telão agora', 'On the TV now')}>
      <div className="pl-section-eyebrow">📺 {L(lang, 'No telão agora', 'On the TV now')}</div>
      <div className="pl-onscreen-card">
        {img && imgOk
          ? <img className="pl-onscreen-img" src={img} alt="" onError={() => setImgOk(false)} />
          : <div className="pl-onscreen-icon" aria-hidden="true">{card.type === 'recap' ? '📖' : card.type === 'scene' ? '🎭' : kindIcon(card.kind)}</div>}
        <div className="pl-onscreen-body">
          {label && <div className="pl-onscreen-kind">{label}</div>}
          <h3 className="pl-onscreen-title">{card.title}</h3>
          {card.partial && <div className="pl-rumor-tag">{L(lang, 'Rumores…', 'Rumors…')}</div>}
          {paras.slice(0, card.type === 'recap' ? 8 : 3).map((p, i) => <p key={i}>{p}</p>)}
          {card.type === 'entry' && card.entryId && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpen(card.entryId)}>{L(lang, 'Ver no Mundo', 'See in World')}</button>
          )}
        </div>
      </div>
    </section>
  );
}

function ChecksSection({ campaign, char, lang }) {
  const [checks, setChecks] = useState(null);
  const load = useCallback(async () => {
    try { setChecks((await api.listChecks(campaign.id)).checks || []); } catch { /* polling */ }
  }, [campaign.id]);
  usePolling(load, 3000, [campaign.id]);
  const open = (checks || []).filter(c => !c.myResponse);
  return (
    <section className="pl-section" aria-label={L(lang, 'Testes pedidos pelo mestre', 'Checks requested by the DM')}>
      <h3 className="pl-section-title">
        🎯 {L(lang, 'Testes', 'Checks')}
        {open.length > 0 && <span className="pl-count">{open.length}</span>}
      </h3>
      {checks && checks.length === 0 && (
        <p className="muted small">{L(lang, 'Nenhum teste pendente. Quando o mestre pedir um, ele aparece aqui — role no app ou digite o dado físico.', 'No pending checks. When the DM asks for one it shows up here — roll in the app or type your physical die.')}</p>
      )}
      <div className="player-checks">
        {(checks || []).map(c => (
          <CheckRequestCard key={c.id} check={c} char={char} lang={lang}
            onAnswered={(u) => setChecks(prev => (prev || []).map(x => (x.id === u.id ? { ...x, ...u } : x)))} />
        ))}
      </div>
    </section>
  );
}

/** Rolador do jogador. "Pedir ao mestre" manda um pedido que ele resolve (telão ou privado). */
function DiceSection({ campaign, lang }) {
  const [diceType, setDiceType] = useState('d20');
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [label, setLabel] = useState('');
  const [ask, setAsk] = useState(false);
  const [last, setLast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState([]);

  const loadPending = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([api.listPendingRolls(campaign.id), api.listRecentRolls(campaign.id)]);
      const pend = p.rolls || [];
      // Pedido meu que o mestre acabou de resolver: mostra o dado com o valor do servidor.
      setPending(prev => {
        const gone = prev.filter(x => !pend.some(y => y.id === x.id));
        for (const g of gone) {
          const done = (r.rolls || []).find(x => x.id === g.id);
          if (done && done.status !== 'cancelled' && done.rolls?.length) {
            window.__diceShow?.({
              label: done.label || done.diceType,
              groups: [{ die: parseInt(String(done.diceType).replace('d', ''), 10) || 20, rolls: done.rolls }],
              mod: done.modifier || 0, total: done.total, isCrit: done.isCritical, isFumble: done.isCriticalFail,
            });
            setLast({ label: done.label, results: done.rolls.filter(x => x.kept !== false), total: done.total, modifier: done.modifier, fromDm: true });
          }
        }
        return pend;
      });
    } catch { /* polling */ }
  }, [campaign.id]);
  // Só consulta pedidos enquanto houver algum aguardando o mestre.
  useEffect(() => { loadPending(); }, [loadPending]);
  usePolling(() => (pending.length ? loadPending() : null), 3000, [campaign.id, pending.length > 0]);

  const roll = async () => {
    setBusy(true); setError('');
    try {
      if (ask) {
        await api.createRoll(campaign.id, {
          label: label || L(lang, 'Rolagem', 'Roll'), diceType, count, modifier,
          hasAdvantage: false, hasDisadvantage: false,
        });
        await loadPending();
        setLabel('');
      } else {
        const r = await api.rollDice({ diceType, count, campaignId: campaign.id, label });
        const total = r.total + (modifier || 0);
        setLast({ label, results: r.results, total, modifier });
        window.__diceShow?.({
          label: label || `${count}${diceType}`,
          groups: [{ die: parseInt(diceType.slice(1), 10), rolls: r.results.map(x => ({ value: x.value, kept: true })) }],
          mod: modifier || 0,
          total,
        });
      }
    } catch (e) {
      setError(errorMessage(e, lang, L(lang, 'Não deu para rolar. Tente de novo.', 'Could not roll. Try again.')));
    } finally { setBusy(false); }
  };

  return (
    <section className="pl-section pl-dice" aria-label={L(lang, 'Rolar dados', 'Roll dice')}>
      <h3 className="pl-section-title">🎲 {L(lang, 'Rolar dados', 'Roll dice')}</h3>
      <p className="muted small pl-dice-hint">{L(lang, 'Prefere dados de verdade? Ótimo — use os seus e diga o resultado ao mestre.', 'Prefer real dice? Great — roll yours and tell the DM the result.')}</p>
      <div className="pl-dice-row" role="group" aria-label={L(lang, 'Dado', 'Die')}>
        {DICE.map(d => (
          <button key={d} type="button" className={`pl-die ${diceType === d ? 'active' : ''}`} aria-pressed={diceType === d} onClick={() => setDiceType(d)}>{d}</button>
        ))}
      </div>
      <div className="pl-dice-form">
        <label className="pl-field">
          <span>{L(lang, 'Quantos', 'How many')}</span>
          <input className="input" type="number" inputMode="numeric" min={1} max={20} value={count}
            onChange={e => setCount(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))} />
        </label>
        <label className="pl-field">
          <span>{L(lang, 'Bônus', 'Bonus')}</span>
          <input className="input" type="number" inputMode="numeric" min={-20} max={40} value={modifier}
            onChange={e => setModifier(Math.max(-20, Math.min(40, parseInt(e.target.value, 10) || 0)))} />
        </label>
        <label className="pl-field pl-field-grow">
          <span>{L(lang, 'Para quê? (opcional)', 'What for? (optional)')}</span>
          <input className="input" value={label} maxLength={60} onChange={e => setLabel(e.target.value)}
            placeholder={L(lang, 'ex.: Percepção', 'e.g. Perception')} />
        </label>
      </div>
      <label className="pl-ask">
        <input type="checkbox" checked={ask} onChange={e => setAsk(e.target.checked)} />
        <span>{L(lang, 'Pedir ao mestre (ele decide se mostra no telão)', 'Ask the DM (they decide whether to show it on the TV)')}</span>
      </label>
      <button type="button" className="btn btn-primary pl-roll-btn" onClick={roll} disabled={busy}>
        {busy ? '…' : ask
          ? L(lang, `Pedir ${count}${diceType}`, `Request ${count}${diceType}`)
          : L(lang, `Rolar ${count}${diceType}${modifier ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`, `Roll ${count}${diceType}${modifier ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`)}
      </button>
      {error && <p className="pl-error" role="alert">{error}</p>}

      {pending.length > 0 && (
        <ul className="pl-pending">
          {pending.map(r => (
            <li key={r.id}><span>{r.label || r.diceType}</span> <span className="muted small">{L(lang, 'aguardando o mestre…', 'waiting for the DM…')}</span></li>
          ))}
        </ul>
      )}

      {last && (
        <div className="pl-last" aria-live="polite">
          <span className="pl-last-label">{last.label || L(lang, 'Resultado', 'Result')}{last.fromDm ? ` · ${L(lang, 'resolvido pelo mestre', 'resolved by the DM')}` : ''}</span>
          <span className="pl-last-dice">
            {last.results.map((r, i) => <span key={i} className="pl-last-die">{r.value}</span>)}
            {last.modifier ? <span className="pl-last-mod">{last.modifier > 0 ? `+${last.modifier}` : last.modifier}</span> : null}
          </span>
          <span className="pl-last-total">{last.total}</span>
        </div>
      )}
    </section>
  );
}
