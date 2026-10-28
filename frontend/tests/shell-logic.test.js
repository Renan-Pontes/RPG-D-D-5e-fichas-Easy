// Casca da campanha (WP3): área inicial, memória, onboarding, busca rápida.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DM_AREAS, PLAYER_AREAS, normalizeArea, legacyTabToArea, areaTapSub, groupBadgeCount, initialArea,
  loadRememberedArea, saveRememberedArea, onboardingStatus, onboardingVisible,
  planHasContent, planFlags, prepareMarks, fold, matchScore, searchItems, nextSessionNumber, defaultCoverArt,
  COVER_ART, isHexColor, subLabel, subShortLabel, SUB_ICONS, TONES,
  campaignRoute, parseCampaignRoute, SETTINGS_SECTIONS, settingsSectionLabel, settingsSummary,
  NAV_PLACES, navSearchItems, planCardSummary, savePlanCard, loadPlanCard, campaignNextLine,
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

test('área inicial do mestre (especificação §2.4)', () => {
  // ao vivo → Jogar › Agora (sub `scene`); combate → Jogar › Combate
  assert.deepEqual(initialArea({ isDM: true, live: true, remembered: { area: 'world' } }), { area: 'play', sub: 'scene' });
  assert.deepEqual(initialArea({ isDM: true, combatActive: true }), { area: 'play', sub: 'combat' });
  // lembrada
  assert.deepEqual(initialArea({ isDM: true, remembered: { area: 'group', sub: 'chronicle' } }), { area: 'group', sub: 'chronicle' });
  // nada lembrado (campanha nova, outro aparelho) → Preparar › Plano, com as 3 portas
  // (os primeiros passos pendentes não levam mais ao Mundo)
  assert.deepEqual(initialArea({ isDM: true, onboardingPending: true }), { area: 'prepare', sub: 'next' });
  assert.deepEqual(initialArea({ isDM: true }), { area: 'prepare', sub: 'next' });
  assert.equal(subLabel('next', 'pt'), 'Plano');
  assert.equal(subLabel('next', 'en'), 'Plan');
  assert.equal(subLabel('items', 'pt'), 'Itens');
  assert.equal(subShortLabel('next', 'pt'), 'Plano');
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

test('selo "!" de Preparar: plano em branco (sem começo e sem cena) fora da sessão ao vivo', () => {
  const blank = planFlags({ strongStart: ' ', scenes: [{ text: '' }], secrets: [{ text: 'O moleiro mente' }] });
  assert.deepEqual(blank, { has: true, blank: true }, 'só pistas: tem conteúdo, mas está em branco para preparar');
  assert.deepEqual(prepareMarks({ flags: blank, lang: 'pt' }), [{ k: 'empty', icon: '!', label: 'plano vazio' }]);
  assert.equal(prepareMarks({ flags: blank, lang: 'en' })[0].label, 'empty plan');
  assert.deepEqual(prepareMarks({ flags: blank, live: true }), [], 'ao vivo: nada');
  assert.deepEqual(prepareMarks({ flags: blank, closed: true }), [], 'encerrada: nada');
  assert.deepEqual(prepareMarks({ flags: null }), [], 'plano ainda não lido (ou servidor sem a rota): nada');
  assert.equal(planFlags(null), null);
  assert.deepEqual(prepareMarks({ flags: planFlags({ strongStart: 'O sino toca' }) }), []);
  assert.deepEqual(prepareMarks({ flags: planFlags({ scenes: [{ text: '', nodeRef: { adventureId: 1, nodeId: 'n1' } }] }) }), [],
    'cena ligada a uma sala conta como cena');
  assert.deepEqual(prepareMarks({ flags: planFlags({}) }).length, 1);
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
  assert.equal(subLabel('next', 'pt'), 'Plano');
  assert.equal(subLabel('next', 'en'), 'Plan');
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
  // V14: Mundo é Cartões · Mapas · Tempo (§9.1), no curto e no longo
  assert.equal(subShortLabel('timeline', 'pt'), 'Tempo');
  assert.equal(subLabel('timeline', 'pt'), 'Tempo');
  assert.deepEqual(['atlas', 'map', 'timeline'].map(s => subLabel(s, 'pt')), ['Cartões', 'Mapas', 'Tempo']);
  assert.deepEqual(['atlas', 'map', 'timeline'].map(s => subLabel(s, 'en')), ['Cards', 'Maps', 'Timeline']);
  assert.equal(subShortLabel('documents', 'pt'), 'Docs');
  // Preparar: Plano · Aventuras · Itens (§9.1), iguais no curto e no longo
  assert.equal(subShortLabel('next', 'pt'), 'Plano');
  assert.equal(subShortLabel('items', 'pt'), 'Itens');
  assert.equal(subLabel('items', 'pt'), 'Itens');
  assert.equal(subShortLabel('screen', 'pt'), 'Tela');
  assert.equal(subShortLabel('screen', 'en'), 'Screen');
  assert.equal(subShortLabel('requests', 'pt'), 'Pedidos');
  assert.equal(subLabel('insights', 'pt'), 'Raio-X');
  assert.equal(subLabel('insights', 'en'), 'X-ray');
  // sem curto próprio, o curto é o longo
  // V7: a sub-aba "Cena" de Jogar virou "Agora" (o id da rota continua 'scene')
  assert.equal(subShortLabel('scene', 'pt'), 'Agora');
  assert.equal(subLabel('scene', 'en'), 'Now');
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
  assert.equal(settingsSummary('table', camp, 'pt'), 'Código 6T79AF · link da Tela');
  assert.equal(settingsSummary('rules', camp, 'pt'), 'XP · multiclasse permitida');
  assert.equal(settingsSummary('rules', { state: { allowMulticlass: false } }, 'en'), 'Milestones · no multiclass');
  assert.equal(settingsSummary('world', camp, 'pt', { immersion: false }), 'Mundo vivo desligado');
  assert.equal(settingsSummary('advanced', camp, 'pt', { worldCount: 312, worldMax: 500 }), 'Dados preparados ligados · 312/500 cartões');
  assert.equal(settingsSummary('danger', camp, 'pt'), 'Esvaziar o Mundo · Encerrar campanha');
  assert.equal(settingsSummary('danger', { status: 'closed' }, 'pt'), 'Campanha encerrada · Reabrir');
});

// ---------------------------------------------------------------- V14
test('busca do mestre: o nome de antes acha o lugar de hoje (§2.6)', () => {
  const order = { kindOrder: ['nav', 'npc'] };
  const first = (q, lang = 'pt') => searchItems(navSearchItems(lang), q, order)[0];
  assert.equal(first('telão').label, 'Tela');
  assert.deepEqual(first('telão').go, ['play', 'screen']);
  assert.equal(first('Telao').label, 'Tela');                 // sem acento e com maiúscula
  assert.equal(first('próxima sessão').label, 'Plano');
  assert.deepEqual(first('proxima sessao').go, ['prepare', 'next']);
  assert.equal(first('encontro').label, 'Combate');
  assert.equal(first('recap').label, 'Resumo da sessão');
  assert.deepEqual(first('recap').go, ['group', 'chronicle', { recap: true }]);
  assert.equal(first('atlas').label, 'Cartões');
  assert.equal(first('conduzir').label, 'Aventuras');
  assert.equal(first('tela').label, 'Tela');                  // pelo nome de hoje também
  assert.equal(first('guia').guide, 0);                       // o Guia do mestre
  // em inglês
  assert.equal(first('tv screen', 'en').label, 'Screen');
  assert.equal(first('next session', 'en').label, 'Plan');
  assert.equal(first('encounter', 'en').label, 'Combat');
  // o resultado diz o nome antigo e onde mora
  assert.match(first('telão').sub, /Jogar · antes: Telão/);
  assert.match(first('plano').sub, /Preparar · antes: Próxima sessão/);
  // todo lugar leva a uma subvista que existe (ou ao Guia)
  const subs = new Set([...DM_AREAS].flatMap(a => a.subs.map(x => `${a.id}/${x}`)));
  for (const p of NAV_PLACES) {
    if (p.guide != null) continue;
    assert.ok(subs.has(`${p.go[0]}/${p.go[1]}`), p.id);
  }
  // ids únicos
  assert.equal(new Set(navSearchItems('pt').map(x => x.id)).size, NAV_PLACES.length);
});

test('cartão da campanha: a linha de próximo passo (só o mestre, sem pedido novo)', () => {
  const dm = (state, extra = {}) => ({ id: 7, role: 'dm', status: 'active', state, ...extra });
  const plan = { forSession: 5, strongStart: 'O sino toca', scenes: [{ id: 'c1', text: 'Ponte' }, { id: 'c2', text: 'Cripta' }, { id: 'c3', text: '  ' }] };
  const sum = planCardSummary(plan, { session: 'Sessão 4' });
  assert.deepEqual(sum, { n: 5, scenes: 2, blank: false, stale: false, live: false, session: 4 });
  assert.equal(campaignNextLine(dm({ session: 'Sessão 4' }), sum, 'pt'), 'Plano da Sessão 5: 2 cenas');
  assert.equal(campaignNextLine(dm({ session: 'Sessão 4' }), sum, 'en'), 'Session 5 plan: 2 scenes');
  // sem o resumo (outro aparelho, janela privada): o aparelho não sabe como está o plano,
  // então a linha é neutra e não manda "preparar" (o plano pode estar pronto no PC)
  assert.equal(campaignNextLine(dm({ session: '4' }), null, 'pt'), 'Próxima: Sessão 5 · abra para ver o Plano');
  assert.equal(campaignNextLine(dm({}), null, 'pt'), 'Próxima: Sessão 1 · abra para ver o Plano');
  assert.equal(campaignNextLine(dm({}), null, 'en'), 'Next: session 1 · open to see the plan');
  // o resumo guardado diz que o plano está vazio: aí sim, o próximo passo é preparar
  const blank = planCardSummary({ scenes: [] }, { session: '4' });
  assert.equal(campaignNextLine(dm({ session: '4' }), blank, 'pt'), 'Próximo passo: preparar o Plano da Sessão 5');
  assert.equal(campaignNextLine(dm({ session: '4' }), blank, 'en'), 'Next step: prepare the session 5 plan');
  // …ou que o plano é de uma sessão já jogada (stale)
  const old = planCardSummary({ forSession: 4, strongStart: 'O sino', scenes: [{ id: 'c1', text: 'Ponte' }] }, { session: '4' });
  assert.equal(old.stale, true);
  assert.equal(campaignNextLine(dm({ session: '4' }), old, 'pt'), 'Próximo passo: preparar o Plano da Sessão 5');
  // o resumo guardado é de outra situação (a sessão 5 já foi jogada): não vale, linha neutra
  assert.equal(campaignNextLine(dm({ session: '5' }), sum, 'pt'), 'Próxima: Sessão 6 · abra para ver o Plano');
  // ao vivo
  const liveSum = planCardSummary({ forSession: 4, scenes: [{ id: 'c1', text: 'a' }] }, { session: '4', live: true });
  assert.equal(campaignNextLine(dm({ session: '4', live: true }), liveSum, 'pt'), 'Sessão 4 ao vivo · Plano de hoje: 1 cena');
  assert.equal(campaignNextLine(dm({ session: '4', live: true }), sum, 'pt'), 'Sessão 4 ao vivo · volte para Jogar › Agora');
  // só o começo
  const opening = planCardSummary({ strongStart: 'Fogo!', scenes: [] }, { session: '1' });
  assert.equal(campaignNextLine(dm({ session: '1' }), opening, 'pt'), 'Plano da Sessão 2: só o começo, sem cenas');
  // jogador e campanha encerrada: nada
  assert.equal(campaignNextLine({ ...dm({ session: '4' }), role: 'player' }, sum, 'pt'), null);
  assert.equal(campaignNextLine(dm({ session: '4' }, { status: 'closed' }), sum, 'pt'), null);
  // guardar e ler no aparelho
  const st = memStorage();
  savePlanCard(7, sum, st);
  assert.deepEqual(loadPlanCard(7, st), sum);
  assert.equal(loadPlanCard(8, st), null);
  assert.equal(planCardSummary(null, {}), null);
});
