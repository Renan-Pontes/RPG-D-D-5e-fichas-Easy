/**
 * Folha da Cena (Preparar › Plano, §3.3) — lógica pura: de onde vem cada dado da cena,
 * o que a paleta "Pôr nesta cena" já tem, ligar e desligar uma sala, a linha da cena no
 * Plano com os ícones escritos, a dificuldade do ⚔ e os momentos que combinam com a cena.
 * Sem React; testável em node (tests/scene-model.test.js).
 *
 * Um lugar por dado (a regra que resolve "cena × sala"):
 *   cena solta  → tudo no plano (scene.read, show, refs, fight, check…);
 *   cena ligada → ler, imagem, quem aparece, combate e teste moram na SALA
 *                 (node.readAloud, refs, encounter, checks): a folha edita a sala.
 *   O momento, o "Mostrar ao começar", o que acontece e as notas ficam sempre no plano, e
 *   também o "sem imagem" da cena ligada (`showOff`): tirar a imagem não tira o cartão da sala.
 * A folha vê os dois casos com os mesmos blocos (sceneView) e grava pelo mesmo caminho
 * (writeBlock → {scene, node}: o que vai ao plano e o que vai à sala).
 */
import { checkLabel } from '../checks/check-logic.js';
import { chance, pct } from '../group/party-best.js';
import { DIFFICULTY_LABEL } from '../combat/encounter.js';
import { nodeEncounter } from './prep-graph.js';
import { sceneParts } from './next-session.js';

const tt = (lang, pt, en) => (lang === 'en' ? en : pt);
const filled = (s) => typeof s === 'string' && s.trim().length > 0;

/** A paleta "Pôr nesta cena", na ordem da tela. `short` é o rótulo do chip; `label`, o do bloco. */
export const SCENE_BLOCKS = [
  { id: 'read',  icon: '📜', short: ['Ler', 'Read'],                 label: ['Ler em voz alta', 'Read aloud'] },
  { id: 'show',  icon: '📺', short: ['Imagem', 'Image'],             label: ['Imagem para a Tela', 'Image for the screen'] },
  { id: 'refs',  icon: '🎭', short: ['Quem aparece', 'Who shows up'], label: ['Quem aparece', 'Who shows up'] },
  { id: 'fight', icon: '⚔',  short: ['Combate', 'Combat'],           label: ['Combate', 'Combat'] },
  { id: 'check', icon: '🎯', short: ['Teste', 'Check'],              label: ['Teste', 'Check'] },
  { id: 'spots', icon: '★',  short: ['Momento', 'Moment'],           label: ['Momento', 'Moment'] },
  { id: 'notes', icon: '🔒', short: ['Notas', 'Notes'],              label: ['Notas', 'Notes'] },
];
export const blockLabel = (id, lang, short = false) => {
  const b = SCENE_BLOCKS.find(x => x.id === id);
  return b ? tt(lang, ...(short ? b.short : b.label)) : id;
};

/** Os tetos da cena (world_rules.SCENE_POCKETS) e da sala (views_adventures._clean_node). */
export const SCENE_LIMITS = {
  what: 500, read: 1000, notes: 1000, refs: 8, fight: 6, count: 20, spots: 4, checks: 1,
  snapBytes: 8000, snaps: 4, snapDesc: 300,
  nodeRead: 5000, nodeNotes: 10000, nodeRefs: 20, nodeFight: 30, nodeCount: 50, nodeChecks: 20,
};
/** As CDs de um toque do bloco 🎯; as outras (1 a 40, como a sala e o servidor aceitam) vão no "Outra…". */
export const DC_CHIPS = [10, 12, 13, 15, 18, 20];
export const DC_RANGE = { min: 1, max: 40 };
/** A CD digitada → inteiro de 1 a 40, ou null (vazio, letra, fora da faixa). */
export function parseDc(v) {
  const s = String(v ?? '').trim();
  if (!/^\d{1,2}$/.test(s)) return null;
  const n = Number(s);
  return n >= DC_RANGE.min && n <= DC_RANGE.max ? n : null;
}
/** A CD que não é um dos chips (14, 11, 25…): o chip "Outra…" a mostra marcada ("14 ✎"). */
export const customDc = (dc) => (Number.isInteger(dc) && !DC_CHIPS.includes(dc) ? dc : null);

// ---------------------------------------------------------------- testes: cena ↔ sala
/** Teste da sala ({skill: 'perception' | 'save:dex' | 'ability:str', dc, note, dcHidden}) → o da cena. */
export function nodeCheckToCheck(c) {
  const skill = String(c?.skill || '');
  if (!skill) return null;
  const [head, rest] = skill.includes(':') ? skill.split(':') : [null, skill];
  const kind = head === 'save' ? 'save' : head === 'ability' ? 'ability' : 'skill';
  const out = { kind, key: head ? rest : skill };
  if (Number.isInteger(c.dc)) out.dc = c.dc;
  if (c.dcHidden) out.dcHidden = true;
  if (filled(c.note)) out.note = c.note;
  return out;
}
/** O teste da cena → o da sala (a sala guarda o tipo no prefixo de `skill`). */
export function checkToNodeCheck(c) {
  if (!c?.key) return null;
  const out = { skill: c.kind === 'save' ? `save:${c.key}` : c.kind === 'ability' ? `ability:${c.key}` : c.key, dc: Number.isInteger(c.dc) ? c.dc : null, note: c.note || '' };
  if (c.dcHidden) out.dcHidden = true;
  return out;
}
const cleanCheck = (c) => {
  if (!c?.key) return null;
  const out = { kind: c.kind || 'skill', key: c.key };
  if (Number.isInteger(c.dc)) out.dc = c.dc;
  if (c.dcHidden) out.dcHidden = true;
  return out;
};

// ---------------------------------------------------------------- combate: cena ↔ sala
/**
 * Linha do encontro da sala ({monsterId, name, crNum, count, snapshot?}) → a do ⚔ da cena.
 * `raw`: a folha mostra e regrava a própria sala (o monstro personalizado vai inteiro, até os
 * 40 KB da aventura); sem ele, é para guardar na cena (o corte de 8 KB; maior fica só o nome).
 */
export function encounterToFight(e, { limit = SCENE_LIMITS.count, raw = false } = {}) {
  const out = { monsterId: e?.monsterId || '', name: e?.name || e?.monsterId || '?', cr: Number.isFinite(e?.crNum) ? e.crNum : null,
    count: Math.max(1, Math.min(limit, parseInt(e?.count, 10) || 1)) };
  if (e?.snapshot) {
    const snap = raw ? e.snapshot : sceneSnap(e.snapshot);
    if (raw || snapSize(snap) <= SCENE_LIMITS.snapBytes) out.snap = snap;
  }
  return out;
}
/** A linha do ⚔ da cena → a do encontro da sala. */
export function fightToEncounter(f) {
  const out = { monsterId: f?.monsterId || '', name: f?.name || f?.monsterId || '?', count: Math.max(1, parseInt(f?.count, 10) || 1) };
  if (Number.isFinite(f?.cr)) out.crNum = f.cr;
  if (f?.snap) out.snapshot = f.snap;
  return out;
}

// ---------------------------------------------------------------- "meus monstros" na cena
const SNAP_TEXTS = ['desc', 'description', 'lore', 'notes'];
const snapText = (v, max) => {
  if (typeof v === 'string') return v.slice(0, max);
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return Object.fromEntries(Object.entries(v).filter(([k, x]) => (k === 'pt' || k === 'en') && typeof x === 'string').map(([k, x]) => [k, x.slice(0, max)]));
  }
  return v;
};
function snapValue(v, max) {
  if (typeof v === 'string') return v.startsWith('data:') ? undefined : v;
  if (Array.isArray(v)) return v.slice(0, 40).map(x => snapValue(x, max)).filter(x => x !== undefined);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) {
      const y = SNAP_TEXTS.includes(k) ? snapText(x, max) : snapValue(x, max);
      if (y !== undefined) out[k] = y;
    }
    return out;
  }
  return v;
}
/**
 * O monstro personalizado como a cena o guarda (o mesmo corte do servidor,
 * world_rules._scene_snap): sem imagens e com as descrições em 300 caracteres.
 */
export const sceneSnap = (m) => (m && typeof m === 'object' ? snapValue(m, SCENE_LIMITS.snapDesc) : null);
export const snapSize = (snap) => JSON.stringify(snap ?? null).length;
/** Quantos "meus monstros" as cenas do plano já guardam (fora a cena `exceptId`). */
export function snapCount(plan, exceptId = null) {
  let n = 0;
  for (const s of plan?.scenes || []) if (s.id !== exceptId) for (const f of s.fight || []) if (f?.snap) n++;
  return n;
}

/**
 * O monstro que o Escolher monstro devolveu, pronto para o ⚔ da cena. Do catálogo: só o id
 * (o app acha o resto). "Meus monstros": com o snap, se couber (8 KB, 4 no plano); senão
 * `error` com o código que o servidor daria (a folha escreve o motivo e não põe).
 * `inScene` = snaps desta cena que já estão na lista.
 */
export function fightEntry(monster, count, { lang = 'pt', plan = null, sceneId = null, inScene = 0, linked = false } = {}) {
  const name = typeof monster?.name === 'object' ? (monster.name?.[lang] || monster.name?.en || monster.id) : (monster?.name || monster?.id);
  const cr = Number.isFinite(monster?.crNum) ? monster.crNum : null;
  const limit = linked ? SCENE_LIMITS.nodeCount : SCENE_LIMITS.count;
  const entry = { monsterId: monster?.id || '', name: name || '?', cr, count: Math.max(1, Math.min(limit, parseInt(count, 10) || 1)) };
  if (!monster?.custom) return { entry };
  if (linked) return { entry: { ...entry, snap: monster } };   // a sala aceita até 40 KB (MAX_SNAPSHOT_BYTES)
  const snap = sceneSnap(monster);
  if (snapSize(snap) > SCENE_LIMITS.snapBytes) return { entry: null, error: 'scene_monster_too_large' };
  if (snapCount(plan, sceneId) + inScene >= SCENE_LIMITS.snaps) return { entry: null, error: 'too_many_scene_monsters' };
  return { entry: { ...entry, snap } };
}

// ---------------------------------------------------------------- a cena vista pela folha
/**
 * O primeiro cartão com imagem de uma lista de ids (a imagem da cena ligada sai dos
 * cartões da sala). `world` = lista leve do Mundo.
 */
export function firstImageRef(ids, world) {
  const byId = new Map((world || []).map(e => [e.id, e]));
  return (ids || []).find(id => byId.get(id)?.imageVer) || null;
}

/**
 * O que a folha mostra de uma cena — os mesmos campos para a cena solta e a ligada.
 * `node` = a sala (GET …/node/:id, sem a imagem) quando a cena está ligada; sem ela
 * (ainda carregando, sala apagada) a cena ligada mostra só o que é do plano.
 * → {linked, name, notesInText, what, read, show, showFrom, refs, fight, checks, spots, notes, showOnStart}
 *   showFrom: 'scene' | 'ref' (o 1º cartão da sala com imagem) | 'room' (a imagem da sala) | null
 *   Cena ligada com `scene.showOff` (o mestre tirou a imagem): sem imagem, e os cartões
 *   continuam na sala.
 */
export function sceneView(scene, node = null, { world = [] } = {}) {
  const s = scene || {};
  const { name, notes: notesInText } = sceneParts(s.text);
  const linked = !!s.nodeRef;
  const base = {
    linked, name, notesInText,
    what: typeof s.what === 'string' ? s.what : '',
    spots: Array.isArray(s.spots) ? s.spots : [],
    notes: typeof s.notes === 'string' ? s.notes : '',
    showOnStart: s.showOnStart !== false,
    showOff: linked && !!s.showOff,
  };
  if (!linked) {
    return {
      ...base,
      read: typeof s.read === 'string' ? s.read : '',
      show: s.show && s.show.kind ? s.show : null, showFrom: s.show && s.show.kind ? 'scene' : null,
      refs: Array.isArray(s.refs) ? s.refs : [],
      fight: Array.isArray(s.fight) ? s.fight : [],
      checks: s.check && s.check.key ? [s.check] : [],
    };
  }
  const n = node || {};
  const refs = Array.isArray(n.refs) ? n.refs : [];
  const imgRef = firstImageRef(refs, world);
  let show = null; let showFrom = null;
  if (s.showOff) { /* o mestre tirou a imagem da cena: nenhuma vai à Tela */ }
  else if (imgRef) { show = { kind: 'entry', id: imgRef }; showFrom = 'ref'; }
  else if (n.hasImage || n.image) { show = { kind: 'node', advId: s.nodeRef.adventureId, nodeId: s.nodeRef.nodeId }; showFrom = 'room'; }
  const read = typeof n.readAloud === 'string' ? n.readAloud : '';
  return {
    ...base,
    // a sala leve do Plano (…/nodes) só diz se há texto (`hasRead`), sem o texto
    read, hasRead: filled(read) || !!n.hasRead,
    show, showFrom, refs,
    fight: (n.encounter || []).map(e => encounterToFight(e, { limit: SCENE_LIMITS.nodeCount, raw: true })),
    checks: (n.checks || []).map(nodeCheckToCheck).filter(Boolean),
  };
}

/** Os blocos que já existem (têm conteúdo): o "✓" do chip e os que a folha abre ao entrar. */
export function presentBlocks(view) {
  const out = [];
  if (filled(view?.read)) out.push('read');
  if (view?.show) out.push('show');
  if (view?.refs?.length) out.push('refs');
  if (view?.fight?.length) out.push('fight');
  if (view?.checks?.length) out.push('check');
  if (view?.spots?.length) out.push('spots');
  if (filled(view?.notes)) out.push('notes');
  return out;
}

/** O interruptor "Mostrar ao começar" só aparece quando há o que mostrar: imagem ou texto para ler. */
export const showOnStartVisible = (view) => !!(view?.show || filled(view?.read));

/**
 * Gravar um bloco: o que vai ao plano (`scene`) e o que vai à sala (`node`). Na cena
 * ligada, ler/imagem/quem aparece/combate/teste vão à sala; o resto, sempre ao plano.
 * Tirar um bloco = gravar o vazio ('' · [] · null): o servidor guarda o vazio e o bolso
 * some (o que não vem fica, pelo merge por id).
 *   key 'show': value {kind:'entry', id} | {kind:'node'} | null. Na cena ligada, escolher
 *   um cartão o põe no 1º lugar dos cartões da sala (`refs` = os de agora; se ele já é o
 *   1º com imagem pelo `world`, a sala não muda); tirar NÃO mexe na sala: grava no plano
 *   `showOff` (os cartões continuam em 🎭 Quem aparece). `showOff` = o de agora.
 *   key 'check': value = a lista de testes (a cena solta guarda só o 1º).
 * → {scene?: patch, node?: patch} | null (nada a gravar)
 */
export function writeBlock(key, value, { linked = false, refs = [], showFrom = null, show = null, showOff = false, world = null } = {}) {
  if (key === 'what' || key === 'spots' || key === 'notes' || key === 'showOnStart') return { scene: { [key]: value } };
  if (!linked) {
    if (key === 'check') return { scene: { check: cleanCheck((value || [])[0]) } };
    if (key === 'show') return { scene: { show: value && value.kind ? value : null } };
    return { scene: { [key]: value } };
  }
  if (key === 'read') return { node: { readAloud: String(value ?? '').slice(0, SCENE_LIMITS.nodeRead) } };
  if (key === 'refs') return { node: { refs: [...new Set(value || [])].slice(0, SCENE_LIMITS.nodeRefs) } };
  if (key === 'fight') return { node: { encounter: (value || []).slice(0, SCENE_LIMITS.nodeFight).map(fightToEncounter) } };
  if (key === 'check') return { node: { checks: (value || []).slice(0, SCENE_LIMITS.nodeChecks).map(checkToNodeCheck).filter(Boolean) } };
  if (key === 'show') {
    const cur = refs || [];
    const on = showOff ? { scene: { showOff: false } } : {};
    if (value?.kind === 'entry') {
      if (world && cur.includes(value.id) && firstImageRef(cur, world) === value.id) return showOff ? on : null;
      return { ...on, node: { refs: [value.id, ...cur.filter(id => id !== value.id)].slice(0, SCENE_LIMITS.nodeRefs) } };
    }
    if (value?.kind === 'node') return showOff ? on : null;   // a imagem própria da sala volta
    return show || showFrom ? { scene: { showOff: true } } : null;
  }
  return null;
}

// ---------------------------------------------------------------- ligar e desligar uma sala
/** A cena solta tem algo que, ligada, passaria a morar na sala? (então o app pergunta) */
export const hasRoomPockets = (scene) => {
  const v = sceneView({ ...scene, nodeRef: null });
  return filled(v.read) || !!v.show || v.refs.length > 0 || v.fight.length > 0 || v.checks.length > 0;
};

/**
 * "Levar o que está na cena para a sala?" — [Levar] (`carry`) junta à sala o texto
 * (depois do dela), a imagem (1º cartão), os cartões, o combate e o teste; [Usar só o da
 * sala] não leva nada. Nos dois casos os bolsos da cena saem (o dado mora num lugar só).
 * `node` = a sala de agora (sem nada, se ainda não chegou). → {scene, node|null}
 */
export function linkScene(scene, ref, node = null, { carry = true } = {}) {
  const clear = { nodeRef: ref, read: '', show: null, refs: [], fight: [], check: null, ...(scene?.showOff ? { showOff: false } : {}) };
  if (!carry) return { scene: clear, node: null };
  const v = sceneView({ ...scene, nodeRef: null });
  const n = node || {};
  const patch = {};
  if (filled(v.read)) patch.readAloud = (filled(n.readAloud) ? `${n.readAloud}\n\n${v.read}` : v.read).slice(0, SCENE_LIMITS.nodeRead);
  const refs = [...(v.show?.kind === 'entry' ? [v.show.id] : []), ...v.refs, ...(n.refs || [])];
  if (refs.length > (n.refs || []).length) patch.refs = [...new Set(refs)].slice(0, SCENE_LIMITS.nodeRefs);
  if (v.fight.length) patch.encounter = [...(n.encounter || []), ...v.fight.map(fightToEncounter)].slice(0, SCENE_LIMITS.nodeFight);
  if (v.checks.length) {
    const have = new Set((n.checks || []).map(c => c.skill));
    const add = v.checks.map(checkToNodeCheck).filter(c => c && !have.has(c.skill));
    if (add.length) patch.checks = [...(n.checks || []), ...add].slice(0, SCENE_LIMITS.nodeChecks);
  }
  return { scene: clear, node: Object.keys(patch).length ? patch : null };
}

/**
 * Desligar: "Copiar o que a sala tem para a cena?" — [Copiar] (`copy`) traz o texto, a
 * imagem (o 1º cartão com imagem, ou a imagem da sala), os cartões, o combate e o 1º teste
 * para a cena (nos tetos da cena); [Não] só desliga. `snapsLeft` = quantos "meus
 * monstros" o plano ainda guarda (4 no plano): os outros vêm só com o nome. → o patch da cena.
 */
export function unlinkScene(scene, node, { copy = true, world = [], snapsLeft = SCENE_LIMITS.snaps } = {}) {
  const off = scene?.showOff ? { showOff: false } : {};
  if (!copy || !node) return { nodeRef: null, ...off };
  const v = sceneView(scene, node, { world });
  let left = Math.max(0, snapsLeft);
  const fight = v.fight.slice(0, SCENE_LIMITS.fight).map(f => {
    const out = { ...f, count: Math.min(SCENE_LIMITS.count, f.count) };
    if (out.snap) {
      const snap = sceneSnap(out.snap);
      if (left > 0 && snapSize(snap) <= SCENE_LIMITS.snapBytes) { out.snap = snap; left -= 1; } else delete out.snap;
    }
    return out;
  });
  return {
    nodeRef: null, ...off,
    read: v.read.slice(0, SCENE_LIMITS.read),
    show: v.show,
    refs: v.refs.slice(0, SCENE_LIMITS.refs),
    fight,
    check: cleanCheck(v.checks[0]),
  };
}

/** O que a sala tem que a cena trocaria ao desligar (para perguntar "Copiar…?" só quando há). */
export const roomHasPockets = (node) => !!node && (filled(node.readAloud) || (node.refs || []).length > 0 || (node.encounter || []).length > 0
  || (node.checks || []).length > 0 || !!(node.hasImage || node.image));

// ---------------------------------------------------------------- a sala leve (Plano)
/** A linha leve da sala (o mesmo de views_adventures._node_light), para o servidor antigo. */
export function lightNode(n) {
  return {
    id: n?.id, name: n?.name || '?', kind: n?.kind || 'room', tags: n?.tags || [], refs: n?.refs || [],
    hasImage: !!(n?.image || n?.hasImage), hasRead: filled(n?.readAloud) || !!n?.hasRead,
    encounter: (n?.encounter || []).map(e => ({ monsterId: e.monsterId, name: e.name, crNum: e.crNum, count: e.count })),
    checks: n?.checks || [],
  };
}
/** A sala sem a imagem (o mesmo do GET …/node/:id), para o servidor antigo. */
export function nodeWithoutImage(n) {
  if (!n) return null;
  const { image, ...rest } = n;
  return { ...rest, hasImage: !!image };
}

// ---------------------------------------------------------------- momentos ligados à cena
/** Os momentos guardam a cena pelo id do personagem e do momento: "14:m2". */
export const spotKey = (charId, momentId) => `${charId}:${momentId}`;
export function parseSpot(key) {
  const m = /^(\d+):([A-Za-z0-9_-]+)$/.exec(String(key || ''));
  return m ? { charId: Number(m[1]), momentId: m[2] } : null;
}
/**
 * Os momentos desta cena: os de `scene.spots` e os que apontam a cena (`m.plan`, gravado
 * pelo "→ Cena" do Raio-X), sem repetir. `spotlights` = partyInsights.spotlights.
 * → [{key, charId, moment}]
 */
export function sceneMoments(scene, spotlights = {}) {
  const out = [];
  const seen = new Set();
  const push = (charId, moment) => {
    const key = spotKey(charId, moment.id);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ key, charId: Number(charId), moment });
  };
  for (const k of scene?.spots || []) {
    const p = parseSpot(k);
    const m = p && (spotlights?.[String(p.charId)] || []).find(x => x.id === p.momentId);
    if (m) push(p.charId, m);
  }
  for (const [cid, list] of Object.entries(spotlights || {})) {
    for (const m of list || []) if (m?.plan && m.plan === scene?.id) push(cid, m);
  }
  return out;
}

const COMBAT_AUTO = /^(axis:(melee|dmg|ranged|mit|control)|role:(control|heal)|dmg:)/;
/**
 * As ideias de momento que combinam com a cena (§3.3, ★ Momento): o teste dela (a mesma
 * perícia ou salvaguarda) e o combate (as salvaguardas que os monstros cobram, os papéis de
 * luta). `fightSaves` = [{ab, dc}] dos monstros (versus.monsterSaves). As que combinam vêm
 * primeiro, com o porquê escrito; depois as outras, na ordem de antes.
 * → [{...sug, why?}]
 */
export function sceneMomentIdeas(view, suggestions = [], { fightSaves = [], lang = 'pt' } = {}) {
  const check = view?.checks?.[0] || null;
  const fight = (view?.fight || []).length > 0;
  const why = (s) => {
    const a = String(s.auto || '');
    const dc = check?.dc ? ` ${tt(lang, 'CD', 'DC')} ${check.dc}` : '';
    if (check && check.kind === 'skill' && (a === `skill:${check.key}` || a === `push:skill:${check.key}`)) {
      return tt(lang, `a cena tem ${checkLabel(check, lang)}${dc}`, `the scene has ${checkLabel(check, lang)}${dc}`);
    }
    if (a.startsWith('push:save:')) {
      const ab = a.slice(10);
      if (check && check.kind === 'save' && check.key === ab) return tt(lang, `a cena tem ${checkLabel(check, lang)}${dc}`, `the scene has ${checkLabel(check, lang)}${dc}`);
      const fs = (fightSaves || []).find(x => x.ab === ab);
      if (fight && fs) return tt(lang, `o combate cobra ${checkLabel({ kind: 'save', key: ab }, lang)} CD ${fs.dc}`, `the fight calls for ${checkLabel({ kind: 'save', key: ab }, lang)} DC ${fs.dc}`);
    }
    if (fight && COMBAT_AUTO.test(a)) return tt(lang, 'a cena tem combate', 'the scene has a fight');
    return null;
  };
  const rows = (suggestions || []).map((s, i) => ({ s, i, w: why(s) }));
  return [...rows.filter(r => r.w), ...rows.filter(r => !r.w)].map(r => (r.w ? { ...r.s, why: r.w } : r.s));
}

/**
 * A ideia de momento que nasce do 🎯 da cena para um personagem: quem é o melhor da mesa
 * naquele teste ganha um ★ ("Investigação 65%"); os outros, um ↗ ("tentar sem o
 * especialista"). `fact`/`facts` = party-metrics.partyFacts (skills, saves). Atributo puro
 * não vira ideia. → sugestão ({kind, auto, text, why}) | null
 */
export function sceneCheckIdea(view, fact, facts = [], { lang = 'pt' } = {}) {
  const c = view?.checks?.[0];
  if (!c || !fact || (c.kind !== 'skill' && c.kind !== 'save')) return null;
  const pool = c.kind === 'save' ? 'saves' : 'skills';
  const b = fact[pool]?.[c.key];
  if (!Number.isFinite(b)) return null;
  const dc = Number.isInteger(c.dc) ? c.dc : 15;
  const best = Math.max(b, ...(facts || []).map(f => (Number.isFinite(f?.[pool]?.[c.key]) ? f[pool][c.key] : -99)));
  const label = checkLabel(c, lang);
  const p = pct(chance(b, dc));
  const why = tt(lang, `a cena tem ${label} CD ${dc}`, `the scene has ${label} DC ${dc}`);
  const key = c.kind === 'save' ? `save:${c.key}` : `skill:${c.key}`;
  if (b >= best) return { kind: 'shine', auto: key, text: `${label} ${p}%`, why };
  const mod = b >= 0 ? `+${b}` : `−${Math.abs(b)}`;
  return { kind: 'push', auto: `push:${key}`, text: tt(lang, `${label} ${mod} · ${p}% · tentar sem o especialista do grupo`, `${label} ${mod} · ${p}% · try it without the party's expert`), why };
}

// ---------------------------------------------------------------- ⚔ a dificuldade escrita
const levelsText = (levels, lang) => {
  const n = levels.length;
  const lo = Math.min(...levels);
  const hi = Math.max(...levels);
  const who = tt(lang, `${n} ${n === 1 ? 'personagem' : 'personagens'}`, `${n} ${n === 1 ? 'character' : 'characters'}`);
  return lo === hi ? tt(lang, `${who} nível ${lo}`, `${who} level ${lo}`) : tt(lang, `${who}, níveis ${lo}–${hi}`, `${who}, levels ${lo}–${hi}`);
};
/**
 * "Moderada · 100 de 150 XP · 4 personagens nível 1": a dificuldade, o XP do combate e o
 * teto da faixa dele (o orçamento escrito), contra os níveis da mesa. `lookup(id)` acha o
 * monstro (catálogo, "meus monstros"); o snap da cena estima o ND do personalizado.
 * → {rating, totalXp, budget, text}
 */
export function fightDifficulty(fight, levels = [], lookup = () => null, lang = 'pt') {
  const enc = nodeEncounter({ encounter: (fight || []).map(fightToEncounter) }, levels, lookup);
  if (!enc.monsters) return { ...enc, text: '' };
  const xp = `${enc.estimated ? '≈ ' : ''}${enc.totalXp.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR')}`;
  if (!levels.length) return { ...enc, text: tt(lang, `${xp} XP · a mesa ainda não tem personagens`, `${xp} XP · the table has no characters yet`) };
  const cap = { low: enc.budget.low, moderate: enc.budget.moderate, high: enc.budget.high, extreme: enc.budget.high }[enc.rating] || enc.budget.moderate;
  const label = DIFFICULTY_LABEL[enc.rating]?.[lang === 'en' ? 'en' : 'pt'] || '';
  const of = enc.rating === 'extreme' ? tt(lang, `${xp} XP (Alta vai até ${cap})`, `${xp} XP (High goes up to ${cap})`) : tt(lang, `${xp} de ${cap} XP`, `${xp} of ${cap} XP`);
  return { ...enc, text: `${label} · ${of} · ${levelsText(levels, lang)}` };
}

// ---------------------------------------------------------------- a linha da cena no Plano
/**
 * Os ícones do que a cena tem, escritos ("📜 ler · 📺 imagem · 🎭 2 · ⚔ 2 Goblins ·
 * 🎯 Percepção · ★ Pipo"): só aparece o que existe. `names` = {charId: primeiro nome}.
 */
export function sceneIcons(view, { lang = 'pt', moments = [], names = {} } = {}) {
  const out = [];
  if (filled(view?.read) || view?.hasRead) out.push(`📜 ${tt(lang, 'ler', 'read')}`);
  if (view?.show) out.push(`📺 ${tt(lang, 'imagem', 'image')}`);
  if (view?.refs?.length) out.push(`🎭 ${view.refs.length}`);
  const fight = view?.fight || [];
  if (fight.length) {
    const total = fight.reduce((n, f) => n + (parseInt(f.count, 10) || 1), 0);
    out.push(fight.length === 1 ? `⚔ ${total} ${fight[0].name}` : `⚔ ${total} ${tt(lang, 'monstros', 'monsters')}`);
  }
  const checks = view?.checks || [];
  if (checks.length) out.push(`🎯 ${checkLabel(checks[0], lang)}${checks.length > 1 ? ` +${checks.length - 1}` : ''}`);
  const who = [...new Set((moments || []).map(m => names[m.charId]).filter(Boolean))];
  if (who.length) out.push(`★ ${who.join(', ')}`);
  else if (view?.spots?.length) out.push(`★ ${view.spots.length}`);
  if (filled(view?.notes) || filled(view?.what) || filled(view?.notesInText)) out.push(`🔒 ${tt(lang, 'notas', 'notes')}`);
  return out;
}

/** "Cena 2 de 3" (as cenas de verdade; a nova ainda sem nome conta). */
export function sceneHeading(plan, sceneId, lang = 'pt') {
  const list = plan?.scenes || [];
  const i = list.findIndex(s => s.id === sceneId);
  return tt(lang, `Cena ${i + 1} de ${list.length}`, `Scene ${i + 1} of ${list.length}`);
}

/**
 * "O que acontece (só você vê)": as notas que o Raio-X escrevia no texto da cena (da 2ª
 * linha em diante) aparecem aqui enquanto `what` está vazio; editar grava `what` e deixa o
 * texto só com o nome. → {value, patch(v)}
 */
export function whatField(scene) {
  const { name, notes } = sceneParts(scene?.text);
  const what = typeof scene?.what === 'string' ? scene.what : '';
  const legacy = !filled(what) && filled(notes);
  return {
    value: legacy ? notes.slice(0, SCENE_LIMITS.what) : what,
    patch: (v) => (legacy ? { what: String(v).slice(0, SCENE_LIMITS.what), text: name } : { what: String(v).slice(0, SCENE_LIMITS.what) }),
  };
}

/** Ao fechar a folha: cena sem nome e sem nada → sai; sem nome mas com algo → "Cena N". */
export function closeScene(scene, index, lang = 'pt') {
  const v = sceneView(scene);
  if (filled(v.name) || scene?.nodeRef) return { action: 'keep' };
  const empty = !presentBlocks(v).length && !filled(v.what) && !filled(v.notesInText);
  if (empty) return { action: 'remove' };
  return { action: 'name', text: tt(lang, `Cena ${index + 1}`, `Scene ${index + 1}`) };
}
