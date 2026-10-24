import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitColumns } from '../src/sheet/play-layout.js';

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
