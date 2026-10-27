// A loja da mesa do mestre (V4, especificação §4.10: "uma fonte por recurso").
//
// A casca (CampaignDetail) cria a loja com useTableStore e a distribui por
// contexto (<TableContext.Provider>); quem precisa lê com useTable():
//   - o PULSO (GET /campaigns/:id/pulse a cada 2,5 s, no lugar do GET completo;
//     parado, o navegador recebe 304): `pulse`, `lastOkAt` (para "⟳ Sem conexão
//     há N s"), `tvLive` (do servidor ou de uma TV no mesmo navegador, pelo
//     BroadcastChannel `forja-tv-<id>`), a rolagem nova e o "Enviando…/Na tela ✓"
//     do último 📺;
//   - as ações do turno, compartilhadas pela barra da mesa, pela janela e pela
//     faixa do PC, pela folha Tela ao vivo e pela tecla N: Próximo turno (com
//     `expect`, desligado enquanto envia, 409 → "A vez já tinha passado: agora é
//     de X"), ↶ Voltar turno, ▶ Iniciar e "não enviado · Tentar de novo".
// A casca busca o GET completo quando `pulse.rev` muda (e 1 vez por minuto, de
// segurança). Combate completo (Jogar › Combate) e testes (Jogar) só são buscados
// quando `pulse.combat.ver` / `pulse.checksRev` mudam.
// Servidor sem /pulse (deploy fora de ordem): `missing` → a casca volta ao GET
// completo a cada 2,5 s, como antes.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import { STAGE_EVENT, STAGE_SENDING_EVENT } from '../stage/stage-api.js';
import { frontLabel, L } from '../stage/stage-now.js';
import { combatSummary, SENT_SHOW_MS, staleText, turnLine } from '../stage/table-bar-model.js';
import { flash } from './flash.js';

export const PULSE_MS = 2500;
export const COMBAT_EVENT = 'forja:combat';     // {campaignId, combat}: o combate completo que voltou de uma ação
const TV_LOCAL_TTL = 30_000;

export const TableContext = createContext(null);
/** A loja da mesa (null fora da casca do mestre: quem usa cai no comportamento antigo). */
export const useTable = () => useContext(TableContext);

function emitCombat(campaignId, combat) {
  if (!combat || typeof window === 'undefined') return;
  try { window.dispatchEvent(new CustomEvent(COMBAT_EVENT, { detail: { campaignId, combat } })); } catch { /* ok */ }
}

/**
 * @param {object} campaign  a campanha (só o id e o idioma importam aqui)
 * @param {{enabled: boolean, lang: string, onPulse?: (pulse, {revChanged}) => void}} opts
 */
export function useTableStore(campaign, { enabled, lang = 'pt', onPulse } = {}) {
  const id = campaign?.id ?? null;
  const [pulse, setPulse] = useState(null);
  const [lastOkAt, setLastOkAt] = useState(0);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState('');
  const [rollSeen, setRollSeen] = useState(null);     // {id, at}: at = 0 para a que já existia ao abrir
  const [sending, setSending] = useState(null);       // {state:'sending'|'sent', name, at}
  const [localTv, setLocalTv] = useState(0);
  const busyRef = useRef('');
  const pulseRef = useRef(null);
  const sigRef = useRef('');
  const revRef = useRef(null);
  const onPulseRef = useRef(onPulse);
  onPulseRef.current = onPulse;
  const kick = useRef(() => {});
  const live = !!enabled && id != null && !missing;

  // Trocou de campanha: zera.
  useEffect(() => {
    setPulse(null); pulseRef.current = null; sigRef.current = ''; revRef.current = null;
    setRollSeen(null); setSending(null); setMissing(false); setLastOkAt(0);
  }, [id]);

  // O laço do pulso (pausa com a aba escondida, como o usePolling).
  useEffect(() => {
    if (!live) return undefined;
    let alive = true;
    let timer = null;
    const tick = async () => {
      clearTimeout(timer);
      if (!alive) return;
      if (typeof document !== 'undefined' && document.hidden) { timer = setTimeout(tick, PULSE_MS); return; }
      try {
        const p = await api.getPulse(id);
        if (!alive) return;
        setLastOkAt(Date.now());
        const sig = JSON.stringify(p);
        if (sig !== sigRef.current) {       // 304: o mesmo corpo → nada a desenhar
          sigRef.current = sig;
          pulseRef.current = p;
          setPulse(p);
          const roll = p?.screen?.roll;
          setRollSeen(prev => {
            if (!roll) return prev;
            if (!prev) return { id: roll.id, at: 0 };        // ao abrir: nada é reprisado
            return prev.id === roll.id ? prev : { id: roll.id, at: Date.now() };
          });
        }
        const revChanged = revRef.current != null && p?.rev !== revRef.current;
        revRef.current = p?.rev ?? revRef.current;
        onPulseRef.current?.(p, { revChanged });
      } catch (e) {
        if (!alive) return;
        // Servidor sem a rota (deploy fora de ordem) ou sem permissão: volta ao GET completo.
        if ([403, 404, 405, 501].includes(e?.status)) { setMissing(true); return; }
      }
      if (alive) timer = setTimeout(tick, PULSE_MS);
    };
    kick.current = () => { clearTimeout(timer); tick(); };
    tick();
    const onVis = () => { if (!document.hidden) { clearTimeout(timer); tick(); } };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      clearTimeout(timer);
      kick.current = () => {};
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [live, id]);

  const refresh = useCallback(() => kick.current(), []);

  // "Enviando…" / "Na tela ✓" do último 📺 (os 9 lugares passam pelo stage-api).
  useEffect(() => {
    if (!live || typeof window === 'undefined') return undefined;
    const mine = (e) => String(e.detail?.campaignId) === String(id);
    const onSending = (e) => { if (mine(e)) setSending({ state: 'sending', name: '', at: Date.now() }); };
    const onSent = (e) => {
      if (!mine(e)) return;
      const front = e.detail?.stage?.front;
      setSending({ state: 'sent', name: front ? frontLabel(front, lang, { dm: true }) : '', at: Date.now() });
      refresh();
    };
    window.addEventListener(STAGE_SENDING_EVENT, onSending);
    window.addEventListener(STAGE_EVENT, onSent);
    return () => { window.removeEventListener(STAGE_SENDING_EVENT, onSending); window.removeEventListener(STAGE_EVENT, onSent); };
  }, [live, id, lang, refresh]);
  useEffect(() => {
    if (!sending) return undefined;
    // "Enviando…" que não terminou (falhou: o aviso do stage-api diz o motivo) some em 8 s.
    const t = setTimeout(() => setSending(null), sending.state === 'sending' ? 8000 : SENT_SHOW_MS);
    return () => clearTimeout(t);
  }, [sending]);

  // TV no mesmo navegador (notebook ligado na TV por HDMI): conta sem servidor.
  useEffect(() => {
    if (!live || typeof BroadcastChannel === 'undefined') return undefined;
    const tabs = new Map();
    let ch;
    try { ch = new BroadcastChannel(`forja-tv-${id}`); } catch { return undefined; }
    const count = () => {
      const now = Date.now();
      for (const [k, at] of tabs) if (now - at > TV_LOCAL_TTL) tabs.delete(k);
      setLocalTv(tabs.size);
    };
    ch.onmessage = (e) => { if (e.data?.tab) { tabs.set(String(e.data.tab), Date.now()); count(); } };
    const t = setInterval(count, 5000);
    return () => { clearInterval(t); try { ch.close(); } catch { /* ok */ } };
  }, [live, id]);

  /** O combate completo que voltou de uma ação: atualiza a barra e avisa Jogar › Combate. */
  const applyCombat = useCallback((full) => {
    if (!full) return;
    const summary = combatSummary(full);
    pulseRef.current = pulseRef.current ? { ...pulseRef.current, combat: summary } : pulseRef.current;
    setPulse(p => (p ? { ...p, combat: summary } : p));
    emitCombat(id, full);
  }, [id]);

  const failed = useCallback((e, retry) => {
    flash(`${L(lang, 'Não enviado', 'Not sent')} · ${errorMessage(e, lang, L(lang, 'confira a conexão', 'check the connection'))}`, {
      error: true, action: { label: L(lang, 'Tentar de novo', 'Try again'), onClick: retry },
    });
  }, [lang]);

  /** Próximo turno ('next') ou ↶ Voltar turno ('prev'), com a vez que o mestre está vendo. */
  const turn = useCallback(async (kind, expectArg) => {
    if (busyRef.current || id == null) return;
    const c = pulseRef.current?.combat;
    const expect = expectArg || (c?.active ? { round: c.round, turnIndex: c.turnIndex } : null);
    if (!expect) return;
    busyRef.current = kind; setBusy(kind);
    try {
      const r = kind === 'prev' ? await api.combatPrevTurn(id, expect) : await api.combatNextTurn(id, expect);
      applyCombat(r?.combat);
      const s = combatSummary(r?.combat);
      if (kind === 'prev') flash(`↶ ${L(lang, 'Turno desfeito', 'Turn undone')} · ${turnLine(s, lang)}`);
      else {
        flash(turnLine(s, lang), {
          action: { label: L(lang, '↶ Voltar turno', '↶ Undo turn'), onClick: () => turnRef.current('prev') },
        });
      }
    } catch (e) {
      const code = e?.data?.error;
      if (e?.status === 409 && code === 'stale_turn') {
        applyCombat(e.data.combat);
        flash(staleText(combatSummary(e.data.combat), lang), { error: true });
      } else if (e?.status === 409 && code === 'nothing_to_undo') {
        applyCombat(e.data.combat);
        flash(L(lang, 'Não há turno para voltar.', 'There is no turn to go back to.'), { error: true });
      } else {
        failed(e, () => turnRef.current(kind, expect));
      }
    } finally {
      busyRef.current = ''; setBusy('');
      refresh();
    }
  }, [id, lang, applyCombat, failed, refresh]);
  const turnRef = useRef(turn);
  turnRef.current = turn;

  /** ▶ Iniciar (combate montado e parado). */
  const startCombat = useCallback(async () => {
    if (busyRef.current || id == null) return;
    busyRef.current = 'start'; setBusy('start');
    try { const r = await api.startCombat(id); applyCombat(r?.combat); }
    catch (e) { failed(e, () => startRef.current()); }
    finally { busyRef.current = ''; setBusy(''); refresh(); }
  }, [id, applyCombat, failed, refresh]);
  const startRef = useRef(startCombat);
  startRef.current = startCombat;

  const tvLive = Math.max(pulse?.screen?.tvLive || 0, localTv);
  // Uma TV já apareceu nesta visita? (a barra troca o convite por "○ Nenhuma TV detectada")
  const [tvSeen, setTvSeen] = useState(false);
  useEffect(() => { if (tvLive > 0) setTvSeen(true); }, [tvLive]);
  useEffect(() => { setTvSeen(false); }, [id]);
  return useMemo(() => ({
    enabled: live, missing, pulse, lastOkAt, tvLive, tvSeen, rollSeen, sending, busy,
    combat: pulse?.combat || null,
    refresh, applyCombat,
    nextTurn: (expect) => turn('next', expect),
    prevTurn: (expect) => turn('prev', expect),
    startCombat,
  }), [live, missing, pulse, lastOkAt, tvLive, tvSeen, rollSeen, sending, busy, refresh, applyCombat, turn, startCombat]);
}

/**
 * Busca algo só quando a versão do pulso muda (e 1 vez por minuto, de segurança).
 * Sem a loja (tela antiga, servidor sem pulso): cai no polling de `fallbackMs`.
 *   useOnRev(table?.pulse?.checksRev, load, { table, fallbackMs: 6000 })
 * `initial: false`: quem chama já busca ao abrir (não repete a 1ª busca).
 * Devolve `see(rev)`: marca uma versão que já chegou por outro caminho (a resposta
 * de uma ação) como vista, para o pulso não buscar a mesma coisa de novo.
 */
export function useOnRev(rev, fn, { table, fallbackMs = 2500, safetyMs = 60_000, initial = true } = {}) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const pulsing = !!table?.enabled && !!table?.pulse;
  const seen = useRef(undefined);   // undefined = ainda não viu nenhuma versão
  useEffect(() => {
    if (!pulsing) { seen.current = undefined; return; }
    const key = rev ?? null;
    if (seen.current === key) return;
    const first = seen.current === undefined;
    seen.current = key;
    if (first && (!initial || key === null)) return;
    fnRef.current();
  }, [pulsing, rev, initial]);
  useEffect(() => {
    const ms = pulsing ? safetyMs : fallbackMs;
    let alive = true;
    let timer = null;
    const tick = async () => {
      if (!alive) return;
      if (!document.hidden) { try { await fnRef.current(); } catch { /* o próximo tenta de novo */ } }
      if (alive) timer = setTimeout(tick, ms);
    };
    // Com o pulso, a 1ª busca vem do efeito de cima; sem ele, já busca agora.
    timer = setTimeout(tick, pulsing ? ms : (initial ? 0 : ms));
    return () => { alive = false; clearTimeout(timer); };
  }, [pulsing, fallbackMs, safetyMs, initial]);
  return useCallback((key) => { if (seen.current !== undefined && key != null) seen.current = key; }, []);
}
