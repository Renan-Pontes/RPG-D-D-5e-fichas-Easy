// Palco WebGL dos dados 3D (carregado sob demanda — chunk separado com three).
//
// play(dice) recebe valores JÁ DECIDIDOS e anima cada dado caindo e girando
// até parar exatamente na face correta (ver orientationFor).
import {
  WebGLRenderer, Scene, PerspectiveCamera, AmbientLight, DirectionalLight,
  Mesh, MeshStandardMaterial, CanvasTexture, SRGBColorSpace, Quaternion,
  Vector3, EdgesGeometry, LineSegments, LineBasicMaterial, Group, Color,
} from 'three';
import { buildDie, orientationFor } from './dice-geometry.js';

const PALETTE = {
  d4:   { body: '#6b5a30', ink: '#f3e6cb', edge: '#edcb7a' },
  d6:   { body: '#2d2319', ink: '#edcb7a', edge: '#d6b064' },
  d8:   { body: '#262d52', ink: '#f3e6cb', edge: '#9fb0f0' },
  d10:  { body: '#34401f', ink: '#f3e6cb', edge: '#9cc065' },
  d100: { body: '#34401f', ink: '#edcb7a', edge: '#9cc065' },
  d12:  { body: '#5a3d12', ink: '#f3e6cb', edge: '#e3a445' },
  d20:  { body: '#5c1a10', ink: '#f3e6cb', edge: '#e0604f' },
};
const TONES = {
  crit:   { body: '#a8894a', ink: '#1a120a', edge: '#edcb7a', glow: '#6b5a30' },
  fumble: { body: '#3a0f09', ink: '#e0604f', edge: '#e0604f', glow: '#5c1a10' },
};

const geoCache = new Map();
function dieModel(kind) {
  if (!geoCache.has(kind)) geoCache.set(kind, buildDie(kind, 1));
  return geoCache.get(kind);
}

function faceTexture(label, colors, kind) {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = colors.body;
  ctx.fillRect(0, 0, size, size);
  // Tamanho do número conforme o formato da face (triângulo tem menos área útil).
  const scale = { d4: 0.34, d6: 0.5, d8: 0.36, d10: 0.34, d100: 0.3, d12: 0.4, d20: 0.3 }[kind] || 0.34;
  const long = label.length > 1;
  ctx.font = `700 ${Math.round(size * scale * (long ? 0.85 : 1))}px Cinzel, "EB Garamond", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colors.ink;
  const cy = kind === 'd4' ? size * 0.56 : kind === 'd10' || kind === 'd100' ? size * 0.44 : size * 0.52;
  ctx.fillText(label, size / 2, cy);
  if (label === '6' || label === '9') {
    ctx.fillRect(size * 0.4, cy + size * scale * 0.42, size * 0.2, Math.max(2, size * 0.03));
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
// Quique: 3 batidas decrescentes (altura em Z na direção da câmera).
function bounce(t) {
  const hops = [[0, 0.45, 1], [0.45, 0.72, 0.28], [0.72, 0.9, 0.08], [0.9, 1, 0.02]];
  for (const [a, b, h] of hops) {
    if (t <= b) { const u = (t - a) / (b - a); return h * 4 * u * (1 - u); }
  }
  return 0;
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

/**
 * Cria o palco num <canvas>. Retorna { play, dispose }.
 * play(dice, { duration, tone }) → Promise que resolve quando todos param.
 *   dice: [{ kind: 'd20'|'d10'|'d100'..., label: '17', dimmed?: bool }]
 */
export function createDiceStage(canvas) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 12);
  scene.add(new AmbientLight(0xffffff, 1.2));
  const key = new DirectionalLight(0xfff1d6, 2.2);
  key.position.set(-3, 5, 8);
  scene.add(key);
  const rim = new DirectionalLight(0xd6b064, 0.8);
  rim.position.set(4, -3, 4);
  scene.add(rim);

  let group = new Group();
  scene.add(group);
  let raf = 0;
  let disposed = false;
  const owned = []; // materiais/texturas para liberar

  const resize = () => {
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 200;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { resize(); renderer.render(scene, camera); }) : null;
  ro?.observe(canvas);

  const clear = () => {
    cancelAnimationFrame(raf);
    scene.remove(group);
    for (const o of owned.splice(0)) o.dispose?.();
    group = new Group();
    scene.add(group);
  };

  function layout(n) {
    const aspect = camera.aspect || 1;
    const perRow = Math.max(1, Math.min(n, aspect < 0.9 ? 3 : 6));
    const rows = Math.ceil(n / perRow);
    const gap = 2.5;
    const slots = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / perRow);
      const inRow = r === rows - 1 ? n - r * perRow : perRow;
      const col = i % perRow;
      slots.push(new Vector3((col - (inRow - 1) / 2) * gap, ((rows - 1) / 2 - r) * gap, 0));
    }
    // Afasta a câmera até caber tudo (com folga).
    const halfW = ((Math.min(n, perRow) - 1) / 2) * gap + 1.4;
    const halfH = ((rows - 1) / 2) * gap + 1.4;
    const vFov = (camera.fov * Math.PI) / 180;
    const distH = halfH / Math.tan(vFov / 2);
    const distW = halfW / (Math.tan(vFov / 2) * aspect);
    camera.position.z = Math.max(7, distH, distW) + 1.5;
    return slots;
  }

  function play(dice, { duration = 1500, tone = null } = {}) {
    if (disposed) return Promise.resolve();
    clear();
    resize();
    const slots = layout(dice.length);
    const items = dice.map((d, i) => {
      const model = dieModel(d.kind);
      const colors = { ...(PALETTE[d.kind] || PALETTE.d20), ...(tone && !d.dimmed ? TONES[tone] : {}) };
      const mats = model.faces.map(f => {
        const map = faceTexture(f.label, colors, d.kind);
        const m = new MeshStandardMaterial({
          map, roughness: 0.45, metalness: 0.15, flatShading: true,
          transparent: !!d.dimmed, opacity: d.dimmed ? 0.35 : 1,
          emissive: new Color(colors.glow || '#000000'), emissiveIntensity: colors.glow ? 0.6 : 0,
        });
        owned.push(map, m);
        return m;
      });
      const mesh = new Mesh(model.geometry, mats);
      const edges = new LineSegments(new EdgesGeometry(model.geometry, 20),
        new LineBasicMaterial({ color: colors.edge, transparent: true, opacity: d.dimmed ? 0.3 : 0.9 }));
      owned.push(edges.geometry, edges.material);
      mesh.add(edges);
      const target = orientationFor(model, d.label) || new Quaternion();
      // Pequena inclinação final para dar volume (continua lendo a face).
      const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, -0.6, 0).normalize(), 0.22);
      const final = tilt.multiply(target);
      const axis = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      const spins = (3 + Math.random() * 2) * Math.PI * 2;
      const from = new Vector3((Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 3), -4 - Math.random() * 3, 0);
      const delay = i * 90;
      group.add(mesh);
      return { mesh, final, axis, spins, from, to: slots[i], delay };
    });

    return new Promise((resolve) => {
      const t0 = performance.now();
      const tmp = new Quaternion();
      const step = (now) => {
        if (disposed) return resolve();
        let done = true;
        for (const it of items) {
          const t = Math.min(1, Math.max(0, (now - t0 - it.delay) / duration));
          if (t < 1) done = false;
          const e = easeOutCubic(t);
          it.mesh.position.lerpVectors(it.from, it.to, e);
          it.mesh.position.z = bounce(t) * 3.2;
          tmp.setFromAxisAngle(it.axis, it.spins * (1 - e));
          it.mesh.quaternion.copy(it.final).premultiply(tmp);
        }
        renderer.render(scene, camera);
        if (done) { resolve(); return; }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
  }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
    ro?.disconnect();
    clear();
    renderer.dispose();
    renderer.forceContextLoss?.();
  }

  return { play, dispose, render: () => renderer.render(scene, camera) };
}
