/* Onda 3, F1: as ideias de momento em frase de mestre (F1.1), variadas entre os
 * personagens (F1.2) e a conta única dos momentos (F1.3) — src/group/moment-words.js,
 * com as fichas do seed jogo-e-combate onde importa. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as M from '../src/group/party-metrics.js';
import * as S from '../src/group/spotlights.js';
import {
  ideaTopic, momentHead, momentLine, momentPick, momentScene, momentSession, planMomentCount, planMoments, varyFirsts,
} from '../src/group/moment-words.js';
import { sceneIdeasByChar, sceneView } from '../src/prep/scene-model.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/party-jogo-e-combate.json', import.meta.url), 'utf8'));
const party = M.partyMembers(fixture.members);
const facts = M.partyFacts(party, 'pt');
const idOf = (name) => party.find(p => p.name.startsWith(name)).id;

test('o começo da frase usa o nome (sem gênero presumido), nas duas línguas', () => {
  assert.equal(momentHead('shine', 'Dagna Brasaforte', 'pt'), 'Dagna brilha');
  assert.equal(momentHead('push', 'Dagna Brasaforte', 'pt'), 'Um desafio para Dagna');
  assert.equal(momentHead('hook', 'Dagna Brasaforte', 'pt'), 'Uma cena da história de Dagna');
  assert.equal(momentHead('shine', 'Dagna', 'en'), 'Dagna shines');
  assert.equal(momentHead('push', 'Dagna', 'en'), 'A challenge for Dagna');
  assert.equal(momentHead('hook', 'Dagna', 'en'), "A scene from Dagna's story");
  // sem nome (não deveria acontecer): o rótulo do tipo
  assert.equal(momentHead('push', '', 'pt'), 'Desafia');
  assert.equal(momentLine({ kind: 'shine', text: 'um teste de Medicina — ninguém no grupo faz melhor' }, 'Dagna Brasaforte'),
    '★ Dagna brilha: um teste de Medicina — ninguém no grupo faz melhor');
  assert.equal(momentLine({ kind: 'push', text: 'x' }, 'Kaelor', 'pt', { icon: false }), 'Um desafio para Kaelor: x');
});

test('as ideias do seed: Dagna brilha em Medicina, desafio de Destreza, nada de %, de "ele" ou de "especialista"', () => {
  const dagna = S.momentSuggestions(facts, { dc: 15 })[idOf('Dagna')];
  const lines = dagna.map(s => momentLine(s, 'Dagna Brasaforte', 'pt'));
  assert.ok(lines.includes('★ Dagna brilha: um teste de Medicina — ninguém no grupo faz melhor'), lines.join('\n'));
  assert.ok(lines.includes('↗ Um desafio para Dagna: uma salvaguarda de Destreza, o ponto fraco de Dagna'), lines.join('\n'));
  assert.ok(lines.some(l => l.startsWith('✎ Uma cena da história de Dagna: “')), lines.join('\n'));
  for (const l of lines) assert.doesNotMatch(l, /%|especialista|\bele\b|\bdele\b|\bela\b|\bdela\b/, l);
  // os números continuam disponíveis no detalhe
  assert.equal(dagna.find(s => s.auto === 'skill:medicine').detail, 'Medicina +5 · 55% na CD 15 · o 2º do grupo: 45%');
  assert.equal(dagna.find(s => s.auto === 'push:save:dex').detail, 'salvaguarda de DES −1 · 35% na CD 13');
});

test('a conta única: esperando (com ou sem cena) + os que aconteceram hoje', () => {
  const list = [
    { id: 'm1', kind: 'shine', text: 'a', done: null, plan: 'c2' },     // na cena c2
    { id: 'm2', kind: 'push', text: 'b', done: null, plan: null },      // aceito no Raio-X, sem cena
    { id: 'm3', kind: 'hook', text: 'c', done: 3, plan: 'c1' },         // aconteceu na sessão 3
    { id: 'm4', kind: 'shine', text: 'd', done: null, plan: 'velha' },  // cena que saiu do plano
  ];
  // a Sessão 3 ao vivo: os de hoje contam
  assert.deepEqual(planMomentCount(list, { session: 3, sceneIds: ['c1', 'c2'] }), { total: 4, noScene: 2 });
  // a Sessão 4 (parada, preparando): o que aconteceu na 3 não conta
  assert.deepEqual(planMomentCount(list, { session: 4, sceneIds: new Set(['c1', 'c2']) }), { total: 3, noScene: 2 });
  assert.deepEqual(planMoments(list, { session: 4, sceneIds: ['c2'] }).map(r => [r.moment.id, r.sceneId]), [['m1', 'c2'], ['m2', null], ['m4', null]]);
  // servidor de antes (o GET do Raio-X sem as cenas do plano): vale a cena gravada — o total é o mesmo
  assert.deepEqual(planMomentCount(list, { session: 4 }), { total: 3, noScene: 1 });
  // F1.3: o Raio-X com as cenas do plano (planScenes) conta igual ao Plano: a cena apagada
  // (ou arquivada) vira "sem cena ainda" e o cartão mostra "→ Cena"
  assert.deepEqual(planMomentCount(list, { session: 4, sceneIds: ['c2'] }), planMomentCount(list, { session: 4, sceneIds: new Set(['c2']) }));
  assert.equal(momentScene(list[3], ['c1', 'c2']), null);
  assert.equal(momentScene(list[3], null), 'velha');
  assert.equal(momentScene(list[0], new Set(['c2'])), 'c2');
  assert.equal(momentScene(list[1], ['c2']), null);
  assert.equal(momentScene({ plan: 'c9' }, []), null);   // plano sem cenas: nenhuma cena vale
  assert.deepEqual(planMomentCount([], {}), { total: 0, noScene: 0 });
  // a sessão que conta: a ao vivo ou a próxima
  assert.equal(momentSession({ session: '3', live: true }), 3);
  assert.equal(momentSession({ session: '3', live: false }), 4);
  assert.equal(momentSession({ session: 'Sessão 12' }), 13);
  assert.equal(momentSession({}), 1);
  assert.equal(momentSession({ session: '', diarySessions: { 2: {}, 5: {} } }), 6);
});

test('as primeiras ideias de personagens diferentes não repetem o assunto (varyFirsts)', () => {
  assert.equal(ideaTopic('push:skill:perception'), ideaTopic('skill:perception'));
  assert.equal(ideaTopic('push:save:dex'), 'save:dex');
  const lists = {
    1: [{ kind: 'shine', auto: 'skill:perception' }, { kind: 'shine', auto: 'role:heal' }],
    2: [{ kind: 'push', auto: 'push:skill:perception' }, { kind: 'shine', auto: 'skill:perception' }, { kind: 'shine', auto: 'skill:arcana' }],
    3: [{ kind: 'push', auto: 'push:skill:perception' }, { kind: 'push', auto: 'push:save:wis' }],
  };
  const out = varyFirsts([1, 2, 3], lists);
  assert.deepEqual([out[1][0].auto, out[2][0].auto, out[3][0].auto], ['skill:perception', 'skill:arcana', 'push:save:wis']);
  // nada some: só a ordem muda
  assert.equal(out[2].length, 3);
  // o que a cena já tem (taken) também não se repete
  const taken = varyFirsts([1], lists, ['skill:perception']);
  assert.equal(taken[1][0].auto, 'role:heal');
  // sem alternativa: fica como está
  assert.equal(varyFirsts([9], { 9: [{ kind: 'shine', auto: 'skill:x' }] }, ['skill:x'])[9][0].auto, 'skill:x');
});

test('F1.2: numa cena com Percepção, as 1ªs ideias dos 4 personagens são de assuntos diferentes', () => {
  const view = sceneView({ id: 'c1', text: 'Lago', check: { kind: 'skill', key: 'perception', dc: 15 } });
  const sug = S.momentSuggestions(facts, { dc: 15 });
  const by = sceneIdeasByChar(view, facts, (id) => sug[id] || [], { lang: 'pt' });
  const firsts = facts.map(f => by[f.id][0]);
  const topics = firsts.map(s => ideaTopic(s.auto));
  assert.equal(new Set(topics).size, facts.length, topics.join(' · '));
  assert.ok(topics.filter(x => x === 'skill:perception').length <= 1, 'no máximo 1 com o teste da cena');
  // cada um puxa um ponto forte próprio: nenhuma 1ª ideia é um desafio
  assert.ok(firsts.every(s => s.kind !== 'push'), firsts.map(s => s.auto).join(' · '));
  // o melhor em Percepção ganha o teste da cena em 1º (com o porquê); os outros o têm mais abaixo
  const best = facts.slice().sort((a, b) => b.skills.perception - a.skills.perception)[0];
  assert.equal(by[best.id][0].auto, 'skill:perception');
  assert.equal(by[best.id][0].why, 'a cena tem Percepção CD 15');
  // com o momento do melhor já na cena, ninguém recebe Percepção em 1º
  const after = sceneIdeasByChar(view, facts, (id) => sug[id] || [], { taken: ['skill:perception'], usedOf: (id) => (id === best.id ? ['skill:perception'] : []) });
  assert.ok(facts.every(f => ideaTopic(after[f.id][0].auto) !== 'skill:perception'));
});

test('momentSuggestions: as 1ªs ★ de personagens diferentes nunca repetem a perícia', () => {
  for (const style of [{}, Object.fromEntries(facts.map(f => [f.id, ['explore']]))]) {
    const sug = S.momentSuggestions(facts, { style });
    const firsts = facts.map(f => ideaTopic(sug[f.id][0].auto));
    assert.equal(new Set(firsts).size, firsts.length, firsts.join(' · '));
  }
});

test('celular: aceitar ou escrever um momento não troca o personagem à vista; só o chip troca (F2.6)', () => {
  // o banco previa-mestre: Dagna, Elarion, Kaelor e Pipo, todos com 0 momentos e sem histórico
  const ids = [1, 2, 3, 4];
  const zero = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const first = momentPick({ ids, count: zero });
  assert.equal(first, 1);
  // a conta sem o padrão fixado pularia para Elarion (o bug): por isso o cartão guarda o 1º
  const accepted = { ...zero, 1: 1 };
  assert.equal(momentPick({ ids, count: accepted }), 2);
  assert.equal(momentPick({ ids, initial: first, count: accepted }), 1);
  // escrever mais um, ou o histórico chegando com o "⚠ sem momento" de outro, também não troca
  assert.equal(momentPick({ ids, initial: first, count: { ...accepted, 1: 2 }, drought: { 3: 4 } }), 1);
  // o chip (ou o destaque vindo de Jogadores) troca; quem saiu de quem entra volta ao padrão
  assert.equal(momentPick({ ids, pick: 3, initial: first, count: accepted }), 3);
  assert.equal(momentPick({ ids: [2, 3, 4], pick: 1, initial: 1, count: accepted, drought: { 4: 2 } }), 4);
  // sem escolha nem padrão: quem está há mais tempo sem momento, depois quem tem menos
  assert.equal(momentPick({ ids, drought: { 3: 2, 4: 1 }, count: zero }), 3);
  assert.equal(momentPick({ ids, count: { 1: 2, 2: 1, 3: 0, 4: 3 } }), 3);
  assert.equal(momentPick({ ids: [] }), null);
});
