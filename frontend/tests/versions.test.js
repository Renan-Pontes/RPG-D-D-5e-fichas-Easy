import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPLATE, storeOf, sheetData, dataOf, register, checkout, leave, rejoin, archive, exclude, promote,
  undoPromote, canUndoPromote, reconcile, rows, isReadOnly, previewChar, parseSheetHash, sheetHash,
} from '../src/sheet/versions.js';

const base = () => ({ id: 7, name: 'Lia', level: 1, maxHp: 10, currentHp: 10, avatar: 'data:image/png;base64,AAA', inCampaign: false });
const A = { id: 1, name: 'Zéfiro' };
const B = { id: 2, name: 'Ecos' };

test('ficha sem versões: só o modelo, em uso', () => {
  const s = storeOf(base());
  assert.equal(s.current, TEMPLATE);
  assert.deepEqual(rows(base()).map(r => r.key), [TEMPLATE]);
  assert.equal(sheetData(base()).id, undefined);
  assert.equal(sheetData(base()).inCampaign, undefined);
});

test('entrar numa campanha copia o modelo; as duas seguem independentes', () => {
  let c = register(base(), A);
  c = checkout(c, 1);
  assert.equal(storeOf(c).current, '1');
  assert.equal(c.level, 1);
  c = { ...c, level: 5, currentHp: 3 };           // evolui na campanha
  c = checkout(c, TEMPLATE);
  assert.equal(c.level, 1, 'o modelo não mudou');
  assert.equal(c.currentHp, 10);
  assert.equal(dataOf(c, 1).level, 5, 'a versão guardou o progresso');
  c = checkout(c, 1);
  assert.equal(c.level, 5);
  assert.equal(c.id, 7, 'campos do servidor ficam');
});

test('duas campanhas: cada uma com a sua cópia', () => {
  let c = checkout(register(base(), A), 1);
  c = { ...c, level: 3 };
  c = register(c, B);
  c = checkout(c, 2);
  assert.equal(c.level, 1, 'B nasce do modelo, não de A');
  c = { ...c, level: 8 };
  assert.equal(dataOf(c, 1).level, 3);
  assert.equal(dataOf(c, 2).level, 8);
  assert.equal(dataOf(c, TEMPLATE).level, 1);
});

test('retrato igual não é duplicado, e volta no checkout', () => {
  let c = checkout(register(base(), A), 1);
  assert.equal(storeOf(c).template.data.avatar, undefined);
  assert.equal(storeOf(c).template.data._avatarSame, true);
  assert.equal(dataOf(c, TEMPLATE).avatar, base().avatar);
  c = { ...c, avatar: 'data:image/png;base64,BBB' };  // retrato próprio na campanha
  c = checkout(c, TEMPLATE);
  assert.equal(c.avatar, 'data:image/png;base64,BBB', 'modelo usava "o mesmo" → acompanha o que ficou');
  assert.equal(dataOf(c, 1).avatar, 'data:image/png;base64,BBB');
});

test('sair guarda a versão; voltar reusa a mesma', () => {
  let c = checkout(register(base(), A), 1);
  c = { ...c, level: 4 };
  c = leave(c, 1);
  assert.equal(storeOf(c).current, TEMPLATE);
  assert.equal(storeOf(c).campaigns['1'].state, 'left');
  assert.equal(c.level, 1);
  assert.equal(isReadOnly(c, 1), true);
  c = rejoin(c, 1);
  assert.equal(storeOf(c).campaigns['1'].state, 'active');
  c = checkout(c, 1);
  assert.equal(c.level, 4, 'não recopiou o modelo');
});

test('excluir só depois de sair, e é para sempre', () => {
  let c = checkout(register(base(), A), 1);
  assert.throws(() => exclude(c, 1), /version_active/);
  c = leave(c, 1);
  c = exclude(c, 1);
  assert.equal(storeOf(c).campaigns['1'], undefined);
  assert.deepEqual(rows(c).map(r => r.key), [TEMPLATE]);
});

test('promover a modelo (versão em uso e guardada) e desfazer', () => {
  let c = checkout(register(base(), A), 1);
  c = { ...c, level: 6 };
  c = promote(c, 1);                      // em uso: a campanha
  assert.equal(dataOf(c, TEMPLATE).level, 6);
  assert.equal(c.level, 6);
  assert.equal(canUndoPromote(c), true);
  c = undoPromote(c);
  assert.equal(dataOf(c, TEMPLATE).level, 1);
  assert.equal(canUndoPromote(c), false);
  c = checkout(c, TEMPLATE);
  c = promote(c, 1);                      // em uso: o modelo
  assert.equal(c.level, 6);
  assert.equal(dataOf(c, 1).level, 6, 'a versão não é tocada');
  c = undoPromote(c);
  assert.equal(c.level, 1);
});

test('arquivo: campanha encerrada ou apagada vira só leitura e sai de uso', () => {
  let c = checkout(register(base(), A), 1);
  c = { ...c, level: 9 };
  c = archive(c, 1);
  assert.equal(storeOf(c).current, TEMPLATE);
  assert.equal(storeOf(c).campaigns['1'].state, 'archived');
  assert.throws(() => rejoin(c, 1), /archived/);
  assert.equal(dataOf(c, 1).level, 9);
  c = exclude(c, 1);
  assert.equal(storeOf(c).campaigns['1'], undefined);
});

test('reconcile: ficha já atrelada antes das versões → modelo nasce igual, campanha em uso', () => {
  const { char, changed } = reconcile({ ...base(), level: 3, inCampaign: true }, [A], [{ id: 1, name: 'Zéfiro', status: 'active' }]);
  assert.equal(changed, true);
  assert.equal(storeOf(char).current, '1');
  assert.equal(dataOf(char, TEMPLATE).level, 3);
  assert.equal(reconcile(char, [A], [{ id: 1, name: 'Zéfiro', status: 'active' }]).changed, false);
});

test('reconcile: encerrada ou sumida vira arquivo; nome novo é copiado', () => {
  let c = leave(checkout(register(register(base(), A), B), 1), 1);
  let r = reconcile(c, [], [{ id: 1, name: 'Zéfiro II', status: 'active' }, { id: 2, name: 'Ecos', status: 'closed' }]);
  assert.equal(storeOf(r.char).campaigns['1'].name, 'Zéfiro II');
  assert.equal(storeOf(r.char).campaigns['1'].state, 'left');
  assert.equal(storeOf(r.char).campaigns['2'].state, 'archived');
  r = reconcile(c, [], []);
  assert.equal(storeOf(r.char).campaigns['1'].state, 'archived');
  r = reconcile(c, [], null);            // sem a lista: não arquiva por engano
  assert.equal(storeOf(r.char).campaigns['1'].state, 'left');
});

test('linhas: modelo primeiro, depois ativas, saiu, arquivo; com prévia', () => {
  let c = register(register(register(base(), { id: 3, name: 'Cinzas' }), A), B);
  c = leave(c, 2);
  c = archive(c, 3);
  const r = rows(c);
  assert.deepEqual(r.map(x => x.key), [TEMPLATE, '1', '2', '3']);
  assert.deepEqual(r.map(x => x.state), ['template', 'active', 'left', 'archived']);
  assert.equal(r[0].current, true);
  assert.equal(r[1].level, 1);
});

test('prévia só leitura: id de texto e marca da versão', () => {
  let c = leave({ ...checkout(register(base(), A), 1), level: 4 }, 1);
  const p = previewChar(c, 1);
  assert.equal(p.id, 'v:7:1');
  assert.equal(p.level, 4);
  assert.deepEqual(p.versionPreview, { of: 7, key: '1', state: 'left', name: 'Zéfiro' });
  assert.equal(p.versions, undefined);
});

test('endereço da ficha com versão', () => {
  assert.deepEqual(parseSheetHash('#ficha=12'), { id: 12, key: null });
  assert.deepEqual(parseSheetHash('#ficha=12@34'), { id: 12, key: '34' });
  assert.equal(parseSheetHash('#outra'), null);
  assert.equal(sheetHash(12, 34), '#ficha=12@34');
  assert.equal(sheetHash(12, TEMPLATE), '#ficha=12');
});

test('reconcile: saiu por fora (faixa da campanha ou mestre) → versão guardada como left', () => {
  let c = { ...checkout(register(base(), A), 1), level: 5 };
  const r = reconcile(c, [], [{ id: 1, name: 'Zéfiro', status: 'active' }]);
  assert.equal(storeOf(r.char).current, TEMPLATE);
  assert.equal(storeOf(r.char).campaigns['1'].state, 'left');
  assert.equal(r.char.level, 1);
  assert.equal(dataOf(r.char, 1).level, 5);
});

test('reconcile: troca de mesa por fora não perde a versão que saía', () => {
  let c = { ...checkout(register(base(), A), 1), level: 5 };
  const r = reconcile(c, [B], null);
  assert.equal(storeOf(r.char).current, '2');
  assert.equal(dataOf(r.char, 1).level, 5);
});
