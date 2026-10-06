// Casca da campanha (WP3): área inicial, memória, onboarding, busca rápida.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DM_AREAS, PLAYER_AREAS, normalizeArea, legacyTabToArea, initialArea,
  loadRememberedArea, saveRememberedArea, onboardingStatus, onboardingVisible,
  planHasContent, fold, matchScore, searchItems, nextSessionNumber, defaultCoverArt,
  COVER_ART, isHexColor, subLabel, TONES,
} from '../src/shell/shell-logic.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test('áreas: 4 do mestre e 4 do jogador, na ordem das teclas', () => {
  assert.deepEqual(DM_AREAS.map(a => a.id), ['world', 'prepare', 'play', 'group']);
  assert.deepEqual(PLAYER_AREAS.map(a => a.id), ['table', 'world', 'chronicle', 'group']);
});

test('normalizeArea: sub inválida cai na padrão; área inválida → null', () => {
  assert.deepEqual(normalizeArea(true, 'play', 'combat'), { area: 'play', sub: 'combat' });
  assert.deepEqual(normalizeArea(true, 'play', 'nope'), { area: 'play', sub: 'scene' });
  assert.deepEqual(normalizeArea(true, 'world'), { area: 'world', sub: 'atlas' });
  assert.equal(normalizeArea(true, 'table'), null);           // aba de jogador
  assert.equal(normalizeArea(false, 'prepare'), null);        // área de mestre
  assert.deepEqual(normalizeArea(false, 'table', 'x'), { area: 'table', sub: null });
});

test('abas antigas viram áreas novas', () => {
  assert.deepEqual(legacyTabToArea('combat'), ['play', 'combat']);
  assert.deepEqual(legacyTabToArea('approvals'), ['group', 'players']);
  assert.deepEqual(legacyTabToArea('rolls'), ['play', 'checks']);
  assert.deepEqual(legacyTabToArea('prep'), ['prepare', 'adventures']);
  assert.equal(legacyTabToArea('dice'), null);
});

test('área inicial do mestre (DESIGN 1.4)', () => {
  // ao vivo ou combate → Jogar
  assert.deepEqual(initialArea({ isDM: true, live: true, remembered: { area: 'world' } }), { area: 'play', sub: 'scene' });
  assert.deepEqual(initialArea({ isDM: true, combatActive: true }), { area: 'play', sub: 'combat' });
  // lembrada
  assert.deepEqual(initialArea({ isDM: true, onboardingPending: true, remembered: { area: 'group', sub: 'chronicle' } }), { area: 'group', sub: 'chronicle' });
  // onboarding pendente → Mundo
  assert.deepEqual(initialArea({ isDM: true, onboardingPending: true }), { area: 'world', sub: 'atlas' });
  // resto → Preparar › Próxima sessão
  assert.deepEqual(initialArea({ isDM: true }), { area: 'prepare', sub: 'next' });
  // lembrança inválida é ignorada
  assert.deepEqual(initialArea({ isDM: true, remembered: { area: 'table' } }), { area: 'prepare', sub: 'next' });
});

test('área inicial do jogador: lembrada ou Mesa', () => {
  assert.deepEqual(initialArea({ isDM: false }), { area: 'table', sub: null });
  assert.deepEqual(initialArea({ isDM: false, live: true, remembered: { area: 'world', sub: 'map' } }), { area: 'world', sub: 'map' });
});

test('memória da área por campanha (tolerante a storage quebrado)', () => {
  const s = memStorage();
  assert.equal(loadRememberedArea(7, s), null);
  saveRememberedArea(7, { area: 'play', sub: 'combat' }, s);
  assert.deepEqual(loadRememberedArea(7, s), { area: 'play', sub: 'combat' });
  assert.equal(loadRememberedArea(8, s), null);
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(loadRememberedArea(7, broken), null);
  assert.doesNotThrow(() => saveRememberedArea(7, { area: 'world' }, broken));
  const garbage = { getItem: () => '{not json', setItem() {} };
  assert.equal(loadRememberedArea(7, garbage), null);
});

test('onboarding: passos se marcam sozinhos pelos dados', () => {
  const base = { members: [{ role: 'dm' }], state: {}, onboarding: {} };
  let st = onboardingStatus(base);
  assert.equal(st.count, 0);
  assert.equal(st.complete, false);
  assert.ok(onboardingVisible(st));

  st = onboardingStatus({ ...base, coverVer: 'abc', members: [{ role: 'dm' }, { role: 'player' }], state: { session: '2' } }, { worldCount: 3 });
  assert.deepEqual(st.done, { cover: true, firstEntry: true, invite: true, prepare: true, tv: false });
  assert.equal(st.count, 4);

  st = onboardingStatus({ ...base, onboarding: { tv: true, cover: true, invite: true } }, { worldCount: 1, planHasContent: true });
  assert.equal(st.complete, true);
  assert.equal(onboardingVisible(st), false);

  st = onboardingStatus({ ...base, onboarding: { dismissed: true } });
  assert.equal(onboardingVisible(st), false);
});

test('planHasContent', () => {
  assert.equal(planHasContent(null), false);
  assert.equal(planHasContent({ strongStart: '  ', scenes: [{ text: '' }], npcIds: [] }), false);
  assert.equal(planHasContent({ strongStart: 'Emboscada na ponte' }), true);
  assert.equal(planHasContent({ secrets: [{ text: 'O prefeito mente' }] }), true);
  assert.equal(planHasContent({ npcIds: [3] }), true);
});

test('busca: ignora acento e caixa, prioriza começo do nome', () => {
  assert.equal(fold('Irmã Velna'), 'irma velna');
  assert.ok(matchScore('Irmã Velna', 'irma') > matchScore('Velna, a irmã', 'irma'));
  const items = [
    { id: 1, kind: 'place', label: 'Vale de Brumafria' },
    { id: 2, kind: 'npc', label: 'Irmã Velna', keywords: 'sacerdotisa templo' },
    { id: 3, kind: 'monster', label: 'Velociraptor' },
    { id: 4, kind: 'npc', label: 'Taverneiro Bruno' },
  ];
  assert.deepEqual(searchItems(items, 'velna').map(x => x.id), [2]);
  assert.deepEqual(searchItems(items, 'vel', { kindOrder: ['npc', 'place', 'monster'] }).map(x => x.id), [3, 2]);
  assert.deepEqual(searchItems(items, 'bru', { kindOrder: ['npc', 'place'] }).map(x => x.id), [4, 1]);
  assert.deepEqual(searchItems(items, 'sacerdotisa').map(x => x.id), [2]);   // por palavra-chave
  assert.deepEqual(searchItems(items, ''), []);
  assert.equal(searchItems(items, 'a', { limit: 2 }).length, 2);
});

test('busca em 500 cartões é instantânea', () => {
  const items = Array.from({ length: 500 }, (_, i) => ({ id: i, kind: 'npc', label: `NPC ${i} de Brumafria`, keywords: 'tag' }));
  items.push({ id: 'x', kind: 'npc', label: 'Irmã Velna' });
  const t0 = performance.now();
  const r = searchItems(items, 'irma ve');
  assert.equal(r[0].id, 'x');
  assert.ok(performance.now() - t0 < 100);
});

test('sessão, cores, capa padrão, rótulos', () => {
  assert.equal(nextSessionNumber({}), 1);
  assert.equal(nextSessionNumber({ session: '4' }), 5);
  assert.equal(nextSessionNumber({ session: 'abc' }), 1);
  assert.ok(isHexColor('#b8862b'));
  assert.ok(!isHexColor('red'));
  assert.equal(defaultCoverArt({ id: 3 }), defaultCoverArt({ id: 3 }));
  assert.ok(COVER_ART.includes(defaultCoverArt({ id: 12345 })));
  assert.ok(COVER_ART.includes(defaultCoverArt(null)));
  assert.equal(subLabel('next', 'pt'), 'Próxima sessão');
  assert.equal(subLabel('next', 'en'), 'Next session');
  assert.deepEqual(TONES.map(x => x.id), ['heroic', 'dark', 'mystery', 'comic', 'epic']);
});
