/* Itens EQUIPADOS do inventário valem na ficha (utils.js: wornArmor, wornShield, acBreakdown,
 * sheetWeapons, attackFor com fromItem). Numa campanha a ficha do jogador está travada e
 * equipar o item que o mestre entregou é o único caminho dele para a CA e os ataques.
 * A armadura / o escudo escolhidos na ficha (char.armor / char.hasShield) continuam valendo
 * primeiro, e nenhuma ficha sem item equipado muda de número. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';

const base = (extra = {}) => ({
  rulesVersion: '2024', className: 'fighter', level: 1, race: 'human',
  abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 10 },
  armor: null, hasShield: false, weapons: [], equipment: [], ...extra,
});
const leather = (extra = {}) => ({ id: 'i1', sourceId: 'leather', name: 'Couro', type: 'armor', armor: { ac: 11, type: 'light' }, equipped: true, ...extra });
const shield = (extra = {}) => ({ id: 'i2', sourceId: 'shield', name: 'Escudo', type: 'shield', armor: { ac: 2, type: 'shield' }, equipped: true, ...extra });
const ring = (extra = {}) => ({ id: 'i3', sourceId: 'ringProt', name: 'Anel de Proteção', type: 'magic', attunement: true, attuned: true, equipped: true, magic: { category: 'ring', acBonus: 1, saveBonus: 1, attunement: true }, ...extra });
const sum = (b) => b.parts.reduce((n, p) => n + p.value, 0);

test('sem item equipado a CA é a de sempre (ficha sem armadura, com armadura e com escudo)', () => {
  assert.equal(Utils.computeAc(base()), 12);                                   // 10 + DES 2
  assert.equal(Utils.computeAc(base({ armor: 'chainMail' })), 16);             // pesada: sem DES
  assert.equal(Utils.computeAc(base({ armor: 'leather', hasShield: true })), 15);
  // item no inventário mas NÃO equipado não conta
  assert.equal(Utils.computeAc(base({ equipment: [leather({ equipped: false }), shield({ equipped: false })] })), 12);
});

test('armadura e escudo equipados entram na CA; a soma das parcelas fecha com o total', () => {
  const c = base({ equipment: [leather(), shield()] });
  const b = Utils.acBreakdown(c);
  assert.equal(b.total, 15);                                                   // 11 + DES 2 + 2
  assert.equal(sum(b), b.total);
  assert.equal(b.armor.item.name, 'Couro');
  assert.equal(b.shield.item.name, 'Escudo');
  assert.equal(Utils.computeAc(c), 15);
  // armadura média limita a DES a 2; pesada ignora a DES
  const dex18 = { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 };
  assert.equal(Utils.computeAc(base({ abilities: dex18, equipment: [leather({ sourceId: 'hide', name: 'Gibão', armor: { ac: 12, type: 'medium' } })] })), 14);
  assert.equal(Utils.computeAc(base({ abilities: dex18, equipment: [leather({ sourceId: 'chainMail', name: 'Cota', armor: { ac: 16, type: 'heavy' } })] })), 16);
});

test('a escolha da ficha vale primeiro: item de armadura equipado não soma por cima', () => {
  const c = base({ armor: 'chainMail', hasShield: true, equipment: [leather(), shield()] });
  assert.equal(Utils.computeAc(c), 18);                                        // 16 + 2, sem o Couro nem um 2º escudo
  assert.equal(Utils.wornArmor(c).item, null);
  assert.equal(Utils.wornShield(c).item, null);
});

test('item quebrado não conta; bônus mágico só com a sintonia feita', () => {
  assert.equal(Utils.computeAc(base({ equipment: [leather({ broken: true })] })), 12);
  const scale = (extra) => leather({ sourceId: 'dragonScaleMail', base: 'scaleMail', name: 'Cota de Escamas de Dragão', armor: { ac: 14, type: 'medium', stealth: 'disadv' }, attunement: true, magic: { category: 'armor', acBonus: 1 }, ...extra });
  assert.equal(Utils.computeAc(base({ equipment: [scale({ attuned: false })] })), 16);   // 14 + DES 2
  assert.equal(Utils.computeAc(base({ equipment: [scale({ attuned: true })] })), 17);    // + 1 mágico
  assert.equal(Utils.wornArmor(base({ equipment: [scale({ attuned: true })] })).stealth, 'disadv');
});

test('Anel de Proteção: +1 só equipado e em sintonia; Braçadeiras só sem armadura e sem escudo', () => {
  assert.equal(Utils.computeAc(base({ equipment: [ring()] })), 13);
  assert.equal(Utils.computeAc(base({ equipment: [ring({ attuned: false })] })), 12);
  assert.equal(Utils.computeAc(base({ equipment: [ring({ equipped: false })] })), 12);
  const b = Utils.acBreakdown(base({ armor: 'leather', equipment: [ring()] }));
  assert.equal(b.total, 14);
  assert.equal(sum(b), 14);
  const bracers = ring({ id: 'i4', sourceId: 'bracersDefense', name: 'Braçadeiras de Defesa', magic: { category: 'wondrous', acBonus: 2, attunement: true } });
  assert.equal(Utils.computeAc(base({ equipment: [bracers] })), 14);
  assert.equal(Utils.computeAc(base({ armor: 'leather', equipment: [bracers] })), 13);   // com armadura: não vale
  assert.equal(Utils.computeAc(base({ equipment: [bracers, shield()] })), 14);           // com escudo: só o escudo
});

test('Estilo de Luta Defesa conta com a armadura do item; Monge perde as Artes Marciais de armadura', () => {
  const styled = base({ classOptions: [{ classId: 'fighter', pool: 'fightingStyle', id: 'defense' }], fightingStyle: 'defense' });
  const plain = Utils.computeAc({ ...styled, armor: 'leather' });
  assert.equal(Utils.computeAc({ ...styled, equipment: [leather()] }), plain);  // mesma CA pelos dois caminhos
  const monk = base({ className: 'monk', abilities: { str: 10, dex: 16, con: 10, int: 10, wis: 16, cha: 10 } });
  assert.equal(Utils.computeAc(monk), 16);                                     // 10 + DES 3 + SAB 3
  assert.equal(Utils.computeAc({ ...monk, equipment: [leather()] }), 14);      // 11 + DES 3: Defesa sem Armadura não vale
  assert.equal(Utils.computeAc({ ...monk, equipment: [shield()] }), 15);       // 10 + DES 3 + 2: sem a SAB (escudo)
});

test('arma equipada vira ataque: mesmos números da arma do catálogo, +bônus mágico, sem duplicar', () => {
  const scimitar = { id: 'w1', sourceId: 'scimitar', name: 'Cimitarra', type: 'weapon', weapon: { damage: '1d6', dmgType: 'slashing', props: ['finesse', 'light'] }, equipped: true };
  const c = base({ equipment: [scimitar] });
  const ws = Utils.sheetWeapons(c);
  assert.equal(ws.length, 1);
  assert.equal(ws[0].fromItem, true);
  assert.equal(ws[0].id, 'scimitar');
  const own = Utils.attackFor(c, { id: 'scimitar', name: 'Cimitarra', damage: '1d6', dmgType: 'slashing', props: ['finesse', 'light'] });
  const fromItem = Utils.attackFor(c, ws[0]);
  assert.equal(fromItem.bonus, own.bonus);
  assert.equal(fromItem.damage, own.damage);
  // já está em char.weapons: o item igual não entra de novo
  assert.equal(Utils.sheetWeapons({ ...c, weapons: [{ id: 'scimitar', name: 'Cimitarra', damage: '1d6' }] }).length, 1);
  // guardada ou quebrada: fora
  assert.equal(Utils.sheetWeapons(base({ equipment: [{ ...scimitar, equipped: false }] })).length, 0);
  assert.equal(Utils.sheetWeapons(base({ equipment: [{ ...scimitar, broken: true }] })).length, 0);
  // +1 mágico soma no ataque e no dano
  const magic = Utils.attackFor(c, Utils.sheetWeapons(base({ equipment: [{ ...scimitar, magic: { category: 'weapon', bonus: 1 } }] }))[0]);
  assert.equal(magic.bonus, own.bonus + 1);
  assert.equal(magic.dmgMod, own.dmgMod + 1);
});

test('arma do mestre fora do catálogo: atributo + proficiência, marcada como suposição', () => {
  const blade = { id: 'w2', sourceId: 'campaign-9', name: 'Lâmina do Rei', type: 'weapon', weapon: { damage: '1d8', dmgType: 'slashing', props: ['versatile'] }, equipped: true };
  const c = base({ equipment: [blade] });
  const a = Utils.attackFor(c, Utils.sheetWeapons(c)[0]);
  assert.equal(a.assumed, true);
  assert.equal(a.bonus, 3 + Utils.profBonus(c));                               // FOR +3 + proficiência
  assert.equal(a.damage, '1d8+3');
  // arma anotada à mão na ficha (sem id e sem fromItem) continua como antes: vale o bônus anotado
  const manual = Utils.attackFor(c, { name: 'Clava velha', damage: '1d4', bonus: 2 });
  assert.equal(manual.bonus, 2);
  assert.equal(manual.dmgMod, 0);
});
