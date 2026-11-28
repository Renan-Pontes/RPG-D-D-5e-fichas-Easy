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
 *   Onda 3 (E2.1): o envio sai quando o dado PARA aqui (onSettled do overlay, ou ao
 *   fechar o resultado; sem animação, na hora) — a TV, que agora mostra a rolagem do
 *   jogador num cartão grande, nunca entrega o número antes do aparelho dele.
 */
import MultiRoll from '../src/dice/MultiRoll.jsx';
import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import Icon from './Icons.jsx';
import { t } from '../data/i18n.js';
import DieShape from '../src/dice/DieShape.jsx';
import DiceStage, { effectiveAnimMode } from '../src/dice/DiceStage.jsx';
import { parseFormula, rollFormula, formatMod } from '../src/dice/dice-math.js';
import {
  deviceOffline, getDiceTable, presetFromServer, purposeLabel, PURPOSES, readTarget, rollBody, sendFailure,
  SLOW_MS, subscribeDiceTable, writeTarget,
} from '../src/dice/dice-table.js';
import { api } from '../src/api/client.js';
import {
  createSender, createSettleGate, getSheetRolls, maybeRecheck, noteFor, planSheetRoll, setSheetSecret, subscribeSheetRolls,
} from '../src/dice/sheet-roll.js';
import {
  getAnimPref, setAnimPref, getSoundPref, setSoundPref, loadHistory, saveHistory, loadRecentFormulas, saveRecentFormulas,
} from '../src/dice/dice-prefs.js';
import { playRollSting } from '../src/dice/dice-audio.js';
import { setupGlobalDiceClickListener } from '../src/dice/dice-text.jsx';
import { triggerHaptic } from '../src/utils/wake-lock.js';
import '../src/dice/dice-styles.css';

const DICE = [4, 6, 8, 10, 12, 20, 100];
const L = (lang, pt, en) => (lang === 'pt' ? pt : en);
// A animação do rolador é o dado-herói 2D: a preferência guardada ('3d' | '2d' | 'off')
// vira um interruptor ligada/desligada. Com "reduzir movimento" no sistema ela fica desligada.
const animIsOn = (pref) => { const m = effectiveAnimMode(pref); return m !== 'off' && m !== 'static'; };
// Quanto tempo o resultado segura a tela: até `pass` o toque fecha (como sempre); de `pass`
// a `close` a ficha volta a aparecer e os toques passam direto para ela; depois o resultado
// fica no cartão discreto (.dice-pop), sem bloquear nada.
const OVERLAY_MS = { pass: 700, close: 1900, passBig: 1300, closeBig: 2900 };
const POP_MS = 4500;

// "1d20 [13, 3̶] +3 = 16": os dados (o descartado riscado), o modificador e o total.
const RollMath = ({ entry }) => (
  <>
    {(entry.groups || []).map((g, gi) => {
      const rolls = g.rolls || [];
      return (
        <span key={gi} className="dice-math-g">
          {g.sign < 0 ? '− ' : gi > 0 ? '+ ' : ''}
          <span className="dice-math-die">{rolls.filter(r => !(typeof r === 'object' && r && r.kept === false)).length}d{g.die}</span>{' ['}
          {rolls.map((r, i) => {
            const v = typeof r === 'object' && r ? r.value : r;
            const dropped = typeof r === 'object' && r && r.kept === false;
            return <span key={i}>{i > 0 ? ', ' : ''}{dropped ? <s>{v}</s> : v}</span>;
          })}
          {'] '}
        </span>
      );
    })}
    {entry.mod ? <span className="dice-math-mod">{entry.mod > 0 ? '+ ' : '− '}{Math.abs(entry.mod)} </span> : null}
    <span className="dice-math-eq">= <strong>{entry.total}</strong></span>
  </>
);
// "[14, 1̶1̶] +3": o mesmo texto curto de breakdown() (src/dice/dice-math.js), com o dado
// descartado riscado em vez de "~11~" — igual ao cartão e à tela da rolagem.
const RollBrief = ({ entry }) => (
  <>
    {(entry.groups || []).map((g, gi) => (
      <span key={gi}>
        {gi > 0 ? ' ' : ''}{g.sign < 0 ? '−' : ''}{'['}
        {(g.rolls || []).map((r, i) => {
          const v = typeof r === 'object' && r ? r.value : r;
          const dropped = typeof r === 'object' && r && r.kept === false;
          return <span key={i}>{i > 0 ? ', ' : ''}{dropped ? <s>{v}</s> : v}</span>;
        })}
        {']'}
      </span>
    ))}
    {entry.mod ? ` ${formatMod(entry.mod)}` : ''}
  </>
);
const advWord = (adv, lang) => (adv === 'adv' ? L(lang, 'Vantagem', 'Advantage') : adv === 'dis' ? L(lang, 'Desvantagem', 'Disadvantage') : '');
// Um envio para o app inteiro (espaça os POSTs da ficha; nunca tenta de novo).
const sheetSend = createSender({ post: (characterId, body) => api.sheetRoll(characterId, body) });
// …que só sai quando o dado para na tela do jogador (E2.1).
const sheetGate = createSettleGate();

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

const getAttackSubtype = (label = '') => {
  const l = String(label || '').toLowerCase();
  if (/desarmad|unarmed/i.test(l)) return 'unarmed';
  if (/magia|spell/i.test(l)) return 'spell';
  if (/corpo a corpo|melee/i.test(l)) return 'melee';
  if (/dist[aâ]ncia|ranged/i.test(l)) return 'ranged';
  if (/arma|weapon/i.test(l)) return 'weapon';
  return 'generic';
};

const renderTopHudBanner = (overlay, lang) => {
  if (!overlay) return null;
  const pt = lang === 'pt';
  if (overlay.isSave) {
    return (
      <div className="dice-top-hud-banner dice-save-shield-banner is-save" aria-hidden="true">
        <span className="dice-top-hud-icon dice-save-shield-icon">🛡️</span>
        <span className="dice-top-hud-title dice-save-shield-title">{pt ? 'Teste de Resistência' : 'Saving Throw'}</span>
      </div>
    );
  }
  if (overlay.isCheck) {
    const init = /^\s*(iniciativa|initiative)\s*$/i.test(overlay.label || '');
    return (
      <div className="dice-top-hud-banner dice-check-target-banner is-check" aria-hidden="true">
        <span className="dice-top-hud-icon dice-check-target-icon">{init ? '⚡' : '🎯'}</span>
        <span className="dice-top-hud-title dice-check-target-title">{init ? (pt ? 'Iniciativa' : 'Initiative')
          : overlay.checkKind === 'skill' ? (pt ? 'Teste de Perícia' : 'Skill Check')
            : overlay.checkKind === 'tool' ? (pt ? 'Teste de Ferramenta' : 'Tool Check')
              : (pt ? 'Teste de Atributo' : 'Ability Check')}</span>
      </div>
    );
  }
  if (overlay.isAttack) {
    const subtype = getAttackSubtype(overlay.label);
    const configs = {
      melee: { icon: '⚔️', title: pt ? 'Ataque Corpo a Corpo' : 'Melee Attack', cls: 'is-attack-melee' },
      ranged: { icon: '🏹', title: pt ? 'Ataque à Distância' : 'Ranged Attack', cls: 'is-attack-ranged' },
      spell: { icon: '✨', title: pt ? 'Ataque Mágico' : 'Spell Attack', cls: 'is-attack-spell' },
      unarmed: { icon: '👊', title: pt ? 'Golpe Desarmado' : 'Unarmed Strike', cls: 'is-attack-unarmed' },
      weapon: { icon: '🗡️', title: pt ? 'Ataque com Arma' : 'Weapon Attack', cls: 'is-attack-weapon' },
      generic: { icon: '⚔️', title: pt ? 'Rolagem de Ataque' : 'Attack Roll', cls: 'is-attack-generic' },
    };
    const cfg = configs[subtype] || configs.generic;
    return (
      <div className={`dice-top-hud-banner dice-attack-swords-banner is-attack ${cfg.cls}`} aria-hidden="true">
        <span className="dice-top-hud-icon dice-attack-swords-icon">{cfg.icon}</span>
        <span className="dice-top-hud-title dice-attack-swords-title">{cfg.title}</span>
      </div>
    );
  }
  return null;
};

const DiceRoller = ({ lang }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(() => { try { return localStorage.getItem('fh-dice-mode') || 'quick'; } catch { return 'quick'; } });
  // Rolagem múltipla: tela cheia e página travada, para os gestos não rolarem o fundo
  useEffect(() => {
    const on = open && mode === 'multi';
    document.documentElement.classList.toggle('dice-lock', on);
    document.body.classList.toggle('dice-lock', on);
    return () => { document.documentElement.classList.remove('dice-lock'); document.body.classList.remove('dice-lock'); };
  }, [open, mode]);
  const pickMode = (m) => { setMode(m); try { localStorage.setItem('fh-dice-mode', m); } catch { /* sem armazenamento */ } };
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
  const [soundOn, setSoundOnState] = useState(() => getSoundPref());
  const toggleSound = () => { const next = !soundOn; setSoundOnState(next); setSoundPref(next); };
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
    const animated = animIsOn(animPref);   // desligada pelo jogador ou por "reduzir movimento" → cartão discreto
    const full = { id: Date.now() + Math.random(), ts: nowLabel(lang), ...entry, animated };
    setLog(prev => [full, ...prev].slice(0, 30));
    if (!animated) {
      // Sem animação o resultado aparece na hora: o tremor do crítico vem junto.
      triggerHaptic(full.isCrit ? 'nat20' : full.isFumble ? 'nat1' : 'tap');
      if (full.isCrit || full.isFumble) playRollSting(full.isCrit ? 'nat20' : 'nat1');
      setOverlay(null);
      setPop(full);
    } else {
      // Com o dado rolando, o tremor do crítico espera ele parar (onSettled do overlay).
      triggerHaptic('tap');
      setPop(null);
      setOverlay({ ...full, settled: false, openedAt: Date.now() });
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
    // o mestre deixou as fichas fora da Tela (ou só os 20 e 1, e esta não é), ou não há
    // sessão ao vivo: nada sai; de vez em quando a faixa pergunta se ele religou, voltou
    // para "Todas" ou começou a sessão
    if (plan.skip === 'off' || plan.skip === 'idle' || plan.skip === 'filtered') { maybeRecheck(); return; }
    if (!plan.body) return;
    const send = () => sheetSend(ctx.characterId, plan.body).then((outcome) => {
      const note = noteFor(outcome);
      if (note) patchEntry(entry.id, { tableNote: note });
    });
    // a TV só recebe depois de o dado parar aqui (E2.1); sem animação, na hora
    if (entry.animated) sheetGate.hold(entry.id, send); else send();
  }, [patchEntry]);

  const rollParsed = useCallback((parsed, { label, adv = 'normal', isSave = false, isCheck = false, isAttack = false, checkKind = null } = {}) => {
    const r = rollFormula(parsed, { adv });
    const isSaveRoll = isSave || /teste de resist[eê]ncia|salvaguarda|saving throw|\bsave\b|morte|death/i.test(label || '');
    const isCheckRoll = isCheck || (!isSaveRoll && /teste de (atributo|per[ií]cia)|ability check|skill check|\bcheck\b|perícia|atributo/i.test(label || ''));
    const isAttackRoll = isAttack || (!isSaveRoll && !isCheckRoll && /ataque|attack|to hit|com ataques/i.test(label || ''));
    return present({
      label: label || parsed.text,
      formula: parsed.text,
      groups: r.groups.map(g => ({ die: g.sides, sign: g.sign, rolls: g.rolls })),
      mod: r.mod, total: r.total, isCrit: r.isCrit, isFumble: r.isFumble, adv: r.adv,
      isSave: isSaveRoll,
      isCheck: isCheckRoll,
      isAttack: isAttackRoll,
      // 'skill' | 'tool': a faixa do resultado diz "Teste de Perícia" / "Teste de Ferramenta"
      ...(isCheckRoll && checkKind ? { checkKind } : {}),
    });
  }, [present]);

  // Compatível com a ficha: { die, count, mod, label, advMode, adv }. `sheet`: é um botão da
  // ficha (perícia, salvaguarda, ataque, dano, iniciativa) e vai à Tela (V15).
  const performRoll = useCallback((arg = {}) => {
    const opts = typeof arg === 'string' ? { formula: arg } : (arg || {});
    const { die = 20, count: cnt = 1, mod: m = 0, label = '', advMode: am, adv: optAdv, sheet: fromSheet, isSave, isCheck, isAttack, checkKind, formula: rawFormula } = opts;
    const parsed = rawFormula ? parseFormula(rawFormula) : parseFormula(`${cnt}d${die}${formatMod(m)}`);
    if (!parsed) return null;
    const isSaveRoll = isSave ?? /teste de resist[eê]ncia|salvaguarda|saving throw|\bsave\b|morte|death/i.test(label || '');
    const isCheckRoll = isCheck ?? (!isSaveRoll && (/teste de (atributo|per[ií]cia)|ability check|skill check|\bcheck\b|perícia|atributo/i.test(label || '') || (cnt === 1 && die === 20 && !rawFormula && !/ataque|attack|dano|damage/i.test(label))));
    const isAttackRoll = isAttack ?? (!isSaveRoll && !isCheckRoll && /ataque|attack|to hit|com ataques/i.test(label || ''));
    const effectiveAdv = optAdv || am || (advMode !== 'normal' ? advMode : 'normal');
    const entry = rollParsed(parsed, { label: label || parsed.text, adv: effectiveAdv, isSave: isSaveRoll, isCheck: isCheckRoll, isAttack: isAttackRoll, checkKind });
    if (fromSheet && entry) toTable(entry);
    return entry;
  }, [rollParsed, advMode, toTable]);

  // Os toques do rolador. Mestre na campanha: pelo servidor (📺 Na tela ou 🔒 Só eu).
  // Lento não é sem rede: o pedido não é cortado (a TV mostraria o número do servidor);
  // aos 1,5 s o aviso "a Tela está lenta". Sem rede, no aparelho com o aviso. Fora: local.
  const rollUi = useCallback(async (parsed, { label, adv = 'normal', isSave = false, isCheck = false } = {}) => {
    if (!table) {
      // jogador: no aparelho, e da ficha aberta também à Tela (toTable não faz nada sem ela)
      const entry = rollParsed(parsed, { label, adv, isSave });
      if (entry) toTable(entry);
      return entry;
    }
    if (sendingRef.current) return null;
    const text = label || purposeLabel(purpose, lang) || parsed.text;
    const isSaveRoll = isSave || /teste de resist[eê]ncia|salvaguarda|saving throw|\bsave\b|morte|death/i.test(text || '');
    const isCheckRoll = isCheck || (!isSaveRoll && /teste de (atributo|per[ií]cia)|ability check|skill check|\bcheck\b|perícia|atributo/i.test(text || ''));
    const shown = target === 'shown';
    const show = (r, extra) => present({
      label: text, formula: parsed.text,
      groups: r.groups.map(g => ({ die: g.sides, sign: g.sign, rolls: g.rolls })),
      mod: r.mod, total: r.total, isCrit: r.isCrit, isFumble: r.isFumble, adv: r.adv, isSave: isSaveRoll, isCheck: isCheckRoll, ...extra,
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
    isSave: !!res.isSave || /teste de resist[eê]ncia|salvaguarda|saving throw|\bsave\b|morte|death/i.test(res.label || ''),
    isCheck: !!res.isCheck || (!res.isSave && /teste de (atributo|per[ií]cia)|ability check|skill check|\bcheck\b|perícia|atributo/i.test(res.label || '')),
    isAttack: !!res.isAttack || (!res.isSave && !res.isCheck && /ataque|attack|to hit|com ataques/i.test(res.label || '')),
    adv: res.adv || 'normal',
    source: res.source || 'server',
    tableNote: res.tableNote,
  }), [present]);

  useEffect(() => {
    window.__diceRoll = performRoll;
    window.__diceShow = showResult;
    window.__diceOpen = () => setOpen(true);
    const cleanupGlobalClick = setupGlobalDiceClickListener(performRoll);
    return () => {
      window.__diceRoll = null;
      window.__diceShow = null;
      window.__diceOpen = null;
      cleanupGlobalClick();
    };
  }, [performRoll, showResult]);

  // Sheet aberto: pré-carrega o 3D e reserva espaço no fim da página.
  useEffect(() => {
    if (!open) { document.body.style.removeProperty('--dice-sheet-h'); document.body.classList.remove('dice-sheet-open'); return undefined; }
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
  // Teclado: ao abrir, o foco entra no painel (campo da fórmula com mouse/teclado; o próprio
  // painel no toque, para o teclado virtual não subir); ao fechar, volta para o botão de dados.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const el = sheetRef.current;
      if (!el || el.contains(document.activeElement)) return;
      let fine = false;
      try { fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch { fine = false; }
      const field = fine ? el.querySelector('.dice-formula-input') : null;
      try { (field || el).focus({ preventScroll: true }); } catch { /* sem foco */ }
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      // o botão de dados volta a existir neste mesmo commit: o foco vai para ele já e de novo
      // no quadro seguinte (fechando com Esc o foco ainda caía no <body>)
      const back = () => {
        const a = document.activeElement;
        if (!a || a === document.body || !a.isConnected) { try { fabRef.current?.focus({ preventScroll: true }); } catch { /* sem foco */ } }
      };
      back();
      requestAnimationFrame(back);
    }
  }, [open]);
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

  // Overlay: depois que o dado para, (1) por um instante o toque ainda só fecha; (2) a tela
  // clareia, a ficha volta a aparecer e os toques passam direto para ela (atacar e já tocar
  // em Dano); (3) o resultado vai para o cartão discreto, que fica mais alguns segundos.
  const overlayRef = useRef(null);
  overlayRef.current = overlay;
  const closeOverlay = useCallback((toPop = true) => {
    const cur = overlayRef.current;
    if (!cur) return;
    sheetGate.settle(cur.id);
    setOverlay(null);
    if (toPop) setPop({ ...cur, fromOverlay: true });
  }, []);
  useEffect(() => {
    if (!overlay?.settled) return undefined;
    const big = overlay.isCrit || overlay.isFumble;
    const a = setTimeout(() => setOverlay(prev => (prev && prev.id === overlay.id ? { ...prev, passable: true } : prev)), big ? OVERLAY_MS.passBig : OVERLAY_MS.pass);
    const b = setTimeout(() => closeOverlay(true), big ? OVERLAY_MS.closeBig : OVERLAY_MS.close);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [overlay?.settled, overlay?.id, closeOverlay]); // eslint-disable-line react-hooks/exhaustive-deps
  // fase (1), teclado: Esc, Enter ou Espaço pulam a rolagem como o toque pula. A tecla é
  // engolida (senão o Espaço rolaria de novo no botão que ainda tem o foco); a repetição da
  // tecla que disparou a rolagem e os primeiros 400 ms não contam.
  useEffect(() => {
    if (!overlay || overlay.passable) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat || Date.now() - (overlayRef.current?.openedAt || 0) < 400) return;
      closeOverlay(true);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [overlay?.id, overlay?.passable, closeOverlay]); // eslint-disable-line react-hooks/exhaustive-deps
  // fase (2): o primeiro toque em qualquer lugar fecha o overlay e NÃO é engolido
  useEffect(() => {
    if (!overlay?.passable) return undefined;
    const onDown = () => closeOverlay(true);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onDown, true);
    return () => { window.removeEventListener('pointerdown', onDown, true); window.removeEventListener('keydown', onDown, true); };
  }, [overlay?.passable, overlay?.id, closeOverlay]);

  useEffect(() => {
    if (!pop) return undefined;
    const id = setTimeout(() => setPop(null), POP_MS);
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

  const toggleAnim = () => {
    const next = animPref === 'off' ? '2d' : 'off';
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
        : sheet.mode === 'crits' && sheet.live !== false ? L(lang, 'Na sessão ao vivo, só os 20 e 1 naturais desta ficha vão à Tela (regra do mestre).', 'During the live session, only natural 20s and 1s from this sheet go on screen (the GM’s rule).')
        : sheet.live === false ? L(lang, 'Sem sessão ao vivo agora: o que você rola fica no seu aparelho.', 'No live session right now: what you roll stays on your device.')
          : L(lang, `Na sessão ao vivo, a Tela da mesa mostra o que ${sheet.name || 'a ficha'} rola.`, `During the live session, the table screen shows what ${sheet.name || 'this sheet'} rolls.`);
  const animOn = animIsOn(animPref);
  // desligada pelo sistema ("reduzir movimento"), não pelo jogador: o botão diz por quê
  const animBySystem = animPref !== 'off' && !animOn;

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
          className={`dice-sheet no-print ${table || sheetMode ? 'has-table' : ''}${mode === 'multi' ? ' is-full' : ''}`}
          role="dialog"
          aria-modal="false"
          tabIndex={-1}
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
            <button type="button" className={`dice-sheet-anim${soundOn ? ' is-on' : ''}`} onClick={toggleSound}
              role="switch" aria-checked={soundOn}
              aria-label={`${L(lang, 'Som', 'Sound')}: ${soundOn ? L(lang, 'ligado', 'on') : L(lang, 'desligado', 'off')}`}
              title={L(lang, 'Efeito sonoro em 20 natural e 1 natural', 'Sound sting on natural 20 and natural 1')}>
              <span aria-hidden="true">{soundOn ? '🔊' : '🔇'}</span> <span className="dice-sheet-anim-k">{L(lang, 'Som', 'Sound')}</span>
            </button>
            <button type="button" className={`dice-sheet-anim${animOn ? ' is-on' : ''}`} onClick={toggleAnim}
              role="switch" aria-checked={animOn} disabled={animBySystem}
              aria-label={`${L(lang, 'Animação', 'Animation')}: ${animOn ? L(lang, 'ligada', 'on') : L(lang, 'desligada', 'off')}`}
              title={animBySystem
                ? L(lang, 'Desligada porque o aparelho pede menos movimento', 'Off because this device asks for reduced motion')
                : L(lang, 'Mostrar o dado rolando em tela cheia. Desligada, o resultado aparece num cartão no canto.', 'Show the die rolling full-screen. When off, the result shows in a card in the corner.')}>
              <Icon name="film" size={14} aria-hidden="true" /> <span className="dice-sheet-anim-k">{L(lang, 'Animação', 'Animation')}: </span>{animOn ? L(lang, 'ligada', 'on') : L(lang, 'desligada', 'off')}
            </button>
            <button type="button" className="dice-sheet-close" onClick={() => setOpen(false)} aria-label={L(lang, 'Fechar', 'Close')}>
              <Icon name="x" size={20}/>
            </button>
          </header>

          <div className="dice-sheet-body">
            <div className="dice-mode" role="tablist" aria-label={L(lang, 'Modo do rolador', 'Roller mode')}>
              {[['quick', L(lang, 'Rápido', 'Quick')], ['multi', L(lang, 'Múltipla (linhas)', 'Multi-roll (rows)')]].map(([m, lbl]) => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} className={`dice-mode-btn${mode === m ? ' is-on' : ''}`} onClick={() => pickMode(m)}>{lbl}</button>
              ))}
            </div>
            {mode === 'multi' && <MultiRoll lang={lang} />}
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
            {mode === 'quick' && (<>
            {last && (
              <button type="button" className={`dice-last ${last.isCrit ? 'crit' : ''} ${last.isFumble ? 'fumble' : ''}`}
                onClick={() => repeat(last)} disabled={!last.formula}
                title={last.formula ? L(lang, 'Rolar de novo', 'Roll again') : undefined}>
                <span className="dice-last-text">
                  <span className={`dice-last-label${isFormulaLabel(last) ? ' is-formula' : ''}`}>{last.who ? `${last.who} · ` : ''}{last.label}</span>
                  <span className="dice-last-detail"><RollBrief entry={last} /></span>
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
                          <span className="dice-entry-detail"><RollBrief entry={e} /></span>
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
            </>)}
          </div>
        </section>
      )}

      {/* Com o painel de dados aberto o cartão não aparece: o próprio painel mostra o resultado
          no topo (o cartão cobria os controles de quantidade e os dados). */}
      {pop && !overlay && !open && (
        <div className={`roll-pop dice-pop no-print ${pop.isCrit ? 'crit' : ''} ${pop.isFumble ? 'fumble' : ''}`}
          role={pop.fromOverlay ? undefined : 'status'} onClick={() => setPop(null)}
          title={L(lang, 'Clique ou toque para fechar', 'Click or tap to dismiss')}>
          <span className="dice-pop-main">
            <span className="dice-pop-label">{pop.who ? `${pop.who} · ` : ''}{pop.label}</span>
            <span className="dice-pop-detail">
              {advWord(pop.adv, lang) && <span className={`dice-pop-adv is-${pop.adv}`}>{advWord(pop.adv, lang)} · </span>}
              <RollMath entry={pop} />
              {pop.isCrit && <span className="dice-pop-flag"> · {L(lang, '20 natural', 'natural 20')}</span>}
              {pop.isFumble && <span className="dice-pop-flag"> · {L(lang, '1 natural', 'natural 1')}</span>}
            </span>
            {pop.tableNote && <span className={`dice-table-note is-${pop.tableNote}`}>{tableNoteText(pop.tableNote, lang)}</span>}
          </span>
          <strong>{pop.total}</strong>
        </div>
      )}

      {/* === Overlay da rolagem (Minimalist & Clean Hero Die) === */}
      {overlay && (
        <div key={overlay.id} className={`dice-overlay no-print${overlay.settled ? ' is-settled' : ''}${overlay.passable ? ' is-passable' : ''}`}
          onClick={() => {
            // o "click" sintético do toque que disparou a rolagem pode cair aqui (o overlay acabou de
            // abrir sob o dedo): nos primeiros 400 ms o toque não fecha nada
            if (Date.now() - (overlay.openedAt || 0) < 400) return;
            closeOverlay(true);
          }} role="status" aria-live="polite">
          {renderTopHudBanner(overlay, lang)}
          <div className={`dice-overlay-inner ${overlay.settled && overlay.isCrit ? 'is-crit' : ''} ${overlay.settled && overlay.isFumble ? 'is-fumble' : ''} ${overlay.isSave ? 'is-save' : ''}`}>
            <DiceStage
              key={overlay.id}
              mode="2d"
              groups={overlay.groups}
              tone={overlay.adv === 'adv' ? 'adv' : overlay.adv === 'dis' ? 'dis' : (overlay.isCrit ? 'crit' : overlay.isFumble ? 'fumble' : null)}
              adv={overlay.adv}
              total={overlay.total}
              isCrit={overlay.isCrit}
              isFumble={overlay.isFumble}
              isSave={overlay.isSave}
              lang={lang}
              className="dice-overlay-stage"
              onSettled={() => {
                sheetGate.settle(overlay.id);   // o dado parou: a rolagem da ficha vai à Tela (E2.1)
                if (overlay.isCrit || overlay.isFumble) {
                  triggerHaptic(overlay.isCrit ? 'nat20' : 'nat1');
                  playRollSting(overlay.isCrit ? 'nat20' : 'nat1');
                }
                setOverlay(prev => (prev && prev.id === overlay.id ? { ...prev, settled: true } : prev));
              }}
            />
            {/* O que foi rolado (desde o começo) e, quando o dado para, a conta inteira: o número
                grande do dado é o TOTAL; aqui ficam a face do d20 e o modificador. */}
            <div className={`dice-overlay-caption${overlay.settled ? ' is-settled' : ''}`}>
              <div className={`dice-overlay-label${isFormulaLabel(overlay) ? ' is-formula' : ''}`}>{overlay.who ? `${overlay.who} · ` : ''}{overlay.label}</div>
              <div className="dice-overlay-formula" aria-hidden={!overlay.settled}>
                {overlay.settled ? (
                  <>
                    {advWord(overlay.adv, lang) && <span className={`dice-overlay-adv is-${overlay.adv}`}>{advWord(overlay.adv, lang)} · </span>}
                    <RollMath entry={overlay} />
                  </>
                ) : '\u00a0'}
              </div>
            </div>
            {overlay.settled && overlay.tableNote && (
              <div className={`dice-table-note is-${overlay.tableNote}`}>{tableNoteText(overlay.tableNote, lang)}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DiceRoller;
