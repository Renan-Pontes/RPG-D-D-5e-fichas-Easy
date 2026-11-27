import { useEffect, useId, useRef, useState } from 'react';
import { BAR_PREFS } from './table-bar-model.js';
import { L } from './stage-now.js';
import './stage.css';

export const LIVE_IDLE_MS = 3 * 60_000;

export function LiveTv({ token, lang = 'pt', className = '' }) {
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);
  const box = useRef(null);
  useEffect(() => {
    if (paused !== 'hidden') return undefined;
    const onVis = () => { if (!document.hidden) setPaused(false); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [paused]);
  useEffect(() => {
    if (paused) return undefined;
    if (typeof document !== 'undefined' && document.hidden) { setPaused('hidden'); return undefined; }
    const arm = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setPaused('idle'), LIVE_IDLE_MS); };
    arm();
    const onVis = () => { if (document.hidden) setPaused('hidden'); };
    window.addEventListener('pointerdown', arm, { passive: true });
    window.addEventListener('keydown', arm);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [paused]);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const fit = () => el.style.setProperty('--stage-live-k', String(el.clientWidth / 1280));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [paused]);
  if (!token) return null;
  if (paused) {
    return (
      <button type="button" className={`stage-live is-paused ${className}`.trim()} onClick={() => setPaused(false)}>
        <span>⏸ {L(lang, 'Pausado · toque para ver ao vivo', 'Paused · tap to watch live')}</span>
      </button>
    );
  }
  return (
    <div className={`stage-live ${className}`.trim()} ref={box}>
      <iframe className="stage-live-frame" src={`/tv/${token}?preview=1`} title={L(lang, 'Tela ao vivo', 'Live screen')}
        tabIndex={-1} aria-hidden="true" />
    </div>
  );
}

export function BarPrefs({ prefs, onPrefs, session, lang = 'pt', desk = false }) {
  const labels = { always: L(lang, 'Sempre', 'Always'), live: L(lang, 'Só ao vivo', 'Only when live'), never: L(lang, 'Nunca', 'Never') };
  const hidden = desk ? prefs.winSession != null && String(prefs.winSession) === String(session ?? '')
    : prefs.hideSession != null && String(prefs.hideSession) === String(session ?? '');
  const key = desk ? 'winSession' : 'hideSession';
  const hid = useId();
  return (
    <div className="live-prefs">
      <p className="mesa-eyebrow" id={hid}>{desk ? L(lang, 'Janela da Tela', 'Screen window') : L(lang, 'Barra da mesa', 'Table bar')}</p>
      <div className="mesa-seg live-prefs-seg" role="radiogroup" aria-labelledby={hid}>
        {BAR_PREFS.map(p => (
          <button key={p} type="button" role="radio" aria-checked={prefs.pref === p}
            className={`mesa-seg-btn ${prefs.pref === p ? 'active' : ''}`} onClick={() => onPrefs({ ...prefs, pref: p })}>
            {labels[p]}
          </button>
        ))}
      </div>
      <p className="mesa-hint">{L(lang,
        '“Só ao vivo”: aparece com a sessão ao vivo, com combate ou com uma TV conectada. Em combate, dentro de Jogar, aparece sempre.',
        '“Only when live”: shows with a live session, a combat or a connected TV. In combat, inside Play, it always shows.')}</p>
      <button type="button" className="mesa-btn live-hide" aria-pressed={hidden}
        onClick={() => onPrefs({ ...prefs, [key]: hidden ? null : String(session ?? '') })}>
        {hidden ? L(lang, 'Mostrar de novo', 'Show it again')
          : desk ? L(lang, 'Esconder a janela até a próxima sessão', 'Hide the window until next session')
            : L(lang, 'Esconder a barra até a próxima sessão', 'Hide the bar until next session')}
      </button>
    </div>
  );
}
