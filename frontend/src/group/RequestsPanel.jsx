import { useRef, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import MesaTitle from '../shell/MesaTitle.jsx';
import { groupApi } from './group-api.js';
import {
  buildHistory, charLine, keepOrder, labelType, levelupFor, levelupSummary, memberStats,
  payloadText, sortPending, splitApprovals, statusLabel, t, xpProgress,
} from './group-model.js';

function fmtWhen(iso, lang) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

/**
 * Grupo › Pedidos (mestre). Uma só fonte para a contagem:
 * "Pedidos (n)" = approvals com status 'pending' = selo da aba e da barra.
 * Na ordem (celular, uma coluna; desktop, duas):
 *   1. Pedidos esperando: ✨ Liberar subida / Aprovar e aplicar e Recusar (48);
 *   2. Nível de cada um: Liberar nível N+1, +XP, liberado → N + Desfazer;
 *   ── 2ª coluna no desktop ──
 *   3. Evolução da mesa: Subir a mesa toda, Marcos/XP, multiclasse, Dar XP;
 *   4. Aguardando o jogador (liberações fora da mesa) + Desfazer liberação;
 *   5. Histórico (liberações, aplicações, recusas e XP), recolhido: 8 + Ver mais.
 * Jogador (`isDM` falso): só "Meus pedidos", sem ações (o servidor já filtra).
 */
export default function RequestsPanel({ campaign, approvals, xpEvents, lang, isDM, ask, notify, onChange }) {
  const [busy, setBusy] = useState(false);
  const [xpAmount, setXpAmount] = useState('');
  const [xpSplit, setXpSplit] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const xpRef = useRef(null);
  const { pending: rawPending, unlocked } = splitApprovals(approvals);
  // subidas de nível primeiro; o que chega depois entra no fim (nada mexe debaixo do dedo)
  const order = useRef(null);
  const pending = keepOrder(order.current, sortPending(rawPending));
  order.current = pending.map(a => a.id);
  const allHistory = buildHistory(approvals, xpEvents, 100);
  const history = showAllHistory ? allHistory : allHistory.slice(0, 8);
  const allowMulti = campaign.state?.allowMulticlass !== false;
  const xpMode = campaign.state?.levelingMode === 'xp';
  const players = (campaign.members || []).filter(m => m.role !== 'dm' && m.character);
  const tableChars = new Set(players.map(m => m.character.id));
  const waiting = unlocked.filter(a => !(a.type === 'levelup' && tableChars.has(a.character?.id)));

  // os botões ficam desligados até a lista nova chegar (onChange devolve a recarga): sem 2º toque
  // num pedido que já foi resolvido
  const run = async (fn, ok) => {
    setBusy(true);
    try { const r = await fn(); if (ok) notify?.(typeof ok === 'function' ? ok(r) : ok); await onChange?.(); }
    catch (e) { notify?.(errorMessage(e, lang), 'error'); }
    finally { setBusy(false); }
  };

  const patchState = (patch, ok) => run(() => groupApi.patchState(campaign.id, patch), ok);
  const setMode = (mode) => patchState({ levelingMode: mode }, mode === 'xp'
    ? t(lang, 'A mesa agora sobe de nível por XP.', 'The table now levels up by XP.')
    : t(lang, 'A mesa agora sobe de nível por marcos.', 'The table now levels up by milestones.'));
  const toggleMulti = () => patchState({ allowMulticlass: !allowMulti }, !allowMulti
    ? t(lang, 'Multiclasse liberada na mesa.', 'Multiclassing allowed.')
    : t(lang, 'Multiclasse bloqueada na mesa.', 'Multiclassing blocked.'));

  const grant = (ids) => run(async () => {
    const r = await api.grantLevelup(campaign.id, { characterIds: ids });
    if (!r.granted?.length) throw new Error(t(lang, 'Nada para liberar (já liberado ou nível 20).', 'Nothing to unlock (already unlocked or level 20).'));
    return r;
  }, (r) => t(lang,
    `Subida liberada para ${r.granted.length} personagem(ns). Os jogadores confirmam na ficha.`,
    `Level up unlocked for ${r.granted.length} character(s). Players confirm on their sheet.`));

  const grantAll = async () => {
    const ok = await ask({
      title: t(lang, 'Subir a mesa toda?', 'Level up the whole party?'),
      text: t(lang, 'Libera a subida de nível para todos os personagens. Cada jogador confirma na própria ficha.', 'Unlocks a level up for every character. Each player confirms on their own sheet.'),
      okLabel: t(lang, 'Liberar para todos', 'Unlock for everyone'),
    });
    if (ok) grant('all');
  };

  const approve = (a) => {
    if (a.type === 'levelup' && tableChars.has(a.character?.id)) return grant([a.character.id]);
    return run(() => api.reviewApproval(a.id, { status: 'approved' }), t(lang, 'Pedido aprovado.', 'Request approved.'));
  };
  const reject = async (a) => {
    const ok = await ask({
      title: t(lang, 'Recusar este pedido?', 'Reject this request?'),
      text: `${a.character?.name || a.requestedBy?.displayName || ''} · ${labelType(a.type, lang)}`,
      okLabel: t(lang, 'Recusar', 'Reject'), danger: true,
    });
    if (ok) run(() => api.reviewApproval(a.id, { status: 'rejected' }), t(lang, 'Pedido recusado.', 'Request rejected.'));
  };
  const revoke = (a) => run(() => api.reviewApproval(a.id, { status: 'pending' }), t(lang, 'Liberação desfeita; o pedido voltou para pendente.', 'Unlock revoked; the request is pending again.'));

  const awardXp = (ids) => {
    const amount = parseInt(xpAmount, 10);
    if (!(amount > 0)) {
      notify?.(t(lang, 'Informe quanto XP dar.', 'Enter how much XP to give.'), 'error');
      // o campo fica em "Evolução da mesa": leva até ele
      const el = xpRef.current;
      if (el) { try { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { el.focus(); } }
      return;
    }
    run(async () => {
      const r = await api.awardXp(campaign.id, { amount, characterIds: ids, split: ids === 'all' && xpSplit });
      setXpAmount('');
      return r;
    }, (r) => t(lang,
      `XP entregue (+${r?.each ?? amount} cada).${r?.granted?.length ? ' Quem alcançou o próximo nível já pode subir.' : ''}`,
      `XP awarded (+${r?.each ?? amount} each).${r?.granted?.length ? ' Anyone who reached the next level can level up.' : ''}`));
  };

  if (!isDM) {
    // Jogador: só vê os próprios pedidos (o servidor já filtra).
    return (
      <section className="grp-section grp-my-requests mesa-panel" aria-labelledby="grp-myreq-title">
        <MesaTitle id="grp-myreq-title">{t(lang, 'Meus pedidos', 'My requests')} ({pending.length})</MesaTitle>
        {approvals.length === 0 && <p className="grp-none">{t(lang, 'Nenhum pedido por enquanto.', 'No requests yet.')}</p>}
        <ul className="grp-req-list">
          {[...pending, ...unlocked].map(a => <RequestRow key={a.id} a={a} lang={lang} />)}
        </ul>
      </section>
    );
  }

  const xpAmountNum = parseInt(xpAmount, 10);
  return (
    <div className="grp-requests">
      <div className="grp-req-col">
        {/* ---------- 1. pedidos esperando (mesma contagem do selo) ---------- */}
        <section className="grp-section mesa-panel" aria-labelledby="grp-req-title">
          <MesaTitle id="grp-req-title">
            {t(lang, 'Pedidos', 'Requests')} <span className="grp-count" data-count={pending.length}>({pending.length})</span>
          </MesaTitle>
          {pending.length === 0 && <p className="grp-none">{t(lang, 'Nenhum pedido esperando você.', 'No requests waiting for you.')}</p>}
          <ul className="grp-req-list">
            {pending.map(a => (
              <RequestRow key={a.id} a={a} lang={lang}>
                <button type="button" className="mesa-btn mesa-btn-lg is-primary grp-req-ok" disabled={busy} onClick={() => approve(a)}>
                  {a.type === 'levelup' ? `✨ ${t(lang, 'Liberar subida', 'Unlock level up')}` : t(lang, 'Aprovar e aplicar', 'Approve & apply')}
                </button>
                <button type="button" className="mesa-btn mesa-btn-lg grp-req-no" disabled={busy} onClick={() => reject(a)}>{t(lang, 'Recusar', 'Reject')}</button>
              </RequestRow>
            ))}
          </ul>
        </section>

        {/* ---------- 2. nível de cada um ---------- */}
        {players.length > 0 && (
          <section className="grp-section mesa-panel" aria-labelledby="grp-lvl-title">
            <MesaTitle id="grp-lvl-title"
              sub={xpMode ? <span>{t(lang, '+XP dá o valor do campo XP (em Evolução da mesa) só a este personagem.', '+XP gives the XP field amount (in Party progression) to this character only.')}</span> : null}>
              {t(lang, 'Nível de cada um', 'Each character')}
            </MesaTitle>
            <ul className="grp-lvl-list">
              {players.map(m => {
                const c = m.character;
                const s = memberStats(m);
                const lvl = s?.level || 1;
                const open = levelupFor(approvals, c.id, 'approved');
                const asked = levelupFor(approvals, c.id, 'pending');
                const xp = xpProgress(lvl, s?.xp);
                return (
                  <li key={m.id} className="grp-lvl-row">
                    <div className="grp-lvl-who">
                      <strong>{c.name}</strong>
                      <span className="grp-lvl-sub">{charLine(c.summary || c.data, lang)}</span>
                    </div>
                    <span className="grp-lvl-level">
                      {t(lang, 'Nv', 'Lv')} {lvl}
                      {xpMode && <span className="grp-lvl-xp"> · {xp.next ? `${xp.xp}/${xp.next}` : xp.xp} XP</span>}
                    </span>
                    <div className="grp-lvl-actions">
                      {open ? (
                        <>
                          <span className="pill pill-approved">{t(lang, `liberado → ${open.payload?.toLevel ?? lvl + 1}`, `unlocked → ${open.payload?.toLevel ?? lvl + 1}`)}</span>
                          <button type="button" className="mesa-btn" disabled={busy} onClick={() => revoke(open)}>{t(lang, 'Desfazer', 'Revoke')}</button>
                        </>
                      ) : lvl >= 20 ? (
                        <span className="grp-lvl-note">{t(lang, 'nível máximo', 'max level')}</span>
                      ) : asked ? (
                        <span className="pill pill-pending">{t(lang, 'pediu — veja em Pedidos', 'asked — see Requests')}</span>
                      ) : (
                        <>
                          {xpMode && (
                            <button type="button" className="mesa-btn grp-lvl-xpbtn" disabled={busy}
                              aria-label={xpAmountNum > 0
                                ? t(lang, `Dar ${xpAmountNum} XP só para ${c.name}`, `Give ${xpAmountNum} XP to ${c.name} only`)
                                : t(lang, `Dar XP só para ${c.name} (informe o valor em Evolução da mesa)`, `Give XP to ${c.name} only (enter the amount in Party progression)`)}
                              title={t(lang, 'Dá o valor do campo de XP só para este personagem', 'Gives the XP field amount to this character only')}
                              onClick={() => awardXp([c.id])}>{xpAmountNum > 0 ? `+${xpAmountNum} XP` : '+XP'}</button>
                          )}
                          <button type="button" className="mesa-btn" disabled={busy} onClick={() => grant([c.id])}>
                            {t(lang, `Liberar nível ${lvl + 1}`, `Unlock level ${lvl + 1}`)}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <div className="grp-req-col">
        {/* ---------- 3. evolução da mesa ---------- */}
        <section className="grp-section grp-rules mesa-panel" aria-labelledby="grp-rules-title">
          <MesaTitle id="grp-rules-title">{t(lang, 'Evolução da mesa', 'Party progression')}</MesaTitle>
          <button type="button" className="mesa-btn is-primary grp-grant-all" disabled={busy || !players.length} onClick={grantAll}>
            ✨ {t(lang, 'Subir a mesa toda', 'Level up the party')}
          </button>
          <div className="grp-rule-row">
            <span className="grp-rule-label" id="grp-mode-label">{t(lang, 'Progressão', 'Leveling')}</span>
            <div className="mesa-seg grp-mode-seg" role="radiogroup" aria-labelledby="grp-mode-label">
              <button type="button" role="radio" aria-checked={!xpMode} className={`mesa-seg-btn ${!xpMode ? 'active' : ''}`} disabled={busy} onClick={() => xpMode && setMode('milestone')}>
                {!xpMode && <span aria-hidden="true">✓ </span>}{t(lang, 'Marcos', 'Milestones')}
              </button>
              <button type="button" role="radio" aria-checked={xpMode} className={`mesa-seg-btn ${xpMode ? 'active' : ''}`} disabled={busy} onClick={() => !xpMode && setMode('xp')}>
                {xpMode && <span aria-hidden="true">✓ </span>}XP
              </button>
            </div>
            <p className="grp-rule-hint">
              {xpMode
                ? t(lang, 'Agora: por XP. Você dá XP; ao alcançar o próximo nível a subida é liberada.', 'Now: by XP. You award XP; reaching the next level unlocks it.')
                : t(lang, 'Agora: por marcos. Você libera a subida quando a história pedir.', 'Now: by milestones. You unlock level ups when the story calls for it.')}
            </p>
          </div>
          <label className="grp-rule-row grp-switch">
            <input type="checkbox" role="switch" checked={allowMulti} disabled={busy} onChange={toggleMulti} />
            <span className="grp-switch-track" aria-hidden="true" />
            <span className="grp-switch-text">
              <strong>{t(lang, 'Multiclasse permitida', 'Multiclassing allowed')}</strong>
              <span className="grp-rule-hint">{t(lang, 'Ao subir, o jogador pode abrir uma classe nova (com os pré-requisitos).', 'When leveling, players may take a new class (prerequisites apply).')}</span>
            </span>
          </label>
          {xpMode && (
            <div className="grp-xp-award">
              <label className="mesa-field grp-xp-field">
                <span className="mesa-field-label">{t(lang, 'XP', 'XP')}</span>
                <input ref={xpRef} className="input" type="number" min="1" inputMode="numeric"
                  placeholder={t(lang, 'ex.: 300', 'e.g. 300')} value={xpAmount} onChange={e => setXpAmount(e.target.value)} />
              </label>
              <label className="grp-check grp-xp-split">
                <input type="checkbox" checked={xpSplit} onChange={e => setXpSplit(e.target.checked)} />
                <span>{t(lang, 'dividir entre a mesa', 'split among the party')}</span>
              </label>
              <button type="button" className="mesa-btn is-primary grp-xp-give" disabled={busy || !players.length} onClick={() => awardXp('all')}>
                {t(lang, 'Dar XP à mesa', 'Give XP to party')}
              </button>
            </div>
          )}
        </section>

        {/* ---------- 4. liberados que não são de personagem da mesa ---------- */}
        {waiting.length > 0 && (
          <section className="grp-section mesa-panel" aria-labelledby="grp-wait-title">
            <MesaTitle id="grp-wait-title">{t(lang, 'Aguardando o jogador', 'Awaiting the player')}</MesaTitle>
            <ul className="grp-req-list">
              {waiting.map(a => (
                <RequestRow key={a.id} a={a} lang={lang}>
                  <button type="button" className="mesa-btn" disabled={busy} onClick={() => revoke(a)}>{t(lang, 'Desfazer liberação', 'Revoke unlock')}</button>
                </RequestRow>
              ))}
            </ul>
          </section>
        )}

        {/* ---------- 5. histórico (recolhido) ---------- */}
        <section className={`grp-section grp-hist mesa-panel ${historyOpen ? 'is-open' : ''}`} aria-labelledby="grp-hist-title">
          <h3 className="grp-hist-h" id="grp-hist-title">
            <button type="button" className="grp-hist-toggle" aria-expanded={historyOpen} aria-controls="grp-hist-body" onClick={() => setHistoryOpen(o => !o)}>
              <span className="mesa-gem" aria-hidden="true" />
              <span className="grp-hist-label">{t(lang, 'Histórico', 'History')}</span>
              <span className="grp-count">({allHistory.length >= 100 ? '100+' : allHistory.length})</span>
              <span className="grp-hist-chev" aria-hidden="true">{historyOpen ? '▴' : '▾'}</span>
            </button>
          </h3>
          {historyOpen && (
            <div id="grp-hist-body">
              {history.length === 0 && <p className="grp-none">{t(lang, 'Liberações de nível e XP entregue aparecem aqui.', 'Level unlocks and XP awarded show up here.')}</p>}
              <ol className="grp-history">
                {history.map(h => (
                  <li key={h.key} className={`grp-hist-item is-${h.kind}`}>
                    {h.kind === 'xp' ? (
                      <>
                        <span className="grp-hist-icon" aria-hidden="true">✦</span>
                        <span><strong>+{h.each} XP</strong> {t(lang, 'para', 'for')} {h.names.join(', ')}</span>
                      </>
                    ) : (
                      <>
                        <span className={`pill pill-${h.approval.status === 'consumed' ? 'approved' : h.approval.status === 'approved' ? 'pending' : h.approval.status}`}>{statusLabel(h.approval.status, lang)}</span>
                        <span>
                          <strong>{h.approval.character?.name || h.approval.requestedBy?.displayName}</strong>
                          {' · '}{labelType(h.approval.type, lang)} {payloadText(h.approval, lang)}
                          {h.approval.type === 'levelup' && h.approval.status === 'consumed' && levelupSummary(h.approval.payload, lang) && (
                            <span className="grp-hist-sub"> — {levelupSummary(h.approval.payload, lang)}</span>
                          )}
                        </span>
                      </>
                    )}
                    <time className="grp-hist-time">{fmtWhen(h.at, lang)}</time>
                  </li>
                ))}
              </ol>
              {!showAllHistory && allHistory.length > 8 && (
                <button type="button" className="mesa-btn grp-hist-more" onClick={() => setShowAllHistory(true)}>{t(lang, 'Ver mais', 'Show more')}</button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function RequestRow({ a, lang, children }) {
  return (
    <li className={`grp-req mesa-panel is-sunk is-${a.status}`}>
      <div className="grp-req-main">
        <span className="grp-req-type" aria-hidden="true">{a.type === 'levelup' ? '⬆' : a.type === 'spell' ? '✧' : a.type === 'item' ? '🎁' : '✎'}</span>
        <div className="grp-req-body">
          <div className="grp-req-what">
            <strong>{a.character?.name || a.requestedBy?.displayName}</strong> · {labelType(a.type, lang)} {payloadText(a, lang)}
          </div>
          <div className="grp-req-meta">
            {a.requestedBy?.displayName && <>{t(lang, 'pedido de', 'from')} {a.requestedBy.displayName}</>}
            {a.character?.classes?.length ? <> · {charLine(a.character, lang)}</> : null}
            {a.status === 'approved' && <> · {t(lang, 'o jogador confirma na ficha', 'the player confirms on their sheet')}</>}
          </div>
          {a.note && <p className="grp-req-note">“{a.note}”</p>}
        </div>
      </div>
      {children && <div className="grp-req-actions">{children}</div>}
    </li>
  );
}
