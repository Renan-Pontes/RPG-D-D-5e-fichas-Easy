// Carta celeste do mundo (mestre): cada cartão é uma estrela da cor do seu
// tipo — acesa quando a mesa já conhece, só um contorno tênue quando ainda é
// segredo — e as ligações entre cartões viram traços de constelação. O céu é
// determinístico (mesmo mundo, mesmo céu) e cresce sozinho a cada cartão novo.
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { KIND_META, KINDS, kindLabel, visLabel } from '../world-model.js';
import { SKY_H, SKY_W, hashStr, skyLayout } from './living-logic.js';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

function useSmallScreen() {
  const q = '(max-width: 480px)';
  const get = () => { try { return window.matchMedia(q).matches; } catch { return false; } };
  const [small, setSmall] = useState(get);
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia(q); } catch { return undefined; }
    const on = () => setSmall(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return small;
}

function SkyAtlas({ entries, lang = 'pt', onOpen, selectedId }) {
  const sky = useMemo(() => skyLayout(entries), [entries]);
  // No celular o céu fica ~1/3 do tamanho: estrelas e nomes crescem no desenho.
  const small = useSmallScreen();
  const fs = small ? 2.05 : 1;
  const rs = small ? 1.7 : 1;
  const [hover, setHover] = useState(null);
  // Estrelas que nasceram desde a última vez que o céu foi desenhado.
  const seen = useRef(null);
  const born = useMemo(() => {
    const prev = seen.current;
    if (!prev) return new Set();
    return new Set(sky.stars.filter(s => !prev.has(s.id)).map(s => s.id));
  }, [sky]);
  useEffect(() => { seen.current = new Set(sky.stars.map(s => s.id)); }, [sky]);

  // Nomes sempre visíveis: as estrelas mais ligadas/conhecidas (no máx. 8),
  // sem rótulos encavalados (um rótulo que bateria em outro fica para o toque).
  const named = useMemo(() => {
    const maxLabels = small ? 4 : 8;
    const score = (s) => s.degree * 2 + (s.vis === 'revealed' ? 1.5 : s.vis === 'partial' ? 0.7 : 0);
    const cands = sky.stars.filter(s => s.degree >= 1 || s.vis === 'revealed').sort((a, b) => score(b) - score(a) || a.id - b.id);
    const boxes = [{ x1: SKY_W - 90, x2: SKY_W, y1: 0, y2: 90 }]; // rosa dos ventos
    const out = new Map(); // id → deslocamento x do rótulo (para não sair da moldura)
    for (const s of cands) {
      if (out.size >= maxLabels) break;
      const w = (Math.min(26, s.name.length) * 7.6 + 8) * fs;
      const cx = Math.max(w / 2 + 16, Math.min(SKY_W - w / 2 - 16, s.x));
      const box = { x1: cx - w / 2, x2: cx + w / 2, y1: s.y - s.r * rs - 18 * fs, y2: s.y - s.r * rs - 4 };
      const hit = boxes.some(b => box.x1 < b.x2 && box.x2 > b.x1 && box.y1 < b.y2 && box.y2 > b.y1)
        || sky.stars.some(o => o.id !== s.id && o.x > box.x1 && o.x < box.x2 && o.y > box.y1 && o.y < box.y2);
      if (hit) continue;
      boxes.push(box);
      out.set(s.id, cx - s.x);
    }
    return out;
  }, [sky, small]); // eslint-disable-line react-hooks/exhaustive-deps
  const kindsPresent = useMemo(() => KINDS.filter(k => sky.stars.some(s => s.kind === k)), [sky]);
  const focus = hover != null ? sky.stars.find(s => s.id === hover) : null;
  const near = useMemo(() => {
    if (hover == null) return null;
    const set = new Set([hover]);
    for (const l of sky.lines) { if (l.a === hover) set.add(l.b); if (l.b === hover) set.add(l.a); }
    return set;
  }, [hover, sky]);

  const label = (s) => `${s.name} — ${kindLabel(s.kind, lang)} · ${visLabel(s.vis, lang)}`;
  const open = (id) => onOpen?.(id);

  return (
    <figure className={`lv-sky${small ? ' is-small' : ''}`}>
      <svg viewBox={`0 0 ${SKY_W} ${SKY_H}`} preserveAspectRatio="xMidYMid meet" className="lv-sky-svg"
        role="group" aria-label={t(lang, 'Carta celeste do mundo: cada estrela é um cartão', 'Star chart of the world: each star is a card')}>
        <defs>
          <radialGradient id="lv-glow">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Poeira de estrelas de fundo (fixa) e meridianos de atlas */}
        <g className="lv-sky-dust" aria-hidden="true">
          {DUST.map((d, i) => <circle key={i} cx={d[0]} cy={d[1]} r={d[2]} />)}
        </g>
        <g className="lv-sky-grid" aria-hidden="true">
          <ellipse cx={SKY_W / 2} cy={SKY_H / 2} rx={SKY_W * 0.47} ry={SKY_H * 0.44} />
          <ellipse cx={SKY_W / 2} cy={SKY_H / 2} rx={SKY_W * 0.31} ry={SKY_H * 0.29} />
          <ellipse cx={SKY_W / 2} cy={SKY_H / 2} rx={SKY_W * 0.15} ry={SKY_H * 0.14} />
          <line x1={SKY_W / 2} y1="12" x2={SKY_W / 2} y2={SKY_H - 12} />
          <line x1="20" y1={SKY_H / 2} x2={SKY_W - 20} y2={SKY_H / 2} />
        </g>
        <g className="lv-sky-rose" aria-hidden="true" transform={`translate(${SKY_W - 48} 46)`}>
          <path d="M0 -26 L5 -5 L26 0 L5 5 L0 26 L-5 5 L-26 0 L-5 -5 Z" />
          <circle r="3" />
          <text y="-31" textAnchor="middle">N</text>
        </g>

        <g className="lv-sky-lines" aria-hidden="true">
          {sky.lines.map(l => (
            <line key={`${l.a}-${l.b}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              className={`${l.lit ? 'is-lit' : ''}${near && near.has(l.a) && near.has(l.b) ? ' is-near' : ''}`} />
          ))}
        </g>

        <g className="lv-sky-stars">
          {sky.stars.map(s => {
            const r = s.r * rs;
            const color = (KIND_META[s.kind] || KIND_META.lore).color;
            const delay = `${(hashStr(`tw${s.id}`) % 5000) / 1000}s`;
            const cls = `lv-star lv-vis-${s.vis}${born.has(s.id) ? ' is-born' : ''}${selectedId === s.id ? ' is-sel' : ''}${near && !near.has(s.id) ? ' is-dim' : ''}`;
            return (
              <g key={s.id} className={cls} transform={`translate(${s.x} ${s.y})`} style={{ '--lv-k': color, '--lv-d': delay }}
                role="button" tabIndex={0} aria-label={label(s)}
                onClick={() => open(s.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(s.id); } }}
                onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(h => (h === s.id ? null : h))}
                onFocus={() => setHover(s.id)} onBlur={() => setHover(h => (h === s.id ? null : h))}>
                <title>{label(s)}</title>
                <circle className="lv-star-hit" r={Math.max(13 * rs, r + 8)} />
                {s.vis !== 'hidden' && <circle className="lv-star-glow" r={r * (s.vis === 'revealed' ? 4.2 : 2.8)} fill="url(#lv-glow)" />}
                {s.vis === 'hidden'
                  ? <circle className="lv-star-ring" r={r} />
                  : s.vis === 'partial'
                    ? <><circle className="lv-star-ring" r={r + 1.2} /><circle className="lv-star-core" r={r * 0.55} /></>
                    : <><circle className="lv-star-core" r={r} /><path className="lv-star-spark" d={`M0 ${-r * 2.4} L0 ${r * 2.4} M${-r * 2.4} 0 L${r * 2.4} 0`} /></>}
                {(named.has(s.id) || hover === s.id || selectedId === s.id) && (
                  <text className="lv-star-name" x={labelDx(s, named, fs)} y={-r - 7 * fs} textAnchor="middle">{s.name.length > 26 ? `${s.name.slice(0, 25)}…` : s.name}</text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <figcaption className="lv-sky-legend">
        <span className="lv-legend-item"><span className="lv-legend-star is-lit" aria-hidden="true" /> {t(lang, 'acesas: o que a mesa já viu', 'lit: what the table has seen')}</span>
        <span className="lv-legend-item"><span className="lv-legend-star" aria-hidden="true" /> {t(lang, 'contornos: o que só você conhece', 'outlines: known only to you')}</span>
        <span className="lv-legend-kinds">
          {kindsPresent.map(k => (
            <span key={k} className="lv-legend-kind" style={{ '--lv-k': KIND_META[k].color }}>
              <span className="lv-legend-dot" aria-hidden="true" />{kindLabel(k, lang, true)}
            </span>
          ))}
        </span>
        {focus && <span className="wl-sr" aria-live="polite">{label(focus)}</span>}
      </figcaption>
    </figure>
  );
}

/** Deslocamento x do rótulo: o calculado sem colisão, ou o que mantém o nome dentro da moldura. */
function labelDx(s, named, fs) {
  if (named.has(s.id)) return named.get(s.id);
  const w = (Math.min(26, s.name.length) * 7.6 + 8) * fs;
  return Math.max(w / 2 + 16, Math.min(SKY_W - w / 2 - 16, s.x)) - s.x;
}

// Poeira fixa (determinística): pontinhos que dão profundidade ao céu.
const DUST = Array.from({ length: 90 }, (_, i) => {
  const h = hashStr(`dust${i}`);
  return [(h % 1000), ((h >>> 10) % 420), 0.4 + ((h >>> 20) % 10) / 14];
});

export default memo(SkyAtlas);
