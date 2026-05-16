import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../api/client.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 800;

/**
 * Grid VTT — canvas + tokens drag-drop. DM only no painel da campanha;
 * o telão público tem uma versão read-only (CombatGrid mas com `readOnly`).
 *
 * Render:
 *   1. Background (base64) escalado pra encaixar.
 *   2. Linhas de grid (opcional).
 *   3. Tokens (PNG ou círculo com inicial) por combatant.
 *   4. Glow gold no token do turno atual; vermelho pulsante se HP crítico.
 *
 * Interação (não readOnly):
 *   - Mouse down em token → arrasta. Mouse up → salva position no backend.
 *   - Click em token → seleciona (estado externo).
 *   - Botão "Trocar background" → upload de imagem.
 *   - Slider grid size; toggle grid visível.
 *   - Slider escala por token (Tiny/Small/Medium/Large/Huge/Gargantuan).
 */
export default function CombatGrid({ combat, campaignId, lang, onChange, selectedId, setSelectedId, readOnly = false }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const fileRef = useRef(null);
  const tokenFileRef = useRef(null);
  const [bgImage, setBgImage] = useState(null);
  const [tokenImages, setTokenImages] = useState({}); // id -> HTMLImageElement
  const [dragging, setDragging] = useState(null); // {id, dx, dy}
  const [hoverId, setHoverId] = useState(null);
  const [showControls, setShowControls] = useState(!readOnly);

  const map = combat?.map || {};
  const W = map.width_px || DEFAULT_WIDTH;
  const H = map.height_px || DEFAULT_HEIGHT;
  const gridSize = map.grid_size_px || 50;
  const gridVisible = map.grid_visible !== false;

  // Carrega bg image
  useEffect(() => {
    if (!map.background_image) { setBgImage(null); return; }
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.src = map.background_image;
  }, [map.background_image]);

  // Carrega sprites dos combatentes
  useEffect(() => {
    const next = {};
    (combat?.combatants || []).forEach(c => {
      if (c.sprite) {
        const img = new Image();
        img.src = c.sprite;
        next[c.id] = img;
      }
    });
    setTokenImages(next);
  }, [combat]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Background
    if (bgImage) {
      // scale to fit while preserving aspect
      const scale = Math.min(W / bgImage.width, H / bgImage.height);
      const dw = bgImage.width * scale, dh = bgImage.height * scale;
      const dx = (W - dw) / 2, dy = (H - dh) / 2;
      ctx.fillStyle = '#0c0805';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(bgImage, dx, dy, dw, dh);
    } else {
      // dark fantasy texture: gradient
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1a1410');
      g.addColorStop(1, '#0c0805');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // Grid
    if (gridVisible && gridSize > 0) {
      ctx.strokeStyle = 'rgba(212, 168, 77, 0.18)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    // Tokens
    const turnIdx = combat?.turnIndex ?? -1;
    (combat?.combatants || []).forEach((c, i) => {
      const scale = c.token_scale || 1;
      const size = gridSize * scale;
      const x = c.position?.x ?? 50;
      const y = c.position?.y ?? 50;
      const isCurrent = i === turnIdx;
      const hpPct = c.stats?.max_hp ? Math.max(0, Math.min(1, (c.current_hp || 0) / c.stats.max_hp)) : 1;
      const isCrit = hpPct <= 0.3 && !c.defeated;

      ctx.save();
      // Sombra
      ctx.shadowBlur = isCurrent ? 24 : 8;
      ctx.shadowColor = isCurrent ? '#d4a84d' : 'rgba(0,0,0,0.6)';
      const img = tokenImages[c.id];
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
        ctx.restore();
      } else {
        // Círculo colorido com inicial
        ctx.fillStyle = c.type === 'pc' ? '#3a6ea5' : '#a53a3a';
        if (c.defeated) ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f4ecd8';
        ctx.font = `bold ${Math.max(12, size * 0.4)}px 'Cinzel', serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((c.name || '?').charAt(0).toUpperCase(), x, y);
      }
      // Borda
      ctx.shadowBlur = 0;
      ctx.lineWidth = isCurrent ? 4 : 2;
      ctx.strokeStyle = isCurrent ? '#d4a84d' : (selectedId === c.id ? '#fff' : '#3a2820');
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.stroke();

      // HP bar abaixo do token
      const barW = size, barH = 6;
      const barX = x - barW / 2, barY = y + size / 2 + 4;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = hpPct > 0.6 ? '#5cba5c' : hpPct > 0.3 ? '#d4a84d' : '#d44d4d';
      ctx.fillRect(barX, barY, barW * hpPct, barH);

      // Nome
      ctx.fillStyle = '#f4ecd8';
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.font = '12px "EB Garamond", serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.name || '', x, barY + barH + 14);

      // Defeated → X
      if (c.defeated) {
        ctx.strokeStyle = '#d44d4d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - size / 3, y - size / 3);
        ctx.lineTo(x + size / 3, y + size / 3);
        ctx.moveTo(x + size / 3, y - size / 3);
        ctx.lineTo(x - size / 3, y + size / 3);
        ctx.stroke();
      }

      // HP crítico → pulso vermelho (apenas visual estático, anim depende de redraw constante)
      if (isCrit) {
        ctx.strokeStyle = 'rgba(212, 77, 77, 0.7)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(x, y, size / 2 + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    });
  }, [combat, bgImage, tokenImages, W, H, gridSize, gridVisible, selectedId]);

  useEffect(() => { draw(); }, [draw]);

  // Re-draw periodicamente pra HP crítico pulsar
  useEffect(() => {
    const id = setInterval(draw, 700);
    return () => clearInterval(id);
  }, [draw]);

  // Coordenadas do mouse → coordenadas do canvas
  const canvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const tokenAt = (x, y) => {
    const cs = combat?.combatants || [];
    for (let i = cs.length - 1; i >= 0; i--) {
      const c = cs[i];
      const size = (gridSize * (c.token_scale || 1)) / 2;
      const dx = (c.position?.x ?? 50) - x;
      const dy = (c.position?.y ?? 50) - y;
      if (dx * dx + dy * dy <= size * size) return c;
    }
    return null;
  };

  const onMouseDown = (e) => {
    if (readOnly) return;
    const p = canvasCoords(e);
    const c = tokenAt(p.x, p.y);
    if (!c) return;
    setSelectedId?.(c.id);
    setDragging({ id: c.id, dx: p.x - (c.position?.x ?? 50), dy: p.y - (c.position?.y ?? 50) });
  };

  const onMouseMove = (e) => {
    if (readOnly) return;
    const p = canvasCoords(e);
    if (dragging) {
      const newX = Math.max(0, Math.min(W, p.x - dragging.dx));
      const newY = Math.max(0, Math.min(H, p.y - dragging.dy));
      // Snap ao grid se gridVisible (próximo centro de quadrado)
      let sx = newX, sy = newY;
      if (gridVisible && gridSize > 0) {
        sx = Math.round(newX / gridSize) * gridSize + gridSize / 2;
        sy = Math.round(newY / gridSize) * gridSize + gridSize / 2;
      }
      // Atualiza localmente pra render fluido
      const next = combat.combatants.map(c => c.id === dragging.id ? { ...c, position: { x: sx, y: sy } } : c);
      // Mutação direta no objeto pra o draw ver — não é state mas é OK pra UX
      combat.combatants = next;
      draw();
    } else {
      const c = tokenAt(p.x, p.y);
      setHoverId(c?.id || null);
    }
  };

  const onMouseUp = async () => {
    if (readOnly) return;
    if (!dragging) return;
    const c = (combat.combatants || []).find(x => x.id === dragging.id);
    if (c) {
      try {
        await api.updateCombatant(campaignId, c.id, { position: c.position });
        onChange?.();
      } catch (e) { console.warn(e); }
    }
    setDragging(null);
  };

  const handleBgFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 4 * 1024 * 1024) { alert(t(lang, 'Imagem grande demais (>4MB). Comprima primeiro.', 'Image too large (>4MB). Compress first.')); return; }
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
        await api.setCombatMap(campaignId, { background_image: dataUrl, width_px: w, height_px: h });
        onChange?.();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  };

  const clearBg = async () => {
    await api.setCombatMap(campaignId, { background_image: null });
    onChange?.();
  };

  const setGridSize = async (v) => {
    await api.setCombatMap(campaignId, { grid_size_px: parseInt(v) || 50 });
    onChange?.();
  };

  const toggleGrid = async () => {
    await api.setCombatMap(campaignId, { grid_visible: !gridVisible });
    onChange?.();
  };

  const handleTokenFile = (combatantId) => async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 500 * 1024) { alert(t(lang, 'PNG grande demais (>500KB).', 'PNG too large (>500KB).')); return; }
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
        await api.updateCombatant(campaignId, combatantId, { sprite: dataUrl });
        onChange?.();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  };

  const setTokenScale = async (combatantId, scale) => {
    await api.updateCombatant(campaignId, combatantId, { token_scale: parseFloat(scale) });
    onChange?.();
  };

  const selectedCombatant = (combat?.combatants || []).find(c => c.id === selectedId);

  return (
    <div className="combat-grid-wrapper" ref={wrapperRef}>
      {showControls && !readOnly && (
        <div className="grid-controls">
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
            🖼 {t(lang, 'Background', 'Background')}
          </button>
          {map.background_image && <button className="btn btn-ghost btn-sm" onClick={clearBg}>×</button>}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgFile} />
          <label className="grid-ctl-label">
            <span>{t(lang, 'Quadrado', 'Square')}: {gridSize}px</span>
            <input type="range" min={20} max={120} step={5} value={gridSize} onChange={e => setGridSize(e.target.value)} />
          </label>
          <button className="btn btn-ghost btn-sm" onClick={toggleGrid}>
            {gridVisible ? '◻ ' : '⬜ '}{t(lang, 'Grid', 'Grid')}
          </button>
          {selectedCombatant && (
            <div className="grid-token-ctl">
              <strong>{selectedCombatant.name}</strong>
              <input ref={tokenFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleTokenFile(selectedCombatant.id)} />
              <button className="btn btn-ghost btn-sm" onClick={() => tokenFileRef.current?.click()}>
                PNG
              </button>
              <select value={selectedCombatant.token_scale || 1} onChange={e => setTokenScale(selectedCombatant.id, e.target.value)} className="input" style={{ width: 90 }}>
                <option value="0.5">Tiny</option>
                <option value="1">Small/Medium</option>
                <option value="2">Large</option>
                <option value="3">Huge</option>
                <option value="4">Gargantuan</option>
              </select>
            </div>
          )}
        </div>
      )}
      <div className="grid-canvas-frame">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { setDragging(null); setHoverId(null); }}
          style={{ cursor: dragging ? 'grabbing' : hoverId ? 'grab' : (readOnly ? 'default' : 'crosshair') }}
        />
      </div>
    </div>
  );
}
