import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REACTIONS, FAVORITE_KIND, immersionOn, canReact, hasReacted, isFavorite, toggleReaction, toggleFavorite,
  replaceEntry, mergePending, favoriteEntries, echoChips, echoLine, shouldSendView, VIEW_THROTTLE_MS,
  seedOf, fogLine, fogHint, fogSilhouettes, fogClearings,
} from '../src/player/living/living-model.js';

test('reações de personagem: quatro, com ícones e a estrela à parte', () => {
  assert.deepEqual(REACTIONS.map(r => r.icon), ['😱', '❤️', '🤔', '⚔️']);
  assert.equal(new Set(REACTIONS.map(r => r.kind)).size, 4);
  assert.ok(!REACTIONS.some(r => r.kind === FAVORITE_KIND));
  // mesmo contrato do backend (world_rules.REACTION_KINDS / FAVORITE_KIND)
  assert.deepEqual(REACTIONS.map(r => r.kind), ['shiver', 'love', 'doubt', 'fight']);
  assert.equal(FAVORITE_KIND, 'star');
});

test('Mundo vivo: padrão ligado; o mestre desliga em dm_settings.immersion', () => {
  assert.equal(immersionOn({}), true);
  assert.equal(immersionOn(null), true);
  assert.equal(immersionOn({ immersion: false }), false, 'campo do serializer da campanha');
  assert.equal(immersionOn({ dmSettings: { immersion: false } }), false);
  assert.equal(immersionOn({ dm_settings: { immersion: false } }), false);
  assert.equal(immersionOn({ dmSettings: { immersion: true } }), true);
  assert.equal(immersionOn({ dmSettings: { immersion: 'no' } }), true, 'valor estranho não desliga');
});

test('só reage ao que a mesa viu (revelado ou conhecido de nome)', () => {
  assert.equal(canReact({ visibility: 'revealed' }), true);
  assert.equal(canReact({ visibility: 'partial' }), true);
  assert.equal(canReact({ visibility: 'hidden' }), false);
  assert.equal(canReact(null), false);
});

test('toggleReaction: otimista, imutável e sem contagem negativa', () => {
  const e = { id: 1, visibility: 'revealed', myReactions: [], reactionCounts: { shiver: 1 } };
  const a = toggleReaction(e, 'shiver');
  assert.equal(a.on, true);
  assert.deepEqual(a.entry.myReactions, ['shiver']);
  assert.equal(a.entry.reactionCounts.shiver, 2);
  assert.deepEqual(e.myReactions, [], 'não muta o original');
  const b = toggleReaction(a.entry, 'shiver');
  assert.equal(b.on, false);
  assert.equal(b.entry.reactionCounts.shiver, 1);
  assert.equal(hasReacted(b.entry, 'shiver'), false);
  // servidor sem contagem: desmarcar não vai abaixo de zero e some a chave
  const c = toggleReaction({ id: 2, myReactions: ['doubt'] }, 'doubt');
  assert.equal(c.on, false);
  assert.equal('doubt' in c.entry.reactionCounts, false);
  // kind desconhecido não faz nada
  const d = toggleReaction(e, 'party');
  assert.equal(d.entry, e);
  // várias reações ao mesmo tempo
  const f = toggleReaction(toggleReaction(e, 'love').entry, 'fight');
  assert.deepEqual(f.entry.myReactions, ['love', 'fight']);
});

test('estrela "Quero voltar" e o filtro', () => {
  const e = { id: 3, myFavorite: false };
  const on = toggleFavorite(e);
  assert.equal(on.on, true);
  assert.equal(isFavorite(on.entry), true);
  assert.equal(toggleFavorite(on.entry).entry.myFavorite, false);
  const list = [{ id: 1 }, { id: 2, myFavorite: true }, { id: 3, myFavorite: false }];
  assert.deepEqual(favoriteEntries(list).map(x => x.id), [2]);
  assert.deepEqual(replaceEntry(list, { id: 1, myFavorite: true }).map(x => !!x.myFavorite), [true, true, false]);
});

test('mergePending: o poll não apaga a reação recém-tocada', () => {
  const server = [{ id: 1, myReactions: [] }, { id: 2, myReactions: [] }];
  const pending = new Map([[1, { myReactions: ['love'], reactionCounts: { love: 1 } }]]);
  const out = mergePending(server, pending);
  assert.deepEqual(out[0].myReactions, ['love']);
  assert.deepEqual(out[1].myReactions, []);
  assert.equal(mergePending(server, new Map()), server);
});

test('ecos agregados: sem nomes, na ordem fixa, frase do cronista', () => {
  const e = { reactionCounts: { fight: 1, shiver: 2, love: 0 } };
  const chips = echoChips(e, 'pt');
  assert.deepEqual(chips.map(c => [c.kind, c.n]), [['shiver', 2], ['fight', 1]]);
  assert.ok(chips.every(c => !('who' in c) && !('names' in c)));
  assert.match(echoLine(e, 'pt'), /sussurrou/);
  assert.match(echoLine({ reactionCounts: { love: 1 } }, 'en'), /Someone/);
  assert.equal(echoLine({}, 'pt'), '');
});

test('registro de leitura: no máximo 1 por minuto por cartão', () => {
  const last = new Map();
  const e = { id: 7, visibility: 'revealed' };
  const t0 = 1_000_000;
  assert.equal(shouldSendView(e, last, t0), true);
  assert.equal(shouldSendView(e, last, t0 + 30_000), false);
  assert.equal(shouldSendView({ id: 8, visibility: 'partial' }, last, t0 + 30_000), true, 'outro cartão não espera');
  assert.equal(shouldSendView(e, last, t0 + VIEW_THROTTLE_MS), true);
  assert.equal(shouldSendView({ id: 9, visibility: 'hidden' }, last, t0), false);
});

test('névoa: determinística, sem números e sem revelar o que está oculto', () => {
  assert.equal(seedOf('abc'), seedOf('abc'));
  assert.notEqual(seedOf('abc'), seedOf('abd'));
  assert.equal(fogLine(5, 'pt'), fogLine(5, 'pt'));
  assert.doesNotMatch(fogLine(5, 'pt'), /\d/);
  for (const h of ['none', 'few', 'some', 'many']) {
    assert.ok(fogHint(h, 'pt'));
    assert.doesNotMatch(fogHint(h, 'pt'), /\d|%/);
  }
  assert.equal(fogHint(undefined, 'pt'), '', 'sem permissão do mestre, nenhuma pista de quantidade');
  const sil = fogSilhouettes(42);
  assert.equal(sil.length, 3, 'sempre 3, não importa quantos cartões ocultos existam');
  assert.deepEqual(fogSilhouettes(42), sil);
});

test('névoa do mapa: clareiras só nos marcadores conhecidos', () => {
  const known = new Map([[10, {}]]);
  const pins = [
    { id: 'a', entryId: 10, x: 0.25, y: 0.5 },
    { id: 'b', entryId: 99, x: 0.7, y: 0.2 },
    { id: 'c', x: 0.1, y: 0.1 },
    { id: 'd', entryId: 10, x: 2, y: -1 },
  ];
  const holes = fogClearings(pins, known);
  assert.deepEqual(holes.map(h => h.id), ['a', 'd']);
  assert.equal(holes[0].x, 25);
  assert.equal(holes[1].x, 100);
  assert.equal(holes[1].y, 0);
});
