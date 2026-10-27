import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';
import { buildSheetData } from '../src/pdf/sheet-data.js';

// Deslocamento da ficha (Utils.speed): Movimento sem Armadura do Monge e Movimento
// Rápido do Bárbaro, nas duas regras, pelo nível na classe.
const RULES = ['2014', '2024'];
const ABIL = { str: 15, dex: 16, con: 14, int: 10, wis: 14, cha: 8 };
const make = (rulesVersion, extra = {}) => ({
  ...Utils.makeNew(), rulesVersion, race: 'human', abilities: { ...ABIL }, ...extra,
});
const monk = (rv, level, extra) => make(rv, { className: 'monk', level, ...extra });
const barbarian = (rv, level, extra) => make(rv, { className: 'barbarian', level, ...extra });
// Monge 2 / Bárbaro 5: começa no Monge e põe os 5 níveis de Bárbaro depois.
const monk2barb5 = (rv, extra) => make(rv, {
  className: 'monk', level: 7, multiclass: [{ id: 'barbarian' }],
  classSequence: ['monk', 'monk', 'barbarian', 'barbarian', 'barbarian', 'barbarian', 'barbarian'], ...extra,
});

for (const rv of RULES) {
  test(`Monge ${rv}: nível 1 anda 30; do 2 em diante soma o Movimento sem Armadura`, () => {
    assert.equal(Utils.speed(monk(rv, 1)), 30);
    assert.deepEqual(Utils.speedBonuses(monk(rv, 1)), []);
    assert.equal(Utils.speed(monk(rv, 2)), 40);
    assert.equal(Utils.speed(monk(rv, 5)), 40);
    assert.equal(Utils.speed(monk(rv, 6)), 45, 'humano 30 + 15');
    assert.equal(Utils.speed(monk(rv, 9)), 45);
    assert.equal(Utils.speed(monk(rv, 10)), 50);
    assert.equal(Utils.speed(monk(rv, 14)), 55);
    assert.equal(Utils.speed(monk(rv, 18)), 60);
    assert.equal(Utils.speed(monk(rv, 20)), 60);
  });

  test(`Monge ${rv}: armadura ou escudo tiram o Movimento sem Armadura`, () => {
    for (const lv of [2, 6, 18]) {
      assert.equal(Utils.speed(monk(rv, lv, { armor: 'leather' })), 30, `nível ${lv} com armadura`);
      assert.equal(Utils.speed(monk(rv, lv, { hasShield: true })), 30, `nível ${lv} com escudo`);
      assert.equal(Utils.speed(monk(rv, lv, { armor: 'breastplate', hasShield: true })), 30, `nível ${lv} com os dois`);
    }
    // Armadura fora do catálogo (personalizada) também conta como armadura.
    assert.equal(Utils.speed(monk(rv, 6, { armor: 'armadura-da-avó' })), 30);
  });

  test(`Bárbaro ${rv}: Movimento Rápido no nível 5, menos com armadura pesada`, () => {
    assert.equal(Utils.speed(barbarian(rv, 4)), 30);
    assert.equal(Utils.speed(barbarian(rv, 4, { armor: 'breastplate' })), 30, 'nível 4 com armadura média');
    assert.equal(Utils.speed(barbarian(rv, 5)), 40);
    assert.equal(Utils.speed(barbarian(rv, 5, { armor: 'breastplate' })), 40, 'armadura média não tira');
    assert.equal(Utils.speed(barbarian(rv, 5, { armor: 'hide', hasShield: true })), 40, 'escudo não tira');
    assert.equal(Utils.speed(barbarian(rv, 5, { armor: 'chainMail' })), 30, 'armadura pesada tira (FOR 15 ≥ 13)');
    assert.equal(Utils.speed(barbarian(rv, 4, { armor: 'chainMail' })), 30);
    // Pesada sem a Força mínima: sem o bônus e −10 pés, como antes.
    assert.equal(Utils.speed(barbarian(rv, 5, { armor: 'plate', abilities: { ...ABIL, str: 13 } })), 20);
    assert.equal(Utils.speed(barbarian(rv, 20)), 40, 'o bônus não cresce');
  });

  test(`Multiclasse ${rv}: Monge 2 / Bárbaro 5 soma os dois pelo nível de cada classe`, () => {
    const c = monk2barb5(rv);
    assert.equal(Utils.classLevel(c, 'monk'), 2);
    assert.equal(Utils.classLevel(c, 'barbarian'), 5);
    assert.equal(Utils.speed(c), 50, '30 + 10 (Monge 2) + 10 (Bárbaro 5)');
    assert.deepEqual(Utils.speedBonuses(c).map(b => [b.id, b.value]), [['unarmoredMovement', 10], ['fastMovement', 10]]);
    assert.equal(Utils.speed(monk2barb5(rv, { armor: 'breastplate' })), 40, 'armadura média: só o do Bárbaro');
    assert.equal(Utils.speed(monk2barb5(rv, { hasShield: true })), 40, 'escudo: só o do Bárbaro');
    assert.equal(Utils.speed(monk2barb5(rv, { armor: 'chainMail' })), 30, 'pesada: nenhum');
    // O nível total (7) não vale como nível de Monge: no 6 seria +15.
    assert.equal(Utils.speedBonuses(c)[0].value, 10);
    // Bárbaro 4 / Monge 6: o Bárbaro ainda não tem o Movimento Rápido.
    const b4m6 = make(rv, { className: 'barbarian', level: 10, multiclass: [{ id: 'monk' }],
      classSequence: [...Array(4).fill('barbarian'), ...Array(6).fill('monk')] });
    assert.equal(Utils.speed(b4m6), 45);
  });

  test(`Deslocamento fixo ${rv} (speedOverride) vale sozinho`, () => {
    assert.equal(Utils.speed(monk(rv, 6, { speedOverride: 25 })), 25);
    assert.deepEqual(Utils.speedBonuses(monk(rv, 6, { speedOverride: 25 })), []);
    assert.equal(Utils.speed(monk2barb5(rv, { speedOverride: 35 })), 35);
    assert.equal(Utils.speed(barbarian(rv, 5, { speedOverride: 0 })), 40, '0 = automático');
  });

  test(`Sem dobrar ${rv}: classe repetida na multiclasse conta uma vez; as outras classes não mudam`, () => {
    // Ficha antiga com o Monge também na lista de multiclasse: conta uma vez.
    assert.equal(Utils.speed(monk(rv, 6, { multiclass: [{ id: 'monk' }] })), 45);
    // Classes sem bônus continuam iguais.
    for (const className of ['fighter', 'rogue', 'cleric', 'paladin', 'wizard', 'ranger']) {
      assert.equal(Utils.speed(make(rv, { className, level: 10 })), 30, className);
    }
  });
}

test('números para o servidor: CA e deslocamento automático, sem o fixo do mestre', () => {
  // O fixo do mestre fica em speedOverride (o servidor confere antes); data.speed é o automático,
  // para a Tela e o combate voltarem ao número certo quando o mestre põe o fixo em 0.
  const dagna = make('2024', { race: 'dwarf', className: 'fighter', level: 3, armor: 'chainMail', speedOverride: 35 });
  assert.equal(Utils.speed(dagna), 35, 'a ficha mostra o fixo');
  assert.deepEqual(Utils.serverNumbers(dagna), { armorClass: Utils.computeAc(dagna), speed: 30 });
  assert.equal(Utils.serverNumbers(monk('2024', 6, { speedOverride: 35 })).speed, 45);
  assert.equal(Utils.serverNumbers(monk('2014', 6, { hasShield: true })).speed, 30);
  assert.equal(Utils.serverNumbers(monk('2014', 6, { hasShield: true })).armorClass, Utils.computeAc(monk('2014', 6, { hasShield: true })));
  // Monge que o mestre sobe de nível pelo Editar ficha: o número acompanha.
  assert.equal(Utils.serverNumbers(monk('2014', 5)).speed, 40);
  assert.equal(Utils.serverNumbers(monk('2014', 6)).speed, 45);
  // Sem classe: nada (o servidor fica com o que tinha).
  assert.deepEqual(Utils.serverNumbers({ ...Utils.makeNew(), className: '' }), {});
});

test('espécie entra como base: Elfo da Floresta 2014 Monge 6 anda 50; anão 2014 Bárbaro 5 anda 35', () => {
  assert.equal(Utils.speed(make('2014', { race: 'elf-wood', className: 'monk', level: 6 })), 50);
  assert.equal(Utils.speed(make('2014', { race: 'dwarf-hill', className: 'barbarian', level: 5 })), 35);
  // Anão 2014 de cota de malha: a armadura pesada não tira os 25, mas também não há Movimento Rápido.
  assert.equal(Utils.speed(make('2014', { race: 'dwarf-hill', className: 'barbarian', level: 5, armor: 'chainMail', abilities: { ...ABIL, str: 10 } })), 25);
  assert.equal(Utils.speed(make('2024', { race: 'goliath', className: 'barbarian', level: 5 })), 45);
});

test('texto do bônus no medalhão: pt em metros, en em pés', () => {
  assert.equal(Utils.speedBonusText(Utils.speedBonuses(monk('2024', 6)), 'pt'), '+4,5 m Monge');
  assert.equal(Utils.speedBonusText(Utils.speedBonuses(monk('2024', 6)), 'en'), '+15 ft Monk');
  assert.equal(Utils.speedBonusText(Utils.speedBonuses(monk2barb5('2014')), 'pt'), '+3 m Monge, +3 m Bárbaro');
  assert.equal(Utils.speedBonusText(Utils.speedBonuses(monk2barb5('2014')), 'en'), '+10 ft Monk, +10 ft Barbarian');
  assert.equal(Utils.speedBonusText([], 'pt'), '');
});

test('PDF: Monge 6 humano sai com 45 ft (13,5 m)', () => {
  for (const rv of RULES) {
    const c = monk(rv, 6, { name: 'Irmã Ventania' });
    assert.equal(buildSheetData(c, 'en').fields.Speed, '45 ft');
    assert.equal(buildSheetData(c, 'pt').fields.Speed, '13,5 m');
    assert.equal(buildSheetData({ ...c, armor: 'leather' }, 'en').fields.Speed, '30 ft');
  }
});
