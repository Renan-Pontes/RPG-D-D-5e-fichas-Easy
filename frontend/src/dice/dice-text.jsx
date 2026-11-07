/**
 * dice-text.jsx
 *
 * Universal Inline Dice Notation Recognizer & Tap-to-Roll Component.
 * Re-exports core logic from dice-text.js and renders accessible <button> tokens.
 */
import React from 'react';
import {
  DICE_NOTATION_REGEX,
  findDiceAtOffset,
  parseTextWithDice,
  getClickedDiceFormula,
  executeDiceRoll,
  setupGlobalDiceClickListener,
} from './dice-text.js';

export {
  DICE_NOTATION_REGEX,
  findDiceAtOffset,
  parseTextWithDice,
  getClickedDiceFormula,
  executeDiceRoll,
  setupGlobalDiceClickListener,
};

/**
 * Transforms a plain text string into React nodes with tappable dice tokens.
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
    const formula = part.formula;
    return (
      <button
        key={`die-${idx}-${formula}`}
        type="button"
        className="fh-dice-inline-token"
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
 * React Component for rendering text with interactive dice tokens.
 */
export function DiceText({ text, lang = 'pt', onRoll, className = '' }) {
  if (text == null) return null;
  if (typeof text !== 'string') return <span className={className}>{text}</span>;
  const rendered = renderDiceSpans(text, { lang, onRoll });
  return <span className={`dice-text-container${className ? ` ${className}` : ''}`}>{rendered}</span>;
}

export default DiceText;
