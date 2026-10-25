import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { flash } from '../play/flash.js';
import { labelWidths, tokenLabel } from './token-label.js';
import { loadNameIndex, needsNameIndex, portraitFor } from '../combat/monster-portrait.js';
import { snapToGrid } from '../combat/placement.js';
import { usePanZoom, nearestHit, toContent } from '../shell/usePanZoom.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import './combat-grid.css';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 800;
// Raio do alvo de toque, em px de tela: o dedo acha o token num círculo de 44 px
// mesmo quando ele aparece com 15 px (mapa inteiro no celular).
const TOUCH_RADIUS = 22;
const MOUSE_RADIUS = 6;
// Jogador/telão não recebem PV de monstro: usam a faixa pública de saúde.
const BAND = { unhurt: 1, hurt: 0.7, bloodied: 0.35, down: 0 };
const SIZES = [
  ['0.5', 'Miúdo', 'Tiny'],
  ['1', 'Pequeno/Médio', 'Small/Medium'],
  ['2', 'Grande', 'Large'],
  ['3', 'Enorme', 'Huge'],
  ['4', 'Imenso', 'Gargantuan'],
];

/**
 * Grid VTT — canvas + tokens. Duas versões:
 *
 * - Mestre (Jogar › Combate): mapa no toque (plano §5.D, F5).
 *   - Zoom de 1× a 4× com pinça, roda do mouse e ＋ − ⤢ (usePanZoom); um dedo
 *     (ou o mouse) no fundo move a vista. Só a caixa do mapa tem
 *     `touch-action: none`: fora dela a página rola.
 *   - Arrastar um token move o token (encaixe na grade ao soltar, se a grade
 *     estiver à vista); a posição só vai ao servidor ao soltar.
 *   - Tocar num token (alvo de 44 px na tela) seleciona e chama `onTokenTap`
 *     (no celular, o Combate abre a folha do combatente).
 *   - O canvas tem o tamanho da caixa e desenha já na escala da tela: nomes e
 *     barras com tamanho mínimo em px de tela (nomes ≥ 12 px em qualquer zoom).
 *   - Ferramentas do mapa (fundo, ×, quadrado, grade, imagem e tamanho do
 *     token): folha no celular/tablet, painel acima do mapa no desktop.
 * - Telão (`readOnly`): o canvas de sempre (1200×800 escalado pelo CSS), sem
 *   gestos nem ferramentas — o desenho é o mesmo de antes, pixel a pixel.
 *
 * Desenho: fundo (contain), grade, tokens (PNG ou círculo com inicial), brilho
 * dourado no token da vez, seleção, barra de PV, nome, X em derrotado e anel
 * vermelho com PV crítico; redesenha a cada 700 ms.
 */
export default function CombatGrid(props) {
  return props.readOnly ? <ReadOnlyGrid {...props} /> : <LiveGrid {...props} />;
}

// ------------------------------------------------------------------ imagens
/** Fundo e retratos dos tokens (em cache por URL: o polling não recarrega tudo). */
function useMapImages(combat) {
  const map = combat?.map || {};
  const [bgImage, setBgImage] = useState(null);
  const [tokenImages, setTokenImages] = useState({}); // id -> HTMLImageElement

  useEffect(() => {
    if (!map.background_image) { setBgImage(null); return; }
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.src = map.background_image;
  }, [map.background_image]);

  // Índice nome → retrato (só quando algum monstro não traz o id, ex.: telão/jogador).
  const [nameIndex, setNameIndex] = useState(null);
  const wantsIndex = needsNameIndex(combat?.combatants);
  useEffect(() => {
    if (!wantsIndex || nameIndex) return undefined;
    let alive = true;
    loadNameIndex().then(ix => { if (alive) setNameIndex(ix); });
    return () => { alive = false; };
  }, [wantsIndex, nameIndex]);

  // Monstro sem PNG próprio usa o retrato do bestiário.
  const imgCache = useRef(new Map());
  useEffect(() => {
    const next = {};
    (combat?.combatants || []).forEach(c => {
      const src = c.sprite || portraitFor(c, nameIndex);
      if (!src) return;
      let img = imgCache.current.get(src);
      if (!img) {
        img = new Image();
        img.decoding = 'async';
        img.src = src;
        if (imgCache.current.size > 200) imgCache.current.clear();
        imgCache.current.set(src, img);
      }
      if (!img.complete) {
        img.addEventListener('load', () => setTokenImages(cur => ({ ...cur })), { once: true });
      }
      next[c.id] = img;
    });
    setTokenImages(next);
    return undefined;
  }, [combat, nameIndex]);

  return { bgImage, tokenImages };
}

function mapInfo(combat) {
  const map = combat?.map || {};
  return {
    map,
    W: map.width_px || DEFAULT_WIDTH,
    H: map.height_px || DEFAULT_HEIGHT,
    gridSize: map.grid_size_px || 50,
    gridVisible: map.grid_visible !== false,
  };
}

const defaultPos = (c) => ({ x: c.position?.x ?? 50, y: c.position?.y ?? 50 });

// ------------------------------------------------------------------ desenho
/**
 * Desenha o mapa em unidades do mapa (o ctx já vem com a escala certa).
 * `live` = { S, dpr } no mapa do mestre (S = px de tela por unidade): linhas,
 * barras e nomes ganham tamanho mínimo na tela. Sem `live` (telão), os números
 * são os de sempre.
 */
function drawScene(ctx, { W, H, combat, posOf = defaultPos, bgImage, tokenImages, gridSize, gridVisible, selectedId, live }) {
  const S = live ? live.S : 1;
  const px = (n) => (live ? n / S : n);
  const blur = (n) => (live ? n * live.dpr * Math.min(1, Math.max(0.5, S)) : n);
  // Canvas não entende var(--x): resolve os tokens da paleta uma vez por desenho.
  const css = getComputedStyle(document.documentElement);
  const tok = (name) => css.getPropertyValue(name).trim() || '#888';

  // Fundo (contain, centralizado)
  if (bgImage) {
    const scale = Math.min(W / bgImage.width, H / bgImage.height);
    const dw = bgImage.width * scale, dh = bgImage.height * scale;
    const dx = (W - dw) / 2, dy = (H - dh) / 2;
    ctx.fillStyle = tok('--bg-deep');
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(bgImage, dx, dy, dw, dh);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, tok('--bg-base'));
    g.addColorStop(1, tok('--bg-deep'));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Grade
  if (gridVisible && gridSize > 0) {
    ctx.strokeStyle = 'rgba(214, 176, 100, 0.18)';
    ctx.lineWidth = px(1);
    for (let x = 0; x <= W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  // Tokens
  const combatants = combat?.combatants || [];
  const turnIdx = combat?.turnIndex ?? -1;
  const lblPx = Math.max(12, 12 * S); // nome: 12 px na tela, ou maior quando ampliado
  // Rótulos não se atropelam: cada um cabe no espaço até o vizinho (#42).
  const freeWidth = labelWidths(combatants.map(c => {
    const p = posOf(c);
    return { id: c.id, x: p.x, y: p.y, size: gridSize * (c.token_scale || 1) };
  }), live ? { rowTolerance: px(lblPx + 6), gap: px(6) } : undefined);
  // y da linha de base do nome (abaixo da barra de PV)
  const labelY = (y, size) => y + size / 2 + Math.max(4, px(3)) + Math.max(6, px(4)) + px(lblPx + 2);
  // Mestre: o nome inteiro do selecionado vai numa plaquinha por cima de tudo;
  // os nomes dos vizinhos que ficariam embaixo dela não são desenhados.
  let pill = null;
  const sc = live && selectedId != null ? combatants.find(c => c.id === selectedId) : null;
  if (sc && sc.name) {
    const p = posOf(sc);
    const ly = labelY(p.y, gridSize * (sc.token_scale || 1));
    ctx.save();
    ctx.font = `600 ${px(lblPx + 1)}px "EB Garamond", serif`;
    const w = ctx.measureText(sc.name).width;
    ctx.restore();
    const padX = px(6), top = ly - px(lblPx + 1) - px(3);
    pill = { name: sc.name, x: p.x, y: ly, l: p.x - w / 2 - padX, r: p.x + w / 2 + padX, t: top, b: top + px(lblPx + 8) };
  }
  combatants.forEach((c, i) => {
    const scale = c.token_scale || 1;
    const size = gridSize * scale;
    const { x, y } = posOf(c);
    const isCurrent = i === turnIdx;
    const isSel = selectedId != null && selectedId === c.id;
    const hpPct = c.stats?.max_hp && c.current_hp != null
      ? Math.max(0, Math.min(1, (c.current_hp || 0) / c.stats.max_hp))
      : (c.health in BAND ? BAND[c.health] : 1);
    const isCrit = hpPct <= 0.3 && !c.defeated;

    ctx.save();
    // Sombra
    ctx.shadowBlur = blur(isCurrent ? 24 : 8);
    ctx.shadowColor = isCurrent ? tok('--gold') : 'rgba(0,0,0,0.6)';
    const img = tokenImages[c.id];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.clip();
      if (c.defeated) ctx.globalAlpha = 0.45;
      // Retrato retangular: recorta o centro (cover) para não achatar.
      const iw = img.naturalWidth, ih = img.naturalHeight, side = Math.min(iw, ih);
      ctx.drawImage(img, (iw - side) / 2, (ih - side) / 2, side, side, x - size / 2, y - size / 2, size, size);
      ctx.restore();
    } else {
      // Círculo colorido com inicial
      ctx.fillStyle = c.type === 'pc' ? tok('--arcane') : tok('--blood');
      if (c.defeated) ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tok('--ink-primary');
      ctx.font = `bold ${Math.max(px(live ? 11 : 12), size * 0.4)}px 'Cinzel', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((c.name || '?').charAt(0).toUpperCase(), x, y);
    }
    // Borda
    ctx.shadowBlur = 0;
    ctx.lineWidth = isCurrent ? Math.max(4, px(2.5)) : Math.max(2, px(1.5));
    ctx.strokeStyle = isCurrent ? tok('--gold') : (isSel ? '#fff' : tok('--bg-elevated'));
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.stroke();
    // Selecionado (mestre): anel branco por fora, visível mesmo com o mapa inteiro na tela
    if (live && isSel) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = px(2);
      ctx.beginPath();
      ctx.arc(x, y, size / 2 + px(isCurrent ? 6 : 4), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Barra de PV abaixo do token
    const barW = size, barH = Math.max(6, px(4));
    const barX = x - barW / 2, barY = y + size / 2 + Math.max(4, px(3));
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = hpPct > 0.6 ? tok('--moss-bright') : hpPct > 0.3 ? tok('--gold') : tok('--blood-bright');
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    // Nome (no mestre: só se couber ≥ 30 px na tela; o do selecionado vai na plaquinha)
    const ly = barY + barH + px(lblPx + 2);
    const free = freeWidth.get(c.id) ?? size;
    if (!live || (!isSel && free * S >= 30)) {
      ctx.fillStyle = tok('--ink-primary');
      ctx.shadowBlur = blur(4);
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.font = `${px(lblPx)}px "EB Garamond", serif`;
      ctx.textAlign = 'center';
      if (live) ctx.textBaseline = 'alphabetic';
      const label = tokenLabel(c.name, free, (txt) => ctx.measureText(txt).width);
      const hw = live ? ctx.measureText(label).width / 2 : 0;
      const underPill = pill && x + hw > pill.l && x - hw < pill.r && ly > pill.t && ly - px(lblPx) < pill.b;
      if (!underPill) ctx.fillText(label, x, ly);
    }

    // Derrotado → X
    if (c.defeated) {
      ctx.strokeStyle = tok('--blood-bright');
      ctx.lineWidth = Math.max(3, px(2));
      ctx.beginPath();
      ctx.moveTo(x - size / 3, y - size / 3);
      ctx.lineTo(x + size / 3, y + size / 3);
      ctx.moveTo(x + size / 3, y - size / 3);
      ctx.lineTo(x - size / 3, y + size / 3);
      ctx.stroke();
    }

    // PV crítico → anel vermelho
    if (isCrit) {
      ctx.strokeStyle = 'rgba(224, 96, 79, 0.7)';
      ctx.lineWidth = Math.max(6, px(3));
      ctx.beginPath();
      ctx.arc(x, y, size / 2 + Math.max(4, px(2)), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  });

  // Nome inteiro do selecionado, numa plaquinha (mestre)
  if (pill) {
    ctx.save();
    ctx.font = `600 ${px(lblPx + 1)}px "EB Garamond", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(14, 10, 7, 0.88)';
    ctx.strokeStyle = 'rgba(240, 200, 110, 0.75)';
    ctx.lineWidth = px(1);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(pill.l, pill.t, pill.r - pill.l, pill.b - pill.t, px(5));
    else ctx.rect(pill.l, pill.t, pill.r - pill.l, pill.b - pill.t);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = tok('--ink-primary');
    ctx.fillText(pill.name, pill.x, pill.y);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ telão (só leitura)
function ReadOnlyGrid({ combat }) {
  const canvasRef = useRef(null);
  const { bgImage, tokenImages } = useMapImages(combat);
  const { W, H, gridSize, gridVisible } = mapInfo(combat);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    drawScene(ctx, { W, H, combat, bgImage, tokenImages, gridSize, gridVisible });
  }, [combat, bgImage, tokenImages, W, H, gridSize, gridVisible]);

  useEffect(() => { draw(); }, [draw]);
  // Re-draw periódico (PV crítico, retratos que chegam depois)
  useEffect(() => {
    const id = setInterval(draw, 700);
    return () => clearInterval(id);
  }, [draw]);

  return (
    <div className="combat-grid-wrapper">
      <div className="grid-canvas-frame">
        <canvas ref={canvasRef} width={W} height={H} style={{ cursor: 'default' }} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ mapa do mestre
/** Media query viva (ex.: ≥ 1024 px = lista e mapa lado a lado no Combate). */
function useMedia(q, fallback = false) {
  const [on, setOn] = useState(() => { try { return window.matchMedia(q).matches; } catch { return fallback; } });
  useEffect(() => {
    let mq;
    try { mq = window.matchMedia(q); } catch { return undefined; }
    const f = () => setOn(mq.matches);
    f();
    mq.addEventListener?.('change', f);
    return () => mq.removeEventListener?.('change', f);
  }, [q]);
  return on;
}

const zoomText = (z, lang) => {
  const r = Math.round(z * 10) / 10;
  const s = Number.isInteger(r) ? String(r) : r.toFixed(1);
  return `${lang === 'pt' ? s.replace('.', ',') : s}×`;
};

function LiveGrid({ combat, campaignId, lang, onChange, selectedId, setSelectedId, onTokenTap }) {
  const canvasRef = useRef(null);
  const { bgImage, tokenImages } = useMapImages(combat);
  const { W, H, gridSize, gridVisible } = mapInfo(combat);
  const combatants = combat?.combatants || [];
  const wide = useMedia('(min-width: 1024px)', true);
  const coarse = useMedia('(pointer: coarse)');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [hover, setHover] = useState(null);
  const [, redraw] = useState(0);

  // Posição provisória enquanto arrasta; depois de soltar, a posição salva fica
  // valendo até o servidor devolver a mesma (sem o token "voltar" por um instante).
  const [drag, setDrag] = useState(null); // { id, x, y }
  const grab = useRef({ dx: 0, dy: 0 });
  const pending = useRef(new Map()); // id → { x, y, t }
  useEffect(() => {
    for (const [id, p] of pending.current) {
      const c = combatants.find(x => x.id === id);
      if (!c || (c.position?.x === p.x && c.position?.y === p.y) || Date.now() - p.t > 8000) pending.current.delete(id);
    }
  }, [combat]); // eslint-disable-line react-hooks/exhaustive-deps

  const posOf = (c) => {
    if (drag && drag.id === c.id) return drag;
    return pending.current.get(c.id) || defaultPos(c);
  };
  const byId = (id) => combatants.find(c => c.id === id);
  const hitItems = () => combatants.map(c => {
    const p = posOf(c);
    return { id: c.id, x: p.x, y: p.y, r: (gridSize * (c.token_scale || 1)) / 2 };
  });
  const placeFor = (c, p) => {
    const scale = c.token_scale || 1;
    const rx = p.x - grab.current.dx, ry = p.y - grab.current.dy;
    if (gridVisible && gridSize > 0) {
      return { x: snapToGrid(rx, gridSize, scale, W), y: snapToGrid(ry, gridSize, scale, H) };
    }
    return { x: Math.round(Math.max(0, Math.min(W, rx))), y: Math.round(Math.max(0, Math.min(H, ry))) };
  };

  const pz = usePanZoom({
    content: { w: W, h: H },
    hitTest: (p, S, pointerType) => {
      const hit = nearestHit(hitItems(), p, (pointerType === 'mouse' ? MOUSE_RADIUS : TOUCH_RADIUS) / S);
      return hit ? hit.id : null;
    },
    onItemDragStart: (id, p0) => {
      const c = byId(id);
      if (!c) return;
      const p = posOf(c);
      grab.current = { dx: p0.x - p.x, dy: p0.y - p.y };
      setSelectedId?.(id);
    },
    onItemDrag: (id, p) => {
      const c = byId(id);
      if (!c) return;
      const next = placeFor(c, p);
      setDrag(d => (d && d.id === id && d.x === next.x && d.y === next.y ? d : { id, ...next }));
    },
    onItemDrop: async (id, p) => {
      const c = byId(id);
      setDrag(null);
      if (!c) return;
      const to = placeFor(c, p);
      const from = pending.current.get(id) || defaultPos(c);
      if (to.x === from.x && to.y === from.y) return;
      pending.current.set(id, { ...to, t: Date.now() });
      try {
        await api.updateCombatant(campaignId, id, { position: to });
        onChange?.();
      } catch (e) {
        console.warn(e);
        pending.current.delete(id);
        flash(t(lang, 'Não consegui mover o token. Tente de novo.', 'Could not move the token. Try again.'), { error: true });
        redraw(n => n + 1);
      }
    },
    onItemCancel: () => setDrag(null),
    onItemTap: (id) => {
      const c = byId(id);
      if (!c) return;
      setSelectedId?.(id);
      onTokenTap?.(c);
    },
  });

  // ---------------------------------------------------------------- desenho
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const cw = Math.max(1, Math.round(pz.box.w * dpr));
  const chh = Math.max(1, Math.round(pz.box.h * dpr));
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !pz.box.w || !pz.box.h) return;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const S = pz.scale;
    ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * pz.view.x, dpr * pz.view.y);
    drawScene(ctx, { W, H, combat, posOf, bgImage, tokenImages, gridSize, gridVisible, selectedId, live: { S, dpr } });
  };
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => { drawRef.current(); });
  useEffect(() => {
    const id = setInterval(() => drawRef.current(), 700);
    return () => clearInterval(id);
  }, []);

  // cursor do mouse: mãozinha sobre o token, "mover" no fundo ampliado
  const onHover = (e) => {
    if (e.pointerType !== 'mouse' || pz.mode !== 'idle' || !pz.boxRef.current) return;
    const r = pz.boxRef.current.getBoundingClientRect();
    const p = toContent(pz.view, e.clientX - r.left, e.clientY - r.top, pz.box, { w: W, h: H });
    const hit = nearestHit(hitItems(), p, MOUSE_RADIUS / pz.scale);
    const id = hit ? hit.id : null;
    if (id !== hover) setHover(id);
  };
  const cursor = pz.mode === 'item' ? 'grabbing' : pz.mode === 'pan' ? 'grabbing' : hover != null ? 'grab' : pz.view.z > 1.001 ? 'move' : 'default';

  const ratio = `${W} / ${H}`;
  const tools = (
    <MapTools combat={combat} campaignId={campaignId} lang={lang} onChange={onChange}
      selectedId={selectedId} setSelectedId={setSelectedId} inline={wide} />
  );

  return (
    <div className="combat-grid-wrapper is-live">
      <div className="cg-bar">
        <div className="cg-zoom" role="group" aria-label={t(lang, 'Zoom do mapa', 'Map zoom')}>
          <button type="button" className="cg-zbtn" onClick={pz.zoomOut} disabled={!pz.canZoomOut}
            aria-label={t(lang, 'Afastar', 'Zoom out')}>−</button>
          <span className="cg-zval" aria-live="polite">
            {zoomText(pz.view.z, lang)}
          </span>
          <button type="button" className="cg-zbtn" onClick={pz.zoomIn} disabled={!pz.canZoomIn}
            aria-label={t(lang, 'Aproximar', 'Zoom in')}>＋</button>
          <button type="button" className="cg-zbtn" onClick={pz.fit} disabled={!pz.canZoomOut}
            aria-label={t(lang, 'Ver o mapa inteiro', 'Fit the whole map')} title={t(lang, 'Ver o mapa inteiro', 'Fit the whole map')}>⤢</button>
        </div>
        <button type="button" className="mesa-btn cg-tools-btn" onClick={() => setToolsOpen(v => !v)}
          aria-expanded={wide ? toolsOpen : undefined} aria-haspopup={wide ? undefined : 'dialog'}>
          <span aria-hidden="true">🛠</span> {t(lang, 'Ferramentas', 'Tools')}
        </button>
      </div>

      {wide && toolsOpen && <div className="cg-tools-inline">{tools}</div>}

      <div className={`cg-box ${pz.mode !== 'idle' ? `is-${pz.mode}` : ''}`} ref={pz.boxRef}
        style={{ '--cg-ratio': ratio, cursor }}
        data-zoom={pz.view.z.toFixed(3)} data-scale={pz.scale.toFixed(4)}
        data-x={pz.view.x.toFixed(1)} data-y={pz.view.y.toFixed(1)}
        role="application"
        aria-label={t(lang,
          'Mapa do combate. Toque num token para abrir; arraste o token para mover; pinça, roda do mouse ou ＋ − para aproximar; arraste o fundo para andar pelo mapa.',
          'Combat map. Tap a token to open it; drag a token to move it; pinch, mouse wheel or ＋ − to zoom; drag the background to pan.')}
        onPointerDown={pz.handlers.onPointerDown}
        onPointerMove={(e) => { pz.handlers.onPointerMove(e); onHover(e); }}
        onPointerUp={pz.handlers.onPointerUp}
        onPointerCancel={pz.handlers.onPointerCancel}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse' && hover != null) setHover(null); }}
        onContextMenu={(e) => { if (pz.mode !== 'idle') e.preventDefault(); }}>
        <canvas ref={canvasRef} className="cg-canvas" width={cw} height={chh} aria-hidden="true" />
      </div>

      <p className="cg-hint">
        {coarse
          ? t(lang, 'Toque no token para abrir · arraste para mover · pinça ou ＋ − para aproximar · um dedo no fundo anda.',
            'Tap a token to open it · drag to move it · pinch or ＋ − to zoom · one finger on the background pans.')
          : t(lang, 'Clique no token para abrir · arraste para mover · roda do mouse ou ＋ − para aproximar · arraste o fundo para andar.',
            'Click a token to open it · drag to move it · mouse wheel or ＋ − to zoom · drag the background to pan.')}
      </p>

      {!wide && toolsOpen && (
        <MesaSheet title={t(lang, 'Ferramentas do mapa', 'Map tools')} icon="🛠" size="auto" width="sm" lang={lang}
          onClose={() => setToolsOpen(false)} className="cg-tools-sheet"
          footer={(
            <div className="mesa-actions">
              <button type="button" className="mesa-btn mesa-btn-lg is-primary" onClick={() => setToolsOpen(false)}>✓ {t(lang, 'Pronto', 'Done')}</button>
            </div>
          )}>
          {tools}
        </MesaSheet>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ ferramentas do mapa
/**
 * Fundo (até 4 MB, comprimido para 1600 px) e ×; quadrado de 20 a 120 px
 * (vai ao servidor 0,4 s depois do último ajuste); mostrar/esconder grade;
 * imagem (até 500 KB) e tamanho do token escolhido.
 */
function MapTools({ combat, campaignId, lang, onChange, selectedId, setSelectedId, inline }) {
  const { map, gridSize, gridVisible } = mapInfo(combat);
  const combatants = combat?.combatants || [];
  const sel = combatants.find(c => c.id === selectedId) || null;
  const fileRef = useRef(null);
  const tokenFileRef = useRef(null);
  const fail = (pt, en) => flash(t(lang, pt, en), { error: true });

  // Quadrado: valor local enquanto ajusta; uma chamada só no fim.
  const [gs, setGs] = useState(gridSize);
  const gsPending = useRef(null);
  const gsTimer = useRef(null);
  useEffect(() => { if (gsPending.current == null) setGs(gridSize); }, [gridSize]);
  const sendGs = useCallback(async () => {
    clearTimeout(gsTimer.current);
    const v = gsPending.current;
    if (v == null) return;
    try {
      await api.setCombatMap(campaignId, { grid_size_px: v });
      onChange?.();
    } catch { fail('Não consegui mudar o quadrado.', 'Could not change the square size.'); }
    finally { if (gsPending.current === v) gsPending.current = null; }
  }, [campaignId, onChange]); // eslint-disable-line react-hooks/exhaustive-deps
  const sendRef = useRef(sendGs);
  sendRef.current = sendGs;
  useEffect(() => () => { if (gsPending.current != null) sendRef.current(); }, []);
  const changeGs = (v) => {
    const n = Math.max(20, Math.min(120, Math.round((parseInt(v, 10) || 50) / 5) * 5));
    setGs(n);
    gsPending.current = n;
    clearTimeout(gsTimer.current);
    gsTimer.current = setTimeout(() => sendRef.current(), 400);
  };

  const handleBgFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) { fail('Imagem grande demais (mais de 4 MB). Tente uma menor.', 'Image too large (over 4 MB). Try a smaller one.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      // Comprime via canvas pra max 1600px
      const img = new Image();
      img.onload = async () => {
        const max = 1600;
        let w = img.width, h = img.height;
        if (w > max || h > max) {
          const s = Math.min(max / w, max / h);
          w = Math.round(w * s); h = Math.round(h * s);
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL('image/jpeg', 0.82);
        try {
          await api.setCombatMap(campaignId, { background_image: dataUrl, width_px: w, height_px: h });
        } catch {
          fail('Não consegui usar essa imagem como fundo.', 'Could not use that image as background.');
        }
        onChange?.();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  };

  const clearBg = async () => {
    try { await api.setCombatMap(campaignId, { background_image: null }); onChange?.(); }
    catch { fail('Não consegui tirar o fundo.', 'Could not remove the background.'); }
  };

  const toggleGrid = async () => {
    try { await api.setCombatMap(campaignId, { grid_visible: !gridVisible }); onChange?.(); }
    catch { fail('Não consegui mudar a grade.', 'Could not change the grid.'); }
  };

  const handleTokenFile = (combatantId) => (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 500 * 1024) { fail('Imagem grande demais (mais de 500 KB).', 'Image too large (over 500 KB).'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const max = 256;
        const s = Math.min(max / img.width, max / img.height, 1);
        const w = Math.round(img.width * s), h = Math.round(img.height * s);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL('image/png');
        try { await api.updateCombatant(campaignId, combatantId, { sprite: dataUrl }); onChange?.(); }
        catch { fail('Não consegui trocar a imagem do token.', 'Could not change the token image.'); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  };

  const setTokenScale = async (combatantId, scale) => {
    try { await api.updateCombatant(campaignId, combatantId, { token_scale: parseFloat(scale) }); onChange?.(); }
    catch { fail('Não consegui mudar o tamanho do token.', 'Could not change the token size.'); }
  };

  const gsId = `cg-gs-${campaignId}`;
  return (
    <div className={`cg-tools ${inline ? 'is-inline' : ''}`}>
      <section className="cg-tools-sec" aria-labelledby={`${gsId}-bg`}>
        <h3 className="cg-tools-h" id={`${gsId}-bg`}>{t(lang, 'Fundo', 'Background')}</h3>
        <div className="cg-tools-row">
          <button type="button" className="mesa-btn cg-grow" onClick={() => fileRef.current?.click()}>
            🖼 {map.background_image ? t(lang, 'Trocar imagem de fundo', 'Change background') : t(lang, 'Imagem de fundo', 'Background')}
          </button>
          {map.background_image && (
            <button type="button" className="mesa-btn is-quiet cg-clear" onClick={clearBg} aria-label={t(lang, 'Tirar imagem de fundo', 'Remove background')}>
              <span aria-hidden="true">×</span> {t(lang, 'Tirar fundo', 'Remove')}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleBgFile} />
        <p className="mesa-hint">{t(lang, 'Até 4 MB; a imagem é reduzida para caber em 1600 px.', 'Up to 4 MB; the image is shrunk to fit 1600 px.')}</p>
      </section>

      <section className="cg-tools-sec" aria-labelledby={`${gsId}-grid`}>
        <h3 className="cg-tools-h" id={`${gsId}-grid`}>{t(lang, 'Grade', 'Grid')}</h3>
        <div className="cg-gs">
          <span className="cg-gs-label" id={gsId}>{t(lang, 'Quadrado', 'Square')}: <strong>{gs} px</strong></span>
          <div className="cg-gs-ctl">
            <button type="button" className="cg-zbtn" onClick={() => changeGs(gs - 5)} disabled={gs <= 20}
              aria-label={t(lang, 'Quadrado menor', 'Smaller square')}>−</button>
            <input type="range" className="cg-range" min={20} max={120} step={5} value={gs}
              aria-labelledby={gsId} onChange={e => changeGs(e.target.value)} />
            <button type="button" className="cg-zbtn" onClick={() => changeGs(gs + 5)} disabled={gs >= 120}
              aria-label={t(lang, 'Quadrado maior', 'Bigger square')}>＋</button>
          </div>
        </div>
        <button type="button" className="mesa-btn cg-grow" onClick={toggleGrid} aria-pressed={!gridVisible}>
          {gridVisible ? '◻ ' : '⬜ '}{gridVisible ? t(lang, 'Esconder grade', 'Hide grid') : t(lang, 'Mostrar grade', 'Show grid')}
        </button>
        <p className="mesa-hint">{t(lang, 'Com a grade à vista, o token encaixa na casa ao soltar.', 'With the grid shown, tokens snap to the square when dropped.')}</p>
      </section>

      <section className="cg-tools-sec" aria-labelledby={`${gsId}-tok`}>
        <h3 className="cg-tools-h" id={`${gsId}-tok`}>{t(lang, 'Token', 'Token')}</h3>
        {combatants.length === 0 ? (
          <p className="mesa-hint">{t(lang, 'Ponha monstros ou personagens no combate para trocar a imagem ou o tamanho do token.', 'Add monsters or characters to change a token’s image or size.')}</p>
        ) : (
          <>
            <div className="mesa-field">
              <label htmlFor={`${gsId}-who`}>{t(lang, 'Qual token', 'Which token')}</label>
              <select id={`${gsId}-who`} value={sel ? String(sel.id) : ''}
                onChange={e => { const c = combatants.find(x => String(x.id) === e.target.value); setSelectedId?.(c ? c.id : null); }}>
                {!sel && <option value="">{t(lang, 'Escolha um token…', 'Pick a token…')}</option>}
                {combatants.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </div>
            {sel && (
              <>
                <input ref={tokenFileRef} type="file" accept="image/*" hidden onChange={handleTokenFile(sel.id)} />
                <button type="button" className="mesa-btn cg-grow" onClick={() => tokenFileRef.current?.click()}>
                  🖼 {t(lang, 'Imagem do token', 'Token image')}
                </button>
                <p className="mesa-hint">{t(lang, 'Até 500 KB.', 'Up to 500 KB.')}</p>
                <p className="cg-size-label" id={`${gsId}-size`}>{t(lang, 'Tamanho no mapa', 'Size on map')}</p>
                <div className="cg-size" role="group" aria-labelledby={`${gsId}-size`}>
                  {SIZES.map(([v, pt, en]) => (
                    <button key={v} type="button" className="mesa-chip"
                      aria-pressed={Number(sel.token_scale || 1) === Number(v)}
                      onClick={() => setTokenScale(sel.id, v)}>
                      {t(lang, pt, en)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
