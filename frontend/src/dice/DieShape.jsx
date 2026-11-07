import React, { useState, useEffect } from 'react';
import { DICE_FACES } from './dice-tessellation.js';

const SPARKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export default function DieShape({
  die,
  value,
  targetValue = null,
  rolling = false,
  size = 56,
  seed = 0,
  dimmed = false,
  tone = null,
  isHero = false,
  isCrit = false,
  lang = 'pt',
  petalAngle = null,
}) {
  const [displayVal, setDisplayVal] = useState(value);

  // Smooth roll-up from natural roll to final targetValue inside the hero die face
  useEffect(() => {
    if (rolling || targetValue == null || targetValue === value || !isHero) {
      setDisplayVal(value);
      return;
    }
    const fromVal = Number(value) || 0;
    const toVal = Number(targetValue) || fromVal;
    let startTimestamp = null;
    const duration = 1200;
    let animId;

    const step = (now) => {
      if (!startTimestamp) startTimestamp = now;
      const elapsed = now - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(fromVal + (toVal - fromVal) * ease);
      setDisplayVal(current);
      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayVal(toVal);
      }
    };

    const timer = setTimeout(() => {
      animId = requestAnimationFrame(step);
    }, 240);

    return () => {
      clearTimeout(timer);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [value, targetValue, rolling, isHero]);

  const rand = (n) => {
    const x = Math.sin(seed * 9999 + n) * 10000;
    return x - Math.floor(x);
  };

  const style = rolling ? {
    width: size,
    height: size,
    '--sx': `${(rand(1) - 0.5) * 120}vw`,
    '--sy': `${(rand(2) - 0.5) * 80}vh`,
    '--mx1': `${(rand(3) - 0.5) * 60}vw`,
    '--my1': `${-30 - rand(4) * 30}vh`,
    '--mx2': `${(rand(5) - 0.5) * 40}vw`,
    '--my2': `${-15 - rand(6) * 25}vh`,
    '--mx3': `${(rand(7) - 0.5) * 20}vw`,
    '--my3': `${-5 - rand(8) * 15}vh`,
    '--rot': `${1440 + Math.floor(rand(9) * 720)}deg`,
    '--dur': `${1.2 + rand(10) * 0.4}s`,
  } : { width: size, height: size, opacity: dimmed ? (petalAngle != null ? 0.38 : 0.32) : 1 };

  const isPt = lang === 'pt' || !lang;
  const isPetal = petalAngle != null;

  return (
    <div
      className={`die-shape die-d${die} ${rolling ? 'rolling' : ''}${tone ? ` tone-${tone}` : ''}${dimmed ? ' is-unpicked' : ''}${isHero ? ' is-hero' : ''}${isPetal ? ' is-petal-die' : ''}${isCrit && !rolling ? ' is-crit-artdeco' : ''}`}
      style={style}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="die-main-svg"
        style={petalAngle != null ? { transform: `rotate(${petalAngle}deg)`, transformOrigin: 'center' } : undefined}
      >
        <path d={DICE_FACES[die] || DICE_FACES[20]} className="die-poly" />
      </svg>
      <span className="die-number" style={{ fontSize: size * 0.38 }}>
        {rolling ? '' : (displayVal ?? '?')}
      </span>

      {/* Art Deco Critical Hit Overlay Layer */}
      {isCrit && !rolling && isHero && (
        <div className="dice-artdeco-crit-frame">
          <svg viewBox="0 0 140 140" className="dice-artdeco-svg">
            <defs>
              <linearGradient id="artdeco-gilt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff8cf" />
                <stop offset="26%" stopColor="#efc762" />
                <stop offset="52%" stopColor="#a37324" />
                <stop offset="78%" stopColor="#fedc8c" />
                <stop offset="100%" stopColor="#81510e" />
              </linearGradient>
            </defs>
            {/* Outer Art Deco Hexagonal Silhouette with Chamfered Corners */}
            <polygon
              points="70,4 128,37 128,103 70,136 12,103 12,37"
              fill="none"
              stroke="url(#artdeco-gilt-grad)"
              strokeWidth="2.5"
            />
            {/* Stepped Inner Art Deco Rim */}
            <polygon
              points="70,10 122,40 122,100 70,130 18,100 18,40"
              fill="none"
              stroke="url(#artdeco-gilt-grad)"
              strokeWidth="1.2"
              strokeDasharray="4 2"
              opacity="0.9"
            />
            {/* Stepped Corner Chevron Accents */}
            <polyline points="64,2 70,7 76,2" fill="none" stroke="url(#artdeco-gilt-grad)" strokeWidth="2.2" />
            <polyline points="64,138 70,133 76,138" fill="none" stroke="url(#artdeco-gilt-grad)" strokeWidth="2.2" />
            <polyline points="7,40 12,37 17,40" fill="none" stroke="url(#artdeco-gilt-grad)" strokeWidth="2.2" />
            <polyline points="123,40 128,37 133,40" fill="none" stroke="url(#artdeco-gilt-grad)" strokeWidth="2.2" />
            {/* Art Deco Cartouche Plaque for "CRÍTICO" */}
            <rect
              x="26"
              y="102"
              width="88"
              height="20"
              rx="3"
              fill="#180f08"
              stroke="url(#artdeco-gilt-grad)"
              strokeWidth="1.4"
            />
            <text
              x="70"
              y="113"
              textAnchor="middle"
              dominantBaseline="central"
              className="artdeco-crit-text"
            >
              {isPt ? 'CRÍTICO' : 'CRITICAL'}
            </text>
          </svg>
          <span className="dice-sparks" aria-hidden="true">
            {SPARKS.map((i) => (
              <i key={i} style={{ '--i': i }} />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
