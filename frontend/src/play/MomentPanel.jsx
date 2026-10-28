// Jogar › Agora: o PAINEL DO MOMENTO (V7, especificação §4.4.3) — altura fixa de 120 px,
// logo abaixo da linha de ações; nunca empurra o que está embaixo.
//   - Cabeçalho de contadores, sempre na mesma linha (chips de 44 px): "🎯 1 teste" ·
//     "🎲 2 pedidos" · "⬆ 1 nível" · "⚠ 1 perigo"; zerados, "Nada esperando ✓". Tocar num
//     contador mostra aquele item no corpo.
//   - Corpo: o teste aberto mais novo (as respostas ESCRITAS chegando, 📺 Na tela, Encerrar,
//     Testes ›); sem teste, o 1º perigo (a ação do aviso e Dispensar); sem nada, a lista
//     curta das pendências com o lugar de cada uma.
//   - Regra anti-surpresa (now-model.momentBody): o que chega só muda o NÚMERO; o corpo só
//     troca por toque do mestre (ou pelo teste que ele acabou de pedir) ou quando o item que
//     está nele acaba. As respostas preenchem o corpo sem mudar a altura.
// Só apresentação: os dados vêm da Agora (NowPanel), que os lê por versão do pulso.
import { useEffect, useMemo, useRef } from 'react';
import { api } from '../api/client.js';
import ShowOnTable from '../stage/ShowOnTable.jsx';
import { checkLine, momentBody, momentCounters, pickCounter } from './now-model.js';
import { flash } from './flash.js';
import { errorMessage } from '../api/errors.js';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

/**
 * checks   testes abertos desta sessão · rolls  pedidos de rolagem desta sessão
 * approvals {n, levelups} · dangers  avisos de perigo (nudges) · nudges  o useNudges (Aplicar/Dispensar)
 * pick/onPick  o que está no corpo (a Agora guarda, para o "Pedir a todos" escolher o teste novo)
 * goTo, onChecks (Jogar › Testes), onChange (recarregar os testes depois de uma ação)
 */
export default function MomentPanel({
  campaign, lang = 'pt', checks = [], rolls = [], approvals = { n: 0, levelups: null }, dangers = [], nudges,
  pick, onPick, ready = true, goTo, onChange, closed = false,
}) {
  const counters = momentCounters({ checks: checks.length, rolls: rolls.length, approvals: approvals.n, levelups: approvals.levelups, dangers: dangers.length }, lang);
  const data = { checks, dangers, rolls: rolls.length, approvals: approvals.n };
  const body = useMemo(() => (ready ? momentBody(pick, data) : null), [ready, pick, checks, dangers, rolls.length, approvals.n]); // eslint-disable-line react-hooks/exhaustive-deps
  // a escolha fica guardada: o item novo que chega depois não troca o corpo
  const shown = useRef(null);
  useEffect(() => {
    if (!body) return;
    const key = `${body.kind}:${body.id ?? ''}`;
    if (shown.current === key) return;
    shown.current = key;
    if (!pick || pick.kind !== body.kind || pick.id !== body.id) onPick?.(body);
  }, [body]); // eslint-disable-line react-hooks/exhaustive-deps

  const toTests = () => goTo?.('play', 'checks');
  const toRequests = () => goTo?.('group', 'requests');
  const active = body?.kind === 'check' ? 'checks' : body?.kind === 'danger' ? 'dangers' : body?.kind;

  let content = null;
  if (!ready) {
    content = <p className="mp-line mp-quiet">{L(lang, 'Carregando…', 'Loading…')}</p>;
  } else if (body.kind === 'check') {
    const c = checks.find(x => x.id === body.id);
    const line = checkLine(c, lang);
    content = (
      <>
        <div className="mp-line mp-answers mesa-scroll" aria-label={`${line.head}: ${line.answers.map(a => a.text).join(', ')}`}>
          <strong>🎯 {line.head}</strong>
          {line.answers.map(a => <span key={a.name + a.text} className={`mp-ans is-${a.outcome}`}>{a.text}</span>)}
        </div>
        <div className="mp-acts">
          <ShowOnTable campaign={campaign} lang={lang} target={{ kind: 'check', check: c }} disabled={closed}
            className={`mesa-btn mp-btn ${c.showOnScreen ? 'is-primary' : ''}`} onShown={() => onChange?.()}>
            {c.showOnScreen ? <>✕ {L(lang, 'Tirar da Tela', 'Off screen')}</> : <>📺 {L(lang, 'Na tela', 'On screen')}</>}
          </ShowOnTable>
          <button type="button" className="mesa-btn mp-btn" disabled={closed} onClick={async () => {
            try { await api.closeCheck(c.id, { reopen: false }); onChange?.(); flash(L(lang, `Teste encerrado: ${c.label}`, `Check closed: ${c.label}`)); }
            catch (e) { flash(errorMessage(e, lang), { error: true }); }
          }}>{L(lang, 'Encerrar', 'Close')}</button>
          <button type="button" className="mesa-btn is-quiet mp-btn mp-go" onClick={toTests}>{L(lang, 'Testes ›', 'Checks ›')}</button>
        </div>
      </>
    );
  } else if (body.kind === 'danger') {
    const n = dangers.find(x => x.id === body.id);
    const act = n.actions?.[0];
    content = (
      <>
        <p className="mp-line"><span aria-hidden="true">⚠</span> {n.text}</p>
        <div className="mp-acts">
          {act && (
            <button type="button" className="mesa-btn is-primary mp-btn" disabled={closed || !!nudges?.busy} onClick={() => nudges?.run(n, act)}>
              {nudges?.busy === `${n.id}:${act.id}` ? '…' : act.label}
            </button>
          )}
          <button type="button" className="mesa-btn mp-btn" onClick={() => nudges?.dismiss(n.id)}>{L(lang, 'Dispensar', 'Dismiss')}</button>
        </div>
      </>
    );
  } else if (body.kind === 'rolls') {
    content = (
      <>
        <p className="mp-line">🎲 {rolls.map(r => `${r.requestedBy?.displayName || '?'}: ${r.label || r.diceType}`).join(' · ')}</p>
        <div className="mp-acts">
          <button type="button" className="mesa-btn is-primary mp-btn" onClick={toTests}>{L(lang, 'Resolver em Testes ›', 'Resolve in Checks ›')}</button>
        </div>
      </>
    );
  } else if (body.kind === 'approvals') {
    content = (
      <>
        <p className="mp-line">⬆ {approvals.n === 1 ? L(lang, '1 pedido de aprovação esperando você', '1 approval request waiting for you') : L(lang, `${approvals.n} pedidos de aprovação esperando você`, `${approvals.n} approval requests waiting for you`)}</p>
        <div className="mp-acts">
          <button type="button" className="mesa-btn is-primary mp-btn" onClick={toRequests}>{L(lang, 'Grupo › Pedidos ›', 'Party › Requests ›')}</button>
        </div>
      </>
    );
  } else {
    // a lista curta: o que espera e onde mora (sem nada: "Nada esperando ✓")
    const rows = [
      rolls.length > 0 && { id: 'rolls', text: `🎲 ${rolls.length} › ${L(lang, 'Testes', 'Checks')}`, aria: L(lang, `${rolls.length} pedido(s) de rolagem: abrir Jogar › Testes`, `${rolls.length} roll request(s): open Play › Checks`), go: toTests },
      approvals.n > 0 && { id: 'approvals', text: `⬆ ${approvals.n} › ${L(lang, 'Grupo › Pedidos', 'Party › Requests')}`, aria: L(lang, `${approvals.n} pedido(s) de aprovação: abrir Grupo › Pedidos`, `${approvals.n} approval request(s): open Party › Requests`), go: toRequests },
    ].filter(Boolean);
    content = rows.length ? (
      <>
        <p className="mp-line mp-quiet">{L(lang, 'Esperando você:', 'Waiting for you:')}</p>
        <div className="mp-acts">
          {rows.map(r => <button key={r.id} type="button" className="mesa-btn mp-btn" aria-label={r.aria} onClick={r.go}>{r.text}</button>)}
        </div>
      </>
    ) : (
      <p className="mp-line mp-calm">{checks.length || dangers.length
        ? L(lang, 'Toque num contador acima para ver.', 'Tap a counter above to see it.')
        : L(lang, 'Nenhum teste, pedido ou perigo agora.', 'No checks, requests or dangers right now.')}</p>
    );
  }

  return (
    <section className="mesa-panel is-sunk mp" aria-label={L(lang, 'Painel do momento', 'Moment panel')}>
      <div className="mp-head mesa-scroll" role="group" aria-label={L(lang, 'O que está esperando', 'What is waiting')}>
        {counters.length === 0 && <span className="mp-none">{L(lang, 'Nada esperando ✓', 'Nothing waiting ✓')}</span>}
        {counters.map(c => (
          <button key={c.id} type="button" className="mesa-chip mp-chip" aria-pressed={active === c.id}
            onClick={() => onPick?.(pickCounter(c.id, data))}>
            <span aria-hidden="true">{c.icon}</span> {c.n} {c.label}
          </button>
        ))}
      </div>
      <div className="mp-body" aria-live="polite">{content}</div>
    </section>
  );
}
