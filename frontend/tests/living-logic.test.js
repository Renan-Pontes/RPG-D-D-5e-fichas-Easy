import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hashStr, immersionOn, emPt, dePt, aPt, midName, numWord, reactionKey, normalizeCounts, normalizeEchoes,
  entryWhispers, echoLines, echoLinesFrom, knownPhrase, skyEdges, skyLayout, blankPages, dayKey, rumorIndex, rumorOfDay,
  confirmNameMatches, SKY_W, SKY_H,
} from '../src/world/living/living-logic.js';
import { RUMORS } from '../src/world/living/rumors.js';

const W = [
  { id: 1, kind: 'place', name: 'Vale de Brumafria', visibility: 'revealed', isMap: true, pinTargets: [3] },
  { id: 2, kind: 'place', name: 'Taverna do Javali Dourado', visibility: 'partial', parentId: 1 },
  { id: 3, kind: 'npc', name: 'Irmã Velna', visibility: 'revealed', links: [{ to: 4, rel: 'member' }], data: { role: 'Vilã' }, secretsCount: 0, mentions: [1] },
  { id: 4, kind: 'faction', name: 'O Círculo do Sino Mudo', visibility: 'hidden' },
  { id: 5, kind: 'lore', name: 'A névoa que canta', visibility: 'hidden' },
];

test('hash é determinístico', () => {
  assert.equal(hashStr('abc'), hashStr('abc'));
  assert.notEqual(hashStr('abc'), hashStr('abd'));
});

test('Mundo vivo: padrão ligado; desliga por campaign.immersion=false', () => {
  assert.equal(immersionOn(null), true);
  assert.equal(immersionOn({}), true);
  assert.equal(immersionOn({ immersion: true }), true);
  assert.equal(immersionOn({ immersion: false }), false);
  assert.equal(immersionOn({ dmSettings: { immersion: false } }), false);
});

test('contrações do português com artigo no nome', () => {
  assert.equal(emPt('O Vale'), 'no Vale');
  assert.equal(emPt('A Torre'), 'na Torre');
  assert.equal(emPt('Brumafria'), 'em Brumafria');
  assert.equal(dePt('O Círculo'), 'do Círculo');
  assert.equal(aPt('A Torre'), 'à Torre');
  assert.equal(aPt('O Vale'), 'ao Vale');
  assert.equal(aPt('Brumafria'), 'a Brumafria');
  assert.equal(emPt('Taverna do Javali'), 'na Taverna do Javali');
  assert.equal(dePt('Vale de Brumafria'), 'do Vale de Brumafria');
  assert.equal(midName('O Círculo do Sino'), 'o Círculo do Sino');
  assert.equal(midName('Osvaldo'), 'Osvaldo');
  assert.equal(numWord(2), 'dois');
  assert.equal(numWord(4, 'en'), 'four');
  assert.equal(numWord(14), '14');
});

test('reações: apelidos e emojis viram o tipo canônico do servidor', () => {
  assert.equal(reactionKey('😱'), 'shiver');
  assert.equal(reactionKey('love'), 'love');
  assert.equal(reactionKey('heart'), 'love');
  assert.equal(reactionKey('❤️'), 'love');
  assert.equal(reactionKey('🤔'), 'doubt');
  assert.equal(reactionKey('⚔️'), 'fight');
  assert.equal(reactionKey('favorite'), 'star');
  assert.equal(reactionKey('nada'), null);
  assert.deepEqual(normalizeCounts({ shiver: 2, love: 1, bogus: 9 }), { shiver: 2, love: 1, doubt: 0, fight: 0, star: 0 });
  assert.deepEqual(normalizeCounts([{ kind: 'fight', count: 3 }, '⭐']), { shiver: 0, love: 0, doubt: 0, fight: 3, star: 1 });
});

test('ecos no formato do servidor (people) viram reatores e leitores, sem contar leituras em dobro', () => {
  const raw = {
    entries: [
      { entryId: 3, reactions: { shiver: 2, doubt: 1 }, favorites: 0, views: 6,
        people: [
          { name: 'Thalion', kinds: ['shiver', 'doubt'], views: 4, lastAt: '2026-10-01T10:00:00Z' },
          { name: 'Mira', kinds: ['shiver'], views: 2, lastAt: '2026-10-02T10:00:00Z' },
        ] },
      { entryId: 1, reactions: {}, favorites: 1, views: 0, people: [{ name: 'Mira', kinds: ['star'], views: 0 }] },
    ],
  };
  const e = normalizeEchoes(raw);
  assert.equal(e[3].counts.shiver, 2);
  assert.equal(e[3].counts.doubt, 1);
  assert.deepEqual(e[3].reactors.shiver, ['Thalion', 'Mira']);
  assert.equal(e[3].views, 6);
  assert.deepEqual(e[3].readers.map(r => r.name), ['Thalion', 'Mira']);
  assert.equal(e[1].counts.star, 1);
  assert.deepEqual(e[1].reactors.star, ['Mira']);
});

test('ecos em listas soltas também funcionam; resposta vazia → {}', () => {
  assert.deepEqual(normalizeEchoes(null), {});
  const e = normalizeEchoes({
    reactions: [{ entryId: 3, kind: '😱', characterName: 'Thalion' }, { entryId: 3, kind: 'fight', name: 'Mira' }],
    views: [{ entryId: 1, memberName: 'Thalion', count: 4 }],
  });
  assert.equal(e[3].counts.shiver, 1);
  assert.deepEqual(e[3].reactors.fight, ['Mira']);
  assert.equal(e[1].readers[0].count, 4);
});

test('frases do cronista: narrativas, com nomes, ignorando cartões desconhecidos', () => {
  const echoes = normalizeEchoes({
    entries: [
      { entryId: 1, people: [{ name: 'Thalion', kinds: [], views: 4 }] },
      { entryId: 3, reactions: { shiver: 2 }, people: [{ name: 'Thalion', kinds: ['shiver'] }, { name: 'Mira', kinds: ['shiver'] }] },
      { entryId: 4, reactions: { doubt: 1 }, people: [{ name: 'Mira', kinds: ['doubt'] }] },
      { entryId: 999, reactions: { shiver: 5 } },
    ],
  });
  const lines = echoLines(echoes, W, 'pt');
  const texts = lines.map(l => l.text);
  assert.ok(texts.includes('Thalion voltou ao mapa do Vale de Brumafria quatro vezes.') || texts.includes('Thalion voltou ao mapa de Vale de Brumafria quatro vezes.'), texts.join(' | '));
  assert.ok(texts.includes('Irmã Velna arrepiou dois jogadores.'), texts.join(' | '));
  assert.ok(texts.includes('Thalion voltou ao mapa do Vale de Brumafria quatro vezes.'), texts.join(' | '));
  const two = echoLines(normalizeEchoes({ entries: [{ entryId: 3, people: [{ name: 'Mira', kinds: [], views: 2 }] }] }), W, 'pt');
  assert.equal(two[0].text, 'Mira voltou duas vezes a pensar em Irmã Velna.');
  const stars = echoLines(normalizeEchoes({ entries: [
    { entryId: 1, people: [{ name: 'Mira', kinds: ['star'] }] },
    { entryId: 3, people: [{ name: 'Mira', kinds: ['star'] }] },
  ] }), W, 'pt').map(l => l.text);
  assert.ok(stars.includes('Mira quer voltar ao Vale de Brumafria.'), stars.join(' | '));
  assert.ok(stars.includes('Mira quer reencontrar Irmã Velna.'), stars.join(' | '));
  assert.ok(texts.includes('Mira desconfia do Círculo do Sino Mudo.'), texts.join(' | '));
  assert.ok(!lines.some(l => l.entryId === 999));
  assert.ok(texts.every(x => !/\d/.test(x)), 'sem números frios');
  const en = echoLines(echoes, W, 'en').map(l => l.text);
  assert.ok(en.includes('Irmã Velna gave two players chills.'));
});

test('sem dados por cartão, usa as frases prontas do servidor (com ícone)', () => {
  const lines = echoLinesFrom({ entries: [], lines: [{ entryId: 3, kind: 'shiver', text: 'Irmã Velna arrepiou Thalion' }, { entryId: 77, kind: 'love', text: 'x' }] }, W, 'pt');
  assert.equal(lines.length, 1);
  assert.equal(lines[0].icon, '😱');
  assert.equal(lines[0].text, 'Irmã Velna arrepiou Thalion.');
});

test('sussurros no cartão do mestre (contagens da lista)', () => {
  const w = entryWhispers({ reactionCounts: { shiver: 2, love: 1 }, favoriteCount: 1, viewCount: 9 });
  assert.equal(w.any, true);
  assert.deepEqual(w.icons.map(i => i.id), ['shiver', 'love', 'star']);
  assert.equal(w.views, 9);
  assert.equal(entryWhispers({ reactionCounts: {}, favoriteCount: 0 }).any, false);
  assert.equal(entryWhispers({}).any, false);
});

test('frase de quanto a mesa conhece: nunca porcentagem', () => {
  assert.equal(knownPhrase(W.slice(0, 3), 'pt'), null); // mundo pequeno: silêncio
  const mk = (rev, n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, visibility: i < rev ? 'revealed' : 'hidden' }));
  assert.match(knownPhrase(mk(3, 9), 'pt'), /um terço/);
  assert.match(knownPhrase(mk(5, 10), 'pt'), /metade/);
  assert.match(knownPhrase(mk(0, 6), 'en'), /not yet/);
  for (let r = 0; r <= 10; r++) assert.ok(!/%|\d/.test(knownPhrase(mk(r, 10), 'pt')));
});

test('céu: ligações sem repetição e só entre cartões existentes', () => {
  const edges = skyEdges(W);
  const keys = edges.map(e => [e.a, e.b].sort().join('-'));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.includes('1-2')); // pai/filho
  assert.ok(keys.includes('3-4')); // ligação
  assert.ok(keys.includes('1-3')); // pin + menção = um traço só
  assert.ok(!skyEdges([{ id: 1, links: [{ to: 42 }] }]).length);
});

test('céu: determinístico, dentro da moldura, estrelas ocultas apagadas', () => {
  const a = skyLayout(W);
  const b = skyLayout(W.slice().reverse());
  assert.deepEqual(a, b);
  for (const s of a.stars) {
    assert.ok(s.x >= 0 && s.x <= SKY_W && s.y >= 0 && s.y <= SKY_H, `${s.id} fora`);
  }
  const l34 = a.lines.find(l => (l.a === 3 && l.b === 4) || (l.a === 4 && l.b === 3));
  assert.equal(l34.lit, false); // facção oculta → traço apagado
  const big = Array.from({ length: 300 }, (_, i) => ({ id: i + 1, kind: ['place', 'npc', 'item'][i % 3], name: `c${i}`, visibility: 'hidden' }));
  const t0 = Date.now();
  const sky = skyLayout(big);
  assert.equal(sky.stars.length, 300);
  assert.ok(Date.now() - t0 < 1500);
});

test('páginas em branco: no máximo duas, em tom de mundo, cartões nascem ocultos', () => {
  const pages = blankPages(W, 'pt', { seed: 7 });
  assert.ok(pages.length > 0 && pages.length <= 2);
  assert.equal(pages[0].key, 'tavern:2');
  assert.equal(pages[0].text, 'Quem serve a cerveja na Taverna do Javali Dourado?');
  assert.equal(pages[0].cta.type, 'create');
  assert.equal(pages[0].cta.fields.kind, 'npc');
  assert.equal(pages[0].cta.fields.visibility, 'hidden');
  assert.equal(pages[0].cta.fields.parentId, 2);
  assert.equal(pages[1].key, 'secret:3');
  assert.deepEqual(pages[1].cta, { type: 'open', id: 3 });
  // determinístico
  assert.deepEqual(blankPages(W, 'pt', { seed: 7 }), pages);
  // "Agora não" tira a pergunta e a próxima sobe
  const next = blankPages(W, 'pt', { seed: 7, dismissed: ['tavern:2'] });
  assert.equal(next[0].key, 'secret:3');
  assert.ok(next.every(p => p.key !== 'tavern:2'));
  assert.deepEqual(blankPages([], 'pt'), []);
  assert.ok(blankPages(W, 'pt', { max: 9 }).length <= 2);
});

test('páginas em branco: "Quem governa…?" quando não há facção', () => {
  const pages = blankPages([{ id: 1, kind: 'place', name: 'O Vale', visibility: 'hidden' }, { id: 2, kind: 'npc', name: 'Rorik', parentId: 1 }], 'pt');
  assert.equal(pages[0].text, 'Quem governa o Vale?');
  assert.equal(pages[0].cta.fields.kind, 'faction');
});

test('rumores: 60+ por idioma, completos, um por dia determinístico', () => {
  assert.ok(RUMORS.length >= 60);
  for (const r of RUMORS) {
    assert.ok(['npc', 'place', 'faction', 'item', 'lore', 'handout'].includes(r.k));
    assert.ok(r.pt && r.en && r.n?.[0] && r.n?.[1]);
    assert.ok(r.pt.length <= 280 && r.en.length <= 280);
    assert.ok(r.n[0].length <= 120);
  }
  const d = new Date(2026, 9, 6, 9);
  const later = new Date(2026, 9, 6, 22);
  assert.equal(dayKey(d), '2026-10-06');
  assert.equal(rumorIndex(RUMORS.length, 12, d), rumorIndex(RUMORS.length, 12, later));
  const days = new Set(Array.from({ length: 20 }, (_, i) => rumorIndex(RUMORS.length, 12, new Date(2026, 9, 1 + i))));
  assert.ok(days.size > 5, 'muda ao longo dos dias');
  assert.equal(rumorIndex(10, 1, d, 1), (rumorIndex(10, 1, d) + 1) % 10);
  const r = rumorOfDay(RUMORS, 12, 'en', d);
  assert.equal(r.text, RUMORS[r.index].en);
  assert.equal(rumorOfDay([], 1), null);
});

test('confirmação de apagar: nome digitado bate com o da campanha', () => {
  assert.equal(confirmNameMatches('Brumas de Velna', 'Brumas de Velna'), true);
  assert.equal(confirmNameMatches('  brumas  de velna ', 'Brumas de Velna'), true);
  assert.equal(confirmNameMatches('Brumas', 'Brumas de Velna'), false);
  assert.equal(confirmNameMatches('', ''), false);
});
