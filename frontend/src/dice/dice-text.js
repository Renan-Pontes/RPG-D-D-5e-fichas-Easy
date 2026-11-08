/**
 * dice-text.js
 *
 * Universal Inline Dice Notation & Interactive Roll Recognizer Engine.
 *
 * Recognizes text written anywhere containing:
 * 1. Dice count formulas (e.g. "1d8", "3d8", "2d6+3", "1d20-2", "d12", "10d6") -> 🎲 Formula roll
 * 2. Attack rolls (e.g. "+5 to hit", "Melee Attack Roll: +7", "+9 with spell attacks") -> ⚔️ Attack roll (1d20+bonus)
 * 3. Saving throw DCs (e.g. "DC 14 Dexterity save", "CD 15 teste de resistência de Constituição") -> 🛡️ Saving throw (1d20)
 * 4. Ability/Skill check DCs (e.g. "DC 12 Wisdom (Perception) check", "CD 10 teste de Atletismo") -> 🎯 Check roll (1d20)
 *
 * Enables immediate tap-to-roll interaction either via:
 * 1. Proactive inline component rendering (<DiceText /> / renderDiceSpans)
 * 2. Universal global document event delegation intercepting taps on raw text nodes.
 */

/**
 * Matches canonical D&D dice notation:
 * [count]d[sides][+-mod] where sides in {4, 6, 8, 10, 12, 20, 100}
 */
export const DICE_NOTATION_REGEX = /(\b\d{0,3}d(?:4|6|8|10|12|20|100)(?:\s*[+-]\s*\d{1,3})?\b)/gi;

/**
 * Ability names in English and Portuguese ordered by length to prevent partial prefix collisions.
 */
const ABIL_NAMES = [
  'Constitution', 'Constituição', 'Intelligence', 'Inteligência',
  'Dexterity', 'Destreza', 'Strength', 'Charisma', 'Carisma',
  'Sabedoria', 'Wisdom', 'Força',
  'CON', 'INT', 'DES', 'FOR', 'CAR', 'SAB', 'STR', 'DEX', 'WIS', 'CHA'
].sort((a, b) => b.length - a.length).join('|');

/**
 * Attack roll regex matching 2014 & 2024 notations in English and Portuguese:
 * - "+5 to hit", "+7 to hit"
 * - "Melee Attack Roll: +7", "Ranged Attack Roll: +5", "Melee or Ranged Attack Roll: +6"
 * - "+9 with spell attacks"
 * - "Ataque Corpo a Corpo: +5", "+5 para acertar"
 */
export const ATTACK_ROLL_REGEX = /(?:(?:Melee|Ranged|Melee\s+or\s+Ranged)?\s*(?:Weapon|Spell)?\s*Attack\s*Roll:\s*([+-]\s*\d+)|([+-]\s*\d+)\s*(?:to\s+hit|para\s+acertar|with\s+(?:spell|weapon)\s+attacks)|(?:Ataque\s+(?:Corpo\s+a\s+Corpo|à\s+Distância|com\s+Arma|Mágico):\s*([+-]\s*\d+)))/gi;

/**
 * Saving throw DC regex in English and Portuguese:
 * - "DC 14 Dexterity save", "DC 15 Strength saving throw"
 * - "CD 15 teste de resistência de Constituição", "CD 14 salvaguarda de Destreza"
 */
export const SAVE_DC_REGEX = new RegExp(
  `(?:(?:DC|CD)\\s*(\\d{1,2})\\s*(?:de\\s+|em\\s+um\\s+teste\\s+de\\s+resistência\\s+de\\s+|teste\\s+de\\s+resistência\\s+de\\s+|salvaguarda\\s+de\\s+)?\\b(${ABIL_NAMES})\\b\\s*(?:saving\\s+throw|save|teste\\s+de\\s+resistência|salvaguarda)?|\\b(${ABIL_NAMES})\\b\\s*(?:saving\\s+throw|save|teste\\s+de\\s+resistência|salvaguarda)\\s*(?:DC|CD)\\s*(\\d{1,2}))`,
  'gi'
);

/**
 * Ability & Skill check DC regex in English and Portuguese:
 * - "DC 12 Wisdom (Perception) check", "DC 15 Athletics check"
 * - "CD 12 teste de Percepção", "CD 15 teste de Atletismo"
 */
export const CHECK_DC_REGEX = /(?:(?:DC|CD)\s*(\d{1,2})\s+(?:de\s+)?([A-Za-zÀ-ÿ]+(?:\s*\([A-Za-zÀ-ÿ\s]+\))?)\s*(?:check|teste(?:\s+de\s+atributo|\s+de\s+perícia)?))/gi;

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
 * Splits a text string into an array of plain text chunks and interactive roll tokens
 * (dice, attacks, saves, checks).
 * @param {string} text
 * @returns {Array<{ type: 'text'|'die'|'attack'|'save'|'check', value?: string, formula?: string, raw?: string, bonus?: number, dc?: number, label?: string, abil?: string, target?: string }>}
 */
export function parseTextWithDice(text) {
  if (!text || typeof text !== 'string') return [{ type: 'text', value: String(text || '') }];

  const tokens = [];

  // 1. Attack rolls
  let m;
  const attackRe = new RegExp(ATTACK_ROLL_REGEX.source, 'gi');
  while ((m = attackRe.exec(text)) !== null) {
    const rawBonus = m[1] || m[2] || m[3];
    const bonusNum = parseInt(rawBonus.replace(/\s+/g, ''), 10);
    const sign = bonusNum >= 0 ? '+' : '';
    tokens.push({
      start: m.index,
      end: m.index + m[0].length,
      raw: m[0],
      type: 'attack',
      formula: `1d20${sign}${bonusNum}`,
      bonus: bonusNum,
      label: `Ataque (${sign}${bonusNum})`,
    });
  }

  // 2. Saving Throws
  const saveRe = new RegExp(SAVE_DC_REGEX.source, 'gi');
  while ((m = saveRe.exec(text)) !== null) {
    const dc = parseInt(m[1] || m[4], 10);
    const abil = m[2] || m[3];
    tokens.push({
      start: m.index,
      end: m.index + m[0].length,
      raw: m[0],
      type: 'save',
      formula: '1d20',
      dc,
      abil,
      label: `Salvaguarda (CD ${dc} ${abil})`,
    });
  }

  // 3. Ability / Skill Checks
  const checkRe = new RegExp(CHECK_DC_REGEX.source, 'gi');
  while ((m = checkRe.exec(text)) !== null) {
    const dc = parseInt(m[1], 10);
    const target = m[2];
    tokens.push({
      start: m.index,
      end: m.index + m[0].length,
      raw: m[0],
      type: 'check',
      formula: '1d20',
      dc,
      target,
      label: `Teste (CD ${dc} ${target})`,
    });
  }

  // 4. Dice Formulas
  const diceRe = new RegExp(DICE_NOTATION_REGEX.source, 'gi');
  while ((m = diceRe.exec(text)) !== null) {
    const raw = m[1];
    tokens.push({
      start: m.index,
      end: m.index + m[0].length,
      raw,
      type: 'die',
      formula: raw.replace(/\s+/g, ''),
      label: `Rolagem: ${raw.replace(/\s+/g, '')}`,
    });
  }

  // Sort and filter overlapping tokens (attacks, saves, and checks take precedence over raw dice inside them)
  tokens.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const filtered = [];
  let currentEnd = 0;
  for (const tok of tokens) {
    if (tok.start >= currentEnd) {
      filtered.push(tok);
      currentEnd = tok.end;
    }
  }

  // Build contiguous array of text chunks and roll tokens
  const parts = [];
  let lastPos = 0;
  for (const tok of filtered) {
    if (tok.start > lastPos) {
      parts.push({ type: 'text', value: text.substring(lastPos, tok.start) });
    }
    if (tok.type === 'die') {
      parts.push({ type: 'die', formula: tok.formula, raw: tok.raw });
    } else if (tok.type === 'attack') {
      parts.push({ type: 'attack', formula: tok.formula, raw: tok.raw, bonus: tok.bonus, label: tok.label });
    } else if (tok.type === 'save') {
      parts.push({ type: 'save', formula: tok.formula, raw: tok.raw, dc: tok.dc, abil: tok.abil, label: tok.label });
    } else if (tok.type === 'check') {
      parts.push({ type: 'check', formula: tok.formula, raw: tok.raw, dc: tok.dc, target: tok.target, label: tok.label });
    } else {
      parts.push(tok);
    }
    lastPos = tok.end;
  }
  if (lastPos < text.length) {
    parts.push({ type: 'text', value: text.substring(lastPos) });
  }

  return parts;
}

/**
 * Safely executes a dice roll via the global window.__diceRoll API.
 * @param {string|object} options
 * @param {string} [label]
 * @returns {object|null}
 */
export function executeDiceRoll(options, label) {
  if (typeof window !== 'undefined' && typeof window.__diceRoll === 'function') {
    if (typeof options === 'string') {
      const cleanFormula = options.replace(/\s+/g, '');
      const cleanLabel = label || cleanFormula;
      return window.__diceRoll({ formula: cleanFormula, label: cleanLabel, sheet: true });
    }
    return window.__diceRoll({ sheet: true, ...options });
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
 * to intercept taps on any text or token containing a valid dice formula, attack roll, save, or check.
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

    // Check if clicking a dedicated interactive token
    const token = e.target.closest?.('[data-dice-roll], [data-roll-attack], [data-roll-save], [data-roll-check]');
    if (token) {
      const formula = token.getAttribute('data-dice-roll');
      const attackFormula = token.getAttribute('data-roll-attack');
      const saveFormula = token.getAttribute('data-roll-save');
      const checkFormula = token.getAttribute('data-roll-check');
      const rollLabel = token.getAttribute('data-roll-label');

      e.preventDefault();
      e.stopPropagation();
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(35);

      if (attackFormula) {
        const payload = { formula: attackFormula, label: rollLabel || `Ataque (${attackFormula})`, isAttack: true, sheet: true };
        if (performRoll) performRoll(payload);
        else executeDiceRoll(payload);
        return;
      }
      if (saveFormula) {
        const payload = { formula: saveFormula, label: rollLabel || 'Teste de Resistência', isSave: true, sheet: true };
        if (performRoll) performRoll(payload);
        else executeDiceRoll(payload);
        return;
      }
      if (checkFormula) {
        const payload = { formula: checkFormula, label: rollLabel || 'Teste de Atributo', isCheck: true, sheet: true };
        if (performRoll) performRoll(payload);
        else executeDiceRoll(payload);
        return;
      }
      if (formula) {
        const payload = { formula, label: rollLabel || `Rolagem: ${formula}`, sheet: true };
        if (performRoll) performRoll(payload);
        else executeDiceRoll(formula);
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
      const token = e.target.closest?.('[data-dice-roll], [data-roll-attack], [data-roll-save], [data-roll-check]');
      if (token) {
        token.click();
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
