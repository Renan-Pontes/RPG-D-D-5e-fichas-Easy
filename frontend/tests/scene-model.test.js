import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENE_BLOCKS, sceneView, presentBlocks, writeBlock, linkScene, unlinkScene, hasRoomPockets, roomHasPockets,
  nodeCheckToCheck, checkToNodeCheck, encounterToFight, fightToEncounter, sceneSnap, snapSize, snapCount, fightEntry,
  sceneMoments, spotKey, parseSpot, sceneMomentIdeas, sceneCheckIdea, fightDifficulty, sceneIcons, sceneHeading, whatField, closeScene,
  showOnStartVisible, lightNode, nodeWithoutImage, firstImageRef, SCENE_LIMITS, DC_CHIPS, parseDc, customDc,
} from '../src/prep/scene-model.js';

const world = [
  { id: 3, kind: 'npc', name: 'Velho Toran', imageVer: '' },
  { id: 7, kind: 'place', name: 'Ponte velha', imageVer: 'abc' },
  { id: 9, kind: 'npc', name: 'Irmã Velna', imageVer: 'def' },
];
const room = {
  id: 'n2', name: 'Templo da Névoa', readAloud: 'Bancos vazios.', refs: [3, 9], hasImage: false,
  encounter: [{ monsterId: 'cultist', name: 'Cultista', crNum: 0.125, count: 3 }],
  checks: [{ skill: 'investigation', dc: 13, note: 'alçapão' }, { skill: 'save:wis', dc: 12, note: '', dcHidden: true }],
};

test('a paleta tem os 7 blocos na ordem da tela', () => {
  assert.deepEqual(SCENE_BLOCKS.map(b => b.id), ['read', 'show', 'refs', 'fight', 'check', 'spots', 'notes']);
});

test('cena solta: tudo vem do plano; os blocos com conteúdo ganham o ✓', () => {
  const s = { id: 'c1', text: 'Ponte velha', read: 'A ponte range.', show: { kind: 'entry', id: 7 }, refs: [3],
    fight: [{ monsterId: 'goblin', name: 'Goblin', cr: 0.25, count: 2 }], check: { kind: 'skill', key: 'perception', dc: 13 },
    spots: ['14:m1'], notes: '', what: 'Goblins sob a ponte' };
  const v = sceneView(s);
  assert.equal(v.linked, false);
  assert.equal(v.read, 'A ponte range.');
  assert.deepEqual(v.show, { kind: 'entry', id: 7 });
  assert.equal(v.showFrom, 'scene');
  assert.deepEqual(v.checks, [{ kind: 'skill', key: 'perception', dc: 13 }]);
  assert.deepEqual(presentBlocks(v), ['read', 'show', 'refs', 'fight', 'check', 'spots']);
  assert.equal(v.showOnStart, true, 'ligado por padrão');
  assert.equal(sceneView({ ...s, showOnStart: false }).showOnStart, false);
  assert.deepEqual(presentBlocks(sceneView({ id: 'c2', text: 'Nada' })), []);
  assert.equal(showOnStartVisible(sceneView({ id: 'c2', text: 'x' })), false);
  assert.equal(showOnStartVisible(sceneView({ id: 'c2', text: 'x', read: 'oi' })), true);
});

test('cena ligada: ler, imagem, quem aparece, combate e teste vêm da sala', () => {
  const s = { id: 'c2', text: 'Descer ao lago', nodeRef: { adventureId: 1, nodeId: 'n2' }, read: 'velho', spots: ['14:m1'], notes: 'só eu' };
  const v = sceneView(s, room, { world });
  assert.equal(v.linked, true);
  assert.equal(v.read, 'Bancos vazios.', 'o texto da sala, não o que sobrou na cena');
  assert.deepEqual(v.refs, [3, 9]);
  assert.deepEqual(v.show, { kind: 'entry', id: 9 }, 'a imagem é o 1º cartão da sala com imagem');
  assert.equal(v.showFrom, 'ref');
  assert.deepEqual(v.fight, [{ monsterId: 'cultist', name: 'Cultista', cr: 0.125, count: 3 }]);
  assert.deepEqual(v.checks, [{ kind: 'skill', key: 'investigation', dc: 13, note: 'alçapão' }, { kind: 'save', key: 'wis', dc: 12, dcHidden: true }]);
  assert.deepEqual(v.spots, ['14:m1'], 'o momento fica no plano');
  assert.equal(v.notes, 'só eu');
  // sem cartão com imagem, a imagem própria da sala
  const v2 = sceneView(s, { ...room, refs: [3], hasImage: true }, { world });
  assert.deepEqual(v2.show, { kind: 'node', advId: 1, nodeId: 'n2' });
  assert.equal(v2.showFrom, 'room');
  // a sala ainda não chegou: só o que é do plano
  assert.equal(sceneView(s, null).read, '');
});

test('writeBlock: um lugar por dado', () => {
  assert.deepEqual(writeBlock('read', 'Oi', { linked: false }), { scene: { read: 'Oi' } });
  assert.deepEqual(writeBlock('read', 'Oi', { linked: true }), { node: { readAloud: 'Oi' } });
  assert.deepEqual(writeBlock('notes', 'x', { linked: true }), { scene: { notes: 'x' } }, 'notas sempre no plano');
  assert.deepEqual(writeBlock('spots', ['14:m1'], { linked: true }), { scene: { spots: ['14:m1'] } });
  assert.deepEqual(writeBlock('check', [{ kind: 'save', key: 'dex', dc: 15, dcHidden: true }, { kind: 'skill', key: 'x' }], { linked: false }),
    { scene: { check: { kind: 'save', key: 'dex', dc: 15, dcHidden: true } } }, 'a cena solta guarda 1 teste');
  assert.deepEqual(writeBlock('check', [], { linked: false }), { scene: { check: null } });
  assert.deepEqual(writeBlock('check', [{ kind: 'save', key: 'dex', dc: 15 }], { linked: true }),
    { node: { checks: [{ skill: 'save:dex', dc: 15, note: '' }] } });
  assert.deepEqual(writeBlock('fight', [{ monsterId: 'goblin', name: 'Goblin', cr: 0.25, count: 2 }], { linked: true }),
    { node: { encounter: [{ monsterId: 'goblin', name: 'Goblin', count: 2, crNum: 0.25 }] } });
  // imagem na cena ligada: o cartão vai ao 1º lugar dos cartões da sala
  assert.deepEqual(writeBlock('show', { kind: 'entry', id: 7 }, { linked: true, refs: [3, 7, 9] }), { node: { refs: [7, 3, 9] } });
  assert.deepEqual(writeBlock('show', null, { linked: false }), { scene: { show: null } });
});

test('cena ligada: tirar a imagem não tira o cartão da sala (fica no plano: showOff)', () => {
  const s = { id: 'c2', text: 'Templo', nodeRef: { adventureId: 1, nodeId: 'n2' } };
  const node = { ...room, refs: [7, 9, 3] };
  const v = sceneView(s, node, { world });
  assert.deepEqual(v.show, { kind: 'entry', id: 7 });
  // "Tirar" / ✕: só o plano muda; a sala continua com os 3 cartões
  const off = writeBlock('show', null, { linked: true, refs: v.refs, showFrom: v.showFrom, show: v.show, showOff: v.showOff, world });
  assert.deepEqual(off, { scene: { showOff: true } });
  const v2 = sceneView({ ...s, ...off.scene }, node, { world });
  assert.equal(v2.show, null, 'nenhuma imagem: nem a do próximo cartão');
  assert.equal(v2.showFrom, null);
  assert.deepEqual(v2.refs, [7, 9, 3], '🎭 Quem aparece continua igual');
  assert.equal(presentBlocks(v2).includes('show'), false);
  assert.equal(showOnStartVisible({ ...v2, read: '' }), false);
  // ↶ Desfazer (o mesmo cartão, que já é o 1º com imagem): volta sem regravar a sala
  assert.deepEqual(writeBlock('show', v.show, { linked: true, refs: v2.refs, showFrom: v2.showFrom, show: v2.show, showOff: v2.showOff, world }),
    { scene: { showOff: false } });
  // escolher outro cartão: ele vai ao 1º lugar e a cena volta a ter imagem
  assert.deepEqual(writeBlock('show', { kind: 'entry', id: 9 }, { linked: true, refs: v2.refs, showOff: true, world }),
    { scene: { showOff: false }, node: { refs: [9, 7, 3] } });
  // a imagem própria da sala: tirar e desfazer também só mexem no plano
  const vr = sceneView(s, { ...room, refs: [3], hasImage: true }, { world });
  assert.deepEqual(writeBlock('show', null, { linked: true, refs: vr.refs, showFrom: vr.showFrom, show: vr.show, world }), { scene: { showOff: true } });
  assert.deepEqual(writeBlock('show', vr.show, { linked: true, refs: vr.refs, showOff: true, world }), { scene: { showOff: false } });
  assert.equal(writeBlock('show', null, { linked: true, refs: [3], world }), null, 'sem imagem: nada a gravar');
  // ligar de novo (a outra sala) e desligar limpam o "sem imagem"
  assert.equal(linkScene({ ...s, showOff: true, nodeRef: null }, { adventureId: 1, nodeId: 'n3' }, null, { carry: false }).scene.showOff, false);
  assert.equal(unlinkScene({ ...s, showOff: true }, node, { copy: false }).showOff, false);
  const copied = unlinkScene({ ...s, showOff: true }, node, { world });
  assert.equal(copied.show, null, 'copiar não traz a imagem que o mestre tirou');
  assert.deepEqual(copied.refs, [7, 9, 3]);
  assert.equal(sceneView({ id: 'c9', text: 'solta', showOff: true, show: { kind: 'entry', id: 7 } }).show.id, 7, 'a cena solta não usa showOff');
});

test('🎯 CD: os chips são atalhos; a CD livre vai de 1 a 40 e volta igual da sala', () => {
  assert.deepEqual(DC_CHIPS, [10, 12, 13, 15, 18, 20]);
  assert.equal(parseDc('14'), 14);
  assert.equal(parseDc(' 7 '), 7);
  for (const bad of ['', '0', '41', '1.5', 'x', '-3', '100', null, undefined]) assert.equal(parseDc(bad), null, String(bad));
  assert.equal(customDc(14), 14);
  assert.equal(customDc(13), null, '13 é um chip');
  assert.equal(customDc(undefined), null);
  // a CD 14 que veio da sala (as aventuras prontas têm várias) não se perde ao editar outro campo
  const s = { id: 'c2', text: 'Templo', nodeRef: { adventureId: 1, nodeId: 'n2' } };
  const node = { ...room, checks: [{ skill: 'investigation', dc: 14, note: 'achar o alçapão' }] };
  const v = sceneView(s, node, { world });
  assert.equal(v.checks[0].dc, 14);
  const edited = v.checks.map(c => ({ ...c, note: 'o alçapão sob o altar' }));
  assert.deepEqual(writeBlock('check', edited, { linked: true }).node.checks, [{ skill: 'investigation', dc: 14, note: 'o alçapão sob o altar' }]);
  const solto = writeBlock('check', [{ kind: 'skill', key: 'investigation', dc: 14 }].map(c => ({ ...c, dcHidden: true })), { linked: false });
  assert.deepEqual(solto.scene.check, { kind: 'skill', key: 'investigation', dc: 14, dcHidden: true });
});

test('testes e combate passam de cena para sala e voltam iguais', () => {
  for (const c of [{ kind: 'skill', key: 'stealth', dc: 15 }, { kind: 'save', key: 'wis', dc: 13, dcHidden: true }, { kind: 'ability', key: 'str' }]) {
    const back = nodeCheckToCheck(checkToNodeCheck(c));
    assert.deepEqual(back, c);
  }
  assert.equal(nodeCheckToCheck({ skill: '' }), null);
  const f = { monsterId: 'goblin', name: 'Goblin', cr: 0.25, count: 2 };
  assert.deepEqual(encounterToFight(fightToEncounter(f)), f);
  // a sala regrava o monstro personalizado inteiro; a cena guarda o corte de 8 KB (ou só o nome)
  const huge = { monsterId: 'custom-x', name: 'X', count: 1, snapshot: { id: 'custom-x', actions: Array.from({ length: 40 }, () => ({ desc: 'z'.repeat(290) })) } };
  assert.equal(encounterToFight(huge, { raw: true }).snap, huge.snapshot);
  assert.equal(encounterToFight(huge).snap, undefined);
  assert.equal(fightToEncounter(encounterToFight(huge, { raw: true })).snapshot, huge.snapshot);
  assert.equal(encounterToFight({ monsterId: 'x', name: 'X', count: 50 }).count, 20, 'teto da cena');
});

test('ligar uma cena com bolsos: [Levar] junta à sala; [Usar só o da sala] não leva', () => {
  const s = { id: 'c1', text: 'Ponte', read: 'A névoa sobe.', show: { kind: 'entry', id: 7 }, refs: [3],
    fight: [{ monsterId: 'goblin', name: 'Goblin', cr: 0.25, count: 2 }], check: { kind: 'skill', key: 'investigation', dc: 15 } };
  assert.equal(hasRoomPockets(s), true);
  assert.equal(hasRoomPockets({ id: 'c1', text: 'Ponte', notes: 'x', spots: ['1:m1'] }), false, 'notas e momentos ficam no plano');
  const ref = { adventureId: 1, nodeId: 'n2' };
  const { scene, node } = linkScene(s, ref, room);
  assert.deepEqual(scene, { nodeRef: ref, read: '', show: null, refs: [], fight: [], check: null });
  assert.equal(node.readAloud, 'Bancos vazios.\n\nA névoa sobe.');
  assert.deepEqual(node.refs, [7, 3, 9]);
  assert.equal(node.encounter.length, 2);
  assert.equal(node.checks, undefined, 'a sala já tinha Investigação: não repete');
  const only = linkScene(s, ref, room, { carry: false });
  assert.equal(only.node, null);
  assert.deepEqual(only.scene.nodeRef, ref);
});

test('desligar: [Copiar] traz o que a sala tem para a cena (nos tetos da cena)', () => {
  const s = { id: 'c2', text: 'Lago', nodeRef: { adventureId: 1, nodeId: 'n2' } };
  assert.equal(roomHasPockets(room), true);
  assert.equal(roomHasPockets({ refs: [], encounter: [] }), false);
  const p = unlinkScene(s, room, { world });
  assert.equal(p.nodeRef, null);
  assert.equal(p.read, 'Bancos vazios.');
  assert.deepEqual(p.refs, [3, 9]);
  assert.deepEqual(p.show, { kind: 'entry', id: 9 });
  assert.deepEqual(p.check, { kind: 'skill', key: 'investigation', dc: 13 });
  assert.equal(p.fight[0].count, 3);
  assert.deepEqual(unlinkScene(s, room, { copy: false }), { nodeRef: null });
});

test('"meus monstros" na cena: sem imagem, descrições cortadas, 8 KB e 4 no plano', () => {
  const ogre = { id: 'custom-ogro', custom: true, name: { pt: 'Ogro' }, crNum: 2, portrait: 'data:image/png;base64,AAA',
    description: 'x'.repeat(2000), actions: [{ name: 'Clava', desc: 'y'.repeat(900) }] };
  const snap = sceneSnap(ogre);
  assert.equal('portrait' in snap, false);
  assert.equal(snap.description.length, SCENE_LIMITS.snapDesc);
  assert.equal(snap.actions[0].desc.length, SCENE_LIMITS.snapDesc);
  const ok = fightEntry(ogre, 2, { lang: 'pt', plan: { scenes: [] }, sceneId: 'c1' });
  assert.deepEqual(ok.entry && { ...ok.entry, snap: undefined }, { monsterId: 'custom-ogro', name: 'Ogro', cr: 2, count: 2, snap: undefined });
  assert.ok(ok.entry.snap);
  const big = { ...ogre, actions: Array.from({ length: 40 }, (_, i) => ({ name: `G${i}`, desc: 'z'.repeat(290) })) };
  assert.ok(snapSize(sceneSnap(big)) > SCENE_LIMITS.snapBytes);
  assert.deepEqual(fightEntry(big, 1, { plan: { scenes: [] } }), { entry: null, error: 'scene_monster_too_large' });
  const four = { scenes: [{ id: 'a', fight: [{ snap: {} }, { snap: {} }] }, { id: 'b', fight: [{ snap: {} }, { snap: {} }, { monsterId: 'goblin' }] }] };
  assert.equal(snapCount(four), 4);
  assert.equal(snapCount(four, 'a'), 2);
  assert.equal(fightEntry(ogre, 1, { plan: four, sceneId: 'c9' }).error, 'too_many_scene_monsters');
  // na cena "a" a lista de agora conta no lugar da guardada
  assert.ok(fightEntry(ogre, 1, { plan: four, sceneId: 'a', inScene: 1 }).entry);
  // do catálogo: só o id
  assert.deepEqual(fightEntry({ id: 'goblin-warrior', name: { pt: 'Goblin Guerreiro', en: 'Goblin Warrior' }, crNum: 0.25 }, 2, { lang: 'en' }).entry,
    { monsterId: 'goblin-warrior', name: 'Goblin Warrior', cr: 0.25, count: 2 });
  // a sala aceita o monstro inteiro (o teto de 40 KB é da aventura)
  assert.equal(fightEntry(big, 1, { linked: true }).entry.snap, big);
});

test('momentos da cena: spots e os que apontam a cena, sem repetir', () => {
  assert.equal(spotKey(14, 'm2'), '14:m2');
  assert.deepEqual(parseSpot('14:m2'), { charId: 14, momentId: 'm2' });
  assert.equal(parseSpot('lixo'), null);
  const spot = { 14: [{ id: 'm1', kind: 'shine', text: 'Fechadura', plan: 'c1' }, { id: 'm2', kind: 'push', text: 'SAB', plan: null }], 11: [{ id: 'm1', text: 'Cura', plan: 'c9' }] };
  const got = sceneMoments({ id: 'c1', spots: ['14:m1', '14:m2', '99:m1'] }, spot);
  assert.deepEqual(got.map(x => x.key), ['14:m1', '14:m2']);
  assert.deepEqual(sceneMoments({ id: 'c9', spots: [] }, spot).map(x => x.key), ['11:m1']);
});

test('ideias de momento que combinam com o teste e o combate da cena vêm primeiro', () => {
  const sug = [
    { kind: 'shine', auto: 'skill:arcana', text: 'Arcanismo 70%' },
    { kind: 'shine', auto: 'skill:stealth', text: 'Furtividade 65%' },
    { kind: 'push', auto: 'push:save:wis', text: 'SAB −1' },
    { kind: 'shine', auto: 'axis:melee', text: 'linha de frente' },
  ];
  const view = { checks: [{ kind: 'skill', key: 'stealth', dc: 15 }], fight: [{ name: 'Goblin', count: 2 }] };
  const out = sceneMomentIdeas(view, sug, { fightSaves: [{ ab: 'wis', dc: 13 }], lang: 'pt' });
  assert.deepEqual(out.map(s => s.auto), ['skill:stealth', 'push:save:wis', 'axis:melee', 'skill:arcana']);
  assert.equal(out[0].why, 'a cena tem Furtividade CD 15');
  assert.match(out[1].why, /combate cobra Resistência de SAB CD 13/);
  assert.equal(out[3].why, undefined);
  assert.deepEqual(sceneMomentIdeas({ checks: [], fight: [] }, sug).map(s => s.auto), sug.map(s => s.auto));
});

test('a ideia que nasce do 🎯 da cena: ★ para o melhor da mesa, ↗ para os outros', () => {
  const facts = [{ id: 1, name: 'Elarion', skills: { investigation: 5 }, saves: { dex: 2 } }, { id: 2, name: 'Pipo', skills: { investigation: 1 }, saves: { dex: 5 } }];
  const view = { checks: [{ kind: 'skill', key: 'investigation', dc: 13 }] };
  assert.deepEqual(sceneCheckIdea(view, facts[0], facts, { lang: 'pt' }),
    { kind: 'shine', auto: 'skill:investigation', text: 'Investigação 65%', why: 'a cena tem Investigação CD 13' });
  const push = sceneCheckIdea(view, facts[1], facts, { lang: 'pt' });
  assert.equal(push.kind, 'push');
  assert.equal(push.auto, 'push:skill:investigation');
  assert.match(push.text, /^Investigação \+1 · 45% · tentar sem o especialista/);
  assert.equal(sceneCheckIdea({ checks: [{ kind: 'save', key: 'dex' }] }, facts[1], facts, { lang: 'en' }).text, 'DEX save 55%', 'sem CD: a de referência (15)');
  assert.equal(sceneCheckIdea({ checks: [{ kind: 'ability', key: 'str' }] }, facts[0], facts), null);
  assert.equal(sceneCheckIdea({ checks: [] }, facts[0], facts), null);
});

test('dificuldade do combate escrita contra a mesa', () => {
  const lookup = (id) => (id === 'goblin' ? { crNum: 0.25 } : null);
  const d = fightDifficulty([{ monsterId: 'goblin', name: 'Goblin', cr: 0.25, count: 2 }], [1, 1, 1, 1], lookup, 'pt');
  assert.equal(d.totalXp, 100);
  assert.equal(d.text, 'Baixa · 100 de 200 XP · 4 personagens nível 1');
  assert.match(fightDifficulty([{ monsterId: 'goblin', count: 2 }], [1, 3], lookup, 'en').text, /2 characters, levels 1–3$/);
  assert.match(fightDifficulty([{ monsterId: 'goblin', count: 2 }], [], lookup, 'pt').text, /a mesa ainda não tem personagens/);
  assert.equal(fightDifficulty([], [1], lookup).text, '');
});

test('linha da cena no Plano: os ícones escritos, só do que existe', () => {
  const v = sceneView({ id: 'c1', text: 'Ponte', read: 'x', show: { kind: 'entry', id: 7 }, refs: [3, 9],
    fight: [{ monsterId: 'goblin', name: 'Goblins', count: 2 }], check: { kind: 'skill', key: 'perception' } });
  assert.deepEqual(sceneIcons(v, { lang: 'pt', moments: [{ charId: 14 }], names: { 14: 'Pipo' } }),
    ['📜 ler', '📺 imagem', '🎭 2', '⚔ 2 Goblins', '🎯 Percepção', '★ Pipo']);
  assert.deepEqual(sceneIcons(sceneView({ id: 'c2', text: 'Nada' })), []);
  // cena ligada com a sala leve do Plano: o texto não vem, só que existe
  const light = lightNode({ id: 'n1', readAloud: 'x', refs: [], encounter: [{ name: 'Cultista', count: 3 }], checks: [{ skill: 'save:dex' }] });
  assert.deepEqual(sceneIcons(sceneView({ id: 'c4', text: 'Cripta', nodeRef: { adventureId: 1, nodeId: 'n1' } }, { ...light, hasRead: true })),
    ['📜 ler', '⚔ 3 Cultista', '🎯 Resistência de DES']);
  assert.deepEqual(sceneIcons(sceneView({ id: 'c3', text: 'x', fight: [{ name: 'A', count: 1 }, { name: 'B', count: 2 }] }), { lang: 'en' }), ['⚔ 3 monsters']);
});

test('cabeçalho, "O que acontece" das notas antigas e o fechar da cena', () => {
  const plan = { scenes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
  assert.equal(sceneHeading(plan, 'b', 'pt'), 'Cena 2 de 3');
  assert.equal(sceneHeading(plan, 'c', 'en'), 'Scene 3 of 3');
  // o Raio-X escrevia o momento da 2ª linha em diante do texto: aparece em "O que acontece"
  const w = whatField({ text: 'Cena nova\n★ Pipo · Brilha: Furtividade' });
  assert.equal(w.value, '★ Pipo · Brilha: Furtividade');
  assert.deepEqual(w.patch('Pipo abre a fechadura'), { what: 'Pipo abre a fechadura', text: 'Cena nova' });
  assert.deepEqual(whatField({ text: 'Ponte', what: 'oi' }).patch('tchau'), { what: 'tchau' });
  assert.deepEqual(closeScene({ text: '' }, 1), { action: 'remove' });
  assert.deepEqual(closeScene({ text: '', read: 'oi' }, 1, 'pt'), { action: 'name', text: 'Cena 2' });
  assert.deepEqual(closeScene({ text: 'Ponte' }, 0), { action: 'keep' });
});

test('sala leve e sala sem imagem (o servidor antigo cai na aventura inteira)', () => {
  const full = { id: 'n1', name: 'Entrada', image: 'data:image/png;base64,AAAA', readAloud: 'x', notes: 'segredo', refs: [1],
    encounter: [{ monsterId: 'g', name: 'G', crNum: 1, count: 2, snapshot: { big: 1 } }], checks: [] };
  const l = lightNode(full);
  assert.equal(l.hasImage, true);
  assert.equal(l.hasRead, true);
  assert.equal('notes' in l, false);
  assert.deepEqual(l.encounter, [{ monsterId: 'g', name: 'G', crNum: 1, count: 2 }]);
  const n = nodeWithoutImage(full);
  assert.equal('image' in n, false);
  assert.equal(n.hasImage, true);
  assert.equal(firstImageRef([3, 9, 7], world), 9);
  assert.equal(firstImageRef([3], world), null);
});
