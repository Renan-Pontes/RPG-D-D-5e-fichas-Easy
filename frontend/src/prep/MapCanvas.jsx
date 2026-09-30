import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  NODE_W, NODE_H, NODE_KIND, EDGE_KIND, borderPoint, fitView, nodeAt, nodeMap, hasTreasure,
} from './prep-graph.js';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
const clampK = (k) => Math.max(0.2, Math.min(2.5, k));
const short = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * Mapa de nós em SVG puro (sem lib): pan arrastando o fundo, zoom na roda /
 * pinça / botões, arrastar nós, puxar conexão pela alça (●) de um nó a outro,
 * duplo clique no fundo cria sala. Em modo "play" só seleciona (não edita).
 *
 * props: data, play, mode ('prep'|'play'), selected {type,id}, onSelect(sel|null),
 *        onMoveNode(id, x, y), onConnect(from, to), onCreateNode(x, y),
 *        available (Set nodeId), highlighted (Set edgeId), lang
 */
export default function MapCanvas({
  data, play, mode, selected, onSelect, onMoveNode, onConnect, onCreateNode,
  available, highlighted, lang,
}) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const [view, setView] = useState(null);
  const [drag, setDrag] = useState(null);   // { type: 'pan'|'node'|'link', ... }
  const [ghost, setGhost] = useState(null); // posição temporária do nó arrastado / ponta da conexão
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const editable = mode === 'prep';

  const nodes = data?.nodes || [];
  const edges = data?.edges || [];
  const byId = useMemo(() => nodeMap(data), [data]);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => setSize({ w: el.clientWidth || 800, h: el.clientHeight || 520 });
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  // Enquadra na primeira vez que há tamanho.
  useEffect(() => {
    if (!view && size.w) setView(fitView(nodes, size.w, size.h));
  }, [size.w, size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  const v = view || { x: 0, y: 0, k: 1 };

  const toMap = (clientX, clientY) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: (clientX - r.left - v.x) / v.k, y: (clientY - r.top - v.y) / v.k };
  };

  const zoomAt = (factor, cx, cy) => {
    setView(cur => {
      const c = cur || v;
      const k = clampK(c.k * factor);
      const f = k / c.k;
      return { k, x: cx - (cx - c.x) * f, y: cy - (cy - c.y) * f };
    });
  };

  // Roda do mouse: listener não-passivo para impedir o scroll da página.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const fit = () => setView(fitView(nodes, size.w, size.h));

  // ---------------------------------------------------------------- ponteiros
  const startPointer = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), k: v.k };
      setDrag(null);
      return false;
    }
    return true;
  };

  const onBgDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (!startPointer(e)) return;
    svgRef.current.setPointerCapture?.(e.pointerId);
    setDrag({ type: 'pan', sx: e.clientX, sy: e.clientY, ox: v.x, oy: v.y, moved: false });
  };

  const onNodeDown = (e, node) => {
    e.stopPropagation();
    if (e.button !== undefined && e.button !== 0) return;
    if (!startPointer(e)) return;
    svgRef.current.setPointerCapture?.(e.pointerId);
    const p = toMap(e.clientX, e.clientY);
    setDrag({ type: 'node', id: node.id, dx: p.x - node.x, dy: p.y - node.y, sx: e.clientX, sy: e.clientY, moved: false });
  };

  const onHandleDown = (e, node) => {
    e.stopPropagation();
    if (!startPointer(e)) return;
    svgRef.current.setPointerCapture?.(e.pointerId);
    setDrag({ type: 'link', from: node.id });
    setGhost(toMap(e.clientX, e.clientY));
  };

  const onMove = (e) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const r = svgRef.current.getBoundingClientRect();
      const cx = (a.x + b.x) / 2 - r.left;
      const cy = (a.y + b.y) / 2 - r.top;
      const target = clampK(pinch.current.k * (dist / (pinch.current.dist || 1)));
      zoomAt(target / v.k, cx, cy);
      return;
    }
    if (!drag) return;
    if (drag.type === 'pan') {
      const dx = e.clientX - drag.sx;
      const dy = e.clientY - drag.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3 && !drag.moved) setDrag({ ...drag, moved: true });
      setView({ ...v, x: drag.ox + dx, y: drag.oy + dy });
    } else if (drag.type === 'node') {
      const moved = drag.moved || Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 4;
      if (!editable) { if (moved !== drag.moved) setDrag({ ...drag, moved }); return; }
      if (moved !== drag.moved) setDrag({ ...drag, moved });
      if (moved) {
        const p = toMap(e.clientX, e.clientY);
        setGhost({ id: drag.id, x: Math.round(p.x - drag.dx), y: Math.round(p.y - drag.dy) });
      }
    } else if (drag.type === 'link') {
      setGhost(toMap(e.clientX, e.clientY));
    }
  };

  const onUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (!drag) return;
    if (drag.type === 'pan' && !drag.moved) onSelect(null);
    if (drag.type === 'node') {
      if (drag.moved && editable && ghost?.id === drag.id) onMoveNode(drag.id, ghost.x, ghost.y);
      else if (!drag.moved) onSelect({ type: 'node', id: drag.id });
    }
    if (drag.type === 'link' && ghost) {
      const target = nodeAt(data, ghost.x, ghost.y);
      if (target && target.id !== drag.from) onConnect(drag.from, target.id);
    }
    setDrag(null);
    setGhost(null);
  };

  const onDouble = (e) => {
    if (!editable) return;
    const p = toMap(e.clientX, e.clientY);
    if (nodeAt(data, p.x, p.y)) return;
    onCreateNode(Math.round(p.x - NODE_W / 2), Math.round(p.y - NODE_H / 2));
  };

  const onNodeKey = (e, node) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect({ type: 'node', id: node.id }); return; }
    if (!editable) return;
    const step = e.shiftKey ? 40 : 10;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d) { e.preventDefault(); onMoveNode(node.id, node.x + d[0], node.y + d[1]); }
  };

  const posOf = (n) => (ghost?.id === n.id ? { ...n, x: ghost.x, y: ghost.y } : n);

  // ---------------------------------------------------------------- arestas
  const extCount = {};
  const edgeEls = edges.map(e => {
    const a = byId.get(e.from);
    if (!a) return null;
    const A = posOf(a);
    let p1; let p2; let labelAt;
    if (e.to) {
      const b = byId.get(e.to);
      if (!b) return null;
      const B = posOf(b);
      p1 = borderPoint(A, B.x + NODE_W / 2, B.y + NODE_H / 2);
      p2 = borderPoint(B, A.x + NODE_W / 2, A.y + NODE_H / 2);
    } else {
      const i = (extCount[e.from] = (extCount[e.from] || 0) + 1) - 1;
      // saída para outra aventura: seta curta para baixo, com a etiqueta do destino
      p1 = { x: A.x + NODE_W / 2 + i * 28, y: A.y + NODE_H };
      p2 = { x: p1.x + 24, y: p1.y + 46 + i * 26 };
    }
    labelAt = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const kind = EDGE_KIND[e.kind] || EDGE_KIND.path;
    const isSel = selected?.type === 'edge' && selected.id === e.id;
    const unlocked = (play?.unlocked || []).includes(e.id);
    const cls = [
      'prep-edge', `k-${e.kind}`, isSel && 'is-selected', highlighted?.has(e.id) && 'is-hot',
      unlocked && 'is-unlocked',
    ].filter(Boolean).join(' ');
    const text = `${kind.icon}${e.label ? ` ${short(e.label, 22)}` : ''}`;
    const extText = !e.to ? `↗ ${short(e.toAdventureName || t(lang, 'outra aventura', 'another adventure'), 24)}` : null;
    const title = `${t(lang, kind.pt, kind.en)}${e.label ? ` — ${e.label}` : ''}${e.condition ? ` (${e.condition})` : ''}${e.oneWay ? t(lang, ' · só ida', ' · one-way') : ''}`;
    const select = (ev) => { ev.stopPropagation(); onSelect({ type: 'edge', id: e.id }); };
    return (
      <g key={e.id} className={cls} onPointerDown={ev => ev.stopPropagation()} onClick={select}>
        <title>{title}</title>
        <line className="prep-edge-hit" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />
        <line className="prep-edge-line" x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          markerEnd="url(#prep-arrow)" markerStart={e.oneWay || !e.to ? undefined : 'url(#prep-arrow-start)'} />
        {e.to && (
          <g transform={`translate(${labelAt.x},${labelAt.y})`} className="prep-edge-label">
            <rect x={-(text.length * 3.6 + 8)} y={-10} width={text.length * 7.2 + 16} height={20} rx={10} />
            <text textAnchor="middle" dy="4">{text}</text>
          </g>
        )}
        {extText && (
          <g transform={`translate(${p2.x - 12},${p2.y + 4})`} className="prep-edge-ext">
            <rect x={0} y={0} width={extText.length * 7 + 16} height={24} rx={4} />
            <text x={8} y={16}>{extText}</text>
          </g>
        )}
      </g>
    );
  });

  // ---------------------------------------------------------------- nós
  const visited = new Set(play?.visited || []);
  const nodeEls = nodes.map(raw => {
    const n = posOf(raw);
    const kind = NODE_KIND[n.kind] || NODE_KIND.other;
    const isSel = selected?.type === 'node' && selected.id === n.id;
    const isCur = play?.current === n.id;
    const cls = [
      'prep-node', `k-${n.kind}`, isSel && 'is-selected', isCur && 'is-current',
      visited.has(n.id) && !isCur && 'is-visited', available?.has(n.id) && 'is-available',
      drag?.type === 'node' && drag.id === n.id && drag.moved && 'is-dragging',
    ].filter(Boolean).join(' ');
    const monsters = (n.encounter || []).reduce((s, e) => s + (e.count || 1), 0);
    const meta = [
      monsters && `⚔${monsters}`, (n.hazards || []).length && `⚠${n.hazards.length}`,
      (n.checks || []).length && `🎲${n.checks.length}`, hasTreasure(n) && '💰', n.image && '🖼',
      n.notes && '📝',
    ].filter(Boolean).join('  ');
    const status = isCur ? t(lang, 'atual', 'current') : visited.has(n.id) ? t(lang, 'visitado', 'visited') : available?.has(n.id) ? t(lang, 'disponível', 'available') : '';
    return (
      <g key={n.id} className={cls} transform={`translate(${n.x},${n.y})`}
        onPointerDown={e => onNodeDown(e, raw)} onKeyDown={e => onNodeKey(e, raw)}
        tabIndex={0} role="button" aria-pressed={isSel}
        aria-label={`${kind.icon} ${n.name || '?'} — ${t(lang, kind.pt, kind.en)}${status ? ` (${status})` : ''}`}>
        <rect className="prep-node-box" width={NODE_W} height={NODE_H} rx={6} />
        <rect className="prep-node-stripe" width={5} height={NODE_H} rx={2} />
        <text className="prep-node-icon" x={14} y={27}>{kind.icon}</text>
        <text className="prep-node-name" x={38} y={27}>{short(n.name || '?', 17)}</text>
        <text className="prep-node-meta" x={14} y={50}>{meta || t(lang, kind.pt, kind.en)}</text>
        {isCur && <text className="prep-node-badge" x={NODE_W - 8} y={-6} textAnchor="end">▶ {t(lang, 'AQUI', 'HERE')}</text>}
        {!isCur && visited.has(n.id) && <text className="prep-node-check" x={NODE_W - 12} y={50} textAnchor="end">✓ {t(lang, 'visitado', 'visited')}</text>}
        {editable && (
          <circle className="prep-node-handle" cx={NODE_W} cy={NODE_H / 2} r={8}
            onPointerDown={e => onHandleDown(e, raw)}>
            <title>{t(lang, 'Arraste até outro nó para conectar', 'Drag to another node to connect')}</title>
          </circle>
        )}
      </g>
    );
  });

  let linkGhost = null;
  if (drag?.type === 'link' && ghost) {
    const a = byId.get(drag.from);
    if (a) {
      linkGhost = <line className="prep-edge-ghost" x1={a.x + NODE_W} y1={a.y + NODE_H / 2} x2={ghost.x} y2={ghost.y} markerEnd="url(#prep-arrow)" />;
    }
  }

  return (
    <div className={`prep-canvas ${drag?.type === 'pan' ? 'is-panning' : ''}`} ref={wrapRef}>
      <svg ref={svgRef} width="100%" height="100%" role="application"
        aria-label={t(lang, 'Mapa da aventura. Arraste o fundo para mover, roda ou pinça para zoom.', 'Adventure map. Drag the background to pan, wheel or pinch to zoom.')}
        onPointerDown={onBgDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onDoubleClick={onDouble}>
        <defs>
          <marker id="prep-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="prep-arrow-head" />
          </marker>
          <marker id="prep-arrow-start" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="prep-arrow-head" />
          </marker>
          <pattern id="prep-dots" width="24" height="24" patternUnits="userSpaceOnUse"
            patternTransform={`translate(${v.x},${v.y}) scale(${v.k})`}>
            <circle cx="1" cy="1" r="1" className="prep-dot" />
          </pattern>
        </defs>
        <rect className="prep-bg" width="100%" height="100%" fill="url(#prep-dots)" />
        <g transform={`translate(${v.x},${v.y}) scale(${v.k})`}>
          {edgeEls}
          {linkGhost}
          {nodeEls}
        </g>
      </svg>
      {nodes.length === 0 && (
        <div className="prep-canvas-empty">
          {editable
            ? t(lang, 'Mapa vazio. Use “+ Sala” ou dê duplo clique aqui para criar a primeira sala/cena.', 'Empty map. Use “+ Room” or double-click here to create the first room/scene.')
            : t(lang, 'Nada preparado ainda.', 'Nothing prepared yet.')}
        </div>
      )}
      <div className="prep-canvas-tools" onPointerDown={e => e.stopPropagation()}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => zoomAt(1.2, size.w / 2, size.h / 2)} aria-label={t(lang, 'Aproximar', 'Zoom in')}>＋</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => zoomAt(1 / 1.2, size.w / 2, size.h / 2)} aria-label={t(lang, 'Afastar', 'Zoom out')}>－</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={fit}>{t(lang, 'Enquadrar', 'Fit')}</button>
        {editable && (
          <button type="button" className="btn btn-primary btn-sm"
            onClick={() => onCreateNode(Math.round((size.w / 2 - v.x) / v.k - NODE_W / 2), Math.round((size.h / 2 - v.y) / v.k - NODE_H / 2))}>
            + {t(lang, 'Sala', 'Room')}
          </button>
        )}
      </div>
      {editable && nodes.length > 0 && (
        <p className="prep-canvas-hint">{t(lang,
          'Arraste as salas · puxe o ● para conectar · duplo clique cria · setas do teclado movem a sala focada',
          'Drag rooms · pull ● to connect · double-click creates · arrow keys move the focused room')}</p>
      )}
    </div>
  );
}
