// "O mais comum" do Escolher monstro (V8, especificação §4.6) — lógica pura,
// testada em tests/common-monsters.test.js.
//
// Com uma busca, a lista vem nesta ordem:
//   1. o nome exato do SRD ("orc" → Orc; "lobo" → Lobo);
//   2. os monstros da lista fixa dos mais usados que batem com a busca, na ordem da
//      lista — o 1º ganha o selo "o mais comum" ("goblin" → Goblin Guerreiro, não o
//      Goblin Lacaio que vinha primeiro pelo ND);
//   3. o resto, pelo ND mais perto do nível do grupo (e o nome, para desempatar).
// Sem busca, a ordem do catálogo fica como está. A busca ignora acentos
// ("dragao" acha "Dragão").

/** Os ~30 monstros mais usados numa mesa iniciante, na ordem de preferência. */
export const COMMON_MONSTERS = [
  'goblin-warrior', 'goblin-boss', 'hobgoblin-warrior', 'bugbear-warrior', 'kobold-warrior',
  'orc', 'gnoll-warrior', 'bandit', 'bandit-captain', 'cultist', 'cultist-fanatic', 'guard',
  'scout', 'skeleton', 'zombie', 'ghoul', 'wolf', 'dire-wolf', 'giant-rat', 'giant-spider',
  'black-bear', 'brown-bear', 'ogre', 'owlbear', 'troll', 'mimic', 'specter', 'wight',
  'priest', 'mage', 'knight', 'warrior-veteran', 'harpy', 'werewolf',
];
const COMMON_POS = new Map(COMMON_MONSTERS.map((id, i) => [id, i]));

/** Minúsculas e sem acento. */
export function fold(text) {
  return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const names = (m) => [m?.name?.pt, m?.name?.en, typeof m?.name === 'string' ? m.name : null, m?.id]
  .filter(Boolean).map(fold);

/** O monstro bate com a busca (nome pt/en ou id, sem acento)? */
export function matchesQuery(m, query) {
  const q = fold(query);
  if (!q) return true;
  return names(m).some(n => n.includes(q) || n.replace(/-/g, ' ').includes(q));
}

const isExact = (m, q) => names(m).some(n => n === q || n.replace(/-/g, ' ') === q);

/**
 * A lista na ordem da busca e o id que leva o selo "o mais comum" (ou null).
 * `partyLevel`: o nível médio do grupo (os de ND perto dele vêm antes no resto).
 */
export function rankMonsters(list, query, { partyLevel = null } = {}) {
  const q = fold(query);
  const items = Array.isArray(list) ? list : [];
  if (!q) return { list: items, commonId: null };
  const level = Number(partyLevel) > 0 ? Number(partyLevel) : null;
  const scored = items.map((m, i) => {
    let rank;
    if (isExact(m, q)) rank = 0;
    else if (!m?.custom && COMMON_POS.has(m?.id)) rank = 1 + COMMON_POS.get(m.id) / 1000;
    else rank = 2 + (level != null ? Math.min(30, Math.abs((Number(m?.crNum) || 0) - level)) / 100 : 0);
    return { m, i, rank };
  });
  scored.sort((a, b) => a.rank - b.rank || a.i - b.i);
  const first = scored.find(s => s.rank < 2 && !s.m?.custom && COMMON_POS.has(s.m?.id));
  return { list: scored.map(s => s.m), commonId: first ? first.m.id : null };
}

/** Nível médio dos personagens da mesa (campaign.members), ou null. */
export function partyLevelOf(members) {
  const lv = (members || []).filter(m => m?.role !== 'dm' && m?.character)
    .map(m => parseInt(m.character?.data?.level ?? m.character?.summary?.level ?? 0, 10)).filter(n => n > 0);
  return lv.length ? Math.round(lv.reduce((a, b) => a + b, 0) / lv.length) : null;
}
