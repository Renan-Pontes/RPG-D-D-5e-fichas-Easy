/**
 * dice-text.js
 *
 * Universal Inline Dice Notation Recognizer & Tap-to-Roll Engine (Core Logic).
 *
 * Recognizes any text written anywhere with a valid dice count formula
 * (e.g. "1d8", "3d8", "2d6+3", "1d20-2", "d12", "10d6") and enables immediate
 * tap-to-roll interaction either via:
 * 1. Proactive inline component rendering (<DiceText /> / renderDiceSpans)
 * 2. Universal global document event delegation intercepting taps on raw text nodes.
 */

/**
 * Matches canonical D&D dice notation:
 * [count]d[sides][+-mod] where sides in {4, 6, 8, 10, 12, 20, 100}
 */
export const DICE_NOTATION_REGEX = /(\b\d{0,3}d(?:4|6|8|10|12|20|100)(?:\s*[+-]\s*\d{1,3})?\b)/gi;

/**
 * Given a text and a character offset (e.g. from caretPositionFromPoint),
 * determines if the offset lies within or immediately adjacent to a valid dice formula.
 * @param {string} text
 * @param {number} offset
 * @returns {string|null} The normalized dice formula or null.
 */
export function findDiceAtOffset(text, offset) {
  if (!text || offset < 0) return null;
  const regex = /(\b\d{0,3}d(?:4|6|8|10|12|20|100)(?:\s*[+-]\s*\d{1,3})?\b)/gi;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const formula = m[1];
    const start = m.index;
    const end = start + formula.length;
    // Allow small touch jitter (+-2 chars around the token)
    if (offset >= start - 2 && offset <= end + 2) {
      return formula.replace(/\s+/g, '');
    }
  }
  return null;
}

/**
 * Splits a text string into an array of plain text chunks and dice formula tokens.
 * @param {string} text
 * @returns {Array<{ type: 'text'|'die', value?: string, formula?: string, raw?: string }>}
 */
export function parseTextWithDice(text) {
  if (!text || typeof text !== 'string') return [{ type: 'text', value: String(text || '') }];
  const regex = /(\b\d{0,3}d(?:4|6|8|10|12|20|100)(?:\s*[+-]\s*\d{1,3})?\b)/gi;
  const parts = [];
  let lastIndex = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: 'text', value: text.substring(lastIndex, m.index) });
    }
    const raw = m[1];
    const formula = raw.replace(/\s+/g, '');
    parts.push({ type: 'die', formula, raw });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.substring(lastIndex) });
  }
  return parts;
}

/**
 * Safely executes a dice roll via the global window.__diceRoll API.
 * @param {string} formula
 * @param {string} [label]
 * @returns {object|null}
 */
export function executeDiceRoll(formula, label) {
  if (typeof window !== 'undefined' && typeof window.__diceRoll === 'function') {
    const cleanFormula = String(formula || '').replace(/\s+/g, '');
    const cleanLabel = label || cleanFormula;
    return window.__diceRoll({ formula: cleanFormula, label: cleanLabel, sheet: true });
  }
  return null;
}

/**
 * Inspects a native DOM event (click/pointerup) to find if the user tapped on a dice formula.
 * @param {Event} e
 * @returns {string|null}
 */
export function getClickedDiceFormula(e) {
  if (!e || !e.target) return null;

  // 1. Check if clicking on an element with data-dice-roll
  const token = e.target.closest?.('[data-dice-roll]');
  if (token) {
    const formula = token.getAttribute('data-dice-roll');
    if (formula) return formula.replace(/\s+/g, '');
  }

  // 2. Ignore form inputs and active editable controls
  if (e.target.matches?.('input, textarea, select, [contenteditable="true"]')) return null;

  // 3. Try caretPositionFromPoint (Chrome, Firefox, Safari modern)
  let textNode = null;
  let offset = 0;

  if (typeof document !== 'undefined') {
    if (document.caretPositionFromPoint && e.clientX != null && e.clientY != null) {
      try {
        const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
        if (pos?.offsetNode?.nodeType === 3) {
          textNode = pos.offsetNode;
          offset = pos.offset;
        }
      } catch (_) {}
    } else if (document.caretRangeFromPoint && e.clientX != null && e.clientY != null) {
      try {
        const range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (range?.startContainer?.nodeType === 3) {
          textNode = range.startContainer;
          offset = range.startOffset;
        }
      } catch (_) {}
    }
  }

  if (textNode) {
    const text = textNode.textContent || '';
    const match = findDiceAtOffset(text, offset);
    if (match) return match;
  }

  // 4. Fallback: inspect the clicked element's text if it's a leaf node
  const el = e.target;
  if (el && (!el.children || el.children.length === 0)) {
    const text = el.textContent || '';
    const trimmed = text.trim();
    if (/^\d{0,3}d(?:4|6|8|10|12|20|100)(?:\s*[+-]\s*\d{1,3})?$/i.test(trimmed)) {
      return trimmed.replace(/\s+/g, '');
    }
    if (text.length < 40) {
      const match = text.match(/(\b\d{0,3}d(?:4|6|8|10|12|20|100)(?:\s*[+-]\s*\d{1,3})?\b)/i);
      if (match) return match[1].replace(/\s+/g, '');
    }
  }

  return null;
}

/**
 * Sets up a global capture-phase click and keydown listener on document
 * to intercept taps on any text containing a valid dice count formula.
 * @param {Function} performRoll
 * @returns {Function} Cleanup function.
 */
export function setupGlobalDiceClickListener(performRoll) {
  if (typeof document === 'undefined') return () => {};

  const handlePointerOrClick = (e) => {
    // Ignore non-primary clicks (right click, middle click)
    if (e.button != null && e.button !== 0) return;

    // Do not interfere with text input or typing
    if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;

    // Check if clicking a dedicated dice token
    const token = e.target.closest?.('[data-dice-roll]');
    if (token) {
      const formula = token.getAttribute('data-dice-roll');
      if (formula) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(35);
        if (performRoll) {
          performRoll({ formula, label: `Rolagem: ${formula}`, sheet: true });
        } else {
          executeDiceRoll(formula);
        }
        return;
      }
    }

    // If target is inside an existing interactive button/link (that isn't a dice token), respect it
    if (e.target.closest?.('button, a, summary')) return;

    // Detect if clicking on raw text matching a dice formula
    const formula = getClickedDiceFormula(e);
    if (formula) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(35);
      if (performRoll) {
        performRoll({ formula, label: `Rolagem: ${formula}`, sheet: true });
      } else {
        executeDiceRoll(formula);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const token = e.target.closest?.('[data-dice-roll]');
      if (token) {
        const formula = token.getAttribute('data-dice-roll');
        if (formula) {
          e.preventDefault();
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(35);
          if (performRoll) {
            performRoll({ formula, label: `Rolagem: ${formula}`, sheet: true });
          } else {
            executeDiceRoll(formula);
          }
        }
      }
    }
  };

  document.addEventListener('click', handlePointerOrClick, true);
  document.addEventListener('keydown', handleKeyDown, true);

  return () => {
    document.removeEventListener('click', handlePointerOrClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);
  };
}
