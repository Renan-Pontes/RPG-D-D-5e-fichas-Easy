/*
 * Revelação da rolagem de atributos com os dados 3D (etapa Atributos). Mostra,
 * uma por vez, as 6 rolagens de 4d6 que rollPatch já sorteou e gravou em
 * char.creation.abilityRolls. Nunca sorteia: só anima os valores prontos com
 * <DiceStage> (4 dados por palco; o menor fica esmaecido, descartado). Toque
 * para continuar; "Pular" fecha (os valores já estão na etapa).
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DiceStage from '../dice/DiceStage.jsx';
import { L } from './ui.jsx';
import './journey-extra.css';

/** Índice do dado descartado (o menor; o primeiro, se houver empate). Mesma regra da lista da etapa. */
export const droppedIndex = (dice) => dice.indexOf(Math.min(...dice));
/** Quanto tempo o total fica à mostra antes da próxima rolagem. */
const HOLD_MS = 1300;
/** Se a animação travar, revela o total mesmo assim. */
const SAFETY_MS = 4500;

export default function RollReveal({ rolls, lang, onClose }) {
  const [i, setI] = useState(0);
  const [settled, setSettled] = useState(false);
  const boxRef = useRef(null);
  const n = rolls.length;
  const last = i >= n - 1;
  const r = rolls[i];
  const low = droppedIndex(r.dice);
  const groups = [{ die: 6, rolls: r.dice.map((v, j) => ({ value: v, kept: j !== low })) }];
  const shown = (j) => j < i || (j === i && settled);

  const nextRoll = () => { setI(x => Math.min(x + 1, n - 1)); setSettled(false); };
  // Toque: revela o total (se os dados ainda rolam), passa para a próxima ou fecha no fim.
  const advance = () => {
    if (!settled) setSettled(true);
    else if (last) onClose();
    else nextRoll();
  };
  // O total fica à mostra um instante e a próxima rolagem começa sozinha (na última, espera o toque).
  useEffect(() => {
    if (!settled || last) return undefined;
    const t = setTimeout(nextRoll, HOLD_MS);
    return () => clearTimeout(t);
  }, [settled, last]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (settled) return undefined;
    const t = setTimeout(() => setSettled(true), SAFETY_MS);
    return () => clearTimeout(t);
  }, [i, settled]);
  // Foco no painel (Enter/Espaço continuam, Esc fecha) e devolve o foco ao fechar.
  useEffect(() => {
    const prev = document.activeElement;
    boxRef.current?.focus({ preventScroll: true });
    return () => { try { prev?.focus?.({ preventScroll: true }); } catch { /* elemento sumiu */ } };
  }, []);
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'Tab') {
      // Foco preso no diálogo: o painel e o "Pular" (quando aparece).
      e.preventDefault();
      const box = boxRef.current;
      const items = [box, ...box.querySelectorAll('button:not([disabled])')];
      const at = items.indexOf(document.activeElement);
      items[(at + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus({ preventScroll: true });
    }
    else if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); advance(); }
  };

  const sr = L(lang,
    `Rolagem ${i + 1}: ${r.total}. Dados ${r.dice.join(', ')}; o ${r.dice[low]} foi descartado.`,
    `Roll ${i + 1}: ${r.total}. Dice ${r.dice.join(', ')}; the ${r.dice[low]} was dropped.`);

  return createPortal(
    <div className="cr-rr" role="dialog" aria-modal="true" tabIndex={-1} ref={boxRef} onClick={advance} onKeyDown={onKey}
      aria-label={L(lang, 'Rolagem dos atributos', 'Ability score roll')}>
      <div className="cr-rr-in">
        <div className="cr-rr-k">{L(lang, 'A têmpera', 'The temper')} · {L(lang, `Rolagem ${i + 1} de ${n}`, `Roll ${i + 1} of ${n}`)}</div>
        <DiceStage key={i} groups={groups} className="cr-rr-stage" size2d={72} onSettled={() => setSettled(true)} />
        <div className="cr-rr-result">
          {settled ? (
            <>
              <div className="cr-rr-total" key={`t${i}`}>{r.total}</div>
              <div className="cr-rr-formula" aria-hidden="true">
                {r.dice.map((v, j) => <span key={j} className={`cr-rr-die ${j === low ? 'dropped' : ''}`}>{v}</span>)}
              </div>
              <div className="cr-rr-note">{L(lang, `Somam os 3 maiores; o ${r.dice[low]}, mais apagado, fica de fora.`, `The 3 highest add up; the ${r.dice[low]}, faded, is dropped.`)}</div>
            </>
          ) : (
            <div className="cr-rr-wait">{L(lang, 'Os dados rolam…', 'The dice are rolling…')}</div>
          )}
          <span className="cr-sr" aria-live="polite">{settled ? sr : ''}</span>
        </div>
        <ol className="cr-rr-strip" aria-label={L(lang, 'Seus 6 valores', 'Your 6 scores')}>
          {rolls.map((x, j) => (
            <li key={j} className={`${j === i ? 'now' : ''} ${shown(j) ? 'done' : ''}`}>{shown(j) ? x.total : '?'}</li>
          ))}
        </ol>
        <div className="cr-rr-foot">
          <span className="cr-rr-hint">
            {last && settled
              ? L(lang, 'Toque para distribuir os valores', 'Tap to assign your scores')
              : L(lang, 'Toque para continuar', 'Tap to continue')}
          </span>
          {!(last && settled) && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onClose(); }}>
              {L(lang, 'Pular', 'Skip')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
