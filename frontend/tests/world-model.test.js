import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KINDS, KIND_META, defaultArt, kindLabel, visLabel, nextVisibility, parseMentions, mentionIds, plainText,
  mentionMarkup, mentionQueryAt, insertMention, filterEntries, allTags, countByKind, sortEntries, reorderPatches,
  applyPatches, timelineEntries, backlinks, childrenOf, isNewFor, toLight, freshId, norm, subtitleOf, relLabel, clampUnit,
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
  assert.equal(visLabel('partial', 'pt'), 'Conhecido de nome');
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
