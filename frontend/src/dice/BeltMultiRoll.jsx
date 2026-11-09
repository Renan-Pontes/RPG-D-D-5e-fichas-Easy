// Rolagem em pares do cinto de dados: todos os hexágonos de dado com o MESMO atributo
// rolam juntos, agrupados em pares 1d20 + 1 dado de dano. Cada par ocupa uma coluna
// (ataque múltiplo = várias colunas lado a lado). Mesmo roll-up do rolador principal:
// o dano revela primeiro; o d20 revela depois e, num 20 natural, o dano roda de novo com
// os dados extras do crítico e soma ao valor que já tinha.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DieShape from './DieShape.jsx';
import { ROLLUP_DURATION_MS, PUMP_DURATION_MS, FALLOFF_DURATION_MS } from './dice-rollup.js';

const D20_SCALE = 1.7;                 // o d20 rola mais devagar: o dano sempre revela antes
const HOLD_MS = 3500, HOLD_CRIT_MS = 5000;
const r = (n) => 1 + Math.floor(Math.random() * n);
const rollN = (count, die) => Array.from({ length: Math.max(1, count) }, () => r(die));

/** Agrupa os slots do cinto em pares { atk, dmg } (por ordem no cinto); sobras viram unidades sozinhas. */
export function pairBeltSlots(slots) {
  const atk = slots.filter(s => Number(s.die) === 20);
  const dmg = slots.filter(s => Number(s.die) !== 20);
  const n = Math.max(atk.length, dmg.length);
  return Array.from({ length: n }, (_, i) => ({ atk: atk[i] || null, dmg: dmg[i] || null }));
}

/** Sorteia tudo de antemão (o palco só anima resultados prontos). */
export function rollBeltPairs(pairs, { abilMod, profB }) {
  return pairs.map(({ atk, dmg }) => {
    let a = null;
    if (atk) {
      const adv = atk.advMode || 'normal';
      const dice = adv === 'normal' ? [r(20)] : [r(20), r(20)];
      const nat = adv === 'adv' ? Math.max(...dice) : adv === 'dis' ? Math.min(...dice) : dice[0];
      const mod = abilMod + (atk.pb ? profB : 0);
      a = { dice, nat, mod, adv, total: nat + mod, crit: nat === 20, fumble: nat === 1 };
    }
    let d = null;
    if (dmg) {
      const dice = rollN(dmg.count || 1, dmg.die);
      const mod = abilMod + (dmg.pb ? profB : 0);
      const extra = a?.crit ? rollN(dmg.count || 1, dmg.die) : null;   // dados extras do crítico
      const sum = dice.reduce((t, v) => t + v, 0);
      const extraSum = extra ? extra.reduce((t, v) => t + v, 0) : 0;
      d = { die: Number(dmg.die), count: dmg.count || 1, dice, extra, mod, sum, total: sum + mod, critTotal: sum + extraSum + mod };
    }
    return { a, d };
  });
}

export default function BeltMultiRoll({ results, abilLabel, lang = 'pt', onClose }) {
  const pt = lang === 'pt';
  const [critPhase, setCritPhase] = useState(false);
  const anyCrit = results.some(x => x.a?.crit && x.d);
  const timers = useRef([]);
  // a última coluna conduz a vinheta do overlay
  const driver = results.length - 1;

  useEffect(() => {
    const climaxD20 = ROLLUP_DURATION_MS * D20_SCALE + PUMP_DURATION_MS;
    if (anyCrit) timers.current.push(setTimeout(() => setCritPhase(true), climaxD20 + 120));
    const settle = anyCrit
      ? climaxD20 + 120 + ROLLUP_DURATION_MS + FALLOFF_DURATION_MS
      : ROLLUP_DURATION_MS * D20_SCALE + FALLOFF_DURATION_MS;
    timers.current.push(setTimeout(onClose, settle + (results.some(x => x.a?.crit || x.a?.fumble) ? HOLD_CRIT_MS : HOLD_MS)));
    if (navigator.vibrate) navigator.vibrate(20);
    return () => timers.current.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const label = useMemo(() => {
    const n = results.length;
    if (n > 1) return pt ? `${abilLabel} · ataque múltiplo ×${n}` : `${abilLabel} · multiattack ×${n}`;
    return abilLabel;
  }, [results.length, abilLabel, pt]);

  const node = (
    <div className="dice-overlay belt-mr" role="status" aria-live="polite" onClick={onClose}
      aria-label={results.map((x, i) => `${i + 1}: ${x.a ? `${pt ? 'ataque' : 'attack'} ${x.a.total}` : ''}${x.d ? ` ${pt ? 'dano' : 'damage'} ${critPhase && x.d.extra ? x.d.critTotal : x.d.total}` : ''}`).join(' · ')}>
      <div className="belt-mr-label">{label}</div>
      <div className={`belt-mr-cols n-${results.length}`}>
        {results.map((x, i) => (
          <div key={i} className="belt-mr-col">
            {x.a && (
              <span className="mr-dshape dice-stage-2d belt-mr-d20" data-dice-tone={x.a.adv !== 'normal' ? x.a.adv : undefined}>
                <DieShape die={20} value={x.a.nat} targetValue={x.a.total} rolling animated isHero size={x.d ? 96 : 120} lang={lang}
                  timeScale={D20_SCALE} bodyFx={i === driver}
                  tone={x.a.adv !== 'normal' ? x.a.adv : null} isCrit={x.a.crit} isFumble={x.a.fumble} />
              </span>
            )}
            {x.d && (
              <span key={critPhase && x.d.extra ? 'crit' : 'base'} className="mr-dshape dice-stage-2d belt-mr-dmg">
                {critPhase && x.d.extra
                  ? <DieShape die={x.d.die} value={x.d.sum + x.d.extra.reduce((t, v) => t + v, 0)} targetValue={x.d.critTotal}
                      rolling animated isHero bodyFx={false} size={x.a ? 72 : 110} lang={lang} />
                  : <DieShape die={x.d.die} value={x.d.sum} targetValue={x.d.total}
                      rolling animated isHero bodyFx={!x.a && i === driver} size={x.a ? 72 : 110} lang={lang} />}
              </span>
            )}
            {x.d && <span className="belt-mr-sub">{x.d.count}d{x.d.die}{critPhase && x.d.extra ? ` + ${x.d.count}d${x.d.die}` : ''}</span>}
          </div>
        ))}
      </div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(node, document.body) : node;
}
