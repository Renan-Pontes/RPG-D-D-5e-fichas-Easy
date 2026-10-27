/* Rolador de dados: botão flutuante + sheet inferior + overlay com dado 3D.
 *
 * - Sheet inferior sem fundo escuro: não bloqueia a ficha (dá pra tocar numa
 *   perícia com ele aberto); o body ganha padding para rolar o conteúdo acima.
 * - Fecha por X, alça (toque/arrastar pra baixo) ou Esc.
 * - Fórmula rápida ("2d6+3"), vantagem/desvantagem, histórico recente (local).
 * - API global usada pela ficha:
 *     window.__diceRoll({ die, count, mod, label, advMode })  → rola local
 *     window.__diceShow({ label, groups, mod, total, isCrit, isFumble, who })
 *       → só MOSTRA um resultado já decidido (servidor, mestre, dado físico).
 *     window.__diceOpen() → abre o rolador (o 🎲 da barra da mesa e da janela da
 *       Tela, V4: com a barra à vista, o botão flutuante some — o CSS da barra o
 *       esconde — e o dado mora nela).
 * - Mestre na campanha (V10, src/dice/dice-table.js): no topo, numa fileira só
 *   (com rolagem lateral própria, para os dados continuarem à vista a 320×568),
 *   "🔒 Só eu · 📺 Na tela" (lembrado por campanha; o padrão é a regra "Do mestre"
 *   do palco) e "Para quê?" (Ataque, Dano, Salvaguarda, Sorte). Os toques do rolador
 *   vão ao servidor (dados preparados valem, o DiceLog registra): Na tela → a TV
 *   mostra o dado com "Mestre"; Só eu → só o registro dele. Servidor lento: aos 1,5 s
 *   "Enviando… (a Tela está lenta)" e o resultado do servidor quando chegar; sem rede,
 *   rola no aparelho e avisa "não foi à Tela" (sendFailure). A dica e os avisos moram
 *   numa linha reservada logo abaixo dos dados. O `__diceRoll` da ficha continua local.
 * - Ficha numa campanha (V15, src/dice/sheet-roll.js; decisão D-1 do dono): a rolagem
 *   continua LOCAL e instantânea (crítico/falha, histórico e vantagem como sempre; os
 *   dados preparados do mestre não valem). Depois de aparecer, sem bloquear nada, o
 *   resultado vai pronto para a fila da Tela: os botões da ficha (`__diceRoll` com
 *   `sheet: true`) e os toques deste rolador com a ficha aberta. No topo, "📺 Na Tela ·
 *   🔒 Só eu" (o mesmo da faixa da campanha na ficha, lembrado por personagem; Só eu
 *   nunca sai do aparelho); a linha abaixo dos dados diz "📺 Na Tela ✓" quando chegou
 *   ou, discreto, "não foi para a Tela". O "PV de nível" (LevelUpModal) não vai.
 */
import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import Icon from './Icons.jsx';
import { t } from '../data/i18n.js';
import DieShape from '../src/dice/DieShape.jsx';
import DiceStage, { preloadDice3D, effectiveAnimMode } from '../src/dice/DiceStage.jsx';
import { parseFormula, rollFormula, breakdown, formatMod } from '../src/dice/dice-math.js';
import {
  deviceOffline, getDiceTable, presetFromServer, purposeLabel, PURPOSES, readTarget, rollBody, sendFailure,
  SLOW_MS, subscribeDiceTable, writeTarget,
} from '../src/dice/dice-table.js';
import { api } from '../src/api/client.js';
import {
  createSender, getSheetRolls, noteFor, planSheetRoll, setSheetSecret, subscribeSheetRolls,
} from '../src/dice/sheet-roll.js';
import {
  getAnimPref, setAnimPref, loadHistory, saveHistory, loadRecentFormulas, saveRecentFormulas,
} from '../src/dice/dice-prefs.js';
import '../src/dice/dice-styles.css';

const DICE = [4, 6, 8, 10, 12, 20, 100];
const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
const ANIM_NEXT = { '3d': '2d', '2d': 'off', off: '3d' };
// Um envio para o app inteiro (espaça os POSTs da ficha; nunca tenta de novo).
const sheetSend = createSender({ post: (characterId, body) => api.sheetRoll(characterId, body) });

function nowLabel(lang) {
  return new Date().toLocaleTimeString(lang === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

// Visual "Ficha Forjada" (src/dice/dice-styles.css): d20 em traço no botão dourado.
const FabD20 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12,2 21.5,7.5 21.5,16.5 12,22 2.5,16.5 2.5,7.5"/>
    <polygon points="12,7 17,15 7,15"/>
    <path d="M12 2v5M21.5 7.5 17 15M2.5 7.5 7 15M12 22v-2.5M7 15l-4.5 1.5M17 15l4.5 1.5M7 15l5 4.5 5-4.5"/>
  </svg>
);
// Rótulo que é só a fórmula ("1d20", "2d6+3"): em mono — no Cinzel "1D20" vira "ID20".
const isFormulaLabel = (e) => !!e && !e.who && !!e.formula && e.label === e.formula;
// Faíscas do crítico (decorativas; somem com movimento reduzido)
const SPARKS = Array.from({ length: 14 }, (_, i) => i);
// Para onde foi a rolagem do mestre (V10): o texto vai junto do resultado.
const tableNoteText = (note, lang) => ({
  shown: L(lang, '📺 Na tela ✓', '📺 On screen ✓'),
  'player-shown': L(lang, '📺 Apareceu na Tela', '📺 Shown on the screen'),
  secret: L(lang, '🔒 Só você viu', '🔒 Only you saw it'),
  offline: L(lang, '⚠ Sem conexão: rolado no aparelho, não foi à Tela', '⚠ Offline: rolled on this device, not sent to the screen'),
  'offline-secret': L(lang, '⚠ Sem conexão: rolado no aparelho, fora do registro', '⚠ Offline: rolled on this device, not logged'),
  refused: L(lang, '⚠ O servidor não aceitou: rolado no aparelho, não foi à Tela', '⚠ The server refused: rolled on this device, not sent to the screen'),
  'refused-secret': L(lang, '⚠ O servidor não aceitou: rolado no aparelho, fora do registro', '⚠ The server refused: rolled on this device, not logged'),
  timeout: L(lang, '⚠ A Tela não respondeu. Confira a TV antes de rolar de novo.', '⚠ The screen did not answer. Check the TV before rolling again.'),
  'timeout-secret': L(lang, '⚠ O servidor não respondeu: rolado no aparelho', '⚠ The server did not answer: rolled on this device'),
  local: L(lang, '⚠ Fórmula grande demais para a Tela: rolado no aparelho', '⚠ Formula too big for the screen: rolled on this device'),
  // rolagens da ficha (V15): o resultado já está na tela; isto só diz onde ele foi
  'sheet-shown': L(lang, '📺 Na Tela ✓', '📺 On screen ✓'),
  'sheet-secret': L(lang, '🔒 Só você viu', '🔒 Only you saw it'),
  'sheet-failed': L(lang, 'Não foi para a Tela', 'Did not reach the screen'),
}[note] || '');

const DiceRoller = ({ lang }) => {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [mod, setMod] = useState(0);
  const [advMode, setAdvMode] = useState('normal');
  const [formula, setFormula] = useState('');
  const [formulaError, setFormulaError] = useState(false);
  const [log, setLog] = useState(() => loadHistory());
  const [recent, setRecent] = useState(() => loadRecentFormulas());
  const [overlay, setOverlay] = useState(null);
  const [pop, setPop] = useState(null);
  const [animPref, setAnimPrefState] = useState(() => getAnimPref());
  const [showHistory, setShowHistory] = useState(false);
  const [fabHidden, setFabHidden] = useState(false);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef(null);
  const draggedRef = useRef(false);
  const sheetRef = useRef(null);
  // Mestre na campanha: a mesa (dice-table.js), o destino (🔒/📺) e o "Para quê?"
  const [table, setTable] = useState(() => getDiceTable());
  useEffect(() => subscribeDiceTable(setTable), []);
  const [target, setTargetState] = useState(() => readTarget(getDiceTable()));
  useEffect(() => { setTargetState(readTarget(table)); }, [table?.campaignId, table?.dmDefault]); // eslint-disable-line react-hooks/exhaustive-deps
  const [purpose, setPurpose] = useState('');
  const [sending, setSending] = useState(false);
  const [slow, setSlow] = useState(false);       // passou de 1,5 s sem resposta
  const [notice, setNotice] = useState(null);    // aviso sem resultado (a Tela não respondeu)
  const [hintFor, setHintFor] = useState(null);  // trocou 🔒/📺 depois desta rolagem: a linha volta à dica
  const sendingRef = useRef(false);
  // Ficha de um personagem em campanha aberta (V15): a mesa da ficha
  const sheet = useSyncExternalStore(subscribeSheetRolls, getSheetRolls, getSheetRolls);
  const sheetMode = !table && !!sheet;

  useEffect(() => { saveHistory(log); }, [log]);

  // Mostra um resultado pronto (overlay 3D/2D ou pop discreto) e registra no histórico.
  const present = useCallback((entry) => {
    const full = { id: Date.now() + Math.random(), ts: nowLabel(lang), ...entry };
    setLog(prev => [full, ...prev].slice(0, 30));
    if (effectiveAnimMode(animPref) === 'off') {
      // Sem animação o resultado aparece na hora: o tremor do crítico vem junto.
      if (navigator.vibrate) navigator.vibrate(full.isCrit ? [60, 40, 100] : 30);
      setOverlay(null);
      setPop(full);
    } else {
      // Com o dado rolando, o tremor do crítico espera ele parar (onSettled do overlay).
      if (navigator.vibrate) navigator.vibrate(30);
      setPop(null);
      setOverlay({ ...full, settled: false });
    }
    return full;
  }, [lang, animPref]);

  // Um resultado já à vista ganha o aviso de para onde foi (a resposta chega depois).
  const patchEntry = useCallback((id, patch) => {
    setLog(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));
    setOverlay(prev => (prev && prev.id === id ? { ...prev, ...patch } : prev));
    setPop(prev => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  }, []);

  // Rolagem da ficha → fila da Tela, DEPOIS de aparecer e sem esperar (V15).
  const toTable = useCallback((entry) => {
    const ctx = getSheetRolls();
    const plan = planSheetRoll(ctx, entry);
    if (plan.skip === 'secret') { patchEntry(entry.id, { tableNote: noteFor('secret') }); return; }
    if (!plan.body) return;
    sheetSend(ctx.characterId, plan.body).then((outcome) => {
      const note = noteFor(outcome);
      if (note) patchEntry(entry.id, { tableNote: note });
    });
  }, [patchEntry]);

  const rollParsed = useCallback((parsed, { label, adv = 'normal' } = {}) => {
    const r = rollFormula(parsed, { adv });
    return present({
      label: label || parsed.text,
      formula: parsed.text,
      groups: r.groups.map(g => ({ die: g.sides, sign: g.sign, rolls: g.rolls })),
      mod: r.mod, total: r.total, isCrit: r.isCrit, isFumble: r.isFumble, adv: r.adv,
    });
  }, [present]);

  // Compatível com a ficha: { die, count, mod, label, advMode }. `sheet`: é um botão da
  // ficha (perícia, salvaguarda, ataque, dano, iniciativa) e vai à Tela (V15).
  const performRoll = useCallback(({ die = 20, count: cnt = 1, mod: m = 0, label = '', advMode: am, sheet: fromSheet } = {}) => {
    const parsed = parseFormula(`${cnt}d${die}${formatMod(m)}`);
    if (!parsed) return null;
    const entry = rollParsed(parsed, { label, adv: am ?? advMode });
    if (fromSheet && entry) toTable(entry);
    return entry;
  }, [rollParsed, advMode, toTable]);

  // Os toques do rolador. Mestre na campanha: pelo servidor (📺 Na tela ou 🔒 Só eu).
  // Lento não é sem rede: o pedido não é cortado (a TV mostraria o número do servidor);
  // aos 1,5 s o aviso "a Tela está lenta". Sem rede, no aparelho com o aviso. Fora: local.
  const rollUi = useCallback(async (parsed, { label, adv = 'normal' } = {}) => {
    if (!table) {
      // jogador: no aparelho, e da ficha aberta também à Tela (toTable não faz nada sem ela)
      const entry = rollParsed(parsed, { label, adv });
      if (entry) toTable(entry);
      return entry;
    }
    if (sendingRef.current) return null;
    const text = label || purposeLabel(purpose, lang) || parsed.text;
    const shown = target === 'shown';
    const show = (r, extra) => present({
      label: text, formula: parsed.text,
      groups: r.groups.map(g => ({ die: g.sides, sign: g.sign, rolls: g.rolls })),
      mod: r.mod, total: r.total, isCrit: r.isCrit, isFumble: r.isFumble, adv: r.adv, ...extra,
    });
    setNotice(null);
    const body = rollBody(table, parsed, { label: text, adv, shown });
    if (!body) return show(rollFormula(parsed, { adv }), { tableNote: 'local' });
    if (deviceOffline()) return show(rollFormula(parsed, { adv }), { tableNote: shown ? 'offline' : 'offline-secret' });
    sendingRef.current = true; setSending(true);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_MS);
    try {
      const res = await api.rollDice(body);
      const r = rollFormula(parsed, { adv: body.adv || 'normal', preset: presetFromServer(res) });
      return show(r, { source: 'server', tableNote: res?.shown ? 'shown' : 'secret' });
    } catch (err) {
      const fail = sendFailure(err, { shown });
      if (!fail.local) { setNotice(fail.note); return null; }
      return show(rollFormula(parsed, { adv }), { tableNote: fail.note });
    } finally {
      clearTimeout(slowTimer);
      sendingRef.current = false; setSending(false); setSlow(false);
    }
  }, [table, purpose, target, lang, rollParsed, present, toTable]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickTarget = (v) => { setTargetState(v); writeTarget(table, v); setNotice(null); setHintFor(log[0]?.id ?? null); };
  const pickSheet = (v) => { setSheetSecret(v === 'secret'); setHintFor(log[0]?.id ?? null); };

  const showResult = useCallback((res = {}) => present({
    label: res.label || '',
    who: res.who || '',
    formula: res.formula || '',
    groups: res.groups || [],
    mod: res.mod || 0,
    total: res.total,
    isCrit: !!res.isCrit,
    isFumble: !!res.isFumble,
    adv: res.adv || 'normal',
    source: res.source || 'server',
    tableNote: res.tableNote,
  }), [present]);

  useEffect(() => {
    window.__diceRoll = performRoll;
    window.__diceShow = showResult;
    window.__diceOpen = () => setOpen(true);
    return () => { window.__diceRoll = null; window.__diceShow = null; window.__diceOpen = null; };
  }, [performRoll, showResult]);

  // Sheet aberto: pré-carrega o 3D e reserva espaço no fim da página.
  useEffect(() => {
    if (!open) { document.body.style.removeProperty('--dice-sheet-h'); document.body.classList.remove('dice-sheet-open'); return undefined; }
    if (effectiveAnimMode(animPref) === '3d') preloadDice3D().catch(() => {});
    document.body.classList.add('dice-sheet-open');
    const el = sheetRef.current;
    const setH = () => el && document.body.style.setProperty('--dice-sheet-h', `${el.offsetHeight}px`);
    setH();
    const ro = typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(setH) : null;
    ro?.observe(el);
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      ro?.disconnect();
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('dice-sheet-open');
      document.body.style.removeProperty('--dice-sheet-h');
    };
  }, [open, animPref]);

  // Botão flutuante some ao rolar pra baixo (não cobre botões) e volta ao subir.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 8) return;
      setFabHidden(y > lastY && y > 120);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Com a página parada, o botão não pode ficar em cima de outro botão/campo
  // (ex.: "Descanso curto" no canto da Mesa agora): se houver algo clicável
  // embaixo dele, ele sobe o suficiente para liberar esse controle.
  // Exceção: o que estiver dentro de [data-fab-pass] (selos de atributo e listas de
  // salvaguardas/perícias da ficha) não faz o botão subir. Nessas listas de linhas-botão
  // coladas o desvio virava um salto até o meio da tela a cada parada; ali o botão fica
  // no canto e o CSS da ficha deixa a coluna do bônus fora da faixa dele no celular.
  // Só abaixo de 1024 px (ficha em uma coluna): no desktop a aba Jogar tem duas colunas
  // e o selo de Carisma fica na faixa do botão, então ali ele volta a desviar.
  const fabRef = useRef(null);
  const [fabLift, setFabLift] = useState(0);
  const liftRef = useRef(0);
  useEffect(() => {
    if (open) return undefined;
    const INTERACTIVE = 'button, a[href], input, select, textarea, summary, label, [role="button"], [role="tab"], [role="checkbox"], [tabindex]:not([tabindex="-1"])';
    const blockerTop = (rect) => {
      let top = null;
      const pass = window.matchMedia?.('(max-width: 1023px)').matches;
      const skip = pass ? '.dice-fab, .dice-sheet, [data-fab-pass]' : '.dice-fab, .dice-sheet';
      const xs = [rect.left + 6, rect.left + rect.width / 2, rect.right - 6];
      const ys = [rect.top + 6, rect.top + rect.height / 2, rect.bottom - 6];
      for (const x of xs) for (const y of ys) {
        for (const el of document.elementsFromPoint(x, y)) {
          if (fabRef.current && (el === fabRef.current || fabRef.current.contains(el))) continue;
          const hit = el.closest(INTERACTIVE);
          if (hit && !hit.closest(skip)) {
            const r = hit.getBoundingClientRect();
            top = top == null ? r.top : Math.min(top, r.top);
          }
          break; // só o elemento visível logo abaixo do botão
        }
      }
      return top;
    };
    const check = () => {
      const fab = fabRef.current;
      if (!fab || fab.classList.contains('is-hidden')) return;
      const cur = fab.getBoundingClientRect();
      const base = { left: cur.left, right: cur.right, top: cur.top + liftRef.current, bottom: cur.bottom + liftRef.current, width: cur.width, height: cur.height };
      // Sobe até 7 vezes (sem passar de 45% da tela) e cada posição nova é conferida antes de valer. Se nenhuma
      // ficar livre (ex.: linhas-botão coladas, como as perícias), fica no canto: subir
      // até o meio da tela e continuar cobrindo uma linha é pior que não mexer.
      let lift = 0;
      let free = false;
      for (let i = 0; i < 8; i++) {
        const r = { ...base, top: base.top - lift, bottom: base.bottom - lift };
        const top = blockerTop(r);
        if (top == null) { free = true; break; }
        if (i === 7) break;
        lift = base.bottom - top + 8;
        if (lift > window.innerHeight * 0.45) break; // não dá pra desviar: fica onde está
      }
      lift = free ? Math.max(0, Math.round(lift)) : 0;
      if (lift !== liftRef.current) { liftRef.current = lift; setFabLift(lift); }
    };
    let timer = null;
    const schedule = () => { clearTimeout(timer); timer = setTimeout(check, 180); };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(schedule) : null;
    mo?.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      mo?.disconnect();
    };
  }, [open]);

  // Overlay: fecha sozinho alguns segundos depois de parar.
  useEffect(() => {
    if (!overlay?.settled) return undefined;
    const id = setTimeout(() => setOverlay(null), overlay.isCrit || overlay.isFumble ? 5000 : 3500);
    return () => clearTimeout(id);
  }, [overlay?.settled, overlay?.id]);

  useEffect(() => {
    if (!pop) return undefined;
    const id = setTimeout(() => setPop(null), 3500);
    return () => clearTimeout(id);
  }, [pop?.id]);

  const submitFormula = (e) => {
    e?.preventDefault?.();
    const parsed = parseFormula(formula);
    if (!parsed) { setFormulaError(true); return; }
    setFormulaError(false);
    rollUi(parsed, { adv: advMode });
    const next = [parsed.text, ...recent.filter(f => f !== parsed.text)].slice(0, 6);
    setRecent(next);
    saveRecentFormulas(next);
  };

  const repeat = (entry) => {
    const parsed = entry.formula && parseFormula(entry.formula);
    if (parsed) rollUi(parsed, { label: entry.label, adv: entry.adv || 'normal' });
  };

  const cycleAnim = () => {
    const next = ANIM_NEXT[animPref] || '3d';
    setAnimPrefState(next);
    setAnimPref(next);
  };

  // Arrastar a alça pra baixo fecha.
  const onDragStart = (e) => {
    dragStart.current = e.clientY;
    draggedRef.current = false;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* ok */ }
  };
  const onDragMove = (e) => {
    if (dragStart.current == null) return;
    const dy = Math.max(0, e.clientY - dragStart.current);
    if (dy > 6) draggedRef.current = true;
    setDrag(dy);
  };
  const onDragEnd = () => {
    if (dragStart.current == null) return;
    const moved = drag;
    dragStart.current = null;
    setDrag(0);
    if (moved > 70) setOpen(false);
  };

  const last = log[0];
  // A linha reservada abaixo dos dados (mesa ligada): enviando › aviso › onde foi a
  // última rolagem › a dica do destino escolhido.
  const tableLine = !table ? '' : sending
    ? (slow ? L(lang, 'Enviando… (a Tela está lenta)', 'Sending… (the screen is slow)') : L(lang, 'Enviando…', 'Sending…'))
    : notice ? tableNoteText(notice, lang)
      : last?.tableNote && last.id !== hintFor ? tableNoteText(last.tableNote, lang)
        : target === 'shown'
          ? L(lang, 'A TV mostra o dado grande com “Mestre”.', 'The TV shows the big die as “GM”.')
          : L(lang, 'Só você vê; fica no seu registro de rolagens.', 'Only you see it; it stays in your roll log.');
  const tableTone = sending ? (slow ? 'slow' : 'sending') : notice || (last?.id !== hintFor && last?.tableNote) || 'hint';
  // A mesma linha com a ficha aberta (V15): onde foi a última rolagem da ficha › a dica.
  const sheetNote = sheetMode && last?.id !== hintFor && /^sheet-/.test(last?.tableNote || '') ? last.tableNote : '';
  const sheetLine = !sheetMode ? '' : sheetNote ? tableNoteText(sheetNote, lang)
    : sheet.secret ? L(lang, 'Só você vê o que rola nesta ficha: nada sai do aparelho.', 'Only you see what you roll on this sheet: nothing leaves this device.')
      : sheet.allowed === false ? L(lang, 'O mestre deixou as rolagens das fichas fora da Tela.', 'The GM keeps sheet rolls off the screen.')
        : L(lang, `Na sessão ao vivo, a Tela da mesa mostra o que ${sheet.name || 'a ficha'} rola.`, `During the live session, the table screen shows what ${sheet.name || 'this sheet'} rolls.`);
  const animLabel = { '3d': '3D', '2d': '2D', off: L(lang, 'Sem animação', 'No animation') }[animPref];

  return (
    <>
      {!open && (
        <button
          ref={fabRef}
          className={`dice-fab no-print ${fabHidden ? 'is-hidden' : ''}`}
          style={fabLift ? { marginBottom: fabLift } : undefined}
          onClick={() => setOpen(true)}
          title={t('rollDice', lang)}
          aria-label={t('rollDice', lang)}
          aria-expanded={false}
        >
          <FabD20 />
        </button>
      )}

      {open && (
        <section
          ref={sheetRef}
          className={`dice-sheet no-print ${table || sheetMode ? 'has-table' : ''}`}
          role="dialog"
          aria-modal="false"
          aria-label={t('rollDice', lang)}
          style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
        >
          <div
            className="dice-sheet-grip"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            onClick={() => { if (!draggedRef.current) setOpen(false); draggedRef.current = false; }}
            role="button"
            tabIndex={0}
            aria-label={L(lang, 'Fechar rolador', 'Close roller')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen(false); }}
          >
            <span className="dice-sheet-handle" />
          </div>

          <header className="dice-sheet-head">
            <strong className="dice-sheet-title">{t('rollDice', lang)}</strong>
            <button type="button" className="dice-sheet-anim" onClick={cycleAnim}
              title={L(lang, 'Animação dos dados (toque para trocar)', 'Dice animation (tap to change)')}>
              🎬 {animLabel}
            </button>
            <button type="button" className="dice-sheet-close" onClick={() => setOpen(false)} aria-label={L(lang, 'Fechar', 'Close')}>
              <Icon name="x" size={20}/>
            </button>
          </header>

          <div className="dice-sheet-body">
            {table && (
              <div className="dice-table">
                <div className="dice-target" role="radiogroup" aria-label={L(lang, 'Quem vê a rolagem', 'Who sees the roll')}>
                  {[['secret', L(lang, '🔒 Só eu', '🔒 Only me')], ['shown', L(lang, '📺 Na tela', '📺 On screen')]].map(([v, lbl]) => (
                    <button key={v} type="button" role="radio" aria-checked={target === v}
                      className={`dice-target-btn ${target === v ? 'active' : ''}`} onClick={() => pickTarget(v)}>{lbl}</button>
                  ))}
                </div>
                <div className="dice-purpose" role="group" aria-label={L(lang, 'Para quê?', 'What for?')}>
                  <span className="dice-purpose-label">{L(lang, 'Para quê?', 'What for?')}</span>
                  {PURPOSES.map(([k]) => (
                    <button key={k} type="button" aria-pressed={purpose === k}
                      className={`dice-purpose-chip ${purpose === k ? 'active' : ''}`}
                      onClick={() => setPurpose(purpose === k ? '' : k)}>{purposeLabel(k, lang)}</button>
                  ))}
                </div>
              </div>
            )}
            {sheetMode && (
              <div className="dice-table">
                <div className="dice-target" role="radiogroup" aria-label={L(lang, 'Quem vê o que a ficha rola', 'Who sees what the sheet rolls')}>
                  {[['shown', L(lang, '📺 Na Tela', '📺 On screen')], ['secret', L(lang, '🔒 Só eu', '🔒 Only me')]].map(([v, lbl]) => (
                    <button key={v} type="button" role="radio" aria-checked={(sheet.secret ? 'secret' : 'shown') === v}
                      className={`dice-target-btn ${(sheet.secret ? 'secret' : 'shown') === v ? 'active' : ''}`} onClick={() => pickSheet(v)}>{lbl}</button>
                  ))}
                </div>
              </div>
            )}
            {last && (
              <button type="button" className={`dice-last ${last.isCrit ? 'crit' : ''} ${last.isFumble ? 'fumble' : ''}`}
                onClick={() => repeat(last)} disabled={!last.formula}
                title={last.formula ? L(lang, 'Rolar de novo', 'Roll again') : undefined}>
                <span className="dice-last-text">
                  <span className={`dice-last-label${isFormulaLabel(last) ? ' is-formula' : ''}`}>{last.who ? `${last.who} · ` : ''}{last.label}</span>
                  <span className="dice-last-detail">{breakdown(last)}</span>
                </span>
                <span className="dice-last-total">{last.total}</span>
              </button>
            )}

            <form className="dice-formula" onSubmit={submitFormula}>
              <input
                className={`input dice-formula-input ${formulaError ? 'is-error' : ''}`}
                value={formula}
                onChange={e => { setFormula(e.target.value); setFormulaError(false); }}
                placeholder={L(lang, 'Fórmula: 2d6+3', 'Formula: 2d6+3')}
                aria-label={L(lang, 'Fórmula de dados', 'Dice formula')}
                autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="go"
              />
              <button type="submit" className="btn btn-primary dice-formula-go" disabled={sending}>{sending ? '…' : L(lang, 'Rolar', 'Roll')}</button>
            </form>
            {formulaError && (
              <div className="dice-formula-hint" role="alert">
                {L(lang, 'Use algo como 1d20+5, 2d6+3 ou 4d6.', 'Try 1d20+5, 2d6+3 or 4d6.')}
              </div>
            )}
            {recent.length > 0 && (
              <div className="dice-chips" aria-label={L(lang, 'Fórmulas recentes', 'Recent formulas')}>
                {recent.map(f => (
                  <button key={f} type="button" className="dice-chip" disabled={sending} onClick={() => { const p = parseFormula(f); if (p) rollUi(p, { adv: advMode }); }}>
                    {f}
                  </button>
                ))}
              </div>
            )}

            <div className="adv-toggle" role="group" aria-label={L(lang, 'Vantagem', 'Advantage')}>
              <button type="button" className={advMode === 'dis' ? 'active dis' : ''} aria-pressed={advMode === 'dis'}
                onClick={() => setAdvMode(advMode === 'dis' ? 'normal' : 'dis')}>
                {t('disadvantage', lang)}
              </button>
              <button type="button" className={advMode === 'normal' ? 'active' : ''} aria-pressed={advMode === 'normal'}
                onClick={() => setAdvMode('normal')}>
                {t('normal', lang)}
              </button>
              <button type="button" className={advMode === 'adv' ? 'active adv' : ''} aria-pressed={advMode === 'adv'}
                onClick={() => setAdvMode(advMode === 'adv' ? 'normal' : 'adv')}>
                {t('advantage', lang)}
              </button>
            </div>

            <div className="dice-controls">
              <div className="dice-control-group">
                <span className="dice-control-label">{L(lang, 'Qtd.', 'Count')}</span>
                <div className="dice-stepper">
                  <button type="button" onClick={() => setCount(c => Math.max(1, c - 1))} aria-label={L(lang, 'Menos dados', 'Fewer dice')}>−</button>
                  <span className="dice-stepper-val">{count}</span>
                  <button type="button" onClick={() => setCount(c => Math.min(20, c + 1))} aria-label={L(lang, 'Mais dados', 'More dice')}>+</button>
                </div>
              </div>
              <div className="dice-control-group">
                <span className="dice-control-label">{L(lang, 'Bônus', 'Modifier')}</span>
                <div className="dice-stepper">
                  <button type="button" onClick={() => setMod(m => m - 1)} aria-label={L(lang, 'Diminuir bônus', 'Decrease modifier')}>−</button>
                  <span className="dice-stepper-val">{mod >= 0 ? `+${mod}` : mod}</span>
                  <button type="button" onClick={() => setMod(m => m + 1)} aria-label={L(lang, 'Aumentar bônus', 'Increase modifier')}>+</button>
                </div>
              </div>
            </div>

            <div className="dice-picker">
              {DICE.map(d => (
                <button key={d} type="button" className={`dice-picker-btn ${d === 20 ? 'is-main' : ''}`} disabled={sending}
                  onClick={() => { const p = parseFormula(`${count}d${d}${formatMod(mod)}`); if (p) rollUi(p, { adv: advMode }); }}
                  aria-label={`${L(lang, 'Rolar', 'Roll')} ${count}d${d}${formatMod(mod)}`}>
                  <DieShape die={d} value={`d${d}`} size={40}/>
                </button>
              ))}
            </div>
            {/* a linha fica reservada (2 linhas) logo abaixo dos dados: o aviso que chega
                não empurra nada do que se toca (princípio 8) */}
            {table && <p className={`dice-table-note dice-table-line is-${tableTone}`} role="status">{tableLine}</p>}
            {sheetMode && <p className={`dice-table-note dice-table-line is-${sheetNote || 'hint'}`} role="status">{sheetLine}</p>}
            <div className="dice-sheet-foot muted">
              {L(lang, 'Toque num dado para rolar', 'Tap a die to roll')} <code>{`${count}dX${formatMod(mod)}`}</code>
            </div>

            <div className="dice-sheet-history">
              <button type="button" className="dice-history-toggle" onClick={() => setShowHistory(v => !v)} aria-expanded={showHistory}>
                <Icon name={showHistory ? 'chevron-up' : 'chevron-down'} size={16}/>
                {L(lang, 'Histórico', 'History')} <span className="muted">({log.length})</span>
              </button>
              {showHistory && (
                <>
                  {log.length === 0 && <div className="muted text-sm dice-history-empty">{L(lang, 'Nenhuma rolagem ainda', 'No rolls yet')}</div>}
                  <ul className="dice-history-list">
                    {log.map(e => (
                      <li key={e.id} className={`dice-entry ${e.isCrit ? 'crit' : ''} ${e.isFumble ? 'fumble' : ''}`}>
                        <button type="button" className="dice-entry-btn" onClick={() => repeat(e)} disabled={!e.formula}>
                          <span className={`dice-entry-label${isFormulaLabel(e) ? ' is-formula' : ''}`}>
                            {e.who ? `${e.who} · ` : ''}{e.label}
                            {e.adv === 'adv' && <span className="badge badge-adv">VTG</span>}
                            {e.adv === 'dis' && <span className="badge badge-dis">DSV</span>}
                          </span>
                          <span className="dice-entry-detail">{breakdown(e)}</span>
                          <span className="dice-total">{e.total}</span>
                          <span className="dice-entry-ts">{e.ts}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {log.length > 0 && (
                    <button type="button" className="btn btn-sm btn-ghost dice-history-clear" onClick={() => setLog([])}>
                      {t('clearLog', lang)}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {pop && !overlay && (
        <div className={`roll-pop dice-pop no-print ${pop.isCrit ? 'crit' : ''} ${pop.isFumble ? 'fumble' : ''}`} role="status" onClick={() => setPop(null)}>
          <span className="dice-pop-label">{pop.label}</span> <strong>{pop.total}</strong>
          {pop.tableNote && <span className={`dice-table-note is-${pop.tableNote}`}>{tableNoteText(pop.tableNote, lang)}</span>}
        </div>
      )}

      {/* === Overlay da rolagem (3D com fallback 2D) === */}
      {overlay && (
        <div className="dice-overlay no-print" onClick={() => setOverlay(null)} role="status" aria-live="polite">
          <div className={`dice-overlay-inner ${overlay.settled && overlay.isCrit ? 'is-crit' : ''} ${overlay.settled && overlay.isFumble ? 'is-fumble' : ''}`}>
            <div className={`dice-overlay-label${isFormulaLabel(overlay) ? ' is-formula' : ''}`}>{overlay.who ? `${overlay.who} · ` : ''}{overlay.label}</div>
            <DiceStage
              key={overlay.id}
              groups={overlay.groups}
              tone={overlay.isCrit ? 'crit' : overlay.isFumble ? 'fumble' : null}
              className="dice-overlay-stage"
              onSettled={() => {
                if (overlay.isCrit && navigator.vibrate) navigator.vibrate([60, 40, 100]);
                setOverlay(prev => (prev && prev.id === overlay.id ? { ...prev, settled: true } : prev));
              }}
            />
            {overlay.settled && (
              <>
                <div className="dice-overlay-formula">{breakdown(overlay)}</div>
                <div className="dice-overlay-total">
                  {overlay.total}
                  {overlay.isCrit && (
                    <span className="dice-sparks" aria-hidden="true">
                      {SPARKS.map(i => <i key={i} style={{ '--i': i }} />)}
                    </span>
                  )}
                </div>
                {overlay.isCrit && <div className="dice-overlay-flair crit-flair">★ {L(lang, 'CRÍTICO!', 'CRITICAL!')} ★</div>}
                {overlay.isFumble && <div className="dice-overlay-flair fumble-flair">{L(lang, 'FALHA CRÍTICA', 'CRITICAL MISS')}</div>}
                {overlay.tableNote && <div className={`dice-table-note is-${overlay.tableNote}`}>{tableNoteText(overlay.tableNote, lang)}</div>}
                <span className="dice-overlay-dismiss muted">{L(lang, 'Toque para fechar', 'Tap to dismiss')}</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DiceRoller;
