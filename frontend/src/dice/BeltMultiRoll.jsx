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
// Nenhum roll-up igual ao outro: cada dado ganha atraso (0–200 ms), aceleração (0–25 %)
// e um desvio sutil de matiz/saturação/brilho (±20 %).
const vary = () => {
  const j = () => Math.random() * 2 - 1;
  return {
    delay: Math.random() * 200,
    speed: 1 / (1 + Math.random() * 0.25),
    filter: `hue-rotate(${(j() * 0.2 * 60).toFixed(1)}deg) saturate(${(1 + j() * 0.2).toFixed(2)}) brightness(${(1 + j() * 0.2).toFixed(2)})`,
  };
};
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

export default function BeltMultiRoll({ results, lang = 'pt', onClose }) {
  const pt = lang === 'pt';
  // variações fixas por coluna (sorteadas uma vez)
  const fx = useMemo(() => results.map(() => {
    const a = vary(); const d = vary();
    // o d20 continua revelando depois do seu dano
    a.scale = D20_SCALE * a.speed; d.scale = d.speed;
    if (a.delay + ROLLUP_DURATION_MS * a.scale < d.delay + ROLLUP_DURATION_MS * d.scale + 150) a.delay = d.delay + 150;
    return { a, d };
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [crit, setCrit] = useState(() => new Set());
  const timers = useRef([]);
  const driver = results.length - 1;

  useEffect(() => {
    let end = 0;
    results.forEach((x, i) => {
      const f = fx[i];
      const climax = f.a.delay + ROLLUP_DURATION_MS * f.a.scale + PUMP_DURATION_MS;
      if (x.a && x.a.crit && x.d) {
        timers.current.push(setTimeout(() => setCrit(s => new Set(s).add(i)), climax + 120));
        end = Math.max(end, climax + 120 + ROLLUP_DURATION_MS * f.d.scale + FALLOFF_DURATION_MS);
      }
      end = Math.max(end, f.a.delay + ROLLUP_DURATION_MS * f.a.scale + FALLOFF_DURATION_MS, f.d.delay + ROLLUP_DURATION_MS * f.d.scale + FALLOFF_DURATION_MS);
    });
    const dramatic = results.some(x => x.a?.crit || x.a?.fumble);
    timers.current.push(setTimeout(onClose, end + (dramatic ? HOLD_CRIT_MS : HOLD_MS)));
    if (navigator.vibrate) navigator.vibrate(20);
    return () => timers.current.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // sem rótulos na tela (só o dado fala); o texto completo fica para leitores de tela
  const node = (
    <div className="dice-overlay belt-mr" role="status" aria-live="polite" onClick={onClose}
      aria-label={results.map((x, i) => `${i + 1}: ${x.a ? `${pt ? 'ataque' : 'attack'} ${x.a.total}` : ''}${x.d ? ` ${pt ? 'dano' : 'damage'} ${crit.has(i) && x.d.extra ? x.d.critTotal : x.d.total}` : ''}`).join(' · ')}>
      <div className={`belt-mr-cols n-${results.length}`}>
        {results.map((x, i) => {
          const f = fx[i];
          const critOn = crit.has(i) && x.d?.extra;
          return (
            <div key={i} className="belt-mr-col">
              {x.a && (
                <span className="mr-dshape dice-stage-2d belt-mr-d20" style={{ filter: f.a.filter }} data-dice-tone={x.a.adv !== 'normal' ? x.a.adv : undefined}>
                  <DieShape die={20} value={x.a.nat} targetValue={x.a.total} rolling animated isHero size={x.d ? 96 : 120} lang={lang}
                    delayMs={f.a.delay} timeScale={f.a.scale} bodyFx={i === driver}
                    tone={x.a.adv !== 'normal' ? x.a.adv : null} isCrit={x.a.crit} isFumble={x.a.fumble} />
                </span>
              )}
              {x.d && (
                <span key={critOn ? 'crit' : 'base'} className="mr-dshape dice-stage-2d belt-mr-dmg" style={{ filter: f.d.filter }}>
                  {critOn
                    ? <DieShape die={x.d.die} value={x.d.sum + x.d.extra.reduce((t, v) => t + v, 0)} targetValue={x.d.critTotal}
                        rolling animated isHero bodyFx={false} timeScale={f.d.scale} size={x.a ? 72 : 110} lang={lang} />
                    : <DieShape die={x.d.die} value={x.d.sum} targetValue={x.d.total}
                        rolling animated isHero bodyFx={!x.a && i === driver} delayMs={f.d.delay} timeScale={f.d.scale} size={x.a ? 72 : 110} lang={lang} />}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(node, document.body) : node;
}
