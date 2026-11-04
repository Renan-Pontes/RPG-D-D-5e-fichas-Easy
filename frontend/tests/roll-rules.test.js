// Onda 3 (E2.6): "Rolagens na Tela" como uma lista do que vai à TV, cada linha com uma
// frase que bate com o comportamento (o 🎲 do mestre não segue o "Só 20 e 1").
import test from 'node:test';
import assert from 'node:assert/strict';
import { rollRuleRows, rulePatch, ruleSaveError, sheetsChoice, sheetsValue } from '../src/stage/roll-rules.js';

test('a lista: mestre, fichas, rolador da Mesa, monstros e testes, nessa ordem', () => {
  const rows = rollRuleRows({}, 'pt');
  assert.deepEqual(rows.map(r => r.key), ['dm', 'sheets', 'players', 'monsters', 'checks']);
  // padrões do servidor: players 'crits', dm 'secret', monsters 'shown', sheets true
  assert.deepEqual(rows.map(r => r.value), ['secret', 'all', 'crits', 'shown', null]);
  assert.equal(rows.find(r => r.key === 'checks').options, null, 'os testes não têm escolha, só a frase');
  for (const r of rows) assert.ok(r.why && r.title && r.icon, r.key);
});

test('a frase do mestre diz que o "Só 20 e 1" não vale para ele (o d20 = 2 com 📺 vai à TV)', () => {
  for (const dm of ['secret', 'shown']) {
    const why = rollRuleRows({ dm, players: 'crits' }, 'pt').find(r => r.key === 'dm').why;
    assert.match(why, /📺 Na tela/);
    assert.match(why, /qualquer número/);
    assert.match(why, /não vale para você/);
  }
  assert.match(rollRuleRows({ dm: 'shown' }, 'en').find(r => r.key === 'dm').why, /whatever the number/);
});

test('fichas em 3 posições, com o valor que o servidor guarda', () => {
  assert.equal(sheetsChoice(true), 'all');
  assert.equal(sheetsChoice(undefined), 'all', 'servidor de antes da V15: ligado');
  assert.equal(sheetsChoice('crits'), 'crits');
  assert.equal(sheetsChoice(false), 'off');
  assert.equal(sheetsValue('all'), true);
  assert.equal(sheetsValue('crits'), 'crits');
  assert.equal(sheetsValue('off'), false);
  assert.deepEqual(rulePatch('sheets', 'crits'), { sheets: 'crits' });
  assert.deepEqual(rulePatch('players', 'off'), { players: 'off' });
  const row = (v) => rollRuleRows({ sheets: v }, 'pt').find(r => r.key === 'sheets');
  assert.deepEqual(row(true).options.map(o => o.label), ['Todas', 'Só 20 e 1', 'Nenhuma']);
  assert.match(row('crits').why, /só os 20 e 1/);
  assert.match(row(false).why, /Nada das fichas/);
});

test('as frases não se contradizem: cada escolha do rolador da Mesa e dos testes', () => {
  const p = (players) => rollRuleRows({ players }, 'pt');
  assert.match(p('all').find(r => r.key === 'players').why, /Toda rolagem/);
  assert.match(p('crits').find(r => r.key === 'players').why, /só os 20 e 1/);
  assert.match(p('off').find(r => r.key === 'players').why, /Nada/);
  assert.match(p('crits').find(r => r.key === 'checks').why, /também aparece grande/);
  assert.match(p('off').find(r => r.key === 'checks').why, /não aparecem grandes/);
  assert.match(rollRuleRows({ monsters: 'secret' }, 'pt').find(r => r.key === 'monsters').why, /ficam com você/);
});

test('servidor de antes sem o "Só 20 e 1" das fichas: o aviso diz que falta atualizar', () => {
  const err = { status: 400, data: { error: 'invalid_sheets' } };
  assert.match(ruleSaveError(err, 'sheets', 'crits', 'pt'), /falta atualizar o servidor/);
  assert.match(ruleSaveError(err, 'sheets', 'crits', 'en'), /needs updating/);
  assert.match(ruleSaveError(new TypeError('x'), 'players', 'off', 'pt'), /confira a conexão/);
});
