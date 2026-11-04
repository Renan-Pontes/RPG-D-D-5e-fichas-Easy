// Radar em SVG à mão (Raio-X do grupo), no modelo do SkyAtlas/FhMedal: sem biblioteca.
// No máximo 3 polígonos (mais que isso ninguém lê); grade e raios em linha fina e lisa;
// o anel "destaque" marca a referência (o 3 "normal do nível", o 0 das salvaguardas…).
// Os números ficam escritos na lista ou na tabela ao lado: o <title> é só extra. Onde fica
// cada rótulo (e que não se sobrepõem) é conta de radar-layout.js, testada.
//
//   <Radar size={340} axes={[{ key, label, title }]} min={1} max={5} rings={[1,2,3,4,5]} mark={3}
//          series={[{ key, values, color, fill: 0.25 }]} label="…" />
import { autoPad, radarLabelLayout } from './radar-layout.js';

const MAX_SERIES = 3;

export default function Radar({
  axes, series = [], min = 0, max = 5, rings = [], mark = null, size = 340, labels = true,
  labelSize = 13, pad: padIn, label, className = '',
}) {
  const n = axes.length;
  // espaço dos rótulos: o do rótulo mais largo (radar-layout.autoPad), ou o `pad` de quem chama
  const pad = padIn ?? autoPad(axes, labelSize, labels);
  const c = size / 2;
  const R = c - pad;
  const ang = (i) => (-Math.PI / 2) + (i * 2 * Math.PI) / n;
  const rad = (v) => Math.max(0, Math.min(1, (v - min) / ((max - min) || 1))) * R;
  const pt = (i, v) => [c + rad(v) * Math.cos(ang(i)), c + rad(v) * Math.sin(ang(i))];
  const ring = (v) => axes.map((_, i) => pt(i, v).map(x => x.toFixed(1)).join(',')).join(' ');
  const shown = series.slice(0, MAX_SERIES);
  return (
    <svg className={`ins-radar ${className}`.trim()} width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      role="img" aria-label={label}>
      {label && <title>{label}</title>}
      <g className="ins-radar-grid">
        {rings.map(v => <polygon key={v} points={ring(v)} className={v === mark ? 'is-mark' : undefined} />)}
        {axes.map((a, i) => { const [x, y] = pt(i, max); return <line key={a.key} x1={c} y1={c} x2={x} y2={y} />; })}
      </g>
      {shown.map(s => (
        <g key={s.key} className="ins-radar-series">
          <polygon points={s.values.map((v, i) => pt(i, v).map(x => x.toFixed(1)).join(',')).join(' ')}
            fill={s.color} fillOpacity={s.fill ?? 0.1} stroke={s.color} strokeWidth={s.width ?? 2} strokeLinejoin="round" />
          {s.dots !== false && s.values.map((v, i) => {
            const [x, y] = pt(i, v);
            return <circle key={axes[i].key} cx={x} cy={y} r={size >= 240 ? 4 : 3} fill={s.color} className="ins-radar-dot" />;
          })}
        </g>
      ))}
      {labels && radarLabelLayout({ axes, size, pad, labelSize }).map((l, i) => (
        <text key={axes[i].key} x={l.x} y={l.y} textAnchor={l.anchor} fontSize={labelSize} className="ins-radar-label">
          {axes[i].title && <title>{axes[i].title}</title>}
          {l.lines.map((line, k) => <tspan key={k} x={l.x} dy={k ? labelSize * 1.1 : 0}>{line}</tspan>)}
        </text>
      ))}
    </svg>
  );
}
