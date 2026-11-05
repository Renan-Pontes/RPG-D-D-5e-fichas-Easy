// Tela: subtítulo do recap sem repetição, detecção de link morto e o modo de desenho.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recapSubtitle, isDeadScreenLink, tvMode, splitNumbered, conditionsShown, bestScale, cardLayout, sceneLayout, WIDE_TEXT_MAX,
  histPlacement, histLinesFit, quietCorner, HIST_MAX, HIST_MAP_MAX, shortName,
} from '../src/screen/tv-logic.js';
import { stageNow } from '../src/stage/stage-now.js';

test('recapSubtitle esconde títulos que só repetem "Anteriormente em <campanha>"', () => {
  const name = 'E1 Brumas do Iniciante';
  assert.equal(recapSubtitle('Anteriormente em E1 Brumas do Iniciante…', name), '');
  assert.equal(recapSubtitle('Anteriormente em E1 Brumas do Iniciante', name), '');
  assert.equal(recapSubtitle('anteriormente em e1 brumas do iniciante...', name), '');
  assert.equal(recapSubtitle('Previously on E1 Brumas do Iniciante', name), '');
  assert.equal(recapSubtitle('E1 Brumas do Iniciante', name), '');
  assert.equal(recapSubtitle('Anteriormente…', name), '');
  assert.equal(recapSubtitle('', name), '');
  assert.equal(recapSubtitle(null, name), '');
});

test('recapSubtitle mantém títulos de verdade', () => {
  const name = 'Vale';
  assert.equal(recapSubtitle('Sessão 3 — A cripta do sino', name), 'Sessão 3 — A cripta do sino');
  assert.equal(recapSubtitle('Anteriormente em Vale: a cripta', name), 'Anteriormente em Vale: a cripta');
  assert.equal(recapSubtitle('Valente', name), 'Valente');
});

test('isDeadScreenLink: só 404/410', () => {
  assert.equal(isDeadScreenLink({ status: 404 }), true);
  assert.equal(isDeadScreenLink({ status: 410 }), true);
  assert.equal(isDeadScreenLink({ status: 500 }), false);
  assert.equal(isDeadScreenLink({ status: 502 }), false);
  assert.equal(isDeadScreenLink(null), false);
  assert.equal(isDeadScreenLink(new Error('x')), false);
});

test('tvMode: a frente decide o desenho; sem frente, o fundo', () => {
  const fight = { active: true, round: 1 };
  assert.equal(tvMode(stageNow({ stage: { front: { kind: 'image', imageUrl: 'x' } }, combat: fight })), 'image');
  assert.equal(tvMode(stageNow({ stage: { front: { kind: 'image' }, focus: false }, combat: fight })), 'combat');
  assert.equal(tvMode(stageNow({ stage: { bg: 'dark', front: { kind: 'card' } } })), 'dark');
  assert.equal(tvMode(stageNow({ stage: { bg: 'map' } })), 'map');
  assert.equal(tvMode(stageNow({ stage: { front: { kind: 'recap' } } })), 'recap');
  assert.equal(tvMode(null), 'rest');
});

// ------------------------------------------------------------------ V9: a TV em 16:9
import { tvLang, lengthClass, turnNow, initiativeRows, partyRow } from '../src/screen/tv-logic.js';
import { charLine, healthLabel, tvName } from '../src/player/player-model.js';
import { nameIds, tName } from '../data/i18n.js';
import { conditionLabel } from '../src/combat/monster-i18n.js';

test('tvLang: a língua da campanha manda; sem ela, a do aparelho', () => {
  assert.equal(tvLang('pt', 'en'), 'pt');      // TV num navegador em inglês, campanha em pt
  assert.equal(tvLang('en', 'pt'), 'en');
  assert.equal(tvLang(null, 'en'), 'en');
  assert.equal(tvLang(undefined, 'pt'), 'pt');
  assert.equal(tvLang('fr', 'xx'), 'pt');
});

test('lengthClass: o texto longo encolhe em degraus', () => {
  const steps = [200, 500, 900];
  assert.equal(lengthClass('curto', steps), '');
  assert.equal(lengthClass('x'.repeat(201), steps), 'is-medium');
  assert.equal(lengthClass('x'.repeat(501), steps), 'is-long');
  assert.equal(lengthClass('x'.repeat(901), steps), 'is-xlong');
  assert.equal(lengthClass('x'.repeat(5000), [200, 500]), 'is-long');
  assert.equal(lengthClass(null, steps), '');
});

const FIGHT = {
  active: true, round: 2, turnIndex: 2,
  combatants: [
    { id: 'p', type: 'pc', name: 'Pipo', current_hp: 0, stats: { max_hp: 9 }, health: 'down' },
    { id: 'e', type: 'pc', name: 'Elarion', current_hp: 7, temp_hp: 2, stats: { max_hp: 7 }, health: 'unhurt' },
    { id: 'g2', type: 'monster', name: 'Goblin #2', health: 'unhurt', conditions: ['prone'] },
    { id: 'd', type: 'pc', name: 'Dagna', current_hp: 3, stats: { max_hp: 10 }, health: 'bloodied' },
    { id: 'g1', type: 'monster', name: 'Goblin #1', health: 'hurt' },
  ],
};

test('turnNow: a vez e a rodada (null fora de combate)', () => {
  assert.deepEqual(turnNow(FIGHT), { round: 2, id: 'g2', name: 'Goblin #2' });
  assert.equal(turnNow({ ...FIGHT, active: false }), null);
  assert.equal(turnNow(null), null);
});

test('initiativeRows: ✓ agiu, ▶ a vez; PJ com PV, monstro só com a faixa', () => {
  const { rows, more } = initiativeRows(FIGHT);
  assert.equal(more, 0);
  assert.deepEqual(rows.map(r => r.mark), ['✓', '✓', '▶', '', '']);
  assert.deepEqual(rows.map(r => r.state), ['acted', 'acted', 'now', 'todo', 'todo']);
  // PJ a 0 PV fazendo testes contra a morte: "Morrendo", sem riscar (E1.5a)
  assert.deepEqual([rows[0].down, rows[0].fallen], [false, true]);
  assert.deepEqual(rows[1].hp, { cur: 7, max: 7, temp: 2 });
  assert.equal(rows[1].band, null);
  assert.equal(rows[2].hp, null);                 // monstro: nunca PV
  assert.equal(rows[2].band, 'unhurt');
  assert.deepEqual(rows[2].conditions, ['prone']);
  // o mestre tirou o "PV do grupo" da Tela: PJ vira faixa também
  const hidden = initiativeRows(FIGHT, { party: false }).rows;
  assert.equal(hidden[1].hp, null);
  assert.equal(hidden[1].band, 'unhurt');
  // sem a ordem na Tela: PJs primeiro, sem ✓/▶, quem age ainda destacado
  const plain = initiativeRows(FIGHT, { order: false }).rows;
  assert.deepEqual(plain.map(r => r.id), ['p', 'e', 'd', 'g2', 'g1']);
  assert.deepEqual(plain.map(r => r.mark), ['', '', '', '', '']);
  assert.deepEqual(plain.map(r => r.state), ['todo', 'todo', 'todo', 'now', 'todo']);
  // fora de combate ninguém agiu nem tem a vez
  assert.deepEqual(initiativeRows({ ...FIGHT, active: false }).rows.map(r => r.mark), ['', '', '', '', '']);
});

test('initiativeRows: riscado só quem morreu (monstro derrotado, PJ com 3 falhas)', () => {
  const fight = { active: true, round: 1, turnIndex: 0, combatants: [
    { id: 'p', type: 'pc', name: 'Pipo', current_hp: 0, stats: { max_hp: 9 }, health: 'down', death_saves: { success: 1, fail: 2 } },
    { id: 'k', type: 'pc', name: 'Kaelor', current_hp: 0, stats: { max_hp: 11 }, health: 'down', defeated: true },
    { id: 'g', type: 'monster', name: 'Goblin', health: 'down' },
    { id: 'o', type: 'monster', name: 'Ogro', health: 'bloodied' },
  ] };
  const { rows } = initiativeRows(fight);
  assert.deepEqual(rows.map(r => [r.id, r.down, r.fallen]), [['p', false, true], ['k', true, false], ['g', true, false], ['o', false, false]]);
  // sem o PV do grupo na Tela: a faixa do PJ a 0 PV diz "Morrendo", não "Derrotado"
  const hidden = initiativeRows(fight, { party: false }).rows;
  assert.equal(hidden[0].band, 'fallen');
  assert.equal(hidden[2].band, 'down');
  assert.equal(healthLabel('fallen', 'pt'), 'Morrendo');
  assert.equal(healthLabel('fallen', 'en'), 'Dying');
  assert.equal(healthLabel('down', 'pt'), 'Derrotado');
  // nenhuma faixa diz "Caído": é a condição (prone), que a TV mostra na mesma lista (revisão E1.5a)
  for (const band of ['unhurt', 'hurt', 'bloodied', 'down', 'fallen', 'stable', 'dead']) {
    assert.notEqual(healthLabel(band, 'pt').toLowerCase(), conditionLabel('prone', 'pt').toLowerCase());
  }
  // 3 sucessos: "Estável", ainda sem riscar
  const st = initiativeRows({ ...fight, combatants: [{ ...fight.combatants[0], conditions: ['unconscious', 'stable'] }] }, { party: false }).rows[0];
  assert.deepEqual([st.down, st.fallen, st.stable, st.band, healthLabel(st.band, 'pt')], [false, true, true, 'stable', 'Estável']);
});

test('initiativeRows: até 10 + "+N", com a vez sempre à vista', () => {
  const many = { active: true, round: 1, turnIndex: 11,
    combatants: Array.from({ length: 13 }, (_, i) => ({ id: `c${i}`, type: 'monster', name: `M${i}`, health: 'unhurt' })) };
  const { rows, more } = initiativeRows(many);
  assert.equal(rows.length, 10);
  assert.equal(more, 3);
  assert.ok(rows.some(r => r.state === 'now' && r.id === 'c11'));
  assert.equal(rows[0].id, 'c3');                 // janela: termina no fim da lista
  const first = initiativeRows({ ...many, turnIndex: 0 });
  assert.equal(first.rows[0].id, 'c0');
  assert.equal(first.rows[0].mark, '▶');
  // sem a ordem: começa no topo (PJs) enquanto quem age couber nas 10 linhas
  assert.equal(initiativeRows({ ...many, turnIndex: 5 }, { order: false }).rows[0].id, 'c0');
  assert.equal(initiativeRows({ ...many, turnIndex: 11 }, { order: false }).rows[0].id, 'c2');
  const mid = initiativeRows({ ...many, turnIndex: 5 });
  assert.equal(mid.rows[0].id, 'c3');             // 2 de antes à vista
  assert.equal(mid.rows[2].mark, '▶');
});

test('partyRow: até 6 numa linha, sem o mestre', () => {
  const ms = Array.from({ length: 8 }, (_, i) => ({ id: i, role: 'player', character: { name: `P${i}` } }));
  const { shown, more } = partyRow([{ id: 'dm', role: 'dm', character: { name: 'X' } }, ...ms, { id: 'v', role: 'player', character: null }]);
  assert.equal(shown.length, 6);
  assert.equal(more, 2);
  assert.equal(shown[0].id, 0);
  assert.deepEqual(partyRow([]), { shown: [], more: 0 });
});

test('tabela leve de nomes da Tela = tName (rode node scripts/tv-names.mjs se falhar)', () => {
  for (const kind of ['race', 'class']) {
    for (const id of nameIds(kind)) {
      for (const lang of ['pt', 'en']) {
        assert.equal(tvName(kind, id, lang), tName(kind, id, lang), `${kind}:${id}:${lang} — rode node scripts/tv-names.mjs`);
      }
    }
  }
  assert.equal(charLine({ race: 'dragonborn', classes: [{ id: 'paladin', level: 3 }] }, 'en'), 'Dragonborn · Paladin 3');
  assert.equal(tvName('race', 'nao-existe', 'pt'), 'nao-existe');
});

// ---------------------------------------------------------------- V9: nada cortado
test('splitNumbered separa o " #N" do monstro', () => {
  assert.deepEqual(splitNumbered('Esqueleto Guardião da Cripta #2'), { base: 'Esqueleto Guardião da Cripta', num: '#2' });
  assert.deepEqual(splitNumbered('Goblin Afogado #12'), { base: 'Goblin Afogado', num: '#12' });
  assert.deepEqual(splitNumbered('Goblin#3'), { base: 'Goblin', num: '#3' });
  assert.deepEqual(splitNumbered('Kaelor Escama-de-Ouro'), { base: 'Kaelor Escama-de-Ouro', num: '' });
  assert.deepEqual(splitNumbered('#3'), { base: '#3', num: '' });              // só o número: fica como nome
  assert.deepEqual(splitNumbered('Sala #2 do porão'), { base: 'Sala #2 do porão', num: '' });
  assert.deepEqual(splitNumbered(null), { base: '', num: '' });
});

test('conditionsShown: as primeiras e "+N" com o resto, nada some sem aviso', () => {
  const five = ['poisoned', 'prone', 'frightened', 'restrained', 'blinded'];
  assert.deepEqual(conditionsShown(five, 2), { shown: ['poisoned', 'prone'], more: 3, rest: ['frightened', 'restrained', 'blinded'] });
  assert.deepEqual(conditionsShown(['prone'], 2), { shown: ['prone'], more: 0, rest: [] });
  assert.deepEqual(conditionsShown(['a', 'b'], 2), { shown: ['a', 'b'], more: 0, rest: [] });
  assert.deepEqual(conditionsShown(five, 0).more, 5);
  assert.deepEqual(conditionsShown(null), { shown: [], more: 0, rest: [] });
});

test('bestScale acha a maior letra que cabe, com poucas medidas', () => {
  let calls = 0;
  const upTo = (limit) => (s) => { calls += 1; return s <= limit; };
  assert.equal(bestScale(upTo(1)), 1);
  assert.equal(bestScale(upTo(0.72), { min: 0.5, step: 0.05 }), 0.7);
  calls = 0;
  assert.equal(bestScale(upTo(0.55), { min: 0.4, step: 0.05 }), 0.55);
  assert.ok(calls <= 6, `medidas: ${calls}`);
  assert.equal(bestScale(upTo(0.3), { min: 0.5 }), null);       // nem a menor: quem chama tenta colunas
  assert.equal(bestScale(() => false, { min: 1 }), null);
  assert.equal(bestScale(upTo(0.5), { min: 0.5, step: 0.05 }), 0.5);
});

// Onda 3 (E2.2/E2.3): a imagem do cartão e da cena grande e inteira na TV.
test('cardLayout: sem imagem a arte ao lado; sem texto só a imagem; larga com texto curto na largura toda', () => {
  assert.equal(cardLayout({ image: false, text: 'x' }), 'art');
  assert.equal(cardLayout({ image: true, ratio: 0.7, text: '' }), 'full');
  assert.equal(cardLayout({ image: true, ratio: 1.6, text: '   ' }), 'full');
  assert.equal(cardLayout({ image: true, ratio: 1.5, text: 'Brumafria é uma vila pequena.' }), 'wide', 'o mapa do Vale');
  assert.equal(cardLayout({ image: true, ratio: 1.5, text: 'x'.repeat(WIDE_TEXT_MAX + 1) }), 'side', 'texto longo não cabe na faixa');
  assert.equal(cardLayout({ image: true, ratio: 0.66, text: 'Jovem, séria e cansada.' }), 'side', 'retrato');
  assert.equal(cardLayout({ image: true, ratio: null, text: 'carregando' }), 'side');
});

test('sceneLayout: sem imagem o painel; larga em cima; em pé ao lado', () => {
  assert.equal(sceneLayout({ image: false }), 'panel');
  assert.equal(sceneLayout({ image: true, ratio: 1.78 }), 'wide');
  assert.equal(sceneLayout({ image: true, ratio: 0.75 }), 'side');
  assert.equal(sceneLayout({ image: true, ratio: null }), 'side');
});

// Onda 3 (E2-fix): as Últimas rolagens não cobrem o texto da frente, a ordem nem os tokens.
test('histPlacement: combate no pé da iniciativa (as linhas que cabem); sem lugar, compactas no mapa', () => {
  assert.deepEqual(histPlacement({ mode: 'combat' }), { spot: 'side', max: HIST_MAX, reserve: '' }, 'antes da 1ª medida tenta as 5');
  assert.deepEqual(histPlacement({ mode: 'combat', room: 3 }), { spot: 'side', max: 3, reserve: '' });
  assert.deepEqual(histPlacement({ mode: 'combat', room: 9 }), { spot: 'side', max: HIST_MAX, reserve: '' });
  // 9 na ordem deixavam 1 linha no pé da coluna: as 5 vão para o canto do mapa sem tokens
  assert.deepEqual(histPlacement({ mode: 'combat', room: 1 }), { spot: 'map', max: HIST_MAP_MAX, reserve: '', corner: 'bl' }, '9 na ordem: 1 linha não basta');
  assert.equal(histPlacement({ mode: 'combat', room: 2, combat: BRUMAFRIA }).spot, 'map');
  assert.equal(histPlacement({ mode: 'combat', room: 1, combat: BRUMAFRIA }).corner, 'br');
  assert.equal(HIST_MAP_MAX, HIST_MAX, 'no mapa também as 5');
  assert.deepEqual(histPlacement({ mode: 'combat', room: 0 }), { spot: 'map', max: HIST_MAP_MAX, reserve: '', corner: 'bl' }, 'a ordem enche a coluna');
  assert.equal(histPlacement({ mode: 'combat', room: 0, combat: BRUMAFRIA }).corner, 'br', 'o grupo está embaixo à esquerda');
});

// O combate do banco de teste (mapa 1200×800): o grupo embaixo à esquerda, goblins em cima no meio.
const BRUMAFRIA = {
  map: { width_px: 1200, height_px: 800 },
  combatants: [
    { name: 'Pipo', position: { x: 375, y: 525 } }, { name: 'Dragão', position: { x: 1000, y: 450 } },
    { name: 'Elarion', position: { x: 175, y: 525 } }, { name: 'Goblin #1', position: { x: 525, y: 125 } },
    { name: 'Goblin #2', position: { x: 625, y: 125 } }, { name: 'Dagna', position: { x: 75, y: 525 } },
    { name: 'Goblin #3', position: { x: 725, y: 125 } }, { name: 'Bugbear', position: { x: 875, y: 225 } },
    { name: 'Kaelor', position: { x: 275, y: 525 } },
  ],
};

test('quietCorner: o canto do mapa com menos tokens (empate: embaixo à esquerda)', () => {
  assert.equal(quietCorner(BRUMAFRIA), 'br');
  assert.equal(quietCorner(null), 'bl');
  assert.equal(quietCorner({ combatants: [] }), 'bl');
  // todos os cantos de baixo ocupados: vai para cima, no que tem menos
  const busy = { map: { width_px: 1000, height_px: 1000 }, combatants: [
    { position: { x: 100, y: 900 } }, { position: { x: 900, y: 900 } }, { position: { x: 100, y: 100 } },
  ] };
  assert.equal(quietCorner(busy), 'tr');
  // sem tamanho do mapa: o padrão do CombatGrid (1200×800); sem posição, o ponto (50, 50)
  assert.equal(quietCorner({ combatants: [{ position: { x: 100, y: 700 } }, {}] }), 'br');
});

test('histPlacement: o canto só onde não há texto embaixo à esquerda; com frente, uma linha que empurra', () => {
  assert.deepEqual(histPlacement({ mode: 'rest' }), { spot: 'corner', max: HIST_MAX, reserve: '' });
  assert.deepEqual(histPlacement({ mode: 'rest', read: true }), { spot: 'line', max: HIST_MAX, reserve: 'bottom' }, 'o texto de ler vai na largura toda');
  assert.deepEqual(histPlacement({ mode: 'card', image: false }), { spot: 'corner', max: HIST_MAX, reserve: '' }, 'cartão com a arte padrão à esquerda');
  // o Vale (mapa largo) e o Bartolomeu: o nome e o texto ficam embaixo, na largura toda
  assert.deepEqual(histPlacement({ mode: 'card', image: true }), { spot: 'line', max: HIST_MAX, reserve: 'bottom' });
  for (const mode of ['scene', 'text', 'image', 'map']) {
    assert.deepEqual(histPlacement({ mode }), { spot: 'line', max: HIST_MAX, reserve: 'bottom' }, mode);
  }
  assert.deepEqual(histPlacement({ mode: 'recap' }), { spot: 'line', max: HIST_MAX, reserve: '' }, 'na tarja preta de baixo');
});

test('histLinesFit: linhas inteiras no que sobra embaixo da ordem', () => {
  assert.equal(histLinesFit(218, 37, 36), 5);
  assert.equal(histLinesFit(100, 37, 36), 1);
  assert.equal(histLinesFit(72, 37, 36), 0, 'meia linha não conta');
  assert.equal(histLinesFit(1000, 37, 36), HIST_MAX);
  assert.equal(histLinesFit(1000, 37, 36, 3), 3);
  assert.equal(histLinesFit(0, 37, 36), 0);
  assert.equal(histLinesFit(-20, 37, 36), 0);
  assert.equal(histLinesFit(200, 37, 0), 0);
  assert.equal(histLinesFit(NaN, 37, 36), 0);
});

// Corrigir final da onda 3: na faixa de uma linha, as 5 cabem (a mais nova inteira, as outras curtas).
test('shortName: o primeiro nome, com o número do monstro', () => {
  assert.equal(shortName('Dagna Brasaforte'), 'Dagna');
  assert.equal(shortName('Goblin Afogado #2'), 'Goblin #2');
  assert.equal(shortName('Mestre'), 'Mestre');
  assert.equal(shortName('  '), '');
  assert.equal(shortName(null), '');
});
