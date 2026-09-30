// Geometria dos dados 3D + orientação final para uma face escolhida.
//
// O dado NÃO sorteia nada: recebemos o valor pronto (servidor, rolagem do
// mestre, dado físico) e calculamos a rotação que deixa a face com esse
// número virada para a câmera (+Z) e "em pé" (+Y). A animação só gira em
// volta dessa orientação e termina exatamente nela.
//
// Sem DOM aqui — roda em node nos testes (three é só matemática).
import {
  BufferGeometry, Float32BufferAttribute, Vector3, Matrix4, Quaternion,
  TetrahedronGeometry, BoxGeometry, OctahedronGeometry,
  DodecahedronGeometry, IcosahedronGeometry,
} from 'three';
import { faceLabels } from './dice-math.js';

const EPS = 1e-4;

/** Trapezoedro pentagonal (d10). Faces em "pipa" (2 triângulos cada). */
function d10Geometry(radius = 1) {
  const top = new Vector3(0, 0, radius);
  const bottom = new Vector3(0, 0, -radius);
  const ring = [];
  // Altura do anel que deixa as pipas planas (≈ 0.1056 · raio).
  const h = radius * 0.10557;
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI * 2) / 10;
    ring.push(new Vector3(Math.cos(a) * radius, Math.sin(a) * radius, i % 2 === 0 ? h : -h));
  }
  const tris = [];
  for (let i = 0; i < 10; i += 2) {
    // Pipa de cima: topo, anel[i], anel[i+1], anel[i+2]
    const a = ring[i], b = ring[(i + 1) % 10], c = ring[(i + 2) % 10];
    tris.push([top, a, b], [top, b, c]);
  }
  for (let i = 1; i < 10; i += 2) {
    const a = ring[i], b = ring[(i + 1) % 10], c = ring[(i + 2) % 10];
    tris.push([bottom, b, a], [bottom, c, b]);
  }
  const pos = [];
  for (const t of tris) {
    // garante winding para fora
    const n = new Vector3().subVectors(t[1], t[0]).cross(new Vector3().subVectors(t[2], t[0]));
    const centroid = new Vector3().add(t[0]).add(t[1]).add(t[2]).divideScalar(3);
    const ordered = n.dot(centroid) >= 0 ? t : [t[0], t[2], t[1]];
    for (const v of ordered) pos.push(v.x, v.y, v.z);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}

function baseGeometry(kind, radius) {
  switch (kind) {
    case 'd4': return new TetrahedronGeometry(radius * 1.15, 0);
    case 'd6': { const s = radius * 1.2; return new BoxGeometry(s, s, s); }
    case 'd8': return new OctahedronGeometry(radius, 0);
    case 'd10':
    case 'd100': return d10Geometry(radius);
    case 'd12': return new DodecahedronGeometry(radius * 1.02, 0);
    case 'd20':
    default: return new IcosahedronGeometry(radius * 1.05, 0);
  }
}

/** Agrupa triângulos por normal → faces lógicas. */
function groupFaces(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.getAttribute('position');
  const faces = [];
  for (let i = 0; i < p.count; i += 3) {
    const a = new Vector3().fromBufferAttribute(p, i);
    const b = new Vector3().fromBufferAttribute(p, i + 1);
    const c = new Vector3().fromBufferAttribute(p, i + 2);
    const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).normalize();
    const centroid = new Vector3().add(a).add(b).add(c).divideScalar(3);
    if (n.dot(centroid) < 0) n.negate();
    let face = faces.find(f => f.normal.dot(n) > 1 - 0.02);
    if (!face) { face = { normal: n.clone(), tris: [], verts: [] }; faces.push(face); }
    face.tris.push([a, b, c]);
    for (const v of [a, b, c]) if (!face.verts.some(w => w.distanceTo(v) < EPS)) face.verts.push(v);
  }
  for (const f of faces) {
    // Normal média (pipas do d10 são quase-planas).
    const sum = new Vector3();
    for (const [a, b, c] of f.tris) sum.add(new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)));
    f.normal.copy(sum.normalize());
    f.center = f.verts.reduce((acc, v) => acc.add(v), new Vector3()).divideScalar(f.verts.length);
  }
  return faces;
}

/** Direção "para cima" do número na face. */
function faceUp(kind, face) {
  const n = face.normal;
  if (kind === 'd6') {
    const axis = Math.abs(n.y) > 0.9 ? new Vector3(0, 0, -Math.sign(n.y)) : new Vector3(0, 1, 0);
    return axis.sub(n.clone().multiplyScalar(axis.dot(n))).normalize();
  }
  // Vértice mais distante do centro (ápice da pipa no d10; um vértice nos demais).
  let best = face.verts[0], bestD = -1;
  for (const v of face.verts) {
    const d = v.distanceTo(face.center);
    if (d > bestD + EPS) { bestD = d; best = v; }
  }
  const up = new Vector3().subVectors(best, face.center);
  up.sub(n.clone().multiplyScalar(up.dot(n)));
  return up.normalize();
}

/** Atribui rótulos de forma que faces opostas somem n+1 (como dados reais). */
function assignLabels(kind, faces) {
  const labels = faceLabels(kind);
  const n = faces.length;
  const used = new Array(n).fill(false);
  const pairs = [];
  for (let i = 0; i < n; i++) {
    if (used[i]) continue;
    used[i] = true;
    let opp = -1;
    for (let j = 0; j < n; j++) {
      if (!used[j] && faces[j].normal.dot(faces[i].normal) < -1 + 0.05) { opp = j; break; }
    }
    if (opp >= 0) used[opp] = true;
    pairs.push([i, opp]);
  }
  let lo = 0, hi = labels.length - 1;
  for (const [i, j] of pairs) {
    faces[i].label = labels[lo++];
    if (j >= 0) faces[j].label = labels[hi--];
  }
  // d4 (sem opostos): sobra sequencial
  for (const f of faces) if (f.label == null) f.label = labels[lo++];
}

/**
 * Constrói a geometria final com grupos por face (materialIndex = índice da face)
 * e UVs centrados em cada face. Retorna { geometry, faces: [{label, normal, up, ...}] }.
 */
export function buildDie(kind, radius = 1) {
  const faces = groupFaces(baseGeometry(kind, radius));
  assignLabels(kind, faces);
  const pos = [], nor = [], uv = [];
  const geometry = new BufferGeometry();
  let start = 0;
  faces.forEach((f, idx) => {
    f.up = faceUp(kind, f);
    f.right = new Vector3().crossVectors(f.up, f.normal).normalize();
    const span = Math.max(...f.verts.map(v => v.distanceTo(f.center))) * 1.0;
    for (const tri of f.tris) {
      for (const v of tri) {
        pos.push(v.x, v.y, v.z);
        nor.push(f.normal.x, f.normal.y, f.normal.z);
        const d = new Vector3().subVectors(v, f.center);
        uv.push(0.5 + d.dot(f.right) / (2 * span), 0.5 + d.dot(f.up) / (2 * span));
      }
    }
    const count = f.tris.length * 3;
    geometry.addGroup(start, count, idx);
    start += count;
  });
  geometry.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.computeBoundingSphere();
  return { geometry, faces, kind };
}

/** Quaternion que põe a face `label` virada para +Z com o número em pé (+Y). */
export function orientationFor(die, label) {
  const face = die.faces.find(f => f.label === String(label));
  if (!face) return null;
  // Base da face (right, up, normal) → base do mundo (X, Y, Z): R = Bᵀ
  const m = new Matrix4().makeBasis(face.right, face.up, face.normal).transpose();
  return new Quaternion().setFromRotationMatrix(m);
}

/** Qual rótulo está virado para +Z depois de aplicar `quat` (para testes). */
export function labelFacing(die, quat, dir = new Vector3(0, 0, 1)) {
  let best = null, bestDot = -2;
  for (const f of die.faces) {
    const n = f.normal.clone().applyQuaternion(quat);
    const d = n.dot(dir);
    if (d > bestDot) { bestDot = d; best = f.label; }
  }
  return best;
}
