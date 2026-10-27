// Montar o combate (V8, especificação §4.6) — lógica pura, sem React.
// Testada em tests/encounter-setup.test.js.
//
// - encounterGroups: os monstros da cena (node.encounter da sala; com a V6,
//   scene.fight do plano) → os grupos do POST /combat/…/encounter (o snapshot do
//   bestiário vai junto: o servidor não tem o catálogo).
// - encounterBody: o corpo do POST, com o opId (o 2º toque não duplica).
// - setupSteps: "Monte o combate em 3 passos" (① Monstros ② Personagens ③ Iniciativa,
//   cada um com ✓).
// - initiativeRows / useInitiatives: as respostas do teste de iniciativa na linha de
//   cada personagem ("⚡ Dagna 14") e o "Usar e começar (3 de 4)" (quem não
//   respondeu fica com 10 e "✎").
// - legacyBodies: servidor ainda sem /encounter → os POSTs de antes, 1 por
//   combatente, mas com as casas livres contadas em sequência (D1) e a iniciativa
//   rolada por monstro aqui.
import { freePositions } from './placement.js';
import { isInitiativeCheck } from '../checks/check-logic.js';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);
export const MAX_ENCOUNTER_MONSTERS = 30;

const scaleOf = (size) => ({ Tiny: 0.5, Large: 2, Huge: 3, Gargantuan: 4 })[size] || 1;
const nameOf = (snap, lang, fallback) => (typeof snap?.name === 'object'
  ? (snap.name?.[lang] || snap.name?.pt || snap.name?.en) : snap?.name) || fallback || 'Monster';

/**
 * Entradas de combate da cena ([{monsterId, name, count, snapshot?|snap?}]) → grupos
 * [{key, monster, name, count, initiative: null}]. `resolve(entry)` acha o monstro no
 * catálogo (ou devolve o snapshot); `toCombat` = monsterForCombat do bestiário.
 */
export function encounterGroups(entries, { resolve, toCombat, lang = 'pt' } = {}) {
  const out = [];
  for (const [i, e] of (entries || []).entries()) {
    if (!e) continue;
    const src = resolve ? resolve(e) : (e.snapshot || e.snap || null);
    if (!src) continue;
    const snap = toCombat ? toCombat(src) : src;
    out.push({
      key: `${e.monsterId || e.name || 'm'}:${i}`,
      monster: snap,
      name: nameOf(snap, lang, e.name),
      count: Math.max(1, Math.min(20, parseInt(e.count, 10) || 1)),
      initiative: null,
      tokenScale: scaleOf(snap.size),
    });
  }
  return out;
}

/** Quantos monstros os grupos põem no combate. */
export const groupsTotal = (groups) => (groups || []).reduce((n, g) => n + (Number(g.count) || 0), 0);

/**
 * O corpo do POST /combat/campaign/:id/encounter.
 * opts: {opId, groups, mode ('replace'|'add'), pcs (true = todos), askInitiative,
 *        monsterInit ('each'|'group'), map ('keep'|'none'|{advId,nodeId}|{entryId}),
 *        scene ({advId,nodeId,name}), start, lang}
 */
export function encounterBody({
  opId, groups = [], mode = 'add', pcs = true, askInitiative = false, monsterInit = 'each',
  map = 'keep', scene = null, start = false, lang = 'pt',
} = {}) {
  const body = {
    opId, mode, lang, monsterInit, start: !!start, askInitiative: !!askInitiative,
    monsters: (groups || []).filter(g => g && g.count > 0).map(g => ({
      monster: g.monster, count: g.count,
      ...(Number.isFinite(g.initiative) ? { initiative: g.initiative } : {}),
      ...(g.tokenScale && g.tokenScale !== 1 ? { tokenScale: g.tokenScale } : {}),
    })),
  };
  if (pcs === true) body.pcs = 'all';
  else if (Array.isArray(pcs) && pcs.length) body.pcs = pcs;
  if (map && map !== 'keep') body.map = map;
  if (scene) body.scene = scene;
  return body;
}

// ------------------------------------------------------------------ iniciativa pedida
/** O teste de iniciativa aberto mais novo (ou null). */
export function openInitiativeCheck(checks) {
  return (checks || []).filter(c => isInitiativeCheck(c) && c.status === 'open')
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
}

/**
 * Cada personagem do combate com a resposta do teste de iniciativa:
 * [{id, characterId, name, total|null, answered, guess}] (guess = "✎": entrou com 10).
 */
export function initiativeRows(combat, check) {
  const byChar = new Map((check?.targets || []).map(t => [t.characterId, t]));
  return (combat?.combatants || []).filter(c => c.type === 'pc').map(c => {
    const t = byChar.get(c.character_id);
    const total = t?.response && Number.isFinite(t.response.total) ? t.response.total : null;
    return { id: c.id, characterId: c.character_id, name: c.name, total, answered: total != null, guess: !!c.init_guess };
  });
}

/**
 * "Usar e começar (3 de 4)": as iniciativas para o POST (quem respondeu leva o total;
 * quem não respondeu e estava com "✎", 10 com "✎"; quem já tinha a iniciativa
 * digitada pelo mestre fica como está) e a contagem do botão.
 */
export function useInitiatives(rows) {
  const list = rows || [];
  return {
    initiatives: list.filter(r => r.answered || r.guess)
      .map(r => (r.answered ? { id: r.id, initiative: r.total } : { id: r.id, initiative: 10, guess: true })),
    answered: list.filter(r => r.answered || !r.guess).length,
    total: list.length,
  };
}

export function useLabel({ answered, total }, lang = 'pt') {
  return total && answered < total
    ? L(lang, `Usar e começar (${answered} de ${total})`, `Use and start (${answered} of ${total})`)
    : L(lang, 'Usar e começar', 'Use and start');
}

// ------------------------------------------------------------------ 3 passos
/**
 * "Monte o combate em 3 passos": [{id: 'monsters'|'pcs'|'init', done}].
 * A iniciativa conta feita quando nenhum personagem está com "✎" (ou não há personagem).
 */
export function setupSteps(combat, { askedInitiative = false } = {}) {
  const list = combat?.combatants || [];
  const pcs = list.filter(c => c.type === 'pc');
  return [
    { id: 'monsters', done: list.some(c => c.type === 'monster') },
    { id: 'pcs', done: pcs.length > 0 },
    { id: 'init', done: pcs.length > 0 && (pcs.every(c => !c.init_guess) || false), asked: !!askedInitiative },
  ];
}

// ------------------------------------------------------------------ servidor antigo
/**
 * Sem POST /encounter (o PythonAnywhere ainda não atualizado): os bodies do POST
 * …/combatants de antes, 1 por combatente, com as casas livres somadas em sequência
 * (o "Adicionar todos" de antes empilhava, D1) e a iniciativa de cada monstro rolada
 * aqui (d20 + bônus). `members`: os personagens a pôr (sem os que já estão).
 */
export function legacyBodies({ groups = [], members = [], combatants = [], map = {}, rng = Math.random, lang = 'pt' } = {}) {
  const opts = { grid: map.grid_size_px || 50, width: map.width_px || 1200, height: map.height_px || 800 };
  const placed = [...(combatants || [])];
  const out = [];
  const base = new Map();
  for (const c of combatants || []) {
    const m = /^(.*\S)\s+#(\d+)$/.exec(c?.name || '');
    const key = m ? m[1] : c?.name;
    base.set(key, Math.max(base.get(key) || 0, m ? Number(m[2]) : 1));
  }
  for (const g of groups || []) {
    const name = g.name || nameOf(g.monster, lang);
    const last = base.get(name) || 0;
    const numbered = g.count > 1 || last > 0;
    const spots = freePositions(placed, g.count, { ...opts, scale: g.tokenScale || 1, start: { x: 100, y: 100 } });
    const bonus = typeof g.monster?.initiative === 'number' ? g.monster.initiative
      : Math.floor(((g.monster?.abilities?.dex ?? 10) - 10) / 2);
    for (let i = 0; i < g.count; i++) {
      const position = spots[i];
      const body = {
        type: 'monster', monster: { ...g.monster, name: numbered ? `${name} #${last + i + 1}` : name },
        initiative: Number.isFinite(g.initiative) ? g.initiative : 1 + Math.floor(rng() * 20) + bonus,
        position, tokenScale: g.tokenScale || 1,
      };
      out.push(body);
      placed.push({ position, token_scale: g.tokenScale || 1 });
    }
    base.set(name, last + g.count);
  }
  const inFight = new Set((combatants || []).filter(c => c.type === 'pc').map(c => c.character_id));
  const fresh = (members || []).filter(m => m?.character && !inFight.has(m.character.id));
  const spots = freePositions(placed, fresh.length, { ...opts, start: { x: 100, y: 200 } });
  fresh.forEach((m, i) => {
    const typed = parseInt(m.initiative, 10);
    out.push({ type: 'pc', characterId: m.character.id, initiative: Number.isFinite(typed) ? typed : 10, position: spots[i], tokenScale: 1 });
    placed.push({ position: spots[i], token_scale: 1 });
  });
  return out;
}
