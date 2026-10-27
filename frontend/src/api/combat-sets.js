// V9 · As ações dos stat blocks fora do JSON do combate.
// Com ?sets=1 o servidor manda, em cada combatente com ações, `stats.actionsRef` (hash do
// conteúdo) no lugar de `stats.actions`: o texto das regras em pt e en era quase tudo o que
// o combate pesava a cada mudança (~15 KB com um Dragão Vermelho Adulto e 4 monstros). O app
// busca cada conjunto uma vez em /api/combat/campaign/<id>/actions/<ref> (o mesmo ref é
// sempre o mesmo conteúdo: cache de 1 ano) e o põe de volta aqui, então o resto do app
// (folha do combatente, ataque, avisos) vê o combate de sempre. Cola em src/api/client.js.
// Sem React e sem rede; testado em tests/combat-sets.test.js.

const COMBAT_PATH = /^\/api\/combat\/campaign\/([^/?#]+)(?:\/([^?#]*))?(?:\?.*)?$/;

/** '/api/combat/campaign/<id>[/…]' → o id da campanha (texto); outro caminho, ou a
 *  própria rota das ações e das imagens → null. */
export function combatCampaignId(path) {
  const m = COMBAT_PATH.exec(String(path || ''));
  if (!m) return null;
  if (m[2] && /^(actions|map-image|token)(\/|$)/.test(m[2])) return null;
  return decodeURIComponent(m[1]);
}

/** O caminho com `sets=1` (o servidor de antes ignora o parâmetro e manda tudo). */
export function withSetsParam(path) {
  const p = String(path || '');
  if (/[?&]sets=1(&|$)/.test(p)) return p;
  return `${p}${p.includes('?') ? '&' : '?'}sets=1`;
}

/** Refs que o combate usa e o cache (Map ref → ações) ainda não tem, sem repetir. */
export function missingRefs(combat, sets) {
  const out = [];
  for (const cb of combat?.combatants || []) {
    const ref = cb?.stats?.actionsRef;
    if (ref && !sets.has(ref) && !out.includes(ref)) out.push(ref);
  }
  return out;
}

/**
 * O combate com `stats.actions` de volta em quem veio com `actionsRef` (cópias novas; a
 * entrada não muda). Combate sem refs (jogador, servidor de antes) volta como veio. Falta
 * algum ref no cache → null (quem chama lê o combate inteiro, sem ?sets).
 */
export function withActions(combat, sets) {
  const list = combat?.combatants;
  if (!Array.isArray(list) || !list.some(cb => cb?.stats?.actionsRef)) return combat;
  const out = [];
  for (const cb of list) {
    const ref = cb?.stats?.actionsRef;
    if (!ref) { out.push(cb); continue; }
    if (!sets.has(ref)) return null;
    const { actionsRef, ...stats } = cb.stats;
    out.push({ ...cb, stats: { ...stats, actions: sets.get(ref) } });
  }
  return { ...combat, combatants: out };
}

/** Guarda um conjunto no cache, sem deixar crescer sem fim (sai o mais antigo). O que não
 *  é lista não entra (o ref continua faltando e quem chama lê o combate inteiro). */
export function remember(sets, ref, actions, max = 200) {
  if (!ref || !Array.isArray(actions)) return sets;
  sets.delete(ref);
  sets.set(ref, actions);
  while (sets.size > max) sets.delete(sets.keys().next().value);
  return sets;
}
