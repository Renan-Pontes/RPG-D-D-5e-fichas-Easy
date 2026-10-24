// Pacotes de equipamento no inventário: reconhecer o pacote, conteúdo por regra
// (SRD 5.1 em 2014, SRD 5.2.1 em 2024) e abrir somando com o que a ficha já tem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PACKS, PACK_GEAR } from '../data/equipment-packs.js';
import { ITEMS_BY_ID } from '../data/items.js';
import { PACK_CONTENTS, applyStartingEquipment } from '../src/creator/equipment-helpers.js';
import { newCharacter } from '../src/creator/creation.js';
import { itemArtFor } from '../src/items/item-art.js';
import { packKeyOf, isPack, packItems, packPreview, openPack, packsForBackend, itemKey, packNameKey } from '../src/items/packs.js';

const char = (rulesVersion, equipment) => ({ rulesVersion, equipment });
const byName = (list, name) => list.find(e => e.name === name);

test('reconhece o pacote pela chave, pelo item do catálogo e pelo nome (pt/en, criação, fichas antigas)', () => {
  assert.equal(packKeyOf({ name: 'qualquer', pack: 'priest' }), 'priest');
  assert.equal(packKeyOf({ sourceId: 'explorersPack', name: 'Mochila do Explorador', type: 'gear' }), 'explorer');
  assert.equal(packKeyOf({ sourceId: 'dungeoneersPack', name: 'Renomeado pelo jogador', type: 'gear' }), 'dungeoneer');
  // Nomes da criação (start-data.js): "Pacote de Aventureiro" é o Explorer's Pack.
  assert.equal(packKeyOf({ name: 'Pacote de Aventureiro', qty: 1 }), 'explorer');
  assert.equal(packKeyOf({ name: 'Pacote de Explorador de Masmorras' }), 'dungeoneer');
  assert.equal(packKeyOf({ name: 'Pacote de Assaltante' }), 'burglar');
  assert.equal(packKeyOf({ name: 'Pacote de Artista' }), 'entertainer');
  // Catálogo (data/items.js) e SRD.PACKS (srd.js).
  assert.equal(packKeyOf({ name: 'Mochila de Aventureiro' }), 'dungeoneer');
  assert.equal(packKeyOf({ name: 'Kit de Explorador' }), 'explorer');
  assert.equal(packKeyOf({ name: 'Kit de Masmorra' }), 'dungeoneer');
  assert.equal(packKeyOf({ name: 'Kit de Animador' }), 'entertainer');
  // Digitados à mão: caixa, acento, apóstrofo, preço e quantidade no nome.
  assert.equal(packKeyOf({ name: "Explorer's Pack" }), 'explorer');
  assert.equal(packKeyOf({ name: 'explorers pack (10 gp)' }), 'explorer');
  assert.equal(packKeyOf({ name: 'PACOTE DO ESTUDIOSO' }), 'scholar');
  assert.equal(packKeyOf({ name: 'Pacote de Sacerdote ×2' }), 'priest');
  assert.equal(packKeyOf({ name: 'Pacote de Diplomata', type: 'gear' }), 'diplomat');
  assert.equal(packKeyOf({ name: { pt: 'Pacote de Erudito', en: "Scholar's Pack" } }), 'scholar');
});

test('não confunde pacote com outros itens', () => {
  for (const name of ['Mochila', 'Kit de Curandeiro', 'Kit de Disfarce', 'Ferramentas de Ladrão', 'Pacote', 'Box 12', '']) {
    assert.equal(isPack({ name }), false, name);
  }
  assert.equal(isPack({ name: 'Mochila Útil', sourceId: 'handyHaversack', type: 'magic' }), false);
  assert.equal(isPack({ name: 'Pacote de Aventureiro', type: 'weapon' }), false);
  assert.equal(isPack(null), false);
  assert.equal(packNameKey('Box 12'), 'box 12');
  assert.equal(itemKey("  Pé-de-Cabra  "), 'pe de cabra');
});

test('todo item de pacote existe: id do catálogo válido, nome pt/en e, no catálogo, arte', () => {
  for (const [gk, g] of Object.entries(PACK_GEAR)) {
    if (g.id) {
      assert.ok(ITEMS_BY_ID[g.id], `${gk}: ${g.id} não está em data/items.js`);
      assert.ok(itemArtFor({ sourceId: g.id }), `${gk}: sem arte`);
    } else {
      assert.ok(g.name?.pt && g.name?.en, `${gk}: sem nome`);
    }
    if (g.artId) assert.ok(itemArtFor({ artId: g.artId }), `${gk}: artId ${g.artId} sem arte`);
  }
  for (const [key, p] of Object.entries(PACKS)) {
    for (const rules of ['2014', '2024']) {
      for (const [gk] of p.contents[rules]) assert.ok(PACK_GEAR[gk], `${key} ${rules}: ${gk}`);
    }
    if (p.catalogId) assert.ok(ITEMS_BY_ID[p.catalogId], key);
  }
});

// Mesma lista do texto da criação (PACK_CONTENTS, escrito à parte): mesmo número
// de itens e mesma quantidade em cada posição ("10 torches" → 10; "50 feet of rope" → 1).
test('conteúdo bate com o texto dos pacotes da criação, nas duas regras', () => {
  const split = (s) => {
    const parts = s.split(', ');
    const last = parts.pop();
    const at = last.lastIndexOf(' and ');
    return [...parts, last.slice(0, at), last.slice(at + 5)];
  };
  const qtyIn = (s) => { const m = /^(\d+)\s+(?!feet)/.exec(s); return m ? +m[1] : 1; };
  for (const rules of ['2014', '2024']) {
    for (const key of Object.keys(PACKS)) {
      const text = split(PACK_CONTENTS[rules][key].en);
      const items = packItems(key, rules);
      assert.equal(items.length, text.length, `${rules} ${key}: ${text.join(' | ')}`);
      items.forEach((it, i) => assert.equal(it.qty, qtyIn(text[i]), `${rules} ${key}: ${text[i]} × ${it.gear}`));
    }
  }
});

test('2014 (SRD 5.1) e 2024 (SRD 5.2.1) têm conteúdos diferentes', () => {
  const gears = (key, rules) => packItems(key, rules).map(c => c.gear);
  assert.ok(gears('explorer', '2014').includes('messKit'));
  assert.ok(!gears('explorer', '2024').includes('messKit'));
  assert.deepEqual(packItems('explorer', '2024').find(c => c.gear === 'oil').qty, 2);
  assert.ok(gears('dungeoneer', '2014').includes('hammer'));
  assert.ok(gears('dungeoneer', '2024').includes('caltrops') && !gears('dungeoneer', '2024').includes('hammer'));
  assert.ok(gears('priest', '2024').includes('holyWater') && !gears('priest', '2014').includes('holyWater'));
  assert.equal(packItems('burglar', '2024').find(c => c.gear === 'candle').qty, 10);
  assert.equal(packItems('burglar', '2014').find(c => c.gear === 'candle').qty, 5);
  // A corda de 50 pés pesa 10 lb em 2014 (cânhamo) e 5 lb em 2024.
  assert.equal(packItems('explorer', '2014').find(c => c.gear === 'rope').weight, 10);
  assert.equal(packItems('explorer', '2024').find(c => c.gear === 'rope').weight, 5);
});

test('abrir (2024): o pacote vira os itens no mesmo lugar, com nome traduzido, peso, sourceId e arte', () => {
  const pack = { name: 'Pacote de Aventureiro', qty: 1, from: 'classPack', pack: 'explorer' };
  const c = char('2024', [{ name: 'Flechas', qty: 20 }, pack, { name: 'Aljava', qty: 1 }]);
  const { equipment } = openPack(c, pack, 'pt');
  assert.equal(equipment[0].name, 'Flechas');
  assert.equal(equipment.at(-1).name, 'Aljava');
  assert.ok(!equipment.some(isPack));
  const mid = equipment.slice(1, -1);
  assert.deepEqual(mid.map(e => [e.name, e.qty]), [
    ['Mochila', 1], ['Saco de Dormir', 1], ['Frasco de Óleo', 2], ['Rações (1 dia)', 10],
    ['Corda 50 pés', 1], ['Isqueiro', 1], ['Tocha', 10], ['Cantil', 1],
  ]);
  const backpack = byName(equipment, 'Mochila');
  assert.equal(backpack.sourceId, 'backpack');
  assert.equal(backpack.weight, 5);
  assert.equal(backpack.type, 'gear');
  assert.equal(backpack.from, 'classPack');
  assert.ok(itemArtFor(backpack));
  assert.equal(new Set(mid.map(e => e.id)).size, mid.length);
  assert.ok(mid.every(e => typeof e.id === 'string' && e.id.startsWith('item-')));
  // Não mexe na ficha original.
  assert.equal(c.equipment.length, 3);
});

test('abrir (2014): conteúdo do SRD 5.1, itens de texto em inglês numa ficha en', () => {
  const pack = { name: "Priest's Pack", qty: 1 };
  const { equipment } = openPack(char('2014', [pack]), pack, 'en');
  assert.deepEqual(equipment.map(e => [e.name, e.qty]), [
    ['Backpack', 1], ['Blanket', 1], ['Candle', 10], ['Tinderbox', 1], ['Alms Box', 1],
    ['Incense (blocks)', 2], ['Censer', 1], ['Vestments', 1], ['Rations (1 day)', 2], ['Waterskin', 1],
  ]);
  const censer = byName(equipment, 'Censer');
  assert.equal(censer.sourceId, undefined);
  assert.equal(censer.type, 'gear');
  assert.ok(itemArtFor(censer), 'arte emprestada pelo artId');
  // 2024 troca velas/incenso por água benta (poção do catálogo, com descrição).
  const p24 = { name: 'Pacote de Sacerdote', qty: 1 };
  const holy = byName(openPack(char('2024', [p24]), p24, 'pt').equipment, 'Água Benta');
  assert.equal(holy.type, 'potion');
  assert.ok(holy.description?.pt);
});

test('soma com itens iguais que a ficha já tem (mesmo sourceId ou mesmo nome, pt ou en)', () => {
  const pack = { name: 'Pacote de Explorador de Masmorras', qty: 1 };
  const c = char('2024', [
    { name: 'Tocha', qty: 2 },
    { id: 'x1', sourceId: 'backpack', name: 'Backpack', qty: 1, type: 'gear' },
    { name: 'Óleo (frascos)', qty: 3 },
    { name: 'Pé de Cabra', qty: 1 },
    { name: 'Waterskin', qty: 0 },
    pack,
  ]);
  const { equipment } = openPack(c, pack, 'pt');
  assert.equal(byName(equipment, 'Tocha').qty, 12);
  assert.equal(byName(equipment, 'Backpack').qty, 2);
  assert.equal(byName(equipment, 'Óleo (frascos)').qty, 5);
  assert.equal(byName(equipment, 'Pé de Cabra').qty, 2);
  assert.equal(byName(equipment, 'Waterskin').qty, 1);
  for (const n of ['Mochila', 'Tocha', 'Cantil', 'Pé-de-cabra', 'Frasco de Óleo']) {
    assert.ok(equipment.filter(e => e.name === n).length <= 1, n);
  }
  assert.equal(byName(equipment, 'Mochila'), undefined, 'mochila somou na Backpack');
  // O que não havia entra novo, no lugar do pacote.
  assert.deepEqual(equipment.slice(5).map(e => e.name), ['Estrepes (bolsa com 20)', 'Rações (1 dia)', 'Corda 50 pés', 'Isqueiro']);
});

test('não soma em arma, item mágico ou outro pacote', () => {
  const pack = { name: 'Pacote de Aventureiro', qty: 1 };
  const c = char('2024', [
    { name: 'Mochila', qty: 1, type: 'magic', magic: { rarity: 'rare' } },
    { name: 'Pacote de Sacerdote', qty: 1 },
    pack,
  ]);
  const { equipment } = openPack(c, pack, 'pt');
  assert.equal(equipment[0].qty, 1);
  assert.equal(equipment[1].qty, 1);
  assert.equal(equipment.filter(e => e.name === 'Mochila').length, 2);
});

test('pacote ×2 fica ×1; notas do pacote vão para a mochila; ×0 (consumido antes) ainda entrega', () => {
  const two = { name: 'Pacote de Erudito', qty: 2, notes: 'do mestre' };
  const r2 = openPack(char('2024', [two, { name: 'Faca', qty: 1 }]), two, 'pt').equipment;
  assert.deepEqual([r2[0].name, r2[0].qty, r2[0].notes], ['Pacote de Erudito', 1, 'do mestre']);
  assert.equal(r2[1].name, 'Mochila');
  assert.equal(r2[1].notes, '');
  assert.equal(r2.at(-1).name, 'Faca');

  const one = { name: 'Pacote de Erudito', qty: 1, notes: 'do mestre' };
  const r1 = openPack(char('2024', [one]), one, 'pt').equipment;
  assert.equal(r1[0].name, 'Mochila');
  assert.equal(r1[0].notes, 'do mestre');
  assert.ok(!r1.some(isPack));

  const withBag = { name: 'Pacote de Erudito', qty: 1, notes: 'do mestre' };
  const rb = openPack(char('2024', [{ name: 'Mochila', qty: 1, notes: 'velha' }, withBag]), withBag, 'pt').equipment;
  assert.deepEqual([rb[0].qty, rb[0].notes], [2, 'velha · do mestre']);

  const zero = { name: 'Pacote de Erudito', qty: 0 };
  const r0 = openPack(char('2024', [zero]), zero, 'pt').equipment;
  assert.ok(!r0.some(isPack));
  assert.equal(r0.length, 8);

  const legacy = { name: "Scholar's Pack" }; // ficha antiga, sem qty
  assert.equal(openPack(char('2024', [legacy]), legacy, 'en').equipment[0].name, 'Backpack');
});

test('não é pacote, ou não está na ficha → null; acha pelo id também', () => {
  const rope = { name: 'Corda', qty: 1 };
  assert.equal(openPack(char('2024', [rope]), rope, 'pt'), null);
  assert.equal(openPack(char('2024', []), { name: 'Pacote de Aventureiro' }, 'pt'), null);
  assert.equal(openPack({}, { name: 'Pacote de Aventureiro' }, 'pt'), null);
  const c = char('2014', [{ id: 'item-p', name: 'Pacote de Aventureiro', qty: 1 }]);
  assert.equal(openPack(c, { id: 'item-p' }, 'pt').equipment.length, 8);
});

test('prévia para a confirmação', () => {
  const p = packPreview(char('2014', []), { name: 'Pacote de Aventureiro' }, 'pt');
  assert.equal(p.key, 'explorer');
  assert.equal(p.rules, '2014');
  assert.ok(p.lines.includes('Kit de Refeição'));
  assert.ok(p.lines.includes('10 × Tocha'));
  assert.equal(packPreview(char('2024', []), { name: 'Corda' }, 'pt'), null);
});

test('ficha da criação (2014, Bárbaro pacote A): o pacote guarda a chave e abre com o conteúdo de 2014', () => {
  const c0 = { ...newCharacter('2014'), className: 'barbarian', background: 'acolyte', creation: { classPack: 'A' } };
  const c = applyStartingEquipment(c0, 'pt');
  const pack = c.equipment.find(isPack);
  assert.equal(pack.pack, 'explorer');
  const { equipment } = openPack(c, pack, 'pt');
  assert.ok(equipment.some(e => e.name === 'Kit de Refeição' && e.from === 'classPack'));
  // Reaplicar a criação troca o conteúdo aberto pelo pacote de novo (sem duplicar).
  const again = applyStartingEquipment({ ...c, equipment }, 'pt');
  assert.equal(again.equipment.filter(isPack).length, 1);
  assert.ok(!again.equipment.some(e => e.name === 'Kit de Refeição'));
});

test('catalog.json do servidor está atualizado (node scripts/sync-rules.mjs)', () => {
  const catalog = JSON.parse(readFileSync(new URL('../../backend/api/progression/catalog.json', import.meta.url), 'utf8'));
  assert.deepEqual(catalog.packs, JSON.parse(JSON.stringify(packsForBackend())));
  const b = packsForBackend();
  assert.equal(b.names['pacote de aventureiro'], 'explorer');
  assert.equal(b.names['mochila de aventureiro'], 'dungeoneer');
  assert.deepEqual(b.contents['2024'].explorer[2], ['oil', 2]);
  assert.deepEqual(b.gear.rope.weight, { 2014: 10, 2024: 5 });
});
