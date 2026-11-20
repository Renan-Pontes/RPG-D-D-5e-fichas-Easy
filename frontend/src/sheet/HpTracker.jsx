// Painel de PV condensado (regras em src/sheet/hp-logic.js):
//   barra de PV temporários e barra de PV (10 fatias), cada uma com o próprio botão de
//   arrastar na ponta do preenchimento · uma linha para Exaustão (6) · uma linha para os
//   Testes contra a Morte: falhas à esquerda, o d20 no meio (só a 0 PV), sucessos à direita.
// Arrastar: o número cresce exponencialmente com a distância, aparece numa lente sobre o
// botão e entra ao soltar; o botão volta para a ponta. Com o descanso curto ligado, puxar a
// barra de PV para a direita gasta Dados de Vida (rolagens) em vez de números fixos.
import { useEffect, useRef, useState } from 'react';
import {
  SLICES, EXHAUSTION_MAX, filledSlices, hitDicePools, exhaustionLevel, setExhaustion, toggleTo,
  hpSliderRange, deltaLabel, dragAmount, diceForDrag, pickDice, diceLabel, spendHitDiceRolls, deathSaveResult,
} from './hp-logic.js';
import { hpState } from './hp-feedback.js';
import { exhaustionLine } from './condition-rules.js';
import { useRestMode } from './rest-mode.jsx';
import { useSheetToast } from './sheet-toast.jsx';
import { survivalStatus, stepDays, breathLabel, frigidMinutes } from './survival.js';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

// ── Silhueta dos medidores: pontas chanfradas e um vinco em V (em cima e embaixo) em cada
// divisão. O mesmo polígono, em %, recorta o conteúdo (clip-path) e vira o contorno dourado
// (SVG esticado): como todos os medidores têm a mesma largura e altura, o desenho bate.
const CH = 1.6, NW = 0.9, ND = 17;   // chanfro das pontas (% da largura), meia-boca do vinco (% larg.), fundura (% altura)
export function gaugePoints(n) {
  const xs = Array.from({ length: Math.max(0, n - 1) }, (_, i) => ((i + 1) / n) * 100);
  const top = [[CH, 0], ...xs.flatMap(x => [[x - NW, 0], [x, ND], [x + NW, 0]]), [100 - CH, 0]];
  const bot = [[100 - CH, 100], ...xs.slice().reverse().flatMap(x => [[x + NW, 100], [x, 100 - ND], [x - NW, 100]]), [CH, 100]];
  return [...top, [100, 50], ...bot, [0, 50]];
}
const clipOf = (n) => `polygon(${gaugePoints(n).map(([x, y]) => `${x.toFixed(2)}% ${y}%`).join(', ')})`;
/** Contorno dourado + vincos; vai por cima do conteúdo do medidor (não pega toque). */
function GaugeFrame({ n }) {
  const pts = gaugePoints(n).map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <svg className="fh-gauge-frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <polygon className="fh-gauge-edge" points={pts} vectorEffect="non-scaling-stroke" />
      <polygon className="fh-gauge-shine" points={pts} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
const gaugeStyle = (n) => ({ clipPath: clipOf(n), WebkitClipPath: clipOf(n) });
const d = (n) => 1 + Math.floor(Math.random() * n);

/**
 * Barra arrastável. `pct` = onde o botão mora (fim do preenchimento). `read(dx)` devolve
 * { label, tone } para a lente (ou null = nada); `commit(dx)` aplica ao soltar.
 * Teclado: setas acumulam o arrasto em passos, Enter aplica, Esc desfaz.
 */
function DragBar({ className, pct, label, valueText, valueNow, valueMax, read, commit, disabled, children, knob = 16, grow = false }) {
  const ref = useRef(null);
  const start = useRef(null);
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const [hold, setHold] = useState(null);   // posição em que o botão foi solto (veja `end`)
  // o botão nunca sai da barra: o arrasto é preso entre as duas pontas
  // o botão mora DENTRO do preenchimento, encostado na ponta dele: a borda direita do
  // botão é o fim da parte cheia (vazia = botão no começo da barra)
  const r = knob / 2;
  const w = Math.max(40, ref.current?.clientWidth || 340);
  const home = (Math.max(0, Math.min(100, pct)) / 100) * w;
  // `grow`: só cresce (PV temporários nunca descem por aqui; o dano é na barra de PV)
  const clamp = (v) => Math.max(grow ? 0 : -home, Math.min(w - home, v));
  const info = dx ? read(dx, (home + dx) / w) : null;
  const edge = home + dx > w - 70 ? 'right' : home + dx < 70 ? 'left' : '';
  // durante o arrasto o preenchimento acompanha o botão; ao soltar, os dois deslizam
  // (transição do CSS) até o valor que entrou
  const now = Math.max(0, Math.min(100, ((home + dx) / w) * 100));
  const shown = drag ? now : (hold ?? Math.max(0, Math.min(100, pct)));
  // Ao soltar, botão e preenchimento ficam onde o dedo largou (`hold`) até o valor novo
  // chegar; aí deslizam dele até a posição certa. Sem isso o botão voltava à posição antiga
  // e depois pulava para a nova (o vai-e-volta).
  const lastPct = useRef(pct);
  useEffect(() => {
    if (pct === lastPct.current) return undefined;
    lastPct.current = pct;
    if (hold == null) return undefined;
    const id = requestAnimationFrame(() => setHold(null));   // um quadro depois: a transição pega
    return () => cancelAnimationFrame(id);
  }, [pct]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (hold == null) return undefined;
    const id = setTimeout(() => setHold(null), 900);          // nada mudou (valor 0): volta sozinho
    return () => clearTimeout(id);
  }, [hold]);
  const end = (apply) => {
    if (apply && dx) { setHold(now); commit(dx, (home + dx) / w); }
    start.current = null; setDrag(false); setDx(0);
  };
  return (
    <div ref={ref} className={`fh-dragbar ${className}${drag ? ' is-dragging' : ''}${info?.tone ? ` is-${info.tone}` : ''}`}>
      {typeof children === 'function' ? children(shown, drag) : children}
      {/* só o botão pega o arrasto (a barra em volta não) */}
      <span className="fh-knob" role="slider" tabIndex={disabled ? -1 : 0} aria-label={label}
        aria-valuemin={valueMax != null ? 0 : undefined} aria-valuemax={valueMax ?? undefined} aria-valuenow={valueNow ?? undefined}
        aria-valuetext={info ? info.label : valueText} aria-disabled={disabled || undefined}
        style={{ width: knob, height: knob, marginTop: -r, left: `max(0px, calc(${shown / 100} * 100% - ${knob}px))` }}
        onPointerDown={e => {
          if (disabled) return;
          e.preventDefault(); e.stopPropagation();
          e.currentTarget.setPointerCapture?.(e.pointerId);
          start.current = e.clientX; setDrag(true); setDx(0);
        }}
        onPointerMove={e => { if (start.current != null) setDx(clamp(e.clientX - start.current)); }}
        onPointerUp={() => end(true)}
        onPointerCancel={() => end(false)}
        onLostPointerCapture={() => { if (start.current != null) end(true); }}
        onKeyDown={e => {
          if (disabled) return;
          // uma seta = 1 ponto (a barra inteira vale `valueMax`); Shift = 5. Sem escala, passos fixos.
          const unit = valueMax ? w / valueMax : 14;
          const step = e.shiftKey ? Math.max(40, unit * 5) : Math.max(unit, 1);
          const snap = (v, dir) => (valueMax ? Math.round((v + dir * step) / unit) * unit : v + dir * step);
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setDx(v => clamp(snap(v, 1))); }
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setDx(v => clamp(snap(v, -1))); }
          else if (e.key === 'Enter') { e.preventDefault(); end(true); }
          else if (e.key === 'Escape') end(false);
        }}
        onBlur={() => { if (!drag) setDx(0); }}>
        {info && <span className={`fh-lens${edge ? ` is-${edge}` : ''}`} aria-hidden="true">{info.label}</span>}
      </span>
    </div>
  );
}

/** Fileira de fatias clicáveis. `reverse`: acende da direita para a esquerda (falhas).
 *  Sem `onPick` a fileira só mostra (falhas/sucessos com PV acima de 0: nada para marcar).
 *  No toque, a faixa logo acima e abaixo do desenho (16px) também vale: o recorte da
 *  silhueta corta a área dos botões, então o toque nessa faixa é resolvido pela posição. */
function Pips({ n, on, kind, label, onPick, reverse, inside }) {
  const onWrap = (e) => {
    if (!onPick || e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    let i = Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) / Math.max(1, r.width)) * n)));
    if (reverse) i = n - 1 - i;
    onPick(toggleTo(on, i));
  };
  return (
    <span className={`fh-gauge-wrap fh-pips-wrap${onPick ? '' : ' is-inert'}`} onClick={onWrap}>
    <span className={`fh-pips fh-gauge is-${kind}${reverse ? ' is-reverse' : ''}`} style={gaugeStyle(n)} role="group" aria-label={label} data-label={inside || undefined}>
      {Array.from({ length: n }, (_, i) => (
        <button key={i} type="button" className={`fh-pip${i < on ? ' is-on' : ''}`} disabled={!onPick}
          aria-pressed={i < on} aria-label={`${label}: ${i + 1}`} onClick={onPick ? () => onPick(toggleTo(on, i)) : undefined} />
      ))}
    </span>
    <GaugeFrame n={n} />
    </span>
  );
}

export default function HpTracker({ char, lang, update, applyHp, byDie, conMod, conScore = 10, hpPct, hints = {}, statusSlot = null }) {
  const rest = useRestMode();
  const toast = useSheetToast();   // null fora da ficha
  const short = rest?.mode === 'short';
  const max = Math.max(1, char.maxHp || 1);
  const temp = Math.max(0, char.tempHp || 0);
  const on = filledSlices(char.currentHp, max);
  const exh = exhaustionLevel(char);
  const ds = char.deathSaves || { success: 0, fail: 0 };
  const down = char.currentHp === 0;
  // Morto (três falhas) e estável (três sucessos, ou estabilizado por alguém) são estados de
  // verdade: o d20 não rola mais e a linha diz qual dos dois é.
  const dead = down && ds.fail >= 3;
  const stable = down && !dead && (ds.success >= 3 || !!char.stabilized);
  const bloodied = !down && char.currentHp <= max / 2;   // Sangrando: metade dos PV ou menos
  const near = bloodied && hpState(char.currentHp, max) === 'crit';   // um quarto ou menos: o rótulo escala
  // o que o nível de Exaustão faz, na edição da ficha (src/sheet/condition-rules.js); só texto
  const exhInfo = exhaustionLine(exh, lang, char.rulesVersion);
  const range = hpSliderRange(char);
  const pools = hitDicePools(byDie, char);
  const hdLeft = pools.reduce((a, p) => a + p.left, 0);
  const [note, setNote] = useState(null);     // última rolagem (dados de vida / morte)
  // a frase do último teste contra a morte vale enquanto o personagem está caído (ou acabou
  // de voltar com 1 PV no 20 natural: fica 6 s e some)
  useEffect(() => {
    if (!note || down) return undefined;
    const id = setTimeout(() => setNote(null), note.death === 'crit' ? 6000 : 0);
    return () => clearTimeout(id);
  }, [down, note]);
  useEffect(() => { setNote(null); }, [char.id]);

  // PV: dano à esquerda; à direita cura — ou, no descanso curto, Dados de Vida
  // O botão marca o PV final: soltar em X deixa X PV (sem ir e voltar). Para baixo, o dano
  // necessário inclui os PV temporários, que se gastam primeiro (regra).
  const hpChange = (frac) => {
    const target = Math.max(0, Math.min(max, Math.round(frac * max)));
    const cur = char.currentHp || 0;
    if (target === cur) return 0;
    return target > cur ? target - cur : -(temp + cur - target);
  };
  const readHp = (dx, frac) => {
    if (short && dx > 0) {
      const n = diceForDrag(dx, hdLeft);
      return n ? { label: diceLabel(pickDice(pools, n), conMod), tone: 'dice' } : { label: L(lang, 'sem DV', 'no HD'), tone: '' };
    }
    if (down && dx < 0) return dragAmount(dx) ? { label: L(lang, '+1 falha', '+1 failure'), tone: 'hurt' } : null;
    const v = hpChange(frac);
    return v ? { label: deltaLabel(v), tone: v < 0 ? 'hurt' : 'heal' } : null;
  };
  const commitHp = (dx, frac) => {
    if (short && dx > 0) { spendDice(pickDice(pools, diceForDrag(dx, hdLeft))); return; }
    if (down && dx < 0) {
      // dano a 0 PV: uma falha no Teste contra a Morte (e deixa de estar estável)
      if (dragAmount(dx) < 0) update({ deathSaves: { ...ds, fail: Math.min(3, ds.fail + 1) }, stabilized: null });
      return;
    }
    const v = hpChange(frac);
    if (v) applyHp(v);
  };
  // Gastar Dados de Vida (descanso curto): pelo botão "Gastar 1 DV" ou puxando a barra.
  // O aviso da ficha diz quanto curou e desfaz (PV e dado de volta) por alguns segundos.
  function spendDice(picks) {
    if (!picks.length) return;
    // os dados rolam no rolador da ficha (com a animação); a cura usa os números dele
    const nDice = picks.reduce((a, p) => a + p.count, 0);
    const formula = picks.map(p => `${p.count}d${p.die}`).join('+') + (conMod ? `${conMod > 0 ? '+' : '-'}${Math.abs(conMod * nDice)}` : '');
    const entry = typeof window !== 'undefined' && window.__diceRoll
      ? window.__diceRoll({ formula, label: L(lang, 'Dados de Vida', 'Hit Dice'), sheet: true })
      : null;
    const rolls = picks.map((p, i) => {
      const g = entry?.groups?.filter(x => x.die === p.die)?.[0] || entry?.groups?.[i];
      // o rolador devolve { value, kept } por dado
      const got = (g?.rolls || []).map(x => (typeof x === 'object' ? x.value : x)).filter(Number.isFinite).slice(0, p.count);
      return got.length === p.count ? got : Array.from({ length: p.count }, () => d(p.die));
    });
    const before = { currentHp: char.currentHp, hitDiceUsed: char.hitDiceUsed, hitDiceUsedBy: char.hitDiceUsedBy, deathSaves: char.deathSaves, stabilized: char.stabilized ?? null };
    const apply = () => {
      const r = spendHitDiceRolls(char, byDie, picks, rolls, conMod);
      if (!r) return;
      update(r.patch);
      const what = nDice === 1 ? L(lang, 'Dado de Vida', 'Hit Die') : L(lang, `${nDice} Dados de Vida`, `${nDice} Hit Dice`);
      toast?.show({
        tone: 'heal',
        text: `${what} (${diceLabel(picks, conMod)}): +${r.gained} ${L(lang, 'PV', 'HP')}`,
        onAction: toast.patchChar ? () => toast.patchChar(() => before) : undefined,
      });
    };
    if (entry) setTimeout(apply, 1900); else apply();
  }
  // PV temporários: o arrasto soma/tira do valor atual (nunca abaixo de 0)
  // PV temporários na mesma escala da barra de PV: soltar em X deixa X temporários
  const tempTarget = (frac) => Math.max(temp, Math.min(max, Math.round(frac * max)));
  const readTemp = (dx, frac) => {
    const v = tempTarget(frac) - temp;
    return v ? { label: `${temp + v}`, tone: 'temp' } : null;
  };
  // só sobe: PV temporários se perdem levando dano na barra de PV (que gasta eles primeiro)
  const commitTemp = (dx, frac) => { const v = tempTarget(frac) - temp; if (v > 0) update({ tempHp: temp + v }); };

  // Teste contra a morte: o d20 do rolador da ficha (com a animação de sempre); o
  // resultado entra quando o dado termina de girar.
  const [rolling, setRolling] = useState(false);
  const deathRoll = () => {
    if (!down || rolling || dead || stable) return;
    const entry = typeof window !== 'undefined' && window.__diceRoll
      ? window.__diceRoll({ die: 20, label: L(lang, 'Teste contra a morte', 'Death save'), sheet: true, isSave: true, adv: 'normal' })
      : null;
    const n = entry?.total ?? d(20);   // d20 sem modificador: o total é o número do dado
    setRolling(true);
    setTimeout(() => {
      setRolling(false);
      const r = deathSaveResult(char, n);
      update(r.patch);
      let text;
      if (r.kind === 'stable') {
        // estável: logo depois do d20, rola o d4 de horas até recuperar 1 PV (com animação)
        const e4 = window.__diceRoll?.({ die: 4, label: L(lang, 'Estabilizado: horas para 1 PV', 'Stabilized: hours to 1 HP'), sheet: true });
        const h = e4?.total ?? d(4);
        setRolling(true);
        setTimeout(() => { setRolling(false); update({ ...r.patch, stabilized: { hours: h, at: new Date().toISOString() } }); }, e4 ? 1900 : 0);
        text = L(lang, `d20: ${n} · estável`, `d20: ${n} · stable`);
        setNote({ key: Date.now(), text, death: r.kind });
        return;
      } else {
        const say = {
          crit: L(lang, 'volta com 1 PV', 'back with 1 HP'), dead: L(lang, 'morto', 'dead'),
          fumble: L(lang, 'duas falhas', 'two failures'), success: L(lang, 'sucesso', 'success'), fail: L(lang, 'falha', 'failure'),
        }[r.kind];
        text = `d20: ${n} · ${say}`;
      }
      setNote({ key: Date.now(), text, death: r.kind });
    }, entry ? 1900 : 0);
  };

  // O rótulo dentro da barra foge do botão de arrastar: com o botão no miolo, o texto vai
  // para a metade oposta (antes o botão cobria letras de "PV TEMPORÁRIOS 6").
  const tempPct = Math.min(100, (temp / max) * 100);
  const tempLabelSide = tempPct >= 28 && tempPct <= 76 ? (tempPct < 50 ? ' is-label-r' : ' is-label-l') : '';
  const hdText = (n, total) => (n === 1
    ? L(lang, `${n} de ${total} livre`, `${n} of ${total} left`)
    : L(lang, `${n} de ${total} livres`, `${n} of ${total} left`));
  const hdTotal = pools.reduce((a, p) => a + p.total, 0);

  return (
    <div className={`fh-hpt${short ? ' is-short-rest' : ''}`}>
      <DragBar className="is-temp" knob={16} grow pct={tempPct}
        label={L(lang, 'PV temporários: arraste para a direita para ganhar', 'Temporary HP: drag right to gain')} valueText={String(temp)}
        valueNow={temp} valueMax={max}
        read={readTemp} commit={commitTemp}>
        {(fill) => (
          <>
            <div className="fh-gauge-wrap">
              <div className={`fh-hpt-temp fh-gauge${tempLabelSide}`} style={gaugeStyle(SLICES)} aria-hidden="true"
                data-label={temp ? L(lang, `PV temporários ${temp}`, `Temporary HP ${temp}`) : L(lang, 'PV temporários', 'Temporary HP')}>
                <div className="fh-hpt-temp-fill" style={{ width: `${fill}%` }} />
              </div>
              <GaugeFrame n={SLICES} />
            </div>
          </>
        )}
      </DragBar>

      <DragBar className="is-hp" pct={hpPct}
        label={short
          ? L(lang, 'Pontos de Vida: arraste para a direita para gastar Dados de Vida, para a esquerda para dano', 'Hit points: drag right to spend Hit Dice, left for damage')
          : L(lang, 'Pontos de Vida: arraste para a esquerda para dano, para a direita para cura', 'Hit points: drag left for damage, right for healing')}
        valueText={L(lang, `${char.currentHp} de ${max}`, `${char.currentHp} of ${max}`)} valueNow={char.currentHp || 0} valueMax={max}
        read={readHp} commit={commitHp}>
        {(fill) => (
          <div className="fh-gauge-wrap">
          <div className={`hp-bar fh-hpt-bar fh-gauge${bloodied ? ' is-bloodied' : ''}`} style={gaugeStyle(SLICES)} aria-hidden="true">
            {/* "Sangrando" escondido sob o preenchimento, na metade esquerda: aparece aos
                poucos conforme os PV descem abaixo de 50% */}
            {bloodied && <span key={near ? 'near' : 'bloodied'} className={`fh-hpt-bloodied${near ? ' is-near' : ''}`} aria-hidden="true">{near ? L(lang, 'À beira da morte', 'Near death') : L(lang, 'Sangrando', 'Bloodied')}</span>}
            <div className="fh-hp-ghost" style={{ width: `${hpPct}%` }} />
            <div className="hp-bar-fill" style={{ width: `${fill}%` }} />
            <div className="fh-hpt-slices">
              {Array.from({ length: SLICES }, (_, i) => <span key={i} className={i < on ? 'is-on' : ''} />)}
            </div>
            {down && char.stabilized?.hours && (
              <span className="fh-hpt-bar-text">{L(lang, `Estabilizado · ${char.stabilized.hours} h para recuperar 1 PV`, `Stabilized · ${char.stabilized.hours} h to regain 1 HP`)}</span>
            )}
          </div>
          <GaugeFrame n={SLICES} />
          </div>
        )}
      </DragBar>
      {/* Descanso curto: gastar Dados de Vida por botão (um por tipo de dado), a contagem e
          "Concluir descanso" aqui mesmo — a faixa do topo fica fora da tela nesta altura.
          Puxar a barra para a direita continua valendo como atalho. */}
      {short && (
        <div className="fh-hpt-rest" role="group" aria-label={L(lang, 'Descanso curto: Dados de Vida', 'Short rest: Hit Dice')}>
          <div className="fh-hpt-rest-head" role="status">
            <span className="fh-hpt-rest-k"><span aria-hidden="true">☕ </span>{L(lang, 'Dados de Vida', 'Hit Dice')}</span>
            <span className="fh-hpt-rest-n">{hdLeft ? hdText(hdLeft, hdTotal) : L(lang, 'nenhum livre', 'none left')}</span>
            {hints.hitDice}
          </div>
          <div className="fh-hpt-rest-acts">
            {pools.filter(p => p.left > 0).slice().sort((a, b) => a.die - b.die).map(p => (
              <button key={p.die} type="button" className="fh-hpt-rest-btn is-spend" onClick={() => spendDice([{ die: p.die, count: 1 }])}
                aria-label={L(lang, `Gastar 1 Dado de Vida: ${diceLabel([{ die: p.die, count: 1 }], conMod)} de cura (${hdText(p.left, p.total)})`, `Spend 1 Hit Die: heal ${diceLabel([{ die: p.die, count: 1 }], conMod)} (${hdText(p.left, p.total)})`)}>
                <span className="fh-hpt-rest-btn-k">{L(lang, 'Gastar 1 DV', 'Spend 1 HD')}</span>
                <span className="fh-hpt-rest-btn-v">{diceLabel([{ die: p.die, count: 1 }], conMod)}</span>
              </button>
            ))}
            {rest?.finishRef && (
              <button type="button" className="fh-hpt-rest-btn is-finish" onClick={() => rest.finishRef.current?.()}>
                {L(lang, 'Concluir descanso', 'Finish rest')}
              </button>
            )}
          </div>
          {hdLeft > 0 && <div className="fh-hpt-rest-tip">{L(lang, 'Atalho: puxe a barra de PV para a direita.', 'Shortcut: pull the HP bar to the right.')}</div>}
        </div>
      )}

      <div className="fh-hpt-row is-exh">
        <Pips n={EXHAUSTION_MAX} on={exh} kind="exh" label={L(lang, 'Exaustão', 'Exhaustion')}
          inside={exh ? `${L(lang, 'Exaustão', 'Exhaustion')} ${exh}` : L(lang, 'Exaustão', 'Exhaustion')}
          onPick={lv => update(setExhaustion(char, lv))} />
      </div>
      {/* o que este nível faz ("Exaustão 2: −4 em todo Teste de d20 · deslocamento −3 m"); nível 6: morte */}
      {exhInfo && (
        <div key={exhInfo.level} className={`fh-exh-line${exhInfo.dead ? ' is-dead' : ''}`} role="status">
          <span className="fh-exh-line-t">{exhInfo.text}</span>
          {hints.exhaustion}
        </div>
      )}

      {down && (
        <div className="fh-hpt-downline" role="status">
          <strong className={dead ? 'is-dead' : stable ? 'is-stable' : ''}>{dead ? L(lang, 'Morto', 'Dead') : stable ? L(lang, 'Estável', 'Stable') : L(lang, 'Caído', 'Down')}</strong>
          <span>{dead ? L(lang, 'três falhas nos testes contra a morte', 'three failed death saves')
            : stable ? L(lang, 'com 0 PV, mas não rola mais testes contra a morte', 'at 0 HP, but no more death saves')
              : L(lang, 'role o teste contra a morte no dado vermelho', 'roll the death save on the red die')}</span>
          {hints.death}
        </div>
      )}
      {/* Falhas e sucessos só se marcam a 0 PV (acima disso as fileiras só mostram). Morto ou
          estável, o dado não rola: o rótulo dele diz o estado. */}
      <div className={`fh-hpt-row is-death${down ? ' is-down' : ''}${dead ? ' is-dead' : ''}${stable ? ' is-stable' : ''}`}>
        <Pips n={3} on={ds.fail} kind="ko" reverse label={L(lang, 'Falhas', 'Failures')} inside={L(lang, 'Falhas', 'Failures')} onPick={down ? (n => update({ deathSaves: { ...ds, fail: n } })) : null} />
        <button type="button" className={`fh-death-die${rolling ? ' is-rolling' : ''}`} disabled={!down || rolling || dead || stable} onClick={deathRoll}
          aria-label={dead ? L(lang, 'Morto: três falhas', 'Dead: three failures')
            : stable ? L(lang, 'Estável: sem testes contra a morte', 'Stable: no death saves')
              : down ? L(lang, 'Rolar teste contra a morte', 'Roll death save') : L(lang, 'Teste contra a morte (só a 0 PV)', 'Death save (only at 0 HP)')}>
          {dead
            ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a7.5 7.5 0 0 0-4.5 13.5V19h9v-2.5A7.5 7.5 0 0 0 12 3z" /><path d="M9 11.5h.01M15 11.5h.01M10 19v2M14 19v2" /></svg>
            : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 21 7v10l-9 5-9-5V7z" /><path d="M12 2v20M3 7l9 5 9-5" /></svg>}
          {down && <span className="fh-death-die-t">{dead ? L(lang, 'Morto', 'Dead') : stable ? L(lang, 'Estável', 'Stable') : L(lang, 'Rolar', 'Roll')}</span>}
        </button>
        <Pips n={3} on={ds.success} kind="ok" label={L(lang, 'Sucessos', 'Successes')} inside={L(lang, 'Sucessos', 'Successes')} onPick={down ? (n => update({ deathSaves: { ...ds, success: n } })) : null} />
      </div>
      {note && (
        <div key={note.key} className={`fh-hpt-note is-${note.death}`} role="status">
          <span className="fh-hpt-note-k">{L(lang, 'Teste contra a morte', 'Death save')}</span> {note.text}
        </div>
      )}

      {/* Condições e efeitos (src/sheet/FhStatus.jsx): abaixo das barras, antes da Sobrevivência */}
      {statusSlot}

      {/* Sobrevivência (src/sheet/survival.js): dias sem comida/água, fôlego, água gélida */}
      {(() => {
        const st = survivalStatus(char, conMod);
        const s = char.survival || {};
        const step = (key, dlt) => update(stepDays(char, key, dlt));
        const counter = (key, n, over, title, sub) => (
          <div className={`fh-surv-tile${over ? ' is-over' : n ? ' is-warn' : ''}`}>
            <span className="fh-surv-k">{title}</span>
            <span className="fh-surv-v">
              <button type="button" aria-label={L(lang, `${title}: menos um dia`, `${title}: one day less`)} onClick={() => step(key, -1)} disabled={!n}>−</button>
              <b className="mono">{n}</b>
              <button type="button" aria-label={L(lang, `${title}: mais um dia`, `${title}: one day more`)} onClick={() => step(key, 1)}>+</button>
            </span>
            <span className="fh-surv-s">{sub}</span>
          </div>
        );
        const breathTxt = 1 + conMod < 1 ? '30 s' : `${1 + conMod} min`;
        const counting = (s.food || 0) > 0 || (s.water || 0) > 0;
        return (
          <details className={`fh-surv-fold${counting ? ' is-counting' : ''}`} open={counting || undefined}>
          <summary>
            <span className="fh-surv-fold-t">{L(lang, 'Sobrevivência', 'Survival')}</span>
            <span className={`fh-surv-fold-s${st.nourished ? ' is-ok' : ' is-over'}`}>
              {st.nourished ? L(lang, 'nutrido ✓', 'nourished ✓') : L(lang, 'sem comida ou água ✗', 'short of food or water ✗')}
              {' · '}{L(lang, `fôlego ${breathTxt}`, `breath ${breathTxt}`)}
            </span>
          </summary>
          <div className="fh-surv" role="group" aria-label={L(lang, 'Sobrevivência', 'Survival')}>
            <div className={`fh-surv-tile is-state${st.nourished ? ' is-ok' : ' is-over'}`}>
              <span className="fh-surv-k">{L(lang, 'Nutrido', 'Nourished')}</span>
              <b className="fh-surv-big">{st.nourished ? '✓' : '✗'}</b>
              <span className="fh-surv-s">{st.nourished ? L(lang, 'comida e água em dia', 'food and water on track') : L(lang, 'faltando comida ou água', 'short of food or water')}</span>
            </div>
            {counter('food', s.food || 0, st.foodOver,
              L(lang, 'Sem comida', 'No food'),
              st.foodOver ? L(lang, `+1 exaustão/dia (limite ${st.foodLimit})`, `+1 exhaustion/day (limit ${st.foodLimit})`) : L(lang, `aguenta ${st.foodLimit} dias`, `lasts ${st.foodLimit} days`))}
            {counter('water', s.water || 0, st.waterOver,
              L(lang, 'Sem água', 'No water'),
              st.waterOver ? L(lang, '+1 exaustão ao fim do dia', '+1 exhaustion at day end') : L(lang, '1 galão/dia · ½: CD 15 CON', '1 gal/day · ½: DC 15 CON'))}
            <div className="fh-surv-tile">
              <span className="fh-surv-k">{L(lang, 'Fôlego', 'Breath')}</span>
              <b className="fh-surv-big">{breathTxt}</b>
              <span className="fh-surv-s">{breathLabel(conMod, lang)}</span>
            </div>
            <div className="fh-surv-tile">
              <span className="fh-surv-k">{L(lang, 'Água gélida', 'Frigid water')}</span>
              <b className="fh-surv-big">{`${frigidMinutes(conScore)} min`}</b>
              <span className="fh-surv-s">{L(lang, 'depois CD 10 CON/min', 'then DC 10 CON/min')}</span>
            </div>
          </div>
          </details>
        );
      })()}

    </div>
  );
}

/**
 * Painel "Dano · Cura · PV temp." (aberto pelo coração de PV da aba Jogar): digitar o
 * número em vez de arrastar o botão da barra. Só chama os handlers de quem usa
 * (applyHp e a troca dos PV temporários ficam em components/Sheet.jsx).
 */
export function HpPad({ lang, onDamage, onHeal, onTemp, onClose, max = 999 }) {
  const [raw, setRaw] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus({ preventScroll: true }); }, []);
  const n = Math.max(0, Math.min(999, parseInt(raw, 10) || 0));
  const bump = (v) => setRaw(String(Math.max(0, Math.min(999, n + v))));
  const run = (fn) => { if (!n) { inputRef.current?.focus(); return; } fn(n); setRaw(''); };
  return (
    <div className="fh-hp-pad" role="group" aria-label={L(lang, 'Ajustar Pontos de Vida', 'Adjust hit points')}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
      <div className="fh-hp-pad-num">
        <button type="button" className="fh-hp-pad-step" onClick={() => bump(-1)} disabled={!n} aria-label={L(lang, 'Menos 1', 'Minus 1')}>−</button>
        <input ref={inputRef} className="fh-hp-pad-input" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" enterKeyHint="done"
          value={raw} placeholder="0" maxLength={3}
          aria-label={L(lang, 'Quantos pontos', 'How many points')}
          onChange={e => setRaw(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} />
        <button type="button" className="fh-hp-pad-step" onClick={() => bump(1)} aria-label={L(lang, 'Mais 1', 'Plus 1')}>+</button>
        <span className="fh-hp-pad-quick" role="group" aria-label={L(lang, 'Somar ao número', 'Add to the number')}>
          {[5, 10].map(v => <button key={v} type="button" onClick={() => bump(v)}>+{v}</button>)}
        </span>
        <button type="button" className="fh-hp-pad-x" onClick={onClose} aria-label={L(lang, 'Fechar o ajuste de PV', 'Close the HP pad')}>✕</button>
      </div>
      <div className="fh-hp-pad-acts">
        <button type="button" className="fh-hp-pad-btn is-hurt" aria-disabled={!n} onClick={() => run(onDamage)}>
          <span aria-hidden="true">−</span> {L(lang, 'Dano', 'Damage')}
        </button>
        <button type="button" className="fh-hp-pad-btn is-heal" aria-disabled={!n} onClick={() => run(onHeal)}>
          <span aria-hidden="true">+</span> {L(lang, 'Cura', 'Heal')}
        </button>
        <button type="button" className="fh-hp-pad-btn is-temp" aria-disabled={!n} onClick={() => run((v) => onTemp(Math.min(v, max)))}
          title={L(lang, 'PV temporários não somam: o número digitado vira o novo valor', 'Temporary HP do not stack: the number typed becomes the new value')}>
          {L(lang, 'PV temp.', 'Temp HP')}
        </button>
      </div>
    </div>
  );
}
