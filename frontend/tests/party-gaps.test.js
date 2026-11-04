/* Raio-X do grupo: lacunas (G7), os 4 quadros (G0), as 3 ideias de cena e as
 * sugestões de brilhar (src/group/spotlights.js), com as fichas do seed jogo-e-combate. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Utils from '../utils.js';
import * as M from '../src/group/party-metrics.js';
import * as S from '../src/group/spotlights.js';
import { sceneFieldText } from '../src/play/plan-model.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/party-jogo-e-combate.json', import.meta.url), 'utf8'));
const party = M.partyMembers(fixture.members);
const facts = M.partyFacts(party, 'pt');
// a tabela das lacunas da especificação (§6.3.6) foi feita com o meio a meio (o padrão de antes)
const axes = M.partyAxes(facts, { w: 0.5 });
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
  // os grupos na ordem da lacuna mais séria de cada um (ponto único > perícia > salvaguarda > dano)
  assert.deepEqual(S.gapGroups(gaps, 'pt').map(g => [g.label, g.items.length]),
    [['Papel', 1], ['Perícias', 2], ['Salvaguardas', 3], ['Dano', 1]]);
  assert.deepEqual(S.gapGroups(gaps, 'pt').flatMap(g => g.items.map(x => x.rank)).sort(), [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(S.readableGaps(S.partyGaps(facts, axes, { lang: 'en' }), 'en').find(g => g.kind === 'damage').text,
    'No acid, lightning, necrotic, poison or psychic damage');
});

test('Ajustar: Importante muda só a ordem; eixo escondido não gera lacuna; CD de referência', () => {
  const social = S.partyGaps(facts, axes, { focus: { social: 2 } });
  assert.deepEqual(social.slice(0, 2).map(g => g.key), ['deception', 'performance']);
  assert.ok(social[0].important);
  assert.equal(social.length, gaps.length, 'a importância não cria nem apaga lacuna');
  // Importante em Controle: o grupo Papel vem primeiro e o ponto único fica nas 3 primeiras
  const control = S.gapGroups(S.partyGaps(facts, axes, { focus: { control: 2 } }), 'pt');
  assert.equal(control[0].label, 'Papel');
  const spof = control[0].items.find(x => x.kind === 'spof');
  assert.equal(spof.key, 'control');
  assert.ok(spof.rank < 3 && spof.important, 'o ponto único de Controle está nas 3 primeiras');
  // Importante em Social: as perícias sociais sobem, e o grupo Perícias passa à frente
  assert.equal(S.gapGroups(social, 'pt')[0].label, 'Perícias');
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
  const g = S.partyGaps(two, M.partyAxes(two, { w: 0.5 }), {});
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
  // frase de mestre na linha principal (F1.1); os números ficam no detalhe
  assert.equal(pipo[0].text, 'um teste de Prestidigitação — ninguém no grupo faz melhor');
  assert.equal(pipo[0].detail, 'Prestidigitação +7 · 65% na CD 15 · o 2º do grupo: 35%');
  assert.equal(pipo.at(-1).text, '“Brincalhão, curioso e incapaz de resistir a uma porta trancada.”');
  const elarion = sug[party.find(p => p.name.startsWith('Elarion')).id];
  assert.ok(elarion.some(s => s.text === 'um inimigo vulnerável a dano de frio, de energia e trovejante — só Elarion causa esse dano'), elarion.map(s => s.text).join('\n'));
  assert.ok(elarion.some(s => s.auto === 'role:control'));
});

test('G0: os 4 quadros', () => {
  const sug = S.shineSuggestions(facts, {});
  const pipoId = party.find(p => p.name.startsWith('Pipo')).id;
  const q = S.quadrants({ facts, party: axes, skills, gaps, suggestions: sug, threats: [{ id: 'ghost', text: 'Fantasma resiste a trovejante' }] });
  assert.deepEqual(q.strengths.map(x => x.text), ['Cura 5 · Dagna', 'Magia 5 · Dagna e Elarion', 'Intuição: grupo 93%']);
  assert.equal(q.weaknesses[0].text, gaps[0].text);
  assert.equal(q.weaknesses.length, 7);
  assert.ok(q.opportunities.some(x => x.text === 'Pipo brilha: um teste de Prestidigitação — ninguém no grupo faz melhor'));
  assert.deepEqual(q.opportunities.slice(0, 4).map(x => x.id), party.map(p => p.id), 'uma de cada personagem antes de repetir');
  // nível 1: nada de bola de fogo (F2.4); sem exemplo do bestiário, o perigo do nível na CD típica
  assert.equal(q.threats[0].text, 'DES média +1,3: armadilhas e sopros pegam 54% do grupo na CD 13');
  assert.equal(q.threats[1].text, 'Fantasma resiste a trovejante');
  // dispensada não volta; eixo escondido some das Forças; Importante vem antes
  const off = S.quadrants({ facts, party: axes, skills, gaps, suggestions: sug, dismissed: { [pipoId]: ['skill:sleightOfHand'] } });
  assert.ok(!off.opportunities.some(x => x.text === 'Pipo brilha: um teste de Prestidigitação — ninguém no grupo faz melhor'));
  const hid = S.quadrants({ facts, party: axes, skills, gaps, hidden: ['heal'], focus: { control: 2 } });
  assert.equal(hid.strengths[0].text, 'Controle 4,6 · Elarion');
  assert.ok(!hid.strengths.some(x => x.text.startsWith('Cura')));
});

test('Ameaças coerentes com o nível: um monstro típico do ND do grupo que cobra a salvaguarda (F2.4)', async () => {
  const { BESTIARY } = await import('../data/bestiary.js');
  const V = await import('../src/group/versus.js');
  const ex = V.saveThreatExamples(BESTIARY, facts, 'pt');
  assert.deepEqual(ex.examples.dex, { id: 'giant-spider', name: 'Aranha Gigante', cr: '1', dc: 13 });
  for (const e of Object.values(ex.examples)) {
    const m = BESTIARY.find(x => x.id === e.id);
    assert.ok(m.crNum <= 3, `${e.id}: ND ${m.cr} para um grupo de nível 1`);
  }
  const q = S.quadrants({ facts, party: axes, skills, gaps, saveExamples: ex.examples, typicalDc: ex.typicalDc });
  assert.equal(q.threats[0].text, 'DES média +1,3: Aranha Gigante (ND 1) cobra CD 13 e pega 54% do grupo');
  const all = q.threats.map(x => x.text).join(' | ');
  assert.doesNotMatch(all, /bola de fogo|banir|fireball|banish/i, all);
  const en = S.quadrants({ facts, party: axes, skills, gaps, lang: 'en', saveExamples: V.saveThreatExamples(BESTIARY, facts, 'en').examples });
  assert.equal(en.threats[0].text, 'DEX average +1.3: Giant Spider (CR 1) calls for DC 13 and catches 54% of the party');
  // grupo de nível alto: o perigo genérico do nível volta a ser a bola de fogo
  const high = facts.map(f => ({ ...f, level: 11 }));
  assert.match(S.quadrants({ facts: high, party: axes, skills, gaps }).threats[0].text, /bola de fogo e armadilhas/);
});

test('3 ideias de cena, de tipos diferentes, e a cena que vai para o plano (F2.1)', () => {
  const ideas = S.sceneIdeas(gaps, facts, 'pt');
  assert.deepEqual(ideas.map(i => i.text), [
    'Uma luta que ocupa Elarion: o grupo precisa de outro jeito de controlar a luta',
    'Uma cena em que só Blefar resolve (ninguém é bom nisso)',
    'Um perigo de salvaguarda de DES com saída',
  ]);
  assert.deepEqual(ideas.map(i => i.title), ['Uma luta que ocupa Elarion', 'Só Blefar resolve', 'Perigo: salvaguarda de DES']);
  assert.deepEqual(ideas.map(i => i.key), ['spof:control', 'skill:deception', 'save:dex']);
  const dmgOnly = S.sceneIdeas(gaps.filter(g => g.kind === 'damage'), facts, 'pt');
  assert.match(dmgOnly[0].text, /^Um inimigo que resiste a .+: o grupo precisa de outro plano$/);
  // a cena nasce com o título da ideia e o texto à vista no "O que acontece" (só o mestre vê)
  const scene = S.ideaScene(ideas[1], 'pt');
  assert.deepEqual(scene, {
    text: 'Só Blefar resolve',
    what: 'Uma cena em que só Blefar resolve (ninguém é bom nisso)\nLacuna do grupo: Ninguém é bom em Blefar (melhor +2; CD 15 passa 40%)',
    fromIdea: 'skill:deception',
  });
  assert.ok(scene.what.length <= 500, 'cabe no "O que acontece"');
  // servidor de antes do Plano guiado: a ideia na 2ª linha do texto (o nome continua o título)
  const old = S.ideaScene(ideas[1], 'pt', { inText: true });
  assert.deepEqual(Object.keys(old), ['text']);
  assert.equal(sceneFieldText(old), 'Só Blefar resolve');
  assert.ok(old.text.includes('Lacuna do grupo'));
  // "Usar como cena" leva só o nome: nenhum número nem lacuna do Raio-X vai à Tela (§8)
  for (const lang of ['pt', 'en']) {
    for (const idea of S.sceneIdeas(gaps, facts, lang, 9)) {
      const name = sceneFieldText(S.ideaScene(idea, lang));
      assert.equal(name, idea.title);
      assert.doesNotMatch(name, /%|\d|ninguém|nobody/i, name);
    }
  }
  assert.equal(S.sceneIdeas(gaps, facts, 'en')[2].title, 'Danger: DEX saving throw');
});

test('a ideia levada fica marcada: pela chave guardada e, nas cenas de antes, pelo texto (F2.1)', () => {
  const [spof, skill] = S.sceneIdeas(gaps, facts, 'pt');
  const scene = { id: 'c9', ...S.ideaScene(skill, 'pt') };
  assert.ok(S.sceneHasIdea(scene, skill));
  assert.ok(!S.sceneHasIdea(scene, spof));
  // renomeada no plano: a chave continua valendo
  assert.ok(S.sceneHasIdea({ ...scene, text: 'A ponte do mentiroso' }, skill));
  // cena feita pela versão de antes ("Cena nova" + a ideia nas notas) e a do servidor sem o bolso
  assert.ok(S.sceneHasIdea({ text: `Cena nova\n${skill.text}\nLacuna do grupo: ${skill.gap}` }, skill));
  assert.ok(S.sceneHasIdea({ text: 'Só Blefar resolve', what: skill.text }, skill));
  assert.ok(!S.sceneHasIdea({ text: 'Taverna' }, skill));
});
