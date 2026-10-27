// Casca da campanha (WP3): área inicial, memória, onboarding, busca rápida.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DM_AREAS, PLAYER_AREAS, normalizeArea, legacyTabToArea, areaTapSub, groupBadgeCount, initialArea,
  loadRememberedArea, saveRememberedArea, onboardingStatus, onboardingVisible,
  planHasContent, fold, matchScore, searchItems, nextSessionNumber, defaultCoverArt,
  COVER_ART, isHexColor, subLabel, subShortLabel, SUB_ICONS, TONES,
  campaignRoute, parseCampaignRoute, SETTINGS_SECTIONS, settingsSectionLabel, settingsSummary,
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
  // Grupo › Raio-X (só o mestre): a rota #c/1/group/insights volta ao Raio-X no F5
  assert.deepEqual(normalizeArea(true, 'group', 'insights'), { area: 'group', sub: 'insights' });
  assert.deepEqual(DM_AREAS.find(a => a.id === 'group').subs, ['players', 'requests', 'insights', 'chronicle']);
  assert.deepEqual(initialArea({ isDM: true, fromUrl: { area: 'group', sub: 'insights' } }), { area: 'group', sub: 'insights' });
});

test('abas antigas viram áreas novas', () => {
  assert.deepEqual(legacyTabToArea('combat'), ['play', 'combat']);
  assert.deepEqual(legacyTabToArea('approvals'), ['group', 'requests']);
  assert.deepEqual(legacyTabToArea('members'), ['group', 'players']);
  assert.deepEqual(legacyTabToArea('rolls'), ['play', 'checks']);
  assert.deepEqual(legacyTabToArea('prep'), ['prepare', 'adventures']);
  assert.equal(legacyTabToArea('dice'), null);
});

test('Grupo do mestre: Jogadores · Pedidos · Raio-X · Crônica; o contador leva a Pedidos', () => {
  assert.deepEqual(DM_AREAS.find(a => a.id === 'group').subs, ['players', 'requests', 'insights', 'chronicle']);
  assert.deepEqual(normalizeArea(true, 'group', 'requests'), { area: 'group', sub: 'requests' });
  assert.deepEqual(normalizeArea(true, 'group'), { area: 'group', sub: 'players' });
  assert.equal(subLabel('requests', 'pt'), 'Pedidos');
  assert.equal(subShortLabel('requests', 'en'), 'Requests');
  assert.ok(SUB_ICONS.requests);
  // tocar no Grupo com pedidos esperando → Pedidos; sem pedidos → a padrão
  assert.equal(areaTapSub(true, 'group', { group: 4 }), 'requests');
  assert.equal(areaTapSub(true, 'group', { group: 0 }), null);
  assert.equal(areaTapSub(true, 'group', {}), null);
  assert.equal(areaTapSub(true, 'play', { group: 4 }), null);
  assert.equal(areaTapSub(false, 'group', { group: 4 }), null, 'o jogador não tem Pedidos');
  // o selo fora do Grupo segue a campanha: a conta que o Grupo mandou ao sair (0) não esconde o pedido novo
  assert.equal(groupBadgeCount('world', 0, 1), 1);
  assert.equal(areaTapSub(true, 'group', { group: groupBadgeCount('world', 0, 1) }), 'requests');
  assert.equal(groupBadgeCount('group', 2, 1), 2, 'no Grupo vale a lista viva da área');
  assert.equal(groupBadgeCount('group', 0, 1), 0, 'no Grupo, o recém-resolvido não volta pelo GET atrasado');
  assert.equal(groupBadgeCount('group', null, 3), 3, 'o Grupo ainda não contou: vale a campanha');
  assert.equal(groupBadgeCount('play', null, undefined), 0);
  // F5 em #c/1/group/requests volta para Pedidos
  assert.deepEqual(initialArea({ isDM: true, live: true, fromUrl: parseCampaignRoute('#c/1/group/requests') }), { area: 'group', sub: 'requests' });
  assert.equal(campaignRoute('ecos-de-valdoria', 'group', 'requests'), '#c/ecos-de-valdoria/group/requests');
  // o jogador continua com uma vista só
  assert.deepEqual(normalizeArea(false, 'group', 'requests'), { area: 'group', sub: null });
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

test('segmentado: toda subvista tem rótulo, rótulo curto e ícone', () => {
  const subs = [...new Set([...DM_AREAS, ...PLAYER_AREAS].flatMap(a => a.subs))];
  for (const s of subs) {
    for (const lang of ['pt', 'en']) {
      assert.notEqual(subLabel(s, lang), s, `${s} sem rótulo (${lang})`);
      assert.ok(subShortLabel(s, lang).length <= 10, `${s}: rótulo curto longo demais (${lang})`);
    }
    assert.ok(SUB_ICONS[s], `${s} sem ícone`);
  }
});

test('rótulos curtos do celular (plano §4.2) e o longo continua', () => {
  assert.equal(subShortLabel('timeline', 'pt'), 'Tempo');
  assert.equal(subLabel('timeline', 'pt'), 'Linha do tempo');
  assert.equal(subShortLabel('documents', 'pt'), 'Docs');
  assert.equal(subShortLabel('next', 'pt'), 'Próxima');
  assert.equal(subShortLabel('items', 'pt'), 'Itens');
  assert.equal(subLabel('items', 'pt'), 'Itens da campanha');
  assert.equal(subShortLabel('screen', 'pt'), 'Telão');
  assert.equal(subShortLabel('screen', 'en'), 'TV');
  assert.equal(subShortLabel('requests', 'pt'), 'Pedidos');
  assert.equal(subLabel('insights', 'pt'), 'Raio-X');
  assert.equal(subLabel('insights', 'en'), 'X-ray');
  // sem curto próprio, o curto é o longo
  assert.equal(subShortLabel('scene', 'pt'), 'Cena');
  assert.equal(subShortLabel('players', 'en'), 'Players');
});

test('rota: slug com acento usa o id da campanha (o F5 volta à mesma tela)', () => {
  // seed jogo-e-combate: "A Maldição de Brumafria"
  assert.equal(campaignRoute('a-maldição-de-brumafria', 'play', 'combat', 1), '#c/1/play/combat');
  assert.deepEqual(parseCampaignRoute('#c/1/play/combat'), { slug: '1', area: 'play', sub: 'combat' });
  // slug bom continua sendo o slug, mesmo com o id à mão
  assert.equal(campaignRoute('ecos-de-valdoria', 'world', 'atlas', 7), '#c/ecos-de-valdoria/world/atlas');
  // sem slug: o id; nada que sirva: vazio
  assert.equal(campaignRoute('', 'group', null, 3), '#c/3/group');
  assert.equal(campaignRoute('mesa-nova-de-sábado', 'world', 'atlas'), '');
  assert.equal(campaignRoute('çã', 'world', null, 'x/y'), '');
});

test('Ajustes: as 6 seções da folha "Mais", com rótulo e resumo', () => {
  assert.deepEqual(SETTINGS_SECTIONS.map(s => s.id), ['identity', 'table', 'rules', 'world', 'advanced', 'danger']);
  for (const s of SETTINGS_SECTIONS) {
    assert.ok(s.icon, `${s.id} sem ícone`);
    assert.notEqual(settingsSectionLabel(s.id, 'pt'), s.id);
    assert.notEqual(settingsSectionLabel(s.id, 'en'), s.id);
    assert.ok(settingsSummary(s.id, {}, 'pt').length > 0, `${s.id} sem resumo`);
  }
  assert.equal(settingsSectionLabel('danger', 'pt'), 'Zona de perigo');
  const camp = {
    coverVer: 3, tone: 'mystery', accent: '#6b5ca5', inviteCode: '6T79AF', advancedDice: true,
    state: { levelingMode: 'xp', allowMulticlass: true },
  };
  assert.equal(settingsSummary('identity', camp, 'pt'), 'Capa própria · Mistério · Violeta');
  assert.equal(settingsSummary('identity', {}, 'pt'), 'Arte padrão · sem tom');
  assert.equal(settingsSummary('table', camp, 'pt'), 'Código 6T79AF · link do telão');
  assert.equal(settingsSummary('rules', camp, 'pt'), 'XP · multiclasse permitida');
  assert.equal(settingsSummary('rules', { state: { allowMulticlass: false } }, 'en'), 'Milestones · no multiclass');
  assert.equal(settingsSummary('world', camp, 'pt', { immersion: false }), 'Mundo vivo desligado');
  assert.equal(settingsSummary('advanced', camp, 'pt', { worldCount: 312, worldMax: 500 }), 'Dados preparados ligados · 312/500 cartões');
  assert.equal(settingsSummary('danger', camp, 'pt'), 'Esvaziar o Mundo · Encerrar campanha');
  assert.equal(settingsSummary('danger', { status: 'closed' }, 'pt'), 'Campanha encerrada · Reabrir');
});
