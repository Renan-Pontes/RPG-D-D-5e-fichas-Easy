// Listas da folha "Mostrar na Tela" (Imagens · Cenas · Texto · Mapa), sem React.
// Testado em tests/show-model.test.js.
//
// Imagens: "Da cena agora" primeiro (a imagem da sala em jogo e os cartões
// ligados a ela), depois TODOS os cartões (os ocultos também: com imagem vão
// como "só a imagem"; sem imagem, como "só o nome"), mais as imagens das outras
// salas da aventura em jogo. Busca pelo nome.
import { sceneEntries } from '../play/scene-model.js';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const hasImage = (e) => !!(e?.imageVer || e?.imageUrl);

/**
 * @param {{entries?: object[], adventure?: object|null, node?: object|null, query?: string, limit?: number}} p
 * @returns {{ now: Row[], all: Row[], more: number }}
 *   Row = {key, type:'entry'|'room', entry?, advId?, nodeId?, name, image?: string}
 */
export function imageRows({ entries = [], adventure = null, node = null, query = '', limit = 60 } = {}) {
  const q = norm(query.trim());
  const match = (name) => !q || norm(name).includes(q);
  const now = [];
  const used = new Set();
  if (node?.image && adventure && match(node.name)) {
    now.push({ key: `room-${node.id}`, type: 'room', advId: adventure.id, nodeId: node.id, name: node.name, image: node.image });
    used.add(`room-${node.id}`);
  }
  if (node) {
    for (const e of sceneEntries({ entries, node, plan: null }).scene) {
      if (!match(e.name)) continue;
      now.push({ key: `e-${e.id}`, type: 'entry', entry: e, name: e.name });
      used.add(`e-${e.id}`);
    }
  }
  const all = [];
  // Com imagem primeiro (é a aba das imagens); a ordem do Mundo dentro de cada grupo.
  const sorted = [...entries].sort((a, b) => Number(hasImage(b)) - Number(hasImage(a)));
  for (const e of sorted) {
    if (used.has(`e-${e.id}`) || !match(e.name)) continue;
    all.push({ key: `e-${e.id}`, type: 'entry', entry: e, name: e.name });
  }
  for (const n of adventure?.data?.nodes || []) {
    if (!n?.image || used.has(`room-${n.id}`) || !match(n.name)) continue;
    all.push({ key: `room-${n.id}`, type: 'room', advId: adventure.id, nodeId: n.id, name: n.name, image: n.image });
  }
  return { now, all: all.slice(0, limit), more: Math.max(0, all.length - limit) };
}

/** Primeira linha do texto da cena do plano (o que a Tela mostra como nome). */
export function planSceneName(scene) {
  return String(scene?.text || '').trim().split('\n')[0].trim();
}

/**
 * Cenas: a sala em jogo ("cena agora") primeiro; depois as do plano da sessão.
 * Row = {key, target, name, sub?, now?, done?}
 */
export function sceneRows({ plan = null, adventure = null, node = null } = {}) {
  const rows = [];
  let nowKey = null;
  if (adventure && node) {
    nowKey = `${adventure.id}:${node.id}`;
    rows.push({ key: `room-${node.id}`, now: true, name: node.name, sub: adventure.name,
      target: { kind: 'scene', advId: adventure.id, nodeId: node.id } });
  }
  for (const s of plan?.scenes || []) {
    const name = planSceneName(s);
    if (!name) continue;
    const ref = s.nodeRef;
    if (ref && nowKey === `${ref.adventureId}:${ref.nodeId}`) continue;   // a mesma sala: já é a 1ª
    rows.push({ key: `plan-${s.id}`, name, done: !!s.done, target: { kind: 'scene', sceneId: s.id } });
  }
  return rows;
}

/** Mapas de lugar do Mundo (cartões com mapa e imagem). */
export function mapRows(entries = []) {
  return (entries || []).filter(e => e?.isMap && hasImage(e)).map(e => ({ key: `map-${e.id}`, entry: e, name: e.name }));
}

export const TEXT_MAX = 1000;
export const CAPTION_MAX = 140;
