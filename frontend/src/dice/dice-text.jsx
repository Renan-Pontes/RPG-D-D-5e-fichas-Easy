/**
 * dice-text.jsx
 *
 * Universal Inline Dice Notation & Interactive Roll Recognizer Component.
 * Re-exports core logic from dice-text.js and renders accessible <button> tokens
 * for dice formulas (🎲), attacks (⚔️), saves (🛡️), and ability checks (🎯).
 */
import React from 'react';
import {
  DICE_NOTATION_REGEX,
  ATTACK_ROLL_REGEX,
  SAVE_DC_REGEX,
  CHECK_DC_REGEX,
  findDiceAtOffset,
  parseTextWithDice,
  getClickedDiceFormula,
  executeDiceRoll,
  setupGlobalDiceClickListener,
} from './dice-text.js';

export {
  DICE_NOTATION_REGEX,
  ATTACK_ROLL_REGEX,
  SAVE_DC_REGEX,
  CHECK_DC_REGEX,
  findDiceAtOffset,
  parseTextWithDice,
  getClickedDiceFormula,
  executeDiceRoll,
  setupGlobalDiceClickListener,
};

/**
 * Transforms a plain text string into React nodes with tappable dice, attack, save, and check tokens.
 * @param {string} text
 * @param {object} [options]
 * @param {string} [options.lang='pt']
 * @param {Function} [options.onRoll]
 * @returns {React.ReactNode}
 */
export function renderDiceSpans(text, { lang = 'pt', onRoll } = {}) {
  if (!text || typeof text !== 'string') return text;
  const parts = parseTextWithDice(text);
  if (parts.length === 1 && parts[0].type === 'text') {
    return text;
  }

  const isPt = lang === 'pt';

  return parts.map((part, idx) => {
    if (part.type === 'text') {
      return part.value;
    }

    if (part.type === 'attack') {
      const formula = part.formula;
      const label = part.label || (isPt ? `Ataque (${formula})` : `Attack (${formula})`);
      return (
        <button
          key={`atk-${idx}-${formula}`}
          type="button"
          className="fh-dice-inline-token is-attack"
          data-roll-attack={formula}
          data-roll-label={label}
          onClick={(e) => {
            e.stopPropagation();
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(35);
            const payload = { formula, label, isAttack: true, sheet: true };
            if (onRoll) onRoll(payload);
            else executeDiceRoll(payload);
          }}
          aria-label={isPt ? `Rolar Ataque ${part.raw}` : `Roll Attack ${part.raw}`}
          title={isPt ? `Toque para rolar Ataque (${part.formula})` : `Tap to roll Attack (${part.formula})`}
        >
          <span className="fh-dice-inline-glyph" aria-hidden="true">⚔️</span>
          <span className="fh-dice-inline-val">{part.raw}</span>
        </button>
      );
    }

    if (part.type === 'save') {
      const formula = part.formula || '1d20';
      const label = part.label || (isPt ? `Salvaguarda (CD ${part.dc})` : `Saving Throw (DC ${part.dc})`);
      return (
        <button
          key={`save-${idx}-${part.raw}`}
          type="button"
          className="fh-dice-inline-token is-save"
          data-roll-save={formula}
          data-roll-label={label}
          onClick={(e) => {
            e.stopPropagation();
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(35);
            const payload = { formula, label, isSave: true, sheet: true };
            if (onRoll) onRoll(payload);
            else executeDiceRoll(payload);
          }}
          aria-label={isPt ? `Rolar Salvaguarda: ${part.raw}` : `Roll Saving Throw: ${part.raw}`}
          title={isPt ? `Toque para rolar Teste de Resistência` : `Tap to roll Saving Throw`}
        >
          <span className="fh-dice-inline-glyph" aria-hidden="true">🛡️</span>
          <span className="fh-dice-inline-val">{part.raw}</span>
        </button>
      );
    }

    if (part.type === 'check') {
      const formula = part.formula || '1d20';
      const label = part.label || (isPt ? `Teste de Perícia (CD ${part.dc})` : `Ability Check (DC ${part.dc})`);
      return (
        <button
          key={`check-${idx}-${part.raw}`}
          type="button"
          className="fh-dice-inline-token is-check"
          data-roll-check={formula}
          data-roll-label={label}
          onClick={(e) => {
            e.stopPropagation();
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(35);
            const payload = { formula, label, isCheck: true, sheet: true };
            if (onRoll) onRoll(payload);
            else executeDiceRoll(payload);
          }}
          aria-label={isPt ? `Rolar Teste: ${part.raw}` : `Roll Check: ${part.raw}`}
          title={isPt ? `Toque para rolar Teste de Atributo` : `Tap to roll Ability Check`}
        >
          <span className="fh-dice-inline-glyph" aria-hidden="true">🎯</span>
          <span className="fh-dice-inline-val">{part.raw}</span>
        </button>
      );
    }

    // Default: 'die' formula token
    const formula = part.formula;
    return (
      <button
        key={`die-${idx}-${formula}`}
        type="button"
        className="fh-dice-inline-token is-die"
        data-dice-roll={formula}
        onClick={(e) => {
          e.stopPropagation();
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(35);
          if (onRoll) {
            onRoll(formula);
          } else {
            executeDiceRoll(formula);
          }
        }}
        aria-label={isPt ? `Rolar ${part.raw}` : `Roll ${part.raw}`}
        title={isPt ? `Toque para rolar ${part.raw}` : `Tap to roll ${part.raw}`}
      >
        <span className="fh-dice-inline-glyph" aria-hidden="true">🎲</span>
        <span className="fh-dice-inline-val">{part.raw}</span>
      </button>
    );
  });
}

/**
 * React Component for rendering text with interactive dice, attack, save, and check tokens.
 */
export function DiceText({ text, lang = 'pt', onRoll, className = '' }) {
  if (text == null) return null;
  if (typeof text !== 'string') return <span className={className}>{text}</span>;
  const rendered = renderDiceSpans(text, { lang, onRoll });
  return <span className={`dice-text-container${className ? ` ${className}` : ''}`}>{rendered}</span>;
}

export default DiceText;
