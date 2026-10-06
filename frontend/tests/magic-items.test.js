// Catálogo de itens mágicos do SRD 5.2.1 (data/magic-items-srd.js) e a mescla em data/items.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAGIC_ITEMS_SRD } from '../data/magic-items-srd.js';
import { ITEMS, ITEMS_BY_ID, ITEM_TYPES, instantiate } from '../data/items.js';

const RARITIES = new Set(['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact']);
const CATEGORIES = new Set(['armor', 'potion', 'ring', 'rod', 'scroll', 'staff', 'wand', 'weapon', 'wondrous']);

test('catálogo tem todos os itens mágicos do SRD (com variantes)', () => {
  assert.ok(MAGIC_ITEMS_SRD.length >= 200, `só ${MAGIC_ITEMS_SRD.length} itens`);
  const cats = new Set(MAGIC_ITEMS_SRD.map(m => m.magic.category));
  for (const c of CATEGORIES) assert.ok(cats.has(c), `nenhum item na categoria ${c}`);
});

test('sourceIds únicos, no catálogo e na lista mesclada', () => {
  const ids = MAGIC_ITEMS_SRD.map(m => m.sourceId);
  assert.equal(new Set(ids).size, ids.length, 'sourceId duplicado em magic-items-srd.js');
  assert.equal(new Set(ITEMS.map(i => i.sourceId)).size, ITEMS.length, 'sourceId duplicado em ITEMS');
  for (const id of ids) assert.ok(ITEMS_BY_ID[id], `${id} não entrou em ITEMS_BY_ID`);
});

test('todo item tem nome pt/en, raridade, categoria, tipo e descrição nas duas línguas', () => {
  for (const m of MAGIC_ITEMS_SRD) {
    const id = m.sourceId;
    assert.ok(m.name?.pt?.trim() && m.name?.en?.trim(), `${id}: nome`);
    assert.ok(RARITIES.has(m.magic.rarity), `${id}: raridade ${m.magic.rarity}`);
    assert.ok(CATEGORIES.has(m.magic.category), `${id}: categoria ${m.magic.category}`);
    assert.ok(ITEM_TYPES.includes(m.type), `${id}: tipo ${m.type}`);
    assert.ok(m.description?.pt?.trim().length > 20, `${id}: descrição pt`);
    assert.ok(m.description?.en?.trim().length > 20, `${id}: descrição en`);
    assert.ok(m.magic.effect?.pt?.trim() && m.magic.effect?.en?.trim(), `${id}: efeito resumido`);
    const a = m.magic.attunement;
    assert.ok(a === true || a === false || (a.by?.pt && a.by?.en), `${id}: sintonização`);
  }
});

test('descrições em português sem sobras do inglês nem unidades imperiais', () => {
  const leftovers = [/ feet\b/, / foot\b/, / the /i, / pounds?\b/, /\bsaving throw\b/i, /\bHit Points\b/, /\bBonus Action\b/, /\bAttunement\b/];
  for (const m of MAGIC_ITEMS_SRD) {
    for (const re of leftovers) assert.ok(!re.test(m.description.pt), `${m.sourceId}: "${m.description.pt.match(re)?.[0]}" no texto pt`);
    assert.ok(!/\*\*/.test(m.description.pt + m.description.en), `${m.sourceId}: marcação ** sobrando`);
  }
  // Conferência por amostragem da terminologia.
  assert.match(ITEMS_BY_ID.bagHolding.description.pt, /250 kg/);
  assert.match(ITEMS_BY_ID.cloakProtection.description.pt, /Classe de Armadura|CA/);
});

test('instantiate() funciona em todo item mágico', () => {
  for (const m of MAGIC_ITEMS_SRD) {
    const src = ITEMS_BY_ID[m.sourceId];
    const inst = instantiate(src);
    assert.equal(inst.sourceId, m.sourceId);
    assert.equal(typeof inst.name, 'string');
    assert.ok(inst.name.length > 0);
    assert.equal(inst.attunement, !!m.magic.attunement, `${m.sourceId}: attunement`);
    assert.ok(inst.magic && inst.description, `${m.sourceId}: stats inline`);
    assert.match(inst.id, /^item-/);
  }
});

test('armas, armaduras, escudos e munição +N carregam o bônus certo', () => {
  for (const n of [1, 2, 3]) {
    assert.equal(ITEMS_BY_ID[`weapon+${n}`].magic.bonus, n);
    assert.equal(ITEMS_BY_ID[`ammo+${n}`].magic.bonus, n);
    assert.equal(ITEMS_BY_ID[`armor+${n}`].magic.acBonus, n);
    assert.equal(ITEMS_BY_ID[`shield+${n}`].magic.acBonus, n);
    assert.equal(ITEMS_BY_ID[`wandWarMage+${n}`].magic.spellAttackBonus, n);
    assert.equal(instantiate(ITEMS_BY_ID[`weapon+${n}`]).magic.bonus, n);
  }
  assert.equal(ITEMS_BY_ID['weapon+1'].magic.rarity, 'uncommon');
  assert.equal(ITEMS_BY_ID['weapon+3'].magic.rarity, 'very rare');
  assert.equal(ITEMS_BY_ID['armor+3'].magic.rarity, 'legendary');
  assert.equal(ITEMS_BY_ID.ringProt.magic.acBonus, 1);
  assert.equal(ITEMS_BY_ID.ringProt.magic.saveBonus, 1);
  assert.equal(ITEMS_BY_ID.cloakProtection.magic.acBonus, 1);
  assert.equal(ITEMS_BY_ID.amuletProt.magic.setScore.con, 19);
});

test('poções de cura por nível e cargas das varinhas', () => {
  assert.equal(ITEMS_BY_ID.potionHealing.magic.heal, '2d4+2');
  assert.equal(ITEMS_BY_ID.potionHealingGreater.magic.heal, '4d4+4');
  assert.equal(ITEMS_BY_ID.potionHealingSuperior.magic.heal, '8d4+8');
  assert.equal(ITEMS_BY_ID.potionHealingSupreme.magic.heal, '10d4+20');
  for (const id of ['potionHealing', 'potionHealingGreater', 'potionHealingSuperior', 'potionHealingSupreme']) {
    assert.equal(ITEMS_BY_ID[id].type, 'potion');
  }
  assert.equal(ITEMS_BY_ID.wandMagicMissiles.magic.charges, 7);
  assert.equal(ITEMS_BY_ID.wandWeb.magic.charges, 7);
  for (let lvl = 0; lvl <= 9; lvl++) assert.ok(ITEMS_BY_ID[`spellScroll${lvl}`], `pergaminho de ${lvl}º círculo`);
});

test('itens que já existiam mantêm id e tipo e ganham o texto do SRD', () => {
  assert.equal(ITEMS_BY_ID.bagHolding.type, 'magic');
  assert.equal(ITEMS_BY_ID.bagHolding.name.pt, 'Bolsa Devoradora');
  assert.equal(ITEMS_BY_ID.amuletProt.name.en, 'Amulet of Health');
  assert.equal(ITEMS_BY_ID.potionClimbing.type, 'potion');
  assert.ok(ITEMS_BY_ID.potionWaterBreath.description.pt.length > 50);
  assert.ok(ITEMS_BY_ID.scrollFireball.magic.effect.pt);
  // Itens com arma/armadura base fixa herdam os números de items.js.
  assert.equal(ITEMS_BY_ID.daggerVenom.weapon.damage, '1d4');
  assert.equal(ITEMS_BY_ID.daggerVenom.type, 'weapon');
  assert.equal(ITEMS_BY_ID.sunBlade.weapon.dmgType, 'slashing');
  assert.equal(ITEMS_BY_ID.armorInvulnerability.armor.ac, 18);
  assert.equal(ITEMS_BY_ID.animatedShield.type, 'shield');
  assert.equal(ITEMS_BY_ID.animatedShield.armor.ac, 2);
});
