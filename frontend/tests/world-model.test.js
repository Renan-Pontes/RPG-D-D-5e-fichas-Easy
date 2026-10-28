import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KINDS, KIND_META, defaultArt, kindLabel, visLabel, nextVisibility, parseMentions, mentionIds, plainText,
  mentionMarkup, mentionQueryAt, insertMention, filterEntries, allTags, countByKind, sortEntries, reorderPatches,
  applyPatches, timelineEntries, backlinks, childrenOf, isNewFor, toLight, freshId, norm, subtitleOf, relLabel, clampUnit,
  moveStepPatches, visShort, visTip, secretsText, VISIBILITIES, mergeReorderResponse, pendingAdd, pendingDone,
} from '../src/world/world-model.js';
import { WORLD_LIGHT_DM, WORLD_FULL_DM, WORLD_MAP_DM, WORLD_LIGHT_PLAYER } from '../src/world/fixtures.js';

test('todo tipo tem ícone, rótulos pt/en e arte padrão existente no catálogo', () => {
  for (const k of KINDS) {
    const m = KIND_META[k];
    assert.ok(m.icon && m.pt && m.en && m.art.length);
    assert.ok(m.art.every(a => a.startsWith('/art/')));
  }
  assert.equal(kindLabel('faction', 'pt'), 'Facção');
  assert.equal(kindLabel('faction', 'en', true), 'Factions');
  assert.equal(visLabel('partial', 'pt'), 'Só o nome');
});

test('arte padrão é estável por id e mapa usa a arte de mapa', () => {
  const e = { id: 9, kind: 'npc' };
  assert.equal(defaultArt(e), defaultArt({ ...e }));
  assert.ok(KIND_META.npc.art.includes(defaultArt(e)));
  assert.equal(defaultArt({ id: 1, kind: 'place', isMap: true }), '/art/backgrounds/guide.webp');
});

test('ciclo de visibilidade', () => {
  assert.equal(nextVisibility('hidden'), 'partial');
  assert.equal(nextVisibility('partial'), 'revealed');
  assert.equal(nextVisibility('revealed'), 'hidden');
});

test('menções @[Nome](id)', () => {
  const s = 'Fale com @[Borin Pé-de-Malte](2) e @[Irmã Velna](3), depois @[Borin Pé-de-Malte](2).';
  const parts = parseMentions(s);
  assert.equal(parts.filter(p => p.type === 'mention').length, 3);
  assert.deepEqual(parts[1], { type: 'mention', name: 'Borin Pé-de-Malte', id: 2 });
  assert.deepEqual(mentionIds(s), [2, 3]);
  assert.equal(plainText(s), 'Fale com Borin Pé-de-Malte e Irmã Velna, depois Borin Pé-de-Malte.');
  assert.equal(mentionMarkup('A [b]', 5), '@[A  b ](5)');
  assert.deepEqual(parseMentions(''), []);
  assert.deepEqual(parseMentions('sem nada'), [{ type: 'text', text: 'sem nada' }]);
});

test('autocompletar @ e inserir menção', () => {
  assert.deepEqual(mentionQueryAt('oi @Bor', 7), { start: 3, query: 'Bor' });
  assert.deepEqual(mentionQueryAt('@', 1), { start: 0, query: '' });
  assert.equal(mentionQueryAt('email@x', 7), null);
  const r = insertMention('oi @Bor tudo', 3, 7, 'Borin', 2);
  assert.equal(r.text, 'oi @[Borin](2)  tudo');
  assert.equal(r.caret, 3 + '@[Borin](2) '.length);
});

test('filtros do Atlas: tipo, tag, busca sem acento, visibilidade', () => {
  assert.equal(filterEntries(WORLD_LIGHT_DM, { kind: 'npc' }).length, 3);
  assert.deepEqual(filterEntries(WORLD_LIGHT_DM, { q: 'irma' }).map(e => e.id), [3]);
  assert.deepEqual(filterEntries(WORLD_LIGHT_DM, { q: 'sino seita' }).map(e => e.id), [5]);
  assert.deepEqual(filterEntries(WORLD_LIGHT_DM, { tag: 'VILÃO' }).map(e => e.id), [4]);
  assert.equal(filterEntries(WORLD_LIGHT_DM, { vis: 'hidden' }).length, 2);
  assert.equal(filterEntries(WORLD_LIGHT_DM, { kind: 'all' }).length, WORLD_LIGHT_DM.length);
  assert.ok(allTags(WORLD_LIGHT_DM).includes('vilão'));
  assert.equal(countByKind(WORLD_LIGHT_DM).npc, 3);
  assert.equal(norm('Ação'), 'acao');
});

test('ordenar e arrastar (sort)', () => {
  const list = sortEntries(WORLD_LIGHT_DM);
  assert.deepEqual(list.map(e => e.id), [1, 2, 3, 4, 5, 6, 7]);
  // move o 7 (último) para o topo → só ele muda
  const p1 = reorderPatches(list, 6, 0);
  assert.deepEqual(p1, [{ id: 7, sort: -9 }]);
  // move o 1 para entre 2 e 3 → sem espaço inteiro entre 2 e 3: renumera
  const p2 = reorderPatches(list, 0, 1);
  const after = sortEntries(applyPatches(list, p2));
  assert.deepEqual(after.map(e => e.id), [2, 1, 3, 4, 5, 6, 7]);
  assert.deepEqual(reorderPatches(list, 2, 2), []);
  assert.deepEqual(reorderPatches(list, -1, 2), []);
});

test('modo Ordenar: ↑ ↓ troca com o vizinho À VISTA e grava só o sort', () => {
  const list = sortEntries(WORLD_LIGHT_DM);
  const ids = (l) => sortEntries(l).map(e => e.id);
  // sem filtro: o 3 desce uma casa (fica depois do 4)
  assert.deepEqual(ids(applyPatches(list, moveStepPatches(list, list, 3, +1))), [1, 2, 4, 3, 5, 6, 7]);
  // sobe uma casa (fica antes do 2)
  assert.deepEqual(ids(applyPatches(list, moveStepPatches(list, list, 3, -1))), [1, 3, 2, 4, 5, 6, 7]);
  // no topo / no fim: nada a gravar
  assert.deepEqual(moveStepPatches(list, list, 1, -1), []);
  assert.deepEqual(moveStepPatches(list, list, 7, +1), []);
  // com filtro (só os NPCs à vista), o vizinho é o NPC anterior, mesmo com outros no meio
  const npcs = list.filter(e => e.kind === 'npc');
  assert.ok(npcs.length >= 2);
  const [a, b] = npcs;
  const after = ids(applyPatches(list, moveStepPatches(list, npcs, b.id, -1)));
  assert.ok(after.indexOf(b.id) < after.indexOf(a.id), 'o NPC subiu acima do anterior');
  // id fora da vista ou lista vazia: nada
  assert.deepEqual(moveStepPatches(list, npcs, 999, -1), []);
  assert.deepEqual(moveStepPatches([], [], 1, 1), []);
  // patches só com id e sort (o PATCH leva a versão de quem chama)
  for (const p of moveStepPatches(list, list, 5, -1)) assert.deepEqual(Object.keys(p).sort(), ['id', 'sort']);
  // sort colados (1, 2, 3…): troca os dois valores em vez de renumerar todos
  const tight = Array.from({ length: 30 }, (_, k) => ({ id: k + 1, name: `c${k + 1}`, sort: k + 1 }));
  const sw = moveStepPatches(tight, tight, 2, +1);
  assert.deepEqual(sw, [{ id: 2, sort: 3 }, { id: 3, sort: 2 }]);
  assert.deepEqual(ids(applyPatches(tight, sw)).slice(0, 4), [1, 3, 2, 4]);
  // com espaço entre os vizinhos: 1 PATCH só (o do cartão movido)
  const loose = tight.map(e => ({ ...e, sort: e.sort * 10 }));
  assert.equal(moveStepPatches(loose, loose, 2, +1).length, 1);
  // sort repetidos (cartões novos, todos 0): renumera, como o arrastar
  const zeros = tight.slice(0, 4).map(e => ({ ...e, sort: 0 }));
  assert.deepEqual(ids(applyPatches(zeros, moveStepPatches(zeros, zeros, 1, +1))), [2, 1, 3, 4]);
  // com filtro e sort colados (o seed: 1..38): vizinhos À VISTA longe na lista inteira
  // trocam os dois valores — 2 PATCH, não 1 por cartão do Mundo
  const mixed = tight.map(e => ({ ...e, kind: [2, 3, 4, 13, 14].includes(e.id) ? 'npc' : 'place' }));
  const onlyNpcs = mixed.filter(e => e.kind === 'npc');
  const up = moveStepPatches(mixed, onlyNpcs, 13, -1);
  assert.equal(up.length, 2);
  assert.deepEqual(up, [{ id: 13, sort: 4 }, { id: 4, sort: 13 }]);
  const npcOrder = sortEntries(applyPatches(mixed, up)).filter(e => e.kind === 'npc').map(e => e.id);
  assert.deepEqual(npcOrder, [2, 3, 13, 4, 14]);
  assert.equal(moveStepPatches(mixed, onlyNpcs, 4, +1).length, 2);
  // troca que o desempate por nome estragaria (sort repetido com o vizinho de fora): renumera
  const tieList = sortEntries([{ id: 1, name: 'b', sort: 3 }, { id: 2, name: 'a', sort: 3 }, { id: 3, name: 'c', sort: 4 }]);
  assert.deepEqual(tieList.map(e => e.id), [2, 1, 3]);
  assert.deepEqual(ids(applyPatches(tieList, moveStepPatches(tieList, tieList, 3, -1))), [2, 3, 1]);
});

test('fila do Ordenar: com o servidor lento, a resposta de um toque não desfaz o seguinte', () => {
  // sort 1..7; o cartão 2 desce 3 vezes (↓ ↓ ↓) antes de qualquer resposta chegar
  let list = Array.from({ length: 7 }, (_, k) => ({ id: k + 1, name: `c${k + 1}`, sort: k + 1, version: 1 }));
  const ids = (l) => sortEntries(l).map(e => e.id);
  const pending = new Map();
  const queue = [];
  for (let tap = 0; tap < 3; tap++) {
    const s = sortEntries(list);
    const patches = moveStepPatches(s, s, 2, +1);
    assert.equal(patches.length, 2);
    pendingAdd(pending, patches);
    list = applyPatches(list, patches);
    queue.push(...patches);
  }
  assert.deepEqual(ids(list), [1, 3, 4, 5, 2, 6, 7]);
  assert.deepEqual(pending.get(2), { sort: 5, n: 3 });
  // as respostas chegam uma a uma, na ordem da fila: a tela não muda no meio
  const server = new Map(list.map(e => [e.id, { ...e, sort: e.id }]));
  for (const p of queue) {
    const cur = server.get(p.id);
    const resp = { ...cur, sort: p.sort, version: cur.version + 1, updatedAt: `v${cur.version + 1}` };
    server.set(p.id, resp);
    pendingDone(pending, p.id);
    list = mergeReorderResponse(list, resp, pending);
    assert.deepEqual(ids(list), [1, 3, 4, 5, 2, 6, 7], `depois da resposta ${p.id}:${p.sort}`);
  }
  assert.equal(pending.size, 0);
  // no fim valem a versão e os campos do servidor (e o sort, igual ao da tela)
  const two = list.find(e => e.id === 2);
  assert.deepEqual([two.sort, two.version, two.updatedAt], [5, 4, 'v4']);
  assert.deepEqual(ids([...server.values()]), [1, 3, 4, 5, 2, 6, 7]);
  // sem fila: a resposta (do editor, do 👁) entra inteira; cartão novo vai para o fim
  assert.equal(mergeReorderResponse(list, { id: 3, sort: 99, summary: 'nova' }, new Map()).find(e => e.id === 3).sort, 99);
  assert.equal(mergeReorderResponse(list, { id: 50, name: 'novo', sort: 0 }, pending).length, 8);
  assert.equal(mergeReorderResponse(list, null, pending), list);
  // pendingDone num id sem fila não quebra
  assert.equal(pendingDone(new Map(), 9).size, 0);
});

test('selo e dicas da visibilidade escritos (sem depender do title)', () => {
  assert.equal(visShort('partial', 'pt'), 'Só o nome');
  // uma palavra, um sentido: o selo curto, o filtro e o interruptor dizem o mesmo
  for (const v of VISIBILITIES) for (const lang of ['pt', 'en']) assert.equal(visLabel(v, lang), visShort(v, lang));
  assert.equal(visShort('hidden', 'en'), 'Hidden');
  for (const v of VISIBILITIES) {
    assert.ok(visShort(v, 'pt') && visShort(v, 'en'));
    assert.ok(visTip(v, 'pt') && visTip(v, 'en'));
  }
  assert.equal(secretsText({ secretsCount: 2, secretsRevealed: 1 }, 'pt'), '🗝 1/2 revelados');
  assert.equal(secretsText({ secretsCount: 2, secretsRevealed: 1 }, 'en'), '🗝 1/2 revealed');
  assert.equal(secretsText({ secretsCount: 1 }, 'pt', false), '🗝 1 segredo');
  assert.equal(secretsText({ secretsCount: 0 }, 'pt'), '');
});

test('linha do tempo: só com whenLabel, ordem por whenOrder e reordenar', () => {
  const ents = [
    { id: 1, name: 'A', whenLabel: 'Ano 1', whenOrder: 20 },
    { id: 2, name: 'B', whenLabel: 'Ano 0', whenOrder: 10 },
    { id: 3, name: 'C', whenLabel: 'Sem data', whenOrder: null },
    { id: 4, name: 'D', whenLabel: '', whenOrder: 5 },
  ];
  const tl = timelineEntries(ents);
  assert.deepEqual(tl.map(e => e.id), [2, 1, 3]);
  const patches = reorderPatches(tl, 2, 0, 'whenOrder');
  const re = timelineEntries(applyPatches(ents, patches));
  assert.deepEqual(re.map(e => e.id), [3, 2, 1]);
  // com nulos no meio, renumera tudo
  const p = reorderPatches([{ id: 1, whenOrder: null }, { id: 2, whenOrder: null }, { id: 3, whenOrder: null }], 0, 1, 'whenOrder');
  assert.deepEqual(p, [{ id: 2, whenOrder: 10 }, { id: 1, whenOrder: 20 }, { id: 3, whenOrder: 30 }]);
});

test('backlinks: links, menções, "fica em", pins e nós de aventura', () => {
  const bl = backlinks(WORLD_LIGHT_DM, 3, [{ id: 1, name: 'O Sino Afogado', data: { nodes: [{ id: 'n1', name: 'Templo', refs: [3] }] } }]);
  const vias = bl.map(b => `${b.entry?.id ?? 'adv'}:${b.via}`).sort();
  assert.deepEqual(vias, ['1:mention', '1:pin', '2:link', '2:mention', '4:link', 'adv:node']);
  assert.deepEqual(childrenOf(WORLD_LIGHT_DM, 1).map(e => e.id), [2, 3, 5]);
});

test('"Novo!" do jogador', () => {
  assert.equal(isNewFor({ revealedAt: '2026-10-03T00:00:00Z' }, '2026-10-01T00:00:00Z'), true);
  assert.equal(isNewFor({ revealedAt: '2026-09-03T00:00:00Z' }, '2026-10-01T00:00:00Z'), false);
  assert.equal(isNewFor({ revealedAt: '2026-09-03T00:00:00Z' }, null), true);
  assert.equal(isNewFor({ revealedAt: null }, null), false);
  assert.ok(WORLD_LIGHT_PLAYER.every(e => e.visibility !== 'hidden' && e.version === undefined));
});

test('toLight tira corpo, notas e segredos e recalcula contagens', () => {
  const l = toLight(WORLD_FULL_DM);
  assert.equal(l.body, undefined);
  assert.equal(l.dmNotes, undefined);
  assert.equal(l.secrets, undefined);
  assert.equal(l.secretsCount, 2);
  assert.equal(l.secretsRevealed, 1);
  assert.deepEqual(l.mentions, [2]);
  assert.deepEqual(l.data, { role: 'Sacerdotisa' });
  assert.equal(subtitleOf(l, 'pt'), 'Sacerdotisa');
  const m = toLight(WORLD_MAP_DM);
  assert.equal(m.isMap, true);
  assert.deepEqual(m.pinTargets, [2, 3, 4]);
  assert.equal(subtitleOf(m, 'en'), 'Village');
});

test('ids curtos e utilidades', () => {
  assert.equal(freshId('s', ['s1', 's2']), 's3');
  assert.equal(freshId('p', ['p2']), 'p3');
  assert.equal(freshId('p', []), 'p1');
  assert.equal(relLabel('located_in', 'pt'), 'Fica em');
  assert.equal(relLabel('xyz', 'en'), 'Linked to');
  assert.equal(clampUnit(2), 1);
  assert.equal(clampUnit(-1), 0);
  assert.equal(clampUnit(NaN), 0.5);
});

test('pinCountText flexiona o plural (#40)', async () => {
  const { pinCountText, tapVerb } = await import('../src/world/world-model.js');
  assert.equal(pinCountText(4, 2, 'pt'), '4 marcadores · 2 visíveis aos jogadores.');
  assert.equal(pinCountText(1, 1, 'pt'), '1 marcador · 1 visível aos jogadores.');
  assert.equal(pinCountText(0, 0, 'pt'), '0 marcadores · 0 visíveis aos jogadores.');
  assert.equal(pinCountText(1, 0, 'en'), '1 pin · 0 visible to players.');
  assert.equal(tapVerb('pt', true), 'Toque');
  assert.equal(tapVerb('pt', false), 'Clique');
  assert.equal(tapVerb('en', false), 'Click');
});
