/* Floating dice roller + animated roll overlay + log */
import { useState, useEffect } from 'react';
import Icon from './Icons.jsx';
import { t } from '../data/i18n.js';

const DICE_FACES = {
  4: 'M50 5 L95 90 L5 90 Z',
  6: 'M15 15 H85 V85 H15 Z',
  8: 'M50 5 L90 50 L50 95 L10 50 Z',
  10: 'M50 5 L88 35 L75 92 L25 92 L12 35 Z',
  12: 'M50 5 L88 28 L88 72 L50 95 L12 72 L12 28 Z',
  20: 'M50 5 L90 28 L90 72 L50 95 L10 72 L10 28 Z',
  100: 'M50 5 L90 28 L90 72 L50 95 L10 72 L10 28 Z',
};

const DieShape = ({ die, value, rolling, size = 56, seed = 0 }) => {
  // Per-die randomized trajectory using seed
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
  } : { width: size, height: size };
  return (
    <div className={`die-shape die-d${die} ${rolling ? 'rolling' : ''}`} style={style}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <path d={DICE_FACES[die] || DICE_FACES[20]} className="die-poly"/>
      </svg>
      <span className="die-number" style={{ fontSize: size * 0.36 }}>{value ?? '?'}</span>
    </div>
  );
};

const DiceRoller = ({ lang }) => {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [mod, setMod] = useState(0);
  const [advMode, setAdvMode] = useState('normal');
  const [log, setLog] = useState([]);
  const [overlay, setOverlay] = useState(null);

  const performRoll = ({ die, count: cnt = count, mod: m = mod, label = '', advMode: am } = {}) => {
    const useAdv = am ?? advMode;
    const rolls = [];
    const n = cnt;
    let displayRolls;
    let total;
    if (die === 20 && useAdv !== 'normal' && n === 1) {
      const a = 1 + Math.floor(Math.random() * 20);
      const b = 1 + Math.floor(Math.random() * 20);
      rolls.push(a, b);
      const chosen = useAdv === 'adv' ? Math.max(a, b) : Math.min(a, b);
      total = chosen + m;
      displayRolls = rolls;
    } else {
      for (let i = 0; i < n; i++) rolls.push(1 + Math.floor(Math.random() * die));
      total = rolls.reduce((a, b) => a + b, 0) + m;
      displayRolls = rolls;
    }
    const entry = {
      id: Date.now() + Math.random(),
      label: label || `${cnt}d${die}${m ? ` ${m >= 0 ? '+' : ''}${m}` : ''}`,
      die, count: cnt, mod: m, rolls: displayRolls, total,
      isCrit: die === 20 && rolls.includes(20),
      isFumble: die === 20 && rolls.includes(1),
      advMode: useAdv,
      ts: new Date().toLocaleTimeString(lang === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    // Show animated overlay
    setOverlay({ ...entry, rolling: true });
    // Buzz feedback
    if (navigator.vibrate) navigator.vibrate(40);
    setTimeout(() => {
      setOverlay(prev => prev ? { ...prev, rolling: false } : null);
      setLog(prev => [entry, ...prev].slice(0, 50));
      if (entry.isCrit && navigator.vibrate) navigator.vibrate([60, 40, 100]);
    }, 1650);

    return entry;
  };

  useEffect(() => {
    window.__diceRoll = performRoll;
    return () => { window.__diceRoll = null; };
  }, [advMode, count, mod, lang]);

  const dice = [4, 6, 8, 10, 12, 20, 100];

  return (
    <>
      <button className="dice-fab no-print" onClick={() => setOpen(!open)} title={t('rollDice', lang)}>
        <Icon name="dice" size={24}/>
      </button>

      {open && (
        <div className="dice-panel no-print" onClick={(e) => e.stopPropagation()}>
          <div className="dice-panel-header">
            <strong style={{ fontFamily: 'var(--display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
              {t('rollDice', lang)}
            </strong>
            <button className="btn btn-icon btn-ghost" onClick={() => setOpen(false)}>
              <Icon name="x" size={16}/>
            </button>
          </div>

          {/* Count + Modifier */}
          <div className="dice-controls">
            <div className="dice-control-group">
              <label className="dice-control-label">{lang === 'pt' ? 'Qtd.' : 'Count'}</label>
              <div className="dice-stepper">
                <button onClick={() => setCount(c => Math.max(1, c - 1))}>−</button>
                <span className="dice-stepper-val">{count}</span>
                <button onClick={() => setCount(c => Math.min(20, c + 1))}>+</button>
              </div>
            </div>
            <div className="dice-control-group">
              <label className="dice-control-label">{lang === 'pt' ? 'Bônus' : 'Modifier'}</label>
              <div className="dice-stepper">
                <button onClick={() => setMod(m => m - 1)}>−</button>
                <span className="dice-stepper-val">{mod >= 0 ? `+${mod}` : mod}</span>
                <button onClick={() => setMod(m => m + 1)}>+</button>
              </div>
            </div>
          </div>

          {/* Dice type picker — visual */}
          <div className="dice-picker">
            {dice.map(d => (
              <button
                key={d}
                className="dice-picker-btn"
                onClick={() => performRoll({ die: d })}
                title={`d${d}`}
              >
                <DieShape die={d} value={`d${d}`} size={44}/>
              </button>
            ))}
          </div>

          {/* Adv toggle */}
          <div className="adv-toggle">
            <button className={advMode === 'dis' ? 'active dis' : ''} onClick={() => setAdvMode(advMode === 'dis' ? 'normal' : 'dis')}>
              {t('disadvantage', lang)}
            </button>
            <button className={advMode === 'normal' ? 'active' : ''} onClick={() => setAdvMode('normal')}>
              {t('normal', lang)}
            </button>
            <button className={advMode === 'adv' ? 'active adv' : ''} onClick={() => setAdvMode(advMode === 'adv' ? 'normal' : 'adv')}>
              {t('advantage', lang)}
            </button>
          </div>

          <div className="dice-log">
            {log.length === 0 && (
              <div className="text-center muted text-sm" style={{ padding: 20 }}>
                {lang === 'pt' ? 'Nenhuma rolagem ainda' : 'No rolls yet'}
              </div>
            )}
            {log.map(e => (
              <div key={e.id} className={`dice-entry ${e.isCrit ? 'crit' : ''} ${e.isFumble ? 'fumble' : ''}`}>
                <div className="dice-entry-label">
                  {e.label}
                  {e.advMode === 'adv' && <span className="badge badge-adv">VTG</span>}
                  {e.advMode === 'dis' && <span className="badge badge-dis">DSV</span>}
                </div>
                <div className="dice-entry-detail">
                  <span className="dice-rolls">
                    [{e.rolls.map((r, i) => {
                      const isUsed = e.advMode === 'adv' ? r === Math.max(...e.rolls) : e.advMode === 'dis' ? r === Math.min(...e.rolls) : true;
                      return (
                        <span key={i} style={{
                          fontWeight: isUsed ? 700 : 400,
                          opacity: isUsed ? 1 : 0.4,
                          textDecoration: !isUsed ? 'line-through' : 'none'
                        }}>{r}{i < e.rolls.length - 1 ? ', ' : ''}</span>
                      );
                    })}]
                  </span>
                  {e.mod !== 0 && <span style={{ color: 'var(--ink-tertiary)' }}>{e.mod >= 0 ? '+' : ''}{e.mod}</span>}
                  <span className="dice-total">{e.total}</span>
                </div>
                <div className="dice-entry-ts">{e.ts}</div>
              </div>
            ))}
          </div>

          {log.length > 0 && (
            <button className="btn btn-sm btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setLog([])}>
              {t('clearLog', lang)}
            </button>
          )}
        </div>
      )}

      {/* === ROLL OVERLAY === */}
      {overlay && (
        <div className="dice-overlay no-print" onClick={() => setOverlay(null)}>
          <div className={`dice-overlay-inner ${overlay.isCrit ? 'is-crit' : ''} ${overlay.isFumble ? 'is-fumble' : ''}`}>
            <div className="dice-overlay-label">{overlay.label}</div>
            <div className="dice-overlay-dice">
              {overlay.rolls.map((r, i) => (
                <DieShape
                  key={i} die={overlay.die} value={overlay.rolling ? '' : r} rolling={overlay.rolling} size={88} seed={i + 1}/>
              ))}
            </div>
            {!overlay.rolling && (
              <>
                {overlay.mod !== 0 && (
                  <div className="dice-overlay-formula">
                    [{overlay.rolls.join(', ')}] {overlay.mod >= 0 ? '+' : ''}{overlay.mod}
                  </div>
                )}
                <div className="dice-overlay-total">{overlay.total}</div>
                {overlay.isCrit && <div className="dice-overlay-flair crit-flair">★ {lang === 'pt' ? 'CRÍTICO!' : 'CRITICAL!'} ★</div>}
                {overlay.isFumble && <div className="dice-overlay-flair fumble-flair">{lang === 'pt' ? 'FALHA CRÍTICA' : 'CRITICAL MISS'}</div>}
                <button className="btn btn-sm btn-ghost dice-overlay-dismiss" onClick={() => setOverlay(null)}>
                  {lang === 'pt' ? 'Toque para fechar' : 'Tap to dismiss'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DiceRoller;
