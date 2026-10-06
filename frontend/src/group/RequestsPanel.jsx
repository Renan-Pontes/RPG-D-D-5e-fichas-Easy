import { useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { groupApi } from './group-api.js';
import {
  buildHistory, charLine, labelType, levelupFor, levelupSummary, memberStats,
  payloadText, splitApprovals, statusLabel, t, xpProgress,
} from './group-model.js';

function fmtWhen(iso, lang) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

/**
 * Pedidos e evolução da mesa (mestre). Uma só fonte para a contagem:
 * "Pedidos (n)" = approvals com status 'pending' = badge da aba.
 * Seções: modo de progressão (Marcos/XP, com o atual destacado), multiclasse,
 * pedidos pendentes, evolução por personagem, aguardando o jogador e histórico
 * (liberações, aplicações, recusas e XP entregue).
 */
export default function RequestsPanel({ campaign, approvals, xpEvents, lang, isDM, ask, notify, onChange }) {
  const [busy, setBusy] = useState(false);
  const [xpAmount, setXpAmount] = useState('');
  const [xpSplit, setXpSplit] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const { pending, unlocked } = splitApprovals(approvals);
  const history = buildHistory(approvals, xpEvents, showAllHistory ? 100 : 8);
  const allowMulti = campaign.state?.allowMulticlass !== false;
  const xpMode = campaign.state?.levelingMode === 'xp';
  const players = (campaign.members || []).filter(m => m.role !== 'dm' && m.character);
  const tableChars = new Set(players.map(m => m.character.id));

  const run = async (fn, ok) => {
    setBusy(true);
    try { const r = await fn(); if (ok) notify?.(typeof ok === 'function' ? ok(r) : ok); onChange?.(); }
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
    if (!(amount > 0)) { notify?.(t(lang, 'Informe quanto XP dar.', 'Enter how much XP to give.'), 'error'); return; }
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
      <section className="grp-section" aria-labelledby="grp-req-title">
        <h3 id="grp-req-title" className="grp-h">{t(lang, 'Meus pedidos', 'My requests')} ({pending.length})</h3>
        {approvals.length === 0 && <p className="muted small">{t(lang, 'Nenhum pedido por enquanto.', 'No requests yet.')}</p>}
        <ul className="grp-req-list">
          {[...pending, ...unlocked].map(a => <RequestRow key={a.id} a={a} lang={lang} />)}
        </ul>
      </section>
    );
  }

  return (
    <div className="grp-requests">
      {/* ---------- regras de progressão ---------- */}
      <section className="grp-section grp-rules" aria-labelledby="grp-rules-title">
        <div className="grp-section-head">
          <h3 id="grp-rules-title" className="grp-h">{t(lang, 'Evolução da mesa', 'Party progression')}</h3>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || !players.length} onClick={grantAll}>
            ✨ {t(lang, 'Subir a mesa toda', 'Level up the party')}
          </button>
        </div>
        <div className="grp-rule-row">
          <span className="grp-rule-label">{t(lang, 'Progressão', 'Leveling')}</span>
          <div className="grp-seg" role="radiogroup" aria-label={t(lang, 'Progressão', 'Leveling')}>
            <button type="button" role="radio" aria-checked={!xpMode} className={!xpMode ? 'on' : ''} disabled={busy} onClick={() => xpMode && setMode('milestone')}>
              {!xpMode && <span aria-hidden="true">✓ </span>}{t(lang, 'Marcos', 'Milestones')}
            </button>
            <button type="button" role="radio" aria-checked={xpMode} className={xpMode ? 'on' : ''} disabled={busy} onClick={() => !xpMode && setMode('xp')}>
              {xpMode && <span aria-hidden="true">✓ </span>}XP
            </button>
          </div>
          <span className="muted small grp-rule-hint">
            {xpMode
              ? t(lang, 'Agora: por XP. Você dá XP; ao alcançar o próximo nível a subida é liberada.', 'Now: by XP. You award XP; reaching the next level unlocks it.')
              : t(lang, 'Agora: por marcos. Você libera a subida quando a história pedir.', 'Now: by milestones. You unlock level ups when the story calls for it.')}
          </span>
        </div>
        <label className="grp-rule-row grp-check">
          <input type="checkbox" checked={allowMulti} disabled={busy} onChange={toggleMulti} />
          <span>
            <strong>{t(lang, 'Multiclasse permitida', 'Multiclassing allowed')}</strong>
            <span className="muted small"> — {t(lang, 'ao subir, o jogador pode abrir uma classe nova (com os pré-requisitos).', 'when leveling, players may take a new class (prerequisites apply).')}</span>
          </span>
        </label>
        {xpMode && (
          <div className="grp-xp-award">
            <input className="input" aria-label={t(lang, 'Quantidade de XP', 'XP amount')} type="number" min="1" inputMode="numeric"
              placeholder={t(lang, 'XP (ex.: 300)', 'XP (e.g. 300)')} value={xpAmount} onChange={e => setXpAmount(e.target.value)} />
            <label className="grp-check small">
              <input type="checkbox" checked={xpSplit} onChange={e => setXpSplit(e.target.checked)} />
              <span>{t(lang, 'dividir entre a mesa', 'split among the party')}</span>
            </label>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !players.length} onClick={() => awardXp('all')}>
              {t(lang, 'Dar XP à mesa', 'Give XP to party')}
            </button>
          </div>
        )}
      </section>

      {/* ---------- pedidos pendentes (mesma contagem do badge) ---------- */}
      <section className="grp-section" aria-labelledby="grp-req-title">
        <h3 id="grp-req-title" className="grp-h">
          {t(lang, 'Pedidos', 'Requests')} <span className="grp-count" data-count={pending.length}>({pending.length})</span>
        </h3>
        {pending.length === 0 && <p className="muted small">{t(lang, 'Nenhum pedido esperando você.', 'No requests waiting for you.')}</p>}
        <ul className="grp-req-list">
          {pending.map(a => (
            <RequestRow key={a.id} a={a} lang={lang}>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => approve(a)}>
                {a.type === 'levelup' ? `✨ ${t(lang, 'Liberar subida', 'Unlock level up')}` : t(lang, 'Aprovar e aplicar', 'Approve & apply')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm grp-danger-text" disabled={busy} onClick={() => reject(a)}>{t(lang, 'Recusar', 'Reject')}</button>
            </RequestRow>
          ))}
        </ul>
      </section>

      {/* ---------- evolução por personagem ---------- */}
      {players.length > 0 && (
        <section className="grp-section" aria-labelledby="grp-lvl-title">
          <h3 id="grp-lvl-title" className="grp-h">{t(lang, 'Nível de cada um', 'Each character')}</h3>
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
                    <span className="muted small">{charLine(c.summary || c.data, lang)}</span>
                  </div>
                  <span className="grp-lvl-level">
                    {t(lang, 'Nv', 'Lv')} {lvl}
                    {xpMode && <span className="muted small"> · {xp.next ? `${xp.xp}/${xp.next}` : xp.xp} XP</span>}
                  </span>
                  <div className="grp-lvl-actions">
                    {open ? (
                      <>
                        <span className="pill pill-approved">{t(lang, `liberado → ${open.payload?.toLevel ?? lvl + 1}`, `unlocked → ${open.payload?.toLevel ?? lvl + 1}`)}</span>
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => revoke(open)}>{t(lang, 'Desfazer', 'Revoke')}</button>
                      </>
                    ) : lvl >= 20 ? (
                      <span className="muted small">{t(lang, 'nível máximo', 'max level')}</span>
                    ) : asked ? (
                      <span className="pill pill-pending">{t(lang, 'pediu — veja em Pedidos', 'asked — see Requests')}</span>
                    ) : (
                      <>
                        {xpMode && (
                          <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !xpAmount}
                            title={t(lang, 'Dá o valor do campo de XP só para este personagem', 'Gives the XP field amount to this character only')}
                            onClick={() => awardXp([c.id])}>+XP</button>
                        )}
                        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => grant([c.id])}>
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

      {/* ---------- liberados que não são de personagem da mesa ---------- */}
      {unlocked.some(a => !(a.type === 'levelup' && tableChars.has(a.character?.id))) && (
        <section className="grp-section">
          <h3 className="grp-h">{t(lang, 'Aguardando o jogador', 'Awaiting the player')}</h3>
          <ul className="grp-req-list">
            {unlocked.filter(a => !(a.type === 'levelup' && tableChars.has(a.character?.id))).map(a => (
              <RequestRow key={a.id} a={a} lang={lang}>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => revoke(a)}>{t(lang, 'Desfazer liberação', 'Revoke unlock')}</button>
              </RequestRow>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- histórico ---------- */}
      <section className="grp-section" aria-labelledby="grp-hist-title">
        <h3 id="grp-hist-title" className="grp-h">{t(lang, 'Histórico', 'History')}</h3>
        {history.length === 0 && <p className="muted small">{t(lang, 'Liberações de nível e XP entregue aparecem aqui.', 'Level unlocks and XP awarded show up here.')}</p>}
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
                      <span className="muted small"> — {levelupSummary(h.approval.payload, lang)}</span>
                    )}
                  </span>
                </>
              )}
              <time className="muted small">{fmtWhen(h.at, lang)}</time>
            </li>
          ))}
        </ol>
        {!showAllHistory && history.length >= 8 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAllHistory(true)}>{t(lang, 'Ver mais', 'Show more')}</button>
        )}
      </section>
    </div>
  );
}

function RequestRow({ a, lang, children }) {
  return (
    <li className={`grp-req is-${a.status}`}>
      <div className="grp-req-main">
        <span className="grp-req-type">{a.type === 'levelup' ? '⬆' : a.type === 'spell' ? '✧' : a.type === 'item' ? '🎁' : '✎'}</span>
        <div>
          <div>
            <strong>{a.character?.name || a.requestedBy?.displayName}</strong> · {labelType(a.type, lang)} {payloadText(a, lang)}
          </div>
          <div className="muted small">
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
