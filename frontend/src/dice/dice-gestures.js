/**
 * dice-gestures.js
 *
 * Universal 3-state vertical swipe gesture engine for Advantage and Disadvantage.
 *
 * Gestures on any d20 / check / save / attack roll token or button:
 * - Swipe UP (dy < -25px): Toggle ADVANTAGE (Emerald Green visual feedback).
 * - Swipe DOWN (dy > +25px): Toggle DISADVANTAGE (Crimson Red visual feedback).
 * - Swipe back toward center: Reset to NORMAL.
 * - Tap / Click: Executes the roll with the currently active modifier.
 *
 * States:
 * - 'adv': Advantage (green glow, ▲ badge)
 * - 'dis': Disadvantage (red glow, ▼ badge)
 * - null / 'normal': Standard roll
 */

const SWIPE_THRESHOLD_PX = 24;
const TAP_THRESHOLD_PX = 10;

/**
 * Updates the 3-state modifier on an element.
 * @param {HTMLElement} el
 * @param {'adv'|'dis'|null} nextState
 */
export function setElementAdvState(el, nextState) {
  if (!el || !el.setAttribute) return;

  if (nextState === 'adv') {
    el.setAttribute('data-roll-adv', 'adv');
    el.classList.add('has-adv');
    el.classList.remove('has-dis');
    el.title = (el.title || '').replace(/\s*\(Vantagem|Desvantagem\)/gi, '') + ' (Vantagem)';
  } else if (nextState === 'dis') {
    el.setAttribute('data-roll-adv', 'dis');
    el.classList.add('has-dis');
    el.classList.remove('has-adv');
    el.title = (el.title || '').replace(/\s*\(Vantagem|Desvantagem\)/gi, '') + ' (Desvantagem)';
  } else {
    el.removeAttribute('data-roll-adv');
    el.classList.remove('has-adv');
    el.classList.remove('has-dis');
    el.title = (el.title || '').replace(/\s*\(Vantagem|Desvantagem\)/gi, '');
  }
}

/**
 * Returns the current advantage state of an element.
 * @param {HTMLElement} el
 * @returns {'adv'|'dis'|null}
 */
export function getElementAdvState(el) {
  if (!el || !el.getAttribute) return null;
  const val = el.getAttribute('data-roll-adv');
  if (val === 'adv' || val === 'dis') return val;
  return null;
}

/**
 * Global pointer tracker state
 */
let activeTrack = null;

/**
 * Finds the closest rollable d20 element from an event target.
 * @param {EventTarget} target
 * @returns {HTMLElement|null}
 */
export function findRollableElement(target) {
  if (!target || !target.closest) return null;
  return target.closest([
    '[data-roll-attack]',
    '[data-roll-save]',
    '[data-roll-check]',
    '[data-dice-roll]',
    '[data-d20-interactive]',
    '[data-roll-adv]',
    '.statblock-roll-btn',
    '.statblock-action-header-roll-btn',
    '.statblock-action-exception-btn',
    '.statblock-skill-chip',
    '.init-btn',
    '.statblock-init-btn',
    '.abil-btn',
    '.save-btn',
    '.statblock-action-skill-btn',
    '.fh-stat',
    '.fh-save',
    '.fh-skill',
    '.fh-hex',
    '.fh-skill-roll',
    '.fh-atk-btn.is-hit',
    '.fh-medal.is-roll',
  ].join(', '));
}

/** Seletor CSS dos campos que rolam d20: neles o gesto vertical é vantagem/desvantagem,
 *  nunca rolagem da página nem encaixe de painel (ficha.css usa `touch-action: pan-x`). */
export const ROLL_FIELD_SELECTOR = '[data-roll-attack], [data-roll-save], [data-roll-check], [data-d20-interactive], [data-roll-adv], .abil-btn, .save-btn, .init-btn, .fh-stat, .fh-save, .fh-skill, .fh-hex, .fh-skill-roll, .fh-atk-btn.is-hit, .fh-medal.is-roll';

/** Último estado de vantagem escolhido por gesto num campo, para o rolador da ficha usar. */
export function advForTarget(target) {
  const el = findRollableElement(target);
  return el ? getElementAdvState(el) : null;
}

/**
 * Sets up global pointer-based swipe detection for Advantage / Disadvantage across all roll elements.
 * @returns {Function} Cleanup function.
 */
export function setupGlobalDiceSwipeListener() {
  if (typeof document === 'undefined') return () => {};

  const onPointerDown = (e) => {
    // Only primary pointer (finger or left click)
    if (e.button != null && e.button !== 0) return;

    const el = findRollableElement(e.target);
    if (!el) return;

    // Check if this token rolls a d20 (attack, save, check, or 1d20)
    const formula = el.getAttribute('data-dice-roll') ||
                    el.getAttribute('data-roll-attack') ||
                    el.getAttribute('data-roll-save') ||
                    el.getAttribute('data-roll-check') || '';
    const isD20 = /d20/i.test(formula) ||
                  el.hasAttribute('data-roll-attack') ||
                  el.hasAttribute('data-roll-save') ||
                  el.hasAttribute('data-roll-check') ||
                  el.hasAttribute('data-roll-adv') ||
                  el.classList.contains('init-btn') ||
                  el.classList.contains('statblock-init-btn') ||
                  el.classList.contains('abil-btn') ||
                  el.classList.contains('save-btn') ||
                  el.classList.contains('statblock-action-header-roll-btn') ||
                  el.classList.contains('statblock-action-exception-btn') ||
                  el.classList.contains('statblock-roll-btn') ||
                  el.classList.contains('statblock-skill-chip') ||
                  el.classList.contains('statblock-action-skill-btn') ||
                  el.classList.contains('fh-stat') ||
                  el.classList.contains('fh-save') ||
                  el.classList.contains('fh-skill') ||
                  el.matches('.fh-hex, .fh-skill-roll, .fh-atk-btn.is-hit, .fh-medal.is-roll');

    if (!isD20) return;

    activeTrack = {
      el,
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      initialAdv: getElementAdvState(el),
      swiped: false,
    };
  };

  const onPointerMove = (e) => {
    if (!activeTrack) return;
    const dy = e.clientY - activeTrack.startY;
    const dx = e.clientX - activeTrack.startX;

    if (Math.abs(dy) > TAP_THRESHOLD_PX && Math.abs(dy) > Math.abs(dx)) {
      activeTrack.swiped = true;
      activeTrack.el.classList.add('is-swiping');

      // Visual preview during drag
      if (dy < -SWIPE_THRESHOLD_PX) {
        activeTrack.el.classList.add('preview-adv');
        activeTrack.el.classList.remove('preview-dis');
      } else if (dy > SWIPE_THRESHOLD_PX) {
        activeTrack.el.classList.add('preview-dis');
        activeTrack.el.classList.remove('preview-adv');
      } else {
        activeTrack.el.classList.remove('preview-adv');
        activeTrack.el.classList.remove('preview-dis');
      }
    }
  };

  const onPointerUp = (e) => {
    if (!activeTrack) return;
    const { el, startY, initialAdv, swiped } = activeTrack;
    const dy = e.clientY - startY;

    el.classList.remove('is-swiping', 'preview-adv', 'preview-dis');

    if (swiped && Math.abs(dy) >= SWIPE_THRESHOLD_PX) {
      // Swipe gesture committed
      let nextAdv = null;
      if (dy < -SWIPE_THRESHOLD_PX) {
        // Swiped UP
        // If already 'dis', moves to neutral; if neutral or already 'adv', goes to 'adv'
        nextAdv = initialAdv === 'dis' ? null : 'adv';
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
      } else if (dy > SWIPE_THRESHOLD_PX) {
        // Swiped DOWN
        // If already 'adv', moves to neutral; if neutral or already 'dis', goes to 'dis'
        nextAdv = initialAdv === 'adv' ? null : 'dis';
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
      }
      setElementAdvState(el, nextAdv);

      // Prevent click handler from firing roll immediately on swipe release
      const killClick = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        el.removeEventListener('click', killClick, true);
      };
      el.addEventListener('click', killClick, true);
      setTimeout(() => el.removeEventListener('click', killClick, true), 100);
    }

    activeTrack = null;
  };

  const onPointerCancel = () => {
    if (activeTrack) {
      activeTrack.el.classList.remove('is-swiping', 'preview-adv', 'preview-dis');
      activeTrack = null;
    }
  };

  document.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
  document.addEventListener('pointermove', onPointerMove, { passive: true, capture: true });
  document.addEventListener('pointerup', onPointerUp, { passive: true, capture: true });
  document.addEventListener('pointercancel', onPointerCancel, { passive: true, capture: true });

  return () => {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('pointercancel', onPointerCancel, true);
  };
}
