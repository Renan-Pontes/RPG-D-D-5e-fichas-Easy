import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stageNow, normalizeStage, stageLines, undoLabel, frontLabel, playerScreen, screenLine, dmFrontImage,
  newestStage, cardShowMode, privateReason, privateShort, bgLabel, testLabel,
} from '../src/stage/stage-now.js';

const FIGHT = { active: true, round: 2 };
const card = { kind: 'card', entryId: 3, label: 'Irmã Velna', ver: 'abc' };
const onlyImage = { kind: 'image', ref: { entryId: 12 }, label: 'Cripta sob a capela', hidden: true, caption: 'Uma porta', ver: 'v1' };

test('combate + frente com focus: a frente vai por cima (tarja do turno)', () => {
  const now = stageNow({ stage: { front: card, focus: true }, combat: FIGHT });
  assert.equal(now.mode, 'front');
  assert.equal(now.over, true);
  assert.equal(now.front, card);
  assert.equal(now.bg, 'combat');
  assert.equal(now.round, 2);
});

test('focus:false espera o fim do combate; sem combate ela aparece', () => {
  const st = { front: card, focus: false };
  const now = stageNow({ stage: st, combat: FIGHT });
  assert.equal(now.mode, 'combat');
  assert.equal(now.waiting, card);
  assert.equal(now.front, null);
  const after = stageNow({ stage: st, combat: { active: false } });
  assert.equal(after.mode, 'front');
  assert.equal(after.over, false);
});

test('escurecida: preta, com a frente guardada atrás', () => {
  const now = stageNow({ stage: { bg: 'dark', front: card }, combat: FIGHT });
  assert.equal(now.mode, 'dark');
  assert.equal(now.held, card);
  assert.equal(now.bg, 'dark');
});

test('sem frente: o fundo (combate, mapa ou capa)', () => {
  assert.equal(stageNow({ stage: {}, combat: FIGHT }).mode, 'combat');
  assert.equal(stageNow({ stage: { bg: 'map' } }).mode, 'map');
  assert.equal(stageNow({ stage: null }).mode, 'rest');
  assert.equal(stageNow({}).bg, 'cover');
  assert.equal(normalizeStage({ bg: 'xyz', front: { kind: 'bogus' } }).bg, 'auto');
  assert.equal(normalizeStage({ front: { kind: 'bogus' } }).front, null);
});

test('frente "só a imagem": sem título público; o mestre lê o nome', () => {
  const pub = { kind: 'image', imageUrl: '/api/screen/t/stage-image?v=v1', caption: 'Uma porta' };
  assert.equal(frontLabel(pub, 'pt'), 'Uma porta');
  assert.equal(frontLabel({ kind: 'image', imageUrl: 'x' }, 'pt'), 'Imagem');
  assert.equal(frontLabel(onlyImage, 'pt', { dm: true }), 'Cripta sob a capela (só a imagem)');
  const p = playerScreen({ stage: { front: pub }, combat: null, lang: 'pt' });
  assert.equal(p.kind, 'image');
  assert.equal(p.title, '');
  assert.equal(p.caption, 'Uma porta');
  assert.equal('entryId' in p, false);
});

test('Mesa do jogador diz a verdade no combate (D7)', () => {
  const pub = { front: { kind: 'card', title: 'Borin', entryId: 2, kindLabel: 'NPC' }, focus: false };
  assert.deepEqual(playerScreen({ stage: pub, combat: { active: true, round: 1 }, lang: 'pt' }), { kind: 'combat', title: '⚔ Combate · rodada 1' });
  const over = playerScreen({ stage: { ...pub, focus: true }, combat: { active: true, round: 1 }, lang: 'pt' });
  assert.equal(over.kind, 'card');
  assert.equal(over.over, '⚔ Combate · rodada 1');
  assert.equal(playerScreen({ stage: { bg: 'dark' }, lang: 'pt' }).title, 'A Tela está escurecida');
  assert.equal(playerScreen({ stage: {} }), null);
});

test('linhas de "Na tela agora" com ✕ por camada', () => {
  const check = { id: 9, label: 'Percepção', targets: [{ response: {} }, { response: null }, { response: {} }, { response: {} }] };
  const lines = stageLines({ stage: { front: onlyImage }, combat: FIGHT, test: check, lang: 'pt' });
  assert.deepEqual(lines.map(l => l.layer), ['front', 'bg', 'test']);
  assert.equal(lines[0].text, '🖼 Cripta sob a capela (só a imagem)');
  assert.equal(lines[0].sub, 'por cima do ⚔ combate');
  assert.equal(lines[0].remove, 'back');
  assert.equal(lines[1].text, '⚔ Combate · rodada 2');
  assert.equal(lines[2].text, '🎯 Percepção 3/4');
  assert.equal(lines[2].checkId, 9);
  const dark = stageLines({ stage: { bg: 'dark' }, lang: 'pt' });
  assert.deepEqual(dark.map(l => [l.layer, l.remove]), [['bg', 'light']]);
  assert.equal(stageLines({ stage: { bg: 'map' } })[0].remove, 'bg');
  // Jogar › Tela: sempre as 3 linhas, para nada mudar de lugar quando a Tela muda sozinha
  const fixed = stageLines({ stage: {}, lang: 'pt', all: true });
  assert.deepEqual(fixed.map(l => [l.layer, !!l.empty, l.remove]), [['front', true, null], ['bg', false, null], ['test', true, null]]);
  assert.equal(lines[0].over, true);
  assert.equal(stageLines({ stage: {} })[0].remove, null);
});

test('↶ Desfazer diz o que volta', () => {
  assert.equal(undoLabel({ prev: { bg: 'auto', front: { kind: 'card', label: 'Vale de Brumafria' } } }, 'pt'), '↶ Voltar para: Vale de Brumafria');
  assert.equal(undoLabel({ prev: { bg: 'auto', front: null } }, 'en'), '↶ Back to: the background');
  assert.equal(undoLabel({}, 'pt'), '');
  // palco gravado sem o nome (campanha de antes do palco): nunca "Voltar para:" vazio
  assert.equal(undoLabel({ prev: { bg: 'auto', front: { kind: 'card', entryId: 2, label: '' } } }, 'pt'), '↶ Voltar para: o cartão anterior');
  assert.equal(undoLabel({ prev: { bg: 'auto', front: { kind: 'scene', title: '' } } }, 'en'), '↶ Back to: what was there before');
});

test('cartão ocultado depois de mostrado (gone): a Tela não mente para o mestre', () => {
  const gone = { ...card, gone: true };
  const now = stageNow({ stage: { front: gone, focus: true }, combat: FIGHT });
  assert.equal(now.mode, 'combat');
  assert.equal(now.front, null);
  assert.equal(now.gone, gone);
  assert.equal(stageNow({ stage: { front: gone } }).mode, 'rest');
  assert.equal(screenLine({ stage: { front: gone }, lang: 'pt' }), 'capa');
  const lines = stageLines({ stage: { front: gone, focus: true }, combat: FIGHT, lang: 'pt', all: true });
  assert.deepEqual([lines[0].text, lines[0].sub, lines[0].remove, lines[0].over], ['🗺 Irmã Velna', 'não aparece na Tela (oculto ou apagado)', 'back', false]);
  assert.equal(lines[1].text, '⚔ Combate · rodada 2');
});

test('linha curta, fundo, teste e imagem do mestre', () => {
  assert.equal(screenLine({ stage: { front: card }, combat: FIGHT, lang: 'pt' }), 'Irmã Velna · por cima do combate');
  assert.equal(screenLine({ stage: {}, lang: 'en' }), 'cover');
  assert.equal(bgLabel(stageNow({ stage: { bg: 'dark' } }), 'en'), '◐ Screen blacked out');
  assert.equal(testLabel({ label: 'Furtividade', results: [{ total: 12 }, { total: null }] }), '🎯 Furtividade 1/2');
  assert.equal(dmFrontImage(1, card), '/api/world/3/image?v=abc');
  assert.equal(dmFrontImage(1, onlyImage), '/api/campaigns/1/stage-image?v=v1');
  assert.equal(dmFrontImage(1, { kind: 'text', text: 'x' }), null);
});

test('o palco mais novo ganha (GET × resposta do POST)', () => {
  const a = { at: '2026-10-26T20:00:00Z', bg: 'auto' };
  const b = { at: '2026-10-26T20:00:05Z', bg: 'dark' };
  assert.equal(newestStage(a, b), b);
  assert.equal(newestStage(b, a), b);
  assert.equal(newestStage(null, a), a);
});

test('o 📺 de um cartão: na hora, pergunta ou explica', () => {
  assert.equal(cardShowMode({ visibility: 'revealed' }), 'show');
  assert.equal(cardShowMode({ visibility: 'partial' }), 'show');
  assert.equal(cardShowMode({ visibility: 'hidden', imageVer: 'x' }), 'image');
  assert.equal(cardShowMode({ visibility: 'hidden', imageVer: '' }), 'name');
  const letter = { kind: 'handout', visibility: 'revealed', data: { recipients: [1] } };
  assert.equal(cardShowMode(letter), 'private');
  const members = [{ id: 1, user: { displayName: 'Ana' }, character: { name: 'Dagna' } }];
  assert.equal(privateReason(letter, members, 'pt'), 'Documento só para Ana: não vai à Tela.');
  assert.equal(privateShort(letter, members, 'pt'), 'Só para Ana · não vai à Tela');
  assert.equal(privateReason(letter, [], 'en'), "Handout only for some players: it can't go on screen.");
});
