import { useState, useRef } from 'react';
import Utils from '../../../utils.js';
import { isActionKey, renderDieShape } from './BeltHex.jsx';

export const BeltQuickSlot = ({
  slot,
  index,
  isActive,
  isDragTarget = false,
  onSelect,
  onShiftDie,
  onShiftCount,
  onSetAdvMode,
  onRoll,
  char,
  lang,
  pbActive,
  profB,
}) => {
  const HOLD_TO_ROLL_MS = 220;
  const touchRef = useRef({ x: 0, y: 0, time: 0, pointerId: null });
  const dieKnobRef = useRef({ startX: 0, startY: 0, movedY: false, movedX: false, pointerId: null, at: 0 });
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const chargeTimerRef = useRef(null);

  const pt = lang === 'pt';
  const isBound = !!slot.bound;
  const boundMod = isBound ? Utils.abilityMod(char, slot.bound) : 0;
  const isD20 = Number(slot.die) === 20;
  const advMode = isD20 ? (slot.advMode || 'normal') : 'normal';

  // 1. Die count: When d20 is in Advantage or Disadvantage stance, display 2d20!
  const hasStance = isD20 && (advMode === 'adv' || advMode === 'dis');
  const count = hasStance ? 2 : (slot.count > 1 ? slot.count : 1);
  const dieTypeStr = `${count}d${slot.die}`;

  // 2. Consolidated bonus as a singular unified sum on the right side of the dice type:
  // When an ability score is assigned, sum = boundMod + (pbActive ? profB : 0).
  // When not assigned, if pbActive is on, sum = profB.
  const hasBonus = isBound || pbActive;
  const totalMod = (isBound ? boundMod : 0) + (pbActive ? profB : 0);
  const bonusStr = hasBonus ? Utils.fmtMod(totalMod) : '';
  const formulaLabel = `${dieTypeStr}${bonusStr}`;

  // Slot container gestures: Hold & Release to roll; Simple Tap on d20 deactivates stance!
  const onDown = (e) => {
    const pointerId = e.pointerId;
    touchRef.current = { x: e.clientX, y: e.clientY, time: Date.now(), pointerId };
    onSelect(index);
    try { e.currentTarget.setPointerCapture?.(pointerId); } catch (_) {}

    if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
    chargeTimerRef.current = setTimeout(() => {
      setIsCharging(true);
      if (navigator.vibrate) navigator.vibrate(18);
    }, HOLD_TO_ROLL_MS);
  };

  const onUp = (e) => {
    if (chargeTimerRef.current) {
      clearTimeout(chargeTimerRef.current);
      chargeTimerRef.current = null;
    }
    const wasCharging = isCharging;
    setIsCharging(false);

    const t = touchRef.current;
    if (t.pointerId != null) {
      try { e.currentTarget.releasePointerCapture?.(t.pointerId); } catch (_) {}
    }
    touchRef.current = { x: 0, y: 0, time: 0, pointerId: null };

    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    const dist = Math.hypot(dx, dy);
    const holdDuration = Date.now() - t.time;

    // Horizontal swipe -> die type
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 18) {
      const step = Math.max(1, Math.floor(Math.abs(dx) / 24));
      onShiftDie(index, dx > 0 ? step : -step);
      return;
    }
    // Vertical swipe -> count
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 18) {
      const step = Math.max(1, Math.floor(Math.abs(dy) / 24));
      onShiftCount(index, dy < 0 ? step : -step);
      return;
    }

    // In-place interaction (dist < 16)
    if (dist < 16) {
      onSelect(index);
      if (holdDuration >= HOLD_TO_ROLL_MS || wasCharging) {
        // HELD AND THEN RELEASED -> EXECUTE ROLL!
        onRoll(index);
      } else {
        // SIMPLE TAP:
        // If it's a d20 with Advantage or Disadvantage, simple tap deactivates the stance!
        if (isD20 && advMode !== 'normal') {
          onSetAdvMode(index, 'normal');
          if (navigator.vibrate) navigator.vibrate(20);
        }
      }
    }
  };

  // D20 Die Silhouette Knob Gestures (Advantage / Disadvantage knob solely when d20)
  const onDieKnobPointerDown = (e) => {
    onSelect(index);
    if (!isD20) return;
    e.stopPropagation();
    const pointerId = e.pointerId;
    dieKnobRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      movedY: false,
      movedX: false,
      pointerId,
      at: Date.now(),
    };
    setIsPulling(true);
    try { e.currentTarget.setPointerCapture?.(pointerId); } catch (_) {}

    if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
    chargeTimerRef.current = setTimeout(() => {
      setIsCharging(true);
      if (navigator.vibrate) navigator.vibrate(18);
    }, HOLD_TO_ROLL_MS);
  };

  const onDieKnobPointerMove = (e) => {
    if (!isD20) return;
    e.stopPropagation();
    const g = dieKnobRef.current;
    if (!g.pointerId) return;
    const dy = e.clientY - g.startY;
    const dx = e.clientX - g.startX;

    if (Math.abs(dy) > 4 && Math.abs(dy) >= Math.abs(dx)) {
      g.movedY = true;
      if (chargeTimerRef.current) {
        clearTimeout(chargeTimerRef.current);
        chargeTimerRef.current = null;
      }
      setIsCharging(false);
      const clamped = Math.max(-10, Math.min(10, dy));
      setPullY(clamped);
    } else if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy)) {
      g.movedX = true;
      if (chargeTimerRef.current) {
        clearTimeout(chargeTimerRef.current);
        chargeTimerRef.current = null;
      }
      setIsCharging(false);
    }
  };

  const onDieKnobPointerUp = (e) => {
    if (!isD20) return;
    e.stopPropagation();
    if (chargeTimerRef.current) {
      clearTimeout(chargeTimerRef.current);
      chargeTimerRef.current = null;
    }
    const wasCharging = isCharging;
    setIsCharging(false);

    const g = dieKnobRef.current;
    if (!g.pointerId) return;
    const dy = e.clientY - g.startY;
    const dx = e.clientX - g.startX;
    const movedY = g.movedY;
    const movedX = g.movedX;
    const holdDuration = Date.now() - g.at;

    try { e.currentTarget.releasePointerCapture?.(g.pointerId); } catch (_) {}
    dieKnobRef.current = { startX: 0, startY: 0, movedY: false, movedX: false, pointerId: null, at: 0 };
    setIsPulling(false);
    setPullY(0);

    if (movedX) {
      onShiftDie(index, dx > 0 ? 1 : -1);
      return;
    }

    if (movedY) {
      if (dy < -5) {
        onSetAdvMode(index, 'adv'); // Drag Up: Advantage
      } else if (dy > 5) {
        onSetAdvMode(index, 'dis'); // Drag Down: Disadvantage
      } else {
        onSetAdvMode(index, 'normal');
      }
      return;
    }

    // In-place interaction on D20 silhouette:
    onSelect(index);
    if (holdDuration >= HOLD_TO_ROLL_MS || wasCharging) {
      // HELD AND THEN RELEASED -> EXECUTE ROLL!
      onRoll(index);
    } else {
      // SIMPLE TAP on d20 knob:
      // Deactivate advantage / disadvantage!
      if (advMode !== 'normal') {
        onSetAdvMode(index, 'normal');
        if (navigator.vibrate) navigator.vibrate(20);
      }
    }
  };

  const onDieKnobPointerCancel = (e) => {
    if (!isD20) return;
    e.stopPropagation();
    if (chargeTimerRef.current) {
      clearTimeout(chargeTimerRef.current);
      chargeTimerRef.current = null;
    }
    setIsCharging(false);
    dieKnobRef.current = { startX: 0, startY: 0, movedY: false, movedX: false, pointerId: null, at: 0 };
    setIsPulling(false);
    setPullY(0);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); onShiftDie(index, -1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); onShiftDie(index, 1); return; }
    if (isD20 && e.key === 'ArrowUp') { e.preventDefault(); onSetAdvMode(index, 'adv'); return; }
    if (isD20 && e.key === 'ArrowDown') { e.preventDefault(); onSetAdvMode(index, 'dis'); return; }
    if (isD20 && e.key === 'Escape') { e.preventDefault(); onSetAdvMode(index, 'normal'); return; }
    if (!isD20 && e.key === 'ArrowUp') { e.preventDefault(); onShiftCount(index, 1); return; }
    if (!isD20 && e.key === 'ArrowDown') { e.preventDefault(); onShiftCount(index, -1); return; }
    if (isActionKey(e)) { e.preventDefault(); onSelect(index); onRoll(index); }
  };

  const stanceText = advMode === 'adv' ? (pt ? ' (Vantagem 🟢)' : ' (Advantage 🟢)')
                   : advMode === 'dis' ? (pt ? ' (Desvantagem 🔴)' : ' (Disadvantage 🔴)')
                   : '';

  const ariaLabel = pt
    ? `Dado do cinto: ${formulaLabel}${stanceText}. Toque para rolar`
    : `Belt die: ${formulaLabel}${stanceText}. Tap to roll`;

  return (
    <div className={`fh-belt-hex-wrap is-quick-slot die-d${slot.die}${isD20 ? ` adv-${advMode}` : ''}${isBound ? ` is-bound tone-${slot.bound}` : ''}`}>
      {/* SVG Glowing Edges solely when d20: Top 2 (Advantage Green), Bottom 2 (Disadvantage Red) */}
      {isD20 && (
        <svg
          className={`fh-belt-glow-svg adv-${advMode}`}
          viewBox="0 0 100 115.47"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {advMode === 'adv' && (
            <g className="fh-glow-group-adv">
              <path className="fh-edge-shadow-adv" d="M 0,28.87 L 50,0 L 100,28.87" />
              <path className="fh-edge-stroke-adv" d="M 0,28.87 L 50,0 L 100,28.87" />
              <path className="fh-edge-shine-adv" d="M 0,28.87 L 50,0 L 100,28.87" />
            </g>
          )}
          {advMode === 'dis' && (
            <g className="fh-glow-group-dis">
              <path className="fh-edge-shadow-dis" d="M 0,86.60 L 50,115.47 L 100,86.60" />
              <path className="fh-edge-stroke-dis" d="M 0,86.60 L 50,115.47 L 100,86.60" />
              <path className="fh-edge-shine-dis" d="M 0,86.60 L 50,115.47 L 100,86.60" />
            </g>
          )}
        </svg>
      )}

      <article
        className={`fh-belt-slot${pbActive ? ' has-pb' : ''}${isActive ? ' is-active' : ''}${isDragTarget ? ' is-drag-target' : ''}${isBound ? ` is-bound tone-${slot.bound}` : ''}${isD20 ? ` adv-${advMode}` : ''}${isCharging ? ' is-charging-roll' : ''}`}
        data-quick-slot-index={index}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => {
          if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
          setIsCharging(false);
          touchRef.current = { x: 0, y: 0, time: 0, pointerId: null };
        }}
        onFocus={() => onSelect(index)}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="button"
        aria-label={ariaLabel}
        title={isD20
          ? (pt ? `d20: toque para rolar · arraste ↑ vantagem, ↓ desvantagem` : `d20: tap to roll · drag ↑ advantage, ↓ disadvantage`)
          : (pt ? `Toque para rolar · deslize ↔ troca o dado, ↕ a quantidade` : `Tap to roll · swipe ↔ changes the die, ↕ the count`)}
      >
        {/* Specular Reflection Sheen when PB Active */}
        {pbActive && <div className={`fh-belt-sheen is-slot-${index}`} aria-hidden="true" />}

        {/* Center: Perfectly Centered Die Silhouette Badge. When d20, silhouette is the stance knob! */}
        <div
          className={`fh-belt-die-badge die-d${slot.die}${isD20 ? ` is-d20-knob adv-${advMode}${isPulling ? ' is-pulling' : ''}` : ''}`}
          style={isD20 && pullY !== 0 ? { transform: `translate(-50%, calc(-50% + ${pullY}px)) scale(1.03)` } : undefined}
          onPointerDown={onDieKnobPointerDown}
          onPointerMove={onDieKnobPointerMove}
          onPointerUp={onDieKnobPointerUp}
          onPointerCancel={onDieKnobPointerCancel}
          role={isD20 ? 'slider' : undefined}
          aria-valuenow={isD20 ? (advMode === 'adv' ? 1 : advMode === 'dis' ? -1 : 0) : undefined}
          aria-valuemin={isD20 ? -1 : undefined}
          aria-valuemax={isD20 ? 1 : undefined}
          aria-label={isD20 ? (pt ? `Postura do d20: ${advMode}` : `d20 Stance: ${advMode}`) : undefined}
        >
          <svg className="fh-die-silhouette-svg" viewBox="0 0 100 100" aria-hidden="true">
            {renderDieShape(slot.die)}
          </svg>
          {/* Clean inline consolidated formula: e.g. '2d20+3', '1d12+5', '1d6', etc. */}
          <div className="fh-belt-dice-lockup">
            <span className="fh-belt-slot-dice">
              {formulaLabel}
            </span>
          </div>
        </div>
      </article>
      {pbActive && (
          <svg className="fh-belt-pb-contour" viewBox="0 0 100 115.47" preserveAspectRatio="none" aria-hidden="true">
            <path pathLength="100" d="M 50,0 L 100,28.87 L 100,86.60 L 50,115.47" />
            <path pathLength="100" d="M 50,0 L 0,28.87 L 0,86.60 L 50,115.47" />
          </svg>
        )}
    </div>
  );
};
