/* Raio-X do grupo: lacunas (G7), os 4 quadros (G0), as 3 ideias de cena e as
 * sugestões de brilhar (src/group/spotlights.js), com as fichas do seed jogo-e-combate. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Utils from '../utils.js';
import * as M from '../src/group/party-metrics.js';
import * as S from '../src/group/spotlights.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/party-jogo-e-combate.json', import.meta.url), 'utf8'));
const party = M.partyMembers(fixture.members);
const facts = M.partyFacts(party, 'pt');
const axes = M.partyAxes(facts);
const skills = M.partySkills(facts, 15);
const gaps = S.partyGaps(facts, axes, {});

test('G7: 11 lacunas no seed, a 1ª de cada tipo igual à tabela da especificação (§6.3.6)', () => {
  assert.equal(gaps.length, 11);
  const first = (kind) => gaps.find(g => g.kind === kind);
  assert.equal(first('skill').text, 'Ninguém é bom em Blefar (melhor +2; CD 15 passa 40%)');
  assert.equal(first('damage').text, 'Nenhum dano ácido');
  assert.equal(first('save').text, 'DES fraca (média +1,3; Dagna e Kaelor em +0 ou menos)');
  assert.equal(first('spof').text, 'Só Elarion segura Controle (4,6; o 2º tem 2,5): se Elarion cair, ninguém controla');
  assert.deepEqual(gaps.filter(g => g.kind === 'damage').map(g => g.key), ['acid', 'lightning', 'necrotic', 'poison', 'psychic']);
  // ordem por gravidade: ponto único > perícia > salvaguarda > eixo baixo > dano > sentido
  assert.deepEqual([...new Set(gaps.map(g => g.kind))], ['spof', 'skill', 'save', 'damage']);
});

test('G7: a lista junta os tipos de dano numa linha e agrupa por assunto', () => {
  const list = S.readableGaps(gaps, 'pt');
  assert.equal(list.length, 7);
  assert.equal(list.find(g => g.kind === 'damage').text, 'Nenhum dano ácido, elétrico, necrótico, veneno ou psíquico');
  assert.deepEqual(S.gapGroups(gaps, 'pt').map(g => [g.label, g.items.length]),
    [['Perícias', 2], ['Dano', 1], ['Salvaguardas', 3], ['Papel', 1]]);
  assert.equal(S.readableGaps(S.partyGaps(facts, axes, { lang: 'en' }), 'en').find(g => g.kind === 'damage').text,
    'No acid, lightning, necrotic, poison or psychic damage');
});

test('Ajustar: Importante muda só a ordem; eixo escondido não gera lacuna; CD de referência', () => {
  const social = S.partyGaps(facts, axes, { focus: { social: 2 } });
  assert.deepEqual(social.slice(0, 2).map(g => g.key), ['deception', 'performance']);
  assert.ok(social[0].important);
  assert.equal(social.length, gaps.length, 'a importância não cria nem apaga lacuna');
  const noControl = S.partyGaps(facts, axes, { hidden: ['control'] });
  assert.equal(noControl.some(g => g.kind === 'spof'), false);
  assert.match(S.partyGaps(facts, axes, { dc: 12 }).find(g => g.kind === 'skill').text, /CD 12 passa 55%/);
});

test('G7: eixo baixo, sentido e ferramenta (grupo sem visão no escuro nem Ferramentas de Ladrão)', () => {
  const fighter = (name) => ({
    ...Utils.makeNew(), rulesVersion: '2024', race: 'human', className: 'fighter', level: 1, name,
    abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 10 }, maxHp: 12, armor: 'chainMail',
    weapons: [{ id: 'longsword', name: 'Espada Longa' }],
  });
  const two = M.partyFacts(M.partyMembers([1, 2].map(id => ({ role: 'player', character: { id, name: `Guerreiro ${id}`, data: fighter(`Guerreiro ${id}`) } }))), 'pt');
  const g = S.partyGaps(two, M.partyAxes(two), {});
  assert.ok(g.some(x => x.kind === 'sense' && x.text === 'Ninguém enxerga no escuro'));
  assert.ok(g.some(x => x.kind === 'tool' && x.text === 'Ninguém tem Ferramentas de Ladrão'));
  const mob = g.find(x => x.kind === 'axis' && x.key === 'mobility');
  assert.match(mob.text, /^Mobilidade baixa no grupo inteiro \(melhor \d(,\d)?\)$/);
  assert.equal(S.gapGroups(g, 'pt').at(-1).label, 'Sentidos e ferramentas');
});

test('sugestões de brilhar: Pipo (perícias, Ferramentas de Ladrão e o gancho da ficha)', () => {
  const sug = S.shineSuggestions(facts, { dc: 15 });
  const pipo = sug[party.find(p => p.name.startsWith('Pipo')).id];
  assert.deepEqual(pipo.map(s => s.auto), ['skill:sleightOfHand', 'skill:stealth', 'tool:thievesTools', 'text:personality']);
  assert.equal(pipo[0].text, 'Prestidigitação 65% (2º 35%)');
  assert.equal(pipo.at(-1).text, '“Brincalhão, curioso e incapaz de resistir a uma porta trancada.”');
  const elarion = sug[party.find(p => p.name.startsWith('Elarion')).id];
  assert.ok(elarion.some(s => s.text === 'único com dano frio, energia e trovejante'));
  assert.ok(elarion.some(s => s.auto === 'role:control'));
});

test('G0: os 4 quadros', () => {
  const sug = S.shineSuggestions(facts, {});
  const pipoId = party.find(p => p.name.startsWith('Pipo')).id;
  const q = S.quadrants({ facts, party: axes, skills, gaps, suggestions: sug, threats: [{ id: 'ghost', text: 'Fantasma resiste a trovejante' }] });
  assert.deepEqual(q.strengths.map(x => x.text), ['Cura 5 · Dagna', 'Magia 5 · Dagna e Elarion', 'Intuição: grupo 93%']);
  assert.equal(q.weaknesses[0].text, gaps[0].text);
  assert.equal(q.weaknesses.length, 7);
  assert.ok(q.opportunities.some(x => x.text === 'Pipo: Prestidigitação 65% (2º 35%)'));
  assert.deepEqual(q.opportunities.slice(0, 4).map(x => x.id), party.map(p => p.id), 'uma de cada personagem antes de repetir');
  assert.equal(q.threats[0].text, 'DES média +1,3: bola de fogo e armadilhas pegam 54% do grupo na CD 13');
  assert.equal(q.threats[1].text, 'Fantasma resiste a trovejante');
  // dispensada não volta; eixo escondido some das Forças; Importante vem antes
  const off = S.quadrants({ facts, party: axes, skills, gaps, suggestions: sug, dismissed: { [pipoId]: ['skill:sleightOfHand'] } });
  assert.ok(!off.opportunities.some(x => x.text === 'Pipo: Prestidigitação 65% (2º 35%)'));
  const hid = S.quadrants({ facts, party: axes, skills, gaps, hidden: ['heal'], focus: { control: 2 } });
  assert.equal(hid.strengths[0].text, 'Controle 4,6 · Elarion');
  assert.ok(!hid.strengths.some(x => x.text.startsWith('Cura')));
});

test('3 ideias de cena, de tipos diferentes, e o texto que vai para o plano', () => {
  const ideas = S.sceneIdeas(gaps, facts, 'pt');
  assert.deepEqual(ideas.map(i => i.text), [
    'Uma luta em que Elarion está ocupado: o grupo precisa de outro jeito de controlar a luta',
    'Uma cena em que só Blefar resolve (ninguém é bom nisso)',
    'Um perigo de salvaguarda de DES com saída',
  ]);
  const dmgOnly = S.sceneIdeas(gaps.filter(g => g.kind === 'damage'), facts, 'pt');
  assert.match(dmgOnly[0].text, /^Um inimigo que resiste a .+: o grupo precisa de outro plano$/);
  const text = S.ideaSceneText(ideas[1], 'pt');
  assert.equal(text, 'Uma cena em que só Blefar resolve (ninguém é bom nisso)\nLacuna do grupo: Ninguém é bom em Blefar (melhor +2; CD 15 passa 40%)');
  assert.ok(text.length <= 1000, 'cabe numa cena do plano');
});
