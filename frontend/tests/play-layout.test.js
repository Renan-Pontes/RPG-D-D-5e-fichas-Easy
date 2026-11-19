import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitColumns, assignColumns } from '../src/sheet/play-layout.js';

// Aba Jogar no desktop: a 1ª coluna leva os k primeiros painéis (ordem do celular).
test('divide para as duas colunas terminarem perto uma da outra', () => {
  // mago: PV e ataques à esquerda; espaços, recursos, condições, atributos e descanso à direita
  assert.equal(splitColumns([450, 230, 200, 158, 160, 210, 115]), 2);
  // guerreiro: ataques compridos, o resto curto
  assert.equal(splitColumns([450, 700, 130, 200, 160, 210, 115]), 2);
  // druida: Forma Selvagem grande no fim
  assert.equal(splitColumns([450, 280, 200, 160, 160, 510, 210, 115]), 4);
});

test('painel que não aparece (altura 0) não muda a divisão', () => {
  assert.equal(splitColumns([450, 300, 160, 210, 115]), 2);
  assert.equal(splitColumns([450, 300, 0, 160, 210, 115]), 2);
});

test('casos de borda: com 2 painéis ou mais, cada coluna fica com ao menos um', () => {
  assert.equal(splitColumns([]), 0);
  assert.equal(splitColumns([450]), 1);
  assert.equal(splitColumns([450, 100]), 1);
  assert.equal(splitColumns([100, 100, 100, 900]), 3);
});

// Desktop da aba Jogar: a lista vem na ordem do celular (Vitalidade, Ataques, Atributos, …,
// Progressão); quem pede coluna fica nela e o resto vai, em ordem, para a coluna mais curta.
test('assignColumns: Vitalidade e Atributos à esquerda, Ataques no topo da direita', () => {
  // guerreiro: hp(a) ataques(b) atributos(a) recursos estilos progressão
  const cols = assignColumns([
    { h: 540, col: 'a' }, { h: 800, col: 'b' }, { h: 420, col: 'a' }, { h: 160 }, { h: 130 }, { h: 390 },
  ]);
  assert.deepEqual(cols.slice(0, 3), ['a', 'b', 'a']);
  // a = 992, b = 816 → recursos (160) vai para b; depois a = 992, b = 992 → estilos em a; progressão em b
  assert.deepEqual(cols.slice(3), ['b', 'a', 'b']);
});

test('assignColumns: painel sem altura (escondido) não pesa na conta e listas vazias não quebram', () => {
  assert.deepEqual(assignColumns([]), []);
  assert.deepEqual(assignColumns([{ h: 500, col: 'a' }, { h: 0 }, { h: 100 }]), ['a', 'b', 'b']);
  // sem preferência nenhuma: alterna para manter as colunas parecidas
  assert.deepEqual(assignColumns([{ h: 300 }, { h: 300 }, { h: 100 }, { h: 100 }]), ['a', 'b', 'a', 'b']);
});
