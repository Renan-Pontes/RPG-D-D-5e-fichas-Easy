// Névoa do desconhecido (jogador). Puramente decorativa: não conta nada, não
// dá nomes — só lembra que o mundo é maior do que o que foi revelado.
import { useId } from 'react';
import { KIND_META } from '../../world/world-model.js';
import { fogClearings, fogHint, fogLine, fogSilhouettes } from './living-model.js';
import './living.css';

/** Silhuetas esmaecidas ao fim do Atlas. */
export function AtlasFog({ campaignId, lang = 'pt', hint }) {
  const sil = fogSilhouettes(campaignId);
  const extra = fogHint(hint, lang);
  // O mestre deixou a mesa ter noção do desconhecido e não há nada oculto:
  // nada de silhuetas falsas, só a frase do cronista.
  if (hint === 'none') return <aside className="lv-fog is-clear"><p className="lv-fog-hint">{extra}</p></aside>;
  return (
    <aside className="lv-fog" aria-label={fogLine(campaignId, lang)}>
      <div className="lv-fog-sils" aria-hidden="true">
        {sil.map(s => (
          <div key={s.key} className={`lv-fog-sil lv-sil-${s.kind}`} style={{ '--tilt': `${s.tilt}deg`, '--wl-kind': KIND_META[s.kind]?.color }}>
            <span className="lv-fog-glyph">{KIND_META[s.kind]?.icon}</span>
            <span className="lv-fog-bar" /><span className="lv-fog-bar short" />
          </div>
        ))}
      </div>
      <p className="lv-fog-line">{fogLine(campaignId, lang)}</p>
      {extra && <p className="lv-fog-hint">{extra}</p>}
    </aside>
  );
}

/**
 * Névoa por cima do mapa: tudo esmaecido, com clareiras em volta dos
 * marcadores que o jogador conhece. Fica abaixo dos pins (pointer-events: none).
 */
export function MapFog({ pins, known }) {
  const id = useId().replace(/:/g, '');
  const holes = fogClearings(pins, known);
  return (
    <svg className="lv-mapfog" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-hole`}>
          <stop offset="0%" stopColor="#000" />
          <stop offset="55%" stopColor="#000" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect x="0" y="0" width="100" height="100" fill="#fff" />
          {holes.map(h => <ellipse key={h.id} cx={h.x} cy={h.y} rx={h.r} ry={h.r} fill={`url(#${id}-hole)`} />)}
        </mask>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0.86  0 0 0 0 0.82  0 0 0 0 0.74  0 0 0 0.55 0" />
        </filter>
      </defs>
      <g mask={`url(#${id}-mask)`}>
        <rect className="lv-mapfog-base" x="0" y="0" width="100" height="100" />
        <rect className="lv-mapfog-grain" x="0" y="0" width="100" height="100" filter={`url(#${id}-grain)`} />
      </g>
    </svg>
  );
}
