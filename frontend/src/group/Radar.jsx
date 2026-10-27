// Radar em SVG à mão (Raio-X do grupo), no modelo do SkyAtlas/FhMedal: sem biblioteca.
// No máximo 3 polígonos (mais que isso ninguém lê); grade e raios em linha fina e lisa;
// o anel "destaque" marca a referência (o 3 "normal do nível", o 0 das salvaguardas…).
// Os números ficam escritos na lista ou na tabela ao lado: o <title> é só extra.
//
//   <Radar size={340} axes={[{ key, label, title }]} min={1} max={5} rings={[1,2,3,4,5]} mark={3}
//          series={[{ key, values, color, fill: 0.25 }]} label="…" />
const MAX_SERIES = 3;

/** Rótulo longo ("Corpo a corpo") em até 2 linhas, quebrando no espaço do meio. */
function labelLines(text) {
  const s = String(text || '');
  if (s.length <= 9 || !s.includes(' ')) return [s];
  const mid = s.length / 2;
  let best = -1;
  for (let i = 0; i < s.length; i++) if (s[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return [s.slice(0, best), s.slice(best + 1)];
}

export default function Radar({
  axes, series = [], min = 0, max = 5, rings = [], mark = null, size = 340, labels = true,
  labelSize = 13, pad: padIn, label, className = '',
}) {
  const n = axes.length;
  // espaço dos rótulos: rótulos curtos (FOR, Abj) pedem pouco; os longos, `pad` de quem chama
  const pad = padIn ?? (labels ? Math.round(labelSize * 2.3) : 8);
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
      {labels && axes.map((a, i) => {
        const a0 = ang(i);
        const x = c + (R + 8) * Math.cos(a0);
        const y = c + (R + 8) * Math.sin(a0);
        const cos = Math.cos(a0);
        const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
        const lines = labelLines(a.label);
        const lh = labelSize * 1.1;
        const sin = Math.sin(a0);
        // em cima, o texto sobe; embaixo, desce; dos lados, fica centrado na ponta do raio
        const y0 = sin > 0.5 ? y + labelSize * 0.9 : sin < -0.5 ? y - 2 - (lines.length - 1) * lh : y + labelSize * 0.35 - ((lines.length - 1) * lh) / 2;
        return (
          <text key={a.key} x={x} y={y0} textAnchor={anchor} fontSize={labelSize} className="ins-radar-label">
            {a.title && <title>{a.title}</title>}
            {lines.map((l, k) => <tspan key={k} x={x} dy={k ? lh : 0}>{l}</tspan>)}
          </text>
        );
      })}
    </svg>
  );
}
