/* Momentos (G8), estilo do jogador e Equilíbrio na mesa (G9) do Raio-X — e os ganchos
 * fora dele (Pedir teste, cartão de Jogadores, Próxima sessão) —, com as fichas do seed
 * jogo-e-combate (src/group/spotlights.js e party-metrics.js). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Utils from '../utils.js';
import * as M from '../src/group/party-metrics.js';
import * as S from '../src/group/spotlights.js';
import { rollChance } from '../src/group/party-best.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/party-jogo-e-combate.json', import.meta.url), 'utf8'));
const party = M.partyMembers(fixture.members);
const facts = M.partyFacts(party, 'pt');
const idOf = (name) => party.find(p => p.name.startsWith(name)).id;
const PIPO = idOf('Pipo');
const KAELOR = idOf('Kaelor');
const texts = (list) => list.map(s => `${S.kindIcon(s.kind)} ${s.text}`);
const SOCIAL_PUSH = ['persuasion', 'deception', 'intimidation', 'performance'];

test('sugestões do Pipo: ★ Prestidigitação, ★ Ferramentas de Ladrão, ↗ SAB e ✎ o texto da ficha', () => {
  const pipo = texts(S.momentSuggestions(facts, { dc: 15 })[PIPO]);
  assert.ok(pipo.includes('★ Prestidigitação 65% (2º 35%)'), pipo.join('\n'));
  assert.ok(pipo.includes('★ único com Ferramentas de Ladrão'), pipo.join('\n'));
  assert.ok(pipo.includes('↗ salvaguarda de SAB +0 · CD 13 passa 40%'), pipo.join('\n'));
  assert.ok(pipo.some(x => x.startsWith('✎') && x.includes('Brincalhão, curioso e incapaz de resistir a uma porta trancada')), pipo.join('\n'));
  // sem estilo: ★ primeiro, depois ↗ e por fim ✎; a pior perícia "de todo mundo" é Persuasão −1
  const kinds = S.momentSuggestions(facts, {})[PIPO].map(s => s.kind);
  assert.deepEqual(kinds, ['shine', 'shine', 'shine', 'push', 'push', 'hook']);
  assert.ok(pipo.includes('↗ Persuasão −1 · tentar sem o especialista do grupo'));
  // chaves estáveis (Dispensar grava só ela); desafio tem prefixo próprio
  assert.deepEqual(S.momentSuggestions(facts, {})[PIPO].map(s => s.auto),
    ['skill:sleightOfHand', 'skill:stealth', 'tool:thievesTools', 'push:save:wis', 'push:skill:persuasion', 'text:personality']);
  assert.match(texts(S.momentSuggestions(facts, { lang: 'en' })[PIPO]).join('\n'), /↗ WIS save \+0 · DC 13 passes 40%/);
});

test('🤐 fala pouco: nenhum desafio social e o 1º ★ é de perícia não social', () => {
  const quiet = (id) => S.momentSuggestions(facts, { style: { [id]: ['quiet'] } })[id];
  for (const p of party) {
    const list = quiet(p.id);
    const pushSkills = list.filter(s => s.kind === 'push' && s.auto.startsWith('push:skill:')).map(s => s.auto.split(':')[2]);
    assert.ok(!pushSkills.some(k => SOCIAL_PUSH.includes(k)), `${p.name}: ${pushSkills}`);
    const firstShine = list.find(s => s.kind === 'shine');
    assert.ok(firstShine.auto.startsWith('skill:') && !SOCIAL_PUSH.includes(firstShine.auto.slice(6)), `${p.name}: ${firstShine.auto}`);
  }
  assert.ok(!texts(quiet(PIPO)).some(x => /^↗ (Persuasão|Blefar|Intimidação|Atuação)/.test(x)));
  // Kaelor brilha em Intimidação: a sugestão fica, mas depois das que não pedem falar
  const k = quiet(KAELOR).filter(s => s.kind === 'shine').map(s => s.auto);
  assert.equal(k[0], 'skill:athletics');
  assert.equal(k.at(-1), 'skill:intimidation');
  // bardo que só brilha em perícias sociais ganha um 1º ★ que não é falar em público
  const bard = {
    ...Utils.makeNew(), rulesVersion: '2024', race: 'human', className: 'bard', level: 1, name: 'Lira',
    abilities: { str: 8, dex: 12, con: 12, int: 10, wis: 10, cha: 16 }, skillProfs: ['persuasion', 'deception', 'performance'],
  };
  const fighter = { ...Utils.makeNew(), rulesVersion: '2024', race: 'human', className: 'fighter', level: 1, name: 'Bruto', abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 8 } };
  const two = M.partyFacts(M.partyMembers([bard, fighter].map((data, i) => ({ role: 'player', character: { id: 50 + i, name: data.name, data } }))), 'pt');
  const loud = S.momentSuggestions(two, {})[50].filter(s => s.kind === 'shine');
  assert.ok(SOCIAL_PUSH.includes(loud[0].auto.slice(6)), 'sem estilo, o bardo brilha numa social');
  const shy = S.momentSuggestions(two, { style: { 50: ['quiet'] } })[50].filter(s => s.kind === 'shine');
  assert.ok(shy[0].auto.startsWith('skill:') && !SOCIAL_PUSH.includes(shy[0].auto.slice(6)), shy[0].auto);
});

test('os outros estilos puxam as sugestões do assunto deles', () => {
  const sug = (st) => S.momentSuggestions(facts, { style: st });
  // 📖 história: o gancho da ficha vem primeiro
  assert.equal(sug({ [PIPO]: ['story'] })[PIPO][0].kind, 'hook');
  // ⚔ luta: Kaelor é a linha de frente do grupo
  const kae = sug({ [KAELOR]: ['combat'] })[KAELOR].filter(s => s.kind === 'shine');
  assert.ok(kae.some(s => s.auto === 'axis:melee' && s.text === 'linha de frente (Corpo a corpo 4,2)'), kae.map(s => s.text).join('\n'));
  // 🧭 explorar: Elarion (que não brilha em nada de explorar) ganha a melhor perícia de exploração, em 1º
  const ela = sug({ [idOf('Elarion')]: ['explore'] })[idOf('Elarion')];
  assert.equal(ela[0].auto, 'skill:investigation');
  assert.match(ela[0].text, /🧭 gosta de explorar$/);
  // 🧩 enigma: Dagna ganha uma perícia de INT
  const dag = sug({ [idOf('Dagna')]: ['puzzle'] })[idOf('Dagna')];
  assert.equal(dag[0].auto, 'skill:religion');
});

test('nenhum estilo repete a chave de uma sugestão (Investigação é enigma e explorar)', () => {
  // dois guerreiros de INT 14; só a Mia tem Investigação: ela lidera numa perícia de INT que também é de explorar
  const mk = (o) => ({ ...Utils.makeNew(), rulesVersion: '2024', race: 'human', className: 'fighter', level: 1, ...o });
  const mia = mk({ name: 'Mia', abilities: { str: 14, dex: 12, con: 14, int: 14, wis: 10, cha: 8 }, skillProfs: ['investigation', 'athletics'] });
  const bruto = mk({ name: 'Bruto', abilities: { str: 16, dex: 12, con: 14, int: 14, wis: 10, cha: 8 }, skillProfs: ['athletics', 'intimidation'] });
  const duo = M.partyFacts(M.partyMembers([mia, bruto].map((data, i) => ({ role: 'player', character: { id: 70 + i, name: data.name, data } }))), 'pt');
  const puzzle = S.momentSuggestions(duo, { style: { 70: ['puzzle'] } })[70];
  assert.deepEqual(puzzle.filter(s => s.auto === 'skill:investigation').length, 1, puzzle.map(s => s.auto).join(' '));
  assert.equal(puzzle[0].auto, 'skill:investigation', 'a perícia de INT que ele já lidera sobe para o topo');
  // as 64 combinações de estilo, nas fichas do seed e nas duas sintéticas
  const ids = S.STYLES.map(x => x.id);
  for (const group of [facts, duo]) {
    for (let mask = 0; mask < 64; mask++) {
      const st = ids.filter((_, i) => mask & (1 << i));
      for (const f of group) {
        const keys = S.momentSuggestions(group, { style: { [f.id]: st } })[f.id].map(x => x.auto);
        assert.equal(new Set(keys).size, keys.length, `${f.name} ${st.join('+')}: ${keys.join(' ')}`);
      }
    }
  }
});

test('aceitar, escrever (até 160), dispensar e o limite de 12 por personagem', () => {
  const sug = S.momentSuggestions(facts, {})[PIPO];
  let list = S.acceptMoment([], sug[0]);
  assert.deepEqual(list, [{ id: 'm1', kind: 'shine', text: 'Prestidigitação 65% (2º 35%)', auto: 'skill:sleightOfHand', done: null, plan: null }]);
  // aceita some das sugestões que ainda valem; dispensada também
  assert.ok(!S.openSuggestions(sug, list, []).some(s => s.auto === 'skill:sleightOfHand'));
  const dismissed = S.dismissKey([], 'tool:thievesTools');
  assert.deepEqual(S.openSuggestions(sug, list, dismissed).map(s => s.auto), sug.slice(1).filter(s => s.auto !== 'tool:thievesTools').map(s => s.auto));
  // escrever: 161 caracteres → os 160 primeiros e o aviso
  const long = 'x'.repeat(161);
  const w = S.writeMoment(list, 'push', long);
  assert.equal(w.cut, true);
  assert.equal(w.list.at(-1).text.length, 160);
  assert.deepEqual([w.list.at(-1).id, w.list.at(-1).kind, w.list.at(-1).auto], ['m2', 'push', null]);
  assert.equal(S.writeMoment(list, 'hook', ' Porta trancada do sino ').cut, false);
  assert.equal(S.writeMoment(list, 'shine', '   ').list, list, 'texto vazio não grava');
  // 12 no máximo
  for (let i = 0; i < 20; i++) list = S.writeMoment(list, 'shine', `momento ${i}`).list;
  assert.equal(list.length, S.MAX_MOMENTS);
  assert.equal(S.acceptMoment(list, sug[1]), list);
  // dispensadas: até 40, sem repetir (as mais antigas saem)
  let d = [];
  for (let i = 0; i < 45; i++) d = S.dismissKey(d, `skill:k${i}`);
  d = S.dismissKey(d, 'skill:k44');
  assert.equal(d.length, S.MAX_DISMISSED);
  assert.equal(d[0], 'skill:k5');
});

test('o cartão mostra primeiro um de cada tipo (★ ↗ ✎)', () => {
  const pipo = S.spreadKinds(S.momentSuggestions(facts, {})[PIPO]);
  assert.deepEqual(pipo.slice(0, 3).map(s => s.auto), ['skill:sleightOfHand', 'push:save:wis', 'text:personality']);
  assert.equal(pipo.length, 6);
  assert.deepEqual(S.spreadKinds([]), []);
});

test('aconteceu grava o nº da sessão (a regra do servidor) e o filtro da lista', () => {
  assert.equal(S.currentSession(fixture.state), 3);
  assert.equal(S.currentSession({ session: 'Sessão 12' }), 12);
  assert.equal(S.currentSession({ session: 7 }), 7);
  assert.equal(S.currentSession({ session: '', diarySessions: { 2: {}, 5: {}, x: {} } }), 5);
  assert.equal(S.currentSession({}), null);
  let list = S.writeMoment([], 'shine', 'Fechadura que só o Pipo abre').list;
  list = S.writeMoment(list, 'hook', 'A irmã desaparecida').list;
  list = S.toggleDone(list, 'm1', 3);
  assert.equal(list[0].done, 3);
  assert.equal(S.toggleDone(list, 'm1', 3)[0].done, null, 'tocar de novo desmarca');
  const old = S.updateMoment(list, 'm2', { done: 1 });
  assert.deepEqual(S.filterMoments(old, 'session', 3).map(m => m.id), ['m1']);
  assert.deepEqual(S.filterMoments(old, 'done', 3).map(m => m.id), ['m1', 'm2']);
  assert.deepEqual(S.filterMoments(S.updateMoment(old, 'm1', { done: null }), 'session', 3).map(m => m.id), ['m1']);
  assert.equal(S.filterMoments(old, 'all', 3).length, 2);
  assert.deepEqual(S.removeMoment(old, 'm1').map(m => m.id), ['m2']);
  assert.equal(S.momentSceneText(list[0], 'Pipo Mão-Leve', 'pt'), '★ Pipo · Brilha: Fechadura que só o Pipo abre');
  assert.equal(S.momentSceneText({ kind: 'push', text: 'Medo' }, 'Kaelor', 'en'), '↗ Kaelor · Challenges: Medo');
});

test('G9: Equilíbrio na mesa — momentos nas últimas 5 sessões, testes nas últimas 3 e o alerta', () => {
  const history = {
    current: 3,
    sessions: [
      { number: 3, checks: { [PIPO]: { asked: 2, answered: 2, passed: 1 }, [KAELOR]: { asked: 1, answered: 1, passed: 0 } }, downs: {} },
      { number: 2, checks: { [PIPO]: { asked: 1, answered: 1, passed: 1 } }, downs: {} },
    ],
  };
  const spot = { [PIPO]: S.toggleDone(S.writeMoment([], 'shine', 'Fechadura').list, 'm1', 3) };
  const b = S.tableBalance({ facts, spotlights: spot, style: { [KAELOR]: ['quiet'] }, history });
  const row = (id) => b.rows.find(r => r.id === id);
  assert.deepEqual(b.sessions, [3, 2]);
  assert.equal(row(PIPO).moments, 1);
  assert.deepEqual(row(PIPO).checks, { asked: 3, answered: 3, passed: 2 });
  assert.equal(row(PIPO).warn, false);
  // Kaelor fala pouco e passou as 2 sessões sem momento: ⚠
  assert.deepEqual([row(KAELOR).drought, row(KAELOR).quiet, row(KAELOR).warn], [2, true, true]);
  // quem não é "fala pouco" só ganha o alerta com 3 sessões
  assert.deepEqual([row(idOf('Dagna')).drought, row(idOf('Dagna')).warn], [2, false]);
  const three = { sessions: [{ number: 4, checks: {} }, ...history.sessions] };
  const b3 = S.tableBalance({ facts, spotlights: spot, history: three });
  assert.equal(b3.rows.find(r => r.id === idOf('Dagna')).warn, true);
  assert.equal(b3.rows.find(r => r.id === PIPO).drought, 1, 'o momento da sessão 3 corta a seca');
  // só as últimas 3 sessões contam nos testes e as últimas 5 nos momentos
  const many = { sessions: [6, 5, 4, 3, 2, 1].map(n => ({ number: n, checks: { [PIPO]: { asked: 1, answered: 0, passed: 0 } } })) };
  const old = { [PIPO]: [{ id: 'm1', kind: 'shine', text: 'a', done: 1 }, { id: 'm2', kind: 'shine', text: 'b', done: 4 }] };
  const bm = S.tableBalance({ facts, spotlights: old, history: many }).rows.find(r => r.id === PIPO);
  assert.equal(bm.checks.asked, 3);
  assert.equal(bm.moments, 1);
  // sem histórico (ainda carregando ou sem rede): as sessões do próprio estado
  assert.deepEqual(S.tableBalance({ facts, spotlights: spot, state: { session: '3', diarySessions: { 1: {}, 3: {} } } }).sessions, [3, 1]);
});

test('Oportunidades: momentos aceitos que faltam vêm antes das sugestões; os que aconteceram saem', () => {
  const axes = M.partyAxes(facts);
  const skills = M.partySkills(facts, 15);
  const gaps = S.partyGaps(facts, axes, {});
  const suggestions = S.shineSuggestions(facts, {});
  const spot = { [PIPO]: S.toggleDone(S.writeMoment(S.writeMoment([], 'shine', 'Fechadura do sino').list, 'shine', 'Já foi').list, 'm2', 3) };
  const q = S.quadrants({ facts, party: axes, skills, gaps, suggestions, spotlights: spot });
  const pipo = q.opportunities.filter(x => x.id === PIPO).map(x => x.text);
  assert.equal(pipo[0], 'Pipo: Fechadura do sino');
  assert.ok(!pipo.includes('Pipo: Já foi'));
  // a sugestão aceita não aparece duas vezes
  const accepted = { [PIPO]: S.acceptMoment([], suggestions[PIPO][0]) };
  const qa = S.quadrants({ facts, party: axes, skills, gaps, suggestions, spotlights: accepted });
  assert.equal(qa.opportunities.filter(x => x.text === 'Pipo: Prestidigitação 65% (2º 35%)').length, 1);
});

test('ganchos: melhor da mesa no Pedir teste, papéis no cartão de jogador e a linha da Próxima sessão', () => {
  const stealth = M.bestAt(party, 'skill', 'stealth', 15);
  assert.deepEqual([M.firstName(stealth.who[0]), stealth.best, stealth.p, stealth.group], ['Pipo', 7, 65, 88]);
  // o dado da folha Pedir teste: +5 na CD 12 → 70% normal, 91% com vantagem, 49% com desvantagem
  const dex = (mode) => M.bestAt(party, 'save', 'dex', 12, mode ? { mode } : undefined);
  assert.deepEqual([M.firstName(dex().who[0]), dex().best], ['Pipo', 5]);
  assert.deepEqual([dex().p, dex('normal').p, dex('adv').p, dex('dis').p], [70, 70, 91, 49]);
  assert.ok(dex('adv').group >= dex('adv').p && dex('dis').group < dex().group, 'o "pelo menos 1 passa" usa o mesmo dado');
  assert.deepEqual([rollChance(0.7), rollChance(0.7, 'adv'), rollChance(0.7, 'dis')].map(M.pct), [70, 91, 49]);
  const wis = M.bestAt(party, 'save', 'wis', 13);
  assert.deepEqual([M.firstName(wis.who[0]), wis.best, wis.p], ['Dagna', 5, 65]);
  assert.equal(M.bestAt([], 'skill', 'stealth'), null);
  // a folha Pedir teste passa os membros da campanha (sem o mestre e sem quem não tem ficha)
  const raw = M.bestAt([{ role: 'dm', character: null }, { role: 'player', character: null }, ...fixture.members], 'skill', 'stealth', 15);
  assert.deepEqual([raw.who, raw.best, raw.p], [['Pipo Mão-Leve'], 7, 65]);
  const avg = M.partyAxes(facts).axes;
  const dagna = facts.find(f => f.id === idOf('Dagna'));
  assert.deepEqual(M.topRoles(dagna, { avg }).map(r => `${M.axisLabel(r.key, 'pt')} ${M.fmt(r.v, 'pt')}`), ['Cura 5', 'Magia 5']);
  assert.ok(!M.topRoles(dagna, { avg, hidden: ['heal'] }).some(r => r.key === 'heal'));
  const pipo = facts.find(f => f.id === PIPO);
  assert.equal(S.partyLine(pipo, facts, 'pt'), 'brilha em Prestidigitação e Furtividade · fraco em salvaguarda de SAB (+0)');
  assert.equal(S.partyLine(pipo, facts, 'en'), 'shines at Sleight of Hand and Stealth · weak at WIS saves (+0)');
  assert.equal(S.styleLabel('quiet', 'pt'), '🤐 fala pouco');
  assert.deepEqual(S.STYLES.map(s => s.id), ['talk', 'quiet', 'combat', 'puzzle', 'explore', 'story'], 'a mesma lista do servidor (PARTY_STYLES)');
});
